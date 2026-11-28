import React, { useEffect, useRef } from 'react';

export type GeminiLiveOrbState =
  | 'connecting'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'muted'
  | 'error';

interface GeminiLiveOrbProps {
  state?: GeminiLiveOrbState;
  energy?: number;
  getLiveEnergy?: () => number;
  alert?: boolean;
  size?: 'large' | 'compact';
  className?: string;
}

export const GeminiLiveOrb: React.FC<GeminiLiveOrbProps> = ({
  state = 'listening',
  energy = 0,
  getLiveEnergy,
  alert = false,
  size = 'large',
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef(state);
  const energyRef = useRef(energy);
  const getLiveEnergyRef = useRef(getLiveEnergy);
  const alertRef = useRef(alert);
  const sizeRef = useRef(size);

  stateRef.current = state;
  energyRef.current = energy;
  getLiveEnergyRef.current = getLiveEnergy;
  alertRef.current = alert;
  sizeRef.current = size;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    let rafId = 0;
    let smoothedEnergy = 0;
    let phase = 0;
    let entryProgress = prefersReducedMotion ? 1 : 0.08;
    let lastTime = performance.now();

    const draw = (now: number) => {
      const dt = Math.max(0.001, Math.min((now - lastTime) / 1000, 0.05));
      lastTime = now;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cssW = canvas.clientWidth || (sizeRef.current === 'compact' ? 84 : 220);
      const cssH = canvas.clientHeight || (sizeRef.current === 'compact' ? 84 : 220);
      const targetW = Math.round(cssW * dpr);
      const targetH = Math.round(cssH * dpr);

      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssW, cssH);

      // Dot-to-sphere smooth entrance matching Video 2
      if (entryProgress < 1) {
        entryProgress = Math.min(1, entryProgress + dt * 1.9);
      }
      const easeOut = 1 - Math.pow(1 - entryProgress, 3);

      const curState = stateRef.current;
      const isAlert = alertRef.current || curState === 'error';
      const isMuted = curState === 'muted';
      const isSpeaking = curState === 'speaking';
      const isBusy = curState === 'connecting' || curState === 'thinking';

      const raw = getLiveEnergyRef.current
        ? getLiveEnergyRef.current()
        : energyRef.current;
      const clamped = Math.max(0, Math.min(1, raw));
      const rate = clamped > smoothedEnergy ? 20 : 10;
      smoothedEnergy += (clamped - smoothedEnergy) * (1 - Math.exp(-rate * dt));

      const motionFactor = prefersReducedMotion ? 0.25 : 1;
      const speedMult = isBusy ? 1.85 : isSpeaking ? 1.45 + smoothedEnergy * 1.4 : isMuted ? 0.35 : 0.78;
      phase += dt * speedMult * motionFactor;

      const cx = cssW / 2;
      const cy = cssH / 2;
      const baseR = Math.min(cssW, cssH) * 0.38;
      const voiceScale =
        isSpeaking
          ? 1 + smoothedEnergy * 0.14 + Math.sin(phase * 3.1) * 0.02 * smoothedEnergy
          : isBusy
          ? 1 + Math.sin(phase * 2.5) * 0.045
          : 1 + Math.sin(phase * 1.4) * 0.02 + smoothedEnergy * 0.05;

      const r = baseR * easeOut * voiceScale;

      // Color palette: Sky-Cobalt Cloud (Video 2/3) + Gemini Cyan glow, or Rose Alert for Spy Guard
      const cTop = isAlert
        ? '#be123c'
        : isMuted
        ? '#1e3a5f'
        : '#1d66f2';
      const cMid = isAlert
        ? '#fb7185'
        : isMuted
        ? '#4776a8'
        : '#62b0ff';
      const cCloud = isAlert
        ? '#ffe4e6'
        : isMuted
        ? '#cbd5e1'
        : '#eef7ff';
      const cGlow = isAlert
        ? 'rgba(244, 63, 94, 0.42)'
        : isMuted
        ? 'rgba(56, 189, 248, 0.16)'
        : `rgba(56, 178, 255, ${(0.34 + smoothedEnergy * 0.32).toFixed(3)})`;

      // Outer atmospheric halo
      const haloR = r * (1.42 + smoothedEnergy * 0.18);
      const halo = ctx.createRadialGradient(cx, cy, r * 0.55, cx, cy, haloR);
      halo.addColorStop(0, cGlow);
      halo.addColorStop(0.55, isAlert ? 'rgba(225,29,72,0.12)' : 'rgba(22,139,255,0.14)');
      halo.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(cx, cy, haloR, 0, Math.PI * 2);
      ctx.fill();

      // Clip interior spherical volume
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(2, r), 0, Math.PI * 2);
      ctx.clip();

      // Base sky gradient (deep sapphire zenith -> soft bright cloud horizon)
      const tiltX = Math.sin(phase * 0.6) * r * 0.22;
      const tiltY = Math.cos(phase * 0.45) * r * 0.12;
      const baseGrad = ctx.createLinearGradient(
        cx + tiltX,
        cy - r,
        cx - tiltX,
        cy + r * 0.95
      );
      baseGrad.addColorStop(0, cTop);
      baseGrad.addColorStop(0.46, cMid);
      baseGrad.addColorStop(0.84, cCloud);
      baseGrad.addColorStop(1, '#ffffff');
      ctx.fillStyle = baseGrad;
      ctx.fillRect(cx - r - 2, cy - r - 2, (r + 2) * 2, (r + 2) * 2);

      // Swirling cloud / plasma wisps inside sphere (Video 2 & 3 cloudy sky feel)
      const wisps = [
        { ox: Math.cos(phase * 0.85) * 0.32, oy: Math.sin(phase * 0.65) * 0.18 + 0.18, rad: 0.78, alpha: 0.62 },
        { ox: Math.sin(phase * 1.1 + 1.7) * 0.38, oy: Math.cos(phase * 0.8 + 0.9) * 0.22 + 0.05, rad: 0.65, alpha: 0.45 },
        { ox: Math.cos(phase * 1.4 + 3.2) * 0.28, oy: Math.sin(phase * 1.05 + 2.1) * 0.25 - 0.12, rad: 0.56, alpha: isSpeaking ? 0.52 : 0.28 },
      ];

      for (const w of wisps) {
        const wx = cx + w.ox * r;
        const wy = cy + w.oy * r;
        const wr = Math.max(2, r * (w.rad + smoothedEnergy * 0.12));
        const g = ctx.createRadialGradient(wx, wy, 0, wx, wy, wr);
        g.addColorStop(0, isAlert ? `rgba(255, 228, 230, ${w.alpha})` : `rgba(255, 255, 255, ${w.alpha})`);
        g.addColorStop(0.55, isAlert ? `rgba(251, 113, 133, ${(w.alpha * 0.45).toFixed(2)})` : `rgba(147, 210, 255, ${(w.alpha * 0.5).toFixed(2)})`);
        g.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(wx, wy, wr, 0, Math.PI * 2);
        ctx.fill();
      }

      // Soft inner shadow & glossy edge rim so the sphere feels tactile & dimensional
      const rim = ctx.createRadialGradient(
        cx - r * 0.22,
        cy - r * 0.28,
        r * 0.3,
        cx,
        cy,
        r
      );
      rim.addColorStop(0, 'rgba(255,255,255,0)');
      rim.addColorStop(0.78, 'rgba(10, 40, 110, 0.08)');
      rim.addColorStop(1, isAlert ? 'rgba(254, 205, 211, 0.5)' : 'rgba(186, 230, 253, 0.52)');
      ctx.fillStyle = rim;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const dimClass = size === 'compact' ? 'w-[84px] h-[84px]' : 'w-52 h-52 sm:w-60 sm:h-60';

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none select-none ${dimClass} ${className}`}
    />
  );
};
