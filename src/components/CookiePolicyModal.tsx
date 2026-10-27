import React, { useState } from 'react';
import {
  X,
  Cookie,
  ShieldCheck,
  CheckCircle2,
  Trash2,
  ExternalLink,
  Lock,
  Database,
  Sliders,
  Sparkles,
} from 'lucide-react';

interface CookiePolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CookiePolicyModal: React.FC<CookiePolicyModalProps> = ({ isOpen, onClose }) => {
  const [clearedNotice, setClearedNotice] = useState(false);

  if (!isOpen) return null;

  const handleClearCookiesAndStorage = () => {
    try {
      // Clear local non-essential cache
      localStorage.removeItem('maria_notifications_state');
      localStorage.removeItem('maria_audio_cache');
      // Set notice
      setClearedNotice(true);
      setTimeout(() => setClearedNotice(false), 3000);
    } catch (e) {
      console.warn('Failed to clear local cache:', e);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white dark:bg-[#0c1222] border border-slate-200 dark:border-white/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 dark:bg-amber-400/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Cookie className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Kebijakan Cookie & Privasi</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  Aktif
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Transparansi penggunaan cookie dan penyimpanan data di Maria AI
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
          {/* Summary Box */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#141b2d] border border-slate-200 dark:border-white/10 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-semibold text-slate-900 dark:text-white">
                Komitmen Bebas Iklan & Bebas Pelacak (No-Tracking)
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Maria AI <strong>tidak pernah</strong> menggunakan cookie pihak ketiga untuk pelacakan iklan komersial. Semua penyimpanan semata-mata digunakan untuk menjaga sesi login, performa audio AI, dan preferensi antarmuka Anda.
              </div>
            </div>
          </div>

          {/* Table / List of Storage Items */}
          <div className="space-y-2.5">
            <div className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-blue-500" />
              <span>Data yang Disimpan di Perangkat Anda:</span>
            </div>

            <div className="space-y-2">
              {/* Item 1: Firebase Auth */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#111726] border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-indigo-400" />
                    Firebase Auth Session Token
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium">
                    Wajib (Esensial)
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Menyimpan token autentikasi Google akun Anda agar tidak perlu melakukan login ulang setiap kali membuka tab baru.
                </p>
              </div>

              {/* Item 2: User Preferences */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#111726] border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-purple-400" />
                    maria_settings & Theme
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-medium">
                    Fungsional
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Menyimpan pilihan tema gelap (OLED/Dark/Light), kecepatan suara ucapan Maria AI (0.75x - 1.5x), dan preferensi model default.
                </p>
              </div>

              {/* Item 3: Audio TTS Cache */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#111726] border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    Cache Suara AI & Audio TTS
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-medium">
                    Kinerja
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Menyimpan sampel suara persona agar respons ucapan terdengar instan tanpa mengulang unduhan data internet.
                </p>
              </div>
            </div>
          </div>

          {/* Notice after clearing */}
          {clearedNotice && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Cache lokal berhasil dibersihkan! Sesi autentikasi Anda tetap aman.</span>
            </div>
          )}

          {/* External document link */}
          <div className="flex items-center justify-between pt-1">
            <a
              href="/cookies.html"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:underline font-medium text-xs"
            >
              <span>Baca Dokumen Lengkap Kebijakan Cookie (HTML)</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:px-6 bg-slate-50 dark:bg-[#080d19] border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={handleClearCookiesAndStorage}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Bersihkan Cache Lokal</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-white text-slate-900 hover:bg-slate-200 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 shadow-md transition-colors"
          >
            Saya Mengerti
          </button>
        </div>
      </div>
    </div>
  );
};
