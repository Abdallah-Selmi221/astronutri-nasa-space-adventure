import {
  EARTH_L1_PADS,
  EARTH_L1_ROADS,
  evalEarthL1RoadInfo,
  evalHubRoadInfo,
  evalOverworldTerrainHeight,
  evalRoadNetwork,
  evalSectorFloorHeight,
  HUB_PADS,
  HUB_ROADS,
  PadZone,
  RoadSegment
} from './terrainMath';

export type EarthWorldMode = 'earth_l1' | 'academy_hub';

export interface GroundedPropPlacement {
  x: number;
  y: number;
  z: number;
  rotY: number;
  scale: number;
  scaleY?: number;
  colorIdx: number;
  sinkDepth: number;
  footprintRadius: number;
}

export interface DiscoveryKioskPlacement {
  id: string;
  x: number;
  y: number;
  z: number;
  rotY: number;
}

export interface EarthWorldLayout {
  mode: EarthWorldMode;
  worldSize: number;
  trees: GroundedPropPlacement[];
  bushes: GroundedPropPlacement[];
  cliffs: GroundedPropPlacement[];
  grassTufts: GroundedPropPlacement[];
  lampposts: GroundedPropPlacement[];
  kiosks: DiscoveryKioskPlacement[];
}

function makeSeededRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function minTerrainHeightInFootprint(
  evalHeight: (x: number, z: number) => number,
  x: number,
  z: number,
  radius: number
): number {
  let minY = evalHeight(x, z);
  if (radius <= 0.05) return minY;
  const samples: [number, number][] = [
    [x - radius, z],
    [x + radius, z],
    [x, z - radius],
    [x, z + radius],
    [x - radius * 0.7, z - radius * 0.7],
    [x + radius * 0.7, z - radius * 0.7],
    [x - radius * 0.7, z + radius * 0.7],
    [x + radius * 0.7, z + radius * 0.7]
  ];
  for (let i = 0; i < samples.length; i++) {
    const sy = evalHeight(samples[i][0], samples[i][1]);
    if (sy < minY) minY = sy;
  }
  return minY;
}

function isClearOfPadsAndRoads(
  x: number,
  z: number,
  pads: readonly PadZone[],
  roads: readonly RoadSegment[],
  roadMargin: number,
  padMargin: number
): boolean {
  const r = evalRoadNetwork(x, z, roads);
  if (r.dist < r.halfWidth + roadMargin) return false;
  for (let i = 0; i < pads.length; i++) {
    const p = pads[i];
    if (Math.hypot(x - p.x, z - p.z) < p.flatRadius + padMargin) return false;
  }
  return true;
}

/**
 * Generates deterministic, slope-embedded ("ZERO Floating Props") placement arrays
 * for both Earth Level 1 Valley and the Sunlit Astronaut Academy Main Hub.
 */
