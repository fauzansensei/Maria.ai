export type MariaTone = "Professional" | "Warm" | "Creative" | "Technical" | "Minimalist";
export type LanguageStyle = "Baku" | "Santai";
export type AppTheme = "classic-blue" | "emerald-green" | "cosmic-purple" | "minimal-dark";

export interface NotificationPreferences {
  soundEnabled: boolean;
  statusUpdates: boolean;
  remindersEnabled: boolean;
}

export interface WidgetLayout {
  id: string;
  name: string;
  visible: boolean;
  order: number;
}

export interface UserSettings {
  username: string;
  tone: MariaTone;
  languageStyle: LanguageStyle;
  customPrompt: string;
  theme: AppTheme;
  widgets: WidgetLayout[];
  notifications: NotificationPreferences;
  elevenlabsApiKey?: string;
  elevenlabsVoiceId?: string;
  elevenlabsVoiceModel?: string;
  elevenlabsCustomVoiceId?: string;
  voiceEnabled?: boolean;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  isError?: boolean;
  image?: string;
  audio?: string;
  feedback?: "like" | "dislike";
  isEdited?: boolean;
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
}

