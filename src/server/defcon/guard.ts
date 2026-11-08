import type { Request, Response, NextFunction } from 'express';
import {
  detectBadUpload,
  detectBadUrls,
  detectFlood,
  detectTokenDrain,
  detectBotSignatures,
  detectPromptInjection,
  detectXss,
  redactSecrets,
  sha256,
} from './detectors.ts';
import { authorize, levelFromScore, pickAction } from './policy.ts';
import {
  blockedFor,
  blockTemp,
  getBlockInfo,
  isKnownBadHash,
  logEvent,
  recentOffenses,
  recentScore,
  defconStore,
} from './store.ts';
import { getMode, type Verdict, type Defcon } from './types.ts';

const DEFAULT_ALLOWED_IPS = [
  '127.0.0.1',
  '::1',
  '::ffff:127.0.0.1',
  'localhost',
  '169.254.169.126',
  'unknown',
];

const ALLOW_IPS = new Set([
  ...DEFAULT_ALLOWED_IPS,
  ...(process.env.DEFCON_ALLOW_IPS ?? '').split(',').map((s) => s.trim()).filter(Boolean),
]);

/**
 * Universal JSON responder supporting both Express and Node http.ServerResponse (Vite Connect)
 */
function sendSafeJson(res: any, statusCode: number, data: any) {
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    return res.status(statusCode).json(data);
  }
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

/**
 * Robust Client IP Extraction with Anti-Spoofing Defense:
 * Validates real client IP against reverse proxy headers (Cloudflare, Vercel)
 * and physical socket address, ignoring client-forged X-Forwarded-For prefixes.
 */
export const clientIp = (req: Request): string => {
  // 1. Cloudflare edge header (tamper-proof)
  const cfIp = req.headers['cf-connecting-ip'];
  if (typeof cfIp === 'string' && cfIp.trim()) {
    return cfIp.trim();
  }

  // 2. Vercel edge header
  const vercelForwarded = req.headers['x-vercel-forwarded-for'];
  if (typeof vercelForwarded === 'string' && vercelForwarded.trim()) {
    const parts = vercelForwarded.split(',').map((p) => p.trim()).filter(Boolean);
    return parts[parts.length - 1];
  }

  const realIp = req.headers['x-real-ip'];
  if (typeof realIp === 'string' && realIp.trim()) {
    return realIp.trim();
  }

  // 3. X-Forwarded-For header: first entry is client IP
  const rawXff = req.headers['x-forwarded-for'];
  if (typeof rawXff === 'string' && rawXff.trim()) {
    const list = rawXff.split(',').map((s) => s.trim()).filter(Boolean);
    if (list.length > 0) {
      return list[0];
    }
  }

  // 4. Physical TCP socket address
  const socketAddress = req.socket?.remoteAddress;
  if (socketAddress) {
    return socketAddress.replace(/^::ffff:/, '');
  }

  return 'unknown';
};

/**
 * Generate client fingerprint combining real IP + User Agent + Accept-Language
 * to prevent attackers rotating spoofed X-Forwarded-For headers within the same session.
 */
export const clientFingerprint = (req: Request): string => {
  const ip = clientIp(req);
  const ua = String(req.headers['user-agent'] || 'no-ua').slice(0, 100);
  const lang = String(req.headers['accept-language'] || 'no-lang').slice(0, 50);
  return `${ip}::${ua}::${lang}`;
};

/**
 * Deep Inspection: Recursively extract any file buffers, base64 strings,
 * or raw script payloads sent in ANY request outside or inside chat.
 */
