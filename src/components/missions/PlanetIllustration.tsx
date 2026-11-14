import React from 'react';

interface PlanetIllustrationProps {
  planetId: string;
  size?: number;
  className?: string;
}

export const PlanetIllustration: React.FC<PlanetIllustrationProps> = ({
  planetId,
  size = 68,
  className = ''
}) => {
  switch (planetId) {
    case 'mercury':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          className={`bg-transparent overflow-visible drop-shadow-[0_0_12px_rgba(251,191,36,0.45)] ${className}`}
          aria-hidden="true"
        >
          <defs>
            <radialGradient id="grad-mercury" cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#fde68a" />
              <stop offset="45%" stopColor="#a8a29e" />
              <stop offset="100%" stopColor="#44403c" />
            </radialGradient>
          </defs>
          <circle cx="50" cy="50" r="38" fill="url(#grad-mercury)" />
          <circle cx="38" cy="40" r="6" fill="#57534e" opacity="0.55" />
          <circle cx="62" cy="58" r="8" fill="#57534e" opacity="0.5" />
          <circle cx="48" cy="68" r="4" fill="#57534e" opacity="0.45" />
          <circle cx="65" cy="34" r="3.5" fill="#d6d3d1" opacity="0.6" />
        </svg>
      );

    case 'venus':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          className={`bg-transparent overflow-visible drop-shadow-[0_0_14px_rgba(245,158,11,0.55)] ${className}`}
          aria-hidden="true"
        >
          <defs>
            <radialGradient id="grad-venus" cx="35%" cy="30%" r="72%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="55%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#9a3412" />
            </radialGradient>
          </defs>
          <circle cx="50" cy="50" r="39" fill="url(#grad-venus)" />
          <path d="M18 42 Q48 34 82 44" stroke="#fef9c3" strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.55" />
          <path d="M22 60 Q52 68 80 56" stroke="#fed7aa" strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.45" />
          <path d="M30 28 Q54 22 72 30" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" fill="none" opacity="0.4" />
        </svg>
      );

    case 'earth':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          className={`bg-transparent overflow-visible drop-shadow-[0_0_16px_rgba(56,189,248,0.6)] ${className}`}
          aria-hidden="true"
        >
          <defs>
            <radialGradient id="grad-earth" cx="35%" cy="30%" r="72%">
              <stop offset="0%" stopColor="#7dd3fc" />
              <stop offset="55%" stopColor="#0284c7" />
              <stop offset="100%" stopColor="#1e3a8a" />
            </radialGradient>
          </defs>
          <circle cx="50" cy="50" r="40" fill="url(#grad-earth)" />
          <path d="M26 36 Q38 26 48 38 T56 54 Q40 60 28 48 Z" fill="#22c55e" opacity="0.9" />
          <path d="M58 28 Q72 32 76 46 Q68 58 60 44 Z" fill="#16a34a" opacity="0.88" />
          <path d="M44 66 Q58 64 66 76 Q50 82 40 74 Z" fill="#4ade80" opacity="0.85" />
          <path d="M26 26 Q50 20 74 28" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" fill="none" opacity="0.7" />
        </svg>
      );

    case 'moon':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          className={`bg-transparent overflow-visible drop-shadow-[0_0_14px_rgba(226,232,240,0.5)] ${className}`}
          aria-hidden="true"
        >
          <defs>
            <radialGradient id="grad-moon" cx="35%" cy="30%" r="72%">
              <stop offset="0%" stopColor="#f8fafc" />
              <stop offset="55%" stopColor="#cbd5e1" />
              <stop offset="100%" stopColor="#475569" />
            </radialGradient>
          </defs>
          <circle cx="50" cy="50" r="38" fill="url(#grad-moon)" />
          <circle cx="36" cy="40" r="8" fill="#64748b" opacity="0.45" />
          <circle cx="62" cy="56" r="10" fill="#64748b" opacity="0.4" />
          <circle cx="54" cy="30" r="5" fill="#94a3b8" opacity="0.55" />
          <circle cx="38" cy="68" r="5.5" fill="#475569" opacity="0.45" />
        </svg>
      );

    case 'mars':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          className={`bg-transparent overflow-visible drop-shadow-[0_0_15px_rgba(249,115,22,0.6)] ${className}`}
          aria-hidden="true"
        >
          <defs>
            <radialGradient id="grad-mars" cx="35%" cy="30%" r="72%">
              <stop offset="0%" stopColor="#fdba74" />
              <stop offset="50%" stopColor="#ea580c" />
              <stop offset="100%" stopColor="#7c2d12" />
            </radialGradient>
          </defs>
          <circle cx="50" cy="50" r="39" fill="url(#grad-mars)" />
          <ellipse cx="42" cy="44" rx="10" ry="6" fill="#9a3412" opacity="0.5" />
          <circle cx="64" cy="58" r="6" fill="#9a3412" opacity="0.5" />
          <ellipse cx="50" cy="17" rx="12" ry="4" fill="#fff7ed" opacity="0.7" />
        </svg>
      );

    case 'jupiter':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          className={`bg-transparent overflow-visible drop-shadow-[0_0_16px_rgba(251,146,60,0.55)] ${className}`}
          aria-hidden="true"
        >
          <defs>
            <radialGradient id="grad-jup" cx="35%" cy="30%" r="72%">
              <stop offset="0%" stopColor="#fef3c7" />
              <stop offset="60%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#78350f" />
            </radialGradient>
            <clipPath id="clip-jup">
              <circle cx="50" cy="50" r="42" />
            </clipPath>
          </defs>
          <circle cx="50" cy="50" r="42" fill="url(#grad-jup)" />
          <g clipPath="url(#clip-jup)">
            <rect x="6" y="25" width="88" height="8" fill="#b45309" opacity="0.55" />
            <rect x="6" y="42" width="88" height="10" fill="#fde68a" opacity="0.45" />
            <rect x="6" y="60" width="88" height="9" fill="#92400e" opacity="0.6" />
            <ellipse cx="62" cy="56" rx="11" ry="7" fill="#dc2626" opacity="0.85" />
          </g>
        </svg>
      );

    case 'saturn':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 130 100"
          className={`bg-transparent overflow-visible drop-shadow-[0_0_16px_rgba(253,224,71,0.55)] ${className}`}
          aria-hidden="true"
        >
          <defs>
            <radialGradient id="grad-saturn" cx="35%" cy="30%" r="72%">
              <stop offset="0%" stopColor="#fef9c3" />
              <stop offset="55%" stopColor="#eab308" />
              <stop offset="100%" stopColor="#854d0e" />
            </radialGradient>
          </defs>
          <ellipse cx="65" cy="50" rx="56" ry="15" transform="rotate(-16 65 50)" fill="none" stroke="#fde047" strokeWidth="7" opacity="0.55" />
          <circle cx="65" cy="50" r="30" fill="url(#grad-saturn)" />
          <path d="M 12 64 A 56 15 -16 0 0 118 36" fill="none" stroke="#fef08a" strokeWidth="6" strokeLinecap="round" opacity="0.92" />
        </svg>
      );

    case 'asteroid_2010pk':
    default:
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          className={`bg-transparent overflow-visible drop-shadow-[0_0_14px_rgba(34,211,238,0.65)] ${className}`}
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="grad-ast" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#a5f3fc" />
              <stop offset="50%" stopColor="#475569" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
          </defs>
          <path
            d="M28 24 L54 14 L78 28 L86 52 L70 78 L42 84 L18 64 L16 40 Z"
            fill="url(#grad-ast)"
            stroke="#67e8f9"
            strokeWidth="2.5"
          />
          <circle cx="42" cy="40" r="7" fill="#0f172a" opacity="0.55" />
          <circle cx="62" cy="58" r="5" fill="#0f172a" opacity="0.5" />
          <circle cx="48" cy="64" r="3.5" fill="#38bdf8" opacity="0.5" />
        </svg>
      );
  }
};

export default PlanetIllustration;
