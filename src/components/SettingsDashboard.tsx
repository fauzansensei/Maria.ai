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
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useTheme } from '../context/ThemeContext.tsx';
import { UserSettings } from '../types.ts';
import { DEFAULT_SETTINGS, TONE_OPTIONS, VOICE_PERSONAS } from '../constants.ts';
import { speechService, SpeechState } from '../lib/speechService.ts';

interface SettingsDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  onClearHistoryRequest: () => void;
  settings?: UserSettings;
  onUpdateSettings?: (patch: Partial<UserSettings>) => void;
}

type TabType = 'general' | 'ai-memory' | 'voice' | 'chat' | 'privacy' | 'integrations' | 'account';

export const SettingsDashboard: React.FC<SettingsDashboardProps> = ({
  isOpen,
  onClose,
  onClearHistoryRequest,
  settings: propSettings,
  onUpdateSettings,
}) => {
  const { user, signIn, signOut } = useAuth();
  const { theme, setTheme, isDark } = useTheme();

  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [speechState, setSpeechState] = useState<SpeechState>(() => speechService.getState());
  const [localSettings, setLocalSettings] = useState<UserSettings>(() => {
    try {
      const saved = localStorage.getItem('maria_settings');
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const settings = propSettings || localSettings;

  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    return speechService.subscribe((state) => {
      setSpeechState(state);
    });
  }, []);

  if (!isOpen) return null;

  const handleUpdate = <K extends keyof UserSettings>(
    keyOrPatch: K | Partial<UserSettings>,
    value?: UserSettings[K]
  ) => {
    const patch =
      typeof keyOrPatch === 'string'
        ? ({ [keyOrPatch]: value } as Partial<UserSettings>)
        : keyOrPatch;

    if (onUpdateSettings) {
      onUpdateSettings(patch);
    } else {
      setLocalSettings((prev) => {
        const updated = { ...prev, ...patch };
        if ('voiceEnabled' in patch) {
          updated.voiceResponses = Boolean(patch.voiceEnabled);
        }
        try {
          localStorage.setItem('maria_settings', JSON.stringify(updated));
        } catch {}
        return updated;
      });
    }

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
            <div className="w-9 h-9 rounded-xl bg-[#2563eb]/15 text-[#60a5fa] border border-[#2563eb]/25 flex items-center justify-center">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">Pengaturan Maria AI</h3>
                {savedSuccess && (
                  <span className="text-[10px] font-semibold text-[#60a5fa] bg-[#2563eb]/20 px-2 py-0.5 rounded-full border border-[#2563eb]/30 flex items-center gap-1">
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
                    ? 'bg-[#2563eb] text-white shadow-sm font-semibold'
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
                  className="w-full px-3.5 py-2.5 bg-[#181a24] border border-[#292c3d] rounded-xl text-xs text-white focus:outline-none focus:border-[#2563eb]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-2">Tema & Mode Tampilan</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <button
                    onClick={() => setTheme('dark')}
                    className={`p-3.5 rounded-2xl border text-xs font-medium flex flex-col items-center gap-2 transition-all ${
                      isDark
                        ? 'bg-[#2563eb]/15 border-[#2563eb] text-[#60a5fa]'
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
                        ? 'bg-[#2563eb]/15 border-[#2563eb] text-[#60a5fa]'
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
                  className="w-full px-3.5 py-2.5 bg-[#181a24] border border-[#292c3d] rounded-xl text-xs text-white focus:outline-none focus:border-[#2563eb]"
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
                          ? 'bg-[#2563eb]/15 border-[#2563eb] text-white'
                          : 'bg-[#181a24] border-[#262838] text-neutral-300 hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold">{tone.label}</span>
                        {settings.tone === tone.value && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#60a5fa]" />
                        )}
                      </div>
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
                  className="w-full px-3.5 py-2 bg-[#181a24] border border-[#292c3d] rounded-xl text-xs text-white focus:outline-none focus:border-[#2563eb]"
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
                  className="w-4 h-4 accent-[#2563eb] rounded"
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
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#2563eb]/20 text-[#60a5fa] font-medium border border-[#2563eb]/40">
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
                  className="w-5 h-5 accent-[#2563eb] rounded cursor-pointer"
                />
              </div>

              {/* Gemini AI Voice Engine Model Selector */}
              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1.5 flex items-center justify-between">
                  <span>Model AI Voice Engine (Gemini TTS)</span>
                  <span className="text-[10px] text-[#60a5fa] font-medium flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-[#60a5fa]" /> Gemini AI Audio Terkini
                  </span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleUpdate('ttsModel', 'gemini-3.8-flash-lite-tts')}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      (settings.ttsModel || 'gemini-3.8-flash-lite-tts') === 'gemini-3.8-flash-lite-tts'
                        ? 'bg-[#2563eb]/15 border-[#2563eb] text-white shadow-sm ring-1 ring-[#2563eb]/30'
                        : 'bg-[#181a24] border-[#27293a] text-neutral-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#60a5fa]" /> Gemini 3.8 Flash Lite TTS
                      </span>
                      {(settings.ttsModel || 'gemini-3.8-flash-lite-tts') === 'gemini-3.8-flash-lite-tts' && (
                        <Check className="w-3.5 h-3.5 text-[#60a5fa]" />
                      )}
                    </div>
                    <p className="text-[11px] text-neutral-300 mt-1">
                      Model suara terkencang, responsif, latensi ultra rendah, dan nada bicara sangat alami.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleUpdate('ttsModel', 'gemini-3.8-flash-tts')}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      settings.ttsModel === 'gemini-3.8-flash-tts'
                        ? 'bg-[#2563eb]/15 border-[#2563eb] text-white shadow-sm ring-1 ring-[#2563eb]/30'
                        : 'bg-[#181a24] border-[#27293a] text-neutral-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-purple-400" /> Gemini 3.8 Flash TTS
                      </span>
                      {settings.ttsModel === 'gemini-3.8-flash-tts' && (
                        <Check className="w-3.5 h-3.5 text-[#60a5fa]" />
                      )}
                    </div>
                    <p className="text-[11px] text-neutral-300 mt-1">
                      Model audio unggulan dengan artikulasi tinggi, modulasi emosional kaya, dan vokal studio.
                    </p>
                  </button>
                </div>
              </div>

              {/* Model Karakter & Gender Suara AI (Pria, Wanita, Anak-anak, Remaja) */}
              <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-semibold text-neutral-300">
                        Pilihan Model Gender & Usia Suara AI
                      </label>
                      <span className="text-[10px] text-emerald-400 font-medium">
                        6 Model Suara Tersedia
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {VOICE_PERSONAS.map((persona) => {
                        const isSelected = (settings.voicePersona || 'wanita') === persona.id;

                        return (
                          <div
                            key={persona.id}
                            onClick={() => {
                              handleUpdate({
                                voicePersona: persona.id,
                                geminiVoice: persona.geminiVoice,
                              });
                            }}
                            className={`cursor-pointer p-3 rounded-2xl border transition-all ${
                              isSelected
                                ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-sm ring-1 ring-emerald-500/30'
                                : 'bg-[#181a24] border-[#27293a] text-neutral-300 hover:border-neutral-600 hover:bg-[#1c1e2b]'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2.5 flex-1 text-left min-w-0">
                                <div className={`w-8 h-8 rounded-xl border flex items-center justify-center font-bold text-xs shrink-0 ${
                                  isSelected
                                    ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-400'
                                    : 'bg-neutral-800/80 border-neutral-700/60 text-neutral-400'
                                }`}>
                                  {persona.name.slice(0, 2).toUpperCase()}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-xs font-bold text-white">
                                      {persona.label}
                                    </span>
                                    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium bg-neutral-800 text-neutral-300 border border-neutral-700">
                                      {persona.category} • {persona.gender}
                                    </span>
                                    {isSelected && (
                                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                    )}
                                  </div>
                                  <div className="text-[10px] text-neutral-400 mt-0.5 line-clamp-1">
                                    {persona.description}
                                  </div>
                                </div>
                              </div>

                              {/* Tes Suara Sample Button */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  speechService.unlockAudio();
                                  speechService.speak(persona.sampleText, {
                                    voiceName: persona.geminiVoice,
                                    personaId: persona.id,
                                    speed: settings.speechSpeed || '1x',
                                    ttsModel: settings.ttsModel || 'gemini-3.8-flash-lite-tts',
                                  });
                                }}
                                title="Dengarkan contoh suara"
                                className="p-1.5 px-2.5 rounded-xl bg-neutral-800/90 hover:bg-emerald-600 hover:text-white text-neutral-300 transition-colors shrink-0 flex items-center gap-1 text-[10px] font-semibold"
                              >
                                <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Tes</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Gemini AI Voice Timbre Fine-Tuner */}
                  <div>
                    <label className="text-xs font-semibold text-neutral-300 block mb-1.5 flex items-center justify-between">
                      <span>Timbre Vokal AI Engine (Gemini Voice Timbre)</span>
                      <span className="text-[10px] text-emerald-400">Aktif: {settings.geminiVoice || 'Aoede'}</span>
                    </label>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {[
                        { id: 'Aoede', label: 'Aoede', desc: 'Wanita • Elegan' },
                        { id: 'Kore', label: 'Kore', desc: 'Wanita • Lembut' },
                        { id: 'Zephyr', label: 'Zephyr', desc: 'Wanita • Ceria' },
                        { id: 'Fenrir', label: 'Fenrir', desc: 'Pria • Mantap' },
                        { id: 'Puck', label: 'Puck', desc: 'Pria • Dinamis' },
                        { id: 'Charon', label: 'Charon', desc: 'Pria • Tenang' },
                      ].map((v) => {
                        const isVoiceSelected = (settings.geminiVoice || 'Aoede') === v.id;
                        return (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => handleUpdate('geminiVoice', v.id as any)}
                            className={`p-2 rounded-xl border text-center transition-all ${
                              isVoiceSelected
                                ? 'bg-emerald-500/20 border-emerald-500 text-white font-bold ring-1 ring-emerald-500/50'
                                : 'bg-[#181a24] border-[#27293a] text-neutral-400 hover:text-white hover:border-neutral-700'
                            }`}
                          >
                            <div className="text-xs font-bold">{v.label}</div>
                            <div className="text-[9px] text-neutral-400 mt-0.5">{v.desc}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

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
                          ? 'bg-[#2563eb] border-[#2563eb] text-white font-bold'
                          : 'bg-[#181a24] border-[#27293a] text-neutral-400 hover:text-white'
                      }`}
                    >
                      {spd}
                    </button>
                  ))}
                </div>
              </div>

              {/* Test Voice Button */}
              {(() => {
                const activePersona =
                  VOICE_PERSONAS.find((p) => p.id === (settings.voicePersona || 'wanita')) ||
                  VOICE_PERSONAS[0];

                return (
                  <div className="p-4 rounded-2xl bg-[#131520] border border-[#232537] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                        <Volume2 className="w-3.5 h-3.5 text-[#60a5fa]" />
                        <span>Uji Suara Model AI: {activePersona.name} ({activePersona.label})</span>
                      </div>
                      <div className="text-[11px] text-neutral-400 mt-0.5">
                        Dengarkan contoh suara model {activePersona.category} {activePersona.gender} ({settings.geminiVoice || activePersona.geminiVoice})
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        speechService.unlockAudio();
                        if (speechState.isSpeaking && speechState.activeMessageId === 'settings_test') {
                          speechService.stopSpeaking();
                        } else {
                          const testText =
                            activePersona.sampleText ||
                            `Halo! Saya ${activePersona.name}. Ini adalah suara asli model AI ${activePersona.label}.`;
                          speechService.speak(testText, {
                            messageId: 'settings_test',
                            speed: settings.speechSpeed || '1x',
                            voiceName: settings.geminiVoice || activePersona.geminiVoice,
                            personaId: activePersona.id,
                            ttsModel: settings.ttsModel || 'gemini-3.8-flash-lite-tts',
                          });
                        }
                      }}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                        speechState.isSpeaking && speechState.activeMessageId === 'settings_test'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                          : 'bg-[#2563eb] text-white hover:bg-[#1d4ed8] shadow-lg shadow-[#2563eb]/20'
                      }`}
                    >
                      {speechState.isLoading && speechState.activeMessageId === 'settings_test' ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Menyiapkan Suara...</span>
                        </>
                      ) : speechState.isSpeaking && speechState.activeMessageId === 'settings_test' ? (
                        <>
                          <VolumeX className="w-3.5 h-3.5 animate-pulse" />
                          <span>Hentikan Suara</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>Tes Suara {activePersona.name}</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })()}
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
                  className="w-4 h-4 accent-[#2563eb] rounded"
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
                  className="w-4 h-4 accent-[#2563eb] rounded"
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
                  className="w-4 h-4 accent-[#2563eb] rounded"
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
                    <div className="text-[11px] text-[#60a5fa] flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-[#60a5fa] inline-block animate-pulse" /> Terhubung & Aktif
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
                    <div className="text-[11px] text-[#60a5fa] flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-[#60a5fa] inline-block" /> Mode Penalaran Cerdas Aktif
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
                      <img src={user.photoURL} alt="Avatar" className="w-12 h-12 rounded-2xl object-cover ring-2 ring-[#2563eb]/40" />
                    ) : (
                      <div className="w-12 h-12 rounded-2xl bg-[#2563eb] text-white flex items-center justify-center font-bold text-lg">
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
                    className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-50 active:bg-slate-100 text-[#1f2937] border border-slate-200/90 font-medium text-xs shadow-sm transition-all flex items-center justify-center gap-2.5 cursor-pointer"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>Continue with Google</span>
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
