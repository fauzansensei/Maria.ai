import fs from 'fs';
import path from 'path';
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

const PERSIST_PATH = path.join('/tmp', 'maria_defcon_store.json');

// In-Memory Thread-Safe High-Performance Store with TTL cleanup & /tmp persistence
class DefconStore {
  private blocklist = new Map<string, BlockEntry>();
  private events: SecurityEventRecord[] = [];
  private cumulativeBlocked = 0;
  private knownBadHashes = new Set<string>([
    // Example known malware sample hashes
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  ]);

  constructor() {
    this.loadFromDisk();
  }

  private loadFromDisk() {
    try {
      if (fs.existsSync(PERSIST_PATH)) {
        const raw = fs.readFileSync(PERSIST_PATH, 'utf-8');
        const parsed = JSON.parse(raw);
        const now = Date.now();
        if (Array.isArray(parsed.events)) {
          this.events = parsed.events.filter((e: SecurityEventRecord) => e && e.expiresAt > now).slice(0, 500);
        }
        if (typeof parsed.cumulativeBlocked === 'number' && parsed.cumulativeBlocked >= this.events.length) {
          this.cumulativeBlocked = parsed.cumulativeBlocked;
        } else {
          this.cumulativeBlocked = this.events.filter((e) => e.applied).length;
        }
      }
    } catch {
      // Ignore read errors on serverless / read-only envs
    }
  }

  private saveToDisk() {
    try {
      fs.writeFileSync(
        PERSIST_PATH,
        JSON.stringify({
          events: this.events.slice(0, 200),
          cumulativeBlocked: this.cumulativeBlocked,
        }),
        'utf-8'
      );
    } catch {
      // Ignore write errors
    }
  }

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

  // Get detailed block info including reason
  public async getBlockInfo(source: string): Promise<{ blocked: boolean; remainingSec: number; reason?: string }> {
    const entry = this.blocklist.get(source);
    if (!entry) return { blocked: false, remainingSec: 0 };
    const remainingMs = entry.expiresAt - Date.now();
    if (remainingMs <= 0) {
      this.blocklist.delete(source);
      return { blocked: false, remainingSec: 0 };
    }
    return {
      blocked: true,
      remainingSec: Math.ceil(remainingMs / 1000),
      reason: entry.reason,
    };
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

    if (applied) {
      this.cumulativeBlocked++;
    }

    this.events.unshift(record);

    // Keep memory clean (max 500 records)
    if (this.events.length > 500) {
      this.events = this.events.slice(0, 500);
    }

    this.saveToDisk();
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
  public getEvents(limit = 100): SecurityEventRecord[] {
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

    let eventBlocked = 0;

    for (const ev of this.events) {
      if (counts[ev.kind] !== undefined) {
        counts[ev.kind]++;
      }
      if (ev.applied) {
        eventBlocked++;
      }
    }

    return {
      totalBlocked: Math.max(this.cumulativeBlocked, eventBlocked),
      byKind: counts,
      activeBlocksCount: this.blocklist.size,
    };
  }

  public clearAll() {
    this.events = [];
    this.cumulativeBlocked = 0;
    this.blocklist.clear();
    this.saveToDisk();
  }
}

export const defconStore = new DefconStore();

export const blockTemp = (source: string, ttlSec: number, reason: string) =>
  defconStore.blockTemp(source, ttlSec, reason);

export const blockedFor = (source: string) => defconStore.blockedFor(source);
export const getBlockInfo = (source: string) => defconStore.getBlockInfo(source);

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
