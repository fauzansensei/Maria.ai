import React from 'react';
import {
  X,
  Moon,
  Sun,
  Laptop,
  Database,
  CheckCircle2,
  ShieldCheck,
  User,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { useTheme, Theme } from '../context/ThemeContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { updateUserProfile } from '../lib/firestoreService.ts';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();

  if (!isOpen) return null;

  const handleThemeChange = async (newTheme: Theme) => {
    setTheme(newTheme);
    if (user) {
      try {
        await updateUserProfile(user.uid, { theme: newTheme });
      } catch (err) {
        console.warn('Could not sync theme to Firestore profile:', err);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                Pengaturan Maria AI
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Preferensi tema, tampilan OLED, dan basis data
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
          {/* Theme Settings */}
          <div className="space-y-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Tema Tampilan & Mode Gelap
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => handleThemeChange('dark')}
                className={`flex flex-col items-center gap-2 p-3.5 rounded-xl border text-xs font-medium transition-all ${
                  theme === 'dark'
                    ? 'border-indigo-500 bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 ring-2 ring-indigo-500/20'
                    : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-black text-neutral-700 dark:text-neutral-300 hover:border-neutral-300 dark:hover:border-neutral-700'
                }`}
              >
                <Moon className="w-5 h-5" />
                <span>OLED Gelap</span>
                <span className="text-[10px] text-neutral-400">Hemat baterai</span>
              </button>

              <button
                type="button"
                onClick={() => handleThemeChange('light')}
                className={`flex flex-col items-center gap-2 p-3.5 rounded-xl border text-xs font-medium transition-all ${
                  theme === 'light'
                    ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 ring-2 ring-indigo-500/20'
                    : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-black text-neutral-700 dark:text-neutral-300 hover:border-neutral-300 dark:hover:border-neutral-700'
                }`}
              >
                <Sun className="w-5 h-5" />
                <span>Terang</span>
                <span className="text-[10px] text-neutral-400">Klasik</span>
              </button>

              <button
                type="button"
                onClick={() => handleThemeChange('system')}
                className={`flex flex-col items-center gap-2 p-3.5 rounded-xl border text-xs font-medium transition-all ${
                  theme === 'system'
                    ? 'border-indigo-500 bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 ring-2 ring-indigo-500/20'
                    : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-black text-neutral-700 dark:text-neutral-300 hover:border-neutral-300 dark:hover:border-neutral-700'
                }`}
              >
                <Laptop className="w-5 h-5" />
                <span>Sistem</span>
                <span className="text-[10px] text-neutral-400">Otomatis</span>
              </button>
            </div>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
              Mode OLED menggunakan warna hitam murni (<code className="font-mono text-indigo-400">#000000</code>) sehingga piksel pada layar AMOLED/OLED benar-benar mati untuk menghemat daya secara maksimal di malam hari.
            </p>
          </div>

          {/* Database & Project Connection */}
          <div className="space-y-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5" /> Basis Data & Proyek Firebase
            </label>
            <div className="p-4 rounded-xl bg-neutral-50 dark:bg-black border border-neutral-200 dark:border-neutral-800 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-500">Nama Proyek:</span>
                <span className="font-semibold text-neutral-900 dark:text-white flex items-center gap-1.5">
                  Maria AI <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-mono">Aktif</span>
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-500">ID Proyek:</span>
                <span className="font-mono text-[11px] text-indigo-500 dark:text-indigo-400">
                  gen-lang-client-0860887544
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-500">Firestore DB:</span>
                <span className="font-mono text-[11px] text-neutral-600 dark:text-neutral-400 truncate max-w-[200px]">
                  ai-studio-a423a3c8-ecfe-4009-8c4d-fb5b0fa54d32
                </span>
              </div>
              <div className="pt-2 border-t border-neutral-200/80 dark:border-neutral-900 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Terhubung langsung ke Cloud Firestore & Auth</span>
              </div>
            </div>
          </div>

          {/* User Account Info */}
          <div className="space-y-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> Akun Pengguna
            </label>
            {user ? (
              <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-black border border-neutral-200 dark:border-neutral-800 flex items-center gap-3">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-indigo-500/30"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold">
                    {(user.displayName || 'U')[0]}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-neutral-900 dark:text-white truncate">
                    {user.displayName || 'Pengguna Maria AI'}
                  </div>
                  <div className="text-xs text-neutral-500 truncate">{user.email}</div>
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-black border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-500">
                Anda sedang dalam mode tamu. Masuk dengan Google untuk menyinkronkan profil dan riwayat percakapan Anda secara otomatis.
              </div>
            )}
          </div>
          {/* Developer Information */}
          <div className="space-y-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-500" /> Developer & Pembuat
            </label>
            <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-[#0c1427] border border-blue-200 dark:border-blue-900/50 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>Maria AI</span>
                  <span className="text-blue-600 dark:text-blue-400 font-semibold text-xs">by Zan.dev</span>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Portfolio: <span className="font-mono text-blue-600 dark:text-blue-400">zandev-six.vercel.app</span>
                </div>
              </div>
              <a
                href="https://zandev-six.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 shrink-0 shadow-2xs"
              >
                <span>Portfolio</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-neutral-50/60 dark:bg-black border-t border-neutral-200 dark:border-neutral-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200 text-xs font-semibold rounded-xl transition-colors"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
};
