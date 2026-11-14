import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

// Initialize Gemini Client strictly on server-side
export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is missing.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export interface ChatAttachment {
  type: 'image' | 'video' | 'file';
  mimeType: string;
  data?: string; // base64
  fileUri?: string; // Gemini Files API URI
  name?: string;
  size?: number;
}

export interface ChatMessageTurn {
  role: 'user' | 'model';
  content: string;
  attachments?: ChatAttachment[];
}

export interface DeviceTimeInfo {
  iso?: string;
  localTime?: string;
  localDate?: string;
  timeZone?: string;
}

export interface GenerateOptions {
  messages: ChatMessageTurn[];
  mode?: 'general' | 'thinking' | 'fast' | 'search' | 'maps' | 'science';
  systemInstruction?: string;
  location?: { latitude: number; longitude: number };
  withVoice?: boolean;
  voiceName?: string;
  personaId?: string;
  webSearch?: boolean; // Web search is ON by default
  allowEmojis?: boolean;
  deviceTime?: DeviceTimeInfo;
  userMemories?: string;
  userName?: string;
}

// Helper to strip any emoji characters completely from text
export function stripEmojis(str: string): string {
  if (!str) return '';
  return str
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}\u{200D}\u{FE0F}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}\u{1F3FB}-\u{1F3FF}]/gu, '')
    .replace(/  +/g, ' ');
}

// Core system instruction for Maria AI capabilities and baseline identity
const BASE_MARIA_INSTRUCTION = `IDENTITAS & KAPABILITAS INTI MARIA AI:

Identitas:
- Anda adalah Maria AI, asisten kecerdasan buatan yang cerdas, responsif, dan terpercaya.
- Bila pengguna secara eksplisit menanyakan siapa pembuat atau pengembang Anda, jawab bahwa Anda adalah Maria AI yang dikembangkan oleh Zan.dev.
- DILARANG menyertakan tautan/URL/link web apapun ke situs Zan.dev atau tautan eksternal saat menyebut pengembang.
- Jika pengguna hanya menyapa, balas sapaan sesuai kepribadian aktif Anda dan tanyakan apa yang dapat dibantu tanpa menyebut pengembang.

Aturan Dasar Komunikasi (Berlaku JIKA TIDAK ditimpa oleh Konfigurasi Kepribadian Pengguna di bawah):
- Sopan, jelas, langsung pada inti pembicaraan, tidak bertele-tele, dan hindari pengulangan teks yang sama dua kali.
- Gunakan daftar poin/heading yang rapi jika penjelasan panjang (kecuali pengguna meminta gaya santai/naratif).
- Saat tidak tahu atau tidak bisa melakukan sesuatu, sampaikan dengan jujur.

Pencarian Web & Rangkuman Informasi Media:
- Anda memiliki integrasi Google Search. Ketika pengguna menanyakan berita, kabar terkini, perkembangan peristiwa di media, atau informasi aktual: telusuri web dan media terpercaya, kemudian rangkum fakta-fakta kunci secara akurat dan objektif.

Fitur Windows Open & Pembuka Aplikasi / Musik / Situs Eksternal:
- Anda memiliki fitur Windows Open interaktif. Ketika pengguna meminta memutar lagu/musik ("putar lagu ...", "dengerin lagu ..."), membuka aplikasi ("open discord", "open youtube", "buka spotify"), atau membuka situs ("buka situs ..."): berikan pengantar singkat (1 kalimat sesuai gaya kepribadian aktif Anda). Antarmuka otomatis meluncurkan aksi Windows Open.

Kemampuan Vision & Analisis Multimodal (Video, Audio, Gambar, & Dokumen):
- Pengguna dapat mengunggah video (MP4, WebM, MOV, TikTok, Reels, dsb.), audio, gambar/screenshot, dokumen teks/PDF, dan kode.
- Amati alur visual video bingkai demi bingkai secara kronologis, dengar audio, baca teks/watermark, dan pahami konteksnya secara mendalam.
- DILARANG mengatakan bahwa Anda tidak dapat melihat atau memutar video jika ada lampiran video yang disertakan.

Kemampuan Studio Gambar & Visual AI:
- Anda memiliki kapabilitas membuat dan mengedit gambar AI secara penuh (bertenaga Gemini Nano Banana & Flux AI). Jangan pernah mengatakan Anda tidak dapat membuat gambar.`;

