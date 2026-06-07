import React, { useEffect, useRef, useState } from "react";
import { X, Mic, MicOff, PhoneOff, Radio, Sparkles, Volume2, ShieldAlert } from "lucide-react";

interface GeminiLiveCallProps {
  isOpen: boolean;
  onClose: () => void;
  username?: string;
}

export default function GeminiLiveCall({ isOpen, onClose, username = "Pengguna" }: GeminiLiveCallProps) {
  const [status, setStatus] = useState<"disconnected" | "connecting" | "connected" | "error">("disconnected");
  const [errorMsg, setErrorMsg] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [activeVoice, setActiveVoice] = useState("Zephyr");
  const [lastTranscript, setLastTranscript] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false); // Maria speaking flag

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const soundWaveTimerRef = useRef<number | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Soundwave animation elements
  const [waveBars, setWaveBars] = useState<number[]>(Array(16).fill(10));

  useEffect(() => {
    if (isOpen) {
      connectCall();
    } else {
      disconnectCall();
    }
    return () => {
      cleanupAudio();
    };
  }, [isOpen]);

  // Handle visual wave frequency pulses
  useEffect(() => {
    if (status === "connected") {
      soundWaveTimerRef.current = window.setInterval(() => {
        setWaveBars(prev => 
          prev.map(() => {
            if (isSpeaking) {
              return Math.floor(Math.random() * 55) + 20; // Hyperactive speaking bars
            }
            if (!isMuted) {
              return Math.floor(Math.random() * 20) + 5; // Ambient mic listening bars
            }
            return 4; // Flat line
          })
        );
      }, 100);
    } else {
      if (soundWaveTimerRef.current) {
        clearInterval(soundWaveTimerRef.current);
      }
      setWaveBars(Array(16).fill(4));
    }
    return () => {
      if (soundWaveTimerRef.current) {
        clearInterval(soundWaveTimerRef.current);
      }
    };
  }, [status, isSpeaking, isMuted]);

  // Canvas drawing for premium fluid sphere or particle visual
  useEffect(() => {
    if (status !== "connected" || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let phase = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const baseRadius = 55;
      
      // Draw pulsing backdrop aura
      const pulseFactor = isSpeaking ? Math.sin(phase * 4) * 15 + 10 : Math.sin(phase) * 6 + 2;
      const gradient = ctx.createRadialGradient(cx, cy, baseRadius - 10, cx, cy, baseRadius + pulseFactor + 30);
      
      if (isSpeaking) {
        gradient.addColorStop(0, "rgba(99, 102, 241, 0.2)");
        gradient.addColorStop(0.5, "rgba(168, 85, 247, 0.08)");
        gradient.addColorStop(1, "rgba(224, 242, 254, 0)");
      } else {
        gradient.addColorStop(0, "rgba(59, 130, 246, 0.12)");
        gradient.addColorStop(0.5, "rgba(30, 41, 59, 0.04)");
        gradient.addColorStop(1, "rgba(0,0,0,0)");
      }

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(cx, cy, baseRadius + pulseFactor + 30, 0, Math.PI * 2);
      ctx.fill();

      // Draw fluid floating wave inside ring
      ctx.strokeStyle = isSpeaking ? "#a855f7" : "#3b82f6";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let angle = 0; angle < Math.PI * 2; angle += 0.05) {
        const offset = Math.sin(angle * 6 + phase * 5) * (isSpeaking ? 7 : 2.5);
        const r = baseRadius + offset;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        if (angle === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();

      // Outer thin satellite particles rotating
      ctx.fillStyle = isSpeaking ? "rgba(232, 121, 249, 0.6)" : "rgba(96, 165, 250, 0.4)";
      for (let i = 0; i < 3; i++) {
        const angle = phase + (i * Math.PI * 2) / 3;
        const px = cx + Math.cos(angle * 1.5) * (baseRadius + 25);
        const py = cy + Math.sin(angle * 1.5) * (baseRadius + 25);
        ctx.beginPath();
        ctx.arc(px, py, isSpeaking ? 4.5 : 3, 0, Math.PI * 2);
        ctx.fill();
      }

      phase += isSpeaking ? 0.07 : 0.035;
      animId = requestAnimationFrame(render);
    };

    render();
    return () => {
      cancelAnimationFrame(animId);
    };
  }, [status, isSpeaking]);

  const connectCall = async () => {
    setStatus("connecting");
    setErrorMsg("");
    setLastTranscript("");
    nextStartTimeRef.current = 0;

    try {
      // 1. Establish microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      mediaStreamRef.current = stream;

      // 2. Setup WebSocket connection to Express server `/live` end point
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host;
      wsRef.current = new WebSocket(`${protocol}//${host}/live`);

      wsRef.current.onopen = () => {
        console.log("WebSocket client bridge open");
        setStatus("connected");
        startRecording();
      };

      wsRef.current.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          
          if (payload.error) {
            setErrorMsg(payload.error);
            setStatus("error");
            disconnectCall();
            return;
          }

          if (payload.audio) {
            setIsSpeaking(true);
            playAudioChunk(payload.audio);
          }

          if (payload.text) {
            setLastTranscript(prev => prev + " " + payload.text);
          }

          if (payload.turnComplete) {
            // Reset speaking indicator shortly after audio stops
            setTimeout(() => {
              setIsSpeaking(false);
            }, 600);
          }

          if (payload.interrupted) {
            console.log("Maria speaking was cut off");
            setIsSpeaking(false);
            // Instant speech cancel
            nextStartTimeRef.current = 0;
          }
        } catch (e) {
          console.error("Error reading live socket frame:", e);
        }
      };

      wsRef.current.onclose = () => {
        console.log("WebSocket connection closed cleanly");
        setStatus("disconnected");
      };

      wsRef.current.onerror = (e) => {
        console.error("Live socket connection error:", e);
        setErrorMsg("WebSocket connection failed.");
        setStatus("error");
      };

    } catch (e: any) {
      console.error("Error creating live voice link:", e);
      setErrorMsg(e.message || "Izin mikrofon ditolak atau dibatalkan browser.");
      setStatus("error");
    }
  };

  const startRecording = () => {
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtxClass({ sampleRate: 16000 });
      audioContextRef.current = audioCtx;

      if (!mediaStreamRef.current) return;
      
      const source = audioCtx.createMediaStreamSource(mediaStreamRef.current);
      sourceRef.current = source;

      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      source.connect(processor);
      processor.connect(audioCtx.destination);

      const inputSampleRate = audioCtx.sampleRate;

      processor.onaudioprocess = (e) => {
        if (isMuted || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

        const rawData = e.inputBuffer.getChannelData(0);
        // Downsample Float32 down to 16000Hz PCM
        const downsampled = downsampleBuffer(rawData, inputSampleRate, 16000);
        // Conversion inside binary ArrayBuffer
        const pcmBuffer = floatTo16BitPCM(downsampled);
        // Transform base64 representation
        const base64 = arrayBufferToBase64(pcmBuffer);

        wsRef.current.send(JSON.stringify({ audio: base64 }));
      };
    } catch (e) {
      console.error("Error running client recording context:", e);
    }
  };

  const playAudioChunk = (base64Audio: string) => {
    try {
      const audioCtx = audioContextRef.current;
      if (!audioCtx) return;

      const floats = base64ToFloat32(base64Audio);
      // Create audio buffer at 24000Hz (standard Gemini Live output frequency)
      const buffer = audioCtx.createBuffer(1, floats.length, 24000);
      buffer.copyToChannel(floats, 0);

      const source = audioCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(audioCtx.destination);

      const currentTime = audioCtx.currentTime;
      if (nextStartTimeRef.current < currentTime) {
        nextStartTimeRef.current = currentTime + 0.03; // Tiny buffer delay to prevent pops
      }
      source.start(nextStartTimeRef.current);
      nextStartTimeRef.current += buffer.duration;
    } catch (e) {
      console.error("Error inside audio player node:", e);
    }
  };

  const disconnectCall = () => {
    cleanupAudio();
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch (e) {
        // quiet
      }
      wsRef.current = null;
    }
    setStatus("disconnected");
    setIsSpeaking(false);
  };

  const cleanupAudio = () => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (e) {
        // ignore
      }
      audioContextRef.current = null;
    }
  };

  // HELPERS FOR PCM CONVERSIONS
  const downsampleBuffer = (buffer: Float32Array, inputSampleRate: number, outputSampleRate = 16000): Float32Array => {
    if (inputSampleRate === outputSampleRate) return buffer;
    const sampleRateRatio = inputSampleRate / outputSampleRate;
    const newLength = Math.round(buffer.length / sampleRateRatio);
    const result = new Float32Array(newLength);
    let offsetResult = 0;
    let offsetBuffer = 0;
    while (offsetResult < result.length) {
      const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
      let accum = 0;
      let count = 0;
      for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
        accum += buffer[i];
        count++;
      }
      result[offsetResult] = count > 0 ? accum / count : 0;
      offsetResult++;
      offsetBuffer = nextOffsetBuffer;
    }
    return result;
  };

  const floatTo16BitPCM = (input: Float32Array): ArrayBuffer => {
    const buffer = new ArrayBuffer(input.length * 2);
    const view = new DataView(buffer);
    let offset = 0;
    for (let i = 0; i < input.length; i++, offset += 2) {
      let s = Math.max(-1, Math.min(1, input[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    return buffer;
  };

  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  };

  const base64ToFloat32 = (base64: string): Float32Array => {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const int16Array = new Int16Array(bytes.buffer);
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 32768.0;
    }
    return float32Array;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 select-none font-sans" id="gemini-live-viewport">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" onClick={onClose}></div>

      {/* Main Calling Box */}
      <div className="relative w-full max-w-md bg-[#0e1014] text-slate-100 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col items-center p-6 select-none animate-scale-up">
        
        {/* Header */}
        <div className="w-full flex items-center justify-between border-b border-slate-900 pb-4 mb-4">
          <div className="flex items-center gap-2">
            <Radio className={`w-4 h-4 ${status === "connected" ? "text-red-500 animate-pulse" : "text-slate-500"}`} />
            <span className="text-xs font-mono font-medium tracking-wide uppercase text-slate-400">
              {status === "connecting" ? "Menghubungkan..." : status === "connected" ? "Maria Live Aktif" : "Sesi Panggilan"}
            </span>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="p-1.5 hover:bg-slate-900 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Visual Call Interface Content */}
        <div className="w-full h-56 flex flex-col items-center justify-center relative my-4">
          <canvas ref={canvasRef} width={220} height={220} className="absolute z-10" />
          
          <div className="relative z-20 flex flex-col items-center justify-center text-center">
            {/* Avatar overlay inside circle */}
            <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-xl font-bold text-white shadow-lg">
              M
            </div>
            <div className="mt-3">
              <h2 className="font-display font-bold text-lg text-white">Maria AI (Live voice)</h2>
              <p className="text-[11px] text-slate-450 mt-1">
                {status === "connecting" && "Memulai saluran aman..."}
                {status === "connected" && (isSpeaking ? "🗣️ Sedang berbicara..." : "🎙️ Menyimak Kakak...")}
                {status === "disconnected" && "Sesi panggilan terputus"}
                {status === "error" && "Gagal Menyambung"}
              </p>
            </div>
          </div>
        </div>

        {/* Sound Frequency Bars list */}
        {status === "connected" && (
          <div className="flex items-center justify-center gap-1.5 h-14 w-full mb-4 px-8">
            {waveBars.map((h, i) => (
              <div 
                key={i} 
                style={{ height: `${h}px` }} 
                className={`w-1 rounded-full transition-all duration-100 ${isSpeaking ? "bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]" : "bg-blue-500/80"}`} 
              />
            ))}
          </div>
        )}

        {/* Error warning notification */}
        {status === "error" && (
          <div className="w-full bg-red-950/40 border border-red-500/30 text-red-200 p-3 rounded-2xl mb-4 text-xs flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Kesalahan Sambungan:</p>
              <p className="text-[11px] text-red-300 mt-1">{errorMsg || "Gagal membuka sambungan mikrofon."}</p>
            </div>
          </div>
        )}

        {/* Captions and dynamic subtitle text */}
        {status === "connected" && (
          <div className="w-full min-h-12 bg-slate-900/40 border border-slate-900/80 rounded-2xl p-3 text-center mb-6 max-h-24 overflow-y-auto">
            <p className="text-[11px] font-mono leading-relaxed text-slate-350 italic">
              {lastTranscript.trim() ? lastTranscript : "Coba ucapkan: \"Halo Maria, apa kabar?\"..."}
            </p>
          </div>
        )}

        {/* Controls Panel */}
        <div className="w-full flex items-center justify-center gap-4 mt-2">
          {/* Mute Mic toggle button */}
          <button
            type="button"
            disabled={status !== "connected"}
            onClick={() => setIsMuted(!isMuted)}
            className={`p-4 rounded-full transition-all cursor-pointer flex items-center justify-center hover:scale-105 active:scale-95 duration-200 disabled:opacity-30 ${
              isMuted ? "bg-red-500 text-white" : "bg-slate-900 text-slate-300 hover:text-white"
            }`}
            title={isMuted ? "Buka Bisu Mikrofon" : "Bisu Mikrofon"}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Connect / Disconnect trigger action call */}
          {status === "disconnected" || status === "error" ? (
            <button
              type="button"
              onClick={connectCall}
              className="px-6 py-4 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm tracking-wide shadow-lg hover:shadow-emerald-600/20 active:scale-95 duration-200 cursor-pointer flex items-center gap-2"
            >
              <Volume2 className="w-4 h-4" />
              <span>Mulai Panggilan</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={disconnectCall}
              className="p-4 rounded-full bg-red-600 hover:bg-red-500 text-white hover:scale-105 active:scale-95 duration-200 flex items-center justify-center cursor-pointer shadow-lg shadow-red-600/10"
              title="Akhiri Panggilan"
            >
              <PhoneOff className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Dynamic Tip Footer notes */}
        <div className="mt-6 border-t border-slate-900 pt-3 text-center w-full">
          <p className="text-[10px] text-slate-500 flex items-center justify-center gap-1">
            <Sparkles className="w-3 h-3 text-purple-400" />
            <span>Suara diproses langsung secara lisan oleh Google Gemini Live API</span>
          </p>
        </div>

      </div>
    </div>
  );
}
