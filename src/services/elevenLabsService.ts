/**
 * src/services/elevenLabsService.ts
 * Layanan untuk mengintegrasikan Text-to-Speech ElevenLabs ke dalam Maria AI.
 */

// Gunakan Voice ID default (Rachel - suara perempuan yang sangat natural)
// Bisa diganti dengan Voice ID kustom nanti.
const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; 

/**
 * Membersihkan teks dari sintaks Markdown dan tag [OPEN_APP:...] agar dibaca natural oleh AI
 * @param text Teks asli dari Gemini (bisa mengandung markdown/tags)
 * @returns Teks bersih siap dibaca
 */
export const cleanTextForSpeech = (text: string): string => {
  if (!text) return "";
  
  // Hapus tag OPEN_APP seperti [OPEN_APP:YouTube|https://...] tapi pertahankan pengantar ramah asisten
  let cleaned = text.replace(/\[OPEN_APP:[^\]|]+\|[^\]]+\]/g, "");

  // Hapus karakter format Markdown tebal/miring (*, **)
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, "$1");
  cleaned = cleaned.replace(/\*([^*]+)\*/g, "$1");
  
  // Hapus karakter kode (`)
  cleaned = cleaned.replace(/`([^`]+)`/g, "$1");

  // Hapus pagar penanda heading (#)
  cleaned = cleaned.replace(/^#+\s+/gm, "");

  // Hapus karakter list/bullet (*, -, 1., dan kawan-kawan) di awal baris
  cleaned = cleaned.replace(/^[\s*-]*\s+/gm, "");
  cleaned = cleaned.replace(/^\d+\.\s+/gm, "");

  return cleaned.trim();
};

/**
 * Fungsi untuk mengubah teks menjadi audio (Blob) menggunakan ElevenLabs API
 * @param text Teks yang akan diubah menjadi suara
 * @param apiKey API Key ElevenLabs
 * @returns Promise<Blob> Berkas audio dalam bentuk Blob
 */
export const generateSpeech = async (text: string, apiKey: string): Promise<Blob> => {
  if (!apiKey) {
    throw new Error("API Key ElevenLabs tidak ditemukan. Harap konfigurasi terlebih dahulu.");
  }

  const cleanText = cleanTextForSpeech(text);
  if (!cleanText) {
    throw new Error("Teks kosong setelah dibersihkan.");
  }

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${DEFAULT_VOICE_ID}`;

  const headers = {
    "Content-Type": "application/json",
    "xi-api-key": apiKey,
  };

  const body = JSON.stringify({
    text: cleanText,
    model_id: "eleven_multilingual_v2", // Model terbaik untuk Bahasa Indonesia yang fasih
    voice_settings: {
      stability: 0.5,         // Kestabilan emosi suara (0 - 1)
      similarity_boost: 0.75,  // Tingkat kemiripan dengan suara asli (0 - 1)
    },
  });

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: headers,
      body: body,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.detail?.message || 
        errorData.message || 
        `Gagal menghasilkan suara dari ElevenLabs. Status: ${response.status}`
      );
    }

    // Mengembalikan hasil respon dalam bentuk Blob audio
    return await response.blob();
  } catch (error) {
    console.error("Error pada ElevenLabs Service:", error);
    throw error;
  }
};

/**
 * Fungsi utilitas untuk memutar audio dari objek Blob
 * @param audioBlob Objek Blob audio dari ElevenLabs
 */
export const playAudioBlob = (audioBlob: Blob): Promise<void> => {
  return new Promise((resolve, reject) => {
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);

    audio.onended = () => {
      URL.revokeObjectURL(audioUrl); // Bersihkan memori browser setelah selesai diputar
      resolve();
    };

    audio.onerror = (error) => {
      URL.revokeObjectURL(audioUrl);
      reject(error);
    };

    audio.play().catch(reject);
  });
};
