import React, { useState, useEffect } from 'react';
import {
  X,
  Settings,
  Brain,
  Volume2,
  VolumeX,
  Loader2,
  MessageSquare,
  Shield,
  Layers,
  User,
  Moon,
  Sun,
  Laptop,
  Check,
  AlertTriangle,
  Sparkles,
  Database,
  Lock,
  Download,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useTheme } from '../context/ThemeContext.tsx';
import { UserSettings } from '../types.ts';
import { DEFAULT_SETTINGS, TONE_OPTIONS } from '../constants.ts';
import { speechService, SpeechState } from '../lib/speechService.ts';

interface SettingsDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  onClearHistoryRequest: () => void;
}

type TabType = 'general' | 'ai-memory' | 'voice' | 'chat' | 'privacy' | 'integrations' | 'account';

export const SettingsDashboard: React.FC<SettingsDashboardProps> = ({
  isOpen,
  onClose,
  onClearHistoryRequest,
}) => {
  const { user, signIn, signOut } = useAuth();
  const { theme, setTheme, isDark } = useTheme();

  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [speechState, setSpeechState] = useState<SpeechState>(() => speechService.getState());
  const [settings, setSettings] = useState<UserSettings>(() => {
    try {
      const saved = localStorage.getItem('maria_settings');
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    return speechService.subscribe((state) => {
      setSpeechState(state);
    });
  }, []);

  if (!isOpen) return null;

  const handleUpdate = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    const updated = { ...settings, [key]: value };
    if (key === 'voiceEnabled') {
      updated.voiceResponses = Boolean(value);
    }
    setSettings(updated);
    try {
      localStorage.setItem('maria_settings', JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('maria_settings_changed', { detail: updated }));
    } catch {}
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'general', label: 'General', icon: <Settings className="w-4 h-4" /> },
    { id: 'ai-memory', label: 'AI & Memory', icon: <Brain className="w-4 h-4" /> },
    { id: 'voice', label: 'Voice & Audio', icon: <Volume2 className="w-4 h-4" /> },
    { id: 'chat', label: 'Chat & Prompt', icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'privacy', label: 'Privacy & Data', icon: <Shield className="w-4 h-4" /> },
    { id: 'integrations', label: 'Integrations', icon: <Layers className="w-4 h-4" /> },
    { id: 'account', label: 'Account', icon: <User className="w-4 h-4" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-3xl bg-[#111218] border border-[#252737] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-white">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-[#212332] bg-[#151620]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#20a66a]/15 text-[#34d399] border border-[#20a66a]/25 flex items-center justify-center">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">Pengaturan Maria AI</h3>
                {savedSuccess && (
                  <span className="text-[10px] font-semibold text-[#34d399] bg-[#20a66a]/20 px-2 py-0.5 rounded-full border border-[#20a66a]/30 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Tersimpan
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-400">Sesuaikan preferensi model, memori, audio, dan privasi</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-xl hover:bg-[#232535] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 7 Tab Navigation Bar */}
        <div className="flex items-center px-4 py-2 border-b border-[#1d1f2c] bg-[#13141c] overflow-x-auto scrollbar-none gap-1.5">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-[#20a66a] text-white shadow-sm font-semibold'
                    : 'text-neutral-400 hover:text-white hover:bg-[#1c1e2a]'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Body View for Active Tab */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: GENERAL */}
          {activeTab === 'general' && (
            <div className="space-y-5">
              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1.5">Nama Panggilan Pengguna</label>
                <input
                  type="text"
                  value={settings.username}
                  onChange={(e) => handleUpdate('username', e.target.value)}
                  placeholder="Contoh: Basit"
                  className="w-full px-3.5 py-2.5 bg-[#181a24] border border-[#292c3d] rounded-xl text-xs text-white focus:outline-none focus:border-[#20a66a]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-2">Tema & Mode Tampilan</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <button
                    onClick={() => setTheme('dark')}
                    className={`p-3.5 rounded-2xl border text-xs font-medium flex flex-col items-center gap-2 transition-all ${
                      isDark
                        ? 'bg-[#20a66a]/15 border-[#20a66a] text-[#34d399]'
                        : 'bg-[#181a24] border-[#292c3d] text-neutral-400'
                    }`}
                  >
                    <Moon className="w-5 h-5" />
                    <span>Mode Gelap OLED</span>
                    <span className="text-[10px] opacity-70">Hemat Energi</span>
                  </button>
                  <button
                    onClick={() => setTheme('light')}
                    className={`p-3.5 rounded-2xl border text-xs font-medium flex flex-col items-center gap-2 transition-all ${
                      !isDark
                        ? 'bg-[#20a66a]/15 border-[#20a66a] text-[#34d399]'
                        : 'bg-[#181a24] border-[#292c3d] text-neutral-400'
                    }`}
                  >
                    <Sun className="w-5 h-5" />
                    <span>Mode Terang</span>
                    <span className="text-[10px] opacity-70">Standar Putih</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1.5">Bahasa Antarmuka</label>
                <select
                  value={settings.language || 'Indonesia'}
                  onChange={(e) => handleUpdate('language', e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-[#181a24] border border-[#292c3d] rounded-xl text-xs text-white focus:outline-none focus:border-[#20a66a]"
                >
                  <option value="Indonesia">Bahasa Indonesia</option>
                  <option value="English">English (US)</option>
                </select>
              </div>
            </div>
          )}

          {/* TAB 2: AI & MEMORY */}
          {activeTab === 'ai-memory' && (
            <div className="space-y-5">
              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-2">Gaya Respon & Persona Maria</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {TONE_OPTIONS.map((tone) => (
                    <button
                      key={tone.value}
                      onClick={() => handleUpdate('tone', tone.value)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        settings.tone === tone.value
                          ? 'bg-[#20a66a]/15 border-[#20a66a] text-white'
                          : 'bg-[#181a24] border-[#262838] text-neutral-300 hover:border-neutral-700'
                      }`}
                    >
                      <div className="text-lg mb-1">{tone.emoji}</div>
                      <div className="text-xs font-semibold">{tone.label}</div>
                      <div className="text-[10px] text-neutral-400 line-clamp-2 mt-0.5">{tone.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1.5">Instruksi Kustom (Custom Prompt)</label>
                <textarea
                  rows={3}
                  value={settings.customPrompt}
                  onChange={(e) => handleUpdate('customPrompt', e.target.value)}
                  placeholder="Instruksikan cara Maria merespons (contoh: selalu berikan ringkasan poin utama)..."
                  className="w-full px-3.5 py-2 bg-[#181a24] border border-[#292c3d] rounded-xl text-xs text-white focus:outline-none focus:border-[#20a66a]"
                />
              </div>

              <div className="p-4 rounded-2xl bg-[#171923] border border-[#27293a] flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-white">Ekstraksi Memori Konteks Otomatis</div>
                  <div className="text-[11px] text-neutral-400">Mengingat preferensi Anda dalam percakapan berikutnya</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.memoryEnabled}
                  onChange={(e) => handleUpdate('memoryEnabled', e.target.checked)}
                  className="w-4 h-4 accent-[#20a66a] rounded"
                />
              </div>
            </div>
          )}

          {/* TAB 3: VOICE */}
          {activeTab === 'voice' && (
            <div className="space-y-5">
              {/* Voice Enable Toggle */}
              <div className="p-4 rounded-2xl bg-[#171923] border border-[#27293a] flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-white">Respon Suara AI Otomatis (TTS)</span>
                    {settings.voiceEnabled ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#20a66a]/20 text-[#34d399] font-medium border border-[#20a66a]/40">
                        Aktif
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 font-medium">
                        Nonaktif
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-neutral-400 mt-0.5">
                    Maria akan langsung berbicara otomatis setiap merespons pesan Anda di ruang obrolan
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(settings.voiceEnabled)}
                  onChange={(e) => {
                    speechService.unlockAudio();
                    handleUpdate('voiceEnabled', e.target.checked);
                  }}
                  className="w-5 h-5 accent-[#20a66a] rounded cursor-pointer"
                />
              </div>

              {/* Voice Engine Selector */}
              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1.5 flex items-center justify-between">
                  <span>Engine Suara (TTS Engine)</span>
                  <span className="text-[10px] text-[#34d399] font-normal">AI Neural Voice Engine Aktif</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleUpdate('voiceEngine', 'gemini')}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      (settings.voiceEngine || 'gemini') === 'gemini'
                        ? 'bg-[#20a66a]/15 border-[#20a66a] text-white shadow-sm'
                        : 'bg-[#181a24] border-[#27293a] text-neutral-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#34d399]" /> Model AI Voice Engine
                      </span>
                      {(settings.voiceEngine || 'gemini') === 'gemini' && (
                        <Check className="w-3.5 h-3.5 text-[#34d399]" />
                      )}
                    </div>
                    <p className="text-[11px] text-neutral-300 mt-1">
                      Suara studio alami, ekspresif, hangat dan tidak kaku (Gemini Neural Voice).
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleUpdate('voiceEngine', 'browser')}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      settings.voiceEngine === 'browser'
                        ? 'bg-[#20a66a]/15 border-[#20a66a] text-white shadow-sm'
                        : 'bg-[#181a24] border-[#27293a] text-neutral-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Laptop className="w-3.5 h-3.5 text-neutral-400" /> Peramban Lokal (Browser)
                      </span>
                      {settings.voiceEngine === 'browser' && (
                        <Check className="w-3.5 h-3.5 text-[#34d399]" />
                      )}
                    </div>
                    <p className="text-[11px] text-neutral-400 mt-1">
                      Sintesis suara bawaan peramban (Web Speech API).
                    </p>
                  </button>
                </div>
              </div>

              {/* Voice Persona (For AI Engine) */}
              {(settings.voiceEngine || 'gemini') === 'gemini' && (
                <div>
                  <label className="text-xs font-semibold text-neutral-300 block mb-1.5">
                    Karakter Suara Maria AI
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { id: 'Kore', label: 'Kore', desc: 'Lembut & Ramah (Default)' },
                      { id: 'Aoede', label: 'Aoede', desc: 'Ekspresif & Hangat' },
                      { id: 'Puck', label: 'Puck', desc: 'Ceria & Lincah' },
                      { id: 'Fenrir', label: 'Fenrir', desc: 'Tenang & Berwibawa' },
                      { id: 'Zephyr', label: 'Zephyr', desc: 'Santai & Kasual' },
                    ].map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => handleUpdate('geminiVoice', v.id as any)}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          (settings.geminiVoice || 'Kore') === v.id
                            ? 'bg-[#20a66a]/20 border-[#20a66a] text-white'
                            : 'bg-[#181a24] border-[#27293a] text-neutral-400 hover:text-white'
                        }`}
                      >
                        <div className="text-xs font-bold text-white">{v.label}</div>
                        <div className="text-[10px] text-neutral-300 mt-0.5">{v.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Speed */}
              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1.5">Kecepatan Bicara</label>
                <div className="grid grid-cols-4 gap-2">
                  {['0.75x', '1x', '1.25x', '1.5x'].map((spd) => (
                    <button
                      key={spd}
                      type="button"
                      onClick={() => handleUpdate('speechSpeed', spd as any)}
                      className={`py-2 rounded-xl border text-xs font-medium text-center transition-all ${
                        (settings.speechSpeed || '1x') === spd
                          ? 'bg-[#20a66a] border-[#20a66a] text-white font-bold'
                          : 'bg-[#181a24] border-[#27293a] text-neutral-400 hover:text-white'
                      }`}
                    >
                      {spd}
                    </button>
                  ))}
                </div>
              </div>

              {/* Test Voice Button */}
              <div className="p-4 rounded-2xl bg-[#131520] border border-[#232537] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5 text-[#34d399]" />
                    <span>Uji Suara Maria AI (Model Voice Engine)</span>
                  </div>
                  <div className="text-[11px] text-neutral-400 mt-0.5">
                    Dengarkan audio langsung dari model AI neural voice Maria
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    speechService.unlockAudio();
                    if (speechState.isSpeaking && speechState.activeMessageId === 'settings_test') {
                      speechService.stopSpeaking();
                    } else {
                      speechService.speak(
                        'Halo! Saya Maria AI. Ini adalah suara alami asli saya menggunakan model AI voice engine.',
                        {
                          messageId: 'settings_test',
                          speed: settings.speechSpeed || '1x',
                          voiceName: settings.geminiVoice || 'Kore',
                          preferEngine: settings.voiceEngine || 'gemini',
                        }
                      );
                    }
                  }}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                    speechState.isSpeaking && speechState.activeMessageId === 'settings_test'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                      : 'bg-[#20a66a] text-white hover:bg-[#1b8c59] shadow-lg shadow-[#20a66a]/20'
                  }`}
                >
                  {speechState.isLoading && speechState.activeMessageId === 'settings_test' ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Memproses Suara AI...</span>
                    </>
                  ) : speechState.isSpeaking && speechState.activeMessageId === 'settings_test' ? (
                    <>
                      <VolumeX className="w-3.5 h-3.5 animate-pulse" />
                      <span>Hentikan Suara</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Tes Suara Model AI</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: CHAT */}
          {activeTab === 'chat' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[#171923] border border-[#27293a] flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-white">Tekan Enter untuk Mengirim Pesan</div>
                  <div className="text-[11px] text-neutral-400">Shift + Enter untuk membuat baris baru</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.enterToSend !== false}
                  onChange={(e) => handleUpdate('enterToSend', e.target.checked)}
                  className="w-4 h-4 accent-[#20a66a] rounded"
                />
              </div>

              <div className="p-4 rounded-2xl bg-[#171923] border border-[#27293a] flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-white">Simpan Riwayat Obrolan</div>
                  <div className="text-[11px] text-neutral-400">Simpan otomatis di Cloud Firestore dan perangkat lokal</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.saveChatHistory !== false}
                  onChange={(e) => handleUpdate('saveChatHistory', e.target.checked)}
                  className="w-4 h-4 accent-[#20a66a] rounded"
                />
              </div>
            </div>
          )}

          {/* TAB 5: PRIVACY & DATA */}
          {activeTab === 'privacy' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[#171923] border border-[#27293a] flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-white">Pencegahan Kebocoran Data (DLP Shield)</div>
                  <div className="text-[11px] text-neutral-400">Secara otomatis menyamarkan token sensitif, kata sandi & kunci pribadi</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.dlpEnabled !== false}
                  onChange={(e) => handleUpdate('dlpEnabled', e.target.checked)}
                  className="w-4 h-4 accent-[#20a66a] rounded"
                />
              </div>

              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-rose-400">Hapus Seluruh Riwayat Percakapan</div>
                  <div className="text-[11px] text-neutral-400">Memerlukan otentikasi keamanan 2FA sebelum diproses permanen</div>
                </div>
                <button
                  onClick={() => {
                    onClose();
                    onClearHistoryRequest();
                  }}
                  className="py-1.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Riwayat</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 6: INTEGRATIONS */}
          {activeTab === 'integrations' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[#171923] border border-[#27293a] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">Google Cloud Firestore</div>
                    <div className="text-[11px] text-[#34d399] flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-[#34d399] inline-block animate-pulse" /> Terhubung & Aktif
                    </div>
                  </div>
                </div>
                <span className="text-xs font-semibold text-neutral-400">v13.0</span>
              </div>

              <div className="p-4 rounded-2xl bg-[#171923] border border-[#27293a] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">Google Gemini 3.5 Flash & 3.1 Pro</div>
                    <div className="text-[11px] text-[#34d399] flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-[#34d399] inline-block" /> Mode Penalaran Cerdas Aktif
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: ACCOUNT */}
          {activeTab === 'account' && (
            <div className="space-y-4">
              {user ? (
                <div className="p-5 rounded-2xl bg-[#171923] border border-[#27293a] flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt="Avatar" className="w-12 h-12 rounded-2xl object-cover ring-2 ring-[#20a66a]/40" />
                    ) : (
                      <div className="w-12 h-12 rounded-2xl bg-[#20a66a] text-white flex items-center justify-center font-bold text-lg">
                        {(user.displayName || user.email || 'M')[0].toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="text-sm font-bold text-white flex items-center gap-2">
                        {user.displayName || 'Pengguna Maria AI'}
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#7c3aed]/20 text-[#a78bfa] border border-[#7c3aed]/40">
                          MARIA Plus ✨
                        </span>
                      </div>
                      <div className="text-xs text-neutral-400">{user.email}</div>
                    </div>
                  </div>

                  <button
                    onClick={signOut}
                    className="py-1.5 px-3 rounded-xl bg-[#262838] hover:bg-rose-500/20 text-neutral-300 hover:text-rose-400 text-xs font-medium transition-colors"
                  >
                    Keluar Akun
                  </button>
                </div>
              ) : (
                <div className="p-5 rounded-2xl bg-[#171923] border border-[#27293a] space-y-3">
                  <div className="text-xs text-neutral-300 leading-relaxed">
                    Masuk dengan akun Google untuk mengaktifkan sinkronisasi otomatis Cloud Firestore pada riwayat chat Anda.
                  </div>
                  <button
                    onClick={signIn}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#20a66a] hover:bg-[#1a8c59] text-white font-semibold text-xs shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    <User className="w-4 h-4" />
                    <span>Masuk dengan Akun Google</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
