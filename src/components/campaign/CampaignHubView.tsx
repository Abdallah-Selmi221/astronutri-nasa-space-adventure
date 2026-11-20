import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useGameState, initialCampaignState } from '../../context/GameContext';
import { CAMPAIGN_LEVELS, MINI_GAME_SPECS, SpatialRoomNode } from '../../data/campaignLevels';
import { CampaignLevelId, CampaignProgressState, MiniGameId } from '../../types/game';
import { WorldNavigator3D } from '../three/WorldNavigator3D';
import { SpatialRoomMap3D } from '../three/SpatialRoomMap3D';
import { SpaceFitXShowcase } from '../suit/SpaceFitXShowcase';
import { MiniGameShell } from './MiniGameShell';
import { Level1MiniGames } from './Level1MiniGames';
import { Level2MiniGames } from './Level2MiniGames';
import { Level3MiniGames } from './Level3MiniGames';
import { Level4MiniGames } from './Level4MiniGames';
import { MissionInventoryBar } from './MissionInventoryBar';
import { RoboGuideOverlay } from '../common/RoboGuideOverlay';
import { RocketLaunchCutscene } from '../three/RocketLaunchCutscene';
import { EcoBioCabin } from './EcoBioCabin';
import { ScientificSourcesModal } from './ScientificSourcesModal';
import { SettingsMenu } from '../common/SettingsMenu';
import { openNasaDrawer } from '../common/NasaMissionControlDrawer';
import { soundManager } from '../../utils/sound';
import { toggleFullscreenLandscape } from '../../utils/displaySettings';
import { dialogueManager } from '../../utils/geminiTTS';
import { nasaCache } from '../../services/nasa/nasaCache';
import {
  getNextSequentialMissionTarget,
  LEVEL_TITLES_BILINGUAL
} from '../../data/campaignBilingual';
import { getDiscoveredFactIds } from '../../data/earthDiscoveryFacts';
import { tr } from '../../utils/i18n';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Compass,
  DoorOpen,
  HelpCircle,
  Layers,
  Lock,
  Maximize2,
  Menu,
  Play,
  Rocket,
  Satellite,
  Settings,
  Shield,
  ShieldCheck,
  Sprout,
  Star,
  Volume2,
  VolumeX,
  X
} from 'lucide-react';