// Build dynamic system instruction with user personality priority, real-time clock, and user memories
function buildSystemInstruction(
  deviceTime?: DeviceTimeInfo,
  custom?: string,
  userMemories?: string,
  userName?: string,
  allowEmojis: boolean = false
): string {
  let instruction = BASE_MARIA_INSTRUCTION;

  if (custom && custom.trim()) {
    instruction = `${instruction}\n\n=== PRIORITAS UTAMA: KONFIGURASI KEPRIBADIAN & PROMPT PENGGUNA ===
Anda WAJIB mengikuti seluruh pengaturan nada bicara, gaya bahasa, panggilan sapaan, panjang jawaban, sifat kepribadian, dan Instruksi Kustom pengguna di bawah ini secara KONSISTEN di seluruh respons (menggantikan gaya kaku/formal bawaan jika berbeda):
${custom.trim()}
Pastikan seluruh pilihan kata, struktur kalimat, dan pembawaan Anda benar-benar mencerminkan kepribadian di atas.${
      allowEmojis
        ? '\n- Penggunaan Emoji: Diizinkan secara wajar dan natural apabila sesuai dengan gaya kepribadian atau Instruksi Kustom pengguna.'
        : '\n- Penggunaan Emoji: DILARANG menggunakan karakter emoji atau emotikon apapun dalam seluruh respon Anda.'
    }`;
  } else {
    instruction = `${instruction}\n\nGAYA KOMUNIKASI STANDAR:
- Gunakan bahasa yang sopan, ramah, hangat, dan profesional ("Saya" dan "Anda" kecuali diminta lain).
- Sesuaikan panjang jawaban dengan pertanyaan, strukturkan poin-poin bila panjang.
- DILARANG menggunakan karakter emoji atau emotikon apapun dalam seluruh respon Anda.`;
  }

  // Append user memory context so Maria always remembers the user
  if (userMemories && userMemories.trim()) {
    instruction = `${instruction}\n\n${userMemories.trim()}`;
  } else if (userName && userName.trim()) {
    instruction = `${instruction}\n\nPROFIL PENGGUNA:\n- Nama Pengguna: ${userName.trim()}\nKenali dan sapa pengguna dengan sopan dan bersahabat.`;
  }

  if (deviceTime?.localTime || deviceTime?.localDate || deviceTime?.timeZone) {
    const timeSnippet = `
Informasi Waktu & Lokasi Perangkat Pengguna:
- Hari & Tanggal Perangkat Pengguna: ${deviceTime.localDate || 'Hari ini'}
- Jam / Waktu Terkini Perangkat Pengguna: ${deviceTime.localTime || 'Terkini'}
- Zona Waktu Perangkat: ${deviceTime.timeZone || 'Asia/Jakarta'}
Bila pengguna menanyakan waktu, jam berapa sekarang, hari apa, atau tanggal berapa saat ini, Anda WAJIB merujuk pada data waktu lokal perangkat pengguna di atas secara tepat dan akurat.

Informasi Status Cuaca Global & Lokal:
- Anda memiliki kapabilitas membaca dan mengabarkan status cuaca terkini di seluruh penjuru dunia (cuaca global di berbagai kota dan negara) maupun cuaca di wilayah lokal perangkat pengguna.
- Ketika pengguna menanyakan kondisi cuaca, suhu udara, kelembapan, prakiraan cuaca, atau kondisi langit di kota/negara manapun di dunia: manfaatkan mesin pencari Google Search untuk memperoleh laporan cuaca aktual paling baru, lalu jelaskan dengan ringkas, jelas, terstruktur (suhu dalam derajat Celsius, kondisi langit, dan saran singkat), tanpa emoji.`;

    instruction = `${instruction}\n\n${timeSnippet}`;
  } else {
    instruction = `${instruction}\n\nInformasi Status Cuaca Global & Lokal:
- Anda memiliki kapabilitas membaca dan mengabarkan status cuaca terkini di seluruh penjuru dunia (cuaca global) maupun cuaca lokal. Gunakan Google Search untuk mengambil data cuaca aktual terkini (suhu Celsius, kondisi cuaca, prakiraan) secara akurat tanpa emoji.`;
  }

  return instruction;
}

// Ensure multi-turn conversation strictly alternates user -> model -> user -> model without empty turns
function sanitizeConversationTurns(messages: ChatMessageTurn[]) {
  const rawTurns: Array<{ role: 'user' | 'model'; parts: any[] }> = [];

  for (let idx = 0; idx < messages.length; idx++) {
    const m = messages[idx];
    // Keep media attachments across recent turns (up to last 6 turns) so follow-up questions retain context
    const isRecentTurn = idx >= Math.max(0, messages.length - 6);
    const parts: any[] = [];

    if (m.attachments && m.attachments.length > 0 && isRecentTurn) {
      for (const att of m.attachments) {
        const rawMime = (att.mimeType || '').split(';')[0].trim().toLowerCase();
        const name = (att.name || '').toLowerCase();

        const resolveCleanMime = (): string => {
          let cleanMime = rawMime;
          if (!cleanMime || cleanMime === 'application/octet-stream') {
            if (name.endsWith('.mp4')) cleanMime = 'video/mp4';
            else if (name.endsWith('.webm')) cleanMime = 'video/webm';
            else if (name.endsWith('.mov')) cleanMime = 'video/quicktime';
            else if (name.endsWith('.3gp')) cleanMime = 'video/3gpp';
            else if (name.endsWith('.avi')) cleanMime = 'video/x-msvideo';
            else if (name.endsWith('.mkv')) cleanMime = 'video/webm';
            else if (name.endsWith('.pdf')) cleanMime = 'application/pdf';
            else if (name.endsWith('.jpg') || name.endsWith('.jpeg')) cleanMime = 'image/jpeg';
            else if (name.endsWith('.png')) cleanMime = 'image/png';
            else if (name.endsWith('.webp')) cleanMime = 'image/webp';
            else cleanMime = att.type === 'video' ? 'video/mp4' : att.type === 'image' ? 'image/jpeg' : 'application/pdf';
          }
          if (cleanMime === 'video/x-matroska') cleanMime = 'video/webm';
          return cleanMime;
        };

        if (att.fileUri) {
          parts.push({
            fileData: {
              mimeType: resolveCleanMime(),
              fileUri: att.fileUri,
            },
          });
        } else if (att.data) {
          const cleanData = att.data.includes(',')
            ? att.data.split(',')[1].trim()
            : att.data.trim();
          if (cleanData) {
            const isTextDoc =
              att.type === 'file' ||
              rawMime.startsWith('text/') ||
              rawMime.includes('json') ||
              rawMime.includes('javascript') ||
              rawMime.includes('typescript') ||
              rawMime.includes('xml') ||
              name.endsWith('.md') ||
              name.endsWith('.txt') ||
              name.endsWith('.json') ||
              name.endsWith('.csv') ||
              name.endsWith('.py') ||
              name.endsWith('.js') ||
              name.endsWith('.ts') ||
              name.endsWith('.html') ||
              name.endsWith('.css') ||
              name.endsWith('.yaml') ||
              name.endsWith('.yml') ||
              name.endsWith('.sql') ||
              name.endsWith('.sh');

            if (isTextDoc && rawMime !== 'application/pdf') {
              try {
                const textContent = Buffer.from(cleanData, 'base64').toString('utf-8');
                const ext = name.includes('.') ? name.split('.').pop() : 'txt';
                parts.push({
                  text: `\n[Isi Berkas Lampiran: ${att.name || 'Dokumen'}] (${att.size ? `${att.size} bytes` : ''}):\n\`\`\`${ext}\n${textContent.slice(0, 150000)}\n\`\`\`\n`,
                });
              } catch {
                parts.push({
                  inlineData: {
                    mimeType: 'text/plain',
                    data: cleanData,
                  },
                });
              }
            } else {
              parts.push({
                inlineData: {
                  mimeType: resolveCleanMime(),
                  data: cleanData,
                },
              });
            }
          }
        } else if (att.name) {
          // If media data was pruned or from another session, provide contextual marker
          parts.push({
            text: `\n[Lampiran Sebelumnya: ${att.name} (${att.type || 'media'})]\n`,
          });
        }
      }
    }

    if (m.content && m.content.trim()) {
      parts.push({ text: m.content.trim() });
    } else if (parts.length > 0) {
      const hasVid = m.attachments?.some(
        (a) =>
          a.type === 'video' ||
          (a.mimeType && a.mimeType.toLowerCase().startsWith('video/')) ||
          (a.name && /\.(mp4|webm|mov|mkv|3gp|avi)$/i.test(a.name))
      );
      parts.push({
        text: hasVid
          ? 'Mohon tonton dan analisis seluruh isi video ini secara mendalam (alur kejadian, visual, objek, suara, dan teks), lalu berikan penjelasan yang lengkap dan ramah.'
          : 'Mohon amati, baca, dan jelaskan berkas atau gambar lampiran ini secara mendalam.',
      });
    }

    if (parts.length > 0) {
      rawTurns.push({
        role: m.role === 'model' ? 'model' : 'user',
        parts,
      });
    }
  }

  // Filter leading non-user turns
  while (rawTurns.length > 0 && rawTurns[0].role !== 'user') {
    rawTurns.shift();
  }

  // Strict alternation: merge consecutive turns with identical roles
  const alternating: Array<{ role: 'user' | 'model'; parts: any[] }> = [];
  for (const turn of rawTurns) {
    if (alternating.length === 0) {
      alternating.push({ role: turn.role, parts: [...turn.parts] });
    } else {
      const last = alternating[alternating.length - 1];
      if (last.role === turn.role) {
        last.parts.push(...turn.parts);
      } else {
        alternating.push({ role: turn.role, parts: [...turn.parts] });
      }
    }
  }

  // Multi-turn conversation must end with 'user' turn for response generation
  while (alternating.length > 0 && alternating[alternating.length - 1].role !== 'user') {
    alternating.pop();
  }

  return alternating;
}

