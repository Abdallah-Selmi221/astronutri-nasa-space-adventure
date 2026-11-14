import { CargoItemEntry, FoodItem } from '../types/game';

export type PhaserRoboState =
  | 'IDLE'
  | 'WALKING'
  | 'RUNNING'
  | 'FLYING'
  | 'TALKING'
  | 'HAPPY'
  | 'WARNING'
  | 'CELEBRATING'
  | 'WAVING'
  | 'POINTING'
  | 'HOPPING';

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EventListenerFn = (...args: any[]) => void;

/**
 * Lightweight zero-dependency EventEmitter bridging React UI and lazy-loaded Phaser 3 Scenes
 * without pulling the Phaser engine into the initial application bundle.
 */
class LightweightEventBus {
  private listeners: Map<string, Set<EventListenerFn>> = new Map();

  public on(event: string, fn: EventListenerFn): this {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(fn);
    return this;
  }

  public off(event: string, fn: EventListenerFn): this {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(fn);
      if (set.size === 0) {
        this.listeners.delete(event);
      }
    }
    return this;
  }

  public emit(event: string, ...args: unknown[]): boolean {
    const set = this.listeners.get(event);
    if (!set || set.size === 0) return false;
    Array.from(set).forEach((fn) => fn(...args));
    return true;
  }
}

export const EventBus = new LightweightEventBus();
