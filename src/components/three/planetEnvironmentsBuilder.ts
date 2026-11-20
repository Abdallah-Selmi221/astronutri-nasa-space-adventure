import * as THREE from 'three';
import {
  animateBlenderEnvironmentGlb,
  attachPhase3PlanetGlb,
  disposeObject3D,
  loadCachedGlbClone
} from './blenderModelLoader';
import { generatePlanetWorldLayout, PlanetWorldLayout } from './planetWorldLayout';
import {
  evalSectorFloorHeight,
  MARS_L4_PADS,
  MARS_L4_ROADS,
  MOON_L3_PADS,
  MOON_L3_ROADS,
  PadZone,
  RoadSegment
} from './terrainMath';
import { mergeColoredParts } from './threeMergeUtils';

export interface PlanetEnvironmentHandle {
  group: THREE.Group;
  layout: PlanetWorldLayout | null;
  update: (elapsed: number) => void;
  dispose: () => void;
}

function extractGlbMeshGeometry(root: THREE.Object3D, meshName: string): THREE.BufferGeometry | null {
  const obj = root.getObjectByName(meshName);
  if (!obj) return null;
  root.updateMatrixWorld(true);
  let targetMesh: THREE.Mesh | null = null;
  if (obj instanceof THREE.Mesh) {
    targetMesh = obj;
  } else {
    obj.traverse((child) => {
      if (!targetMesh && child instanceof THREE.Mesh) targetMesh = child;
    });
  }
  if (!targetMesh?.geometry) return null;
  const cloned = targetMesh.geometry.clone();
  cloned.applyMatrix4(targetMesh.matrixWorld);
  if (!cloned.getAttribute('normal')) cloned.computeVertexNormals();
  return cloned;
}

