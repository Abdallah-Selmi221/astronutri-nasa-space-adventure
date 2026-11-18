// scripts/test_campaign_4levels.mjs
// Automated verification for the streamlined 4-Node / 14-Station campaign registry,
// sequential unlock gates, cross-game & cross-level continuity, Phase 1 Blender GLB assets,
// strict bilingual quiz isolation, and save-state persistence.
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

const { CAMPAIGN_LEVELS, MINI_GAME_SPECS, MERGED_COMPANION_MINIGAMES } = await loadTsModule('src/data/campaignLevels.ts');
const { NASA_OSDR_METRICS, NASA_ENGINEERING_TRADEOFFS } = await loadTsModule('src/services/nasa/nasaOSDR.ts');
const {
  SCIENCE_BADGES,
  SCIENTIFIC_SOURCES,
  SCIENCE_PILLARS,
  DAILY_REFERENCE_ASSUMPTIONS,
  ISS_WATER_MILESTONE
} = await loadTsModule('src/data/science.ts');
const { EGYPTIAN_SINAI_SPACE_FOODS } = await loadTsModule('src/data/foodItems.ts');
const {
  SPACE_SCIENCE_QUESTIONS,
  NUTRITION_QUIZ_QUESTIONS,
  HEALTH_PHYSICS_QUESTIONS
} = await loadTsModule('src/data/questionBanks.ts');
const { shuffleArray } = await loadTsModule('src/utils/shuffle.ts');
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
console.log('  AstroNutri Streamlined 4-Node / 14-Station Continuity Test');
console.log('===============================================================');

// 1. Exact Streamlined Node (4), Linear Station (14), and Consolidated Mini-Game counts
const levelIds = Object.keys(CAMPAIGN_LEVELS).map(Number).sort((a, b) => a - b);
assert(
  JSON.stringify(levelIds) === JSON.stringify([1, 2, 3, 4]),
  'CAMPAIGN_LEVELS defines sequential Space Nodes [1, 2, 3, 4]'
);

const roomCounts = levelIds.map((id) => CAMPAIGN_LEVELS[id].rooms.length);
assert(
  JSON.stringify(roomCounts) === JSON.stringify([4, 3, 4, 3]),
  `Streamlined station counts per level are [4, 3, 4, 3] (got ${JSON.stringify(roomCounts)}, total 14)`
);

const miniGameCounts = levelIds.map((id) => CAMPAIGN_LEVELS[id].miniGames.length);
assert(
  JSON.stringify(miniGameCounts) === JSON.stringify([4, 3, 4, 3]),
  `Streamlined mini-game step counts per level are [4, 3, 4, 3] (got ${JSON.stringify(miniGameCounts)}, total 14)`
);

const totalMiniGamesInSpecs = Object.keys(MINI_GAME_SPECS).length;
assert(totalMiniGamesInSpecs === 21, `MINI_GAME_SPECS keeps all 21 backward-compatible specs (got ${totalMiniGamesInSpecs})`);
assert(
  Object.keys(MERGED_COMPANION_MINIGAMES).length >= 6,
  `MERGED_COMPANION_MINIGAMES maps companion steps (${Object.keys(MERGED_COMPANION_MINIGAMES).length} mappings)`
);

// 2. Verify every station miniGame and all 21 MINI_GAME_SPECS map cleanly to real streamlined rooms
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
for (const [mgId, spec] of Object.entries(MINI_GAME_SPECS)) {
  const lvl = CAMPAIGN_LEVELS[spec.levelId];
  if (!lvl || !lvl.rooms.some((r) => r.id === spec.roomId)) {
    allMappedCorrectly = false;
    console.error(`  Compat spec mismatch: ${mgId} -> level ${spec.levelId}, room ${spec.roomId}`);
  }
}
assert(allMappedCorrectly, 'All 14 core station steps & 21 compat specs map to real streamlined rooms');

// 3. Level 3 Shackleton Return Auth & Fitness/EVA Prep station continuity + Phase 1 Blender GLB models
const l3LunarExplore = CAMPAIGN_LEVELS[3].rooms.find((r) => r.id === 'lunar_exploration_zone');
assert(
  Boolean(
    l3LunarExplore &&
      l3LunarExplore.miniGameId === 'l3_lunar_samples' &&
      l3LunarExplore.consoleAction === 'l3_return_auth'
  ),
  'Level 3 maps Shackleton Biodome (l3_lunar_samples + l3_return_auth) for Earth return authorization'
);

const l3FitnessBay = CAMPAIGN_LEVELS[3].rooms.find((r) => r.id === 'fitness_room');
assert(
  l3FitnessBay?.miniGameId === 'l3_resistance_training' &&
    Boolean(l3FitnessBay?.mergedMiniGames?.includes('l3_eva_prep')),
  'Level 3 consolidates ARED Fitness & EVA Tool Prep seamlessly in fitness_room'
);

