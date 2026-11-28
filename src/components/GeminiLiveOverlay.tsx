import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Plus,
  Video,
  VideoOff,
  Mic,
  MicOff,
  X,
  RefreshCw,
  MonitorUp,
  Image as ImageIcon,
  FileText,
  AlertCircle,
  CheckCircle2,
  Copy,
  ChevronDown,
  Maximize2,
  MoreVertical,
  Captions,
  Languages,
  Volume2,
  Check,
  ArrowUp,
  Sparkles,
  Bot,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.tsx';
import {
  decode24kPcmToFloat32,
  downsampleTo16kPcmBase64,
  encode16kInt16ChunksToWavBase64,
} from '../lib/liveAudioUtils.ts';
import { generateImageThumbnail, readFileAsDataUrl } from '../lib/mediaUtils.ts';
import { captureAppViewportToDataUrl } from '../lib/appScreenCapture.ts';
import { speechService } from '../lib/speechService.ts';
import { VOICE_PERSONAS } from '../constants.ts';
import { GeminiLiveOrb } from './GeminiLiveOrb.tsx';
import { MariaCharacter2D, type MariaCharacterState } from './MariaCharacter2D.tsx';
import { analyzeMariaContext, type MariaMood } from '../lib/mariaContextAnalyzer.ts';
import type { SidebarView } from './Sidebar.tsx';

export interface GeminiLiveConfig {
  voiceName: string;
  customInstruction?: string;
  userMemories?: string;
  userName?: string;
  allowEmojis?: boolean;
  voiceLanguage?: 'auto' | 'id-ID' | 'en-US';
  appLanguage?: 'Indonesia' | 'English';
  recentContext?: string;
}

interface GeminiLiveOverlayProps {
  liveConfig: GeminiLiveConfig;
  mood?: MariaMood;
  activeView?: SidebarView;
  spyGuardAlert?: boolean;
  onClose: () => void;
  onCommitLiveTurn: (role: 'user' | 'model', text: string) => void;
  onChangeVoice?: (voiceName: string) => void;
}

type LiveStatus = 'connecting' | 'listening' | 'thinking' | 'speaking' | 'muted' | 'error';

interface LiveTurnItem {
  id: string;
  role: 'user' | 'model';
  text: string;
  imagePreview?: string;
}

interface PendingLiveAttachment {
  id: string;
  name: string;
  isImage: boolean;
  previewUrl?: string;
  base64?: string;
  textContent?: string;
  metaSummary?: string;
}

