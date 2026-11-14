import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { 
  GameState, 
  GameAction, 
  RoomLocation, 
  FoodItem, 
  NutritionScore, 
  CargoItemEntry,
  SuitCheckState,
  EngineCoreState,
  LaunchPadState,
  Level2State,
  CampaignProgressState,
  CampaignLevelId,
  CampaignViewMode,
  MiniGameId
} from '../types/game';
import { SolarStormData } from '../utils/nasaApi';
import { TARGET_NUTRITION_REQUIREMENTS } from '../data/foodItems';
import { soundManager } from '../utils/sound';
import { 
  hydrateGameState, 
  saveProgress, 
  clearSavedProgress, 
  isAutoSaveDisabled,
  getStorageStatus,
  SaveInspectionResult
} from '../utils/storage';

const initialSuitState: SuitCheckState = {
  helmetVisorLocked: false,
  o2PressurePSI: 2.1,
  isO2Calibrated: false,
  thermalLayersInspected: false,
  safetyTetherLatched: false
};

const initialEngineCoreState: EngineCoreState = {
  o2ScrubberProgress: 20, // starts at 20%
  fuelCellProgress: 0,    // starts at 0%
  fuelCellTemp: 25,       // safe room temp (danger threshold: 100°C)
  isOverheated: false,
  isEngineComplete: false
};

const initialLaunchPadState: LaunchPadState = {
  qteIndicatorPos: 0,
  qteTargetMin: 42,
  qteTargetMax: 58,
  qteSipSuccess: false,
  isLiquidSpilled: false,
  isBlastingOff: false,
  isLevel1Complete: false
};

const initialLevel2State: Level2State = {
  isLevel2Active: false,
  waterLevel: 100,
  isProcessorFailed: false,
  isECLSSSuccessModalOpen: false,
  evaTimeRemaining: 10, // 10 Hours
  bloodPressureStatus: 'normal',
  isSalineAdministered: false,
  isEVASafeReturned: false,
  // Solar Storm & Trade-off State
  isSolarStormActive: false,
  solarStormData: null,
  isStormFetching: false,
  tradeOffChoice: null,
  tradeOffFeedback: null,
  astronautHealthPercent: 100,
  lunarFarmHealthPercent: 100,
  isTradeOffResolved: false,
  isGameVictoryModalOpen: false
};

export const initialCampaignState: CampaignProgressState = {
  viewMode: 'world_map',
  activeLevel: 1,
  activeRoomId: null,
  activeMiniGameId: null,
  unlockedLevels: [1],
  completedMiniGames: [],
  l1SelectedFoodIds: [],
  l1FoodWeightKg: 0,
  l1EquipmentPacked: [],
  l1MedicalCleared: false,
  l1SpaceshipInspected: false,
  l2SecuredObjects: [],
  l2HydrationPercent: 15,
  l2MotionRested: false,
  l3BoneMuscleScore: 0,
  l3WaterRecycled: false,
  l3SolarStormSheltered: false,
  l3EvaSuitAssembled: false,
  l3PackedTools: [],
  l3CollectedSamples: [],
  l3ReturnAuthorized: false,
  l4SamplesVerified: false,
  l4NavigationAligned: false,
  l4EmergencyRepaired: false,
  l4ReentrySafe: false,
  l4MissionAccomplished: false
};

export const initialState: GameState = {
  showIntroModal: false, // Default to false: direct entry to 3D World Progression Map
  currentLocation: 'Map',
  cargoWeight: 0,
  cargoItems: [],
  nutritionScore: {
    totalProtein: 0,
    totalCarbs: 0,
    ratio: 0.5,
    status: 'empty',
    statusLabel: 'حقيبة الفضاء فارغة',
    feedbackTip: 'اسحب أطعمة الفضاء المعتمدة داخل الصندوق لبدء المهمة!'
  },
  fuelLevel: 0,
  o2Level: 20,
  hasSpicySauce: false,
  isNutritionMissionComplete: false,
  isHumanHealthComplete: false,
  isSuitMissionComplete: false,
  isEngineMissionComplete: false,
  isReturnMissionComplete: false,
  suitState: initialSuitState,
  engineCoreState: initialEngineCoreState,
  launchPadState: initialLaunchPadState,
  level2State: initialLevel2State,
  unlockedRooms: ['Map', 'NutritionLab', 'SpaceScience', 'HumanHealth'],
  soundEnabled: true,
  cadetName: 'البطل الصغير',
  campaign: initialCampaignState
};

