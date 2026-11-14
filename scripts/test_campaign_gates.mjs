// scripts/test_campaign_gates.mjs
// Automated verification for campaign lock gates, nutrition data requirements,
// save-state flags, NASA snapshot sanitization, and required local media assets.
import fs from 'fs';
import path from 'path';

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

globalThis.window = {
  localStorage: new LocalStorageMock()
};
globalThis.localStorage = globalThis.window.localStorage;

import { buildSync } from 'esbuild';

const builtFoodModule = buildSync({
  entryPoints: [path.resolve('src/data/foodItems.ts')],
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'neutral'
});
const foodModuleUrl = `data:text/javascript;base64,${Buffer.from(builtFoodModule.outputFiles[0].text).toString('base64')}`;
const { FOOD_DATABASE, TARGET_NUTRITION_REQUIREMENTS } = await import(foodModuleUrl);
const {
  saveProgress,
  hydrateGameState,
  clearSavedProgress
} = await import('../src/utils/storage.ts');

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
console.log('  ASTRONUTRI: CAMPAIGN GATES, SANITIZATION & MEDIA AUDIT');
console.log('===============================================================\n');

// 1. Stage 1 Progression Defaults
console.log('--- 1. Progression Gate Defaults & Round-Trip Flags ---');
clearSavedProgress();
const defaultUnlockedRooms = ['Home', 'Map', 'NutritionLab', 'HumanHealth', 'SuitRoom', 'EngineRoom', 'LaunchPad'];
const sampleBaseState = {
  showIntroModal: false,
  currentLocation: 'Map',
  cargoWeight: 0,
  cargoItems: [],
  nutritionScore: {
    totalProtein: 0,
    totalCarbs: 0,
    ratio: 0.5,
    status: 'empty',
    statusLabel: 'حقيبة الفضاء فارغة',
    feedbackTip: 'اسحب أطعمة الفضاء'
  },
  fuelLevel: 0,
  o2Level: 20,
  hasSpicySauce: false,
  isNutritionMissionComplete: false,
  isHumanHealthComplete: false,
  isSuitMissionComplete: false,
  isEngineMissionComplete: false,
  isReturnMissionComplete: false,
  suitState: {
    helmetVisorLocked: false,
    o2PressurePSI: 2.1,
    isO2Calibrated: false,
    thermalLayersInspected: false,
    safetyTetherLatched: false
  },
  engineCoreState: {
    o2ScrubberProgress: 20,
    fuelCellProgress: 0,
    fuelCellTemp: 25,
    isOverheated: false,
    isEngineComplete: false
  },
  launchPadState: {
    qteIndicatorPos: 0,
    qteTargetMin: 42,
    qteTargetMax: 58,
    qteSipSuccess: false,
    isLiquidSpilled: false,
    isBlastingOff: false,
    isLevel1Complete: false
  },
  level2State: {
    isLevel2Active: false,
    waterLevel: 100,
    isProcessorFailed: false,
    isECLSSSuccessModalOpen: false,
    evaTimeRemaining: 10,
    bloodPressureStatus: 'normal',
    isSalineAdministered: false,
    isEVASafeReturned: false,
    isSolarStormActive: false,
    solarStormData: null,
    isStormFetching: false,
    tradeOffChoice: null,
    tradeOffFeedback: null,
    astronautHealthPercent: 100,
    lunarFarmHealthPercent: 100,
    isTradeOffResolved: false,
    isGameVictoryModalOpen: false
  },
  unlockedRooms: [...defaultUnlockedRooms],
  soundEnabled: true,
  cadetName: 'البطل الصغير'
};

const emptyHydrated = hydrateGameState(sampleBaseState);
assert(!emptyHydrated.unlockedRooms.includes('SpaceScience'), 'SpaceScience starts locked by default');
assert(!emptyHydrated.unlockedRooms.includes('LunarDashboard'), 'LunarDashboard starts locked by default');
assert(!emptyHydrated.unlockedRooms.includes('ReturnToEarth'), 'ReturnToEarth starts locked by default');
assert(emptyHydrated.unlockedRooms.includes('NutritionLab'), 'NutritionLab is unlocked at start');
assert(emptyHydrated.isHumanHealthComplete === false, 'isHumanHealthComplete starts false');
assert(emptyHydrated.isReturnMissionComplete === false, 'isReturnMissionComplete starts false');

