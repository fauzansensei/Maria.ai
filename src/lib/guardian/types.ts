// Guardian Core Types - Integrated with Maria DEFCON 5
export type ResourceType = "script" | "image" | "xhr" | "sub_frame" | "main_frame";

export type ThreatCategory = "ads" | "tracker" | "malware" | "phishing" | "xss" | "ddos" | "prompt_injection";

export interface Rule {
  id: number;
  domain: string;
  category: "ads" | "tracker" | "malware" | "phishing";
}

export interface BlockEvent {
  id?: string;
  ts: number;
  time?: string;
  url: string;
  tabDomain: string;
  ruleId: number;
  category: ThreatCategory;
  severity?: "CRITICAL" | "HIGH" | "MEDIUM";
  title?: string;
  detail?: string;
}

export interface Stats {
  total: number;
  byDay: Record<string, number>;
  byCategory: Record<ThreatCategory, number>;
}

export interface PlatformAdapter {
  getCurrentDomain(): Promise<string>;
  isProtected(domain: string): Promise<boolean>;
  setProtected(domain: string, on: boolean): Promise<void>;
  getStats(): Promise<Stats>;
  getRecentEvents(limit: number): Promise<BlockEvent[]>;
  blockedOnCurrent(): Promise<number>;
}