export function calculateNutrition(items: CargoItemEntry[]): {
  cargoWeight: number;
  nutritionScore: NutritionScore;
  hasSpicySauce: boolean;
  canCompleteMission: boolean;
} {
  let totalProtein = 0;
  let totalCarbs = 0;
  let rawWeight = 0;
  let hasSpicySauce = false;

  for (const entry of items) {
    const { item, quantity } = entry;
    rawWeight += item.weightPercentage * quantity;
    totalProtein += item.proteinGrams * quantity;
    totalCarbs += item.carbsGrams * quantity;

    // Special items handled by standard nutrition metrics
    // Legacy hasSpicySauce field preserved as false for storage schema backward compatibility
  }

  const cargoWeight = Math.min(100, rawWeight);
  const totalNutrients = totalProtein + totalCarbs;
  const ratio = totalNutrients > 0 ? totalProtein / totalNutrients : 0.5;

  let status: NutritionScore['status'] = 'empty';
  let statusLabel = 'Cargo Empty';
  let feedbackTip = 'Drag approved space rations into the Cargo Box to prepare the mission!';

  if (items.length === 0) {
    status = 'empty';
    statusLabel = 'حقيبة الفضاء فارغة (0%)';
    feedbackTip = 'محتاجين وجبات فضاء! اسحب اللحم والفواكه والجبن داخل صندوق الشحن.';
  } else if (cargoWeight < TARGET_NUTRITION_REQUIREMENTS.minCargoWeight) {
    status = 'low_energy';
    statusLabel = `شحنة غير كافية (${cargoWeight}%)`;
    feedbackTip = `محتاجين على الأقل ${TARGET_NUTRITION_REQUIREMENTS.minCargoWeight}% من وزن الشحنة لتكفي رواد الفضاء!`;
  } else if (ratio > TARGET_NUTRITION_REQUIREMENTS.idealProteinRatioMax) {
    status = 'too_much_protein';
    statusLabel = 'نسبة بروتين مرتفعة! ⚠️';
    feedbackTip = 'البروتين يحمي العضلات من الضمور في الفضاء، لكن الرواد يحتاجون أيضاً كربوهيدرات متوازنة لمنحهم طاقة مستمرة!';
  } else if (ratio < TARGET_NUTRITION_REQUIREMENTS.idealProteinRatioMin) {
    status = 'too_much_carbs';
    statusLabel = 'كربوهيدرات مرتفعة! ⚠️';
    feedbackTip = 'الكربوهيدرات تمنح طاقة حركية، لكن الرواد بحاجة إلى بروتينات لحماية العضلات وكثافة العظام في الجاذبية الصغرى!';
  } else {
    status = 'optimal_balanced';
    statusLabel = 'توازن غذائي معتمد من ناسا! 🌟';
    feedbackTip = 'توازن مثالي بين طاقة الكربوهيدرات وبروتينات حماية العضلات! وجبة رواد الفضاء جاهزة للإقلاع!';
  }

  const canCompleteMission = 
    cargoWeight >= TARGET_NUTRITION_REQUIREMENTS.minCargoWeight &&
    status === 'optimal_balanced';

  return {
    cargoWeight,
    nutritionScore: { totalProtein, totalCarbs, ratio, status, statusLabel, feedbackTip },
    hasSpicySauce,
    canCompleteMission
  };
}

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'DISMISS_INTRO':
      return {
        ...state,
        showIntroModal: false,
        currentLocation: 'Map'
      };

    case 'OPEN_INTRO':
      return {
        ...state,
        showIntroModal: true
      };

    case 'SET_LOCATION':
      return { ...state, currentLocation: action.payload };

    case 'ADD_FOOD_ITEM': {
      const item = action.payload;
      if (item.isBanned) return state;

      // Strict mission capacity of exactly 4 accepted food items, with no duplicate items
      const totalPacked = state.cargoItems.reduce((sum, entry) => sum + entry.quantity, 0);
      if (totalPacked >= 4) return state;

      const alreadyPacked = state.cargoItems.some(e => e.item.id === item.id);
      if (alreadyPacked) return state;

      const newCargoItems: CargoItemEntry[] = [...state.cargoItems, { item, quantity: 1 }];

      const calculated = calculateNutrition(newCargoItems);

      return {
        ...state,
        cargoItems: newCargoItems,
        cargoWeight: calculated.cargoWeight,
        nutritionScore: calculated.nutritionScore,
        hasSpicySauce: calculated.hasSpicySauce
      };
    }

    case 'REMOVE_FOOD_ITEM': {
      const itemId = action.payload;
      const newCargoItems = state.cargoItems
        .map(entry => entry.item.id === itemId ? { ...entry, quantity: entry.quantity - 1 } : entry)
        .filter(entry => entry.quantity > 0);

      const calculated = calculateNutrition(newCargoItems);

      return {
        ...state,
        cargoItems: newCargoItems,
        cargoWeight: calculated.cargoWeight,
        nutritionScore: calculated.nutritionScore,
        hasSpicySauce: calculated.hasSpicySauce
      };
    }

    case 'CLEAR_CARGO': {
      const calculated = calculateNutrition([]);
      return {
        ...state,
        cargoItems: [],
        cargoWeight: 0,
        nutritionScore: calculated.nutritionScore,
        hasSpicySauce: false
      };
    }

    case 'TOGGLE_SOUND': {
      const newSound = !state.soundEnabled;
      soundManager.setEnabled(newSound);
      return { ...state, soundEnabled: newSound };
    }

    case 'SET_CADET_NAME':
      return { ...state, cadetName: action.payload };

    case 'COMPLETE_NUTRITION_MISSION': {
      const updatedRooms: RoomLocation[] = state.unlockedRooms.includes('SuitRoom')
        ? state.unlockedRooms
        : [...state.unlockedRooms, 'SuitRoom'];
      return {
        ...state,
        isNutritionMissionComplete: true,
        unlockedRooms: updatedRooms
      };
    }

    case 'COMPLETE_HUMAN_HEALTH': {
      return {
        ...state,
        isHumanHealthComplete: true
      };
    }

    case 'SET_O2_PRESSURE': {
      const pressure = action.payload;
      const isO2Calibrated = pressure >= 4.1 && pressure <= 4.5;
      return {
        ...state,
        suitState: {
          ...state.suitState,
          o2PressurePSI: pressure,
          isO2Calibrated
        }
      };
    }

    case 'TOGGLE_SUIT_EQUIPMENT': {
      const key = action.payload;
      const currentVal = state.suitState[key];
      return {
        ...state,
        suitState: {
          ...state.suitState,
          [key]: !currentVal
        }
      };
    }

    case 'COMPLETE_SUIT_MISSION': {
      const updatedRooms: RoomLocation[] = state.unlockedRooms.includes('EngineRoom')
        ? state.unlockedRooms
        : [...state.unlockedRooms, 'EngineRoom'];
      return {
        ...state,
        isSuitMissionComplete: true,
        unlockedRooms: updatedRooms
      };
    }

    case 'PUMP_O2_SCRUBBER': {
      const increment = action.payload ?? 8;
      const newO2 = Math.min(100, state.engineCoreState.o2ScrubberProgress + increment);
      soundManager.playScrubberPump();
      return {
        ...state,
        o2Level: newO2,
        engineCoreState: {
          ...state.engineCoreState,
          o2ScrubberProgress: newO2
        }
      };
    }

    case 'FILL_FUEL_CELL_TICK': {
      const { amount, heatIncrease } = action.payload;
      if (state.engineCoreState.isOverheated) return state;

      const newTemp = state.engineCoreState.fuelCellTemp + heatIncrease;
      const isOverheated = newTemp >= 100;

      if (isOverheated) {
        soundManager.playAlertSiren();
        return {
          ...state,
          engineCoreState: {
            ...state.engineCoreState,
            fuelCellTemp: 100,
            isOverheated: true
          }
        };
      }

      const newFuel = Math.min(100, state.engineCoreState.fuelCellProgress + amount);
      soundManager.playFuelCharge();

      return {
        ...state,
        fuelLevel: newFuel,
        engineCoreState: {
          ...state.engineCoreState,
          fuelCellProgress: newFuel,
          fuelCellTemp: newTemp
        }
      };
    }

    case 'COOL_FUEL_CELL_TICK': {
      if (state.engineCoreState.isOverheated) return state;
      const cooledTemp = Math.max(25, state.engineCoreState.fuelCellTemp - 3.5);
      return {
        ...state,
        engineCoreState: {
          ...state.engineCoreState,
          fuelCellTemp: cooledTemp
        }
      };
    }

    case 'RESET_FUEL_OVERHEAT': {
      soundManager.playClick();
      return {
        ...state,
        engineCoreState: {
          ...state.engineCoreState,
          fuelCellTemp: 35,
          isOverheated: false
        }
      };
    }

    case 'COMPLETE_ENGINE_CORE': {
      soundManager.playFanfare();
      const updatedRooms: RoomLocation[] = state.unlockedRooms.includes('LaunchPad')
        ? state.unlockedRooms
        : [...state.unlockedRooms, 'LaunchPad'];

      return {
        ...state,
        isEngineMissionComplete: true,
        fuelLevel: 100,
        o2Level: 100,
        engineCoreState: {
          ...state.engineCoreState,
          isEngineComplete: true
        },
        unlockedRooms: updatedRooms
      };
    }

    case 'UPDATE_QTE_POS': {
      return {
        ...state,
        launchPadState: {
          ...state.launchPadState,
          qteIndicatorPos: action.payload
        }
      };
    }

    case 'CHECK_QTE_SIP': {
      const pos = state.launchPadState.qteIndicatorPos;
      const min = state.launchPadState.qteTargetMin;
      const max = state.launchPadState.qteTargetMax;
      const isHit = pos >= min && pos <= max;

      if (isHit) {
        soundManager.playJuiceSip();
        return {
          ...state,
          launchPadState: {
            ...state.launchPadState,
            qteSipSuccess: true,
            isLiquidSpilled: false
          }
        };
      } else {
        soundManager.playJuiceSpill();
        return {
          ...state,
          launchPadState: {
            ...state.launchPadState,
            qteSipSuccess: false,
            isLiquidSpilled: true
          }
        };
      }
    }

    case 'RETRY_QTE': {
      soundManager.playClick();
      return {
        ...state,
        launchPadState: {
          ...state.launchPadState,
          isLiquidSpilled: false,
          qteSipSuccess: false
        }
      };
    }

    case 'TRIGGER_BLAST_OFF': {
      soundManager.playBlastOff(5.0);
      return {
        ...state,
        launchPadState: {
          ...state.launchPadState,
          isBlastingOff: true
        }
      };
    }

    case 'COMPLETE_LEVEL_1': {
      soundManager.playFanfare();
      const updatedRooms: RoomLocation[] = state.unlockedRooms.includes('LunarDashboard')
        ? state.unlockedRooms
        : [...state.unlockedRooms, 'LunarDashboard'];

      return {
        ...state,
        unlockedRooms: updatedRooms,
        launchPadState: {
          ...state.launchPadState,
          isLevel1Complete: true
        }
      };
    }

    // ==========================================
    // LEVEL 2 ACTIONS (LUNAR OUTPOST OPERATIONS)
    // ==========================================
    case 'START_LEVEL_2': {
      soundManager.playFanfare();
      const updatedRooms: RoomLocation[] = state.unlockedRooms.includes('LunarDashboard')
        ? state.unlockedRooms
        : [...state.unlockedRooms, 'LunarDashboard'];

      return {
        ...state,
        currentLocation: 'LunarDashboard',
        unlockedRooms: updatedRooms,
        level2State: {
          ...state.level2State,
          isLevel2Active: true
        }
      };
    }

    case 'DRAIN_WATER_TICK': {
      const drainAmount = action.payload ?? 1.5;
      const newWater = Math.max(0, state.level2State.waterLevel - drainAmount);
      const isNowFailed = newWater <= 30;

      // Trigger alert siren once when crossing into failure threshold
      if (isNowFailed && !state.level2State.isProcessorFailed) {
        soundManager.playAlertSiren();
      }

      return {
        ...state,
        level2State: {
          ...state.level2State,
          waterLevel: newWater,
          isProcessorFailed: isNowFailed
        }
      };
    }

    case 'REPAIR_ECLSS': {
      soundManager.playWaterRecycle();
      soundManager.playFanfare();
      return {
        ...state,
        level2State: {
          ...state.level2State,
          waterLevel: 100,
          isProcessorFailed: false,
          isECLSSSuccessModalOpen: true
        }
      };
    }

    case 'DISMISS_ECLSS_MODAL': {
      soundManager.playClick();
      return {
        ...state,
        level2State: {
          ...state.level2State,
          isECLSSSuccessModalOpen: false
        }
      };
    }

    case 'TICK_EVA_TIMER': {
      const nextTime = Math.max(0, state.level2State.evaTimeRemaining - 1);

      // Auditory warnings at key thresholds
      if (nextTime === 2) {
        soundManager.playCautionBeep();
      } else if (nextTime === 1) {
        soundManager.playAlertSiren();
      }

      // Orthostatic blood pressure drops as EVA fatigue sets in unless saline is loaded
      let bpStatus = state.level2State.bloodPressureStatus;
      if (nextTime <= 4 && !state.level2State.isSalineAdministered) {
        bpStatus = 'low';
      }

      return {
        ...state,
        level2State: {
          ...state.level2State,
          evaTimeRemaining: nextTime,
          bloodPressureStatus: bpStatus
        }
      };
    }

    case 'ADMINISTER_SALINE': {
      soundManager.playSalineInject();
      soundManager.playFanfare();
      return {
        ...state,
        level2State: {
          ...state.level2State,
          isSalineAdministered: true,
          bloodPressureStatus: 'stabilized'
        }
      };
    }

    case 'CONCLUDE_EVA': {
      soundManager.playFanfare();
      const willTriggerVictory = state.level2State.isTradeOffResolved;
      const updatedRooms: RoomLocation[] =
        willTriggerVictory && !state.unlockedRooms.includes('ReturnToEarth')
          ? [...state.unlockedRooms, 'ReturnToEarth']
          : state.unlockedRooms;
      return {
        ...state,
        unlockedRooms: updatedRooms,
        level2State: {
          ...state.level2State,
          isEVASafeReturned: true,
          isGameVictoryModalOpen: willTriggerVictory
        }
      };
    }

    case 'RESET_LEVEL_2': {
      return {
        ...state,
        level2State: {
          ...initialLevel2State,
          isLevel2Active: true
        }
      };
    }

    // ==========================================
    // SOLAR STORM & TRADE-OFF MECHANIC
    // ==========================================
    case 'TRIGGER_SOLAR_STORM': {
      soundManager.playAlertSiren();
      return {
        ...state,
        level2State: {
          ...state.level2State,
          isSolarStormActive: true
        }
      };
    }

    case 'SET_SOLAR_STORM_DATA': {
      return {
        ...state,
        level2State: {
          ...state.level2State,
          solarStormData: action.payload
        }
      };
    }

    case 'RESOLVE_TRADE_OFF': {
      const choice = action.payload;

      let astronautHealth = state.level2State.astronautHealthPercent;
      let farmHealth = state.level2State.lunarFarmHealthPercent;
      let feedback = '';

      if (choice === 'shields') {
        // Option A: Correct Medical Choice
        soundManager.playShieldEnergize();
        soundManager.playDropSuccess();
        astronautHealth = 100;
        farmHealth = 90; // Crop lighting briefly dimmed
        feedback = "Wise command! You protected the astronaut's life. NASA prioritizes human health!";
      } else {
        // Option B: Wrong Choice
        soundManager.playAlertSiren();
        astronautHealth = 50; // Radiation Sickness
        farmHealth = 100;
        feedback = "Warning! The astronaut suffered radiation sickness! Health always comes first!";
      }

      // Check if Victory Screen should open (EVA returned + storm resolved)
      const shouldOpenVictory = state.level2State.isEVASafeReturned;
      const updatedRooms: RoomLocation[] =
        shouldOpenVictory && !state.unlockedRooms.includes('ReturnToEarth')
          ? [...state.unlockedRooms, 'ReturnToEarth']
          : state.unlockedRooms;

      return {
        ...state,
        unlockedRooms: updatedRooms,
        level2State: {
          ...state.level2State,
          tradeOffChoice: choice,
          tradeOffFeedback: feedback,
          astronautHealthPercent: astronautHealth,
          lunarFarmHealthPercent: farmHealth,
          isTradeOffResolved: true,
          isSolarStormActive: false,
          isGameVictoryModalOpen: shouldOpenVictory
        }
      };
    }

    case 'COMPLETE_RETURN_MISSION': {
      return {
        ...state,
        isReturnMissionComplete: true
      };
    }

    case 'UNLOCK_ALL_ROOMS': {
      const allRooms: RoomLocation[] = [
        'Map',
        'NutritionLab',
        'SpaceScience',
        'HumanHealth',
        'SuitRoom',
        'EngineRoom',
        'LaunchPad',
        'LunarDashboard',
        'ReturnToEarth'
      ];
      return {
        ...state,
        unlockedRooms: allRooms
      };
    }

    case 'OPEN_VICTORY_MODAL': {
      soundManager.playFanfare();
      return {
        ...state,
        level2State: {
          ...state.level2State,
          isGameVictoryModalOpen: true
        }
      };
    }

    case 'DISMISS_VICTORY_MODAL': {
      soundManager.playClick();
      return {
        ...state,
        level2State: {
          ...state.level2State,
          isGameVictoryModalOpen: false
        }
      };
    }

    case 'RESET_GAME_FULL': {
      soundManager.playClick();
      return {
        ...initialState,
        showIntroModal: false,
        currentLocation: 'Map',
        campaign: initialCampaignState
      };
    }

    case 'SET_CAMPAIGN_VIEW': {
      const curr = state.campaign || initialCampaignState;
      const targetLevel = action.payload.levelId ?? curr.activeLevel;
      // Enforce sequential level unlocking gate
      const safeLevel = curr.unlockedLevels.includes(targetLevel) ? targetLevel : curr.activeLevel;
      return {
        ...state,
        campaign: {
          ...curr,
          viewMode: action.payload.viewMode,
          activeLevel: safeLevel,
          activeRoomId:
            action.payload.roomId !== undefined ? action.payload.roomId : curr.activeRoomId,
          activeMiniGameId:
            action.payload.miniGameId !== undefined
              ? action.payload.miniGameId
              : curr.activeMiniGameId
        }
      };
    }

    case 'UPDATE_CAMPAIGN_STATE': {
      const curr = state.campaign || initialCampaignState;
      return {
        ...state,
        campaign: {
          ...curr,
          ...action.payload
        }
      };
    }

    case 'UNLOCK_CAMPAIGN_LEVEL': {
      const curr = state.campaign || initialCampaignState;
      const unlockedLevels = Array.from(
        new Set([...curr.unlockedLevels, action.payload])
      ) as CampaignLevelId[];
      return {
        ...state,
        campaign: {
          ...curr,
          unlockedLevels
        }
      };
    }

    case 'COMPLETE_CAMPAIGN_MINIGAME': {
      const curr = state.campaign || initialCampaignState;
      const { miniGameId, patch } = action.payload;
      const completedMiniGames = Array.from(
        new Set([...curr.completedMiniGames, miniGameId])
      ) as MiniGameId[];
      let unlockedLevels = [...curr.unlockedLevels];
      let unlockedRooms = [...state.unlockedRooms];
      let isNutritionMissionComplete = state.isNutritionMissionComplete;
      let isHumanHealthComplete = state.isHumanHealthComplete;
      let isSuitMissionComplete = state.isSuitMissionComplete;
      let isEngineMissionComplete = state.isEngineMissionComplete;
      let isReturnMissionComplete = state.isReturnMissionComplete;
      let launchPadState = state.launchPadState;
      let level2State = state.level2State;

      // Cross-level automatic progression & legacy milestone sync
      if (miniGameId === 'l1_food_prep') {
        isNutritionMissionComplete = true;
        unlockedRooms = Array.from(new Set([...unlockedRooms, 'SuitRoom']));
      }
      if (miniGameId === 'l1_medical_check') {
        isHumanHealthComplete = true;
      }
      if (miniGameId === 'l1_spaceship_inspect') {
        isEngineMissionComplete = true;
        unlockedRooms = Array.from(new Set([...unlockedRooms, 'EngineRoom', 'LaunchPad']));
      }
      if (miniGameId === 'l1_mission_launch') {
        unlockedLevels = Array.from(new Set([...unlockedLevels, 2])) as CampaignLevelId[];
        unlockedRooms = Array.from(new Set([...unlockedRooms, 'LunarDashboard']));
        launchPadState = { ...launchPadState, isLevel1Complete: true };
        level2State = { ...level2State, isLevel2Active: true };
      }
      if (miniGameId === 'l2_systems_neows') {
        unlockedLevels = Array.from(new Set([...unlockedLevels, 3])) as CampaignLevelId[];
      }
      if (miniGameId === 'l3_eva_prep') {
        isSuitMissionComplete = true;
      }
      if (miniGameId === 'l3_solar_storm') {
        level2State = { ...level2State, isTradeOffResolved: true };
      }
      if (miniGameId === 'l3_lunar_samples') {
        level2State = { ...level2State, isEVASafeReturned: true };
      }
      if (miniGameId === 'l4_safe_landing') {
        isReturnMissionComplete = true;
        unlockedRooms = Array.from(new Set([...unlockedRooms, 'ReturnToEarth']));
      }

      return {
        ...state,
        unlockedRooms,
        isNutritionMissionComplete,
        isHumanHealthComplete,
        isSuitMissionComplete,
        isEngineMissionComplete,
        isReturnMissionComplete,
        launchPadState,
        level2State,
        campaign: {
          ...curr,
          ...(patch || {}),
          completedMiniGames,
          unlockedLevels
        }
      };
    }

    case 'AUTHORIZE_LUNAR_RETURN': {
      const curr = state.campaign || initialCampaignState;
      const unlockedLevels = Array.from(
        new Set([...curr.unlockedLevels, 4])
      ) as CampaignLevelId[];
      return {
        ...state,
        unlockedRooms: Array.from(new Set([...state.unlockedRooms, 'ReturnToEarth'])),
        campaign: {
          ...curr,
          l3ReturnAuthorized: true,
          unlockedLevels
        }
      };
    }

    default:
      return state;
  }
}

