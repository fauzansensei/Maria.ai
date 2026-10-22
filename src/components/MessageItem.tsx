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
} from 'lucide-react';
import { Message, MediaAttachment } from '../types/index.ts';
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
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [img.id, img.name]);

  if (loadError || !resolvedUrl) {
    return (
      <div
        onClick={() => resolvedUrl && onOpenLightbox(resolvedUrl)}
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
        if (img.previewUrl && resolvedUrl !== img.previewUrl && img.previewUrl.length > 50) {
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
                    className="relative rounded-xl overflow-hidden cursor-pointer group/img border border-blue-200 aspect-video bg-black/5"
                  >
                    <HighResImage
                      img={img}
                      onOpenLightbox={(url) =>
                        setLightboxMedia({
                          url,
                          type: 'image',
                          name: img.name,
                          size: img.size,
                        })
                      }
                      className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-200"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-[11px] font-semibold">
                      <Eye className="w-4 h-4" />
                      <span>Zoom Asli</span>
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
            }}
          >
            {autoFormatMarkdown(message.content)}
          </ReactMarkdown>
        </div>

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
