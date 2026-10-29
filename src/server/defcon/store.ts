import type { Verdict, ThreatKind } from './types.ts';

export interface SecurityEventRecord extends Verdict {
  id: string;
  action: string;
  applied: boolean;
  mode: string;
  reason: string | null;
  at: number; // timestamp in ms
  expiresAt: number;
}

interface BlockEntry {
  source: string;
  reason: string;
  expiresAt: number; // timestamp in ms
}

// In-Memory Thread-Safe High-Performance Store with TTL cleanup
class DefconStore {
  private blocklist = new Map<string, BlockEntry>();
  private events: SecurityEventRecord[] = [];
  private knownBadHashes = new Set<string>([
    // Example known malware sample hashes
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  ]);

  // Block temporary
  public async blockTemp(source: string, ttlSec: number, reason: string): Promise<void> {
    const expiresAt = Date.now() + ttlSec * 1000;
    this.blocklist.set(source, {
      source,
      reason,
      expiresAt,
    });
  }

  // Check if source is blocked, returns remaining seconds
  public async blockedFor(source: string): Promise<number> {
    const entry = this.blocklist.get(source);
    if (!entry) return 0;
    const remainingMs = entry.expiresAt - Date.now();
    if (remainingMs <= 0) {
      this.blocklist.delete(source);
      return 0;
    }
    return Math.ceil(remainingMs / 1000);
  }

  // Log a security event
  public async logEvent(
    v: Verdict,
    action: string,
    applied: boolean,
    mode: string,
    reason?: string
  ): Promise<void> {
    const now = Date.now();
    const record: SecurityEventRecord = {
      ...v,
      id: `sec_${now}_${Math.random().toString(36).slice(2, 7)}`,
      action,
      applied,
      mode,
      reason: reason ?? null,
      at: now,
      expiresAt: now + 7 * 864e5, // 7 days retention
    };

    this.events.unshift(record);

    // Keep memory clean (max 500 records)
    if (this.events.length > 500) {
      this.events = this.events.slice(0, 500);
    }
  }

  // Serious recent offenses from the same source in the last 10 minutes
  public async recentOffenses(source: string): Promise<number> {
    const tenMinAgo = Date.now() - 600_000;
    return this.events.filter(
      (e) => e.source === source && e.at > tenMinAgo && e.confidence >= 0.7
    ).length;
  }

  // Global score for DEFCON level calculation in the last 10 minutes
  public async recentScore(): Promise<number> {
    const tenMinAgo = Date.now() - 600_000;
    return this.events
      .filter((e) => e.at > tenMinAgo)
      .reduce((sum, e) => sum + e.confidence * 3, 0);
  }

  public async isKnownBadHash(hash: string): Promise<boolean> {
    return this.knownBadHashes.has(hash.toLowerCase());
  }

  // Queries for UI / endpoint
  public getEvents(limit = 50): SecurityEventRecord[] {
    return this.events.slice(0, limit);
  }

  public getStats() {
    const counts: Record<ThreatKind, number> = {
      prompt_injection: 0,
      xss: 0,
      malicious_url: 0,
      malware_upload: 0,
      rate_abuse: 0,
      secret_leak: 0,
    };

    let totalBlocked = 0;

    for (const ev of this.events) {
      if (counts[ev.kind] !== undefined) {
        counts[ev.kind]++;
      }
      if (ev.applied) {
        totalBlocked++;
      }
    }

    return {
      totalBlocked,
      byKind: counts,
      activeBlocksCount: this.blocklist.size,
    };
  }

  public clearAll() {
    this.events = [];
    this.blocklist.clear();
  }
}

export const defconStore = new DefconStore();

export const blockTemp = (source: string, ttlSec: number, reason: string) =>
  defconStore.blockTemp(source, ttlSec, reason);

export const blockedFor = (source: string) => defconStore.blockedFor(source);

export const logEvent = (
  v: Verdict,
  action: string,
  applied: boolean,
  mode: string,
  reason?: string
) => defconStore.logEvent(v, action, applied, mode, reason);

export const recentOffenses = (source: string) => defconStore.recentOffenses(source);

export const recentScore = () => defconStore.recentScore();

export const isKnownBadHash = (hash: string) => defconStore.isKnownBadHash(hash);
