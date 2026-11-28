import React, { useMemo, useState, useEffect } from 'react';
import { ShieldAlert, ShieldCheck, Minimize2, Sparkles } from 'lucide-react';
import { MariaCharacter3D, type MariaCharacterState } from './MariaCharacter3D.tsx';
import { analyzeMariaContext } from '../lib/mariaContextAnalyzer.ts';
import { speechService, type SpeechState } from '../lib/speechService.ts';
import { useLanguage } from '../context/LanguageContext.tsx';
import type { Message } from '../types/index.ts';
import type { SidebarView } from './Sidebar.tsx';

interface MariaCompanionDockProps {
  messages: Message[];
  isLoading: boolean;
  activeView: SidebarView;
  isLiveActive: boolean;
  manualSpyGuardAlert: boolean;
  onToggleSpyGuardAlert: () => void;
}

export const MariaCompanionDock: React.FC<MariaCompanionDockProps> = ({
  messages,
  isLoading,
  activeView,
  isLiveActive,
  manualSpyGuardAlert,
  onToggleSpyGuardAlert,
}) => {
  const { isEn } = useLanguage();
  const [speechState, setSpeechState] = useState<SpeechState>(() => speechService.getState());
  const [isExpanded, setIsExpanded] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('maria_3d_companion_open');
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });

  useEffect(() => {
    return speechService.subscribe((next) => {
      setSpeechState(next);
    });
  }, []);

  const toggleExpanded = (next: boolean) => {
    setIsExpanded(next);
    try {
      localStorage.setItem('maria_3d_companion_open', String(next));
    } catch {}
  };

  const isStreaming = useMemo(
    () => messages.some((m) => m.role === 'model' && m.isStreaming),
    [messages]
  );

  const contextSignal = useMemo(
    () =>
      analyzeMariaContext({
        messages,
        isLoading,
        isStreaming,
        isSpeaking: speechState.isSpeaking,
        activeView,
        manualSpyGuardAlert,
      }),
    [messages, isLoading, isStreaming, speechState.isSpeaking, activeView, manualSpyGuardAlert]
  );

  // Yield WebGL stage cleanly when Gemini Live 3D overlay is open
  if (isLiveActive) return null;

  const characterState: MariaCharacterState = contextSignal.spyGuardThreat
    ? 'error'
    : speechState.isSpeaking
    ? 'speaking'
    : speechState.isLoading
    ? 'connecting'
    : isLoading || isStreaming
    ? 'thinking'
    : 'idle';

  const statusLabel = isEn ? contextSignal.statusLabelEn : contextSignal.statusLabelId;
  const isAlert = contextSignal.spyGuardThreat;
  const isCalm = contextSignal.mood === 'calm';

  if (!isExpanded) {
    return (
      <div className="fixed bottom-24 right-4 sm:right-6 z-30 flex items-center gap-2">
        <button
          type="button"
          onClick={() => toggleExpanded(true)}
          title={isEn ? 'Open 3D Maria Companion' : 'Buka Asisten 3D Maria'}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-full border text-xs font-semibold shadow-lg cursor-pointer transition-colors ${
            isAlert
              ? 'bg-[#2a0810] border-rose-500/80 text-rose-100 hover:bg-[#3b0b17]'
              : 'bg-[#0b1120] border-slate-700/80 text-sky-100 hover:bg-[#131c33]'
          }`}
        >
          {isAlert ? (
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
          ) : (
            <Sparkles className="w-4 h-4 text-sky-400 shrink-0" />
          )}
          <span className="whitespace-nowrap">
            {isAlert ? 'Spy Guard Alert' : 'Maria 3D'}
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-24 right-4 sm:right-6 z-30 select-none">
      <div
        className={`w-[176px] sm:w-[196px] rounded-3xl border shadow-2xl p-2.5 flex flex-col items-center transition-colors duration-300 ${
          isAlert
            ? 'bg-[#2a0810]/96 border-rose-500/80 shadow-[0_8px_32px_rgba(244,63,94,0.35)]'
            : isCalm
            ? 'bg-[#071a1f]/96 border-teal-500/50 shadow-[0_8px_28px_rgba(20,184,166,0.22)]'
            : 'bg-[#0b1120]/96 border-slate-700/80 shadow-[0_8px_30px_rgba(15,23,42,0.4)]'
        }`}
      >
        {/* Top Action Row: Spy Guard Shield & Minimize */}
        <div className="w-full flex items-center justify-between gap-1 px-0.5">
          <button
            type="button"
            onClick={onToggleSpyGuardAlert}
            title={
              isAlert
                ? isEn
                  ? 'Clear Spy Guard Red Alert'
                  : 'Matikan Mode Siaga Merah Spy Guard'
                : isEn
                ? 'Test Spy Guard Threat Alert'
                : 'Simulasi Peringatan Ancaman Spy Guard'
            }
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold cursor-pointer transition-colors ${
              isAlert
                ? 'bg-rose-500/25 text-rose-200 hover:bg-rose-500/35 border border-rose-400/40'
                : 'bg-white/8 text-slate-300 hover:bg-white/15 border border-white/10'
            }`}
          >
            {isAlert ? (
              <ShieldAlert className="w-3 h-3 text-rose-300 shrink-0" />
            ) : (
              <ShieldCheck className="w-3 h-3 text-sky-400 shrink-0" />
            )}
            <span>Spy Guard</span>
          </button>

          <button
            type="button"
            onClick={() => toggleExpanded(false)}
            title={isEn ? 'Minimize 3D companion' : 'Kecilkan asisten 3D'}
            aria-label={isEn ? 'Minimize 3D companion' : 'Kecilkan asisten 3D'}
            className="w-6 h-6 rounded-full bg-white/8 hover:bg-white/18 text-slate-300 flex items-center justify-center cursor-pointer transition-colors shrink-0"
          >
            <Minimize2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Full-Body 3D Robot Mascot */}
        <MariaCharacter3D
          state={characterState}
          mood={contextSignal.mood}
          activeView={activeView}
          spyGuardAlert={isAlert}
          size="companion"
          interactive={true}
        />

        {/* Context & Mood Status Caption */}
        <div
          className={`w-full text-center px-1.5 py-1 rounded-xl text-[10px] font-medium leading-tight truncate ${
            isAlert
              ? 'bg-rose-950/80 text-rose-200'
              : isCalm
              ? 'bg-teal-950/70 text-teal-200'
              : 'bg-white/6 text-sky-200'
          }`}
          title={statusLabel}
        >
          {statusLabel}
        </div>
      </div>
    </div>
  );
};