saveProgress({
  ...sampleBaseState,
  isHumanHealthComplete: true,
  isReturnMissionComplete: true
});
const hydrated = hydrateGameState(sampleBaseState);
assert(hydrated !== null, 'Saved game state hydrates successfully');
assert(hydrated.isHumanHealthComplete === true, 'isHumanHealthComplete persists across save/hydrate');
assert(hydrated.isReturnMissionComplete === true, 'isReturnMissionComplete persists across save/hydrate');

console.log('Target Nutrition Thresholds:', TARGET_NUTRITION_REQUIREMENTS);
console.log('Sample Food Item Keys:', Object.keys(FOOD_DATABASE[0]));

// 2. Real Food Item Balance Envelope Verification
console.log('\n--- 2. Nutrition Database Feasibility ---');
function summarizeFoods(foods) {
  return foods.reduce(
    (acc, item) => {
      const protein = acc.protein + (item.proteinGrams || 0);
      const carbs = acc.carbs + (item.carbsGrams || 0);
      const weight = acc.weight + (item.weightPercentage || 0);
      return {
        protein,
        carbs,
        weight,
        hasTortilla: acc.hasTortilla || item.id === TARGET_NUTRITION_REQUIREMENTS.requiredSpecialItem,
        hasBanned: acc.hasBanned || Boolean(item.isBanned)
      };
    },
    { protein: 0, carbs: 0, weight: 0, hasTortilla: false, hasBanned: false }
  );
}

const allowedFoods = FOOD_DATABASE.filter((f) => !f.isBanned);
const tortilla = allowedFoods.find((f) => f.id === 'space_tortilla');
const proteinRich = allowedFoods.filter((f) => f.proteinGrams >= 15);
const carbOrFiber = allowedFoods.filter((f) => f.id !== 'space_tortilla' && f.carbsGrams >= 10 && f.proteinGrams < 15);
const highCarbNoBalanced = allowedFoods.filter((f) => f.id !== 'space_tortilla' && f.proteinGrams < 12);

const balancedSet = [tortilla, proteinRich[0], proteinRich[1] || proteinRich[0], carbOrFiber[0]].filter(Boolean);
const unbalancedSet = highCarbNoBalanced.slice(0, 4);

const balancedTotals = summarizeFoods(balancedSet);
const balancedRatio = balancedTotals.protein + balancedTotals.carbs > 0
  ? balancedTotals.protein / (balancedTotals.protein + balancedTotals.carbs)
  : 0;

const unbalancedTotals = summarizeFoods(unbalancedSet);
const unbalancedRatio = unbalancedTotals.protein + unbalancedTotals.carbs > 0
  ? unbalancedTotals.protein / (unbalancedTotals.protein + unbalancedTotals.carbs)
  : 0;

assert(
  balancedSet.length === 4 &&
    !balancedTotals.hasBanned &&
    balancedTotals.hasTortilla &&
    balancedTotals.weight >= TARGET_NUTRITION_REQUIREMENTS.minCargoWeight &&
    balancedTotals.weight <= TARGET_NUTRITION_REQUIREMENTS.maxCargoWeight &&
    balancedRatio >= TARGET_NUTRITION_REQUIREMENTS.optimalRatioMin &&
    balancedRatio <= TARGET_NUTRITION_REQUIREMENTS.optimalRatioMax,
  `A 4-item balanced ration satisfies NASA target thresholds (weight=${balancedTotals.weight}%, ratio=${balancedRatio.toFixed(2)})`
);

assert(
  unbalancedSet.length >= 2 &&
    (unbalancedRatio < TARGET_NUTRITION_REQUIREMENTS.optimalRatioMin || !unbalancedTotals.hasTortilla),
  `An unbalanced low-protein / missing-tortilla selection fails balanced criteria (ratio=${unbalancedRatio.toFixed(2)}, hasTortilla=${unbalancedTotals.hasTortilla})`
);

