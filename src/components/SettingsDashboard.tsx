import React, { useState, useEffect } from "react";
import { UserSettings, MariaTone, LanguageStyle, AppTheme, UserMemory } from "../types";
import { safeLocalStorageSetItem, safeStorage } from "../utils";
import { PRESET_VOICES, PRESET_MODELS } from "../services/elevenLabsService";
import { auth } from "../firebase";
import CookiePolicyModal from "./CookiePolicyModal";
import { 
  Settings, 
  Bell, 
  Sliders, 
  LayoutGrid, 
  CreditCard, 
  Database,
  X, 
  Play, 
  Check, 
  ChevronDown, 
  Info,
  Volume2,
  Trash2,
  Mail,
  Sparkles,
  User,
  Shield,
  Palette,
  Brain,
  MessageSquare,
  Activity,
  Heart,
  Briefcase,
  Zap,
  Code
} from "lucide-react";

interface SettingsDashboardProps {
  settings: UserSettings;
  onSaveSettings: (settings: UserSettings) => void;
  onClearHistory: () => void;
  messageCount: number;
  onClose?: () => void;
  onAddSystemNotification?: (title: string, body: string, type: "info" | "success" | "reminder" | "message") => void;
  onSimulateEmail?: (subject: string, body: string, category: string) => void;
  onSimulatePush?: (title: string, body: string) => void;
  isPlus?: boolean;
  setIsPlus?: (val: boolean) => void;
  memories?: UserMemory[];
  onSaveMemories?: (memories: UserMemory[]) => void;
}

type MenuTab = "profile" | "appearance" | "behavior" | "notifications" | "billing" | "privacy" | "memories";

