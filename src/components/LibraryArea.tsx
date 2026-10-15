import React, { useState } from 'react';
import {
  FileText,
  Image as ImageIcon,
  Volume2,
  Bookmark,
  MessageSquare,
  Archive,
  Code2,
  Search,
  ExternalLink,
  Download,
  Trash2,
  Filter,
  Plus,
  Clock,
  Sparkles,
} from 'lucide-react';

export type LibraryCategory =
  | 'all'
  | 'images'
  | 'documents'
  | 'audio'
  | 'bookmarked'
  | 'chat-history'
  | 'archive'
  | 'formulas';

interface LibraryItem {
  id: string;
  title: string;
  category: LibraryCategory;
  type: string;
  date: string;
  size?: string;
  previewUrl?: string;
  snippet?: string;
  badge?: string;
}

const INITIAL_ITEMS: LibraryItem[] = [
  {
    id: 'lib-1',
    title: 'Analisis Arsitektur Transformer vs Mamba',
    category: 'documents',
    type: 'DOCX • Riset AI',
    date: '15 Okt 2026',
    size: '142 KB',
    snippet: 'Kajian komparatif throughput memori, O(N) complexity vs attention mechanism...',
    badge: 'Riset',
  },
  {
    id: 'lib-2',
    title: 'Ilustrasi Bio-Teknologi Futuristik 4K',
    category: 'images',
    type: 'PNG • 4K HD',
    date: '14 Okt 2026',
    size: '2.4 MB',
    previewUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80',
    snippet: 'Laboratorium visual futuristik dengan tabung kristal bercahaya cyan.',
    badge: 'AI Image',
  },
  {
    id: 'lib-3',
    title: 'Memo Suara - Rapat Strategi Produk',
    category: 'audio',
    type: 'MP3 • Transkrip Suara',
    date: '13 Okt 2026',
    size: '1.1 MB',
    snippet: 'Rekaman audio dan transkrip otomatis poin-poin fitur Maria AI v3.',
    badge: 'Audio',
  },
  {
    id: 'lib-4',
    title: 'Rumus Struktur Ikatan TP53 Mutasi DNA',
    category: 'formulas',
    type: 'LATEX • Kimia Molekuler',
    date: '12 Okt 2026',
    size: '48 KB',
    snippet: 'ΔG = ΔH - TΔS, binding energy per residue R273H hotspot mutation.',
    badge: 'Formula',
  },
  {
    id: 'lib-5',
    title: 'Sesi Diskusi: Strategi Pemasaran Kopi Ramah Lingkungan',
    category: 'chat-history',
    type: 'Chat • 8 Pesan',
    date: '11 Okt 2026',
    snippet: 'Analisis SWOT, konsep zero-waste refill hub, dan positioning target anak muda.',
    badge: 'Obrolan',
  },
  {
    id: 'lib-6',
    title: 'Blueprint Arsitektur Firestore & Keamanan ABAC',
    category: 'bookmarked',
    type: 'SecRules • Firestore',
    date: '10 Okt 2026',
    snippet: 'Aturan validasi kepemilikan percakapan, isolasi data pengguna berbasis UID.',
    badge: 'Favorit',
  },
  {
    id: 'lib-7',
    title: 'Arsip Riset Pasar Q3 2026',
    category: 'archive',
    type: 'ZIP • Arsip Data',
    date: '08 Okt 2026',
    size: '4.8 MB',
    snippet: 'Kompilasi survei pengguna awal dan matriks benchmark performa asisten cerdas.',
    badge: 'Arsip',
  },
];

interface LibraryAreaProps {
  onBackToChat: () => void;
  onSelectPrompt?: (prompt: string) => void;
}

