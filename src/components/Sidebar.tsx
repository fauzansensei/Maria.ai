import React, { useState } from "react";
import { 
  MessageSquare, 
  BookOpen, 
  Compass, 
  Zap, 
  ChevronsUpDown, 
  Sparkles, 
  Plus, 
  ArrowLeft,
  X,
  Check,
  Search,
  BadgePercent,
  TrendingUp,
  FileText,
  Settings,
  MoreVertical,
  Share2,
  Pin,
  Pencil,
  Trash2,
  Archive,
  HelpCircle
} from "lucide-react";
import { Message, UserSettings, ChatThread } from "../types";

// Theme specs matching Screenshot 1 (Voxa Dark Vibe)
interface SidebarProps {
  settings: UserSettings;
  messages: Message[];
  onLoadChatHistory: (msgs: Message[]) => void;
  onNewChat: () => void;
  onToggleSettings: () => void;
  onOpenProfile?: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  threads?: ChatThread[];
  activeThreadId?: string;
  onSelectThread?: (id: string) => void;
  onPinThread?: (id: string) => void;
  onRenameThread?: (id: string, newTitle: string) => void;
  onDeleteThread?: (id: string) => void;
  onShareThread?: (id: string) => void;
  onArchiveThread?: (id: string) => void;
  activeView?: "chat" | "library" | "discover";
  onViewChange?: (view: "chat" | "library" | "discover") => void;
  profileAvatarProp?: string;
  useInitialsAvatarProp?: boolean;
  profileAvatarBgProp?: string;
  profileUsernameHandleProp?: string;
  profileDisplayNameProp?: string;
  isLoggedIn?: boolean;
  isPlus?: boolean;
  onUpgradeSuccess?: (planType: "monthly" | "yearly") => void;
  onGoogleSignIn?: () => void;
  authProp?: any;
}

