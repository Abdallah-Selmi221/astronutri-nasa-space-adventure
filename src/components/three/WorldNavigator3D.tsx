import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { CampaignLevelId, CampaignProgressState, SpaceFitXState } from '../../types/game';
import { CAMPAIGN_LEVELS } from '../../data/campaignLevels';
import { soundManager } from '../../utils/sound';
import { CheckCircle2, Lock } from 'lucide-react';
import { AstronautEmote, buildSpaceFitXCharacter } from './buildSpaceFitXCharacter';
import {
  createCosmicSkyBackdrop,
  createFloatingExclamationGeometry,
  createFloatingIslandMesh,
  createFloatingLabelSprite,
  createSleekSpacecraftParts
} from './archipelagoPrimitives';
import {
  attachBlenderEarthIsland,
  attachBlenderSpaceship,
  getLoadedGlbUrls
} from './blenderModelLoader';
import { ColoredGeometryPart, mergeColoredParts } from './threeMergeUtils';
import { ThirdPersonControlsOverlay } from './ThirdPersonControlsOverlay';

interface WorldNavigator3DProps {
  campaign: CampaignProgressState;
  onSelectLevel: (levelId: CampaignLevelId) => void;
  suitState?: SpaceFitXState;
}

const LEVEL_UI_META: Record<CampaignLevelId, { badge: string; shortTitleAr: string }> = {
  1: { badge: '🌍', shortTitleAr: 'الأرض والانطلاق' },
  2: { badge: '🛸', shortTitleAr: 'المدار 0G' },
  3: { badge: '🌙', shortTitleAr: 'مستعمرة القمر' },
  4: { badge: '🪂', shortTitleAr: 'العودة للأرض' }
};

function checkLevelCompleted(campaign: CampaignProgressState, lid: CampaignLevelId): boolean {
  const spec = CAMPAIGN_LEVELS[lid];
  const allGames = spec.miniGames.every((id) => campaign.completedMiniGames.includes(id));
  return lid === 3 ? allGames && campaign.l3ReturnAuthorized : allGames;
}

interface IslandConfig {
  levelId: CampaignLevelId;
  center: THREE.Vector3;
  radius: number;
  topColor: number;
  rimColor: number;
  rockColor: number;
  crystalColor: number;
  accentHex: string;
  accentCraters?: boolean;
}

const ISLAND_CONFIGS: IslandConfig[] = [
  {
    levelId: 1,
    center: new THREE.Vector3(-19.5, 0.0, 1.4),
    radius: 5.7,
    topColor: 0x22c55e,
    rimColor: 0x38bdf8,
    rockColor: 0xb45309,
    crystalColor: 0x22d3ee,
    accentHex: '#38bdf8'
  },
  {
    levelId: 2,
    center: new THREE.Vector3(-6.5, 0.85, -2.2),
    radius: 5.4,
    topColor: 0x1e293b,
    rimColor: 0x818cf8,
    rockColor: 0x334155,
    crystalColor: 0x60a5fa,
    accentHex: '#818cf8'
  },
  {
    levelId: 3,
    center: new THREE.Vector3(6.5, 0.55, 2.0),
    radius: 5.6,
    topColor: 0x64748b,
    rimColor: 0xf59e0b,
    rockColor: 0x475569,
    crystalColor: 0xfbbf24,
    accentHex: '#f59e0b',
    accentCraters: true
  },
  {
    levelId: 4,
    center: new THREE.Vector3(19.5, -0.15, -1.4),
    radius: 5.5,
    topColor: 0x0284c7,
    rimColor: 0x10b981,
    rockColor: 0x0f766e,
    crystalColor: 0x34d399,
    accentHex: '#10b981'
  }
];

function pointToSegmentDistance(
  px: number,
  pz: number,
  ax: number,
  az: number,
  bx: number,
  bz: number
): { dist: number; t: number } {
  const vx = bx - ax;
  const vz = bz - az;
  const lenSq = vx * vx + vz * vz;
  if (lenSq < 1e-6) return { dist: Math.hypot(px - ax, pz - az), t: 0 };
  const t = Math.max(0, Math.min(1, ((px - ax) * vx + (pz - az) * vz) / lenSq));
  const projX = ax + t * vx;
  const projZ = az + t * vz;
  return { dist: Math.hypot(px - projX, pz - projZ), t };
}

function getSurfaceInfoAt(x: number, z: number): {
  supported: boolean;
  groundY: number;
  nearestLevelId: CampaignLevelId;
  nearestCenter: THREE.Vector3;
} {
  let nearestIsland = ISLAND_CONFIGS[0];
  let bestDist = Infinity;

  for (const cfg of ISLAND_CONFIGS) {
    const d = Math.hypot(x - cfg.center.x, z - cfg.center.z);
    if (d < bestDist) {
      bestDist = d;
      nearestIsland = cfg;
    }
    if (d <= cfg.radius - 0.55) {
      return {
        supported: true,
        groundY: cfg.center.y,
        nearestLevelId: cfg.levelId,
        nearestCenter: cfg.center
      };
    }
  }

  // Check sky-bridges between consecutive islands 1<->2, 2<->3, 3<->4
  for (let i = 0; i < ISLAND_CONFIGS.length - 1; i++) {
    const a = ISLAND_CONFIGS[i];
    const b = ISLAND_CONFIGS[i + 1];
    const seg = pointToSegmentDistance(x, z, a.center.x, a.center.z, b.center.x, b.center.z);
    if (seg.dist <= 1.35) {
      const yInterp = a.center.y + (b.center.y - a.center.y) * seg.t;
      return {
        supported: true,
        groundY: yInterp,
        nearestLevelId: seg.t < 0.5 ? a.levelId : b.levelId,
        nearestCenter: seg.t < 0.5 ? a.center : b.center
      };
    }
  }

  return {
    supported: false,
    groundY: nearestIsland.center.y,
    nearestLevelId: nearestIsland.levelId,
    nearestCenter: nearestIsland.center
  };
}

