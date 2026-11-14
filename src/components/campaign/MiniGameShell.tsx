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
  children: React.ReactNode;
}

export const MiniGameShell: React.FC<MiniGameShellProps> = ({
  miniGameId,
  isCompleted,
  onBackToLevel,
  children
}) => {
  const spec = MINI_GAME_SPECS[miniGameId];

  return (
    <div
      className="min-h-screen w-full pt-24 pb-10 px-4 sm:px-6 max-w-5xl mx-auto flex flex-col gap-4"
      dir="rtl"
    >
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/95 border-2 border-cyan-400/60 rounded-3xl p-4 shadow-xl">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              dialogueManager.stop();
              onBackToLevel();
            }}
            className="px-3.5 py-2 rounded-2xl bg-slate-800 hover:bg-cyan-700 text-white font-hud font-black text-xs sm:text-sm border border-cyan-400/60 flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowRight className="w-4 h-4" />
            <span>خريطة المستوى {spec.levelId}</span>
          </button>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xl sm:text-2xl">{spec.icon}</span>
              <h1 className="font-hud font-black text-lg sm:text-2xl text-white">
                {spec.titleAr}
              </h1>
              {isCompleted && (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-300 font-hud font-black text-xs flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> مكتمل
                </span>
              )}
            </div>
            <p className="font-hud text-xs sm:text-sm text-cyan-200 mt-0.5">
              {spec.subtitleAr}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-3 py-1.5 rounded-full bg-sky-950 border border-cyan-400/60 text-cyan-200 font-hud font-black text-xs flex items-center gap-1.5">
            <Satellite className="w-3.5 h-3.5 text-amber-300" />
            <span>{spec.nasaBadge}</span>
          </span>
          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              void dialogueManager.speak(spec.roboPromptAr);
            }}
            className="px-3 py-1.5 rounded-full bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-300 text-cyan-100 font-hud font-black text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Volume2 className="w-4 h-4 text-amber-300" />
            <span>اسمع روبو 🤖</span>
          </button>
        </div>
      </div>

      {/* Main Playable Body */}
      <div className="flex-1 flex flex-col gap-4">{children}</div>
    </div>
  );
};