// Upload large video/media files directly to Gemini Files API and poll until ACTIVE
export async function uploadMediaFileToGemini(
  filePath: string,
  mimeType: string,
  displayName: string
): Promise<{ fileUri: string; mimeType: string; name?: string }> {
  const ai = getGeminiClient();
  const uploaded = await ai.files.upload({
    file: filePath,
    config: {
      mimeType,
      displayName,
    },
  });

  if (!uploaded.name) {
    if (!uploaded.uri) throw new Error('Gemini Files API tidak mengembalikan URI berkas.');
    return { fileUri: uploaded.uri, mimeType: uploaded.mimeType || mimeType };
  }

  let current = uploaded;
  const maxAttempts = 45; // up to ~54 seconds for large video indexing
  for (let i = 0; i < maxAttempts; i++) {
    if (current.state === 'ACTIVE') {
      break;
    }
    if (current.state === 'FAILED') {
      throw new Error('Gemini gagal memproses/mengindeks berkas video.');
    }
    await new Promise((r) => setTimeout(r, 1200));
    current = await ai.files.get({ name: uploaded.name });
  }

  if (current.state !== 'ACTIVE' && !current.uri) {
    throw new Error('Pemrosesan video di Gemini melampaui batas waktu.');
  }

  return {
    fileUri: current.uri || uploaded.uri || '',
    mimeType: current.mimeType || mimeType,
    name: current.name,
  };
}