interface GameContextType {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  dismissIntro: () => void;
  openIntro: () => void;
  setLocation: (loc: RoomLocation) => void;
  addFoodItem: (item: FoodItem) => boolean;
  removeFoodItem: (itemId: string) => void;
  clearCargo: () => void;
  toggleSound: () => void;
  completeNutritionMission: () => void;
  completeHumanHealth: () => void;
  completeReturnMission: () => void;
  unlockAllRooms: () => void;
  canCompleteMission: boolean;
  setO2Pressure: (pressure: number) => void;
  toggleSuitEquipment: (key: keyof Omit<SuitCheckState, 'o2PressurePSI' | 'isO2Calibrated'>) => void;
  completeSuitMission: () => void;
  isSuitReadyForEVA: boolean;
  pumpO2Scrubber: (amt?: number) => void;
  fillFuelCellTick: (amount: number, heatIncrease: number) => void;
  coolFuelCellTick: () => void;
  resetFuelOverheat: () => void;
  completeEngineCore: () => void;
  isEngineReadyForLaunch: boolean;
  updateQTEPos: (pos: number) => void;
  checkQTESip: () => void;
  retryQTE: () => void;
  triggerBlastOff: () => void;
  completeLevel1: () => void;
  // Level 2 Helpers
  startLevel2: () => void;
  drainWaterTick: (amount?: number) => void;
  repairECLSS: () => void;
  dismissECLSSModal: () => void;
  tickEVATimer: () => void;
  administerSaline: () => void;
  concludeEVA: () => void;
  resetLevel2: () => void;
  // Solar Storm & Trade-off
  triggerSolarStorm: () => void;
  setSolarStormData: (data: SolarStormData) => void;
  resolveTradeOff: (choice: 'shields' | 'farm') => void;
  openVictoryModal: () => void;
  dismissVictoryModal: () => void;
  resetGameFull: () => void;
  resetProgress: () => void;
  storageStatus: SaveInspectionResult['status'];
  isAutoSaveBlocked: boolean;
  // 4-Level / 21-Minigame Campaign helpers
  setCampaignView: (viewMode: CampaignViewMode, levelId?: CampaignLevelId, roomId?: string | null, miniGameId?: MiniGameId | null) => void;
  completeCampaignMiniGame: (miniGameId: MiniGameId, patch?: Partial<CampaignProgressState>) => void;
  updateCampaignState: (patch: Partial<CampaignProgressState>) => void;
  unlockCampaignLevel: (levelId: CampaignLevelId) => void;
  authorizeLunarReturn: () => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(gameReducer, initialState, hydrateGameState);
  const [storageStatus, setStorageStatus] = React.useState<SaveInspectionResult['status']>(() => getStorageStatus());