// 3. NASA Snapshot Sanitization
console.log('\n--- 3. NASA Snapshot Sanitization ---');
const snapshotPath = path.resolve('public/data/nasa_snapshots.json');
const snapshotRaw = fs.readFileSync(snapshotPath, 'utf-8');
assert(!snapshotRaw.includes('api_key='), 'public/data/nasa_snapshots.json contains zero api_key= strings');
const snapshotJson = JSON.parse(snapshotRaw);
assert(Boolean(snapshotJson.metadata?.generatedAt || snapshotJson.metadata?.fetchedAt), 'NASA snapshot metadata records timestamp');
assert(Boolean(snapshotJson.apod), 'NASA snapshot includes APOD payload');
assert(Array.isArray(snapshotJson.donki?.cmeEvents), 'NASA snapshot includes DONKI cmeEvents array');
assert(Array.isArray(snapshotJson.donki?.sepEvents), 'NASA snapshot includes DONKI sepEvents array');
assert(Boolean(snapshotJson.neows), 'NASA snapshot includes NeoWs payload');

// 4. Required Media Files & Audio Cues
console.log('\n--- 4. Offline Audio & Video Assets ---');
const requiredAssets = [
  'public/video/intro_video.mp4',
  'public/audio/robo/video_intro_track.mp3',
  'public/audio/robo/pilot/pilot_01_welcome.mp3',
  'public/audio/robo/pilot/pilot_02_handrail.mp3',
  'public/audio/robo/pilot/pilot_03_loose_objects.mp3',
  'public/audio/robo/pilot/pilot_04_eclss_success.mp3',
  'public/audio/robo/pilot/pilot_05_emotional_reflection.mp3',
  'public/audio/robo/sample/sample_success.mp3',
  'public/audio/robo/sample/sample_warning.mp3',
  'public/assets/nasa/apod_sample.jpg'
];

const campaignClips = [
  'island_hop_welcome.mp3',
  'planet_earth.mp3',
  'planet_moon.mp3',
  'planet_mars.mp3',
  'planet_saturn.mp3',
  'planet_jupiter.mp3',
  'asteroid_radar.mp3',
  'nutrition_welcome.mp3',
  'nutrition_tortilla.mp3',
  'nutrition_balance_tip.mp3',
  'health_welcome.mp3',
  'suit_welcome.mp3',
  'engine_welcome.mp3',
  'launch_welcome.mp3',
  'lunar_storm_warning.mp3',
  'return_balance.mp3',
  'return_reentry.mp3',
  'quiz_praise.mp3',
  'quiz_hint.mp3',
  'mission_unlock.mp3'
];
for (const clip of campaignClips) {
  requiredAssets.push(`public/audio/robo/campaign/${clip}`);
}

for (const rel of requiredAssets) {
  const full = path.resolve(rel);
  const exists = fs.existsSync(full) && fs.statSync(full).size > 0;
  assert(exists, `Asset present and non-empty: ${rel}`);
}

// 5. Expanded 42-Question Illustrated Quiz Banks
console.log('\n--- 5. Expanded Quiz Banks Validation ---');
const builtQuizModule = buildSync({
  entryPoints: [path.resolve('src/data/questionBanks.ts')],
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'neutral'
});
const quizModuleUrl = `data:text/javascript;base64,${Buffer.from(builtQuizModule.outputFiles[0].text).toString('base64')}`;
const {
  SPACE_SCIENCE_QUESTIONS,
  NUTRITION_QUIZ_QUESTIONS,
  HEALTH_PHYSICS_QUESTIONS
} = await import(quizModuleUrl);

assert(SPACE_SCIENCE_QUESTIONS.length >= 12, `SPACE_SCIENCE_QUESTIONS has ${SPACE_SCIENCE_QUESTIONS.length} questions (>= 12)`);
assert(NUTRITION_QUIZ_QUESTIONS.length >= 12, `NUTRITION_QUIZ_QUESTIONS has ${NUTRITION_QUIZ_QUESTIONS.length} questions (>= 12)`);
assert(HEALTH_PHYSICS_QUESTIONS.length >= 12, `HEALTH_PHYSICS_QUESTIONS has ${HEALTH_PHYSICS_QUESTIONS.length} questions (>= 12)`);
assert(
  SPACE_SCIENCE_QUESTIONS.length + NUTRITION_QUIZ_QUESTIONS.length + HEALTH_PHYSICS_QUESTIONS.length === 42,
  `Total curated question count across 3 modules === 42`
);

console.log('\n===============================================================');
console.log(`  CAMPAIGN GATES AUDIT: ${passCount}/${passCount + failCount} PASSED`);
console.log('===============================================================');

if (failCount > 0) {
  process.exit(1);
}
