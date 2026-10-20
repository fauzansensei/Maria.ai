import React, { useState } from 'react';
import { ShieldAlert, X, KeyRound, Check, AlertCircle } from 'lucide-react';

interface TwoFactorModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  onConfirm: () => void;
}

export const TwoFactorModal: React.FC<TwoFactorModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  onConfirm,
}) => {
  const [pin, setPin] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState(false);

  if (!isOpen) return null;

  const handleChange = (index: number, val: string) => {
    if (val.length > 1) {
      val = val[val.length - 1];
    }
    const newPin = [...pin];
    newPin[index] = val;
    setPin(newPin);
    setError(false);

    // Auto advance focus
    if (val && index < 5) {
      const nextInput = document.getElementById(`pin-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      const prevInput = document.getElementById(`pin-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleVerify = () => {
    const fullPin = pin.join('');
    // Accepts test code 123456 or default any 6 digit input
    if (fullPin.length === 6) {
      onConfirm();
      onClose();
    } else {
      setError(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-sm bg-[#12131a] border border-[#26283b] rounded-2xl shadow-2xl p-6 text-white space-y-5 animate-in fade-in zoom-in-95">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-neutral-400 hover:text-white p-1 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">{title}</h3>
            <p className="text-[11px] text-neutral-400">Verifikasi Keamanan Maria DEFCON</p>
          </div>
        </div>

        <p className="text-xs text-neutral-300 leading-relaxed">{description}</p>

        {/* 6 Digit PIN */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-1.5">
            {pin.map((digit, idx) => (
              <input
                key={idx}
                id={`pin-${idx}`}
                type="password"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                className="w-10 h-12 text-center text-lg font-bold bg-[#0e172e] border border-[#1e2d4d] focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 rounded-xl text-white outline-none transition-all"
              />
            ))}
          </div>
          {error && (
            <div className="flex items-center gap-1.5 text-[11px] text-rose-400">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Masukkan 6 digit kode keamanan</span>
            </div>
          )}
          <p className="text-[10px] text-slate-400 text-center">
            Gunakan PIN otentikasi Anda atau masukkan 6 digit bebas untuk konfirmasi.
          </p>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-[#15223e] hover:bg-slate-200 dark:hover:bg-[#1e2d4d] text-slate-700 dark:text-slate-300 text-xs font-medium transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleVerify}
            className="flex-1 py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Konfirmasi</span>
          </button>
        </div>
      </div>
    </div>
  );
};
