import React, { useId } from 'react';

interface MariaLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'hero';
  className?: string;
  glow?: boolean;
  withOnlineDot?: boolean;
  isResponding?: boolean;
}

export const MariaLogo: React.FC<MariaLogoProps> = ({
  size = 'md',
  className = '',
  glow = false,
  withOnlineDot = false,
  isResponding = false,
}) => {
  const rawId = useId();
  const uid = rawId.replace(/[^a-zA-Z0-9_-]/g, '');

  const sizeMap = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
    hero: 'w-20 h-20 sm:w-24 sm:h-24',
  };

  const currentSize = sizeMap[size];

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 ${currentSize} ${className} ${
        glow ? 'drop-shadow-[0_4px_16px_rgba(20,24,38,0.25)]' : ''
      }`}
    >
      {/* Active Response Orbital Energy Ring (transitions cleanly back to MariaLogo when done) */}
      <div
        aria-hidden={!isResponding}
        className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ease-out ${
          isResponding
            ? 'opacity-100 scale-100'
            : 'opacity-0 scale-110 pointer-events-none'
        }`}
      >
        {/* Outer electric-blue radial glow halo */}
        <span
          className="absolute -inset-1 rounded-full animate-maria-halo pointer-events-none"
          style={{
            background:
              'radial-gradient(circle, rgba(56,189,248,0.38) 0%, rgba(37,99,235,0.22) 48%, rgba(37,99,235,0) 74%)',
          }}
        />

        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="relative w-full h-full overflow-visible"
        >
          <defs>
            <radialGradient id={`maria-orb-core-${uid}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#0f2557" />
              <stop offset="55%" stopColor="#081330" />
              <stop offset="100%" stopColor="#030712" />
            </radialGradient>

            <linearGradient id={`maria-comet-arc-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
              <stop offset="32%" stopColor="#7dd3fc" stopOpacity="0.95" />
              <stop offset="68%" stopColor="#3b82f6" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0" />
            </linearGradient>

            <linearGradient id={`maria-comet-tail-${uid}`} x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
              <stop offset="55%" stopColor="#2563eb" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#1e3a8a" stopOpacity="0" />
            </linearGradient>

            <radialGradient id={`maria-aperture-glow-${uid}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#e0f2fe" stopOpacity="0.95" />
              <stop offset="40%" stopColor="#38bdf8" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0" />
            </radialGradient>

            <filter id={`maria-arc-blur-${uid}`} x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="2.4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Dark Circular Energy Sphere & Subtle Rim */}
          <circle
            cx="50"
            cy="50"
            r="43"
            fill={`url(#maria-orb-core-${uid})`}
            stroke="rgba(125, 211, 252, 0.28)"
            strokeWidth="1.6"
          />

          {/* Inner Luminous Vertical/Radial Pulse Core */}
          <ellipse
            cx="50"
            cy="50"
            rx="7"
            ry="20"
            fill={`url(#maria-aperture-glow-${uid})`}
            className="animate-maria-core-wave"
          />

          {/* Counter-Rotating Soft Secondary Blue Aura Arc */}
          <g className="animate-maria-orbit-reverse">
            <path
              d="M 50 11 A 39 39 0 0 1 86 64"
              stroke={`url(#maria-comet-tail-${uid})`}
              strokeWidth="4.2"
              strokeLinecap="round"
            />
          </g>

          {/* Primary Bright Cyan/White Sweeping Orbital Crescent */}
          <g className="animate-maria-orbit" filter={`url(#maria-arc-blur-${uid})`}>
            <path
              d="M 50 9 A 41 41 0 0 1 89 61"
              stroke={`url(#maria-comet-arc-${uid})`}
              strokeWidth="5.5"
              strokeLinecap="round"
            />
            <circle cx="50" cy="9" r="3" fill="#ffffff" />
          </g>
        </svg>
      </div>

      {/* Standard Maria AI Brand Logo */}
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`w-full h-full transition-all duration-300 ease-out ${
          isResponding
            ? 'opacity-0 scale-75 pointer-events-none'
            : 'opacity-100 scale-100'
        }`}
      >
        <defs>
          <linearGradient id={`maria-logo-bg-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1a233e" />
            <stop offset="100%" stopColor="#13192f" />
          </linearGradient>
        </defs>

        {/* Outer Squircle Dark Navy Background */}
        <rect
          x="2"
          y="2"
          width="96"
          height="96"
          rx="26"
          fill={`url(#maria-logo-bg-${uid})`}
        />

        {/* Inner Silver-Blue Circle Ring */}
        <circle
          cx="50"
          cy="50"
          r="28.5"
          stroke="#b8c5d6"
          strokeWidth="2"
          fill="none"
        />

        {/* Diagonal Coral Pink Slash (Bottom-Left to Top-Right with gap for M) */}
        <line
          x1="29.5"
          y1="77"
          x2="45.5"
          y2="61"
          stroke="#f39296"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <line
          x1="58.5"
          y1="36"
          x2="70.5"
          y2="24"
          stroke="#f39296"
          strokeWidth="2.2"
          strokeLinecap="round"
        />

        {/* Top-Right 4-Point Sparkle Star */}
        <path
          d="M76.5 30.5 Q76.5 33.5 79.5 33.5 Q76.5 33.5 76.5 36.5 Q76.5 33.5 73.5 33.5 Q76.5 33.5 76.5 30.5 Z"
          fill="#f39296"
        />

        {/* Solid Bold Capital Letter M */}
        <path
          d="M40 39 H44.2 L50 51.5 L55.8 39 H60 V61 H56.2 V45.2 L51.6 55.2 H48.4 L43.8 45.2 V61 H40 Z"
          fill="#ffffff"
        />
      </svg>

      {/* Online indicator dot on the corner */}
      {withOnlineDot && (
        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#10b981] ring-2 ring-white dark:ring-[#111218]" />
      )}
    </div>
  );
};
