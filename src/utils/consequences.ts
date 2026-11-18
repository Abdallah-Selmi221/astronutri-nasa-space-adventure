import { CampaignProgressState } from '../types/game';

export interface CrossStageEffects {
  cabinFilterHealthPct: number;
  thrusterFuelBonus: number;
  crewAdaptionScore: number;
  nutritionBonusActive: boolean;
  suitCalibrated: boolean;
  packedToolsCount: number;
  lunarSampleMassKg: number;
  hasZeroCrumbProtection: boolean;
}

/**
 * Pure simulation helper computing real cause-and-effect telemetry carried across
 * Stage 1 -> Stage 2 -> Stage 3 -> Stage 4.
 */
export function computeCrossStageEffects(campaign: CampaignProgressState): CrossStageEffects {
  const done = new Set(campaign.completedMiniGames);
  const selectedFoods = campaign.l1SelectedFoodIds || [];
  const hasSinaiHoney = selectedFoods.includes('sinai_honey');
  const packedCount = selectedFoods.length;

  const cabinFilterHealthPct = Math.max(
    40,
    Math.min(100, campaign.cabinFilterHealthPct ?? (done.has('l1_food_prep') ? 100 : 88))
  );

  // Compact high-kcal Egyptian/Sinai food loads grant extra Dodge Thruster boosts in Orbit
  const baseBonus =
    campaign.thrusterFuelBonus ??
    (done.has('l1_food_prep') ? (hasSinaiHoney ? 2 : 1) + (campaign.l1FoodWeightKg <= 16 ? 1 : 0) : 0);

  const l1MedBoost = campaign.l1MedicalCleared || done.has('l1_medical_check') ? 18 : 0;
  const l2MealBoost = done.has('l2_balanced_meal') ? 18 : 0;
  const l2HydrBoost = campaign.l2HydrationPercent >= 90 ? 14 : 0;
  const crewAdaptionScore = Math.min(100, campaign.crewAdaptionScore ?? (50 + l1MedBoost + l2MealBoost + l2HydrBoost));

  const sampleMassMap: Record<string, number> = {
    basalt_rock: 22,
    regolith_dust: 16,
    crater_pebbles: 18
  };
  const collected = campaign.l3CollectedSamples || [];
  const lunarSampleMassKg = collected.reduce((sum, id) => sum + (sampleMassMap[id] ?? 18), 0);

  return {
    cabinFilterHealthPct,
    thrusterFuelBonus: Math.max(0, Math.min(3, baseBonus)),
    crewAdaptionScore,
    nutritionBonusActive: packedCount >= 4 && done.has('l1_food_prep'),
    suitCalibrated:
      done.has('l1_equipment_prep') ||
      Boolean(campaign.spaceFitX?.helmetEnabled && campaign.spaceFitX?.batteryAttached),
    packedToolsCount: (campaign.l3PackedTools || []).length,
    lunarSampleMassKg,
    hasZeroCrumbProtection: cabinFilterHealthPct >= 95
  };
}
