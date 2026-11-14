import React, { useState } from 'react';
import {
  Zap,
  Plus,
  Trash2,
  Menu,
  MessageSquare,
  Check,
  Play,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import { UserSettings } from '../types.ts';
import { useLanguage } from '../context/LanguageContext.tsx';
import {
  BUILTIN_SKILLS,
  SkillItem,
  loadCustomSkills,
  saveCustomSkills,
} from '../lib/workspaceStore.ts';

interface SkillsAreaProps {
  settings: UserSettings;
  onUpdateSettings: (patch: Partial<UserSettings>) => void;
  onRunSkillInChat: (skill: SkillItem, taskInput: string) => void;
  onBackToChat: () => void;
  onOpenSidebar: () => void;
}

export const SkillsArea: React.FC<SkillsAreaProps> = React.memo(
  ({ settings, onUpdateSettings, onRunSkillInChat, onBackToChat, onOpenSidebar }) => {
    const { isEn } = useLanguage();
    const [customSkills, setCustomSkills] = useState<SkillItem[]>(() => loadCustomSkills());
    const [showCreate, setShowCreate] = useState(false);
    const [name, setName] = useState('');
    const [category, setCategory] = useState('Custom');
    const [description, setDescription] = useState('');
    const [promptTemplate, setPromptTemplate] = useState('');
    const [quickTaskMap, setQuickTaskMap] = useState<Record<string, string>>({});

    const allSkills = [...customSkills, ...BUILTIN_SKILLS];

    const handleCreateSkill = (e: React.FormEvent) => {
      e.preventDefault();
      if (!name.trim() || !promptTemplate.trim()) return;

      const nextItem: SkillItem = {
        id: `skill-${Date.now()}`,
        name: name.trim(),
        category: category.trim() || 'Custom',
        description: description.trim() || (isEn ? 'Custom user workflow skill' : 'Skill alur kerja kustom'),
        promptTemplate: promptTemplate.trim(),
        isBuiltIn: false,
      };
      const next = [nextItem, ...customSkills];
      setCustomSkills(next);
      saveCustomSkills(next);
      setName('');
      setDescription('');
      setPromptTemplate('');
      setShowCreate(false);
    };

    const handleDeleteSkill = (id: string) => {
      const next = customSkills.filter((s) => s.id !== id);
      setCustomSkills(next);
      saveCustomSkills(next);
    };

    const handleActivateSkill = (skill: SkillItem) => {
      onUpdateSettings({ customPrompt: skill.promptTemplate });
    };

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
            <div className="w-9 h-9 rounded-xl bg-violet-50 dark:bg-violet-950/50 border border-violet-200 dark:border-violet-800/70 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
              <Zap className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold tracking-tight truncate">
                {isEn ? 'Skills & Customisations' : 'Skills & Keahlian Kustom'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {isEn
                  ? 'Specialized AI personas and reusable prompt workflows'
                  : 'Persona keahlian khusus dan alur prompt yang bisa langsung diterapkan'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowCreate((v) => !v)}
              className="min-h-[40px] px-3 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>{isEn ? 'New Skill' : 'Buat Skill'}</span>
            </button>
            <button
              type="button"
              onClick={onBackToChat}
              className="min-h-[40px] px-3 py-2 rounded-xl border border-slate-200 dark:border-[#2a2d3a] bg-white dark:bg-[#191b24] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#232634] text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Chat</span>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="max-w-5xl mx-auto space-y-5">
            {settings.customPrompt && (
              <div className="p-3.5 rounded-2xl bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800/60 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-bold text-violet-700 dark:text-violet-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isEn ? 'Active Skill Instruction Applied' : 'Instruksi Skill Aktif Diterapkan'}</span>
                  </div>
                  <p className="text-[11px] text-violet-600/90 dark:text-violet-200/80 truncate mt-0.5">
                    {settings.customPrompt}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ customPrompt: '' })}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#1b1929] border border-violet-200 dark:border-violet-800 text-xs font-semibold text-violet-700 dark:text-violet-300 flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{isEn ? 'Reset' : 'Reset'}</span>
                </button>
              </div>
            )}

            {showCreate && (
              <form
                onSubmit={handleCreateSkill}
                className="bg-white dark:bg-[#14161f] border border-slate-200 dark:border-[#232635] rounded-2xl p-5 space-y-3.5"
              >
                <h3 className="text-sm font-bold">
                  {isEn ? 'Create Custom AI Skill' : 'Buat Skill AI Kustom'}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold block mb-1">
                      {isEn ? 'Skill Name' : 'Nama Skill'}
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={isEn ? 'e.g., SQL Performance Optimizer' : 'Misal: Editor Naskah YouTube'}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#101219] border border-slate-200 dark:border-[#262938] text-xs focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold block mb-1">
                      {isEn ? 'Category' : 'Kategori'}
                    </label>
                    <input
                      type="text"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="Engineering / Kreatif / Riset"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#101219] border border-slate-200 dark:border-[#262938] text-xs focus:outline-none focus:border-violet-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold block mb-1">
                    {isEn ? 'Short Description' : 'Deskripsi Singkat'}
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={isEn ? 'What this skill specializes in...' : 'Keahlian utama dari skill ini...'}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#101219] border border-slate-200 dark:border-[#262938] text-xs focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold block mb-1">
                    {isEn ? 'System Instruction / Prompt Template' : 'Instruksi Sistem / Template Skill'}
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={promptTemplate}
                    onChange={(e) => setPromptTemplate(e.target.value)}
                    placeholder={
                      isEn
                        ? 'Act as an expert in... Always format output with...'
                        : 'Bertindaklah sebagai ahli di bidang... Selalu jawab dengan format...'
                    }
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#101219] border border-slate-200 dark:border-[#262938] text-xs focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCreate(false)}
                    className="px-4 py-2 rounded-xl text-xs text-slate-600 dark:text-slate-300 cursor-pointer"
                  >
                    {isEn ? 'Cancel' : 'Batal'}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold cursor-pointer"
                  >
                    {isEn ? 'Save Skill' : 'Simpan Skill'}
                  </button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {allSkills.map((skill) => {
                const isApplied = settings.customPrompt === skill.promptTemplate;
                const taskValue = quickTaskMap[skill.id] || '';
                return (
                  <div
                    key={skill.id}
                    className={`bg-white dark:bg-[#14161f] border rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-3.5 ${
                      isApplied
                        ? 'border-violet-500 ring-1 ring-violet-500/30'
                        : 'border-slate-200 dark:border-[#232635]'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[11px] font-semibold text-violet-600 dark:text-violet-400">
                            {skill.category}
                          </span>
                          <h3 className="text-sm font-bold">{skill.name}</h3>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleActivateSkill(skill)}
                            className={`min-h-[34px] px-3 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer ${
                              isApplied
                                ? 'bg-violet-600 text-white'
                                : 'bg-slate-100 dark:bg-[#1b1e29] text-slate-700 dark:text-slate-200 hover:bg-violet-50 dark:hover:bg-violet-950/50'
                            }`}
                          >
                            {isApplied && <Check className="w-3.5 h-3.5" />}
                            <span>
                              {isApplied
                                ? isEn
                                  ? 'Active'
                                  : 'Aktif'
                                : isEn
                                ? 'Apply'
                                : 'Terapkan'}
                            </span>
                          </button>
                          {!skill.isBuiltIn && (
                            <button
                              type="button"
                              onClick={() => handleDeleteSkill(skill.id)}
                              aria-label={isEn ? 'Delete skill' : 'Hapus skill'}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        {skill.description}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-[#202330] flex gap-2">
                      <input
                        type="text"
                        value={taskValue}
                        onChange={(e) =>
                          setQuickTaskMap((prev) => ({ ...prev, [skill.id]: e.target.value }))
                        }
                        placeholder={
                          isEn
                            ? 'Optional task input to run this skill...'
                            : 'Tugas cepat untuk langsung dijalankan...'
                        }
                        className="flex-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#101219] border border-slate-200 dark:border-[#262938] text-xs focus:outline-none focus:border-violet-500"
                      />
                      <button
                        type="button"
                        onClick={() => onRunSkillInChat(skill, taskValue.trim())}
                        className="min-h-[38px] px-3.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>{isEn ? 'Run' : 'Jalankan'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }
);
