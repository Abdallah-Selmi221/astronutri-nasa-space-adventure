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
  createFloatingLabelSprite,
  SkyMode
} from './archipelagoPrimitives';
import {
  animateBlenderEnvironmentGlb,
  attachEarthBuildingGlb,
  attachPhase3PlanetGlb,
  attachSectorDeckGlb,
  attachStationPropGlb,
  EarthBuildingModelKey,
  getLoadedGlbUrls
} from './blenderModelLoader';
import {
  EARTH_L1_PADS,
  EARTH_L1_PLAY_BOUNDS,
  evalSectorFloorHeight,
  evalSectorTerrainNormal,
  MARS_L4_PADS,
  MARS_L4_PLAY_BOUNDS,
  MOON_L3_PADS,
  MOON_L3_PLAY_BOUNDS
} from './terrainMath';
import { buildEarthEnvironment, EarthEnvironmentHandle } from './earthEnvironmentBuilder';
import {
  buildIssEnvironment,
  buildMarsEnvironment,
  buildMoonEnvironment,
  PlanetEnvironmentHandle
} from './planetEnvironmentsBuilder';
import {
  EARTH_L1_KIOSKS,
  markFactDiscovered,
  MARS_L4_KIOSKS,
  MOON_L3_KIOSKS,
  SpaceDiscoveryFact
} from '../../data/earthDiscoveryFacts';
import { createSpaceRoverVehicle, SpaceRoverController } from './buildRoverVehicle';
import { ColoredGeometryPart, mergeColoredParts } from './threeMergeUtils';
import {
  CircleObstacle,
  createDustPuffSystem,
  createFloorGuideArrowSystem,
  createKinematicsState,
  dampValue,
  JUMP_BUFFER_MS,
  lerpAngle,
  queueJumpInput,
  resolveCircleObstacles,
  stepSmoothHorizontalVelocity,
  stepThirdPersonKinematics,
  ThirdPersonKinematicsState
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
  entrySpot: THREE.Vector3;
  yawToCenter: number;
}

const EARTH_L1_BUILDING_SPEC: Record<
  string,
  {
    modelName: EarthBuildingModelKey;
    scale: number;
    obstacleRadius: number;
    entryDist: number;
    labelY: number;
  }
