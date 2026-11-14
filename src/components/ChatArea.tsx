import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Menu,
  ShieldCheck,
  Bell,
  Sparkles,
  Settings,
  Volume2,
  VolumeX,
  Loader2,
  Check,
  ChevronDown,
} from 'lucide-react';
import { Message, Conversation, AiMode, MediaAttachment, VoicePersonaGender, LaunchAction } from '../types/index.ts';
import { VOICE_PERSONAS, PROMPT_STARTERS } from '../constants.ts';
import { MessageItem } from './MessageItem.tsx';
import { ChatInput } from './ChatInput.tsx';
import { MariaLogo } from './MariaLogo.tsx';
import { speechService, SpeechState } from '../lib/speechService.ts';
import { DefconLevel } from './DefconShieldModal.tsx';
import { defconService, DefconState } from '../lib/defconProtectionService.ts';
import { guardianEngine, type Snapshot } from '../lib/guardian/guardianEngine.ts';
import { useLanguage } from '../context/LanguageContext.tsx';

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
    attachments?: MediaAttachment[],
    webSearchEnabled?: boolean
  ) => void;
  isSidebarOpen?: boolean;
  onToggleSidebar: () => void;
  onOpenScienceScout: () => void;
  onOpenSettings: () => void;
  speechSpeed?: string;
  voicePersona?: VoicePersonaGender;
  onSelectVoicePersona?: (p: VoicePersonaGender) => void;
  onEditMessage?: (messageId: string, newContent: string, resend: boolean) => void;
  onRegenerateMessage?: (messageId: string) => void;
  userPhoto?: string | null;
  userName?: string | null;
  activeConnectingAction?: LaunchAction | null;
  onOpenImageStudio?: (baseImage?: string, prompt?: string) => void;
  onOpenMusicVoice?: () => void;
  onOpenCanvasCode?: () => void;
  onOpenDefcon?: () => void;
  isPlus?: boolean;
  onOpenPlusModal?: () => void;
  enterToSend?: boolean;
  voiceLanguage?: 'auto' | 'id-ID' | 'en-US';
  webSearchDefault?: boolean;
  homepageSuggestions?: boolean;
  temporaryChat?: boolean;
}

interface NotificationItem {
  id: string;
  title: string;
  time: string;
  read: boolean;
}

