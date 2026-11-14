import { SolarStormData } from '../utils/nasaApi';

export type RoomLocation =
  | 'Map'
  | 'NutritionLab'
  | 'SpaceScience'
  | 'HumanHealth'
  | 'SuitRoom'
  | 'EngineRoom'
  | 'LaunchPad'
  | 'LunarDashboard'
  | 'ReturnToEarth';

export type NutritionBalanceStatus = 
  | 'empty' 
  | 'low_energy' 
  | 'too_much_protein' 
  | 'too_much_carbs' 
  | 'optimal_balanced';

export type BloodPressureStatus = 'normal' | 'low' | 'stabilized';
export type TradeOffChoice = 'shields' | 'farm' | null;

export interface FoodItem {
  id: string;
  name: string;
  nameAr?: string;
  svgAsset?: string;
  category: 'protein' | 'carbs' | 'special' | 'banned';
  weightPercentage: number;
  proteinGrams: number;
  carbsGrams: number;
  isBanned: boolean;
  bannedReason?: string;
  bannedReasonAr?: string;
  isSpecial?: boolean;
  specialBonus?: string;
  specialBonusAr?: string;
  funFact: string;
  funFactAr?: string;
  nasaVerifiedFact?: string;
  nasaVerifiedFactAr?: string;
  gameplaySimplificationAr?: string;
  nasaSourceTitle?: string;
  nasaSourceUrl?: string;
  icon: string;
  color: string;
}

export interface CargoItemEntry {
  item: FoodItem;
  quantity: number;
}

export interface NutritionScore {
  totalProtein: number;
  totalCarbs: number;
  ratio: number;
  status: NutritionBalanceStatus;
  statusLabel: string;
  feedbackTip: string;
}

export interface StationRoomInfo {
  id: RoomLocation;
  name: string;
  shortCode: string;
  subtitle: string;
  description: string;
  isUnlocked: boolean;
  unlockRequirement?: string;
  accentColor: string;
  iconName: string;
  deckCoordinates: { x: number; y: number };
}

export interface SuitCheckState {
  helmetVisorLocked: boolean;
  o2PressurePSI: number; // Optimal 4.3 PSI
  isO2Calibrated: boolean;
  thermalLayersInspected: boolean;
  safetyTetherLatched: boolean;
}

export interface EngineCoreState {
  o2ScrubberProgress: number; // 20% to 100%
  fuelCellProgress: number;   // 0% to 100%
  fuelCellTemp: number;       // 25°C to 100°C
  isOverheated: boolean;
  isEngineComplete: boolean;
}

export interface LaunchPadState {
  qteIndicatorPos: number;    // 0 to 100
  qteTargetMin: number;       // 42
  qteTargetMax: number;       // 58
  qteSipSuccess: boolean;
  isLiquidSpilled: boolean;
  isBlastingOff: boolean;
  isLevel1Complete: boolean;
}

export interface Level2State {
  isLevel2Active: boolean;
  waterLevel: number;               // 0 to 100%
  isProcessorFailed: boolean;       // Triggered at <= 30%
  isECLSSSuccessModalOpen: boolean; // 98% recycled popup
  evaTimeRemaining: number;         // 10 down to 0 (representing hours)
  bloodPressureStatus: BloodPressureStatus;
  isSalineAdministered: boolean;
  isEVASafeReturned: boolean;
  // Solar Storm & Trade-off State
  isSolarStormActive: boolean;
  solarStormData: SolarStormData | null;
  isStormFetching: boolean;
  tradeOffChoice: TradeOffChoice;
  tradeOffFeedback: string | null;
  astronautHealthPercent: number;  // 100% down to 50% if farm chosen
  lunarFarmHealthPercent: number;  // 100% down to 90% if shields chosen
  isTradeOffResolved: boolean;
  isGameVictoryModalOpen: boolean;
}

export interface GameState {
  showIntroModal: boolean;
  currentLocation: RoomLocation;
  cargoWeight: number; // 0 to 100%
  cargoItems: CargoItemEntry[];
  nutritionScore: NutritionScore;
  fuelLevel: number; // 0 to 100%
  o2Level: number;   // 0 to 100%
  hasSpicySauce: boolean;
  isNutritionMissionComplete: boolean;
  isHumanHealthComplete: boolean;
  isSuitMissionComplete: boolean;
  isEngineMissionComplete: boolean;
  isReturnMissionComplete: boolean;
  suitState: SuitCheckState;
  engineCoreState: EngineCoreState;
  launchPadState: LaunchPadState;
  level2State: Level2State;
  unlockedRooms: RoomLocation[];
  soundEnabled: boolean;
  cadetName: string;
}

export type GameAction =
  | { type: 'DISMISS_INTRO' }
  | { type: 'OPEN_INTRO' }
  | { type: 'SET_LOCATION'; payload: RoomLocation }
  | { type: 'ADD_FOOD_ITEM'; payload: FoodItem }
  | { type: 'REMOVE_FOOD_ITEM'; payload: string }
  | { type: 'CLEAR_CARGO' }
  | { type: 'TOGGLE_SOUND' }
  | { type: 'SET_CADET_NAME'; payload: string }
  | { type: 'COMPLETE_NUTRITION_MISSION' }
  | { type: 'COMPLETE_HUMAN_HEALTH' }
  | { type: 'SET_O2_PRESSURE'; payload: number }
  | { type: 'TOGGLE_SUIT_EQUIPMENT'; payload: keyof Omit<SuitCheckState, 'o2PressurePSI' | 'isO2Calibrated'> }
  | { type: 'COMPLETE_SUIT_MISSION' }
  | { type: 'COMPLETE_RETURN_MISSION' }
  | { type: 'UNLOCK_ALL_ROOMS' }
  | { type: 'PUMP_O2_SCRUBBER'; payload?: number }
  | { type: 'FILL_FUEL_CELL_TICK'; payload: { amount: number; heatIncrease: number } }
  | { type: 'COOL_FUEL_CELL_TICK' }
  | { type: 'RESET_FUEL_OVERHEAT' }
  | { type: 'COMPLETE_ENGINE_CORE' }
  | { type: 'UPDATE_QTE_POS'; payload: number }
  | { type: 'CHECK_QTE_SIP' }
  | { type: 'RETRY_QTE' }
  | { type: 'TRIGGER_BLAST_OFF' }
  | { type: 'COMPLETE_LEVEL_1' }
  // LEVEL 2 ACTIONS
  | { type: 'START_LEVEL_2' }
  | { type: 'DRAIN_WATER_TICK'; payload?: number }
  | { type: 'REPAIR_ECLSS' }
  | { type: 'DISMISS_ECLSS_MODAL' }
  | { type: 'TICK_EVA_TIMER' }
  | { type: 'ADMINISTER_SALINE' }
  | { type: 'CONCLUDE_EVA' }
  | { type: 'RESET_LEVEL_2' }
  // SOLAR STORM & TRADE-OFF ACTIONS
  | { type: 'TRIGGER_SOLAR_STORM' }
  | { type: 'SET_SOLAR_STORM_DATA'; payload: SolarStormData }
  | { type: 'RESOLVE_TRADE_OFF'; payload: 'shields' | 'farm' }
  | { type: 'OPEN_VICTORY_MODAL' }
  | { type: 'DISMISS_VICTORY_MODAL' }
  | { type: 'RESET_GAME_FULL' };
