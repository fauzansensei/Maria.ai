import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Settings,
  Brain,
  Volume2,
  VolumeX,
  Loader2,
  MessageSquare,
  Shield,
  Layers,
  User,
  Moon,
  Sun,
  Laptop,
  Check,
  Sparkles,
  Database,
  Lock,
  Download,
  Trash2,
  ExternalLink,
  Cookie,
  Plus,
  Search,
  Bell,
  HardDrive,
  BookOpen,
  Zap,
  Globe,
  Info,
  KeyRound,
  EyeOff,
  Sliders,
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
  onOpenDefcon?: () => void;
  onOpenPlusModal?: () => void;
  conversations?: Conversation[];
}

type TabType = 'general' | 'ai-memory' | 'voice' | 'chat' | 'privacy' | 'integrations' | 'account';

interface SettingSearchItem {
  id: string;
  title: string;
  description: string;
  tab: TabType;
  tabLabel: string;
  keywords: string;
}

const getSearchIndex = (isEn: boolean): SettingSearchItem[] => [
  { id: 'nickname', title: isEn ? 'User Display Name' : 'Nama Panggilan Pengguna', description: isEn ? 'Your personal greeting name' : 'Nama sapaan pribadi Anda', tab: 'general', tabLabel: 'General', keywords: 'nama name nickname user profil profile' },
  { id: 'appearance', title: isEn ? 'Theme & Appearance Mode (System / Dark / Light)' : 'Tema & Mode Tampilan (System / Gelap / Terang)', description: isEn ? 'Set interface to System, OLED Dark, or Light mode' : 'Atur tampilan mengikuti sistem, gelap OLED, atau terang', tab: 'general', tabLabel: 'General', keywords: 'theme dark light system oled mode gelap terang putih hitam penampilan appearance' },
  { id: 'accent', title: isEn ? 'Accent Color' : 'Warna Aksen (Accent Color)', description: isEn ? 'Choose Maria AI accent highlight color' : 'Pilih warna aksen antarmuka Maria AI', tab: 'general', tabLabel: 'General', keywords: 'warna accent color biru blue cyan emerald sky violet amber rose' },
  { id: 'language', title: isEn ? 'Interface Language' : 'Bahasa Antarmuka', description: isEn ? 'Indonesian or English (US)' : 'Bahasa Indonesia atau English', tab: 'general', tabLabel: 'General', keywords: 'language bahasa interface indonesia english' },
  { id: 'fast-answers', title: isEn ? 'Fast Answers' : 'Jawaban Cepat (Fast Answers)', description: isEn ? 'Prioritize concise low-latency responses' : 'Prioritaskan respons ringkas berlatensi rendah', tab: 'general', tabLabel: 'General', keywords: 'fast answers cepat kecerdasan intelligence' },
  { id: 'web-search', title: isEn ? 'Automatic Web Search' : 'Pencarian Web Otomatis', description: isEn ? 'Enable live Google Search by default' : 'Aktifkan penelusuran Google Search secara default', tab: 'general', tabLabel: 'General', keywords: 'web search pencarian google default' },
  { id: 'homepage-suggestions', title: isEn ? 'Home Topic Suggestions' : 'Saran Topik Beranda', description: isEn ? 'Show quick starter prompts on empty chat screen' : 'Tampilkan contoh topik mulai cepat di layar kosong', tab: 'general', tabLabel: 'General', keywords: 'saran homepage suggestions beranda topik' },
  { id: 'tone', title: isEn ? 'Response Style & Maria Persona' : 'Gaya Respon & Persona Maria', description: isEn ? 'Professional, Warm, Creative, Technical, Minimalist' : 'Profesional, Ramah, Kreatif, Teknis, Minimalis', tab: 'ai-memory', tabLabel: 'AI & Memory', keywords: 'tone gaya respon persona kepribadian' },
  { id: 'language-style', title: isEn ? 'Speech & Vocabulary Style' : 'Gaya Bahasa (Baku / Santai / Gaul / Puitis / Teknis)', description: isEn ? 'Choose Maria phrasing and greeting style' : 'Pilih gaya kosakata dan sapaan Maria', tab: 'ai-memory', tabLabel: 'AI & Memory', keywords: 'gaya bahasa baku santai gaul puitis teknis personality sapaan style' },
  { id: 'traits', title: isEn ? 'Personality Traits (Warmth, Enthusiasm, Structured)' : 'Sifat Kepribadian (Kehangatan, Antusias, Terstruktur)', description: isEn ? 'Fine-tune how Maria presents answers' : 'Atur detail gaya penyampaian Maria', tab: 'ai-memory', tabLabel: 'AI & Memory', keywords: 'personality traits kehangatan warmth antusias terstruktur structured customize' },
  { id: 'custom-prompt', title: isEn ? 'Custom Instructions & Personality Prompt' : 'Instruksi Kustom (Custom Prompt)', description: isEn ? 'Define custom personality & rules for Maria' : 'Atur kepribadian & aturan khusus cara Maria menjawab', tab: 'ai-memory', tabLabel: 'AI & Memory', keywords: 'custom prompt instruksi khusus personality kepribadian' },
  { id: 'memory-summary', title: isEn ? 'Memory Summary & Personal Notes' : 'Ringkasan Memori & Catatan Personal', description: isEn ? 'Manage saved memories and auto summary' : 'Kelola memori tersimpan dan ringkasan otomatis', tab: 'ai-memory', tabLabel: 'AI & Memory', keywords: 'memory summary memori fakta personal' },
  { id: 'voice-auto', title: isEn ? 'Automatic AI Voice Responses (TTS)' : 'Respon Suara AI Otomatis (TTS)', description: isEn ? 'Read Maria replies aloud automatically' : 'Bacakan balasan Maria dengan suara otomatis', tab: 'voice', tabLabel: 'Voice & Audio', keywords: 'tts suara voice otomatis audio' },
  { id: 'voice-lang', title: isEn ? 'Voice Recognition & Background Audio' : 'Bahasa Pengenalan Suara & Latar Belakang', description: isEn ? 'Dictation language and background playback' : 'Bahasa dikte suara dan percakapan latar belakang', tab: 'voice', tabLabel: 'Voice & Audio', keywords: 'voice language dikte background audio' },
  { id: 'voice-dict', title: isEn ? 'Pronunciation Dictionary' : 'Kamus Pengucapan (Dictionary)', description: isEn ? 'Customize pronunciation of special terms' : 'Atur pelafalan istilah atau singkatan khusus', tab: 'voice', tabLabel: 'Voice & Audio', keywords: 'dictionary kamus pengucapan' },
  { id: 'temp-chat', title: isEn ? 'Temporary Chat' : 'Obrolan Sementara (Temporary Chat)', description: isEn ? 'Conversations are not saved to history or cloud' : 'Percakapan tidak disimpan ke riwayat atau database', tab: 'chat', tabLabel: 'Chat & Prompt', keywords: 'temporary chat sementara incognito privasi' },
  { id: 'notifications', title: isEn ? 'Notification Preferences' : 'Preferensi Notifikasi', description: isEn ? 'Chat status, reminders, and notification sounds' : 'Notifikasi status chat, pengingat, dan suara', tab: 'chat', tabLabel: 'Chat & Prompt', keywords: 'notifications notifikasi pengingat reminder' },
  { id: 'about', title: isEn ? 'About, Help & Terms' : 'Tentang, Bantuan & Ketentuan (About)', description: isEn ? 'Help center, terms of service, privacy policy' : 'Pusat bantuan, ketentuan layanan, kebijakan privasi', tab: 'chat', tabLabel: 'Chat & Prompt', keywords: 'about help terms privacy cookies bantuan' },
  { id: 'safety', title: isEn ? 'Content Safety Filter' : 'Keamanan Konten (Safety Filter)', description: isEn ? 'Reduce sensitive content in responses & search' : 'Kurangi konten sensitif dalam respon & pencarian', tab: 'privacy', tabLabel: 'Privacy & Data', keywords: 'safety sensitif filter aman' },
  { id: 'security-pin', title: isEn ? '2FA Security PIN & Session Lock' : 'PIN Keamanan 2FA & Kunci Sesi', description: isEn ? 'Set a 6-digit PIN for sensitive actions' : 'Atur PIN 6-digit untuk tindakan sensitif', tab: 'privacy', tabLabel: 'Privacy & Data', keywords: 'security pin 2fa password login kunci' },
  { id: 'storage', title: isEn ? 'Local Storage & Cache' : 'Penyimpanan Lokal & Cache', description: isEn ? 'Inspect storage footprint and clear temporary cache' : 'Lihat penggunaan penyimpanan dan bersihkan cache', tab: 'privacy', tabLabel: 'Privacy & Data', keywords: 'storage cache penyimpanan memori lokal' },
  { id: 'export', title: isEn ? 'Export Data (JSON)' : 'Ekspor Data (JSON)', description: isEn ? 'Download backup of settings, memories, and chats' : 'Unduh cadangan pengaturan, memori, dan riwayat chat', tab: 'privacy', tabLabel: 'Privacy & Data', keywords: 'export data json download unduh cadangan' },
  { id: 'plugins', title: isEn ? 'Plugins & Connectors' : 'Plugins & Konektor Maria', description: isEn ? 'Manage Search, Maps, Image Studio, Science Scout' : 'Kelola kapabilitas Search, Maps, Image Studio, Science Scout', tab: 'integrations', tabLabel: 'Integrations', keywords: 'plugins konektor integrations search maps' },
  { id: 'usage', title: isEn ? 'Usage & Model Limits' : 'Penggunaan & Batas Model (Usage)', description: isEn ? 'Gemini model quota status and subscription plan' : 'Status kuota model Gemini dan paket langganan', tab: 'account', tabLabel: 'Account', keywords: 'usage limits kuota akun workspace upgrade plus' },
];

const EN_TONE_MAP: Record<string, { label: string; description: string }> = {
  Professional: {
    label: 'Professional & Formal',
    description: 'Neat, polite, courteous, and well-structured language suited for work.',
  },
  Warm: {
    label: 'Warm & Friendly',
    description: 'Empathetic, approachable, attentive, and reassuring.',
  },
  Creative: {
    label: 'Creative & Energetic',
    description: 'Full of fresh ideas, unique analogies, expressive and spirited.',
  },
  Technical: {
    label: 'Technical & Precise',
    description: 'Highly logical, scientific, focused on data, code, or technical facts.',
  },
  Minimalist: {
    label: 'Minimalist & Concise',
    description: 'Super concise answers, straight to the point, word-efficient.',
  },
};

const EN_PERSONA_MAP: Record<
  string,
  { label: string; category: string; description: string; sampleText: string }
