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

  return (
    <div
      className={`group flex gap-3.5 sm:gap-4 py-4 px-3 sm:px-6 transition-colors ${
        isModel
          ? 'bg-white dark:bg-[#0c1222]/80 border-y border-slate-200/80 dark:border-[#1e293b]/70 shadow-xs'
          : 'bg-slate-50/70 dark:bg-transparent'
      }`}
    >
      {/* Lightbox for zooming images or videos */}
      <MediaLightboxModal
        media={lightboxMedia}
        onClose={() => setLightboxMedia(null)}
      />

      {/* Avatar */}
      <div className="shrink-0 pt-0.5">
        {isModel ? (
          <MariaLogo size="sm" glow={true} />
        ) : userPhoto ? (
          <img
            src={userPhoto}
            alt={userName || 'Pengguna'}
            className="w-8 h-8 rounded-xl object-cover ring-2 ring-blue-500/40"
          />
        ) : (
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-700 to-blue-900 text-white flex items-center justify-center font-bold text-xs shadow-md shadow-blue-900/30 ring-2 ring-blue-500/30">
            {(userName || 'B')[0].toUpperCase()}
          </div>
        )}
      </div>

      {/* Message Content */}
      <div className="flex-1 min-w-0 space-y-2">
        {/* Author & Model Tag */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              {isModel ? 'Maria AI' : userName || 'Anda'}
            </span>
            {isModel && (
              <span className="text-[10px] px-2 py-0.5 rounded-md font-mono bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/80">
                {message.model ? message.model.replace('-preview', '') : 'gemini-3.8-flash'}
              </span>
            )}
            {isThisLoading && (
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 animate-pulse">
                <Loader2 className="w-3 h-3 animate-spin text-blue-600 dark:text-blue-400" />
                <span>Menyiapkan suara AI...</span>
              </span>
            )}
            {isThisSpeaking && (
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700 animate-pulse">
                <Volume2 className="w-3 h-3 text-blue-600" />
                <span>Berbicara...</span>
              </span>
            )}
            {message.mode === 'science' && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1 font-semibold">
                <Dna className="w-2.5 h-2.5 text-blue-600" /> Sains
              </span>
            )}
            {message.mode === 'thinking' && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1 font-semibold">
                <Brain className="w-2.5 h-2.5 text-indigo-600" /> High Thinking
              </span>
            )}
          </div>

          {/* Action buttons (copy, edit, voice readout) */}
          <div className="flex items-center gap-1 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleCopyText}
              title="Salin teks"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1e293b] transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-blue-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>

            {!isModel && onEditMessage && (
              <button
                onClick={() => {
                  setEditContent(message.content);
                  setIsEditing(true);
                }}
                title="Edit teks (perbaiki typo/salah ketik)"
                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-[#1e293b] transition-colors flex items-center gap-1 text-[11px]"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Edit</span>
              </button>
            )}

            {!isModel && onLoadToInput && (
              <button
                onClick={() => onLoadToInput(message.content)}
                title="Muat teks ke input bawah"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1e293b] transition-colors flex items-center gap-1 text-[11px]"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}

            {isModel && (
              <button
                onClick={handlePlayTTS}
                disabled={isThisLoading}
                title={isThisSpeaking ? 'Hentikan suara' : 'Dengarkan suara model AI'}
                className={`p-1.5 rounded-lg transition-colors ${
                  isThisSpeaking
                    ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/30'
                    : 'text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-[#1e293b]'
                }`}
              >
                {isThisLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                ) : isThisSpeaking ? (
                  <VolumeX className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Reasoning Process Accordion */}
        {isModel && (message.thinkingProcess || message.mode === 'thinking') && (
          <div className="my-2 rounded-xl border border-slate-200 dark:border-[#1e293b] bg-slate-50 dark:bg-[#0a1128] overflow-hidden text-xs">
            <button
              onClick={() => setShowThought((p) => !p)}
              className="w-full flex items-center justify-between px-3 py-2 text-slate-600 dark:text-slate-300 hover:text-blue-600 transition-colors"
            >
              <span className="flex items-center gap-2 font-medium text-[11px] text-blue-600 dark:text-blue-400">
                <Brain className="w-3.5 h-3.5" />
                <span>Thought process • Analisis penalaran multi-tahap</span>
              </span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showThought ? 'rotate-180' : ''}`} />
            </button>
            {showThought && (
              <div className="px-3 pb-3 pt-1 text-[11px] text-slate-700 dark:text-slate-300 border-t border-slate-200 dark:border-[#1e293b] leading-relaxed font-mono">
                {message.thinkingProcess ||
                  '1. Memahami maksud inti permintaan pengguna.\n2. Mengaitkan basis pengetahuan visual dan konteks histori percakapan.\n3. Menyusun formulasi jawaban sistematis, jelas, dan akurat.'}
              </div>
            )}
          </div>
        )}

        {/* User Uploaded Media: Video Cards */}
        {videos.length > 0 && (
          <div className="my-2.5 space-y-2">
            {videos.map((vid) => (
              <div
                key={vid.id}
                className="rounded-2xl overflow-hidden border border-slate-200 dark:border-[#1e293b] bg-black shadow-xl max-w-lg group/vid relative"
              >
                <video
                  src={vid.previewUrl}
                  controls
                  playsInline
                  className="w-full max-h-[380px] object-cover bg-black"
                />
                <div className="p-2.5 bg-slate-50 dark:bg-[#0f172a] border-t border-slate-200 dark:border-[#1e293b] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <Film className="w-4 h-4 text-indigo-500 shrink-0" />
                    <span className="font-medium text-slate-800 dark:text-slate-200 truncate">{vid.name}</span>
                    <span className="text-[10px] text-slate-400 shrink-0">({formatBytes(vid.size)})</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() =>
                        setLightboxMedia({
                          url: vid.previewUrl,
                          type: 'video',
                          name: vid.name,
                          size: vid.size,
                        })
                      }
                      title="Perbesar video"
                      className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                    <a
                      href={vid.previewUrl}
                      download={vid.name}
                      title="Unduh video"
                      className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* User Uploaded Media: Image Gallery with 100% Original Resolution via HighResImage */}
        {images.length > 0 && (
          <div className="my-2.5">
            {images.length === 1 ? (
              <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-[#1e293b] bg-white dark:bg-[#0a1128] shadow-md max-w-2xl group/img relative">
                <HighResImage
                  img={images[0]}
                  onOpenLightbox={(url) =>
                    setLightboxMedia({
                      url,
                      type: 'image',
                      name: images[0].name,
                      size: images[0].size,
                    })
                  }
                  className="w-full max-h-[560px] object-contain cursor-pointer hover:opacity-95 transition-opacity bg-slate-50 dark:bg-black/30"
                />
                <div className="p-2.5 bg-slate-50 dark:bg-[#0f172a] border-t border-slate-200 dark:border-[#1e293b] flex items-center justify-between text-xs">
                  <span className="text-slate-800 dark:text-slate-200 truncate max-w-[220px] font-medium text-[11px]">
                    {images[0].name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                      {formatBytes(images[0].size)}
                    </span>
                    <button
                      onClick={() => {
                        const fallbackUrl =
                          images[0].originalUrl ||
                          getOriginalMedia(images[0].id) ||
                          getOriginalMedia(images[0].name) ||
                          images[0].previewUrl;
                        setLightboxMedia({
                          url: fallbackUrl,
                          type: 'image',
                          name: images[0].name,
                          size: images[0].size,
                        });
                      }}
                      className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-blue-600 transition-colors"
                      title="Perbesar"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <a
                      href={images[0].originalUrl || images[0].previewUrl}
                      download={images[0].name}
                      className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-blue-600 transition-colors"
                      title="Unduh"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-w-xl">
                {images.map((img) => (
                  <div
                    key={img.id}
                    className="relative group/grid rounded-xl overflow-hidden border border-slate-200 dark:border-[#1e293b] bg-white dark:bg-[#0a1128] aspect-square cursor-pointer shadow-xs"
                    onClick={() => {
                      const url =
                        img.originalUrl ||
                        getOriginalMedia(img.id) ||
                        getOriginalMedia(img.name) ||
                        img.previewUrl;
                      setLightboxMedia({
                        url,
                        type: 'image',
                        name: img.name,
                        size: img.size,
                      });
                    }}
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
                      className="w-full h-full object-cover group-hover/grid:scale-105 transition-transform duration-200"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover/grid:opacity-100 flex items-end justify-between p-2 text-white text-[10px] transition-opacity">
                      <span className="truncate">{img.name}</span>
                      <Maximize2 className="w-3 h-3 shrink-0" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* User Uploaded Media: Documents */}
        {files.length > 0 && (
          <div className="my-2 space-y-1.5 max-w-md">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-[#1e293b] bg-white dark:bg-[#0f172a] shadow-xs text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">{file.name}</div>
                    <div className="text-[10px] text-slate-400">{formatBytes(file.size)}</div>
                  </div>
                </div>
                <a
                  href={file.originalUrl || file.previewUrl}
                  download={file.name}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-blue-600 transition-colors shrink-0"
                  title="Unduh dokumen"
                >
                  <Download className="w-4 h-4" />
                </a>
              </div>
            ))}
          </div>
        )}

        {/* AI Generated Image Output */}
        {message.imageUri && (
          <div className="my-3 rounded-2xl overflow-hidden border border-slate-200 dark:border-[#1e293b] bg-white dark:bg-[#0a1128] shadow-md max-w-lg group/aiimg relative">
            <img
              src={message.imageUri}
              alt="Gambar hasil generasi Maria AI"
              onClick={() =>
                setLightboxMedia({
                  url: message.imageUri!,
                  type: 'image',
                  name: 'Maria_AI_Generated.png',
                })
              }
              className="w-full max-h-[500px] object-contain cursor-pointer hover:opacity-95 transition-opacity"
            />
            <div className="p-2.5 bg-slate-50 dark:bg-[#0f172a] border-t border-slate-200 dark:border-[#1e293b] flex items-center justify-between text-xs">
              <span className="text-slate-800 dark:text-slate-200 font-medium text-[11px] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                Maria AI Studio Gambar
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() =>
                    setLightboxMedia({
                      url: message.imageUri!,
                      type: 'image',
                      name: 'Maria_AI_Generated.png',
                    })
                  }
                  title="Perbesar"
                  className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-blue-600"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
                <a
                  href={message.imageUri}
                  download="Maria_AI_Generated.png"
                  title="Unduh gambar"
                  className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-blue-600"
                >
                  <Download className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Main Text Content / Editing Box */}
        {isEditing ? (
          <div className="my-2 space-y-2.5 p-3.5 rounded-2xl bg-white dark:bg-[#0f172a] border border-blue-500/50 shadow-xl ring-1 ring-blue-500/20 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between text-xs text-blue-600 dark:text-blue-400 font-semibold">
              <span className="flex items-center gap-1.5">
                <Pencil className="w-3.5 h-3.5" /> Edit Pesan (Perbaiki Typo / Salah Ketik)
              </span>
              <span className="text-[10px] text-slate-400 font-normal">
                Shift + Enter untuk baris baru
              </span>
            </div>

            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  const trimmed = editContent.trim();
                  if (trimmed) {
                    onEditMessage?.(message.id, trimmed, resendAfterEdit);
                    setIsEditing(false);
                  }
                } else if (e.key === 'Escape') {
                  setEditContent(message.content);
                  setIsEditing(false);
                }
              }}
              rows={Math.min(8, Math.max(2, editContent.split('\n').length))}
              className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#070d1e] border border-slate-200 dark:border-[#1e293b] text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/30 font-sans leading-relaxed resize-y"
              placeholder="Tulis pesan yang sudah diperbaiki..."
              autoFocus
            />

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={resendAfterEdit}
                  onChange={(e) => setResendAfterEdit(e.target.checked)}
                  className="w-4 h-4 accent-blue-600 rounded"
                />
                <span>Kirim ulang ke Maria AI untuk jawaban baru</span>
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditContent(message.content);
                    setIsEditing(false);
                  }}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-[#2e3b55] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium transition-colors"
                >
                  Batal
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const trimmed = editContent.trim();
                    if (!trimmed) return;
                    onEditMessage?.(message.id, trimmed, resendAfterEdit);
                    setIsEditing(false);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold shadow-md shadow-blue-900/20 transition-colors flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{resendAfterEdit ? 'Simpan & Kirim Ulang' : 'Simpan Saja'}</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="prose prose-slate dark:prose-invert prose-sm max-w-none break-words leading-relaxed text-slate-800 dark:text-slate-200">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ node, inline, className, children, ...props }: any) {
                  const match = /language-(\w+)/.exec(className || '');
                  return !inline ? (
                    <div className="my-3 rounded-xl overflow-hidden border border-slate-200 dark:border-[#1e293b] bg-slate-900 text-slate-100 shadow-md">
                      <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#0a1128] border-b border-slate-800 text-[11px] font-mono text-slate-400">
                        <span className="text-blue-400 font-semibold">{match ? match[1] : 'code'}</span>
                        <button
                          onClick={() => navigator.clipboard.writeText(String(children).replace(/\n$/, ''))}
                          className="hover:text-white transition-colors"
                        >
                          Salin Kode
                        </button>
                      </div>
                      <pre className="p-3.5 text-xs font-mono overflow-x-auto m-0 bg-slate-950">
                        <code className={className} {...props}>
                          {children}
                        </code>
                      </pre>
                    </div>
                  ) : (
                    <code
                      className="px-1.5 py-0.5 rounded-md font-mono text-xs bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/40"
                      {...props}
                    >
                      {children}
                    </code>
                  );
                },
                table({ children }: any) {
                  return (
                    <div className="overflow-x-auto my-3 border border-slate-200 dark:border-[#1e293b] rounded-xl">
                      <table className="min-w-full divide-y divide-slate-200 dark:divide-[#1e293b] text-xs">
                        {children}
                      </table>
                    </div>
                  );
                },
                th({ children }: any) {
                  return (
                    <th className="px-3 py-2 bg-slate-100 dark:bg-[#0f172a] text-left font-semibold text-slate-800 dark:text-slate-200">
                      {children}
                    </th>
                  );
                },
                td({ children }: any) {
                  return (
                    <td className="px-3 py-2 border-t border-slate-200 dark:border-[#1e293b] text-slate-700 dark:text-slate-300">
                      {children}
                    </td>
                  );
                },
              }}
            >
              {message.content}
            </ReactMarkdown>

            {message.editedAt && (
              <span className="text-[10px] text-slate-400 italic inline-block mt-1">
                (diedit)
              </span>
            )}
          </div>
        )}

        {/* Grounding Source Links (Search or Maps) */}
        {message.groundingLinks && message.groundingLinks.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-200 dark:border-[#1e293b]">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-blue-600" /> Sumber Terverifikasi Google:
            </div>
            <div className="flex flex-wrap gap-2">
              {message.groundingLinks.map((link, idx) => (
                <a
                  key={idx}
                  href={link.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-white dark:bg-[#0f172a] text-slate-700 dark:text-slate-300 hover:text-blue-600 hover:border-blue-400 border border-slate-200 dark:border-[#1e293b] transition-colors shadow-xs"
                >
                  {link.uri.includes('google.com/maps') ? (
                    <MapPin className="w-3 h-3 text-rose-500" />
                  ) : (
                    <Globe className="w-3 h-3 text-blue-500" />
                  )}
                  <span className="truncate max-w-[200px]">{link.title || link.uri}</span>
                  <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