> = {
  food_storage: {
    modelName: 'earth_kitchen_dome',
    scale: 1.05,
    obstacleRadius: 5.5,
    entryDist: 8.6,
    labelY: 7.4
  },
  equipment_room: {
    modelName: 'earth_suit_hangar',
    scale: 1.05,
    obstacleRadius: 6.0,
    entryDist: 9.0,
    labelY: 8.4
  },
  medical_room: {
    modelName: 'earth_medical_pavilion',
    scale: 1.05,
    obstacleRadius: 5.5,
    entryDist: 8.6,
    labelY: 7.2
  },
  launch_area: {
    modelName: 'earth_launch_complex',
    scale: 1.02,
    obstacleRadius: 6.8,
    entryDist: 10.8,
    labelY: 16.2
  }
};

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
  const [activeKioskFact, setActiveKioskFact] = useState<SpaceDiscoveryFact | null>(null);
  const [kioskBonusBanner, setKioskBonusBanner] = useState<string | null>(null);
  const activeKioskIdRef = useRef<string | null>(null);
  const suppressedKioskIdRef = useRef<string | null>(null);
  const activeEntryRef = useRef<{ room: SpatialRoomNode; entrySpot: THREE.Vector3 } | null>(null);

  const initSpawnX = 0;
  const initSpawnZ = levelId === 1 ? 32.0 : levelId === 2 ? 3.0 : 26.0;
  const initSpawnY = evalSectorFloorHeight(levelId, initSpawnX, initSpawnZ);
  const playerPosRef = useRef(new THREE.Vector3(initSpawnX, initSpawnY, initSpawnZ));
  const kinematicsRef = useRef<ThirdPersonKinematicsState>(
    createKinematicsState(initSpawnX, initSpawnY, initSpawnZ, performance.now())
  );
  const roverVelRef = useRef({ x: 0, z: 0 });
  const roverBoostUntilRef = useRef(0);
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
  const lastManualLookMsRef = useRef(0);
  const viewportTapHandlerRef = useRef<(clientX: number, clientY: number) => void>(() => {});
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
  const initRoverX = levelId === 1 ? 8.6 : 6.8;
  const initRoverZ = levelId === 1 ? 29.0 : 22.5;
  const roverPosRef = useRef(
    new THREE.Vector3(initRoverX, evalSectorFloorHeight(levelId, initRoverX, initRoverZ), initRoverZ)
  );
  const roverYawRef = useRef(Math.PI);
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
    const now = performance.now();
    lastActivityMsRef.current = now;
    lastManualLookMsRef.current = now;
    const dx = Math.max(-120, Math.min(120, rawDx));
    const dy = Math.max(-120, Math.min(120, rawDy));
    const sens = displaySettingsRef.current.cameraSensitivity;
    targetCameraYawRef.current -= dx * 0.0092 * sens;
    targetCameraPitchRef.current = Math.max(
      -0.21,
      Math.min(0.73, targetCameraPitchRef.current + dy * 0.0062 * sens)
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
    const now = performance.now();
    if (isDrivingRoverRef.current) {
      roverBoostUntilRef.current = now + 1150;
      soundManager.playClick();
      return;
    }
    queueJumpInput(kinematicsRef.current, now, JUMP_BUFFER_MS);
  };
  const jumpHandlerRef = useRef(triggerJump);
  jumpHandlerRef.current = triggerJump;

  const handleWalkToNextMission = () => {
    markPlayerActive();
    setLockedToast(null);
    const active = activeEntryRef.current;
    if (!active) return;
    soundManager.playClick();
    if (playerPosRef.current.distanceTo(active.entrySpot) < 2.6) {
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
    // Reset astronaut to starting pad (Spaceport Plaza on Level 1, Deck Promenade on Levels 2–4)
    const now = performance.now();
    const spawnX = 0;
    const spawnZ = levelId === 1 ? 32.0 : levelId === 2 ? 3.0 : 26.0;
    const spawnY = evalSectorFloorHeight(levelId, spawnX, spawnZ);
    playerPosRef.current.set(spawnX, spawnY, spawnZ);
    kinematicsRef.current = createKinematicsState(spawnX, spawnY, spawnZ, now);
    roverVelRef.current = { x: 0, z: 0 };
    roverBoostUntilRef.current = 0;
    walkTargetRef.current = null;
    pendingRoomRef.current = null;
    cameraOrbitYawRef.current = 0;
    isDrivingRoverRef.current = false;
    setIsDrivingRover(false);
    setActiveKioskFact(null);
    activeKioskIdRef.current = null;
    suppressedKioskIdRef.current = null;
    const rX = levelId === 1 ? 8.6 : 6.8;
    const rZ = levelId === 1 ? 29.0 : 22.5;
    roverPosRef.current.set(rX, evalSectorFloorHeight(levelId, rX, rZ), rZ);
    roverYawRef.current = Math.PI;
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
    const camera = new THREE.PerspectiveCamera(58, dims.w / dims.h, 0.1, levelId === 1 ? 420 : 360);
    camera.position.set(
      playerPosRef.current.x,
      playerPosRef.current.y + 2.8,
      playerPosRef.current.z + 7.5
    );
    cameraOrbitPitchRef.current = levelId === 1 ? 0.24 : 0.22;
    cameraOrbitYawRef.current = 0;
    targetCameraPitchRef.current = levelId === 1 ? 0.16 : 0.15;
    targetCameraYawRef.current = 0;
    const deckPitchIn = gsap.to(targetCameraPitchRef, {
      current: levelId === 1 ? 0.15 : 0.14,
      duration: 0.65,
      ease: 'power2.out'
    });
    const deckYawIn = gsap.to(targetCameraYawRef, {
      current: 0,
      duration: 0.65,
      ease: 'power2.out'
    });

    let earthEnv: EarthEnvironmentHandle | null = null;
    let planetEnv: PlanetEnvironmentHandle | null = null;
    const skyHandle =
      levelId === 1 || levelId === 4
        ? null
        : createCosmicSkyBackdrop(scene, theme.skyMode, { skipSatellite: levelId >= 3 });

    // Bright Biome Lighting (warm daylight sun for Earth & Mars Canyon, crisp lunar/orbital lights)
    const hemi = new THREE.HemisphereLight(
      levelId === 1 ? 0xd8f3ff : levelId === 4 ? 0xfdba74 : 0xe0f2fe,
      levelId === 1 ? 0x3b8c4a : levelId === 4 ? 0x7c2d12 : theme.rockColor,
      levelId === 1 ? 1.55 : levelId === 4 ? 1.45 : 1.45
    );
    scene.add(hemi);
    const dir = new THREE.DirectionalLight(
      levelId === 1 ? 0xfff6d6 : levelId === 4 ? 0xffdfb8 : 0xfffbeb,
      levelId === 1 ? 2.35 : levelId === 4 ? 2.25 : 2.15
    );
    dir.position.set(levelId === 1 ? 38 : 34, levelId === 1 ? 64 : 52, levelId === 1 ? 44 : 38);
    dir.castShadow = initUltraShadows;
    dir.shadow.mapSize.set(1024, 1024);
    dir.shadow.camera.near = 2;
    dir.shadow.camera.far = levelId === 2 ? 120 : 210;
    const scBound = levelId === 2 ? 42 : 82;
    dir.shadow.camera.left = -scBound;
    dir.shadow.camera.right = scBound;
    dir.shadow.camera.top = scBound;
    dir.shadow.camera.bottom = -scBound;
    dirLightRef.current = dir;
    scene.add(dir);
    const fill = new THREE.DirectionalLight(levelId === 1 ? 0x7dd3fc : theme.rimColor, 0.72);
    fill.position.set(-28, 18, -26);
    scene.add(fill);

    const rooms = levelSpec.rooms;
    const roomCount = Math.max(1, rooms.length);
    const stationSpacing = roomCount >= 4 ? 8.8 : 10.0;
    const deckWidth = roomCount >= 4 ? 38.0 : 34.0;
    const deckDepth = 15.0;
    const halfDeckX = deckWidth * 0.45;
    const islandRadius = deckWidth * 0.52;

    const disposableTextures: THREE.Texture[] = [];
    const blenderEnvGroups: THREE.Group[] = [];

    if (levelId === 1) {
      // PHASE 2 EARTH SPACEPORT VERTICAL SLICE: 320m Lush Valley + Blended Terrain & Roads + Wind-Sway Grass + Multi-Canopy Trees
      earthEnv = buildEarthEnvironment({
        scene,
        mode: 'earth_l1',
        isDisposed: () => isSceneDisposed,
        maxAnisotropy: renderer.capabilities.getMaxAnisotropy()
      });

      // Open Cantilevered Space Buggy Carport (East-side piers at x = 11.4 so rear driving camera has ZERO obstruction!)
      const gY = evalSectorFloorHeight(1, 8.6, 29.0);
      const garageParts: ColoredGeometryPart[] = [
        { geometry: new THREE.BoxGeometry(5.6, 0.14, 6.6), color: 0x334155, position: [8.6, gY + 0.04, 29.0] },
        { geometry: new THREE.BoxGeometry(0.32, 4.4, 0.36), color: 0xe2e8f0, position: [11.3, gY + 2.1, 26.2] },
        { geometry: new THREE.BoxGeometry(0.32, 4.4, 0.36), color: 0xe2e8f0, position: [11.3, gY + 2.1, 31.8] },
        { geometry: new THREE.BoxGeometry(5.8, 0.34, 6.8), color: 0xf97316, position: [8.8, gY + 4.35, 29.0] },
        { geometry: new THREE.BoxGeometry(5.2, 0.16, 0.24), color: 0x38bdf8, position: [8.8, gY + 4.18, 25.65] },
        // Scenic Central Spaceport Welcome Emblem Arch ahead of Spawn Plaza at (0, 20.5)
        { geometry: new THREE.CylinderGeometry(2.1, 2.4, 0.32, 16), color: 0x475569, position: [0, evalSectorFloorHeight(1, 0, 20.5) + 0.1, 20.5] },
        { geometry: new THREE.TorusGeometry(3.4, 0.24, 10, 24, Math.PI), color: 0x0284c7, position: [0, evalSectorFloorHeight(1, 0, 20.5) + 0.2, 20.5] },
        { geometry: new THREE.TorusGeometry(3.15, 0.10, 8, 24, Math.PI), color: 0xfacc15, position: [0, evalSectorFloorHeight(1, 0, 20.5) + 0.2, 20.5] }
      ];
      const garageMesh = new THREE.Mesh(
        mergeColoredParts(garageParts),
        new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.42, metalness: 0.28 })
      );
      garageMesh.castShadow = true;
      garageMesh.receiveShadow = true;
      scene.add(garageMesh);
    } else if (levelId === 2) {
      // PHASE 3 LEVEL 2 — ISS SUNLIT ORBITAL ATRIUM: Metallic Module Ribs, Warm Gold Handholds, Solar Wings & Curved Blue Earth
      const deckFloorColor = 0x1e293b;
      const deckParts: ColoredGeometryPart[] = [
        { geometry: new THREE.BoxGeometry(deckWidth, 0.72, deckDepth), color: deckFloorColor, position: [0, -0.36, -0.2] },
        { geometry: new THREE.BoxGeometry(deckWidth - 2.4, 0.55, deckDepth - 1.8), color: 0x0f172a, position: [0, -0.96, -0.2] },
        { geometry: new THREE.BoxGeometry(deckWidth + 0.16, 0.12, 0.24), color: theme.rimColor, position: [0, -0.02, deckDepth * 0.5 - 0.2] },
        { geometry: new THREE.BoxGeometry(deckWidth + 0.16, 0.12, 0.24), color: theme.rimColor, position: [0, -0.02, -deckDepth * 0.5 - 0.2] },
        { geometry: new THREE.CylinderGeometry(1.75, 1.9, 0.06, 20), color: 0x0f172a, position: [0, 0.02, 3.0] },
        { geometry: new THREE.TorusGeometry(1.75, 0.08, 8, 24), color: theme.rimColor, position: [0, 0.05, 3.0], rotation: [Math.PI / 2, 0, 0] }
      ];
      const deckMesh = new THREE.Mesh(
        mergeColoredParts(deckParts),
        new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.46, metalness: 0.28, flatShading: true })
      );
      deckMesh.receiveShadow = true;
      scene.add(deckMesh);

      attachSectorDeckGlb({
        levelId: 2,
        targetParent: scene,
        fallbackNodes: [deckMesh],
        isDisposed: () => isSceneDisposed,
        onLoaded: (sectorGlb) => {
          blenderEnvGroups.push(sectorGlb);
        }
      });

      planetEnv = buildIssEnvironment({
        scene,
        isDisposed: () => isSceneDisposed
      });
    } else if (levelId === 3) {
      // PHASE 3 LEVEL 3 — MOON SHACKLETON MODULAR OUTPOST (260m Lunar Crater Basin + Earthrise + Rover Tracks)
      planetEnv = buildMoonEnvironment({
        scene,
        isDisposed: () => isSceneDisposed,
        maxAnisotropy: renderer.capabilities.getMaxAnisotropy()
      });

      // Central NASA-Style Modular Lunar Habitat (moon_modular_base.glb) overlooking the lunar spawn plaza at (0, 6.0)
      const baseGroup = new THREE.Group();
      const baseY = evalSectorFloorHeight(3, 0, 6.0);
      baseGroup.position.set(0, baseY - 0.12, 6.0);
      scene.add(baseGroup);
      attachPhase3PlanetGlb({
        modelName: 'moon_modular_base',
        targetParent: baseGroup,
        scale: 1.05,
        rotationY: 0,
        isDisposed: () => isSceneDisposed,
        onLoaded: (g) => {
          blenderEnvGroups.push(g);
        }
      });
    } else {
      // PHASE 3 LEVEL 4 — MARS RED CANYON & ORION RETURN COMPLEX (260m Canyon + Dense Golden Fog + Drifting Dust)
      planetEnv = buildMarsEnvironment({
        scene,
        isDisposed: () => isSceneDisposed,
        maxAnisotropy: renderer.capabilities.getMaxAnisotropy()
      });

      // Central Mars Science Command Outpost at (0, 6.0)
      const marsBaseGroup = new THREE.Group();
      const marsBaseY = evalSectorFloorHeight(4, 0, 6.0);
      marsBaseGroup.position.set(0, marsBaseY - 0.14, 6.0);
      scene.add(marsBaseGroup);
      attachPhase3PlanetGlb({
        modelName: 'mars_return_base',
        targetParent: marsBaseGroup,
        scale: 0.96,
        rotationY: 0,
        isDisposed: () => isSceneDisposed,
        onLoaded: (g) => {
          blenderEnvGroups.push(g);
        }
      });
    }

    // Level 1 (4x4 Space Buggy), Level 3 (6-Wheel Heavy Lunar Rover), Level 4 (4x4 Martian Space Rover)
    let roverCtrl: SpaceRoverController | null = null;
    let roverBeaconRing: THREE.Mesh | null = null;
    if (levelId === 1 || levelId === 3 || levelId === 4) {
      const initRoverY = evalSectorFloorHeight(levelId, roverPosRef.current.x, roverPosRef.current.z);
      roverPosRef.current.y = initRoverY;
      roverCtrl = createSpaceRoverVehicle({
        scene,
        position: [roverPosRef.current.x, initRoverY, roverPosRef.current.z],
        rotationY: roverYawRef.current,
        variant: levelId === 3 ? 'lunar_6x6' : 'buggy_4x4',
        isDisposed: () => isSceneDisposed
      });

      roverBeaconRing = new THREE.Mesh(
        new THREE.TorusGeometry(1.75, 0.08, 8, 28),
        new THREE.MeshBasicMaterial({
          color: levelId === 1 ? 0x38bdf8 : levelId === 3 ? 0x38bdf8 : 0xfbbf24,
          transparent: true,
          opacity: 0.82
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
      const now = performance.now();
      const next = !isDrivingRoverRef.current;
      isDrivingRoverRef.current = next;
      setIsDrivingRover(next);
      walkTargetRef.current = null;
      pendingRoomRef.current = null;
      roverVelRef.current = { x: 0, z: 0 };
      roverBoostUntilRef.current = 0;
      if (next) {
        roverCtrl.setHeadlights(true);
        if (roverBeaconRing) roverBeaconRing.visible = false;
        playerPosRef.current.copy(roverPosRef.current);
        kinematicsRef.current = createKinematicsState(
          roverPosRef.current.x,
          roverPosRef.current.y,
          roverPosRef.current.z,
          now
        );
      } else {
        roverCtrl.setHeadlights(false);
        if (roverBeaconRing) roverBeaconRing.visible = true;
        const sideX = roverPosRef.current.x + Math.cos(roverYawRef.current) * 2.15;
        const sideZ = roverPosRef.current.z - Math.sin(roverYawRef.current) * 2.15;
        const sideY = evalSectorFloorHeight(levelId, sideX, sideZ);
        playerPosRef.current.set(sideX, sideY, sideZ);
        kinematicsRef.current = createKinematicsState(sideX, sideY, sideZ, now);
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

    // Arrange Stations: Spaced-Out NASA Buildings along Spaceport Road on Level 1 (40–65m apart),
    // or Promenade Layout on Levels 2–4 (untouched for Phase 3)
    const clickTargets: { group: THREE.Group; room: SpatialRoomNode; entrySpot: THREE.Vector3; pos: THREE.Vector3 }[] = [];
    const kioskTargets: {
      group: THREE.Group;
      fact: SpaceDiscoveryFact;
      pos: THREE.Vector3;
    }[] = [];

    const positionedRooms: PositionedRoom[] = rooms.map((room, idx) => {
      if (levelId === 1) {
        const pad = EARTH_L1_PADS.find((p) => p.id === room.id);
        const bSpec = EARTH_L1_BUILDING_SPEC[room.id];
        if (pad && bSpec) {
          const py = evalSectorFloorHeight(1, pad.x, pad.z);
          const rotY = Math.atan2((pad.facingX ?? 0) - pad.x, (pad.facingZ ?? 0) - pad.z);
          const ex = pad.x + Math.sin(rotY) * bSpec.entryDist;
          const ez = pad.z + Math.cos(rotY) * bSpec.entryDist;
          const ey = evalSectorFloorHeight(1, ex, ez);
          return {
            room,
            pos: new THREE.Vector3(pad.x, py, pad.z),
            entrySpot: new THREE.Vector3(ex, ey, ez),
            yawToCenter: rotY
          };
        }
      } else if (levelId === 3 || levelId === 4) {
        const pads = levelId === 3 ? MOON_L3_PADS : MARS_L4_PADS;
        const pad = pads.find((p) => p.id === room.id);
        if (pad) {
          const py = evalSectorFloorHeight(levelId, pad.x, pad.z);
          const rotY = Math.atan2((pad.facingX ?? 0) - pad.x, (pad.facingZ ?? 0) - pad.z);
          const isGrandOutpost =
            room.id === 'lunar_exploration_zone' || room.id === 'central_corridor';
          const entryDist = isGrandOutpost ? 8.8 : 4.2;
          const ex = pad.x + Math.sin(rotY) * entryDist;
          const ez = pad.z + Math.cos(rotY) * entryDist;
          const ey = evalSectorFloorHeight(levelId, ex, ez);
          return {
            room,
            pos: new THREE.Vector3(pad.x, py, pad.z),
            entrySpot: new THREE.Vector3(ex, ey, ez),
            yawToCenter: rotY
          };
        }
      }
      const rx = (idx - (roomCount - 1) / 2) * stationSpacing;
      const rz = -3.4;
      return {
        room,
        pos: new THREE.Vector3(rx, 0, rz),
        entrySpot: new THREE.Vector3(rx, 0, rz + 2.65),
        yawToCenter: 0
      };
    });

    const isSpacedWorld = levelId === 1 || levelId === 3 || levelId === 4;
    const portalRingsInst = new THREE.InstancedMesh(
      new THREE.TorusGeometry(isSpacedWorld ? 1.25 : 0.76, isSpacedWorld ? 0.14 : 0.11, 10, 24, Math.PI * 1.15),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.45, roughness: 0.25 }),
      roomCount
    );
    const curtainsInst = new THREE.InstancedMesh(
      new THREE.CircleGeometry(isSpacedWorld ? 1.12 : 0.68, 20),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.34, side: THREE.DoubleSide }),
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
    const padBatchParts: ColoredGeometryPart[] = [];
    const stationObstacles: CircleObstacle[] = [];
    if (levelId === 3 || levelId === 4) {
      // Central Habitat Outpost obstacle at (0, 6.0)
      stationObstacles.push({ x: 0, z: 6.0, radius: 6.6 });
    }

    positionedRooms.forEach(({ room, pos, entrySpot, yawToCenter }, idx) => {
      const completed = isRoomCompleted(room);
      const isActive = !seqTarget.isAllDone && seqTarget.activeRoom?.id === room.id;
      const locked = !completed && !isActive && !isDemoMode;

      const stationRoot = new THREE.Group();
      stationRoot.position.copy(pos);
      scene.add(stationRoot);

      const padColor = completed ? 0x065f46 : isActive ? 0x1e3a8a : locked ? 0x1e293b : 0x0f172a;
      const ringHex = completed ? '#10b981' : isActive ? '#facc15' : locked ? '#475569' : room.accentHex;
      const ringCol = new THREE.Color(ringHex);

      if (levelId === 1) {
        const bSpec = EARTH_L1_BUILDING_SPEC[room.id] || {
          modelName: 'earth_kitchen_dome',
          scale: 1.05,
          obstacleRadius: 5.4,
          entryDist: 8.6,
          labelY: 7.4
        };

        // Entry beacon pad right on the Spaceport Road approach
        padBatchParts.push(
          { geometry: new THREE.CylinderGeometry(2.15, 2.35, 0.14, 24), color: padColor, position: [entrySpot.x, entrySpot.y + 0.04, entrySpot.z] },
          { geometry: new THREE.TorusGeometry(2.12, 0.11, 8, 28), color: ringCol.getHex(), position: [entrySpot.x, entrySpot.y + 0.14, entrySpot.z], rotation: [Math.PI / 2, 0, 0] }
        );

        const fallbackBuilding = new THREE.Mesh(
          new THREE.BoxGeometry(5.5, 4.2, 5.5),
          new THREE.MeshStandardMaterial({
            color: locked ? 0x64748b : new THREE.Color(room.accentHex),
            roughness: 0.5
          })
        );
        fallbackBuilding.position.set(0, 2.0, 0);
        stationRoot.add(fallbackBuilding);

        attachEarthBuildingGlb({
          modelName: bSpec.modelName,
          targetParent: stationRoot,
          scale: bSpec.scale,
          position: [0, -0.14, 0],
          rotationY: yawToCenter,
          fallbackNodes: [fallbackBuilding],
          isDisposed: () => isSceneDisposed,
          onLoaded: (g) => {
            blenderEnvGroups.push(g);
          }
        });

        const roomLbl = getRoomLabel(room, language);
        const stepPrefix = `${idx + 1}. `;
        const titleStr = locked
          ? `🔒 ${stepPrefix}${roomLbl.title}`
          : isActive
          ? `🎯 ${stepPrefix}${roomLbl.title}`
          : completed
          ? `✅ ${stepPrefix}${roomLbl.title}`
          : `${stepPrefix}${roomLbl.title}`;
        const { sprite, texture } = createFloatingLabelSprite(
          titleStr,
          room.icon,
          locked ? '#64748b' : isActive ? '#facc15' : room.accentHex,
          completed
        );
        sprite.position.set(0, bSpec.labelY, 0);
        sprite.scale.set(7.6, 1.9, 1);
        stationRoot.add(sprite);
        disposableTextures.push(texture);

        const portalWorldPos = new THREE.Vector3(entrySpot.x, entrySpot.y + 1.35, entrySpot.z);
        const exclPos = new THREE.Vector3(pos.x, pos.y + bSpec.labelY + 1.85, pos.z);
        portalMeta.push({ basePos: portalWorldPos, exclPos, yaw: yawToCenter, completed, isActive });
        stationObstacles.push({ x: pos.x, z: pos.z, radius: bSpec.obstacleRadius });
      } else if (levelId === 3 || levelId === 4) {
        const isGrandOutpost =
          room.id === 'lunar_exploration_zone' || room.id === 'central_corridor';
        const labelY = isGrandOutpost ? 8.8 : 4.8;
        const obstacleRadius = isGrandOutpost ? 6.2 : 2.6;

        padBatchParts.push(
          { geometry: new THREE.CylinderGeometry(2.15, 2.35, 0.14, 24), color: padColor, position: [entrySpot.x, entrySpot.y + 0.04, entrySpot.z] },
          { geometry: new THREE.TorusGeometry(2.12, 0.11, 8, 28), color: ringCol.getHex(), position: [entrySpot.x, entrySpot.y + 0.14, entrySpot.z], rotation: [Math.PI / 2, 0, 0] }
        );

        const fallbackBuilding = new THREE.Mesh(
          new THREE.BoxGeometry(isGrandOutpost ? 6.0 : 2.8, isGrandOutpost ? 4.2 : 2.4, isGrandOutpost ? 6.0 : 2.4),
          new THREE.MeshStandardMaterial({
            color: locked ? 0x64748b : new THREE.Color(room.accentHex),
            roughness: 0.5
          })
        );
        fallbackBuilding.position.set(0, 1.4, 0);
        stationRoot.add(fallbackBuilding);

        if (isGrandOutpost) {
          attachPhase3PlanetGlb({
            modelName: levelId === 3 ? 'moon_modular_base' : 'mars_return_base',
            targetParent: stationRoot,
            scale: 1.0,
            position: [0, -0.14, 0],
            rotationY: yawToCenter,
            fallbackNodes: [fallbackBuilding],
            isDisposed: () => isSceneDisposed,
            onLoaded: (g) => {
              blenderEnvGroups.push(g);
            }
          });
        } else {
          // Grounded Sci-Fi Lunar / Martian Station Plinth + Station Prop GLB
          padBatchParts.push(
            { geometry: new THREE.CylinderGeometry(3.2, 3.6, 0.36, 20), color: levelId === 3 ? 0x334155 : 0x7c2d12, position: [pos.x, pos.y + 0.06, pos.z] },
            { geometry: new THREE.TorusGeometry(3.15, 0.09, 8, 28), color: ringCol.getHex(), position: [pos.x, pos.y + 0.25, pos.z], rotation: [Math.PI / 2, 0, 0] }
          );
          attachStationPropGlb({
            propKey: room.propModel,
            targetParent: stationRoot,
            scale: 2.05,
            position: [0, 0.24, 0],
            rotationY: yawToCenter,
            fallbackNodes: [fallbackBuilding],
            isDisposed: () => isSceneDisposed,
            onLoaded: (g) => {
              blenderEnvGroups.push(g);
            }
          });
        }

        const roomLbl = getRoomLabel(room, language);
        const stepPrefix = `${idx + 1}. `;
        const titleStr = locked
          ? `🔒 ${stepPrefix}${roomLbl.title}`
          : isActive
          ? `🎯 ${stepPrefix}${roomLbl.title}`
          : completed
          ? `✅ ${stepPrefix}${roomLbl.title}`
          : `${stepPrefix}${roomLbl.title}`;
        const { sprite, texture } = createFloatingLabelSprite(
          titleStr,
          room.icon,
          locked ? '#64748b' : isActive ? '#facc15' : room.accentHex,
          completed
        );
        sprite.position.set(0, labelY, 0);
        sprite.scale.set(7.4, 1.85, 1);
        stationRoot.add(sprite);
        disposableTextures.push(texture);

        const portalWorldPos = new THREE.Vector3(entrySpot.x, entrySpot.y + 1.35, entrySpot.z);
        const exclPos = new THREE.Vector3(pos.x, pos.y + labelY + 1.8, pos.z);
        portalMeta.push({ basePos: portalWorldPos, exclPos, yaw: yawToCenter, completed, isActive });
        stationObstacles.push({ x: pos.x, z: pos.z, radius: obstacleRadius });
      } else {
        // Level 2 ISS Orbital Atrium Pedestal & Prop Placement
        padBatchParts.push(
          { geometry: new THREE.CylinderGeometry(2.52, 2.86, 0.035, 22), color: 0x030d1c, position: [pos.x, 0.018, pos.z] },
          { geometry: new THREE.CylinderGeometry(2.30, 2.52, 0.08, 22), color: 0x07223a, position: [pos.x, 0.045, pos.z] },
          { geometry: new THREE.CylinderGeometry(2.15, 2.34, 0.20, 20), color: padColor, position: [pos.x, 0.11, pos.z] },
          { geometry: new THREE.CylinderGeometry(1.24, 1.46, 0.215, 18), color: 0x041122, position: [pos.x, 0.115, pos.z - 0.12] },
          { geometry: new THREE.TorusGeometry(2.18, 0.08, 8, 28), color: ringCol.getHex(), position: [pos.x, 0.23, pos.z], rotation: [Math.PI / 2, 0, 0] }
        );

        const fallbackProp = new THREE.Mesh(
          new THREE.BoxGeometry(1.5, 1.35, 0.9),
          new THREE.MeshStandardMaterial({
            color: locked ? 0x475569 : new THREE.Color(room.accentHex),
            roughness: 0.45
          })
        );
        fallbackProp.position.set(0, 0.88, -0.1);
        stationRoot.add(fallbackProp);

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
        stationObstacles.push({ x: pos.x, z: pos.z - 0.15, radius: 1.35 });
      }

      portalRingsInst.setColorAt(idx, ringCol);
      curtainsInst.setColorAt(idx, ringCol);

      if (isActive) {
        activeTargetWorldPos = isSpacedWorld ? entrySpot.clone() : pos.clone();
        activeEntryRef.current = { room, entrySpot: entrySpot.clone() };
      }
      clickTargets.push({ group: stationRoot, room, entrySpot, pos });
    });

    if (portalRingsInst.instanceColor) portalRingsInst.instanceColor.needsUpdate = true;
    if (curtainsInst.instanceColor) curtainsInst.instanceColor.needsUpdate = true;
    scene.add(portalRingsInst, curtainsInst, exclInst);

    // Side Space-Discovery Learning Kiosks along scenic Earth L1, Moon L3 & Mars L4 paths
    const activeKioskPlacements =
      levelId === 1 && earthEnv
        ? earthEnv.layout.kiosks
        : (levelId === 3 || levelId === 4) && planetEnv?.layout
        ? planetEnv.layout.kiosks
        : [];
    const activeKioskCatalog =
      levelId === 1 ? EARTH_L1_KIOSKS : levelId === 3 ? MOON_L3_KIOSKS : MARS_L4_KIOSKS;

    activeKioskPlacements.forEach((kp) => {
      const fact = activeKioskCatalog.find((f) => f.id === kp.id);
      if (!fact) return;
      const kioskRoot = new THREE.Group();
      kioskRoot.position.set(kp.x, kp.y, kp.z);
      scene.add(kioskRoot);

      const kFallback = new THREE.Mesh(
        new THREE.BoxGeometry(1.8, 2.2, 0.9),
        new THREE.MeshStandardMaterial({ color: 0x0ea5e9, roughness: 0.45 })
      );
      kFallback.position.set(0, 1.1, 0);
      kioskRoot.add(kFallback);

      attachEarthBuildingGlb({
        modelName: 'earth_discovery_kiosk',
        targetParent: kioskRoot,
        scale: 1.05,
        position: [0, 0, 0],
        rotationY: kp.rotY,
        fallbackNodes: [kFallback],
        isDisposed: () => isSceneDisposed,
        onLoaded: (g) => {
          blenderEnvGroups.push(g);
        }
      });

      const { sprite, texture } = createFloatingLabelSprite(
        tr(language, 'Fun Space Fact +15⭐', 'معلومة فضاء +15⭐'),
        fact.badgeIcon,
        '#38bdf8',
        false
      );
      sprite.position.set(0, 4.2, 0);
      sprite.scale.set(5.2, 1.3, 1);
      kioskRoot.add(sprite);
      disposableTextures.push(texture);

      stationObstacles.push({ x: kp.x, z: kp.z, radius: 1.5 });
      kioskTargets.push({ group: kioskRoot, fact, pos: new THREE.Vector3(kp.x, kp.y, kp.z) });
    });

    const signboardsBatch =
      signboardItems.length > 0 ? createCourtyardSignboardsMesh(signboardItems) : null;
    if (signboardsBatch) {
      scene.add(signboardsBatch.mesh);
      disposableTextures.push(signboardsBatch.texture);
    }

    const courtyardBuildingsMesh: THREE.Mesh | null = null;

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

    // Articulated Robo Character wearing SPACE-FIT X IVA Suit
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
      if ((k === ' ' || e.code === 'Space') && !e.repeat) jumpHandlerRef.current();
      if (k === 'e' || k === 'enter') enterCurrentRoom();
      if (k === 'r' && (levelId === 1 || levelId === 3 || levelId === 4)) roverToggleHandlerRef.current();
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

    const handleViewportTap = (clientX: number, clientY: number) => {
      const rect = domEl.getBoundingClientRect();
      pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointerNdc, camera);

      if (kioskTargets.length > 0) {
        const kHits = raycaster.intersectObjects(kioskTargets.map((kt) => kt.group), true);
        if (kHits.length > 0) {
          const hitObj = kHits[0].object;
          const matchedKiosk = kioskTargets.find((kt) => {
            let p: THREE.Object3D | null = hitObj;
            while (p) {
              if (p === kt.group) return true;
              p = p.parent;
            }
            return false;
          });
          if (matchedKiosk) {
            soundManager.playClick();
            const res = markFactDiscovered(matchedKiosk.fact.id);
            activeKioskIdRef.current = matchedKiosk.fact.id;
            suppressedKioskIdRef.current = null;
            setActiveKioskFact(matchedKiosk.fact);
            if (res.newlyDiscovered) {
              soundManager.playDropSuccess();
              setKioskBonusBanner(`+${matchedKiosk.fact.starReward} ⭐`);
              window.setTimeout(() => setKioskBonusBanner(null), 2600);
            }
            return;
          }
        }
      }

      const intersectables: THREE.Object3D[] = clickTargets.map((ct) => ct.group);
      if (courtyardBuildingsMesh) intersectables.push(courtyardBuildingsMesh);
      if (signboardsBatch) intersectables.push(signboardsBatch.mesh);
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
        if (!found && (hitObj === courtyardBuildingsMesh || (signboardsBatch && hitObj === signboardsBatch.mesh))) {
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
          const checkTarget = isSpacedWorld ? found.entrySpot : found.pos;
          const d = playerPosRef.current.distanceTo(checkTarget);
          if (d < 5.0) {
            onEnterRoomRef.current(found.room);
          } else {
            walkTargetRef.current = found.entrySpot.clone();
            pendingRoomRef.current = found.room;
          }
        }
      }
    };
    viewportTapHandlerRef.current = handleViewportTap;

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
      handleViewportTap(e.clientX, e.clientY);
    };

    const onPointerCancel = (e: PointerEvent) => {
      if (activeLookPointerId !== e.pointerId) return;
      activeLookPointerId = null;
      activeLookRef.current = false;
    };

    domEl.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerCancel);

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

      const dampRate = 6.0 + (1.0 - displaySettingsRef.current.cameraSmoothness) * 18.0;
      const dampAlpha = 1 - Math.exp(-dampRate * dt);
      cameraOrbitYawRef.current = lerpAngle(cameraOrbitYawRef.current, targetCameraYawRef.current, dampAlpha);
      cameraOrbitPitchRef.current += (targetCameraPitchRef.current - cameraOrbitPitchRef.current) * dampAlpha;

      skyHandle?.update(elapsed);
      earthEnv?.update(elapsed, camera.position);
      planetEnv?.update(elapsed);
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
      const k = kinematicsRef.current;
      const sprint = isSprintingRef.current || keysDown.has('shift');
      const inMag = Math.min(1, Math.hypot(ix, iz));
      let moveSpeed = 0;
      let isAirborneAnim = false;
      let isLandingAnim = false;
      let activeSteerAngle = 0;
      const maxWalkRadius = islandRadius - 1.4;
      const minX =
        levelId === 1
          ? EARTH_L1_PLAY_BOUNDS.minX
          : levelId === 3
          ? MOON_L3_PLAY_BOUNDS.minX
          : levelId === 4
          ? MARS_L4_PLAY_BOUNDS.minX
          : -22;
      const maxX =
        levelId === 1
          ? EARTH_L1_PLAY_BOUNDS.maxX
          : levelId === 3
          ? MOON_L3_PLAY_BOUNDS.maxX
          : levelId === 4
          ? MARS_L4_PLAY_BOUNDS.maxX
          : 22;
      const minZ =
        levelId === 1
          ? EARTH_L1_PLAY_BOUNDS.minZ
          : levelId === 3
          ? MOON_L3_PLAY_BOUNDS.minZ
          : levelId === 4
          ? MARS_L4_PLAY_BOUNDS.minZ
          : -8.5;
      const maxZ =
        levelId === 1
          ? EARTH_L1_PLAY_BOUNDS.maxZ
          : levelId === 3
          ? MOON_L3_PLAY_BOUNDS.maxZ
          : levelId === 4
          ? MARS_L4_PLAY_BOUNDS.maxZ
          : 8.5;
      void halfDeckX;
      void maxWalkRadius;

      if (isDrivingRoverRef.current && roverCtrl) {
        const rPos = roverPosRef.current;
        const roverBoosting = sprint || now < roverBoostUntilRef.current;
        let steerAngle = 0;
        if (inMag > 0.08) {
          walkTargetRef.current = null;
          pendingRoomRef.current = null;
          const len = Math.hypot(ix, iz);
          const nx = ix / len;
          const nz = iz / len;
          const worldDirX = rightX * nx + forwardX * (-nz);
          const worldDirZ = rightZ * nx + forwardZ * (-nz);
          const maxSpd = (roverBoosting ? 24.5 : 16.5) * inMag;

          const { speed } = stepSmoothHorizontalVelocity(
            roverVelRef.current,
            worldDirX * maxSpd,
            worldDirZ * maxSpd,
            dt,
            10,
            7
          );
          roverSpeedRef.current = speed;
          rPos.x += roverVelRef.current.x * dt;
          rPos.z += roverVelRef.current.z * dt;
          const targetYaw = Math.atan2(worldDirX, worldDirZ);
          const diff = Math.atan2(Math.sin(targetYaw - roverYawRef.current), Math.cos(targetYaw - roverYawRef.current));
          steerAngle = Math.max(-0.42, Math.min(0.42, diff * 0.65));
          roverYawRef.current = lerpAngle(roverYawRef.current, targetYaw, 1 - Math.exp(-8.5 * dt));
        } else if (walkTargetRef.current) {
          const dx = walkTargetRef.current.x - rPos.x;
          const dz = walkTargetRef.current.z - rPos.z;
          const dist = Math.hypot(dx, dz);
          if (dist > 2.4) {
            const worldDirX = dx / dist;
            const worldDirZ = dz / dist;
            const { speed } = stepSmoothHorizontalVelocity(
              roverVelRef.current,
              worldDirX * 20.5,
              worldDirZ * 20.5,
              dt,
              10,
              7
            );
            roverSpeedRef.current = speed;
            rPos.x += roverVelRef.current.x * dt;
            rPos.z += roverVelRef.current.z * dt;
            const targetYaw = Math.atan2(worldDirX, worldDirZ);
            const diff = Math.atan2(Math.sin(targetYaw - roverYawRef.current), Math.cos(targetYaw - roverYawRef.current));
            steerAngle = Math.max(-0.42, Math.min(0.42, diff * 0.65));
            roverYawRef.current = lerpAngle(roverYawRef.current, targetYaw, 1 - Math.exp(-8.5 * dt));
          } else {
            walkTargetRef.current = null;
            roverVelRef.current = { x: 0, z: 0 };
            roverSpeedRef.current = 0;
            const enterRoom = pendingRoomRef.current;
            pendingRoomRef.current = null;
            if (enterRoom) onEnterRoomRef.current(enterRoom);
          }
        } else {
          const { speed } = stepSmoothHorizontalVelocity(roverVelRef.current, 0, 0, dt, 10, 7);
          roverSpeedRef.current = speed;
          rPos.x += roverVelRef.current.x * dt;
          rPos.z += roverVelRef.current.z * dt;
        }

        resolveCircleObstacles(rPos, roverVelRef.current, 1.35, stationObstacles);
        rPos.x = Math.max(minX, Math.min(maxX, rPos.x));
        rPos.z = Math.max(minZ, Math.min(maxZ, rPos.z));
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
        activeSteerAngle = steerAngle;

        pos.copy(rPos);
        k.x = rPos.x;
        k.y = rPos.y;
        k.z = rPos.z;
        k.vx = roverVelRef.current.x;
        k.vz = roverVelRef.current.z;
        k.vy = 0;
        k.grounded = true;
        k.lastGroundedMs = now;
        moveSpeed = roverSpeedRef.current;

        if (moveSpeed > 2.2) {
          roverDustTimerRef.current += dt;
          if (roverDustTimerRef.current >= (roverBoosting ? 0.055 : 0.085)) {
            roverDustTimerRef.current = 0;
            const bSin = Math.sin(roverYawRef.current);
            const bCos = Math.cos(roverYawRef.current);
            dustSystem.emit(
              rPos.x - bSin * 1.15,
              rPos.y + 0.14,
              rPos.z - bCos * 1.15,
              biomeDustColor,
              Math.max(1, Math.round((roverBoosting ? 5 : 3) * qCfg.particleDensity)),
              roverBoosting ? 2.1 : 1.6
            );
          }
        }
      } else {
        let dirX = 0;
        let dirZ = 0;
        let inputMag = 0;
        let stepMaxSpeed = sprint ? 12.2 : 8.2;

        if (inMag > 0.08) {
          walkTargetRef.current = null;
          pendingRoomRef.current = null;
          const len = Math.hypot(ix, iz);
          const nx = ix / len;
          const nz = iz / len;
          dirX = rightX * nx + forwardX * (-nz);
          dirZ = rightZ * nx + forwardZ * (-nz);
          inputMag = inMag;
          const targetYaw = Math.atan2(dirX, dirZ);
          hero.group.rotation.y = lerpAngle(hero.group.rotation.y, targetYaw, 1 - Math.exp(-15 * dt));
        } else if (walkTargetRef.current) {
          const dx = walkTargetRef.current.x - k.x;
          const dz = walkTargetRef.current.z - k.z;
          const dist = Math.hypot(dx, dz);
          if (dist > 0.75) {
            dirX = dx / dist;
            dirZ = dz / dist;
            inputMag = 1;
            stepMaxSpeed = levelId === 1 ? 15.5 : 9.4;
            const targetYaw = Math.atan2(dirX, dirZ);
            hero.group.rotation.y = lerpAngle(hero.group.rotation.y, targetYaw, 1 - Math.exp(-15 * dt));
          } else {
            walkTargetRef.current = null;
            k.vx = 0;
            k.vz = 0;
            const enterRoom = pendingRoomRef.current;
            pendingRoomRef.current = null;
            if (enterRoom) onEnterRoomRef.current(enterRoom);
          }
        }

        const res = stepThirdPersonKinematics(k, {
          dt,
          nowMs: now,
          inputWorldDirX: dirX,
          inputWorldDirZ: dirZ,
          inputMagnitude: inputMag,
          maxSpeed: stepMaxSpeed,
          gravity: theme.gravity,
          jumpVel: theme.jumpVel,
          isZeroG: theme.isZeroG,
          evalFloorY: (x, z) => evalSectorFloorHeight(levelId, x, z),
          clampXZ: (x, z) => ({
            x: Math.max(minX, Math.min(maxX, x)),
            z: Math.max(minZ, Math.min(maxZ, z))
          }),
          obstacles: stationObstacles,
          playerRadius: 0.55
        });

        pos.set(k.x, k.y, k.z);
        moveSpeed = res.speed;
        isAirborneAnim = res.isAirborne;
        isLandingAnim = res.isLanding;

        const puffCount = Math.max(1, Math.round((levelId >= 3 ? 8 : 5) * qCfg.particleDensity));
        if (res.jumped) {
          soundManager.playClick();
          dustSystem.emit(
            k.x,
            k.y,
            k.z,
            biomeDustColor,
            Math.max(1, Math.round(4 * qCfg.particleDensity)),
            1.3
          );
        }
        if (res.landed) {
          dustSystem.emit(k.x, k.y, k.z, biomeDustColor, puffCount, 1.8);
        } else if (sprint && k.grounded && moveSpeed > 3.5) {
          sprintDustTimerRef.current += dt;
          if (sprintDustTimerRef.current >= 0.14) {
            sprintDustTimerRef.current = 0;
            dustSystem.emit(
              k.x,
              k.y,
              k.z,
              biomeDustColor,
              Math.max(1, Math.round(2 * qCfg.particleDensity)),
              0.9
            );
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

      // Discovery Kiosk Proximity Popup on Earth Level 1
      if (kioskTargets.length > 0) {
        let nearKiosk: (typeof kioskTargets)[number] | null = null;
        let nearDist = Infinity;
        for (const kt of kioskTargets) {
          const kd = Math.hypot(pos.x - kt.pos.x, pos.z - kt.pos.z);
          if (kd < nearDist) {
            nearDist = kd;
            nearKiosk = kt;
          }
        }
        if (nearKiosk && nearDist < 4.4) {
          if (
            activeKioskIdRef.current !== nearKiosk.fact.id &&
            suppressedKioskIdRef.current !== nearKiosk.fact.id
          ) {
            activeKioskIdRef.current = nearKiosk.fact.id;
            setActiveKioskFact(nearKiosk.fact);
            const res = markFactDiscovered(nearKiosk.fact.id);
            if (res.newlyDiscovered) {
              soundManager.playDropSuccess();
              setKioskBonusBanner(`+${nearKiosk.fact.starReward} ⭐`);
              window.setTimeout(() => setKioskBonusBanner(null), 2600);
            }
          }
        } else if (suppressedKioskIdRef.current && nearDist > 8.5) {
          suppressedKioskIdRef.current = null;
        }
      }

      // Find Nearest Station Building Portal
      let closestRoom: SpatialRoomNode | null = null;
      let closestDist = Infinity;
      positionedRooms.forEach((pr) => {
        const refPt = isSpacedWorld ? pr.entrySpot : pr.pos;
        const d = Math.hypot(pos.x - refPt.x, pos.z - refPt.z);
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
        k.grounded &&
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

      if (roverBeaconRing) {
        roverBeaconRing.visible = !isDrivingRoverRef.current;
      }

      if (isDrivingRoverRef.current && roverCtrl) {
        roverCtrl.getSeatWorldTransform(hero.group.position, hero.group.quaternion);
        hero.update({
          t: elapsed,
          moveSpeed: 0,
          isRunning: false,
          isJumping: false,
          isLanding: false,
          isZeroG: false,
          isSeated: true,
          isDriving: true,
          steerAngle: activeSteerAngle,
          suitState: suitStateRef.current,
          idleSeconds: 0,
          emote: 'none'
        });
      } else {
        hero.group.position.copy(pos);
        hero.group.rotation.x = 0;
        hero.group.rotation.z = 0;
        hero.update({
          t: elapsed,
          moveSpeed,
          isRunning: sprint && moveSpeed > 0.1,
          isJumping: isAirborneAnim,
          isLanding: isLandingAnim,
          isZeroG: theme.isZeroG,
          isSeated: false,
          isDriving: false,
          steerAngle: 0,
          suitState: suitStateRef.current,
          idleSeconds,
          emote: activeEmote
        });
      }

      // Floor directional guide arrow pointing toward current active step target
      const currentGroundY = evalSectorFloorHeight(levelId, pos.x, pos.z);
      floorArrowSystem.update(pos, activeTargetWorldPos, currentGroundY + 0.14, elapsed);

      // Auto-Follow Close Over-the-Shoulder Third-Person Camera (pauses 2.2s after manual look drag)
      if (moveSpeed > 0.25 && !activeLookRef.current && now - lastManualLookMsRef.current > 2200) {
        const refYaw = isDrivingRoverRef.current ? roverYawRef.current : hero.group.rotation.y;
        const behindPlayerYaw = refYaw + Math.PI;
        targetCameraYawRef.current = lerpAngle(
          targetCameraYawRef.current,
          behindPlayerYaw,
          1 - Math.exp(-3.0 * dt)
        );
      }

      const followYaw = cameraOrbitYawRef.current;
      const camDist = isDrivingRoverRef.current ? 6.8 : 5.0;
      const horizDist = camDist * Math.cos(cameraOrbitPitchRef.current);
      const camHeight = 1.4 + camDist * Math.sin(cameraOrbitPitchRef.current);
      const desiredCamX = pos.x + Math.sin(followYaw) * horizDist;
      const desiredCamZ = pos.z + Math.cos(followYaw) * horizDist;
      const minGroundCamY = evalSectorFloorHeight(levelId, desiredCamX, desiredCamZ) + 0.9;
      const desiredCamY = Math.max(pos.y + camHeight, minGroundCamY);

      camera.position.x = dampValue(camera.position.x, desiredCamX, 14, dt);
      camera.position.y = dampValue(camera.position.y, desiredCamY, 14, dt);
      camera.position.z = dampValue(camera.position.z, desiredCamZ, 14, dt);
      const lookFwdX = -Math.sin(followYaw) * 1.15;
      const lookFwdZ = -Math.cos(followYaw) * 1.15;
      const targetLookY = Math.max(pos.y + 1.55, minGroundCamY - 0.25);
      camera.lookAt(pos.x + lookFwdX, targetLookY, pos.z + lookFwdZ);

      renderer.render(scene, camera);
      mount.dataset.drawCalls = String(renderer.info.render.calls);
      mount.dataset.idleBored = isBoredIdle ? 'true' : 'false';
      mount.dataset.idleSeconds = String(Math.floor(idleSeconds));
      mount.dataset.glbLoaded = getLoadedGlbUrls().join(',');
      mount.dataset.roverActive = isDrivingRoverRef.current ? 'true' : 'false';
      mount.dataset.cameraYaw = cameraOrbitYawRef.current.toFixed(3);
      mount.dataset.cameraPitch = cameraOrbitPitchRef.current.toFixed(3);
      mount.dataset.playerY = pos.y.toFixed(3);
      mount.dataset.playerVelY = k.vy.toFixed(3);
      mount.dataset.playerSpeed = moveSpeed.toFixed(3);
      mount.dataset.playerGrounded = k.grounded ? 'true' : 'false';
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
      window.removeEventListener('pointercancel', onPointerCancel);
      window.removeEventListener('resize', handleResize);
      if (resizeObs) resizeObs.disconnect();

      skyHandle?.dispose();
      earthEnv?.dispose();
      planetEnv?.dispose();
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

      {/* Side Discovery Kiosk Fun Space Fact Card (Compact, Non-Blocking, Zero Scroll) */}
      {activeKioskFact && (
        <div
          data-testid="discovery-kiosk-card"
          dir={language === 'ar' ? 'rtl' : 'ltr'}
          className="fixed top-12 right-2.5 sm:right-4 z-30 w-[calc(100vw-20px)] max-w-xs sm:max-w-sm rounded-2xl bg-slate-950/92 border-2 border-cyan-400/80 p-3 shadow-2xl backdrop-blur-md text-white"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-2xl shrink-0">{activeKioskFact.badgeIcon}</span>
              <div className="min-w-0">
                <div className="font-hud font-black text-xs sm:text-sm text-cyan-200 truncate">
                  {tr(language, activeKioskFact.titleEn, activeKioskFact.titleAr)}
                </div>
                <div className="text-[10px] font-bold text-amber-300">
                  🛰️ {activeKioskFact.nasaSource} {kioskBonusBanner ? `• ${kioskBonusBanner}` : ''}
                </div>
              </div>
            </div>
            <button
              type="button"
              data-testid="close-kiosk-card-btn"
              onClick={() => {
                soundManager.playClick();
                suppressedKioskIdRef.current = activeKioskFact.id;
                activeKioskIdRef.current = null;
                setActiveKioskFact(null);
              }}
              className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-black text-slate-200 cursor-pointer shrink-0"
            >
              ✕
            </button>
          </div>
          <p className="mt-1.5 text-[11px] sm:text-xs leading-snug text-slate-100">
            {tr(language, activeKioskFact.summaryEn, activeKioskFact.summaryAr)}
          </p>
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
        onLookStart={() => {
          activeLookRef.current = true;
          lastManualLookMsRef.current = performance.now();
        }}
        onLookEnd={() => {
          activeLookRef.current = false;
          lastManualLookMsRef.current = performance.now();
        }}
        onLookDrag={applyLookDelta}
        onViewportTap={(x, y) => viewportTapHandlerRef.current(x, y)}
        onJump={() => jumpHandlerRef.current()}
        jumpMode={isDrivingRover ? 'boost' : 'jump'}
        highlightInteract={Boolean(nearbyRoom && !nearbyLocked)}
        secondaryAction={
          levelId === 1 || levelId === 3 || levelId === 4
            ? {
                icon: isDrivingRover ? '🚶' : '🚙',
                label: isDrivingRover
                  ? tr(language, 'Exit Buggy (R)', 'نزول من المركبة (R)')
                  : tr(language, 'Drive Buggy (R)', 'قيادة المركبة (R)'),
                active: isDrivingRover,
                testId: 'toggle-rover-btn',
                onClick: () => roverToggleHandlerRef.current()
              }
            : undefined
        }
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
