import type { Request, Response } from 'express';
import {
  detectBadUpload,
  detectBadUrls,
  detectFlood,
  detectPromptInjection,
  detectXss,
  redactSecrets,
  sha256,
} from './detectors.ts';
import { authorize, levelFromScore, pickAction } from './policy.ts';
import {
  blockedFor,
  blockTemp,
  isKnownBadHash,
  logEvent,
  recentOffenses,
  recentScore,
  defconStore,
} from './store.ts';
import { getMode, type Verdict, type Defcon } from './types.ts';

const ALLOW_IPS = new Set((process.env.DEFCON_ALLOW_IPS ?? '').split(',').filter(Boolean));

export const clientIp = (req: Request): string =>
  String(req.headers['x-forwarded-for'] ?? req.socket?.remoteAddress ?? '')
    .split(',')[0]
    .trim() || 'unknown';

export interface GuardInput {
  message?: string;
  uploads?: { name: string; data: Buffer }[];
  verifiedUid?: string | null; // hasil verifyIdToken Firebase; null = anonim
}

/**
 * Main Guard function:
 * returns true = lanjut proses.
 * returns false = guard sudah menolak dan mengirim response error ke client.
 */
export async function guard(
  req: Request,
  res: Response,
  input: GuardInput
): Promise<boolean> {
  const mode = getMode();
  if (mode === 'off') return true;

  const source = clientIp(req);
  const verified = !!input.verifiedUid;

  if (ALLOW_IPS.has(source)) return true;

  // 1. Check if source is on active temporary blocklist
  if (mode === 'enforce') {
    const left = await blockedFor(source);
    if (left > 0) {
      res.setHeader('Retry-After', left);
      res.status(429).json({
        error: 'temp_blocked',
        message: `Akses ditahan sementara oleh DEFCON Shield. Silakan tunggu ${left} detik.`,
        retryAfter: left,
      });
      return false;
    }
  }

  // 2. Run Detectors
  const verdicts: Verdict[] = [];
  const push = (v: Verdict | null) => v && verdicts.push(v);

  push(detectFlood(source));

  if (input.message) {
    push(detectPromptInjection(input.message, source));
    push(detectXss(input.message, source));
    push(detectBadUrls(input.message, source));
  }

  for (const f of input.uploads ?? []) {
    push(detectBadUpload(f.name, f.data, source));
    if (await isKnownBadHash(sha256(f.data))) {
      push({
        kind: 'malware_upload',
        confidence: 0.99,
        evidence: ['hash-malware-dikenal'],
        source,
      });
    }
  }

  // 3. Process verdicts through Policy & Authorization Engine
  let reject = false;
  let rejectedReason = 'Permintaan ditolak oleh DEFCON: terdeteksi pola serangan.';

  for (const v of verdicts) {
    const offenses = await recentOffenses(source);
    const action = pickAction(v, offenses, verified);
    const auth = authorize(v, action, source, verified);
    const applied = mode === 'enforce' && auth.allowed;

    await logEvent(v, action, applied, mode, auth.allowed ? undefined : auth.reason);

    if (!applied || !auth.allowed) continue;

    if (action === 'reject_request') {
      reject = true;
      rejectedReason = `Permintaan ditolak oleh DEFCON Shield (${v.kind}: ${v.evidence.join(', ')}).`;
    }

    if (action === 'rate_limit' || action === 'block_temp') {
      await blockTemp(source, auth.ttlSec!, v.kind);
      reject = true;
      rejectedReason = `Aktivitas mencurigakan diblokir sementara (${v.kind}).`;
    }
  }

  if (reject) {
    res.status(400).json({
      error: 'request_rejected',
      message: rejectedReason,
    });
    return false;
  }

  return true;
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
