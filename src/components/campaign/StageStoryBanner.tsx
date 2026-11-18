import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Volume2 } from 'lucide-react';
import { AppLanguage, CampaignLevelId } from '../../types/game';
import { STAGE_CAUSE_EFFECT } from '../../data/campaignBilingual';
import { tr, speakWebSpeechNonBlocking } from '../../utils/i18n';
import { soundManager } from '../../utils/sound';

export interface StageStoryBannerProps {
  levelId: CampaignLevelId;
  language: AppLanguage;
  compact?: boolean;
  onDismiss?: () => void;
}

export const StageStoryBanner: React.FC<StageStoryBannerProps> = ({
  levelId,
  language,
  compact = false,
  onDismiss
}) => {
  const story = STAGE_CAUSE_EFFECT[levelId];
  const isAr = language === 'ar';
  const spokenSummary = isAr
    ? `${story.prevTitleAr}: ${story.prevImpactAr} ${story.goalTitleAr}: ${story.goalWhyAr}`
    : `${story.prevTitleEn}: ${story.prevImpactEn} ${story.goalTitleEn}: ${story.goalWhyEn}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      data-testid="stage-story-strip"
      dir={isAr ? 'rtl' : 'ltr'}
      className={`rounded-2xl bg-gradient-to-r from-slate-900/95 via-indigo-950/92 to-cyan-950/92 border-2 border-cyan-400/65 shadow-xl backdrop-blur-md ${
        compact ? 'p-2.5 sm:p-3 space-y-2' : 'p-3.5 sm:p-4 space-y-2.5'
      }`}
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400/20 border border-amber-300/60 text-amber-200 font-hud font-black text-[10px] sm:text-xs">
          <span>🔗</span>
          <span>
            {tr(language, 'Cause & Effect Story Chain', 'ترابط المهمة: السبب والنتيجة')}
          </span>
        </span>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              speakWebSpeechNonBlocking(spokenSummary, language);
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-800 hover:bg-cyan-700 text-cyan-200 border border-cyan-400/50 text-[10px] sm:text-[11px] font-hud font-black cursor-pointer"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>{tr(language, 'Listen', 'اسمع القصة')}</span>
          </button>

          {onDismiss && (
            <button
              type="button"
              data-testid="dismiss-story-banner-btn"
              onClick={() => {
                soundManager.playClick();
                onDismiss();
              }}
              className="px-2.5 py-1 rounded-full bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-hud font-black text-[10px] sm:text-[11px] cursor-pointer"
            >
              {tr(language, 'Got it!', 'فهمت!')}
            </button>
          )}
        </div>
      </div>

      {/* Previous Stage Impact -> Arrow -> Current Mission Goal */}
      <div className={`grid ${compact ? 'grid-cols-2 md:grid-cols-[1fr_auto_1fr]' : 'grid-cols-1 md:grid-cols-[1fr_auto_1fr]'} items-stretch gap-1.5 sm:gap-2`}>
        <div className="rounded-xl bg-slate-950/75 border border-emerald-400/40 p-2 sm:p-2.5 flex items-start gap-2.5">
          <motion.span
            animate={{ scale: [1, 1.12, 1] }}
            transition={{ repeat: Infinity, duration: 2.8 }}
            className="text-2xl sm:text-3xl leading-none shrink-0"
          >
            {story.prevIcon}
          </motion.span>
          <div className="min-w-0">
            <div className="text-[11px] font-hud font-black text-emerald-300 truncate">
              {tr(language, story.prevTitleEn, story.prevTitleAr)}
            </div>
            <p className="text-[11px] text-slate-200 font-semibold leading-snug">
              {tr(language, story.prevImpactEn, story.prevImpactAr)}
            </p>
          </div>
        </div>

        <div className="hidden md:flex items-center justify-center text-cyan-300">
          {isAr ? <ArrowLeft className="w-5 h-5" /> : <ArrowRight className="w-5 h-5" />}
        </div>

        <div className="rounded-xl bg-slate-950/75 border border-amber-400/50 p-2 sm:p-2.5 flex items-start gap-2.5">
          <motion.span
            animate={{ y: [0, -3, 0] }}
            transition={{ repeat: Infinity, duration: 2.2 }}
            className="text-2xl sm:text-3xl leading-none shrink-0"
          >
            {story.goalIcon}
          </motion.span>
          <div className="min-w-0">
            <div className="text-[11px] font-hud font-black text-amber-300 truncate">
              {tr(language, story.goalTitleEn, story.goalTitleAr)}
            </div>
            <p className="text-[11px] text-cyan-100 font-semibold leading-snug">
              {tr(language, story.goalWhyEn, story.goalWhyAr)}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
