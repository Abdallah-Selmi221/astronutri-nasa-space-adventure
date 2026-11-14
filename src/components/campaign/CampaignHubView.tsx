import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useGameState, initialCampaignState } from '../../context/GameContext';
import { CAMPAIGN_LEVELS, MINI_GAME_SPECS, SpatialRoomNode } from '../../data/campaignLevels';
import { CampaignLevelId, CampaignProgressState, MiniGameId } from '../../types/game';
import { WorldNavigator3D } from '../three/WorldNavigator3D';
import { SpatialRoomMap3D } from '../three/SpatialRoomMap3D';
import { MiniGameShell } from './MiniGameShell';
import { Level1MiniGames } from './Level1MiniGames';
import { Level2MiniGames } from './Level2MiniGames';
import { Level3MiniGames } from './Level3MiniGames';
import { Level4MiniGames } from './Level4MiniGames';
import { EcoBioCabin } from './EcoBioCabin';
import { ScientificSourcesModal } from './ScientificSourcesModal';
import { SettingsMenu } from '../common/SettingsMenu';
import { NasaMissionControlDrawer } from '../common/NasaMissionControlDrawer';
import { soundManager } from '../../utils/sound';
import { dialogueManager } from '../../utils/geminiTTS';
import { nasaCache } from '../../services/nasa/nasaCache';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Compass,
  HelpCircle,
  Lock,
  Play,
  Rocket,
  Satellite,
  Settings,
  ShieldCheck,
  Sprout,
  Star,
  Volume2,
  X
} from 'lucide-react';

