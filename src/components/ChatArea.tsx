import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Menu,
  Bell,
  Sparkles,
  Settings,
  Check,
  SquarePen,
  MoreVertical,
  Share2,
  Pin,
  PinOff,
  Pencil,
  Trash2,
  X,
  User as UserIcon,
} from 'lucide-react';
import { Message, Conversation, AiMode, MediaAttachment, VoicePersonaGender, LaunchAction } from '../types/index.ts';
import { PROMPT_STARTERS } from '../constants.ts';
import { MessageItem } from './MessageItem.tsx';
import { ChatInput } from './ChatInput.tsx';
import { MariaLogo } from './MariaLogo.tsx';
import { speechService } from '../lib/speechService.ts';
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
  onNewConversation?: () => void;
  onDeleteConversation?: (convId: string) => void;
  onRenameConversation?: (convId: string, newTitle: string) => void;
  onTogglePinConversation?: (convId: string) => void;
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
  onNewConversation,
  onDeleteConversation,
  onRenameConversation,
  onTogglePinConversation,
  isSidebarOpen = false,
  onToggleSidebar,
  onOpenScienceScout,
  onOpenSettings,
  speechSpeed = '1x',
  onEditMessage,
  onRegenerateMessage,
  userPhoto,
  userName,
  activeConnectingAction,
  onOpenImageStudio,
  onOpenMusicVoice,
  onOpenCanvasCode,
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
  const menuContainerRef = useRef<HTMLDivElement>(null);
  const notifContainerRef = useRef<HTMLDivElement>(null);

  const [showNotifications, setShowNotifications] = useState(false);
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameDraft, setRenameDraft] = useState('');
  const [shareToast, setShareToast] = useState<string | null>(null);
  const [loadedInputText, setLoadedInputText] = useState('');

  const isInChat = messages.length > 0 || activeConversation !== null;
  const isPinned = Boolean(activeConversation?.title?.startsWith('📌 '));

  const handleLoadToInput = useCallback((txt: string) => {
    setLoadedInputText(txt);
  }, []);

  const handleClearLoadedText = useCallback(() => {
    setLoadedInputText('');
  }, []);

  const handleOpenImageStudioEmpty = useCallback(() => {
    onOpenImageStudio?.();
  }, [onOpenImageStudio]);

  useEffect(() => {
    return speechService.subscribe(() => {});
  }, []);

  // Dismiss header popovers on outside click or Escape
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (
        showChatMenu &&
        menuContainerRef.current &&
        !menuContainerRef.current.contains(e.target as Node)
      ) {
        setShowChatMenu(false);
      }
      if (
        showNotifications &&
        notifContainerRef.current &&
        !notifContainerRef.current.contains(e.target as Node)
      ) {
        setShowNotifications(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowChatMenu(false);
        setShowNotifications(false);
        setIsRenaming(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    window.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('keydown', handleEsc);
    };
  }, [showChatMenu, showNotifications]);

  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    try {
      const saved = localStorage.getItem('maria_notifications_state');
      if (saved) {
        const parsed = (JSON.parse(saved) as NotificationItem[]).filter(
          (item) => item.id !== 'notif-3' && !/defcon|spy guard/i.test(item.title || '')
        );
        if (parsed.length > 0) return parsed;
      }
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

  const localizeNotif = (n: NotificationItem) => {
    if (!isEn) return n;
    if (n.id === 'notif-1') return { ...n, title: 'Cloud Firestore active & synced', time: 'Just now' };
    if (n.id === 'notif-2') return { ...n, title: 'Gemini 3.8 Flash & 6 AI Voice Personas active', time: '5m ago' };
    return n;
  };

  const handleShareConversation = async () => {
    setShowChatMenu(false);
    const title = activeConversation?.title || (isEn ? 'Maria AI Chat' : 'Percakapan Maria AI');
    const summaryText = messages
      .slice(-6)
      .map((m) => `${m.role === 'user' ? (isEn ? 'You' : 'Anda') : 'Maria AI'}: ${m.content}`)
      .join('\n\n');

    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: summaryText || title,
          url: window.location.href,
        });
        return;
      } catch {}
    }

    try {
      await navigator.clipboard?.writeText(`${title}\n\n${summaryText || window.location.href}`);
      setShareToast(isEn ? 'Conversation copied to clipboard' : 'Percakapan disalin ke papan klip');
      setTimeout(() => setShareToast(null), 2400);
    } catch {}
  };

  const handleOpenRename = () => {
    if (!activeConversation) return;
    setShowChatMenu(false);
    setRenameDraft(activeConversation.title);
    setIsRenaming(true);
  };

  const handleConfirmRename = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (activeConversation && renameDraft.trim()) {
      onRenameConversation?.(activeConversation.id, renameDraft.trim());
    }
    setIsRenaming(false);
  };

  const handleDeleteCurrentChat = () => {
    setShowChatMenu(false);
    if (activeConversation && onDeleteConversation) {
      onDeleteConversation(activeConversation.id);
    } else {
      onNewConversation?.();
    }
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

  const renderNotificationsPopover = () => (
    <div className="absolute right-0 mt-2 w-72 border rounded-2xl shadow-2xl p-3 z-50 text-xs bg-white border-gray-200 dark:bg-[#181a22] dark:border-[#2a2d3a] animate-in fade-in zoom-in-95 duration-100">
      <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-[#262834]">
        <span className="font-bold flex items-center gap-1.5 text-gray-900 dark:text-white">
          <Bell className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> {isEn ? 'Notifications' : 'Notifikasi'}
        </span>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllRead}
            className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
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
              className={`p-2.5 rounded-xl border ${
                n.read
                  ? 'bg-gray-50 border-transparent text-gray-400 dark:bg-[#12131a] dark:border-transparent dark:text-slate-500'
                  : 'bg-blue-50/60 border-blue-100 text-gray-800 dark:bg-blue-950/30 dark:border-blue-500/20 dark:text-slate-100'
              }`}
            >
              <div className="flex items-start justify-between gap-1">
                <span className="font-medium text-xs leading-snug">{n.title}</span>
                {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0 mt-1" />}
              </div>
              <span className="text-[10px] text-gray-400 mt-1 block">{n.time}</span>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col h-full relative overflow-hidden select-none bg-white text-gray-900 dark:bg-[#0e0f12] dark:text-slate-100">
      {/* Top Bar Header (Minimalist Reference Match: Left Hamburger + Maria AI | Right New Chat + 3-Dot Menu or Bell + Profile) */}
      <header className="sticky top-0 h-14 px-3 sm:px-4 border-b flex items-center justify-between shrink-0 z-30 select-none border-gray-100 bg-white dark:border-[#1e2028] dark:bg-[#0e0f12]">
        {/* Left Zone: Hamburger Menu + Maria AI Brand */}
        <div className="flex items-center gap-2 min-w-0">
          {!isSidebarOpen && (
            <button
              type="button"
              onClick={onToggleSidebar}
              title={isEn ? 'Open Menu' : 'Buka Menu'}
              aria-label={isEn ? 'Open Menu' : 'Buka Menu'}
              className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95 shrink-0 text-gray-700 hover:bg-gray-100 dark:text-slate-200 dark:hover:bg-[#1a1c24] cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center gap-2 min-w-0">
            <MariaLogo size="sm" />
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-bold text-sm sm:text-base tracking-tight text-[#0f172a] dark:text-white whitespace-nowrap shrink-0">
                Maria AI
              </span>
              {isPlus ? (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#6366f1] text-white text-[9px] font-extrabold tracking-wide uppercase shrink-0">
                  <Sparkles className="w-2.5 h-2.5 fill-white" />
                  <span>PLUS</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={onOpenPlusModal}
                  title={isEn ? 'Upgrade to Maria PLUS' : 'Tingkatkan ke Maria PLUS'}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50/80 dark:bg-indigo-500/15 hover:bg-indigo-100/90 dark:hover:bg-indigo-500/25 border border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold tracking-tight cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Sparkles className="w-2.5 h-2.5 text-indigo-600 dark:text-indigo-400 fill-current" />
                  <span>Upgrade</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Center Zone (Desktop): Active Conversation Title or Temporary Chat Tag */}
        <div className="hidden md:flex items-center gap-2 min-w-0 px-4">
          {temporaryChat && (
            <span className="px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-300 text-[10px] font-semibold whitespace-nowrap">
              {isEn ? 'Temporary Chat' : 'Obrolan Sementara'}
            </span>
          )}
          {activeConversation && !temporaryChat && (
            <span className="text-xs font-medium truncate max-w-xs text-gray-500 dark:text-slate-400">
              {activeConversation.title}
            </span>
          )}
        </div>

        {/* Right Zone: Matches Reference Video */}
        <div className="flex items-center gap-1 shrink-0" ref={notifContainerRef}>
          {isInChat ? (
            <>
              {/* New Chat Button (SquarePen icon) */}
              <button
                type="button"
                onClick={() => {
                  setShowChatMenu(false);
                  setShowNotifications(false);
                  onNewConversation?.();
                }}
                title={isEn ? 'New chat' : 'Chat baru'}
                aria-label={isEn ? 'New chat' : 'Chat baru'}
                className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95 text-gray-700 hover:bg-gray-100 dark:text-slate-200 dark:hover:bg-[#1a1c24] cursor-pointer"
              >
                <SquarePen className="w-[18px] h-[18px]" />
              </button>

              {/* 3-Dot Chat Options Menu (Matches Video Reference) */}
              <div className="relative" ref={menuContainerRef}>
                <button
                  type="button"
                  onClick={() => {
                    setShowNotifications(false);
                    setShowChatMenu((prev) => !prev);
                  }}
                  title={isEn ? 'Chat options' : 'Opsi percakapan'}
                  aria-label={isEn ? 'Chat options' : 'Opsi percakapan'}
                  aria-expanded={showChatMenu}
                  className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95 relative text-gray-700 hover:bg-gray-100 dark:text-slate-200 dark:hover:bg-[#1a1c24] cursor-pointer"
                >
                  <MoreVertical className="w-[18px] h-[18px]" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />
                  )}
                </button>

                {showChatMenu && (
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl border shadow-2xl py-1.5 px-1.5 z-50 text-xs bg-white border-gray-200 text-gray-800 dark:bg-[#181a22] dark:border-[#2a2d3a] dark:text-slate-100 animate-in fade-in zoom-in-95 duration-100">
                    <button
                      type="button"
                      onClick={handleShareConversation}
                      className="w-full min-h-[38px] flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-[#232634] text-left cursor-pointer"
                    >
                      <Share2 className="w-4 h-4 text-gray-500 dark:text-slate-400 shrink-0" />
                      <span>{isEn ? 'Share conversation' : 'Bagikan percakapan'}</span>
                    </button>

                    {activeConversation && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            onTogglePinConversation?.(activeConversation.id);
                            setShowChatMenu(false);
                          }}
                          className="w-full min-h-[38px] flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-[#232634] text-left cursor-pointer"
                        >
                          {isPinned ? (
                            <>
                              <PinOff className="w-4 h-4 text-amber-500 shrink-0" />
                              <span>{isEn ? 'Unpin' : 'Lepas sematan'}</span>
                            </>
                          ) : (
                            <>
                              <Pin className="w-4 h-4 text-gray-500 dark:text-slate-400 shrink-0" />
                              <span>{isEn ? 'Pin' : 'Sematkan'}</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={handleOpenRename}
                          className="w-full min-h-[38px] flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-[#232634] text-left cursor-pointer"
                        >
                          <Pencil className="w-4 h-4 text-gray-500 dark:text-slate-400 shrink-0" />
                          <span>{isEn ? 'Rename' : 'Ubah nama'}</span>
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setShowChatMenu(false);
                        setShowNotifications((prev) => !prev);
                      }}
                      className="w-full min-h-[38px] flex items-center justify-between gap-2 px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-[#232634] text-left cursor-pointer"
                    >
                      <span className="flex items-center gap-3">
                        <Bell className="w-4 h-4 text-gray-500 dark:text-slate-400 shrink-0" />
                        <span>{isEn ? 'Notifications' : 'Notifikasi'}</span>
                      </span>
                      {unreadCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold tabular-nums">
                          {unreadCount}
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowChatMenu(false);
                        onOpenSettings();
                      }}
                      className="w-full min-h-[38px] flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-[#232634] text-left cursor-pointer"
                    >
                      <Settings className="w-4 h-4 text-gray-500 dark:text-slate-400 shrink-0" />
                      <span>{isEn ? 'Settings' : 'Pengaturan'}</span>
                    </button>

                    <div className="h-px my-1 mx-2 bg-gray-100 dark:bg-[#262834]" />

                    <button
                      type="button"
                      onClick={handleDeleteCurrentChat}
                      className="w-full min-h-[38px] flex items-center gap-3 px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10 text-left cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4 shrink-0" />
                      <span>{isEn ? 'Delete' : 'Hapus'}</span>
                    </button>
                  </div>
                )}

                {showNotifications && renderNotificationsPopover()}
              </div>
            </>
          ) : (
            <>
              {/* Empty Home Screen Top Right: Notifications Bell + User Profile / Settings */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowNotifications((prev) => !prev)}
                  title={isEn ? 'Notifications' : 'Notifikasi'}
                  aria-label={isEn ? 'Notifications' : 'Notifikasi'}
                  className="w-9 h-9 rounded-xl flex items-center justify-center relative text-gray-700 hover:bg-gray-100 dark:text-slate-200 dark:hover:bg-[#1a1c24] cursor-pointer"
                >
                  <Bell className="w-[18px] h-[18px]" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white dark:ring-[#0e0f12]" />
                  )}
                </button>
                {showNotifications && renderNotificationsPopover()}
              </div>

              <button
                type="button"
                onClick={onOpenSettings}
                title={isEn ? 'Account & Settings' : 'Akun & Pengaturan'}
                aria-label={isEn ? 'Account & Settings' : 'Akun & Pengaturan'}
                className="w-9 h-9 rounded-full flex items-center justify-center active:scale-95 hover:bg-gray-100 dark:hover:bg-[#1a1c24] cursor-pointer"
              >
                {userPhoto ? (
                  <img
                    src={userPhoto}
                    alt={userName || 'User'}
                    className="w-7 h-7 rounded-full object-cover ring-1 ring-gray-200 dark:ring-[#2a2d3a]"
                  />
                ) : userName ? (
                  <span className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                    {userName[0].toUpperCase()}
                  </span>
                ) : (
                  <span className="w-7 h-7 rounded-full bg-gray-100 dark:bg-[#1a1c24] text-gray-700 dark:text-slate-200 flex items-center justify-center border border-gray-200 dark:border-[#2a2d3a]">
                    <UserIcon className="w-3.5 h-3.5" />
                  </span>
                )}
              </button>
            </>
          )}
        </div>
      </header>

      {/* Inline Share Toast */}
      {shareToast && (
        <div className="fixed top-16 right-4 z-50 px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-[#1d202b] text-white text-xs font-medium shadow-xl border border-slate-700 flex items-center gap-2 animate-in fade-in duration-150">
          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>{shareToast}</span>
        </div>
      )}

      {/* Inline Rename Conversation Modal */}
      {isRenaming && activeConversation && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 animate-in fade-in duration-100">
          <form
            onSubmit={handleConfirmRename}
            className="w-full max-w-sm rounded-2xl border p-4 shadow-2xl space-y-3 bg-white border-gray-200 text-gray-900 dark:bg-[#161822] dark:border-[#2a2d3a] dark:text-white"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">
                {isEn ? 'Rename conversation' : 'Ubah nama percakapan'}
              </h3>
              <button
                type="button"
                onClick={() => setIsRenaming(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <input
              type="text"
              autoFocus
              value={renameDraft}
              onChange={(e) => setRenameDraft(e.target.value)}
              placeholder={isEn ? 'Conversation title...' : 'Judul percakapan...'}
              className="w-full px-3 py-2 rounded-xl border text-xs bg-gray-50 border-gray-200 text-gray-900 focus:outline-none focus:border-blue-500 dark:bg-[#0e1017] dark:border-[#2a2d3a] dark:text-white"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsRenaming(false)}
                className="px-3 py-1.5 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-[#232634] cursor-pointer"
              >
                {isEn ? 'Cancel' : 'Batal'}
              </button>
              <button
                type="submit"
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
              >
                {isEn ? 'Save' : 'Simpan'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main Chat Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col">
        {messages.length === 0 ? (
          /* Empty State Hero */
          <div className="flex-1 flex flex-col items-center justify-center px-4 -mt-10 sm:-mt-16 select-none">
            <div className="mb-6">
              <MariaLogo size="hero" glow={false} />
            </div>

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
