import React, { useRef, useState } from 'react';
import { DoorOpen, Sparkles, Zap } from 'lucide-react';
import { soundManager } from '../../utils/sound';

interface ThirdPersonControlsOverlayProps {
  promptLabelAr: string | null;
  promptSubAr?: string;
  onInteract: () => void;
  onJoystickMove: (vec: { x: number; z: number }) => void;
  onJump: () => void;
  onSprintChange?: (sprinting: boolean) => void;
  gravityLabelAr?: string;
  hintAr: string;
}

export const ThirdPersonControlsOverlay: React.FC<ThirdPersonControlsOverlayProps> = ({
  promptLabelAr,
  promptSubAr,
  onInteract,
  onJoystickMove,
  onJump,
  onSprintChange,
  gravityLabelAr,
  hintAr
}) => {
  const padRef = useRef<HTMLDivElement | null>(null);
  const [knobOffset, setKnobOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [sprinting, setSprinting] = useState(false);

  const updateJoystickFromPointer = (clientX: number, clientY: number) => {
    const el = padRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxR = rect.width * 0.36;
    const dx = clientX - cx;
    const dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    const clamped = Math.min(dist, maxR);
    const angle = Math.atan2(dy, dx);
    const kx = Math.cos(angle) * clamped;
    const ky = Math.sin(angle) * clamped;
    setKnobOffset({ x: kx, y: ky });
    onJoystickMove({
      x: Number((kx / maxR).toFixed(2)),
      z: Number((ky / maxR).toFixed(2))
    });
  };

  const resetJoystick = () => {
    setDragging(false);
    setKnobOffset({ x: 0, y: 0 });
    onJoystickMove({ x: 0, z: 0 });
  };

  return (
    <div
      dir="ltr"
      className="pointer-events-none fixed inset-x-0 bottom-3 z-30 px-3 sm:px-6 flex items-end justify-between gap-2"
    >
      {/* Bottom-Left: Minimalist Transparent Circular Analog Thumbstick */}
      <div className="pointer-events-auto flex flex-col items-start gap-1.5 shrink-0">
        <div
          ref={padRef}
          data-testid="third-person-joystick"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            setDragging(true);
            updateJoystickFromPointer(e.clientX, e.clientY);
          }}
          onPointerMove={(e) => {
            if (!dragging) return;
            updateJoystickFromPointer(e.clientX, e.clientY);
          }}
          onPointerUp={resetJoystick}
          onPointerCancel={resetJoystick}
          className="relative w-20 h-20 sm:w-28 sm:h-28 rounded-full bg-slate-900/45 border-[3px] border-white/55 backdrop-blur-md shadow-[0_6px_18px_rgba(15,23,42,0.45)] flex items-center justify-center touch-none cursor-grab active:cursor-grabbing"
          aria-label="عصا التحكم الثلاثية الأبعاد"
        >
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border border-white/30 pointer-events-none" />
          <div
            style={{ transform: `translate(${knobOffset.x}px, ${knobOffset.y}px)` }}
            className="absolute w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-white via-cyan-200 to-sky-400 border-2 border-white shadow-lg pointer-events-none transition-transform duration-75"
          />
        </div>
        <span
          dir="rtl"
          className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950/60 border border-white/25 text-[11px] font-hud font-bold text-white/90 backdrop-blur-md"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span>{hintAr}</span>
        </span>
      </div>

      {/* Bottom-Right: Super Bear Adventure Circular Arcade Buttons (B Interact + A Jump + Sprint) */}
      <div className="pointer-events-auto flex flex-col items-end gap-2 max-w-[65vw] sm:max-w-none shrink-0">
        {/* Contextual Target Pill Floating Cleanly Above A/B */}
        {promptLabelAr && (
          <button
            type="button"
            dir="rtl"
            onClick={() => {
              soundManager.playClick();
              onInteract();
            }}
            className="casual-btn-primary px-3.5 py-1.5 text-xs sm:text-sm flex items-center gap-1.5 max-w-[240px] sm:max-w-[380px] cursor-pointer shadow-xl"
          >
            <DoorOpen className="w-4 h-4 shrink-0" />
            <span className="truncate">{promptLabelAr}</span>
            {promptSubAr && (
              <span className="hidden lg:inline px-2 py-0.5 rounded-full bg-slate-950/15 text-[10px] font-bold">
                {promptSubAr}
              </span>
            )}
          </button>
        )}

        <div className="flex items-end gap-2.5">
          {gravityLabelAr && (
            <span
              dir="rtl"
              className="hidden sm:inline-flex px-2.5 py-1 rounded-full bg-slate-950/60 border border-white/30 text-[10px] font-hud font-bold text-cyan-100 backdrop-blur-md whitespace-nowrap mb-2"
            >
              {gravityLabelAr}
            </span>
          )}

          {onSprintChange && (
            <button
              type="button"
              data-testid="third-person-sprint-btn"
              onClick={() => {
                const next = !sprinting;
                setSprinting(next);
                onSprintChange(next);
              }}
              aria-label="جري سريع"
              className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full border-2 border-b-4 flex items-center justify-center cursor-pointer backdrop-blur-md transition-all active:translate-y-0.5 ${
                sprinting
                  ? 'bg-cyan-400 text-slate-950 border-white shadow-[0_0_16px_rgba(34,211,238,0.65)]'
                  : 'bg-slate-900/55 text-cyan-200 border-white/60 hover:bg-slate-800/75'
              }`}
            >
              <Zap className="w-5 h-5" />
            </button>
          )}

          {/* B = Interact (Transparent Glossy Golden Arcade Circle) */}
          <button
            type="button"
            data-testid="third-person-interact-btn"
            onClick={() => {
              soundManager.playClick();
              onInteract();
            }}
            aria-label="B - دخول وتفاعل"
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-b from-amber-300/95 via-amber-400/95 to-orange-500/95 border-[3px] border-white shadow-[0_5px_0_rgba(146,64,14,0.9),0_8px_20px_rgba(245,158,11,0.45)] flex flex-col items-center justify-center font-hud font-black text-slate-950 cursor-pointer active:translate-y-1 transition-all"
          >
            <span className="text-lg sm:text-xl leading-none">B</span>
            <span className="text-[8px] sm:text-[9px] leading-none mt-0.5">تفاعل</span>
          </button>

          {/* A = Jump (Transparent Glossy Emerald Arcade Circle) */}
          <button
            type="button"
            data-testid="third-person-jump-btn"
            onClick={onJump}
            aria-label="A - قفز"
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-b from-emerald-300/95 via-emerald-500/95 to-teal-600/95 border-[3px] border-white shadow-[0_6px_0_rgba(6,95,70,0.9),0_8px_20px_rgba(16,185,129,0.45)] flex flex-col items-center justify-center font-hud font-black text-white cursor-pointer active:translate-y-1 transition-all"
          >
            <span className="text-xl sm:text-2xl leading-none drop-shadow">A</span>
            <span className="text-[9px] sm:text-[10px] leading-none mt-0.5">قفز</span>
          </button>
        </div>
      </div>
    </div>
  );
};
