import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Rocket,
  Satellite,
  Sparkles,
  Volume2
} from 'lucide-react';
import { useGameState } from '../../context/GameContext';
import { MINI_GAME_SPECS } from '../../data/campaignLevels';
import { getAdaptedBriefingHint, MINI_GAME_BRIEFINGS } from '../../data/campaignBilingual';
import { MiniGameId } from '../../types/game';
import { tr, speakWebSpeechNonBlocking } from '../../utils/i18n';
import { soundManager } from '../../utils/sound';
import { openNasaDrawer } from '../common/NasaMissionControlDrawer';
import { MissionInventoryBar } from './MissionInventoryBar';
import { StageStoryBanner } from './StageStoryBanner';
import { RoboCharacter } from '../common/RoboCharacter';
import { MiniGameDemoOverlay } from './MiniGameDemoOverlay';

export interface MiniGameShellProps {
  miniGameId: MiniGameId;
  isCompleted: boolean;
  onBackToLevel: () => void;
  onContinueNext?: () => void;
  children: React.ReactNode;
}

export const MiniGameShell: React.FC<MiniGameShellProps> = ({
  miniGameId,
  isCompleted,
  onBackToLevel,
  onContinueNext,
  children
}) => {
  const { state, language, ageGroup, setLanguage } = useGameState();
  const [briefingAccepted, setBriefingAccepted] = useState<boolean>(isCompleted);
  const [demoDismissed, setDemoDismissed] = useState<boolean>(isCompleted);
  const campaign = state.campaign;

  useEffect(() => {
    setBriefingAccepted(isCompleted);
    setDemoDismissed(isCompleted);
  }, [miniGameId, isCompleted]);

  const spec = MINI_GAME_SPECS[miniGameId];
  const briefing = MINI_GAME_BRIEFINGS[miniGameId];
  const ageHint = getAdaptedBriefingHint(miniGameId, language, ageGroup);
  const isAr = language === 'ar';

  const titleText = tr(language, spec.titleEn, spec.titleAr);
  const briefingSentences = isAr ? briefing.ar : briefing.en;

  const handlePlayVoice = () => {
    soundManager.playClick();
    const spoken = `${titleText}. ${briefingSentences.join(' ')} ${ageHint}`;
    speakWebSpeechNonBlocking(spoken, language);
  };

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      className="h-[100dvh] w-full scrollable-panel pt-4 pb-10 px-3 sm:px-6 max-w-5xl mx-auto space-y-4"
    >
      {/* Top Action & Context Header */}
      <header className="flex flex-wrap items-center justify-between gap-2.5 bg-slate-900/95 border-2 border-cyan-400/50 rounded-3xl p-3 sm:p-4 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            data-testid="minigame-back-btn"
            onClick={() => {
              soundManager.playClick();
              onBackToLevel();
            }}
            className="px-3 py-2 rounded-2xl bg-slate-800 hover:bg-cyan-700 text-white font-hud font-black text-xs sm:text-sm border border-cyan-400/40 flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors"
          >
            {isAr ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
            <span>{tr(language, 'Mission Deck', 'منصة المهمة')}</span>
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-lg sm:text-xl leading-none">{spec.icon}</span>
              <h1 className="font-hud font-black text-sm sm:text-lg text-white truncate">
                {titleText}
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 text-[10px] font-black">
                {tr(language, `Level ${spec.levelId}`, `المستوى ${spec.levelId}`)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {briefingAccepted && (
            <>
              {demoDismissed && (
                <button
                  type="button"
                  data-testid="replay-demo-btn"
                  onClick={() => {
                    soundManager.playClick();
                    setDemoDismissed(false);
                  }}
                  className="px-2.5 py-1.5 rounded-2xl bg-cyan-950/90 hover:bg-cyan-900 text-cyan-100 border border-cyan-400/60 text-xs font-hud font-black flex items-center gap-1 cursor-pointer"
                >
                  <span>🎬</span>
                  <span className="hidden sm:inline">{tr(language, 'Watch 5s Demo', 'مشاهدة العرض')}</span>
                </button>
              )}
              <button
                type="button"
                data-testid="reopen-briefing-btn"
                onClick={() => {
                  soundManager.playClick();
                  setBriefingAccepted(false);
                }}
                className="px-2.5 py-1.5 rounded-2xl bg-indigo-950/90 hover:bg-indigo-900 text-indigo-100 border border-indigo-400/60 text-xs font-hud font-black flex items-center gap-1 cursor-pointer"
              >
                <span>🤖</span>
                <span className="hidden sm:inline">{tr(language, 'Show Robo Briefing', 'عرض شرح روبو')}</span>
                <span className="sm:hidden">{tr(language, 'Tip', 'شرح')}</span>
              </button>
            </>
          )}

          <button
            type="button"
            data-testid="minigame-lang-toggle"
            onClick={() => {
              soundManager.playClick();
              setLanguage(isAr ? 'en' : 'ar');
            }}
            className="px-2.5 py-1.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-amber-200 border border-amber-300/60 text-xs font-hud font-black cursor-pointer"
          >
            {isAr ? '🌐 اللغة: عربي' : '🌐 EN • AR'}
          </button>

          <button
            type="button"
            data-testid="open-nasa-drawer-btn"
            onClick={() => {
              soundManager.playClick();
              openNasaDrawer();
            }}
            className="px-2.5 py-1.5 rounded-2xl bg-cyan-950 hover:bg-cyan-900 text-cyan-200 border border-cyan-400/60 text-xs font-hud font-black flex items-center gap-1 cursor-pointer"
          >
            <Satellite className="w-3.5 h-3.5 text-cyan-300" />
            <span>{tr(language, 'NASA', 'بيانات ناسا')}</span>
          </button>
        </div>
      </header>

      {/* Persistent Mission Carry-Over Inventory & Biometrics Bar */}
      {campaign && (
        <div className="flex justify-center">
          <MissionInventoryBar
            campaign={campaign}
            activeLevelId={spec.levelId}
            language={language}
          />
        </div>
      )}

      {/* Completion Victory Banner */}
      {isCompleted && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          data-testid="minigame-completed-banner"
          className="rounded-3xl bg-gradient-to-r from-emerald-950/90 via-teal-950/90 to-cyan-950/90 border-2 border-emerald-400/80 p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3 shadow-xl"
        >
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
            <div>
              <p className="font-hud font-black text-sm sm:text-base text-emerald-100">
                {tr(
                  language,
                  'Mission Accomplished! Next Step Unlocked!',
                  'أحسنت! تم إكمال المهمة وفتح الخطوة التالية!'
                )}
              </p>
              <p className="text-xs text-emerald-200/85">
                {tr(
                  language,
                  'You can replay anytime or follow the golden floor arrow to your next station.',
                  'يمكنك إعادة التجربة الآن أو العودة لاتباع السهم الذهبي للمحطة التالية.'
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onContinueNext ? (
              <button
                type="button"
                data-testid="minigame-continue-btn"
                onClick={() => {
                  soundManager.playClick();
                  onContinueNext();
                }}
                className="px-4 py-2 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 hover:brightness-110 text-slate-950 font-hud font-black text-xs sm:text-sm shadow-lg cursor-pointer flex items-center gap-1.5"
              >
                <Rocket className="w-4 h-4" />
                <span>{tr(language, 'Go to Next Mission', 'للمهمة التالية')}</span>
              </button>
            ) : (
              <button
                type="button"
                data-testid="minigame-continue-btn"
                onClick={() => {
                  soundManager.playClick();
                  onBackToLevel();
                }}
                className="px-4 py-2 rounded-2xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-hud font-black text-xs sm:text-sm shadow cursor-pointer"
              >
                {tr(language, 'Return to Mission Deck', 'العودة لمنصة المهمة')}
              </button>
            )}
          </div>
        </motion.div>
      )}

      {/* Stage 1: Learn-Before-Play Robo Briefing Card */}
      {!briefingAccepted ? (
        <motion.section
          key={`briefing-${miniGameId}`}
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          data-testid="robo-briefing-card"
          className="rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950/90 to-slate-900 border-2 border-cyan-400/80 p-5 sm:p-7 shadow-2xl space-y-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-300/60 text-cyan-100 text-xs font-hud font-black">
              <span>🤖</span>
              <span>{tr(language, 'ROBO SCIENCE BRIEFING', 'شرح روبو السريع')}</span>
            </div>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-300/70 text-amber-200 text-xs font-hud font-black">
              <Satellite className="w-3.5 h-3.5 text-amber-300" />
              <span>NASA Data: {briefing.datasetTag}</span>
            </span>
          </div>

          <div className="flex items-center gap-3 sm:gap-4 rounded-2xl bg-slate-950/65 border border-cyan-400/40 p-3 sm:p-4">
            <div
              data-testid="briefing-robo-character"
              className="shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/30 border border-cyan-300/50 flex items-center justify-center overflow-hidden"
            >
              <RoboCharacter pose="TALKING" size={84} animated interactive={false} showShadow={false} />
            </div>
            <div className="flex-1 min-w-0 space-y-1.5">
              <p className="text-xs font-hud font-black text-cyan-300 uppercase tracking-wide">
                {tr(language, 'Robo says:', 'روبو يقول لك:')}
              </p>
              <p className="text-sm sm:text-base font-bold text-white leading-snug">
                {ageHint || briefingSentences[0]}
              </p>
            </div>
          </div>

          <StageStoryBanner compact levelId={spec.levelId} language={language} />

          {/* 3 Cartoon Visual Story Icons */}
          <div className="flex items-center justify-center gap-3 sm:gap-5 py-2">
            {briefing.icons.map((iconChar, idx) => (
              <motion.div
                key={idx}
                initial={{ y: 8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: idx * 0.08 }}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-slate-950/80 border-2 border-cyan-400/50 flex items-center justify-center text-3xl sm:text-4xl shadow-lg"
              >
                {iconChar}
              </motion.div>
            ))}
          </div>

          {/* 2 Concise Educational Sentences */}
          <div className="rounded-2xl bg-slate-950/75 border border-slate-700/80 p-4 space-y-2.5 text-center sm:text-start">
            <p className="text-sm sm:text-base font-bold text-white leading-relaxed">
              {briefingSentences[0]}
            </p>
            <p className="text-xs sm:text-sm font-semibold text-cyan-200 leading-relaxed">
              {briefingSentences[1]}
            </p>
          </div>

          {/* Age-Adapted Robo Tip Pill */}
          <div className="rounded-2xl bg-emerald-950/45 border border-emerald-400/50 p-3.5 flex items-start gap-2.5">
            <Sparkles className="w-5 h-5 text-emerald-300 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <div className="text-[11px] font-hud font-black text-emerald-300 uppercase">
                {tr(language, `Cadet Tip (Age ${ageGroup})`, `نصيحة روبو (عمر ${ageGroup})`)}
              </div>
              <p className="text-xs sm:text-sm font-bold text-emerald-50">{ageHint}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <button
              type="button"
              onClick={handlePlayVoice}
              className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-cyan-200 border border-cyan-400/50 font-hud font-black text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Volume2 className="w-4 h-4" />
              <span>{tr(language, 'Read Aloud', 'استمع للشرح')}</span>
            </button>

            <button
              type="button"
              data-testid="briefing-start-btn"
              onClick={() => {
                soundManager.playClick();
                setBriefingAccepted(true);
              }}
              className="flex-1 sm:flex-none px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-400 hover:brightness-105 active:scale-95 text-slate-950 font-hud font-black text-sm sm:text-base border-2 border-white shadow-[0_4px_0_#b45309] flex items-center justify-center gap-2 cursor-pointer transition-transform"
            >
              <span>{tr(language, 'Got it! Start Mission 🚀', 'فهمت! ابدأ المهمة 🚀')}</span>
            </button>
          </div>
        </motion.section>
      ) : !demoDismissed ? (
        <MiniGameDemoOverlay
          key={`demo-${miniGameId}`}
          miniGameId={miniGameId}
          onFinish={() => setDemoDismissed(true)}
        />
      ) : (
        /* Stage 2: Interactive Mini-Game Workspace */
        <motion.section
          key={`workspace-${miniGameId}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          data-testid="minigame-workspace"
          className="rounded-3xl bg-slate-900/90 border-2 border-slate-700/80 p-3.5 sm:p-5 shadow-2xl"
        >
          {children}
        </motion.section>
      )}
    </div>
  );
};
