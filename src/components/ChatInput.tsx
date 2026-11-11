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
  Wand2,
  ShieldAlert,
  Play,
  Files,
} from 'lucide-react';
import { AiMode, MediaAttachment } from '../types/index.ts';
import { speechService } from '../lib/speechService.ts';
import { autoFormatMarkdown, hasFormattingSyntax } from '../lib/formatUtils.ts';
import { guardianEngine } from '../lib/guardian/guardianEngine.ts';
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
import { ActionBottomSheet } from './ActionBottomSheet.tsx';

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
  onOpenImageStudio?: () => void;
  onOpenMusicVoice?: () => void;
  onOpenCanvasCode?: () => void;
  onOpenDefconModal?: () => void;
  loadedText?: string;
  onClearLoadedText?: () => void;
  isPlus?: boolean;
  onOpenPlusModal?: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  isLoading,
  activeMode,
  onModeChange,
  loadedText,
  onClearLoadedText,
  onOpenImageStudio,
  onOpenMusicVoice,
  onOpenCanvasCode,
  onOpenDefconModal,
  isPlus = false,
  onOpenPlusModal,
}) => {
  const [text, setText] = useState('');
  const [isAttachmentOpen, setIsAttachmentOpen] = useState(false);
  const [imageSize] = useState<'1K' | '2K' | '4K'>('1K');
  const [aspectRatio] = useState<'1:1' | '16:9' | '9:16' | '4:3'>('1:1');
  const [isRecording, setIsRecording] = useState(false);
  const [attachments, setAttachments] = useState<MediaAttachment[]>([]);
  const [defconAlert, setDefconAlert] = useState<{ filename: string; threatName: string; reason: string } | null>(null);
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
  const allFileInputRef = useRef<HTMLInputElement>(null);

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

  // Process files concurrently into MediaAttachment objects with offline pre-loading & DEFCON 5 inspection
  const processFiles = useCallback(async (files: FileList | File[]) => {
    const filesArr = Array.from(files);
    if (filesArr.length === 0) return;

    // 1. Immediately create pending attachments with local blob URL and isLoading: true
    // so user instantly sees the preview card with the loading circular spinner (like in video)
    const pendingItems = filesArr.map((file) => {
      const attId = `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const mediaType = getMediaType(file);
      const tempUrl = URL.createObjectURL(file);
      const item: MediaAttachment = {
        id: attId,
        name: file.name,
        size: file.size,
        mimeType: file.type || (mediaType === 'video' ? 'video/mp4' : mediaType === 'image' ? 'image/jpeg' : 'application/octet-stream'),
        type: mediaType,
        previewUrl: tempUrl,
        originalUrl: tempUrl,
        base64Data: '',
        isLoading: true,
        progress: 15,
      };
      return { file, id: attId, initialAtt: item };
    });

    setAttachments((prev) => [...prev, ...pendingItems.map((p) => p.initialAtt)]);

    // 2. Concurrently read, scan, and prepare 100% offline Base64 data for the AI
    await Promise.all(
      pendingItems.map(async ({ file, id }) => {
        try {
          // A. DEFCON 5 Threat Inspection
          const securityCheck = await guardianEngine.checkFile(file);
          if (securityCheck.verdict === 'threat') {
            const cat = securityCheck.name?.includes('EICAR')
              ? 'EICAR Test'
              : securityCheck.name?.includes('Binary')
              ? 'Executable'
              : 'Malware';

            guardianEngine.quarantineThreat(
              file.name,
              `chat/uploads/${file.name}`,
              securityCheck.sha256,
              file.size,
              cat
            );

            setDefconAlert({
              filename: file.name,
              threatName: securityCheck.name || 'Berkas Berbahaya Terdeteksi',
              reason: securityCheck.reason || 'Dideteksi oleh protokol pertahanan DEFCON 5',
            });

            // Remove quarantined threat immediately
            setAttachments((prev) => prev.filter((a) => a.id !== id));
            return;
          }

          // B. Read file as Data URL to get 100% offline Base64
          const dataUrl = await readFileAsDataUrl(file);
          const base64Data = extractBase64(dataUrl);
          const originalUrl = URL.createObjectURL(file);

          storeOriginalMedia(id, originalUrl);
          storeOriginalMedia(file.name, originalUrl);
          await storeOriginalMediaBlob(id, file);
          await storeOriginalMediaBlob(file.name, file);

          const mediaType = getMediaType(file);
          let previewUrl = '';
          if (mediaType === 'image') {
            previewUrl = await generateImageThumbnail(file, 480, 0.72);
          } else if (mediaType === 'video') {
            previewUrl = await generateVideoThumbnail(file);
          }

          let detectedMime = file.type;
          if (!detectedMime) {
            const lowerName = file.name.toLowerCase();
            if (lowerName.endsWith('.md') || lowerName.endsWith('.markdown')) detectedMime = 'text/markdown';
            else if (lowerName.endsWith('.txt')) detectedMime = 'text/plain';
            else if (lowerName.endsWith('.json')) detectedMime = 'application/json';
            else if (lowerName.endsWith('.csv')) detectedMime = 'text/csv';
            else if (lowerName.endsWith('.pdf')) detectedMime = 'application/pdf';
            else if (lowerName.endsWith('.mp4')) detectedMime = 'video/mp4';
            else if (lowerName.endsWith('.webm')) detectedMime = 'video/webm';
            else if (lowerName.endsWith('.mov')) detectedMime = 'video/quicktime';
            else if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) detectedMime = 'image/jpeg';
            else if (lowerName.endsWith('.png')) detectedMime = 'image/png';
            else if (lowerName.endsWith('.webp')) detectedMime = 'image/webp';
            else detectedMime = mediaType === 'video' ? 'video/mp4' : mediaType === 'image' ? 'image/jpeg' : 'application/octet-stream';
          }

          // Complete loading state - offline data is 100% ready for submission!
          setAttachments((prev) =>
            prev.map((a) =>
              a.id === id
                ? {
                    ...a,
                    previewUrl: previewUrl || originalUrl,
                    originalUrl: originalUrl || dataUrl,
                    base64Data,
                    mimeType: detectedMime,
                    isLoading: false,
                    progress: 100,
                  }
                : a
            )
          );
        } catch (err) {
          console.error('Error processing file offline:', err);
          setAttachments((prev) => prev.filter((a) => a.id !== id));
        }
      })
    );
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
    const isAnyUploading = attachments.some((a) => a.isLoading);
    const rawContent = getFormattedMarkdown();
    if ((!rawContent.trim() && attachments.length === 0) || isLoading || isAnyUploading) return;

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
      const isAnyUploading = attachments.some((a) => a.isLoading);
      if (!isAnyUploading && !isLoading) {
        handleSubmit();
      }
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

  const isAnyUploading = attachments.some((a) => a.isLoading);
  const hasInput = text.trim().length > 0 || attachments.length > 0;
  const isFormattingActive = hasFormattingSyntax(text);

  return (
    <div className="max-w-3xl mx-auto w-full px-3 sm:px-4 select-none">
      <MediaLightboxModal
        media={lightboxMedia}
        onClose={() => setLightboxMedia(null)}
      />

      {/* Hidden file inputs with full multi-file capability */}
      <input
        ref={allFileInputRef}
        type="file"
        accept="*/*"
        multiple
        className="hidden"
        onChange={handleMediaFileChange}
      />
      <input
        ref={mediaInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={handleMediaFileChange}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime,video/*"
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
        accept="*/*"
        multiple
        className="hidden"
        onChange={handleMediaFileChange}
      />



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

      {/* Action Bottom Sheet (Image 2 Design with full interactive controls) */}
      <ActionBottomSheet
        isOpen={isAttachmentOpen}
        onClose={() => setIsAttachmentOpen(false)}
        onSelectPhotosVideos={() => mediaInputRef.current?.click()}
        onSelectCamera={() => cameraInputRef.current?.click()}
        onSelectVoice={() => {
          setIsAttachmentOpen(false);
          toggleRecording();
        }}
        onSelectFiles={() => allFileInputRef.current?.click()}
        onOpenImageStudio={() => {
          setIsAttachmentOpen(false);
          onOpenImageStudio?.();
        }}
        onOpenMusicVoice={() => {
          setIsAttachmentOpen(false);
          onOpenMusicVoice?.();
        }}
        onOpenCanvasCode={() => {
          setIsAttachmentOpen(false);
          onOpenCanvasCode?.();
        }}
        deepResearchActive={activeMode === 'thinking'}
        onToggleDeepResearch={() => {
          if (activeMode === 'thinking') {
            onModeChange(webSearchActive ? 'search' : 'general');
          } else {
            onModeChange('thinking');
          }
        }}
        webSearchActive={webSearchActive}
        onToggleWebSearch={toggleWebSearch}
        isPlus={isPlus}
        onOpenPlusModal={onOpenPlusModal}
      />

      {/* Real-Time DEFCON 5 Threat Intercepted & Quarantined Banner */}
      {defconAlert && (
        <div className="mb-2.5 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/70 border-2 border-rose-300 dark:border-rose-600/80 text-rose-950 dark:text-rose-100 shadow-md flex items-start justify-between gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
              <ShieldAlert className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-xs text-rose-700 dark:text-rose-300 uppercase tracking-wide">
                  Spy Guard: Berkas Berbahaya Dicegat
                </span>
                <span className="px-2 py-0.5 rounded-full bg-rose-200/90 dark:bg-rose-900 text-rose-800 dark:text-rose-200 text-[10px] font-bold">
                  {defconAlert.threatName}
                </span>
              </div>
              <p className="text-xs text-rose-900 dark:text-rose-200 mt-1 leading-snug">
                Berkas <strong>"{defconAlert.filename}"</strong> berhasil dinetralisir dan dipindahkan ke <strong>Ruang Karantina Spy Guard</strong>. Berkas berbahaya tidak diunggah ke ruang obrolan.
              </p>
              <div className="text-[10px] text-rose-700 dark:text-rose-400 mt-1 font-medium">
                Alasan: {defconAlert.reason}
              </div>
              {onOpenDefconModal && (
                <button
                  type="button"
                  onClick={onOpenDefconModal}
                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-[11px] font-bold shadow-xs transition-all cursor-pointer"
                >
                  <span>Buka Ruang Karantina Spy Guard</span>
                </button>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setDefconAlert(null)}
            className="p-1 rounded-lg text-rose-400 hover:text-rose-700 hover:bg-rose-200/60 dark:hover:bg-rose-900/50 transition-colors shrink-0"
            title="Tutup notifikasi"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Attachments Preview Tray - Gemini-style rounded cards with circular loading spinner & instant offline preparation */}
      {attachments.length > 0 && (
        <div className="mb-2 p-1.5 flex items-center gap-2.5 overflow-x-auto max-w-full select-none animate-in fade-in">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="relative group rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 shadow-sm shrink-0 flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20"
            >
              {/* Media Preview */}
              {att.type === 'image' ? (
                <img
                  src={att.previewUrl || att.originalUrl}
                  alt={att.name}
                  onClick={() =>
                    !att.isLoading &&
                    setLightboxMedia({
                      url: att.originalUrl || att.previewUrl,
                      type: 'image',
                      name: att.name,
                      size: att.size,
                    })
                  }
                  className={`w-full h-full object-cover transition-opacity ${
                    att.isLoading ? 'opacity-50' : 'cursor-pointer hover:opacity-90'
                  }`}
                />
              ) : att.type === 'video' ? (
                <div
                  onClick={() =>
                    !att.isLoading &&
                    setLightboxMedia({
                      url: att.originalUrl || att.previewUrl,
                      type: 'video',
                      name: att.name,
                      size: att.size,
                    })
                  }
                  className={`w-full h-full relative overflow-hidden flex items-center justify-center bg-slate-950 ${
                    att.isLoading ? 'opacity-50' : 'cursor-pointer'
                  }`}
                >
                  {att.previewUrl && att.previewUrl.startsWith('data:image/') ? (
                    <img src={att.previewUrl} alt={att.name} className="w-full h-full object-cover" />
                  ) : (
                    <Film className="w-6 h-6 text-white/70" />
                  )}
                  {!att.isLoading && (
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <Play className="w-4 h-4 text-white fill-current" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full h-full p-2 flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-center">
                  <FileText className="w-6 h-6 text-blue-500 mb-0.5" />
                  <span className="text-[9px] font-semibold truncate max-w-[56px]">
                    {att.name}
                  </span>
                </div>
              )}

              {/* Circular Loading Spinner while file is downloading/processing offline data (Matching Video) */}
              {att.isLoading && (
                <div className="absolute inset-0 bg-black/55 backdrop-blur-[0.5px] flex flex-col items-center justify-center z-10">
                  <div className="relative w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center">
                    <svg className="w-6 h-6 sm:w-7 sm:h-7 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                      <circle
                        className="opacity-30"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="3"
                      />
                      <path
                        className="opacity-95"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                      />
                    </svg>
                  </div>
                </div>
              )}

              {/* Close Button on Top Right (Matching Video) */}
              <button
                type="button"
                onClick={() => removeAttachment(att.id)}
                aria-label="Hapus Lampiran"
                className="w-5 h-5 rounded-full bg-black/75 hover:bg-black text-white flex items-center justify-center absolute top-1 right-1 z-20 shadow-md cursor-pointer transition-transform active:scale-90"
              >
                <X className="w-3 h-3 stroke-[2.5]" />
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

        {/* WhatsApp Formatting Floating Mini-Menu (Shown when text is selected/highlighted) */}
        {hasSelection && (
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
            isAnyUploading ? (
              <button
                type="button"
                disabled={true}
                title="Sedang memproses & memverifikasi berkas offline..."
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 flex items-center justify-center shadow-xs shrink-0 cursor-not-allowed border border-slate-300 dark:border-slate-600 transition-all"
              >
                <div className="w-4 h-4 border-2 border-slate-400 border-t-slate-800 dark:border-t-white rounded-full animate-spin" />
              </button>
            ) : (
              <button
                type="button"
                disabled={isLoading}
                onClick={() => handleSubmit()}
                title="Kirim pesan (*bold* otomatis diformat)"
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-900 hover:bg-slate-800 active:scale-95 text-white flex items-center justify-center shadow-md shrink-0 transition-all font-bold border border-slate-900 cursor-pointer"
              >
                <Send className="w-4 h-4 ml-0.5 text-white" />
              </button>
            )
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

      {/* Sub-label Bawah */}
      <div className="flex items-center justify-center pt-2 pb-1 select-none text-[10px] font-medium tracking-wider text-slate-400 uppercase">
        <span>MARIA ADALAH AI YANG DAPAT MELAKUKAN KESALAHAN</span>
      </div>
    </div>
  );
};
