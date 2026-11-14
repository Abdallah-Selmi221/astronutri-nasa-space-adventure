import React, { useRef, useState } from 'react';
import { DoorOpen, ArrowUpCircle, Sparkles } from 'lucide-react';
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
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-30 px-4 sm:px-6 flex items-end justify-between gap-3">
      {/* Bottom-Left: Touch / Mouse Analog Joystick */}
      <div className="pointer-events-auto flex flex-col items-start gap-2">
        <div
          ref={padRef}
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
          className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-slate-950/75 border-2 border-cyan-400/70 backdrop-blur-md shadow-[0_0_24px_rgba(34,211,238,0.28)] flex items-center justify-center touch-none cursor-grab active:cursor-grabbing"
          aria-label="عصا التحكم الثلاثية الأبعاد"
        >
          <div className="w-14 h-14 rounded-full border border-cyan-400/25 pointer-events-none" />
          <div
            style={{ transform: `translate(${knobOffset.x}px, ${knobOffset.y}px)` }}
            className="absolute w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-br from-cyan-300 to-sky-500 border-2 border-white shadow-lg pointer-events-none transition-transform duration-75"
          />
        </div>
        <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950/80 border border-slate-700 text-[11px] font-bold text-slate-300 backdrop-blur-md">
          <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
          <span>{hintAr}</span>
        </span>
      </div>

      {/* Bottom-Center: SINGLE Non-Overlapping Floating Enter Prompt */}
      <div className="pointer-events-none flex-1 flex flex-col items-center justify-end pb-1">
        {promptLabelAr && (
          <button
            type="button"
            data-testid="third-person-interact-btn"
            onClick={() => {
              soundManager.playClick();
              onInteract();
            }}
            className="pointer-events-auto px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 text-slate-950 font-hud font-black text-xs sm:text-base border-2 border-white shadow-[0_6px_0_#b45309,0_0_28px_rgba(251,191,36,0.55)] hover:brightness-110 active:translate-y-0.5 transition-all cursor-pointer flex items-center gap-2 max-w-[90vw]"
          >
            <DoorOpen className="w-5 h-5 shrink-0" />
            <span className="truncate">[E] • {promptLabelAr}</span>
            {promptSubAr && (
              <span className="hidden md:inline px-2 py-0.5 rounded-full bg-slate-950/20 text-[11px] font-bold">
                {promptSubAr}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Bottom-Right: Jump (Space) & Run Toggle */}
      <div className="pointer-events-auto flex flex-col items-end gap-2">
        {gravityLabelAr && (
          <span className="px-2.5 py-0.5 rounded-full bg-slate-950/85 border border-cyan-400/50 text-[10px] font-mono font-bold text-cyan-200 backdrop-blur-md">
            {gravityLabelAr}
          </span>
        )}
        <div className="flex items-center gap-2">
          {onSprintChange && (
            <button
              type="button"
              onClick={() => {
                const next = !sprinting;
                setSprinting(next);
                onSprintChange(next);
              }}
              className={`px-3 py-2.5 rounded-2xl border-2 font-hud font-black text-xs cursor-pointer backdrop-blur-md transition-all ${
                sprinting
                  ? 'bg-cyan-400 text-slate-950 border-white shadow-[0_0_16px_rgba(34,211,238,0.5)]'
                  : 'bg-slate-950/80 text-cyan-200 border-cyan-400/50'
              }`}
            >
              ⚡ جري
            </button>
          )}
          <button
            type="button"
            data-testid="third-person-jump-btn"
            onClick={() => {
              soundManager.playClick();
              onJump();
            }}
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-b from-sky-400 to-indigo-600 text-white border-2 border-white shadow-[0_5px_0_#1e3a8a,0_0_24px_rgba(56,189,248,0.45)] active:translate-y-0.5 flex flex-col items-center justify-center font-hud font-black text-xs cursor-pointer"
          >
            <ArrowUpCircle className="w-6 h-6 mb-0.5" />
            <span>قفز</span>
          </button>
        </div>
      </div>
    </div>
  );
};
