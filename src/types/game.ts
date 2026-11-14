import { SolarStormData } from '../utils/nasaApi';
import type { ScienceBadgeType } from '../data/science';

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
  // Detailed Space Eco-Nutrition Telemetry (optional for backward compatibility)
  kcal?: number;
  fatsGrams?: number;
  fiberGrams?: number;
  massGrams?: number;
  shelfLifeMonths?: number;
  originTag?: 'egypt_sinai' | 'hydroponic' | 'nasa_standard';
  badgeType?: ScienceBadgeType;
  micronutrientsAr?: string[];
  crumbRating?: 'zero_crumbs' | 'high_crumbs';
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

export type CampaignLevelId = 1 | 2 | 3 | 4;

export type MiniGameId =
  | 'l1_food_prep'
  | 'l1_equipment_prep'
  | 'l1_medical_check'
  | 'l1_spaceship_inspect'
  | 'l1_mission_launch'
  | 'l2_zerog_movement'
  | 'l2_secure_objects'
  | 'l2_balanced_meal'
  | 'l2_hydration'
  | 'l2_motion_sickness'
  | 'l2_systems_neows'
  | 'l3_resistance_training'
  | 'l3_water_recycling'
  | 'l3_solar_storm'
  | 'l3_eva_prep'
  | 'l3_lunar_samples'
  | 'l4_departure_prep'
  | 'l4_navigation_earth'
  | 'l4_spacecraft_emergency'
  | 'l4_earth_reentry'
  | 'l4_safe_landing';

export type LunarToolId = 'gripper' | 'scoop' | 'hammer' | 'collection_bag';
export type LunarSampleId = 'basalt_rock' | 'regolith_dust' | 'crater_pebbles';

export type CampaignViewMode = 'world_map' | 'level_hub' | 'minigame';

export interface CampaignProgressState {
  viewMode: CampaignViewMode;
  activeLevel: CampaignLevelId;
  activeRoomId: string | null;
  activeMiniGameId: MiniGameId | null;
  unlockedLevels: CampaignLevelId[];
  completedMiniGames: MiniGameId[];
  // Cross-level & cross-minigame continuity
  l1SelectedFoodIds: string[];
  l1FoodWeightKg: number;
  l1EquipmentPacked: string[];
  l1MedicalCleared: boolean;
  l1SpaceshipInspected: boolean;
  l2SecuredObjects: string[];
  l2HydrationPercent: number;
  l2MotionRested: boolean;
  l3BoneMuscleScore: number;
  l3WaterRecycled: boolean;
  l3SolarStormSheltered: boolean;
  l3EvaSuitAssembled: boolean;
  l3PackedTools: LunarToolId[];
  l3CollectedSamples: LunarSampleId[];
  l3ReturnAuthorized: boolean;
  l4SamplesVerified: boolean;
  l4NavigationAligned: boolean;
  l4EmergencyRepaired: boolean;
  l4ReentrySafe: boolean;
  l4MissionAccomplished: boolean;
  // Self-Sustaining Hydroponic Bio-Cabin & Power Trade-Offs
  ecoLedActive?: boolean;
  ecoNutrientOk?: boolean;
  ecoWaterRecyclingOk?: boolean;
  ecoCropsHarvested?: string[];
  ecoPowerSplit?: { water: number; hydro: number; shield: number };
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
  campaign?: CampaignProgressState;
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
  | { type: 'RESET_GAME_FULL' }
  // 4-LEVEL / 21-MINIGAME CAMPAIGN ACTIONS
  | { type: 'SET_CAMPAIGN_VIEW'; payload: { viewMode: CampaignViewMode; levelId?: CampaignLevelId; roomId?: string | null; miniGameId?: MiniGameId | null } }
  | { type: 'COMPLETE_CAMPAIGN_MINIGAME'; payload: { miniGameId: MiniGameId; patch?: Partial<CampaignProgressState> } }
  | { type: 'UPDATE_CAMPAIGN_STATE'; payload: Partial<CampaignProgressState> }
  | { type: 'UNLOCK_CAMPAIGN_LEVEL'; payload: CampaignLevelId }
  | { type: 'AUTHORIZE_LUNAR_RETURN' };