function addIslandLandmarkDecor(
  group: THREE.Group,
  levelId: CampaignLevelId
): {
  animated: { obj: THREE.Object3D; bob: boolean }[];
  fallbackTrees: THREE.Object3D[];
  fallbackRocket: THREE.Object3D | null;
} {
  const animated: { obj: THREE.Object3D; bob: boolean }[] = [];
  const staticParts: ColoredGeometryPart[] = [];
  const fallbackTrees: THREE.Object3D[] = [];
  let fallbackRocket: THREE.Object3D | null = null;

  if (levelId === 1) {
    // Cozy Food Kiosk + Emerald Cliff Waterfall Stream + Radar Mast
    staticParts.push(
      // Mini Low-Poly Food Kiosk Booth
      { geometry: new THREE.BoxGeometry(1.35, 0.48, 0.8), color: 0xb45309, position: [-2.1, 0.24, -1.4] },
      { geometry: new THREE.ConeGeometry(1.12, 0.6, 4), color: 0xf97316, position: [-2.1, 1.38, -1.4], rotation: [0, Math.PI / 4, 0] },
      { geometry: new THREE.CylinderGeometry(0.06, 0.06, 0.85, 6), color: 0x78350f, position: [-2.6, 0.72, -1.4] },
      { geometry: new THREE.CylinderGeometry(0.06, 0.06, 0.85, 6), color: 0x78350f, position: [-1.6, 0.72, -1.4] },
      // Emerald Cliff Waterfall Stream + Sparkling Basin
      { geometry: new THREE.CylinderGeometry(0.85, 0.92, 0.14, 12), color: 0x0ea5e9, position: [2.85, 0.06, 2.35] },
      { geometry: new THREE.BoxGeometry(0.85, 3.2, 0.28), color: 0x38bdf8, position: [3.2, -1.4, 2.75], rotation: [0.18, 0.72, 0] },
      // Radar Base Pedestal
      { geometry: new THREE.CylinderGeometry(0.16, 0.24, 1.35, 8), color: 0xe2e8f0, position: [-2.65, 0.68, 2.1] }
    );

    // Fallback rocket (replaced smoothly when /models/spaceship_craft.glb attaches)
    fallbackRocket = new THREE.Mesh(
      mergeColoredParts(createSleekSpacecraftParts(1.85, 0, -1.65, 0.88)),
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.42, metalness: 0.25 })
    );
    group.add(fallbackRocket);

    // Fallback trees (replaced smoothly when /models/earth_island.glb attaches)
    const treeParts: ColoredGeometryPart[] = [];
    [
      [-2.7, 1.15],
      [2.65, 1.45],
      [-0.6, -2.75]
    ].forEach(([tx, tz]) => {
      treeParts.push(
        { geometry: new THREE.CylinderGeometry(0.11, 0.15, 0.7, 7), color: 0x78350f, position: [tx, 0.35, tz] },
        { geometry: new THREE.ConeGeometry(0.68, 0.96, 7), color: 0x15803d, position: [tx, 0.96, tz] },
        { geometry: new THREE.ConeGeometry(0.52, 0.82, 7), color: 0x22c55e, position: [tx, 1.48, tz] },
        { geometry: new THREE.ConeGeometry(0.36, 0.6, 7), color: 0x4ade80, position: [tx, 1.9, tz] }
      );
    });
    const treeMesh = new THREE.Mesh(
      mergeColoredParts(treeParts),
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.72, flatShading: true })
    );
    group.add(treeMesh);
    fallbackTrees.push(treeMesh);

    // Rotating Deep-Space Radar Dish (stays planted on radar mast: bob = false)
    const dishGeom = mergeColoredParts([
      { geometry: new THREE.ConeGeometry(0.48, 0.22, 12), color: 0xf8fafc, rotation: [0, 0, Math.PI * 0.68] },
      { geometry: new THREE.CylinderGeometry(0.03, 0.03, 0.25, 6), color: 0x22d3ee, position: [0.18, 0.08, 0], rotation: [0, 0, -Math.PI * 0.32] }
    ]);
    const radarDish = new THREE.Mesh(
      dishGeom,
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.45 })
    );
    radarDish.position.set(-2.65, 1.42, 2.1);
    group.add(radarDish);
    animated.push({ obj: radarDish, bob: false });
  } else if (levelId === 2) {
    // Solar Array Wing + Cupola Pod + Orbital Ring + Rotating Asteroid 2010 PK
    staticParts.push(
      { geometry: new THREE.CylinderGeometry(0.16, 0.2, 2.1, 10), color: 0x94a3b8, position: [-2.1, 1.05, -1.8] },
      { geometry: new THREE.BoxGeometry(2.8, 0.08, 1.2), color: 0x0284c7, position: [-2.1, 2.1, -1.8], rotation: [0.35, 0, 0] },
      { geometry: new THREE.CylinderGeometry(0.85, 0.95, 0.75, 8), color: 0xe2e8f0, position: [1.9, 0.38, 1.6] },
      { geometry: new THREE.TorusGeometry(4.35, 0.08, 8, 36), color: 0x818cf8, position: [0, 0.22, 0], rotation: [Math.PI / 2, 0.14, 0] }
    );

    const asteroid = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.75, 0),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, flatShading: true, roughness: 0.9 })
    );
    asteroid.position.set(2.5, 2.35, -1.2);
    group.add(asteroid);
    animated.push({ obj: asteroid, bob: true });
  } else if (levelId === 3) {
    // Lunar Habitat Domes + ECLSS Water Tower + 0.16G Dish Beacon
    staticParts.push(
      { geometry: new THREE.SphereGeometry(0.95, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), color: 0xe2e8f0, position: [-2.0, 0.02, -1.8] },
      { geometry: new THREE.SphereGeometry(0.95, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), color: 0x4ade80, position: [2.0, 0.02, -1.8] },
      { geometry: new THREE.CylinderGeometry(0.28, 0.34, 1.45, 10), color: 0x38bdf8, position: [-2.35, 0.72, 1.7] },
      { geometry: new THREE.SphereGeometry(0.32, 10, 8), color: 0xf8fafc, position: [-2.35, 1.5, 1.7] },
      { geometry: new THREE.ConeGeometry(0.55, 0.38, 12), color: 0xfbbf24, position: [2.2, 1.3, 1.9], rotation: [0, 0, -0.6] }
    );
  } else {
    // Splashdown Capsule + Moored White Oceanic Recovery Ship + Tropical Palm + Floating Golden Victory Crest
    staticParts.push(
      { geometry: new THREE.ConeGeometry(0.75, 1.05, 10), color: 0xf97316, position: [-2.05, 0.52, -1.55] },
      { geometry: new THREE.CylinderGeometry(0.11, 0.16, 1.45, 7), color: 0x92400e, position: [-2.4, 0.72, 1.55], rotation: [0, 0, 0.15] },
      { geometry: new THREE.ConeGeometry(0.85, 0.45, 7), color: 0x22c55e, position: [-2.55, 1.48, 1.55] },
      // Recovery Ship Hull + Bridge
      { geometry: new THREE.BoxGeometry(1.75, 0.34, 0.68), color: 0xf8fafc, position: [1.95, 0.22, 2.05], rotation: [0, -0.45, 0] },
      { geometry: new THREE.BoxGeometry(0.58, 0.42, 0.52), color: 0xf97316, position: [2.15, 0.56, 2.15], rotation: [0, -0.45, 0] }
    );
    const crest = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.75, 0),
      new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xd97706, emissiveIntensity: 0.65, metalness: 0.7 })
    );
    crest.position.set(2.1, 1.75, -1.4);
    group.add(crest);
    animated.push({ obj: crest, bob: true });
  }

  if (staticParts.length > 0) {
    const landmarkMesh = new THREE.Mesh(
      mergeColoredParts(staticParts),
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.25 })
    );
    group.add(landmarkMesh);
  }

  return { animated, fallbackTrees, fallbackRocket };
}

