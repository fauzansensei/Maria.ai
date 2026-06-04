import React, { useState, useEffect } from "react";
import { 
  FolderLock, 
  Search, 
  ArrowLeft, 
  Bookmark, 
  Trash2, 
  Copy, 
  Plus, 
  Edit, 
  Check, 
  Sparkles, 
  FileText, 
  FileImage, 
  VolumeX, 
  Volume2, 
  Clock, 
  ChevronRight,
  ExternalLink,
  MessageSquare,
  Archive
} from "lucide-react";
import { Message, UserSettings } from "../types";
import { THEME_OPTIONS } from "../constants";
import { auth, db, handleFirestoreError, OperationType } from "../firebase";
import { doc, updateDoc, onSnapshot } from "firebase/firestore";

export interface CustomPromptFormula {
  id: string;
  title: string;
  category: string;
  formula: string;
  timestamp: string;
}

interface LibraryAreaProps {
  settings: UserSettings;
  bookmarkedMessages: Message[];
  onToggleBookmark: (msg: Message) => void;
  onUsePromptFormula: (formula: string) => void;
  onRestoreSavedChat?: (savedChat: any) => void;
  onExit: () => void;
}

export default function LibraryArea({
  settings,
  bookmarkedMessages,
  onToggleBookmark,
  onUsePromptFormula,
  onRestoreSavedChat,
  onExit
}: LibraryAreaProps) {
  const currentTheme = THEME_OPTIONS.find(t => t.value === settings.theme) || THEME_OPTIONS[0];
  const [activeTab, setActiveTab] = useState<"bookmarks" | "saved-chats" | "my-prompts" | "my-docs">("bookmarks");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Saved Chats (Obrolan Diarsipkan) state
  const [savedChats, setSavedChats] = useState<any[]>(() => {
    // Return a default beautiful starter if none exists, as recommended by Maria
    return [
      {
        id: "chat_001",
        title: "Optimasi Web Serverless",
        timestamp: new Date().toISOString(),
        snippet: "Analisis teknis migrasi serverless, optimasi environment variable dan caching...",
        messages: [
          {
            id: "m1",
            role: "user",
            content: "Bagaimana melakukan optimasi platform Vercel?",
            timestamp: new Date(Date.now() - 120000).toISOString()
          },
          {
            id: "m2",
            role: "assistant",
            content: "Gunakan environment variables untuk API Key, minimalkan I/O disk dengan Client-Side Storage, dan manfaatkan caching edge network Vercel untuk performa sub-100ms.",
            timestamp: new Date().toISOString()
          }
        ]
      }
    ];
  });

  // Synchronize custom prompts & saved chats with Firestore if logged in
  useEffect(() => {
    if (!auth.currentUser) return;
    
    const userRef = doc(db, "users", auth.currentUser.uid);
    const unsub = onSnapshot(userRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.savedChats) {
          setSavedChats(data.savedChats);
        }
        if (data.myPrompts) {
          setMyPrompts(data.myPrompts);
        }
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `users/${auth.currentUser?.uid}`);
    });

    return () => unsub();
  }, []);

  // Save changes to Firestore for saved_chats
  const saveSavedChats = async (updated: any[]) => {
    setSavedChats(updated);
    if (auth.currentUser) {
      const userRef = doc(db, "users", auth.currentUser.uid);
      await updateDoc(userRef, {
        savedChats: updated
      }).catch(err => handleFirestoreError(err, OperationType.UPDATE, `users/${auth.currentUser?.uid}`));
    }
  };

  const handleDeleteSavedChat = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedChats.filter(c => c.id !== id);
    saveSavedChats(updated);
  };

  // My Custom Prompts section states
  const [myPrompts, setMyPrompts] = useState<CustomPromptFormula[]>(() => {
    return [
      {
        id: "mp-1",
        title: "Pembuat Ringkasan PDF Buku Ringkas",
        category: "Edukasi",
        formula: "Tolong baca materi bab ini dan buatkan 5 pertanyaan kunci (flashcards) beserta jawabannya untuk membantu saya menghafal:\n\n[Materi Bab]",
        timestamp: new Date().toISOString()
      },
      {
        id: "mp-2",
        title: "Pengoreksi Kesalahan Kode TypeScript",
        category: "Koding",
        formula: "Audit kode TypeScript di bawah ini terhadap kerentanan runtime dan efisiensi memori, lalu berikan kesimpulan optimasi:\n\n[Tempel Kode TS]",
        timestamp: new Date().toISOString()
      }
    ];
  });

  const [isPromptFormOpen, setIsPromptFormOpen] = useState(false);
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
  const [promptFormTitle, setPromptFormTitle] = useState("");
  const [promptFormCategory, setPromptFormCategory] = useState("Edukasi");
  const [promptFormFormula, setPromptFormFormula] = useState("");

  const saveMyPromptsToStorage = async (updated: CustomPromptFormula[]) => {
    setMyPrompts(updated);
    if (auth.currentUser) {
      const userRef = doc(db, "users", auth.currentUser.uid);
      await updateDoc(userRef, {
        myPrompts: updated
      }).catch(err => handleFirestoreError(err, OperationType.UPDATE, `users/${auth.currentUser?.uid}`));
    }
  };

  const handleOpenNewPromptForm = () => {
    setEditingPromptId(null);
    setPromptFormTitle("");
    setPromptFormCategory("Edukasi");
    setPromptFormFormula("");
    setIsPromptFormOpen(true);
  };

  const handleOpenEditPromptForm = (prompt: CustomPromptFormula) => {
    setEditingPromptId(prompt.id);
    setPromptFormTitle(prompt.title);
    setPromptFormCategory(prompt.category);
    setPromptFormFormula(prompt.formula);
    setIsPromptFormOpen(true);
  };

  const handleSavePromptFormula = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptFormTitle.trim() || !promptFormFormula.trim()) return;

    if (editingPromptId) {
      const updated = myPrompts.map(p => {
        if (p.id === editingPromptId) {
          return {
            ...p,
            title: promptFormTitle,
            category: promptFormCategory,
            formula: promptFormFormula,
            timestamp: new Date().toISOString()
          };
        }
        return p;
      });
      saveMyPromptsToStorage(updated);
    } else {
      const newPrompt: CustomPromptFormula = {
        id: `mp-${Date.now()}`,
        title: promptFormTitle,
        category: promptFormCategory,
        formula: promptFormFormula,
        timestamp: new Date().toISOString()
      };
      saveMyPromptsToStorage([newPrompt, ...myPrompts]);
    }
    setIsPromptFormOpen(false);
  };

  const handleDeletePromptFormula = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = myPrompts.filter(p => p.id !== id);
    saveMyPromptsToStorage(updated);
  };

  // Mock document files repository
  const [myFiles, setMyFiles] = useState([
    {
      id: "f-1",
      name: "Catatan_Metodologi_Agile.txt",
      type: "txt",
      size: "4.2 KB",
      date: "Kemarin",
      description: "Berisi kerangka materi pembelajaran Agile & Scrum untuk tim pengembang backend."
    },
    {
      id: "f-2",
      name: "Tabel_Daftar_Kompetitor_Swot.txt",
      type: "txt",
      size: "1.8 KB",
      date: "Mei 2026",
      description: "Hasil ramalan Maria AI mengenani SWOT analysis model bisnis coffeeshop nol sampah."
    },
    {
      id: "f-3",
      name: "Lampu_Kamar_Miring.jpg",
      type: "jpg",
      size: "245 KB",
      date: "Kemarin",
      description: "Lampiran visual kamar tidur hotel untuk naskah film pendek horor Riko."
    }
  ]);

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#0b0c0f] text-slate-200 select-none overflow-hidden border-l border-[#1e2025]">
      
      {/* Header Bar */}
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
              <FolderLock className="w-4 h-4 text-amber-500" />
              Pustaka Library Pribadi
            </h1>
            <p className="text-[10px] text-slate-400">
              Kelola penanda pesan penting, dokumen rujukan, dan koleksi formula instruksi rahasia Anda.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10.5px] text-zinc-400 font-medium">Bebas Limit Penyimpanan Lokal</span>
        </div>
      </div>

      {/* Tabs navigation menu bar */}
      <div className="px-6 bg-[#0f1015] border-b border-[#1a1c22]/75 flex gap-5 select-none shrink-0 text-xs font-bold text-slate-400">
        <button
          type="button"
          onClick={() => setActiveTab("bookmarks")}
          className={`py-3.5 relative cursor-pointer flex items-center gap-2 transition-colors ${
            activeTab === "bookmarks" ? "text-white" : "hover:text-slate-200"
          }`}
        >
          <Bookmark className="w-4 h-4" />
          <span>Ditandai ({bookmarkedMessages.length})</span>
          {activeTab === "bookmarks" && (
            <div className={`absolute bottom-0 left-0 right-0 h-[2.5px] bg-gradient-to-r ${currentTheme.bgGradient} rounded-t-full`} />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("saved-chats")}
          className={`py-3.5 relative cursor-pointer flex items-center gap-2 transition-colors ${
            activeTab === "saved-chats" ? "text-white" : "hover:text-slate-200"
          }`}
        >
          <Archive className="w-4 h-4" />
          <span>Arsip Chat ({savedChats.length})</span>
          {activeTab === "saved-chats" && (
            <div className={`absolute bottom-0 left-0 right-0 h-[2.5px] bg-gradient-to-r ${currentTheme.bgGradient} rounded-t-full`} />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("my-prompts")}
          className={`py-3.5 relative cursor-pointer flex items-center gap-2 transition-colors ${
            activeTab === "my-prompts" ? "text-white" : "hover:text-slate-200"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Formula Prompt Pribadi ({myPrompts.length})</span>
          {activeTab === "my-prompts" && (
            <div className={`absolute bottom-0 left-0 right-0 h-[2.5px] bg-gradient-to-r ${currentTheme.bgGradient} rounded-t-full`} />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("my-docs")}
          className={`py-3.5 relative cursor-pointer flex items-center gap-2 transition-colors ${
            activeTab === "my-docs" ? "text-white" : "hover:text-slate-200"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Dokumen & Lampiran ({myFiles.length})</span>
          {activeTab === "my-docs" && (
            <div className={`absolute bottom-0 left-0 right-0 h-[2.5px] bg-gradient-to-r ${currentTheme.bgGradient} rounded-t-full`} />
          )}
        </button>
      </div>

      {/* Library Area Main Dynamic Frame Body */}
      <div className="flex-1 overflow-y-auto p-6 bg-[#101117] no-scrollbar">
        
        {/* Tab 1: Bookmarks items */}
        {activeTab === "bookmarks" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs pb-1.5 border-b border-slate-800/60">
              <span className="text-slate-400">Pesan dan Potongan Jawaban Penting yang Ditandai</span>
              <span className="text-slate-500 text-[10px] italic">Jumlah: {bookmarkedMessages.length} Item</span>
            </div>

            {bookmarkedMessages.length === 0 ? (
              <div className="py-20 text-center space-y-3.5 max-w-sm mx-auto">
                <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
                  <Bookmark className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-white">Belum Ada Pesan Ditandai</h4>
                  <p className="text-[10px] text-[#64748b] leading-normal">
                    Saat mengobrol dengan Maria AI di ruang pesan, klik ikon <strong className="text-slate-300">Penanda</strong> di bawah balon chat jawaban Maria untuk menyimpannya di sini.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {bookmarkedMessages.map(msg => (
                  <div 
                    key={msg.id}
                    className="p-4 rounded-xl bg-[#14151b] border border-slate-800/80 hover:border-slate-700/80 transition-all text-left space-y-3 group"
                  >
                    <div className="flex items-center justify-between text-[10px] text-slate-450">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase ${
                          msg.role === "assistant" ? "bg-emerald-500/10 text-emerald-400" : "bg-blue-500/10 text-blue-400"
                        }`}>
                          {msg.role === "assistant" ? "Maria AI" : "Anda"}
                        </span>
                        <span className="text-slate-500 font-bold font-mono">ID: {msg.id.slice(0, 8)}</span>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {/* Copy button */}
                        <button
                          type="button"
                          onClick={() => handleCopyText(msg.id, msg.content)}
                          className="hover:text-white flex items-center gap-1 transition-all cursor-pointer font-bold shrink-0"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-400 text-[9px]">Tersalin</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Salin</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => onToggleBookmark(msg)}
                          className="text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
                          title="Hapus dari Penanda"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed font-sans whitespace-pre-wrap select-text">
                      {msg.content}
                    </p>

                    <div className="flex items-center justify-between border-t border-slate-800/60 pt-2 text-[10px] text-slate-500">
                      <span>Ditandai pada {new Date(msg.timestamp).toLocaleDateString("id-ID", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                      <button
                        type="button"
                        onClick={() => onUsePromptFormula(msg.content)}
                        className="text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>Kirim ke Chat Baru</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab: Saved Chats (Obrolan Diarsipkan) */}
        {activeTab === "saved-chats" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs pb-1.5 border-b border-slate-800/60">
              <span className="text-slate-400">Arsip Sesi Obrolan Terpilih Anda</span>
              <span className="text-slate-500 text-[10px] italic">Jumlah: {savedChats.length} Sesi</span>
            </div>

            {savedChats.length === 0 ? (
              <div className="py-20 text-center space-y-3.5 max-w-sm mx-auto">
                <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
                  <Archive className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-white">Belum Ada Sesi Diarsipkan</h4>
                  <p className="text-[10px] text-[#64748b] leading-normal font-sans">
                    Anda dapat menyimpan percakapan aktif dari menu samping (Sidebar). Klik tombol tindakan percakapan lalu pilih <strong className="text-slate-300">Arsipkan ke Pustaka</strong> untuk menyimpannya di sini.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {savedChats.map(chat => (
                  <div
                    key={chat.id}
                    className="p-4 rounded-xl bg-[#14151b] border border-slate-800/85 hover:border-slate-750 transition-all text-left flex flex-col justify-between gap-4 group"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-500 font-mono">ID: {chat.id.slice(0, 8)}</span>
                        
                        <button
                          type="button"
                          onClick={(e) => handleDeleteSavedChat(chat.id, e)}
                          className="p-1 hover:bg-slate-800 rounded text-slate-500 hover:text-red-400 cursor-pointer duration-200 transition-colors"
                          title="Hapus Sesi"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="space-y-1 text-left">
                        <span className="block text-xs font-bold text-white tracking-tight line-clamp-1">{chat.title}</span>
                        <p className="text-[10.5px] text-slate-400 leading-relaxed italic line-clamp-3 p-2.5 rounded-lg border border-slate-901 bg-[#0a0b0f]/40 font-mono">
                          {chat.snippet || "Tidak ada cuplikan isi..."}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-850 pt-2.5 text-[10px]">
                      <span className="text-slate-500">
                        {new Date(chat.timestamp).toLocaleDateString("id-ID", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (onRestoreSavedChat) {
                            onRestoreSavedChat(chat);
                          }
                        }}
                        className="py-1 px-3 bg-[#4f46e5]/80 hover:bg-[#4f46e5] text-white rounded-lg font-semibold flex items-center gap-1 cursor-pointer duration-200 transition-all shadow-sm"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>Puluhkan & Lanjutkan</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Private custom prompt formula builder */}
        {activeTab === "my-prompts" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs pb-1.5 border-b border-slate-800/60">
              <span className="text-slate-400">Arsip Formula Kalimat Perintah Anda</span>
              <button
                type="button"
                onClick={handleOpenNewPromptForm}
                className="py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-[10.5px] transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Buat Baru</span>
              </button>
            </div>

            {/* Prompt submission card form overlay */}
            {isPromptFormOpen && (
              <form 
                onSubmit={handleSavePromptFormula}
                className="p-5 bg-[#14151b] border border-indigo-500/45 rounded-2xl space-y-4 text-left animate-fade-in"
              >
                <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    {editingPromptId ? "Ubah Formula Prompt Anda" : "Buat Formula Prompt Baru"}
                  </h4>
                  <button
                    type="button"
                    onClick={() => setIsPromptFormOpen(false)}
                    className="text-slate-500 hover:text-white font-bold text-[10px] cursor-pointer"
                  >
                    Batal
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase">Nama / Judul Prompt</label>
                    <input
                      type="text"
                      required
                      value={promptFormTitle}
                      onChange={e => setPromptFormTitle(e.target.value)}
                      className="w-full bg-[#0a0b0f] border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3 py-2 text-xs text-white outline-none"
                      placeholder="Contoh: Perangkum Jurnal Penelitian"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase">Kategori</label>
                    <select
                      value={promptFormCategory}
                      onChange={e => setPromptFormCategory(e.target.value)}
                      className="w-full bg-[#0a0b0f] border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3 py-2 text-xs text-white outline-none cursor-pointer"
                    >
                      <option value="Edukasi">Edukasi & Belajar</option>
                      <option value="Koding">Koding & Software</option>
                      <option value="Marketing">Marketing / Bisnis</option>
                      <option value="Kreatif">Kreatif / Hiburan</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase">
                    <label>Isi Formula Instruksi (Prompt Content)</label>
                    <span className="text-slate-500">Gunakan tag seperti [Materi Bab] sebagai penanda</span>
                  </div>
                  <textarea
                    required
                    value={promptFormFormula}
                    onChange={e => setPromptFormFormula(e.target.value)}
                    className="w-full min-h-[100px] max-h-[180px] bg-[#0a0b0f] border border-slate-800 focus:border-indigo-500/80 rounded-xl p-3 text-xs text-white outline-none resize-none font-mono placeholder:text-zinc-650"
                    placeholder="Contoh: Tolong koreksi kesalahan sintaks kode pemrograman ini...\n\n[Tempel Kode]"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsPromptFormOpen(false)}
                    className="px-3.5 py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-750 text-slate-400 hover:text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className={`px-4.5 py-1.5 bg-gradient-to-r ${currentTheme.bgGradient} text-white font-bold rounded-lg text-[10px] transition-all cursor-pointer shadow`}
                  >
                    Simpan Formula
                  </button>
                </div>
              </form>
            )}

            {myPrompts.length === 0 ? (
              <div className="py-20 text-center space-y-3 mx-auto max-w-sm">
                <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-white">Belum Ada Formula Prompt</h4>
                  <p className="text-[10px] text-[#64748b]">
                    Buat formula peritah Anda sendiri agar dapat digunakan kembali secara kilat kapan saja tanpa menulis ulang.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {myPrompts.map(prompt => (
                  <div
                    key={prompt.id}
                    className="p-4 rounded-xl bg-[#14151b] border border-slate-800/85 hover:border-slate-750 transition-all text-left flex flex-col justify-between gap-4 group"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-bold uppercase tracking-wider">
                          {prompt.category}
                        </span>

                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => handleOpenEditPromptForm(prompt)}
                            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white cursor-pointer"
                            title="Edit"
                          >
                            <Edit className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDeletePromptFormula(prompt.id, e)}
                            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-red-400 cursor-pointer"
                            title="Hapus"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1 text-left">
                        <span className="block text-xs font-bold text-white tracking-tight">{prompt.title}</span>
                        <p className="text-[10.5px] text-slate-450 leading-relaxed italic line-clamp-3 bg-[#0a0b0f]/50 p-2.5 rounded-lg border border-slate-900 font-mono">
                          {prompt.formula}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-850 pt-2.5 text-[10px]">
                      <span className="text-slate-500">Tersimpan di Local Browser</span>
                      <button
                        type="button"
                        onClick={() => onUsePromptFormula(prompt.formula)}
                        className="py-1 px-2.5 bg-indigo-600 hover:bg-indigo-750 text-white rounded-lg font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Kirim Prompt</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        )}

        {/* Tab 3: Documents and static attachments catalog */}
        {activeTab === "my-docs" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs pb-1.5 border-b border-slate-800/60">
              <span className="text-slate-400">Pustaka Lampiran Dokumen Anda</span>
              <span className="text-slate-500 text-[10px] italic">Jumlah: {myFiles.length} Berkas</span>
            </div>

            <div className="space-y-2.5">
              {myFiles.map(file => {
                const isImage = file.type === "jpg" || file.type === "png";
                return (
                  <div 
                    key={file.id} 
                    className="p-3.5 rounded-xl bg-[#14151b] border border-slate-850 hover:bg-[#181921] transition-all flex items-center justify-between gap-4 text-left group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                        isImage 
                          ? "bg-amber-500/10 border-amber-500/20 text-amber-500" 
                          : "bg-blue-500/10 border-blue-500/20 text-blue-500"
                      }`}>
                        {isImage ? <FileImage className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                      </div>

                      <div className="min-w-0 font-sans">
                        <span className="block text-xs font-bold text-white truncate group-hover:text-blue-400 transition-colors">
                          {file.name}
                        </span>
                        <p className="text-[10px] text-[#8e9cae] truncate mt-0.5 max-w-[280px] sm:max-w-md">
                          {file.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-[10.5px] select-none text-right shrink-0">
                      <div className="text-right">
                        <span className="block text-zinc-300 font-mono text-[10px]">{file.size}</span>
                        <span className="block text-slate-500 text-[9px] font-bold mt-0.5">{file.date}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (isImage) {
                            alert("Berkas Gambar Anda siap diakses. Sampaikan keluhan atau rujukan visual kapan saja di forum chat Maria AI ✨");
                          } else {
                            onUsePromptFormula(`Tolong bacakan dokumen rujukan saya berikut ini dan berikan review SWOT mendalam:\n\n[Isi dari ${file.name}]`);
                          }
                        }}
                        className="p-1 px-2.5 bg-slate-800 hover:bg-slate-700 hover:text-white rounded-lg text-slate-400 font-bold transition-all border border-slate-750/80 cursor-pointer flex items-center gap-1"
                        title="Buka lampiran"
                      >
                        <ExternalLink className="w-3 h-3 text-slate-500" />
                        <span>Pakai</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