// Preset Mock Chats matching Screenshot list exactly & loaded dynamically
const MOCK_CHAT_HISTORIES: Record<string, { title: string; messages: Message[] }> = {
  "horror-script": {
    title: "A Short script for a ho...",
    messages: [
      {
        id: "mock-h1-u",
        role: "user",
        content: "Tolong tuliskan naskah film pendek horror singkat tentang sebuah jam weker kuno di kamar hotel kuno.",
        timestamp: new Date(Date.now() - 36000000).toISOString(),
      },
      {
        id: "mock-h1-a",
        role: "assistant",
        content: "Berikut adalah naskah film pendek horor singkat berdurasi 2 menit:\n\n**Judul: DETAK TERAKHIR**\n\n*Scene 1: Kamar Hotel Klasik #404 - Tengah Malam.*\nLampu temaram berkedip manja di atas ranjang. Riko (25) memandang jam weker kuno berbahan perunggu yang bersemayam di nakas kayu ek tua. Detaknya terdengar aneh—terlalu lambat. \n*Tik... Tok... Tik...*\n\n*Scene 2: Kamar Mandi.*\nRiko membasuh wajahnya dengan air dingin untuk mengusir rasa penat. Tiba-tiba saja, detakan jam weker perunggu yang berasal dari kamar tidur mendadak terhenti seketika. Keheningan total menyergap seisi ruangan.\n\n*Scene 3: Kamar Tidur.*\nDia perlahan melangkah kembali ke tempat tidur. Begitu terpana melihat jam weker kuno tersebut kini menunjuk tepat di angka 03:00 dini hari dan jarum detiknya berputar terbalik dengan sangat cepat!\n\nSaat Riko menatapnya lekat-lekat, bayangan hitam tinggi nan kurus muncul tepat di belakang lehernya...\n\nSaran saya, tambahkan latar suara instrumen gending angker di bagian klimaks adegan ini Kak. Bagaimana menurut Anda?",
        timestamp: new Date(Date.now() - 35900000).toISOString(),
      }
    ]
  },
  "clean-nav": {
    title: "Can you help me in m...",
    messages: [
      {
        id: "mock-h2-u",
        role: "user",
        content: "Can you help me in making a clean responsive navigation component using React and Tailwind CSS?",
        timestamp: new Date(Date.now() - 28000000).toISOString(),
      },
      {
        id: "mock-h2-a",
        role: "assistant",
        content: "Absolutely! Here is a pristine, production-ready React component styled with Tailwind CSS containing a responsive mobile layout drawer:\n\n```tsx\nimport React, { useState } from 'react';\nimport { Menu, X, Compass, User } from 'lucide-react';\n\nexport default function Navigation() {\n  const [isOpen, setIsOpen] = useState(false);\n  \n  return (\n    <nav className=\"bg-slate-900 border-b border-slate-800 text-white\">\n      <div className=\"max-w-7xl mx-auto px-4 sm:px-6 lg:px-8\">\n        <div className=\"flex items-center justify-between h-16\">\n          <span className=\"font-bold font-display text-lg tracking-tight text-white\">Voxa AI</span>\n          \n          {/* Desktop link items */}\n          <div className=\"hidden md:flex items-center gap-6\">\n            <a href=\"#\" className=\"text-slate-300 hover:text-white text-xs font-semibold\">Library</a>\n            <a href=\"#\" className=\"text-slate-300 hover:text-white text-xs font-semibold\">Discover</a>\n          </div>\n          \n          {/* Mobile hamburger menu button */}\n          <button \n            onClick={() => setIsOpen(!isOpen)} \n            className=\"md:hidden p-2 hover:bg-slate-850 rounded-lg\"\n          >\n            {isOpen ? <X className=\"w-5 h-5\" /> : <Menu className=\"w-5 h-5\" />}\n          </button>\n        </div>\n      </div>\n    </nav>\n  );\n}\n```\n\n### Why this is polished:\n1. **Desktop-First Integrity**: Scales smoothly down to mobile targets with absolute standard flex alignment.\n2. **Clean Typography**: Uses sharp tracking tweaks on the label lines.\n\nWould you like me to add code examples representing animated transitions using `@motion/react` as well?",
        timestamp: new Date(Date.now() - 27900000).toISOString(),
      }
    ]
  },
  "car-diagnosis": {
    title: "My car is not working...",
    messages: [
      {
        id: "mock-h3-u",
        role: "user",
        content: "My car is not working. Mobil saya tidak mau menyala saat starter, tapi ada bunyi klik tek-tek-tek berulang kali dengan cepat. Kira-kira kenapa ya?",
        timestamp: new Date(Date.now() - 18000000).toISOString(),
      },
      {
        id: "mock-h3-a",
        role: "assistant",
        content: "Berdasarkan rujukan tanda mekanis, bunyi **tek-tek-tek cepat** saat Anda mencoba memosisikan kontak ke starter adalah gejala mutlak dari **Aki Tekor / Lemah (Battery low voltage / discharged)**.\n\nBerikut tata cara melalukan analisis mandiri:\n\n1. **Periksa Terminal Aki**: Pastikan katup kepala aki bersih bebas debu korosi putih kehijauan, dan terpasang sangat kencang.\n2. **Uji Penerangan Utama**: Nyalakan saklar lampu sorot jauh mobil Anda. Jika lampu meredup parah saat starter diputar, voltase aki sisa sedikit.\n3. **Masalah Dinamo Starter**: Jika aki dipastikan sepenuhnya prima namun suara masih timbul, komutator atau arang brush dinamo as starter Anda mungkin aus.\n\n**Saran Tindakan Cepat:** Anda bisa meminta bantuan kawan dekat untuk melakukan jumper listrik aki, atau mengontak teknisi jasa panggilan aki untuk penukaran yang bergaransi resmi.",
        timestamp: new Date(Date.now() - 17900000).toISOString(),
      }
    ]
  },
  "parenting": {
    title: "Respected Parenting...",
    messages: [
      {
        id: "mock-h4-u",
        role: "user",
        content: "Bagaimana cara mendidik anak agar mandiri sejak dini tanpa terkesan memaksa anak?",
        timestamp: new Date(Date.now() - 9000000).toISOString(),
      },
      {
        id: "mock-h4-a",
        role: "assistant",
        content: "Mendidik buah hati agar mandiri membutuhkan kepemimpinan non-otoriter berlandaskan empati hangat. Berikut takaran efektif:\n\n* **Tawarkan Pilihan Terstruktur (Otonomi Terbatas)**:\n  Contoh: Daripada berkata kasar *'Segera rapikan kamar tidurmu!'*, ganti dengan kalimat santun *'Kakak mau merapikan rak buku dulu atau melipat kain selimut dulu hari ini?'*\n\n* **Hargai Ikhtiar/Usaha, Bukan Hanya Finis**:\n  Walaupun letak ikat tali sepatu mereka masih miring, cukup beri apresiasi setinggi langit atas kesabarannya berproses sendirian.\n\n* **Berikan Konsekuensi Logis Secara Tenang**:\n  Biarkan anak belajar dari pengalaman nyata yang aman untuk mengasah kalkulasi logikanya di masa mendatang.",
        timestamp: new Date(Date.now() - 8900050).toISOString(),
      }
    ]
  }
};

interface ThreadItemProps {
  thread: ChatThread;
  isActive: boolean;
  isEditing: boolean;
  editTitle: string;
  setEditTitle: (val: string) => void;
  setEditingId: (val: string | null) => void;
  activeMenuId: string | null;
  setActiveMenuId: (val: string | null) => void;
  onSelectThread?: (id: string) => void;
  onViewChange?: (view: "chat" | "library" | "discover") => void;
  onToggleCollapse: () => void;
  onShareThread?: (id: string) => void;
  onArchiveThread?: (id: string) => void;
  onPinThread?: (id: string) => void;
  onRenameThread?: (id: string, newTitle: string) => void;
  onDeleteThread?: (id: string) => void;
}

