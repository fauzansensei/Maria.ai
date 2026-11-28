import type { Server } from 'http';
import { LiveServerMessage, Modality, type Session } from '@google/genai';
import { WebSocket, WebSocketServer } from 'ws';
import {
  buildSystemInstruction,
  getGeminiLiveClient,
  type DeviceTimeInfo,
} from './gemini.ts';

interface LiveSetupPayload {
  type: 'setup';
  voiceName?: string;
  customInstruction?: string;
  userMemories?: string;
  userName?: string;
  deviceTime?: DeviceTimeInfo;
  allowEmojis?: boolean;
  voiceLanguage?: 'auto' | 'id-ID' | 'en-US';
  appLanguage?: 'Indonesia' | 'English';
  recentContext?: string;
  liveTranslation?: boolean;
}

const ALLOWED_LIVE_VOICES = new Set([
  'Aoede',
  'Kore',
  'Puck',
  'Fenrir',
  'Zephyr',
  'Charon',
]);

function sendJson(ws: WebSocket, payload: Record<string, unknown>) {
  if (ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(JSON.stringify(payload));
    } catch {
      // Ignore send errors on closing socket
    }
  }
}

export function attachLiveWebSocketServer(httpServer: Server) {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (request, socket, head) => {
    try {
      const reqUrl = new URL(request.url || '/', 'http://localhost');
      if (reqUrl.pathname === '/api/live') {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit('connection', ws, request);
        });
      }
    } catch {
      // Ignore malformed upgrade URLs not targeting /api/live
    }
  });

  wss.on('connection', (clientWs: WebSocket) => {
    let sessionPromise: Promise<Session> | null = null;
    let activeSession: Session | null = null;
    let isClosing = false;
    let setupTimer: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      if (isClosing) return;
      isClosing = true;
      if (setupTimer) {
        clearTimeout(setupTimer);
        setupTimer = null;
      }
      if (activeSession) {
        try {
          activeSession.close();
        } catch {
          // Ignore already closed session
        }
        activeSession = null;
      } else if (sessionPromise) {
        sessionPromise
          .then((sess) => {
            try {
              sess.close();
            } catch {
              // Ignore
            }
          })
          .catch(() => {});
      }
    };

    const initializeLiveSession = (setup?: LiveSetupPayload) => {
      if (sessionPromise || isClosing) return;
      if (setupTimer) {
        clearTimeout(setupTimer);
        setupTimer = null;
      }

      let ai;
      try {
        ai = getGeminiLiveClient('v1beta');
      } catch (err: any) {
        sendJson(clientWs, {
          type: 'error',
          error:
            err?.message ||
            'Konfigurasi GEMINI_API_KEY server belum tersedia untuk Maria Live.',
        });
        cleanup();
        try {
          clientWs.close();
        } catch {}
        return;
      }

      const requestedVoice = setup?.voiceName || 'Aoede';
      const voiceName = ALLOWED_LIVE_VOICES.has(requestedVoice)
        ? requestedVoice
        : 'Aoede';

      const baseInstruction = buildSystemInstruction(
        setup?.deviceTime,
        setup?.customInstruction,
        setup?.userMemories,
        setup?.userName,
        Boolean(setup?.allowEmojis)
      );

      const preferEnglish =
        setup?.voiceLanguage === 'en-US' ||
        (setup?.voiceLanguage !== 'id-ID' && setup?.appLanguage === 'English');

      const languageHint = preferEnglish
        ? 'Gunakan Bahasa Inggris sebagai bahasa utama percakapan suara kecuali pengguna berbicara Bahasa Indonesia.'
        : 'BAHASA WAJIB: Anda WAJIB berbicara, menyapa, dan menjawab dalam Bahasa Indonesia yang natural dan fasih. Jangan kembali ke bahasa Inggris/default Google kecuali pengguna secara eksplisit berbicara dalam Bahasa Inggris atau meminta terjemahan.';

      const contextBlock = setup?.recentContext?.trim()
        ? `\n\nKONTEKS PERCAKAPAN SEBELUMNYA DI ROOM CHAT INI:\n${setup.recentContext.trim()}`
        : '';

      const translationHint = setup?.liveTranslation
        ? '\n- MODE TERJEMAHAN LANGSUNG AKTIF: Bertindaklah sebagai penerjemah simultan dwibahasa (Indonesia <-> Inggris atau bahasa yang terdengar). Jika pengguna berbicara bahasa asing, terjemahkan ke Bahasa Indonesia secara ringkas dan natural; jika berbicara Bahasa Indonesia, sediakan terjemahan Bahasa Inggrisnya secara langsung.'
        : '';

      const liveSystemInstruction = `${baseInstruction}\n\nMODE PERCAKAPAN SUARA & VISUAL LANGSUNG (MARIA LIVE):
- Anda sedang terhubung dalam panggilan suara langsung real-time bersama pengguna.
- ${languageHint}
- Berikan jawaban lisan yang natural, jelas, ekspresif, hangat, dan ringkas agar nyaman didengar secara langsung (jangan membacakan simbol markdown seperti bintang/pagar/backtick).
- Apabila pengguna mengaktifkan kamera, membagikan layar, atau mengirim gambar/berkas, analisis visual yang masuk secara akurat dan responsif seperti rekan diskusi langsung.${translationHint}${contextBlock}`;

      let errorSent = false;
      const emitErrorOnce = (msg: string) => {
        if (errorSent || isClosing) return;
        errorSent = true;
        sendJson(clientWs, { type: 'error', error: msg });
      };

      sessionPromise = ai.live
        .connect({
          model: 'gemini-3.8-live',
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName,
                },
              },
            },
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            systemInstruction: liveSystemInstruction,
          },
          callbacks: {
            onopen: () => {
              // Wait for connect() promise resolution (setupComplete) before emitting 'ready'
            },
            onmessage: (message: LiveServerMessage) => {
              const content = message.serverContent;
              if (!content) return;

              if (content.inputTranscription?.text) {
                sendJson(clientWs, {
                  type: 'inputTranscript',
                  text: content.inputTranscription.text,
                });
              }

              if (content.outputTranscription?.text) {
                sendJson(clientWs, {
                  type: 'outputTranscript',
                  text: content.outputTranscription.text,
                });
              }

              for (const part of content.modelTurn?.parts ?? []) {
                if (part.inlineData?.data) {
                  sendJson(clientWs, {
                    type: 'audio',
                    data: part.inlineData.data,
                    mimeType: part.inlineData.mimeType || 'audio/pcm;rate=24000',
                  });
                }
              }

              if (content.interrupted) {
                sendJson(clientWs, { type: 'interrupted', interrupted: true });
              }

              if (content.turnComplete) {
                sendJson(clientWs, { type: 'turnComplete' });
              }
            },
            onerror: (err: any) => {
              const msg =
                err?.message ||
                'Koneksi sesi Gemini Live terputus atau mengalami kendala.';
              console.error('Gemini Live session error:', msg);
              emitErrorOnce(msg);
            },
            onclose: (event: any) => {
              if (!isClosing && !errorSent) {
                sendJson(clientWs, {
                  type: 'closed',
                  reason: event?.reason || undefined,
                });
              }
              cleanup();
            },
          },
        })
        .then((session) => {
          if (isClosing) {
            try {
              session.close();
            } catch {}
            return session;
          }
          activeSession = session;
          sendJson(clientWs, { type: 'ready', voiceName });
          return session;
        })
        .catch((err: any) => {
          const msg =
            err?.message ||
            'Gagal terhubung ke layanan suara Maria Live (gemini-3.8-live).';
          console.error('Failed to connect Gemini Live:', msg);
          emitErrorOnce(msg);
          cleanup();
          return null as unknown as Session;
        });
    };

    // Safety fallback if client connects without sending setup within 1.5s
    setupTimer = setTimeout(() => {
      if (!sessionPromise && !isClosing) {
        initializeLiveSession();
      }
    }, 1500);

    clientWs.on('message', (raw) => {
      if (isClosing) return;

      let parsed: any;
      try {
        parsed = JSON.parse(raw.toString());
      } catch {
        return;
      }

      if (parsed?.type === 'setup') {
        initializeLiveSession(parsed as LiveSetupPayload);
        return;
      }

      if (parsed?.type === 'end') {
        cleanup();
        try {
          clientWs.close();
        } catch {}
        return;
      }

      if (!sessionPromise) {
        initializeLiveSession();
      }

      if (!sessionPromise) return;

      sessionPromise
        .then((session) => {
          if (isClosing) return;
          if (parsed?.type === 'audio' && parsed.data) {
            session.sendRealtimeInput({
              audio: {
                data: parsed.data,
                mimeType: parsed.mimeType || 'audio/pcm;rate=16000',
              },
            });
          } else if (parsed?.type === 'video' && parsed.data) {
            session.sendRealtimeInput({
              video: {
                data: parsed.data,
                mimeType: parsed.mimeType || 'image/jpeg',
              },
            });
          } else if (parsed?.type === 'text' && typeof parsed.text === 'string' && parsed.text.trim()) {
            session.sendRealtimeInput({
              text: parsed.text.trim(),
            });
          }
        })
        .catch(() => {
          // Connection already handled in initializeLiveSession catch
        });
    });

    clientWs.on('close', () => {
      cleanup();
    });

    clientWs.on('error', () => {
      cleanup();
    });
  });
}
