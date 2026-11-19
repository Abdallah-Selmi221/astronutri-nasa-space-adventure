import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { AppLanguage, CampaignLevelId, CampaignProgressState } from '../../types/game';
import { tr } from '../../utils/i18n';
import { soundManager } from '../../utils/sound';
import { computeCrossStageEffects } from '../../utils/consequences';
import { AstronautBioTwin } from './AstronautBioTwin';

export interface MissionInventoryBarProps {
  campaign: CampaignProgressState;
  activeLevelId: CampaignLevelId;
  language: AppLanguage;
  inlineSlim?: boolean;
}

export interface ComputedMissionStatus {
  rationsRemaining: number;
  rationsConsumed: number;
  suitStatusEn: string;
  suitStatusAr: string;
  hydrationPct: number;
  boneMusclePct: number;
}

export function computeMissionInventoryStatus(
  campaign: CampaignProgressState,
  activeLevelId: CampaignLevelId
): ComputedMissionStatus {
  const done = new Set(campaign.completedMiniGames);
  const packedFoods = campaign.l1SelectedFoodIds.length;
  const consumedOrbit = activeLevelId >= 2 && packedFoods > 0 ? 1 : 0;
  const consumedMoon = activeLevelId >= 3 && packedFoods > 1 ? 1 : 0;
  const replenished = done.has('l2_balanced_meal') || done.has('l3_water_recycling') ? 1 : 0;
  const rationsConsumed = consumedOrbit + consumedMoon;
  const rationsRemaining = Math.max(0, packedFoods - rationsConsumed + (packedFoods > 0 ? replenished : 0));

  let hydrationPct = done.has('l1_medical_check') ? 96 : 62;
  if (activeLevelId === 2) {
    hydrationPct = done.has('l2_balanced_meal') || campaign.l2HydrationPercent >= 100 ? 98 : 78;
  } else if (activeLevelId === 3) {
    hydrationPct = done.has('l3_water_recycling') || campaign.l3WaterRecycled ? 98 : 74;
  } else if (activeLevelId === 4) {
    hydrationPct = done.has('l4_departure_prep') ? 96 : 84;
  }

  let boneMusclePct = 100;
  if (activeLevelId === 2) {
    boneMusclePct = done.has('l2_balanced_meal') ? 92 : 84;
  } else if (activeLevelId === 3) {
    boneMusclePct =
      done.has('l3_resistance_training') || (campaign.l3BoneMuscleScore || 0) >= 95 ? 100 : 76;
  } else if (activeLevelId === 4) {
    boneMusclePct = done.has('l4_earth_reentry') ? 95 : 88;
  }

  const eqCount = campaign.l1EquipmentPacked.length;
  const evaReady = campaign.l3EvaSuitAssembled || activeLevelId >= 3;
  const suitStatusEn = evaReady
    ? 'xEMU + SPACE-FIT X'
    : eqCount > 0
    ? `${eqCount} Gear Ready`
    : done.has('l1_equipment_prep')
    ? 'Calibrated'
    : 'Unchecked';
  const suitStatusAr = evaReady
    ? 'بدلة القمر والتدريب'
    : eqCount > 0
    ? `${eqCount} معدات جاهزة`
    : done.has('l1_equipment_prep')
    ? 'معايرة جاهزة'
    : 'غير مفحوصة';

  return {
    rationsRemaining,
    rationsConsumed,
    suitStatusEn,
    suitStatusAr,
    hydrationPct,
    boneMusclePct
  };
}

