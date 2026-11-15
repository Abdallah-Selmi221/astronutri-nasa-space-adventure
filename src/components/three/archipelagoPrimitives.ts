import * as THREE from 'three';
import { SpatialRoomNode } from '../../data/campaignLevels';
import { mergeColoredParts, ColoredGeometryPart } from './threeMergeUtils';

export interface CosmicSkyHandle {
  update: (t: number) => void;
  dispose: () => void;
}

export type IslandSurfaceMode = 'grass' | 'lunar' | 'orbit' | 'ocean';
export type SkyMode = 'sunny' | 'nebula' | 'lunar' | 'tropical';

function createRadialNebulaTexture(innerColor: string, midColor: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(128, 128, 12, 128, 128, 128);
    grad.addColorStop(0, innerColor);
    grad.addColorStop(0.45, midColor);
    grad.addColorStop(1, 'rgba(15, 23, 42, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Generates crisp procedural PBR plateau textures:
 * - 'grass': vibrant emerald meadow, warm sandy courtyard path, painterly clover blades
 * - 'lunar': sunlit basalt crater regolith with golden pad markings
 * - 'orbit': high-tech orbital hull plating with cyan docking trim
 * - 'ocean': turquoise tropical lagoon + sandy splashdown shore ring
 */
export function createIslandSurfaceTexture(
  mode: IslandSurfaceMode,
  topHex: number,
  rimHex: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const baseCol = `#${new THREE.Color(topHex).getHexString()}`;
  const rimCol = `#${new THREE.Color(rimHex).getHexString()}`;

  if (ctx) {
    ctx.fillStyle = baseCol;
    ctx.fillRect(0, 0, 512, 512);

    if (mode === 'grass') {
      // Sunlit vibrant meadow patches
      for (let i = 0; i < 650; i++) {
        const x = (i * 109) % 512;
        const y = (i * 193) % 512;
        ctx.fillStyle =
          i % 4 === 0
            ? 'rgba(134, 239, 172, 0.34)'
            : i % 3 === 0
            ? 'rgba(163, 230, 53, 0.25)'
            : 'rgba(21, 128, 61, 0.34)';
        ctx.fillRect(x, y, 4, 9);
      }
      // Warm sandy dirt plaza in center & radial garden border
      const dirtGrad = ctx.createRadialGradient(256, 256, 10, 256, 256, 118);
      dirtGrad.addColorStop(0, '#eab676');
      dirtGrad.addColorStop(0.62, '#d49a58');
      dirtGrad.addColorStop(1, 'rgba(212, 154, 88, 0)');
      ctx.fillStyle = dirtGrad;
      ctx.beginPath();
      ctx.arc(256, 256, 118, 0, Math.PI * 2);
      ctx.fill();

      // Pebble flagstones & radiating garden walking paths toward courtyard rings
      ctx.strokeStyle = 'rgba(217, 155, 82, 0.72)';
      ctx.lineWidth = 18;
      ctx.lineCap = 'round';
      for (let p = 0; p < 6; p++) {
        const ang = (p / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(256, 256);
        ctx.lineTo(256 + Math.cos(ang) * 185, 256 + Math.sin(ang) * 185);
        ctx.stroke();
      }

      ctx.strokeStyle = 'rgba(254, 243, 199, 0.48)';
      ctx.lineWidth = 6;
      ctx.setLineDash([16, 10]);
      ctx.beginPath();
      ctx.arc(256, 256, 122, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Tiny meadow daisies & clover highlights
      for (let d = 0; d < 75; d++) {
        const dx = (d * 149 + 31) % 512;
        const dy = (d * 227 + 19) % 512;
        ctx.fillStyle = d % 2 === 0 ? 'rgba(254, 249, 195, 0.55)' : 'rgba(244, 114, 182, 0.45)';
        ctx.beginPath();
        ctx.arc(dx, dy, 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (mode === 'lunar') {
      for (let i = 0; i < 520; i++) {
        const x = (i * 89) % 512;
        const y = (i * 173) % 512;
        ctx.fillStyle = i % 2 === 0 ? 'rgba(241, 245, 249, 0.22)' : 'rgba(15, 23, 42, 0.26)';
        ctx.fillRect(x, y, 5, 5);
      }
      for (let c = 0; c < 8; c++) {
        const cx = 64 + ((c * 97) % 380);
        const cy = 64 + ((c * 131) % 380);
        ctx.strokeStyle = 'rgba(248, 250, 252, 0.26)';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(cx, cy, 20 + (c % 3) * 10, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else if (mode === 'ocean') {
      // Warm golden sandy recovery shore + bright lagoon rings
      const lagoonGrad = ctx.createRadialGradient(256, 256, 30, 256, 256, 246);
      lagoonGrad.addColorStop(0, '#fef08a');
      lagoonGrad.addColorStop(0.45, '#fde047');
      lagoonGrad.addColorStop(0.68, '#38bdf8');
      lagoonGrad.addColorStop(1, '#0284c7');
      ctx.fillStyle = lagoonGrad;
      ctx.fillRect(0, 0, 512, 512);

      for (let i = 0; i < 320; i++) {
        const x = (i * 83) % 512;
        const y = (i * 157) % 512;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y, 14 + (i % 10), 0.2, 2.2);
        ctx.stroke();
      }
    } else {
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.26)';
      ctx.lineWidth = 3;
      for (let x = 0; x <= 512; x += 64) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 512);
        ctx.stroke();
      }
      for (let y = 0; y <= 512; y += 64) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(512, y);
        ctx.stroke();
      }
      for (let i = 0; i < 24; i++) {
        ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
        ctx.fillRect(((i % 6) * 64) + 12, (Math.floor(i / 6) * 64) + 12, 16, 6);
      }
    }

    ctx.strokeStyle = rimCol;
    ctx.globalAlpha = 0.62;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(256, 256, 134, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Adds a bright, vibrant sky dome tailored to the biome ('sunny' daylight Azure sky,
 * 'nebula' Zero-G cosmos, 'lunar' horizon + Earth crescent, or 'tropical' golden hour)
 * with low-poly clouds, combined starfield, and an orbiting telemetry satellite (3-4 draw calls).
 */
export function createCosmicSkyBackdrop(scene: THREE.Scene, skyMode: SkyMode = 'nebula'): CosmicSkyHandle {
  const isDaylight = skyMode === 'sunny' || skyMode === 'tropical';
  if (skyMode === 'sunny') {
    scene.background = new THREE.Color(0x0f3275);
    scene.fog = new THREE.FogExp2(0x164494, 0.0034);
  } else if (skyMode === 'tropical') {
    scene.background = new THREE.Color(0x09517f);
    scene.fog = new THREE.FogExp2(0x0e6a9e, 0.0036);
  } else if (skyMode === 'lunar') {
    scene.background = new THREE.Color(0x071230);
    scene.fog = new THREE.FogExp2(0x0b1c47, 0.005);
  } else {
    scene.background = new THREE.Color(0x0a1438);
    scene.fog = new THREE.FogExp2(0x111f54, 0.0055);
  }

  const disposableTextures: THREE.Texture[] = [];
  const disposableObjects: THREE.Object3D[] = [];

  // 1. Dual-Layer Twinkling Cosmic Starfield (primary canopy + vibrant twinkle sparkles -> 2 draw calls)
  const starCount = isDaylight ? 420 : 720;
  const starGeo = new THREE.BufferGeometry();
  const starPos = new Float32Array(starCount * 3);
  const starCols = new Float32Array(starCount * 3);
  const palette = isDaylight
    ? [new THREE.Color(0xffffff), new THREE.Color(0xfef9c3), new THREE.Color(0x7dd3fc), new THREE.Color(0xc4b5fd)]
    : [new THREE.Color(0xe0f2fe), new THREE.Color(0xfef08a), new THREE.Color(0x7dd3fc), new THREE.Color(0xf9a8d4)];

  for (let i = 0; i < starCount; i++) {
    const r = 34 + Math.random() * 58;
    const theta = Math.random() * Math.PI * 2;
    starPos[i * 3] = Math.cos(theta) * r;
    starPos[i * 3 + 1] = isDaylight ? 6 + Math.random() * 34 : 2 + (Math.random() - 0.35) * 46;
    starPos[i * 3 + 2] = Math.sin(theta) * r;
    const c = palette[i % palette.length];
    starCols[i * 3] = c.r;
    starCols[i * 3 + 1] = c.g;
    starCols[i * 3 + 2] = c.b;
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  starGeo.setAttribute('color', new THREE.BufferAttribute(starCols, 3));
  const starPoints = new THREE.Points(
    starGeo,
    new THREE.PointsMaterial({ size: isDaylight ? 0.3 : 0.34, vertexColors: true, transparent: true, opacity: 0.88 })
  );
  scene.add(starPoints);
  disposableObjects.push(starPoints);

  // Secondary shimmering star & cosmic dust cluster
  const twinkleCount = 160;
  const twinkleGeo = new THREE.BufferGeometry();
  const twinklePos = new Float32Array(twinkleCount * 3);
  const twinkleCols = new Float32Array(twinkleCount * 3);
  const nebPalette = [new THREE.Color(0x38bdf8), new THREE.Color(0xe879f9), new THREE.Color(0xfde047)];
  for (let i = 0; i < twinkleCount; i++) {
    const r = 38 + Math.random() * 48;
    const theta = (i / twinkleCount) * Math.PI * 2 + (i % 5) * 0.13;
    twinklePos[i * 3] = Math.cos(theta) * r;
    twinklePos[i * 3 + 1] = 8 + ((i * 19) % 30);
    twinklePos[i * 3 + 2] = Math.sin(theta) * r;
    const c = nebPalette[i % nebPalette.length];
    twinkleCols[i * 3] = c.r;
    twinkleCols[i * 3 + 1] = c.g;
    twinkleCols[i * 3 + 2] = c.b;
  }
  twinkleGeo.setAttribute('position', new THREE.BufferAttribute(twinklePos, 3));
  twinkleGeo.setAttribute('color', new THREE.BufferAttribute(twinkleCols, 3));
  const twinkleMat = new THREE.PointsMaterial({ size: 0.56, vertexColors: true, transparent: true, opacity: 0.72 });
  const twinklePoints = new THREE.Points(twinkleGeo, twinkleMat);
  scene.add(twinklePoints);
  disposableObjects.push(twinklePoints);

  // 2. Sculpted Low-Poly Clouds OR Luminous Nebula Billboards (1-2 draw calls)
  let cloudMesh: THREE.Mesh | null = null;
  let neb1: THREE.Sprite | null = null;
  let neb2: THREE.Sprite | null = null;

  if (isDaylight) {
    const cloudParts: ColoredGeometryPart[] = [];
    const cloudSpots: [number, number, number, number][] = [
      [-28, 12, -26, 1.3],
      [26, 14, -30, 1.45],
      [0, 17, -42, 1.6],
      [-34, 10, 18, 1.15],
      [32, 11, 20, 1.2]
    ];
    cloudSpots.forEach(([cx, cy, cz, sc]) => {
      cloudParts.push(
        { geometry: new THREE.DodecahedronGeometry(2.1 * sc, 1), color: 0xffffff, position: [cx, cy, cz], scale: [1.5, 0.72, 1.0] },
        { geometry: new THREE.DodecahedronGeometry(1.6 * sc, 1), color: 0xf0f9ff, position: [cx - 2.1 * sc, cy - 0.25 * sc, cz], scale: [1.1, 0.75, 0.9] },
        { geometry: new THREE.DodecahedronGeometry(1.5 * sc, 1), color: 0xe0f2fe, position: [cx + 2.2 * sc, cy - 0.3 * sc, cz], scale: [1.15, 0.7, 0.9] }
      );
    });
    cloudMesh = new THREE.Mesh(
      mergeColoredParts(cloudParts),
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0.02, flatShading: true })
    );
    scene.add(cloudMesh);
    disposableObjects.push(cloudMesh);
  } else {
    const nebTex1 = createRadialNebulaTexture('rgba(56, 189, 248, 0.48)', 'rgba(99, 102, 241, 0.16)');
    const nebTex2 = createRadialNebulaTexture(
      skyMode === 'lunar' ? 'rgba(59, 130, 246, 0.55)' : 'rgba(168, 85, 247, 0.45)',
      'rgba(236, 72, 153, 0.14)'
    );
    disposableTextures.push(nebTex1, nebTex2);
    const makeNebula = (tex: THREE.CanvasTexture, x: number, y: number, z: number, scale: number) => {
      const sp = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
      );
      sp.position.set(x, y, z);
      sp.scale.set(scale, scale * 0.74, 1);
      scene.add(sp);
      disposableObjects.push(sp);
      return sp;
    };
    neb1 = makeNebula(nebTex1, -26, 12, -38, 38);
    neb2 = makeNebula(nebTex2, 28, 14, -40, 40);
  }

  // Lunar Horizon Crescent Earth OR Sun Glow Disc (1 draw call on lunar/sunny!)
  let celestialAccent: THREE.Mesh | null = null;
  if (skyMode === 'lunar') {
    const earthParts: ColoredGeometryPart[] = [
      { geometry: new THREE.SphereGeometry(4.2, 20, 16), color: 0x0284c7, position: [22, 16, -42] },
      { geometry: new THREE.DodecahedronGeometry(1.7, 1), color: 0x22c55e, position: [20.6, 16.8, -38.6], scale: [1.3, 0.9, 0.4] },
      { geometry: new THREE.DodecahedronGeometry(1.4, 1), color: 0x4ade80, position: [23.4, 15.2, -38.8], scale: [1.1, 1.0, 0.4] }
    ];
    celestialAccent = new THREE.Mesh(
      mergeColoredParts(earthParts),
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, emissive: 0x0369a1, emissiveIntensity: 0.25 })
    );
    scene.add(celestialAccent);
    disposableObjects.push(celestialAccent);
  }

  // Orbiting Stylized NASA Satellite (1 draw call)
  const satGeom = mergeColoredParts([
    { geometry: new THREE.OctahedronGeometry(0.45, 0), color: 0xf59e0b },
    { geometry: new THREE.BoxGeometry(1.5, 0.05, 0.55), color: 0x0284c7, position: [-1.15, 0, 0] },
    { geometry: new THREE.BoxGeometry(1.5, 0.05, 0.55), color: 0x0284c7, position: [1.15, 0, 0] },
    { geometry: new THREE.ConeGeometry(0.32, 0.24, 14), color: 0xe2e8f0, position: [0, -0.45, 0] }
  ]);
  const satMesh = new THREE.Mesh(
    satGeom,
    new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.5, roughness: 0.3 })
  );
  scene.add(satMesh);
  disposableObjects.push(satMesh);

  const update = (t: number) => {
    starPoints.rotation.y = t * 0.006;
    twinklePoints.rotation.y = -t * 0.009;
    twinkleMat.opacity = 0.58 + 0.32 * Math.sin(t * 2.4);
    if (cloudMesh) {
      cloudMesh.rotation.y = t * 0.015;
    }
    if (neb1) neb1.position.y = 12 + Math.sin(t * 0.3) * 1.1;
    if (neb2) neb2.position.y = 14 + Math.cos(t * 0.25) * 1.3;
    satMesh.position.set(Math.cos(t * 0.22) * 26, 12.5 + Math.sin(t * 0.5) * 1.6, Math.sin(t * 0.22) * 22);
    satMesh.rotation.y = -t * 0.22 + Math.PI / 2;
  };

  const dispose = () => {
    disposableTextures.forEach((tex) => tex.dispose());
    disposableObjects.forEach((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Points) {
        obj.geometry?.dispose();
        const m = obj.material;
        if (Array.isArray(m)) m.forEach((x) => x.dispose());
        else m?.dispose();
      } else if (obj instanceof THREE.Sprite) {
        obj.material.dispose();
      }
    });
  };

  return { update, dispose };
}

/**
 * Sculpted Low-Poly Aerodynamic Spacecraft Parts (replaces plain cone+cylinder stacks).
 */
export function createSleekSpacecraftParts(
  ox = 0,
  oy = 0,
  oz = 0,
  s = 1
): ColoredGeometryPart[] {
  return [
    // Stepped Octagonal Launch Pad
    { geometry: new THREE.CylinderGeometry(1.55 * s, 1.85 * s, 0.22 * s, 8), color: 0x334155, position: [ox, oy + 0.11 * s, oz] },
    { geometry: new THREE.TorusGeometry(1.42 * s, 0.07 * s, 8, 24), color: 0xf59e0b, position: [ox, oy + 0.23 * s, oz], rotation: [Math.PI / 2, 0, 0] },
    // Aerodynamic White Fuselage + Mid Thermal Band
    { geometry: new THREE.CylinderGeometry(0.36 * s, 0.54 * s, 1.85 * s, 12), color: 0xf8fafc, position: [ox, oy + 1.25 * s, oz] },
    { geometry: new THREE.CylinderGeometry(0.45 * s, 0.49 * s, 0.26 * s, 12), color: 0x0f172a, position: [ox, oy + 0.95 * s, oz] },
    // Vibrant Coral-Orange Nose Cone
    { geometry: new THREE.ConeGeometry(0.36 * s, 0.95 * s, 12), color: 0xf97316, position: [ox, oy + 2.65 * s, oz] },
    // Glossy Cyan Cockpit Canopy
    { geometry: new THREE.SphereGeometry(0.2 * s, 10, 8), color: 0x38bdf8, position: [ox, oy + 1.85 * s, oz + 0.34 * s], scale: [1.0, 1.35, 0.6] },
    // Three Swept Delta Aero Fins + Exhaust Bells
    ...[0, (Math.PI * 2) / 3, (Math.PI * 4) / 3].flatMap((ang) => [
      {
        geometry: new THREE.BoxGeometry(0.1 * s, 0.72 * s, 0.48 * s),
        color: 0xea580c,
        position: [ox + Math.sin(ang) * 0.56 * s, oy + 0.62 * s, oz + Math.cos(ang) * 0.56 * s] as [number, number, number],
        rotation: [0, ang, 0] as [number, number, number]
      },
      {
        geometry: new THREE.ConeGeometry(0.16 * s, 0.28 * s, 8),
        color: 0xfbbf24,
        position: [ox + Math.sin(ang) * 0.22 * s, oy + 0.24 * s, oz + Math.cos(ang) * 0.22 * s] as [number, number, number]
      }
    ])
  ];
}

function inferSurfaceMode(opts: {
  topColor: number;
  accentCraters?: boolean;
  surfaceMode?: IslandSurfaceMode;
}): IslandSurfaceMode {
  if (opts.surfaceMode) return opts.surfaceMode;
  if (opts.accentCraters) return 'lunar';
  if (opts.topColor === 0x065f46 || opts.topColor === 0x15803d || opts.topColor === 0x22c55e) return 'grass';
  if (opts.topColor === 0x0369a1 || opts.topColor === 0x0284c7 || opts.topColor === 0x0ea5e9) return 'ocean';
  return 'orbit';
}

/**
 * Builds a handcrafted multi-tiered Low-Poly Floating Island (Super Bear Adventure style):
 * emerald grass / biome top + overhanging cliff rim + tiered warm brown/terracotta rocks +
 * floating pebbles + glowing cyan/pink crystals + Instanced foliage/flowers/mushrooms! (only 3-4 draw calls!)
 */
export function createFloatingIslandMesh(opts: {
  radius: number;
  depth?: number;
  topColor: number;
  rimColor: number;
  rockColor: number;
  crystalColor: number;
  accentCraters?: boolean;
  surfaceMode?: IslandSurfaceMode;
}): THREE.Group {
  const island = new THREE.Group();
  const depth = opts.depth ?? 5.4;
  const mode = inferSurfaceMode(opts);
  const surfaceTex = createIslandSurfaceTexture(mode, opts.topColor, opts.rimColor);
  island.userData.disposableTextures = [surfaceTex];

  // 1. Vibrant Textured Top Plateau (1 draw call)
  const plateau = new THREE.Mesh(
    new THREE.CylinderGeometry(opts.radius, opts.radius * 0.96, 0.68, 28),
    new THREE.MeshStandardMaterial({ map: surfaceTex, roughness: 0.72, metalness: 0.1, flatShading: true })
  );
  plateau.position.y = -0.34;
  island.add(plateau);

  // 2. Sculpted Multi-Tiered Cliff Belly + Glowing Cyan/Pink Crystals + Floating Rock Pebbles (1 draw call!)
  const upperCliffCol = mode === 'grass' ? 0xc26528 : mode === 'ocean' ? 0xe0b26b : opts.rockColor;
  const midCliffCol = mode === 'grass' ? 0x9a4618 : mode === 'ocean' ? 0x0f766e : opts.rockColor;
  const deepCliffCol = mode === 'grass' ? 0x6b2f10 : 0x1e293b;

  const underParts: ColoredGeometryPart[] = [
    // Overhanging grass/biome turf lip
    {
      geometry: new THREE.TorusGeometry(opts.radius * 0.985, 0.2, 8, 36),
      color: mode === 'grass' ? 0x22c55e : opts.rimColor,
      position: [0, -0.05, 0],
      rotation: [Math.PI / 2, 0, 0]
    },
    // Tier 1 Terracotta / Cliff Stratum
    {
      geometry: new THREE.CylinderGeometry(opts.radius * 0.94, opts.radius * 0.74, depth * 0.34, 14),
      color: upperCliffCol,
      position: [0, -0.68 - depth * 0.17, 0]
    },
    // Tier 2 Mid Cliff Facets
    {
      geometry: new THREE.CylinderGeometry(opts.radius * 0.71, opts.radius * 0.42, depth * 0.34, 11),
      color: midCliffCol,
      position: [0, -0.68 - depth * 0.5, 0]
    },
    // Tier 3 Tapered Rock Point
    {
      geometry: new THREE.ConeGeometry(opts.radius * 0.41, depth * 0.42, 9),
      color: deepCliffCol,
      position: [0, -0.68 - depth * 0.86, 0],
      rotation: [Math.PI, 0, 0]
    }
  ];

  // Glowing Cyan & Pink Crystals + Floating Rock Pebbles beneath island rim
  const crystalRad = Math.min(1.35, opts.radius * 0.085);
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2 + 0.35;
    const dist = opts.radius * (0.64 + (i % 2) * 0.14);
    const crystalCol = i % 2 === 0 ? opts.crystalColor : 0xf472b6;
    underParts.push({
      geometry: new THREE.OctahedronGeometry(crystalRad, 0),
      color: crystalCol,
      position: [
        Math.cos(angle) * dist,
        -1.15 - crystalRad * 1.4 - (i % 2) * 0.65,
        Math.sin(angle) * dist
      ],
      rotation: [0, angle, ((i % 2 === 0 ? 1 : -1) * 0.25)],
      scale: [0.62, 1.75, 0.62]
    });

    // Floating Low-Poly Rock Pebbles hovering around cliff perimeter!
    const pebbleAngle = angle + 0.22;
    const pebbleDist = opts.radius * 1.04 + (i % 3) * 0.45;
    underParts.push({
      geometry: new THREE.DodecahedronGeometry(Math.min(0.65, opts.radius * 0.045), 0),
      color: i % 2 === 0 ? upperCliffCol : midCliffCol,
      position: [Math.cos(pebbleAngle) * pebbleDist, -1.3 - (i % 3) * 0.7, Math.sin(pebbleAngle) * pebbleDist]
    });
  }

  if (opts.accentCraters) {
    for (let c = 0; c < 4; c++) {
      const ang = (c / 4) * Math.PI * 2 + 0.6;
      underParts.push({
        geometry: new THREE.TorusGeometry(opts.radius * 0.12, 0.16, 8, 14),
        color: 0x64748b,
        position: [Math.cos(ang) * opts.radius * 0.56, 0.04, Math.sin(ang) * opts.radius * 0.56],
        rotation: [Math.PI / 2, 0, 0]
      });
    }
  }

  const underMesh = new THREE.Mesh(
    mergeColoredParts(underParts),
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.72, metalness: 0.12, flatShading: true })
  );
  island.add(underMesh);

  // 3. Instanced Grass Tufts / Flowers / Toadstools / Rocks (1 InstancedMesh draw call!)
  const detailCount = Math.min(48, Math.max(20, Math.round(opts.radius * 2.1)));
  const detailGeom =
    mode === 'grass' || mode === 'ocean'
      ? new THREE.ConeGeometry(0.14, 0.42, 5)
      : new THREE.DodecahedronGeometry(0.24, 0);
  const detailMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: mode === 'orbit' ? 0.35 : 0.75,
    flatShading: true
  });
  const detailInst = new THREE.InstancedMesh(detailGeom, detailMat, detailCount);
  const dummy = new THREE.Object3D();

  const detailColors =
    mode === 'grass'
      ? [
          new THREE.Color(0x22c55e),
          new THREE.Color(0x4ade80),
          new THREE.Color(0xfacc15),
          new THREE.Color(0xf472b6),
          new THREE.Color(0xef4444)
        ]
      : mode === 'ocean'
      ? [new THREE.Color(0x4ade80), new THREE.Color(0xf472b6), new THREE.Color(0xfbbf24)]
      : mode === 'lunar'
      ? [new THREE.Color(0x94a3b8), new THREE.Color(0x64748b), new THREE.Color(0xfbbf24)]
      : [new THREE.Color(0x38bdf8), new THREE.Color(0x818cf8), new THREE.Color(0x94a3b8)];

  for (let i = 0; i < detailCount; i++) {
    const theta = (i / detailCount) * Math.PI * 2 + (i % 3) * 0.14;
    const radRatio = 0.76 + ((i * 37) % 18) / 100;
    const d = opts.radius * radRatio;
    const px = Math.cos(theta) * d;
    const pz = Math.sin(theta) * d;
    const s = 0.75 + ((i * 19) % 55) / 100;
    const isMushroomOrFlower = (mode === 'grass' || mode === 'ocean') && i % 3 !== 0;
    dummy.position.set(px, mode === 'lunar' ? 0.1 : 0.2 * s, pz);
    dummy.rotation.set(0, theta * 1.7, isMushroomOrFlower ? 0 : (i % 2 === 0 ? 1 : -1) * 0.12);
    dummy.scale.set(
      isMushroomOrFlower ? s * 1.35 : s,
      isMushroomOrFlower ? s * 0.9 : s * 1.25,
      isMushroomOrFlower ? s * 1.35 : s
    );
    dummy.updateMatrix();
    detailInst.setMatrixAt(i, dummy.matrix);
    detailInst.setColorAt(i, detailColors[i % detailColors.length]);
  }
  detailInst.instanceMatrix.needsUpdate = true;
  if (detailInst.instanceColor) detailInst.instanceColor.needsUpdate = true;
  island.add(detailInst);

  return island;
}

