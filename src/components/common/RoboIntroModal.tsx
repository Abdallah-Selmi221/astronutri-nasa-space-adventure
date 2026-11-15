import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameState } from '../../context/GameContext';
import { AnimatedRobo } from './AnimatedRobo';
import { dialogueManager } from '../../utils/geminiTTS';
import { soundManager } from '../../utils/sound';
import { Volume2, VolumeX, Star, Loader2 } from 'lucide-react';

export const WELCOME_SPEECH_AR =
  "يااااا مرحباً يا بطل! أنا 'روبو' مساعدك الآلي في أكاديمية الفضاء! جاهز تطير معانا للنجوم؟ يلا بينا نبدأ الرحلة!";

export const RoboIntroModal: React.FC = () => {
  const { state, dismissIntro, toggleSound } = useGameState();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoadingTTS, setIsLoadingTTS] = useState(false);

  useEffect(() => {
    const unsub = dialogueManager.subscribeStatus(({ isLoading, isSpeaking: speaking }) => {
      setIsLoadingTTS(isLoading);
      setIsSpeaking(speaking);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!state.showIntroModal) {
      dialogueManager.stopCurrentSpeech();
      return;
    }

    return () => {
      dialogueManager.stopCurrentSpeech();
    };
  }, [state.showIntroModal]);

  const handleReplaySpeech = () => {
    soundManager.playClick();
    if (isSpeaking || isLoadingTTS) {
      dialogueManager.stopCurrentSpeech();
    } else {
      void dialogueManager.speak(WELCOME_SPEECH_AR, undefined, undefined, undefined, { force: true });
    }
  };

  const handleStartAdventure = () => {
    dialogueManager.stop();
    soundManager.playFanfare();
    dismissIntro();
  };

  if (!state.showIntroModal) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.35 }}
        className="fixed inset-0 z-50 w-screen h-screen bg-[#040b24] overflow-y-auto overflow-x-hidden select-none flex flex-col justify-between p-4 sm:p-8"
      >
        {/* Clean Space Station Bridge Background (Zero Flattened Screenshots) */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#0c2d6b_0%,_#051030_55%,_#020617_100%)]" />
          <div className="absolute inset-0 space-stars opacity-75" />

          {/* Floating 3D Saturn in Space Viewport */}
          <motion.img
            src="/assets/ui/saturn-3d.svg"
            alt=""
            animate={{ y: [0, -10, 0], rotate: [-2, 2, -2] }}
            transition={{ repeat: Infinity, duration: 7, ease: 'easeInOut' }}
            className="absolute top-16 left-[18%] w-28 sm:w-40 object-contain opacity-90"
          />

          {/* Glowing Blue Earth Curvature Horizon */}
          <div className="absolute bottom-[14%] left-1/2 -translate-x-1/2 w-[140%] sm:w-[120%] h-[52%] rounded-t-[100%] bg-gradient-to-b from-sky-300/80 via-blue-600/90 to-indigo-950 border-t-4 border-cyan-200 shadow-[0_-25px_90px_rgba(56,189,248,0.65)]" />

          {/* Reflective Metallic Space Station Floor */}
          <div className="absolute inset-x-0 bottom-0 h-[20%] bg-gradient-to-b from-slate-900/95 via-sky-950 to-slate-950 border-t-4 border-cyan-400/70" />
        </div>

        {/* Top Responsive Audio Controls Bar */}
        <div className="relative z-20 w-full max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 bg-slate-950/85 border-2 border-cyan-400/70 px-4 py-2 rounded-full shadow-lg">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="font-hud font-black text-xs sm:text-sm text-cyan-200">
              أكاديمية الفضاء • البوابة الرئيسية
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleReplaySpeech}
              className="px-4 py-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:brightness-110 text-white font-hud font-black text-xs sm:text-sm border-2 border-cyan-200 shadow-lg flex items-center gap-2 cursor-pointer"
            >
              {isLoadingTTS ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-amber-200" />
                  <span>روبو يفكر...</span>
                </>
              ) : (
                <>
                  <Volume2 className={`w-4 h-4 ${isSpeaking ? 'animate-bounce' : ''}`} />
                  <span>{isSpeaking ? 'يتحدث الآن...' : 'استمع لترحيب روبو 🔊'}</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={toggleSound}
              className="w-11 h-11 rounded-full bg-slate-950/90 border-2 border-cyan-400 text-cyan-300 flex items-center justify-center shadow-lg cursor-pointer"
              title={state.soundEnabled ? 'كتم الصوت' : 'تشغيل الصوت'}
            >
              {state.soundEnabled ? (
                <Volume2 className="w-5 h-5" />
              ) : (
                <VolumeX className="w-5 h-5 text-rose-400" />
              )}
            </button>
          </div>
        </div>

        {/* Main Responsive Hero Grid (Robo + 3D Logo + CTA Button) */}
        <div className="relative z-20 w-full max-w-7xl mx-auto my-auto py-4 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Right Column in RTL (5 cols): Separate Floating AnimatedRobo Component */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center">
            <AnimatedRobo
              state={isLoadingTTS ? 'THINKING' : isSpeaking ? 'TALKING' : 'HAPPY'}
              spokenText={WELCOME_SPEECH_AR}
              autoSpeak={false}
              size="hero"
              showSpeechBubble={true}
              onBubbleClick={handleReplaySpeech}
            />
          </div>

          {/* Left Column in RTL (7 cols): 3D ASTRO NUTRI Logo Shield + Glowing Launch Button */}
          <div className="lg:col-span-7 flex flex-col items-center text-center gap-6">
            <div className="relative px-8 sm:px-14 py-6 rounded-[2.5rem] bg-gradient-to-b from-sky-500 via-blue-800 to-indigo-950 border-4 border-cyan-300 shadow-[0_15px_50px_rgba(6,182,212,0.65)]">
              <motion.img
                src="/assets/ui/rocket-3d.svg"
                alt="Rocket"
                animate={{ y: [0, -6, 0], rotate: [8, 14, 8] }}
                transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
                className="w-20 h-20 sm:w-24 sm:h-24 object-contain mx-auto -mt-12 mb-2 drop-shadow-[0_8px_16px_rgba(0,0,0,0.75)]"
              />

              <div className="font-hud font-black tracking-wider leading-none select-none">
                <div className="text-4xl sm:text-6xl text-white drop-shadow-[0_5px_0_#0c4a6e]">
                  ASTRO
                </div>
                <div className="text-5xl sm:text-7xl text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 via-amber-400 to-orange-500 drop-shadow-[0_6px_0_#78350f]">
                  NUTRI
                </div>
              </div>

              <div className="mt-3 px-5 py-1.5 rounded-2xl bg-gradient-to-r from-blue-950 via-sky-800 to-blue-950 border-2 border-cyan-300/80">
                <span className="font-hud font-black text-xs sm:text-base text-white tracking-wide">
                  Junior Astronaut Mission Trainer
                </span>
              </div>
            </div>

            {/* Responsive Glowing Capsule CTA Button */}
            <div className="flex items-center justify-center gap-3 w-full max-w-lg">
              <Star className="w-8 h-8 text-yellow-300 fill-yellow-400 animate-bounce shrink-0" />
              <motion.button
                type="button"
                whileHover={{ scale: 1.05, y: -3 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleStartAdventure}
                className="flex-1 py-4 sm:py-5 px-8 rounded-full bg-gradient-to-b from-yellow-300 via-amber-500 to-orange-600 text-white font-hud font-black text-xl sm:text-3xl border-4 border-yellow-100 shadow-[0_0_40px_rgba(245,158,11,0.8)] cursor-pointer"
              >
                انطلق إلى المغامرة!
              </motion.button>
              <Star className="w-8 h-8 text-yellow-300 fill-yellow-400 animate-bounce shrink-0" />
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
