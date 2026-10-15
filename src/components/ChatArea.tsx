import React, { useRef, useEffect, useState } from 'react';
import {
  Menu,
  ShieldCheck,
  Bell,
  Calendar,
  Sparkles,
  Settings,
  Brain,
  Dna,
  Globe,
  MapPin,
  Image as ImageIcon,
  Zap,
  Check,
  X,
  FileText,
  Briefcase,
  GraduationCap,
  Volume2,
  VolumeX,
  Loader2,
} from 'lucide-react';
import { Message, Conversation, AiMode, MediaAttachment } from '../types/index.ts';
import { MessageItem } from './MessageItem.tsx';
import { ChatInput } from './ChatInput.tsx';
import { MariaLogo } from './MariaLogo.tsx';
import { speechService, SpeechState } from '../lib/speechService.ts';

interface ChatAreaProps {
  activeConversation: Conversation | null;
  messages: Message[];
  isLoading: boolean;
  activeMode: AiMode;
  onModeChange: (mode: AiMode) => void;
  onSendMessage: (
    content: string,
    mode: AiMode,
    imageConfig?: { imageSize: '1K' | '2K' | '4K'; aspectRatio: '1:1' | '16:9' | '9:16' | '4:3' },
    attachments?: MediaAttachment[]
  ) => void;
  onToggleSidebar: () => void;
  onOpenScienceScout: () => void;
  onOpenSettings: () => void;
  speechSpeed?: string;
  userPhoto?: string | null;
  userName?: string | null;
}