  // Deep-linking / URL room navigation helper for testing & direct stage routing
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location?.search) {
      try {
        const params = new URLSearchParams(window.location.search);
        const roomParam = params.get('room') as RoomLocation | null;
        if (roomParam) {
          dispatch({ type: 'SET_LOCATION', payload: roomParam });
        }
        const levelParam = Number(params.get('level')) as CampaignLevelId;
        const gameParam = params.get('game') as MiniGameId | null;
        if (levelParam >= 1 && levelParam <= 4) {
          dispatch({ type: 'UNLOCK_CAMPAIGN_LEVEL', payload: levelParam });
          dispatch({
            type: 'SET_CAMPAIGN_VIEW',
            payload: {
              viewMode: gameParam ? 'minigame' : 'level_hub',
              levelId: levelParam,
              miniGameId: gameParam || null
            }
          });
        }
      } catch {
        // Safe fallback in restricted environments
      }
    }
  }, []);

  // Debounced auto-save effect for persistent game progress
  useEffect(() => {
    // If a future save version is detected, auto-save is permanently blocked to prevent data destruction
    if (isAutoSaveDisabled()) return;

    const timer = window.setTimeout(() => {
      saveProgress(state);
    }, 250);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    state.cadetName,
    state.unlockedRooms,
    state.isNutritionMissionComplete,
    state.isHumanHealthComplete,
    state.isSuitMissionComplete,
    state.isEngineMissionComplete,
    state.isReturnMissionComplete,
    state.launchPadState.isLevel1Complete,
    state.level2State.isLevel2Active,
    state.level2State.isTradeOffResolved,
    state.level2State.tradeOffChoice,
    state.level2State.isEVASafeReturned,
    state.level2State.astronautHealthPercent,
    state.level2State.lunarFarmHealthPercent,
    state.cargoItems,
    state.cargoWeight,
    state.hasSpicySauce,
    state.suitState.helmetVisorLocked,
    state.suitState.o2PressurePSI,
    state.suitState.isO2Calibrated,
    state.suitState.thermalLayersInspected,
    state.suitState.safetyTetherLatched,
    state.engineCoreState.o2ScrubberProgress,
    state.engineCoreState.fuelCellProgress,
    state.engineCoreState.isEngineComplete,
    state.campaign
  ]);

  useEffect(() => {
    soundManager.setEnabled(state.soundEnabled);
  }, [state.soundEnabled]);

  const { canCompleteMission } = calculateNutrition(state.cargoItems);

  const isSuitReadyForEVA = 
    state.suitState.helmetVisorLocked &&
    state.suitState.isO2Calibrated &&
    state.suitState.thermalLayersInspected &&
    state.suitState.safetyTetherLatched;

  const isEngineReadyForLaunch = 
    state.engineCoreState.o2ScrubberProgress >= 100 &&
    state.engineCoreState.fuelCellProgress >= 100;

  const dismissIntro = () => {
    soundManager.playClick();
    dispatch({ type: 'DISMISS_INTRO' });
  };

  const openIntro = () => {
    soundManager.playClick();
    dispatch({ type: 'OPEN_INTRO' });
  };

  const setLocation = (loc: RoomLocation) => {
    soundManager.playClick();
    dispatch({ type: 'SET_LOCATION', payload: loc });
  };

  const addFoodItem = (item: FoodItem): boolean => {
    if (item.isBanned) return false;
    soundManager.playDropSuccess();
    dispatch({ type: 'ADD_FOOD_ITEM', payload: item });
    return true;
  };

  const removeFoodItem = (itemId: string) => {
    soundManager.playClick();
    dispatch({ type: 'REMOVE_FOOD_ITEM', payload: itemId });
  };

  const clearCargo = () => {
    soundManager.playClick();
    dispatch({ type: 'CLEAR_CARGO' });
  };

  const toggleSound = () => dispatch({ type: 'TOGGLE_SOUND' });

  const completeNutritionMission = () => {
    soundManager.playFanfare();
    dispatch({ type: 'COMPLETE_NUTRITION_MISSION' });
  };

  const completeHumanHealth = () => {
    soundManager.playFanfare();
    dispatch({ type: 'COMPLETE_HUMAN_HEALTH' });
  };

  const completeReturnMission = () => {
    soundManager.playFanfare();
    dispatch({ type: 'COMPLETE_RETURN_MISSION' });
  };

  const unlockAllRooms = () => {
    soundManager.playClick();
    dispatch({ type: 'UNLOCK_ALL_ROOMS' });
  };

  const setO2Pressure = (pressure: number) => {
    soundManager.playPressurizeHiss();
    dispatch({ type: 'SET_O2_PRESSURE', payload: pressure });
  };

  const toggleSuitEquipment = (key: keyof Omit<SuitCheckState, 'o2PressurePSI' | 'isO2Calibrated'>) => {
    soundManager.playLockerSnap();
    dispatch({ type: 'TOGGLE_SUIT_EQUIPMENT', payload: key });
  };

  const completeSuitMission = () => {
    soundManager.playFanfare();
    dispatch({ type: 'COMPLETE_SUIT_MISSION' });
  };

  const pumpO2Scrubber = (amt?: number) => {
    dispatch({ type: 'PUMP_O2_SCRUBBER', payload: amt });
  };

  const fillFuelCellTick = (amount: number, heatIncrease: number) => {
    dispatch({ type: 'FILL_FUEL_CELL_TICK', payload: { amount, heatIncrease } });
  };

  const coolFuelCellTick = () => {
    dispatch({ type: 'COOL_FUEL_CELL_TICK' });
  };

  const resetFuelOverheat = () => {
    dispatch({ type: 'RESET_FUEL_OVERHEAT' });
  };

  const completeEngineCore = () => {
    dispatch({ type: 'COMPLETE_ENGINE_CORE' });
  };

  const updateQTEPos = (pos: number) => {
    dispatch({ type: 'UPDATE_QTE_POS', payload: pos });
  };

  const checkQTESip = () => {
    dispatch({ type: 'CHECK_QTE_SIP' });
  };

  const retryQTE = () => {
    dispatch({ type: 'RETRY_QTE' });
  };

  const triggerBlastOff = () => {
    dispatch({ type: 'TRIGGER_BLAST_OFF' });
  };

  const completeLevel1 = () => {
    dispatch({ type: 'COMPLETE_LEVEL_1' });
  };

  // Level 2 dispatchers
  const startLevel2 = () => {
    dispatch({ type: 'START_LEVEL_2' });
  };

  const drainWaterTick = (amount?: number) => {
    dispatch({ type: 'DRAIN_WATER_TICK', payload: amount });
  };

  const repairECLSS = () => {
    dispatch({ type: 'REPAIR_ECLSS' });
  };

  const dismissECLSSModal = () => {
    dispatch({ type: 'DISMISS_ECLSS_MODAL' });
  };

  const tickEVATimer = () => {
    dispatch({ type: 'TICK_EVA_TIMER' });
  };

  const administerSaline = () => {
    dispatch({ type: 'ADMINISTER_SALINE' });
  };

  const concludeEVA = () => {
    dispatch({ type: 'CONCLUDE_EVA' });
  };

  const resetLevel2 = () => {
    dispatch({ type: 'RESET_LEVEL_2' });
  };

  // Solar Storm & Trade-off
  const triggerSolarStorm = () => {
    dispatch({ type: 'TRIGGER_SOLAR_STORM' });
  };

  const setSolarStormData = (data: SolarStormData) => {
    dispatch({ type: 'SET_SOLAR_STORM_DATA', payload: data });
  };

  const resolveTradeOff = (choice: 'shields' | 'farm') => {
    dispatch({ type: 'RESOLVE_TRADE_OFF', payload: choice });
  };

  const openVictoryModal = () => {
    dispatch({ type: 'OPEN_VICTORY_MODAL' });
  };

  const dismissVictoryModal = () => {
    dispatch({ type: 'DISMISS_VICTORY_MODAL' });
  };

  const resetGameFull = () => {
    clearSavedProgress();
    setStorageStatus('NO_SAVE');
    dispatch({ type: 'RESET_GAME_FULL' });
  };

  const resetProgress = resetGameFull;

  const setCampaignView = (
    viewMode: CampaignViewMode,
    levelId?: CampaignLevelId,
    roomId?: string | null,
    miniGameId?: MiniGameId | null
  ) => {
    dispatch({
      type: 'SET_CAMPAIGN_VIEW',
      payload: { viewMode, levelId, roomId, miniGameId }
    });
  };

  const completeCampaignMiniGame = (
    miniGameId: MiniGameId,
    patch?: Partial<CampaignProgressState>
  ) => {
    dispatch({
      type: 'COMPLETE_CAMPAIGN_MINIGAME',
      payload: { miniGameId, patch }
    });
  };

  const updateCampaignState = (patch: Partial<CampaignProgressState>) => {
    dispatch({ type: 'UPDATE_CAMPAIGN_STATE', payload: patch });
  };

  const unlockCampaignLevel = (levelId: CampaignLevelId) => {
    dispatch({ type: 'UNLOCK_CAMPAIGN_LEVEL', payload: levelId });
  };

  const authorizeLunarReturn = () => {
    soundManager.playFanfare();
    dispatch({ type: 'AUTHORIZE_LUNAR_RETURN' });
  };

  return (
    <GameContext.Provider
      value={{
        state,
        dispatch,
        dismissIntro,
        openIntro,
        setLocation,
        addFoodItem,
        removeFoodItem,
        clearCargo,
        toggleSound,
        completeNutritionMission,
        completeHumanHealth,
        completeReturnMission,
        unlockAllRooms,
        canCompleteMission,
        setO2Pressure,
        toggleSuitEquipment,
        completeSuitMission,
        isSuitReadyForEVA,
        pumpO2Scrubber,
        fillFuelCellTick,
        coolFuelCellTick,
        resetFuelOverheat,
        completeEngineCore,
        isEngineReadyForLaunch,
        updateQTEPos,
        checkQTESip,
        retryQTE,
        triggerBlastOff,
        completeLevel1,
        // Level 2
        startLevel2,
        drainWaterTick,
        repairECLSS,
        dismissECLSSModal,
        tickEVATimer,
        administerSaline,
        concludeEVA,
        resetLevel2,
        // Solar Storm & Trade-off
        triggerSolarStorm,
        setSolarStormData,
        resolveTradeOff,
        openVictoryModal,
        dismissVictoryModal,
        resetGameFull,
        resetProgress,
        storageStatus,
        isAutoSaveBlocked: isAutoSaveDisabled(),
        setCampaignView,
        completeCampaignMiniGame,
        updateCampaignState,
        unlockCampaignLevel,
        authorizeLunarReturn
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export function useGameState(): GameContextType {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGameState must be used within GameProvider');
  return context;
}
