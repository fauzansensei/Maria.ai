import type { ActionName, Defcon, ThreatKind, Verdict } from './types.ts';

const ALLOWED_KINDS = new Set<ThreatKind>([
  'prompt_injection',
  'xss',
  'malicious_url',
  'malware_upload',
  'rate_abuse',
  'secret_leak',
]);

export const TTL_SEC: Record<Exclude<ActionName, 'log' | 'reject_request'>, number> = {
  rate_limit: 30, // cooldown singkat (30s)
  block_temp: 3600, // 1 jam, selalu kedaluwarsa
};

// Tangga eskalasi: kesalahan terburuk = satu request ditolak, bukan user terblokir
export function pickAction(v: Verdict, offenses: number, verified: boolean): ActionName {
  if (v.kind === 'rate_abuse') return v.confidence >= 0.8 ? 'rate_limit' : 'log';
  if (v.confidence >= 0.9 && offenses >= 2 && !verified) return 'block_temp'; // harus berulang
  if (v.confidence >= 0.7) return 'reject_request';
  return 'log';
}

export type Auth = { allowed: true; ttlSec?: number } | { allowed: false; reason: string };

// Penjaga di kode. Bukan LLM, jadi tidak bisa dibujuk lewat prompt.
export function authorize(v: Verdict, action: ActionName, target: string, verified: boolean): Auth {
  if (!ALLOWED_KINDS.has(v.kind)) return { allowed: false, reason: 'bukan kategori ancaman' };
  if (v.evidence.length === 0) return { allowed: false, reason: 'tanpa bukti' };
  if (!target || target === 'unknown') return { allowed: false, reason: 'target tidak jelas' };
  if (target !== v.source) return { allowed: false, reason: 'target bukan sumber serangan' };
  if (action === 'block_temp' && verified) return { allowed: false, reason: 'user terverifikasi' };
  if (action === 'block_temp' && v.confidence < 0.9) return { allowed: false, reason: 'confidence rendah' };
  if (action === 'block_temp' || action === 'rate_limit') return { allowed: true, ttlSec: TTL_SEC[action] };
  return { allowed: true };
}

export function levelFromScore(score: number): Defcon {
  if (score >= 40) return 1;
  if (score >= 25) return 2;
  if (score >= 12) return 3;
  if (score >= 5) return 4;
  return 5;
}
