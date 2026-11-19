import * as THREE from 'three';
import { SpaceFitXState } from '../../types/game';
import { mergeColoredParts } from './threeMergeUtils';
import { loadCachedGlbClone } from './blenderModelLoader';

export type AstronautEmote = 'none' | 'wave' | 'celebrate' | 'point';

export interface SpaceFitXCharacterHandle {
  group: THREE.Group;
  update: (opts: {
    t: number;
    moveSpeed?: number;
    isRunning?: boolean;
    isJumping?: boolean;
    isZeroG?: boolean;
    isSeated?: boolean;
    suitState?: SpaceFitXState;
    highlightModule?: number | null;
    idleSeconds?: number;
    emote?: AstronautEmote;
  }) => void;
  dispose: () => void;
}

function createAstroNutriBadgeTexture(backVariant = false): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, 256, 128);
    grad.addColorStop(0, backVariant ? '#0b1325' : '#13203a');
    grad.addColorStop(1, backVariant ? '#111c33' : '#1b2d4f');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 128);

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 6;
    ctx.strokeRect(6, 6, 244, 116);

    ctx.fillStyle = '#22d3ee';
    ctx.beginPath();
    ctx.moveTo(44, 30);
    ctx.lineTo(62, 62);
    ctx.lineTo(44, 88);
    ctx.lineTo(26, 62);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(44, 96, 7, 0, Math.PI * 2);
    ctx.fill();

    // Brand Title: strictly AstroNutri (NEVER HealthyLife)
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 34px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('AstroNutri', 72, 60);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 17px monospace';
    ctx.fillText('SPACE-FIT X v1.0', 72, 92);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createDosimeterTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#0b1324';
    ctx.fillRect(0, 0, 128, 128);
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 8;
    ctx.strokeRect(8, 8, 112, 112);

    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(64, 50, 10, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 3; i++) {
      const angle = (i * Math.PI * 2) / 3 - Math.PI / 2;
      ctx.beginPath();
      ctx.arc(64 + Math.cos(angle) * 24, 50 + Math.sin(angle) * 24, 11, angle - 0.55, angle + 0.55);
      ctx.lineTo(64, 50);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('mSv MON', 64, 106);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createSuitWeaveTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#e5e7eb';
    ctx.fillRect(0, 0, 128, 128);
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 1.5;
    for (let y = 0; y < 128; y += 16) {
      for (let x = 0; x < 128; x += 16) {
        ctx.strokeRect(x + ((y / 16) % 2) * 8, y, 8, 8);
      }
    }
    ctx.fillStyle = 'rgba(0,0,0,0.07)';
    for (let i = 0; i < 140; i++) {
      ctx.fillRect((i * 29) % 128, (i * 47) % 128, 2, 2);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  tex.needsUpdate = true;
  return tex;
}

/**
 * Builds an expressive stylized Low-Poly Human Astronaut wearing the
 * SPACE-FIT X (Prototype 1.0) IVA Countermeasure Suit branded with AstroNutri
 * (matte black compression base, metallic silver armor, dark graphite joints,
 * electric cyan resistance cables, NO bulky EVA helmet) + hovering Mini-Robo companion.
 */
export function buildSpaceFitXCharacter(options?: {
  showEvaHelmet?: boolean;
  showCompanion?: boolean;
  scale?: number;
}): SpaceFitXCharacterHandle {
  const group = new THREE.Group();
  const rootScale = options?.scale ?? 1;
  group.scale.setScalar(rootScale);

  const disposableTextures: THREE.Texture[] = [];
  const frontBadgeTex = createAstroNutriBadgeTexture(false);
  const backBadgeTex = createAstroNutriBadgeTexture(true);
  const dosimeterTex = createDosimeterTexture();
  const weaveTex = createSuitWeaveTexture();
  disposableTextures.push(frontBadgeTex, backBadgeTex, dosimeterTex, weaveTex);

  // Materials — SPACE-FIT X Matte Black + Metallic Silver + Graphite + Electric Cyan
  const matArmorVertex = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    map: weaveTex,
    roughness: 0.36,
    metalness: 0.34
  });
  const matSkinHair = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.56,
    metalness: 0.05,
    flatShading: true
  });
  const matHexPad = new THREE.MeshStandardMaterial({
    color: 0x1f2937,
    roughness: 0.44,
    metalness: 0.35,
    emissive: 0x0ea5e9,
    emissiveIntensity: 0.1
  });
  const matCompressionCyan = new THREE.MeshStandardMaterial({
    color: 0x22d3ee,
    emissive: 0x06b6d4,
    emissiveIntensity: 0.9,
    roughness: 0.22,
    metalness: 0.45
  });
  const matCableCyan = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.8,
    roughness: 0.28,
    metalness: 0.55
  });
  const matRoboBeacon = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    emissive: 0x22d3ee,
    emissiveIntensity: 1.1,
    roughness: 0.2
  });
  const matQuickRelease = new THREE.MeshStandardMaterial({
    color: 0xf43f5e,
    emissive: 0xe11d48,
    emissiveIntensity: 0.52,
    roughness: 0.3,
    metalness: 0.45
  });
  const matPhysioLed = new THREE.MeshStandardMaterial({
    color: 0x34d399,
    emissive: 0x10b981,
    emissiveIntensity: 1.0,
    roughness: 0.18
  });

  // Baked Radial Dark-Cyan Ambient Occlusion & Contact Shadow Disc (1 mesh, 0 extra draw calls)
  const aoCanvas = document.createElement('canvas');
  aoCanvas.width = 128;
  aoCanvas.height = 128;
  const aoCtx = aoCanvas.getContext('2d');
  if (aoCtx) {
    const grad = aoCtx.createRadialGradient(64, 64, 6, 64, 64, 62);
    grad.addColorStop(0, 'rgba(2, 6, 23, 0.90)');
    grad.addColorStop(0.45, 'rgba(6, 40, 62, 0.62)');
    grad.addColorStop(0.76, 'rgba(8, 145, 178, 0.24)');
    grad.addColorStop(1, 'rgba(2, 6, 23, 0.0)');
    aoCtx.fillStyle = grad;
    aoCtx.fillRect(0, 0, 128, 128);
  }
  const aoShadowTex = new THREE.CanvasTexture(aoCanvas);
  aoShadowTex.colorSpace = THREE.SRGBColorSpace;
  disposableTextures.push(aoShadowTex);

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.78, 24),
    new THREE.MeshBasicMaterial({
      map: aoShadowTex,
      transparent: true,
      depthWrite: false
    })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.025;
  group.add(shadow);

  // Instant Procedural Fallback Root (swapped cleanly once Blender astronaut_hero.glb loads)
  const fallbackBodyRoot = new THREE.Group();
  group.add(fallbackBodyRoot);

  // Articulated Skeleton Body Root
  const bodyPivot = new THREE.Group();
  bodyPivot.position.y = 1.02;
  fallbackBodyRoot.add(bodyPivot);

  // Pelvis & Utility Belt (Matte Black + Silver Belt Buckle + Teal Trim)
  const pelvisGeom = mergeColoredParts([
    { geometry: new THREE.CylinderGeometry(0.22, 0.2, 0.23, 14), color: 0x111827, position: [0, -0.17, 0] },
    { geometry: new THREE.BoxGeometry(0.5, 0.1, 0.34), color: 0xdbe5f2, position: [0, -0.1, 0] },
    { geometry: new THREE.BoxGeometry(0.15, 0.08, 0.06), color: 0x22d3ee, position: [0, -0.1, 0.18] }
  ]);
  bodyPivot.add(new THREE.Mesh(pelvisGeom, matArmorVertex));

  // Module 04: Quick-Release Hip Dials + Emergency Med Pouch
  const quickReleaseGeom = mergeColoredParts([
    { geometry: new THREE.CylinderGeometry(0.08, 0.08, 0.07, 14), color: 0xf43f5e, position: [-0.27, -0.1, 0.04], rotation: [0, 0, Math.PI / 2] },
    { geometry: new THREE.CylinderGeometry(0.08, 0.08, 0.07, 14), color: 0xf43f5e, position: [0.27, -0.1, 0.04], rotation: [0, 0, Math.PI / 2] },
    { geometry: new THREE.BoxGeometry(0.1, 0.16, 0.13), color: 0xe11d48, position: [-0.29, -0.25, 0.02] }
  ]);
  bodyPivot.add(new THREE.Mesh(quickReleaseGeom, matQuickRelease));

  // Torso Assembly (Heroic V-Tapered Matte Black Compression + Metallic Silver Plates)
  const torsoGroup = new THREE.Group();
  torsoGroup.position.y = 0.12;
  bodyPivot.add(torsoGroup);

  const torsoArmorGeom = mergeColoredParts([
    // Matte Black compression core
    { geometry: new THREE.CylinderGeometry(0.3, 0.21, 0.58, 16), color: 0x111827, scale: [1.06, 1, 0.72] },
    // Metallic Silver thoracic sternum plate & abs plate
    { geometry: new THREE.BoxGeometry(0.54, 0.34, 0.38), color: 0xe2e8f0, position: [0, 0.12, 0.02] },
    { geometry: new THREE.BoxGeometry(0.35, 0.18, 0.33), color: 0xcbd5e1, position: [0, -0.12, 0.02] },
    // Clavicle shoulder armor blades
    { geometry: new THREE.BoxGeometry(0.22, 0.08, 0.41), color: 0x94a3b8, position: [-0.2, 0.29, 0], rotation: [0, 0, -0.16] },
    { geometry: new THREE.BoxGeometry(0.22, 0.08, 0.41), color: 0x94a3b8, position: [0.2, 0.29, 0], rotation: [0, 0, 0.16] },
    // Dark Graphite spine frame
    { geometry: new THREE.BoxGeometry(0.32, 0.42, 0.13), color: 0x1f2937, position: [0, 0.08, -0.17] }
  ]);
  torsoGroup.add(new THREE.Mesh(torsoArmorGeom, matArmorVertex));

  // Front & Back AstroNutri Branded Emblem Plates
  const frontLogoPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(0.36, 0.18),
    new THREE.MeshBasicMaterial({ map: frontBadgeTex })
  );
  frontLogoPlane.position.set(0, 0.14, 0.216);
  torsoGroup.add(frontLogoPlane);

  const backLogoPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(0.34, 0.17),
    new THREE.MeshBasicMaterial({ map: backBadgeTex })
  );
  backLogoPlane.rotation.y = Math.PI;
  backLogoPlane.position.set(0, 0.13, -0.242);
  torsoGroup.add(backLogoPlane);

  // Module 01: Smart Compression Cyan Seams + Collar Ring
  const compTorsoGeom = mergeColoredParts([
    { geometry: new THREE.BoxGeometry(0.038, 0.48, 0.39), color: 0x22d3ee, position: [-0.19, 0.05, 0.01] },
    { geometry: new THREE.BoxGeometry(0.038, 0.48, 0.39), color: 0x22d3ee, position: [0.19, 0.05, 0.01] },
    { geometry: new THREE.TorusGeometry(0.165, 0.03, 10, 22), color: 0x22d3ee, position: [0, 0.33, 0], rotation: [Math.PI / 2, 0, 0] }
  ]);
  torsoGroup.add(new THREE.Mesh(compTorsoGeom, matCompressionCyan));

  // Module 03: Spine Impact Guard Hex-TPU Segments
  const hexSpineGeom = mergeColoredParts([
    { geometry: new THREE.BoxGeometry(0.15, 0.11, 0.06), color: 0x1f2937, position: [0, 0.21, -0.235] },
    { geometry: new THREE.BoxGeometry(0.14, 0.11, 0.06), color: 0x1f2937, position: [0, 0.06, -0.235] },
    { geometry: new THREE.BoxGeometry(0.13, 0.11, 0.06), color: 0x1f2937, position: [0, -0.09, -0.235] }
  ]);
  torsoGroup.add(new THREE.Mesh(hexSpineGeom, matHexPad));

  // Module 06: Chest Personal Radiation Dosimeter Badge
  const dosimeterBox = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.12, 0.045),
    new THREE.MeshStandardMaterial({ map: dosimeterTex, emissive: 0x1e293b, emissiveIntensity: 0.4 })
  );
  dosimeterBox.position.set(0.16, -0.05, 0.22);
  torsoGroup.add(dosimeterBox);

  // Module 05: Heart/Physio Sensor Node on Chest
  const chestSensor = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 12), matPhysioLed);
  chestSensor.position.set(-0.16, -0.05, 0.22);
  torsoGroup.add(chestSensor);

  // Module 07: Rear Waist Power & Kinetic Harvesting Battery + 4 Instanced Charge LEDs
  const batteryPackGroup = new THREE.Group();
  batteryPackGroup.position.set(0, -0.13, -0.23);
  bodyPivot.add(batteryPackGroup);

  const batteryHousingGeom = mergeColoredParts([
    { geometry: new THREE.BoxGeometry(0.28, 0.2, 0.11), color: 0xdbe5f2 },
    { geometry: new THREE.BoxGeometry(0.22, 0.13, 0.025), color: 0x0f172a, position: [0, 0, -0.048] }
  ]);
  batteryPackGroup.add(new THREE.Mesh(batteryHousingGeom, matArmorVertex));

  const batteryBarsInst = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.036, 0.1, 0.022),
    new THREE.MeshBasicMaterial({ color: 0xffffff }),
    4
  );
  const barMat4 = new THREE.Matrix4();
  for (let b = 0; b < 4; b++) {
    barMat4.makeTranslation(-0.069 + b * 0.046, 0, -0.063);
    batteryBarsInst.setMatrixAt(b, barMat4);
    batteryBarsInst.setColorAt(b, new THREE.Color(0x22d3ee));
  }
  batteryBarsInst.instanceMatrix.needsUpdate = true;
  if (batteryBarsInst.instanceColor) batteryBarsInst.instanceColor.needsUpdate = true;
  batteryPackGroup.add(batteryBarsInst);

  // Switchable Backpack Gear: ECLSS Life-Support Pack vs Zero-G Thruster Pack (1 merged mesh each)
  const eclssPackGeom = mergeColoredParts([
    { geometry: new THREE.BoxGeometry(0.36, 0.42, 0.16), color: 0xe2e8f0, position: [0, 0.12, -0.28] },
    { geometry: new THREE.CylinderGeometry(0.065, 0.065, 0.36, 10), color: 0x0ea5e9, position: [-0.09, 0.12, -0.35] },
    { geometry: new THREE.CylinderGeometry(0.065, 0.065, 0.36, 10), color: 0x10b981, position: [0.09, 0.12, -0.35] },
    { geometry: new THREE.BoxGeometry(0.24, 0.06, 0.06), color: 0x38bdf8, position: [0, 0.27, -0.35] }
  ]);
  const eclssPackMesh = new THREE.Mesh(eclssPackGeom, matArmorVertex);
  torsoGroup.add(eclssPackMesh);

  const thrusterPackGeom = mergeColoredParts([
    { geometry: new THREE.BoxGeometry(0.4, 0.34, 0.18), color: 0x334155, position: [0, 0.14, -0.29] },
    { geometry: new THREE.ConeGeometry(0.09, 0.18, 10), color: 0xfbbf24, position: [-0.14, -0.04, -0.34], rotation: [Math.PI, 0, -0.15] },
    { geometry: new THREE.ConeGeometry(0.09, 0.18, 10), color: 0xfbbf24, position: [0.14, -0.04, -0.34], rotation: [Math.PI, 0, 0.15] },
    { geometry: new THREE.CylinderGeometry(0.05, 0.05, 0.12, 8), color: 0xf43f5e, position: [0, 0.29, -0.34] }
  ]);
  const thrusterPackMesh = new THREE.Mesh(thrusterPackGeom, matArmorVertex);
  thrusterPackMesh.visible = false;
  torsoGroup.add(thrusterPackMesh);

  // ==================== HUMAN ASTRONAUT HEAD (LOW-POLY EXPRESSIVE FACE + HAIR + AR VISOR) ====================
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.44, 0);
  torsoGroup.add(headGroup);

  const humanHeadGeom = mergeColoredParts([
    // Warm Neck Collar + Neck
    { geometry: new THREE.CylinderGeometry(0.09, 0.11, 0.1, 12), color: 0xfdba8c, position: [0, 0.02, 0] },
    // Stylized Low-Poly Human Head
    { geometry: new THREE.SphereGeometry(0.23, 18, 14), color: 0xfdc59f, position: [0, 0.21, 0], scale: [1.0, 1.03, 0.96] },
    // Friendly Nose
    { geometry: new THREE.ConeGeometry(0.032, 0.065, 8), color: 0xf59e78, position: [0, 0.19, 0.225], rotation: [Math.PI * 0.42, 0, 0] },
    // Left & Right Ears
    { geometry: new THREE.SphereGeometry(0.046, 8, 8), color: 0xf5ad82, position: [-0.22, 0.19, 0], scale: [0.55, 0.9, 0.7] },
    { geometry: new THREE.SphereGeometry(0.046, 8, 8), color: 0xf5ad82, position: [0.22, 0.19, 0], scale: [0.55, 0.9, 0.7] },
    // Low-Poly Stylized Hair Crown + Heroic Forward Tuft & Sideburns
    { geometry: new THREE.SphereGeometry(0.245, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.56), color: 0x241934, position: [0, 0.23, -0.02], rotation: [-0.25, 0, 0] },
    { geometry: new THREE.ConeGeometry(0.095, 0.17, 7), color: 0x312347, position: [0.04, 0.42, 0.13], rotation: [0.85, 0.15, -0.3] },
    { geometry: new THREE.ConeGeometry(0.075, 0.13, 7), color: 0x3b2c54, position: [-0.08, 0.4, 0.15], rotation: [0.75, -0.2, 0.35] },
    { geometry: new THREE.BoxGeometry(0.06, 0.13, 0.11), color: 0x241934, position: [-0.215, 0.24, 0.05] },
    { geometry: new THREE.BoxGeometry(0.06, 0.13, 0.11), color: 0x241934, position: [0.215, 0.24, 0.05] },
    // Comms Headset Earpiece + Micro Boom Mic
    { geometry: new THREE.CylinderGeometry(0.055, 0.055, 0.04, 12), color: 0x1e293b, position: [-0.245, 0.19, 0.02], rotation: [0, 0, Math.PI / 2] },
    { geometry: new THREE.CylinderGeometry(0.055, 0.055, 0.04, 12), color: 0x1e293b, position: [0.245, 0.19, 0.02], rotation: [0, 0, Math.PI / 2] },
    { geometry: new THREE.CylinderGeometry(0.01, 0.012, 0.17, 8), color: 0x22d3ee, position: [0.255, 0.31, -0.01] },
    // Rosy Cheeks
    { geometry: new THREE.SphereGeometry(0.032, 8, 8), color: 0xfb7185, position: [-0.12, 0.15, 0.185], scale: [1.1, 0.65, 0.35] },
    { geometry: new THREE.SphereGeometry(0.032, 8, 8), color: 0xfb7185, position: [0.12, 0.15, 0.185], scale: [1.1, 0.65, 0.35] }
  ]);
  headGroup.add(new THREE.Mesh(humanHeadGeom, matSkinHair));

  // Animated Expressive Eyes + Brows (scale.y blinks cleanly!)
  const eyesGroup = new THREE.Group();
  eyesGroup.position.set(0, 0.22, 0.212);
  headGroup.add(eyesGroup);

  const eyesGeom = mergeColoredParts([
    // Left & Right Sclera Whites (friendly heroic child-astronaut proportions)
    { geometry: new THREE.SphereGeometry(0.048, 12, 10), color: 0xffffff, position: [-0.078, 0.005, 0], scale: [1.0, 1.2, 0.38] },
    { geometry: new THREE.SphereGeometry(0.048, 12, 10), color: 0xffffff, position: [0.078, 0.005, 0], scale: [1.0, 1.2, 0.38] },
    // Warm Teal-Blue Irises
    { geometry: new THREE.SphereGeometry(0.031, 10, 10), color: 0x0ea5e9, position: [-0.074, 0.003, 0.012], scale: [0.98, 1.15, 0.4] },
    { geometry: new THREE.SphereGeometry(0.031, 10, 10), color: 0x0ea5e9, position: [0.074, 0.003, 0.012], scale: [0.98, 1.15, 0.4] },
    // Deep Expressive Pupils
    { geometry: new THREE.SphereGeometry(0.018, 8, 8), color: 0x0f172a, position: [-0.074, 0.003, 0.02], scale: [0.92, 1.04, 0.4] },
    { geometry: new THREE.SphereGeometry(0.018, 8, 8), color: 0x0f172a, position: [0.074, 0.003, 0.02], scale: [0.92, 1.04, 0.4] },
    // Crisp White Eye Catchlights (brings instant warmth & Pixar-like charm)
    { geometry: new THREE.SphereGeometry(0.009, 6, 6), color: 0xffffff, position: [-0.064, 0.016, 0.024], scale: [1, 1, 0.5] },
    { geometry: new THREE.SphereGeometry(0.009, 6, 6), color: 0xffffff, position: [0.084, 0.016, 0.024], scale: [1, 1, 0.5] },
    // Soft Raised Friendly Eyebrows
    { geometry: new THREE.BoxGeometry(0.076, 0.018, 0.02), color: 0x241934, position: [-0.078, 0.068, 0.006], rotation: [0, 0, 0.12] },
    { geometry: new THREE.BoxGeometry(0.076, 0.018, 0.02), color: 0x241934, position: [0.078, 0.068, 0.006], rotation: [0, 0, -0.12] }
  ]);
  const eyesMesh = new THREE.Mesh(eyesGeom, new THREE.MeshBasicMaterial({ vertexColors: true }));
  eyesGroup.add(eyesMesh);

  // Expressive Warm Smile (animates open when laughing/celebrating!)
  const mouthMesh = new THREE.Mesh(
    new THREE.TorusGeometry(0.052, 0.013, 8, 16, Math.PI),
    new THREE.MeshBasicMaterial({ color: 0xbe123c })
  );
  mouthMesh.position.set(0, 0.128, 0.214);
  mouthMesh.rotation.z = Math.PI;
  headGroup.add(mouthMesh);

  // Sleek Transparent Cyan AR Smart-Visor Band across forehead/eyes (IVA Mode)
  const arVisor = new THREE.Mesh(
    new THREE.CylinderGeometry(0.248, 0.248, 0.095, 20, 1, true, -Math.PI * 0.28, Math.PI * 0.56),
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.45,
      transparent: true,
      opacity: 0.34,
      side: THREE.DoubleSide,
      roughness: 0.08,
      metalness: 0.6
    })
  );
  arVisor.position.set(0, 0.228, 0.012);
  headGroup.add(arVisor);

  // Toggleable Glossy Translucent Bubble EVA Visor Helmet (Face clearly visible inside!)
  const evaBubble = new THREE.Mesh(
    new THREE.SphereGeometry(0.325, 22, 16),
    new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.12,
      transparent: true,
      opacity: 0.28,
      roughness: 0.06,
      metalness: 0.25
    })
  );
  evaBubble.position.y = 0.215;
  evaBubble.visible = options?.showEvaHelmet ?? true;
  headGroup.add(evaBubble);

  // Arms & Resistance Cables + Integrated Left Wrist Telemetry Monitor
  const createArm = (side: -1 | 1, includeWristMonitor: boolean) => {
    const shoulderPivot = new THREE.Group();
    shoulderPivot.position.set(side * 0.37, 0.22, 0);
    torsoGroup.add(shoulderPivot);

    const upperArmGeom = mergeColoredParts([
      { geometry: new THREE.SphereGeometry(0.11, 12, 10), color: 0x1f2937 },
      { geometry: new THREE.CylinderGeometry(0.084, 0.072, 0.32, 12), color: 0x111827, position: [0, -0.17, 0] },
      { geometry: new THREE.TorusGeometry(0.082, 0.015, 8, 16), color: 0x22d3ee, position: [0, -0.17, 0], rotation: [Math.PI / 2, 0, 0] }
    ]);
    shoulderPivot.add(new THREE.Mesh(upperArmGeom, matArmorVertex));

    const elbowPivot = new THREE.Group();
    elbowPivot.position.y = -0.34;
    shoulderPivot.add(elbowPivot);

    const forearmParts: Parameters<typeof mergeColoredParts>[0] = [
      { geometry: new THREE.SphereGeometry(0.078, 10, 10), color: 0x1f2937 },
      { geometry: new THREE.CylinderGeometry(0.072, 0.06, 0.3, 12), color: 0xe2e8f0, position: [0, -0.15, 0] },
      { geometry: new THREE.SphereGeometry(0.072, 10, 10), color: 0xfdc59f, position: [0, -0.32, 0] }
    ];
    if (includeWristMonitor) {
      forearmParts.push(
        { geometry: new THREE.BoxGeometry(0.04, 0.11, 0.085), color: 0x0f172a, position: [0.068, -0.22, 0.02] },
        { geometry: new THREE.BoxGeometry(0.015, 0.085, 0.065), color: 0x22d3ee, position: [0.088, -0.22, 0.02] }
      );
    }
    const forearmGeom = mergeColoredParts(forearmParts);
    elbowPivot.add(new THREE.Mesh(forearmGeom, matArmorVertex));

    const armCable = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.58, 8), matCableCyan);
    armCable.position.set(side * 0.095, -0.32, 0);
    shoulderPivot.add(armCable);

    return { shoulderPivot, elbowPivot, armCable };
  };

  const leftArm = createArm(-1, true);
  const rightArm = createArm(1, false);

  // Legs & Resistance Cables
  const createLeg = (side: -1 | 1) => {
    const hipPivot = new THREE.Group();
    hipPivot.position.set(side * 0.155, -0.21, 0);
    bodyPivot.add(hipPivot);

    const thighGeom = mergeColoredParts([
      { geometry: new THREE.CylinderGeometry(0.062, 0.062, 0.055, 10), color: 0x22d3ee, position: [side * 0.085, 0, 0], rotation: [0, 0, Math.PI / 2] },
      { geometry: new THREE.CylinderGeometry(0.106, 0.088, 0.36, 12), color: 0x111827, position: [0, -0.19, 0] },
      { geometry: new THREE.TorusGeometry(0.102, 0.016, 8, 16), color: 0x22d3ee, position: [0, -0.19, 0], rotation: [Math.PI / 2, 0, 0] }
    ]);
    hipPivot.add(new THREE.Mesh(thighGeom, matArmorVertex));

    const kneePivot = new THREE.Group();
    kneePivot.position.y = -0.38;
    hipPivot.add(kneePivot);

    const shinGeom = mergeColoredParts([
      { geometry: new THREE.CylinderGeometry(0.09, 0.09, 0.095, 6), color: 0x1f2937, position: [0, 0, 0.038], rotation: [0, 0, Math.PI / 2] },
      { geometry: new THREE.CylinderGeometry(0.084, 0.07, 0.33, 12), color: 0xe2e8f0, position: [0, -0.17, 0] },
      { geometry: new THREE.BoxGeometry(0.145, 0.105, 0.24), color: 0x111827, position: [0, -0.355, 0.04] },
      { geometry: new THREE.BoxGeometry(0.155, 0.03, 0.25), color: 0x38bdf8, position: [0, -0.41, 0.04] }
    ]);
    kneePivot.add(new THREE.Mesh(shinGeom, matArmorVertex));

    const legCable = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.65, 8), matCableCyan);
    legCable.position.set(side * 0.11, -0.34, 0);
    hipPivot.add(legCable);

    return { hipPivot, kneePivot, legCable };
  };

  const leftLeg = createLeg(-1);
  const rightLeg = createLeg(1);

  // ==================== HOVERING MINI-ROBO COMPANION GUIDE ====================
  const showCompanion = options?.showCompanion !== false;
  const companionGroup = new THREE.Group();
  companionGroup.position.set(0.84, 1.9, -0.15);
  if (showCompanion) {
    const botBodyGeom = mergeColoredParts([
      { geometry: new THREE.SphereGeometry(0.22, 16, 12), color: 0xf8fafc },
      { geometry: new THREE.TorusGeometry(0.22, 0.028, 8, 22), color: 0x0ea5e9, rotation: [Math.PI / 2, 0, 0] },
      { geometry: new THREE.CylinderGeometry(0.014, 0.018, 0.14, 8), color: 0x64748b, position: [0, 0.26, 0] },
      { geometry: new THREE.BoxGeometry(0.24, 0.075, 0.12), color: 0x0f172a, position: [0, 0.02, 0.16] }
    ]);
    companionGroup.add(new THREE.Mesh(botBodyGeom, matArmorVertex));

    const botEyesGeom = mergeColoredParts([
      { geometry: new THREE.SphereGeometry(0.03, 10, 10), color: 0x22d3ee, position: [-0.056, 0.025, 0.222] },
      { geometry: new THREE.SphereGeometry(0.03, 10, 10), color: 0x22d3ee, position: [0.056, 0.025, 0.222] },
      { geometry: new THREE.SphereGeometry(0.044, 10, 10), color: 0xfbbf24, position: [0, 0.34, 0] }
    ]);
    companionGroup.add(new THREE.Mesh(botEyesGeom, matRoboBeacon));
    group.add(companionGroup);
  }

  interface GlbRigRefs {
    root: THREE.Group;
    bodyPivot: THREE.Object3D | null;
    baseBodyY: number;
    torsoGroup: THREE.Object3D | null;
    headGroup: THREE.Object3D | null;
    visor: THREE.Object3D | null;
    eclssPack: THREE.Object3D | null;
    thrusterPack: THREE.Object3D | null;
    leftArm: THREE.Object3D | null;
    rightArm: THREE.Object3D | null;
    leftLeg: THREE.Object3D | null;
    rightLeg: THREE.Object3D | null;
    primaryMats: THREE.MeshStandardMaterial[];
    accentMats: THREE.MeshStandardMaterial[];
  }

  let isDisposed = false;
  let glbRefs: GlbRigRefs | null = null;

  void loadCachedGlbClone('/models/astronaut_hero.glb').then((glbRoot) => {
    if (!glbRoot || isDisposed) {
      if (glbRoot) {
        glbRoot.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            obj.geometry?.dispose();
            const ms = Array.isArray(obj.material) ? obj.material : [obj.material];
            ms.forEach((m) => m?.dispose());
          }
        });
      }
      return;
    }

    const primaryMats: THREE.MeshStandardMaterial[] = [];
    const accentMats: THREE.MeshStandardMaterial[] = [];
    glbRoot.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach((m) => {
          if (m instanceof THREE.MeshStandardMaterial) {
            if (m.name === 'suit_theme_primary') primaryMats.push(m);
            else if (m.name === 'suit_theme_accent') accentMats.push(m);
          }
        });
      }
    });

    const bodyNode = glbRoot.getObjectByName('BodyPivot') || null;
    glbRefs = {
      root: glbRoot,
      bodyPivot: bodyNode,
      baseBodyY: bodyNode ? bodyNode.position.y : 0.92,
      torsoGroup: glbRoot.getObjectByName('TorsoGroup') || null,
      headGroup: glbRoot.getObjectByName('HeadGroup') || null,
      visor: glbRoot.getObjectByName('HelmetVisor') || null,
      eclssPack: glbRoot.getObjectByName('BackpackECLSS') || null,
      thrusterPack: glbRoot.getObjectByName('BackpackThruster') || null,
      leftArm: glbRoot.getObjectByName('LeftArmPivot') || null,
      rightArm: glbRoot.getObjectByName('RightArmPivot') || null,
      leftLeg: glbRoot.getObjectByName('LeftLegPivot') || null,
      rightLeg: glbRoot.getObjectByName('RightLegPivot') || null,
      primaryMats,
      accentMats
    };

    if (glbRefs.visor) glbRefs.visor.visible = options?.showEvaHelmet ?? true;
    if (glbRefs.thrusterPack) glbRefs.thrusterPack.visible = false;

    // Remove and dispose fallback procedural body so GPU draw calls stay < 55
    fallbackBodyRoot.visible = false;
    group.remove(fallbackBodyRoot);
    fallbackBodyRoot.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.InstancedMesh) {
        obj.geometry?.dispose();
        const ms = Array.isArray(obj.material) ? obj.material : [obj.material];
        ms.forEach((m) => m?.dispose());
      }
    });

    glbRoot.name = 'BlenderAstronautHero';
    group.add(glbRoot);
    group.userData.glbReady = true;
  });

  const litColor = new THREE.Color(0x22d3ee);
  const greenColor = new THREE.Color(0x4ade80);
  const dimColor = new THREE.Color(0x1e293b);

  const update = ({
    t,
    moveSpeed = 0,
    isRunning = false,
    isJumping = false,
    isZeroG = false,
    isSeated = false,
    suitState,
    highlightModule = null,
    idleSeconds = 0,
    emote = 'none'
  }: {
    t: number;
    moveSpeed?: number;
    isRunning?: boolean;
    isJumping?: boolean;
    isZeroG?: boolean;
    isSeated?: boolean;
    suitState?: SpaceFitXState;
    highlightModule?: number | null;
    idleSeconds?: number;
    emote?: AstronautEmote;
  }) => {
    // 1. Live Astronaut Customizer (EVA Visor vs IVA + 4 Suit Themes + Backpack Style)
    const helmetOn = suitState?.helmetEnabled ?? options?.showEvaHelmet ?? true;
    const packMode = suitState?.backpackStyle ?? 'eclss';
    const themeKey = suitState?.suitTheme ?? 'cyan_black';
    const themeSpec =
      themeKey === 'nasa_white'
        ? { primary: 0xe2e8f0, armor: 0xf1f5f9, accent: 0x3b82f6, emissive: 0x1d4ed8, cable: 0x60a5fa }
        : themeKey === 'gold_emerald'
        ? { primary: 0x065f46, armor: 0xd1fae5, accent: 0xfbbf24, emissive: 0x10b981, cable: 0x34d399 }
        : themeKey === 'mars_crimson'
        ? { primary: 0x881337, armor: 0xffe4e6, accent: 0xf43f5e, emissive: 0xe11d48, cable: 0xfb7185 }
        : { primary: 0x111827, armor: 0xdbeafe, accent: 0x22d3ee, emissive: 0x06b6d4, cable: 0x38bdf8 };

    matRoboBeacon.emissive.setHex(themeSpec.accent);
    matRoboBeacon.emissiveIntensity = 0.75 + 0.55 * Math.sin(t * 4.2);

    // Subtle Squash-and-Stretch Juice on Jump
    const targetSy = isJumping ? rootScale * 1.07 : rootScale * (1 + Math.sin(t * 2.2) * 0.008);
    const targetSxz = isJumping ? rootScale * 0.95 : rootScale;
    group.scale.y += (targetSy - group.scale.y) * 0.2;
    group.scale.x += (targetSxz - group.scale.x) * 0.2;
    group.scale.z += (targetSxz - group.scale.z) * 0.2;

    const isBored = !isJumping && !isZeroG && moveSpeed <= 0.1 && idleSeconds >= 8;
    const sitBlend = isBored ? Math.min(1, (idleSeconds - 8) / 0.55) : 0;

    if (glbRefs) {
      if (glbRefs.visor) glbRefs.visor.visible = helmetOn;
      if (glbRefs.eclssPack) glbRefs.eclssPack.visible = packMode === 'eclss';
      if (glbRefs.thrusterPack) glbRefs.thrusterPack.visible = packMode === 'thruster';

      const released = suitState?.emergencyReleased ?? false;
      const comp = suitState?.compressionLevel || 'medium';
      const glowStrength =
        highlightModule === 1 || highlightModule === 2
          ? 1.9
          : released
          ? 0.25
          : comp === 'high'
          ? 1.5
          : 0.9;

      glbRefs.primaryMats.forEach((m) => {
        m.color.setHex(themeSpec.primary);
      });
      glbRefs.accentMats.forEach((m) => {
        m.color.setHex(released ? 0xf59e0b : themeSpec.accent);
        m.emissive.setHex(released ? 0xd97706 : themeSpec.emissive);
        m.emissiveIntensity = glowStrength;
      });

      const bp = glbRefs.bodyPivot;
      const tr = glbRefs.torsoGroup;
      const hd = glbRefs.headGroup;
      const la = glbRefs.leftArm;
      const ra = glbRefs.rightArm;
      const ll = glbRefs.leftLeg;
      const rl = glbRefs.rightLeg;

      if (ll) ll.visible = !isSeated;
      if (rl) rl.visible = !isSeated;

      if (hd) hd.rotation.set(0, Math.sin(t * 1.1) * 0.08, 0);

      if (isZeroG) {
        if (bp) bp.position.y = glbRefs.baseBodyY + 0.14 + Math.sin(t * 2.0) * 0.1;
        if (tr) tr.rotation.set(Math.sin(t * 1.4) * 0.08 + moveSpeed * 0.03, 0, 0);
        if (la) la.rotation.set(-0.35 + Math.sin(t * 1.8) * 0.25, 0, -0.25);
        if (ra) ra.rotation.set(-0.35 - Math.sin(t * 1.8) * 0.25, 0, 0.25);
        if (ll) ll.rotation.set(Math.sin(t * 1.5) * 0.2, 0, 0);
        if (rl) rl.rotation.set(-Math.sin(t * 1.5) * 0.2, 0, 0);
      } else if (isJumping) {
        if (bp) bp.position.y = glbRefs.baseBodyY + 0.05;
        if (tr) tr.rotation.set(0.12, 0, 0);
        if (la) la.rotation.set(-0.85, 0, -0.35);
        if (ra) ra.rotation.set(-0.85, 0, 0.35);
        if (ll) ll.rotation.set(-0.42, 0, 0);
        if (rl) rl.rotation.set(0.32, 0, 0);
      } else if (moveSpeed > 0.1) {
        const freq = isRunning ? 13 : 8.5;
        const amp = isRunning ? 0.65 : 0.45;
        const swing = Math.sin(t * freq);
        if (bp) bp.position.y = glbRefs.baseBodyY + Math.abs(swing) * 0.06;
        if (tr) tr.rotation.set(isRunning ? 0.16 : 0.08, 0, 0);
        if (la) la.rotation.set(-swing * amp, 0, -0.14);
        if (ra) ra.rotation.set(swing * amp, 0, 0.14);
        if (ll) ll.rotation.set(swing * amp, 0, 0);
        if (rl) rl.rotation.set(-swing * amp, 0, 0);
      } else if (isBored) {
        if (bp) bp.position.y = glbRefs.baseBodyY - sitBlend * 0.48;
        if (tr) tr.rotation.set(sitBlend * 0.12, sitBlend * 0.18, 0);
        if (hd) hd.rotation.set(sitBlend * 0.26 + Math.sin(t * 1.4) * 0.06, -sitBlend * 0.24, 0);
        if (la) la.rotation.set(-0.95 * sitBlend, 0.2 * sitBlend, -0.15);
        if (ra) ra.rotation.set(-0.42 * sitBlend, -0.25 * sitBlend, -0.18 * sitBlend);
        if (ll) ll.rotation.set(-1.26 * sitBlend, 0, 0);
        if (rl) rl.rotation.set(-1.22 * sitBlend, 0, 0);
      } else if (emote === 'celebrate') {
        const hop = Math.abs(Math.sin(t * 7.5)) * 0.22;
        if (bp) bp.position.y = glbRefs.baseBodyY + hop;
        if (tr) tr.rotation.set(-0.08, Math.sin(t * 5) * 0.15, 0);
        if (hd) hd.rotation.x = -0.16;
        if (la) la.rotation.set(-2.25 + Math.sin(t * 8) * 0.25, 0, -0.35);
        if (ra) ra.rotation.set(-2.25 - Math.sin(t * 8) * 0.25, 0, 0.35);
        if (ll) ll.rotation.set(hop * -0.75, 0, 0);
        if (rl) rl.rotation.set(hop * -0.75, 0, 0);
      } else if (emote === 'wave') {
        if (bp) bp.position.y = glbRefs.baseBodyY + Math.sin(t * 2.5) * 0.03;
        if (tr) tr.rotation.set(0, -0.12, 0.05);
        if (hd) hd.rotation.z = -0.09;
        if (la) la.rotation.set(0, 0, -0.18);
        if (ra) ra.rotation.set(-0.25, 0, 2.32 + Math.sin(t * 8.5) * 0.32);
        if (ll) ll.rotation.set(0, 0, 0);
        if (rl) rl.rotation.set(0, 0, 0);
      } else if (emote === 'point') {
        if (bp) bp.position.y = glbRefs.baseBodyY + Math.sin(t * 2.2) * 0.025;
        if (tr) tr.rotation.set(0.05, -0.18, 0);
        if (la) la.rotation.set(0.06, 0, -0.16);
        if (ra) ra.rotation.set(-1.32 + Math.sin(t * 4) * 0.06, 0, 0.14);
        if (ll) ll.rotation.set(0, 0, 0);
        if (rl) rl.rotation.set(0, 0, 0);
      } else {
        if (bp) bp.position.y = glbRefs.baseBodyY + Math.sin(t * 2.2) * 0.025;
        if (tr) tr.rotation.set(0, Math.sin(t * 0.9) * 0.04, 0);
        if (la) la.rotation.set(Math.sin(t * 1.4) * 0.04, 0, -0.16);
        if (ra) ra.rotation.set(-Math.sin(t * 1.4) * 0.04, 0, 0.16);
        if (ll) ll.rotation.set(0, 0, 0);
        if (rl) rl.rotation.set(0, 0, 0);
      }
    } else {
      evaBubble.visible = helmetOn;
      arVisor.visible = !helmetOn;
      eclssPackMesh.visible = packMode === 'eclss';
      thrusterPackMesh.visible = packMode === 'thruster';

      matArmorVertex.color.setHex(themeSpec.armor);
      matCompressionCyan.color.setHex(themeSpec.accent);
      matCompressionCyan.emissive.setHex(themeSpec.emissive);

      // 2. Expressive Facial Animation (blinking + laugh smile)
      const blinkScale = Math.sin(t * 2.15) > 0.965 ? 0.14 : 1;
      eyesGroup.scale.y = blinkScale;

      mouthMesh.scale.set(
        emote === 'celebrate' ? 1.35 : isBored ? 0.72 : 1.0,
        emote === 'celebrate' ? 1.6 : isBored ? 0.45 : 1.0,
        1
      );

      // 3. Locomotion, Emotes & 8s Idle Sit-Down Pose
      leftLeg.hipPivot.visible = !isSeated;
      rightLeg.hipPivot.visible = !isSeated;
      headGroup.rotation.set(0, Math.sin(t * 1.1) * 0.08, 0);

      if (isZeroG) {
        bodyPivot.position.y = 1.16 + Math.sin(t * 2.0) * 0.1;
        torsoGroup.rotation.set(Math.sin(t * 1.4) * 0.08 + moveSpeed * 0.03, 0, 0);
        leftArm.shoulderPivot.rotation.set(-0.35 + Math.sin(t * 1.8) * 0.25, 0, -0.25);
        rightArm.shoulderPivot.rotation.set(-0.35 - Math.sin(t * 1.8) * 0.25, 0, 0.25);
        leftArm.elbowPivot.rotation.x = -0.25;
        rightArm.elbowPivot.rotation.x = -0.25;
        leftLeg.hipPivot.rotation.x = Math.sin(t * 1.5) * 0.2;
        rightLeg.hipPivot.rotation.x = -Math.sin(t * 1.5) * 0.2;
        leftLeg.kneePivot.rotation.x = 0.28;
        rightLeg.kneePivot.rotation.x = 0.18;
      } else if (isJumping) {
        bodyPivot.position.y = 1.06;
        torsoGroup.rotation.set(0.12, 0, 0);
        leftArm.shoulderPivot.rotation.set(-0.8, 0, -0.35);
        rightArm.shoulderPivot.rotation.set(-0.8, 0, 0.35);
        leftArm.elbowPivot.rotation.x = -0.35;
        rightArm.elbowPivot.rotation.x = -0.35;
        leftLeg.hipPivot.rotation.x = -0.45;
        rightLeg.hipPivot.rotation.x = 0.3;
        leftLeg.kneePivot.rotation.x = 0.75;
        rightLeg.kneePivot.rotation.x = 0.45;
      } else if (moveSpeed > 0.1) {
        const freq = isRunning ? 13 : 8.5;
        const amp = isRunning ? 0.65 : 0.45;
        const swing = Math.sin(t * freq);
        bodyPivot.position.y = 1.02 + Math.abs(swing) * 0.06;
        torsoGroup.rotation.set(isRunning ? 0.16 : 0.08, 0, 0);
        leftArm.shoulderPivot.rotation.set(-swing * amp, 0, -0.14);
        rightArm.shoulderPivot.rotation.set(swing * amp, 0, 0.14);
        leftArm.elbowPivot.rotation.x = -0.45;
        rightArm.elbowPivot.rotation.x = -0.45;
        leftLeg.hipPivot.rotation.x = swing * amp;
        rightLeg.hipPivot.rotation.x = -swing * amp;
        leftLeg.kneePivot.rotation.x = Math.max(0, -swing * 0.55);
        rightLeg.kneePivot.rotation.x = Math.max(0, swing * 0.55);
      } else if (isBored) {
        // 8s Idle Boredom: Sit down on the grass, cross/rest right arm, inspect left wrist monitor!
        bodyPivot.position.y = 1.02 - sitBlend * 0.55;
        torsoGroup.rotation.set(sitBlend * 0.12, sitBlend * 0.18, 0);
        headGroup.rotation.set(sitBlend * 0.28 + Math.sin(t * 1.4) * 0.06, -sitBlend * 0.25, 0);

        leftArm.shoulderPivot.rotation.set(-0.92 * sitBlend, 0.2 * sitBlend, -0.15);
        leftArm.elbowPivot.rotation.x = -1.1 * sitBlend;
        rightArm.shoulderPivot.rotation.set(-0.42 * sitBlend, -0.25 * sitBlend, -0.18 * sitBlend);
        rightArm.elbowPivot.rotation.x = -1.05 * sitBlend;

        leftLeg.hipPivot.rotation.x = -1.28 * sitBlend;
        rightLeg.hipPivot.rotation.x = -1.24 * sitBlend;
        leftLeg.kneePivot.rotation.x = 0.28 * sitBlend;
        rightLeg.kneePivot.rotation.x = 0.34 * sitBlend;
      } else if (emote === 'celebrate') {
        const hop = Math.abs(Math.sin(t * 7.5)) * 0.24;
        bodyPivot.position.y = 1.02 + hop;
        torsoGroup.rotation.set(-0.08, Math.sin(t * 5) * 0.15, 0);
        headGroup.rotation.x = -0.16;
        leftArm.shoulderPivot.rotation.set(-2.3 + Math.sin(t * 8) * 0.25, 0, -0.35);
        rightArm.shoulderPivot.rotation.set(-2.3 - Math.sin(t * 8) * 0.25, 0, 0.35);
        leftArm.elbowPivot.rotation.x = -0.3;
        rightArm.elbowPivot.rotation.x = -0.3;
        leftLeg.hipPivot.rotation.x = hop * -0.8;
        rightLeg.hipPivot.rotation.x = hop * -0.8;
        leftLeg.kneePivot.rotation.x = hop * 1.6;
        rightLeg.kneePivot.rotation.x = hop * 1.6;
      } else if (emote === 'wave') {
        bodyPivot.position.y = 1.02 + Math.sin(t * 2.5) * 0.03;
        torsoGroup.rotation.set(0, -0.12, 0.05);
        headGroup.rotation.z = -0.09;
        leftArm.shoulderPivot.rotation.set(0, 0, -0.18);
        leftArm.elbowPivot.rotation.x = -0.2;
        rightArm.shoulderPivot.rotation.set(-0.25, 0, 2.35 + Math.sin(t * 8.5) * 0.32);
        rightArm.elbowPivot.rotation.x = -0.32;
        leftLeg.hipPivot.rotation.x = 0;
        rightLeg.hipPivot.rotation.x = 0;
        leftLeg.kneePivot.rotation.x = 0.04;
        rightLeg.kneePivot.rotation.x = 0.04;
      } else if (emote === 'point') {
        bodyPivot.position.y = 1.02 + Math.sin(t * 2.2) * 0.025;
        torsoGroup.rotation.set(0.05, -0.18, 0);
        leftArm.shoulderPivot.rotation.set(0.06, 0, -0.16);
        rightArm.shoulderPivot.rotation.set(-1.32 + Math.sin(t * 4) * 0.06, 0, 0.14);
        leftArm.elbowPivot.rotation.x = -0.18;
        rightArm.elbowPivot.rotation.x = -0.08;
        leftLeg.hipPivot.rotation.x = 0;
        rightLeg.hipPivot.rotation.x = 0;
      } else {
        bodyPivot.position.y = 1.02 + Math.sin(t * 2.2) * 0.025;
        torsoGroup.rotation.set(0, Math.sin(t * 0.9) * 0.04, 0);
        leftArm.shoulderPivot.rotation.set(Math.sin(t * 1.4) * 0.04, 0, -0.16);
        rightArm.shoulderPivot.rotation.set(-Math.sin(t * 1.4) * 0.04, 0, 0.16);
        leftArm.elbowPivot.rotation.x = -0.18;
        rightArm.elbowPivot.rotation.x = -0.18;
        leftLeg.hipPivot.rotation.x = 0;
        rightLeg.hipPivot.rotation.x = 0;
        leftLeg.kneePivot.rotation.x = 0.04;
        rightLeg.kneePivot.rotation.x = 0.04;
      }

      // 4. Live 7-Module SPACE-FIT X Hardware Telemetry (Fallback Meshes)
      const comp = suitState?.compressionLevel || 'medium';
      matCompressionCyan.emissiveIntensity =
        highlightModule === 1
          ? 1.9
          : comp === 'high'
          ? 1.45
          : comp === 'medium'
          ? 0.9
          : 0.4;

      const released = suitState?.emergencyReleased ?? false;
      const avgRes = suitState
        ? Object.values(suitState.jointLoads).reduce((a, b) => a + b, 0) / 5 / 100
        : 0.55;
      matCableCyan.color.setHex(released ? 0xf59e0b : themeSpec.cable);
      matCableCyan.emissive.setHex(released ? 0xd97706 : themeSpec.emissive);
      matCableCyan.emissiveIntensity = highlightModule === 2 ? 1.85 : released ? 0.25 : 0.45 + avgRes * 1.1;
      const cableScale = released ? 0.5 : 0.85 + avgRes * 0.55;
      [leftArm.armCable, rightArm.armCable, leftLeg.legCable, rightLeg.legCable].forEach((c) => {
        c.scale.x = cableScale;
        c.scale.z = cableScale;
      });

      const impactOn = suitState?.impactProtectionActive ?? true;
      matHexPad.emissiveIntensity = highlightModule === 3 ? 1.4 : impactOn ? 0.16 : 0.0;

      matQuickRelease.emissiveIntensity = highlightModule === 4 || released ? 1.65 : 0.45;

      const hrHz = (suitState?.heartRateBpm || 76) / 60;
      matPhysioLed.emissiveIntensity =
        highlightModule === 5 ? 1.95 : 0.55 + 0.6 * Math.abs(Math.sin(t * hrHz * Math.PI));

      batteryPackGroup.visible = suitState?.batteryAttached ?? true;
      const battPct = suitState?.batteryPercent ?? 94;
      for (let b = 0; b < 4; b++) {
        const lit = battPct >= (b + 1) * 22;
        batteryBarsInst.setColorAt(b, highlightModule === 7 ? greenColor : lit ? litColor : dimColor);
      }
      if (batteryBarsInst.instanceColor) batteryBarsInst.instanceColor.needsUpdate = true;
    }

    // 3. Hovering Mini-Robo Companion Behavior
    if (showCompanion) {
      if (isBored) {
        companionGroup.position.set(
          0.65 - sitBlend * 0.15 + Math.cos(t * 1.5) * 0.08,
          1.28 + Math.sin(t * 2.8) * 0.07,
          0.35 * sitBlend
        );
        companionGroup.rotation.set(0.18, -0.55, Math.sin(t * 2.5) * 0.12);
      } else if (emote === 'celebrate') {
        companionGroup.position.set(Math.cos(t * 4.2) * 0.95, 2.05 + Math.sin(t * 6) * 0.14, Math.sin(t * 4.2) * 0.6);
        companionGroup.rotation.set(0, t * 4.2, 0);
      } else {
        companionGroup.position.set(
          0.84 + Math.cos(t * 1.6) * 0.07,
          1.86 + Math.sin(t * 2.6) * 0.1,
          -0.14 + Math.sin(t * 1.4) * 0.06
        );
        companionGroup.rotation.set(moveSpeed * 0.03, Math.sin(t * 1.2) * 0.18, 0);
      }
    }
  };

  const dispose = () => {
    isDisposed = true;
    disposableTextures.forEach((tex) => tex.dispose());
    group.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.InstancedMesh) {
        obj.geometry?.dispose();
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach((m) => m?.dispose());
      }
    });
  };

  return { group, update, dispose };
}
