import React, { useRef, useState } from 'react';
import { Compass } from 'lucide-react';
import { soundManager } from '../../utils/sound';
import { useGameState } from '../../context/GameContext';
import { tr } from '../../utils/i18n';

export interface SecondaryThumbAction {
  icon: string;
  label: string;
  active?: boolean;
  testId: string;
  onClick: () => void;
}

interface ThirdPersonControlsOverlayProps {
  promptLabelAr: string | null;
  promptSubAr?: string;
  onInteract: () => void;
  onJoystickMove: (vec: { x: number; z: number }) => void;
  onLookDrag?: (dx: number, dy: number) => void;
  onLookStart?: () => void;
  onLookEnd?: () => void;
  onViewportTap?: (clientX: number, clientY: number) => void;
  onJump: () => void;
  onSprintChange?: (sprinting: boolean) => void;
  onAutoWalkNext?: () => void;
  autoWalkLabel?: string | null;
  gravityLabelAr?: string;
  hintAr: string;
  embedded?: boolean;
  jumpMode?: 'jump' | 'boost';
  highlightInteract?: boolean;
  secondaryAction?: SecondaryThumbAction;
}

/**
 * PUBG / Genshin-style dual-thumb landscape touch overlay:
 * - Left 50%: floating virtual analog joystick centered under thumb on touch + sprint outer ring
 * - Right 50%: full-screen invisible silky-smooth camera orbit touch-drag surface + tap passthrough
 * - Bottom-right ergonomic thumb arc: circular Action, Jump/Boost, Vehicle/Fly, and Auto-Guide buttons
 */
