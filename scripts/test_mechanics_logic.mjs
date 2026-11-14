// scripts/test_mechanics_logic.mjs
// Automated QA verification for Stage 2 (Zero-G Physics), Stage 3 (Pipe Puzzle BFS), and Stage 4 (Cargo Balancing Math)

console.log('===============================================================');
console.log('  ASTRONUTRI: GAMEPLAY MECHANICS LOGICAL ACCEPTANCE AUDIT');
console.log('===============================================================\n');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passCount++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failCount++;
  }
}

// ----------------------------------------------------------------------------
// AUDIT 1: STAGE 2 ZERO-G SLINGSHOT & ARCADE PHYSICS
// ----------------------------------------------------------------------------
console.log('--- Stage 2: Zero-G Slingshot & Velocity Mathematics ---');

function calculateSlingshotVelocity(startX, startY, pointerX, pointerY) {
  const dx = pointerX - startX;
  const dy = pointerY - startY;
  const dragDist = Math.sqrt(dx * dx + dy * dy);

  if (dragDist <= 18) {
    return { launched: false, vx: 0, vy: 0, speed: 0 };
  }

  // Angle from pointer to anchor (launching away from pull)
  const angle = Math.atan2(startY - pointerY, startX - pointerX);
  const speed = Math.min(dragDist * 4.2, 580);
  const vx = Math.cos(angle) * speed;
  const vy = Math.sin(angle) * speed;

  return { launched: true, vx, vy, speed, angle };
}

// Test small accidental micro-touch (< 18px threshold)
const microDrag = calculateSlingshotVelocity(400, 310, 405, 315);
assert(!microDrag.launched, 'Micro-drag (< 18px) does NOT trigger false launch');

// Test standard slingshot pull of 80px downwards
const validDrag = calculateSlingshotVelocity(400, 310, 400, 390);
assert(validDrag.launched, 'Intentional pull (> 18px) triggers slingshot propulsion');
assert(Math.abs(validDrag.vy - (-336)) < 1, 'Pulling down propels Robo upwards (vy < 0)');
assert(validDrag.speed <= 580, 'Velocity is clamped to maximum safe physics limit (580 px/s)');

// Zero-G Drag Simulation over 60 frames (1 second at 60Hz)
let currentVx = validDrag.vx;
let currentVy = validDrag.vy;
const drag = 18; // px/s^2
for (let i = 0; i < 60; i++) {
  const speed = Math.hypot(currentVx, currentVy);
  if (speed > 0) {
    const decel = (drag / 60);
    const newSpeed = Math.max(0, speed - decel);
    const factor = newSpeed / speed;
    currentVx *= factor;
    currentVy *= factor;
  }
}
const remainingSpeed = Math.hypot(currentVx, currentVy);
assert(remainingSpeed > 0 && remainingSpeed < validDrag.speed, 'Robo preserves zero-G inertia with low drag deceleration');

// ----------------------------------------------------------------------------
// AUDIT 2: STAGE 3 BFS PIPE NETWORK SOLVER
// ----------------------------------------------------------------------------
console.log('\n--- Stage 3: ECLSS Pipe Puzzle BFS Graph Flow Solver ---');

function getRotatedConnections(base, rotation) {
  const steps = Math.floor(rotation / 90) % 4;
  return base.map((d) => (d + steps) % 4);
}

function solvePipeBFS(grid) {
  const cellMap = new Map();
  grid.forEach((c) => cellMap.set(`${c.row},${c.col}`, c));

  const visited = new Set();
  const connectedIds = new Set();
  let reachedOutlet = false;

  const queue = [];
  const inletCell = cellMap.get('1,0');
  if (inletCell) {
    const active = getRotatedConnections(inletCell.baseConnections, inletCell.rotation);
    if (active.includes(3)) { // Facing left (inlet from cabin)
      queue.push({ row: 1, col: 0, enterFromDir: 3 });
      visited.add('1,0,3');
      connectedIds.add(inletCell.id);
    }
  }

  while (queue.length > 0) {
    const curr = queue.shift();
    const cell = cellMap.get(`${curr.row},${curr.col}`);
    const connections = getRotatedConnections(cell.baseConnections, cell.rotation);

    if (curr.row === 1 && curr.col === 2 && connections.includes(1)) {
      reachedOutlet = true;
    }

    connections.forEach((exitDir) => {
      if (exitDir === curr.enterFromDir) return;

      let nr = curr.row;
      let nc = curr.col;
      if (exitDir === 0) nr -= 1;
      if (exitDir === 1) nc += 1;
      if (exitDir === 2) nr += 1;
      if (exitDir === 3) nc -= 1;

      if (nr >= 0 && nr < 3 && nc >= 0 && nc < 3) {
        const neighbor = cellMap.get(`${nr},${nc}`);
        if (neighbor) {
          const reqInlet = (exitDir + 2) % 4;
          const nConns = getRotatedConnections(neighbor.baseConnections, neighbor.rotation);
          if (nConns.includes(reqInlet)) {
            const key = `${nr},${nc},${reqInlet}`;
            if (!visited.has(key)) {
              visited.add(key);
              connectedIds.add(neighbor.id);
              queue.push({ row: nr, col: nc, enterFromDir: reqInlet });
            }
          }
        }
      }
    });
  }

  return { reachedOutlet, connectedCount: connectedIds.size };
}