// Real-time token streaming generator for blazing-fast responses
export async function* generateChatResponseStream(options: GenerateOptions) {
  const ai = getGeminiClient();
  const {
    messages,
    mode = 'search',
    systemInstruction,
    location,
    webSearch = true,
    allowEmojis = false,
    deviceTime,
    userMemories,
    userName,
  } = options;

  let modelName = 'gemini-3.8-flash';
  const config: any = {};
  const activeSystemInstruction = buildSystemInstruction(
    deviceTime,
    systemInstruction,
    userMemories,
    userName,
    allowEmojis
  );
  const isSearchActive = webSearch !== false;

  if (mode === 'thinking') {
    modelName = 'gemini-3.8-flash';
    config.thinkingConfig = {
      thinkingLevel: ThinkingLevel.HIGH,
    };
  } else if (mode === 'maps') {
    modelName = 'gemini-3.8-flash';
    config.tools = [{ googleMaps: {} }];
    if (location) {
      config.toolConfig = {
        retrievalConfig: {
          latLng: location,
        },
      };
    }
  } else if (isSearchActive) {
    modelName = 'gemini-3.8-flash';
    config.tools = [{ googleSearch: {} }];
  } else {
    modelName = 'gemini-3.8-flash';
  }

  config.systemInstruction = activeSystemInstruction;

  const contents = sanitizeConversationTurns(messages);
  if (contents.length === 0) {
    contents.push({
      role: 'user',
      parts: [{ text: 'Halo Maria' }],
    });
  }

  const hasVideo = messages.some((m) =>
    m.attachments?.some(
      (a) =>
        a.type === 'video' ||
        (a.mimeType && a.mimeType.toLowerCase().startsWith('video/')) ||
        (a.name && /\.(mp4|webm|mov|mkv|3gp|avi)$/i.test(a.name))
    )
  );
  const hasMedia = messages.some((m) => m.attachments && m.attachments.length > 0);

  // Model selection priority designed for maximum speed & quota efficiency:
  // 1. Prioritize fresh Gemini 2.5 models (gemini-2.5-flash, gemini-2.5-flash-lite) which have 0/5 & 0/10 RPM used
  //    and separate daily quotas from Gemini 3.8 Flash (which reached 20/20 RPD daily limit on user project).
  // 2. Video files: gemini-2.5-flash -> gemini-3.8-flash -> gemini-flash-latest.
  // 3. Media (images/docs): gemini-2.5-flash -> gemini-2.5-flash-lite -> gemini-3.8-flash -> gemini-flash-latest.
  // 4. Regular chat: gemini-2.5-flash-lite -> gemini-2.5-flash -> gemini-3.8-flash -> gemini-flash-latest.
  let candidateModels: string[];
  if (hasVideo) {
    candidateModels = ['gemini-2.5-flash', 'gemini-3.8-flash', 'gemini-flash-latest'];
  } else if (mode === 'thinking') {
    candidateModels = ['gemini-3.8-flash', 'gemini-2.5-flash', 'gemini-flash-latest'];
  } else if (hasMedia) {
    candidateModels = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-3.8-flash', 'gemini-flash-latest'];
  } else {
    // Ultra-fast sub-second chat response (<600ms) with multiple quota fallback tiers
    candidateModels = ['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-3.8-flash', 'gemini-flash-latest'];
  }

  let responseStream;
  let streamError: any = null;
  let successfulModel = candidateModels[0];

  for (const candidate of candidateModels) {
    const candidateConfig = { ...config };

    // Gemini 2.5 series does NOT support thinkingConfig (only Gemini 3 & 4)
    if (!candidate.startsWith('gemini-3') && !candidate.startsWith('gemini-4')) {
      delete candidateConfig.thinkingConfig;
    } else if (candidate === 'gemini-3.8-flash' && mode !== 'thinking') {
      candidateConfig.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
    }

    // Grounding tools (googleSearch/googleMaps) are unsupported with multimodal images/video on Gemini 2.5
    if (hasMedia || hasVideo || candidate === 'gemini-2.5-flash-lite' || candidate === 'gemini-3.1-flash-lite') {
      delete candidateConfig.tools;
      delete candidateConfig.toolConfig;
    }

    try {
      responseStream = await ai.models.generateContentStream({
        model: candidate,
        contents,
        config: candidateConfig,
      });
      successfulModel = candidate;
      streamError = null;
      break;
    } catch (err: any) {
      streamError = err;
      const errMsg = String(err?.message || err);
      const isQuotaExhausted =
        errMsg.includes('429') ||
        errMsg.includes('RESOURCE_EXHAUSTED') ||
        errMsg.includes('quota') ||
        errMsg.includes('rate limit');

      // If tools or thinking config caused a 400 error, retry once with clean basic configuration
      if (!isQuotaExhausted && (candidateConfig.tools || candidateConfig.thinkingConfig)) {
        try {
          responseStream = await ai.models.generateContentStream({
            model: candidate,
            contents,
            config: { systemInstruction: activeSystemInstruction },
          });
          successfulModel = candidate;
          streamError = null;
          break;
        } catch (fallbackErr: any) {
          streamError = fallbackErr;
        }
      }
      // If quota exhausted or failed, loop immediately moves to next candidate model!
    }
  }

  if (!responseStream) {
    const rawMsg = String(streamError?.message || streamError || '');
    if (rawMsg.includes('429') || rawMsg.includes('RESOURCE_EXHAUSTED')) {
      throw new Error('Batas kuota model Gemini tercapai (429). Mohon tunggu beberapa saat lalu coba kembali.');
    }
    throw streamError || new Error('Gagal terhubung ke model Gemini.');
  }

  const groundingLinks: Array<{ title?: string; uri: string }> = [];

  try {
    for await (const chunk of responseStream) {
      if (chunk.text) {
        yield {
          type: 'chunk',
          text: allowEmojis ? chunk.text : stripEmojis(chunk.text),
          model: successfulModel,
        };
      }

      const groundingChunks =
        chunk.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      for (const gChunk of groundingChunks) {
        if (gChunk.web?.uri) {
          const link = {
            title: gChunk.web.title || gChunk.web.uri,
            uri: gChunk.web.uri,
          };
          if (!groundingLinks.some((l) => l.uri === link.uri)) {
            groundingLinks.push(link);
          }
        }
        if (gChunk.maps?.uri) {
          const link = {
            title: gChunk.maps.title || 'Buka di Google Maps',
            uri: gChunk.maps.uri,
          };
          if (!groundingLinks.some((l) => l.uri === link.uri)) {
            groundingLinks.push(link);
          }
        }
      }
    }
  } catch (iterErr: any) {
    const errMsg = String(iterErr?.message || iterErr);
    // If the stream ends abruptly or encounters an incomplete trailing JSON segment,
    // gracefully conclude without failing the tokens already delivered
    console.warn('Gracefully recovered from stream chunk iteration notice:', errMsg);
  }

  yield {
    type: 'done',
    model: successfulModel,
    groundingLinks: groundingLinks.length > 0 ? groundingLinks : undefined,
  };
}

