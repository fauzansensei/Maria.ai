import React, { useState } from "react";
import { UserSettings, WidgetLayout, AppTheme } from "../types";
import { THEME_OPTIONS } from "../constants";
import { 
  BarChart2, 
  Calendar, 
  Sparkles, 
  Cpu, 
  CheckSquare, 
  Plus, 
  Clock, 
  Zap, 
  Activity, 
  HelpCircle,
  TrendingUp,
  X,
  FileText
} from "lucide-react";

interface WidgetsListProps {
  settings: UserSettings;
  messageCount: number;
  onSelectPrompt: (text: string) => void;
  themeStyle: any;
}

export default function WidgetsList({
  settings,
  messageCount,
  onSelectPrompt,
  themeStyle,
}: WidgetsListProps) {
  // Agenda / Reminders state
  const [reminders, setReminders] = useState([
    { id: "rem-1", text: "Tinjau analisis SWOT bisnis kopi", done: false, time: "Hari ini" },
    { id: "rem-2", text: "Revisi paragraf portofolio profesional", done: true, time: "Selesai" },
    { id: "rem-3", text: "Pelajari kerangka kerja Scrum & Agile", done: false, time: "Besok" },
  ]);
  const [newReminderText, setNewReminderText] = useState("");

  const handleAddReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReminderText.trim()) return;
    setReminders([
      ...reminders,
      {
        id: "rem-" + Date.now(),
        text: newReminderText.trim(),
        done: false,
        time: "Baru",
      }
    ]);
    setNewReminderText("");
  };

  const handleToggleReminder = (id: string) => {
    setReminders(reminders.map(r => r.id === id ? { ...r, done: !r.done } : r));
  };

  const handleDeleteReminder = (id: string) => {
    setReminders(reminders.filter(r => r.id !== id));
  };

  // Sort widgets by user layout order
  const sortedWidgets = [...(settings.widgets || [])].sort((a, b) => a.order - b.order);

  // Render individual widget based on id
  const renderWidget = (widget: WidgetLayout) => {
    if (!widget.visible) return null;

    switch (widget.id) {
      case "quick-stats":
        return (
          <div key={widget.id} className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center gap-2 text-slate-700 font-sans border-b border-slate-100 pb-2">
              <BarChart2 className="w-4 h-4 text-blue-600" />
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                Penggunaan Token & Kuota
              </h4>
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-[11px] font-bold mb-1">
                  <span className="text-slate-600">Kuota Terpakai</span>
                  <span className="text-slate-800">{Math.min(messageCount * 25, 1000)} / 1,000 Token</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-blue-600 h-full transition-all duration-300"
                    style={{ width: `${Math.min((messageCount * 25 / 1000) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
              <p className="text-[10px] text-slate-600 font-medium italic leading-snug">
                {messageCount === 0 
                  ? "Belum ada kapasitas pesan terpakai hari ini."
                  : `Maria memperkirakan batas kuota gratis akan tercapai dalam ${Math.max(14 - messageCount, 1)} hari.`
                }
              </p>
            </div>
          </div>
        );

      case "active-reminders":
        return (
          <div key={widget.id} className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center gap-2 text-slate-700 font-sans border-b border-slate-100 pb-2 justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-600" />
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                  Agenda & Pengingat
                </h4>
              </div>
              <span className="text-[9px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-bold font-mono">
                {reminders.filter(r => !r.done).length} AKTIF
              </span>
            </div>

            {/* Reminders List */}
            <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
              {reminders.map(r => (
                <div key={r.id} className="flex items-center justify-between gap-2 p-1.5 hover:bg-slate-50/50 rounded-lg group transition-colors">
                  <div className="flex items-center gap-2 min-w-0">
                    <input
                      type="checkbox"
                      checked={r.done}
                      onChange={() => handleToggleReminder(r.id)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                    />
                    <span className={`text-[11px] truncate leading-normal ${r.done ? "text-slate-500 line-through font-medium" : "text-slate-700"}`}>
                      {r.text}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`text-[8px] font-mono px-1 py-0.2 rounded font-bold ${
                      r.done 
                        ? "bg-slate-200 text-slate-600" 
                        : "bg-blue-50 text-blue-650"
                    }`}>
                      {r.time}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteReminder(r.id)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-300 hover:text-red-500 rounded transition-all cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Add Form */}
            <form onSubmit={handleAddReminder} className="flex items-center gap-1.5 mt-2 pt-2 border-t border-slate-100/60">
              <input
                type="text"
                placeholder="Tambahkan agenda..."
                value={newReminderText}
                onChange={(e) => setNewReminderText(e.target.value)}
                className="flex-1 px-2.5 py-1 text-[11px] bg-slate-50 hover:bg-slate-100 focus:bg-white rounded-md border border-slate-200 outline-none focus:border-blue-500 placeholder:text-slate-400 transition-all"
              />
              <button
                type="submit"
                className="p-1 rounded bg-slate-900 text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        );

      case "prompt-insight":
        return (
          <div key={widget.id} className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center gap-2 text-slate-700 font-sans border-b border-slate-100 pb-2">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                Saran Topik Pembahasan
              </h4>
            </div>
            <p className="text-[10px] text-slate-600 font-medium leading-normal">
              Maria menyarankan Anda menanyakan topik ini berdasarkan tujuan personalisasi belajar Anda:
            </p>
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => onSelectPrompt("Saya butuh tips menulis email klarifikasi dalam bahasa Inggris formal.")}
                className="w-full text-left p-2 rounded-lg bg-purple-50/40 hover:bg-purple-50 text-[10px] font-semibold text-purple-700 border border-purple-100 transition-colors cursor-pointer flex items-center gap-2"
              >
                <FileText className="w-3.5 h-3.5 shrink-0" />
                <span>Menulis Email Klarifikasi Formal</span>
              </button>
              <button
                type="button"
                onClick={() => onSelectPrompt("Bagaimana cara meriset kejenuhan pasar kompetitor lokal?")}
                className="w-full text-left p-2 rounded-lg bg-amber-50/40 hover:bg-amber-50 text-[10px] font-semibold text-amber-800 border border-amber-100 transition-colors cursor-pointer flex items-center gap-2"
              >
                <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                <span>Metode Riset Pasar Kompetitor</span>
              </button>
            </div>
          </div>
        );

      case "maria-status":
        return (
          <div key={widget.id} className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center gap-2 text-slate-700 font-sans border-b border-slate-100 pb-2">
              <Cpu className="w-4 h-4 text-emerald-600 animate-pulse" />
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                Kinerja Layanan Maria AI
              </h4>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <div className="p-2 bg-slate-50 rounded border border-slate-100">
                <span className="block text-[8px] text-slate-600 uppercase font-bold tracking-wider">RESPON TIME</span>
                <span className="block text-xs font-bold text-slate-800 font-mono mt-0.5">~1.1s (Cepat)</span>
              </div>
              <div className="p-2 bg-slate-50 rounded border border-slate-100">
                <span className="block text-[8px] text-slate-600 uppercase font-bold tracking-wider">UPTIME</span>
                <span className="block text-xs font-bold text-slate-800 font-mono mt-0.5">99.98%</span>
              </div>
            </div>
            <p className="text-[9px] text-slate-550 leading-snug italic text-center">
              Ditenagai secara andal oleh model pembelajaran Gemini 3.5 Flash.
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {sortedWidgets.map(widget => renderWidget(widget))}
    </div>
  );
}
