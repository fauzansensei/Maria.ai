import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Settings,
  Brain,
  Volume2,
  VolumeX,
  Loader2,
  Shield,
  Layers,
  User,
  Moon,
  Sun,
  Check,
  Sparkles,
  Download,
  Trash2,
  ExternalLink,
  Plus,
  Search,
  Bell,
  Lock,
  Info,
  Sliders,
  Database,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useTheme } from '../context/ThemeContext.tsx';
import { useLanguage } from '../context/LanguageContext.tsx';
import { UserSettings, UserMemory, Conversation } from '../types/index.ts';
import {
  DEFAULT_SETTINGS,
  TONE_OPTIONS,
  VOICE_PERSONAS,
  ACCENT_COLORS,
  MARIA_PLUGINS,
} from '../constants.ts';
import { speechService, SpeechState } from '../lib/speechService.ts';
import { userMemoryService } from '../lib/userMemoryService.ts';
import { updateUserProfile } from '../lib/firestoreService.ts';

interface SettingsDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  onClearHistoryRequest: () => void;
  settings?: UserSettings;
  onUpdateSettings?: (patch: Partial<UserSettings>) => void;
  onOpenPlusModal?: () => void;
  onOpenPluginsDirectory?: () => void;
  conversations?: Conversation[];
}

type TabType =
  | 'general'
  | 'ai'
  | 'memory'
  | 'connectors'
  | 'security'
  | 'notifications'
  | 'voice'
  | 'privacy'
  | 'account'
  | 'about';

interface SettingSearchItem {
  id: string;
  title: string;
  description: string;
  tab: TabType;
  tabLabel: string;
  keywords: string;
}

const getSearchIndex = (isEn: boolean): SettingSearchItem[] => [
  { id: 'nickname', title: isEn ? 'User Display Name' : 'Nama Panggilan Pengguna', description: isEn ? 'Your personal greeting name' : 'Nama sapaan pribadi Anda', tab: 'general', tabLabel: 'General', keywords: 'nama name nickname user profil' },
  { id: 'appearance', title: isEn ? 'Theme Mode (System / Dark / Light)' : 'Mode Tampilan (Sistem / Gelap / Terang)', description: isEn ? 'Set interface theme preference' : 'Pilih tema antarmuka Maria AI', tab: 'general', tabLabel: 'General', keywords: 'theme dark light system oled mode gelap terang' },
  { id: 'accent', title: isEn ? 'Accent Color' : 'Warna Aksen', description: isEn ? 'Choose highlight accent color' : 'Pilih warna aksen antarmuka Maria', tab: 'general', tabLabel: 'General', keywords: 'warna accent color biru cyan emerald violet amber rose' },
  { id: 'language', title: isEn ? 'Interface Language' : 'Bahasa Antarmuka', description: isEn ? 'Indonesian or English (US)' : 'Bahasa Indonesia atau English', tab: 'general', tabLabel: 'General', keywords: 'language bahasa interface indonesia english' },
  { id: 'fast-answers', title: isEn ? 'Fast Answers' : 'Jawaban Cepat', description: isEn ? 'Concise low-latency responses' : 'Prioritaskan jawaban lebih ringkas', tab: 'general', tabLabel: 'General', keywords: 'fast answers cepat' },
  { id: 'web-search', title: isEn ? 'Automatic Web Search' : 'Pencarian Web Otomatis', description: isEn ? 'Enable live Google Search by default' : 'Aktifkan penelusuran Google otomatis', tab: 'general', tabLabel: 'General', keywords: 'web search pencarian google' },
  { id: 'homepage-suggestions', title: isEn ? 'Home Topic Suggestions' : 'Saran Topik Beranda', description: isEn ? 'Starter prompts on empty chat screen' : 'Kartu ide cepat di halaman awal', tab: 'general', tabLabel: 'General', keywords: 'saran homepage suggestions beranda' },
  { id: 'tone', title: isEn ? 'Response Style' : 'Gaya Respon', description: isEn ? 'Professional, Warm, Creative, Technical, Minimalist' : 'Profesional, Ramah, Kreatif, Teknis, Minimalis', tab: 'ai', tabLabel: 'AI Behavior', keywords: 'tone gaya respon persona' },
  { id: 'language-style', title: isEn ? 'Language Style' : 'Gaya Bahasa & Sapaan', description: isEn ? 'Formal, Casual, Slang, Poetic, Technical' : 'Baku, Santai, Gaul, Puitis, Teknis', tab: 'ai', tabLabel: 'AI Behavior', keywords: 'gaya bahasa baku santai gaul puitis teknis' },
  { id: 'traits', title: isEn ? 'Personality Traits' : 'Sifat Kepribadian Respon', description: isEn ? 'Warmth, Enthusiasm, Structured formatting' : 'Kehangatan, Antusiasme, Terstruktur', tab: 'ai', tabLabel: 'AI Behavior', keywords: 'traits kepribadian warmth enthusiasm structured' },
  { id: 'custom-prompt', title: isEn ? 'Custom Instructions' : 'Instruksi Kustom (Custom Prompt)', description: isEn ? 'Custom rules & personality prompt' : 'Aturan dan kepribadian khusus Maria', tab: 'ai', tabLabel: 'AI Behavior', keywords: 'custom prompt instruksi khusus' },
  { id: 'enter-send', title: isEn ? 'Enter to Send' : 'Tekan Enter untuk Mengirim', description: isEn ? 'Shift + Enter for new line' : 'Shift + Enter untuk baris baru', tab: 'ai', tabLabel: 'AI Behavior', keywords: 'enter send kirim chat' },
  { id: 'memory-auto', title: isEn ? 'Automatic Context Memory' : 'Memori Konteks Otomatis', description: isEn ? 'Remember preferences across chats' : 'Ingat preferensi lintas percakapan', tab: 'memory', tabLabel: 'Memory', keywords: 'memory memori otomatis konteks' },
  { id: 'memory-notes', title: isEn ? 'Saved Personal Memories' : 'Catatan Memori Personal', description: isEn ? 'Add, inspect, or remove saved facts' : 'Kelola fakta dan catatan pribadi tersimpan', tab: 'memory', tabLabel: 'Memory', keywords: 'memory notes fakta catatan ringkasan' },
  { id: 'plugins', title: isEn ? 'Plugins & Connectors' : 'Plugins & Konektor Maria', description: isEn ? 'Search, Maps, Image Studio, Science Scout' : 'Search, Maps, Studio Gambar, Science Scout', tab: 'connectors', tabLabel: 'Connectors', keywords: 'plugins konektor integrations search maps' },
  { id: 'safety', title: isEn ? 'DLP & Content Safety' : 'Keamanan Konten & DLP Shield', description: isEn ? 'Mask credentials & reduce sensitive content' : 'Samarkan token sensitif & saring konten', tab: 'security', tabLabel: 'Security', keywords: 'dlp safety filter sensitif security' },
  { id: 'security-pin', title: isEn ? '2FA Security PIN & Session Lock' : 'PIN Keamanan 2FA & Kunci Sesi', description: isEn ? '6-digit PIN for destructive actions' : 'PIN 6-digit untuk tindakan sensitif', tab: 'security', tabLabel: 'Security', keywords: 'pin 2fa password lock keamanan' },
  { id: 'notifications', title: isEn ? 'Notification Preferences' : 'Preferensi Notifikasi', description: isEn ? 'Status, reminders, sound & in-app alerts' : 'Status chat, pengingat, suara & notifikasi', tab: 'notifications', tabLabel: 'Notifications', keywords: 'notifications notifikasi pengingat sound' },
  { id: 'voice-auto', title: isEn ? 'Voice Responses (TTS)' : 'Respon Suara Otomatis (TTS)', description: isEn ? 'Persona, vocal timbre, speed & voice language' : 'Persona suara, timbre, kecepatan & bahasa dikte', tab: 'voice', tabLabel: 'Voice', keywords: 'tts suara voice persona speed timbre' },
  { id: 'voice-dict', title: isEn ? 'Pronunciation Dictionary' : 'Kamus Pengucapan', description: isEn ? 'Custom pronunciation for acronyms/terms' : 'Atur pelafalan istilah khusus', tab: 'voice', tabLabel: 'Voice', keywords: 'dictionary kamus pengucapan' },
  { id: 'temp-chat', title: isEn ? 'Temporary Chat & History' : 'Riwayat & Obrolan Sementara', description: isEn ? 'Control saving or ephemeral chat mode' : 'Kontrol penyimpanan riwayat & mode sementara', tab: 'privacy', tabLabel: 'Data & Privacy', keywords: 'temporary chat sementara history riwayat' },
  { id: 'storage-export', title: isEn ? 'Storage Cache & Export JSON' : 'Cache Penyimpanan & Ekspor JSON', description: isEn ? 'Clear local cache or download data backup' : 'Bersihkan cache lokal atau ekspor backup JSON', tab: 'privacy', tabLabel: 'Data & Privacy', keywords: 'storage cache export json delete hapus' },
  { id: 'account', title: isEn ? 'Account, Usage & Maria PLUS' : 'Akun, Kuota & Maria PLUS', description: isEn ? 'Profile, model routing, and subscription' : 'Profil Google, status model, dan langganan', tab: 'account', tabLabel: 'Account', keywords: 'account akun usage kuota plus upgrade google' },
  { id: 'about', title: isEn ? 'About & Legal Policies' : 'Tentang & Kebijakan', description: isEn ? 'App info, help center, terms & privacy' : 'Info aplikasi, bantuan, ketentuan & privasi', tab: 'about', tabLabel: 'About', keywords: 'about help terms privacy cookies' },
];

const EN_TONE_MAP: Record<string, { label: string; description: string }> = {
  Professional: { label: 'Professional & Formal', description: 'Neat, polite, and structured language for work.' },
  Warm: { label: 'Warm & Friendly', description: 'Empathetic, approachable, and reassuring.' },
  Creative: { label: 'Creative & Energetic', description: 'Fresh ideas, unique analogies, and expressive.' },
  Technical: { label: 'Technical & Precise', description: 'Logical, scientific, focused on code and data.' },
  Minimalist: { label: 'Minimalist & Concise', description: 'Short answers, straight to the point.' },
};

