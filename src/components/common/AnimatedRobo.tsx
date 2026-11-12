import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { dialogueManager } from '../../utils/geminiTTS';
import { RoboCharacter } from './RoboCharacter';
import { Volume2, VolumeX, Loader2, AlertCircle, X } from 'lucide-react';

export type RoboState =
  | 'IDLE'
  | 'TALKING'
  | 'BLINKING'
  | 'HAPPY'
  | 'THINKING'
  | 'EXPLAINING'
  | 'CELEBRATING'
  | 'WARNING';

interface AnimatedRoboProps {
  state?: RoboState;
  spokenText?: string;
  autoSpeak?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'hero';
  showSpeechBubble?: boolean;
  hideCharacterImage?: boolean;
  onBubbleClick?: () => void;
  className?: string;
}

export const AnimatedRobo: React.FC<AnimatedRoboProps> = ({
  state = 'IDLE',
  spokenText,
  autoSpeak = false,
  size = 'md',
  showSpeechBubble = true,
  hideCharacterImage = false,
  onBubbleClick,
  className = ''
}) => {
  const [internalState, setInternalState] = useState<RoboState>(state);
  const [isLoadingAudio, setIsLoadingAudio] = useState<boolean>(false);
  const [isTTSActive, setIsTTSActive] = useState<boolean>(false);
  const [toastError, setToastError] = useState<string | null>(null);

  useEffect(() => {
    setInternalState(state);
  }, [state]);

  // Subscribe to DialogueManager status:
  // - isLoading -> THINKING state
  // - isSpeaking -> TALKING state (synchronized strictly with Web Audio playback)
  // - toastError -> Non-blocking toast if API fails
  useEffect(() => {
    const unsubscribe = dialogueManager.subscribeStatus(
      ({ isLoading, isSpeaking, toastError: err }) => {
        setIsLoadingAudio(isLoading);
        setIsTTSActive(isSpeaking);
        setToastError(err);

        if (isLoading) {
          setInternalState('THINKING');
        } else if (isSpeaking) {
          setInternalState('TALKING');
        } else {
          setInternalState(
            state === 'WARNING' || state === 'CELEBRATING' ? state : 'IDLE'
          );
        }
      }
    );
    return () => unsubscribe();
  }, [state]);

  // Auto-speak when spokenText changes and autoSpeak is true
  useEffect(() => {
    if (!autoSpeak || !spokenText) return;

    dialogueManager.stop();
    const timer = window.setTimeout(() => {
      void dialogueManager.speak(spokenText);
    }, 60);

    return () => {
      window.clearTimeout(timer);
      dialogueManager.stop();
    };
  }, [spokenText, autoSpeak]);

  const handleSpeakClick = () => {
    if (isTTSActive || isLoadingAudio) {
      dialogueManager.stop();
    } else if (spokenText) {
      void dialogueManager.speak(spokenText);
    }
    if (onBubbleClick) onBubbleClick();
  };

  const sizeClasses = {
    sm: 'w-24 h-24 sm:w-28 sm:h-28',
    md: 'w-32 h-32 sm:w-40 sm:h-40',
    lg: 'w-40 h-40 sm:w-52 sm:h-52',
    hero: 'w-48 h-48 sm:w-64 sm:h-64'
  };

  const bubbleTextClasses = {
    sm: 'text-xs sm:text-sm',
    md: 'text-sm sm:text-base',
    lg: 'text-base sm:text-lg',
    hero: 'text-base sm:text-xl'
  };

  const activeVisualState: RoboState = isLoadingAudio
    ? 'THINKING'
    : isTTSActive
    ? 'TALKING'
    : internalState;

  return (
    <div className={`relative flex flex-col items-center select-none ${className}`}>
      {/* Non-Blocking Toast Notification if Gemini TTS API Fails */}
      <AnimatePresence>
        {toastError && (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.9 }}
            dir="rtl"
            className="fixed bottom-4 left-4 z-50 max-w-sm px-4 py-2.5 rounded-2xl bg-slate-900/95 border-2 border-amber-400 text-amber-200 shadow-2xl flex items-center gap-2.5 text-xs sm:text-sm font-hud font-bold"
          >
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
            <span className="flex-1">{toastError}</span>
            <button
              type="button"
              onClick={() => dialogueManager.dismissToastError()}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-300"
              aria-label="إغلاق التنبيه"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Responsive Speech Bubble Component */}
      <AnimatePresence>
        {showSpeechBubble && spokenText && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.95 }}
            transition={{ type: 'spring', damping: 20, stiffness: 260 }}
            onClick={handleSpeakClick}
            dir="rtl"
            className={`cursor-pointer mb-3 w-full max-w-xs sm:max-w-md p-3.5 sm:p-4 rounded-3xl bg-gradient-to-b from-white via-sky-50 to-cyan-100 text-slate-900 border-4 ${
              activeVisualState === 'WARNING'
                ? 'border-rose-500 shadow-[0_0_25px_rgba(244,63,94,0.45)]'
                : 'border-sky-400 shadow-[0_0_25px_rgba(56,189,248,0.45)]'
            } relative backdrop-blur-md transition-transform hover:scale-[1.02] active:scale-[0.98]`}
          >
            {/* Speech Bubble Pointer */}
            <div
              className={`hidden sm:block absolute -bottom-3 right-12 w-5 h-5 bg-cyan-100 border-r-4 border-b-4 ${
                activeVisualState === 'WARNING' ? 'border-rose-500' : 'border-sky-400'
              } transform rotate-45`}
            />

            <div className="flex items-start gap-3">
              <button
                type="button"
                className={`p-2.5 rounded-2xl shrink-0 transition-colors shadow-sm ${
                  isLoadingAudio
                    ? 'bg-amber-400 text-slate-950'
                    : isTTSActive
                    ? 'bg-sky-500 text-white animate-pulse'
                    : 'bg-sky-200/80 text-sky-900 hover:bg-sky-300'
                }`}
                title="اضغط للاستماع إلى روبو"
              >
                {isLoadingAudio ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : isTTSActive ? (
                  <Volume2 className="w-5 h-5" />
                ) : (
                  <VolumeX className="w-5 h-5" />
                )}
              </button>

              <div className="flex-1 text-right">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-sky-200 text-sky-950">
                    روبو • مرشد الفضاء 🤖
                  </span>

                  {isLoadingAudio && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-black text-amber-600">
                      <span>يفكر</span>
                      <span className="inline-flex items-center gap-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-bounce [animation-delay:-0.3s]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-bounce [animation-delay:-0.15s]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-bounce" />
                      </span>
                    </span>
                  )}

                  {!isLoadingAudio && isTTSActive && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-black text-sky-700 animate-pulse">
                      <span>يتحدث الآن... 🔊</span>
                    </span>
                  )}
                </div>

                <p className={`${bubbleTextClasses[size]} font-hud font-black text-slate-900 leading-relaxed`}>
                  {spokenText}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Isolated Cropped PNG Robot Character with Responsive Sizing & Mouth Sync Pulse */}
      {!hideCharacterImage && (
        <motion.div
          onClick={handleSpeakClick}
          animate={{
            y:
              activeVisualState === 'CELEBRATING'
                ? [0, -12, 0]
                : activeVisualState === 'TALKING'
                ? [0, -7, 0]
                : [0, -5, 0],
            rotate:
              activeVisualState === 'THINKING'
                ? [-2, 2, -2]
                : activeVisualState === 'WARNING'
                ? [-3, 3, -3]
                : [0, 1, 0],
            scale: activeVisualState === 'TALKING' ? [1, 1.04, 1] : 1
          }}
          transition={{
            repeat: Infinity,
            duration:
              activeVisualState === 'CELEBRATING'
                ? 0.8
                : activeVisualState === 'TALKING'
                ? 0.45
                : 2.6,
            ease: 'easeInOut'
          }}
          className={`relative cursor-pointer flex items-center justify-center ${sizeClasses[size]}`}
        >
          {/* Canonical Mathematical Vector Robo Character (No Cropped PNGs) */}
          <RoboCharacter
            pose={
              activeVisualState === 'CELEBRATING'
                ? 'CELEBRATING'
                : activeVisualState === 'HAPPY'
                ? 'HAPPY'
                : activeVisualState === 'TALKING'
                ? 'TALKING'
                : activeVisualState === 'THINKING'
                ? 'THINKING'
                : activeVisualState === 'WARNING'
                ? 'WARNING'
                : 'IDLE'
            }
            size="100%"
            animated={false}
            interactive={false}
            showShadow={false}
            className="w-full h-full pointer-events-none drop-shadow-[0_12px_24px_rgba(2,6,23,0.55)]"
          />

          {/* Visual Speaking Wave Ring strictly when audio buffer is playing */}
          {isTTSActive && (
            <motion.div
              animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ repeat: Infinity, duration: 1.1 }}
              className="absolute inset-2 rounded-full border-4 border-cyan-300 pointer-events-none"
            />
          )}

          {/* Floating THINKING Spinner Badge while awaiting Gemini TTS */}
          <AnimatePresence>
            {isLoadingAudio && (
              <motion.div
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.7, opacity: 0 }}
                dir="rtl"
                className="absolute -top-2 right-0 px-3 py-1 rounded-full bg-amber-400 text-slate-950 font-hud font-black text-xs border-2 border-white shadow-lg flex items-center gap-1.5"
              >
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>يفكر...</span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
};
