import path from 'path';
import { buildSync } from 'esbuild';

const physicsBundle = buildSync({
  entryPoints: [path.resolve('src/components/three/thirdPersonPhysics.ts')],
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'neutral'
});

const {
  COYOTE_TIME_MS,
  JUMP_BUFFER_MS,
  GROUND_SLOPE_SNAP,
  createKinematicsState,
  queueJumpInput,
  resolveCircleObstacles,
  stepThirdPersonKinematics
} = await import(`data:text/javascript;base64,${Buffer.from(physicsBundle.outputFiles[0].text).toString('base64')}`);

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

console.log('===============================================================');
console.log('  AstroNutri Phase 1A: Third-Person Kinematics & Jump Physics');
console.log('===============================================================');

assert(COYOTE_TIME_MS === 120, `COYOTE_TIME_MS is 120ms (got ${COYOTE_TIME_MS})`);
assert(JUMP_BUFFER_MS === 120, `JUMP_BUFFER_MS is 120ms (got ${JUMP_BUFFER_MS})`);
assert(GROUND_SLOPE_SNAP === 0.30, `GROUND_SLOPE_SNAP is 0.30m (got ${GROUND_SLOPE_SNAP})`);

// 1. Jump-while-moving on flat ground: positive vy, arc height, preserved speed, clean landing
{
  const k = createKinematicsState(0, 0, 0, 0);
  let now = 0;
  const dt = 1 / 60;
  for (let i = 0; i < 20; i++) {
    now += dt * 1000;
    stepThirdPersonKinematics(k, {
      dt,
      nowMs: now,
      inputWorldDirX: 0,
      inputWorldDirZ: -1,
      inputMagnitude: 1,
      maxSpeed: 8.0,
      gravity: 21,
      jumpVel: 8.4,
      evalFloorY: () => 0
    });
  }
  const speedBeforeJump = Math.hypot(k.vx, k.vz);
  assert(speedBeforeJump > 7.0, `Sprinting builds horizontal speed before jump (${speedBeforeJump.toFixed(2)} m/s)`);

  queueJumpInput(k, now);
  now += dt * 1000;
  const jumpRes = stepThirdPersonKinematics(k, {
    dt,
    nowMs: now,
    inputWorldDirX: 0,
    inputWorldDirZ: -1,
    inputMagnitude: 1,
    maxSpeed: 8.0,
    gravity: 21,
    jumpVel: 8.4,
    evalFloorY: () => 0
  });
  assert(jumpRes.jumped && k.vy > 7.5 && jumpRes.isAirborne, `Jump-while-moving launches cleanly (vy=${k.vy.toFixed(2)})`);
  assert(jumpRes.speed > 7.0, `Horizontal speed preserved at jump takeoff (${jumpRes.speed.toFixed(2)} m/s)`);

  let peakY = k.y;
  let landed = false;
  let minAirSpeed = jumpRes.speed;
  for (let i = 0; i < 80; i++) {
    now += dt * 1000;
    const r = stepThirdPersonKinematics(k, {
      dt,
      nowMs: now,
      inputWorldDirX: 0,
      inputWorldDirZ: -1,
      inputMagnitude: 0, // release joystick mid-air to verify air momentum preservation
      maxSpeed: 8.0,
      gravity: 21,
      jumpVel: 8.4,
      evalFloorY: () => 0
    });
    if (k.y > peakY) peakY = k.y;
    if (r.isAirborne && r.speed < minAirSpeed) minAirSpeed = r.speed;
    if (r.landed) {
      landed = true;
      break;
    }
  }
  assert(peakY > 1.5, `Jump arc reaches realistic height (peakY=${peakY.toFixed(2)}m)`);
  assert(minAirSpeed > 3.5, `Forward momentum carries cleanly through jump arc (minAirSpeed=${minAirSpeed.toFixed(2)} m/s)`);
  assert(landed && k.grounded && Math.abs(k.y) < 1e-6, 'Astronaut lands cleanly back on ground');
}

