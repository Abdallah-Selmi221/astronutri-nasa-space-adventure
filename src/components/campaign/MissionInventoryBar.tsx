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
  language
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

  const statusTone = (val: number) =>
    val >= 90
      ? 'border-emerald-400/70 text-emerald-200 bg-emerald-950/65'
      : val >= 75
      ? 'border-amber-300/75 text-amber-200 bg-amber-950/65'
      : 'border-rose-400/80 text-rose-200 bg-rose-950/75';

  const suitCalibrated =
    campaign.l3EvaSuitAssembled ||
    campaign.l1EquipmentPacked.length > 0 ||
    campaign.completedMiniGames.includes('l1_equipment_prep');
  const radiationShielded = campaign.completedMiniGames.includes('l3_solar_storm');

  return (
    <div className="pointer-events-auto relative flex flex-col items-center gap-1.5" dir={isAr ? 'rtl' : 'ltr'}>
      <div
        data-testid="mission-inventory-bar"
        className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 px-2 py-1 rounded-2xl bg-slate-950/78 border border-cyan-400/45 backdrop-blur-md shadow-xl text-[10px] sm:text-[11px] font-hud font-black"
      >
        {/* Rations & Thruster Boost Carry-Over */}
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${
            s.rationsRemaining > 0
              ? 'border-amber-300/70 bg-amber-950/65 text-amber-100'
              : 'border-slate-600 bg-slate-900/80 text-slate-300'
          }`}
        >
          <span>🥘</span>
          <span>
            {tr(language, 'Rations', 'الوجبات')}: {s.rationsRemaining}
          </span>
          {effects.thrusterFuelBonus > 0 && (
            <span className="text-[9px] text-emerald-300">
              +{effects.thrusterFuelBonus}⚡
            </span>
          )}
        </span>

        {/* Suit Modules */}
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-cyan-400/65 bg-cyan-950/65 text-cyan-100">
          <span>🦺</span>
          <span>{tr(language, s.suitStatusEn, s.suitStatusAr)}</span>
        </span>

        {/* Hydration % */}
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${statusTone(s.hydrationPct)}`}>
          <span>💧</span>
          <span>
            {tr(language, 'Hydration', 'الترطيب')} {s.hydrationPct}%
          </span>
        </span>

        {/* Bone & Muscle % */}
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${statusTone(s.boneMusclePct)}`}>
          <span>🦴</span>
          <span>
            {tr(language, 'Bone/Muscle', 'العظام/العضلات')} {s.boneMusclePct}%
          </span>
        </span>

        {/* Interactive Bio-Twin Hologram Pill */}
        <button
          type="button"
          data-testid="hud-biotwin-toggle"
          onClick={() => {
            soundManager.playClick();
            setIsBioOpen((prev) => !prev);
          }}
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border cursor-pointer transition-all ${
            isBioOpen
              ? 'bg-cyan-400 text-slate-950 border-white shadow-[0_0_12px_rgba(34,211,238,0.6)]'
              : 'bg-sky-500/20 hover:bg-sky-500/35 text-cyan-100 border-cyan-300/75'
          }`}
        >
          <span>🧬</span>
          <span>{tr(language, 'Bio-Twin', 'التوأم الحيوي')}</span>
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
