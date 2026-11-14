import React, { useState, useRef, useEffect } from 'react';
import {
  BookOpen,
  Plus,
  FileText,
  Sparkles,
  Trash2,
  Send,
  Upload,
  Menu,
  MessageSquare,
  Loader2,
  Check,
  GraduationCap,
  ChevronRight,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.tsx';
import {
  NotebookItem,
  NotebookSource,
  loadNotebooks,
  saveNotebooks,
} from '../lib/workspaceStore.ts';

interface NotebookAreaProps {
  onBackToChat: () => void;
  onOpenSidebar: () => void;
  onSendPromptToChat: (prompt: string) => void;
  selectedNotebookId?: string | null;
}

export const NotebookArea: React.FC<NotebookAreaProps> = React.memo(
  ({ onBackToChat, onOpenSidebar, onSendPromptToChat, selectedNotebookId }) => {
    const { isEn } = useLanguage();
    const [notebooks, setNotebooks] = useState<NotebookItem[]>(() => loadNotebooks());
    const [activeId, setActiveId] = useState<string>(() => {
      const list = loadNotebooks();
      if (selectedNotebookId && list.some((n) => n.id === selectedNotebookId)) {
        return selectedNotebookId;
      }
      return list[0]?.id || '';
    });

    const [newSourceTitle, setNewSourceTitle] = useState('');
    const [newSourceContent, setNewSourceContent] = useState('');
    const [showAddSource, setShowAddSource] = useState(false);
    const [question, setQuestion] = useState('');
    const [aiAnswer, setAiAnswer] = useState<string | null>(null);
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [savedIndicator, setSavedIndicator] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
      if (selectedNotebookId) {
        const list = loadNotebooks();
        setNotebooks(list);
        if (list.some((n) => n.id === selectedNotebookId)) {
          setActiveId(selectedNotebookId);
          setAiAnswer(null);
        }
      }
    }, [selectedNotebookId]);

    const activeNotebook = notebooks.find((n) => n.id === activeId) || notebooks[0] || null;

    const persist = (next: NotebookItem[]) => {
      setNotebooks(next);
      saveNotebooks(next);
      setSavedIndicator(true);
      window.setTimeout(() => setSavedIndicator(false), 1200);
    };

    const handleCreateNotebook = () => {
      const nb: NotebookItem = {
        id: `nb-${Date.now()}`,
        title: isEn ? `Untitled Notebook ${notebooks.length + 1}` : `Notebook Baru ${notebooks.length + 1}`,
        description: isEn ? 'Personal knowledge & research notebook' : 'Catatan riset & sumber pengetahuan pribadi',
        sources: [],
        notes: '',
        aiSummary: '',
        updatedAt: new Date().toISOString(),
      };
      const next = [nb, ...notebooks];
      persist(next);
      setActiveId(nb.id);
      setAiAnswer(null);
    };

    const handleDeleteNotebook = (id: string) => {
      const next = notebooks.filter((n) => n.id !== id);
      persist(next);
      if (activeId === id) {
        setActiveId(next[0]?.id || '');
        setAiAnswer(null);
      }
    };

    const handleUpdateActive = (patch: Partial<NotebookItem>) => {
      if (!activeNotebook) return;
      const next = notebooks.map((n) =>
        n.id === activeNotebook.id ? { ...n, ...patch, updatedAt: new Date().toISOString() } : n
      );
      persist(next);
    };

    const handleAddTextSource = () => {
      if (!activeNotebook || !newSourceContent.trim()) return;
      const src: NotebookSource = {
        id: `src-${Date.now()}`,
        title: newSourceTitle.trim() || (isEn ? 'Text Note Source' : 'Sumber Catatan Teks'),
        content: newSourceContent.trim(),
        type: 'text',
        createdAt: new Date().toISOString(),
      };
      handleUpdateActive({ sources: [src, ...activeNotebook.sources] });
      setNewSourceTitle('');
      setNewSourceContent('');
      setShowAddSource(false);
    };

    const handleUploadSourceFile = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !activeNotebook) return;
      const reader = new FileReader();
      reader.onload = () => {
        const text = typeof reader.result === 'string' ? reader.result : '';
        const src: NotebookSource = {
          id: `src-${Date.now()}`,
          title: file.name,
          content: text.slice(0, 25000) || `[File: ${file.name}]`,
          type: 'file',
          createdAt: new Date().toISOString(),
        };
        handleUpdateActive({ sources: [src, ...activeNotebook.sources] });
      };
      reader.readAsText(file);
      e.target.value = '';
    };

    const handleRemoveSource = (srcId: string) => {
      if (!activeNotebook) return;
      handleUpdateActive({
        sources: activeNotebook.sources.filter((s) => s.id !== srcId),
      });
    };

    const runNotebookAi = async (task: 'summary' | 'study-guide' | 'qa', customQuestion?: string) => {
      if (!activeNotebook) return;
      const sourceText = activeNotebook.sources
        .map((s, idx) => `[Sumber ${idx + 1}: ${s.title}]\n${s.content}`)
        .join('\n\n');
      const combinedContext = [sourceText, activeNotebook.notes ? `[Catatan Pengguna]\n${activeNotebook.notes}` : '']
        .filter(Boolean)
        .join('\n\n');

      if (!combinedContext.trim()) {
        setAiAnswer(
          isEn
            ? 'Please add at least one source or write some notes in this notebook first.'
            : 'Silakan tambahkan minimal satu sumber atau tulis catatan di notebook ini terlebih dahulu.'
        );
        return;
      }

      setIsAiLoading(true);
      setAiAnswer(null);

      let promptText = '';
      if (task === 'summary') {
        promptText = isEn
          ? `Summarize all sources and notes from my notebook "${activeNotebook.title}" into clear key insights and bullet points:\n\n${combinedContext}`
          : `Ringkas seluruh sumber dan catatan dari notebook "${activeNotebook.title}" menjadi poin-poin inti yang jelas dan terstruktur:\n\n${combinedContext}`;
      } else if (task === 'study-guide') {
        promptText = isEn
          ? `Create a structured Study Guide (key concepts, definitions, and 5 review questions with answers) based on notebook "${activeNotebook.title}":\n\n${combinedContext}`
          : `Buat Panduan Belajar terstruktur (konsep kunci, istilah penting, dan 5 pertanyaan evaluasi beserta jawabannya) berdasarkan notebook "${activeNotebook.title}":\n\n${combinedContext}`;
      } else {
        promptText = isEn
          ? `Answer this question strictly grounded in my notebook "${activeNotebook.title}" sources & notes.\nQuestion: ${customQuestion}\n\nNotebook Content:\n${combinedContext}`
          : `Jawab pertanyaan ini dengan berpedoman pada sumber & catatan di notebook "${activeNotebook.title}".\nPertanyaan: ${customQuestion}\n\nIsi Notebook:\n${combinedContext}`;
      }

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ role: 'user', content: promptText }],
            mode: 'thinking',
            webSearch: false,
            allowEmojis: false,
          }),
        });
        const data = await res.json();
        const reply = data?.text || data?.error || (isEn ? 'Failed to analyze notebook.' : 'Gagal menganalisis notebook.');
        setAiAnswer(reply);
        if (task === 'summary') {
          handleUpdateActive({ aiSummary: reply });
        }
      } catch (err: any) {
        setAiAnswer(err?.message || (isEn ? 'Network error while contacting Maria AI.' : 'Kendala koneksi saat menghubungi Maria AI.'));
      } finally {
        setIsAiLoading(false);
      }
    };

    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 text-slate-900 dark:bg-[#0e0f12] dark:text-white">
        {/* Top Header */}
        <header className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3.5 border-b border-slate-200 dark:border-[#1e2028] bg-white dark:bg-[#13141a] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onOpenSidebar}
              aria-label={isEn ? 'Open Menu' : 'Buka Menu'}
              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1f212c] cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/70 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <BookOpen className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold tracking-tight truncate">
                  {isEn ? 'Notebooks' : 'Notebook'}
                </h2>
                {savedIndicator && (
                  <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <Check className="w-3 h-3" /> {isEn ? 'Saved' : 'Tersimpan'}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {isEn
                  ? 'Collect sources, take notes, and ask Maria AI inside your notebook'
                  : 'Kumpulkan sumber, catat ide, dan analisis dengan Maria AI'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCreateNotebook}
              className="min-h-[40px] px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">{isEn ? 'New Notebook' : 'Notebook Baru'}</span>
            </button>
            <button
              type="button"
              onClick={onBackToChat}
              className="min-h-[40px] px-3 py-2 rounded-xl border border-slate-200 dark:border-[#2a2d3a] bg-white dark:bg-[#191b24] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#232634] text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isEn ? 'Chat' : 'Chat'}</span>
            </button>
          </div>
        </header>

        {/* Notebook Selector Strip */}
        <div className="px-4 sm:px-6 py-2.5 border-b border-slate-200 dark:border-[#1e2028] bg-white/80 dark:bg-[#111218] flex items-center gap-2 overflow-x-auto scrollbar-none shrink-0">
          {notebooks.map((nb) => {
            const isSelected = activeNotebook?.id === nb.id;
            return (
              <button
                key={nb.id}
                type="button"
                onClick={() => {
                  setActiveId(nb.id);
                  setAiAnswer(null);
                }}
                className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer border ${
                  isSelected
                    ? 'bg-blue-600 border-blue-600 text-white font-semibold'
                    : 'bg-slate-100 dark:bg-[#181a23] border-slate-200 dark:border-[#262938] text-slate-700 dark:text-slate-300 hover:border-blue-400'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 shrink-0" />
                <span className="max-w-[160px] truncate">{nb.title}</span>
              </button>
            );
          })}
        </div>

        {/* Main Workspace Body */}
        {!activeNotebook ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <BookOpen className="w-12 h-12 text-slate-400 dark:text-slate-600 mb-3" />
            <h3 className="text-base font-bold mb-1">
              {isEn ? 'No Notebooks Yet' : 'Belum Ada Notebook'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-4">
              {isEn
                ? 'Create your first notebook to organize documents, notes, and AI summaries.'
                : 'Buat notebook pertama Anda untuk menyimpan sumber dokumen, catatan, dan ringkasan AI.'}
            </p>
            <button
              type="button"
              onClick={handleCreateNotebook}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{isEn ? 'Create First Notebook' : 'Buat Notebook Pertama'}</span>
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="max-w-6xl mx-auto space-y-5">
              {/* Notebook Title & Delete Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-[#202330]">
                <div className="flex-1 space-y-1">
                  <input
                    type="text"
                    value={activeNotebook.title}
                    onChange={(e) => handleUpdateActive({ title: e.target.value })}
                    className="w-full bg-transparent text-lg sm:text-xl font-bold text-slate-900 dark:text-white focus:outline-none border-b border-transparent focus:border-blue-500 pb-0.5"
                    placeholder={isEn ? 'Notebook title...' : 'Judul notebook...'}
                  />
                  <input
                    type="text"
                    value={activeNotebook.description}
                    onChange={(e) => handleUpdateActive({ description: e.target.value })}
                    className="w-full bg-transparent text-xs text-slate-500 dark:text-slate-400 focus:outline-none"
                    placeholder={isEn ? 'Add a short description...' : 'Tambahkan deskripsi singkat...'}
                  />
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      const sourceText = activeNotebook.sources
                        .map((s) => `${s.title}:\n${s.content}`)
                        .join('\n\n');
                      onSendPromptToChat(
                        `${isEn ? 'Let us discuss my notebook' : 'Mari bahas isi notebook saya'} "${activeNotebook.title}":\n\n${sourceText}\n\n${activeNotebook.notes}`
                      );
                    }}
                    className="min-h-[40px] px-3 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>{isEn ? 'Open in Chat' : 'Bahas di Chat'}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteNotebook(activeNotebook.id)}
                    title={isEn ? 'Delete notebook' : 'Hapus notebook'}
                    className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl border border-slate-200 dark:border-[#2a2d3a] text-slate-500 hover:text-rose-500 hover:border-rose-400 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* 2-Column Layout: Sources + Notes & AI */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* Left Column: Sources (5 cols) */}
                <div className="lg:col-span-5 bg-white dark:bg-[#14161f] border border-slate-200 dark:border-[#232635] rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold">
                        {isEn ? 'Sources' : 'Sumber Materi'} ({activeNotebook.sources.length})
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {isEn ? 'Text snippets or uploaded files' : 'Teks referensi atau berkas dokumen'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".txt,.md,.json,.csv,.js,.ts,.py,.html,.css"
                        onChange={handleUploadSourceFile}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="min-h-[36px] px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-[#2c3042] text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#1e2130] flex items-center gap-1 cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{isEn ? 'File' : 'Berkas'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddSource((v) => !v)}
                        className="min-h-[36px] px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{isEn ? 'Add' : 'Tambah'}</span>
                      </button>
                    </div>
                  </div>

                  {showAddSource && (
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#191c28] border border-slate-200 dark:border-[#2a2e40] space-y-2">
                      <input
                        type="text"
                        value={newSourceTitle}
                        onChange={(e) => setNewSourceTitle(e.target.value)}
                        placeholder={isEn ? 'Source title...' : 'Judul sumber...'}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#11131b] border border-slate-200 dark:border-[#2a2e40] text-xs focus:outline-none focus:border-blue-500"
                      />
                      <textarea
                        rows={4}
                        value={newSourceContent}
                        onChange={(e) => setNewSourceContent(e.target.value)}
                        placeholder={isEn ? 'Paste article, notes, or data here...' : 'Tempel artikel, catatan, atau data di sini...'}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#11131b] border border-slate-200 dark:border-[#2a2e40] text-xs focus:outline-none focus:border-blue-500"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setShowAddSource(false)}
                          className="px-3 py-1.5 rounded-lg text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                        >
                          {isEn ? 'Cancel' : 'Batal'}
                        </button>
                        <button
                          type="button"
                          onClick={handleAddTextSource}
                          className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold cursor-pointer"
                        >
                          {isEn ? 'Save Source' : 'Simpan Sumber'}
                        </button>
                      </div>
                    </div>
                  )}

                  {activeNotebook.sources.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-[#272a3a] rounded-xl">
                      {isEn ? 'No sources added yet. Add text or upload a file.' : 'Belum ada sumber. Tambahkan teks atau unggah berkas.'}
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                      {activeNotebook.sources.map((src) => (
                        <div
                          key={src.id}
                          className="p-3 rounded-xl bg-slate-50 dark:bg-[#181a24] border border-slate-200/80 dark:border-[#262938] flex items-start justify-between gap-2"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100">
                              <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                              <span className="truncate">{src.title}</span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                              {src.content}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveSource(src.id)}
                            aria-label={isEn ? 'Remove source' : 'Hapus sumber'}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 cursor-pointer shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right Column: Notes & Notebook AI Studio (7 cols) */}
                <div className="lg:col-span-7 space-y-4">
                  {/* Personal Notes Editor */}
                  <div className="bg-white dark:bg-[#14161f] border border-slate-200 dark:border-[#232635] rounded-2xl p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold">
                        {isEn ? 'Notebook Notes' : 'Catatan Notebook'}
                      </h3>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        {isEn ? 'Auto-saved locally' : 'Tersimpan otomatis'}
                      </span>
                    </div>
                    <textarea
                      rows={5}
                      value={activeNotebook.notes}
                      onChange={(e) => handleUpdateActive({ notes: e.target.value })}
                      placeholder={
                        isEn
                          ? 'Write your synthesis, ideas, or meeting notes here...'
                          : 'Tulis rangkuman ide, poin penting, atau catatan pribadi di sini...'
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#101219] border border-slate-200 dark:border-[#262938] text-xs leading-relaxed focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* AI Analysis Actions */}
                  <div className="bg-white dark:bg-[#14161f] border border-slate-200 dark:border-[#232635] rounded-2xl p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-bold flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-blue-500" />
                        <span>{isEn ? 'Notebook AI Assistant' : 'Asisten AI Notebook'}</span>
                      </h3>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          disabled={isAiLoading}
                          onClick={() => runNotebookAi('summary')}
                          className="min-h-[36px] px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/70 text-blue-700 dark:text-blue-300 text-xs font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/60 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>{isEn ? 'Summarize Sources' : 'Ringkas Sumber'}</span>
                        </button>
                        <button
                          type="button"
                          disabled={isAiLoading}
                          onClick={() => runNotebookAi('study-guide')}
                          className="min-h-[36px] px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/70 text-emerald-700 dark:text-emerald-300 text-xs font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-900/60 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <GraduationCap className="w-3.5 h-3.5" />
                          <span>{isEn ? 'Study Guide' : 'Panduan Belajar'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Ask Question Grounded in Notebook */}
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (question.trim()) {
                          runNotebookAi('qa', question.trim());
                        }
                      }}
                      className="flex gap-2"
                    >
                      <input
                        type="text"
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        placeholder={
                          isEn
                            ? 'Ask a question based on this notebook...'
                            : 'Ajukan pertanyaan berdasarkan isi notebook ini...'
                        }
                        className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#101219] border border-slate-200 dark:border-[#262938] text-xs focus:outline-none focus:border-blue-500"
                      />
                      <button
                        type="submit"
                        disabled={isAiLoading || !question.trim()}
                        className="min-h-[40px] px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0"
                      >
                        {isAiLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-3.5 h-3.5" />
                        )}
                        <span>{isEn ? 'Ask' : 'Tanya'}</span>
                      </button>
                    </form>

                    {(isAiLoading || aiAnswer || activeNotebook.aiSummary) && (
                      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#101219] border border-slate-200 dark:border-[#262938] text-xs leading-relaxed whitespace-pre-wrap text-slate-700 dark:text-slate-200 max-h-[320px] overflow-y-auto">
                        {isAiLoading ? (
                          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>
                              {isEn ? 'Maria is analyzing your notebook sources...' : 'Maria sedang menganalisis sumber notebook...'}
                            </span>
                          </div>
                        ) : (
                          aiAnswer || activeNotebook.aiSummary
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
);
