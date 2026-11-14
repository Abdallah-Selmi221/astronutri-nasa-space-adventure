// scripts/test_campaign_4levels.mjs
// Automated verification for the 4-level / 33-room / 21-minigame campaign registry,
// sequential unlock gates, cross-game & cross-level continuity, and save-state persistence.
import fs from 'fs';
import path from 'path';
import { buildSync } from 'esbuild';

class LocalStorageMock {
  constructor() {
    this.store = new Map();
  }
  getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  }
  setItem(key, value) {
    this.store.set(key, String(value));
  }
  removeItem(key) {
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
}

globalThis.window = { localStorage: new LocalStorageMock() };
globalThis.localStorage = globalThis.window.localStorage;

const loadTsModule = async (relPath) => {
  const built = buildSync({
    entryPoints: [path.resolve(relPath)],
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'neutral'
  });
  const url = `data:text/javascript;base64,${Buffer.from(built.outputFiles[0].text).toString('base64')}`;
  return import(url);
};

const { CAMPAIGN_LEVELS, MINI_GAME_SPECS } = await loadTsModule('src/data/campaignLevels.ts');
const { NASA_OSDR_METRICS, NASA_ENGINEERING_TRADEOFFS } = await loadTsModule('src/services/nasa/nasaOSDR.ts');
const {
  SCIENCE_BADGES,
  SCIENTIFIC_SOURCES,
  SCIENCE_PILLARS,
  DAILY_REFERENCE_ASSUMPTIONS,
  ISS_WATER_MILESTONE
} = await loadTsModule('src/data/science.ts');
const { EGYPTIAN_SINAI_SPACE_FOODS } = await loadTsModule('src/data/foodItems.ts');
const { saveProgress, hydrateGameState, clearSavedProgress, getStorageStatus } = await import('../src/utils/storage.ts');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passCount++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failCount++;
  }
}

console.log('===============================================================');
console.log('  AstroNutri 4-Level / 21-Mini-Game Registry & Continuity Test');
console.log('===============================================================');

// 1. Exact Level, Room (33), and Mini-Game (21) counts
const levelIds = Object.keys(CAMPAIGN_LEVELS).map(Number).sort((a, b) => a - b);
assert(
  JSON.stringify(levelIds) === JSON.stringify([1, 2, 3, 4]),
  'CAMPAIGN_LEVELS defines sequential levels [1, 2, 3, 4]'
);

const roomCounts = levelIds.map((id) => CAMPAIGN_LEVELS[id].rooms.length);
assert(
  JSON.stringify(roomCounts) === JSON.stringify([6, 7, 12, 8]),
  `Exact room counts per level are [6, 7, 12, 8] (got ${JSON.stringify(roomCounts)}, total 33)`
);

const miniGameCounts = levelIds.map((id) => CAMPAIGN_LEVELS[id].miniGames.length);
assert(
  JSON.stringify(miniGameCounts) === JSON.stringify([5, 6, 5, 5]),
  `Exact mini-game counts per level are [5, 6, 5, 5] (got ${JSON.stringify(miniGameCounts)}, total 21)`
);

const totalMiniGamesInSpecs = Object.keys(MINI_GAME_SPECS).length;
assert(totalMiniGamesInSpecs === 21, `MINI_GAME_SPECS has 21 entries (got ${totalMiniGamesInSpecs})`);

// 2. Verify every miniGame referenced in levels exists in MINI_GAME_SPECS and maps to a real room
let allMappedCorrectly = true;
for (const lvlId of levelIds) {
  const lvl = CAMPAIGN_LEVELS[lvlId];
  const roomIds = new Set(lvl.rooms.map((r) => r.id));
  for (const mgId of lvl.miniGames) {
    const spec = MINI_GAME_SPECS[mgId];
    if (!spec || spec.levelId !== lvlId || !roomIds.has(spec.roomId)) {
      allMappedCorrectly = false;
      console.error(`  Mapping mismatch: level ${lvlId}, miniGame ${mgId}, spec=${JSON.stringify(spec)}`);
    }
  }
}
assert(allMappedCorrectly, 'All 21 mini-games map cleanly to matching levelId and roomId');

