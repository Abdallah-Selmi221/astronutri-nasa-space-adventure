import { CampaignLevelId } from '../../types/game';

export interface OverworldSector {
  id: CampaignLevelId;
  x: number;
  z: number;
  y: number;
  rad: number;
}

// Mirrors SECTORS in scripts/generate_massive_island_mcp.py with y_blender = -z_three
export const OVERWORLD_SECTORS: OverworldSector[] = [
  { id: 1, x: -11.0, z: 2.0, y: -0.4, rad: 2.8 },
  { id: 2, x: -3.8, z: -1.8, y: 1.8, rad: 2.5 },
  { id: 3, x: 3.8, z: 1.6, y: 2.0, rad: 2.7 },
  { id: 4, x: 11.0, z: -1.6, y: -0.3, rad: 2.7 }
];

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / Math.max(1e-6, edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function ridgeNoise(x: number, yb: number): number {
  return (
    Math.sin(x * 0.42 + yb * 0.25) * 0.45 +
    Math.cos(x * 0.85 - yb * 0.62) * 0.28 +
    Math.sin((x + yb) * 1.15) * 0.16
  );
}

function distToRoadSpline(x: number, yb: number): { dist: number; interpZ: number } {
  let best = 999;
  let interpZ = 0;
  for (let i = 0; i < OVERWORLD_SECTORS.length - 1; i++) {
    const ax = OVERWORLD_SECTORS[i].x;
    const ay = -OVERWORLD_SECTORS[i].z;
    const az = OVERWORLD_SECTORS[i].y;
    const bx = OVERWORLD_SECTORS[i + 1].x;
    const by = -OVERWORLD_SECTORS[i + 1].z;
    const bz = OVERWORLD_SECTORS[i + 1].y;
    const dx = bx - ax;
    const dy = by - ay;
    const l2 = dx * dx + dy * dy;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (yb - ay) * dy) / Math.max(1e-6, l2)));
    const px = ax + dx * t;
    const py = ay + dy * t;
    const d = Math.hypot(x - px, yb - py);
    if (d < best) {
      best = d;
      interpZ = az * (1 - t) + bz * t;
    }
  }
  return { dist: best, interpZ };
}

/**
 * Computes exact surface Y height on massive_space_island_world.glb at Three.js world (x, z)
 * so the 3D SPACE-FIT X Astronaut walks cleanly up hills, into lunar craters, and across Laser Bridges.
 */
export function evalOverworldTerrainHeight(x: number, z: number): number {
  const yb = -z;
  const baseZ = -0.35 + 1.85 * Math.exp(-Math.pow(x / 7.2, 2));
  const hills = ridgeNoise(x, yb);
  const northRidge = smoothstep(1.8, 5.2, yb) * (1.85 + Math.max(0, hills) * 1.1);
  const southRoll = -smoothstep(-3.0, -6.0, yb) * 0.55;

  const canyon1 = 1.15 * Math.exp(-Math.pow((x + 7.4) / 1.35, 2));
  const canyon2 = 1.25 * Math.exp(-Math.pow(x / 1.4, 2));
  const canyon3 = 1.15 * Math.exp(-Math.pow((x - 7.4) / 1.35, 2));

  const dMoon = Math.hypot(x - 3.8, yb + 1.6);
  const craterRim = 0.72 * Math.exp(-Math.pow((dMoon - 3.0) / 0.85, 2));

  let h = baseZ + hills * 0.52 + northRidge + southRoll + craterRim - (canyon1 + canyon2 + canyon3);

  for (const s of OVERWORLD_SECTORS) {
    const syb = -s.z;
    const d = Math.hypot(x - s.x, yb - syb);
    const w = 1 - smoothstep(s.rad * 0.65, s.rad * 1.45, d);
    h = h * (1 - w) + (s.y - 0.1) * w;
  }

  const road = distToRoadSpline(x, yb);
  const wRoad = (1 - smoothstep(0.45, 1.45, road.dist)) * 0.65;
  h = h * (1 - wRoad) + road.interpZ * wRoad;

  // Bridge deck elevation across the 3 inter-sector spans
  if (road.dist < 0.75) {
    return Math.max(h, road.interpZ - 0.08);
  }
  return h;
}

/**
 * Checks whether overworld point (x, z) is within the sculpted Terra-Island silhouette
 * and guards locked Laser Energy Bridges until their destination sector is unlocked.
 */
export function clampOverworldPosition(
  x: number,
  z: number,
  unlockedLevels: CampaignLevelId[]
): { x: number; z: number; blockedBySector: CampaignLevelId | null } {
  const maxUnlocked = Math.max(...unlockedLevels, 1) as CampaignLevelId;
  // Bridge gate boundaries between Sector 1->2 (x~-7.4), 2->3 (x~0.0), 3->4 (x~7.4)
  let maxAllowedX = 14.4;
  let blockedBySector: CampaignLevelId | null = null;
  if (maxUnlocked < 2) maxAllowedX = -7.6;
  else if (maxUnlocked < 3) maxAllowedX = -0.3;
  else if (maxUnlocked < 4) maxAllowedX = 7.1;

  let clampedX = Math.max(-14.4, Math.min(14.4, x));
  if (clampedX > maxAllowedX && !unlockedLevels.includes(4)) {
    clampedX = maxAllowedX;
    blockedBySector = (maxUnlocked + 1) as CampaignLevelId;
  }

  const spineYb = Math.sin(clampedX * 0.22) * 1.45;
  const maxZSpan = 5.15;
  const minZ = -(spineYb + maxZSpan);
  const maxZ = -(spineYb - maxZSpan);
  const clampedZ = Math.max(minZ, Math.min(maxZ, z));

  return { x: clampedX, z: clampedZ, blockedBySector };
}

/**
 * Computes exact surface elevation inside Sculpted Stage 2 Biome Worlds (sector1..4_*.glb)
 * mirroring generate_stage2_biomes_mcp.py with yb = -z so central promenade stays flat at 0
 * while hills, craters, and canyons undulate smoothly around it.
 */
export function evalSectorFloorHeight(levelId: CampaignLevelId, x: number, z: number): number {
  const yb = -z;
  const px = smoothstep(17.0, 22.0, Math.abs(x));
  const py = smoothstep(8.2, 13.0, Math.abs(yb));
  const outPlaza = Math.max(px, py);

  if (levelId === 1) {
    const cliffX = smoothstep(35.0, 56.0, Math.abs(x));
    const cliffY = smoothstep(23.5, 48.0, Math.abs(yb));
    const cliff = Math.max(cliffX, cliffY);
    const hills =
      Math.sin(x * 0.13 + yb * 0.09) * 0.85 +
      Math.cos(x * 0.21 - yb * 0.16) * 0.55 +
      0.55;
    const cliffRidge = cliff * (9.2 + 2.4 * Math.sin(x * 0.18) * Math.cos(yb * 0.18));
    return outPlaza * (Math.max(0.0, hills) * 1.15 + cliffRidge);
  }

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
