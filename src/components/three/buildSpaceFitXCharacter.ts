import * as THREE from 'three';
import { SpaceFitXState } from '../../types/game';
import { mergeColoredParts } from './threeMergeUtils';

export interface SpaceFitXCharacterHandle {
  group: THREE.Group;
  update: (opts: {
    t: number;
    moveSpeed?: number;
    isRunning?: boolean;
    isJumping?: boolean;
    isZeroG?: boolean;
    suitState?: SpaceFitXState;
    highlightModule?: number | null;
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

    // Stylized emblem icon on left
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
    ctx.fillStyle = '#dcdcdc';
    ctx.fillRect(0, 0, 128, 128);
    // Subtle micro hex / carbon-weave grid for PBR surface breakup
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 1.5;
    for (let y = 0; y < 128; y += 16) {
      for (let x = 0; x < 128; x += 16) {
        ctx.strokeRect(x + ((y / 16) % 2) * 8, y, 8, 8);
      }
    }
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    for (let i = 0; i < 160; i++) {
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
 * Builds the articulated 3D Robo-Astronaut wearing the SPACE-FIT X (Prototype 1.0)
 * IVA Countermeasure Suit branded with AstroNutri (no bulky EVA helmet inside IVA).
 * Uses merged vertex-colored assemblies and instanced HUD LEDs so draw calls stay low (< 28).
 */
export function buildSpaceFitXCharacter(options?: {
  showEvaHelmet?: boolean;
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

  // Materials — SPACE-FIT X Studio Palette (Vertex-Colored Armor, Hex-TPU, Electric Cyan)
  const matArmorVertex = new THREE.MeshStandardMaterial({
    vertexColors: true,
    map: weaveTex,
    roughness: 0.38,
    metalness: 0.42
  });
  const matHexPad = new THREE.MeshStandardMaterial({
    color: 0x26344b,
    roughness: 0.46,
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
    emissiveIntensity: 0.78,
    roughness: 0.28,
    metalness: 0.55
  });
  const matQuickRelease = new THREE.MeshStandardMaterial({
    color: 0xf43f5e,
    emissive: 0xe11d48,
    emissiveIntensity: 0.5,
    roughness: 0.3,
    metalness: 0.45
  });
  const matPhysioLed = new THREE.MeshStandardMaterial({
    color: 0x34d399,
    emissive: 0x10b981,
    emissiveIntensity: 1.0,
    roughness: 0.18
  });

  // Ground Shadow Disc
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.58, 24),
    new THREE.MeshBasicMaterial({ color: 0x020617, transparent: true, opacity: 0.38 })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  group.add(shadow);

  // Articulated Skeleton Body Root
  const bodyPivot = new THREE.Group();
  bodyPivot.position.y = 1.03;
  group.add(bodyPivot);

  // Pelvis & Utility Belt Assembly (1 draw call)
  const pelvisGeom = mergeColoredParts([
    { geometry: new THREE.CylinderGeometry(0.24, 0.21, 0.25, 18), color: 0x121b2d, position: [0, -0.18, 0] },
    { geometry: new THREE.BoxGeometry(0.54, 0.11, 0.38), color: 0xdbe5f2, position: [0, -0.11, 0] },
    { geometry: new THREE.BoxGeometry(0.16, 0.08, 0.06), color: 0x22d3ee, position: [0, -0.11, 0.2] }
  ]);
  bodyPivot.add(new THREE.Mesh(pelvisGeom, matArmorVertex));

  // Module 04: Quick-Release Hip Dials + Emergency Pouch merged into 1 draw call
  const quickReleaseGeom = mergeColoredParts([
    { geometry: new THREE.CylinderGeometry(0.085, 0.085, 0.075, 16), color: 0xf43f5e, position: [-0.29, -0.11, 0.04], rotation: [0, 0, Math.PI / 2] },
    { geometry: new THREE.CylinderGeometry(0.085, 0.085, 0.075, 16), color: 0xf43f5e, position: [0.29, -0.11, 0.04], rotation: [0, 0, Math.PI / 2] },
    { geometry: new THREE.BoxGeometry(0.11, 0.18, 0.14), color: 0xe11d48, position: [-0.31, -0.27, 0.02] }
  ]);
  bodyPivot.add(new THREE.Mesh(quickReleaseGeom, matQuickRelease));

  // Torso Assembly (Tapered V-Shaped Hero Silhouette + Metallic Chest Sternum Armor)
  const torsoGroup = new THREE.Group();
  torsoGroup.position.y = 0.12;
  bodyPivot.add(torsoGroup);

  const torsoArmorGeom = mergeColoredParts([
    // Undersuit compression core
    { geometry: new THREE.CylinderGeometry(0.32, 0.22, 0.62, 18), color: 0x1b2436, scale: [1.08, 1, 0.74] },
    // Sculpted silver thoracic chest plate & abdominal flexor plates
    { geometry: new THREE.BoxGeometry(0.58, 0.36, 0.41), color: 0xe2e8f0, position: [0, 0.13, 0.02] },
    { geometry: new THREE.BoxGeometry(0.38, 0.2, 0.36), color: 0xcbd5e1, position: [0, -0.12, 0.02] },
    // Left & right stylized clavicle armor blades
    { geometry: new THREE.BoxGeometry(0.24, 0.09, 0.44), color: 0x94a3b8, position: [-0.22, 0.31, 0], rotation: [0, 0, -0.18] },
    { geometry: new THREE.BoxGeometry(0.24, 0.09, 0.44), color: 0x94a3b8, position: [0.22, 0.31, 0], rotation: [0, 0, 0.18] },
    // Back exo-frame spine bridge
    { geometry: new THREE.BoxGeometry(0.34, 0.44, 0.14), color: 0x1e293b, position: [0, 0.08, -0.18] }
  ]);
  torsoGroup.add(new THREE.Mesh(torsoArmorGeom, matArmorVertex));

  // Front & Back AstroNutri Branded Emblem Plates
  const frontLogoPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(0.38, 0.19),
    new THREE.MeshBasicMaterial({ map: frontBadgeTex })
  );
  frontLogoPlane.position.set(0, 0.15, 0.232);
  torsoGroup.add(frontLogoPlane);

  const backLogoPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(0.36, 0.18),
    new THREE.MeshBasicMaterial({ map: backBadgeTex })
  );
  backLogoPlane.rotation.y = Math.PI;
  backLogoPlane.position.set(0, 0.14, -0.256);
  torsoGroup.add(backLogoPlane);

  // Module 01: Smart Compression Cyan Seams + Collar Halo merged (1 draw call)
  const compTorsoGeom = mergeColoredParts([
    { geometry: new THREE.BoxGeometry(0.042, 0.52, 0.42), color: 0x22d3ee, position: [-0.2, 0.05, 0.01] },
    { geometry: new THREE.BoxGeometry(0.042, 0.52, 0.42), color: 0x22d3ee, position: [0.2, 0.05, 0.01] },
    { geometry: new THREE.TorusGeometry(0.175, 0.034, 10, 24), color: 0x22d3ee, position: [0, 0.35, 0], rotation: [Math.PI / 2, 0, 0] }
  ]);
  torsoGroup.add(new THREE.Mesh(compTorsoGeom, matCompressionCyan));

  // Module 03: Spine Impact Guard Hex-TPU Segments (1 draw call)
  const hexSpineGeom = mergeColoredParts([
    { geometry: new THREE.BoxGeometry(0.16, 0.12, 0.07), color: 0x26344b, position: [0, 0.22, -0.25] },
    { geometry: new THREE.BoxGeometry(0.15, 0.12, 0.07), color: 0x26344b, position: [0, 0.06, -0.25] },
    { geometry: new THREE.BoxGeometry(0.14, 0.12, 0.07), color: 0x26344b, position: [0, -0.1, -0.25] }
  ]);
  torsoGroup.add(new THREE.Mesh(hexSpineGeom, matHexPad));

  // Module 06: Chest Personal Radiation Dosimeter Badge
  const dosimeterBox = new THREE.Mesh(
    new THREE.BoxGeometry(0.13, 0.13, 0.05),
    new THREE.MeshStandardMaterial({ map: dosimeterTex, emissive: 0x1e293b, emissiveIntensity: 0.45 })
  );
  dosimeterBox.position.set(0.17, -0.05, 0.238);
  torsoGroup.add(dosimeterBox);

  // Module 05: Heart/Physio Sensor Node on Chest
  const chestSensor = new THREE.Mesh(new THREE.SphereGeometry(0.044, 12, 12), matPhysioLed);
  chestSensor.position.set(-0.17, -0.05, 0.238);
  torsoGroup.add(chestSensor);

  // Module 07: Rear Waist Removable Power Battery Pack + 4 Instanced Charge LEDs (2 draw calls total!)
  const batteryPackGroup = new THREE.Group();
  batteryPackGroup.position.set(0, -0.14, -0.24);
  bodyPivot.add(batteryPackGroup);

  const batteryHousingGeom = mergeColoredParts([
    { geometry: new THREE.BoxGeometry(0.3, 0.22, 0.12), color: 0xdbe5f2 },
    { geometry: new THREE.BoxGeometry(0.24, 0.14, 0.03), color: 0x0f172a, position: [0, 0, -0.052] }
  ]);
  batteryPackGroup.add(new THREE.Mesh(batteryHousingGeom, matArmorVertex));

  const batteryBarsInst = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.038, 0.11, 0.024),
    new THREE.MeshBasicMaterial({ color: 0xffffff }),
    4
  );
  const barMat4 = new THREE.Matrix4();
  for (let b = 0; b < 4; b++) {
    barMat4.makeTranslation(-0.075 + b * 0.05, 0, -0.068);
    batteryBarsInst.setMatrixAt(b, barMat4);
    batteryBarsInst.setColorAt(b, new THREE.Color(0x22d3ee));
  }
  batteryBarsInst.instanceMatrix.needsUpdate = true;
  if (batteryBarsInst.instanceColor) batteryBarsInst.instanceColor.needsUpdate = true;
  batteryPackGroup.add(batteryBarsInst);

