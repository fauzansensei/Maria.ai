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
  Camera,
  Type,
} from 'lucide-react';
import { AiMode, MediaAttachment } from '../types/index.ts';
import { speechService } from '../lib/speechService.ts';
import { autoFormatMarkdown } from '../lib/formatUtils.ts';
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
  onOpenCookiePolicy?: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  isLoading,
  activeMode,
  onModeChange,
  onOpenScienceScout,
  loadedText,
  onClearLoadedText,
  onOpenCookiePolicy,
}) => {
  const [text, setText] = useState('');
  const [isAttachmentOpen, setIsAttachmentOpen] = useState(false);
  const [imageSize, setImageSize] = useState<'1K' | '2K' | '4K'>('1K');
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '16:9' | '9:16' | '4:3'>('1:1');
  const [isRecording, setIsRecording] = useState(false);
  const [attachments, setAttachments] = useState<MediaAttachment[]>([]);
  const [lightboxMedia, setLightboxMedia] = useState<LightboxMedia | null>(null);
  const [showFormatToolbar, setShowFormatToolbar] = useState(false);

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
      const timer = setTimeout(() => {
        onClearLoadedText?.();
      }, 0);
      return () => clearTimeout(timer);
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
    const next = !webSearchActive;
    setWebSearchActive(next);
    localStorage.setItem('maria_web_search_active', String(next));
    if (next && activeMode === 'general') {
      onModeChange('search');
    } else if (!next && activeMode === 'search') {
      onModeChange('general');
    }
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
          previewUrl = await generateImageThumbnail(file, 480, 0.72);
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

  // Wrap selected text or insert markdown formatting syntax at caret
  const applyFormatting = (prefix: string, suffix: string = prefix) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = text.slice(start, end);

    let newText = '';
    let selStart = start + prefix.length;
    let selEnd = selStart;

    if (start !== end && selected) {
      newText = text.slice(0, start) + prefix + selected + suffix + text.slice(end);
      selStart = start + prefix.length;
      selEnd = start + prefix.length + selected.length;
    } else {
      const placeholder = 'teks';
      newText = text.slice(0, start) + prefix + placeholder + suffix + text.slice(end);
      selStart = start + prefix.length;
      selEnd = selStart + placeholder.length;
    }

    setText(newText);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(selStart, selEnd);
    }, 15);
  };

  // Submit Handler with WhatsApp auto-formatting (*bold* -> **bold**, ~strike~ -> ~~strike~~)
  const handleSubmit = (overrideText?: string) => {
    const rawText = overrideText !== undefined ? overrideText : text;
    if ((!rawText.trim() && attachments.length === 0) || isLoading) return;

    // Convert WhatsApp formatted syntax to standard markdown
    const contentToSend = autoFormatMarkdown(rawText);

    // Pre-unlock audio permissions on user gesture for seamless autoplay
    speechService.unlockAudio();

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
    setShowFormatToolbar(false);

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
                ? 'bg-slate-900/85 text-white border border-white/60 dark:bg-white/10 dark:text-white dark:border-white/60'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-500 border border-slate-300 dark:bg-[#1a233a] dark:text-slate-400 dark:border-slate-700'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                webSearchActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'
              }`}
            />
            <Globe className="w-3.5 h-3.5" />
            <span>{webSearchActive ? 'Cari Web: Aktif' : 'Cari Web: Nonaktif'}</span>
          </button>

        </div>

        {/* Active Mode indicator badge if non-standard */}
        {activeMode !== 'general' && activeMode !== 'search' && (
          <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
            Mode {activeMode}
          </span>
        )}
      </div>

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

            {/* Format Teks (Markdown & WhatsApp style) */}
            <button
              type="button"
              onClick={() => {
                setShowFormatToolbar((prev) => !prev);
                setIsAttachmentOpen(false);
              }}
              className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-blue-50/70 dark:hover:bg-[#1e293b] text-slate-800 dark:text-slate-200 text-left transition-colors col-span-2 border-t border-slate-100 dark:border-slate-800 pt-2.5"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Type className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold truncate">Format Teks (Markdown & WhatsApp)</div>
                <div className="text-[10px] text-slate-400">*tebal*, _miring_, ~coret~, `kode`</div>
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

      {/* Main Floating Pill Input Bar (Pure White Outline, No Blue) */}
      <div className="relative flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-[#0a0f1d] border border-slate-300 dark:border-white/70 shadow-lg shadow-black/20 focus-within:border-white focus-within:ring-2 focus-within:ring-white/40 transition-all duration-200">
        {/* Plus Button (+) */}
        <button
          type="button"
          onClick={() => setIsAttachmentOpen((prev) => !prev)}
          title="Lampiran & Media"
          className="w-8 h-8 rounded-full bg-transparent hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/20 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-white transition-colors shrink-0 shadow-2xs"
        >
          <Plus
            className={`w-4 h-4 transition-transform duration-200 ${
              isAttachmentOpen ? 'rotate-45 text-white' : ''
            }`}
          />
        </button>

        {/* Format Mini Popover (Floating above [T] button) */}
        {showFormatToolbar && (
          <div className="absolute bottom-full left-10 mb-2 p-1 rounded-xl bg-slate-900/95 dark:bg-[#0c1222] border border-slate-300 dark:border-white/40 shadow-2xl flex items-center gap-1 z-30 animate-in fade-in zoom-in-95 text-xs">
            <button
              type="button"
              onClick={() => applyFormatting('*', '*')}
              title="Tebal (*teks*)"
              className="w-7 h-7 rounded-lg font-bold text-slate-200 hover:text-white hover:bg-white/15 flex items-center justify-center transition-colors"
            >
              B
            </button>
            <button
              type="button"
              onClick={() => applyFormatting('_', '_')}
              title="Miring (_teks_)"
              className="w-7 h-7 rounded-lg italic font-serif text-slate-200 hover:text-white hover:bg-white/15 flex items-center justify-center transition-colors"
            >
              I
            </button>
            <button
              type="button"
              onClick={() => applyFormatting('~', '~')}
              title="Coret (~teks~)"
              className="w-7 h-7 rounded-lg line-through text-slate-200 hover:text-white hover:bg-white/15 flex items-center justify-center transition-colors"
            >
              S
            </button>
            <button
              type="button"
              onClick={() => applyFormatting('`', '`')}
              title="Kode (`teks`)"
              className="px-2 h-7 rounded-lg font-mono text-[11px] text-slate-200 hover:text-white hover:bg-white/15 flex items-center justify-center transition-colors"
            >
              &lt;/&gt;
            </button>
          </div>
        )}

        {/* Format Button [T] */}
        <button
          type="button"
          onClick={() => setShowFormatToolbar((prev) => !prev)}
          title="Format Teks WhatsApp (*tebal*, _miring_, ~coret~, `kode`)"
          className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors shrink-0 shadow-2xs ${
            showFormatToolbar
              ? 'bg-white/20 border-white text-white'
              : 'bg-transparent hover:bg-slate-100 dark:hover:bg-white/10 border-slate-200 dark:border-white/20 text-slate-500 dark:text-slate-300 hover:text-white'
          }`}
        >
          <Type className="w-4 h-4" />
        </button>

        {/* Native Text Input - Perfect Caret Alignment & Multi-line Support */}
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
                : 'text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          {/* Waveform Voice Button OR Send Button (Crisp White Button on Send, no blue!) */}
          {hasInput ? (
            <button
              type="button"
              disabled={isLoading}
              onClick={() => handleSubmit()}
              title="Kirim pesan"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white hover:bg-slate-200 text-slate-900 flex items-center justify-center shadow-md shrink-0 transition-all active:scale-95 font-bold"
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
              {/* Teal Equalizer Bars */}
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

      {/* Sub-label Bawah (Matches Screenshot: Clean Light Text + Link Kebijakan Cookie) */}
      <div className="flex items-center justify-center gap-1.5 pt-2 pb-1 select-none text-[10px] font-medium tracking-wider text-slate-400 uppercase flex-wrap">
        <span>MARIA ADALAH AI YANG DAPAT MELAKUKAN KESALAHAN</span>
        <span className="text-slate-600">•</span>
        <button
          type="button"
          onClick={onOpenCookiePolicy}
          className="underline hover:text-white transition-colors cursor-pointer normal-case tracking-normal text-[10px] text-slate-300 hover:text-white font-semibold"
        >
          Kebijakan Cookie
        </button>
      </div>
    </div>
  );
};
