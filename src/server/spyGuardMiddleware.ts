/**
 * Maria Spy Guard - Bot Guard & Anti-Injection WAF Middleware
 * Implements:
 * 1. Kamus Skrip Berbahaya (Anti Injection & DDoS Script)
 * 2. Rate Limiting Memory (30 req/min Anti-DDoS)
 * 3. Inspection of URL, User-Agent, Query string, and Payload
 */

import type { Request, Response, NextFunction } from 'express';
import { defconStore } from './defcon/store.ts';

// ==========================================
// 1. KAMUS SKRIP BERBAHAYA (Anti Injection & DDoS Script)
// ==========================================
export const BAD_PATTERNS = [
  /import\s+requests/i,                         // Skrip DDoS Python
  /while\s+true\s*:/i,                          // Looping tanpa henti (DDoS)
  /<script>/i,                                  // XSS (Cross Site Scripting)
  /union\s+select/i,                            // SQL Injection
  /ignore\s+(all\s+)?previous\s+instructions/i, // Prompt Injection (Nge-hack AI)
  /eval\(/i,                                    // Eksekusi kode ilegal
  /base64_decode/i,
  /curl\s+-X\s+POST/i,
  /system\s*\(/i,                               // Command injection
  /exec\s*\(/i,                                 // Eksekusi script
];

// ==========================================
// 2. MEMORI SEMENTARA UNTUK RATE LIMITING (Anti DDoS)
// ==========================================
// Menyimpan data IP: { jumlah_request, waktu_reset_terakhir }
export const ipRequests = new Map<string, { count: number; lastReset: number }>();
export const MAX_REQ_PER_MINUTE = 30; // Batas wajar untuk chat AI (30 chat per menit per IP)

/**
 * Universal JSON response sender compatible with Express and raw Node HTTP responses
 */
function sendSpyGuardJson(res: any, statusCode: number, data: any) {
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    return res.status(statusCode).json(data);
  }
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

/**
 * Extract client IP Address
 * Prioritas: x-forwarded-for -> x-real-ip -> socket address
 */
export function getSpyGuardIp(req: Request | any): string {
  const forwardedFor = req.headers?.['x-forwarded-for'];
  const realIp = req.headers?.['x-real-ip'];
  const socketIp = req.socket?.remoteAddress;

  if (forwardedFor && typeof forwardedFor === 'string') {
    return forwardedFor.split(',')[0].trim();
  }
  if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
    return forwardedFor[0].trim();
  }
  if (realIp && typeof realIp === 'string') {
    return realIp.trim();
  }
  if (socketIp && typeof socketIp === 'string') {
    return socketIp.replace(/^::ffff:/, '').trim();
  }
  return 'unknown-ip';
}

/**
 * Spy Guard Gatekeeper Middleware for Express & Vite
 */
export function spyGuardMiddleware(req: Request, res: Response, next: NextFunction) {
  // Hanya pantau rute API (/api/*)
  const url = req.originalUrl || req.url || '';
  if (!url.startsWith('/api') && req.method === 'GET') {
    return next();
  }

  // Bypass if testing endpoint itself calls whitelist, clear-bans, or health
  if (
    url === '/api/health' ||
    url === '/api/waf/summary' ||
    url === '/api/waf/clear-bans' ||
    url === '/api/waf/whitelist-self' ||
    url === '/api/defcon' ||
    url === '/api/spyguard/status'
  ) {
    return next();
  }

  const ip = getSpyGuardIp(req);
  const now = Date.now();

  // ==========================================
  // A. CEK RATE LIMIT (Deteksi Skrip DDoS)
  // ==========================================
  const reqData = ipRequests.get(ip) || { count: 0, lastReset: now };

  // Reset hitungan kalau udah lewat 1 menit
  if (now - reqData.lastReset > 60000) {
    reqData.count = 0;
    reqData.lastReset = now;
  }

  reqData.count++;
  ipRequests.set(ip, reqData);

  // Kalau IP nembak lebih dari 30x per menit, tendang! (HTTP 429 Too Many Requests)
  if (reqData.count > MAX_REQ_PER_MINUTE) {
    console.warn(`🚨 [BOT GUARD] DDoS Terdeteksi dari IP: ${ip} (${reqData.count}/${MAX_REQ_PER_MINUTE} req/min)`);

    // Catat ke log pertahanan Spy Guard
    defconStore.logEvent(
      {
        kind: 'rate_abuse',
        confidence: 0.99,
        evidence: [`ddos_rate_limit_exceeded:${reqData.count}req/60s (max ${MAX_REQ_PER_MINUTE})`],
        source: ip,
      },
      'block_temp',
      true,
      'enforce',
      'DDoS Script Blocked by Spy Guard'
    );
    defconStore.blockTemp(ip, 300, 'ddos_rate_limit_exceeded');

    res.setHeader('Retry-After', '60');
    return sendSpyGuardJson(res, 429, {
      error: 'Terlalu banyak permintaan. Akses diblokir sementara.',
    });
  }

  // ==========================================
  // B. CEK TEKS BERBAHAYA (Deteksi Skrip Asing / Injection)
  // ==========================================
  const userAgent = String(req.headers?.['user-agent'] || '');
  const pathname = url.split('?')[0];

  // Gabungkan URL dan User-Agent untuk dicek pakai Regex
  const targetString = `${pathname} ${userAgent}`;

  for (const pattern of BAD_PATTERNS) {
    if (pattern.test(targetString)) {
      console.warn(`🚨 [BOT GUARD] Pola berbahaya terdeteksi di header/URL dari IP: ${ip} [${pattern}]`);
      defconStore.logEvent(
        {
          kind: 'prompt_injection',
          confidence: 0.98,
          evidence: [`bad_pattern_header_url:${pattern.toString()}`],
          source: ip,
        },
        'block_temp',
        true,
        'enforce',
        'Malicious Script / Bot Header Intercepted'
      );
      defconStore.blockTemp(ip, 300, 'bad_pattern_header_url');

      return sendSpyGuardJson(res, 403, {
        error: 'Ancaman terdeteksi. Akses ditolak.',
      });
    }
  }

  // Cek juga query parameter (jika ada payload di URL)
  if (req.query && typeof req.query === 'object') {
    for (const [key, value] of Object.entries(req.query)) {
      const valStr = typeof value === 'string' ? value : JSON.stringify(value);
      for (const pattern of BAD_PATTERNS) {
        if (pattern.test(valStr) || pattern.test(key)) {
          console.warn(`🚨 [BOT GUARD] Pola berbahaya di query dari IP: ${ip} [${pattern}]`);
          defconStore.logEvent(
            {
              kind: 'prompt_injection',
              confidence: 0.98,
              evidence: [`bad_pattern_query:${pattern.toString()}`],
              source: ip,
            },
            'block_temp',
            true,
            'enforce',
            'Injection Query Intercepted'
          );
          defconStore.blockTemp(ip, 300, 'bad_pattern_query');

          return sendSpyGuardJson(res, 403, {
            error: 'Ancaman terdeteksi. Akses ditolak.',
          });
        }
      }
    }
  }

  // Cek juga body request (chat prompt / JSON payloads)
  if (req.body && (req.method === 'POST' || req.method === 'PUT')) {
    try {
      const bodyStr = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      for (const pattern of BAD_PATTERNS) {
        if (pattern.test(bodyStr)) {
          console.warn(`🚨 [BOT GUARD] Pola berbahaya terdeteksi di body dari IP: ${ip} [${pattern}]`);
          defconStore.logEvent(
            {
              kind: 'prompt_injection',
              confidence: 0.98,
              evidence: [`bad_pattern_body:${pattern.toString()}`],
              source: ip,
            },
            'block_temp',
            true,
            'enforce',
            'Injection Payload Intercepted'
          );
          defconStore.blockTemp(ip, 300, 'bad_pattern_body');

          return sendSpyGuardJson(res, 403, {
            error: 'Ancaman terdeteksi. Akses ditolak.',
          });
        }
      }
    } catch {}
  }

  // Kalau aman, persilakan masuk ke Maria AI (Gemini)
  next();
}