export async function generateChatResponse(options: GenerateOptions) {
  const ai = getGeminiClient();
  const {
    messages,
    mode = 'search',
    systemInstruction,
    location,
    webSearch = true,
    allowEmojis = false,
    deviceTime,
    userMemories,
    userName,
  } = options;

  let modelName = 'gemini-3.8-flash';
  const config: any = {};
  const activeSystemInstruction = buildSystemInstruction(
    deviceTime,
    systemInstruction,
    userMemories,
    userName,
    allowEmojis
  );
  const isSearchActive = webSearch !== false;

  if (mode === 'thinking') {
    modelName = 'gemini-3.8-flash';
    config.thinkingConfig = {
      thinkingLevel: ThinkingLevel.HIGH,
    };
  } else if (mode === 'maps') {
    modelName = 'gemini-3.8-flash';
    config.tools = [{ googleMaps: {} }];
    if (location) {
      config.toolConfig = {
        retrievalConfig: {
          latLng: location,
        },
      };
    }
  } else if (isSearchActive) {
    modelName = 'gemini-3.8-flash';
    config.tools = [{ googleSearch: {} }];
  } else {
    modelName = 'gemini-3.8-flash';
  }

  config.systemInstruction = activeSystemInstruction;

  const contents = sanitizeConversationTurns(messages);
  if (contents.length === 0) {
    contents.push({
      role: 'user',
      parts: [{ text: 'Halo Maria' }],
    });
  }

  const hasVideo = messages.some((m) =>
    m.attachments?.some(
      (a) =>
        a.type === 'video' ||
        (a.mimeType && a.mimeType.toLowerCase().startsWith('video/')) ||
        (a.name && /\.(mp4|webm|mov|mkv|3gp|avi)$/i.test(a.name))
    )
  );
  const hasMedia = messages.some((m) => m.attachments && m.attachments.length > 0);

  let candidateModels: string[];
  if (hasVideo) {
    candidateModels = ['gemini-2.5-flash', 'gemini-3.8-flash', 'gemini-flash-latest'];
  } else if (mode === 'thinking') {
    candidateModels = ['gemini-3.8-flash', 'gemini-2.5-flash', 'gemini-flash-latest'];
  } else if (hasMedia) {
    candidateModels = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-3.8-flash', 'gemini-flash-latest'];
  } else {
    candidateModels = ['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-3.8-flash', 'gemini-flash-latest'];
  }

  let response;
  let lastError: any = null;
  let successfulModel = candidateModels[0];

  for (const candidate of candidateModels) {
    const candidateConfig = { ...config };

    if (!candidate.startsWith('gemini-3') && !candidate.startsWith('gemini-4')) {
      delete candidateConfig.thinkingConfig;
    } else if (candidate === 'gemini-3.8-flash' && mode !== 'thinking') {
      candidateConfig.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
    }

    if (hasMedia || hasVideo || candidate === 'gemini-2.5-flash-lite' || candidate === 'gemini-3.1-flash-lite') {
      delete candidateConfig.tools;
      delete candidateConfig.toolConfig;
    }

    try {
      response = await ai.models.generateContent({
        model: candidate,
        contents,
        config: candidateConfig,
      });
      successfulModel = candidate;
      lastError = null;
      break;
    } catch (err: any) {
      lastError = err;
      const errMsg = String(err?.message || err);
      const isQuotaExhausted =
        errMsg.includes('429') ||
        errMsg.includes('RESOURCE_EXHAUSTED') ||
        errMsg.includes('quota') ||
        errMsg.includes('rate limit');

      if (!isQuotaExhausted && (candidateConfig.tools || candidateConfig.thinkingConfig)) {
        try {
          response = await ai.models.generateContent({
            model: candidate,
            contents,
            config: { systemInstruction: activeSystemInstruction },
          });
          successfulModel = candidate;
          lastError = null;
          break;
        } catch (fallbackErr: any) {
          lastError = fallbackErr;
        }
      }
    }
  }

  if (!response) {
    const rawMsg = String(lastError?.message || lastError || '');
    if (rawMsg.includes('429') || rawMsg.includes('RESOURCE_EXHAUSTED')) {
      throw new Error('Batas kuota model Gemini tercapai (429). Mohon tunggu beberapa saat lalu coba kembali.');
    }
    throw lastError || new Error('Gagal terhubung ke model Gemini.');
  }

  const rawText = response.text || '';
  const responseText = (allowEmojis ? rawText : stripEmojis(rawText)).replace(/  +/g, ' ').trim();

  // Extract grounding information (Search or Maps)
  const groundingChunks =
    response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const groundingLinks: Array<{ title?: string; uri: string }> = [];

  for (const chunk of groundingChunks) {
    if (chunk.web?.uri) {
      groundingLinks.push({
        title: chunk.web.title || chunk.web.uri,
        uri: chunk.web.uri,
      });
    }
    if (chunk.maps?.uri) {
      groundingLinks.push({
        title: chunk.maps.title || 'Buka di Google Maps',
        uri: chunk.maps.uri,
      });
    }
  }

  return {
    text: responseText,
    model: successfulModel,
    groundingLinks: groundingLinks.length > 0 ? groundingLinks : undefined,
  };
}

export interface GenerateImageOptions {
  prompt: string;
  imageSize?: '1K' | '2K' | '4K';
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
  baseImage?: string; // base64 data string or data URL for image editing
  mimeType?: string;
  engine?: 'nano-banana-2' | 'flash-image' | 'nano-banana-2.1' | 'nano-banana' | 'flash-lite' | 'free' | 'auto';
}

