import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import { CAMPAIGN_LEVELS, SpatialRoomNode } from '../../data/campaignLevels';
import { CampaignLevelId, CampaignProgressState, SpaceFitXState } from '../../types/game';
import { soundManager } from '../../utils/sound';
import { CheckCircle2, Compass, Lock } from 'lucide-react';
import { useGameState } from '../../context/GameContext';
import { getNextSequentialMissionTarget, getRoomLabel } from '../../data/campaignBilingual';
import { tr } from '../../utils/i18n';
import { AstronautEmote, buildSpaceFitXCharacter } from './buildSpaceFitXCharacter';
import {
  createCosmicSkyBackdrop,
  createCourtyardSignboardsMesh,
  createFloatingExclamationGeometry,
  SkyMode
} from './archipelagoPrimitives';
import {
  animateBlenderEnvironmentGlb,
  attachSectorDeckGlb,
  attachStationPropGlb,
  getLoadedGlbUrls
} from './blenderModelLoader';
import { evalSectorFloorHeight, evalSectorTerrainNormal } from './terrainMath';
import { createSpaceRoverVehicle, SpaceRoverController } from './buildRoverVehicle';
import { ColoredGeometryPart, mergeColoredParts } from './threeMergeUtils';
import {
  createDustPuffSystem,
  createFloorGuideArrowSystem,
  lerpAngle,
  stepSmoothHorizontalVelocity
} from './thirdPersonPhysics';
import { ThirdPersonControlsOverlay } from './ThirdPersonControlsOverlay';
import { getQualityRenderConfig, useDisplaySettings } from '../../utils/displaySettings';

interface SpatialRoomMap3DProps {
  levelId: CampaignLevelId;
  campaign: CampaignProgressState;
  onEnterRoom: (room: SpatialRoomNode) => void;
  suitState?: SpaceFitXState;
}

interface PositionedRoom {
  room: SpatialRoomNode;
  pos: THREE.Vector3;
  yawToCenter: number;
}

function getBiomeTheme(levelId: CampaignLevelId, language: 'en' | 'ar'): {
  topColor: number;
  rimColor: number;
  rockColor: number;
  crystalColor: number;
  walkwayColor: number;
  skyMode: SkyMode;
  gravity: number;
  jumpVel: number;
  gravityLabelAr: string;
  isZeroG: boolean;
  accentCraters: boolean;
} {
  switch (levelId) {
    case 1:
      return {
        topColor: 0x22c55e,
        rimColor: 0x38bdf8,
        rockColor: 0x2f855a,
        crystalColor: 0x22d3ee,
        walkwayColor: 0xd99b52,
        skyMode: 'sunny',
        gravity: 21,
        jumpVel: 8.4,
        gravityLabelAr: tr(language, 'Earth Surface • 1.0G', 'سطح الأرض • 1.0G'),
        isZeroG: false,
        accentCraters: false
      };
    case 2:
      return {
        topColor: 0x1e293b,
        rimColor: 0x818cf8,
        rockColor: 0x334155,
        crystalColor: 0x60a5fa,
        walkwayColor: 0x818cf8,
        skyMode: 'nebula',
        gravity: 5.8,
        jumpVel: 5.8,
        gravityLabelAr: tr(language, 'Zero-G Orbit • 0.0G', 'انعدام الوزن • 0.0G'),
        isZeroG: true,
        accentCraters: false
      };
    case 3:
      return {
        topColor: 0x64748b,
        rimColor: 0xf59e0b,
        rockColor: 0x475569,
        crystalColor: 0xfbbf24,
        walkwayColor: 0xf59e0b,
        skyMode: 'lunar',
        gravity: 7.4,
        jumpVel: 7.6,
        gravityLabelAr: tr(language, 'Lunar Crater • 0.16G', 'فوهة القمر • 0.16G'),
        isZeroG: false,
        accentCraters: true
      };
    case 4:
    default:
      return {
        topColor: 0xc2410c,
        rimColor: 0xfb923c,
        rockColor: 0x7c2d12,
        crystalColor: 0xfdba74,
        walkwayColor: 0xfb923c,
        skyMode: 'mars',
        gravity: 9.8,
        jumpVel: 7.4,
        gravityLabelAr: tr(language, 'Mars Canyon • 0.38G', 'وادي المريخ • 0.38G'),
        isZeroG: false,
        accentCraters: true
      };
  }
}

