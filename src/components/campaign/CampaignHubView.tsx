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
import { SettingsMenu } from '../common/SettingsMenu';
import { NasaMissionControlDrawer } from '../common/NasaMissionControlDrawer';
import { soundManager } from '../../utils/sound';
import { dialogueManager } from '../../utils/geminiTTS';
import { nasaCache } from '../../services/nasa/nasaCache';
import {
  ArrowRight,
  CheckCircle2,
  Compass,
  Lock,
  Rocket,
  Satellite,
  Settings,
  ShieldCheck,
  Star,
  Volume2
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
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);

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

        {/* Main 3D Walkable Spatial Room Map */}
        <main className="max-w-7xl w-full mx-auto flex-1 flex flex-col gap-4">
          <div className="h-[430px] sm:h-[500px] w-full">
            <SpatialRoomMap3D
              levelId={activeLevelId}
              campaign={campaign}
              onEnterRoom={handleEnterRoom}
            />
          </div>

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
        <div className="text-center space-y-1">
          <h1 className="font-hud font-black text-2xl sm:text-3xl bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 via-white to-amber-300">
            🚀 خريطة رحلة أسترونوتري الثلاثية الأبعاد (4 مستويات • 21 مهمة)
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-3xl mx-auto">
            ابدأ من <strong>الأرض</strong>، ثم انطلق في <strong>انعدام الجاذبية</strong>، واستكشف <strong>المستعمرة القمرية</strong>، ثم عُد بأمان إلى <strong>كوكب الأرض</strong>!
          </p>
        </div>

        <div className="h-[340px] sm:h-[400px] w-full">
          <WorldNavigator3D campaign={campaign} onSelectLevel={handleSelectLevel} />
        </div>

        {/* 4 Sequential Progression Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
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
    </div>
  );
};
