import type { ReactNode } from "react";

const S = (p: { children: ReactNode; size?: number; className?: string }) => (
  <svg
    width={p.size ?? 18}
    height={p.size ?? 18}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={p.className}
  >
    {p.children}
  </svg>
);

const SHIELD = "M12 3l8 3v6c0 4.5-3.3 8-8 9-4.7-1-8-4.5-8-9V6l8-3z";

export const ShieldOk = ({ size = 30, className }: { size?: number; className?: string }) => (
  <S size={size} className={className}>
    <path d={SHIELD} />
    <path d="M8.5 12l2.5 2.5L16 9.5" />
  </S>
);

export const ShieldBad = ({ size = 30, className }: { size?: number; className?: string }) => (
  <S size={size} className={className}>
    <path d={SHIELD} />
    <path d="M12 8v5M12 16.5h.01" />
  </S>
);

export const ShieldOff = ({ size = 30, className }: { size?: number; className?: string }) => (
  <S size={size} className={className}>
    <path d={SHIELD} />
    <path d="M9 9l6 6M15 9l-6 6" />
  </S>
);

export const Bolt = ({ className }: { className?: string }) => (
  <S className={className}>
    <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />
  </S>
);

export const Scan = ({ className }: { className?: string }) => (
  <S className={className}>
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.3-4.3" />
  </S>
);

export const Folder = ({ className }: { className?: string }) => (
  <S className={className}>
    <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
  </S>
);

export const Box = ({ className }: { className?: string }) => (
  <S className={className}>
    <path d="M21 8l-9-5-9 5v8l9 5 9-5V8z" />
    <path d="M3 8l9 5 9-5M12 13v8" />
  </S>
);

export const List = ({ className }: { className?: string }) => (
  <S className={className}>
    <path d="M4 6h16M4 12h16M4 18h10" />
  </S>
);

export const Info = ({ className }: { className?: string }) => (
  <S className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 8h.01" />
  </S>
);

export const Refresh = ({ className }: { className?: string }) => (
  <S className={className}>
    <path d="M21 12a9 9 0 11-3-6.7M21 4v5h-5" />
  </S>
);

export const Sun = ({ size = 15, className }: { size?: number; className?: string }) => (
  <S size={size} className={className}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </S>
);

export const Logo = ({ size = 22, className }: { size?: number; className?: string }) => (
  <ShieldOk size={size} className={className} />
);