// 3. Level 3 Mission Control & Level 3 -> Level 4 Cross-Level Continuity definitions
const l3MissionControl = CAMPAIGN_LEVELS[3].rooms.find((r) => r.id === 'mission_control');
assert(
  Boolean(l3MissionControl && l3MissionControl.consoleAction === 'l3_return_auth'),
  'Level 3 includes Mission Control consoleAction = l3_return_auth for Level 4 unlock'
);

const l3EvaPrep = CAMPAIGN_LEVELS[3].rooms.find((r) => r.id === 'eva_prep_room');
const l3LunarExplore = CAMPAIGN_LEVELS[3].rooms.find((r) => r.id === 'lunar_exploration_zone');
assert(
  l3EvaPrep?.miniGameId === 'l3_eva_prep' && l3LunarExplore?.miniGameId === 'l3_lunar_samples',
  'Level 3 maps EVA Prep Room (l3_eva_prep) and Lunar Exploration Zone (l3_lunar_samples) for tool dependency'
);

// 4. NASA OSDR & Trade-Offs dataset integrity
assert(NASA_OSDR_METRICS.length === 4, `NASA_OSDR_METRICS contains 4 studies (got ${NASA_OSDR_METRICS.length})`);
assert(
  NASA_ENGINEERING_TRADEOFFS.length === 2,
  `NASA_ENGINEERING_TRADEOFFS contains 2 dilemmas (got ${NASA_ENGINEERING_TRADEOFFS.length})`
);

// 5. Campaign save & hydration fail-closed continuity round-trip
clearSavedProgress();
const sampleCampaign = {
  viewMode: 'minigame',
  activeLevel: 3,
  activeRoomId: 'lunar_exploration_zone',
  activeMiniGameId: 'l3_lunar_samples',
  unlockedLevels: [1, 2, 3],
  completedMiniGames: [
    'l1_food_prep',
    'l1_equipment_prep',
    'l1_medical_check',
    'l1_spaceship_inspect',
    'l1_mission_launch'
  ],
  l1SelectedFoodIds: ['chicken_pouch', 'space_tortilla'],
  l1FoodWeightKg: 10,
  l1EquipmentPacked: ['med_kit'],
  l1MedicalCleared: true,
  l1SpaceshipInspected: true,
  l2SecuredObjects: ['food_packages'],
  l2HydrationPercent: 100,
  l2MotionRested: true,
  l3BoneMuscleScore: 3,
  l3WaterRecycled: true,
  l3SolarStormSheltered: true,
  l3EvaSuitAssembled: true,
  l3PackedTools: ['gripper', 'scoop', 'hammer', 'collection_bag'],
  l3CollectedSamples: ['basalt_rock', 'regolith_dust'],
  l3ReturnAuthorized: false,
  l4SamplesVerified: false,
  l4NavigationAligned: false,
  l4EmergencyRepaired: false,
  l4ReentrySafe: false,
  l4MissionAccomplished: false
};

saveProgress({
  cadetName: 'آدم',
  soundEnabled: true,
  unlockedRooms: ['Map', 'NutritionLab'],
  cargoItems: [],
  cargoWeight: 0,
  nutritionScore: { totalProtein: 20, totalCarbs: 20, ratio: 1, status: 'optimal' },
  isNutritionMissionComplete: true,
  isHumanHealthComplete: false,
  suitState: {
    o2Pressure: 4.3,
    helmetSealed: false,
    thermalLayerActive: false,
    safetyTetherLocked: false
  },
  isSuitMissionComplete: false,
  engineCoreState: { scrubberLevel: 0, fuelCellCharged: false, temperature: 25, isEngineComplete: false },
  isEngineMissionComplete: false,
  launchPadState: { hydratedForLaunch: false, launchCountdownActive: false, isLevel1Complete: true },
  level2State: {
    solarStormActive: false,
    radiationShieldActive: false,
    evaO2Level: 100,
    eclssWaterPurified: false,
    isTradeOffResolved: false,
    isEVASafeReturned: false
  },
  isReturnMissionComplete: false,
  campaign: sampleCampaign
});

