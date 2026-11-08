/**
 * Maria DEFCON 5 - Web Application Firewall (WAF) Engine
 * Comprehensive Gatekeeper protecting AI Engine:
 * 1. IP Reputation & Dynamic Whitelisting / Blacklisting (IP Intelligence)
 * 2. Strict Rate Limiting (5 requests/minute per IP for AI endpoints, Burst Shield)
 * 3. Deep Pre-AI Payload & Header Validation (Header Anomalies, Hidden Binaries, WebShells)
 */

import type { Request, Response, NextFunction } from 'express';
import { clientIp, clientFingerprint, extractFilesFromAnyRequest } from './guard.ts';
import { detectBadUpload, sha256 } from './detectors.ts';
import { blockTemp, blockedFor, getBlockInfo, isKnownBadHash, logEvent, defconStore } from './store.ts';
import { getMode, type Verdict } from './types.ts';

export interface IpIntelligenceData {
  ip: string;
  country?: string;
  countryCode?: string;
  region?: string;
  city?: string;
  isp?: string;
  org?: string;
  as?: string;
  isProxy?: boolean;
  isHosting?: boolean;
  isBogon?: boolean;
  reputationScore?: number; // 0 (clean) to 100 (high risk)
  lastChecked: number;
}

// In-Memory IP Intelligence Cache (24-hour TTL)
const ipIntelCache = new Map<string, IpIntelligenceData>();

// Dynamic Whitelisted IPs (Owner & Admin IPs)
const whitelistedIps = new Set<string>([
  '127.0.0.1',
  '::1',
  '::ffff:127.0.0.1',
  'localhost',
  '169.254.169.126',
  'unknown',
  ...(process.env.DEFCON_ALLOW_IPS ?? '').split(',').map((s) => s.trim()).filter(Boolean),
]);

// Known Malicious Datacenter & Proxy ASN keywords / Bot Subnets
const SUSPICIOUS_ORG_KEYWORDS = [
  'digitalocean',
  'ovh sas',
  'linode',
  'vultr',
  'choopa',
  'm247',
  'datapacket',
  'colocrossing',
  'fastly',
  'tor-exit',
  'vpn',
  'proxy',
];

// Helper to check bogon / private IP from outside
function isPrivateIp(ip: string): boolean {
  if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost' || ip.startsWith('169.254.')) return true;
  if (ip.startsWith('10.') || ip.startsWith('192.168.')) return true;
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip)) return true;
  return false;
}

/**
 * Universal JSON responder supporting both Express and Node http.ServerResponse (Vite Connect)
 */
function sendWafJson(res: any, statusCode: number, data: any) {
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    return res.status(statusCode).json(data);
  }
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

// Rate Limiter Storage for WAF (5 req/min on AI endpoints)
const aiReqTimestamps = new Map<string, number[]>();

export class WafEngine {
  /**
   * Whitelist or Un-whitelist an IP (e.g. Owner/Admin device)
   */
  public addWhitelistIp(ip: string) {
    if (ip && typeof ip === 'string') {
      whitelistedIps.add(ip.trim());
    }
  }

  public removeWhitelistIp(ip: string) {
    whitelistedIps.delete(ip.trim());
  }

  public isWhitelisted(ip: string): boolean {
    return whitelistedIps.has(ip.trim());
  }

  public getWhitelistedIps(): string[] {
    return Array.from(whitelistedIps);
  }

  /**
   * Pillar 1: IP Intelligence & Reputation Check
   * Queries reputation heuristics and cached intelligence
   */
  public async checkIpReputation(ip: string): Promise<IpIntelligenceData> {
    const cleanIp = ip.trim();

    // Check cache first
    const cached = ipIntelCache.get(cleanIp);
    if (cached && Date.now() - cached.lastChecked < 24 * 3600 * 1000) {
      return cached;
    }

    const intel: IpIntelligenceData = {
      ip: cleanIp,
      isBogon: isPrivateIp(cleanIp),
      reputationScore: 0,
      lastChecked: Date.now(),
    };

    if (intel.isBogon || this.isWhitelisted(cleanIp)) {
      intel.reputationScore = 0;
      ipIntelCache.set(cleanIp, intel);
      return intel;
    }

    // Query lightweight IP intelligence API with strict 1500ms timeout
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);

