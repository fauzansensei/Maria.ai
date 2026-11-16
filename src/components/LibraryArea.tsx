import React, { useState, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  FileText,
  Image as ImageIcon,
  Volume2,
  Bookmark,
  MessageSquare,
  Archive,
  Code2,
  Search,
  Download,
  Trash2,
  Clock,
  Sparkles,
  Menu,
  Eye,
  RotateCcw,
  Wand2,
  Send,
  X,
  ExternalLink,
  Loader2,
  Check,
  ShieldCheck,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.tsx';
import { useTheme } from '../context/ThemeContext.tsx';
import {
  LibraryCategory,
  LibraryItem,
  loadLibraryItems,
  subscribeLibrary,
  resolveBestImageUrl,
} from '../lib/libraryStore.ts';
import { getOriginalMediaBlob } from '../lib/mediaUtils.ts';
import { autoFormatMarkdown } from '../lib/formatUtils.ts';
import { MariaLogo } from './MariaLogo.tsx';
import { MediaLightboxModal, LightboxMedia } from './MediaLightboxModal.tsx';

export type { LibraryCategory, LibraryItem };

interface LibraryAreaProps {
  items?: LibraryItem[];
  onBackToChat: () => void;
  onSelectPrompt?: (prompt: string) => void;
  onOpenSidebar?: () => void;
  onDeleteItem?: (itemId: string) => Promise<void> | void;
  onRestoreArchivedChat?: (item: LibraryItem) => Promise<void> | void;
  onOpenImageStudio?: (baseImage?: string, prompt?: string) => void;
  onSendImageToChat?: (imageUrl: string, prompt: string, model: string) => void;
}

const LibraryImageThumb: React.FC<{
  item: LibraryItem;
  onOpenLightbox: (url: string) => void;
  className?: string;
}> = ({ item, onOpenLightbox, className = '' }) => {
  const [resolvedUrl, setResolvedUrl] = useState<string>(item.previewUrl || '');

  useEffect(() => {
    let active = true;
    resolveBestImageUrl(item.previewUrl || '', item.imageMediaKey, item.title).then((url) => {
      if (active && url) setResolvedUrl(url);
    });
    return () => {
      active = false;
    };
  }, [item.id, item.previewUrl, item.imageMediaKey, item.title]);

  if (!resolvedUrl) {
    return (
      <div className={`${className} flex items-center justify-center bg-slate-100 dark:bg-[#11172a] text-slate-400`}>
        <ImageIcon className="w-8 h-8" />
      </div>
    );
  }

  return (
    <img
      src={resolvedUrl}
      alt={item.title}
      onClick={() => onOpenLightbox(resolvedUrl)}
      className={`${className} cursor-pointer`}
    />
  );
};

const ArchivedMsgImage: React.FC<{
  src?: string;
  mediaKey?: string;
  alt: string;
  onOpenLightbox: (url: string) => void;
  className?: string;
}> = ({ src, mediaKey, alt, onOpenLightbox, className = '' }) => {
  const [resolved, setResolved] = useState<string>(src || '');

  useEffect(() => {
    let active = true;
    if (mediaKey) {
      getOriginalMediaBlob(mediaKey).then((blobUrl) => {
        if (active && blobUrl) setResolved(blobUrl);
      });
    }
    return () => {
      active = false;
    };
  }, [mediaKey]);

  if (!resolved) return null;

  return (
    <img
      src={resolved}
      alt={alt}
      onClick={() => onOpenLightbox(resolved)}
      className={`${className} cursor-pointer`}
    />
  );
};

export const LibraryArea: React.FC<LibraryAreaProps> = React.memo(
  ({
    items: propItems,
    onBackToChat,
    onSelectPrompt,
    onOpenSidebar,
    onDeleteItem,
    onRestoreArchivedChat,
    onOpenImageStudio,
    onSendImageToChat,
  }) => {
    const { isEn } = useLanguage();
    const { isDark } = useTheme();
    const [activeCategory, setActiveCategory] = useState<LibraryCategory>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [localItems, setLocalItems] = useState<LibraryItem[]>(() => propItems ?? loadLibraryItems());
    const [viewingChat, setViewingChat] = useState<LibraryItem | null>(null);
    const [lightboxMedia, setLightboxMedia] = useState<LightboxMedia | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [restoringId, setRestoringId] = useState<string | null>(null);
    const [toastMsg, setToastMsg] = useState<string | null>(null);

    useEffect(() => {
      if (propItems) {
        setLocalItems(propItems);
      }
    }, [propItems]);

    useEffect(() => {
      if (propItems) return;
      setLocalItems(loadLibraryItems());
      return subscribeLibrary(() => {
        setLocalItems(loadLibraryItems());
      });
    }, [propItems]);

    const items = propItems ?? localItems;

    const categories: { id: LibraryCategory; label: string; icon: React.ReactNode; count: number }[] = useMemo(() => {
      const chatCount = items.filter(
        (it) => it.kind === 'chat' || it.category === 'archive' || it.category === 'chat-history'
      ).length;
      const imageCount = items.filter((it) => it.kind === 'image' || it.category === 'images').length;

      return [
        { id: 'all', label: isEn ? 'All' : 'Semua', icon: <FileText className="w-3.5 h-3.5" />, count: items.length },
        { id: 'images', label: isEn ? 'Images' : 'Gambar', icon: <ImageIcon className="w-3.5 h-3.5" />, count: imageCount },
        { id: 'archive', label: isEn ? 'Archived Chats' : 'Arsip Chat', icon: <Archive className="w-3.5 h-3.5" />, count: chatCount },
        { id: 'chat-history', label: isEn ? 'Chat History' : 'Riwayat Chat', icon: <MessageSquare className="w-3.5 h-3.5" />, count: chatCount },
        { id: 'documents', label: isEn ? 'Documents' : 'Dokumen', icon: <FileText className="w-3.5 h-3.5" />, count: items.filter((it) => it.category === 'documents').length },
        { id: 'bookmarked', label: isEn ? 'Bookmarked' : 'Ditandai', icon: <Bookmark className="w-3.5 h-3.5" />, count: items.filter((it) => it.category === 'bookmarked').length },
        { id: 'formulas', label: isEn ? 'Formulas' : 'Formula', icon: <Code2 className="w-3.5 h-3.5" />, count: items.filter((it) => it.category === 'formulas').length },
        { id: 'audio', label: isEn ? 'Audio' : 'Suara', icon: <Volume2 className="w-3.5 h-3.5" />, count: items.filter((it) => it.category === 'audio').length },
      ];
    }, [items, isEn]);

    const filteredItems = useMemo(() => {
      const q = searchQuery.toLowerCase().trim();
      return items.filter((item) => {
        const matchesCategory =
          activeCategory === 'all' ||
          item.category === activeCategory ||
          (activeCategory === 'images' && item.kind === 'image') ||
          ((activeCategory === 'archive' || activeCategory === 'chat-history') && item.kind === 'chat');

        if (!matchesCategory) return false;
        if (!q) return true;

        const inTitle = item.title.toLowerCase().includes(q);
        const inSnippet = item.snippet?.toLowerCase().includes(q);
        const inMsgs =
          Array.isArray(item.archivedMessages) &&
          item.archivedMessages.some((m) => m.content?.toLowerCase().includes(q));
        return Boolean(inTitle || inSnippet || inMsgs);
      });
    }, [items, activeCategory, searchQuery]);

    const showToast = (msg: string) => {
      setToastMsg(msg);
      window.setTimeout(() => {
        setToastMsg((prev) => (prev === msg ? null : prev));
      }, 3200);
    };

    const handleDownloadImage = async (item: LibraryItem) => {
      const url = await resolveBestImageUrl(item.previewUrl || '', item.imageMediaKey, item.title);
      if (!url) return;
      const a = document.createElement('a');
      a.href = url;
      a.download = `MariaPustaka_${item.title.replace(/[^a-z0-9]/gi, '_').slice(0, 28)}_${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    };

    const handleExportChatTranscript = (item: LibraryItem) => {
      const msgs = item.archivedMessages || [];
      const mdLines = [
        `# ${item.title}`,
        `Diarsipkan: ${item.date} | Model: ${item.model || 'Maria AI'} | Total Pesan: ${msgs.length}`,
        '',
        '---',
        '',
        ...msgs.map((m) => {
          const speaker = m.role === 'user' ? 'Anda' : 'Maria AI';
          return `### ${speaker}\n\n${m.content || '(Lampiran media)'}\n`;
        }),
      ];
      const blob = new Blob([mdLines.join('\n')], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ArsipChat_${item.title.replace(/[^a-z0-9]/gi, '_').slice(0, 28)}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };

    const handleRestore = async (item: LibraryItem) => {
      if (!onRestoreArchivedChat || restoringId) return;
      setRestoringId(item.id);
      try {
        await onRestoreArchivedChat(item);
        setViewingChat(null);
      } finally {
        setRestoringId(null);
      }
    };

    const handleDeleteConfirmed = async (id: string) => {
      setConfirmDeleteId(null);
      if (viewingChat?.id === id) setViewingChat(null);
      if (onDeleteItem) {
        await onDeleteItem(id);
      }
      showToast(isEn ? 'Item removed from Library' : 'Item dihapus dari Pustaka');
    };

    return (
      <div className={`flex-1 flex flex-col h-full overflow-hidden ${isDark ? 'bg-[#070d1e] text-white' : 'bg-slate-50 text-slate-900'}`}>
        <MediaLightboxModal media={lightboxMedia} onClose={() => setLightboxMedia(null)} />

        {/* Header Bar */}
        <div className={`flex items-center justify-between px-4 sm:px-6 py-4 border-b shrink-0 ${isDark ? 'border-[#1e293b] bg-[#0a1128]' : 'border-slate-200 bg-white'}`}>
          <div className="flex items-center gap-3 min-w-0">
            {onOpenSidebar && (
              <button
                type="button"
                onClick={onOpenSidebar}
                aria-label={isEn ? 'Open Menu' : 'Buka Menu'}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#15203b] cursor-pointer"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/80 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shrink-0">
              <Bookmark className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className={`text-base font-bold tracking-tight truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {isEn ? 'Maria Library' : 'Pustaka Maria'}
                </h2>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/80 shrink-0">
                  {items.length} {isEn ? 'Saved' : 'Tersimpan'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {isEn
                  ? 'Persistent images & archived conversations (safe even if active chats are deleted)'
                  : 'Gambar & arsip percakapan lengkap (tetap aman meski chat di sidebar dihapus)'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onBackToChat}
              className="py-1.5 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold shadow-md shadow-blue-900/20 flex items-center gap-1.5 cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isEn ? 'Back to Chat' : 'Kembali ke Chat'}</span>
              <span className="sm:hidden">Chat</span>
            </button>
          </div>
        </div>

        {toastMsg && (
          <div className="mx-4 sm:mx-6 mt-3 px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-200 text-xs font-medium flex items-center gap-2 shrink-0">
            <Check className="w-4 h-4 shrink-0" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Subheader Toolbar: Categories & Search */}
        <div className="px-4 sm:px-6 py-3 border-b border-slate-200 dark:border-[#1e293b] bg-white/70 dark:bg-[#0e172e] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {categories.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors duration-100 cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm font-semibold'
                      : 'bg-slate-100 dark:bg-[#15223e] text-slate-600 dark:text-slate-300 hover:text-blue-600'
                  }`}
                >
                  {cat.icon}
                  <span>{cat.label}</span>
                  {cat.count > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-slate-200/80 dark:bg-white/10 text-slate-600 dark:text-slate-300'}`}>
                      {cat.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="relative w-full sm:w-64 shrink-0">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isEn ? 'Search saved images or chats...' : 'Cari gambar atau isi arsip chat...'}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-[#0a1128] border border-slate-200 dark:border-[#1e2d4d] rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Grid of Library Cards */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {filteredItems.length === 0 ? (
            <div className="h-72 flex flex-col items-center justify-center text-center text-slate-500 dark:text-slate-400 space-y-2.5 max-w-md mx-auto">
              <Archive className="w-11 h-11 stroke-[1.5] text-slate-400 dark:text-slate-600" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {isEn ? 'Library is empty in this category' : 'Belum ada item tersimpan di kategori ini'}
              </p>
              <p className="text-xs leading-relaxed">
                {isEn
                  ? 'Move images from Image Gallery or archive any conversation from the chat menu to keep a permanent readable backup here.'
                  : 'Pindahkan gambar dari menu Image atau klik "Arsipkan ke Pustaka" pada obrolan agar isi chat & gambar tersimpan permanen dan bisa dibuka/dipulihkan kapan saja.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
              {filteredItems.map((item) => {
                const isChat = item.kind === 'chat';
                const isImage = item.kind === 'image';
                const msgCount = item.archivedMessages?.length || 0;

                return (
                  <div
                    key={item.id}
                    className={`group relative border hover:border-blue-500/60 rounded-2xl p-4 flex flex-col justify-between shadow-sm hover:shadow-md transition-all ${
                      isDark ? 'bg-[#0c1222] border-[#1e293b]' : 'bg-white border-slate-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2.5">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${
                            isChat
                              ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/80'
                              : 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/80'
                          }`}
                        >
                          {item.badge || (isChat ? 'Arsip Chat' : 'Tersimpan')}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 shrink-0">
                          <Clock className="w-3 h-3" />
                          {item.date}
                        </span>
                      </div>

                      {isImage && (
                        <div className="w-full h-44 mb-3 rounded-xl overflow-hidden bg-slate-100 dark:bg-[#080d1a] border border-slate-200 dark:border-[#1e293b]">
                          <LibraryImageThumb
                            item={item}
                            onOpenLightbox={(url) =>
                              setLightboxMedia({
                                url,
                                type: 'image',
                                name: item.title,
                              })
                            }
                            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-150"
                          />
                        </div>
                      )}

                      <h3
                        onClick={() => isChat && setViewingChat(item)}
                        className={`text-sm font-semibold leading-snug mb-1 line-clamp-2 ${
                          isChat ? 'cursor-pointer hover:text-blue-500' : ''
                        } ${isDark ? 'text-white' : 'text-slate-900'}`}
                      >
                        {item.title}
                      </h3>

                      {item.snippet && (
                        <p className={`text-xs line-clamp-2 leading-relaxed mb-3 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                          {item.snippet}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2.5">
                      {isChat && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setViewingChat(item)}
                            className="flex-1 min-h-[36px] px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>
                              {isEn
                                ? `Read Chat (${msgCount})`
                                : `Lihat Isi Chat (${msgCount})`}
                            </span>
                          </button>
                          {onRestoreArchivedChat && (
                            <button
                              type="button"
                              disabled={restoringId === item.id}
                              onClick={() => handleRestore(item)}
                              title={isEn ? 'Restore to Sidebar Chat' : 'Pulihkan ke Daftar Chat'}
                              className="min-h-[36px] px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                              {restoringId === item.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <RotateCcw className="w-3.5 h-3.5" />
                              )}
                              <span>{isEn ? 'Restore' : 'Pulihkan'}</span>
                            </button>
                          )}
                        </div>
                      )}

                      <div className={`pt-2.5 border-t flex items-center justify-between gap-2 text-xs ${isDark ? 'border-[#1f2130]' : 'border-slate-100'}`}>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {item.type}
                          {item.size ? ` · ${item.size}` : ''}
                        </span>

                        <div className="flex items-center gap-1 shrink-0">
                          {isImage && (
                            <>
                              {onOpenImageStudio && (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const url = await resolveBestImageUrl(item.previewUrl || '', item.imageMediaKey, item.title);
                                    if (url) onOpenImageStudio(url, item.title);
                                  }}
                                  title={isEn ? 'Edit in Studio' : 'Edit di Studio'}
                                  className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-purple-500 hover:bg-slate-100 dark:hover:bg-[#1e263d] cursor-pointer"
                                >
                                  <Wand2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDownloadImage(item)}
                                title={isEn ? 'Download' : 'Unduh'}
                                className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-[#1e263d] cursor-pointer"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                              {onSendImageToChat && (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const url = await resolveBestImageUrl(item.previewUrl || '', item.imageMediaKey, item.title);
                                    if (url) {
                                      onSendImageToChat(url, item.title, item.model || 'library');
                                      onBackToChat();
                                    }
                                  }}
                                  title={isEn ? 'Send to Chat' : 'Kirim ke Chat'}
                                  className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-emerald-500 hover:bg-slate-100 dark:hover:bg-[#1e263d] cursor-pointer"
                                >
                                  <Send className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </>
                          )}

                          {!isImage && onSelectPrompt && item.snippet && (
                            <button
                              type="button"
                              onClick={() =>
                                onSelectPrompt(`Lanjutkan pembahasan dari arsip pustaka berikut: "${item.title}"\nRingkasan: ${item.snippet}`)
                              }
                              title={isEn ? 'Continue in New Chat' : 'Bahas di Chat Baru'}
                              className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-[#1e263d] cursor-pointer"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                            </button>
                          )}

                          {isChat && (
                            <button
                              type="button"
                              onClick={() => handleExportChatTranscript(item)}
                              title={isEn ? 'Export Markdown' : 'Unduh Transkrip (.md)'}
                              className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-[#1e263d] cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {confirmDeleteId === item.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleDeleteConfirmed(item.id)}
                                className="px-2 py-1 rounded-lg bg-rose-600 text-white text-[10px] font-bold cursor-pointer"
                              >
                                {isEn ? 'Delete' : 'Hapus'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-1.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] cursor-pointer"
                              >
                                {isEn ? 'No' : 'Batal'}
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(item.id)}
                              title={isEn ? 'Delete from Library' : 'Hapus dari Pustaka'}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-[#1e263d] cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Full Archived Conversation Reader Modal */}
        {viewingChat && (
          <div
            onClick={() => setViewingChat(null)}
            className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-2 sm:p-5 animate-in fade-in duration-150"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-4xl h-[90dvh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden ${
                isDark ? 'bg-[#0b1020] border-[#1e293b] text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              {/* Modal Header */}
              <div className={`px-4 sm:px-6 py-3.5 border-b flex flex-wrap items-center justify-between gap-3 shrink-0 ${
                isDark ? 'border-[#1e293b] bg-[#0f162c]' : 'border-slate-200 bg-slate-50'
              }`}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Archive className="w-4 h-4 text-emerald-500 shrink-0" />
                    <h3 className="text-sm sm:text-base font-bold truncate">{viewingChat.title}</h3>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                    {viewingChat.date} · {viewingChat.archivedMessages?.length || 0} {isEn ? 'messages' : 'pesan'} · {viewingChat.model || 'Maria AI'}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {onRestoreArchivedChat && (
                    <button
                      type="button"
                      disabled={restoringId === viewingChat.id}
                      onClick={() => handleRestore(viewingChat)}
                      className="min-h-[36px] px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      {restoringId === viewingChat.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <RotateCcw className="w-3.5 h-3.5" />
                      )}
                      <span>{isEn ? 'Restore to Chat' : 'Pulihkan ke Chat'}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleExportChatTranscript(viewingChat)}
                    title={isEn ? 'Download Transcript' : 'Unduh Transkrip'}
                    className={`min-h-[36px] px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                      isDark ? 'border-[#293552] bg-[#15203b] text-slate-200 hover:bg-[#1c2a4d]' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">.md</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewingChat(null)}
                    aria-label={isEn ? 'Close' : 'Tutup'}
                    className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/10 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Safety Notice Banner */}
              <div className={`px-4 sm:px-6 py-2 border-b text-[11px] flex items-center gap-2 shrink-0 ${
                isDark ? 'bg-emerald-950/30 border-[#1e293b] text-emerald-300' : 'bg-emerald-50 border-emerald-100 text-emerald-800'
              }`}>
                <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-500" />
                <span>
                  {isEn
                    ? 'Permanent Library Snapshot: This conversation stays safe here even if you delete or clear active chats from the Sidebar.'
                    : 'Salinan Arsip Permanen: Isi percakapan ini tetap aman tersimpan di Pustaka Maria meskipun chat di Sidebar dihapus.'}
                </span>
              </div>

              {/* Full Message History Thread */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
                {!viewingChat.archivedMessages || viewingChat.archivedMessages.length === 0 ? (
                  <div className="py-16 text-center text-xs text-slate-500 dark:text-slate-400">
                    {isEn
                      ? 'This archived snapshot has no recorded text messages.'
                      : 'Arsip ini tidak memiliki riwayat pesan teks.'}
                  </div>
                ) : (
                  viewingChat.archivedMessages.map((msg, idx) => {
                    if (msg.role === 'user') {
                      return (
                        <div key={msg.id || idx} className="flex justify-end">
                          <div className="max-w-[85%] sm:max-w-[75%] space-y-2 flex flex-col items-end">
                            {Array.isArray(msg.attachments) && msg.attachments.length > 0 && (
                              <div className="flex flex-wrap gap-2 justify-end">
                                {msg.attachments.map((att, aIdx) =>
                                  att.type === 'image' && (att.previewUrl || att.id) ? (
                                    <ArchivedMsgImage
                                      key={att.id || aIdx}
                                      src={att.previewUrl}
                                      mediaKey={`lib_arch_att_${att.id}`}
                                      alt={att.name}
                                      onOpenLightbox={(url) =>
                                        setLightboxMedia({ url, type: 'image', name: att.name })
                                      }
                                      className="max-h-48 rounded-xl border border-slate-300 dark:border-slate-700 object-cover"
                                    />
                                  ) : (
                                    <span
                                      key={att.id || aIdx}
                                      className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 text-[11px] font-medium"
                                    >
                                      {att.name}
                                    </span>
                                  )
                                )}
                              </div>
                            )}
                            {msg.content?.trim() && (
                              <div className="rounded-2xl rounded-br-md px-4 py-2.5 bg-blue-600 text-white text-sm leading-relaxed whitespace-pre-wrap break-words">
                                {msg.content}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={msg.id || idx} className="space-y-2">
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <MariaLogo size="sm" withOnlineDot={false} />
                          <span className="font-semibold text-slate-800 dark:text-slate-200">Maria AI</span>
                          {msg.model && (
                            <>
                              <span>·</span>
                              <span className="font-mono text-[11px]">{msg.model}</span>
                            </>
                          )}
                        </div>

                        {msg.content?.trim() && (
                          <div className={`text-sm leading-relaxed break-words pl-1 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {autoFormatMarkdown(msg.content)}
                            </ReactMarkdown>
                          </div>
                        )}

                        {msg.imageUri && (
                          <div className="max-w-md pt-1">
                            <ArchivedMsgImage
                              src={msg.imageUri}
                              mediaKey={`lib_arch_img_${msg.id}`}
                              alt="Gambar AI tersimpan"
                              onOpenLightbox={(url) =>
                                setLightboxMedia({ url, type: 'image', name: `${viewingChat.title}.png` })
                              }
                              className="rounded-xl border border-slate-200 dark:border-slate-700 max-h-80 object-contain"
                            />
                          </div>
                        )}

                        {Array.isArray(msg.groundingLinks) && msg.groundingLinks.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {msg.groundingLinks.map((link, lIdx) => (
                              <a
                                key={lIdx}
                                href={link.uri}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] bg-slate-100 dark:bg-[#15203b] text-blue-600 dark:text-blue-300 hover:underline"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span className="truncate max-w-[200px]">{link.title || link.uri}</span>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
);