export default function SettingsDashboard({
  settings,
  onSaveSettings,
  onClearHistory,
  messageCount,
  onClose,
  onAddSystemNotification,
  onSimulateEmail,
  onSimulatePush,
  isPlus = false,
  setIsPlus,
  memories = [],
  onSaveMemories
}: SettingsDashboardProps) {
  const [activeTab, setActiveTab] = useState<MenuTab>("profile");

  // Local state mirroring
  const [username, setUsername] = useState(settings.username || "Pengguna");
  const [accentColor, setAccentColor] = useState<string>(() => {
    if (settings.theme === "emerald-green") return "Hijau";
    if (settings.theme === "cosmic-purple") return "Ungu";
    if (settings.theme === "minimal-dark") return "Hitam";
    return "Biru";
  });
  const [langStyle, setLangStyle] = useState<LanguageStyle>(settings.languageStyle || "Baku");
  const [toneStyle, setToneStyle] = useState<MariaTone>(settings.tone || "Professional");
  const [customInstructions, setCustomInstructions] = useState(settings.customPrompt || "");
  
  // Voice preferences
  const [voiceEnabled, setVoiceEnabled] = useState(settings.voiceEnabled || false);
  const [elevenlabsApiKey, setElevenlabsApiKey] = useState(settings.elevenlabsApiKey || "");
  const [elevenlabsVoiceId, setElevenlabsVoiceId] = useState(settings.elevenlabsVoiceId || "EXAVITQu4vr4xnSDxMaL");
  const [elevenlabsVoiceModel, setElevenlabsVoiceModel] = useState(settings.elevenlabsVoiceModel || "eleven_flash_v2_5");

  // Local notification preferences states
  const [soundEnabled, setSoundEnabled] = useState(settings.notifications?.soundEnabled ?? true);
  const [statusUpdates, setStatusUpdates] = useState(settings.notifications?.statusUpdates ?? true);
  const [remindersEnabled, setRemindersEnabled] = useState(settings.notifications?.remindersEnabled ?? true);

  const [saveBannerText, setSaveBannerText] = useState<string | null>(null);
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const [isConfirmingLocalClear, setIsConfirmingLocalClear] = useState(false);
  const [isCookieModalOpen, setIsCookieModalOpen] = useState(false);

  // New memory list form controller states
  const [newMemoryText, setNewMemoryText] = useState("");
  const [newMemoryCategory, setNewMemoryCategory] = useState<"personal" | "preferences" | "work" | "other">("personal");

  const handleAddMemory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemoryText.trim()) return;
    const newMemoryItem: UserMemory = {
      id: "mem_" + Date.now(),
      text: newMemoryText.trim(),
      category: newMemoryCategory,
      timestamp: new Date().toISOString()
    };
    const updated = [newMemoryItem, ...memories];
    if (onSaveMemories) {
      onSaveMemories(updated);
    }
    setNewMemoryText("");
    setSaveBannerText("Memori berhasil dicatat!");
    setTimeout(() => setSaveBannerText(null), 2500);
  };

  const handleDeleteMemory = (id: string) => {
    const updated = memories.filter(m => m.id !== id);
    if (onSaveMemories) {
      onSaveMemories(updated);
    }
    setSaveBannerText("Memori berhasil dihapus.");
    setTimeout(() => setSaveBannerText(null), 2500);
  };

  // Synchronization feedback helper
  const triggerSave = (updates: Partial<UserSettings> & { accentVal?: string }) => {
    let targetTheme = settings.theme;
    const currentAccent = updates.accentVal || accentColor;
    if (currentAccent === "Hijau") targetTheme = "emerald-green";
    else if (currentAccent === "Ungu") targetTheme = "cosmic-purple";
    else if (currentAccent === "Hitam") targetTheme = "minimal-dark";
    else if (currentAccent === "Biru") targetTheme = "classic-blue";

    const updatedSettings: UserSettings = {
      username: updates.username !== undefined ? updates.username : username,
      tone: updates.tone !== undefined ? updates.tone : toneStyle,
      languageStyle: updates.languageStyle !== undefined ? updates.languageStyle : langStyle,
      customPrompt: updates.customPrompt !== undefined ? updates.customPrompt : customInstructions,
      theme: targetTheme,
      widgets: settings.widgets,
      notifications: {
        soundEnabled: updates.notifications?.soundEnabled !== undefined ? updates.notifications.soundEnabled : soundEnabled,
        statusUpdates: updates.notifications?.statusUpdates !== undefined ? updates.notifications.statusUpdates : statusUpdates,
        remindersEnabled: updates.notifications?.remindersEnabled !== undefined ? updates.notifications.remindersEnabled : remindersEnabled,
      },
      elevenlabsApiKey: updates.elevenlabsApiKey !== undefined ? updates.elevenlabsApiKey : elevenlabsApiKey,
      elevenlabsVoiceId: updates.elevenlabsVoiceId !== undefined ? updates.elevenlabsVoiceId : elevenlabsVoiceId,
      elevenlabsVoiceModel: updates.elevenlabsVoiceModel !== undefined ? updates.elevenlabsVoiceModel : elevenlabsVoiceModel,
      voiceEnabled: updates.voiceEnabled !== undefined ? updates.voiceEnabled : voiceEnabled,
    };

    onSaveSettings(updatedSettings);

    setSaveBannerText("Pengaturan tersimpan & disinkronkan");
    const t = setTimeout(() => setSaveBannerText(null), 1500);
    return () => clearTimeout(t);
  };

  const getAccentTextClass = () => {
    if (accentColor === "Hijau") return "text-emerald-400";
    if (accentColor === "Ungu") return "text-purple-400";
    if (accentColor === "Hitam") return "text-zinc-400";
    return "text-blue-400";
  };

  const getAccentBgClass = () => {
    if (accentColor === "Hijau") return "bg-emerald-500 hover:bg-emerald-600";
    if (accentColor === "Ungu") return "bg-purple-500 hover:bg-purple-600";
    if (accentColor === "Hitam") return "bg-zinc-700 hover:bg-zinc-800";
    return "bg-blue-600 hover:bg-blue-700";
  };

  const getAccentBorderClass = () => {
    if (accentColor === "Hijau") return "border-emerald-500/20";
    if (accentColor === "Ungu") return "border-purple-500/20";
    if (accentColor === "Hitam") return "border-zinc-800";
    return "border-blue-500/20";
  };

  // Notification simulation trigger helper
  const triggerSimulation = (type: "reminders" | "updates" | "suggestions") => {
    if (type === "reminders") {
      if (onSimulatePush) onSimulatePush("Maria Schedule Reminder 🎀", "Kakak, jadwal belajar coding jam 10 pagi ini sudah dekat ya! Jangan lupa dipersiapkan!");
      if (onAddSystemNotification) onAddSystemNotification("Agenda Terjadwal", "Kelas coding interaktif dimulai 15 menit lagi.", "reminder");
    } else if (type === "updates") {
      if (onSimulateEmail) onSimulateEmail("Karakter Baru: Jack & Sarah 🍃", "Hai Kak! Sekarang asisten Maria dilengkapi karakter baru Jack yang gagah dan Sarah yang lembut.", "system");
      if (onAddSystemNotification) onAddSystemNotification("Pembaruan Sistem", "Modul suara kini berjalan hemat memori harian.", "success");
    } else {
      if (onSimulatePush) onSimulatePush("Analisis Produktivitas 📊", "Saran Maria: Kurangi multitasking dan fokus pada 3 tugas utama hari ini.");
      if (onAddSystemNotification) onAddSystemNotification("Tips Cerdas Maria", "Saran taktis dibuat berdasarkan gaya obrolan terakhir Kakak.", "info");
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0d0d0e] font-sans antialiased text-zinc-100 relative select-none">
      
      {/* Mobile Top Header (hidden on desktop) */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-900 shrink-0 md:hidden bg-[#0d0d0e]">
        <h2 className="text-[13px] font-bold text-zinc-200">
          {activeTab === "profile" && "Profil"}
          {activeTab === "appearance" && "Tampilan & Tema"}
          {activeTab === "behavior" && "Perilaku Asisten"}
          {activeTab === "notifications" && "Notifikasi"}
          {activeTab === "billing" && "Langganan Plus"}
          {activeTab === "privacy" && "Privasi & Data"}
        </h2>
        {onClose && (
          <button 
            type="button" 
            onClick={onClose} 
            className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors cursor-pointer"
            title="Tutup Pengaturan"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Main Split Viewport */}
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden h-full">
        {/* SIDEBAR FOR DESKTOP */}
        <div className="hidden md:flex flex-col w-56 lg:w-64 bg-[#0d0d0e] border-r border-zinc-950 p-4 shrink-0 justify-between">
          <div className="space-y-6">
            <div className="px-1 py-1">
              <h1 className="text-[15px] font-extrabold text-white flex items-center gap-2">
                <Settings className={`w-4 h-4 ${getAccentTextClass()}`} />
                <span>Pengaturan</span>
              </h1>
              <p className="text-[9px] text-zinc-500 font-medium mt-0.5">Ringan, efisien & personal</p>
            </div>
            
            <nav className="space-y-1">
              {[
                { id: "profile", label: "Profil", icon: User },
                { id: "appearance", label: "Tampilan & Tema", icon: Palette },
                { id: "behavior", label: "Perilaku Asisten", icon: Sliders },
                { id: "memories", label: "Memori Maria", icon: Brain },
                { id: "notifications", label: "Notifikasi Sistem", icon: Bell },
                { id: "billing", label: "Langganan Plus", icon: CreditCard },
                { id: "privacy", label: "Data & Privasi", icon: Database },
              ].map((tab) => {
                const TabIcon = tab.id === "privacy" ? Database : (tab.id === "memories" ? Brain : tab.icon);
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as MenuTab)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-semibold transition-all cursor-pointer border ${
                      activeTab === tab.id 
                        ? "bg-zinc-900 border-zinc-800 text-white" 
                        : "text-zinc-400 border-transparent hover:text-zinc-200 hover:bg-zinc-950/70"
                    }`}
                  >
                    <TabIcon className={`w-3.5 h-3.5 ${activeTab === tab.id ? getAccentTextClass() : "text-zinc-400"}`} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="px-2 py-1 text-[8.5px] font-mono text-zinc-600 border-t border-zinc-900/50 pt-2.5 leading-normal">
            SISTEM v1.0.0<br />
            OPTIMASI RUNTIME AKTIF
          </div>
        </div>

        {/* MOBILE HORIZONTAL SCROLL BAR */}
        <div className="flex md:hidden items-center gap-1.5 px-4 py-2 bg-[#0d0d0e] border-b border-zinc-950 overflow-x-auto no-scrollbar shrink-0">
          {[
            { id: "profile", label: "Profil" },
            { id: "appearance", label: "Tampilan" },
            { id: "behavior", label: "Perilaku" },
            { id: "memories", label: "Memori" },
            { id: "notifications", label: "Notifikasi" },
            { id: "billing", label: "Tagihan" },
            { id: "privacy", label: "Data" }
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id as MenuTab)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold leading-none cursor-pointer transition-all shrink-0 border ${
                activeTab === item.id 
                  ? "bg-zinc-900 border-zinc-800 text-white" 
                  : "text-zinc-400 border-transparent hover:bg-zinc-950"
              }`}
            >
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {/* CONTAINER FOR CONTENT PANEL */}
        <div className="flex-1 flex flex-col h-full bg-[#111112] overflow-hidden">
          {/* Top Panel bar shown on Desktop */}
          <div className="hidden md:flex items-center justify-between px-6 py-4 border-b border-zinc-950 shrink-0 bg-[#111112]">
            <h2 className="text-[11.5px] font-extrabold text-zinc-400 tracking-wider uppercase">
              {activeTab === "profile" && "Manajemen Profil Saya"}
              {activeTab === "appearance" && "Kustomisasi Tema & Tampilan"}
              {activeTab === "behavior" && "Perilaku & Gaya Berbicara Maria-ai"}
              {activeTab === "memories" && "Memori Jangka Panjang Maria-ai"}
              {activeTab === "notifications" && "Pengaturan & Simulasi Notifikasi"}
              {activeTab === "billing" && "Kelola Paket Maria Plus"}
              {activeTab === "privacy" && "Kerahasiaan & Kontrol Database"}
            </h2>
            {onClose && (
              <button 
                type="button" 
                onClick={onClose} 
                className="p-1 px-3 bg-zinc-900 hover:bg-zinc-850 rounded-xl border border-zinc-800/80 text-zinc-400 hover:text-white transition-all cursor-pointer text-[10px] font-bold"
              >
                Tutup
              </button>
            )}
          </div>

          {/* Scrolling Content viewport */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4.5 no-scrollbar pb-16">
            
            {/* 1. PROFILE SECTION */}
            {activeTab === "profile" && (
              <div className="space-y-4 max-w-xl transition-all duration-150">
                <h3 className="text-sm font-semibold text-zinc-200">Profil Pengguna</h3>
                <div className="bg-[#161617] rounded-2xl p-5 border border-zinc-900/60 shadow-xs space-y-4">
                  <div className="flex items-center gap-5">
                    {auth.currentUser?.photoURL ? (
                      <img 
                        src={auth.currentUser.photoURL} 
                        alt={username} 
                        referrerPolicy="no-referrer"
                        className="w-16 h-16 rounded-xl object-cover shadow-md border border-zinc-800"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-xl font-bold uppercase text-white shadow-md">
                        {username ? username.charAt(0) : "U"}
                      </div>
                    )}
                    <div className="space-y-1">
                      <p className="text-base font-bold text-zinc-100">{username}</p>
                      <p className="text-[10px] text-zinc-400 font-mono select-all">
                        {auth.currentUser?.email || "contoh@email.com"}
                      </p>
                      <p className="text-[9px] text-[#a855f7] font-semibold">ID Anggota Aktif • Sesi Terhubung</p>
                    </div>
                  </div>

                  <div className="h-[1.5px] bg-zinc-900/45 my-2" />

                  <div className="space-y-2">
                    <label className="block text-[9.5px] font-bold text-zinc-400 uppercase tracking-wide">
                      Ubah Nama Panggilan
                    </label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => {
                        const val = e.target.value;
                        setUsername(val);
                        triggerSave({ username: val });
                      }}
                      className="w-full bg-[#0d0d0e] border border-zinc-800 focus:border-zinc-600 rounded-lg px-3.5 py-2 text-zinc-200 text-[11px] outline-none transition-colors"
                      placeholder="Masukkan nama Anda..."
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 2. APPEARANCE SECTION */}
            {activeTab === "appearance" && (
              <div className="space-y-4 max-w-xl duration-150">
                <h3 className="text-sm font-semibold text-zinc-200 font-sans">Kustomisasi Tampilan</h3>
                <div className="bg-[#161617] rounded-2xl p-4.5 border border-zinc-900/60 space-y-4">
                  {/* Accent selection */}
                  <div className="space-y-2.5">
                    <label className="block text-[9.5px] font-bold text-zinc-400 uppercase tracking-wide">
                      Gaya Warna Aksen & Tema
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { name: "Biru", color: "bg-blue-500" },
                        { name: "Hijau", color: "bg-emerald-500" },
                        { name: "Ungu", color: "bg-purple-500" },
                        { name: "Hitam", color: "bg-zinc-600" }
                      ].map((opt) => (
                        <button
                          key={opt.name}
                          type="button"
                          onClick={() => {
                            setAccentColor(opt.name);
                            triggerSave({ accentVal: opt.name });
                          }}
                          className={`p-2 rounded-xl flex items-center justify-center gap-1.5 text-[10.5px] font-semibold border transition-all cursor-pointer ${
                            accentColor === opt.name 
                              ? "bg-zinc-900 border-zinc-700 text-white" 
                              : "bg-[#0d0d0e]/60 border-transparent text-zinc-400 hover:bg-zinc-900/50"
                          }`}
                        >
                          <span className={`w-2.5 h-2.5 rounded-full ${opt.color} shrink-0`} />
                          <span>{opt.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* App language style selector */}
                  <div className="space-y-2 pt-2 border-t border-zinc-900/20">
                    <label className="block text-[9.5px] font-bold text-zinc-400 uppercase tracking-wide">
                      Gaya Bahasa & Sifat Dialog
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { value: "Baku", label: "Formal (Baku)" },
                        { value: "Santai", label: "Santai (Luwes)" }
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            setLangStyle(opt.value as LanguageStyle);
                            triggerSave({ languageStyle: opt.value as LanguageStyle });
                          }}
                          className={`p-2 px-3 rounded-xl flex items-center justify-center gap-1.5 text-[10.5px] font-semibold border transition-all cursor-pointer ${
                            langStyle === opt.value 
                              ? "bg-zinc-900 border-zinc-750 text-white" 
                              : "bg-[#0d0d0e]/60 border-transparent text-zinc-400 hover:bg-zinc-900/40"
                          }`}
                        >
                          <span>{opt.label}</span>
                          {langStyle === opt.value && <Check className="w-3 h-3 text-zinc-300" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. BEHAVIOR SECTION */}
            {activeTab === "behavior" && (
              <div className="space-y-5 max-w-xl duration-150 font-sans">
                <div className="space-y-1">
                  <h3 className="text-[14.5px] font-bold text-zinc-100 flex items-center gap-2">
                    <Sliders className={`w-4 h-4 ${getAccentTextClass()}`} />
                    Personalisasi Perilaku Maria 
                  </h3>
                  <p className="text-[10px] text-zinc-500 leading-normal max-w-md">
                    Sesuaikan gaya berbicara dan karakter unik asisten agar sesuai dengan alur kerja, mood, atau kebutuhan produktivitas Kakak sehari-hari.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-3">
                    <label className="flex items-center gap-1.5 text-[9.5px] font-bold text-zinc-400 uppercase tracking-widest pl-1">
                      Karakter Kepribadian
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { tone: "Professional", icon: Briefcase, desc: "Akurat & formal" },
                        { tone: "Warm", icon: Heart, desc: "Ramah & empati" },
                        { tone: "Creative", icon: Sparkles, desc: "Imajinatif & unik" },
                        { tone: "Technical", icon: Code, desc: "Logis & analitis" },
                        { tone: "Minimalist", icon: Zap, desc: "Singkat, to-the-point" }
                      ].map((item) => (
                        <button
                          key={item.tone}
                          type="button"
                          onClick={() => {
                            setToneStyle(item.tone as MariaTone);
                            triggerSave({ tone: item.tone as MariaTone });
                          }}
                          className={`relative p-3.5 rounded-2xl flex flex-col items-start gap-1.5 border transition-all cursor-pointer overflow-hidden ${
                            toneStyle === item.tone 
                              ? `bg-zinc-900/90 border-zinc-700 shadow-sm ${getAccentTextClass()}` 
                              : "bg-[#161617]/50 border-zinc-900 hover:bg-[#161617]/90 text-zinc-400 hover:border-zinc-800"
                          }`}
                        >
                          {toneStyle === item.tone && (
                            <div className="absolute top-0 right-0 w-12 h-12 bg-current opacity-[0.04] blur-xl rounded-full" />
                          )}
                          <div className={`p-1.5 rounded-lg mb-0.5 ${toneStyle === item.tone ? "bg-zinc-950/50" : "bg-black/20"}`}>
                            <item.icon className="w-4 h-4" />
                          </div>
                          <div className="text-left">
                            <h4 className={`text-[11.5px] font-bold ${toneStyle === item.tone ? "text-zinc-100" : "text-zinc-300"}`}>
                              {item.tone}
                            </h4>
                            <p className="text-[9.5px] font-medium opacity-70 mt-0.5">
                              {item.desc}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3 pt-3">
                    <label className="flex items-center gap-1.5 text-[9.5px] font-bold text-zinc-400 uppercase tracking-widest pl-1">
                      Instruksi Kustom (Opsional)
                    </label>
                    <div className="relative group">
                      <div className="absolute top-3 left-3 text-zinc-500">
                        <MessageSquare className="w-4 h-4" />
                      </div>
                      <textarea
                        value={customInstructions}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCustomInstructions(val);
                          triggerSave({ customPrompt: val });
                        }}
                        className="w-full h-32 pl-9 p-3.5 pt-3 rounded-2xl border border-zinc-900 bg-[#161617] text-zinc-100 text-[11px] focus:border-zinc-700 focus:bg-zinc-900/50 outline-none resize-none leading-relaxed transition-all shadow-inner"
                        placeholder="Contoh: Selalu sapa saya dengan 'Halo Kak!' setiap memulai percakapan baru, gunakan bahasa yang sangat puitis..."
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 4. NOTIFICATIONS */}
            {activeTab === "notifications" && (
              <div className="space-y-5 max-w-xl duration-150 font-sans">
                <div className="space-y-1">
                  <h3 className="text-[14.5px] font-bold text-zinc-100 flex items-center gap-2">
                    <Bell className={`w-4 h-4 ${getAccentTextClass()}`} />
                    Aktivitas & Notifikasi
                  </h3>
                  <p className="text-[10px] text-zinc-500 leading-normal max-w-md">
                    Atur preferensi pemberitahuan untuk memastikan Anda tidak ketinggalan inspirasi pintar atau sekadar menikmati keheningan produktivitas tinggi.
                  </p>
                </div>

                <div className="bg-[#161617] rounded-3xl border border-zinc-900/80 overflow-hidden divide-y divide-zinc-900/50 shadow-sm">
                  {/* Sound enabled toggle */}
                  <label className="flex items-center justify-between p-4.5 hover:bg-zinc-900/30 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3.5">
                      <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                        <Volume2 className="w-4 h-4 text-blue-400" />
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-zinc-100 font-bold text-[11.5px] block">Efek Suara Antarmuka</span>
                        <span className="text-[10px] text-zinc-500 block leading-tight max-w-[200px]">Umpan balik audio lembut saat interaksi sistem.</span>
                      </div>
                    </div>
                    <div
                      onClick={(e) => {
                        e.preventDefault();
                        const next = !soundEnabled;
                        setSoundEnabled(next);
                        triggerSave({ notifications: { soundEnabled: next, statusUpdates, remindersEnabled } });
                      }}
                      className={`relative w-9 h-5 rounded-full p-[2px] transition-colors duration-300 shadow-inner ${soundEnabled ? getAccentBgClass() : 'bg-[#323235]'}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 transform ${soundEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                  </label>

                  {/* Status updates toggle */}
                  <label className="flex items-center justify-between p-4.5 hover:bg-zinc-900/30 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3.5">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                        <Activity className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-zinc-100 font-bold text-[11.5px] block">Pembaruan Sistem</span>
                        <span className="text-[10px] text-zinc-500 block leading-tight max-w-[200px]">Terima metrik dan info terkait versi rilis Maria.</span>
                      </div>
                    </div>
                    <div
                      onClick={(e) => {
                        e.preventDefault();
                        const next = !statusUpdates;
                        setStatusUpdates(next);
                        triggerSave({ notifications: { soundEnabled, statusUpdates: next, remindersEnabled } });
                      }}
                      className={`relative w-9 h-5 rounded-full p-[2px] transition-colors duration-300 shadow-inner ${statusUpdates ? getAccentBgClass() : 'bg-[#323235]'}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 transform ${statusUpdates ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                  </label>

                  {/* Reminders / Suggestions toggle */}
                  <label className="flex items-center justify-between p-4.5 hover:bg-zinc-900/30 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3.5">
                      <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
                        <Sparkles className="w-4 h-4 text-purple-400" />
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-zinc-100 font-bold text-[11.5px] block">Saran Pintar</span>
                        <span className="text-[10px] text-zinc-500 block leading-tight max-w-[200px]">Izinkan asisten merokemendasikan tugas proaktif.</span>
                      </div>
                    </div>
                    <div
                      onClick={(e) => {
                        e.preventDefault();
                        const next = !remindersEnabled;
                        setRemindersEnabled(next);
                        triggerSave({ notifications: { soundEnabled, statusUpdates, remindersEnabled: next } });
                      }}
                      className={`relative w-9 h-5 rounded-full p-[2px] transition-colors duration-300 shadow-inner ${remindersEnabled ? getAccentBgClass() : 'bg-[#323235]'}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 transform ${remindersEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                  </label>
                </div>

                {/* Simulation notifications control section */}
                <div className="space-y-3 pt-2">
                  <label className="block text-[9.5px] font-bold text-zinc-400 uppercase tracking-widest pl-1">
                    Coba Pengujian Notifikasi
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => triggerSimulation("reminders")}
                      className="bg-[#161617] hover:bg-zinc-900/80 border border-zinc-900 rounded-2xl p-3 text-center flex flex-col items-center gap-2 cursor-pointer transition-all active:scale-95 shadow-sm group"
                    >
                      <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Bell className="w-3.5 h-3.5 text-blue-400" />
                      </div>
                      <span className="text-[10px] font-bold text-zinc-300">Agenda</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => triggerSimulation("updates")}
                      className="bg-[#161617] hover:bg-zinc-900/80 border border-zinc-900 rounded-2xl p-3 text-center flex flex-col items-center gap-2 cursor-pointer transition-all active:scale-95 shadow-sm group"
                    >
                      <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Mail className="w-3.5 h-3.5 text-emerald-400" />
                      </div>
                      <span className="text-[10px] font-bold text-zinc-300">Pembaruan</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => triggerSimulation("suggestions")}
                      className="bg-[#161617] hover:bg-zinc-900/80 border border-zinc-900 rounded-2xl p-3 text-center flex flex-col items-center gap-2 cursor-pointer transition-all active:scale-95 shadow-sm group"
                    >
                      <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                      </div>
                      <span className="text-[10px] font-bold text-zinc-300">Saran</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 5. BILLING SECTION */}
            {activeTab === "billing" && (
              <div className="space-y-4 max-w-xl duration-150 font-sans">
                <h3 className="text-sm font-semibold text-zinc-200">Paket Langganan</h3>
                <div className="bg-[#161617] rounded-2xl p-5 border border-zinc-900/60 space-y-4 text-center">
                  <div className="space-y-1">
                    <p className={`text-lg font-black tracking-tight ${isPlus ? getAccentTextClass() : "text-zinc-400"}`}>
                      {isPlus ? "👑 Spesifikasi Plus Aktif" : "Maria Standard"}
                    </p>
                    <p className="text-[10px] text-zinc-500">
                      {isPlus ? "Akses premium tanpa batas ke model tercepat." : "Paket gratis dengan prioritas reguler."}
                    </p>
                  </div>

                  <div className="h-[1.5px] bg-[#0d0d0e] my-1" />

                  <div className="flex gap-2 justify-center pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (setIsPlus) setIsPlus(true);
                        safeStorage.setItem("maria_is_plus", "true");
                        safeStorage.setItem("maria_plus_plan", "monthly");
                        triggerSave({});
                      }}
                      className={`px-4 py-2 border rounded-xl text-[10.5px] font-bold cursor-pointer transition-all ${isPlus ? "bg-zinc-900 text-white border-zinc-700" : "bg-[#0d0d0e]/60 border-transparent text-zinc-400 hover:bg-zinc-900 hover:text-white"}`}
                    >
                      Aktifkan Maria Plus (Simulator)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (setIsPlus) setIsPlus(false);
                        safeStorage.setItem("maria_is_plus", "false");
                        triggerSave({});
                      }}
                      className={`px-4 py-2 border rounded-xl text-[10.5px] font-semibold cursor-pointer transition-all ${!isPlus ? "bg-zinc-900 text-white border-zinc-700" : "bg-[#0d0d0e]/60 border-transparent text-zinc-400 hover:bg-zinc-900 hover:text-white"}`}
                    >
                      Batal Langganan
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 6. PRIVACY & DATA */}
            {activeTab === "privacy" && (
              <div className="space-y-4 max-w-xl duration-150 font-sans">
                <h3 className="text-sm font-semibold text-zinc-200 font-sans">Privasi & Bersihkan Data</h3>
                <div className="bg-[#161617] rounded-2xl p-4.5 border border-zinc-900/60 space-y-4">
                  <div className="space-y-1">
                    <p className="text-zinc-200 font-medium text-[11.5px]">Penyimpanan Data Lokal & Awan</p>
                    <p className="text-[10px] text-zinc-500 leading-normal">
                      Sesi obrolan dan preferensi Kakak disinkronkan secara aman ke database cloud. Jumlah pesan saat ini: <span className="text-zinc-300 font-bold">{messageCount}</span> pesan.
                    </p>
                  </div>

                  <div className="pt-3 border-t border-zinc-900/40 flex items-center justify-between">
                    <div className="space-y-0.5 max-w-[280px]">
                      <span className="text-zinc-200 font-semibold text-[11px] block">Kebijakan Privasi (Privacy Policy)</span>
                      <span className="text-[9.5px] text-zinc-400 block leading-tight">
                        Pelajari bagaimana kami mengumpulkan, menggunakan, dan melindungi data pribadi Kakak di Maria-ai.
                      </span>
                    </div>
                    <a
                      href="/kebijakan-privasi.html"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 border border-zinc-800 rounded-xl text-[10.5px] font-bold cursor-pointer transition-colors shrink-0 inline-block text-center"
                    >
                      Baca Privasi
                    </a>
                  </div>

                  <div className="pt-3 border-t border-zinc-900/40 flex items-center justify-between">
                    <div className="space-y-0.5 max-w-[280px]">
                      <span className="text-zinc-200 font-semibold text-[11px] block">Kebijakan Cookies (Cookies Policy)</span>
                      <span className="text-[9.5px] text-zinc-400 block leading-tight">
                        Pelajari penggunaan file teks esensial, analisis data, dan opsi manajemen privasi Kakak di platform ini sesuai standar global.
                      </span>
                    </div>
                    <a
                      href="/kebijakan-cookies.html"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 border border-zinc-800 rounded-xl text-[10.5px] font-bold cursor-pointer transition-colors shrink-0 inline-block text-center"
                    >
                      Baca Kebijakan
                    </a>
                  </div>

                  <div className="pt-3 border-t border-zinc-900/40 flex items-center justify-between">
                    <div className="space-y-0.5 max-w-[280px]">
                      <span className="text-zinc-200 font-semibold text-[11px] block">Ketentuan Layanan (Terms of Service)</span>
                      <span className="text-[9.5px] text-zinc-400 block leading-tight">
                        Syarat dan ketentuan dalam menggunakan layanan asisten cerdas Maria-ai.
                      </span>
                    </div>
                    <a
                      href="/ketentuan-layanan.html"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 border border-zinc-800 rounded-xl text-[10.5px] font-bold cursor-pointer transition-colors shrink-0 inline-block text-center"
                    >
                      Baca TOS
                    </a>
                  </div>

                  <div className="pt-3 border-t border-zinc-900/40 flex items-center justify-between">
                    <div className="space-y-0.5 max-w-[280px]">
                      <span className="text-zinc-200 font-semibold text-[11px] block">Pusat Bantuan (Help Center)</span>
                      <span className="text-[9.5px] text-zinc-400 block leading-tight">
                        Temukan FAQ dan informasi bantuan lainnya.
                      </span>
                    </div>
                    <a
                      href="/pusat-bantuan.html"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 border border-zinc-800 rounded-xl text-[10.5px] font-bold cursor-pointer transition-colors shrink-0 inline-block text-center"
                    >
                      Buka Bantuan
                    </a>
                  </div>

                  <div className="pt-3 border-t border-zinc-900/40 flex items-center justify-between">
                    <div className="space-y-0.5 max-w-[280px]">
                      <span className="text-zinc-200 font-semibold text-[11px] block">Hapus Semua Riwayat Obrolan</span>
                      <span className="text-[9.5px] text-zinc-400 block leading-tight">Bersihkan semua thread chat dari Firestore.</span>
                    </div>

                    {!isConfirmingClear ? (
                      <button
                        type="button"
                        onClick={() => setIsConfirmingClear(true)}
                        className="px-3.5 py-1.5 bg-red-950/40 hover:bg-red-900/30 text-red-400 border border-red-500/15 rounded-xl text-[10.5px] font-bold cursor-pointer transition-colors"
                      >
                        Hapus Obrolan
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 animate-fade-in duration-150">
                        <button
                          type="button"
                          onClick={() => {
                            onClearHistory();
                            setIsConfirmingClear(false);
                            if (onClose) onClose();
                          }}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[10px] font-extrabold cursor-pointer"
                        >
                          Ya, Hapus
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsConfirmingClear(false)}
                          className="px-3 py-1.5 bg-zinc-900 text-zinc-400 rounded-lg text-[10px] font-semibold cursor-pointer"
                        >
                          Batal
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 7. LONG-TERM MEMORIES */}
            {activeTab === "memories" && (
              <div className="space-y-5 max-w-xl duration-150 font-sans">
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-zinc-200 font-sans">Ingatan Jangka Panjang Terpadu</h3>
                  <p className="text-[10px] text-zinc-500 leading-normal">
                    Maria merekam secara otomatis hal penting tentang diri Kakak (seperti cita-cita, kepribadian, hobi, atau preferensi lainnya) langsung dari percakapan obrolan harian Anda dan menyimpannya dalam satu ingatan terpadu yang sinkron ke Firebase Cloud.
                  </p>
                </div>

                {memories.length === 0 || !memories[0]?.text ? (
                  <div className="bg-[#161617]/40 rounded-2xl p-8 border border-dashed border-zinc-900/50 flex flex-col items-center justify-center text-center space-y-3">
                    <Brain className="w-8 h-8 text-zinc-600 animate-pulse" />
                    <p className="text-[11px] text-zinc-400 font-sans leading-relaxed max-w-sm">
                      Ingatannya Maria saat ini masih bersih & kosong.
                    </p>
                    <p className="text-[9.5px] text-zinc-600 max-w-xs">
                      Silakan kirim pesan atau mengobrol santai dengannya! Maria akan menganalisis percakapan secara otomatis dan mulai mengabadikan ingatan terpadu tentang Kakak di sini.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-gradient-to-br from-[#12131a] to-[#161720] border border-zinc-800/60 rounded-2xl p-5 shadow-2xl relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl" />
                      
                      <div className="flex items-center gap-2 mb-3">
                        <Brain className="w-4 h-4 text-indigo-400 animate-pulse" />
                        <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Memori Terpadu Maria</span>
                      </div>

                      <div className="text-xs text-zinc-200 leading-relaxed italic bg-zinc-950/40 p-4 border border-zinc-900 rounded-xl font-sans">
                        &ldquo;{memories[0].text}&rdquo;
                      </div>

                      <div className="flex items-center justify-between mt-3 text-[9px] text-zinc-500">
                        <span>
                          Terakhir Diperbarui: {memories[0].timestamp ? new Date(memories[0].timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : "Baru saja"}
                        </span>
                        
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm("Apakah Kakak yakin ingin mengosongkan seluruh memori jangka panjang Maria? Maria akan melupakan semua detail personal tentang Kakak.")) {
                              if (onSaveMemories) onSaveMemories([]);
                            }
                          }}
                          className="px-2.5 py-1 rounded bg-red-950/20 hover:bg-red-900/30 text-red-400 hover:text-white border border-red-900/10 font-bold transition-all cursor-pointer flex items-center gap-1"
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                          <span>Bersihkan Memori</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* SINKRONISASI BANNER */}
                <div className="bg-[#161617]/30 border border-zinc-900/40 p-3.5 rounded-2xl flex items-center gap-3">
                  <Database className="w-4 h-4 text-emerald-500 shrink-0" />
                  <div className="space-y-0.5">
                    <span className="text-[10.5px] font-bold text-zinc-300 block">Autopilot Sinkronisasi Cloud Aktif</span>
                    <span className="text-[9px] text-zinc-500 leading-tight block">Pembentukan ingatan terpadu Maria berjalan di belakang layar secara cerdas dan sinkron langsung ke database Firebase.</span>
                  </div>
                </div>

              </div>
            )}

          {/* Closing of scrolling content Area */}
          </div>
        {/* Closing of container for content panel */}
        </div>
      {/* Closing of main split viewport */}
      </div>

      {/* Persistent Save Status Notification Banner */}
      {saveBannerText && (
        <div className={`absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl bg-slate-900/95 text-[10px] font-bold text-white shadow-xl flex items-center gap-1.5 animate-fade-in z-50 border border-slate-800 ${getAccentBgClass()}`}>
          <Check className="w-3 h-3 text-white" />
          <span>{saveBannerText}</span>
        </div>
      )}

      {/* Interactive Cookies Policy Reader overlay */}
      <CookiePolicyModal 
        isOpen={isCookieModalOpen} 
        onClose={() => setIsCookieModalOpen(false)}
        accentClass={getAccentTextClass()}
        accentBgClass={getAccentBgClass()}
      />

    </div>
  );
}
