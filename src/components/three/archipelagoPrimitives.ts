import * as THREE from 'three';
import { SpatialRoomNode } from '../../data/campaignLevels';

export interface CosmicSkyHandle {
  update: (t: number) => void;
  dispose: () => void;
}

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
  tex.needsUpdate = true;
  return tex;
}

/**
 * Adds vibrant deep-space backdrop: sky gradient dome, twinkling starfields,
 * volumetric-style nebula planes, and an orbiting stylized telemetry satellite.
 */
export function createCosmicSkyBackdrop(scene: THREE.Scene): CosmicSkyHandle {
  scene.background = new THREE.Color(0x07122b);
  scene.fog = new THREE.FogExp2(0x081635, 0.011);

  const disposableTextures: THREE.Texture[] = [];

  // Two-layer Starfield (far cool white + near warm cyan)
  const makeStars = (count: number, spread: number, minY: number, color: number, size: number) => {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 28 + Math.random() * spread;
      const theta = Math.random() * Math.PI * 2;
      pos[i * 3] = Math.cos(theta) * r;
      pos[i * 3 + 1] = minY + (Math.random() - 0.35) * 42;
      pos[i * 3 + 2] = Math.sin(theta) * r;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return new THREE.Points(
      geo,
      new THREE.PointsMaterial({ color, size, transparent: true, opacity: 0.9 })
    );
  };

  const starsFar = makeStars(550, 55, 6, 0xe0f2fe, 0.24);
  const starsNear = makeStars(220, 34, 2, 0xfef08a, 0.32);
  scene.add(starsFar, starsNear);

  // Volumetric Nebula Billboards in Background
  const nebTex1 = createRadialNebulaTexture('rgba(56, 189, 248, 0.42)', 'rgba(99, 102, 241, 0.16)');
  const nebTex2 = createRadialNebulaTexture('rgba(168, 85, 247, 0.38)', 'rgba(236, 72, 153, 0.12)');
  const nebTex3 = createRadialNebulaTexture('rgba(16, 185, 129, 0.3)', 'rgba(14, 165, 233, 0.12)');
  disposableTextures.push(nebTex1, nebTex2, nebTex3);

  const makeNebula = (tex: THREE.CanvasTexture, x: number, y: number, z: number, scale: number) => {
    const mat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const sp = new THREE.Sprite(mat);
    sp.position.set(x, y, z);
    sp.scale.set(scale, scale * 0.72, 1);
    scene.add(sp);
    return sp;
  };

  const neb1 = makeNebula(nebTex1, -26, 12, -38, 36);
  const neb2 = makeNebula(nebTex2, 28, 15, -42, 40);
  const neb3 = makeNebula(nebTex3, 2, 9, 44, 34);

  // Orbiting Stylized NASA Satellite
  const satGroup = new THREE.Group();
  const satBus = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.45, 0),
    new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.7, roughness: 0.25 })
  );
  const satWingL = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.05, 0.55),
    new THREE.MeshStandardMaterial({ color: 0x0284c7, emissive: 0x0369a1, emissiveIntensity: 0.45 })
  );
  satWingL.position.x = -1.15;
  const satWingR = satWingL.clone();
  satWingR.position.x = 1.15;
  const satDish = new THREE.Mesh(
    new THREE.ConeGeometry(0.32, 0.24, 14),
    new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.5 })
  );
  satDish.position.set(0, -0.45, 0);
  satGroup.add(satBus, satWingL, satWingR, satDish);
  scene.add(satGroup);

  const update = (t: number) => {
    starsFar.rotation.y = t * 0.008;
    starsNear.rotation.y = -t * 0.012;
    neb1.position.y = 12 + Math.sin(t * 0.3) * 1.1;
    neb2.position.y = 15 + Math.cos(t * 0.25) * 1.3;
    neb3.position.y = 9 + Math.sin(t * 0.35 + 1) * 0.9;
    satGroup.position.set(Math.cos(t * 0.22) * 24, 11 + Math.sin(t * 0.5) * 1.6, Math.sin(t * 0.22) * 20);
    satGroup.rotation.y = -t * 0.22 + Math.PI / 2;
  };

  const dispose = () => {
    disposableTextures.forEach((tex) => tex.dispose());
    [starsFar, starsNear, neb1, neb2, neb3, satGroup].forEach((obj) => {
      obj.traverse((child) => {
        if (child instanceof THREE.Mesh || child instanceof THREE.Points) {
          child.geometry?.dispose();
          const m = child.material;
          if (Array.isArray(m)) m.forEach((x) => x.dispose());
          else m?.dispose();
        } else if (child instanceof THREE.Sprite) {
          child.material.dispose();
        }
      });
    });
  };

  return { update, dispose };
}