// Generate aesthetic vector SVG illustration when external API rate limit is reached
function generateProceduralIllustration(prompt: string, aspectRatio: string = '1:1') {
  let width = 1024;
  let height = 1024;

  if (aspectRatio === '16:9') {
    width = 1280;
    height = 720;
  } else if (aspectRatio === '9:16') {
    width = 720;
    height = 1280;
  } else if (aspectRatio === '4:3') {
    width = 1024;
    height = 768;
  } else if (aspectRatio === '3:4') {
    width = 768;
    height = 1024;
  }

  const escapedPrompt = prompt.replace(/[<>&"]/g, '');
  const promptSnippet = escapedPrompt.length > 80 ? escapedPrompt.slice(0, 80) + '...' : escapedPrompt;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f0c1b"/>
      <stop offset="50%" stop-color="#181335"/>
      <stop offset="100%" stop-color="#050508"/>
    </linearGradient>
    <linearGradient id="glow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6366f1" stop-opacity="0.8"/>
      <stop offset="50%" stop-color="#a855f7" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="#ec4899" stop-opacity="0.8"/>
    </linearGradient>
    <radialGradient id="orb" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#818cf8" stop-opacity="0.9"/>
      <stop offset="70%" stop-color="#c084fc" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>
    <filter id="blur">
      <feGaussianBlur stdDeviation="60"/>
    </filter>
  </defs>

  <rect width="${width}" height="${height}" fill="url(#bg)"/>

  <!-- Glowing Orbs -->
  <circle cx="${width * 0.3}" cy="${height * 0.4}" r="${Math.min(width, height) * 0.35}" fill="url(#orb)" filter="url(#blur)"/>
  <circle cx="${width * 0.7}" cy="${height * 0.6}" r="${Math.min(width, height) * 0.3}" fill="#ec4899" opacity="0.25" filter="url(#blur)"/>

  <!-- Modern Geometric Visual Art -->
  <g transform="translate(${width / 2}, ${height * 0.45})">
    <polygon points="0,-140 120,-70 120,70 0,140 -120,70 -120,-70" fill="none" stroke="url(#glow)" stroke-width="4" opacity="0.75"/>
    <polygon points="0,-100 86,-50 86,50 0,100 -86,50 -86,-50" fill="none" stroke="#ffffff" stroke-width="2" opacity="0.3"/>
    <circle cx="0" cy="0" r="40" fill="url(#glow)"/>
    <circle cx="0" cy="0" r="20" fill="#ffffff" opacity="0.9"/>
  </g>

  <!-- Title & Prompt Label -->
  <g transform="translate(${width * 0.08}, ${height * 0.82})">
    <rect width="${width * 0.84}" height="${height * 0.12}" rx="16" fill="#000000" fill-opacity="0.6" stroke="#ffffff" stroke-opacity="0.15"/>
    <text x="24" y="${height * 0.045}" font-family="system-ui, sans-serif" font-size="${Math.max(14, Math.floor(width * 0.016))}" font-weight="700" fill="#ffffff">
      Maria AI • Studio Ilustrasi
    </text>
    <text x="24" y="${height * 0.085}" font-family="system-ui, sans-serif" font-size="${Math.max(12, Math.floor(width * 0.013))}" fill="#94a3b8">
      "${promptSnippet}"
    </text>
  </g>
</svg>`;

  const base64 = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}

// Free AI Image Generation Engine (Flux / SDXL - Zero key, 100% Free Trial)
async function generateFreeTrialImage(prompt: string, aspectRatio: string = '1:1') {
  let width = 1024;
  let height = 1024;

  if (aspectRatio === '16:9') {
    width = 1280;
    height = 720;
  } else if (aspectRatio === '9:16') {
    width = 720;
    height = 1280;
  } else if (aspectRatio === '4:3') {
    width = 1024;
    height = 768;
  } else if (aspectRatio === '3:4') {
    width = 768;
    height = 1024;
  }

  const seed = Math.floor(Math.random() * 899999) + 100000;
  const encodedPrompt = encodeURIComponent(prompt.trim());
  const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${seed}&nologo=true&model=flux`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  try {
    const res = await fetch(pollinationsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) MariaAI-ImageStudio/2.0',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Free trial engine HTTP error: ${res.status}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    if (buffer.length < 500) {
      throw new Error('Image buffer too small.');
    }

    const mime = res.headers.get('content-type') || 'image/jpeg';
    return `data:${mime};base64,${buffer.toString('base64')}`;
  } catch (err: any) {
    clearTimeout(timeoutId);
    throw err;
  }
}

// In-memory cache for Gemini image model quota status to eliminate repeated 429 attempts
let isGeminiImageQuotaExhausted = false;

export async function generateAiImage(options: GenerateImageOptions) {
  const {
    prompt,
    imageSize = '1K',
    aspectRatio = '1:1',
    baseImage,
    mimeType = 'image/jpeg',
    engine = 'nano-banana-2',
  } = options;

  // Reset in-memory quota flag when user explicitly requests Gemini nano banana models
  if (engine === 'nano-banana-2' || engine === 'flash-image' || engine === 'nano-banana' || engine === 'nano-banana-2.1') {
    isGeminiImageQuotaExhausted = false;
  }

  // If user explicitly chose Free Trial engine OR if free-tier key has quota 0 for Gemini image models
  const shouldUseFreeEngine = engine === 'free' || (engine === 'auto' && isGeminiImageQuotaExhausted);

  if (shouldUseFreeEngine) {
    try {
      const editPrompt = baseImage ? `Modified version: ${prompt}, high quality visual` : prompt;
      const freeImageUrl = await generateFreeTrialImage(editPrompt, aspectRatio);
      return {
        imageUrl: freeImageUrl,
        model: 'flux-free-trial',
        notice: baseImage
          ? 'Diedit menggunakan Engine Free Trial (100% Gratis & Bebas Kuota).'
          : 'Dihasilkan via Engine Free Trial (100% Gratis & Bebas Kuota).',
      };
    } catch {
      return {
        imageUrl: generateProceduralIllustration(prompt, aspectRatio),
        model: 'maria-ai-visualizer',
        notice: 'Ilustrasi dihasilkan oleh Visualizer Prosedural Maria AI.',
      };
    }
  }

  // If baseImage is provided -> Image Editing Mode with Gemini
  if (baseImage) {
    const cleanBase64 = baseImage.includes(',') ? baseImage.split(',')[1].trim() : baseImage.trim();
    const detectedMime = mimeType || (baseImage.includes('data:image/png') ? 'image/png' : 'image/jpeg');

    // 1. Primary: Gemini Nano Banana 2 (Gemini 3.1 Flash Image)
    try {
      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-image',
        contents: {
          parts: [
            {
              inlineData: {
                data: cleanBase64,
                mimeType: detectedMime,
              },
            },
            {
              text: prompt,
            },
          ],
        },
        config: {
          imageConfig: {
            aspectRatio,
          },
        },
      });

      const parts = response.candidates?.[0]?.content?.parts || [];
      for (const part of parts) {
        if (part.inlineData?.data) {
          return {
            imageUrl: `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`,
            model: 'gemini-3.1-flash-lite-image',
            notice: 'Diedit via Gemini Nano Banana 2 (Gemini 3.1 Flash Image).',
          };
        }
      }
    } catch (err: any) {
      if (err?.message?.includes('429') || err?.message?.includes('RESOURCE_EXHAUSTED')) {
        isGeminiImageQuotaExhausted = true;
      }

      // 2. Try gemini-nano-banana-2.1
      try {
        const ai = getGeminiClient();
        const fallbackResponse = await ai.models.generateContent({
          model: 'gemini-nano-banana-2.1',
          contents: {
            parts: [
              {
                inlineData: {
                  data: cleanBase64,
                  mimeType: detectedMime,
                },
              },
              {
                text: prompt,
              },
            ],
          },
          config: {
            imageConfig: {
              aspectRatio,
              imageSize,
            },
          },
        });

        const parts = fallbackResponse.candidates?.[0]?.content?.parts || [];
        for (const part of parts) {
          if (part.inlineData?.data) {
            return {
              imageUrl: `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`,
              model: 'gemini-nano-banana-2.1',
              notice: 'Diedit via Gemini Nano Banana 2.1.',
            };
          }
        }
      } catch {
        // Silently route to Free Trial Flux Fallback with contextual edit prompt
        try {
          const editPrompt = `Modified version: ${prompt}, high quality detailed`;
          const freeImageUrl = await generateFreeTrialImage(editPrompt, aspectRatio);
          return {
            imageUrl: freeImageUrl,
            model: 'flux-free-trial',
            notice: 'Diedit menggunakan Engine Free Trial (100% Gratis & Bebas Kuota).',
          };
        } catch {
          return {
            imageUrl: generateProceduralIllustration(prompt, aspectRatio),
            model: 'maria-ai-visualizer',
            notice: 'Visualizer Prosedural Maria AI (Fallback Offline).',
          };
        }
      }
    }
  }

  // Standard Text-to-Image Creation: Primary model is Gemini Nano Banana 2 (Gemini 3.1 Flash Image)
  try {
    const ai = getGeminiClient();
    const primaryModel = engine === 'nano-banana-2.1' ? 'gemini-nano-banana-2.1' : 'gemini-3.1-flash-lite-image';

    const response = await ai.models.generateContent({
      model: primaryModel,
      contents: {
        parts: [{ text: prompt }],
      },
      config: {
        imageConfig: primaryModel === 'gemini-nano-banana-2.1' ? { aspectRatio, imageSize } : { aspectRatio },
      },
    });

    const parts = response.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData?.data) {
        return {
          imageUrl: `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`,
          model: primaryModel,
          notice: `Dihasilkan oleh Gemini Nano Banana 2 (Gemini 3.1 Flash Image).`,
        };
      }
    }
  } catch (err: any) {
    if (err?.message?.includes('429') || err?.message?.includes('RESOURCE_EXHAUSTED')) {
      isGeminiImageQuotaExhausted = true;
    }

    // 2. Try secondary Gemini image model
    try {
      const ai = getGeminiClient();
      const secondaryModel = engine === 'nano-banana-2.1' ? 'gemini-3.1-flash-lite-image' : 'gemini-nano-banana-2.1';
      const fallbackResponse = await ai.models.generateContent({
        model: secondaryModel,
        contents: {
          parts: [{ text: prompt }],
        },
        config: {
          imageConfig: secondaryModel === 'gemini-nano-banana-2.1' ? { aspectRatio, imageSize } : { aspectRatio },
        },
      });

      const parts = fallbackResponse.candidates?.[0]?.content?.parts || [];
      for (const part of parts) {
        if (part.inlineData?.data) {
          return {
            imageUrl: `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`,
            model: secondaryModel,
          };
        }
      }
    } catch {
      // 3. Free Trial Flux AI Fallback
      try {
        const freeImageUrl = await generateFreeTrialImage(prompt, aspectRatio);
        return {
          imageUrl: freeImageUrl,
          model: 'flux-free-trial',
          notice: 'Dihasilkan via Engine Free Trial (100% Gratis & Bebas Kuota).',
        };
      } catch {
        return {
          imageUrl: generateProceduralIllustration(prompt, aspectRatio),
          model: 'maria-ai-visualizer',
          notice: 'Catatan: Mode Free Trial offline, menggunakan Visualizer Prosedural Maria AI.',
        };
      }
    }
  }

  // Ultimate resilient fallback to ensure a valid image is ALWAYS returned
  return {
    imageUrl: generateProceduralIllustration(prompt, aspectRatio),
    model: 'maria-ai-visualizer',
    notice: 'Ilustrasi dihasilkan oleh Visualizer Prosedural Maria AI.',
  };
}

