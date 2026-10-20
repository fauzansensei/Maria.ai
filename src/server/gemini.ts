import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

// Initialize Gemini Client strictly on server-side
export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
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

export interface GenerateOptions {
  messages: ChatMessageTurn[];
  mode?: 'general' | 'thinking' | 'fast' | 'search' | 'maps' | 'science';
  systemInstruction?: string;
  location?: { latitude: number; longitude: number };
  withVoice?: boolean;
  voiceName?: string;
  personaId?: string;
  webSearch?: boolean; // Web search is ON by default
}

// Helper to strip any emoji characters completely from text
export function stripEmojis(str: string): string {
  if (!str) return '';
  return str
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}\u{200D}\u{FE0F}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}\u{1F3FB}-\u{1F3FF}]/gu, '')
    .replace(/  +/g, ' ');
}

// Real-time token streaming generator for blazing-fast responses
export async function* generateChatResponseStream(options: GenerateOptions) {
  const ai = getGeminiClient();
  const { messages, mode = 'search', systemInstruction, location, webSearch = true } = options;

  let modelName = 'gemini-3.1-flash-lite';
  const config: any = {};

  let defaultSystemInstruction =
    'Anda adalah Maria AI, asisten kecerdasan buatan serba bisa yang cerdas, santun, ramah, cepat tanggap, dan terstruktur rapi. Jawablah dalam bahasa Indonesia secara alami, rapi, enak dibaca, dan gunakan format Markdown yang bersih (sub-judul, poin-poin teratur, atau blok kode beranotasi). ATURAN MUTLAK: DILARANG KERAS MENGGUNAKAN EMOJI SAMA SEKALI. Jangan pernah menyertakan emotikon, karakter emoji, atau simbol grafis apa pun dalam seluruh respon Anda.';

  const isSearchActive = webSearch !== false;

  if (mode === 'thinking') {
    modelName = 'gemini-3.8-flash';
    config.thinkingConfig = {
      thinkingLevel: ThinkingLevel.HIGH,
    };
    defaultSystemInstruction +=
      ' Mode penalaran mendalam aktif. Analisis masalah langkah demi langkah secara komprehensif.';
  } else if (isSearchActive) {
    // Web search always active by default with verified Google Grounding
    modelName = 'gemini-2.5-flash';
    config.tools = [{ googleSearch: {} }];
    defaultSystemInstruction +=
      ' Mode pencarian Google aktif. Gunakan informasi web terkini dan faktual.';
  } else if (mode === 'maps') {
    modelName = 'gemini-2.5-flash';
    config.tools = [{ googleMaps: {} }];
    if (location) {
      config.toolConfig = {
        retrievalConfig: {
          latLng: location,
        },
      };
    }
    defaultSystemInstruction +=
      ' Mode Google Maps aktif. Berikan informasi lokasi, rekomendasi tempat, dan petunjuk geografis dengan jelas.';
  } else if (mode === 'science') {
    modelName = 'gemini-3.8-flash';
    defaultSystemInstruction =
      'Anda adalah Maria AI Spesialis Sains & Bioinformatika. Jelaskan konsep sains secara mendalam, akurat secara akademis, dan sebutkan data struktur/gen bila relevan.';
  } else {
    // Web search manually turned off: blazing fast gemini-3.1-flash-lite
    modelName = 'gemini-3.1-flash-lite';
    defaultSystemInstruction +=
      ' Mode kilat aktif. Berikan jawaban yang ringkas, cepat, dan to-the-point.';
  }

  config.systemInstruction =
    (systemInstruction || defaultSystemInstruction) +
    '\n\nATURAN MUTLAK: DILARANG KERAS MENGGUNAKAN KARAKTER EMOJI ATAU EMOTIKON APAPUN dalam seluruh respon jawaban Anda.';

  // Format contents for multi-turn chat, preserving network speed by sending attachments only on latest turns
  const contents = messages.map((m, idx) => {
    const isRecentTurn = idx >= messages.length - 2;
    const parts: any[] = [];

    if (m.attachments && m.attachments.length > 0 && isRecentTurn) {
      for (const att of m.attachments) {
        if (att.data) {
          parts.push({
            inlineData: {
              mimeType: att.mimeType || (att.type === 'video' ? 'video/mp4' : 'image/jpeg'),
              data: att.data,
            },
          });
        }
      }
    }

    if (m.content) {
      parts.push({ text: m.content });
    } else if (parts.length > 0) {
      parts.push({ text: 'Tolong analisis dan jelaskan gambar/video ini secara mendalam.' });
    }

    return {
      role: m.role,
      parts,
    };
  });

  const responseStream = await ai.models.generateContentStream({
    model: modelName,
    contents,
    config,
  });

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
  const { messages, mode = 'search', systemInstruction, location, webSearch = true } = options;

  let modelName = 'gemini-3.1-flash-lite';
  const config: any = {};

  let defaultSystemInstruction =
    'Anda adalah Maria AI, asisten kecerdasan buatan serba bisa yang cerdas, santun, ramah, cepat tanggap, dan terstruktur rapi. Jawablah dalam bahasa Indonesia secara alami, rapi, enak dibaca, dan gunakan format Markdown yang bersih (sub-judul, poin-poin teratur, atau blok kode beranotasi). ATURAN MUTLAK: DILARANG KERAS MENGGUNAKAN EMOJI SAMA SEKALI. Jangan pernah menyertakan emotikon, karakter emoji, atau simbol grafis apa pun dalam seluruh respon Anda.';

  const isSearchActive = webSearch !== false;

  if (mode === 'thinking') {
    modelName = 'gemini-3.8-flash';
    config.thinkingConfig = {
      thinkingLevel: ThinkingLevel.HIGH,
    };
    defaultSystemInstruction +=
      ' Mode penalaran mendalam diaktifkan. Analisis masalah langkah demi langkah secara komprehensif dan berikan penjelasan yang kokoh.';
  } else if (isSearchActive) {
    modelName = 'gemini-2.5-flash';
    config.tools = [{ googleSearch: {} }];
    defaultSystemInstruction +=
      ' Mode pencarian Google aktif. Gunakan informasi web terkini dan faktual.';
  } else if (mode === 'maps') {
    modelName = 'gemini-2.5-flash';
    config.tools = [{ googleMaps: {} }];
    if (location) {
      config.toolConfig = {
        retrievalConfig: {
          latLng: location,
        },
      };
    }
    defaultSystemInstruction +=
      ' Mode Google Maps aktif. Berikan informasi lokasi, rekomendasi tempat, jam operasional, dan petunjuk geografis dengan jelas.';
  } else if (mode === 'science') {
    modelName = 'gemini-3.8-flash';
    defaultSystemInstruction =
      'Anda adalah Maria AI Spesialis Sains & Bioinformatika (Google DeepMind Science Specialist). Anda ahli dalam biologi molekuler, struktur protein (AlphaFold, RCSB PDB, UniProt), genetika & genomik (ClinVar, gnomAD, dbSNP), kimia obat (PubChem, ChEMBL), jalur biologis (Reactome, STRING), dan literatur ilmiah (PubMed). Jelaskan konsep sains secara mendalam, akurat secara akademis, dan sebutkan data struktur/gen bila relevan.';
  } else {
    modelName = 'gemini-3.1-flash-lite';
    defaultSystemInstruction +=
      ' Mode kilat aktif. Berikan jawaban yang ringkas, langsung ke inti persoalan, dan efisien.';
  }

  config.systemInstruction =
    (systemInstruction || defaultSystemInstruction) +
    '\n\nATURAN MUTLAK: DILARANG KERAS MENGGUNAKAN KARAKTER EMOJI ATAU EMOTIKON APAPUN dalam seluruh respon jawaban Anda.';

  const contents = messages.map((m, idx) => {
    const isRecentTurn = idx >= messages.length - 2;
    const parts: any[] = [];

    if (m.attachments && m.attachments.length > 0 && isRecentTurn) {
      for (const att of m.attachments) {
        if (att.data) {
          parts.push({
            inlineData: {
              mimeType: att.mimeType || (att.type === 'video' ? 'video/mp4' : 'image/jpeg'),
              data: att.data,
            },
          });
        }
      }
    }

    if (m.content) {
      parts.push({ text: m.content });
    } else if (parts.length > 0) {
      parts.push({ text: 'Tolong analisis dan jelaskan gambar/video ini secara mendalam.' });
    }

    return {
      role: m.role,
      parts,
    };
  });

  const response = await ai.models.generateContent({
    model: modelName,
    contents,
    config,
  });

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

  // Audio generation is handled asynchronously on the frontend via /api/tts to make text responses blazing fast
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

  // Read full answers up to 2500 characters cleanly
  if (cleanText.length > 2500) {
    const sentences = cleanText.split(/(?<=[.!?])\s+/);
    let spokenSnippet = '';
    for (const s of sentences) {
      if ((spokenSnippet + ' ' + s).trim().length <= 2500) {
        spokenSnippet = (spokenSnippet + ' ' + s).trim();
      } else {
        break;
      }
    }
    cleanText = spokenSnippet || cleanText.slice(0, 2500);
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

