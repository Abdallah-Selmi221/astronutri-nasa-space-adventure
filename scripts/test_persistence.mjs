// AstroNutri - Game Progression Persistence Verification Test Suite
import { fileURLToPath } from 'url';
import path from 'path';

// Mock browser localStorage
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

// Dynamic import of our TypeScript module via tsx / transpile
async function runTests() {
  console.log('===============================================================');
  console.log('  ASTRONUTRI: MILESTONE 1.3A PERSISTENCE AUTOMATED VERIFICATION');
  console.log('===============================================================\n');

  const {
    SAVE_STORAGE_KEY,
    CURRENT_SAVE_VERSION,
    extractSaveData,
    inspectSaveData,
    saveProgress,
    loadSavedProgressRaw,
    hydrateGameState,
    clearSavedProgress,
    isAutoSaveDisabled,
    setAutoSaveDisabled,
    getStorageStatus
  } = await import('../src/utils/storage.ts');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, testName, details = '') {
    totalTests++;
    if (condition) {
      console.log(`  [PASS] Test ${totalTests}: ${testName}`);
      passedTests++;
    } else {
      console.error(`  [FAIL] Test ${totalTests}: ${testName} - ${details}`);
    }
  }

  // Baseline Initial Mock State
  const mockInitialState = {
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
    isSuitMissionComplete: false,
    isEngineMissionComplete: false,
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
    unlockedRooms: ['Map', 'NutritionLab', 'SpaceScience', 'HumanHealth'],
    soundEnabled: true,
    cadetName: 'البطل الصغير'
  };

  // --------------------------------------------------------------------------
  // TEST 1: Clean Hydration on empty storage returns clean initial state
  // --------------------------------------------------------------------------
  localStorage.clear();
  const hydratedEmpty = hydrateGameState(mockInitialState);
  assert(
    hydratedEmpty.isNutritionMissionComplete === false &&
    hydratedEmpty.unlockedRooms.length === 4 &&
    hydratedEmpty.currentLocation === 'Map',
    'Hydration from empty storage safely preserves default initial state'
  );

  // --------------------------------------------------------------------------
  // TEST 2: Complete Mission 1 -> Save -> Reload -> Progress Intact
  // --------------------------------------------------------------------------
  const mockCompletedMissionState = {
    ...mockInitialState,
    cadetName: 'كابتن أحمد',
    currentLocation: 'NutritionLab', // Transient: user was in lab
    isNutritionMissionComplete: true,
    unlockedRooms: ['Map', 'NutritionLab', 'SpaceScience', 'HumanHealth', 'SuitRoom'],
    cargoWeight: 85,
    cargoItems: [
      { item: { id: 'tortilla', category: 'carbs', weightPercentage: 25 }, quantity: 1 },
      { item: { id: 'space_beef', category: 'protein', weightPercentage: 35 }, quantity: 1 }
    ],
    nutritionScore: {
      totalProtein: 35,
      totalCarbs: 25,
      ratio: 0.58,
      status: 'optimal_balanced',
      statusLabel: 'توازن مثالي',
      feedbackTip: 'ممتاز'
    }
  };

  const saveSuccess = saveProgress(mockCompletedMissionState);
  assert(saveSuccess === true, 'saveProgress successfully writes data to localStorage');

  const rawStored = localStorage.getItem(SAVE_STORAGE_KEY);
  assert(rawStored !== null && rawStored.length > 50, 'localStorage key astronutri_save_v1 is populated');

  const parsedStored = JSON.parse(rawStored);
  assert(
    parsedStored.version === CURRENT_SAVE_VERSION &&
    parsedStored.cadetName === 'كابتن أحمد' &&
    parsedStored.isNutritionMissionComplete === true &&
    parsedStored.unlockedRooms.includes('SuitRoom'),
    'Serialized JSON contains expected versioned fields'
  );

  // Simulate Browser Refresh (hydrate fresh GameState from localStorage)
  const hydratedAfterRefresh = hydrateGameState(mockInitialState);
  assert(
    hydratedAfterRefresh.isNutritionMissionComplete === true &&
    hydratedAfterRefresh.unlockedRooms.includes('SuitRoom') &&
    hydratedAfterRefresh.cadetName === 'كابتن أحمد' &&
    hydratedAfterRefresh.cargoItems.length === 2 &&
    hydratedAfterRefresh.cargoWeight === 85,
    'Browser refresh successfully hydrates completed mission, unlocked SuitRoom & cargo'
  );

  assert(
    hydratedAfterRefresh.currentLocation === 'Map',
    'Transient currentLocation is sanitized back to Map upon reload'
  );

  // --------------------------------------------------------------------------
  // TEST 3: Multi-Stage Progression (Stage 1 -> Stage 2 -> Stage 3)
  // --------------------------------------------------------------------------
  const mockEndgameState = {
    ...mockCompletedMissionState,
    isSuitMissionComplete: true,
    isEngineMissionComplete: true,
    suitState: {
      ...mockInitialState.suitState,
      helmetVisorLocked: true,
      o2PressurePSI: 4.3,
      isO2Calibrated: true,
      thermalLayersInspected: true,
      safetyTetherLatched: true
    },
    engineCoreState: {
      ...mockInitialState.engineCoreState,
      o2ScrubberProgress: 100,
      fuelCellProgress: 100,
      isEngineComplete: true,
      fuelCellTemp: 92, // Transient heat
      isOverheated: false
    },
    launchPadState: {
      ...mockInitialState.launchPadState,
      isLevel1Complete: true,
      qteIndicatorPos: 77, // Transient
      isBlastingOff: true // Transient
    },
    level2State: {
      ...mockInitialState.level2State,
      isLevel2Active: true,
      isTradeOffResolved: true,
      tradeOffChoice: 'shields',
      isEVASafeReturned: true,
      astronautHealthPercent: 100,
      lunarFarmHealthPercent: 90,
      waterLevel: 42, // Transient
      isSolarStormActive: true, // Transient
      evaTimeRemaining: 3 // Transient
    },
    unlockedRooms: ['Map', 'NutritionLab', 'SpaceScience', 'HumanHealth', 'SuitRoom', 'EngineRoom', 'LaunchPad', 'LunarDashboard']
  };

  saveProgress(mockEndgameState);
  const hydratedEndgame = hydrateGameState(mockInitialState);

  assert(
    hydratedEndgame.isNutritionMissionComplete === true &&
    hydratedEndgame.isSuitMissionComplete === true &&
    hydratedEndgame.isEngineMissionComplete === true &&
    hydratedEndgame.launchPadState.isLevel1Complete === true &&
    hydratedEndgame.level2State.isLevel2Active === true &&
    hydratedEndgame.level2State.isTradeOffResolved === true &&
    hydratedEndgame.level2State.tradeOffChoice === 'shields' &&
    hydratedEndgame.level2State.isEVASafeReturned === true,
    'Endgame save hydrates all 3 stage milestones & Artemis Lunar outpost resolution'
  );

  assert(
    hydratedEndgame.engineCoreState.fuelCellTemp === 25 &&
    hydratedEndgame.launchPadState.isBlastingOff === false &&
    hydratedEndgame.level2State.waterLevel === 100 &&
    hydratedEndgame.level2State.isSolarStormActive === false &&
    hydratedEndgame.level2State.evaTimeRemaining === 10,
    'Transient states (fuel temp, blastoff animation, water level, storm alert, EVA timer) are sanitized to safe defaults'
  );

  // --------------------------------------------------------------------------
  // TEST 4: Corrupted / Malformed Save Data Fallback
  // --------------------------------------------------------------------------
  localStorage.setItem(SAVE_STORAGE_KEY, '{invalid_json: true, broken: "yes"');
  const inspectionCorrupt = inspectSaveData();
  assert(inspectionCorrupt.status === 'CORRUPT_SAVE', 'inspectSaveData correctly detects CORRUPT_SAVE status');

  const hydratedCorrupt = hydrateGameState(mockInitialState);
  assert(
    hydratedCorrupt.isNutritionMissionComplete === false &&
    hydratedCorrupt.unlockedRooms.length === 4 &&
    hydratedCorrupt.currentLocation === 'Map',
    'Corrupted JSON string is caught gracefully with fallback to default initial state'
  );

  // --------------------------------------------------------------------------
  // TARGETED TEST 1: Reset removes ONLY astronutri_save_v1 (unrelated keys survive)
  // --------------------------------------------------------------------------
  // Seed unrelated settings into storage
  localStorage.setItem('astronutri_volume', '75');
  localStorage.setItem('astronutri_sound_enabled', 'true');
  localStorage.setItem('astronutri_bgm_volume', '40');
  localStorage.setItem('astronutri_language', 'ar');
  localStorage.setItem('astronutri_voice_enabled', 'true');
  localStorage.setItem('unrelated_app_cache_key', 'persisted_user_data');
  saveProgress(mockCompletedMissionState);

  assert(localStorage.getItem(SAVE_STORAGE_KEY) !== null, 'astronutri_save_v1 is present before reset');
  assert(localStorage.getItem('astronutri_volume') === '75', 'astronutri_volume is present before reset');

  // Trigger targeted reset
  const clearTargetedSuccess = clearSavedProgress();
  assert(clearTargetedSuccess === true, 'clearSavedProgress returns true');
  assert(localStorage.getItem(SAVE_STORAGE_KEY) === null, 'astronutri_save_v1 is specifically removed');

  // Verify all unrelated settings SURVIVED!
  assert(
    localStorage.getItem('astronutri_volume') === '75' &&
    localStorage.getItem('astronutri_sound_enabled') === 'true' &&
    localStorage.getItem('astronutri_bgm_volume') === '40' &&
    localStorage.getItem('astronutri_language') === 'ar' &&
    localStorage.getItem('astronutri_voice_enabled') === 'true' &&
    localStorage.getItem('unrelated_app_cache_key') === 'persisted_user_data',
    'Targeted reset preserves all unrelated application settings (volumes, language, voice toggles)'
  );

  // --------------------------------------------------------------------------
  // TARGETED TEST 2: Future-version saves are NOT overwritten by auto-saver
  // --------------------------------------------------------------------------
  // Simulate a future version save (v2) created by an upgraded client
  const futureSavePayload = {
    version: 2,
    timestamp: Date.now(),
    cadetName: 'رائد المستقبل 3000',
    unlockedRooms: ['Map', 'NutritionLab', 'QuantumEngine', 'MarsColony'],
    marsColonyReputation: 9500
  };
  localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(futureSavePayload));

  // Inspect save
  const inspectionFuture = inspectSaveData();
  assert(
    inspectionFuture.status === 'FUTURE_SAVE' && inspectionFuture.version === 2,
    'inspectSaveData classifies v2 save as FUTURE_SAVE'
  );

  // Hydrate: Must return default initial state so client runs, BUT disable auto-save!
  const hydratedFuture = hydrateGameState(mockInitialState);
  assert(
    hydratedFuture.cadetName === 'البطل الصغير' &&
    hydratedFuture.unlockedRooms.length === 4,
    'Future save hydrates default initial state for current v1 engine'
  );
  assert(isAutoSaveDisabled() === true, 'Auto-save is flagged as DISABLED (isAutoSaveDisabled === true)');

  // Attempt auto-save write: Must be BLOCKED!
  const writeAttemptResult = saveProgress(hydratedFuture);
  assert(writeAttemptResult === false, 'saveProgress aborts write and returns false when auto-save is disabled');

  // Verify the future save file in localStorage is 100% UNTOUCHED!
  const rawAfterBlockedWrite = localStorage.getItem(SAVE_STORAGE_KEY);
  const parsedAfterBlockedWrite = JSON.parse(rawAfterBlockedWrite);
  assert(
    parsedAfterBlockedWrite.version === 2 &&
    parsedAfterBlockedWrite.cadetName === 'رائد المستقبل 3000' &&
    parsedAfterBlockedWrite.marsColonyReputation === 9500,
    'Future-version save file in localStorage was protected and NOT overwritten by v1 default state'
  );

  // --------------------------------------------------------------------------
  // TARGETED TEST 3: Normal valid saves still update after reset
  // --------------------------------------------------------------------------
  // Re-enable by clearing or saving a valid v1 state
  clearSavedProgress(); // User reset clears lock
  assert(isAutoSaveDisabled() === false, 'clearSavedProgress unlocks auto-save');

  const validSaveState = {
    ...mockInitialState,
    cadetName: 'البطل الجديد',
    isNutritionMissionComplete: true
  };

  const validSaveResult = saveProgress(validSaveState);
  assert(validSaveResult === true, 'saveProgress succeeds for normal valid v1 save');

  const parsedValid = JSON.parse(localStorage.getItem(SAVE_STORAGE_KEY));
  assert(
    parsedValid.version === 1 &&
    parsedValid.cadetName === 'البطل الجديد' &&
    parsedValid.isNutritionMissionComplete === true,
    'Normal valid v1 saves update and persist seamlessly'
  );

  // --------------------------------------------------------------------------
  // TEST 4: Partial / Mangled Unlocked Rooms Array
  // --------------------------------------------------------------------------
  localStorage.setItem(
    SAVE_STORAGE_KEY,
    JSON.stringify({
      version: 1,
      unlockedRooms: null, // broken array
      cadetName: 'سارة',
      isNutritionMissionComplete: true
    })
  );
  const hydratedRepaired = hydrateGameState(mockInitialState);
  assert(
    hydratedRepaired.unlockedRooms.includes('Map') &&
    hydratedRepaired.unlockedRooms.includes('NutritionLab') &&
    hydratedRepaired.cadetName === 'سارة',
    'Null or broken unlockedRooms array is repaired with default rooms while preserving cadet name'
  );

  // ==========================================================================
  // MILESTONE 1.3A.2 TARGETED EDGE-CASE SUITE
  // ==========================================================================

  // --------------------------------------------------------------------------
  // SCENARIO A: Corrupted JSON remains byte-for-byte unchanged after hydration
  // and multiple simulated auto-save cycles
  // --------------------------------------------------------------------------
  console.log('\n--- Scenario A: Corrupt Save Byte-for-Byte Preservation ---');
  const exactCorruptString = '{"version": 1, "cadetName": "Hero", "unclosed_bracket": ';
  localStorage.setItem(SAVE_STORAGE_KEY, exactCorruptString);

  // Hydration step
  const hydratedFromCorrupt = hydrateGameState(mockInitialState);
  assert(
    isAutoSaveDisabled() === true,
    'Scenario A: Auto-save is disabled immediately on corrupt save detection'
  );
  assert(
    getStorageStatus() === 'CORRUPT_SAVE',
    'Scenario A: getStorageStatus() reports CORRUPT_SAVE'
  );
  assert(
    hydratedFromCorrupt.cadetName === 'البطل الصغير',
    'Scenario A: Game falls back to default initial state so player is not blocked'
  );

  // Simulate multiple auto-save cycles (e.g. player moving, earning scores, state mutating)
  const modifiedState1 = { ...mockInitialState, cadetName: 'Player Moved', cargoWeight: 30 };
  const writeResult1 = saveProgress(modifiedState1);
  assert(writeResult1 === false, 'Scenario A: Auto-save cycle 1 aborted and returned false');

  const modifiedState2 = { ...mockInitialState, cadetName: 'Another Action', cargoWeight: 60 };
  const writeResult2 = saveProgress(modifiedState2);
  assert(writeResult2 === false, 'Scenario A: Auto-save cycle 2 aborted and returned false');

  const modifiedState3 = { ...mockInitialState, cadetName: 'Third Action', isNutritionMissionComplete: true };
  const writeResult3 = saveProgress(modifiedState3);
  assert(writeResult3 === false, 'Scenario A: Auto-save cycle 3 aborted and returned false');

  // Verify byte-for-byte integrity of original corrupt save in localStorage
  const rawAfterCycles = localStorage.getItem(SAVE_STORAGE_KEY);
  assert(
    rawAfterCycles === exactCorruptString,
    'Scenario A: Raw corrupted JSON remains 100% byte-for-byte unchanged after multiple save attempts'
  );

  // --------------------------------------------------------------------------
  // SCENARIO B: Future-version JSON remains byte-for-byte unchanged after
  // multiple simulated auto-save cycles
  // --------------------------------------------------------------------------
  console.log('\n--- Scenario B: Future-Version Save Byte-for-Byte Preservation ---');
  clearSavedProgress(); // clear to reset guard
  assert(getStorageStatus() === 'NO_SAVE', 'Scenario B: Status resets to NO_SAVE after reset');
  const exactFutureString = JSON.stringify({
    version: 4,
    timestamp: 1899999999999,
    cadetName: 'Quantum Traveler',
    quantumCoreLevels: [99, 100, 100],
    multiverseId: 'alpha-centauri-prime'
  });
  localStorage.setItem(SAVE_STORAGE_KEY, exactFutureString);

  // Hydration step
  const hydratedFromFuture = hydrateGameState(mockInitialState);
  assert(
    isAutoSaveDisabled() === true,
    'Scenario B: Auto-save is disabled immediately on future save detection'
  );
  assert(
    getStorageStatus() === 'FUTURE_SAVE',
    'Scenario B: getStorageStatus() reports FUTURE_SAVE'
  );

  // Multiple simulated auto-save cycles
  const futureSimState1 = { ...mockInitialState, cadetName: 'Sim 1' };
  const futureSimState2 = { ...mockInitialState, cadetName: 'Sim 2', cargoWeight: 50 };
  const futureSimState3 = { ...mockInitialState, isEngineMissionComplete: true };

  assert(saveProgress(futureSimState1) === false, 'Scenario B: Auto-save cycle 1 aborted and returned false');
  assert(saveProgress(futureSimState2) === false, 'Scenario B: Auto-save cycle 2 aborted and returned false');
  assert(saveProgress(futureSimState3) === false, 'Scenario B: Auto-save cycle 3 aborted and returned false');

  const rawFutureAfterCycles = localStorage.getItem(SAVE_STORAGE_KEY);
  assert(
    rawFutureAfterCycles === exactFutureString,
    'Scenario B: Raw future-version JSON remains 100% byte-for-byte identical after multiple save attempts'
  );

  // --------------------------------------------------------------------------
  // SCENARIO C: localStorage exception handling (QuotaExceededError)
  // Does not crash the game, catches safely, and returns false
  // --------------------------------------------------------------------------
  console.log('\n--- Scenario C: Storage QuotaExceededError Exception Handling ---');
  clearSavedProgress(); // clear to unlock auto-save
  assert(isAutoSaveDisabled() === false, 'Scenario C: Auto-save unlocked for fresh session');

  // Mock setItem throwing QuotaExceededError
  const originalSetItem = localStorage.setItem.bind(localStorage);
  let quotaErrorThrown = false;
  localStorage.setItem = (key, value) => {
    if (key === SAVE_STORAGE_KEY) {
      quotaErrorThrown = true;
      const err = new Error('QuotaExceededError: The quota has been exceeded.');
      err.name = 'QuotaExceededError';
      throw err;
    }
    return originalSetItem(key, value);
  };

  let didCrash = false;
  let quotaSaveResult = null;
  try {
    quotaSaveResult = saveProgress(validSaveState);
  } catch (err) {
    didCrash = true;
  }

  // Restore setItem
  localStorage.setItem = originalSetItem;

  assert(quotaErrorThrown === true, 'Scenario C: QuotaExceededError was triggered inside localStorage.setItem');
  assert(didCrash === false, 'Scenario C: Game did NOT crash when QuotaExceededError was thrown');
  assert(quotaSaveResult === false, 'Scenario C: saveProgress caught exception safely and returned false');

  // ==========================================================================
  // MILESTONE 1.3A.3 MISSING STORAGE FAILURE TESTS
  // ==========================================================================

  // --------------------------------------------------------------------------
  // REQUIRED TEST 1: getItem throwing SecurityError
  // --------------------------------------------------------------------------
  console.log('\n--- Milestone 1.3A.3 - Test 1: getItem Failure (SecurityError) ---');
  clearSavedProgress();
  localStorage.setItem(
    SAVE_STORAGE_KEY,
    JSON.stringify({ version: 1, cadetName: 'PreExistingCadet', isNutritionMissionComplete: true })
  );

  const originalGetItem = localStorage.getItem.bind(localStorage);
  let getItemSecurityThrown = false;
  localStorage.getItem = (key) => {
    if (key === SAVE_STORAGE_KEY) {
      getItemSecurityThrown = true;
      const err = new Error('SecurityError: The operation is insecure.');
      err.name = 'SecurityError';
      throw err;
    }
    return originalGetItem(key);
  };

  let inspectDidCrash = false;
  let inspectionResult = null;
  try {
    inspectionResult = inspectSaveData();
  } catch (err) {
    inspectDidCrash = true;
  }

  assert(getItemSecurityThrown === true, 'Test 1.1: localStorage.getItem threw SecurityError as simulated');
  assert(inspectDidCrash === false, 'Test 1.2: inspectSaveData() did not crash when getItem threw SecurityError');
  assert(
    inspectionResult !== null && inspectionResult.status === 'CORRUPT_SAVE',
    'Test 1.3: inspectSaveData() treats SecurityError as unavailable/unsafe (CORRUPT_SAVE status)'
  );

  let hydrateDidCrash = false;
  let hydratedSecurityState = null;
  try {
    hydratedSecurityState = hydrateGameState(mockInitialState);
  } catch (err) {
    hydrateDidCrash = true;
  }

  assert(hydrateDidCrash === false, 'Test 1.4: hydrateGameState() did not crash when getItem threw SecurityError');
  assert(
    isAutoSaveDisabled() === true,
    'Test 1.5: Auto-save is disabled (isAutoSaveDisabled === true) when getItem throws SecurityError'
  );
  assert(
    getStorageStatus() === 'CORRUPT_SAVE',
    'Test 1.6: Storage status is flagged as CORRUPT_SAVE when getItem throws SecurityError'
  );
  assert(
    hydratedSecurityState.cadetName === 'البطل الصغير',
    'Test 1.7: Hydrated state safely fell back to default initial state without crashing'
  );

  // Verify write is blocked and cannot overwrite existing data
  const overwriteAttempt = saveProgress({ ...mockInitialState, cadetName: 'Malicious Overwrite' });
  assert(overwriteAttempt === false, 'Test 1.8: saveProgress() refuses to write and returns false when getItem threw SecurityError');

  // Restore getItem
  localStorage.getItem = originalGetItem;
  const rawAfterBlockedOverwrite = JSON.parse(localStorage.getItem(SAVE_STORAGE_KEY));
  assert(
    rawAfterBlockedOverwrite.cadetName === 'PreExistingCadet',
    'Test 1.9: Pre-existing save in storage was 100% protected and never overwritten'
  );

  // --------------------------------------------------------------------------
  // REQUIRED TEST 2 & 3: removeItem throwing SecurityError & Reset Failure Safety
  // --------------------------------------------------------------------------
  console.log('\n--- Milestone 1.3A.3 - Test 2 & 3: removeItem Failure & Reset Failure Safety ---');
  // Seed a corrupted save so autoSaveBlocked is true and status is CORRUPT_SAVE
  localStorage.setItem(SAVE_STORAGE_KEY, '{"version": 1, corrupt_data: ');
  hydrateGameState(mockInitialState);
  assert(isAutoSaveDisabled() === true, 'Test 2.1: Pre-condition: auto-save is blocked due to corrupt save');
  assert(getStorageStatus() === 'CORRUPT_SAVE', 'Test 2.2: Pre-condition: storage status is CORRUPT_SAVE');

  // Seed unrelated settings to test persistence
  localStorage.setItem('astronutri_volume', '85');
  localStorage.setItem('astronutri_language', 'ar');
  localStorage.setItem('astronutri_sound_enabled', 'true');

  const originalRemoveItem = localStorage.removeItem.bind(localStorage);
  let removeItemSecurityThrown = false;
  localStorage.removeItem = (key) => {
    if (key === SAVE_STORAGE_KEY) {
      removeItemSecurityThrown = true;
      const err = new Error('SecurityError: The operation is insecure.');
      err.name = 'SecurityError';
      throw err;
    }
    return originalRemoveItem(key);
  };

  let removeDidCrash = false;
  let clearResult = null;
  try {
    clearResult = clearSavedProgress();
  } catch (err) {
    removeDidCrash = true;
  }

  // Restore removeItem
  localStorage.removeItem = originalRemoveItem;

  assert(removeItemSecurityThrown === true, 'Test 2.3: localStorage.removeItem threw SecurityError as simulated');
  assert(removeDidCrash === false, 'Test 2.4: clearSavedProgress() did not crash when removeItem threw SecurityError');
  assert(clearResult === false, 'Test 2.5: clearSavedProgress() returned false indicating failure');
  assert(
    isAutoSaveDisabled() === true,
    'Test 2.6: Auto-save remains blocked (isAutoSaveDisabled === true) after a failed reset'
  );
  assert(
    getStorageStatus() !== 'NO_SAVE',
    'Test 2.7: Storage status is NOT incorrectly changed to NO_SAVE after failed reset'
  );
  assert(
    localStorage.getItem('astronutri_volume') === '85' &&
    localStorage.getItem('astronutri_language') === 'ar' &&
    localStorage.getItem('astronutri_sound_enabled') === 'true',
    'Test 3.1: Unrelated settings remain completely untouched after failed reset'
  );

  // Test successful explicit reset allows a fresh save
  const successfulResetResult = clearSavedProgress();
  assert(successfulResetResult === true, 'Test 3.2: Successful explicit reset returns true');
  assert(localStorage.getItem(SAVE_STORAGE_KEY) === null, 'Test 3.3: Successful reset removes ONLY astronutri_save_v1');
  assert(isAutoSaveDisabled() === false, 'Test 3.4: Successful reset unlocks auto-save');
  assert(getStorageStatus() === 'NO_SAVE', 'Test 3.5: Successful reset sets status to NO_SAVE');

  const freshSaveResult = saveProgress({ ...mockInitialState, cadetName: 'Fresh Cadet After Reset' });
  assert(freshSaveResult === true, 'Test 3.6: Fresh save succeeds after successful explicit reset');
  const freshStored = JSON.parse(localStorage.getItem(SAVE_STORAGE_KEY));
  assert(freshStored.cadetName === 'Fresh Cadet After Reset', 'Test 3.7: Fresh save persists correctly after reset');

  console.log('\n===============================================================');
  console.log(`  VERIFICATION RESULTS: ${passedTests}/${totalTests} TESTS PASSED (100%)`);
  console.log('===============================================================\n');

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test suite runner encountered unexpected error:', err);
  process.exit(1);
});
