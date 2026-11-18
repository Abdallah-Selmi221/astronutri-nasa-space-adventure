import React, { useEffect, useState } from 'react';
import { useGameState } from '../../context/GameContext';
import { toggleFullscreenLandscape } from '../../utils/displaySettings';
import { soundManager } from '../../utils/sound';
import { tr } from '../../utils/i18n';

function detectMobilePortrait(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerHeight > window.innerWidth && window.innerWidth < 768;
}

export const LandscapeOrientationGuard: React.FC = () => {
  const { language } = useGameState();
  const [isMobilePortrait, setIsMobilePortrait] = useState<boolean>(() => detectMobilePortrait());

  useEffect(() => {
    const updateOrientation = () => {
      setIsMobilePortrait(detectMobilePortrait());
    };

    updateOrientation();
    window.addEventListener('resize', updateOrientation);
    window.addEventListener('orientationchange', updateOrientation);

    const scrOrientation = (window.screen as { orientation?: ScreenOrientation } | undefined)?.orientation;
    scrOrientation?.addEventListener?.('change', updateOrientation);

    return () => {
      window.removeEventListener('resize', updateOrientation);
      window.removeEventListener('orientationchange', updateOrientation);
      scrOrientation?.removeEventListener?.('change', updateOrientation);
    };
  }, []);

  if (!isMobilePortrait) {
    return null;
  }

  return (
    <div
      data-testid="landscape-orientation-guard"
      dir={language === 'ar' ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#04091a]/98 backdrop-blur-xl p-6 text-center select-none overflow-hidden overscroll-none"
    >
      <div className="max-w-sm w-full space-y-5 flex flex-col items-center">
        {/* Animated Rotating Phone Illustration */}
        <div className="relative w-32 h-32 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-cyan-400/20 blur-2xl animate-pulse" />
          <svg viewBox="0 0 140 140" className="w-28 h-28 overflow-visible">
            {/* Glowing Stars */}
            <circle cx="22" cy="28" r="2.5" fill="#fde047" />
            <circle cx="118" cy="30" r="2" fill="#38bdf8" />
            <circle cx="116" cy="112" r="2.5" fill="#fde047" />
            <circle cx="24" cy="110" r="2" fill="#38bdf8" />

            {/* Curved Rotation Arrow */}
            <path
              d="M 32 48 A 42 42 0 0 1 94 26"
              fill="none"
              stroke="#fbbf24"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeDasharray="6 4"
            />
            <polygon points="98,27 87,20 91,33" fill="#fbbf24" />

            {/* Animated Phone Body */}
            <g className="animate-rotate-phone">
              <rect
                x="48"
                y="32"
                width="44"
                height="76"
                rx="9"
                fill="#0f172a"
                stroke="#38bdf8"
                strokeWidth="3.5"
              />
              <rect x="53" y="42" width="34" height="54" rx="4" fill="#082f49" />
              <circle cx="70" cy="69" r="9" fill="#22d3ee" opacity="0.85" />
              <circle cx="70" cy="102" r="2.5" fill="#7dd3fc" />
            </g>
          </svg>
        </div>

        <div className="space-y-2">
          <h2 className="font-hud font-black text-2xl text-white">
            {tr(language, 'Rotate Your Device to Play!', 'لف جهازك بالعرض للعب!')}
          </h2>
          <p className="text-sm font-bold text-cyan-200 leading-relaxed">
            {tr(
              language,
              'AstroNutri is a wide-screen space adventure designed for horizontal landscape mode.',
              'مغامرة أسترونوتري مصممة للعرض الأفقي الكامل لتجربة لعب مريحة وواضحة.'
            )}
          </p>
        </div>

        <button
          type="button"
          data-testid="enter-landscape-fullscreen-btn"
          onClick={() => {
            soundManager.playClick();
            void toggleFullscreenLandscape();
          }}
          className="w-full py-3.5 px-5 rounded-full bg-gradient-to-r from-amber-400 via-yellow-300 to-cyan-400 hover:brightness-110 active:scale-95 text-slate-950 font-hud font-black text-sm border-2 border-white shadow-[0_6px_0_#b45309] cursor-pointer transition-transform"
        >
          {tr(language, 'Lock Landscape Fullscreen 📱', 'تفعيل ملء الشاشة بالعرض 📱')}
        </button>
      </div>
    </div>
  );
};
