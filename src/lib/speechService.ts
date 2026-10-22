// Maria AI Unified Real-Time Streaming Speech & TTS Service
// Supports instant zero-delay sentence streaming (Web Speech API) & full-length reading aloud

export interface SpeechState {
  isSpeaking: boolean;
  isLoading: boolean;
  activeMessageId: string | null;
  currentEngine: 'gemini' | 'browser' | null;
  activeModel?: string | null;
  error: string | null;
}

type SpeechListener = (state: SpeechState) => void;

interface StreamingSpeechSession {
  messageId: string;
  speed: string;
  personaId: string;
  processedChars: number;
  sentenceQueue: string[];
  isPlaying: boolean;
  isStreamFinished: boolean;
}

class MariaSpeechService {
  private currentAudio: HTMLAudioElement | null = null;
  private listeners: Set<SpeechListener> = new Set();
  private streamingSession: StreamingSpeechSession | null = null;
  private state: SpeechState = {
    isSpeaking: false,
    isLoading: false,
    activeMessageId: null,
    currentEngine: null,
    activeModel: null,
    error: null,
  };

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
      // Warm up voice cache
      window.speechSynthesis.getVoices();
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
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }

    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch {}
      this.currentAudio = null;
    }

    this.streamingSession = null;

    this.setState({
      isSpeaking: false,
      isLoading: false,
      activeMessageId: null,
      currentEngine: null,
      activeModel: null,
      error: null,
    });
  }

  private getIndonesianVoice(): SpeechSynthesisVoice | null {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    // 1. Google Bahasa Indonesia / id-ID voice
    const googleId = voices.find(
      (v) =>
        (v.lang === 'id-ID' || v.lang.startsWith('id')) &&
        v.name.toLowerCase().includes('google')
    );
    if (googleId) return googleId;

    // 2. Any id-ID voice
    const anyId = voices.find(
      (v) => v.lang === 'id-ID' || v.lang.startsWith('id') || v.name.toLowerCase().includes('indonesia')
    );
    if (anyId) return anyId;

    // 3. Fallback to default
    return voices.find((v) => v.default) || voices[0] || null;
  }

  // ----------------------------------------------------
  // REAL-TIME ZERO-DELAY STREAMING SPEECH ENGINE
  // Begins speaking as soon as sentence 1 arrives while tokens stream
  // ----------------------------------------------------

  public startStreaming(
    messageId: string,
    options?: {
      speed?: string;
      personaId?: string;
    }
  ): void {
    this.stopSpeaking();
    this.unlockAudio();

    this.streamingSession = {
      messageId,
      speed: options?.speed || '1x',
      personaId: options?.personaId || 'wanita',
      processedChars: 0,
      sentenceQueue: [],
      isPlaying: false,
      isStreamFinished: false,
    };
  }

  public feedStreamChunk(currentFullText: string): void {
    if (!this.streamingSession) return;

    const unprocessed = currentFullText.slice(this.streamingSession.processedChars);
    // Find completed sentences ending with ., !, ?, :, or newline followed by space or newline
    const sentenceRegex = /([^\n.!?:]+[\n.!?:]+)(?:\s+|$)/g;
    let match;
    let lastIndex = 0;

    while ((match = sentenceRegex.exec(unprocessed)) !== null) {
      const sentence = match[1].trim();
      if (sentence) {
        this.enqueueStreamingSentence(sentence);
      }
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex > 0) {
      this.streamingSession.processedChars += lastIndex;
    }
  }

  public endStream(finalFullText?: string): void {
    if (!this.streamingSession) return;

    const textToExamine = finalFullText || '';
    const remaining = textToExamine.slice(this.streamingSession.processedChars).trim();
    if (remaining) {
      this.enqueueStreamingSentence(remaining);
      this.streamingSession.processedChars = textToExamine.length;
    }

    this.streamingSession.isStreamFinished = true;

    if (!this.streamingSession.isPlaying && this.streamingSession.sentenceQueue.length > 0) {
      this.playNextStreamingSentence();
    }
  }

  private enqueueStreamingSentence(rawSentence: string): void {
    if (!this.streamingSession) return;
    const clean = this.cleanTextForSpeech(rawSentence);
    if (clean.length > 0) {
      this.streamingSession.sentenceQueue.push(clean);
      if (!this.streamingSession.isPlaying) {
        this.playNextStreamingSentence();
      }
    }
  }

  private playNextStreamingSentence(): void {
    if (!this.streamingSession) return;

    if (this.streamingSession.sentenceQueue.length === 0) {
      if (this.streamingSession.isStreamFinished) {
        this.setState({
          isSpeaking: false,
          isLoading: false,
          activeMessageId: null,
          currentEngine: null,
          activeModel: null,
          error: null,
        });
        this.streamingSession = null;
      } else {
        this.streamingSession.isPlaying = false;
      }
      return;
    }

    this.streamingSession.isPlaying = true;
    const sentence = this.streamingSession.sentenceQueue.shift()!;
    const speedMultiplier = this.parseSpeed(this.streamingSession.speed);
    const messageId = this.streamingSession.messageId;

    this.setState({
      isSpeaking: true,
      isLoading: false,
      activeMessageId: messageId,
      currentEngine: 'browser',
      activeModel: 'Google Bahasa Indonesia',
      error: null,
    });

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(sentence);
        utterance.lang = 'id-ID';
        utterance.rate = speedMultiplier;

        const voice = this.getIndonesianVoice();
        if (voice) utterance.voice = voice;

        utterance.onend = () => {
          if (this.streamingSession) {
            this.streamingSession.isPlaying = false;
            this.playNextStreamingSentence();
          }
        };

        utterance.onerror = (e) => {
          console.warn('SpeechSynthesis utterance error:', e);
          if (this.streamingSession) {
            this.streamingSession.isPlaying = false;
            this.playNextStreamingSentence();
          }
        };

        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn('SpeechSynthesis failed:', err);
        if (this.streamingSession) {
          this.streamingSession.isPlaying = false;
          this.playNextStreamingSentence();
        }
      }
    } else {
      if (this.streamingSession) {
        this.streamingSession.isPlaying = false;
        this.playNextStreamingSentence();
      }
    }
  }

  // ----------------------------------------------------
  // FULL-LENGTH CONTINUOUS SPEAK (reads entire text to the very end)
  // ----------------------------------------------------

  public async speak(
    rawText: string,
    options?: {
      messageId?: string;
      speed?: string;
      voiceName?: string;
      personaId?: string;
      ttsModel?: 'gemini-3.8-flash-lite-tts' | 'gemini-3.8-flash-tts';
      preferEngine?: 'gemini' | 'browser';
      preloadedAudioUrl?: string;
    }
  ): Promise<boolean> {
    this.stopSpeaking();

    const messageId = options?.messageId || `msg_${Date.now()}`;
    const speed = options?.speed || '1x';
    const personaId = options?.personaId || 'wanita';

    if (options?.preloadedAudioUrl) {
      return this.playAudioDirectly(options.preloadedAudioUrl, {
        messageId,
        speed,
        personaId,
        model: options.ttsModel,
      });
    }

    const clean = this.cleanTextForSpeech(rawText);
    if (!clean) return false;

    // Use streaming sentence engine for full-length, non-cutting reading
    this.startStreaming(messageId, { speed, personaId });
    this.feedStreamChunk(rawText);
    this.endStream(rawText);
    return true;
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

    return new Promise((resolve) => {
      try {
        const audio = new Audio();
        this.currentAudio = audio;
        audio.src = audioUrl;
        audio.playbackRate = Math.min(2.0, Math.max(0.5, speedMultiplier));

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
            activeModel: options?.model || 'gemini-3.8-flash-lite-tts',
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

        audio.onerror = () => {
          this.currentAudio = null;
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

        audio.play().catch(() => {
          this.currentAudio = null;
          this.setState({
            isSpeaking: false,
            isLoading: false,
            activeMessageId: null,
            currentEngine: null,
            activeModel: null,
            error: 'Pemutaran audio otomatis ditahan peramban.',
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
