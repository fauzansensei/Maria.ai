import type { Rule } from "./types.ts";

/**
 * DomainMatcher: Cocokkan hostname beserta semua parent domain-nya (e.g. ad.track.google.com -> track.google.com -> google.com).
 */
export class DomainMatcher {
  private map = new Map<string, Rule>();

  constructor(rules: Rule[]) {
    this.addRules(rules);
  }

  public addRules(rules: Rule[]): void {
    for (const r of rules) {
      this.map.set(r.domain.toLowerCase(), r);
    }
  }

  public getRuleCount(): number {
    return this.map.size;
  }

  public hasDomain(domain: string): boolean {
    return this.map.has(domain.toLowerCase());
  }

  /**
   * Cocokkan hostname beserta parent domain
   */
  public match(hostname: string): Rule | undefined {
    if (!hostname) return undefined;
    
    // Normalize hostname (strip port if any, lowercase)
    const clean = hostname.replace(/:\d+$/, "").toLowerCase();
    
    // Direct match
    const directHit = this.map.get(clean);
    if (directHit) return directHit;

    // Subdomain matching
    const parts = clean.split(".");
    for (let i = 0; i < parts.length - 1; i++) {
      const parent = parts.slice(i).join(".");
      const hit = this.map.get(parent);
      if (hit) return hit;
    }

    return undefined;
  }
}
