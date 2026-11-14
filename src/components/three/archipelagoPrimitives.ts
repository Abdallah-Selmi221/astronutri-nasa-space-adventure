import * as THREE from 'three';
import { SpatialRoomNode } from '../../data/campaignLevels';
import { mergeColoredParts, ColoredGeometryPart } from './threeMergeUtils';

export interface CosmicSkyHandle {
  update: (t: number) => void;
  dispose: () => void;
}

export type IslandSurfaceMode = 'grass' | 'lunar' | 'orbit' | 'ocean';

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
 * Generates rich, tiled procedural biome textures for island plateaus
 * (meadow grass, lunar regolith craters, orbital hull plating, or lagoon deck).
 */
export function createIslandSurfaceTexture(
  mode: IslandSurfaceMode,
  topHex: number,
  rimHex: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const baseCol = `#${new THREE.Color(topHex).getHexString()}`;
  const rimCol = `#${new THREE.Color(rimHex).getHexString()}`;

  if (ctx) {
    ctx.fillStyle = baseCol;
    ctx.fillRect(0, 0, 256, 256);

    if (mode === 'grass') {
      // Soft meadow patches + grass blades + garden courtyard ring
      for (let i = 0; i < 420; i++) {
        const x = (i * 73) % 256;
        const y = (i * 137) % 256;
        ctx.fillStyle = i % 3 === 0 ? 'rgba(167, 243, 208, 0.28)' : i % 2 === 0 ? 'rgba(21, 128, 61, 0.36)' : 'rgba(132, 204, 22, 0.25)';
        ctx.fillRect(x, y, 3, 6);
      }
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.beginPath();
      ctx.arc(128, 128, 64, 0, Math.PI * 2);
      ctx.fill();
    } else if (mode === 'lunar') {
      // Basalt speckles + subtle crater shading rings
      for (let i = 0; i < 360; i++) {
        const x = (i * 61) % 256;
        const y = (i * 113) % 256;
        ctx.fillStyle = i % 2 === 0 ? 'rgba(226, 232, 240, 0.2)' : 'rgba(15, 23, 42, 0.28)';
        ctx.fillRect(x, y, 4, 4);
      }
      for (let c = 0; c < 6; c++) {
        const cx = 42 + ((c * 67) % 170);
        const cy = 42 + ((c * 97) % 170);
        ctx.strokeStyle = 'rgba(248, 250, 252, 0.22)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(cx, cy, 14 + (c % 3) * 6, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else if (mode === 'ocean') {
      // Lagoon caustic ripples + sunlit coral highlights
      for (let i = 0; i < 240; i++) {
        const x = (i * 53) % 256;
        const y = (i * 107) % 256;
        ctx.strokeStyle = 'rgba(186, 230, 253, 0.28)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, 10 + (i % 8), 0.2, 2.2);
        ctx.stroke();
      }
    } else {
      // Orbital aerospace hull seams (architectural metallic panels, not bare grid)
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.24)';
      ctx.lineWidth = 2;
      for (let x = 0; x <= 256; x += 64) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 256);
        ctx.stroke();
      }
      for (let y = 0; y <= 256; y += 64) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(256, y);
        ctx.stroke();
      }
      for (let i = 0; i < 16; i++) {
        ctx.fillStyle = 'rgba(56, 189, 248, 0.16)';
        ctx.fillRect(((i % 4) * 64) + 8, (Math.floor(i / 4) * 64) + 8, 10, 4);
      }
    }

    // Concentric Courtyard Emblem Ring baked straight into plateau texture (0 extra draw calls)
    ctx.strokeStyle = rimCol;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(128, 128, 66, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Adds vibrant deep-space backdrop with vertex-colored combined starfield,
 * volumetric nebula billboards, and a merged orbiting telemetry satellite.
 */
export function createCosmicSkyBackdrop(scene: THREE.Scene): CosmicSkyHandle {
  scene.background = new THREE.Color(0x07122b);
  scene.fog = new THREE.FogExp2(0x081635, 0.01);

  const disposableTextures: THREE.Texture[] = [];

  // Single merged starfield (720 stars, cool white + cyan + warm gold -> 1 draw call!)
  const starCount = 720;
  const starGeo = new THREE.BufferGeometry();
  const starPos = new Float32Array(starCount * 3);
  const starCols = new Float32Array(starCount * 3);
  const palette = [new THREE.Color(0xe0f2fe), new THREE.Color(0xfef08a), new THREE.Color(0x7dd3fc)];
  for (let i = 0; i < starCount; i++) {
    const r = 28 + Math.random() * 58;
    const theta = Math.random() * Math.PI * 2;
    starPos[i * 3] = Math.cos(theta) * r;
    starPos[i * 3 + 1] = 2 + (Math.random() - 0.35) * 44;
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
    new THREE.PointsMaterial({ size: 0.3, vertexColors: true, transparent: true, opacity: 0.92 })
  );
  scene.add(starPoints);

  // Two lush nebula billboards (2 draw calls)
  const nebTex1 = createRadialNebulaTexture('rgba(56, 189, 248, 0.44)', 'rgba(99, 102, 241, 0.16)');
  const nebTex2 = createRadialNebulaTexture('rgba(168, 85, 247, 0.4)', 'rgba(236, 72, 153, 0.14)');
  disposableTextures.push(nebTex1, nebTex2);

  const makeNebula = (tex: THREE.CanvasTexture, x: number, y: number, z: number, scale: number) => {
    const sp = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      })
    );
    sp.position.set(x, y, z);
    sp.scale.set(scale, scale * 0.72, 1);
    scene.add(sp);
    return sp;
  };

  const neb1 = makeNebula(nebTex1, -26, 12, -38, 38);
  const neb2 = makeNebula(nebTex2, 28, 14, -40, 40);

  // Orbiting Stylized NASA Satellite (Merged into 1 draw call!)
  const satGeom = mergeColoredParts([
    { geometry: new THREE.OctahedronGeometry(0.45, 0), color: 0xf59e0b },
    { geometry: new THREE.BoxGeometry(1.5, 0.05, 0.55), color: 0x0284c7, position: [-1.15, 0, 0] },
    { geometry: new THREE.BoxGeometry(1.5, 0.05, 0.55), color: 0x0284c7, position: [1.15, 0, 0] },
    { geometry: new THREE.ConeGeometry(0.32, 0.24, 14), color: 0xe2e8f0, position: [0, -0.45, 0] }
  ]);
  const satMesh = new THREE.Mesh(
    satGeom,
    new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.55, roughness: 0.3 })
  );
  scene.add(satMesh);

  const update = (t: number) => {
    starPoints.rotation.y = t * 0.008;
    neb1.position.y = 12 + Math.sin(t * 0.3) * 1.1;
    neb2.position.y = 14 + Math.cos(t * 0.25) * 1.3;
    satMesh.position.set(Math.cos(t * 0.22) * 24, 11 + Math.sin(t * 0.5) * 1.6, Math.sin(t * 0.22) * 20);
    satMesh.rotation.y = -t * 0.22 + Math.PI / 2;
  };

  const dispose = () => {
    disposableTextures.forEach((tex) => tex.dispose());
    [starPoints, neb1, neb2, satMesh].forEach((obj) => {
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

function inferSurfaceMode(opts: {
  topColor: number;
  accentCraters?: boolean;
  surfaceMode?: IslandSurfaceMode;
}): IslandSurfaceMode {
  if (opts.surfaceMode) return opts.surfaceMode;
  if (opts.accentCraters) return 'lunar';
  if (opts.topColor === 0x065f46 || opts.topColor === 0x15803d) return 'grass';
  if (opts.topColor === 0x0369a1 || opts.topColor === 0x0284c7) return 'ocean';
  return 'orbit';
}

/**
 * Builds a lush 3D Floating Island slab with procedural CanvasTexture surface,
 * merged rock belly + rim + hanging crystals, and 1 InstancedMesh of biome foliage/rocks
 * (only 3 draw calls per island!).
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
  const depth = opts.depth ?? 4.8;
  const mode = inferSurfaceMode(opts);
  const surfaceTex = createIslandSurfaceTexture(mode, opts.topColor, opts.rimColor);
  island.userData.disposableTextures = [surfaceTex];

  // 1. Top textured playable plateau (1 draw call)
  const plateau = new THREE.Mesh(
    new THREE.CylinderGeometry(opts.radius, opts.radius * 0.94, 0.72, 32),
    new THREE.MeshStandardMaterial({ map: surfaceTex, roughness: 0.76, metalness: 0.14 })
  );
  plateau.position.y = -0.36;
  island.add(plateau);

  // 2. Sculpted outer rim + rocky floating belly + hanging crystals + crater rims merged into 1 draw call!
  const underParts: ColoredGeometryPart[] = [
    {
      geometry: new THREE.TorusGeometry(opts.radius * 0.985, 0.15, 10, 44),
      color: opts.rimColor,
      position: [0, -0.02, 0],
      rotation: [Math.PI / 2, 0, 0]
    },
    {
      geometry: new THREE.ConeGeometry(opts.radius * 0.92, depth, 14),
      color: opts.rockColor,
      position: [0, -0.72 - depth / 2, 0],
      rotation: [Math.PI, 0, 0]
    }
  ];

  const crystalRad = Math.min(1.45, opts.radius * 0.08);
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 + 0.35;
    const dist = opts.radius * 0.65;
    underParts.push({
      geometry: new THREE.OctahedronGeometry(crystalRad, 0),
      color: opts.crystalColor,
      position: [
        Math.cos(angle) * dist,
        -1.2 - crystalRad * 1.8 - (i % 2) * 0.6,
        Math.sin(angle) * dist
      ],
      rotation: [0, 0, ((i % 2 === 0 ? 1 : -1) * 0.18)],
      scale: [0.65, 1.8, 0.65]
    });
  }

  if (opts.accentCraters) {
    for (let c = 0; c < 4; c++) {
      const ang = (c / 4) * Math.PI * 2 + 0.6;
      underParts.push({
        geometry: new THREE.TorusGeometry(opts.radius * 0.13, 0.17, 8, 16),
        color: 0x64748b,
        position: [Math.cos(ang) * opts.radius * 0.58, 0.04, Math.sin(ang) * opts.radius * 0.58],
        rotation: [Math.PI / 2, 0, 0]
      });
    }
  }

  const underMesh = new THREE.Mesh(
    mergeColoredParts(underParts),
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.72, metalness: 0.18, flatShading: true })
  );
  island.add(underMesh);

  // 3. InstancedMesh biome details along outer rim (28 grass tufts/wildflowers or rocks -> 1 draw call!)
  const detailCount = 28;
  const detailGeo =
    mode === 'grass' || mode === 'ocean'
      ? new THREE.ConeGeometry(0.16, 0.42, 5)
      : new THREE.DodecahedronGeometry(0.18, 0);
  const detailInst = new THREE.InstancedMesh(
    detailGeo,
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.68, flatShading: true }),
    detailCount
  );

  const dummy = new THREE.Object3D();
  const detailColors =
    mode === 'grass'
      ? [new THREE.Color(0x4ade80), new THREE.Color(0x22c55e), new THREE.Color(0xfacc15), new THREE.Color(0xf472b6)]
      : mode === 'ocean'
      ? [new THREE.Color(0x34d399), new THREE.Color(0xfb7185), new THREE.Color(0x38bdf8)]
      : mode === 'lunar'
      ? [new THREE.Color(0x94a3b8), new THREE.Color(0x64748b), new THREE.Color(0xfbbf24)]
      : [new THREE.Color(0x38bdf8), new THREE.Color(0x818cf8), new THREE.Color(0x94a3b8)];

  for (let i = 0; i < detailCount; i++) {
    const theta = (i / detailCount) * Math.PI * 2 + (i % 3) * 0.14;
    const radRatio = 0.72 + ((i * 37) % 19) / 100;
    const d = opts.radius * radRatio;
    const px = Math.cos(theta) * d;
    const pz = Math.sin(theta) * d;
    const s = 0.75 + ((i * 19) % 50) / 100;
    dummy.position.set(px, mode === 'lunar' ? 0.1 : 0.18 * s, pz);
    dummy.rotation.set(0, theta * 1.7, (i % 2 === 0 ? 1 : -1) * 0.12);
    dummy.scale.set(s, s * (mode === 'grass' ? 1.15 : 0.85), s);
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
    ctx.fillStyle = completed ? 'rgba(6, 78, 59, 0.92)' : 'rgba(15, 23, 42, 0.9)';
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
 * Builds sculpted 3D sci-fi station / building portal architecture (zero cube doors)
 * with merged vertex-colored hulls (1 draw call!) + optional portal/curtain/label.
 */
export function createStationBuildingMesh(
  room: SpatialRoomNode,
  completed: boolean,
  options?: { skipPortals?: boolean }
): {
  group: THREE.Group;
  portalRing: THREE.Mesh;
  curtain: THREE.Mesh;
  disposeTextures: THREE.Texture[];
} {
  const group = new THREE.Group();
  const accentHex = completed ? '#10b981' : room.accentHex;
  const accent = new THREE.Color(accentHex);

  // Merge hexagonal landing pad, zone glow ring, and specialized building hull into 1 draw call!
  const parts: ColoredGeometryPart[] = [
    {
      geometry: new THREE.CylinderGeometry(1.9, 2.15, 0.24, 6),
      color: completed ? 0x064e3b : 0x1e293b,
      position: [0, 0.12, 0]
    },
    {
      geometry: new THREE.TorusGeometry(2.05, 0.075, 8, 32),
      color: accentHex,
      position: [0, 0.05, 0],
      rotation: [Math.PI / 2, 0, 0]
    }
  ];

  const rid = room.id.toLowerCase();
  if (rid.includes('launch') || rid.includes('reentry')) {
    parts.push(
      { geometry: new THREE.CylinderGeometry(0.45, 0.56, 2.2, 16), color: 0xf8fafc, position: [0, 1.35, -0.4] },
      { geometry: new THREE.ConeGeometry(0.45, 0.85, 16), color: 0xf97316, position: [0, 2.85, -0.4] }
    );
  } else if (rid.includes('solar') || rid.includes('power')) {
    parts.push(
      { geometry: new THREE.CylinderGeometry(0.18, 0.24, 1.6, 12), color: 0x94a3b8, position: [0, 1.0, -0.5] },
      { geometry: new THREE.BoxGeometry(2.6, 0.1, 1.3), color: 0x0284c7, position: [0, 1.85, -0.5], rotation: [0.4, 0, 0] }
    );
  } else if (rid.includes('water') || rid.includes('engine')) {
    parts.push(
      { geometry: new THREE.CylinderGeometry(0.38, 0.38, 1.6, 16), color: 0x0ea5e9, position: [-0.55, 1.05, -0.45] },
      { geometry: new THREE.CylinderGeometry(0.38, 0.38, 1.6, 16), color: 0x0ea5e9, position: [0.55, 1.05, -0.45] }
    );
  } else if (rid.includes('food') || rid.includes('nutrition')) {
    parts.push({
      geometry: new THREE.SphereGeometry(1.15, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.52),
      color: 0x4ade80,
      position: [0, 0.24, -0.35]
    });
  } else {
    parts.push({
      geometry: new THREE.SphereGeometry(1.15, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.5),
      color: 0xe2e8f0,
      position: [0, 0.24, -0.45]
    });
  }

  const archMesh = new THREE.Mesh(
    mergeColoredParts(parts),
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.38, metalness: 0.36 })
  );
  group.add(archMesh);

  const portalRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.72, 0.11, 12, 28, Math.PI * 1.15),
    new THREE.MeshStandardMaterial({
      color: accent,
      emissive: accent,
      emissiveIntensity: 0.75,
      roughness: 0.25
    })
  );
  portalRing.position.set(0, 0.88, 1.15);

  const curtain = new THREE.Mesh(
    new THREE.CircleGeometry(0.65, 24),
    new THREE.MeshBasicMaterial({
      color: accent,
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide
    })
  );
  curtain.position.set(0, 0.9, 1.15);

  if (!options?.skipPortals) {
    group.add(portalRing, curtain);
  }

  // Floating 3D Sign Sprite cleanly above building
  const { sprite, texture } = createFloatingLabelSprite(room.nameAr, room.icon, room.accentHex, completed);
  sprite.position.set(0, 2.95, 0);
  group.add(sprite);

  return { group, portalRing, curtain, disposeTextures: [texture] };
}
