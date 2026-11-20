import {
  evalMarsL4RoadInfo,
  evalMoonL3RoadInfo,
  evalSectorFloorHeight,
  MARS_L4_PADS,
  MARS_L4_WORLD_SIZE,
  MOON_L3_PADS,
  MOON_L3_WORLD_SIZE
} from './terrainMath';
import {
  DiscoveryKioskPlacement,
  GroundedPropPlacement,
  minTerrainHeightInFootprint
} from './earthWorldLayout';

export type PlanetWorldMode = 'moon_l3' | 'mars_l4';

export interface PlanetWorldLayout {
  mode: PlanetWorldMode;
  worldSize: number;
  rocks: GroundedPropPlacement[];
  commTowers: GroundedPropPlacement[];
  beacons: GroundedPropPlacement[];
  kiosks: DiscoveryKioskPlacement[];
}

function makeDeterministicRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function generatePlanetWorldLayout(mode: PlanetWorldMode): PlanetWorldLayout {
  const isMoon = mode === 'moon_l3';
  const levelId = isMoon ? 3 : 4;
  const worldSize = isMoon ? MOON_L3_WORLD_SIZE : MARS_L4_WORLD_SIZE;
  const pads = isMoon ? MOON_L3_PADS : MARS_L4_PADS;
  const evalHeight = (x: number, z: number) => evalSectorFloorHeight(levelId, x, z);
  const evalRoad = isMoon ? evalMoonL3RoadInfo : evalMarsL4RoadInfo;
  const rng = makeDeterministicRng(isMoon ? 330917 : 440829);

  const isClearOfPadsAndRoads = (x: number, z: number, margin: number): boolean => {
    const road = evalRoad(x, z);
    if (road.dist < road.halfWidth + margin) return false;
    for (let i = 0; i < pads.length; i++) {
      const p = pads[i];
      if (Math.hypot(x - p.x, z - p.z) < p.flatRadius + margin) return false;
    }
    return true;
  };

  // 1. Grounded Crater Boulders (Moon) or Stratified Red Canyon Mesas (Mars)
  const rocks: GroundedPropPlacement[] = [];
  const targetRocks = isMoon ? 56 : 52;
  for (let attempt = 0; attempt < targetRocks * 10 && rocks.length < targetRocks; attempt++) {
    const ringBand = attempt % 3;
    const rad =
      ringBand === 0
        ? 22 + rng() * 34
        : ringBand === 1
        ? 52 + rng() * 24
        : 76 + rng() * 22;
    const ang = rng() * Math.PI * 2;
    const x = Math.cos(ang) * rad;
    const z = Math.sin(ang) * rad * 0.92;
    if (!isClearOfPadsAndRoads(x, z, isMoon ? 4.2 : 5.2)) continue;
    let tooClose = false;
    for (let j = 0; j < rocks.length; j++) {
      if (Math.hypot(x - rocks[j].x, z - rocks[j].z) < (isMoon ? 5.2 : 6.8)) {
        tooClose = true;
        break;
      }
    }
    if (tooClose) continue;

    const scale = isMoon
      ? (ringBand === 2 ? 1.55 : 0.85) + rng() * 0.95
      : (ringBand === 2 ? 1.75 : 1.05) + rng() * 1.15;
    const scaleY = scale * (0.82 + rng() * 0.46);
    const footprintRadius = (isMoon ? 1.45 : 2.1) * scale;
    const minGroundY = minTerrainHeightInFootprint(evalHeight, x, z, footprintRadius);

    rocks.push({
      x,
      y: minGroundY - 0.16,
      z,
      scale,
      scaleY,
      rotY: rng() * Math.PI * 2,
      colorIdx: Math.floor(rng() * 4),
      sinkDepth: 0.16,
      footprintRadius
    });
  }

  // 2. Grounded Lunar Comm Dish Towers / Mars Telemetry Relay Masts
  const commTowers: GroundedPropPlacement[] = [];
  const towerAngles = isMoon
    ? [-2.55, -1.72, -0.82, 0.18, 1.12, 2.15]
    : [-2.35, -1.15, 0.25, 1.65];
  for (let i = 0; i < towerAngles.length; i++) {
    const ang = towerAngles[i];
    const rad = isMoon ? 54 + (i % 2) * 8 : 56 + (i % 2) * 7;
    const x = Math.cos(ang) * rad;
    const z = Math.sin(ang) * rad * 0.88;
    if (!isClearOfPadsAndRoads(x, z, 4.5)) continue;
    const scale = 1.05 + (i % 2) * 0.15;
    const footprintRadius = 1.6 * scale;
    const minGroundY = minTerrainHeightInFootprint(evalHeight, x, z, footprintRadius);
    commTowers.push({
      x,
      y: minGroundY - 0.12,
      z,
      scale,
      rotY: Math.atan2(-x, -z),
      colorIdx: i,
      sinkDepth: 0.12,
      footprintRadius
    });
  }

  // 3. Glowing Rover Guide Track Beacons along the Lunar / Martian Road Loop
  const beacons: GroundedPropPlacement[] = [];
  const beaconCount = 18;
  for (let i = 0; i < beaconCount; i++) {
    const ang = (i / beaconCount) * Math.PI * 2;
    const radX = isMoon ? 42 : 41;
    const radZ = isMoon ? 31 : 29;
    const bx = Math.cos(ang) * radX;
    const bz = Math.sin(ang) * radZ;
    if (!isClearOfPadsAndRoads(bx, bz, 1.4)) continue;
    const footprintRadius = 0.35;
    const minGroundY = minTerrainHeightInFootprint(evalHeight, bx, bz, footprintRadius);
    beacons.push({
      x: bx,
      y: minGroundY - 0.08,
      z: bz,
      scale: 1.0,
      rotY: -ang,
      colorIdx: i % 2,
      sinkDepth: 0.08,
      footprintRadius
    });
  }

  // 4. Side Discovery Learning Kiosks
  const kiosks: DiscoveryKioskPlacement[] = pads
    .filter((p) => p.id.startsWith('kiosk_'))
    .map((p) => {
      const rotY = Math.atan2((p.facingX ?? 0) - p.x, (p.facingZ ?? 0) - p.z);
      const minY = minTerrainHeightInFootprint(evalHeight, p.x, p.z, 1.3);
      return {
        id: p.id,
        x: p.x,
        y: minY - 0.08,
        z: p.z,
        rotY
      };
    });

  return {
    mode,
    worldSize,
    rocks,
    commTowers,
    beacons,
    kiosks
  };
}