// 2. Jump-while-moving uphill (never cancelled on frame 1 when terrain rises ahead)
{
  const k = createKinematicsState(0, 0, 0, 0);
  const uphill = (_x, z) => Math.max(0, -z * 0.28);
  let now = 0;
  const dt = 1 / 60;
  for (let i = 0; i < 15; i++) {
    now += dt * 1000;
    stepThirdPersonKinematics(k, {
      dt,
      nowMs: now,
      inputWorldDirX: 0,
      inputWorldDirZ: -1,
      inputMagnitude: 1,
      maxSpeed: 8.0,
      gravity: 21,
      jumpVel: 8.4,
      evalFloorY: uphill
    });
  }
  queueJumpInput(k, now);
  now += dt * 1000;
  const r1 = stepThirdPersonKinematics(k, {
    dt,
    nowMs: now,
    inputWorldDirX: 0,
    inputWorldDirZ: -1,
    inputMagnitude: 1,
    maxSpeed: 8.0,
    gravity: 21,
    jumpVel: 8.4,
    evalFloorY: uphill
  });
  now += dt * 1000;
  const r2 = stepThirdPersonKinematics(k, {
    dt,
    nowMs: now,
    inputWorldDirX: 0,
    inputWorldDirZ: -1,
    inputMagnitude: 1,
    maxSpeed: 8.0,
    gravity: 21,
    jumpVel: 8.4,
    evalFloorY: uphill
  });
  assert(r1.jumped && r1.isAirborne && r2.isAirborne && k.vy > 7.0, `Uphill jump stays airborne instead of aborting on frame 1 (vy=${k.vy.toFixed(2)})`);
}

// 3. Downhill sprint stays grounded smoothly via GROUND_SLOPE_SNAP
{
  const k = createKinematicsState(0, 5.0, 0, 0);
  const downhill = (_x, z) => Math.max(0, 5.0 - Math.max(0, -z) * 0.35);
  let now = 0;
  const dt = 1 / 60;
  let stayedGrounded = true;
  for (let i = 0; i < 30; i++) {
    now += dt * 1000;
    const r = stepThirdPersonKinematics(k, {
      dt,
      nowMs: now,
      inputWorldDirX: 0,
      inputWorldDirZ: -1,
      inputMagnitude: 1,
      maxSpeed: 10.0,
      gravity: 21,
      jumpVel: 8.4,
      evalFloorY: downhill
    });
    if (r.isAirborne) stayedGrounded = false;
  }
  assert(stayedGrounded && k.y < 5.0, `Downhill sprint hugs terrain slope without false falling (y=${k.y.toFixed(2)}m)`);
}

// 4. 120ms Coyote Time accepts jump at +90ms and rejects jump at +160ms
{
  const cliffFloor = (_x, z) => (z < -0.5 ? -5.0 : 0);
  const dt = 1 / 60;

  const kAccept = createKinematicsState(0, 0, -0.6, 1000);
  kAccept.vx = 0;
  kAccept.vz = 0;
  stepThirdPersonKinematics(kAccept, {
    dt,
    nowMs: 1000,
    inputWorldDirX: 0,
    inputWorldDirZ: -1,
    inputMagnitude: 1,
    maxSpeed: 6,
    gravity: 21,
    jumpVel: 8.4,
    evalFloorY: cliffFloor
  });
  queueJumpInput(kAccept, 1090);
  const coyoteOk = stepThirdPersonKinematics(kAccept, {
    dt,
    nowMs: 1090,
    inputWorldDirX: 0,
    inputWorldDirZ: -1,
    inputMagnitude: 1,
    maxSpeed: 6,
    gravity: 21,
    jumpVel: 8.4,
    evalFloorY: cliffFloor
  });
  assert(coyoteOk.jumped && kAccept.vy > 7.5, `Coyote time (+90ms) accepts ledge jump (vy=${kAccept.vy.toFixed(2)})`);

  const kReject = createKinematicsState(0, 0, -0.6, 1000);
  stepThirdPersonKinematics(kReject, {
    dt,
    nowMs: 1000,
    inputWorldDirX: 0,
    inputWorldDirZ: -1,
    inputMagnitude: 1,
    maxSpeed: 6,
    gravity: 21,
    jumpVel: 8.4,
    evalFloorY: cliffFloor
  });
  queueJumpInput(kReject, 1160);
  const coyoteLate = stepThirdPersonKinematics(kReject, {
    dt,
    nowMs: 1160,
    inputWorldDirX: 0,
    inputWorldDirZ: -1,
    inputMagnitude: 1,
    maxSpeed: 6,
    gravity: 21,
    jumpVel: 8.4,
    evalFloorY: cliffFloor
  });
  assert(!coyoteLate.jumped && kReject.vy < 0, `Late coyote (+160ms) rejects mid-air double jump (vy=${kReject.vy.toFixed(2)})`);
}

