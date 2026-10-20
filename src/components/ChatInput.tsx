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
  Camera,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { autoFormatMarkdown, hasFormattingSyntax } from '../lib/formatUtils.ts';
import { AiMode, MediaAttachment } from '../types/index.ts';
import { speechService } from '../lib/speechService.ts';
import {
  formatBytes,
  getMediaType,
  readFileAsDataUrl,
  extractBase64,
  generateImageThumbnail,
  generateVideoThumbnail,
  storeOriginalMedia,
  storeOriginalMediaBlob,
} from '../lib/mediaUtils.ts';
import { MediaLightboxModal, LightboxMedia } from './MediaLightboxModal.tsx';

interface ChatInputProps {
  onSendMessage: (
    content: string,
    mode: AiMode,
    imageConfig?: { imageSize: '1K' | '2K' | '4K'; aspectRatio: '1:1' | '16:9' | '9:16' | '4:3' },
    attachments?: MediaAttachment[],
    webSearchEnabled?: boolean
  ) => void;
  isLoading: boolean;
  activeMode: AiMode;
  onModeChange: (mode: AiMode) => void;
  onOpenScienceScout?: () => void;
  loadedText?: string;
  onClearLoadedText?: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  isLoading,
  activeMode,
  onModeChange,
  onOpenScienceScout,
  loadedText,
  onClearLoadedText,
}) => {
  const [text, setText] = useState('');
  const [isAttachmentOpen, setIsAttachmentOpen] = useState(false);
  const [imageSize, setImageSize] = useState<'1K' | '2K' | '4K'>('1K');
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '16:9' | '9:16' | '4:3'>('1:1');
  const [isRecording, setIsRecording] = useState(false);
  const [attachments, setAttachments] = useState<MediaAttachment[]>([]);
  const [lightboxMedia, setLightboxMedia] = useState<LightboxMedia | null>(null);

  // Web search is ALWAYS ACTIVE by default, can be toggled manually by user
  const [webSearchActive, setWebSearchActive] = useState<boolean>(() => {
    const saved = localStorage.getItem('maria_web_search_active');
    return saved !== null ? saved === 'true' : true; // Default ON
  });

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (loadedText) {
      setText(loadedText);
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
      onClearLoadedText?.();
    }
  }, [loadedText, onClearLoadedText]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  }, [text]);

  const toggleWebSearch = () => {
    setWebSearchActive((prev) => {
      const next = !prev;
      localStorage.setItem('maria_web_search_active', String(next));
      if (next && activeMode === 'general') {
        onModeChange('search');
      } else if (!next && activeMode === 'search') {
        onModeChange('general');
      }
      return next;
    });
  };

  // Process files into MediaAttachment objects with original full resolution
  const processFiles = useCallback(async (files: FileList | File[]) => {
    const newAttachments: MediaAttachment[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const mediaType = getMediaType(file);

      try {
        const dataUrl = await readFileAsDataUrl(file);
        const base64Data = extractBase64(dataUrl);
        const originalUrl = URL.createObjectURL(file);
        const attId = `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

        // Retain 100% full original uncompressed file in memory and persistent IndexedDB
        storeOriginalMedia(attId, originalUrl);
        storeOriginalMedia(file.name, originalUrl);
        await storeOriginalMediaBlob(attId, file);
        await storeOriginalMediaBlob(file.name, file);

        let previewUrl = '';
        if (mediaType === 'image') {
          previewUrl = await generateImageThumbnail(file, 1600, 0.92);
        } else if (mediaType === 'video') {
          previewUrl = await generateVideoThumbnail(file);
        }

        newAttachments.push({
          id: attId,
          name: file.name,
          size: file.size,
          mimeType: file.type || (mediaType === 'video' ? 'video/mp4' : 'image/jpeg'),
          type: mediaType,
          previewUrl: previewUrl || originalUrl,
          originalUrl: originalUrl || dataUrl,
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

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  // Clipboard Paste (e.g. screenshots)
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const filesToUpload: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1 || items[i].type.indexOf('video') !== -1) {
        const file = items[i].getAsFile();
        if (file) filesToUpload.push(file);
      }
    }

    if (filesToUpload.length > 0) {
      e.preventDefault();
      processFiles(filesToUpload);
    }
  };

  // Submit Handler
  const handleSubmit = (overrideText?: string) => {
    const contentToSend = overrideText !== undefined ? overrideText : text;
    if ((!contentToSend.trim() && attachments.length === 0) || isLoading) return;

    // Send message with webSearchActive state
    const effectiveMode = webSearchActive && activeMode === 'general' ? 'search' : activeMode;
    onSendMessage(
      contentToSend,
      effectiveMode,
      activeMode === 'image' ? { imageSize, aspectRatio } : undefined,
      attachments.length > 0 ? attachments : undefined,
      webSearchActive
    );

    setText('');
    setAttachments([]);
    setIsAttachmentOpen(false);

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

  // Web Speech STT Recognition
  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Browser Anda belum mendukung input suara langsung. Silakan gunakan Google Chrome.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'id-ID';
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => setIsRecording(true);
      recognition.onend = () => setIsRecording(false);
      recognition.onerror = () => setIsRecording(false);

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        if (currentTranscript) {
          setText((prev) => (prev ? `${prev} ${currentTranscript}` : currentTranscript));
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsRecording(false);
    }
  };

  const handleVoiceWaveClick = () => {
    speechService.unlockAudio();
    if (text.trim()) {
      handleSubmit();
    } else {
      toggleRecording();
    }
  };

  const hasInput = text.trim().length > 0 || attachments.length > 0;

  return (
    <div className="max-w-3xl mx-auto w-full px-3 sm:px-4 select-none">
      <MediaLightboxModal
        media={lightboxMedia}
        onClose={() => setLightboxMedia(null)}
      />

      {/* Hidden file inputs */}
      <input
        ref={mediaInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleMediaFileChange}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime"
        multiple
        className="hidden"
        onChange={handleMediaFileChange}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleMediaFileChange}
      />
      <input
        ref={docInputRef}
        type="file"
        accept=".pdf,.txt,.md,.json,.csv"
        multiple
        className="hidden"
        onChange={handleMediaFileChange}
      />

      {/* Top Controls Row: Web Search Always Active Toggle & Format Otomatis indicator */}
      <div className="flex items-center justify-between gap-2 mb-2 px-1 text-xs">
        {/* Web Search Always Active Toggle */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={toggleWebSearch}
            title={
              webSearchActive
                ? 'Pencarian Web selalu aktif (Google Grounding). Klik untuk mematikan.'
                : 'Pencarian Web mati. Klik untuk mengaktifkan.'
            }
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition-all shadow-2xs ${
              webSearchActive
                ? 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-500 border border-slate-300 dark:bg-[#1a233a] dark:text-slate-400 dark:border-slate-700'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                webSearchActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
              }`}
            />
            <Globe className="w-3.5 h-3.5" />
            <span>{webSearchActive ? 'Cari Web: Aktif' : 'Cari Web: Nonaktif'}</span>
          </button>

          {/* Quick Auto-Format Guide Badge (No manual button clicking needed) */}
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
            <span>Format otomatis:</span>
            <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              *tebal*
            </span>
            <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              ~coret~
            </span>
            <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              `kode`
            </span>
          </div>
        </div>

        {/* Active Mode indicator badge if non-standard */}
        {activeMode !== 'general' && activeMode !== 'search' && (
          <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
            Mode {activeMode}
          </span>
        )}
      </div>

      {/* Automatic Live Real-time Text Format Preview (Appears automatically when *test*, ~test~, or `test` is typed) */}
      {hasFormattingSyntax(text) && (
        <div className="mb-2 px-3 py-1.5 rounded-xl bg-blue-50/90 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/50 shadow-2xs flex items-center gap-2 text-xs animate-in fade-in slide-in-from-bottom-1 select-text">
          <div className="flex items-center gap-1 font-bold text-[10px] uppercase text-blue-700 dark:text-blue-300 tracking-wider shrink-0">
            <Sparkles className="w-3 h-3 text-blue-600 dark:text-blue-400" />
            <span>Format Otomatis:</span>
          </div>
          <div className="flex-1 text-[#0f172a] dark:text-slate-200 text-xs font-normal truncate leading-relaxed">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => <span className="inline">{children}</span>,
                strong: ({ children }) => <strong className="font-bold text-blue-950 dark:text-white">{children}</strong>,
                em: ({ children }) => <em className="italic">{children}</em>,
                del: ({ children }) => <del className="line-through opacity-70">{children}</del>,
                code: ({ children }) => (
                  <code className="px-1.5 py-0.5 rounded font-mono text-[11px] bg-blue-100 dark:bg-blue-900/60 text-blue-900 dark:text-blue-200 border border-blue-200 dark:border-blue-800">
                    {children}
                  </code>
                ),
              }}
            >
              {autoFormatMarkdown(text)}
            </ReactMarkdown>
          </div>
        </div>
      )}

      {/* Attachments Menu Popover */}
      {isAttachmentOpen && (
        <div className="mb-2 p-2 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-[#1e293b] shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-xs">
          <div className="grid grid-cols-2 gap-1.5">
            {/* Foto & Gambar */}
            <button
              type="button"
              onClick={() => mediaInputRef.current?.click()}
              className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-blue-50/70 dark:hover:bg-[#1e293b] text-slate-800 dark:text-slate-200 text-left transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <ImageIcon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold truncate">Unggah Foto</div>
                <div className="text-[10px] text-slate-400">Resolusi asli 100%</div>
              </div>
            </button>

            {/* Video */}
            <button
              type="button"
              onClick={() => videoInputRef.current?.click()}
              className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-blue-50/70 dark:hover:bg-[#1e293b] text-slate-800 dark:text-slate-200 text-left transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <Film className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold truncate">Unggah Video</div>
                <div className="text-[10px] text-slate-400">MP4, WebM, MOV</div>
              </div>
            </button>

            {/* Kamera Langsung */}
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-blue-50/70 dark:hover:bg-[#1e293b] text-slate-800 dark:text-slate-200 text-left transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                <Camera className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold truncate">Ambil Kamera</div>
                <div className="text-[10px] text-slate-400">Foto instan</div>
              </div>
            </button>

            {/* Dokumen */}
            <button
              type="button"
              onClick={() => docInputRef.current?.click()}
              className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-blue-50/70 dark:hover:bg-[#1e293b] text-slate-800 dark:text-slate-200 text-left transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold truncate">Dokumen</div>
                <div className="text-[10px] text-slate-400">PDF, TXT, CSV</div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Attachments Preview Tray */}
      {attachments.length > 0 && (
        <div className="mb-2 p-2 rounded-2xl bg-white dark:bg-[#0c1222] border border-slate-200 dark:border-[#1e293b] flex flex-wrap gap-2 items-center shadow-md animate-in fade-in">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="relative group flex items-center gap-2 p-1.5 pr-2.5 rounded-xl bg-slate-50 dark:bg-[#14203a] border border-slate-200 dark:border-blue-900/60 shadow-2xs max-w-xs"
            >
              {att.type === 'image' ? (
                <img
                  src={att.originalUrl || att.previewUrl}
                  alt={att.name}
                  onClick={() =>
                    setLightboxMedia({
                      url: att.originalUrl || att.previewUrl,
                      type: 'image',
                      name: att.name,
                      size: att.size,
                    })
                  }
                  className="w-10 h-10 rounded-lg object-cover cursor-pointer hover:opacity-90"
                />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/60 flex items-center justify-center text-blue-600">
                  <FileText className="w-5 h-5" />
                </div>
              )}
              <div className="min-w-0 text-xs">
                <div className="font-semibold truncate max-w-[120px] text-slate-900 dark:text-white">
                  {att.name}
                </div>
                <div className="text-[10px] text-blue-600 font-medium">
                  {formatBytes(att.size)} • Asli
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeAttachment(att.id)}
                className="p-1 rounded-full text-slate-400 hover:text-rose-600 hover:bg-slate-200 dark:hover:bg-slate-800 ml-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Main Floating Pill Input Bar (Matching Screenshot 2: Clean White Pill) */}
      <div className="relative flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-[#0c1222] border border-slate-200/90 dark:border-[#1e293b] shadow-md focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600/15 transition-all duration-200">
        {/* Plus Button (+) */}
        <button
          type="button"
          onClick={() => setIsAttachmentOpen((prev) => !prev)}
          title="Lampiran & Media"
          className="w-8 h-8 rounded-full bg-slate-50 dark:bg-[#15203b] border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-blue-600 transition-colors shrink-0 shadow-2xs"
        >
          <Plus
            className={`w-4 h-4 transition-transform duration-200 ${
              isAttachmentOpen ? 'rotate-45 text-blue-600' : ''
            }`}
          />
        </button>

        {/* Text Input */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder="Tanya Maria..."
          rows={1}
          className="flex-1 bg-transparent border-0 resize-none py-1.5 px-1.5 text-sm text-[#0f172a] dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none max-h-32 leading-relaxed"
        />

        {/* Right Section: Divider | Mic | Waveform/Send Button */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Subtle Vertical Divider */}
          <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 my-auto" />

          {/* Microphone Button */}
          <button
            type="button"
            onClick={toggleRecording}
            title={isRecording ? 'Berhenti mendengarkan' : 'Dikte suara'}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              isRecording
                ? 'bg-rose-50 text-rose-600 animate-pulse border border-rose-300'
                : 'text-slate-400 hover:text-blue-600 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          {/* Waveform Voice Button OR Send Button (Matches Screenshot 2: Teal/Mint Waveform) */}
          {hasInput ? (
            <button
              type="button"
              disabled={isLoading}
              onClick={() => handleSubmit()}
              title="Kirim pesan"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white flex items-center justify-center shadow-md shadow-blue-900/20 shrink-0 transition-all active:scale-95"
            >
              <Send className="w-4 h-4 ml-0.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleVoiceWaveClick}
              title="Mode Suara Maria AI"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#ecfdf5] dark:bg-emerald-950/40 text-[#059669] dark:text-emerald-400 border border-[#a7f3d0] dark:border-emerald-800 flex items-center justify-center shadow-2xs shrink-0 hover:bg-[#d1fae5] transition-colors"
            >
              {/* Teal Equalizer Bars matching Screenshot 2 */}
              <div className="flex items-center gap-[2px] h-3.5">
                <span className="w-[2px] h-2 bg-[#059669] dark:bg-emerald-400 rounded-full" />
                <span className="w-[2px] h-3.5 bg-[#059669] dark:bg-emerald-400 rounded-full" />
                <span className="w-[2px] h-2.5 bg-[#059669] dark:bg-emerald-400 rounded-full" />
                <span className="w-[2px] h-3 bg-[#059669] dark:bg-emerald-400 rounded-full" />
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Sub-label Bawah (Matches Screenshot 2: Clean Light Text) */}
      <p className="text-[10px] font-medium tracking-widest text-slate-400 text-center uppercase pt-2 pb-1 select-none">
        MARIA ADALAH AI YANG DAPAT MELAKUKAN KESALAHAN
      </p>
    </div>
  );
};
