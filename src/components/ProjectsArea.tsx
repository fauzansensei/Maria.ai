import React, { useState } from 'react';
import {
  FolderKanban,
  Plus,
  Trash2,
  Menu,
  MessageSquare,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  FileText,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.tsx';
import { ProjectItem, loadProjects, saveProjects } from '../lib/workspaceStore.ts';

interface ProjectsAreaProps {
  activeProjectId: string | null;
  onSelectActiveProject: (project: ProjectItem | null) => void;
  onStartProjectChat: (project: ProjectItem) => void;
  onBackToChat: () => void;
  onOpenSidebar: () => void;
}

const COLOR_STYLES: Record<ProjectItem['color'], string> = {
  blue: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
  emerald: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  purple: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
  amber: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
  rose: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
  cyan: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30',
};

export const ProjectsArea: React.FC<ProjectsAreaProps> = React.memo(
  ({
    activeProjectId,
    onSelectActiveProject,
    onStartProjectChat,
    onBackToChat,
    onOpenSidebar,
  }) => {
    const { isEn } = useLanguage();
    const [projects, setProjects] = useState<ProjectItem[]>(() => loadProjects());
    const [showForm, setShowForm] = useState(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [customInstruction, setCustomInstruction] = useState('');
    const [contextNotes, setContextNotes] = useState('');
    const [color, setColor] = useState<ProjectItem['color']>('blue');
    const [editingId, setEditingId] = useState<string | null>(null);

    const persist = (next: ProjectItem[]) => {
      setProjects(next);
      saveProjects(next);
    };

    const handleSaveProject = (e: React.FormEvent) => {
      e.preventDefault();
      if (!name.trim()) return;

      if (editingId) {
        const next = projects.map((p) =>
          p.id === editingId
            ? {
                ...p,
                name: name.trim(),
                description: description.trim(),
                customInstruction: customInstruction.trim(),
                contextNotes: contextNotes.trim(),
                color,
                updatedAt: new Date().toISOString(),
              }
            : p
        );
        persist(next);
        const updated = next.find((p) => p.id === editingId) || null;
        if (activeProjectId === editingId && updated) {
          onSelectActiveProject(updated);
        }
      } else {
        const item: ProjectItem = {
          id: `proj-${Date.now()}`,
          name: name.trim(),
          description: description.trim() || (isEn ? 'Dedicated AI workspace' : 'Ruang kerja AI khusus'),
          color,
          customInstruction: customInstruction.trim(),
          contextNotes: contextNotes.trim(),
          updatedAt: new Date().toISOString(),
        };
        const next = [item, ...projects];
        persist(next);
        onSelectActiveProject(item);
      }

      setName('');
      setDescription('');
      setCustomInstruction('');
      setContextNotes('');
      setColor('blue');
      setEditingId(null);
      setShowForm(false);
    };

    const handleEdit = (p: ProjectItem) => {
      setEditingId(p.id);
      setName(p.name);
      setDescription(p.description);
      setCustomInstruction(p.customInstruction);
      setContextNotes(p.contextNotes);
      setColor(p.color);
      setShowForm(true);
    };

    const handleDelete = (id: string) => {
      const next = projects.filter((p) => p.id !== id);
      persist(next);
      if (activeProjectId === id) {
        onSelectActiveProject(null);
      }
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
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/70 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <FolderKanban className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold tracking-tight truncate">
                {isEn ? 'Projects' : 'Proyek'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {isEn
                  ? 'Organize dedicated instructions, context, and workflows per project'
                  : 'Kelola instruksi khusus, konteks, dan alur kerja per proyek'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setName('');
                setDescription('');
                setCustomInstruction('');
                setContextNotes('');
                setShowForm((v) => !v);
              }}
              className="min-h-[40px] px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>{isEn ? 'New Project' : 'Proyek Baru'}</span>
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
            {activeProjectId && (
              <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-medium text-blue-700 dark:text-blue-300">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>
                    {isEn ? 'Active project workspace:' : 'Proyek aktif saat ini:'}{' '}
                    <strong>{projects.find((p) => p.id === activeProjectId)?.name}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectActiveProject(null)}
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  {isEn ? 'Deactivate' : 'Nonaktifkan'}
                </button>
              </div>
            )}

            {showForm && (
              <form
                onSubmit={handleSaveProject}
                className="bg-white dark:bg-[#14161f] border border-slate-200 dark:border-[#232635] rounded-2xl p-5 space-y-3.5"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold">
                    {editingId
                      ? isEn
                        ? 'Edit Project'
                        : 'Edit Proyek'
                      : isEn
                      ? 'Create New Project'
                      : 'Buat Proyek Baru'}
                  </h3>
                  <div className="flex items-center gap-1.5">
                    {(['blue', 'emerald', 'purple', 'amber', 'rose', 'cyan'] as const).map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        className={`w-6 h-6 rounded-full border-2 cursor-pointer ${
                          color === c ? 'border-slate-900 dark:border-white scale-110' : 'border-transparent'
                        } ${
                          c === 'blue'
                            ? 'bg-blue-500'
                            : c === 'emerald'
                            ? 'bg-emerald-500'
                            : c === 'purple'
                            ? 'bg-purple-500'
                            : c === 'amber'
                            ? 'bg-amber-500'
                            : c === 'rose'
                            ? 'bg-rose-500'
                            : 'bg-cyan-500'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold block mb-1">
                      {isEn ? 'Project Name' : 'Nama Proyek'}
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={isEn ? 'e.g., E-Commerce Redesign' : 'Misal: Skripsi Bio-Informatika'}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#101219] border border-slate-200 dark:border-[#262938] text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold block mb-1">
                      {isEn ? 'Short Description' : 'Deskripsi Singkat'}
                    </label>
                    <input
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder={isEn ? 'Main goal or focus...' : 'Tujuan atau fokus proyek...'}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#101219] border border-slate-200 dark:border-[#262938] text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold block mb-1">
                    {isEn ? 'Project Custom Instructions' : 'Instruksi Kustom Proyek'}
                  </label>
                  <textarea
                    rows={3}
                    value={customInstruction}
                    onChange={(e) => setCustomInstruction(e.target.value)}
                    placeholder={
                      isEn
                        ? 'How Maria should behave inside this project...'
                        : 'Bagaimana Maria harus merespons khusus di dalam proyek ini...'
                    }
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#101219] border border-slate-200 dark:border-[#262938] text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold block mb-1">
                    {isEn ? 'Project Knowledge / Reference Notes' : 'Konteks & Catatan Referensi'}
                  </label>
                  <textarea
                    rows={2}
                    value={contextNotes}
                    onChange={(e) => setContextNotes(e.target.value)}
                    placeholder={
                      isEn
                        ? 'Key facts, tech stack, specs, or deadlines...'
                        : 'Fakta kunci, spesifikasi, stack, atau catatan referensi...'
                    }
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#101219] border border-slate-200 dark:border-[#262938] text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1e212e] cursor-pointer"
                  >
                    {isEn ? 'Cancel' : 'Batal'}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer"
                  >
                    {isEn ? 'Save Project' : 'Simpan Proyek'}
                  </button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.map((proj) => {
                const isActive = activeProjectId === proj.id;
                return (
                  <div
                    key={proj.id}
                    className={`bg-white dark:bg-[#14161f] border rounded-2xl p-5 flex flex-col justify-between gap-4 ${
                      isActive
                        ? 'border-blue-500 ring-1 ring-blue-500/30'
                        : 'border-slate-200 dark:border-[#232635]'
                    }`}
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${COLOR_STYLES[proj.color]}`}
                          >
                            <FolderKanban className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-sm font-bold truncate">{proj.name}</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                              {proj.description}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleEdit(proj)}
                            className="px-2 py-1 rounded-lg text-[11px] font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                          >
                            {isEn ? 'Edit' : 'Edit'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(proj.id)}
                            aria-label={isEn ? 'Delete project' : 'Hapus proyek'}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {proj.customInstruction && (
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#101219] border border-slate-200/80 dark:border-[#242736] text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2 flex items-start gap-2">
                          <Sparkles className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                          <span>{proj.customInstruction}</span>
                        </div>
                      )}

                      {proj.contextNotes && (
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-1.5 line-clamp-1">
                          <FileText className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span>{proj.contextNotes}</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-[#202330] flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => onSelectActiveProject(isActive ? null : proj)}
                        className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer ${
                          isActive
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/70'
                            : 'bg-slate-100 dark:bg-[#1b1e29] text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-[#252838]'
                        }`}
                      >
                        {isActive
                          ? isEn
                            ? 'Active Context'
                            : 'Konteks Aktif'
                          : isEn
                          ? 'Set Active'
                          : 'Aktifkan Konteks'}
                      </button>

                      <button
                        type="button"
                        onClick={() => onStartProjectChat(proj)}
                        className="min-h-[36px] px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>{isEn ? 'Start Project Chat' : 'Mulai Chat Proyek'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
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
