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

// ---------- Upload Malware & Virus Detection ----------
export const sha256 = (buf: Buffer) => createHash('sha256').update(buf).digest('hex');

// Standard EICAR Antivirus Test Signature
const EICAR_SIG = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';
const EICAR_HASH = '275a021bbfb6489e54d471899f7db9d1663fc695ec2fe2a2c4538aabf651fd0f';

// Prohibited executable binary & script extensions
const BLOCKED_EXTENSIONS = [
  'exe', 'scr', 'bat', 'cmd', 'com', 'pif', 'vbs', 'vbe', 'js', 'jse', 'wsf', 'wsh',
  'ps1', 'psm1', 'msi', 'msp', 'reg', 'hta', 'cpl', 'msc', 'inf',
  'elf', 'so', 'sh', 'bash', 'zsh', 'command',
  'jar', 'apk', 'dex',
  'php', 'phtml', 'php3', 'php4', 'php5', 'phps', 'asp', 'aspx', 'jsp', 'cgi', 'pl', 'py'
];

// Legitimate user media extensions that are always safe
const SAFE_MEDIA_EXTENSIONS = new Set([
  'mp4', 'webm', 'mov', 'avi', 'mkv', 'm4v',
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico',
  'mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'weba',
  'pdf', 'txt', 'csv', 'json', 'md'
]);

const DOUBLE_EXT = /\.(pdf|docx?|xlsx?|pptx?|jpe?g|png|gif|txt|mp4|webp)\.(exe|scr|bat|cmd|com|js|vbs|ps1|jar|apk|msi|sh|bin)$/i;

// Seed known dangerous hashes (MalwareBazaar & VirusTotal known threats)
const KNOWN_MALWARE_HASHES = new Set<string>([
  EICAR_HASH,
  '44d88612fea8a8f36de82e1278abb02f', // EICAR MD5
  '56a29792e850eb81ec70081d6d2b512bb31a980757a2745330aa0e1e695d7f1c', // AgentTesla
  '4f9810a9f5d1797c23bc9876251efc1b48b11119c3b8893798cf0ae91b106297', // WannaCry
  'a8f7d92c730245a8b54359670188d0115e5b32938f32aa76e55959146522c0ff', // RedLine
  'c4a6358dbb8e23f95e8e819b122709e99a4e8d38827fa1a4e12e7ef64a32338c', // Mirai Botnet
  'b993374828135cc3cdcb0cae78553229b19df5ad35b71db3fb2d41a8080f5c1d', // Locky Ransomware
  '8d3896cfab1844b643a6d71b3e8ee758d4a66a3d9061d47ee6bf27376c66cf64', // CobaltStrike Beacon
]);

export function detectBadUpload(name: string, data: Buffer, source: string): Verdict | null {
  const ev: string[] = [];
  let confidence = 0;
  const hash = sha256(data).toLowerCase();
  const lowerName = name.toLowerCase();
  const parts = lowerName.split('.');
  const ext = parts.length > 1 ? parts[parts.length - 1] : '';

  // 1. Check EICAR standard AV test string or hash
  if (hash === EICAR_HASH || lowerName.includes('eicar')) {
    return {
      kind: 'malware_upload',
      confidence: 0.99,
      evidence: ['EICAR-Standard-AV-Test-Signature'],
      source,
    };
  }

  const sampleAscii = data.slice(0, Math.min(data.length, 4096)).toString('utf-8');
  if (sampleAscii.includes(EICAR_SIG)) {
    return {
      kind: 'malware_upload',
      confidence: 0.99,
      evidence: ['EICAR-Standard-AV-Test-Payload'],
      source,
    };
  }

  // 2. Check Known Malware Hash database
  if (KNOWN_MALWARE_HASHES.has(hash)) {
    return {
      kind: 'malware_upload',
      confidence: 0.99,
      evidence: [`known-malware-hash:${hash.slice(0, 12)}`],
      source,
    };
  }

  // If file has a standard safe media/document extension and is not malware, pass safely
  if (SAFE_MEDIA_EXTENSIONS.has(ext) && !DOUBLE_EXT.test(lowerName)) {
    return null;
  }

  // 3. Prohibited Executable / Binary Extensions
  if (BLOCKED_EXTENSIONS.includes(ext)) {
    ev.push(`ekstensi-biner-dilarang:.${ext}`);
    confidence = Math.max(confidence, 0.95);
  }

  // 4. Double Extensions disguise
  if (DOUBLE_EXT.test(lowerName)) {
    ev.push('ekstensi-ganda-menyamar');
    confidence = Math.max(confidence, 0.92);
  }

  // 5. Binary Magic Bytes inspection
  if (data.length >= 2) {
    const isPE = data[0] === 0x4d && data[1] === 0x5a; // "MZ"
    if (isPE) {
      ev.push('pe-windows-binary-detected');
      confidence = Math.max(confidence, 0.98);
    }
  }

  if (data.length >= 4) {
    const isELF = data[0] === 0x7f && data[1] === 0x45 && data[2] === 0x4c && data[3] === 0x46; // ".ELF"
    if (isELF) {
      ev.push('elf-linux-binary-detected');
      confidence = Math.max(confidence, 0.98);
    }

    const isMachO = (data[0] === 0xca && data[1] === 0xfe && data[2] === 0xba && data[3] === 0xbe) ||
                    (data[0] === 0xfe && data[1] === 0xed && data[2] === 0xfa && data[3] === 0xce);
    if (isMachO) {
      ev.push('macho-darwin-binary-detected');
      confidence = Math.max(confidence, 0.98);
    }

    // Zip archive inspecting for embedded executables
    const isZip = data[0] === 0x50 && data[1] === 0x4b && (data[2] === 0x03 || data[2] === 0x05);
    if (isZip) {
      const zipSnippet = data.slice(0, Math.min(data.length, 32768)).toString('ascii').toLowerCase();
      for (const dangerous of ['exe', 'scr', 'bat', 'cmd', 'vbs', 'ps1', 'jar']) {
        if (zipSnippet.includes(`.${dangerous}`)) {
          ev.push(`zip-mengandung-executable:.${dangerous}`);
          confidence = Math.max(confidence, 0.95);
          break;
        }
      }
    }
  }

  // 6. Web shells & Backdoor signatures in text / polyglot files
  const lowerSnippet = sampleAscii.toLowerCase();
  const hasPhpEval = lowerSnippet.includes('eval(base64_decode(') || lowerSnippet.includes('eval(gzinflate(') || lowerSnippet.includes('assert(base64_decode(');
  const hasShellExecution = (lowerSnippet.includes('passthru(') || lowerSnippet.includes('shell_exec(') || lowerSnippet.includes('system(')) && lowerSnippet.includes('$_');
  const hasWebshellSig = lowerSnippet.includes('c99shell') || lowerSnippet.includes('r57shell') || lowerSnippet.includes('b374k') || lowerSnippet.includes('wso_version');

  if (hasPhpEval || hasShellExecution || hasWebshellSig) {
    ev.push('webshell-backdoor-payload');
    confidence = Math.max(confidence, 0.96);
  }

  // 7. Polyglot exploit inside images (e.g. <?php or <script inside JPG/PNG)
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
    if (lowerSnippet.includes('<?php') || lowerSnippet.includes('<script') || lowerSnippet.includes('javascript:')) {
      ev.push('image-polyglot-script-exploit');
      confidence = Math.max(confidence, 0.95);
    }
  }

  return confidence >= 0.7
    ? { kind: 'malware_upload', confidence: cap(confidence), evidence: ev, source }
    : null;
}