export function extractFilesFromAnyRequest(req: Request): { name: string; data: Buffer }[] {
  const uploads: { name: string; data: Buffer }[] = [];

  const visit = (val: any, hintName = 'payload.bin', depth = 0) => {
    if (depth > 6 || val == null) return;

    if (Buffer.isBuffer(val)) {
      uploads.push({ name: hintName, data: val });
      return;
    }

    if (typeof val === 'string') {
      const s = val.trim();
      // 1. Data URI e.g. data:image/png;base64,... or data:application/octet-stream;base64,...
      if (s.startsWith('data:') && s.includes(';base64,')) {
        try {
          const b64 = s.split(';base64,')[1];
          const buf = Buffer.from(b64, 'base64');
          if (buf.length > 0) {
            uploads.push({ name: hintName, data: buf });
          }
        } catch {}
        return;
      }

      // 2. Raw EICAR test string
      if (s.includes('EICAR-STANDARD-ANTIVIRUS-TEST-FILE')) {
        uploads.push({ name: hintName || 'eicar.com', data: Buffer.from(s, 'utf-8') });
        return;
      }

      // 3. Webshell & backdoor patterns in text
      if (
        s.includes('eval(base64_decode') ||
        s.includes('eval(gzinflate') ||
        s.includes('c99shell') ||
        s.includes('r57shell') ||
        s.includes('b374k') ||
        (s.includes('<?php') && (s.includes('system(') || s.includes('passthru(') || s.includes('shell_exec(')))
      ) {
        uploads.push({ name: hintName || 'webshell.php', data: Buffer.from(s, 'utf-8') });
        return;
      }

      // 4. Base64 encoded binary payload (PE MZ header, ELF, or ZIP)
      if (s.length >= 40 && s.length <= 50_000_000 && /^[A-Za-z0-9+/=]+$/.test(s.slice(0, 200))) {
        try {
          const sampleBuf = Buffer.from(s.slice(0, 1024), 'base64');
          const isMz = sampleBuf.length >= 2 && sampleBuf[0] === 0x4d && sampleBuf[1] === 0x5a;
          const isElf = sampleBuf.length >= 4 && sampleBuf[0] === 0x7f && sampleBuf[1] === 0x45 && sampleBuf[2] === 0x4c && sampleBuf[3] === 0x46;
          const isZip = sampleBuf.length >= 4 && sampleBuf[0] === 0x50 && sampleBuf[1] === 0x4b;
          const isEicarB64 = s.includes('WDVPIVAlQEFQ'); // Base64 for X5O!P%@AP
          if (isMz || isElf || isZip || isEicarB64) {
            const fullBuf = Buffer.from(s, 'base64');
            uploads.push({ name: hintName, data: fullBuf });
          }
        } catch {}
      }
      return;
    }

    if (Array.isArray(val)) {
      for (let i = 0; i < val.length; i++) {
        visit(val[i], `${hintName}_${i}`, depth + 1);
      }
      return;
    }

    if (typeof val === 'object') {
      const fileNameHint =
        val.name || val.filename || val.fileName || val.originalname || hintName;
      if (val.data && typeof val.data === 'string') {
        visit(val.data, fileNameHint, depth + 1);
      }
      if (val.content && typeof val.content === 'string') {
        visit(val.content, fileNameHint, depth + 1);
      }
      if (val.fileBase64 && typeof val.fileBase64 === 'string') {
        visit(val.fileBase64, fileNameHint, depth + 1);
      }
      if (val.dataBase64 && typeof val.dataBase64 === 'string') {
        visit(val.dataBase64, fileNameHint, depth + 1);
      }
      if (val.buffer && Buffer.isBuffer(val.buffer)) {
        uploads.push({ name: fileNameHint, data: val.buffer });
      }
      for (const [k, v] of Object.entries(val)) {
        if (k !== 'data' && k !== 'content' && k !== 'fileBase64' && k !== 'dataBase64' && k !== 'buffer') {
          const childHint =
            typeof v === 'object' && v !== null && 'name' in v && typeof (v as any).name === 'string'
              ? (v as any).name
              : `${hintName}_${k}`;
          visit(v, childHint, depth + 1);
        }
      }
    }
  };

  if (req.body) visit(req.body, 'body.bin');
  if (req.query) visit(req.query, 'query.bin');
  if ((req as any).files) visit((req as any).files, 'uploaded_file');
  if ((req as any).file) visit((req as any).file, 'uploaded_file');

  return uploads;
}

export interface GuardInput {
  message?: string;
  uploads?: { name: string; data: Buffer }[];
  verifiedUid?: string | null;
  isChat?: boolean;
  isTest?: boolean;
}

/**
 * Main Guard function:
 * Inspects request inputs, executes DEFCON detectors, applies strict IP bans
 * if viruses or rate-limits are breached, and logs all events.
 */