/**
 * Builds a rich 3D Floating Island slab with tapered rock belly, glowing crystal spires,
 * bevel top plateau, and perimeter trim ring (zero flat wireframe grids).
 */
export function createFloatingIslandMesh(opts: {
  radius: number;
  depth?: number;
  topColor: number;
  rimColor: number;
  rockColor: number;
  crystalColor: number;
  accentCraters?: boolean;
}): THREE.Group {
  const island = new THREE.Group();
  const depth = opts.depth ?? 4.8;

  // Top playable biome plateau
  const plateau = new THREE.Mesh(
    new THREE.CylinderGeometry(opts.radius, opts.radius * 0.94, 0.72, 32),
    new THREE.MeshStandardMaterial({ color: opts.topColor, roughness: 0.75, metalness: 0.12 })
  );
  plateau.position.y = -0.36;
  island.add(plateau);

  // Inner subtle concentric courtyard emblem
  const innerPlaza = new THREE.Mesh(
    new THREE.CylinderGeometry(opts.radius * 0.52, opts.radius * 0.52, 0.08, 28),
    new THREE.MeshStandardMaterial({ color: opts.rimColor, roughness: 0.55, metalness: 0.3, transparent: true, opacity: 0.32 })
  );
  innerPlaza.position.y = 0.02;
  island.add(innerPlaza);

  // Glowing outer rim ring
  const rimRing = new THREE.Mesh(
    new THREE.TorusGeometry(opts.radius * 0.98, 0.14, 10, 48),
    new THREE.MeshStandardMaterial({
      color: opts.rimColor,
      emissive: opts.rimColor,
      emissiveIntensity: 0.45,
      roughness: 0.3
    })
  );
  rimRing.rotation.x = Math.PI / 2;
  rimRing.position.y = -0.02;
  island.add(rimRing);

  // Sculpted tapered rocky floating base under island
  const belly = new THREE.Mesh(
    new THREE.ConeGeometry(opts.radius * 0.92, depth, 14),
    new THREE.MeshStandardMaterial({ color: opts.rockColor, roughness: 0.9, flatShading: true })
  );
  belly.rotation.x = Math.PI;
  belly.position.y = -0.72 - depth / 2;
  island.add(belly);

  // Decorative hanging energy crystals safely below island slab
  const crystalRad = Math.min(1.5, opts.radius * 0.08);
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 + 0.35;
    const dist = opts.radius * 0.65;
    const crystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(crystalRad, 0),
      new THREE.MeshStandardMaterial({
        color: opts.crystalColor,
        emissive: opts.crystalColor,
        emissiveIntensity: 0.65,
        roughness: 0.2
      })
    );
    crystal.scale.set(0.65, 1.8, 0.65);
    crystal.position.set(
      Math.cos(angle) * dist,
      -1.2 - crystalRad * 1.8 - (i % 2) * 0.6,
      Math.sin(angle) * dist
    );
    crystal.rotation.z = (Math.random() - 0.5) * 0.35;
    island.add(crystal);
  }

  // Optional lunar crater rims for Moon level / island
  if (opts.accentCraters) {
    for (let c = 0; c < 4; c++) {
      const ang = (c / 4) * Math.PI * 2 + 0.6;
      const crater = new THREE.Mesh(
        new THREE.TorusGeometry(opts.radius * 0.14, 0.18, 8, 18),
        new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.95 })
      );
      crater.rotation.x = Math.PI / 2;
      crater.position.set(
        Math.cos(ang) * opts.radius * 0.58,
        0.04,
        Math.sin(ang) * opts.radius * 0.58
      );
      island.add(crater);
    }
  }

  return island;
}

export function createFloatingLabelSprite(
  titleAr: string,
  icon: string,
  accentHex: string,
  completed = false
): { sprite: THREE.Sprite; texture: THREE.CanvasTexture } {
  const canvas = document.createElement('canvas');
  canvas.width = 384;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 384, 96);

    // Capsule pill
    ctx.fillStyle = completed ? 'rgba(6, 78, 59, 0.92)' : 'rgba(15, 23, 42, 0.9)';
    ctx.beginPath();
    ctx.roundRect(10, 12, 364, 72, 34);
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
  texture.needsUpdate = true;
  const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(4.1, 1.02, 1);
  return { sprite, texture };
}