export function createFloatingLabelSprite(
  titleAr: string,
  icon: string,
  accentHex: string,
  completed: boolean
): { sprite: THREE.Sprite; texture: THREE.CanvasTexture } {
  const canvas = document.createElement('canvas');
  canvas.width = 384;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 384, 96);
    ctx.fillStyle = completed ? 'rgba(6, 78, 59, 0.94)' : 'rgba(15, 23, 42, 0.92)';
    ctx.beginPath();
    ctx.roundRect(8, 12, 368, 72, 24);
    ctx.fill();

    ctx.lineWidth = 4;
    ctx.strokeStyle = completed ? '#34d399' : accentHex;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 23px sans-serif';
    ctx.direction = 'rtl';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const text = `${icon} ${titleAr}${completed ? ' ✓' : ''}`;
    ctx.fillText(text.slice(0, 34), 192, 48);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(4.1, 1.02, 1);
  return { sprite, texture };
}

/**
 * Combines all room signboards into a SINGLE batched Atlas Mesh (1 draw call for up to 16 signs!)
 * with back-to-back quads so Arabic labels read correctly from any viewing angle without mirroring.
 */
export function createCourtyardSignboardsMesh(
  items: {
    pos: THREE.Vector3;
    yawToCenter: number;
    titleAr: string;
    icon: string;
    accentHex: string;
    completed: boolean;
  }[]
): { mesh: THREE.Mesh; texture: THREE.CanvasTexture } {
  const count = Math.max(1, items.length);
  const slotW = 384;
  const slotH = 96;
  const canvas = document.createElement('canvas');
  canvas.width = slotW;
  canvas.height = slotH * count;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    items.forEach((item, i) => {
      const y0 = i * slotH;
      ctx.fillStyle = item.completed ? 'rgba(6, 78, 59, 0.94)' : 'rgba(15, 23, 42, 0.92)';
      ctx.beginPath();
      ctx.roundRect(10, y0 + 12, slotW - 20, slotH - 24, 22);
      ctx.fill();

      ctx.lineWidth = 4;
      ctx.strokeStyle = item.completed ? '#34d399' : item.accentHex;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 23px sans-serif';
      ctx.direction = 'rtl';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const label = `${item.icon} ${item.titleAr}${item.completed ? ' ✓' : ''}`;
      ctx.fillText(label.slice(0, 32), slotW / 2, y0 + slotH / 2);
    });
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;

  const positions: number[] = [];
  const uvs: number[] = [];
  const w = 3.55;
  const h = 0.88;
  const hw = w / 2;
  const hh = h / 2;

  items.forEach((item, idx) => {
    const vTop = 1 - idx / count;
    const vBot = 1 - (idx + 1) / count;
    const cosY = Math.cos(item.yawToCenter);
    const sinY = Math.sin(item.yawToCenter);
    const toWorld = (lx: number, ly: number, lz: number): [number, number, number] => [
      item.pos.x + lx * cosY + lz * sinY,
      item.pos.y + 3.45 + ly,
      item.pos.z - lx * sinY + lz * cosY
    ];

    const pushQuad = (zOff: number, flip: boolean) => {
      const pBL = toWorld(flip ? hw : -hw, -hh, zOff);
      const pBR = toWorld(flip ? -hw : hw, -hh, zOff);
      const pTR = toWorld(flip ? -hw : hw, hh, zOff);
      const pTL = toWorld(flip ? hw : -hw, hh, zOff);
      positions.push(...pBL, ...pBR, ...pTR, ...pBL, ...pTR, ...pTL);
      uvs.push(0, vBot, 1, vBot, 1, vTop, 0, vBot, 1, vTop, 0, vTop);
    };

    pushQuad(0.02, false);
    pushQuad(-0.02, true);
  });

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geom.computeVertexNormals();

  const mesh = new THREE.Mesh(
    geom,
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.FrontSide })
  );
  return { mesh, texture };
}

