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
  createSleekSpacecraftParts,
  SkyMode
} from './archipelagoPrimitives';
import {
  animateBlenderEnvironmentGlb,
  attachBlenderEarthIsland,
  attachBlenderLunarIsland,
  attachBlenderOrbitalStation,
  attachBlenderPlanetsFromPack,
  attachBlenderSpaceship,
  getLoadedGlbUrls
} from './blenderModelLoader';
import { ColoredGeometryPart, mergeColoredParts } from './threeMergeUtils';
import {
  createDustPuffSystem,
  createFloorGuideArrowSystem,
  lerpAngle,
  stepSmoothHorizontalVelocity
} from './thirdPersonPhysics';
import { ThirdPersonControlsOverlay } from './ThirdPersonControlsOverlay';
import { useGameState } from '../../context/GameContext';
import { LEVEL_TITLES_BILINGUAL } from '../../data/campaignBilingual';
import { tr } from '../../utils/i18n';

interface WorldNavigator3DProps {
  campaign: CampaignProgressState;
  onSelectLevel: (levelId: CampaignLevelId) => void;
  suitState?: SpaceFitXState;
}

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
  fallbackNodes: THREE.Object3D[];
  fallbackRocket: THREE.Object3D | null;
} {
  const animated: { obj: THREE.Object3D; bob: boolean }[] = [];
  const staticParts: ColoredGeometryPart[] = [];
  const fallbackNodes: THREE.Object3D[] = [];
  let fallbackRocket: THREE.Object3D | null = null;

  if (levelId === 1) {
    // Cozy Food Kiosk + Radar Mast (Waterfall moved into fallback so earth_island.glb OasisWaterPond replaces it cleanly)
    staticParts.push(
      { geometry: new THREE.BoxGeometry(1.35, 0.48, 0.8), color: 0xb45309, position: [-2.1, 0.24, -1.4] },
      { geometry: new THREE.ConeGeometry(1.12, 0.6, 4), color: 0xf97316, position: [-2.1, 1.38, -1.4], rotation: [0, Math.PI / 4, 0] },
      { geometry: new THREE.CylinderGeometry(0.06, 0.06, 0.85, 6), color: 0x78350f, position: [-2.6, 0.72, -1.4] },
      { geometry: new THREE.CylinderGeometry(0.06, 0.06, 0.85, 6), color: 0x78350f, position: [-1.6, 0.72, -1.4] },
      { geometry: new THREE.CylinderGeometry(0.16, 0.24, 1.35, 8), color: 0xe2e8f0, position: [-2.65, 0.68, 2.1] }
    );

    const fallbackWaterfallMesh = new THREE.Mesh(
      mergeColoredParts([
        { geometry: new THREE.CylinderGeometry(0.85, 0.92, 0.14, 12), color: 0x0ea5e9, position: [2.85, 0.06, 2.35] },
        { geometry: new THREE.BoxGeometry(0.85, 3.2, 0.28), color: 0x38bdf8, position: [3.2, -1.4, 2.75], rotation: [0.18, 0.72, 0] }
      ]),
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35 })
    );
    group.add(fallbackWaterfallMesh);
    fallbackNodes.push(fallbackWaterfallMesh);

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
    fallbackNodes.push(treeMesh);

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
    // Fallback Orbital decor (replaced cleanly when /models/orbital_station.glb attaches)
    const orbFallback = new THREE.Mesh(
      mergeColoredParts([
        { geometry: new THREE.CylinderGeometry(0.16, 0.2, 2.1, 10), color: 0x94a3b8, position: [-2.1, 1.05, -1.8] },
        { geometry: new THREE.BoxGeometry(2.8, 0.08, 1.2), color: 0x0284c7, position: [-2.1, 2.1, -1.8], rotation: [0.35, 0, 0] },
        { geometry: new THREE.CylinderGeometry(0.85, 0.95, 0.75, 8), color: 0xe2e8f0, position: [1.9, 0.38, 1.6] },
        { geometry: new THREE.TorusGeometry(4.35, 0.08, 8, 36), color: 0x818cf8, position: [0, 0.22, 0], rotation: [Math.PI / 2, 0.14, 0] }
      ]),
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.25 })
    );
    group.add(orbFallback);
    fallbackNodes.push(orbFallback);

    const asteroid = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.75, 0),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, flatShading: true, roughness: 0.9 })
    );
    asteroid.position.set(2.5, 2.35, -1.2);
    group.add(asteroid);
    fallbackNodes.push(asteroid);
    animated.push({ obj: asteroid, bob: true });
  } else if (levelId === 3) {
    // Fallback Lunar decor (replaced cleanly when /models/lunar_island.glb attaches)
    const lunarFallback = new THREE.Mesh(
      mergeColoredParts([
        { geometry: new THREE.SphereGeometry(0.95, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), color: 0xe2e8f0, position: [-2.0, 0.02, -1.8] },
        { geometry: new THREE.SphereGeometry(0.95, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), color: 0x4ade80, position: [2.0, 0.02, -1.8] },
        { geometry: new THREE.CylinderGeometry(0.28, 0.34, 1.45, 10), color: 0x38bdf8, position: [-2.35, 0.72, 1.7] },
        { geometry: new THREE.SphereGeometry(0.32, 10, 8), color: 0xf8fafc, position: [-2.35, 1.5, 1.7] },
        { geometry: new THREE.ConeGeometry(0.55, 0.38, 12), color: 0xfbbf24, position: [2.2, 1.3, 1.9], rotation: [0, 0, -0.6] }
      ]),
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.25 })
    );
    group.add(lunarFallback);
    fallbackNodes.push(lunarFallback);
  } else {
    // Splashdown Capsule + Moored White Oceanic Recovery Ship + Tropical Palm + Floating Golden Victory Crest
    staticParts.push(
      { geometry: new THREE.ConeGeometry(0.75, 1.05, 10), color: 0xf97316, position: [-2.05, 0.52, -1.55] },
      { geometry: new THREE.CylinderGeometry(0.11, 0.16, 1.45, 7), color: 0x92400e, position: [-2.4, 0.72, 1.55], rotation: [0, 0, 0.15] },
      { geometry: new THREE.ConeGeometry(0.85, 0.45, 7), color: 0x22c55e, position: [-2.55, 1.48, 1.55] },
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

  return { animated, fallbackNodes, fallbackRocket };
}

export const WorldNavigator3D: React.FC<WorldNavigator3DProps> = ({
  campaign,
  onSelectLevel,
  suitState
}) => {
  const { language } = useGameState();
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [webglFailed, setWebglFailed] = useState(false);

  const initialLevel = (campaign.activeLevel || 1) as CampaignLevelId;
  const initialCenter = ISLAND_CONFIGS.find((c) => c.levelId === initialLevel)?.center ?? ISLAND_CONFIGS[0].center;

  const [focusedLevel, setFocusedLevel] = useState<CampaignLevelId>(initialLevel);
  const focusedLevelRef = useRef<CampaignLevelId>(initialLevel);
  const [idleSpeechAr, setIdleSpeechAr] = useState<string | null>(null);
  const [isFlightMode, setIsFlightMode] = useState(false);
  const isFlightModeRef = useRef(false);
  const [activeBiomeAr, setActiveBiomeAr] = useState<string>(
    tr(language, '1.0G 🌍 Earth', '1.0G 🌍 الأرض')
  );
  const activeBiomeRef = useRef<string>('earth');

  const playerPosRef = useRef(new THREE.Vector3(initialCenter.x, initialCenter.y, initialCenter.z + 2.2));
  const playerVelYRef = useRef(0);
  const horizVelRef = useRef({ x: 0, z: 0 });
  const isGroundedRef = useRef(true);
  const lastGroundedMsRef = useRef(performance.now());
  const sprintDustTimerRef = useRef(0);
  const walkTargetRef = useRef<THREE.Vector3 | null>(null);
  const pendingLevelRef = useRef<CampaignLevelId | null>(null);
  const joystickVecRef = useRef({ x: 0, z: 0 });
  const isSprintingRef = useRef(false);
  const toggleFlightRef = useRef<() => void>(() => {});
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

  const activeTargetLevelId =
    ([1, 2, 3, 4] as CampaignLevelId[]).find(
      (lid) => unlockedSet.has(lid) && !checkLevelCompleted(campaign, lid)
    ) ??
    (([...campaign.unlockedLevels].sort((a, b) => b - a)[0] || 1) as CampaignLevelId);
  const activeTargetIslandCfg =
    ISLAND_CONFIGS.find((c) => c.levelId === activeTargetLevelId) ?? ISLAND_CONFIGS[0];

  const handleWalkToNextIsland = () => {
    markPlayerActive();
    soundManager.playClick();
    if (isFlightModeRef.current || !unlockedSet.has(activeTargetLevelId)) {
      if (unlockedSet.has(activeTargetLevelId)) {
        onSelectLevelRef.current(activeTargetLevelId);
      }
      return;
    }
    const targetPt = new THREE.Vector3(
      activeTargetIslandCfg.center.x,
      activeTargetIslandCfg.center.y,
      activeTargetIslandCfg.center.z + 1.6
    );
    if (playerPosRef.current.distanceTo(targetPt) < 2.4) {
      onSelectLevelRef.current(activeTargetLevelId);
    } else {
      walkTargetRef.current = targetPt;
      pendingLevelRef.current = activeTargetLevelId;
    }
  };

  const currentGravityRef = useRef<{ gravity: number; jumpVel: number; dustColor: number }>({
    gravity: 21,
    jumpVel: 8.4,
    dustColor: 0xfef3c7
  });

  const triggerJump = () => {
    markPlayerActive();
    if (isFlightModeRef.current) {
      playerVelYRef.current = 7.4;
      isGroundedRef.current = false;
      soundManager.playClick();
      return;
    }
    const withinCoyote = performance.now() - lastGroundedMsRef.current <= 130;
    if (isGroundedRef.current || withinCoyote) {
      playerVelYRef.current = currentGravityRef.current.jumpVel;
      isGroundedRef.current = false;
      soundManager.playClick();
    }
  };

  const toggleFlight = () => {
    markPlayerActive();
    toggleFlightRef.current();
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
    const animatedGlbRoots: THREE.Object3D[] = [];
    const planetSpinNodes: { obj: THREE.Object3D; speed: number; baseY: number; phase: number }[] = [];
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
          fallbackNodes: [...fallbackBaseTerrain, ...decor.fallbackNodes],
          isDisposed: () => isSceneDisposed,
          onLoaded: (g) => {
            animatedGlbRoots.push(g);
          }
        });
        attachBlenderSpaceship({
          targetParent: islandGroup,
          position: [1.85, 0.02, -1.65],
          rotationY: 0.45,
          scale: 0.86,
          fallbackNodes: decor.fallbackRocket ? [decor.fallbackRocket] : undefined,
          isDisposed: () => isSceneDisposed
        });
      } else if (cfg.levelId === 2) {
        attachBlenderOrbitalStation({
          targetParent: islandGroup,
          radius: cfg.radius,
          depthScaleY: 0.72,
          fallbackNodes: [...fallbackBaseTerrain, ...decor.fallbackNodes],
          isDisposed: () => isSceneDisposed,
          onLoaded: (g) => {
            animatedGlbRoots.push(g);
          }
        });
      } else if (cfg.levelId === 3) {
        attachBlenderLunarIsland({
          targetParent: islandGroup,
          radius: cfg.radius,
          depthScaleY: 0.72,
          fallbackNodes: [...fallbackBaseTerrain, ...decor.fallbackNodes],
          isDisposed: () => isSceneDisposed,
          onLoaded: (g) => {
            animatedGlbRoots.push(g);
          }
        });
      }

      const portalColor = new THREE.Color(completed ? 0x10b981 : unlocked ? cfg.rimColor : 0x64748b);
      portalRingsInst.setColorAt(idx, portalColor);
      portalCurtainsInst.setColorAt(idx, portalColor);
      portalBasePositions.push(new THREE.Vector3(cfg.center.x, cfg.center.y + 1.2, cfg.center.z - 0.4));
      exclFlags.push(unlocked && !completed);

      // In-world Sprite Label cleanly hovering above island (EN / AR localized!)
      const lMeta = LEVEL_TITLES_BILINGUAL[cfg.levelId];
      const statusBadge = completed ? '✓' : unlocked ? lMeta.badge : '🔒';
      const { sprite, texture } = createFloatingLabelSprite(
        tr(
          language,
          `Level ${cfg.levelId} • ${lMeta.shortEn}`,
          `المستوى ${cfg.levelId} • ${lMeta.shortAr}`
        ),
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

    // Player-Piloted Blender Spaceship Rig for Free Planetary Flight (hidden until Flight Mode toggled)
    const flightRig = new THREE.Group();
    flightRig.visible = isFlightModeRef.current;
    scene.add(flightRig);
    attachBlenderSpaceship({
      targetParent: flightRig,
      position: [0, 0, 0],
      rotationY: 0,
      scale: 0.82,
      isDisposed: () => isSceneDisposed
    });

    // Sculpted Blender Planets in Orbit (planet_pack.glb -> 5 draw calls for Earth, Mars, Moon, Saturn)
    const celestialZones: {
      id: string;
      badgeAr: string;
      pos: THREE.Vector3;
      radius: number;
      sky: SkyMode;
      gravity: number;
      jumpVel: number;
      dustColor: number;
      hemiSky: number;
      hemiGround: number;
      dirColor: number;
    }[] = [
      {
        id: 'mars',
        badgeAr: tr(language, '0.38G 🔴 Mars', '0.38G 🔴 المريخ'),
        pos: new THREE.Vector3(-4, 5.8, -16),
        radius: 11,
        sky: 'mars',
        gravity: 10.5,
        jumpVel: 7.2,
        dustColor: 0xfb923c,
        hemiSky: 0xfed7aa,
        hemiGround: 0x7c2d12,
        dirColor: 0xffedd5
      },
      {
        id: 'saturn',
        badgeAr: tr(language, '1.06G 🪐 Saturn', '1.06G 🪐 زحل'),
        pos: new THREE.Vector3(21, 6.2, -14),
        radius: 12,
        sky: 'nebula',
        gravity: 16,
        jumpVel: 7.4,
        dustColor: 0xfde047,
        hemiSky: 0xfef3c7,
        hemiGround: 0x3b2f1e,
        dirColor: 0xfef08a
      },
      {
        id: 'earth_orbit',
        badgeAr: tr(language, '1.0G 🌍 Earth', '1.0G 🌍 الأرض'),
        pos: new THREE.Vector3(-19, 6.4, -14),
        radius: 12,
        sky: 'sunny',
        gravity: 21,
        jumpVel: 8.4,
        dustColor: 0xfef3c7,
        hemiSky: 0xf0f9ff,
        hemiGround: 0x9a4618,
        dirColor: 0xfffbeb
      },
      {
        id: 'moon_orbit',
        badgeAr: tr(language, '0.16G 🌙 Moon', '0.16G 🌙 القمر'),
        pos: new THREE.Vector3(8, 6.8, -15),
        radius: 11,
        sky: 'lunar',
        gravity: 7.4,
        jumpVel: 7.6,
        dustColor: 0xe2e8f0,
        hemiSky: 0xdbeafe,
        hemiGround: 0x334155,
        dirColor: 0xf8fafc
      }
    ];

    attachBlenderPlanetsFromPack({
      targetParent: scene,
      placements: [
        { nodeName: 'PlanetEarth', id: 'OrbitalPlanetEarth', position: [-19, 6.4, -14], scale: 2.9 },
        { nodeName: 'PlanetMars', id: 'OrbitalPlanetMars', position: [-4, 5.8, -16], scale: 2.5 },
        { nodeName: 'PlanetMoon', id: 'OrbitalPlanetMoon', position: [8, 6.8, -15], scale: 2.1 },
        { nodeName: 'PlanetSaturn', id: 'OrbitalPlanetSaturn', position: [21, 6.2, -14], scale: 2.6 }
      ],
      isDisposed: () => isSceneDisposed,
      onLoaded: (planets) => {
        Object.entries(planets).forEach(([, obj], pIdx) => {
          planetSpinNodes.push({
            obj,
            speed: 0.14 + pIdx * 0.04,
            baseY: obj.position.y,
            phase: pIdx * 1.5
          });
        });
      }
    });

    const dustSystem = createDustPuffSystem(scene, 24);
    const floorArrowSystem = createFloorGuideArrowSystem(scene);

    toggleFlightRef.current = () => {
      const next = !isFlightModeRef.current;
      isFlightModeRef.current = next;
      setIsFlightMode(next);
      flightRig.visible = next;
      hero.group.visible = !next;
      soundManager.playClick();
      if (next) {
        playerPosRef.current.y += 2.6;
        playerVelYRef.current = 3.8;
        flightRig.position.copy(playerPosRef.current);
        isGroundedRef.current = false;
        dustSystem.emit(playerPosRef.current.x, playerPosRef.current.y, playerPosRef.current.z, 0x38bdf8, 8, 2.2);
      } else {
        const landing = getSurfaceInfoAt(playerPosRef.current.x, playerPosRef.current.z);
        if (!landing.supported) {
          playerPosRef.current.set(landing.nearestCenter.x, landing.nearestCenter.y + 1.2, landing.nearestCenter.z + 1.5);
        }
        playerVelYRef.current = -1.5;
        isGroundedRef.current = false;
      }
    };

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
      if (k === 'f') toggleFlightRef.current();
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
              pendingLevelRef.current = unlockedSetRef.current.has(found.levelId) ? found.levelId : null;
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
      animatedGlbRoots.forEach((root) => animateBlenderEnvironmentGlb(root, elapsed));
      planetSpinNodes.forEach((p) => {
        p.obj.rotation.y = elapsed * p.speed + p.phase;
        p.obj.position.y = p.baseY + Math.sin(elapsed * 0.65 + p.phase) * 0.45;
      });

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
      const isFlying = isFlightModeRef.current;

      if (Math.abs(ix) > 0.08 || Math.abs(iz) > 0.08) {
        walkTargetRef.current = null;
        const len = Math.hypot(ix, iz);
        const nx = ix / len;
        const nz = iz / len;
        const worldDirX = rightX * nx + forwardX * (-nz);
        const worldDirZ = rightZ * nx + forwardZ * (-nz);
        const spd = isFlying ? (sprint ? 19.5 : 13.2) : (sprint ? 11.2 : 7.4);

        const { speed } = stepSmoothHorizontalVelocity(
          horizVelRef.current,
          worldDirX * spd,
          worldDirZ * spd,
          dt,
          isFlying ? 9 : 14,
          isFlying ? 4.5 : 11
        );

        const nextX = pos.x + horizVelRef.current.x * dt;
        const nextZ = pos.z + horizVelRef.current.z * dt;
        if (isFlying) {
          pos.x = Math.max(-34, Math.min(34, nextX));
          pos.z = Math.max(-32, Math.min(20, nextZ));
        } else {
          const probe = getSurfaceInfoAt(nextX, nextZ);
          if (probe.supported) {
            pos.x = nextX;
            pos.z = nextZ;
          } else {
            const toCenterX = probe.nearestCenter.x - pos.x;
            const toCenterZ = probe.nearestCenter.z - pos.z;
            const d = Math.hypot(toCenterX, toCenterZ) || 1;
            pos.x += (toCenterX / d) * 2.5 * dt;
            pos.z += (toCenterZ / d) * 2.5 * dt;
          }
        }
        moveSpeed = speed;
        const targetYaw = Math.atan2(worldDirX, worldDirZ);
        hero.group.rotation.y = lerpAngle(hero.group.rotation.y, targetYaw, 1 - Math.exp(-15 * dt));
        flightRig.rotation.y = hero.group.rotation.y;
      } else if (walkTargetRef.current && !isFlying) {
        const dx = walkTargetRef.current.x - pos.x;
        const dz = walkTargetRef.current.z - pos.z;
        const dist = Math.hypot(dx, dz);
        if (dist > 0.35) {
          const spd = 9.0;
          const step = Math.min(dist, spd * dt);
          pos.x += (dx / dist) * step;
          pos.z += (dz / dist) * step;
          horizVelRef.current = { x: (dx / dist) * spd, z: (dz / dist) * spd };
          moveSpeed = spd;
          const targetYaw = Math.atan2(dx, dz);
          hero.group.rotation.y = lerpAngle(hero.group.rotation.y, targetYaw, 1 - Math.exp(-15 * dt));
        } else {
          walkTargetRef.current = null;
          horizVelRef.current = { x: 0, z: 0 };
          const enterLid = pendingLevelRef.current;
          pendingLevelRef.current = null;
          if (enterLid && unlockedSetRef.current.has(enterLid)) {
            onSelectLevelRef.current(enterLid);
          }
        }
      } else {
        const { speed } = stepSmoothHorizontalVelocity(
          horizVelRef.current,
          0,
          0,
          dt,
          14,
          isFlying ? 3.5 : 11
        );
        if (isFlying) {
          pos.x = Math.max(-34, Math.min(34, pos.x + horizVelRef.current.x * dt));
          pos.z = Math.max(-32, Math.min(20, pos.z + horizVelRef.current.z * dt));
        } else if (speed > 0.05) {
          const probe = getSurfaceInfoAt(pos.x + horizVelRef.current.x * dt, pos.z + horizVelRef.current.z * dt);
          if (probe.supported) {
            pos.x += horizVelRef.current.x * dt;
            pos.z += horizVelRef.current.z * dt;
          }
        }
        moveSpeed = speed;
      }

      // Dynamic Planetary Atmosphere, Lighting & Gravity Resolution
      const surf = getSurfaceInfoAt(pos.x, pos.z);
      let zoneId = `island_${surf.nearestLevelId}`;
      let targetSky: SkyMode =
        surf.nearestLevelId === 1
          ? 'sunny'
          : surf.nearestLevelId === 2
          ? 'nebula'
          : surf.nearestLevelId === 3
          ? 'lunar'
          : 'tropical';
      let targetBadge =
        surf.nearestLevelId === 1
          ? tr(language, '1.0G 🌍 Earth', '1.0G 🌍 الأرض')
          : surf.nearestLevelId === 2
          ? tr(language, '0.0G 🛸 Orbit', '0.0G 🛸 المدار')
          : surf.nearestLevelId === 3
          ? tr(language, '0.16G 🌙 Moon', '0.16G 🌙 القمر')
          : tr(language, '1.0G 🪂 Splashdown', '1.0G 🪂 المحيط');
      let targetGravity = surf.nearestLevelId === 3 ? 7.4 : surf.nearestLevelId === 2 ? 6.2 : 21;
      let targetJumpVel = surf.nearestLevelId === 3 ? 7.6 : surf.nearestLevelId === 2 ? 5.8 : 8.4;
      let targetDustHex = surf.nearestLevelId === 3 ? 0xe2e8f0 : surf.nearestLevelId === 2 ? 0x818cf8 : 0xfef3c7;
      let hemiSkyHex = surf.nearestLevelId === 3 ? 0xdbeafe : surf.nearestLevelId === 2 ? 0xc7d2fe : 0xf0f9ff;
      let hemiGroundHex = surf.nearestLevelId === 3 ? 0x334155 : surf.nearestLevelId === 2 ? 0x312e81 : 0x9a4618;
      let dirHex = surf.nearestLevelId === 2 ? 0xe0e7ff : 0xfffbeb;

      for (const cz of celestialZones) {
        if (pos.distanceTo(cz.pos) < cz.radius) {
          zoneId = cz.id;
          targetSky = cz.sky;
          targetBadge = cz.badgeAr;
          targetGravity = cz.gravity;
          targetJumpVel = cz.jumpVel;
          targetDustHex = cz.dustColor;
          hemiSkyHex = cz.hemiSky;
          hemiGroundHex = cz.hemiGround;
          dirHex = cz.dirColor;
          break;
        }
      }

      currentGravityRef.current = {
        gravity: targetGravity,
        jumpVel: targetJumpVel,
        dustColor: targetDustHex
      };
      skyHandle.setAtmosphere(targetSky, 0.06);
      hemi.color.lerp(new THREE.Color(hemiSkyHex), 0.05);
      hemi.groundColor.lerp(new THREE.Color(hemiGroundHex), 0.05);
      dir.color.lerp(new THREE.Color(dirHex), 0.05);

      if (activeBiomeRef.current !== zoneId) {
        activeBiomeRef.current = zoneId;
        setActiveBiomeAr(targetBadge);
      }

      // Vertical Physics: Free 3D Spaceship Flight vs. Planet-Gravity Ground Walking + Coyote Time
      if (isFlying) {
        const hoverFloor = surf.supported ? surf.groundY + 1.6 : -1.5;
        if (keysDown.has(' ') || keysDown.has('r')) {
          playerVelYRef.current += 16 * dt;
        } else if (keysDown.has('c') || keysDown.has('control')) {
          playerVelYRef.current -= 16 * dt;
        } else {
          playerVelYRef.current *= Math.exp(-3.8 * dt);
        }
        playerVelYRef.current = Math.max(-10, Math.min(10, playerVelYRef.current));
        pos.y = Math.max(hoverFloor, Math.min(20, pos.y + playerVelYRef.current * dt));
        isGroundedRef.current = false;

        flightRig.position.set(pos.x, pos.y + Math.sin(elapsed * 3.2) * 0.14, pos.z);
        flightRig.rotation.x = Math.min(0.32, moveSpeed * 0.018);
        flightRig.rotation.z = -horizVelRef.current.x * 0.012;

        sprintDustTimerRef.current += dt;
        if (sprintDustTimerRef.current >= (sprint ? 0.07 : 0.14)) {
          sprintDustTimerRef.current = 0;
          dustSystem.emit(pos.x, pos.y - 0.15, pos.z, sprint ? 0x22d3ee : 0xfbbf24, sprint ? 3 : 1, 1.1);
        }
      } else {
        const targetGroundY = surf.groundY;
        if (!isGroundedRef.current || pos.y > targetGroundY + 0.02) {
          playerVelYRef.current -= targetGravity * dt;
          pos.y += playerVelYRef.current * dt;
          if (pos.y <= targetGroundY) {
            if (!isGroundedRef.current) {
              dustSystem.emit(pos.x, targetGroundY, pos.z, targetDustHex, surf.nearestLevelId === 3 ? 8 : 5, 1.7);
            }
            pos.y = targetGroundY;
            playerVelYRef.current = 0;
            isGroundedRef.current = true;
            lastGroundedMsRef.current = now;
          }
        } else {
          pos.y += (targetGroundY - pos.y) * 0.25;
          lastGroundedMsRef.current = now;
          if (sprint && moveSpeed > 3.5) {
            sprintDustTimerRef.current += dt;
            if (sprintDustTimerRef.current >= 0.14) {
              sprintDustTimerRef.current = 0;
              dustSystem.emit(pos.x, pos.y, pos.z, targetDustHex, 2, 0.9);
            }
          }
        }
      }
      dustSystem.update(dt);

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
        setIdleSpeechAr(
          tr(
            language,
            'Follow the golden floor arrow to your next Island! 🚀',
            'اتبع السهم الذهبي نحو الجزيرة التالية يا بطل! 🚀'
          )
        );
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

      // Floor directional arrow guiding player toward active target island
      floorArrowSystem.update(
        pos,
        isFlightMode ? null : activeTargetIslandCfg.center,
        surf.groundY,
        elapsed
      );

      // Auto-Follow Third-Person Camera behind player while moving (one-thumb mobile ready!)
      if (moveSpeed > 0.25 && !dragOrbiting && !isFlightMode) {
        const behindPlayerYaw = hero.group.rotation.y + Math.PI;
        cameraOrbitYawRef.current = lerpAngle(
          cameraOrbitYawRef.current,
          behindPlayerYaw,
          1 - Math.exp(-1.75 * dt)
        );
      }

      // Smooth Third-Person Follow Camera with Orbit Yaw/Pitch
      const followYaw = cameraOrbitYawRef.current;
      const camDist = isFlying ? 14.2 : 11.5;
      const horizDist = camDist * Math.cos(cameraOrbitPitchRef.current);
      const camHeight = (isFlying ? 3.2 : 2.4) + camDist * Math.sin(cameraOrbitPitchRef.current);
      const desiredCamX = pos.x + Math.sin(followYaw) * horizDist;
      const desiredCamZ = pos.z + Math.cos(followYaw) * horizDist;
      const desiredCamY = pos.y + camHeight;

      camera.position.x += (desiredCamX - camera.position.x) * 0.12;
      camera.position.y += (desiredCamY - camera.position.y) * 0.12;
      camera.position.z += (desiredCamZ - camera.position.z) * 0.12;
      camera.lookAt(pos.x, pos.y + 1.55, pos.z);

      renderer.render(scene, camera);
      mount.dataset.drawCalls = String(renderer.info.render.calls);
      mount.dataset.idleBored = isBoredIdle ? 'true' : 'false';
      mount.dataset.idleSeconds = String(Math.floor(idleSeconds));
      mount.dataset.flightMode = isFlying ? 'true' : 'false';
      mount.dataset.activeBiome = zoneId;
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
      dustSystem.dispose();
      floorArrowSystem.dispose();
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
  }, [campaign.completedMiniGames, campaign.l3ReturnAuthorized, campaign.unlockedLevels, language]);

  if (webglFailed) {
    return (
      <div
        data-testid="world-navigator-3d"
        className="w-full h-full flex items-center justify-center bg-slate-950 p-6"
      >
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl w-full"
          dir={language === 'ar' ? 'rtl' : 'ltr'}
        >
          {([1, 2, 3, 4] as CampaignLevelId[]).map((lid) => {
            const meta = LEVEL_TITLES_BILINGUAL[lid];
            const unlocked = campaign.unlockedLevels.includes(lid);
            const completed = checkLevelCompleted(campaign, lid);
            return (
              <button
                key={lid}
                type="button"
                data-testid={`level-node-${lid}`}
                disabled={!unlocked}
                onClick={() => focusOrOpenLevelPill(lid)}
                className={`p-5 rounded-3xl border-2 transition-all ${
                  language === 'ar' ? 'text-right' : 'text-left'
                } ${
                  unlocked
                    ? 'bg-slate-900/90 border-cyan-400/50 hover:border-cyan-300 cursor-pointer'
                    : 'bg-slate-950/70 border-slate-800 opacity-50 cursor-not-allowed'
                }`}
              >
                <div className="text-3xl mb-2">{meta.badge}</div>
                <div className="font-bold text-white text-base">
                  {tr(language, meta.titleEn, meta.titleAr)}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  {tr(language, meta.subtitleEn, meta.subtitleAr)}
                </div>
                <div className="mt-3 text-xs font-bold text-cyan-300">
                  {completed
                    ? tr(language, '✅ Completed', '✅ مكتمل')
                    : unlocked
                    ? tr(language, '🚀 Enter Island', '🚀 افتح الجزيرة')
                    : tr(language, '🔒 Locked', '🔒 مقفل')}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const focusedMeta = LEVEL_TITLES_BILINGUAL[focusedLevel];
  const focusedUnlocked = unlockedSet.has(focusedLevel);
  const nextIslandMeta = LEVEL_TITLES_BILINGUAL[activeTargetLevelId];

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
        dir={language === 'ar' ? 'rtl' : 'ltr'}
        className="pointer-events-none fixed top-16 sm:top-3.5 inset-x-0 z-20 flex justify-center px-3"
      >
        <div className="pointer-events-auto inline-flex flex-wrap items-center justify-center gap-1 px-2 py-1 rounded-full bg-slate-950/55 border border-white/30 backdrop-blur-md shadow-lg max-w-full">
          {([1, 2, 3, 4] as CampaignLevelId[]).map((lid) => {
            const meta = LEVEL_TITLES_BILINGUAL[lid];
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
                <span className="hidden lg:inline">
                  {tr(language, meta.shortEn, meta.shortAr)}
                </span>
                <span className="lg:hidden">{lid}</span>
                {completed && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                {!unlocked && <Lock className="w-2.5 h-2.5 text-slate-400" />}
              </button>
            );
          })}

          <button
            type="button"
            data-testid="toggle-flight-btn"
            onClick={toggleFlight}
            className={`px-2.5 py-1 rounded-full border text-[11px] font-hud font-black flex items-center gap-1 transition-all cursor-pointer ${
              isFlightMode
                ? 'bg-cyan-400 text-slate-950 border-white shadow-[0_0_12px_rgba(34,211,238,0.75)]'
                : 'bg-indigo-950/75 border-cyan-300/65 text-cyan-100 hover:bg-indigo-900'
            }`}
          >
            <span>
              {isFlightMode
                ? tr(language, '🛬 Land', '🛬 هبوط')
                : tr(language, '🚀 Fly', '🚀 طيران')}
            </span>
          </button>

          <span
            data-testid="active-biome-badge"
            className="hidden sm:inline-flex px-2 py-1 rounded-full bg-slate-900/70 border border-white/20 text-[10px] font-hud font-bold text-cyan-200 whitespace-nowrap"
          >
            {activeBiomeAr}
          </span>
        </div>
      </div>

      {/* Playful Speech Bubble when Astronaut gets Bored after 8s Idle */}
      {idleSpeechAr && (
        <div
          dir={language === 'ar' ? 'rtl' : 'ltr'}
          data-testid="idle-speech-bubble"
          className="pointer-events-none fixed bottom-32 sm:bottom-24 inset-x-0 z-30 flex justify-center px-4"
        >
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white text-slate-900 border-[3px] border-sky-400 shadow-2xl font-hud font-black text-xs sm:text-sm animate-bounce">
            <img src="/assets/ui/speech_bubble.svg" alt="" className="w-6 h-6 shrink-0" />
            <span>{idleSpeechAr}</span>
          </div>
        </div>
      )}

      {/* Bottom Minimalist Arcade Controls (Left Thumbstick + Tap-to-Walk + Right B Interact & A Jump) */}
      <ThirdPersonControlsOverlay
        promptLabelAr={
          focusedUnlocked
            ? tr(
                language,
                `Enter Island ${focusedLevel}: ${focusedMeta.shortEn}`,
                `ادخل جزيرة ${focusedLevel}: ${focusedMeta.shortAr}`
              )
            : tr(language, `Island ${focusedLevel} Locked`, `الجزيرة ${focusedLevel} مقفلة`)
        }
        promptSubAr={focusedUnlocked ? tr(language, focusedMeta.titleEn, focusedMeta.titleAr) : undefined}
        onInteract={handleEnterFocusedIsland}
        onAutoWalkNext={handleWalkToNextIsland}
        autoWalkLabel={tr(
          language,
          `Go to Next Mission: ${nextIslandMeta.shortEn}`,
          `اذهب للمهمة التالية: ${nextIslandMeta.shortAr}`
        )}
        onJoystickMove={(vec) => {
          markPlayerActive();
          joystickVecRef.current = vec;
        }}
        onJump={triggerJump}
        onSprintChange={(s) => {
          markPlayerActive();
          isSprintingRef.current = s;
        }}
        gravityLabelAr={
          isFlightMode
            ? tr(language, `Free Flight (${activeBiomeAr})`, `وضع الطيران الحر (${activeBiomeAr})`)
            : activeBiomeAr
        }
        hintAr={
          isFlightMode
            ? tr(
                language,
                'WASD Fly • Space Up • Shift Boost • F Land',
                'WASD للقيادة • Space للارتفاع • Shift تسريع • F للهبوط'
              )
            : tr(
                language,
                'WASD Walk • Space Jump • F Free Flight • E Enter',
                'WASD للمشي • Space للقفز • F للطيران الحر • E للدخول'
              )
        }
      />
    </div>
  );
};