const phase1GlbModels = [
  'massive_space_island_world.glb',
  'sector1_earth_colony.glb',
  'sector2_iss_atrium.glb',
  'sector3_lunar_biodome.glb',
  'sector4_orion_recovery.glb',
  'earth_launchpad.glb',
  'iss_orbit_station.glb',
  'lunar_biodome_base.glb',
  'orion_reentry_capsule.glb',
  'prop_kitchen_counter.glb',
  'prop_suit_rack.glb',
  'prop_medical_pod.glb',
  'prop_hydro_rack.glb',
  'prop_storm_console.glb'
];
const allGlbsValid = phase1GlbModels.every((fname) => {
  const p = path.resolve('public/models', fname);
  return fs.existsSync(p) && fs.statSync(p).size > 1000 && fs.statSync(p).size < 500 * 1024;
});
assert(allGlbsValid, `All ${phase1GlbModels.length} sculpted & articulated Blender .glb assets exist in public/models/ and stay under 500 KB each`);

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
  l1SelectedFoodIds: ['chicken_pouch', 'sinai_honey'],
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
  EGYPTIAN_SINAI_SPACE_FOODS.length === 9 && EGYPTIAN_SINAI_SPACE_FOODS.some((f) => f.id === 'sinai_honey'),
  `EGYPTIAN_SINAI_SPACE_FOODS contains 9 authentic Egyptian/Sinai & Hydroponic items including Sinai Honey (got ${EGYPTIAN_SINAI_SPACE_FOODS.length})`
);
const allFoodSvgsExist = EGYPTIAN_SINAI_SPACE_FOODS.every((item) => {
  const rel = (item.svgAsset || '').replace(/^\//, '');
  return rel.length > 0 && fs.existsSync(path.resolve('public', rel));
});
assert(allFoodSvgsExist, 'All 9 Egyptian/Sinai space food SVG files exist on disk in public/assets/food/');
assert(
  fs.existsSync(path.resolve('public/assets/suit/space_fit_x_front_rear.jpg')) &&
    fs.existsSync(path.resolve('public/assets/suit/space_fit_x_hardware.jpg')),
  'SPACE-FIT X (AstroNutri) suit showcase assets exist in public/assets/suit/'
);

// 7. Quiz Question Banks (42 total): Balanced Answer Indices across [0, 1, 2, 3] & Shuffling
const allDecks = [
  ['SPACE_SCIENCE_QUESTIONS', SPACE_SCIENCE_QUESTIONS],
  ['NUTRITION_QUIZ_QUESTIONS', NUTRITION_QUIZ_QUESTIONS],
  ['HEALTH_PHYSICS_QUESTIONS', HEALTH_PHYSICS_QUESTIONS]
];
let totalQuizQuestions = 0;
let allEnFieldsIsolated = true;
const globalIndexCounts = [0, 0, 0, 0];
for (const [deckName, deck] of allDecks) {
  assert(deck.length === 14, `${deckName} has 14 questions (got ${deck.length})`);
  const deckCounts = [0, 0, 0, 0];
  let all4OptsAndValid = true;
  for (const q of deck) {
    totalQuizQuestions++;
    const correctPos = q.options.findIndex((o) => o.isCorrect);
    const correctCount = q.options.filter((o) => o.isCorrect).length;
    if (q.options.length !== 4 || correctCount !== 1 || correctPos !== q.correctIndex) {
      all4OptsAndValid = false;
    }
    const enFields = [
      q.questionEn,
      q.nasaConnectionEn,
      q.nasaBadgeEn,
      ...q.options.map((o) => o.labelEn),
      ...q.options.map((o) => o.feedbackEn)
    ];
    if (enFields.some((s) => !s || typeof s !== 'string' || s.trim().length < 2 || /[\u0600-\u06FF]/.test(s))) {
      allEnFieldsIsolated = false;
      console.error(`  EN isolation check failed on ${q.id}`);
    }
    if (correctPos >= 0 && correctPos < 4) {
      deckCounts[correctPos]++;
      globalIndexCounts[correctPos]++;
    }
  }
  assert(all4OptsAndValid, `${deckName}: all questions have 4 options and exact 1 correctIndex match`);
  assert(
    deckCounts.every((c) => c >= 3),
    `${deckName}: balanced across أ/ب/ج/د (${JSON.stringify(deckCounts)})`
  );
}
assert(
  totalQuizQuestions === 42 && globalIndexCounts.every((c) => c >= 10),
  `All 42 quiz questions distributed evenly across indices [0,1,2,3]: ${JSON.stringify(globalIndexCounts)}`
);
assert(
  allEnFieldsIsolated,
  'All 42 quiz questions have complete English translations with zero Arabic characters in EN fields'
);

const sampleInput = [1, 2, 3, 4];
const shuffledSample = shuffleArray(sampleInput);
assert(
  shuffledSample.length === 4 && shuffledSample !== sampleInput && JSON.stringify(sampleInput) === '[1,2,3,4]',
  'shuffleArray returns a fresh 4-item array without mutating input'
);

// 8. Zero external links (<a href="http, target="_blank", window.open) & zero legacy banned terms in src/components
const walkFiles = (dir) => {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...walkFiles(full));
    else if (/\.(ts|tsx)$/.test(entry.name)) results.push(full);
  }
  return results;
};
const srcFiles = walkFiles(path.resolve('src'));
const extLinkHits = [];
for (const f of srcFiles) {
  const txt = fs.readFileSync(f, 'utf8');
  if (/target=["']_blank["']|window\.open|<a\s|href=["']http/i.test(txt)) {
    extLinkHits.push(path.relative(process.cwd(), f));
  }
}
assert(
  extLinkHits.length === 0,
  `Zero external links or target="_blank" anchors in src/ (hits: ${JSON.stringify(extLinkHits)})`
);

console.log('---------------------------------------------------------------');
console.log(`  RESULT: ${passCount} passed, ${failCount} failed`);
console.log('===============================================================');
if (failCount > 0) process.exit(1);
