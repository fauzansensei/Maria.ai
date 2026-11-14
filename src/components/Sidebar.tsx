import React, { useState, useEffect, useRef } from 'react';
import {
  SquarePen,
  LayoutGrid,
  Compass,
  Settings,
  Search,
  MoreHorizontal,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Sparkles,
  X,
  LogOut,
  Check,
  Image as ImageIcon,
  FolderKanban,
  Plug,
  GraduationCap,
  Zap,
  Video,
  BookOpen,
  Plus,
  ListFilter,
} from 'lucide-react';
import { Conversation } from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { MariaLogo } from './MariaLogo.tsx';
import { ChatPopover } from './ChatPopover.tsx';
import { useLanguage } from '../context/LanguageContext.tsx';
import {
  NotebookItem,
  loadNotebooks,
  subscribeWorkspace,
} from '../lib/workspaceStore.ts';

export type SidebarView =
  | 'chat'
  | 'library'
  | 'discover'
  | 'notebooks'
  | 'images'
  | 'projects'
  | 'plugins'
  | 'students'
  | 'skills'
  | 'video';

// Official Google 4-color G icon
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
  activeView: SidebarView;
  onNavigateView: (view: SidebarView) => void;
  onOpenSettings: () => void;
  onOpenNotebook?: (notebookId?: string) => void;
  onCreateNotebook?: () => void;
  activeProjectName?: string | null;
  isPlus?: boolean;
  onOpenPlusModal?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = React.memo(
  ({
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
    onOpenNotebook,
    onCreateNotebook,
    activeProjectName,
    isPlus = false,
    onOpenPlusModal,
  }) => {
    const { user, signIn, signOut } = useAuth();
    const { isEn } = useLanguage();
    const [searchQuery, setSearchQuery] = useState('');
    const [showSearchBar, setShowSearchBar] = useState(false);
    const [showMoreMenu, setShowMoreMenu] = useState<boolean>(() =>
      ['plugins', 'skills', 'video', 'discover'].includes(activeView)
    );
    const [copiedToast, setCopiedToast] = useState(false);
    const [notebooks, setNotebooks] = useState<NotebookItem[]>(() => loadNotebooks());
    const searchInputRef = useRef<HTMLInputElement>(null);

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

    // Keep notebooks synchronized across workspace
    useEffect(() => {
      setNotebooks(loadNotebooks());
      return subscribeWorkspace(() => {
        setNotebooks(loadNotebooks());
      });
    }, [isOpen]);

    // Auto-expand More menu if user navigates to an item inside it
    useEffect(() => {
      if (['plugins', 'skills', 'video', 'discover'].includes(activeView)) {
        setShowMoreMenu(true);
      }
    }, [activeView]);

    // Close sidebar on Escape key
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && isOpen) {
          onClose();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    const toggleSearch = () => {
      setShowSearchBar((prev) => {
        const next = !prev;
        if (next) {
          window.setTimeout(() => searchInputRef.current?.focus(), 40);
        } else {
          setSearchQuery('');
        }
        return next;
      });
    };

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
        pos: { top: rect.bottom + 4, left: Math.max(12, rect.left - 150) },
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
        navigator
          .share({
            title: conv.title,
            text: isEn
              ? `View this chat on Maria AI: "${conv.title}"`
              : `Lihat percakapan ini di Maria AI: "${conv.title}"`,
            url: window.location.href,
          })
          .catch(() => {});
      } else {
        navigator.clipboard
          ?.writeText(
            `${isEn ? 'Maria AI Chat' : 'Maria AI Percakapan'}: "${conv.title}"\n${window.location.href}`
          )
          .catch(() => {});
        setCopiedToast(true);
        setTimeout(() => setCopiedToast(false), 2400);
      }
    };

    const navItemClass = (isActive: boolean) =>
      `w-full min-h-[42px] flex items-center justify-between gap-2.5 px-3.5 py-2 rounded-xl text-[13px] cursor-pointer ${
        isActive
          ? 'bg-blue-50 dark:bg-[#1a2236] text-blue-700 dark:text-blue-300 font-semibold'
          : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#171923]'
      }`;

    return (
      <>
        {/* Backdrop */}
        {isOpen && (
          <div
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/55"
          />
        )}

        {/* Sidebar Container */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-[82vw] max-w-[310px] sm:w-80 bg-white dark:bg-[#0b0d13] text-slate-900 dark:text-slate-100 border-r border-slate-200 dark:border-[#1c1f2b] flex flex-col transition-transform duration-150 ease-out will-change-transform select-none shadow-2xl ${
            isOpen ? 'translate-x-0' : '-translate-x-full pointer-events-none'
          }`}
        >
          {/* Top Header: Maria AI + Search + Close (Matches Gemini Reference) */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-[#191c26] shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <MariaLogo size="sm" glow={true} />
              <h1 className="font-bold text-base tracking-tight text-slate-900 dark:text-white truncate">
                Maria <span className="text-blue-600 dark:text-blue-400">AI</span>
              </h1>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={toggleSearch}
                title={isEn ? 'Search chats' : 'Cari obrolan'}
                aria-label={isEn ? 'Search chats' : 'Cari obrolan'}
                className={`min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl cursor-pointer ${
                  showSearchBar
                    ? 'bg-blue-50 dark:bg-[#1a2236] text-blue-600 dark:text-blue-400'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#171923]'
                }`}
              >
                <Search className="w-4.5 h-4.5" />
              </button>
              <button
                type="button"
                onClick={onClose}
                title={isEn ? 'Close Menu' : 'Tutup Menu'}
                aria-label={isEn ? 'Close Menu' : 'Tutup Menu'}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#171923] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {copiedToast && (
            <div className="mx-3.5 mt-2 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 text-[11px] font-medium flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 shrink-0" />
              <span>
                {isEn
                  ? 'Chat link copied to clipboard!'
                  : 'Tautan percakapan disalin ke papan klip!'}
              </span>
            </div>
          )}

          {/* Optional Search Box when toggled */}
          {showSearchBar && (
            <div className="px-3 pt-2.5 pb-1 shrink-0">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={isEn ? 'Search chat history...' : 'Cari riwayat obrolan...'}
                  className="w-full pl-9 pr-8 py-2 bg-slate-100 dark:bg-[#151822] border border-slate-200 dark:border-[#242838] rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Scrollable Drawer Body */}
          <div className="flex-1 overflow-y-auto px-2.5 py-2 space-y-2">
            {/* Top Primary Actions (Matches Gemini Drawer) */}
            <div className="space-y-0.5">
              <button
                type="button"
                onClick={() => {
                  onNewConversation();
                  onNavigateView('chat');
                  onClose();
                }}
                className="w-full min-h-[44px] flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-[13px] mb-1.5 cursor-pointer"
              >
                <SquarePen className="w-4 h-4 shrink-0" />
                <span>{isEn ? 'New chat' : 'New chat'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onNavigateView('library');
                  onClose();
                }}
                className={navItemClass(activeView === 'library')}
              >
                <span className="flex items-center gap-3 min-w-0">
                  <LayoutGrid className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
                  <span className="truncate">{isEn ? 'Library' : 'Library'}</span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onNavigateView('images');
                  onClose();
                }}
                className={navItemClass(activeView === 'images')}
              >
                <span className="flex items-center gap-3 min-w-0">
                  <ImageIcon className="w-4 h-4 text-purple-500 dark:text-purple-400 shrink-0" />
                  <span className="truncate">{isEn ? 'Images' : 'Image'}</span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onNavigateView('projects');
                  onClose();
                }}
                className={navItemClass(activeView === 'projects')}
              >
                <span className="flex items-center gap-3 min-w-0">
                  <FolderKanban className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
                  <span className="truncate">{isEn ? 'Projects' : 'Proyek'}</span>
                </span>
                {activeProjectName && (
                  <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400 truncate max-w-[90px]">
                    {activeProjectName}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  onNavigateView('students');
                  onClose();
                }}
                className={navItemClass(activeView === 'students')}
              >
                <span className="flex items-center gap-3 min-w-0">
                  <GraduationCap className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
                  <span className="truncate">Students</span>
                </span>
              </button>

              {/* More Expandable Section (Plugins/Konektor, Skills, Video, Discover, Settings) */}
              <button
                type="button"
                onClick={() => setShowMoreMenu((prev) => !prev)}
                className="w-full min-h-[42px] flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl text-[13px] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#171923] cursor-pointer"
              >
                <span className="flex items-center gap-3 min-w-0">
                  <MoreHorizontal className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
                  <span>{isEn ? 'More' : 'Lainnya'}</span>
                </span>
                <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  {!showMoreMenu && (
                    <span className="truncate max-w-[120px]">Plugins · Skills · Video</span>
                  )}
                  {showMoreMenu ? (
                    <ChevronUp className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                  )}
                </span>
              </button>

              {showMoreMenu && (
                <div className="space-y-0.5 pl-1">
                  <button
                    type="button"
                    onClick={() => {
                      onNavigateView('plugins');
                      onClose();
                    }}
                    className={navItemClass(activeView === 'plugins')}
                  >
                    <span className="flex items-center gap-3 min-w-0">
                      <Plug className="w-4 h-4 text-cyan-500 dark:text-cyan-400 shrink-0" />
                      <span className="truncate">
                        {isEn ? 'Plugins & Connectors' : 'Plugins / Konektor'}
                      </span>
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onNavigateView('skills');
                      onClose();
                    }}
                    className={navItemClass(activeView === 'skills')}
                  >
                    <span className="flex items-center gap-3 min-w-0">
                      <Zap className="w-4 h-4 text-violet-500 dark:text-violet-400 shrink-0" />
                      <span className="truncate">Skills</span>
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onNavigateView('video');
                      onClose();
                    }}
                    className={navItemClass(activeView === 'video')}
                  >
                    <span className="flex items-center gap-3 min-w-0">
                      <Video className="w-4 h-4 text-rose-500 dark:text-rose-400 shrink-0" />
                      <span className="truncate">{isEn ? 'Videos' : 'Video'}</span>
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onNavigateView('discover');
                      onClose();
                    }}
                    className={navItemClass(activeView === 'discover')}
                  >
                    <span className="flex items-center gap-3 min-w-0">
                      <Compass className="w-4 h-4 text-sky-500 dark:text-sky-400 shrink-0" />
                      <span className="truncate">Discover</span>
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onOpenSettings();
                      onClose();
                    }}
                    className={navItemClass(false)}
                  >
                    <span className="flex items-center gap-3 min-w-0">
                      <Settings className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
                      <span className="truncate">{isEn ? 'Settings' : 'Pengaturan'}</span>
                    </span>
                  </button>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-slate-100 dark:border-[#191c26] my-1.5" />

            {/* Notebooks Section (Matches Reference Video) */}
            <div className="space-y-0.5">
              <button
                type="button"
                onClick={() => {
                  if (onOpenNotebook) {
                    onOpenNotebook();
                  } else {
                    onNavigateView('notebooks');
                  }
                  onClose();
                }}
                className={`w-full min-h-[38px] flex items-center justify-between px-3.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer ${
                  activeView === 'notebooks'
                    ? 'bg-blue-50 dark:bg-[#1a2236] text-blue-700 dark:text-blue-300'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#171923] hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>Notebooks</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onCreateNotebook) {
                    onCreateNotebook();
                  } else {
                    onNavigateView('notebooks');
                  }
                  onClose();
                }}
                className="w-full min-h-[42px] flex items-center gap-3 px-3.5 py-2 rounded-xl text-[13px] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#171923] cursor-pointer"
              >
                <Plus className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
                <span>{isEn ? 'New notebook' : 'Notebook baru'}</span>
              </button>

              {notebooks.slice(0, 3).map((nb) => (
                <button
                  key={nb.id}
                  type="button"
                  onClick={() => {
                    onOpenNotebook?.(nb.id);
                    onClose();
                  }}
                  className="w-full min-h-[38px] flex items-center gap-3 px-3.5 py-1.5 rounded-xl text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#171923] cursor-pointer text-left"
                >
                  <BookOpen className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span className="truncate">{nb.title}</span>
                </button>
              ))}
            </div>

            {/* Divider */}
            <div className="border-t border-slate-100 dark:border-[#191c26] my-1.5" />

            {/* All / Chat History Section */}
            <div className="space-y-1">
              <div className="flex items-center justify-between px-3.5 py-1">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {isEn ? 'All' : 'Semua Chat'}{' '}
                  <span className="text-[11px] font-normal tabular-nums">
                    ({conversations.length})
                  </span>
                </span>
                <button
                  type="button"
                  onClick={toggleSearch}
                  title={isEn ? 'Filter conversations' : 'Filter percakapan'}
                  aria-label={isEn ? 'Filter conversations' : 'Filter percakapan'}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#171923] cursor-pointer"
                >
                  <ListFilter className="w-3.5 h-3.5" />
                </button>
              </div>

              {filteredConversations.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 px-4 leading-relaxed">
                  {searchQuery
                    ? isEn
                      ? 'No chat history matches your search.'
                      : 'Tidak ada riwayat percakapan yang cocok.'
                    : isEn
                    ? 'No chats yet. Start your first conversation!'
                    : 'Belum ada obrolan. Mulai percakapan pertama Anda!'}
                </div>
              ) : (
                <div className="space-y-0.5">
                  {filteredConversations.map((conv) => {
                    const isActive = conv.id === activeConvId && activeView === 'chat';
                    const isEditing = editingConvId === conv.id;

                    return (
                      <div
                        key={conv.id}
                        onClick={() => {
                          onSelectConversation(conv.id);
                          onNavigateView('chat');
                          onClose();
                        }}
                        className={`group relative min-h-[42px] flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl cursor-pointer text-[13px] ${
                          isActive
                            ? 'bg-slate-100 dark:bg-[#191d2b] text-slate-900 dark:text-white font-semibold'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-[#151823]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
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
                              className="bg-white dark:bg-[#0b0d13] border border-blue-500 px-2 py-0.5 rounded text-xs text-slate-900 dark:text-white outline-none w-full"
                            />
                          ) : (
                            <span className="truncate">{conv.title}</span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={(e) => handleOpenPopover(e, conv.id, false)}
                          title={isEn ? 'Chat options' : 'Opsi obrolan'}
                          className="opacity-70 sm:opacity-0 sm:group-hover:opacity-100 p-1.5 text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-lg cursor-pointer shrink-0"
                        >
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Sleek Compact Footer (Matches Reference Video) */}
          <div className="p-2.5 border-t border-slate-200 dark:border-[#191c26] bg-white dark:bg-[#0b0d13] shrink-0">
            {!user ? (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await signIn();
                    } catch (err) {
                      console.error('Google sign-in error:', err);
                    }
                  }}
                  className="w-full min-h-[42px] flex items-center justify-center gap-2.5 py-2 px-3 rounded-xl bg-white dark:bg-[#151823] hover:bg-slate-50 dark:hover:bg-[#1c202e] text-slate-800 dark:text-white border border-slate-200 dark:border-[#262a3a] font-medium text-xs cursor-pointer"
                >
                  <GoogleIcon className="w-4 h-4 shrink-0" />
                  <span>Continue with Google</span>
                </button>
                <div className="flex items-center justify-between gap-2 px-1">
                  <button
                    type="button"
                    onClick={() => {
                      onOpenSettings();
                      onClose();
                    }}
                    className="text-[11px] font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>{isEn ? 'Settings' : 'Pengaturan'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={onOpenPlusModal}
                    className="px-3 py-1 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold cursor-pointer"
                  >
                    {isPlus ? 'VIP' : 'Upgrade'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setShowAccountMenu((prev) => !prev)}
                  className="flex items-center gap-2.5 min-w-0 flex-1 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-[#151823] cursor-pointer text-left"
                >
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'User'}
                      className="w-8 h-8 rounded-full object-cover ring-1 ring-blue-500/40 shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                      {(user.displayName || user.email || 'B')[0].toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                      {user.displayName || (user.email ? user.email.split('@')[0] : 'basit fauzan')}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                      {user.email || 'basitfauzan42@gmail.com'}
                    </div>
                  </div>
                  <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={onOpenPlusModal}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 cursor-pointer flex items-center gap-1 ${
                    isPlus
                      ? 'bg-violet-600 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {isPlus && <Sparkles className="w-3 h-3" />}
                  <span>{isPlus ? 'VIP' : 'Upgrade'}</span>
                </button>

                {/* Account Quick Menu Popover */}
                {showAccountMenu && (
                  <div className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-[#141724] border border-slate-200 dark:border-[#262a3d] rounded-2xl shadow-2xl p-1.5 text-xs text-slate-700 dark:text-slate-200 space-y-1 z-50">
                    <div className="px-3 py-1.5 text-[11px] text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-[#202436]">
                      Status:{' '}
                      <span className="text-blue-600 dark:text-blue-400 font-medium">
                        {isEn ? 'Cloud Firestore Connected' : 'Cloud Firestore Terhubung'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAccountMenu(false);
                        onOpenSettings();
                        onClose();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-[#1c2032] text-left cursor-pointer"
                    >
                      <Settings className="w-3.5 h-3.5 text-slate-400" />
                      <span>{isEn ? 'Settings' : 'Pengaturan'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAccountMenu(false);
                        signOut();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-rose-500/10 text-rose-500 text-left cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>{isEn ? 'Sign Out' : 'Keluar Akun'}</span>
                    </button>
                    <div className="flex items-center justify-center gap-2 pt-1 pb-0.5 text-[10px] text-slate-400 border-t border-slate-100 dark:border-[#202436]">
                      <a href="/help.html" className="hover:underline">
                        {isEn ? 'Help' : 'Bantuan'}
                      </a>
                      <span>·</span>
                      <a href="/privacy.html" className="hover:underline">
                        {isEn ? 'Privacy' : 'Privasi'}
                      </a>
                      <span>·</span>
                      <a href="/terms.html" className="hover:underline">
                        {isEn ? 'Terms' : 'Ketentuan'}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}
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
  }
);
