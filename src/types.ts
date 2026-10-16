export type MariaTone = "Professional" | "Friendly" | "Casual" | "Academic" | "Creative" | "Warm" | "Technical" | "Minimalist";
export type LanguageStyle = "Baku" | "Gaul" | "Puitis" | "Teknis" | "Santai";
export type AppTheme = "emerald-green" | "cosmic-purple" | "minimal-dark" | "gold-luxe" | "rose-crimson" | "cyber-cyan" | "classic-blue" | string;

export interface NotificationPreferences {
  soundEnabled: boolean;
  statusUpdates: boolean;
  remindersEnabled: boolean;
  inAppNotifications?: boolean;
}

export interface WidgetLayout {
  id: string;
  name: string;
  visible: boolean;
  order: number;
}

export type DefconLevel = "DEFCON 5" | "DEFCON 4" | "DEFCON 3" | "DEFCON 2" | "DEFCON 1";

export type VoicePersonaGender =
  | 'wanita'
  | 'pria'
  | 'anak-perempuan'
  | 'anak-laki'
  | 'remaja-perempuan'
  | 'remaja-laki';

export interface UserSettings {
  username: string;
  tone: MariaTone;
  languageStyle: LanguageStyle;
  regionalLanguage?: string;
  customPrompt: string;
  theme: AppTheme;
  darkMode?: boolean;
  fontSize?: "kecil" | "normal" | "besar";
  interfaceAnimations?: boolean;
  dataCollection?: boolean;
  firebaseSync?: boolean;
  language?: "Indonesia" | "English";
  voiceResponses?: boolean;
  speechSpeed?: "0.75x" | "1x" | "1.25x" | "1.5x";
  voiceEngine?: "gemini" | "browser";
  geminiVoice?: "Kore" | "Aoede" | "Puck" | "Fenrir" | "Zephyr";
  voicePersona?: VoicePersonaGender;
  saveChatHistory?: boolean;
  enterToSend?: boolean;
  windowsOpen?: boolean;
  memoryEnabled?: boolean;
  autoMemoryExtraction?: boolean;
  userBio?: string;
  responsePreferences?: string;
  widgets?: WidgetLayout[];
  notifications?: NotificationPreferences;
  elevenlabsApiKey?: string;
  elevenlabsVoiceId?: string;
  elevenlabsVoiceModel?: string;
  elevenlabsCustomVoiceId?: string;
  voiceEnabled?: boolean;
  safeSearchMode?: "filter" | "blur" | "off";
  twoFactorEnabled?: boolean;
  securityPin?: string;
  sessionLockEnabled?: boolean;
  backupCodes?: string[];
  lastSecurityCheck?: string;
  cyberModeEnabled?: boolean;
  defconLevel?: DefconLevel;
  autonomousSelfHealing?: boolean;
  wafStrictness?: "low" | "medium" | "high" | "paranoid";
  autoCountermeasures?: boolean;
  dlpEnabled?: boolean;
  edrTelemetry?: boolean;
  vpnTunnelActive?: boolean;
  soarAutoLock?: boolean;
  deepSearch?: boolean;
}

export type CyberLogLevel = "INFO" | "WARN" | "CRITICAL" | "BLOCKED";

export interface CyberLogEntry {
  id: string;
  timestamp: string;
  level: CyberLogLevel;
  category: "WAF" | "IDS/IPS" | "EDR" | "DLP" | "IAM" | "SIEM" | "VULN" | "SOAR";
  message: string;
  sourceIp: string;
  mitigation: string;
}

export interface CyberVulnFinding {
  id: string;
  title: string;
  category: string;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  remediation: string;
  status: "open" | "patched" | "mitigated";
}

export interface MessageFile {
  name: string;
  mimeType: string;
  dataUrl: string;
  size?: number;
  type?: 'image' | 'video' | 'audio' | 'document';
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  isError?: boolean;
  errorCode?: string;
  errorTitle?: string;
  image?: string;
  images?: string[];
  video?: string;
  videos?: string[];
  audio?: string;
  files?: MessageFile[];
  generatedImage?: {
    url: string;
    prompt: string;
    aspectRatio?: string;
  };
  feedback?: "like" | "dislike" | null;
  isEdited?: boolean;
  groundingMetadata?: any;
  responseType?: "informational" | "conversational";
}

export interface PromptStarter {
  id: string;
  title: string;
  desc: string;
  text: string;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  type: "info" | "success" | "reminder" | "message";
  timestamp: string;
  read: boolean;
}

export interface ChatThread {
  id: string;
  title: string;
  messages: Message[];
  isPinned?: boolean;
  updatedAt?: string;
  userId?: string;
}

export interface UserMemory {
  id: string;
  text: string;
  category: "personal" | "preferences" | "work" | "goals" | "other";
  timestamp: string;
  confidence?: number;
  source?: "manual" | "auto";
}
