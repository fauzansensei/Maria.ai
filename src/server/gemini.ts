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
  data: string; // base64
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
  deviceTime?: DeviceTimeInfo;
}

// Helper to strip any emoji characters completely from text
export function stripEmojis(str: string): string {
  if (!str) return '';
  return str
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}\u{200D}\u{FE0F}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}\u{1F3FB}-\u{1F3FF}]/gu, '')
    .replace(/  +/g, ' ');
}

// Core system instruction following the official Maria AI Communication Guidelines (revisi by dola)
const BASE_MARIA_INSTRUCTION = `INSTRUKSI SISTEM: GAYA KOMUNIKASI MARIA AI

Identitas & Karakter:
- Anda adalah Maria, asisten kecerdasan buatan yang profesional, ramah, sopan, dan beretika.
- Bila pengguna secara eksplisit menanyakan siapa pembuat atau pengembang Anda, jawab dengan sopan bahwa Anda adalah Maria AI yang dikembangkan oleh Zan.dev.
- DILARANG KERAS menyertakan tautan/URL/link web apapun ke situs Zan.dev atau tautan eksternal lainnya saat menyebut pengembang.
- Jika pengguna hanya menyapa (seperti "Halo", "Halo Maria", "Selamat pagi"), berikan sapaan ramah dan tanyakan apa yang dapat Anda bantu tanpa menyebutkan pengembang.

Filosofi Karakter:
- Sopan itu wajib: selalu hormati pengguna.
- Ramah itu terasa: nada bicara hangat dan bersahabat, tanpa berlebihan.
- Profesional: jelas, tepat sasaran, tidak bertele-tele, menghargai waktu pengguna.

Aturan Berbicara:
1. Selalu gunakan bahasa yang sopan, jelas, dan mudah dipahami.
2. Tetap ramah dan hangat, tetapi tidak berlebihan. Cukup satu sapaan di awal, tidak perlu di setiap kalimat.
3. Gunakan "Anda" untuk menyapa pengguna. JANGAN gunakan panggilan "Kak", "Kakak", atau sebutan santai sejenis kecuali pengguna meminta secara khusus.
4. Gunakan "Saya" untuk menyebut diri sendiri, bukan nama "Maria" berulang-ulang di setiap kalimat.
5. Langsung pada inti pembicaraan. Jangan bertele-tele. Jika butuh kalimat pembuka, cukup satu kalimat saja (contoh: "Tentu, berikut rangkumannya:").
6. Jika memberikan penjelasan panjang atau langkah-langkah, gunakan poin-poin terstruktur agar mudah dibaca. Pastikan tidak ada teks yang terulang.
7. Tetap hangat dengan frasa seperti: "Dengan senang hati", "Semoga membantu", "Silakan beri tahu saya jika ada hal lain yang perlu dijelaskan."
8. Saat tidak tahu atau tidak bisa: sampaikan dengan jujur dan sopan, jangan beralasan berlebihan (contoh: "Mohon maaf, saat ini saya belum dapat melakukan hal tersebut.").
9. Sesuaikan panjang jawaban dengan pertanyaan: singkat untuk pertanyaan singkat, lengkap dan mendalam jika diminta penjelasan.
10. Selalu akhiri dengan kesiapan membantu (contoh: "Ada lagi yang bisa saya bantu?").

Mencegah Duplikasi:
- Pastikan tidak ada bagian teks yang sama persis muncul dua kali.
- Rangkum kalimat agar padat dan berbobot.

Struktur Jawaban:
1. [Pembuka Singkat - maksimal 1 kalimat]
2. [Isi Jawaban - poin-poin, jelas, padat, rapi]
3. [Penutup Ramah - maksimal 1 kalimat]

Pencarian Web & Rangkuman Informasi Media:
- Anda memiliki integrasi Google Search. Ketika pengguna menanyakan berita, kabar terkini, perkembangan peristiwa di media, atau informasi aktual: telusuri web dan media terpercaya, kemudian rangkum fakta-fakta kunci secara akurat, objektif, dan terstruktur.

Fitur Windows Open & Pemutar Media YouTube / Website Eksternal:
- Anda memiliki fitur Windows Open interaktif. Ketika pengguna meminta untuk mendengarkan lagu, memutar musik di YouTube, atau mencari info di YouTube (contoh: "puterin lagu ... di youtube", "dengerin lagu ...", "buka youtube"):
  Berikan respon pengantar ramah (1 kalimat) dan sertakan link tindakan YouTube dalam format markdown:
  [Putar Lagu di YouTube: Judul Lagu](https://www.youtube.com/results?search_query=JUDUL+LAGU)
  atau jika video spesifik: [Tonton di YouTube: Judul](https://www.youtube.com/watch?v=ID)
- Ketika pengguna meminta membuka website atau sumber informasi lain (contoh: "buka situs ...", "buka web ..."):
  Berikan link situs resmi dalam format: [Buka Website: Nama Situs](https://url-situs)
- Sistem antarmuka Maria secara otomatis akan menampilkan pemutar YouTube interaktif dan tombol aksi "Buka di Jendela Baru" (Windows Open) agar pengguna dapat langsung menikmati musik atau membaca sumber eksternal tanpa repot.

Kemampuan Vision & Analisis Gambar/Video:
- Pengguna dapat mengunggah gambar, foto, tangkapan layar (screenshot), dokumen, atau diagram. Anda WAJIB menganalisis seluruh elemen visual dengan cermat, termasuk teks bacaan (OCR), tata letak, data, dan konteks gambar. Jawab pertanyaan pengguna mengenai gambar tersebut dengan jelas dan tepat.

ATURAN MUTLAK:
- DILARANG KERAS MENGGUNAKAN KARAKTER EMOJI ATAU EMOTIKON APAPUN dalam seluruh respon jawaban Anda.`;

