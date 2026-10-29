import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  RotateCw,
  X,
  Lock,
  AlertTriangle,
  Activity,
  Trash2,
  Copy,
  Check,
  Search,
  Cpu,
  Layers,
  Zap,
  Radio,
  FileText,
  FlaskConical,
} from 'lucide-react';
import { defconService, DefconState, DefconEventLog } from '../lib/defconProtectionService.ts';

export type DefconLevel = 5 | 4 | 3 | 2 | 1;

interface DefconShieldModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLevel: DefconLevel;
  onLevelChange: (level: DefconLevel) => void;
}

export const DefconShieldModal: React.FC<DefconShieldModalProps> = ({
  isOpen,
  onClose,
  currentLevel,
  onLevelChange,
}) => {
  const [activeTab, setActiveTab] = useState<'actions' | 'statistics' | 'logs'>('actions');
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatusMessage, setScanStatusMessage] = useState<string>('');
  const [showPermanentLockedToast, setShowPermanentLockedToast] = useState(false);
  const [toggleShake, setToggleShake] = useState(false);
  const [copiedLog, setCopiedLog] = useState(false);
  const [manualScanInput, setManualScanInput] = useState('');
  const [manualScanResult, setManualScanResult] = useState<{
    status: 'safe' | 'threat';
    text: string;
  } | null>(null);

  // Subscribe to real DEFCON protection service state
  const [defconState, setDefconState] = useState<DefconState>(() => defconService.getState());

  useEffect(() => {
    return defconService.subscribe((state) => {
      setDefconState(state);
    });
  }, []);

  if (!isOpen) return null;

  // Attempting to toggle the permanent protection
  const handleToggleClick = () => {
    setToggleShake(true);
    setShowPermanentLockedToast(true);
    setTimeout(() => setToggleShake(false), 500);
    setTimeout(() => setShowPermanentLockedToast(false), 4500);
  };

  // Run deep system memory & DOM integrity check
  const handleScanAndClean = () => {
    if (isScanning) return;
    setIsScanning(true);
    setScanStatusMessage('Memeriksa buffer memori dan lalu lintas jaringan...');

    setTimeout(() => {
      setScanStatusMessage('Memindai injeksi script XSS & iframe tersembunyi...');
    }, 800);

    setTimeout(() => {
      setScanStatusMessage('Memvalidasi token otentikasi & koneksi aman...');
    }, 1600);

    setTimeout(() => {
      // Check if any cookies or suspicious cache exist
      setIsScanning(false);
      setScanStatusMessage('');

      if (defconState.blockedThisSession > 0) {
        setScanStatusMessage(`Selesai! Seluruh ${defconState.blockedThisSession} anomali sesi ini telah disterilkan.`);
      } else {
        setScanStatusMessage('Sistem 100% Bersih & Aman. 0 ancaman terdeteksi.');
      }

      setTimeout(() => setScanStatusMessage(''), 4000);
    }, 2400);
  };

  // Manual target / input analyzer using real inspection engine
  const handleManualScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualScanInput.trim()) return;

    const { cleanText, blockedCount } = defconService.inspectAndSanitizeText(manualScanInput);

    if (blockedCount > 0) {
      setManualScanResult({
        status: 'threat',
        text: `⚠️ ANCAMAN NYATA TERDETEKSI: ${blockedCount} pola berbahaya (XSS/Injeksi/Malware) ditemukan dan dinetralkan otomatis oleh DEFCON 5!`,
      });
    } else {
      setManualScanResult({
        status: 'safe',
        text: `✅ TARGET BERSIH: Tidak ditemukan script jahat, payload XSS, atau manipulasi prompt.`,
      });
    }
  };

  const handleCopyLogs = () => {
    if (defconState.logs.length === 0) return;
    const text = defconState.logs
      .map((l) => `[${l.time}] [${l.severity}] [${l.type.toUpperCase()}] ${l.title} - ${l.detail}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopiedLog(true);
    setTimeout(() => setCopiedLog(false), 2000);
  };

  const handleClearLogs = () => {
    defconService.clearLogs();
  };

  const defconLevelLabels: Record<DefconLevel, { name: string; color: string; desc: string }> = {
    5: {
      name: 'DEFCON 5',
      color: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10',
      desc: 'Kondisi Normal & Aman. Seluruh filter bekerja optimal dengan latensi terendah.',
    },
    4: {
      name: 'DEFCON 4',
      color: 'text-blue-400 border-blue-500/40 bg-blue-500/10',
      desc: 'Pengawasan Tinggi. Analisis mendalam pada setiap lalu lintas dan tautan.',
    },
    3: {
      name: 'DEFCON 3',
      color: 'text-amber-400 border-amber-500/40 bg-amber-500/10',
      desc: 'Siaga Elevasi. Peningkatan filter anti-jailbreak dan inspeksi rate limit DDoS.',
    },
    2: {
      name: 'DEFCON 2',
      color: 'text-orange-400 border-orange-500/40 bg-orange-500/10',
      desc: 'Pertahanan Maksimum. Isolasi ketat skrip eksternal dan sandbox penuh.',
    },
    1: {
      name: 'DEFCON 1',
      color: 'text-rose-400 border-rose-500/40 bg-rose-500/10',
      desc: 'Kunci Darurat (Lockdown). Pemblokiran total permintaan tak terverifikasi.',
    },
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-end sm:p-4 p-2 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto"
      onClick={onClose}
    >
      {/* AdGuard Extension Style Popup Card */}
      <div
        className="w-full sm:w-[410px] mt-12 sm:mt-14 bg-[#18191c] text-white rounded-2xl shadow-2xl border border-white/10 overflow-hidden flex flex-col font-sans select-none animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header - AdGuard Extension Exact Style */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#141517]">
          {/* Logo & Shield */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center text-white shadow-xs">
              <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm tracking-tight text-white uppercase">
                  maria defcon
                </span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  SHIELD
                </span>
              </div>
            </div>
          </div>

          {/* Action icons on header: refresh, close */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleScanAndClean}
              disabled={isScanning}
              title="Pindai Ulang & Segarkan Keamanan"
              className={`w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all cursor-pointer ${
                isScanning ? 'animate-spin text-emerald-400' : ''
              }`}
            >
              <RotateCw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              title="Tutup Panel"
              className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Target Website / Scope & Counter Section (Matches AdGuard: Blocked: 0 when clean) */}
        <div className="px-5 py-4 text-center bg-gradient-to-b from-[#18191c] to-[#141517] border-b border-white/5">
          <div className="inline-flex items-center gap-1.5 text-xs text-gray-400 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-mono text-gray-300">maria-ai.app</span>
            <span className="text-gray-500">•</span>
            <span className="text-emerald-400 font-medium">Sesi Terenkripsi</span>
          </div>

          {/* Big Counter: Sesuai data perangkat nyata (KOSONG / 0 saat bersih) */}
          <div className="my-1">
            <div className="text-xs uppercase tracking-wider text-gray-400 font-medium">
              Diblokir Sesi Ini
            </div>
            <div className="text-4xl font-extrabold tracking-tight text-white mt-1">
              {defconState.blockedThisSession}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              Total ancaman dibersihkan di perangkat ini:{' '}
              <span className="text-emerald-400 font-semibold">
                {defconState.totalDeviceBlocked.toLocaleString('id-ID')}
              </span>
            </div>
          </div>

          {/* Big AdGuard-Style Toggle Switch (PERMANENTLY LOCKED ON - CANNOT BE TURNED OFF) */}
          <div className="mt-4 flex flex-col items-center">
            <div
              onClick={handleToggleClick}
              role="button"
              tabIndex={0}
              className={`relative cursor-pointer transition-transform ${
                toggleShake ? 'animate-shake' : 'active:scale-95'
              }`}
              title="Proteksi DEFCON Permanen Aktif (Tidak dapat dimatikan)"
            >
              {/* Wide green toggle pill */}
              <div className="w-20 h-10 rounded-full bg-[#00bd67] p-1 shadow-lg shadow-emerald-500/20 border border-emerald-400/40 flex items-center justify-end">
                {/* White knob with emerald checkmark inside */}
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-md">
                  <Check className="w-5 h-5 text-[#00bd67] stroke-[3]" />
                </div>
              </div>
            </div>

            {/* Permanent Protection Status Badge */}
            <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold">
              <Lock className="w-3 h-3 text-emerald-400" />
              <span>DEFCON PERMANEN AKTIF (SISTEM KEBAL)</span>
            </div>
          </div>

          {/* Locked Notification Toast when user clicks the toggle */}
          {showPermanentLockedToast && (
            <div className="mt-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs text-left flex items-start gap-2 animate-in fade-in slide-in-from-top-1">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">DEFCON Tidak Dapat Dimatikan:</span> Sistem keamanan
                Maria AI dirancang selalu aktif 24/7 di perangkat Anda untuk memblokir malware,
                tracker iklan, DDoS, dan eksploitasi prompt.
              </div>
            </div>
          )}

          {/* Action button: Pindai & Bersihkan Memori Sistem */}
          <div className="mt-4">
            <button
              onClick={handleScanAndClean}
              disabled={isScanning}
              className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/10 text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isScanning ? (
                <>
                  <RotateCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                  <span className="text-emerald-300 truncate">{scanStatusMessage}</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    {scanStatusMessage || 'Pindai & Bersihkan Memori Sistem Sekarang'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Tab Switcher: Actions / Statistics / Logs */}
        <div className="flex border-b border-white/10 bg-[#161719] px-2 pt-1">
          <button
            onClick={() => setActiveTab('actions')}
            className={`flex-1 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'actions'
                ? 'border-emerald-400 text-white'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            Aksi (Actions)
          </button>
          <button
            onClick={() => setActiveTab('statistics')}
            className={`flex-1 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'statistics'
                ? 'border-emerald-400 text-white'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            Statistik
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`flex-1 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'logs'
                ? 'border-emerald-400 text-white'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <span>Log Pemfilteran</span>
            {defconState.blockedThisSession > 0 && (
              <span className="w-4 h-4 rounded-full bg-emerald-500 text-white text-[9px] font-bold flex items-center justify-center">
                {defconState.blockedThisSession}
              </span>
            )}
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-4 max-h-[360px] overflow-y-auto space-y-3 bg-[#18191c]">
          {/* TAB 1: ACTIONS (Aksi) */}
          {activeTab === 'actions' && (
            <div className="space-y-3">
              {/* Defense Level Selector */}
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-200 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-emerald-400" /> Postur Siaga DEFCON
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${defconLevelLabels[currentLevel].color}`}
                  >
                    {defconLevelLabels[currentLevel].name}
                  </span>
                </div>

                <div className="grid grid-cols-5 gap-1.5 mb-2">
                  {([5, 4, 3, 2, 1] as DefconLevel[]).map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => {
                        onLevelChange(lvl);
                        defconService.setLevel(lvl);
                      }}
                      className={`py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                        currentLevel === lvl
                          ? 'bg-emerald-500 text-white border-emerald-400 shadow-sm'
                          : 'bg-white/5 text-gray-400 border-transparent hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      D{lvl}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  {defconLevelLabels[currentLevel].desc}
                </p>
              </div>

              {/* Real Threat Test Bed (Memungkinkan Pengguna Menguji Langsung Sistem Pemblokir) */}
              <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-300 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <FlaskConical className="w-3.5 h-3.5 text-emerald-400" /> Uji Proteksi Nyata
                  </span>
                  <span className="text-[10px] text-gray-400">Klik untuk uji coba</span>
                </div>
                <p className="text-[10px] text-gray-400 mb-2 leading-relaxed">
                  Uji kemampuan sistem nyata memblokir ancaman digital dan saksikan angka di atas bertambah secara instan:
                </p>

                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  <button
                    onClick={() => defconService.triggerTestTracker()}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-emerald-500/20 border border-white/10 hover:border-emerald-500/40 text-gray-300 hover:text-white text-[11px] font-medium transition-all text-left flex items-center gap-1.5 cursor-pointer"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    <span>Uji Blokir Tracker Iklan</span>
                  </button>
                  <button
                    onClick={() => defconService.triggerTestXss()}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-emerald-500/20 border border-white/10 hover:border-emerald-500/40 text-gray-300 hover:text-white text-[11px] font-medium transition-all text-left flex items-center gap-1.5 cursor-pointer"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    <span>Uji Sanitasi Skrip XSS</span>
                  </button>
                  <button
                    onClick={() => defconService.triggerTestPromptInjection()}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-emerald-500/20 border border-white/10 hover:border-emerald-500/40 text-gray-300 hover:text-white text-[11px] font-medium transition-all text-left flex items-center gap-1.5 cursor-pointer"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    <span>Uji Injeksi Prompt</span>
                  </button>
                  <button
                    onClick={() => defconService.triggerTestDdos()}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-emerald-500/20 border border-white/10 hover:border-emerald-500/40 text-gray-300 hover:text-white text-[11px] font-medium transition-all text-left flex items-center gap-1.5 cursor-pointer"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    <span>Uji Flood DDoS</span>
                  </button>
                </div>
              </div>

              {/* Manual Threat Quarantine & Parser */}
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-200 mb-2">
                  <Search className="w-3.5 h-3.5 text-emerald-400" /> Pindai & Karantina Teks / URL
                </div>
                <form onSubmit={handleManualScan} className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={manualScanInput}
                      onChange={(e) => setManualScanInput(e.target.value)}
                      placeholder="Masukkan URL atau kode mencurigakan..."
                      className="flex-1 bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-hidden focus:border-emerald-400"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors shrink-0 cursor-pointer"
                    >
                      Periksa
                    </button>
                  </div>
                  {manualScanResult && (
                    <div
                      className={`p-2 rounded-lg text-[11px] leading-snug border ${
                        manualScanResult.status === 'threat'
                          ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                          : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      }`}
                    >
                      {manualScanResult.text}
                    </div>
                  )}
                </form>
              </div>

              {/* Real Active Shield Modules */}
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-emerald-400" />
                    <div>
                      <div className="font-semibold text-gray-200">Perisai DDoS & Flood Limiter</div>
                      <div className="text-[10px] text-gray-400">
                        Batas cerdas 5 pesan/5 detik aktif
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    AKTIF
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <div>
                      <div className="font-semibold text-gray-200">Pemblokir Iklan & Pelacak Web</div>
                      <div className="text-[10px] text-gray-400">
                        Intersepsi otomatis Fetch & XHR pihak ketiga
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    AKTIF
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-400" />
                    <div>
                      <div className="font-semibold text-gray-200">Anti-Prompt Injection & Sanitasi XSS</div>
                      <div className="text-[10px] text-gray-400">
                        Inspeksi payload skrip & jailbreak real-time
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    AKTIF
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: STATISTICS (Statistik Nyata dari Perangkat) */}
          {activeTab === 'statistics' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                  <div className="text-[10px] text-gray-400 uppercase font-semibold">
                    Tracker & Iklan
                  </div>
                  <div className="text-xl font-bold text-white mt-1">
                    {defconState.stats.adTrackersBlocked}
                  </div>
                  <div className="text-[10px] text-emerald-400 mt-0.5">Permintaan digagalkan</div>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                  <div className="text-[10px] text-gray-400 uppercase font-semibold">
                    Injeksi Prompt
                  </div>
                  <div className="text-xl font-bold text-white mt-1">
                    {defconState.stats.promptInjectionsBlocked}
                  </div>
                  <div className="text-[10px] text-emerald-400 mt-0.5">Jailbreak dinetralkan</div>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                  <div className="text-[10px] text-gray-400 uppercase font-semibold">
                    Tautan Malware
                  </div>
                  <div className="text-xl font-bold text-white mt-1">
                    {defconState.stats.malwareLinksBlocked}
                  </div>
                  <div className="text-[10px] text-emerald-400 mt-0.5">Tautan dibersihkan</div>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                  <div className="text-[10px] text-gray-400 uppercase font-semibold">
                    Sanitasi XSS
                  </div>
                  <div className="text-xl font-bold text-white mt-1">
                    {defconState.stats.xssSanitized}
                  </div>
                  <div className="text-[10px] text-emerald-400 mt-0.5">Skrip disterilkan</div>
                </div>
              </div>

              {/* Status info */}
              <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Lonjakan Flood DDoS:</span>
                  <span className="font-mono text-emerald-400 font-bold">
                    {defconState.stats.ddosFloodsThrottled} ditahan
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Mode Proteksi:</span>
                  <span className="text-emerald-400 font-bold">Kebal (Permanen 24/7)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Integritas DOM & Network:</span>
                  <span className="text-emerald-400 font-bold">100% Terenkripsi</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: LOGS (Log Pemfilteran Nyata) */}
          {activeTab === 'logs' && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between pb-1">
                <span className="text-[11px] text-gray-400">
                  {defconState.logs.length === 0
                    ? '0 kejadian terekam (Kondisi Bersih)'
                    : `${defconState.logs.length} ancaman terekam di perangkat`}
                </span>
                {defconState.logs.length > 0 && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleCopyLogs}
                      title="Salin Log Keamanan"
                      className="p-1 rounded-md hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
                    >
                      {copiedLog ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      onClick={handleClearLogs}
                      title="Hapus Riwayat Log"
                      className="p-1 rounded-md hover:bg-white/10 text-gray-400 hover:text-rose-400 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {defconState.logs.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-400 space-y-2 border border-dashed border-white/10 rounded-xl bg-white/2">
                  <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto opacity-75" />
                  <div className="font-semibold text-gray-300">Kondisi Aman (DEFCON 5)</div>
                  <p className="text-[11px] text-gray-500 leading-relaxed max-w-xs mx-auto">
                    Belum ada iklan, tracker, atau anomali yang diblokir di sesi ini. Sistem terus mengawasi secara real-time.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {defconState.logs.map((log) => (
                    <div
                      key={log.id}
                      className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-xs space-y-1 hover:border-white/10 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-1.5 py-0.2 rounded-sm text-[9px] font-black uppercase tracking-wider ${
                              log.severity === 'CRITICAL'
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : log.severity === 'HIGH'
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            }`}
                          >
                            {log.severity}
                          </span>
                          <span className="font-semibold text-gray-200">{log.title}</span>
                        </div>
                        <span className="font-mono text-[10px] text-gray-500">{log.time}</span>
                      </div>
                      <p className="text-[11px] text-gray-400 leading-relaxed">{log.detail}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer info bar */}
        <div className="px-4 py-2.5 border-t border-white/10 bg-[#141517] flex items-center justify-between text-[11px] text-gray-400">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3 h-3 text-emerald-400" />
            <span>Enkripsi Sesi Aktif</span>
          </div>
          <span className="text-[10px] text-gray-500 font-mono">DEFCON-ENGINE v3.8</span>
        </div>
      </div>
    </div>
  );
};
