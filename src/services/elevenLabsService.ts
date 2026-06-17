export interface ElevenLabsVoice {
  id: string;
  name: string;
  description: string;
  gender: "female" | "male";
}

export const PRESET_VOICES: ElevenLabsVoice[] = [
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Maria-ai (Bella)", description: "Suara wanita lembut, ramah, dan bersahabat.", gender: "female" },
  { id: "21m05zct5ul7625L108I", name: "Rachel (Sweet)", description: "Suara wanita manis, tenang, cocok untuk asisten hangat.", gender: "female" },
  { id: "piTKgcLEGmPEe24W6339", name: "Nicole (Whisper)", description: "Suara wanita tenang, berbisik, cocok untuk meditasi.", gender: "female" },
  { id: "29vD33N1CtxCmqQRPOHJ", name: "Drew (News)", description: "Suara pria profesional cocok untuk berita atau diskusi teknis.", gender: "male" },
  { id: "2E2iSbh2p4BxXA391s8U", name: "Clyde (Calm)", description: "Suara pria matang, berwibawa, dan tenang.", gender: "male" },
  { id: "custom", name: "Kustom Voice ID...", description: "Masukkan Voice ID tersendiri lewat kolom di bawah.", gender: "female" }
];

export interface ElevenLabsModel {
  id: string;
  name: string;
  description: string;
  specs: string;
}

export const PRESET_MODELS: ElevenLabsModel[] = [
  { id: "eleven_flash_v2_5", name: "Eleven Flash v2.5", description: "Kecepatan ultra tinggi, respons instan & biaya hemat.", specs: "Ultra Low Latency" },
  { id: "eleven_multilingual_v2", name: "Eleven Multilingual v2", description: "Kualitas audio paling alami dengan dukungan emosi mendalam.", specs: "High Quality" },
  { id: "eleven_turbo_v2_5", name: "Eleven Turbo v2.5", description: "Sangat responsif dengan stabilitas rendering audio sangat baik.", specs: "Balanced" }
];

let currentAudioElement: HTMLAudioElement | null = null;

export function stopSpeech() {
  if (currentAudioElement) {
    currentAudioElement.pause();
    currentAudioElement = null;
  }
}

export async function generateSpeech(
  text: string, 
  apiKey: string, 
  voiceId: string = "EXAVITQu4vr4xnSDxMaL", 
  modelId: string = "eleven_flash_v2_5"
): Promise<Blob> {
  const finalVoiceId = voiceId === "custom" || !voiceId ? "EXAVITQu4vr4xnSDxMaL" : voiceId;
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${finalVoiceId}`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      "accept": "audio/mpeg"
    },
    body: JSON.stringify({
      text,
      model_id: modelId || "eleven_flash_v2_5",
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75
      }
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errText || "Gagal menghubungi ElevenLabs"}`);
  }

  return await response.blob();
}

export async function playAudioBlob(blob: Blob): Promise<void> {
  stopSpeech();
  return new Promise((resolve, reject) => {
    try {
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      currentAudioElement = audio;
      
      audio.onended = () => {
        URL.revokeObjectURL(url);
        if (currentAudioElement === audio) {
          currentAudioElement = null;
        }
        resolve();
      };
      
      audio.onerror = (e) => {
        URL.revokeObjectURL(url);
        if (currentAudioElement === audio) {
          currentAudioElement = null;
        }
        reject(e);
      };
      
      audio.play().catch(reject);
    } catch (err) {
      reject(err);
    }
  });
}
