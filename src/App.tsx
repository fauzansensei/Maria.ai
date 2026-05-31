import React, { useState, useEffect } from "react";
import { Message, UserSettings, AppNotification, ChatThread } from "./types";
import { DEFAULT_SETTINGS, THEME_OPTIONS } from "./constants";
import type { DiscoveryAgent } from "./components/DiscoverArea";

// Static imports for primary main-screen components to avoid lazy-loading network handshakes and CLS
import Sidebar from "./components/Sidebar";
import ChatArea from "./components/ChatArea";
const SettingsDashboard = React.lazy(() => import("./components/SettingsDashboard"));
const DiscoverArea = React.lazy(() => import("./components/DiscoverArea"));
const LibraryArea = React.lazy(() => import("./components/LibraryArea"));
import { 
  Bot, 
  Settings, 
  X, 
  Menu, 
  Sparkles, 
  MessageSquare, 
  AlertCircle,
  Mail,
  Bell,
  Inbox,
  ChevronRight
} from "lucide-react";

const safeParseResponse = async (response: Response) => {
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return await response.json();
  } else {
    const text = await response.text();
    try {
      const parsed = JSON.parse(text);
      if (parsed && (parsed.error || parsed.message)) {
        return parsed;
      }
    } catch {
      // Not JSON
    }
    return { error: text || `HTTP error! status: ${response.status}` };
  }
};

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem("maria_is_logged_in") === "true";
  });

  // Load settings from localStorage or defaults
  const [settings, setSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem("maria_settings2");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Fallback for settings properties if they don't exist yet
        return {
          ...DEFAULT_SETTINGS,
          ...parsed,
        };
      } catch (e) {
        console.error("Failed to parse settings", e);
      }
    }
    return DEFAULT_SETTINGS;
  });

  // Load chat messages from localStorage
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem("maria_messages");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse messages", e);
      }
    }
    return [];
  });

  // Load chat threads from localStorage or populate with default mocks
  const [threads, setThreads] = useState<ChatThread[]>(() => {
    const saved = localStorage.getItem("maria_threads");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse threads", e);
      }
    }
    return [
      {
        id: "horror-script",
        title: "A Short script for a horror...",
        isPinned: false,
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
      {
        id: "clean-nav",
        title: "Can you help me in making...",
        isPinned: false,
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
      {
        id: "car-diagnosis",
        title: "My car is not working...",
        isPinned: false,
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
            content: "Berdasarkan rujukan tanda mekanis, bunyi **tek-tek-tek cepat** saat Anda mencoba memosisikan kontak ke starter adalah gejala mutlak dari **Aki Tekor / Lemah (Battery low voltage / discharged)**.\n\nBerikut tata cara melalukan analisis mandiri:\n\n1. **Periksa Terminal Aki**: Pastikan katup kepala aki bersih bebas daki korosi putih kehijauan, dan terpasang sangat kencang.\n2. **Uji Penerangan Utama**: Nyalakan saklar lampu sorot jauh mobil Anda. Jika lampu meredup parah saat starter diputar, voltase aki sisa sedikit.\n3. **Masalah Dinamo Starter**: Jika aki dipastikan sepenuhnya prima namun suara masih timbul, komutator atau arang brush dinamo as starter Anda mungkin aus.\n\n**Saran Tindakan Cepat:** Anda bisa meminta bantuan kawan dekat untuk melakukan jumper listrik aki, atau mengontak teknisi jasa panggilan aki untuk penukaran yang bergaransi resmi.",
            timestamp: new Date(Date.now() - 17900000).toISOString(),
          }
        ]
      },
      {
        id: "parenting",
        title: "Respected Parenting Advice...",
        isPinned: false,
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
    ];
  });

  const [activeThreadId, setActiveThreadId] = useState<string>(() => {
    return localStorage.getItem("maria_active_thread_id") || "";
  });

  // Real-time Notification Logs State
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    const saved = localStorage.getItem("maria_notifications");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse notifications", e);
      }
    }
    return [
      {
        id: "not-init",
        title: "Sistem Aktif",
        body: "Asisten pintar Maria Anda diaktifkan dan terhubung.",
        type: "success",
        timestamp: new Date().toISOString(),
        read: false,
      }
    ];
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false); // Controls responsive drawer tracker
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileDisplayName, setProfileDisplayName] = useState(() => settings.username || "basit fauzan");
  const [profileUsername, setProfileUsername] = useState(() => localStorage.getItem("maria_username_handle") || "@basitfauzan42");
  const [profileAvatarBg, setProfileAvatarBg] = useState(() => localStorage.getItem("maria_avatar_bg_color") || "bg-[#064e3b]"); // premium deep green bg
  const [showColorSelector, setShowColorSelector] = useState(false);
  const [profileUseInitials, setProfileUseInitials] = useState(() => localStorage.getItem("maria_use_initials_avatar") !== "false");
  const [profileAvatarUrl, setProfileAvatarUrl] = useState(() => localStorage.getItem("maria_user_avatar") || "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=150&h=150&fit=crop&q=80");

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleProfileImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        if (loadEvent.target?.result) {
          setProfileAvatarUrl(loadEvent.target.result as string);
          setProfileUseInitials(false);
          setShowColorSelector(false); // Close selector dropdown
        }
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    setProfileDisplayName(settings.username || "basit fauzan");
  }, [settings.username]);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth < 1024;
    }
    return false;
  });

  // Simulation states for email & web push alerts
  const [simulatedEmail, setSimulatedEmail] = useState<{ subject: string; body: string; category: string; shown: boolean } | null>(null);
  const [simulatedPush, setSimulatedPush] = useState<{ title: string; body: string; shown: boolean } | null>(null);

  // States for custom modals instead of window.confirm
  const [threadToDeleteId, setThreadToDeleteId] = useState<string | null>(null);
  const [isClearingAllHistory, setIsClearingAllHistory] = useState<boolean>(false);

  // Library and Discover states matching Maria AI suggestions
  const [activeView, setActiveView] = useState<"chat" | "library" | "discover">("chat");
  const [bookmarkedMessages, setBookmarkedMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem("maria_bookmarks");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const handleToggleBookmark = (msg: Message) => {
    setBookmarkedMessages(prev => {
      const exists = prev.some(b => b.id === msg.id);
      let updated;
      if (exists) {
        updated = prev.filter(b => b.id !== msg.id);
        handleAddSystemNotification(
          "Penanda Dihapus",
          "Pesan telah dihapus dari pustaka Library Anda.",
          "info"
        );
      } else {
        updated = [...prev, msg];
        handleAddSystemNotification(
          "Pesan Ditambahkan",
          "Pesan berhasil ditandai dan disimpan di dalam Library.",
          "success"
        );
      }
      localStorage.setItem("maria_bookmarks", JSON.stringify(updated));
      return updated;
    });
  };

  const handleSelectAgent = (agent: DiscoveryAgent) => {
    const newThreadId = "thread-" + Date.now();
    const welcomeMsg: Message = {
      id: "welcome-agent-" + Date.now(),
      role: "assistant",
      content: agent.startingMessage,
      timestamp: new Date().toISOString()
    };
    
    // Set custom settings based on agent selection
    const updatedSettings: UserSettings = {
      ...settings,
      theme: agent.theme,
      customPrompt: agent.systemPrompt,
      tone: agent.id === "aiko-chat" ? "Warm" : agent.id === "sora-coder" ? "Technical" : agent.id === "rendra-copy" ? "Creative" : "Professional"
    };
    
    // Update settings in memory and LocalStorage
    setSettings(updatedSettings);
    localStorage.setItem("maria_settings2", JSON.stringify(updatedSettings));

    // Force messages list
    setMessages([welcomeMsg]);
    
    // Set new active thread
    const newThread: ChatThread = {
      id: newThreadId,
      title: agent.name,
      messages: [welcomeMsg]
    };
    
    setThreads(prev => [newThread, ...prev]);
    setActiveThreadId(newThreadId);
    
    // Smoothly route to main chat room
    setActiveView("chat");
    
    handleAddSystemNotification(
      "Agen Diaktifkan",
      `${agent.name} kini siap membimbing Anda dengan instruksi khusus.`,
      "success"
    );
  };

  const handleUsePromptFormula = (formulaText: string) => {
    localStorage.setItem("maria_pending_prompt", formulaText);
    setActiveView("chat");
    handleAddSystemNotification(
      "Prompt Dipakai",
      "Formula perintah dimasukkan ke dalam bilah teks obrolan.",
      "success"
    );
  };

  // Handle auto collapsing of sidebar when resizing below desktop viewport width
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsSidebarCollapsed(true);
      } else {
        setIsSidebarCollapsed(false);
      }
    };
    
    // Add event listener
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Save settings when modified
  const handleSaveSettings = (newSettings: UserSettings) => {
    setSettings(newSettings);
    localStorage.setItem("maria_settings2", JSON.stringify(newSettings));
    
    // Determine active theme name
    const themeName = THEME_OPTIONS.find(t => t.value === newSettings.theme)?.name || "Kustom";

    // Play chime & alert system notification
    handleAddSystemNotification(
      "Pengaturan Tersimpan", 
      `Preferensi Maria berhasil diperbarui. Tema warna: ${themeName}.`, 
      "success"
    );
  };

  // Save threads when modified
  useEffect(() => {
    localStorage.setItem("maria_threads", JSON.stringify(threads));
  }, [threads]);

  // Synchronize active thread with messages and active ID
  useEffect(() => {
    if (activeThreadId) {
      setThreads(prev => prev.map(t => 
        t.id === activeThreadId ? { ...t, messages } : t
      ));
    }
    localStorage.setItem("maria_messages", JSON.stringify(messages));
    localStorage.setItem("maria_active_thread_id", activeThreadId);
  }, [messages, activeThreadId]);

  // Save notifications when modified
  useEffect(() => {
    localStorage.setItem("maria_notifications", JSON.stringify(notifications));
  }, [notifications]);

  // Play polite system chime when actions succeed
  const playNotificationChime = () => {
    if (!settings.notifications?.soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = "sine";
      // Play a lovely double chime note (D5 followed by G5)
      oscillator.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      oscillator.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.12); // G5

      gainNode.gain.setValueAtTime(0.04, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.35);
    } catch (e) {
      console.warn("Web Audio API not allowed or initialization failed:", e);
    }
  };

  // Trigger system notification
  const handleAddSystemNotification = (
    title: string, 
    body: string, 
    type: "info" | "success" | "reminder" | "message"
  ) => {
    const newNotification: AppNotification = {
      id: "not-" + Date.now() + "-" + Math.random().toString(36).substr(2, 4),
      title,
      body,
      type,
      timestamp: new Date().toISOString(),
      read: false,
    };
    setNotifications(prev => [newNotification, ...prev].slice(0, 25)); // keep log ceiling to 25 items
    playNotificationChime();
  };

  const handleSimulateEmail = (subject: string, body: string, category: string) => {
    setSimulatedEmail({
      subject,
      body,
      category,
      shown: true
    });
  };

  const handleSimulatePush = (title: string, body: string) => {
    setSimulatedPush({
      title,
      body,
      shown: true
    });
    playNotificationChime();

    // Native browser push integration if supported and allowed
    if ("Notification" in window) {
      if (Notification.permission === "granted") {
        try {
          new Notification(title, { body, icon: "/favicon.ico" });
        } catch (e) {
          console.warn("Could not play native notification", e);
        }
      } else if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
  };

  const handleMarkNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const handleClearNotifications = () => {
    setNotifications([]);
  };

  // Handles sending messages to the Express backend proxy endpoint
  const handleSendMessage = async (text: string, image?: string, audio?: string) => {
    if (isLoading) return;

    let currentThreadId = activeThreadId;
    if (!currentThreadId) {
      currentThreadId = "thread-" + Date.now();
      const firstMessageText = text.trim();
      const title = firstMessageText.length > 25 
        ? firstMessageText.substring(0, 25) + "..." 
        : firstMessageText;
      
      const newThread: ChatThread = {
        id: currentThreadId,
        title,
        isPinned: false,
        messages: []
      };
      setThreads(prev => [newThread, ...prev]);
      setActiveThreadId(currentThreadId);
    }

    const userMsg: Message = {
      id: "msg-" + Date.now() + "-user",
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
      ...(image ? { image } : {}),
      ...(audio ? { audio } : {}),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: updatedMessages,
          settings,
        }),
      });

      const data = await safeParseResponse(response);

      if (response.ok) {
        const assistantMsg: Message = {
          id: "msg-" + Date.now() + "-maria",
          role: "assistant",
          content: data.content,
          timestamp: data.timestamp || new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
        
        // Notify user about incoming answer
        handleAddSystemNotification(
          "Respons Baru dari Maria", 
          "Maria telah selesai menyusun tanggapan terstruktur Anda.", 
          "message"
        );
      } else {
        // Handle specific server-side errors, like missing API key demo mode
        const errorMsg: Message = {
          id: "msg-" + Date.now() + "-error",
          role: "assistant",
          content: data.error || "Terjadi kesalahan sambungan",
          timestamp: new Date().toISOString(),
          isError: true,
        };
        setMessages((prev) => [...prev, errorMsg]);
        
        handleAddSystemNotification(
          "Peringatan Sambungan", 
          "Silakan pasang kunci API Anda agar Maria dapat terhubung.", 
          "info"
        );
      }
    } catch (networkError: any) {
      console.error("Network Error:", networkError);
      const errorMsg: Message = {
        id: "msg-" + Date.now() + "-error",
        role: "assistant",
        content: "Kesalahan Jaringan (Kondisi Offline)",
        timestamp: new Date().toISOString(),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMsg]);

      handleAddSystemNotification(
        "Koneksi Offline", 
        "Terjadi hambatan jaringan. Silakan coba kirim ulang pesan.", 
        "info"
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Regenerates a specific assistant message
  const handleRegenerateResponse = async (messageId: string) => {
    if (isLoading) return;

    const msgIdx = messages.findIndex(m => m.id === messageId);
    if (msgIdx === -1) return;

    // Slice history up to that point
    const precedingMessages = messages.slice(0, msgIdx);
    if (precedingMessages.length === 0) return;

    setMessages(precedingMessages);
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: precedingMessages,
          settings,
        }),
      });

      const data = await safeParseResponse(response);

      if (response.ok) {
        const assistantMsg: Message = {
          id: "msg-" + Date.now() + "-maria",
          role: "assistant",
          content: data.content,
          timestamp: data.timestamp || new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMsg]);

        handleAddSystemNotification(
          "Respons Baru dari Maria",
          "Maria telah selesai menyusun ulang tanggapan atas pertanyaan Anda.",
          "message"
        );
      } else {
        const errorMsg: Message = {
          id: "msg-" + Date.now() + "-error",
          role: "assistant",
          content: data.error || "Terjadi kesalahan sambungan",
          timestamp: new Date().toISOString(),
          isError: true,
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } catch (networkError: any) {
      console.error("Regenerate Error:", networkError);
      const errorMsg: Message = {
        id: "msg-" + Date.now() + "-error",
        role: "assistant",
        content: "Kesalahan Jaringan (Kondisi Offline)",
        timestamp: new Date().toISOString(),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Sets feedback status (like/dislike) for a message
  const handleSetFeedback = (messageId: string, feedback: "like" | "dislike") => {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, feedback } : m))
    );
  };

  // Edits a user's previous message and triggers a response rebuild
  const handleEditUserMessage = async (messageId: string, newContent: string) => {
    if (isLoading || !newContent.trim()) return;

    const msgIdx = messages.findIndex(m => m.id === messageId);
    if (msgIdx === -1) return;

    const updatedUserMsg: Message = {
      ...messages[msgIdx],
      content: newContent,
      isEdited: true,
    };

    const nextMessages = [...messages.slice(0, msgIdx), updatedUserMsg];
    setMessages(nextMessages);
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: nextMessages,
          settings,
        }),
      });

      const data = await safeParseResponse(response);

      if (response.ok) {
        const assistantMsg: Message = {
          id: "msg-" + Date.now() + "-maria",
          role: "assistant",
          content: data.content,
          timestamp: data.timestamp || new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMsg]);

        handleAddSystemNotification(
          "Pesan Diperbarui",
          "Maria telah menyusun ulang tanggapan atas pertanyaan baru Anda.",
          "success"
        );
      } else {
        const errorMsg: Message = {
          id: "msg-" + Date.now() + "-error",
          role: "assistant",
          content: data.error || "Terjadi kesalahan sambungan",
          timestamp: new Date().toISOString(),
          isError: true,
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } catch (networkError: any) {
      console.error("Edit Message Error:", networkError);
      const errorMsg: Message = {
        id: "msg-" + Date.now() + "-error",
        role: "assistant",
        content: "Kesalahan Jaringan (Kondisi Offline)",
        timestamp: new Date().toISOString(),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Select active thread
  const handleSelectThread = (id: string) => {
    const thread = threads.find(t => t.id === id);
    if (thread) {
      setActiveThreadId(id);
      setMessages(thread.messages);
    }
  };

  // Start fresh chat session
  const handleNewChat = () => {
    setActiveThreadId("");
    setMessages([]);
  };

  // Toggle thread pin status
  const handlePinThread = (id: string) => {
    setThreads(prev => prev.map(t => 
      t.id === id ? { ...t, isPinned: !t.isPinned } : t
    ));
    
    const thread = threads.find(t => t.id === id);
    if (thread) {
      const isNowPinned = !thread.isPinned;
      handleAddSystemNotification(
        isNowPinned ? "Disematkan" : "Sematkan Dilepas", 
        `Percakapan "${thread.title}" kini telah ${isNowPinned ? "disematkan ke atas" : "dilepas"}.`, 
        "success"
      );
    }
  };

  // Rename thread
  const handleRenameThread = (id: string, newTitle: string) => {
    if (!newTitle.trim()) return;
    setThreads(prev => prev.map(t => 
      t.id === id ? { ...t, title: newTitle.trim() } : t
    ));
    handleAddSystemNotification(
      "Ganti Nama", 
      `Nama percakapan berhasil diubah menjadi "${newTitle}".`, 
      "success"
    );
  };

  // Delete thread trigger
  const handleDeleteThread = (id: string) => {
    setThreadToDeleteId(id);
  };

  // Execute actual deletion of specified thread
  const executeDeleteThread = () => {
    if (!threadToDeleteId) return;
    const threadToDelete = threads.find(t => t.id === threadToDeleteId);
    const title = threadToDelete ? threadToDelete.title : "Percakapan";
    
    setThreads(prev => prev.filter(t => t.id !== threadToDeleteId));
    
    if (activeThreadId === threadToDeleteId) {
      setActiveThreadId("");
      setMessages([]);
    }
    
    handleAddSystemNotification(
      "Percakapan Dihapus", 
      `Percakapan "${title}" berhasil dibersihkan secara permanen.`, 
      "success"
    );
    setThreadToDeleteId(null);
  };

  // Share thread simulation
  const handleShareThread = (id: string) => {
    const thread = threads.find(t => t.id === id);
    if (thread) {
      const shareUrl = `${window.location.origin}/?share=${thread.id}`;
      navigator.clipboard.writeText(shareUrl).then(() => {
        handleAddSystemNotification(
          "Tautan Dipublikasikan", 
          `Tautan percakapan "${thread.title}" berhasil disalin ke papan klip!`, 
          "success"
        );
      }).catch(() => {
        alert(`Tautan berbagi:\n${shareUrl}`);
      });
    }
  };

  // Archive thread to private Library (local storage)
  const handleArchiveThread = (id: string) => {
    const thread = threads.find(t => t.id === id);
    if (!thread) return;

    try {
      const saved = localStorage.getItem("maria_saved_chats");
      const savedChats = saved ? JSON.parse(saved) : [];

      if (savedChats.some((c: any) => c.id === id)) {
        handleAddSystemNotification(
          "Sudah Diarsipkan",
          `Percakapan "${thread.title}" sudah ada di Pustaka Pribadi Anda.`,
          "info"
        );
        return;
      }

      // Generate snippet
      const assistantMsgs = thread.messages.filter(m => m.role === "assistant");
      const snippetVal = assistantMsgs.length > 0
        ? assistantMsgs[assistantMsgs.length - 1].content.slice(0, 120) + "..."
        : "Sesi percakapan kosong...";

      const newSavedChat = {
        id: thread.id,
        title: thread.title,
        timestamp: new Date().toISOString(),
        snippet: snippetVal,
        messages: thread.messages
      };

      savedChats.push(newSavedChat);
      localStorage.setItem("maria_saved_chats", JSON.stringify(savedChats));

      handleAddSystemNotification(
        "Arsip Berhasil",
        `Percakapan "${thread.title}" berhasil diarsipkan ke Pustaka Library!`,
        "success"
      );
    } catch (e) {
      console.error("Gagal menyimpan ke Library:", e);
    }
  };

  // Restore archived chat back to actual chat area
  const handleRestoreSavedChat = (savedChat: any) => {
    try {
      if (!threads.some(t => t.id === savedChat.id)) {
        const restoredThread: ChatThread = {
          id: savedChat.id,
          title: savedChat.title,
          isPinned: false,
          messages: savedChat.messages
        };
        setThreads(prev => [restoredThread, ...prev]);
      }
      setActiveThreadId(savedChat.id);
      setMessages(savedChat.messages);
      setActiveView("chat");

      handleAddSystemNotification(
        "Arsip Dipulihkan",
        `Percakapan "${savedChat.title}" berhasil dipulihkan ke menu samping!`,
        "success"
      );
    } catch (e) {
      console.error("Gagal memulihkan arsip chat:", e);
    }
  };

  // Wipes conversations trigger
  const handleClearHistory = () => {
    setIsClearingAllHistory(true);
  };

  // Execute actual clearing of all history
  const executeClearHistory = () => {
    setMessages([]);
    setThreads([]);
    setActiveThreadId("");
    localStorage.removeItem("maria_messages");
    localStorage.removeItem("maria_threads");
    localStorage.removeItem("maria_active_thread_id");
    
    handleAddSystemNotification(
      "Riwayat Berhasil Dihapus", 
      "Semua riwayat percakapan Anda telah dibersihkan secara permanen.", 
      "success"
    );
    setIsClearingAllHistory(false);
  };

  // Setup simulated motivational prompts reminder occasionally
  useEffect(() => {
    if (!settings.notifications?.remindersEnabled) return;

    // Send a polite motivational agenda tip 2.5 seconds after mounting to greet the user
    const timer = setTimeout(() => {
      handleAddSystemNotification(
        "Tips Belajar Hari Ini",
        "Disarankan Anda menanyakan tentang Agile & Scrum Scrum untuk mengoptimalkan agenda Anda.",
        "reminder"
      );
    }, 4500);

    return () => clearTimeout(timer);
  }, [settings.notifications?.remindersEnabled]);

  // Get active themed colors
  const activeColorTheme = THEME_OPTIONS.find(t => t.value === settings.theme) || THEME_OPTIONS[0];

  return (
    <div className="h-screen w-screen flex flex-col font-sans overflow-hidden bg-slate-50 text-slate-700 select-none">
      
      {/* Main Layout Container */}
      <div className="flex-grow flex overflow-hidden relative">
        
        {/* Far Left Sidebar: Beautiful Dark Maria Sidebar Vibe */}
        <Sidebar 
          settings={settings}
          messages={messages}
          onLoadChatHistory={(msgs) => setMessages(msgs)}
          onNewChat={handleNewChat}
          onToggleSettings={() => setIsSettingsOpen(!isSettingsOpen)}
          onOpenProfile={() => setIsProfileOpen(true)}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(true)}
          threads={threads}
          activeThreadId={activeThreadId}
          onSelectThread={handleSelectThread}
          onPinThread={handlePinThread}
          onRenameThread={handleRenameThread}
          onDeleteThread={handleDeleteThread}
          onShareThread={handleShareThread}
          onArchiveThread={handleArchiveThread}
          activeView={activeView}
          onViewChange={setActiveView}
          profileAvatarProp={profileAvatarUrl}
          useInitialsAvatarProp={profileUseInitials}
          profileAvatarBgProp={profileAvatarBg}
          profileUsernameHandleProp={profileUsername}
          isLoggedIn={isLoggedIn}
        />

        {/* Center Main Dynamic Workspace */}
        <main className="flex-1 h-full min-w-0 relative">
          {activeView === "chat" && (
            <ChatArea
              messages={messages}
              isLoading={isLoading}
              onSendMessage={handleSendMessage}
              settings={settings}
              notifications={notifications}
              onMarkNotificationRead={handleMarkNotificationRead}
              onClearNotifications={handleClearNotifications}
              onAddSystemNotification={handleAddSystemNotification}
              isSidebarCollapsed={isSidebarCollapsed}
              onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              onToggleSettings={() => setIsSettingsOpen(!isSettingsOpen)}
              onRegenerateResponse={handleRegenerateResponse}
              onSetFeedback={handleSetFeedback}
              onEditUserMessage={handleEditUserMessage}
              onToggleBookmark={handleToggleBookmark}
              bookmarkedMessages={bookmarkedMessages}
              isLoggedIn={isLoggedIn}
              onOpenLogin={() => setIsProfileOpen(true)}
            />
          )}

          {activeView === "library" && (
            <React.Suspense fallback={
              <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#0b0f17] text-slate-400">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-3" />
                <p className="text-xs font-sans font-medium tracking-wide">Memuat pustaka Maria...</p>
              </div>
            }>
              <LibraryArea
                settings={settings}
                bookmarkedMessages={bookmarkedMessages}
                onToggleBookmark={handleToggleBookmark}
                onUsePromptFormula={handleUsePromptFormula}
                onRestoreSavedChat={handleRestoreSavedChat}
                onExit={() => setActiveView("chat")}
              />
            </React.Suspense>
          )}

          {activeView === "discover" && (
            <React.Suspense fallback={
              <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#0b0f17] text-slate-400">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500 mb-3" />
                <p className="text-xs font-sans font-medium tracking-wide">Mengeksplorasi modul pintar...</p>
              </div>
            }>
              <DiscoverArea
                settings={settings}
                onSelectAgent={handleSelectAgent}
                onUsePrompt={handleUsePromptFormula}
                onExit={() => setActiveView("chat")}
              />
            </React.Suspense>
          )}
        </main>

        {/* Universal Settings Modal (ChatGPT Centered Dark Dialog) */}
        {isSettingsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Dark Backdrop overlay with subtle blur */}
            <div 
              className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-fade-in"
              onClick={() => setIsSettingsOpen(false)}
            />
            
            {/* Modal centerpiece card container */}
            <div className="relative w-full max-w-xl md:max-w-2xl bg-[#171717] rounded-3xl border border-zinc-850 shadow-2xl h-[85vh] max-h-[640px] flex flex-col overflow-hidden animate-fade-in z-55">
              <React.Suspense fallback={
                <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#171717] text-zinc-400">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-zinc-500 mb-3" />
                  <p className="text-xs font-sans font-medium tracking-wide">Memuat Dasbor Pengaturan...</p>
                </div>
              }>
                <SettingsDashboard
                  settings={settings}
                  onSaveSettings={(s) => {
                    handleSaveSettings(s);
                  }}
                  onClearHistory={handleClearHistory}
                  messageCount={messages.length}
                  onClose={() => setIsSettingsOpen(false)}
                  onAddSystemNotification={handleAddSystemNotification}
                  onSimulateEmail={handleSimulateEmail}
                  onSimulatePush={handleSimulatePush}
                />
              </React.Suspense>
            </div>
          </div>
        )}

        {/* Custom Edit Profile Modal (Beautiful Centered Dark Dialog matching Screenshot 2) */}
        {isProfileOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop Overlay */}
            <div 
              className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-fade-in"
              onClick={() => {
                setIsProfileOpen(false);
                setShowColorSelector(false);
              }}
            />
            
            {/* Modal centerpiece container */}
            <div className="relative w-full max-w-[380px] bg-[#1e222b] rounded-2xl border border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-fade-in z-55 text-slate-200">
              
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 pb-2">
                <h3 className="font-sans font-semibold text-white text-[15px]">
                  {isLoggedIn ? "Edit profil" : "Masuk ke Akun"}
                </h3>
                <button 
                  type="button" 
                  onClick={() => {
                    setIsProfileOpen(false);
                    setShowColorSelector(false);
                  }} 
                  className="p-1 rounded-full text-slate-305 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
                  title="Tutup"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-4 pt-1 flex flex-col items-center space-y-4">
                
                {/* File Input for uploading custom image */}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleProfileImageUpload} 
                  accept="image/*" 
                  className="hidden" 
                />

                {/* Large Circle Avatar or Initials with Camera Button */}
                <div className="relative mt-2">
                  {profileUseInitials ? (
                    <div className={`w-[84px] h-[84px] rounded-full ${profileAvatarBg} flex items-center justify-center border border-slate-700 shadow-lg text-white font-bold text-2xl select-none transition-all duration-350`}>
                      {(() => {
                        const name = profileDisplayName || "basit fauzan";
                        const parts = name.trim().split(/\s+/);
                        if (parts.length === 0 || !parts[0]) return "P";
                        if (parts.length === 1) return parts[0].substring(0, Math.min(2, parts[0].length)).toUpperCase();
                        return (parts[0][0] + parts[1][0]).toUpperCase();
                      })()}
                    </div>
                  ) : (
                    <div className="w-[84px] h-[84px] rounded-full overflow-hidden border border-slate-705 shadow-lg bg-slate-900 transition-all duration-350 shrink-0">
                      <img 
                        src={profileAvatarUrl} 
                        alt="Preview Foto Profil" 
                        className="w-full h-full object-cover" 
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        decoding="async"
                      />
                    </div>
                  )}
                  
                  {/* Camera Icon Button */}
                  <button
                    type="button"
                    onClick={() => setShowColorSelector(!showColorSelector)}
                    className="absolute bottom-0 right-0 w-[28px] h-[28px] rounded-full bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center shadow-md border border-slate-600 cursor-pointer active:scale-95 transition-all"
                    title="Ubah Foto / Warna Latar"
                  >
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                      <path d="M4 4h3l2-2h6l2 2h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm8 3a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6z" />
                    </svg>
                  </button>

                  {/* Dynamic Color & Image Popover */}
                  {showColorSelector && (
                    <div className="absolute top-[92px] left-1/2 transform -translate-x-1/2 bg-[#171a21] border border-slate-800 rounded-xl p-3.5 z-55 shadow-2xl w-[260px] animate-fade-in space-y-3.5">
                      
                      {/* Section 1: Upload Photo & Presets */}
                      <div className="space-y-2">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-300 block font-sans text-left pl-0.5">FOTO PROFIL</span>
                        
                        {/* Custom File Upload Button */}
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full py-2 px-3 rounded-lg border border-dashed border-slate-800 bg-slate-800/40 hover:bg-slate-800 text-slate-200 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                        >
                          <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                          Unggah Foto Profil
                        </button>

                        {/* Preset Avatars Row */}
                        <div className="grid grid-cols-6 gap-1.5 pt-1">
                          {[
                            "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&q=80",
                            "https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?w=100&h=100&fit=crop&q=80",
                            "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&q=80",
                            "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&h=100&fit=crop&q=80",
                            "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop&q=80",
                            "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&q=80"
                          ].map((url, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setProfileAvatarUrl(url);
                                setProfileUseInitials(false);
                                setShowColorSelector(false);
                              }}
                              className="w-7.5 h-7.5 rounded-full overflow-hidden border border-slate-700 hover:border-emerald-500 hover:scale-110 active:scale-95 transition-all shrink-0 cursor-pointer bg-slate-950"
                              title={`Preset ${idx + 1}`}
                            >
                              <img src={url} alt={`Preset ${idx + 1}`} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Section 2: Initials Colored Background Palette */}
                      <div className="space-y-1.5 pt-2.5 border-t border-slate-800/60">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-300 block font-sans text-left pl-0.5">WARNA INISIAL</span>
                        <div className="grid grid-cols-4 gap-1.5 justify-items-center">
                          {[
                            { bg: "bg-[#064e3b]", name: "Deep Emerald" },
                            { bg: "bg-[#1e3a8a]", name: "Deep Blue" },
                            { bg: "bg-[#581c87]", name: "Deep Purple" },
                            { bg: "bg-[#881337]", name: "Deep Rose" },
                            { bg: "bg-[#78350f]", name: "Deep Amber" },
                            { bg: "bg-[#164e63]", name: "Deep Cyan" },
                            { bg: "bg-[#831843]", name: "Deep Pink" },
                            { bg: "bg-[#1e293b]", name: "Deep Slate" }
                          ].map((c) => (
                            <button
                              key={c.bg}
                              type="button"
                              onClick={() => {
                                setProfileAvatarBg(c.bg);
                                setProfileUseInitials(true);
                                setShowColorSelector(false);
                              }}
                              className={`w-5.5 h-5.5 rounded-full ${c.bg} hover:scale-110 active:scale-90 transition-all border border-white/10 shrink-0 cursor-pointer`}
                              title={c.name}
                              aria-label={`Ubah warna profil ke ${c.name}`}
                            />
                          ))}
                        </div>
                      </div>

                    </div>
                  )}
                </div>

                {/* Form Fields exactly matching Screenshot 2 */}
                <div className="w-full space-y-3.5 pt-1">
                  
                  {/* Nama tampilan */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider pl-1 font-sans">
                      Nama tampilan
                    </label>
                    <input
                      type="text"
                      value={profileDisplayName}
                      onChange={(e) => setProfileDisplayName(e.target.value)}
                      className="w-full bg-[#12151b] border border-slate-800 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-white text-[12.5px] focus:outline-hidden transition-all placeholder-slate-500 font-medium"
                      placeholder="basit fauzan"
                    />
                  </div>

                  {/* Nama pengguna */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider pl-1 font-sans">
                      Nama pengguna
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={profileUsername.startsWith("@") ? profileUsername.slice(1) : profileUsername}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^a-zA-Z0-9_]/g, ""); // strip bad chars for username
                          setProfileUsername("@" + val);
                        }}
                        className="w-full bg-[#12151b] border border-slate-800 focus:border-emerald-500 rounded-xl pl-7 pr-3.5 py-2.5 text-white text-[12.5px] focus:outline-hidden transition-all placeholder-slate-500 font-medium font-sans"
                        placeholder="basitfauzan42"
                      />
                      <span className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-500 text-[12.5px] font-medium pointer-events-none">
                        @
                      </span>
                    </div>
                  </div>

                  {/* Note about group chats */}
                  <p className="text-[10.5px] text-slate-300 font-medium leading-normal pl-0.5 pt-0.5 select-none font-sans">
                    Profil Anda membantu orang mengenali Anda di obrolan grup.
                  </p>
                </div>
              </div>

              {/* Modal Footer Buttons */}
              <div className="flex items-center justify-end gap-2.5 p-4 pt-1.5 pb-4 font-bold text-[11px]">
                {isLoggedIn && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsLoggedIn(false);
                      localStorage.setItem("maria_is_logged_in", "false");
                      setIsProfileOpen(false);
                      setShowColorSelector(false);
                      handleAddSystemNotification(
                        "Keluar Akun",
                        "Anda telah keluar ke akun tamu (user).",
                        "info"
                      );
                    }}
                    className="mr-auto px-3.5 py-2.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition-all font-semibold cursor-pointer"
                  >
                    Keluar
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileOpen(false);
                    setShowColorSelector(false);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-800 hover:bg-slate-800/60 text-slate-300 hover:text-white transition-all cursor-pointer font-semibold"
                >
                  Batalkan
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const finalDisplayName = profileDisplayName.trim() || "basit fauzan";
                    const finalUsername = profileUsername.trim() || "@basitfauzan42";
                    
                    // 1. Save settings
                    const updatedSettings: UserSettings = {
                      ...settings,
                      username: finalDisplayName
                    };
                    setSettings(updatedSettings);
                    localStorage.setItem("maria_settings2", JSON.stringify(updatedSettings));

                    // 2. Save user handle
                    localStorage.setItem("maria_username_handle", finalUsername);

                    // 3. Save avatar bg color
                    localStorage.setItem("maria_avatar_bg_color", profileAvatarBg);

                    // 4. Save to use initials avatar setting
                    localStorage.setItem("maria_use_initials_avatar", profileUseInitials ? "true" : "false");

                    // 5. Save the custom uploaded or preset avatar URL
                    localStorage.setItem("maria_user_avatar", profileAvatarUrl);

                    // Mark as logged in
                    setIsLoggedIn(true);
                    localStorage.setItem("maria_is_logged_in", "true");

                    // Hide modal
                    setIsProfileOpen(false);
                    setShowColorSelector(false);

                    // Toast success message
                    handleAddSystemNotification(
                      isLoggedIn ? "Profil Diperbarui" : "Berhasil Masuk Akun",
                      isLoggedIn 
                        ? `Profil Anda diubah menjadi ${finalDisplayName} (${finalUsername}).`
                        : `Halo ${finalDisplayName}! Selamat datang di Maria AI.`,
                      "success"
                    );
                  }}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  {isLoggedIn ? "Simpan" : "Masuk"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Custom Confirmation Modal: Delete Chat Thread */}
        {threadToDeleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop Blur Overlay */}
            <div 
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-fade-in"
              onClick={() => setThreadToDeleteId(null)}
            />
            {/* Modal Card */}
            <div className="relative bg-[#1e222b] border border-slate-800/80 rounded-2xl max-w-sm w-full p-6 shadow-2xl animate-fade-in z-55 text-slate-100">
              <h3 className="font-display font-medium text-white tracking-tight mb-2 text-base">
                Hapus percakapan?
              </h3>
              <p className="text-xs text-slate-350 font-medium mb-6 leading-relaxed">
                Apakah Anda yakin ingin menghapus percakapan <span className="font-semibold text-slate-200">"{(threads.find(t => t.id === threadToDeleteId))?.title || "Percakapan"}"</span> secara permanen dari riwayat Anda? Tindakan ini tidak dapat dibatalkan.
              </p>
              <div className="flex items-center justify-end gap-2 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setThreadToDeleteId(null)}
                  className="px-4 py-2 rounded-lg bg-transparent hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer font-semibold"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={executeDeleteThread}
                  className="px-4 py-2 rounded-lg bg-rose-500 hover:bg-rose-600 text-white shadow-md shadow-rose-950/20 active:scale-95 transition-all cursor-pointer font-semibold"
                >
                  Hapus
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Custom Confirmation Modal: Clear All History */}
        {isClearingAllHistory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop Blur Overlay */}
            <div 
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-fade-in"
              onClick={() => setIsClearingAllHistory(false)}
            />
            {/* Modal Card */}
            <div className="relative bg-[#1e222b] border border-slate-800/80 rounded-2xl max-w-sm w-full p-6 shadow-2xl animate-fade-in z-55 text-slate-100">
               <h3 className="font-display font-medium text-white tracking-tight mb-2 text-base">
                Hapus riwayat obrolan?
              </h3>
              <p className="text-xs text-slate-350 font-medium mb-6 leading-relaxed flex-col select-text">
                Tindakan ini akan menghapus habis seluruh percakapan yang tersimpan dengan asisten Maria secara permanen dari perangkat ini. Apakah Anda ingin melanjutkan?
              </p>
              <div className="flex items-center justify-end gap-2 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setIsClearingAllHistory(false)}
                  className="px-4 py-2 rounded-lg bg-transparent hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer font-semibold"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={executeClearHistory}
                  className="px-4 py-2 rounded-lg bg-rose-500 hover:bg-rose-600 text-white shadow-md shadow-rose-950/20 active:scale-95 transition-all cursor-pointer font-semibold"
                >
                  Ya, Hapus Semua
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===================== SIMULATION CENTER: DISPATCHERS ===================== */}
        
        {/* Real-time Email Simulation Drawer Overlay */}
        {simulatedEmail && simulatedEmail.shown && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Blurred Backdrop */}
            <div 
              className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity animate-fade-in"
              onClick={() => setSimulatedEmail(null)}
            />
            
            {/* Simulated Desktop Email Hub Case */}
            <div className="relative w-full max-w-2xl bg-[#0f1115] border border-slate-800/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh] animate-fade-in z-[105]">
              {/* Mail Application Header Layout */}
              <div className="px-5 py-4 bg-slate-900 border-b border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <Inbox className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="text-[13px] font-bold text-white tracking-tight leading-none">Simulasi Inbox Email</h4>
                    <span className="text-[10px] text-zinc-450 mt-1 block">Maria AI Delivery Simulator v1.0</span>
                  </div>
                </div>
                
                <button
                  type="button"
                  onClick={() => setSimulatedEmail(null)}
                  className="p-1 px-2 rounded-lg bg-slate-800/80 text-zinc-400 hover:text-white text-[10px] font-bold cursor-pointer transition-colors"
                >
                  Tutup Simulator
                </button>
              </div>

              {/* Email Envelope Attributes */}
              <div className="p-5 bg-[#141822] border-b border-slate-800/65 space-y-2 text-[11px]">
                <div className="flex items-center justify-between text-zinc-400">
                  <span className="font-semibold text-zinc-300">Dari:</span>
                  <span className="font-mono text-zinc-400">Maria AI &lt;assistant@maria.ai&gt;</span>
                </div>
                <div className="flex items-center justify-between text-zinc-400">
                  <span className="font-semibold text-zinc-300">Kepada:</span>
                  <span className="font-mono text-zinc-200 bg-teal-500/10 border border-teal-500/20 px-1.5 py-0.5 rounded text-[10px]">
                    basitfauzan42@gmail.com
                  </span>
                </div>
                <div className="flex items-center justify-between text-zinc-400">
                  <span className="font-semibold text-zinc-300">Kategori:</span>
                  <span className="font-mono text-zinc-300 bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">
                    {simulatedEmail.category}
                  </span>
                </div>
                <div className="pt-2">
                  <span className="text-zinc-400 mr-2 font-semibold">Subjek:</span>
                  <span className="text-zinc-100 font-bold select-text text-xs">{simulatedEmail.subject}</span>
                </div>
              </div>

              {/* HTML Simulated Email Styled Template Container */}
              <div className="p-6 overflow-y-auto bg-slate-900/40 divide-y divide-slate-800">
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 shadow-md max-w-xl mx-auto space-y-4">
                  {/* Brand logo banner */}
                  <div className="flex items-center justify-between border-b border-slate-800/60 pb-4">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="font-display font-extrabold text-[12px] tracking-widest text-emerald-400 uppercase">MARIA AI</span>
                    </div>
                    <span className="text-[10px] text-zinc-500">Notifikasi Otomatis</span>
                  </div>

                  {/* Body Content */}
                  <div className="space-y-3">
                    <p className="text-[11px] font-medium text-emerald-300">
                      Halo Kak {settings.username || "Basit"},
                    </p>
                    
                    <div className="p-4 bg-slate-900 border border-slate-800/40 rounded-xl text-[11px] text-zinc-200 select-text leading-relaxed">
                      {simulatedEmail.body}
                    </div>

                    <p className="text-[10px] text-zinc-450 leading-relaxed">
                      Simulasi email ini dikirimkan karena jenis notifikasi pintar di atas disetel ke opsi pengiriman <span className="text-emerald-400 font-semibold">Email</span> di halaman pengaturan Anda.
                    </p>
                  </div>

                  {/* Operational Action CTA */}
                  <div className="pt-3 border-t border-slate-800/60 flex justify-between items-center text-[10px]">
                    <span className="text-zinc-500 font-mono">ID Pengiriman: MAIL-{Date.now().toString().slice(-6)}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSimulatedEmail(null);
                        setIsSettingsOpen(false);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer transition-colors shrink-0"
                    >
                      Buka Asisten Maria
                    </button>
                  </div>
                </div>

                <div className="pt-4 text-center">
                  <p className="text-[9px] text-zinc-500">
                    Ini adalah simulasi surel offline. Email asli akan dikirimkan lewat cloud mail service.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Real-time Web Push notification toast overlay (slides into screen on top right) */}
        {simulatedPush && simulatedPush.shown && (
          <div className="fixed top-4 right-4 z-[9999] w-80 max-w-sm bg-zinc-950/95 border border-[#333333] shadow-2xl rounded-2xl p-4 overflow-hidden animate-slide-in-right text-zinc-100 flex flex-col gap-2.5">
            {/* Browser push design wrapper */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-amber-500/10 flex items-center justify-center">
                  <Bell className="w-3 h-3 text-amber-400" />
                </div>
                <span className="text-[10px] text-zinc-300 font-bold tracking-tight">Maria AI Assistant</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-zinc-500 font-mono">Sekarang</span>
                <button
                  type="button"
                  onClick={() => setSimulatedPush(null)}
                  className="p-1 rounded-full text-zinc-500 hover:text-white hover:bg-zinc-805 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Notification payload content */}
            <div className="space-y-0.5 select-text">
              <h5 className="text-[11px] font-bold text-white tracking-tight">{simulatedPush.title}</h5>
              <p className="text-[10px] text-zinc-400 leading-normal font-medium">{simulatedPush.body}</p>
            </div>

            {/* Action Buttons inside notification toast */}
            <div className="flex items-center gap-1.5 border-t border-zinc-900/60 pt-2 mt-0.5">
              <button
                type="button"
                onClick={() => {
                  setSimulatedPush(null);
                  setIsSettingsOpen(false);
                }}
                className="flex-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-lg p-1.5 text-[9px] font-extrabold cursor-pointer transition-all flex items-center justify-center gap-1"
              >
                <span>Buka Chat</span>
                <ChevronRight className="w-2.5 h-2.5" />
              </button>
              <button
                type="button"
                onClick={() => setSimulatedPush(null)}
                className="flex-1 bg-transparent hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800 rounded-lg p-1.5 text-[9px] font-bold cursor-pointer transition-all text-center"
              >
                Tolak
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
