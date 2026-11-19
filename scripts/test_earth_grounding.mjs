import fs from 'fs';
import path from 'path';
import { buildSync } from 'esbuild';

const bundleModule = async (relPath) => {
  const built = buildSync({
    entryPoints: [path.resolve(relPath)],
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'neutral'
  });
  return import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0].text).toString('base64')}`);
};

const terrain = await bundleModule('src/components/three/terrainMath.ts');
const layoutMod = await bundleModule('src/components/three/earthWorldLayout.ts');
const factsMod = await bundleModule('src/data/earthDiscoveryFacts.ts');

let passCount = 0;
let failCount = 0;

function assert(cond, msg) {
  if (cond) {
    console.log(`  [PASS] ${msg}`);
    passCount++;
  } else {
    console.error(`  [FAIL] ${msg}`);
    failCount++;
  }
}

console.log('===============================================================');
console.log('  AstroNutri Phase 2: Earth Grounding, Road & Layout Tests');
console.log('===============================================================');

// 1. Verify all 9 Phase 2 Blender GLB assets exist and stay compact (< 350 KB)
const phase2Glbs = [
  'earth_kitchen_dome.glb',
  'earth_suit_hangar.glb',
  'earth_medical_pavilion.glb',
  'earth_launch_complex.glb',
  'earth_academy_hq.glb',
  'earth_discovery_kiosk.glb',
  'earth_tree_round.glb',
  'earth_bush_flower.glb',
  'earth_cliff_layered.glb'
];
for (const fname of phase2Glbs) {
  const full = path.resolve('public/models', fname);
  const exists = fs.existsSync(full);
  const kb = exists ? fs.statSync(full).size / 1024 : 0;
  assert(exists && kb > 5 && kb < 350, `Phase 2 GLB ${fname} exists (${kb.toFixed(1)} KB < 350 KB)`);
}

// 2. Verify Earth Level 1 buildings are spread cleanly 40m–65m apart sequentially
const l1RoomOrder = ['food_storage', 'equipment_room', 'medical_room', 'launch_area'];
const l1Pads = l1RoomOrder.map((id) => terrain.EARTH_L1_PADS.find((p) => p.id === id));
assert(l1Pads.every(Boolean), 'All 4 Earth Level 1 NASA building pads exist in EARTH_L1_PADS');

for (let i = 0; i < l1Pads.length - 1; i++) {
  const a = l1Pads[i];
  const b = l1Pads[i + 1];
  const d = Math.hypot(b.x - a.x, b.z - a.z);
  assert(d >= 40 && d <= 65, `Earth L1 sequential distance ${a.id} -> ${b.id} is ${d.toFixed(1)}m (40..65m range)`);
}

// 3. Verify spawn & garage surfaces are level
const spawnNormalL1 = terrain.evalSectorTerrainNormal(1, 0, 32);
const garageNormalL1 = terrain.evalSectorTerrainNormal(1, 8.6, 29.0);
const hubNormal = terrain.evalOverworldTerrainNormal(0, 8);
assert(
  spawnNormalL1.y > 0.99 && garageNormalL1.y > 0.985 && hubNormal.y > 0.99,
  `Spawn & Garage aprons sit cleanly level (ny=${spawnNormalL1.y.toFixed(4)}, ${garageNormalL1.y.toFixed(4)}, ${hubNormal.y.toFixed(4)})`
);

// 4. Deterministic ZERO Floating Props & Road Clearance check across BOTH Earth L1 and Sunlit Hub
for (const mode of ['earth_l1', 'academy_hub']) {
  const layout = layoutMod.generateEarthWorldLayout(mode);
  const evalHeight =
    mode === 'earth_l1'
      ? (x, z) => terrain.evalSectorFloorHeight(1, x, z)
      : terrain.evalOverworldTerrainHeight;
  const evalRoad = mode === 'earth_l1' ? terrain.evalEarthL1RoadInfo : terrain.evalHubRoadInfo;

  assert(
    layout.grassTufts.length >= 2500 && layout.grassTufts.length <= 4500,
    `${mode}: Dense stylized grass count = ${layout.grassTufts.length} (within 2,500–4,500)`
  );
  assert(layout.trees.length >= 65, `${mode}: Multi-canopy colorful tree count = ${layout.trees.length} (>= 65)`);
  assert(layout.bushes.length >= 80, `${mode}: Flowering bush count = ${layout.bushes.length} (>= 80)`);
  assert(layout.cliffs.length >= 30, `${mode}: Grounded cliff count = ${layout.cliffs.length} (>= 30)`);

  let floatingProps = 0;
  const groups = [
    ...layout.trees,
    ...layout.bushes,
    ...layout.cliffs,
    ...layout.lampposts,
    ...layout.grassTufts
  ];
  for (const p of groups) {
    const centerGroundY = evalHeight(p.x, p.z);
    const footMinY = layoutMod.minTerrainHeightInFootprint(evalHeight, p.x, p.z, p.footprintRadius);
    if (p.y > centerGroundY - 0.04 || p.y > footMinY - 0.04) {
      floatingProps++;
    }
  }
  for (const k of layout.kiosks) {
    const footMinY = layoutMod.minTerrainHeightInFootprint(evalHeight, k.x, k.z, 1.2);
    if (k.y > footMinY - 0.04) floatingProps++;
  }
  assert(floatingProps === 0, `${mode}: ZERO floating props across ${groups.length + layout.kiosks.length} placed items (floating=${floatingProps})`);

  let roadOverlaps = 0;
  for (const p of [...layout.trees, ...layout.bushes, ...layout.cliffs, ...layout.grassTufts]) {
    const r = evalRoad(p.x, p.z);
    if (r.dist < r.halfWidth + 0.8) roadOverlaps++;
  }
  assert(roadOverlaps === 0, `${mode}: ZERO foliage/cliff overlaps onto paved Spaceport Roads (overlaps=${roadOverlaps})`);
}

// 5. Strict EN isolation on new discovery facts
const allFacts = [...factsMod.EARTH_L1_KIOSKS, ...factsMod.HUB_MUSEUM_FACTS];
const leakyFacts = allFacts.filter((f) => /[\u0600-\u06FF]/.test(`${f.titleEn} ${f.summaryEn}`));
assert(
  leakyFacts.length === 0 && allFacts.length === 7,
  `All ${allFacts.length} discovery kiosk & museum facts have strict EN/AR isolation`
);

console.log('---------------------------------------------------------------');
console.log(`  RESULT: ${passCount} passed, ${failCount} failed`);
console.log('===============================================================');
if (failCount > 0) process.exit(1);
