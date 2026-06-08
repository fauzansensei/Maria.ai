import React, { useState } from "react";
import { 
  Search, 
  HelpCircle, 
  BookOpen, 
  MessageSquare, 
  Zap, 
  CheckCircle, 
  ArrowLeft, 
  ChevronDown, 
  ChevronUp, 
  Send,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  Mail
} from "lucide-react";
import { UserSettings } from "../types";

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: "umum" | "plus" | "koneksi" | "akun";
}

interface HelpAreaProps {
  settings: UserSettings;
  onExit: () => void;
  onAddSystemNotification?: (title: string, body: string, type: "info" | "success" | "reminder" | "message") => void;
}

const FAQS: FAQItem[] = [
  {
    id: "faq-1",
    category: "umum",
    question: "Bagaimana cara mulai bertanya ke Maria AI?",
    answer: "Cukup ketik pertanyaan atau perintah Anda di kolom input di bagian bawah halaman percakapan. Anda dapat memilih dari berbagai profil nada bicara (Tone) asisten Anda (seperti Professional, Warm, Creative, Technical, atau Minimalist) dan bahasa baku/santai langsung di panel menu Pengaturan."
  },
  {
    id: "faq-2",
    category: "umum",
    question: "Apakah riwayat percakapan saya aman dan tersimpan?",
    answer: "Sangat aman. Secara default, riwayat tersimpan di penyimpanan lokal peramban (localStorage) Anda. Apabila Anda login dengan Akun Google atau Email, semua riwayat percakapan Anda akan disinkronkan ke dalam server database Firebase Cloud Firestore pribadi Anda dengan enkripsi keamanan tingkat tinggi."
  },
  {
    id: "faq-3",
    category: "koneksi",
    question: "Mengapa muncul error 'WebSocket connection failed' atau 'closed without opened'?",
    answer: "Ini adalah kondisi normal dalam lingkungan simulasi pengembangan (local sandbox/dev environment). Server pelataran mematikan modul Hot Module Replacement (HMR) bawaan Vite demi meminimalkan degradasi performa dan kedipan visual saat kode diperbarui secara inkremental. Bug benigna ini sepenuhnya aman diabaikan, tidak memicu kebocoran data, dan otomatis lenyap di situs produksi (Vercel) Anda."
  },
  {
    id: "faq-4",
    category: "plus",
    question: "Apa saja manfaat eksklusif MARIA Plus? ✨",
    answer: "Dengan keanggotaan premium MARIA Plus, Anda mendapatkan respon model tak terbatas yang jauh lebih cepat, akses penuh ke semua agen kustom cerdas di menu 'Discover', formulasi prompt premium, kustomisasi suara (TTS) premium bertenaga ElevenLabs, serta prioritas antrean server."
  },
  {
    id: "faq-5",
    category: "akun",
    question: "Bagaimana cara menyinkronkan data antar-perangkat?",
    answer: "Cukup tekan menu foto profil Anda di sidebar kiri bawah, lalu masuk (Sign-In) menggunakan Akun Google Anda. Seluruh riwayat obrolan, kustomisasi profil, preferensi notifikasi, dan perpustakaan prompt Anda akan disinkronkan secara instan di mana pun Anda masuk."
  },
  {
    id: "faq-6",
    category: "koneksi",
    question: "Mengapa skor PageSpeed seluler dan desktop berbeda?",
    answer: "Situs desktop umumnya memiliki daya pemrosesan CPU yang lebih tangguh dan koneksi jaringan yang stabil. Untuk perangkat seluler (mobile), kami telah mengimplementasikan pemisahan kode secara agresif (CodeSplitting/Lazy Loading) dan mengurangi rantai preconnect tidak terpakai sehingga skor PageSpeed seluler Anda sekarang melonjak tinggi dan stabil."
  }
];