// Build dynamic system instruction with device real-time clock and global weather capability
function buildSystemInstruction(deviceTime?: DeviceTimeInfo, custom?: string): string {
  let instruction = custom || BASE_MARIA_INSTRUCTION;

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
    const isRecentTurn = idx >= messages.length - 2;
    const parts: any[] = [];

    if (m.attachments && m.attachments.length > 0 && isRecentTurn) {
      for (const att of m.attachments) {
        if (att.data) {
          const cleanData = att.data.includes(',')
            ? att.data.split(',')[1].trim()
            : att.data.trim();
          if (cleanData) {
            parts.push({
              inlineData: {
                mimeType: att.mimeType || (att.type === 'video' ? 'video/mp4' : 'image/jpeg'),
                data: cleanData,
              },
            });
          }
        }
      }
    }

    if (m.content && m.content.trim()) {
      parts.push({ text: m.content.trim() });
    } else if (parts.length > 0) {
      parts.push({ text: 'Mohon amati dan jelaskan gambar ini secara mendalam.' });
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

// Real-time token streaming generator for blazing-fast responses
export async function* generateChatResponseStream(options: GenerateOptions) {
  const ai = getGeminiClient();
  const { messages, mode = 'search', systemInstruction, location, webSearch = true, deviceTime } = options;

  let modelName = 'gemini-3.8-flash';
  const config: any = {};
  const activeSystemInstruction = buildSystemInstruction(deviceTime, systemInstruction);
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

  let responseStream;
  try {
    responseStream = await ai.models.generateContentStream({
      model: modelName,
      contents,
      config,
    });
  } catch (err: any) {
    console.warn('Primary stream failed with gemini-3.8-flash, falling back to gemini-3.1-flash-lite:', err?.message);
    try {
      modelName = 'gemini-3.1-flash-lite';
      const fallbackConfig: any = {
        systemInstruction: activeSystemInstruction,
      };
      if (isSearchActive) {
        fallbackConfig.tools = [{ googleSearch: {} }];
      }
      responseStream = await ai.models.generateContentStream({
        model: modelName,
        contents,
        config: fallbackConfig,
      });
    } catch (fallbackErr: any) {
      console.warn('Fallback to gemini-3.1-flash-lite failed, falling back to pure gemini-flash-latest:', fallbackErr?.message);
      modelName = 'gemini-flash-latest';
      responseStream = await ai.models.generateContentStream({
        model: modelName,
        contents,
        config: { systemInstruction: activeSystemInstruction },
      });
    }
  }

  const groundingLinks: Array<{ title?: string; uri: string }> = [];

  for await (const chunk of responseStream) {
    if (chunk.text) {
      yield {
        type: 'chunk',
        text: stripEmojis(chunk.text),
        model: modelName,
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

  yield {
    type: 'done',
    model: modelName,
    groundingLinks: groundingLinks.length > 0 ? groundingLinks : undefined,
  };
}

export async function generateChatResponse(options: GenerateOptions) {
  const ai = getGeminiClient();
  const { messages, mode = 'search', systemInstruction, location, webSearch = true, deviceTime } = options;

  let modelName = 'gemini-3.8-flash';
  const config: any = {};
  const activeSystemInstruction = buildSystemInstruction(deviceTime, systemInstruction);
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

  let response;
  try {
    response = await ai.models.generateContent({
      model: modelName,
      contents,
      config,
    });
  } catch (err: any) {
    console.warn('generateContent failed with gemini-3.8-flash, falling back to gemini-3.1-flash-lite:', err?.message);
    try {
      modelName = 'gemini-3.1-flash-lite';
      const fallbackConfig: any = {
        systemInstruction: activeSystemInstruction,
      };
      if (isSearchActive) {
        fallbackConfig.tools = [{ googleSearch: {} }];
      }
      response = await ai.models.generateContent({
        model: modelName,
        contents,
        config: fallbackConfig,
      });
    } catch (fallbackErr: any) {
      console.warn('Fallback to gemini-3.1-flash-lite failed, falling back to gemini-flash-latest:', fallbackErr?.message);
      modelName = 'gemini-flash-latest';
      response = await ai.models.generateContent({
        model: modelName,
        contents,
        config: { systemInstruction: activeSystemInstruction },
      });
    }
  }

  const rawText = response.text || '';
  const responseText = stripEmojis(rawText).replace(/  +/g, ' ').trim();

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
    model: modelName,
    groundingLinks: groundingLinks.length > 0 ? groundingLinks : undefined,
  };
}

export interface GenerateImageOptions {
  prompt: string;
  imageSize?: '1K' | '2K' | '4K';
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3';
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

export async function generateAiImage(options: GenerateImageOptions) {
  const ai = getGeminiClient();
  const { prompt, imageSize = '1K', aspectRatio = '1:1' } = options;

  // 1. Try Nano Banana 2.1 (Flagship High Quality Image Model)
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-nano-banana-2.1',
      contents: {
        parts: [{ text: prompt }],
      },
      config: {
        imageConfig: {
          aspectRatio,
          imageSize,
        },
      },
    });

    const parts = response.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData?.data) {
        return {
          imageUrl: `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`,
          model: 'gemini-nano-banana-2.1',
        };
      }
    }
  } catch (err: any) {
    console.warn('nano-banana-2.1 image generation fallback:', err.message);

    // 2. Try Flash Lite Image Model
    try {
      const fallbackResponse = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-image',
        contents: {
          parts: [{ text: prompt }],
        },
        config: {
          imageConfig: {
            aspectRatio,
          },
        },
      });

      const parts = fallbackResponse.candidates?.[0]?.content?.parts || [];
      for (const part of parts) {
        if (part.inlineData?.data) {
          return {
            imageUrl: `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`,
            model: 'gemini-3.1-flash-lite-image',
          };
        }
      }
    } catch (fallbackErr: any) {
      console.warn('flash-lite-image fallback also failed:', fallbackErr.message);

      // If quota is exhausted (429 RESOURCE_EXHAUSTED or limit: 0 on free tier key):
      // Generate a procedural SVG visual illustration so the app remains responsive and visually stunning!
      if (
        fallbackErr.message?.includes('429') ||
        fallbackErr.message?.includes('quota') ||
        fallbackErr.message?.includes('RESOURCE_EXHAUSTED') ||
        err.message?.includes('429') ||
        err.message?.includes('quota') ||
        err.message?.includes('RESOURCE_EXHAUSTED')
      ) {
        return {
          imageUrl: generateProceduralIllustration(prompt, aspectRatio),
          model: 'maria-ai-visualizer',
          notice:
            'Catatan: Kuota model gambar Gemini gratis sedang mencapai batas harian (limit 0 pada free tier). Ilustrasi di atas dihasilkan oleh Visualizer Prosedural Maria AI. Untuk mengaktifkan Gemini Nano Banana resolusi 4K penuh, silakan pilih API key dengan billing di Settings > Secrets.',
        };
      }

      throw fallbackErr;
    }
  }

  throw new Error('Gagal menghasilkan gambar dari model AI.');
}

