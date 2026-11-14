export interface NotebookSource {
  id: string;
  title: string;
  content: string;
  type: 'text' | 'file' | 'chat';
  createdAt: string;
}

export interface NotebookItem {
  id: string;
  title: string;
  description: string;
  sources: NotebookSource[];
  notes: string;
  aiSummary?: string;
  updatedAt: string;
}

export interface ProjectItem {
  id: string;
  name: string;
  description: string;
  color: 'blue' | 'emerald' | 'purple' | 'amber' | 'rose' | 'cyan';
  customInstruction: string;
  contextNotes: string;
  updatedAt: string;
}

export interface SkillItem {
  id: string;
  name: string;
  category: string;
  description: string;
  promptTemplate: string;
  isBuiltIn?: boolean;
}

export interface StudyFlashcard {
  id: string;
  front: string;
  back: string;
  mastered?: boolean;
}

export interface StudySetItem {
  id: string;
  topic: string;
  level: string;
  cards: StudyFlashcard[];
  createdAt: string;
}

export interface AppConnectorItem {
  id: string;
  name: string;
  category: string;
  description: string;
  descriptionEn: string;
  launchQuery: string;
  url?: string;
}

const KEYS = {
  NOTEBOOKS: 'maria_notebooks',
  PROJECTS: 'maria_projects',
  SKILLS: 'maria_custom_skills',
  STUDY_SETS: 'maria_study_sets',
  CONNECTORS: 'maria_connectors',
} as const;

export const DEFAULT_NOTEBOOKS: NotebookItem[] = [
  {
    id: 'nb-welcome',
    title: 'Catatan Riset & Ide Produk',
    description: 'Kumpulan sumber riset, ringkasan dokumen, dan catatan penting.',
    sources: [
      {
        id: 'src-1',
        title: 'Arsitektur Maria AI',
        content:
          'Maria AI mendukung pencarian real-time Google Search, analisis dokumen & video multimodal, serta Studio Gambar AI.',
        type: 'text',
        createdAt: new Date().toISOString(),
      },
    ],
    notes: '• Fokus pada kecepatan UX mobile\n• Sinkronisasi cloud lintas perangkat\n• Fitur Notebook & Study mode terintegrasi',
    aiSummary: '',
    updatedAt: new Date().toISOString(),
  },
];

export const DEFAULT_PROJECTS: ProjectItem[] = [
  {
    id: 'proj-fullstack',
    name: 'Pengembangan Aplikasi Web',
    description: 'Workspace khusus arsitektur kode React, TypeScript, API & database.',
    color: 'blue',
    customInstruction:
      'Bertindaklah sebagai Senior Full-Stack Engineer. Berikan kode TypeScript/React yang bersih, modular, aman, dan langsung siap pakai beserta penjelasan ringkas.',
    contextNotes: 'Stack utama: React 19, Vite, Tailwind CSS v4, Express, Cloud Firestore.',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'proj-content',
    name: 'Konten & Strategi Kreatif',
    description: 'Perencanaan skrip video, copywriting, dan ide kampanye digital.',
    color: 'purple',
    customInstruction:
      'Bertindaklah sebagai Creative Director & Copywriter. Buat hook yang kuat, bahasa yang mengalir alami, persuasif, dan berorientasi audiens.',
    contextNotes: 'Target audiens: kreator digital, developer muda, dan pegiat teknologi.',
    updatedAt: new Date().toISOString(),
  },
];

export const BUILTIN_SKILLS: SkillItem[] = [
  {
    id: 'skill-code-architect',
    name: 'Code Reviewer & Debugger',
    category: 'Engineering',
    description: 'Audit bug, optimasi performa, dan refactoring kode dengan presisi tinggi.',
    promptTemplate:
      'Bertindaklah sebagai Principal Software Engineer. Analisis bug, bottleneck performa, dan potensi edge case pada kode atau masalah berikut, lalu berikan solusi bersih siap produksi.',
    isBuiltIn: true,
  },
  {
    id: 'skill-academic-summarizer',
    name: 'Academic & Journal Analyst',
    category: 'Riset & Edukasi',
    description: 'Bedah paper ilmiah, metodologi, dan buat kesimpulan terstruktur.',
    promptTemplate:
      'Bertindaklah sebagai Peneliti Akademik Senior. Bedah topik atau teks berikut secara sistematis: (1) Inti Permasalahan, (2) Metodologi & Temuan Kunci, (3) Implikasi & Batasan.',
    isBuiltIn: true,
  },
  {
    id: 'skill-english-coach',
    name: 'English Fluency Coach',
    category: 'Bahasa',
    description: 'Koreksi grammar, tingkatkan kosakata natural, dan latihan percakapan.',
    promptTemplate:
      'Act as a supportive native English speaking & writing coach. Correct any grammar mistakes gently, offer more natural phrasing, and explain why clearly.',
    isBuiltIn: true,
  },
  {
    id: 'skill-cyber-audit',
    name: 'Security & Threat Auditor',
    category: 'Keamanan',
    description: 'Periksa celah XSS, injection, rules database, dan hardening API.',
    promptTemplate:
      'Bertindaklah sebagai AppSec Specialist. Evaluasi risiko keamanan, validasi input, aturan otorisasi, serta berikan langkah mitigasi konkret dan terukur.',
    isBuiltIn: true,
  },
];

