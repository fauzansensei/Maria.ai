import React, { useState, useEffect } from "react";
import { UserSettings, MariaTone, LanguageStyle, AppTheme } from "../types";
import { THEME_OPTIONS } from "../constants";
import { safeLocalStorageSetItem } from "../utils";
import { 
  Settings, 
  Bell, 
  Sliders, 
  LayoutGrid, 
  CreditCard, 
  Database,
  X, 
  Play, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  Info,
  ExternalLink,
  Volume2,
  Trash2,
  Mail,
  Sparkles
} from "lucide-react";

interface VoiceOption {
  value: string;
  label: string;
  category: "anime" | "non-anime";
  desc: string;
}

export const VOICE_OPTIONS: VoiceOption[] = [
  { value: "Maria", label: "Maria 🎀", category: "anime", desc: "Signature (Karakter Maria)" },
  { value: "Sarah", label: "Sarah 🍃", category: "anime", desc: "Karakter Sarah" },
  { value: "Jack", label: "Jack (Jeck) 🎙️", category: "non-anime", desc: "Karakter Jack" }
];

export const daftarSuara = {
  Jack: "/audio/NoteJack_Speech_1780061685696.mp3",
  Maria: "/audio/NoteMaria_Speech_1780061670457.mp3",
  Sarah: "/audio/NoteSarah_Speech_1780062141697.mp3"
};

interface SettingsDashboardProps {
  settings: UserSettings;
  onSaveSettings: (settings: UserSettings) => void;
  onClearHistory: () => void;
  messageCount: number;
  onClose?: () => void;
  onAddSystemNotification?: (title: string, body: string, type: "info" | "success" | "reminder" | "message") => void;
  onSimulateEmail?: (subject: string, body: string, category: string) => void;
  onSimulatePush?: (title: string, body: string) => void;
}

type MenuTab = "umum" | "notifikasi" | "personalisasi" | "aplikasi" | "tagihan" | "kontrol-data";

