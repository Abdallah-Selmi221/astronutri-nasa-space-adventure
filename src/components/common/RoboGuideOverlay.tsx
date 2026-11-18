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
  placement?: 'bottom-center' | 'bottom-left';
}

/**
 * Reusable animated Robo Guide speech bubble banner anchored clear of
 * mobile dual-thumb joystick and action buttons.
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
  placement = 'bottom-center',
}) => {
  const isAr = language === 'ar';
  const dir = isAr ? 'rtl' : 'ltr';
  const message = tr(language, messageEn, messageAr);
  const speakerName = tr(language, speakerNameEn, speakerNameAr);
  const actionLabel =
    actionLabelEn && actionLabelAr ? tr(language, actionLabelEn, actionLabelAr) : null;

  // Muted auto-TTS by default: user clicks speaker button to hear Web Speech.
  // Playful fast typewriter text animation + soft Web Audio cartoon UI blips instead.
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
      : 'robo-guide-wrapper pointer-events-none fixed bottom-2.5 inset-x-0 z-30 flex justify-center px-2';

  return (
    <AnimatePresence>
      {visible && (
        <div className={wrapperClass} dir="ltr">
          <motion.aside
            dir={dir}
            key={message}
            initial={{ opacity: 0, y: 18, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.95 }}
            transition={{ duration: 0.24, ease: 'easeOut' }}
            data-testid={testId}
            className="pointer-events-auto relative flex items-center gap-2 sm:gap-2.5 w-full max-w-[355px] sm:max-w-[390px] rounded-2xl bg-slate-950/92 border-2 border-cyan-300/80 shadow-[0_12px_36px_rgba(2,6,23,0.85)] backdrop-blur-md p-2 sm:p-2.5 text-white"
          >
            {/* Animated Robo Avatar */}
            <div className="shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-cyan-500/25 to-indigo-600/35 border border-cyan-300/50 flex items-center justify-center overflow-hidden">
              <RoboCharacter
                pose={pose}
                size={48}
                animated
                interactive={false}
                showShadow={false}
              />
            </div>

            {/* Speech Bubble Text & Action CTA */}
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center justify-between gap-1.5">
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-300/45 text-cyan-200 font-hud font-black text-[9px] sm:text-[10px] leading-none">
                  <span>🤖</span>
                  <span>{speakerName}</span>
                </span>

                <div className="flex items-center gap-1 shrink-0">
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
              </div>

              <p
                onClick={() => setTypedCount(message.length)}
                title={tr(language, 'Tap to reveal full text', 'اضغط لعرض النص كاملاً')}
                className="font-sans text-[11px] sm:text-xs font-semibold text-slate-100 leading-snug line-clamp-2 cursor-pointer"
              >
                {displayedText}
                {isTyping && (
                  <span className="inline-block w-1.5 h-3 ml-0.5 align-middle bg-cyan-300 animate-pulse" />
                )}
              </p>

              {actionLabel && onAction && (
                <button
                  type="button"
                  data-testid="robo-guide-action-btn"
                  onClick={() => {
                    soundManager.playClick();
                    onAction();
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-hud font-black text-[10px] sm:text-[11px] shadow-md cursor-pointer active:scale-95 transition-transform"
                >
                  <span>{actionLabel}</span>
                  <ArrowRight className={`w-3 h-3 ${isAr ? 'rotate-180' : ''}`} />
                </button>
              )}
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
};
