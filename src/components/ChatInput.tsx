import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Send,
  Plus,
  Mic,
  MicOff,
  Image as ImageIcon,
  Film,
  FileText,
  Globe,
  X,
  Camera,
  Type,
} from 'lucide-react';
import { AiMode, MediaAttachment } from '../types/index.ts';
import { speechService } from '../lib/speechService.ts';
import { autoFormatMarkdown, hasFormattingSyntax } from '../lib/formatUtils.ts';
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
  loadedText,
  onClearLoadedText,
}) => {
  const [text, setText] = useState('');
  const [isAttachmentOpen, setIsAttachmentOpen] = useState(false);
  const [imageSize] = useState<'1K' | '2K' | '4K'>('1K');
  const [aspectRatio] = useState<'1:1' | '16:9' | '9:16' | '4:3'>('1:1');
  const [isRecording, setIsRecording] = useState(false);
  const [attachments, setAttachments] = useState<MediaAttachment[]>([]);
  const [lightboxMedia, setLightboxMedia] = useState<LightboxMedia | null>(null);
  const [showFormatToolbar, setShowFormatToolbar] = useState(false);
  const [hasSelection, setHasSelection] = useState(false);

  // Web search is ALWAYS ACTIVE by default, can be toggled manually by user
  const [webSearchActive, setWebSearchActive] = useState<boolean>(() => {
    const saved = localStorage.getItem('maria_web_search_active');
    return saved !== null ? saved === 'true' : true; // Default ON
  });

  const editorRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Sync loadedText into contentEditable
  useEffect(() => {
    if (loadedText && editorRef.current) {
      editorRef.current.innerText = loadedText;
      setText(loadedText);
      editorRef.current.focus();
      const timer = setTimeout(() => {
        onClearLoadedText?.();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [loadedText, onClearLoadedText]);

  // Check selection to display floating format menu
  const handleSelect = () => {
    const sel = window.getSelection();
    if (sel && editorRef.current && editorRef.current.contains(sel.anchorNode)) {
      const selectedStr = sel.toString();
      setHasSelection(selectedStr.trim().length > 0);
    } else {
      setHasSelection(false);
    }
  };

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

  // Helper to replace text matching WhatsApp syntax (*word*, _word_, ~word~, `word`)
  // with an inline formatted DOM element immediately while typing
  const checkAndApplyInlineFormatting = () => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    const node = range.startContainer;
    if (node.nodeType !== Node.TEXT_NODE) return;

    const fullText = node.textContent || '';
    const caret = range.startOffset;
    const textBeforeCaret = fullText.slice(0, caret);

    // 1. WhatsApp *bold*
    const boldMatch = textBeforeCaret.match(/(?:^|[^\w*])\*([^\s*](?:[^*]*?[^\s*])?)\*$/);
    if (boldMatch) {
      const matched = boldMatch[0];
      const innerText = boldMatch[1];
      const start = caret - matched.length + (matched.startsWith('*') ? 0 : 1);
      replaceTextWithFormattedNode(node, fullText, start, caret, 'strong', innerText, 'font-bold text-slate-950');
      return;
    }

    // 2. WhatsApp _italic_
    const italicMatch = textBeforeCaret.match(/(?:^|[^\w_])_([^\s_](?:[^_]*?[^\s_])?)_$/);
    if (italicMatch) {
      const matched = italicMatch[0];
      const innerText = italicMatch[1];
      const start = caret - matched.length + (matched.startsWith('_') ? 0 : 1);
      replaceTextWithFormattedNode(node, fullText, start, caret, 'em', innerText, 'italic text-slate-950');
      return;
    }

    // 3. WhatsApp ~strikethrough~
    const strikeMatch = textBeforeCaret.match(/(?:^|[^\w~])~([^\s~](?:[^~]*?[^\s~])?)~$/);
    if (strikeMatch) {
      const matched = strikeMatch[0];
      const innerText = strikeMatch[1];
      const start = caret - matched.length + (matched.startsWith('~') ? 0 : 1);
      replaceTextWithFormattedNode(node, fullText, start, caret, 'del', innerText, 'line-through text-slate-500');
      return;
    }

    // 4. WhatsApp `code`
    const codeMatch = textBeforeCaret.match(/(?:^|[^\w`])`([^\s`](?:[^`]*?[^\s`])?)`$/);
    if (codeMatch) {
      const matched = codeMatch[0];
      const innerText = codeMatch[1];
      const start = caret - matched.length + (matched.startsWith('`') ? 0 : 1);
      replaceTextWithFormattedNode(node, fullText, start, caret, 'code', innerText, 'font-mono bg-slate-100 text-emerald-700 px-1 py-0.5 rounded text-xs border border-slate-200');
      return;
    }
  };

  const replaceTextWithFormattedNode = (
    textNode: Node,
    fullText: string,
    start: number,
    end: number,
    tagName: string,
    innerText: string,
    className: string
  ) => {
    const before = fullText.slice(0, start);
    const after = fullText.slice(end);

    const parent = textNode.parentNode;
    if (!parent) return;

    textNode.textContent = before;

    const formattedEl = document.createElement(tagName);
    formattedEl.className = className;
    formattedEl.textContent = innerText;

    const afterNode = document.createTextNode(after || '\u00A0');

    parent.insertBefore(formattedEl, textNode.nextSibling);
    parent.insertBefore(afterNode, formattedEl.nextSibling);

    const sel = window.getSelection();
    if (sel) {
      const newRange = document.createRange();
      newRange.setStart(afterNode, 1);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);
    }

    if (editorRef.current) {
      setText(editorRef.current.innerText || '');
    }
  };

  const handleEditorInput = () => {
    if (!editorRef.current) return;
    const current = editorRef.current.innerText || '';
    setText(current);
    checkAndApplyInlineFormatting();
  };

  // Convert HTML from contentEditable into clean Markdown on submit
  const getFormattedMarkdown = (): string => {
    if (!editorRef.current) return '';
    const clone = editorRef.current.cloneNode(true) as HTMLElement;

    clone.querySelectorAll('b, strong').forEach((el) => {
      el.replaceWith(`*${el.textContent || ''}*`);
    });
    clone.querySelectorAll('i, em').forEach((el) => {
      el.replaceWith(`_${el.textContent || ''}_`);
    });
    clone.querySelectorAll('s, del, strike').forEach((el) => {
      el.replaceWith(`~${el.textContent || ''}~`);
    });
    clone.querySelectorAll('code').forEach((el) => {
      el.replaceWith(`\`${el.textContent || ''}\``);
    });
    clone.querySelectorAll('br').forEach((el) => {
      el.replaceWith('\n');
    });
    clone.querySelectorAll('div, p').forEach((el) => {
      el.replaceWith(`\n${el.textContent || ''}`);
    });

    return (clone.textContent || '').trim();
  };

  // Formatting commands for toolbar buttons
  const applyExecCommand = (cmd: string, val: string = '') => {
    document.execCommand(cmd, false, val);
    if (editorRef.current) {
      setText(editorRef.current.innerText || '');
      editorRef.current.focus();
    }
    setHasSelection(false);
  };

  const applyCodeFormat = () => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    const selectedText = range.toString();

    if (selectedText) {
      const codeEl = document.createElement('code');
      codeEl.className = 'font-mono bg-white/20 text-emerald-300 px-1 py-0.5 rounded text-xs';
      codeEl.textContent = selectedText;

      range.deleteContents();
      range.insertNode(codeEl);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    } else {
      applyExecCommand('fontName', 'monospace');
    }

    if (editorRef.current) {
      setText(editorRef.current.innerText || '');
      editorRef.current.focus();
    }
    setHasSelection(false);
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

  // Clipboard Paste
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
  const handleSubmit = () => {
    const rawContent = getFormattedMarkdown();
    if ((!rawContent.trim() && attachments.length === 0) || isLoading) return;

    const contentToSend = autoFormatMarkdown(rawContent);

    speechService.unlockAudio();

    const effectiveMode = webSearchActive && activeMode === 'general' ? 'search' : activeMode;
    onSendMessage(
      contentToSend,
      effectiveMode,
      activeMode === 'image' ? { imageSize, aspectRatio } : undefined,
      attachments.length > 0 ? attachments : undefined,
      webSearchActive
    );

    if (editorRef.current) {
      editorRef.current.innerHTML = '';
    }
    setText('');
    setAttachments([]);
    setIsAttachmentOpen(false);
    setShowFormatToolbar(false);
    setHasSelection(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
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
        if (currentTranscript && editorRef.current) {
          const prev = editorRef.current.innerText;
          editorRef.current.innerText = prev ? `${prev} ${currentTranscript}` : currentTranscript;
          setText(editorRef.current.innerText);
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
  const isFormattingActive = hasFormattingSyntax(text);

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

      {/* Top Controls Row: Web Search Toggle & Live Preview */}
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
                ? 'bg-slate-900 text-white border-2 border-slate-900'
                : 'bg-white hover:bg-slate-100 text-slate-600 border-2 border-slate-300'
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
          <span className="text-[10px] font-semibold text-slate-700 uppercase tracking-wider">
            Mode {activeMode}
          </span>
        )}
      </div>

      {/* Live WhatsApp Format Preview Badge */}
      {isFormattingActive && (
        <div className="flex items-center gap-2 px-3 py-1 mb-2 rounded-full bg-slate-900/95 dark:bg-[#0c1222] border-2 border-white text-xs text-white shadow-xl animate-in fade-in max-w-fit">
          <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
            Format Langsung:
          </span>
          <div className="text-white font-medium text-xs leading-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => <span>{children}</span>,
                strong: ({ children }) => <strong className="font-bold text-white">{children}</strong>,
                em: ({ children }) => <em className="italic text-white">{children}</em>,
                del: ({ children }) => <del className="line-through text-white/80">{children}</del>,
                code: ({ children }) => (
                  <code className="px-1 py-0.5 rounded bg-white/20 font-mono text-[11px] text-emerald-300">
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
        <div className="mb-2 p-2 rounded-2xl bg-white dark:bg-[#0f172a] border-2 border-white dark:border-white shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-xs">
          <div className="grid grid-cols-2 gap-1.5">
            {/* Foto & Gambar */}
            <button
              type="button"
              onClick={() => mediaInputRef.current?.click()}
              className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-[#1e293b] text-slate-800 dark:text-slate-200 text-left transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/30 text-white flex items-center justify-center shrink-0">
                <ImageIcon className="w-4 h-4 text-white" />
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
              className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-[#1e293b] text-slate-800 dark:text-slate-200 text-left transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/30 text-white flex items-center justify-center shrink-0">
                <Film className="w-4 h-4 text-white" />
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
              className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-[#1e293b] text-slate-800 dark:text-slate-200 text-left transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/30 text-white flex items-center justify-center shrink-0">
                <Camera className="w-4 h-4 text-white" />
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
              className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-[#1e293b] text-slate-800 dark:text-slate-200 text-left transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/30 text-white flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold truncate">Dokumen</div>
                <div className="text-[10px] text-slate-400">PDF, TXT, CSV</div>
              </div>
            </button>

            {/* Format Teks */}
            <button
              type="button"
              onClick={() => {
                setShowFormatToolbar((prev) => !prev);
                setIsAttachmentOpen(false);
              }}
              className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-[#1e293b] text-slate-800 dark:text-slate-200 text-left transition-colors col-span-2 border-t border-slate-200 dark:border-slate-800 pt-2.5"
            >
              <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/30 text-white flex items-center justify-center shrink-0">
                <Type className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold truncate">Format Teks WhatsApp (*tebal*, _miring_, ~coret~, `kode`)</div>
                <div className="text-[10px] text-slate-400">Langsung berubah saat diketik</div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Attachments Preview Tray */}
      {attachments.length > 0 && (
        <div className="mb-2 p-2 rounded-2xl bg-white dark:bg-[#0c1222] border-2 border-white dark:border-white flex flex-wrap gap-2 items-center shadow-md animate-in fade-in">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="relative group flex items-center gap-2 p-1.5 pr-2.5 rounded-xl bg-slate-50 dark:bg-[#14203a] border border-slate-200 dark:border-white/30 shadow-2xs max-w-xs"
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
                <div className="w-10 h-10 rounded-lg bg-white/10 border border-white/30 flex items-center justify-center text-white">
                  <FileText className="w-5 h-5" />
                </div>
              )}
              <div className="min-w-0 text-xs">
                <div className="font-semibold truncate max-w-[120px] text-slate-900 dark:text-white">
                  {att.name}
                </div>
                <div className="text-[10px] text-white/70 font-medium">
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

      {/* Main Floating Pill Input Bar (Crisp White Capsule on White Dock) */}
      <div className="relative flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-white border-2 border-slate-300 hover:border-slate-400 focus-within:border-slate-800 focus-within:ring-2 focus-within:ring-slate-200 shadow-sm transition-all duration-200">
        {/* Plus Button (+) */}
        <button
          type="button"
          onClick={() => setIsAttachmentOpen((prev) => !prev)}
          title="Lampiran & Media"
          className="w-8 h-8 rounded-full bg-transparent hover:bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-700 hover:text-slate-950 transition-colors shrink-0 shadow-xs"
        >
          <Plus
            className={`w-4 h-4 transition-transform duration-200 ${
              isAttachmentOpen ? 'rotate-45 text-slate-950' : ''
            }`}
          />
        </button>

        {/* WhatsApp Formatting Floating Mini-Menu */}
        {(showFormatToolbar || hasSelection) && (
          <div className="absolute bottom-full left-4 sm:left-8 mb-2 p-1.5 rounded-2xl bg-white border-2 border-slate-300 shadow-2xl flex items-center gap-1.5 z-30 animate-in fade-in zoom-in-95 text-xs">
            <span className="text-[10px] text-slate-700 font-bold px-1.5 hidden sm:inline">
              Format WhatsApp:
            </span>
            <button
              type="button"
              onClick={() => applyExecCommand('bold')}
              title="Tebal (*teks*)"
              className="px-2.5 h-7 rounded-lg font-bold text-slate-900 hover:bg-slate-100 flex items-center justify-center transition-colors gap-1 border border-slate-200"
            >
              <span>B</span>
              <span className="text-[9px] text-slate-500 font-normal hidden sm:inline">*</span>
            </button>
            <button
              type="button"
              onClick={() => applyExecCommand('italic')}
              title="Miring (_teks_)"
              className="px-2.5 h-7 rounded-lg italic font-serif text-slate-900 hover:bg-slate-100 flex items-center justify-center transition-colors gap-1 border border-slate-200"
            >
              <span>I</span>
              <span className="text-[9px] text-slate-500 font-normal hidden sm:inline">_</span>
            </button>
            <button
              type="button"
              onClick={() => applyExecCommand('strikeThrough')}
              title="Coret (~teks~)"
              className="px-2.5 h-7 rounded-lg line-through text-slate-900 hover:bg-slate-100 flex items-center justify-center transition-colors gap-1 border border-slate-200"
            >
              <span>S</span>
              <span className="text-[9px] text-slate-500 font-normal hidden sm:inline">~</span>
            </button>
            <button
              type="button"
              onClick={applyCodeFormat}
              title="Kode (`teks`)"
              className="px-2 h-7 rounded-lg font-mono text-[11px] text-slate-900 hover:bg-slate-100 flex items-center justify-center transition-colors border border-slate-200"
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
          className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors shrink-0 shadow-xs ${
            showFormatToolbar || hasSelection
              ? 'bg-slate-100 border-slate-400 text-slate-950 font-bold'
              : 'bg-transparent hover:bg-slate-100 border-slate-300 text-slate-700 hover:text-slate-950'
          }`}
        >
          <Type className="w-4 h-4" />
        </button>

        {/* WhatsApp-Style Rich WYSIWYG Editable Input Box */}
        <div
          ref={editorRef}
          contentEditable
          role="textbox"
          aria-multiline="true"
          data-placeholder="Tanya Maria..."
          onInput={handleEditorInput}
          onSelect={handleSelect}
          onKeyUp={handleSelect}
          onMouseUp={handleSelect}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          className="flex-1 bg-transparent border-0 py-1.5 px-1.5 text-sm text-[#0f172a] focus:outline-none min-h-[28px] max-h-32 overflow-y-auto leading-relaxed select-text empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 empty:before:pointer-events-none empty:before:select-none break-words"
          style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
        />

        {/* Right Section: Divider | Mic | Send Button */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Subtle Vertical Divider */}
          <div className="h-5 w-px bg-slate-300 my-auto" />

          {/* Microphone Button */}
          <button
            type="button"
            onClick={toggleRecording}
            title={isRecording ? 'Berhenti mendengarkan' : 'Dikte suara'}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              isRecording
                ? 'bg-rose-500 text-white animate-pulse border-2 border-rose-300'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          {/* Send Button OR Waveform Voice Button */}
          {hasInput ? (
            <button
              type="button"
              disabled={isLoading}
              onClick={() => handleSubmit()}
              title="Kirim pesan (*bold* otomatis diformat)"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-900 hover:bg-slate-800 active:scale-95 text-white flex items-center justify-center shadow-md shrink-0 transition-all font-bold border border-slate-900"
            >
              <Send className="w-4 h-4 ml-0.5 text-white" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleVoiceWaveClick}
              title="Mode Suara Maria AI"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-300 flex items-center justify-center shadow-xs shrink-0 hover:bg-emerald-100 transition-colors"
            >
              <div className="flex items-center gap-[2px] h-3.5">
                <span className="w-[2px] h-2 bg-emerald-600 rounded-full" />
                <span className="w-[2px] h-3.5 bg-emerald-600 rounded-full" />
                <span className="w-[2px] h-2.5 bg-emerald-600 rounded-full" />
                <span className="w-[2px] h-3 bg-emerald-600 rounded-full" />
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Sub-label Bawah (Direct link to /cookies.html without any modal) */}
      <div className="flex items-center justify-center gap-1.5 pt-2 pb-1 select-none text-[10px] font-medium tracking-wider text-slate-400 uppercase flex-wrap">
        <span>MARIA ADALAH AI YANG DAPAT MELAKUKAN KESALAHAN</span>
        <span className="text-slate-400">•</span>
        <a
          href="/cookies.html"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-slate-950 transition-colors cursor-pointer normal-case tracking-normal text-[10px] text-slate-600 hover:text-slate-950 font-semibold inline-flex items-center gap-1"
        >
          <span>Kebijakan Cookie</span>
        </a>
      </div>
    </div>
  );
};
