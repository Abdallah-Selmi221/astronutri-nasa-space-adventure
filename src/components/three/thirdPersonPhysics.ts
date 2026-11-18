import * as THREE from 'three';
import { mergeColoredParts } from './threeMergeUtils';

/**
 * Shortest-arc yaw interpolation in radians to avoid 360-degree snaps.
 */
export function lerpAngle(current: number, target: number, alpha: number): number {
  const diff = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + diff * Math.min(1, Math.max(0, alpha));
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
