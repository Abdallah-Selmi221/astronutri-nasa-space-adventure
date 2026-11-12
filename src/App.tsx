import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameProvider, useGameState } from './context/GameContext';
import { HeaderHUD } from './components/common/HeaderHUD';
import { RoboIntroModal } from './components/common/RoboIntroModal';
import { StationMap } from './components/map/StationMap';
import { NutritionLab } from './components/nutrition/NutritionLab';
import { SpaceScience } from './components/missions/SpaceScience';
import { HumanHealth } from './components/missions/HumanHealth';
import { SuitRoom } from './components/suit/SuitRoom';
import { EngineCore } from './components/rooms/EngineCore';
import { LaunchPad } from './components/rooms/LaunchPad';
import { LunarDashboard } from './components/lunar/LunarDashboard';

const GameRouter: React.FC = () => {
  const { state } = useGameState();

  return (
    <div className="min-h-screen bg-space-950 text-white flex flex-col relative space-stars">
      {/* Cinematic Full-screen Robo Intro Modal */}
      <RoboIntroModal />

      {/* Top Simplified HUD (Star Score, Settings Gear, Home Icon) */}
      <HeaderHUD />

      {/* Main Location Viewport with Framer Motion transitions */}
      <div className="flex-1 flex flex-col">
        <AnimatePresence mode="wait">
          {state.currentLocation === 'Map' && (
            <motion.div
              key="map"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.25 }}
              className="flex-1 flex"
            >
              <StationMap />
            </motion.div>
          )}

          {state.currentLocation === 'NutritionLab' && (
            <motion.div
              key="nutrition-lab"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="flex-1 flex"
            >
              <NutritionLab />
            </motion.div>
          )}

          {state.currentLocation === 'SpaceScience' && (
            <motion.div
              key="space-science"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.25 }}
              className="flex-1 flex"
            >
              <SpaceScience />
            </motion.div>
          )}

          {state.currentLocation === 'HumanHealth' && (
            <motion.div
              key="human-health"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.25 }}
              className="flex-1 flex"
            >
              <HumanHealth />
            </motion.div>
          )}

          {state.currentLocation === 'SuitRoom' && (
            <motion.div
              key="suit-room"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.25 }}
              className="flex-1 flex"
            >
              <SuitRoom />
            </motion.div>
          )}

          {state.currentLocation === 'EngineRoom' && (
            <motion.div
              key="engine-core"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.25 }}
              className="flex-1 flex"
            >
              <EngineCore />
            </motion.div>
          )}

          {state.currentLocation === 'LaunchPad' && (
            <motion.div
              key="launch-pad"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.25 }}
              className="flex-1 flex"
            >
              <LaunchPad />
            </motion.div>
          )}

          {state.currentLocation === 'LunarDashboard' && (
            <motion.div
              key="lunar-dashboard"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.3 }}
              className="flex-1 flex"
            >
              <LunarDashboard />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <GameProvider>
      <GameRouter />
    </GameProvider>
  );
};

export default App;
