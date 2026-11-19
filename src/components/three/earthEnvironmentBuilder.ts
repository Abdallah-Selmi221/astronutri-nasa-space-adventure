import * as THREE from 'three';
import {
  EARTH_L1_PADS,
  EARTH_L1_ROADS,
  evalOverworldTerrainHeight,
  evalSectorFloorHeight,
  HUB_PADS,
  HUB_ROADS,
  PadZone,
  RoadSegment
} from './terrainMath';
import { EarthWorldLayout, EarthWorldMode, generateEarthWorldLayout, GroundedPropPlacement } from './earthWorldLayout';
import { disposeObject3D, loadCachedGlbClone } from './blenderModelLoader';
import { ColoredGeometryPart, mergeColoredParts } from './threeMergeUtils';

export interface EarthEnvironmentHandle {
  group: THREE.Group;
  layout: EarthWorldLayout;
  update: (elapsed: number, cameraPos?: THREE.Vector3) => void;
  dispose: () => void;
}

function createBlendedValleyGroundTextures(
  worldSize: number,
  pads: readonly PadZone[],
  roads: readonly RoadSegment[],
  evalHeight: (x: number, z: number) => number,
  maxAnisotropy: number
): { map: THREE.CanvasTexture } {
  const half = worldSize * 0.5;
  const baseRes = 320;
  const baseCanvas = document.createElement('canvas');
  baseCanvas.width = baseRes;
  baseCanvas.height = baseRes;
  const baseCtx = baseCanvas.getContext('2d');

  if (baseCtx) {
    const imgData = baseCtx.createImageData(baseRes, baseRes);
    const data = imgData.data;

    for (let py = 0; py < baseRes; py++) {
      const wz = (py / (baseRes - 1) - 0.5) * worldSize;
      for (let px = 0; px < baseRes; px++) {
        const wx = (px / (baseRes - 1) - 0.5) * worldSize;
        const h = evalHeight(wx, wz);

        // Multi-frequency organic biome blending
        const n1 = Math.sin(wx * 0.08 + wz * 0.07) * 0.5 + 0.5;
        const n2 = Math.cos(wx * 0.19 - wz * 0.15) * 0.5 + 0.5;
        const n3 = Math.sin(wx * 0.37 + wz * 0.29) * 0.5 + 0.5;

        // Sunlit meadow base palette (emerald -> spring -> sunny clover)
        let r = 68 + n1 * 34 + n2 * 18 - n3 * 12;
        let g = 178 + n1 * 32 + n3 * 16;
        let b = 72 + n2 * 16;

        // Warm wildflower meadow patches
        if (n1 * n2 > 0.56 && h < 5.5) {
          r += 22;
          g += 12;
        }

        // Foothills rock/sandstone strata transition
        if (h > 4.2) {
          const rockT = Math.min(1, (h - 4.2) / 9.5);
          const sandR = 148 + n2 * 22;
          const sandG = 134 + n2 * 18;
          const sandB = 112 + n3 * 14;
          r = r * (1 - rockT) + sandR * rockT;
          g = g * (1 - rockT) + sandG * rockT;
          b = b * (1 - rockT) + sandB * rockT;
        }

        // High mountain cool granite & sunlit snow accents
        if (h > 13.5) {
          const snowT = Math.min(1, (h - 13.5) / 10.0);
          r = r * (1 - snowT) + 232 * snowT;
          g = g * (1 - snowT) + 240 * snowT;
          b = b * (1 - snowT) + 248 * snowT;
        }

        const idx = (py * baseRes + px) * 4;
        data[idx] = Math.max(0, Math.min(255, Math.round(r)));
        data[idx + 1] = Math.max(0, Math.min(255, Math.round(g)));
        data[idx + 2] = Math.max(0, Math.min(255, Math.round(b)));
        data[idx + 3] = 255;
      }
    }
    baseCtx.putImageData(imgData, 0, 0);
  }

  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const toPx = (wx: number) => ((wx + half) / worldSize) * size;
  const toPy = (wz: number) => ((wz + half) / worldSize) * size;
  const pxPerMeter = size / worldSize;

  if (ctx) {
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(baseCanvas, 0, 0, size, size);

    // Subtle painterly meadow speckles & tiny wildflowers outside roads
    for (let i = 0; i < 4200; i++) {
      const fx = ((i * 7919) % 1024);
      const fy = ((i * 104729) % 1024);
      const wx = (fx / size - 0.5) * worldSize;
      const wz = (fy / size - 0.5) * worldSize;
      if (evalHeight(wx, wz) > 6.5) continue;
      if (i % 9 === 0) {
        ctx.fillStyle =
          i % 27 === 0
            ? 'rgba(250, 204, 21, 0.72)'
            : i % 18 === 0
            ? 'rgba(244, 114, 182, 0.65)'
            : 'rgba(255, 255, 255, 0.68)';
        ctx.beginPath();
        ctx.arc(fx, fy, 1.8, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = i % 2 === 0 ? 'rgba(34, 197, 94, 0.25)' : 'rgba(132, 204, 22, 0.22)';
        ctx.fillRect(fx, fy, 3, 5);
      }
    }

    // 1. Warm Soft Sandy Dirt Verges & Blending Soil along roads & plazas (crisp asphalt & stone sits cleanly on top)
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const s of roads) {
      ctx.strokeStyle = 'rgba(205, 166, 110, 0.90)';
      ctx.lineWidth = (s.halfWidth * 2 + 3.4) * pxPerMeter;
      ctx.beginPath();
      ctx.moveTo(toPx(s.ax), toPy(s.az));
      ctx.lineTo(toPx(s.bx), toPy(s.bz));
      ctx.stroke();
    }

    // 2. Soft Soil / Gravel Aprons around Pads & Plazas
    for (const p of pads) {
      const cx = toPx(p.x);
      const cy = toPy(p.z);
      const dirtR = (p.flatRadius + 2.8) * pxPerMeter;
      const dirtGrad = ctx.createRadialGradient(cx, cy, p.flatRadius * pxPerMeter * 0.35, cx, cy, dirtR);
      dirtGrad.addColorStop(0, 'rgba(208, 174, 120, 0.96)');
      dirtGrad.addColorStop(0.72, 'rgba(196, 158, 104, 0.72)');
      dirtGrad.addColorStop(1, 'rgba(196, 158, 104, 0)');
      ctx.fillStyle = dirtGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, dirtR, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = Math.min(4, maxAnisotropy);
  map.needsUpdate = true;

  return { map };
}

function createTiledAsphaltRoadTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const w = 512;
  const h = 512;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Stone curb shoulders along outer 10%
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(0, 0, w, h);

    // Rich dark slate Spaceport Asphalt across center 82%
    ctx.fillStyle = '#3f4b5b';
    ctx.fillRect(Math.round(w * 0.08), 0, Math.round(w * 0.84), h);

    // Fine aggregate speckles for crisp close-up texture
    for (let i = 0; i < 4800; i++) {
      const rx = 44 + ((i * 7919) % 424);
      const ry = (i * 104729) % 512;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.14)';
      ctx.fillRect(rx, ry, 2, 2);
    }

    // Crisp white lane shoulder stripes
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(58, 0, 12, h);
    ctx.fillRect(w - 70, 0, 12, h);

    // Crisp golden dashed centerline (tiles seamlessly vertically along UV.y)
    ctx.fillStyle = '#facc15';
    ctx.fillRect(w * 0.5 - 8, 28, 16, 172);
    ctx.fillRect(w * 0.5 - 8, 284, 16, 172);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = Math.min(8, maxAnisotropy);
  tex.needsUpdate = true;
  return tex;
}

function createTiledFootpathTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const w = 256;
  const h = 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#d4b483';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#e7cda0';
    for (let row = 0; row < 4; row++) {
      const y = row * 64 + 6;
      const offset = (row % 2) * 32;
      for (let col = 0; col < 3; col++) {
        ctx.beginPath();
        ctx.roundRect(((col * 84 + offset) % 210) + 18, y, 52, 46, 12);
        ctx.fill();
      }
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = Math.min(8, maxAnisotropy);
  tex.needsUpdate = true;
  return tex;
}

function createRoadRibbonGeometry(
  segments: readonly RoadSegment[],
  evalHeight: (x: number, z: number) => number,
  filterMain: boolean
): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];

  for (const s of segments) {
    const isMain = s.isMainRoad !== false;
    if (isMain !== filterMain) continue;

    const dx = s.bx - s.ax;
    const dz = s.bz - s.az;
    const len = Math.hypot(dx, dz);
    if (len < 0.2) continue;
    const nx = -dz / len;
    const nz = dx / len;
    const outerHalf = s.halfWidth + 0.52;
    const subdivs = Math.max(4, Math.ceil(len / 3.0));
    const vPerMeter = filterMain ? 0.14 : 0.22;

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

      const y0C = evalHeight(cx0, cz0) + 0.045;
      const y1C = evalHeight(cx1, cz1) + 0.045;
      const y0L = evalHeight(x0L, z0L) + 0.045;
      const y0R = evalHeight(x0R, z0R) + 0.045;
      const y1L = evalHeight(x1L, z1L) + 0.045;
      const y1R = evalHeight(x1R, z1R) + 0.045;

      const sy0L = evalHeight(s0L, sz0L) - 0.14;
      const sy0R = evalHeight(s0R, sz0R) - 0.14;
      const sy1L = evalHeight(s1L, sz1L) - 0.14;
      const sy1R = evalHeight(s1R, sz1R) - 0.14;

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

      // Left beveled skirt -> Left road half -> Right road half -> Right beveled skirt
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

function createCrossedGrassTexture(): THREE.CanvasTexture {
  const w = 256;
  const h = 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.clearRect(0, 0, w, h);
    const blades = [
      { x0: 18, wBase: 18, h: 168, curve: -14 },
      { x0: 38, wBase: 20, h: 208, curve: 12 },
      { x0: 62, wBase: 22, h: 196, curve: -18 },
      { x0: 88, wBase: 24, h: 238, curve: 16 },
      { x0: 116, wBase: 24, h: 246, curve: -10 },
      { x0: 144, wBase: 22, h: 228, curve: 18 },
      { x0: 172, wBase: 22, h: 204, curve: -16 },
      { x0: 198, wBase: 20, h: 220, curve: 14 },
      { x0: 224, wBase: 18, h: 176, curve: -12 }
    ];

    for (let i = 0; i < blades.length; i++) {
      const b = blades[i];
      const grad = ctx.createLinearGradient(b.x0, h, b.x0 + b.curve, h - b.h);
      grad.addColorStop(0, '#59b545');
      grad.addColorStop(0.52, '#9ce85d');
      grad.addColorStop(1, '#ebff96');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(b.x0 - b.wBase * 0.5, h);
      ctx.quadraticCurveTo(b.x0 + b.curve * 0.35 - b.wBase * 0.28, h - b.h * 0.55, b.x0 + b.curve, h - b.h);
      ctx.quadraticCurveTo(b.x0 + b.curve * 0.35 + b.wBase * 0.28, h - b.h * 0.55, b.x0 + b.wBase * 0.5, h);
      ctx.closePath();
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createCrossedGrassTuftGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const angles = [0, Math.PI / 3, (Math.PI * 2) / 3];
  for (const ang of angles) {
    const plane = new THREE.PlaneGeometry(1.16, 0.78, 1, 2);
    plane.translate(0, 0.39, 0);
    const pos = plane.getAttribute('position');
    for (let i = 0; i < pos.count; i++) {
      const py = pos.getY(i);
      if (py > 0.55) {
        pos.setZ(i, 0.16);
      } else if (py > 0.22) {
        pos.setZ(i, 0.05);
      }
    }
    plane.rotateY(ang);
    plane.computeVertexNormals();
    parts.push(plane.index ? plane.toNonIndexed() : plane);
    if (plane.index) plane.dispose();
  }
  const merged = mergeColoredParts(parts.map((g) => ({ geometry: g, color: 0xffffff })));
  return merged;
}

function createRoundedTreePlaceholderCanopy(): THREE.BufferGeometry {
  return mergeColoredParts([
    { geometry: new THREE.IcosahedronGeometry(1.35, 1), color: 0xffffff, position: [0, 3.55, 0], scale: [1.15, 0.94, 1.12] },
    { geometry: new THREE.IcosahedronGeometry(1.02, 1), color: 0xe5e7eb, position: [-0.95, 3.05, 0.52], scale: [1.1, 0.88, 1.05] },
    { geometry: new THREE.IcosahedronGeometry(0.98, 1), color: 0xe5e7eb, position: [0.95, 3.12, 0.45], scale: [1.08, 0.88, 1.08] },
    { geometry: new THREE.IcosahedronGeometry(0.94, 1), color: 0xe5e7eb, position: [0.05, 3.18, -0.92], scale: [1.06, 0.9, 1.1] },
    { geometry: new THREE.IcosahedronGeometry(0.88, 1), color: 0xffffff, position: [0.1, 4.4, 0.12], scale: [1.05, 0.86, 1.05] }
  ]);
}

function createRoundedTreePlaceholderTrunk(): THREE.BufferGeometry {
  return mergeColoredParts([
    { geometry: new THREE.CylinderGeometry(0.24, 0.42, 1.2, 8), color: 0x5c361a, position: [0, 0.22, 0] },
    { geometry: new THREE.CylinderGeometry(0.18, 0.26, 2.0, 8), color: 0x784621, position: [0, 1.45, 0] }
  ]);
}

function createBushPlaceholderBody(): THREE.BufferGeometry {
  return mergeColoredParts([
    { geometry: new THREE.IcosahedronGeometry(0.68, 1), color: 0x2da644, position: [0, 0.34, 0], scale: [1.18, 0.92, 1.15] },
    { geometry: new THREE.IcosahedronGeometry(0.48, 1), color: 0x45c458, position: [-0.46, 0.24, 0.22], scale: [1.05, 0.85, 1.05] },
    { geometry: new THREE.IcosahedronGeometry(0.46, 1), color: 0x45c458, position: [0.46, 0.26, -0.2], scale: [1.05, 0.85, 1.05] }
  ]);
}

function createBushPlaceholderFlowers(): THREE.BufferGeometry {
  const parts: ColoredGeometryPart[] = [];
  for (let k = 0; k < 10; k++) {
    const ang = (k / 10) * Math.PI * 2;
    const rad = 0.28 + (k % 2) * 0.22;
    parts.push({
      geometry: new THREE.IcosahedronGeometry(0.11, 0),
      color: 0xffffff,
      position: [Math.cos(ang) * rad, 0.72 - rad * 0.28, Math.sin(ang) * rad]
    });
  }
  return mergeColoredParts(parts);
}

function createDistantMountainRing(innerR: number, outerR: number): THREE.Mesh {
  const segs = 64;
  const geom = new THREE.BufferGeometry();
  const positions: number[] = [];
  const colors: number[] = [];

  const pushTri = (
    a: [number, number, number],
    ca: THREE.Color,
    b: [number, number, number],
    cb: THREE.Color,
    c: [number, number, number],
    cc: THREE.Color
  ) => {
    positions.push(...a, ...b, ...c);
    colors.push(ca.r, ca.g, ca.b, cb.r, cb.g, cb.b, cc.r, cc.g, cc.b);
  };

  const cBase = new THREE.Color(0x2f855a);
  const cMid = new THREE.Color(0x64748b);
  const cSnow = new THREE.Color(0xf8fafc);

  const ringPts: {
    inPt: [number, number, number];
    peakPt: [number, number, number];
    outPt: [number, number, number];
    hasSnow: boolean;
  }[] = [];

  for (let i = 0; i < segs; i++) {
    const ang = (i / segs) * Math.PI * 2;
    const wave =
      0.5 +
      0.5 *
        (Math.sin(ang * 5.0 + 0.4) * 0.55 +
          Math.cos(ang * 9.0 - 0.8) * 0.30 +
          Math.sin(ang * 14.0) * 0.15);
    const peakH = 21 + wave * 28;
    const midR = innerR + 18 + Math.sin(ang * 6.0) * 6;
    ringPts.push({
      inPt: [Math.cos(ang) * innerR, -4, Math.sin(ang) * innerR],
      peakPt: [Math.cos(ang) * midR, peakH, Math.sin(ang) * midR],
      outPt: [Math.cos(ang) * outerR, -6, Math.sin(ang) * outerR],
      hasSnow: peakH > 31
    });
  }

  for (let i = 0; i < segs; i++) {
    const curr = ringPts[i];
    const next = ringPts[(i + 1) % segs];
    const cTopCurr = curr.hasSnow ? cSnow : cMid;
    const cTopNext = next.hasSnow ? cSnow : cMid;
    pushTri(curr.inPt, cBase, curr.peakPt, cTopCurr, next.peakPt, cTopNext);
    pushTri(curr.inPt, cBase, next.peakPt, cTopNext, next.inPt, cBase);
    pushTri(curr.peakPt, cTopCurr, curr.outPt, cMid, next.outPt, cMid);
    pushTri(curr.peakPt, cTopCurr, next.outPt, cMid, next.peakPt, cTopNext);
  }

  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geom.computeVertexNormals();

  const mat = new THREE.MeshLambertMaterial({
    vertexColors: true
  });
  return new THREE.Mesh(geom, mat);
}

function populateMatrixColorInstancedMesh(
  inst: THREE.InstancedMesh,
  items: GroundedPropPlacement[],
  paletteHex: readonly number[] | null
): void {
  const dummy = new THREE.Object3D();
  const col = new THREE.Color();
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    dummy.position.set(it.x, it.y, it.z);
    dummy.rotation.set(0, it.rotY, 0);
    dummy.scale.set(it.scale, it.scaleY ?? it.scale, it.scale);
    dummy.updateMatrix();
    inst.setMatrixAt(i, dummy.matrix);
    if (paletteHex && paletteHex.length > 0) {
      col.setHex(paletteHex[it.colorIdx % paletteHex.length]);
      inst.setColorAt(i, col);
    }
  }
  inst.instanceMatrix.needsUpdate = true;
  if (paletteHex && inst.instanceColor) {
    inst.instanceColor.needsUpdate = true;
  }
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

/**
 * Builds the complete sunlit stylized Earth environment (shared by Earth Level 1 AND Main Hub):
 * - Multi-zone blended ground CanvasTexture + micro-bump variation synced to terrainMath
 * - 2,600–3,200 alpha-tested crossed-blade grass clusters with vertex wind-sway & distance fade
 * - Sculpted multi-canopy colorful rounded trees (greens, golden-orange, pink blossom — zero cones!)
 * - Flowering bushes, deeply embedded layered cliffs (ZERO floating props!), road lampposts, snowy peaks,
 *   daylight gradient sky dome & drifting soft clouds
 */
export function buildEarthEnvironment(opts: {
  scene: THREE.Scene;
  mode: EarthWorldMode;
  isDisposed: () => boolean;
  maxAnisotropy?: number;
}): EarthEnvironmentHandle {
  const { scene, mode, isDisposed } = opts;
  const maxAniso = opts.maxAnisotropy ?? 4;
  const isL1 = mode === 'earth_l1';
  const pads = isL1 ? EARTH_L1_PADS : HUB_PADS;
  const roads = isL1 ? EARTH_L1_ROADS : HUB_ROADS;
  const evalHeight = isL1
    ? (x: number, z: number) => evalSectorFloorHeight(1, x, z)
    : evalOverworldTerrainHeight;

  const group = new THREE.Group();
  group.name = `EarthEnvironment_${mode}`;
  scene.add(group);

  const layout = generateEarthWorldLayout(mode);
  const disposableTextures: THREE.Texture[] = [];

  // Atmosphere & Fog
  scene.background = new THREE.Color(0x63c5ff);
  scene.fog = new THREE.Fog(0x9bd9ff, 78, 260);

  // 1. Expanded Daylight Sky Dome
  const skyMat = new THREE.ShaderMaterial({
    uniforms: {
      uTopColor: { value: new THREE.Color(0x1a8cff) },
      uMidColor: { value: new THREE.Color(0x5ec7ff) },
      uHorizonColor: { value: new THREE.Color(0xe6f7ff) },
      uSunColor: { value: new THREE.Color(0xfef08a) },
      uSunDir: { value: new THREE.Vector3(0.45, 0.52, -0.72).normalize() }
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
        vec3 sky = mix(uHorizonColor, uMidColor, smoothstep(0.0, 0.34, h));
        sky = mix(sky, uTopColor, smoothstep(0.34, 0.90, h));
        float sunDot = max(dot(d, normalize(uSunDir)), 0.0);
        float halo = pow(sunDot, 16.0) * 0.42 + pow(sunDot, 110.0) * 0.95;
        sky += uSunColor * halo;
        gl_FragColor = vec4(sky, 1.0);
      }
    `
  });
  const skyDome = new THREE.Mesh(new THREE.SphereGeometry(285, 24, 16), skyMat);
  skyDome.frustumCulled = false;
  group.add(skyDome);

  // 2. Sculpted Multi-Zone Valley Terrain Mesh
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

  const groundTextures = createBlendedValleyGroundTextures(
    layout.worldSize,
    pads,
    roads,
    evalHeight,
    maxAniso
  );
  disposableTextures.push(groundTextures.map);

  const terrainMesh = new THREE.Mesh(
    terrainGeom,
    new THREE.MeshLambertMaterial({
      map: groundTextures.map
    })
  );
  terrainMesh.receiveShadow = true;
  group.add(terrainMesh);

  // 2b. Crisp High-Resolution Tiled 3D Paved Road Ribbons, Footpaths & Plazas (ZERO pixelated road stripes!)
  const asphaltTex = createTiledAsphaltRoadTexture(maxAniso);
  const gravelTex = createTiledFootpathTexture(maxAniso);
  disposableTextures.push(asphaltTex, gravelTex);

  const mainRoadMesh = new THREE.Mesh(
    createRoadRibbonGeometry(roads, evalHeight, true),
    new THREE.MeshStandardMaterial({
      map: asphaltTex,
      roughness: 0.72,
      metalness: 0.05,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1
    })
  );
  mainRoadMesh.receiveShadow = true;
  group.add(mainRoadMesh);

  const gravelPathGeom = createRoadRibbonGeometry(roads, evalHeight, false);
  if (gravelPathGeom.getAttribute('position').count > 0) {
    const gravelPathMesh = new THREE.Mesh(
      gravelPathGeom,
      new THREE.MeshStandardMaterial({
        map: gravelTex,
        roughness: 0.86,
        metalness: 0.02,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1
      })
    );
    gravelPathMesh.receiveShadow = true;
    group.add(gravelPathMesh);
  } else {
    gravelPathGeom.dispose();
  }

  // Central Paved Courtyard / Spawn Apron Octagon Pads
  const plazaPadParts: ColoredGeometryPart[] = [];
  for (const p of pads) {
    if (p.id !== 'central_plaza' && p.id !== 'spawn_garage' && p.id !== 'hub_space_museum') continue;
    const py = evalHeight(p.x, p.z);
    const pr = Math.max(3.2, p.flatRadius * 0.62);
    plazaPadParts.push(
      { geometry: new THREE.CylinderGeometry(pr, pr + 0.5, 0.14, 16), color: 0x94a3b8, position: [p.x, py + 0.02, p.z] },
      { geometry: new THREE.CylinderGeometry(pr * 0.72, pr * 0.74, 0.16, 16), color: 0x64748b, position: [p.x, py + 0.025, p.z] },
      {
        geometry: new THREE.TorusGeometry(pr * 0.72, 0.09, 6, 32),
        color: isL1 ? 0xfacc15 : 0x38bdf8,
        position: [p.x, py + 0.11, p.z],
        rotation: [Math.PI / 2, 0, 0]
      }
    );
  }
  if (plazaPadParts.length > 0) {
    const plazaMesh = new THREE.Mesh(
      mergeColoredParts(plazaPadParts),
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0.14 })
    );
    plazaMesh.receiveShadow = true;
    group.add(plazaMesh);
  }

  // 3. Distant Snowy Mountain Ring (1 merged mesh)
  const mountainRing = createDistantMountainRing(isL1 ? 132 : 114, isL1 ? 176 : 156);
  group.add(mountainRing);

  // 4. Drifting Soft Daytime Clouds (1 merged mesh rotated gently in update)
  const cloudParts: ColoredGeometryPart[] = [];
  const cloudCount = 12;
  for (let c = 0; c < cloudCount; c++) {
    const ang = (c / cloudCount) * Math.PI * 2 + 0.15;
    const rad = (isL1 ? 98 : 82) + (c % 3) * 18;
    const cx = Math.cos(ang) * rad;
    const cz = Math.sin(ang) * rad;
    const cy = 42 + (c % 4) * 5;
    const sc = 2.4 + (c % 3) * 0.7;
    cloudParts.push(
      { geometry: new THREE.IcosahedronGeometry(2.1 * sc, 1), color: 0xffffff, position: [cx, cy, cz], scale: [1.7, 0.7, 1.1] },
      { geometry: new THREE.IcosahedronGeometry(1.6 * sc, 1), color: 0xf0f9ff, position: [cx - 2.2 * sc, cy - 0.35 * sc, cz + 0.2 * sc], scale: [1.2, 0.72, 0.95] },
      { geometry: new THREE.IcosahedronGeometry(1.5 * sc, 1), color: 0xe0f2fe, position: [cx + 2.3 * sc, cy - 0.4 * sc, cz - 0.2 * sc], scale: [1.25, 0.7, 0.9] }
    );
  }
  const cloudsMesh = new THREE.Mesh(
    mergeColoredParts(cloudParts),
    new THREE.MeshLambertMaterial({
      vertexColors: true,
      emissive: 0xe0f2fe,
      emissiveIntensity: 0.25
    })
  );
  group.add(cloudsMesh);

  // 5. Dense Performant Stylized Crossed-Blade Grass with Vertex Wind-Sway & Distance Fade (1 draw call)
  const grassTex = createCrossedGrassTexture();
  disposableTextures.push(grassTex);
  const grassUniforms = {
    uTime: { value: 0 },
    uCameraPos: { value: new THREE.Vector3(0, 4, 38) }
  };
  const grassMat = new THREE.MeshLambertMaterial({
    color: 0xffffff,
    map: grassTex,
    alphaTest: 0.42,
    side: THREE.DoubleSide
  });
  grassMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = grassUniforms.uTime;
    shader.uniforms.uCameraPos = grassUniforms.uCameraPos;
    shader.vertexShader =
      `uniform float uTime;\nuniform vec3 uCameraPos;\n` +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        #ifdef USE_INSTANCING
          vec4 astroInstOrigin = modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
          float astroCamDist = distance(astroInstOrigin.xyz, uCameraPos);
          float astroDistFade = 1.0 - smoothstep(66.0, 98.0, astroCamDist);
          transformed *= astroDistFade;
          float astroTipW = clamp(position.y / 0.72, 0.0, 1.0);
          float astroBend = astroTipW * astroTipW;
          float astroWave = sin(uTime * 2.3 + astroInstOrigin.x * 0.26 + astroInstOrigin.z * 0.22)
                          + cos(uTime * 1.6 + astroInstOrigin.z * 0.38) * 0.42;
          transformed.x += astroWave * 0.14 * astroBend * astroDistFade;
          transformed.z += cos(uTime * 1.9 + astroInstOrigin.x * 0.32) * 0.08 * astroBend * astroDistFade;
        #endif`
      );
  };
  const grassInst = new THREE.InstancedMesh(
    createCrossedGrassTuftGeometry(),
    grassMat,
    layout.grassTufts.length
  );
  grassInst.castShadow = false;
  grassInst.receiveShadow = false;
  populateMatrixColorInstancedMesh(grassInst, layout.grassTufts, [
    0x4ade80,
    0x22c55e,
    0x84cc16,
    0x34d399
  ]);
  group.add(grassInst);

  // 6. Sculpted Multi-Canopy Colorful Trees (2 InstancedMeshes, upgraded live from Blender GLB)
  const treeTrunksInst = new THREE.InstancedMesh(
    createRoundedTreePlaceholderTrunk(),
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.86 }),
    layout.trees.length
  );
  treeTrunksInst.castShadow = true;
  treeTrunksInst.receiveShadow = true;
  populateMatrixColorInstancedMesh(treeTrunksInst, layout.trees, null);

  const treeCanopiesInst = new THREE.InstancedMesh(
    createRoundedTreePlaceholderCanopy(),
    new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.70 }),
    layout.trees.length
  );
  treeCanopiesInst.castShadow = true;
  treeCanopiesInst.receiveShadow = true;
  populateMatrixColorInstancedMesh(treeCanopiesInst, layout.trees, [
    0x22c55e, // vibrant emerald green
    0x4ade80, // spring green
    0x16a34a, // lush forest
    0xf59e0b, // autumn golden-amber
    0xfb923c, // warm orange maple
    0xf472b6, // cherry blossom pink
    0xf9a8d4  // soft blossom rose
  ]);
  group.add(treeTrunksInst, treeCanopiesInst);

  // 7. Flowering Meadow Bushes (2 InstancedMeshes, upgraded live from Blender GLB)
  const bushBodyInst = new THREE.InstancedMesh(
    createBushPlaceholderBody(),
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.76 }),
    layout.bushes.length
  );
  bushBodyInst.castShadow = true;
  populateMatrixColorInstancedMesh(bushBodyInst, layout.bushes, null);

  const bushFlowerInst = new THREE.InstancedMesh(
    createBushPlaceholderFlowers(),
    new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.42 }),
    layout.bushes.length
  );
  populateMatrixColorInstancedMesh(bushFlowerInst, layout.bushes, [
    0xa855f7, // vivid purple
    0xf43f5e, // crimson red
    0xfacc15, // buttercup yellow
    0xec4899  // rose pink
  ]);
  group.add(bushBodyInst, bushFlowerInst);

  // 8. Grounded Stratified Cliffs (1 InstancedMesh, upgraded live from Blender GLB)
  const cliffInst = new THREE.InstancedMesh(
    mergeColoredParts([
      { geometry: new THREE.CylinderGeometry(1.65, 2.35, 2.4, 8), color: 0x64748b, position: [0, 0.35, 0] },
      { geometry: new THREE.CylinderGeometry(1.1, 1.55, 1.9, 7), color: 0xa89278, position: [-0.55, 1.05, 0.35] },
      { geometry: new THREE.IcosahedronGeometry(1.0, 1), color: 0x45a352, position: [-0.25, 2.0, 0.15], scale: [1.3, 0.45, 1.1] }
    ]),
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, flatShading: true }),
    layout.cliffs.length
  );
  cliffInst.castShadow = true;
  cliffInst.receiveShadow = true;
  populateMatrixColorInstancedMesh(cliffInst, layout.cliffs, null);
  group.add(cliffInst);

  // 9. Road Shoulder Solar Lampposts (1 InstancedMesh)
  if (layout.lampposts.length > 0) {
    const lampGeom = mergeColoredParts([
      { geometry: new THREE.CylinderGeometry(0.14, 0.24, 0.65, 8), color: 0x334155, position: [0, 0.15, 0] },
      { geometry: new THREE.CylinderGeometry(0.08, 0.11, 3.3, 8), color: 0xe2e8f0, position: [0, 1.95, 0] },
      { geometry: new THREE.BoxGeometry(0.75, 0.16, 0.24), color: 0x0f172a, position: [0.25, 3.6, 0] },
      { geometry: new THREE.BoxGeometry(0.45, 0.12, 0.28), color: 0xfef08a, position: [0.46, 3.52, 0] }
    ]);
    const lampInst = new THREE.InstancedMesh(
      lampGeom,
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.38, metalness: 0.35 }),
      layout.lampposts.length
    );
    populateMatrixColorInstancedMesh(lampInst, layout.lampposts, null);
    group.add(lampInst);
  }

  // Hot-swap foliage & cliff instanced geometries to sculpted Blender 5.3 GLBs once cached/fetched
  void loadCachedGlbClone('/models/earth_tree_round.glb').then((glb) => {
    if (!glb) return;
    if (isDisposed()) {
      disposeObject3D(glb);
      return;
    }
    const trunkGeom = extractGlbMeshGeometry(glb, 'TreeTrunk');
    const canopyGeom = extractGlbMeshGeometry(glb, 'TreeCanopy');
    if (trunkGeom) {
      treeTrunksInst.geometry.dispose();
      treeTrunksInst.geometry = trunkGeom;
    }
    if (canopyGeom) {
      treeCanopiesInst.geometry.dispose();
      treeCanopiesInst.geometry = canopyGeom;
    }
    disposeObject3D(glb);
  });

  void loadCachedGlbClone('/models/earth_bush_flower.glb').then((glb) => {
    if (!glb) return;
    if (isDisposed()) {
      disposeObject3D(glb);
      return;
    }
    const bodyGeom = extractGlbMeshGeometry(glb, 'BushBody');
    const flowerGeom = extractGlbMeshGeometry(glb, 'BushBlossoms');
    if (bodyGeom) {
      bushBodyInst.geometry.dispose();
      bushBodyInst.geometry = bodyGeom;
    }
    if (flowerGeom) {
      bushFlowerInst.geometry.dispose();
      bushFlowerInst.geometry = flowerGeom;
    }
    disposeObject3D(glb);
  });

  void loadCachedGlbClone('/models/earth_cliff_layered.glb').then((glb) => {
    if (!glb) return;
    if (isDisposed()) {
      disposeObject3D(glb);
      return;
    }
    const cliffGeom = extractGlbMeshGeometry(glb, 'CliffRock');
    if (cliffGeom) {
      cliffInst.geometry.dispose();
      cliffInst.geometry = cliffGeom;
    }
    disposeObject3D(glb);
  });

  const update = (elapsed: number, cameraPos?: THREE.Vector3) => {
    grassUniforms.uTime.value = elapsed;
    if (cameraPos) {
      grassUniforms.uCameraPos.value.copy(cameraPos);
    }
    cloudsMesh.rotation.y = elapsed * 0.008;
  };

  const dispose = () => {
    disposableTextures.forEach((tex) => tex.dispose());
    group.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.InstancedMesh) {
        obj.geometry?.dispose();
        const m = obj.material;
        if (Array.isArray(m)) m.forEach((x) => x.dispose());
        else m?.dispose();
      }
    });
    if (group.parent) group.parent.remove(group);
  };

  return { group, layout, update, dispose };
}
