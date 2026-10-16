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
          <linearGradient id="maria-tile-bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e2538" />
            <stop offset="50%" stopColor="#151b2c" />
            <stop offset="100%" stopColor="#0f1422" />
          </linearGradient>
        </defs>

        {/* Outer Rounded Dark Squircle Tile */}
        <rect
          x="3"
          y="3"
          width="94"
          height="94"
          rx="26"
          fill="url(#maria-tile-bg)"
        />

        {/* Inner Circle Ring */}
        <circle
          cx="50"
          cy="50"
          r="30"
          stroke="#ffffff"
          strokeWidth="2.2"
          strokeOpacity="0.88"
        />

        {/* Diagonal Ray cutting through */}
        <line
          x1="22"
          y1="76"
          x2="78"
          y2="24"
          stroke="#ffffff"
          strokeWidth="1.2"
          strokeOpacity="0.75"
        />

        {/* Top-Right Star Sparkle on the ray */}
        <path
          d="M78 24L80 20L82 24L86 26L82 28L80 32L78 28L74 26Z"
          fill="#ffffff"
        />

        {/* Stylized Capital Letter "M" */}
        <path
          d="M33 65V35L42 50L50 62L58 50L67 35V65"
          stroke="#ffffff"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {/* Online indicator dot on the corner */}
      {withOnlineDot && (
        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#10b981] ring-2 ring-white dark:ring-[#111218]" />
      )}
    </div>
  );
};