// 5. 120ms Jump Input Buffer fires automatically upon touchdown
{
  const k = createKinematicsState(0, 0.25, 0, 1000);
  k.grounded = false;
  k.lastGroundedMs = 500;
  k.vy = -4.0;
  queueJumpInput(k, 1000); // buffered 80ms before expected landing
  let bufferedJumped = false;
  let now = 1000;
  for (let i = 1; i <= 8; i++) {
    now += 16;
    const r = stepThirdPersonKinematics(k, {
      dt: 0.016,
      nowMs: now,
      inputWorldDirX: 0,
      inputWorldDirZ: -1,
      inputMagnitude: 1,
      maxSpeed: 7,
      gravity: 21,
      jumpVel: 8.4,
      evalFloorY: () => 0
    });
    if (r.jumped) {
      bufferedJumped = true;
      break;
    }
  }
  assert(bufferedJumped && k.vy > 7.5 && !k.grounded, `120ms jump buffer auto-triggers jump on touchdown (vy=${k.vy.toFixed(2)})`);
}

// 6. Mid-air steering redirects trajectory while keeping airborne momentum
{
  const k = createKinematicsState(0, 2.5, 0, 0);
  k.grounded = false;
  k.lastGroundedMs = -1000;
  k.vy = 4.0;
  k.vx = 0;
  k.vz = -8.0;
  let now = 0;
  for (let i = 0; i < 12; i++) {
    now += 16;
    stepThirdPersonKinematics(k, {
      dt: 0.016,
      nowMs: now,
      inputWorldDirX: 1,
      inputWorldDirZ: 0,
      inputMagnitude: 1,
      maxSpeed: 8.0,
      gravity: 10,
      jumpVel: 8.4,
      evalFloorY: () => 0
    });
  }
  assert(k.vx > 3.5 && k.vz < -4.0, `Mid-air steering blends lateral control (${k.vx.toFixed(2)}) while preserving forward momentum (${k.vz.toFixed(2)})`);
}

// 7. Circle obstacle sliding prevents penetration & keeps tangential slide speed
{
  const obstacles = [{ x: 0, z: -2.0, radius: 1.35 }];
  const pos = { x: 0.25, z: -0.2 };
  const vel = { x: 0.4, z: -6.0 };
  const minDist = 0.55 + 1.35;
  pos.x += vel.x * 0.05;
  pos.z += vel.z * 0.05;
  const hit = resolveCircleObstacles(pos, vel, 0.55, obstacles);
  const actualDist = Math.hypot(pos.x - obstacles[0].x, pos.z - obstacles[0].z);
  assert(hit && actualDist >= minDist - 1e-5, `Obstacle push-out keeps safe clearance (${actualDist.toFixed(3)} >= ${minDist})`);
  assert(Math.hypot(vel.x, vel.z) > 0.5, `Obstacle slide preserves tangential speed (${Math.hypot(vel.x, vel.z).toFixed(2)})`);
}

console.log('---------------------------------------------------------------');
console.log(`  RESULT: ${passCount} passed, ${failCount} failed`);
console.log('===============================================================');
if (failCount > 0) process.exit(1);