> = {
  wanita: {
    label: 'Adult Female',
    category: 'Adult',
    description: 'Warm, friendly, graceful, and expressive',
    sampleText: "Hello, I'm Maria. It's wonderful to assist you today.",
  },
  pria: {
    label: 'Adult Male',
    category: 'Adult',
    description: 'Authoritative, calm, steady, and trustworthy',
    sampleText: "Hello, I'm Mario. Ready to help with your analysis and tasks.",
  },
  'remaja-perempuan': {
    label: 'Teen Female',
    category: 'Teen',
    description: 'Cheerful, relaxed, lively, and approachable',
    sampleText: "Hey! I'm Maya. Let's explore something fun together today!",
  },
  'remaja-laki': {
    label: 'Teen Male',
    category: 'Teen',
    description: 'Energetic, dynamic, casual, and engaging',
    sampleText: "Hi! I'm Max. What interesting topic should we dive into?",
  },
  'anak-perempuan': {
    label: 'Young Girl',
    category: 'Kids',
    description: 'Sweet, joyful, bright, and cheerful',
    sampleText: "Hi there! I'm Mia, let's learn and share stories together!",
  },
  'anak-laki': {
    label: 'Young Boy',
    category: 'Kids',
    description: 'Playful, energetic, curious, and full of wonder',
    sampleText: "Hello! I'm Milo! I have lots of fun questions to explore!",
  },
};

const EN_PLUGIN_MAP: Record<string, { name: string; category: string; description: string }> = {
  'google-search': {
    name: 'Google Search Grounding',
    category: 'Real-time Search',
    description: 'Live web browsing & latest news facts directly from Google.',
  },
  'google-maps': {
    name: 'Google Maps Explorer',
    category: 'Location & Navigation',
    description: 'Place search, travel routes, and nearby location recommendations.',
  },
  'image-studio': {
    name: 'AI Image Studio',
    category: 'Visuals & Creation',
    description: 'Image generation and editing powered by Nano Banana & Flux.',
  },
  'science-scout': {
    name: 'Science Scout (PubMed / UniProt / PDB)',
    category: 'Scientific Research',
    description: 'Direct access to biomedical journals, protein databases & 3D structures.',
  },
  'voice-engine': {
    name: 'Gemini AI Voice Engine',
    category: 'Audio & TTS',
    description: 'Natural voice synthesis with 6 personas & voice dictation support.',
  },
  'canvas-code': {
    name: 'Canvas Code & App Launcher',
    category: 'Productivity',
    description: 'Interactive code editor and Windows Open app launcher.',
  },
};

const LANGUAGE_STYLE_OPTIONS = [
  { value: 'Baku', labelEn: 'Formal' },
  { value: 'Santai', labelEn: 'Casual' },
  { value: 'Gaul', labelEn: 'Slang' },
  { value: 'Puitis', labelEn: 'Poetic' },
  { value: 'Teknis', labelEn: 'Technical' },
] as const;