function createLunarRegolithTexture(
  worldSize: number,
  pads: readonly PadZone[],
  roads: readonly RoadSegment[],
  evalHeight: (x: number, z: number) => number,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const size = 1024;
  const half = worldSize * 0.5;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const toPx = (wx: number) => ((wx + half) / worldSize) * size;
  const toPy = (wz: number) => ((wz + half) / worldSize) * size;
  const pxPerMeter = size / worldSize;

  if (ctx) {
    const baseRes = 256;
    const baseCanvas = document.createElement('canvas');
    baseCanvas.width = baseRes;
    baseCanvas.height = baseRes;
    const baseCtx = baseCanvas.getContext('2d');
    if (baseCtx) {
      const img = baseCtx.createImageData(baseRes, baseRes);
      const data = img.data;
      for (let py = 0; py < baseRes; py++) {
        const wz = (py / (baseRes - 1) - 0.5) * worldSize;
        for (let px = 0; px < baseRes; px++) {
          const wx = (px / (baseRes - 1) - 0.5) * worldSize;
          const h = evalHeight(wx, wz);
          const n1 = Math.sin(wx * 0.12 + wz * 0.09) * 0.5 + 0.5;
          const n2 = Math.cos(wx * 0.27 - wz * 0.23) * 0.5 + 0.5;
          const ripple = Math.sin(wx * 0.65 + Math.cos(wz * 0.45) * 1.8) * 0.5 + 0.5;

          // Silver-grey lunar regolith with anorthosite highlands & darker basalt maria
          let v = 132 + n1 * 28 + n2 * 18 + ripple * 12;
          if (h < 0.25) v -= 18;
          if (h > 4.0) v += Math.min(34, (h - 4.0) * 3.5);

          const idx = (py * baseRes + px) * 4;
          data[idx] = Math.max(45, Math.min(242, Math.round(v * 0.96)));
          data[idx + 1] = Math.max(48, Math.min(245, Math.round(v * 0.99)));
          data[idx + 2] = Math.max(54, Math.min(252, Math.round(v * 1.05)));
          data[idx + 3] = 255;
        }
      }
      baseCtx.putImageData(img, 0, 0);
      ctx.drawImage(baseCanvas, 0, 0, size, size);
    }

    // Crisp micro-craters with sunlit rims & dark shadowed bowls
    for (let c = 0; c < 340; c++) {
      const cx = (c * 7919 + 137) % size;
      const cy = (c * 104729 + 293) % size;
      const r = 3 + (c % 5) * 3.2;
      ctx.strokeStyle = 'rgba(241, 245, 249, 0.45)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(cx - 0.8, cy - 0.8, r, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(30, 41, 59, 0.42)';
      ctx.beginPath();
      ctx.arc(cx + 0.6, cy + 0.6, r * 0.78, 0, Math.PI * 2);
      ctx.fill();
    }

    // Fine rock grit & regolith pebbles
    for (let i = 0; i < 5200; i++) {
      const gx = (i * 6151) % size;
      const gy = (i * 98317) % size;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(248, 250, 252, 0.24)' : 'rgba(15, 23, 42, 0.28)';
      ctx.fillRect(gx, gy, 2, 2);
    }

    // Compacted dark basalt rover track verge along lunar roads & pads
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const s of roads) {
      ctx.strokeStyle = 'rgba(71, 85, 105, 0.82)';
      ctx.lineWidth = (s.halfWidth * 2 + 2.6) * pxPerMeter;
      ctx.beginPath();
      ctx.moveTo(toPx(s.ax), toPy(s.az));
      ctx.lineTo(toPx(s.bx), toPy(s.bz));
      ctx.stroke();
    }

    for (const p of pads) {
      const cx = toPx(p.x);
      const cy = toPy(p.z);
      const r = (p.flatRadius + 2.2) * pxPerMeter;
      const grad = ctx.createRadialGradient(cx, cy, r * 0.3, cx, cy, r);
      grad.addColorStop(0, 'rgba(71, 85, 105, 0.90)');
      grad.addColorStop(1, 'rgba(71, 85, 105, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(4, maxAnisotropy);
  tex.needsUpdate = true;
  return tex;
}

function createMartianRegolithTexture(
  worldSize: number,
  pads: readonly PadZone[],
  roads: readonly RoadSegment[],
  evalHeight: (x: number, z: number) => number,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const size = 1024;
  const half = worldSize * 0.5;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const toPx = (wx: number) => ((wx + half) / worldSize) * size;
  const toPy = (wz: number) => ((wz + half) / worldSize) * size;
  const pxPerMeter = size / worldSize;

  if (ctx) {
    const baseRes = 256;
    const baseCanvas = document.createElement('canvas');
    baseCanvas.width = baseRes;
    baseCanvas.height = baseRes;
    const baseCtx = baseCanvas.getContext('2d');
    if (baseCtx) {
      const img = baseCtx.createImageData(baseRes, baseRes);
      const data = img.data;
      for (let py = 0; py < baseRes; py++) {
        const wz = (py / (baseRes - 1) - 0.5) * worldSize;
        for (let px = 0; px < baseRes; px++) {
          const wx = (px / (baseRes - 1) - 0.5) * worldSize;
          const h = evalHeight(wx, wz);
          const n1 = Math.sin(wx * 0.11 - wz * 0.08) * 0.5 + 0.5;
          const n2 = Math.cos(wx * 0.24 + wz * 0.19) * 0.5 + 0.5;
          const dune = Math.sin(wx * 0.55 + Math.sin(wz * 0.32) * 2.2) * 0.5 + 0.5;

          // Rust-orange / terracotta / iron-oxide Martian soil
          let r = 182 + n1 * 38 + dune * 22;
          let g = 78 + n2 * 26 + dune * 16;
          let b = 38 + n2 * 14;

          if (h > 4.2) {
            const wallT = Math.min(1, (h - 4.2) / 10.0);
            r = r * (1 - wallT) + 142 * wallT;
            g = g * (1 - wallT) + 52 * wallT;
            b = b * (1 - wallT) + 28 * wallT;
          }

          const idx = (py * baseRes + px) * 4;
          data[idx] = Math.max(60, Math.min(248, Math.round(r)));
          data[idx + 1] = Math.max(24, Math.min(165, Math.round(g)));
          data[idx + 2] = Math.max(14, Math.min(96, Math.round(b)));
          data[idx + 3] = 255;
        }
      }
      baseCtx.putImageData(img, 0, 0);
      ctx.drawImage(baseCanvas, 0, 0, size, size);
    }

    // Cracked Martian dry riverbed fissures & iron-oxide rock strata lines
    ctx.strokeStyle = 'rgba(124, 45, 18, 0.36)';
    ctx.lineWidth = 1.5;
    for (let k = 0; k < 280; k++) {
      const sx = (k * 8191) % size;
      const sy = (k * 131071) % size;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + ((k % 7) - 3) * 14, sy + ((k % 5) - 2) * 12);
      ctx.stroke();
    }

    // Iron-oxide pebbles & ochre dust speckles
    for (let i = 0; i < 4800; i++) {
      const gx = (i * 6151) % size;
      const gy = (i * 98317) % size;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(253, 186, 116, 0.24)' : 'rgba(124, 45, 18, 0.32)';
      ctx.fillRect(gx, gy, 2, 2);
    }

    // Sandy ochre rover trail verges
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const s of roads) {
      ctx.strokeStyle = 'rgba(217, 119, 6, 0.72)';
      ctx.lineWidth = (s.halfWidth * 2 + 2.8) * pxPerMeter;
      ctx.beginPath();
      ctx.moveTo(toPx(s.ax), toPy(s.az));
      ctx.lineTo(toPx(s.bx), toPy(s.bz));
      ctx.stroke();
    }

    for (const p of pads) {
      const cx = toPx(p.x);
      const cy = toPy(p.z);
      const r = (p.flatRadius + 2.4) * pxPerMeter;
      const grad = ctx.createRadialGradient(cx, cy, r * 0.3, cx, cy, r);
      grad.addColorStop(0, 'rgba(180, 83, 9, 0.85)');
      grad.addColorStop(1, 'rgba(180, 83, 9, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(4, maxAnisotropy);
  tex.needsUpdate = true;
  return tex;
}

function createPlanetaryRoverTrackTexture(mode: 'moon' | 'mars', maxAnisotropy: number): THREE.CanvasTexture {
  const w = 512;
  const h = 512;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const isMoon = mode === 'moon';
    ctx.fillStyle = isMoon ? '#64748b' : '#9a3412';
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = isMoon ? '#334155' : '#7c2d12';
    ctx.fillRect(Math.round(w * 0.08), 0, Math.round(w * 0.84), h);

    // Woven-mesh tire tread chevron imprints along left & right wheel ruts
    ctx.fillStyle = isMoon ? 'rgba(148, 163, 184, 0.42)' : 'rgba(251, 146, 60, 0.38)';
    for (let y = 8; y < h; y += 24) {
      ctx.fillRect(104, y, 64, 10);
      ctx.fillRect(w - 168, y, 64, 10);
    }

    // Glowing rover guide track rails along edges + center dashed beacon line
    ctx.fillStyle = isMoon ? '#38bdf8' : '#fbbf24';
    ctx.fillRect(46, 0, 12, h);
    ctx.fillRect(w - 58, 0, 12, h);

    ctx.fillStyle = isMoon ? '#f43f5e' : '#fed7aa';
    ctx.fillRect(w * 0.5 - 7, 28, 14, 172);
    ctx.fillRect(w * 0.5 - 7, 284, 14, 172);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = Math.min(8, maxAnisotropy);
  tex.needsUpdate = true;
  return tex;
}

function createPlanetaryRoadRibbonGeometry(
  segments: readonly RoadSegment[],
  evalHeight: (x: number, z: number) => number
): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];

  for (const s of segments) {
    const dx = s.bx - s.ax;
    const dz = s.bz - s.az;
    const len = Math.hypot(dx, dz);
    if (len < 0.2) continue;
    const nx = -dz / len;
    const nz = dx / len;
    const outerHalf = s.halfWidth + 0.52;
    const subdivs = Math.max(4, Math.ceil(len / 3.0));
    const vPerMeter = 0.14;

    for (let i = 0; i < subdivs; i++) {
      const t0 = i / subdivs;
      const t1 = (i + 1) / subdivs;
      const cx0 = s.ax + dx * t0;
      const cz0 = s.az + dz * t0;
      const cx1 = s.ax + dx * t1;
      const cz1 = s.az + dz * t1;

      const x0L = cx0 - nx * s.halfWidth;
      const z0L = cz0 - nz * s.halfWidth;
      const x0R = cx0 + nx * s.halfWidth;
      const z0R = cz0 + nz * s.halfWidth;
      const x1L = cx1 - nx * s.halfWidth;
      const z1L = cz1 - nz * s.halfWidth;
      const x1R = cx1 + nx * s.halfWidth;
      const z1R = cz1 + nz * s.halfWidth;

      const s0L = cx0 - nx * outerHalf;
      const sz0L = cz0 - nz * outerHalf;
      const s0R = cx0 + nx * outerHalf;
      const sz0R = cz0 + nz * outerHalf;
      const s1L = cx1 - nx * outerHalf;
      const sz1L = cz1 - nz * outerHalf;
      const s1R = cx1 + nx * outerHalf;
      const sz1R = cz1 + nz * outerHalf;

      const y0C = evalHeight(cx0, cz0) + 0.14;
      const y1C = evalHeight(cx1, cz1) + 0.14;
      const y0L = evalHeight(x0L, z0L) + 0.14;
      const y0R = evalHeight(x0R, z0R) + 0.14;
      const y1L = evalHeight(x1L, z1L) + 0.14;
      const y1R = evalHeight(x1R, z1R) + 0.14;

      const sy0L = evalHeight(s0L, sz0L) - 0.18;
      const sy0R = evalHeight(s0R, sz0R) - 0.18;
      const sy1L = evalHeight(s1L, sz1L) - 0.18;
      const sy1R = evalHeight(s1R, sz1R) - 0.18;

      const v0 = t0 * len * vPerMeter;
      const v1 = t1 * len * vPerMeter;

      const pushQuad = (
        a: [number, number, number],
        uva: [number, number],
        b: [number, number, number],
        uvb: [number, number],
        c: [number, number, number],
        uvc: [number, number],
        d: [number, number, number],
        uvd: [number, number]
      ) => {
        positions.push(...a, ...b, ...c, ...a, ...c, ...d);
        uvs.push(...uva, ...uvb, ...uvc, ...uva, ...uvc, ...uvd);
      };

      pushQuad([s0L, sy0L, sz0L], [0.02, v0], [x0L, y0L, z0L], [0.08, v0], [x1L, y1L, z1L], [0.08, v1], [s1L, sy1L, sz1L], [0.02, v1]);
      pushQuad([x0L, y0L, z0L], [0.08, v0], [cx0, y0C, cz0], [0.5, v0], [cx1, y1C, cz1], [0.5, v1], [x1L, y1L, z1L], [0.08, v1]);
      pushQuad([cx0, y0C, cz0], [0.5, v0], [x0R, y0R, z0R], [0.92, v0], [x1R, y1R, z1R], [0.92, v1], [cx1, y1C, cz1], [0.5, v1]);
      pushQuad([x0R, y0R, z0R], [0.92, v0], [s0R, sy0R, sz0R], [0.98, v0], [s1R, sy1R, sz1R], [0.98, v1], [x1R, y1R, z1R], [0.92, v1]);
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geom.computeVertexNormals();
  return geom;
}

/**
 * LEVEL 3 — MOON SHACKLETON MODULAR OUTPOST ENVIRONMENT BUILDER
 * - Textured silver-grey lunar regolith terrain mesh (micro-craters, dust ripples, rock grit)
 * - Glowing rover guide tracks connecting spaced-out lunar stations
 * - Large glowing Blue Earth ("Earthrise") + warm golden sun-flare halo hanging above lunar horizon
 * - Grounded crater boulders (moon_crater_rocks.glb), comm dish towers (moon_comm_tower.glb), and beacons
 */
export function buildMoonEnvironment(opts: {
  scene: THREE.Scene;
  isDisposed: () => boolean;
  maxAnisotropy?: number;
}): PlanetEnvironmentHandle {
  const { scene, isDisposed } = opts;
  const maxAniso = opts.maxAnisotropy ?? 4;
  const layout = generatePlanetWorldLayout('moon_l3');
  const evalHeight = (x: number, z: number) => evalSectorFloorHeight(3, x, z);

  const group = new THREE.Group();
  group.name = 'MoonShackletonEnvironment';
  scene.add(group);

  const disposableTextures: THREE.Texture[] = [];
  const animatedGlbGroups: THREE.Group[] = [];

  scene.background = new THREE.Color(0x020617);
  scene.fog = new THREE.FogExp2(0x091326, 0.0028);

  // 1. Sculpted 96x96 Lunar Regolith Crater Basin Mesh
  const segs = 96;
  const terrainGeom = new THREE.PlaneGeometry(layout.worldSize, layout.worldSize, segs, segs);
  terrainGeom.rotateX(-Math.PI / 2);
  const posAttr = terrainGeom.getAttribute('position');
  for (let i = 0; i < posAttr.count; i++) {
    const vx = posAttr.getX(i);
    const vz = posAttr.getZ(i);
    posAttr.setY(i, evalHeight(vx, vz));
  }
  terrainGeom.computeVertexNormals();

  const regolithTex = createLunarRegolithTexture(
    layout.worldSize,
    MOON_L3_PADS,
    MOON_L3_ROADS,
    evalHeight,
    maxAniso
  );
  disposableTextures.push(regolithTex);

  const terrainMesh = new THREE.Mesh(
    terrainGeom,
    new THREE.MeshStandardMaterial({
      map: regolithTex,
      roughness: 0.88,
      metalness: 0.06
    })
  );
  terrainMesh.receiveShadow = true;
  group.add(terrainMesh);

  // 2. Crisp Glowing Lunar Rover Guide Tracks (+0.14m elevation so regolith never clips!)
  const trackTex = createPlanetaryRoverTrackTexture('moon', maxAniso);
  disposableTextures.push(trackTex);
  const trackMesh = new THREE.Mesh(
    createPlanetaryRoadRibbonGeometry(MOON_L3_ROADS, evalHeight),
    new THREE.MeshStandardMaterial({
      map: trackTex,
      roughness: 0.68,
      metalness: 0.18,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1
    })
  );
  trackMesh.receiveShadow = true;
  group.add(trackMesh);

  // 3. Large Glowing Blue Earth ("Earthrise") + Atmospheric Rim + Warm Sun-Flare Halo above Horizon!
  const earthMat = new THREE.MeshStandardMaterial({
    color: 0x2563eb,
    roughness: 0.62,
    metalness: 0.04,
    emissive: 0x0284c7,
    emissiveIntensity: 0.42
  });
  new THREE.TextureLoader().load('/assets/nasa/earth_blue_marble.jpg', (tex) => {
    if (isDisposed()) {
      tex.dispose();
      return;
    }
    tex.colorSpace = THREE.SRGBColorSpace;
    disposableTextures.push(tex);
    earthMat.color.setHex(0xffffff);
    earthMat.map = tex;
    earthMat.needsUpdate = true;
  });
  const earthriseSphere = new THREE.Mesh(new THREE.SphereGeometry(19, 32, 24), earthMat);
  earthriseSphere.position.set(24, 30, -135);

  const earthriseRim = new THREE.Mesh(
    new THREE.SphereGeometry(20.5, 28, 20),
    new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.34,
      side: THREE.BackSide
    })
  );
  earthriseRim.position.copy(earthriseSphere.position);

  // Warm Golden Sun-Flare Halo Disc in Lunar Sky
  const flareCanvas = document.createElement('canvas');
  flareCanvas.width = 256;
  flareCanvas.height = 256;
  const fCtx = flareCanvas.getContext('2d');
  if (fCtx) {
    const grad = fCtx.createRadialGradient(128, 128, 6, 128, 128, 124);
    grad.addColorStop(0, 'rgba(255, 251, 235, 1.0)');
    grad.addColorStop(0.22, 'rgba(253, 224, 71, 0.85)');
    grad.addColorStop(0.55, 'rgba(56, 189, 248, 0.32)');
    grad.addColorStop(1, 'rgba(2, 6, 23, 0.0)');
    fCtx.fillStyle = grad;
    fCtx.fillRect(0, 0, 256, 256);
  }
  const flareTex = new THREE.CanvasTexture(flareCanvas);
  flareTex.colorSpace = THREE.SRGBColorSpace;
  disposableTextures.push(flareTex);
  const sunFlareSprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: flareTex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  sunFlareSprite.position.set(42, 38, -138);
  sunFlareSprite.scale.set(38, 38, 1);
  group.add(earthriseSphere, earthriseRim, sunFlareSprite);

  // 4. Grounded Lunar Crater Rim Boulders (InstancedMesh upgraded from moon_crater_rocks.glb)
  const rockInst = new THREE.InstancedMesh(
    mergeColoredParts([
      { geometry: new THREE.CylinderGeometry(1.45, 2.15, 2.2, 7), color: 0x475569, position: [0, 0.25, 0] },
      { geometry: new THREE.IcosahedronGeometry(1.35, 1), color: 0x94a3b8, position: [-0.6, 0.95, 0.35], scale: [1.2, 0.9, 1.05] }
    ]),
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, flatShading: true }),
    layout.rocks.length
  );
  rockInst.castShadow = true;
  rockInst.receiveShadow = true;
  const dummy = new THREE.Object3D();
  layout.rocks.forEach((it, idx) => {
    dummy.position.set(it.x, it.y, it.z);
    dummy.rotation.set(0, it.rotY, 0);
    dummy.scale.set(it.scale, it.scaleY ?? it.scale, it.scale);
    dummy.updateMatrix();
    rockInst.setMatrixAt(idx, dummy.matrix);
  });
  rockInst.instanceMatrix.needsUpdate = true;
  group.add(rockInst);

  void loadCachedGlbClone('/models/moon_crater_rocks.glb').then((glb) => {
    if (!glb) return;
    if (isDisposed()) {
      disposeObject3D(glb);
      return;
    }
    const rockGeom = extractGlbMeshGeometry(glb, 'MoonRock');
    if (rockGeom) {
      rockInst.geometry.dispose();
      rockInst.geometry = rockGeom;
    }
    disposeObject3D(glb);
  });

  // 5. Grounded Lunar Comm Dish Towers & Twin Solar Wing Arrays (moon_comm_tower.glb)
  layout.commTowers.forEach((ct) => {
    const towerRoot = new THREE.Group();
    towerRoot.position.set(ct.x, ct.y, ct.z);
    group.add(towerRoot);

    const fb = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.8, 4.5, 8),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.4 })
    );
    fb.position.y = 2.2;
    towerRoot.add(fb);

    attachPhase3PlanetGlb({
      modelName: 'moon_comm_tower',
      targetParent: towerRoot,
      scale: ct.scale,
      rotationY: ct.rotY,
      fallbackNodes: [fb],
      isDisposed,
      onLoaded: (g) => {
        animatedGlbGroups.push(g);
      }
    });
  });

  // 6. Glowing Lunar Guide Beacons
  const beaconGeom = mergeColoredParts([
    { geometry: new THREE.CylinderGeometry(0.14, 0.22, 1.45, 8), color: 0xe2e8f0, position: [0, 0.55, 0] },
    { geometry: new THREE.OctahedronGeometry(0.28, 0), color: 0x38bdf8, position: [0, 1.45, 0] }
  ]);
  const beaconInst = new THREE.InstancedMesh(
    beaconGeom,
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      emissive: 0x0284c7,
      emissiveIntensity: 0.65,
      roughness: 0.3
    }),
    layout.beacons.length
  );
  layout.beacons.forEach((b, idx) => {
    dummy.position.set(b.x, b.y, b.z);
    dummy.rotation.set(0, b.rotY, 0);
    dummy.scale.setScalar(b.scale);
    dummy.updateMatrix();
    beaconInst.setMatrixAt(idx, dummy.matrix);
  });
  beaconInst.instanceMatrix.needsUpdate = true;
  group.add(beaconInst);

  const update = (elapsed: number) => {
    earthriseSphere.rotation.y = elapsed * 0.022;
    animatedGlbGroups.forEach((g, idx) => animateBlenderEnvironmentGlb(g, elapsed + idx * 0.7));
  };

  const dispose = () => {
    disposableTextures.forEach((t) => t.dispose());
    disposeObject3D(group);
  };

  return { group, layout, update, dispose };
}

