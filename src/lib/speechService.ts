// Maria AI Unified Speech & TTS Service
// Powers high-fidelity AI Neural Voice (Gemini AI Voice Engine) as primary voice model

export interface SpeechState {
  isSpeaking: boolean;
  isLoading: boolean;
  activeMessageId: string | null;
  currentEngine: 'gemini' | 'browser' | null;
  error: string | null;
}

type SpeechListener = (state: SpeechState) => void;

class MariaSpeechService {
  private currentAudio: HTMLAudioElement | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private listeners: Set<SpeechListener> = new Set();
  private ttsCache: Map<string, string> = new Map();
  private state: SpeechState = {
    isSpeaking: false,
    isLoading: false,
    activeMessageId: null,
    currentEngine: null,
    error: null,
  };

  constructor() {
    if (typeof window !== 'undefined') {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = () => {
          // Preload voices
        };
      }
    }
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

  // Cleans markdown formatting, links, and code blocks for fluid speech
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
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Pre-unlocks audio context and HTML5 Audio permissions during a user interaction gesture
  public unlockAudio() {
    try {
      if (typeof window !== 'undefined') {
        // Unlock HTML5 Audio playback in browser
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
        if ('speechSynthesis' in window) {
          window.speechSynthesis.resume();
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

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
      this.currentUtterance = null;
    }

    this.setState({
      isSpeaking: false,
      isLoading: false,
      activeMessageId: null,
      currentEngine: null,
      error: null,
    });
  }

  public async playAudioDirectly(
    audioUrl: string,
    options?: {
      messageId?: string;
      speed?: string;
      personaId?: string;
    }
  ): Promise<boolean> {
    this.stopSpeaking();
    const speedMultiplier = this.parseSpeed(options?.speed);
    const messageId = options?.messageId || null;
    return this.playAudioUrl(audioUrl, speedMultiplier, messageId, options?.personaId);
  }

  public async speak(
    rawText: string,
    options?: {
      messageId?: string;
      speed?: string;
      voiceName?: string;
      personaId?: string;
      preferEngine?: 'gemini' | 'browser';
      preloadedAudioUrl?: string;
    }
  ): Promise<boolean> {
    this.stopSpeaking();

    const messageId = options?.messageId || null;
    const speedMultiplier = this.parseSpeed(options?.speed);
    const personaId = options?.personaId || 'wanita';
    const voiceName = options?.voiceName || 'Aoede';
    const preferEngine = options?.preferEngine || 'gemini';

    // If preloaded audio already exists, play immediately without network latency!
    if (options?.preloadedAudioUrl) {
      return this.playAudioUrl(options.preloadedAudioUrl, speedMultiplier, messageId, personaId);
    }

    const cleanText = this.cleanTextForSpeech(rawText);
    if (!cleanText) return false;

    this.setState({
      isLoading: true,
      activeMessageId: messageId,
      currentEngine: preferEngine === 'browser' ? 'browser' : 'gemini',
      error: null,
    });

    // If browser speech is explicitly requested by user
    if (preferEngine === 'browser') {
      return this.speakWithWebSpeech(cleanText, speedMultiplier, messageId);
    }

    // Default & Primary: Gemini AI Neural Voice Engine
    try {
      const cacheKey = `${voiceName}:${personaId}:${cleanText.slice(0, 300)}`;
      if (this.ttsCache.has(cacheKey)) {
        const cachedUrl = this.ttsCache.get(cacheKey)!;
        const played = await this.playAudioUrl(cachedUrl, speedMultiplier, messageId, personaId);
        if (played) return true;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: cleanText.slice(0, 2500),
          voiceName,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data?.audioUrl) {
          this.ttsCache.set(cacheKey, data.audioUrl);
          const played = await this.playAudioUrl(data.audioUrl, speedMultiplier, messageId, personaId);
          if (played) return true;
        }
      } else {
        const errJson = await res.json().catch(() => ({}));
        console.warn('AI Voice Engine response error:', errJson?.error);
      }
    } catch (err: any) {
      console.warn('AI Voice Engine request error:', err?.message);
    }

    // Do NOT silently revert to robotic Google browser voice when AI Voice Engine is selected
    this.setState({
      isSpeaking: false,
      isLoading: false,
      activeMessageId: null,
      currentEngine: null,
      error: 'Audio model AI sedang diproses. Silakan coba lagi.',
    });
    return false;
  }

  private playAudioUrl(
    audioUrl: string,
    speed: number,
    messageId: string | null,
    personaId?: string
  ): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const audio = new Audio();
        this.currentAudio = audio;
        audio.src = audioUrl;

        // Modulate pitch and speed for persona (e.g. anak perempuan/laki-laki, pria, remaja)
        let pitchMultiplier = 1.0;
        let speedBoost = 1.0;

        if (personaId === 'anak-perempuan') {
          pitchMultiplier = 1.25;
          speedBoost = 1.08;
        } else if (personaId === 'anak-laki') {
          pitchMultiplier = 1.22;
          speedBoost = 1.08;
        } else if (personaId === 'remaja-perempuan') {
          pitchMultiplier = 1.06;
          speedBoost = 1.03;
        } else if (personaId === 'remaja-laki') {
          pitchMultiplier = 1.03;
          speedBoost = 1.03;
        } else if (personaId === 'pria') {
          pitchMultiplier = 0.95;
          speedBoost = 0.98;
        }

        audio.playbackRate = Math.min(2.0, Math.max(0.5, speed * speedBoost * (pitchMultiplier !== 1.0 ? pitchMultiplier : 1.0)));

        if (pitchMultiplier !== 1.0) {
          try {
            (audio as any).preservesPitch = false;
            (audio as any).webkitPreservesPitch = false;
            (audio as any).mozPreservesPitch = false;
          } catch {}
        }

        audio.onplay = () => {
          this.setState({
            isLoading: false,
            isSpeaking: true,
            activeMessageId: messageId,
            currentEngine: 'gemini',
            error: null,
          });
        };

        audio.onended = () => {
          this.setState({
            isSpeaking: false,
            isLoading: false,
            activeMessageId: null,
            currentEngine: null,
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
            error: 'Gagal memutar audio model AI.',
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
            error: 'Pemutaran audio otomatis ditahan oleh peramban.',
          });
          resolve(false);
        });
      } catch (err: any) {
        resolve(false);
      }
    });
  }

  private speakWithWebSpeech(text: string, speed: number, messageId: string | null): boolean {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      this.setState({
        isLoading: false,
        isSpeaking: false,
        error: 'Sintesis suara tidak didukung di peramban ini.',
      });
      return false;
    }

    try {
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      this.currentUtterance = utterance;
      utterance.rate = speed;
      utterance.pitch = 1.05;

      const voices = window.speechSynthesis.getVoices();
      const idVoice = voices.find(
        (v) =>
          v.lang.toLowerCase().startsWith('id') ||
          v.name.toLowerCase().includes('indonesia') ||
          v.name.toLowerCase().includes('maria') ||
          v.name.toLowerCase().includes('gadis')
      );

      if (idVoice) {
        utterance.voice = idVoice;
      }

      utterance.onstart = () => {
        this.setState({
          isLoading: false,
          isSpeaking: true,
          activeMessageId: messageId,
          currentEngine: 'browser',
        });
      };

      utterance.onend = () => {
        this.setState({
          isSpeaking: false,
          isLoading: false,
          activeMessageId: null,
          currentEngine: null,
        });
      };

      utterance.onerror = (e) => {
        console.warn('Speech synthesis utterance error:', e);
        this.setState({
          isSpeaking: false,
          isLoading: false,
          activeMessageId: null,
          currentEngine: null,
        });
      };

      window.speechSynthesis.speak(utterance);
      return true;
    } catch (err: any) {
      console.warn('Failed to speak with Web Speech API:', err);
      this.setState({
        isLoading: false,
        isSpeaking: false,
        error: err.message,
      });
      return false;
    }
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