/**
 * Builds sculpted 3D sci-fi station / building portal architecture (zero cube doors)
 * with archways, holographic door curtains, and specialized props per room role.
 */
export function createStationBuildingMesh(
  room: SpatialRoomNode,
  completed: boolean
): {
  group: THREE.Group;
  portalRing: THREE.Mesh;
  curtain: THREE.Mesh;
  disposeTextures: THREE.Texture[];
} {
  const group = new THREE.Group();
  const accent = new THREE.Color(completed ? '#10b981' : room.accentHex);

  // Hexagonal Sci-Fi Landing Pad
  const pad = new THREE.Mesh(
    new THREE.CylinderGeometry(1.9, 2.15, 0.24, 6),
    new THREE.MeshStandardMaterial({ color: completed ? 0x064e3b : 0x1e293b, roughness: 0.4, metalness: 0.45 })
  );
  pad.position.y = 0.12;
  group.add(pad);

  // Glowing Front Entry Zone Ring on Ground
  const zoneRing = new THREE.Mesh(
    new THREE.TorusGeometry(2.05, 0.07, 8, 32),
    new THREE.MeshBasicMaterial({ color: accent })
  );
  zoneRing.rotation.x = Math.PI / 2;
  zoneRing.position.y = 0.05;
  group.add(zoneRing);

  // Sculpted Architectural Dome / Hull depending on room type
  const rid = room.id.toLowerCase();
  if (rid.includes('launch') || rid.includes('reentry')) {
    const rocket = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.56, 2.2, 16),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.4, roughness: 0.25 })
    );
    rocket.position.set(0, 1.35, -0.4);
    const nose = new THREE.Mesh(
      new THREE.ConeGeometry(0.45, 0.85, 16),
      new THREE.MeshStandardMaterial({ color: 0xf97316, emissive: 0xea580c, emissiveIntensity: 0.25 })
    );
    nose.position.set(0, 2.85, -0.4);
    group.add(rocket, nose);
  } else if (rid.includes('solar') || rid.includes('power')) {
    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.24, 1.6, 12),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.6 })
    );
    mast.position.set(0, 1.0, -0.5);
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 0.1, 1.3),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, emissive: 0x0369a1, emissiveIntensity: 0.55 })
    );
    panel.rotation.x = 0.4;
    panel.position.set(0, 1.85, -0.5);
    group.add(mast, panel);
  } else if (rid.includes('water') || rid.includes('engine')) {
    [-0.55, 0.55].forEach((tx) => {
      const tank = new THREE.Mesh(
        new THREE.CylinderGeometry(0.38, 0.38, 1.6, 16),
        new THREE.MeshStandardMaterial({ color: 0x0ea5e9, emissive: 0x0284c7, emissiveIntensity: 0.38, roughness: 0.25 })
      );
      tank.position.set(tx, 1.05, -0.45);
      group.add(tank);
    });
  } else if (rid.includes('food') || rid.includes('nutrition')) {
    const bioDome = new THREE.Mesh(
      new THREE.SphereGeometry(1.15, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.52),
      new THREE.MeshStandardMaterial({
        color: 0x4ade80,
        emissive: 0x16a34a,
        emissiveIntensity: 0.35,
        transparent: true,
        opacity: 0.65
      })
    );
    bioDome.position.set(0, 0.24, -0.35);
    group.add(bioDome);
  } else {
    // Sleek Geodesic Science / Medical / Habitat Pod
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(1.15, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.5),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.45, roughness: 0.3 })
    );
    dome.position.set(0, 0.24, -0.45);
    group.add(dome);
  }

  // Sculpted Glowing Circular Airlock Portal Arch (Front Entrance)
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
  group.add(portalRing);

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
  group.add(curtain);

  // Floating 3D Sign Sprite cleanly above building (non-overlapping with screen HTML)
  const { sprite, texture } = createFloatingLabelSprite(room.nameAr, room.icon, room.accentHex, completed);
  sprite.position.set(0, 2.95, 0);
  group.add(sprite);

  return { group, portalRing, curtain, disposeTextures: [texture] };
}
