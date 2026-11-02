import type { BlockEvent, Stats, ThreatCategory } from "./types.ts";

export const emptyStats = (): Stats => ({
  total: 0,
  byDay: {},
  byCategory: {
    ads: 0,
    tracker: 0,
    malware: 0,
    phishing: 0,
    xss: 0,
    ddos: 0,
    prompt_injection: 0,
  },
});

export function record(stats: Stats, ev: BlockEvent): Stats {
  const day = new Date(ev.ts).toISOString().slice(0, 10);
  const cat = (ev.category in stats.byCategory ? ev.category : "ads") as ThreatCategory;
  
  return {
    total: stats.total + 1,
    byDay: {
      ...stats.byDay,
      [day]: (stats.byDay[day] ?? 0) + 1,
    },
    byCategory: {
      ...stats.byCategory,
      [cat]: (stats.byCategory[cat] ?? 0) + 1,
    },
  };
}
