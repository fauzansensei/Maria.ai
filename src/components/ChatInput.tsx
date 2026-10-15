import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send,
  Plus,
  Mic,
  MicOff,
  Image as ImageIcon,
  Film,
  FileText,
  Globe,
  Dna,
  X,
  Sparkles,
  Play,
  UploadCloud,
  Maximize2,
  Paperclip,
} from 'lucide-react';
import { AiMode, MediaAttachment } from '../types/index.ts';
import { speechService } from '../lib/speechService.ts';
import {
  formatBytes,
  getMediaType,
  readFileAsDataUrl,
  extractBase64,
  generateVideoThumbnail,
} from '../lib/mediaUtils.ts';
import { MediaLightboxModal, LightboxMedia } from './MediaLightboxModal.tsx';

interface ChatInputProps {
  onSendMessage: (
    content: string,
    mode: AiMode,
    imageConfig?: { imageSize: '1K' | '2K' | '4K'; aspectRatio: '1:1' | '16:9' | '9:16' | '4:3' },
    attachments?: MediaAttachment[]
  ) => void;
  isLoading: boolean;
  activeMode: AiMode;
  onModeChange: (mode: AiMode) => void;
  onOpenScienceScout?: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  isLoading,
  activeMode,
  onModeChange,
  onOpenScienceScout,
}) => {
  const [text, setText] = useState('');
  const [isAttachmentOpen, setIsAttachmentOpen] = useState(false);
  const [imageSize, setImageSize] = useState<'1K' | '2K' | '4K'>('1K');
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '16:9' | '9:16' | '4:3'>('1:1');
  const [isRecording, setIsRecording] = useState(false);
  const [attachments, setAttachments] = useState<MediaAttachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [lightboxMedia, setLightboxMedia] = useState<LightboxMedia | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [text]);

  // Process files into MediaAttachment objects
  const processFiles = useCallback(async (files: FileList | File[]) => {
    const newAttachments: MediaAttachment[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const mediaType = getMediaType(file);

      try {
        const dataUrl = await readFileAsDataUrl(file);
        const base64Data = extractBase64(dataUrl);

        let previewUrl = dataUrl;
        if (mediaType === 'video') {
          const videoThumb = await generateVideoThumbnail(file);
          if (videoThumb) {
            previewUrl = videoThumb;
          }
        }

        newAttachments.push({
          id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          name: file.name,
          size: file.size,
          mimeType: file.type || (mediaType === 'video' ? 'video/mp4' : 'image/jpeg'),
          type: mediaType,
          previewUrl: previewUrl || dataUrl,
          base64Data,
        });
      } catch (err) {
        console.error('Error processing file:', err);
      }
    }

    if (newAttachments.length > 0) {
      setAttachments((prev) => [...prev, ...newAttachments]);
    }
  }, []);

  const handleMediaFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
    setIsAttachmentOpen(false);
    if (e.target) e.target.value = '';
  };

  const handleDocFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
    setIsAttachmentOpen(false);
    if (e.target) e.target.value = '';
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  // Clipboard Paste (e.g. screenshots)
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === 'file') {
        const file = items[i].getAsFile();
        if (file) files.push(file);
      }
    }

    if (files.length > 0) {
      processFiles(files);
    }
  };

  // Voice dictation
  const toggleRecording = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Browser tidak mendukung Web Speech API.');
      return;
    }

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'id-ID';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => setIsRecording(true);
      recognition.onend = () => setIsRecording(false);
      recognition.onerror = () => setIsRecording(false);

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setText((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Speech recognition error:', err);
      setIsRecording(false);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const hasAttachments = attachments.length > 0;
    const trimmedText = text.trim();

    if ((!trimmedText && !hasAttachments) || isLoading) return;

    speechService.unlockAudio();

    // Default prompt when uploading media without typing text
    const finalContent =
      trimmedText ||
      (attachments.some((a) => a.type === 'video')
        ? 'Tolong analisis video yang saya unggah ini secara detail, jelaskan adegan, narasi, dan intisarinya.'
        : 'Tolong analisis dan jelaskan gambar/media yang saya unggah ini secara mendalam.');

    onSendMessage(
      finalContent,
      activeMode,
      activeMode === 'image' ? { imageSize, aspectRatio } : undefined,
      attachments.length > 0 ? attachments : undefined
    );

    setText('');
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div
      className="relative w-full max-w-4xl mx-auto px-4 pb-4"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Lightbox Modal */}
      <MediaLightboxModal
        media={lightboxMedia}
        onClose={() => setLightboxMedia(null)}
      />

      {/* Hidden File Inputs */}
      <input
        ref={mediaInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={handleMediaFileChange}
      />
      <input
        ref={docInputRef}
        type="file"
        accept=".pdf,.txt,.doc,.docx,.csv,.json"
        multiple
        className="hidden"
        onChange={handleDocFileChange}
      />

      {/* Drag & Drop Visual Overlay */}
      {isDragging && (
        <div className="absolute inset-x-4 bottom-4 top-0 z-50 bg-[#161a29]/95 border-2 border-dashed border-[#20a66a] rounded-3xl flex flex-col items-center justify-center gap-3 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-14 h-14 rounded-2xl bg-[#20a66a]/20 border border-[#20a66a]/40 flex items-center justify-center text-[#34d399] shadow-lg animate-bounce">
            <UploadCloud className="w-7 h-7" />
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-white">Lepaskan Gambar atau Video di Sini</p>
            <p className="text-xs text-neutral-400 mt-0.5">
              Maria AI akan menganalisis konten visual dan konteks media Anda
            </p>
          </div>
        </div>
      )}

      {/* Attachment Action Sheet / Popover */}
      {isAttachmentOpen && (
        <div className="absolute bottom-full left-4 mb-3 w-80 bg-[#14151f] border border-[#26283b] rounded-2xl shadow-2xl p-2.5 z-40 text-xs animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between px-2 py-1.5 border-b border-[#202231] text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
            <span>Unggah & Mode Fitur</span>
            <button
              onClick={() => setIsAttachmentOpen(false)}
              className="text-neutral-500 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-1 pt-1.5">
            {/* Upload Images & Videos */}
            <button
              type="button"
              onClick={() => {
                mediaInputRef.current?.click();
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-neutral-200 hover:bg-[#1f2130] hover:text-white transition-colors text-left group"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                <ImageIcon className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="font-semibold flex items-center gap-1.5">
                  Foto & Gambar
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                    PNG, JPG, WebP
                  </span>
                </div>
                <div className="text-[10px] text-neutral-400">Analisis visual, objek, & teks gambar</div>
              </div>
            </button>

            {/* Upload Video */}
            <button
              type="button"
              onClick={() => {
                mediaInputRef.current?.click();
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-neutral-200 hover:bg-[#1f2130] hover:text-white transition-colors text-left group"
            >
              <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform">
                <Film className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="font-semibold flex items-center gap-1.5">
                  Unggah Video
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-mono">
                    MP4, WebM, MOV
                  </span>
                </div>
                <div className="text-[10px] text-neutral-400">Rangkum adegan, audio, & narasi video</div>
              </div>
            </button>

            {/* Documents & Files */}
            <button
              type="button"
              onClick={() => {
                docInputRef.current?.click();
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-neutral-200 hover:bg-[#1f2130] hover:text-white transition-colors text-left group"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform">
                <FileText className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="font-semibold">Dokumen & Berkas</div>
                <div className="text-[10px] text-neutral-400">PDF, teks, laporan, atau kode program</div>
              </div>
            </button>

            <div className="my-1 border-t border-[#202231]" />

            {/* AI Image Generation Studio */}
            <button
              type="button"
              onClick={() => {
                onModeChange('image');
                setIsAttachmentOpen(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-neutral-200 hover:bg-[#1f2130] hover:text-white transition-colors text-left group"
            >
              <div className="w-8 h-8 rounded-lg bg-pink-500/15 border border-pink-500/30 flex items-center justify-center text-pink-400 group-hover:scale-105 transition-transform">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="font-semibold">Studio Gambar AI</div>
                <div className="text-[10px] text-neutral-400">Buat foto & ilustrasi baru HD</div>
              </div>
            </button>

            {/* Science & Deep Research */}
            <button
              type="button"
              onClick={() => {
                onModeChange('science');
                setIsAttachmentOpen(false);
                if (onOpenScienceScout) onOpenScienceScout();
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-neutral-200 hover:bg-[#1f2130] hover:text-white transition-colors text-left group"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                <Dna className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="font-semibold">Deep Research & Science</div>
                <div className="text-[10px] text-neutral-400">Penalaran molekuler & PubMed</div>
              </div>
            </button>

            {/* Google Search */}
            <button
              type="button"
              onClick={() => {
                onModeChange('search');
                setIsAttachmentOpen(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-neutral-200 hover:bg-[#1f2130] hover:text-white transition-colors text-left group"
            >
              <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform">
                <Globe className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="font-semibold">Google Web Search</div>
                <div className="text-[10px] text-neutral-400">Informasi live terkini</div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Active Mode Tag Indicator if not general */}
      {activeMode !== 'general' && (
        <div className="flex items-center gap-2 mb-2 px-1">
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#1b1d2a] border border-[#2d3045] text-neutral-200 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-[#34d399]" />
            Mode: <span className="text-[#34d399] uppercase">{activeMode}</span>
            <button
              onClick={() => onModeChange('general')}
              className="ml-1 text-neutral-400 hover:text-white"
            >
              <X className="w-3 h-3" />
            </button>
          </span>

          {activeMode === 'image' && (
            <div className="flex items-center gap-2 text-[11px]">
              <select
                value={imageSize}
                onChange={(e) => setImageSize(e.target.value as any)}
                className="bg-[#1b1d2a] border border-[#2d3045] text-neutral-200 px-2 py-0.5 rounded-lg text-xs"
              >
                <option value="1K">Resolusi 1K</option>
                <option value="2K">Resolusi 2K</option>
                <option value="4K">Resolusi 4K</option>
              </select>

              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value as any)}
                className="bg-[#1b1d2a] border border-[#2d3045] text-neutral-200 px-2 py-0.5 rounded-lg text-xs"
              >
                <option value="1:1">Kotak 1:1</option>
                <option value="16:9">Lanskap 16:9</option>
                <option value="9:16">Potret 9:16</option>
                <option value="4:3">Standar 4:3</option>
              </select>
            </div>
          )}
        </div>
      )}

      {/* Attachments Preview Tray (Shown above input when files are attached) */}
      {attachments.length > 0 && (
        <div className="mb-2 p-2.5 rounded-2xl bg-[#141622] border border-[#282a3d] flex flex-wrap gap-2.5 items-center shadow-lg animate-in fade-in slide-in-from-bottom-1">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="relative group flex items-center gap-2.5 p-1.5 pr-3 rounded-xl bg-[#1b1e2e] border border-[#2d3148] hover:border-[#20a66a]/50 transition-colors shadow-sm max-w-xs"
            >
              {/* Media Thumbnail */}
              <div
                className="relative w-12 h-12 rounded-lg overflow-hidden bg-black shrink-0 cursor-pointer"
                onClick={() =>
                  setLightboxMedia({
                    url: att.previewUrl,
                    type: att.type === 'video' ? 'video' : 'image',
                    name: att.name,
                    size: att.size,
                  })
                }
              >
                {att.type === 'video' ? (
                  <>
                    {att.previewUrl.startsWith('data:image') ? (
                      <img
                        src={att.previewUrl}
                        alt={att.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-[#151728] flex items-center justify-center">
                        <Film className="w-5 h-5 text-indigo-400" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <Play className="w-4 h-4 text-white fill-white" />
                    </div>
                    <span className="absolute bottom-0.5 right-0.5 px-1 py-0.2 rounded bg-indigo-600/90 text-[8px] font-bold text-white uppercase">
                      Video
                    </span>
                  </>
                ) : att.type === 'image' ? (
                  <>
                    <img
                      src={att.previewUrl}
                      alt={att.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Maximize2 className="w-3.5 h-3.5 text-white" />
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full bg-[#191b2c] flex items-center justify-center text-blue-400">
                    <FileText className="w-5 h-5" />
                  </div>
                )}
              </div>

              {/* Media Info */}
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-neutral-200 truncate">
                  {att.name}
                </div>
                <div className="text-[10px] text-neutral-400 flex items-center gap-1.5 mt-0.5">
                  <span>{formatBytes(att.size)}</span>
                  <span>•</span>
                  <span className="text-[#34d399] font-medium">Siap kirim</span>
                </div>
              </div>

              {/* Remove button */}
              <button
                type="button"
                onClick={() => removeAttachment(att.id)}
                title="Hapus berkas"
                className="w-6 h-6 rounded-lg bg-neutral-800 hover:bg-rose-500/80 hover:text-white text-neutral-400 flex items-center justify-center transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          {/* Add more button */}
          <button
            type="button"
            onClick={() => mediaInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-[#333752] hover:border-[#20a66a] hover:bg-[#1a1d2e] text-neutral-400 hover:text-white transition-colors text-xs font-medium"
          >
            <Plus className="w-3.5 h-3.5 text-[#34d399]" />
            <span>Tambah</span>
          </button>
        </div>
      )}

      {/* Main Input Dock */}
      <div className="relative flex items-end gap-2 p-2 rounded-3xl bg-[#14151f] border border-[#242637] shadow-2xl focus-within:border-[#20a66a]/70 transition-all duration-200">
        {/* Attachment Plus Button (+) */}
        <button
          type="button"
          onClick={() => setIsAttachmentOpen((prev) => !prev)}
          title="Lampiran gambar, video & fitur"
          className="w-10 h-10 rounded-2xl bg-[#1b1d2b] hover:bg-[#25283a] text-neutral-300 hover:text-white flex items-center justify-center shrink-0 transition-colors"
        >
          <Plus className={`w-5 h-5 transition-transform ${isAttachmentOpen ? 'rotate-45' : ''}`} />
        </button>

        {/* Text Input Area */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={
            attachments.length > 0
              ? 'Tambahkan pertanyaan atau instruksi untuk media ini (opsional)...'
              : 'Tanya Maria atau tempel/unggah gambar & video...'
          }
          rows={1}
          className="flex-1 bg-transparent border-0 resize-none py-2.5 px-2 text-sm text-white placeholder-neutral-500 focus:outline-none max-h-36 overflow-y-auto leading-relaxed"
        />

        {/* Voice Microphone Button */}
        <button
          type="button"
          onClick={toggleRecording}
          title={isRecording ? 'Berhenti mendengarkan' : 'Dikte suara'}
          className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-all ${
            isRecording
              ? 'bg-rose-500/20 text-rose-400 animate-pulse border border-rose-500/40'
              : 'text-neutral-400 hover:text-white hover:bg-[#1f2130]'
          }`}
        >
          {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        {/* Send Button */}
        <button
          type="button"
          disabled={(!text.trim() && attachments.length === 0) || isLoading}
          onClick={() => handleSubmit()}
          title="Kirim pesan"
          className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-200 ${
            (text.trim() || attachments.length > 0) && !isLoading
              ? 'bg-[#20a66a] hover:bg-[#1a8c59] text-white shadow-lg shadow-[#20a66a]/25 scale-100 active:scale-95'
              : 'bg-[#1a1c28] text-neutral-600 cursor-not-allowed scale-95'
          }`}
        >
          {isLoading ? (
            <div className="flex items-center gap-0.5">
              <span className="w-1 h-3 bg-white/70 animate-bounce rounded-full" />
              <span className="w-1 h-4 bg-white animate-bounce [animation-delay:0.15s] rounded-full" />
              <span className="w-1 h-3 bg-white/70 animate-bounce [animation-delay:0.3s] rounded-full" />
            </div>
          ) : (
            <Send className="w-4 h-4 -rotate-45 ml-0.5" />
          )}
        </button>
      </div>

      {/* Sub-label Bawah */}
      <p className="text-[11px] text-neutral-500 text-center mt-2 font-medium">
        Tarik & lepas gambar atau video langsung ke chat • Tekan Enter untuk kirim
      </p>
    </div>
  );
};
