import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize Gemini with server-side key
  const genAI = new GoogleGenAI({ 
    apiKey: process.env.GEMINI_API_KEY || '',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  app.use(express.json({ limit: '20mb' }));

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/maria", async (req, res) => {
    try {
      const { contents, systemInstruction, temperature, topP, customApiKey } = req.body;

      let ai = genAI;
      if (customApiKey) {
        ai = new GoogleGenAI({ apiKey: customApiKey });
      }

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents,
        config: {
          systemInstruction,
          temperature: temperature || 0.7,
          topP: topP || 0.9,
          tools: [{ googleSearch: {} }],
        }
      });

      res.json({ 
        text: response.text,
        groundingMetadata: response.candidates?.[0]?.groundingMetadata 
      });
    } catch (error: any) {
      console.error("Maria Server API Error:", error);
      
      const isQuotaError = error.status === 429 || 
                          error.message?.toLowerCase().includes("429") || 
                          error.message?.toLowerCase().includes("quota") ||
                          error.message?.toLowerCase().includes("resource_exhausted") ||
                          error.status === "RESOURCE_EXHAUSTED";

      if (isQuotaError) {
        return res.status(429).json({
          error: "Kuota API Gemini telah habis. Silakan coba lagi nanti atau hubungkan kunci API berbayar di Settings.",
          status: "RESOURCE_EXHAUSTED"
        });
      }

      res.status(500).json({ 
        error: error.message || "Internal Server Error",
        status: error.status || "UNKNOWN"
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