export const SettingsDashboard: React.FC<SettingsDashboardProps> = React.memo(({
  isOpen,
  onClose,
  onClearHistoryRequest,
  settings: propSettings,
  onUpdateSettings,
  onOpenDefcon,
  onOpenPlusModal,
  conversations = [],
}) => {
  const { user, signIn, signOut } = useAuth();
  const { theme, isDark, setTheme, toggleTheme } = useTheme();
  const { isEn } = useLanguage();

  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [searchQuery, setSearchQuery] = useState('');
  const [speechState, setSpeechState] = useState<SpeechState>(() => speechService.getState());
  const [memories, setMemories] = useState<UserMemory[]>(() => userMemoryService.getMemories());
  const [newMemoryText, setNewMemoryText] = useState('');
  const [newMemoryCategory, setNewMemoryCategory] = useState<UserMemory['category']>('personal');

  // Voice Dictionary inputs
  const [dictTerm, setDictTerm] = useState('');
  const [dictPronunciation, setDictPronunciation] = useState('');

  // Security PIN input
  const [pinDraft, setPinDraft] = useState('');
  const [pinFeedback, setPinFeedback] = useState<string | null>(null);

  // Storage meter state
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

  // Search results filter (normalizes punctuation and matches multi-word terms)
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

  // Auto-synthesized Memory Summary
  const computedMemorySummary = useMemo(() => {
    if (memories.length === 0) {
      return isEn
        ? 'No personal memories saved yet. Add facts manually or start chatting with Maria.'
        : 'Belum ada memori personal yang tersimpan. Tambahkan fakta atau mulai percakapan dengan Maria.';
    }
    const personalCount = memories.filter((m) => m.category === 'personal').length;
    const prefCount = memories.filter((m) => m.category === 'preferences').length;
    const workCount = memories.filter((m) => m.category === 'work').length;
    const highlights = memories.slice(0, 3).map((m) => m.text).join(' • ');
    return isEn
      ? `${memories.length} active notes (${personalCount} personal, ${prefCount} preferences, ${workCount} work). Highlights: ${highlights}`
      : `${memories.length} catatan aktif (${personalCount} personal, ${prefCount} preferensi, ${workCount} pekerjaan). Sorotan terbaru: ${highlights}`;
  }, [memories, isEn]);

  // LocalStorage real footprint calculation (only runs when Privacy & Data tab is visible)
  const storageStats = useMemo(() => {
    void storageRefreshTick;
    if (!isOpen || activeTab !== 'privacy') {
      return {
        totalBytes: 0,
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
        if (key === 'maria_settings' || key === 'maria_theme') {
          settingsBytes += bytes;
        } else if (key === 'maria_user_memories') {
          memoryBytes += bytes;
        } else {
          otherBytes += bytes;
        }
      }
    } catch {}

    const formatKB = (b: number) => (b < 1024 ? `${b} B` : `${(b / 1024).toFixed(1)} KB`);
    return {
      totalBytes,
      totalLabel: formatKB(totalBytes),
      settingsLabel: formatKB(settingsBytes),
      memoryLabel: formatKB(memoryBytes),
      otherLabel: formatKB(otherBytes),
    };
  }, [storageRefreshTick, isOpen, activeTab, memories.length]);

  if (!isOpen) return null;

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

    setSavedSuccess(true);
    if (activeTab === 'privacy') {
      setStorageRefreshTick((t) => t + 1);
    }
    if (savedTimeoutRef.current) window.clearTimeout(savedTimeoutRef.current);
    savedTimeoutRef.current = window.setTimeout(() => setSavedSuccess(false), 1600);
  };

  const handleSelectTheme = (nextTheme: 'system' | 'dark' | 'light') => {
    setTheme(nextTheme);
    if (user?.uid) {
      if (themeSyncTimeoutRef.current) window.clearTimeout(themeSyncTimeoutRef.current);
      themeSyncTimeoutRef.current = window.setTimeout(() => {
        updateUserProfile(user.uid, { theme: nextTheme }).catch(() => {});
      }, 450);
    }
  };

  const handleToggleTheme = () => {
    const resolvedTheme = toggleTheme();
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
      setPinFeedback(isEn ? 'PIN must be exactly 6 numeric digits.' : 'PIN harus tepat 6 digit angka.');
      return;
    }
    handleUpdate({
      securityPin: clean,
      twoFactorEnabled: true,
      lastSecurityCheck: new Date().toISOString(),
    });
    setPinFeedback(isEn ? '6-digit security PIN saved & active.' : 'PIN keamanan 6-digit tersimpan & aktif.');
    setTimeout(() => setPinFeedback(null), 3000);
  };

  const handleClearCache = () => {
    try {
      const keepKeys = new Set(['maria_settings', 'maria_theme', 'maria_user_memories']);
      const keysToDelete: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && !keepKeys.has(k)) {
          keysToDelete.push(k);
        }
      }
      keysToDelete.forEach((k) => localStorage.removeItem(k));
      speechService.setDictionary(settings.speechDictionary || []);
      setStorageRefreshTick((t) => t + 1);
      setCacheNotice(
        isEn
          ? `Cleared ${keysToDelete.length} temporary cache entries.`
          : `${keysToDelete.length} entri cache sementara berhasil dibersihkan.`
      );
      setTimeout(() => setCacheNotice(null), 3000);
    } catch {
      setCacheNotice(isEn ? 'Failed to clear local cache.' : 'Gagal membersihkan cache lokal.');
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
      conversations: conversations.map((c) => ({
        id: c.id,
        title: c.title,
        mode: c.mode,
      })),
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

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'general', label: 'General', icon: <Settings className="w-4 h-4" /> },
    { id: 'ai-memory', label: 'AI & Memory', icon: <Brain className="w-4 h-4" /> },
    { id: 'voice', label: 'Voice & Audio', icon: <Volume2 className="w-4 h-4" /> },
    { id: 'chat', label: 'Chat & Prompt', icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'privacy', label: 'Privacy & Data', icon: <Shield className="w-4 h-4" /> },
    { id: 'integrations', label: 'Integrations', icon: <Layers className="w-4 h-4" /> },
    { id: 'account', label: 'Account', icon: <User className="w-4 h-4" /> },
  ];

  const activePluginIds = settings.enabledPlugins || MARIA_PLUGINS.map((p) => p.id);

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 ${isDark ? 'bg-black/80' : 'bg-slate-900/50'}`}>
      <div
        className={`relative w-full max-w-3xl border rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] ${
          isDark
            ? 'bg-[#111218] border-[#252737] text-white'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Top Header */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-b ${
            isDark
              ? 'border-[#212332] bg-[#151620]'
              : 'border-slate-200 bg-slate-50/80'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center border"
              style={{
                backgroundColor: `${activeAccentHex}22`,
                borderColor: `${activeAccentHex}45`,
                color: activeAccentHex,
              }}
            >
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className={`text-base font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {isEn ? 'Maria AI Settings' : 'Pengaturan Maria AI'}
                </h3>
                {savedSuccess && (
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                      isDark
                        ? 'text-[#60a5fa] bg-[#2563eb]/20 border-[#2563eb]/30'
                        : 'text-blue-600 bg-blue-50 border-blue-200'
                    }`}
                  >
                    <Check className="w-3 h-3" /> {isEn ? 'Saved' : 'Tersimpan'}
                  </span>
                )}
              </div>
              <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>
                {isEn ? 'Customize appearance, intelligence, memory, voice, and security' : 'Sesuaikan tampilan, kecerdasan, memori, suara, dan keamanan'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleToggleTheme}
              title={isDark ? (isEn ? 'Switch to Light Mode' : 'Beralih ke Mode Terang') : (isEn ? 'Switch to Dark Mode' : 'Beralih ke Mode Gelap')}
              className={`w-8 h-8 rounded-xl border flex items-center justify-center cursor-pointer ${
                isDark
                  ? 'border-[#2d3042] bg-[#1b1d28] text-amber-300 hover:bg-[#252838]'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
              }`}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              aria-label={isEn ? 'Close Settings' : 'Tutup Pengaturan'}
              className={`p-1.5 rounded-xl cursor-pointer ${
                isDark
                  ? 'text-neutral-400 hover:text-white hover:bg-[#232535]'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 7 Tab Navigation Bar */}
        <div
          className={`flex items-center px-4 py-2 border-b overflow-x-auto scrollbar-none gap-1.5 ${
            isDark
              ? 'border-[#1d1f2c] bg-[#13141c]'
              : 'border-slate-200 bg-slate-50/50'
          }`}
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSearchQuery('');
                }}
                style={isActive ? { backgroundColor: activeAccentHex } : undefined}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'text-white shadow-sm font-semibold'
                    : isDark
                    ? 'text-neutral-400 hover:text-white hover:bg-[#1c1e2a]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search Settings Bar */}
        <div
          className={`px-6 pt-3 pb-2 border-b ${
            isDark
              ? 'bg-[#111218] border-[#1c1e2a]'
              : 'bg-white border-slate-100'
          }`}
        >
          <div className="relative">
            <Search className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${isDark ? 'text-neutral-500' : 'text-slate-400'}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isEn ? 'Search settings (e.g., theme, accent, memory, dictionary, export, pin)...' : 'Cari pengaturan (misal: tema, aksen, memori, kamus, sementara, ekspor, pin)...'}
              className={`w-full pl-9 pr-8 py-2 border rounded-xl text-xs focus:outline-none focus:border-[#2563eb] ${
                isDark
                  ? 'bg-[#171923] border-[#262838] text-white placeholder-neutral-500'
                  : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
              }`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className={`absolute right-2.5 top-1/2 -translate-y-1/2 ${isDark ? 'text-neutral-400 hover:text-white' : 'text-slate-400 hover:text-slate-700'}`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {searchQuery.trim() && (
            <div
              className={`mt-2 max-h-44 overflow-y-auto rounded-xl border divide-y shadow-lg ${
                isDark
                  ? 'border-[#262838] bg-[#151722] divide-[#212332]'
                  : 'border-slate-200 bg-white divide-slate-100'
              }`}
            >
              {searchResults.length === 0 ? (
                <div className={`p-3 text-xs text-center ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>
                  {isEn ? `No settings matched "${searchQuery}".` : `Tidak ada pengaturan yang cocok dengan "${searchQuery}".`}
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
                    className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between gap-3 cursor-pointer ${
                      isDark ? 'hover:bg-[#1e2130]' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className={`text-xs font-semibold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{res.title}</div>
                      <div className={`text-[11px] truncate ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>{res.description}</div>
                    </div>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg shrink-0 ${
                        isDark ? 'bg-[#2563eb]/15 text-[#60a5fa]' : 'bg-blue-50 text-blue-600'
                      }`}
                    >
                      {res.tabLabel}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Body View for Active Tab */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: GENERAL */}
          {activeTab === 'general' && (
            <div className="space-y-5">
              <div>
                <label className={`text-xs font-semibold block mb-1.5 ${isDark ? 'text-neutral-300' : 'text-slate-700'}`}>
                  {isEn ? 'User Display Name' : 'Nama Panggilan Pengguna'}
                </label>
                <input
                  type="text"
                  value={settings.username}
                  onChange={(e) => handleUpdate('username', e.target.value)}
                  placeholder={isEn ? 'Example: Basit' : 'Contoh: Basit'}
                  className={`w-full px-3.5 py-2.5 border rounded-xl text-xs focus:outline-none focus:border-[#2563eb] ${
                    isDark
                      ? 'bg-[#181a24] border-[#292c3d] text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className={`text-xs font-semibold block mb-2 ${isDark ? 'text-neutral-300' : 'text-slate-700'}`}>
                  {isEn ? 'Theme & Appearance Mode' : 'Tema & Mode Tampilan'}
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => handleSelectTheme('system')}
                    className={`p-3.5 rounded-2xl border text-xs font-medium flex flex-col items-center gap-2 cursor-pointer ${
                      theme === 'system'
                        ? isDark
                          ? 'bg-[#2563eb]/15 border-[#2563eb] text-[#60a5fa]'
                          : 'bg-blue-50 border-[#2563eb] text-blue-700'
                        : isDark
                        ? 'bg-[#181a24] border-[#292c3d] text-neutral-400 hover:border-neutral-700'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <Laptop className="w-5 h-5" />
                    <span>{isEn ? 'Follow System' : 'Ikuti Sistem'}</span>
                    <span className="text-[10px] opacity-70">{isEn ? 'Automatic' : 'Otomatis'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectTheme('dark')}
                    className={`p-3.5 rounded-2xl border text-xs font-medium flex flex-col items-center gap-2 cursor-pointer ${
                      theme === 'dark'
                        ? isDark
                          ? 'bg-[#2563eb]/15 border-[#2563eb] text-[#60a5fa]'
                          : 'bg-blue-50 border-[#2563eb] text-blue-700'
                        : isDark
                        ? 'bg-[#181a24] border-[#292c3d] text-neutral-400 hover:border-neutral-700'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <Moon className="w-5 h-5" />
                    <span>{isEn ? 'OLED Dark Mode' : 'Mode Gelap OLED'}</span>
                    <span className="text-[10px] opacity-70">{isEn ? 'Power Saving' : 'Hemat Energi'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectTheme('light')}
                    className={`p-3.5 rounded-2xl border text-xs font-medium flex flex-col items-center gap-2 cursor-pointer ${
                      theme === 'light'
                        ? isDark
                          ? 'bg-[#2563eb]/15 border-[#2563eb] text-[#60a5fa]'
                          : 'bg-blue-50 border-[#2563eb] text-blue-700'
                        : isDark
                        ? 'bg-[#181a24] border-[#292c3d] text-neutral-400 hover:border-neutral-700'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <Sun className="w-5 h-5" />
                    <span>{isEn ? 'Light Mode' : 'Mode Terang'}</span>
                    <span className="text-[10px] opacity-70">{isEn ? 'Crisp White' : 'Standar Putih'}</span>
                  </button>
                </div>
              </div>

              {/* Accent Color */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className={`text-xs font-semibold ${isDark ? 'text-neutral-300' : 'text-slate-700'}`}>
                    {isEn ? 'Accent Color' : 'Warna Aksen (Accent Color)'}
                  </label>
                  <span className={`text-[11px] ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>
                    {ACCENT_COLORS.find((a) => a.id === (settings.accentColor || 'blue'))?.label}
                  </span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {ACCENT_COLORS.map((acc) => {
                    const isSelected = (settings.accentColor || 'blue') === acc.id;
                    return (
                      <button
                        key={acc.id}
                        type="button"
                        onClick={() => handleUpdate('accentColor', acc.id)}
                        className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 cursor-pointer ${
                          isSelected
                            ? isDark
                              ? 'bg-[#1d2030] border-white/50 text-white'
                              : 'bg-slate-100 border-slate-400 text-slate-900 shadow-xs'
                            : isDark
                            ? 'bg-[#181a24] border-[#27293a] text-neutral-400 hover:text-white'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <span
                          className="w-5 h-5 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: acc.hex }}
                        >
                          {isSelected && <Check className="w-3 h-3 text-white stroke-[3]" />}
                        </span>
                        <span className="text-[10px] font-medium truncate max-w-full">{acc.label.split(' ')[0]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className={`text-xs font-semibold block mb-1.5 ${isDark ? 'text-neutral-300' : 'text-slate-700'}`}>
                  {isEn ? 'Interface Language' : 'Bahasa Antarmuka'}
                </label>
                <select
                  value={settings.language || 'Indonesia'}
                  onChange={(e) => handleUpdate('language', e.target.value as any)}
                  className={`w-full px-3.5 py-2.5 border rounded-xl text-xs focus:outline-none focus:border-[#2563eb] ${
                    isDark
                      ? 'bg-[#181a24] border-[#292c3d] text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                >
                  <option value="Indonesia">Bahasa Indonesia</option>
                  <option value="English">English (US)</option>
                </select>
              </div>

              {/* Intelligence & Experience Toggles */}
              <div className="space-y-2.5 pt-1">
                <label className={`text-xs font-semibold block ${isDark ? 'text-neutral-300' : 'text-slate-700'}`}>
                  {isEn ? 'Intelligence & Home Preferences' : 'Kecerdasan & Preferensi Beranda'}
                </label>

                <div
                  className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
                    isDark ? 'bg-[#171923] border-[#27293a]' : 'bg-slate-50/90 border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <div className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {isEn ? 'Fast Answers' : 'Jawaban Cepat (Fast Answers)'}
                      </div>
                      <div className={`text-[11px] ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>
                        {isEn ? 'Prioritize shorter, straight-to-the-point responses' : 'Prioritaskan jawaban lebih singkat dan langsung ke inti'}
                      </div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(settings.fastAnswers)}
                    onChange={(e) => handleUpdate('fastAnswers', e.target.checked)}
                    className="w-4 h-4 accent-[#2563eb] rounded cursor-pointer"
                  />
                </div>

                <div
                  className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
                    isDark ? 'bg-[#171923] border-[#27293a]' : 'bg-slate-50/90 border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Globe className="w-4 h-4 text-sky-400 shrink-0" />
                    <div>
                      <div className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {isEn ? 'Auto Web Search (Google Search)' : 'Pencarian Web Otomatis (Google Search)'}
                      </div>
                      <div className={`text-[11px] ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>
                        {isEn ? 'Enable real-time web browsing as default behavior' : 'Aktifkan penelusuran web real-time sebagai setelan bawaan'}
                      </div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.webSearchDefault !== false}
                    onChange={(e) => {
                      const val = e.target.checked;
                      try {
                        localStorage.setItem('maria_web_search_active', String(val));
                      } catch {}
                      handleUpdate('webSearchDefault', val);
                    }}
                    className="w-4 h-4 accent-[#2563eb] rounded cursor-pointer"
                  />
                </div>

                <div
                  className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
                    isDark ? 'bg-[#171923] border-[#27293a]' : 'bg-slate-50/90 border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
                    <div>
                      <div className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {isEn ? 'Home Topic Suggestions' : 'Saran Topik Beranda'}
                      </div>
                      <div className={`text-[11px] ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>
                        {isEn ? 'Show quick starter prompt chips on empty chat screen' : 'Tampilkan kartu ide cepat di halaman obrolan kosong'}
                      </div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.homepageSuggestions !== false}
                    onChange={(e) => handleUpdate('homepageSuggestions', e.target.checked)}
                    className="w-4 h-4 accent-[#2563eb] rounded cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: AI & MEMORY */}
          {activeTab === 'ai-memory' && (
            <div className="space-y-5">
              <div>
                <label className={`text-xs font-semibold block mb-2 ${isDark ? 'text-neutral-300' : 'text-slate-700'}`}>
                  {isEn ? 'Maria Response Style & Persona' : 'Gaya Respon & Persona Maria'}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {TONE_OPTIONS.map((tone) => {
                    const toneDisplay = isEn ? EN_TONE_MAP[tone.value] || tone : tone;
                    const active = settings.tone === tone.value;
                    return (
                      <button
                        key={tone.value}
                        type="button"
                        onClick={() => handleUpdate('tone', tone.value)}
                        className={`p-3 rounded-xl border text-left cursor-pointer ${
                          active
                            ? isDark
                              ? 'bg-[#2563eb]/15 border-[#2563eb] text-white'
                              : 'bg-blue-50 border-[#2563eb] text-blue-900'
                            : isDark
                              ? 'bg-[#181a24] border-[#262838] text-neutral-300 hover:border-neutral-700'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold">{toneDisplay.label}</span>
                          {active && (
                            <Check className={`w-3.5 h-3.5 shrink-0 ${isDark ? 'text-[#60a5fa]' : 'text-blue-600'}`} />
                          )}
                        </div>
                        <div className={`text-[10px] line-clamp-2 mt-0.5 ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>
                          {toneDisplay.description}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Personality Traits (Warmth, Enthusiasm, Headings/Lists) */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Sliders className={`w-3.5 h-3.5 ${isDark ? 'text-[#60a5fa]' : 'text-blue-600'}`} />
                  <label className={`text-xs font-semibold ${isDark ? 'text-neutral-300' : 'text-slate-700'}`}>
                    {isEn ? 'Response Personality Traits' : 'Sifat Kepribadian Respon (Traits)'}
                  </label>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <label
                    className={`p-3 rounded-xl border flex items-center justify-between gap-2 cursor-pointer ${
                      isDark ? 'bg-[#171923] border-[#27293a]' : 'bg-slate-50/90 border-slate-200'
                    }`}
                  >
                    <div>
                      <div className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {isEn ? 'Warmth' : 'Kehangatan'}
                      </div>
                      <div className={`text-[10px] ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>
                        {isEn ? 'Empathetic & approachable' : 'Empatik & bersahabat'}
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.personalityWarmth !== false}
                      onChange={(e) => handleUpdate('personalityWarmth', e.target.checked)}
                      className="w-4 h-4 accent-[#2563eb] rounded"
                    />
                  </label>

                  <label
                    className={`p-3 rounded-xl border flex items-center justify-between gap-2 cursor-pointer ${
                      isDark ? 'bg-[#171923] border-[#27293a]' : 'bg-slate-50/90 border-slate-200'
                    }`}
                  >
                    <div>
                      <div className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {isEn ? 'Enthusiasm' : 'Antusiasme'}
                      </div>
                      <div className={`text-[10px] ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>
                        {isEn ? 'Expressive & energetic' : 'Ekspresif & energik'}
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={Boolean(settings.personalityEnthusiasm)}
                      onChange={(e) => handleUpdate('personalityEnthusiasm', e.target.checked)}
                      className="w-4 h-4 accent-[#2563eb] rounded"
                    />
                  </label>

                  <label
                    className={`p-3 rounded-xl border flex items-center justify-between gap-2 cursor-pointer ${
                      isDark ? 'bg-[#171923] border-[#27293a]' : 'bg-slate-50/90 border-slate-200'
                    }`}
                  >
                    <div>
                      <div className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {isEn ? 'Structured' : 'Terstruktur'}
                      </div>
                      <div className={`text-[10px] ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>
                        {isEn ? 'Use headings & lists' : 'Gunakan judul & daftar'}
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.personalityStructured !== false}
                      onChange={(e) => handleUpdate('personalityStructured', e.target.checked)}
                      className="w-4 h-4 accent-[#2563eb] rounded"
                    />
                  </label>
                </div>
              </div>

              {/* Gaya Bahasa (Language Style) */}
              <div>
                <label className={`text-xs font-semibold block mb-2 ${isDark ? 'text-neutral-300' : 'text-slate-700'}`}>
                  {isEn ? 'Language & Greeting Style' : 'Gaya Bahasa & Sapaan'}
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {LANGUAGE_STYLE_OPTIONS.map((style) => {
                    const active = (settings.languageStyle || 'Baku') === style.value;
                    return (
                      <button
                        key={style.value}
                        type="button"
                        onClick={() => handleUpdate('languageStyle', style.value)}
                        className={`py-2 px-2.5 rounded-xl border text-xs font-medium cursor-pointer text-center ${
                          active
                            ? isDark
                              ? 'bg-[#2563eb]/20 border-[#2563eb] text-white font-semibold'
                              : 'bg-blue-50 border-[#2563eb] text-blue-700 font-semibold'
                            : isDark
                              ? 'bg-[#181a24] border-[#262838] text-neutral-400 hover:text-white hover:border-neutral-700'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300'
                        }`}
                      >
                        {isEn ? style.labelEn : style.value}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className={`text-xs font-semibold block mb-1.5 ${isDark ? 'text-neutral-300' : 'text-slate-700'}`}>
                  {isEn ? 'Custom Instructions & Personality Prompt' : 'Instruksi Kustom & Prompt Kepribadian (Custom Prompt)'}
                </label>
                <textarea
                  rows={3}
                  value={settings.customPrompt}
                  onChange={(e) => handleUpdate('customPrompt', e.target.value)}
                  placeholder={
                    isEn
                      ? 'Define Maria\'s personality & speaking style (e.g., Answer casually, straight to the point, with a touch of humor)...'
                      : 'Tentukan kepribadian & gaya bicara Maria (contoh: Jawab santai pakai aku-kamu, to the point, boleh sedikit humoris)...'
                  }
                  className={`w-full px-3.5 py-2 border rounded-xl text-xs focus:outline-none focus:border-[#2563eb] ${
                    isDark ? 'bg-[#181a24] border-[#292c3d] text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div
                className={`p-4 rounded-2xl border flex items-center justify-between ${
                  isDark ? 'bg-[#171923] border-[#27293a]' : 'bg-slate-50/90 border-slate-200'
                }`}
              >
                <div>
                  <div className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {isEn ? 'Automatic Context Memory Extraction' : 'Ekstraksi Memori Konteks Otomatis'}
                  </div>
                  <div className={`text-[11px] ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>
                    {isEn ? 'Remember your preferences across future conversations' : 'Mengingat preferensi Anda dalam percakapan berikutnya'}
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.memoryEnabled !== false}
                  onChange={(e) => handleUpdate('memoryEnabled', e.target.checked)}
                  className="w-4 h-4 accent-[#2563eb] rounded cursor-pointer"
                />
              </div>

              {/* Memory Summary Box */}
              <div
                className={`p-4 rounded-2xl border space-y-2 ${
                  isDark ? 'bg-[#141724] border-[#262b40]' : 'bg-blue-50/70 border-blue-200'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-xs font-semibold flex items-center gap-1.5 ${isDark ? 'text-[#60a5fa]' : 'text-blue-600'}`}>
                    <Sparkles className="w-3.5 h-3.5" />
                    {isEn ? 'Active Memory Summary' : 'Ringkasan Memori Aktif'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleUpdate('memorySummary', computedMemorySummary)}
                    className={`text-[11px] px-2.5 py-1 rounded-lg bg-[#2563eb]/20 hover:bg-[#2563eb]/30 font-medium cursor-pointer ${
                      isDark ? 'text-[#60a5fa]' : 'text-blue-600'
                    }`}
                  >
                    {isEn ? 'Refresh Summary' : 'Perbarui Ringkasan'}
                  </button>
                </div>
                <p className={`text-[11px] leading-relaxed ${isDark ? 'text-neutral-300' : 'text-slate-600'}`}>
                  {settings.memorySummary || computedMemorySummary}
                </p>
              </div>

              {/* Memori Maria Tentang Anda */}
              <div
                className={`p-4 rounded-2xl border space-y-3.5 ${
                  isDark ? 'bg-[#171923] border-[#27293a]' : 'bg-slate-50/90 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Brain className={`w-4 h-4 ${isDark ? 'text-[#60a5fa]' : 'text-blue-600'}`} />
                    <span className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {isEn ? "Maria's Memories About You" : 'Memori Maria Tentang Anda'}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#2563eb]/20 ${
                        isDark ? 'text-[#60a5fa]' : 'text-blue-600'
                      }`}
                    >
                      {memories.length} {isEn ? 'Saved' : 'Disimpan'}
                    </span>
                  </div>
                  {memories.length > 0 && (
                    <button
                      type="button"
                      onClick={() => userMemoryService.clearMemories()}
                      className="text-[11px] text-rose-400 hover:text-rose-300 hover:underline cursor-pointer"
                    >
                      {isEn ? 'Clear All' : 'Hapus Semua'}
                    </button>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-1">
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
                    placeholder={
                      isEn
                        ? 'Add a new memory (e.g., I love TypeScript)...'
                        : 'Tambah memori baru (contoh: Saya suka bahasa TypeScript)...'
                    }
                    className={`flex-1 px-3 py-2 border rounded-xl text-xs focus:outline-none focus:border-[#2563eb] ${
                      isDark
                        ? 'bg-[#12141c] border-[#292c3d] text-white placeholder-neutral-500'
                        : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                  <div className="flex gap-1.5 flex-none">
                    <select
                      value={newMemoryCategory}
                      onChange={(e) => setNewMemoryCategory(e.target.value as any)}
                      aria-label={isEn ? 'Memory category' : 'Kategori memori'}
                      className={`px-2.5 py-2 border rounded-xl text-xs focus:outline-none focus:border-[#2563eb] ${
                        isDark ? 'bg-[#12141c] border-[#292c3d] text-neutral-300' : 'bg-white border-slate-200 text-slate-700'
                      }`}
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
                      className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#2563eb] text-white hover:bg-[#1d4ed8] flex items-center gap-1 cursor-pointer flex-none"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{isEn ? 'Save' : 'Simpan'}</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1 pt-1">
                  {memories.length === 0 ? (
                    <div
                      className={`p-4 rounded-xl border border-dashed text-center text-[11px] ${
                        isDark ? 'bg-[#12141c] border-[#292c3d] text-neutral-400' : 'bg-white border-slate-200 text-slate-500'
                      }`}
                    >
                      {isEn
                        ? 'Maria has no saved memories about you yet.'
                        : 'Maria belum memiliki catatan memori khusus tentang Anda.'}
                    </div>
                  ) : (
                    memories.map((m) => (
                      <div
                        key={m.id}
                        className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs group ${
                          isDark
                            ? 'bg-[#12141c] border-[#262838] hover:border-[#3b3e52]'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={`text-[9.5px] uppercase font-bold px-1.5 py-0.5 rounded ${
                                m.category === 'personal'
                                  ? isDark
                                    ? 'bg-blue-500/15 text-blue-400'
                                    : 'bg-blue-500/15 text-blue-600'
                                  : m.category === 'preferences'
                                  ? isDark
                                    ? 'bg-purple-500/15 text-purple-400'
                                    : 'bg-purple-500/15 text-purple-600'
                                  : m.category === 'work'
                                  ? isDark
                                    ? 'bg-amber-500/15 text-amber-400'
                                    : 'bg-amber-500/15 text-amber-600'
                                  : isDark
                                    ? 'bg-emerald-500/15 text-emerald-400'
                                    : 'bg-emerald-500/15 text-emerald-600'
                              }`}
                            >
                              {m.category}
                            </span>
                            <span className={`text-[10px] ${isDark ? 'text-neutral-500' : 'text-slate-500'}`}>
                              {m.source === 'auto' ? (isEn ? 'Auto Detected' : 'Deteksi Otomatis') : 'Manual'}
                            </span>
                          </div>
                          <p className={`text-[11.5px] leading-snug ${isDark ? 'text-white' : 'text-slate-900'}`}>{m.text}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => userMemoryService.removeMemory(m.id)}
                          className="p-1.5 text-neutral-500 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 flex-none cursor-pointer"
                          title={isEn ? 'Delete this memory' : 'Hapus memori ini'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: VOICE & AUDIO */}
          {activeTab === 'voice' && (
            <div className="space-y-5">
              <div
                className={`p-4 rounded-2xl border flex items-center justify-between ${
                  isDark ? 'bg-[#171923] border-[#27293a]' : 'bg-slate-50/90 border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {isEn ? 'Automatic AI Voice Responses (TTS)' : 'Respon Suara AI Otomatis (TTS)'}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        settings.voiceEnabled
                          ? isDark
                            ? 'bg-[#2563eb]/20 text-[#60a5fa] border border-[#2563eb]/40'
                            : 'bg-blue-50 text-blue-600 border border-blue-200'
                          : isDark
                            ? 'bg-neutral-800 text-neutral-400'
                            : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {settings.voiceEnabled ? (isEn ? 'Active' : 'Aktif') : isEn ? 'Inactive' : 'Nonaktif'}
                    </span>
                  </div>
                  <div className={`text-[11px] mt-0.5 ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>
                    {isEn
                      ? 'Maria automatically reads responses aloud in the chat room'
                      : 'Maria langsung berbicara otomatis setiap merespons pesan di ruang obrolan'}
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(settings.voiceEnabled)}
                  onChange={(e) => {
                    speechService.unlockAudio();
                    handleUpdate('voiceEnabled', e.target.checked);
                  }}
                  className="w-5 h-5 accent-[#2563eb] rounded cursor-pointer"
                />
              </div>

              {/* Voice Recognition Language & Background Mode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div
                  className={`p-3.5 rounded-2xl border ${
                    isDark ? 'bg-[#171923] border-[#27293a]' : 'bg-slate-50/90 border-slate-200'
                  }`}
                >
                  <label className={`text-xs font-semibold block mb-1.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {isEn ? 'Speech Recognition Language' : 'Bahasa Pengenalan Suara'}
                  </label>
                  <select
                    value={settings.voiceLanguage || 'auto'}
                    onChange={(e) => handleUpdate('voiceLanguage', e.target.value as any)}
                    className={`w-full px-3 py-2 border rounded-xl text-xs focus:outline-none focus:border-[#2563eb] ${
                      isDark ? 'bg-[#12141c] border-[#292c3d] text-white' : 'bg-white border-slate-200 text-slate-900'
                    }`}
                  >
                    <option value="auto">{isEn ? 'Auto Detect' : 'Deteksi Otomatis (Auto)'}</option>
                    <option value="id-ID">{isEn ? 'Indonesian' : 'Bahasa Indonesia'}</option>
                    <option value="en-US">English (US)</option>
                  </select>
                </div>

                <label
                  className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 cursor-pointer ${
                    isDark ? 'bg-[#171923] border-[#27293a]' : 'bg-slate-50/90 border-slate-200'
                  }`}
                >
                  <div>
                    <div className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {isEn ? 'Background Conversations' : 'Percakapan Latar Belakang'}
                    </div>
                    <div className={`text-[11px] ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>
                      {isEn ? 'Keep audio playing when switching tabs' : 'Pertahankan pemutaran audio saat berpindah tab'}
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(settings.backgroundVoice)}
                    onChange={(e) => handleUpdate('backgroundVoice', e.target.checked)}
                    className="w-4 h-4 accent-[#2563eb] rounded"
                  />
                </label>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className={`text-xs font-semibold ${isDark ? 'text-neutral-300' : 'text-slate-700'}`}>
                    {isEn ? 'AI Voice Engine Model (Gemini TTS)' : 'Model AI Voice Engine (Gemini TTS)'}
                  </label>
                  <span className={`text-[10px] font-medium flex items-center gap-1 ${isDark ? 'text-[#60a5fa]' : 'text-blue-600'}`}>
                    <Sparkles className={`w-3 h-3 ${isDark ? 'text-[#60a5fa]' : 'text-blue-600'}`} />
                    {isEn ? 'Primary Active Model' : 'Model Utama Aktif'}
                  </span>
                </div>
                <div
                  className={`p-3.5 rounded-2xl border shadow-sm ${
                    isDark ? 'bg-[#2563eb]/15 border-[#2563eb] text-white' : 'bg-blue-50/80 border-[#2563eb] text-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold flex items-center gap-1.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      <Sparkles className={`w-3.5 h-3.5 ${isDark ? 'text-[#60a5fa]' : 'text-blue-600'}`} /> Gemini 3.8 Flash Lite TTS
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                        isDark ? 'text-[#60a5fa] bg-[#2563eb]/30' : 'text-blue-700 bg-blue-100'
                      }`}
                    >
                      <Check className="w-3 h-3" /> {isEn ? 'Active' : 'Aktif'}
                    </span>
                  </div>
                  <p className={`text-[11px] mt-1 ${isDark ? 'text-neutral-300' : 'text-slate-600'}`}>
                    {isEn
                      ? 'Low-latency Neural Voice with Indonesian & English support and automatic fallback.'
                      : 'Latensi rendah dengan dukungan Neural Voice Bahasa Indonesia & fallback otomatis.'}
                  </p>
                </div>
              </div>

              {/* 6 Persona Models */}
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className={`text-xs font-semibold ${isDark ? 'text-neutral-300' : 'text-slate-700'}`}>
                      {isEn ? 'AI Voice Gender & Age Personas' : 'Pilihan Model Gender & Usia Suara AI'}
                    </label>
                    <span className={`text-[10px] font-medium ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                      {isEn ? '6 Models Available' : '6 Model Tersedia'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {VOICE_PERSONAS.map((persona) => {
                      const pDisplay = isEn ? EN_PERSONA_MAP[persona.id] || persona : persona;
                      const isSelected = (settings.voicePersona || 'wanita') === persona.id;
                      return (
                        <div
                          key={persona.id}
                          onClick={() =>
                            handleUpdate({
                              voicePersona: persona.id,
                              geminiVoice: persona.geminiVoice,
                            })
                          }
                          className={`cursor-pointer p-3 rounded-2xl border ${
                            isSelected
                              ? isDark
                                ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-sm'
                                : 'bg-emerald-50 border-emerald-500 text-emerald-950 shadow-sm'
                              : isDark
                                ? 'bg-[#181a24] border-[#27293a] text-neutral-300 hover:border-neutral-600'
                                : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5 flex-1 min-w-0">
                              <div
                                className={`w-8 h-8 rounded-xl border flex items-center justify-center font-bold text-xs shrink-0 ${
                                  isSelected
                                    ? isDark
                                      ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-400'
                                      : 'bg-emerald-500/20 border-emerald-500/60 text-emerald-600'
                                    : isDark
                                      ? 'bg-neutral-800/80 border-neutral-700/60 text-neutral-400'
                                      : 'bg-slate-200/80 border-slate-300 text-slate-600'
                                }`}
                              >
                                {persona.name.slice(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                    {pDisplay.label}
                                  </span>
                                  <span
                                    className={`text-[9px] px-1.5 py-0.5 rounded-full border ${
                                      isDark
                                        ? 'bg-neutral-800 text-neutral-300 border-neutral-700'
                                        : 'bg-slate-200 text-slate-600 border-slate-300'
                                    }`}
                                  >
                                    {pDisplay.category}
                                  </span>
                                  {isSelected && (
                                    <Check className={`w-3.5 h-3.5 shrink-0 ${isDark ? 'text-emerald-400' : 'text-emerald-500'}`} />
                                  )}
                                </div>
                                <div className={`text-[10px] mt-0.5 line-clamp-1 ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>
                                  {pDisplay.description}
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                speechService.unlockAudio();
                                speechService.speak(pDisplay.sampleText, {
                                  voiceName: persona.geminiVoice,
                                  personaId: persona.id,
                                  speed: settings.speechSpeed || '1x',
                                  ttsModel: settings.ttsModel || 'gemini-3.8-flash-lite-tts',
                                });
                              }}
                              className={`p-1.5 px-2.5 rounded-xl hover:bg-emerald-600 hover:text-white shrink-0 flex items-center gap-1 text-[10px] font-semibold cursor-pointer ${
                                isDark ? 'bg-neutral-800/90 text-neutral-300' : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              <Volume2 className={`w-3.5 h-3.5 ${isDark ? 'text-emerald-400' : 'text-emerald-500'}`} />
                              <span>{isEn ? 'Test' : 'Tes'}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Timbre Fine-Tuner */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className={`text-xs font-semibold ${isDark ? 'text-neutral-300' : 'text-slate-700'}`}>
                      {isEn ? 'AI Engine Vocal Timbre' : 'Timbre Vokal AI Engine'}
                    </label>
                    <span className={`text-[10px] ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                      {isEn ? 'Active' : 'Aktif'}: {settings.geminiVoice || 'Aoede'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {[
                      { id: 'Aoede', label: 'Aoede', desc: isEn ? 'Female • Elegant' : 'Wanita • Elegan' },
                      { id: 'Kore', label: 'Kore', desc: isEn ? 'Female • Soft' : 'Wanita • Lembut' },
                      { id: 'Zephyr', label: 'Zephyr', desc: isEn ? 'Female • Cheerful' : 'Wanita • Ceria' },
                      { id: 'Fenrir', label: 'Fenrir', desc: isEn ? 'Male • Firm' : 'Pria • Mantap' },
                      { id: 'Puck', label: 'Puck', desc: isEn ? 'Male • Dynamic' : 'Pria • Dinamis' },
                      { id: 'Charon', label: 'Charon', desc: isEn ? 'Male • Calm' : 'Pria • Tenang' },
                    ].map((v) => {
                      const isVoiceSelected = (settings.geminiVoice || 'Aoede') === v.id;
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => handleUpdate('geminiVoice', v.id as any)}
                          className={`p-2 rounded-xl border text-center cursor-pointer ${
                            isVoiceSelected
                              ? isDark
                                ? 'bg-emerald-500/20 border-emerald-500 text-white font-bold'
                                : 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold'
                              : isDark
                                ? 'bg-[#181a24] border-[#27293a] text-neutral-400 hover:text-white'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <div className="text-xs font-bold">{v.label}</div>
                          <div className={`text-[9px] mt-0.5 ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>{v.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Speed */}
              <div>
                <label className={`text-xs font-semibold block mb-1.5 ${isDark ? 'text-neutral-300' : 'text-slate-700'}`}>
                  {isEn ? 'Speaking Speed' : 'Kecepatan Bicara'}
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {['0.75x', '1x', '1.25x', '1.5x'].map((spd) => (
                    <button
                      key={spd}
                      type="button"
                      onClick={() => handleUpdate('speechSpeed', spd as any)}
                      className={`py-2 rounded-xl border text-xs font-medium text-center cursor-pointer ${
                        (settings.speechSpeed || '1x') === spd
                          ? 'bg-[#2563eb] border-[#2563eb] text-white font-bold'
                          : isDark
                            ? 'bg-[#181a24] border-[#27293a] text-neutral-400 hover:text-white'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {spd}
                    </button>
                  ))}
                </div>
              </div>

              {/* Speech Pronunciation Dictionary */}
              <div
                className={`p-4 rounded-2xl border space-y-3 ${
                  isDark ? 'bg-[#171923] border-[#27293a]' : 'bg-slate-50/90 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className={`w-4 h-4 ${isDark ? 'text-[#60a5fa]' : 'text-blue-600'}`} />
                    <span className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {isEn ? 'Pronunciation Dictionary' : 'Kamus Pengucapan (Dictionary)'}
                    </span>
                  </div>
                  <span className={`text-[10px] font-mono ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>
                    {(settings.speechDictionary || []).length} {isEn ? 'Entries' : 'Entri'}
                  </span>
                </div>
                <p className={`text-[11px] ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>
                  {isEn
                    ? 'Help the voice engine pronounce technical terms, acronyms, or custom names accurately.'
                    : 'Bantu mesin suara melafalkan istilah teknis, singkatan, atau nama khusus dengan tepat.'}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
                  <input
                    type="text"
                    value={dictTerm}
                    onChange={(e) => setDictTerm(e.target.value)}
                    placeholder={isEn ? 'Original word (e.g., DEFCON)' : 'Kata asli (misal: DEFCON)'}
                    className={`px-3 py-2 border rounded-xl text-xs focus:outline-none focus:border-[#2563eb] ${
                      isDark
                        ? 'bg-[#12141c] border-[#292c3d] text-white placeholder-neutral-500'
                        : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                  <input
                    type="text"
                    value={dictPronunciation}
                    onChange={(e) => setDictPronunciation(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddDictionaryEntry()}
                    placeholder={isEn ? 'Pronunciation (e.g., Defcon)' : 'Cara baca (misal: Defkon)'}
                    className={`px-3 py-2 border rounded-xl text-xs focus:outline-none focus:border-[#2563eb] ${
                      isDark
                        ? 'bg-[#12141c] border-[#292c3d] text-white placeholder-neutral-500'
                        : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={handleAddDictionaryEntry}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#2563eb] text-white hover:bg-[#1d4ed8] flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isEn ? 'Add' : 'Tambah'}</span>
                  </button>
                </div>

                {(settings.speechDictionary || []).length > 0 && (
                  <div className="space-y-1.5 max-h-32 overflow-y-auto pt-1">
                    {(settings.speechDictionary || []).map((entry) => (
                      <div
                        key={entry.id}
                        className={`px-3 py-2 rounded-xl border flex items-center justify-between text-xs ${
                          isDark ? 'bg-[#12141c] border-[#262838]' : 'bg-white border-slate-200'
                        }`}
                      >
                        <div className="truncate">
                          <span className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{entry.term}</span>
                          <span className={`mx-2 ${isDark ? 'text-neutral-500' : 'text-slate-400'}`}>-&gt;</span>
                          <span className={isDark ? 'text-[#60a5fa]' : 'text-blue-600'}>{entry.pronunciation || entry.term}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveDictionaryEntry(entry.id)}
                          className={`p-1 cursor-pointer ${
                            isDark ? 'text-neutral-500 hover:text-rose-400' : 'text-slate-400 hover:text-rose-500'
                          }`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Test Voice Card */}
              {(() => {
                const activePersona =
                  VOICE_PERSONAS.find((p) => p.id === (settings.voicePersona || 'wanita')) || VOICE_PERSONAS[0];
                const enPersonaLabels: Record<string, { label: string; category: string; sample: string }> = {
                  wanita: { label: 'Adult Female', category: 'Adult', sample: "Hello! I'm Maria. This is my AI voice sample." },
                  pria: { label: 'Adult Male', category: 'Adult', sample: "Hello! I'm Mario. This is my AI voice sample." },
                  'remaja-perempuan': { label: 'Teen Female', category: 'Teen', sample: "Hey! I'm Maya. This is my AI voice sample." },
                  'remaja-laki': { label: 'Teen Male', category: 'Teen', sample: "Hi! I'm Max. This is my AI voice sample." },
                  'anak-perempuan': { label: 'Young Girl', category: 'Kids', sample: "Hi! I'm Mia. This is my AI voice sample." },
                  'anak-laki': { label: 'Young Boy', category: 'Kids', sample: "Hello! I'm Milo. This is my AI voice sample." },
                };
                const activeEn = enPersonaLabels[activePersona.id];
                return (
                  <div
                    className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                      isDark ? 'bg-[#131520] border-[#232537]' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div>
                      <div className={`text-xs font-semibold flex items-center gap-1.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        <Volume2 className={`w-3.5 h-3.5 ${isDark ? 'text-[#60a5fa]' : 'text-blue-600'}`} />
                        <span>
                          {isEn
                            ? `Test AI Voice Model: ${activePersona.name} (${activeEn?.label || activePersona.label})`
                            : `Uji Suara Model AI: ${activePersona.name} (${activePersona.label})`}
                        </span>
                      </div>
                      <div className={`text-[11px] mt-0.5 ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>
                        {isEn
                          ? `${activeEn?.category || activePersona.category} Model • Timbre ${settings.geminiVoice || activePersona.geminiVoice}`
                          : `Model ${activePersona.category} • Timbre ${settings.geminiVoice || activePersona.geminiVoice}`}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        speechService.unlockAudio();
                        if (speechState.isSpeaking && speechState.activeMessageId === 'settings_test') {
                          speechService.stopSpeaking();
                        } else {
                          const testText = isEn
                            ? activeEn?.sample || `Hello! I'm ${activePersona.name}.`
                            : activePersona.sampleText ||
                              `Halo! Saya ${activePersona.name}. Ini adalah suara asli model AI ${activePersona.label}.`;
                          speechService.speak(testText, {
                            messageId: 'settings_test',
                            speed: settings.speechSpeed || '1x',
                            voiceName: settings.geminiVoice || activePersona.geminiVoice,
                            personaId: activePersona.id,
                            ttsModel: settings.ttsModel || 'gemini-3.8-flash-lite-tts',
                          });
                        }
                      }}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold shrink-0 cursor-pointer ${
                        speechState.isSpeaking && speechState.activeMessageId === 'settings_test'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : 'bg-[#2563eb] text-white hover:bg-[#1d4ed8]'
                      }`}
                    >
                      {speechState.isLoading && speechState.activeMessageId === 'settings_test' ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>{isEn ? 'Preparing Voice...' : 'Menyiapkan Suara...'}</span>
                        </>
                      ) : speechState.isSpeaking && speechState.activeMessageId === 'settings_test' ? (
                        <>
                          <VolumeX className="w-3.5 h-3.5" />
                          <span>{isEn ? 'Stop Voice' : 'Hentikan Suara'}</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>{isEn ? `Test ${activePersona.name}'s Voice` : `Tes Suara ${activePersona.name}`}</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })()}
            </div>
          )}

          {/* TAB 4: CHAT & PROMPT */}
          {activeTab === 'chat' && (
            <div className="space-y-4">
              <div
                className={`p-4 rounded-2xl border flex items-center justify-between ${
                  isDark ? 'bg-[#171923] border-[#27293a]' : 'bg-slate-50/90 border-slate-200'
                }`}
              >
                <div>
                  <div className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {isEn ? 'Press Enter to Send' : 'Tekan Enter untuk Mengirim Pesan'}
                  </div>
                  <div className={`text-[11px] ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>
                    {isEn ? 'Shift + Enter for a new line' : 'Shift + Enter untuk membuat baris baru'}
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.enterToSend !== false}
                  onChange={(e) => handleUpdate('enterToSend', e.target.checked)}
                  className="w-4 h-4 accent-[#2563eb] rounded cursor-pointer"
                />
              </div>

              <div
                className={`p-4 rounded-2xl border flex items-center justify-between ${
                  isDark ? 'bg-[#171923] border-[#27293a]' : 'bg-slate-50/90 border-slate-200'
                }`}
              >
                <div>
                  <div className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {isEn ? 'Save Chat History' : 'Simpan Riwayat Obrolan'}
                  </div>
                  <div className={`text-[11px] ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>
                    {isEn ? 'Auto-sync to Cloud Firestore and local device' : 'Simpan otomatis di Cloud Firestore dan perangkat lokal'}
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.saveChatHistory !== false}
                  onChange={(e) => handleUpdate('saveChatHistory', e.target.checked)}
                  className="w-4 h-4 accent-[#2563eb] rounded cursor-pointer"
                />
              </div>

              {/* Temporary Chat */}
              <div
                className={`p-4 rounded-2xl border flex items-center justify-between ${
                  isDark ? 'bg-[#171923] border-[#27293a]' : 'bg-slate-50/90 border-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <EyeOff className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <div className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {isEn ? 'Temporary Chat Mode' : 'Mode Obrolan Sementara (Temporary Chat)'}
                    </div>
                    <div className={`text-[11px] ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>
                      {isEn
                        ? 'New conversations will not be saved to cloud history or permanent memory'
                        : 'Percakapan baru tidak akan dicatat ke riwayat cloud maupun memori permanen'}
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(settings.temporaryChat)}
                  onChange={(e) => handleUpdate('temporaryChat', e.target.checked)}
                  className="w-4 h-4 accent-[#2563eb] rounded cursor-pointer"
                />
              </div>

              {/* Notifications Section */}
              <div
                className={`p-4 rounded-2xl border space-y-3 ${
                  isDark ? 'bg-[#171923] border-[#27293a]' : 'bg-slate-50/90 border-slate-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Bell className={`w-4 h-4 ${isDark ? 'text-[#60a5fa]' : 'text-blue-600'}`} />
                  <span className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {isEn ? 'Notification Preferences' : 'Preferensi Notifikasi'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <label
                    className={`p-2.5 rounded-xl border flex items-center justify-between text-xs cursor-pointer ${
                      isDark ? 'bg-[#12141c] border-[#252737]' : 'bg-white border-slate-200'
                    }`}
                  >
                    <span className={isDark ? 'text-neutral-200' : 'text-slate-700'}>
                      {isEn ? 'Chat Status Updates' : 'Pembaruan Status Chat'}
                    </span>
                    <input
                      type="checkbox"
                      checked={settings.notifications?.statusUpdates !== false}
                      onChange={(e) =>
                        handleUpdate('notifications', {
                          soundEnabled: settings.notifications?.soundEnabled ?? true,
                          remindersEnabled: settings.notifications?.remindersEnabled ?? true,
                          inAppNotifications: settings.notifications?.inAppNotifications ?? true,
                          statusUpdates: e.target.checked,
                        })
                      }
                      className="w-4 h-4 accent-[#2563eb]"
                    />
                  </label>

                  <label
                    className={`p-2.5 rounded-xl border flex items-center justify-between text-xs cursor-pointer ${
                      isDark ? 'bg-[#12141c] border-[#252737]' : 'bg-white border-slate-200'
                    }`}
                  >
                    <span className={isDark ? 'text-neutral-200' : 'text-slate-700'}>
                      {isEn ? 'Reminders & Schedule' : 'Pengingat & Agenda'}
                    </span>
                    <input
                      type="checkbox"
                      checked={settings.notifications?.remindersEnabled !== false}
                      onChange={(e) =>
                        handleUpdate('notifications', {
                          soundEnabled: settings.notifications?.soundEnabled ?? true,
                          statusUpdates: settings.notifications?.statusUpdates ?? true,
                          inAppNotifications: settings.notifications?.inAppNotifications ?? true,
                          remindersEnabled: e.target.checked,
                        })
                      }
                      className="w-4 h-4 accent-[#2563eb]"
                    />
                  </label>

                  <label
                    className={`p-2.5 rounded-xl border flex items-center justify-between text-xs cursor-pointer ${
                      isDark ? 'bg-[#12141c] border-[#252737]' : 'bg-white border-slate-200'
                    }`}
                  >
                    <span className={isDark ? 'text-neutral-200' : 'text-slate-700'}>
                      {isEn ? 'Notification Sound Effects' : 'Efek Suara Notifikasi'}
                    </span>
                    <input
                      type="checkbox"
                      checked={settings.notifications?.soundEnabled !== false}
                      onChange={(e) =>
                        handleUpdate('notifications', {
                          statusUpdates: settings.notifications?.statusUpdates ?? true,
                          remindersEnabled: settings.notifications?.remindersEnabled ?? true,
                          inAppNotifications: settings.notifications?.inAppNotifications ?? true,
                          soundEnabled: e.target.checked,
                        })
                      }
                      className="w-4 h-4 accent-[#2563eb]"
                    />
                  </label>

                  <label
                    className={`p-2.5 rounded-xl border flex items-center justify-between text-xs cursor-pointer ${
                      isDark ? 'bg-[#12141c] border-[#252737]' : 'bg-white border-slate-200'
                    }`}
                  >
                    <span className={isDark ? 'text-neutral-200' : 'text-slate-700'}>
                      {isEn ? 'In-App Notifications' : 'Notifikasi Dalam Aplikasi'}
                    </span>
                    <input
                      type="checkbox"
                      checked={settings.notifications?.inAppNotifications !== false}
                      onChange={(e) =>
                        handleUpdate('notifications', {
                          soundEnabled: settings.notifications?.soundEnabled ?? true,
                          statusUpdates: settings.notifications?.statusUpdates ?? true,
                          remindersEnabled: settings.notifications?.remindersEnabled ?? true,
                          inAppNotifications: e.target.checked,
                        })
                      }
                      className="w-4 h-4 accent-[#2563eb]"
                    />
                  </label>
                </div>
              </div>

              {/* About & Help Links */}
              <div
                className={`p-4 rounded-2xl border space-y-2.5 ${
                  isDark ? 'bg-[#171923] border-[#27293a]' : 'bg-slate-50/90 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Info className={`w-4 h-4 ${isDark ? 'text-[#60a5fa]' : 'text-blue-600'}`} />
                    <span className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {isEn ? 'About & Help Maria AI' : 'Tentang & Bantuan Maria AI'}
                    </span>
                  </div>
                  <span className={`text-[10px] font-mono ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>v2.5 • DEFCON 5</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  {[
                    { label: isEn ? 'Help Center' : 'Pusat Bantuan', href: '/help.html' },
                    { label: isEn ? 'Terms of Service' : 'Ketentuan Layanan', href: '/terms.html' },
                    { label: isEn ? 'Privacy Policy' : 'Kebijakan Privasi', href: '/privacy.html' },
                    { label: isEn ? 'Cookie Policy' : 'Kebijakan Cookie', href: '/cookies.html' },
                  ].map((item) => (
                    <a
                      key={item.href}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`px-3 py-2 rounded-xl border text-[11px] font-medium flex items-center justify-between gap-1 ${
                        isDark
                          ? 'bg-[#12141c] border-[#252737] hover:border-[#3b3f54] text-neutral-200'
                          : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <span className="truncate">{item.label}</span>
                      <ExternalLink className="w-3 h-3 text-slate-400 shrink-0" />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: PRIVACY & DATA */}
          {activeTab === 'privacy' && (
            <div className="space-y-4">
              {/* Spy Guard Security Card */}
              <div
                className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
                  isDark ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-bold shrink-0">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <div className={`text-xs font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      <span>{isEn ? 'Spy Guard Security System' : 'Sistem Keamanan Spy Guard'}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/40">
                        {isEn ? 'Active' : 'Aktif'}
                      </span>
                    </div>
                    <div className={`text-[11px] mt-0.5 ${isDark ? 'text-neutral-300' : 'text-slate-600'}`}>
                      Anti-DDoS WAF, Anti-Injection, VirusTotal v3 & Quarantine Engine
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenDefcon?.();
                  }}
                  className="py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shrink-0 flex items-center gap-1.5 cursor-pointer"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>{isEn ? 'Open Spy Guard' : 'Buka Spy Guard'}</span>
                </button>
              </div>

              {/* Safety Toggle */}
              <div
                className={`p-4 rounded-2xl border flex items-center justify-between ${
                  isDark ? 'bg-[#171923] border-[#27293a]' : 'bg-slate-50/90 border-slate-200'
                }`}
              >
                <div>
                  <div className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {isEn ? 'Reduce Sensitive Content (Safety Mode)' : 'Kurangi Konten Sensitif (Safety Mode)'}
                  </div>
                  <div className={`text-[11px] ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>
                    {isEn
                      ? 'Tighten filtering of sensitive topics in AI responses and search'
                      : 'Memperketat penyaringan topik sensitif dalam jawaban AI dan pencarian'}
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(settings.reduceSensitiveContent)}
                  onChange={(e) => handleUpdate('reduceSensitiveContent', e.target.checked)}
                  className="w-4 h-4 accent-[#2563eb] rounded cursor-pointer"
                />
              </div>

              <div
                className={`p-4 rounded-2xl border flex items-center justify-between ${
                  isDark ? 'bg-[#171923] border-[#27293a]' : 'bg-slate-50/90 border-slate-200'
                }`}
              >
                <div>
                  <div className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {isEn ? 'Data Leak Prevention (DLP Shield)' : 'Pencegahan Kebocoran Data (DLP Shield)'}
                  </div>
                  <div className={`text-[11px] ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>
                    {isEn
                      ? 'Mask sensitive tokens, API keys & personal credentials in outputs'
                      : 'Menyamarkan token sensitif, API key & kredensial pribadi di output'}
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.dlpEnabled !== false}
                  onChange={(e) => handleUpdate('dlpEnabled', e.target.checked)}
                  className="w-4 h-4 accent-[#2563eb] rounded cursor-pointer"
                />
              </div>

              {/* Security & 2FA PIN Config */}
              <div
                className={`p-4 rounded-2xl border space-y-3 ${
                  isDark ? 'bg-[#171923] border-[#27293a]' : 'bg-slate-50/90 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-amber-400" />
                    <span className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {isEn ? 'Account Security & 2FA PIN' : 'Keamanan Akun & PIN 2FA'}
                    </span>
                  </div>
                  <span className={`text-[10px] font-medium ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>
                    {settings.securityPin?.length === 6
                      ? isEn
                        ? 'Custom PIN Active'
                        : 'PIN Kustom Aktif'
                      : isEn
                        ? 'Default PIN'
                        : 'PIN Default'}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={pinDraft}
                    onChange={(e) => setPinDraft(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder={
                      isEn ? 'Set 6-digit PIN to delete history...' : 'Atur PIN 6-digit untuk hapus riwayat...'
                    }
                    className={`flex-1 px-3 py-2 border rounded-xl text-xs focus:outline-none focus:border-[#2563eb] ${
                      isDark ? 'bg-[#12141c] border-[#292c3d] text-white' : 'bg-white border-slate-200 text-slate-900'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={handleSavePin}
                    className="px-3.5 py-2 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-semibold cursor-pointer shrink-0 flex items-center gap-1.5"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>{isEn ? 'Save 2FA PIN' : 'Simpan PIN 2FA'}</span>
                  </button>
                </div>

                {pinFeedback && (
                  <p className={`text-[11px] ${isDark ? 'text-[#60a5fa]' : 'text-blue-600'}`}>{pinFeedback}</p>
                )}

                <label className="pt-1 flex items-center justify-between text-xs cursor-pointer">
                  <span className={isDark ? 'text-neutral-300' : 'text-slate-600'}>
                    {isEn
                      ? 'Require security confirmation before sensitive actions'
                      : 'Wajibkan konfirmasi keamanan sebelum eksekusi sensitif'}
                  </span>
                  <input
                    type="checkbox"
                    checked={Boolean(settings.sessionLockEnabled)}
                    onChange={(e) => handleUpdate('sessionLockEnabled', e.target.checked)}
                    className="w-4 h-4 accent-[#2563eb]"
                  />
                </label>
              </div>

              {/* Storage Meter & Cache Cleaner */}
              <div
                className={`p-4 rounded-2xl border space-y-3 ${
                  isDark ? 'bg-[#171923] border-[#27293a]' : 'bg-slate-50/90 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HardDrive className={`w-4 h-4 ${isDark ? 'text-[#60a5fa]' : 'text-blue-600'}`} />
                    <span className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {isEn ? 'Local Storage & Cache' : 'Penyimpanan Lokal & Cache'}
                    </span>
                  </div>
                  <span className={`text-xs font-mono font-bold tabular-nums ${isDark ? 'text-[#60a5fa]' : 'text-blue-600'}`}>
                    {storageStats.totalLabel}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-[#12141c] border-[#252737]' : 'bg-white border-slate-200'}`}>
                    <div className={isDark ? 'text-neutral-400' : 'text-slate-500'}>{isEn ? 'Settings' : 'Pengaturan'}</div>
                    <div className={`font-mono font-semibold mt-0.5 tabular-nums ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {storageStats.settingsLabel}
                    </div>
                  </div>
                  <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-[#12141c] border-[#252737]' : 'bg-white border-slate-200'}`}>
                    <div className={isDark ? 'text-neutral-400' : 'text-slate-500'}>{isEn ? 'AI Memory' : 'Memori AI'}</div>
                    <div className={`font-mono font-semibold mt-0.5 tabular-nums ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {storageStats.memoryLabel}
                    </div>
                  </div>
                  <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-[#12141c] border-[#252737]' : 'bg-white border-slate-200'}`}>
                    <div className={isDark ? 'text-neutral-400' : 'text-slate-500'}>{isEn ? 'Cache & Logs' : 'Cache & Log'}</div>
                    <div className={`font-mono font-semibold mt-0.5 tabular-nums ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {storageStats.otherLabel}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 pt-1">
                  <span className={`text-[11px] ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>
                    {cacheNotice ||
                      (isEn
                        ? 'Clear temporary cache without deleting your memories or settings.'
                        : 'Bersihkan cache sementara tanpa menghapus memori atau pengaturan Anda.')}
                  </span>
                  <button
                    type="button"
                    onClick={handleClearCache}
                    className={`py-1.5 px-3 rounded-xl text-xs font-semibold shrink-0 cursor-pointer ${
                      isDark ? 'bg-[#252737] hover:bg-[#31344a] text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                    }`}
                  >
                    {isEn ? 'Clear Cache' : 'Bersihkan Cache'}
                  </button>
                </div>
              </div>

              {/* Data Export */}
              <div
                className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
                  isDark ? 'bg-[#171923] border-[#27293a]' : 'bg-slate-50/90 border-slate-200'
                }`}
              >
                <div>
                  <div className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {isEn ? 'Export User Data (JSON)' : 'Ekspor Data Pengguna (JSON)'}
                  </div>
                  <div className={`text-[11px] ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>
                    {isEn
                      ? 'Download a backup of your settings, saved memories, and conversation list'
                      : 'Unduh salinan pengaturan, memori tersimpan, dan daftar percakapan Anda'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleExportData}
                  className="py-1.5 px-3 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-semibold shrink-0 flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isEn ? 'Export JSON' : 'Ekspor JSON'}</span>
                </button>
              </div>

              {/* Cookie Policy */}
              <div
                className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
                  isDark ? 'bg-[#171923] border-[#27293a]' : 'bg-slate-50/90 border-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0 ${
                      isDark ? 'text-amber-400' : 'text-amber-500'
                    }`}
                  >
                    <Cookie className="w-4 h-4" />
                  </div>
                  <div>
                    <div className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {isEn ? 'Cookie & Data Storage Policy' : 'Kebijakan Cookie & Penyimpanan Data'}
                    </div>
                    <div className={`text-[11px] ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>
                      {isEn
                        ? 'Firebase session transparency, audio cache, and zero ad cookies'
                        : 'Transparansi sesi Firebase, audio cache, dan tanpa cookie iklan'}
                    </div>
                  </div>
                </div>
                <a
                  href="/cookies.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`py-1.5 px-3 rounded-xl text-xs font-semibold border shrink-0 inline-flex items-center gap-1.5 ${
                    isDark
                      ? 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                      : 'bg-slate-200/80 hover:bg-slate-300/80 text-slate-800 border-slate-300'
                  }`}
                >
                  <span>{isEn ? 'Open Policy' : 'Buka Kebijakan'}</span>
                  <ExternalLink className={`w-3.5 h-3.5 ${isDark ? 'text-neutral-400' : 'text-slate-500'}`} />
                </a>
              </div>

              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold text-rose-400">
                    {isEn ? 'Delete All Chat History' : 'Hapus Seluruh Riwayat Percakapan'}
                  </div>
                  <div className={`text-[11px] ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>
                    {isEn
                      ? 'Requires 2FA security verification before permanent deletion'
                      : 'Memerlukan otentikasi keamanan 2FA sebelum diproses permanen'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onClearHistoryRequest();
                  }}
                  className="py-1.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isEn ? 'Delete History' : 'Hapus Riwayat'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 6: INTEGRATIONS & PLUGINS */}
          {activeTab === 'integrations' && (
            <div className="space-y-4">
              <div
                className={`p-4 rounded-2xl border flex items-center justify-between ${
                  isDark ? 'bg-[#171923] border-[#27293a]' : 'bg-slate-50/90 border-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <div className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      Google Cloud Firestore
                    </div>
                    <div className={`text-[11px] ${isDark ? 'text-[#60a5fa]' : 'text-blue-600'}`}>
                      {isEn ? 'Real-time history & profile synchronization' : 'Sinkronisasi riwayat & profil real-time'}
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-semibold px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  {isEn ? 'Connected' : 'Terhubung'}
                </span>
              </div>

              <div
                className={`p-4 rounded-2xl border flex items-center justify-between ${
                  isDark ? 'bg-[#171923] border-[#27293a]' : 'bg-slate-50/90 border-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <div className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      Google Gemini 2.5 & 3.8 Flash
                    </div>
                    <div className={`text-[11px] ${isDark ? 'text-[#60a5fa]' : 'text-blue-600'}`}>
                      {isEn ? 'Text, multimodal video/photo & TTS audio processing' : 'Pemrosesan teks, multimodal video/foto & audio TTS'}
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-semibold px-2.5 py-1 rounded-lg bg-purple-500/15 text-purple-300 border border-purple-500/30">
                  {isEn ? 'Active' : 'Aktif'}
                </span>
              </div>

              {/* Plugins / Connectors Toggle List */}
              <div
                className={`p-4 rounded-2xl border space-y-3 ${
                  isDark ? 'bg-[#171923] border-[#27293a]' : 'bg-slate-50/90 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {isEn ? 'Maria Plugins & Connectors' : 'Plugins & Konektor Maria'}
                  </span>
                  <span className={`text-[11px] font-mono font-semibold ${isDark ? 'text-[#60a5fa]' : 'text-blue-600'}`}>
                    {activePluginIds.length} / {MARIA_PLUGINS.length} {isEn ? 'active' : 'aktif'}
                  </span>
                </div>

                <div className="space-y-2">
                  {MARIA_PLUGINS.map((plugin) => {
                    const pDisplay = isEn ? EN_PLUGIN_MAP[plugin.id] || plugin : plugin;
                    const enabled = activePluginIds.includes(plugin.id);
                    return (
                      <div
                        key={plugin.id}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                          isDark ? 'bg-[#12141c] border-[#252737]' : 'bg-white border-slate-200'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                              {pDisplay.name}
                            </span>
                            <span className={`text-[10px] ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>
                              • {pDisplay.category}
                            </span>
                          </div>
                          <div className={`text-[11px] mt-0.5 ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>
                            {pDisplay.description}
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={enabled}
                          onChange={() => handleTogglePlugin(plugin.id)}
                          className="w-4 h-4 accent-[#2563eb] rounded cursor-pointer shrink-0"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: ACCOUNT */}
          {activeTab === 'account' && (
            <div className="space-y-4">
              {user ? (
                <div
                  className={`p-5 rounded-2xl border flex items-center justify-between gap-3 ${
                    isDark ? 'bg-[#171923] border-[#27293a]' : 'bg-slate-50/90 border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt="Avatar" className="w-12 h-12 rounded-2xl object-cover ring-2 ring-[#2563eb]/40 shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-2xl bg-[#2563eb] text-white flex items-center justify-center font-bold text-lg shrink-0">
                        {(user.displayName || user.email || 'M')[0].toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className={`text-sm font-bold flex items-center gap-2 flex-wrap ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        <span className="truncate">{user.displayName || (isEn ? 'Maria AI User' : 'Pengguna Maria AI')}</span>
                        {settings.isPlus ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#7c3aed]/20 text-[#a78bfa] border border-[#7c3aed]/40">
                            MARIA Plus
                          </span>
                        ) : (
                          <span
                            className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                              isDark ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-slate-200 text-slate-600 border-slate-300'
                            }`}
                          >
                            {isEn ? 'Free' : 'Gratis'}
                          </span>
                        )}
                      </div>
                      <div className={`text-xs truncate ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>{user.email}</div>
                      <div className={`text-[11px] mt-0.5 ${isDark ? 'text-neutral-500' : 'text-slate-500'}`}>Workspace: Personal</div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={signOut}
                    className={`py-1.5 px-3 rounded-xl hover:bg-rose-500/20 text-xs font-medium cursor-pointer shrink-0 ${
                      isDark ? 'bg-[#262838] text-neutral-300 hover:text-rose-400' : 'bg-slate-200 text-slate-700 hover:text-rose-600'
                    }`}
                  >
                    {isEn ? 'Sign Out' : 'Keluar Akun'}
                  </button>
                </div>
              ) : (
                <div
                  className={`p-5 rounded-2xl border space-y-3 ${
                    isDark ? 'bg-[#171923] border-[#27293a]' : 'bg-slate-50/90 border-slate-200'
                  }`}
                >
                  <div className={`flex items-center justify-between text-xs ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>
                    <span>{isEn ? 'Guest Mode (Local)' : 'Mode Tamu (Lokal)'}</span>
                    <span>Workspace: Personal</span>
                  </div>
                  <div className={`text-xs leading-relaxed ${isDark ? 'text-neutral-300' : 'text-slate-600'}`}>
                    {isEn
                      ? 'Sign in with Google to enable automatic Cloud Firestore sync for your chat history.'
                      : 'Masuk dengan akun Google untuk mengaktifkan sinkronisasi otomatis Cloud Firestore pada riwayat chat Anda.'}
                  </div>
                  <button
                    type="button"
                    onClick={signIn}
                    className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-50 text-[#1f2937] border border-slate-200/90 font-medium text-xs shadow-sm flex items-center justify-center gap-2.5 cursor-pointer"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span>Continue with Google</span>
                  </button>
                </div>
              )}

              {/* Usage & Model Quotas Card */}
              <div
                className={`p-4 rounded-2xl border space-y-2.5 ${
                  isDark ? 'bg-[#171923] border-[#27293a]' : 'bg-slate-50/90 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {isEn ? 'Usage & Model Limits' : 'Penggunaan & Batas Model (Usage)'}
                  </span>
                  <span className={`text-[11px] font-mono ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                    {isEn ? 'Smart Quota Routing' : 'Routing Kuota Cerdas'}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                  <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-[#12141c] border-[#252737]' : 'bg-white border-slate-200'}`}>
                    <div className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Gemini 2.5 Flash Lite</div>
                    <div className={`mt-0.5 ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>
                      {isEn ? 'Fast text chat • Priority 1' : 'Obrolan teks cepat • Prioritas 1'}
                    </div>
                  </div>
                  <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-[#12141c] border-[#252737]' : 'bg-white border-slate-200'}`}>
                    <div className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Gemini 2.5 Flash</div>
                    <div className={`mt-0.5 ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>
                      {isEn ? 'Video, photo & document analysis' : 'Analisis video, foto & dokumen'}
                    </div>
                  </div>
                  <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-[#12141c] border-[#252737]' : 'bg-white border-slate-200'}`}>
                    <div className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Gemini 3.8 Flash</div>
                    <div className={`mt-0.5 ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>
                      {isEn ? 'Deep reasoning & TTS' : 'Penalaran mendalam & TTS'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Maria PLUS Subscription Card */}
              <div
                className={`p-5 rounded-2xl border space-y-3 ${
                  isDark
                    ? 'bg-gradient-to-br from-[#1a152e] via-[#161726] to-[#12131d] border-indigo-500/30'
                    : 'bg-gradient-to-br from-indigo-50 via-purple-50/70 to-white border-indigo-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
                        isDark
                          ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/30'
                          : 'bg-indigo-500/15 text-indigo-600 border-indigo-300'
                      }`}
                    >
                      <Sparkles className={`w-4 h-4 ${isDark ? 'fill-indigo-400' : 'fill-indigo-500'}`} />
                    </div>
                    <div>
                      <div className={`text-xs font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        <span>{isEn ? 'Maria Subscription Status' : 'Status Langganan Maria'}</span>
                        {settings.isPlus ? (
                          <span
                            className={`px-2 py-0.5 rounded-full bg-emerald-500/20 text-[10px] font-bold border border-emerald-500/40 ${
                              isDark ? 'text-emerald-300' : 'text-emerald-700'
                            }`}
                          >
                            {isEn ? 'PLUS ACTIVE' : 'PLUS AKTIF'}
                          </span>
                        ) : (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                              isDark ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-slate-200 text-slate-600 border-slate-300'
                            }`}
                          >
                            {isEn ? 'FREE VERSION' : 'VERSI GRATIS'}
                          </span>
                        )}
                      </div>
                      <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {settings.isPlus
                          ? isEn
                            ? 'Full access to Deep Research, Music Studio, 4K Images & top priority.'
                            : 'Akses penuh Deep Research, Studio Musik, Gambar 4K & prioritas utama.'
                          : isEn
                            ? 'Unlock smart exclusive features by upgrading to Maria PLUS.'
                            : 'Buka fitur eksklusif cerdas dengan upgrade ke Maria PLUS.'}
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  className={`pt-2 border-t flex items-center justify-between gap-3 ${
                    isDark ? 'border-slate-800/80' : 'border-indigo-100'
                  }`}
                >
                  <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {settings.isPlus
                      ? isEn
                        ? 'Plan: Annual Pro (VIP)'
                        : 'Paket: Tahunan Pro (VIP)'
                      : isEn
                        ? 'Starting from Rp 33,250 / mo'
                        : 'Mulai dari Rp 33.250 / bln'}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenPlusModal?.();
                    }}
                    className={`py-1.5 px-3.5 rounded-xl font-bold text-xs shadow-md cursor-pointer flex items-center gap-1.5 ${
                      settings.isPlus
                        ? isDark
                          ? 'bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-500/30'
                          : 'bg-slate-200 hover:bg-slate-300 text-indigo-700 border border-indigo-300'
                        : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>
                      {settings.isPlus
                        ? isEn
                          ? 'Manage Maria PLUS'
                          : 'Kelola Maria PLUS'
                        : isEn
                          ? 'Upgrade to Maria PLUS'
                          : 'Upgrade ke Maria PLUS'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