const EN_PERSONA_MAP: Record<string, { label: string; sampleText: string }> = {
  wanita: { label: 'Maria (Adult Female)', sampleText: "Hello, I'm Maria. It's wonderful to assist you today." },
  pria: { label: 'Mario (Adult Male)', sampleText: "Hello, I'm Mario. Ready to help with your analysis and tasks." },
  'remaja-perempuan': { label: 'Maya (Teen Female)', sampleText: "Hey! I'm Maya. Let's explore something fun together today!" },
  'remaja-laki': { label: 'Max (Teen Male)', sampleText: "Hi! I'm Max. What interesting topic should we dive into?" },
  'anak-perempuan': { label: 'Mia (Young Girl)', sampleText: "Hi there! I'm Mia, let's learn and share stories together!" },
  'anak-laki': { label: 'Milo (Young Boy)', sampleText: "Hello! I'm Milo! I have lots of fun questions to explore!" },
};

const EN_PLUGIN_MAP: Record<string, { name: string; category: string; description: string }> = {
  'google-search': { name: 'Google Search Grounding', category: 'Search', description: 'Live web browsing & latest news facts directly from Google.' },
  'google-maps': { name: 'Google Maps Explorer', category: 'Maps', description: 'Place search, travel routes, and nearby recommendations.' },
  'image-studio': { name: 'AI Image Studio', category: 'Visuals', description: 'Image generation and editing powered by Nano Banana & Flux.' },
  'science-scout': { name: 'Science Scout (PubMed / UniProt / PDB)', category: 'Research', description: 'Access biomedical journals, proteins & 3D structures.' },
  'voice-engine': { name: 'Gemini AI Voice Engine', category: 'Audio & TTS', description: 'Natural voice synthesis with 6 personas & dictation.' },
  'canvas-code': { name: 'Canvas Code & App Launcher', category: 'Productivity', description: 'Interactive code editor and app launcher.' },
};

const LANGUAGE_STYLE_OPTIONS = [
  { value: 'Baku', labelEn: 'Formal' },
  { value: 'Santai', labelEn: 'Casual' },
  { value: 'Gaul', labelEn: 'Slang' },
  { value: 'Puitis', labelEn: 'Poetic' },
  { value: 'Teknis', labelEn: 'Technical' },
] as const;

const VOICE_TIMBRES = [
  { id: 'Aoede', labelId: 'Aoede (Wanita • Elegan)', labelEn: 'Aoede (Female • Elegant)' },
  { id: 'Kore', labelId: 'Kore (Wanita • Lembut)', labelEn: 'Kore (Female • Soft)' },
  { id: 'Zephyr', labelId: 'Zephyr (Wanita • Ceria)', labelEn: 'Zephyr (Female • Cheerful)' },
  { id: 'Fenrir', labelId: 'Fenrir (Pria • Mantap)', labelEn: 'Fenrir (Male • Firm)' },
  { id: 'Puck', labelId: 'Puck (Pria • Dinamis)', labelEn: 'Puck (Male • Dynamic)' },
  { id: 'Charon', labelId: 'Charon (Pria • Tenang)', labelEn: 'Charon (Male • Calm)' },
] as const;

