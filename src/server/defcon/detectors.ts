import { createHash } from 'crypto';
import type { Verdict } from './types.ts';

const norm = (s: string) =>
  s.normalize('NFKC').replace(/[\u200B-\u200F\u2060\uFEFF]/g, '').toLowerCase();

const cap = (n: number, max = 0.99) => Math.min(max, Math.round(n * 100) / 100);

type Rule = [RegExp, number, string];

// ---------- Prompt injection ----------
const INJECTION: Rule[] = [
  [/ignore (all |any )?(previous|prior|above|earlier) (instructions|rules|prompts?)/, 0.7, 'ignore-previous'],
  [/abaikan (semua )?(instruksi|perintah|aturan|prompt) (sebelumnya|di atas|awal)/, 0.7, 'abaikan-instruksi'],
  [/(reveal|show|print|leak|bocorkan|tampilkan|tunjukkan).{0,30}(system prompt|prompt sistem|instruksi sistem)/, 0.6, 'bocor-system-prompt'],
  [/you are now (dan|in developer mode|jailbroken|unrestricted)/, 0.7, 'jailbreak-persona'],
  [/(disregard|forget|lupakan).{0,25}(rules|guidelines|instructions|aturan|instruksi)/, 0.5, 'forget-rules'],
  [/<\|?(system|im_start|im_end)\|?>/, 0.5, 'fake-role-token'],
  [/(matikan|disable|turn off|nonaktifkan).{0,25}(defcon|keamanan|security|filter)/, 0.6, 'matikan-keamanan'],
  [/(blokir|block|ban|hapus|delete).{0,25}(semua )?(user|pengguna|akun)/, 0.5, 'suruh-blokir-user'],
];

export function detectPromptInjection(text: string, source: string): Verdict | null {
  const t = norm(text);
  const hits = INJECTION.filter(([re]) => re.test(t));
  if (!hits.length) return null;
  return {
    kind: 'prompt_injection',
    confidence: cap(hits.reduce((s, h) => s + h[1], 0)),
    evidence: hits.map((h) => h[2]),
    source,
  };
}

// ---------- XSS ----------
const XSS: Rule[] = [
  [/<\s*script/, 0.7, 'script-tag'],
  [/\bon(error|load|click|mouseover|focus)\s*=/, 0.6, 'event-handler'],
  [/javascript\s*:/, 0.6, 'javascript-uri'],
  [/<\s*(iframe|object|embed|svg[^>]*onload)/, 0.5, 'embed-tag'],
  [/data\s*:\s*text\/html/, 0.6, 'data-html'],
];

export function detectXss(text: string, source: string): Verdict | null {
  const t = norm(text);
  const hits = XSS.filter(([re]) => re.test(t));
  if (!hits.length) return null;
  return {
    kind: 'xss',
    confidence: cap(hits.reduce((s, h) => s + h[1], 0)),
    evidence: hits.map((h) => h[2]),
    source,
  };
}

// ---------- URL mencurigakan (heuristik, sengaja max 0.85: tidak pernah cukup buat blokir otomatis permanen) ----------
const RISKY_TLD = /\.(zip|mov|top|xyz|click|gq|tk|ml|cf)$/;

export function detectBadUrls(text: string, source: string): Verdict | null {
  const urls = text.match(/\b[a-z][a-z0-9+.-]*:\/\/[^\s<>"']+/gi) ?? [];
  let best = 0;
  const ev = new Set<string>();

  for (const raw of urls) {
    let u: URL;
    try {
      u = new URL(raw);
    } catch {
      continue;
    }
    let s = 0;
    if (!/^https?:$/.test(u.protocol)) {
      s += 0.7;
      ev.add('skema-aneh');
    }
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(u.hostname)) {
      s += 0.4;
      ev.add('host-ip');
    }
    if (u.hostname.split('.').some((p) => p.startsWith('xn--'))) {
      s += 0.3;
      ev.add('punycode');
    }
    if (u.username) {
      s += 0.4;
      ev.add('userinfo');
    }
    if (RISKY_TLD.test(u.hostname)) {
      s += 0.2;
      ev.add('tld-berisiko');
    }
    if (raw.length > 200) {
      s += 0.1;
      ev.add('url-panjang');
    }
    best = Math.max(best, s);
  }

  return best >= 0.4
    ? { kind: 'malicious_url', confidence: cap(best, 0.85), evidence: [...ev], source }
    : null;
}

// ---------- Upload ----------
export const sha256 = (buf: Buffer) => createHash('sha256').update(buf).digest('hex');

const DOUBLE_EXT = /\.(pdf|docx?|xlsx?|pptx?|jpe?g|png|gif|txt|mp4)\.(exe|scr|bat|cmd|com|js|vbs|ps1|jar|apk|msi)$/i;
const EXEC_OK_EXT = /\.(exe|dll|msi|bin|so|apk)$/i;

export function detectBadUpload(name: string, data: Buffer, source: string): Verdict | null {
  const ev: string[] = [];
  let s = 0;
  if (DOUBLE_EXT.test(name)) {
    s += 0.8;
    ev.push('ekstensi-ganda');
  }
  const isPE = data[0] === 0x4d && data[1] === 0x5a; // "MZ"
  const isELF = data[0] === 0x7f && data[1] === 0x45 && data[2] === 0x4c && data[3] === 0x46;
  if ((isPE || isELF) && !EXEC_OK_EXT.test(name)) {
    s += 0.8;
    ev.push('executable-menyamar');
  }
  return s ? { kind: 'malware_upload', confidence: cap(s), evidence: ev, source } : null;
}

// ---------- Flood (per-instance; cukup untuk versi simple) ----------
const hits = new Map<string, number[]>();

export function detectFlood(source: string, max = 5, windowMs = 5000): Verdict | null {
  const now = Date.now();
  const arr = (hits.get(source) ?? []).filter((t) => now - t < windowMs);
  arr.push(now);
  hits.set(source, arr);
  if (hits.size > 5000) hits.clear();
  return arr.length > max
    ? { kind: 'rate_abuse', confidence: 0.85, evidence: [`>${max} req/${windowMs / 1000}s`], source }
    : null;
}

// ---------- DLP untuk output Maria ----------
const SECRETS: RegExp[] = [
  /AIza[0-9A-Za-z_-]{35}/g,
  /sk-[A-Za-z0-9_-]{20,}/g,
  /ghp_[A-Za-z0-9]{36}/g,
  /AKIA[0-9A-Z]{16}/g,
  /-----BEGIN (RSA |EC )?PRIVATE KEY-----[\s\S]*?-----END (RSA |EC )?PRIVATE KEY-----/g,
];

export function redactSecrets(text: string): { text: string; found: number } {
  let found = 0;
  let out = text;
  for (const re of SECRETS) {
    out = out.replace(re, () => {
      found++;
      return '[REDACTED]';
    });
  }
  return { text: out, found };
}
