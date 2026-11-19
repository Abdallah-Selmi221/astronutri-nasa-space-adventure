import { CampaignLevelId } from '../../types/game';

export interface OverworldSector {
  id: CampaignLevelId;
  x: number;
  z: number;
  y: number;
  rad: number;
}

export interface RoadSegment {
  ax: number;
  az: number;
  ay: number;
  bx: number;
  bz: number;
  by: number;
  halfWidth: number;
  isMainRoad?: boolean;
}

export interface PadZone {
  id: string;
  x: number;
  z: number;
  y: number;
  flatRadius: number;
  blendRadius: number;
  facingX?: number;
  facingZ?: number;
}

export interface RoadEvalResult {
  dist: number;
  edgeDist: number;
  elevation: number;
  halfWidth: number;
  isMainRoad: boolean;
  isPaved: boolean;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / Math.max(1e-6, edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export function evalRoadNetwork(x: number, z: number, segments: readonly RoadSegment[]): RoadEvalResult {
  let bestEdgeDist = Infinity;
  let bestDist = Infinity;
  let bestElev = 0;
  let bestHalfWidth = 3.5;
  let bestMain = true;

  for (let i = 0; i < segments.length; i++) {
    const s = segments[i];
    const dx = s.bx - s.ax;
    const dz = s.bz - s.az;
    const lenSq = dx * dx + dz * dz;
    const t = Math.max(0, Math.min(1, ((x - s.ax) * dx + (z - s.az) * dz) / Math.max(1e-6, lenSq)));
    const px = s.ax + dx * t;
    const pz = s.az + dz * t;
    const d = Math.hypot(x - px, z - pz);
    const edgeDist = d - s.halfWidth;
    if (edgeDist < bestEdgeDist) {
      bestEdgeDist = edgeDist;
      bestDist = d;
      bestElev = s.ay * (1 - t) + s.by * t;
      bestHalfWidth = s.halfWidth;
      bestMain = s.isMainRoad !== false;
    }
  }

  return {
    dist: bestDist,
    edgeDist: bestEdgeDist,
    elevation: bestElev,
    halfWidth: bestHalfWidth,
    isMainRoad: bestMain,
    isPaved: bestEdgeDist <= 0
  };
}

// ==================== PHASE 2: EARTH LEVEL 1 SPACEPORT VALLEY (~320m Scale) ====================
export const EARTH_L1_WORLD_SIZE = 320;
export const EARTH_L1_PLAY_BOUNDS = {
  minX: -94,
  maxX: 94,
  minZ: -80,
  maxZ: 64
} as const;

export const EARTH_L1_PADS: readonly PadZone[] = [
  { id: 'spawn_garage', x: 0, z: 32, y: 0.0, flatRadius: 11.5, blendRadius: 19.5, facingX: 0, facingZ: 0 },
  { id: 'food_storage', x: -48, z: -4, y: 0.5, flatRadius: 10.5, blendRadius: 18.0, facingX: -39, facingZ: 5 },
  { id: 'equipment_room', x: -12, z: -38, y: 1.1, flatRadius: 11.5, blendRadius: 19.0, facingX: -12, facingZ: -24 },
  { id: 'medical_room', x: 36, z: -34, y: 1.1, flatRadius: 10.8, blendRadius: 18.5, facingX: 34, facingZ: -20 },
  { id: 'launch_area', x: 68, z: 12, y: 0.6, flatRadius: 12.8, blendRadius: 21.5, facingX: 54, facingZ: 13 },
  { id: 'kiosk_earth_food', x: -26, z: 26, y: 0.35, flatRadius: 3.4, blendRadius: 8.5, facingX: -20, facingZ: 16 },
  { id: 'kiosk_earth_suit', x: 12, z: -46, y: 1.35, flatRadius: 3.4, blendRadius: 8.5, facingX: 12, facingZ: -32 },
  { id: 'kiosk_earth_rocket', x: 40, z: 34, y: 0.45, flatRadius: 3.4, blendRadius: 8.5, facingX: 34, facingZ: 24 }
];

export const EARTH_L1_ROADS: readonly RoadSegment[] = [
  // Main Spaceport Loop connecting Garage -> Kitchen -> Hangar -> Medical -> Launchpad -> Garage
  { ax: 0, az: 38, ay: 0.0, bx: 0, bz: 26, by: 0.05, halfWidth: 4.0, isMainRoad: true },
  { ax: 0, az: 26, ay: 0.05, bx: -22, bz: 16, by: 0.28, halfWidth: 3.9, isMainRoad: true },
  { ax: -22, az: 16, ay: 0.28, bx: -41.5, bz: 2.5, by: 0.5, halfWidth: 3.9, isMainRoad: true },
  { ax: -41.5, az: 2.5, ay: 0.5, bx: -32, bz: -16, by: 0.85, halfWidth: 3.9, isMainRoad: true },
  { ax: -32, az: -16, ay: 0.85, bx: -12, bz: -28.5, by: 1.1, halfWidth: 3.9, isMainRoad: true },
  { ax: -12, az: -28.5, ay: 1.1, bx: 12, bz: -28, by: 1.15, halfWidth: 3.9, isMainRoad: true },
  { ax: 12, az: -28, ay: 1.15, bx: 34.5, bz: -25, by: 1.1, halfWidth: 3.9, isMainRoad: true },
  { ax: 34.5, az: -25, ay: 1.1, bx: 50, bz: -6, by: 0.85, halfWidth: 3.9, isMainRoad: true },
  { ax: 50, az: -6, ay: 0.85, bx: 56, bz: 12.8, by: 0.6, halfWidth: 4.1, isMainRoad: true },
  { ax: 56, az: 12.8, ay: 0.6, bx: 34, bz: 24, by: 0.25, halfWidth: 3.9, isMainRoad: true },
  { ax: 34, az: 24, ay: 0.25, bx: 0, bz: 26, by: 0.05, halfWidth: 3.9, isMainRoad: true },
  // Scenic gravel/path spurs to Discovery Kiosks
  { ax: -22, az: 16, ay: 0.28, bx: -26, bz: 26, by: 0.35, halfWidth: 2.2, isMainRoad: false },
  { ax: 12, az: -28, ay: 1.15, bx: 12, bz: -46, by: 1.35, halfWidth: 2.2, isMainRoad: false },
  { ax: 34, az: 24, ay: 0.25, bx: 40, bz: 34, by: 0.45, halfWidth: 2.2, isMainRoad: false }
];

function evalValleyHeightWithLayout(
  x: number,
  z: number,
  pads: readonly PadZone[],
  roads: readonly RoadSegment[],
  rimStartRad: number,
  rimEndRad: number,
  ridgeAmp: number
): number {
  // Base sunlit meadow hills
  const meadow =
    Math.sin(x * 0.048 + z * 0.036) * 1.15 +
    Math.cos(x * 0.072 - z * 0.058) * 0.78 +
    Math.sin(x * 0.14 + z * 0.11) * 0.28 +
    1.15;

  // Valley perimeter foothills + alpine outer rim
  const rEllip = Math.hypot(x * 0.92, z * 1.05);
  const footMix = smoothstep(rimStartRad, rimEndRad, rEllip);
  const outerPeak = smoothstep(rimEndRad - 12, rimEndRad + 42, rEllip);
  const ridgeDetail =
    1.0 +
    0.34 * Math.sin(Math.atan2(z, x) * 7.0 + rEllip * 0.05) +
    0.22 * Math.cos(Math.atan2(z, x) * 11.0 - x * 0.04);
  const hillsH = Math.max(0.25, meadow) + footMix * 11.5 * ridgeDetail + outerPeak * ridgeAmp * ridgeDetail;

  let h = hillsH;

  // Smoothly terrace road corridor onto natural valley elevation
  const road = evalRoadNetwork(x, z, roads);
  const roadBlend = 1.0 - smoothstep(road.halfWidth + 0.8, road.halfWidth + 7.2, road.dist);
  h = h * (1 - roadBlend * 0.96) + road.elevation * (roadBlend * 0.96);

  // Building / Gateway / Garage flat aprons
  for (let i = 0; i < pads.length; i++) {
    const p = pads[i];
    const d = Math.hypot(x - p.x, z - p.z);
    if (d < p.blendRadius) {
      const w = 1.0 - smoothstep(p.flatRadius, p.blendRadius, d);
      h = h * (1 - w) + p.y * w;
    }
  }

  return h;
}

export function evalEarthL1RoadInfo(x: number, z: number): RoadEvalResult {
  return evalRoadNetwork(x, z, EARTH_L1_ROADS);
}

export function isEarthL1ClearOfPaved(x: number, z: number, margin = 2.0): boolean {
  const road = evalRoadNetwork(x, z, EARTH_L1_ROADS);
  if (road.dist < road.halfWidth + margin) return false;
  for (let i = 0; i < EARTH_L1_PADS.length; i++) {
    const p = EARTH_L1_PADS[i];
    if (Math.hypot(x - p.x, z - p.z) < p.flatRadius + margin) return false;
  }
  return true;
}

// ==================== PHASE 2: SUNLIT ASTRONAUT ACADEMY MAIN HUB (~280m Scale) ====================
export const HUB_WORLD_SIZE = 280;
export const HUB_PLAY_RADIUS = 58;

export const OVERWORLD_SECTORS: OverworldSector[] = [
  { id: 1, x: -34.0, z: 10.0, y: 0.25, rad: 6.8 },
  { id: 2, x: -20.0, z: -32.0, y: 0.65, rad: 6.8 },
  { id: 3, x: 22.0, z: -32.0, y: 0.65, rad: 6.8 },
  { id: 4, x: 34.0, z: 10.0, y: 0.25, rad: 6.8 }
];

export const HUB_PADS: readonly PadZone[] = [
  { id: 'central_plaza', x: 0, z: 8, y: 0.0, flatRadius: 11.0, blendRadius: 18.5, facingX: 0, facingZ: -16 },
  { id: 'academy_hq', x: 0, z: -16, y: 0.25, flatRadius: 15.5, blendRadius: 23.0, facingX: 0, facingZ: 8 },
  { id: 'hub_garage', x: 10, z: -7, y: 0.2, flatRadius: 8.5, blendRadius: 14.5, facingX: 10, facingZ: 8 },
  { id: 'gateway_1', x: -34, z: 10, y: 0.25, flatRadius: 7.4, blendRadius: 14.0, facingX: 0, facingZ: 8 },
  { id: 'gateway_2', x: -20, z: -32, y: 0.65, flatRadius: 7.4, blendRadius: 14.0, facingX: 0, facingZ: 8 },
  { id: 'gateway_3', x: 22, z: -32, y: 0.65, flatRadius: 7.4, blendRadius: 14.0, facingX: 0, facingZ: 8 },
  { id: 'gateway_4', x: 34, z: 10, y: 0.25, flatRadius: 7.4, blendRadius: 14.0, facingX: 0, facingZ: 8 },
  { id: 'hub_space_museum', x: 0, z: 33, y: 0.15, flatRadius: 5.5, blendRadius: 11.0, facingX: 0, facingZ: 8 }
];

export const HUB_ROADS: readonly RoadSegment[] = [
  { ax: 0, az: -9, ay: 0.22, bx: 0, bz: 8, by: 0.0, halfWidth: 4.2, isMainRoad: true },
  { ax: 0, az: 8, ay: 0.0, bx: -34, bz: 10, by: 0.25, halfWidth: 3.4, isMainRoad: true },
  { ax: 0, az: 8, ay: 0.0, bx: -14, bz: -6, by: 0.25, halfWidth: 3.4, isMainRoad: true },
  { ax: -14, az: -6, ay: 0.25, bx: -20, bz: -32, by: 0.65, halfWidth: 3.4, isMainRoad: true },
  { ax: 0, az: 8, ay: 0.0, bx: 15, bz: -6, by: 0.25, halfWidth: 3.4, isMainRoad: true },
  { ax: 15, az: -6, ay: 0.25, bx: 22, bz: -32, by: 0.65, halfWidth: 3.4, isMainRoad: true },
  { ax: 0, az: 8, ay: 0.0, bx: 34, bz: 10, by: 0.25, halfWidth: 3.4, isMainRoad: true },
  { ax: 0, az: 8, ay: 0.0, bx: 0, bz: 33, by: 0.15, halfWidth: 2.8, isMainRoad: false }
];

export function evalHubRoadInfo(x: number, z: number): RoadEvalResult {
  return evalRoadNetwork(x, z, HUB_ROADS);
}

export function isHubClearOfPaved(x: number, z: number, margin = 2.0): boolean {
  const road = evalRoadNetwork(x, z, HUB_ROADS);
  if (road.dist < road.halfWidth + margin) return false;
  for (let i = 0; i < HUB_PADS.length; i++) {
    const p = HUB_PADS[i];
    if (Math.hypot(x - p.x, z - p.z) < p.flatRadius + margin) return false;
  }
  return true;
}

/**
 * Exact surface Y height inside the sunlit Astronaut Academy Main Hub at Three.js world (x, z).
 */
export function evalOverworldTerrainHeight(x: number, z: number): number {
  return evalValleyHeightWithLayout(x, z, HUB_PADS, HUB_ROADS, 54, 96, 16);
}

/**
 * Central-difference terrain surface normal in Main Hub for Space Buggy wheel/chassis slope alignment.
 */
export function evalOverworldTerrainNormal(x: number, z: number): { x: number; y: number; z: number } {
  const eps = 0.5;
  const hL = evalOverworldTerrainHeight(x - eps, z);
  const hR = evalOverworldTerrainHeight(x + eps, z);
  const hD = evalOverworldTerrainHeight(x, z - eps);
  const hU = evalOverworldTerrainHeight(x, z + eps);
  const nx = hL - hR;
  const ny = 2 * eps;
  const nz = hD - hU;
  const len = Math.hypot(nx, ny, nz) || 1;
  return { x: nx / len, y: ny / len, z: nz / len };
}

/**
 * Clamps astronaut / buggy movement to the sunlit Academy Hub valley perimeter.
 * Free exploration across the Hub is unrestricted; sequential mission locks are enforced
 * on gateway entry so players can freely explore all scenery and kiosks.
 */
export function clampOverworldPosition(
  x: number,
  z: number,
  _unlockedLevels: CampaignLevelId[]
): { x: number; z: number; blockedBySector: CampaignLevelId | null } {
  const dist = Math.hypot(x, z);
  if (dist > HUB_PLAY_RADIUS) {
    const k = HUB_PLAY_RADIUS / dist;
    return { x: x * k, z: z * k, blockedBySector: null };
  }
  return { x, z, blockedBySector: null };
}

/**
 * Computes exact surface elevation across Campaign Sector Environments:
 * - Level 1: Phase 2 Sunlit Earth Spaceport Valley (~320m scale) synced with EARTH_L1_PADS & EARTH_L1_ROADS
 * - Levels 2, 3, 4: Preserved Stage 2 geometries (left untouched for Phase 3).
 */
export function evalSectorFloorHeight(levelId: CampaignLevelId, x: number, z: number): number {
  if (levelId === 1) {
    return evalValleyHeightWithLayout(x, z, EARTH_L1_PADS, EARTH_L1_ROADS, 76, 128, 19);
  }

  const yb = -z;
  const px = smoothstep(17.0, 22.0, Math.abs(x));
  const py = smoothstep(8.2, 13.0, Math.abs(yb));
  const outPlaza = Math.max(px, py);

  if (levelId === 2) {
    const backRim = smoothstep(9.2, 11.8, Math.abs(yb));
    const sideRim = smoothstep(23.5, 26.0, Math.abs(x));
    return Math.max(backRim, sideRim) * 0.55;
  }

  if (levelId === 3) {
    const cliff = Math.max(smoothstep(37.5, 58.0, Math.abs(x)), smoothstep(25.5, 50.0, Math.abs(yb)));
    const undul = Math.sin(x * 0.14 - yb * 0.11) * 0.72 + Math.cos(x * 0.24 + yb * 0.19) * 0.42;
    const dC1 = Math.hypot(x + 27.0, yb - 16.0);
    const crater1 =
      -0.85 * Math.exp(-Math.pow(dC1 / 6.0, 2)) + 0.65 * Math.exp(-Math.pow((dC1 - 7.5) / 2.2, 2));
    const dC2 = Math.hypot(x - 28.0, yb + 15.0);
    const crater2 =
      -0.85 * Math.exp(-Math.pow(dC2 / 6.2, 2)) + 0.65 * Math.exp(-Math.pow((dC2 - 7.8) / 2.2, 2));
    const rim = cliff * (11.8 + 2.6 * Math.sin(x * 0.15 + yb * 0.17));
    return outPlaza * (undul * 0.58 + crater1 + crater2 + rim);
  }

  // Level 4: Martian Red Canyon & Dunes
  const cliff = Math.max(smoothstep(37.5, 58.0, Math.abs(x)), smoothstep(25.5, 50.0, Math.abs(yb)));
  const dune = Math.sin(x * 0.12 + yb * 0.17) * 0.78 + Math.cos(x * 0.22 - yb * 0.14) * 0.44;
  const canyonWall =
    cliff * 11.2 +
    Math.sin(cliff * 10.0) * 0.35 +
    Math.cos(x * 0.16 - yb * 0.16) * cliff * 2.0;
  return outPlaza * (dune * 0.68 + canyonWall);
}

/**
 * Central-difference terrain surface normal for rover pitch/roll alignment on hills & craters.
 */
export function evalSectorTerrainNormal(
  levelId: CampaignLevelId,
  x: number,
  z: number
): { x: number; y: number; z: number } {
  const eps = 0.45;
  const hL = evalSectorFloorHeight(levelId, x - eps, z);
  const hR = evalSectorFloorHeight(levelId, x + eps, z);
  const hD = evalSectorFloorHeight(levelId, x, z - eps);
  const hU = evalSectorFloorHeight(levelId, x, z + eps);
  const nx = hL - hR;
  const ny = 2 * eps;
  const nz = hD - hU;
  const len = Math.hypot(nx, ny, nz) || 1;
  return { x: nx / len, y: ny / len, z: nz / len };
}
