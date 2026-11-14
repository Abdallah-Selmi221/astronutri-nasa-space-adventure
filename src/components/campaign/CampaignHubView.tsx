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
  DoorOpen,
  HelpCircle,
  Layers,
  Lock,
  Play,
  Rocket,
  Satellite,
  Settings,
  Shield,
  ShieldCheck,
  Sprout,
  Star,
  Volume2,
  X
} from 'lucide-react';

const LEVEL_UI_META: Record<CampaignLevelId, { badge: string; shortTitleAr: string }> = {
  1: { badge: '🌍', shortTitleAr: 'الأرض والانطلاق' },
  2: { badge: '🛸', shortTitleAr: 'المدار 0G' },
  3: { badge: '🌙', shortTitleAr: 'مستعمرة القمر' },
  4: { badge: '🪂', shortTitleAr: 'العودة للأرض' }
};

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
  const [isSuitShowcaseOpen, setIsSuitShowcaseOpen] = useState(false);
  const [isLevelsDrawerOpen, setIsLevelsDrawerOpen] = useState(false);
  const [isRoomsDrawerOpen, setIsRoomsDrawerOpen] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);

  useEffect(() => {
    setIsEcoCabinOpen(false);
    setIsRoomsDrawerOpen(false);
    setIsLevelsDrawerOpen(false);
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
              onUpdateCampaign={updateCampaignState}
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

  // ==================== VIEW 2: FULL-VIEWPORT 3D ISLAND & ROOM PORTALS ====================
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
        className="relative w-full h-[100dvh] overflow-hidden bg-[#07122b] text-white"
        dir="rtl"
      >
        {/* Full-Viewport 3D Island & Third-Person Character Scene */}
        <div className="absolute inset-0 w-full h-full z-0">
          <SpatialRoomMap3D
            levelId={activeLevelId}
            campaign={campaign}
            suitState={campaign.spaceFitX}
            onEnterRoom={handleEnterRoom}
          />
        </div>

        {/* Sleek Single-Row Edge HUD Bar at Top */}
        <header className="pointer-events-none fixed top-2 inset-x-2 sm:inset-x-4 z-30">
          <div className="pointer-events-auto max-w-7xl mx-auto flex items-center justify-between gap-2 bg-slate-950/80 border border-cyan-400/40 backdrop-blur-md rounded-2xl px-2.5 sm:px-4 py-1.5 shadow-xl overflow-x-auto">
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleBackToWorldMap}
                className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-cyan-700 text-white font-hud font-black text-xs border border-cyan-400/50 flex items-center gap-1 cursor-pointer shrink-0"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>الأرخبيل</span>
              </button>
              <div className="leading-tight">
                <div className="font-hud font-black text-xs sm:text-sm text-white whitespace-nowrap">
                  {LEVEL_UI_META[activeLevelId].badge} {LEVEL_UI_META[activeLevelId].shortTitleAr}
                </div>
                <div className="text-[10px] text-emerald-300 font-bold whitespace-nowrap">
                  ✅ {levelDoneCount}/{activeLevelSpec.miniGames.length} مهام
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                type="button"
                data-testid="toggle-rooms-drawer-btn"
                onClick={() => {
                  soundManager.playClick();
                  setIsRoomsDrawerOpen((v) => !v);
                }}
                className="px-2.5 py-1.5 rounded-xl bg-sky-700/90 hover:bg-sky-600 text-white font-black text-xs border border-sky-300/60 flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <DoorOpen className="w-3.5 h-3.5" />
                <span>الغرف ({activeLevelSpec.rooms.length})</span>
              </button>

              <button
                type="button"
                data-testid="open-spacefitx-showcase"
                onClick={() => {
                  soundManager.playClick();
                  setIsSuitShowcaseOpen(true);
                }}
                className="px-2.5 py-1.5 rounded-xl bg-cyan-600/90 hover:bg-cyan-500 text-slate-950 font-black text-xs border border-cyan-200 flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>SPACE-FIT X</span>
              </button>

              {activeLevelId <= 3 && (
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playClick();
                    setIsEcoCabinOpen((v) => !v);
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs border border-emerald-300 flex items-center gap-1 cursor-pointer whitespace-nowrap"
                >
                  <Sprout className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">الزراعة المائية</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  soundManager.playClick();
                  setIsSourcesOpen(true);
                }}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-200 font-black text-xs border border-sky-400/40 flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <BookOpen className="w-3.5 h-3.5 text-sky-300" />
                <span className="hidden md:inline">مصادر (13)</span>
              </button>

              {activeLevelId === 3 && allLevelGamesDone && !campaign.l3ReturnAuthorized && (
                <button
                  type="button"
                  onClick={() => setCampaignView('minigame', 3, 'mission_control', null)}
                  className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs animate-pulse cursor-pointer whitespace-nowrap"
                >
                  🛸 إذن العودة
                </button>
              )}

              {canEnterNextLevel && (
                <button
                  type="button"
                  onClick={() => setCampaignView('level_hub', nextLevelId, null, null)}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-xs flex items-center gap-1 cursor-pointer whitespace-nowrap"
                >
                  <Rocket className="w-3.5 h-3.5" />
                  <span>المستوى {nextLevelId}</span>
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Expandable Rooms & Sequential Missions Drawer */}
        {isRoomsDrawerOpen && (
          <div className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
            <div className="w-full max-w-5xl rounded-3xl bg-slate-900 border-2 border-cyan-400/60 p-4 sm:p-6 space-y-4 shadow-2xl my-auto">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-hud font-black text-lg text-cyan-200 flex items-center gap-2">
                    <Compass className="w-5 h-5 text-cyan-400" />
                    <span>مهام وغرف {activeLevelSpec.titleAr}</span>
                  </h2>
                  <p className="text-xs text-slate-400">{activeLevelSpec.subtitleAr}</p>
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
                  return (
                    <button
                      key={mgId}
                      type="button"
                      onClick={() => {
                        soundManager.playClick();
                        setIsRoomsDrawerOpen(false);
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
                    onClick={() => {
                      setIsRoomsDrawerOpen(false);
                      setCampaignView('minigame', 3, 'mission_control', null);
                    }}
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
      </div>
    );
  }

  // ==================== VIEW 1: FULL-VIEWPORT 3D ARCHIPELAGO WORLD MAP ====================
  return (
    <div
      className="relative w-full h-[100dvh] overflow-hidden bg-[#07122b] text-white"
      dir="rtl"
    >
      {/* Full-Viewport 3D Floating Islands Archipelago */}
      <div className="absolute inset-0 w-full h-full z-0">
        <WorldNavigator3D
          campaign={campaign}
          suitState={campaign.spaceFitX}
          onSelectLevel={handleSelectLevel}
        />
      </div>

      {/* Compact Single-Row Top Edge HUD Bar (Zero Overlap) */}
      <header className="pointer-events-none fixed top-2 inset-x-2 sm:inset-x-4 z-30">
        <div className="pointer-events-auto max-w-7xl mx-auto flex items-center justify-between gap-2 bg-slate-950/80 border border-cyan-400/40 backdrop-blur-md rounded-2xl px-2.5 sm:px-4 py-1.5 shadow-xl overflow-x-auto">
          {/* Identity & Stars */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-300 via-pink-400 to-sky-400 border border-white flex items-center justify-center text-base shrink-0">
              👨‍🚀
            </div>
            <div className="leading-tight">
              <div className="font-hud font-black text-xs text-white whitespace-nowrap">
                {state.cadetName ? state.cadetName : 'رائد الفضاء'}
              </div>
              <div className="text-[10px] text-cyan-300 font-bold whitespace-nowrap">
                {campaign.completedMiniGames.length}/21 • ⭐ {totalStarsScore}
              </div>
            </div>
          </div>

          {/* Primary Action Ribbon */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                const highestUnlocked =
                  [...campaign.unlockedLevels].sort((a, b) => b - a)[0] || 1;
                handleSelectLevel(highestUnlocked);
              }}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-b from-emerald-400 to-teal-600 text-slate-950 font-hud font-black text-xs border border-emerald-100 cursor-pointer flex items-center gap-1 whitespace-nowrap"
            >
              <Play className="w-3.5 h-3.5 fill-slate-950" />
              <span>ابدأ اللعب</span>
            </button>

            <button
              type="button"
              data-testid="toggle-levels-drawer-btn"
              onClick={() => {
                soundManager.playClick();
                setIsLevelsDrawerOpen((v) => !v);
              }}
              className="px-2.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-hud font-black text-xs border border-sky-300/60 cursor-pointer flex items-center gap-1 whitespace-nowrap"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>المستويات (4)</span>
            </button>

            <button
              type="button"
              data-testid="open-spacefitx-showcase"
              onClick={() => {
                soundManager.playClick();
                setIsSuitShowcaseOpen(true);
              }}
              className="px-2.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-hud font-black text-xs border border-cyan-100 cursor-pointer flex items-center gap-1 whitespace-nowrap"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>SPACE-FIT X</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundManager.playClick();
                setIsEcoCabinOpen((v) => !v);
              }}
              className="px-2.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-hud font-black text-xs border border-emerald-300/60 cursor-pointer flex items-center gap-1 whitespace-nowrap"
            >
              <Sprout className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">الزراعة</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundManager.playClick();
                setLocation('SpaceScience');
              }}
              className="px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-hud font-black text-xs border border-indigo-300/60 cursor-pointer flex items-center gap-1 whitespace-nowrap"
            >
              <span>🪐</span>
              <span className="hidden sm:inline">الكواكب</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundManager.playClick();
                setIsSourcesOpen(true);
              }}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-200 font-hud font-black text-xs border border-emerald-400/40 cursor-pointer flex items-center gap-1 whitespace-nowrap"
            >
              <BookOpen className="w-3.5 h-3.5 text-emerald-300" />
              <span className="hidden lg:inline">مصادر (13)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundManager.playClick();
                setIsNasaOpen(true);
              }}
              className="px-2.5 py-1.5 rounded-xl bg-cyan-950/90 hover:bg-cyan-900 text-cyan-200 font-hud font-black text-xs border border-cyan-400/40 cursor-pointer flex items-center gap-1 whitespace-nowrap"
            >
              <Satellite className="w-3.5 h-3.5 text-cyan-300" />
              <span className="hidden lg:inline">NASA</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundManager.playClick();
                if (isAudioPlaying) {
                  dialogueManager.stop();
                } else {
                  dialogueManager.speak(
                    'أهلاً يا بطل! استكشف الجزر الطائرة في الأرخبيل واضغط على جزيرة أو تحرك إليها لدخول الـ 21 تحدياً!'
                  );
                }
              }}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-200 border border-cyan-400/40 cursor-pointer"
              aria-label="صوت كابتن روبو"
            >
              <Volume2 className={`w-4 h-4 ${isAudioPlaying ? 'animate-pulse text-amber-300' : ''}`} />
            </button>

            <button
              type="button"
              onClick={() => {
                soundManager.playClick();
                setIsHowToPlayOpen(true);
              }}
              className="p-1.5 rounded-xl bg-amber-400/90 hover:bg-amber-300 text-slate-950 border border-amber-100 cursor-pointer"
              aria-label="كيف تلعب"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                soundManager.playClick();
                setIsSettingsOpen(true);
              }}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 cursor-pointer"
              aria-label="الإعدادات"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Expandable 4-Level Sequential Overview Modal Drawer */}
      {isLevelsDrawerOpen && (
        <div className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="w-full max-w-6xl rounded-3xl bg-slate-900 border-2 border-cyan-400/60 p-4 sm:p-6 space-y-4 shadow-2xl my-auto">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="font-hud font-black text-lg sm:text-xl text-cyan-200">
                  🚀 خريطة المستويات المتسلسلة (4 مستويات • 21 مهمة)
                </h2>
                <p className="text-xs text-slate-400">
                  التخزين: {storageStatus === 'VALID_SAVE' || storageStatus === 'NO_SAVE' ? '✅ محفوظ تلقائياً' : 'وضع الحماية'} •{' '}
                  {nasaCache.getAttribution()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsLevelsDrawerOpen(false)}
                className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

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
                        : 'bg-slate-950/85 border-cyan-400/60 shadow-xl'
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
                            <span>دخول جزيرة المستوى {lvlId}</span>
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

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800 text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>NASA OSDR Biological Datasets & Eco-Nutrition System</span>
              </div>
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-amber-300 fill-amber-300" />
                <span className="font-bold text-amber-200">{totalStarsScore} نجمة</span>
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
              <li>1️⃣ <strong>تجول في الأرخبيل الـ 3D:</strong> تحرك بمفاتيح WASD / الأسهم أو عصا التحكم واقفز بزر Space عبر الجزر الأربع والجسور السماوية!</li>
              <li>2️⃣ <strong>بدلة SPACE-FIT X الذكية:</strong> افتح عارض البدلة واستخدم الـ 7 وحدات للضغط الذكي والمقاومة والحصاد الحركي للطاقة.</li>
              <li>3️⃣ <strong>الأكلات المصرية والسيناوية وعسل النحل:</strong> جهّز عسل النحل الجبلي السيناوي والمش والعجوة والطحينة والجرجير والكابوتشا بلا فتات.</li>
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
