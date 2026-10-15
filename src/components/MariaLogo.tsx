import React from 'react';

interface MariaLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'hero';
  className?: string;
  glow?: boolean;
}

export const MariaLogo: React.FC<MariaLogoProps> = ({
  size = 'md',
  className = '',
  glow = false,
}) => {
  const sizeMap = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
    hero: 'w-24 h-24 sm:w-28 sm:h-28',
  };

  const currentSize = sizeMap[size];

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 ${currentSize} ${className} ${
        glow ? 'drop-shadow-[0_0_15px_rgba(32,166,106,0.35)]' : ''
      }`}
    >
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <defs>
          <linearGradient id="maria-bg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e222d" />
            <stop offset="50%" stopColor="#141720" />
            <stop offset="100%" stopColor="#0d0f14" />
          </linearGradient>
          <linearGradient id="maria-emerald" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="50%" stopColor="#20a66a" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
          <linearGradient id="maria-accent" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#a7f3d0" />
          </linearGradient>
        </defs>

        {/* Outer Rounded Geometric Tile */}
        <rect
          x="4"
          y="4"
          width="92"
          height="92"
          rx="24"
          fill="url(#maria-bg-grad)"
          stroke="#2a303f"
          strokeWidth="2.5"
        />

        {/* Geometric Stylized "M" with High Precision */}
        {/* Left pillar */}
        <path
          d="M24 72V30L38 48V72H24Z"
          fill="url(#maria-emerald)"
        />

        {/* Center vertex chevron */}
        <path
          d="M38 48L50 63L62 48L50 33L38 48Z"
          fill="url(#maria-accent)"
        />

        {/* Right pillar */}
        <path
          d="M76 72V30L62 48V72H76Z"
          fill="url(#maria-emerald)"
        />

        {/* Top geometric crown vertex */}
        <circle cx="50" cy="23" r="3.5" fill="#34d399" />
      </svg>
    </div>
  );
};
