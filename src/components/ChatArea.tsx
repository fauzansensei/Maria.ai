import React, { useRef, useEffect, useState } from 'react';
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
import { Message, Conversation, AiMode, MediaAttachment, VoicePersonaGender } from '../types/index.ts';
import { VOICE_PERSONAS } from '../constants.ts';
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
  voicePersona?: VoicePersonaGender;
  onSelectVoicePersona?: (p: VoicePersonaGender) => void;
  onEditMessage?: (messageId: string, newContent: string, resend: boolean) => void;
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
  voicePersona = 'wanita',
  onSelectVoicePersona,
  onEditMessage,
  userPhoto,
  userName,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [speechState, setSpeechState] = useState<SpeechState>(() => speechService.getState());
  const [showNotifications, setShowNotifications] = useState(false);
  const [showVoicePopover, setShowVoicePopover] = useState(false);
  const [loadedInputText, setLoadedInputText] = useState('');

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
      title: 'Model Gemini 3.5 Flash & 6 Karakter Suara AI aktif',
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

  const currentPersona = VOICE_PERSONAS.find((p) => p.id === voicePersona) || VOICE_PERSONAS[0];

  return (
    <div className="flex-1 flex flex-col h-full bg-white text-gray-900 relative overflow-hidden select-none">
      {/* Top Bar Header (Exact match to Image 1) */}
      <header className="h-14 px-3 sm:px-4 border-b border-gray-100 bg-white flex items-center justify-between shrink-0 z-30 select-none">
        {/* Left: Hamburger Button, Maria AI Logo with online dot, Brand Name & Purple PLUS Badge */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          <button
            onClick={onToggleSidebar}
            title="Buka Menu"
            className="w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-700 hover:bg-gray-50 transition-colors shadow-xs"
          >
            <Menu className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2">
            <MariaLogo size="sm" withOnlineDot={true} />
            <span className="font-bold text-[#111827] text-base tracking-tight">
              Maria AI
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#6366f1] text-white text-[10px] font-extrabold tracking-wide uppercase shadow-xs">
              <Sparkles className="w-2.5 h-2.5 fill-white" />
              <span>PLUS</span>
            </span>
          </div>
        </div>

        {/* Center: Conversation Title if active (desktop only) */}
        {activeConversation && (
          <div className="hidden md:flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500 truncate max-w-xs">
              {activeConversation.title}
            </span>
          </div>
        )}

        {/* Right: DEFCON 5 Status Shield Badge & Notifications Bell with '1' badge */}
        <div className="flex items-center gap-2">
          {/* DEFCON 5 Mint Green Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#a7f3d0] bg-[#ecfdf5] text-[#059669] text-xs font-bold shadow-xs">
            <ShieldCheck className="w-3.5 h-3.5 text-[#059669]" />
            <span>DEFCON 5</span>
          </div>

          {/* Notifications Bell with Red '1' Badge */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications((prev) => !prev)}
              title="Notifikasi"
              className="w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-700 hover:bg-gray-50 transition-colors shadow-xs relative"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#ef4444] text-white rounded-full text-[9px] font-bold flex items-center justify-center shadow-xs">
                {unreadCount > 0 ? unreadCount : 1}
              </span>
            </button>

            {/* Notifications Popover */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-2xl shadow-2xl p-3 z-50 text-xs animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                  <span className="font-bold text-gray-900 flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-emerald-600" /> Notifikasi
                  </span>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-[10px] text-emerald-600 hover:underline"
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
                          ? 'bg-gray-50 border-transparent text-gray-400'
                          : 'bg-emerald-50/60 border-emerald-100 text-gray-800'
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
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Chat Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col">
        {messages.length === 0 ? (
          /* Empty State Hero: Exact match to Screenshot */
          <div className="flex-1 flex flex-col items-center justify-center px-4 -mt-10 sm:-mt-16 animate-in fade-in duration-300 select-none">
            {/* Centered Maria Squircle Logo */}
            <div className="mb-6">
              <MariaLogo size="hero" glow={false} />
            </div>

            {/* Heading: Dari mana kita harus mulai? */}
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight text-center">
              Dari mana kita harus mulai?
            </h1>
          </div>
        ) : (
          /* Message Stream */
          <div className="max-w-4xl mx-auto w-full py-4 divide-y divide-gray-100 dark:divide-[#1b1d29]">
            {messages.map((message) => (
              <MessageItem
                key={message.id}
                message={message}
                userPhoto={userPhoto}
                userName={userName}
                speechSpeed={speechSpeed}
                onEditMessage={onEditMessage}
                onLoadToInput={(txt) => setLoadedInputText(txt)}
              />
            ))}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="py-4 px-6 flex items-center gap-3 animate-in fade-in">
                <MariaLogo size="sm" />
                <div className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-white dark:bg-[#0e172e] border border-blue-200/80 dark:border-[#1e2d4d] text-xs text-blue-900 dark:text-blue-200 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping" />
                  <span className="font-medium">Maria sedang merumuskan jawaban...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Floating Active Speech Bar (When speaking or generating audio) */}
      {(speechState.isSpeaking || speechState.isLoading) && (
        <div className="max-w-xl mx-auto w-full px-4 pt-1 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between py-2 px-3.5 rounded-full bg-white dark:bg-[#0e172e] border border-blue-500/40 shadow-lg text-xs">
            <div className="flex items-center gap-2.5">
              {speechState.isLoading ? (
                <Loader2 className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-spin" />
              ) : (
                <Volume2 className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-pulse" />
              )}
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-900 dark:text-white">
                  {speechState.isLoading ? 'Menyiapkan Suara Maria AI...' : `${currentPersona.label} sedang berbicara`}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium flex items-center gap-1">
                  <span>AI Voice Engine</span>
                </span>
              </div>
            </div>
            <button
              onClick={() => speechService.stopSpeaking()}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-[#15223e] text-slate-700 dark:text-slate-200 hover:text-red-600 text-[11px] font-semibold transition-colors"
            >
              <VolumeX className="w-3.5 h-3.5" />
              <span>Hentikan</span>
            </button>
          </div>
        </div>
      )}

      {/* Bottom Chat Input Dock (Floating Pill with Subtext) */}
      <div className="shrink-0 pt-2 pb-1 bg-gradient-to-t from-slate-50 via-slate-50/95 to-transparent dark:from-[#070d1e] dark:via-[#070d1e]/95 dark:to-transparent">
        <ChatInput
          onSendMessage={onSendMessage}
          isLoading={isLoading}
          activeMode={activeMode}
          onModeChange={onModeChange}
          onOpenScienceScout={onOpenScienceScout}
          loadedText={loadedInputText}
          onClearLoadedText={() => setLoadedInputText('')}
        />
      </div>
    </div>
  );
};
