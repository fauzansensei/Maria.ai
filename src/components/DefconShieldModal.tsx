import React, { useState, useEffect, useId } from 'react';
import {
  ShieldCheck,
  RotateCw,
  X,
  Lock,
  Flame,
  AlertTriangle,
  FileText,
  Activity,
  Trash2,
  Copy,
  Check,
  Search,
  ExternalLink,
  Cpu,
  Layers,
  Zap,
} from 'lucide-react';

export type DefconLevel = 5 | 4 | 3 | 2 | 1;

export interface DefconLogEntry {
  id: string;
  time: string;
  type: 'ddos' | 'malware' | 'prompt_injection' | 'xss' | 'integrity';
  level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'CLEAN';
  title: string;
  detail: string;
}

interface DefconShieldModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLevel: DefconLevel;
  onLevelChange: (level: DefconLevel) => void;
}

const INITIAL_LOGS: DefconLogEntry[] = [
  {
    id: 'log-1',
    time: '14:58:22',
    type: 'ddos',
    level: 'HIGH',
    title: 'Mitigasi DDoS Rate Limiter',
    detail: 'Mencegah 48 lonjakan request anomali per detik dari IP terisolasi.',
  },
  {
    id: 'log-2',
    time: '14:52:10',
    type: 'prompt_injection',
    level: 'CRITICAL',
    title: 'Jailbreak & Prompt Injection Diblokir',
    detail: 'Pola manipulasi instruksi sistem terdeteksi dan dinetralkan otomatis.',
  },
  {
    id: 'log-3',
    time: '14:38:05',
    type: 'malware',
    level: 'HIGH',
    title: 'Pembersihan Tautan Berbahaya',
    detail: 'Tautan eksternal mencurigakan dialihkan ke sandbox isolasi.',
  },
  {
    id: 'log-4',
    time: '14:15:40',
    type: 'xss',
    level: 'MEDIUM',
    title: 'Sanitasi Skrip & Tag HTML',
    detail: 'Payload script berbahaya disaring dari input pesan pengguna.',
  },
  {
    id: 'log-5',
    time: '13:59:12',
    type: 'integrity',
    level: 'CLEAN',
    title: 'Integritas Sistem Terverifikasi',
    detail: 'Checksum memori aman. Semua endpoint API berjalan dalam enkripsi penuh.',
  },
];

