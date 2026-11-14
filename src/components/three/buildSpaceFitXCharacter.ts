import * as THREE from 'three';
import { SpaceFitXState } from '../../types/game';

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
    ctx.fillStyle = backVariant ? '#0f172a' : '#1e293b';
    ctx.fillRect(0, 0, 256, 128);

    // Metallic border
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, 240, 112);

    // Stylized mini rocket/leaf icon on left
    ctx.fillStyle = '#22d3ee';
    ctx.beginPath();
    ctx.moveTo(46, 32);
    ctx.lineTo(62, 64);
    ctx.lineTo(46, 88);
    ctx.lineTo(30, 64);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(46, 94, 7, 0, Math.PI * 2);
    ctx.fill();

    // Brand Title: strictly AstroNutri (NEVER HealthyLife)
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 34px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('AstroNutri', 74, 62);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 17px monospace';
    ctx.fillText('SPACE-FIT X v1.0', 74, 92);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function createDosimeterTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 128, 128);
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 8;
    ctx.strokeRect(8, 8, 112, 112);

    // Trefoil radiation indicator icon
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(64, 52, 10, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 3; i++) {
      const angle = (i * Math.PI * 2) / 3 - Math.PI / 2;
      ctx.beginPath();
      ctx.arc(64 + Math.cos(angle) * 24, 52 + Math.sin(angle) * 24, 11, angle - 0.55, angle + 0.55);
      ctx.lineTo(64, 52);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('mSv MON', 64, 106);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

/**
 * Builds the articulated 3D Robo-Astronaut wearing the SPACE-FIT X (Prototype 1.0)
 * IVA Countermeasure Suit branded with AstroNutri (no bulky EVA helmet inside IVA).
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
  disposableTextures.push(frontBadgeTex, backBadgeTex, dosimeterTex);

  // Materials — SPACE-FIT X Palette (Matte Black, Dark Graphite, Metallic Silver, Electric Cyan)
  const matGraphite = new THREE.MeshStandardMaterial({ color: 0x1e2533, roughness: 0.62, metalness: 0.25 });
  const matMatteBlack = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.52, metalness: 0.35 });
  const matSilverArmor = new THREE.MeshStandardMaterial({ color: 0xd1dae6, roughness: 0.26, metalness: 0.68 });
  const matHexPad = new THREE.MeshStandardMaterial({
    color: 0x263145,
    roughness: 0.48,
    metalness: 0.32,
    emissive: 0x0ea5e9,
    emissiveIntensity: 0.08
  });
  const matCompressionCyan = new THREE.MeshStandardMaterial({
    color: 0x22d3ee,
    emissive: 0x06b6d4,
    emissiveIntensity: 0.85,
    roughness: 0.25,
    metalness: 0.4
  });
  const matCableCyan = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.7,
    roughness: 0.3,
    metalness: 0.5
  });
  const matQuickRelease = new THREE.MeshStandardMaterial({
    color: 0xf43f5e,
    emissive: 0xe11d48,
    emissiveIntensity: 0.45,
    roughness: 0.35,
    metalness: 0.4
  });
  const matPhysioLed = new THREE.MeshStandardMaterial({
    color: 0x34d399,
    emissive: 0x10b981,
    emissiveIntensity: 0.9,
    roughness: 0.2
  });

  // Shadow Disc
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.56, 24),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.36 })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  group.add(shadow);

  // Articulated Skeleton Body Root
  const bodyPivot = new THREE.Group();
  bodyPivot.position.y = 1.02;
  group.add(bodyPivot);

  // Pelvis & Quick-Release Harness
  const pelvis = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.22, 0.24, 16), matMatteBlack);
  pelvis.position.y = -0.18;
  bodyPivot.add(pelvis);

  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.11, 0.38), matSilverArmor);
  belt.position.y = -0.12;
  bodyPivot.add(belt);

  // Module 04: Quick-Release Hip Winches + Medical Aid Pouch
  const quickReleaseMeshes: THREE.Mesh[] = [];
  [-0.29, 0.29].forEach((hx) => {
    const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.07, 16), matQuickRelease);
    dial.rotation.z = Math.PI / 2;
    dial.position.set(hx, -0.12, 0.04);
    bodyPivot.add(dial);
    quickReleaseMeshes.push(dial);
  });
  const medPouch = new THREE.Mesh(
    new THREE.BoxGeometry(0.11, 0.18, 0.14),
    new THREE.MeshStandardMaterial({ color: 0xe11d48, roughness: 0.4 })
  );
  medPouch.position.set(-0.31, -0.28, 0.02);
  bodyPivot.add(medPouch);
  quickReleaseMeshes.push(medPouch);

  // Spine & Torso Group
  const torsoGroup = new THREE.Group();
  torsoGroup.position.y = 0.12;
  bodyPivot.add(torsoGroup);

  const torsoCore = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.24, 0.62, 18), matGraphite);
  torsoCore.scale.set(1.06, 1, 0.74);
  torsoGroup.add(torsoCore);

  // Metallic Silver Chest & Upper-Back Exo-Plate
  const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.44, 0.42), matSilverArmor);
  chestPlate.position.set(0, 0.09, 0.02);
  torsoGroup.add(chestPlate);

  // Front & Back AstroNutri Branded Emblem Plates
  const frontLogoPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(0.38, 0.19),
    new THREE.MeshBasicMaterial({ map: frontBadgeTex })
  );
  frontLogoPlane.position.set(0, 0.13, 0.236);
  torsoGroup.add(frontLogoPlane);

  const backLogoPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(0.38, 0.19),
    new THREE.MeshBasicMaterial({ map: backBadgeTex })
  );
  backLogoPlane.rotation.y = Math.PI;
  backLogoPlane.position.set(0, 0.14, -0.2);
  torsoGroup.add(backLogoPlane);

  // Module 01: Smart Compression Cyan Seams on Torso
  const compressionMeshes: THREE.Mesh[] = [];
  [-0.19, 0.19].forEach((sx) => {
    const seam = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.5, 0.41), matCompressionCyan);
    seam.position.set(sx, 0.04, 0.01);
    torsoGroup.add(seam);
    compressionMeshes.push(seam);
  });

  // Module 03: Spine Impact Guard (Hex-TPU segments on back)
  const spinePad = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.42, 0.09), matHexPad);
  spinePad.position.set(0, 0.05, -0.22);
  torsoGroup.add(spinePad);

  // Module 06: Chest Personal Radiation Dosimeter Badge
  const dosimeterBox = new THREE.Mesh(
    new THREE.BoxGeometry(0.13, 0.13, 0.05),
    new THREE.MeshStandardMaterial({ map: dosimeterTex, emissive: 0x1e293b, emissiveIntensity: 0.4 })
  );
  dosimeterBox.position.set(0.16, -0.05, 0.24);
  torsoGroup.add(dosimeterBox);

  // Module 05: Heart/Physio Sensor Node on Chest & Wrist
  const chestSensor = new THREE.Mesh(new THREE.SphereGeometry(0.042, 12, 12), matPhysioLed);
  chestSensor.position.set(-0.16, -0.05, 0.24);
  torsoGroup.add(chestSensor);

  // Module 07: Rear Waist Removable Power Battery Pack + 4 Charge Bars
  const batteryPackGroup = new THREE.Group();
  batteryPackGroup.position.set(0, -0.14, -0.23);
  bodyPivot.add(batteryPackGroup);

  const batteryHousing = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.2, 0.12), matSilverArmor);
  batteryPackGroup.add(batteryHousing);

  const batteryBars: THREE.Mesh[] = [];
  for (let b = 0; b < 4; b++) {
    const barMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee });
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.11, 0.025), barMat);
    bar.position.set(-0.075 + b * 0.05, 0, -0.062);
    batteryPackGroup.add(bar);
    batteryBars.push(bar);
  }

  // Head Group — NO bulky EVA helmet inside IVA! Clean robotic-astronaut head + optic visor + comms earcups
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.46, 0);
  torsoGroup.add(headGroup);

  const collarRing = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.035, 10, 24), matCompressionCyan);
  collarRing.rotation.x = Math.PI / 2;
  collarRing.position.y = -0.11;
  headGroup.add(collarRing);
  compressionMeshes.push(collarRing);

  const headShell = new THREE.Mesh(new THREE.SphereGeometry(0.24, 24, 18), matSilverArmor);
  headShell.scale.set(1.02, 0.96, 1.0);
  headShell.position.y = 0.12;
  headGroup.add(headShell);

  const visorFace = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 0.16, 0.15),
    new THREE.MeshStandardMaterial({ color: 0x091529, emissive: 0x0ea5e9, emissiveIntensity: 0.72, roughness: 0.15 })
  );
  visorFace.position.set(0, 0.12, 0.18);
  headGroup.add(visorFace);

  [-0.08, 0.08].forEach((ex) => {
    const eye = new THREE.Mesh(
      new THREE.SphereGeometry(0.034, 10, 10),
      new THREE.MeshBasicMaterial({ color: 0x67e8f9 })
    );
    eye.position.set(ex, 0.13, 0.252);
    headGroup.add(eye);
  });

  // Sleek Comms Earpieces
  [-0.25, 0.25].forEach((cx) => {
    const ear = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.05, 14), matMatteBlack);
    ear.rotation.z = Math.PI / 2;
    ear.position.set(cx, 0.13, 0);
    headGroup.add(ear);
  });

  // Optional outer EVA bubble helmet (strictly ONLY when explicitly toggled on during outside EVA!)
  if (options?.showEvaHelmet) {
    const evaBubble = new THREE.Mesh(
      new THREE.SphereGeometry(0.34, 24, 18),
      new THREE.MeshStandardMaterial({
        color: 0xe0f2fe,
        transparent: true,
        opacity: 0.28,
        roughness: 0.1,
        metalness: 0.2
      })
    );
    evaBubble.position.y = 0.13;
    headGroup.add(evaBubble);
  }

  // Arms & Resistance Cables
  const createArm = (side: -1 | 1) => {
    const shoulderPivot = new THREE.Group();
    shoulderPivot.position.set(side * 0.38, 0.24, 0);
    torsoGroup.add(shoulderPivot);

    const shoulderPad = new THREE.Mesh(new THREE.SphereGeometry(0.115, 14, 12), matHexPad);
    shoulderPivot.add(shoulderPad);

    const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.075, 0.34, 12), matGraphite);
    upperArm.position.y = -0.18;
    shoulderPivot.add(upperArm);

    const armCompBand = new THREE.Mesh(new THREE.TorusGeometry(0.082, 0.015, 8, 16), matCompressionCyan);
    armCompBand.rotation.x = Math.PI / 2;
    armCompBand.position.y = -0.18;
    shoulderPivot.add(armCompBand);
    compressionMeshes.push(armCompBand);

    const elbowPivot = new THREE.Group();
    elbowPivot.position.y = -0.36;
    shoulderPivot.add(elbowPivot);

    const elbowPad = new THREE.Mesh(new THREE.SphereGeometry(0.082, 12, 10), matHexPad);
    elbowPivot.add(elbowPad);

    const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.062, 0.32, 12), matSilverArmor);
    forearm.position.y = -0.16;
    elbowPivot.add(forearm);

    const glove = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.12, 0.13), matMatteBlack);
    glove.position.y = -0.35;
    elbowPivot.add(glove);

    // Resistance cable along outer arm
    const armCable = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.62, 8), matCableCyan);
    armCable.position.set(side * 0.095, -0.34, 0);
    shoulderPivot.add(armCable);

    return { shoulderPivot, elbowPivot, armCable };
  };

  const leftArm = createArm(-1);
  const rightArm = createArm(1);

  // Legs & Resistance Cables
  const createLeg = (side: -1 | 1) => {
    const hipPivot = new THREE.Group();
    hipPivot.position.set(side * 0.16, -0.22, 0);
    bodyPivot.add(hipPivot);

    const hipSpool = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.06, 12), matCompressionCyan);
    hipSpool.rotation.z = Math.PI / 2;
    hipSpool.position.x = side * 0.09;
    hipPivot.add(hipSpool);

    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.38, 14), matGraphite);
    thigh.position.y = -0.2;
    hipPivot.add(thigh);

    const thighBand = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.018, 8, 18), matCompressionCyan);
    thighBand.rotation.x = Math.PI / 2;
    thighBand.position.y = -0.2;
    hipPivot.add(thighBand);
    compressionMeshes.push(thighBand);

    const kneePivot = new THREE.Group();
    kneePivot.position.y = -0.4;
    hipPivot.add(kneePivot);

    const kneePad = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.1, 6), matHexPad);
    kneePad.rotation.z = Math.PI / 2;
    kneePad.position.set(0, 0, 0.04);
    kneePivot.add(kneePad);

    const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.072, 0.34, 14), matSilverArmor);
    shin.position.y = -0.18;
    kneePivot.add(shin);

    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.11, 0.24), matMatteBlack);
    boot.position.set(0, -0.37, 0.04);
    kneePivot.add(boot);

    // Resistance cable along outer leg
    const legCable = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.68, 8), matCableCyan);
    legCable.position.set(side * 0.11, -0.36, 0);
    hipPivot.add(legCable);

    return { hipPivot, kneePivot, legCable };
  };

  const leftLeg = createLeg(-1);
  const rightLeg = createLeg(1);

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
    if (isZeroG) {
      bodyPivot.position.y = 1.15 + Math.sin(t * 2.0) * 0.1;
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
      bodyPivot.position.y = 1.06;
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
      bodyPivot.position.y = 1.02 + Math.abs(swing) * 0.06;
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
      bodyPivot.position.y = 1.02 + Math.sin(t * 2.2) * 0.025;
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
        ? 0.85
        : 0.4;

    const released = suitState?.emergencyReleased ?? false;
    const avgRes = suitState
      ? (Object.values(suitState.jointLoads).reduce((a, b) => a + b, 0) / 5) / 100
      : 0.55;
    matCableCyan.color.setHex(released ? 0xf59e0b : 0x38bdf8);
    matCableCyan.emissive.setHex(released ? 0xd97706 : 0x0284c7);
    matCableCyan.emissiveIntensity = highlightModule === 2 ? 1.8 : released ? 0.25 : 0.4 + avgRes * 1.1;
    const cableScale = released ? 0.5 : 0.85 + avgRes * 0.55;
    [leftArm.armCable, rightArm.armCable, leftLeg.legCable, rightLeg.legCable].forEach((c) => {
      c.scale.x = cableScale;
      c.scale.z = cableScale;
    });

    const impactOn = suitState?.impactProtectionActive ?? true;
    matHexPad.emissiveIntensity = highlightModule === 3 ? 1.35 : impactOn ? 0.14 : 0.0;

    matQuickRelease.emissiveIntensity = highlightModule === 4 || released ? 1.6 : 0.4;

    const hrHz = (suitState?.heartRateBpm || 76) / 60;
    matPhysioLed.emissiveIntensity = highlightModule === 5 ? 1.9 : 0.5 + 0.6 * Math.abs(Math.sin(t * hrHz * Math.PI));

    batteryPackGroup.visible = suitState?.batteryAttached ?? true;
    const battPct = suitState?.batteryPercent ?? 94;
    batteryBars.forEach((bar, idx) => {
      const lit = battPct >= (idx + 1) * 22;
      (bar.material as THREE.MeshBasicMaterial).color.setHex(
        highlightModule === 7 ? 0x4ade80 : lit ? 0x22d3ee : 0x1e293b
      );
    });
  };

  const dispose = () => {
    disposableTextures.forEach((tex) => tex.dispose());
    group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry?.dispose();
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach((m) => m?.dispose());
      }
    });
  };

  return { group, update, dispose };
}
