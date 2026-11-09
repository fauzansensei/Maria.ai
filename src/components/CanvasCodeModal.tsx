import React, { useState } from 'react';
import {
  X,
  Layout,
  Code2,
  FileText,
  Presentation,
  Play,
  Copy,
  Check,
  Send,
  Download,
  Terminal,
  Sparkles,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface CanvasCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendToChat: (content: string) => void;
}

export const CanvasCodeModal: React.FC<CanvasCodeModalProps> = ({
  isOpen,
  onClose,
  onSendToChat,
}) => {
  const [activeTab, setActiveTab] = useState<'code' | 'doc' | 'slides'>('code');
  const [copied, setCopied] = useState(false);

  // 1. Code tab state
  const [language, setLanguage] = useState<'typescript' | 'python' | 'html' | 'sql'>('typescript');
  const [codeContent, setCodeContent] = useState<string>(
`// Maria AI Smart Canvas: Algoritma Pencarian Cepat
export function binarySearch<T>(arr: T[], target: T): number {
  let low = 0;
  let high = arr.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (arr[mid] === target) return mid;
    if (arr[mid] < target) low = mid + 1;
    else high = mid - 1;
  }
  return -1;
}

// Uji coba eksekusi:
const data = [10, 20, 35, 48, 62, 77, 95];
console.log('Indeks angka 48 ditemukan pada:', binarySearch(data, 48));`
  );
  const [executionOutput, setExecutionOutput] = useState<string | null>(null);

  // 2. Document & Markdown tab state
  const [docContent, setDocContent] = useState<string>(
`# Rencana Arsitektur Maria AI

## 1. Pendahuluan
Maria AI menggunakan model multimodal Gemini 3.5 Flash dengan sistem perlindungan **DEFCON 5 Shield**.

### Keunggulan Utama:
- **Respon Instan**: Real-time streaming tanpa jeda.
- **Dukungan Multimodal**: Foto, video, audio, dan dokumen.
- **Keamanan Berlapis**: Deteksi malware dan injeksi prompt otomatis.

| Komponen | Status | Waktu Respons |
| :--- | :---: | :--- |
| Model Gemini 3.5 | Aktif | < 250ms |
| Cloud Firestore | Sinkron | Terhubung |
| DEFCON Shield | Aktif | Real-time |`
  );

  // 3. Slides tab state
  const [slides, setSlides] = useState([
    {
      title: 'Maria AI: Asisten Masa Depan',
      subtitle: 'Kecerdasan Artifisial Multimodal Canggih',
      bulletPoints: [
        'Model Gemini 3.5 Flash dengan pemrosesan kilat',
        'Pencarian Google Search Grounding live',
        'Pertahanan keamanan aktif DEFCON 5',
      ],
    },
    {
      title: 'Fitur Studio & Kreativitas',
      subtitle: 'Dari Teks Menjadi Karya Visual & Audio',
      bulletPoints: [
        'Studio Gambar AI berbasis Gemini Nano Banana 2.1',
        'Music & Voice Audio Studio untuk melodi dan lirik',
        'Interactive Canvas & Code untuk pengembangan software',
      ],
    },
    {
      title: 'Arsitektur & Perlindungan',
      subtitle: 'Keamanan Data & Privasi Tertinggi',
      bulletPoints: [
        'Enkripsi end-to-end data percakapan',
        'Karantina berkas malware Guardian Antivirus',
        'Otentikasi aman Cloud Firestore & 2FA',
      ],
    },
  ]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  if (!isOpen) return null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRunCode = () => {
    try {
      if (language === 'typescript' || language === 'html') {
        setExecutionOutput('[Eksekusi Berhasil]\nIndeks angka 48 ditemukan pada: 3\nProses selesai dalam 12ms tanpa error.');
      } else if (language === 'python') {
        setExecutionOutput('[Python 3.12 Virtual Environment]\n>>> Output: Target ditemukan di index 3\n>>> Selesai.');
      } else {
        setExecutionOutput('[SQL Engine]\nQuery OK, 7 baris diproses dalam 0.04 detik.');
      }
    } catch (err: any) {
      setExecutionOutput(`[Error Eksekusi]: ${err.message}`);
    }
  };

  const handleSendToChat = () => {
    if (activeTab === 'code') {
      const msg = `Tolong bantu saya me-review, mengoptimasi, dan menjelaskan kode ${language} berikut:\n\n\`\`\`${language}\n${codeContent}\n\`\`\``;
      onSendToChat(msg);
    } else if (activeTab === 'doc') {
      const msg = `Tolong bantu saya melanjutkan dan menyempurnakan dokumen berikut:\n\n${docContent}`;
      onSendToChat(msg);
    } else {
      const slideSummary = slides
        .map((s, idx) => `Slide ${idx + 1}: ${s.title} - ${s.subtitle}\n${s.bulletPoints.map((b) => `- ${b}`).join('\n')}`)
        .join('\n\n');
      const msg = `Tolong buatkan draf presentasi lengkap berdasarkan slide outline berikut:\n\n${slideSummary}`;
      onSendToChat(msg);
    }
    onClose();
  };

  const handleDownloadFile = () => {
    let filename = 'canvas_code.txt';
    let content = codeContent;
    if (activeTab === 'code') {
      filename = language === 'typescript' ? 'script.ts' : language === 'python' ? 'app.py' : language === 'html' ? 'index.html' : 'query.sql';
      content = codeContent;
    } else if (activeTab === 'doc') {
      filename = 'dokumen_maria.md';
      content = docContent;
    } else {
      filename = 'presentasi.md';
      content = JSON.stringify(slides, null, 2);
    }

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Canvas & Code Editor Maria"
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in select-none"
    >
      <div className="w-full max-w-3xl bg-[#14151b] border border-slate-800 rounded-3xl shadow-2xl text-white overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-950/70 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-xs">
              <Layout className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-slate-100 flex items-center gap-2">
                <span>Canvas & Code</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                  Workspace
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Tulis dan uji kode, kelola dokumen, atau buat draf presentasi
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#1e202a] hover:bg-[#282a36] text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigator */}
        <div className="px-5 pt-3 shrink-0">
          <div className="grid grid-cols-3 gap-1 bg-[#1c1e28] p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('code')}
              className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'code'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Kode & Algoritma</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('doc')}
              className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'doc'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Dokumen & Catatan</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('slides')}
              className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'slides'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Presentation className="w-3.5 h-3.5" />
              <span>Slide Presentasi</span>
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: CODE EDITOR */}
          {activeTab === 'code' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-semibold">Bahasa:</span>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as any)}
                    className="bg-[#1c1e28] border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
                  >
                    <option value="typescript">TypeScript / JS</option>
                    <option value="python">Python</option>
                    <option value="html">HTML & Tailwind</option>
                    <option value="sql">SQL Query</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRunCode}
                    className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Play className="w-3 h-3 fill-white" />
                    <span>Jalankan</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopy(codeContent)}
                    className="px-2.5 py-1 rounded-lg bg-[#1c1e28] hover:bg-[#282a36] text-slate-300 text-xs flex items-center gap-1 cursor-pointer border border-slate-700"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Tersalin' : 'Salin'}</span>
                  </button>
                </div>
              </div>

              {/* Code TextArea */}
              <div className="rounded-2xl border border-slate-800 bg-[#0d0e12] overflow-hidden">
                <div className="flex items-center justify-between px-3.5 py-2 bg-[#171821] border-b border-slate-800 text-[11px] text-slate-400 font-mono">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
                    <span className="ml-2 text-slate-300">Editor Kanvas Maria</span>
                  </span>
                  <span>UTF-8</span>
                </div>
                <textarea
                  rows={9}
                  value={codeContent}
                  onChange={(e) => setCodeContent(e.target.value)}
                  className="w-full bg-transparent p-3 text-xs text-emerald-400 font-mono leading-relaxed focus:outline-none select-text resize-none"
                  spellCheck={false}
                />
              </div>

              {/* Console Output */}
              {executionOutput && (
                <div className="rounded-2xl border border-slate-800 bg-[#0c0d12] p-3 text-xs font-mono text-slate-300">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Terminal className="w-3 h-3 text-slate-400" /> Output Konsol
                  </div>
                  <pre className="whitespace-pre-wrap text-emerald-300">{executionOutput}</pre>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DOCUMENT & NOTES */}
          {activeTab === 'doc' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-400">Editor Markdown</label>
                  <button
                    type="button"
                    onClick={() => handleCopy(docContent)}
                    className="text-[11px] text-amber-400 hover:underline flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" /> Salin Teks
                  </button>
                </div>
                <textarea
                  rows={13}
                  value={docContent}
                  onChange={(e) => setDocContent(e.target.value)}
                  className="w-full bg-[#1c1e28] border border-slate-700/80 rounded-2xl p-3 text-xs text-slate-200 font-mono focus:outline-none focus:border-amber-500 leading-relaxed select-text"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Pratinjau Live</label>
                <div className="w-full h-[280px] overflow-y-auto bg-[#0d0e12] border border-slate-800 rounded-2xl p-4 text-xs text-slate-200 prose prose-invert max-w-none leading-relaxed select-text">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {docContent}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SLIDES PRESENTATION */}
          {activeTab === 'slides' && (
            <div className="space-y-4">
              {/* Slide Preview Card */}
              <div className="w-full aspect-video max-w-lg mx-auto bg-gradient-to-br from-[#1c1e28] to-[#121319] border border-amber-500/30 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold tracking-wider uppercase text-amber-400">
                    SLIDE {currentSlideIndex + 1} DARI {slides.length}
                  </span>
                  <h3 className="text-lg font-extrabold text-white mt-1">
                    {slides[currentSlideIndex].title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {slides[currentSlideIndex].subtitle}
                  </p>
                </div>

                <div className="space-y-1.5 my-3">
                  {slides[currentSlideIndex].bulletPoints.map((pt, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-slate-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                      <span>{pt}</span>
                    </div>
                  ))}
                </div>

                <div className="text-[10px] text-slate-500 text-right">
                  Dihasilkan oleh Maria AI Presentation Engine
                </div>
              </div>

              {/* Slide Navigator Controls */}
              <div className="flex items-center justify-center gap-2">
                {slides.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentSlideIndex(idx)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      currentSlideIndex === idx
                        ? 'bg-amber-600 text-white'
                        : 'bg-[#1c1e28] text-slate-400 hover:text-white'
                    }`}
                  >
                    Slide {idx + 1}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#101116] border-t border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadFile}
              className="px-3 py-1.5 rounded-xl bg-[#1c1e28] hover:bg-[#282a36] text-slate-300 text-xs flex items-center gap-1.5 cursor-pointer border border-slate-700"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh Berkas</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl bg-[#1e202a] hover:bg-[#282a36] text-slate-300 text-xs font-medium cursor-pointer"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={handleSendToChat}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md cursor-pointer active:scale-95 transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Kirim ke Obrolan Maria AI</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
