import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameState } from '../../context/GameContext';
import { soundManager } from '../../utils/sound';
import { dialogueManager } from '../../utils/geminiTTS';
import { EventBus } from '../../game/EventBus';
import { PhaserHomeIslandCanvas } from '../../game/PhaserHomeIslandCanvas';
import { SettingsMenu } from '../common/SettingsMenu';
import { WorldMapPreviewModal } from './WorldMapPreviewModal';
import { Star, Settings, Volume2, VolumeX, Map, Sparkles, Navigation } from 'lucide-react';

const WELCOME_DIALOGUE =
  'جاهز للمغامرة يا بطل؟ يلا بينا نطير لحديقة التغذية الفضائية ونستكشف أسرار طعام رواد الفضاء!';

export const HomeWorldScreen: React.FC = () => {
  const { state, setLocation } = useGameState();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isWorldMapOpen, setIsWorldMapOpen] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [activeSpeech, setActiveSpeech] = useState<string>(
    'جاهز للمغامرة يا بطل؟ اضغط على الجزيرة للتحرك، أو اضغط على الصاروخ للانطلاق! 🚀'
  );
  const [interactionToast, setInteractionToast] = useState<{ name: string; message: string } | null>(null);

  // Subscribe to DialogueManager audio playback status
  useEffect(() => {
    const unsub = dialogueManager.subscribeStatus(({ isSpeaking }) => {
      setIsAudioPlaying(isSpeaking);
    });
    return () => unsub();
  }, []);

  // EventBus listeners for Phaser 3 game world interactions
  useEffect(() => {
    const handleLaunchMission = () => {
      dialogueManager.stop();
      soundManager.playFanfare();
      setLocation('NutritionLab');
    };

    const handlePropClicked = (payload: { name: string; message: string }) => {
      setInteractionToast(payload);
      setActiveSpeech(payload.message);
      // Auto-dismiss interaction toast after 3.5s
      const timer = window.setTimeout(() => {
        setInteractionToast(null);
      }, 3500);
      return () => window.clearTimeout(timer);
    };

    const handleRoboGreet = () => {
      soundManager.playClick();
      setActiveSpeech(WELCOME_DIALOGUE);
      if (state.soundEnabled) {
        void dialogueManager.speak(WELCOME_DIALOGUE);
      }
    };

    const handleOpenMap = () => {
      soundManager.playClick();
      setIsWorldMapOpen(true);
    };

    EventBus.on('home-launch-mission', handleLaunchMission);
    EventBus.on('home-prop-clicked', handlePropClicked);
    EventBus.on('home-robo-greet', handleRoboGreet);
    EventBus.on('home-open-world-map', handleOpenMap);

    // Auto-start ambient space BGM if enabled
    soundManager.startBGM();

    return () => {
      EventBus.off('home-launch-mission', handleLaunchMission);
      EventBus.off('home-prop-clicked', handlePropClicked);
      EventBus.off('home-robo-greet', handleRoboGreet);
      EventBus.off('home-open-world-map', handleOpenMap);
      dialogueManager.stop();
    };
  }, [setLocation, state.soundEnabled]);

  const handleSpeakWelcome = () => {
    if (isAudioPlaying) {
      dialogueManager.stop();
    } else {
      soundManager.playClick();
      void dialogueManager.speak(activeSpeech);
    }
  };

  const handleStartAdventureCTA = () => {
    dialogueManager.stop();
    soundManager.playClick();
    // Signal Phaser engine: Robo runs to spaceship and blasts off
    EventBus.emit('home-start-adventure-action');
  };

  // Calculate player stars score
  const completedMissionsCount = [
    state.isNutritionMissionComplete,
    state.isSuitMissionComplete,
    state.engineCoreState.isEngineComplete,
    state.launchPadState.isLevel1Complete
  ].filter(Boolean).length;
  const totalStarsScore = 250 + completedMissionsCount * 50 + state.cargoItems.length * 25;

  return (
    <div
      className="relative flex-1 min-h-[calc(100vh-1rem)] flex flex-col justify-between overflow-hidden select-none"
      style={{
        background: 'radial-gradient(ellipse at 50% 30%, #1a3254 0%, #162744 50%, #0d1a2f 100%)'
      }}
    >
      {/* =====================================================================
          LAYER 1: PHASER 3 2.5D INTERACTIVE GAME ENGINE WORLD
          ===================================================================== */}
      <div className="absolute inset-0 w-full h-full z-0">
        <PhaserHomeIslandCanvas className="w-full h-full" />
      </div>

      {/* =====================================================================
          LAYER 2: TOP HUD (Player Profile, Stars, Map Preview, Settings)
          ===================================================================== */}
      <header className="relative z-30 w-full max-w-6xl mx-auto flex items-center justify-between gap-3 px-4 py-3 sm:px-8 sm:py-5 pointer-events-none">
        {/* Player Cadet Profile Pill */}
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          className="pastel-glass-panel pointer-events-auto flex items-center gap-2.5 sm:gap-3.5 px-3 py-1.5 sm:px-4 sm:py-2"
          dir="rtl"
        >
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-gradient-to-tr from-pastel-yellow via-pastel-pink to-pastel-sky border-2 border-white flex items-center justify-center text-lg sm:text-xl shadow-sm">
            👨‍🚀
          </div>
          <div className="flex flex-col text-right">
            <span className="font-hud font-black text-xs sm:text-sm text-pastel-white">
              {state.cadetName
                ? state.cadetName.startsWith('البطل')
                  ? state.cadetName
                  : `البطل ${state.cadetName}`
                : 'البطل الصغير'}
            </span>
            <span className="font-hud text-[10px] sm:text-xs text-pastel-cyan font-bold">
              رائد فضاء ناشئ • المستوى 1
            </span>
          </div>
        </motion.div>

        {/* Top Right Control Pills */}
        <div className="pointer-events-auto flex items-center gap-2 sm:gap-3">
          {/* Star Counter Pill */}
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="pastel-glass-panel flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 text-pastel-yellow font-hud font-black text-xs sm:text-base"
          >
            <Star className="w-4 h-4 sm:w-5 sm:h-5 fill-pastel-yellow drop-shadow-[0_0_8px_#FFE69A]" />
            <span className="tracking-wide">{totalStarsScore}</span>
            <span className="hidden sm:inline text-xs text-pastel-white/80 font-bold">
              نجمة
            </span>
          </motion.div>

          {/* Proposed World Map Button */}
          <motion.button
            type="button"
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => {
              soundManager.playClick();
              setIsWorldMapOpen(true);
            }}
            className="pastel-glass-panel-interactive flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 text-pastel-sky font-hud font-bold text-xs sm:text-sm"
            aria-label="عرض خريطة الأرخبيل الكوني"
          >
            <Map className="w-4 h-4 sm:w-5 sm:h-5 text-pastel-cyan" />
            <span className="hidden sm:inline">خريطة الجزر</span>
          </motion.button>

          {/* Settings Button */}
          <motion.button
            type="button"
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            whileHover={{ scale: 1.08, rotate: 20 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => {
              soundManager.playClick();
              setIsSettingsOpen(true);
            }}
            className="pastel-glass-panel-interactive w-9 h-9 sm:w-11 sm:h-11 flex items-center justify-center text-pastel-cyan"
            aria-label="إعدادات اللعبة والصوت"
          >
            <Settings className="w-5 h-5 sm:w-5 sm:h-5 stroke-[2.5]" />
          </motion.button>
        </div>
      </header>

      {/* Spacer to push center view completely open for Phaser 3 World */}
      <div className="flex-1 pointer-events-none" />

      {/* =====================================================================
          LAYER 3 & 4: BOTTOM HUD (Speech Bubble, Chunky Adventure CTA, Controls Hint)
          ===================================================================== */}
      <footer className="relative z-30 w-full max-w-2xl mx-auto flex flex-col items-center gap-2.5 px-4 pb-3 sm:pb-6 pointer-events-none">
        {/* Interaction Toast */}
        <AnimatePresence>
          {interactionToast && (
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.9 }}
              dir="rtl"
              className="pointer-events-auto px-4 py-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-hud font-black text-xs sm:text-sm shadow-xl flex items-center gap-2 border border-emerald-200"
            >
              <Sparkles className="w-4 h-4" />
              <span>{interactionToast.message}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dynamic Robo Speech Bubble */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 220 }}
          onClick={handleSpeakWelcome}
          dir="rtl"
          className="pointer-events-auto cursor-pointer bg-white/95 backdrop-blur-md text-slate-900 px-4 py-2 sm:px-5 sm:py-2.5 rounded-3xl border-2 sm:border-3 border-pastel-cyan shadow-[0_12px_32px_rgba(0,0,0,0.35)] flex items-center gap-3 max-w-md hover:scale-105 active:scale-95 transition-transform"
          title="اضغط للاستماع إلى روبو"
        >
          <div
            className={`w-8 h-8 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
              isAudioPlaying
                ? 'bg-pastel-cyan text-slate-950 animate-pulse'
                : 'bg-pastel-sky/30 text-sky-800'
            }`}
          >
            {isAudioPlaying ? (
              <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />
            ) : (
              <VolumeX className="w-4 h-4 sm:w-5 sm:h-5" />
            )}
          </div>
          <div className="flex-1 text-right">
            <span className="block text-[10px] sm:text-xs font-hud font-black text-sky-700">
              روبو • رفيق المغامرة 🤖
            </span>
            <p className="font-hud font-bold text-xs sm:text-sm text-slate-900 leading-snug">
              {activeSpeech}
            </p>
          </div>
        </motion.div>

        {/* Chunky Action Button: "ابدأ المغامرة الفضائية" */}
        <motion.button
          type="button"
          onClick={handleStartAdventureCTA}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="pointer-events-auto btn-chunky-adventure px-8 py-3.5 sm:px-14 sm:py-4 text-xl sm:text-3xl flex items-center gap-3 sm:gap-4 shadow-[0_14px_40px_rgba(255,159,28,0.6)] cursor-pointer"
          dir="rtl"
          aria-label="ابدأ المغامرة الفضائية"
        >
          <span>ابدأ المغامرة الفضائية</span>
          <span className="text-2xl sm:text-4xl filter drop-shadow">🚀</span>
        </motion.button>

        {/* Exploration controls subtitle */}
        <div
          dir="rtl"
          className="flex items-center gap-2 text-center font-hud font-bold text-[11px] sm:text-xs text-pastel-sky/95 drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]"
        >
          <Navigation className="w-3.5 h-3.5 text-pastel-cyan inline" />
          <span>
            المس أو اضغط على أي مكان بالجزيرة لتحريك روبو 🕹️ أو استكشف البلورات والفطر والصاروخ!
          </span>
        </div>
      </footer>

      {/* Proposed World Map Modal */}
      <WorldMapPreviewModal
        isOpen={isWorldMapOpen}
        onClose={() => setIsWorldMapOpen(false)}
        onSelectMission={() => {
          setLocation('NutritionLab');
        }}
      />

      {/* Settings Modal (Self-contained) */}
      <SettingsMenu
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onReplayIntro={handleSpeakWelcome}
      />
    </div>
  );
};
export default HomeWorldScreen;
