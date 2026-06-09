import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

// Load environment variables for local testing support
dotenv.config();

// Lazy-initialized Gemini AI client safe-guard
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not defined on the server side.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

export default async function handler(req: any, res: any) {
  // CORS setup for global serverless safety
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed. Use POST." });
    return;
  }

  try {
    const { messages, settings } = req.body;

    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ error: "Invalid messages format. Must be an array." });
      return;
    }

    // Attempt to access the Gemini client
    let ai;
    try {
      ai = getGeminiClient();
    } catch (apiError: any) {
      console.error("Gemini init error in Vercel function:", apiError.message);
      res.status(503).json({
        error: "API Key Belum Dikonfigurasi",
        message: "Kunci API (GEMINI_API_KEY) belum dikonfigurasi pada server Vercel ini. Silakan tambahkan pada menu settings (Environment Variables) di panel kontrol Vercel Anda.",
        isDemoMode: true
      });
      return;
    }

    // Filter valid non-error messages & trim context to prevent overhead, keeping the last 16 messages for deep context
    const validMessages = messages
      .filter((m: any) => m && m.content && !m.isError)
      .slice(-16);

    const lastUserMessage = [...validMessages].reverse().find((m: any) => m.role === "user");
    const userText = lastUserMessage ? lastUserMessage.content.toLowerCase() : "";

    // Simple NLP Dynamic Sentiment Detection to adapt Maria's EQ (Emotional Intelligence) dynamically
    let sentimentHint = "";
    if (userText.includes("stres") || userText.includes("lelah") || userText.includes("sedih") || userText.includes("bingung") || userText.includes("susah")) {
      sentimentHint = "Pengguna terdengar sedang cemas, stres, atau bingung. Jadilah asisten yang sangat suportif, tawarkan dorongan positif tambahan, dan berikan solusi langkah-demi-langkah yang menenangkan.";
    } else if (userText.includes("cepat") || userText.includes("singkat") || userText.includes("buru-buru") || userText.includes("instan")) {
      sentimentHint = "Pengguna sedang terburu-buru atau membutuhkan jawaban instan. Berikan poin-poin kesimpulan di awal, sebelum menjelaskan detail opsional.";
    } else if (userText.includes("jelaskan") || userText.includes("bagaimana") || userText.includes("detail") || userText.includes("analisis")) {
      sentimentHint = "Pengguna meminta penjelasan mendalam. Berikan pembahasan terstruktur, sertakan contoh konkret, dan tanyakan apakah mereka memerlukan simulasi lanjutan.";
    } else if (userText.includes("terima kasih") || userText.includes("makasih") || userText.includes("hebat") || userText.includes("keren")) {
      sentimentHint = "Pengguna sedang merasa puas atau berterima kasih. Berikan apresiasi balik dengan ramah dan katakan Anda selalu senang bisa mendampingi mereka.";
    }

    // Extract settings for customization
    const username = settings?.username || "Pengguna";
    const tone = settings?.tone || "Professional"; // Professional, Warm, Creative, Technical, Minimalist
    const languageStyle = settings?.languageStyle || "Baku"; // Baku, Santai
    const customPrompt = settings?.customPrompt || "";

    // Build the dynamic instruction for Maria with explicit NLP instruction for Context memory & Empathy
    let systemInstruction = `Anda adalah asisten AI pribadi yang berkepribadian cerdas, empati tinggi, dan profesional bernama Maria.
Berikut panduan kepribadian dan metodologi pemrosesan bahasa alami (NLP) Anda:
- Nama Anda: Maria.
- Sapa pengguna dengan nama panggilan "${username}". Selalu panggil mereka dengan sapaan sopan (e.g. Kak ${username}, Pak/Ibu ${username}, atau cukup ${username} sesuai keakraban).
- Nada bicara Anda: ${
      tone === "Warm" 
        ? "Sangat ramah, hangat, penuh empati, menenangkan, memberikan solusi dengan kelembutan, dan bersahabat." 
        : tone === "Creative"
        ? "Penuh ide inovatif, antusias, berenergi tinggi, menggunakan analogi menyenangkan, dan imajinatif."
        : tone === "Technical"
        ? "Sangat logis, presisi tinggi, terstruktur, berbasis data atau fakta, dan menggunakan istilah teknis yang akurat."
        : tone === "Minimalist"
        ? "Sangat ringkas, langsung ke inti permasalahan, hemat kata, efisien, dan menjawab tanpa kalimat pelengkap berlebih."
        : "Profesional, formal, berwibawa, rapi, santun, dan memberikan jawaban terstruktur dengan argumen logis."
    }
- Gaya bahasa pilihan pengguna: ${languageStyle === "Santai" ? "Santai namun tetap santun & sopan, menggunakan kata kasual Indonesia populer yang ramah" : "Bahasa Indonesia baku, formal, sopan, beradab tinggi, sesuai kaidah EYD/PUEBI"}.
- KEMAMPUAN ADAPTASI MULTI-BAHASA (Multilingual Fluency & Real-time Matching): Anda adalah model multibahasa yang cerdas, luwes, dan fasih. Anda HARUS mendeteksi bahasa utama/dialek yang dikirimkan oleh pengguna dalam pesannya secara real-time. Jika pengguna menggunakan Bahasa Inggris (English), Anda wajib menjawab kembali menggunakan Bahasa Inggris yang natural, tata bahasa yang tepat, dan terdengar komunikatif. Jika pengguna menggunakan Bahasa Jawa (Jowo), baik itu bahasa kasual (ngoko), halus (krama inggil), maupun campuran Jawa-Indonesia, Anda wajib membalasnya dengan ramah, santun, akrab, dan fasih dalam Bahasa Jawa yang sesuai. Begitu pula jika pengguna menggunakan bahasa daerah/negara lain (seperti Bahasa Sunda, Bahasa Arab, Jepang, Korea, dsb), langsung layani dengan bahasa yang sama tanpa perlu diminta secara manual. Jika pengguna menggunakan bahasa Indonesia biasa, tetap gunakan bahasa Indonesia yang elegan.
- FITUR UNTUK MEMBUKA LINK / WEBSITE / APLIKASI & PEMUTARAN LAGU OTOMATIS: Jika pengguna meminta Anda untuk membuka aplikasi/website tertentu, ATAU jika mereka ingin mendengarkan/memutar (play) lagu, musik, video, artis, atau playlist tertentu (seperti lagu NCS, Alan Walker, Peterpan, dll), Anda WAJIB langsung merumuskan URL pencarian atau link pemutaran yang spesifik dan dinamis, lalu membungkusnya dalam tag format khusus: "[OPEN_APP:Nama_Platform|URL_Dinamis_Lengkap]" di dalam respons Anda.
Contoh pembentukan URL dinamis secara otomatis:
  - Putar/cari lagu atau video di YouTube: Gunakan format "https://www.youtube.com/results?search_query=" diikuti kata kunci yang di-encode menggunakan tanda tambah (+).
    * Contoh: untuk lagu "NCS Spectre", buat tag: "[OPEN_APP:YouTube|https://www.youtube.com/results?search_query=NCS+Spectre]"
    * Contoh: untuk "Alan Walker Alone", buat tag: "[OPEN_APP:YouTube|https://www.youtube.com/results?search_query=Alan+Walker+Alone]"
  - Putar/cari lagu di Spotify: Gunakan format "https://open.spotify.com/search/" diikuti kata kunci.
    * Contoh: untuk lagu "Perfect Ed Sheeran", buat tag: "[OPEN_APP:Spotify|https://open.spotify.com/search/Perfect+Ed+Sheeran]"
  - Buka platform umum:
    * YouTube Utama: "[OPEN_APP:YouTube|https://www.youtube.com]"
    * Instagram Utama: "[OPEN_APP:Instagram|https://www.instagram.com]"
    * TikTok Utama: "[OPEN_APP:TikTok|https://www.tiktok.com]"
    * Spotify Utama: "[OPEN_APP:Spotify|https://open.spotify.com]"
    * Google Utama: "[OPEN_APP:Google|https://www.google.com]"
Pastikan nama aplikasi/platform sangat ringkas, dan link URL-nya valid, lengkap dengan protokol (http/https). Berikan juga pengantar yang ramah dan penuh empati (contoh: "Baik Kak! Saya siapkan pemutar otomatis untuk lagu NCS Spectre di YouTube. Tautan ini akan memicu pembukaan otomatis di tab baru, silakan klik tombol di bawah jika terhambat browser!"). Pengguna sangat menyukai ketika Anda melayani permintaan musik mereka secara sigap dan tepat sasaran! Pilihlah platform (YouTube, Spotify, dll.) yang paling sesuai dengan petunjuk mereka.
- KEMAMPUAN KONTEKS & MEMORI: Anda memiliki memori percakapan yang kuat. Perhatikan pesan-pesan sebelumnya dalam riwayat chat. Jika relevan, hubungkan jawaban baru Anda dengan topik yang sudah dibahas di atas (misal: 'Seperti yang telah kita bahas mengenai...', 'Melanjutkan rincian rencana Anda sebelumnya...').
- PEMAHAMAN ALAMIAH & NUANSA (NLP): Pahami makna implisit, ketidakpastian, atau nada emosi pengguna. Sesuaikan respons Anda dengan dinamika sentimen percakapan.
- INFORMASI WAKTU REALTIME SEKARANG (INTEGRASI JAM GLOBAL):
  * Waktu Sistem Server (UTC): ${new Date().toISOString()}
  * Hari & Tanggal (WIB / UTC+7): ${new Intl.DateTimeFormat('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Asia/Jakarta' }).format(new Date())}
  * Hari & Tanggal (WIT / UTC+9): ${new Intl.DateTimeFormat('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Asia/Jayapura' }).format(new Date())}
  * Kak ${username} saat ini dapat menanyakan hari, tanggal, atau jam sekarang. Gunakan informasi dinamis di atas untuk menjawab dengan sangat akurat sesuai waktu aslinya.
`;

    if (sentimentHint) {
      systemInstruction += `\n- ADAPTASI SENTIMEN TERDETEKSI: ${sentimentHint}\n`;
    }

    if (customPrompt) {
      systemInstruction += `\n- ATURAN KHUSUS tambahan dari pengguna (Patuhi dengan mutlak): "${customPrompt}"\n`;
    }

    // Model map helper
    const mappedHistory = validMessages.map((m: any) => {
      const parts: any[] = [{ text: m.content || "" }];
      
      if (m.image && typeof m.image === "string") {
        const matches = m.image.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          parts.push({
            inlineData: {
              mimeType: matches[1],
              data: matches[2]
            }
          });
        }
      }

      if (m.images && Array.isArray(m.images)) {
        m.images.forEach((img) => {
          if (typeof img === "string") {
            const matches = img.match(/^data:([^;]+);base64,(.+)$/);
            if (matches) {
              parts.push({
                inlineData: {
                  mimeType: matches[1],
                  data: matches[2]
                }
              });
            }
          }
        });
      }

      if (m.audio && typeof m.audio === "string") {
        const matches = m.audio.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          parts.push({
            inlineData: {
              mimeType: matches[1],
              data: matches[2]
            }
          });
        }
      }

      return {
        role: m.role === "assistant" ? "model" : "user",
        parts,
      };
    });

    // Erase initial model message
    while (mappedHistory.length > 0 && mappedHistory[0].role === "model") {
      mappedHistory.shift();
    }

    // Compact consecutive roles
    const balancedHistory: any[] = [];
    for (const msg of mappedHistory) {
      if (balancedHistory.length === 0) {
        balancedHistory.push(msg);
      } else {
        const lastMsg = balancedHistory[balancedHistory.length - 1];
        if (lastMsg.role === msg.role) {
          lastMsg.parts = [...lastMsg.parts, ...msg.parts];
        } else {
          balancedHistory.push(msg);
        }
      }
    }

    if (balancedHistory.length === 0) {
      balancedHistory.push({
        role: "user",
        parts: [{ text: lastUserMessage ? lastUserMessage.content : "Halo Maria!" }]
      });
    }

    const modelsToTry = [
      "gemini-2.5-flash",
      "gemini-2.0-flash",
      "gemini-flash-latest",
      "gemini-pro-latest"
    ];
    let response = null;
    let fallbackUsed = "";
    let lastError: any = null;

    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    const tryGenerateWithRetry = async (
      modelName: string,
      contents: any,
      config: any,
      maxRetries = 2
    ) => {
      let tempError = null;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const res = await ai.models.generateContent({
            model: modelName,
            contents,
            config,
          });
          if (res && res.text) {
            return res;
          }
        } catch (err: any) {
          tempError = err;
          const errMsg = (err?.message || (typeof err === "string" ? err : JSON.stringify(err)) || "").toUpperCase();
          console.warn(`[Vercel Attempt ${attempt}/${maxRetries}] Model ${modelName} call failed:`, err?.message || err);
          
          const isOverloadedOrQuota = 
            errMsg.includes("503") || 
            errMsg.includes("UNAVAILABLE") || 
            errMsg.includes("429") || 
            errMsg.includes("RESOURCE_EXHAUSTED");
            
          if (isOverloadedOrQuota) {
            break; 
          }

          if (attempt < maxRetries) {
            await sleep(350 * attempt);
          }
        }
      }
      throw tempError;
    };

    for (const modelName of modelsToTry) {
      try {
        response = await tryGenerateWithRetry(
          modelName,
          balancedHistory,
          {
            systemInstruction,
            temperature: tone === "Creative" ? 1.0 : tone === "Minimalist" ? 0.35 : 0.7,
          },
          2
        );
        
        if (response && response.text) {
          fallbackUsed = modelName;
          break;
        }
      } catch (err: any) {
        lastError = err;
        const errMsg = (err?.message || (typeof err === "string" ? err : JSON.stringify(err)) || "").toUpperCase();
        const isOverloadedOrQuota = 
          errMsg.includes("503") || 
          errMsg.includes("UNAVAILABLE") || 
          errMsg.includes("429") || 
          errMsg.includes("RESOURCE_EXHAUSTED");

        if (isOverloadedOrQuota) {
          continue; 
        }
        
        await sleep(300);

        try {
          const singleShotPrompt = [
            {
              role: "user",
              parts: [{ text: lastUserMessage ? lastUserMessage.content : "Halo Maria!" }]
            }
          ];
          response = await tryGenerateWithRetry(
            modelName,
            singleShotPrompt,
            {
              systemInstruction: systemInstruction + "\n- CATATAN KHUSUS: Layanan memori penuh sedang dialihkan ke batas hemat memori cadangan.",
              temperature: tone === "Creative" ? 1.0 : tone === "Minimalist" ? 0.35 : 0.7,
            },
            2
          );
          
          if (response && response.text) {
            fallbackUsed = modelName + " (Single-Shot Dynamic Fallback)";
            break;
          }
        } catch (subErr: any) {
          lastError = subErr;
          await sleep(200);
        }
      }
    }

    if (!response) {
      const statusText = `⚠️ **Sistem Google Sedang Sangat Padat (Error 503 / 429)**\n\nMaaf sekali, Kak **${username}**. Layanan model asisten AI saat ini sedang mengalami lonjakan aktivitas atau pembatasan kuota sementara yang cukup padat secara global.\n\n**Beberapa langkah yang dapat Anda gunakan:**\n1. Klik kolom ketik pesan dan silakan kirim ulang pesan Kakak beberapa saat lagi.\n2. Coba persingkat pesan Kakak untuk mengurangi kapasitas token yang diproses.\n3. Maria akan secara otomatis normal kembali begitu lalu lintas jaringan stabil. Terima kasih banyak atas kesabaran luar biasa Kakak! ✨`;

      res.status(200).json({
        role: "assistant",
        content: statusText,
        timestamp: new Date().toISOString(),
        modelUsed: "System Graceful UI Recovery Handler",
        isRecoveredError: true
      });
      return;
    }

    const text = response.text || "Maaf, saya tidak dapat menghasilkan respon untuk saat ini.";

    res.status(200).json({
      role: "assistant",
      content: text,
      timestamp: new Date().toISOString(),
      modelUsed: fallbackUsed,
    });
  } catch (error: any) {
    console.error("General API Error in Vercel serverless /api/chat:", error);
    res.status(500).json({ error: "Terjadi kesalahan pada server", details: error.message });
  }
}