export function generateEarthWorldLayout(mode: EarthWorldMode): EarthWorldLayout {
  const isL1 = mode === 'earth_l1';
  const worldSize = isL1 ? 320 : 280;
  const pads = isL1 ? EARTH_L1_PADS : HUB_PADS;
  const roads = isL1 ? EARTH_L1_ROADS : HUB_ROADS;
  const evalHeight = isL1
    ? (x: number, z: number) => evalSectorFloorHeight(1, x, z)
    : evalOverworldTerrainHeight;
  const evalRoad = isL1 ? evalEarthL1RoadInfo : evalHubRoadInfo;

  const rng = makeSeededRng(isL1 ? 202601 : 202602);
  const trees: GroundedPropPlacement[] = [];
  const bushes: GroundedPropPlacement[] = [];
  const cliffs: GroundedPropPlacement[] = [];
  const grassTufts: GroundedPropPlacement[] = [];
  const lampposts: GroundedPropPlacement[] = [];

  const targetTrees = isL1 ? 96 : 72;
  const maxSpawnR = isL1 ? 112 : 92;

  // 1. Multi-canopy rounded trees (sunk -0.28m below min footprint elevation)
  let tries = 0;
  while (trees.length < targetTrees && tries < 4000) {
    tries++;
    const x = (rng() - 0.5) * maxSpawnR * 2.0;
    const z = (rng() - 0.5) * maxSpawnR * 1.85;
    if (Math.hypot(x, z) > maxSpawnR) continue;
    if (!isClearOfPadsAndRoads(x, z, pads, roads, 3.4, 3.6)) continue;

    // Avoid crowding other trees
    let tooClose = false;
    for (let i = 0; i < trees.length; i++) {
      if (Math.hypot(x - trees[i].x, z - trees[i].z) < 6.4) {
        tooClose = true;
        break;
      }
    }
    if (tooClose) continue;

    const baseH = evalHeight(x, z);
    if (baseH > 15.0) continue;

    const sinkDepth = 0.28;
    const footMinY = minTerrainHeightInFootprint(evalHeight, x, z, 0.9);
    const scale = 1.05 + rng() * 0.65;
    // Palette distribution: 0..2 greens (~58%), 3..4 golden-orange (~22%), 5..6 blossom pink (~20%)
    const roll = rng();
    const colorIdx =
      roll < 0.58 ? Math.floor(rng() * 3) : roll < 0.80 ? 3 + Math.floor(rng() * 2) : 5 + Math.floor(rng() * 2);

    trees.push({
      x,
      y: footMinY - sinkDepth,
      z,
      rotY: rng() * Math.PI * 2,
      scale,
      colorIdx,
      sinkDepth,
      footprintRadius: 0.9
    });
  }

  // 2. Flowering bushes (sunk -0.24m below min footprint)
  const targetBushes = isL1 ? 120 : 90;
  tries = 0;
  while (bushes.length < targetBushes && tries < 3600) {
    tries++;
    // Half near scenic road shoulders, half scattered across meadow clearings & under trees
    let x: number;
    let z: number;
    if (tries % 2 === 0 && trees.length > 0) {
      const t = trees[tries % trees.length];
      const ang = rng() * Math.PI * 2;
      const d = 2.6 + rng() * 3.8;
      x = t.x + Math.cos(ang) * d;
      z = t.z + Math.sin(ang) * d;
    } else {
      x = (rng() - 0.5) * maxSpawnR * 1.7;
      z = (rng() - 0.5) * maxSpawnR * 1.6;
    }
    if (!isClearOfPadsAndRoads(x, z, pads, roads, 1.75, 1.8)) continue;
    const baseH = evalHeight(x, z);
    if (baseH > 12.0) continue;

    const sinkDepth = 0.24;
    const footMinY = minTerrainHeightInFootprint(evalHeight, x, z, 0.55);
    bushes.push({
      x,
      y: footMinY - sinkDepth,
      z,
      rotY: rng() * Math.PI * 2,
      scale: 0.85 + rng() * 0.6,
      colorIdx: bushes.length % 4,
      sinkDepth,
      footprintRadius: 0.55
    });
  }

  // 3. Stratified Rock Cliff Clusters (deeply embedded -0.45m below lowest footprint point -> ZERO floating rocks!)
  const targetCliffs = isL1 ? 48 : 38;
  tries = 0;
  while (cliffs.length < targetCliffs && tries < 3000) {
    tries++;
    const isOuter = cliffs.length >= 10;
    const ang = rng() * Math.PI * 2;
    const rad = isOuter ? (isL1 ? 74 + rng() * 44 : 54 + rng() * 38) : isL1 ? 36 + rng() * 36 : 28 + rng() * 26;
    const x = Math.cos(ang) * rad;
    const z = Math.sin(ang) * rad;
    if (!isClearOfPadsAndRoads(x, z, pads, roads, 4.0, 4.2)) continue;

    let clash = false;
    for (let i = 0; i < cliffs.length; i++) {
      if (Math.hypot(x - cliffs[i].x, z - cliffs[i].z) < 7.5) {
        clash = true;
        break;
      }
    }
    if (clash) continue;

    const scale = 1.1 + rng() * 1.15;
    const footprintRadius = 2.0 * Math.min(scale, 1.6);
    const sinkDepth = 0.45;
    const footMinY = minTerrainHeightInFootprint(evalHeight, x, z, footprintRadius);

    cliffs.push({
      x,
      y: footMinY - sinkDepth,
      z,
      rotY: rng() * Math.PI * 2,
      scale,
      scaleY: 0.9 + rng() * 0.55,
      colorIdx: cliffs.length % 3,
      sinkDepth,
      footprintRadius
    });
  }

  // 4. Dense Stylized Grass Clusters (2,950 on L1, 2,600 on Hub) — concentrated along scenic road verges, meadow clearings & slopes
  const targetGrass = isL1 ? 2950 : 2600;
  const nearTarget = Math.round(targetGrass * 0.74);
  const grassRadiusMax = isL1 ? 84 : 70;
  tries = 0;
  while (grassTufts.length < targetGrass && tries < 36000) {
    tries++;
    let x: number;
    let z: number;
    if (grassTufts.length < nearTarget && roads.length > 0) {
      // Cluster richly along road edges and central meadow vistas where the player walks & drives
      const seg = roads[tries % roads.length];
      const u = rng();
      const side = rng() < 0.5 ? 1 : -1;
      const distOut = seg.halfWidth + 1.15 + rng() * 16.0;
      const dx = seg.bx - seg.ax;
      const dz = seg.bz - seg.az;
      const len = Math.hypot(dx, dz) || 1;
      const nx = -dz / len;
      const nz = dx / len;
      x = seg.ax + dx * u + nx * side * distOut + (rng() - 0.5) * 4.5;
      z = seg.az + dz * u + nz * side * distOut + (rng() - 0.5) * 4.5;
    } else {
      x = (rng() - 0.5) * grassRadiusMax * 2.0;
      z = (rng() - 0.5) * grassRadiusMax * 1.9;
    }
    if (Math.hypot(x, z) > grassRadiusMax) continue;
    const roadInfo = evalRoad(x, z);
    if (roadInfo.dist < roadInfo.halfWidth + 0.95) continue;

    let insidePad = false;
    for (let i = 0; i < pads.length; i++) {
      const p = pads[i];
      if (Math.hypot(x - p.x, z - p.z) < p.flatRadius + 0.4) {
        insidePad = true;
        break;
      }
    }
    if (insidePad) continue;

    const y = evalHeight(x, z);
    if (y > 9.5) continue;

    const footprintRadius = 0.28;
    const sinkDepth = 0.08;
    const footMinY = minTerrainHeightInFootprint(evalHeight, x, z, footprintRadius);
    const edgeBonus = roadInfo.dist < roadInfo.halfWidth + 5.5 ? 1.16 : 1.0;
    grassTufts.push({
      x,
      y: footMinY - sinkDepth,
      z,
      rotY: rng() * Math.PI * 2,
      scale: (0.95 + rng() * 0.65) * edgeBonus,
      colorIdx: grassTufts.length % 4,
      sinkDepth,
      footprintRadius
    });
  }

  // 5. Solar Spaceport Road Lampposts (placed neatly along main road shoulders)
  for (let sIdx = 0; sIdx < roads.length; sIdx++) {
    const seg = roads[sIdx];
    if (seg.isMainRoad === false) continue;
    const dx = seg.bx - seg.ax;
    const dz = seg.bz - seg.az;
    const len = Math.hypot(dx, dz);
    if (len < 12) continue;
    const nx = -dz / len;
    const nz = dx / len;
    const count = len > 28 ? 2 : 1;
    for (let c = 0; c < count; c++) {
      const t = count === 1 ? 0.5 : c === 0 ? 0.34 : 0.66;
      const side = (sIdx + c) % 2 === 0 ? 1 : -1;
      const offset = seg.halfWidth + 1.25;
      const lx = seg.ax + dx * t + nx * side * offset;
      const lz = seg.az + dz * t + nz * side * offset;

      // Skip if too close to any pad center or another road intersection
      const checkRoad = evalRoadNetwork(lx, lz, roads);
      if (checkRoad.dist < checkRoad.halfWidth + 0.75) continue;
      let onPad = false;
      for (let p = 0; p < pads.length; p++) {
        if (Math.hypot(lx - pads[p].x, lz - pads[p].z) < pads[p].flatRadius - 0.5) {
          onPad = true;
          break;
        }
      }
      if (onPad) continue;

      const sinkDepth = 0.25;
      const minY = minTerrainHeightInFootprint(evalHeight, lx, lz, 0.35);
      lampposts.push({
        x: lx,
        y: minY - sinkDepth,
        z: lz,
        rotY: Math.atan2(-nx * side, -nz * side),
        scale: 1.0,
        colorIdx: 0,
        sinkDepth,
        footprintRadius: 0.35
      });
    }
  }

  // 6. Discovery Kiosks (L1 side scenic overlooks / Hub Space Museum terrace)
  const kioskIds = isL1
    ? ['kiosk_earth_food', 'kiosk_earth_suit', 'kiosk_earth_rocket']
    : ['hub_space_museum'];
  const kiosks: DiscoveryKioskPlacement[] = kioskIds.map((kid) => {
    const pad = pads.find((p) => p.id === kid) || pads[0];
    const minY = minTerrainHeightInFootprint(evalHeight, pad.x, pad.z, 1.2);
    const fx = pad.facingX ?? 0;
    const fz = pad.facingZ ?? 0;
    return {
      id: kid,
      x: pad.x,
      y: minY - 0.16,
      z: pad.z,
      rotY: Math.atan2(fx - pad.x, fz - pad.z)
    };
  });

  return {
    mode,
    worldSize,
    trees,
    bushes,
    cliffs,
    grassTufts,
    lampposts,
    kiosks
  };
}
