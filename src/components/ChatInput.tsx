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
  AlertCircle,
  Play,
  Pause,
  Files,
  Trash2,
  Lock,
  ChevronLeft,
  ChevronUp,
  Volume2,
} from 'lucide-react';
import { AiMode, MediaAttachment } from '../types/index.ts';
import { speechService } from '../lib/speechService.ts';
import { autoFormatMarkdown, hasFormattingSyntax } from '../lib/formatUtils.ts';
import {
  formatBytes,
  formatAudioDuration,
  getMediaType,
  readFileAsDataUrl,
  extractBase64,
  generateImageThumbnail,
  generateVideoThumbnail,
  storeOriginalMedia,
  storeOriginalMediaBlob,
  storeMediaBase64,
  storeOriginalFile,
  storeMediaFileUri,
  uploadMediaToGemini,
} from '../lib/mediaUtils.ts';
import { MediaLightboxModal, LightboxMedia } from './MediaLightboxModal.tsx';
import { ActionBottomSheet } from './ActionBottomSheet.tsx';
import { useLanguage } from '../context/LanguageContext.tsx';
import { loadEnabledConnectors } from '../lib/workspaceStore.ts';
import {
  getAllPlugins,
  loadCustomConnectors,
  loadConnectorSuggestions,
  PluginEntry,
} from '../lib/pluginsCatalog.ts';
import { PluginBrandIcon } from './PluginBrandIcon.tsx';

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
  loadedText?: string;
  onClearLoadedText?: () => void;
  isPlus?: boolean;
  onOpenPlusModal?: () => void;
  enterToSend?: boolean;
  voiceLanguage?: 'auto' | 'id-ID' | 'en-US';
  webSearchDefault?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = React.memo(({
  onSendMessage,
  isLoading,
  activeMode,
  onModeChange,
  loadedText,
  onClearLoadedText,
  onOpenImageStudio,
  onOpenMusicVoice,
  onOpenCanvasCode,
  isPlus = false,
  onOpenPlusModal,
  enterToSend = true,
  voiceLanguage = 'auto',
  webSearchDefault = true,
}) => {
  const { isEn } = useLanguage();
  const [text, setText] = useState('');
  const [isAttachmentOpen, setIsAttachmentOpen] = useState(false);
  const [imageSize] = useState<'1K' | '2K' | '4K'>('1K');
  const [aspectRatio] = useState<'1:1' | '16:9' | '9:16' | '4:3'>('1:1');
  const [isRecording, setIsRecording] = useState(false);
  const [vnState, setVnState] = useState<'idle' | 'holding' | 'locked'>('idle');
  const [vnPaused, setVnPaused] = useState(false);
  const [vnElapsed, setVnElapsed] = useState(0);
  const [vnDragOffset, setVnDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [vnLevels, setVnLevels] = useState<number[]>(() => Array(22).fill(0.16));
  const [attachments, setAttachments] = useState<MediaAttachment[]>([]);
  const [uploadAlert, setUploadAlert] = useState<{ filename: string; title: string; reason: string } | null>(null);
  const [lightboxMedia, setLightboxMedia] = useState<LightboxMedia | null>(null);
  const [showFormatToolbar, setShowFormatToolbar] = useState(false);
  const [hasSelection, setHasSelection] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);

  // Web search is ALWAYS ACTIVE by default, can be toggled manually by user
  const [webSearchActive, setWebSearchActive] = useState<boolean>(() => {
    const saved = localStorage.getItem('maria_web_search_active');
    return saved !== null ? saved === 'true' : webSearchDefault;
  });

  useEffect(() => {
    setWebSearchActive(webSearchDefault);
  }, [webSearchDefault]);

  const editorRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const allFileInputRef = useRef<HTMLInputElement>(null);

  // WhatsApp-style Voice Note Recorder refs
  const vnStateRef = useRef<'idle' | 'holding' | 'locked'>('idle');
  const vnActionRef = useRef<'pending' | 'send' | 'cancel'>('pending');
  const vnCancelledDuringInitRef = useRef(false);
  const vnPointerStartRef = useRef<{ x: number; y: number; downAt: number; pointerId: number } | null>(null);
  const vnMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const vnStreamRef = useRef<MediaStream | null>(null);
  const vnAudioCtxRef = useRef<AudioContext | null>(null);
  const vnTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const vnMeterTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const vnChunksRef = useRef<Blob[]>([]);
  const vnWaveformRef = useRef<number[]>([]);
  const vnStartMsRef = useRef<number>(0);
  const vnPausedTotalMsRef = useRef<number>(0);
  const vnPauseStartedAtRef = useRef<number | null>(null);

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
    const match = current.match(/(?:^|\s)@([a-zA-Z0-9_-]*)$/);
    setMentionQuery(match ? match[1] : null);
    checkAndApplyInlineFormatting();
  };

  const handlePickMention = (plugin: PluginEntry) => {
    if (!editorRef.current) return;
    const current = editorRef.current.innerText || '';
    const updated = current.replace(/(?:^|\s)@([a-zA-Z0-9_-]*)$/, (full) => {
      const lead = full.startsWith(' ') || full.startsWith('\n') ? full[0] : '';
      return `${lead}${plugin.mentionTag} `;
    });
    editorRef.current.innerText = updated;
    setText(updated);
    setMentionQuery(null);
    editorRef.current.focus();
    const sel = window.getSelection();
    if (sel) {
      const range = document.createRange();
      range.selectNodeContents(editorRef.current);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }
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

  // Process files concurrently into MediaAttachment objects with offline pre-loading
  const processFiles = useCallback(async (files: FileList | File[]) => {
    const filesArr = Array.from(files);
    if (filesArr.length === 0) return;

    // 1. Immediately create pending attachments with local blob URL and isLoading: true
    // so user instantly sees the preview card with the loading circular spinner
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

    // 2. Concurrently read and prepare media/file data for the AI
    await Promise.all(
      pendingItems.map(async ({ file, id }) => {
        try {
          // Prepare thumbnail + MIME and avoid giant base64 strings for videos/large files (>6 MB)
          const mediaType = getMediaType(file);
          const originalUrl = URL.createObjectURL(file);
          storeOriginalMedia(id, originalUrl);
          storeOriginalMedia(file.name, originalUrl);
          storeOriginalFile(id, file);
          storeOriginalFile(file.name, file);
          await storeOriginalMediaBlob(id, file);
          await storeOriginalMediaBlob(file.name, file);

          let previewUrl = '';
          if (mediaType === 'image') {
            previewUrl = await generateImageThumbnail(file, 480, 0.72);
          } else if (mediaType === 'video') {
            previewUrl = await generateVideoThumbnail(file);
          }

          let detectedMime = (file.type || '').split(';')[0].trim().toLowerCase();
          if (!detectedMime || detectedMime === 'application/octet-stream') {
            const lowerName = file.name.toLowerCase();
            if (lowerName.endsWith('.md') || lowerName.endsWith('.markdown')) detectedMime = 'text/markdown';
            else if (lowerName.endsWith('.txt')) detectedMime = 'text/plain';
            else if (lowerName.endsWith('.json')) detectedMime = 'application/json';
            else if (lowerName.endsWith('.csv')) detectedMime = 'text/csv';
            else if (lowerName.endsWith('.pdf')) detectedMime = 'application/pdf';
            else if (lowerName.endsWith('.mp4')) detectedMime = 'video/mp4';
            else if (lowerName.endsWith('.webm')) detectedMime = 'video/webm';
            else if (lowerName.endsWith('.mov')) detectedMime = 'video/quicktime';
            else if (lowerName.endsWith('.3gp')) detectedMime = 'video/3gpp';
            else if (lowerName.endsWith('.avi')) detectedMime = 'video/x-msvideo';
            else if (lowerName.endsWith('.mkv')) detectedMime = 'video/webm';
            else if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) detectedMime = 'image/jpeg';
            else if (lowerName.endsWith('.png')) detectedMime = 'image/png';
            else if (lowerName.endsWith('.webp')) detectedMime = 'image/webp';
            else detectedMime = mediaType === 'video' ? 'video/mp4' : mediaType === 'image' ? 'image/jpeg' : 'application/octet-stream';
          }

          const shouldUseFilesApi = mediaType === 'video' || file.size > 6 * 1024 * 1024;
          let base64Data = '';
          let fileUri: string | undefined;

          if (shouldUseFilesApi) {
            // Update preview early while uploading chunks to Gemini Files API
            setAttachments((prev) =>
              prev.map((a) =>
                a.id === id
                  ? {
                      ...a,
                      previewUrl: previewUrl || originalUrl,
                      originalUrl,
                      mimeType: detectedMime,
                      progress: 45,
                    }
                  : a
              )
            );
            try {
              const uploaded = await uploadMediaToGemini(file, file.name, detectedMime);
              fileUri = uploaded.fileUri;
              storeMediaFileUri(id, uploaded.fileUri);
              storeMediaFileUri(file.name, uploaded.fileUri);
            } catch (uploadErr) {
              // If file is <= 10 MB, gracefully fall back to inline base64; otherwise propagate error
              if (file.size <= 10 * 1024 * 1024) {
                const dataUrl = await readFileAsDataUrl(file);
                base64Data = extractBase64(dataUrl);
                storeMediaBase64(id, base64Data);
                storeMediaBase64(file.name, base64Data);
              } else {
                throw uploadErr;
              }
            }
          } else {
            const dataUrl = await readFileAsDataUrl(file);
            base64Data = extractBase64(dataUrl);
            storeMediaBase64(id, base64Data);
            storeMediaBase64(file.name, base64Data);
          }

          // Complete loading state - data is 100% ready for submission!
          setAttachments((prev) =>
            prev.map((a) =>
              a.id === id
                ? {
                    ...a,
                    previewUrl: previewUrl || originalUrl,
                    originalUrl,
                    base64Data,
                    fileUri,
                    mimeType: detectedMime,
                    isLoading: false,
                    progress: 100,
                  }
                : a
            )
          );
        } catch (err: any) {
          console.warn('Notice processing uploaded file:', err?.message || err);
          setAttachments((prev) => prev.filter((a) => a.id !== id));
          setUploadAlert({
            filename: file.name,
            title: isEn ? 'Unable to Process File' : 'Gagal Memproses / Mengunggah Berkas',
            reason: err?.message || (isEn ? 'This file format or size could not be uploaded.' : 'Ukuran atau format berkas tidak dapat diunggah saat ini.'),
          });
        }
      })
    );
  }, [isEn]);

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
    setMentionQuery(null);
    setAttachments([]);
    setIsAttachmentOpen(false);
    setShowFormatToolbar(false);
    setHasSelection(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape' && mentionQuery !== null) {
      e.preventDefault();
      setMentionQuery(null);
      return;
    }
    if (enterToSend && e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const isAnyUploading = attachments.some((a) => a.isLoading);
      if (!isAnyUploading && !isLoading) {
        handleSubmit();
      }
    }
  };

  // Web Speech STT Recognition (for Dikte)
  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setUploadAlert({
        filename: isEn ? 'Voice Dictation' : 'Dikte Suara',
        title: isEn ? 'Speech Recognition Unavailable' : 'Dikte Suara Belum Didukung',
        reason: isEn
          ? 'Your browser does not support SpeechRecognition. Use the Mic button to record a WhatsApp-style Voice Note instead.'
          : 'Browser ini belum mendukung dikte teks otomatis. Gunakan tombol Mikrofon untuk merekam Voice Note.',
      });
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = voiceLanguage === 'en-US' ? 'en-US' : 'id-ID';
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

  // Cleanup helpers for WhatsApp Voice Note recorder
  const cleanupVoiceNoteResources = useCallback(() => {
    if (vnTimerRef.current) {
      clearInterval(vnTimerRef.current);
      vnTimerRef.current = null;
    }
    if (vnMeterTimerRef.current) {
      clearInterval(vnMeterTimerRef.current);
      vnMeterTimerRef.current = null;
    }
    if (vnStreamRef.current) {
      vnStreamRef.current.getTracks().forEach((t) => t.stop());
      vnStreamRef.current = null;
    }
    if (vnAudioCtxRef.current) {
      vnAudioCtxRef.current.close().catch(() => {});
      vnAudioCtxRef.current = null;
    }
    vnMediaRecorderRef.current = null;
    vnPointerStartRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      vnActionRef.current = 'cancel';
      vnCancelledDuringInitRef.current = true;
      try {
        if (vnMediaRecorderRef.current && vnMediaRecorderRef.current.state !== 'inactive') {
          vnMediaRecorderRef.current.stop();
        }
      } catch {}
      cleanupVoiceNoteResources();
    };
  }, [cleanupVoiceNoteResources]);

  const downsampleWaveform = (samples: number[], targetBars: number = 28): number[] => {
    if (!samples || samples.length === 0) {
      return Array.from({ length: targetBars }, (_, i) =>
        Number((0.2 + 0.55 * Math.abs(Math.sin(i * 0.65))).toFixed(2))
      );
    }
    const result: number[] = [];
    const step = samples.length / targetBars;
    for (let i = 0; i < targetBars; i++) {
      const start = Math.floor(i * step);
      const end = Math.max(start + 1, Math.floor((i + 1) * step));
      let sum = 0;
      let count = 0;
      for (let j = start; j < end && j < samples.length; j++) {
        sum += samples[j];
        count++;
      }
      const avg = count > 0 ? sum / count : 0.2;
      result.push(Number(Math.max(0.12, Math.min(1, avg)).toFixed(2)));
    }
    return result;
  };

  const resetVoiceNoteUi = useCallback(() => {
    vnStateRef.current = 'idle';
    setVnState('idle');
    setVnPaused(false);
    setVnElapsed(0);
    setVnDragOffset({ x: 0, y: 0 });
    setVnLevels(Array(22).fill(0.16));
  }, []);

  const stopVoiceNote = useCallback(
    (action: 'send' | 'cancel') => {
      vnActionRef.current = action;
      if (action === 'cancel') {
        vnCancelledDuringInitRef.current = true;
      }
      const recorder = vnMediaRecorderRef.current;
      if (recorder && recorder.state !== 'inactive') {
        try {
          recorder.stop();
        } catch {
          cleanupVoiceNoteResources();
          resetVoiceNoteUi();
        }
      } else {
        cleanupVoiceNoteResources();
        resetVoiceNoteUi();
      }
      if (action === 'cancel') {
        resetVoiceNoteUi();
      }
    },
    [cleanupVoiceNoteResources, resetVoiceNoteUi]
  );

  const toggleVoiceNotePause = useCallback(() => {
    const recorder = vnMediaRecorderRef.current;
    if (!recorder || vnStateRef.current !== 'locked') return;
    try {
      if (recorder.state === 'recording') {
        recorder.pause();
        vnPauseStartedAtRef.current = Date.now();
        setVnPaused(true);
      } else if (recorder.state === 'paused') {
        recorder.resume();
        if (vnPauseStartedAtRef.current !== null) {
          vnPausedTotalMsRef.current += Date.now() - vnPauseStartedAtRef.current;
          vnPauseStartedAtRef.current = null;
        }
        setVnPaused(false);
      }
    } catch {
      // Some browsers don't support MediaRecorder.pause()
    }
  }, []);

  const sendRecordedVoiceNoteRef = useRef<((att: MediaAttachment) => void) | null>(null);
  sendRecordedVoiceNoteRef.current = (voiceAttachment: MediaAttachment) => {
    const rawContent = getFormattedMarkdown();
    const contentToSend = rawContent.trim() ? autoFormatMarkdown(rawContent) : '';
    const effectiveMode = webSearchActive && activeMode === 'general' ? 'search' : activeMode;
    const allAttachments = [...attachments.filter((a) => !a.isLoading), voiceAttachment];

    speechService.unlockAudio();
    onSendMessage(
      contentToSend,
      effectiveMode,
      activeMode === 'image' ? { imageSize, aspectRatio } : undefined,
      allAttachments,
      webSearchActive
    );

    if (editorRef.current) {
      editorRef.current.innerHTML = '';
    }
    setText('');
    setMentionQuery(null);
    setAttachments([]);
    setIsAttachmentOpen(false);
    setShowFormatToolbar(false);
    setHasSelection(false);
  };

  const startVoiceNoteRecording = useCallback(
    async (initialMode: 'holding' | 'locked') => {
      if (isLoading || vnStateRef.current !== 'idle') return;

      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
        setUploadAlert({
          filename: isEn ? 'Microphone' : 'Mikrofon',
          title: isEn ? 'Voice Note Unavailable' : 'Voice Note Tidak Didukung',
          reason: isEn
            ? 'Your browser does not support audio recording via MediaRecorder.'
            : 'Browser atau perangkat ini belum mendukung perekaman audio MediaRecorder.',
        });
        return;
      }

      // Stop dictation or active TTS before recording mic
      if (isRecording) {
        recognitionRef.current?.stop();
        setIsRecording(false);
      }
      speechService.stopSpeaking();

      vnCancelledDuringInitRef.current = false;
      vnActionRef.current = 'pending';
      vnChunksRef.current = [];
      vnWaveformRef.current = [];
      vnPausedTotalMsRef.current = 0;
      vnPauseStartedAtRef.current = null;

      vnStateRef.current = initialMode;
      setVnState(initialMode);
      setVnPaused(false);
      setVnElapsed(0);
      setVnDragOffset({ x: 0, y: 0 });
      setVnLevels(Array(22).fill(0.16));

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        // If user already slid to cancel or left while browser was asking permission
        if (vnCancelledDuringInitRef.current || (vnActionRef.current as string) === 'cancel') {
          stream.getTracks().forEach((t) => t.stop());
          resetVoiceNoteUi();
          return;
        }

        vnStreamRef.current = stream;

        const preferredMimes = [
          'audio/webm;codecs=opus',
          'audio/webm',
          'audio/mp4',
          'audio/ogg;codecs=opus',
        ];
        const supportedMime =
          preferredMimes.find((m) => MediaRecorder.isTypeSupported?.(m)) || '';

        const recorder = new MediaRecorder(stream, {
          ...(supportedMime ? { mimeType: supportedMime } : {}),
          audioBitsPerSecond: 32000,
        });
        vnMediaRecorderRef.current = recorder;

        // Live microphone amplitude analyzer for real waveform peaks
        try {
          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioCtx) {
            const audioCtx = new AudioCtx();
            const source = audioCtx.createMediaStreamSource(stream);
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 128;
            source.connect(analyser);
            vnAudioCtxRef.current = audioCtx;
            const freqData = new Uint8Array(analyser.frequencyBinCount);

            vnMeterTimerRef.current = setInterval(() => {
              if (!vnMediaRecorderRef.current || vnMediaRecorderRef.current.state !== 'recording') return;
              analyser.getByteTimeDomainData(freqData);
              let sumSq = 0;
              for (let i = 0; i < freqData.length; i++) {
                const v = (freqData[i] - 128) / 128;
                sumSq += v * v;
              }
              const rms = Math.sqrt(sumSq / freqData.length);
              const level = Math.max(0.12, Math.min(1, rms * 4.2));
              vnWaveformRef.current.push(level);
              setVnLevels((prev) => [...prev.slice(1), level]);
            }, 85);
          }
        } catch {
          // Graceful fallback if AudioContext fails
        }

        recorder.ondataavailable = (ev: BlobEvent) => {
          if (ev.data && ev.data.size > 0) {
            vnChunksRef.current.push(ev.data);
          }
        };

        recorder.onstop = async () => {
          const shouldSend = vnActionRef.current === 'send';
          const capturedChunks = [...vnChunksRef.current];
          const capturedWaveform = [...vnWaveformRef.current];
          const activePauseMs =
            vnPauseStartedAtRef.current !== null
              ? Date.now() - vnPauseStartedAtRef.current
              : 0;
          const totalDurationSec = Math.max(
            0.3,
            (Date.now() - vnStartMsRef.current - vnPausedTotalMsRef.current - activePauseMs) / 1000
          );
          const rawRecMime = recorder.mimeType || supportedMime || 'audio/webm';
          const cleanMime = rawRecMime.split(';')[0].trim().toLowerCase() || 'audio/webm';

          cleanupVoiceNoteResources();
          resetVoiceNoteUi();

          if (!shouldSend || capturedChunks.length === 0) return;

          const blob = new Blob(capturedChunks, { type: cleanMime });
          if (blob.size < 200 || totalDurationSec < 0.35) {
            return;
          }

          try {
            const attId = `vn_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
            const ext = cleanMime.includes('mp4')
              ? 'm4a'
              : cleanMime.includes('ogg')
              ? 'ogg'
              : 'webm';
            const durLabel = formatAudioDuration(totalDurationSec).replace(':', '-');
            const name = `Voice_Note_${durLabel}.${ext}`;
            const objectUrl = URL.createObjectURL(blob);

            storeOriginalMedia(attId, objectUrl);
            storeOriginalFile(attId, blob);
            await storeOriginalMediaBlob(attId, blob);

            const fileObj = new File([blob], name, { type: cleanMime });
            const dataUrl = await readFileAsDataUrl(fileObj);
            const base64Data = extractBase64(dataUrl);
            storeMediaBase64(attId, base64Data);

            const waveform = downsampleWaveform(capturedWaveform, 28);
            const voiceAttachment: MediaAttachment = {
              id: attId,
              name,
              size: blob.size,
              mimeType: cleanMime,
              type: 'audio',
              previewUrl: dataUrl.length <= 190000 ? dataUrl : '',
              originalUrl: objectUrl,
              base64Data,
              duration: Math.round(totalDurationSec * 10) / 10,
              waveform,
            };

            sendRecordedVoiceNoteRef.current?.(voiceAttachment);
          } catch (err: any) {
            setUploadAlert({
              filename: 'Voice Note',
              title: isEn ? 'Failed to Process Voice Note' : 'Gagal Memproses Voice Note',
              reason: err?.message || (isEn ? 'Could not save audio clip.' : 'Gagal menyimpan rekaman suara.'),
            });
          }
        };

        vnStartMsRef.current = Date.now();
        recorder.start(200);

        vnTimerRef.current = setInterval(() => {
          if (!vnMediaRecorderRef.current) return;
          if (vnMediaRecorderRef.current.state === 'recording') {
            const elapsedSec = Math.floor(
              (Date.now() - vnStartMsRef.current - vnPausedTotalMsRef.current) / 1000
            );
            setVnElapsed(Math.max(0, elapsedSec));
          }
        }, 250);

        // If the user already released before mediaRecorder initialized (e.g. quick tap), lock is active;
        // if vnActionRef became 'send' right after init, stop immediately cleanly.
        if ((vnActionRef.current as string) === 'send') {
          recorder.stop();
        }
      } catch (err: any) {
        cleanupVoiceNoteResources();
        resetVoiceNoteUi();
        setUploadAlert({
          filename: isEn ? 'Microphone Permission' : 'Izin Mikrofon',
          title: isEn ? 'Microphone Access Denied' : 'Akses Mikrofon Ditolak',
          reason:
            err?.name === 'NotAllowedError'
              ? isEn
                ? 'Please allow microphone access in your browser settings to send voice notes.'
                : 'Izinkan akses mikrofon pada browser Anda untuk merekam Voice Note.'
              : err?.message || (isEn ? 'Could not access microphone.' : 'Mikrofon tidak dapat diakses.'),
        });
      }
    },
    [cleanupVoiceNoteResources, isEn, isLoading, isRecording, resetVoiceNoteUi]
  );

  // Global pointer drag tracking during WhatsApp 'holding' gesture (slide left to cancel, slide up to lock)
  useEffect(() => {
    if (vnState !== 'holding') return;

    const handleWindowPointerMove = (e: PointerEvent) => {
      const start = vnPointerStartRef.current;
      if (!start || vnStateRef.current !== 'holding') return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;

      setVnDragOffset({
        x: Math.min(0, Math.max(-110, dx)),
        y: Math.min(0, Math.max(-72, dy)),
      });

      if (dx <= -75) {
        stopVoiceNote('cancel');
      } else if (dy <= -45) {
        vnStateRef.current = 'locked';
        setVnState('locked');
        setVnDragOffset({ x: 0, y: 0 });
      }
    };

    const handleWindowPointerUp = () => {
      const start = vnPointerStartRef.current;
      if (!start || vnStateRef.current !== 'holding') return;
      const heldMs = Date.now() - start.downAt;
      vnPointerStartRef.current = null;
      setVnDragOffset({ x: 0, y: 0 });

      // Quick tap (< 340ms) switches to hands-free Locked recorder just like tap-to-record;
      // Sustained hold (>= 340ms) sends Voice Note immediately on release like WhatsApp!
      if (heldMs < 340) {
        vnStateRef.current = 'locked';
        setVnState('locked');
      } else {
        stopVoiceNote('send');
      }
    };

    window.addEventListener('pointermove', handleWindowPointerMove);
    window.addEventListener('pointerup', handleWindowPointerUp);
    window.addEventListener('pointercancel', handleWindowPointerUp);
    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerUp);
      window.removeEventListener('pointercancel', handleWindowPointerUp);
    };
  }, [vnState, stopVoiceNote]);

  const handleMicPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (isLoading || vnStateRef.current !== 'idle') return;
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {}
    vnPointerStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      downAt: Date.now(),
      pointerId: e.pointerId,
    };
    startVoiceNoteRecording('holding');
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

  const mentionCandidates = (() => {
    if (mentionQuery === null) return [];
    const connectedIds = new Set(loadEnabledConnectors());
    const all = getAllPlugins(loadCustomConnectors());
    const allowSuggestions = loadConnectorSuggestions();
    const q = mentionQuery.toLowerCase();
    return all
      .filter((p) => {
        const isInstalled = p.source === 'core' || connectedIds.has(p.id);
        if (!allowSuggestions && !isInstalled) return false;
        if (!q) return isInstalled;
        return (
          p.name.toLowerCase().includes(q) ||
          p.mentionTag.toLowerCase().includes(q)
        );
      })
      .slice(0, 6);
  })();

  return (
    <div className="max-w-3xl mx-auto w-full px-3 sm:px-4 select-none relative">
      {mentionCandidates.length > 0 && (
        <div className="mb-2 rounded-2xl border border-slate-200 dark:border-[#2a2e3e] bg-white dark:bg-[#161822] shadow-xl p-1.5 max-h-64 overflow-y-auto animate-in fade-in duration-100">
          <div className="px-2.5 py-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500 flex items-center justify-between">
            <span>{isEn ? 'Connectors & Plugins' : 'Konektor & Plugin'}</span>
            <span>@mention</span>
          </div>
          {mentionCandidates.map((plugin) => (
            <button
              key={plugin.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                handlePickMention(plugin);
              }}
              className="w-full px-2.5 py-2 rounded-xl flex items-center justify-between gap-3 text-left hover:bg-slate-100 dark:hover:bg-[#222636] cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <PluginBrandIcon id={plugin.id} size="sm" />
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                    {plugin.name}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {isEn ? plugin.shortDescEn : plugin.shortDesc}
                  </div>
                </div>
              </div>
              <span className="text-[11px] font-mono text-blue-600 dark:text-blue-400 shrink-0">
                {plugin.mentionTag}
              </span>
            </button>
          ))}
        </div>
      )}
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
            {isEn ? 'Live Format:' : 'Format Langsung:'}
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

      {/* File Processing / Upload Error Banner */}
      {uploadAlert && (
        <div className="mb-2.5 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-700 text-rose-950 dark:text-rose-100 shadow-sm flex items-start justify-between gap-3 animate-in fade-in duration-150">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 mt-0.5">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-xs text-rose-700 dark:text-rose-300">
                {uploadAlert.title}
              </div>
              <p className="text-xs text-rose-900 dark:text-rose-200 mt-0.5 leading-snug">
                {uploadAlert.filename}: {uploadAlert.reason}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setUploadAlert(null)}
            className="p-1 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-200/60 dark:hover:bg-rose-900/50 shrink-0 cursor-pointer"
            title={isEn ? 'Dismiss notice' : 'Tutup notifikasi'}
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
              ) : att.type === 'audio' ? (
                <div className="w-full h-full p-2 flex flex-col items-center justify-center bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-200 text-center">
                  <Volume2 className="w-6 h-6 text-blue-600 dark:text-blue-400 mb-0.5" />
                  <span className="text-[9px] font-semibold truncate max-w-[56px]">
                    {att.duration ? formatAudioDuration(att.duration) : att.name}
                  </span>
                </div>
              ) : (
                <div className="w-full h-full p-2 flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-center">
                  <FileText className="w-6 h-6 text-blue-500 mb-0.5" />
                  <span className="text-[9px] font-semibold truncate max-w-[56px]">
                    {att.name}
                  </span>
                </div>
              )}

              {/* Circular Loading Spinner while file is downloading/processing offline data (On-track concentric ring) */}
              {att.isLoading && (
                <div className="absolute inset-0 bg-black/55 flex items-center justify-center z-10">
                  <svg
                    className="w-6 h-6 sm:w-7 sm:h-7 animate-spin text-white block"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="9.5"
                      stroke="currentColor"
                      strokeOpacity="0.28"
                      strokeWidth="2.8"
                    />
                    <circle
                      cx="12"
                      cy="12"
                      r="9.5"
                      stroke="currentColor"
                      strokeWidth="2.8"
                      strokeLinecap="round"
                      strokeDasharray="16 44"
                    />
                  </svg>
                </div>
              )}

              {/* Close Button on Top Right (Matching Video) */}
              <button
                type="button"
                onClick={() => removeAttachment(att.id)}
                aria-label={isEn ? 'Remove Attachment' : 'Hapus Lampiran'}
                className="w-5 h-5 rounded-full bg-black/75 hover:bg-black text-white flex items-center justify-center absolute top-1 right-1 z-20 shadow-md cursor-pointer active:scale-90"
              >
                <X className="w-3 h-3 stroke-[2.5]" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Main Floating Pill Input Bar OR WhatsApp-Style Voice Note Recording Bar */}
      {vnState === 'holding' ? (
        <div className="relative flex items-center justify-between gap-2 px-3.5 sm:px-4 py-2 rounded-full border-2 shadow-sm bg-white border-blue-400 dark:bg-[#171920] dark:border-blue-500/70 transition-colors">
          {/* Floating Lock Pill Above Right Mic Button (Exact WhatsApp UX) */}
          <div
            className={`absolute -top-16 right-2 w-10 py-2 rounded-full border shadow-xl flex flex-col items-center justify-center gap-0.5 pointer-events-none transition-all duration-150 ${
              vnDragOffset.y <= -24
                ? 'bg-blue-600 border-blue-500 text-white scale-110'
                : 'bg-white dark:bg-[#1e212b] border-slate-200 dark:border-[#343846] text-slate-700 dark:text-slate-200'
            }`}
            style={{
              transform: `translateY(${Math.max(-10, vnDragOffset.y * 0.25)}px)`,
            }}
          >
            <Lock className="w-3.5 h-3.5" />
            <ChevronUp className="w-3.5 h-3.5 opacity-75 animate-bounce" />
          </div>

          {/* Left: Pulsing Red Mic + Elapsed Timer */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
            </span>
            <Mic className="w-4 h-4 text-rose-500 shrink-0" />
            <span className="text-sm font-mono font-semibold tabular-nums text-slate-900 dark:text-white min-w-[38px]">
              {formatAudioDuration(vnElapsed)}
            </span>
          </div>

          {/* Center: Slide to cancel prompt */}
          <div
            className={`flex items-center justify-center gap-1 text-xs font-medium flex-1 min-w-0 transition-colors ${
              vnDragOffset.x <= -38
                ? 'text-rose-500 dark:text-rose-400'
                : 'text-slate-500 dark:text-slate-400'
            }`}
            style={{
              transform: `translateX(${vnDragOffset.x * 0.45}px)`,
              opacity: Math.max(0.25, 1 + vnDragOffset.x / 95),
            }}
          >
            <ChevronLeft className="w-3.5 h-3.5 shrink-0 animate-pulse" />
            <span className="truncate">
              {isEn ? 'Slide to cancel' : 'Geser untuk membatalkan'}
            </span>
          </div>

          {/* Right: Active Blue Glowing Mic Indicator following slide gesture */}
          <div
            className="w-10 h-10 -my-1 rounded-full bg-blue-600 text-white shadow-lg ring-4 ring-blue-500/25 flex items-center justify-center shrink-0 pointer-events-none"
            style={{
              transform: `translate3d(${vnDragOffset.x * 0.55}px, ${vnDragOffset.y * 0.45}px, 0) scale(1.06)`,
            }}
          >
            <Mic className="w-5 h-5" />
          </div>
        </div>
      ) : vnState === 'locked' ? (
        <div className="relative flex items-center justify-between gap-2 px-3 sm:px-4 py-2 rounded-full border-2 shadow-sm bg-white border-blue-400 dark:bg-[#171920] dark:border-blue-500/70">
          {/* Left: Trash Cancel + Live Timer */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => stopVoiceNote('cancel')}
              title={isEn ? 'Discard voice note' : 'Hapus rekaman suara'}
              className="w-8 h-8 rounded-full flex items-center justify-center text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/15 active:scale-95 cursor-pointer transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  vnPaused ? 'bg-amber-500' : 'bg-rose-500 animate-pulse'
                }`}
              />
              <span className="text-xs sm:text-sm font-mono font-semibold tabular-nums text-slate-900 dark:text-white min-w-[38px]">
                {formatAudioDuration(vnElapsed)}
              </span>
            </div>
          </div>

          {/* Center: Live Reactive Audio Equalizer Waveform */}
          <div
            className="flex-1 flex items-center justify-center gap-[2.5px] h-7 px-2 overflow-hidden"
            aria-hidden="true"
          >
            {vnLevels.map((lvl, idx) => (
              <span
                key={idx}
                className={`w-[2.5px] rounded-full transition-all duration-75 ${
                  vnPaused
                    ? 'bg-slate-300 dark:bg-slate-600'
                    : 'bg-blue-500 dark:bg-blue-400'
                }`}
                style={{
                  height: `${Math.round(Math.max(4, (vnPaused ? 0.2 : lvl) * 24))}px`,
                }}
              />
            ))}
          </div>

          {/* Right: Pause/Resume + Send Voice Note */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={toggleVoiceNotePause}
              title={
                vnPaused
                  ? isEn
                    ? 'Resume recording'
                    : 'Lanjutkan rekaman'
                  : isEn
                  ? 'Pause recording'
                  : 'Jeda rekaman'
              }
              className="w-8 h-8 rounded-full border border-slate-200 dark:border-[#343846] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 flex items-center justify-center cursor-pointer active:scale-95"
            >
              {vnPaused ? <Mic className="w-4 h-4 text-rose-500" /> : <Pause className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={() => stopVoiceNote('send')}
              title={isEn ? 'Send voice note' : 'Kirim pesan suara'}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-md flex items-center justify-center cursor-pointer active:scale-95 transition-colors"
            >
              <Send className="w-4 h-4 ml-0.5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="relative flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full border-2 shadow-sm bg-white border-slate-300 hover:border-slate-400 focus-within:border-slate-800 focus-within:ring-2 focus-within:ring-slate-200 dark:bg-[#171920] dark:border-[#2a2d3a] dark:hover:border-[#383c4c] dark:focus-within:border-blue-500/70 dark:focus-within:ring-blue-500/20">
          {/* Plus Button (+) */}
          <button
            type="button"
            onClick={() => setIsAttachmentOpen((prev) => !prev)}
            title={isEn ? 'Attachments & Media' : 'Lampiran & Media'}
            className="w-8 h-8 rounded-full bg-transparent border flex items-center justify-center shrink-0 shadow-xs border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-950 dark:border-[#343846] dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <Plus
              className={`w-4 h-4 transition-transform duration-150 ${
                isAttachmentOpen ? 'rotate-45 text-slate-950 dark:text-white' : ''
              }`}
            />
          </button>

          {/* WhatsApp Formatting Floating Mini-Menu (Shown when text is selected/highlighted) */}
          {hasSelection && (
            <div className="absolute bottom-full left-4 sm:left-8 mb-2 p-1.5 rounded-2xl bg-white dark:bg-[#1e2029] border-2 border-slate-300 dark:border-[#343846] shadow-2xl flex items-center gap-1.5 z-30 text-xs">
              <span className="text-[10px] text-slate-700 dark:text-slate-300 font-bold px-1.5 hidden sm:inline">
                {isEn ? 'WhatsApp Format:' : 'Format WhatsApp:'}
              </span>
              <button
                type="button"
                onClick={() => applyExecCommand('bold')}
                title={isEn ? 'Bold (*text*)' : 'Tebal (*teks*)'}
                className="px-2.5 h-7 rounded-lg font-bold text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10 flex items-center justify-center gap-1 border border-slate-200 dark:border-slate-700"
              >
                <span>B</span>
                <span className="text-[9px] text-slate-500 font-normal hidden sm:inline">*</span>
              </button>
              <button
                type="button"
                onClick={() => applyExecCommand('italic')}
                title={isEn ? 'Italic (_text_)' : 'Miring (_teks_)'}
                className="px-2.5 h-7 rounded-lg italic font-serif text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10 flex items-center justify-center gap-1 border border-slate-200 dark:border-slate-700"
              >
                <span>I</span>
                <span className="text-[9px] text-slate-500 font-normal hidden sm:inline">_</span>
              </button>
              <button
                type="button"
                onClick={() => applyExecCommand('strikeThrough')}
                title={isEn ? 'Strikethrough (~text~)' : 'Coret (~teks~)'}
                className="px-2.5 h-7 rounded-lg line-through text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10 flex items-center justify-center gap-1 border border-slate-200 dark:border-slate-700"
              >
                <span>S</span>
                <span className="text-[9px] text-slate-500 font-normal hidden sm:inline">~</span>
              </button>
              <button
                type="button"
                onClick={applyCodeFormat}
                title={isEn ? 'Code (`text`)' : 'Kode (`teks`)'}
                className="px-2 h-7 rounded-lg font-mono text-[11px] text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10 flex items-center justify-center border border-slate-200 dark:border-slate-700"
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
            data-placeholder={isEn ? 'Ask Maria...' : 'Tanya Maria...'}
            onInput={handleEditorInput}
            onSelect={handleSelect}
            onKeyUp={handleSelect}
            onMouseUp={handleSelect}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            className="flex-1 bg-transparent border-0 py-1.5 px-1.5 text-sm focus:outline-none min-h-[28px] max-h-32 overflow-y-auto leading-relaxed select-text empty:before:content-[attr(data-placeholder)] empty:before:pointer-events-none empty:before:select-none break-words text-[#0f172a] empty:before:text-slate-400 dark:text-slate-100 dark:empty:before:text-slate-500"
            style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
          />

          {/* Right Section: Divider | Voice Note Mic | Dictation/Send Button */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Subtle Vertical Divider */}
            <div className="h-5 w-px my-auto bg-slate-300 dark:bg-slate-700" />

            {/* WhatsApp-Style Hold-or-Tap Voice Note Mic Button */}
            <button
              type="button"
              onPointerDown={handleMicPointerDown}
              disabled={isLoading}
              title={
                isEn
                  ? 'Hold to record Voice Note (slide left to cancel, slide up or tap to lock)'
                  : 'Tahan untuk rekam Voice Note (geser kiri batal, geser atas / ketuk kunci)'
              }
              className="w-8 h-8 rounded-full flex items-center justify-center touch-none select-none cursor-pointer text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:text-slate-400 dark:hover:text-blue-400 dark:hover:bg-blue-500/15 transition-colors disabled:opacity-40"
            >
              <Mic className="w-4 h-4" />
            </button>

            {/* Send Button OR Live Dictation Wave Button */}
            {hasInput ? (
              isAnyUploading ? (
                <button
                  type="button"
                  disabled={true}
                  title={isEn ? 'Processing & verifying offline file...' : 'Sedang memproses & memverifikasi berkas offline...'}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 flex items-center justify-center shadow-xs shrink-0 cursor-not-allowed border border-slate-300 dark:border-slate-600"
                >
                  <div className="w-4 h-4 border-2 border-slate-400 border-t-slate-800 dark:border-t-white rounded-full animate-spin" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleSubmit()}
                  title={isEn ? 'Send message (*bold* auto-formatted)' : 'Kirim pesan (*bold* otomatis diformat)'}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full active:scale-95 flex items-center justify-center shadow-md shrink-0 font-bold border cursor-pointer bg-slate-900 hover:bg-slate-800 text-white border-slate-900 dark:bg-white dark:hover:bg-slate-200 dark:text-slate-900 dark:border-white"
                >
                  <Send className="w-4 h-4 ml-0.5" />
                </button>
              )
            ) : (
              <button
                type="button"
                onClick={handleVoiceWaveClick}
                title={
                  isRecording
                    ? isEn
                      ? 'Stop voice dictation'
                      : 'Berhenti mendengarkan dikte'
                    : isEn
                    ? 'Voice dictation (Speech-to-Text)'
                    : 'Dikte suara ke teks'
                }
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full border flex items-center justify-center shadow-xs shrink-0 cursor-pointer transition-colors ${
                  isRecording
                    ? 'bg-rose-500 text-white border-rose-400 animate-pulse'
                    : 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/30 hover:bg-emerald-100 dark:hover:bg-emerald-500/25'
                }`}
              >
                {isRecording ? (
                  <MicOff className="w-4 h-4" />
                ) : (
                  <div className="flex items-center gap-[2px] h-3.5">
                    <span className="w-[2px] h-2 bg-emerald-600 dark:bg-emerald-400 rounded-full" />
                    <span className="w-[2px] h-3.5 bg-emerald-600 dark:bg-emerald-400 rounded-full" />
                    <span className="w-[2px] h-2.5 bg-emerald-600 dark:bg-emerald-400 rounded-full" />
                    <span className="w-[2px] h-3 bg-emerald-600 dark:bg-emerald-400 rounded-full" />
                  </div>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Sub-label Bawah */}
      <div className="flex items-center justify-center pt-2 pb-1 select-none text-[10px] font-medium tracking-wider text-slate-400 dark:text-slate-500 uppercase">
        <span>{isEn ? 'MARIA IS AN AI AND CAN MAKE MISTAKES' : 'MARIA ADALAH AI YANG DAPAT MELAKUKAN KESALAHAN'}</span>
      </div>
    </div>
  );
});