export const ThirdPersonControlsOverlay: React.FC<ThirdPersonControlsOverlayProps> = ({
  promptLabelAr,
  onInteract,
  onJoystickMove,
  onLookDrag,
  onLookStart,
  onLookEnd,
  onViewportTap,
  onJump,
  onSprintChange,
  onAutoWalkNext,
  autoWalkLabel,
  embedded = false,
  jumpMode = 'jump',
  highlightInteract = false,
  secondaryAction
}) => {
  const { language } = useGameState();

  const leftZoneRef = useRef<HTMLDivElement | null>(null);
  const leftPointerIdRef = useRef<number | null>(null);
  const joyOriginRef = useRef<{ x: number; y: number } | null>(null);
  const leftDownAtRef = useRef<number>(0);
  const leftMaxDistRef = useRef<number>(0);

  const rightPointerIdRef = useRef<number | null>(null);
  const rightDownPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const rightLastPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const [floatingCenter, setFloatingCenter] = useState<{ x: number; y: number } | null>(null);
  const [knobOffset, setKnobOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [autoSprinting, setAutoSprinting] = useState(false);

  const MAX_JOY_RADIUS = 46;
  const DEADZONE = 0.08;
  const SPRINT_THRESHOLD = 0.82;

  const updateJoystick = (clientX: number, clientY: number) => {
    const origin = joyOriginRef.current;
    if (!origin) return;
    const dx = clientX - origin.x;
    const dy = clientY - origin.y;
    const dist = Math.hypot(dx, dy);
    if (dist > leftMaxDistRef.current) {
      leftMaxDistRef.current = dist;
    }

    const clamped = Math.min(dist, MAX_JOY_RADIUS);
    const angle = Math.atan2(dy, dx);
    const kx = dist > 0.001 ? Math.cos(angle) * clamped : 0;
    const ky = dist > 0.001 ? Math.sin(angle) * clamped : 0;
    setKnobOffset({ x: kx, y: ky });

    const norm = dist / MAX_JOY_RADIUS;
    if (norm < DEADZONE) {
      onJoystickMove({ x: 0, z: 0 });
      if (autoSprinting) {
        setAutoSprinting(false);
        onSprintChange?.(false);
      }
      return;
    }

    const activeStrength = Math.min(1, (norm - DEADZONE) / (1 - DEADZONE));
    onJoystickMove({
      x: Number((Math.cos(angle) * activeStrength).toFixed(3)),
      z: Number((Math.sin(angle) * activeStrength).toFixed(3))
    });

    const wantSprint = norm >= SPRINT_THRESHOLD;
    if (wantSprint !== autoSprinting) {
      setAutoSprinting(wantSprint);
      onSprintChange?.(wantSprint);
    }
  };

  const resetJoystick = (clientX?: number, clientY?: number) => {
    const elapsed = performance.now() - leftDownAtRef.current;
    const quickTap = leftMaxDistRef.current < 7 && elapsed < 240;
    leftPointerIdRef.current = null;
    joyOriginRef.current = null;
    leftMaxDistRef.current = 0;
    setFloatingCenter(null);
    setKnobOffset({ x: 0, y: 0 });
    onJoystickMove({ x: 0, z: 0 });
    if (autoSprinting) {
      setAutoSprinting(false);
      onSprintChange?.(false);
    } else {
      onSprintChange?.(false);
    }
    if (quickTap && clientX !== undefined && clientY !== undefined) {
      onViewportTap?.(clientX, clientY);
    }
  };

  const posMode = embedded ? 'absolute' : 'fixed';
  const interactHint = promptLabelAr || tr(language, 'Action', 'تفاعل');

  return (
    <>
      {/* 1. LEFT 50% OF VIEWPORT — Floating Dynamic Analog Virtual Joystick */}
      <div
        ref={leftZoneRef}
        dir="ltr"
        data-testid="left-joystick-zone"
        onPointerDown={(e) => {
          if (leftPointerIdRef.current !== null) return;
          leftPointerIdRef.current = e.pointerId;
          leftDownAtRef.current = performance.now();
          leftMaxDistRef.current = 0;
          try {
            e.currentTarget.setPointerCapture(e.pointerId);
          } catch {
            // ignore synthetic event capture errors
          }
          const rect = e.currentTarget.getBoundingClientRect();
          const relX = Math.max(52, Math.min(rect.width - 52, e.clientX - rect.left));
          const relY = Math.max(52, Math.min(rect.height - 52, e.clientY - rect.top));
          const absX = rect.left + relX;
          const absY = rect.top + relY;
          joyOriginRef.current = { x: absX, y: absY };
          setFloatingCenter({ x: relX, y: relY });
          updateJoystick(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (leftPointerIdRef.current !== e.pointerId) return;
          updateJoystick(e.clientX, e.clientY);
        }}
        onPointerUp={(e) => {
          if (leftPointerIdRef.current !== e.pointerId) return;
          resetJoystick(e.clientX, e.clientY);
        }}
        onPointerCancel={(e) => {
          if (leftPointerIdRef.current !== e.pointerId) return;
          resetJoystick();
        }}
        className={`${posMode} left-0 top-12 bottom-0 w-1/2 z-10 pointer-events-auto touch-none select-none`}
      >
        {/* Docked or Live Floating Analog Ring */}
        <div
          data-testid="third-person-joystick"
          style={
            floatingCenter
              ? {
                  left: `${floatingCenter.x - 48}px`,
                  top: `${floatingCenter.y - 48}px`
                }
              : undefined
          }
          className={`${
            floatingCenter
              ? 'absolute opacity-95'
              : 'absolute left-4 bottom-4 sm:left-6 sm:bottom-6 opacity-55'
          } w-24 h-24 rounded-full bg-slate-950/35 border-2 ${
            autoSprinting
              ? 'border-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.65)]'
              : 'border-white/55'
          } backdrop-blur-[2px] flex items-center justify-center pointer-events-none transition-opacity duration-100`}
        >
          <div className="w-14 h-14 rounded-full border border-white/25 pointer-events-none" />
          <div
            style={{ transform: `translate(${knobOffset.x}px, ${knobOffset.y}px)` }}
            className={`absolute w-10 h-10 rounded-full border-2 border-white shadow-lg pointer-events-none ${
              autoSprinting
                ? 'bg-gradient-to-br from-cyan-200 via-cyan-400 to-sky-500'
                : 'bg-gradient-to-br from-white via-sky-100 to-cyan-300'
            }`}
          />
        </div>
      </div>

      {/* 2. RIGHT 50% OF VIEWPORT — Full-Screen Invisible Smooth Camera Look Zone */}
      <div
        dir="ltr"
        data-testid="right-camera-look-zone"
        onPointerDown={(e) => {
          if (rightPointerIdRef.current !== null) return;
          rightPointerIdRef.current = e.pointerId;
          rightDownPosRef.current = { x: e.clientX, y: e.clientY };
          rightLastPosRef.current = { x: e.clientX, y: e.clientY };
          try {
            e.currentTarget.setPointerCapture(e.pointerId);
          } catch {
            // ignore synthetic event capture errors
          }
          onLookStart?.();
        }}
        onPointerMove={(e) => {
          if (rightPointerIdRef.current !== e.pointerId) return;
          const dx = e.clientX - rightLastPosRef.current.x;
          const dy = e.clientY - rightLastPosRef.current.y;
          rightLastPosRef.current = { x: e.clientX, y: e.clientY };
          onLookDrag?.(dx, dy);
        }}
        onPointerUp={(e) => {
          if (rightPointerIdRef.current !== e.pointerId) return;
          const totalDist = Math.hypot(
            e.clientX - rightDownPosRef.current.x,
            e.clientY - rightDownPosRef.current.y
          );
          rightPointerIdRef.current = null;
          onLookEnd?.();
          if (totalDist < 7) {
            onViewportTap?.(e.clientX, e.clientY);
          }
        }}
        onPointerCancel={(e) => {
          if (rightPointerIdRef.current !== e.pointerId) return;
          rightPointerIdRef.current = null;
          onLookEnd?.();
        }}
        className={`${posMode} right-0 top-12 bottom-0 w-1/2 z-10 pointer-events-auto touch-none select-none`}
      />

      {/* 3. ERGONOMIC BOTTOM-RIGHT THUMB ARC (Clean Circular Buttons Only) */}
      <div
        dir="ltr"
        className={`${posMode} right-3 bottom-3 sm:right-5 sm:bottom-5 z-20 pointer-events-none flex items-end gap-2.5`}
      >
        {/* Optional Icon-Only Auto-Guide Compass (Outer Arc Left) */}
        {onAutoWalkNext && (
          <button
            type="button"
            data-testid="auto-walk-next-btn"
            onClick={() => {
              soundManager.playClick();
              onAutoWalkNext();
            }}
            aria-label={autoWalkLabel || tr(language, 'Auto-Guide Next Mission', 'توجيه تلقائي للمهمة')}
            title={autoWalkLabel || tr(language, 'Auto-Guide Next Mission', 'توجيه تلقائي للمهمة')}
            className="pointer-events-auto w-11 h-11 rounded-full bg-slate-900/75 hover:bg-cyan-500 hover:text-slate-950 text-cyan-200 border-2 border-cyan-300/80 backdrop-blur-md shadow-lg flex items-center justify-center cursor-pointer active:scale-90 transition-all mb-1"
          >
            <Compass className="w-5 h-5" />
          </button>
        )}

        {/* Secondary Vehicle / Flight Toggle (Moon/Mars Rover or Overworld Fly) */}
        {secondaryAction && (
          <button
            type="button"
            data-testid={secondaryAction.testId}
            onClick={() => {
              soundManager.playClick();
              secondaryAction.onClick();
            }}
            aria-label={secondaryAction.label}
            title={secondaryAction.label}
            className={`pointer-events-auto w-12 h-12 rounded-full border-2 backdrop-blur-md shadow-lg flex items-center justify-center text-lg cursor-pointer active:scale-90 transition-all mb-3 ${
              secondaryAction.active
                ? 'bg-gradient-to-br from-orange-400 to-amber-500 text-slate-950 border-white shadow-[0_0_16px_rgba(251,146,60,0.7)]'
                : 'bg-slate-900/75 hover:bg-slate-800 text-white border-cyan-300/75'
            }`}
          >
            <span>{secondaryAction.icon}</span>
          </button>
        )}

        {/* Primary Contextual Interact / Enter Station Button (B) */}
        <button
          type="button"
          data-testid="third-person-interact-btn"
          onClick={() => {
            soundManager.playClick();
            onInteract();
          }}
          aria-label={interactHint}
          title={interactHint}
          className={`pointer-events-auto w-14 h-14 sm:w-16 sm:h-16 rounded-full border-[3px] border-white flex flex-col items-center justify-center font-hud font-black cursor-pointer active:translate-y-0.5 transition-all mb-5 ${
            highlightInteract
              ? 'bg-gradient-to-b from-amber-300 via-amber-400 to-orange-500 text-slate-950 shadow-[0_0_20px_rgba(251,191,36,0.75)] ring-2 ring-amber-200/70'
              : 'bg-gradient-to-b from-amber-400/90 to-orange-500/90 text-slate-950 shadow-[0_4px_0_rgba(146,64,14,0.85)]'
          }`}
        >
          <span className="text-base sm:text-lg leading-none">B</span>
          <span className="text-[8px] sm:text-[9px] leading-none mt-0.5 uppercase tracking-tight">
            {tr(language, 'Enter', 'دخول')}
          </span>
        </button>

        {/* Primary Jump / Boost Thumb Anchor (A) */}
        <button
          type="button"
          data-testid="third-person-jump-btn"
          onClick={onJump}
          aria-label={
            jumpMode === 'boost' ? tr(language, 'Boost', 'دفع') : tr(language, 'Jump', 'قفز')
          }
          className={`pointer-events-auto w-14 h-14 sm:w-16 sm:h-16 rounded-full border-[3px] border-white flex flex-col items-center justify-center font-hud font-black text-white cursor-pointer active:translate-y-0.5 transition-all ${
            jumpMode === 'boost'
              ? 'bg-gradient-to-b from-cyan-400 via-sky-500 to-blue-600 shadow-[0_4px_0_rgba(3,105,161,0.9)]'
              : 'bg-gradient-to-b from-emerald-400 via-emerald-500 to-teal-600 shadow-[0_4px_0_rgba(6,95,70,0.9)]'
          }`}
        >
          <span className="text-lg sm:text-xl leading-none">
            {jumpMode === 'boost' ? '⚡' : 'A'}
          </span>
          <span className="text-[8px] sm:text-[9px] leading-none mt-0.5 uppercase tracking-tight">
            {jumpMode === 'boost' ? tr(language, 'Boost', 'دفع') : tr(language, 'Jump', 'قفز')}
          </span>
        </button>
      </div>
    </>
  );
};
