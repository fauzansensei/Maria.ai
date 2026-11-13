import React, { useState } from 'react';
import {
  Compass,
  Sparkles,
  Code2,
  Palette,
  GraduationCap,
  Briefcase,
  Dna,
  Bot,
  Search,
  MessageSquare,
  ArrowRight,
  Star,
  Users,
  Zap,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.tsx';
import { useTheme } from '../context/ThemeContext.tsx';

interface AgentCard {
  id: string;
  name: string;
  category: string;
  tagline: string;
  description: string;
  avatarIcon: string;
  rating: string;
  usageCount: string;
  promptStarter: string;
  color: string;
}

const AGENTS: AgentCard[] = [
  {
    id: 'agent-1',
    name: 'Dokter Riset & Bio-Molekul',
    category: 'science',
    tagline: 'Spesialis Biomedis & Genomik',
    description: 'Analisis urutan protein, interaksi ligan-reseptor, dan pencarian literatur PubMed terbaru.',
    avatarIcon: '🧬',
    rating: '4.9',
    usageCount: '18.4k',
    promptStarter: 'Analisis struktur mutasi hotspot TP53 dan dampak perubahannya pada ikatan afinitas DNA target.',
    color: 'from-emerald-600/30 to-teal-900/40 border-emerald-500/30 text-emerald-400',
  },
  {
    id: 'agent-2',
    name: 'Senior Full-Stack Architect',
    category: 'coding',
    tagline: 'Arsitektur Kode, Refactor & Debug',
    description: 'Membantu optimasi performa React, TypeScript, sistem konkurensi, dan keamanan database.',
    avatarIcon: '💻',
    rating: '5.0',
    usageCount: '34.2k',
    promptStarter: 'Bantu rancang arsitektur clean micro-frontend dengan state management terdistribusi dan zero latency.',
    color: 'from-cyan-600/30 to-blue-900/40 border-cyan-500/30 text-cyan-400',
  },
  {
    id: 'agent-3',
    name: 'Creative Content Alchemist',
    category: 'creative',
    tagline: 'Copywriting Persuasif & Storytelling',
    description: 'Membuat narasi peluncuran produk, hook viral media sosial, dan naskah video cinematic.',
    avatarIcon: '🎨',
    rating: '4.8',
    usageCount: '27.1k',
    promptStarter: 'Buatkan skrip video peluncuran aplikasi asisten AI dengan storytelling yang emosional dan elegan.',
    color: 'from-fuchsia-600/30 to-purple-900/40 border-fuchsia-500/30 text-fuchsia-400',
  },
  {
    id: 'agent-4',
    name: 'Tutor Belajar & Riset Akademis',
    category: 'education',
    tagline: 'Pemahaman Konsep Kompleks Cepat',
    description: 'Menjelaskan fisika kuantum, matematika lanjutan, kalkulus, dan metodologi riset dengan metode Feynman.',
    avatarIcon: '🎓',
    rating: '4.9',
    usageCount: '22.8k',
    promptStarter: 'Jelaskan konsep dasar Quantum Computing dan qubit seperti saya adalah mahasiswa pemula.',
    color: 'from-amber-600/30 to-orange-900/40 border-amber-500/30 text-amber-400',
  },
  {
    id: 'agent-5',
    name: 'Chief Strategy & Product Officer',
    category: 'productivity',
    tagline: 'Rencana Bisnis, OKR & Eksekusi',
    description: 'Merumuskan validasi pasar produk, analisis unit economics, dan peta jalan fitur triwulanan.',
    avatarIcon: '📊',
    rating: '4.9',
    usageCount: '15.6k',
    promptStarter: 'Buatkan rencana go-to-market produk B2B SaaS dengan budget bootstrap dalam 90 hari.',
    color: 'from-violet-600/30 to-indigo-900/40 border-violet-500/30 text-violet-400',
  },
  {
    id: 'agent-6',
    name: 'DEFCON Cyber Security Guardian',
    category: 'security',
    tagline: 'Audit Keamanan & Zero-Trust',
    description: 'Memeriksa celah keamanan API, audit aturan Firestore, mitigasi injection, dan isolasi identitas.',
    avatarIcon: '🛡️',
    rating: '5.0',
    usageCount: '11.3k',
    promptStarter: 'Audit konfigurasi aturan keamanan cloud firestore berikut dan tunjukkan potensi bypass hak akses.',
    color: 'from-rose-600/30 to-red-900/40 border-rose-500/30 text-rose-400',
  },
];

interface DiscoverAreaProps {
  onBackToChat: () => void;
  onLaunchAgent: (prompt: string, title: string) => void;
}

export const DiscoverArea: React.FC<DiscoverAreaProps> = React.memo(({ onBackToChat, onLaunchAgent }) => {
  const { isEn } = useLanguage();
  const { isDark } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filterTabs = [
    { id: 'all', label: isEn ? 'All Agents' : 'Semua Agen' },
    { id: 'science', label: isEn ? 'Science Research' : 'Analisis Sains' },
    { id: 'coding', label: isEn ? 'Coding & Tech' : 'Koding & Teknis' },
    { id: 'creative', label: isEn ? 'Creative & Copy' : 'Kreatif & Narasi' },
    { id: 'education', label: isEn ? 'Study & Education' : 'Belajar & Edukasi' },
    { id: 'productivity', label: isEn ? 'Productivity' : 'Produktivitas' },
    { id: 'security', label: isEn ? 'Cyber Security' : 'Keamanan Siber' },
  ];

  const filteredAgents = AGENTS.filter((agent) => {
    const matchesCategory = selectedCategory === 'all' || agent.category === selectedCategory;
    const matchesSearch =
      agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.tagline.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className={`flex-1 flex flex-col h-full overflow-hidden ${isDark ? 'bg-[#0e0f12] text-white' : 'bg-slate-50 text-slate-900'}`}>
      {/* Header Bar */}
      <div className={`flex items-center justify-between px-6 py-4 border-b ${isDark ? 'border-[#20222f] bg-[#14151b]' : 'border-slate-200 bg-white'}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-500 dark:text-purple-400 flex items-center justify-center font-bold">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className={`text-base font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>Discover Maria AI</h2>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-500/20">
                AI Agents Hub
              </span>
            </div>
            <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>
              {isEn ? 'Explore curated AI agents to accelerate your workflow' : 'Eksplorasi agen kecerdasan buatan terkurasi untuk mempercepat alur kerja Anda'}
            </p>
          </div>
        </div>

        <button
          onClick={onBackToChat}
          className="py-1.5 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold shadow-md shadow-blue-900/20 flex items-center gap-1.5"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>{isEn ? 'Back to Chat' : 'Kembali ke Chat'}</span>
        </button>
      </div>

      {/* Hero Banner inside Discover */}
      <div className={`px-6 py-5 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${isDark ? 'bg-gradient-to-r from-[#171824] via-[#1a1c2e] to-[#12131d] border-[#232536]' : 'bg-gradient-to-r from-indigo-50 via-purple-50 to-white border-slate-200'}`}>
        <div>
          <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> {isEn ? 'Community Featured Collection' : 'Koleksi Unggulan Komunitas'}
          </span>
          <h3 className={`text-lg font-bold mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {isEn ? 'Pick a Specialized AI Persona for Any Task' : 'Pilih Persona AI Spesifik Untuk Tugas Tertentu'}
          </h3>
          <p className={`text-xs max-w-xl mt-0.5 ${isDark ? 'text-neutral-400' : 'text-slate-600'}`}>
            {isEn ? 'Each agent comes with optimized system instructions, multi-step reasoning, and tailored response formatting.' : 'Setiap agen dilengkapi dengan instruksi sistem teroptimasi, penalaran bertingkat, dan format respons yang disesuaikan.'}
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72 shrink-0">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isEn ? 'Search agents or personas...' : 'Cari agen atau persona...'}
            className={`w-full pl-9 pr-3 py-2 border rounded-xl text-xs focus:outline-none focus:border-purple-500 ${isDark ? 'bg-[#12131c] border-[#2e3146] text-white placeholder-neutral-500' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'}`}
          />
        </div>
      </div>

      {/* Category Pills */}
      <div className={`px-6 py-3 border-b flex items-center gap-1.5 overflow-x-auto scrollbar-none ${isDark ? 'border-[#1b1d28] bg-[#111218]' : 'border-slate-200 bg-white'}`}>
        {filterTabs.map((tab) => {
          const isActive = selectedCategory === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSelectedCategory(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap ${
                isActive
                  ? 'bg-purple-600 text-white shadow-sm font-semibold'
                  : isDark
                  ? 'bg-[#181923] text-neutral-400 hover:text-white hover:bg-[#222432]'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Agents Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
          {filteredAgents.map((agent) => (
            <div
              key={agent.id}
              className={`border hover:border-purple-500/40 rounded-2xl p-5 flex flex-col justify-between shadow-lg group ${isDark ? 'bg-[#14151f] border-[#232536]' : 'bg-white border-slate-200'}`}
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className={`text-3xl p-2.5 rounded-2xl border shadow-inner ${isDark ? 'bg-neutral-900 border-[#2d3045]' : 'bg-slate-100 border-slate-200'}`}>
                    {agent.avatarIcon}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-neutral-400">
                    <span className="flex items-center gap-1 text-amber-500 dark:text-amber-400 font-semibold">
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                      {agent.rating}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3 text-neutral-500" />
                      {agent.usageCount}
                    </span>
                  </div>
                </div>

                <h4 className={`text-sm font-bold group-hover:text-purple-500 dark:group-hover:text-purple-300 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {agent.name}
                </h4>
                <p className="text-[11px] font-medium text-purple-600 dark:text-purple-400 mb-2">
                  {agent.tagline}
                </p>
                <p className={`text-xs leading-relaxed mb-4 line-clamp-2 ${isDark ? 'text-neutral-400' : 'text-slate-600'}`}>
                  {agent.description}
                </p>
              </div>

              <div className={`pt-3 border-t flex items-center justify-between ${isDark ? 'border-[#1e202e]' : 'border-slate-100'}`}>
                <span className="text-[11px] text-neutral-500 truncate max-w-[140px]">
                  {isEn ? 'Guided Mode' : 'Mode Terarah'}
                </span>
                <button
                  onClick={() => onLaunchAgent(agent.promptStarter, agent.name)}
                  className="py-1.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-purple-900/30 active:scale-95"
                >
                  <span>{isEn ? 'Start Chat' : 'Mulai Obrolan'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});