export const APP_CONNECTORS: AppConnectorItem[] = [
  {
    id: 'conn-youtube',
    name: 'YouTube',
    category: 'Media & Video',
    description: 'Cari referensi video, ringkas topik tontonan, atau buka YouTube langsung.',
    descriptionEn: 'Search video references, summarize topics, or launch YouTube directly.',
    launchQuery: 'buka youtube',
    url: 'https://www.youtube.com',
  },
  {
    id: 'conn-spotify',
    name: 'Spotify',
    category: 'Musik & Audio',
    description: 'Putar playlist musik fokus belajar/kerja dan rekomendasi lagu via Windows Open.',
    descriptionEn: 'Play focus music playlists and song recommendations via Windows Open.',
    launchQuery: 'putar lagu di spotify',
    url: 'https://open.spotify.com',
  },
  {
    id: 'conn-github',
    name: 'GitHub',
    category: 'Developer',
    description: 'Bantu review repo, buat pesan commit, PR description, dan akses cepat GitHub.',
    descriptionEn: 'Review repos, craft commit messages, PR descriptions, and quick-launch GitHub.',
    launchQuery: 'buka github',
    url: 'https://github.com',
  },
  {
    id: 'conn-drive',
    name: 'Google Drive & Docs',
    category: 'Produktivitas',
    description: 'Draft dokumen terstruktur siap tempel ke Docs atau susun outline presentasi.',
    descriptionEn: 'Draft structured documents ready for Google Docs or slide outlines.',
    launchQuery: 'buka google drive',
    url: 'https://drive.google.com',
  },
  {
    id: 'conn-discord',
    name: 'Discord',
    category: 'Komunitas',
    description: 'Susun pengumuman server, bot command, atau buka aplikasi Discord cepat.',
    descriptionEn: 'Draft server announcements, bot commands, or quick-launch Discord.',
    launchQuery: 'open discord',
    url: 'https://discord.com/app',
  },
  {
    id: 'conn-notion',
    name: 'Notion Workspace',
    category: 'Catatan & Wiki',
    description: 'Ekspor format tabel, database template, dan catatan rapat bergaya Notion.',
    descriptionEn: 'Export table formats, database templates, and Notion-style meeting notes.',
    launchQuery: 'buka notion',
    url: 'https://www.notion.so',
  },
];

type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribeWorkspace(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify() {
  listeners.forEach((fn) => fn());
}

export function loadNotebooks(): NotebookItem[] {
  try {
    const raw = localStorage.getItem(KEYS.NOTEBOOKS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return DEFAULT_NOTEBOOKS;
}

export function saveNotebooks(items: NotebookItem[]) {
  try {
    localStorage.setItem(KEYS.NOTEBOOKS, JSON.stringify(items));
    notify();
  } catch {}
}

export function loadProjects(): ProjectItem[] {
  try {
    const raw = localStorage.getItem(KEYS.PROJECTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return DEFAULT_PROJECTS;
}

export function saveProjects(items: ProjectItem[]) {
  try {
    localStorage.setItem(KEYS.PROJECTS, JSON.stringify(items));
    notify();
  } catch {}
}

export function loadCustomSkills(): SkillItem[] {
  try {
    const raw = localStorage.getItem(KEYS.SKILLS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

export function saveCustomSkills(items: SkillItem[]) {
  try {
    localStorage.setItem(KEYS.SKILLS, JSON.stringify(items));
    notify();
  } catch {}
}

export function loadStudySets(): StudySetItem[] {
  try {
    const raw = localStorage.getItem(KEYS.STUDY_SETS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

export function saveStudySets(items: StudySetItem[]) {
  try {
    localStorage.setItem(KEYS.STUDY_SETS, JSON.stringify(items));
    notify();
  } catch {}
}

export function loadEnabledConnectors(): string[] {
  try {
    const raw = localStorage.getItem(KEYS.CONNECTORS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return ['conn-youtube', 'conn-spotify', 'conn-github'];
}

export function saveEnabledConnectors(ids: string[]) {
  try {
    localStorage.setItem(KEYS.CONNECTORS, JSON.stringify(ids));
    notify();
  } catch {}
}
