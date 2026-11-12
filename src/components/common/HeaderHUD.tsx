import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useGameState } from '../../context/GameContext';
import { SettingsMenu } from './SettingsMenu';
import { soundManager } from '../../utils/sound';
import { geminiTTS } from '../../utils/geminiTTS';
import { Star, Settings, Home } from 'lucide-react';

export const HeaderHUD: React.FC = () => {
  const { state, setLocation } = useGameState();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Calculate readable player star score (starts at 250 as shown in the reference)
  const completedMissionsCount = [
    state.isNutritionMissionComplete,
    state.isSuitMissionComplete,
    state.engineCoreState.isEngineComplete,
    state.launchPadState.isLevel1Complete
  ].filter(Boolean).length;

  const totalStarsScore = 250 + completedMissionsCount * 50 + state.cargoItems.length * 25;

  const handleGoHome = () => {
    geminiTTS.stop();
    soundManager.playClick();
    setLocation('Map');
  };

  return (
    <>
      <header className="fixed top-3 inset-x-0 z-40 px-4 sm:px-8 pointer-events-none select-none">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* C) Simple Home Icon to Return to the Map */}
          <motion.button
            type="button"
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={handleGoHome}
            className="pointer-events-auto w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-b from-sky-400 via-blue-600 to-indigo-900 border-4 border-cyan-200 text-white flex items-center justify-center shadow-[0_8px_25px_rgba(2,6,23,0.65)]"
            aria-label="العودة للخريطة"
          >
            <Home className="w-7 h-7 sm:w-8 sm:h-8 stroke-[2.5]" />
          </motion.button>

          {/* A) Giant Yellow Star Icon + Large Readable Score & B) Large Simple Gear Icon */}
          <div className="pointer-events-auto flex items-center gap-3 sm:gap-4">
            {/* A) Giant Yellow Star + Score */}
            <div className="flex items-center gap-2.5 bg-slate-950/90 border-4 border-cyan-300/80 rounded-full px-5 sm:px-6 py-2 shadow-[0_8px_25px_rgba(2,6,23,0.7)]">
              <Star className="w-8 h-8 sm:w-9 sm:h-9 text-yellow-400 fill-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.9)]" />
              <span className="font-hud font-black text-2xl sm:text-3xl text-white tracking-wider">
                {totalStarsScore}
              </span>
            </div>

            {/* B) Large Simple Gear Icon for Settings/Audio */}
            <motion.button
              type="button"
              whileHover={{ scale: 1.08, rotate: 25 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => {
                soundManager.playClick();
                setIsSettingsOpen(true);
              }}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-b from-sky-400 via-blue-600 to-indigo-900 border-4 border-cyan-200 text-white flex items-center justify-center shadow-[0_8px_25px_rgba(2,6,23,0.65)]"
              aria-label="الإعدادات والصوت"
            >
              <Settings className="w-7 h-7 sm:w-8 sm:h-8 stroke-[2.5]" />
            </motion.button>
          </div>
        </div>
      </header>

      <SettingsMenu
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </>
  );
};
