import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameState } from '../../context/GameContext';
import { soundManager } from '../../utils/sound';
import { dialogueManager } from '../../utils/geminiTTS';
import { EventBus } from '../../game/EventBus';
import { PhaserHomeIslandCanvas } from '../../game/PhaserHomeIslandCanvas';
import { SettingsMenu } from '../common/SettingsMenu';
import { NasaMissionControlDrawer } from '../common/NasaMissionControlDrawer';
import { WorldMapPreviewModal } from './WorldMapPreviewModal';
import { ARCHIPELAGO_ISLANDS } from '../../game/scenes/HomeIslandScene';
import { Star, Settings, Map, Sparkles, Navigation, AlertTriangle, Info, Satellite } from 'lucide-react';

const ISLAND_EMOJIS = ['🍏', '🪐', '🧑‍🚀', '🚀', '🌙', '🌍'];

export const HomeWorldScreen: React.FC = () => {
  const { state, setLocation, storageStatus } = useGameState();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isWorldMapOpen, setIsWorldMapOpen] = useState(false);
  const [isNasaOpen, setIsNasaOpen] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [activeIslandIndex, setActiveIslandIndex] = useState<number>(0);
  const [activeSpeech, setActiveSpeech] = useState<string>(
    'أهلاً بك في الأرخبيل الكوني! اختر إحدى الجزر الست للاستكشاف أو اضغط على الصاروخ للانطلاق! 🚀'
  );
  const [interactionToast, setInteractionToast] = useState<{ name: string; message: string } | null>(null);
  const navFallbackTimerRef = useRef<number | null>(null);

  // Subscribe to DialogueManager audio playback status
  useEffect(() => {
    const unsub = dialogueManager.subscribeStatus(({ isSpeaking }) => {
      setIsAudioPlaying(isSpeaking);
    });
    return () => unsub();
  }, []);

  const getLockReason = (targetKey: string): string | null => {
    if (state.unlockedRooms.includes(targetKey as any)) return null;
    if (targetKey === 'SuitRoom') return 'أكمل "مختبر التغذية" أولاً لفتح مركز بدلة الفضاء!';
    if (targetKey === 'EngineRoom') return 'أكمل فحص "بدلة الفضاء" أولاً لفتح غرفة المحرك!';
    if (targetKey === 'LaunchPad') return 'أكمل تجهيز الطعام والبدلة والمحرك أولاً لفتح منصة الإطلاق!';
    if (targetKey === 'LunarDashboard') return 'أكمل الإقلاع من "منصة الإطلاق" للوصول لمستعمرة القمر!';
    if (targetKey === 'ReturnToEarth') return 'أكمل مهمات مستعمرة القمر (ECLSS والعاصفة الشمسية) للعودة إلى الأرض!';
    return 'أكمل المرحلة السابقة أولاً لفتح هذه الجزيرة!';
  };

  const handleLaunchMissionRef = useRef<(missionKey?: string) => void>();
  handleLaunchMissionRef.current = (missionKey?: string) => {
    if (navFallbackTimerRef.current) {
      window.clearTimeout(navFallbackTimerRef.current);
      navFallbackTimerRef.current = null;
    }
    const target = (missionKey || ARCHIPELAGO_ISLANDS[activeIslandIndex]?.key || 'NutritionLab') as string;
    const lockMsg = getLockReason(target);
    if (lockMsg) {
      soundManager.playAlertSiren();
      setActiveSpeech(lockMsg);
      setInteractionToast({ name: 'مهمة مقفلة 🔒', message: lockMsg });
      window.setTimeout(() => setInteractionToast(null), 4000);
      return;
    }
    dialogueManager.stop();
    soundManager.playFanfare();
    setLocation(target as any);
  };

  // EventBus listeners for Phaser 3 game world interactions
  useEffect(() => {
    const handleLaunchMission = (missionKey?: string) => {
      handleLaunchMissionRef.current?.(missionKey);
    };

    const handlePropClicked = (payload: { name: string; message: string }) => {
      setInteractionToast(payload);
      setActiveSpeech(payload.message);
      const timer = window.setTimeout(() => {
        setInteractionToast(null);
      }, 4000);
      return () => window.clearTimeout(timer);
    };

    const handleIslandChanged = (payload: { index: number; config: any }) => {
      setActiveIslandIndex(payload.index);
      setActiveSpeech(`وصلنا إلى ${payload.config.nameAr}! ${payload.config.subtitleAr} 🚀`);
    };

    const handleRoboGreet = () => {
      soundManager.playClick();
      const curr = ARCHIPELAGO_ISLANDS[activeIslandIndex];
      const greet = `أهلاً بك يا بطل في ${curr?.nameAr || 'الأرخبيل الكوني'}! جاهز للمغامرة؟ اضغط على الصاروخ للانطلاق!`;
      setActiveSpeech(greet);
      if (state.soundEnabled) {
        void dialogueManager.speak(greet);
      }
    };

    const handleOpenMap = () => {
      soundManager.playClick();
      setIsWorldMapOpen(true);
    };

    EventBus.on('home-launch-mission', handleLaunchMission);
    EventBus.on('home-prop-clicked', handlePropClicked);
    EventBus.on('home-island-changed', handleIslandChanged);
    EventBus.on('home-robo-greet', handleRoboGreet);
    EventBus.on('home-open-world-map', handleOpenMap);

    soundManager.startBGM();

    return () => {
      if (navFallbackTimerRef.current) {
        window.clearTimeout(navFallbackTimerRef.current);
        navFallbackTimerRef.current = null;
      }
      EventBus.off('home-launch-mission', handleLaunchMission);
      EventBus.off('home-prop-clicked', handlePropClicked);
      EventBus.off('home-island-changed', handleIslandChanged);
      EventBus.off('home-robo-greet', handleRoboGreet);
      EventBus.off('home-open-world-map', handleOpenMap);
      dialogueManager.stop();
    };
  }, [setLocation, state.soundEnabled, activeIslandIndex]);

  const handleSpeakWelcome = () => {
    if (isAudioPlaying) {
      dialogueManager.stop();
    } else {
      soundManager.playClick();
      void dialogueManager.speak(activeSpeech);
    }
  };

  const handleSelectIsland = (index: number) => {
    if (index === activeIslandIndex) return;
    soundManager.playClick();
    EventBus.emit('home-switch-island', index);
  };

  const handleStartAdventureCTA = () => {
    dialogueManager.stop();
    const targetKey = (ARCHIPELAGO_ISLANDS[activeIslandIndex]?.key || 'NutritionLab') as string;
    const lockMsg = getLockReason(targetKey);
    if (lockMsg) {
      soundManager.playAlertSiren();
      setActiveSpeech(lockMsg);
      setInteractionToast({ name: 'مهمة مقفلة 🔒', message: lockMsg });
      window.setTimeout(() => setInteractionToast(null), 4000);
      return;
    }

    soundManager.playClick();
    // Trigger Phaser boarding animation
    EventBus.emit('home-start-adventure-action');

    // FAIL-SAFE NAVIGATION FALLBACK:
    // If Phaser animation callback fails or takes longer than 1100ms, navigate directly from React!
    if (navFallbackTimerRef.current) {
      window.clearTimeout(navFallbackTimerRef.current);
    }
    navFallbackTimerRef.current = window.setTimeout(() => {
      soundManager.playFanfare();
      setLocation(targetKey as any);
    }, 1100);
  };

  // Sync campaign unlocks & completed badges onto Phaser archipelago signposts
  useEffect(() => {
    const completedKeys: string[] = [];
    if (state.isNutritionMissionComplete) completedKeys.push('NutritionLab');
    if (state.isHumanHealthComplete) completedKeys.push('HumanHealth');
    if (state.isSuitMissionComplete) completedKeys.push('SuitRoom');
    if (state.engineCoreState.isEngineComplete || state.isEngineMissionComplete) completedKeys.push('EngineRoom');
    if (state.launchPadState.isLevel1Complete) completedKeys.push('LaunchPad');
    if (state.level2State.isTradeOffResolved && state.level2State.isEVASafeReturned) completedKeys.push('LunarDashboard');
    if (state.isReturnMissionComplete) completedKeys.push('ReturnToEarth');

    const syncTimer = window.setTimeout(() => {
      EventBus.emit('home-islands-sync', {
        unlockedKeys: state.unlockedRooms,
        completedKeys
      });
    }, 150);
    return () => window.clearTimeout(syncTimer);
  }, [
    state.unlockedRooms,
    state.isNutritionMissionComplete,
    state.isHumanHealthComplete,
    state.isSuitMissionComplete,
    state.isEngineMissionComplete,
    state.engineCoreState.isEngineComplete,
    state.launchPadState.isLevel1Complete,
    state.level2State.isTradeOffResolved,
    state.level2State.isEVASafeReturned,
    state.isReturnMissionComplete,
    activeIslandIndex
  ]);

  // Calculate player stars score
  const completedMissionsCount = [
    state.isNutritionMissionComplete,
    state.isHumanHealthComplete,
    state.isSuitMissionComplete,
    state.isEngineMissionComplete,
    state.launchPadState.isLevel1Complete,
    state.level2State.isTradeOffResolved,
    state.isReturnMissionComplete
  ].filter(Boolean).length;
  const totalStarsScore = 250 + completedMissionsCount * 50 + state.cargoItems.length * 25;

  const currentIsland = ARCHIPELAGO_ISLANDS[activeIslandIndex] || ARCHIPELAGO_ISLANDS[0];
  const isCurrentIslandLocked = Boolean(getLockReason(currentIsland.key));

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

        {/* Current Island Title Capsule */}
        <motion.div
          key={currentIsland.key}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="pastel-glass-panel hidden md:flex items-center gap-2 px-4 py-1.5 text-pastel-white font-hud font-bold text-xs pointer-events-auto"
          dir="rtl"
        >
          <span className="text-base">{ISLAND_EMOJIS[activeIslandIndex]}</span>
          <span className="text-pastel-cyan font-black">{currentIsland.nameAr}</span>
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

          {/* NASA Live Data Drawer Button */}
          <motion.button
            type="button"
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => {
              soundManager.playClick();
              setIsNasaOpen(true);
            }}
            className="pastel-glass-panel-interactive flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 text-cyan-200 font-hud font-bold text-xs sm:text-sm border-cyan-400/50 relative"
            aria-label="بيانات ناسا الفضائية الحية"
          >
            <Satellite className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-300" />
            <span className="hidden sm:inline">بيانات ناسا</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline sm:hidden" />
          </motion.button>

          {/* World Map Button */}
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

      {/* Non-intrusive Storage Status Pill */}
      {(storageStatus === 'CORRUPT_SAVE' || storageStatus === 'FUTURE_SAVE') && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-30 w-full max-w-xl mx-auto px-4 pointer-events-none mt-1"
        >
          <div
            onClick={() => {
              soundManager.playClick();
              setIsSettingsOpen(true);
            }}
            className={`pointer-events-auto cursor-pointer flex items-center justify-between gap-2.5 px-4 py-2 rounded-2xl border-2 shadow-lg backdrop-blur-md transition-transform hover:scale-[1.02] active:scale-95 ${
              storageStatus === 'CORRUPT_SAVE'
                ? 'bg-amber-950/90 border-amber-400 text-amber-200'
                : 'bg-cyan-950/90 border-cyan-400 text-cyan-200'
            }`}
            dir="rtl"
          >
            <div className="flex items-center gap-2">
              {storageStatus === 'CORRUPT_SAVE' ? (
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              ) : (
                <Info className="w-4 h-4 text-cyan-300 shrink-0" />
              )}
              <span className="font-hud font-bold text-xs">
                {storageStatus === 'CORRUPT_SAVE'
                  ? 'تنبيه: ملف التقدم به خطأ. تم إيقاف الحفظ التلقائي لحماية بياناتك.'
                  : 'معلومة: تم اكتشاف ملف حفظ من إصدار أحدث. تم إيقاف الحفظ التلقائي.'}
              </span>
            </div>
            <span className="text-[10px] font-hud font-black underline shrink-0">
              فتح الإعدادات ⚙️
            </span>
          </div>
        </motion.div>
      )}

      {/* Spacer to keep center view open for Phaser 3 World */}
      <div className="flex-1 pointer-events-none" />

      {/* =====================================================================
          LAYER 3: 6-ISLAND ARCHIPELAGO NAVIGATION DOCK
          ===================================================================== */}
      <div className="relative z-30 w-full max-w-4xl mx-auto px-3 sm:px-6 pointer-events-none mb-2">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="pointer-events-auto casual-card rounded-3xl p-2 sm:p-2.5 flex items-center justify-between gap-1.5 sm:gap-2 overflow-x-auto scrollbar-none"
          dir="rtl"
        >
          {ARCHIPELAGO_ISLANDS.map((island, idx) => {
            const isActive = idx === activeIslandIndex;
            const isIslandLocked = Boolean(getLockReason(island.key));
            return (
              <button
                key={island.key}
                type="button"
                onClick={() => handleSelectIsland(idx)}
                className={`flex-1 min-w-[74px] sm:min-w-[96px] py-2 px-1.5 rounded-2xl flex flex-col items-center gap-1 transition-all duration-200 cursor-pointer relative ${
                  isActive
                    ? 'bg-gradient-to-b from-cyan-400 to-blue-600 border-2 border-white text-slate-950 shadow-[0_4px_0_#0369a1] scale-105'
                    : isIslandLocked
                    ? 'bg-slate-900/60 border border-slate-700 text-slate-300 opacity-80 hover:opacity-100'
                    : 'bg-slate-900/75 border-2 border-white/20 text-white hover:border-cyan-300'
                }`}
              >
                <span className="text-lg sm:text-2xl filter drop-shadow">
                  {ISLAND_EMOJIS[idx]}
                  {isIslandLocked ? '🔒' : ''}
                </span>
                <span
                  className={`text-[10px] sm:text-xs font-hud font-black text-center whitespace-nowrap ${
                    isActive ? 'text-slate-950' : isIslandLocked ? 'text-slate-300' : 'text-cyan-100'
                  }`}
                >
                  {island.nameAr.split(' ')[0]} {island.nameAr.split(' ')[1] || ''}
                </span>
              </button>
            );
          })}
        </motion.div>
      </div>

      {/* =====================================================================
          LAYER 4: BOTTOM HUD (Speech Bubble, Chunky Adventure CTA, Controls Hint)
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
          <div className="relative shrink-0">
            <img 
              src="/assets/generated/characters/robo_chibi_sprite.png" 
              alt="روبو" 
              className="w-10 h-10 rounded-2xl bg-slate-900 p-0.5 border-2 border-cyan-400 object-contain shadow-inner"
            />
            {isAudioPlaying && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
              </span>
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

        {/* Action Row: Chunky Adventure CTA + Intuitive On-Screen Touch/Keyboard Control Pad */}
        <div className="pointer-events-auto w-full flex flex-wrap items-center justify-center gap-3 sm:gap-4" dir="rtl">
          <motion.button
            type="button"
            onClick={handleStartAdventureCTA}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`px-7 py-3.5 sm:px-10 sm:py-4 text-lg sm:text-2xl flex items-center gap-3 sm:gap-4 cursor-pointer ${
              isCurrentIslandLocked
                ? 'rounded-3xl bg-slate-800/95 border-2 border-amber-400/70 text-amber-200 font-hud font-black shadow-lg'
                : 'btn-chunky-adventure shadow-[0_14px_40px_rgba(255,159,28,0.6)]'
            }`}
            aria-label={`انطلق إلى ${currentIsland.nameAr}`}
          >
            <span>{isCurrentIslandLocked ? `🔒 ${currentIsland.nameAr} (مقفلة)` : `انطلق إلى ${currentIsland.nameAr}`}</span>
            <span className="text-xl sm:text-3xl filter drop-shadow">{ISLAND_EMOJIS[activeIslandIndex]}</span>
          </motion.button>

          {/* Compact Casual Robo D-Pad Controls (Touch + WASD / Arrows Hint) */}
          <div
            className="casual-card px-3 py-2 flex items-center gap-1.5"
            dir="ltr"
            aria-label="أزرار تحريك روبو على الجزيرة"
          >
            <button
              type="button"
              onClick={() => { soundManager.playClick(); EventBus.emit('home-nudge-robo', { dx: -55, dy: 0 }); }}
              className="w-8 h-8 rounded-xl bg-slate-900 hover:bg-cyan-500 hover:text-slate-950 border border-cyan-300/60 text-cyan-200 font-black text-xs flex items-center justify-center cursor-pointer"
              aria-label="تحريك روبو يساراً"
            >
              ◀
            </button>
            <div className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => { soundManager.playClick(); EventBus.emit('home-nudge-robo', { dx: 0, dy: -45 }); }}
                className="w-8 h-6 rounded-lg bg-slate-900 hover:bg-cyan-500 hover:text-slate-950 border border-cyan-300/60 text-cyan-200 font-black text-[10px] flex items-center justify-center cursor-pointer"
                aria-label="تحريك روبو للأعلى"
              >
                ▲
              </button>
              <button
                type="button"
                onClick={() => { soundManager.playClick(); EventBus.emit('home-nudge-robo', { dx: 0, dy: 45 }); }}
                className="w-8 h-6 rounded-lg bg-slate-900 hover:bg-cyan-500 hover:text-slate-950 border border-cyan-300/60 text-cyan-200 font-black text-[10px] flex items-center justify-center cursor-pointer"
                aria-label="تحريك روبو للأسفل"
              >
                ▼
              </button>
            </div>
            <button
              type="button"
              onClick={() => { soundManager.playClick(); EventBus.emit('home-nudge-robo', { dx: 55, dy: 0 }); }}
              className="w-8 h-8 rounded-xl bg-slate-900 hover:bg-cyan-500 hover:text-slate-950 border border-cyan-300/60 text-cyan-200 font-black text-xs flex items-center justify-center cursor-pointer"
              aria-label="تحريك روبو يميناً"
            >
              ▶
            </button>
          </div>
        </div>

        {/* Clear Exploration Controls Hint */}
        <div
          dir="rtl"
          className="flex items-center gap-2 text-center font-hud font-bold text-[11px] sm:text-xs text-pastel-sky/95 bg-slate-950/65 px-3 py-1 rounded-full border border-white/15"
        >
          <Navigation className="w-3.5 h-3.5 text-pastel-cyan inline shrink-0" />
          <span>
            حرّك روبو باللمس أو الأسهم / WASD 🕹️ • واضغط على أي جزيرة للطيران بالمركبة ✈️
          </span>
        </div>
      </footer>

      {/* World Map Modal */}
      <WorldMapPreviewModal
        isOpen={isWorldMapOpen}
        onClose={() => setIsWorldMapOpen(false)}
        onSelectMission={(missionId) => {
          setIsWorldMapOpen(false);
          const lockMsg = getLockReason(missionId);
          if (lockMsg) {
            soundManager.playAlertSiren();
            setActiveSpeech(lockMsg);
            setInteractionToast({ name: 'مهمة مقفلة 🔒', message: lockMsg });
            window.setTimeout(() => setInteractionToast(null), 4000);
            return;
          }
          const foundIdx = ARCHIPELAGO_ISLANDS.findIndex((i) => i.key === missionId);
          if (foundIdx >= 0) {
            handleSelectIsland(foundIdx);
          } else {
            setLocation(missionId as any);
          }
        }}
      />

      {/* Settings Modal */}
      <SettingsMenu
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onReplayIntro={handleSpeakWelcome}
      />

      {/* NASA Mission Control Live Data Drawer */}
      <NasaMissionControlDrawer
        isOpen={isNasaOpen}
        onClose={() => setIsNasaOpen(false)}
      />
    </div>
  );
};

export default HomeWorldScreen;