      const resp = await fetch(`https://ip-api.com/json/${cleanIp}?fields=status,country,countryCode,regionName,city,isp,org,as,proxy,hosting`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (resp.ok) {
        const data = await resp.json();
        if (data.status === 'success') {
          intel.country = data.country;
          intel.countryCode = data.countryCode;
          intel.region = data.regionName;
          intel.city = data.city;
          intel.isp = data.isp;
          intel.org = data.org;
          intel.as = data.as;
          intel.isProxy = Boolean(data.proxy);
          intel.isHosting = Boolean(data.hosting);

          // Calculate reputation threat score
          let score = 0;
          if (data.proxy) score += 60;
          if (data.hosting) score += 40;

          const orgLower = String(data.org || '').toLowerCase();
          const ispLower = String(data.isp || '').toLowerCase();
          if (SUSPICIOUS_ORG_KEYWORDS.some((kw) => orgLower.includes(kw) || ispLower.includes(kw))) {
            score += 30;
          }

          intel.reputationScore = Math.min(100, score);
        }
      }
    } catch {
      // Safe fallback if offline / rate limited: do not block without evidence
      intel.reputationScore = 0;
    }

    ipIntelCache.set(cleanIp, intel);
    return intel;
  }

  /**
   * Pillar 2: Strict Rate Limiting (5 requests per minute for AI endpoints)
   * If exceeded, IP is locked for 300 seconds (5 minutes)
   */
  public checkAiRateLimit(source: string, max = 5, windowMs = 60000, ignoreWhitelist = false): { allowed: boolean; count: number; retryAfter?: number } {
    if (!ignoreWhitelist && this.isWhitelisted(source)) {
      return { allowed: true, count: 1 };
    }

    const now = Date.now();
    const timestamps = (aiReqTimestamps.get(source) ?? []).filter((t) => now - t < windowMs);
    timestamps.push(now);
    aiReqTimestamps.set(source, timestamps);

    if (aiReqTimestamps.size > 5000) aiReqTimestamps.clear();

    if (timestamps.length > max) {
      return {
        allowed: false,
        count: timestamps.length,
        retryAfter: 300, // 5 minutes lockout
      };
    }

    return { allowed: true, count: timestamps.length };
  }

  /**
   * Pillar 3: Header Validation (Detects bot signatures, forged XFF, anomalous tools)
   */
  public validateHeaders(headers: Record<string, any>, source: string, ignoreWhitelist = false): { valid: boolean; evidence?: string[] } {
    if (!ignoreWhitelist && this.isWhitelisted(source)) {
      return { valid: true };
    }

    const ev: string[] = [];
    const ua = String(headers['user-agent'] || '').toLowerCase();

    // 1. Check prohibited automated tools
    if (
      ua.includes('python-requests') ||
      ua.includes('aiohttp') ||
      ua.includes('httpx') ||
      ua.includes('urllib') ||
      ua.includes('go-http-client')
    ) {
      ev.push(`bot-tool:${ua.slice(0, 30)}`);
    }

    // 2. Bare Mozilla/5.0 spoofing without any real browser attributes
    if (ua === 'mozilla/5.0') {
      const hasSecCh = Boolean(headers['sec-ch-ua'] || headers['sec-fetch-dest'] || headers['sec-fetch-mode']);
      const hasAccept = Boolean(headers['accept-language']);
      if (!hasSecCh && !hasAccept) {
        ev.push('bare-mozilla-spoofing');
      }
    }

    // 3. Dangerous exploit headers or probes
    const xOriginalUrl = String(headers['x-original-url'] || headers['x-rewrite-url'] || '');
    if (xOriginalUrl.includes('..') || xOriginalUrl.includes('/etc/passwd') || xOriginalUrl.includes('wp-admin')) {
      ev.push('path-traversal-probe');
    }

    return {
      valid: ev.length === 0,
      evidence: ev.length > 0 ? ev : undefined,
    };
  }

  /**
   * Live WAF Summary for UI Dashboard
   */
  public getWafSummary() {
    const stats = defconStore.getStats();
    const events = defconStore.getEvents(20);

    return {
      status: 'active',
      defconLevel: 5,
      whitelistedCount: whitelistedIps.size,
      whitelistedIps: Array.from(whitelistedIps),
      activeBansCount: stats.activeBlocksCount,
      totalBlockedByWaf: stats.totalBlocked,
      byKind: stats.byKind,
      recentEvents: events.filter((e) =>
        ['malware_upload', 'rate_abuse', 'waf_ip_reputation', 'waf_bot_header'].includes(e.kind)
      ),
      rules: {
        aiRateLimit: '5 requests / 60 detik (Auto 300s lock)',
        ipIntelligence: 'Active (Botnet, Proxy & Datacenter ASN Filter)',
        payloadInspection: 'Active (Pre-AI Binary & Script Gateway Neutralization)',
      },
    };
  }
}

