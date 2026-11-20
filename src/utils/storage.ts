import type {
  GameState,
  RoomLocation,
  CargoItemEntry,
  NutritionScore,
  TradeOffChoice,
  CampaignProgressState,
  AppLanguage,
  CadetAgeGroup
} from '../types/game';

export const SAVE_STORAGE_KEY = 'astronutri_save_v1';
export const CURRENT_SAVE_VERSION = 1;

/**
 * Minimalist, Versioned Long-Term Progress Schema.
 * Strictly excludes transient states (active timers, open modals, QTE indicators, animation flags).
 */
export interface AstroNutriSaveDataV1 {
  version: 1;
  timestamp: number;
  cadetName: string;
  language?: AppLanguage;
  ageGroup?: CadetAgeGroup;
  unlockedRooms: RoomLocation[];
  isNutritionMissionComplete: boolean;
  isHumanHealthComplete?: boolean;
  isSuitMissionComplete: boolean;
  isEngineMissionComplete: boolean;
  isLevel1Complete: boolean;
  isLevel2Active: boolean;
  isTradeOffResolved: boolean;
  tradeOffChoice: TradeOffChoice;
  isEVASafeReturned: boolean;
  isReturnMissionComplete?: boolean;
  astronautHealthPercent: number;
  lunarFarmHealthPercent: number;
  cargoItems: CargoItemEntry[];
  cargoWeight: number;
  nutritionScore: NutritionScore;
  hasSpicySauce: boolean;
  suitState: {
    helmetVisorLocked: boolean;
    o2PressurePSI: number;
    isO2Calibrated: boolean;
    thermalLayersInspected: boolean;
    safetyTetherLatched: boolean;
  };
  engineCoreState: {
    o2ScrubberProgress: number;
    fuelCellProgress: number;
    isEngineComplete: boolean;
  };
  campaign?: CampaignProgressState;
}

export type SaveInspectionResult =
  | { status: 'NO_SAVE' }
  | { status: 'VALID_SAVE'; data: AstroNutriSaveDataV1 }
  | { status: 'CORRUPT_SAVE'; error: unknown }
  | { status: 'FUTURE_SAVE'; version: number };

const DEFAULT_UNLOCKED_ROOMS: RoomLocation[] = [
  'Map',
  'NutritionLab',
  'SpaceScience',
  'HumanHealth'
];

/**
 * Global safety guard: Set to true if a future-version or corrupted save is detected.
 * Prevents the auto-save mechanism from ever overwriting a corrupted or future save file with blank default data.
 */
let autoSaveBlocked = false;
let currentStorageStatus: SaveInspectionResult['status'] = 'NO_SAVE';

export function isAutoSaveDisabled(): boolean {
  return autoSaveBlocked;
}

export function setAutoSaveDisabled(disabled: boolean): void {
  autoSaveBlocked = disabled;
}

export function getStorageStatus(): SaveInspectionResult['status'] {
  return currentStorageStatus;
}

/**
 * Extracts ONLY long-term persistent gameplay data from GameState.
 */
export function extractSaveData(state: GameState): AstroNutriSaveDataV1 {
  return {
    version: 1,
    timestamp: Date.now(),
    cadetName: state.cadetName || 'Explorer',
    ...(state.language ? { language: state.language } : {}),
    ...(state.ageGroup ? { ageGroup: state.ageGroup } : {}),
    unlockedRooms: Array.from(new Set([...DEFAULT_UNLOCKED_ROOMS, ...state.unlockedRooms])),
    isNutritionMissionComplete: Boolean(state.isNutritionMissionComplete),
    isHumanHealthComplete: Boolean(state.isHumanHealthComplete),
    isSuitMissionComplete: Boolean(state.isSuitMissionComplete),
    isEngineMissionComplete: Boolean(state.isEngineMissionComplete),
    isLevel1Complete: Boolean(state.launchPadState?.isLevel1Complete),
    isLevel2Active: Boolean(state.level2State?.isLevel2Active),
    isTradeOffResolved: Boolean(state.level2State?.isTradeOffResolved),
    tradeOffChoice: state.level2State?.tradeOffChoice ?? null,
    isEVASafeReturned: Boolean(state.level2State?.isEVASafeReturned),
    isReturnMissionComplete: Boolean(state.isReturnMissionComplete),
    astronautHealthPercent: state.level2State?.astronautHealthPercent ?? 100,
    lunarFarmHealthPercent: state.level2State?.lunarFarmHealthPercent ?? 100,
    cargoItems: Array.isArray(state.cargoItems) ? state.cargoItems : [],
    cargoWeight: state.cargoWeight ?? 0,
    nutritionScore: state.nutritionScore,
    hasSpicySauce: Boolean(state.hasSpicySauce),
    suitState: {
      helmetVisorLocked: Boolean(state.suitState?.helmetVisorLocked),
      o2PressurePSI: state.suitState?.o2PressurePSI ?? 2.1,
      isO2Calibrated: Boolean(state.suitState?.isO2Calibrated),
      thermalLayersInspected: Boolean(state.suitState?.thermalLayersInspected),
      safetyTetherLatched: Boolean(state.suitState?.safetyTetherLatched)
    },
    engineCoreState: {
      o2ScrubberProgress: state.engineCoreState?.o2ScrubberProgress ?? 20,
      fuelCellProgress: state.engineCoreState?.fuelCellProgress ?? 0,
      isEngineComplete: Boolean(state.engineCoreState?.isEngineComplete)
    },
    ...(state.campaign ? { campaign: state.campaign } : {})
  };
}