export const SettingsDashboard: React.FC<SettingsDashboardProps> = React.memo(({
  isOpen,
  onClose,
  onClearHistoryRequest,
  settings: propSettings,
  onUpdateSettings,
  onOpenPlusModal,
  onOpenPluginsDirectory,
  conversations = [],
}) => {
  const { user, signIn, signOut } = useAuth();
  const { theme, isDark, setTheme, toggleTheme } = useTheme();
  const { isEn } = useLanguage();

  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [searchQuery, setSearchQuery] = useState('');
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [speechState, setSpeechState] = useState<SpeechState>(() => speechService.getState());
  const [memories, setMemories] = useState<UserMemory[]>(() => userMemoryService.getMemories());
  const [newMemoryText, setNewMemoryText] = useState('');
  const [newMemoryCategory, setNewMemoryCategory] = useState<UserMemory['category']>('personal');

  const [dictTerm, setDictTerm] = useState('');
  const [dictPronunciation, setDictPronunciation] = useState('');
  const [showDictEditor, setShowDictEditor] = useState(false);

  const [pinDraft, setPinDraft] = useState('');
  const [pinFeedback, setPinFeedback] = useState<string | null>(null);
  const [showPinEditor, setShowPinEditor] = useState(false);

  const [storageRefreshTick, setStorageRefreshTick] = useState(0);
  const [cacheNotice, setCacheNotice] = useState<string | null>(null);

  useEffect(() => {
    return userMemoryService.subscribe((updated) => setMemories(updated));
  }, []);

  const [localSettings, setLocalSettings] = useState<UserSettings>(() => {
    try {
      const saved = localStorage.getItem('maria_settings');
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const settings = propSettings || localSettings;
  const [savedSuccess, setSavedSuccess] = useState(false);
  const themeSyncTimeoutRef = useRef<number | null>(null);
  const savedTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    setPinDraft(settings.securityPin || '');
  }, [settings.securityPin, isOpen]);

  useEffect(() => {
    return () => {
      if (themeSyncTimeoutRef.current) window.clearTimeout(themeSyncTimeoutRef.current);
      if (savedTimeoutRef.current) window.clearTimeout(savedTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    return speechService.subscribe((state) => {
      setSpeechState(state);
    });
  }, []);

  const activeAccentHex = useMemo(() => {
    const found = ACCENT_COLORS.find((a) => a.id === (settings.accentColor || 'blue'));
    return found?.hex || '#2563eb';
  }, [settings.accentColor]);

  const searchResults = useMemo(() => {
    const clean = searchQuery
      .toLowerCase()
      .replace(/[?!.,;:()[\]{}'"]+/g, ' ')
      .trim();
    if (!clean) return [];
    const tokens = clean.split(/\s+/).filter(Boolean);
    return getSearchIndex(isEn).filter((item) => {
      const haystack = `${item.title} ${item.description} ${item.keywords} ${item.tabLabel}`.toLowerCase();
      return tokens.every((tok) => haystack.includes(tok));
    });
  }, [searchQuery, isEn]);

  const computedMemorySummary = useMemo(() => {
    if (memories.length === 0) {
      return isEn
        ? 'No personal memories saved yet.'
        : 'Belum ada memori personal tersimpan.';
    }
    const highlights = memories.slice(0, 3).map((m) => m.text).join(' • ');
    return isEn
      ? `${memories.length} notes active: ${highlights}`
      : `${memories.length} catatan aktif: ${highlights}`;
  }, [memories, isEn]);

  const storageStats = useMemo(() => {
    void storageRefreshTick;
    if (!isOpen || activeTab !== 'privacy') {
      return {
        totalLabel: '0 B',
        settingsLabel: '0 B',
        memoryLabel: '0 B',
        otherLabel: '0 B',
      };
    }
    let totalBytes = 0;
    let settingsBytes = 0;
    let memoryBytes = 0;
    let otherBytes = 0;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        const val = localStorage.getItem(key) || '';
        const bytes = (key.length + val.length) * 2;
        totalBytes += bytes;
        if (key === 'maria_settings' || key === 'maria_theme') settingsBytes += bytes;
        else if (key === 'maria_user_memories') memoryBytes += bytes;
        else otherBytes += bytes;
      }
    } catch {}
    const formatKB = (b: number) => (b < 1024 ? `${b} B` : `${(b / 1024).toFixed(1)} KB`);
    return {
      totalLabel: formatKB(totalBytes),
      settingsLabel: formatKB(settingsBytes),
      memoryLabel: formatKB(memoryBytes),
      otherLabel: formatKB(otherBytes),
    };
  }, [storageRefreshTick, isOpen, activeTab, memories.length]);

  if (!isOpen) return null;

  const triggerSavedIndicator = () => {
    setSavedSuccess(true);
    if (savedTimeoutRef.current) window.clearTimeout(savedTimeoutRef.current);
    savedTimeoutRef.current = window.setTimeout(() => setSavedSuccess(false), 1800);
  };

  const handleUpdate = <K extends keyof UserSettings>(
    keyOrPatch: K | Partial<UserSettings>,
    value?: UserSettings[K]
  ) => {
    const patch =
      typeof keyOrPatch === 'string'
        ? ({ [keyOrPatch]: value } as Partial<UserSettings>)
        : keyOrPatch;

    if ('speechDictionary' in patch && Array.isArray(patch.speechDictionary)) {
      speechService.setDictionary(patch.speechDictionary);
    }

    if (onUpdateSettings) {
      onUpdateSettings(patch);
    } else {
      setLocalSettings((prev) => {
        const updated = { ...prev, ...patch };
        if ('voiceEnabled' in patch) {
          updated.voiceResponses = Boolean(patch.voiceEnabled);
        }
        try {
          localStorage.setItem('maria_settings', JSON.stringify(updated));
        } catch {}
        return updated;
      });
    }

    triggerSavedIndicator();
    if (activeTab === 'privacy') {
      setStorageRefreshTick((t) => t + 1);
    }
  };

  const handleSelectTheme = (nextTheme: 'system' | 'dark' | 'light') => {
    setTheme(nextTheme);
    triggerSavedIndicator();
    if (user?.uid) {
      if (themeSyncTimeoutRef.current) window.clearTimeout(themeSyncTimeoutRef.current);
      themeSyncTimeoutRef.current = window.setTimeout(() => {
        updateUserProfile(user.uid, { theme: nextTheme }).catch(() => {});
      }, 450);
    }
  };

  const handleToggleTheme = () => {
    const resolvedTheme = toggleTheme();
    triggerSavedIndicator();
    if (user?.uid) {
      if (themeSyncTimeoutRef.current) window.clearTimeout(themeSyncTimeoutRef.current);
      themeSyncTimeoutRef.current = window.setTimeout(() => {
        updateUserProfile(user.uid, { theme: resolvedTheme }).catch(() => {});
      }, 450);
    }
  };

  const handleTogglePlugin = (pluginId: string) => {
    const current = settings.enabledPlugins || MARIA_PLUGINS.map((p) => p.id);
    const exists = current.includes(pluginId);
    const next = exists ? current.filter((id) => id !== pluginId) : [...current, pluginId];
    handleUpdate('enabledPlugins', next);
  };

  const handleAddDictionaryEntry = () => {
    const term = dictTerm.trim();
    if (!term) return;
    const entry = {
      id: `dict_${Date.now()}`,
      term,
      pronunciation: dictPronunciation.trim() || term,
    };
    const next = [...(settings.speechDictionary || []), entry];
    handleUpdate('speechDictionary', next);
    setDictTerm('');
    setDictPronunciation('');
  };

  const handleRemoveDictionaryEntry = (id: string) => {
    const next = (settings.speechDictionary || []).filter((d) => d.id !== id);
    handleUpdate('speechDictionary', next);
  };

  const handleSavePin = () => {
    const clean = pinDraft.replace(/\D/g, '').slice(0, 6);
    if (clean.length !== 6) {
      setPinFeedback(isEn ? 'PIN must be 6 digits.' : 'PIN harus tepat 6 digit.');
      return;
    }
    handleUpdate({
      securityPin: clean,
      twoFactorEnabled: true,
      lastSecurityCheck: new Date().toISOString(),
    });
    setPinFeedback(isEn ? '6-digit PIN saved.' : 'PIN 6-digit tersimpan.');
    setTimeout(() => setPinFeedback(null), 2600);
  };

  const handleClearCache = () => {
    try {
      const keepKeys = new Set([
        'maria_settings',
        'maria_theme',
        'maria_user_memories',
        'maria_library_items',
        'maria_moved_chat_image_ids',
      ]);
      const keysToDelete: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && !keepKeys.has(k)) keysToDelete.push(k);
      }
      keysToDelete.forEach((k) => localStorage.removeItem(k));
      speechService.setDictionary(settings.speechDictionary || []);
      setStorageRefreshTick((t) => t + 1);
      setCacheNotice(
        isEn
          ? `Cleared ${keysToDelete.length} temp cache keys.`
          : `${keysToDelete.length} cache sementara dibersihkan.`
      );
      setTimeout(() => setCacheNotice(null), 3000);
    } catch {
      setCacheNotice(isEn ? 'Failed to clear cache.' : 'Gagal membersihkan cache.');
    }
  };

  const handleExportData = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      app: 'Maria AI',
      account: user
        ? { uid: user.uid, displayName: user.displayName, email: user.email }
        : { type: 'guest' },
      settings: {
        ...settings,
        securityPin: settings.securityPin ? '[PROTECTED]' : '',
      },
      memories,
      conversationsCount: conversations.length,
      conversations: conversations.map((c) => ({ id: c.id, title: c.title, mode: c.mode })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `maria-ai-data-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const tabs: {
    id: TabType;
    label: string;
    title: string;
    subtitle: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: 'general',
      label: isEn ? 'General' : 'Umum',
      title: isEn ? 'General' : 'Pengaturan Umum',
      subtitle: isEn ? 'Manage your Maria AI appearance and preferences.' : 'Atur tampilan, bahasa, dan preferensi utama Maria AI.',
      icon: <Settings className="w-3.5 h-3.5 shrink-0" />,
    },
    {
      id: 'ai',
      label: isEn ? 'AI Behavior' : 'Perilaku AI',
      title: isEn ? 'AI Behavior' : 'Perilaku & Gaya AI',
      subtitle: isEn ? 'Shape how Maria AI thinks, speaks, and formats answers.' : 'Atur gaya respon, sifat kepribadian, dan instruksi khusus.',
      icon: <Sparkles className="w-3.5 h-3.5 shrink-0" />,
    },
    {
      id: 'memory',
      label: isEn ? 'Memory' : 'Memori',
      title: isEn ? 'Memory' : 'Memori Personal',
      subtitle: isEn ? 'Manage what Maria AI remembers across chats.' : 'Kelola catatan pribadi & ekstraksi memori otomatis.',
      icon: <Brain className="w-3.5 h-3.5 shrink-0" />,
    },
    {
      id: 'connectors',
      label: isEn ? 'Connectors' : 'Konektor',
      title: isEn ? 'Connectors' : 'Konektor & Plugin',
      subtitle: isEn ? 'Manage connected engines, services, and plugins.' : 'Kelola koneksi mesin AI dan kapabilitas plugin Maria.',
      icon: <Layers className="w-3.5 h-3.5 shrink-0" />,
    },
    {
      id: 'security',
      label: isEn ? 'Security' : 'Keamanan',
      title: isEn ? 'Security' : 'Keamanan & Perlindungan',
      subtitle: isEn ? 'Configure DLP shield, safety filter, and 2FA PIN.' : 'Atur DLP Shield, filter konten, dan kunci PIN 2FA.',
      icon: <Shield className="w-3.5 h-3.5 shrink-0" />,
    },
    {
      id: 'notifications',
      label: isEn ? 'Notifications' : 'Notifikasi',
      title: isEn ? 'Notifications' : 'Preferensi Notifikasi',
      subtitle: isEn ? 'Choose which updates and alerts Maria sends.' : 'Pilih notifikasi status, agenda, dan efek suara.',
      icon: <Bell className="w-3.5 h-3.5 shrink-0" />,
    },
    {
      id: 'voice',
      label: isEn ? 'Voice' : 'Suara AI',
      title: isEn ? 'Voice & Audio' : 'Suara & Audio',
      subtitle: isEn ? 'Configure AI voice persona, speed, and dictionary.' : 'Atur suara otomatis (TTS), persona vokal, dan kamus baca.',
      icon: <Volume2 className="w-3.5 h-3.5 shrink-0" />,
    },
    {
      id: 'privacy',
      label: isEn ? 'Data & Privacy' : 'Data & Privasi',
      title: isEn ? 'Data & Privacy' : 'Data & Privasi',
      subtitle: isEn ? 'Control history retention, local cache, and data export.' : 'Kelola riwayat obrolan, cache lokal, dan cadangan data.',
      icon: <Database className="w-3.5 h-3.5 shrink-0" />,
    },
    {
      id: 'account',
      label: isEn ? 'Account' : 'Akun',
      title: isEn ? 'Account & Plan' : 'Akun & Langganan',
      subtitle: isEn ? 'Manage your Google sync profile and Maria PLUS plan.' : 'Kelola profil sinkronisasi, kuota model, dan Maria PLUS.',
      icon: <User className="w-3.5 h-3.5 shrink-0" />,
    },
    {
      id: 'about',
      label: isEn ? 'About' : 'Tentang',
      title: isEn ? 'About Maria AI' : 'Tentang Maria AI',
      subtitle: isEn ? 'Application version, help center, and legal policies.' : 'Informasi aplikasi, pusat bantuan, dan kebijakan layanan.',
      icon: <Info className="w-3.5 h-3.5 shrink-0" />,
    },
  ];

  const currentTabMeta = tabs.find((t) => t.id === activeTab) || tabs[0];
  const activePluginIds = settings.enabledPlugins || MARIA_PLUGINS.map((p) => p.id);

  // Shared Maria-styled compact UI primitives
  const rowBorder = isDark ? 'border-[#212333]' : 'border-slate-100';
  const titleCls = `text-[13px] font-semibold leading-snug ${isDark ? 'text-neutral-100' : 'text-slate-800'}`;
  const descCls = `text-[11.5px] leading-relaxed mt-0.5 ${isDark ? 'text-neutral-400' : 'text-slate-500'}`;
  const selectCls = `px-3 py-1.5 rounded-xl border text-xs font-medium focus:outline-none cursor-pointer shrink-0 ${
    isDark
      ? 'bg-[#181a25] border-[#2b2e40] text-neutral-100'
      : 'bg-slate-50 border-slate-200 text-slate-700'
  }`;
  const actionBtnCls = `px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer shrink-0 transition-colors ${
    isDark
      ? 'bg-[#1d2132] hover:bg-[#272c42] text-neutral-100 border border-[#2f344d]'
      : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-200'
  }`;

  const renderToggle = (checked: boolean, onChange: (val: boolean) => void, ariaLabel: string) => (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      style={checked ? { backgroundColor: activeAccentHex } : undefined}
      className={`relative inline-flex h-[22px] w-10 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
        checked ? '' : isDark ? 'bg-[#2c2f42]' : 'bg-slate-300'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
          checked ? 'translate-x-[21px]' : 'translate-x-[3px]'
        }`}
      />
    </button>
  );

  const activePersonaObj =
    VOICE_PERSONAS.find((p) => p.id === (settings.voicePersona || 'wanita')) || VOICE_PERSONAS[0];

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-5 ${
        isDark ? 'bg-black/80 backdrop-blur-xs' : 'bg-slate-900/45 backdrop-blur-xs'
      }`}
    >
      <div
        className={`relative w-full max-w-4xl border rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[85vh] ${
          isDark
            ? 'bg-[#111218] border-[#252737] text-white'
            : 'bg-[#f8fafc] border-slate-200 text-slate-900'
        }`}
      >
        {/* Top Modal Bar (Clean single-line header like original Maria UI) */}
        <div
          className={`flex items-center justify-between gap-2.5 px-4 sm:px-6 py-3.5 border-b shrink-0 ${
            isDark ? 'border-[#212332] bg-[#151620]' : 'border-slate-200 bg-white'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center border shrink-0"
              style={{
                backgroundColor: `${activeAccentHex}1c`,
                borderColor: `${activeAccentHex}40`,
                color: activeAccentHex,
              }}
            >
              <Settings className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className={`text-sm sm:text-base font-bold tracking-tight truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {isEn ? 'Maria AI Settings' : 'Pengaturan Maria AI'}
              </h2>
              <p className={`text-[11px] truncate ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>
                {isEn ? 'Customize appearance, intelligence, memory, voice & security' : 'Sesuaikan tampilan, kecerdasan, memori, suara, dan keamanan'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Desktop Inline Search */}
            <div className="relative hidden md:block w-52">
              <Search
                className={`w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none ${
                  isDark ? 'text-neutral-500' : 'text-slate-400'
                }`}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isEn ? 'Find setting...' : 'Cari setelan...'}
                className={`w-full pl-8 pr-6 py-1.5 border rounded-xl text-xs focus:outline-none ${
                  isDark
                    ? 'bg-[#191b27] border-[#2a2d3f] text-white placeholder-neutral-500'
                    : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                }`}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer ${
                    isDark ? 'text-neutral-400 hover:text-white' : 'text-slate-400 hover:text-slate-700'
                  }`}
                >
                  <X className="w-3 h-3" />
                </button>
              )}

              {searchQuery.trim() && (
                <div
                  className={`absolute right-0 top-full mt-1.5 w-80 max-h-60 overflow-y-auto rounded-2xl border divide-y shadow-2xl z-30 ${
                    isDark
                      ? 'border-[#2a2d3f] bg-[#161824] divide-[#222536]'
                      : 'border-slate-200 bg-white divide-slate-100'
                  }`}
                >
                  {searchResults.length === 0 ? (
                    <div className={`p-3 text-xs text-center ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>
                      {isEn ? `No match for "${searchQuery}"` : `Tidak ada hasil untuk "${searchQuery}"`}
                    </div>
                  ) : (
                    searchResults.map((res) => (
                      <button
                        key={res.id}
                        type="button"
                        onClick={() => {
                          setActiveTab(res.tab);
                          setSearchQuery('');
                        }}
                        className={`w-full text-left px-3 py-2 flex items-center justify-between gap-2 cursor-pointer ${
                          isDark ? 'hover:bg-[#1f2233]' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className={`text-xs font-semibold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {res.title}
                          </div>
                          <div className={`text-[10.5px] truncate ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>
                            {res.description}
                          </div>
                        </div>
                        <span
                          style={{ color: activeAccentHex, backgroundColor: `${activeAccentHex}18` }}
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-lg shrink-0"
                        >
                          {res.tabLabel}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Mobile Compact Search Trigger */}
            <button
              type="button"
              onClick={() => setShowMobileSearch((v) => !v)}
              title={isEn ? 'Search settings' : 'Cari pengaturan'}
              className={`md:hidden w-8 h-8 rounded-xl border flex items-center justify-center cursor-pointer ${
                showMobileSearch
                  ? isDark
                    ? 'border-blue-500/40 bg-blue-500/15 text-blue-400'
                    : 'border-blue-300 bg-blue-50 text-blue-600'
                  : isDark
                  ? 'border-[#2d3042] bg-[#1b1d28] text-neutral-300 hover:bg-[#252838]'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Search className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleToggleTheme}
              title={isDark ? (isEn ? 'Switch to Light Mode' : 'Mode Terang') : (isEn ? 'Switch to Dark Mode' : 'Mode Gelap')}
              className={`w-8 h-8 rounded-xl border flex items-center justify-center cursor-pointer ${
                isDark
                  ? 'border-[#2d3042] bg-[#1b1d28] text-amber-300 hover:bg-[#252838]'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
              }`}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label={isEn ? 'Close Settings' : 'Tutup Pengaturan'}
              className={`w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer ${
                isDark
                  ? 'text-neutral-400 hover:text-white hover:bg-[#232535]'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile/Tablet Horizontal Pill Navigation Bar (Image 3 style) */}
        <div
          className={`flex md:hidden items-center px-3.5 py-2 border-b overflow-x-auto scrollbar-none gap-1.5 shrink-0 ${
            isDark ? 'border-[#1d1f2c] bg-[#13141c]' : 'border-slate-200 bg-slate-50/70'
          }`}
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  setSearchQuery('');
                }}
                style={isActive ? { backgroundColor: activeAccentHex } : undefined}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs whitespace-nowrap cursor-pointer shrink-0 transition-colors ${
                  isActive
                    ? 'text-white shadow-sm font-semibold'
                    : isDark
                    ? 'text-neutral-400 hover:text-white hover:bg-[#1c1e2a] font-medium'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 font-medium'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Expandable Mobile Search Bar */}
        {showMobileSearch && (
          <div
            className={`md:hidden px-3.5 py-2 border-b shrink-0 ${
              isDark ? 'border-[#1d1f2c] bg-[#111218]' : 'border-slate-100 bg-white'
            }`}
          >
            <div className="relative">
              <Search
                className={`w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none ${
                  isDark ? 'text-neutral-500' : 'text-slate-400'
                }`}
              />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isEn ? 'Search settings...' : 'Cari pengaturan...'}
                className={`w-full pl-8 pr-7 py-1.5 border rounded-xl text-xs focus:outline-none ${
                  isDark
                    ? 'bg-[#191b27] border-[#2a2d3f] text-white placeholder-neutral-500'
                    : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                }`}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer ${
                    isDark ? 'text-neutral-400 hover:text-white' : 'text-slate-400 hover:text-slate-700'
                  }`}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {searchQuery.trim() && (
              <div
                className={`mt-2 max-h-44 overflow-y-auto rounded-xl border divide-y ${
                  isDark
                    ? 'border-[#2a2d3f] bg-[#161824] divide-[#222536]'
                    : 'border-slate-200 bg-white divide-slate-100'
                }`}
              >
                {searchResults.length === 0 ? (
                  <div className={`p-2.5 text-xs text-center ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>
                    {isEn ? `No match for "${searchQuery}"` : `Tidak ada hasil untuk "${searchQuery}"`}
                  </div>
                ) : (
                  searchResults.map((res) => (
                    <button
                      key={res.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(res.tab);
                        setSearchQuery('');
                        setShowMobileSearch(false);
                      }}
                      className={`w-full text-left px-3 py-2 flex items-center justify-between gap-2 cursor-pointer ${
                        isDark ? 'hover:bg-[#1f2233]' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className={`text-xs font-semibold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {res.title}
                        </div>
                        <div className={`text-[10.5px] truncate ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>
                          {res.description}
                        </div>
                      </div>
                      <span
                        style={{ color: activeAccentHex, backgroundColor: `${activeAccentHex}18` }}
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-lg shrink-0"
                      >
                        {res.tabLabel}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* Body Layout: Single Panel on Mobile (<md), 2-Pane Control Center Sidebar + Panel on Desktop (md+) */}
        <div className="flex-1 min-h-0 overflow-hidden p-3 sm:p-4 md:p-5 flex flex-col md:grid md:grid-cols-[215px_1fr] md:gap-5">
          {/* Desktop-Only Left Control Center Sidebar Card (Image 1 style) */}
          <aside
            className={`hidden md:block rounded-2xl border p-3.5 h-max shrink-0 ${
              isDark
                ? 'bg-[#151620] border-[#242636]'
                : 'bg-white border-slate-200/90 shadow-xs'
            }`}
          >
            <div className="px-2 pb-2.5">
              <div
                style={{ color: activeAccentHex }}
                className="text-sm font-bold tracking-tight"
              >
                Maria AI
              </div>
              <div className={`text-[9.5px] font-semibold tracking-[0.16em] uppercase mt-0.5 ${isDark ? 'text-neutral-500' : 'text-slate-400'}`}>
                CONTROL CENTER
              </div>
            </div>

            <nav className="grid grid-cols-1 gap-1">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    style={
                      isActive
                        ? {
                            backgroundColor: `${activeAccentHex}18`,
                            color: activeAccentHex,
                          }
                        : undefined
                    }
                    className={`flex items-center gap-2 px-2.5 py-2 rounded-xl text-[12px] text-left cursor-pointer transition-colors ${
                      isActive
                        ? 'font-bold'
                        : isDark
                        ? 'text-neutral-400 hover:text-neutral-200 hover:bg-[#1d1f2c] font-medium'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 font-medium'
                    }`}
                  >
                    {tab.icon}
                    <span className="truncate">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Right Clean Panel Card */}
          <main
            className={`flex-1 min-h-0 overflow-hidden rounded-2xl border flex flex-col ${
              isDark
                ? 'bg-[#151620] border-[#242636]'
                : 'bg-white border-slate-200/90 shadow-xs'
            }`}
          >
            {/* Panel Header */}
            <div className={`px-5 py-4 border-b shrink-0 ${rowBorder}`}>
              <h3 className={`text-base sm:text-lg font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {currentTabMeta.title}
              </h3>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>
                {currentTabMeta.subtitle}
              </p>
            </div>

            {/* Clean Divider-Separated Settings Rows */}
            <div className="flex-1 overflow-y-auto px-5 py-1 divide-y divide-transparent">
              {/* TAB 1: GENERAL */}
              {activeTab === 'general' && (
                <div className={`divide-y ${isDark ? 'divide-[#212333]' : 'divide-slate-100'}`}>
                  {/* Display Name */}
                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className={titleCls}>{isEn ? 'Display Name' : 'Nama Panggilan'}</div>
                      <div className={descCls}>{isEn ? 'How Maria addresses you in chats.' : 'Sapaan pribadi Anda di dalam percakapan.'}</div>
                    </div>
                    <input
                      type="text"
                      value={settings.username}
                      onChange={(e) => handleUpdate('username', e.target.value)}
                      placeholder={isEn ? 'Your name' : 'Nama Anda'}
                      className={`w-36 sm:w-48 px-3 py-1.5 border rounded-xl text-xs focus:outline-none shrink-0 ${
                        isDark ? 'bg-[#181a25] border-[#2b2e40] text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                    />
                  </div>

                  {/* Theme Mode (Compact 3-way segmented control) */}
                  <div className="py-3.5 flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className={titleCls}>{isEn ? 'Appearance Mode' : 'Mode Tampilan'}</div>
                      <div className={descCls}>{isEn ? 'Follow device system, dark OLED, or light.' : 'Pilih tampilan sistem, gelap OLED, atau terang.'}</div>
                    </div>
                    <div
                      className={`inline-flex p-0.5 rounded-xl border shrink-0 ${
                        isDark ? 'bg-[#101219] border-[#262839]' : 'bg-slate-100 border-slate-200'
                      }`}
                    >
                      {([
                        { id: 'system', label: isEn ? 'System' : 'Sistem' },
                        { id: 'dark', label: isEn ? 'Dark' : 'Gelap' },
                        { id: 'light', label: isEn ? 'Light' : 'Terang' },
                      ] as const).map((m) => {
                        const active = theme === m.id;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => handleSelectTheme(m.id)}
                            style={active ? { backgroundColor: activeAccentHex, color: '#ffffff' } : undefined}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer transition-colors ${
                              active ? 'shadow-xs' : isDark ? 'text-neutral-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            {m.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Accent Color Circles */}
                  <div className="py-3.5 flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className={titleCls}>{isEn ? 'Accent Color' : 'Warna Aksen'}</div>
                      <div className={descCls}>{isEn ? 'Primary highlight across buttons & active tabs.' : 'Warna sorotan utama tombol dan menu aktif.'}</div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {ACCENT_COLORS.map((acc) => {
                        const isSelected = (settings.accentColor || 'blue') === acc.id;
                        return (
                          <button
                            key={acc.id}
                            type="button"
                            title={acc.label}
                            aria-label={acc.label}
                            onClick={() => handleUpdate('accentColor', acc.id)}
                            style={{ backgroundColor: acc.hex }}
                            className={`w-6 h-6 rounded-full flex items-center justify-center cursor-pointer transition-transform ${
                              isSelected ? 'scale-110 ring-2 ring-offset-2 ring-slate-400/70' : 'opacity-80 hover:opacity-100'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 text-white stroke-[3]" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Language */}
                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className={titleCls}>{isEn ? 'Language' : 'Bahasa Antarmuka'}</div>
                      <div className={descCls}>{isEn ? 'Choose your preferred application language.' : 'Pilih bahasa antarmuka aplikasi Maria AI.'}</div>
                    </div>
                    <select
                      value={settings.language || 'Indonesia'}
                      onChange={(e) => handleUpdate('language', e.target.value as any)}
                      className={selectCls}
                    >
                      <option value="Indonesia">Indonesia</option>
                      <option value="English">English</option>
                    </select>
                  </div>

                  {/* Fast Answers */}
                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className={titleCls}>{isEn ? 'Fast Answers' : 'Jawaban Cepat'}</div>
                      <div className={descCls}>{isEn ? 'Prioritize concise, low-latency replies.' : 'Prioritaskan jawaban lebih singkat & cepat.'}</div>
                    </div>
                    {renderToggle(Boolean(settings.fastAnswers), (v) => handleUpdate('fastAnswers', v), 'Fast Answers')}
                  </div>

                  {/* Auto Web Search */}
                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className={titleCls}>{isEn ? 'Auto Web Search' : 'Pencarian Web Otomatis'}</div>
                      <div className={descCls}>{isEn ? 'Enable live Google Search by default.' : 'Aktifkan penelusuran Google secara bawaan.'}</div>
                    </div>
                    {renderToggle(
                      settings.webSearchDefault !== false,
                      (val) => {
                        try {
                          localStorage.setItem('maria_web_search_active', String(val));
                        } catch {}
                        handleUpdate('webSearchDefault', val);
                      },
                      'Auto Web Search'
                    )}
                  </div>

                  {/* Home Suggestions */}
                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className={titleCls}>{isEn ? 'Home Suggestions' : 'Saran Topik Beranda'}</div>
                      <div className={descCls}>{isEn ? 'Show starter prompts on new chat screen.' : 'Tampilkan kartu ide cepat di halaman awal chat.'}</div>
                    </div>
                    {renderToggle(
                      settings.homepageSuggestions !== false,
                      (v) => handleUpdate('homepageSuggestions', v),
                      'Home Topic Suggestions'
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: AI BEHAVIOR */}
              {activeTab === 'ai' && (
                <div className={`divide-y ${isDark ? 'divide-[#212333]' : 'divide-slate-100'}`}>
                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className={titleCls}>{isEn ? 'Response Style' : 'Gaya Respon AI'}</div>
                      <div className={descCls}>
                        {(isEn ? EN_TONE_MAP[settings.tone]?.description : TONE_OPTIONS.find((t) => t.value === settings.tone)?.description) ||
                          (isEn ? 'Choose Maria default communication tone.' : 'Pilih gaya penyampaian utama Maria.')}
                      </div>
                    </div>
                    <select
                      value={settings.tone}
                      onChange={(e) => handleUpdate('tone', e.target.value as any)}
                      className={selectCls}
                    >
                      {TONE_OPTIONS.map((t) => {
                        const d = isEn ? EN_TONE_MAP[t.value] || t : t;
                        return (
                          <option key={t.value} value={t.value}>
                            {d.label}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className={titleCls}>{isEn ? 'Vocabulary & Greeting Style' : 'Gaya Bahasa & Sapaan'}</div>
                      <div className={descCls}>{isEn ? 'Pick formality level and phrasing.' : 'Pilih tingkat kefasihan & nuansa sapaan Maria.'}</div>
                    </div>
                    <select
                      value={settings.languageStyle || 'Baku'}
                      onChange={(e) => handleUpdate('languageStyle', e.target.value as any)}
                      className={selectCls}
                    >
                      {LANGUAGE_STYLE_OPTIONS.map((st) => (
                        <option key={st.value} value={st.value}>
                          {isEn ? st.labelEn : st.value}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className={titleCls}>{isEn ? 'Warmth' : 'Kehangatan'}</div>
                      <div className={descCls}>{isEn ? 'Empathetic, friendly, and approachable replies.' : 'Jawaban empatik dan bersahabat.'}</div>
                    </div>
                    {renderToggle(
                      settings.personalityWarmth !== false,
                      (v) => handleUpdate('personalityWarmth', v),
                      'Warmth'
                    )}
                  </div>

                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className={titleCls}>{isEn ? 'Enthusiasm' : 'Antusiasme'}</div>
                      <div className={descCls}>{isEn ? 'Expressive, upbeat, and spirited tone.' : 'Nada bicara lebih ekspresif dan bersemangat.'}</div>
                    </div>
                    {renderToggle(
                      Boolean(settings.personalityEnthusiasm),
                      (v) => handleUpdate('personalityEnthusiasm', v),
                      'Enthusiasm'
                    )}
                  </div>

                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className={titleCls}>{isEn ? 'Structured Formatting' : 'Format Terstruktur'}</div>
                      <div className={descCls}>{isEn ? 'Organize long answers with headings & lists.' : 'Susun jawaban rapi dengan poin dan subjudul.'}</div>
                    </div>
                    {renderToggle(
                      settings.personalityStructured !== false,
                      (v) => handleUpdate('personalityStructured', v),
                      'Structured'
                    )}
                  </div>

                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className={titleCls}>{isEn ? 'Enter to Send' : 'Tekan Enter untuk Mengirim'}</div>
                      <div className={descCls}>{isEn ? 'Use Shift + Enter to add a new line.' : 'Gunakan Shift + Enter untuk baris baru.'}</div>
                    </div>
                    {renderToggle(
                      settings.enterToSend !== false,
                      (v) => handleUpdate('enterToSend', v),
                      'Enter to Send'
                    )}
                  </div>

                  <div className="py-3.5 space-y-2">
                    <div>
                      <div className={titleCls}>{isEn ? 'Custom Instructions' : 'Instruksi Kustom (Custom Prompt)'}</div>
                      <div className={descCls}>{isEn ? 'Extra rules or persona instructions always sent to Maria.' : 'Aturan atau karakter tambahan yang selalu diikuti Maria.'}</div>
                    </div>
                    <textarea
                      rows={2}
                      value={settings.customPrompt}
                      onChange={(e) => handleUpdate('customPrompt', e.target.value)}
                      placeholder={
                        isEn
                          ? 'Example: Answer concisely, use bullet points, avoid fluff...'
                          : 'Contoh: Jawab ringkas pakai poin, santai namun jelas...'
                      }
                      className={`w-full px-3 py-2 border rounded-xl text-xs focus:outline-none ${
                        isDark ? 'bg-[#181a25] border-[#2b2e40] text-white placeholder-neutral-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                      }`}
                    />
                  </div>
                </div>
              )}

              {/* TAB 3: MEMORY */}
              {activeTab === 'memory' && (
                <div className={`divide-y ${isDark ? 'divide-[#212333]' : 'divide-slate-100'}`}>
                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className={titleCls}>{isEn ? 'AI Memory' : 'Memori Konteks Otomatis'}</div>
                      <div className={descCls}>{isEn ? 'Allow Maria to remember useful context across chats.' : 'Izinkan Maria mengingat preferensi penting antar chat.'}</div>
                    </div>
                    {renderToggle(
                      settings.memoryEnabled !== false,
                      (v) => handleUpdate('memoryEnabled', v),
                      'AI Memory'
                    )}
                  </div>

                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className={titleCls}>{isEn ? 'Memory Summary' : 'Ringkasan Memori Aktif'}</div>
                      <div className={`${descCls} line-clamp-2`}>
                        {settings.memorySummary || computedMemorySummary}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUpdate('memorySummary', computedMemorySummary)}
                      className={actionBtnCls}
                    >
                      {isEn ? 'Refresh' : 'Perbarui'}
                    </button>
                  </div>

                  <div className="py-3.5 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className={titleCls}>
                          {isEn ? `Saved Notes (${memories.length})` : `Catatan Memori (${memories.length})`}
                        </div>
                        <div className={descCls}>{isEn ? 'Facts Maria uses to personalize answers.' : 'Fakta pribadi yang digunakan Maria saat menjawab.'}</div>
                      </div>
                      {memories.length > 0 && (
                        <button
                          type="button"
                          onClick={() => userMemoryService.clearMemories()}
                          className="text-[11px] font-semibold text-rose-500 hover:underline cursor-pointer shrink-0"
                        >
                          {isEn ? 'Clear All' : 'Hapus Semua'}
                        </button>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={newMemoryText}
                        onChange={(e) => setNewMemoryText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newMemoryText.trim()) {
                            userMemoryService.addMemory(newMemoryText, newMemoryCategory, 'manual');
                            setNewMemoryText('');
                          }
                        }}
                        placeholder={isEn ? 'Add a memory note...' : 'Tambah fakta baru (misal: Saya suka TypeScript)...'}
                        className={`flex-1 px-3 py-1.5 border rounded-xl text-xs focus:outline-none ${
                          isDark ? 'bg-[#181a25] border-[#2b2e40] text-white placeholder-neutral-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                        }`}
                      />
                      <div className="flex gap-1.5 shrink-0">
                        <select
                          value={newMemoryCategory}
                          onChange={(e) => setNewMemoryCategory(e.target.value as any)}
                          className={selectCls}
                        >
                          <option value="personal">{isEn ? 'Personal' : 'Personal'}</option>
                          <option value="preferences">{isEn ? 'Preferences' : 'Preferensi'}</option>
                          <option value="work">{isEn ? 'Work' : 'Pekerjaan'}</option>
                          <option value="goals">{isEn ? 'Goals' : 'Target'}</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => {
                            if (newMemoryText.trim()) {
                              userMemoryService.addMemory(newMemoryText, newMemoryCategory, 'manual');
                              setNewMemoryText('');
                            }
                          }}
                          style={{ backgroundColor: activeAccentHex }}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white flex items-center gap-1 cursor-pointer shrink-0"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{isEn ? 'Add' : 'Tambah'}</span>
                        </button>
                      </div>
                    </div>

                    {memories.length > 0 && (
                      <div className={`divide-y max-h-44 overflow-y-auto rounded-xl border ${isDark ? 'border-[#252738] divide-[#212333] bg-[#12141c]' : 'border-slate-200 divide-slate-100 bg-slate-50/70'}`}>
                        {memories.map((m) => (
                          <div key={m.id} className="px-3 py-2 flex items-center justify-between gap-2 text-xs">
                            <div className="min-w-0 flex items-center gap-2">
                              <span
                                className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded shrink-0 ${
                                  m.category === 'personal'
                                    ? 'bg-blue-500/15 text-blue-500'
                                    : m.category === 'preferences'
                                    ? 'bg-purple-500/15 text-purple-500'
                                    : m.category === 'work'
                                    ? 'bg-amber-500/15 text-amber-500'
                                    : 'bg-emerald-500/15 text-emerald-500'
                                }`}
                              >
                                {m.category}
                              </span>
                              <span className={`truncate ${isDark ? 'text-neutral-200' : 'text-slate-700'}`}>{m.text}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => userMemoryService.removeMemory(m.id)}
                              className="p-1 text-neutral-400 hover:text-rose-500 cursor-pointer shrink-0"
                              title={isEn ? 'Delete' : 'Hapus'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: CONNECTORS */}
              {activeTab === 'connectors' && (
                <div className={`divide-y ${isDark ? 'divide-[#212333]' : 'divide-slate-100'}`}>
                  <div className="py-3 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className={titleCls}>Google Cloud Firestore</div>
                      <div className={descCls}>{isEn ? 'Real-time cloud history & library synchronization.' : 'Sinkronisasi riwayat chat, profil & pustaka real-time.'}</div>
                    </div>
                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-500 shrink-0">
                      {isEn ? 'Connected' : 'Terhubung'}
                    </span>
                  </div>

                  <div className="py-3 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className={titleCls}>Gemini 2.5 &amp; 3.8 Flash</div>
                      <div className={descCls}>{isEn ? 'Core text, multimodal vision & neural TTS engine.' : 'Mesin pemrosesan teks, visual multimodal & suara TTS.'}</div>
                    </div>
                    <span
                      style={{ backgroundColor: `${activeAccentHex}18`, color: activeAccentHex }}
                      className="text-[11px] font-semibold px-2.5 py-1 rounded-lg shrink-0"
                    >
                      {isEn ? 'Active' : 'Aktif'}
                    </span>
                  </div>

                  {MARIA_PLUGINS.map((plugin) => {
                    const pDisplay = isEn ? EN_PLUGIN_MAP[plugin.id] || plugin : plugin;
                    const enabled = activePluginIds.includes(plugin.id);
                    return (
                      <div key={plugin.id} className="py-3 flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <div className={titleCls}>{pDisplay.name}</div>
                          <div className={descCls}>{pDisplay.description}</div>
                        </div>
                        {renderToggle(enabled, () => handleTogglePlugin(plugin.id), pDisplay.name)}
                      </div>
                    );
                  })}

                  {onOpenPluginsDirectory && (
                    <div className="py-3.5 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className={titleCls}>{isEn ? 'Plugins Directory' : 'Direktori Plugin Lengkap'}</div>
                        <div className={descCls}>{isEn ? `${activePluginIds.length} of ${MARIA_PLUGINS.length} connectors active.` : `${activePluginIds.length} dari ${MARIA_PLUGINS.length} konektor sedang aktif.`}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenPluginsDirectory();
                        }}
                        className={actionBtnCls}
                      >
                        {isEn ? 'Open Directory' : 'Buka Direktori'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: SECURITY */}
              {activeTab === 'security' && (
                <div className={`divide-y ${isDark ? 'divide-[#212333]' : 'divide-slate-100'}`}>
                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className={titleCls}>{isEn ? 'DLP Shield' : 'Pelindung Kebocoran Data (DLP)'}</div>
                      <div className={descCls}>{isEn ? 'Mask sensitive tokens & API credentials in outputs.' : 'Samarkan token sensitif dan kredensial pribadi di respons.'}</div>
                    </div>
                    {renderToggle(settings.dlpEnabled !== false, (v) => handleUpdate('dlpEnabled', v), 'DLP Shield')}
                  </div>

                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className={titleCls}>{isEn ? 'Safety Content Filter' : 'Filter Konten Sensitif'}</div>
                      <div className={descCls}>{isEn ? 'Tighten filtering of sensitive topics in responses.' : 'Perketat penyaringan topik sensitif saat pencarian & chat.'}</div>
                    </div>
                    {renderToggle(
                      Boolean(settings.reduceSensitiveContent),
                      (v) => handleUpdate('reduceSensitiveContent', v),
                      'Safety Filter'
                    )}
                  </div>

                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className={titleCls}>{isEn ? 'Sensitive Action Confirmation' : 'Konfirmasi Tindakan Sensitif'}</div>
                      <div className={descCls}>{isEn ? 'Require security confirmation before permanent actions.' : 'Wajibkan konfirmasi keamanan sebelum eksekusi sensitif.'}</div>
                    </div>
                    {renderToggle(
                      Boolean(settings.sessionLockEnabled),
                      (v) => handleUpdate('sessionLockEnabled', v),
                      'Session Lock'
                    )}
                  </div>

                  <div className="py-3.5 space-y-2.5">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className={titleCls}>{isEn ? 'Two-Factor Security PIN' : 'PIN Keamanan 2FA (6-Digit)'}</div>
                        <div className={descCls}>
                          {settings.securityPin?.length === 6
                            ? isEn
                              ? 'Custom 6-digit PIN is active.'
                              : 'PIN kustom 6-digit sedang aktif.'
                            : isEn
                              ? 'Protect destructive actions with a 6-digit PIN.'
                              : 'Lindungi penghapusan riwayat dengan PIN 6-digit.'}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowPinEditor((s) => !s)}
                        className={actionBtnCls}
                      >
                        {showPinEditor ? (isEn ? 'Close' : 'Tutup') : isEn ? 'Configure' : 'Atur PIN'}
                      </button>
                    </div>

                    {showPinEditor && (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <input
                          type="password"
                          inputMode="numeric"
                          maxLength={6}
                          value={pinDraft}
                          onChange={(e) => setPinDraft(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          placeholder={isEn ? '6-digit numeric PIN' : 'Masukkan 6-digit PIN'}
                          className={`w-44 px-3 py-1.5 border rounded-xl text-xs focus:outline-none ${
                            isDark ? 'bg-[#181a25] border-[#2b2e40] text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={handleSavePin}
                          style={{ backgroundColor: activeAccentHex }}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer"
                        >
                          <Lock className="w-3 h-3" />
                          <span>{isEn ? 'Save PIN' : 'Simpan'}</span>
                        </button>
                        {pinFeedback && (
                          <span style={{ color: activeAccentHex }} className="text-[11px] font-medium">
                            {pinFeedback}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 6: NOTIFICATIONS */}
              {activeTab === 'notifications' && (
                <div className={`divide-y ${isDark ? 'divide-[#212333]' : 'divide-slate-100'}`}>
                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className={titleCls}>{isEn ? 'Chat Status Updates' : 'Pembaruan Status Chat'}</div>
                      <div className={descCls}>{isEn ? 'Receive updates on replies and cloud sync status.' : 'Notifikasi progres balasan dan sinkronisasi cloud.'}</div>
                    </div>
                    {renderToggle(
                      settings.notifications?.statusUpdates !== false,
                      (val) =>
                        handleUpdate('notifications', {
                          soundEnabled: settings.notifications?.soundEnabled ?? true,
                          remindersEnabled: settings.notifications?.remindersEnabled ?? true,
                          inAppNotifications: settings.notifications?.inAppNotifications ?? true,
                          statusUpdates: val,
                        }),
                      'Chat Status Updates'
                    )}
                  </div>

                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className={titleCls}>{isEn ? 'Reminders & Schedule' : 'Pengingat & Agenda'}</div>
                      <div className={descCls}>{isEn ? 'Get notified about active reminders & tasks.' : 'Pengingat otomatis untuk jadwal dan catatan aktif.'}</div>
                    </div>
                    {renderToggle(
                      settings.notifications?.remindersEnabled !== false,
                      (val) =>
                        handleUpdate('notifications', {
                          soundEnabled: settings.notifications?.soundEnabled ?? true,
                          statusUpdates: settings.notifications?.statusUpdates ?? true,
                          inAppNotifications: settings.notifications?.inAppNotifications ?? true,
                          remindersEnabled: val,
                        }),
                      'Reminders'
                    )}
                  </div>

                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className={titleCls}>{isEn ? 'Notification Sound' : 'Efek Suara Notifikasi'}</div>
                      <div className={descCls}>{isEn ? 'Play subtle audio cues for notifications.' : 'Putar efek suara lembut saat ada pemberitahuan.'}</div>
                    </div>
                    {renderToggle(
                      settings.notifications?.soundEnabled !== false,
                      (val) =>
                        handleUpdate('notifications', {
                          statusUpdates: settings.notifications?.statusUpdates ?? true,
                          remindersEnabled: settings.notifications?.remindersEnabled ?? true,
                          inAppNotifications: settings.notifications?.inAppNotifications ?? true,
                          soundEnabled: val,
                        }),
                      'Notification Sound'
                    )}
                  </div>

                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className={titleCls}>{isEn ? 'In-App Alerts' : 'Notifikasi Dalam Aplikasi'}</div>
                      <div className={descCls}>{isEn ? 'Display subtle toast notifications while chatting.' : 'Tampilkan banner toast ringkas di dalam ruang chat.'}</div>
                    </div>
                    {renderToggle(
                      settings.notifications?.inAppNotifications !== false,
                      (val) =>
                        handleUpdate('notifications', {
                          soundEnabled: settings.notifications?.soundEnabled ?? true,
                          statusUpdates: settings.notifications?.statusUpdates ?? true,
                          remindersEnabled: settings.notifications?.remindersEnabled ?? true,
                          inAppNotifications: val,
                        }),
                      'In-App Alerts'
                    )}
                  </div>
                </div>
              )}

              {/* TAB 7: VOICE */}
              {activeTab === 'voice' && (
                <div className={`divide-y ${isDark ? 'divide-[#212333]' : 'divide-slate-100'}`}>
                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className={titleCls}>{isEn ? 'Voice Mode (Auto TTS)' : 'Respon Suara Otomatis (TTS)'}</div>
                      <div className={descCls}>{isEn ? 'Read Maria replies aloud automatically in chat.' : 'Bacakan balasan Maria dengan suara AI secara otomatis.'}</div>
                    </div>
                    {renderToggle(
                      Boolean(settings.voiceEnabled),
                      (val) => {
                        speechService.unlockAudio();
                        handleUpdate('voiceEnabled', val);
                      },
                      'Voice Mode'
                    )}
                  </div>

                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className={titleCls}>{isEn ? 'Voice Persona' : 'Karakter Suara AI'}</div>
                      <div className={descCls}>{isEn ? 'Choose gender & character voice (Gemini 3.8 TTS).' : 'Pilih karakter suara AI dari 6 persona tersedia.'}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <select
                        value={settings.voicePersona || 'wanita'}
                        onChange={(e) => {
                          const selected = VOICE_PERSONAS.find((p) => p.id === e.target.value);
                          handleUpdate({
                            voicePersona: e.target.value as any,
                            ...(selected ? { geminiVoice: selected.geminiVoice } : {}),
                          });
                        }}
                        className={selectCls}
                      >
                        {VOICE_PERSONAS.map((p) => (
                          <option key={p.id} value={p.id}>
                            {isEn ? EN_PERSONA_MAP[p.id]?.label || `${p.name} (${p.label})` : `${p.name} (${p.label})`}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          speechService.unlockAudio();
                          if (speechState.isSpeaking && speechState.activeMessageId === 'settings_test') {
                            speechService.stopSpeaking();
                          } else {
                            const sample = isEn
                              ? EN_PERSONA_MAP[activePersonaObj.id]?.sampleText || `Hello! I'm ${activePersonaObj.name}.`
                              : activePersonaObj.sampleText;
                            speechService.speak(sample, {
                              messageId: 'settings_test',
                              speed: settings.speechSpeed || '1x',
                              voiceName: settings.geminiVoice || activePersonaObj.geminiVoice,
                              personaId: activePersonaObj.id,
                              ttsModel: settings.ttsModel || 'gemini-3.8-flash-lite-tts',
                            });
                          }
                        }}
                        className={`${actionBtnCls} inline-flex items-center gap-1`}
                      >
                        {speechState.isLoading && speechState.activeMessageId === 'settings_test' ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : speechState.isSpeaking && speechState.activeMessageId === 'settings_test' ? (
                          <VolumeX className="w-3.5 h-3.5 text-rose-500" />
                        ) : (
                          <Volume2 className="w-3.5 h-3.5" style={{ color: activeAccentHex }} />
                        )}
                        <span>{speechState.isSpeaking && speechState.activeMessageId === 'settings_test' ? (isEn ? 'Stop' : 'Stop') : isEn ? 'Test' : 'Tes'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className={titleCls}>{isEn ? 'Vocal Timbre' : 'Timbre Vokal'}</div>
                      <div className={descCls}>{isEn ? 'Fine-tune Gemini AI Engine vocal tone.' : 'Sesuaikan karakter vokal pada mesin suara.'}</div>
                    </div>
                    <select
                      value={settings.geminiVoice || 'Aoede'}
                      onChange={(e) => handleUpdate('geminiVoice', e.target.value as any)}
                      className={selectCls}
                    >
                      {VOICE_TIMBRES.map((v) => (
                        <option key={v.id} value={v.id}>
                          {isEn ? v.labelEn : v.labelId}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className={titleCls}>{isEn ? 'Voice Language' : 'Bahasa Pengenalan Suara'}</div>
                      <div className={descCls}>{isEn ? 'Set speech-to-text dictation language.' : 'Bahasa dikte suara saat menggunakan mikrofon.'}</div>
                    </div>
                    <select
                      value={settings.voiceLanguage || 'auto'}
                      onChange={(e) => handleUpdate('voiceLanguage', e.target.value as any)}
                      className={selectCls}
                    >
                      <option value="auto">{isEn ? 'Auto' : 'Otomatis'}</option>
                      <option value="id-ID">Indonesia</option>
                      <option value="en-US">English</option>
                    </select>
                  </div>

                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className={titleCls}>{isEn ? 'Speaking Speed' : 'Kecepatan Bicara'}</div>
                      <div className={descCls}>{isEn ? 'Adjust voice playback tempo.' : 'Atur kecepatan pembacaan suara AI.'}</div>
                    </div>
                    <select
                      value={settings.speechSpeed || '1x'}
                      onChange={(e) => handleUpdate('speechSpeed', e.target.value as any)}
                      className={selectCls}
                    >
                      <option value="0.75x">{isEn ? '0.75x (Slow)' : '0.75x (Pelan)'}</option>
                      <option value="1x">{isEn ? '1x (Normal)' : '1x (Normal)'}</option>
                      <option value="1.25x">{isEn ? '1.25x (Fast)' : '1.25x (Cepat)'}</option>
                      <option value="1.5x">{isEn ? '1.5x (Faster)' : '1.5x (Sangat Cepat)'}</option>
                    </select>
                  </div>

                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className={titleCls}>{isEn ? 'Background Playback' : 'Pemutaran Latar Belakang'}</div>
                      <div className={descCls}>{isEn ? 'Keep voice active when switching views.' : 'Pertahankan suara tetap berjalan saat berpindah tab.'}</div>
                    </div>
                    {renderToggle(
                      Boolean(settings.backgroundVoice),
                      (v) => handleUpdate('backgroundVoice', v),
                      'Background Playback'
                    )}
                  </div>

                  <div className="py-3.5 space-y-2.5">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className={titleCls}>
                          {isEn
                            ? `Pronunciation Dictionary (${(settings.speechDictionary || []).length})`
                            : `Kamus Pengucapan (${(settings.speechDictionary || []).length})`}
                        </div>
                        <div className={descCls}>{isEn ? 'Custom pronunciation rules for special acronyms.' : 'Atur pelafalan khusus untuk istilah atau singkatan.'}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowDictEditor((s) => !s)}
                        className={`${actionBtnCls} inline-flex items-center gap-1`}
                      >
                        <span>{showDictEditor ? (isEn ? 'Hide' : 'Tutup') : isEn ? 'Manage' : 'Kelola'}</span>
                        {showDictEditor ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {showDictEditor && (
                      <div className="space-y-2 pt-1">
                        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
                          <input
                            type="text"
                            value={dictTerm}
                            onChange={(e) => setDictTerm(e.target.value)}
                            placeholder={isEn ? 'Term (e.g., API)' : 'Kata asli (misal: API)'}
                            className={`px-3 py-1.5 border rounded-xl text-xs focus:outline-none ${
                              isDark ? 'bg-[#181a25] border-[#2b2e40] text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                            }`}
                          />
                          <input
                            type="text"
                            value={dictPronunciation}
                            onChange={(e) => setDictPronunciation(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddDictionaryEntry()}
                            placeholder={isEn ? 'Sounds like (e.g., A-P-I)' : 'Cara baca (misal: E-Pi-Ai)'}
                            className={`px-3 py-1.5 border rounded-xl text-xs focus:outline-none ${
                              isDark ? 'bg-[#181a25] border-[#2b2e40] text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={handleAddDictionaryEntry}
                            style={{ backgroundColor: activeAccentHex }}
                            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white cursor-pointer"
                          >
                            {isEn ? 'Add' : 'Tambah'}
                          </button>
                        </div>

                        {(settings.speechDictionary || []).length > 0 && (
                          <div className={`divide-y rounded-xl border max-h-28 overflow-y-auto ${isDark ? 'border-[#252738] divide-[#212333] bg-[#12141c]' : 'border-slate-200 divide-slate-100 bg-slate-50/70'}`}>
                            {(settings.speechDictionary || []).map((entry) => (
                              <div key={entry.id} className="px-3 py-1.5 flex items-center justify-between text-xs">
                                <span className="truncate">
                                  <strong className={isDark ? 'text-white' : 'text-slate-900'}>{entry.term}</strong>
                                  <span className="mx-1.5 opacity-50">→</span>
                                  <span style={{ color: activeAccentHex }}>{entry.pronunciation || entry.term}</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveDictionaryEntry(entry.id)}
                                  className="text-neutral-400 hover:text-rose-500 p-0.5 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 8: DATA & PRIVACY */}
              {activeTab === 'privacy' && (
                <div className={`divide-y ${isDark ? 'divide-[#212333]' : 'divide-slate-100'}`}>
                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className={titleCls}>{isEn ? 'Save Conversation History' : 'Simpan Riwayat Percakapan'}</div>
                      <div className={descCls}>{isEn ? 'Sync chats automatically to Cloud Firestore.' : 'Simpan riwayat obrolan secara otomatis ke Cloud Firestore.'}</div>
                    </div>
                    {renderToggle(
                      settings.saveChatHistory !== false,
                      (v) => handleUpdate('saveChatHistory', v),
                      'Save History'
                    )}
                  </div>

                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className={titleCls}>{isEn ? 'Temporary Chat Mode' : 'Mode Obrolan Sementara'}</div>
                      <div className={descCls}>{isEn ? 'Do not save new chats to history or permanent memory.' : 'Chat baru tidak akan dicatat ke riwayat cloud maupun memori.'}</div>
                    </div>
                    {renderToggle(
                      Boolean(settings.temporaryChat),
                      (v) => handleUpdate('temporaryChat', v),
                      'Temporary Chat'
                    )}
                  </div>

                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className={titleCls}>
                        {isEn ? `Local Storage (${storageStats.totalLabel})` : `Penyimpanan Lokal (${storageStats.totalLabel})`}
                      </div>
                      <div className={descCls}>
                        {cacheNotice ||
                          (isEn
                            ? `Settings: ${storageStats.settingsLabel} • Memory: ${storageStats.memoryLabel} • Cache: ${storageStats.otherLabel}`
                            : `Setelan: ${storageStats.settingsLabel} • Memori: ${storageStats.memoryLabel} • Cache: ${storageStats.otherLabel}`)}
                      </div>
                    </div>
                    <button type="button" onClick={handleClearCache} className={actionBtnCls}>
                      {isEn ? 'Clear Cache' : 'Bersihkan'}
                    </button>
                  </div>

                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className={titleCls}>{isEn ? 'Export Account Data' : 'Ekspor Data Pengguna (JSON)'}</div>
                      <div className={descCls}>{isEn ? 'Download settings, memories & conversation backup.' : 'Unduh salinan pengaturan, memori, dan daftar obrolan.'}</div>
                    </div>
                    <button
                      type="button"
                      onClick={handleExportData}
                      className={`${actionBtnCls} inline-flex items-center gap-1.5`}
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{isEn ? 'Export' : 'Ekspor'}</span>
                    </button>
                  </div>

                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold text-rose-500">
                        {isEn ? 'Delete All Chat History' : 'Hapus Seluruh Riwayat Chat'}
                      </div>
                      <div className={descCls}>{isEn ? 'Requires 2FA PIN before permanent cloud deletion.' : 'Memerlukan otentikasi 2FA sebelum dihapus permanen.'}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onClearHistoryRequest();
                      }}
                      className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{isEn ? 'Delete' : 'Hapus'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 9: ACCOUNT */}
              {activeTab === 'account' && (
                <div className={`divide-y ${isDark ? 'divide-[#212333]' : 'divide-slate-100'}`}>
                  {user ? (
                    <div className="py-3.5 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        {user.photoURL ? (
                          <img
                            src={user.photoURL}
                            alt="Avatar"
                            className="w-10 h-10 rounded-xl object-cover shrink-0 border border-slate-300/30"
                          />
                        ) : (
                          <div
                            style={{ backgroundColor: activeAccentHex }}
                            className="w-10 h-10 rounded-xl text-white flex items-center justify-center font-bold text-sm shrink-0"
                          >
                            {(user.displayName || user.email || 'M')[0].toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className={`${titleCls} truncate`}>
                            {user.displayName || (isEn ? 'Maria AI User' : 'Pengguna Maria AI')}
                          </div>
                          <div className={`${descCls} truncate`}>{user.email}</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={signOut}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-500/15 text-rose-500 hover:bg-rose-500/25 cursor-pointer shrink-0"
                      >
                        {isEn ? 'Sign Out' : 'Keluar'}
                      </button>
                    </div>
                  ) : (
                    <div className="py-3.5 flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className={titleCls}>{isEn ? 'Guest Mode (Local)' : 'Mode Tamu (Lokal)'}</div>
                        <div className={descCls}>{isEn ? 'Sign in with Google to sync history & library to Cloud.' : 'Masuk dengan Google untuk sinkronisasi riwayat & pustaka.'}</div>
                      </div>
                      <button
                        type="button"
                        onClick={signIn}
                        className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 text-xs font-semibold inline-flex items-center gap-2 cursor-pointer shrink-0 shadow-xs"
                      >
                        <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                        </svg>
                        <span>{isEn ? 'Sign In' : 'Masuk Google'}</span>
                      </button>
                    </div>
                  )}

                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className={titleCls}>
                        {isEn ? 'Maria Subscription' : 'Langganan Maria PLUS'}
                      </div>
                      <div className={descCls}>
                        {settings.isPlus
                          ? isEn
                            ? 'PLUS Active • Full access to Deep Research & Studio.'
                            : 'PLUS Aktif • Akses penuh Deep Research, Musik & Gambar.'
                          : isEn
                            ? 'Free Tier • Upgrade for Deep Research & priority speed.'
                            : 'Versi Gratis • Upgrade untuk Deep Research & prioritas.'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenPlusModal?.();
                      }}
                      style={!settings.isPlus ? { backgroundColor: activeAccentHex } : undefined}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer shrink-0 ${
                        settings.isPlus ? actionBtnCls : 'text-white'
                      }`}
                    >
                      {settings.isPlus ? (isEn ? 'Manage' : 'Kelola') : isEn ? 'Upgrade PLUS' : 'Upgrade PLUS'}
                    </button>
                  </div>

                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className={titleCls}>{isEn ? 'Smart Model Quota Routing' : 'Routing Kuota Model AI'}</div>
                      <div className={descCls}>Gemini 2.5 Flash Lite · 2.5 Flash (Multimodal) · 3.8 Flash</div>
                    </div>
                    <span className="text-[11px] font-semibold text-emerald-500 shrink-0">
                      {isEn ? 'Optimal' : 'Optimal'}
                    </span>
                  </div>
                </div>
              )}

              {/* TAB 10: ABOUT */}
              {activeTab === 'about' && (
                <div className={`divide-y ${isDark ? 'divide-[#212333]' : 'divide-slate-100'}`}>
                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <div>
                      <div className={titleCls}>{isEn ? 'Application' : 'Aplikasi'}</div>
                      <div className={descCls}>Maria AI Assistant · Version 2.5</div>
                    </div>
                    <span className={`text-xs font-mono ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>v2.5</span>
                  </div>

                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <div>
                      <div className={titleCls}>{isEn ? 'Developer' : 'Pengembang'}</div>
                      <div className={descCls}>Created by Zan.Dev</div>
                    </div>
                    <Sliders className={`w-4 h-4 ${isDark ? 'text-neutral-500' : 'text-slate-400'}`} />
                  </div>

                  {[
                    {
                      label: isEn ? 'Help Center' : 'Pusat Bantuan',
                      desc: isEn ? 'Usage guides and common troubleshooting.' : 'Panduan penggunaan & tanya jawab umum.',
                      href: '/help.html',
                    },
                    {
                      label: isEn ? 'Terms of Service' : 'Ketentuan Layanan',
                      desc: isEn ? 'User agreement and platform guidelines.' : 'Aturan penggunaan layanan Maria AI.',
                      href: '/terms.html',
                    },
                    {
                      label: isEn ? 'Privacy Policy' : 'Kebijakan Privasi',
                      desc: isEn ? 'How your data and chats are handled.' : 'Transparansi pengelolaan data dan percakapan.',
                      href: '/privacy.html',
                    },
                    {
                      label: isEn ? 'Cookie Policy' : 'Kebijakan Cookie',
                      desc: isEn ? 'Local session and zero-ad cookie transparency.' : 'Informasi sesi lokal & bebas cookie iklan.',
                      href: '/cookies.html',
                    },
                  ].map((docItem) => (
                    <div key={docItem.href} className="py-3 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className={titleCls}>{docItem.label}</div>
                        <div className={descCls}>{docItem.desc}</div>
                      </div>
                      <a
                        href={docItem.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`${actionBtnCls} inline-flex items-center gap-1`}
                      >
                        <span>{isEn ? 'Open' : 'Buka'}</span>
                        <ExternalLink className="w-3 h-3 opacity-70" />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Clean Footer Bar */}
            <div
              className={`px-5 py-3 border-t flex items-center justify-between gap-3 shrink-0 ${
                isDark ? 'border-[#212333] bg-[#13141d]' : 'border-slate-100 bg-slate-50/70'
              }`}
            >
              <span
                className={`text-xs font-medium flex items-center gap-1.5 ${
                  savedSuccess
                    ? 'text-emerald-500'
                    : isDark
                    ? 'text-neutral-400'
                    : 'text-slate-500'
                }`}
              >
                {savedSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>{isEn ? 'Changes saved automatically' : 'Perubahan tersimpan otomatis'}</span>
                  </>
                ) : (
                  <span>{isEn ? 'Synced automatically' : 'Tersimpan otomatis'}</span>
                )}
              </span>

              <button
                type="button"
                onClick={() => {
                  triggerSavedIndicator();
                  onClose();
                }}
                style={{ backgroundColor: activeAccentHex }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-sm hover:opacity-95 cursor-pointer transition-opacity"
              >
                {isEn ? 'Done' : 'Selesai'}
              </button>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
});
