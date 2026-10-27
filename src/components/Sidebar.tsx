import React, { useState } from 'react';
import {
  MessageSquarePlus,
  Compass,
  Bookmark,
  Settings,
  Search,
  MoreHorizontal,
  ChevronLeft,
  ChevronsUpDown,
  Sparkles,
  Pin,
  X,
  LogIn,
  LogOut,
  ShieldCheck,
  Check,
  Loader2,
} from 'lucide-react';
import { Conversation } from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { MariaLogo } from './MariaLogo.tsx';
import { ChatPopover } from './ChatPopover.tsx';

// Official Google 4-color G icon (Matches Image 3)
const GoogleIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

interface SidebarProps {
  conversations: Conversation[];
  activeConvId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  onTogglePinConversation: (id: string) => void;
  onArchiveConversation: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
  activeView: 'chat' | 'library' | 'discover';
  onNavigateView: (view: 'chat' | 'library' | 'discover') => void;
  onOpenSettings: () => void;
  onOpenCookiePolicy?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  activeConvId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onRenameConversation,
  onTogglePinConversation,
  onArchiveConversation,
  isOpen,
  onClose,
  activeView,
  onNavigateView,
  onOpenSettings,
  onOpenCookiePolicy,
}) => {
  const { user, signIn, signOut } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  // Floating Popover State
  const [popoverTarget, setPopoverTarget] = useState<{
    id: string;
    isPinned: boolean;
    pos: { top: number; left: number };
  } | null>(null);

  // Renaming inline state
  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  // Account menu toggle
  const [showAccountMenu, setShowAccountMenu] = useState(false);

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenPopover = (
    e: React.MouseEvent,
    convId: string,
    isPinned = false
  ) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPopoverTarget({
      id: convId,
      isPinned,
      pos: { top: rect.bottom + 4, left: rect.left - 150 },
    });
  };

  const handleStartRename = (convId: string, currentTitle: string) => {
    setEditingConvId(convId);
    setEditTitle(currentTitle);
  };

  const handleSaveRename = (convId: string) => {
    if (editTitle.trim()) {
      onRenameConversation(convId, editTitle.trim());
    }
    setEditingConvId(null);
  };

  const handleShare = (conv: Conversation) => {
    if (navigator.share) {
      navigator.share({
        title: conv.title,
        text: `Lihat percakapan ini di Maria AI: "${conv.title}"`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(
        `Maria AI Percakapan: "${conv.title}"\n${window.location.href}`
      );
      alert('Tautan percakapan berhasil disalin ke papan klip!');
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/75 backdrop-blur-xs lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 bg-[#0a1128] text-slate-200 border-r border-[#1e293b] flex flex-col transition-all duration-300 ease-in-out select-none shadow-2xl lg:shadow-none ${
          isOpen
            ? 'w-72 sm:w-80 translate-x-0'
            : '-translate-x-full lg:translate-x-0 lg:w-0 lg:overflow-hidden lg:border-r-0'
        }`}
      >
        {/* Header Atas: [M] Maria AI + Arrow Left */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#1e293b] bg-[#070d1e]">
          <div className="flex items-center gap-2.5">
            <MariaLogo size="sm" glow={true} />
            <div>
              <h1 className="font-bold text-sm tracking-tight text-white">
                Maria <span className="text-blue-400">AI</span>
              </h1>
            </div>
          </div>

          <button
            onClick={onClose}
            title="Tutup / Lipat Sidebar"
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#15203b] transition-colors lg:flex"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        {/* Action Button: Navy Blue "New Chat" (Matches Sky Host) */}
        <div className="p-3.5 space-y-2 bg-[#0a1128]">
          <button
            onClick={() => {
              onNewConversation();
              onNavigateView('chat');
              if (window.innerWidth < 1024) onClose();
            }}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs tracking-wide shadow-lg shadow-blue-900/30 transition-all duration-200 active:scale-[0.98]"
          >
            <MessageSquarePlus className="w-4 h-4" />
            <span>New Chat</span>
          </button>

          {/* Primary Navigation: Library, Discover, Pengaturan */}
          <div className="space-y-1 pt-1">
            <button
              onClick={() => {
                onNavigateView('library');
                if (window.innerWidth < 1024) onClose();
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                activeView === 'library'
                  ? 'bg-[#15223e] text-blue-400 font-semibold border border-blue-500/30'
                  : 'text-slate-300 hover:bg-[#121c35] hover:text-white'
              }`}
            >
              <Bookmark className="w-4 h-4 text-blue-400" />
              <span>Library</span>
            </button>

            <button
              onClick={() => {
                onNavigateView('discover');
                if (window.innerWidth < 1024) onClose();
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                activeView === 'discover'
                  ? 'bg-[#15223e] text-sky-400 font-semibold border border-blue-500/30'
                  : 'text-slate-300 hover:bg-[#121c35] hover:text-white'
              }`}
            >
              <Compass className="w-4 h-4 text-sky-400" />
              <span>Discover</span>
            </button>

            <button
              onClick={() => {
                onOpenSettings();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-[#121c35] hover:text-white transition-all"
            >
              <Settings className="w-4 h-4 text-slate-400" />
              <span>Pengaturan</span>
            </button>
          </div>
        </div>

        {/* Riwayat Chat Header & Search */}
        <div className="px-3.5 pb-2 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold tracking-wider text-slate-400 uppercase pt-2">
            <span>RIWAYAT CHAT</span>
            <span className="text-[10px] bg-[#121c35] px-2 py-0.5 rounded-full text-blue-300 border border-[#1e2d4d]">
              {conversations.length}
            </span>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari riwayat percakapan..."
              className="w-full pl-9 pr-7 py-2 bg-[#0e172e] border border-[#1e2d4d] rounded-xl text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto px-2.5 space-y-1">
          {filteredConversations.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 px-4 leading-relaxed">
              {searchQuery
                ? 'Tidak ada riwayat percakapan yang cocok dengan pencarian.'
                : 'Belum ada obrolan. Mulai percakapan pertama Anda!'}
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isActive = conv.id === activeConvId && activeView === 'chat';
              const isEditing = editingConvId === conv.id;

              return (
                <div
                  key={conv.id}
                  onClick={() => {
                    onSelectConversation(conv.id);
                    onNavigateView('chat');
                    if (window.innerWidth < 1024) onClose();
                  }}
                  className={`group relative flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl cursor-pointer text-xs transition-all ${
                    isActive
                      ? 'bg-[#15223e] text-white font-medium border border-blue-500/40 shadow-xs'
                      : 'text-slate-300 hover:bg-[#0e172e] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-blue-500/70 group-hover:bg-blue-400" />
                    {isEditing ? (
                      <input
                        type="text"
                        value={editTitle}
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onBlur={() => handleSaveRename(conv.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveRename(conv.id);
                          if (e.key === 'Escape') setEditingConvId(null);
                        }}
                        className="bg-[#070d1e] border border-blue-500 px-1.5 py-0.5 rounded text-xs text-white outline-none w-full"
                      />
                    ) : (
                      <span className="truncate">{conv.title}</span>
                    )}
                  </div>

                  {/* Three-dots Menu Button */}
                  <button
                    type="button"
                    onClick={(e) => handleOpenPopover(e, conv.id, false)}
                    title="Opsi obrolan"
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-white rounded hover:bg-[#1a2747] transition-all shrink-0"
                  >
                    <MoreHorizontal className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Sticky Footer: MARIA Plus Banner & Account Cell */}
        <div className="p-3 border-t border-[#1b1c26] bg-[#111218] space-y-2.5">
          {/* MARIA Plus Card Banner */}
          <div className="p-3 rounded-2xl bg-gradient-to-r from-[#201235] via-[#2a1746] to-[#18112b] border border-[#53268e]/50 shadow-md">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-[#d8b4fe] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#c084fc]" />
                MARIA Plus Aktif
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#7c3aed]/30 text-[#e9d5ff]">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-neutral-300 leading-tight">
              Anda menikmati akses prioritas tinggi tanpa batas.
            </p>
          </div>

          {/* User Account / Google Login Area */}
          {!user ? (
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={async () => {
                  try {
                    await signIn();
                  } catch (err) {
                    console.error('Google sign-in error:', err);
                  }
                }}
                className="w-full flex items-center justify-center gap-2.5 py-2.5 px-3 rounded-xl bg-white hover:bg-slate-50 active:bg-slate-100 text-[#1f2937] border border-slate-200/90 shadow-xs hover:shadow-sm font-medium text-xs tracking-tight transition-all cursor-pointer group/gbtn"
              >
                <GoogleIcon className="w-4 h-4 shrink-0 group-hover/gbtn:scale-105 transition-transform" />
                <span className="font-medium text-slate-800">Continue with Google</span>
              </button>
            </div>
          ) : (
            <div className="relative">
              <div
                onClick={() => setShowAccountMenu((prev) => !prev)}
                className="flex items-center justify-between p-2 rounded-xl bg-[#0e172e] hover:bg-[#15223e] border border-[#1e2d4d] cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'User'}
                      className="w-8 h-8 rounded-lg object-cover ring-1 ring-blue-500/40 shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-md">
                      {(user.displayName || user.email || 'B')[0].toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-white truncate">
                      {user.displayName || (user.email ? user.email.split('@')[0] : 'basit fauzan')}
                    </div>
                    <div className="text-[10px] text-neutral-400 truncate">
                      {user.email || 'basitfauzan42@gmail.com'}
                    </div>
                  </div>
                </div>

                <ChevronsUpDown className="w-4 h-4 text-neutral-400 shrink-0" />
              </div>

              {/* Account Quick Menu Popover */}
              {showAccountMenu && (
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-[#0e172e] border border-[#1e2d4d] rounded-xl shadow-2xl p-1.5 text-xs text-slate-200 space-y-1 z-50">
                  <div className="px-3 py-1.5 text-[11px] text-slate-400 border-b border-[#1b2540]">
                    Status: <span className="text-blue-400 font-medium">Cloud Firestore Terhubung</span>
                  </div>
                  <button
                    onClick={() => {
                      setShowAccountMenu(false);
                      onOpenSettings();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-[#15223e] text-left transition-colors"
                  >
                    <Settings className="w-3.5 h-3.5 text-slate-400" />
                    <span>Pengaturan Akun</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowAccountMenu(false);
                      signOut();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-rose-500/15 text-rose-400 text-left transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Keluar Akun</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Legal and Security Footer Links */}
          <div className="text-[10px] text-slate-400 text-center pt-1">
            <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-slate-500 text-[10px]">
              <a href="/help.html" className="hover:text-slate-300 transition-colors">Bantuan</a>
              <span>•</span>
              <a href="/privacy.html" className="hover:text-slate-300 transition-colors">Privasi</a>
              <span>•</span>
              <a href="/terms.html" className="hover:text-slate-300 transition-colors">Ketentuan</a>
              <span>•</span>
              <button
                type="button"
                onClick={() => {
                  if (onOpenCookiePolicy) onOpenCookiePolicy();
                  else window.open('/cookies.html', '_blank');
                }}
                className="hover:text-slate-300 transition-colors underline cursor-pointer"
              >
                Cookie
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Floating Popover on Conversation */}
      {popoverTarget && (
        <ChatPopover
          isOpen={true}
          position={popoverTarget.pos}
          isPinned={popoverTarget.isPinned}
          onClose={() => setPopoverTarget(null)}
          onShare={() => {
            const conv = conversations.find((c) => c.id === popoverTarget.id);
            if (conv) handleShare(conv);
          }}
          onArchive={() => onArchiveConversation(popoverTarget.id)}
          onTogglePin={() => onTogglePinConversation(popoverTarget.id)}
          onRename={() => {
            const conv = conversations.find((c) => c.id === popoverTarget.id);
            if (conv) handleStartRename(conv.id, conv.title);
          }}
          onDelete={() => onDeleteConversation(popoverTarget.id)}
        />
      )}
    </>
  );
};