export default function SettingsDashboard({
  settings,
  onSaveSettings,
  onClearHistory,
  messageCount,
  onClose,
  onAddSystemNotification,
  onSimulateEmail,
  onSimulatePush
}: SettingsDashboardProps) {
  const [activeTab, setActiveTab] = useState<MenuTab>("umum");

  // Load and synchronize states with memory defaults
  const [appearance, setAppearance] = useState("Gelap");
  const [contrast, setContrast] = useState("Sistem");
  const [accentColor, setAccentColor] = useState("Biru");
  const [language, setLanguage] = useState("Deteksi otomatis");
  const [dictationEnabled, setDictationEnabled] = useState(true);
  const [spokenLanguage, setSpokenLanguage] = useState("Deteksi otomatis");
  const [voiceVoice, setVoiceVoice] = useState("Maria");
  const [voiceStreamSplit, setVoiceStreamSplit] = useState(false);

  // Smart Notification System states
  const [remindersNotif, setRemindersNotif] = useState<string[]>(["In-App", "Push"]);
  const [updatesNotif, setUpdatesNotif] = useState<string[]>(["In-App", "Email"]);
  const [suggestionsNotif, setSuggestionsNotif] = useState<string[]>(["In-App"]);

  // Personalization & Tone Characteristics
  const [basicToneStyle, setBasicToneStyle] = useState<MariaTone>(settings.tone || "Professional");
  const [charWarm, setCharWarm] = useState("Default");
  const [charEnthusiastic, setCharEnthusiastic] = useState("Default");
  const [charList, setCharList] = useState("Default");
  const [charEmoji, setCharEmoji] = useState("Default");
  const [quickAnswers, setQuickAnswers] = useState(true);
  const [customInstructions, setCustomInstructions] = useState(settings.customPrompt || "");
  const [userNickname, setUserNickname] = useState(settings.username || "Pengguna");
  const [userJob, setUserJob] = useState("Designer Interior");
  const [userBio, setUserBio] = useState("Minat, nilai, atau preferensi yang perlu diingat");
  const [memSave, setMemSave] = useState(true);
  const [memRef, setMemRef] = useState(true);

  // Advanced collapsible customization triggers
  const [isAdvancedExpanded, setIsAdvancedExpanded] = useState(true);
  const [advWeb, setAdvWeb] = useState(true);
  const [advCanvas, setAdvCanvas] = useState(true);
  const [advVoiceChat, setAdvVoiceChat] = useState(true);
  const [advSmartVoice, setAdvSmartVoice] = useState(true);
  const [advConnector, setAdvConnector] = useState(true);

  // Controls for interactive drop downs
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);

  // Sound play triggered audio synthesis
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Safe voice synthesis active browser engine tracker
  const [activeEngineName, setActiveEngineName] = useState<string>("");

  const currentAudioRef = React.useRef<HTMLAudioElement | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
    };
  }, []);

  const putarSuaraKarakter = (namaKarakter: string) => {
    const fileAudio = daftarSuara[namaKarakter as keyof typeof daftarSuara];

    if (fileAudio) {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
      }

      setIsPlayingAudio(true);
      const audio = new Audio(fileAudio);
      currentAudioRef.current = audio;

      audio.onended = () => {
        setIsPlayingAudio(false);
      };

      audio.onerror = () => {
        setIsPlayingAudio(false);
      };

      audio.play().catch(error => {
        setIsPlayingAudio(false);
        console.log("Audio gagal berputar otomatis karena aturan browser:", error);
      });
    } else {
      console.log("Karakter suara tidak ditemukan!");
    }
  };

  useEffect(() => {
    if ("speechSynthesis" in window) {
      const updateEngine = () => {
        const voices = window.speechSynthesis.getVoices();
        const selectedVoiceObj = VOICE_OPTIONS.find(v => v.value === voiceVoice) || VOICE_OPTIONS[0];
        const selectedVoice = selectBrowserVoice(selectedVoiceObj.value, voices);
        if (selectedVoice) {
          setActiveEngineName(`${selectedVoice.name} (${selectedVoice.lang})`);
        } else {
          setActiveEngineName("Synthesizer Chime");
        }
      };

      updateEngine();
      window.speechSynthesis.onvoiceschanged = updateEngine;
      return () => {
        window.speechSynthesis.onvoiceschanged = null;
      };
    } else {
      setActiveEngineName("Synthesizer Chime");
    }
  }, [voiceVoice]);

  // Dynamic feedback
  const [saveBannerText, setSaveBannerText] = useState<string | null>(null);

  // Dynamic accent helper styling rules to align with current active chat theme state
  const getAccentBgClass = (isHover: boolean = false) => {
    if (accentColor === "Hijau") return isHover ? "bg-emerald-600 hover:bg-emerald-700" : "bg-emerald-500";
    if (accentColor === "Ungu") return isHover ? "bg-purple-600 hover:bg-purple-700" : "bg-purple-500";
    if (accentColor === "Hitam") return isHover ? "bg-zinc-200 hover:bg-zinc-300 text-black" : "bg-zinc-100 text-black";
    if (accentColor === "Kuning") return isHover ? "bg-amber-500 hover:bg-amber-600" : "bg-amber-400";
    if (accentColor === "Merah jambu") return isHover ? "bg-rose-600 hover:bg-rose-700" : "bg-rose-500";
    if (accentColor === "Oranye") return isHover ? "bg-orange-500 hover:bg-orange-650" : "bg-orange-500";
    return isHover ? "bg-blue-600 hover:bg-blue-700" : "bg-blue-500"; // Biru
  };

  const getAccentTextClass = () => {
    if (accentColor === "Hijau") return "text-emerald-400";
    if (accentColor === "Ungu") return "text-purple-400";
    if (accentColor === "Hitam") return "text-zinc-300";
    if (accentColor === "Kuning") return "text-amber-450";
    if (accentColor === "Merah jambu") return "text-rose-400";
    if (accentColor === "Oranye") return "text-orange-400";
    return "text-blue-400"; // Biru
  };

  const getAccentBorderClass = () => {
    if (accentColor === "Hijau") return "border-emerald-500/20";
    if (accentColor === "Ungu") return "border-purple-500/20";
    if (accentColor === "Hitam") return "border-zinc-750";
    if (accentColor === "Kuning") return "border-amber-400/20";
    if (accentColor === "Merah jambu") return "border-rose-500/20";
    if (accentColor === "Oranye") return "border-orange-500/20";
    return "border-blue-500/20"; // Biru
  };

  const getBadgeClass = () => {
    if (accentColor === "Hijau") return "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20";
    if (accentColor === "Ungu") return "bg-purple-500/15 text-purple-400 border border-purple-500/20";
    if (accentColor === "Hitam") return "bg-zinc-500/15 text-zinc-300 border border-zinc-700";
    if (accentColor === "Kuning") return "bg-amber-400/15 text-amber-500 border border-amber-400/20";
    if (accentColor === "Merah jambu") return "bg-rose-500/15 text-rose-400 border border-rose-500/20";
    if (accentColor === "Oranye") return "bg-orange-500/15 text-orange-450 border border-orange-500/20";
    return "bg-blue-500/15 text-blue-400 border border-blue-500/20"; // Biru
  };

  // Propagate all modified states instantly back to parent and triggers autosave
  const triggerSave = (updates: Partial<UserSettings> & { 
    appearanceVal?: string, 
    accentVal?: string,
    dictationVal?: boolean,
    langStyle?: LanguageStyle
  }) => {
    // Compile full updated configurations
    const updatedSettings: UserSettings = {
      username: updates.username !== undefined ? updates.username : userNickname,
      tone: updates.tone !== undefined ? updates.tone : basicToneStyle,
      languageStyle: updates.langStyle !== undefined ? updates.langStyle : (settings.languageStyle || "Baku"),
      customPrompt: updates.customPrompt !== undefined ? updates.customPrompt : customInstructions,
      theme: updates.theme !== undefined ? updates.theme : settings.theme,
      widgets: settings.widgets,
      notifications: {
        soundEnabled: updates.notifications?.soundEnabled !== undefined ? updates.notifications.soundEnabled : (settings.notifications?.soundEnabled !== false),
        statusUpdates: settings.notifications?.statusUpdates ?? true,
        remindersEnabled: settings.notifications?.remindersEnabled ?? true,
      }
    };
    
    // Auto-update theme mapping based on accent color
    const targetAccent = updates.accentVal || accentColor;
    if (targetAccent === "Hijau") {
      updatedSettings.theme = "emerald-green";
    } else if (targetAccent === "Ungu") {
      updatedSettings.theme = "cosmic-purple";
    } else if (targetAccent === "Hitam") {
      updatedSettings.theme = "minimal-dark";
    } else {
      updatedSettings.theme = "classic-blue";
    }

    onSaveSettings(updatedSettings);

    // Flash saving notification
    setSaveBannerText("Sistem menyinkronkan data...");
    setTimeout(() => setSaveBannerText(null), 1200);
  };

  const handleToggleValue = (key: string, current: boolean, setter: (v: boolean) => void) => {
    const next = !current;
    setter(next);
    safeLocalStorageSetItem(key, String(next));
    
    // If it's a critical app configuration, save it
    if (key === "maria_dictation") {
      triggerSave({ dictationVal: next });
    }
  };

  const handleDropdownSelect = (dropdownKey: string, value: string, setter: (v: string) => void) => {
    setter(value);
    safeLocalStorageSetItem(dropdownKey, value);
    setActiveDropdownId(null);

    if (dropdownKey === "maria_accent_color") {
      triggerSave({ accentVal: value });
    }

    if (dropdownKey === "maria_voice") {
      putarSuaraKarakter(value);
    }
  };

  // Safe tone update triggers
  const handleToneSelect = (selectedTone: MariaTone) => {
    setBasicToneStyle(selectedTone);
    setActiveDropdownId(null);
    triggerSave({ tone: selectedTone });
  };

  // Dialogues and voice settings for each premium character
  const playFallbackChime = (isAnime: boolean) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (isAnime) {
        const osc1 = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        osc1.type = "sine";
        osc1.frequency.setValueAtTime(880.00, audioCtx.currentTime); 
        osc1.frequency.exponentialRampToValueAtTime(1318.51, audioCtx.currentTime + 0.12); 

        osc2.type = "sine";
        osc2.frequency.setValueAtTime(1046.50, audioCtx.currentTime); 
        osc2.frequency.exponentialRampToValueAtTime(1567.98, audioCtx.currentTime + 0.15); 

        gainNode.gain.setValueAtTime(0.35, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);

        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        osc1.start();
        osc2.start();

        setTimeout(() => {
          osc1.stop();
          osc2.stop();
          setIsPlayingAudio(false);
        }, 650);
      } else {
        const osc1 = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        const osc3 = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        osc1.type = "sine";
        osc1.frequency.setValueAtTime(523.25, audioCtx.currentTime); 
        osc1.frequency.exponentialRampToValueAtTime(783.99, audioCtx.currentTime + 0.12); 

        osc2.type = "triangle";
        osc2.frequency.setValueAtTime(659.25, audioCtx.currentTime); 
        osc2.frequency.exponentialRampToValueAtTime(880.00, audioCtx.currentTime + 0.15); 

        osc3.type = "sine";
        osc3.frequency.setValueAtTime(261.63, audioCtx.currentTime); 
        osc3.frequency.exponentialRampToValueAtTime(523.25, audioCtx.currentTime + 0.2);

        gainNode.gain.setValueAtTime(0.45, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.9);

        osc1.connect(gainNode);
        osc2.connect(gainNode);
        osc3.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        osc1.start();
        osc2.start();
        osc3.start();
        
        setTimeout(() => {
          osc1.stop();
          osc2.stop();
          osc3.stop();
          setIsPlayingAudio(false);
        }, 950);
      }
    } catch (e) {
      console.warn("Fallback chime error:", e);
      setIsPlayingAudio(false);
    }
  };

  // Helper matching client browser voices dynamically to provide varied audio outputs
  const selectBrowserVoice = (voiceKey: string, voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null => {
    if (!voices || voices.length === 0) return null;

    // Filter by Indonesian language first
    const idVoices = voices.filter(v => {
      const l = v.lang.toLowerCase();
      return l.startsWith("id") || l.startsWith("in");
    });
    const jaVoices = voices.filter(v => v.lang.toLowerCase().startsWith("ja"));
    const enVoices = voices.filter(v => v.lang.toLowerCase().startsWith("en"));

    const femaleKeywords = [
      "female", "gadis", "damayanti", "samantha", "zira", "hazel", "moira", "karen", "siri", 
      "susan", "lisa", "sara", "mei", "kyoko", "yuri", "ayumi", "tessa", "veena", "jessica", 
      "sri", "indri", "kristina", "gigi", "sin-ji", "wanita", "perempuan"
    ];
    const maleKeywords = [
      "male", "pria", "lanang", "andika", "bagus", "david", "george", "ravi", "richard", "mark", 
      "ichiro", "takashi", "honda", "microsoft david", "google male", "bagas", "indonesia male"
    ];

    const isFemale = (v: SpeechSynthesisVoice) => {
      const name = v.name.toLowerCase();
      return femaleKeywords.some(kw => name.includes(kw)) || (!maleKeywords.some(kw => name.includes(kw)) && (v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Android")));
    };

    const isMale = (v: SpeechSynthesisVoice) => {
      const name = v.name.toLowerCase();
      return maleKeywords.some(kw => name.includes(kw)) || name.includes("david") || name.includes("andika") || name.includes("bagas");
    };

    const idFemales = idVoices.filter(isFemale);
    const idMales = idVoices.filter(isMale);
    const idNeutrals = idVoices.filter(v => !isFemale(v) && !isMale(v));

    const enFemales = enVoices.filter(isFemale);
    const enMales = enVoices.filter(isMale);
    const enNeutrals = enVoices.filter(v => !isFemale(v) && !isMale(v));

    const jaFemales = jaVoices.filter(isFemale);

    const isAnime = ["Maria", "Aiko", "Haruka", "Sora"].includes(voiceKey);

    if (isAnime) {
      if (voiceKey === "Sora") {
        // Sora is a energetic boy character, look for jaMale or idMale
        const jaMales = jaVoices.filter(isMale);
        return jaMales[0] || jaVoices[0] || idMales[0] || idNeutrals[0] || voices.find(v => isMale(v)) || voices[0];
      }
      // Girls characters (Maria, Aiko, Haruka)
      if (voiceKey === "Maria") {
        return jaFemales[0] || jaVoices[0] || idFemales[0] || idNeutrals[0] || enFemales[0] || voices[0];
      }
      if (voiceKey === "Aiko") {
        return jaFemales[1] || jaFemales[0] || idFemales[1] || idFemales[0] || enFemales[0] || voices[0];
      }
      if (voiceKey === "Haruka") {
        return jaFemales[2] || jaFemales[0] || idFemales[2] || idFemales[0] || enFemales[1] || voices[0];
      }
      return jaFemales[0] || idFemales[0] || voices[0];
    } else {
      const isMaleVoice = ["Spruce", "Cove"].includes(voiceKey);
      const isFemaleVoice = ["Breeze", "Juniper"].includes(voiceKey);

      if (isMaleVoice) {
        if (voiceKey === "Spruce") {
          return idMales[0] || idNeutrals[0] || enMales[0] || voices.find(v => isMale(v)) || voices[0];
        }
        if (voiceKey === "Cove") {
          return idMales[1] || idMales[0] || enMales[1] || enMales[0] || voices.find(v => isMale(v)) || voices[0];
        }
        return idMales[0] || voices.find(v => isMale(v)) || voices[0];
      } else if (isFemaleVoice) {
        if (voiceKey === "Breeze") {
          return idFemales[1] || idFemales[0] || enFemales[0] || idNeutrals[0] || voices[0];
        }
        if (voiceKey === "Juniper") {
          return idFemales[2] || idFemales[0] || enFemales[1] || enFemales[0] || voices[0];
        }
        return idFemales[0] || voices[0];
      } else {
        // Ember (fast, short, dry)
        return idNeutrals[0] || idMales[0] || enMales[0] || voices[0];
      }
    }
  };

  // Play synthesized bell chime preview or actual Speech Synthesis preview
  const playVoiceChime = () => {
    putarSuaraKarakter(voiceVoice);
    return;

    if (isPlayingAudio) return;
    setIsPlayingAudio(true);

    const selectedVoiceObj = VOICE_OPTIONS.find(v => v.value === voiceVoice) || VOICE_OPTIONS[0];
    
    if ("speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();

        const voices = window.speechSynthesis.getVoices();
        const matchedVoice = selectBrowserVoice(selectedVoiceObj.value, voices);
        const voiceLang = matchedVoice ? matchedVoice.lang.toLowerCase() : "id-id";
        const isJapanese = voiceLang.startsWith("ja") || voiceLang.startsWith("jp");
        const isEnglish = voiceLang.startsWith("en");

        // Detect engine capabilities of matched voice
        const matchedVoiceName = matchedVoice ? matchedVoice.name.toLowerCase() : "";
        const actualVoiceIsMale = matchedVoiceName.includes("male") || matchedVoiceName.includes("bagas") || matchedVoiceName.includes("andika") || matchedVoiceName.includes("david") || matchedVoiceName.includes("pria");
        const actualVoiceIsFemale = matchedVoiceName.includes("female") || matchedVoiceName.includes("gadis") || matchedVoiceName.includes("damayanti") || matchedVoiceName.includes("samantha") || matchedVoiceName.includes("zira") || matchedVoiceName.includes("wanita");

        // Custom voice spoken samples
        const getSampleDetails = (voiceKey: string) => {
          switch (voiceKey) {
            case "Maria": {
              let pitchShift = 1.35;
              // If browser loaded a male voice instead, pitch up significantly
              if (actualVoiceIsMale) pitchShift = 1.50; 
              if (isJapanese) {
                return {
                  text: "お疲れ様です！マリアです。私の新しい特別な声はいかがですか？ふふ、今日もよろしくお願いします！",
                  pitch: pitchShift,
                  rate: 1.05
                };
              } else if (isEnglish) {
                return {
                  text: "Hello! I am Maria, your sweet voice companion. How does my new premium voice sound? Let's have an amazing day!",
                  pitch: pitchShift,
                  rate: 1.05
                };
              } else {
                return {
                  text: "Halo kak! Aku Maria, asisten pribadimu. Semoga hari kakak menyenangkan dan penuh dengan kebahagiaan ya!",
                  pitch: pitchShift,
                  rate: 1.05
                };
              }
            }
            case "Aiko": {
              let pitchShift = 1.55;
              if (actualVoiceIsMale) pitchShift = 1.65;
              if (isJapanese) {
                return {
                  text: "ヤッホー！愛子だよ！今日も元気一杯に頑張ろうね！エイエイオー！",
                  pitch: pitchShift,
                  rate: 1.2
                };
              } else if (isEnglish) {
                return {
                  text: "Yay, hello! I'm Aiko! Let's get super productive and complete all chores with big high energy today!",
                  pitch: pitchShift,
                  rate: 1.25
                };
              } else {
                return {
                  text: "Hai hai! Aku Aiko! Hari ini harus penuh semangat ya, jangan malas-malas! Semangat terus, Chiooo!",
                  pitch: pitchShift,
                  rate: 1.2
                };
              }
            }
            case "Haruka": {
              let pitchShift = 1.10;
              if (actualVoiceIsMale) pitchShift = 1.30;
              if (isJapanese) {
                return {
                  text: "こんにちは、春香です。慌ただしい一日ですが、深呼吸をして心安らかに過ごしましょうね。",
                  pitch: pitchShift,
                  rate: 0.88
                };
              } else if (isEnglish) {
                return {
                  text: "Welcome. I am Haruka. Let's quiet the noise of the day and proceed with a peaceful and clear mind.",
                  pitch: pitchShift,
                  rate: 0.88
                };
              } else {
                return {
                  text: "Selamat pagi. Saya Haruka. Tarik napas dalam-dalam, mari kita lalui hari ini dengan damai, tenang, dan jernih.",
                  pitch: pitchShift,
                  rate: 0.88
                };
              }
            }
            case "Sora": {
              let pitchShift = 0.90;
              // If actual voice is female, pitch down a bit to sound tomboyish / boyish
              if (actualVoiceIsFemale) pitchShift = 0.85; 
              if (isJapanese) {
                return {
                  text: "よお！ソラだぜ！新しいアイデアがいっぱい詰まったこの広い世界を、一緒に駆け巡ろう！",
                  pitch: pitchShift,
                  rate: 1.22
                };
              } else if (isEnglish) {
                return {
                  text: "Yo! High-five! Sora in the house! The digital world is vast, let's explore cool boundaries together!",
                  pitch: pitchShift,
                  rate: 1.22
                };
              } else {
                return {
                  text: "Yoo! Aku Sora! Dunia ini luas, ayo kita jelajahi ide-ide baru dan taklukkan semua rintangan bersama!",
                  pitch: pitchShift,
                  rate: 1.22
                };
              }
            }
            case "Spruce": {
              let pitchShift = 0.75; // Heavy deep male voice
              if (actualVoiceIsFemale) pitchShift = 0.70; // Hard pitch down if browser only has female voice
              if (isEnglish) {
                return {
                  text: "Hello, this is Spruce. Let's combine our patience and structured thinking to shape your dreams today.",
                  pitch: pitchShift,
                  rate: 0.92
                };
              } else {
                return {
                  text: "Halo, saya Spruce. Mari kita gabungkan kesabaran dan pemikiran terstruktur untuk merangkai ide luar biasa hari ini.",
                  pitch: pitchShift,
                  rate: 0.92
                };
              }
            }
            case "Breeze": {
              let pitchShift = 1.05; // Warm soft female voice
              if (actualVoiceIsMale) pitchShift = 1.25; // Pitch up if browser only has male voice
              if (isEnglish) {
                return {
                  text: "Hi, I'm Breeze. I'm here to provide a warm and cheerful assistance to keep you motivated and relaxed.",
                  pitch: pitchShift,
                  rate: 1.0
                };
              } else {
                return {
                  text: "Hai, aku Breeze. Aku di sini untuk memberikan bantuan yang hangat dan bersahabat agar kakak tetap santai dan termotivasi.",
                  pitch: pitchShift,
                  rate: 1.0
                };
              }
            }
            case "Cove": {
              let pitchShift = 0.65; // High depth professional male voice
              if (actualVoiceIsFemale) pitchShift = 0.60; // Ultimate pitch down for deep authoritative effect
              if (isEnglish) {
                return {
                  text: "Greetings. I am Cove. Displaying reliable data analysis and professional guidance for your high stability.",
                  pitch: pitchShift,
                  rate: 0.88
                };
              } else {
                return {
                  text: "Selamat datang kembali. Saya Cove. Menampilkan analisis data terpercaya untuk mendukung keputusan profesional Anda.",
                  pitch: pitchShift,
                  rate: 0.88
                };
              }
            }
            case "Ember": {
              let pitchShift = 0.85; // Quick concise crisp voice
              if (isEnglish) {
                return {
                  text: "Ember online. Command recognized. Executing immediately. Rapid and precise output delivered.",
                  pitch: pitchShift,
                  rate: 1.25
                };
              } else {
                return {
                  text: "Ember, aktif. Perintah Anda segera diproses. Cepat, tangkas, langsung tuntas tanpa basa-basi.",
                  pitch: pitchShift,
                  rate: 1.25
                };
              }
            }
            case "Juniper": {
              let pitchShift = 1.20; // Smart, fast female voice
              if (actualVoiceIsMale) pitchShift = 1.35;
              if (isEnglish) {
                return {
                  text: "Hello, I'm Juniper! Ready to process deep research and streamline your intelligent creative flows!",
                  pitch: pitchShift,
                  rate: 1.12
                };
              } else {
                return {
                  text: "Halo, saya Juniper! Siap mengolah riset rumit dan mempermudah segala kebutuhan kerja cerdas Anda!",
                  pitch: pitchShift,
                  rate: 1.12
                };
              }
            }
            default:
              return {
                text: "Pengujian audio berjalan lancar. Suara Anda siap dikonfigurasi.",
                pitch: 1.0,
                rate: 1.0
              };
          }
        };

        const sample = getSampleDetails(selectedVoiceObj.value);
        const utterance = new SpeechSynthesisUtterance(sample.text);
        utterance.pitch = sample.pitch;
        utterance.rate = sample.rate;
        utterance.lang = voiceLang;

        if (matchedVoice) {
          utterance.voice = matchedVoice;
        }

        utterance.onend = () => {
          setIsPlayingAudio(false);
        };

        utterance.onerror = (evt) => {
          // If the synthesis was canceled/interrupted because the user clicked rapidly or changed values, do NOT trigger chime fallback
          if (evt.error === "interrupted" || evt.error === "canceled") {
            return;
          }
          console.warn("Speech synthesis error, falling back to chime synthesizer:", evt);
          playFallbackChime(selectedVoiceObj.category === "anime");
        };

        window.speechSynthesis.speak(utterance);
        
        // Safety timeout in case speechSynthesis.onend is never fired by buggy browser runtimes
        setTimeout(() => {
          if (window.speechSynthesis.speaking) {
            // Keep active if still running
          } else {
            setIsPlayingAudio(false);
          }
        }, 12000);

        return;
      } catch (err) {
        console.warn("Speech synthesis init failed, playing chime fallback:", err);
      }
    }

    // Speech synthesis is completely unavailable, play rich synthesizer chime
    playFallbackChime(selectedVoiceObj.category === "anime");
  };

  // Helper function to render checklists for Notifications
  const toggleNotificationChoice = (notifKey: string, type: "In-App" | "Email" | "Push", currentValues: string[], setter: (v: string[]) => void) => {
    let next: string[];
    if (currentValues.includes(type)) {
      next = currentValues.filter(x => x !== type);
    } else {
      next = [...currentValues, type];
    }
    setter(next);
    safeLocalStorageSetItem(notifKey, JSON.stringify(next));
    
    // Quick flash feedback
    setSaveBannerText("Aturan notifikasi diperbarui");
    setTimeout(() => setSaveBannerText(null), 1000);
  };

  const triggerSimulation = (type: "reminders" | "updates" | "suggestions") => {
    let channels: string[] = [];
    let name = "";
    if (type === "reminders") {
      channels = remindersNotif;
      name = "Pengingat & Agenda";
    } else if (type === "updates") {
      channels = updatesNotif;
      name = "Pembaruan & Sistem";
    } else {
      channels = suggestionsNotif;
      name = "Saran & Rekomendasi Cerdas";
    }

    if (!channels || channels.length === 0) {
      setSaveBannerText("⚠️ Aktifkan setidaknya satu saluran (Dalam Aplikasi, Email, Push) untuk simulasi ini!");
      setTimeout(() => setSaveBannerText(null), 3500);
      return;
    }

    let title = "";
    let body = "";
    let systemType: "info" | "success" | "reminder" | "message" = "info";

    if (type === "reminders") {
      const idx = Math.floor(Math.random() * 2);
      title = idx === 0 ? "📅 Agenda Rutin Belajar" : "⏰ Batas Waktu Tugas Codex";
      body = idx === 0 
        ? `Kak ${settings.username || "Basit"}, sesi tinjauan metode Agile & Scrum akan dimulai dalam 15 menit. Siapkan catatanmu ya!` 
        : "Tugas Codex 'Refactoring Navigation' dijadwalkan selesai hari ini pukul 17.00. Butuh bantuan Maria?";
      systemType = "reminder";
    } else if (type === "updates") {
      const idx = Math.floor(Math.random() * 2);
      title = idx === 0 ? "✨ Fitur Baru: Suara Anime Sora" : "🚀 Sintesis Suara Lebih Natural";
      body = idx === 0
        ? "Suara laki-laki berenergi 'Sora' kini aktif! Sempurna untuk obrolan santun dan bimbingan harian Anda."
        : "Pembaruan Sistem v2.4: Waktu tunggu respons sintesis suara dikurangi sebesar 40% untuk kelancaran obrolan.";
      systemType = "success";
    } else {
      const idx = Math.floor(Math.random() * 2);
      title = idx === 0 ? "💡 Saran Cerdas Maria" : "🎯 Tips Produktivitas Hari Ini";
      body = idx === 0
        ? "Berdasarkan rujukan naskah horor Riko-mu, ayo tanyakan Maria cara membangun ketegangan adegan klimaks yang maksimal!"
        : "Teknik Jeda 5 Menit: Matikan sejenak layar komputer untuk mengurai kelelahan mata setelah mengetik naskah.";
      systemType = "message";
    }

    const activatedChannelsList: string[] = [];

    if (channels.includes("In-App")) {
      if (onAddSystemNotification) {
        onAddSystemNotification(title, body, systemType);
        activatedChannelsList.push("Dalam Aplikasi (Bell 🔔)");
      }
    }
    
    if (channels.includes("Email")) {
      if (onSimulateEmail) {
        onSimulateEmail(title, body, name);
        activatedChannelsList.push("Email 📧");
      }
    }

    if (channels.includes("Push")) {
      if (onSimulatePush) {
        onSimulatePush(title, body);
        activatedChannelsList.push("Web Push 📱");
      }
    }

    setSaveBannerText(`🔔 Simulasi Terkirim! Saluran aktif: ${activatedChannelsList.join(", ")}`);
    setTimeout(() => setSaveBannerText(null), 3500);
  };

  return (
    <div className="flex flex-col h-full bg-[#171717] font-sans antialiased text-zinc-100 relative select-none">
      
      {/* Top Main Heading Row matching Screenshots */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[#2c2c2c] shrink-0">
        <h2 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
          {activeTab === "umum" && "Umum"}
          {activeTab === "notifikasi" && "Notifikasi"}
          {activeTab === "personalisasi" && "Personalisasi"}
          {activeTab === "aplikasi" && "Aplikasi"}
          {activeTab === "tagihan" && "Tagihan"}
          {activeTab === "kontrol-data" && "Kontrol data"}
        </h2>
        {onClose && (
          <button 
            type="button" 
            onClick={onClose} 
            className="p-1 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Tutup Pengaturan"
            aria-label="Tutup Pengaturan"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Horizontal Tabs Roller Bar - Exactly matching Screenshot scrollability */}
      <div className="flex items-center gap-1.5 px-4 py-3 bg-[#171717] border-b border-[#2c2c2c] overflow-x-auto no-scrollbar shrink-0">
        
        {/* Tab ITEM: UMUM */}
        <button
          type="button"
          onClick={() => { setActiveTab("umum"); setActiveDropdownId(null); }}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-medium leading-none cursor-pointer transition-all shrink-0 border border-transparent ${
            activeTab === "umum" 
              ? "bg-[#2f2f2f] text-white border-zinc-700/50" 
              : "text-zinc-400 hover:text-zinc-200 hover:bg-[#202020]/60"
          }`}
        >
          <Settings className={`w-3.5 h-3.5 ${activeTab === "umum" ? getAccentTextClass() : ""}`} />
          <span>Umum</span>
        </button>

        {/* Tab ITEM: NOTIFIKASI */}
        <button
          type="button"
          onClick={() => { setActiveTab("notifikasi"); setActiveDropdownId(null); }}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-medium leading-none cursor-pointer transition-all shrink-0 border border-transparent ${
            activeTab === "notifikasi" 
              ? "bg-[#2f2f2f] text-white border-zinc-700/50" 
              : "text-zinc-400 hover:text-zinc-200 hover:bg-[#202020]/60"
          }`}
        >
          <Bell className={`w-3.5 h-3.5 ${activeTab === "notifikasi" ? getAccentTextClass() : ""}`} />
          <span>Notifikasi</span>
        </button>

        {/* Tab ITEM: PERSONALISASI */}
        <button
          type="button"
          onClick={() => { setActiveTab("personalisasi"); setActiveDropdownId(null); }}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-medium leading-none cursor-pointer transition-all shrink-0 border border-transparent ${
            activeTab === "personalisasi" 
              ? "bg-[#2f2f2f] text-white border-zinc-700/50" 
              : "text-zinc-400 hover:text-zinc-200 hover:bg-[#202020]/60"
          }`}
        >
          <Sliders className={`w-3.5 h-3.5 ${activeTab === "personalisasi" ? getAccentTextClass() : ""}`} />
          <span>Personalisasi</span>
        </button>

        {/* Tab ITEM: APLIKASI */}
        <button
          type="button"
          onClick={() => { setActiveTab("aplikasi"); setActiveDropdownId(null); }}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-medium leading-none cursor-pointer transition-all shrink-0 border border-transparent ${
            activeTab === "aplikasi" 
              ? "bg-[#2f2f2f] text-white border-zinc-700/50" 
              : "text-zinc-400 hover:text-zinc-200 hover:bg-[#202020]/60"
          }`}
        >
          <LayoutGrid className={`w-3.5 h-3.5 ${activeTab === "aplikasi" ? getAccentTextClass() : ""}`} />
          <span>Aplikasi</span>
        </button>

        {/* Tab ITEM: TAGIHAN */}
        <button
          type="button"
          onClick={() => { setActiveTab("tagihan"); setActiveDropdownId(null); }}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-medium leading-none cursor-pointer transition-all shrink-0 border border-transparent ${
            activeTab === "tagihan" 
              ? "bg-[#2f2f2f] text-white border-zinc-700/50" 
              : "text-zinc-400 hover:text-zinc-200 hover:bg-[#202020]/60"
          }`}
        >
          <CreditCard className={`w-3.5 h-3.5 ${activeTab === "tagihan" ? getAccentTextClass() : ""}`} />
          <span>Tagihan</span>
        </button>

        {/* Tab ITEM: KONTROL DATA */}
        <button
          type="button"
          onClick={() => { setActiveTab("kontrol-data"); setActiveDropdownId(null); }}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-medium leading-none cursor-pointer transition-all shrink-0 border border-transparent ${
            activeTab === "kontrol-data" 
              ? "bg-[#2f2f2f] text-white border-zinc-700/50" 
              : "text-zinc-400 hover:text-zinc-200 hover:bg-[#202020]/60"
          }`}
        >
          <Database className={`w-3.5 h-3.5 ${activeTab === "kontrol-data" ? getAccentTextClass() : ""}`} />
          <span>Kontrol data</span>
        </button>
      </div>

      {/* Dynamic Sub-tab Body Canvas */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 no-scrollbar pb-10">
        
        {/* ===================== TAB: UMUM ===================== */}
        {activeTab === "umum" && (
          <div className="space-y-4 text-xs">
            <h3 className="text-zinc-100 font-bold text-sm tracking-tight pt-1">Umum</h3>
            
            {/* Divider line */}
            <div className="h-[1px] bg-[#2c2c2c] my-1" />

            {/* Row Option: Penampilan */}
            <div className="flex items-center justify-between py-1 border-b border-[#202020]">
              <span className="text-zinc-100 font-medium">Penampilan</span>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setActiveDropdownId(activeDropdownId === "umum-appearance" ? null : "umum-appearance")}
                  aria-label="Pilih Penampilan Aplikasi"
                  className="bg-[#212121] hover:bg-[#2b2b2b] text-zinc-200 border border-[#2e2e2e]/60 text-[11px] font-medium rounded-lg px-2.5 py-1.5 flex items-center justify-between gap-1.5 cursor-pointer w-28 text-left"
                >
                  <span>{appearance}</span>
                  <ChevronDown className="w-3 h-3 text-zinc-500" />
                </button>
                {activeDropdownId === "umum-appearance" && (
                  <div className="absolute right-0 top-9 bg-[#212121] border border-[#2d2d2d] shadow-2xl rounded-xl py-1 z-50 text-[11px] w-28 text-zinc-300">
                    {["Sistem", "Gelap", "Terang"].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => handleDropdownSelect("maria_appearance", opt, setAppearance)}
                        className="w-full px-3 py-1.8 text-left hover:bg-[#2e2e2e] flex items-center justify-between transition-colors cursor-pointer"
                      >
                        <span>{opt}</span>
                        {appearance === opt && <Check className={`w-3.5 h-3.5 ${getAccentTextClass()}`} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Row Option: Kontras */}
            <div className="flex items-center justify-between py-1 border-b border-[#202020]">
              <span className="text-zinc-100 font-medium">Kontras</span>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setActiveDropdownId(activeDropdownId === "umum-contrast" ? null : "umum-contrast")}
                  aria-label="Pilih Kontras Aplikasi"
                  className="bg-[#212121] hover:bg-[#2b2b2b] text-zinc-200 border border-[#2e2e2e]/60 text-[11px] font-medium rounded-lg px-2.5 py-1.5 flex items-center justify-between gap-1.5 cursor-pointer w-28 text-left"
                >
                  <span>{contrast}</span>
                  <ChevronDown className="w-3 h-3 text-zinc-500" />
                </button>
                {activeDropdownId === "umum-contrast" && (
                  <div className="absolute right-0 top-9 bg-[#212121] border border-[#2d2d2d] shadow-2xl rounded-xl py-1 z-50 text-[11px] w-28 text-zinc-300">
                    {["Sistem", "Gelap", "Terang"].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => handleDropdownSelect("maria_contrast", opt, setContrast)}
                        className="w-full px-3 py-1.8 text-left hover:bg-[#2e2e2e] flex items-center justify-between transition-colors cursor-pointer"
                      >
                        <span>{opt}</span>
                        {contrast === opt && <Check className={`w-3.5 h-3.5 ${getAccentTextClass()}`} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Row Option: Warna aksen */}
            <div className="flex items-center justify-between py-1 border-b border-[#202020]">
              <span className="text-zinc-100 font-medium">Warna aksen</span>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setActiveDropdownId(activeDropdownId === "umum-accent" ? null : "umum-accent")}
                  aria-label="Pilih Warna Aksen Aplikasi"
                  className="bg-[#212121] hover:bg-[#2b2b2b] text-zinc-200 border border-[#2e2e2e]/60 text-[11px] font-medium rounded-lg px-2.5 py-1.5 flex items-center justify-between gap-1.5 cursor-pointer w-28 text-left"
                >
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      accentColor === "Biru" ? "bg-blue-500" :
                      accentColor === "Hijau" ? "bg-emerald-500" :
                      accentColor === "Kuning" ? "bg-amber-400" :
                      accentColor === "Merah jambu" ? "bg-rose-500" :
                      accentColor === "Oranye" ? "bg-orange-500" :
                      accentColor === "Ungu" ? "bg-violet-500" :
                      accentColor === "Hitam" ? "bg-zinc-200" : "bg-neutral-500"
                    }`} />
                    <span>{accentColor}</span>
                  </div>
                  <ChevronDown className="w-3 h-3 text-zinc-500" />
                </button>
                {activeDropdownId === "umum-accent" && (
                  <div className="absolute right-0 top-9 bg-[#212121] border border-[#2d2d2d] shadow-2xl rounded-xl py-1 z-55 text-[11px] w-48 text-zinc-300">
                    {[
                      { name: "Default", color: "bg-neutral-500" },
                      { name: "Biru", color: "bg-blue-500" },
                      { name: "Hijau", color: "bg-emerald-500" },
                      { name: "Kuning", color: "bg-amber-400" },
                      { name: "Merah jambu", color: "bg-rose-500" },
                      { name: "Oranye", color: "bg-orange-500" },
                      { name: "Ungu", color: "bg-violet-500", badge: "PLUS" },
                      { name: "Hitam", color: "bg-zinc-200", badge: "PRO" },
                    ].map((opt) => (
                      <button
                        key={opt.name}
                        type="button"
                        onClick={() => handleDropdownSelect("maria_accent_color", opt.name, setAccentColor)}
                        className="w-full px-3 py-1.8 text-left hover:bg-[#2e2e2e] flex items-center justify-between transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${opt.color}`} />
                          <span>{opt.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {opt.badge && (
                            <span className="text-[7.5px] font-bold px-1 py-[1.5px] scale-90 bg-zinc-800 text-zinc-400 border border-zinc-700 rounded rounded-xs">
                              {opt.badge}
                            </span>
                          )}
                          {accentColor === opt.name && <Check className={`w-3 h-3 ${getAccentTextClass()}`} />}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Row Option: Bahasa */}
            <div className="flex items-center justify-between py-1 border-b border-[#202020]">
              <span className="text-zinc-100 font-medium">Bahasa</span>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setActiveDropdownId(activeDropdownId === "umum-lang" ? null : "umum-lang")}
                  aria-label="Pilih Bahasa Aplikasi"
                  className="bg-[#212121] hover:bg-[#2b2b2b] text-zinc-200 border border-[#2e2e2e]/60 text-[11px] font-medium rounded-lg px-2.5 py-1.5 flex items-center justify-between gap-1.5 cursor-pointer w-40 text-left"
                >
                  <span className="truncate">{language}</span>
                  <ChevronDown className="w-3 h-3 text-zinc-500" />
                </button>
                {activeDropdownId === "umum-lang" && (
                  <div className="absolute right-0 top-9 bg-[#212121] border border-[#2d2d2d] shadow-2xl rounded-xl py-1 z-55 text-[11px] w-40 text-zinc-300">
                    {["Deteksi otomatis", "Bahasa Indonesia", "English", "日本語"].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => handleDropdownSelect("maria_language", opt, setLanguage)}
                        className="w-full px-3 py-1.8 text-left hover:bg-[#2e2e2e] flex items-center justify-between transition-colors cursor-pointer"
                      >
                        <span>{opt}</span>
                        {language === opt && <Check className={`w-3.5 h-3.5 ${getAccentTextClass()}`} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Row Option: Aktifkan Dikte */}
            <div className="flex items-start justify-between py-1 border-b border-[#202020] gap-4">
              <div className="flex-1 space-y-0.5">
                <div className="text-zinc-100 font-medium">Aktifkan Dikte</div>
                <div className="text-[10px] text-zinc-450 leading-relaxed">Gunakan dikte di kolom obrolan.</div>
              </div>
              <div 
                onClick={() => handleToggleValue("maria_dictation", dictationEnabled, setDictationEnabled)}
                className={`w-9 h-5 rounded-full p-[2.5px] cursor-pointer transition-colors shrink-0 self-center ${dictationEnabled ? getAccentBgClass() : 'bg-[#3a3a3a]'}`}
              >
                <div className={`w-3.5 h-3.5 bg-white rounded-full shadow-xs transition-transform transform ${dictationEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
              </div>
            </div>

            {/* Row Option: Bahasa Lisan */}
            <div className="flex items-start justify-between py-1 border-b border-[#202020] gap-4">
              <div className="flex-1 space-y-0.5">
                <div className="text-zinc-100 font-medium">Bahasa lisan</div>
                <div className="text-[10px] text-zinc-450 leading-relaxed">Untuk hasil terbaik, pilih bahasa yang Anda kuasai. Jika tidak tercantum, mungkin bahasa tersebut tetap didukung melalui deteksi otomatis.</div>
              </div>
              <div className="relative shrink-0 self-center">
                <button
                  type="button"
                  onClick={() => setActiveDropdownId(activeDropdownId === "umum-spoken-lang" ? null : "umum-spoken-lang")}
                  aria-label="Pilih Bahasa Lisan"
                  className="bg-[#212121] hover:bg-[#2b2b2b] text-zinc-200 border border-[#2e2e2e]/60 text-[11px] font-medium rounded-lg px-2.5 py-1.5 flex items-center justify-between gap-1.5 cursor-pointer w-36 text-left"
                >
                  <span className="truncate">{spokenLanguage}</span>
                  <ChevronDown className="w-3 h-3 text-zinc-500" />
                </button>
                {activeDropdownId === "umum-spoken-lang" && (
                  <div className="absolute right-0 top-9 bg-[#212121] border border-[#2d2d2d] shadow-2xl rounded-xl py-1 z-55 text-[11px] w-40 text-zinc-300">
                    {["Deteksi otomatis", "Bahasa Indonesia", "English", "日本語"].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => handleDropdownSelect("maria_spoken_lang", opt, setSpokenLanguage)}
                        className="w-full px-3 py-1.8 text-left hover:bg-[#2e2e2e] flex items-center justify-between transition-colors cursor-pointer"
                      >
                        <span className="truncate">{opt}</span>
                        {spokenLanguage === opt && <Check className={`w-3.5 h-3.5 ${getAccentTextClass()}`} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Row Option: Suara (Audio) */}
            <div className="flex items-start justify-between py-2 border-b border-[#202020] gap-4">
              <div className="flex flex-col">
                <span className="text-zinc-100 font-medium">Suara</span>
                {activeEngineName && (
                  <span className="text-[10px] text-zinc-500 truncate max-w-[150px] font-mono mt-0.5" title={activeEngineName}>
                    {activeEngineName}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 self-center">
                <button
                  type="button"
                  onClick={playVoiceChime}
                  disabled={isPlayingAudio}
                  className="px-3 py-1.5 bg-[#212121] hover:bg-[#2b2b2b] rounded-lg border border-[#2e2e2e]/60 text-zinc-200 text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer active:scale-95 duration-100 disabled:opacity-40"
                >
                  <Play className="w-3 h-3 fill-white text-white shrink-0" />
                  <span>{isPlayingAudio ? "Memutar..." : "Putar"}</span>
                </button>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setActiveDropdownId(activeDropdownId === "umum-voice" ? null : "umum-voice")}
                    className="bg-[#212121] hover:bg-[#2b2b2b] text-zinc-200 border border-[#2e2e2e]/60 text-[11px] font-medium rounded-lg px-2.5 py-1.5 flex items-center justify-between gap-1.5 cursor-pointer w-36 text-left"
                  >
                    <span className="truncate">{(VOICE_OPTIONS.find(v => v.value === voiceVoice) || VOICE_OPTIONS[0]).label}</span>
                    <ChevronDown className="w-3 h-3 text-zinc-500 shrink-0" />
                  </button>
                  {activeDropdownId === "umum-voice" && (
                    <div className="absolute right-0 top-9 bg-[#212121] border border-[#2d2d2d] shadow-2xl rounded-xl py-1 z-55 text-[11.5px] w-56 text-zinc-300 max-h-72 overflow-y-auto">
                      <div className="px-3 py-1.5 text-[9.5px] text-zinc-500 font-bold uppercase tracking-wider border-b border-[#2d2d2d]/40 mb-1">
                        🗣️ Karakter Suara
                      </div>
                      {VOICE_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => handleDropdownSelect("maria_voice", opt.value, setVoiceVoice)}
                          className="w-full px-3 py-2 text-left hover:bg-[#2e2e2e] flex flex-col justify-start transition-colors cursor-pointer group"
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="font-semibold text-zinc-100 group-hover:text-white">{opt.label}</span>
                            {voiceVoice === opt.value && <Check className={`w-3.5 h-3.5 ${getAccentTextClass()}`} />}
                          </div>
                          <span className="text-[9.5px] text-zinc-500 mt-0.5">{opt.desc}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Row Option: Suara Terpisah */}
            <div className="flex items-start justify-between py-1 border-b border-[#202020] gap-4">
              <div className="flex-1 space-y-0.5">
                <div className="text-zinc-100 font-medium">Suara Terpisah</div>
                <div className="text-[10px] text-zinc-450 leading-relaxed">Simpan Suara Maria dalam layar penuh terpisah, tanpa transkrip dan visual secara real time.</div>
              </div>
              <div 
                onClick={() => handleToggleValue("maria_stream_split", voiceStreamSplit, setVoiceStreamSplit)}
                className={`w-9 h-5 rounded-full p-[2.5px] cursor-pointer transition-colors shrink-0 self-center ${voiceStreamSplit ? getAccentBgClass() : 'bg-[#3a3a3a]'}`}
              >
                <div className={`w-3.5 h-3.5 bg-white rounded-full shadow-xs transition-transform transform ${voiceStreamSplit ? 'translate-x-4' : 'translate-x-0'}`} />
              </div>
            </div>

          </div>
        )}

        {/* ===================== TAB: NOTIFIKASI ===================== */}
        {activeTab === "notifikasi" && (
          <div className="space-y-4 text-xs">
            <h3 className="text-zinc-100 font-bold text-sm tracking-tight pt-1">Notifikasi Asisten Cerdas</h3>
            <div className="h-[1px] bg-[#2c2c2c] my-1" />

            {[
              { id: "reminders", label: "Pengingat & Agenda", desc: "Dapatkan pengingat tugas harian, jadwal belajar, dan janji penting dari asisten Maria.", state: remindersNotif, setter: setRemindersNotif, key: "notif_reminders" },
              { id: "updates", label: "Pembaruan & Sistem", desc: "Menerima informasi rilis fitur asisten baru, versi sistem, dan tips keamanan digital harian.", state: updatesNotif, setter: setUpdatesNotif, key: "notif_updates" },
              { id: "suggestions", label: "Saran & Tips Cerdas", desc: "Dapatkan saran taktis harian dan analisis topik produktivitas cerdas berdasarkan riwayat obrolan Kakak.", state: suggestionsNotif, setter: setSuggestionsNotif, key: "notif_suggestions" }
            ].map((item) => (
              <div key={item.id} className="flex items-start justify-between py-2 border-b border-[#202020] gap-4">
                <div className="flex-1 space-y-0.5">
                  <span className="text-zinc-100 font-medium block">{item.label}</span>
                  <span className="text-[10px] text-zinc-450 block leading-relaxed select-text">
                    {item.desc}
                  </span>
                </div>
                
                {/* Selector for Delivery Options */}
                <div className="relative shrink-0 self-center">
                  <button
                    type="button"
                    onClick={() => setActiveDropdownId(activeDropdownId === `notif-${item.id}` ? null : `notif-${item.id}`)}
                    className="bg-[#212121] hover:bg-[#2b2b2b] text-zinc-200 border border-[#2e2e2e]/60 text-[11px] font-medium rounded-lg px-2.5 py-1.5 flex items-center justify-between gap-1.5 cursor-pointer w-36 text-left"
                  >
                    <span className="truncate">
                      {item.state.length === 0 ? "Mati" : item.state.map(s => {
                        if (s === "In-App") return "Dalam Aplikasi";
                        if (s === "Push") return "Push Browser";
                        return s;
                      }).join(", ")}
                    </span>
                    <ChevronDown className="w-3 h-3 text-zinc-500" />
                  </button>

                  {/* Dropdown with options */}
                  {activeDropdownId === `notif-${item.id}` && (
                    <>
                      <div className="fixed inset-0 z-40 cursor-default" onClick={() => setActiveDropdownId(null)} />
                      <div className="absolute right-0 top-9 bg-[#212121] border border-[#2d2d2d] shadow-2xl rounded-xl py-1.5 z-50 text-[11px] w-44 text-zinc-200 divide-y divide-zinc-800/40">
                        
                        {/* Selector choice: In-App */}
                        <div 
                          className="px-3.5 py-2 hover:bg-[#2e2e2e] flex items-center justify-between cursor-pointer transition-colors"
                          onClick={() => toggleNotificationChoice(item.key, "In-App", item.state, item.setter)}
                        >
                          <span className="flex items-center gap-1.5">
                            <Bell className="w-3 h-3 text-blue-450" />
                            Dalam Aplikasi
                          </span>
                          <div className={`w-8 h-4.5 rounded-full p-[2px] transition-colors shrink-0 ${item.state.includes("In-App") ? getAccentBgClass() : 'bg-zinc-700'}`}>
                            <div className={`w-3 h-3 bg-white rounded-full shadow-md transition-transform transform ${item.state.includes("In-App") ? 'translate-x-3.5' : 'translate-x-0'}`} />
                          </div>
                        </div>

                        {/* Selector choice: Email */}
                        <div 
                          className="px-3.5 py-2 hover:bg-[#2e2e2e] flex items-center justify-between cursor-pointer transition-colors"
                          onClick={() => toggleNotificationChoice(item.key, "Email", item.state, item.setter)}
                        >
                          <span className="flex items-center gap-1.5">
                            <Mail className="w-3 h-3 text-emerald-450" />
                            Email
                          </span>
                          <div className={`w-8 h-4.5 rounded-full p-[2px] transition-colors shrink-0 ${item.state.includes("Email") ? getAccentBgClass() : 'bg-zinc-700'}`}>
                            <div className={`w-3 h-3 bg-white rounded-full shadow-md transition-transform transform ${item.state.includes("Email") ? 'translate-x-3.5' : 'translate-x-0'}`} />
                          </div>
                        </div>

                        {/* Selector choice: Push */}
                        <div 
                          className="px-3.5 py-2 hover:bg-[#2e2e2e] flex items-center justify-between cursor-pointer transition-colors"
                          onClick={() => toggleNotificationChoice(item.key, "Push", item.state, item.setter)}
                        >
                          <span className="flex items-center gap-1.5">
                            <Sparkles className="w-3 h-3 text-amber-450" />
                            Push Browser
                          </span>
                          <div className={`w-8 h-4.5 rounded-full p-[2px] transition-colors shrink-0 ${item.state.includes("Push") ? getAccentBgClass() : 'bg-zinc-700'}`}>
                            <div className={`w-3 h-3 bg-white rounded-full shadow-md transition-transform transform ${item.state.includes("Push") ? 'translate-x-3.5' : 'translate-x-0'}`} />
                          </div>
                        </div>
                        
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}

            {/* Smart Notification Simulation Center */}
            <div className="mt-5 bg-[#171717]/80 border border-[#2d2d2d]/80 rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse shrink-0" />
                <span className="font-bold text-[11px] text-zinc-200">Uji Sistem Notifikasi Maria</span>
              </div>
              <p className="text-[10px] text-zinc-450 leading-normal select-text">
                Gunakan panel simulasi di bawah untuk mengirim sampel notifikasi Maria. Notifikasi akan dikirimkan ke saluran pengiriman (Aplikasi, Email, Push) yang saat ini aktif:
              </p>
              
              <div className="grid grid-cols-3 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => triggerSimulation("reminders")}
                  className="bg-blue-600/10 hover:bg-blue-500/20 active:scale-95 text-blue-450 border border-blue-500/30 rounded-lg p-2 text-[10px] font-bold cursor-pointer transition-all flex flex-col justify-center items-center gap-1.5"
                >
                  <Bell className="w-3.5 h-3.5" />
                  <span>Kirim Pengingat</span>
                </button>

                <button
                  type="button"
                  onClick={() => triggerSimulation("updates")}
                  className="bg-emerald-600/10 hover:bg-emerald-500/20 active:scale-95 text-emerald-400 border border-emerald-500/30 rounded-lg p-2 text-[10px] font-bold cursor-pointer transition-all flex flex-col justify-center items-center gap-1.5"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Kirim Pembaruan</span>
                </button>

                <button
                  type="button"
                  onClick={() => triggerSimulation("suggestions")}
                  className="bg-amber-600/10 hover:bg-amber-500/20 active:scale-95 text-amber-400 border border-amber-500/30 rounded-lg p-2 text-[10px] font-bold cursor-pointer transition-all flex flex-col justify-center items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Kirim Saran</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB: PERSONALISASI ===================== */}
        {activeTab === "personalisasi" && (
          <div className="space-y-4 text-xs">
            <h3 className="text-zinc-100 font-bold text-sm tracking-tight pt-1">Personalisasi</h3>
            <div className="h-[1px] bg-[#2c2c2c] my-1" />

            {/* Gaya dan nada dasar (Exact options card list in Screenshot 5!) */}
            <div className="flex items-start justify-between py-1 border-b border-[#202020] gap-4">
              <div className="flex-1 space-y-0.5">
                <span className="text-zinc-100 font-medium block">Gaya dan nada dasar</span>
                <span className="text-[10px] text-zinc-450 block leading-relaxed">Atur gaya dan nada bicara Maria ketika merespons Anda. Ini tidak memengaruhi kemampuan Maria.</span>
              </div>
              <div className="relative shrink-0 self-center">
                <button
                  type="button"
                  onClick={() => setActiveDropdownId(activeDropdownId === "pers-style" ? null : "pers-style")}
                  className="bg-[#212121] hover:bg-[#2b2b2b] text-zinc-200 border border-[#2e2e2e]/60 text-[11px] font-semibold rounded-lg px-2.5 py-1.5 flex items-center justify-between gap-1.5 cursor-pointer w-28 text-left"
                >
                  <span>{
                    basicToneStyle === "Professional" ? "Profesional" :
                    basicToneStyle === "Warm" ? "Ramah" :
                    basicToneStyle === "Creative" ? "Nyentrik" :
                    basicToneStyle === "Technical" ? "Efisien" :
                    basicToneStyle === "Minimalist" ? "Sinis" : "Default"
                  }</span>
                  <ChevronDown className="w-3 h-3 text-zinc-500" />
                </button>
                {activeDropdownId === "pers-style" && (
                  <>
                    <div className="fixed inset-0 z-40 cursor-default" onClick={() => setActiveDropdownId(null)} />
                    <div className="absolute right-0 top-9 bg-[#212121] border border-[#2d2d2d] shadow-2xl rounded-xl py-1 z-55 text-[11px] w-52 text-zinc-200">
                      {[
                        { key: "Default", tone: "Professional" as MariaTone, desc: "Gaya dan nada bawaan" },
                        { key: "Profesional", tone: "Professional" as MariaTone, desc: "Rapi dan presisi" },
                        { key: "Ramah", tone: "Warm" as MariaTone, desc: "Hangat dan akrab" },
                        { key: "Jujur", tone: "Warm" as MariaTone, desc: "Terus terang dan memberi semangat" },
                        { key: "Nyentrik", tone: "Creative" as MariaTone, desc: "Menyenangkan dan imajinatif" },
                        { key: "Efisien", tone: "Technical" as MariaTone, desc: "Singkat dan lugas" },
                        { key: "Sinis", tone: "Minimalist" as MariaTone, desc: "Kritis dan sarkastis" },
                      ].map((opt) => {
                        const isMatchCurrent = basicToneStyle === opt.tone;
                        return (
                          <button
                            key={opt.key}
                            type="button"
                            onClick={() => handleToneSelect(opt.tone)}
                            className="w-full px-4 py-2 text-left hover:bg-[#2e2e2e] flex flex-col transition-colors cursor-pointer border-b border-zinc-800/40 last:border-0"
                          >
                            <div className="flex items-center justify-between w-full">
                              <span className="font-semibold text-zinc-100">{opt.key}</span>
                              {isMatchCurrent && <Check className={`w-3.5 h-3.5 ${getAccentTextClass()} shrink-0`} />}
                            </div>
                            <span className="text-[10px] text-zinc-450 mt-0.5">{opt.desc}</span>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Karakteristik Nested list options */}
            <div className="space-y-2 border-b border-[#202020] pb-3">
              <span className="text-zinc-100 font-medium block">Karakteristik</span>
              <span className="text-[10px] text-zinc-450 block leading-relaxed -mt-1">Pilih penyesuaian tambahan selain gaya dan nada dasar Anda.</span>
              
              <div className="grid grid-cols-2 gap-3 pt-2">
                
                {/* Characteristic Warm */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-[#212121]/50 border border-zinc-800">
                  <span className="text-zinc-300">Hangat</span>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setActiveDropdownId(activeDropdownId === "char-warm" ? null : "char-warm")}
                      className="bg-[#212121] hover:bg-[#2b2b2b] text-[10px] px-2 py-1 rounded border border-zinc-800 flex items-center gap-1 cursor-pointer text-zinc-100"
                    >
                      <span>{charWarm}</span>
                      <ChevronDown className="w-2.5 h-2.5 text-zinc-500" />
                    </button>
                    {activeDropdownId === "char-warm" && (
                      <div className="absolute right-0 top-7 bg-[#212121] border border-zinc-800 rounded shadow-2xl py-1 z-55 text-[10px] w-24">
                        {["Default", "Rendah", "Tinggi"].map(x => (
                          <button key={x} onClick={() => handleDropdownSelect("char_warm", x, setCharWarm)} className="w-full text-left px-2 py-1 hover:bg-[#2e2e2e]">{x}</button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Characteristic Enthusiastic */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-[#212121]/50 border border-zinc-800">
                  <span className="text-zinc-300">Antusias</span>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setActiveDropdownId(activeDropdownId === "char-enth" ? null : "char-enth")}
                      className="bg-[#212121] hover:bg-[#2b2b2b] text-[10px] px-2 py-1 rounded border border-zinc-800 flex items-center gap-1 cursor-pointer text-zinc-100"
                    >
                      <span>{charEnthusiastic}</span>
                      <ChevronDown className="w-2.5 h-2.5 text-zinc-500" />
                    </button>
                    {activeDropdownId === "char-enth" && (
                      <div className="absolute right-0 top-7 bg-[#212121] border border-zinc-800 rounded shadow-2xl py-1 z-55 text-[10px] w-24">
                        {["Default", "Rendah", "Tinggi"].map(x => (
                          <button key={x} onClick={() => handleDropdownSelect("char_enthusiastic", x, setCharEnthusiastic)} className="w-full text-left px-2 py-1 hover:bg-[#2e2e2e]">{x}</button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Characteristic Title & Lists */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-[#212121]/50 border border-zinc-800">
                  <span className="text-zinc-300">Judul & Daftar</span>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setActiveDropdownId(activeDropdownId === "char-list" ? null : "char-list")}
                      className="bg-[#212121] hover:bg-[#2b2b2b] text-[10px] px-2 py-1 rounded border border-zinc-800 flex items-center gap-1 cursor-pointer text-zinc-100"
                    >
                      <span>{charList}</span>
                      <ChevronDown className="w-2.5 h-2.5 text-zinc-500" />
                    </button>
                    {activeDropdownId === "char-list" && (
                      <div className="absolute right-0 top-7 bg-[#212121] border border-zinc-800 rounded shadow-2xl py-1 z-55 text-[10px] w-24">
                        {["Default", "Sering", "Jarang"].map(x => (
                          <button key={x} onClick={() => handleDropdownSelect("char_list", x, setCharList)} className="w-full text-left px-2 py-1 hover:bg-[#2e2e2e]">{x}</button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Characteristic Emoji */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-[#212121]/50 border border-zinc-800">
                  <span className="text-zinc-300">Emoji</span>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setActiveDropdownId(activeDropdownId === "char-emoji" ? null : "char-emoji")}
                      className="bg-[#212121] hover:bg-[#2b2b2b] text-[10px] px-2 py-1 rounded border border-zinc-800 flex items-center gap-1 cursor-pointer text-zinc-100"
                    >
                      <span>{charEmoji}</span>
                      <ChevronDown className="w-2.5 h-2.5 text-zinc-500" />
                    </button>
                    {activeDropdownId === "char-emoji" && (
                      <div className="absolute right-0 top-7 bg-[#212121] border border-zinc-800 rounded shadow-2xl py-1 z-55 text-[10px] w-24">
                        {["Default", "Sering", "Jarang"].map(x => (
                          <button key={x} onClick={() => handleDropdownSelect("char_emoji", x, setCharEmoji)} className="w-full text-left px-2 py-1 hover:bg-[#2e2e2e]">{x}</button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>

            {/* Jawaban cepat */}
            <div className="flex items-start justify-between py-1 border-b border-[#202020] gap-4">
              <div className="flex-1 space-y-0.5">
                <div className="text-zinc-100 font-medium">Jawaban cepat</div>
                <div className="text-[10px] text-zinc-440 leading-relaxed text-zinc-450">Maria terkadang dapat menggunakan pengetahuan umumnya untuk memberikan jawaban yang cepat dan mendalam. Jawaban ini tidak dipersonalisasi dan tidak menggunakan memori Anda.</div>
              </div>
              <div 
                onClick={() => handleToggleValue("char_quick", quickAnswers, setQuickAnswers)}
                className={`w-9 h-5 rounded-full p-[2.5px] cursor-pointer transition-colors shrink-0 self-center ${quickAnswers ? getAccentBgClass() : 'bg-[#3a3a3a]'}`}
              >
                <div className={`w-3.5 h-3.5 bg-white rounded-full shadow-xs transition-transform transform ${quickAnswers ? 'translate-x-4' : 'translate-x-0'}`} />
              </div>
            </div>

            {/* Instruksi Khusus */}
            <div className="space-y-1.5 border-b border-[#202020] pb-3">
              <span className="text-zinc-150 font-medium block">Instruksi khusus</span>
              <textarea
                rows={3}
                value={customInstructions}
                onChange={(e) => {
                  setCustomInstructions(e.target.value);
                  triggerSave({ customPrompt: e.target.value });
                }}
                className="w-full bg-[#212121] border border-[#2d2d2d] rounded-xl text-xs text-zinc-250 p-3 outline-none focus:border-zinc-500 font-medium text-zinc-300 resize-none font-sans"
                placeholder="Tulis instruksi khusus Anda di sini..."
              />
            </div>

            {/* Tentang Anda Fields Grid */}
            <div className="space-y-3.5 border-b border-[#202020] pb-4">
              <span className="text-zinc-100 font-bold block">Tentang Anda</span>
              
              {/* Nama panggilan */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-zinc-450 font-semibold block uppercase tracking-wider">Nama panggilan</span>
                <input
                  type="text"
                  value={userNickname}
                  maxLength={25}
                  onChange={(e) => {
                    setUserNickname(e.target.value);
                    triggerSave({ username: e.target.value });
                  }}
                  className="w-full bg-[#212121] border border-[#2d2d2d] rounded-xl text-xs px-3.5 py-2.5 text-zinc-300 outline-none focus:border-zinc-500"
                  placeholder="Maria harus memanggil Anda dengan sebutan apa?"
                />
              </div>

              {/* Pekerjaan */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-zinc-450 font-semibold block uppercase tracking-wider">Pekerjaan</span>
                <input
                  type="text"
                  value={userJob}
                  onChange={(e) => {
                    setUserJob(e.target.value);
                    safeLocalStorageSetItem("maria_user_job", e.target.value);
                  }}
                  className="w-full bg-[#212121] border border-[#2d2d2d] rounded-xl text-xs px-3.5 py-2.5 text-zinc-300 outline-none focus:border-zinc-500"
                  placeholder="Pekerjaan atau profesi Anda..."
                />
              </div>

              {/* Selengkapnya tentang Anda */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-zinc-450 font-semibold block uppercase tracking-wider">Selengkapnya tentang Anda</span>
                <input
                  type="text"
                  value={userBio}
                  onChange={(e) => {
                    setUserBio(e.target.value);
                    safeLocalStorageSetItem("maria_user_bio", e.target.value);
                  }}
                  className="w-full bg-[#212121] border border-[#2d2d2d] rounded-xl text-xs px-3.5 py-2.5 text-zinc-300 outline-none focus:border-zinc-500"
                  placeholder="Minat, nilai, atau preferensi yang perlu diingat"
                />
              </div>
            </div>

            {/* Memori block */}
            <div className="space-y-2.5 border-b border-[#202020] pb-4">
              <div className="flex items-center justify-between">
                <span className="text-zinc-100 font-bold block">Memori</span>
                <button
                  type="button"
                  className="px-2.5 py-1 text-[10px] font-bold border border-[#2e2e2e] hover:bg-zinc-800 text-zinc-300 rounded-lg hover:text-white cursor-pointer transition-colors"
                >
                  Kelola
                </button>
              </div>

              {/* Rujuk memori tersimpan */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-0.5">
                  <div className="text-zinc-100 font-medium text-[11px]">Rujuk memori tersimpan</div>
                  <div className="text-[10px] text-zinc-450 leading-relaxed">Izinkan Maria menyimpan dan menggunakan memori saat merespons.</div>
                </div>
                <div 
                  onClick={() => handleToggleValue("mem_save", memSave, setMemSave)}
                  className={`w-9 h-5 rounded-full p-[2.5px] cursor-pointer transition-colors shrink-0 self-center ${memSave ? getAccentBgClass() : 'bg-[#3a3a3a]'}`}
                >
                  <div className={`w-3.5 h-3.5 bg-white rounded-full shadow-xs transition-transform transform ${memSave ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
              </div>

              {/* Rujuk riwayat obrolan */}
              <div className="flex items-start justify-between gap-4 pt-1.5">
                <div className="flex-1 space-y-0.5">
                  <div className="text-zinc-100 font-medium text-[11px]">Rujuk riwayat obrolan</div>
                  <div className="text-[10px] text-zinc-450 leading-relaxed">Izinkan Maria merujuk ke percakapan terkini saat merespons.</div>
                </div>
                <div 
                  onClick={() => handleToggleValue("mem_ref", memRef, setMemRef)}
                  className={`w-9 h-5 rounded-full p-[2.5px] cursor-pointer transition-colors shrink-0 self-center ${memRef ? getAccentBgClass() : 'bg-[#3a3a3a]'}`}
                >
                  <div className={`w-3.5 h-3.5 bg-white rounded-full shadow-xs transition-transform transform ${memRef ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
              </div>

              <div className="text-[10px] text-zinc-500 leading-normal mt-1 block">
                Maria dapat menggunakan Memori untuk mempersonalisasi kueri ke penyedia pencarian, seperti Bing. <span className="underline cursor-pointer">Pelajari selengkapnya</span>
              </div>
            </div>

            {/* Lanjutan Colllapsible list block */}
            <div className="space-y-3">
              <button 
                type="button"
                onClick={() => setIsAdvancedExpanded(!isAdvancedExpanded)}
                className="w-full flex items-center justify-between text-zinc-100 font-bold hover:text-white cursor-pointer py-1 text-xs"
              >
                <span>Lanjutan</span>
                {isAdvancedExpanded ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
              </button>

              {isAdvancedExpanded && (
                <div className="space-y-4 pt-1 pl-1">
                  
                  {/* Pencarian web */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-0.5">
                      <div className="text-zinc-200 font-medium text-[11px]">Pencarian web</div>
                      <div className="text-[10px] text-zinc-450 leading-normal">Izinkan Maria mencari di web secara otomatis untuk jawaban.</div>
                    </div>
                    <div 
                      onClick={() => handleToggleValue("adv_web", advWeb, setAdvWeb)}
                      className={`w-9 h-5 rounded-full p-[2.5px] cursor-pointer transition-colors shrink-0 self-center ${advWeb ? getAccentBgClass() : 'bg-[#3a3a3a]'}`}
                    >
                      <div className={`w-3.5 h-3.5 bg-white rounded-full shadow-xs transition-transform transform ${advWeb ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                  </div>

                  {/* Kanvas */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-0.5">
                      <div className="text-zinc-200 font-medium text-[11px]">Kanvas</div>
                      <div className="text-[10px] text-zinc-450 leading-normal">Berkolaborasi dengan Maria di teks dan kode.</div>
                    </div>
                    <div 
                      onClick={() => handleToggleValue("adv_canvas", advCanvas, setAdvCanvas)}
                      className={`w-9 h-5 rounded-full p-[2.5px] cursor-pointer transition-colors shrink-0 self-center ${advCanvas ? getAccentBgClass() : 'bg-[#3a3a3a]'}`}
                    >
                      <div className={`w-3.5 h-3.5 bg-white rounded-full shadow-xs transition-transform transform ${advCanvas ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                  </div>

                  {/* Suara Maria AI */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-0.5">
                      <div className="text-zinc-200 font-medium text-[11px]">Suara Maria AI</div>
                      <div className="text-[10px] text-zinc-450 leading-normal">Aktifkan Suara di Maria AI.</div>
                    </div>
                    <div 
                      onClick={() => handleToggleValue("adv_voice_chat", advVoiceChat, setAdvVoiceChat)}
                      className={`w-9 h-5 rounded-full p-[2.5px] cursor-pointer transition-colors shrink-0 self-center ${advVoiceChat ? getAccentBgClass() : 'bg-[#3a3a3a]'}`}
                    >
                      <div className={`w-3.5 h-3.5 bg-white rounded-full shadow-xs transition-transform transform ${advVoiceChat ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                  </div>

                  {/* Suara tingkat lanjut */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-0.5">
                      <div className="text-zinc-200 font-medium text-[11px]">Suara tingkat lanjut</div>
                      <div className="text-[10px] text-zinc-450 leading-normal">Lakukan percakapan lebih natural dalam Suara.</div>
                    </div>
                    <div 
                      onClick={() => handleToggleValue("adv_smart_voice", advSmartVoice, setAdvSmartVoice)}
                      className={`w-9 h-5 rounded-full p-[2.5px] cursor-pointer transition-colors shrink-0 self-center ${advSmartVoice ? getAccentBgClass() : 'bg-[#3a3a3a]'}`}
                    >
                      <div className={`w-3.5 h-3.5 bg-white rounded-full shadow-xs transition-transform transform ${advSmartVoice ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                  </div>

                  {/* Pencarian konektor */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-0.5">
                      <div className="text-zinc-200 font-medium text-[11px]">Pencarian konektor</div>
                      <div className="text-[10px] text-zinc-450 leading-normal">Izinkan Maria mencari sumber terhubung untuk jawaban.</div>
                    </div>
                    <div 
                      onClick={() => handleToggleValue("adv_connector", advConnector, setAdvConnector)}
                      className={`w-9 h-5 rounded-full p-[2.5px] cursor-pointer transition-colors shrink-0 self-center ${advConnector ? getAccentBgClass() : 'bg-[#3a3a3a]'}`}
                    >
                      <div className={`w-3.5 h-3.5 bg-white rounded-full shadow-xs transition-transform transform ${advConnector ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                  </div>

                </div>
              )}
            </div>

          </div>
        )}

        {/* ===================== TAB: APLIKASI ===================== */}
        {activeTab === "aplikasi" && (
          <div className="space-y-4 text-xs">
            <h3 className="text-zinc-100 font-bold text-sm tracking-tight pt-1">Aplikasi</h3>
            <div className="h-[1px] bg-[#2c2c2c] my-1" />

            <div className="p-4 bg-[#212121]/50 border border-zinc-800 rounded-2xl space-y-4">
              <div>
                <span className="text-zinc-100 font-semibold block text-[13px]">Sambungan Akun</span>
                <p className="text-[10.5px] text-zinc-450 leading-relaxed mt-0.5">Koneksikan Maria AI dengan lancar ke penyimpanan Cloud atau akun asisten eksternal Anda untuk sinkronisasi dokumen.</p>
                <button
                  type="button"
                  className="mt-3 px-3 py-1.8 bg-zinc-800 hover:bg-zinc-750 text-zinc-200 text-[10.5px] rounded-lg cursor-pointer font-bold inline-flex items-center gap-1.5 transition-colors"
                >
                  <span>Sambung Google Drive</span>
                  <ExternalLink className="w-3 h-3 text-zinc-400" />
                </button>
              </div>

              <div className="h-[1px] bg-zinc-800" />

              <div>
                <span className="text-zinc-100 font-semibold block text-[13px]">Gunakan Aplikasi Seluler</span>
                <p className="text-[10.5px] text-zinc-450 leading-relaxed mt-0.5">Pindai kode QR untuk langsung mengunduh aplikasi Maria di smartphone Anda dengan fitur respons suara real-time hibrida.</p>
                <div className="mt-3 flex items-center gap-4 bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-850 max-w-[280px]">
                  <div className="w-14 h-14 bg-zinc-350 rounded-lg flex items-center justify-center font-bold text-zinc-900 text-xs text-center shrink-0">
                    [ QR Code ]
                  </div>
                  <div className="text-[9.5px] text-zinc-400 leading-normal">
                    Pindai layar Anda dengan kamera HP untuk mengunduh versi khusus APK Android / iOS secara mandiri.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB: TAGIHAN ===================== */}
        {activeTab === "tagihan" && (
          <div className="space-y-4 text-xs">
            <h3 className="text-zinc-100 font-bold text-sm tracking-tight pt-1">Tagihan</h3>
            <div className="h-[1px] bg-[#2c2c2c] my-1" />

            <div className="bg-[#212121]/50 border border-zinc-800 rounded-2xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-zinc-450 font-bold uppercase tracking-wider block">Paket Aktif Saat Ini</span>
                  <span className={`text-base font-extrabold ${getAccentTextClass()} mt-0.5 block flex items-center gap-1.5`}>
                    Maria AI Premium Plus
                    <span className={`text-[8.5px] font-black tracking-widest px-1.5 py-0.5 rounded uppercase ${getBadgeClass()}`}>
                      ACTIVE
                    </span>
                  </span>
                </div>
                <button
                  type="button"
                  disabled
                  className="px-3.5 py-1.8 bg-[#2d2d2d] text-zinc-450 border border-zinc-700 text-[10.5px] rounded-lg font-bold"
                >
                  Sudah Upgrade
                </button>
              </div>

              <div className="h-[1px] bg-zinc-800" />

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-zinc-900/40 p-3 rounded-xl border border-zinc-850">
                  <span className="text-[9px] text-zinc-500 font-bold block uppercase">Batas Token Tersisa</span>
                  <span className="block text-sm font-semibold text-zinc-200 mt-1">Tak Terbatas (PRO)</span>
                </div>
                <div className="bg-zinc-900/40 p-3 rounded-xl border border-zinc-850">
                  <span className="text-[9px] text-zinc-500 font-bold block uppercase">Masa Berlaku Kuota</span>
                  <span className="block text-sm font-semibold text-zinc-200 mt-1">Selamanya (Aktif)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB: KONTROL DATA ===================== */}
        {activeTab === "kontrol-data" && (
          <div className="space-y-4 text-xs">
            <h3 className="text-zinc-100 font-bold text-sm tracking-tight pt-1">Kontrol data</h3>
            <div className="h-[1px] bg-[#2c2c2c] my-1" />

            <div className="space-y-4">
              
              {/* Riwayat & Pelatihan */}
              <div className="flex items-start justify-between py-1 border-b border-[#202020] gap-4">
                <div className="flex-1 space-y-0.5">
                  <div className="text-zinc-100 font-medium">Riwayat & Pelatihan</div>
                  <div className="text-[10px] text-zinc-450 leading-relaxed">Simpan obrolan baru di perangkat ini dan izinkan untuk meningkatkan kemampuan model asisten Maria secara anonim.</div>
                </div>
                <div className={`w-9 h-5 rounded-full p-[2.5px] cursor-pointer shrink-0 self-center ${getAccentBgClass()}`}>
                  <div className="w-3.5 h-3.5 bg-white rounded-full shadow-xs translate-x-4" />
                </div>
              </div>

              {/* Tautan Bersama */}
              <div className="flex items-center justify-between py-1 border-b border-[#202020]">
                <div className="space-y-0.5">
                  <div className="text-zinc-100 font-medium">Tautan Bersama</div>
                  <div className="text-[10px] text-zinc-450">Kelola tautan publik percakapan yang pernah Anda bagikan.</div>
                </div>
                <button
                  type="button"
                  className="px-3 py-1.5 bg-[#212121] hover:bg-[#2b2b2b] text-[10.5px] font-semibold rounded-lg border border-zinc-800 text-zinc-300 hover:text-white cursor-pointer"
                >
                  Kelola
                </button>
              </div>

              {/* Ekspor data */}
              <div className="flex items-center justify-between py-1 border-b border-[#202020]">
                <div className="space-y-0.5">
                  <div className="text-zinc-100 font-medium">Ekspor data</div>
                  <div className="text-[10px] text-zinc-450">Kirim salinan seluruh data obrolan dalam format JSON terkompresi.</div>
                </div>
                <button
                  type="button"
                  className="px-3 py-1.5 bg-[#212121] hover:bg-[#2b2b2b] text-[10.5px] font-semibold rounded-lg border border-zinc-800 text-zinc-300 hover:text-white cursor-pointer"
                >
                  Ekspor
                </button>
              </div>

              {/* Hapus riwayat obrolan */}
              <div className="flex items-center justify-between py-1.5 border-b border-[#202020]">
                <div className="space-y-0.5">
                  <div className="text-zinc-100 font-medium">Bersihkan Obrolan</div>
                  <div className="text-[10px] text-zinc-450">Hapus habis semua data percakapan aktif dari database lokal perangkat ini.</div>
                </div>
                <button
                  type="button"
                  onClick={onClearHistory}
                  disabled={messageCount === 0}
                  className={`px-3 py-1.5 text-[10.5px] font-bold rounded-lg border flex items-center gap-1.5 transition-colors cursor-pointer ${
                    messageCount === 0
                      ? "bg-[#212121] border-[#2c2c2c] text-zinc-650 opacity-40 cursor-not-allowed"
                      : "bg-rose-950/20 border-rose-900/60 text-rose-400 hover:bg-rose-900/20"
                  }`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Semua</span>
                </button>
              </div>



            </div>
          </div>
        )}

      </div>

      {/* Persistent Save Status Notification Banner */}
      {saveBannerText && (
        <div className={`absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl backdrop-blur-xs text-[10.5px] font-semibold text-white shadow-xl flex items-center gap-1.5 animate-fade-in z-50 ${getAccentBgClass()}`}>
          <Info className="w-3.5 h-3.5 shrink-0 animate-bounce" />
          <span>{saveBannerText}</span>
        </div>
      )}

    </div>
  );
}
