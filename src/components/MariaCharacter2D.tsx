import React, { useEffect, useId, useRef } from 'react';
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

type FaceExpression =
  | 'normal'
  | 'happy'
  | 'wink'
  | 'celebrate'
  | 'thinking'
  | 'calm'
  | 'muted'
  | 'alert';

function damp(current: number, target: number, lambda: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export const MariaCharacter2D: React.FC<MariaCharacter2DProps> = ({
  state = 'idle',
  mood = 'neutral',
  activeView = 'chat',
  spyGuardAlert = false,
  energy = 0,
  getLiveEnergy,
  size = 'hero',
  interactive = true,
  onActivate,
  className = '',
}) => {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');

  const svgRef = useRef<SVGSVGElement | null>(null);
  const rootBobRef = useRef<SVGGElement | null>(null);
  const shadowRef = useRef<SVGEllipseElement | null>(null);
  const bodyGroupRef = useRef<SVGGElement | null>(null);
  const headGroupRef = useRef<SVGGElement | null>(null);
  const antennaRef = useRef<SVGGElement | null>(null);
  const starRef = useRef<SVGGElement | null>(null);
  const leftArmRef = useRef<SVGGElement | null>(null);
  const rightArmRef = useRef<SVGGElement | null>(null);
  const leftLegRef = useRef<SVGGElement | null>(null);
  const rightLegRef = useRef<SVGGElement | null>(null);
  const gazeGroupRef = useRef<SVGGElement | null>(null);
  const leftEyeRef = useRef<SVGGElement | null>(null);
  const rightEyeRef = useRef<SVGGElement | null>(null);
  const blushRef = useRef<SVGGElement | null>(null);
  const mouthLineRef = useRef<SVGPathElement | null>(null);
  const mouthOpenRef = useRef<SVGPathElement | null>(null);
  const mouthShineRef = useRef<SVGPathElement | null>(null);
  const wrenchRef = useRef<SVGGElement | null>(null);
  const tabletRef = useRef<SVGGElement | null>(null);
  const sparklesRef = useRef<SVGGElement | null>(null);
  const radarRingRef = useRef<SVGCircleElement | null>(null);

  const stateRef = useRef<MariaCharacterState>(state);
  const moodRef = useRef<MariaMood>(mood);
  const activeViewRef = useRef<SidebarView>(activeView);
  const spyGuardAlertRef = useRef<boolean>(spyGuardAlert);
  const energyRef = useRef<number>(energy);
  const getLiveEnergyRef = useRef<(() => number) | undefined>(getLiveEnergy);
  const interactiveRef = useRef<boolean>(interactive);

  const pointerTargetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const pokeBoostRef = useRef<number>(0);

  stateRef.current = state;
  moodRef.current = mood;
  activeViewRef.current = activeView;
  spyGuardAlertRef.current = spyGuardAlert;
  energyRef.current = energy;
  getLiveEnergyRef.current = getLiveEnergy;
  interactiveRef.current = interactive;

  const containerSizeClass =
    size === 'compact'
      ? 'w-11 h-11'
      : size === 'companion'
      ? 'w-36 h-40 sm:w-40 sm:h-44'
      : size === 'stage'
      ? 'w-48 h-52 sm:w-56 sm:h-60'
      : 'w-36 h-40 sm:w-44 sm:h-48';

  const isCompact = size === 'compact';

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const motionFactor = prefersReducedMotion ? 0.35 : 1.0;

    let rafId = 0;
    let lastTime = performance.now();
    let elapsed = 0;

    let curBobY = 0;
    let curBodyX = 0;
    let curBodyTilt = 0;
    let curHeadX = 0;
    let curHeadY = 0;
    let curHeadRot = 0;
    let curLArmRot = 8;
    let curRArmRot = -8;
    let curLLegRot = 0;
    let curRLegRot = 0;
    let curLLegY = 0;
    let curRLegY = 0;
    let curGazeX = 0;
    let curGazeY = 0;
    let curWrenchScale = 0;
    let curTabletScale = 0;
    let curSparkleScale = 0;
    let curAntennaRot = 0;
    let curStarScale = 1;
    let smoothedEnergy = 0;
    let mouthSmileFactor = 0.7;
    let blinkTimer = 2.4;
    let blinkVal = 0;
    let doubleBlinkPending = false;
    let lastEyeKey = '';

    const setEyeVariant = (
      eyeGroup: SVGGElement | null,
      variant:
        | 'round'
        | 'happy'
        | 'chevron-r'
        | 'chevron-l'
        | 'calm'
        | 'muted'
        | 'alert-l'
        | 'alert-r'
        | 'squint',
      blinkScaleY: number
    ) => {
      if (!eyeGroup) return;
      const nodes = eyeGroup.querySelectorAll<SVGElement>('[data-eye]');
      nodes.forEach((n) => {
        n.style.display = n.dataset.eye === variant ? 'inline' : 'none';
      });
      if (variant === 'round' || variant === 'squint') {
        const cx = Number(eyeGroup.dataset.cx || 90);
        const cy = Number(eyeGroup.dataset.cy || 86);
        const sy = Math.max(0.1, blinkScaleY);
        eyeGroup.setAttribute(
          'transform',
          `translate(${cx} ${cy}) scale(1 ${sy.toFixed(3)}) translate(${-cx} ${-cy})`
        );
      } else {
        eyeGroup.removeAttribute('transform');
      }
    };

    const updateMorphingMouth = (
      expr: FaceExpression,
      openness: number,
      smileAmt: number,
      t: number
    ) => {
      const lineEl = mouthLineRef.current;
      const openEl = mouthOpenRef.current;
      const shineEl = mouthShineRef.current;
      if (!lineEl || !openEl || !shineEl) return;

      if (expr === 'alert') {
        lineEl.style.display = 'inline';
        openEl.style.display = 'none';
        shineEl.style.display = 'none';
        lineEl.setAttribute('d', 'M 98 110 L 104 105 L 110 110 L 116 105 L 122 110');
        return;
      }

      // Smoothly morph between closed expressive smile and open LED talking mouth
      const effectiveOpen =
        expr === 'celebrate' ? Math.max(0.75, openness) : openness;

      if (effectiveOpen < 0.08) {
        lineEl.style.display = 'inline';
        openEl.style.display = 'none';
        shineEl.style.display = 'none';

        const mx = 110;
        const my = 107;
        const halfW = expr === 'muted' ? 8 : lerp(8, 12.5, Math.max(0, smileAmt));
        const curveDrop =
          expr === 'muted'
            ? 0.5
            : expr === 'thinking'
            ? -1.5
            : lerp(1.5, 7.5, Math.max(0, smileAmt));

        lineEl.setAttribute(
          'd',
          `M ${(mx - halfW).toFixed(2)} ${my} Q ${mx} ${(my + curveDrop).toFixed(2)} ${(mx + halfW).toFixed(2)} ${my}`
        );
      } else {
        lineEl.style.display = 'none';
        openEl.style.display = 'inline';
        shineEl.style.display = effectiveOpen > 0.22 ? 'inline' : 'none';

        // Natural syllable width modulation (slightly narrower on "o/u" vowels, wider on "a/e")
        const vowelMod = Math.sin(t * 11.3) * 1.8 * effectiveOpen;
        const mw = Math.max(9.5, 11.5 + effectiveOpen * 3.5 + vowelMod);
        const topY = 103.5 - effectiveOpen * 1.2;
        const jawDrop = 4.5 + effectiveOpen * 11.5;
        const bottomY = topY + jawDrop;

        openEl.setAttribute(
          'd',
          `M ${(110 - mw).toFixed(2)} ${topY.toFixed(2)} Q 110 ${(topY + 1.8).toFixed(2)} ${(110 + mw).toFixed(2)} ${topY.toFixed(2)} Q ${(110 + mw).toFixed(2)} ${bottomY.toFixed(2)} 110 ${bottomY.toFixed(2)} Q ${(110 - mw).toFixed(2)} ${bottomY.toFixed(2)} ${(110 - mw).toFixed(2)} ${topY.toFixed(2)} Z`
        );

        if (effectiveOpen > 0.22) {
          const sw = mw * 0.52;
          const sy = bottomY - 2.2;
          shineEl.setAttribute(
            'd',
            `M ${(110 - sw).toFixed(2)} ${sy.toFixed(2)} Q 110 ${(sy - 2.4 * effectiveOpen).toFixed(2)} ${(110 + sw).toFixed(2)} ${sy.toFixed(2)}`
          );
        }
      }
    };

    const tick = (now: number) => {
      const rawDt = Math.max(0, Math.min((now - lastTime) / 1000, 0.05));
      lastTime = now;
      const dt = rawDt * motionFactor;
      elapsed += dt;
      const t = elapsed;

      const curState = stateRef.current;
      const curMood = moodRef.current;
      const curView = activeViewRef.current;
      const isAlert =
        spyGuardAlertRef.current || curMood === 'alert' || curState === 'error';

      // Sample real-time audio energy (from AnalyserNode getter or prop)
      const sampledAudio = getLiveEnergyRef.current
        ? getLiveEnergyRef.current()
        : energyRef.current;
      const clampedAudio = Math.max(0, Math.min(1, sampledAudio));

      // Only open mouth to lip-sync when Maria is actually speaking audio!
      const targetSpeechEnergy = curState === 'speaking' ? clampedAudio : 0;
      const smoothRate = targetSpeechEnergy > smoothedEnergy ? 24 : 14;
      smoothedEnergy = damp(smoothedEnergy, targetSpeechEnergy, smoothRate, rawDt || 0.016);

      pokeBoostRef.current = damp(pokeBoostRef.current, 0, 5.2, rawDt || 0.016);
      const poke = pokeBoostRef.current;

      // Natural Blink Scheduler (occasional double-blink!)
      blinkTimer -= rawDt;
      if (blinkTimer <= 0) {
        blinkVal = 1.0;
        if (!doubleBlinkPending && Math.random() < 0.22) {
          doubleBlinkPending = true;
          blinkTimer = 0.22;
        } else {
          doubleBlinkPending = false;
          blinkTimer = 2.6 + Math.random() * 2.8;
        }
      }
      blinkVal = damp(blinkVal, 0, 18, rawDt || 0.016);

      // Theme palette variables (never turn ugly dull grey when mic is muted — keep bright Sparkle cyan!)
      let accent = '#22d3ee';
      let accentBright = '#a5f3fc';
      let visorTint = 'rgba(34, 211, 238, 0.14)';

      if (isAlert) {
        accent = '#fb7185';
        accentBright = '#fecdd3';
        visorTint = 'rgba(244, 63, 94, 0.22)';
      } else if (curMood === 'calm') {
        accent = '#2dd4bf';
        accentBright = '#99f6e4';
        visorTint = 'rgba(45, 212, 191, 0.16)';
      }

      if (svgRef.current) {
        svgRef.current.style.setProperty('--maria-accent', accent);
        svgRef.current.style.setProperty('--maria-accent-bright', accentBright);
        svgRef.current.style.setProperty('--maria-visor-tint', visorTint);
      }

      // Choreography Targets
      const isNotebookOrProject = curView === 'notebooks' || curView === 'projects';
      const isThinking = curState === 'thinking' || curState === 'connecting';
      const isExplaining = curState === 'speaking' || curState === 'explaining';

      const lookX = interactiveRef.current ? pointerTargetRef.current.x : 0;
      const lookY = interactiveRef.current ? pointerTargetRef.current.y : 0;

      let floatSpeed = 2.0;
      let floatAmp = 3.6;
      let baseBobY = 0;

      if (curMood === 'celebrating') {
        floatSpeed = 5.2;
        floatAmp = 8.0;
        baseBobY = -5;
      } else if (isAlert) {
        floatSpeed = 4.4;
        floatAmp = 2.6;
      } else if (curMood === 'calm') {
        floatSpeed = 1.25;
        floatAmp = 2.5;
      } else if (curState === 'speaking') {
        floatSpeed = 3.0;
        floatAmp = 2.6 + smoothedEnergy * 3.0;
      }

      const targetBobY = baseBobY + Math.sin(t * floatSpeed) * floatAmp - poke * 12;
      curBobY = damp(curBobY, targetBobY, 10, rawDt || 0.016);

      let targetBodyX = lookX * 2.5;
      let targetBodyTilt = lookX * 2.0;
      let targetHeadX = lookX * 3.0;
      let targetHeadY = lookY * 2.0;
      let targetHeadRot = lookX * 3.5;

      let targetLArmRot = 10 + Math.sin(t * 2.0) * 3.5;
      let targetRArmRot = -10 - Math.sin(t * 2.0) * 3.5;
      let targetLLegRot = Math.sin(t * 2.0) * 2.5;
      let targetRLegRot = -Math.sin(t * 2.0) * 2.5;
      let targetLLegY = 0;
      let targetRLegY = 0;

      let targetWrenchScale = 0;
      let targetTabletScale = 0;
      let targetSparkleScale = 0;
      let targetGazeX = lookX * 5.5;
      let targetGazeY = lookY * 3.5;
      let targetSmileAmt = 0.75;

      if (isAlert) {
        // Spy Guard Red Alert Defensive Scan Pose
        const scan = Math.sin(t * 4.0);
        targetHeadRot += scan * 5.5;
        targetGazeX += scan * 4.5;
        targetLArmRot = 48 + Math.sin(t * 6.5) * 4;
        targetRArmRot = -48 - Math.sin(t * 6.5) * 4;
        targetLLegRot = 9;
        targetRLegRot = -9;
        targetSmileAmt = 0;
      } else if (isNotebookOrProject) {
        // Turn toward left Notebook/Projects sidebar + point left arm + hold holographic tablet
        targetBodyX = -4;
        targetBodyTilt = -4;
        targetHeadX = -3.5 + lookX * 2;
        targetHeadRot = -5;
        targetGazeX = -4.5 + lookX * 2.5;
        targetLArmRot = 95 + Math.sin(t * 3.0) * 5;
        targetRArmRot = -42 + Math.sin(t * 2.2) * 3;
        targetTabletScale = 1;
        targetSmileAmt = 0.85;
      } else if (curMood === 'celebrating') {
        // Pose 4: SUKA MERAYAKAN! Arms raised high + joyful kick + sparkles
        targetHeadRot += Math.sin(t * 4.6) * 5;
        targetHeadY -= 2;
        targetLArmRot = 134 + Math.sin(t * 6.0) * 8;
        targetRArmRot = -134 - Math.sin(t * 6.0) * 8;
        targetLLegRot = 16 + Math.sin(t * 5.2) * 12;
        targetRLegRot = -12 - Math.sin(t * 5.2) * 12;
        targetLLegY = -3;
        targetSparkleScale = 1;
        targetSmileAmt = 1.0;
      } else if (curMood === 'coding') {
        if (isThinking) {
          targetHeadRot += 7;
          targetHeadY -= 1;
          targetGazeX += 3;
          targetGazeY -= 2.5;
          targetRArmRot = -114 + Math.sin(t * 2.0) * 3;
          targetLArmRot = 14;
          targetSmileAmt = 0.25;
        } else {
          // Pose 3: SIAP MEMBANTU! Holding glowing cyan wrench
          targetHeadRot -= 3.5;
          targetRArmRot = -62 + Math.sin(t * 2.8) * 5;
          targetLArmRot = 14;
          targetWrenchScale = 1;
          targetSmileAmt = 0.9;
        }
      } else if (curMood === 'idea') {
        // Pose 2: IDE CERDAS! Winking + raised hand + sparkle
        targetHeadRot -= 5.5;
        targetRArmRot = -102 + Math.sin(t * 3.2) * 4;
        targetLArmRot = 12;
        targetSparkleScale = 0.85;
        targetSmileAmt = 0.95;
      } else if (curMood === 'calm') {
        targetHeadRot += 3.5;
        targetHeadY += 1.5;
        targetLArmRot = 16 + Math.sin(t * 1.3) * 2;
        targetRArmRot = -16 - Math.sin(t * 1.3) * 2;
        targetSmileAmt = 0.65;
      } else if (isExplaining) {
        // Natural head nod & expressive gestures synced with speech energy (or calm rhythm while writing)
        const gestureEnergy = curState === 'speaking' ? smoothedEnergy : 0.25;
        const wave = Math.sin(t * 4.6);
        targetHeadRot += Math.sin(t * 2.4) * 3.5;
        targetHeadY +=
          curState === 'speaking'
            ? smoothedEnergy * 3.2 * Math.sin(t * 7.2)
            : Math.sin(t * 3.2) * 1.2;
        targetLArmRot = 30 + wave * (10 + gestureEnergy * 20);
        targetRArmRot = -30 - wave * (10 + gestureEnergy * 20);
        targetSmileAmt = 0.85;
      } else if (isThinking) {
        targetGazeX += Math.sin(t * 1.6) * 4.5;
        targetGazeY -= 2;
        targetHeadRot += 6.5;
        targetRArmRot = -110 + Math.sin(t * 2.0) * 3;
        targetLArmRot = 12;
        targetSmileAmt = 0.2;
      } else if (curState === 'listening') {
        targetHeadRot += 6;
        targetLArmRot = 20;
        targetRArmRot = -20;
        targetSmileAmt = 0.7;
      } else if (curState === 'muted') {
        targetHeadRot += 3;
        targetLArmRot = 10;
        targetRArmRot = -10;
        targetSmileAmt = 0.4;
      }

      if (poke > 0.04) {
        targetRArmRot = lerp(targetRArmRot, -130 + Math.sin(t * 16) * 18, poke);
        targetHeadRot = lerp(targetHeadRot, -7, poke);
        targetSmileAmt = 1.0;
      }

      const ddt = rawDt || 0.016;
      curBodyX = damp(curBodyX, targetBodyX, 8, ddt);
      curBodyTilt = damp(curBodyTilt, targetBodyTilt, 8, ddt);
      curHeadX = damp(curHeadX, targetHeadX, 9, ddt);
      curHeadY = damp(curHeadY, targetHeadY, 9, ddt);
      curHeadRot = damp(curHeadRot, targetHeadRot, 9, ddt);
      curLArmRot = damp(curLArmRot, targetLArmRot, 10, ddt);
      curRArmRot = damp(curRArmRot, targetRArmRot, 10, ddt);
      curLLegRot = damp(curLLegRot, targetLLegRot, 10, ddt);
      curRLegRot = damp(curRLegRot, targetRLegRot, 10, ddt);
      curLLegY = damp(curLLegY, targetLLegY, 10, ddt);
      curRLegY = damp(curRLegY, targetRLegY, 10, ddt);
      curGazeX = damp(curGazeX, targetGazeX, 12, ddt);
      curGazeY = damp(curGazeY, targetGazeY, 12, ddt);
      curWrenchScale = damp(curWrenchScale, targetWrenchScale, 11, ddt);
      curTabletScale = damp(curTabletScale, targetTabletScale, 11, ddt);
      curSparkleScale = damp(curSparkleScale, targetSparkleScale, 11, ddt);
      curAntennaRot = damp(curAntennaRot, Math.sin(t * 3.0) * 5 - curHeadRot * 0.35, 10, ddt);
      curStarScale = damp(curStarScale, 1 + smoothedEnergy * 0.16 + poke * 0.18, 12, ddt);
      mouthSmileFactor = damp(mouthSmileFactor, targetSmileAmt, 8, ddt);

      // Apply SVG rig transforms
      if (rootBobRef.current) {
        rootBobRef.current.setAttribute('transform', `translate(0 ${curBobY.toFixed(2)})`);
      }
      if (shadowRef.current) {
        const sScale = Math.max(0.7, Math.min(1.12, 1 + curBobY * 0.015));
        shadowRef.current.setAttribute('rx', (40 * sScale).toFixed(2));
        shadowRef.current.setAttribute('ry', (8 * sScale).toFixed(2));
      }
      if (bodyGroupRef.current) {
        bodyGroupRef.current.setAttribute(
          'transform',
          `translate(${(110 + curBodyX).toFixed(2)} 155) rotate(${curBodyTilt.toFixed(2)}) translate(-110 -155)`
        );
      }
      if (headGroupRef.current) {
        headGroupRef.current.setAttribute(
          'transform',
          `translate(${(110 + curHeadX).toFixed(2)} ${(132 + curHeadY).toFixed(2)}) rotate(${curHeadRot.toFixed(2)}) translate(-110 -132)`
        );
      }
      if (antennaRef.current) {
        antennaRef.current.setAttribute(
          'transform',
          `translate(110 43) rotate(${curAntennaRot.toFixed(2)}) translate(-110 -43)`
        );
      }
      if (starRef.current) {
        const starPulse = curStarScale + Math.sin(t * 4.2) * 0.06;
        const starTilt = Math.sin(t * 2.5) * 8 + poke * 36;
        starRef.current.setAttribute(
          'transform',
          `translate(115 17) rotate(${starTilt.toFixed(2)}) scale(${starPulse.toFixed(3)}) translate(-115 -17)`
        );
      }
      if (leftArmRef.current) {
        leftArmRef.current.setAttribute(
          'transform',
          `translate(74 146) rotate(${curLArmRot.toFixed(2)}) translate(-74 -146)`
        );
      }
      if (rightArmRef.current) {
        rightArmRef.current.setAttribute(
          'transform',
          `translate(146 146) rotate(${curRArmRot.toFixed(2)}) translate(-146 -146)`
        );
      }
      if (leftLegRef.current) {
        leftLegRef.current.setAttribute(
          'transform',
          `translate(94 ${(180 + curLLegY).toFixed(2)}) rotate(${curLLegRot.toFixed(2)}) translate(-94 -180)`
        );
      }
      if (rightLegRef.current) {
        rightLegRef.current.setAttribute(
          'transform',
          `translate(126 ${(180 + curRLegY).toFixed(2)}) rotate(${curRLegRot.toFixed(2)}) translate(-126 -180)`
        );
      }
      if (gazeGroupRef.current) {
        gazeGroupRef.current.setAttribute(
          'transform',
          `translate(${curGazeX.toFixed(2)} ${curGazeY.toFixed(2)})`
        );
      }

      if (wrenchRef.current) {
        wrenchRef.current.style.display = curWrenchScale > 0.03 ? 'inline' : 'none';
        if (curWrenchScale > 0.03) {
          wrenchRef.current.setAttribute(
            'transform',
            `translate(152 175) scale(${curWrenchScale.toFixed(3)}) translate(-152 -175)`
          );
        }
      }
      if (tabletRef.current) {
        tabletRef.current.style.display = curTabletScale > 0.03 ? 'inline' : 'none';
        if (curTabletScale > 0.03) {
          tabletRef.current.setAttribute(
            'transform',
            `translate(154 156) scale(${curTabletScale.toFixed(3)}) translate(-154 -156)`
          );
        }
      }
      if (sparklesRef.current) {
        sparklesRef.current.style.display = curSparkleScale > 0.03 ? 'inline' : 'none';
        if (curSparkleScale > 0.03) {
          const spFloat = Math.sin(t * 4.0) * 3;
          sparklesRef.current.setAttribute(
            'transform',
            `translate(110 ${(55 + spFloat).toFixed(2)}) scale(${curSparkleScale.toFixed(3)}) translate(-110 -55)`
          );
        }
      }

      // Spy Guard Red Alert Radar Ring ONLY on alert
      if (radarRingRef.current) {
        if (isAlert) {
          const cycle = (t * 1.35) % 1;
          const ringScale = 0.9 + cycle * 0.24;
          const ringOpacity = Math.max(0.08, 0.72 * (1 - cycle));
          radarRingRef.current.style.display = 'inline';
          radarRingRef.current.setAttribute(
            'transform',
            `translate(110 124) scale(${ringScale.toFixed(3)}) translate(-110 -124)`
          );
          radarRingRef.current.setAttribute('opacity', ringOpacity.toFixed(3));
        } else {
          radarRingRef.current.style.display = 'none';
        }
      }

      // Facial Expression Resolution
      let expr: FaceExpression = 'normal';
      if (isAlert) expr = 'alert';
      else if (curMood === 'celebrating') expr = 'celebrate';
      else if (curMood === 'idea') expr = 'wink';
      else if (curMood === 'calm') expr = 'calm';
      else if (isThinking) expr = 'thinking';
      else if (curState === 'muted') expr = 'muted';
      else if (
        curMood === 'coding' ||
        curMood === 'explaining' ||
        curState === 'speaking' ||
        curState === 'explaining'
      ) {
        expr = 'happy';
      }

      // Soft cheek glow on warm/happy expressions
      if (blushRef.current) {
        const showBlush =
          expr === 'happy' || expr === 'celebrate' || expr === 'wink' || expr === 'calm';
        blushRef.current.setAttribute('opacity', showBlush ? '0.28' : '0');
      }

      // Update Eyes on expression or blink changes
      const blinkStep = Math.round(blinkVal * 12);
      const eyeKey = `${expr}:${blinkStep}`;
      if (eyeKey !== lastEyeKey) {
        lastEyeKey = eyeKey;
        const blinkScale = 1 - blinkVal * 0.88;
        if (expr === 'celebrate') {
          setEyeVariant(leftEyeRef.current, 'chevron-r', 1);
          setEyeVariant(rightEyeRef.current, 'chevron-l', 1);
        } else if (expr === 'wink') {
          setEyeVariant(leftEyeRef.current, 'round', blinkScale);
          setEyeVariant(rightEyeRef.current, 'chevron-l', 1);
        } else if (expr === 'happy') {
          setEyeVariant(leftEyeRef.current, 'happy', 1);
          setEyeVariant(rightEyeRef.current, 'happy', 1);
        } else if (expr === 'calm') {
          setEyeVariant(leftEyeRef.current, 'calm', 1);
          setEyeVariant(rightEyeRef.current, 'calm', 1);
        } else if (expr === 'thinking') {
          setEyeVariant(leftEyeRef.current, 'squint', blinkScale);
          setEyeVariant(rightEyeRef.current, 'round', blinkScale);
        } else if (expr === 'muted') {
          setEyeVariant(leftEyeRef.current, 'calm', 1);
          setEyeVariant(rightEyeRef.current, 'calm', 1);
        } else if (expr === 'alert') {
          setEyeVariant(leftEyeRef.current, 'alert-l', 1);
          setEyeVariant(rightEyeRef.current, 'alert-r', 1);
        } else {
          setEyeVariant(leftEyeRef.current, 'round', blinkScale);
          setEyeVariant(rightEyeRef.current, 'round', blinkScale);
        }
      }

      // Update smooth morphing mouth EVERY frame for silky real-time lip-sync
      updateMorphingMouth(expr, smoothedEnergy, mouthSmileFactor, t);

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!interactive) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    pointerTargetRef.current = {
      x: Math.max(-1, Math.min(1, nx)),
      y: Math.max(-1, Math.min(1, ny)),
    };
  };

  const handlePointerLeave = () => {
    pointerTargetRef.current = { x: 0, y: 0 };
  };

  const handleTap = () => {
    pokeBoostRef.current = 1.0;
    onActivate?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (interactive && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      handleTap();
    }
  };

  return (
    <div
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onClick={handleTap}
      onKeyDown={handleKeyDown}
      role={onActivate || interactive ? 'button' : 'img'}
      tabIndex={interactive ? 0 : undefined}
      aria-label="Maria Mascot 2D"
      className={`relative select-none flex items-center justify-center ${
        interactive ? 'cursor-pointer' : ''
      } ${containerSizeClass} ${className}`}
    >
      <svg
        ref={svgRef}
        viewBox={isCompact ? '26 4 168 144' : '6 0 208 238'}
        className="w-full h-full overflow-visible"
        style={
          {
            '--maria-accent': '#22d3ee',
            '--maria-accent-bright': '#a5f3fc',
            '--maria-visor-tint': 'rgba(34, 211, 238, 0.14)',
          } as React.CSSProperties
        }
      >
        <defs>
          {/* Smooth Glossy Pearl-White Armor Gradient */}
          <linearGradient id={`armor-white-${uid}`} x1="18%" y1="4%" x2="82%" y2="96%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="65%" stopColor="#edf3fa" />
            <stop offset="100%" stopColor="#c9d7e8" />
          </linearGradient>

          {/* Deep Navy Suit Gradient */}
          <linearGradient id={`navy-suit-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e3162" />
            <stop offset="100%" stopColor="#0b1430" />
          </linearGradient>

          {/* Dark OLED Visor Screen Gradient */}
          <linearGradient id={`visor-bg-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#071128" />
            <stop offset="50%" stopColor="#030814" />
            <stop offset="100%" stopColor="#061228" />
          </linearGradient>

          {/* Soft Ground Contact Shadow */}
          <radialGradient id={`floor-shadow-${uid}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#020617" stopOpacity="0.65" />
            <stop offset="65%" stopColor="#020617" stopOpacity="0.24" />
            <stop offset="100%" stopColor="#020617" stopOpacity="0" />
          </radialGradient>

          {/* LED Bloom Filter */}
          <filter id={`led-glow-${uid}`} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Spy Guard Alert Perimeter Radar (Only active during Red Alert) */}
        {!isCompact && (
          <circle
            ref={radarRingRef}
            cx="110"
            cy="124"
            r="88"
            fill="none"
            stroke="var(--maria-accent)"
            strokeWidth="2.4"
            strokeDasharray="12 8"
            style={{ display: 'none' }}
          />
        )}

        {/* Ground Contact Shadow */}
        {!isCompact && (
          <ellipse
            ref={shadowRef}
            cx="110"
            cy="226"
            rx="40"
            ry="8"
            fill={`url(#floor-shadow-${uid})`}
          />
        )}

        {/* Root Floating Character Assembly */}
        <g ref={rootBobRef}>
          {/* Celebration / Idea Floating 4-Point Sparkles */}
          {!isCompact && (
            <g ref={sparklesRef} style={{ display: 'none' }} filter={`url(#led-glow-${uid})`}>
              <path
                d="M36 48 Q36 56 44 56 Q36 56 36 64 Q36 56 28 56 Q36 56 36 48 Z"
                fill="var(--maria-accent-bright)"
              />
              <path
                d="M184 46 Q184 54 192 54 Q184 54 184 62 Q184 54 176 54 Q184 54 184 46 Z"
                fill="var(--maria-accent-bright)"
              />
              <path
                d="M54 24 Q54 30 60 30 Q54 30 54 36 Q54 30 48 30 Q54 30 54 24 Z"
                fill="var(--maria-accent)"
              />
              <path
                d="M166 22 Q166 29 173 29 Q166 29 166 36 Q166 29 159 29 Q166 29 166 22 Z"
                fill="var(--maria-accent)"
              />
            </g>
          )}

          {/* FULL BODY & HEAD ASSEMBLY */}
          <g ref={bodyGroupRef}>
            {!isCompact && (
              <>
                {/* LEFT LEG & HOVER BOOT */}
                <g ref={leftLegRef}>
                  {/* Navy Upper Thigh */}
                  <rect
                    x="85"
                    y="176"
                    width="18"
                    height="18"
                    rx="7"
                    fill={`url(#navy-suit-${uid})`}
                  />
                  {/* Pearl White Knee/Shin Armor */}
                  <rect
                    x="80"
                    y="188"
                    width="26"
                    height="21"
                    rx="10"
                    fill={`url(#armor-white-${uid})`}
                    stroke="#0f172a"
                    strokeWidth="1.4"
                  />
                  {/* Navy Knee Accent */}
                  <rect x="87" y="191" width="12" height="5" rx="2.5" fill="#1e3162" />
                  {/* Chunky Rounded Boot */}
                  <rect
                    x="77"
                    y="204"
                    width="30"
                    height="12"
                    rx="6"
                    fill={`url(#navy-suit-${uid})`}
                    stroke="#091024"
                    strokeWidth="1.2"
                  />
                  {/* Glowing Thruster Sole */}
                  <rect
                    x="82"
                    y="214"
                    width="20"
                    height="3.5"
                    rx="1.75"
                    fill="var(--maria-accent)"
                    filter={`url(#led-glow-${uid})`}
                  />
                </g>

                {/* RIGHT LEG & HOVER BOOT */}
                <g ref={rightLegRef}>
                  <rect
                    x="117"
                    y="176"
                    width="18"
                    height="18"
                    rx="7"
                    fill={`url(#navy-suit-${uid})`}
                  />
                  <rect
                    x="114"
                    y="188"
                    width="26"
                    height="21"
                    rx="10"
                    fill={`url(#armor-white-${uid})`}
                    stroke="#0f172a"
                    strokeWidth="1.4"
                  />
                  <rect x="121" y="191" width="12" height="5" rx="2.5" fill="#1e3162" />
                  <rect
                    x="113"
                    y="204"
                    width="30"
                    height="12"
                    rx="6"
                    fill={`url(#navy-suit-${uid})`}
                    stroke="#091024"
                    strokeWidth="1.2"
                  />
                  <rect
                    x="118"
                    y="214"
                    width="20"
                    height="3.5"
                    rx="1.75"
                    fill="var(--maria-accent)"
                    filter={`url(#led-glow-${uid})`}
                  />
                </g>

                {/* LEFT ARM & GAUNTLET GLOVE */}
                <g ref={leftArmRef}>
                  <circle cx="74" cy="146" r="8.5" fill={`url(#navy-suit-${uid})`} />
                  <rect
                    x="65"
                    y="145"
                    width="13"
                    height="15"
                    rx="6"
                    fill={`url(#navy-suit-${uid})`}
                  />
                  {/* White Gauntlet Forearm */}
                  <rect
                    x="59"
                    y="156"
                    width="20"
                    height="18"
                    rx="8"
                    fill={`url(#armor-white-${uid})`}
                    stroke="#0f172a"
                    strokeWidth="1.4"
                  />
                  {/* Mitten Glove + Thumb */}
                  <circle
                    cx="68"
                    cy="176"
                    r="9"
                    fill={`url(#armor-white-${uid})`}
                    stroke="#0f172a"
                    strokeWidth="1.4"
                  />
                  <circle
                    cx="75"
                    cy="173"
                    r="3.6"
                    fill={`url(#armor-white-${uid})`}
                    stroke="#0f172a"
                    strokeWidth="1.1"
                  />
                </g>

                {/* RIGHT ARM, GAUNTLET GLOVE & PROPS */}
                <g ref={rightArmRef}>
                  <circle cx="146" cy="146" r="8.5" fill={`url(#navy-suit-${uid})`} />
                  <rect
                    x="142"
                    y="145"
                    width="13"
                    height="15"
                    rx="6"
                    fill={`url(#navy-suit-${uid})`}
                  />
                  <rect
                    x="141"
                    y="156"
                    width="20"
                    height="18"
                    rx="8"
                    fill={`url(#armor-white-${uid})`}
                    stroke="#0f172a"
                    strokeWidth="1.4"
                  />
                  <circle
                    cx="152"
                    cy="176"
                    r="9"
                    fill={`url(#armor-white-${uid})`}
                    stroke="#0f172a"
                    strokeWidth="1.4"
                  />
                  <circle
                    cx="145"
                    cy="173"
                    r="3.6"
                    fill={`url(#armor-white-${uid})`}
                    stroke="#0f172a"
                    strokeWidth="1.1"
                  />

                  {/* PROP A: Glowing Cyan Holographic Wrench (Matching Sparkle #3) */}
                  <g ref={wrenchRef} style={{ display: 'none' }} filter={`url(#led-glow-${uid})`}>
                    <g transform="translate(154 173) rotate(18)">
                      <rect
                        x="-4.5"
                        y="-38"
                        width="9"
                        height="42"
                        rx="4.5"
                        fill="var(--maria-accent)"
                        stroke="var(--maria-accent-bright)"
                        strokeWidth="1.4"
                      />
                      <path
                        d="M-11 -52 A13 13 0 1 1 11 -52 L5.5 -40 L-5.5 -40 Z"
                        fill="var(--maria-accent)"
                        stroke="var(--maria-accent-bright)"
                        strokeWidth="1.4"
                      />
                      <circle cx="0" cy="-47" r="4.8" fill="#040a18" />
                    </g>
                  </g>

                  {/* PROP B: Holographic Notebook / Project Tablet */}
                  <g ref={tabletRef} style={{ display: 'none' }}>
                    <g transform="translate(152 150) rotate(-14)">
                      <rect
                        x="0"
                        y="0"
                        width="28"
                        height="34"
                        rx="5"
                        fill="#0b1533"
                        stroke="var(--maria-accent)"
                        strokeWidth="1.8"
                      />
                      <rect
                        x="3.5"
                        y="4"
                        width="21"
                        height="26"
                        rx="3"
                        fill="var(--maria-accent)"
                        opacity="0.24"
                      />
                      <line
                        x1="6.5"
                        y1="10"
                        x2="21.5"
                        y2="10"
                        stroke="var(--maria-accent-bright)"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                      />
                      <line
                        x1="6.5"
                        y1="16"
                        x2="18.5"
                        y2="16"
                        stroke="var(--maria-accent-bright)"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                      />
                      <line
                        x1="6.5"
                        y1="22"
                        x2="20"
                        y2="22"
                        stroke="var(--maria-accent-bright)"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                      />
                    </g>
                  </g>
                </g>

                {/* TORSO INNER NAVY PELVIS */}
                <rect
                  x="86"
                  y="150"
                  width="48"
                  height="34"
                  rx="15"
                  fill={`url(#navy-suit-${uid})`}
                  stroke="#091024"
                  strokeWidth="1.4"
                />

                {/* PEARL-WHITE CHEST PLATE */}
                <path
                  d="M78 140 C78 132, 142 132, 142 140 L138 166 C137 172, 126 175, 110 175 C94 175, 83 172, 82 166 Z"
                  fill={`url(#armor-white-${uid})`}
                  stroke="#0f172a"
                  strokeWidth="1.6"
                />

                {/* Navy Shoulder Collar Trim + Glowing V-Accent */}
                <path
                  d="M84 139 L110 148 L136 139"
                  fill="none"
                  stroke="var(--maria-accent)"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter={`url(#led-glow-${uid})`}
                />

                {/* Chest Core Star Emblem (Matching Sparkle's chest badge) */}
                <circle cx="110" cy="147" r="6" fill={`url(#navy-suit-${uid})`} />
                <path
                  d="M110 142.5 Q110 147 114.5 147 Q110 147 110 151.5 Q110 147 105.5 147 Q110 147 110 142.5 Z"
                  fill="var(--maria-accent)"
                  filter={`url(#led-glow-${uid})`}
                />

                {/* Chest Wordmark "MARIA" matching Sparkle chest branding */}
                <text
                  x="110"
                  y="165"
                  textAnchor="middle"
                  fill="#132043"
                  fontSize="9.2"
                  fontWeight="800"
                  letterSpacing="0.8"
                >
                  MARIA
                </text>
              </>
            )}

            {/* OVERSIZED CHIBI SPARKLE HELMET & HEAD */}
            <g ref={headGroupRef}>
              {/* Top Antenna & Tilted 4-Point Sparkle Star */}
              <g ref={antennaRef}>
                <ellipse cx="110" cy="43" rx="11" ry="4.5" fill={`url(#navy-suit-${uid})`} />
                <path
                  d="M110 42 L114 23"
                  stroke="#94a3b8"
                  strokeWidth="3.6"
                  strokeLinecap="round"
                />
                <g ref={starRef} filter={`url(#led-glow-${uid})`}>
                  <path
                    d="M115 4 Q115 17 128 17 Q115 17 115 30 Q115 17 102 17 Q115 17 115 4 Z"
                    fill="var(--maria-accent)"
                    stroke="var(--maria-accent-bright)"
                    strokeWidth="1.2"
                  />
                  <circle cx="115" cy="17" r="2.2" fill="#ffffff" />
                </g>
              </g>

              {/* Left Ear Headphone Cup (White Ring + Navy Core + Glowing Cyan Ring) */}
              <g>
                <rect
                  x="38"
                  y="73"
                  width="18"
                  height="38"
                  rx="9"
                  fill={`url(#armor-white-${uid})`}
                  stroke="#0f172a"
                  strokeWidth="1.6"
                />
                <rect
                  x="35"
                  y="78"
                  width="11"
                  height="28"
                  rx="5.5"
                  fill={`url(#navy-suit-${uid})`}
                />
                <rect
                  x="37.5"
                  y="81"
                  width="5"
                  height="22"
                  rx="2.5"
                  fill="var(--maria-accent)"
                  filter={`url(#led-glow-${uid})`}
                />
              </g>

              {/* Right Ear Headphone Cup */}
              <g>
                <rect
                  x="164"
                  y="73"
                  width="18"
                  height="38"
                  rx="9"
                  fill={`url(#armor-white-${uid})`}
                  stroke="#0f172a"
                  strokeWidth="1.6"
                />
                <rect
                  x="174"
                  y="78"
                  width="11"
                  height="28"
                  rx="5.5"
                  fill={`url(#navy-suit-${uid})`}
                />
                <rect
                  x="177.5"
                  y="81"
                  width="5"
                  height="22"
                  rx="2.5"
                  fill="var(--maria-accent)"
                  filter={`url(#led-glow-${uid})`}
                />
              </g>

              {/* Wide Rounded Pearl-White Helmet Shell */}
              <rect
                x="45"
                y="42"
                width="130"
                height="96"
                rx="46"
                fill={`url(#armor-white-${uid})`}
                stroke="#0f172a"
                strokeWidth="1.8"
              />

              {/* Subtle Top Crown Gloss */}
              <path
                d="M74 50 Q110 43 146 50"
                fill="none"
                stroke="#ffffff"
                strokeWidth="3.5"
                strokeLinecap="round"
                opacity="0.8"
              />

              {/* Navy Inner Visor Frame */}
              <rect
                x="54"
                y="54"
                width="112"
                height="74"
                rx="34"
                fill={`url(#navy-suit-${uid})`}
                stroke="var(--maria-accent)"
                strokeOpacity="0.4"
                strokeWidth="1.2"
              />

              {/* Dark OLED Face Screen */}
              <rect
                x="58"
                y="58"
                width="104"
                height="66"
                rx="30"
                fill={`url(#visor-bg-${uid})`}
              />

              {/* Subtle Ambient Screen Glow */}
              <ellipse cx="110" cy="91" rx="42" ry="25" fill="var(--maria-visor-tint)" />

              {/* Soft Cheek Blush Highlight on Happy/Calm */}
              <g ref={blushRef} opacity="0">
                <ellipse cx="77" cy="99" rx="6.5" ry="3.2" fill="var(--maria-accent)" />
                <ellipse cx="143" cy="99" rx="6.5" ry="3.2" fill="var(--maria-accent)" />
              </g>

              {/* DYNAMIC GAZE & EXPRESSIONS */}
              <g ref={gazeGroupRef} filter={`url(#led-glow-${uid})`}>
                {/* LEFT EYE */}
                <g ref={leftEyeRef} data-cx="88" data-cy="86">
                  <g data-eye="round">
                    <ellipse cx="88" cy="86" rx="8.8" ry="10.2" fill="var(--maria-accent)" />
                    <circle cx="84.5" cy="81.5" r="2.6" fill="#ffffff" opacity="0.85" />
                  </g>
                  <g data-eye="squint" style={{ display: 'none' }}>
                    <ellipse cx="88" cy="86" rx="8.6" ry="5.5" fill="var(--maria-accent)" />
                  </g>
                  <path
                    data-eye="happy"
                    d="M77 89 Q88 73 99 89"
                    fill="none"
                    stroke="var(--maria-accent)"
                    strokeWidth="5"
                    strokeLinecap="round"
                    style={{ display: 'none' }}
                  />
                  <path
                    data-eye="chevron-r"
                    d="M79 79 L95 86 L79 93"
                    fill="none"
                    stroke="var(--maria-accent)"
                    strokeWidth="4.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ display: 'none' }}
                  />
                  <path
                    data-eye="calm"
                    d="M78 84 Q88 94 98 84"
                    fill="none"
                    stroke="var(--maria-accent)"
                    strokeWidth="4.4"
                    strokeLinecap="round"
                    style={{ display: 'none' }}
                  />
                  <line
                    data-eye="muted"
                    x1="80"
                    y1="86"
                    x2="96"
                    y2="86"
                    stroke="var(--maria-accent)"
                    strokeWidth="4"
                    strokeLinecap="round"
                    style={{ display: 'none' }}
                  />
                  <g data-eye="alert-l" style={{ display: 'none' }}>
                    <line
                      x1="78"
                      y1="78"
                      x2="98"
                      y2="85"
                      stroke="var(--maria-accent)"
                      strokeWidth="4.6"
                      strokeLinecap="round"
                    />
                    <ellipse cx="88" cy="89" rx="6.5" ry="4.2" fill="var(--maria-accent)" />
                  </g>
                </g>

                {/* RIGHT EYE */}
                <g ref={rightEyeRef} data-cx="132" data-cy="86">
                  <g data-eye="round">
                    <ellipse cx="132" cy="86" rx="8.8" ry="10.2" fill="var(--maria-accent)" />
                    <circle cx="128.5" cy="81.5" r="2.6" fill="#ffffff" opacity="0.85" />
                  </g>
                  <g data-eye="squint" style={{ display: 'none' }}>
                    <ellipse cx="132" cy="86" rx="8.6" ry="5.5" fill="var(--maria-accent)" />
                  </g>
                  <path
                    data-eye="happy"
                    d="M121 89 Q132 73 143 89"
                    fill="none"
                    stroke="var(--maria-accent)"
                    strokeWidth="5"
                    strokeLinecap="round"
                    style={{ display: 'none' }}
                  />
                  <path
                    data-eye="chevron-l"
                    d="M141 79 L125 86 L141 93"
                    fill="none"
                    stroke="var(--maria-accent)"
                    strokeWidth="4.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ display: 'none' }}
                  />
                  <path
                    data-eye="calm"
                    d="M122 84 Q132 94 142 84"
                    fill="none"
                    stroke="var(--maria-accent)"
                    strokeWidth="4.4"
                    strokeLinecap="round"
                    style={{ display: 'none' }}
                  />
                  <line
                    data-eye="muted"
                    x1="124"
                    y1="86"
                    x2="140"
                    y2="86"
                    stroke="var(--maria-accent)"
                    strokeWidth="4"
                    strokeLinecap="round"
                    style={{ display: 'none' }}
                  />
                  <g data-eye="alert-r" style={{ display: 'none' }}>
                    <line
                      x1="142"
                      y1="78"
                      x2="122"
                      y2="85"
                      stroke="var(--maria-accent)"
                      strokeWidth="4.6"
                      strokeLinecap="round"
                    />
                    <ellipse cx="132" cy="89" rx="6.5" ry="4.2" fill="var(--maria-accent)" />
                  </g>
                </g>

                {/* CONTINUOUS MORPHING LED MOUTH */}
                <g>
                  <path
                    ref={mouthLineRef}
                    d="M 100 107 Q 110 114 120 107"
                    fill="none"
                    stroke="var(--maria-accent)"
                    strokeWidth="4.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    ref={mouthOpenRef}
                    d="M 98 103 Q 110 105 122 103 Q 122 117 110 117 Q 98 117 98 103 Z"
                    fill="var(--maria-accent)"
                    style={{ display: 'none' }}
                  />
                  <path
                    ref={mouthShineRef}
                    d="M 103 114 Q 110 112 117 114"
                    fill="none"
                    stroke="var(--maria-accent-bright)"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    style={{ display: 'none' }}
                  />
                </g>
              </g>

              {/* Soft Glass Visor Reflection Arc */}
              <path
                d="M68 67 Q84 61 102 64"
                fill="none"
                stroke="#ffffff"
                strokeWidth="2.4"
                strokeLinecap="round"
                opacity="0.22"
              />
            </g>
          </g>
        </g>
      </svg>
    </div>
  );
};
