import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameState } from '../../context/GameContext';
import { STATION_ROOMS } from '../../data/rooms';
import { StationRoomInfo, RoomLocation } from '../../types/game';
import { AnimatedRobo } from '../common/AnimatedRobo';
import { dialogueManager } from '../../utils/geminiTTS';
import { soundManager } from '../../utils/sound';
import {
  Lock,
  Play,
  BookOpen,
  Heart,
  ClipboardList,
  Star,
  X
} from 'lucide-react';

const MAP_SPEECH_AR =
  'مرحباً بك في أكاديمية الفضاء! دعنا نبدأ رحلتنا نحو المعرفة والنجاح!';

export const StationMap: React.FC = () => {
  const { state, setLocation } = useGameState();
  const [selectedLockedRoom, setSelectedLockedRoom] = useState<StationRoomInfo | null>(null);
  const [showReportsModal, setShowReportsModal] = useState<boolean>(false);

  useEffect(() => {
    return () => {
      dialogueManager.stop();
    };
  }, []);

  const getNextActiveRoom = (): RoomLocation => {
    if (!state.isNutritionMissionComplete) return 'NutritionLab';
    if (!state.isSuitMissionComplete) return 'SuitRoom';
    if (!state.isEngineMissionComplete) return 'EngineRoom';
    if (!state.launchPadState.isLevel1Complete) return 'LaunchPad';
    return 'LunarDashboard';
  };

  const activeTargetRoom = getNextActiveRoom();

  const handleStartGame = () => {
    dialogueManager.stop();
    soundManager.playClick();
    setLocation(activeTargetRoom);
  };

  const handleRoomClick = (room: StationRoomInfo) => {
    dialogueManager.stop();
    const isUnlocked = state.unlockedRooms.includes(room.id);
    if (isUnlocked) {
      soundManager.playClick();
      setLocation(room.id);
    } else {
      soundManager.playAlertSiren();
      setSelectedLockedRoom(room);
    }
  };

  const getEarnedStarsForRoom = (roomId: RoomLocation): number => {
    switch (roomId) {
      case 'NutritionLab':
        return 3;
      case 'SuitRoom':
        return state.isSuitMissionComplete ? 3 : state.unlockedRooms.includes('SuitRoom') ? 1 : 0;
      case 'EngineRoom':
        return state.engineCoreState.isEngineComplete ? 3 : state.unlockedRooms.includes('EngineRoom') ? 1 : 0;
      case 'LaunchPad':
        return state.launchPadState.isLevel1Complete ? 3 : state.unlockedRooms.includes('LaunchPad') ? 1 : 0;
      default:
        return 0;
    }
  };

  const nodeAssets: Record<string, string> = {
    NutritionLab: '/assets/sprites/food-apple.png',
    SuitRoom: '/assets/ui/helmet-3d.svg',
    EngineRoom: '/assets/ui/rocket-3d.svg',
    LaunchPad: '/assets/ui/trophy-3d.svg'
  };

  return (
    <div className="relative w-full min-h-screen flex flex-col justify-between overflow-x-hidden select-none pt-20 pb-6 px-3 sm:px-6 lg:px-8">
      {/* Clean Space Station Observation Deck Background (Zero Flattened Screenshots) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#0c2d6b_0%,_#051133_60%,_#020617_100%)]" />
        <div className="absolute inset-0 space-stars opacity-75" />

        {/* Floating 3D Saturn */}
        <motion.img
          src="/assets/ui/saturn-3d.svg"
          alt=""
          animate={{ y: [0, -8, 0] }}
          transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
          className="absolute top-20 left-[15%] w-24 sm:w-32 object-contain opacity-90"
        />

        {/* Glowing Blue Earth Curvature Horizon */}
        <div className="absolute bottom-[14%] left-1/2 -translate-x-1/2 w-[140%] sm:w-[120%] h-[50%] rounded-t-[100%] bg-gradient-to-b from-sky-300/80 via-blue-600/90 to-indigo-950 border-t-4 border-cyan-200 shadow-[0_-20px_80px_rgba(56,189,248,0.65)]" />

        {/* Reflective Observation Deck Floor */}
        <div className="absolute inset-x-0 bottom-0 h-[20%] bg-gradient-to-b from-slate-900/95 via-sky-950 to-slate-950 border-t-4 border-cyan-400/60" />
      </div>

      {/* 1. Top Welcome Banner */}
      <div className="relative z-10 w-full max-w-2xl mx-auto flex justify-center mb-4">
        <motion.div
          whileHover={{ scale: 1.02 }}
          onClick={() => {
            soundManager.playClick();
            void dialogueManager.speak(MAP_SPEECH_AR);
          }}
          className="cursor-pointer w-full px-6 sm:px-10 py-3.5 sm:py-4 rounded-[2rem] bg-gradient-to-b from-white/95 via-sky-50/95 to-cyan-100/95 border-4 border-sky-400 shadow-[0_0_35px_rgba(56,189,248,0.6)] text-center"
        >
          <h1 className="font-hud font-black text-lg sm:text-2xl text-slate-900 mb-1">
            مرحباً بك في أكاديمية الفضاء!
          </h1>
          <p className="font-hud font-black text-xs sm:text-base text-slate-800 flex items-center justify-center gap-1.5">
            <span>دعنا نبدأ رحلتنا نحو المعرفة والنجاح</span>
            <Star className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 fill-amber-400 inline-block" />
          </p>
        </motion.div>
      </div>

      {/* 2. Middle Responsive Grid: Robo Mascot + 4 Floating Mission Pedestals */}
      <div className="relative z-10 w-full max-w-7xl mx-auto my-auto py-4 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Right Column in RTL (4 cols): Separate AnimatedRobo Component */}
        <div className="lg:col-span-4 flex flex-col items-center justify-center">
          <AnimatedRobo
            state={state.isNutritionMissionComplete ? 'CELEBRATING' : 'HAPPY'}
            spokenText={MAP_SPEECH_AR}
            size="lg"
            autoSpeak={false}
            showSpeechBubble={false}
            onBubbleClick={() => void dialogueManager.speak(MAP_SPEECH_AR)}
          />
        </div>

        {/* Left Column in RTL (8 cols): Responsive 4-Node Mission Grid */}
        <div className="lg:col-span-8 w-full">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-5 items-end">
            {STATION_ROOMS.map((room, idx) => {
              const isUnlocked = state.unlockedRooms.includes(room.id);
              const isCurrentTarget = activeTargetRoom === room.id;
              const stepNum = idx + 1;
              const earnedStars = getEarnedStarsForRoom(room.id);

              return (
                <motion.div
                  key={room.id}
                  whileHover={{ scale: 1.07, y: -6 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleRoomClick(room)}
                  className="flex flex-col items-center cursor-pointer group"
                >
                  {/* Bouncing Pointer Arrow Above Current Target */}
                  <div className="h-6 flex items-center justify-center mb-1">
                    {isCurrentTarget && (
                      <motion.div
                        animate={{ y: [0, 6, 0] }}
                        transition={{ repeat: Infinity, duration: 1.1 }}
                        className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[14px] border-t-yellow-300"
                      />
                    )}
                  </div>

                  {/* 3D Glass Dome */}
                  <div
                    className={`relative w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center p-2.5 transition-all ${
                      isUnlocked
                        ? 'bg-gradient-to-b from-white/40 via-cyan-300/25 to-sky-500/40 border-3 border-yellow-200 shadow-[0_0_30px_rgba(250,204,21,0.65)]'
                        : 'bg-gradient-to-b from-slate-800/80 to-slate-950/90 border-2 border-cyan-400/40'
                    }`}
                  >
                    <img
                      src={nodeAssets[room.id] || '/assets/ui/trophy-3d.svg'}
                      alt={room.name}
                      className="w-14 h-14 sm:w-16 sm:h-16 object-contain rounded-full"
                    />
                    {!isUnlocked && (
                      <div className="absolute -top-1 -left-1 w-7 h-7 rounded-full bg-slate-900 border-2 border-amber-400 flex items-center justify-center">
                        <Lock className="w-3.5 h-3.5 text-amber-300" />
                      </div>
                    )}
                  </div>

                  {/* Pedestal Base with Step Number & 3 Stars */}
                  <div
                    className={`-mt-3 w-24 sm:w-28 py-2 rounded-[2rem] border-4 flex flex-col items-center justify-center shadow-xl ${
                      isUnlocked
                        ? 'bg-gradient-to-b from-sky-500 via-blue-700 to-indigo-950 border-yellow-300'
                        : 'bg-gradient-to-b from-slate-600 via-slate-800 to-slate-950 border-slate-400/70'
                    }`}
                  >
                    <span className="font-hud font-black text-xl sm:text-2xl text-white leading-none">
                      {stepNum}
                    </span>
                    <div className="flex items-center justify-center gap-1 mt-1">
                      {[1, 2, 3].map((starIdx) => {
                        const isFilled = starIdx <= earnedStars && isUnlocked;
                        return (
                          <Star
                            key={starIdx}
                            className={`w-4 h-4 ${
                              isFilled
                                ? 'text-yellow-300 fill-yellow-400'
                                : 'text-slate-400 fill-slate-700'
                            }`}
                          />
                        );
                      })}
                    </div>
                  </div>

                  {/* Room Title Pill */}
                  <div className="mt-2 px-3 py-1 rounded-full bg-sky-950/90 border border-cyan-400/60 text-center">
                    <span className="font-hud font-black text-xs sm:text-sm text-white">
                      {room.name}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Bottom Responsive 4-Button Dock (Flexbox / Grid) */}
      <div className="relative z-20 w-full max-w-5xl mx-auto mt-4">
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-5">
          {/* 1. Purple Button: التقارير */}
          <motion.button
            type="button"
            whileHover={{ scale: 1.05, y: -3 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              soundManager.playClick();
              setShowReportsModal(true);
            }}
            className="min-w-[130px] sm:min-w-[150px] py-3 px-5 rounded-3xl bg-gradient-to-b from-purple-400 via-purple-600 to-indigo-900 border-3 border-purple-200 text-white shadow-xl flex flex-col items-center justify-center gap-1 cursor-pointer"
          >
            <ClipboardList className="w-6 h-6 text-white" />
            <span className="font-hud font-black text-xs sm:text-sm">التقارير</span>
          </motion.button>

          {/* 2. Giant Orange-Gold Button: ابدأ اللعب (Nutrition Lab) */}
          <motion.button
            type="button"
            whileHover={{ scale: 1.06, y: -4 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleStartGame}
            className="order-first sm:order-none w-full sm:w-auto min-w-[220px] sm:min-w-[260px] py-4 px-8 rounded-[2.2rem] bg-gradient-to-b from-yellow-300 via-amber-500 to-orange-600 border-4 border-yellow-100 text-white shadow-[0_0_35px_rgba(245,158,11,0.75)] flex flex-col items-center justify-center gap-1 cursor-pointer"
          >
            <div className="w-9 h-9 rounded-full bg-white text-orange-600 flex items-center justify-center shadow">
              <Play className="w-5 h-5 fill-current ml-0.5" />
            </div>
            <span className="font-hud font-black text-xl sm:text-2xl">ابدأ اللعب</span>
          </motion.button>

          {/* 3. Cyan-Blue Button: تعلم أكثر -> Navigates to SpaceScience (علوم الفضاء) */}
          <motion.button
            type="button"
            whileHover={{ scale: 1.05, y: -3 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              dialogueManager.stop();
              soundManager.playClick();
              setLocation('SpaceScience');
            }}
            className="min-w-[130px] sm:min-w-[150px] py-3 px-5 rounded-3xl bg-gradient-to-b from-cyan-300 via-sky-500 to-blue-800 border-3 border-cyan-100 text-white shadow-xl flex flex-col items-center justify-center gap-1 cursor-pointer"
          >
            <BookOpen className="w-6 h-6 text-white" />
            <span className="font-hud font-black text-xs sm:text-sm">تعلم أكثر</span>
          </motion.button>

          {/* 4. Pink-Rose Button: التغذية الذكية -> Navigates to HumanHealth (الصحة وجسم الإنسان) */}
          <motion.button
            type="button"
            whileHover={{ scale: 1.05, y: -3 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              dialogueManager.stop();
              soundManager.playClick();
              setLocation('HumanHealth');
            }}
            className="min-w-[130px] sm:min-w-[150px] py-3 px-5 rounded-3xl bg-gradient-to-b from-pink-400 via-rose-500 to-rose-800 border-3 border-pink-200 text-white shadow-xl flex flex-col items-center justify-center gap-1 cursor-pointer"
          >
            <Heart className="w-6 h-6 text-white" />
            <span className="font-hud font-black text-xs sm:text-sm">التغذية الذكية</span>
          </motion.button>
        </div>
      </div>

      {/* Locked Mission Modal */}
      <AnimatePresence>
        {selectedLockedRoom && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              className="w-full max-w-md bg-gradient-to-b from-sky-950 to-slate-950 border-4 border-amber-400 rounded-3xl p-6 text-center shadow-2xl relative"
            >
              <button
                type="button"
                onClick={() => setSelectedLockedRoom(null)}
                className="absolute top-4 left-4 p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="w-16 h-16 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-amber-300 mx-auto mb-3">
                <Lock className="w-8 h-8" />
              </div>

              <h3 className="font-hud font-black text-xl text-white mb-1">
                هذه المرحلة مغلقة حالياً! 🔒
              </h3>
              <p className="text-base text-amber-300 mb-4 font-black">
                {selectedLockedRoom.name}
              </p>

              <button
                type="button"
                onClick={() => {
                  setSelectedLockedRoom(null);
                  handleStartGame();
                }}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-hud font-black text-base shadow-lg cursor-pointer"
              >
                انطلق للمرحلة الحالية أولاً! 🚀
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Progress Reports Modal */}
      <AnimatePresence>
        {showReportsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              className="w-full max-w-lg bg-gradient-to-b from-sky-950 to-slate-950 border-4 border-purple-400 rounded-3xl p-6 shadow-2xl relative text-right"
            >
              <button
                type="button"
                onClick={() => setShowReportsModal(false)}
                className="absolute top-4 left-4 p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="font-hud font-black text-xl text-purple-300 mb-4">
                تقرير تقدم مستكشف الفضاء 🏆
              </h3>

              <div className="grid grid-cols-2 gap-3 text-center text-xs sm:text-sm">
                <button
                  type="button"
                  onClick={() => {
                    setShowReportsModal(false);
                    setLocation('NutritionLab');
                  }}
                  className="p-3 rounded-2xl bg-slate-900 border border-cyan-500/40 hover:border-cyan-300 text-white font-hud font-black cursor-pointer"
                >
                  🍎 مختبر التغذية
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowReportsModal(false);
                    setLocation('SpaceScience');
                  }}
                  className="p-3 rounded-2xl bg-slate-900 border border-cyan-500/40 hover:border-cyan-300 text-white font-hud font-black cursor-pointer"
                >
                  🪐 علوم الفضاء
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowReportsModal(false);
                    setLocation('HumanHealth');
                  }}
                  className="p-3 rounded-2xl bg-slate-900 border border-cyan-500/40 hover:border-cyan-300 text-white font-hud font-black cursor-pointer"
                >
                  ❤️ الصحة وجسم الإنسان
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowReportsModal(false);
                    setLocation('SuitRoom');
                  }}
                  className="p-3 rounded-2xl bg-slate-900 border border-cyan-500/40 hover:border-cyan-300 text-white font-hud font-black cursor-pointer"
                >
                  🧑‍🚀 بدلة وتكنولوجيا الفضاء
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