const ThreadItem = React.memo(function ThreadItem({
  thread,
  isActive,
  isEditing,
  editTitle,
  setEditTitle,
  setEditingId,
  activeMenuId,
  setActiveMenuId,
  onSelectThread,
  onViewChange,
  onToggleCollapse,
  onShareThread,
  onArchiveThread,
  onPinThread,
  onRenameThread,
  onDeleteThread,
}: ThreadItemProps) {
  return (
    <div
      className={`group relative w-full rounded-xl flex items-center justify-between text-[11px] font-medium leading-tight text-left transition-all duration-200 ${
        isActive 
          ? "bg-[#1c1e24] text-white font-semibold" 
          : "text-slate-300 hover:text-white hover:bg-[#15171d]/60"
      }`}
    >
      {isEditing ? (
        <div className="flex-1 flex items-center gap-1.5 p-1 z-10 w-full">
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (onRenameThread) onRenameThread(thread.id, editTitle);
                setEditingId(null);
              } else if (e.key === "Escape") {
                setEditingId(null);
              }
            }}
            aria-label="Isi nama baru percakapan"
            className="flex-grow bg-[#0f1013] border border-blue-500 rounded-lg px-2 py-1 text-white text-[11px] font-medium focus:outline-hidden"
            autoFocus
          />
          <button
            type="button"
            onClick={() => {
              if (onRenameThread) onRenameThread(thread.id, editTitle);
              setEditingId(null);
            }}
            aria-label="Simpan nama percakapan baru"
            className="p-1 text-emerald-400 hover:bg-slate-800 rounded-md shrink-0 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setEditingId(null)}
            aria-label="Batal ganti nama percakapan"
            className="p-1 text-rose-400 hover:bg-slate-800 rounded-md shrink-0 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <>
          {/* Thread Title Selection Click Target */}
          <button
            type="button"
            onClick={() => {
              if (onSelectThread) onSelectThread(thread.id);
              if (onViewChange) onViewChange("chat");
              if (window.innerWidth < 1024) {
                onToggleCollapse();
              }
            }}
            aria-label={`Pilih percakapan: ${thread.title}`}
            className="flex-1 py-2.5 pl-3.5 pr-10 text-left truncate cursor-pointer flex items-center gap-2"
          >
            {thread.isPinned && (
              <Pin className="w-3 h-3 text-cyan-400 shrink-0 transform -rotate-45" />
            )}
            <span className="truncate">{thread.title}</span>
          </button>

          {/* Dropdown Toggle More Options Button */}
          <div className="absolute right-1.5 flex items-center gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveMenuId(activeMenuId === thread.id ? null : thread.id);
              }}
              aria-label={`Menu opsi percakapan: ${thread.title}`}
              className={`p-1.5 rounded-full hover:bg-slate-800/85 text-slate-400 hover:text-white transition-opacity duration-150 cursor-pointer ${
                isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
              }`}
              title="Menu Percakapan"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>
          </div>
          
          {/* Relative Dropdown Popover container */}
          {activeMenuId === thread.id && (
            <>
              {/* Backdrop overlay to click outside and dismiss dropdown */}
              <div 
                className="fixed inset-0 z-30 cursor-default" 
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveMenuId(null);
                }}
              />
              
              {/* Gemini Style Floating Menu Card */}
              <div className="absolute top-8 right-2 z-45 w-48 py-1.5 rounded-xl bg-[#1b1d24] border border-[#2c2f37] shadow-2xl text-[11px] animate-fade-in text-slate-200">
                
                {/* Option: Share */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenuId(null);
                    if (onShareThread) onShareThread(thread.id);
                  }}
                  aria-label="Bagikan percakapan"
                  className="w-full px-3.5 py-2.5 text-left hover:bg-[#252831] flex items-center gap-2.5 transition-colors cursor-pointer text-slate-300 hover:text-white"
                >
                  <Share2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>Bagikan percakapan</span>
                </button>

                {/* Option: Archive */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenuId(null);
                    if (onArchiveThread) onArchiveThread(thread.id);
                  }}
                  aria-label="Arsipkan percakapan"
                  className="w-full px-3.5 py-2.5 text-left hover:bg-[#252831] flex items-center gap-2.5 transition-colors cursor-pointer text-slate-300 hover:text-white"
                >
                  <Archive className="w-3.5 h-3.5 text-slate-400" />
                  <span>Arsipkan ke Pustaka</span>
                </button>

                {/* Option: Pin */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenuId(null);
                    if (onPinThread) onPinThread(thread.id);
                  }}
                  aria-label={thread.isPinned ? "Lepaskan sematan percakapan" : "Sematkan percakapan"}
                  className="w-full px-3.5 py-2.5 text-left hover:bg-[#252831] flex items-center gap-2.5 transition-colors cursor-pointer text-slate-300 hover:text-white"
                >
                  <Pin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{thread.isPinned ? "Lepaskan sematan" : "Sematkan"}</span>
                </button>

                {/* Option: Rename */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenuId(null);
                    setEditingId(thread.id);
                    setEditTitle(thread.title);
                  }}
                  aria-label="Ganti nama percakapan"
                  className="w-full px-3.5 py-2.5 text-left hover:bg-[#252831] flex items-center gap-2.5 transition-colors cursor-pointer text-slate-300 hover:text-white"
                >
                  <Pencil className="w-3.5 h-3.5 text-slate-400" />
                  <span>Ganti nama</span>
                </button>

                {/* Separator */}
                <div className="h-[1px] bg-[#2c2f37] my-1" />

                {/* Option: Delete */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenuId(null);
                    if (onDeleteThread) onDeleteThread(thread.id);
                  }}
                  aria-label="Hapus percakapan"
                  className="w-full px-3.5 py-2.5 text-left hover:bg-rose-500/10 text-rose-400 hover:text-rose-300 flex items-center gap-2.5 transition-colors cursor-pointer font-medium"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus</span>
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
});

