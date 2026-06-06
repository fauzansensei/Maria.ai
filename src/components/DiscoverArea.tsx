import React, { useState } from "react";
import { 
  Sparkles, 
  Compass, 
  Search, 
  ArrowLeft, 
  Bot, 
  UserCheck, 
  Zap, 
  Check, 
  MessageSquare, 
  Volume2, 
  BookOpen, 
  Flame, 
  Award,
  Terminal,
  PenTool,
  Clock,
  ArrowUpRight
} from "lucide-react";
import { UserSettings } from "../types";
import { THEME_OPTIONS } from "../constants";

// Specifying characters
export interface DiscoveryAgent {
  id: string;
  name: string;
  roleTitle: string;
  description: string;
  avatar: string;
  emoji: string;
  category: "all" | "learning" | "creative" | "tech" | "productivity" | "lifestyle";
  startingMessage: string;
  systemPrompt: string;
  theme: "classic-blue" | "emerald-green" | "cosmic-purple" | "minimal-dark";
  popularity: string;
}

const DISCOVERY_AGENTS: DiscoveryAgent[] = [
  {
    id: "maria-default",
    name: "Maria AI (Asisten Umum)",
    roleTitle: "Asisten AI Utama Pintar & Berempati",
    description: "Serba tahu, profesional, ramah, dan siap mendampingi segala kebutuhan belajar maupun pekerjaan Anda secara tak terbatas.",
    avatar: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&h=150&fit=crop&q=80",
    emoji: "⚡",
    category: "all",
    startingMessage: "Halo! Saya Maria, asisten pribadi Anda. Ada yang bisa saya bantu atau analisis bersama hari ini?",
    systemPrompt: "Anda adalah Maria, asisten cerdas berempati tinggi. Jawab dengan pembawaan ramah, taktis, mendalam, dan selaras dengan setelan pengguna.",
    theme: "classic-blue",
    popularity: "Terpopuler"
  },
  {
    id: "aiko-chat",
    name: "Aiko (Teman Curhat & Ngobrol)",
    roleTitle: "Teman Ngobrol Santai & Hangat",
    description: "Mau cerita tentang hari ini, curhat asmara, atau sekadar bertukar pikiran? Aiko siap menemani dengan gaya santai dan ramah khas anak muda.",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&q=80",
    emoji: "🌸",
    category: "creative",
    startingMessage: "Hai! Aku Aiko. Lagi pengen sharing cerita seru atau ada yang bikin galau hari ini? Cerita aja, aku siap dengerin kok!",
    systemPrompt: "Anda adalah Aiko, teman curhat yang sangat santai, ceria, bersahabat, dan menggunakan gaya bahasa kasual semi-formal / santai yang hangat (kadang memakai kata aku-kamu, kok, ya, lho). Berikan dukungan emosional prima.",
    theme: "cosmic-purple",
    popularity: "Favorit Senja"
  },
  {
    id: "haruka-lang",
    name: "Haruka Sensei (Japanese Coach)",
    roleTitle: "Guru Bahasa & Budaya Jepang",
    description: "Belajar tata bahasa Jepang (Bunpou), menghafal huruf Hiragana/Katakana/Kanji, dan latihan percakapan harian interaktif.",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&q=80",
    emoji: "🎏",
    category: "learning",
    startingMessage: "Konnichiwa! (こんにちは) Saya Haruka, mentor bahasa Jepangmu. Mari kita belajar kosakata baru atau latihan percakapan sederhana hari ini! Sudah siap? (準備はいいですか？)",
    systemPrompt: "Anda adalah Haruka Sensei, guru bahasa Jepang profesional yang sabar dan membimbing. Sering menyisipkan frasa bahasa Jepang dasar beserta artinya untuk membantu proses belajar interaktif pengguna.",
    theme: "emerald-green",
    popularity: "Terbaik Akademik"
  },
  {
    id: "sora-coder",
    name: "Sora (Mentor Koding)",
    roleTitle: "Spesialis Debugging & Logika Pemrograman",
    description: "Punya kendala bug, optimasi query database, atau butuh penjelasan algoritma yang mutakhir? Sora siap memberikan solusinya.",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&q=80",
    emoji: "💻",
    category: "tech",
    startingMessage: "Sistem menyala. Saya Sora. Bagikan baris kode Anda yang bermasalah atau mari buat arsitektur sistem baru yang efisien hari ini.",
    systemPrompt: "Anda adalah Sora, asisten koding teknis yang sangat presisi, logis, dan analitis. Berikan penjelasan kode yang terstruktur rapi menggunakan blok Markdown lengkap dan saran praktik terbaik (best practices).",
    theme: "minimal-dark",
    popularity: "Pilihan Dev"
  },
  {
    id: "rendra-copy",
    name: "Rendra (Copywriter)",
    roleTitle: "Kreator Konten & Judul Viral",
    description: "Butuh ide takarir (caption) TikTok, naskah iklan persuasif, atau email newsletter yang memiliki konversi penjualan super tinggi?",
    avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&h=150&fit=crop&q=80",
    emoji: "✍️",
    category: "creative",
    startingMessage: "Halo Kreator! Saya Rendra. Mari kita sulap ide biasa menjadi tulisan spektakuler yang menarik perhatian audiens Anda sejak detik pertama!",
    systemPrompt: "Anda adalah Rendra, copywriter senior yang inovatif dan persuasif. Berfokus pada penceritaan (storytelling), struktur penulisan AIDA/PAS, serta gaya bahasa yang sangat memikat konversi pembaca.",
    theme: "classic-blue",
    popularity: "Hype Copy"
  },
  {
    id: "budi-finance",
    name: "Budi (Financial Planner)",
    roleTitle: "Perencana Keuangan & Analis Bisnis",
    description: "Bantu susun rencana anggaran keuangan pribadi harian, hitung kas bisnis bulanan, simulasikan pinjaman, serta carikan cara investasi logis.",
    avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&h=150&fit=crop&q=80",
    emoji: "💵",
    category: "productivity",
    startingMessage: "Halo! Saya Budi. Mari kita rapikan dan audit perencanaan keuangan harian atau hitung simulasi finansial bisnismu hari ini agar lebih sehat!",
    systemPrompt: "Anda adalah Budi, penasihat keuangan pribadi dan analis bisnis yang sangat teliti, logis, realistis, dan berorientasi pada angka keuangan secara rapi. Bantu berikan perencanaan budget, audit pengeluaran, serta tips bisnis bagi pelaku UMKM maupun personal finance secara terperinci.",
    theme: "emerald-green",
    popularity: "Viral Finansial"
  },
  {
    id: "sarah-health",
    name: "dr. Sarah (Konsultan Sehat)",
    roleTitle: "Gaya Hidup Sehat & Nutrisi Akurat",
    description: "Butuh asisten penyusun jadwal olahraga, tabel menu kalori berimbang harian, serta panduan nutrisi makan tanpa stres berlebihan?",
    avatar: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&h=150&fit=crop&q=80",
    emoji: "🍎",
    category: "lifestyle",
    startingMessage: "Halo! Saya dr. Sarah. Senang bisa terhubung kembali. Mari kita bicarakan gol kesehatan Anda hari ini atau susun rancangan menu asupan gizi harian Anda secara berimbang!",
    systemPrompt: "Anda adalah dr. Sarah, konsultan kesehatan, diet sehat, dan gizi berbasis sains klinis yang informatif, bersahaja, serta menyenangkan. Berikan edukasi kesehatan ringan, kalkulasi asupan kalori, serta dorongan pola hidup teratur. Selalu ingatkan pengguna untuk berkonsultasi kepada dokter medis berlisensi jikalau ada gejala klinis serius.",
    theme: "classic-blue",
    popularity: "Kesehatan Prima"
  },
  {
    id: "kiko-travel",
    name: "Kiko (Pemandu Wisata & Kuliner)",
    roleTitle: "Backpacker Guide & Kuliner Legendaris",
    description: "Rencana keliling kota impian, buat itinerary liburan hemat, atau cari deretan warung kuliner legendaris yang menggiurkan?",
    avatar: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=150&h=150&fit=crop&q=80",
    emoji: "✈️",
    category: "lifestyle",
    startingMessage: "Halo Traveler! Saya Kiko. Siap berpetualang dan menjelajah tempat menarik hari ini? Beritahu kota tujuan Anda, biar saya racik agenda jalan-jalannya!",
    systemPrompt: "Anda adalah Kiko, seorang penjelajah wisata kawakan, pemandu rute travel, dan pencinta kuliner yang ramah, interaktif, seru, dan gemar merekomendasikan spot-spot hidden gem lokal dan estimasi harga hemat.",
    theme: "cosmic-purple",
    popularity: "Raja Kuliner"
  },
  {
    id: "aris-counselor",
    name: "Aris (Psikolog & Motivator Karir)",
    roleTitle: "Spesialis Growth Mindset & Latihan Kerja",
    description: "Bantu redakan kecemasan burnout kerja, latih simulasi interview taktis, hingga audit CV ATS-friendly untuk jenjang karir cemerlang.",
    avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&h=150&fit=crop&q=80",
    emoji: "🎯",
    category: "productivity",
    startingMessage: "Selamat datang! Saya Aris. Mari kita bicarakan tantangan karir, manajemen kecemasan bekerja, atau optimalkan taktik persiapan wawancara kerjamu harian.",
    systemPrompt: "Anda adalah Aris, konselor karir profesional dan penasihat motivasi kerja yang tenang, berwibawa, solutif, serta menyajikan solusi terencana langkah demi langkah (step-by-step). Berikan saran taktis, tips menyusun portfolio, serta motivasi bertumbuh positif.",
    theme: "minimal-dark",
    popularity: "Solusi Karir"
  }
];

