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
  Square,
  Copy,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.tsx';
import {
  decode24kPcmToFloat32,
  downsampleTo16kPcmBase64,
  encode16kInt16ChunksToWavBase64,
} from '../lib/liveAudioUtils.ts';
import { generateImageThumbnail, readFileAsDataUrl } from '../lib/mediaUtils.ts';
import { captureAppViewportToDataUrl } from '../lib/appScreenCapture.ts';

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
  onClose: () => void;
  onCommitLiveTurn: (role: 'user' | 'model', text: string) => void;
}

type LiveStatus = 'connecting' | 'listening' | 'thinking' | 'speaking' | 'muted' | 'error';

export const GeminiLiveOverlay: React.FC<GeminiLiveOverlayProps> = ({
  liveConfig,
  onClose,
  onCommitLiveTurn,
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
  const [displaySurfaceInfo, setDisplaySurfaceInfo] = useState<{
    surface: 'browser' | 'window' | 'monitor' | 'unknown';
    width?: number;
    height?: number;
  } | null>(null);
  const [sharedScreenPreviewUrl, setSharedScreenPreviewUrl] = useState<string | null>(null);
  const [showScreenFallbackSheet, setShowScreenFallbackSheet] = useState(false);
  const [screenFallbackReason, setScreenFallbackReason] = useState<string | null>(null);
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);
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

  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const screenPickerInputRef = useRef<HTMLInputElement | null>(null);

  const userTurnBufRef = useRef('');
  const modelTurnBufRef = useRef('');
  const onCommitLiveTurnRef = useRef(onCommitLiveTurn);
  onCommitLiveTurnRef.current = onCommitLiveTurn;
  const liveConfigRef = useRef(liveConfig);
  liveConfigRef.current = liveConfig;

  const showTempNotice = useCallback((msg: string) => {
    setNoticeMessage(msg);
    setTimeout(() => {
      setNoticeMessage((prev) => (prev === msg ? null : prev));
    }, 3200);
  }, []);

  const flushUserTurn = useCallback(() => {
    const trimmed = userTurnBufRef.current.trim();
    if (trimmed) {
      userTurnBufRef.current = '';
      onCommitLiveTurnRef.current('user', trimmed);
    }
  }, []);

  const flushModelTurn = useCallback(() => {
    const trimmed = modelTurnBufRef.current.trim();
    if (trimmed) {
      modelTurnBufRef.current = '';
      onCommitLiveTurnRef.current('model', trimmed);
    }
  }, []);

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
    setDisplaySurfaceInfo(null);
    setSharedScreenPreviewUrl(null);
    setScreenShareMode(null);
    setIsScreenSharing(false);
  }, []);

  const cleanupAllResources = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (videoLoopRef.current) {
      clearInterval(videoLoopRef.current);
      videoLoopRef.current = null;
    }
    stopAllOutputAudio();
    stopCameraStream();
    stopScreenStream();

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
  }, [stopAllOutputAudio, stopCameraStream, stopScreenStream]);

  const handleEndSession = useCallback(() => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    flushUserTurn();
    flushModelTurn();
    cleanupAllResources();
    onClose();
  }, [cleanupAllResources, flushModelTurn, flushUserTurn, onClose]);

  // Full-layout Canvas2D DOM viewport capture (styles, cards, icons, gradients, & Maria Live dock)
  const renderAppScreenToDataUrl = useCallback((): string | null => {
    return captureAppViewportToDataUrl({ includeMariaLiveDock: true });
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

    // Crisp 1280px HD resolution for Chrome Desktop tabs/windows/code, lightweight 896px for camera
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
            voiceName: cfg.voiceName || 'Aoede',
            customInstruction: cfg.customInstruction,
            userMemories: cfg.userMemories,
            userName: cfg.userName,
            allowEmojis: cfg.allowEmojis,
            voiceLanguage: cfg.voiceLanguage || 'auto',
            appLanguage: cfg.appLanguage || 'Indonesia',
            deviceTime: getDeviceTimePayload(),
          }),
        });

        if (isUnmountedRef.current || isClosingRef.current) return;

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(
            errData?.error || `Server merespon status ${res.status}`
          );
        }

        const data = await res.json();
        const userText = String(data.userTranscript || '').trim();
        const replyText = String(data.replyText || '').trim();

        if (userText) {
          setLiveUserCaption(userText);
          httpHistoryRef.current.push({ role: 'user', content: userText });
          onCommitLiveTurnRef.current('user', userText);
        }

        if (replyText) {
          setLiveModelCaption(replyText);
          httpHistoryRef.current.push({ role: 'model', content: replyText });
          onCommitLiveTurnRef.current('model', replyText);
        }

        if (data.audioUrl && !isClosingRef.current && !isUnmountedRef.current) {
          stopHttpAudioPlayback();
          const audio = new Audio(data.audioUrl);
          httpAudioElRef.current = audio;
          setStatus('speaking');

          let phase = 0;
          httpSpeakingTimerRef.current = setInterval(() => {
            phase += 0.45;
            outputEnergyRef.current = 0.35 + Math.abs(Math.sin(phase)) * 0.45;
          }, 70);

          const finishPlayback = () => {
            stopHttpAudioPlayback();
            if (!isUnmountedRef.current && !isClosingRef.current) {
              setStatus(isMutedRef.current ? 'muted' : 'listening');
            }
          };

          audio.onended = finishPlayback;
          audio.onerror = finishPlayback;
          audio.play().catch(finishPlayback);
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
    [captureCurrentVideoFrameBase64, showTempNotice, stopHttpAudioPlayback]
  );

  const play24kAudioChunk = useCallback((base64Data: string) => {
    const ctx = outputCtxRef.current;
    if (!ctx || isUnmountedRef.current || isClosingRef.current) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const { float32, rms } = decode24kPcmToFloat32(base64Data);
    if (float32.length === 0) return;

    outputEnergyRef.current = Math.min(1, Math.max(outputEnergyRef.current, rms * 4.5));
    setStatus('speaking');

    const audioBuffer = ctx.createBuffer(1, float32.length, 24000);
    audioBuffer.copyToChannel(new Float32Array(float32), 0);

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);

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

  // Close + popover when tapping outside
  useEffect(() => {
    if (!isPlusMenuOpen) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (plusMenuRef.current && !plusMenuRef.current.contains(e.target as Node)) {
        setIsPlusMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, [isPlusMenuOpen]);

  // Smooth orb energy animation loop
  useEffect(() => {
    let lastUpdate = 0;
    const tick = (now: number) => {
      if (isUnmountedRef.current) return;
      inputEnergyRef.current *= 0.88;
      if (activeSourcesRef.current.size === 0 && !httpSpeakingTimerRef.current) {
        outputEnergyRef.current *= 0.85;
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

  // Initialize Mic + WebSocket Live (with automatic seamless Serverless HTTP fallback when WS upgrade is unsupported)
  useEffect(() => {
    isUnmountedRef.current = false;
    isClosingRef.current = false;
    wsReadyRef.current = false;
    wsApiErrorRef.current = false;
    transportModeRef.current = 'ws';
    httpHistoryRef.current = [];

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
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;

        // Probe server capability quickly in parallel while requesting mic access
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

        if (isUnmountedRef.current || isClosingRef.current) {
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

        const health = await healthProbePromise;
        const canTryWs = health?.liveWsSupported !== false;

        const activateHttpLiveMode = () => {
          if (isUnmountedRef.current || isClosingRef.current) return;
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
            if (isUnmountedRef.current || isClosingRef.current) return;
            const cfg = liveConfigRef.current;
            ws.send(
              JSON.stringify({
                type: 'setup',
                voiceName: cfg.voiceName || 'Aoede',
                customInstruction: cfg.customInstruction,
                userMemories: cfg.userMemories,
                userName: cfg.userName,
                allowEmojis: cfg.allowEmojis,
                voiceLanguage: cfg.voiceLanguage || 'auto',
                appLanguage: cfg.appLanguage || 'Indonesia',
                recentContext: cfg.recentContext,
                deviceTime: getDeviceTimePayload(),
              })
            );
          };

          ws.onmessage = (event) => {
            if (isUnmountedRef.current || isClosingRef.current) return;
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
              if (!isClosingRef.current && wsReadyRef.current && !wsApiErrorRef.current) {
                setStatus('error');
                setErrorMessage(
                  isEn
                    ? 'Live session ended by server.'
                    : 'Sesi Maria Live telah berakhir.'
                );
              }
            }
          };

          ws.onerror = () => {
            if (isUnmountedRef.current || isClosingRef.current) return;
            // If WebSocket upgrade itself failed before Gemini API error (e.g. serverless host), fallback seamlessly to HTTP Live turns
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
            if (isUnmountedRef.current || isClosingRef.current) return;
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

        // Route processor through zero-gain node so Chrome keeps onaudioprocess ticking without mic echo
        const silentGain = inputCtx.createGain();
        silentGain.gain.value = 0;

        processor.onaudioprocess = (e) => {
          if (isUnmountedRef.current || isClosingRef.current) return;

          // Web Audio callback keeps ticking even when Chrome tab is in background; ensure 1 FPS screen frames never stall
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

          // Serverless HTTP VAD mode: detect speech start, collect PCM, auto-send after silence
          if (httpTurnInFlightRef.current) return;

          const now = Date.now();
          const speechThreshold = 0.028;

          if (!vadIsSpeakingRef.current) {
            vadPreRollRef.current.push(int16);
            if (vadPreRollRef.current.length > 3) {
              vadPreRollRef.current.shift();
            }

            if (rms > speechThreshold) {
              // Barge-in: stop Maria's TTS if user speaks clearly
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
        if (isUnmountedRef.current) return;
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
      isUnmountedRef.current = true;
      cleanupAllResources();
    };
  }, [
    cleanupAllResources,
    flushModelTurn,
    flushUserTurn,
    isEn,
    play24kAudioChunk,
    sendHttpLiveTurn,
    stopAllOutputAudio,
    stopHttpAudioPlayback,
  ]);

  // Attach MediaStream to camera <video> and manage 1 FPS video streaming (Camera OR Screen Share)
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

    // Strict <= 1 FPS streaming rate in WebSocket mode per Gemini Live API guidelines
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
    setSharedScreenPreviewUrl(initialDataUrl);
    setScreenShareMode('app');
    setIsScreenSharing(true);
    setShowScreenFallbackSheet(false);

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

    // Refresh capture right after modal unmounts and Screen Share dock renders
    setTimeout(() => {
      if (isUnmountedRef.current || isClosingRef.current || screenShareModeRef.current !== 'app') {
        return;
      }
      const settledDataUrl = renderAppScreenToDataUrl();
      if (!settledDataUrl) return;
      const settledB64 = settledDataUrl.split(',')[1];
      sharedScreenBase64Ref.current = settledB64;
      setSharedScreenPreviewUrl(settledDataUrl);
      if (
        transportModeRef.current === 'ws' &&
        wsReadyRef.current &&
        wsRef.current?.readyState === WebSocket.OPEN &&
        settledB64
      ) {
        wsRef.current.send(
          JSON.stringify({ type: 'video', data: settledB64, mimeType: 'image/jpeg' })
        );
      }
    }, 180);
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
        setSharedScreenPreviewUrl(compressedDataUrl);
        setScreenShareMode('screenshot');
        setIsScreenSharing(true);
        setShowScreenFallbackSheet(false);

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

  // Allow pasting a screenshot image directly while Maria Live is active
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
        // Chrome Desktop optimized display capture (supports tab switching bar & crisp HD stream)
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
        if (
          optErr?.name === 'TypeError' ||
          optErr?.name === 'OverconstrainedError'
        ) {
          stream = await getDisplayMediaFn({ video: true, audio: false });
        } else {
          throw optErr;
        }
      }

      // Stop old stream only after user picked the new tab/window/screen
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      stopCameraStream();

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const settings = (videoTrack.getSettings?.() || {}) as MediaTrackSettings & {
          displaySurface?: 'browser' | 'window' | 'monitor';
        };
        setDisplaySurfaceInfo({
          surface: settings.displaySurface || 'unknown',
          width: settings.width,
          height: settings.height,
        });
        videoTrack.onended = () => {
          // Only stop if this track belongs to the currently active stream
          if (screenStreamRef.current === stream) {
            stopScreenStream();
          }
        };
      } else {
        setDisplaySurfaceInfo({ surface: 'unknown' });
      }

      sharedScreenBase64Ref.current = null;
      setSharedScreenPreviewUrl(null);
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
            ? 'Direct Chrome screen capture is blocked inside this embedded preview frame. Open the app URL in a standalone Chrome tab for full tab/window sharing, or pick an option below:'
            : 'Tangkap layar Chrome dibatasi oleh jendela pratinjau tertanam (iframe). Buka link aplikasi di tab Chrome mandiri untuk berbagi tab/web lain secara live, atau pilih mode cepat di bawah:'
        );
        setShowScreenFallbackSheet(true);
      } else if (err?.name !== 'AbortError' && err?.name !== 'NotAllowedError') {
        showTempNotice(
          err?.message ||
            (isEn ? 'Screen sharing failed.' : 'Gagal memulai berbagi layar.')
        );
      }
    }
  }, [isEn, showTempNotice, stopCameraStream, stopScreenStream]);

  const handleToggleScreenShare = async () => {
    setIsPlusMenuOpen(false);
    if (isScreenSharing) {
      stopScreenStream();
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
        activeSourcesRef.current.size > 0 || httpAudioElRef.current
          ? 'speaking'
          : 'listening'
      );
    }
  };

  const handlePhotoPicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    setIsPlusMenuOpen(false);
    if (!file) return;

    try {
      const compressedDataUrl = await generateImageThumbnail(file, 1024, 0.8);
      const base64 = compressedDataUrl.split(',')[1];
      if (!base64) throw new Error('Invalid image');

      const prompt = isEn
        ? `I just shared an image named "${file.name}". Please look at it and respond naturally.`
        : `Saya baru saja membagikan foto bernama "${file.name}". Tolong lihat dan jelaskan/tanggapi foto tersebut.`;

      if (transportModeRef.current === 'ws' && wsReadyRef.current && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({ type: 'video', data: base64, mimeType: 'image/jpeg' })
        );
        wsRef.current.send(JSON.stringify({ type: 'text', text: prompt }));
      } else {
        sendHttpLiveTurn({ imageBase64: base64, textPrompt: prompt });
      }
      showTempNotice(
        isEn ? `Photo "${file.name}" shared to Maria Live` : `Foto "${file.name}" dikirim ke Maria Live`
      );
    } catch {
      showTempNotice(
        isEn ? 'Failed to send photo to Live session.' : 'Gagal mengirim foto ke Maria Live.'
      );
    }
  };

  const handleFilePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    setIsPlusMenuOpen(false);
    if (!file) return;

    try {
      if (file.type.startsWith('image/')) {
        const compressedDataUrl = await generateImageThumbnail(file, 1024, 0.8);
        const base64 = compressedDataUrl.split(',')[1];
        if (base64) {
          if (transportModeRef.current === 'ws' && wsReadyRef.current && wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(
              JSON.stringify({ type: 'video', data: base64, mimeType: 'image/jpeg' })
            );
          } else {
            sendHttpLiveTurn({
              imageBase64: base64,
              textPrompt: isEn
                ? `Analyze and briefly describe "${file.name}".`
                : `Analisis dan jelaskan singkat isi gambar "${file.name}".`,
            });
          }
          showTempNotice(
            isEn ? `Image "${file.name}" shared` : `Gambar "${file.name}" dikirim ke Maria Live`
          );
        }
        return;
      }

      let promptText: string;
      if (
        file.type.startsWith('text/') ||
        /\.(txt|md|json|csv|ts|tsx|js|jsx|py|html|css|xml|yaml|yml|log)$/i.test(file.name)
      ) {
        const text = await file.text();
        promptText = `File "${file.name}":\n${text.slice(0, 12000)}`;
      } else {
        const dataUrl = await readFileAsDataUrl(file);
        promptText = isEn
          ? `User selected file "${file.name}" (${file.type || 'document'}, ${Math.round(file.size / 1024)} KB).`
          : `Pengguna melampirkan berkas "${file.name}" (${file.type || 'dokumen'}, ${Math.round(file.size / 1024)} KB, ukuran data ${dataUrl.length}).`;
      }

      if (transportModeRef.current === 'ws' && wsReadyRef.current && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'text', text: promptText }));
      } else {
        sendHttpLiveTurn({ textPrompt: promptText });
      }
      showTempNotice(
        isEn ? `File "${file.name}" shared` : `Berkas "${file.name}" dikirim ke Maria Live`
      );
    } catch {
      showTempNotice(
        isEn ? 'Unable to read selected file.' : 'Gagal membaca berkas yang dipilih.'
      );
    }
  };

  const orbScale = 1 + Math.min(0.12, orbEnergy * 0.14);
  const orbGlow = 14 + Math.round(orbEnergy * 26);

  const statusText =
    status === 'connecting'
      ? isEn
        ? 'Connecting Maria Live...'
        : 'Menghubungkan Maria Live...'
      : status === 'thinking'
      ? isEn
        ? 'Maria Live Thinking...'
        : 'Maria Live Memproses...'
      : status === 'speaking'
      ? isEn
        ? 'Maria Live Speaking'
        : 'Maria Live Berbicara'
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

  return (
    <>
      {/* Hidden pickers for + menu inside Live mode */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
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

      {/* Mobile / Restricted Context Screen Share Alternative Sheet */}
      {showScreenFallbackSheet && (
        <div
          data-maria-screen-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
          onClick={() => setShowScreenFallbackSheet(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white dark:bg-[#151822] border border-slate-200 dark:border-[#2a2f42] p-4 shadow-2xl space-y-3 text-slate-900 dark:text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold">
                  {isEn ? 'Share Screen with Maria' : 'Bagikan Layar ke Maria'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                  {screenFallbackReason}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowScreenFallbackSheet(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-[#222636] flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={startAppScreenShare}
                className="w-full p-3 rounded-2xl border border-blue-500/30 bg-blue-50/70 dark:bg-blue-950/35 hover:bg-blue-100/70 dark:hover:bg-blue-900/40 flex items-center gap-3 text-left cursor-pointer transition"
              >
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                  <MonitorUp className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-900 dark:text-white">
                    {isEn ? 'Share App View (Live)' : 'Bagikan Tampilan Aplikasi (Live)'}
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-300">
                    {isEn
                      ? 'Maria reads your current Maria AI screen in real time'
                      : 'Maria membaca layar obrolan/kode aplikasi secara langsung'}
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => screenPickerInputRef.current?.click()}
                className="w-full p-3 rounded-2xl border border-slate-200 dark:border-[#2a2f42] hover:bg-slate-50 dark:hover:bg-[#1e2230] flex items-center gap-3 text-left cursor-pointer transition"
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-900 dark:text-white">
                    {isEn ? 'Share Phone Screenshot' : 'Bagikan Tangkapan Layar (Screenshot)'}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {isEn
                      ? 'Pick or paste a screenshot of another app on your phone'
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
                className="w-full p-3 rounded-2xl border border-slate-200 dark:border-[#2a2f42] hover:bg-slate-50 dark:hover:bg-[#1e2230] flex items-center gap-3 text-left cursor-pointer transition"
              >
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                  <Video className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-900 dark:text-white">
                    {isEn ? 'Point Rear Camera' : 'Gunakan Kamera Belakang'}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
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
                          ? 'App URL copied! Paste in a new Chrome Desktop tab for full screen sharing.'
                          : 'Link disalin! Tempel di tab Chrome Desktop baru untuk berbagi tab/layar penuh.'
                      );
                    } catch {
                      showTempNotice(
                        isEn ? 'Unable to copy link.' : 'Gagal menyalin link.'
                      );
                    }
                  }}
                  className="w-full p-3 rounded-2xl border border-amber-500/30 bg-amber-50/70 dark:bg-amber-950/25 hover:bg-amber-100/70 dark:hover:bg-amber-900/35 flex items-center gap-3 text-left cursor-pointer transition"
                >
                  <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0">
                    <Copy className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-900 dark:text-white">
                      {isEn ? 'Copy Link for Standalone Chrome Tab' : 'Salin Link untuk Tab Penuh Chrome Desktop'}
                    </div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-300">
                      {isEn
                        ? 'Open directly outside preview iframe to share any Chrome tab or window'
                        : 'Buka di luar frame pratinjau agar bisa berbagi tab web lain atau layar penuh'}
                    </div>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Full-Stage Live Camera Viewfinder Overlay */}
      {isCameraOn && (
        <div className="fixed inset-x-3 sm:inset-x-6 top-16 bottom-28 sm:bottom-32 z-30 rounded-3xl overflow-hidden bg-slate-950 border border-slate-700/70 shadow-2xl flex items-center justify-center animate-in fade-in duration-150">
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
              <div className="w-6 h-6 border-2 border-slate-600 border-t-blue-400 rounded-full animate-spin" />
              <span>{isEn ? 'Starting camera...' : 'Menyiapkan kamera...'}</span>
            </div>
          )}

          {/* Top Bar inside Camera View */}
          <div className="absolute top-3 inset-x-3 flex items-center justify-between pointer-events-none">
            <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-xs font-semibold flex items-center gap-1.5 border border-white/15">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <span>Maria Live Camera</span>
            </span>

            <div className="flex items-center gap-2 pointer-events-auto">
              <button
                type="button"
                onClick={handleFlipCamera}
                title={isEn ? 'Switch camera' : 'Putar kamera'}
                className="w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white border border-white/15 flex items-center justify-center cursor-pointer active:scale-95 transition"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={stopCameraStream}
                title={isEn ? 'Turn off camera' : 'Matikan kamera'}
                className="w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white border border-white/15 flex items-center justify-center cursor-pointer active:scale-95 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Maria Live Dock */}
      <div
        data-maria-live-dock="true"
        className="max-w-3xl mx-auto w-full px-3 sm:px-4 select-none relative z-40"
      >
        {/* Screen Share Preview Card */}
        {isScreenSharing && (
          <div className="mb-2.5 mx-auto max-w-md rounded-2xl bg-slate-900/95 dark:bg-[#151822]/95 border border-blue-500/40 p-2 flex items-center justify-between gap-2.5 shadow-xl text-white">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                data-maria-live-preview-thumb="true"
                className="w-16 h-10 rounded-lg overflow-hidden bg-black border border-white/15 shrink-0"
              >
                {screenShareMode === 'display' ? (
                  <video
                    ref={screenVideoRef}
                    autoPlay
                    playsInline
                    muted
                    onLoadedData={() => {
                      const v = screenVideoRef.current;
                      if (v && v.videoWidth && v.videoHeight) {
                        setDisplaySurfaceInfo((prev) => ({
                          surface: prev?.surface || 'unknown',
                          width: v.videoWidth,
                          height: v.videoHeight,
                        }));
                      }
                      pushCurrentVideoFrameNow();
                    }}
                    className="w-full h-full object-cover"
                  />
                ) : sharedScreenPreviewUrl ? (
                  <img
                    src={sharedScreenPreviewUrl}
                    alt="Screen preview"
                    className="w-full h-full object-cover"
                  />
                ) : null}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold flex items-center gap-1.5 text-blue-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  <span className="truncate">
                    {screenShareMode === 'app'
                      ? isEn
                        ? 'App Screen Active'
                        : 'Layar Aplikasi Aktif'
                      : screenShareMode === 'screenshot'
                      ? isEn
                        ? 'Screenshot Share Active'
                        : 'Layar Screenshot Aktif'
                      : displaySurfaceInfo?.surface === 'browser'
                      ? isEn
                        ? 'Chrome Tab Shared'
                        : 'Tab Chrome Dibagikan'
                      : displaySurfaceInfo?.surface === 'window'
                      ? isEn
                        ? 'Window Shared'
                        : 'Jendela Dibagikan'
                      : displaySurfaceInfo?.surface === 'monitor'
                      ? isEn
                        ? 'Entire Screen Shared'
                        : 'Seluruh Layar Dibagikan'
                      : isEn
                      ? 'Screen Sharing Active'
                      : 'Berbagi Layar Aktif'}
                  </span>
                </div>
                <p className="text-[10px] text-slate-300 truncate">
                  {screenShareMode === 'display' && displaySurfaceInfo?.width && displaySurfaceInfo?.height
                    ? `${displaySurfaceInfo.width}×${displaySurfaceInfo.height} · ${
                        isEn ? 'HD live feed to Maria' : 'Tampilan HD aktif ke Maria'
                      }`
                    : isEn
                    ? 'Maria Live can see your screen'
                    : 'Maria Live melihat tampilan layar Anda'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {screenShareMode === 'display' && (
                <button
                  type="button"
                  onClick={() => startDesktopDisplayShare()}
                  title={isEn ? 'Switch shared tab, window, or screen' : 'Tukar tab, jendela, atau layar yang dibagikan'}
                  className="px-2 py-1.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/35 text-blue-200 border border-blue-400/30 text-[11px] font-semibold cursor-pointer"
                >
                  {isEn ? 'Switch' : 'Tukar'}
                </button>
              )}
              {screenShareMode === 'screenshot' && (
                <button
                  type="button"
                  onClick={() => screenPickerInputRef.current?.click()}
                  className="px-2 py-1.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/35 text-blue-200 border border-blue-400/30 text-[11px] font-semibold cursor-pointer"
                >
                  {isEn ? 'Swap' : 'Ganti'}
                </button>
              )}
              <button
                type="button"
                onClick={stopScreenStream}
                className="px-2.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/35 text-rose-200 border border-rose-400/30 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Square className="w-3 h-3 fill-current" />
                <span>{isEn ? 'Stop' : 'Hentikan'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Inline Error or Action Notice Banner */}
        {errorMessage && (
          <div className="mb-2.5 mx-auto max-w-md px-3.5 py-2.5 rounded-2xl bg-rose-50 dark:bg-rose-950/90 border border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-100 text-xs flex items-center justify-between gap-2.5 shadow-lg">
            <div className="flex items-center gap-2 min-w-0">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
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
          <div className="mb-2 mx-auto max-w-fit px-3 py-1.5 rounded-full bg-slate-900/90 dark:bg-[#1b1f2e] text-white border border-slate-700/70 text-[11px] font-medium flex items-center gap-1.5 shadow-lg">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>{noticeMessage}</span>
          </div>
        )}

        {/* Live Transcript / Caption Card */}
        {(liveModelCaption || liveUserCaption) && (
          <div className="mb-2.5 mx-auto max-w-xl px-4 py-2.5 rounded-2xl bg-slate-900/88 dark:bg-[#141720]/92 backdrop-blur-md text-white border border-slate-700/70 shadow-xl space-y-1 text-xs leading-relaxed">
            {liveUserCaption && (
              <p className="text-slate-300">
                <span className="font-semibold text-sky-300">
                  {isEn ? 'You: ' : 'Anda: '}
                </span>
                <span>{liveUserCaption}</span>
              </p>
            )}
            {liveModelCaption && (
              <p className="text-white font-normal">
                <span className="font-semibold text-blue-400">Maria: </span>
                <span>{liveModelCaption}</span>
              </p>
            )}
          </div>
        )}

        {/* Live Attachment Popover above [+] button */}
        <div className="relative flex flex-col items-center">
          {isPlusMenuOpen && (
            <div
              ref={plusMenuRef}
              className="absolute bottom-16 left-1/2 -translate-x-44 sm:-translate-x-52 w-52 rounded-2xl border p-1.5 shadow-2xl z-50 bg-white border-slate-200 text-slate-800 dark:bg-[#1a1d28] dark:border-[#2e3345] dark:text-slate-100 animate-in fade-in duration-100"
            >
              <button
                type="button"
                onClick={handleToggleScreenShare}
                className="w-full px-3 py-2.5 rounded-xl flex items-center gap-3 text-xs font-medium hover:bg-slate-100 dark:hover:bg-[#252938] text-left cursor-pointer"
              >
                <MonitorUp className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>
                  {isScreenSharing
                    ? isEn
                      ? 'Stop Screen Share'
                      : 'Hentikan Bagikan Layar'
                    : isEn
                    ? 'Screen Share'
                    : 'Bagikan Layar'}
                </span>
              </button>
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="w-full px-3 py-2.5 rounded-xl flex items-center gap-3 text-xs font-medium hover:bg-slate-100 dark:hover:bg-[#252938] text-left cursor-pointer"
              >
                <ImageIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{isEn ? 'Photos' : 'Foto'}</span>
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full px-3 py-2.5 rounded-xl flex items-center gap-3 text-xs font-medium hover:bg-slate-100 dark:hover:bg-[#252938] text-left cursor-pointer"
              >
                <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span>{isEn ? 'Files' : 'Berkas'}</span>
              </button>
            </div>
          )}

          {/* Main Floating Live Pill Controls: [+] [Camera] [Glowing Orb] [Mute] [End X] */}
          <div className="flex items-center justify-center gap-2 sm:gap-3 py-1">
            {/* + Button */}
            <button
              type="button"
              onClick={() => setIsPlusMenuOpen((prev) => !prev)}
              title={isEn ? 'Share Screen, Photos, Files' : 'Bagikan Layar, Foto, Berkas'}
              aria-label={isEn ? 'Share media' : 'Bagikan media'}
              className={`w-11 h-11 rounded-full border flex items-center justify-center cursor-pointer active:scale-95 transition-colors shadow-sm ${
                isPlusMenuOpen || isScreenSharing
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-slate-100 border-slate-200 text-slate-800 hover:bg-slate-200 dark:bg-[#1c1f29] dark:border-[#2e3242] dark:text-slate-100 dark:hover:bg-[#262a37]'
              }`}
            >
              <Plus
                className={`w-5 h-5 transition-transform duration-150 ${
                  isPlusMenuOpen ? 'rotate-45' : ''
                }`}
              />
            </button>

            {/* Desktop 1-Click Screen Share Button */}
            <button
              type="button"
              onClick={handleToggleScreenShare}
              title={
                isScreenSharing
                  ? isEn
                    ? 'Stop Screen Share'
                    : 'Hentikan Bagikan Layar'
                  : isEn
                  ? 'Share Chrome Tab, Window, or Screen'
                  : 'Bagikan Tab Chrome, Jendela, atau Layar'
              }
              aria-label={isEn ? 'Share screen' : 'Bagikan layar'}
              className={`hidden sm:flex w-11 h-11 rounded-full border items-center justify-center cursor-pointer active:scale-95 transition-colors shadow-sm ${
                isScreenSharing
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-slate-100 border-slate-200 text-slate-800 hover:bg-slate-200 dark:bg-[#1c1f29] dark:border-[#2e3242] dark:text-slate-100 dark:hover:bg-[#262a37]'
              }`}
            >
              <MonitorUp className="w-[18px] h-[18px]" />
            </button>

            {/* Camera Toggle Button */}
            <button
              type="button"
              onClick={handleToggleCamera}
              title={isCameraOn ? (isEn ? 'Turn off camera' : 'Matikan kamera') : (isEn ? 'Start Live camera' : 'Nyalakan kamera Live')}
              aria-label={isEn ? 'Toggle camera' : 'Aktifkan atau matikan kamera'}
              className={`w-11 h-11 rounded-full border flex items-center justify-center cursor-pointer active:scale-95 transition-colors shadow-sm ${
                isCameraOn
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-slate-100 border-slate-200 text-slate-800 hover:bg-slate-200 dark:bg-[#1c1f29] dark:border-[#2e3242] dark:text-slate-100 dark:hover:bg-[#262a37]'
              }`}
            >
              {isCameraOn ? <VideoOff className="w-[18px] h-[18px]" /> : <Video className="w-[18px] h-[18px]" />}
            </button>

            {/* Center Audio-Reactive Gemini Live Glowing Orb Pill */}
            <div
              className="relative h-11 sm:h-12 w-28 sm:w-36 rounded-full overflow-hidden flex items-center justify-center border border-blue-400/40 select-none transition-transform duration-75"
              style={{
                transform: `scale(${orbScale.toFixed(3)})`,
                boxShadow: `0 0 ${orbGlow}px rgba(37, 99, 235, ${
                  status === 'speaking' ? 0.65 : status === 'connecting' || status === 'thinking' ? 0.45 : 0.4
                })`,
                background:
                  'radial-gradient(circle at 50% 85%, #60a5fa 0%, #2563eb 36%, #0f172a 78%, #020617 100%)',
              }}
              aria-label={statusText}
            >
              <div
                className={`absolute inset-x-3 bottom-0 h-5 rounded-full blur-md pointer-events-none transition-opacity duration-150 ${
                  status === 'connecting' || status === 'thinking'
                    ? 'animate-pulse bg-sky-400/75'
                    : 'bg-sky-300/75'
                }`}
                style={{
                  opacity: Math.min(1, 0.35 + orbEnergy * 0.8),
                }}
              />
              {(status === 'connecting' || status === 'thinking') && (
                <div className="w-4 h-4 border-2 border-sky-200/40 border-t-white rounded-full animate-spin relative z-10" />
              )}
            </div>

            {/* Mute / Unmute Microphone Button */}
            <button
              type="button"
              onClick={handleToggleMute}
              title={isMuted ? (isEn ? 'Unmute mic' : 'Bunyikan mikrofon') : (isEn ? 'Mute mic' : 'Bisukan mikrofon')}
              aria-label={isMuted ? 'Unmute' : 'Mute'}
              className={`w-11 h-11 rounded-full border flex items-center justify-center cursor-pointer active:scale-95 transition-colors shadow-sm ${
                isMuted
                  ? 'bg-rose-500/15 border-rose-500/50 text-rose-500 dark:bg-rose-500/20 dark:text-rose-400'
                  : 'bg-slate-100 border-slate-200 text-slate-800 hover:bg-slate-200 dark:bg-[#1c1f29] dark:border-[#2e3242] dark:text-slate-100 dark:hover:bg-[#262a37]'
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
              className="w-11 h-11 rounded-full border flex items-center justify-center cursor-pointer active:scale-95 transition-colors shadow-sm bg-slate-200 border-slate-300 text-slate-900 hover:bg-rose-600 hover:text-white hover:border-rose-600 dark:bg-[#242834] dark:border-[#353a4c] dark:text-white dark:hover:bg-rose-600 dark:hover:border-rose-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Bottom Status Caption */}
        <div className="flex items-center justify-center pt-1.5 pb-1 select-none text-[10px] font-medium tracking-wider text-slate-400 dark:text-slate-500 uppercase">
          <span>{statusText}</span>
        </div>
      </div>
    </>
  );
};