export const CampaignHubView: React.FC = () => {
  const {
    state,
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

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNasaOpen, setIsNasaOpen] = useState(false);
  const [isSourcesOpen, setIsSourcesOpen] = useState(false);
  const [isEcoCabinOpen, setIsEcoCabinOpen] = useState(false);
  const [isHowToPlayOpen, setIsHowToPlayOpen] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);

  useEffect(() => {
    setIsEcoCabinOpen(false);
  }, [campaign.viewMode, activeLevelId]);

  useEffect(() => {
    const unsub = dialogueManager.subscribeStatus(({ isSpeaking }) => {
      setIsAudioPlaying(isSpeaking);
    });
    return () => unsub();
  }, []);

  const totalStarsScore = 250 + campaign.completedMiniGames.length * 25 + state.cargoItems.length * 15;

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
    if (room.consoleAction === 'l3_return_auth' && activeLevelId === 3) {
      setCampaignView('minigame', 3, room.id, null);
      return;
    }
    if (room.miniGameId) {
      setCampaignView('minigame', activeLevelId, room.id, room.miniGameId);
      return;
    }
  };

  const handleCompleteMiniGame = (id: MiniGameId, patch?: Partial<CampaignProgressState>) => {
    completeCampaignMiniGame(id, patch);
  };

  const handleJumpToLevel3Room = (roomId: string, miniGameId: MiniGameId) => {
    setCampaignView('minigame', 3, roomId, miniGameId);
  };

  const handleBackToLevel = () => {
    setCampaignView('level_hub', activeLevelId, null, null);
  };

  const handleBackToWorldMap = () => {
    dialogueManager.stop();
    setCampaignView('world_map', activeLevelId, null, null);
  };

  // ==================== VIEW 3: ACTIVE MINI-GAME OR L3 AUTH CONSOLE ====================
  if (campaign.viewMode === 'minigame') {
    const isL3ReturnConsole =
      activeLevelId === 3 && campaign.activeRoomId === 'mission_control' && !campaign.activeMiniGameId;

    if (isL3ReturnConsole) {
      return (
        <div className="min-h-screen w-full pt-24 pb-10 px-4 sm:px-6 max-w-4xl mx-auto space-y-4" dir="rtl">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/95 border-2 border-purple-400/60 rounded-3xl p-4 shadow-xl">
            <button
              type="button"
              onClick={handleBackToLevel}
              className="px-4 py-2 rounded-2xl bg-slate-800 hover:bg-purple-700 text-white font-hud font-black text-xs sm:text-sm border border-purple-400/50 flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowRight className="w-4 h-4" />
              <span>خريطة المستوى 3 (12 غرفة)</span>
            </button>
            <div className="text-right">
              <div className="font-hud font-black text-base sm:text-lg text-white">
                🛸 مركز قيادة القمر — إذن العودة للأرض
              </div>
              <div className="text-xs text-purple-300 font-bold">
                مراجعة جميع تحديات القمر وتفويض انطلاق المستوى 4
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
        <MiniGameShell
          miniGameId={mgId}
          isCompleted={isCompleted}
          onBackToLevel={handleBackToLevel}
        >
          {activeLevelId === 1 && (
            <Level1MiniGames
              miniGameId={mgId}
              campaign={campaign}
              onCompleteMiniGame={handleCompleteMiniGame}
              onNextLevel={() => setCampaignView('level_hub', 2, null, null)}
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
      );
    }
  }

  // ==================== VIEW 2: LEVEL SPATIAL 3D ROOM MAP ====================
  if (campaign.viewMode === 'level_hub') {
    const levelDoneCount = activeLevelSpec.miniGames.filter((id) =>
      campaign.completedMiniGames.includes(id)
    ).length;
    const allLevelGamesDone = levelDoneCount >= activeLevelSpec.miniGames.length;
    const nextLevelId = (activeLevelId + 1) as CampaignLevelId;
    const canEnterNextLevel =
      activeLevelId < 4 && campaign.unlockedLevels.includes(nextLevelId);

    return (
      <div
        className="min-h-screen w-full flex flex-col justify-between bg-gradient-to-b from-slate-950 via-[#09152b] to-slate-950 text-white px-4 sm:px-8 py-4 sm:py-6 gap-4"
        dir="rtl"
      >
        {/* Level Header */}
        <header className="max-w-7xl w-full mx-auto flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border-2 border-cyan-400/50 rounded-3xl p-4 shadow-xl">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleBackToWorldMap}
              className="px-4 py-2 rounded-2xl bg-slate-800 hover:bg-cyan-700 text-white font-hud font-black text-xs sm:text-sm border border-cyan-400/50 flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowRight className="w-4 h-4" />
              <span>خريطة العالم الـ 3D</span>
            </button>
            <div>
              <h1 className="font-hud font-black text-base sm:text-xl text-white">
                {activeLevelSpec.titleAr}
              </h1>
              <p className="text-xs text-cyan-200/90 font-bold">{activeLevelSpec.subtitleAr}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {activeLevelId <= 3 && (
              <button
                type="button"
                onClick={() => {
                  soundManager.playClick();
                  setIsEcoCabinOpen((v) => !v);
                }}
                className="px-3.5 py-1.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs border border-emerald-300 shadow cursor-pointer flex items-center gap-1.5"
              >
                <Sprout className="w-4 h-4" />
                <span>{isEcoCabinOpen ? 'العودة للخريطة الـ 3D' : '🌱 كابينة الزراعة الذاتية'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                soundManager.playClick();
                setIsSourcesOpen(true);
              }}
              className="px-3 py-1.5 rounded-2xl bg-sky-900 hover:bg-sky-800 text-sky-100 font-black text-xs border border-sky-400/50 cursor-pointer flex items-center gap-1.5"
            >
              <BookOpen className="w-4 h-4 text-sky-300" />
              <span>مصادر علمية (13)</span>
            </button>
            <span className="px-3 py-1.5 rounded-2xl bg-slate-950 border border-slate-700 text-xs font-black text-emerald-300">
              ✅ التحديات: {levelDoneCount} / {activeLevelSpec.miniGames.length}
            </span>
            <span className="px-3 py-1.5 rounded-2xl bg-slate-950 border border-slate-700 text-xs font-black text-sky-300">
              🚪 الغرف: {activeLevelSpec.rooms.length} غرفة
            </span>

            {activeLevelId === 3 && allLevelGamesDone && !campaign.l3ReturnAuthorized && (
              <button
                type="button"
                onClick={() => setCampaignView('minigame', 3, 'mission_control', null)}
                className="px-4 py-2 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs shadow-lg animate-pulse cursor-pointer"
              >
                🛸 افتح إذن العودة للأرض (Mission Control)
              </button>
            )}

            {canEnterNextLevel && (
              <button
                type="button"
                onClick={() => setCampaignView('level_hub', nextLevelId, null, null)}
                className="px-4 py-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-xs shadow-lg flex items-center gap-1.5 cursor-pointer"
              >
                <Rocket className="w-4 h-4" />
                <span>الانتقال للمستوى {nextLevelId} ←</span>
              </button>
            )}
          </div>
        </header>

        {/* Main 3D Walkable Spatial Room Map OR Self-Sustaining Eco-Bio Cabin */}
        <main className="max-w-7xl w-full mx-auto flex-1 flex flex-col gap-4">
          {isEcoCabinOpen && activeLevelId <= 3 ? (
            <EcoBioCabin
              levelId={activeLevelId}
              campaign={campaign}
              onUpdateCampaign={updateCampaignState}
              onClose={() => setIsEcoCabinOpen(false)}
            />
          ) : (
            <div className="h-[430px] sm:h-[500px] w-full">
              <SpatialRoomMap3D
                levelId={activeLevelId}
                campaign={campaign}
                onEnterRoom={handleEnterRoom}
              />
            </div>
          )}

          {/* Direct Mini-Game / Sequential Checklist Strip */}
          <section className="rounded-3xl bg-slate-900/85 border border-slate-700/80 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-hud font-black text-sm text-cyan-200 flex items-center gap-2">
                <Compass className="w-4 h-4 text-cyan-400" />
                <span>مهام المستوى {activeLevelId} المتسلسلة (أو ادخل من أبواب الخريطة الـ 3D أعلاه):</span>
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
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {activeLevelSpec.miniGames.map((mgId) => {
                const spec = MINI_GAME_SPECS[mgId];
                const done = campaign.completedMiniGames.includes(mgId);
                return (
                  <button
                    key={mgId}
                    type="button"
                    onClick={() => {
                      soundManager.playClick();
                      setCampaignView('minigame', activeLevelId, spec.roomId, mgId);
                    }}
                    className={`p-3 rounded-2xl border-2 text-right flex items-center justify-between gap-2 transition-all cursor-pointer ${
                      done
                        ? 'bg-emerald-950/50 border-emerald-400/70 text-white'
                        : 'bg-slate-950/75 border-slate-700 hover:border-cyan-400 text-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-2xl shrink-0">{spec.icon}</span>
                      <div className="min-w-0">
                        <div className="font-black text-xs truncate">
                          {spec.orderInLevel}. {spec.titleAr}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">{spec.nasaBadge}</div>
                      </div>
                    </div>
                    {done ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    ) : (
                      <span className="text-[11px] font-black text-cyan-300 shrink-0">ابدأ ←</span>
                    )}
                  </button>
                );
              })}

              {activeLevelId === 3 && (
                <button
                  type="button"
                  onClick={() => setCampaignView('minigame', 3, 'mission_control', null)}
                  className={`p-3 rounded-2xl border-2 text-right flex items-center justify-between gap-2 transition-all cursor-pointer ${
                    campaign.l3ReturnAuthorized
                      ? 'bg-purple-950/60 border-purple-400 text-white'
                      : 'bg-slate-950/75 border-purple-500/45 hover:border-purple-400 text-purple-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-2xl shrink-0">🛸</span>
                    <div className="min-w-0">
                      <div className="font-black text-xs truncate">
                        مركز قيادة القمر (Mission Control)
                      </div>
                      <div className="text-[10px] text-purple-300 truncate">
                        تفويض العودة إلى الأرض (المستوى 4)
                      </div>
                    </div>
                  </div>
                  {campaign.l3ReturnAuthorized ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  ) : (
                    <span className="text-[11px] font-black text-purple-300 shrink-0">افحص ←</span>
                  )}
                </button>
              )}
            </div>
          </section>
        </main>

        <ScientificSourcesModal isOpen={isSourcesOpen} onClose={() => setIsSourcesOpen(false)} />
      </div>
    );
  }

  // ==================== VIEW 1: 3D WORLD PROGRESSION MAP (4 LEVELS) ====================
  return (
    <div
      className="min-h-screen w-full flex flex-col justify-between bg-gradient-to-b from-slate-950 via-[#0b1730] to-slate-950 text-white px-4 sm:px-8 py-4 sm:py-6 gap-5"
      dir="rtl"
    >
      {/* Top Bar */}
      <header className="max-w-7xl w-full mx-auto flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 bg-slate-900/90 border border-cyan-400/40 rounded-2xl px-4 py-2 shadow-lg">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-300 via-pink-400 to-sky-400 border-2 border-white flex items-center justify-center text-xl">
            👨‍🚀
          </div>
          <div>
            <div className="font-hud font-black text-sm text-white">
              {state.cadetName ? `البطل ${state.cadetName}` : 'رائد الفضاء الصغير'}
            </div>
            <div className="text-[11px] text-cyan-300 font-bold">
              التقدم الكامل: {campaign.completedMiniGames.length} / 21 مهمة فضائية
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="px-3.5 py-2 rounded-2xl bg-amber-950/50 border border-amber-400/50 flex items-center gap-1.5 font-hud font-black text-sm text-amber-200">
            <Star className="w-4 h-4 text-amber-300 fill-amber-300" />
            <span>{totalStarsScore}</span>
          </div>

          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              setIsSourcesOpen(true);
            }}
            className="px-3.5 py-2 rounded-2xl bg-emerald-700 hover:bg-emerald-600 text-white font-hud font-black text-xs sm:text-sm border border-emerald-300/60 shadow cursor-pointer flex items-center gap-1.5"
          >
            <BookOpen className="w-4 h-4 text-emerald-200" />
            <span>مصادر علمية (13)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              setLocation('SpaceScience');
            }}
            className="px-3.5 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-hud font-black text-xs sm:text-sm border border-indigo-300/60 shadow cursor-pointer flex items-center gap-1.5"
          >
            <span>🪐</span>
            <span>الكواكب والـ 42 سؤال</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              setIsNasaOpen(true);
            }}
            className="px-3.5 py-2 rounded-2xl bg-cyan-900/80 hover:bg-cyan-800 text-cyan-100 font-hud font-black text-xs sm:text-sm border border-cyan-400/50 cursor-pointer flex items-center gap-1.5"
          >
            <Satellite className="w-4 h-4 text-cyan-300" />
            <span>بيانات ناسا الحية</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              setIsSettingsOpen(true);
            }}
            className="p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 cursor-pointer"
            aria-label="الإعدادات"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content: 3D World Navigator + 4 Sequential Level Cards */}
      <main className="max-w-7xl w-full mx-auto flex-1 flex flex-col gap-5">
        <div className="text-center space-y-2.5">
          <h1 className="font-hud font-black text-2xl sm:text-3xl bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 via-white to-amber-300">
            🚀 خريطة رحلة أسترونوتري الثلاثية الأبعاد (4 مستويات • 21 مهمة)
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-3xl mx-auto">
            ابدأ من <strong>الأرض</strong>، ثم انطلق في <strong>انعدام الجاذبية</strong>، واستكشف <strong>المستعمرة القمرية</strong>، ثم عُد بأمان إلى <strong>كوكب الأرض</strong>!
          </p>

          {/* Bold Tactile 2.5D Action Strip (PLAY, LEVELS, HOW TO PLAY, ECO-CABIN, SOURCES) */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => {
                const highestUnlocked =
                  [...campaign.unlockedLevels].sort((a, b) => b - a)[0] || 1;
                handleSelectLevel(highestUnlocked);
              }}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-b from-emerald-400 to-teal-600 text-slate-950 font-hud font-black text-sm border-2 border-emerald-200 shadow-[0_5px_0_#0f766e] active:translate-y-0.5 cursor-pointer flex items-center gap-1.5"
            >
              <Play className="w-4 h-4 fill-slate-950" />
              <span>PLAY • ابدأ اللعب</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundManager.playClick();
                document.getElementById('campaign-levels-grid')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-b from-sky-400 to-blue-600 text-white font-hud font-black text-xs sm:text-sm border-2 border-sky-200 shadow-[0_5px_0_#1e40af] active:translate-y-0.5 cursor-pointer flex items-center gap-1.5"
            >
              <Rocket className="w-4 h-4" />
              <span>LEVELS • المستويات (4)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundManager.playClick();
                setIsHowToPlayOpen(true);
              }}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-b from-amber-300 to-orange-500 text-slate-950 font-hud font-black text-xs sm:text-sm border-2 border-amber-100 shadow-[0_5px_0_#b45309] active:translate-y-0.5 cursor-pointer flex items-center gap-1.5"
            >
              <HelpCircle className="w-4 h-4" />
              <span>HOW TO PLAY • كيف تلعب</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundManager.playClick();
                setIsEcoCabinOpen((v) => !v);
              }}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-b from-lime-400 to-emerald-600 text-slate-950 font-hud font-black text-xs sm:text-sm border-2 border-lime-100 shadow-[0_5px_0_#15803d] active:translate-y-0.5 cursor-pointer flex items-center gap-1.5"
            >
              <Sprout className="w-4 h-4" />
              <span>كابينة الزراعة المائية 🌱</span>
            </button>
          </div>
        </div>

        {isEcoCabinOpen && (
          <EcoBioCabin
            levelId={activeLevelId <= 3 ? activeLevelId : 3}
            campaign={campaign}
            onUpdateCampaign={updateCampaignState}
            onClose={() => setIsEcoCabinOpen(false)}
          />
        )}

        <div className="h-[340px] sm:h-[400px] w-full">
          <WorldNavigator3D campaign={campaign} onSelectLevel={handleSelectLevel} />
        </div>

        {/* 4 Sequential Progression Cards */}
        <section id="campaign-levels-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {([1, 2, 3, 4] as CampaignLevelId[]).map((lvlId) => {
            const lvl = CAMPAIGN_LEVELS[lvlId];
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
                    : 'bg-slate-900/90 border-cyan-400/60 shadow-xl'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="px-2.5 py-0.5 rounded-full text-[11px] font-black text-slate-950"
                      style={{ backgroundColor: unlocked ? lvl.themeColorHex : '#64748b' }}
                    >
                      المستوى {lvlId}
                    </span>
                    <span className="text-xs font-bold text-slate-300">
                      {lvl.rooms.length} غرف • {total} مهام
                    </span>
                  </div>

                  <h3 className="font-hud font-black text-base text-white">{lvl.titleAr}</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">{lvl.subtitleAr}</p>
                </div>

                <div className="space-y-2.5">
                  <div className="h-2 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
                    <div
                      className="h-full transition-all"
                      style={{
                        width: `${Math.round((doneCount / total) * 100)}%`,
                        backgroundColor: completedAll ? '#34d399' : lvl.themeColorHex
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
                    <span>التقدم: {doneCount}/{total}</span>
                    {completedAll ? (
                      <span className="text-emerald-300">✅ مكتمل</span>
                    ) : unlocked ? (
                      <span className="text-cyan-300">مفتوح</span>
                    ) : (
                      <span className="text-slate-400">🔒 مقفل</span>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={!unlocked}
                    onClick={() => handleSelectLevel(lvlId)}
                    className={`w-full py-2.5 rounded-2xl font-hud font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all ${
                      unlocked
                        ? 'bg-gradient-to-r from-cyan-500 to-sky-600 hover:from-cyan-400 hover:to-sky-500 text-slate-950 cursor-pointer shadow'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    {unlocked ? (
                      <>
                        <Rocket className="w-4 h-4" />
                        <span>دخول خريطة المستوى {lvlId}</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>أكمل المستوى {lvlId - 1} أولاً</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </section>

        {/* Bottom Robo Prompt + Attribution */}
        <footer className="rounded-3xl bg-slate-900/75 border border-slate-800 p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                soundManager.playClick();
                if (isAudioPlaying) {
                  dialogueManager.stop();
                } else {
                  dialogueManager.speak(
                    'أهلاً يا بطل! اختر المستوى المفتوح على خريطة العالم الـ 3D وتحرك داخل الغرف لإكمال الـ 21 تحدياً!'
                  );
                }
              }}
              className="px-3 py-1.5 rounded-xl bg-cyan-950 border border-cyan-400/50 text-cyan-200 font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Volume2 className={`w-4 h-4 ${isAudioPlaying ? 'animate-pulse text-amber-300' : ''}`} />
              <span>{isAudioPlaying ? 'إيقاف صوت روبو' : 'اسمع كابتن روبو'}</span>
            </button>
            <span className="text-slate-300 font-bold">
              التخزين: {storageStatus === 'VALID_SAVE' || storageStatus === 'NO_SAVE' ? '✅ محفوظ تلقائياً' : 'وضع الحماية الآمن'}
            </span>
          </div>

          <div className="text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>{nasaCache.getAttribution()} • NASA OSDR Biological Datasets</span>
          </div>
        </footer>
      </main>

      <SettingsMenu isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <NasaMissionControlDrawer isOpen={isNasaOpen} onClose={() => setIsNasaOpen(false)} />
      <ScientificSourcesModal isOpen={isSourcesOpen} onClose={() => setIsSourcesOpen(false)} />

      {/* HOW TO PLAY Modal */}
      {isHowToPlayOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
          dir="rtl"
        >
          <div className="w-full max-w-lg rounded-3xl bg-slate-900 border-2 border-amber-400/70 p-5 space-y-3 text-white shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-hud font-black text-lg text-amber-300">
                🎮 كيف تلعب في أسترونوتري؟ (How To Play)
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
              <li>1️⃣ <strong>تقدّم بالترتيب عبر 4 مستويات:</strong> التحضير على الأرض ← السفر في 0G ← مستعمرة القمر ← العودة للأرض.</li>
              <li>2️⃣ <strong>حرّك كابتن روبو في الخريطة الـ 3D:</strong> بمفاتيح الأسهم / WASD أو أزرار اللمس أو اضغط مباشرة على باب أي غرفة.</li>
              <li>3️⃣ <strong>الأكلات المصرية والسيناوية وكابينة الزراعة:</strong> اجمع أكلات آمنة بلا فتات (مثل المش والعجوة والطحينة والجرجير والكابوتشا واللفت).</li>
              <li>4️⃣ <strong>المصداقية العلمية:</strong> كل حقيقة تحمل شارة صريحة تميّز بين المثبت على ISS ✅ والتجريبي 🧪 والتخطيطي 📐 وتبسيط اللعبة 🎮.</li>
            </ul>
            <button
              type="button"
              onClick={() => {
                soundManager.playClick();
                setIsHowToPlayOpen(false);
              }}
              className="w-full py-2.5 rounded-2xl bg-amber-400 text-slate-950 font-hud font-black text-sm cursor-pointer"
            >
              فهمت! هيا نبدأ 🚀
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