export interface DiscoverPrompt {
  id: string;
  title: string;
  category: string;
  text: string;
  icon: string;
}

const DISCOVER_PROMPTS: DiscoverPrompt[] = [
  {
    id: "p1",
    title: "Buat Ringkasan Artikel Detil",
    category: "Produktivitas",
    text: "Tolong bacakan teks berikut dan susun menjadi ringkasan poin-poin penting, sertakan kata kunci utama beserta kesimpulan akhirnya secara rapi:\n\n[Tempel Teks Artikel di Sini]",
    icon: "📄"
  },
  {
    id: "p2",
    title: "Formula Headline AIDA Promosi",
    category: "Marketing",
    text: "Tuliskan 5 ide Headline promosi menggunakan struktur AIDA (Attention, Interest, Desire, Action) yang persuasif untuk menawarkan produk berikut:\n\n[Deskripsi Singkat Produk Anda]",
    icon: "🎯"
  },
  {
    id: "p3",
    title: "Audit Algoritma & Refactor Koding",
    category: "Teknologi",
    text: "Tolong periksa fungsionalitas fungsi kode di bawah ini. Cari kemungkinan bug, kemacetan performa, dan berikan versi hasil refactor yang lebih bersih serta hemat memori:\n\n[Tempel Kode Anda di Sini]",
    icon: "🧩"
  },
  {
    id: "p4",
    title: "Penyusunan Rencana Belajar 30 Hari",
    category: "Belajar",
    text: "Saya ingin memahami dasar-dasar topik ini sebagai pemula mutlak dalam 30 hari secara berjenjang. Tolong bantu saya menyusun silabus mingguan terperinci:\n\n[Topik Belajar Kamu]",
    icon: "📚"
  },
  {
    id: "p5",
    title: "Simulasi Budgeting 50/30/20 Menarik",
    category: "Finansial",
    text: "Budi, tolong buatkan simulasi pembagian anggaran bulanan dari gaji Rp [Sebutkan Gaji Anda Di Sini] menggunakan kalkulasi rasio 50% kebutuhan pokok, 30% keinginan pribadi, dan 20% tabungan/investasi dengan rekomendasi rincian pos dan tips hemat!",
    icon: "💵"
  },
  {
    id: "p6",
    title: "Rekomendasi Menu Diet Sehat 7 Hari",
    category: "Kesehatan",
    text: "dr. Sarah, tolong susunkan tabel menu makanan berkalori seimbang (pagi, siang, malam, dan camilan sehat) selama 7 hari berturut-turut untuk target penurunan berat badan secara sehat tanpa mengorbankan imun tubuh!",
    icon: "🥗"
  }
];