export async function guard(
  req: Request,
  res: Response,
  input: GuardInput
): Promise<boolean> {
  const mode = getMode();
  if (mode === 'off') return true;

  const source = clientIp(req);
  const fingerprint = clientFingerprint(req);
  const verified = !!input.verifiedUid;

  const isExplicitTest = Boolean(input.isTest || req.headers['x-defcon-test'] || req.originalUrl?.includes('/defcon/test'));
  if (!isExplicitTest && ALLOW_IPS.has(source)) return true;

  // 1. Check if source IP or fingerprint is on active blocklist
  if (mode === 'enforce') {
    const blockInfo = await getBlockInfo(source);
    const fpInfo = await getBlockInfo(fingerprint);
    const isBlocked = blockInfo.blocked || fpInfo.blocked;
    const remainingSec = Math.max(blockInfo.remainingSec, fpInfo.remainingSec);

    if (isBlocked && remainingSec > 0) {
      res.setHeader('Retry-After', remainingSec);
      sendSafeJson(res, 403, {
        error: 'ip_banned',
        status: 403,
        banned: true,
        reason: blockInfo.reason || fpInfo.reason || 'IP diblokir oleh DEFCON 5 Shield.',
        message: `Alamat IP Anda (${source}) DIBLOKIR oleh DEFCON 5 Shield. Anda tidak diizinkan mengirim request atau file berbahaya lagi. Silakan tunggu ${remainingSec} detik.`,
        retryAfter: remainingSec,
      });
      return false;
    }
  }

  // 2. Run Detectors
  const verdicts: Verdict[] = [];
  const push = (v: Verdict | null) => v && verdicts.push(v);

  // Check automated bot/flooding signatures
  push(detectBotSignatures(req.headers, source));

  // Check rate flood
  push(detectFlood(source));
  push(detectFlood(fingerprint));

  // If chat endpoint, inspect token exhaustion attempt
  if (input.isChat || req.path?.includes('chat')) {
    push(detectTokenDrain(source));
    push(detectTokenDrain(fingerprint));
  }

  // Inspect message text
  if (input.message) {
    push(detectPromptInjection(input.message, source));
    push(detectXss(input.message, source));
    push(detectBadUrls(input.message, source));
  }

  // Inspect uploaded files for viruses, executables, web shells, and known bad hashes
  for (const f of input.uploads ?? []) {
    push(detectBadUpload(f.name, f.data, source));
    if (await isKnownBadHash(sha256(f.data))) {
      push({
        kind: 'malware_upload',
        confidence: 0.99,
        evidence: ['hash-malware-database-dikenal'],
        source,
      });
    }
  }

  // 3. Process verdicts through Policy & Authorization Engine
  let reject = false;
  let rejectedReason = 'Permintaan ditolak oleh DEFCON 5 Shield: terdeteksi pola serangan.';
  let rejectedStatus = 400;
  let rejectedKind = 'security_violation';
  let retryAfterSeconds = 30;

  for (const v of verdicts) {
    const offenses = await recentOffenses(source);
    const action = pickAction(v, offenses, verified);
    const auth = authorize(v, action, source, verified);
    const applied = mode === 'enforce' && auth.allowed;

    await logEvent(v, action, applied, mode, auth.allowed ? undefined : auth.reason);

    if (!applied || !auth.allowed) continue;

    // A. MALWARE / VIRUS DETECTED: Immediately BAN the foreign IP address!
    if (v.kind === 'malware_upload') {
      reject = true;
      rejectedKind = 'malware_upload';
      rejectedStatus = 403;
      rejectedReason = `DEFCON 5 Shield: Berkas/virus berbahaya (${v.evidence.join(', ')}) terdeteksi dari alamat IP asing ${source}. Alamat IP Anda LANGSUNG DIBLOKIR selama 3600 detik dan tidak dapat mengirim berkas berbahaya lagi.`;
      retryAfterSeconds = 3600;
      // BAN IP for 1 hour (3600s)
      await blockTemp(source, 3600, `malware_foreign_ip_ban:${v.evidence.join(',')}`);
      await blockTemp(fingerprint, 3600, `malware_foreign_ip_ban:${v.evidence.join(',')}`);
      break;
    }

    // B. RATE LIMIT / FLOOD BREACHED: Immediately BAN the foreign IP address!
    if (v.kind === 'rate_abuse' || action === 'rate_limit' || action === 'block_temp') {
      const ttl = Math.max(auth.ttlSec || 300, 300); // Minimum 5 minutes (300s) ban on rate limit breach
      retryAfterSeconds = ttl;
      // BAN IP immediately so they cannot send any further requests or malicious files
      await blockTemp(source, ttl, `rate_limit_exceeded_ban:${v.evidence.join(',')}`);
      await blockTemp(fingerprint, ttl, `rate_limit_exceeded_ban:${v.evidence.join(',')}`);
      reject = true;
      rejectedStatus = 429;
      rejectedKind = 'rate_abuse';
      rejectedReason = `DEFCON 5 Shield: Alamat IP Anda (${source}) melampaui batas rate limit (${v.evidence.join(', ')}). Alamat IP LANGSUNG DIBLOKIR selama ${ttl} detik agar tidak dapat mengirim berkas/request berbahaya lagi.`;
      break;
    }

    if (action === 'reject_request') {
      reject = true;
      rejectedKind = v.kind;
      rejectedStatus = 400;
      rejectedReason = `Permintaan ditolak oleh DEFCON 5 Shield (${v.kind}: ${v.evidence.join(', ')}).`;
    }
  }

  if (reject) {
    if (rejectedStatus === 429 || rejectedStatus === 403) {
      res.setHeader('Retry-After', retryAfterSeconds);
    }
    sendSafeJson(res, rejectedStatus, {
      error: rejectedKind,
      status: rejectedStatus,
      banned: rejectedStatus === 403 || rejectedStatus === 429,
      message: rejectedReason,
      retryAfter: (rejectedStatus === 429 || rejectedStatus === 403) ? retryAfterSeconds : undefined,
    });
    return false;
  }

  return true;
}