export const ChatArea: React.FC<ChatAreaProps> = React.memo(({
  activeConversation,
  messages,
  isLoading,
  activeMode,
  onModeChange,
  onSendMessage,
  isSidebarOpen = false,
  onToggleSidebar,
  onOpenScienceScout,
  onOpenSettings,
  speechSpeed = '1x',
  voicePersona = 'wanita',
  onSelectVoicePersona,
  onEditMessage,
  onRegenerateMessage,
  userPhoto,
  userName,
  activeConnectingAction,
  onOpenImageStudio,
  onOpenMusicVoice,
  onOpenCanvasCode,
  onOpenDefcon,
  isPlus = false,
  onOpenPlusModal,
  enterToSend = true,
  voiceLanguage = 'auto',
  webSearchDefault = true,
  homepageSuggestions = true,
  temporaryChat = false,
}) => {
  const { isEn } = useLanguage();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [speechState, setSpeechState] = useState<SpeechState>(() => speechService.getState());
  const [showNotifications, setShowNotifications] = useState(false);
  const [showVoicePopover, setShowVoicePopover] = useState(false);
  const [defconState, setDefconState] = useState<DefconState>(() => defconService.getState());
  const [defconLevel, setDefconLevel] = useState<DefconLevel>(() => defconService.getState().currentLevel);
  const [guardianSnap, setGuardianSnap] = useState<Snapshot | null>(() => guardianEngine.getSnapshot());

  useEffect(() => {
    const unsubDefcon = defconService.subscribe((state) => {
      setDefconState(state);
      setDefconLevel(state.currentLevel);
    });
    const unsubGuardian = guardianEngine.subscribe((newSnap) => {
      setGuardianSnap(newSnap);
    });
    return () => {
      unsubDefcon();
      unsubGuardian();
    };
  }, []);

  const handleDefconLevelChange = (lvl: DefconLevel) => {
    setDefconLevel(lvl);
    defconService.setLevel(lvl);
  };

  const [loadedInputText, setLoadedInputText] = useState('');

  const handleLoadToInput = useCallback((txt: string) => {
    setLoadedInputText(txt);
  }, []);

  const handleClearLoadedText = useCallback(() => {
    setLoadedInputText('');
  }, []);

  const handleOpenImageStudioEmpty = useCallback(() => {
    onOpenImageStudio?.();
  }, [onOpenImageStudio]);

  const handleOpenDefconModal = useCallback(() => {
    onOpenDefcon?.();
  }, [onOpenDefcon]);

  useEffect(() => {
    return speechService.subscribe((state) => {
      setSpeechState(state);
    });
  }, []);

  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    try {
      const saved = localStorage.getItem('maria_notifications_state');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: 'notif-1',
        title: isEn ? 'Cloud Firestore active & synced' : 'Cloud Firestore aktif & tersinkronisasi',
        time: isEn ? 'Just now' : 'Baru saja',
        read: false,
      },
      {
        id: 'notif-2',
        title: isEn ? 'Gemini 3.8 Flash & 6 AI Voice Personas active' : 'Model Gemini 3.5 Flash & 6 Karakter Suara AI aktif',
        time: isEn ? '5m ago' : '5m lalu',
        read: false,
      },
      {
        id: 'notif-3',
        title: isEn ? 'DEFCON 5 Shield securing connection' : 'Sistem DEFCON 5 Shield mengamankan koneksi',
        time: isEn ? '1h ago' : '1j lalu',
        read: true,
      },
    ];
  });

  // Auto-scroll on new message or loading change so streaming typewriter text is never clipped
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [messages, isLoading]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = () => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, read: true }));
      try {
        localStorage.setItem('maria_notifications_state', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const currentPersona = VOICE_PERSONAS.find((p) => p.id === voicePersona) || VOICE_PERSONAS[0];

  const localizeNotif = (n: NotificationItem) => {
    if (!isEn) return n;
    if (n.id === 'notif-1') return { ...n, title: 'Cloud Firestore active & synced', time: 'Just now' };
    if (n.id === 'notif-2') return { ...n, title: 'Gemini 3.8 Flash & 6 AI Voice Personas active', time: '5m ago' };
    if (n.id === 'notif-3') return { ...n, title: 'DEFCON 5 Shield securing connection', time: '1h ago' };
    return n;
  };

  const enStarters: Record<string, { title: string; text: string }> = {
    'starter-1': {
      title: 'Professional Email',
      text: 'Please help me draft a polite, professional customer complaint response email that offers a product replacement solution.',
    },
    'starter-2': {
      title: 'Business Idea Analysis',
      text: 'I have a zero-waste eco-friendly coffee shop business idea. Please provide a concise SWOT analysis and innovative digital marketing strategy.',
    },
    'starter-3': {
      title: 'Grammar Polish',
      text: 'Please rewrite this paragraph so it sounds polished, professional, and persuasive for my portfolio: "I really love learning new things and work great in a team."',
    },
    'starter-4': {
      title: '30-Day Study Plan',
      text: 'I want to learn project management fundamentals and Agile methodology in 30 days as a beginner. Please create a clean weekly study syllabus.',
    },
  };

  return (
    <div className="flex-1 flex flex-col h-full relative overflow-hidden select-none bg-white text-gray-900 dark:bg-[#0e0f12] dark:text-slate-100">
      {/* Top Bar Header (Sticky, always visible on mobile & desktop) */}
      <header className="sticky top-0 h-14 px-3 sm:px-4 border-b flex items-center justify-between shrink-0 z-30 select-none shadow-2xs border-gray-100 bg-white dark:border-[#1e2028] dark:bg-[#0e0f12]">
        {/* Left: Hamburger Button (only shown when sidebar is closed/collapsed) + Maria AI Logo & PLUS Badge */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {!isSidebarOpen && (
            <button
              onClick={onToggleSidebar}
              title={isEn ? 'Open Menu' : 'Buka Menu'}
              aria-label={isEn ? 'Open Menu' : 'Buka Menu'}
              className="w-9 h-9 rounded-xl border flex items-center justify-center active:scale-95 shadow-xs shrink-0 border-gray-200 bg-white text-gray-800 hover:bg-gray-50 dark:border-[#262834] dark:bg-[#171820] dark:text-slate-200 dark:hover:bg-[#1f212b]"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center gap-2">
            <MariaLogo size="sm" withOnlineDot={true} />
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm sm:text-base tracking-tight text-[#0f172a] dark:text-white">
                Maria AI
              </span>
              {isPlus ? (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full bg-[#6366f1] text-white text-[9px] font-extrabold tracking-wide uppercase shadow-2xs animate-in fade-in">
                  <Sparkles className="w-2.5 h-2.5 fill-white" />
                  <span>PLUS</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={onOpenPlusModal}
                  title={isEn ? 'Upgrade to Maria PLUS to unlock pro features' : 'Tingkatkan ke Maria PLUS untuk membuka fitur berbayar'}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50/80 dark:bg-indigo-500/15 hover:bg-indigo-100/90 dark:hover:bg-indigo-500/25 border border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold tracking-tight cursor-pointer"
                >
                  <Sparkles className="w-2.5 h-2.5 text-indigo-600 dark:text-indigo-400 fill-current" />
                  <span>Upgrade</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Center: Conversation Title or Temporary Chat badge */}
        <div className="hidden md:flex items-center gap-2">
          {temporaryChat && (
            <span className="px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-300 text-[10px] font-semibold">
              {isEn ? 'Temporary Chat' : 'Obrolan Sementara'}
            </span>
          )}
          {activeConversation && !temporaryChat && (
            <span className="text-xs font-medium truncate max-w-xs text-gray-500 dark:text-slate-400">
              {activeConversation.title}
            </span>
          )}
        </div>

        {/* Right: DEFCON 5 Status Shield Badge & Notifications Bell with conditional badge */}
        <div className="flex items-center gap-2">
          {/* DEFCON Shield Badge Button */}
          <button
            onClick={() => onOpenDefcon?.()}
            title={isEn ? 'Open Maria Spy Guard Security System (Anti-Malware, Spyware & WAF)' : 'Buka Sistem Keamanan Maria Spy Guard (Anti-Malware, Spyware & WAF)'}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold shadow-xs cursor-pointer active:scale-95 ${
              defconLevel === 5
                ? 'border-[#a7f3d0] bg-[#ecfdf5] text-[#059669] hover:bg-emerald-100/80 hover:border-emerald-300'
                : defconLevel === 4
                ? 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
                : defconLevel === 3
                ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                : defconLevel === 2
                ? 'border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100'
                : 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 animate-pulse'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Spy Guard</span>
            {guardianSnap && guardianSnap.quarantine.length > 0 ? (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[9px] font-extrabold animate-pulse">
                {guardianSnap.quarantine.length}
              </span>
            ) : defconState.blockedThisSession > 0 ? (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-emerald-600 text-white text-[9px] font-extrabold animate-in zoom-in-75">
                {defconState.blockedThisSession}
              </span>
            ) : null}
          </button>

          {/* Notifications Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications((prev) => !prev)}
              title={isEn ? 'Notifications' : 'Notifikasi'}
              className="w-9 h-9 rounded-xl border flex items-center justify-center shadow-xs relative border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-[#262834] dark:bg-[#171820] dark:text-slate-200 dark:hover:bg-[#1f212b]"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#ef4444] text-white rounded-full text-[9px] font-bold flex items-center justify-center shadow-xs animate-in zoom-in-75">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Popover */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-72 border rounded-2xl shadow-2xl p-3 z-50 text-xs bg-white border-gray-200 dark:bg-[#181a22] dark:border-[#2a2d3a]">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-[#262834]">
                  <span className="font-bold flex items-center gap-1.5 text-gray-900 dark:text-white">
                    <Bell className="w-3.5 h-3.5 text-emerald-600" /> {isEn ? 'Notifications' : 'Notifikasi'}
                  </span>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-[10px] text-emerald-600 hover:underline"
                    >
                      {isEn ? 'Mark all read' : 'Tandai dibaca'}
                    </button>
                  )}
                </div>

                <div className="space-y-2 pt-2 max-h-56 overflow-y-auto">
                  {notifications.map((rawN) => {
                    const n = localizeNotif(rawN);
                    return (
                    <div
                      key={n.id}
                      className={`p-2 rounded-xl border ${
                        n.read
                          ? 'bg-gray-50 border-transparent text-gray-400 dark:bg-[#12131a] dark:border-transparent dark:text-slate-500'
                          : 'bg-emerald-50/60 border-emerald-100 text-gray-800 dark:bg-emerald-950/30 dark:border-emerald-500/20 dark:text-slate-100'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span className="font-medium text-xs leading-snug">{n.title}</span>
                        {!n.read && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0 mt-1" />
                        )}
                      </div>
                      <span className="text-[10px] text-gray-400 mt-1 block">
                        {n.time}
                      </span>
                    </div>
                  );})}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Chat Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col">
        {messages.length === 0 ? (
          /* Empty State Hero: Exact match to Image 2 */
          <div className="flex-1 flex flex-col items-center justify-center px-4 -mt-10 sm:-mt-16 select-none">
            {/* Centered Maria Squircle Logo */}
            <div className="mb-6">
              <MariaLogo size="hero" glow={false} />
            </div>

            {/* Title: Dari mana kita harus mulai? */}
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-center text-[#0f172a] dark:text-white">
              {isEn ? 'Where should we start?' : 'Dari mana kita harus mulai?'}
            </h1>

            {homepageSuggestions && (
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2 max-w-xl">
                {PROMPT_STARTERS.map((starter) => {
                  const sTitle = isEn && enStarters[starter.id] ? enStarters[starter.id].title : starter.title;
                  const sText = isEn && enStarters[starter.id] ? enStarters[starter.id].text : starter.text;
                  return (
                  <button
                    key={starter.id}
                    type="button"
                    onClick={() => onSendMessage(sText, activeMode, undefined, undefined, webSearchDefault)}
                    className="px-3 py-1.5 rounded-full border text-xs font-medium cursor-pointer bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700 dark:bg-[#171920] dark:hover:bg-[#1f222b] dark:border-[#2a2d3a] dark:text-slate-200"
                  >
                    {sTitle}
                  </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Message Stream */
          <div className="max-w-4xl mx-auto w-full pt-4 pb-28 sm:pb-36 px-1 sm:px-4 space-y-2">
            {messages.map((message) => (
              <MessageItem
                key={message.id}
                message={message}
                userPhoto={userPhoto}
                userName={userName}
                speechSpeed={speechSpeed}
                onEditMessage={onEditMessage}
                onRegenerateMessage={onRegenerateMessage}
                onLoadToInput={handleLoadToInput}
                onOpenImageStudio={onOpenImageStudio}
              />
            ))}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="py-3 px-4 sm:px-6 flex items-center gap-3 animate-in fade-in">
                <MariaLogo size="sm" />
                {activeConnectingAction ? (
                  <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#1e2330] border border-slate-700 text-xs text-white shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping shrink-0" />
                    <span className="font-medium">{activeConnectingAction.statusText}...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
                    <span className="font-medium">
                      {isEn ? 'Maria is thinking & formulating a response...' : 'Maria sedang berpikir & merumuskan jawaban...'}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div ref={messagesEndRef} className="h-8 shrink-0" />
          </div>
        )}
      </div>

      {/* Bottom Chat Input Dock */}
      <div className="shrink-0 pt-2 pb-2 border-t shadow-xs bg-white border-slate-200 dark:bg-[#0e0f12] dark:border-[#1e2028]">
        <ChatInput
          onSendMessage={onSendMessage}
          isLoading={isLoading}
          activeMode={activeMode}
          onModeChange={onModeChange}
          onOpenScienceScout={onOpenScienceScout}
          loadedText={loadedInputText}
          onClearLoadedText={handleClearLoadedText}
          onOpenImageStudio={handleOpenImageStudioEmpty}
          onOpenMusicVoice={onOpenMusicVoice}
          onOpenCanvasCode={onOpenCanvasCode}
          onOpenDefconModal={handleOpenDefconModal}
          isPlus={isPlus}
          onOpenPlusModal={onOpenPlusModal}
          enterToSend={enterToSend}
          voiceLanguage={voiceLanguage}
          webSearchDefault={webSearchDefault}
        />
      </div>
    </div>
  );
});
