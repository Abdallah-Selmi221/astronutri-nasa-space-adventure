import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useGameState } from '../../context/GameContext';
import { SettingsMenu } from './SettingsMenu';
import { NasaMissionControlDrawer } from './NasaMissionControlDrawer';
import { soundManager } from '../../utils/sound';
import { geminiTTS } from '../../utils/geminiTTS';
import { Settings, Home, Satellite } from 'lucide-react';

export const HeaderHUD: React.FC = () => {
  const { state, setLocation, setCampaignView } = useGameState();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNasaOpen, setIsNasaOpen] = useState(false);

  // Synchronized star score across Campaign Hub & SpaceScience
  const campaignCompletedCount = state.campaign?.completedMiniGames.length || 0;
  const totalStarsScore = 250 + campaignCompletedCount * 25 + state.cargoItems.length * 15;

  const handleGoHome = () => {
    geminiTTS.stop();
    soundManager.playClick();
    setCampaignView('world_map', state.campaign?.activeLevel || 1, null, null);
    setLocation('Map');
  };

  // On the Home World screen, HomeWorldScreen renders its own integrated pastel HUD
  if (state.currentLocation === 'Map') {
    return null;
  }

  return (
    <>
      <header className="fixed top-2.5 inset-x-0 z-40 px-2.5 sm:px-6 pointer-events-none select-none">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          {/* C) Casual Pill Home Button */}
          <motion.button
            type="button"
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            onClick={handleGoHome}
            className="pointer-events-auto casual-btn-cyan w-11 h-11 sm:w-13 sm:h-13 flex items-center justify-center cursor-pointer shrink-0"
            aria-label="العودة للخريطة"
          >
            <Home className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
          </motion.button>

          {/* A) Giant Yellow Star Badge + NASA Data & Settings */}
          <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* NASA Live Data Button */}
            <motion.button
              type="button"
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.94 }}
              onClick={() => {
                soundManager.playClick();
                setIsNasaOpen(true);
              }}
              className="casual-pill w-11 h-11 sm:w-13 sm:h-13 flex items-center justify-center relative cursor-pointer hover:brightness-110"
              aria-label="بيانات ناسا الحية"
            >
              <Satellite className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.2] text-cyan-200" />
              <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 animate-pulse border-2 border-slate-900" />
            </motion.button>

            {/* A) Casual Gold Star Score Badge */}
            <div className="casual-badge flex items-center gap-1.5 px-3 sm:px-4 py-1 sm:py-1.5">
              <img src="/assets/ui/star_crest.svg" alt="" className="w-6 h-6 sm:w-7 sm:h-7 shrink-0" />
              <span className="font-hud font-black text-base sm:text-xl tracking-wide text-amber-950">
                {totalStarsScore}
              </span>
            </div>

            {/* B) Large Settings Button */}
            <motion.button
              type="button"
              whileHover={{ scale: 1.06, rotate: 20 }}
              whileTap={{ scale: 0.94 }}
              onClick={() => {
                soundManager.playClick();
                setIsSettingsOpen(true);
              }}
              className="casual-pill w-11 h-11 sm:w-13 sm:h-13 flex items-center justify-center text-white cursor-pointer hover:brightness-110"
              aria-label="الإعدادات والصوت"
            >
              <Settings className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
            </motion.button>
          </div>
        </div>
      </header>

      <SettingsMenu
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      <NasaMissionControlDrawer
        isOpen={isNasaOpen}
        onClose={() => setIsNasaOpen(false)}
      />
    </>
  );
};