export const GeminiLiveOverlay: React.FC<GeminiLiveOverlayProps> = ({
  liveConfig,
  mood = 'neutral',
  activeView = 'chat',
  spyGuardAlert = false,
  onClose,
  onCommitLiveTurn,
  onChangeVoice,
}) => {
  const { isEn } = useLanguage();

  const [status, setStatus] = useState<LiveStatus>('connecting');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenShareMode, setScreenShareMode] = useState<'display' | 'app' | 'screenshot' | null>(null);
  const [showScreenFallbackSheet, setShowScreenFallbackSheet] = useState(false);
  const [screenFallbackReason, setScreenFallbackReason] = useState<string | null>(null);
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);

  // Fullscreen Gemini Live UI controls (Videos 1, 2, 3)
  const [isFullScreen, setIsFullScreen] = useState(true);
  const [visualMode, setVisualMode] = useState<'orb' | 'mascot'>('orb');
  const [showCaptions, setShowCaptions] = useState(true);
  const [isOverflowOpen, setIsOverflowOpen] = useState(false);
  const [liveTranslation, setLiveTranslation] = useState(false);

  // Choose Voice sheet (Video 1)
  const [activeVoiceName, setActiveVoiceName] = useState(liveConfig.voiceName || 'Aoede');
  const [isVoicePickerOpen, setIsVoicePickerOpen] = useState(false);
  const [draftVoiceName, setDraftVoiceName] = useState(liveConfig.voiceName || 'Aoede');
  const [voicePreviewSubtitle, setVoicePreviewSubtitle] = useState<string>('');
  const [sessionRevision, setSessionRevision] = useState(0);

  // Shared photo / composer inside Live mode (Video 2)
  const [sharedImageCard, setSharedImageCard] = useState<{ url: string; label?: string } | null>(null);
  const [textDraft, setTextDraft] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<PendingLiveAttachment[]>([]);
  const [liveTurns, setLiveTurns] = useState<LiveTurnItem[]>([]);

  const [liveUserCaption, setLiveUserCaption] = useState('');
  const [liveModelCaption, setLiveModelCaption] = useState('');
  const [orbEnergy, setOrbEnergy] = useState(0);

  // Refs to avoid stale closures inside audio/video/VAD callbacks
  const isMutedRef = useRef(false);
  const isUnmountedRef = useRef(false);
  const isClosingRef = useRef(false);

  const transportModeRef = useRef<'ws' | 'http'>('ws');
  const wsRef = useRef<WebSocket | null>(null);
  const wsReadyRef = useRef(false);
  const wsApiErrorRef = useRef(false);

  const inputCtxRef = useRef<AudioContext | null>(null);
  const outputCtxRef = useRef<AudioContext | null>(null);
  const outputAnalyserRef = useRef<AnalyserNode | null>(null);
  const outputAnalyserDataRef = useRef<Float32Array<ArrayBuffer> | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  // HTTP fallback playback & VAD refs
  const httpAudioElRef = useRef<HTMLAudioElement | null>(null);
  const httpSpeakingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const httpHistoryRef = useRef<Array<{ role: 'user' | 'model'; content: string }>>([]);
  const httpTurnInFlightRef = useRef(false);
  const vadPreRollRef = useRef<Int16Array[]>([]);
  const vadSpeechChunksRef = useRef<Int16Array[]>([]);
  const vadIsSpeakingRef = useRef(false);
  const vadLastVoiceAtRef = useRef(0);
  const vadSpeechStartAtRef = useRef(0);
  const hasShownTtsLimitNoticeRef = useRef(false);

  const cameraStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoLoopRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isCameraOnRef = useRef(false);
  const isScreenSharingRef = useRef(false);
  const screenShareModeRef = useRef<'display' | 'app' | 'screenshot' | null>(null);
  const sharedScreenBase64Ref = useRef<string | null>(null);
  const lastVideoSentAtRef = useRef(0);
  isCameraOnRef.current = isCameraOn;
  isScreenSharingRef.current = isScreenSharing;
  screenShareModeRef.current = screenShareMode;

  const inputEnergyRef = useRef(0);
  const outputEnergyRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const plusMenuRef = useRef<HTMLDivElement | null>(null);
  const overflowMenuRef = useRef<HTMLDivElement | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const screenPickerInputRef = useRef<HTMLInputElement | null>(null);

  const userTurnBufRef = useRef('');
  const modelTurnBufRef = useRef('');
  const onCommitLiveTurnRef = useRef(onCommitLiveTurn);
  onCommitLiveTurnRef.current = onCommitLiveTurn;
  const liveConfigRef = useRef(liveConfig);
  liveConfigRef.current = liveConfig;
  const activeVoiceRef = useRef(activeVoiceName);
  activeVoiceRef.current = activeVoiceName;
  const liveTranslationRef = useRef(liveTranslation);
  liveTranslationRef.current = liveTranslation;

  const showTempNotice = useCallback((msg: string) => {
    setNoticeMessage(msg);
    setTimeout(() => {
      setNoticeMessage((prev) => (prev === msg ? null : prev));
    }, 3200);
  }, []);

  const appendLiveTurn = useCallback(
    (role: 'user' | 'model', text: string, imagePreview?: string) => {
      const clean = text.trim();
      if (!clean && !imagePreview) return;
      setLiveTurns((prev) => [
        ...prev.slice(-14),
        {
          id: `${role}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          role,
          text: clean,
          imagePreview,
        },
      ]);
    },
    []
  );

  const flushUserTurn = useCallback(() => {
    const trimmed = userTurnBufRef.current.trim();
    if (trimmed) {
      userTurnBufRef.current = '';
      appendLiveTurn('user', trimmed);
      onCommitLiveTurnRef.current('user', trimmed);
    }
  }, [appendLiveTurn]);

  const flushModelTurn = useCallback(() => {
    const trimmed = modelTurnBufRef.current.trim();
    if (trimmed) {
      modelTurnBufRef.current = '';
      appendLiveTurn('model', trimmed);
      onCommitLiveTurnRef.current('model', trimmed);
    }
  }, [appendLiveTurn]);

  const stopHttpAudioPlayback = useCallback(() => {
    if (httpSpeakingTimerRef.current) {
      clearInterval(httpSpeakingTimerRef.current);
      httpSpeakingTimerRef.current = null;
    }
    if (httpAudioElRef.current) {
      try {
        httpAudioElRef.current.pause();
        httpAudioElRef.current.src = '';
      } catch {}
      httpAudioElRef.current = null;
    }
    outputEnergyRef.current = 0;
  }, []);

  const stopAllOutputAudio = useCallback(() => {
    stopHttpAudioPlayback();
    for (const source of activeSourcesRef.current) {
      try {
        source.stop();
      } catch {
        // Ignore already stopped source
      }
    }
    activeSourcesRef.current.clear();
    outputEnergyRef.current = 0;
    if (outputCtxRef.current) {
      nextStartTimeRef.current = outputCtxRef.current.currentTime;
    } else {
      nextStartTimeRef.current = 0;
    }
  }, [stopHttpAudioPlayback]);

  const stopCameraStream = useCallback(() => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((t) => t.stop());
      cameraStreamRef.current = null;
    }
    if (cameraVideoRef.current) {
      cameraVideoRef.current.srcObject = null;
    }
    setIsCameraReady(false);
    setIsCameraOn(false);
  }, []);

  const stopScreenStream = useCallback(() => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }
    if (screenVideoRef.current) {
      screenVideoRef.current.srcObject = null;
    }
    sharedScreenBase64Ref.current = null;
    setScreenShareMode(null);
    setIsScreenSharing(false);
  }, []);

  const cleanupTransportOnly = useCallback(() => {
    if (videoLoopRef.current) {
      clearInterval(videoLoopRef.current);
      videoLoopRef.current = null;
    }
    stopAllOutputAudio();

    if (processorRef.current) {
      try {
        processorRef.current.disconnect();
      } catch {}
      processorRef.current.onaudioprocess = null;
      processorRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    if (inputCtxRef.current) {
      inputCtxRef.current.close().catch(() => {});
      inputCtxRef.current = null;
    }
    outputAnalyserRef.current = null;
    outputAnalyserDataRef.current = null;
    if (outputCtxRef.current) {
      outputCtxRef.current.close().catch(() => {});
      outputCtxRef.current = null;
    }
    if (wsRef.current) {
      try {
        if (wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'end' }));
        }
        wsRef.current.close();
      } catch {}
      wsRef.current = null;
    }
  }, [stopAllOutputAudio]);

  const cleanupAllResources = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    speechService.stopSpeaking();
    cleanupTransportOnly();
    stopCameraStream();
    stopScreenStream();
  }, [cleanupTransportOnly, stopCameraStream, stopScreenStream]);

  const handleEndSession = useCallback(() => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    flushUserTurn();
    flushModelTurn();
    cleanupAllResources();
    onClose();
  }, [cleanupAllResources, flushModelTurn, flushUserTurn, onClose]);

  const renderAppScreenToDataUrl = useCallback((): string | null => {
    return captureAppViewportToDataUrl({ includeMariaLiveDock: false });
  }, []);

  const captureCurrentVideoFrameBase64 = useCallback((): string | undefined => {
    if (!isCameraOnRef.current && isScreenSharingRef.current) {
      if (screenShareModeRef.current === 'screenshot') {
        return sharedScreenBase64Ref.current || undefined;
      }
      if (screenShareModeRef.current === 'app') {
        const dataUrl = renderAppScreenToDataUrl();
        if (dataUrl) {
          const b64 = dataUrl.split(',')[1];
          sharedScreenBase64Ref.current = b64;
          return b64;
        }
        return sharedScreenBase64Ref.current || undefined;
      }
    }

    const videoEl = isCameraOnRef.current
      ? cameraVideoRef.current
      : isScreenSharingRef.current
      ? screenVideoRef.current
      : null;

    if (!videoEl || videoEl.readyState < 2) return undefined;
    const vw = videoEl.videoWidth;
    const vh = videoEl.videoHeight;
    if (!vw || !vh) return undefined;

    const isDesktopDisplay =
      !isCameraOnRef.current &&
      isScreenSharingRef.current &&
      screenShareModeRef.current === 'display';

    const maxEdge = isDesktopDisplay ? 1280 : 896;
    const jpegQuality = isDesktopDisplay ? 0.82 : 0.74;
    const scale = Math.min(1, maxEdge / Math.max(vw, vh));
    const cw = Math.max(1, Math.round(vw * scale));
    const ch = Math.max(1, Math.round(vh * scale));

    if (!captureCanvasRef.current) {
      captureCanvasRef.current = document.createElement('canvas');
    }
    const canvas = captureCanvasRef.current;
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(videoEl, 0, 0, cw, ch);
    const dataUrl = canvas.toDataURL('image/jpeg', jpegQuality);
    return dataUrl.split(',')[1];
  }, [renderAppScreenToDataUrl]);

  const pushCurrentVideoFrameNow = useCallback(() => {
    if (isClosingRef.current || isUnmountedRef.current) return false;
    if (transportModeRef.current !== 'ws' || !wsReadyRef.current) return false;
    const socket = wsRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;

    const base64 = captureCurrentVideoFrameBase64();
    if (!base64) return false;

    lastVideoSentAtRef.current = Date.now();
    socket.send(
      JSON.stringify({
        type: 'video',
        data: base64,
        mimeType: 'image/jpeg',
      })
    );
    return true;
  }, [captureCurrentVideoFrameBase64]);

  const pushCurrentVideoFrameNowRef = useRef(pushCurrentVideoFrameNow);
  pushCurrentVideoFrameNowRef.current = pushCurrentVideoFrameNow;

  const getDeviceTimePayload = () => {
    const now = new Date();
    return {
      iso: now.toISOString(),
      localTime: now.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      localDate: now.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta',
    };
  };

  const sendHttpLiveTurn = useCallback(
    async (payload: {
      audioBase64?: string;
      imageBase64?: string;
      textPrompt?: string;
    }) => {
      if (isUnmountedRef.current || isClosingRef.current || httpTurnInFlightRef.current) return;
      httpTurnInFlightRef.current = true;
      setStatus('thinking');

      try {
        const cfg = liveConfigRef.current;
        const frame = payload.imageBase64 || captureCurrentVideoFrameBase64();
        const res = await fetch('/api/live-turn', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audioBase64: payload.audioBase64,
            audioMimeType: payload.audioBase64 ? 'audio/wav' : undefined,
            imageBase64: frame,
            imageMimeType: frame ? 'image/jpeg' : undefined,
            textPrompt: payload.textPrompt,
            history: httpHistoryRef.current.slice(-8),
            voiceName: activeVoiceRef.current || cfg.voiceName || 'Aoede',
            customInstruction: cfg.customInstruction,
            userMemories: cfg.userMemories,
            userName: cfg.userName,
            allowEmojis: cfg.allowEmojis,
            voiceLanguage: cfg.voiceLanguage || 'auto',
            appLanguage: cfg.appLanguage || 'Indonesia',
            liveTranslation: liveTranslationRef.current,
            deviceTime: getDeviceTimePayload(),
          }),
        });

        if (isUnmountedRef.current || isClosingRef.current) return;

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData?.error || `Server merespon status ${res.status}`);
        }

        const data = await res.json();
        const userText = String(data.userTranscript || '').trim();
        const replyText = String(data.replyText || '').trim();

        if (userText) {
          setLiveUserCaption(userText);
          httpHistoryRef.current.push({ role: 'user', content: userText });
          appendLiveTurn('user', userText);
          onCommitLiveTurnRef.current('user', userText);
        }

        if (replyText) {
          setLiveModelCaption(replyText);
          httpHistoryRef.current.push({ role: 'model', content: replyText });
          appendLiveTurn('model', replyText);
          onCommitLiveTurnRef.current('model', replyText);
        }

        if (data.audioUrl && !isClosingRef.current && !isUnmountedRef.current) {
          stopAllOutputAudio();
          let playedViaAnalyser = false;
          const ctx = outputCtxRef.current;
          const analyser = outputAnalyserRef.current;

          if (ctx && analyser && String(data.audioUrl).startsWith('data:audio/')) {
            try {
              if (ctx.state === 'suspended') {
                await ctx.resume();
              }
              const b64 = String(data.audioUrl).split(',')[1] || '';
              const bin = window.atob(b64);
              const bytes = new Uint8Array(bin.length);
              for (let i = 0; i < bin.length; i++) {
                bytes[i] = bin.charCodeAt(i);
              }
              const audioBuffer = await ctx.decodeAudioData(bytes.buffer);
              if (!isUnmountedRef.current && !isClosingRef.current) {
                const source = ctx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(analyser);
                activeSourcesRef.current.add(source);
                setStatus('speaking');
                source.onended = () => {
                  activeSourcesRef.current.delete(source);
                  if (
                    activeSourcesRef.current.size === 0 &&
                    !isClosingRef.current &&
                    !isUnmountedRef.current
                  ) {
                    outputEnergyRef.current = 0;
                    setStatus(isMutedRef.current ? 'muted' : 'listening');
                  }
                };
                source.start(0);
                playedViaAnalyser = true;
              }
            } catch {
              playedViaAnalyser = false;
            }
          }

          if (!playedViaAnalyser && !isUnmountedRef.current && !isClosingRef.current) {
            const audio = new Audio(data.audioUrl);
            httpAudioElRef.current = audio;
            setStatus('speaking');

            let phase = 0;
            httpSpeakingTimerRef.current = setInterval(() => {
              phase += 0.45;
              const gate = Math.sin(phase * 0.4) > -0.5 ? 1 : 0.05;
              outputEnergyRef.current = gate * (0.28 + Math.abs(Math.sin(phase)) * 0.48);
            }, 60);

            const finishPlayback = () => {
              stopHttpAudioPlayback();
              if (!isUnmountedRef.current && !isClosingRef.current) {
                setStatus(isMutedRef.current ? 'muted' : 'listening');
              }
            };

            audio.onended = finishPlayback;
            audio.onerror = finishPlayback;
            audio.play().catch(finishPlayback);
          }
        } else {
          if (!data.audioUrl && data.ttsNotice && !hasShownTtsLimitNoticeRef.current) {
            hasShownTtsLimitNoticeRef.current = true;
            showTempNotice(data.ttsNotice);
          }
          setStatus(isMutedRef.current ? 'muted' : 'listening');
        }
      } catch (err: any) {
        if (isUnmountedRef.current || isClosingRef.current) return;
        const msg = err?.message || 'Gagal memproses suara Maria Live.';
        if (/GEMINI_API_KEY|API key|403|401/i.test(msg)) {
          setStatus('error');
          setErrorMessage(msg);
        } else {
          showTempNotice(msg);
          setStatus(isMutedRef.current ? 'muted' : 'listening');
        }
      } finally {
        httpTurnInFlightRef.current = false;
      }
    },
    [appendLiveTurn, captureCurrentVideoFrameBase64, showTempNotice, stopAllOutputAudio, stopHttpAudioPlayback]
  );

  const play24kAudioChunk = useCallback((base64Data: string) => {
    const ctx = outputCtxRef.current;
    if (!ctx || isUnmountedRef.current || isClosingRef.current) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const { float32 } = decode24kPcmToFloat32(base64Data);
    if (float32.length === 0) return;

    setStatus('speaking');

    const audioBuffer = ctx.createBuffer(1, float32.length, 24000);
    audioBuffer.copyToChannel(new Float32Array(float32), 0);

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    if (outputAnalyserRef.current) {
      source.connect(outputAnalyserRef.current);
    } else {
      source.connect(ctx.destination);
    }

    const startTime = Math.max(ctx.currentTime + 0.02, nextStartTimeRef.current);
    nextStartTimeRef.current = startTime + audioBuffer.duration;

    activeSourcesRef.current.add(source);
    source.onended = () => {
      activeSourcesRef.current.delete(source);
      if (activeSourcesRef.current.size === 0 && !isClosingRef.current) {
        outputEnergyRef.current = 0;
        setStatus(isMutedRef.current ? 'muted' : 'listening');
      }
    };

    try {
      source.start(startTime);
    } catch {
      activeSourcesRef.current.delete(source);
    }
  }, []);

  // Scroll transcript panel softly when new lines arrive
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [liveTurns, liveModelCaption, liveUserCaption]);

  // Close popovers when tapping outside
  useEffect(() => {
    if (!isPlusMenuOpen && !isOverflowOpen) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (isPlusMenuOpen && plusMenuRef.current && !plusMenuRef.current.contains(target)) {
        setIsPlusMenuOpen(false);
      }
      if (isOverflowOpen && overflowMenuRef.current && !overflowMenuRef.current.contains(target)) {
        setIsOverflowOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, [isPlusMenuOpen, isOverflowOpen]);

  // Smooth real-time audio energy loop (reads actual AnalyserNode speaker RMS)
  useEffect(() => {
    let lastUpdate = 0;
    const tick = (now: number) => {
      if (isUnmountedRef.current) return;
      inputEnergyRef.current *= 0.88;

      const analyser = outputAnalyserRef.current;
      const analyserData = outputAnalyserDataRef.current;
      if (
        analyser &&
        analyserData &&
        outputCtxRef.current?.state === 'running' &&
        activeSourcesRef.current.size > 0
      ) {
        analyser.getFloatTimeDomainData(analyserData);
        let sum = 0;
        for (let i = 0; i < analyserData.length; i++) {
          const s = analyserData[i];
          sum += s * s;
        }
        const rms = Math.sqrt(sum / analyserData.length);
        const gated = rms < 0.01 ? 0 : Math.min(1, (rms - 0.01) * 5.2);
        outputEnergyRef.current = outputEnergyRef.current * 0.35 + gated * 0.65;
      } else if (activeSourcesRef.current.size === 0 && !httpSpeakingTimerRef.current) {
        outputEnergyRef.current *= 0.78;
      }

      if (now - lastUpdate > 45) {
        lastUpdate = now;
        const combined = Math.max(inputEnergyRef.current, outputEnergyRef.current);
        setOrbEnergy(combined);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Initialize Mic + WebSocket Live (reconnects cleanly whenever sessionRevision updates)
  useEffect(() => {
    let isSessionCancelled = false;
    isUnmountedRef.current = false;
    isClosingRef.current = false;
    wsReadyRef.current = false;
    wsApiErrorRef.current = false;
    transportModeRef.current = 'ws';
    setStatus('connecting');
    setErrorMessage(null);

    const startSession = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error(
            isEn
              ? 'Microphone access is not supported in this browser.'
              : 'Akses mikrofon tidak didukung di browser ini.'
          );
        }

        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

        const healthProbePromise = fetch('/api/health')
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null);

        const micStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            channelCount: 1,
          },
        });

        if (isSessionCancelled || isUnmountedRef.current || isClosingRef.current) {
          micStream.getTracks().forEach((t) => t.stop());
          return;
        }
        micStreamRef.current = micStream;

        const inputCtx = new AudioCtx();
        inputCtxRef.current = inputCtx;
        if (inputCtx.state === 'suspended') {
          await inputCtx.resume().catch(() => {});
        }

        let outputCtx: AudioContext;
        try {
          outputCtx = new AudioCtx({ sampleRate: 24000 });
        } catch {
          outputCtx = new AudioCtx();
        }
        outputCtxRef.current = outputCtx;
        nextStartTimeRef.current = outputCtx.currentTime;
        if (outputCtx.state === 'suspended') {
          await outputCtx.resume().catch(() => {});
        }
        const analyser = outputCtx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.45;
        analyser.connect(outputCtx.destination);
        outputAnalyserRef.current = analyser;
        outputAnalyserDataRef.current = new Float32Array(new ArrayBuffer(analyser.fftSize * 4));

        const health = await healthProbePromise;
        if (isSessionCancelled || isUnmountedRef.current || isClosingRef.current) return;

        const canTryWs = health?.liveWsSupported !== false;

        const activateHttpLiveMode = () => {
          if (isSessionCancelled || isUnmountedRef.current || isClosingRef.current) return;
          transportModeRef.current = 'http';
          setErrorMessage(null);
          setStatus(isMutedRef.current ? 'muted' : 'listening');
        };

        if (canTryWs) {
          const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
          const wsUrl = `${wsProtocol}//${window.location.host}/api/live`;
          const ws = new WebSocket(wsUrl);
          wsRef.current = ws;

          ws.onopen = () => {
            if (isSessionCancelled || isUnmountedRef.current || isClosingRef.current) return;
            const cfg = liveConfigRef.current;
            ws.send(
              JSON.stringify({
                type: 'setup',
                voiceName: activeVoiceRef.current || cfg.voiceName || 'Aoede',
                customInstruction: cfg.customInstruction,
                userMemories: cfg.userMemories,
                userName: cfg.userName,
                allowEmojis: cfg.allowEmojis,
                voiceLanguage: cfg.voiceLanguage || 'auto',
                appLanguage: cfg.appLanguage || 'Indonesia',
                recentContext: cfg.recentContext,
                liveTranslation: liveTranslationRef.current,
                deviceTime: getDeviceTimePayload(),
              })
            );
          };

          ws.onmessage = (event) => {
            if (isSessionCancelled || isUnmountedRef.current || isClosingRef.current) return;
            let msg: any;
            try {
              msg = JSON.parse(event.data);
            } catch {
              return;
            }

            if (msg.type === 'ready') {
              wsReadyRef.current = true;
              setStatus(isMutedRef.current ? 'muted' : 'listening');
            } else if (msg.type === 'inputTranscript' && msg.text) {
              userTurnBufRef.current += msg.text;
              setLiveUserCaption(userTurnBufRef.current.trim());
            } else if (msg.type === 'outputTranscript' && msg.text) {
              flushUserTurn();
              modelTurnBufRef.current += msg.text;
              setLiveModelCaption(modelTurnBufRef.current.trim());
            } else if (msg.type === 'audio' && msg.data) {
              flushUserTurn();
              play24kAudioChunk(msg.data);
            } else if (msg.type === 'interrupted') {
              stopAllOutputAudio();
              flushModelTurn();
              setLiveModelCaption('');
              setStatus(isMutedRef.current ? 'muted' : 'listening');
            } else if (msg.type === 'turnComplete') {
              flushUserTurn();
              flushModelTurn();
            } else if (msg.type === 'error') {
              wsApiErrorRef.current = true;
              setStatus('error');
              setErrorMessage(
                msg.error ||
                  (isEn
                    ? 'Maria Live encountered a connection error.'
                    : 'Maria Live mengalami kendala koneksi.')
              );
            } else if (msg.type === 'closed') {
              flushUserTurn();
              flushModelTurn();
              if (
                !isSessionCancelled &&
                !isClosingRef.current &&
                wsReadyRef.current &&
                !wsApiErrorRef.current
              ) {
                setStatus('error');
                setErrorMessage(
                  isEn ? 'Live session ended by server.' : 'Sesi Maria Live telah berakhir.'
                );
              }
            }
          };

          ws.onerror = () => {
            if (isSessionCancelled || isUnmountedRef.current || isClosingRef.current) return;
            if (!wsReadyRef.current && !wsApiErrorRef.current) {
              activateHttpLiveMode();
            } else if (!wsApiErrorRef.current) {
              setStatus('error');
              setErrorMessage(
                isEn
                  ? 'Unable to connect to Maria Live server.'
                  : 'Gagal terhubung ke server Maria Live.'
              );
            }
          };

          ws.onclose = () => {
            if (isSessionCancelled || isUnmountedRef.current || isClosingRef.current) return;
            if (!wsReadyRef.current && !wsApiErrorRef.current) {
              activateHttpLiveMode();
            }
          };
        } else {
          activateHttpLiveMode();
        }

        const source = inputCtx.createMediaStreamSource(micStream);
        const processor = inputCtx.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        const silentGain = inputCtx.createGain();
        silentGain.gain.value = 0;

        processor.onaudioprocess = (e) => {
          if (isSessionCancelled || isUnmountedRef.current || isClosingRef.current) return;

          if (
            transportModeRef.current === 'ws' &&
            (isCameraOnRef.current || isScreenSharingRef.current) &&
            Date.now() - lastVideoSentAtRef.current >= 1050
          ) {
            pushCurrentVideoFrameNowRef.current();
          }

          if (isMutedRef.current) {
            inputEnergyRef.current = 0;
            vadIsSpeakingRef.current = false;
            vadSpeechChunksRef.current = [];
            return;
          }

          const inputData = e.inputBuffer.getChannelData(0);
          const { base64, int16, rms } = downsampleTo16kPcmBase64(
            inputData,
            inputCtx.sampleRate
          );
          inputEnergyRef.current = Math.min(1, rms * 5.5);

          if (transportModeRef.current === 'ws') {
            const socket = wsRef.current;
            if (socket && socket.readyState === WebSocket.OPEN && wsReadyRef.current) {
              socket.send(
                JSON.stringify({
                  type: 'audio',
                  data: base64,
                  mimeType: 'audio/pcm;rate=16000',
                })
              );
            }
            return;
          }

          if (httpTurnInFlightRef.current) return;

          const now = Date.now();
          const speechThreshold = 0.028;

          if (!vadIsSpeakingRef.current) {
            vadPreRollRef.current.push(int16);
            if (vadPreRollRef.current.length > 3) {
              vadPreRollRef.current.shift();
            }

            if (rms > speechThreshold) {
              if (httpAudioElRef.current) {
                stopHttpAudioPlayback();
                setStatus('listening');
              }
              vadIsSpeakingRef.current = true;
              vadSpeechStartAtRef.current = now;
              vadLastVoiceAtRef.current = now;
              vadSpeechChunksRef.current = [...vadPreRollRef.current];
              vadPreRollRef.current = [];
            }
          } else {
            vadSpeechChunksRef.current.push(int16);
            if (rms > speechThreshold * 0.7) {
              vadLastVoiceAtRef.current = now;
            }

            const silenceDuration = now - vadLastVoiceAtRef.current;
            const totalDuration = now - vadSpeechStartAtRef.current;

            if (silenceDuration >= 1050 || totalDuration >= 15000) {
              const chunks = vadSpeechChunksRef.current;
              vadIsSpeakingRef.current = false;
              vadSpeechChunksRef.current = [];
              if (totalDuration >= 450 && chunks.length > 0) {
                const wavBase64 = encode16kInt16ChunksToWavBase64(chunks);
                if (wavBase64) {
                  sendHttpLiveTurn({ audioBase64: wavBase64 });
                }
              }
            }
          }
        };

        source.connect(processor);
        processor.connect(silentGain);
        silentGain.connect(inputCtx.destination);
      } catch (err: any) {
        if (isSessionCancelled || isUnmountedRef.current) return;
        setStatus('error');
        const msg = err?.message || '';
        setErrorMessage(
          /permission|denied|notallowed/i.test(msg)
            ? isEn
              ? 'Microphone permission denied. Please allow microphone access to start Maria Live.'
              : 'Izin mikrofon ditolak. Aktifkan izin mikrofon untuk memulai panggilan Maria Live.'
            : msg ||
              (isEn
                ? 'Failed to start Maria Live audio session.'
                : 'Gagal memulai sesi suara Maria Live.')
        );
      }
    };

    startSession();

    return () => {
      isSessionCancelled = true;
      cleanupTransportOnly();
    };
  }, [
    sessionRevision,
    cleanupTransportOnly,
    flushModelTurn,
    flushUserTurn,
    isEn,
    play24kAudioChunk,
    sendHttpLiveTurn,
    stopAllOutputAudio,
    stopHttpAudioPlayback,
  ]);

  useEffect(() => {
    return () => {
      isUnmountedRef.current = true;
      cleanupAllResources();
    };
  }, [cleanupAllResources]);

  // Attach MediaStream to camera <video> and manage 1 FPS video streaming
  useEffect(() => {
    if (isCameraOn && cameraVideoRef.current && cameraStreamRef.current) {
      cameraVideoRef.current.srcObject = cameraStreamRef.current;
      cameraVideoRef.current.play().catch(() => {});
    }
  }, [isCameraOn, facingMode]);

  useEffect(() => {
    if (isScreenSharing && screenVideoRef.current && screenStreamRef.current) {
      screenVideoRef.current.srcObject = screenStreamRef.current;
      screenVideoRef.current.play().catch(() => {});
    }
  }, [isScreenSharing]);

  useEffect(() => {
    if (videoLoopRef.current) {
      clearInterval(videoLoopRef.current);
      videoLoopRef.current = null;
    }

    if (!isCameraOn && !isScreenSharing) return;

    pushCurrentVideoFrameNow();
    videoLoopRef.current = setInterval(() => {
      if (Date.now() - lastVideoSentAtRef.current >= 950) {
        pushCurrentVideoFrameNow();
      }
    }, 1000);

    return () => {
      if (videoLoopRef.current) {
        clearInterval(videoLoopRef.current);
        videoLoopRef.current = null;
      }
    };
  }, [isCameraOn, isScreenSharing, pushCurrentVideoFrameNow]);

  const startCamera = useCallback(
    async (mode: 'environment' | 'user') => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error(
            isEn ? 'Camera not supported in this browser.' : 'Kamera tidak didukung di browser ini.'
          );
        }
        stopScreenStream();
        setSharedImageCard(null);
        setIsCameraReady(false);
        setIsCameraOn(true);
        if (cameraStreamRef.current) {
          cameraStreamRef.current.getTracks().forEach((t) => t.stop());
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: mode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        cameraStreamRef.current = stream;
        setFacingMode(mode);
        if (cameraVideoRef.current) {
          cameraVideoRef.current.srcObject = stream;
          cameraVideoRef.current.play().catch(() => {});
        }
      } catch (err: any) {
        setIsCameraOn(false);
        setIsCameraReady(false);
        showTempNotice(
          err?.message ||
            (isEn ? 'Unable to access camera.' : 'Gagal mengakses kamera perangkat.')
        );
      }
    },
    [isEn, showTempNotice, stopScreenStream]
  );

  const handleToggleCamera = () => {
    setIsPlusMenuOpen(false);
    if (isCameraOn) {
      stopCameraStream();
    } else {
      startCamera(facingMode);
    }
  };

  const handleFlipCamera = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    startCamera(nextMode);
  };

  const startAppScreenShare = useCallback(() => {
    stopCameraStream();
    stopScreenStream();
    const initialDataUrl = renderAppScreenToDataUrl();
    if (!initialDataUrl) {
      showTempNotice(
        isEn ? 'Unable to capture app view.' : 'Gagal menangkap tampilan layar aplikasi.'
      );
      return;
    }
    const base64 = initialDataUrl.split(',')[1];
    sharedScreenBase64Ref.current = base64;
    setScreenShareMode('app');
    setIsScreenSharing(true);
    setShowScreenFallbackSheet(false);
    setSharedImageCard({
      url: initialDataUrl,
      label: isEn ? 'Sharing App View' : 'Berbagi Layar Aplikasi',
    });

    if (
      transportModeRef.current === 'ws' &&
      wsReadyRef.current &&
      wsRef.current?.readyState === WebSocket.OPEN &&
      base64
    ) {
      wsRef.current.send(
        JSON.stringify({ type: 'video', data: base64, mimeType: 'image/jpeg' })
      );
    }
    showTempNotice(
      isEn ? 'App screen sharing active' : 'Berbagi tampilan layar aplikasi aktif'
    );
  }, [isEn, renderAppScreenToDataUrl, showTempNotice, stopCameraStream, stopScreenStream]);

  const applySharedScreenshotFile = useCallback(
    async (file: File) => {
      try {
        stopCameraStream();
        if (screenStreamRef.current) {
          screenStreamRef.current.getTracks().forEach((t) => t.stop());
          screenStreamRef.current = null;
        }
        const compressedDataUrl = await generateImageThumbnail(file, 1024, 0.84);
        const base64 = compressedDataUrl.split(',')[1];
        if (!base64) throw new Error('Invalid image');

        sharedScreenBase64Ref.current = base64;
        setScreenShareMode('screenshot');
        setIsScreenSharing(true);
        setShowScreenFallbackSheet(false);
        setSharedImageCard({ url: compressedDataUrl, label: file.name });

        if (
          transportModeRef.current === 'ws' &&
          wsReadyRef.current &&
          wsRef.current?.readyState === WebSocket.OPEN
        ) {
          wsRef.current.send(
            JSON.stringify({ type: 'video', data: base64, mimeType: 'image/jpeg' })
          );
        }
        showTempNotice(
          isEn
            ? 'Screen image shared with Maria Live'
            : 'Tangkapan layar aktif dibagikan ke Maria Live'
        );
      } catch {
        showTempNotice(
          isEn
            ? 'Unable to load screenshot image.'
            : 'Gagal memuat gambar tangkapan layar.'
        );
      }
    },
    [isEn, showTempNotice, stopCameraStream]
  );

  const handleScreenScreenshotPicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    await applySharedScreenshotFile(file);
  };

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            applySharedScreenshotFile(file);
            break;
          }
        }
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [applySharedScreenshotFile]);

  const startDesktopDisplayShare = useCallback(async () => {
    const mediaDevicesAny = navigator.mediaDevices as any;
    const navAny = navigator as any;
    const getDisplayMediaFn: ((constraints?: any) => Promise<MediaStream>) | null =
      mediaDevicesAny?.getDisplayMedia
        ? mediaDevicesAny.getDisplayMedia.bind(mediaDevicesAny)
        : navAny?.getDisplayMedia
        ? navAny.getDisplayMedia.bind(navAny)
        : null;

    if (!getDisplayMediaFn) {
      setScreenFallbackReason(
        isEn
          ? 'Mobile Chrome does not expose system screen recording API. Choose an instant screen share mode below:'
          : 'Browser Chrome mobile membatasi rekam layar OS langsung. Pilih mode berbagi layar cepat di bawah ini:'
      );
      setShowScreenFallbackSheet(true);
      return;
    }

    try {
      let stream: MediaStream;
      try {
        stream = await getDisplayMediaFn({
          video: {
            width: { ideal: 1920, max: 2560 },
            height: { ideal: 1080, max: 1440 },
            frameRate: { ideal: 5, max: 10 },
          },
          audio: false,
          surfaceSwitching: 'include',
          selfBrowserSurface: 'include',
          monitorTypeSurfaces: 'include',
        });
      } catch (optErr: any) {
        if (optErr?.name === 'TypeError' || optErr?.name === 'OverconstrainedError') {
          stream = await getDisplayMediaFn({ video: true, audio: false });
        } else {
          throw optErr;
        }
      }

      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      stopCameraStream();
      setSharedImageCard(null);

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          if (screenStreamRef.current === stream) {
            stopScreenStream();
          }
        };
      }

      sharedScreenBase64Ref.current = null;
      screenStreamRef.current = stream;
      if (screenVideoRef.current) {
        screenVideoRef.current.srcObject = stream;
        screenVideoRef.current.play().catch(() => {});
      }
      setScreenShareMode('display');
      setIsScreenSharing(true);
    } catch (err: any) {
      const errMsg = String(err?.message || '');
      const isPolicyOrUnsupported =
        err?.name === 'NotSupportedError' ||
        err?.name === 'SecurityError' ||
        /policy|disallowed|permissions|not supported|iframe/i.test(errMsg);

      if (isPolicyOrUnsupported) {
        setScreenFallbackReason(
          isEn
            ? 'Direct Chrome screen capture is blocked inside this embedded preview frame. Pick an option below:'
            : 'Tangkap layar Chrome dibatasi oleh jendela pratinjau tertanam. Pilih mode berbagi layar di bawah:'
        );
        setShowScreenFallbackSheet(true);
      } else if (err?.name !== 'AbortError' && err?.name !== 'NotAllowedError') {
        showTempNotice(
          err?.message || (isEn ? 'Screen sharing failed.' : 'Gagal memulai berbagi layar.')
        );
      }
    }
  }, [isEn, showTempNotice, stopCameraStream, stopScreenStream]);

  const handleToggleScreenShare = async () => {
    setIsPlusMenuOpen(false);
    if (isScreenSharing) {
      stopScreenStream();
      setSharedImageCard(null);
      return;
    }
    await startDesktopDisplayShare();
  };

  const handleToggleMute = () => {
    const next = !isMuted;
    isMutedRef.current = next;
    setIsMuted(next);
    if (next) {
      inputEnergyRef.current = 0;
      vadIsSpeakingRef.current = false;
      vadSpeechChunksRef.current = [];
      setStatus('muted');
    } else {
      setStatus(
        activeSourcesRef.current.size > 0 || httpAudioElRef.current ? 'speaking' : 'listening'
      );
    }
  };

  // Attach Photo directly into Live Composer (Video 2 02:16-02:35)
  const handlePhotoPicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    setIsPlusMenuOpen(false);
    if (files.length === 0) return;

    for (const file of files.slice(0, 4)) {
      try {
        const compressedDataUrl = await generateImageThumbnail(file, 1024, 0.82);
        const base64 = compressedDataUrl.split(',')[1];
        if (!base64) continue;
        setPendingAttachments((prev) => [
          ...prev,
          {
            id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            name: file.name,
            isImage: true,
            previewUrl: compressedDataUrl,
            base64,
          },
        ]);
      } catch {
        showTempNotice(
          isEn ? 'Failed to attach photo.' : 'Gagal melampirkan foto ke sesi Live.'
        );
      }
    }
  };

  // Attach Document / File into Live Composer
  const handleFilePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    setIsPlusMenuOpen(false);
    if (!file) return;

    try {
      if (file.type.startsWith('image/')) {
        const compressedDataUrl = await generateImageThumbnail(file, 1024, 0.82);
        const base64 = compressedDataUrl.split(',')[1];
        if (base64) {
          setPendingAttachments((prev) => [
            ...prev,
            {
              id: `att_${Date.now()}`,
              name: file.name,
              isImage: true,
              previewUrl: compressedDataUrl,
              base64,
            },
          ]);
        }
        return;
      }

      if (
        file.type.startsWith('text/') ||
        /\.(txt|md|json|csv|ts|tsx|js|jsx|py|html|css|xml|yaml|yml|log)$/i.test(file.name)
      ) {
        const text = await file.text();
        setPendingAttachments((prev) => [
          ...prev,
          {
            id: `att_${Date.now()}`,
            name: file.name,
            isImage: false,
            textContent: `File "${file.name}":\n${text.slice(0, 12000)}`,
          },
        ]);
      } else {
        const dataUrl = await readFileAsDataUrl(file);
        setPendingAttachments((prev) => [
          ...prev,
          {
            id: `att_${Date.now()}`,
            name: file.name,
            isImage: false,
            metaSummary: isEn
              ? `User attached file "${file.name}" (${file.type || 'document'}, ${Math.round(
                  file.size / 1024
                )} KB).`
              : `Pengguna melampirkan berkas "${file.name}" (${
                  file.type || 'dokumen'
                }, ${Math.round(file.size / 1024)} KB, data ${dataUrl.length}).`,
          },
        ]);
      }
    } catch {
      showTempNotice(
        isEn ? 'Unable to read selected file.' : 'Gagal membaca berkas yang dipilih.'
      );
    }
  };

  // Send Text + Pending Image/File attachments right inside Live Mode (Video 2 02:35)
  const handleSubmitLiveComposer = (e?: React.FormEvent) => {
    e?.preventDefault();
    const cleanText = textDraft.trim();
    if (!cleanText && pendingAttachments.length === 0) return;

    const firstImg = pendingAttachments.find((a) => a.isImage && a.previewUrl);
    if (firstImg?.previewUrl) {
      setSharedImageCard({ url: firstImg.previewUrl, label: firstImg.name });
    }

    const fileTextParts = pendingAttachments
      .filter((a) => !a.isImage && (a.textContent || a.metaSummary))
      .map((a) => a.textContent || a.metaSummary)
      .filter(Boolean)
      .join('\n\n');

    const defaultImgPrompt = firstImg
      ? isEn
        ? `Please look at the attached image (${firstImg.name}) and respond naturally.`
        : `Tolong lihat dan jelaskan gambar yang baru saya kirimkan (${firstImg.name}).`
      : '';

    const combinedPrompt = [cleanText, fileTextParts].filter(Boolean).join('\n\n') || defaultImgPrompt;

    const displayText =
      cleanText ||
      pendingAttachments.map((a) => a.name).join(', ') ||
      (isEn ? 'Shared image' : 'Mengirim gambar');

    appendLiveTurn('user', displayText, firstImg?.previewUrl);
    onCommitLiveTurnRef.current('user', displayText);

    if (
      transportModeRef.current === 'ws' &&
      wsReadyRef.current &&
      wsRef.current?.readyState === WebSocket.OPEN
    ) {
      for (const att of pendingAttachments) {
        if (att.isImage && att.base64) {
          wsRef.current.send(
            JSON.stringify({ type: 'video', data: att.base64, mimeType: 'image/jpeg' })
          );
        }
      }
      if (combinedPrompt) {
        wsRef.current.send(JSON.stringify({ type: 'text', text: combinedPrompt }));
      }
    } else {
      sendHttpLiveTurn({
        imageBase64: firstImg?.base64,
        textPrompt: combinedPrompt,
      });
    }

    setTextDraft('');
    setPendingAttachments([]);
  };

  // Voice Picker Preview & Confirmation (Video 1 00:19-00:50)
  const handlePreviewVoice = async (voiceName: string, sampleText: string) => {
    setDraftVoiceName(voiceName);
    setVoicePreviewSubtitle(sampleText);
    const persona = VOICE_PERSONAS.find((p) => p.geminiVoice === voiceName);
    speechService.unlockAudio();
    speechService.stopSpeaking();
    const played = await speechService.speak(sampleText, {
      voiceName,
      personaId: persona?.id || 'wanita',
      ttsModel: 'gemini-3.8-flash-lite-tts',
    });
    if (!played) {
      const errNotice = speechService.getState().error;
      if (errNotice) {
        setVoicePreviewSubtitle(`${sampleText} — ${errNotice}`);
      }
    }
  };

  const handleConfirmVoice = () => {
    speechService.stopSpeaking();
    setIsVoicePickerOpen(false);
    setVoicePreviewSubtitle('');
    if (draftVoiceName !== activeVoiceName) {
      setActiveVoiceName(draftVoiceName);
      onChangeVoice?.(draftVoiceName);
      setSessionRevision((prev) => prev + 1);
      showTempNotice(
        isEn ? `Voice changed to ${draftVoiceName}` : `Suara diganti ke ${draftVoiceName}`
      );
    }
  };

  const handleCancelVoicePicker = () => {
    speechService.stopSpeaking();
    setIsVoicePickerOpen(false);
    setVoicePreviewSubtitle('');
    setDraftVoiceName(activeVoiceName);
  };

  const handleToggleLiveTranslation = () => {
    const next = !liveTranslation;
    setLiveTranslation(next);
    setIsOverflowOpen(false);
    setSessionRevision((prev) => prev + 1);
    showTempNotice(
      next
        ? isEn
          ? 'Live Translation turned on'
          : 'Terjemahan Langsung diaktifkan'
        : isEn
        ? 'Live Translation turned off'
        : 'Terjemahan Langsung dimatikan'
    );
  };

  const characterState: MariaCharacterState = status;

  const liveTranscriptSignal = React.useMemo(() => {
    const fakeMessages = [
      ...(liveUserCaption
        ? [{ id: 'live-u', role: 'user' as const, content: liveUserCaption, timestamp: Date.now() }]
        : []),
      ...(liveModelCaption
        ? [{ id: 'live-m', role: 'model' as const, content: liveModelCaption, timestamp: Date.now() }]
        : []),
    ];
    if (fakeMessages.length === 0) return null;
    return analyzeMariaContext({
      messages: fakeMessages,
      isLoading: status === 'thinking' || status === 'connecting',
      isStreaming: false,
      isSpeaking: status === 'speaking',
      activeView,
      manualSpyGuardAlert: spyGuardAlert,
    });
  }, [liveUserCaption, liveModelCaption, status, activeView, spyGuardAlert]);

  const effectiveMood: MariaMood = liveTranscriptSignal ? liveTranscriptSignal.mood : mood;
  const effectiveAlert = spyGuardAlert || Boolean(liveTranscriptSignal?.spyGuardThreat);

  const statusText =
    status === 'connecting'
      ? isEn
        ? 'Connecting...'
        : 'Menghubungkan...'
      : status === 'thinking'
      ? isEn
        ? 'Thinking...'
        : 'Memproses...'
      : status === 'speaking'
      ? isEn
        ? 'Maria Speaking'
        : 'Maria Berbicara'
      : status === 'muted'
      ? isEn
        ? 'Microphone Muted'
        : 'Mikrofon Dibisukan'
      : status === 'error'
      ? isEn
        ? 'Connection Issue'
        : 'Koneksi Terputus'
      : isEn
      ? 'Listening...'
      : 'Mendengarkan...';

  const hasCenterMedia = isCameraOn || Boolean(sharedImageCard) || (isScreenSharing && screenShareMode === 'display');

  return (
    <>
      {/* Hidden file pickers */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handlePhotoPicked}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="*/*"
        className="hidden"
        onChange={handleFilePicked}
      />
      <input
        ref={screenPickerInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleScreenScreenshotPicked}
      />

      {/* Hidden video element to decode Chrome DisplayMedia frames cleanly */}
      {isScreenSharing && screenShareMode === 'display' && (
        <video
          ref={screenVideoRef}
          autoPlay
          playsInline
          muted
          onLoadedData={() => {
            pushCurrentVideoFrameNow();
          }}
          className="fixed -left-[9999px] -top-[9999px] w-1 h-1 opacity-0 pointer-events-none"
        />
      )}

      {/* =========================================================
          MODE A: FULLSCREEN GEMINI LIVE CANVAS (Videos 1, 2, 3)
      ========================================================= */}
      {isFullScreen && (
        <div
          data-maria-live-fullscreen="true"
          className="fixed inset-0 z-40 bg-[#05070d] text-white flex flex-col overflow-hidden select-none animate-in fade-in duration-200"
        >
          {/* Ambient Gemini Live Bottom Horizon Aura (Video 1) */}
          <div
            aria-hidden="true"
            className={`pointer-events-none fixed inset-x-0 bottom-0 h-44 sm:h-52 gemini-live-horizon ${
              effectiveAlert || status === 'error' ? 'alert' : ''
            }`}
            style={{
              opacity: status === 'muted' ? 0.35 : Math.min(1, 0.65 + orbEnergy * 0.45),
              transform: `scaleY(${(1 + orbEnergy * 0.14).toFixed(3)})`,
            }}
          />

          {/* Top Bar (Video 1 & Video 2) */}
          <header className="relative z-20 shrink-0 px-3 sm:px-6 pt-3 pb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={() => setIsFullScreen(false)}
                title={isEn ? 'Minimize to floating bar' : 'Kecilkan ke bilah chat'}
                aria-label={isEn ? 'Minimize Live view' : 'Kecilkan tampilan Live'}
                className="w-10 h-10 rounded-full bg-white/8 hover:bg-white/15 border border-white/10 flex items-center justify-center text-slate-200 cursor-pointer transition-colors shrink-0"
              >
                <ChevronDown className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm sm:text-base font-semibold tracking-tight text-white truncate">
                  Maria Live
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-medium border whitespace-nowrap ${
                    effectiveAlert || status === 'error'
                      ? 'bg-rose-500/20 border-rose-500/40 text-rose-200'
                      : liveTranslation
                      ? 'bg-sky-500/20 border-sky-400/40 text-sky-200'
                      : 'bg-white/8 border-white/12 text-slate-300'
                  }`}
                >
                  {effectiveAlert
                    ? 'Spy Guard Alert'
                    : liveTranslation
                    ? isEn
                      ? 'Live Translate'
                      : 'Terjemahan'
                    : statusText}
                </span>
              </div>
            </div>

            {/* Top Right Actions: Visual Switch + CC Captions + Overflow ⋮ */}
            <div className="relative flex items-center gap-1.5 sm:gap-2" ref={overflowMenuRef}>
              <button
                type="button"
                onClick={() => setShowCaptions((prev) => !prev)}
                title={isEn ? 'Toggle Live Captions' : 'Aktifkan/Matikan Teks Langsung'}
                aria-label="Live Captions"
                className={`w-10 h-10 rounded-full border flex items-center justify-center cursor-pointer transition-colors ${
                  showCaptions
                    ? 'bg-sky-500/20 border-sky-400/45 text-sky-300'
                    : 'bg-white/8 border-white/10 text-slate-300 hover:bg-white/15'
                }`}
              >
                <Captions className="w-[18px] h-[18px]" />
              </button>

              <button
                type="button"
                onClick={() => setIsOverflowOpen((prev) => !prev)}
                title={isEn ? 'Live options' : 'Opsi Maria Live'}
                aria-label="Live options"
                className="w-10 h-10 rounded-full bg-white/8 hover:bg-white/15 border border-white/10 flex items-center justify-center text-slate-200 cursor-pointer transition-colors"
              >
                <MoreVertical className="w-[18px] h-[18px]" />
              </button>

              {/* Overflow Menu matching Video 1 (00:17) */}
              {isOverflowOpen && (
                <div className="absolute right-0 top-12 w-64 rounded-2xl bg-[#161922] border border-white/12 shadow-2xl p-1.5 z-50 animate-in fade-in duration-100">
                  <button
                    type="button"
                    onClick={() => {
                      setIsOverflowOpen(false);
                      setDraftVoiceName(activeVoiceName);
                      setVoicePreviewSubtitle('');
                      setIsVoicePickerOpen(true);
                    }}
                    className="w-full px-3 py-2.5 rounded-xl flex items-center justify-between gap-3 text-left text-xs font-medium text-slate-100 hover:bg-white/8 cursor-pointer transition-colors"
                  >
                    <span className="flex items-center gap-2.5">
                      <Volume2 className="w-4 h-4 text-sky-400 shrink-0" />
                      <span>{isEn ? "Choose Maria's voice" : 'Pilih suara Maria'}</span>
                    </span>
                    <span className="text-[10px] text-slate-400">{activeVoiceName}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleToggleLiveTranslation}
                    className="w-full px-3 py-2.5 rounded-xl flex items-center justify-between gap-3 text-left text-xs font-medium text-slate-100 hover:bg-white/8 cursor-pointer transition-colors"
                  >
                    <span className="flex items-center gap-2.5">
                      <Languages className="w-4 h-4 text-sky-400 shrink-0" />
                      <span>
                        {isEn ? 'Turn on Live Translation' : 'Terjemahan Langsung'}
                      </span>
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded-md text-[10px] font-semibold ${
                        liveTranslation
                          ? 'bg-sky-500/25 text-sky-300'
                          : 'bg-white/8 text-slate-400'
                      }`}
                    >
                      {liveTranslation ? 'ON' : 'OFF'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setVisualMode((prev) => (prev === 'orb' ? 'mascot' : 'orb'));
                      setIsOverflowOpen(false);
                    }}
                    className="w-full px-3 py-2.5 rounded-xl flex items-center justify-between gap-3 text-left text-xs font-medium text-slate-100 hover:bg-white/8 cursor-pointer transition-colors"
                  >
                    <span className="flex items-center gap-2.5">
                      {visualMode === 'orb' ? (
                        <Bot className="w-4 h-4 text-cyan-400 shrink-0" />
                      ) : (
                        <Sparkles className="w-4 h-4 text-sky-400 shrink-0" />
                      )}
                      <span>
                        {visualMode === 'orb'
                          ? isEn
                            ? 'Switch to Sparkle 2D Mascot'
                            : 'Ganti ke Robot Sparkle 2D'
                          : isEn
                          ? 'Switch to Gemini Fluid Orb'
                          : 'Ganti ke Orb Gemini Live'}
                      </span>
                    </span>
                  </button>
                </div>
              )}
            </div>
          </header>

          {/* Center Interactive Stage */}
          <div className="relative z-10 flex-1 min-h-0 flex flex-col items-center justify-center px-4 pb-2 overflow-hidden">
            {/* Inline Error or Action Notice Banner */}
            {errorMessage && (
              <div className="mb-3 mx-auto max-w-md px-3.5 py-2.5 rounded-2xl bg-rose-950/90 border border-rose-600/60 text-rose-100 text-xs flex items-center justify-between gap-2.5 shadow-lg">
                <div className="flex items-center gap-2 min-w-0">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span className="leading-snug">{errorMessage}</span>
                </div>
                <button
                  type="button"
                  onClick={handleEndSession}
                  className="px-2.5 py-1 rounded-lg bg-rose-600 text-white text-[11px] font-semibold shrink-0 cursor-pointer"
                >
                  {isEn ? 'Close' : 'Tutup'}
                </button>
              </div>
            )}

            {!errorMessage && noticeMessage && (
              <div className="mb-3 mx-auto max-w-fit px-3.5 py-1.5 rounded-full bg-[#131926] text-white border border-white/12 text-[11px] font-medium flex items-center gap-1.5 shadow-lg">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{noticeMessage}</span>
              </div>
            )}

            {/* Shared Media / Live Camera Viewfinder (Videos 1 & 2) */}
            {isCameraOn ? (
              <div className="relative w-full max-w-lg flex-1 max-h-[52vh] rounded-3xl overflow-hidden bg-slate-950 border border-white/15 shadow-2xl flex items-center justify-center mb-3">
                <video
                  ref={cameraVideoRef}
                  autoPlay
                  playsInline
                  muted
                  onLoadedData={() => setIsCameraReady(true)}
                  onPlaying={() => setIsCameraReady(true)}
                  className={`w-full h-full object-cover transition-opacity duration-200 ${
                    isCameraReady ? 'opacity-100' : 'opacity-0'
                  } ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                />

                {!isCameraReady && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-300 text-xs">
                    <div className="w-6 h-6 border-2 border-slate-600 border-t-sky-400 rounded-full animate-spin" />
                    <span>{isEn ? 'Starting camera...' : 'Menyiapkan kamera...'}</span>
                  </div>
                )}

                <div className="absolute top-3 inset-x-3 flex items-center justify-between pointer-events-none">
                  <span className="px-3 py-1 rounded-full bg-black/65 text-white text-xs font-semibold flex items-center gap-1.5 border border-white/15">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    <span>Maria Live Camera</span>
                  </span>

                  <div className="flex items-center gap-2 pointer-events-auto">
                    <button
                      type="button"
                      onClick={handleFlipCamera}
                      title={isEn ? 'Switch camera' : 'Putar kamera'}
                      className="w-9 h-9 rounded-full bg-black/65 hover:bg-black/85 text-white border border-white/15 flex items-center justify-center cursor-pointer transition"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={stopCameraStream}
                      title={isEn ? 'Turn off camera' : 'Matikan kamera'}
                      className="w-9 h-9 rounded-full bg-black/65 hover:bg-black/85 text-white border border-white/15 flex items-center justify-center cursor-pointer transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ) : sharedImageCard ? (
              <div className="relative max-w-[290px] sm:max-w-sm rounded-3xl overflow-hidden border border-white/15 bg-[#0e1422] shadow-2xl mb-3 animate-in fade-in duration-200">
                <img
                  src={sharedImageCard.url}
                  alt={sharedImageCard.label || 'Shared media'}
                  className="max-h-[38vh] w-auto object-contain mx-auto"
                />
                <button
                  type="button"
                  onClick={() => {
                    setSharedImageCard(null);
                    if (isScreenSharing && screenShareMode !== 'display') {
                      stopScreenStream();
                    }
                  }}
                  title={isEn ? 'Dismiss preview' : 'Tutup pratinjau'}
                  className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-black/70 hover:bg-black/90 text-white border border-white/20 flex items-center justify-center cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : isScreenSharing && screenShareMode === 'display' ? (
              <div className="mb-3 px-4 py-2 rounded-2xl bg-sky-500/15 border border-sky-400/35 text-sky-100 text-xs font-medium flex items-center gap-2.5">
                <MonitorUp className="w-4 h-4 text-sky-400 shrink-0" />
                <span>{isEn ? 'Live screen sharing active' : 'Berbagi layar aktif'}</span>
                <button
                  type="button"
                  onClick={stopScreenStream}
                  className="px-2 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] cursor-pointer"
                >
                  {isEn ? 'Stop' : 'Hentikan'}
                </button>
              </div>
            ) : null}

            {/* Primary Centered Live Visual: Gemini Fluid Blue Orb OR Sparkle 2D Mascot */}
            <div className="flex flex-col items-center justify-center shrink-0">
              {visualMode === 'orb' ? (
                <GeminiLiveOrb
                  state={status}
                  energy={orbEnergy}
                  getLiveEnergy={() => outputEnergyRef.current}
                  alert={effectiveAlert}
                  size={hasCenterMedia ? 'compact' : 'large'}
                />
              ) : (
                <MariaCharacter2D
                  state={characterState}
                  mood={effectiveMood}
                  activeView={activeView}
                  spyGuardAlert={effectiveAlert}
                  energy={orbEnergy}
                  getLiveEnergy={() => outputEnergyRef.current}
                  size={hasCenterMedia ? 'companion' : 'stage'}
                  interactive={true}
                />
              )}
            </div>

            {/* Live Transcripts / Captions Stream (Videos 1 & 3) */}
            {showCaptions &&
              (liveTurns.length > 0 || liveUserCaption || liveModelCaption) && (
                <div className="mt-2 w-full max-w-xl max-h-[22vh] overflow-y-auto px-2 space-y-2 text-xs leading-relaxed">
                  {liveTurns.slice(-3).map((turn) => (
                    <div
                      key={turn.id}
                      className={`flex ${turn.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[88%] px-3.5 py-2 rounded-2xl ${
                          turn.role === 'user'
                            ? 'bg-[#1a2234] text-slate-100 border border-white/10'
                            : 'bg-white/6 text-white/95 border border-white/8'
                        }`}
                      >
                        {turn.role === 'model' && (
                          <span className="font-semibold text-sky-400 mr-1.5">Maria:</span>
                        )}
                        <span>{turn.text}</span>
                      </div>
                    </div>
                  ))}
                  {(liveUserCaption || liveModelCaption) && (
                    <div className="px-3.5 py-2 rounded-2xl bg-white/8 border border-sky-400/20 text-white/95">
                      {liveUserCaption && (
                        <p className="text-slate-300">
                          <span className="font-semibold text-sky-300">
                            {isEn ? 'You: ' : 'Anda: '}
                          </span>
                          <span>{liveUserCaption}</span>
                        </p>
                      )}
                      {liveModelCaption && (
                        <p className="text-white mt-0.5">
                          <span className="font-semibold text-sky-400">Maria: </span>
                          <span>{liveModelCaption}</span>
                        </p>
                      )}
                    </div>
                  )}
                  <div ref={transcriptEndRef} />
                </div>
              )}
          </div>

          {/* Bottom Gemini Live Input + Pill Controls (Videos 1 & 2) */}
          <footer
            data-maria-live-dock="true"
            className="relative z-20 shrink-0 max-w-2xl mx-auto w-full px-3 sm:px-5 pb-4 pt-1"
          >
            {/* Pending Image / File Attachments Strip (Video 2 02:17) */}
            {pendingAttachments.length > 0 && (
              <div className="mb-2.5 flex items-center gap-2 overflow-x-auto pb-1">
                {pendingAttachments.map((att) => (
                  <div
                    key={att.id}
                    className="relative shrink-0 rounded-2xl overflow-hidden border border-white/15 bg-[#121726]"
                  >
                    {att.isImage && att.previewUrl ? (
                      <img
                        src={att.previewUrl}
                        alt={att.name}
                        className="w-16 h-16 object-cover"
                      />
                    ) : (
                      <div className="px-3 py-2 flex items-center gap-1.5 text-[11px] text-slate-200">
                        <FileText className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                        <span className="max-w-[110px] truncate">{att.name}</span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        setPendingAttachments((prev) => prev.filter((item) => item.id !== att.id))
                      }
                      aria-label="Remove attachment"
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/75 text-white flex items-center justify-center cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Bottom Action Menu Popover ([+] Video / Photos / Files / Screen Share) */}
            <div className="relative" ref={plusMenuRef}>
              {isPlusMenuOpen && (
                <div className="absolute bottom-16 left-0 w-full sm:w-80 rounded-3xl border border-white/12 bg-[#141720] p-2.5 shadow-2xl z-50 animate-in fade-in duration-100">
                  <div className="grid grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={handleToggleCamera}
                      className="flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-2xl bg-white/6 hover:bg-white/12 text-slate-100 cursor-pointer transition"
                    >
                      <Video className="w-5 h-5 text-sky-400" />
                      <span className="text-[11px] font-medium">
                        {isEn ? 'Video' : 'Kamera'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      className="flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-2xl bg-white/6 hover:bg-white/12 text-slate-100 cursor-pointer transition"
                    >
                      <ImageIcon className="w-5 h-5 text-emerald-400" />
                      <span className="text-[11px] font-medium">
                        {isEn ? 'Photos' : 'Foto'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-2xl bg-white/6 hover:bg-white/12 text-slate-100 cursor-pointer transition"
                    >
                      <FileText className="w-5 h-5 text-indigo-400" />
                      <span className="text-[11px] font-medium">
                        {isEn ? 'Files' : 'File'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={handleToggleScreenShare}
                      className="flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-2xl bg-white/6 hover:bg-white/12 text-slate-100 cursor-pointer transition"
                    >
                      <MonitorUp className="w-5 h-5 text-cyan-400" />
                      <span className="text-[11px] font-medium">
                        {isEn ? 'Screen' : 'Layar'}
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* Direct Text/Image Composer + Live Controls */}
              <form
                onSubmit={handleSubmitLiveComposer}
                className="flex items-center gap-1.5 sm:gap-2"
              >
                <button
                  type="button"
                  onClick={() => setIsPlusMenuOpen((prev) => !prev)}
                  title={isEn ? 'Camera, Photos, Files, Screen' : 'Kamera, Foto, File, Layar'}
                  aria-label={isEn ? 'Share media' : 'Bagikan media'}
                  className={`w-11 h-11 rounded-full border flex items-center justify-center cursor-pointer transition-colors shrink-0 ${
                    isPlusMenuOpen
                      ? 'bg-sky-600 border-sky-400 text-white'
                      : 'bg-[#151821] border-white/12 text-slate-200 hover:bg-[#1e2330]'
                  }`}
                >
                  <Plus
                    className={`w-5 h-5 transition-transform duration-150 ${
                      isPlusMenuOpen ? 'rotate-45' : ''
                    }`}
                  />
                </button>

                <button
                  type="button"
                  onClick={handleToggleScreenShare}
                  title={
                    isScreenSharing
                      ? isEn
                        ? 'Stop Screen Share'
                        : 'Hentikan Berbagi Layar'
                      : isEn
                      ? 'Share Screen'
                      : 'Bagikan Layar'
                  }
                  aria-label={isEn ? 'Share screen' : 'Bagikan layar'}
                  className={`w-11 h-11 rounded-full border flex items-center justify-center cursor-pointer transition-colors shrink-0 ${
                    isScreenSharing
                      ? 'bg-sky-600 border-sky-400 text-white'
                      : 'bg-[#151821] border-white/12 text-slate-200 hover:bg-[#1e2330]'
                  }`}
                >
                  <MonitorUp className="w-[18px] h-[18px]" />
                </button>

                {/* Text Prompt Input Pill (Video 2 02:17) */}
                <div className="flex-1 min-w-0 flex items-center bg-[#151821] border border-white/12 rounded-full pl-4 pr-1.5 py-1 focus-within:border-sky-400/50 transition-colors">
                  <input
                    type="text"
                    value={textDraft}
                    onChange={(e) => setTextDraft(e.target.value)}
                    placeholder={isEn ? 'Ask Maria...' : 'Tanya Maria...'}
                    className="w-full bg-transparent text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none py-1.5"
                  />
                  {(textDraft.trim().length > 0 || pendingAttachments.length > 0) && (
                    <button
                      type="submit"
                      title={isEn ? 'Send to Live session' : 'Kirim ke Maria Live'}
                      className="w-8 h-8 rounded-full bg-sky-500 hover:bg-sky-400 text-slate-950 flex items-center justify-center cursor-pointer shrink-0 ml-1 transition"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Mute / Unmute Mic Button */}
                <button
                  type="button"
                  onClick={handleToggleMute}
                  title={
                    isMuted
                      ? isEn
                        ? 'Unmute mic'
                        : 'Bunyikan mikrofon'
                      : isEn
                      ? 'Mute mic'
                      : 'Bisukan mikrofon'
                  }
                  aria-label={isMuted ? 'Unmute' : 'Mute'}
                  className={`w-11 h-11 rounded-full border flex items-center justify-center cursor-pointer transition-colors shrink-0 ${
                    isMuted
                      ? 'bg-rose-500/20 border-rose-500/50 text-rose-300'
                      : 'bg-[#151821] border-white/12 text-slate-200 hover:bg-[#1e2330]'
                  }`}
                >
                  {isMuted ? <MicOff className="w-[18px] h-[18px]" /> : <Mic className="w-[18px] h-[18px]" />}
                </button>

                {/* End Live Call Button */}
                <button
                  type="button"
                  onClick={handleEndSession}
                  title={isEn ? 'End Maria Live' : 'Akhiri Maria Live'}
                  aria-label={isEn ? 'End Live Call' : 'Akhiri panggilan'}
                  className="w-11 h-11 rounded-full bg-rose-600/85 hover:bg-rose-600 border border-rose-500/50 text-white flex items-center justify-center cursor-pointer transition-colors shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </form>
            </div>
          </footer>
        </div>
      )}

      {/* =========================================================
          MODE B: MINIMIZED FLOATING GEMINI LIVE BAR (Video 1 00:00-00:13)
      ========================================================= */}
      {!isFullScreen && (
        <div
          data-maria-live-dock="true"
          className="max-w-3xl mx-auto w-full px-3 sm:px-4 select-none relative z-40"
        >
          {/* Ambient Gemini Glow behind floating pill */}
          <div
            aria-hidden="true"
            className={`pointer-events-none fixed inset-x-0 bottom-0 h-28 gemini-live-horizon z-[-1] ${
              effectiveAlert || status === 'error' ? 'alert' : ''
            }`}
          />

          <div className="flex items-center justify-center gap-2 sm:gap-3 py-1">
            <button
              type="button"
              onClick={() => {
                setIsFullScreen(true);
                setIsPlusMenuOpen(true);
              }}
              title={isEn ? 'Media & Options' : 'Kamera & Media'}
              className="w-11 h-11 rounded-full border flex items-center justify-center cursor-pointer transition-colors shadow-sm bg-slate-100 border-slate-200 text-slate-800 hover:bg-slate-200 dark:bg-[#1c1f29] dark:border-[#2e3242] dark:text-slate-100"
            >
              <Plus className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={handleToggleScreenShare}
              title={isEn ? 'Share Screen' : 'Bagikan Layar'}
              className={`w-11 h-11 rounded-full border flex items-center justify-center cursor-pointer transition-colors shadow-sm ${
                isScreenSharing
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-slate-100 border-slate-200 text-slate-800 hover:bg-slate-200 dark:bg-[#1c1f29] dark:border-[#2e3242] dark:text-slate-100'
              }`}
            >
              <MonitorUp className="w-[18px] h-[18px]" />
            </button>

            {/* Signature Glowing Blue Gemini Live Pill (Video 1 00:00) */}
            <button
              type="button"
              onClick={() => setIsFullScreen(true)}
              title={isEn ? 'Expand Maria Live' : 'Buka Layar Penuh Maria Live'}
              aria-label={statusText}
              className={`gemini-live-pill-btn ${
                effectiveAlert || status === 'error' ? 'alert' : ''
              } relative h-11 sm:h-12 w-32 sm:w-40 rounded-full flex items-center justify-center gap-1.5 px-4 cursor-pointer transition-transform active:scale-95`}
            >
              {[0.5, 0.85, 1.0, 0.72, 0.92, 0.65].map((w, idx) => {
                const boost =
                  status === 'speaking'
                    ? 0.4 + orbEnergy * 0.85 * w
                    : status === 'listening'
                    ? 0.25 + orbEnergy * 0.65 * w
                    : 0.2;
                return (
                  <span
                    key={idx}
                    className="w-1 rounded-full bg-white/95 transition-transform duration-100"
                    style={{
                      height: '20px',
                      transform: `scaleY(${Math.min(1, Math.max(0.2, boost)).toFixed(3)})`,
                    }}
                  />
                );
              })}
              <Maximize2 className="w-3.5 h-3.5 text-white/90 ml-1.5 shrink-0" />
            </button>

            <button
              type="button"
              onClick={handleToggleMute}
              title={isMuted ? (isEn ? 'Unmute mic' : 'Bunyikan mikrofon') : (isEn ? 'Mute mic' : 'Bisukan mikrofon')}
              className={`w-11 h-11 rounded-full border flex items-center justify-center cursor-pointer transition-colors shadow-sm ${
                isMuted
                  ? 'bg-rose-500/15 border-rose-500/50 text-rose-500 dark:bg-rose-500/20 dark:text-rose-400'
                  : 'bg-slate-100 border-slate-200 text-slate-800 hover:bg-slate-200 dark:bg-[#1c1f29] dark:border-[#2e3242] dark:text-slate-100'
              }`}
            >
              {isMuted ? <MicOff className="w-[18px] h-[18px]" /> : <Mic className="w-[18px] h-[18px]" />}
            </button>

            <button
              type="button"
              onClick={handleEndSession}
              title={isEn ? 'End Maria Live' : 'Akhiri Maria Live'}
              className="w-11 h-11 rounded-full border flex items-center justify-center cursor-pointer transition-colors shadow-sm bg-slate-200 border-slate-300 text-slate-900 hover:bg-rose-600 hover:text-white hover:border-rose-600 dark:bg-[#242834] dark:border-[#353a4c] dark:text-white dark:hover:bg-rose-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* =========================================================
          CHOOSE VOICE FULLSCREEN SHEET (Video 1 00:19 - 00:50)
      ========================================================= */}
      {isVoicePickerOpen && (
        <div
          data-maria-voice-picker="true"
          className="fixed inset-0 z-50 bg-[#05070d] text-white flex flex-col animate-in fade-in duration-150"
        >
          <div className="px-4 py-4 flex items-center justify-center border-b border-white/8">
            <h2 className="text-base font-semibold tracking-tight">
              {isEn ? 'Choose voice' : 'Pilih suara'}
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 max-w-md mx-auto w-full space-y-2">
            {VOICE_PERSONAS.map((persona) => {
              const isSelected = draftVoiceName === persona.geminiVoice;
              return (
                <button
                  key={persona.id}
                  type="button"
                  onClick={() => handlePreviewVoice(persona.geminiVoice, persona.sampleText)}
                  className={`w-full px-4 py-3.5 rounded-2xl flex items-center justify-between gap-3 text-left cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-[#0d2859] text-blue-100 border border-blue-400/40'
                      : 'bg-transparent hover:bg-white/6 text-slate-200 border border-transparent'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{persona.geminiVoice}</span>
                      <span className="text-xs text-slate-400">· {persona.name}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      {persona.description}
                    </p>
                  </div>

                  {isSelected ? (
                    <Check className="w-4 h-4 text-blue-300 shrink-0" />
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/8 text-slate-300 shrink-0">
                      {persona.category}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Floating Sample Subtitle Toast (Video 1 00:21 - 00:46) */}
          <div className="px-4 pb-6 pt-2 max-w-md mx-auto w-full space-y-4">
            {voicePreviewSubtitle && (
              <div className="px-4 py-3 rounded-2xl bg-[#1a1d24] border border-white/10 text-xs text-slate-200 leading-relaxed text-center">
                {voicePreviewSubtitle}
              </div>
            )}

            <div className="flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={handleCancelVoicePicker}
                className="px-6 py-2.5 rounded-full text-xs font-semibold text-slate-300 hover:bg-white/10 cursor-pointer transition"
              >
                {isEn ? 'Cancel' : 'Batal'}
              </button>
              <button
                type="button"
                onClick={handleConfirmVoice}
                className="px-7 py-2.5 rounded-full text-xs font-semibold bg-[#8ab4f8] hover:bg-[#a8c7fa] text-[#051a38] cursor-pointer transition"
              >
                {isEn ? 'Confirm' : 'Konfirmasi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          SCREEN SHARE FALLBACK SHEET (Mobile / Iframe)
      ========================================================= */}
      {showScreenFallbackSheet && (
        <div
          data-maria-screen-modal="true"
          className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
          onClick={() => setShowScreenFallbackSheet(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-[#151822] border border-white/12 p-4 shadow-2xl space-y-3 text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold">
                  {isEn ? 'Share Screen with Maria' : 'Bagikan Layar ke Maria'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                  {screenFallbackReason}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowScreenFallbackSheet(false)}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-slate-300 shrink-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={startAppScreenShare}
                className="w-full p-3 rounded-2xl border border-sky-500/30 bg-sky-950/35 hover:bg-sky-900/40 flex items-center gap-3 text-left cursor-pointer transition"
              >
                <div className="w-9 h-9 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0">
                  <MonitorUp className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white">
                    {isEn ? 'Share App View (Live)' : 'Bagikan Tampilan Aplikasi (Live)'}
                  </div>
                  <div className="text-[11px] text-slate-300">
                    {isEn
                      ? 'Maria reads your current Maria AI screen in real time'
                      : 'Maria membaca layar obrolan/kode aplikasi secara langsung'}
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => screenPickerInputRef.current?.click()}
                className="w-full p-3 rounded-2xl border border-white/10 hover:bg-white/6 flex items-center gap-3 text-left cursor-pointer transition"
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white">
                    {isEn ? 'Share Phone Screenshot' : 'Bagikan Tangkapan Layar (Screenshot)'}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {isEn
                      ? 'Pick or paste a screenshot of another app'
                      : 'Pilih atau tempel screenshot aplikasi lain dari HP Anda'}
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowScreenFallbackSheet(false);
                  startCamera('environment');
                }}
                className="w-full p-3 rounded-2xl border border-white/10 hover:bg-white/6 flex items-center gap-3 text-left cursor-pointer transition"
              >
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                  <Video className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white">
                    {isEn ? 'Point Rear Camera' : 'Gunakan Kamera Belakang'}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {isEn
                      ? 'Show another device screen directly via camera'
                      : 'Arahkan kamera langsung ke layar atau objek di sekitar'}
                  </div>
                </div>
              </button>

              {typeof window !== 'undefined' && window.self !== window.top && (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(window.location.href);
                      setShowScreenFallbackSheet(false);
                      showTempNotice(
                        isEn
                          ? 'App URL copied! Open in a standalone browser tab for full sharing.'
                          : 'Link disalin! Buka di tab Chrome mandiri untuk berbagi layar penuh.'
                      );
                    } catch {
                      showTempNotice(isEn ? 'Unable to copy link.' : 'Gagal menyalin link.');
                    }
                  }}
                  className="w-full p-3 rounded-2xl border border-amber-500/30 bg-amber-950/25 hover:bg-amber-900/35 flex items-center gap-3 text-left cursor-pointer transition"
                >
                  <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0">
                    <Copy className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-white">
                      {isEn ? 'Copy Link for Standalone Tab' : 'Salin Link untuk Tab Chrome Mandiri'}
                    </div>
                    <div className="text-[11px] text-slate-300">
                      {isEn
                        ? 'Open outside preview frame to share any tab or window'
                        : 'Buka di luar frame pratinjau agar bisa berbagi tab atau layar penuh'}
                    </div>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
