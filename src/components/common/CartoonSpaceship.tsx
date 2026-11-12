import React from 'react';
import { motion } from 'framer-motion';

interface CartoonSpaceshipProps {
  size?: number | string;
  animated?: boolean;
  interactive?: boolean;
  showShadow?: boolean;
  className?: string;
  onClick?: () => void;
}

export const CartoonSpaceship: React.FC<CartoonSpaceshipProps> = ({
  size = 140,
  animated = true,
  interactive = true,
  showShadow = true,
  className = '',
  onClick
}) => {
  return (
    <motion.div
      onClick={onClick}
      whileHover={interactive ? { scale: 1.05, rotate: -2 } : undefined}
      whileTap={interactive ? { scale: 0.95 } : undefined}
      className={`relative inline-flex flex-col items-center justify-center select-none ${
        interactive ? 'cursor-pointer' : ''
      } ${className}`}
      style={{
        width: typeof size === 'number' ? `${size}px` : size,
        height: typeof size === 'number' ? `${size * 1.28}px` : 'auto'
      }}
    >
      <svg
        viewBox="0 0 140 180"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full overflow-visible"
      >
        <defs>
          <linearGradient id="rocketBodyGrad" x1="40" y1="20" x2="100" y2="150" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="70%" stopColor="#F8FCFF" />
            <stop offset="100%" stopColor="#E2EAF4" />
          </linearGradient>

          <linearGradient id="rocketNoseGrad" x1="50" y1="15" x2="90" y2="50" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFD6E4" />
            <stop offset="100%" stopColor="#FF99B8" />
          </linearGradient>

          <linearGradient id="rocketFinGrad" x1="20" y1="115" x2="40" y2="155" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#C9DEFF" />
            <stop offset="100%" stopColor="#87B4FF" />
          </linearGradient>

          <filter id="rocketExhaustGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* 1. Ground Cast Shadow */}
        {showShadow && (
          <motion.ellipse
            cx="70"
            cy="172"
            rx="38"
            ry="9"
            fill="rgba(13, 19, 38, 0.45)"
            animate={
              animated
                ? {
                    rx: [38, 33, 38],
                    opacity: [0.45, 0.28, 0.45]
                  }
                : {}
            }
            transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}

        {/* 2. Rocket Body Group */}
        <motion.g
          animate={
            animated
              ? {
                  y: [0, -7, 0],
                  rotate: [0, -1, 0, 1, 0]
                }
              : {}
          }
          transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
          style={{ originX: '70px', originY: '145px' }}
        >
          {/* Soft Exhaust Thruster Glow */}
          <motion.ellipse
            cx="70"
            cy="156"
            rx="12"
            ry="6"
            fill="#FFE69A"
            filter="url(#rocketExhaustGlow)"
            animate={animated ? { scale: [1, 1.3, 1], opacity: [0.7, 0.95, 0.7] } : {}}
            transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
            style={{ originX: '70px', originY: '156px' }}
          />

          {/* Left Wing / Fin */}
          <path
            d="M41,115 C18,120 16,155 39,150 Z"
            fill="url(#rocketFinGrad)"
            stroke="#1E293B"
            strokeWidth="3.2"
            strokeLinejoin="round"
          />

          {/* Right Wing / Fin */}
          <path
            d="M99,115 C122,120 124,155 101,150 Z"
            fill="url(#rocketFinGrad)"
            stroke="#1E293B"
            strokeWidth="3.2"
            strokeLinejoin="round"
          />

          {/* Fuselage Rocket Body */}
          <path
            d="M70,15 C95,45 105,105 100,145 L40,145 C35,105 45,45 70,15 Z"
            fill="url(#rocketBodyGrad)"
            stroke="#1E293B"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />

          {/* Left Body 45° Highlight Curved Streak */}
          <path
            d="M52,38 C46,65 44,105 47,135"
            stroke="#FFFFFF"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Nose Cone */}
          <path
            d="M70,15 C82,32 87,50 87,50 L53,50 C53,50 58,32 70,15 Z"
            fill="url(#rocketNoseGrad)"
            stroke="#1E293B"
            strokeWidth="3"
            strokeLinejoin="round"
          />

          {/* Nose Highlight */}
          <path
            d="M66,22 C61,28 58,36 58,42"
            stroke="#FFFFFF"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Porthole Outer Ring */}
          <circle
            cx="70"
            cy="80"
            r="18"
            fill="#C9B8FF"
            stroke="#1E293B"
            strokeWidth="3"
          />

          {/* Porthole Glass Window */}
          <circle
            cx="70"
            cy="80"
            r="13.5"
            fill="#8DE8F4"
            stroke="#1E293B"
            strokeWidth="2"
          />

          {/* Porthole Glass Reflection */}
          <path
            d="M62,75 C65,71 72,71 76,75"
            stroke="#FFFFFF"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="66" cy="74" r="2" fill="#FFFFFF" />

          {/* Thruster Nozzle */}
          <rect
            x="58"
            y="145"
            width="24"
            height="9"
            rx="4"
            fill="#C9B8FF"
            stroke="#1E293B"
            strokeWidth="2.5"
          />
        </motion.g>
      </svg>
    </motion.div>
  );
};
export default CartoonSpaceship;