export const SpatialRoomMap3D: React.FC<SpatialRoomMap3DProps> = ({
  levelId,
  campaign,
  onEnterRoom,
  suitState
}) => {
  const { language } = useGameState();
  const levelSpec = CAMPAIGN_LEVELS[levelId];
  const theme = getBiomeTheme(levelId, language);
  const seqTarget = getNextSequentialMissionTarget(levelId, campaign);
  const isDemoMode =
    campaign.unlockedLevels.length >= 4 &&
    campaign.l3ReturnAuthorized &&
    campaign.l3PackedTools.length >= 4;

  const mountRef = useRef<HTMLDivElement | null>(null);
  const [webglFailed, setWebglFailed] = useState(false);

  const [nearbyRoom, setNearbyRoom] = useState<SpatialRoomNode | null>(
    seqTarget.activeRoom || levelSpec.rooms[0] || null
  );
  const nearbyRoomRef = useRef<SpatialRoomNode | null>(nearbyRoom);
  const [showIdleHint, setShowIdleHint] = useState(false);
  const [lockedToast, setLockedToast] = useState<string | null>(null);
  const activeEntryRef = useRef<{ room: SpatialRoomNode; entrySpot: THREE.Vector3 } | null>(null);

  const playerPosRef = useRef(new THREE.Vector3(0, 0, 3.0));
  const playerVelYRef = useRef(0);
  const horizVelRef = useRef({ x: 0, z: 0 });
  const isGroundedRef = useRef(true);
  const lastGroundedMsRef = useRef(performance.now());
  const sprintDustTimerRef = useRef(0);
  const walkTargetRef = useRef<THREE.Vector3 | null>(null);
  const pendingRoomRef = useRef<SpatialRoomNode | null>(null);
  const joystickVecRef = useRef({ x: 0, z: 0 });
  const isSprintingRef = useRef(false);
  const cameraOrbitYawRef = useRef(0);
  const cameraOrbitPitchRef = useRef(0.38);
  const targetCameraYawRef = useRef(0);
  const targetCameraPitchRef = useRef(0.38);
  const activeLookRef = useRef(false);
  const [displaySettings] = useDisplaySettings();
  const displaySettingsRef = useRef(displaySettings);
  displaySettingsRef.current = displaySettings;
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const dirLightRef = useRef<THREE.DirectionalLight | null>(null);
  const lastActivityMsRef = useRef(performance.now());
  const waveUntilMsRef = useRef(performance.now() + 2500);
  const celebrateUntilMsRef = useRef(0);
  const boredVoiceFiredRef = useRef(false);
  const [isDrivingRover, setIsDrivingRover] = useState(false);
  const isDrivingRoverRef = useRef(false);
  const roverPosRef = useRef(new THREE.Vector3(5.5, 0, 6.5));
  const roverYawRef = useRef(Math.PI * 0.75);
  const roverSpeedRef = useRef(0);
  const roverDustTimerRef = useRef(0);
  const roverToggleHandlerRef = useRef<() => void>(() => {});

  useEffect(() => {
    const r = rendererRef.current;
    const d = dirLightRef.current;
    if (!r) return;
    const q = getQualityRenderConfig(displaySettings.graphicsQuality);
    const ultraShadows = displaySettings.graphicsQuality === 'ultra';
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, q.maxPixelRatio));
    r.shadowMap.enabled = ultraShadows;
    if (d) d.castShadow = ultraShadows;
  }, [displaySettings.graphicsQuality]);

  const applyLookDelta = (rawDx: number, rawDy: number) => {
    lastActivityMsRef.current = performance.now();
    const dx = Math.max(-36, Math.min(36, rawDx));
    const dy = Math.max(-36, Math.min(36, rawDy));
    const sens = displaySettingsRef.current.cameraSensitivity;
    targetCameraYawRef.current -= dx * 0.0046 * sens;
    targetCameraPitchRef.current = Math.max(
      0.08,
      Math.min(0.92, targetCameraPitchRef.current + dy * 0.0034 * sens)
    );
  };

  const markPlayerActive = () => {
    lastActivityMsRef.current = performance.now();
    if (boredVoiceFiredRef.current) {
      boredVoiceFiredRef.current = false;
      setShowIdleHint(false);
    }
  };

  const suitStateRef = useRef(suitState);
  suitStateRef.current = suitState;

  const onEnterRoomRef = useRef(onEnterRoom);
  onEnterRoomRef.current = onEnterRoom;

  const isRoomCompleted = (room: SpatialRoomNode): boolean => {
    if (room.miniGameId) return campaign.completedMiniGames.includes(room.miniGameId);
    if (room.consoleAction === 'l3_return_auth') return campaign.l3ReturnAuthorized;
    return false;
  };

  const isRoomAccessible = (room: SpatialRoomNode): boolean => {
    if (isRoomCompleted(room)) return true;
    if (seqTarget.activeRoom?.id === room.id) return true;
    return isDemoMode;
  };

  const triggerJump = () => {
    markPlayerActive();
    const withinCoyote = performance.now() - lastGroundedMsRef.current <= 130;
    if (isGroundedRef.current || withinCoyote || theme.isZeroG) {
      playerVelYRef.current = theme.jumpVel;
      isGroundedRef.current = false;
      soundManager.playClick();
    }
  };

  const handleWalkToNextMission = () => {
    markPlayerActive();
    setLockedToast(null);
    const active = activeEntryRef.current;
    if (!active) return;
    soundManager.playClick();
    if (playerPosRef.current.distanceTo(active.entrySpot) < 1.2) {
      onEnterRoomRef.current(active.room);
    } else {
      walkTargetRef.current = active.entrySpot.clone();
      pendingRoomRef.current = active.room;
    }
  };

  const enterCurrentRoom = () => {
    markPlayerActive();
    const target = nearbyRoomRef.current || seqTarget.activeRoom || levelSpec.rooms[0];
    if (!target) return;
    if (!isRoomAccessible(target)) {
      soundManager.playCautionBeep();
      const activeTitle = seqTarget.activeRoom ? getRoomLabel(seqTarget.activeRoom, language).title : '';
      setLockedToast(
        tr(
          language,
          `🔒 Locked! Complete Step ${seqTarget.stepNumber}: ${activeTitle} first.`,
          `🔒 مقفول! أكمل الخطوة ${seqTarget.stepNumber}: ${activeTitle} أولاً.`
        )
      );
      window.setTimeout(() => setLockedToast(null), 2600);
      return;
    }
    soundManager.playClick();
    onEnterRoomRef.current(target);
  };

  useEffect(() => {
    const onAutoWalkEvent = () => handleWalkToNextMission();
    window.addEventListener('astronutri:auto-walk-next', onAutoWalkEvent);
    return () => window.removeEventListener('astronutri:auto-walk-next', onAutoWalkEvent);
  }, []);

  useEffect(() => {
    // Reset astronaut to front mission promenade facing the 1 -> 2 -> 3 stations
    playerPosRef.current.set(0, 0, 3.0);
    playerVelYRef.current = 0;
    horizVelRef.current = { x: 0, z: 0 };
    isGroundedRef.current = true;
    lastGroundedMsRef.current = performance.now();
    walkTargetRef.current = null;
    pendingRoomRef.current = null;
    cameraOrbitYawRef.current = 0;
    isDrivingRoverRef.current = false;
    setIsDrivingRover(false);
    roverPosRef.current.set(5.5, evalSectorFloorHeight(levelId, 5.5, 6.5), 6.5);
    roverYawRef.current = Math.PI * 0.75;
    roverSpeedRef.current = 0;
    waveUntilMsRef.current = performance.now() + 2500;
    lastActivityMsRef.current = performance.now();
    boredVoiceFiredRef.current = false;
    setShowIdleHint(false);
    setNearbyRoom(levelSpec.rooms[0] || null);
    nearbyRoomRef.current = levelSpec.rooms[0] || null;
  }, [levelId]);

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
    const qInit = getQualityRenderConfig(displaySettingsRef.current.graphicsQuality);
    const initUltraShadows = displaySettingsRef.current.graphicsQuality === 'ultra';
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, qInit.maxPixelRatio));
    renderer.setSize(dims.w, dims.h);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = initUltraShadows;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    mount.innerHTML = '';
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    let isSceneDisposed = false;
    const camera = new THREE.PerspectiveCamera(50, dims.w / dims.h, 0.1, 360);
    camera.position.set(0, 2.8, 10.5);
    cameraOrbitPitchRef.current = 0.22;
    cameraOrbitYawRef.current = 0;
    targetCameraPitchRef.current = 0.15;
    targetCameraYawRef.current = 0;
    const deckPitchIn = gsap.to(targetCameraPitchRef, {
      current: 0.14,
      duration: 0.65,
      ease: 'power2.out'
    });
    const deckYawIn = gsap.to(targetCameraYawRef, {
      current: 0,
      duration: 0.65,
      ease: 'power2.out'
    });

    const skyHandle = createCosmicSkyBackdrop(scene, theme.skyMode, { skipSatellite: levelId >= 3 });

    // Bright Biome Lighting (warm daylight sun for Earth & Mars Canyon, crisp lunar/orbital lights)
    const hemi = new THREE.HemisphereLight(
      levelId === 1 ? 0xc2e9ff : levelId === 4 ? 0xfdba74 : 0xe0f2fe,
      levelId === 1 ? 0x2f855a : levelId === 4 ? 0x7c2d12 : theme.rockColor,
      levelId === 1 ? 1.55 : levelId === 4 ? 1.35 : 1.4
    );
    scene.add(hemi);
    const dir = new THREE.DirectionalLight(
      levelId === 1 ? 0xfff7d6 : levelId === 4 ? 0xffdfb8 : 0xfffbeb,
      levelId === 1 ? 2.25 : levelId === 4 ? 2.15 : 1.85
    );
    dir.position.set(22, 34, 24);
    dir.castShadow = initUltraShadows;
    dir.shadow.mapSize.set(1024, 1024);
    dir.shadow.camera.near = 2;
    dir.shadow.camera.far = 120;
    dir.shadow.camera.left = -42;
    dir.shadow.camera.right = 42;
    dir.shadow.camera.top = 28;
    dir.shadow.camera.bottom = -28;
    dirLightRef.current = dir;
    scene.add(dir);
    const fill = new THREE.DirectionalLight(theme.rimColor, 0.72);
    fill.position.set(-18, 10, -16);
    scene.add(fill);

    // Expansive Linear Mission Deck Promenade + Open Planetary Biome Terrain (128m-136m)
    const rooms = levelSpec.rooms;
    const roomCount = Math.max(1, rooms.length);
    const stationSpacing = roomCount >= 4 ? 8.8 : 10.0;
    const deckWidth = roomCount >= 4 ? 38.0 : 34.0;
    const deckDepth = 15.0;
    const halfDeckX = deckWidth * 0.45;
    const islandRadius = deckWidth * 0.52;

    const deckFloorColor =
      levelId === 1
        ? 0x334155
        : levelId === 2
        ? 0x1e293b
        : levelId === 3
        ? 0x475569
        : 0x334155;

    const deckParts: ColoredGeometryPart[] = [
      // Main architectural space mission deck
      { geometry: new THREE.BoxGeometry(deckWidth, 0.72, deckDepth), color: deckFloorColor, position: [0, -0.36, -0.2] },
      // Underside hull taper
      { geometry: new THREE.BoxGeometry(deckWidth - 2.4, 0.55, deckDepth - 1.8), color: 0x0f172a, position: [0, -0.96, -0.2] },
      // Glowing front & back perimeter safety strips
      { geometry: new THREE.BoxGeometry(deckWidth + 0.16, 0.12, 0.24), color: theme.rimColor, position: [0, -0.02, deckDepth * 0.5 - 0.2] },
      { geometry: new THREE.BoxGeometry(deckWidth + 0.16, 0.12, 0.24), color: theme.rimColor, position: [0, -0.02, -deckDepth * 0.5 - 0.2] },
      // Center starting launch pad ring at (0, 0, 3.0)
      { geometry: new THREE.CylinderGeometry(1.75, 1.9, 0.06, 20), color: 0x0f172a, position: [0, 0.02, 3.0] },
      { geometry: new THREE.TorusGeometry(1.75, 0.08, 8, 24), color: theme.rimColor, position: [0, 0.05, 3.0], rotation: [Math.PI / 2, 0, 0] }
    ];

    const deckMesh = new THREE.Mesh(
      mergeColoredParts(deckParts),
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.46, metalness: 0.28, flatShading: true })
    );
    deckMesh.receiveShadow = true;
    scene.add(deckMesh);

    const disposableTextures: THREE.Texture[] = [];
    const blenderEnvGroups: THREE.Group[] = [];

    attachSectorDeckGlb({
      levelId,
      targetParent: scene,
      fallbackNodes: [deckMesh],
      isDisposed: () => isSceneDisposed,
      onLoaded: (sectorGlb) => {
        blenderEnvGroups.push(sectorGlb);
      }
    });

    // Deterministic seeded PRNG for lush InstancedMesh biome dressing (< 4 draw calls total!)
    const makeRng = (seed: number) => {
      let s = seed >>> 0;
      return () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 4294967296;
      };
    };
    const rng = makeRng(levelId * 9173 + 42);
    const biomeDummy = new THREE.Object3D();
    const biomeCol = new THREE.Color();

    // Level 1: Vast Sunlit Earth Spaceport Valley — Instanced Stylized Trees, Grass Tufts & Rock Cliffs (4 draw calls)
    if (levelId === 1) {
      const treeCount = 52;
      const trunkInst = new THREE.InstancedMesh(
        new THREE.CylinderGeometry(0.18, 0.28, 1.5, 6),
        new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.85, flatShading: true }),
        treeCount
      );
      const crownGeom = mergeColoredParts([
        { geometry: new THREE.ConeGeometry(1.25, 1.7, 7), color: 0xffffff, position: [0, 0.85, 0] },
        { geometry: new THREE.ConeGeometry(0.88, 1.45, 7), color: 0xffffff, position: [0, 1.85, 0] }
      ]);
      const crownInst = new THREE.InstancedMesh(
        crownGeom,
        new THREE.MeshStandardMaterial({ roughness: 0.65, flatShading: true }),
        treeCount
      );
      const greens = [0x16a34a, 0x22c55e, 0x4ade80, 0x15803d];
      let placedTrees = 0;
      const scenicBackPines: [number, number, number][] = [
        [-24, -12.0, 1.35],
        [-19, -15.5, 1.5],
        [-13, -11.5, 1.25],
        [-7, -14.0, 1.4],
        [-2, -16.5, 1.55],
        [4, -12.0, 1.3],
        [10, -15.0, 1.45],
        [16, -11.5, 1.3],
        [21, -14.5, 1.5],
        [26, -12.5, 1.35]
      ];
      for (const [sx, sz, sc] of scenicBackPines) {
        if (placedTrees >= treeCount) break;
        const sy = evalSectorFloorHeight(1, sx, sz);
        biomeDummy.position.set(sx, sy + 0.7 * sc, sz);
        biomeDummy.rotation.set(0, placedTrees * 0.9, 0);
        biomeDummy.scale.setScalar(sc);
        biomeDummy.updateMatrix();
        trunkInst.setMatrixAt(placedTrees, biomeDummy.matrix);

        biomeDummy.position.set(sx, sy + 1.35 * sc, sz);
        biomeDummy.updateMatrix();
        crownInst.setMatrixAt(placedTrees, biomeDummy.matrix);
        biomeCol.setHex(greens[placedTrees % greens.length]);
        crownInst.setColorAt(placedTrees, biomeCol);
        placedTrees++;
      }
      let tries = 0;
      while (placedTrees < treeCount && tries < 600) {
        tries++;
        const tx = (rng() - 0.5) * 86;
        const tz = (rng() - 0.5) * 68;
        if (Math.abs(tx) < 16.8 && Math.abs(tz) < 8.0) continue;
        if (Math.abs(tz) < 3.0 && Math.abs(tx) < 34) continue;
        const ty = evalSectorFloorHeight(1, tx, tz);
        const sc = 0.9 + rng() * 0.75;
        biomeDummy.position.set(tx, ty + 0.7 * sc, tz);
        biomeDummy.rotation.set(0, rng() * Math.PI * 2, 0);
        biomeDummy.scale.setScalar(sc);
        biomeDummy.updateMatrix();
        trunkInst.setMatrixAt(placedTrees, biomeDummy.matrix);

        biomeDummy.position.set(tx, ty + 1.35 * sc, tz);
        biomeDummy.updateMatrix();
        crownInst.setMatrixAt(placedTrees, biomeDummy.matrix);
        biomeCol.setHex(greens[placedTrees % greens.length]);
        crownInst.setColorAt(placedTrees, biomeCol);
        placedTrees++;
      }
      trunkInst.count = placedTrees;
      crownInst.count = placedTrees;
      trunkInst.instanceMatrix.needsUpdate = true;
      crownInst.instanceMatrix.needsUpdate = true;
      if (crownInst.instanceColor) crownInst.instanceColor.needsUpdate = true;
      scene.add(trunkInst, crownInst);

      const grassCount = 220;
      const tuftGeom = mergeColoredParts([
        { geometry: new THREE.ConeGeometry(0.08, 0.52, 4), color: 0xffffff, position: [-0.08, 0.24, 0], rotation: [0.18, 0, 0.22] },
        { geometry: new THREE.ConeGeometry(0.08, 0.58, 4), color: 0xffffff, position: [0.06, 0.27, 0.05], rotation: [-0.15, 0.3, -0.18] },
        { geometry: new THREE.ConeGeometry(0.07, 0.44, 4), color: 0xffffff, position: [0.0, 0.2, -0.07], rotation: [-0.22, -0.4, 0.1] }
      ]);
      const grassInst = new THREE.InstancedMesh(
        tuftGeom,
        new THREE.MeshStandardMaterial({ roughness: 0.7, flatShading: true }),
        grassCount
      );
      let placedGrass = 0;
      tries = 0;
      while (placedGrass < grassCount && tries < 1200) {
        tries++;
        const gx = (rng() - 0.5) * 76;
        const gz = (rng() - 0.5) * 56;
        if (Math.abs(gx) < 16.5 && Math.abs(gz) < 6.4) continue;
        const gy = evalSectorFloorHeight(1, gx, gz);
        biomeDummy.position.set(gx, gy, gz);
        biomeDummy.rotation.set(0, rng() * Math.PI * 2, 0);
        biomeDummy.scale.setScalar(0.95 + rng() * 0.75);
        biomeDummy.updateMatrix();
        grassInst.setMatrixAt(placedGrass, biomeDummy.matrix);
        biomeCol.setHex(placedGrass % 3 === 0 ? 0x84cc16 : placedGrass % 2 === 0 ? 0x4ade80 : 0x22c55e);
        grassInst.setColorAt(placedGrass, biomeCol);
        placedGrass++;
      }
      grassInst.count = placedGrass;
      grassInst.instanceMatrix.needsUpdate = true;
      if (grassInst.instanceColor) grassInst.instanceColor.needsUpdate = true;
      scene.add(grassInst);

      const cliffCount = 28;
      const cliffInst = new THREE.InstancedMesh(
        new THREE.DodecahedronGeometry(2.6, 0),
        new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.88, flatShading: true }),
        cliffCount
      );
      const scenicBoulders: [number, number][] = [
        [-22, -16],
        [-11, -18],
        [0, -21],
        [11, -18],
        [22, -16],
        [28, -12]
      ];
      for (let c = 0; c < cliffCount; c++) {
        let rx: number;
        let rz: number;
        if (c < scenicBoulders.length) {
          rx = scenicBoulders[c][0];
          rz = scenicBoulders[c][1];
        } else {
          const ang = ((c - scenicBoulders.length) / (cliffCount - scenicBoulders.length)) * Math.PI * 2;
          rx = Math.cos(ang) * (36 + rng() * 14);
          rz = Math.sin(ang) * (25 + rng() * 11);
        }
        const ry = evalSectorFloorHeight(1, rx, rz);
        biomeDummy.position.set(rx, ry + 0.8, rz);
        biomeDummy.rotation.set(rng() * 0.4, rng() * Math.PI, rng() * 0.4);
        biomeDummy.scale.set(1.25 + rng() * 0.7, 0.8 + rng() * 0.7, 1.15 + rng() * 0.6);
        biomeDummy.updateMatrix();
        cliffInst.setMatrixAt(c, biomeDummy.matrix);
      }
      cliffInst.instanceMatrix.needsUpdate = true;
      scene.add(cliffInst);
    }

    // Level 2: Huge Sunlit Rotating Curved Blue Marble Earth Prominently Visible Behind ISS Horizon (2 draw calls)
    let earthOrbitalSphere: THREE.Mesh | null = null;
    if (levelId === 2) {
      const earthMat = new THREE.MeshStandardMaterial({
        color: 0x1d4ed8,
        roughness: 0.68,
        metalness: 0.04,
        emissive: 0x0369a1,
        emissiveIntensity: 0.35
      });
      new THREE.TextureLoader().load('/assets/nasa/earth_blue_marble.jpg', (tex) => {
        if (isSceneDisposed) {
          tex.dispose();
          return;
        }
        tex.colorSpace = THREE.SRGBColorSpace;
        disposableTextures.push(tex);
        earthMat.color.setHex(0xffffff);
        earthMat.map = tex;
        earthMat.needsUpdate = true;
      });
      earthOrbitalSphere = new THREE.Mesh(new THREE.SphereGeometry(46, 36, 24), earthMat);
      earthOrbitalSphere.position.set(0, -24, -62);
      const earthRim = new THREE.Mesh(
        new THREE.SphereGeometry(47.6, 32, 20),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.28, side: THREE.BackSide })
      );
      earthRim.position.copy(earthOrbitalSphere.position);
      scene.add(earthOrbitalSphere, earthRim);
    }

    // Levels 3 & 4: Vast Crater/Canyon Boulders + Illuminated Rover Trail Beacons (2 draw calls) + Drivable Rover
    let roverCtrl: SpaceRoverController | null = null;
    let roverBeaconRing: THREE.Mesh | null = null;
    if (levelId === 3 || levelId === 4) {
      const boulderCount = 32;
      const boulderInst = new THREE.InstancedMesh(
        new THREE.DodecahedronGeometry(1.55, 0),
        new THREE.MeshStandardMaterial({
          color: levelId === 3 ? 0x64748b : 0xb45309,
          roughness: 0.88,
          flatShading: true
        }),
        boulderCount
      );
      let placedBoulders = 0;
      for (let b = 0; b < boulderCount * 2 && placedBoulders < boulderCount; b++) {
        const ang = (b / boulderCount) * Math.PI * 2 + rng() * 0.25;
        const radScale = 0.72 + rng() * 0.55;
        const bx = Math.cos(ang) * 33 * radScale;
        const bz = Math.sin(ang) * 23 * radScale;
        if (Math.abs(bx) < 20.5 && Math.abs(bz) < 10.5) continue;
        const by = evalSectorFloorHeight(levelId, bx, bz);
        biomeDummy.position.set(bx, by + 0.35, bz);
        biomeDummy.rotation.set(rng(), rng() * Math.PI, rng());
        biomeDummy.scale.set(0.8 + rng() * 1.1, 0.55 + rng() * 0.85, 0.8 + rng() * 1.0);
        biomeDummy.updateMatrix();
        boulderInst.setMatrixAt(placedBoulders, biomeDummy.matrix);
        placedBoulders++;
      }
      boulderInst.count = placedBoulders;
      boulderInst.instanceMatrix.needsUpdate = true;
      scene.add(boulderInst);

      const beaconCount = 14;
      const beaconGeom = mergeColoredParts([
        { geometry: new THREE.CylinderGeometry(0.12, 0.16, 1.35, 8), color: 0xe2e8f0, position: [0, 0.68, 0] },
        { geometry: new THREE.OctahedronGeometry(0.28, 0), color: levelId === 3 ? 0x38bdf8 : 0xfbbf24, position: [0, 1.52, 0] }
      ]);
      const beaconInst = new THREE.InstancedMesh(
        beaconGeom,
        new THREE.MeshStandardMaterial({
          vertexColors: true,
          emissive: levelId === 3 ? 0x0284c7 : 0xea580c,
          emissiveIntensity: 0.55,
          roughness: 0.3
        }),
        beaconCount
      );
      for (let p = 0; p < beaconCount; p++) {
        const ang = (p / beaconCount) * Math.PI * 2;
        const wx = Math.cos(ang) * 28.5;
        const wz = Math.sin(ang) * 16.5;
        const wy = evalSectorFloorHeight(levelId, wx, wz);
        biomeDummy.position.set(wx, wy, wz);
        biomeDummy.rotation.set(0, -ang, 0);
        biomeDummy.scale.setScalar(1);
        biomeDummy.updateMatrix();
        beaconInst.setMatrixAt(p, biomeDummy.matrix);
      }
      beaconInst.instanceMatrix.needsUpdate = true;
      scene.add(beaconInst);

      const initRoverY = evalSectorFloorHeight(levelId, roverPosRef.current.x, roverPosRef.current.z);
      roverPosRef.current.y = initRoverY;
      roverCtrl = createSpaceRoverVehicle({
        scene,
        position: [roverPosRef.current.x, initRoverY, roverPosRef.current.z],
        rotationY: roverYawRef.current,
        isDisposed: () => isSceneDisposed
      });

      roverBeaconRing = new THREE.Mesh(
        new THREE.TorusGeometry(1.75, 0.08, 8, 28),
        new THREE.MeshBasicMaterial({
          color: levelId === 3 ? 0x38bdf8 : 0xfbbf24,
          transparent: true,
          opacity: 0.78
        })
      );
      roverBeaconRing.rotation.x = Math.PI / 2;
      roverBeaconRing.position.set(roverPosRef.current.x, initRoverY + 0.08, roverPosRef.current.z);
      scene.add(roverBeaconRing);
    }

    roverToggleHandlerRef.current = () => {
      if (!roverCtrl) return;
      markPlayerActive();
      soundManager.playClick();
      const next = !isDrivingRoverRef.current;
      isDrivingRoverRef.current = next;
      setIsDrivingRover(next);
      walkTargetRef.current = null;
      pendingRoomRef.current = null;
      horizVelRef.current = { x: 0, z: 0 };
      if (next) {
        roverCtrl.setHeadlights(true);
        playerPosRef.current.copy(roverPosRef.current);
      } else {
        roverCtrl.setHeadlights(false);
        const sideX = roverPosRef.current.x + Math.cos(roverYawRef.current) * 2.15;
        const sideZ = roverPosRef.current.z - Math.sin(roverYawRef.current) * 2.15;
        playerPosRef.current.set(sideX, evalSectorFloorHeight(levelId, sideX, sideZ), sideZ);
        roverSpeedRef.current = 0;
      }
    };

    const walkwayParts: ColoredGeometryPart[] = [];

    // Microgravity Floating Asteroid Belt around Level 2 ISS Bay (1 InstancedMesh!)
    const orbitSatelliteTransforms: { angle: number; y: number; radOffset: number; scale: number }[] = [];
    let orbitSatellitesInst: THREE.InstancedMesh | null = null;
    if (theme.isZeroG) {
      orbitSatellitesInst = new THREE.InstancedMesh(
        new THREE.DodecahedronGeometry(0.55, 0),
        new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.35, roughness: 0.65, flatShading: true }),
        14
      );
      for (let k = 0; k < 14; k++) {
        orbitSatelliteTransforms.push({
          angle: (k / 14) * Math.PI * 2,
          y: 1.6 + Math.sin(k * 1.3) * 1.4,
          radOffset: (k % 3) * 1.4,
          scale: 0.65 + (k % 4) * 0.28
        });
      }
      scene.add(orbitSatellitesInst);
    }

    // Arrange 3–4 Core Stations cleanly Left-to-Right along 1 -> 2 -> 3 -> 4 Promenade!
    const clickTargets: { group: THREE.Group; room: SpatialRoomNode; entrySpot: THREE.Vector3; pos: THREE.Vector3 }[] = [];

    const positionedRooms: PositionedRoom[] = rooms.map((room, idx) => {
      const rx = (idx - (roomCount - 1) / 2) * stationSpacing;
      const rz = -3.4;
      return {
        room,
        pos: new THREE.Vector3(rx, 0, rz),
        yawToCenter: 0
      };
    });

    const portalRingsInst = new THREE.InstancedMesh(
      new THREE.TorusGeometry(0.76, 0.11, 10, 24, Math.PI * 1.15),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.45, roughness: 0.25 }),
      roomCount
    );
    const curtainsInst = new THREE.InstancedMesh(
      new THREE.CircleGeometry(0.68, 20),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.32, side: THREE.DoubleSide }),
      roomCount
    );
    const exclInst = new THREE.InstancedMesh(
      createFloatingExclamationGeometry(),
      new THREE.MeshStandardMaterial({ vertexColors: true, emissive: 0xf59e0b, emissiveIntensity: 0.65, roughness: 0.25 }),
      roomCount
    );
    const portalMeta: {
      basePos: THREE.Vector3;
      exclPos: THREE.Vector3;
      yaw: number;
      completed: boolean;
      isActive: boolean;
    }[] = [];
    let activeTargetWorldPos: THREE.Vector3 | null = null;
    activeEntryRef.current = null;
    const signboardItems: Parameters<typeof createCourtyardSignboardsMesh>[0] = [];
    const courtyardBuildingGeoms: THREE.BufferGeometry[] = [];
    const padBatchParts: ColoredGeometryPart[] = [];

    positionedRooms.forEach(({ room, pos, yawToCenter }, idx) => {
      const completed = isRoomCompleted(room);
      const isActive = !seqTarget.isAllDone && seqTarget.activeRoom?.id === room.id;
      const locked = !completed && !isActive && !isDemoMode;

      const stationRoot = new THREE.Group();
      stationRoot.position.copy(pos);
      scene.add(stationRoot);

      // Station Illuminated Pedestal + Baked Dark-Cyan Ambient Occlusion Ground Skirt & Center Prop Contact Shadow (1 draw call for all stations!)
      const padColor = completed ? 0x065f46 : isActive ? 0x1e3a8a : locked ? 0x1e293b : 0x0f172a;
      const ringHex = completed ? '#10b981' : isActive ? '#facc15' : locked ? '#475569' : room.accentHex;
      padBatchParts.push(
        { geometry: new THREE.CylinderGeometry(2.52, 2.86, 0.035, 22), color: 0x030d1c, position: [pos.x, 0.018, pos.z] },
        { geometry: new THREE.CylinderGeometry(2.30, 2.52, 0.08, 22), color: 0x07223a, position: [pos.x, 0.045, pos.z] },
        { geometry: new THREE.CylinderGeometry(2.15, 2.34, 0.20, 20), color: padColor, position: [pos.x, 0.11, pos.z] },
        { geometry: new THREE.CylinderGeometry(1.24, 1.46, 0.215, 18), color: 0x041122, position: [pos.x, 0.115, pos.z - 0.12] },
        { geometry: new THREE.TorusGeometry(2.18, 0.08, 8, 28), color: new THREE.Color(ringHex).getHex(), position: [pos.x, 0.23, pos.z], rotation: [Math.PI / 2, 0, 0] }
      );

      // Compact procedural silhouette placeholder until Blender prop .glb finishes loading
      const fallbackProp = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 1.35, 0.9),
        new THREE.MeshStandardMaterial({
          color: locked ? 0x475569 : new THREE.Color(room.accentHex),
          roughness: 0.45
        })
      );
      fallbackProp.position.set(0, 0.88, -0.1);
      stationRoot.add(fallbackProp);

      // Distinct Indoor / Space Station Blender 3D Prop (.glb)
      attachStationPropGlb({
        propKey: room.propModel,
        targetParent: stationRoot,
        scale: room.propModel.startsWith('prop_') ? 1.48 : 1.52,
        position: [0, 0.22, -0.15],
        rotationY: 0,
        fallbackNodes: [fallbackProp],
        isDisposed: () => isSceneDisposed,
        onLoaded: (g) => {
          g.traverse((node) => {
            if (node instanceof THREE.Mesh) {
              node.receiveShadow = true;
            }
          });
          blenderEnvGroups.push(g);
        }
      });

      const portalWorldPos = new THREE.Vector3(pos.x, 0.88, pos.z + 1.85);
      const exclPos = new THREE.Vector3(pos.x, 4.45, pos.z);
      portalMeta.push({ basePos: portalWorldPos, exclPos, yaw: yawToCenter, completed, isActive });
      const ringCol = new THREE.Color(ringHex);
      portalRingsInst.setColorAt(idx, ringCol);
      curtainsInst.setColorAt(idx, ringCol);

      const roomLbl = getRoomLabel(room, language);
      const stepPrefix = `${idx + 1}. `;
      signboardItems.push({
        pos: new THREE.Vector3(pos.x, 0.2, pos.z),
        yawToCenter: 0,
        titleAr: locked
          ? `🔒 ${stepPrefix}${roomLbl.title}`
          : isActive
          ? `🎯 ${stepPrefix}${roomLbl.title}`
          : completed
          ? `✅ ${stepPrefix}${roomLbl.title}`
          : `${stepPrefix}${roomLbl.title}`,
        icon: room.icon,
        accentHex: locked ? '#64748b' : isActive ? '#facc15' : room.accentHex,
        completed
      });

      // Lighted Horizontal Step Walkway connecting Station i -> i + 1 AND Spawn Plaza -> Active Station
      if (idx < positionedRooms.length - 1) {
        const nextPos = positionedRooms[idx + 1].pos;
        const segLen = nextPos.x - pos.x - 4.1;
        walkwayParts.push({
          geometry: new THREE.BoxGeometry(Math.max(1, segLen), 0.05, 0.9),
          color: completed ? 0x10b981 : 0x38bdf8,
          position: [(pos.x + nextPos.x) * 0.5, 0.03, pos.z]
        });
      }
      walkwayParts.push({
        geometry: new THREE.BoxGeometry(0.95, 0.04, 4.6),
        color: completed ? 0x10b981 : isActive ? 0xfacc15 : 0x334155,
        position: [pos.x, 0.03, pos.z + 3.2]
      });

      const entrySpot = new THREE.Vector3(pos.x, 0, pos.z + 2.65);
      if (isActive) {
        activeTargetWorldPos = pos.clone();
        activeEntryRef.current = { room, entrySpot: entrySpot.clone() };
      }
      clickTargets.push({ group: stationRoot, room, entrySpot, pos });
    });

    if (portalRingsInst.instanceColor) portalRingsInst.instanceColor.needsUpdate = true;
    if (curtainsInst.instanceColor) curtainsInst.instanceColor.needsUpdate = true;
    scene.add(portalRingsInst, curtainsInst, exclInst);

    const signboardsBatch = createCourtyardSignboardsMesh(signboardItems);
    scene.add(signboardsBatch.mesh);
    disposableTextures.push(signboardsBatch.texture);

    const courtyardBuildingsMesh: THREE.Mesh | null = null;
    void courtyardBuildingGeoms;

    if (padBatchParts.length > 0) {
      const padsBatchMesh = new THREE.Mesh(
        mergeColoredParts(padBatchParts),
        new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.38, metalness: 0.35 })
      );
      padsBatchMesh.receiveShadow = true;
      scene.add(padsBatchMesh);
    }

    if (walkwayParts.length > 0) {
      const walkwaysMesh = new THREE.Mesh(
        mergeColoredParts(walkwayParts),
        new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.72 })
      );
      scene.add(walkwaysMesh);
    }

    // Articulated Robo Character wearing SPACE-FIT X IVA Suit facing the 1 -> 2 -> 3 stations
    const hero = buildSpaceFitXCharacter();
    hero.group.scale.setScalar(1.08);
    hero.group.traverse((node) => {
      if (node instanceof THREE.Mesh) {
        node.castShadow = true;
      }
    });
    hero.group.position.copy(playerPosRef.current);
    hero.group.rotation.y = Math.PI;
    scene.add(hero.group);

    // Keyboard & Pointer Controls
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
      if (k === 'e' || k === 'enter') enterCurrentRoom();
      if (k === 'r' && (levelId === 3 || levelId === 4)) roverToggleHandlerRef.current();
      if (k === 'shift') isSprintingRef.current = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      keysDown.delete(k);
      if (k === 'shift') isSprintingRef.current = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    let activeLookPointerId: number | null = null;
    let pointerDownPos = { x: 0, y: 0 };
    let prevPointerPos = { x: 0, y: 0 };
    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();
    const domEl = renderer.domElement;

    const onPointerDown = (e: PointerEvent) => {
      if (activeLookPointerId !== null) return;
      markPlayerActive();
      activeLookPointerId = e.pointerId;
      activeLookRef.current = true;
      pointerDownPos = { x: e.clientX, y: e.clientY };
      prevPointerPos = { x: e.clientX, y: e.clientY };
    };
    const onPointerMove = (e: PointerEvent) => {
      if (activeLookPointerId !== e.pointerId) return;
      const dx = e.clientX - prevPointerPos.x;
      const dy = e.clientY - prevPointerPos.y;
      prevPointerPos = { x: e.clientX, y: e.clientY };
      applyLookDelta(dx, dy);
    };
    const onPointerUp = (e: PointerEvent) => {
      if (activeLookPointerId !== e.pointerId) return;
      activeLookPointerId = null;
      activeLookRef.current = false;
      if (Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y) > 7) return;

      const rect = domEl.getBoundingClientRect();
      pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointerNdc, camera);

      const intersectables: THREE.Object3D[] = clickTargets.map((ct) => ct.group);
      if (courtyardBuildingsMesh) intersectables.push(courtyardBuildingsMesh);
      intersectables.push(signboardsBatch.mesh);
      const hits = raycaster.intersectObjects(intersectables, true);
      if (hits.length > 0) {
        const hitObj = hits[0].object;
        let found = clickTargets.find((ct) => {
          let p: THREE.Object3D | null = hitObj;
          while (p) {
            if (p === ct.group) return true;
            p = p.parent;
          }
          return false;
        });
        if (!found && (hitObj === courtyardBuildingsMesh || hitObj === signboardsBatch.mesh)) {
          const hitPt = hits[0].point;
          let bestDist = Infinity;
          for (const ct of clickTargets) {
            const d = hitPt.distanceTo(ct.pos);
            if (d < bestDist) {
              bestDist = d;
              found = ct;
            }
          }
        }
        if (found) {
          if (!isRoomAccessible(found.room)) {
            soundManager.playCautionBeep();
            const activeTitle = seqTarget.activeRoom ? getRoomLabel(seqTarget.activeRoom, language).title : '';
            setLockedToast(
              tr(
                language,
                `🔒 Complete Step ${seqTarget.stepNumber} (${activeTitle}) first!`,
                `🔒 أكمل الخطوة ${seqTarget.stepNumber} (${activeTitle}) أولاً!`
              )
            );
            window.setTimeout(() => setLockedToast(null), 2600);
            return;
          }
          soundManager.playClick();
          // If already standing right near that room, enter directly; otherwise walk straight up to it
          const d = playerPosRef.current.distanceTo(found.pos);
          if (d < 4.5) {
            onEnterRoomRef.current(found.room);
          } else {
            walkTargetRef.current = found.entrySpot.clone();
            pendingRoomRef.current = found.room;
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

    const portalDummy = new THREE.Object3D();
    const satDummy = new THREE.Object3D();
    const dustSystem = createDustPuffSystem(scene, 20);
    const floorArrowSystem = createFloorGuideArrowSystem(scene);
    const biomeDustColor =
      levelId === 3 ? 0xe2e8f0 : levelId === 4 ? 0xfb923c : levelId === 2 ? 0x818cf8 : 0xfef3c7;
    let rafId = 0;
    let lastTime = performance.now();
    const startTime = lastTime;

    const animate = (now: number) => {
      rafId = requestAnimationFrame(animate);
      const qCfg = getQualityRenderConfig(displaySettingsRef.current.graphicsQuality);
      if (qCfg.targetFpsIntervalMs > 0 && now - lastTime < qCfg.targetFpsIntervalMs) {
        return;
      }
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      const elapsed = (now - startTime) / 1000;

      const dampRate = Math.max(2.6, (1.18 - displaySettingsRef.current.cameraSmoothness) * 14);
      const dampAlpha = 1 - Math.exp(-dampRate * dt);
      cameraOrbitYawRef.current = lerpAngle(cameraOrbitYawRef.current, targetCameraYawRef.current, dampAlpha);
      cameraOrbitPitchRef.current += (targetCameraPitchRef.current - cameraOrbitPitchRef.current) * dampAlpha;

      skyHandle.update(elapsed);
      blenderEnvGroups.forEach((g) => animateBlenderEnvironmentGlb(g, elapsed));

      portalMeta.forEach((pm, idx) => {
        portalDummy.position.copy(pm.basePos);
        portalDummy.rotation.set(0, pm.yaw, Math.sin(elapsed * 1.4 + idx) * 0.09);
        const s = pm.completed ? 1.04 : 1 + Math.sin(elapsed * 2.2 + idx) * 0.03;
        portalDummy.scale.setScalar(s);
        portalDummy.updateMatrix();
        portalRingsInst.setMatrixAt(idx, portalDummy.matrix);

        portalDummy.rotation.set(0, pm.yaw, 0);
        const pulse = 0.9 + Math.sin(elapsed * 2.4 + idx) * 0.08;
        portalDummy.scale.set(pulse, pulse, 1);
        portalDummy.updateMatrix();
        curtainsInst.setMatrixAt(idx, portalDummy.matrix);

        if (pm.isActive) {
          portalDummy.position.set(pm.exclPos.x, pm.exclPos.y + Math.abs(Math.sin(elapsed * 3.8 + idx)) * 0.32, pm.exclPos.z);
          portalDummy.rotation.set(0, elapsed * 1.9 + idx, 0);
          portalDummy.scale.setScalar(1.12);
        } else {
          portalDummy.position.set(pm.exclPos.x, -100, pm.exclPos.z);
          portalDummy.scale.setScalar(0);
        }
        portalDummy.updateMatrix();
        exclInst.setMatrixAt(idx, portalDummy.matrix);
      });
      portalRingsInst.instanceMatrix.needsUpdate = true;
      curtainsInst.instanceMatrix.needsUpdate = true;
      exclInst.instanceMatrix.needsUpdate = true;

      if (earthOrbitalSphere) {
        earthOrbitalSphere.rotation.y = elapsed * 0.018;
      }

      if (roverBeaconRing) {
        roverBeaconRing.visible = !isDrivingRoverRef.current;
        if (roverBeaconRing.visible) {
          const pulseScale = 1 + Math.sin(elapsed * 3.4) * 0.09;
          roverBeaconRing.scale.set(pulseScale, pulseScale, 1);
        }
      }

      if (orbitSatellitesInst) {
        orbitSatelliteTransforms.forEach((tr, idx) => {
          const orbAng = tr.angle + elapsed * 0.14;
          satDummy.position.set(
            Math.cos(orbAng) * (islandRadius + 2.2 + tr.radOffset),
            tr.y + Math.sin(elapsed * 1.1 + idx) * 0.4,
            Math.sin(orbAng) * (islandRadius + 2.2 + tr.radOffset)
          );
          satDummy.rotation.set(elapsed * 0.4 + idx, elapsed * 0.55, 0);
          satDummy.scale.setScalar(tr.scale);
          satDummy.updateMatrix();
          orbitSatellitesInst?.setMatrixAt(idx, satDummy.matrix);
        });
        orbitSatellitesInst.instanceMatrix.needsUpdate = true;
      }

      // Third-person movement relative to camera orbit yaw
      let ix = joystickVecRef.current.x;
      let iz = joystickVecRef.current.z;
      if (keysDown.has('a') || keysDown.has('arrowleft')) ix -= 1;
      if (keysDown.has('d') || keysDown.has('arrowright')) ix += 1;
      if (keysDown.has('w') || keysDown.has('arrowup')) iz -= 1;
      if (keysDown.has('s') || keysDown.has('arrowdown')) iz += 1;

      if (Math.abs(ix) > 0.08 || Math.abs(iz) > 0.08) {
        markPlayerActive();
      }

      const yaw = cameraOrbitYawRef.current;
      const forwardX = -Math.sin(yaw);
      const forwardZ = -Math.cos(yaw);
      const rightX = Math.cos(yaw);
      const rightZ = -Math.sin(yaw);

      const pos = playerPosRef.current;
      const sprint = isSprintingRef.current || keysDown.has('shift');
      let moveSpeed = 0;
      const maxWalkRadius = islandRadius - 1.4;
      const boundX = levelId === 1 ? 34 : levelId === 2 ? 22 : 36;
      const boundZ = levelId === 1 ? 22 : levelId === 2 ? 8.5 : 24;
      void halfDeckX;
      void maxWalkRadius;

      if (isDrivingRoverRef.current && roverCtrl) {
        const rPos = roverPosRef.current;
        let steerAngle = 0;
        if (Math.abs(ix) > 0.08 || Math.abs(iz) > 0.08) {
          walkTargetRef.current = null;
          pendingRoomRef.current = null;
          const len = Math.hypot(ix, iz);
          const nx = ix / len;
          const nz = iz / len;
          const worldDirX = rightX * nx + forwardX * (-nz);
          const worldDirZ = rightZ * nx + forwardZ * (-nz);
          const maxSpd = sprint ? 21.5 : 16.5;

          const { speed } = stepSmoothHorizontalVelocity(
            horizVelRef.current,
            worldDirX * maxSpd,
            worldDirZ * maxSpd,
            dt,
            10,
            7
          );
          roverSpeedRef.current = speed;
          rPos.x += horizVelRef.current.x * dt;
          rPos.z += horizVelRef.current.z * dt;
          const targetYaw = Math.atan2(worldDirX, worldDirZ);
          const diff = Math.atan2(Math.sin(targetYaw - roverYawRef.current), Math.cos(targetYaw - roverYawRef.current));
          steerAngle = Math.max(-0.42, Math.min(0.42, diff * 0.65));
          roverYawRef.current = lerpAngle(roverYawRef.current, targetYaw, 1 - Math.exp(-8.5 * dt));
        } else {
          const { speed } = stepSmoothHorizontalVelocity(horizVelRef.current, 0, 0, dt, 10, 7);
          roverSpeedRef.current = speed;
          rPos.x += horizVelRef.current.x * dt;
          rPos.z += horizVelRef.current.z * dt;
        }

        rPos.x = Math.max(-boundX, Math.min(boundX, rPos.x));
        rPos.z = Math.max(-boundZ, Math.min(boundZ, rPos.z));
        rPos.y = evalSectorFloorHeight(levelId, rPos.x, rPos.z);
        const normal = evalSectorTerrainNormal(levelId, rPos.x, rPos.z);

        roverCtrl.group.position.copy(rPos);
        roverCtrl.group.rotation.y = roverYawRef.current;
        roverCtrl.updateVisuals({
          dt,
          speed: roverSpeedRef.current,
          steerAngle,
          normal
        });

        pos.copy(rPos);
        playerVelYRef.current = 0;
        isGroundedRef.current = true;
        moveSpeed = roverSpeedRef.current;

        if (moveSpeed > 2.2) {
          roverDustTimerRef.current += dt;
          if (roverDustTimerRef.current >= 0.085) {
            roverDustTimerRef.current = 0;
            const bSin = Math.sin(roverYawRef.current);
            const bCos = Math.cos(roverYawRef.current);
            dustSystem.emit(
              rPos.x - bSin * 1.15,
              rPos.y + 0.14,
              rPos.z - bCos * 1.15,
              biomeDustColor,
              Math.max(1, Math.round(3 * qCfg.particleDensity)),
              1.6
            );
          }
        }
      } else {
        if (Math.abs(ix) > 0.08 || Math.abs(iz) > 0.08) {
          walkTargetRef.current = null;
          pendingRoomRef.current = null;
          const len = Math.hypot(ix, iz);
          const nx = ix / len;
          const nz = iz / len;
          const worldDirX = rightX * nx + forwardX * (-nz);
          const worldDirZ = rightZ * nx + forwardZ * (-nz);
          const spd = sprint ? 11.8 : 7.8;

          const { speed } = stepSmoothHorizontalVelocity(
            horizVelRef.current,
            worldDirX * spd,
            worldDirZ * spd,
            dt
          );
          pos.x += horizVelRef.current.x * dt;
          pos.z += horizVelRef.current.z * dt;
          moveSpeed = speed;
          const targetYaw = Math.atan2(worldDirX, worldDirZ);
          hero.group.rotation.y = lerpAngle(hero.group.rotation.y, targetYaw, 1 - Math.exp(-15 * dt));
        } else if (walkTargetRef.current) {
          const dx = walkTargetRef.current.x - pos.x;
          const dz = walkTargetRef.current.z - pos.z;
          const dist = Math.hypot(dx, dz);
          if (dist > 0.45) {
            const spd = 9.4;
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
            const enterRoom = pendingRoomRef.current;
            pendingRoomRef.current = null;
            if (enterRoom) onEnterRoomRef.current(enterRoom);
          }
        } else {
          const { speed } = stepSmoothHorizontalVelocity(horizVelRef.current, 0, 0, dt);
          pos.x += horizVelRef.current.x * dt;
          pos.z += horizVelRef.current.z * dt;
          moveSpeed = speed;
        }

        // Open Planetary Biome Valley/Crater Containment
        pos.x = Math.max(-boundX, Math.min(boundX, pos.x));
        pos.z = Math.max(-boundZ, Math.min(boundZ, pos.z));

        // Level-Specific Gravity Physics (1G / 0G / 0.16G / 0.38G) + Sculpted Terrain Height + Landing Dust Puffs
        const floorY = evalSectorFloorHeight(levelId, pos.x, pos.z);
        const puffCount = Math.max(1, Math.round((levelId >= 3 ? 8 : 5) * qCfg.particleDensity));
        if (!isGroundedRef.current || pos.y > floorY + 0.02) {
          playerVelYRef.current -= theme.gravity * dt;
          pos.y += playerVelYRef.current * dt;
          if (pos.y <= floorY) {
            if (!isGroundedRef.current) {
              dustSystem.emit(pos.x, floorY, pos.z, biomeDustColor, puffCount, 1.8);
            }
            pos.y = floorY;
            playerVelYRef.current = 0;
            isGroundedRef.current = true;
            lastGroundedMsRef.current = now;
          }
        } else {
          pos.y = floorY;
          lastGroundedMsRef.current = now;
          if (sprint && moveSpeed > 3.5) {
            sprintDustTimerRef.current += dt;
            if (sprintDustTimerRef.current >= 0.14) {
              sprintDustTimerRef.current = 0;
              dustSystem.emit(
                pos.x,
                floorY,
                pos.z,
                biomeDustColor,
                Math.max(1, Math.round(2 * qCfg.particleDensity)),
                0.9
              );
            }
          }
        }

        if (roverCtrl) {
          roverCtrl.updateVisuals({
            dt,
            speed: 0,
            steerAngle: 0,
            normal: evalSectorTerrainNormal(levelId, roverPosRef.current.x, roverPosRef.current.z)
          });
        }
      }
      dustSystem.update(dt);

      // Find Nearest Station Building Portal
      let closestRoom: SpatialRoomNode | null = null;
      let closestDist = Infinity;
      positionedRooms.forEach((pr) => {
        const d = Math.hypot(pos.x - pr.pos.x, pos.z - pr.pos.z);
        if (d < closestDist) {
          closestDist = d;
          closestRoom = pr.room;
        }
      });

      if (closestRoom && (closestRoom as SpatialRoomNode).id !== nearbyRoomRef.current?.id) {
        nearbyRoomRef.current = closestRoom;
        setNearbyRoom(closestRoom);
      }

      const idleSeconds = (now - lastActivityMsRef.current) / 1000;
      const isBoredIdle =
        idleSeconds >= 8 &&
        isGroundedRef.current &&
        !theme.isZeroG &&
        !isDrivingRoverRef.current &&
        moveSpeed <= 0.1 &&
        !walkTargetRef.current;

      if (isBoredIdle && !boredVoiceFiredRef.current) {
        boredVoiceFiredRef.current = true;
        // 8s idle triggers silent visual speech bubble + animation only (no unprompted passive voice)
        setShowIdleHint(true);
      }

      const activeEmote: AstronautEmote =
        now < celebrateUntilMsRef.current
          ? 'celebrate'
          : now < waveUntilMsRef.current && moveSpeed <= 0.1 && !isDrivingRoverRef.current
          ? 'wave'
          : closestDist < 4.5 && closestRoom && !isRoomCompleted(closestRoom) && moveSpeed <= 0.1
          ? 'point'
          : 'none';

      if (isDrivingRoverRef.current && roverCtrl) {
        hero.group.position.set(roverPosRef.current.x, roverPosRef.current.y + 0.56, roverPosRef.current.z);
        hero.group.rotation.y = roverYawRef.current;
        hero.update({
          t: elapsed,
          moveSpeed: 0,
          isRunning: false,
          isJumping: false,
          isZeroG: false,
          suitState: suitStateRef.current,
          idleSeconds: 0,
          emote: 'none'
        });
      } else {
        hero.group.position.copy(pos);
        hero.update({
          t: elapsed,
          moveSpeed,
          isRunning: sprint && moveSpeed > 0.1,
          isJumping: !isGroundedRef.current,
          isZeroG: theme.isZeroG,
          suitState: suitStateRef.current,
          idleSeconds,
          emote: activeEmote
        });
      }

      // Floor directional guide arrow pointing toward current active step target
      floorArrowSystem.update(pos, activeTargetWorldPos, 0, elapsed);

      // Auto-Follow Close Third-Person Camera behind player or Rover
      if (moveSpeed > 0.25 && !activeLookRef.current) {
        const refYaw = isDrivingRoverRef.current ? roverYawRef.current : hero.group.rotation.y;
        const behindPlayerYaw = refYaw + Math.PI;
        targetCameraYawRef.current = lerpAngle(
          targetCameraYawRef.current,
          behindPlayerYaw,
          1 - Math.exp(-3.0 * dt)
        );
      }

      const followYaw = cameraOrbitYawRef.current;
      const camDist = isDrivingRoverRef.current ? 7.4 : 6.0;
      const horizDist = camDist * Math.cos(cameraOrbitPitchRef.current);
      const camHeight = 1.2 + camDist * Math.sin(cameraOrbitPitchRef.current);
      const desiredCamX = pos.x + Math.sin(followYaw) * horizDist;
      const desiredCamZ = pos.z + Math.cos(followYaw) * horizDist;
      const minGroundCamY = evalSectorFloorHeight(levelId, desiredCamX, desiredCamZ) + 0.9;
      const desiredCamY = Math.max(pos.y + camHeight, minGroundCamY);

      camera.position.x += (desiredCamX - camera.position.x) * 0.14;
      camera.position.y += (desiredCamY - camera.position.y) * 0.14;
      camera.position.z += (desiredCamZ - camera.position.z) * 0.14;
      const lookFwdX = -Math.sin(followYaw) * 3.8;
      const lookFwdZ = -Math.cos(followYaw) * 3.8;
      camera.lookAt(pos.x + lookFwdX, pos.y + 1.85, pos.z + lookFwdZ);

      renderer.render(scene, camera);
      mount.dataset.drawCalls = String(renderer.info.render.calls);
      mount.dataset.idleBored = isBoredIdle ? 'true' : 'false';
      mount.dataset.idleSeconds = String(Math.floor(idleSeconds));
      mount.dataset.glbLoaded = getLoadedGlbUrls().join(',');
      mount.dataset.roverActive = isDrivingRoverRef.current ? 'true' : 'false';
    };

    rafId = requestAnimationFrame(animate);

    return () => {
      isSceneDisposed = true;
      rendererRef.current = null;
      dirLightRef.current = null;
      deckPitchIn.kill();
      deckYawIn.kill();
      gsap.killTweensOf(cameraOrbitPitchRef);
      gsap.killTweensOf(cameraOrbitYawRef);
      gsap.killTweensOf(targetCameraPitchRef);
      gsap.killTweensOf(targetCameraYawRef);
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
      roverCtrl?.dispose();
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
  }, [levelId, campaign.completedMiniGames, campaign.l3ReturnAuthorized, language, isDemoMode]);

  if (webglFailed) {
    return (
      <div
        data-testid={`spatial-room-map-3d-l${levelId}`}
        className="w-full h-full flex items-center justify-center bg-slate-950 p-6 overflow-y-auto"
      >
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl w-full"
          dir={language === 'ar' ? 'rtl' : 'ltr'}
        >
          {levelSpec.rooms.map((room) => {
            const done = isRoomCompleted(room);
            const isActive = !seqTarget.isAllDone && seqTarget.activeRoom?.id === room.id;
            const accessible = isRoomAccessible(room);
            const lbl = getRoomLabel(room, language);
            return (
              <button
                key={room.id}
                type="button"
                disabled={!accessible}
                onClick={() => {
                  if (!accessible) return;
                  soundManager.playClick();
                  onEnterRoom(room);
                }}
                className={`p-4 rounded-2xl border-2 transition-all ${
                  language === 'ar' ? 'text-right' : 'text-left'
                } ${
                  isActive
                    ? 'bg-amber-950/50 border-amber-400 cursor-pointer shadow-lg'
                    : accessible
                    ? 'bg-slate-900 border-slate-700 hover:border-cyan-400 cursor-pointer'
                    : 'bg-slate-950/60 border-slate-800 opacity-55 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-2xl">{room.icon}</span>
                  {done ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : isActive ? (
                    <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black">
                      {tr(language, `Step ${seqTarget.stepNumber}`, `الخطوة ${seqTarget.stepNumber}`)}
                    </span>
                  ) : (
                    <Lock className="w-4 h-4 text-slate-400" />
                  )}
                </div>
                <div className="font-bold text-white text-sm">{lbl.title}</div>
                <div className="text-xs text-slate-400 mt-1">{lbl.objective}</div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const nearbyLbl = nearbyRoom ? getRoomLabel(nearbyRoom, language) : null;
  const nearbyLocked = nearbyRoom ? !isRoomAccessible(nearbyRoom) : false;
  const activeLbl = seqTarget.activeRoom ? getRoomLabel(seqTarget.activeRoom, language) : null;

  return (
    <div
      data-testid={`spatial-room-map-3d-l${levelId}`}
      className="relative w-full h-full overflow-hidden select-none"
    >
      {/* Full-Viewport 3D Mission Deck Canvas */}
      <div
        ref={mountRef}
        data-testid="three-canvas-mount"
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* Top-Left Non-Overlapping Drivable Space Rover Board / Exit Action (Moon & Mars) */}
      {(levelId === 3 || levelId === 4) && (
        <button
          type="button"
          data-testid="toggle-rover-btn"
          dir={language === 'ar' ? 'rtl' : 'ltr'}
          onClick={() => roverToggleHandlerRef.current()}
          className={`pointer-events-auto fixed top-[56px] sm:top-[64px] left-3 sm:left-4 z-30 px-3 py-1.5 rounded-full border-2 font-hud font-black text-[11px] sm:text-xs shadow-xl cursor-pointer active:scale-95 transition-all flex items-center gap-1.5 ${
            isDrivingRover
              ? 'bg-gradient-to-r from-orange-400 to-amber-500 text-slate-950 border-white shadow-[0_0_16px_rgba(251,146,60,0.65)]'
              : 'bg-slate-950/85 hover:bg-slate-900 text-cyan-200 border-cyan-300/80'
          }`}
        >
          <span>{isDrivingRover ? '🚶' : '🚙'}</span>
          <span>
            {isDrivingRover
              ? tr(language, 'Exit Rover (R)', 'نزول من المركبة (R)')
              : tr(language, 'Drive Rover (R)', 'قيادة المركبة (R)')}
          </span>
        </button>
      )}

      {/* Sequential Station Lock Warning Toast with 1-Tap Auto-Walk Shortcut */}
      {lockedToast && (
        <div
          dir={language === 'ar' ? 'rtl' : 'ltr'}
          className="fixed bottom-36 sm:bottom-28 inset-x-0 z-30 flex justify-center px-4 pointer-events-none"
        >
          <div className="pointer-events-auto flex flex-wrap items-center gap-2.5 px-4 py-2 rounded-full bg-slate-950/95 border-2 border-amber-400 text-amber-200 font-hud font-black text-xs shadow-2xl">
            <span>{lockedToast}</span>
            {seqTarget.activeRoom && (
              <button
                type="button"
                onClick={handleWalkToNextMission}
                className="px-3 py-1 rounded-full bg-cyan-400 text-slate-950 font-black text-[11px] flex items-center gap-1 cursor-pointer"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>{tr(language, 'Go Now', 'اذهب الآن')}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Playful Speech Bubble when Astronaut sits down bored after 8s */}
      {showIdleHint && (
        <div
          dir={language === 'ar' ? 'rtl' : 'ltr'}
          data-testid="idle-speech-bubble"
          className="pointer-events-none fixed bottom-48 sm:bottom-24 inset-x-0 z-20 flex justify-center px-4"
        >
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white text-slate-900 border-[3px] border-sky-400 shadow-2xl font-hud font-black text-xs sm:text-sm animate-bounce">
            <img src="/assets/ui/speech_bubble.svg" alt="" className="w-6 h-6 shrink-0" />
            <span>
              {tr(
                language,
                'Follow the golden floor arrow to your next NASA mission! 🚀',
                'اتبع السهم الذهبي على الأرض نحو مهمتك الفضائية التالية! 🚀'
              )}
            </span>
          </div>
        </div>
      )}

      {/* Bottom Minimalist Arcade Controls + Tap-to-Walk Auto-Nav */}
      <ThirdPersonControlsOverlay
        promptLabelAr={
          nearbyRoom && nearbyLbl
            ? nearbyLocked
              ? `🔒 ${nearbyLbl.title}`
              : tr(language, `Enter ${nearbyRoom.icon} ${nearbyLbl.title}`, `دخول ${nearbyRoom.icon} ${nearbyLbl.title}`)
            : null
        }
        promptSubAr={nearbyLbl?.objective}
        onInteract={enterCurrentRoom}
        onAutoWalkNext={seqTarget.activeRoom ? handleWalkToNextMission : undefined}
        autoWalkLabel={
          activeLbl
            ? tr(
                language,
                `Go to Step ${seqTarget.stepNumber}: ${activeLbl.title}`,
                `اذهب للمهمة ${seqTarget.stepNumber}: ${activeLbl.title}`
              )
            : null
        }
        onJoystickMove={(vec) => {
          markPlayerActive();
          joystickVecRef.current = vec;
        }}
        onLookDrag={applyLookDelta}
        onJump={triggerJump}
        onSprintChange={(s) => {
          markPlayerActive();
          isSprintingRef.current = s;
        }}
        gravityLabelAr={theme.gravityLabelAr}
        hintAr={tr(
          language,
          'WASD / Arrows to Walk • Space (A) Jump • E (B) Enter',
          'WASD / الأسهم للمشي • Space (A) للقفز • E (B) للدخول'
        )}
      />
    </div>
  );
};