export const CampaignHubView: React.FC = () => {
  const {
    state,
    language,
    setLanguage,
    setLocation,
    setCampaignView,
    completeCampaignMiniGame,
    updateCampaignState,
    authorizeLunarReturn,
    storageStatus
  } = useGameState();

  const campaign = state.campaign || initialCampaignState;
  const activeLevelId = campaign.activeLevel || 1;
  const activeLevelSpec = CAMPAIGN_LEVELS[activeLevelId];
  const isDemoMode =
    campaign.unlockedLevels.length >= 4 &&
    campaign.l3ReturnAuthorized &&
    campaign.l3PackedTools.length >= 4;
  const seqTarget = getNextSequentialMissionTarget(activeLevelId, campaign);
  const langDir = language === 'ar' ? 'rtl' : 'ltr';

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSourcesOpen, setIsSourcesOpen] = useState(false);
  const [isEcoCabinOpen, setIsEcoCabinOpen] = useState(false);
  const [isHowToPlayOpen, setIsHowToPlayOpen] = useState(false);
  const [isSuitShowcaseOpen, setIsSuitShowcaseOpen] = useState(false);
  const [isLevelsDrawerOpen, setIsLevelsDrawerOpen] = useState(false);
  const [showLevelStory, setShowLevelStory] = useState<boolean>(true);
  const [showWorldRoboGuide, setShowWorldRoboGuide] = useState<boolean>(true);
  const highestUnlockedNodeId = (campaign.unlockedLevels.length
    ? Math.max(...campaign.unlockedLevels)
    : 1) as CampaignLevelId;

  useEffect(() => {
    if (campaign.viewMode === 'level_hub') {
      setShowLevelStory(true);
    } else if (campaign.viewMode === 'world_map') {
      setShowWorldRoboGuide(true);
    }
  }, [campaign.viewMode, activeLevelId]);
  const [isRoomsDrawerOpen, setIsRoomsDrawerOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isSoundMuted, setIsSoundMuted] = useState<boolean>(() => !soundManager.isEnabled());
  const [launchCutsceneTargetLevel, setLaunchCutsceneTargetLevel] = useState<CampaignLevelId | null>(null);
  const [celebrationBurst, setCelebrationBurst] = useState<{
    titleEn: string;
    titleAr: string;
    nextEn: string;
    nextAr: string;
  } | null>(null);

  const toggleSoundMute = () => {
    const nextMuted = !isSoundMuted;
    soundManager.setEnabled(!nextMuted);
    soundManager.setBgmEnabled(!nextMuted);
    setIsSoundMuted(nextMuted);
    if (nextMuted) {
      dialogueManager.stop();
    } else {
      soundManager.playClick();
    }
  };

  const triggerRocketLaunch = (targetLevel: CampaignLevelId = 2) => {
    dialogueManager.stop();
    setIsMobileMenuOpen(false);
    setLaunchCutsceneTargetLevel(targetLevel);
  };

  useEffect(() => {
    setIsEcoCabinOpen(false);
    setIsRoomsDrawerOpen(false);
    setIsLevelsDrawerOpen(false);
    setIsMobileMenuOpen(false);
  }, [campaign.viewMode, activeLevelId]);

  useEffect(() => {
    const unsub = dialogueManager.subscribeStatus(({ isSpeaking }) => {
      setIsAudioPlaying(isSpeaking);
    });
    return () => unsub();
  }, []);

  const [discoveryCount, setDiscoveryCount] = useState<number>(() => getDiscoveredFactIds().length);
  useEffect(() => {
    const onUpdate = () => setDiscoveryCount(getDiscoveredFactIds().length);
    window.addEventListener('astronutri:discovery-updated', onUpdate);
    return () => window.removeEventListener('astronutri:discovery-updated', onUpdate);
  }, []);

  const totalStarsScore =
    250 + campaign.completedMiniGames.length * 25 + state.cargoItems.length * 15 + discoveryCount * 15;
  const totalStreamlinedMissions = ([1, 2, 3, 4] as CampaignLevelId[]).reduce(
    (sum, id) => sum + CAMPAIGN_LEVELS[id].miniGames.length,
    0
  );
  const doneStreamlinedMissions = ([1, 2, 3, 4] as CampaignLevelId[]).reduce(
    (sum, id) =>
      sum + CAMPAIGN_LEVELS[id].miniGames.filter((mg) => campaign.completedMiniGames.includes(mg)).length,
    0
  );

  const handleSelectLevel = (levelId: CampaignLevelId) => {
    if (!campaign.unlockedLevels.includes(levelId)) {
      soundManager.playCautionBeep();
      return;
    }
    soundManager.playClick();
    setCampaignView('level_hub', levelId, null, null);
  };

  const handleEnterRoom = (room: SpatialRoomNode) => {
    soundManager.playClick();
    if (activeLevelId === 3 && room.id === 'food_nutrition_lab') {
      setIsEcoCabinOpen(true);
      return;
    }
    if (room.miniGameId) {
      const targetLevel = (MINI_GAME_SPECS[room.miniGameId]?.levelId ?? activeLevelId) as CampaignLevelId;
      setCampaignView('minigame', targetLevel, room.id, room.miniGameId);
      return;
    }
    if (room.consoleAction === 'l3_return_auth' && activeLevelId === 3) {
      setCampaignView('minigame', 3, room.id, null);
      return;
    }
  };

  const handleCompleteMiniGame = (id: MiniGameId, patch?: Partial<CampaignProgressState>) => {
    const alreadyDone = campaign.completedMiniGames.includes(id);
    completeCampaignMiniGame(id, patch);
    if (!alreadyDone) {
      soundManager.playDropSuccess();
      const spec = MINI_GAME_SPECS[id];
      const lvSpec = CAMPAIGN_LEVELS[spec.levelId];
      const nextStepId = lvSpec.miniGames.find(
        (mg) => mg !== id && !campaign.completedMiniGames.includes(mg)
      );
      const nextSpec = nextStepId ? MINI_GAME_SPECS[nextStepId] : null;
      setCelebrationBurst({
        titleEn: `🎉 ${spec.titleEn} Complete! +25⭐`,
        titleAr: `🎉 اكتملت ${spec.titleAr}! +25⭐`,
        nextEn: nextSpec
          ? `Next: ${nextSpec.titleEn} ➜`
          : spec.levelId === 1
          ? 'Earth Ready! Launch Rocket to Orbit! 🚀'
          : spec.levelId < 4
          ? `World ${spec.levelId} Complete! Next Planet Unlocked! 🪐`
          : 'All 14 NASA Missions Complete! 🏆',
        nextAr: nextSpec
          ? `التالي: ${nextSpec.titleAr} ➜`
          : spec.levelId === 1
          ? 'الأرض جاهزة! انطلق بالصاروخ للمدار! 🚀'
          : spec.levelId < 4
          ? `اكتمل العالم ${spec.levelId}! تم فتح الكوكب التالي! 🪐`
          : 'اكتملت جميع مهمات ناسا الـ 14! 🏆'
      });
      window.setTimeout(() => setCelebrationBurst(null), 3200);
    }
  };

  const handleJumpToLevel3Room = (roomId: string, miniGameId: MiniGameId) => {
    setCampaignView('minigame', 3, roomId, miniGameId);
  };

  const handleBackToLevel = () => {
    const returnLevelId = (
      campaign.activeMiniGameId ? MINI_GAME_SPECS[campaign.activeMiniGameId].levelId : activeLevelId
    ) as CampaignLevelId;
    setCampaignView('level_hub', returnLevelId, null, null);
  };

  const handleBackToWorldMap = () => {
    dialogueManager.stop();
    setCampaignView('world_map', activeLevelId, null, null);
  };

  const renderCelebrationBurst = () =>
    celebrationBurst ? (
      <div
        data-testid="celebration-toast-burst"
        dir={langDir}
        className="pointer-events-none fixed top-11 inset-x-0 z-[75] flex flex-col items-center px-3 animate-bounce"
      >
        <div className="relative px-4 py-2 rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-slate-950 border-2 border-yellow-200 shadow-[0_8px_28px_rgba(16,185,129,0.55)] flex flex-wrap items-center justify-center gap-2 font-hud font-black text-xs sm:text-sm">
          <span>✨🎊</span>
          <span>{tr(language, celebrationBurst.titleEn, celebrationBurst.titleAr)}</span>
          <span className="px-2.5 py-0.5 rounded-full bg-amber-300 text-slate-950 text-[11px] font-black shadow">
            {tr(language, celebrationBurst.nextEn, celebrationBurst.nextAr)}
          </span>
          <span>🎊✨</span>
        </div>
      </div>
    ) : null;

  const renderHowToPlayModal = () =>
    isHowToPlayOpen ? (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
        dir={langDir}
      >
        <div className="w-full max-w-lg rounded-3xl bg-slate-900 border-2 border-amber-400/70 p-5 space-y-3 text-white shadow-2xl">
          <div className="flex items-center justify-between">
            <h3 className="font-hud font-black text-lg text-amber-300">
              {tr(language, '🎮 How To Play AstroNutri', '🎮 كيف تلعب في أسترونوتري؟')}
            </h3>
            <button
              type="button"
              onClick={() => setIsHowToPlayOpen(false)}
              className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <ul className="space-y-2 text-xs sm:text-sm text-slate-200 leading-relaxed">
            <li>
              1️⃣{' '}
              {tr(
                language,
                'Explore 3D Space Mission Decks: Use WASD/joystick or tap "Go" and follow the golden floor arrow!',
                'تجول في منصات المهمات الفضائية ثلاثية الأبعاد بالتحكم أو بزر "اذهب" واتبع السهم الذهبي على الأرض!'
              )}
            </li>
            <li>
              2️⃣{' '}
              {tr(
                language,
                'SPACE-FIT X Suit: Open the 3D Suit Showcase to adjust smart compression, joint cables, and harvest kinetic energy.',
                'بدلة SPACE-FIT X الذكية: افتح عارض البدلة لضبط الضغط والمقاومة وحصاد الطاقة الحركية.'
              )}
            </li>
            <li>
              3️⃣{' '}
              {tr(
                language,
                'Sinai & Egyptian Space Foods: Pack crumb-free Sinai Honey, Mish, Date bars & Hydroponic Greens.',
                'الأكلات المصرية والسيناوية: جهّز عسل النحل السيناوي والمش والعجوة والجرجير بلا فتات.'
              )}
            </li>
            <li>
              4️⃣{' '}
              {tr(
                language,
                'NASA Data Honesty: Every mission pairs real DONKI/NeoWs/OSDR/ECLSS telemetry with labeled game rules.',
                'المصداقية العلمية: كل مهمة مرتبطة ببيانات ناسا الحقيقية وشارة صريحة لتبسيط اللعبة.'
              )}
            </li>
          </ul>
          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              setIsHowToPlayOpen(false);
            }}
            className="w-full py-2.5 rounded-2xl bg-amber-400 text-slate-950 font-hud font-black text-sm cursor-pointer"
          >
            {tr(language, "Got it! Let's Launch 🚀", 'فهمت! هيا نبدأ 🚀')}
          </button>
        </div>
      </div>
    ) : null;

  // ==================== CINEMATIC 3D ROCKET LAUNCH CUTSCENE ====================
  if (launchCutsceneTargetLevel !== null) {
    const destLvl = launchCutsceneTargetLevel;
    return (
      <RocketLaunchCutscene
        isOpen
        language={language}
        onComplete={() => {
          setLaunchCutsceneTargetLevel(null);
          if (campaign.unlockedLevels.includes(destLvl)) {
            setCampaignView('level_hub', destLvl, null, null);
          } else {
            setCampaignView('level_hub', activeLevelId, null, null);
          }
        }}
      />
    );
  }

  // ==================== VIEW 3: ACTIVE MINI-GAME OR L3 AUTH CONSOLE ====================
  if (campaign.viewMode === 'minigame') {
    const isL3ReturnConsole =
      activeLevelId === 3 &&
      !campaign.activeMiniGameId &&
      (campaign.activeRoomId === 'mission_control' || campaign.activeRoomId === 'lunar_exploration_zone');

    if (isL3ReturnConsole) {
      return (
        <div
          className="min-h-screen w-full pt-24 pb-10 px-4 sm:px-6 max-w-4xl mx-auto space-y-4"
          dir={langDir}
        >
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/95 border-2 border-purple-400/60 rounded-3xl p-4 shadow-xl">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleBackToLevel}
                className="px-4 py-2 rounded-2xl bg-slate-800 hover:bg-purple-700 text-white font-hud font-black text-xs sm:text-sm border border-purple-400/50 flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowRight className={`w-4 h-4 ${language === 'en' ? 'rotate-180' : ''}`} />
                <span>
                  {tr(
                    language,
                    `Level 3 Deck (${activeLevelSpec.rooms.length} Stations)`,
                    `خريطة المستوى 3 (${activeLevelSpec.rooms.length} محطات)`
                  )}
                </span>
              </button>
              <button
                type="button"
                data-testid="open-nasa-drawer-btn"
                onClick={() => {
                  soundManager.playClick();
                  openNasaDrawer();
                }}
                className="px-3 py-2 rounded-2xl bg-slate-950/90 hover:bg-slate-800 text-cyan-100 font-hud font-black text-xs border border-cyan-300/75 flex items-center gap-1.5 cursor-pointer"
              >
                <Satellite className="w-3.5 h-3.5 text-cyan-300" />
                <span>{tr(language, 'NASA Data', 'بيانات ناسا')}</span>
              </button>
            </div>
            <div className={language === 'ar' ? 'text-right' : 'text-left'}>
              <div className="font-hud font-black text-base sm:text-lg text-white">
                {tr(
                  language,
                  '🛸 Lunar Command — Earth Return Authorization',
                  '🛸 مركز قيادة القمر — إذن العودة للأرض'
                )}
              </div>
              <div className="text-xs text-purple-300 font-bold">
                {tr(
                  language,
                  'Review lunar science findings & authorize Orion launch to Node 4',
                  'مراجعة جميع نتائج القمر وتفويض انطلاق مرحلة العودة للأرض'
                )}
              </div>
            </div>
          </div>

          <div className="bg-slate-950/90 border-2 border-purple-500/40 rounded-3xl p-4 sm:p-6 shadow-2xl">
            <Level3MiniGames
              miniGameId="l3_return_auth"
              campaign={campaign}
              onCompleteMiniGame={handleCompleteMiniGame}
              onUpdateCampaign={updateCampaignState}
              onJumpToRoom={handleJumpToLevel3Room}
              onAuthorizeReturn={authorizeLunarReturn}
              onNextLevel={() => setCampaignView('level_hub', 4, null, null)}
              onBackToLevel={handleBackToLevel}
            />
          </div>
        </div>
      );
    }

    if (campaign.activeMiniGameId) {
      const mgId = campaign.activeMiniGameId;
      const isCompleted = campaign.completedMiniGames.includes(mgId);

      return (
        <>
          {renderCelebrationBurst()}
          <MiniGameShell
            miniGameId={mgId}
            isCompleted={isCompleted}
            onBackToLevel={handleBackToLevel}
            onContinueNext={() => {
              const specs = activeLevelSpec.miniGames;
              const idx = specs.indexOf(mgId);
              const nextMg =
                specs.slice(idx + 1).find((id) => !campaign.completedMiniGames.includes(id)) ??
                specs.find((id) => id !== mgId && !campaign.completedMiniGames.includes(id));
              if (nextMg) {
                const targetRoom = activeLevelSpec.rooms.find((r) => r.miniGameId === nextMg);
                setCampaignView(
                  'minigame',
                  activeLevelId,
                  targetRoom?.id ?? campaign.activeRoomId,
                  nextMg
                );
                return;
              }
              const nextLvl = (activeLevelId + 1) as CampaignLevelId;
              if (activeLevelId < 4 && campaign.unlockedLevels.includes(nextLvl)) {
                if (activeLevelId === 1) {
                  triggerRocketLaunch(2);
                  return;
                }
                setCampaignView('level_hub', nextLvl, null, null);
                return;
              }
              handleBackToLevel();
            }}
          >
            {activeLevelId === 1 && (
              <Level1MiniGames
                miniGameId={mgId}
                campaign={campaign}
                onCompleteMiniGame={handleCompleteMiniGame}
                onUpdateCampaign={updateCampaignState}
                onNextLevel={() => triggerRocketLaunch(2)}
                onBackToLevel={handleBackToLevel}
              />
            )}
            {activeLevelId === 2 && (
              <Level2MiniGames
                miniGameId={mgId}
                campaign={campaign}
                onCompleteMiniGame={handleCompleteMiniGame}
                onNextLevel={() => setCampaignView('level_hub', 3, null, null)}
                onBackToLevel={handleBackToLevel}
              />
            )}
            {activeLevelId === 3 && (
              <Level3MiniGames
                miniGameId={mgId}
                campaign={campaign}
                onCompleteMiniGame={handleCompleteMiniGame}
                onUpdateCampaign={updateCampaignState}
                onJumpToRoom={handleJumpToLevel3Room}
                onAuthorizeReturn={authorizeLunarReturn}
                onNextLevel={() => setCampaignView('level_hub', 4, null, null)}
                onBackToLevel={handleBackToLevel}
              />
            )}
            {activeLevelId === 4 && (
              <Level4MiniGames
                miniGameId={mgId}
                campaign={campaign}
                onCompleteMiniGame={handleCompleteMiniGame}
                onBackToLevel={handleBackToLevel}
                onBackToWorldMap={handleBackToWorldMap}
              />
            )}
          </MiniGameShell>
        </>
      );
    }
  }

  // ==================== VIEW 2: FULL-VIEWPORT 3D MISSION DECK & STATIONS ====================
  if (campaign.viewMode === 'level_hub' || campaign.viewMode === 'minigame') {
    const levelDoneCount = activeLevelSpec.miniGames.filter((id) =>
      campaign.completedMiniGames.includes(id)
    ).length;
    const allLevelGamesDone = levelDoneCount >= activeLevelSpec.miniGames.length;
    const nextLevelId = (activeLevelId + 1) as CampaignLevelId;
    const canEnterNextLevel =
      activeLevelId < 4 && campaign.unlockedLevels.includes(nextLevelId);

    const activeLvMeta = LEVEL_TITLES_BILINGUAL[activeLevelId];

    return (
      <div
        className="relative w-full h-[100dvh] overflow-hidden bg-[#07122b] text-white"
        dir={langDir}
      >
        {renderCelebrationBurst()}
        {/* Full-Viewport 3D Mission Deck & Third-Person Astronaut Scene */}
        <div className="absolute inset-0 w-full h-full z-0">
          <SpatialRoomMap3D
            levelId={activeLevelId}
            campaign={campaign}
            suitState={campaign.spaceFitX}
            onEnterRoom={handleEnterRoom}
          />
        </div>

        {/* Ultra-Slim Single-Row Corner HUD (Level Hub) */}
        <header
          data-testid="top-hud-bar"
          dir="ltr"
          className="safe-area-hud pointer-events-none fixed top-1.5 inset-x-2 sm:inset-x-3 z-30 h-9 sm:h-10 max-h-[40px] sm:max-h-[44px] flex items-center justify-between gap-1.5"
        >
          {/* Left Group: Back Icon + Inline Energy/O2 + Compact Step Pill + Level 1 Launch */}
          <div className="pointer-events-auto flex items-center gap-1 sm:gap-1.5 min-w-0">
            <button
              type="button"
              data-testid="hud-back-world-btn"
              onClick={handleBackToWorldMap}
              className="h-8 px-2 sm:px-2.5 rounded-full bg-sky-600/85 hover:bg-sky-500 text-white font-hud font-black text-[11px] border border-cyan-200/80 backdrop-blur-md shadow flex items-center gap-1 cursor-pointer shrink-0"
              aria-label={tr(language, 'Back to Space Map', 'الخريطة الرئيسية')}
              dir={langDir}
            >
              <ArrowRight className={`w-3.5 h-3.5 shrink-0 ${language === 'en' ? 'rotate-180' : ''}`} />
              <span className="hidden md:inline">{tr(language, 'Map', 'الخريطة')}</span>
            </button>

            <MissionInventoryBar inlineSlim campaign={campaign} activeLevelId={activeLevelId} language={language} />

            <button
              type="button"
              data-testid="top-mission-banner"
              dir={langDir}
              onClick={() => {
                soundManager.playClick();
                window.dispatchEvent(new CustomEvent('astronutri:auto-walk-next'));
              }}
              className="h-8 px-2 sm:px-3 rounded-full bg-slate-950/75 hover:bg-slate-900 border border-amber-300/80 backdrop-blur-md shadow text-[10px] sm:text-xs font-hud font-black text-white flex items-center gap-1 min-w-0 max-w-[140px] sm:max-w-[230px] cursor-pointer active:scale-95 transition-transform"
              title={tr(language, seqTarget.roboEn, seqTarget.roboAr)}
            >
              <span className="text-amber-300 shrink-0">🎯</span>
              <span className="lg:hidden truncate">
                {tr(
                  language,
                  `Step ${seqTarget.stepNumber}/${activeLevelSpec.miniGames.length}`,
                  `خطوة ${seqTarget.stepNumber}/${activeLevelSpec.miniGames.length}`
                )}
              </span>
              <span className="hidden lg:inline truncate">{tr(language, seqTarget.roboEn, seqTarget.roboAr)}</span>
            </button>

            {activeLevelId === 1 && (allLevelGamesDone || isDemoMode) && (
              <button
                type="button"
                data-testid="launch-to-space-btn"
                dir={langDir}
                onClick={() => {
                  soundManager.playClick();
                  triggerRocketLaunch(2);
                }}
                aria-label={tr(language, 'Launch to Space', 'انطلق للفضاء')}
                title={tr(language, 'Launch to Space', 'انطلق للفضاء')}
                className="h-8 px-2 sm:px-2.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 hover:brightness-110 text-slate-950 font-hud font-black text-[10px] sm:text-xs border border-white shadow cursor-pointer active:scale-95 transition-transform flex items-center gap-1 shrink-0"
              >
                <span>🚀</span>
                <span className="hidden lg:inline">{tr(language, 'Launch', 'إقلاع')}</span>
              </button>
            )}
          </div>

          {/* Right Group: Compact EN/AR Quick Toggle + Robo Guide + ONE Menu Button */}
          <div className="pointer-events-auto flex items-center gap-1 sm:gap-1.5 shrink-0">
            <button
              type="button"
              data-testid="hud-lang-toggle"
              onClick={() => {
                soundManager.playClick();
                setLanguage(language === 'en' ? 'ar' : 'en');
              }}
              className="h-8 px-2 sm:px-2.5 rounded-full bg-slate-950/80 hover:bg-slate-800 text-cyan-200 font-hud font-black text-[11px] border border-cyan-400/75 backdrop-blur-md shadow cursor-pointer whitespace-nowrap"
            >
              {language === 'en' ? 'AR' : 'EN'}
            </button>

            {activeLevelId === 3 && allLevelGamesDone && !campaign.l3ReturnAuthorized && (
              <button
                type="button"
                onClick={() => setCampaignView('minigame', 3, 'mission_control', null)}
                className="h-8 px-2 rounded-full bg-purple-600 hover:bg-purple-500 text-white font-black text-[11px] border border-purple-200 animate-pulse cursor-pointer whitespace-nowrap shadow"
                dir={langDir}
              >
                {tr(language, '🛸 Auth', '🛸 إذن')}
              </button>
            )}

            <button
              type="button"
              data-testid="hud-story-toggle"
              onClick={() => {
                soundManager.playClick();
                setShowLevelStory((v) => !v);
              }}
              aria-label={tr(language, showLevelStory ? 'Hide Robo' : 'Ask Robo', showLevelStory ? 'إخفاء روبو' : 'اسأل روبو')}
              title={tr(language, showLevelStory ? 'Hide Robo' : 'Ask Robo', showLevelStory ? 'إخفاء روبو' : 'اسأل روبو')}
              className={`h-8 px-2 rounded-full border backdrop-blur-md shadow cursor-pointer flex items-center gap-1 text-[11px] font-hud font-black ${
                showLevelStory
                  ? 'bg-cyan-500/30 border-cyan-300 text-cyan-100'
                  : 'bg-slate-950/75 border-cyan-400/50 text-cyan-200'
              }`}
            >
              <span>🤖</span>
              <span className="hidden lg:inline">
                {tr(language, showLevelStory ? 'Hide' : 'Robo', showLevelStory ? 'إخفاء' : 'روبو')}
              </span>
            </button>

            <button
              type="button"
              data-testid="mobile-menu-toggle"
              onClick={() => {
                soundManager.playClick();
                setIsMobileMenuOpen((v) => !v);
              }}
              className="h-8 px-2.5 sm:px-3 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-hud font-black text-xs border-2 border-white shadow-[0_2px_0_#b45309] flex items-center gap-1 cursor-pointer whitespace-nowrap"
              aria-label={tr(language, 'Menu', 'القائمة')}
              dir={langDir}
            >
              {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              <span className="hidden sm:inline">{tr(language, 'Menu', 'القائمة')}</span>
            </button>
          </div>
        </header>

        {/* Animated Robo Guide Speech Card (Bottom-Center, Clear of Mobile Controls) */}
        <RoboGuideOverlay
          visible={
            showLevelStory &&
            !isMobileMenuOpen &&
            !isRoomsDrawerOpen &&
            !isEcoCabinOpen &&
            !isSuitShowcaseOpen &&
            !isSettingsOpen &&
            !isSourcesOpen &&
            !isHowToPlayOpen
          }
          language={language}
          pose={seqTarget.isAllDone ? 'CELEBRATING' : 'TALKING'}
          speakerNameEn="Robo Guide"
          speakerNameAr="روبو المرشد"
          messageEn={seqTarget.roboEn}
          messageAr={seqTarget.roboAr}
          actionLabelEn={seqTarget.activeRoom ? 'Go There!' : undefined}
          actionLabelAr={seqTarget.activeRoom ? 'انطلق إليها!' : undefined}
          onAction={
            seqTarget.activeRoom
              ? () => window.dispatchEvent(new CustomEvent('astronutri:auto-walk-next'))
              : undefined
          }
          onDismiss={() => setShowLevelStory(false)}
          testId="robo-guide-overlay"
        />

        {/* Quick Direct Station Selector Bar Inside Planet Hub (Bottom-Center) */}
        <div
          data-testid="planet-stations-bar"
          dir={langDir}
          className="pointer-events-none fixed bottom-2.5 inset-x-0 z-20 flex justify-center pl-24 pr-44 sm:pl-28 sm:pr-52 lg:px-3"
        >
          <div className="pointer-events-auto inline-flex items-center justify-center gap-1 px-1.5 py-0.5 rounded-full bg-slate-950/82 border border-cyan-400/55 backdrop-blur-md shadow-xl max-w-full overflow-x-auto">
            {activeLevelSpec.rooms.map((room, rIdx) => {
              const isDone = room.miniGameId
                ? campaign.completedMiniGames.includes(room.miniGameId)
                : room.consoleAction === 'l3_return_auth'
                ? campaign.l3ReturnAuthorized
                : false;
              const isActiveStep = !seqTarget.isAllDone && seqTarget.activeRoom?.id === room.id;
              return (
                <button
                  key={room.id}
                  type="button"
                  data-testid={`station-pill-${room.id}`}
                  onClick={() => handleEnterRoom(room)}
                  className={`px-2 sm:px-2.5 py-1 rounded-full border text-[10px] sm:text-[11px] font-hud font-black flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    isActiveStep
                      ? 'bg-amber-400 text-slate-950 border-white shadow-md'
                      : isDone
                      ? 'bg-emerald-950/80 border-emerald-400/70 text-emerald-200 hover:bg-emerald-900'
                      : 'bg-slate-900/80 border-white/25 text-white hover:bg-slate-800'
                  }`}
                >
                  <span>{room.icon}</span>
                  <span className="hidden md:inline">{`${rIdx + 1}. ${tr(language, room.nameEn, room.nameAr)}`}</span>
                  <span className="md:hidden">{`${rIdx + 1}`}</span>
                  {isDone && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Clean Unified Pause & Navigation Drawer (Level Hub) */}
        {isMobileMenuOpen && (
          <div
            data-testid="mobile-menu-drawer"
            dir={langDir}
            className="fixed top-11 sm:top-12 right-2.5 sm:right-4 z-40 w-[calc(100vw-20px)] max-w-sm max-h-[calc(100vh-56px)] overflow-y-auto rounded-3xl bg-slate-950/95 border-2 border-cyan-300/80 p-3.5 shadow-2xl space-y-2.5"
          >
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800">
              <div className="text-xs font-hud font-black text-cyan-200 truncate">
                {activeLvMeta.badge} {tr(language, activeLvMeta.shortEn, activeLvMeta.shortAr)}
              </div>
              <span className="text-[11px] font-bold text-emerald-300 whitespace-nowrap">
                ✅ {levelDoneCount}/{activeLevelSpec.miniGames.length} {tr(language, 'Missions', 'مهام')}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                data-testid="toggle-rooms-drawer-btn"
                onClick={() => {
                  soundManager.playClick();
                  setIsMobileMenuOpen(false);
                  setIsRoomsDrawerOpen((v) => !v);
                }}
                className="p-2.5 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-hud font-black text-xs border-2 border-sky-200/80 shadow-[0_3px_0_#075985] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <DoorOpen className="w-4 h-4" />
                <span>{tr(language, `Stations (${activeLevelSpec.rooms.length})`, `المحطات (${activeLevelSpec.rooms.length})`)}</span>
              </button>

              <button
                type="button"
                data-testid="open-spacefitx-showcase"
                onClick={() => {
                  soundManager.playClick();
                  setIsMobileMenuOpen(false);
                  setIsSuitShowcaseOpen(true);
                }}
                className="p-2.5 rounded-2xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-hud font-black text-xs border-2 border-white shadow-[0_3px_0_#0e7490] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Shield className="w-4 h-4" />
                <span>{tr(language, 'SPACE-FIT X', 'بدلة الفضاء')}</span>
              </button>

              {activeLevelId <= 3 && (
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playClick();
                    setIsMobileMenuOpen(false);
                    setIsEcoCabinOpen(true);
                  }}
                  className="p-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-hud font-black text-xs border-2 border-emerald-200 shadow-[0_3px_0_#065f46] flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Sprout className="w-4 h-4" />
                  <span>{tr(language, 'Hydroponics', 'الزراعة المائية')}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  soundManager.playClick();
                  setIsMobileMenuOpen(false);
                  setIsSourcesOpen(true);
                }}
                className="p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-sky-200 font-hud font-black text-xs border-2 border-sky-400/50 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <BookOpen className="w-4 h-4 text-sky-300" />
                <span>{tr(language, 'Sources (13)', 'مصادر (13)')}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundManager.playClick();
                  setIsMobileMenuOpen(false);
                  setIsHowToPlayOpen(true);
                }}
                className="p-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-hud font-black text-xs border-2 border-white flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <HelpCircle className="w-4 h-4" />
                <span>{tr(language, 'How to Play', 'كيف تلعب؟')}</span>
              </button>

              <button
                type="button"
                data-testid="open-nasa-drawer-btn"
                onClick={() => {
                  soundManager.playClick();
                  setIsMobileMenuOpen(false);
                  openNasaDrawer();
                }}
                className="p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-cyan-200 font-hud font-black text-xs border-2 border-cyan-400/60 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Satellite className="w-4 h-4 text-cyan-300" />
                <span>{tr(language, 'NASA Data', 'بيانات ناسا')}</span>
              </button>

              <button
                type="button"
                data-testid="hud-fullscreen-btn"
                onClick={() => {
                  soundManager.playClick();
                  void toggleFullscreenLandscape();
                }}
                className="p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-cyan-100 font-hud font-black text-xs border-2 border-cyan-300/50 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Maximize2 className="w-4 h-4 text-cyan-300" />
                <span>{tr(language, 'Fullscreen', 'ملء الشاشة')}</span>
              </button>

              <button
                type="button"
                data-testid="hud-sound-toggle-btn"
                onClick={toggleSoundMute}
                className="p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-hud font-black text-xs border-2 border-slate-500 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isSoundMuted ? (
                  <VolumeX className="w-4 h-4 text-rose-400" />
                ) : (
                  <Volume2 className={`w-4 h-4 text-cyan-300 ${isAudioPlaying ? 'animate-pulse text-amber-300' : ''}`} />
                )}
                <span>{tr(language, isSoundMuted ? 'Sound: Off' : 'Sound: On', isSoundMuted ? 'الصوت: صامت' : 'الصوت: مفعل')}</span>
              </button>

              <button
                type="button"
                data-testid="open-settings-btn"
                onClick={() => {
                  soundManager.playClick();
                  setIsMobileMenuOpen(false);
                  setIsSettingsOpen(true);
                }}
                className="p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-hud font-black text-xs border-2 border-slate-500 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Settings className="w-4 h-4" />
                <span>{tr(language, 'Settings', 'الإعدادات')}</span>
              </button>

              {canEnterNextLevel && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    if (nextLevelId === 2) {
                      triggerRocketLaunch(2);
                    } else {
                      setCampaignView('level_hub', nextLevelId, null, null);
                    }
                  }}
                  className="col-span-2 p-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-hud font-black text-xs border-2 border-white flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Rocket className="w-4 h-4" />
                  <span>{tr(language, `Advance to Level ${nextLevelId}`, `الانتقال إلى المستوى ${nextLevelId}`)}</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Expandable Rooms & Sequential Missions Drawer */}
        {isRoomsDrawerOpen && (
          <div className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
            <div className="w-full max-w-5xl rounded-3xl bg-slate-900 border-2 border-cyan-400/60 p-4 sm:p-6 space-y-4 shadow-2xl my-auto">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-hud font-black text-lg text-cyan-200 flex items-center gap-2">
                    <Compass className="w-5 h-5 text-cyan-400" />
                    <span>
                      {tr(language, activeLvMeta.titleEn, activeLvMeta.titleAr)} • {tr(language, 'Sequential Steps', 'المهام المتسلسلة')}
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    {tr(language, activeLvMeta.subtitleEn, activeLvMeta.subtitleAr)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsRoomsDrawerOpen(false)}
                  className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {activeLevelSpec.nasaDatasets.map((ds) => (
                  <span
                    key={ds}
                    className="px-2.5 py-0.5 rounded-full bg-indigo-950/75 border border-indigo-400/40 text-[10px] font-bold text-indigo-200"
                  >
                    🛰️ {ds}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-[60vh] overflow-y-auto pr-1">
                {activeLevelSpec.miniGames.map((mgId) => {
                  const spec = MINI_GAME_SPECS[mgId];
                  const done = campaign.completedMiniGames.includes(mgId);
                  const isActiveStep = !done && seqTarget.activeMiniGameId === mgId;
                  const unlockedStep = true;
                  return (
                    <button
                      key={mgId}
                      type="button"
                      disabled={!unlockedStep}
                      onClick={() => {
                        if (!unlockedStep) return;
                        soundManager.playClick();
                        setIsRoomsDrawerOpen(false);
                        setCampaignView('minigame', activeLevelId, spec.roomId, mgId);
                      }}
                      className={`p-3 rounded-2xl border-2 flex items-center justify-between gap-2 transition-all ${
                        language === 'ar' ? 'text-right' : 'text-left'
                      } ${
                        done
                          ? 'bg-emerald-950/50 border-emerald-400/70 text-white cursor-pointer'
                          : isActiveStep
                          ? 'bg-amber-950/60 border-amber-300 text-white shadow-[0_0_16px_rgba(251,191,36,0.3)] cursor-pointer'
                          : isDemoMode
                          ? 'bg-slate-950/75 border-cyan-500/45 hover:border-cyan-400 text-slate-100 cursor-pointer'
                          : 'bg-slate-950/50 border-slate-800 text-slate-500 opacity-60 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-2xl shrink-0">{spec.icon}</span>
                        <div className="min-w-0">
                          <div className="font-black text-xs truncate">
                            {spec.orderInLevel}. {tr(language, spec.titleEn, spec.titleAr)}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">{spec.nasaBadge}</div>
                        </div>
                      </div>
                      {done ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                      ) : isActiveStep ? (
                        <span className="text-[11px] font-black text-amber-300 shrink-0">
                          {tr(language, 'Active 🎯', 'ابدأ 🎯')}
                        </span>
                      ) : unlockedStep ? (
                        <span className="text-[11px] font-black text-cyan-300 shrink-0">
                          {tr(language, 'Open', 'افتح')}
                        </span>
                      ) : (
                        <Lock className="w-4 h-4 text-slate-500 shrink-0" />
                      )}
                    </button>
                  );
                })}

                {activeLevelId === 3 && (
                  <button
                    type="button"
                    disabled={!allLevelGamesDone && !isDemoMode && !campaign.l3ReturnAuthorized}
                    onClick={() => {
                      setIsRoomsDrawerOpen(false);
                      setCampaignView('minigame', 3, 'mission_control', null);
                    }}
                    className={`p-3 rounded-2xl border-2 flex items-center justify-between gap-2 transition-all ${
                      language === 'ar' ? 'text-right' : 'text-left'
                    } ${
                      campaign.l3ReturnAuthorized
                        ? 'bg-purple-950/60 border-purple-400 text-white cursor-pointer'
                        : allLevelGamesDone || isDemoMode
                        ? 'bg-slate-950/75 border-purple-400 hover:border-purple-300 text-purple-100 cursor-pointer'
                        : 'bg-slate-950/50 border-slate-800 text-slate-500 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-2xl shrink-0">🛸</span>
                      <div className="min-w-0">
                        <div className="font-black text-xs truncate">
                          {tr(language, 'Lunar Mission Control', 'مركز قيادة القمر')}
                        </div>
                        <div className="text-[10px] text-purple-300 truncate">
                          {tr(language, 'Earth Return Auth (Level 4)', 'تفويض العودة للأرض (المستوى 4)')}
                        </div>
                      </div>
                    </div>
                    {campaign.l3ReturnAuthorized ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    ) : allLevelGamesDone || isDemoMode ? (
                      <span className="text-[11px] font-black text-purple-300 shrink-0">
                        {tr(language, 'Check', 'افحص')}
                      </span>
                    ) : (
                      <Lock className="w-4 h-4 text-slate-500 shrink-0" />
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Self-Sustaining Eco-Bio Cabin Modal Overlay */}
        {isEcoCabinOpen && activeLevelId <= 3 && (
          <div className="fixed inset-0 z-40 bg-slate-950/85 backdrop-blur-md p-3 sm:p-6 overflow-y-auto flex items-start sm:items-center justify-center">
            <div className="w-full max-w-6xl my-auto">
              <EcoBioCabin
                levelId={activeLevelId}
                campaign={campaign}
                onUpdateCampaign={updateCampaignState}
                onClose={() => setIsEcoCabinOpen(false)}
              />
            </div>
          </div>
        )}

        <SpaceFitXShowcase
          isOpen={isSuitShowcaseOpen}
          suitState={campaign.spaceFitX}
          onChangeSuitState={(next) => updateCampaignState({ spaceFitX: next })}
          onClose={() => setIsSuitShowcaseOpen(false)}
        />
        <ScientificSourcesModal isOpen={isSourcesOpen} onClose={() => setIsSourcesOpen(false)} />
        <SettingsMenu isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
        {renderHowToPlayModal()}
      </div>
    );
  }

  // ==================== VIEW 1: FULL-VIEWPORT 3D NASA SPACE TRAJECTORY MAP ====================
  return (
    <div
      className="relative w-full h-[100dvh] overflow-hidden bg-[#07122b] text-white"
      dir={langDir}
    >
      {/* Full-Viewport 3D Earth-to-Moon Orbital Trajectory */}
      {renderCelebrationBurst()}
      <div className="absolute inset-0 w-full h-full z-0">
        <WorldNavigator3D
          campaign={campaign}
          suitState={campaign.spaceFitX}
          onSelectLevel={handleSelectLevel}
        />
      </div>

      {/* Ultra-Slim Single-Row Corner HUD (World Map) */}
      <header
        data-testid="top-hud-bar"
        dir="ltr"
        className="safe-area-hud pointer-events-none fixed top-1.5 inset-x-2 sm:inset-x-3 z-30 h-9 sm:h-10 max-h-[40px] sm:max-h-[44px] flex items-center justify-between gap-1.5"
      >
        {/* Physical Top-Left: Gold Star Counter + Inline Energy/O2 + Play */}
        <div className="pointer-events-auto flex items-center gap-1 sm:gap-1.5 min-w-0">
          <div
            dir={langDir}
            className="h-8 flex items-center gap-1 px-2 sm:px-2.5 rounded-full bg-slate-950/75 border border-amber-300/75 backdrop-blur-md shadow shrink-0"
          >
            <img
              src="/assets/ui/star_coin.svg"
              alt=""
              className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 drop-shadow"
            />
            <span className="font-hud font-black text-[11px] sm:text-xs text-amber-300 tabular-nums">
              {totalStarsScore}
            </span>
            <span className="hidden md:inline text-[10px] font-bold text-slate-200 border-s border-white/20 ps-1.5 whitespace-nowrap">
              {doneStreamlinedMissions}/{totalStreamlinedMissions}
            </span>
          </div>

          <MissionInventoryBar inlineSlim campaign={campaign} activeLevelId={activeLevelId} language={language} />

          <button
            type="button"
            onClick={() => {
              const highestUnlocked =
                [...campaign.unlockedLevels].sort((a, b) => b - a)[0] || 1;
              handleSelectLevel(highestUnlocked);
            }}
            className="h-8 casual-btn-emerald px-2.5 sm:px-3 text-[11px] sm:text-xs cursor-pointer flex items-center gap-1 whitespace-nowrap rounded-full shrink-0"
            dir={langDir}
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>{tr(language, 'Play', 'ابدأ')}</span>
          </button>
        </div>

        {/* Physical Top-Right: AR/EN Toggle + Robo Guide + ONE Menu Button */}
        <div className="pointer-events-auto flex items-center gap-1 sm:gap-1.5 shrink-0">
          <button
            type="button"
            data-testid="hud-lang-toggle"
            onClick={() => {
              soundManager.playClick();
              setLanguage(language === 'en' ? 'ar' : 'en');
            }}
            className="h-8 px-2 sm:px-2.5 rounded-full bg-slate-950/80 hover:bg-slate-800 text-cyan-200 font-hud font-black text-[11px] border border-cyan-400/75 backdrop-blur-md shadow cursor-pointer whitespace-nowrap"
          >
            {language === 'en' ? 'AR' : 'EN'}
          </button>

          <button
            type="button"
            data-testid="hud-story-toggle"
            onClick={() => {
              soundManager.playClick();
              setShowWorldRoboGuide((v) => !v);
            }}
            aria-label={tr(language, showWorldRoboGuide ? 'Hide Robo' : 'Ask Robo', showWorldRoboGuide ? 'إخفاء روبو' : 'اسأل روبو')}
            title={tr(language, showWorldRoboGuide ? 'Hide Robo' : 'Ask Robo', showWorldRoboGuide ? 'إخفاء روبو' : 'اسأل روبو')}
            className={`h-8 px-2 rounded-full border backdrop-blur-md shadow cursor-pointer flex items-center gap-1 text-[11px] font-hud font-black ${
              showWorldRoboGuide
                ? 'bg-cyan-500/30 border-cyan-300 text-cyan-100'
                : 'bg-slate-950/75 border-cyan-400/50 text-cyan-200'
            }`}
          >
            <span>🤖</span>
          </button>

          <button
            type="button"
            data-testid="mobile-menu-toggle"
            onClick={() => {
              soundManager.playClick();
              setIsMobileMenuOpen((v) => !v);
            }}
            className="h-8 px-2.5 sm:px-3 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-hud font-black text-xs border-2 border-white shadow-[0_2px_0_#b45309] flex items-center gap-1 cursor-pointer whitespace-nowrap"
            aria-label={tr(language, 'Menu', 'القائمة')}
            dir={langDir}
          >
            {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            <span className="hidden sm:inline">{tr(language, 'Menu', 'القائمة')}</span>
          </button>
        </div>
      </header>

      {/* Animated Robo Guide Welcome Card (Earth-to-Moon World Map) */}
      <RoboGuideOverlay
        visible={
          showWorldRoboGuide &&
          !isMobileMenuOpen &&
          !isLevelsDrawerOpen &&
          !isEcoCabinOpen &&
          !isSuitShowcaseOpen &&
          !isSettingsOpen &&
          !isSourcesOpen &&
          !isHowToPlayOpen
        }
        language={language}
        pose="WAVE"
        speakerNameEn="Robo Guide"
        speakerNameAr="روبو المرشد"
        messageEn="Pick any unlocked planet gateway on the Command Deck! 🚀"
        messageAr="اختر أي بوابة كوكبية مفتوحة من ساحة قيادة الفضاء! 🚀"
        actionLabelEn={`Enter Sector ${highestUnlockedNodeId}`}
        actionLabelAr={`ادخل الكوكب ${highestUnlockedNodeId}`}
        onAction={() => handleSelectLevel(highestUnlockedNodeId)}
        onDismiss={() => setShowWorldRoboGuide(false)}
        testId="robo-guide-overlay"
      />

      {/* Unified Pause & Arcade Menu Drawer (World Map) */}
      {isMobileMenuOpen && (
        <div
          data-testid="mobile-menu-drawer"
          dir={langDir}
          className="fixed top-11 sm:top-12 right-2.5 sm:right-4 z-40 w-[calc(100vw-20px)] max-w-sm max-h-[calc(100vh-56px)] overflow-y-auto rounded-3xl bg-slate-950/95 border-2 border-cyan-300/80 p-3.5 shadow-2xl space-y-2.5"
        >
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2 min-w-0">
              <img
                src="/assets/ui/astro_badge.svg"
                alt="AstroNutri Crest"
                className="w-7 h-7 shrink-0 drop-shadow"
              />
              <span className="font-hud font-black text-xs text-white truncate">
                {state.cadetName ? state.cadetName : tr(language, 'Explorer', 'رائد الفضاء')}
              </span>
            </div>
            <span className="text-[11px] font-hud font-black text-amber-300 whitespace-nowrap">
              ⭐ {totalStarsScore} • {doneStreamlinedMissions}/{totalStreamlinedMissions}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              data-testid="toggle-levels-drawer-btn"
              onClick={() => {
                soundManager.playClick();
                setIsMobileMenuOpen(false);
                setIsLevelsDrawerOpen((v) => !v);
              }}
              className="p-2.5 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-hud font-black text-xs border-2 border-sky-200/80 shadow-[0_3px_0_#075985] flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Layers className="w-4 h-4" />
              <span>{tr(language, 'Space Nodes (4)', 'مراحل المسار (4)')}</span>
            </button>

            <button
              type="button"
              data-testid="open-spacefitx-showcase"
              onClick={() => {
                soundManager.playClick();
                setIsMobileMenuOpen(false);
                setIsSuitShowcaseOpen(true);
              }}
              className="p-2.5 rounded-2xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-hud font-black text-xs border-2 border-white shadow-[0_3px_0_#0e7490] flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Shield className="w-4 h-4" />
              <span>{tr(language, 'SPACE-FIT X', 'بدلة الفضاء')}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundManager.playClick();
                setIsMobileMenuOpen(false);
                setIsEcoCabinOpen(true);
              }}
              className="p-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-hud font-black text-xs border-2 border-emerald-200 shadow-[0_3px_0_#065f46] flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Sprout className="w-4 h-4" />
              <span>{tr(language, 'Hydroponics', 'الزراعة المائية')}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundManager.playClick();
                setIsMobileMenuOpen(false);
                setLocation('SpaceScience');
              }}
              className="p-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-hud font-black text-xs border-2 border-indigo-200/70 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>🪐</span>
              <span>{tr(language, 'Planets & Gravity', 'الكواكب والجاذبية')}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundManager.playClick();
                setIsMobileMenuOpen(false);
                setIsSourcesOpen(true);
              }}
              className="p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-emerald-200 font-hud font-black text-xs border-2 border-emerald-400/50 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-emerald-300" />
              <span>{tr(language, 'Sources (13)', 'مصادر (13)')}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundManager.playClick();
                setIsMobileMenuOpen(false);
                setIsHowToPlayOpen(true);
              }}
              className="p-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-hud font-black text-xs border-2 border-white flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <HelpCircle className="w-4 h-4" />
              <span>{tr(language, 'How to Play', 'كيف تلعب؟')}</span>
            </button>

            <button
              type="button"
              data-testid="open-nasa-drawer-btn"
              onClick={() => {
                soundManager.playClick();
                setIsMobileMenuOpen(false);
                openNasaDrawer();
              }}
              className="p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-cyan-200 font-hud font-black text-xs border-2 border-cyan-400/60 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Satellite className="w-4 h-4 text-cyan-300" />
              <span>{tr(language, 'NASA Data', 'بيانات ناسا')}</span>
            </button>

            <button
              type="button"
              data-testid="hud-fullscreen-btn"
              onClick={() => {
                soundManager.playClick();
                void toggleFullscreenLandscape();
              }}
              className="p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-cyan-100 font-hud font-black text-xs border-2 border-cyan-300/50 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Maximize2 className="w-4 h-4 text-cyan-300" />
              <span>{tr(language, 'Fullscreen', 'ملء الشاشة')}</span>
            </button>

            <button
              type="button"
              data-testid="hud-sound-toggle-btn"
              onClick={toggleSoundMute}
              className="p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-hud font-black text-xs border-2 border-slate-500 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {isSoundMuted ? (
                <VolumeX className="w-4 h-4 text-rose-400" />
              ) : (
                <Volume2 className={`w-4 h-4 text-cyan-300 ${isAudioPlaying ? 'animate-pulse text-amber-300' : ''}`} />
              )}
              <span>{tr(language, isSoundMuted ? 'Sound: Off' : 'Sound: On', isSoundMuted ? 'الصوت: صامت' : 'الصوت: مفعل')}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundManager.playClick();
                if (isAudioPlaying) {
                  dialogueManager.stop();
                } else {
                  dialogueManager.speak(
                    tr(
                      language,
                      'Welcome Cadet! Pick an Earth-to-Moon orbital node or tap Play to launch your next NASA mission!',
                      'أهلاً يا بطل! اختر محطة على مسار الأرض إلى القمر أو اضغط ابدأ لدخول المحطات الفضائية!'
                    )
                  );
                }
              }}
              className="p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-cyan-200 font-hud font-black text-xs border-2 border-cyan-400/50 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Volume2 className={`w-4 h-4 ${isAudioPlaying ? 'animate-pulse text-amber-300' : 'text-cyan-300'}`} />
              <span>{tr(language, 'Robo Voice', 'صوت روبو')}</span>
            </button>

            <button
              type="button"
              data-testid="open-settings-btn"
              onClick={() => {
                soundManager.playClick();
                setIsMobileMenuOpen(false);
                setIsSettingsOpen(true);
              }}
              className="col-span-2 p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-hud font-black text-xs border-2 border-slate-500 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Settings className="w-4 h-4" />
              <span>{tr(language, 'Settings / Unlock All', 'الإعدادات / وضع التحكيم')}</span>
            </button>
          </div>
        </div>
      )}

      {/* Expandable 4-Level Sequential Overview Modal Drawer */}
      {isLevelsDrawerOpen && (
        <div
          dir={language === 'ar' ? 'rtl' : 'ltr'}
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
        >
          <div className="w-full max-w-6xl rounded-3xl bg-slate-900 border-2 border-cyan-400/60 p-4 sm:p-6 space-y-4 shadow-2xl my-auto">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="font-hud font-black text-lg sm:text-xl text-cyan-200">
                  {tr(
                    language,
                    '🚀 Earth-to-Moon Orbital Map (4 Nodes • 14 Stations)',
                    '🚀 مسار الرحلة من الأرض إلى القمر (4 مراحل • 14 محطة)'
                  )}
                </h2>
                <p className="text-xs text-slate-400">
                  {tr(language, 'Save Status:', 'التخزين:')}{' '}
                  {storageStatus === 'VALID_SAVE' || storageStatus === 'NO_SAVE'
                    ? tr(language, '✅ Auto-Saved', '✅ محفوظ تلقائياً')
                    : tr(language, 'Safe Mode', 'وضع الحماية')}{' '}
                  • {nasaCache.getAttribution()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsLevelsDrawerOpen(false)}
                className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center cursor-pointer"
                aria-label={tr(language, 'Close', 'إغلاق')}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <section id="campaign-levels-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {([1, 2, 3, 4] as CampaignLevelId[]).map((lvlId) => {
                const lvl = CAMPAIGN_LEVELS[lvlId];
                const biLvl = LEVEL_TITLES_BILINGUAL[lvlId];
                const unlocked = campaign.unlockedLevels.includes(lvlId);
                const doneCount = lvl.miniGames.filter((id) =>
                  campaign.completedMiniGames.includes(id)
                ).length;
                const total = lvl.miniGames.length;
                const completedAll = doneCount >= total && (lvlId !== 3 || campaign.l3ReturnAuthorized);

                return (
                  <motion.div
                    key={lvlId}
                    whileHover={unlocked ? { y: -3 } : undefined}
                    className={`rounded-3xl p-4 border-2 flex flex-col justify-between gap-3 transition-all ${
                      !unlocked
                        ? 'bg-slate-950/75 border-slate-800 opacity-75'
                        : completedAll
                        ? 'bg-emerald-950/35 border-emerald-400/70 shadow-lg'
                        : 'bg-slate-950/85 border-cyan-400/60 shadow-xl'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className="px-2.5 py-0.5 rounded-full text-[11px] font-black text-slate-950"
                          style={{ backgroundColor: unlocked ? lvl.themeColorHex : '#64748b' }}
                        >
                          {tr(language, `Level ${lvlId}`, `المستوى ${lvlId}`)}
                        </span>
                        <span className="text-xs font-bold text-slate-300">
                          {tr(
                            language,
                            `${lvl.rooms.length} Stations`,
                            `${lvl.rooms.length} محطات`
                          )}
                        </span>
                      </div>

                      <h3 className="font-hud font-black text-base text-white">
                        {tr(language, biLvl.titleEn, biLvl.titleAr)}
                      </h3>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {tr(language, biLvl.subtitleEn, biLvl.subtitleAr)}
                      </p>
                    </div>

                    <div className="space-y-2.5">
                      <div className="h-2 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
                        <div
                          className="h-full transition-all"
                          style={{
                            width: `${Math.round((doneCount / total) * 100)}%`,
                            backgroundColor: completedAll ? '#34d399' : lvl.themeColorHex
                          }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
                        <span>{tr(language, `Progress: ${doneCount}/${total}`, `التقدم: ${doneCount}/${total}`)}</span>
                        {completedAll ? (
                          <span className="text-emerald-300">{tr(language, '✅ Completed', '✅ مكتمل')}</span>
                        ) : unlocked ? (
                          <span className="text-cyan-300">{tr(language, 'Unlocked', 'مفتوح')}</span>
                        ) : (
                          <span className="text-slate-400">{tr(language, '🔒 Locked', '🔒 مقفل')}</span>
                        )}
                      </div>

                      <button
                        type="button"
                        data-testid={`drawer-enter-node-${lvlId}`}
                        disabled={!unlocked}
                        onClick={() => {
                          setIsLevelsDrawerOpen(false);
                          handleSelectLevel(lvlId);
                        }}
                        className={`w-full py-2.5 rounded-2xl font-hud font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all ${
                          unlocked
                            ? 'bg-gradient-to-r from-cyan-500 to-sky-600 hover:from-cyan-400 hover:to-sky-500 text-slate-950 cursor-pointer shadow'
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        {unlocked ? (
                          <>
                            <Rocket className="w-4 h-4" />
                            <span>{tr(language, `Enter Node ${lvlId}`, `دخول المرحلة ${lvlId}`)}</span>
                          </>
                        ) : (
                          <>
                            <Lock className="w-4 h-4" />
                            <span>{tr(language, `Complete Node ${lvlId - 1} First`, `أكمل المرحلة ${lvlId - 1} أولاً`)}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </section>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800 text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>
                  {tr(
                    language,
                    'NASA OSDR Biological Datasets & Eco-Nutrition System',
                    'بيانات ناسا الحيوية OSDR ونظام التغذية الفضائية المستدامة'
                  )}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-amber-300 fill-amber-300" />
                <span className="font-bold text-amber-200">
                  {tr(language, `${totalStarsScore} Stars`, `${totalStarsScore} نجمة`)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Self-Sustaining Eco-Bio Cabin Modal Overlay */}
      {isEcoCabinOpen && (
        <div className="fixed inset-0 z-40 bg-slate-950/85 backdrop-blur-md p-3 sm:p-6 overflow-y-auto flex items-start sm:items-center justify-center">
          <div className="w-full max-w-6xl my-auto">
            <EcoBioCabin
              levelId={activeLevelId <= 3 ? activeLevelId : 3}
              campaign={campaign}
              onUpdateCampaign={updateCampaignState}
              onClose={() => setIsEcoCabinOpen(false)}
            />
          </div>
        </div>
      )}

      <SpaceFitXShowcase
        isOpen={isSuitShowcaseOpen}
        suitState={campaign.spaceFitX}
        onChangeSuitState={(next) => updateCampaignState({ spaceFitX: next })}
        onClose={() => setIsSuitShowcaseOpen(false)}
      />
      <SettingsMenu isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <ScientificSourcesModal isOpen={isSourcesOpen} onClose={() => setIsSourcesOpen(false)} />
      {renderHowToPlayModal()}
    </div>
  );
};