// Test Solved Circuit (Horizontal Main Trunk: (1,0)->(1,1)->(1,2))
const solvedGrid = [
  { id: 'p00', row: 0, col: 0, baseConnections: [1, 2], rotation: 0 },
  { id: 'p01', row: 0, col: 1, baseConnections: [1, 3], rotation: 0 },
  { id: 'p02', row: 0, col: 2, baseConnections: [2, 3], rotation: 0 },
  { id: 'p10', row: 1, col: 0, baseConnections: [0, 1, 3], rotation: 0 }, // T facing up, right, left
  { id: 'p11', row: 1, col: 1, baseConnections: [1, 3], rotation: 0 },    // Straight horizontal
  { id: 'p12', row: 1, col: 2, baseConnections: [0, 1, 3], rotation: 0 }, // T facing up, right, left
  { id: 'p20', row: 2, col: 0, baseConnections: [0, 1], rotation: 0 },
  { id: 'p21', row: 2, col: 1, baseConnections: [1, 3], rotation: 0 },
  { id: 'p22', row: 2, col: 2, baseConnections: [0, 3], rotation: 0 },
];

const solvedResult = solvePipeBFS(solvedGrid);
assert(solvedResult.reachedOutlet, 'Solved pipe configuration completes BFS flow to clean water outlet');
assert(solvedResult.connectedCount >= 3, 'At least 3 conduits in trunk line carry fluid flow');

// Test Scrambled / Disconnected Grid
const scrambledGrid = solvedGrid.map((c) => ({
  ...c,
  rotation: (c.rotation + 90) % 360 // rotated by 90 deg -> horizontal pipes turn vertical
}));
const scrambledResult = solvePipeBFS(scrambledGrid);
assert(!scrambledResult.reachedOutlet, 'Misaligned/Scrambled pipes correctly BLOCK fluid flow');

// ----------------------------------------------------------------------------
// AUDIT 3: STAGE 4 CARGO BALANCING MATHEMATICS
// ----------------------------------------------------------------------------
console.log('\n--- Stage 4: Return Capsule Center-of-Mass & Weight Telemetry ---');

function evaluateCargoBalancing(leftItems, rightItems) {
  const leftWeight = leftItems.reduce((s, i) => s + i.weightKg, 0);
  const rightWeight = rightItems.reduce((s, i) => s + i.weightKg, 0);
  const totalWeight = leftWeight + rightWeight;
  const variance = Math.abs(leftWeight - rightWeight);

  const isWeightSafe = totalWeight <= 100;
  const isBalanceSafe = variance <= 15;
  const canLaunch = isWeightSafe && isBalanceSafe && (leftItems.length + rightItems.length >= 2);

  return { totalWeight, variance, isWeightSafe, isBalanceSafe, canLaunch };
}

const iceCore = { id: 'ice_core', weightKg: 25 };
const basalt = { id: 'rock_sample', weightKg: 30 };
const seeds = { id: 'biodome_seeds', weightKg: 20 };
const drive = { id: 'telemetry_drive', weightKg: 15 };
const heavyRegolith = { id: 'heavy_regolith', weightKg: 45 };

// Case A: Initial Default (IceCore 25kg vs Basalt 30kg)
const caseA = evaluateCargoBalancing([iceCore], [basalt]);
assert(caseA.totalWeight === 55, 'Initial default total weight is 55kg');
assert(caseA.variance === 5, 'Initial default variance is 5kg (<= 15kg threshold)');
assert(caseA.canLaunch, 'Initial default load is aerodynamically safe to launch');

// Case B: Overloaded (> 100kg)
const caseB = evaluateCargoBalancing([iceCore, heavyRegolith], [basalt, seeds, drive]); // 70kg vs 65kg = 135kg
assert(!caseB.isWeightSafe, 'Exceeding 100kg total weight marks isWeightSafe as FALSE');
assert(!caseB.canLaunch, 'Overloaded cargo blocks capsule blastoff');

// Case C: Severe Imbalance (variance > 15kg)
const caseC = evaluateCargoBalancing([heavyRegolith, iceCore], []); // 70kg vs 0kg = variance 70kg
assert(!caseC.isBalanceSafe, 'Unbalanced payload (variance > 15kg) marks isBalanceSafe as FALSE');
assert(!caseC.canLaunch, 'Unbalanced payload blocks launch');

// Case D: Balanced 4-item Payload
const caseD = evaluateCargoBalancing([iceCore, seeds], [basalt, drive]); // 45kg vs 45kg = 90kg, diff 0kg
assert(caseD.isWeightSafe && caseD.isBalanceSafe && caseD.canLaunch, 'Balanced 4-item payload (90kg, 0kg variance) approves launch');

console.log('\n===============================================================');
console.log(`  ACCEPTANCE TEST RESULTS: ${passCount}/${passCount + failCount} PASSED`);
console.log('===============================================================');

if (failCount > 0) {
  process.exit(1);
}