// ---------- Flood & Anti-DDoS / Token-Drain Protection ----------
const ipHits = new Map<string, number[]>();
const fpChatHits = new Map<string, number[]>();

export function detectFlood(source: string, max = 15, windowMs = 5000): Verdict | null {
  const now = Date.now();
  const arr = (ipHits.get(source) ?? []).filter((t) => now - t < windowMs);
  arr.push(now);
  ipHits.set(source, arr);

  if (ipHits.size > 10000) ipHits.clear();

  if (arr.length > max) {
    return {
      kind: 'rate_abuse',
      confidence: 0.92,
      evidence: [`http-flood-burst:>${max} req/${windowMs / 1000}s`],
      source,
    };
  }
  return null;
}

export function detectTokenDrain(source: string, max = 10, windowMs = 20000): Verdict | null {
  const now = Date.now();
  const arr = (fpChatHits.get(source) ?? []).filter((t) => now - t < windowMs);
  arr.push(now);
  fpChatHits.set(source, arr);

  if (fpChatHits.size > 10000) fpChatHits.clear();

  if (arr.length > max) {
    return {
      kind: 'rate_abuse',
      confidence: 0.95,
      evidence: [`token-drain-exhaustion-attempt:>${max} chat-req/${windowMs / 1000}s`],
      source,
    };
  }
  return null;
}

const botHits = new Map<string, number[]>();

export function detectBotSignatures(headers: Record<string, any>, source: string): Verdict | null {
  const ua = String(headers['user-agent'] || '').toLowerCase();

  // 1. Python requests, curl, headless scrapers - only flag if making repeated rapid requests (> 3 req / 5s)
  const isPythonRequests = ua.includes('python-requests') || ua.includes('aiohttp') || ua.includes('httpx') || ua.includes('urllib');
  const isRawCurl = ua.includes('curl/') || ua.includes('wget/') || ua.includes('go-http-client');

  if (isPythonRequests || isRawCurl) {
    const now = Date.now();
    const arr = (botHits.get(source) ?? []).filter((t) => now - t < 5000);
    arr.push(now);
    botHits.set(source, arr);

    if (arr.length > 3) {
      return {
        kind: 'rate_abuse',
        confidence: 0.92,
        evidence: [`automated-script-flood:${ua.slice(0, 30)}:>${arr.length}req/5s`],
        source,
      };
    }
  }

  // 2. Exact bare script spoofing (headers = {"User-Agent": "Mozilla/5.0"} with no other browser headers)
  // Only trigger if sent in a rapid flood
  if (ua === 'mozilla/5.0') {
    const hasSecChUa = Boolean(headers['sec-ch-ua'] || headers['sec-fetch-dest']);
    const hasAcceptLang = Boolean(headers['accept-language']);
    if (!hasSecChUa && !hasAcceptLang) {
      const now = Date.now();
      const arr = (botHits.get(source) ?? []).filter((t) => now - t < 5000);
      arr.push(now);
      botHits.set(source, arr);

      if (arr.length > 5) {
        return {
          kind: 'rate_abuse',
          confidence: 0.90,
          evidence: ['bare-mozilla-5.0-script-flood'],
          source,
        };
      }
    }
  }

  return null;
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
