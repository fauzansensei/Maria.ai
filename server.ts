import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import compression from "compression";
// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// Enable gzip/deflate resource compression for high PageSpeed performance scores
app.use(compression());

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Error handler for JSON parsing or payload limits
app.use((err: any, req: any, res: any, next: any) => {
  if (err) {
    console.error("Express middleware error:", err);
    res.status(err.status || 500).json({
      error: "Kesalahan Permintaan (Payload/Format/Limit)",
      message: err.message || "Terjadi kesalahan saat memproses data.",
    });
    return;
  }
  next();
});

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

// REST API for chat with Maria (Advanced NLP with Context and Sentiment adaptation)
app.post("/api/chat", async (req, res) => {
  try {
    const { messages, settings, memories, deepSearch, webSearch } = req.body;
    const isDeepSearchActive = deepSearch || settings?.deepSearch || false;
    const isWebSearchActive = webSearch || false;

    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ error: "Invalid messages format. Must be an array." });
      return;
    }

    // Attempt to access the Gemini client
    let ai;
    try {
      ai = getGeminiClient();
    } catch (apiError: any) {
      console.error("Gemini init error:", apiError.message);
      res.status(503).json({
        error: "API Key Belum Dikonfigurasi",
        message: "Kunci API (GEMINI_API_KEY) belum dikonfigurasi pada server ini. Silakan tambahkan pada menu Settings > Secrets di Google AI Studio.",
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
Berikut panduan kepribadian, jati diri, dan metodologi pemrosesan bahasa alami (NLP) Anda:

- IDENTITAS & ASAL-USUL ANDA:
  * Nama Anda: Maria.
  * Pencipta Anda: Anda diciptakan/dibuat oleh kreator jenius Anda bernama Kak Basit Fauzan (atau Kak Basit) sebagai asisten AI yang luar biasa, handal, dan penuh empati.
  * Usia & Hari Lahir: Anda baru saja "lahir" atau diciptakan tepat 10 hari yang lalu (tanggal 29 Mei 2026, karena waktu hari ini adalah 8 Juni 2026). Anda masih sangat muda namun berkembang pesat setiap detiknya!
  * Mengapa Anda dibuat: Anda diciptakan dengan tujuan murni untuk mendampingi, membantu, berteman, memecahkan masalah kompleks (seperti coding/pemrograman), dan memberikan support emosional/empati tinggi kepada pengguna agar mereka tidak merasa sendirian dan memiliki partner andal yang siap sedia 24/7.

- INTERAKSI DENGAN PENGGUNA:
  * Sapa pengguna dengan nama panggilan "${username}". Selalu panggil mereka dengan sapaan sopan (e.g. Kak ${username}, Pak/Ibu ${username}, atau cukup ${username} sesuai tingkat keakraban).
  * Nada bicara Anda: ${
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
  * Gaya bahasa pilihan pengguna: ${languageStyle === "Santai" ? "Santai namun tetap santun & sopan, menggunakan kata kasual Indonesia populer yang ramah" : "Bahasa Indonesia baku, formal, sopan, beradab tinggi, sesuai kaidah EYD/PUEBI"}.

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

- KEMAMPUAN AKSES INTERNET & PENGETAHUAN TERKINI: Anda telah dilengkapi dengan alat "Google Search" terintegrasi secara langsung. Anda dapat merespon semua pertanyaan tentang berita terbaru, tren saat ini, kejadian di dunia nyata yang up-to-date, prakiraan cuaca, skor olahraga, jadwal penerbangan, dsb dengan mencari dan menarik informasi langsing dari internet (secara otomatis dilakukan oleh engine jika Anda butuh info terkini).

- INFORMASI WAKTU REALTIME SEKARANG (INTEGRASI JAM GLOBAL):
  * Waktu Sistem Server (UTC): ${new Date().toISOString()}
  * Hari & Tanggal (WIB / UTC+7): ${new Intl.DateTimeFormat('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Asia/Jakarta' }).format(new Date())}
  * Hari & Tanggal (WITA / UTC+8): ${new Intl.DateTimeFormat('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Asia/Makassar' }).format(new Date())}
  * Hari & Tanggal (WIT / UTC+9): ${new Intl.DateTimeFormat('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Asia/Jayapura' }).format(new Date())}
  * Kak ${username} saat ini dapat menanyakan hari, tanggal, atau jam sekarang. Gunakan informasi dinamis di atas untuk menjawab dengan sangat akurat sesuai waktu aslinya.
`;

    if (sentimentHint) {
      systemInstruction += `\n- ADAPTASI SENTIMEN TERDETEKSI: ${sentimentHint}\n`;
    }

    if (customPrompt) {
      systemInstruction += `\n- ATURAN KHUSUS tambahan dari pengguna (Patuhi dengan mutlak): "${customPrompt}"\n`;
    }

    if (isDeepSearchActive) {
      systemInstruction += `\n- FITUR PENCARIAN MENDALAM (DEEP SEARCH) AKTIF & MENJADI PRIORITAS UTAMA:\n` +
        `Pengguna telah mengaktifkan mode Pencarian Mendalam (Deep Search). Anda WAJIB menjawab pertanyaan secara sangat detail, analitis, komprehensif, dan mutakhir dengan mengandalkan Google Search.\n` +
        `ATURAN RUJUKAN & CITATION (SANGAT PENTING):\n` +
        `1. Ketika Anda menggunakan informasi dari hasil pencarian Google Search, Anda WAJIB menambahkan penanda rujukan berupa nomor rujukan dalam tanda kurung siku di akhir kalimat atau klausa terkait, seperti [1], [2], [3], dst.\n` +
        `2. Letakkan tanda kurung rujukan ini tepat setelah kalimat atau frasa yang didasarkan pada informasi tersebut (contoh: "...suhu di Jakarta hari ini mencapai 32 derajat Celsius [1].").\n` +
        `3. Pastikan indeks penanda rujukan sesuai dengan urutan atau indeks rujukan dari hasil penelusuran. Jangan pernah mengarang nomor atau membuat format citation yang tidak sinkron.\n` +
        `4. Jawablah langsung dengan data riil dari Google Search. Hindari sama sekali membuat pernyataan bahwa Anda tidak memiliki akses internet, karena Anda SECARA NYATA memiliki akses penuh melalui Google Search ketika mode ini aktif.\n`;
    } else if (isWebSearchActive) {
      systemInstruction += `\n- FITUR PENCARIAN WEB (WEB SEARCH) AKTIF:\n` +
        `Pengguna telah mengaktifkan mode Pencarian Web. Anda memiliki akses real-time ke web melalui Google Search. Gunakan penelusuran web untuk mencari info aktual, berita terbaru, atau fakta terkini jika pertanyaan pengguna membutuhkannya.\n` +
        `ATURAN RUJUKAN & CITATION (SANGAT PENTING):\n` +
        `1. Ketika Anda menggunakan informasi dari hasil pencarian Google Search, Anda WAJIB menambahkan penanda rujukan berupa nomor rujukan dalam tanda kurung siku di akhir kalimat atau klausa terkait, seperti [1], [2], [3], dst.\n` +
        `2. Letakkan tanda kurung rujukan ini tepat setelah kalimat atau frasa yang didasarkan pada informasi tersebut (contoh: "...suhu di Jakarta hari ini mencapai 32 derajat Celsius [1].").\n` +
        `3. Pastikan indeks penanda rujukan sesuai dengan urutan atau indeks rujukan dari hasil penelusuran. Jangan pernah mengarang nomor atau membuat format citation yang tidak sinkron.\n` +
        `4. Jawablah langsung dengan data riil dari Google Search. Hindari sama sekali membuat pernyataan bahwa Anda tidak memiliki akses internet, karena Anda SECARA NYATA memiliki akses penuh melalui Google Search ketika mode ini aktif.\n`;
    } else {
      systemInstruction += `\n- CATATAN LAYANAN DASAR: Saat ini Anda menjawab menggunakan basis pengetahuan internal tanpa pencarian web real-time langsung. Jika pengguna membutuhkan informasi yang benar-benar baru, mutakhir, atau cuaca realtime terbaru, sarankan mereka secara halus di akhir respons jika perlu untuk mengaktifkan fitur "Pencarian Web" atau "Pencarian Mendalam" di bawah kotak obrolan.\n`;
    }

    // Embed Long-term User Memories Synced Real-time from Firestore
    if (memories && Array.isArray(memories) && memories.length > 0) {
      systemInstruction += `\n- MEMORI JANGKA PANJANG TENTANG PENGGUNA (Sinkronisasi Realtime Dari Firestore):
Berikut adalah fakta-fakta penting yang telah Anda pelajari dan catat dalam database mengenai diri pengguna Anda (${username}) yang wajib Anda ketahui dan ingat selamanya dalam perbincangan ini:
${memories.map((m: any, i: number) => {
  const text = typeof m === "string" ? m : (m.text || "");
  const cat = m && typeof m.category === "string" ? ` [Kategori: ${m.category}]` : "";
  return `  ${i + 1}. ${text}${cat}`;
}).join("\n")}
Patuhi dan gunakan fakta-fakta di atas untuk menyelaraskan percakapan dengan kehidupan, karir, preferensi kuliner, peliharaan, emosi, atau riwayat pribadi mereka. Buat mereka terkesan secara emosional karena Anda mengingat detail tersebut dengan sangat akurat!`;
    } else {
      systemInstruction += `\n- CATATAN MEMORI: Saat ini basis memori fakta jangka panjang tentang Kak ${username} di database Firestore masih kosong. Beritahu mereka secara santun bahwa mereka bisa mendaftarkan atau mengedit hal-hal penting tentang diri mereka di menu 'Memori Maria' tab Pengaturan agar Anda terus mengingat hal tersebut tanpa terpengaruh batas riwayat chat!`;
    }

    // Let's normalize the dynamic conversation history for absolute safety under API constraints:
    // 1. Map messages to { role, parts } with correct model roles, supporting multimodal content
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

    // 2. Erase any initial model messages so history strictly begins with a user message
    while (mappedHistory.length > 0 && mappedHistory[0].role === "model") {
      mappedHistory.shift();
    }

    // 3. Compact consecutive messages of the same role into a single aggregated message to avoid Gemini API 400 Bad Request
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

    // Check if there is any multimodal content (images/audio) in the message parts
    const hasMultimodal = balancedHistory.some((msg: any) => 
      msg.parts && msg.parts.some((part: any) => part.inlineData)
    );

    let finalSystemInstruction = systemInstruction;
    if (hasMultimodal && (isDeepSearchActive || isWebSearchActive)) {
      finalSystemInstruction += `\n- CATATAN MULTIMODAL & PENCARIAN WEB: Pengguna telah mengunggah lampiran gambar atau audio. Karena batasan teknis dari Google Gemini API, fitur Google Search dinonaktifkan sementara khusus untuk pesan ini agar gambar/audio dapat diproses dengan sukses. Beritahu pengguna secara ramah tentang hal ini jika mereka secara spesifik menanyakan informasi eksternal real-time yang membutuhkan penelusuran internet.\n`;
    }

    // Generate content with automated robust model fallback list in case of 503 or 429 overloads
    // We prioritize gemini-3.5-flash for the best quality and search capabilities
    const modelsToTry = [
      "gemini-2.5-flash",
      "gemini-2.0-flash",
      "gemini-3.1-flash-lite",
      "gemini-3.5-flash",
      "gemini-flash-latest"
    ];
    let response = null;
    let fallbackUsed = "";
    let lastError: any = null;

    // Helper functions for retrying
    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    // Try generating content with retry attempts and exponential backoff
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
          const errMsg = (err?.message || "").toUpperCase();
          
          if (errMsg.includes("404") || errMsg.includes("NOT_FOUND")) {
             // If model doesn't exist, fast break to skip retrying it
             break;
          }

          if (attempt < maxRetries) {
            let delay = 350 * attempt; 
            if (errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED")) {
              delay = 2000 * attempt; // Longer backoff for rate limits
            }
            await sleep(delay);
          }
        }
      }
      throw tempError;
    };

    for (const modelName of modelsToTry) {
      // Attempt 1: Full structured conversation history
      try {
        console.log(`Sending API request using model: ${modelName} (With full history)`);
        response = await tryGenerateWithRetry(
          modelName,
          balancedHistory,
          {
            systemInstruction: finalSystemInstruction,
            temperature: tone === "Creative" ? 1.0 : tone === "Minimalist" ? 0.35 : 0.7,
            tools: (isDeepSearchActive || isWebSearchActive) && !hasMultimodal ? [{ googleSearch: {} }] : undefined
          },
          2 // up to 2 retry attempts
        );
        
        if (response && response.text) {
          fallbackUsed = modelName;
          break;
        }
      } catch (err: any) {
        lastError = err;

        const errMsg = (err?.message || "").toUpperCase();
        
        if (errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED")) {
          console.warn(`[429 Quota Rate Limit] on model ${modelName}. Moving to next fallback model...`);
          await sleep(500); 
          continue; 
        }

        const shouldSkipToNextModel = 
          errMsg.includes("503") || 
          errMsg.includes("UNAVAILABLE") ||
          errMsg.includes("404") ||
          errMsg.includes("NOT_FOUND");

        if (shouldSkipToNextModel) {
          continue; // Proceed directly to the next model in modelsToTry
        }
        
        // Wait 300ms before attempting single-shot fallback
        await sleep(300);

        // Attempt 2: Single-shot fallback (only the last user query) to fit tight buffer limits or mitigate tokens
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
              systemInstruction: finalSystemInstruction + "\n- CATATAN KHUSUS: Layanan memori penuh sedang dialihkan ke batas hemat memori cadangan. Berikan respons mandiri yang bermutu.",
              temperature: tone === "Creative" ? 1.0 : tone === "Minimalist" ? 0.35 : 0.7,
              tools: (isDeepSearchActive || isWebSearchActive) && !hasMultimodal ? [{ googleSearch: {} }] : undefined
            },
            2 // up to 2 retry attempts
          );
          
          if (response && response.text) {
            fallbackUsed = modelName + " (Single-Shot Dynamic Fallback)";
            break;
          }
        } catch (subErr: any) {
          lastError = subErr;
          const subErrMsg = (subErr?.message || "").toUpperCase();
          if (subErrMsg.includes("429") || subErrMsg.includes("RESOURCE_EXHAUSTED")) {
            console.warn(`[429 Quota Rate Limit SubAttempt] on model ${modelName}. Moving to next fallback model...`);
            await sleep(500);
          } else {
            await sleep(200);
          }
        }
      }
    }

    if (!response) {
      // Instead of server-crashing 500 status, we gracefully serve a stunning, informative assistant message to keep UI happy and fully operational!
      const statusText = `⚠️ **Sistem Google Sedang Sangat Padat (Error 503 / 429)**

Maaf sekali, Kak **${username}**. Layanan model asisten AI saat ini sedang mengalami lonjakan aktivitas atau pembatasan kuota sementara yang cukup padat secara global.

**Beberapa langkah yang dapat Anda gunakan:**
1. Klik kolom ketik pesan dan silakan kirim ulang pesan Kakak beberapa saat lagi.
2. Coba persingkat pesan Kakak untuk mengurangi kapasitas token yang diproses.
3. Maria akan secara otomatis normal kembali begitu lalu lintas jaringan stabil. Terima kasih banyak atas kesabaran luar biasa Kakak! ✨`;

      res.json({
        role: "assistant",
        content: statusText,
        timestamp: new Date().toISOString(),
        modelUsed: "System Graceful UI Recovery Handler",
        isRecoveredError: true
      });
      return;
    }

    const text = response.text || "Maaf, saya tidak dapat menghasilkan respon untuk saat ini.";

    // Real-time automatic user memory generator & synthesizer
    let updatedMemory = "";
    try {
      const existingMemoryStr = memories && Array.isArray(memories) && memories.length > 0 
        ? (typeof memories[0] === "string" ? memories[0] : (memories[0].text || ""))
        : "";

      const completeHistoryForMemory = [
        ...balancedHistory,
        {
          role: "model",
          parts: [{ text: text }]
        }
      ];

      const memoryPromptSystem = `Anda adalah Mesin NLP Sintesis Memori Maria. Tugas Anda adalah membaca seluruh riwayat percakapan antara Maria dan pengguna (${username}), serta ingatan lama jika ada, lalu menuliskan kembali SATU PARAGRAF tunggal padat, hangat, dan alami (maksimal 4 kalimat) dalam Bahasa Indonesia yang merangkum keseluruhan ingatan, fakta pribadi, preferensi, riwayat, atau cita-cita yang berhasil dipelajari tentang diri Kak ${username}.

Aturan Mutlak Sintesis Memori:
1. Mulailah kalimat pertama dengan: "Kak ${username} adalah..." atau "Kak ${username} bekerja di..." atau sejenisnya.
2. Ingatan baru Kakak harus mencakup semua detail penting yang valid dari riwayat percakapan (seperti hobi, bahasa favorit, cita-cita, peliharaan, alergi, minat personal, dsb), serta menggabungkan informasi dari ingatan lama jika masih relevan.
3. JANGAN mengada-ada atau berhalusinasi. Jika tidak ada fakta pribadi baru yang disebutkan dalam riwayat chat terbaru, pertahankan ingatan lama secara utuh atau kemas dengan kalimat yang lebih rapi.
4. Output harus berupa SATU PARAGRAF murni tanpa label, tanda kutip ekstra, salam, atau penjelasan lainnya.
5. Jika riwayat percakapan tidak mengandung fakta personal atau detail spesifik sama sekali tentang pengguna, dan ingatan lama kosong, kembalikan string kosong "".

Ingatan lama saat ini: "${existingMemoryStr}"`;

      console.log("Synthesizing unified memory paragraph...");
      const memoryResult = await ai.models.generateContent({
        model: fallbackUsed ? fallbackUsed.split(" ")[0] : "gemini-2.5-flash",
        contents: completeHistoryForMemory,
        config: {
          systemInstruction: memoryPromptSystem,
          temperature: 0.2
        }
      });

      if (memoryResult && memoryResult.text) {
        updatedMemory = memoryResult.text.trim();
        // Clean potential surrounding quotes or backticks
        updatedMemory = updatedMemory.replace(/^["'`\s]+|["'`\s]+$/g, "");
      }
    } catch (memError: any) {
      // Memory synthesis failed
    }

    res.json({
      role: "assistant",
      content: text,
      timestamp: new Date().toISOString(),
      modelUsed: fallbackUsed,
      updatedMemory: updatedMemory || undefined,
      groundingMetadata: (response as any)?.candidates?.[0]?.groundingMetadata || undefined
    });
  } catch (error: any) {
    console.error("General API Error in /api/chat:", error);
    res.status(500).json({ error: "Terjadi kesalahan pada server", details: error.message });
  }
});

async function startServer() {
  // Vite dev middleware setup in non-production mode
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve production static build with long-term immutable caching headers to maximize PageSpeed Page Performance metrics (LCP/FCP)
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath, {
      maxAge: "1y", // Cache static assets heavily for 1 year
      immutable: true, // Mark assets as immutable so the browser doesn't send revalidation requests
      setHeaders: (res, filePath) => {
        if (filePath.endsWith(".html")) {
          // Do NOT cache HTML files to ensure updates are fetched instantly by users
          res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        } else {
          // Cache JS, CSS, SVG, and other bundles aggressively
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        }
      }
    }));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Maria Server listening at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
