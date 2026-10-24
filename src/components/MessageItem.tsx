import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Copy,
  Check,
  Volume2,
  VolumeX,
  Loader2,
  Brain,
  Globe,
  MapPin,
  ExternalLink,
  Download,
  Dna,
  Sparkles,
  Eye,
  Pencil,
  RotateCcw,
  Image as ImageIcon,
  Play,
  Music,
} from 'lucide-react';
import { Message, MediaAttachment } from '../types/index.ts';
import { LaunchAction, executeLaunch, detectLaunchAction } from '../lib/actionLauncher.ts';
import { MariaLogo } from './MariaLogo.tsx';
import { speechService, SpeechState } from '../lib/speechService.ts';
import { formatBytes, getOriginalMedia, getOriginalMediaBlob } from '../lib/mediaUtils.ts';
import { MediaLightboxModal, LightboxMedia } from './MediaLightboxModal.tsx';

interface MessageItemProps {
  message: Message;
  userPhoto?: string | null;
  userName?: string | null;
  speechSpeed?: string;
  onEditMessage?: (messageId: string, newContent: string, resend: boolean) => void;
  onLoadToInput?: (text: string) => void;
}

import { autoFormatMarkdown } from '../lib/formatUtils.ts';
export { autoFormatMarkdown };

// Subcomponent to resolve and display the 100% full original resolution image
const HighResImage: React.FC<{
  img: MediaAttachment;
  onOpenLightbox: (url: string) => void;
  className?: string;
}> = ({ img, onOpenLightbox, className = '' }) => {
  const [resolvedUrl, setResolvedUrl] = useState<string>(() => {
    return (
      img.originalUrl ||
      getOriginalMedia(img.id) ||
      getOriginalMedia(img.name) ||
      (img.base64Data ? `data:${img.mimeType || 'image/jpeg'};base64,${img.base64Data}` : '') ||
      img.previewUrl ||
      ''
    );
  });
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      const blobUrl = (await getOriginalMediaBlob(img.id)) || (await getOriginalMediaBlob(img.name));
      if (blobUrl && isMounted) {
        setResolvedUrl(blobUrl);
        setLoadError(false);
      } else if (!resolvedUrl && (img.previewUrl || img.base64Data) && isMounted) {
        setResolvedUrl(img.previewUrl || (img.base64Data ? `data:${img.mimeType || 'image/jpeg'};base64,${img.base64Data}` : ''));
        setLoadError(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [img.id, img.name, img.previewUrl, img.base64Data, resolvedUrl]);

  if (loadError || !resolvedUrl) {
    return (
      <div
        onClick={() => {
          const fallback = resolvedUrl || img.previewUrl || (img.base64Data ? `data:${img.mimeType || 'image/jpeg'};base64,${img.base64Data}` : '');
          if (fallback) onOpenLightbox(fallback);
        }}
        className={`${className} flex flex-col items-center justify-center bg-blue-50/50 dark:bg-slate-800 text-slate-500 rounded-xl p-3 border border-blue-200/50 dark:border-slate-700 cursor-pointer`}
      >
        <ImageIcon className="w-6 h-6 mb-1 text-blue-400" />
        <span className="text-[11px] font-medium truncate max-w-full text-slate-700 dark:text-slate-300">
          {img.name || 'Gambar'}
        </span>
        {img.size ? (
          <span className="text-[9px] text-slate-400">{formatBytes(img.size)}</span>
        ) : null}
      </div>
    );
  }

  return (
    <img
      src={resolvedUrl}
      alt={img.name}
      onError={() => {
        if (img.previewUrl && resolvedUrl !== img.previewUrl && img.previewUrl.length > 20) {
          setResolvedUrl(img.previewUrl);
        } else {
          setLoadError(true);
        }
      }}
      onClick={() => onOpenLightbox(resolvedUrl)}
      className={className}
      style={{ imageRendering: 'auto' }}
    />
  );
};

// Subcomponent to render live website favicon for Google Search grounding sources
const SourceFavicon: React.FC<{ uri: string; title?: string }> = ({ uri, title }) => {
  const [loadFailed, setLoadFailed] = useState(false);

  let hostname = '';
  try {
    hostname = new URL(uri).hostname;
  } catch {
    hostname = '';
  }

  if (uri.includes('google.com/maps')) {
    return <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />;
  }

  if (!hostname || loadFailed) {
    return <Globe className="w-3.5 h-3.5 text-blue-500 shrink-0" />;
  }

  // Google Favicon service with 32px resolution
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=32`;

  return (
    <img
      src={faviconUrl}
      alt={title || hostname}
      onError={() => setLoadFailed(true)}
      className="w-3.5 h-3.5 rounded-xs object-contain shrink-0"
      loading="lazy"
    />
  );
};

interface YouTubeInfo {
  videoId?: string;
  searchQuery?: string;
  fullUrl: string;
}

function extractYouTubeInfo(content: string): YouTubeInfo | null {
  if (!content) return null;

  // 1. YouTube watch or embed or youtu.be
  const watchMatch = content.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
  if (watchMatch) {
    return {
      videoId: watchMatch[1],
      fullUrl: `https://www.youtube.com/watch?v=${watchMatch[1]}`,
    };
  }

  // 2. YouTube search results query
  const searchMatch = content.match(/(?:https?:\/\/)?(?:www\.)?youtube\.com\/results\?search_query=([^&\s\)"']+)/i);
  if (searchMatch) {
    const rawQuery = decodeURIComponent(searchMatch[1].replace(/\+/g, ' '));
    return {
      searchQuery: rawQuery,
      fullUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(rawQuery)}`,
    };
  }

  return null;
}

// Official Service Icon matching Video 1 and Video 2
const ServiceIcon: React.FC<{ icon: LaunchAction['icon']; className?: string }> = ({ icon, className = 'w-5 h-5' }) => {
  if (icon === 'discord') {
    return (
      <div className="w-10 h-10 rounded-2xl bg-[#5865F2] flex items-center justify-center text-white shadow-xs shrink-0">
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
        </svg>
      </div>
    );
  }

  if (icon === 'youtube' || icon === 'youtube_music') {
    return (
      <div className="w-10 h-10 rounded-2xl bg-[#FF0000] flex items-center justify-center text-white shadow-xs shrink-0">
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
        </svg>
      </div>
    );
  }

  if (icon === 'spotify') {
    return (
      <div className="w-10 h-10 rounded-2xl bg-[#1DB954] flex items-center justify-center text-white shadow-xs shrink-0">
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
        </svg>
      </div>
    );
  }

  return (
    <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-xs shrink-0">
      <Globe className="w-5 h-5" />
    </div>
  );
};

// Sleek Gemini Action Card (Matches Video 1 & Video 2)
const GeminiActionCard: React.FC<{ action: LaunchAction }> = ({ action }) => {
  const handleOpen = () => {
    executeLaunch(action);
  };

  return (
    <div className="mt-3 p-3 sm:p-3.5 rounded-2xl bg-[#1e2330] border border-slate-700/60 shadow-md flex items-center justify-between gap-3 text-white animate-in fade-in">
      <div className="flex items-center gap-3 min-w-0">
        <ServiceIcon icon={action.icon} />
        <div className="min-w-0">
          <div className="text-xs sm:text-sm font-bold text-white truncate">
            {action.title}
          </div>
          {action.subtitle && (
            <div className="text-[11px] text-slate-400 truncate">
              {action.subtitle}
            </div>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={handleOpen}
        className="px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 text-white font-semibold text-xs tracking-tight border border-white/20 transition-all cursor-pointer shrink-0"
      >
        Open
      </button>
    </div>
  );
};

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  userPhoto,
  userName,
  speechSpeed = '1x',
  onEditMessage,
  onLoadToInput,
}) => {
  const [copied, setCopied] = useState(false);
  const [speechState, setSpeechState] = useState<SpeechState>(() => speechService.getState());
  const [lightboxMedia, setLightboxMedia] = useState<LightboxMedia | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [resendAfterEdit, setResendAfterEdit] = useState(true);

  useEffect(() => {
    setEditContent(message.content);
  }, [message.content]);

  useEffect(() => {
    return speechService.subscribe((state) => {
      setSpeechState(state);
    });
  }, []);

  const isModel = message.role === 'model';
  const isThisSpeaking =
    speechState.isSpeaking && speechState.activeMessageId === message.id;
  const isThisLoading =
    speechState.isLoading && speechState.activeMessageId === message.id;

  const handleCopyText = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePlayTTS = () => {
    speechService.unlockAudio();

    if (isThisSpeaking || isThisLoading) {
      speechService.stopSpeaking();
    } else {
      let voiceName = 'Aoede';
      let personaId = 'wanita';
      try {
        const saved = localStorage.getItem('maria_settings');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.geminiVoice) voiceName = parsed.geminiVoice;
          if (parsed.voicePersona) personaId = parsed.voicePersona;
        }
      } catch {}

      speechService.speak(message.content, {
        messageId: message.id,
        speed: speechSpeed,
        voiceName,
        personaId,
        preloadedAudioUrl: message.audioUri,
      });
    }
  };

  const images = message.attachments?.filter((a) => a.type === 'image') || [];
  const hasGrounding = message.groundingLinks && message.groundingLinks.length > 0;

  // Shared Lightbox Modal
  const lightboxModal = (
    <MediaLightboxModal
      media={lightboxMedia}
      onClose={() => setLightboxMedia(null)}
    />
  );

  // ----------------------------------------------------
  // USER MESSAGE BUBBLE (Right-Aligned with Automatic Markdown Formatting)
  // ----------------------------------------------------
  if (!isModel) {
    return (
      <div className="flex justify-end my-3 sm:my-4 px-3 sm:px-6 select-none">
        {lightboxModal}

        <div className="flex flex-col items-end max-w-[90%] sm:max-w-[78%]">
          {/* User Bubble Card */}
          <div className="rounded-2xl rounded-tr-xs p-3.5 sm:p-4 bg-blue-50 border border-blue-200 shadow-xs">
            {/* Header: User Tag & Quick Actions */}
            <div className="flex items-center justify-between gap-3 mb-1.5 pb-1 border-b border-blue-200/60">
              <div className="flex items-center gap-1.5">
                {userPhoto ? (
                  <img
                    src={userPhoto}
                    alt={userName || 'Pengguna'}
                    className="w-5 h-5 rounded-full object-cover ring-1 ring-blue-500/50"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px]">
                    {(userName || 'A')[0].toUpperCase()}
                  </div>
                )}
                <span className="text-[11px] font-bold text-blue-950">
                  {userName || 'Anda'}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1">
                <button
                  onClick={handleCopyText}
                  title="Salin pesan"
                  className="p-1 rounded-md text-blue-700/80 hover:text-blue-950 hover:bg-blue-100 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>

                {onEditMessage && (
                  <button
                    onClick={() => {
                      setEditContent(message.content);
                      setIsEditing(true);
                    }}
                    title="Edit pesan (perbaiki salah ketik)"
                    className="p-1 rounded-md text-blue-700/80 hover:text-blue-950 hover:bg-blue-100 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}

                {onLoadToInput && (
                  <button
                    onClick={() => onLoadToInput(message.content)}
                    title="Muat kembali ke input pesan"
                    className="p-1 rounded-md text-blue-700/80 hover:text-blue-950 hover:bg-blue-100 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Images if any */}
            {images.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mb-2.5">
                {images.map((img) => (
                  <div
                    key={img.id}
                    role="button"
                    tabIndex={0}
                    onClick={async (e) => {
                      e.stopPropagation();
                      const bestUrl =
                        img.originalUrl ||
                        getOriginalMedia(img.id) ||
                        getOriginalMedia(img.name) ||
                        (await getOriginalMediaBlob(img.id)) ||
                        (await getOriginalMediaBlob(img.name)) ||
                        (img.base64Data ? `data:${img.mimeType || 'image/jpeg'};base64,${img.base64Data}` : '') ||
                        img.previewUrl ||
                        '';
                      if (bestUrl) {
                        setLightboxMedia({
                          url: bestUrl,
                          type: 'image',
                          name: img.name || 'Gambar Lampiran',
                          size: img.size,
                        });
                      }
                    }}
                    className="relative rounded-xl overflow-hidden cursor-pointer group/img border border-blue-200 aspect-video bg-black/5 hover:border-blue-400 active:scale-[0.98] transition-all shadow-2xs"
                  >
                    <HighResImage
                      img={img}
                      onOpenLightbox={(url) =>
                        setLightboxMedia({
                          url,
                          type: 'image',
                          name: img.name || 'Gambar Lampiran',
                          size: img.size,
                        })
                      }
                      className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-200"
                    />
                    <div className="absolute inset-0 pointer-events-none bg-black/30 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-[11px] font-semibold">
                      <Eye className="w-4 h-4" />
                      <span>Lihat Penuh</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* User Message Text with AUTOMATIC FORMATTING (*italic*, **bold**, ~strikethrough~, `code`) */}
            {isEditing ? (
              <div className="space-y-2 pt-1">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={Math.min(6, Math.max(2, editContent.split('\n').length))}
                  className="w-full p-2.5 rounded-xl bg-white border border-blue-400 text-xs text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-blue-600/30"
                  autoFocus
                />
                <div className="flex items-center justify-between gap-2 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-blue-950">
                    <input
                      type="checkbox"
                      checked={resendAfterEdit}
                      onChange={(e) => setResendAfterEdit(e.target.checked)}
                      className="accent-blue-600 rounded"
                    />
                    <span>Kirim ulang ke Maria</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-2.5 py-1 rounded-lg border border-slate-300 text-slate-700 text-[11px]"
                    >
                      Batal
                    </button>
                    <button
                      onClick={() => {
                        const trimmed = editContent.trim();
                        if (trimmed) {
                          onEditMessage?.(message.id, trimmed, resendAfterEdit);
                          setIsEditing(false);
                        }
                      }}
                      className="px-3 py-1 rounded-lg bg-blue-600 text-white font-semibold text-[11px] shadow-xs"
                    >
                      Simpan
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-[#0f172a] font-normal text-[14px] sm:text-[14.5px] leading-relaxed select-text break-words">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    p({ children }: any) {
                      return <div className="mb-1.5 last:mb-0 leading-relaxed">{children}</div>;
                    },
                    pre({ children }: any) {
                      return <>{children}</>;
                    },
                    strong({ children }: any) {
                      return <strong className="font-bold text-[#0f172a]">{children}</strong>;
                    },
                    em({ children }: any) {
                      return <em className="italic">{children}</em>;
                    },
                    del({ children }: any) {
                      return <del className="line-through opacity-75">{children}</del>;
                    },
                    code({ inline, children, ...props }: any) {
                      return (
                        <code
                          className="px-1.5 py-0.5 rounded-md font-mono text-xs bg-blue-100 text-blue-900 border border-blue-200"
                          {...props}
                        >
                          {children}
                        </code>
                      );
                    },
                  }}
                >
                  {autoFormatMarkdown(message.content)}
                </ReactMarkdown>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // MARIA AI MESSAGE CARD (Clean White Canvas, Maria AI by Zan.dev Branding)
  // ----------------------------------------------------
  return (
    <div className="flex justify-start my-3 sm:my-4 px-3 sm:px-6 select-none">
      {lightboxModal}

      <div className="w-full max-w-3xl rounded-2xl p-4 sm:p-5 bg-white border border-slate-200 shadow-xs space-y-3">
        {/* Header Bar: Brand, Model, Grounding Status & Action Toolbar */}
        <div className="flex items-center justify-between gap-2 flex-wrap pb-2.5 border-b border-slate-100">
          {/* Left: Avatar + "Maria AI by Zan.dev" Title + Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <MariaLogo size="sm" withOnlineDot={true} />
            <div className="flex items-center gap-1.5">
              <span className="text-xs sm:text-sm font-bold text-[#0f172a] tracking-tight">
                Maria AI
              </span>
            </div>

            {/* Model Badge */}
            <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-blue-50 text-blue-700 border border-blue-200 font-medium">
              {message.model ? message.model.replace('-preview', '') : 'gemini-3.1-flash-lite'}
            </span>

            {/* Web Search Grounding Status Badge */}
            {hasGrounding && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <Globe className="w-3 h-3 text-emerald-600" />
                <span>Web Search Aktif</span>
              </span>
            )}

            {isThisLoading && (
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-600 border border-blue-200 animate-pulse">
                <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
                <span>Menyiapkan suara...</span>
              </span>
            )}

            {isThisSpeaking && (
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700 border border-blue-300 animate-pulse">
                <Volume2 className="w-3 h-3 text-blue-600" />
                <span>Berbicara...</span>
              </span>
            )}
          </div>

          {/* Right: Actions (Copy, TTS) */}
          <div className="flex items-center gap-1">
            {/* Copy Button */}
            <button
              onClick={handleCopyText}
              title="Salin jawaban lengkap"
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-blue-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>

            {/* TTS Voice Read Aloud Button */}
            <button
              onClick={handlePlayTTS}
              disabled={isThisLoading}
              title={isThisSpeaking ? 'Hentikan suara' : 'Dengarkan suara Maria AI'}
              className={`p-1.5 rounded-lg transition-colors ${
                isThisSpeaking
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {isThisSpeaking ? (
                <VolumeX className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
              ) : isThisLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
              ) : (
                <Volume2 className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* AI Generated Image Output if any */}
        {message.imageUri && (
          <div className="my-3 rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 shadow-xs max-w-lg">
            <img
              src={message.imageUri}
              alt="Hasil generasi gambar"
              onClick={() =>
                setLightboxMedia({
                  url: message.imageUri!,
                  type: 'image',
                  name: 'Maria_AI_Generated.png',
                })
              }
              className="w-full max-h-[500px] object-contain cursor-pointer hover:opacity-95 transition-opacity"
            />
          </div>
        )}

        {/* Main AI Response Body with AUTOMATIC FORMATTING (*italic*, **bold**, ~strikethrough~, `code`, etc.) */}
        <div className="text-[#0f172a] text-[14.5px] leading-relaxed select-text break-words">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1({ children }: any) {
                return (
                  <h1 className="text-lg sm:text-xl font-bold text-[#0f172a] mt-4 mb-2 pb-1 border-b border-slate-200 tracking-tight">
                    {children}
                  </h1>
                );
              },
              h2({ children }: any) {
                return (
                  <h2 className="text-base sm:text-lg font-bold text-[#0f172a] mt-3.5 mb-1.5 tracking-tight flex items-center gap-1.5">
                    <span className="w-1.5 h-4 bg-blue-600 rounded-full inline-block" />
                    <span>{children}</span>
                  </h2>
                );
              },
              h3({ children }: any) {
                return (
                  <h3 className="text-sm sm:text-base font-bold text-blue-900 mt-3 mb-1">
                    {children}
                  </h3>
                );
              },
              p({ children }: any) {
                return <div className="mb-3 last:mb-0 text-[#1e293b] font-normal leading-relaxed">{children}</div>;
              },
              pre({ children }: any) {
                return <>{children}</>;
              },
              strong({ children }: any) {
                return <strong className="font-bold text-[#0f172a]">{children}</strong>;
              },
              em({ children }: any) {
                return <em className="italic">{children}</em>;
              },
              del({ children }: any) {
                return <del className="line-through opacity-75">{children}</del>;
              },
              ul({ children }: any) {
                return <ul className="my-2.5 pl-5 list-disc space-y-1.5 marker:text-blue-600">{children}</ul>;
              },
              ol({ children }: any) {
                return <ol className="my-2.5 pl-5 list-decimal space-y-1.5 marker:font-bold marker:text-blue-600">{children}</ol>;
              },
              li({ children }: any) {
                return <li className="pl-1 text-[#1e293b]">{children}</li>;
              },
              blockquote({ children }: any) {
                return (
                  <blockquote className="my-3 pl-3.5 py-1 border-l-4 border-blue-500 bg-blue-50/70 rounded-r-xl text-slate-800 italic">
                    {children}
                  </blockquote>
                );
              },
              code({ node, inline, className, children, ...props }: any) {
                const match = /language-(\w+)/.exec(className || '');
                return !inline ? (
                  <div className="my-3 rounded-xl overflow-hidden border border-slate-200 bg-[#0a1128] text-slate-100 shadow-sm">
                    <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#070d1e] border-b border-slate-800 text-[11px] font-mono text-slate-400">
                      <span className="text-blue-400 font-semibold">{match ? match[1] : 'code'}</span>
                      <button
                        onClick={() => navigator.clipboard.writeText(String(children).replace(/\n$/, ''))}
                        className="hover:text-white transition-colors flex items-center gap-1 text-[11px]"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Salin Kode</span>
                      </button>
                    </div>
                    <pre className="p-3.5 text-xs font-mono overflow-x-auto m-0 bg-[#060a17]">
                      <code className={className} {...props}>
                        {children}
                      </code>
                    </pre>
                  </div>
                ) : (
                  <code
                    className="px-1.5 py-0.5 rounded-md font-mono text-[12px] bg-blue-50 text-blue-700 border border-blue-200/60"
                    {...props}
                  >
                    {children}
                  </code>
                );
              },
              table({ children }: any) {
                return (
                  <div className="overflow-x-auto my-3 border border-slate-200 rounded-xl shadow-2xs">
                    <table className="min-w-full divide-y divide-slate-200 text-xs">
                      {children}
                    </table>
                  </div>
                );
              },
              th({ children }: any) {
                return (
                  <th className="px-3 py-2 bg-slate-100 text-left font-bold text-slate-900 border-b border-slate-200">
                    {children}
                  </th>
                );
              },
              td({ children }: any) {
                return (
                  <td className="px-3 py-2 border-t border-slate-100 text-slate-700">
                    {children}
                  </td>
                );
              },
              a({ href, children }: any) {
                return (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 underline underline-offset-2 font-medium hover:bg-blue-50/80 px-1 py-0.5 rounded-sm transition-colors group/link"
                  >
                    <SourceFavicon uri={href || ''} />
                    <span>{children}</span>
                    <ExternalLink className="w-3 h-3 text-blue-500 opacity-70 group-hover/link:opacity-100 shrink-0" />
                  </a>
                );
              },
            }}
          >
            {autoFormatMarkdown(message.content)}
          </ReactMarkdown>
        </div>

        {/* Gemini-Style Action Card (Matches Video 1 & Video 2) */}
        {(() => {
          if (message.launchAction) {
            return <GeminiActionCard action={message.launchAction} />;
          }

          const detected = detectLaunchAction(message.content);
          if (detected) {
            return <GeminiActionCard action={detected} />;
          }

          const ytInfo = extractYouTubeInfo(message.content);
          if (ytInfo) {
            const action: LaunchAction = {
              type: 'youtube_music',
              title: ytInfo.searchQuery ? `Putar: ${ytInfo.searchQuery}` : 'YouTube',
              subtitle: 'YouTube Music',
              url: ytInfo.fullUrl,
              statusText: 'Connecting to YouTube Music',
              icon: 'youtube_music',
            };
            return <GeminiActionCard action={action} />;
          }

          return null;
        })()}

        {/* Verified Google Search Grounding Sources */}
        {hasGrounding && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <div className="text-[11px] font-bold text-slate-700 mb-2 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-emerald-600" />
              <span>Sumber Pencarian Web Terverifikasi Google:</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {message.groundingLinks!.map((link, idx) => (
                <a
                  key={idx}
                  href={link.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-2 p-2 rounded-xl text-xs bg-slate-50 hover:bg-blue-50/60 border border-slate-200 hover:border-blue-300 transition-all shadow-2xs group/link"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <SourceFavicon uri={link.uri} title={link.title} />
                    <span className="truncate text-slate-800 group-hover/link:text-blue-600 font-medium">
                      {link.title || link.uri}
                    </span>
                  </div>
                  <ExternalLink className="w-3 h-3 text-slate-400 group-hover/link:text-blue-600 shrink-0" />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
