// Maria AI Unified Speech & TTS Service
// Exclusively powered by Gemini AI Voice Engine (Aoede, Kore, Puck, Fenrir, Zephyr, Charon) & Neural AI Voices

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
  private currentAudio: HTMLAudioElement | null = null;
  private listeners: Set<SpeechListener> = new Set();
  private ttsCache: Map<string, string> = new Map();
  private state: SpeechState = {
    isSpeaking: false,
    isLoading: false,
    activeMessageId: null,
    currentEngine: null,
    activeModel: null,
    error: null,
  };

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

  // Cleans markdown formatting, links, and code blocks for fluid speech, without any emojis
  public cleanTextForSpeech(text: string): string {
    if (!text) return '';
    return text
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
  }

  // Pre-unlocks audio context and HTML5 Audio permissions during a user interaction gesture
  public unlockAudio() {
    try {
      if (typeof window !== 'undefined') {
        const silentAudio = new Audio(
          'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA=='
        );
        silentAudio.volume = 0.01;
        silentAudio.play().then(() => {
          silentAudio.pause();
        }).catch(() => {});

        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          if (ctx.state === 'suspended') {
            ctx.resume().catch(() => {});
          }
        }
      }
    } catch {
      // Ignore background unlock issues
    }
  }

  public stopSpeaking() {
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch {}
      this.currentAudio = null;
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
      const timeoutId = setTimeout(() => controller.abort(), 45000);

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
    } catch {
      this.setState({
        isSpeaking: false,
        isLoading: false,
        activeMessageId: null,
        currentEngine: null,
        activeModel: null,
        error: 'Koneksi ke Gemini AI Voice Engine sedang sibuk.',
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

  private playAudioUrl(
    audioUrl: string,
    speed: number,
    messageId: string | null,
    _personaId?: string,
    modelName?: string
  ): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const audio = new Audio();
        this.currentAudio = audio;
        audio.src = audioUrl;

        // Apply clean playback rate chosen by user (0.75x, 1x, 1.25x, 1.5x)
        audio.playbackRate = Math.min(2.0, Math.max(0.5, speed));
        try {
          (audio as any).preservesPitch = true;
          (audio as any).webkitPreservesPitch = true;
          (audio as any).mozPreservesPitch = true;
        } catch {}

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
          console.warn('Audio playback error on AI model audio element:', e);
          this.currentAudio = null;
          this.setState({
            isSpeaking: false,
            isLoading: false,
            activeMessageId: null,
            currentEngine: null,
            activeModel: null,
            error: 'Gagal memutar audio model Gemini AI.',
          });
          resolve(false);
        };

        audio.play().catch((err) => {
          console.warn('Autoplay prevented on AI model audio:', err);
          this.currentAudio = null;
          this.setState({
            isSpeaking: false,
            isLoading: false,
            activeMessageId: null,
            currentEngine: null,
            activeModel: null,
            error: 'Pemutaran audio otomatis ditahan oleh peramban.',
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