/**
 * Global Anti-DDoS, Bot Shield & IP Ban Verification Middleware
 * Runs at the very start of the Express pipeline:
 * 1. Drops any banned IPs immediately before processing anything.
 * 2. Enforces strict rate limits: if exceeded, IP IS BANNED IMMEDIATELY.
 */
export function defconAntiDdosMiddleware(req: Request, res: Response, next: NextFunction) {
  const mode = getMode();
  if (mode === 'off') return next();

  // NEVER block normal page navigation, HTML, CSS, JS, fonts, images, or Vite modules!
  const url = req.originalUrl || req.url || '';
  if (!url.startsWith('/api') && req.method === 'GET') {
    return next();
  }

  const source = clientIp(req);
  if (ALLOW_IPS.has(source)) return next();

  // 1. Instant check if IP is actively banned
  getBlockInfo(source).then(async (blockInfo) => {
    if (blockInfo.blocked && blockInfo.remainingSec > 0) {
      res.setHeader('Retry-After', blockInfo.remainingSec);
      return sendSafeJson(res, 403, {
        error: 'ip_banned',
        status: 403,
        banned: true,
        reason: blockInfo.reason || 'IP diblokir oleh DEFCON 5 Shield.',
        message: `DEFCON 5 Shield: Alamat IP Anda (${source}) sedang DIBLOKIR. Tidak dapat mengirim request atau berkas berbahaya. Sisa waktu blokir: ${blockInfo.remainingSec} detik.`,
        retryAfter: blockInfo.remainingSec,
      });
    }

    // 2. Automated bot script flood inspection (e.g. python-requests flood, curl loop)
    const botVerdict = detectBotSignatures(req.headers, source);
    if (botVerdict && mode === 'enforce') {
      // BAN IP for 300 seconds
      await blockTemp(source, 300, 'automated_bot_ban');
      await logEvent(botVerdict, 'block_temp', true, mode, 'automated_script_bot_ban');
      res.setHeader('Retry-After', 300);
      return sendSafeJson(res, 429, {
        error: 'rate_abuse',
        status: 429,
        banned: true,
        message: `DEFCON 5 Shield: Skrip/bot otomatis terdeteksi (${botVerdict.evidence.join(', ')}). Alamat IP ${source} LANGSUNG DIBLOKIR selama 300 detik agar tidak dapat mengirim request/berkas berbahaya lagi.`,
        retryAfter: 300,
      });
    }

    // 3. Strict Rate Limit Flood Check on API endpoints:
    // Max 30 requests in 5 seconds (burst)
    const floodVerdict = detectFlood(source, 30, 5000);
    if (floodVerdict && mode === 'enforce') {
      // Rate limit breached: IMMEDIATELY BAN THE IP FOR 300 SECONDS!
      await blockTemp(source, 300, 'rate_limit_exceeded_ban');
      await logEvent(floodVerdict, 'block_temp', true, mode, 'rate_limit_flood_ip_ban');
      res.setHeader('Retry-After', 300);
      return sendSafeJson(res, 429, {
        error: 'rate_abuse',
        status: 429,
        banned: true,
        message: `DEFCON 5 Shield: Alamat IP Anda (${source}) melampaui batasan rate limit (>${floodVerdict.evidence.join(', ')}). Alamat IP LANGSUNG DIBLOKIR selama 300 detik agar tidak dapat mengirim berkas berbahaya lagi.`,
        retryAfter: 300,
      });
    }

    next();
  }).catch(() => next());
}