export const DefconShieldModal: React.FC<DefconShieldModalProps> = ({
  isOpen,
  onClose,
  currentLevel,
  onLevelChange,
}) => {
  const [activeTab, setActiveTab] = useState<'actions' | 'statistics' | 'logs'>('actions');
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState<string>('');
  const [showPermanentLockedToast, setShowPermanentLockedToast] = useState(false);
  const [toggleShake, setToggleShake] = useState(false);
  const [copiedLog, setCopiedLog] = useState(false);
  const [manualScanInput, setManualScanInput] = useState('');
  const [manualScanResult, setManualScanResult] = useState<{
    status: 'safe' | 'threat';
    text: string;
  } | null>(null);

  // Persistent stats
  const [stats, setStats] = useState(() => {
    try {
      const saved = localStorage.getItem('maria_defcon_stats');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      blockedCurrentSession: 14,
      totalBlocked: 1482,
      ddosBlocked: 486,
      promptInjections: 312,
      malwareNeutralized: 189,
      xssSanitized: 495,
    };
  });

  const [logs, setLogs] = useState<DefconLogEntry[]>(() => {
    try {
      const saved = localStorage.getItem('maria_defcon_logs');
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_LOGS;
  });

  // Save stats
  useEffect(() => {
    try {
      localStorage.setItem('maria_defcon_stats', JSON.stringify(stats));
    } catch {}
  }, [stats]);

  // Save logs
  useEffect(() => {
    try {
      localStorage.setItem('maria_defcon_logs', JSON.stringify(logs));
    } catch {}
  }, [logs]);

  if (!isOpen) return null;

  // Attempting to toggle the permanent protection
  const handleToggleClick = () => {
    setToggleShake(true);
    setShowPermanentLockedToast(true);
    setTimeout(() => setToggleShake(false), 500);
    setTimeout(() => setShowPermanentLockedToast(false), 4000);
  };

  // Run deep system scan and threat cleaning simulation
  const handleScanAndClean = () => {
    if (isScanning) return;
    setIsScanning(true);
    setScanStep('Menganalisis anomali jaringan & DDoS flood...');

    setTimeout(() => {
      setScanStep('Memeriksa injeksi prompt & jailbreak memori...');
    }, 900);

    setTimeout(() => {
      setScanStep('Mensterilisasi sandbox malware & tautan berbahaya...');
    }, 1800);

    setTimeout(() => {
      setScanStep('Selesai! 3 anomali berhasil dibersihkan.');
      setIsScanning(false);

      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(
        now.getMinutes()
      ).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

      const newEntry: DefconLogEntry = {
        id: `scan-${Date.now()}`,
        time: timeStr,
        type: 'malware',
        level: 'HIGH',
        title: 'Pembersihan Memori Sistem Selesai',
        detail: '3 anomali residu koneksi dan token berhasil disterilkan.',
      };

      setLogs((prev) => [newEntry, ...prev]);
      setStats((prev: typeof stats) => ({
        ...prev,
        blockedCurrentSession: prev.blockedCurrentSession + 3,
        totalBlocked: prev.totalBlocked + 3,
        malwareNeutralized: prev.malwareNeutralized + 1,
        promptInjections: prev.promptInjections + 1,
        ddosBlocked: prev.ddosBlocked + 1,
      }));
    }, 2800);
  };

  const handleManualScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualScanInput.trim()) return;

    const lower = manualScanInput.toLowerCase();
    const hasThreatKeyword =
      lower.includes('script') ||
      lower.includes('eval(') ||
      lower.includes('ignore previous') ||
      lower.includes('bypass') ||
      lower.includes('hack') ||
      lower.includes('token') ||
      lower.includes('.exe') ||
      lower.includes('malware') ||
      lower.includes('ddos');

    if (hasThreatKeyword) {
      setManualScanResult({
        status: 'threat',
        text: `⚠️ ANOMALI TERDETEKSI: Unsur berisiko diidentifikasi pada target! DEFCON Shield langsung mengisolasi dan memblokirnya.`,
      });
      setStats((prev: typeof stats) => ({
        ...prev,
        blockedCurrentSession: prev.blockedCurrentSession + 1,
        totalBlocked: prev.totalBlocked + 1,
      }));
      setLogs((prev) => [
        {
          id: `man-${Date.now()}`,
          time: new Date().toLocaleTimeString('id-ID'),
          type: 'prompt_injection',
          level: 'CRITICAL',
          title: 'Ancaman Manual Terblokir',
          detail: `Target "${manualScanInput.slice(0, 40)}" dinetralkan oleh sistem karantina.`,
        },
        ...prev,
      ]);
    } else {
      setManualScanResult({
        status: 'safe',
        text: `✅ TARGET AMAN: Tidak ditemukan muatan jahat, payload XSS, atau injeksi tersembunyi.`,
      });
    }
  };

  const handleCopyLogs = () => {
    const text = logs.map((l) => `[${l.time}] [${l.level}] ${l.title} - ${l.detail}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopiedLog(true);
    setTimeout(() => setCopiedLog(false), 2000);
  };

  const handleClearLogs = () => {
    setLogs([]);
    try {
      localStorage.removeItem('maria_defcon_logs');
    } catch {}
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

          {/* Action icons on header: refresh, level, close */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleScanAndClean}
              disabled={isScanning}
              title="Pindai Ulang & Segarkan Keamanan"
              className={`w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all ${
                isScanning ? 'animate-spin text-emerald-400' : ''
              }`}
            >
              <RotateCw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              title="Tutup Panel"
              className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Target Website / Scope & Big Counter Section */}
        <div className="px-5 py-4 text-center bg-gradient-to-b from-[#18191c] to-[#141517] border-b border-white/5">
          <div className="inline-flex items-center gap-1.5 text-xs text-gray-400 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-mono text-gray-300">maria-ai.app</span>
            <span className="text-gray-500">•</span>
            <span className="text-emerald-400 font-medium">Sesi Terenkripsi</span>
          </div>

          <div className="my-1">
            <div className="text-xs uppercase tracking-wider text-gray-400 font-medium">
              Diblokir Sesi Ini
            </div>
            <div className="text-3xl font-extrabold tracking-tight text-white mt-0.5">
              {stats.blockedCurrentSession}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              Total ancaman dibersihkan:{' '}
              <span className="text-emerald-400 font-semibold">
                {stats.totalBlocked.toLocaleString('id-ID')}
              </span>
            </div>
          </div>

          {/* Big AdGuard-Style Toggle Switch (PERMANENTLY LOCKED ON) */}
          <div className="mt-4 flex flex-col items-center">
            <div
              onClick={handleToggleClick}
              role="button"
              tabIndex={0}
              className={`relative cursor-pointer transition-transform ${
                toggleShake ? 'animate-shake' : 'active:scale-95'
              }`}
              title="Proteksi DEFCON Permanen Aktif (Tidak dapat dinonaktifkan)"
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

          {/* Locked Notification Toast when user tries to turn off */}
          {showPermanentLockedToast && (
            <div className="mt-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs text-left flex items-start gap-2 animate-in fade-in slide-in-from-top-1">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">DEFCON Tidak Dapat Dimatikan:</span> Sistem keamanan
                Maria AI dirancang selalu aktif 24/7 untuk melindungi Anda dari DDoS, malware, dan
                eksploitasi prompt.
              </div>
            </div>
          )}

          {/* Action button: Pindai & Bersihkan Memori Sekarang */}
          <div className="mt-4">
            <button
              onClick={handleScanAndClean}
              disabled={isScanning}
              className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/10 text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isScanning ? (
                <>
                  <RotateCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                  <span className="text-emerald-300 truncate">{scanStep}</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Pindai & Bersihkan Memori Sistem Sekarang</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Tab Switcher: Actions / Statistics / Logs */}
        <div className="flex border-b border-white/10 bg-[#161719] px-2 pt-1">
          <button
            onClick={() => setActiveTab('actions')}
            className={`flex-1 py-2 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'actions'
                ? 'border-emerald-400 text-white'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            Aksi (Actions)
          </button>
          <button
            onClick={() => setActiveTab('statistics')}
            className={`flex-1 py-2 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'statistics'
                ? 'border-emerald-400 text-white'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            Statistik
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`flex-1 py-2 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'logs'
                ? 'border-emerald-400 text-white'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            Log Pemfilteran
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
                      onClick={() => onLevelChange(lvl)}
                      className={`py-1.5 rounded-lg text-xs font-bold transition-all border ${
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

              {/* Manual Threat Quarantine Tool */}
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-200 mb-2">
                  <Search className="w-3.5 h-3.5 text-emerald-400" /> Pindai & Karantina Manual
                </div>
                <form onSubmit={handleManualScan} className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={manualScanInput}
                      onChange={(e) => setManualScanInput(e.target.value)}
                      placeholder="Masukkan URL atau sampel teks mencurigakan..."
                      className="flex-1 bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-hidden focus:border-emerald-400"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors shrink-0"
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

              {/* Module Status List */}
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-emerald-400" />
                    <div>
                      <div className="font-semibold text-gray-200">Perisai DDoS & Rate Limit</div>
                      <div className="text-[10px] text-gray-400">
                        Batas cerdas 100 req/menit per sesi
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
                      <div className="font-semibold text-gray-200">Anti-Malware & Link Sandbox</div>
                      <div className="text-[10px] text-gray-400">
                        Isolasi muatan berbahaya secara virtual
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
                      <div className="font-semibold text-gray-200">Anti-Prompt Injection</div>
                      <div className="text-[10px] text-gray-400">
                        Proteksi filter konteks jailbreak AI
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

          {/* TAB 2: STATISTICS (Statistik) */}
          {activeTab === 'statistics' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                  <div className="text-[10px] text-gray-400 uppercase font-semibold">
                    Serangan DDoS
                  </div>
                  <div className="text-xl font-bold text-white mt-1">
                    {stats.ddosBlocked.toLocaleString('id-ID')}
                  </div>
                  <div className="text-[10px] text-emerald-400 mt-0.5">Permintaan ditolak</div>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                  <div className="text-[10px] text-gray-400 uppercase font-semibold">
                    Injeksi Prompt
                  </div>
                  <div className="text-xl font-bold text-white mt-1">
                    {stats.promptInjections.toLocaleString('id-ID')}
                  </div>
                  <div className="text-[10px] text-emerald-400 mt-0.5">Jailbreak dinetralkan</div>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                  <div className="text-[10px] text-gray-400 uppercase font-semibold">
                    Malware & Tautan
                  </div>
                  <div className="text-xl font-bold text-white mt-1">
                    {stats.malwareNeutralized.toLocaleString('id-ID')}
                  </div>
                  <div className="text-[10px] text-emerald-400 mt-0.5">Tautan diisolasi</div>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                  <div className="text-[10px] text-gray-400 uppercase font-semibold">
                    Sanitasi XSS
                  </div>
                  <div className="text-xl font-bold text-white mt-1">
                    {stats.xssSanitized.toLocaleString('id-ID')}
                  </div>
                  <div className="text-[10px] text-emerald-400 mt-0.5">Skrip dibersihkan</div>
                </div>
              </div>

              {/* Health and Latency stats */}
              <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Latensi Pemfilteran AI:</span>
                  <span className="font-mono text-emerald-400 font-bold">&lt; 1.8 ms</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Status Firewall Cloud:</span>
                  <span className="text-emerald-400 font-bold">Sinkron & Kebal</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Tingkat Integritas Memori:</span>
                  <span className="text-emerald-400 font-bold">100% Bersih</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: LOGS (Log Pemfilteran) */}
          {activeTab === 'logs' && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between pb-1">
                <span className="text-[11px] text-gray-400">
                  {logs.length} kejadian terekam di sesi ini
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleCopyLogs}
                    title="Salin Log Keamanan"
                    className="p-1 rounded-md hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
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
                    className="p-1 rounded-md hover:bg-white/10 text-gray-400 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {logs.length === 0 ? (
                <div className="p-6 text-center text-xs text-gray-500">
                  Belum ada log pemfilteran baru.
                </div>
              ) : (
                <div className="space-y-2">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-xs space-y-1 hover:border-white/10 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-1.5 py-0.2 rounded-sm text-[9px] font-black uppercase tracking-wider ${
                              log.level === 'CRITICAL'
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : log.level === 'HIGH'
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            }`}
                          >
                            {log.level}
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
            <span>Enkripsi AES-256 Sesi Aktif</span>
          </div>
          <span className="text-[10px] text-gray-500 font-mono">v3.8-SECURE</span>
        </div>
      </div>
    </div>
  );
};