const RELEASES_CHANGELOG = [
  {
    version: "v2.2.0 (Terbaru)",
    date: "Mei 2026",
    changes: [
      "Metode Pembayaran Lokal: Kini mendukung pembayaran instan via QRIS (GoPay, OVO, DANA) & Bank Transfer Virtual Account.",
      "Sistem Pajak Terbuka: Sesuai regulasi, harga yang tertera pada MARIA Plus kini sudah mencakup PPN 11% secara transparan.",
      "Optimasi Ukuran Berkas: Peningkatan kapasitas muat server hingga 50MB mencegah galat 'Payload Too Large' pada berkas gambar atau rekaman memo suara panjang."
    ]
  },
  {
    version: "v2.1.2",
    date: "April 2026",
    changes: [
      "Penyelarasan Server Side: Peningkatan stabilitas koneksi API dengan parser respons aman dalam kondisi jaringan tidak stabil.",
      "Editing Pesan In-Chat: Memungkinkan pengguna mengoreksi atau mengubah teks pesan sebelumnya tanpa merusak riwayat utas."
    ]
  }
];

interface DiscoverAreaProps {
  settings: UserSettings;
  onSelectAgent: (agent: DiscoveryAgent) => void;
  onUsePrompt: (promptText: string) => void;
  onExit: () => void;
}