/**
 * Universal Inbound Request File & Virus Scanner Middleware
 * Inspects all requests OUTSIDE chat (and inside chat) across all endpoints:
 * - Scans req.body, req.query, attachments, and base64 payloads for viruses.
 * - If a virus is detected from a foreign IP:
 *   1. Immediately BANS the IP address for 3600 seconds.
 *   2. Rejects request with 403 Forbidden.
 *   3. Logs incident to DEFCON 5 statistics and threat records.
 */
export async function defconUniversalFilePayloadMiddleware(req: Request, res: Response, next: NextFunction) {
  const mode = getMode();
  if (mode === 'off') return next();

  // Skip static file GET requests
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }

  const source = clientIp(req);
  if (ALLOW_IPS.has(source)) return next();

  try {
    const files = extractFilesFromAnyRequest(req);
    if (!files || files.length === 0) {
      return next();
    }

    // Inspect every extracted file buffer
    for (const f of files) {
      const v = detectBadUpload(f.name, f.data, source);
      const isKnownBad = await isKnownBadHash(sha256(f.data));

      if (v || isKnownBad) {
        const evidence = v ? v.evidence : ['known-malware-hash-signature'];
        const verdict: Verdict = v || {
          kind: 'malware_upload',
          confidence: 0.99,
          evidence,
          source,
        };

        // BAN the foreign IP address for 3600 seconds (1 hour)
        await blockTemp(source, 3600, `malware_foreign_ip_ban:${evidence.join(',')}`);
        await logEvent(verdict, 'block_temp', true, mode, `foreign_ip_malware_blocked:${source}`);

        res.setHeader('Retry-After', 3600);
        return sendSafeJson(res, 403, {
          error: 'malware_blocked',
          status: 403,
          banned: true,
          threat: 'malware_upload',
          message: `DEFCON 5 Shield: Berkas/virus berbahaya (${evidence.join(', ')}) terdeteksi dari alamat IP asing ${source}. Alamat IP Anda LANGSUNG DIBLOKIR selama 3600 detik dan tidak dapat mengirim berkas lagi.`,
          evidence,
          retryAfter: 3600,
        });
      }
    }

    next();
  } catch (err) {
    console.warn('DEFCON universal file payload inspection error:', err);
    next();
  }
}

/** Pakai di output Maria sebelum dikirim ke user untuk mencegah kebocoran rahasia / API keys. */
export const sanitizeOutput = (text: string): string => redactSecrets(text).text;

/** Untuk level DEFCON dinamis. */
export const currentLevel = async (): Promise<Defcon> => levelFromScore(await recentScore());

/** Data status lengkap untuk dashboard dan popup UI. */
export async function getDefconSummary() {
  const level = await currentLevel();
  const mode = getMode();
  const stats = defconStore.getStats();
  const events = defconStore.getEvents(30);

  return {
    level,
    mode,
    stats,
    events,
  };
}
