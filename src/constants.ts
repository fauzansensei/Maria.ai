import { UserSettings, PromptStarter, MariaTone } from "./types";

export const DEFAULT_WIDGETS = [
  { id: "quick-stats", name: "Statistik Pesan", visible: true, order: 1 },
  { id: "active-reminders", name: "Pengingat & Agenda", visible: true, order: 2 },
  { id: "prompt-insight", name: "Rekomendasi Topik", visible: true, order: 3 },
  { id: "maria-status", name: "Status Layanan", visible: true, order: 4 },
];

export const DEFAULT_SETTINGS: UserSettings = {
  username: "User",
  tone: "Professional",
  languageStyle: "Baku",
  customPrompt: "",
  theme: "classic-blue",
  widgets: DEFAULT_WIDGETS,
  notifications: {
    soundEnabled: true,
    statusUpdates: true,
    remindersEnabled: true,
  },
  elevenlabsApiKey: "",
  elevenlabsVoiceId: "EXAVITQu4vr4xnSDxMaL",
  elevenlabsVoiceModel: "eleven_flash_v2_5",
  elevenlabsCustomVoiceId: "",
  voiceEnabled: false,
};

export const PROMPT_STARTERS: PromptStarter[] = [
  {
    id: "starter-1",
    title: "Email Profesional",
    desc: "Tulis email negosiasi cuti atau tanggapan keluhan.",
    text: "Tolong bantu saya menyusun email tanggapan keluhan pelanggan yang profesional, sopan, dan menawarkan solusi penggantian barang.",
  },
  {
    id: "starter-2",
    title: "Analisis Ide Bisnis",
    desc: "Minta pandangan Maria untuk meriset kompetitor.",
    text: "Saya punya ide bisnis kedai kopi ramah lingkungan dengan nol limbah plastik. Tolong berikan analisis SWOT sederhana dan strategi pemasaran digital yang inovatif.",
  },
  {
    id: "starter-3",
    title: "Koreksi Tata Bahasa",
    desc: "Perbaiki tulisan agar rapi, formal, dan meyakinkan.",
    text: "Tolong perbaiki paragraf ini agar terdengar sangat profesional dan meyakinkan untuk ditaruh di portofolio saya: 'Saya sangat suka belajar hal baru dan bisa kerja tim dengan mantap.'",
  },
  {
    id: "starter-4",
    title: "Buat Rencana Belajar",
    desc: "Mendesain jadwal belajar topik baru selama 30 hari.",
    text: "Saya ingin mempelajari dasar-dasar manajemen proyek dan metodologi Agile dalam 30 hari sebagai pemula. Tolong buatkan silabus belajar mingguan yang rapi.",
  },
];

export interface ToneOption {
  value: MariaTone;
  label: string;
  description: string;
  emoji: string;
  badgeColor: string;
}

export const TONE_OPTIONS: ToneOption[] = [
  {
    value: "Professional",
    label: "Profesional & Formal",
    description: "Bahasa rapi, sopan, santun, dan sangat terstruktur cocok untuk pekerjaan.",
    emoji: "💼",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
  },
  {
    value: "Warm",
    label: "Ramah & Hangat",
    description: "Sarat empati, bersahabat, penuh perhatian, dan menenangkan.",
    emoji: "🌸",
    badgeColor: "bg-rose-50 text-rose-700 border-rose-200",
  },
  {
    value: "Creative",
    label: "Kreatif & Berenergi",
    description: "Penuh ide segar, menggunakan analogi unik, ekspresif dan bersemangat.",
    emoji: "✨",
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
  },
  {
    value: "Technical",
    label: "Teknis & Presisi",
    description: "Sangat logis, saintifik, fokus pada data, kode, atau fakta teknis.",
    emoji: "🔬",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  {
    value: "Minimalist",
    label: "Minimalis & Padat",
    description: "Jawaban super ringkas, langsung ke intinya, hemat kata.",
    emoji: "🎯",
    badgeColor: "bg-slate-50 text-slate-700 border-slate-200",
  },
];

export interface ThemeOption {
  value: string;
  name: string;
  primary: string;
  primaryBg: string;
  bgGradient: string;
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    value: "classic-blue",
    name: "Classic Blue (Default)",
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    primaryBg: "bg-blue-50 border-blue-100 text-blue-700",
    bgGradient: "from-blue-600 via-sky-600 to-indigo-600",
  },
  {
    value: "emerald-green",
    name: "Emerald Oasis",
    primary: "bg-emerald-600 text-white hover:bg-emerald-700",
    primaryBg: "bg-emerald-50 border-emerald-100 text-emerald-700",
    bgGradient: "from-emerald-600 via-teal-600 to-cyan-600",
  },
  {
    value: "cosmic-purple",
    name: "Cosmic Violet",
    primary: "bg-purple-600 text-white hover:bg-purple-700",
    primaryBg: "bg-purple-50 border-purple-100 text-purple-700",
    bgGradient: "from-purple-600 via-pink-600 to-indigo-600",
  },
  {
    value: "minimal-dark",
    name: "Monochrome Minimalist",
    primary: "bg-slate-900 text-white hover:bg-slate-800",
    primaryBg: "bg-slate-100 border-slate-200 text-slate-800",
    bgGradient: "from-slate-800 via-slate-750 to-slate-900",
  },
];
