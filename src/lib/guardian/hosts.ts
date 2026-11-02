import type { Rule } from "./types.ts";

/**
 * Parses hosts-formatted text (like StevenBlack or URLhaus) into Rule objects.
 */
export function parseHosts(
  text: string,
  category: Rule["category"],
  startId: number = 1
): Rule[] {
  const seen = new Set<string>();
  const rules: Rule[] = [];

  for (const raw of text.split("\n")) {
    const line = raw.split("#")[0].trim();
    if (!line) continue;
    const [ip, host] = line.split(/\s+/);
    if (!host || !["0.0.0.0", "127.0.0.1"].includes(ip)) continue;
    if (host === "localhost" || host === "broadcasthost" || seen.has(host)) continue;
    seen.add(host);
    rules.push({
      id: startId + rules.length,
      domain: host.toLowerCase(),
      category,
    });
  }

  return rules;
}