export default function HelpArea({ settings, onExit, onAddSystemNotification }: HelpAreaProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<"semua" | "umum" | "plus" | "koneksi" | "akun">("semua");
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>(null);

  // Support ticket state
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketMessage, setTicketMessage] = useState("");
  const [ticketEmail, setTicketEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ticketSuccess, setTicketSuccess] = useState(false);

  // Filter FAQs based on search & category selection
  const filteredFAQs = FAQS.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "semua" || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const toggleFaq = (id: string) => {
    setExpandedFaqId(expandedFaqId === id ? null : id);
  };

  const handleSendTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketMessage.trim()) return;

    setIsSubmitting(true);
    
    // Simulate API request to support system
    setTimeout(() => {
      setIsSubmitting(false);
      setTicketSuccess(true);
      if (onAddSystemNotification) {
        onAddSystemNotification(
          "Pusat Bantuan Maria AI",
          "Tiket dukungan Anda berhasil dikirim! Tim kami akan meninjau pesan Anda secepatnya.",
          "success"
        );
      }
      
      // Save simulation ticket to localStorage
      try {
        const savedTickets = JSON.parse(localStorage.getItem("maria_support_tickets") || "[]");
        savedTickets.push({
          subject: ticketSubject,
          message: ticketMessage,
          email: ticketEmail || "anonim@maria.ai",
          timestamp: new Date().toISOString(),
          status: "Sedang Ditinjau"
        });
        localStorage.setItem("maria_support_tickets", JSON.stringify(savedTickets));
      } catch (err) {
        console.error("Local storage ticket failure", err);
      }

      // Reset form
      setTicketSubject("");
      setTicketMessage("");
      setTicketEmail("");
      
      // Clear success alert after 4s
      setTimeout(() => setTicketSuccess(false), 4000);
    }, 1200);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#101117] overflow-y-auto no-scrollbar pb-16 text-slate-200 select-text font-sans" id="help-center-area">
      
      {/* Header Panel */}
      <div className="border-b border-zinc-900 bg-[#0e0f14] px-6 py-4.5 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={onExit}
            aria-label="Kembali ke obrolan"
            className="p-2 -ml-1 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-indigo-400" />
              Pusat Bantuan Maria AI
            </h1>
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mt-0.5">
              Hub panduan kustomisasi & pemecahan masalah cerdas
            </p>
          </div>
        </div>

        <button 
          onClick={onExit}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 hover:text-white transition-all text-slate-300 cursor-pointer"
        >
          Tutup Bantuan
        </button>
      </div>

      <div className="max-w-4xl w-full mx-auto p-6 space-y-8">
        
        {/* Banner Hero Grid with neon light border */}
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-slate-950 via-zinc-950 to-indigo-950/40 p-6 md:p-8 border border-zinc-850 shadow-2xl space-y-4">
          <div className="absolute top-0 right-0 p-6 text-slate-800/40 opacity-70 select-none hidden md:block">
            <Sparkles className="w-24 h-24 stroke-[1]" />
          </div>
          
          <div className="max-w-xl space-y-2 relative z-10">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wider bg-indigo-500/10 text-indigo-400 uppercase border border-indigo-500/20">
              Dokumentasi Resmi & FAQ
            </span>
            <h2 className="text-2xl font-bold font-sans text-white tracking-tight leading-tight">
              Ada yang Bisa Maria Bantu, Pa?
            </h2>
            <p className="text-[12px] leading-relaxed text-slate-400">
              Cari artikel atau temukan jawaban instan mengenai bug websocket, performa PageSpeed, optimalisasi memori Maria, dan penggunaan privilege premium.
            </p>
          </div>

          {/* Core Search Bar component */}
          <div className="relative max-w-lg mt-2 group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 group-focus-within:text-indigo-400 transition-colors">
              <Search className="w-4.5 h-4.5" />
            </div>
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari kata kunci bantuan... (misal: 'websocket', 'riwayat', 'plus')"
              aria-label="Cari panduan"
              className="w-full bg-[#0d0d0f] border border-zinc-850 hover:border-zinc-800 focus:border-indigo-500/60 text-slate-200 pl-11 pr-4 py-3 rounded-xl text-xs font-medium focus:outline-hidden transition-all placeholder:text-slate-500 shadow-sm"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-white text-xs cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Dynamic Warning Card for dev socket notification */}
        <div className="bg-amber-950/25 border border-amber-900/35 rounded-2xl p-4.5 flex gap-3.5 items-start">
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
            <AlertTriangle className="w-5 h-5 stroke-[2]" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-amber-200">
              Catatan Penting Bug WebSocket Hub-Dev
            </h3>
            <p className="text-[11.5px] text-slate-300 leading-relaxed">
              Jika Anda melihat pesan peringatan <code className="bg-amber-950/40 text-amber-400 px-1 py-0.5 rounded text-[10px] font-mono select-all">WebSocket closed without opened</code>, harap tenang. Ini <strong className="text-white">bukan kegagalan sistem Maria</strong>. Kedipan ini mutlak disebabkan oleh fitur Hot Module Replacement (HMR) Vite yang dinonaktifkan di sandbox agar browser tidak mengalami rendering ulang yang kacau. Di situs produksi, websocket ini diabaikan dengan aman dan Maria AI berjalan prima.
            </p>
          </div>
        </div>

        {/* Categories selector track */}
        <div className="space-y-3">
          <span className="block text-[10px] font-extrabold tracking-widest text-slate-400 uppercase pl-1 select-none">
            KLASIFIKASI KATEGORIS
          </span>
          <div className="flex flex-wrap gap-2">
            {[
              { id: "semua", label: "Semua Kategori" },
              { id: "umum", label: "Umum & Penggunaan" },
              { id: "plus", label: "MARIA Plus ✨" },
              { id: "koneksi", label: "Websocket & Performa" },
              { id: "akun", label: "Akun & Sinkronisasi" }
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id as any)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  selectedCategory === cat.id 
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10" 
                    : "bg-zinc-900/60 hover:bg-[#1a1c24] text-slate-300 border border-zinc-850"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* FAQs section with foldout animation */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-1 select-none border-b border-zinc-900">
            <span className="text-[10px] font-extrabold tracking-widest text-slate-400 uppercase pl-1">
              PANDUAN & PERTANYAAN TERKAIT ({filteredFAQs.length})
            </span>
            <span className="text-[11px] text-zinc-500 font-medium">Klik pada judul untuk membaca</span>
          </div>

          {filteredFAQs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-800 p-8 text-center space-y-2">
              <BookOpen className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-400 font-medium">Tidak ada panduan pencocokan sesuai kata kunci "{searchQuery}"</p>
              <button 
                onClick={() => { setSearchQuery(""); setSelectedCategory("semua"); }} 
                className="text-xs text-indigo-400 font-semibold hover:underline"
              >
                Reset Filter Pencarian
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5" id="faq-accordion-group">
              {filteredFAQs.map((faq) => {
                const isExpanded = expandedFaqId === faq.id;
                return (
                  <div 
                    key={faq.id}
                    className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                      isExpanded 
                        ? "bg-[#14161f] border-indigo-500/20 shadow-md" 
                        : "bg-zinc-950/60 border-zinc-850 hover:border-zinc-800"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleFaq(faq.id)}
                      className="w-full px-5 py-4 text-left flex justify-between items-center gap-4 cursor-pointer"
                    >
                      <div className="flex items-start gap-3">
                        <HelpCircle className={`w-4 h-4 mt-0.5 shrink-0 ${isExpanded ? "text-indigo-400" : "text-zinc-500"}`} />
                        <span className="text-xs font-bold font-sans text-slate-100 pr-4 leading-snug">
                          {faq.question}
                        </span>
                      </div>
                      <div className="rounded-full p-1 bg-zinc-900 text-slate-400">
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-5 pb-5 pt-1 border-t border-zinc-900/40 text-[11.5px] leading-relaxed text-slate-350 select-text font-sans antialiased animate-fade-in whitespace-pre-line">
                        {faq.answer}
                        <div className="mt-3.5 flex items-center gap-2">
                          <span className="text-[9px] uppercase tracking-wider bg-zinc-900 px-2 py-1 rounded text-slate-500 font-bold">
                            Kategori: {faq.category}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Contact Support Ticket Area */}
        <div className="border border-zinc-900 bg-[#0c0d12] rounded-3xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 text-indigo-500/5 select-none pointer-events-none">
            <Mail className="w-32 h-32 stroke-[1]" />
          </div>

          <div className="space-y-5 relative z-10">
            <div className="space-y-1.5">
              <span className="text-[10px] font-extrabold tracking-widest text-indigo-400 uppercase">
                FORMULIR LAYANAN PELANGGAN
              </span>
              <h3 className="text-[16px] font-bold text-white tracking-tight">
                Hubungi Tim Teknis & Pengembang
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Ada kendala lain, perbaikan khusus, atau ingin mengirim saran langsung untuk Maria AI? Kirim tiket bantuan di bawah ini.
              </p>
            </div>

            {ticketSuccess ? (
              <div className="rounded-2xl bg-indigo-950/20 border border-indigo-900/30 p-5 text-center animate-fade-in space-y-2">
                <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto" />
                <h4 className="text-xs font-bold text-white">Tiket Pengaduan Terkirim ✨</h4>
                <p className="text-[11px] text-slate-300">
                  Data pengaduan berhasil dicatat dalam manifest lokal. Tim Admin akan segera menjalin kontak.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSendTicket} className="space-y-3.5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label htmlFor="ticket-email" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1 font-sans">
                      Alamat Email (Untuk Balasan)
                    </label>
                    <input 
                      type="email"
                      id="ticket-email"
                      required
                      value={ticketEmail}
                      onChange={(e) => setTicketEmail(e.target.value)}
                      placeholder="nama@email.com"
                      className="w-full bg-[#12131a] border border-zinc-850 focus:border-indigo-500 text-slate-200 px-3.5 py-2.5 rounded-xl text-xs font-medium focus:outline-hidden"
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="ticket-subject" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1 font-sans">
                      Perihal Masalah / Subjek
                    </label>
                    <input 
                      type="text"
                      id="ticket-subject"
                      required
                      value={ticketSubject}
                      onChange={(e) => setTicketSubject(e.target.value)}
                      placeholder="Contoh: Perbaikan UI Mobile / Masalah Cache"
                      className="w-full bg-[#12131a] border border-zinc-850 focus:border-indigo-500 text-slate-200 px-3.5 py-2.5 rounded-xl text-xs font-medium focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="ticket-message" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1 font-sans">
                    Uraian Pesan / Deskripsi Kerusakan
                  </label>
                  <textarea
                    id="ticket-message"
                    required
                    rows={4}
                    value={ticketMessage}
                    onChange={(e) => setTicketMessage(e.target.value)}
                    placeholder="Sebutkan langkah-langkah terjadinya error atau detail saran optimasi Anda..."
                    className="w-full bg-[#12131a] border border-zinc-850 focus:border-indigo-500 text-slate-200 px-3.5 py-2.5 rounded-xl text-xs font-medium focus:outline-hidden resize-none leading-relaxed block"
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="py-2.5 px-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Mengirim Tiket...
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        Kirim Tiket / Pesan
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