/**
 * Inspects the storage without mutating it.
 * Strictly categorizes save state into NO_SAVE, VALID_SAVE, CORRUPT_SAVE, or FUTURE_SAVE.
 */
export function inspectSaveData(): SaveInspectionResult {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { status: 'NO_SAVE' };
  }

  try {
    const raw = localStorage.getItem(SAVE_STORAGE_KEY);
    if (!raw) return { status: 'NO_SAVE' };

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch (parseErr) {
      return { status: 'CORRUPT_SAVE', error: parseErr };
    }

    if (!parsed || typeof parsed !== 'object') {
      return { status: 'CORRUPT_SAVE', error: new Error('Parsed save data is not an object') };
    }

    // Future version detection (e.g. v2+)
    if (typeof parsed.version === 'number' && parsed.version > CURRENT_SAVE_VERSION) {
      return { status: 'FUTURE_SAVE', version: parsed.version };
    }

    // Invalid or missing version tag
    if (parsed.version !== CURRENT_SAVE_VERSION) {
      return {
        status: 'CORRUPT_SAVE',
        error: new Error(`Unsupported legacy or invalid save version: ${parsed.version}`)
      };
    }

    // Self-healing: Ensure unlockedRooms is a valid array
    if (!Array.isArray(parsed.unlockedRooms)) {
      parsed.unlockedRooms = [...DEFAULT_UNLOCKED_ROOMS];
    }

    return { status: 'VALID_SAVE', data: parsed as AstroNutriSaveDataV1 };
  } catch (error) {
    return { status: 'CORRUPT_SAVE', error };
  }
}

/**
 * Safely persists game progression to localStorage.
 * Blocks write operations if a future save version OR a corrupted save is active to avoid data destruction.
 * Handles storage quota exceptions, private browsing blocks, and SSR environments gracefully.
 */
export function saveProgress(state: GameState): boolean {
  if (autoSaveBlocked) {
    console.warn(
      '[AstroNutri Storage] Save aborted: Auto-save is disabled to protect an existing corrupted or future-version save file.'
    );
    return false;
  }

  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }

  try {
    const saveData = extractSaveData(state);
    const serialized = JSON.stringify(saveData);
    localStorage.setItem(SAVE_STORAGE_KEY, serialized);
    return true;
  } catch (error) {
    console.warn('[AstroNutri Storage] Failed to save game progress (Quota/Security error):', error);
    return false;
  }
}

/**
 * Merges a validated save data payload into default GameState.
 */
