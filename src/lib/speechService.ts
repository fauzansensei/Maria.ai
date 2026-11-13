// Maria AI Unified Speech & TTS Service
// Powered by Gemini AI Voice Engine (Aoede, Kore, Puck, Fenrir, Zephyr, Charon) & Web Audio API
// High-fidelity, zero-latency playback immune to browser autoplay blocking

export interface SpeechState {
  isSpeaking: boolean;
  isLoading: boolean;
  activeMessageId: string | null;
  currentEngine: 'gemini' | null;
  activeModel?: string | null;
  error: string | null;
}

type SpeechListener = (state: SpeechState) => void;

class MariaSpeechService {
  private audioCtx: AudioContext | null = null;
  private currentSourceNode: AudioBufferSourceNode | null = null;
  private reusableAudio: HTMLAudioElement | null = null;
  private listeners: Set<SpeechListener> = new Set();
  private ttsCache: Map<string, string> = new Map();
  private speechDictionary: Array<{ term: string; pronunciation?: string }> = [];
  private state: SpeechState = {
    isSpeaking: false,
    isLoading: false,
    activeMessageId: null,
    currentEngine: null,
    activeModel: null,
    error: null,
  };

  constructor() {
    if (typeof window !== 'undefined') {
      // Load saved dictionary from maria_settings if available
      try {
        const saved = localStorage.getItem('maria_settings');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed?.speechDictionary)) {
            this.speechDictionary = parsed.speechDictionary;
          }
        }
      } catch {}

      // Lazy init audio context on first touch
      const initContext = () => {
        this.unlockAudio();
        window.removeEventListener('click', initContext);
        window.removeEventListener('keydown', initContext);
        window.removeEventListener('touchstart', initContext);
      };
      window.addEventListener('click', initContext, { once: true });
      window.addEventListener('keydown', initContext, { once: true });
      window.addEventListener('touchstart', initContext, { once: true });
    }
  }

  public setDictionary(entries: Array<{ term: string; pronunciation?: string }>) {
    this.speechDictionary = Array.isArray(entries) ? entries : [];
    this.ttsCache.clear();
  }

  public subscribe(listener: SpeechListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((fn) => fn({ ...this.state }));
  }

  private setState(updates: Partial<SpeechState>) {
    this.state = { ...this.state, ...updates };
    this.notify();
  }

  public getState(): SpeechState {
    return { ...this.state };
  }

  // Cleans markdown formatting, links, and code blocks for fluid speech, applying custom dictionary
  public cleanTextForSpeech(text: string): string {
    if (!text) return '';
    let cleaned = text
      .replace(/```[\s\S]*?```/g, ' bagian kode dilewati ')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/[#*_~>•]/g, ' ')
      .replace(/\|[^\n]+\|/g, ' ')
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}\u{200D}\u{FE0F}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}\u{1F3FB}-\u{1F3FF}]/gu, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (this.speechDictionary.length > 0) {
      for (const entry of this.speechDictionary) {
        const term = entry.term?.trim();
        const pron = entry.pronunciation?.trim();
        if (term && pron) {
          const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          cleaned = cleaned.replace(new RegExp(`\\b${escaped}\\b`, 'gi'), pron);
        }
      }
    }

    return cleaned;
  }

  /**
   * Pre-unlocks Web Audio Context & HTML5 Audio within user interaction gesture.
   * This guarantees that when asynchronous TTS arrives, audio plays without autoplay blocking.
   */
  public unlockAudio() {
    try {
      if (typeof window === 'undefined') return;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        if (!this.audioCtx) {
          this.audioCtx = new AudioCtx();
        }
        if (this.audioCtx.state === 'suspended') {
          this.audioCtx.resume().catch(() => {});
        }
      }

      if (!this.reusableAudio) {
        this.reusableAudio = new Audio();
        this.reusableAudio.volume = 1.0;
      }
    } catch (e) {
      console.warn('Audio unlock warning:', e);
    }
  }

  public stopSpeaking() {
    // 1. Stop Web Audio API source node
    if (this.currentSourceNode) {
      try {
        this.currentSourceNode.stop();
        this.currentSourceNode.disconnect();
      } catch {}
      this.currentSourceNode = null;
    }

    // 2. Stop HTML5 audio element
    if (this.reusableAudio) {
      try {
        this.reusableAudio.pause();
        this.reusableAudio.currentTime = 0;
      } catch {}
    }

    this.setState({
      isSpeaking: false,
      isLoading: false,
      activeMessageId: null,
      currentEngine: null,
      activeModel: null,
      error: null,
    });
  }

  public async playAudioDirectly(
    audioUrl: string,
    options?: {
      messageId?: string;
      speed?: string;
      personaId?: string;
      model?: string;
    }
  ): Promise<boolean> {
    this.stopSpeaking();
    this.unlockAudio();
    const speedMultiplier = this.parseSpeed(options?.speed);
    const messageId = options?.messageId || null;
    return this.playAudioUrl(audioUrl, speedMultiplier, messageId, options?.personaId, options?.model);
  }

  // Pre-fetches AI voice in the background while text is streaming so it plays instantly when finished
  public prefetchSpeech(
    rawText: string,
    options?: {
      voiceName?: string;
      personaId?: string;
      ttsModel?: string;
    }
  ): void {
    const cleanText = this.cleanTextForSpeech(rawText);
    if (!cleanText || cleanText.length < 30) return;

    const personaId = options?.personaId || 'wanita';
    const voiceName = options?.voiceName || 'Aoede';
    const ttsModel = options?.ttsModel || 'gemini-3.8-flash-lite-tts';
    const cacheKey = `${ttsModel}:${voiceName}:${personaId}:${cleanText.slice(0, 300)}`;

    if (this.ttsCache.has(cacheKey)) return;

    fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: cleanText.slice(0, 5000),
        voiceName,
        personaId,
        model: ttsModel,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.audioUrl) {
          this.ttsCache.set(cacheKey, data.audioUrl);
        }
      })
      .catch(() => {});
  }

  public async speak(
    rawText: string,
    options?: {
      messageId?: string;
      speed?: string;
      voiceName?: string;
      personaId?: string;
      ttsModel?: 'gemini-3.8-flash-lite-tts' | 'gemini-3.8-flash-tts';
      preferEngine?: 'gemini';
      preloadedAudioUrl?: string;
    }
  ): Promise<boolean> {
    this.stopSpeaking();
    this.unlockAudio();

    const messageId = options?.messageId || null;
    const speedMultiplier = this.parseSpeed(options?.speed);
    const personaId = options?.personaId || 'wanita';
    const voiceName = options?.voiceName || 'Aoede';
    const ttsModel = options?.ttsModel || 'gemini-3.8-flash-lite-tts';

    // If preloaded audio already exists, play immediately
    if (options?.preloadedAudioUrl) {
      return this.playAudioUrl(options.preloadedAudioUrl, speedMultiplier, messageId, personaId, ttsModel);
    }

    const cleanText = this.cleanTextForSpeech(rawText);
    if (!cleanText) return false;

    this.setState({
      isLoading: true,
      activeMessageId: messageId,
      currentEngine: 'gemini',
      activeModel: ttsModel,
      error: null,
    });

    try {
      const cacheKey = `${ttsModel}:${voiceName}:${personaId}:${cleanText.slice(0, 300)}`;
      if (this.ttsCache.has(cacheKey)) {
        const cachedUrl = this.ttsCache.get(cacheKey)!;
        const played = await this.playAudioUrl(cachedUrl, speedMultiplier, messageId, personaId, ttsModel);
        if (played) return true;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 35000);

      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: cleanText.slice(0, 6000), // Supports full-length reading up to 6000 chars without cutting off
          voiceName,
          personaId,
          model: ttsModel,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data?.audioUrl) {
          this.ttsCache.set(cacheKey, data.audioUrl);
          const played = await this.playAudioUrl(
            data.audioUrl,
            speedMultiplier,
            messageId,
            personaId,
            data.model || ttsModel
          );
          if (played) return true;
        } else if (data?.notice) {
          this.setState({
            isSpeaking: false,
            isLoading: false,
            activeMessageId: null,
            currentEngine: null,
            activeModel: null,
            error: data.notice,
          });
          return false;
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        this.setState({
          isSpeaking: false,
          isLoading: false,
          activeMessageId: null,
          currentEngine: null,
          activeModel: null,
          error: errData?.error || 'Gemini AI Voice Engine sedang sibuk. Silakan coba lagi.',
        });
        return false;
      }
    } catch (err: any) {
      console.warn('TTS request error:', err);
      this.setState({
        isSpeaking: false,
        isLoading: false,
        activeMessageId: null,
        currentEngine: null,
        activeModel: null,
        error: 'Koneksi ke Gemini AI Voice Engine terganggu.',
      });
      return false;
    }

    this.setState({
      isSpeaking: false,
      isLoading: false,
      activeMessageId: null,
      currentEngine: null,
      activeModel: null,
      error: null,
    });
    return false;
  }

  /**
   * Helper to convert base64 data URI or raw base64 to ArrayBuffer
   */
  private base64ToArrayBuffer(base64Data: string): ArrayBuffer {
    const clean = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
    const binary = window.atob(clean);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Play audio with Web Audio API as primary (zero autoplay blocks, instant decode)
   * with seamless fallback to HTMLAudioElement
   */
  private async playAudioUrl(
    audioUrl: string,
    speed: number,
    messageId: string | null,
    _personaId?: string,
    modelName?: string
  ): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    // Ensure audio context is running
    this.unlockAudio();

    // 1. PRIMARY: Web Audio API (Guaranteed playback even after long async network delays)
    if (this.audioCtx && audioUrl.startsWith('data:audio/')) {
      try {
        if (this.audioCtx.state === 'suspended') {
          await this.audioCtx.resume();
        }

        const arrayBuffer = this.base64ToArrayBuffer(audioUrl);
        // decodeAudioData creates PCM AudioBuffer
        const audioBuffer = await this.audioCtx.decodeAudioData(arrayBuffer);

        const sourceNode = this.audioCtx.createBufferSource();
        sourceNode.buffer = audioBuffer;
        sourceNode.playbackRate.value = Math.min(2.0, Math.max(0.5, speed));

        this.currentSourceNode = sourceNode;

        sourceNode.onended = () => {
          if (this.currentSourceNode === sourceNode) {
            this.currentSourceNode = null;
            this.setState({
              isSpeaking: false,
              isLoading: false,
              activeMessageId: null,
              currentEngine: null,
              activeModel: null,
            });
          }
        };

        sourceNode.connect(this.audioCtx.destination);
        sourceNode.start(0);

        this.setState({
          isLoading: false,
          isSpeaking: true,
          activeMessageId: messageId,
          currentEngine: 'gemini',
          activeModel: modelName || 'gemini-3.8-flash-lite-tts',
          error: null,
        });

        return true;
      } catch (decodeErr) {
        console.warn('Web Audio API playback failed, falling back to HTMLAudioElement:', decodeErr);
      }
    }

    // 2. FALLBACK: Reusable HTML5 Audio Element
    return new Promise((resolve) => {
      try {
        const audio = this.reusableAudio || new Audio();
        this.reusableAudio = audio;
        audio.src = audioUrl;
        audio.playbackRate = Math.min(2.0, Math.max(0.5, speed));

        audio.onplay = () => {
          this.setState({
            isLoading: false,
            isSpeaking: true,
            activeMessageId: messageId,
            currentEngine: 'gemini',
            activeModel: modelName || 'gemini-3.8-flash-lite-tts',
            error: null,
          });
        };

        audio.onended = () => {
          this.setState({
            isSpeaking: false,
            isLoading: false,
            activeMessageId: null,
            currentEngine: null,
            activeModel: null,
          });
          resolve(true);
        };

        audio.onerror = (e) => {
          console.warn('HTMLAudioElement playback error:', e);
          this.setState({
            isSpeaking: false,
            isLoading: false,
            activeMessageId: null,
            currentEngine: null,
            activeModel: null,
            error: 'Gagal memutar audio.',
          });
          resolve(false);
        };

        audio.play().then(() => {
          resolve(true);
        }).catch((err) => {
          console.warn('HTMLAudioElement play() catch:', err);
          this.setState({
            isSpeaking: false,
            isLoading: false,
            activeMessageId: null,
            currentEngine: null,
            activeModel: null,
            error: 'Pemutaran audio ditahan oleh peramban.',
          });
          resolve(false);
        });
      } catch {
        resolve(false);
      }
    });
  }

  private parseSpeed(speedStr?: string): number {
    switch (speedStr) {
      case '0.75x':
        return 0.75;
      case '1.25x':
        return 1.25;
      case '1.5x':
        return 1.5;
      default:
        return 1.0;
    }
  }
}

export const speechService = new MariaSpeechService();
