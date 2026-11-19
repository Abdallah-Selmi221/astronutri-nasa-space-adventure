import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, X, ArrowRight } from 'lucide-react';
import { RoboCharacter, type RoboPose } from './RoboCharacter';
import { tr, speakWebSpeechNonBlocking } from '../../utils/i18n';
import { soundManager } from '../../utils/sound';
import type { AppLanguage } from '../../types/game';

export interface RoboGuideOverlayProps {
  visible: boolean;
  language: AppLanguage;
  pose?: RoboPose;
  speakerNameEn?: string;
  speakerNameAr?: string;
  messageEn: string;
  messageAr: string;
  actionLabelEn?: string;
  actionLabelAr?: string;
  onAction?: () => void;
  onDismiss?: () => void;
  testId?: string;
  placement?: 'top-left' | 'bottom-center' | 'bottom-left';
}

/**
 * Low-profile animated Robo Guide speech pill anchored near the top-left
 * below the ultra-slim 36px HUD bar so the 3D astronaut character and
 * bottom dual-thumb mobile controls remain 100% unobstructed.
 */
export const RoboGuideOverlay: React.FC<RoboGuideOverlayProps> = ({
  visible,
  language,
  pose = 'TALKING',
  speakerNameEn = 'Robo Guide',
  speakerNameAr = 'روبو المرشد',
  messageEn,
  messageAr,
  actionLabelEn,
  actionLabelAr,
  onAction,
  onDismiss,
  testId = 'robo-guide-overlay',
  placement = 'top-left'
}) => {
  const isAr = language === 'ar';
  const dir = isAr ? 'rtl' : 'ltr';
  const message = tr(language, messageEn, messageAr);
  const speakerName = tr(language, speakerNameEn, speakerNameAr);
  const actionLabel =
    actionLabelEn && actionLabelAr ? tr(language, actionLabelEn, actionLabelAr) : null;

  // Muted auto-TTS by default: user clicks speaker button to hear Web Speech.
  // Fast typewriter text animation + soft Web Audio UI blips instead.
  const [typedCount, setTypedCount] = useState<number>(0);

  useEffect(() => {
    if (!visible) {
      setTypedCount(0);
      return;
    }
    setTypedCount(0);
    let tick = 0;
    let blips = 0;
    const timer = window.setInterval(() => {
      tick++;
      setTypedCount((prev) => {
        const next = Math.min(message.length, prev + 2);
        if (next >= message.length) {
          window.clearInterval(timer);
        }
        return next;
      });
      if (tick % 5 === 1 && blips < 8) {
        blips++;
        soundManager.playRoboBlip(blips);
      }
    }, 22);
    return () => window.clearInterval(timer);
  }, [message, visible]);

  const isTyping = typedCount < message.length;
  const displayedText = message.slice(0, typedCount);

  const wrapperClass =
    placement === 'bottom-left'
      ? 'robo-guide-wrapper robo-guide-left pointer-events-none fixed bottom-3 left-3 z-30 flex justify-start'
      : placement === 'bottom-center'
      ? 'robo-guide-wrapper pointer-events-none fixed bottom-2.5 inset-x-0 z-30 flex justify-center px-2'
      : 'robo-guide-wrapper robo-guide-top-left pointer-events-none fixed top-11 left-2 sm:top-[52px] sm:left-3 z-30 flex justify-start max-w-[calc(100vw-16px)]';

  return (
    <AnimatePresence>
      {visible && (
        <div className={wrapperClass} dir="ltr">
          <motion.aside
            dir={dir}
            key={message}
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            data-testid={testId}
            aria-label={speakerName}
            className="pointer-events-auto relative flex items-center gap-1.5 sm:gap-2 w-auto max-w-[348px] sm:max-w-[400px] max-h-[58px] sm:max-h-[64px] rounded-2xl bg-slate-950/90 border border-cyan-300/75 shadow-[0_8px_24px_rgba(2,6,23,0.75)] backdrop-blur-md px-2 py-1 text-white overflow-hidden"
          >
            {/* Compact Animated Robo Avatar */}
            <div className="shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-cyan-500/25 to-indigo-600/35 border border-cyan-300/50 flex items-center justify-center overflow-hidden">
              <RoboCharacter
                pose={pose}
                size={34}
                animated
                interactive={false}
                showShadow={false}
              />
            </div>

            {/* Compact 1–2 Line Speech Text */}
            <p
              onClick={() => setTypedCount(message.length)}
              title={tr(language, 'Tap to reveal full text', 'اضغط لعرض النص كاملاً')}
              className="min-w-0 flex-1 font-sans text-[10.5px] sm:text-xs font-semibold text-slate-100 leading-tight line-clamp-2 cursor-pointer"
            >
              {displayedText}
              {isTyping && (
                <span className="inline-block w-1 h-2.5 ms-0.5 align-middle bg-cyan-300 animate-pulse" />
              )}
            </p>

            {/* Inline Action Chip + Manual Speaker + Dismiss */}
            <div className="flex items-center gap-1 shrink-0">
              {actionLabel && onAction && (
                <button
                  type="button"
                  data-testid="robo-guide-action-btn"
                  onClick={() => {
                    soundManager.playClick();
                    onAction();
                  }}
                  className="inline-flex items-center gap-0.5 px-2 py-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-hud font-black text-[10px] shadow cursor-pointer active:scale-95 transition-transform whitespace-nowrap max-w-[96px]"
                >
                  <span className="truncate">{actionLabel}</span>
                  <ArrowRight className={`w-2.5 h-2.5 shrink-0 ${isAr ? 'rotate-180' : ''}`} />
                </button>
              )}

              <button
                type="button"
                aria-label={tr(language, 'Listen', 'استمع')}
                onClick={() => {
                  soundManager.playClick();
                  speakWebSpeechNonBlocking(message, language);
                }}
                className="w-6 h-6 rounded-full bg-indigo-500/35 hover:bg-indigo-500/60 border border-indigo-300/50 text-cyan-100 flex items-center justify-center cursor-pointer transition-colors"
              >
                <Volume2 className="w-3 h-3" />
              </button>

              {onDismiss && (
                <button
                  type="button"
                  data-testid="robo-guide-dismiss-btn"
                  aria-label={tr(language, 'Dismiss Robo', 'إغلاق مرشد روبو')}
                  onClick={() => {
                    soundManager.playClick();
                    onDismiss();
                  }}
                  className="w-6 h-6 rounded-full bg-slate-800/90 hover:bg-rose-500/80 border border-slate-600/70 text-slate-200 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
};