function mergeSavedState(initial: GameState, saved: AstroNutriSaveDataV1): GameState {
  const mergedRooms = Array.from(
    new Set([...DEFAULT_UNLOCKED_ROOMS, ...(saved.unlockedRooms || [])])
  );

  return {
    ...initial,
    // Always start safely at the Home World / Map upon reload
    currentLocation: 'Map',
    showIntroModal: false,

    cadetName: saved.cadetName || initial.cadetName,
    ...(saved.language ? { language: saved.language } : {}),
    ...(saved.ageGroup ? { ageGroup: saved.ageGroup } : {}),
    unlockedRooms: mergedRooms,
    isNutritionMissionComplete: Boolean(saved.isNutritionMissionComplete),
    isHumanHealthComplete: Boolean(saved.isHumanHealthComplete),
    isSuitMissionComplete: Boolean(saved.isSuitMissionComplete),
    isEngineMissionComplete: Boolean(saved.isEngineMissionComplete),
    isReturnMissionComplete: Boolean(saved.isReturnMissionComplete),

    cargoItems: saved.cargoItems || initial.cargoItems,
    cargoWeight: typeof saved.cargoWeight === 'number' ? saved.cargoWeight : initial.cargoWeight,
    nutritionScore: saved.nutritionScore || initial.nutritionScore,
    hasSpicySauce: typeof saved.hasSpicySauce === 'boolean' ? saved.hasSpicySauce : initial.hasSpicySauce,

    suitState: {
      ...initial.suitState,
      helmetVisorLocked: saved.suitState?.helmetVisorLocked ?? initial.suitState.helmetVisorLocked,
      o2PressurePSI: saved.suitState?.o2PressurePSI ?? initial.suitState.o2PressurePSI,
      isO2Calibrated: saved.suitState?.isO2Calibrated ?? initial.suitState.isO2Calibrated,
      thermalLayersInspected: saved.suitState?.thermalLayersInspected ?? initial.suitState.thermalLayersInspected,
      safetyTetherLatched: saved.suitState?.safetyTetherLatched ?? initial.suitState.safetyTetherLatched
    },

    engineCoreState: {
      ...initial.engineCoreState,
      o2ScrubberProgress: saved.engineCoreState?.o2ScrubberProgress ?? initial.engineCoreState.o2ScrubberProgress,
      fuelCellProgress: saved.engineCoreState?.fuelCellProgress ?? initial.engineCoreState.fuelCellProgress,
      isEngineComplete: saved.engineCoreState?.isEngineComplete ?? initial.engineCoreState.isEngineComplete,
      // Transient engine properties reset to safe defaults
      fuelCellTemp: 25,
      isOverheated: false
    },

    launchPadState: {
      ...initial.launchPadState,
      isLevel1Complete: saved.isLevel1Complete ?? initial.launchPadState.isLevel1Complete,
      // Transient launch properties reset to safe defaults
      qteIndicatorPos: 0,
      qteSipSuccess: false,
      isLiquidSpilled: false,
      isBlastingOff: false
    },

    level2State: {
      ...initial.level2State,
      isLevel2Active: saved.isLevel2Active ?? initial.level2State.isLevel2Active,
      isTradeOffResolved: saved.isTradeOffResolved ?? initial.level2State.isTradeOffResolved,
      tradeOffChoice: saved.tradeOffChoice ?? initial.level2State.tradeOffChoice,
      isEVASafeReturned: saved.isEVASafeReturned ?? initial.level2State.isEVASafeReturned,
      astronautHealthPercent: saved.astronautHealthPercent ?? initial.level2State.astronautHealthPercent,
      lunarFarmHealthPercent: saved.lunarFarmHealthPercent ?? initial.level2State.lunarFarmHealthPercent,
      // Transient Level 2 properties reset to safe defaults
      waterLevel: 100,
      isProcessorFailed: false,
      isECLSSSuccessModalOpen: false,
      evaTimeRemaining: 10,
      bloodPressureStatus: saved.isEVASafeReturned ? 'stabilized' : 'normal',
      isSalineAdministered: false,
      isSolarStormActive: false,
      solarStormData: null,
      isStormFetching: false,
      isGameVictoryModalOpen: false
    },

    ...(initial.campaign || saved.campaign
      ? (() => {
          const baseCampaign = initial.campaign as CampaignProgressState;
          const savedCampaign = saved.campaign;
          const baseSuit = baseCampaign?.spaceFitX;
          const savedSuit = savedCampaign?.spaceFitX;
          const mergedSpaceFitX = baseSuit
            ? {
                ...baseSuit,
                ...(savedSuit || {}),
                jointLoads: {
                  ...baseSuit.jointLoads,
                  ...(savedSuit?.jointLoads || {})
                }
              }
            : savedSuit;

          return {
            campaign: {
              ...baseCampaign,
              ...(savedCampaign || {}),
              ...(mergedSpaceFitX ? { spaceFitX: mergedSpaceFitX } : {}),
              // Sanitize transient screen state back to clean map on reload
              viewMode: 'world_map' as const,
              activeRoomId: null,
              activeMiniGameId: null
            }
          };
        })()
      : {})
  };
}

/**
 * Hydrates state safely during Context initialization.
 * - VALID_SAVE: Hydrates user milestones; enables auto-save.
 * - FUTURE_SAVE: Hydrates default state (so game runs), but DISABLES auto-save to protect newer save file.
 * - CORRUPT_SAVE: Hydrates default state (so game runs), but DISABLES auto-save to protect corrupted file from being overwritten.
 * - NO_SAVE: Hydrates default state; allows fresh auto-save.
 */
export function hydrateGameState(initial: GameState): GameState {
  const inspection = inspectSaveData();
  currentStorageStatus = inspection.status;

  switch (inspection.status) {
    case 'VALID_SAVE': {
      setAutoSaveDisabled(false);
      return mergeSavedState(initial, inspection.data);
    }

    case 'FUTURE_SAVE': {
      console.warn(
        `[AstroNutri Storage] Detected future save version (v${inspection.version}). Game will run with default state, but auto-save is DISABLED to protect user save data.`
      );
      setAutoSaveDisabled(true);
      return initial;
    }

    case 'CORRUPT_SAVE': {
      console.warn(
        '[AstroNutri Storage] Corrupted save data detected. Preserving raw corrupted string byte-for-byte. Auto-save is DISABLED to prevent data destruction until explicit user reset.',
        inspection.error
      );
      setAutoSaveDisabled(true); // <--- CRITICAL FIX: Disable auto-save to prevent overwriting corrupted data!
      return initial;
    }

    case 'NO_SAVE':
    default: {
      setAutoSaveDisabled(false);
      return initial;
    }
  }
}

/**
 * Removes ONLY the game save key ('astronutri_save_v1').
 * All other settings (sound volumes, BGM settings, language, voice toggles) remain untouched.
 * Re-enables auto-save following intentional user reset.
 */
export function clearSavedProgress(): boolean {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }

  try {
    localStorage.removeItem(SAVE_STORAGE_KEY);
    setAutoSaveDisabled(false);
    currentStorageStatus = 'NO_SAVE';
    return true;
  } catch (error) {
    console.warn('[AstroNutri Storage] Failed to remove save data:', error);
    return false;
  }
}
