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
  attachStationPropGlb,
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
        rockColor: 0xb45309,
        crystalColor: 0x22d3ee,
        walkwayColor: 0xd99b52,
        skyMode: 'sunny',
        gravity: 21,
        jumpVel: 8.4,
        gravityLabelAr: tr(language, 'Earth Gravity 1.0G', 'جاذبية الأرض 1G'),
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
        gravityLabelAr: tr(language, 'Zero-G Orbit 0.0G', 'انعدام الوزن 0G — طفو حر'),
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
        gravityLabelAr: tr(language, 'Lunar Gravity 0.16G — High Jump', 'جاذبية القمر 0.16G — قفزة عالية'),
        isZeroG: false,
        accentCraters: true
      };
    case 4:
    default:
      return {
        topColor: 0x0284c7,
        rimColor: 0x10b981,
        rockColor: 0x0f766e,
        crystalColor: 0x34d399,
        walkwayColor: 0xfde047,
        skyMode: 'tropical',
        gravity: 21,
        jumpVel: 8.4,
        gravityLabelAr: tr(language, 'Earth Splashdown 1.0G', 'جاذبية العودة للأرض 1G'),
        isZeroG: false,
        accentCraters: false
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
  const lastActivityMsRef = useRef(performance.now());
  const waveUntilMsRef = useRef(performance.now() + 2500);
  const celebrateUntilMsRef = useRef(0);
  const boredVoiceFiredRef = useRef(false);

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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(dims.w, dims.h);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.innerHTML = '';
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    let isSceneDisposed = false;
    const camera = new THREE.PerspectiveCamera(50, dims.w / dims.h, 0.1, 200);
    camera.position.set(-4, 13.5, 19.5);
    cameraOrbitPitchRef.current = 0.78;
    cameraOrbitYawRef.current = -0.38;
    const deckPitchIn = gsap.to(cameraOrbitPitchRef, {
      current: 0.42,
      duration: 1.35,
      ease: 'power2.out'
    });
    const deckYawIn = gsap.to(cameraOrbitYawRef, {
      current: 0,
      duration: 1.35,
      ease: 'power2.out'
    });

    const skyHandle = createCosmicSkyBackdrop(scene, theme.skyMode);

    // Bright Biome Lighting (warm daylight sun for Earth & Splashdown, crisp lunar/orbital lights)
    const hemi = new THREE.HemisphereLight(
      theme.skyMode === 'sunny' || theme.skyMode === 'tropical' ? 0xf0f9ff : 0xe0f2fe,
      theme.rockColor,
      theme.skyMode === 'sunny' ? 1.5 : 1.35
    );
    scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xfffbeb, 1.85);
    dir.position.set(16, 26, 18);
    scene.add(dir);
    const fill = new THREE.DirectionalLight(theme.rimColor, 0.72);
    fill.position.set(-16, 8, -14);
    scene.add(fill);

    // Streamlined Linear Mission Deck Promenade (3 to 4 Core Stations arranged 1 -> 2 -> 3 -> 4)
    const rooms = levelSpec.rooms;
    const roomCount = Math.max(1, rooms.length);
    const stationSpacing = roomCount >= 4 ? 7.2 : 8.4;
    const deckWidth = roomCount >= 4 ? 30.0 : 25.0;
    const deckDepth = 13.8;
    const halfDeckX = deckWidth * 0.45;
    const islandRadius = deckWidth * 0.52;

    const deckFloorColor =
      levelId === 1
        ? 0x334155
        : levelId === 2
        ? 0x1e293b
        : levelId === 3
        ? 0x475569
        : 0x1e3a5f;

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
    scene.add(deckMesh);

    const disposableTextures: THREE.Texture[] = [];
    const blenderEnvGroups: THREE.Group[] = [];

    // Subtle Distant Orbit Beacon Landmark
    let radarDishMesh: THREE.Mesh | null = null;
    if (levelId === 1 || levelId === 3) {
      radarDishMesh = new THREE.Mesh(
        mergeColoredParts([
          { geometry: new THREE.CylinderGeometry(0.16, 0.24, 1.6, 8), color: 0xe2e8f0, position: [0, 0.8, 0] },
          { geometry: new THREE.ConeGeometry(0.75, 0.35, 12), color: 0xf8fafc, position: [0, 1.75, 0], rotation: [0, 0, Math.PI * 0.65] }
        ]),
        new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.4 })
      );
      radarDishMesh.position.set(deckWidth * 0.44, 0, -5.8);
      scene.add(radarDishMesh);
    }

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

    positionedRooms.forEach(({ room, pos, yawToCenter }, idx) => {
      const completed = isRoomCompleted(room);
      const isActive = !seqTarget.isAllDone && seqTarget.activeRoom?.id === room.id;
      const locked = !completed && !isActive && !isDemoMode;

      const stationRoot = new THREE.Group();
      stationRoot.position.copy(pos);
      scene.add(stationRoot);

      // Station Illuminated Pedestal
      const padColor = completed ? 0x065f46 : isActive ? 0x1e3a8a : locked ? 0x1e293b : 0x0f172a;
      const ringHex = completed ? '#10b981' : isActive ? '#facc15' : locked ? '#475569' : room.accentHex;
      const padParts: ColoredGeometryPart[] = [
        { geometry: new THREE.CylinderGeometry(2.15, 2.38, 0.22, 18), color: padColor, position: [0, 0.11, 0] },
        { geometry: new THREE.TorusGeometry(2.18, 0.08, 8, 28), color: new THREE.Color(ringHex).getHex(), position: [0, 0.23, 0], rotation: [Math.PI / 2, 0, 0] }
      ];
      const padMesh = new THREE.Mesh(
        mergeColoredParts(padParts),
        new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.38, metalness: 0.35 })
      );
      stationRoot.add(padMesh);

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
      cameraOrbitPitchRef.current = Math.max(0.18, Math.min(0.92, cameraOrbitPitchRef.current + dy * 0.004));
    };
    const onPointerUp = (e: PointerEvent) => {
      if (!dragOrbiting) return;
      dragOrbiting = false;
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
    const biomeDustColor = levelId === 3 ? 0xe2e8f0 : levelId === 2 ? 0x818cf8 : 0xfef3c7;
    let rafId = 0;
    let lastTime = performance.now();
    const startTime = lastTime;

    const animate = (now: number) => {
      rafId = requestAnimationFrame(animate);
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      const elapsed = (now - startTime) / 1000;

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

      if (radarDishMesh) {
        radarDishMesh.rotation.y = Math.sin(elapsed * 0.85) * 1.1;
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

      if (Math.abs(ix) > 0.08 || Math.abs(iz) > 0.08) {
        walkTargetRef.current = null;
        pendingRoomRef.current = null;
        const len = Math.hypot(ix, iz);
        const nx = ix / len;
        const nz = iz / len;
        const worldDirX = rightX * nx + forwardX * (-nz);
        const worldDirZ = rightZ * nx + forwardZ * (-nz);
        const spd = sprint ? 11.4 : 7.4;

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
          const spd = 9.2;
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

      // Rectilinear Promenade Deck Containment
      pos.x = Math.max(-halfDeckX, Math.min(halfDeckX, pos.x));
      pos.z = Math.max(-5.6, Math.min(5.6, pos.z));
      void maxWalkRadius;

      // Level-Specific Gravity Physics (1G / 0G / 0.16G) + Coyote Time + Landing Dust Puffs
      if (!isGroundedRef.current || pos.y > 0.02) {
        playerVelYRef.current -= theme.gravity * dt;
        pos.y += playerVelYRef.current * dt;
        if (pos.y <= 0) {
          if (!isGroundedRef.current) {
            dustSystem.emit(pos.x, 0, pos.z, biomeDustColor, levelId === 3 ? 8 : 5, 1.8);
          }
          pos.y = 0;
          playerVelYRef.current = 0;
          isGroundedRef.current = true;
          lastGroundedMsRef.current = now;
        }
      } else {
        lastGroundedMsRef.current = now;
        if (sprint && moveSpeed > 3.5) {
          sprintDustTimerRef.current += dt;
          if (sprintDustTimerRef.current >= 0.14) {
            sprintDustTimerRef.current = 0;
            dustSystem.emit(pos.x, 0, pos.z, biomeDustColor, 2, 0.9);
          }
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
          : now < waveUntilMsRef.current && moveSpeed <= 0.1
          ? 'wave'
          : closestDist < 4.5 && closestRoom && !isRoomCompleted(closestRoom) && moveSpeed <= 0.1
          ? 'point'
          : 'none';

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

      // Floor directional guide arrow pointing toward current active step target
      floorArrowSystem.update(pos, activeTargetWorldPos, 0, elapsed);

      // Auto-Follow Third-Person Camera behind player while walking (no two-finger camera needed on mobile!)
      if (moveSpeed > 0.25 && !dragOrbiting) {
        const behindPlayerYaw = hero.group.rotation.y + Math.PI;
        cameraOrbitYawRef.current = lerpAngle(
          cameraOrbitYawRef.current,
          behindPlayerYaw,
          1 - Math.exp(-3.4 * dt)
        );
      }

      const followYaw = cameraOrbitYawRef.current;
      const camDist = 13.4;
      const horizDist = camDist * Math.cos(cameraOrbitPitchRef.current);
      const camHeight = 2.3 + camDist * Math.sin(cameraOrbitPitchRef.current);
      const desiredCamX = pos.x + Math.sin(followYaw) * horizDist;
      const desiredCamZ = pos.z + Math.cos(followYaw) * horizDist;
      const desiredCamY = pos.y + camHeight;

      camera.position.x += (desiredCamX - camera.position.x) * 0.14;
      camera.position.y += (desiredCamY - camera.position.y) * 0.14;
      camera.position.z += (desiredCamZ - camera.position.z) * 0.14;
      camera.lookAt(pos.x, pos.y + 1.45, pos.z);

      renderer.render(scene, camera);
      mount.dataset.drawCalls = String(renderer.info.render.calls);
      mount.dataset.idleBored = isBoredIdle ? 'true' : 'false';
      mount.dataset.idleSeconds = String(Math.floor(idleSeconds));
      mount.dataset.glbLoaded = getLoadedGlbUrls().join(',');
    };

    rafId = requestAnimationFrame(animate);

    return () => {
      isSceneDisposed = true;
      deckPitchIn.kill();
      deckYawIn.kill();
      gsap.killTweensOf(cameraOrbitPitchRef);
      gsap.killTweensOf(cameraOrbitYawRef);
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