export const LibraryArea: React.FC<LibraryAreaProps> = ({ onBackToChat, onSelectPrompt }) => {
  const [activeCategory, setActiveCategory] = useState<LibraryCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState<LibraryItem[]>(INITIAL_ITEMS);

  const categories: { id: LibraryCategory; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: 'Semua', icon: <FileText className="w-3.5 h-3.5" /> },
    { id: 'images', label: 'Gambar', icon: <ImageIcon className="w-3.5 h-3.5" /> },
    { id: 'documents', label: 'Dokumen', icon: <FileText className="w-3.5 h-3.5" /> },
    { id: 'audio', label: 'Suara', icon: <Volume2 className="w-3.5 h-3.5" /> },
    { id: 'bookmarked', label: 'Ditandai', icon: <Bookmark className="w-3.5 h-3.5" /> },
    { id: 'chat-history', label: 'Riwayat Chat', icon: <MessageSquare className="w-3.5 h-3.5" /> },
    { id: 'archive', label: 'Arsip', icon: <Archive className="w-3.5 h-3.5" /> },
    { id: 'formulas', label: 'Formula', icon: <Code2 className="w-3.5 h-3.5" /> },
  ];

  const filteredItems = items.filter((item) => {
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.snippet && item.snippet.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const handleDeleteItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0e0f12] text-white overflow-hidden">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#20222f] bg-[#14151b]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#20a66a]/10 border border-[#20a66a]/20 text-[#20a66a] flex items-center justify-center font-bold">
            <Bookmark className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-tight">Pustaka Maria</h2>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#20a66a]/15 text-[#34d399] border border-[#20a66a]/20">
                {items.length} Aset
              </span>
            </div>
            <p className="text-xs text-neutral-400">
              Dokumen, gambar tersimpan, rekaman suara, arsip, dan formula riset
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onBackToChat}
            className="py-1.5 px-3.5 rounded-xl bg-[#20a66a] hover:bg-[#1a8c59] text-white text-xs font-semibold shadow-md transition-all flex items-center gap-1.5"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Kembali ke Chat</span>
          </button>
        </div>
      </div>

      {/* Subheader Toolbar: Categories & Search */}
      <div className="px-6 py-3 border-b border-[#1b1d28] bg-[#111218] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {categories.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-[#20a66a] text-white shadow-sm font-semibold'
                    : 'bg-[#191b24] text-neutral-400 hover:text-white hover:bg-[#222432]'
                }`}
              >
                {cat.icon}
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64 shrink-0">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari dalam pustaka..."
            className="w-full pl-9 pr-3 py-1.5 bg-[#191b24] border border-[#2b2e3f] rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#20a66a]"
          />
        </div>
      </div>

      {/* Grid of Library Cards */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredItems.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center text-neutral-500 space-y-2">
            <Archive className="w-10 h-10 stroke-[1.5]" />
            <p className="text-xs">Tidak ada aset atau dokumen dalam kategori ini.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="group relative bg-[#14151e] border border-[#232534] hover:border-[#20a66a]/50 rounded-2xl p-4.5 transition-all duration-200 flex flex-col justify-between shadow-lg"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-[#20a66a]/15 text-[#34d399] border border-[#20a66a]/20">
                      {item.badge}
                    </span>
                    <span className="text-[11px] text-neutral-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {item.date}
                    </span>
                  </div>

                  {item.previewUrl && (
                    <div className="w-full h-32 mb-3 rounded-xl overflow-hidden bg-black/40 border border-[#27293a]">
                      <img
                        src={item.previewUrl}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}

                  <h3 className="text-sm font-semibold text-white group-hover:text-[#34d399] transition-colors leading-snug mb-1">
                    {item.title}
                  </h3>

                  <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed mb-3">
                    {item.snippet}
                  </p>
                </div>

                <div className="pt-3 border-t border-[#1f2130] flex items-center justify-between text-xs text-neutral-400">
                  <span className="text-[11px] text-neutral-500">{item.type}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        if (onSelectPrompt && item.snippet) {
                          onSelectPrompt(`Jelaskan dan kembangkan data dari pustaka berikut: "${item.title}"`);
                        }
                      }}
                      title="Bahas dengan Maria AI"
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-[#252839] transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#34d399]" />
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      title="Hapus dari pustaka"
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-[#252839] transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