/**
 * Merged geometry for the bouncing golden `!` Quest Exclamation Marker.
 */
export function createFloatingExclamationGeometry(): THREE.BufferGeometry {
  return mergeColoredParts([
    { geometry: new THREE.ConeGeometry(0.14, 0.56, 8), color: 0xfacc15, position: [0, 0.34, 0], rotation: [Math.PI, 0, 0] },
    { geometry: new THREE.OctahedronGeometry(0.12, 0), color: 0xfde047, position: [0, -0.08, 0] }
  ]);
}

/**
 * Builds colorful Low-Poly themed Station Booths & Landmarks
 * (`Food Kiosk`, `Suit & Fitness Tent`, `Medical Tent`, `Bio-Cabin Greenhouse`,
 * `NASA Data Observatory`, `Sleek Spacecraft Launch Pad`, `ECLSS Water & Solar Tower`)
 * merged into 1 single draw call per booth!
 */
export function createStationBuildingMesh(
  room: SpatialRoomNode,
  completed: boolean,
  options?: { skipPortals?: boolean; skipLabelSprite?: boolean; skipRocketCraft?: boolean }
): {
  group: THREE.Group;
  portalRing: THREE.Mesh;
  curtain: THREE.Mesh;
  disposeTextures: THREE.Texture[];
} {
  const group = new THREE.Group();
  const accentHex = completed ? '#10b981' : room.accentHex;
  const accent = new THREE.Color(accentHex);

  const parts: ColoredGeometryPart[] = [
    {
      geometry: new THREE.CylinderGeometry(1.95, 2.2, 0.24, 8),
      color: completed ? 0x065f46 : 0x334155,
      position: [0, 0.12, 0]
    },
    {
      geometry: new THREE.TorusGeometry(2.05, 0.08, 8, 28),
      color: accentHex,
      position: [0, 0.05, 0],
      rotation: [Math.PI / 2, 0, 0]
    }
  ];

  const rid = room.id.toLowerCase();
  if (rid.includes('food') || rid.includes('nutrition')) {
    // Stylized Food Kiosk with Warm Timber Counter & Striped Coral-Cream Awning
    parts.push(
      { geometry: new THREE.BoxGeometry(2.1, 0.72, 1.05), color: 0xb45309, position: [0, 0.56, -0.45] },
      { geometry: new THREE.BoxGeometry(2.26, 0.12, 1.22), color: 0xfef3c7, position: [0, 0.96, -0.42] },
      { geometry: new THREE.CylinderGeometry(0.08, 0.08, 1.55, 8), color: 0x78350f, position: [-0.95, 1.45, -0.42] },
      { geometry: new THREE.CylinderGeometry(0.08, 0.08, 1.55, 8), color: 0x78350f, position: [0.95, 1.45, -0.42] },
      { geometry: new THREE.ConeGeometry(1.68, 0.78, 4), color: 0xf97316, position: [0, 2.48, -0.42], rotation: [0, Math.PI / 4, 0] },
      { geometry: new THREE.SphereGeometry(0.32, 10, 10), color: 0x22c55e, position: [0, 1.28, -0.4] }
    );
  } else if (rid.includes('launch') || rid.includes('reentry') || rid.includes('spaceship') || rid.includes('central')) {
    // Sleek Aerodynamic Low-Poly Spacecraft on Launch Pad (or clear pad when Blender GLB loads)
    if (!options?.skipRocketCraft) {
      parts.push(...createSleekSpacecraftParts(0, 0.15, -0.42, 0.92));
    }
  } else if (rid.includes('equipment') || rid.includes('eva') || rid.includes('fitness')) {
    // Suit & Fitness Striped Turquoise/White Tent Pavilion
    parts.push(
      { geometry: new THREE.CylinderGeometry(1.45, 1.65, 0.14, 8), color: 0x92400e, position: [0, 0.28, -0.4] },
      { geometry: new THREE.CylinderGeometry(0.08, 0.08, 1.75, 8), color: 0xe2e8f0, position: [-1.05, 1.12, -0.4] },
      { geometry: new THREE.CylinderGeometry(0.08, 0.08, 1.75, 8), color: 0xe2e8f0, position: [1.05, 1.12, -0.4] },
      { geometry: new THREE.ConeGeometry(1.75, 1.1, 6), color: 0x06b6d4, position: [0, 2.38, -0.4] },
      { geometry: new THREE.BoxGeometry(0.95, 1.15, 0.45), color: 0x1e293b, position: [0, 0.9, -0.55] }
    );
  } else if (rid.includes('medical') || rid.includes('shelter')) {
    // Bright Medical Tent with Red-Cross Roof Emblem
    parts.push(
      { geometry: new THREE.BoxGeometry(2.1, 1.35, 1.4), color: 0xf8fafc, position: [0, 0.88, -0.48] },
      { geometry: new THREE.ConeGeometry(1.72, 0.95, 4), color: 0x10b981, position: [0, 2.0, -0.48], rotation: [0, Math.PI / 4, 0] },
      { geometry: new THREE.BoxGeometry(0.55, 0.18, 0.12), color: 0xef4444, position: [0, 1.15, 0.24] },
      { geometry: new THREE.BoxGeometry(0.18, 0.55, 0.12), color: 0xef4444, position: [0, 1.15, 0.24] }
    );
  } else if (rid.includes('mission_control') || rid.includes('communication') || rid.includes('cockpit')) {
    // NASA Data Observatory Dome with Telescope & Satellite Dish
    parts.push(
      { geometry: new THREE.CylinderGeometry(1.2, 1.32, 0.88, 12), color: 0x1e3a8a, position: [0, 0.68, -0.45] },
      { geometry: new THREE.SphereGeometry(1.18, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.52), color: 0x38bdf8, position: [0, 1.1, -0.45] },
      { geometry: new THREE.CylinderGeometry(0.18, 0.24, 1.25, 10), color: 0xfacc15, position: [0.55, 1.92, -0.1], rotation: [0.65, 0, -0.4] },
      { geometry: new THREE.ConeGeometry(0.5, 0.35, 12), color: 0xe2e8f0, position: [-0.85, 1.95, -0.55], rotation: [0.4, 0, 0.6] }
    );
  } else if (rid.includes('water') || rid.includes('hydration') || rid.includes('solar') || rid.includes('power')) {
    // ECLSS Water Tank & Solar Rig
    parts.push(
      { geometry: new THREE.CylinderGeometry(0.42, 0.42, 1.65, 12), color: 0x0ea5e9, position: [-0.62, 1.05, -0.45] },
      { geometry: new THREE.CylinderGeometry(0.42, 0.42, 1.65, 12), color: 0x38bdf8, position: [0.62, 1.05, -0.45] },
      { geometry: new THREE.BoxGeometry(2.3, 0.1, 1.0), color: 0x0284c7, position: [0, 2.05, -0.55], rotation: [0.42, 0, 0] }
    );
  } else {
    // Hydroponic Bio-Cabin Greenhouse / Exploration Habitat
    parts.push(
      { geometry: new THREE.CylinderGeometry(1.25, 1.35, 0.45, 8), color: 0x92400e, position: [0, 0.44, -0.42] },
      { geometry: new THREE.SphereGeometry(1.2, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.52), color: 0x4ade80, position: [0, 0.65, -0.42] },
      { geometry: new THREE.ConeGeometry(0.55, 0.9, 8), color: 0x16a34a, position: [0, 2.05, -0.42] }
    );
  }

  const archMesh = new THREE.Mesh(
    mergeColoredParts(parts),
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.46, metalness: 0.22, flatShading: true })
  );
  group.add(archMesh);

  const portalRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.72, 0.11, 10, 24, Math.PI * 1.15),
    new THREE.MeshStandardMaterial({
      color: accent,
      emissive: accent,
      emissiveIntensity: 0.72,
      roughness: 0.25
    })
  );
  portalRing.position.set(0, 0.88, 1.15);

  const curtain = new THREE.Mesh(
    new THREE.CircleGeometry(0.65, 20),
    new THREE.MeshBasicMaterial({
      color: accent,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    })
  );
  curtain.position.set(0, 0.9, 1.15);

  if (!options?.skipPortals) {
    group.add(portalRing, curtain);
  }

  const disposeTextures: THREE.Texture[] = [];
  if (!options?.skipLabelSprite) {
    const { sprite, texture } = createFloatingLabelSprite(room.nameAr, room.icon, room.accentHex, completed);
    sprite.position.set(0, 3.15, 0);
    group.add(sprite);
    disposeTextures.push(texture);
  }

  return { group, portalRing, curtain, disposeTextures };
}
