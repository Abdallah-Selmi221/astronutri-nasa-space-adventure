import Phaser from 'phaser';
import { CargoItemEntry, FoodItem } from '../types/game';

export type PhaserRoboState =
  | 'IDLE'
  | 'FLYING'
  | 'TALKING'
  | 'HAPPY'
  | 'WARNING'
  | 'CELEBRATING';

export interface NutritionPackedPayload {
  item: FoodItem;
}

export interface NutritionBannedPayload {
  item: FoodItem;
}

export interface NutritionCargoFullPayload {
  item: FoodItem;
}

export interface NutritionCargoDuplicatePayload {
  item: FoodItem;
}

export interface NutritionInspectPayload {
  item: FoodItem;
}

export interface NutritionSyncCargoPayload {
  cargoItems: CargoItemEntry[];
  stars: number;
}

export interface NutritionRoboStatePayload {
  state: PhaserRoboState;
  targetX?: number;
  targetY?: number;
}

/**
 * Shared Phaser.Events.EventEmitter singleton bridging React UI and Phaser 3 Scenes.
 */
export const EventBus = new Phaser.Events.EventEmitter();
