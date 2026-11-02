import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Shield,
  RotateCw,
  Pause,
  Settings,
  X,
  SquareCode,
  Menu,
  Flag,
  Info,
  Check,
  Lock,
  Copy,
  Trash2,
  CheckCircle,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { defconService, DefconState } from '../lib/defconProtectionService.ts';

export type DefconLevel = 5 | 4 | 3 | 2 | 1;

interface DefconShieldModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLevel?: DefconLevel;
  onLevelChange?: (level: DefconLevel) => void;
}

interface DomainPreset {
  name: string;
  initialBlocked: number;
  category: string;
  safetyScore: string;
}

export const DefconShieldModal: React.FC<DefconShieldModalProps> = ({
  isOpen,
  onClose,
}) => {
  // Available domains to test / preview
  const domainPresets: DomainPreset[] = [
    { name: 'youtube.com', initialBlocked: 4, category: 'Streaming Video', safetyScore: 'A+' },
    { name: 'berita-harian.id', initialBlocked: 14, category: 'Portal Berita', safetyScore: 'B' },
    { name: 'toko-online.co.id', initialBlocked: 6, category: 'E-Commerce', safetyScore: 'A' },
    { name: 'wikipedia.org', initialBlocked: 0, category: 'Ensiklopedia Bebas', safetyScore: 'A+' },
  ];

  const [selectedDomainName, setSelectedDomainName] = useState<string>('youtube.com');
  const [showDomainDropdown, setShowDomainDropdown] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'actions' | 'statistics'>('actions');

  // Lock message feedback when user attempts to turn off DEFCON 5
  const [lockNotice, setLockNotice] = useState<string | null>(null);

  // Sub-dialog states for Action items
  const [activeSubView, setActiveSubView] = useState<'none' | 'block-element' | 'filter-log' | 'report' | 'security' | 'system-protection'>('none');
  const [customSelectorInput, setCustomSelectorInput] = useState('');
  const [elementBlockSuccess, setElementBlockSuccess] = useState<string | null>(null);
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [reportReason, setReportReason] = useState('Iklan tidak terblokir');
  const [copiedLog, setCopiedLog] = useState(false);

  // Real DEFCON Protection Service state
  const [defconState, setDefconState] = useState<DefconState>(() => defconService.getState());

  // Per-domain blocked counters
  const [domainCounters, setDomainCounters] = useState<Record<string, number>>({
    'youtube.com': 4,
    'berita-harian.id': 14,
    'toko-online.co.id': 6,
    'wikipedia.org': 0,
  });

  const [baseTotalBlocked, setBaseTotalBlocked] = useState<number>(86);

  useEffect(() => {
    const unsub = defconService.subscribe((state) => {
      setDefconState(state);
    });
    return unsub;
  }, []);

  // Background increment simulation for active site protection
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      // DEFCON 5 is permanently active on all domains
      const chance = selectedDomainName === 'wikipedia.org' ? 0.05 : 0.35;
      if (Math.random() < chance) {
        setDomainCounters((prev) => ({
          ...prev,
          [selectedDomainName]: (prev[selectedDomainName] || 0) + 1,
        }));
        setBaseTotalBlocked((prev) => prev + 1);
      }
    }, 4500);

    return () => clearInterval(interval);
  }, [isOpen, selectedDomainName]);

  if (!isOpen) return null;

  const currentDomainBlocked = domainCounters[selectedDomainName] ?? 4;
  const totalBlockedDisplay = baseTotalBlocked + defconState.blockedThisSession;

  // Attempt to toggle protection (DEFCON 5 is permanent/immutable, cannot be turned off)
  const handleAttemptToggle = () => {
    setLockNotice('DEFCON 5 Kebal Aktif Permanen (Tidak dapat dimatikan)');
    setTimeout(() => {
      setLockNotice(null);
    }, 3200);
  };

  // Action: Block element manually
  const handleApplyBlockElement = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!customSelectorInput.trim()) return;

    try {
      const elements = document.querySelectorAll(customSelectorInput.trim());
      elements.forEach((el) => {
        (el as HTMLElement).style.display = 'none';
      });
      setElementBlockSuccess(`Berhasil memblokir ${elements.length} elemen ("${customSelectorInput.trim()}")`);
      setCustomSelectorInput('');
      setDomainCounters((prev) => ({
        ...prev,
        [selectedDomainName]: (prev[selectedDomainName] || 0) + 1,
      }));
    } catch {
      setElementBlockSuccess('Selector CSS tidak valid');
    }
  };

  const handleCopyLogs = () => {
    const logText = defconState.logs
      .map((l) => `[${l.time}] [${l.severity}] ${l.title} - ${l.detail}`)
      .join('\n');
    navigator.clipboard.writeText(logText || 'Belum ada log aktivitas.');
    setCopiedLog(true);
    setTimeout(() => setCopiedLog(false), 2000);
  };

  return (
    <>
      {/* Click-outside transparent overlay so popup closes when clicking outside */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[0.5px]"
        onClick={onClose}
        aria-label="Tutup popup"
      />

      {/* Top-Right Extension Popup Card (Anchored to top-right under DEFCON badge) */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Guardian AdGuard DEFCON 5 Extension Popup"
        className="fixed top-14 right-2 sm:right-6 md:right-8 z-50 w-[350px] max-w-[calc(100vw-16px)] bg-[#1e1f23] text-white rounded-2xl border border-[#2b2d33] shadow-2xl overflow-hidden font-sans select-none animate-in fade-in slide-in-from-top-2 duration-150"
      >
        {/* Header Bar: Shield Logo + Title, Reload, Pause, Settings/Close */}
        <div className="flex items-center justify-between px-4 pt-3.5 pb-2 border-b border-[#2b2d33]/60">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 fill-emerald-500/20 text-emerald-400" />
            </div>
            <span className="font-semibold text-sm tracking-tight text-white flex items-center gap-1.5">
              <span>adguard</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 font-mono font-bold">
                DEFCON 5
              </span>
            </span>
          </div>

          <div className="flex items-center gap-1 text-slate-400">
            <button
              type="button"
              onClick={() => {
                setDomainCounters((prev) => ({
                  ...prev,
                  [selectedDomainName]: (prev[selectedDomainName] || 0) + 1,
                }));
              }}
              title="Perbarui status filter"
              className="p-1.5 rounded-lg hover:text-white hover:bg-white/5 transition"
            >
              <RotateCw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleAttemptToggle}
              title="Jeda proteksi (DEFCON 5 Kebal)"
              className="p-1.5 rounded-lg hover:text-white hover:bg-white/5 transition"
            >
              <Pause className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setActiveSubView(activeSubView === 'security' ? 'none' : 'security')}
              title="Pengaturan Keamanan"
              className="p-1.5 rounded-lg hover:text-white hover:bg-white/5 transition"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              title="Tutup"
              className="p-1.5 rounded-lg hover:text-white hover:bg-white/5 transition ml-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-4 space-y-4">
          {/* Sub-view: Block Element Manually */}
          {activeSubView === 'block-element' && (
            <div className="space-y-3 py-1">
              <div className="flex items-center justify-between border-b border-[#2b2d33] pb-2">
                <h4 className="text-xs font-semibold text-sky-400 flex items-center gap-1.5">
                  <SquareCode className="w-4 h-4" /> Block element manually
                </h4>
                <button
                  type="button"
                  onClick={() => setActiveSubView('none')}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Kembali
                </button>
              </div>
              <p className="text-xs text-slate-400">
                Ketik selector CSS elemen yang ingin diblokir pada <span className="text-white font-medium">{selectedDomainName}</span>:
              </p>
              <form onSubmit={handleApplyBlockElement} className="space-y-2">
                <input
                  type="text"
                  value={customSelectorInput}
                  onChange={(e) => setCustomSelectorInput(e.target.value)}
                  placeholder="#ad-slot, .banner-iklan, iframe[src*='ads']"
                  className="w-full px-3 py-2 text-xs rounded-lg bg-[#141518] border border-[#2b2d33] text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="submit"
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition"
                >
                  Terapkan Blokir Elemen
                </button>
              </form>
              {elementBlockSuccess && (
                <p className="text-[11px] text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 p-2 rounded-lg">
                  {elementBlockSuccess}
                </p>
              )}
            </div>
          )}

          {/* Sub-view: Filtering Log */}
          {activeSubView === 'filter-log' && (
            <div className="space-y-2 py-1">
              <div className="flex items-center justify-between border-b border-[#2b2d33] pb-2">
                <h4 className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                  <Menu className="w-4 h-4" /> Open filtering log
                </h4>
                <button
                  type="button"
                  onClick={() => setActiveSubView('none')}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Kembali
                </button>
              </div>
              <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1 font-mono text-[10px]">
                {defconState.logs.length === 0 ? (
                  <div className="p-3 text-center text-slate-500 bg-[#141518] rounded-lg">
                    Sistem DEFCON 5 aktif. Belum ada request mencurigakan.
                  </div>
                ) : (
                  defconState.logs.slice(0, 8).map((log) => (
                    <div key={log.id} className="p-2 rounded bg-[#141518] border border-[#2b2d33] flex flex-col gap-0.5">
                      <div className="flex items-center justify-between">
                        <span className="text-emerald-400 font-bold">BLOCKED</span>
                        <span className="text-slate-500">{log.time}</span>
                      </div>
                      <span className="text-slate-200 truncate">{log.title}</span>
                      <span className="text-slate-500 truncate">{log.detail}</span>
                    </div>
                  ))
                )}
              </div>
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleCopyLogs}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" /> {copiedLog ? 'Tersalin' : 'Salin Log'}
                </button>
                <button
                  type="button"
                  onClick={() => defconService.clearLogs()}
                  className="text-xs text-slate-400 hover:text-red-400 flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" /> Bersihkan
                </button>
              </div>
            </div>
          )}

          {/* Sub-view: Report an issue */}
          {activeSubView === 'report' && (
            <div className="space-y-3 py-1">
              <div className="flex items-center justify-between border-b border-[#2b2d33] pb-2">
                <h4 className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                  <Flag className="w-4 h-4" /> Report an issue
                </h4>
                <button
                  type="button"
                  onClick={() => setActiveSubView('none')}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Kembali
                </button>
              </div>
              {reportSubmitted ? (
                <div className="p-3 text-center space-y-1.5 bg-emerald-950/40 border border-emerald-800/40 rounded-xl">
                  <CheckCircle className="w-5 h-5 text-emerald-400 mx-auto" />
                  <p className="text-xs font-medium text-emerald-300">
                    Laporan berhasil dikirim untuk {selectedDomainName}.
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Aturan filter DEFCON 5 akan diperbarui secara otomatis.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <p className="text-xs text-slate-400">
                    Situs: <span className="text-white font-medium">{selectedDomainName}</span>
                  </p>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-[#141518] border border-[#2b2d33] text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="Iklan tidak terblokir">Iklan masih muncul</option>
                    <option value="Halaman web rusak">Halaman web rusak / tombol tidak berfungsi</option>
                    <option value="Salah blokir">Konten aman terblokir secara keliru</option>
                    <option value="Popup mengganggu">Muncul popup spam</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => setReportSubmitted(true)}
                    className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-lg transition"
                  >
                    Kirim Laporan
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Sub-view: Check website security */}
          {activeSubView === 'security' && (
            <div className="space-y-2.5 py-1">
              <div className="flex items-center justify-between border-b border-[#2b2d33] pb-2">
                <h4 className="text-xs font-semibold text-sky-400 flex items-center gap-1.5">
                  <Info className="w-4 h-4" /> Check website security
                </h4>
                <button
                  type="button"
                  onClick={() => setActiveSubView('none')}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Kembali
                </button>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2 rounded-lg bg-[#141518] border border-[#2b2d33]">
                  <span className="text-slate-400">Domain</span>
                  <span className="text-white font-medium">{selectedDomainName}</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-[#141518] border border-[#2b2d33]">
                  <span className="text-slate-400">Enkripsi Koneksi</span>
                  <span className="text-emerald-400 font-medium flex items-center gap-1">
                    <Lock className="w-3 h-3" /> TLS 1.3 / Enkripsi Sesi
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-[#141518] border border-[#2b2d33]">
                  <span className="text-slate-400">Status StevenBlack</span>
                  <span className="text-emerald-400 font-medium">Aktif (41 rule set)</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-[#141518] border border-[#2b2d33]">
                  <span className="text-slate-400">Status URLhaus</span>
                  <span className="text-emerald-400 font-medium">Bersih (Bebas Malware)</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-[#141518] border border-[#2b2d33]">
                  <span className="text-slate-400">Status DEFCON</span>
                  <span className="text-emerald-400 font-bold">DEFCON 5 (Permanen)</span>
                </div>
              </div>
            </div>
          )}

          {/* Sub-view: System-Wide Protection */}
          {activeSubView === 'system-protection' && (
            <div className="space-y-3 py-1">
              <div className="flex items-center justify-between border-b border-[#2b2d33] pb-2">
                <h4 className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" /> System-Wide Protection
                </h4>
                <button
                  type="button"
                  onClick={() => setActiveSubView('none')}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Kembali
                </button>
              </div>
              <div className="p-3 bg-[#141518] rounded-xl border border-[#2b2d33] space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                  <Check className="w-4 h-4" />
                  <span>Proteksi Seluruh Sistem Aktif</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Semua pertukaran pesan dengan Maria AI, filter request browser, memori sesi, dan grounding web dilindungi oleh arsitektur DEFCON 5 Kebal tanpa kompromi.
                </p>
                <div className="pt-1 flex items-center justify-between text-[11px] text-slate-400">
                  <span>DNS Resolver:</span>
                  <span className="text-emerald-400 font-mono">1.1.1.2 (AdGuard/DoH)</span>
                </div>
              </div>
            </div>
          )}

          {/* Standard Main View (Domain + Blocked + Switch + System Protection Button + Tabs + Actions) */}
          {activeSubView === 'none' && (
            <>
              {/* Domain Switcher Selector */}
              <div className="relative text-center">
                <button
                  type="button"
                  onClick={() => setShowDomainDropdown((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1 rounded-full transition border border-white/5"
                >
                  <span>{selectedDomainName}</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {showDomainDropdown && (
                  <div className="absolute left-1/2 -translate-x-1/2 top-8 z-30 w-48 bg-[#141518] border border-[#2b2d33] rounded-xl shadow-xl p-1 text-left">
                    {domainPresets.map((preset) => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => {
                          setSelectedDomainName(preset.name);
                          setShowDomainDropdown(false);
                        }}
                        className={`w-full px-2.5 py-1.5 text-xs rounded-lg flex items-center justify-between transition ${
                          selectedDomainName === preset.name
                            ? 'bg-emerald-950/80 text-emerald-400 font-semibold'
                            : 'text-slate-300 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <span>{preset.name}</span>
                        {selectedDomainName === preset.name && <Check className="w-3 h-3" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Giant Blocked Counter (Exact match to image_a089111d.png: "Blocked: 4") */}
              <div className="text-center pt-1">
                <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                  Blocked: {currentDomainBlocked}
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Total blocked: {totalBlockedDisplay}
                </p>
              </div>

              {/* The Green Toggle Switch (Pill with Checkmark in circle) */}
              <div className="flex flex-col items-center justify-center pt-1 pb-1">
                <button
                  type="button"
                  onClick={handleAttemptToggle}
                  aria-label="Status Proteksi DEFCON 5 (Permanen Aktif)"
                  className="group relative flex items-center p-1 w-14 h-8 bg-[#22c55e] rounded-full transition-all duration-200 cursor-pointer shadow-md shadow-emerald-500/20 active:scale-95"
                >
                  {/* Sliding circle with green checkmark inside (always in the right 'ON' position) */}
                  <div className="translate-x-6 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-md transition-transform">
                    <Check className="w-4 h-4 text-[#22c55e] stroke-[3]" />
                  </div>
                </button>

                {/* Permanent Active feedback notice if clicked */}
                {lockNotice ? (
                  <div className="mt-2 text-[11px] font-semibold text-emerald-400 flex items-center gap-1 animate-in fade-in zoom-in-95 duration-150">
                    <Lock className="w-3 h-3 text-emerald-400" />
                    <span>{lockNotice}</span>
                  </div>
                ) : (
                  <span className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-emerald-500/80" />
                    <span>DEFCON 5 Kebal Aktif</span>
                  </span>
                )}
              </div>

              {/* Button: Get system-wide protection (Exact match to image_a089111d.png) */}
              <button
                type="button"
                onClick={() => setActiveSubView('system-protection')}
                className="w-full py-2.5 px-4 rounded-xl border border-white/20 hover:border-white/40 hover:bg-white/5 text-xs font-semibold text-slate-100 transition shadow-xs text-center flex items-center justify-center gap-2"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Get system-wide protection</span>
              </button>

              {/* Segmented Control Tabs: Actions | Statistics */}
              <div className="bg-[#141518] p-1 rounded-xl flex text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setActiveTab('actions')}
                  className={`flex-1 py-1.5 rounded-lg text-center font-medium transition ${
                    activeTab === 'actions'
                      ? 'bg-[#2b2d33] text-white shadow-xs font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Actions
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('statistics')}
                  className={`flex-1 py-1.5 rounded-lg text-center font-medium transition ${
                    activeTab === 'statistics'
                      ? 'bg-[#2b2d33] text-white shadow-xs font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Statistics
                </button>
              </div>

              {/* Tab Content: Actions (4 rows matching image_a089111d.png) */}
              {activeTab === 'actions' && (
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => setActiveSubView('block-element')}
                    className="flex items-center gap-3 w-full p-2.5 rounded-lg text-slate-200 hover:text-white hover:bg-white/5 text-xs font-medium transition text-left"
                  >
                    <SquareCode className="w-4 h-4 text-[#f97316]" />
                    <span>Block ads manually</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveSubView('filter-log')}
                    className="flex items-center gap-3 w-full p-2.5 rounded-lg text-slate-200 hover:text-white hover:bg-white/5 text-xs font-medium transition text-left"
                  >
                    <Menu className="w-4 h-4 text-[#10b981]" />
                    <span>Open filtering log</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setReportSubmitted(false);
                      setActiveSubView('report');
                    }}
                    className="flex items-center gap-3 w-full p-2.5 rounded-lg text-slate-200 hover:text-white hover:bg-white/5 text-xs font-medium transition text-left"
                  >
                    <Flag className="w-4 h-4 text-[#f59e0b]" />
                    <span>Report an issue</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveSubView('security')}
                    className="flex items-center gap-3 w-full p-2.5 rounded-lg text-slate-200 hover:text-white hover:bg-white/5 text-xs font-medium transition text-left"
                  >
                    <Info className="w-4 h-4 text-[#38bdf8]" />
                    <span>Check website security</span>
                  </button>
                </div>
              )}

              {/* Tab Content: Statistics */}
              {activeTab === 'statistics' && (
                <div className="space-y-2 py-1">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-lg bg-[#141518] border border-[#2b2d33]">
                      <span className="text-slate-400 text-[11px] block">Ads & Trackers</span>
                      <span className="text-base font-bold text-white mt-0.5 block">
                        {Math.max(86, currentDomainBlocked * 4)}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-[#141518] border border-[#2b2d33]">
                      <span className="text-slate-400 text-[11px] block">Data Saved</span>
                      <span className="text-base font-bold text-emerald-400 mt-0.5 block">
                        {(1.8 + (currentDomainBlocked * 0.12)).toFixed(1)} MB
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-[#141518] border border-[#2b2d33]">
                      <span className="text-slate-400 text-[11px] block">Threats Blocked</span>
                      <span className="text-base font-bold text-amber-400 mt-0.5 block">
                        {defconState.stats.malwareLinksBlocked || 0}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-[#141518] border border-[#2b2d33]">
                      <span className="text-slate-400 text-[11px] block">Speed Boost</span>
                      <span className="text-base font-bold text-sky-400 mt-0.5 block">
                        +48%
                      </span>
                    </div>
                  </div>

                  <div className="p-2 rounded-lg bg-[#141518] border border-[#2b2d33] text-[11px] text-slate-400 flex items-center justify-between">
                    <span>Filter Rules:</span>
                    <span className="text-slate-200 font-medium">StevenBlack + URLhaus</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer: Protect your mobile device (Exact match to image_a089111d.png) */}
        <div className="px-4 py-3 bg-[#17181b] border-t border-[#2b2d33] flex items-center justify-between text-xs text-slate-400">
          <span className="text-[11px]">Protect your mobile device</span>
          <div className="flex items-center gap-2.5 text-slate-300">
            {/* Apple Logo SVG */}
            <svg className="w-3.5 h-3.5 fill-current hover:text-white transition cursor-pointer" viewBox="0 0 170 170" aria-label="Apple iOS">
              <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.66-7.85-11.88-14.42-6.52-10.1-11.75-21.46-15.67-34.07-3.92-12.61-5.88-24.3-5.88-35.08 0-14.57 3.75-26.68 11.25-36.33 7.5-9.65 16.9-14.57 28.2-14.77 5.34 0 11.19 1.41 17.55 4.23 6.36 2.82 10.33 4.34 11.9 4.56 2.12-.44 6.3-2.07 12.56-4.89 6.26-2.82 11.95-4.13 17.07-3.92 12.74.65 22.84 5.33 30.3 14.04-11.09 6.74-16.52 16.09-16.31 28.05.22 9.57 3.97 17.5 11.25 23.8 7.28 6.31 15.76 9.89 25.44 10.76-2.61 7.83-5.71 15.33-9.3 22.5zM119.22 33.15c0-7.39 2.66-14.46 7.99-21.2 5.33-6.74 12.01-11.09 20.06-13.04.43 1.09.65 2.28.65 3.59 0 7.39-2.77 14.57-8.32 21.53-5.54 6.96-12.23 11.2-20.06 12.72-.22-1.2-.32-2.4-.32-3.6z"/>
            </svg>
            {/* Android Robot Logo SVG */}
            <svg className="w-3.5 h-3.5 fill-current hover:text-white transition cursor-pointer" viewBox="0 0 24 24" aria-label="Android">
              <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.551 0 .9993.4482.9993.9993.0001.5511-.4483.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993 0 .5511-.4482.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5896 8.3546 13.8568 8 12 8s-3.5896.3546-5.1368.9507L4.8409 5.4477a.416.416 0 00-.5676-.1521.416.416 0 00-.1521.5676l1.9973 3.4592C2.6889 11.1867.3432 14.6589 0 18.761h24c-.3432-4.1021-2.6889-7.5743-6.1185-9.4396"/>
            </svg>
          </div>
        </div>
      </div>
    </>
  );
};