export default function Sidebar({
  settings,
  messages,
  onLoadChatHistory,
  onNewChat,
  onToggleSettings,
  onOpenProfile,
  isCollapsed,
  onToggleCollapse,
  threads = [],
  activeThreadId,
  onSelectThread,
  onPinThread,
  onRenameThread,
  onDeleteThread,
  onShareThread,
  onArchiveThread,
  activeView = "chat",
  onViewChange,
  profileAvatarProp,
  useInitialsAvatarProp,
  profileAvatarBgProp,
  profileUsernameHandleProp,
  profileDisplayNameProp,
  isLoggedIn = false,
  isPlus = false,
  onUpgradeSuccess,
  onGoogleSignIn,
  authProp
}: SidebarProps) {
  const THEME_OPTIONS_LOCAL = [
    { value: "classic-blue", label: "Classic Blue", bgGradient: "from-blue-600 to-indigo-700" },
    { value: "emerald-green", label: "Emerald Green", bgGradient: "from-emerald-600 to-teal-700" },
    { value: "cosmic-purple", label: "Cosmic Purple", bgGradient: "from-purple-600 to-pink-700" },
    { value: "minimal-dark", label: "Minimal Dark", bgGradient: "from-zinc-800 to-zinc-900" }
  ];
  const currentTheme = THEME_OPTIONS_LOCAL.find(t => t.value === settings.theme) || THEME_OPTIONS_LOCAL[0];

  const getAccentTextClass = () => {
    if (currentTheme.value === "emerald-green") return "text-emerald-400";
    if (currentTheme.value === "cosmic-purple") return "text-purple-400";
    if (currentTheme.value === "minimal-dark") return "text-zinc-200";
    return "text-blue-400"; // classic-blue
  };

  const getAccentBorderClass = () => {
    if (currentTheme.value === "emerald-green") return "border-emerald-500/30";
    if (currentTheme.value === "cosmic-purple") return "border-purple-500/30";
    if (currentTheme.value === "minimal-dark") return "border-zinc-750";
    return "border-blue-500/30"; // classic-blue
  };

  const getAccentBgClass = (isHover: boolean = false) => {
    if (currentTheme.value === "emerald-green") return isHover ? "bg-emerald-600/10 hover:bg-emerald-600/20" : "bg-emerald-600";
    if (currentTheme.value === "cosmic-purple") return isHover ? "bg-purple-600/10 hover:bg-purple-600/20" : "bg-purple-600";
    if (currentTheme.value === "minimal-dark") return isHover ? "bg-zinc-800 hover:bg-zinc-750" : "bg-zinc-200 text-black";
    return isHover ? "bg-blue-600/10 hover:bg-blue-600/20" : "bg-blue-600"; // classic-blue
  };

  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState<string>("");

  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradePlan, setUpgradePlan] = useState<"monthly" | "yearly">("yearly");
  const [upgradeSuccess, setUpgradeSuccess] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"gpay" | "qris" | "bank">("qris");

  // Load avatar and user properties precisely matching Settings / Props / Firebase
  const userAvatar = profileAvatarProp !== undefined ? profileAvatarProp : (authProp?.currentUser?.photoURL || "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=360&h=360&fit=crop&q=60");
  const userDisplayName = isLoggedIn ? (profileDisplayNameProp || settings.username || authProp?.currentUser?.displayName || "User") : "User";
  const userEmail = isLoggedIn ? (authProp?.currentUser?.email || "user@example.com") : "user@example.com";

  const shouldShowInitialsAvatar = isLoggedIn 
    ? (useInitialsAvatarProp !== undefined ? useInitialsAvatarProp : !authProp?.currentUser?.photoURL)
    : true;
  const avatarBgColor = isLoggedIn 
    ? (profileAvatarBgProp !== undefined ? profileAvatarBgProp : "bg-[#064e3b]")
    : "bg-slate-600";
  const userHandle = isLoggedIn 
    ? (profileUsernameHandleProp !== undefined ? profileUsernameHandleProp : ("@" + (authProp?.currentUser?.email ? authProp.currentUser.email.split("@")[0] : "user")))
    : "@user";

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0 || !parts[0]) return "P";
    if (parts.length === 1) return parts[0].substring(0, Math.min(2, parts[0].length)).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  // Sort threads so that Pinned items stay at the top elegantly
  const sortedThreads = [...threads].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return 0; // maintain default date order
  });

  const handleUpgradeCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    setUpgradeSuccess(true);
    setTimeout(() => {
      setUpgradeSuccess(false);
      setShowUpgradeModal(false);
      if (onUpgradeSuccess) {
        onUpgradeSuccess(upgradePlan);
      }
      alert("Selamat! Anda kini telah resmi terdaftar sebagai Anggota MARIA Plus ✨ Nikmati prioritas respon cerdas tak terbatas.");
    }, 1500);
  };

  return (
    <>
      {/* 1. Backdrop overlay backdrop on mobile when sidebar drawer is active */}
      {!isCollapsed && (
        <div 
          onClick={onToggleCollapse}
          className="fixed inset-0 z-40 bg-slate-950/80 transition-all duration-1000 lg:hidden cursor-pointer"
        />
      )}

      {/* 2. Sidebar box element */}
      <div 
        className={`fixed inset-y-0 left-0 z-50 select-none font-sans flex flex-col justify-between bg-[#0e0f12] text-slate-300 border-r border-[#1e2025] transition-all duration-1000 
          lg:static lg:z-0 lg:h-full lg:translate-x-0
          ${isCollapsed 
            ? "-translate-x-full lg:translate-x-0 lg:w-0 lg:overflow-hidden lg:border-none" 
            : "translate-x-0 w-[280px] lg:w-[280px]"
          }
        `}
        id="maria-ai-sidebar"
      >
        {/* TOP: Header (Logo + Brand + Collapse button) */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-2.5">
            {/* Maria AI Geometric Logo */}
            <div className={`w-8 h-8 rounded-xl bg-[#171F36] flex items-center justify-center overflow-hidden shadow-sm border border-[#bcc6d4]/20`}>
              <svg className="w-full h-full" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="512" height="512" fill="#171f36"/>
                <circle cx="256" cy="256" r="160" stroke="#bcc6d4" strokeWidth="12"/>
                <g stroke="#f6acad" strokeWidth="14" strokeLinecap="round">
                  <line x1="160" y1="390" x2="240" y2="278"/>
                  <line x1="286" y1="214" x2="352" y2="122"/>
                </g>
                <text x="256" y="325" fontFamily="'Inter', sans-serif" fontWeight="900" fontSize="220" fill="white" textAnchor="middle">M</text>
                <path d="M400 120 C 400 132, 408 140, 420 140 C 408 140, 400 148, 400 160 C 400 148, 392 140, 380 140 C 392 140, 400 132, 400 120 Z" fill="#f6acad"/>
              </svg>
            </div>
            <span className="font-display font-medium text-[17px] tracking-tight text-white flex items-center">
              Maria AI
            </span>
          </div>

          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label="Sembunyikan Sidebar"
            className="p-2.5 sm:p-1.5 rounded-lg bg-transparent hover:bg-slate-800/60 text-slate-400 hover:text-white transition-all cursor-pointer flex items-center justify-center min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0"
            title="Sembunyikan Sidebar"
          >
            <ArrowLeft className="w-5 h-5 sm:w-4 sm:h-4" />
          </button>
        </div>

        {/* Separator thin line */}
        <div className="px-4">
          <div className="h-[1px] bg-slate-800/40 w-full" />
        </div>

        {/* SIDEBAR BODY - Scrollable entries */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 no-scrollbar">
          
          {/* New Chat Button exactly like Screenshot 1 */}
          <button
            type="button"
            onClick={() => {
              onNewChat();
              if (onViewChange) onViewChange("chat");
              if (window.innerWidth < 1024) {
                onToggleCollapse(); // Auto-close sidebar drawer on mobile for seamless navigation
              }
            }}
            aria-label="New Chat Baru"
            className={`w-full py-3 px-4 rounded-xl text-left text-xs text-white font-medium bg-gradient-to-r ${currentTheme.bgGradient} hover:opacity-95 transition-all shadow-md active:scale-[0.985] flex items-center gap-3 cursor-pointer`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>New Chat</span>
          </button>

          {/* Navigation links list */}
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => {
                if (onViewChange) onViewChange("library");
                if (window.innerWidth < 1024) {
                  onToggleCollapse();
                }
              }}
              aria-label="Buka Library"
              className={`w-full py-2.5 px-3 rounded-lg transition-all text-xs font-semibold flex items-center gap-3 text-left cursor-pointer ${
                activeView === "library"
                  ? "text-white bg-[#1c1e24] font-semibold"
                  : "text-slate-300 hover:text-white hover:bg-[#1a1c23]/60"
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Library</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (onViewChange) onViewChange("discover");
                if (window.innerWidth < 1024) {
                  onToggleCollapse();
                }
              }}
              aria-label="Buka Discover"
              className={`w-full py-2.5 px-3 rounded-lg transition-all text-xs font-semibold flex items-center gap-3 text-left cursor-pointer ${
                activeView === "discover"
                  ? "text-white bg-[#1c1e24] font-semibold"
                  : "text-slate-300 hover:text-white hover:bg-[#1a1c23]/60"
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>Discover</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onToggleSettings();
                if (window.innerWidth < 1024) {
                  onToggleCollapse(); // Auto-close sidebar drawer on mobile for seamless navigation
                }
              }}
              aria-label="Buka Pengaturan Akun"
              className="w-full py-2.5 px-3 rounded-lg text-slate-300 hover:text-white hover:bg-[#1a1c23]/60 transition-all text-xs font-semibold flex items-center gap-3 text-left cursor-pointer"
            >
              <Settings className="w-4 h-4" />
              <span>Pengaturan</span>
            </button>

            <a
              href="/pusat-bantuan.html"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                if (window.innerWidth < 1024) {
                  onToggleCollapse();
                }
              }}
              aria-label="Buka Pusat Bantuan"
              className={`w-full py-2.5 px-3 rounded-lg transition-all text-xs font-semibold flex items-center gap-3 text-left cursor-pointer text-slate-300 hover:text-white hover:bg-[#1a1c23]/60`}
            >
              <HelpCircle className="w-4 h-4" />
              <span>Pusat Bantuan</span>
            </a>
          </div>

          {/* CHATS Section Header */}
          {sortedThreads.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest pl-3 select-none">
                CHATS
              </span>

              {/* Presets/Dynamic chat list items */}
              <div className="space-y-1">
                {sortedThreads.map((thread) => (
                  <ThreadItem
                    key={thread.id}
                    thread={thread}
                    isActive={activeThreadId === thread.id}
                    isEditing={editingId === thread.id}
                    editTitle={editTitle}
                    setEditTitle={setEditTitle}
                    setEditingId={setEditingId}
                    activeMenuId={activeMenuId}
                    setActiveMenuId={setActiveMenuId}
                    onSelectThread={onSelectThread}
                    onViewChange={onViewChange}
                    onToggleCollapse={onToggleCollapse}
                    onShareThread={onShareThread}
                    onArchiveThread={onArchiveThread}
                    onPinThread={onPinThread}
                    onRenameThread={onRenameThread}
                    onDeleteThread={onDeleteThread}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* BOTTOM STICKY: Upgrade panel & user info cell */}
        <div className="p-4 space-y-4 bg-transparent border-t border-[#1a1c21]">
          
          {isLoggedIn ? (
            isPlus ? (
              <div className="p-4 rounded-xl bg-gradient-to-tr from-[#1E1B4B]/80 to-[#311042]/80 border border-indigo-500/30 shadow-lg flex flex-col gap-2">
                <div className="flex items-start gap-2.5">
                  <div className="p-1 rounded-md bg-indigo-500/20 mt-0.5 shrink-0">
                    <Sparkles className="w-4 h-4 text-indigo-300 font-bold" />
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-white tracking-tight leading-none mb-1">
                      MARIA Plus Aktif ✨
                    </span>
                    <span className="block text-[10px] text-indigo-200 font-medium leading-snug">
                      Anda menikmati akses prioritas tinggi tanpa batas.
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              /* Promo Plus Card exactly like Screenshot 1 */
              <div className="p-4 rounded-xl bg-[#15171d] border border-slate-800/80 hover:border-slate-800 transition-colors shadow-inner flex flex-col gap-2.5">
                <div className="flex items-start gap-2.5">
                  <div className="p-1 rounded-md bg-blue-500/10 mt-0.5 shrink-0">
                    <Sparkles className="w-4 h-4 text-blue-400 font-bold" />
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-white tracking-tight leading-none mb-1">
                      Upgrade to Maria Plus!
                    </span>
                    <span className="block text-[10px] text-slate-300 font-medium leading-snug">
                      Unlock faster responses & unlimited chats with Maria Plus.
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowUpgradeModal(true)}
                  aria-label="Upgrade ke Maria Plus"
                  className="w-full py-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white text-[11px] font-bold shadow-md transition-all active:scale-[0.975] cursor-pointer"
                >
                  Upgrade
                </button>
              </div>
            )
          ) : (
            /* ChatGPT style guest prompt panel exactly like Screenshot 6 */
            <div className="p-4 rounded-xl bg-[#15171d] border border-slate-800/80 hover:border-slate-800 transition-all duration-200 text-left space-y-3 shadow-inner">
              <div>
                <span className="block text-xs font-bold text-white tracking-tight leading-snug mb-1">
                  Dapatkan respons yang disesuaikan
                </span>
                <span className="block text-[10px] text-slate-400 font-medium leading-relaxed pl-0.5">
                  Masuk untuk mendapatkan jawaban didasarkan pada obrolan yang disimpan, serta membuat gambar dan mengunggah file.
                </span>
              </div>
              <button
                type="button"
                onClick={onGoogleSignIn || onOpenProfile}
                className="w-full h-11 flex items-center justify-center gap-3 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 text-[13px] font-sans font-medium border border-slate-300 hover:border-slate-400 rounded-lg transition-all shadow-sm active:scale-[0.975] cursor-pointer"
              >
                <div className="w-[18px] h-[18px] select-none shrink-0 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-[18px] h-[18px]">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.08H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.92l3.66-2.82z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.08l3.66 2.82c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                  </svg>
                </div>
                <span>Sign in with Google</span>
              </button>
            </div>
          )}

          {/* User profile info bar cell (only visible when logged in) */}
          {isLoggedIn && (
            <button 
              type="button"
              onClick={onOpenProfile || onToggleSettings}
              aria-label="Profil dan Pengaturan Akun"
              className="w-full p-2 sm:p-2.5 rounded-xl bg-[#111317] hover:bg-[#1a1d23] border border-slate-850 cursor-pointer transition-all hover:scale-[1.01] active:opacity-90 flex items-center justify-between gap-2 md:gap-3 text-left"
              title="Klik untuk membuka Pengaturan Profil"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {shouldShowInitialsAvatar ? (
                  <div className={`w-8 h-8 rounded-full ${avatarBgColor} flex items-center justify-center border border-slate-705 shadow-sm shrink-0 text-white font-bold text-[11px] select-none`}>
                    {getInitials(userDisplayName)}
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-700 shadow-sm shrink-0">
                    <img 
                      src={userAvatar} 
                      alt="User Avatar Cell" 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                )}
                <div className="min-w-0 flex-1 leading-normal select-none">
                  <span className="block text-xs font-bold text-white truncate">
                    {userDisplayName}
                  </span>
                  <span className="block text-[9px] text-slate-400 truncate">
                    {userEmail}
                  </span>
                </div>
              </div>

              <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </button>
          )}
        </div>
      </div>

      {/* RENDER PREMIUM ANMATED MODAL: PROMOTIONAL PRICING SUITE */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setShowUpgradeModal(false)}
            className="absolute inset-0 bg-slate-950/90 animate-fade-in"
          />

          <div
            className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl relative z-10 overflow-hidden select-none font-sans text-slate-300 animate-fade-in"
          >
              {/* Absolut Star spark backgrounds decoration */}
              <div className="absolute top-[-30px] right-[-35px] w-32 h-32 bg-blue-500/10 rounded-full blur-2xl" />
              <div className="absolute bottom-[-10px] left-[-20px] w-24 h-24 bg-purple-500/10 rounded-full blur-xl" />

              {/* Close Button top right */}
              <button
                type="button"
                onClick={() => setShowUpgradeModal(false)}
                aria-label="Tutup modal upgrade"
                className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Modal Body */}
              <div className="space-y-5">
                <div className="text-center space-y-1">
                  <div className={`inline-flex p-2.5 ${getAccentBgClass(true)} rounded-xl mb-1 ${getAccentTextClass()}`}>
                    <Sparkles className="w-6 h-6 animate-pulse-slow" />
                  </div>
                  <h3 className="font-display font-bold text-white text-lg sm:text-xl tracking-tight">
                    Upgrade ke MARIA Plus!
                  </h3>
                  <p className="text-xs text-slate-300 max-w-sm mx-auto leading-normal">
                    Rasakan kekuatan asisten super instan tanpa batasan harian, dan fitur kustomisasi terlengkap.
                  </p>
                </div>

                {/* Switcher Toggle: Monthly vs Yearly (60% discount) */}
                <div className="space-y-2">
                  <div className="flex justify-center">
                    <div className="p-1 rounded-xl bg-slate-850/80 border border-slate-800 flex gap-1 select-none">
                      <button
                        type="button"
                        onClick={() => setUpgradePlan("monthly")}
                        aria-label="Pilih Paket Bulanan"
                        className={`py-1.5 px-4 text-[10px] font-bold rounded-lg transition-all ${
                          upgradePlan === "monthly" ? `${getAccentBgClass()} text-white shadow-md` : "text-slate-300 hover:text-white"
                        }`}
                      >
                        Bulanan
                      </button>
                      <button
                        type="button"
                        onClick={() => setUpgradePlan("yearly")}
                        aria-label="Pilih Paket Tahunan"
                        className={`relative py-1.5 px-4 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1 ${
                          upgradePlan === "yearly" ? `${getAccentBgClass()} text-white shadow-md` : "text-slate-300 hover:text-white"
                        }`}
                      >
                        Tahunan
                        <span className="text-[8px] px-1 bg-emerald-500 text-slate-900 rounded-md font-bold uppercase shrink-0">
                          Hemat 60%
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Comparative Yearly Savings Calculation */}
                  <div className="text-center text-[10.5px]">
                    {upgradePlan === "yearly" ? (
                      <span className="text-emerald-400 font-medium">
                        ✓ Menghemat <strong className="font-bold">Rp 960.000 / tahun</strong> (Hanya setara Rp 49.000 / bln!)
                      </span>
                    ) : (
                      <span className="text-slate-300">
                        Hemat Rp 960.000 jika Anda beralih ke <strong className="text-emerald-400 cursor-pointer hover:underline" onClick={() => setUpgradePlan("yearly")}>Paket Tahunan</strong>
                      </span>
                    )}
                  </div>
                </div>

                {/* Selected Price card */}
                <div className="p-4 bg-slate-850/50 border border-slate-800/80 rounded-xl text-center space-y-1">
                  <span className="block text-[10px] uppercase font-bold tracking-widest text-[#94a3b8]">Maria Pro Plan</span>
                  <div className="flex items-center justify-center gap-2 pt-1">
                    <span className="text-3xl font-display font-black text-white">
                      {upgradePlan === "yearly" ? "Rp 49.000" : "Rp 129.000"}
                    </span>
                    <div className="text-left font-sans text-xs">
                      <div className="text-slate-300 font-medium leading-none">/ bulan</div>
                      <div className="text-[9px] text-[#22c55e] font-bold mt-0.5 px-1 py-[1px] rounded bg-emerald-500/10 inline-block border border-emerald-500/10">
                        Termasuk PPN 11%
                      </div>
                    </div>
                  </div>
                  {upgradePlan === "yearly" ? (
                    <span className={`block text-[9px] ${getAccentTextClass()} font-bold pt-1 animate-pulse`}>
                      Ditagih sebesar Rp 588.000 / tahun setelah dipotong diskon 60%
                    </span>
                  ) : (
                    <span className="block text-[9px] text-slate-300 pt-1">
                      Ditagih per bulan secara fleksibel dan bebas dibatalkan sewaktu-waktu.
                    </span>
                  )}
                </div>

                {/* Payment Methods Selector inside Modal */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
                    <span>Metode Pembayaran</span>
                    <span className="text-[9px] text-emerald-400 font-medium bg-emerald-500/5 px-1.5 py-0.5 rounded border border-emerald-500/10">Instan & Terverifikasi</span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2">
                    {/* QRIS & E-Wallet selector button */}
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("qris")}
                      aria-label="Pilih Metode QRIS"
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                        paymentMethod === "qris"
                          ? "bg-emerald-500/10 border-emerald-500/80 text-white"
                          : "bg-slate-850/40 border-slate-800 hover:border-slate-700 text-slate-300"
                      }`}
                    >
                      <span className="text-[10px] font-bold">QRIS / E-Money</span>
                      <span className="text-[8px] opacity-75">GoPay, OVO, DANA</span>
                    </button>

                    {/* Virtual Account selector button */}
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("bank")}
                      aria-label="Pilih Metode Virtual Account Bank"
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                        paymentMethod === "bank"
                          ? "bg-blue-500/10 border-blue-500/80 text-white"
                          : "bg-slate-850/40 border-slate-800 hover:border-slate-700 text-slate-300"
                      }`}
                    >
                      <span className="text-[10px] font-bold">Virtual Account</span>
                      <span className="text-[8px] opacity-75">BCA, Mandiri, BRI</span>
                    </button>

                    {/* Google Pay / Credit Card option */}
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("gpay")}
                      aria-label="Pilih Metode Google Pay"
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                        paymentMethod === "gpay"
                          ? "bg-slate-100 text-slate-900 border-white font-semibold"
                          : "bg-slate-850/40 border-slate-800 hover:border-slate-700 text-slate-300"
                      }`}
                    >
                      <span className="text-[10px] font-bold">Google Pay</span>
                      <span className="text-[8px] opacity-75">Kartu Kredit</span>
                    </button>
                  </div>

                  {/* Channel Logos decoration feedback */}
                  {paymentMethod === "qris" && (
                    <div className="flex items-center justify-center gap-3 py-1.5 text-[9px] text-zinc-400 bg-slate-850/35 rounded-lg border border-slate-800/60 px-3 animate-fade-in">
                      <span className="font-bold text-red-500">QRIS</span>
                      <span className="text-slate-500">|</span>
                      <span className="font-bold text-[#00aed6]">GoPay</span>
                      <span className="font-bold text-[#4c2a86]">OVO</span>
                      <span className="font-bold text-[#118eea]">DANA</span>
                      <span className="font-bold text-[#ee4d2d]">ShopeePay</span>
                    </div>
                  )}

                  {paymentMethod === "bank" && (
                    <div className="flex items-center justify-center gap-3.5 py-1.5 text-[9px] text-zinc-400 bg-slate-850/35 rounded-lg border border-slate-800/60 px-3 font-mono font-bold animate-fade-in">
                      <span className="text-[#0066ae]">BCA</span>
                      <span className="text-slate-500">|</span>
                      <span className="text-[#ec8c24]">MANDIRI</span>
                      <span className="text-[#00529c]">BRI</span>
                      <span className="text-[#007cc3]">BNI</span>
                    </div>
                  )}

                  {paymentMethod === "gpay" && (
                    <div className="flex items-center justify-center gap-3 py-1.5 text-[9px] text-zinc-400 bg-slate-850/35 rounded-lg border border-slate-800/60 px-3 font-semibold animate-fade-in">
                      <span>Google Pay</span>
                      <span className="text-slate-500">|</span>
                      <span>Visa</span>
                      <span>Mastercard</span>
                    </div>
                  )}
                </div>

                {/* Highlights features bullet lists */}
                <div className="p-3 bg-slate-850/30 border border-slate-800/40 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center gap-2.5">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 stroke-[3]" />
                    <span>Prioritas Koneksi Server Cerdas Maksimum</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 stroke-[3]" />
                    <span>Bypass otomatis jika beban model overload (503 / 429)</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 stroke-[3]" />
                    <span>Akses eksklusif template asisten premium tak terbatas</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 stroke-[3]" />
                    <span>Dukungan penuh kustomisasi Karakter Maria secara berkala</span>
                  </div>
                </div>

                {/* Fake checkout payment trigger */}
                <form onSubmit={handleUpgradeCheckout} className="pt-1">
                  <button
                    type="submit"
                    disabled={upgradeSuccess}
                    className={`w-full py-3 px-4 bg-gradient-to-r ${currentTheme.bgGradient} hover:opacity-95 text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer`}
                  >
                    {upgradeSuccess ? (
                      "Sedang Memproses secara Aman..."
                    ) : paymentMethod === "qris" ? (
                      "Bayar Sekarang via QRIS (GoPay/OVO/DANA)"
                    ) : paymentMethod === "bank" ? (
                      "Dapatkan Nomor Virtual Account"
                    ) : (
                      "Bayar Sekarang dengan Google Pay"
                    )}
                  </button>
                </form>

                <div className="text-center">
                  <span className="text-[9px] text-slate-400 leading-normal block font-sans">
                    Metode pembayaran terenkripsi 250+ bit SSL aman. Batalkan langganan kapan saja dengan mudah.
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
    </>
  );
}