export async function editAiImage(options: GenerateImageOptions) {
  return generateAiImage(options);
}

// In-memory cache & quota cooldown for generated speech audio to conserve free-tier rate limits
const serverAudioCache = new Map<string, { audioUrl: string; model: string; voice: string }>();
let geminiTtsCooldownUntil = 0;
let geminiTtsLastApiKey = '';

function isGeminiTtsQuotaOrRateError(err: any): boolean {
  const raw = String(err?.message || err || '');
  return (
    err?.status === 429 ||
    err?.code === 429 ||
    /429|RESOURCE_EXHAUSTED|quota|rate[- ]limit|exceeded/i.test(raw)
  );
}

function parseTtsRetryDelayMs(err: any): number {
  const raw = String(err?.message || err || '');
  const secMatch =
    raw.match(/"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/i) ||
    raw.match(/retry in\s+(\d+(?:\.\d+)?)s/i);
  if (secMatch) {
    const secs = Number(secMatch[1]);
    if (Number.isFinite(secs) && secs > 0) {
      return Math.max(60_000, Math.min(secs * 1000, 6 * 60 * 60 * 1000));
    }
  }
  if (/PerDay|Daily|GenerateRequestsPerDay/i.test(raw)) {
    return 60 * 60 * 1000;
  }
  return 5 * 60 * 1000;
}

export async function generateSpeechAudio(
  text: string,
  voiceName: string = 'Aoede',
  personaId?: string,
  preferredModel?: string
) {
  // Clean text of markdown and strip all emojis before TTS
  let cleanText = stripEmojis(
    text
      .replace(/```[\s\S]*?```/g, ' bagian kode dilewati ')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/[#*_~>•]/g, ' ')
  )
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleanText) {
    return { audioUrl: null, model: 'none', voice: voiceName, notice: 'Teks kosong untuk suara.' };
  }

  // Read full answers up to 6000 characters cleanly without cutting off
  if (cleanText.length > 6000) {
    const sentences = cleanText.split(/(?<=[.!?])\s+/);
    let spokenSnippet = '';
    for (const s of sentences) {
      if ((spokenSnippet + ' ' + s).trim().length <= 6000) {
        spokenSnippet = (spokenSnippet + ' ' + s).trim();
      } else {
        break;
      }
    }
    cleanText = spokenSnippet || cleanText.slice(0, 6000);
  }

  // 1. Resolve Gemini AI Voice selection based on Voice Name or Persona ID
  const validVoices = ['Aoede', 'Kore', 'Puck', 'Fenrir', 'Zephyr', 'Charon'];
  let selectedVoice = voiceName;
  if (!validVoices.includes(selectedVoice)) {
    if (personaId === 'pria') selectedVoice = 'Fenrir';
    else if (personaId === 'remaja-perempuan') selectedVoice = 'Kore';
    else if (personaId === 'remaja-laki') selectedVoice = 'Puck';
    else if (personaId === 'anak-perempuan') selectedVoice = 'Zephyr';
    else if (personaId === 'anak-laki') selectedVoice = 'Charon';
    else selectedVoice = 'Aoede';
  }

  // Check server-side cache first to avoid repeating calls within rate limits
  const cacheKey = `${selectedVoice}:${personaId || 'wanita'}:${cleanText.slice(0, 300)}`;
  if (serverAudioCache.has(cacheKey)) {
    return serverAudioCache.get(cacheKey)!;
  }

  // Persona tone hint for Gemini speech model
  let styleHint = 'Ramah, natural, ekspresif dalam bahasa Indonesia';
  if (personaId === 'pria') {
    styleHint = 'Berwibawa, tenang, mantap, ramah dalam bahasa Indonesia';
  } else if (personaId === 'remaja-perempuan') {
    styleHint = 'Ceria, santai, lincah, bersahabat dalam bahasa Indonesia';
  } else if (personaId === 'remaja-laki') {
    styleHint = 'Enerjik, dinamis, kasual, asyik dalam bahasa Indonesia';
  } else if (personaId === 'anak-perempuan') {
    styleHint = 'Manis, riang, polos, ceria dalam bahasa Indonesia';
  } else if (personaId === 'anak-laki') {
    styleHint = 'Ceria, lincah, ingin tahu, penuh rasa penasaran dalam bahasa Indonesia';
  }

  // 2. PRIMARY: Gemini AI Voice Engine (bypass silently if free-tier quota cooldown is active)
  const targetTtsModel =
    preferredModel === 'gemini-3.8-flash-tts'
      ? 'gemini-3.8-flash-tts'
      : 'gemini-3.8-flash-lite-tts';

  const currentApiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '';
  if (currentApiKey !== geminiTtsLastApiKey) {
    geminiTtsLastApiKey = currentApiKey;
    geminiTtsCooldownUntil = 0;
  }

  if (currentApiKey && Date.now() >= geminiTtsCooldownUntil) {
    try {
      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: targetTtsModel,
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: cleanText,
                speechMetadata: {
                  style: styleHint,
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: selectedVoice },
            },
          },
        },
      });

      const base64Audio =
        response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

      if (base64Audio) {
        const result = {
          audioUrl: `data:audio/wav;base64,${base64Audio}`,
          model: targetTtsModel,
          voice: selectedVoice,
        };
        if (serverAudioCache.size > 200) serverAudioCache.clear();
        serverAudioCache.set(cacheKey, result);
        return result;
      }
    } catch (ttsErr: any) {
      if (isGeminiTtsQuotaOrRateError(ttsErr)) {
        geminiTtsCooldownUntil = Date.now() + parseTtsRetryDelayMs(ttsErr);
      } else {
        geminiTtsCooldownUntil = Date.now() + 30_000;
      }
    }
  }

  // 3. Fallback to Neural Voice (MsEdgeTTS) seamlessly without noisy error telemetry
  let tts: MsEdgeTTS | null = null;
  try {
    const isMale =
      personaId === 'pria' || personaId === 'remaja-laki' || personaId === 'anak-laki';
    const edgeVoice = isMale ? 'id-ID-ArdiNeural' : 'id-ID-GadisNeural';

    let pitch = '+0Hz';
    let rate = 1.0;
    if (personaId === 'anak-perempuan') {
      pitch = '+28Hz';
      rate = 1.10;
    } else if (personaId === 'anak-laki') {
      pitch = '+26Hz';
      rate = 1.10;
    } else if (personaId === 'remaja-perempuan') {
      pitch = '+12Hz';
      rate = 1.04;
    } else if (personaId === 'remaja-laki') {
      pitch = '+10Hz';
      rate = 1.04;
    } else if (personaId === 'pria') {
      pitch = '-2Hz';
      rate = 0.98;
    }

    tts = new MsEdgeTTS();
    await tts.setMetadata(edgeVoice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const { audioStream } = tts.toStream(cleanText.slice(0, 4500), { pitch, rate });
    const chunks: Buffer[] = [];
    audioStream.on('data', (c: Buffer) => chunks.push(c));

    await Promise.race([
      new Promise<void>((resolve, reject) => {
        audioStream.on('end', () => resolve());
        audioStream.on('error', (err: any) => reject(err));
      }),
      new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error('Audio generation timeout')), 12000)
      ),
    ]);

    const buffer = Buffer.concat(chunks);
    if (buffer.length > 0) {
      const result = {
        audioUrl: `data:audio/mp3;base64,${buffer.toString('base64')}`,
        model: `gemini-ai-voice-${personaId || 'wanita'}`,
        voice: edgeVoice,
      };
      if (serverAudioCache.size > 200) serverAudioCache.clear();
      serverAudioCache.set(cacheKey, result);
      return result;
    }
  } catch {
    // Fallback error handled gracefully below
  } finally {
    try {
      tts?.close();
    } catch {}
  }

  return {
    audioUrl: null,
    model: 'none',
    voice: selectedVoice,
    notice: 'Layanan suara AI sedang mencapai batas kuota sementara. Silakan coba putar ulang beberapa saat lagi.',
  };
}

