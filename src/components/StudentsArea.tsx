import React, { useState } from 'react';
import {
  GraduationCap,
  Menu,
  MessageSquare,
  Sparkles,
  RotateCw,
  CheckCircle2,
  XCircle,
  Loader2,
  BookOpen,
  Trash2,
  Send,
  Layers,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.tsx';
import {
  StudySetItem,
  StudyFlashcard,
  loadStudySets,
  saveStudySets,
} from '../lib/workspaceStore.ts';

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface StudentsAreaProps {
  onBackToChat: () => void;
  onOpenSidebar: () => void;
  onStartTutorChat: (prompt: string) => void;
}

export const StudentsArea: React.FC<StudentsAreaProps> = React.memo(
  ({ onBackToChat, onOpenSidebar, onStartTutorChat }) => {
    const { isEn } = useLanguage();
    const [activeTab, setActiveTab] = useState<'flashcards' | 'quiz' | 'tutor'>('flashcards');
    const [level, setLevel] = useState<'SMA/SMK' | 'Mahasiswa' | 'Riset/Skripsi' | 'Coding' | 'Bahasa'>('Mahasiswa');

    // Flashcard state
    const [studySets, setStudySets] = useState<StudySetItem[]>(() => loadStudySets());
    const [fcTopic, setFcTopic] = useState('');
    const [activeSetId, setActiveSetId] = useState<string>(() => loadStudySets()[0]?.id || '');
    const [cardIndex, setCardIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [isGeneratingFc, setIsGeneratingFc] = useState(false);
    const [fcError, setFcError] = useState<string | null>(null);

    // Quiz state
    const [quizTopic, setQuizTopic] = useState('');
    const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
    const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
    const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
    const [quizError, setQuizError] = useState<string | null>(null);

    // Tutor state
    const [tutorQuestion, setTutorQuestion] = useState('');

    const activeSet = studySets.find((s) => s.id === activeSetId) || studySets[0] || null;
    const currentCard: StudyFlashcard | null =
      activeSet && activeSet.cards.length > 0
        ? activeSet.cards[Math.min(cardIndex, activeSet.cards.length - 1)]
        : null;

    const persistSets = (next: StudySetItem[]) => {
      setStudySets(next);
      saveStudySets(next);
    };

    const handleGenerateFlashcards = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!fcTopic.trim() || isGeneratingFc) return;
      setIsGeneratingFc(true);
      setFcError(null);

      const prompt = `Buat tepat 6 kartu belajar (flashcard) untuk topik "${fcTopic.trim()}" tingkat "${level}".
Balas HANYA dalam format JSON array valid tanpa markdown fence atau penjelasan tambahan, contoh:
[{"front":"Istilah atau pertanyaan singkat","back":"Penjelasan jelas dan ringkas"}]`;

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ role: 'user', content: prompt }],
            mode: 'thinking',
            webSearch: false,
            allowEmojis: false,
          }),
        });
        const data = await res.json();
        const rawText: string = data?.text || '';
        const jsonMatch = rawText.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
          throw new Error(isEn ? 'Could not parse flashcards from AI response.' : 'Format flashcard belum terbaca, silakan coba ulang.');
        }
        const parsed = JSON.parse(jsonMatch[0]);
        if (!Array.isArray(parsed) || parsed.length === 0) {
          throw new Error(isEn ? 'Empty flashcard result.' : 'Hasil flashcard kosong.');
        }

        const cards: StudyFlashcard[] = parsed.slice(0, 8).map((item: any, idx: number) => ({
          id: `card-${Date.now()}-${idx}`,
          front: String(item.front || item.question || `Card ${idx + 1}`),
          back: String(item.back || item.answer || '-'),
          mastered: false,
        }));

        const newSet: StudySetItem = {
          id: `set-${Date.now()}`,
          topic: fcTopic.trim(),
          level,
          cards,
          createdAt: new Date().toISOString(),
        };
        const next = [newSet, ...studySets];
        persistSets(next);
        setActiveSetId(newSet.id);
        setCardIndex(0);
        setIsFlipped(false);
        setFcTopic('');
      } catch (err: any) {
        setFcError(err?.message || (isEn ? 'Failed to generate flashcards.' : 'Gagal membuat flashcard.'));
      } finally {
        setIsGeneratingFc(false);
      }
    };

    const handleToggleMastered = () => {
      if (!activeSet || !currentCard) return;
      const next = studySets.map((set) => {
        if (set.id !== activeSet.id) return set;
        return {
          ...set,
          cards: set.cards.map((c) =>
            c.id === currentCard.id ? { ...c, mastered: !c.mastered } : c
          ),
        };
      });
      persistSets(next);
    };

    const handleDeleteSet = (id: string) => {
      const next = studySets.filter((s) => s.id !== id);
      persistSets(next);
      if (activeSetId === id) {
        setActiveSetId(next[0]?.id || '');
        setCardIndex(0);
        setIsFlipped(false);
      }
    };

    const handleGenerateQuiz = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!quizTopic.trim() || isGeneratingQuiz) return;
      setIsGeneratingQuiz(true);
      setQuizError(null);
      setSelectedAnswers({});

      const prompt = `Buat tepat 5 soal pilihan ganda untuk latihan siswa/mahasiswa tingkat "${level}" tentang topik "${quizTopic.trim()}".
Balas HANYA dalam format JSON array valid tanpa teks tambahan:
[{"question":"...","options":["A","B","C","D"],"correctIndex":0,"explanation":"Penjelasan singkat mengapa jawaban benar"}]`;

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ role: 'user', content: prompt }],
            mode: 'thinking',
            webSearch: false,
            allowEmojis: false,
          }),
        });
        const data = await res.json();
        const rawText: string = data?.text || '';
        const jsonMatch = rawText.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
          throw new Error(isEn ? 'Could not parse quiz questions.' : 'Format soal belum terbaca, silakan coba ulang.');
        }
        const parsed = JSON.parse(jsonMatch[0]);
        if (!Array.isArray(parsed) || parsed.length === 0) {
          throw new Error(isEn ? 'Empty quiz response.' : 'Soal tidak ditemukan.');
        }
        setQuizQuestions(
          parsed.slice(0, 6).map((q: any) => ({
            question: String(q.question || ''),
            options: Array.isArray(q.options) ? q.options.map(String) : ['A', 'B', 'C', 'D'],
            correctIndex: typeof q.correctIndex === 'number' ? q.correctIndex : 0,
            explanation: String(q.explanation || ''),
          }))
        );
      } catch (err: any) {
        setQuizError(err?.message || (isEn ? 'Failed to generate quiz.' : 'Gagal membuat kuis latihan.'));
      } finally {
        setIsGeneratingQuiz(false);
      }
    };

    const answeredCount = Object.keys(selectedAnswers).length;
    const correctCount = quizQuestions.reduce(
      (acc, q, idx) => (selectedAnswers[idx] === q.correctIndex ? acc + 1 : acc),
      0
    );

    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 text-slate-900 dark:bg-[#0e0f12] dark:text-white">
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
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <GraduationCap className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold tracking-tight truncate">
                {isEn ? 'Students Study Hub' : 'Students & Ruang Belajar'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {isEn
                  ? 'Flashcards, practice quizzes, and step-by-step academic tutoring'
                  : 'Flashcard AI, latihan kuis interaktif, dan bimbingan tugas langkah demi langkah'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onBackToChat}
            className="min-h-[40px] px-3 py-2 rounded-xl border border-slate-200 dark:border-[#2a2d3a] bg-white dark:bg-[#191b24] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#232634] text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>{isEn ? 'Back to Chat' : 'Kembali ke Chat'}</span>
          </button>
        </header>

        {/* Sub-Toolbar: Mode Tabs + Study Level */}
        <div className="px-4 sm:px-6 py-2.5 border-b border-slate-200 dark:border-[#1e2028] bg-white/80 dark:bg-[#111218] flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-1.5">
            {[
              { id: 'flashcards', label: 'Flashcards AI' },
              { id: 'quiz', label: isEn ? 'Practice Quiz' : 'Latihan Soal' },
              { id: 'tutor', label: isEn ? 'Step-by-Step Tutor' : 'Tutor Tugas' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 dark:bg-[#181a23] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <select
            value={level}
            onChange={(e) => setLevel(e.target.value as any)}
            aria-label={isEn ? 'Study Level' : 'Tingkat Belajar'}
            className="min-h-[36px] px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#181a23] border border-slate-200 dark:border-[#262938] text-xs font-medium focus:outline-none"
          >
            <option value="SMA/SMK">SMA / SMK</option>
            <option value="Mahasiswa">Mahasiswa (S1/S2)</option>
            <option value="Riset/Skripsi">Riset & Skripsi</option>
            <option value="Coding">Coding & Teknik</option>
            <option value="Bahasa">Bahasa Asing</option>
          </select>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="max-w-4xl mx-auto space-y-5">
            {/* TAB 1: FLASHCARDS */}
            {activeTab === 'flashcards' && (
              <>
                <form
                  onSubmit={handleGenerateFlashcards}
                  className="bg-white dark:bg-[#14161f] border border-slate-200 dark:border-[#232635] rounded-2xl p-4 flex flex-col sm:flex-row gap-2.5"
                >
                  <input
                    type="text"
                    value={fcTopic}
                    onChange={(e) => setFcTopic(e.target.value)}
                    placeholder={
                      isEn
                        ? 'Enter a study topic (e.g., Cell Biology, Linear Algebra, TypeScript Generics)...'
                        : 'Masukkan topik belajar (misal: Fotosintesis, Hukum Newton, Struktur Data)...'
                    }
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#101219] border border-slate-200 dark:border-[#262938] text-xs focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="submit"
                    disabled={isGeneratingFc || !fcTopic.trim()}
                    className="min-h-[42px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                  >
                    {isGeneratingFc ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    <span>{isEn ? 'Create Flashcards' : 'Buat Flashcard'}</span>
                  </button>
                </form>

                {fcError && <p className="text-xs text-rose-500">{fcError}</p>}

                {studySets.length > 0 && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {studySets.map((s) => (
                      <div
                        key={s.id}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs shrink-0 ${
                          activeSet?.id === s.id
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-400 text-emerald-700 dark:text-emerald-300 font-semibold'
                            : 'bg-white dark:bg-[#14161f] border-slate-200 dark:border-[#232635] text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setActiveSetId(s.id);
                            setCardIndex(0);
                            setIsFlipped(false);
                          }}
                          className="cursor-pointer flex items-center gap-1.5"
                        >
                          <Layers className="w-3.5 h-3.5" />
                          <span>{s.topic}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSet(s.id)}
                          aria-label={isEn ? 'Delete set' : 'Hapus set'}
                          className="p-0.5 text-slate-400 hover:text-rose-500 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {currentCard ? (
                  <div className="bg-white dark:bg-[#14161f] border border-slate-200 dark:border-[#232635] rounded-2xl p-5 sm:p-7 space-y-5">
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-semibold">
                        {activeSet?.topic} · {activeSet?.level}
                      </span>
                      <span className="tabular-nums">
                        {cardIndex + 1} / {activeSet?.cards.length}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsFlipped((f) => !f)}
                      className="w-full min-h-[200px] p-6 rounded-2xl border border-slate-200 dark:border-[#2a2e40] bg-slate-50 dark:bg-[#101219] flex flex-col items-center justify-center text-center gap-3 cursor-pointer hover:border-emerald-500"
                    >
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                        {isFlipped
                          ? isEn
                            ? 'Answer / Explanation'
                            : 'Jawaban / Penjelasan'
                          : isEn
                          ? 'Concept / Question (Tap to Flip)'
                          : 'Konsep / Pertanyaan (Ketuk untuk Balik)'}
                      </span>
                      <p className="text-sm sm:text-base font-semibold leading-relaxed max-w-xl">
                        {isFlipped ? currentCard.back : currentCard.front}
                      </p>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-1">
                        <RotateCw className="w-3 h-3" />
                        <span>{isEn ? 'Tap card to flip' : 'Ketuk kartu untuk membalik'}</span>
                      </span>
                    </button>

                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <button
                        type="button"
                        disabled={cardIndex === 0}
                        onClick={() => {
                          setCardIndex((i) => Math.max(0, i - 1));
                          setIsFlipped(false);
                        }}
                        className="min-h-[40px] px-4 py-2 rounded-xl border border-slate-200 dark:border-[#2a2d3a] text-xs font-semibold disabled:opacity-40 cursor-pointer"
                      >
                        {isEn ? 'Previous' : 'Sebelumnya'}
                      </button>

                      <button
                        type="button"
                        onClick={handleToggleMastered}
                        className={`min-h-[40px] px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                          currentCard.mastered
                            ? 'bg-emerald-600 text-white'
                            : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/70'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>
                          {currentCard.mastered
                            ? isEn
                              ? 'Mastered'
                              : 'Sudah Paham'
                            : isEn
                            ? 'Mark Mastered'
                            : 'Tandai Paham'}
                        </span>
                      </button>

                      <button
                        type="button"
                        disabled={!activeSet || cardIndex >= activeSet.cards.length - 1}
                        onClick={() => {
                          setCardIndex((i) => Math.min((activeSet?.cards.length || 1) - 1, i + 1));
                          setIsFlipped(false);
                        }}
                        className="min-h-[40px] px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold disabled:opacity-40 cursor-pointer"
                      >
                        {isEn ? 'Next' : 'Berikutnya'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white dark:bg-[#14161f] border border-dashed border-slate-200 dark:border-[#272a3a] rounded-2xl p-10 text-center space-y-2">
                    <BookOpen className="w-10 h-10 text-emerald-500/70 mx-auto" />
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {isEn
                        ? 'Type any subject or topic above to generate interactive study flashcards instantly.'
                        : 'Ketik mata pelajaran atau topik di atas untuk membuat flashcard belajar interaktif secara instan.'}
                    </p>
                  </div>
                )}
              </>
            )}

            {/* TAB 2: PRACTICE QUIZ */}
            {activeTab === 'quiz' && (
              <>
                <form
                  onSubmit={handleGenerateQuiz}
                  className="bg-white dark:bg-[#14161f] border border-slate-200 dark:border-[#232635] rounded-2xl p-4 flex flex-col sm:flex-row gap-2.5"
                >
                  <input
                    type="text"
                    value={quizTopic}
                    onChange={(e) => setQuizTopic(e.target.value)}
                    placeholder={
                      isEn
                        ? 'Quiz topic (e.g., World History, Python Loops, Organic Chemistry)...'
                        : 'Topik kuis latihan (misal: Integral Dasar, Ekonomi Mikro, Algoritma Sorting)...'
                    }
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#101219] border border-slate-200 dark:border-[#262938] text-xs focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="submit"
                    disabled={isGeneratingQuiz || !quizTopic.trim()}
                    className="min-h-[42px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                  >
                    {isGeneratingQuiz ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    <span>{isEn ? 'Generate 5 Questions' : 'Buat 5 Soal Kuis'}</span>
                  </button>
                </form>

                {quizError && <p className="text-xs text-rose-500">{quizError}</p>}

                {quizQuestions.length > 0 && (
                  <div className="space-y-4">
                    <div className="p-3.5 rounded-xl bg-white dark:bg-[#14161f] border border-slate-200 dark:border-[#232635] flex items-center justify-between text-xs font-semibold">
                      <span>
                        {isEn ? 'Progress:' : 'Progres:'} {answeredCount}/{quizQuestions.length}
                      </span>
                      <span className="text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {isEn ? 'Score:' : 'Skor:'} {correctCount}/{quizQuestions.length}
                      </span>
                    </div>

                    {quizQuestions.map((q, qIdx) => {
                      const picked = selectedAnswers[qIdx];
                      const hasAnswered = picked !== undefined;
                      return (
                        <div
                          key={qIdx}
                          className="bg-white dark:bg-[#14161f] border border-slate-200 dark:border-[#232635] rounded-2xl p-4 sm:p-5 space-y-3"
                        >
                          <div className="text-xs sm:text-sm font-bold leading-snug">
                            {qIdx + 1}. {q.question}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {q.options.map((opt, oIdx) => {
                              const isPicked = picked === oIdx;
                              const isRight = oIdx === q.correctIndex;
                              let btnClass =
                                'bg-slate-50 dark:bg-[#101219] border-slate-200 dark:border-[#262938] text-slate-700 dark:text-slate-200 hover:border-blue-400';
                              if (hasAnswered) {
                                if (isRight) {
                                  btnClass =
                                    'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-700 dark:text-emerald-300 font-semibold';
                                } else if (isPicked && !isRight) {
                                  btnClass =
                                    'bg-rose-50 dark:bg-rose-950/60 border-rose-500 text-rose-700 dark:text-rose-300';
                                }
                              }
                              return (
                                <button
                                  key={oIdx}
                                  type="button"
                                  disabled={hasAnswered}
                                  onClick={() =>
                                    setSelectedAnswers((prev) => ({ ...prev, [qIdx]: oIdx }))
                                  }
                                  className={`min-h-[42px] px-3.5 py-2 rounded-xl border text-left text-xs flex items-center justify-between gap-2 cursor-pointer ${btnClass}`}
                                >
                                  <span>{opt}</span>
                                  {hasAnswered && isRight && (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                  )}
                                  {hasAnswered && isPicked && !isRight && (
                                    <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                          {hasAnswered && q.explanation && (
                            <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-[#101219] p-3 rounded-xl border border-slate-200/80 dark:border-[#252836]">
                              {q.explanation}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* TAB 3: STEP-BY-STEP TUTOR */}
            {activeTab === 'tutor' && (
              <div className="bg-white dark:bg-[#14161f] border border-slate-200 dark:border-[#232635] rounded-2xl p-5 space-y-4">
                <div>
                  <h3 className="text-sm font-bold">
                    {isEn ? 'Socratic Homework & Exam Tutor' : 'Tutor Belajar Langkah-demi-Langkah'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {isEn
                      ? 'Maria will break down complex problems step by step so you truly master the concept.'
                      : 'Maria akan membedah soal atau materi sulit secara bertahap agar Anda benar-benar memahami konsepnya.'}
                  </p>
                </div>

                <textarea
                  rows={4}
                  value={tutorQuestion}
                  onChange={(e) => setTutorQuestion(e.target.value)}
                  placeholder={
                    isEn
                      ? 'Paste your math problem, essay question, thesis topic, or difficult concept here...'
                      : 'Tulis atau tempel soal hitungan, materi kuliah, judul skripsi, atau konsep yang ingin dibimbing...'
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#101219] border border-slate-200 dark:border-[#262938] text-xs focus:outline-none focus:border-emerald-500"
                />

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      isEn ? 'Explain using Feynman method' : 'Jelaskan dengan metode Feynman',
                      isEn ? 'Check my thesis outline' : 'Review kerangka skripsi saya',
                    ].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setTutorQuestion(preset)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#1b1e29] text-[11px] font-medium hover:bg-slate-200 dark:hover:bg-[#252938] cursor-pointer"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    disabled={!tutorQuestion.trim()}
                    onClick={() =>
                      onStartTutorChat(
                        `[Mode Tutor Belajar - Tingkat ${level}]\nBimbing saya memahami materi/soal berikut langkah demi langkah dengan analogi sederhana dan uji pemahaman singkat di akhir:\n\n${tutorQuestion.trim()}`
                      )
                    }
                    className="min-h-[42px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isEn ? 'Start Guided Tutoring' : 'Mulai Bimbingan di Chat'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
);
