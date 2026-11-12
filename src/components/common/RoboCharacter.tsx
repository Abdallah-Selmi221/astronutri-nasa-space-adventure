import React from 'react';
import { motion } from 'framer-motion';

export type RoboPose =
  | 'IDLE'
  | 'WAVE'
  | 'TALKING'
  | 'CELEBRATING'
  | 'HAPPY'
  | 'THINKING'
  | 'WARNING';

interface RoboCharacterProps {
  pose?: RoboPose;
  size?: number | string;
  animated?: boolean;
  interactive?: boolean;
  showShadow?: boolean;
  className?: string;
  onClick?: () => void;
}

export const RoboCharacter: React.FC<RoboCharacterProps> = ({
  pose = 'IDLE',
  size = 180,
  animated = true,
  interactive = true,
  showShadow = true,
  className = '',
  onClick
}) => {
  const isHappy = pose === 'HAPPY' || pose === 'CELEBRATING';
  const isTalking = pose === 'TALKING';
  const isWarning = pose === 'WARNING';
  const isThinking = pose === 'THINKING';
  const isWave = pose === 'WAVE';

  // Float animation variants for body
  const floatY = animated
    ? isHappy
      ? [0, -14, 0]
      : isTalking
      ? [0, -8, 0]
      : [0, -10, 0]
    : 0;

  const floatDuration = isHappy ? 0.9 : isTalking ? 0.6 : 3.2;

  return (
    <motion.div
      onClick={onClick}
      whileHover={interactive ? { scale: 1.05 } : undefined}
      whileTap={interactive ? { scale: 0.95 } : undefined}
      className={`relative inline-flex flex-col items-center justify-center select-none ${
        interactive ? 'cursor-pointer' : ''
      } ${className}`}
      style={{
        width: typeof size === 'number' ? `${size}px` : size,
        height: typeof size === 'number' ? `${size * 1.25}px` : 'auto'
      }}
    >
      <svg
        viewBox="0 0 160 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full overflow-visible"
      >
        <defs>
          {/* Key light gradients matching Art Bible (45° top-left) */}
          <linearGradient id="roboChassisGrad" x1="40" y1="30" x2="120" y2="160" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="70%" stopColor="#F8FCFF" />
            <stop offset="100%" stopColor="#DCE8F7" />
          </linearGradient>

          <linearGradient id="roboVisorGrad" x1="54" y1="46" x2="106" y2="80" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1E294B" />
            <stop offset="100%" stopColor="#0F172A" />
          </linearGradient>

          <linearGradient id="roboPlateGrad" x1="62" y1="112" x2="98" y2="140" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#A9F0F8" />
            <stop offset="100%" stopColor="#67D5E6" />
          </linearGradient>

          <filter id="softGlowCyan" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          <filter id="softGlowFlame" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* 1. Ground Dynamic Cast Shadow */}
        {showShadow && (
          <motion.ellipse
            cx="80"
            cy="190"
            rx="42"
            ry="9"
            fill="rgba(13, 19, 38, 0.45)"
            animate={
              animated
                ? {
                    rx: [42, 36, 42],
                    opacity: [0.45, 0.25, 0.45]
                  }
                : {}
            }
            transition={{
              duration: floatDuration,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
          />
        )}

        {/* 2. Character Rig Root with Hover Float */}
        <motion.g
          animate={
            animated
              ? {
                  y: floatY,
                  rotate: isThinking ? [-1.5, 1.5, -1.5] : isWarning ? [-2, 2, -2] : [0, 0.5, 0]
                }
              : {}
          }
          transition={{
            duration: floatDuration,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
          style={{ originX: '80px', originY: '160px' }}
        >
          {/* Anti-Grav Thruster Ring & Flame */}
          <g>
            <ellipse cx="80" cy="154" rx="16" ry="6" fill="#8DE8F4" filter="url(#softGlowCyan)" />
            {/* Pulsing Flame Cone */}
            <motion.path
              d="M72,154 Q80,174 88,154 Z"
              fill="#FFE69A"
              filter="url(#softGlowFlame)"
              animate={animated ? { scaleY: [1, 1.35, 0.9, 1.2, 1] } : {}}
              transition={{ duration: 0.4, repeat: Infinity, ease: 'easeInOut' }}
              style={{ originX: '80px', originY: '154px' }}
            />
            {/* Thruster Metal Rim */}
            <ellipse cx="80" cy="154" rx="14" ry="4.5" fill="#A9C9FF" stroke="#1E293B" strokeWidth="2.5" />
          </g>

          {/* Torso Pill Chassis */}
          <rect
            x="52"
            y="98"
            width="56"
            height="58"
            rx="26"
            fill="url(#roboChassisGrad)"
            stroke="#1E293B"
            strokeWidth="3.5"
          />

          {/* Torso Left Highlight Arc */}
          <path
            d="M58,108 C58,103 62,100 68,100"
            stroke="#FFFFFF"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Chest Accent Plate */}
          <rect
            x="62"
            y="112"
            width="36"
            height="28"
            rx="12"
            fill="url(#roboPlateGrad)"
            stroke="#1E293B"
            strokeWidth="2.5"
          />

          {/* Heart Core (Pulsing Glow) */}
          <motion.circle
            cx="80"
            cy="126"
            r="6"
            fill={isWarning ? '#FF3366' : '#FFC3D8'}
            stroke="#1E293B"
            strokeWidth="1.5"
            animate={animated ? { scale: [1, 1.25, 1] } : {}}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
            style={{ originX: '80px', originY: '126px' }}
          />

          {/* LEFT HAND (Viewer's Left) */}
          {isWave ? (
            // Wave Pose: Left hand stays balanced or slightly buoyant
            <motion.g
              animate={animated ? { y: [0, -3, 0] } : {}}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            >
              <ellipse
                cx="33"
                cy="118"
                rx="10"
                ry="12"
                fill="url(#roboChassisGrad)"
                stroke="#1E293B"
                strokeWidth="3"
                transform="rotate(-15 33 118)"
              />
            </motion.g>
          ) : isHappy ? (
            // Celebrating Pose: Left hand raised in triumph
            <motion.g
              animate={animated ? { rotate: [-10, 10, -10] } : {}}
              transition={{ duration: 0.6, repeat: Infinity, ease: 'easeInOut' }}
              style={{ originX: '34px', originY: '95px' }}
            >
              <ellipse
                cx="30"
                cy="92"
                rx="10"
                ry="12"
                fill="url(#roboChassisGrad)"
                stroke="#1E293B"
                strokeWidth="3"
                transform="rotate(-40 30 92)"
              />
            </motion.g>
          ) : isThinking ? (
            // Thinking Pose: Left hand relaxed
            <ellipse
              cx="34"
              cy="124"
              rx="10"
              ry="12"
              fill="url(#roboChassisGrad)"
              stroke="#1E293B"
              strokeWidth="3"
            />
          ) : (
            // Default / Idle Left Hand
            <motion.g
              animate={animated ? { y: [0, 3, 0] } : {}}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            >
              <ellipse
                cx="34"
                cy="124"
                rx="10"
                ry="12"
                fill="url(#roboChassisGrad)"
                stroke="#1E293B"
                strokeWidth="3"
              />
            </motion.g>
          )}

          {/* RIGHT HAND (Viewer's Right) */}
          {isWave ? (
            // Wave Pose: Right Hand Raised and Oscillating
            <motion.g
              animate={
                animated
                  ? {
                      rotate: [15, 35, 15],
                      y: [0, -4, 0]
                    }
                  : { rotate: 25 }
              }
              transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
              style={{ originX: '128px', originY: '88px' }}
            >
              <ellipse
                cx="128"
                cy="85"
                rx="10"
                ry="12"
                fill="url(#roboChassisGrad)"
                stroke="#1E293B"
                strokeWidth="3"
                transform="rotate(25 128 85)"
              />
              {/* Palm creases */}
              <path
                d="M124,78 Q132,74 136,82"
                stroke="#1E293B"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </motion.g>
          ) : isHappy ? (
            // Celebrating Pose: Right Hand Raised High
            <motion.g
              animate={animated ? { rotate: [10, -10, 10] } : {}}
              transition={{ duration: 0.6, repeat: Infinity, ease: 'easeInOut' }}
              style={{ originX: '126px', originY: '95px' }}
            >
              <ellipse
                cx="130"
                cy="92"
                rx="10"
                ry="12"
                fill="url(#roboChassisGrad)"
                stroke="#1E293B"
                strokeWidth="3"
                transform="rotate(40 130 92)"
              />
            </motion.g>
          ) : isThinking ? (
            // Thinking Pose: Hand Touching Visor Chin
            <motion.g
              animate={animated ? { y: [0, -2, 0] } : {}}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <ellipse
                cx="108"
                cy="78"
                rx="10"
                ry="11"
                fill="url(#roboChassisGrad)"
                stroke="#1E293B"
                strokeWidth="3"
                transform="rotate(-25 108 78)"
              />
            </motion.g>
          ) : (
            // Default / Idle Right Hand
            <motion.g
              animate={animated ? { y: [0, -3, 0] } : {}}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            >
              <ellipse
                cx="126"
                cy="124"
                rx="10"
                ry="12"
                fill="url(#roboChassisGrad)"
                stroke="#1E293B"
                strokeWidth="3"
              />
            </motion.g>
          )}

          {/* SPHERICAL HEAD */}
          <g>
            {/* Head Base */}
            <circle
              cx="80"
              cy="62"
              r="38"
              fill="url(#roboChassisGrad)"
              stroke="#1E293B"
              strokeWidth="3.5"
            />

            {/* Specular Top Reflection / Gloss */}
            <ellipse
              cx="80"
              cy="32"
              rx="18"
              ry="6"
              fill="#FFFFFF"
              fillOpacity="0.8"
            />

            {/* Antenna Stalk & Beacon */}
            <line
              x1="80"
              y1="24"
              x2="80"
              y2="12"
              stroke="#1E293B"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <motion.circle
              cx="80"
              cy="10"
              r="5.5"
              fill={isWarning ? '#FF3366' : '#FFD166'}
              stroke="#1E293B"
              strokeWidth="2.5"
              animate={animated ? { scale: [1, 1.25, 1] } : {}}
              transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
              style={{ originX: '80px', originY: '10px' }}
            />

            {/* CURVED VISOR SCREEN */}
            <rect
              x="54"
              y="46"
              width="52"
              height="34"
              rx="16"
              fill="url(#roboVisorGrad)"
              stroke="#1E293B"
              strokeWidth="2.5"
            />

            {/* Visor Glass Reflection Stripe */}
            <path
              d="M58,54 C68,49 84,49 100,54"
              stroke="rgba(255, 255, 255, 0.25)"
              strokeWidth="2"
              strokeLinecap="round"
            />

            {/* VISOR LED EXPRESSIONS */}
            {isHappy ? (
              // Happy / Celebrating: Crescent ^ ^ eyes & big smile
              <g>
                <path
                  d="M63,62 Q68,54 73,62"
                  stroke="#8DE8F4"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
                <path
                  d="M87,62 Q92,54 97,62"
                  stroke="#8DE8F4"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
                <path
                  d="M72,68 Q80,77 88,68"
                  stroke="#8DE8F4"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </g>
            ) : isWarning ? (
              // Warning: Angled eyebrows & flat mouth
              <g>
                <line x1="64" y1="56" x2="73" y2="60" stroke="#FF5470" strokeWidth="3" strokeLinecap="round" />
                <line x1="96" y1="56" x2="87" y2="60" stroke="#FF5470" strokeWidth="3" strokeLinecap="round" />
                <circle cx="68" cy="63" r="3.5" fill="#FF5470" />
                <circle cx="92" cy="63" r="3.5" fill="#FF5470" />
                <line x1="74" y1="72" x2="86" y2="72" stroke="#FF5470" strokeWidth="2.5" strokeLinecap="round" />
              </g>
            ) : isTalking ? (
              // Talking: Wide bright eyes & animated mouth arc
              <g>
                <circle cx="68" cy="60" r="4.5" fill="#8DE8F4" />
                <circle cx="92" cy="60" r="4.5" fill="#8DE8F4" />
                <motion.ellipse
                  cx="80"
                  cy="71"
                  rx="6"
                  ry="4"
                  fill="#8DE8F4"
                  animate={{ ry: [2, 5, 2] }}
                  transition={{ duration: 0.25, repeat: Infinity }}
                />
              </g>
            ) : isThinking ? (
              // Thinking: Eyes shifted slightly upward-left & inquiring expression
              <g>
                <circle cx="66" cy="57" r="4" fill="#FFE69A" />
                <circle cx="90" cy="57" r="4" fill="#FFE69A" />
                <ellipse cx="80" cy="71" rx="4" ry="2" fill="#FFE69A" />
              </g>
            ) : (
              // Default / Idle: Bright LED eyes with automatic natural blink
              <g>
                <motion.ellipse
                  cx="68"
                  cy="60"
                  rx="4.5"
                  ry="4.5"
                  fill="#8DE8F4"
                  animate={
                    animated
                      ? {
                          scaleY: [1, 1, 0.1, 1, 1]
                        }
                      : {}
                  }
                  transition={{
                    duration: 3.5,
                    repeat: Infinity,
                    times: [0, 0.88, 0.92, 0.96, 1]
                  }}
                  style={{ originX: '68px', originY: '60px' }}
                />
                <motion.ellipse
                  cx="92"
                  cy="60"
                  rx="4.5"
                  ry="4.5"
                  fill="#8DE8F4"
                  animate={
                    animated
                      ? {
                          scaleY: [1, 1, 0.1, 1, 1]
                        }
                      : {}
                  }
                  transition={{
                    duration: 3.5,
                    repeat: Infinity,
                    times: [0, 0.88, 0.92, 0.96, 1]
                  }}
                  style={{ originX: '92px', originY: '60px' }}
                />
                {/* Cheerful small smile arc */}
                <path
                  d="M72,69 Q80,75 88,69"
                  stroke="#8DE8F4"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </g>
            )}
          </g>
        </motion.g>
      </svg>
    </motion.div>
  );
};
export default RoboCharacter;
