import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Info,
  Rocket,
  Satellite,
  Sparkles,
  Volume2,
  X
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
  const [isInfoOpen, setIsInfoOpen] = useState<boolean>(false);
  const [isDemoOpen, setIsDemoOpen] = useState<boolean>(false);
  const campaign = state.campaign;

  useEffect(() => {
    setIsInfoOpen(false);
    setIsDemoOpen(false);
  }, [miniGameId]);

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
      className="h-[100dvh] w-full overflow-hidden flex flex-col bg-slate-950 text-white select-none"
    >
      {/* Ultra-Slim Single-Row Landscape Game Header (<= 40px height) */}
      <header
        data-testid="minigame-top-bar"
        className="h-9 sm:h-10 max-h-[40px] shrink-0 px-2 sm:px-3 bg-slate-900/95 border-b border-cyan-400/40 flex items-center justify-between gap-1.5 backdrop-blur-md z-30"
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <button
            type="button"
            data-testid="minigame-back-btn"
            onClick={() => {
              soundManager.playClick();
              onBackToLevel();
            }}
            className="h-7 px-2 sm:px-2.5 rounded-full bg-slate-800 hover:bg-cyan-700 text-white font-hud font-black text-[11px] sm:text-xs border border-cyan-400/45 flex items-center gap-1 cursor-pointer shrink-0 transition-colors"
          >
            {isAr ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
            <span>{tr(language, 'Back', 'رجوع')}</span>
          </button>

          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-base leading-none shrink-0">{spec.icon}</span>
            <h1 className="font-hud font-black text-xs sm:text-sm text-white truncate">
              {titleText}
            </h1>
            <span className="hidden lg:inline-flex px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 text-[10px] font-black shrink-0">
              {tr(language, `L${spec.levelId}`, `م${spec.levelId}`)}
            </span>
          </div>

          {/* Inline Compact Completion Pill (never pushes workspace downward) */}
          {isCompleted && (
            <div
              data-testid="minigame-completed-banner"
              className="flex items-center gap-1 shrink-0"
            >
              <button
                type="button"
                data-testid="minigame-continue-btn"
                onClick={() => {
                  soundManager.playClick();
                  if (onContinueNext) onContinueNext();
                  else onBackToLevel();
                }}
                className="h-7 px-2.5 rounded-full bg-gradient-to-r from-emerald-400 to-amber-300 hover:brightness-110 text-slate-950 font-hud font-black text-[11px] shadow cursor-pointer flex items-center gap-1 whitespace-nowrap"
              >
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>{tr(language, onContinueNext ? 'Next Mission' : 'Deck', onContinueNext ? 'المهمة التالية' : 'المنصة')}</span>
                {onContinueNext && <Rocket className="w-3 h-3 shrink-0" />}
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {campaign && (
            <MissionInventoryBar
              inlineSlim
              campaign={campaign}
              activeLevelId={spec.levelId}
              language={language}
            />
          )}

          <button
            type="button"
            data-testid="replay-demo-btn"
            onClick={() => {
              soundManager.playClick();
              setIsInfoOpen(false);
              setIsDemoOpen((v) => !v);
            }}
            title={tr(language, 'Watch 5s Demo', 'مشاهدة العرض')}
            aria-label={tr(language, 'Watch 5s Demo', 'مشاهدة العرض')}
            className={`h-7 px-2 rounded-full border text-[11px] font-hud font-black flex items-center gap-1 cursor-pointer transition-colors ${
              isDemoOpen
                ? 'bg-cyan-400 text-slate-950 border-white'
                : 'bg-cyan-950/90 hover:bg-cyan-900 text-cyan-100 border-cyan-400/60'
            }`}
          >
            <span>🎬</span>
            <span className="hidden lg:inline">{tr(language, 'Demo', 'عرض')}</span>
          </button>

          <button
            type="button"
            data-testid="minigame-info-btn"
            onClick={() => {
              soundManager.playClick();
              setIsDemoOpen(false);
              setIsInfoOpen((v) => !v);
            }}
            title={tr(language, 'NASA Science Info', 'معلومات ناسا وشرح روبو')}
            aria-label={tr(language, 'NASA Science Info', 'معلومات ناسا وشرح روبو')}
            className={`h-7 px-2 rounded-full border text-[11px] font-hud font-black flex items-center gap-1 cursor-pointer transition-colors ${
              isInfoOpen
                ? 'bg-indigo-400 text-slate-950 border-white'
                : 'bg-indigo-950/90 hover:bg-indigo-900 text-indigo-100 border-indigo-400/65'
            }`}
          >
            <Info className="w-3.5 h-3.5 shrink-0" />
            <span className="md:hidden">{tr(language, 'Info', 'شرح روبو')}</span>
            <span className="hidden md:inline">{tr(language, 'NASA Info', 'شرح ناسا')}</span>
          </button>

          <button
            type="button"
            data-testid="minigame-lang-toggle"
            onClick={() => {
              soundManager.playClick();
              setLanguage(isAr ? 'en' : 'ar');
            }}
            className="h-7 px-2 rounded-full bg-slate-800 hover:bg-slate-700 text-amber-200 border border-amber-300/60 text-[11px] font-hud font-black cursor-pointer"
          >
            {isAr ? 'EN' : 'AR'}
          </button>
        </div>
      </header>

      {/* Immediate Zero-Scroll 2-Column Landscape Workspace */}
      <main
        data-testid="minigame-workspace"
        className="flex-1 min-h-0 h-[calc(100dvh-40px)] w-full overflow-hidden p-1.5 sm:p-2.5 lg:p-4 flex flex-col"
      >
        <div className="w-full max-w-6xl mx-auto flex-1 min-h-0 flex flex-col overflow-hidden">
          {children}
        </div>
      </main>

      {/* Progressive Disclosure Popover: NASA Science Info & Robo Explanation */}
      {isInfoOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-5"
          onClick={() => setIsInfoOpen(false)}
        >
          <motion.section
            key={`info-${miniGameId}`}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            data-testid="robo-info-popover"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl max-h-[calc(100dvh-20px)] overflow-y-auto rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950/90 to-slate-900 border-2 border-cyan-400/80 p-3.5 sm:p-5 shadow-2xl space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/20 border border-cyan-300/60 text-cyan-100 text-[11px] font-hud font-black">
                  <span>🤖</span>
                  <span>{tr(language, 'ROBO SCIENCE INFO', 'شرح روبو العلمي')}</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-400/20 border border-amber-300/70 text-amber-200 text-[11px] font-hud font-black">
                  <Satellite className="w-3 h-3 text-amber-300" />
                  <span>{briefing.datasetTag}</span>
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handlePlayVoice}
                  className="px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-cyan-200 border border-cyan-400/50 font-hud font-black text-[11px] flex items-center gap-1 cursor-pointer"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>{tr(language, 'Read', 'استمع')}</span>
                </button>
                <button
                  type="button"
                  data-testid="open-nasa-drawer-btn"
                  onClick={() => {
                    soundManager.playClick();
                    setIsInfoOpen(false);
                    openNasaDrawer();
                  }}
                  className="px-2.5 py-1 rounded-full bg-cyan-950 hover:bg-cyan-900 text-cyan-200 border border-cyan-400/60 text-[11px] font-hud font-black flex items-center gap-1 cursor-pointer"
                >
                  <Satellite className="w-3.5 h-3.5 text-cyan-300" />
                  <span>{tr(language, 'NASA Data', 'بيانات ناسا')}</span>
                </button>
                <button
                  type="button"
                  data-testid="robo-info-close-btn"
                  onClick={() => {
                    soundManager.playClick();
                    setIsInfoOpen(false);
                  }}
                  aria-label={tr(language, 'Close Info', 'إغلاق')}
                  className="w-7 h-7 rounded-full bg-slate-800 hover:bg-rose-600 text-white border border-slate-600 flex items-center justify-center cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl bg-slate-950/75 border border-cyan-400/40 p-2.5 sm:p-3">
              <div className="shrink-0 w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/30 border border-cyan-300/50 flex items-center justify-center overflow-hidden">
                <RoboCharacter pose="TALKING" size={60} animated interactive={false} showShadow={false} />
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <p className="text-xs sm:text-sm font-bold text-white leading-snug">
                  {briefingSentences[0]}
                </p>
                <p className="text-[11px] sm:text-xs font-semibold text-cyan-200 leading-snug">
                  {briefingSentences[1]}
                </p>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                {briefing.icons.map((iconChar, idx) => (
                  <span
                    key={idx}
                    className="w-10 h-10 rounded-xl bg-slate-900 border border-cyan-400/40 flex items-center justify-center text-xl"
                  >
                    {iconChar}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-emerald-950/45 border border-emerald-400/50 p-2.5 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-300 shrink-0" />
              <p className="text-xs font-bold text-emerald-50">
                <span className="text-emerald-300 font-hud font-black me-1.5">
                  {tr(language, `Age ${ageGroup}:`, `عمر ${ageGroup}:`)}
                </span>
                {ageHint}
              </p>
            </div>

            <StageStoryBanner compact levelId={spec.levelId} language={language} />
          </motion.section>
        </div>
      )}

      {/* On-Demand Zero-Scroll Compact 5s Demo Overlay */}
      {isDemoOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4"
          onClick={() => setIsDemoOpen(false)}
        >
          <div className="w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <MiniGameDemoOverlay
              compact
              key={`demo-${miniGameId}`}
              miniGameId={miniGameId}
              onFinish={() => setIsDemoOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
