import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  Sparkles,
  CheckCircle2,
  HelpCircle,
  Mail,
  Home,
  Shield,
  Layers,
} from 'lucide-react';

interface MariaPlusModalProps {
  isOpen: boolean;
  onClose: () => void;
  isPlus: boolean;
  onTogglePlus: (active: boolean) => void;
}

export const MariaPlusModal: React.FC<MariaPlusModalProps> = ({
  isOpen,
  onClose,
  isPlus,
  onTogglePlus,
}) => {
  const [billedYearly, setBilledYearly] = useState(true);
  const [activeNavTab, setActiveNavTab] = useState<'pricing' | 'faq' | 'contact'>('pricing');
  const [justActivated, setJustActivated] = useState(false);

  // Close on ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleActivatePlus = () => {
    onTogglePlus(true);
    setJustActivated(true);
    setTimeout(() => {
      setJustActivated(false);
      onClose();
    }, 1400);
  };

  const handleDeactivate = () => {
    onTogglePlus(false);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Maria Pricing"
      className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-start overflow-y-auto overflow-x-hidden p-3 sm:p-6 text-white select-none animate-in fade-in duration-100"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* Top Floating Pill Navigation (Exact match to reference image) */}
      <div className="sticky top-2 sm:top-4 z-30 mb-4 sm:mb-8 flex items-center justify-between w-auto max-w-full px-3 py-1.5 rounded-full bg-[#121318] border border-white/10 shadow-2xl">
        {/* Left Close Pill Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup"
          className="w-7 h-7 rounded-full bg-[#1e2029] hover:bg-[#2b2d3a] text-neutral-300 hover:text-white flex items-center justify-center transition cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        {/* Center Nav Links */}
        <div className="flex items-center gap-3 sm:gap-6 px-3 sm:px-5 text-xs font-medium text-neutral-400">
          <button
            type="button"
            onClick={onClose}
            className="hover:text-white transition cursor-pointer"
          >
            Home
          </button>
          <button
            type="button"
            onClick={() => setActiveNavTab('pricing')}
            className={`cursor-pointer transition ${
              activeNavTab === 'pricing' ? 'text-white font-semibold' : 'hover:text-white'
            }`}
          >
            Pricing
          </button>
          <button
            type="button"
            onClick={() => setActiveNavTab('faq')}
            className={`cursor-pointer transition ${
              activeNavTab === 'faq' ? 'text-white font-semibold' : 'hover:text-white'
            }`}
          >
            FAQ
          </button>
          <button
            type="button"
            onClick={() => setActiveNavTab('contact')}
            className={`cursor-pointer transition ${
              activeNavTab === 'contact' ? 'text-white font-semibold' : 'hover:text-white'
            }`}
          >
            Contact
          </button>
        </div>

        {/* Right Download / Action Pill Button */}
        <button
          type="button"
          onClick={handleActivatePlus}
          className="px-3.5 sm:px-4 py-1.5 rounded-full bg-white hover:bg-neutral-200 text-black text-xs font-bold tracking-tight shadow-sm transition active:scale-95 cursor-pointer"
        >
          {isPlus ? 'PLUS Aktif' : 'Download'}
        </button>
      </div>

      {/* Main Container */}
      <div className="relative w-full max-w-5xl flex flex-col items-center justify-center py-2 sm:py-6">
        {/* Giant Watermark Typography: "Pricing" (Frosted behind cards) */}
        <div className="pointer-events-none select-none absolute top-0 sm:top-2 left-1/2 -translate-x-1/2 flex items-center justify-center w-full z-0">
          <h1 className="text-[72px] sm:text-[140px] md:text-[180px] font-black tracking-tight text-white/90 text-center leading-none">
            Pricing
          </h1>
          {/* Frosted Blur Vignette over watermark */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/40 to-black pointer-events-none" />
        </div>

        {/* Notification Alert if just activated */}
        {justActivated && (
          <div className="relative z-20 mb-6 p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 flex items-center gap-3 shadow-2xl animate-in zoom-in-95">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div className="text-xs sm:text-sm">
              <span className="font-bold">Selamat! Maria PLUS Berhasil Diaktifkan.</span> Lencana PLUS kini aktif dan seluruh fitur premium telah terbuka.
            </div>
          </div>
        )}

        {/* TAB CONTENT: FAQ VIEW */}
        {activeNavTab === 'faq' && (
          <div className="relative z-10 w-full max-w-2xl bg-[#0f1015] border border-white/10 rounded-[28px] p-6 shadow-2xl space-y-4 my-6">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-indigo-400" />
                Pertanyaan Umum (FAQ)
              </h2>
              <button
                onClick={() => setActiveNavTab('pricing')}
                className="text-xs text-neutral-400 hover:text-white underline cursor-pointer"
              >
                Kembali ke Pricing
              </button>
            </div>
            <div className="space-y-3 text-xs sm:text-sm text-neutral-300">
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                <div className="font-semibold text-white">Apa itu Maria PLUS?</div>
                <p className="text-neutral-400 text-xs mt-1">
                  Maria PLUS adalah opsi berbayar yang membuka fitur mutakhir seperti Deep Research, Studio Musik & Suara AI, Studio Gambar 4K Gemini Nano, Canvas & Code Pro, serta respons server prioritas VIP.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                <div className="font-semibold text-white">Apakah saya bisa membatalkan kapan saja?</div>
                <p className="text-neutral-400 text-xs mt-1">
                  Ya, Anda dapat beralih kembali ke versi gratis kapan saja tanpa biaya penalti.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                <div className="font-semibold text-white">Bagaimana metode pembayarannya?</div>
                <p className="text-neutral-400 text-xs mt-1">
                  Mendukung kartu kredit/debit, Google Play Billing, QRIS, GoPay, OVO, dan transfer bank lokal.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB CONTENT: CONTACT VIEW */}
        {activeNavTab === 'contact' && (
          <div className="relative z-10 w-full max-w-md bg-[#0f1015] border border-white/10 rounded-[28px] p-6 shadow-2xl space-y-4 my-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mx-auto text-white">
              <Mail className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-white">Hubungi Tim Maria AI</h2>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Punya pertanyaan mengenai paket enterprise, lisensi institusi, atau integrasi kustom? Tim kami siap membantu Anda 24/7.
            </p>
            <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-indigo-300 font-mono">
              support@maria-ai.studio
            </div>
            <button
              onClick={() => setActiveNavTab('pricing')}
              className="w-full py-2.5 rounded-full bg-white text-black font-semibold text-xs hover:bg-neutral-200 transition cursor-pointer"
            >
              Kembali ke Pilihan Paket
            </button>
          </div>
        )}

        {/* TAB CONTENT: PRICING 3 CARDS VIEW (Exact Match to Reference) */}
        {activeNavTab === 'pricing' && (
          <>
            {/* 3 Pricing Cards Grid */}
            <div className="relative z-10 w-full grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 mt-16 sm:mt-24 px-1">
              {/* CARD 1: Free Plan */}
              <div className="flex flex-col justify-between p-6 sm:p-7 rounded-[28px] bg-[#0c0d12] border border-white/10 shadow-2xl hover:border-white/20 transition-colors group">
                <div>
                  <div className="text-xs font-semibold text-neutral-400 tracking-tight">
                    Free Plan
                  </div>
                  <div className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mt-3 mb-6">
                    Free
                  </div>

                  {/* Feature Check List */}
                  <div className="space-y-3.5 text-xs text-neutral-300">
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-[#1c1d25] border border-white/10 flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-neutral-300">Send up to 50 transfers per day</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-[#1c1d25] border border-white/10 flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-neutral-300">Basic transaction history</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-[#1c1d25] border border-white/10 flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-neutral-300">Email support</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-[#1c1d25] border border-white/10 flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-neutral-300">Limited currency support (USD, EUR, IDR)</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-[#1c1d25] border border-white/10 flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-neutral-300">Basic security features</span>
                    </div>
                  </div>
                </div>

                {/* CTA Button */}
                <div className="mt-8 pt-4">
                  {isPlus ? (
                    <button
                      type="button"
                      onClick={handleDeactivate}
                      className="w-full py-3 px-4 rounded-full bg-[#16171f] hover:bg-[#222432] text-neutral-300 hover:text-white border border-white/10 text-xs font-semibold tracking-tight transition active:scale-98 cursor-pointer"
                    >
                      Beralih ke Versi Gratis
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={onClose}
                      className="w-full py-3 px-4 rounded-full bg-[#16171f] hover:bg-[#222432] text-neutral-300 hover:text-white border border-white/10 text-xs font-semibold tracking-tight transition active:scale-98 cursor-pointer"
                    >
                      Get Started
                    </button>
                  )}
                </div>
              </div>

              {/* CARD 2: Standard Plan (Middle Featured / Maria PLUS) */}
              <div className="relative flex flex-col justify-between p-6 sm:p-7 rounded-[28px] bg-[#0c0d12] border border-white/20 shadow-2xl hover:border-white/40 transition-colors scale-[1.02] sm:scale-105 z-10 group">
                {/* Popular Glow Indicator */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-[10px] font-extrabold uppercase tracking-widest shadow-md">
                  Most Popular
                </div>

                <div>
                  <div className="text-xs font-semibold text-neutral-400 tracking-tight flex items-center justify-between">
                    <span>Standard Plan</span>
                    <span className="text-[10px] font-bold text-indigo-400">Maria PLUS</span>
                  </div>
                  <div className="flex items-baseline gap-1 mt-3 mb-6">
                    <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                      {billedYearly ? '$7.99' : '$9.99'}
                    </span>
                    <span className="text-sm font-medium text-neutral-400">/m</span>
                  </div>

                  {/* Feature Check List */}
                  <div className="space-y-3.5 text-xs text-neutral-200">
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-[#1c1d25] border border-white/20 flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-white font-medium">Unlimited transfers & queries</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-[#1c1d25] border border-white/20 flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-neutral-200">Deep Research & AI report export</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-[#1c1d25] border border-white/20 flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-neutral-200">Studio Gambar AI 4K & Audio Studio</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-[#1c1d25] border border-white/20 flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-neutral-200">Expanded currency support</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-[#1c1d25] border border-white/20 flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-neutral-200">Advanced security features (Spy Guard)</span>
                    </div>
                  </div>
                </div>

                {/* Featured White Solid Pill Button (Exact match) */}
                <div className="mt-8 pt-4">
                  <button
                    type="button"
                    onClick={handleActivatePlus}
                    className="w-full py-3 px-4 rounded-full bg-white hover:bg-neutral-100 text-black text-xs font-bold tracking-tight shadow-xl shadow-white/10 transition active:scale-98 cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isPlus ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>PLUS Sedang Aktif (VIP)</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-black" />
                        <span>Get Started</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* CARD 3: Pro Plan */}
              <div className="flex flex-col justify-between p-6 sm:p-7 rounded-[28px] bg-[#0c0d12] border border-white/10 shadow-2xl hover:border-white/20 transition-colors group">
                <div>
                  <div className="text-xs font-semibold text-neutral-400 tracking-tight">
                    Pro Plan
                  </div>
                  <div className="flex items-baseline gap-1 mt-3 mb-6">
                    <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                      {billedYearly ? '$15.99' : '$19.99'}
                    </span>
                    <span className="text-sm font-medium text-neutral-400">/m</span>
                  </div>

                  {/* Feature Check List */}
                  <div className="space-y-3.5 text-xs text-neutral-300">
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-[#1c1d25] border border-white/10 flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-neutral-300">Unlimited transfers with priority processing</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-[#1c1d25] border border-white/10 flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-neutral-300">Comprehensive transaction analytics</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-[#1c1d25] border border-white/10 flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-neutral-300">24/7 priority support</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-[#1c1d25] border border-white/10 flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-neutral-300">Full currency support</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-[#1c1d25] border border-white/10 flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-neutral-300">Enhanced security features</span>
                    </div>
                  </div>
                </div>

                {/* CTA Button */}
                <div className="mt-8 pt-4">
                  <button
                    type="button"
                    onClick={handleActivatePlus}
                    className="w-full py-3 px-4 rounded-full bg-[#16171f] hover:bg-[#222432] text-neutral-300 hover:text-white border border-white/10 text-xs font-semibold tracking-tight transition active:scale-98 cursor-pointer"
                  >
                    Get Started
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom Controls (Exact Match to Reference: Billed Yearly Toggle on left & Center Plans pill) */}
            <div className="relative z-10 w-full flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 pt-4 px-2">
              {/* Billed Yearly Toggle */}
              <div
                onClick={() => setBilledYearly((prev) => !prev)}
                className="flex items-center gap-3 cursor-pointer select-none group"
              >
                <div
                  className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 ease-in-out ${
                    billedYearly ? 'bg-white' : 'bg-neutral-800 border border-neutral-700'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full transition-transform duration-200 ease-in-out ${
                      billedYearly
                        ? 'translate-x-5 bg-black'
                        : 'translate-x-0 bg-neutral-400'
                    }`}
                  />
                </div>
                <span className="text-xs font-medium text-neutral-300 group-hover:text-white transition">
                  Billed Yearly
                </span>
                {billedYearly && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Hemat 20%
                  </span>
                )}
              </div>

              {/* Center Plans Tab Pill with subtle connector lines */}
              <div className="flex items-center gap-2">
                <div className="w-8 h-[1px] bg-white/10" />
                <div className="px-3 py-1 rounded-full bg-[#14151b] border border-white/10 text-[10px] font-medium text-neutral-400">
                  Plans
                </div>
                <div className="w-8 h-[1px] bg-white/10" />
              </div>

              {/* Status info */}
              <div className="text-[11px] text-neutral-400">
                {isPlus ? (
                  <span className="text-emerald-400 font-semibold">● Maria PLUS Aktif</span>
                ) : (
                  <span>Status: Paket Gratis</span>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
