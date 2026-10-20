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
  ChevronDown,
  Sparkles,
  Film,
  Play,
  FileText,
  Maximize2,
  Eye,
  Pencil,
  X,
  RotateCcw,
  Type,
  AlignLeft,
  CheckCheck,
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
      img.previewUrl
    );
  });

  useEffect(() => {
    let isMounted = true;
    (async () => {
      const blobUrl = (await getOriginalMediaBlob(img.id)) || (await getOriginalMediaBlob(img.name));
      if (blobUrl && isMounted) {
        setResolvedUrl(blobUrl);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [img.id, img.name]);

  return (
    <img
      src={resolvedUrl}
      alt={img.name}
      onClick={() => onOpenLightbox(resolvedUrl)}
      className={className}
      style={{ imageRendering: 'auto' }}
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
  const [showThought, setShowThought] = useState(false);
  const [lightboxMedia, setLightboxMedia] = useState<LightboxMedia | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [resendAfterEdit, setResendAfterEdit] = useState(true);

  // Text formatting preferences (customizable per message or globally)
  const [showFormatMenu, setShowFormatMenu] = useState(false);
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg'>(() => {
    return (localStorage.getItem('maria_font_size') as any) || 'base';
  });
  const [lineHeight, setLineHeight] = useState<'tight' | 'normal' | 'relaxed'>(() => {
    return (localStorage.getItem('maria_line_height') as any) || 'relaxed';
  });
  const [viewMode, setViewMode] = useState<'markdown' | 'raw'>('markdown');

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
  const videos = message.attachments?.filter((a) => a.type === 'video') || [];
  const files = message.attachments?.filter((a) => a.type === 'file') || [];

  // Font size classes
  const fontSizeClass =
    fontSize === 'sm' ? 'text-[13px]' : fontSize === 'lg' ? 'text-[16px]' : 'text-[14.5px]';

  // Line height classes
  const lineHeightClass =
    lineHeight === 'tight' ? 'leading-snug' : lineHeight === 'relaxed' ? 'leading-relaxed' : 'leading-normal';

  // LIGHTBOX MODAL SHARED
  const lightboxModal = (
    <MediaLightboxModal
      media={lightboxMedia}
      onClose={() => setLightboxMedia(null)}
    />
  );

  // ----------------------------------------------------
  // USER MESSAGE BUBBLE (Right-Aligned, High Contrast, Pristine)
  // ----------------------------------------------------
  if (!isModel) {
    return (
      <div className="flex justify-end my-3 sm:my-4 px-3 sm:px-6 select-none">
        {lightboxModal}

        <div className="flex flex-col items-end max-w-[90%] sm:max-w-[78%]">
          {/* User Bubble Card */}
          <div className="rounded-2xl rounded-tr-xs p-3.5 sm:p-4 bg-blue-50 dark:bg-[#13203c] border border-blue-200/90 dark:border-blue-800/80 shadow-xs">
            {/* Header: User Name + Action Buttons */}
            <div className="flex items-center justify-between gap-3 mb-1.5 pb-1 border-b border-blue-200/50 dark:border-blue-800/40">
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
                <span className="text-[11px] font-bold text-blue-900 dark:text-blue-200">
                  {userName || 'Anda'}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1">
                <button
                  onClick={handleCopyText}
                  title="Salin pesan"
                  className="p-1 rounded-md text-blue-600/70 dark:text-blue-400/80 hover:text-blue-900 dark:hover:text-white hover:bg-blue-100/60 dark:hover:bg-blue-900/40 transition-colors"
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
                    className="p-1 rounded-md text-blue-600/70 dark:text-blue-400/80 hover:text-blue-900 dark:hover:text-white hover:bg-blue-100/60 dark:hover:bg-blue-900/40 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}

                {onLoadToInput && (
                  <button
                    onClick={() => onLoadToInput(message.content)}
                    title="Muat kembali ke input pesan"
                    className="p-1 rounded-md text-blue-600/70 dark:text-blue-400/80 hover:text-blue-900 dark:hover:text-white hover:bg-blue-100/60 dark:hover:bg-blue-900/40 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Attachments if any */}
            {images.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mb-2.5">
                {images.map((img) => (
                  <div
                    key={img.id}
                    onClick={() =>
                      setLightboxMedia({
                        url: img.originalUrl || img.previewUrl,
                        type: 'image',
                        name: img.name,
                        size: img.size,
                      })
                    }
                    className="relative rounded-xl overflow-hidden cursor-pointer group/img border border-blue-200 dark:border-blue-900/60 aspect-video bg-black/10"
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

            {/* User Message Text: 100% Legible Deep Slate/Navy text, NEVER invisible */}
            {isEditing ? (
              <div className="space-y-2 pt-1">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={Math.min(6, Math.max(2, editContent.split('\n').length))}
                  className="w-full p-2.5 rounded-xl bg-white dark:bg-[#0c1222] border border-blue-400 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600/30"
                  autoFocus
                />
                <div className="flex items-center justify-between gap-2 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-blue-950 dark:text-blue-200">
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
                      className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[11px]"
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
              <p className="text-[#0f172a] dark:text-[#f8fafc] font-normal text-[14px] sm:text-[14.5px] leading-relaxed break-words whitespace-pre-wrap select-text">
                {message.content}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // MARIA AI MESSAGE CARD (Left-Aligned, Structured, Polished)
  // ----------------------------------------------------
  const hasGrounding = message.groundingLinks && message.groundingLinks.length > 0;

  return (
    <div className="flex justify-start my-3 sm:my-4 px-3 sm:px-6 select-none">
      {lightboxModal}

      <div className="w-full max-w-3xl rounded-2xl p-4 sm:p-5 bg-white dark:bg-[#0c1222] border border-slate-200/90 dark:border-[#1e293b] shadow-xs space-y-3 transition-colors">
        {/* Header Bar: Brand, Model, Grounding Status & Action Toolbar */}
        <div className="flex items-center justify-between gap-2 flex-wrap pb-2.5 border-b border-slate-100 dark:border-[#1a233a]">
          {/* Left: Avatar + Title + Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <MariaLogo size="sm" withOnlineDot={true} />
            <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white tracking-tight">
              Maria AI
            </span>

            {/* Model Badge */}
            <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/80 font-medium">
              {message.model ? message.model.replace('-preview', '') : 'gemini-3.1-flash-lite'}
            </span>

            {/* Always-on Web Search Grounding Status Badge */}
            {hasGrounding ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <Globe className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                <span>Web Search Aktif</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/40 text-[10px] font-medium">
                <Globe className="w-2.5 h-2.5" />
                <span>Pencarian Otomatis</span>
              </span>
            )}

            {isThisLoading && (
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 animate-pulse">
                <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
                <span>Menyiapkan suara...</span>
              </span>
            )}

            {isThisSpeaking && (
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700 animate-pulse">
                <Volume2 className="w-3 h-3 text-blue-600" />
                <span>Berbicara...</span>
              </span>
            )}
          </div>

          {/* Right: Actions (Copy, TTS, Format Teks Toggle) */}
          <div className="flex items-center gap-1.5 relative">
            {/* Format Text Button (Popout for font size & spacing) */}
            <div className="relative">
              <button
                onClick={() => setShowFormatMenu((prev) => !prev)}
                title="Format Tampilan Teks (Ukuran font, spasi, mode baca)"
                className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1a233a] transition-colors flex items-center gap-1 text-[11px] font-medium"
              >
                <Type className="w-3.5 h-3.5 text-blue-600" />
                <span className="hidden sm:inline">Format</span>
              </button>

              {/* Format Settings Dropdown */}
              {showFormatMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-[#1e293b] rounded-2xl shadow-2xl p-3 z-50 text-xs animate-in fade-in zoom-in-95 select-none space-y-3">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Type className="w-3.5 h-3.5 text-blue-600" /> Format Tampilan Teks
                    </span>
                    <button
                      onClick={() => setShowFormatMenu(false)}
                      className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Font Size */}
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                      Ukuran Huruf
                    </label>
                    <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-[#070d1e] p-1 rounded-xl">
                      {(['sm', 'base', 'lg'] as const).map((s) => (
                        <button
                          key={s}
                          onClick={() => {
                            setFontSize(s);
                            localStorage.setItem('maria_font_size', s);
                          }}
                          className={`py-1 rounded-lg text-[11px] font-semibold transition-all ${
                            fontSize === s
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          {s === 'sm' ? 'Kecil' : s === 'base' ? 'Normal' : 'Besar'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Line Spacing */}
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                      Kerapatan Baris
                    </label>
                    <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-[#070d1e] p-1 rounded-xl">
                      {(['tight', 'normal', 'relaxed'] as const).map((lh) => (
                        <button
                          key={lh}
                          onClick={() => {
                            setLineHeight(lh);
                            localStorage.setItem('maria_line_height', lh);
                          }}
                          className={`py-1 rounded-lg text-[11px] font-semibold transition-all ${
                            lineHeight === lh
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          {lh === 'tight' ? 'Padat' : lh === 'normal' ? 'Normal' : 'Leluasa'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* View Mode (Markdown or Raw) */}
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                      Mode Render
                    </label>
                    <div className="grid grid-cols-2 gap-1 bg-slate-100 dark:bg-[#070d1e] p-1 rounded-xl">
                      <button
                        onClick={() => setViewMode('markdown')}
                        className={`py-1 rounded-lg text-[11px] font-semibold transition-all ${
                          viewMode === 'markdown'
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                      >
                        Markdown Rapi
                      </button>
                      <button
                        onClick={() => setViewMode('raw')}
                        className={`py-1 rounded-lg text-[11px] font-semibold transition-all ${
                          viewMode === 'raw'
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                      >
                        Teks Mentah
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Copy Button */}
            <button
              onClick={handleCopyText}
              title="Salin jawaban lengkap"
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1a233a] transition-colors"
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
                  ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/30'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1a233a]'
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
          <div className="my-3 rounded-2xl overflow-hidden border border-slate-200 dark:border-[#1e293b] bg-slate-50 dark:bg-[#070d1e] shadow-xs max-w-lg">
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

        {/* Main AI Response Body (Formatted Markdown or Raw) */}
        <div className={`text-[#0f172a] dark:text-[#f1f5f9] ${fontSizeClass} ${lineHeightClass} select-text break-words`}>
          {viewMode === 'raw' ? (
            <pre className="font-mono text-xs p-3.5 bg-slate-50 dark:bg-[#070d1e] rounded-xl border border-slate-200 dark:border-slate-800 whitespace-pre-wrap overflow-x-auto">
              {message.content}
            </pre>
          ) : (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1({ children }: any) {
                  return (
                    <h1 className="text-lg sm:text-xl font-bold text-[#0f172a] dark:text-white mt-4 mb-2 pb-1 border-b border-slate-200 dark:border-slate-800 tracking-tight">
                      {children}
                    </h1>
                  );
                },
                h2({ children }: any) {
                  return (
                    <h2 className="text-base sm:text-lg font-bold text-[#0f172a] dark:text-white mt-3.5 mb-1.5 tracking-tight flex items-center gap-1.5">
                      <span className="w-1.5 h-4 bg-blue-600 rounded-full inline-block" />
                      <span>{children}</span>
                    </h2>
                  );
                },
                h3({ children }: any) {
                  return (
                    <h3 className="text-sm sm:text-base font-bold text-blue-900 dark:text-blue-300 mt-3 mb-1">
                      {children}
                    </h3>
                  );
                },
                p({ children }: any) {
                  return <p className="mb-3 last:mb-0 text-[#1e293b] dark:text-[#e2e8f0] font-normal leading-relaxed">{children}</p>;
                },
                strong({ children }: any) {
                  return <strong className="font-bold text-[#0f172a] dark:text-white">{children}</strong>;
                },
                ul({ children }: any) {
                  return <ul className="my-2.5 pl-5 list-disc space-y-1.5 marker:text-blue-600">{children}</ul>;
                },
                ol({ children }: any) {
                  return <ol className="my-2.5 pl-5 list-decimal space-y-1.5 marker:font-bold marker:text-blue-600">{children}</ol>;
                },
                li({ children }: any) {
                  return <li className="pl-1 text-[#1e293b] dark:text-[#e2e8f0]">{children}</li>;
                },
                blockquote({ children }: any) {
                  return (
                    <blockquote className="my-3 pl-3.5 py-1 border-l-4 border-blue-500 bg-blue-50/70 dark:bg-blue-950/30 rounded-r-xl text-slate-800 dark:text-slate-200 italic">
                      {children}
                    </blockquote>
                  );
                },
                code({ node, inline, className, children, ...props }: any) {
                  const match = /language-(\w+)/.exec(className || '');
                  return !inline ? (
                    <div className="my-3 rounded-xl overflow-hidden border border-slate-200 dark:border-[#1e293b] bg-[#0a1128] text-slate-100 shadow-sm">
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
                      className="px-1.5 py-0.5 rounded-md font-mono text-[12px] bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/40"
                      {...props}
                    >
                      {children}
                    </code>
                  );
                },
                table({ children }: any) {
                  return (
                    <div className="overflow-x-auto my-3 border border-slate-200 dark:border-[#1e293b] rounded-xl shadow-2xs">
                      <table className="min-w-full divide-y divide-slate-200 dark:divide-[#1e293b] text-xs">
                        {children}
                      </table>
                    </div>
                  );
                },
                th({ children }: any) {
                  return (
                    <th className="px-3 py-2 bg-slate-100 dark:bg-[#0f172a] text-left font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800">
                      {children}
                    </th>
                  );
                },
                td({ children }: any) {
                  return (
                    <td className="px-3 py-2 border-t border-slate-100 dark:border-[#1e293b] text-slate-700 dark:text-slate-300">
                      {children}
                    </td>
                  );
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
          )}
        </div>

        {/* Verified Google Search Grounding Sources */}
        {hasGrounding && (
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-[#1a233a]">
            <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Sumber Pencarian Web Terverifikasi Google:</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {message.groundingLinks!.map((link, idx) => (
                <a
                  key={idx}
                  href={link.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-2 p-2 rounded-xl text-xs bg-slate-50 dark:bg-[#070d1e] hover:bg-blue-50/60 dark:hover:bg-blue-950/40 border border-slate-200/90 dark:border-[#1e293b] hover:border-blue-300 transition-all shadow-2xs group/link"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {link.uri.includes('google.com/maps') ? (
                      <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    ) : (
                      <Globe className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    )}
                    <span className="truncate text-slate-800 dark:text-slate-200 group-hover/link:text-blue-600 font-medium">
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