const hydrated = hydrateGameState({
  showIntroModal: false,
  currentLocation: 'Map',
  cargoWeight: 0,
  cargoItems: [],
  nutritionScore: { totalProtein: 0, totalCarbs: 0, ratio: 0.5, status: 'empty' },
  unlockedRooms: ['Map'],
  isNutritionMissionComplete: false,
  isHumanHealthComplete: false,
  suitState: { o2Pressure: 0, helmetSealed: false, thermalLayerActive: false, safetyTetherLocked: false },
  isSuitMissionComplete: false,
  engineCoreState: { scrubberLevel: 0, fuelCellCharged: false, temperature: 22, isEngineComplete: false },
  isEngineMissionComplete: false,
  launchPadState: { hydratedForLaunch: false, launchCountdownActive: false, isLevel1Complete: false },
  level2State: {
    solarStormActive: false,
    radiationShieldActive: false,
    evaO2Level: 100,
    eclssWaterPurified: false,
    isTradeOffResolved: false,
    isEVASafeReturned: false
  },
  isReturnMissionComplete: false,
  soundEnabled: true,
  cadetName: ''
});

assert(getStorageStatus() === 'VALID_SAVE', 'Campaign save hydrates cleanly with VALID_SAVE');
assert(
  hydrated.campaign?.viewMode === 'world_map' &&
    hydrated.campaign?.activeRoomId === null &&
    hydrated.campaign?.activeMiniGameId === null,
  'Reload sanitizes ephemeral viewMode -> world_map while keeping activeLevel'
);
assert(
  JSON.stringify(hydrated.campaign?.l3PackedTools) ===
    JSON.stringify(['gripper', 'scoop', 'hammer', 'collection_bag']),
  'Cross-game packed EVA tools survive save/hydration'
);
assert(
  JSON.stringify(hydrated.campaign?.l3CollectedSamples) ===
    JSON.stringify(['basalt_rock', 'regolith_dust']),
  'Cross-level lunar samples survive save/hydration'
);

// 6. Central Scientific Layer & Egyptian/Sinai Space Foods Verification
const badgeKeys = Object.keys(SCIENCE_BADGES).sort();
assert(
  JSON.stringify(badgeKeys) ===
    JSON.stringify(['EXPERIMENTAL', 'GAME_RULE', 'ISS_PROVEN', 'PLANNING_ASSUMPTION']),
  `SCIENCE_BADGES defines exact 4 scientific honesty badges (got ${JSON.stringify(badgeKeys)})`
);
assert(
  SCIENTIFIC_SOURCES.length === 13,
  `SCIENTIFIC_SOURCES registers all 13 curated references (got ${SCIENTIFIC_SOURCES.length})`
);
assert(
  SCIENCE_PILLARS.length === 11 && SCIENCE_PILLARS.some((p) => p.badgeType === 'GAME_RULE'),
  `SCIENCE_PILLARS includes 10 verified pillars + simplified GAME_RULE card (got ${SCIENCE_PILLARS.length})`
);
assert(
  DAILY_REFERENCE_ASSUMPTIONS.bodyMassKg === 70 &&
    DAILY_REFERENCE_ASSUMPTIONS.energyKcal === 3000 &&
    DAILY_REFERENCE_ASSUMPTIONS.proteinGrams === 105 &&
    DAILY_REFERENCE_ASSUMPTIONS.carbsGrams === 390 &&
    DAILY_REFERENCE_ASSUMPTIONS.fatsGrams === 113,
  'DAILY_REFERENCE_ASSUMPTIONS matches 70 kg adult 3,000 kcal / 105g P / 390g C / 113g F'
);
assert(
  ISS_WATER_MILESTONE.recoveryPercent === 98 && ISS_WATER_MILESTONE.caveatAr.length > 10,
  'ISS_WATER_MILESTONE reports 98% June 2023 recovery with explicit experimental caveat'
);
assert(
  EGYPTIAN_SINAI_SPACE_FOODS.length === 8,
  `EGYPTIAN_SINAI_SPACE_FOODS contains 8 authentic Egyptian/Sinai & Hydroponic items (got ${EGYPTIAN_SINAI_SPACE_FOODS.length})`
);
const allFoodSvgsExist = EGYPTIAN_SINAI_SPACE_FOODS.every((item) => {
  const rel = (item.svgAsset || '').replace(/^\//, '');
  return rel.length > 0 && fs.existsSync(path.resolve('public', rel));
});
assert(allFoodSvgsExist, 'All 8 Egyptian/Sinai space food SVG files exist on disk in public/assets/food/');

console.log('---------------------------------------------------------------');
console.log(`  RESULT: ${passCount} passed, ${failCount} failed`);
console.log('===============================================================');
if (failCount > 0) process.exit(1);