export default function DiscoverArea({
  settings,
  onSelectAgent,
  onUsePrompt,
  onExit
}: DiscoverAreaProps) {
  const currentTheme = THEME_OPTIONS.find(t => t.value === settings.theme) || THEME_OPTIONS[0];
  const [activeCategory, setActiveCategory] = useState<"all" | "learning" | "creative" | "tech" | "productivity" | "lifestyle">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredAgents = DISCOVERY_AGENTS.filter(agent => {
    const matchesCategory = activeCategory === "all" || agent.category === activeCategory;
    const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          agent.roleTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          agent.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="w-full h-full flex flex-col bg-[#0b0c0f] text-slate-200 select-none overflow-hidden border-l border-[#1e2025]">
      {/* Header Sticky Bar */}
      <div className="px-6 py-4 border-b border-[#1c1d24] bg-[#0b0c0f] flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onExit}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer mr-1"
            title="Kembali ke Obrolan"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-sm font-bold text-white flex items-center gap-2 font-display">
              <Compass className="w-4 h-4 text-emerald-400" />
              Eksplorasi Discover Hub
            </h1>
            <p className="text-[10px] text-slate-400">
              Temukan agen-agen asisten AI berkepribadian unik dan templat perintah siap pakai.
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/15 font-semibold">
            ● Server Sehat
          </span>
        </div>
      </div>

      {/* Main Discover Contents - Scrollable */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar bg-[#0f1015]">
        
        {/* Banner Hero */}
        <div className={`relative p-6 rounded-2xl bg-gradient-to-r ${currentTheme.bgGradient} overflow-hidden shadow-2xl`}>
          {/* Backdrop spark */}
          <div className="absolute top-[-50px] right-[-50px] w-48 h-48 bg-white/10 rounded-full blur-3xl" />
          <div className="relative z-10 space-y-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-950/40 text-[9px] font-bold text-white uppercase tracking-wider">
              <Sparkles className="w-3 h-3 text-amber-300" />
              Sistem Agen Maria AI Berakar
            </span>
            <h2 className="text-lg sm:text-xl font-display font-black text-white leading-tight">
              Eksplorasi Agen AI Terspesialisasi & Prompt Siap Pakai
            </h2>
            <p className="text-[11px] text-zinc-100 opacity-90 max-w-xl leading-relaxed">
              Dapatkan pengalaman berinteraksi yang baru dengan beralih karakter agen sesuai kebutuhan analisis Anda secara instan.
            </p>
          </div>
        </div>

        {/* Section: Agen AI Hub */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1c1d24] pb-3">
            <div className="space-y-0.5">
              <h3 className="text-xs font-bold text-white flex items-center gap-2">
                <Bot className="w-3.5 h-3.5 text-blue-400" />
                Katalog Agen AI Maria
              </h3>
              <p className="text-[10px] text-slate-400">Dapatkan asisten terbaik untuk topik terspesialisasi.</p>
            </div>

            {/* Sub Filter Category Pills */}
            <div className="flex flex-wrap gap-1.5 select-none text-[10px] font-bold">
              {[
                { id: "all", label: "Semua" },
                { id: "learning", label: "Belajar & Edukasi" },
                { id: "creative", label: "Kreatif & Santai" },
                { id: "tech", label: "Koding & Teknis" },
                { id: "productivity", label: "Bisnis & Produktivitas" },
                { id: "lifestyle", label: "Gaya Hidup & Kesehatan" }
              ].map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id as any)}
                  className={`px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                    activeCategory === cat.id 
                      ? "bg-slate-100 text-slate-950 border-white font-bold" 
                      : "bg-[#16171d] border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Grid list of Agents */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredAgents.map(agent => (
              <div 
                key={agent.id}
                className="p-4 rounded-xl bg-[#14151b] border border-slate-800/80 hover:border-slate-700 transition-all shadow-inner flex flex-col justify-between gap-4 group"
              >
                <div className="flex gap-3.5">
                  <div className="relative w-12 h-12 rounded-xl border border-slate-700 overflow-hidden shrink-0 shadow-lg">
                    <img src={agent.avatar} alt={agent.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" referrerPolicy="no-referrer" loading="lazy" decoding="async" />
                    <span className="absolute bottom-1 right-1 w-5 h-5 flex items-center justify-center bg-[#14151b]/90 border border-slate-800 rounded-lg text-xs leading-none shadow select-none">
                      {agent.emoji}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-bold text-white tracking-tight">{agent.name}</span>
                      <span className="text-[8px] bg-indigo-500/10 text-indigo-400 font-semibold border border-indigo-500/15 px-1.5 py-0.5 rounded-md">
                        {agent.popularity}
                      </span>
                    </div>
                    <span className="block text-[9px] text-[#22c55e] font-semibold mt-0.5">{agent.roleTitle}</span>
                    <p className="text-[10px] text-slate-400 leading-normal mt-1.5">
                      {agent.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-800/60 pt-3 text-[10px]">
                  <span className="text-slate-400 italic">
                    Gaya: <strong className="text-zinc-300 font-normal">{agent.theme === "minimal-dark" ? "Monochrome" : agent.theme.replace("-", " ")}</strong>
                  </span>
                  
                  <button
                    type="button"
                    onClick={() => onSelectAgent(agent)}
                    className="py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                  >
                    <span>Gunakan Agen</span>
                    <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </button>
                </div>
              </div>
            ))}

            {filteredAgents.length === 0 && (
              <div className="col-span-2 py-8 text-center text-slate-500 text-xs text-slate-400">
                Belum ada agen AI yang memenuhi kriteria pencarian Anda.
              </div>
            )}
          </div>
        </div>

        {/* Section2: Prompt Galleries */}
        <div className="space-y-4">
          <div className="space-y-0.5 border-b border-[#1c1d24] pb-3">
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-500" />
              Galeri Prompt Populer Kunci Sukses
            </h3>
            <p className="text-[10px] text-slate-400">Salin dan pakai formula teks perintah siap pakai di bawah ini secara instan.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {DISCOVER_PROMPTS.map(promo => (
              <div
                key={promo.id}
                onClick={() => onUsePrompt(promo.text)}
                className="p-4 rounded-xl bg-[#14151b] border border-slate-800/80 hover:border-[#3b82f6]/40 cursor-pointer transition-all hover:scale-[1.01] flex items-start gap-3.5 text-left group"
              >
                <span className="text-2xl mt-0.5 select-none">{promo.icon}</span>
                <div className="min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] uppercase tracking-wider font-bold text-blue-400 bg-blue-500/5 border border-blue-500/10 px-1.5 py-0.5 rounded-md">
                      {promo.category}
                    </span>
                    <span className="text-[8px] text-slate-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity">Pakai Prompt →</span>
                  </div>
                  <span className="block text-[11px] font-bold text-white tracking-tight mt-1 group-hover:text-blue-400 transition-colors">
                    {promo.title}
                  </span>
                  <p className="text-[9.5px] text-slate-400 leading-normal line-clamp-2 mt-1 italic">
                    &ldquo;{promo.text.slice(0, 100)}...&rdquo;
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: Changelog Fitur */}
        <div className="space-y-4">
          <div className="space-y-0.5 border-b border-[#1c1d24] pb-3">
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-400" />
              Changelog Pembaharuan Maria AI
            </h3>
            <p className="text-[10px] text-slate-400">Pembaruan performa & fitur asisten Maria AI.</p>
          </div>

          <div className="space-y-3">
            {RELEASES_CHANGELOG.map(log => (
              <div key={log.version} className="p-4 bg-[#14151b] border border-slate-800/80 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-mono font-bold text-white bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700/60">
                    {log.version}
                  </span>
                  <span className="text-slate-400 font-bold">{log.date}</span>
                </div>
                
                <ul className="space-y-1.5 pl-3 list-disc text-[10px] text-slate-400 leading-normal">
                  {log.changes.map((item, idx) => (
                    <li key={idx} className="marker:text-slate-600">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
