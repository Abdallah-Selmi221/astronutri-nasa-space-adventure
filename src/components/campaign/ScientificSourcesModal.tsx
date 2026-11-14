import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DAILY_REFERENCE_ASSUMPTIONS,
  ISS_WATER_MILESTONE,
  SCIENCE_BADGES,
  SCIENCE_LINK_CHECKED_AT,
  SCIENCE_PILLARS,
  SCIENTIFIC_SOURCES,
  ScienceBadgeType,
  getSourceVerificationStatus
} from '../../data/science';
import { soundManager } from '../../utils/sound';
import { BookOpen, CheckCircle2, ShieldCheck, AlertTriangle, X, Filter } from 'lucide-react';

interface ScientificSourcesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ScientificSourcesModal: React.FC<ScientificSourcesModalProps> = ({
  isOpen,
  onClose
}) => {
  const [badgeFilter, setBadgeFilter] = useState<'ALL' | ScienceBadgeType>('ALL');

  const filteredPillars =
    badgeFilter === 'ALL'
      ? SCIENCE_PILLARS
      : SCIENCE_PILLARS.filter((p) => p.badgeType === badgeFilter);

  const handleClose = () => {
    soundManager.playClick();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md"
          dir="rtl"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            className="w-full max-w-5xl max-h-[92vh] bg-slate-900 border-2 border-cyan-400/60 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-white"
          >
            {/* Header */}
            <div className="p-4 sm:p-5 bg-slate-950/90 border-b border-cyan-500/35 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-cyan-500/20 border border-cyan-300 flex items-center justify-center text-cyan-300">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="font-hud font-black text-base sm:text-xl text-white">
                    مصادر علمية ونظام التغذية البيئية الفضائية (Space Eco-Nutrition System)
                  </h2>
                  <p className="text-xs text-cyan-300 font-bold">
                    10 ركائز علمية موثقة + 13 مرجعاً رسمياً من ناسا وإيسا • تصنيف صريح للحقائق والتجارب والتبسيط
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClose}
                className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center border border-slate-600 cursor-pointer"
                aria-label="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              {/* Badge Filter Strip */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Filter className="w-4 h-4 text-cyan-400" />
                  <span>تصفية الحقائق حسب مستوى الجاهزية العلمية (TRL & Verification):</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      soundManager.playClick();
                      setBadgeFilter('ALL');
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-black border cursor-pointer transition-all ${
                      badgeFilter === 'ALL'
                        ? 'bg-cyan-500 text-slate-950 border-cyan-300'
                        : 'bg-slate-800 text-slate-200 border-slate-600 hover:border-cyan-400'
                    }`}
                  >
                    الكل ({SCIENCE_PILLARS.length})
                  </button>
                  {(Object.keys(SCIENCE_BADGES) as ScienceBadgeType[]).map((bt) => {
                    const meta = SCIENCE_BADGES[bt];
                    const active = badgeFilter === bt;
                    return (
                      <button
                        key={bt}
                        type="button"
                        onClick={() => {
                          soundManager.playClick();
                          setBadgeFilter(bt);
                        }}
                        className={`px-3 py-1.5 rounded-full text-xs font-black border cursor-pointer transition-all ${
                          active
                            ? 'ring-2 ring-white ' + meta.colorClass
                            : meta.colorClass + ' opacity-85 hover:opacity-100'
                        }`}
                      >
                        {meta.labelAr} • {meta.labelEn}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quick Highlight Cards: 70kg Planning Assumption + 98% Water Recovery */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div className="p-4 rounded-2xl bg-sky-950/45 border-2 border-sky-400/50 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-hud font-black text-sm text-sky-200">
                      📐 مرجع التغذية التخطيطي ({DAILY_REFERENCE_ASSUMPTIONS.bodyMassKg} كجم / {DAILY_REFERENCE_ASSUMPTIONS.missionDays} يوم)
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-sky-900 border border-sky-400 text-sky-200">
                      {SCIENCE_BADGES.PLANNING_ASSUMPTION.labelAr}
                    </span>
                  </div>
                  <div className="grid grid-cols-5 gap-1.5 text-center text-[11px] font-bold">
                    <div className="p-2 rounded-xl bg-slate-950/75 border border-slate-800">
                      <div className="text-amber-300 font-black">{DAILY_REFERENCE_ASSUMPTIONS.energyKcal}</div>
                      <div className="text-[10px] text-slate-400">kcal</div>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-950/75 border border-slate-800">
                      <div className="text-emerald-300 font-black">{DAILY_REFERENCE_ASSUMPTIONS.proteinGrams}g</div>
                      <div className="text-[10px] text-slate-400">بروتين</div>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-950/75 border border-slate-800">
                      <div className="text-sky-300 font-black">{DAILY_REFERENCE_ASSUMPTIONS.carbsGrams}g</div>
                      <div className="text-[10px] text-slate-400">كربوهيدرات</div>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-950/75 border border-slate-800">
                      <div className="text-yellow-300 font-black">{DAILY_REFERENCE_ASSUMPTIONS.fatsGrams}g</div>
                      <div className="text-[10px] text-slate-400">دهون</div>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-950/75 border border-slate-800">
                      <div className="text-pink-300 font-black">{DAILY_REFERENCE_ASSUMPTIONS.fiberGramsRange}</div>
                      <div className="text-[10px] text-slate-400">ألياف</div>
                    </div>
                  </div>
                  <p className="text-[11px] text-sky-100/90 leading-relaxed">
                    {DAILY_REFERENCE_ASSUMPTIONS.disclaimerAr} (البروتين: {DAILY_REFERENCE_ASSUMPTIONS.proteinPerKg} جم/كجم، النطاق {DAILY_REFERENCE_ASSUMPTIONS.proteinRangePerKg}).
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-950/40 border-2 border-emerald-400/50 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-hud font-black text-sm text-emerald-200">
                      💧 استرجاع المياه {ISS_WATER_MILESTONE.recoveryPercent}% على ISS ({ISS_WATER_MILESTONE.dateLabel})
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-900 border border-emerald-400 text-emerald-200">
                      {SCIENCE_BADGES.ISS_PROVEN.labelAr}
                    </span>
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed">
                    تحقق الإنجاز عبر <strong>{ISS_WATER_MILESTONE.systemName}</strong> بجمع ماء التنفس والعرق والبول ومياه النظافة.
                  </p>
                  <p className="text-[11px] text-amber-200 font-bold leading-relaxed">
                    {ISS_WATER_MILESTONE.caveatAr}
                  </p>
                </div>
              </div>

              {/* 10+ Verified Scientific Pillars */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredPillars.map((pillar) => {
                  const badgeMeta = SCIENCE_BADGES[pillar.badgeType];
                  const source = SCIENTIFIC_SOURCES.find((s) => s.id === pillar.sourceId);
                  return (
                    <div
                      key={pillar.id}
                      className="p-4 rounded-2xl bg-slate-950/75 border border-slate-700/80 flex flex-col justify-between gap-2.5 shadow-lg"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-hud font-black text-sm text-white leading-snug">
                            {pillar.titleAr}
                          </h3>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black border shrink-0 ${badgeMeta.colorClass}`}
                          >
                            {pillar.badgeLabelAr}
                          </span>
                        </div>
                        <p className="text-xs text-slate-200 leading-relaxed">{pillar.textAr}</p>
                        <p className="text-[11px] text-slate-400 leading-relaxed" dir="ltr">
                          {pillar.textEn}
                        </p>
                      </div>
                      {source && (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-cyan-950/70 border border-cyan-400/35 text-[11px] text-cyan-200 font-bold w-fit">
                          <ShieldCheck className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
                          <span>المرجع #{source.index}: {source.title} ({source.year})</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* All 13 Official References Table (Static In-Game Reference Cards - Zero External Links) */}
              <div className="rounded-3xl bg-slate-950/85 border border-cyan-500/35 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-hud font-black text-sm sm:text-base text-cyan-200">
                    📚 بطاقات المراجع العلمية الرسمية (13 مرجعاً داخل التطبيق)
                  </h3>
                  {SCIENCE_LINK_CHECKED_AT && (
                    <span className="text-[11px] text-emerald-300 font-bold">
                      أرشيف علمي موثق داخل اللعبة • إصدار: {SCIENCE_LINK_CHECKED_AT.slice(0, 10)}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {SCIENTIFIC_SOURCES.map((src) => {
                    const st = getSourceVerificationStatus(src.id);
                    const needsReview = st ? st.reviewRequired : false;
                    return (
                      <div
                        key={src.id}
                        data-testid="scientific-source-card"
                        className="p-3.5 rounded-2xl bg-slate-900/90 border-2 border-slate-700/80 hover:border-cyan-400/70 transition-all flex items-start justify-between gap-2.5 shadow-sm"
                      >
                        <div className="min-w-0 space-y-1">
                          <div className="font-black text-xs text-white leading-snug">
                            {src.index}. {src.title}
                          </div>
                          <div className="text-[11px] text-cyan-100/90 font-bold">{src.titleAr}</div>
                          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                            <span className="px-2 py-0.5 rounded-full bg-indigo-950/90 border border-indigo-400/50 text-indigo-200 text-[10px] font-black">
                              إصدار {src.year}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-600 text-slate-300 text-[10px] font-bold">
                              مرجع علمي معتمد
                            </span>
                          </div>
                        </div>

                        <div className="shrink-0 flex flex-col items-end gap-1">
                          {needsReview ? (
                            <span className="px-2 py-0.5 rounded-full bg-amber-950 border border-amber-400 text-amber-200 text-[10px] font-black flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              <span>قيد التحديث</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-400 text-emerald-200 text-[10px] font-black flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>موثق</span>
                            </span>
                          )}
                          <ShieldCheck className="w-4 h-4 text-cyan-400" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
