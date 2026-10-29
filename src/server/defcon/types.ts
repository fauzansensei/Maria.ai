export type ThreatKind =
  | 'prompt_injection'
  | 'xss'
  | 'malicious_url'
  | 'malware_upload'
  | 'rate_abuse'
  | 'secret_leak';

export type ActionName = 'log' | 'reject_request' | 'rate_limit' | 'block_temp';

export type Defcon = 1 | 2 | 3 | 4 | 5;

export type Mode = 'off' | 'shadow' | 'enforce';

export interface Verdict {
  kind: ThreatKind;
  confidence: number; // 0..1
  evidence: string[]; // label pola, BUKAN isi pesan user (privasi)
  source: string; // IP penyerang
}

// DEFCON_MODE=off      -> saklar darurat pemilik
// DEFCON_MODE=shadow   -> cuma catat
// DEFCON_MODE=enforce  -> aksi benar-benar dijalankan (default aktif permanen)
export const getMode = (): Mode => {
  const m = process.env.DEFCON_MODE;
  if (m === 'off' || m === 'shadow' || m === 'enforce') return m;
  return 'enforce';
};
