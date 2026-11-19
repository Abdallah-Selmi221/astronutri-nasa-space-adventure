import * as THREE from 'three';
import { mergeColoredParts } from './threeMergeUtils';

export const COYOTE_TIME_MS = 120;
export const JUMP_BUFFER_MS = 120;
export const GROUND_SLOPE_SNAP = 0.30;

export interface ThirdPersonKinematicsState {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  grounded: boolean;
  lastGroundedMs: number;
  jumpBufferUntilMs: number;
  lastLandedMs: number;
  airTimeSec: number;
}

export interface CircleObstacle {
  x: number;
  z: number;
  radius: number;
}

export interface StepKinematicsOptions {
  dt: number;
  nowMs: number;
  inputWorldDirX: number;
  inputWorldDirZ: number;
  inputMagnitude: number;
  maxSpeed: number;
  gravity: number;
  jumpVel: number;
  isZeroG?: boolean;
  evalFloorY: (x: number, z: number) => number;
  clampXZ?: (x: number, z: number) => { x: number; z: number };
  obstacles?: readonly CircleObstacle[];
  playerRadius?: number;
}

export interface StepKinematicsResult {
  speed: number;
  jumped: boolean;
  landed: boolean;
  isAirborne: boolean;
  isLanding: boolean;
}

/**
 * Shortest-arc yaw interpolation in radians to avoid 360-degree snaps.
 */
export function lerpAngle(current: number, target: number, alpha: number): number {
  const diff = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + diff * Math.min(1, Math.max(0, alpha));
}

/**
 * Frame-rate-independent exponential scalar damping toward target.
 */
export function dampValue(current: number, target: number, lambda: number, dt: number): number {
  const safeDt = Math.max(0, dt);
  return current + (target - current) * (1 - Math.exp(-lambda * safeDt));
}

/**
 * Smoothly accelerates toward desired horizontal velocity or applies smooth ground friction.
 */
export function stepSmoothHorizontalVelocity(
  vel: { x: number; z: number },
  targetX: number,
  targetZ: number,
  dt: number,
  accelRate = 14,
  frictionRate = 11
): { speed: number } {
  const hasInput = Math.hypot(targetX, targetZ) > 0.01;
  const rate = hasInput ? accelRate : frictionRate;
  const alpha = 1 - Math.exp(-rate * dt);
  vel.x += (targetX - vel.x) * alpha;
  vel.z += (targetZ - vel.z) * alpha;
  if (!hasInput && Math.hypot(vel.x, vel.z) < 0.04) {
    vel.x = 0;
    vel.z = 0;
  }
  return { speed: Math.hypot(vel.x, vel.z) };
}

/**
 * Initializes decoupled third-person locomotion & jump kinematics state.
 */
export function createKinematicsState(
  x: number,
  y: number,
  z: number,
  nowMs = 0
): ThirdPersonKinematicsState {
  return {
    x,
    y,
    z,
    vx: 0,
    vy: 0,
    vz: 0,
    grounded: true,
    lastGroundedMs: nowMs,
    jumpBufferUntilMs: 0,
    lastLandedMs: -9999,
    airTimeSec: 0
  };
}

/**
 * Queues a buffered jump request without altering horizontal movement state.
 */
export function queueJumpInput(
  state: ThirdPersonKinematicsState,
  nowMs: number,
  bufferMs = JUMP_BUFFER_MS
): void {
  state.jumpBufferUntilMs = Math.max(state.jumpBufferUntilMs, nowMs + bufferMs);
}

/**
 * Pushes player cleanly out of circular obstacles and strips only inward velocity so
 * movement slides smoothly around geometry rather than snagging.
 */
export function resolveCircleObstacles(
  pos: { x: number; z: number },
  vel: { x: number; z: number },
  playerRadius: number,
  obstacles: readonly CircleObstacle[]
): boolean {
  let collided = false;
  for (let i = 0; i < obstacles.length; i++) {
    const obs = obstacles[i];
    const minDist = playerRadius + obs.radius;
    const dx = pos.x - obs.x;
    const dz = pos.z - obs.z;
    const distSq = dx * dx + dz * dz;
    if (distSq < minDist * minDist) {
      collided = true;
      const dist = Math.sqrt(distSq);
      const nx = dist > 1e-5 ? dx / dist : 0;
      const nz = dist > 1e-5 ? dz / dist : 1;
      pos.x = obs.x + nx * minDist;
      pos.z = obs.z + nz * minDist;
      const dot = vel.x * nx + vel.z * nz;
      if (dot < 0) {
        vel.x -= dot * nx;
        vel.z -= dot * nz;
      }
    }
  }
  return collided;
}

/**
 * Steps decoupled horizontal locomotion, obstacle sliding, coyote time, jump input buffer,
 * uphill-safe jumping, and gravity landing in a single deterministic tick.
 */