export const MissionInventoryBar: React.FC<MissionInventoryBarProps> = ({
  campaign,
  activeLevelId,
  language,
  inlineSlim = false
}) => {
  const s = computeMissionInventoryStatus(campaign, activeLevelId);
  const effects = computeCrossStageEffects(campaign);
  const isAr = language === 'ar';
  const [isBioOpen, setIsBioOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isBioOpen || !panelRef.current) return;
    const tween = gsap.fromTo(
      panelRef.current,
      { opacity: 0, y: 12, scale: 0.94 },
      { opacity: 1, y: 0, scale: 1, duration: 0.42, ease: 'back.out(1.7)' }
    );
    return () => {
      tween.kill();
    };
  }, [isBioOpen]);

  const healthBarWidth = Math.max(25, Math.min(100, s.boneMusclePct));
  const oxygenBarWidth = Math.max(25, Math.min(100, s.hydrationPct));

  const suitCalibrated =
    campaign.l3EvaSuitAssembled ||
    campaign.l1EquipmentPacked.length > 0 ||
    campaign.completedMiniGames.includes('l1_equipment_prep');
  const radiationShielded = campaign.completedMiniGames.includes('l3_solar_storm');

  if (inlineSlim) {
    return (
      <div className="pointer-events-auto relative flex items-center" dir={isAr ? 'rtl' : 'ltr'}>
        <div
          data-testid="mission-inventory-bar"
          className="h-8 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-950/75 border border-cyan-400/50 backdrop-blur-md shadow-md text-[10px] sm:text-xs font-hud font-black whitespace-nowrap"
        >
          {/* Compact Energy Bar */}
          <div
            data-testid="hud-energy-bar"
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-rose-950/60 border border-rose-400/55"
            title={tr(language, 'Energy', 'الطاقة')}
          >
            <span className="text-[11px] leading-none">❤️</span>
            <div className="w-9 sm:w-14 h-2 rounded-full bg-slate-900 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-rose-500 via-pink-400 to-amber-300 transition-all duration-500"
                style={{ width: `${healthBarWidth}%` }}
              />
            </div>
          </div>

          {/* Compact Oxygen & Water Meter */}
          <div
            data-testid="hud-oxygen-bar"
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-sky-950/65 border border-cyan-400/55"
            title={tr(language, 'O2 & Water', 'الأكسجين')}
          >
            <span className="text-[11px] leading-none">🫧</span>
            <div className="w-9 sm:w-14 h-2 rounded-full bg-slate-900 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-sky-300 to-emerald-300 transition-all duration-500"
                style={{ width: `${oxygenBarWidth}%` }}
              />
            </div>
          </div>

          {/* Compact Rations Count */}
          <span
            title={tr(language, 'Space Rations', 'وجبات الفضاء')}
            className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-950/60 border border-amber-300/60 text-amber-100"
          >
            <span>🍎</span>
            <span>{s.rationsRemaining}</span>
          </span>

          {/* Compact Buddy Toggle */}
          <button
            type="button"
            data-testid="hud-biotwin-toggle"
            onClick={() => {
              soundManager.playClick();
              setIsBioOpen((prev) => !prev);
            }}
            aria-label={tr(language, 'Buddy', 'البطل')}
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border cursor-pointer transition-all ${
              isBioOpen
                ? 'bg-cyan-400 text-slate-950 border-white'
                : 'bg-sky-500/25 hover:bg-sky-500/40 text-cyan-100 border-cyan-300/70'
            }`}
          >
            <span>🧑‍🚀</span>
            <span className="hidden md:inline">{tr(language, 'Buddy', 'البطل')}</span>
          </button>
        </div>

        {isBioOpen && (
          <div
            ref={panelRef}
            data-testid="bio-twin-panel"
            className="fixed top-12 left-3 z-40 w-[320px] max-w-[92vw] shadow-2xl rounded-2xl"
          >
            <div className="relative">
              <AstronautBioTwin
                compact
                language={language}
                rationsCount={Math.max(s.rationsRemaining, campaign.l1SelectedFoodIds.length)}
                hydrationPct={s.hydrationPct}
                boneMusclePct={s.boneMusclePct}
                suitCalibrated={suitCalibrated}
                radiationShielded={radiationShielded}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="pointer-events-auto relative flex flex-col items-center gap-1.5" dir={isAr ? 'rtl' : 'ltr'}>
      <div
        data-testid="mission-inventory-bar"
        className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5 px-2.5 sm:px-3.5 py-1.5 rounded-full bg-slate-950/85 border-2 border-cyan-400/55 backdrop-blur-md shadow-xl text-[10px] sm:text-xs font-hud font-black"
      >
        {/* Heart / Energy Bar */}
        <div
          data-testid="hud-energy-bar"
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-950/60 border border-rose-400/60"
        >
          <span className="text-xs sm:text-sm leading-none">❤️</span>
          <span className="text-rose-100 whitespace-nowrap">
            {tr(language, 'Energy', 'الطاقة')}
          </span>
          <div className="w-16 sm:w-24 h-3 rounded-full bg-slate-900 border border-rose-300/40 overflow-hidden p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-rose-500 via-pink-400 to-amber-300 transition-all duration-500"
              style={{ width: `${healthBarWidth}%` }}
            />
          </div>
        </div>

        {/* Oxygen & Water Bubble Meter */}
        <div
          data-testid="hud-oxygen-bar"
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-sky-950/65 border border-cyan-400/65"
        >
          <span className="text-xs sm:text-sm leading-none">🫧</span>
          <span className="text-cyan-100 whitespace-nowrap">
            {tr(language, 'O2 & Water', 'الأكسجين')}
          </span>
          <div className="relative w-16 sm:w-24 h-3 rounded-full bg-slate-900 border border-cyan-300/45 overflow-hidden p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-sky-300 to-emerald-300 transition-all duration-500 relative overflow-hidden"
              style={{ width: `${oxygenBarWidth}%` }}
            >
              <span className="absolute top-0.5 left-1.5 w-1 h-1 rounded-full bg-white/80 animate-pulse" />
              <span className="absolute top-1 left-5 w-1.5 h-1.5 rounded-full bg-white/70 animate-bounce" />
              <span className="absolute top-0.5 left-10 w-1 h-1 rounded-full bg-white/75 animate-pulse" />
            </div>
          </div>
        </div>

        {/* Friendly Space Snacks Counter */}
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border ${
            s.rationsRemaining > 0
              ? 'border-amber-300/80 bg-amber-950/65 text-amber-100'
              : 'border-slate-600 bg-slate-900/80 text-slate-300'
          }`}
        >
          <span>🍎</span>
          <span>
            {tr(language, 'Rations', 'الوجبات')}: {s.rationsRemaining}
          </span>
          {effects.thrusterFuelBonus > 0 && (
            <span className="text-[10px] text-emerald-300">
              +{effects.thrusterFuelBonus}⚡
            </span>
          )}
        </span>

        {/* Interactive Buddy Hologram Pill */}
        <button
          type="button"
          data-testid="hud-biotwin-toggle"
          onClick={() => {
            soundManager.playClick();
            setIsBioOpen((prev) => !prev);
          }}
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border-2 cursor-pointer transition-all ${
            isBioOpen
              ? 'bg-cyan-400 text-slate-950 border-white shadow-[0_0_12px_rgba(34,211,238,0.6)]'
              : 'bg-sky-500/25 hover:bg-sky-500/40 text-cyan-100 border-cyan-300/80'
          }`}
        >
          <span>🧑‍🚀</span>
          <span>{tr(language, 'Buddy', 'البطل')}</span>
        </button>
      </div>

      {isBioOpen && (
        <div
          ref={panelRef}
          data-testid="bio-twin-panel"
          className="w-[330px] max-w-[92vw] shadow-2xl rounded-2xl"
        >
          <div className="relative">
            <AstronautBioTwin
              compact
              language={language}
              rationsCount={Math.max(s.rationsRemaining, campaign.l1SelectedFoodIds.length)}
              hydrationPct={s.hydrationPct}
              boneMusclePct={s.boneMusclePct}
              suitCalibrated={suitCalibrated}
              radiationShielded={radiationShielded}
            />
            <button
              type="button"
              onClick={() => setIsBioOpen(false)}
              className="absolute top-1.5 end-1.5 w-6 h-6 rounded-full bg-slate-800/90 hover:bg-rose-600 text-slate-200 text-xs font-black flex items-center justify-center cursor-pointer border border-white/20"
              aria-label={tr(language, 'Close Bio-Twin', 'إغلاق التوأم الحيوي')}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