export const wafEngine = new WafEngine();

/**
 * Main WAF Gatekeeper Middleware
 * Runs at the front door before AI engine logic!
 */
export async function wafGatekeeperMiddleware(req: Request, res: Response, next: NextFunction) {
  const mode = getMode();
  if (mode === 'off') return next();

  // ONLY protect API routes, AI endpoints, and form submissions.
  // Never intercept or block normal static assets, HTML, or Vite bundles!
  const url = req.originalUrl || req.url || '';
  if (!url.startsWith('/api') && req.method === 'GET') {
    return next();
  }

  const source = clientIp(req);
  const fingerprint = clientFingerprint(req);

  const isExplicitTest = Boolean(req.headers['x-defcon-test'] || url.includes('/defcon/test'));
  // If IP is explicitly whitelisted (Owner / Admin / Localhost) -> pass freely, unless testing!
  if (!isExplicitTest && wafEngine.isWhitelisted(source)) {
    return next();
  }

  // 1. Check if IP or Fingerprint is currently in active ban list
  const blockInfo = await getBlockInfo(source);
  const fpInfo = await getBlockInfo(fingerprint);
  const isBanned = blockInfo.blocked || fpInfo.blocked;
  const remainingSec = Math.max(blockInfo.remainingSec, fpInfo.remainingSec);

  if (isBanned && remainingSec > 0) {
    res.setHeader('Retry-After', remainingSec);
    return sendWafJson(res, 403, {
      error: 'waf_ip_banned',
      status: 403,
      banned: true,
      reason: blockInfo.reason || fpInfo.reason || 'IP diblokir oleh Maria WAF DEFCON 5.',
      message: `Maria WAF: Alamat IP Anda (${source}) sedang DIBLOKIR. Koneksi diputus di level gateway untuk melindungi server. Sisa waktu blokir: ${remainingSec} detik.`,
      retryAfter: remainingSec,
    });
  }

  // 2. Pillar 3: Header Validation before reaching AI Engine
  const targetSource = isExplicitTest ? `simulated_attacker_${source}` : source;
  const headerCheck = wafEngine.validateHeaders(req.headers, targetSource, isExplicitTest);
  if (!headerCheck.valid && headerCheck.evidence && headerCheck.evidence.length > 0) {
    if (!isExplicitTest) {
      await blockTemp(source, 300, `waf_bad_header:${headerCheck.evidence.join(',')}`);
      await blockTemp(fingerprint, 300, `waf_bad_header:${headerCheck.evidence.join(',')}`);
    }

    const verdict: Verdict = {
      kind: 'rate_abuse',
      confidence: 0.95,
      evidence: headerCheck.evidence,
      source: targetSource,
    };
    await logEvent(verdict, 'block_temp', true, mode, 'waf_header_anomaly_blocked');

    res.setHeader('Retry-After', 300);
    return sendWafJson(res, 403, {
      error: 'waf_header_rejected',
      status: 403,
      banned: true,
      message: `Maria WAF: Header tidak lazim/bot terdeteksi (${headerCheck.evidence.join(', ')}). Akses ditolak sebelum mencapai AI Engine. IP diblokir 300 detik.`,
      evidence: headerCheck.evidence,
      retryAfter: 300,
    });
  }

  // 3. Pillar 2: Strict Rate Limiting on AI Chat & Token Endpoints (5 req/min)
  if (
    url.includes('/chat') ||
    url.includes('/generate-image') ||
    (isExplicitTest && (req.body?.isChat || String(req.body?.payload || '').startsWith('simulated_chat_msg')))
  ) {
    const rateCheck = wafEngine.checkAiRateLimit(targetSource, 5, 60000, isExplicitTest);
    if (!rateCheck.allowed) {
      if (!isExplicitTest) {
        await blockTemp(source, 300, 'waf_ai_token_exhaustion_lock');
        await blockTemp(fingerprint, 300, 'waf_ai_token_exhaustion_lock');
      }

      const verdict: Verdict = {
        kind: 'rate_abuse',
        confidence: 0.98,
        evidence: [`rate-limit-exceeded:>${rateCheck.count}req/60s (limit 5)`],
        source: targetSource,
      };
      await logEvent(verdict, 'block_temp', true, mode, 'waf_ai_token_drain_blocked');

      res.setHeader('Retry-After', 300);
      return sendWafJson(res, 429, {
        error: 'waf_rate_limit_exceeded',
        status: 429,
        banned: true,
        message: `Maria WAF: Batas aman tercapai (${rateCheck.count} request/menit, batas: 5 req/menit). Alamat IP ${targetSource} DIKUNCI sementara selama 300 detik untuk mencegah pemborosan token AI.`,
        retryAfter: 300,
      });
    }
  }

  // 4. Pillar 1: IP Reputation / Threat Intelligence check (Asynchronous heuristic)
  wafEngine.checkIpReputation(source).then(async (intel) => {
    if (intel.reputationScore && intel.reputationScore >= 80) {
      // High-risk Proxy / Malicious Datacenter Bot -> Ban IP!
      await blockTemp(source, 1800, `waf_bad_ip_reputation:${intel.org || 'malicious_proxy'}`);
      const verdict: Verdict = {
        kind: 'rate_abuse',
        confidence: 0.95,
        evidence: [`ip-intelligence-risk:${intel.reputationScore}%:${intel.org || 'proxy'}`],
        source,
      };
      await logEvent(verdict, 'block_temp', true, mode, 'waf_bad_reputation_blocked');
    }
  }).catch(() => {});

  // 5. Pillar 3: Deep Payload Validation (Inspects files/body before AI engine)
  if (req.method === 'POST' || req.method === 'PUT') {
    try {
      const files = extractFilesFromAnyRequest(req);
      for (const f of files) {
        const v = detectBadUpload(f.name, f.data, source);
        const isBadHash = await isKnownBadHash(sha256(f.data));

        if (v || isBadHash) {
          const evidence = v ? v.evidence : ['known-malware-hash-signature'];
          // LOCK IP FOR 3600 SECONDS (1 HOUR)
          await blockTemp(source, 3600, `waf_malware_blocked:${evidence.join(',')}`);
          await blockTemp(fingerprint, 3600, `waf_malware_blocked:${evidence.join(',')}`);

          const verdict: Verdict = v || {
            kind: 'malware_upload',
            confidence: 0.99,
            evidence,
            source,
          };
          await logEvent(verdict, 'block_temp', true, mode, 'waf_pre_ai_payload_blocked');

          res.setHeader('Retry-After', 3600);
          return sendWafJson(res, 403, {
            error: 'waf_payload_blocked',
            status: 403,
            banned: true,
            message: `Maria WAF: Berkas/payload berbahaya (${evidence.join(', ')}) terdeteksi sebelum masuk engine AI. Akses ditolak di level gateway dan IP diblokir 3600 detik.`,
            evidence,
            retryAfter: 3600,
          });
        }
      }
    } catch (err) {
      console.warn('WAF payload validation notice:', err);
    }
  }

  next();
}