export function stepThirdPersonKinematics(
  state: ThirdPersonKinematicsState,
  opts: StepKinematicsOptions
): StepKinematicsResult {
  const dt = Math.max(0, Math.min(0.05, opts.dt));
  const nowMs = opts.nowMs;

  const accelRate = state.grounded ? 15.5 : 3.4;
  const frictionRate = state.grounded ? 12.5 : 0.45;
  const clampedMag = Math.min(1, Math.max(0, opts.inputMagnitude));
  const dirLen = Math.hypot(opts.inputWorldDirX, opts.inputWorldDirZ);
  const targetSpeed = opts.maxSpeed * clampedMag;
  const targetVx = dirLen > 1e-5 && clampedMag > 0 ? (opts.inputWorldDirX / dirLen) * targetSpeed : 0;
  const targetVz = dirLen > 1e-5 && clampedMag > 0 ? (opts.inputWorldDirZ / dirLen) * targetSpeed : 0;

  const hVel = { x: state.vx, z: state.vz };
  stepSmoothHorizontalVelocity(hVel, targetVx, targetVz, dt, accelRate, frictionRate);

  const nextPos = {
    x: state.x + hVel.x * dt,
    z: state.z + hVel.z * dt
  };

  if (opts.clampXZ) {
    const clamped = opts.clampXZ(nextPos.x, nextPos.z);
    if (clamped.x !== nextPos.x) hVel.x = 0;
    if (clamped.z !== nextPos.z) hVel.z = 0;
    nextPos.x = clamped.x;
    nextPos.z = clamped.z;
  }

  if (opts.obstacles && opts.obstacles.length > 0) {
    resolveCircleObstacles(nextPos, hVel, opts.playerRadius ?? 0.55, opts.obstacles);
    if (opts.clampXZ) {
      const clampedAfter = opts.clampXZ(nextPos.x, nextPos.z);
      nextPos.x = clampedAfter.x;
      nextPos.z = clampedAfter.z;
    }
  }

  state.x = nextPos.x;
  state.z = nextPos.z;
  state.vx = hVel.x;
  state.vz = hVel.z;

  const floorY = opts.evalFloorY(state.x, state.z);
  let jumped = false;
  let landed = false;

  const withinCoyote = nowMs - state.lastGroundedMs <= COYOTE_TIME_MS;
  if (state.jumpBufferUntilMs >= nowMs && (state.grounded || withinCoyote || opts.isZeroG)) {
    state.vy = opts.jumpVel;
    state.grounded = false;
    state.jumpBufferUntilMs = 0;
    state.airTimeSec = 0;
    jumped = true;
  }

  if (state.grounded) {
    if (state.y - floorY <= GROUND_SLOPE_SNAP) {
      state.y = floorY;
      state.vy = 0;
      state.lastGroundedMs = nowMs;
      state.airTimeSec = 0;
    } else {
      state.grounded = false;
      state.lastGroundedMs = nowMs;
      state.airTimeSec = dt;
      state.vy -= opts.gravity * dt;
      state.y += state.vy * dt;
    }
  } else {
    state.airTimeSec += dt;
    state.vy -= opts.gravity * dt;
    state.y += state.vy * dt;

    if (state.vy > 0) {
      // Ascending on an uphill slope keeps upward velocity intact instead of aborting the jump.
      if (state.y < floorY) {
        state.y = floorY;
      }
    } else if (state.y <= floorY) {
      state.y = floorY;
      state.vy = 0;
      state.grounded = true;
      state.lastGroundedMs = nowMs;
      state.lastLandedMs = nowMs;
      state.airTimeSec = 0;
      landed = true;

      if (state.jumpBufferUntilMs >= nowMs) {
        state.vy = opts.jumpVel;
        state.grounded = false;
        state.jumpBufferUntilMs = 0;
        jumped = true;
      }
    }
  }

  return {
    speed: Math.hypot(state.vx, state.vz),
    jumped,
    landed,
    isAirborne: !state.grounded,
    isLanding: state.grounded && nowMs - state.lastLandedMs < 140
  };
}

interface DustParticle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  age: number;
  life: number;
  baseScale: number;
}

export interface DustPuffSystem {
  mesh: THREE.InstancedMesh;
  emit: (x: number, y: number, z: number, colorHex: number, count: number, spread?: number) => void;
  update: (dt: number) => void;
  dispose: () => void;
}

/**
 * Single-draw-call InstancedMesh particle pool for sprint dust trails, lunar landing
 * regolith puffs, water splashes, and rocket thruster exhaust.
 */
