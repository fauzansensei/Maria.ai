import React from 'react';

interface MariaLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'hero';
  className?: string;
  glow?: boolean;
  withOnlineDot?: boolean;
}

export const MariaLogo: React.FC<MariaLogoProps> = ({
  size = 'md',
  className = '',
  glow = false,
  withOnlineDot = false,
}) => {
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
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <defs>
          <linearGradient id="maria-logo-bg" x1="0%" y1="0%" x2="100%" y2="100%">
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
          fill="url(#maria-logo-bg)"
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
