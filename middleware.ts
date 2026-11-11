import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ==========================================
// 1. KAMUS SKRIP BERBAHAYA (Anti Injection & DDoS Script)
// ==========================================
const BAD_PATTERNS = [
  /import\s+requests/i,                         // Skrip DDoS Python
  /while\s+true\s*:/i,                          // Looping tanpa henti (DDoS)
  /<script>/i,                                  // XSS (Cross Site Scripting)
  /union\s+select/i,                            // SQL Injection
  /ignore\s+(all\s+)?previous\s+instructions/i, // Prompt Injection (Nge-hack AI)
  /eval\(/i,                                    // Eksekusi kode ilegal
  /base64_decode/i,
  /curl\s+-X\s+POST/i,
  /system\s*\(/i,                               // Command injection
  /exec\s*\(/i                                  // Eksekusi script
];

// ==========================================
// 2. MEMORI SEMENTARA UNTUK RATE LIMITING (Anti DDoS)
// ==========================================
// Menyimpan data IP: { jumlah_request, waktu_reset_terakhir }
const ipRequests = new Map<string, { count: number, lastReset: number }>();
const MAX_REQ_PER_MINUTE = 30; // Batas wajar untuk chat AI (30 chat per menit per IP)

export function middleware(req: NextRequest) {
  // Ambil IP Address (Vercel selalu menyediakan ini di header)
  // Prioritas: x-forwarded-for -> x-real-ip -> fallback
  const forwardedFor = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : (realIp || 'unknown-ip');
  
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
    console.warn(`🚨 [BOT GUARD] DDoS Terdeteksi dari IP: ${ip}`);
    return new NextResponse(
      JSON.stringify({ error: "Terlalu banyak permintaan. Akses diblokir sementara." }),
      { status: 429, headers: { 'content-type': 'application/json' } }
    );
  }

  // ==========================================
  // B. CEK TEKS BERBAHAYA (Deteksi Skrip Asing / Injection)
  // ==========================================
  const userAgent = req.headers.get('user-agent') || '';
  const url = req.nextUrl.pathname;
  
  // Gabungkan URL dan User-Agent untuk dicek pakai Regex
  const targetString = `${url} ${userAgent}`;

  for (const pattern of BAD_PATTERNS) {
    if (pattern.test(targetString)) {
      console.warn(`🚨 [BOT GUARD] Pola berbahaya terdeteksi dari IP: ${ip}`);
      return new NextResponse(
        JSON.stringify({ error: "Ancaman terdeteksi. Akses ditolak." }),
        { status: 403, headers: { 'content-type': 'application/json' } }
      );
    }
  }

  // Cek juga query parameter (jika ada payload di URL)
  const searchParams = req.nextUrl.searchParams;
  for (const [, value] of searchParams.entries()) {
    for (const pattern of BAD_PATTERNS) {
      if (pattern.test(value)) {
        console.warn(`🚨 [BOT GUARD] Pola berbahaya di query dari IP: ${ip}`);
        return new NextResponse(
          JSON.stringify({ error: "Ancaman terdeteksi. Akses ditolak." }),
          { status: 403, headers: { 'content-type': 'application/json' } }
        );
      }
    }
  }

  // Kalau aman, persilakan masuk ke Maria AI (Gemini)
  return NextResponse.next();
}

// ==========================================
// 3. TENTUKAN RUTE MANA YANG DIPANTAU
// ==========================================
export const config = {
  // Pantau semua rute API (biasanya /api/chat atau /api/generate)
  matcher: '/api/:path*', 
};
