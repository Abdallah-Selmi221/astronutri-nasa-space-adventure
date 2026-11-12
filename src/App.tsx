import React, { Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameProvider, useGameState } from './context/GameContext';
import { HeaderHUD } from './components/common/HeaderHUD';
import { HomeWorldScreen } from './components/home/HomeWorldScreen';

// Code-Split Mission Screens — Loaded on demand only when the player enters a mission
const NutritionLab = React.lazy(() =>
  import('./components/nutrition/NutritionLab').then((m) => ({ default: m.NutritionLab }))
);
const SpaceScience = React.lazy(() =>
  import('./components/missions/SpaceScience').then((m) => ({ default: m.SpaceScience }))
);
const HumanHealth = React.lazy(() =>
  import('./components/missions/HumanHealth').then((m) => ({ default: m.HumanHealth }))
);
const SuitRoom = React.lazy(() =>
  import('./components/suit/SuitRoom').then((m) => ({ default: m.SuitRoom }))
);
const EngineCore = React.lazy(() =>
  import('./components/rooms/EngineCore').then((m) => ({ default: m.EngineCore }))
);
const LaunchPad = React.lazy(() =>
  import('./components/rooms/LaunchPad').then((m) => ({ default: m.LaunchPad }))
);
const LunarDashboard = React.lazy(() =>
  import('./components/lunar/LunarDashboard').then((m) => ({ default: m.LunarDashboard }))
);

const MissionLoadingFallback: React.FC = () => (
  <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] gap-3 text-cyan-300 font-hud font-black">
    <div className="w-12 h-12 rounded-full border-4 border-cyan-400 border-t-transparent animate-spin" />
    <span className="text-base sm:text-lg">جاري تجهيز المهمة الفضائية... 🚀</span>
  </div>
);

const GameRouter: React.FC = () => {
  const { state } = useGameState();

  return (
    <div className="min-h-screen bg-space-950 text-white flex flex-col relative space-stars">
      {/* Top Simplified HUD (Visible during missions) */}
      <HeaderHUD />

      {/* Main Location Viewport with Framer Motion transitions */}
      <div className="flex-1 flex flex-col">
        <Suspense fallback={<MissionLoadingFallback />}>
          <AnimatePresence mode="wait">
          {state.currentLocation === 'Map' && (
            <motion.div
              key="home-world"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.25 }}
              className="flex-1 flex"
            >
              <HomeWorldScreen />
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
        </Suspense>
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
