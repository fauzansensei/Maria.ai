export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  image?: {
    mimeType: string;
    data: string; // base64 for AI processing
    url?: string; // preview URL for rendering
  };
  images?: {
    mimeType: string;
    data: string;
    url?: string;
  }[];
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
  isPinned?: boolean;
  isFavorite?: boolean;
}

export interface SearchResult {
  id: string;
  title: string;
  snippet: string;
  url?: string;
  source?: string;
}

export interface UserNotification {
  id: string;
  type: 'keyword' | 'reminder' | 'system';
  title: string;
  content: string;
  timestamp: number;
  isRead: boolean;
  metadata?: any;
}

export interface ReminderSetting {
  id: string;
  title: string;
  dateTime: string;
  isCompleted: boolean;
}

export interface KeywordSetting {
  id: string;
  keyword: string;
  isEnabled: boolean;
}

export interface AppSettings {
  language: string;
}

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'id', name: 'Bahasa Indonesia' },
  { code: 'jv', name: 'Jawa' },
  { code: 'su', name: 'Sunda' },
  { code: 'mad', name: 'Madura' },
  { code: 'min', name: 'Minangkabau' },
  { code: 'bug', name: 'Bugis' },
  { code: 'pal', name: 'Palembang' },
  { code: 'ban', name: 'Banjar' },
  { code: 'ace', name: 'Aceh' },
  { code: 'bal', name: 'Bali' },
  { code: 'bet', name: 'Betawi' },
  { code: 'mak', name: 'Makassar' },
  { code: 'btk-t', name: 'Batak Toba' },
  { code: 'btk-k', name: 'Batak Karo' },
  { code: 'btk-s', name: 'Batak Simalungun' },
  { code: 'btk-m', name: 'Batak Mandailing' },
  { code: 'lam', name: 'Lampung' },
  { code: 'sas', name: 'Sasak' },
  { code: 'dyk', name: 'Dayak' },
  { code: 'bim', name: 'Bima' },
  { code: 'mng', name: 'Manggarai' },
  { code: 'trj', name: 'Toraja' },
  { code: 'gor', name: 'Gorontalo' }
];
