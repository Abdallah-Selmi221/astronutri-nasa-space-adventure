import React, { Suspense, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameProvider, useGameState } from './context/GameContext';
import { HeaderHUD } from './components/common/HeaderHUD';
import { HomeWorldScreen } from './components/home/HomeWorldScreen';
import { IntroVideoPlayer } from './components/common/IntroVideoPlayer';
import { GameErrorBoundary } from './components/common/GameErrorBoundary';
import {
  NasaMissionControlDrawer,
  NASA_DRAWER_OPEN_EVENT
} from './components/common/NasaMissionControlDrawer';

function lazyWithRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  retries = 2
): React.LazyExoticComponent<T> {
  return React.lazy(async () => {
    let lastError: unknown;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await factory();
      } catch (err) {
        lastError = err;
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
        }
      }
    }
    throw lastError;
  });
}

// Code-Split Mission Screens with resilient retry recovery
const NutritionLab = lazyWithRetry(() =>
  import('./components/nutrition/NutritionLab').then((m) => ({ default: m.NutritionLab }))
);
const SpaceScience = lazyWithRetry(() =>
  import('./components/missions/SpaceScience').then((m) => ({ default: m.SpaceScience }))
);
const HumanHealth = lazyWithRetry(() =>
  import('./components/missions/HumanHealth').then((m) => ({ default: m.HumanHealth }))
);
const SuitRoom = lazyWithRetry(() =>
  import('./components/suit/SuitRoom').then((m) => ({ default: m.SuitRoom }))
);
const EngineCore = lazyWithRetry(() =>
  import('./components/rooms/EngineCore').then((m) => ({ default: m.EngineCore }))
);
const LaunchPad = lazyWithRetry(() =>
  import('./components/rooms/LaunchPad').then((m) => ({ default: m.LaunchPad }))
);
const LunarDashboard = lazyWithRetry(() =>
  import('./components/lunar/LunarDashboard').then((m) => ({ default: m.LunarDashboard }))
);
const ReturnToEarth = lazyWithRetry(() =>
  import('./components/return/ReturnToEarth').then((m) => ({ default: m.ReturnToEarth }))
);

const MissionLoadingFallback: React.FC = () => (
  <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] gap-4 text-cyan-200 font-hud font-black">
    <div className="w-14 h-14 rounded-full border-4 border-cyan-300 border-t-amber-300 animate-spin shadow-[0_0_25px_rgba(34,211,238,0.5)]" />
    <span className="text-base sm:text-lg px-5 py-2 rounded-full bg-slate-900/80 border-2 border-cyan-400/50">
      جاري تجهيز المهمة الفضائية... 🚀
    </span>
  </div>
);

const GameRouter: React.FC = () => {
  const { state, setLocation } = useGameState();
  const [isNasaOpen, setIsNasaOpen] = useState(false);
  const [hasWatchedIntro, setHasWatchedIntro] = useState<boolean>(() => {
    try {
      if (typeof window !== 'undefined') {
        return sessionStorage.getItem('astronutri_intro_played') === 'true';
      }
    } catch {
      // Ignore restricted mobile storage access
    }
    return false;
  });

  useEffect(() => {
    const onOpenNasa = () => setIsNasaOpen(true);
    window.addEventListener(NASA_DRAWER_OPEN_EVENT, onOpenNasa);
    return () => window.removeEventListener(NASA_DRAWER_OPEN_EVENT, onOpenNasa);
  }, []);

  const handleIntroComplete = () => {
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('astronutri_intro_played', 'true');
      }
    } catch {
      // Ignore restricted mobile storage access
    }
    setHasWatchedIntro(true);
  };

  if (!hasWatchedIntro) {
    return <IntroVideoPlayer onComplete={handleIntroComplete} />;
  }

  return (
    <div className="h-[100dvh] w-full overflow-hidden bg-space-950 text-white flex flex-col relative space-stars">
      {/* Top Simplified HUD (Visible during missions) */}
      <HeaderHUD />

      {/* Main Location Viewport with GameErrorBoundary + Framer Motion transitions */}
      <div className={state.currentLocation === 'Map' ? 'flex-1 flex overflow-hidden' : 'flex-1 flex scrollable-panel'}>
        <GameErrorBoundary resetKey={state.currentLocation} onGoHome={() => setLocation('Map')}>
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

          {state.currentLocation === 'ReturnToEarth' && (
            <motion.div
              key="return-to-earth"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="flex-1 flex"
            >
              <ReturnToEarth />
            </motion.div>
          )}
            </AnimatePresence>
          </Suspense>
        </GameErrorBoundary>
      </div>

      {/* Global NASA Live Data & Trade-offs Drawer (accessible from World, Levels 1-4, Rooms & Mini-Games) */}
      <NasaMissionControlDrawer isOpen={isNasaOpen} onClose={() => setIsNasaOpen(false)} />
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
