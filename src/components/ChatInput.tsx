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
  Maximize2,
  Camera,
} from 'lucide-react';
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
    attachments?: MediaAttachment[]
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

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (loadedText) {
      setText(loadedText);
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
      onClearLoadedText?.();
    }
  }, [loadedText, onClearLoadedText]);
  const recognitionRef = useRef<any>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  }, [text]);

  // Process files into MediaAttachment objects with lightweight thumbnails
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
          // Sharp high-res preview thumbnail (up to 1600px with 0.92 quality)
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

  // Speech Recognition (Dictation)
  const toggleRecording = () => {
    speechService.unlockAudio();

    if (isRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Peramban Anda tidak mendukung input suara Web Speech.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'id-ID';
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsRecording(true);
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setText((prev) => (prev ? `${prev} ${finalTranscript}` : finalTranscript));
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Speech recognition exception:', err);
      setIsRecording(false);
    }
  };

  const handleSubmit = (overrideText?: string) => {
    const messageContent = (overrideText ?? text).trim();
    if ((!messageContent && attachments.length === 0) || isLoading) return;

    speechService.unlockAudio();

    onSendMessage(
      messageContent,
      activeMode,
      activeMode === 'image' ? { imageSize, aspectRatio } : undefined,
      attachments.length > 0 ? attachments : undefined
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

  // Trigger voice mode when clicking wave icon with empty text
  const handleVoiceWaveClick = () => {
    speechService.unlockAudio();
    toggleRecording();
  };

  const hasInput = Boolean(text.trim() || attachments.length > 0);

  return (
    <div className="max-w-2xl mx-auto px-3 sm:px-4 w-full">
      {/* Lightbox for zooming attached media */}
      <MediaLightboxModal
        media={lightboxMedia}
        onClose={() => setLightboxMedia(null)}
      />

      {/* Hidden File Inputs */}
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
        accept="video/*"
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
        accept=".pdf,.txt,.doc,.docx,.csv,.json"
        multiple
        className="hidden"
        onChange={handleMediaFileChange}
      />

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
                <div className="text-[10px] text-slate-400 dark:text-slate-400">JPG, PNG, WebP</div>
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
                <div className="text-[10px] text-slate-400 dark:text-slate-400">MP4, WebM, MOV</div>
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
                <div className="text-[10px] text-slate-400 dark:text-slate-400">Foto langsung</div>
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
                <div className="text-[10px] text-slate-400 dark:text-slate-400">PDF, TXT, CSV</div>
              </div>
            </button>
          </div>

          <div className="my-1.5 border-t border-slate-100 dark:border-[#1e293b]" />

          {/* Mode Switch Shortcuts */}
          <div className="flex items-center gap-1.5 flex-wrap px-1">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Mode:</span>
            {[
              { id: 'general', label: 'Umum' },
              { id: 'thinking', label: 'Thinking' },
              { id: 'fast', label: 'Cepat' },
              { id: 'search', label: 'Search' },
              { id: 'maps', label: 'Maps' },
              { id: 'science', label: 'Sains' },
              { id: 'image', label: 'Studio Gambar' },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  onModeChange(m.id as AiMode);
                  setIsAttachmentOpen(false);
                }}
                className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-all ${
                  activeMode === m.id
                    ? 'bg-blue-600 text-white font-bold shadow-xs'
                    : 'bg-slate-100 dark:bg-[#1e293b] text-slate-600 dark:text-slate-300 hover:text-blue-600'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Active Mode Tag Indicator if not general */}
      {activeMode !== 'general' && (
        <div className="flex items-center gap-2 mb-2 px-1">
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white dark:bg-[#0f172a] border border-blue-200 dark:border-[#1e293b] text-blue-900 dark:text-blue-100 shadow-xs flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-blue-600 dark:text-blue-400" />
            Mode: <span className="text-blue-600 dark:text-blue-400 uppercase">{activeMode}</span>
            <button
              onClick={() => onModeChange('general')}
              className="ml-1 text-slate-400 hover:text-slate-700 dark:hover:text-white"
            >
              <X className="w-3 h-3" />
            </button>
          </span>

          {activeMode === 'image' && (
            <div className="flex items-center gap-2 text-[11px]">
              <select
                value={imageSize}
                onChange={(e) => setImageSize(e.target.value as any)}
                className="bg-white dark:bg-[#1b1d2a] border border-gray-200 dark:border-[#2d3045] text-gray-700 dark:text-neutral-200 px-2 py-0.5 rounded-lg text-xs"
              >
                <option value="1K">Resolusi 1K</option>
                <option value="2K">Resolusi 2K</option>
                <option value="4K">Resolusi 4K</option>
              </select>

              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value as any)}
                className="bg-white dark:bg-[#1b1d2a] border border-gray-200 dark:border-[#2d3045] text-gray-700 dark:text-neutral-200 px-2 py-0.5 rounded-lg text-xs"
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

      {/* Attachments Preview Tray (When files are chosen) */}
      {attachments.length > 0 && (
        <div className="mb-2 p-2 rounded-2xl bg-white dark:bg-[#141622] border border-gray-200 dark:border-[#282a3d] flex flex-wrap gap-2 items-center shadow-md animate-in fade-in">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="relative group flex items-center gap-2 p-1.5 pr-2.5 rounded-xl bg-gray-50 dark:bg-[#1b1e2e] border border-gray-200 dark:border-[#2d3148] shadow-xs max-w-xs"
            >
              {/* Media Thumbnail */}
              <div
                className="relative w-10 h-10 rounded-lg overflow-hidden bg-black shrink-0 cursor-pointer"
                onClick={() =>
                  setLightboxMedia({
                    url: att.originalUrl || att.previewUrl,
                    type: att.type === 'video' ? 'video' : 'image',
                    name: att.name,
                    size: att.size,
                  })
                }
              >
                {att.type === 'video' ? (
                  <>
                    {att.previewUrl.startsWith('data:image') ? (
                      <img src={att.previewUrl} alt={att.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-indigo-900 flex items-center justify-center">
                        <Film className="w-4 h-4 text-white" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <Play className="w-3 h-3 text-white fill-white" />
                    </div>
                  </>
                ) : att.type === 'image' ? (
                  <>
                    <img src={att.previewUrl} alt={att.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Maximize2 className="w-3 h-3 text-white" />
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-600">
                    <FileText className="w-4 h-4" />
                  </div>
                )}
              </div>

              {/* Media Info */}
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-gray-800 dark:text-neutral-200 truncate">
                  {att.name}
                </div>
                <div className="text-[10px] text-gray-400 dark:text-neutral-400">
                  {formatBytes(att.size)}
                </div>
              </div>

              {/* Remove */}
              <button
                type="button"
                onClick={() => removeAttachment(att.id)}
                title="Hapus berkas"
                className="w-5 h-5 rounded-md hover:bg-red-50 hover:text-red-600 text-gray-400 flex items-center justify-center transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={() => mediaInputRef.current?.click()}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-dashed border-gray-300 dark:border-[#333752] text-gray-500 dark:text-neutral-400 text-xs hover:border-emerald-500"
          >
            <Plus className="w-3 h-3 text-emerald-600" />
            <span>Tambah</span>
          </button>
        </div>
      )}

      {/* Main Floating Pill Input Bar (White & Navy Blue Aesthetic matching Sky Host) */}
      <div className="relative flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-[#1e293b] shadow-md focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600/15 transition-all duration-200">
        {/* Plus Button (+) */}
        <button
          type="button"
          onClick={() => setIsAttachmentOpen((prev) => !prev)}
          title="Lampiran & Media"
          className="w-8 h-8 rounded-full bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-[#2d3b55] flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors shrink-0 shadow-xs"
        >
          <Plus className={`w-4 h-4 transition-transform duration-200 ${isAttachmentOpen ? 'rotate-45 text-blue-600' : ''}`} />
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
          className="flex-1 bg-transparent border-0 resize-none py-1.5 px-1.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none max-h-32 leading-relaxed"
        />

        {/* Right Section: Divider | Mic | Waveform/Send Button */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Subtle Vertical Divider */}
          <div className="h-5 w-px bg-slate-200 dark:bg-[#1e293b] my-auto" />

          {/* Microphone Button */}
          <button
            type="button"
            onClick={toggleRecording}
            title={isRecording ? 'Berhenti mendengarkan' : 'Dikte suara'}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              isRecording
                ? 'bg-rose-50 text-rose-600 animate-pulse border border-rose-300'
                : 'text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400'
            }`}
          >
            {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          {/* Navy Blue Waveform Voice Button OR Send Button */}
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
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/60 flex items-center justify-center shadow-xs shrink-0 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
            >
              {/* Waveform Equalizer Bars in Navy/Royal Blue */}
              <div className="flex items-center gap-[2.5px] h-3.5">
                <span className="w-[2px] h-2 bg-blue-600 dark:bg-blue-400 rounded-full" />
                <span className="w-[2px] h-3.5 bg-blue-600 dark:bg-blue-400 rounded-full" />
                <span className="w-[2px] h-2.5 bg-blue-600 dark:bg-blue-400 rounded-full" />
                <span className="w-[2px] h-3 bg-blue-600 dark:bg-blue-400 rounded-full" />
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Sub-label Bawah: Exact match to Screenshot */}
      <p className="text-[10px] font-medium tracking-widest text-slate-400 dark:text-slate-500 text-center uppercase pt-2 pb-1 select-none">
        MARIA ADALAH AI YANG DAPAT MELAKUKAN KESALAHAN
      </p>
    </div>
  );
};