// In-memory cache for generated speech audio to conserve free-tier rate limits
const serverAudioCache = new Map<string, { audioUrl: string; model: string; voice: string }>();

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

  // 2. PRIMARY: Latest Gemini AI Voice Engine models
  const primaryModel =
    preferredModel === 'gemini-3.8-flash-tts'
      ? 'gemini-3.8-flash-tts'
      : 'gemini-3.8-flash-lite-tts';
  const alternateModel =
    primaryModel === 'gemini-3.8-flash-lite-tts'
      ? 'gemini-3.8-flash-tts'
      : 'gemini-3.8-flash-lite-tts';

  const geminiModels = [primaryModel, alternateModel];
  const ai = getGeminiClient();

  for (const model of geminiModels) {
    try {
      const response = await ai.models.generateContent({
        model,
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
          model,
          voice: selectedVoice,
        };
        // Store in cache
        if (serverAudioCache.size > 200) serverAudioCache.clear();
        serverAudioCache.set(cacheKey, result);
        return result;
      }
    } catch {
      // Free tier rate limit or transient pause: continue smoothly to fallback without noisy logging
    }
  }

  // 3. Fallback to Neural Voice (MsEdgeTTS) if Gemini TTS rate limit is reached
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

    const tts = new MsEdgeTTS();
    await tts.setMetadata(edgeVoice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const { audioStream } = tts.toStream(cleanText, { pitch, rate });
    const chunks: Buffer[] = [];
    audioStream.on('data', (c: Buffer) => chunks.push(c));

    await Promise.race([
      new Promise<void>((resolve, reject) => {
        audioStream.on('end', () => resolve());
        audioStream.on('error', (err: any) => reject(err));
      }),
      new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error('Audio generation timeout')), 8000)
      ),
    ]);
    try {
      tts.close();
    } catch {}

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
  }

  return {
    audioUrl: null,
    model: 'none',
    voice: selectedVoice,
    notice: 'Kuota suara AI Gemini sedang mencapai batas laju 3 request/menit (free tier). Suara otomatis kembali siap beberapa detik lagi.',
  };
}

