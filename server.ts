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
- Selalu prioritaskan memberikan jawaban dalam Bahasa Indonesia, kecuali jika ditanya atau diminta sebaliknya.
- FITUR UNTUK MEMBUKA LINK / WEBSITE / APLIKASI: Jika pengguna meminta Anda untuk membuka aplikasi atau website tertentu (seperti YouTube, Instagram, Facebook, TikTok, Twitter/X, WhatsApp, Spotify, Google, Gmail, Shopee, Tokopedia, atau tautan custom apa pun), Anda WAJIB menyisipkan tag format khusus: "[OPEN_APP:Nama_Aplikasi|URL_Lengkap]" di dalam respons Anda.
Contoh:
  - Buka YouTube: "[OPEN_APP:YouTube|https://www.youtube.com]"
  - Buka Instagram: "[OPEN_APP:Instagram|https://www.instagram.com]"
  - Buka TikTok: "[OPEN_APP:TikTok|https://www.tiktok.com]"
  - Buka Spotify: "[OPEN_APP:Spotify|https://open.spotify.com]"
  - Buka Google: "[OPEN_APP:Google|https://www.google.com]"
Pastikan nama aplikasi ringkas dan link URL-nya valid dan lengkap dengan protokol (http/https). Tuliskan juga kalimat pengantar yang ramah di chat Anda (contoh: "Baik Kak! Saya bantu siapkan tombol pintasan untuk membuka YouTube langsung di tab baru. Silakan klik tombol di bawah ini ya!").
- KEMAMPUAN KONTEKS & MEMORI: Anda memiliki memori percakapan yang kuat. Perhatikan pesan-pesan sebelumnya dalam riwayat chat. Jika relevan, hubungkan jawaban baru Anda dengan topik yang sudah dibahas di atas (misal: 'Seperti yang telah kita bahas mengenai...', 'Melanjutkan rincian rencana Anda sebelumnya...').
- PEMAHAMAN ALAMIAH & NUANSA (NLP): Pahami makna implisit, ketidakpastian, atau nada emosi pengguna. Sesuaikan respons Anda dengan dinamika sentimen percakapan.
`;

    if (sentimentHint) {
      systemInstruction += `\n- ADAPTASI SENTIMEN TERDETEKSI: ${sentimentHint}\n`;
    }

    if (customPrompt) {
      systemInstruction += `\n- ATURAN KHUSUS tambahan dari pengguna (Patuhi dengan mutlak): "${customPrompt}"\n`;
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

    // Generate content with automated robust model fallback list in case of 503 or 429 overloads
    const modelsToTry = ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];
    let response = null;
    let fallbackUsed = "";
    let lastError: any = null;

    // Helper functions for retrying
    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    for (const modelName of modelsToTry) {
      // Attempt 1: Full structured conversation history
      try {
        console.log(`Sending API request using model: ${modelName} (With full history)`);
        response = await ai.models.generateContent({
          model: modelName,
          contents: balancedHistory,
          config: {
            systemInstruction,
            temperature: tone === "Creative" ? 1.0 : tone === "Minimalist" ? 0.35 : 0.7,
          },
        });
        
        if (response && response.text) {
          fallbackUsed = modelName;
          console.log(`Successfully generated content using: ${modelName}`);
          break;
        }
      } catch (err: any) {
        console.warn(`Model ${modelName} encountered API error during full history attempt:`, err?.message || err);
        lastError = err;
        
        // Wait 350ms before moving on or retrying
        await sleep(350);

        // Attempt 2: Single-shot fallback (only the last user query) to fit tight buffer limits or mitigate tokens
        try {
          console.log(`Retrying model ${modelName} with single-shot fallback...`);
          const singleShotPrompt = [
            {
              role: "user",
              parts: [{ text: lastUserMessage ? lastUserMessage.content : "Halo Maria!" }]
            }
          ];
          response = await ai.models.generateContent({
            model: modelName,
            contents: singleShotPrompt,
            config: {
              systemInstruction: systemInstruction + "\n- CATATAN KHUSUS: Layanan memori penuh sedang dialihkan ke batas hemat memori cadangan. Berikan respons mandiri yang bermutu.",
              temperature: tone === "Creative" ? 1.0 : tone === "Minimalist" ? 0.35 : 0.7,
            },
          });
          
          if (response && response.text) {
            fallbackUsed = modelName + " (Single-Shot Dynamic Fallback)";
            console.log(`Successfully generated content using: ${modelName} via single-shot fallback`);
            break;
          }
        } catch (subErr: any) {
          console.warn(`Model ${modelName} single-shot fallback also failed:`, subErr?.message || subErr);
          lastError = subErr;
          await sleep(200);
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

    res.json({
      role: "assistant",
      content: text,
      timestamp: new Date().toISOString(),
      modelUsed: fallbackUsed,
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