interface NotificationItem {
  id: string;
  title: string;
  time: string;
  read: boolean;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  activeConversation,
  messages,
  isLoading,
  activeMode,
  onModeChange,
  onSendMessage,
  onToggleSidebar,
  onOpenScienceScout,
  onOpenSettings,
  speechSpeed = '1x',
  userPhoto,
  userName,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [speechState, setSpeechState] = useState<SpeechState>(() => speechService.getState());
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    return speechService.subscribe((state) => {
      setSpeechState(state);
    });
  }, []);
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 'notif-1',
      title: 'Cloud Firestore aktif & tersinkronisasi',
      time: 'Baru saja',
      read: false,
    },
    {
      id: 'notif-2',
      title: 'Model Gemini 3.5 Flash & 3.1 Pro siap digunakan',
      time: '5m lalu',
      read: false,
    },
    {
      id: 'notif-3',
      title: 'Sistem DEFCON 5 Shield mengamankan koneksi',
      time: '1j lalu',
      read: true,
    },
  ]);

  // Auto-scroll on new message or loading change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  // Formatted real-time date
  const currentDateFormatted = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const promptStarters = [
    {
      title: 'Email Profesional',
      desc: 'Tulis email negosiasi cuti atau tanggapan keluhan.',
      prompt: 'Tolong bantu saya menyusun email tanggapan keluhan pelanggan yang profesional, sopan, dan menawarkan solusi penggantian barang.',
      icon: <Briefcase className="w-4 h-4 text-emerald-400" />,
      mode: 'general' as AiMode,
    },
    {
      title: 'Analisis Ide Bisnis',
      desc: 'Minta pandangan Maria untuk meriset kompetitor.',
      prompt: 'Saya punya ide bisnis kedai kopi ramah lingkungan dengan nol limbah plastik. Tolong berikan analisis SWOT sederhana dan strategi pemasaran digital yang inovatif.',
      icon: <Sparkles className="w-4 h-4 text-purple-400" />,
      mode: 'thinking' as AiMode,
    },
    {
      title: 'Koreksi Tata Bahasa',
      desc: 'Perbaiki tulisan agar rapi, formal, dan meyakinkan.',
      prompt: "Tolong perbaiki paragraf ini agar terdengar sangat profesional dan meyakinkan untuk ditaruh di portofolio saya: 'Saya sangat suka belajar hal baru dan bisa kerja tim dengan mantap.'",
      icon: <FileText className="w-4 h-4 text-blue-400" />,
      mode: 'fast' as AiMode,
    },
    {
      title: 'Buat Rencana Belajar',
      desc: 'Mendesain jadwal belajar topik baru selama 30 hari.',
      prompt: 'Saya ingin mempelajari dasar-dasar manajemen proyek dan metodologi Agile dalam 30 hari sebagai pemula. Tolong buatkan silabus belajar mingguan yang rapi.',
      icon: <GraduationCap className="w-4 h-4 text-amber-400" />,
      mode: 'general' as AiMode,
    },
    {
      title: 'Riset Biomedis & Sains',
      desc: 'Eksplorasi literatur genetik dan struktur protein.',
      prompt: 'Jelaskan mekanisme mutasi gen TP53 p53 dan dampaknya terhadap stabilitas ikatan rantai ganda DNA.',
      icon: <Dna className="w-4 h-4 text-teal-400" />,
      mode: 'science' as AiMode,
    },
    {
      title: 'Studio Gambar AI',
      desc: 'Generate ilustrasi sinematik resolusi tinggi.',
      prompt: 'Pemandangan kota masa depan dengan arsitektur vertikal hijau bioluminesens dan kendaraan terbang di malam hari, ultra-detail 4K.',
      icon: <ImageIcon className="w-4 h-4 text-pink-400" />,
      mode: 'image' as AiMode,
    },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0e0f12] text-white relative overflow-hidden">
      {/* Top Bar Area */}
      <header className="h-14 px-4 sm:px-6 border-b border-[#1b1c26] bg-[#111218] flex items-center justify-between shrink-0 z-30 select-none">
        {/* Left: Mobile hamburger menu & Status Badge */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            title="Buka Menu"
            className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-[#1f212f] transition-colors lg:hidden"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* DEFCON 5 Status Shield Badge */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#20a66a]/15 border border-[#20a66a]/30 text-[#34d399] shadow-sm">
            <ShieldCheck className="w-4 h-4" />
            <span className="text-xs font-bold tracking-tight">DEFCON 5</span>
            <span className="hidden sm:inline text-[10px] text-neutral-400 border-l border-[#20a66a]/30 pl-2">
              Sistem Aman
            </span>
          </div>
        </div>

        {/* Center / Title if conversation active */}
        <div className="hidden md:flex items-center gap-2">
          {activeConversation ? (
            <span className="text-xs font-medium text-neutral-300 truncate max-w-sm">
              {activeConversation.title}
            </span>
          ) : (
            <span className="text-xs text-neutral-500 font-mono">Maria AI Intelligence Grid</span>
          )}
        </div>

        {/* Right: Date, Notifications Bell, Settings */}
        <div className="flex items-center gap-2">
          {/* Active Date */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#171923] border border-[#232535] text-xs text-neutral-400 font-medium">
            <Calendar className="w-3.5 h-3.5 text-neutral-500" />
            <span>{currentDateFormatted}</span>
          </div>

          {/* Real-time Notifications Bell with Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications((prev) => !prev)}
              title="Notifikasi"
              className="relative p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-[#1c1e2b] transition-colors"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#20a66a] ring-2 ring-[#111218] animate-pulse" />
              )}
            </button>

            {/* Notifications Popover */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-72 bg-[#151722] border border-[#27293a] rounded-2xl shadow-2xl p-3 z-50 text-xs animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between pb-2 border-b border-[#212332]">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-[#34d399]" /> Notifikasi
                  </span>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-[10px] text-[#34d399] hover:underline"
                    >
                      Tandai dibaca
                    </button>
                  )}
                </div>

                <div className="space-y-2 pt-2 max-h-56 overflow-y-auto">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-2 rounded-xl border transition-colors ${
                        n.read
                          ? 'bg-[#181a26]/50 border-transparent text-neutral-400'
                          : 'bg-[#1c1e2c] border-[#292c3d] text-neutral-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span className="font-medium text-xs leading-snug">{n.title}</span>
                        {!n.read && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#20a66a] shrink-0 mt-1" />
                        )}
                      </div>
                      <span className="text-[10px] text-neutral-500 mt-1 block">{n.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Settings Shortcut */}
          <button
            onClick={onOpenSettings}
            title="Pengaturan"
            className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-[#1c1e2b] transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Chat Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {messages.length === 0 ? (
          /* Empty State Hero (Matches Screenshot specifications) */
          <div className="min-h-full flex flex-col items-center justify-center px-4 py-12 max-w-4xl mx-auto">
            {/* Centered Large Geometric Maria Logo */}
            <div className="mb-6 animate-in zoom-in-75 duration-300">
              <MariaLogo size="hero" glow={true} />
            </div>

            {/* Hero Heading: Dari mana kita harus mulai? */}
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white text-center tracking-tight mb-2">
              Dari mana kita harus mulai?
            </h2>
            <p className="text-xs sm:text-sm text-neutral-400 text-center max-w-md mb-8 leading-relaxed">
              Tanyakan apa saja, analisis ide bisnis, telusuri riset sains mutakhir, atau buat karya visual kreatif dengan Maria AI.
            </p>

            {/* Prompt Starter Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 w-full">
              {promptStarters.map((starter, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    onModeChange(starter.mode);
                    onSendMessage(starter.prompt, starter.mode);
                  }}
                  className="group p-4 rounded-2xl bg-[#14151f] border border-[#222434] hover:border-[#20a66a]/50 hover:bg-[#181a26] text-left transition-all duration-200 flex flex-col justify-between shadow-lg"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="p-2 rounded-xl bg-[#1d1f2e] group-hover:bg-[#20a66a]/20 transition-colors">
                      {starter.icon}
                    </span>
                    <span className="text-[10px] font-mono text-neutral-500 uppercase">
                      {starter.mode}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-white group-hover:text-[#34d399] transition-colors mb-1">
                      {starter.title}
                    </h3>
                    <p className="text-[11px] text-neutral-400 leading-snug line-clamp-2">
                      {starter.desc}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Message Stream */
          <div className="max-w-4xl mx-auto py-4 divide-y divide-[#1b1d29]">
            {messages.map((message) => (
              <MessageItem
                key={message.id}
                message={message}
                userPhoto={userPhoto}
                userName={userName}
                speechSpeed={speechSpeed}
              />
            ))}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="py-4 px-6 flex items-center gap-3 animate-in fade-in">
                <MariaLogo size="sm" glow={true} />
                <div className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-[#14151f] border border-[#242636] text-xs text-neutral-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#34d399] animate-ping" />
                  <span className="font-medium text-neutral-300">Maria sedang merumuskan jawaban...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Floating Active Speech Bar */}
      {(speechState.isSpeaking || speechState.isLoading) && (
        <div className="max-w-4xl mx-auto w-full px-4 pt-1 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between py-2 px-3.5 rounded-2xl bg-[#141624] border border-[#20a66a]/40 shadow-xl shadow-[#20a66a]/10 text-xs">
            <div className="flex items-center gap-2.5">
              {speechState.isLoading ? (
                <Loader2 className="w-4 h-4 text-[#34d399] animate-spin" />
              ) : (
                <>
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#34d399] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#20a66a]"></span>
                  </span>
                  <Volume2 className="w-4 h-4 text-[#34d399] animate-pulse" />
                </>
              )}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-semibold text-white">
                  {speechState.isLoading ? 'Menyiapkan Suara Maria AI...' : 'Maria AI sedang berbicara'}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#20a66a]/20 text-[#34d399] font-medium border border-[#20a66a]/30">
                  {speechState.currentEngine === 'gemini' ? 'AI Voice Engine' : 'Audio'}
                </span>
                <span className="text-[10px] text-neutral-400 font-mono">
                  • Kecepatan {speechSpeed}
                </span>
              </div>
            </div>
            <button
              onClick={() => speechService.stopSpeaking()}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#1f2233] hover:bg-[#282c42] text-neutral-200 hover:text-white text-[11px] font-semibold transition-colors"
            >
              <VolumeX className="w-3.5 h-3.5 text-[#34d399]" />
              <span>Hentikan</span>
            </button>
          </div>
        </div>
      )}

      {/* Bottom Chat Input Dock */}
      <div className="shrink-0 pt-2 bg-gradient-to-t from-[#0e0f12] via-[#0e0f12] to-transparent">
        <ChatInput
          onSendMessage={onSendMessage}
          isLoading={isLoading}
          activeMode={activeMode}
          onModeChange={onModeChange}
          onOpenScienceScout={onOpenScienceScout}
        />
      </div>
    </div>
  );
};