export const WorldNavigator3D: React.FC<WorldNavigator3DProps> = ({
  campaign,
  onSelectLevel,
  suitState
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [webglFailed, setWebglFailed] = useState(false);

  const initialLevel = (campaign.activeLevel || 1) as CampaignLevelId;
  const initialCenter = ISLAND_CONFIGS.find((c) => c.levelId === initialLevel)?.center ?? ISLAND_CONFIGS[0].center;

  const [focusedLevel, setFocusedLevel] = useState<CampaignLevelId>(initialLevel);
  const focusedLevelRef = useRef<CampaignLevelId>(initialLevel);
  const [idleSpeechAr, setIdleSpeechAr] = useState<string | null>(null);

  const playerPosRef = useRef(new THREE.Vector3(initialCenter.x, initialCenter.y, initialCenter.z + 2.2));
  const playerVelYRef = useRef(0);
  const isGroundedRef = useRef(true);
  const walkTargetRef = useRef<THREE.Vector3 | null>(null);
  const joystickVecRef = useRef({ x: 0, z: 0 });
  const isSprintingRef = useRef(false);
  const cameraOrbitYawRef = useRef(0.18);
  const cameraOrbitPitchRef = useRef(0.44);
  const lastActivityMsRef = useRef(performance.now());
  const waveUntilMsRef = useRef(performance.now() + 2600);
  const celebrateUntilMsRef = useRef(0);
  const boredVoiceFiredRef = useRef(false);

  const markPlayerActive = () => {
    lastActivityMsRef.current = performance.now();
    if (boredVoiceFiredRef.current) {
      boredVoiceFiredRef.current = false;
      setIdleSpeechAr(null);
    }
  };

  const suitStateRef = useRef(suitState);
  suitStateRef.current = suitState;

  const onSelectLevelRef = useRef(onSelectLevel);
  onSelectLevelRef.current = onSelectLevel;

  const unlockedSet = new Set(campaign.unlockedLevels);
  const unlockedSetRef = useRef(unlockedSet);
  unlockedSetRef.current = unlockedSet;

  const triggerJump = () => {
    markPlayerActive();
    if (isGroundedRef.current) {
      playerVelYRef.current = 8.4;
      isGroundedRef.current = false;
      soundManager.playClick();
    }
  };

  const handleEnterFocusedIsland = () => {
    markPlayerActive();
    const lid = focusedLevelRef.current;
    if (unlockedSetRef.current.has(lid)) {
      soundManager.playClick();
      onSelectLevelRef.current(lid);
    } else {
      soundManager.playCautionBeep();
    }
  };

  const focusOrOpenLevelPill = (lid: CampaignLevelId) => {
    markPlayerActive();
    const unlocked = unlockedSet.has(lid);
    if (!unlocked) {
      soundManager.playCautionBeep();
      return;
    }
    soundManager.playClick();
    // Direct entry for fast accessibility while also keeping third-person walking
    onSelectLevel(lid);
  };

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    } catch {
      setWebglFailed(true);
      return;
    }

    const getDims = () => ({
      w: Math.max(mount.clientWidth || window.innerWidth, 320),
      h: Math.max(mount.clientHeight || window.innerHeight, 320)
    });

    const dims = getDims();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(dims.w, dims.h);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.innerHTML = '';
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(48, dims.w / dims.h, 0.1, 180);
    camera.position.set(playerPosRef.current.x, playerPosRef.current.y + 6.5, playerPosRef.current.z + 11.5);

    const skyHandle = createCosmicSkyBackdrop(scene, 'sunny');

    // Bright Vibrant Sunlit Studio Lighting (Super Bear Adventure aesthetic)
    const hemi = new THREE.HemisphereLight(0xf0f9ff, 0x9a4618, 1.48);
    scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xfffbeb, 1.9);
    dir.position.set(16, 28, 18);
    scene.add(dir);
    const rim = new THREE.DirectionalLight(0x38bdf8, 0.65);
    rim.position.set(-18, 10, -16);
    scene.add(rim);

    // Build 4 Floating Islands + Instanced Portals + Bouncing Golden ! Markers + In-World Labels
    const disposableTextures: THREE.Texture[] = [];
    const clickTargets: { mesh: THREE.Object3D; levelId: CampaignLevelId }[] = [];
    const floatingProps: { obj: THREE.Object3D; baseY: number; phase: number; bob: boolean }[] = [];
    let isSceneDisposed = false;

    const portalRingsInst = new THREE.InstancedMesh(
      new THREE.TorusGeometry(1.15, 0.15, 12, 28, Math.PI * 1.2),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.45, roughness: 0.25 }),
      ISLAND_CONFIGS.length
    );
    const portalCurtainsInst = new THREE.InstancedMesh(
      new THREE.CircleGeometry(1.05, 22),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.26, side: THREE.DoubleSide }),
      ISLAND_CONFIGS.length
    );
    const exclInst = new THREE.InstancedMesh(
      createFloatingExclamationGeometry(),
      new THREE.MeshStandardMaterial({ vertexColors: true, emissive: 0xf59e0b, emissiveIntensity: 0.55, roughness: 0.25 }),
      ISLAND_CONFIGS.length
    );
    const portalBasePositions: THREE.Vector3[] = [];
    const exclFlags: boolean[] = [];

    ISLAND_CONFIGS.forEach((cfg, idx) => {
      const unlocked = campaign.unlockedLevels.includes(cfg.levelId);
      const completed = checkLevelCompleted(campaign, cfg.levelId);

      const islandGroup = createFloatingIslandMesh({
        radius: cfg.radius,
        depth: 5.2,
        topColor: cfg.topColor,
        rimColor: completed ? 0x10b981 : unlocked ? cfg.rimColor : 0x475569,
        rockColor: cfg.rockColor,
        crystalColor: unlocked ? cfg.crystalColor : 0x475569,
        accentCraters: cfg.accentCraters
      });
      const fallbackBaseTerrain = [...islandGroup.children];
      islandGroup.position.copy(cfg.center);
      scene.add(islandGroup);
      if (Array.isArray(islandGroup.userData.disposableTextures)) {
        disposableTextures.push(...(islandGroup.userData.disposableTextures as THREE.Texture[]));
      }

      // Add landmark buildings / trees / asteroids on island
      const decor = addIslandLandmarkDecor(islandGroup, cfg.levelId);
      decor.animated.forEach((p, pIdx) => {
        floatingProps.push({ obj: p.obj, baseY: p.obj.position.y, phase: idx * 1.4 + pIdx, bob: p.bob });
      });

      if (cfg.levelId === 1) {
        attachBlenderEarthIsland({
          targetParent: islandGroup,
          radius: cfg.radius,
          depthScaleY: 0.72,
          fallbackNodes: [...fallbackBaseTerrain, ...decor.fallbackTrees],
          isDisposed: () => isSceneDisposed
        });
        attachBlenderSpaceship({
          targetParent: islandGroup,
          position: [1.85, 0.02, -1.65],
          rotationY: 0.45,
          scale: 0.86,
          fallbackNodes: decor.fallbackRocket ? [decor.fallbackRocket] : undefined,
          isDisposed: () => isSceneDisposed
        });
      }

      const portalColor = new THREE.Color(completed ? 0x10b981 : unlocked ? cfg.rimColor : 0x64748b);
      portalRingsInst.setColorAt(idx, portalColor);
      portalCurtainsInst.setColorAt(idx, portalColor);
      portalBasePositions.push(new THREE.Vector3(cfg.center.x, cfg.center.y + 1.2, cfg.center.z - 0.4));
      exclFlags.push(unlocked && !completed);

      // In-world Sprite Label cleanly hovering above island (ZERO duplicate prefix!)
      const statusBadge = completed ? '✓' : unlocked ? LEVEL_UI_META[cfg.levelId].badge : '🔒';
      const { sprite, texture } = createFloatingLabelSprite(
        `المستوى ${cfg.levelId} • ${LEVEL_UI_META[cfg.levelId].shortTitleAr}`,
        statusBadge,
        unlocked ? cfg.accentHex : '#64748b',
        completed
      );
      disposableTextures.push(texture);
      sprite.scale.set(5.4, 1.35, 1);
      sprite.position.set(0, 3.65, -0.4);
      islandGroup.add(sprite);

      clickTargets.push({ mesh: islandGroup, levelId: cfg.levelId });
    });

    if (portalRingsInst.instanceColor) portalRingsInst.instanceColor.needsUpdate = true;
    if (portalCurtainsInst.instanceColor) portalCurtainsInst.instanceColor.needsUpdate = true;
    scene.add(portalRingsInst, portalCurtainsInst, exclInst);

    // Glowing Sky-Bridges Connecting Islands 1<->2<->3<->4 Merged into 1 Draw Call!
    const bridgeParts: ColoredGeometryPart[] = [];
    const helperObj = new THREE.Object3D();
    for (let i = 0; i < ISLAND_CONFIGS.length - 1; i++) {
      const a = ISLAND_CONFIGS[i];
      const b = ISLAND_CONFIGS[i + 1];
      const start = new THREE.Vector3(a.center.x, a.center.y, a.center.z);
      const end = new THREE.Vector3(b.center.x, b.center.y, b.center.z);
      const mid = start.clone().add(end).multiplyScalar(0.5);
      const totalDist = start.distanceTo(end);
      const bridgeLen = Math.max(4, totalDist - 3.8);

      helperObj.position.set(mid.x, mid.y - 0.1, mid.z);
      helperObj.lookAt(end.x, end.y - 0.1, end.z);
      const rot: [number, number, number] = [helperObj.rotation.x, helperObj.rotation.y, helperObj.rotation.z];

      bridgeParts.push({
        geometry: new THREE.BoxGeometry(2.2, 0.22, bridgeLen),
        color: 0x0ea5e9,
        position: [mid.x, mid.y - 0.1, mid.z],
        rotation: rot
      });
      [-1.02, 1.02].forEach((rx) => {
        const railWorld = new THREE.Vector3(rx, 0.16, 0).applyEuler(helperObj.rotation).add(helperObj.position);
        bridgeParts.push({
          geometry: new THREE.BoxGeometry(0.08, 0.08, bridgeLen),
          color: 0x7dd3fc,
          position: [railWorld.x, railWorld.y, railWorld.z],
          rotation: rot
        });
      });
    }
    const mergedBridgesMesh = new THREE.Mesh(
      mergeColoredParts(bridgeParts),
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.84,
        roughness: 0.25
      })
    );
    scene.add(mergedBridgesMesh);

    // Third-Person Articulated Robo Astronaut in SPACE-FIT X IVA Suit
    const hero = buildSpaceFitXCharacter();
    hero.group.scale.setScalar(1.05);
    hero.group.position.copy(playerPosRef.current);
    scene.add(hero.group);

    // Keyboard & Orbit Pointer Input
    const keysDown = new Set<string>();
    const onKeyDown = (e: KeyboardEvent) => {
      markPlayerActive();
      const k = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) {
        if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
          if (k === ' ' || k.startsWith('arrow')) e.preventDefault();
        }
      }
      keysDown.add(k);
      if (k === ' ' || e.code === 'Space') triggerJump();
      if (k === 'e' || k === 'enter') handleEnterFocusedIsland();
      if (k === 'shift') isSprintingRef.current = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      keysDown.delete(k);
      if (k === 'shift') isSprintingRef.current = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    let dragOrbiting = false;
    let pointerDownPos = { x: 0, y: 0 };
    let prevPointerPos = { x: 0, y: 0 };

    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();

    const domEl = renderer.domElement;
    const onPointerDown = (e: PointerEvent) => {
      markPlayerActive();
      dragOrbiting = true;
      pointerDownPos = { x: e.clientX, y: e.clientY };
      prevPointerPos = { x: e.clientX, y: e.clientY };
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!dragOrbiting) return;
      const dx = e.clientX - prevPointerPos.x;
      const dy = e.clientY - prevPointerPos.y;
      prevPointerPos = { x: e.clientX, y: e.clientY };
      cameraOrbitYawRef.current -= dx * 0.0065;
      cameraOrbitPitchRef.current = Math.max(0.2, Math.min(0.95, cameraOrbitPitchRef.current + dy * 0.004));
    };
    const onPointerUp = (e: PointerEvent) => {
      if (!dragOrbiting) return;
      dragOrbiting = false;
      const movedDist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      if (movedDist > 7) return; // Drag orbit, not a click

      const rect = domEl.getBoundingClientRect();
      pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointerNdc, camera);

      const hits = raycaster.intersectObjects(
        clickTargets.map((ct) => ct.mesh),
        true
      );
      if (hits.length > 0) {
        const hitObj = hits[0].object;
        const found = clickTargets.find((ct) => {
          let p: THREE.Object3D | null = hitObj;
          while (p) {
            if (p === ct.mesh) return true;
            p = p.parent;
          }
          return false;
        });
        if (found) {
          const cfg = ISLAND_CONFIGS.find((c) => c.levelId === found.levelId);
          if (cfg) {
            if (focusedLevelRef.current === found.levelId && unlockedSetRef.current.has(found.levelId)) {
              soundManager.playClick();
              onSelectLevelRef.current(found.levelId);
            } else {
              walkTargetRef.current = new THREE.Vector3(cfg.center.x, cfg.center.y, cfg.center.z + 1.8);
              soundManager.playClick();
            }
          }
        }
      }
    };

    domEl.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    const handleResize = () => {
      if (!mountRef.current) return;
      const d = getDims();
      camera.aspect = d.w / d.h;
      camera.updateProjectionMatrix();
      renderer.setSize(d.w, d.h);
    };
    window.addEventListener('resize', handleResize);
    const resizeObs = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(handleResize) : null;
    if (resizeObs) resizeObs.observe(mount);

    let rafId = 0;
    const portalDummy = new THREE.Object3D();
    let lastTime = performance.now();
    const startTime = lastTime;

    const animate = (now: number) => {
      rafId = requestAnimationFrame(animate);
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      const elapsed = (now - startTime) / 1000;

      skyHandle.update(elapsed);

      // Gentle cosmic bob on floating props & rotating radar dishes
      floatingProps.forEach((fp) => {
        if (fp.bob) {
          fp.obj.position.y = fp.baseY + Math.sin(elapsed * 1.4 + fp.phase) * 0.14;
        }
        fp.obj.rotation.y = elapsed * (fp.bob ? 0.45 : 0.9) + fp.phase;
      });
      portalBasePositions.forEach((bPos, idx) => {
        portalDummy.position.copy(bPos);
        portalDummy.rotation.set(0, 0, Math.sin(elapsed * 1.2 + idx) * 0.08);
        portalDummy.scale.setScalar(1);
        portalDummy.updateMatrix();
        portalRingsInst.setMatrixAt(idx, portalDummy.matrix);

        portalDummy.rotation.set(0, 0, 0);
        const pulse = 0.92 + Math.sin(elapsed * 2.2 + idx) * 0.08;
        portalDummy.scale.set(pulse, pulse, 1);
        portalDummy.updateMatrix();
        portalCurtainsInst.setMatrixAt(idx, portalDummy.matrix);

        if (exclFlags[idx]) {
          portalDummy.position.set(bPos.x, bPos.y + 1.55 + Math.abs(Math.sin(elapsed * 3.8 + idx)) * 0.28, bPos.z);
          portalDummy.rotation.set(0, elapsed * 1.8 + idx, 0);
          portalDummy.scale.setScalar(1.0);
        } else {
          portalDummy.position.set(bPos.x, -100, bPos.z);
          portalDummy.scale.setScalar(0);
        }
        portalDummy.updateMatrix();
        exclInst.setMatrixAt(idx, portalDummy.matrix);
      });
      portalRingsInst.instanceMatrix.needsUpdate = true;
      portalCurtainsInst.instanceMatrix.needsUpdate = true;
      exclInst.instanceMatrix.needsUpdate = true;

      // Compute Horizontal Movement Relative to Camera Yaw
      let ix = joystickVecRef.current.x;
      let iz = joystickVecRef.current.z;
      if (keysDown.has('a') || keysDown.has('arrowleft')) ix -= 1;
      if (keysDown.has('d') || keysDown.has('arrowright')) ix += 1;
      if (keysDown.has('w') || keysDown.has('arrowup')) iz -= 1;
      if (keysDown.has('s') || keysDown.has('arrowdown')) iz += 1;

      if (Math.abs(ix) > 0.08 || Math.abs(iz) > 0.08) {
        markPlayerActive();
      }

      let moveSpeed = 0;
      const yaw = cameraOrbitYawRef.current;
      const forwardX = -Math.sin(yaw);
      const forwardZ = -Math.cos(yaw);
      const rightX = Math.cos(yaw);
      const rightZ = -Math.sin(yaw);

      const pos = playerPosRef.current;
      const sprint = isSprintingRef.current || keysDown.has('shift');

      if (Math.abs(ix) > 0.08 || Math.abs(iz) > 0.08) {
        walkTargetRef.current = null;
        const len = Math.hypot(ix, iz);
        const nx = ix / len;
        const nz = iz / len;
        const worldDirX = rightX * nx + forwardX * (-nz);
        const worldDirZ = rightZ * nx + forwardZ * (-nz);
        const spd = sprint ? 11.2 : 7.2;

        const nextX = pos.x + worldDirX * spd * dt;
        const nextZ = pos.z + worldDirZ * spd * dt;
        const probe = getSurfaceInfoAt(nextX, nextZ);
        if (probe.supported) {
          pos.x = nextX;
          pos.z = nextZ;
        } else {
          // Gently slide or steer toward nearest supported ground
          const toCenterX = probe.nearestCenter.x - pos.x;
          const toCenterZ = probe.nearestCenter.z - pos.z;
          const d = Math.hypot(toCenterX, toCenterZ) || 1;
          pos.x += (toCenterX / d) * 2.5 * dt;
          pos.z += (toCenterZ / d) * 2.5 * dt;
        }
        moveSpeed = spd;
        hero.group.rotation.y = Math.atan2(worldDirX, worldDirZ);
      } else if (walkTargetRef.current) {
        const dx = walkTargetRef.current.x - pos.x;
        const dz = walkTargetRef.current.z - pos.z;
        const dist = Math.hypot(dx, dz);
        if (dist > 0.35) {
          const spd = 9.0;
          const step = Math.min(dist, spd * dt);
          const nextX = pos.x + (dx / dist) * step;
          const nextZ = pos.z + (dz / dist) * step;
          const probe = getSurfaceInfoAt(nextX, nextZ);
          if (probe.supported) {
            pos.x = nextX;
            pos.z = nextZ;
          } else {
            // Hop straight onto target island if bridge path angled slightly off
            pos.x = nextX;
            pos.z = nextZ;
          }
          moveSpeed = spd;
          hero.group.rotation.y = Math.atan2(dx, dz);
        } else {
          walkTargetRef.current = null;
        }
      }

      // Vertical Jump & Island Surface Elevation
      const surf = getSurfaceInfoAt(pos.x, pos.z);
      const targetGroundY = surf.groundY;
      if (!isGroundedRef.current || pos.y > targetGroundY + 0.02) {
        playerVelYRef.current -= 21 * dt;
        pos.y += playerVelYRef.current * dt;
        if (pos.y <= targetGroundY) {
          pos.y = targetGroundY;
          playerVelYRef.current = 0;
          isGroundedRef.current = true;
        }
      } else {
        pos.y += (targetGroundY - pos.y) * 0.25;
      }

      if (surf.nearestLevelId !== focusedLevelRef.current) {
        focusedLevelRef.current = surf.nearestLevelId;
        setFocusedLevel(surf.nearestLevelId);
      }

      const idleSeconds = (now - lastActivityMsRef.current) / 1000;
      const isBoredIdle =
        idleSeconds >= 8 && isGroundedRef.current && moveSpeed <= 0.1 && !walkTargetRef.current;

      if (isBoredIdle && !boredVoiceFiredRef.current) {
        boredVoiceFiredRef.current = true;
        // 8s idle triggers silent visual speech bubble + animation only (no unprompted passive voice)
        setIdleSpeechAr('يلا يا بطل مستنيينك نكمل مغامرة الفضاء! 🚀');
      }

      const activeEmote: AstronautEmote =
        now < celebrateUntilMsRef.current
          ? 'celebrate'
          : now < waveUntilMsRef.current && moveSpeed <= 0.1
          ? 'wave'
          : 'none';

      hero.group.position.copy(pos);
      hero.update({
        t: elapsed,
        moveSpeed,
        isRunning: sprint && moveSpeed > 0.1,
        isJumping: !isGroundedRef.current,
        suitState: suitStateRef.current,
        idleSeconds,
        emote: activeEmote
      });

      // Smooth Third-Person Follow Camera with Orbit Yaw/Pitch
      const camDist = 11.5;
      const horizDist = camDist * Math.cos(cameraOrbitPitchRef.current);
      const camHeight = 2.4 + camDist * Math.sin(cameraOrbitPitchRef.current);
      const desiredCamX = pos.x + Math.sin(yaw) * horizDist;
      const desiredCamZ = pos.z + Math.cos(yaw) * horizDist;
      const desiredCamY = pos.y + camHeight;

      camera.position.x += (desiredCamX - camera.position.x) * 0.12;
      camera.position.y += (desiredCamY - camera.position.y) * 0.12;
      camera.position.z += (desiredCamZ - camera.position.z) * 0.12;
      camera.lookAt(pos.x, pos.y + 1.55, pos.z);

      renderer.render(scene, camera);
      mount.dataset.drawCalls = String(renderer.info.render.calls);
      mount.dataset.idleBored = isBoredIdle ? 'true' : 'false';
      mount.dataset.idleSeconds = String(Math.floor(idleSeconds));
      mount.dataset.glbLoaded = getLoadedGlbUrls().join(',');
    };

    rafId = requestAnimationFrame(animate);

    return () => {
      isSceneDisposed = true;
      cancelAnimationFrame(rafId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      domEl.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('resize', handleResize);
      if (resizeObs) resizeObs.disconnect();

      skyHandle.dispose();
      hero.dispose();
      disposableTextures.forEach((tex) => tex.dispose());
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.InstancedMesh || obj instanceof THREE.Points) {
          obj.geometry?.dispose();
          const m = obj.material;
          if (Array.isArray(m)) m.forEach((x) => x.dispose());
          else m?.dispose();
        } else if (obj instanceof THREE.Sprite) {
          obj.material.dispose();
        }
      });
      renderer.dispose();
    };
  }, [campaign.completedMiniGames, campaign.l3ReturnAuthorized, campaign.unlockedLevels]);

  if (webglFailed) {
    return (
      <div
        data-testid="world-navigator-3d"
        className="w-full h-full flex items-center justify-center bg-slate-950 p-6"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl w-full" dir="rtl">
          {([1, 2, 3, 4] as CampaignLevelId[]).map((lid) => {
            const spec = CAMPAIGN_LEVELS[lid];
            const meta = LEVEL_UI_META[lid];
            const unlocked = campaign.unlockedLevels.includes(lid);
            const completed = checkLevelCompleted(campaign, lid);
            return (
              <button
                key={lid}
                type="button"
                data-testid={`level-node-${lid}`}
                disabled={!unlocked}
                onClick={() => focusOrOpenLevelPill(lid)}
                className={`p-5 rounded-3xl border-2 text-right transition-all ${
                  unlocked
                    ? 'bg-slate-900/90 border-cyan-400/50 hover:border-cyan-300 cursor-pointer'
                    : 'bg-slate-950/70 border-slate-800 opacity-50 cursor-not-allowed'
                }`}
              >
                <div className="text-3xl mb-2">{meta.badge}</div>
                <div className="font-bold text-white text-base">{spec.titleAr}</div>
                <div className="text-xs text-slate-400 mt-1">{spec.subtitleAr}</div>
                <div className="mt-3 text-xs font-bold text-cyan-300">
                  {completed ? '✅ مكتمل' : unlocked ? '🚀 افتح الجزيرة' : '🔒 مقفل'}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const focusedSpec = CAMPAIGN_LEVELS[focusedLevel];
  const focusedUnlocked = unlockedSet.has(focusedLevel);

  return (
    <div data-testid="world-navigator-3d" className="relative w-full h-full overflow-hidden select-none">
      {/* Full-Viewport 3D WebGL Canvas */}
      <div
        ref={mountRef}
        data-testid="three-canvas-mount"
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* Minimalist Compact Level Hop Pills (Tucked Cleanly at Top-Center Between Corner HUDs) */}
      <div
        dir="rtl"
        className="pointer-events-none fixed top-16 sm:top-3.5 inset-x-0 z-20 flex justify-center px-3"
      >
        <div className="pointer-events-auto inline-flex flex-wrap items-center justify-center gap-1 px-2 py-1 rounded-full bg-slate-950/55 border border-white/30 backdrop-blur-md shadow-lg max-w-full">
          {([1, 2, 3, 4] as CampaignLevelId[]).map((lid) => {
            const meta = LEVEL_UI_META[lid];
            const unlocked = unlockedSet.has(lid);
            const completed = checkLevelCompleted(campaign, lid);
            const isFocused = focusedLevel === lid;
            return (
              <button
                key={lid}
                type="button"
                data-testid={`level-node-${lid}`}
                onClick={() => focusOrOpenLevelPill(lid)}
                className={`px-2.5 py-1 rounded-full border text-[11px] font-hud font-black flex items-center gap-1 transition-all cursor-pointer ${
                  !unlocked
                    ? 'bg-slate-900/55 border-white/15 text-slate-400 opacity-65'
                    : isFocused
                      ? 'bg-amber-400 text-slate-950 border-white shadow-md'
                      : 'bg-slate-900/65 border-white/25 text-white hover:bg-slate-800/80'
                }`}
              >
                <span>{meta.badge}</span>
                <span className="hidden lg:inline">{meta.shortTitleAr}</span>
                <span className="lg:hidden">{lid}</span>
                {completed && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                {!unlocked && <Lock className="w-2.5 h-2.5 text-slate-400" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Playful Speech Bubble when Astronaut gets Bored after 8s Idle */}
      {idleSpeechAr && (
        <div
          dir="rtl"
          data-testid="idle-speech-bubble"
          className="pointer-events-none fixed bottom-32 sm:bottom-24 inset-x-0 z-30 flex justify-center px-4"
        >
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white text-slate-900 border-[3px] border-sky-400 shadow-2xl font-hud font-black text-xs sm:text-sm animate-bounce">
            <img src="/assets/ui/speech_bubble.svg" alt="" className="w-6 h-6 shrink-0" />
            <span>{idleSpeechAr}</span>
          </div>
        </div>
      )}

      {/* Bottom Minimalist Arcade Controls (Left Thumbstick + Right B Interact & A Jump) */}
      <ThirdPersonControlsOverlay
        promptLabelAr={
          focusedUnlocked
            ? `ادخل جزيرة ${focusedLevel}: ${LEVEL_UI_META[focusedLevel].shortTitleAr}`
            : `الجزيرة ${focusedLevel} مقفلة`
        }
        promptSubAr={focusedUnlocked ? focusedSpec.titleAr.split('•')[0] : undefined}
        onInteract={handleEnterFocusedIsland}
        onJoystickMove={(vec) => {
          markPlayerActive();
          joystickVecRef.current = vec;
        }}
        onJump={triggerJump}
        onSprintChange={(s) => {
          markPlayerActive();
          isSprintingRef.current = s;
        }}
        hintAr="WASD / الأسهم للمشي • Space (A) للقفز • E (B) للدخول"
      />
    </div>
  );
};