  // Head Group — Expressive Robo-Astronaut IVA Head (Merged Metallic Helmet + Curved Optic Visor + Eyes)
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.47, 0);
  torsoGroup.add(headGroup);

  const headShellGeom = mergeColoredParts([
    { geometry: new THREE.SphereGeometry(0.245, 24, 18), color: 0xe2e8f0, position: [0, 0.12, 0], scale: [1.03, 0.96, 1.0] },
    // Forehead brow rim for expressive silhouette
    { geometry: new THREE.BoxGeometry(0.36, 0.055, 0.2), color: 0x94a3b8, position: [0, 0.22, 0.11] },
    // Chin guard
    { geometry: new THREE.BoxGeometry(0.26, 0.06, 0.16), color: 0x1e293b, position: [0, 0.01, 0.14] },
    // Comms Earpieces
    { geometry: new THREE.CylinderGeometry(0.075, 0.075, 0.055, 16), color: 0x0f172a, position: [-0.255, 0.13, 0], rotation: [0, 0, Math.PI / 2] },
    { geometry: new THREE.CylinderGeometry(0.075, 0.075, 0.055, 16), color: 0x0f172a, position: [0.255, 0.13, 0], rotation: [0, 0, Math.PI / 2] },
    // Micro Comms Antenna
    { geometry: new THREE.CylinderGeometry(0.012, 0.016, 0.18, 8), color: 0x38bdf8, position: [0.265, 0.24, -0.02] }
  ]);
  headGroup.add(new THREE.Mesh(headShellGeom, matArmorVertex));

  // Sleek Curved Optic Visor Faceplate
  const visorFace = new THREE.Mesh(
    new THREE.SphereGeometry(0.215, 22, 16, -Math.PI * 0.36, Math.PI * 0.72, Math.PI * 0.3, Math.PI * 0.36),
    new THREE.MeshStandardMaterial({
      color: 0x071426,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.65,
      roughness: 0.1,
      metalness: 0.85
    })
  );
  visorFace.rotation.y = Math.PI / 2;
  visorFace.position.set(0, 0.12, 0.042);
  headGroup.add(visorFace);

  // Expressive Glowing Optic Eyes + Telemetry Smile Bar (1 draw call)
  const opticEyesMat = new THREE.MeshBasicMaterial({ color: 0x67e8f9 });
  const opticEyesGeom = mergeColoredParts([
    { geometry: new THREE.SphereGeometry(0.036, 12, 10), color: 0x67e8f9, position: [-0.078, 0.135, 0.244], scale: [1.1, 0.85, 0.6] },
    { geometry: new THREE.SphereGeometry(0.036, 12, 10), color: 0x67e8f9, position: [0.078, 0.135, 0.244], scale: [1.1, 0.85, 0.6] },
    { geometry: new THREE.BoxGeometry(0.09, 0.014, 0.015), color: 0x38bdf8, position: [0, 0.078, 0.242] }
  ]);
  const opticEyesMesh = new THREE.Mesh(opticEyesGeom, opticEyesMat);
  headGroup.add(opticEyesMesh);

  // Optional outer EVA bubble helmet (strictly ONLY when explicitly toggled on during outside EVA!)
  if (options?.showEvaHelmet) {
    const evaBubble = new THREE.Mesh(
      new THREE.SphereGeometry(0.34, 24, 18),
      new THREE.MeshStandardMaterial({
        color: 0xe0f2fe,
        transparent: true,
        opacity: 0.28,
        roughness: 0.08,
        metalness: 0.22
      })
    );
    evaBubble.position.y = 0.13;
    headGroup.add(evaBubble);
  }

  // Arms & Resistance Cables (3 draw calls per arm)
  const createArm = (side: -1 | 1) => {
    const shoulderPivot = new THREE.Group();
    shoulderPivot.position.set(side * 0.39, 0.24, 0);
    torsoGroup.add(shoulderPivot);

    const upperArmGeom = mergeColoredParts([
      { geometry: new THREE.SphereGeometry(0.12, 14, 12), color: 0x26344b },
      { geometry: new THREE.CylinderGeometry(0.09, 0.076, 0.34, 14), color: 0x1b2436, position: [0, -0.18, 0] },
      { geometry: new THREE.TorusGeometry(0.086, 0.016, 8, 16), color: 0x22d3ee, position: [0, -0.18, 0], rotation: [Math.PI / 2, 0, 0] }
    ]);
    shoulderPivot.add(new THREE.Mesh(upperArmGeom, matArmorVertex));

    const elbowPivot = new THREE.Group();
    elbowPivot.position.y = -0.36;
    shoulderPivot.add(elbowPivot);

    const forearmGeom = mergeColoredParts([
      { geometry: new THREE.SphereGeometry(0.084, 12, 10), color: 0x26344b },
      { geometry: new THREE.CylinderGeometry(0.076, 0.064, 0.32, 14), color: 0xe2e8f0, position: [0, -0.16, 0] },
      { geometry: new THREE.BoxGeometry(0.115, 0.125, 0.135), color: 0x0f172a, position: [0, -0.35, 0] }
    ]);
    elbowPivot.add(new THREE.Mesh(forearmGeom, matArmorVertex));

    // Module 02: Dynamic Independent Resistance Cable along outer arm
    const armCable = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.62, 8), matCableCyan);
    armCable.position.set(side * 0.1, -0.34, 0);
    shoulderPivot.add(armCable);

    return { shoulderPivot, elbowPivot, armCable };
  };

  const leftArm = createArm(-1);
  const rightArm = createArm(1);

  // Legs & Resistance Cables (3 draw calls per leg)
  const createLeg = (side: -1 | 1) => {
    const hipPivot = new THREE.Group();
    hipPivot.position.set(side * 0.165, -0.22, 0);
    bodyPivot.add(hipPivot);

    const thighGeom = mergeColoredParts([
      { geometry: new THREE.CylinderGeometry(0.066, 0.066, 0.06, 12), color: 0x22d3ee, position: [side * 0.09, 0, 0], rotation: [0, 0, Math.PI / 2] },
      { geometry: new THREE.CylinderGeometry(0.114, 0.092, 0.38, 14), color: 0x1b2436, position: [0, -0.2, 0] },
      { geometry: new THREE.TorusGeometry(0.108, 0.018, 8, 18), color: 0x22d3ee, position: [0, -0.2, 0], rotation: [Math.PI / 2, 0, 0] }
    ]);
    hipPivot.add(new THREE.Mesh(thighGeom, matArmorVertex));

    const kneePivot = new THREE.Group();
    kneePivot.position.y = -0.4;
    hipPivot.add(kneePivot);

    const shinGeom = mergeColoredParts([
      { geometry: new THREE.CylinderGeometry(0.095, 0.095, 0.1, 6), color: 0x26344b, position: [0, 0, 0.04], rotation: [0, 0, Math.PI / 2] },
      { geometry: new THREE.CylinderGeometry(0.088, 0.074, 0.34, 14), color: 0xe2e8f0, position: [0, -0.18, 0] },
      { geometry: new THREE.BoxGeometry(0.155, 0.11, 0.25), color: 0x0f172a, position: [0, -0.37, 0.04] },
      { geometry: new THREE.BoxGeometry(0.165, 0.032, 0.26), color: 0x38bdf8, position: [0, -0.425, 0.04] }
    ]);
    kneePivot.add(new THREE.Mesh(shinGeom, matArmorVertex));

    // Module 02: Dynamic Resistance Cable along outer leg
    const legCable = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.68, 8), matCableCyan);
    legCable.position.set(side * 0.115, -0.36, 0);
    hipPivot.add(legCable);

    return { hipPivot, kneePivot, legCable };
  };

  const leftLeg = createLeg(-1);
  const rightLeg = createLeg(1);

  const litColor = new THREE.Color(0x22d3ee);
  const greenColor = new THREE.Color(0x4ade80);
  const dimColor = new THREE.Color(0x1e293b);

  const update = ({
    t,
    moveSpeed = 0,
    isRunning = false,
    isJumping = false,
    isZeroG = false,
    suitState,
    highlightModule = null
  }: {
    t: number;
    moveSpeed?: number;
    isRunning?: boolean;
    isJumping?: boolean;
    isZeroG?: boolean;
    suitState?: SpaceFitXState;
    highlightModule?: number | null;
  }) => {
    // 1. Locomotion & Zero-G animation
    headGroup.rotation.y = Math.sin(t * 1.1) * 0.08;
    const eyeScaleY = Math.sin(t * 2.3) > 0.97 ? 0.18 : 1;
    opticEyesMesh.scale.y = eyeScaleY;

    if (isZeroG) {
      bodyPivot.position.y = 1.16 + Math.sin(t * 2.0) * 0.1;
      torsoGroup.rotation.x = Math.sin(t * 1.4) * 0.08 + moveSpeed * 0.03;
      leftArm.shoulderPivot.rotation.x = -0.35 + Math.sin(t * 1.8) * 0.25;
      rightArm.shoulderPivot.rotation.x = -0.35 - Math.sin(t * 1.8) * 0.25;
      leftArm.shoulderPivot.rotation.z = -0.25;
      rightArm.shoulderPivot.rotation.z = 0.25;
      leftLeg.hipPivot.rotation.x = Math.sin(t * 1.5) * 0.2;
      rightLeg.hipPivot.rotation.x = -Math.sin(t * 1.5) * 0.2;
      leftLeg.kneePivot.rotation.x = 0.28;
      rightLeg.kneePivot.rotation.x = 0.18;
    } else if (isJumping) {
      bodyPivot.position.y = 1.07;
      torsoGroup.rotation.x = 0.12;
      leftArm.shoulderPivot.rotation.x = -0.8;
      rightArm.shoulderPivot.rotation.x = -0.8;
      leftArm.shoulderPivot.rotation.z = -0.35;
      rightArm.shoulderPivot.rotation.z = 0.35;
      leftLeg.hipPivot.rotation.x = -0.45;
      rightLeg.hipPivot.rotation.x = 0.3;
      leftLeg.kneePivot.rotation.x = 0.75;
      rightLeg.kneePivot.rotation.x = 0.45;
    } else if (moveSpeed > 0.1) {
      const freq = isRunning ? 13 : 8.5;
      const amp = isRunning ? 0.65 : 0.45;
      const swing = Math.sin(t * freq);
      bodyPivot.position.y = 1.03 + Math.abs(swing) * 0.06;
      torsoGroup.rotation.x = isRunning ? 0.16 : 0.08;
      leftArm.shoulderPivot.rotation.x = -swing * amp;
      rightArm.shoulderPivot.rotation.x = swing * amp;
      leftArm.shoulderPivot.rotation.z = -0.14;
      rightArm.shoulderPivot.rotation.z = 0.14;
      leftArm.elbowPivot.rotation.x = -0.45;
      rightArm.elbowPivot.rotation.x = -0.45;
      leftLeg.hipPivot.rotation.x = swing * amp;
      rightLeg.hipPivot.rotation.x = -swing * amp;
      leftLeg.kneePivot.rotation.x = Math.max(0, -swing * 0.55);
      rightLeg.kneePivot.rotation.x = Math.max(0, swing * 0.55);
    } else {
      bodyPivot.position.y = 1.03 + Math.sin(t * 2.2) * 0.025;
      torsoGroup.rotation.x = 0;
      leftArm.shoulderPivot.rotation.x = Math.sin(t * 1.4) * 0.04;
      rightArm.shoulderPivot.rotation.x = -Math.sin(t * 1.4) * 0.04;
      leftArm.shoulderPivot.rotation.z = -0.16;
      rightArm.shoulderPivot.rotation.z = 0.16;
      leftArm.elbowPivot.rotation.x = -0.18;
      rightArm.elbowPivot.rotation.x = -0.18;
      leftLeg.hipPivot.rotation.x = 0;
      rightLeg.hipPivot.rotation.x = 0;
      leftLeg.kneePivot.rotation.x = 0.04;
      rightLeg.kneePivot.rotation.x = 0.04;
    }

    // 2. Live 7-Module Visual Telemetry
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
    matCableCyan.color.setHex(released ? 0xf59e0b : 0x38bdf8);
    matCableCyan.emissive.setHex(released ? 0xd97706 : 0x0284c7);
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
  };

  const dispose = () => {
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
