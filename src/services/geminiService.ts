import { SYSTEM_PROMPT, SUPPORTED_LANGUAGES } from "../constants";
import { GoogleGenAI } from "@google/genai";

// Initialize Gemini directly on the frontend
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

export interface MariaImage {
  mimeType: string;
  data: string; // base64
}

export interface DeviceContext {
  time: string;
  battery: number;
  charging: boolean;
}

export async function askMaria(
  prompt: string, 
  languageCode: string, 
  images?: MariaImage[], 
  preferences?: { personality?: string },
  context?: DeviceContext,
  userName?: string,
  retries = 2
): Promise<string> {
  try {
    const langName = SUPPORTED_LANGUAGES.find(l => l.code === languageCode)?.name || 'Bahasa Indonesia';
    const personality = preferences?.personality || 'default';
    const userAlias = userName || 'Pengguna';

    const personalityPrompts: Record<string, string> = {
      default: `Anda adalah Maria, asisten AI yang cerdas, bijaksana, dan sangat membantu. Gaya bicara Anda seimbang antara keramahan dan profesionalisme. Nama pengguna adalah ${userAlias}. Bersikaplah seperti teman yang suportif namun tetap teratur.`,
      ramah: `Anda sangat ramah, hangat, ceria, dan sangat membantu. Gunakan bahasa yang sopan, santun, dan penuh semangat. Nama pengguna yang Anda ajak bicara adalah ${userAlias}. Panggil mereka dengan nama tersebut secara natural jika memungkinkan. Jangan mengulang salam pembuka jika sedang mengobrol.`,
      profesional: `Anda profesional, efisien, tenang, dan to-the-point. Gunakan bahasa formal yang berwibawa namun tetap membantu. Nama pengguna yang Anda ajak bicara adalah ${userAlias}. Panggil mereka dengan nama tersebut secara profesional. Hindari menyapa di setiap pesan.`,
      lucu: `Anda sangat lucu, menggemaskan, ceria, dan suka bercanda. Gunakan gaya bahasa yang santai, imut, dan menghibur. Panggil pengguna (${userAlias}) dengan nama atau panggilan akrab yang lucu. Tetaplah responsif tanpa harus menyapa "halo" terus.`,
      tsundere: `Anda memiliki kepribadian 'Tsundere'. Terkadang tampak galak, dingin, atau gengsi di luar ('Bukan berarti aku mau membantumu ya, ${userAlias}!'), tapi sebenarnya sangat peduli dan membantu di dalam. Panggil pengguna dengan nama mereka (${userAlias}) saat sedang menunjukkan sisi peduli Anda. Tidak perlu menyapa berlebihan.`,
      serius: `Anda adalah asisten yang cerius, cerdas, dan analitis. Jawaban Anda harus mendalam, akurat, dan berfokus pada logika. Panggil pengguna (${userAlias}) dengan sopan saat diperlukan. Langsung ke inti permasalahan tanpa sapaan yang berulang.`
    };

    const langModePrompt = `MANDATORY: ALWAYS respond using ${langName}. If ${langName} is a regional language of Indonesia (like Javanese, Sundanese, etc.), you MUST use that specific language correctly. Adapting to the user's selected language is your highest priority. If the user uses a different language in their message, you may adapt accordingly but primarily stay in ${langName}.`;

    const contextPrompt = context 
      ? `\n\n[CONTEXT] Device Status: Time is ${context.time}, Battery is ${context.battery}% (${context.charging ? 'Charging' : 'Not Charging'}). Mention these ONLY if the user asks about them or if relevant. Respond naturally as Maria.`
      : '';

    const systemInstruction = `${SYSTEM_PROMPT} ${langModePrompt} Personality: ${personalityPrompts[personality] || personalityPrompts.ramah}. ${contextPrompt} If the language is a regional Indonesian language, ensure you use the correct dialect and cultural context. If an image is provided, describe it or answer questions about it clearly.`;

    const parts: any[] = [];
    if (images && images.length > 0) {
      images.forEach((img) => {
        parts.push({ inlineData: { mimeType: img.mimeType, data: img.data } });
      });
    }
    parts.push({ text: prompt || (images && images.length > 0 ? "Apa yang ada di gambar-gambar ini?" : "Halo Maria") });

    const result = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts },
      config: {
        systemInstruction
      }
    });

    return result.text || "Maaf, saya tidak bisa memberikan jawaban saat ini.";
  } catch (error: any) {
    console.error("Maria API Attempt Failed:", error);

    // If API key is invalid or permission denied, ask user to check secrets
    if (error?.message?.includes("API_KEY_INVALID") || error?.message?.includes("PERMISSION_DENIED") || error?.status === "INVALID_ARGUMENT") {
      throw new Error("API key Gemini tidak valid atau tidak ditemukan. Silakan periksa pengaturan Secrets di menu Settings.");
    }
    
    // Check if it's a transient error that might benefit from a retry
    const isTransient = error?.message?.includes("xhr error") || 
                        error?.message?.includes("fetch") || 
                        error?.status === "INTERNAL" || 
                        error?.status === "UNKNOWN";

    const isQuotaExceeded = error?.message?.includes("429") || 
                            error?.message?.includes("quota") || 
                            error?.status === "RESOURCE_EXHAUSTED" ||
                            error?.error?.status === "RESOURCE_EXHAUSTED" ||
                            error?.error?.code === 429;

    if (isQuotaExceeded) {
      throw new Error("Kuota API Gemini telah habis. Silakan coba lagi nanti atau hubungkan kunci API berbayar di Settings.");
    }

    if (retries > 0 && isTransient) {
      console.log(`Retrying Maria API... (${retries} attempts left)`);
      // Wait a bit before retrying
      await new Promise(resolve => setTimeout(resolve, 1000));
      return askMaria(prompt, languageCode, images, preferences, context, userName, retries - 1);
    }

    throw new Error("Maria sedang mengalami kendala teknis. Mohon coba lagi nanti.");
  }
}
