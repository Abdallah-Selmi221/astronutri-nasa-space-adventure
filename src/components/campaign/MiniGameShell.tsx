import React from 'react';
import { MINI_GAME_SPECS } from '../../data/campaignLevels';
import { MiniGameId } from '../../types/game';
import { dialogueManager } from '../../utils/geminiTTS';
import { soundManager } from '../../utils/sound';
import { ArrowRight, Volume2, Satellite, CheckCircle2 } from 'lucide-react';

interface MiniGameShellProps {
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
  const spec = MINI_GAME_SPECS[miniGameId];

  return (
    <div
      className="min-h-screen w-full pt-20 sm:pt-24 pb-10 px-3 sm:px-6 max-w-5xl mx-auto flex flex-col gap-4 overflow-x-hidden"
      dir="rtl"
    >
      {/* Top Bar */}
      <div className="casual-card p-3.5 sm:p-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              dialogueManager.stop();
              onBackToLevel();
            }}
            className="casual-btn-cyan px-3.5 py-2 text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <ArrowRight className="w-4 h-4" />
            <span>المستوى {spec.levelId}</span>
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xl sm:text-2xl">{spec.icon}</span>
              <h1 className="font-hud font-black text-base sm:text-2xl text-white">
                {spec.titleAr}
              </h1>
              {isCompleted && (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/25 border border-emerald-400 text-emerald-200 font-hud font-black text-xs flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> مكتمل
                </span>
              )}
            </div>
            <p className="font-hud text-xs sm:text-sm text-cyan-200 mt-0.5 leading-snug">
              {spec.subtitleAr}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-3 py-1.5 rounded-full bg-sky-950/90 border border-cyan-400/60 text-cyan-200 font-hud font-black text-xs flex items-center gap-1.5">
            <Satellite className="w-3.5 h-3.5 text-amber-300" />
            <span>{spec.nasaBadge}</span>
          </span>
          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              void dialogueManager.speak(spec.roboPromptAr, undefined, undefined, undefined, {
                force: true
              });
            }}
            className="casual-btn-primary px-3.5 py-1.5 text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Volume2 className="w-4 h-4" />
            <span>اسمع روبو 🤖</span>
          </button>
        </div>
      </div>

      {/* Main Playable Body */}
      <div className="flex-1 flex flex-col gap-4">{children}</div>

      {isCompleted && (
        <div
          data-testid="minigame-completed-banner"
          className="p-4 rounded-3xl bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-950 border-2 border-emerald-400 flex flex-wrap items-center justify-between gap-3 shadow-[0_0_28px_rgba(52,211,153,0.35)]"
        >
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-6 h-6 text-emerald-300 shrink-0" />
            <span className="font-hud font-black text-sm sm:text-base text-emerald-100">
              أحسنت يا بطل! تم حفظ إنجاز المهمة بنجاح.
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              dialogueManager.stopCurrentSpeech();
              if (onContinueNext) onContinueNext();
              else onBackToLevel();
            }}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-300 via-yellow-300 to-emerald-300 text-slate-950 font-hud font-black text-sm border-2 border-white shadow-[0_0_20px_rgba(251,191,36,0.65)] cursor-pointer hover:scale-105 transition-transform"
          >
            المهمة اكتملت! انطلق للمرحلة التالية 🚀
          </button>
        </div>
      )}
    </div>
  );
};
