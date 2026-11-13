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

const globalFloodWindow: number[] = [];
const bareUaHits: number[] = [];

/**
 * Extract client IP Address with anti-spoofing priority
 */
export function getSpyGuardIp(req: Request | any): string {
  const cfIp = req.headers?.['cf-connecting-ip'];
  if (cfIp && typeof cfIp === 'string' && cfIp.trim()) return cfIp.trim();

  const vercelIp = req.headers?.['x-vercel-forwarded-for'];
  if (vercelIp && typeof vercelIp === 'string' && vercelIp.trim()) {
    const parts = vercelIp.split(',').map((s: string) => s.trim()).filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1];
  }

  const realIp = req.headers?.['x-real-ip'];
  if (realIp && typeof realIp === 'string' && realIp.trim()) {
    return realIp.trim();
  }

  const socketIp = req.socket?.remoteAddress?.replace(/^::ffff:/, '').trim();
  if (socketIp && socketIp !== '127.0.0.1' && socketIp !== '::1') {
    return socketIp;
  }

  const forwardedFor = req.headers?.['x-forwarded-for'];
  if (forwardedFor && typeof forwardedFor === 'string') {
    const list = forwardedFor.split(',').map((s: string) => s.trim()).filter(Boolean);
    if (list.length > 0) return list[list.length - 1];
  }
  if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
    return forwardedFor[forwardedFor.length - 1].trim();
  }

  return socketIp || 'unknown-ip';
}

/**
 * Spy Guard Gatekeeper Middleware for Express & Vite
 */
export function spyGuardMiddleware(req: Request, res: Response, next: NextFunction) {
  const url = req.originalUrl || req.url || '';
  const pathname = url.split('?')[0];

  // Skip static bundle files (JS, CSS, fonts, images, media)
  const isStaticAsset =
    pathname.startsWith('/assets/') ||
    pathname.startsWith('/@') ||
    pathname.startsWith('/src/') ||
    pathname.startsWith('/node_modules/') ||
    /\.(js|mjs|css|map|png|jpe?g|gif|svg|webp|ico|woff2?|ttf|eot|mp4|webm|mp3|wav)$/i.test(pathname);

  if (isStaticAsset && req.method === 'GET') {
    return next();
  }

  // Bypass polling, health & self-management endpoints
  if (
    pathname === '/api/health' ||
    pathname === '/api/waf/summary' ||
    pathname === '/api/waf/clear-bans' ||
    pathname === '/api/waf/whitelist-self' ||
    pathname === '/api/defcon' ||
    pathname === '/api/spyguard/status'
  ) {
    return next();
  }

  const ip = getSpyGuardIp(req);
  const now = Date.now();
  const userAgent = String(req.headers?.['user-agent'] || '');
  const uaLower = userAgent.toLowerCase().trim();

  // ==========================================
  // A0. DETEKSI BOT / SPOOFED BARE MOZILLA/5.0 & FLOOD GLOBAL (Anti XFF Spoofing)
  // ==========================================
  const isBareMozilla = uaLower === 'mozilla/5.0';

  if (isBareMozilla) {
    while (bareUaHits.length > 0 && now - bareUaHits[0] > 10000) bareUaHits.shift();
    bareUaHits.push(now);
    if (bareUaHits.length >= 2) {
      defconStore.logEvent(
        {
          kind: 'rate_abuse',
          confidence: 0.97,
          evidence: [`spoofed-bot-ua:${userAgent}`, `burst:${bareUaHits.length}req/10s`],
          source: ip,
        },
        'block_temp',
        true,
        'enforce',
        'DDoS Bot (Spoofed Mozilla/5.0) Blocked by Spy Guard'
      );
      defconStore.blockTemp(ip, 300, 'spoofed_mozilla_bot');
      res.setHeader('Retry-After', '60');
      return sendSpyGuardJson(res, 429, {
        error: 'Permintaan bot otomatis (DDoS/Spoofed Header) diblokir oleh Spy Guard.',
      });
    }
  }

  // Track global flood bursts in 5s window to defeat rotating X-Forwarded-For spoofing
  while (globalFloodWindow.length > 0 && now - globalFloodWindow[0] > 5000) globalFloodWindow.shift();
  globalFloodWindow.push(now);
  if (globalFloodWindow.length > 45) {
    defconStore.logEvent(
      {
        kind: 'rate_abuse',
        confidence: 0.99,
        evidence: [`distributed_ddos_burst:${globalFloodWindow.length}req/5s`],
        source: ip,
      },
      'block_temp',
      true,
      'enforce',
      'Distributed HTTP Flood Blocked by Spy Guard'
    );
    defconStore.blockTemp(ip, 300, 'distributed_ddos_burst');
    res.setHeader('Retry-After', '60');
    return sendSpyGuardJson(res, 429, {
      error: 'Lonjakan DDoS terdeteksi. Akses diblokir sementara oleh Spy Guard.',
    });
  }

  // ==========================================
  // A. CEK RATE LIMIT PER IP (Deteksi Skrip DDoS)
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

  // Periodic memory pruning to avoid leak
  if (ipRequests.size > 2000) {
    for (const [key, val] of ipRequests.entries()) {
      if (now - val.lastReset > 300000) {
        ipRequests.delete(key);
      }
    }
  }

  // Cek juga body request (Hanya periksa teks pesan pengguna, bukan data biner base64 video/audio)
  if (req.body && (req.method === 'POST' || req.method === 'PUT')) {
    try {
      const isChatEndpoint = pathname.includes('/chat') || pathname.includes('/tts');

      let textToCheck = '';
      if (typeof req.body === 'string') {
        textToCheck = req.body;
      } else if (req.body && typeof req.body === 'object') {
        if (typeof req.body.message === 'string') {
          textToCheck = req.body.message;
        } else if (Array.isArray(req.body.messages)) {
          const lastUserMsg = [...req.body.messages].reverse().find((m: any) => m && m.role === 'user');
          textToCheck = typeof lastUserMsg?.content === 'string' ? lastUserMsg.content : '';
        } else if (typeof req.body.prompt === 'string') {
          textToCheck = req.body.prompt;
        } else if (typeof req.body.text === 'string') {
          textToCheck = req.body.text;
        }
      }

      if (textToCheck) {
        // Pada pesan chat, hanya tangkal prompt injection nyata (jangan blokir kode pemrograman atau lampiran berkas)
        const patternsToCheck = isChatEndpoint
          ? [/ignore\s+(all\s+)?previous\s+instructions/i]
          : BAD_PATTERNS;

        for (const pattern of patternsToCheck) {
          if (pattern.test(textToCheck)) {
            console.warn(`🚨 [BOT GUARD] Pola berbahaya terdeteksi di teks prompt dari IP: ${ip} [${pattern}]`);
            defconStore.logEvent(
              {
                kind: 'prompt_injection',
                confidence: 0.98,
                evidence: [`bad_pattern_prompt:${pattern.toString()}`],
                source: ip,
              },
              'block_temp',
              true,
              'enforce',
              'Injection Payload Intercepted'
            );
            defconStore.blockTemp(ip, 300, 'bad_pattern_prompt');

            return sendSpyGuardJson(res, 403, {
              error: 'Ancaman terdeteksi. Akses ditolak.',
            });
          }
        }
      }
    } catch {}
  }

  // Kalau aman, persilakan masuk ke Maria AI (Gemini)
  next();
}