export function createDustPuffSystem(scene: THREE.Scene, maxParticles = 24): DustPuffSystem {
  const geometry = new THREE.IcosahedronGeometry(0.18, 0);
  const material = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.78
  });
  const mesh = new THREE.InstancedMesh(geometry, material, maxParticles);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;

  const particles: DustParticle[] = Array.from({ length: maxParticles }, () => ({
    x: 0,
    y: -999,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    age: 1,
    life: 0.5,
    baseScale: 0
  }));

  const dummy = new THREE.Object3D();
  const color = new THREE.Color(0xf8fafc);
  for (let i = 0; i < maxParticles; i++) {
    dummy.position.set(0, -999, 0);
    dummy.scale.setScalar(0);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    mesh.setColorAt(i, color);
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  scene.add(mesh);

  let cursor = 0;

  const emit = (
    x: number,
    y: number,
    z: number,
    colorHex: number,
    count: number,
    spread = 1.6
  ) => {
    color.setHex(colorHex);
    for (let i = 0; i < count; i++) {
      const idx = cursor % maxParticles;
      cursor++;
      const ang = ((idx * 137.5) % 360) * (Math.PI / 180);
      const rad = 0.25 + (idx % 3) * 0.22;
      const p = particles[idx];
      p.x = x + Math.cos(ang) * 0.18;
      p.y = y + 0.08;
      p.z = z + Math.sin(ang) * 0.18;
      p.vx = Math.cos(ang) * rad * spread;
      p.vy = 0.65 + (idx % 4) * 0.28;
      p.vz = Math.sin(ang) * rad * spread;
      p.age = 0;
      p.life = 0.36 + (idx % 3) * 0.12;
      p.baseScale = 0.75 + (idx % 3) * 0.32;
      mesh.setColorAt(idx, color);
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  };

  const update = (dt: number) => {
    let dirty = false;
    for (let i = 0; i < maxParticles; i++) {
      const p = particles[i];
      if (p.age < p.life) {
        p.age += dt;
        const progress = Math.min(1, p.age / p.life);
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
        p.vy -= 1.2 * dt;
        const s = p.baseScale * (1 - progress * 0.85) * (0.55 + Math.sin(progress * Math.PI) * 0.65);
        dummy.position.set(p.x, p.y, p.z);
        dummy.rotation.set(progress * 2.2, progress * 1.4, 0);
        dummy.scale.setScalar(Math.max(0.001, s));
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        dirty = true;
      } else if (p.y > -500) {
        p.y = -999;
        dummy.position.set(0, -999, 0);
        dummy.scale.setScalar(0);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        dirty = true;
      }
    }
    if (dirty) mesh.instanceMatrix.needsUpdate = true;
  };

  const dispose = () => {
    if (mesh.parent) mesh.parent.remove(mesh);
    geometry.dispose();
    material.dispose();
  };

  return { mesh, emit, update, dispose };
}

export interface FloorGuideArrowSystem {
  mesh: THREE.Group;
  update: (
    playerPos: THREE.Vector3,
    targetPos: THREE.Vector3 | null,
    groundY: number,
    elapsed: number
  ) => void;
  dispose: () => void;
}

/**
 * Glowing 3D directional arrow + orbit chevron sitting cleanly near the astronaut's feet,
 * pointing smoothly toward the active mission target.
 */
export function createFloorGuideArrowSystem(scene: THREE.Scene): FloorGuideArrowSystem {
  const group = new THREE.Group();

  const arrowMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    emissive: 0x0ea5e9,
    emissiveIntensity: 0.9,
    roughness: 0.28,
    metalness: 0.35
  });

  // Pointer head + tail stem merged into a single draw call across all 3D hubs
  const headGeo = new THREE.ConeGeometry(0.36, 0.72, 4);
  headGeo.rotateX(Math.PI / 2);
  headGeo.rotateZ(Math.PI / 4);
  const stemGeo = new THREE.BoxGeometry(0.2, 0.1, 0.62);
  const arrowGeo = mergeColoredParts([
    { geometry: headGeo, color: 0xfacc15, position: [0, 0, 0.56] },
    { geometry: stemGeo, color: 0xfde047, position: [0, 0, 0] }
  ]);
  headGeo.dispose();
  stemGeo.dispose();
  const arrowMesh = new THREE.Mesh(arrowGeo, arrowMat);

  group.add(arrowMesh);
  group.visible = false;
  scene.add(group);

  const update = (
    playerPos: THREE.Vector3,
    targetPos: THREE.Vector3 | null,
    groundY: number,
    elapsed: number
  ) => {
    if (!targetPos) {
      group.visible = false;
      return;
    }
    const dx = targetPos.x - playerPos.x;
    const dz = targetPos.z - playerPos.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 1.9) {
      group.visible = false;
      return;
    }
    group.visible = true;
    const dirX = dx / dist;
    const dirZ = dz / dist;
    const orbitPulse = 1.45 + Math.sin(elapsed * 4.5) * 0.16;
    group.position.set(
      playerPos.x + dirX * orbitPulse,
      groundY + 0.16 + Math.sin(elapsed * 5) * 0.04,
      playerPos.z + dirZ * orbitPulse
    );
    group.rotation.y = Math.atan2(dirX, dirZ);
    arrowMat.emissiveIntensity = 0.75 + Math.sin(elapsed * 5) * 0.35;
  };

  const dispose = () => {
    if (group.parent) group.parent.remove(group);
    arrowGeo.dispose();
    arrowMat.dispose();
  };

  return { mesh: group, update, dispose };
}