/**
 * LEVEL 4 — MARS DUSTY RED CANYON & ORION RETURN ENVIRONMENT BUILDER
 * - High-detail rust-orange/terracotta cracked regolith ground texture + sandy rover tracks
 * - Dense golden-orange atmospheric fog (THREE.FogExp2) + warm amber sky dome
 * - 360° Towering Red Canyon Rim Walls (mars_canyon_ring.glb) + Stratified Rock Mesas (mars_canyon_cliffs.glb)
 * - Continuous drifting Martian dust particles (THREE.Points)
 */
export function buildMarsEnvironment(opts: {
  scene: THREE.Scene;
  isDisposed: () => boolean;
  maxAnisotropy?: number;
}): PlanetEnvironmentHandle {
  const { scene, isDisposed } = opts;
  const maxAniso = opts.maxAnisotropy ?? 4;
  const layout = generatePlanetWorldLayout('mars_l4');
  const evalHeight = (x: number, z: number) => evalSectorFloorHeight(4, x, z);

  const group = new THREE.Group();
  group.name = 'MarsRedCanyonEnvironment';
  scene.add(group);

  const disposableTextures: THREE.Texture[] = [];
  const animatedGlbGroups: THREE.Group[] = [];

  // Dense Golden-Orange Martian Atmospheric Fog & Sky Backdrop
  scene.background = new THREE.Color(0xc2592d);
  scene.fog = new THREE.FogExp2(0xc86434, 0.0115);

  const skyMat = new THREE.ShaderMaterial({
    uniforms: {
      uTopColor: { value: new THREE.Color(0x6b2412) },
      uMidColor: { value: new THREE.Color(0xc2592d) },
      uHorizonColor: { value: new THREE.Color(0xfdba74) },
      uSunColor: { value: new THREE.Color(0xfef08a) },
      uSunDir: { value: new THREE.Vector3(0.38, 0.42, -0.82).normalize() }
    },
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uTopColor;
      uniform vec3 uMidColor;
      uniform vec3 uHorizonColor;
      uniform vec3 uSunColor;
      uniform vec3 uSunDir;
      varying vec3 vDir;
      void main() {
        vec3 d = normalize(vDir);
        float h = clamp(d.y * 1.15 + 0.08, 0.0, 1.0);
        vec3 sky = mix(uHorizonColor, uMidColor, smoothstep(0.0, 0.36, h));
        sky = mix(sky, uTopColor, smoothstep(0.36, 0.92, h));
        float sunDot = max(dot(d, normalize(uSunDir)), 0.0);
        float halo = pow(sunDot, 12.0) * 0.48 + pow(sunDot, 90.0) * 0.90;
        sky += uSunColor * halo;
        gl_FragColor = vec4(sky, 1.0);
      }
    `
  });
  const skyDome = new THREE.Mesh(new THREE.SphereGeometry(240, 24, 16), skyMat);
  skyDome.frustumCulled = false;
  group.add(skyDome);

  // 1. Sculpted 96x96 Martian Red Canyon Floor Mesh
  const segs = 96;
  const terrainGeom = new THREE.PlaneGeometry(layout.worldSize, layout.worldSize, segs, segs);
  terrainGeom.rotateX(-Math.PI / 2);
  const posAttr = terrainGeom.getAttribute('position');
  for (let i = 0; i < posAttr.count; i++) {
    const vx = posAttr.getX(i);
    const vz = posAttr.getZ(i);
    posAttr.setY(i, evalHeight(vx, vz));
  }
  terrainGeom.computeVertexNormals();

  const marsTex = createMartianRegolithTexture(
    layout.worldSize,
    MARS_L4_PADS,
    MARS_L4_ROADS,
    evalHeight,
    maxAniso
  );
  disposableTextures.push(marsTex);

  const terrainMesh = new THREE.Mesh(
    terrainGeom,
    new THREE.MeshStandardMaterial({
      map: marsTex,
      roughness: 0.88,
      metalness: 0.04
    })
  );
  terrainMesh.receiveShadow = true;
  group.add(terrainMesh);

  // 2. Martian Rover Trail Ribbon (+0.14m elevation)
  const trackTex = createPlanetaryRoverTrackTexture('mars', maxAniso);
  disposableTextures.push(trackTex);
  const trackMesh = new THREE.Mesh(
    createPlanetaryRoadRibbonGeometry(MARS_L4_ROADS, evalHeight),
    new THREE.MeshStandardMaterial({
      map: trackTex,
      roughness: 0.78,
      metalness: 0.08,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1
    })
  );
  trackMesh.receiveShadow = true;
  group.add(trackMesh);

  // 3. 360° Towering Red Canyon Rim Walls (mars_canyon_ring.glb)
  const fallbackRim = new THREE.Mesh(
    new THREE.CylinderGeometry(118, 96, 32, 32, 1, true),
    new THREE.MeshLambertMaterial({ color: 0x9a3412, side: THREE.DoubleSide })
  );
  fallbackRim.position.y = 10;
  group.add(fallbackRim);

  attachPhase3PlanetGlb({
    modelName: 'mars_canyon_ring',
    targetParent: group,
    scale: 1.0,
    position: [0, 0, 0],
    fallbackNodes: [fallbackRim],
    isDisposed
  });

  // 4. Sculpted Stratified Red Canyon Cliff Mesas (InstancedMesh upgraded from mars_canyon_cliffs.glb)
  const cliffInst = new THREE.InstancedMesh(
    mergeColoredParts([
      { geometry: new THREE.CylinderGeometry(2.45, 3.1, 3.2, 8), color: 0x7c2d12, position: [0, 0.5, 0] },
      { geometry: new THREE.CylinderGeometry(1.85, 2.35, 2.4, 8), color: 0xc2410c, position: [-0.3, 2.3, 0.2] },
      { geometry: new THREE.CylinderGeometry(1.55, 1.8, 1.45, 7), color: 0xea580c, position: [-0.2, 3.8, 0.15] }
    ]),
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.86, flatShading: true }),
    layout.rocks.length
  );
  cliffInst.castShadow = true;
  cliffInst.receiveShadow = true;
  const dummy = new THREE.Object3D();
  layout.rocks.forEach((it, idx) => {
    dummy.position.set(it.x, it.y, it.z);
    dummy.rotation.set(0, it.rotY, 0);
    dummy.scale.set(it.scale, it.scaleY ?? it.scale, it.scale);
    dummy.updateMatrix();
    cliffInst.setMatrixAt(idx, dummy.matrix);
  });
  cliffInst.instanceMatrix.needsUpdate = true;
  group.add(cliffInst);

  void loadCachedGlbClone('/models/mars_canyon_cliffs.glb').then((glb) => {
    if (!glb) return;
    if (isDisposed()) {
      disposeObject3D(glb);
      return;
    }
    const cliffGeom = extractGlbMeshGeometry(glb, 'MarsCliff');
    if (cliffGeom) {
      cliffInst.geometry.dispose();
      cliffInst.geometry = cliffGeom;
    }
    disposeObject3D(glb);
  });

  // 5. Grounded Mars Telemetry Relay Towers
  layout.commTowers.forEach((ct) => {
    const towerRoot = new THREE.Group();
    towerRoot.position.set(ct.x, ct.y, ct.z);
    group.add(towerRoot);

    attachPhase3PlanetGlb({
      modelName: 'moon_comm_tower',
      targetParent: towerRoot,
      scale: ct.scale,
      rotationY: ct.rotY,
      isDisposed,
      onLoaded: (g) => {
        animatedGlbGroups.push(g);
      }
    });
  });

  // 6. Continuous Drifting Martian Atmospheric Dust Particles (THREE.Points)
  const dustCount = 420;
  const dustPositions = new Float32Array(dustCount * 3);
  const dustBaseX = new Float32Array(dustCount);
  const dustBaseY = new Float32Array(dustCount);
  const dustBaseZ = new Float32Array(dustCount);
  for (let i = 0; i < dustCount; i++) {
    const dx = (((i * 7919) % 1000) / 1000 - 0.5) * 140;
    const dy = 0.6 + (((i * 6151) % 1000) / 1000) * 18.0;
    const dz = (((i * 104729) % 1000) / 1000 - 0.5) * 120;
    dustBaseX[i] = dx;
    dustBaseY[i] = dy;
    dustBaseZ[i] = dz;
    dustPositions[i * 3] = dx;
    dustPositions[i * 3 + 1] = dy;
    dustPositions[i * 3 + 2] = dz;
  }
  const dustGeom = new THREE.BufferGeometry();
  const dustPosAttr = new THREE.BufferAttribute(dustPositions, 3);
  dustPosAttr.setUsage(THREE.DynamicDrawUsage);
  dustGeom.setAttribute('position', dustPosAttr);

  const dustMat = new THREE.PointsMaterial({
    color: 0xfdba74,
    size: 0.58,
    transparent: true,
    opacity: 0.62,
    depthWrite: false
  });
  const dustPoints = new THREE.Points(dustGeom, dustMat);
  group.add(dustPoints);

  const update = (elapsed: number) => {
    animatedGlbGroups.forEach((g, idx) => animateBlenderEnvironmentGlb(g, elapsed + idx * 0.7));
    for (let i = 0; i < dustCount; i++) {
      let wx = dustBaseX[i] + elapsed * 5.8 + Math.sin(elapsed * 1.4 + i) * 1.2;
      wx = ((((wx + 70) % 140) + 140) % 140) - 70;
      const wy = dustBaseY[i] + Math.sin(elapsed * 2.1 + i * 0.37) * 0.65;
      const wz = dustBaseZ[i] + Math.cos(elapsed * 1.1 + i * 0.29) * 1.1;
      dustPosAttr.setXYZ(i, wx, wy, wz);
    }
    dustPosAttr.needsUpdate = true;
  };

  const dispose = () => {
    disposableTextures.forEach((t) => t.dispose());
    disposeObject3D(group);
  };

  return { group, layout, update, dispose };
}

/**
 * LEVEL 2 — ISS SUNLIT ORBITAL ATRIUM UPGRADE
 * - Crisp metallic module ribs, warm gold interior handhold bars, cupola window frame,
 *   and glowing exterior solar array wings (iss_orbital_ribs.glb)
 * - Subtle zero-G floating dust motes (THREE.Points)
 * - Massive slowly rotating sunlit Curved Blue Earth + multi-layer atmospheric horizon glow below cupola
 */
export function buildIssEnvironment(opts: {
  scene: THREE.Scene;
  isDisposed: () => boolean;
}): PlanetEnvironmentHandle {
  const { scene, isDisposed } = opts;
  const group = new THREE.Group();
  group.name = 'IssOrbitalAtriumEnvironment';
  scene.add(group);

  const disposableTextures: THREE.Texture[] = [];
  const animatedGlbGroups: THREE.Group[] = [];

  // 1. Attach Crisp Metallic Module Ribs, Warm Gold Interior Handholds & Glowing Solar Array Wings
  attachPhase3PlanetGlb({
    modelName: 'iss_orbital_ribs',
    targetParent: group,
    scale: 1.0,
    position: [0, 0, 0],
    isDisposed,
    onLoaded: (g) => {
      animatedGlbGroups.push(g);
    }
  });

  // 2. Massive Slowly Rotating Sunlit Curved Blue Earth Filling the Horizon Below the Cupola
  const earthMat = new THREE.MeshStandardMaterial({
    color: 0x1d4ed8,
    roughness: 0.58,
    metalness: 0.06,
    emissive: 0x0284c7,
    emissiveIntensity: 0.42
  });
  new THREE.TextureLoader().load('/assets/nasa/earth_blue_marble.jpg', (tex) => {
    if (isDisposed()) {
      tex.dispose();
      return;
    }
    tex.colorSpace = THREE.SRGBColorSpace;
    disposableTextures.push(tex);
    earthMat.color.setHex(0xffffff);
    earthMat.map = tex;
    earthMat.needsUpdate = true;
  });
  const curvedEarth = new THREE.Mesh(new THREE.SphereGeometry(56, 40, 28), earthMat);
  curvedEarth.position.set(0, -30, -64);

  const atmosphereInner = new THREE.Mesh(
    new THREE.SphereGeometry(57.8, 36, 24),
    new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.32,
      side: THREE.BackSide
    })
  );
  atmosphereInner.position.copy(curvedEarth.position);

  const atmosphereOuter = new THREE.Mesh(
    new THREE.SphereGeometry(60.2, 32, 20),
    new THREE.MeshBasicMaterial({
      color: 0x7dd3fc,
      transparent: true,
      opacity: 0.16,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending
    })
  );
  atmosphereOuter.position.copy(curvedEarth.position);
  group.add(curvedEarth, atmosphereInner, atmosphereOuter);

  // 3. Subtle Zero-G Floating Cabin & Orbital Light Motes (THREE.Points)
  const moteCount = 180;
  const motePositions = new Float32Array(moteCount * 3);
  const moteBase = new Float32Array(moteCount * 3);
  for (let i = 0; i < moteCount; i++) {
    const mx = (((i * 7919) % 1000) / 1000 - 0.5) * 42;
    const my = 0.5 + (((i * 6151) % 1000) / 1000) * 6.5;
    const mz = (((i * 104729) % 1000) / 1000 - 0.5) * 18;
    moteBase[i * 3] = mx;
    moteBase[i * 3 + 1] = my;
    moteBase[i * 3 + 2] = mz;
    motePositions[i * 3] = mx;
    motePositions[i * 3 + 1] = my;
    motePositions[i * 3 + 2] = mz;
  }
  const moteGeom = new THREE.BufferGeometry();
  const moteAttr = new THREE.BufferAttribute(motePositions, 3);
  moteAttr.setUsage(THREE.DynamicDrawUsage);
  moteGeom.setAttribute('position', moteAttr);

  const motePoints = new THREE.Points(
    moteGeom,
    new THREE.PointsMaterial({
      color: 0xbae6fd,
      size: 0.18,
      transparent: true,
      opacity: 0.68,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
  );
  group.add(motePoints);

  const update = (elapsed: number) => {
    curvedEarth.rotation.y = elapsed * 0.022;
    animatedGlbGroups.forEach((g) => animateBlenderEnvironmentGlb(g, elapsed));
    for (let i = 0; i < moteCount; i++) {
      const bx = moteBase[i * 3];
      const by = moteBase[i * 3 + 1];
      const bz = moteBase[i * 3 + 2];
      moteAttr.setXYZ(
        i,
        bx + Math.sin(elapsed * 0.7 + i) * 0.45,
        by + Math.cos(elapsed * 0.9 + i * 0.5) * 0.35,
        bz + Math.sin(elapsed * 0.6 + i * 0.3) * 0.40
      );
    }
    moteAttr.needsUpdate = true;
  };

  const dispose = () => {
    disposableTextures.forEach((t) => t.dispose());
    disposeObject3D(group);
  };

  return { group, layout: null, update, dispose };
}
