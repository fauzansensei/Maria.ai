import React, { useEffect, useRef, useState } from 'react';
import type { MariaMood } from '../lib/mariaContextAnalyzer.ts';
import type { SidebarView } from './Sidebar.tsx';

export type MariaCharacterState =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'explaining'
  | 'connecting'
  | 'muted'
  | 'error';

interface MariaCharacter2DProps {
  state?: MariaCharacterState;
  mood?: MariaMood;
  activeView?: SidebarView;
  spyGuardAlert?: boolean;
  energy?: number;
  getLiveEnergy?: () => number;
  size?: 'hero' | 'stage' | 'companion' | 'compact';
  interactive?: boolean;
  onActivate?: () => void;
  className?: string;
}

const TAP_EXPRESSIONS = [
  { cls: 'happy', msg: 'Yeay! Kamu datang! ✦' },
  { cls: 'love', msg: 'Kamu luar biasa! ♥' },
  { cls: 'surprised', msg: 'Wah! Ada yang baru?' },
  { cls: 'curious', msg: 'Hmm... ada yang menarik?' },
  { cls: '', msg: 'Siap! Ada yang bisa Maria bantu?' },
] as const;

export const MariaCharacter2D: React.FC<MariaCharacter2DProps> = ({
  state = 'idle',
  mood = 'neutral',
  activeView = 'chat',
  spyGuardAlert = false,
  energy = 0,
  getLiveEnergy,
  size = 'companion',
  interactive = true,
  onActivate,
  className = '',
}) => {
  const isCompact = size === 'compact';

  const robotRef = useRef<HTMLDivElement | null>(null);
  const mouthRef = useRef<HTMLDivElement | null>(null);
  const eyeTrackRef = useRef<HTMLDivElement | null>(null);

  const [phase, setPhase] = useState<'entering' | 'launch' | 'idle'>(() => {
    if (
      isCompact ||
      (typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
    ) {
      return 'idle';
    }
    return 'entering';
  });
  const [isRocketActive, setIsRocketActive] = useState(false);
  const [isGreeting, setIsGreeting] = useState(false);
  const [isBlinking, setIsBlinking] = useState(false);
  const [tapExpr, setTapExpr] = useState<string>('');
  const [speechBubble, setSpeechBubble] = useState<string>('');
  const tapIndexRef = useRef(0);
  const speechTimerRef = useRef<number | null>(null);
  const tapExprTimerRef = useRef<number | null>(null);

  const stateRef = useRef<MariaCharacterState>(state);
  const moodRef = useRef<MariaMood>(mood);
  const spyAlertRef = useRef<boolean>(spyGuardAlert);
  const tapExprRef = useRef<string>(tapExpr);
  const energyRef = useRef<number>(energy);
  const getLiveEnergyRef = useRef<(() => number) | undefined>(getLiveEnergy);

  stateRef.current = state;
  moodRef.current = mood;
  spyAlertRef.current = spyGuardAlert;
  tapExprRef.current = tapExpr;
  energyRef.current = energy;
  getLiveEnergyRef.current = getLiveEnergy;

  // Rocket landing entrance sequence matching Sparkle reference
  useEffect(() => {
    if (phase === 'idle') return;

    const timers: number[] = [];
    setIsRocketActive(true);

    const raf = requestAnimationFrame(() => {
      setPhase('launch');
    });

    timers.push(
      window.setTimeout(() => {
        setIsRocketActive(false);
      }, 1750)
    );

    timers.push(
      window.setTimeout(() => {
        setPhase('idle');
        setIsGreeting(true);
        setSpeechBubble('Halo! Siap membantu! ✦');
        timers.push(
          window.setTimeout(() => setIsGreeting(false), 1400),
          window.setTimeout(() => setSpeechBubble(''), 2600)
        );
      }, 2250)
    );

    return () => {
      cancelAnimationFrame(raf);
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  // Natural automatic eye blink loop
  useEffect(() => {
    let alive = true;
    let t1 = 0;
    let t2 = 0;

    const scheduleBlink = () => {
      const wait = Math.random() * 3000 + 2200;
      t1 = window.setTimeout(() => {
        if (!alive) return;
        setIsBlinking(true);
        t2 = window.setTimeout(() => {
          if (!alive) return;
          setIsBlinking(false);
          scheduleBlink();
        }, 160);
      }, wait);
    };

    scheduleBlink();
    return () => {
      alive = false;
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  // Real-time 60fps mouth lip-sync driven by speechService.getSpeechAmplitude() / AnalyserNode
  useEffect(() => {
    let rafId = 0;
    let smoothedAmp = 0;
    let lastTime = performance.now();

    const tick = (now: number) => {
      const dt = Math.max(0.001, Math.min((now - lastTime) / 1000, 0.05));
      lastTime = now;

      const curState = stateRef.current;
      const curMood = moodRef.current;
      const isAlert = spyAlertRef.current || curMood === 'alert' || curState === 'error';
      const activeTap = tapExprRef.current;

      const rawAmp = getLiveEnergyRef.current
        ? getLiveEnergyRef.current()
        : energyRef.current;
      const clampedAmp = Math.max(0, Math.min(1, rawAmp));
      const targetAmp = curState === 'speaking' ? clampedAmp : 0;

      const rate = targetAmp > smoothedAmp ? 26 : 16;
      smoothedAmp += (targetAmp - smoothedAmp) * (1 - Math.exp(-rate * dt));

      const mouth = mouthRef.current;
      if (mouth) {
        if (isAlert) {
          mouth.style.width = '30px';
          mouth.style.height = '6px';
          mouth.style.borderRadius = '3px';
        } else if (curState === 'speaking' && smoothedAmp > 0.05) {
          const t = now / 1000;
          const syllableWave = Math.sin(t * 13.5) * 4 * smoothedAmp;
          const w = Math.max(20, Math.min(44, 28 + smoothedAmp * 12 + syllableWave));
          const h = Math.max(10, Math.min(30, 10 + smoothedAmp * 20));
          const isRoundVowel = smoothedAmp < 0.35 && Math.sin(t * 9.2) > 0.25;
          mouth.style.width = `${(isRoundVowel ? w * 0.72 : w).toFixed(1)}px`;
          mouth.style.height = `${h.toFixed(1)}px`;
          mouth.style.borderRadius = isRoundVowel ? '50%' : '5px 5px 24px 24px';
        } else if (activeTap === 'surprised' || curMood === 'idea') {
          mouth.style.width = '18px';
          mouth.style.height = '22px';
          mouth.style.borderRadius = '50%';
        } else if (activeTap === 'love' || curMood === 'celebrating') {
          mouth.style.width = '36px';
          mouth.style.height = '22px';
          mouth.style.borderRadius = '6px 6px 24px 24px';
        } else if (activeTap === 'happy' || curMood === 'explaining' || curMood === 'coding') {
          mouth.style.width = '40px';
          mouth.style.height = '18px';
          mouth.style.borderRadius = '5px 5px 24px 24px';
        } else if (curState === 'thinking' || curState === 'connecting' || activeTap === 'curious') {
          mouth.style.width = '24px';
          mouth.style.height = '8px';
          mouth.style.borderRadius = '8px';
        } else {
          mouth.style.width = '34px';
          mouth.style.height = '13px';
          mouth.style.borderRadius = '4px 4px 20px 20px';
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!interactive || !eyeTrackRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const nx = Math.max(-1, Math.min(1, ((e.clientX - rect.left) / rect.width) * 2 - 1));
    const ny = Math.max(-1, Math.min(1, ((e.clientY - rect.top) / rect.height) * 2 - 1));
    eyeTrackRef.current.style.transform = `translate(${(nx * 9).toFixed(1)}px, ${(ny * 6).toFixed(1)}px)`;
  };

  const handlePointerLeave = () => {
    if (eyeTrackRef.current) {
      eyeTrackRef.current.style.transform = 'translate(0px, 0px)';
    }
  };

  const triggerInteract = () => {
    if (!interactive) return;
    const next = TAP_EXPRESSIONS[tapIndexRef.current];
    tapIndexRef.current = (tapIndexRef.current + 1) % TAP_EXPRESSIONS.length;

    setTapExpr(next.cls);
    setSpeechBubble(next.msg);

    if (tapExprTimerRef.current) window.clearTimeout(tapExprTimerRef.current);
    if (speechTimerRef.current) window.clearTimeout(speechTimerRef.current);

    tapExprTimerRef.current = window.setTimeout(() => setTapExpr(''), 2300);
    speechTimerRef.current = window.setTimeout(() => setSpeechBubble(''), 2800);

    // Quick playful hop when celebrating or tapped
    if (robotRef.current && phase === 'idle') {
      robotRef.current.animate?.(
        [
          { transform: 'translateY(0) rotate(0deg)' },
          { transform: 'translateY(-18px) rotate(-6deg)' },
          { transform: 'translateY(-6px) rotate(6deg)' },
          { transform: 'translateY(0) rotate(0deg)' },
        ],
        { duration: 680, easing: 'ease-in-out' }
      );
    }

    onActivate?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (interactive && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      triggerInteract();
    }
  };

  const isAlert = spyGuardAlert || mood === 'alert' || state === 'error';
  const isCalm = !isAlert && mood === 'calm';
  const isWorkspacePoint =
    !isAlert && (activeView === 'notebooks' || activeView === 'projects');
  const isCodingWrench =
    !isAlert && !isWorkspacePoint && mood === 'coding' && state !== 'thinking' && state !== 'connecting';
  const isThinking = state === 'thinking' || state === 'connecting';

  // Resolve active expression class from tap override OR Maria live context
  let exprClass = tapExpr;
  if (!exprClass) {
    if (isAlert) exprClass = 'alert';
    else if (isCalm) exprClass = 'calm';
    else if (mood === 'celebrating') exprClass = 'love';
    else if (mood === 'idea') exprClass = 'surprised';
    else if (isThinking) exprClass = 'curious';
    else if (state === 'speaking' || state === 'explaining' || mood === 'explaining' || mood === 'coding') {
      exprClass = 'happy';
    }
  }

  const robotClasses = [
    'sparkle-robot',
    phase,
    isRocketActive || mood === 'celebrating' ? 'rocket-active' : '',
    isGreeting ? 'greeting' : '',
    isBlinking ? 'blink' : '',
    state === 'speaking' || state === 'explaining' ? 'speaking' : '',
    isCodingWrench ? 'coding' : '',
    isWorkspacePoint ? 'workspace-point' : '',
    exprClass,
  ]
    .filter(Boolean)
    .join(' ');

  const stageModeClass = isAlert ? 'mode-alert' : isCalm ? 'mode-calm' : '';

  if (isCompact) {
    return (
      <div
        className={`sparkle-robot-stage ${stageModeClass} w-10 h-10 overflow-hidden ${className}`}
      >
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className="scale-[0.135] origin-center">
            <div className="sparkle-head">
              <div className="sparkle-head-side left" />
              <div className="sparkle-head-side right" />
              <div className="sparkle-face">
                <div className="sparkle-eye-track">
                  <div className="sparkle-eye left" />
                  <div className="sparkle-eye right" />
                </div>
                <div ref={mouthRef} className="sparkle-mouth" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const outerSizeClass =
    size === 'stage'
      ? 'w-[210px] h-[230px] sm:w-[236px] sm:h-[260px]'
      : 'w-[140px] h-[166px] sm:w-[162px] sm:h-[192px] md:w-[174px] md:h-[204px]';

  const scaleClass =
    size === 'stage'
      ? 'scale-[0.45] sm:scale-[0.51]'
      : 'scale-[0.33] sm:scale-[0.38] md:scale-[0.40]';

  return (
    <div
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onClick={triggerInteract}
      onKeyDown={handleKeyDown}
      role={interactive ? 'button' : 'img'}
      tabIndex={interactive ? 0 : undefined}
      aria-label="Maria Sparkle 2D Companion"
      className={`sparkle-robot-stage ${stageModeClass} ${outerSizeClass} select-none overflow-hidden ${
        interactive ? 'cursor-pointer' : ''
      } ${className}`}
    >
      {/* Crisp unscaled speech bubble */}
      <div className={`sparkle-speech ${speechBubble ? 'show' : ''}`}>
        {speechBubble}
      </div>

      {/* Exact geometric center wrapper independent of child layout box */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div
          className={`relative flex items-center justify-center origin-center ${scaleClass}`}
          style={{ width: '340px', height: '484px' }}
        >
          {/* Ambient Orbits & Twinkling Stars */}
          <div className="sparkle-orbit" />
          <div className="sparkle-orbit two" />
          <div className="sparkle-star one">✦</div>
          <div className="sparkle-star two">✧</div>
          <div className="sparkle-star three">✦</div>
          <div className="sparkle-shadow" />

          {/* Robot Body Rig */}
          <div ref={robotRef} className={robotClasses}>
            {/* Antenna */}
            <div className="sparkle-antenna" />

          {/* Head */}
          <div className="sparkle-head">
            <div className="sparkle-head-side left" />
            <div className="sparkle-head-side right" />
            <div className="sparkle-face">
              <div ref={eyeTrackRef} className="sparkle-eye-track">
                <div className="sparkle-eye left" />
                <div className="sparkle-eye right" />
              </div>
              <div ref={mouthRef} className="sparkle-mouth" />
            </div>
          </div>

          {/* Neck */}
          <div className="sparkle-neck" />

          {/* Body */}
          <div className="sparkle-body">
            <div className="sparkle-chest-plate" />
            <span className="sparkle-chest-label">MARIA</span>
            <div className="sparkle-chest-light" />

            <div className="sparkle-shoulder left" />
            <div className="sparkle-shoulder right" />

            {/* Left Arm */}
            <div className="sparkle-arm left">
              <div className="sparkle-elbow left" />
              <div className="sparkle-hand">
                <div className="sparkle-finger one" />
                <div className="sparkle-finger two" />
                <div className="sparkle-finger three" />
              </div>
            </div>

            {/* Right Arm + Dynamic Props */}
            <div className="sparkle-arm right">
              <div className="sparkle-elbow right" />
              <div className="sparkle-hand">
                <div className="sparkle-finger one" />
                <div className="sparkle-finger two" />
                <div className="sparkle-finger three" />

                {isCodingWrench && (
                  <svg className="sparkle-wrench" viewBox="0 0 28 60" fill="none">
                    <rect x="10" y="20" width="8" height="36" rx="4" fill="var(--sparkle-cyan)" />
                    <path
                      d="M4 16 A11 11 0 1 1 24 16 L18 22 L10 22 Z"
                      fill="var(--sparkle-cyan)"
                    />
                    <circle cx="14" cy="12" r="4" fill="#071426" />
                  </svg>
                )}

                {isWorkspacePoint && (
                  <div className="sparkle-tablet">
                    <span style={{ width: '90%' }} />
                    <span style={{ width: '65%' }} />
                    <span style={{ width: '80%' }} />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Waist */}
          <div className="sparkle-waist" />

          {/* Legs & Jet Boots */}
          <div className="sparkle-legs">
            <div className="sparkle-leg">
              <div className="sparkle-knee" />
              <div className="sparkle-foot">
                <div className="sparkle-jet">
                  <div className="sparkle-jet-glow" />
                  <div className="sparkle-jet-flame" />
                </div>
              </div>
            </div>

            <div className="sparkle-leg">
              <div className="sparkle-knee" />
              <div className="sparkle-foot">
                <div className="sparkle-jet">
                  <div className="sparkle-jet-glow" />
                  <div className="sparkle-jet-flame" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};
