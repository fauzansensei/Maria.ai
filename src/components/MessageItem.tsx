import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  User,
  Copy,
  Check,
  Volume2,
  VolumeX,
  Loader2,
  ExternalLink,
  MapPin,
  Globe,
  Brain,
  Download,
  Dna,
  ChevronDown,
  Sparkles,
  Film,
  Play,
  FileText,
  Maximize2,
  Eye,
} from 'lucide-react';
import { Message, MediaAttachment } from '../types/index.ts';
import { MariaLogo } from './MariaLogo.tsx';
import { speechService, SpeechState } from '../lib/speechService.ts';
import { formatBytes } from '../lib/mediaUtils.ts';
import { MediaLightboxModal, LightboxMedia } from './MediaLightboxModal.tsx';

interface MessageItemProps {
  message: Message;
  userPhoto?: string | null;
  userName?: string | null;
  speechSpeed?: string;
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  userPhoto,
  userName,
  speechSpeed = '1x',
}) => {
  const [copied, setCopied] = useState(false);
  const [speechState, setSpeechState] = useState<SpeechState>(() => speechService.getState());
  const [showThought, setShowThought] = useState(false);
  const [lightboxMedia, setLightboxMedia] = useState<LightboxMedia | null>(null);

  const isModel = message.role === 'model';
  const isThisSpeaking = speechState.isSpeaking && speechState.activeMessageId === message.id;
  const isThisLoading = speechState.isLoading && speechState.activeMessageId === message.id;

  useEffect(() => {
    return speechService.subscribe((state) => {
      setSpeechState(state);
    });
  }, []);

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy message:', err);
    }
  };

  const handlePlayTTS = () => {
    speechService.unlockAudio();
    if (isThisSpeaking || isThisLoading) {
      speechService.stopSpeaking();
    } else {
      let personaId = 'wanita';
      let voiceName = 'Aoede';
      try {
        const saved = localStorage.getItem('maria_settings');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.voicePersona) personaId = parsed.voicePersona;
          if (parsed.geminiVoice) voiceName = parsed.geminiVoice;
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
          ? 'bg-[#12131b]/60 border-y border-[#1e202e]/60'
          : 'bg-transparent'
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
            className="w-8 h-8 rounded-xl object-cover ring-2 ring-[#20a66a]/40"
          />
        ) : (
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#20a66a] to-[#059669] text-white flex items-center justify-center font-bold text-xs shadow-md">
            {(userName || 'Basit')[0].toUpperCase()}
          </div>
        )}
      </div>

      {/* Message Content */}
      <div className="flex-1 min-w-0 space-y-2">
        {/* Author & Model Tag */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-white">
              {isModel ? 'Maria AI' : userName || 'Anda'}
            </span>
            {isModel && (
              <span className="text-[10px] px-2 py-0.5 rounded-md font-mono bg-[#20a66a]/15 text-[#34d399] border border-[#20a66a]/30">
                {message.model ? message.model.replace('-preview', '') : 'gemini-3.5-flash'}
              </span>
            )}
            {isThisLoading && (
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/20 text-[#34d399] border border-[#20a66a]/40 animate-pulse">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Menyiapkan suara AI...</span>
              </span>
            )}
            {isThisSpeaking && (
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#20a66a]/20 text-[#34d399] border border-[#20a66a]/40 animate-pulse">
                <Volume2 className="w-3 h-3" />
                <span>Berbicara...</span>
              </span>
            )}
            {message.mode === 'science' && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 font-semibold">
                <Dna className="w-2.5 h-2.5" /> Sains
              </span>
            )}
            {message.mode === 'thinking' && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center gap-1 font-semibold">
                <Brain className="w-2.5 h-2.5" /> High Thinking
              </span>
            )}
          </div>

          {/* Action buttons (copy, voice readout) */}
          <div className="flex items-center gap-1 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleCopyText}
              title="Salin teks"
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-[#1f2130] transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#34d399]" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            {isModel && (
              <button
                onClick={handlePlayTTS}
                disabled={isThisLoading}
                title={isThisSpeaking ? 'Hentikan suara' : 'Dengarkan suara model AI'}
                className={`p-1.5 rounded-lg transition-colors ${
                  isThisSpeaking
                    ? 'text-[#34d399] bg-[#20a66a]/20'
                    : 'text-neutral-400 hover:text-[#34d399] hover:bg-[#1f2130]'
                }`}
              >
                {isThisLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#34d399]" />
                ) : isThisSpeaking ? (
                  <VolumeX className="w-3.5 h-3.5 text-[#34d399] animate-pulse" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Reasoning Process Accordion */}
        {isModel && (message.thinkingProcess || message.mode === 'thinking') && (
          <div className="my-2 rounded-xl border border-[#2b2e40] bg-[#141622] overflow-hidden text-xs">
            <button
              onClick={() => setShowThought((p) => !p)}
              className="w-full flex items-center justify-between px-3 py-2 text-neutral-400 hover:text-white transition-colors"
            >
              <span className="flex items-center gap-2 font-medium text-[11px] text-purple-300">
                <Brain className="w-3.5 h-3.5 text-purple-400" />
                <span>Thought for 2s • Analisis penalaran multi-tahap</span>
              </span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showThought ? 'rotate-180' : ''}`} />
            </button>
            {showThought && (
              <div className="px-3 pb-3 pt-1 text-[11px] text-neutral-300 border-t border-[#222434] leading-relaxed font-mono">
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
                className="rounded-2xl overflow-hidden border border-[#27293d] bg-black shadow-xl max-w-lg group/vid relative"
              >
                <video
                  src={vid.previewUrl}
                  controls
                  playsInline
                  className="w-full max-h-[380px] object-cover bg-black"
                />
                <div className="p-2.5 bg-[#141520] border-t border-[#232536] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <Film className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span className="font-medium text-neutral-200 truncate">{vid.name}</span>
                    <span className="text-[10px] text-neutral-400 shrink-0">({formatBytes(vid.size)})</span>
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
                      className="p-1 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                    <a
                      href={vid.previewUrl}
                      download={vid.name}
                      title="Unduh video"
                      className="p-1 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* User Uploaded Media: Image Gallery */}
        {images.length > 0 && (
          <div className="my-2.5">
            {images.length === 1 ? (
              <div className="rounded-2xl overflow-hidden border border-[#27293d] bg-black shadow-xl max-w-lg group/img relative">
                <img
                  src={images[0].previewUrl}
                  alt={images[0].name}
                  onClick={() =>
                    setLightboxMedia({
                      url: images[0].previewUrl,
                      type: 'image',
                      name: images[0].name,
                      size: images[0].size,
                    })
                  }
                  className="w-full max-h-[400px] object-cover cursor-pointer hover:scale-[1.01] transition-transform duration-200"
                />
                <div className="p-2 bg-[#141520] border-t border-[#232536] flex items-center justify-between text-xs">
                  <span className="text-neutral-300 truncate max-w-[220px] font-medium text-[11px]">
                    {images[0].name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-neutral-400">{formatBytes(images[0].size)}</span>
                    <button
                      onClick={() =>
                        setLightboxMedia({
                          url: images[0].previewUrl,
                          type: 'image',
                          name: images[0].name,
                          size: images[0].size,
                        })
                      }
                      className="p-1 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white"
                      title="Perbesar"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <a
                      href={images[0].previewUrl}
                      download={images[0].name}
                      className="p-1 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white"
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
                    onClick={() =>
                      setLightboxMedia({
                        url: img.previewUrl,
                        type: 'image',
                        name: img.name,
                        size: img.size,
                      })
                    }
                    className="group/item relative aspect-square rounded-xl overflow-hidden border border-[#2b2e42] bg-neutral-900 cursor-pointer shadow-md"
                  >
                    <img
                      src={img.previewUrl}
                      alt={img.name}
                      className="w-full h-full object-cover group-hover/item:scale-105 transition-transform duration-200"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover/item:opacity-100 transition-opacity p-2 flex flex-col justify-end">
                      <span className="text-[10px] text-white font-medium truncate">{img.name}</span>
                      <span className="text-[9px] text-neutral-400">{formatBytes(img.size)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* User Uploaded Documents */}
        {files.length > 0 && (
          <div className="my-2 space-y-1.5">
            {files.map((f) => (
              <div
                key={f.id}
                className="flex items-center gap-3 p-2.5 rounded-xl bg-[#161826] border border-[#26283b] max-w-sm text-xs"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-neutral-200 truncate">{f.name}</div>
                  <div className="text-[10px] text-neutral-400">{formatBytes(f.size)}</div>
                </div>
                <a
                  href={f.previewUrl}
                  download={f.name}
                  className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white"
                  title="Unduh berkas"
                >
                  <Download className="w-3.5 h-3.5" />
                </a>
              </div>
            ))}
          </div>
        )}

        {/* Generated Image Result from AI Studio */}
        {message.imageUri && (
          <div className="my-3 rounded-2xl overflow-hidden border border-[#27293d] bg-black shadow-xl max-w-lg group/img relative">
            <img
              src={message.imageUri}
              alt="Gambar AI yang dihasilkan"
              onClick={() =>
                setLightboxMedia({
                  url: message.imageUri!,
                  type: 'image',
                  name: 'maria-ai-generation.png',
                })
              }
              className="w-full h-auto object-cover max-h-[500px] cursor-pointer"
            />
            <div className="absolute bottom-2 right-2 flex gap-2">
              <button
                onClick={() =>
                  setLightboxMedia({
                    url: message.imageUri!,
                    type: 'image',
                    name: 'maria-ai-generation.png',
                  })
                }
                className="px-2.5 py-1.5 rounded-lg bg-black/80 hover:bg-black text-white text-xs font-medium backdrop-blur-sm flex items-center gap-1 shadow transition-colors"
                title="Perbesar"
              >
                <Eye className="w-3.5 h-3.5" />
              </button>
              <a
                href={message.imageUri}
                download="maria-ai-generation.png"
                className="px-3 py-1.5 rounded-lg bg-black/80 hover:bg-black text-white text-xs font-medium backdrop-blur-sm flex items-center gap-1.5 shadow transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Unduh HD
              </a>
            </div>
          </div>
        )}

        {/* Body Text / Markdown */}
        <div className="prose prose-invert prose-sm max-w-none break-words leading-relaxed text-neutral-200">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({ node, inline, className, children, ...props }: any) {
                const match = /language-(\w+)/.exec(className || '');
                return !inline ? (
                  <div className="my-3 rounded-xl overflow-hidden border border-[#2b2e42] bg-[#0c0d12] text-neutral-100 shadow-lg">
                    <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#141620] border-b border-[#25283a] text-[11px] font-mono text-neutral-400">
                      <span className="text-[#34d399] font-semibold">{match ? match[1] : 'code'}</span>
                      <button
                        onClick={() => navigator.clipboard.writeText(String(children).replace(/\n$/, ''))}
                        className="hover:text-white transition-colors"
                      >
                        Salin Kode
                      </button>
                    </div>
                    <pre className="p-3.5 text-xs font-mono overflow-x-auto m-0 bg-[#0c0d12]">
                      <code className={className} {...props}>
                        {children}
                      </code>
                    </pre>
                  </div>
                ) : (
                  <code
                    className="px-1.5 py-0.5 rounded-md font-mono text-xs bg-[#1f2231] text-[#34d399]"
                    {...props}
                  >
                    {children}
                  </code>
                );
              },
              table({ children }: any) {
                return (
                  <div className="overflow-x-auto my-3 border border-[#2b2e42] rounded-xl">
                    <table className="min-w-full divide-y divide-[#26283a] text-xs">
                      {children}
                    </table>
                  </div>
                );
              },
              th({ children }: any) {
                return (
                  <th className="px-3 py-2 bg-[#151722] text-left font-semibold text-neutral-200">
                    {children}
                  </th>
                );
              },
              td({ children }: any) {
                return (
                  <td className="px-3 py-2 border-t border-[#232536] text-neutral-300">
                    {children}
                  </td>
                );
              },
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>

        {/* Grounding Source Links (Search or Maps) */}
        {message.groundingLinks && message.groundingLinks.length > 0 && (
          <div className="mt-3 pt-3 border-t border-[#202231]">
            <div className="text-[11px] font-medium text-neutral-400 mb-2 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-[#34d399]" /> Sumber Terverifikasi Google:
            </div>
            <div className="flex flex-wrap gap-2">
              {message.groundingLinks.map((link, idx) => (
                <a
                  key={idx}
                  href={link.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-[#161824] text-neutral-300 hover:text-white hover:bg-[#202336] border border-[#2b2e40] transition-colors"
                >
                  {link.uri.includes('google.com/maps') ? (
                    <MapPin className="w-3 h-3 text-rose-400" />
                  ) : (
                    <Globe className="w-3 h-3 text-cyan-400" />
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
