import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import { CAMPAIGN_LEVELS } from '../../data/campaignLevels';
import { CampaignLevelId, CampaignProgressState, SpaceFitXState } from '../../types/game';
import { soundManager } from '../../utils/sound';
import { initialSpaceFitXState, useGameState } from '../../context/GameContext';
import { LEVEL_TITLES_BILINGUAL } from '../../data/campaignBilingual';
import { tr } from '../../utils/i18n';
import { CheckCircle2, Lock } from 'lucide-react';
import { createCosmicSkyBackdrop } from './archipelagoPrimitives';
import { buildSpaceFitXCharacter } from './buildSpaceFitXCharacter';
import {
  animateBlenderEnvironmentGlb,
  attachBlenderPlanetsFromPack,
  attachMassiveSpaceIsland,
  attachSpaceNodeGlb,
  disposeObject3D,
  getLoadedGlbUrls,
  SpaceNodeModelKey
} from './blenderModelLoader';
import { getQualityRenderConfig, useDisplaySettings } from '../../utils/displaySettings';
import { ColoredGeometryPart, mergeColoredParts } from './threeMergeUtils';
import {
  createFloorGuideArrowSystem,
  createKinematicsState,
  dampValue,
  JUMP_BUFFER_MS,
  lerpAngle,
  queueJumpInput,
  stepThirdPersonKinematics,
  ThirdPersonKinematicsState
} from './thirdPersonPhysics';
import { ThirdPersonControlsOverlay } from './ThirdPersonControlsOverlay';
import { clampOverworldPosition, evalOverworldTerrainHeight } from './terrainMath';

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

interface TrajectoryNodeConfig {
  levelId: CampaignLevelId;
  modelKey: SpaceNodeModelKey;
  center: THREE.Vector3;
  accentColor: number;
  accentHex: string;
  enLabel: string;
  arLabel: string;
  telemetryEn: string;
  telemetryAr: string;
}

const TRAJECTORY_NODES: TrajectoryNodeConfig[] = [
  {
    levelId: 1,
    modelKey: 'earth_launchpad',
    center: new THREE.Vector3(-11.0, -0.4, 2.0),
    accentColor: 0x38bdf8,
    accentHex: '#38bdf8',
    enLabel: '1. Earth Launchpad',
    arLabel: '1. منصة الأرض',
    telemetryEn: 'Earth Surface • 1.0G',
    telemetryAr: 'سطح الأرض • 1.0G'
  },
  {
    levelId: 2,
    modelKey: 'iss_orbit_station',
    center: new THREE.Vector3(-3.8, 1.8, -1.8),
    accentColor: 0x818cf8,
    accentHex: '#818cf8',
    enLabel: '2. ISS Orbit Station',
    arLabel: '2. محطة الفضاء الدولية',
    telemetryEn: 'Low-Earth Orbit • 0.0G',
    telemetryAr: 'المدار الأرضي • 0.0G'
  },
  {
    levelId: 3,
    modelKey: 'lunar_biodome_base',
    center: new THREE.Vector3(3.8, 2.0, 1.6),
    accentColor: 0xfbbf24,
    accentHex: '#fbbf24',
    enLabel: '3. Moon Shackleton Base',
    arLabel: '3. قاعدة القمر شاكلتون',
    telemetryEn: 'Lunar South Pole • 0.16G',
    telemetryAr: 'القطب الجنوبي للقمر • 0.16G'
  },
  {
    levelId: 4,
    modelKey: 'orion_reentry_capsule',
    center: new THREE.Vector3(11.0, -0.3, -1.6),
    accentColor: 0x34d399,
    accentHex: '#34d399',
    enLabel: '4. Orion Earth Re-Entry',
    arLabel: '4. كبسولة العودة للأرض',
    telemetryEn: 'Splashdown Corridor • 1.0G',
    telemetryAr: 'ممر الهبوط بالمحيط • 1.0G'
  }
];

function createNodeLabelSprite(text: string, badgeColorHex: string, locked: boolean, completed: boolean): {
  sprite: THREE.Sprite;
  texture: THREE.CanvasTexture;
} {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const bg = locked ? 'rgba(15, 23, 42, 0.86)' : 'rgba(9, 17, 38, 0.94)';
    const border = completed ? '#34d399' : locked ? '#64748b' : badgeColorHex;

    ctx.fillStyle = bg;
    ctx.strokeStyle = border;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.roundRect(14, 18, 484, 92, 28);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = locked ? '#94a3b8' : '#f8fafc';
    ctx.font = 'bold 34px Cairo, Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 65, 450);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(3.0, 0.75, 1);
  return { sprite, texture };
}

export const WorldNavigator3D: React.FC<WorldNavigator3DProps> = ({
  campaign,
  onSelectLevel,
  suitState
}) => {
  const { language } = useGameState();
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [webglFailed, setWebglFailed] = useState(false);

  const highestUnlocked = ([...campaign.unlockedLevels].sort((a, b) => b - a)[0] || 1) as CampaignLevelId;
  const activeTargetLevelId =
    (([1, 2, 3, 4] as CampaignLevelId[]).find(
      (lid) => campaign.unlockedLevels.includes(lid) && !checkLevelCompleted(campaign, lid)
    ) || highestUnlocked) as CampaignLevelId;

  const [focusedLevel, setFocusedLevel] = useState<CampaignLevelId>(activeTargetLevelId);
  const [isFlightMode, setIsFlightMode] = useState<boolean>(false);
  const [showIdleHint, setShowIdleHint] = useState<boolean>(false);
  const [lockedToast, setLockedToast] = useState<string | null>(null);

  const onSelectLevelRef = useRef(onSelectLevel);
  onSelectLevelRef.current = onSelectLevel;
  const focusedLevelRef = useRef<CampaignLevelId>(focusedLevel);
  focusedLevelRef.current = focusedLevel;
  const unlockedLevelsRef = useRef<CampaignLevelId[]>(campaign.unlockedLevels);
  unlockedLevelsRef.current = campaign.unlockedLevels;
  const languageRef = useRef<'en' | 'ar'>(language);
  languageRef.current = language;
  const suitStateRef = useRef<SpaceFitXState | undefined>(suitState);
  suitStateRef.current = suitState;

  // Orbital auto-fly trajectory state (0..1 spline parameter along Nodes 1 -> 2 -> 3 -> 4)
  const initialIdx = Math.max(0, TRAJECTORY_NODES.findIndex((n) => n.levelId === activeTargetLevelId));
  const initNode = TRAJECTORY_NODES[initialIdx];
  const initGroundY = evalOverworldTerrainHeight(initNode.center.x, initNode.center.z + 1.65);
  const splineTRef = useRef<number>(initialIdx / 3);
  const targetSplineTRef = useRef<number>(initialIdx / 3);
  const isAutoFlyingRef = useRef<boolean>(false);
  const pendingEnterLevelRef = useRef<CampaignLevelId | null>(null);

  // Terrain Walk + Jetpack Boost + Free Orbital Flight state
  const isFlightModeRef = useRef<boolean>(false);
  const freeCraftPosRef = useRef<THREE.Vector3>(
    new THREE.Vector3(initNode.center.x, initGroundY, initNode.center.z + 1.65)
  );
  const kinematicsRef = useRef<ThirdPersonKinematicsState>(
    createKinematicsState(initNode.center.x, initGroundY, initNode.center.z + 1.65, performance.now())
  );
  const freeCraftYawRef = useRef<number>(0);
  const lockWarnCooldownRef = useRef<number>(0);
  const joystickVecRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isBoostingRef = useRef<boolean>(false);
  const ascendUntilRef = useRef<number>(0);
  const activeLookRef = useRef<boolean>(false);
  const orbitYawRef = useRef<number>(0);
  const orbitPitchRef = useRef<number>(0.22);
  const targetOrbitYawRef = useRef<number>(0);
  const targetOrbitPitchRef = useRef<number>(0.22);
  const [displaySettings] = useDisplaySettings();
  const displaySettingsRef = useRef(displaySettings);
  displaySettingsRef.current = displaySettings;
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  const celebrateUntilRef = useRef<number>(0);
  const lastActivityRef = useRef<number>(performance.now());
  const lastManualLookMsRef = useRef<number>(0);
  const viewportTapHandlerRef = useRef<(clientX: number, clientY: number) => void>(() => {});
  const toastTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const r = rendererRef.current;
    const s = sunLightRef.current;
    if (!r) return;
    const q = getQualityRenderConfig(displaySettings.graphicsQuality);
    const ultraShadows = displaySettings.graphicsQuality === 'ultra';
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, q.maxPixelRatio));
    r.shadowMap.enabled = ultraShadows;
    if (s) s.castShadow = ultraShadows;
  }, [displaySettings.graphicsQuality]);

  const applyLookDelta = (rawDx: number, rawDy: number) => {
    const now = performance.now();
    lastActivityRef.current = now;
    lastManualLookMsRef.current = now;
    const dx = Math.max(-120, Math.min(120, rawDx));
    const dy = Math.max(-120, Math.min(120, rawDy));
    const sens = displaySettingsRef.current.cameraSensitivity;
    targetOrbitYawRef.current -= dx * 0.0092 * sens;
    targetOrbitPitchRef.current = Math.max(
      -0.21,
      Math.min(0.73, targetOrbitPitchRef.current + dy * 0.0062 * sens)
    );
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  const showLockedWarning = (lid: CampaignLevelId) => {
    soundManager.playCautionBeep();
    setLockedToast(
      tr(
        language,
        `Locked! Complete Node ${lid - 1} first to open this orbital leg.`,
        `مقفل! أكمل المحطة ${lid - 1} أولاً لفتح هذا المسار الفضائي.`
      )
    );
    if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setLockedToast(null), 2600);
  };

  const flyCraftToNode = (lid: CampaignLevelId, enterWhenDocked = true) => {
    lastActivityRef.current = performance.now();
    setShowIdleHint(false);
    if (!unlockedLevelsRef.current.includes(lid)) {
      showLockedWarning(lid);
      return;
    }
    const idx = Math.max(0, TRAJECTORY_NODES.findIndex((n) => n.levelId === lid));
    const destNode = TRAJECTORY_NODES[idx];
    soundManager.playClick();
    setFocusedLevel(lid);
    isFlightModeRef.current = false;
    setIsFlightMode(false);
    const distXZ = Math.hypot(
      freeCraftPosRef.current.x - destNode.center.x,
      freeCraftPosRef.current.z - destNode.center.z
    );
    if (enterWhenDocked && distXZ < 2.65) {
      isAutoFlyingRef.current = false;
      pendingEnterLevelRef.current = null;
      soundManager.playDropSuccess();
      onSelectLevelRef.current(lid);
      return;
    }

    splineTRef.current = Math.max(0, Math.min(1, (freeCraftPosRef.current.x + 11.0) / 22.0));
    targetSplineTRef.current = idx / 3;
    isAutoFlyingRef.current = true;
    pendingEnterLevelRef.current = enterWhenDocked ? lid : null;
    gsap.to(targetOrbitYawRef, {
      current: Math.max(-0.34, Math.min(0.34, -destNode.center.x * 0.018)),
      duration: 0.85,
      ease: 'power2.out'
    });
  };

  const toggleFreeFlight = () => {
    lastActivityRef.current = performance.now();
    soundManager.playClick();
    const next = !isFlightModeRef.current;
    isFlightModeRef.current = next;
    isAutoFlyingRef.current = false;
    setIsFlightMode(next);
    pendingEnterLevelRef.current = null;
    if (next) {
      freeCraftPosRef.current.y = Math.max(
        freeCraftPosRef.current.y + 1.6,
        evalOverworldTerrainHeight(freeCraftPosRef.current.x, freeCraftPosRef.current.z) + 2.2
      );
      ascendUntilRef.current = performance.now() + 260;
    } else {
      const clamped = clampOverworldPosition(
        freeCraftPosRef.current.x,
        freeCraftPosRef.current.z,
        unlockedLevelsRef.current
      );
      const groundY = evalOverworldTerrainHeight(clamped.x, clamped.z);
      freeCraftPosRef.current.set(clamped.x, groundY, clamped.z);
      kinematicsRef.current = createKinematicsState(clamped.x, groundY, clamped.z, performance.now());
    }
  };

  const triggerWorldJump = () => {
    const now = performance.now();
    lastActivityRef.current = now;
    if (isFlightModeRef.current) {
      ascendUntilRef.current = now + 260;
      soundManager.playClick();
      return;
    }
    if (isAutoFlyingRef.current) return;
    queueJumpInput(kinematicsRef.current, now, JUMP_BUFFER_MS);
  };
  const jumpHandlerRef = useRef(triggerWorldJump);
  jumpHandlerRef.current = triggerWorldJump;

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
    const initialQuality = getQualityRenderConfig(displaySettingsRef.current.graphicsQuality);
    const initUltraShadows = displaySettingsRef.current.graphicsQuality === 'ultra';
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, initialQuality.maxPixelRatio));
    renderer.setSize(dims.w, dims.h);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = initUltraShadows;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    mount.innerHTML = '';
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    let isDisposed = false;
    const camera = new THREE.PerspectiveCamera(58, dims.w / dims.h, 0.1, 240);
    camera.position.set(-6, 10, 22);
    orbitPitchRef.current = 0.56;
    orbitYawRef.current = -0.35;
    targetOrbitPitchRef.current = 0.56;
    targetOrbitYawRef.current = -0.35;
    const worldFlyInTween = gsap.to(targetOrbitPitchRef, {
      current: 0.22,
      duration: 1.25,
      ease: 'power2.out'
    });
    const worldYawInTween = gsap.to(targetOrbitYawRef, {
      current: 0,
      duration: 1.25,
      ease: 'power2.out'
    });

    const skyHandle = createCosmicSkyBackdrop(scene, 'nebula', { skipSatellite: true });
    const hemi = new THREE.HemisphereLight(0xe0f2fe, 0x1e293b, 1.5);
    const sun = new THREE.DirectionalLight(0xfffbeb, 2.1);
    sun.position.set(16, 24, 18);
    sun.castShadow = initUltraShadows;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.near = 2;
    sun.shadow.camera.far = 70;
    sun.shadow.camera.left = -18;
    sun.shadow.camera.right = 18;
    sun.shadow.camera.top = 12;
    sun.shadow.camera.bottom = -12;
    sunLightRef.current = sun;
    const rim = new THREE.DirectionalLight(0x38bdf8, 0.95);
    rim.position.set(-18, -6, -12);
    scene.add(hemi, sun, rim);

    const disposableTextures: THREE.Texture[] = [];

    // 1. Background Sculpted Earth & Moon Globes (Real 3D Space Context!)
    const planetGroup = new THREE.Group();
    scene.add(planetGroup);
    const earthFallback = new THREE.Mesh(
      new THREE.IcosahedronGeometry(3.8, 2),
      new THREE.MeshStandardMaterial({ color: 0x1d4ed8, emissive: 0x0ea5e9, emissiveIntensity: 0.25, roughness: 0.55, flatShading: true })
    );
    earthFallback.position.set(-16.5, -2.5, -6.5);
    const moonFallback = new THREE.Mesh(
      new THREE.IcosahedronGeometry(2.5, 2),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.82, flatShading: true })
    );
    moonFallback.position.set(5.5, 4.4, -7.8);
    planetGroup.add(earthFallback, moonFallback);

    let blenderPlanets: Record<string, THREE.Object3D> = {};
    attachBlenderPlanetsFromPack({
      targetParent: planetGroup,
      placements: [
        { nodeName: 'PlanetEarth', id: 'BgEarth', position: [-16.5, -2.5, -6.5], scale: 3.9 },
        { nodeName: 'PlanetMoon', id: 'BgMoon', position: [5.5, 4.4, -7.8], scale: 2.5 }
      ],
      isDisposed: () => isDisposed,
      onLoaded: (loaded) => {
        blenderPlanets = loaded;
        if (loaded.BgEarth) disposeObject3D(earthFallback);
        if (loaded.BgMoon) disposeObject3D(moonFallback);
      }
    });

    // 2. Massive Sculpted Connected 3D Space Terra-Island + Plasma Laser Energy Bridges (Sectors 1 -> 2 -> 3 -> 4)
    const connectedIslandRoot = new THREE.Group();
    scene.add(connectedIslandRoot);
    attachMassiveSpaceIsland({
      targetParent: connectedIslandRoot,
      isDisposed: () => isDisposed
    });

    const trajectoryCurve = new THREE.CatmullRomCurve3(
      TRAJECTORY_NODES.map((n) => n.center.clone()),
      false,
      'centripetal',
      0.4
    );

    const unlockedSet = new Set<CampaignLevelId>(campaign.unlockedLevels);
    let seenBridges = new Set<number>([1]);
    try {
      const savedSeen = window.localStorage.getItem('astronutri_seen_bridges_v1');
      if (savedSeen) {
        seenBridges = new Set(JSON.parse(savedSeen) as number[]);
      }
    } catch {
      // ignore storage errors
    }

    // Instanced Laser Energy Bridges (1 draw call for all 3 sector spans)
    const bridgeCount = TRAJECTORY_NODES.length - 1;
    const bridgeGeo = new THREE.CylinderGeometry(0.12, 0.12, 1, 8);
    const bridgeMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.85,
      transparent: true,
      opacity: 0.88
    });
    const bridgeInst = new THREE.InstancedMesh(bridgeGeo, bridgeMat, bridgeCount);
    scene.add(bridgeInst);
    const bridgeDummy = new THREE.Object3D();
    const beamUpAxis = new THREE.Vector3(0, 1, 0);
    let newlyIgnitedMidX: number | null = null;
    for (let legIdx = 0; legIdx < bridgeCount; legIdx++) {
      const a = TRAJECTORY_NODES[legIdx];
      const b = TRAJECTORY_NODES[legIdx + 1];
      const legUnlocked = unlockedSet.has(b.levelId);
      const isFreshUnlock = legUnlocked && !seenBridges.has(b.levelId);
      if (legUnlocked) seenBridges.add(b.levelId);

      const startPt = a.center.clone().add(new THREE.Vector3(0, 0.65, 0));
      const endPt = b.center.clone().add(new THREE.Vector3(0, 0.65, 0));
      const spanVec = endPt.clone().sub(startPt);
      const spanLen = spanVec.length();
      const midPt = startPt.clone().lerp(endPt, 0.5);

      bridgeDummy.position.copy(midPt);
      bridgeDummy.quaternion.setFromUnitVectors(beamUpAxis, spanVec.clone().normalize());
      bridgeDummy.scale.set(legUnlocked ? 1.15 : 0.48, spanLen, legUnlocked ? 1.15 : 0.48);
      bridgeDummy.updateMatrix();
      bridgeInst.setMatrixAt(legIdx, bridgeDummy.matrix);
      bridgeInst.setColorAt(legIdx, new THREE.Color(legUnlocked ? b.accentColor : 0x334155));

      if (isFreshUnlock) {
        newlyIgnitedMidX = midPt.x;
      }
    }
    bridgeInst.instanceMatrix.needsUpdate = true;
    if (bridgeInst.instanceColor) bridgeInst.instanceColor.needsUpdate = true;

    if (newlyIgnitedMidX !== null) {
      try {
        window.localStorage.setItem('astronutri_seen_bridges_v1', JSON.stringify(Array.from(seenBridges)));
      } catch {
        // ignore storage errors
      }
      gsap.to(targetOrbitYawRef, {
        current: Math.max(-0.32, Math.min(0.32, -newlyIgnitedMidX * 0.02)),
        duration: 1.2,
        ease: 'power2.out'
      });
      soundManager.playFanfare();
    }

    // Animated Trajectory Pulse Beads traveling from Earth -> Moon
    const beadCount = 12;
    const beadInst = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.18, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 }),
      beadCount
    );
    scene.add(beadInst);
    const beadDummy = new THREE.Object3D();

    // 3. Build 4 Distinct Space Nodes (Launchpad, ISS, Shackleton Moon Biodome, Orion Capsule)
    // Instanced orbital rings (1 draw call for all 4 halos, keeping total scene draw calls well below 55)
    const ringGeo = new THREE.TorusGeometry(2.65, 0.12, 10, 32);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x0f172a,
      emissiveIntensity: 0.48,
      roughness: 0.3
    });
    const ringInst = new THREE.InstancedMesh(ringGeo, ringMat, TRAJECTORY_NODES.length);
    scene.add(ringInst);
    const ringDummy = new THREE.Object3D();

    const nodeGroups: { cfg: TrajectoryNodeConfig; root: THREE.Group; halo: THREE.Object3D }[] = [];
    const glbLoadedRefs: THREE.Object3D[] = [];

    TRAJECTORY_NODES.forEach((cfg, idx) => {
      const unlocked = unlockedSet.has(cfg.levelId);
      const completed = checkLevelCompleted(campaign, cfg.levelId);
      const isActive = activeTargetLevelId === cfg.levelId;

      const root = new THREE.Group();
      root.position.copy(cfg.center);
      scene.add(root);

      ringInst.setColorAt(
        idx,
        new THREE.Color(completed ? 0x34d399 : unlocked ? cfg.accentColor : 0x475569)
      );

      // Compact procedural silhouette fallback until Blender .glb arrives
      const fallbackParts: ColoredGeometryPart[] = [
        { geometry: new THREE.CylinderGeometry(1.75, 1.95, 0.36, 12), color: 0x1e293b, position: [0, -0.32, 0] },
        { geometry: new THREE.OctahedronGeometry(0.95, 0), color: unlocked ? cfg.accentColor : 0x64748b, position: [0, 0.95, 0] }
      ];
      const fallbackMesh = new THREE.Mesh(
        mergeColoredParts(fallbackParts),
        new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, flatShading: true })
      );
      root.add(fallbackMesh);

      attachSpaceNodeGlb({
        modelKey: cfg.modelKey,
        targetParent: root,
        scale: cfg.modelKey === 'earth_launchpad' ? 1.85 : 1.75,
        position: [0, 0, 0],
        fallbackNodes: [fallbackMesh],
        isDisposed: () => isDisposed,
        onLoaded: (glb) => {
          glbLoadedRefs.push(glb);
        }
      });

      // Strict Language-Isolated Canvas Label Sprite
      const rawTitle = tr(language, cfg.enLabel, cfg.arLabel);
      const labelText = completed ? `✅ ${rawTitle}` : unlocked ? rawTitle : `🔒 ${rawTitle}`;
      const { sprite, texture } = createNodeLabelSprite(labelText, cfg.accentHex, !unlocked, completed);
      sprite.position.set(0, 3.15, 0);
      root.add(sprite);
      disposableTextures.push(texture);

      // Floating beacon diamond for active node
      const halo = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.42, 0),
        new THREE.MeshStandardMaterial({
          color: 0xfacc15,
          emissive: 0xf59e0b,
          emissiveIntensity: 0.9,
          roughness: 0.2
        })
      );
      halo.position.set(0, 3.95, 0);
      halo.visible = isActive;
      root.add(halo);

      nodeGroups.push({ cfg, root, halo });
    });
    if (ringInst.instanceColor) ringInst.instanceColor.needsUpdate = true;

    // 4. Player's Full Sculpted SPACE-FIT X Astronaut (astronaut_hero.glb + articulated limbs + Robo)
    const playerCraftRoot = new THREE.Group();
    scene.add(playerCraftRoot);
    const hero = buildSpaceFitXCharacter({
      showEvaHelmet: true,
      showCompanion: true,
      scale: 0.72
    });
    playerCraftRoot.add(hero.group);

    // Lightweight InstancedMesh Jetpack Thruster Exhaust Particles (1 draw call)
    const thrusterCount = 10;
    const thrusterGeo = new THREE.SphereGeometry(0.13, 6, 6);
    const thrusterMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.78 });
    const thrusterInst = new THREE.InstancedMesh(thrusterGeo, thrusterMat, thrusterCount);
    scene.add(thrusterInst);
    const thrusterDummy = new THREE.Object3D();
    const thrusterParticles = Array.from({ length: thrusterCount }, (_, i) => ({
      pos: new THREE.Vector3(),
      vel: new THREE.Vector3(0, -1, 0),
      life: (i / thrusterCount) * 0.45
    }));

    // Glowing Directional 3D Floor/Space Arrow pointing toward next Mission Node
    const floorArrow = createFloorGuideArrowSystem(scene);
    const activeTargetNode = TRAJECTORY_NODES.find((n) => n.levelId === activeTargetLevelId) || TRAJECTORY_NODES[0];

    // Keyboard & Drag Controls
    const keysDown = new Set<string>();
    const onKeyDown = (e: KeyboardEvent) => {
      lastActivityRef.current = performance.now();
      const k = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) {
        if (document.activeElement?.tagName !== 'INPUT') e.preventDefault();
      }
      keysDown.add(k);
      if (k === 'f') toggleFreeFlight();
      if ((k === ' ' || e.code === 'Space') && !e.repeat) jumpHandlerRef.current();
      if (k === 'e' || k === 'enter') flyCraftToNode(focusedLevelRef.current, true);
      if (k === 'shift') isBoostingRef.current = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      keysDown.delete(k);
      if (k === 'shift') isBoostingRef.current = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    let activeLookPointerId: number | null = null;
    let downPos = { x: 0, y: 0 };
    let prevPos = { x: 0, y: 0 };
    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();
    const domEl = renderer.domElement;

    const handleViewportTap = (clientX: number, clientY: number) => {
      const rect = domEl.getBoundingClientRect();
      pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointerNdc, camera);
      const hits = raycaster.intersectObjects(nodeGroups.map((n) => n.root), true);
      if (hits.length > 0) {
        const hitObj = hits[0].object;
        const matched = nodeGroups.find((ng) => {
          let cur: THREE.Object3D | null = hitObj;
          while (cur) {
            if (cur === ng.root) return true;
            cur = cur.parent;
          }
          return false;
        });
        if (matched) {
          flyCraftToNode(matched.cfg.levelId, true);
        }
      }
    };
    viewportTapHandlerRef.current = handleViewportTap;

    const onPointerDown = (e: PointerEvent) => {
      if (activeLookPointerId !== null) return;
      lastActivityRef.current = performance.now();
      activeLookPointerId = e.pointerId;
      activeLookRef.current = true;
      downPos = { x: e.clientX, y: e.clientY };
      prevPos = { x: e.clientX, y: e.clientY };
    };
    const onPointerMove = (e: PointerEvent) => {
      if (activeLookPointerId !== e.pointerId) return;
      const dx = e.clientX - prevPos.x;
      const dy = e.clientY - prevPos.y;
      prevPos = { x: e.clientX, y: e.clientY };
      applyLookDelta(dx, dy);
    };
    const onPointerUp = (e: PointerEvent) => {
      if (activeLookPointerId !== e.pointerId) return;
      activeLookPointerId = null;
      activeLookRef.current = false;
      if (Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y) > 7) return;
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

    const onResize = () => {
      const next = getDims();
      camera.aspect = next.w / next.h;
      camera.updateProjectionMatrix();
      renderer.setSize(next.w, next.h);
    };
    window.addEventListener('resize', onResize);

    if (typeof window !== 'undefined') {
      (window as unknown as Record<string, unknown>).__ASTRONUTRI_WORLD_3D__ = {
        getLoadedGlbUrls
      };
    }

    let rafId = 0;
    let prevMs = performance.now();
    const startMs = prevMs;
    const tmpNextPt = new THREE.Vector3();

    const animate = () => {
      rafId = window.requestAnimationFrame(animate);
      const now = performance.now();
      const qCfg = getQualityRenderConfig(displaySettingsRef.current.graphicsQuality);
      if (qCfg.targetFpsIntervalMs > 0 && now - prevMs < qCfg.targetFpsIntervalMs) {
        return;
      }
      const dt = Math.min((now - prevMs) / 1000, 0.05);
      const elapsed = (now - startMs) / 1000;
      prevMs = now;

      // Damped smooth right-hand camera interpolation
      const dampRate = 6.0 + (1.0 - displaySettingsRef.current.cameraSmoothness) * 18.0;
      const dampAlpha = 1 - Math.exp(-dampRate * dt);
      orbitYawRef.current = lerpAngle(orbitYawRef.current, targetOrbitYawRef.current, dampAlpha);
      orbitPitchRef.current += (targetOrbitPitchRef.current - orbitPitchRef.current) * dampAlpha;

      bridgeMat.emissiveIntensity = 0.75 + Math.sin(elapsed * 3.4) * 0.25;

      skyHandle.update(elapsed);

      // Slowly spin background Earth & Moon
      if (blenderPlanets.BgEarth) blenderPlanets.BgEarth.rotation.y = elapsed * 0.08;
      if (blenderPlanets.BgMoon) blenderPlanets.BgMoon.rotation.y = -elapsed * 0.06;
      glbLoadedRefs.forEach((g) => animateBlenderEnvironmentGlb(g, elapsed));

      // Animate orbital pulse beads from Node 1 -> 4
      for (let i = 0; i < beadCount; i++) {
        const t = ((elapsed * 0.09 + i / beadCount) % 1 + 1) % 1;
        beadDummy.position.copy(trajectoryCurve.getPointAt(t));
        const sc = 0.75 + Math.sin(elapsed * 4 + i) * 0.25;
        beadDummy.scale.setScalar(sc);
        beadDummy.updateMatrix();
        beadInst.setMatrixAt(i, beadDummy.matrix);
      }
      beadInst.instanceMatrix.needsUpdate = true;

      // Gentle hover + beacon spin on space nodes + animated Blender GLBs + instanced halo rings
      glbLoadedRefs.forEach((g, idx) => animateBlenderEnvironmentGlb(g, elapsed + idx * 0.85));
      nodeGroups.forEach(({ root, halo, cfg }, idx) => {
        const nodeY = cfg.center.y + Math.sin(elapsed * 1.15 + idx * 1.1) * 0.14;
        root.position.y = nodeY;
        ringDummy.position.set(cfg.center.x, nodeY - 0.35, cfg.center.z);
        ringDummy.rotation.set(Math.PI / 2, 0, elapsed * 0.22 * (idx % 2 === 0 ? 1 : -1));
        ringDummy.updateMatrix();
        ringInst.setMatrixAt(idx, ringDummy.matrix);
        if (halo.visible) {
          halo.rotation.y = elapsed * 2.2;
          halo.position.y = 3.95 + Math.sin(elapsed * 3.4) * 0.22;
        }
      });
      ringInst.instanceMatrix.needsUpdate = true;

      // Spacecraft Motion: either Free Flight OR Smooth Orbital Spline Auto-Fly
      let inputX = joystickVecRef.current.x;
      let inputZ = joystickVecRef.current.y;
      if (keysDown.has('a') || keysDown.has('arrowleft')) inputX -= 1;
      if (keysDown.has('d') || keysDown.has('arrowright')) inputX += 1;
      if (keysDown.has('w') || keysDown.has('arrowup')) inputZ -= 1;
      if (keysDown.has('s') || keysDown.has('arrowdown')) inputZ += 1;
      const inLen = Math.hypot(inputX, inputZ);
      const inMag = Math.min(1, inLen);
      const k = kinematicsRef.current;

      // Transform camera-relative inputs using current orbit yaw
      const sinYaw = Math.sin(orbitYawRef.current);
      const cosYaw = Math.cos(orbitYawRef.current);
      const moveWorldX = inLen > 0.08 ? (inputX * cosYaw + inputZ * sinYaw) / inLen : 0;
      const moveWorldZ = inLen > 0.08 ? (-inputX * sinYaw + inputZ * cosYaw) / inLen : 0;

      let currentSpeed = 0;
      let currentVelY = 0;
      let walkedLanding = false;

      if (isFlightModeRef.current) {
        if (inMag > 0.08) {
          lastActivityRef.current = now;
          const speed = (isBoostingRef.current ? 16.5 : 10.5) * inMag;
          currentSpeed = speed;
          freeCraftPosRef.current.x = Math.max(-22, Math.min(22, freeCraftPosRef.current.x + moveWorldX * speed * dt));
          freeCraftPosRef.current.z = Math.max(-13, Math.min(13, freeCraftPosRef.current.z + moveWorldZ * speed * dt));
          const yaw = Math.atan2(moveWorldX, moveWorldZ);
          freeCraftYawRef.current = lerpAngle(freeCraftYawRef.current, yaw, 1 - Math.exp(-10 * dt));
        }
        if (now < ascendUntilRef.current || isBoostingRef.current) {
          currentVelY = 7.2;
          freeCraftPosRef.current.y = Math.min(10.5, freeCraftPosRef.current.y + 7.2 * dt);
        } else {
          const minHoverY = evalOverworldTerrainHeight(freeCraftPosRef.current.x, freeCraftPosRef.current.z) + 1.85;
          if (freeCraftPosRef.current.y > minHoverY) {
            currentVelY = -2.8;
            freeCraftPosRef.current.y = Math.max(minHoverY, freeCraftPosRef.current.y - 2.8 * dt);
          }
        }
        playerCraftRoot.position.copy(freeCraftPosRef.current);
        playerCraftRoot.rotation.set(inMag > 0.1 ? 0.28 : 0.08, freeCraftYawRef.current, inMag > 0.1 ? -inputX * 0.16 : 0);
      } else if (isAutoFlyingRef.current) {
        const diff = targetSplineTRef.current - splineTRef.current;
        if (Math.abs(diff) > 0.005) {
          const step = Math.sign(diff) * Math.min(Math.abs(diff), 0.72 * dt);
          splineTRef.current += step;
        } else {
          splineTRef.current = targetSplineTRef.current;
          isAutoFlyingRef.current = false;
          const dockedNode = TRAJECTORY_NODES[Math.round(splineTRef.current * 3)] || TRAJECTORY_NODES[0];
          const dockedY = evalOverworldTerrainHeight(dockedNode.center.x, dockedNode.center.z + 1.4);
          freeCraftPosRef.current.set(dockedNode.center.x, dockedY, dockedNode.center.z + 1.4);
          kinematicsRef.current = createKinematicsState(dockedNode.center.x, dockedY, dockedNode.center.z + 1.4, now);
          const queued = pendingEnterLevelRef.current;
          if (queued) {
            pendingEnterLevelRef.current = null;
            soundManager.playDropSuccess();
            onSelectLevelRef.current(queued);
          }
        }
        const craftPt = trajectoryCurve.getPointAt(Math.max(0, Math.min(1, splineTRef.current)));
        const lookPt = trajectoryCurve.getPointAt(Math.min(1, splineTRef.current + 0.015));
        freeCraftPosRef.current.set(craftPt.x, craftPt.y + 1.4 + Math.sin(elapsed * 4) * 0.14, craftPt.z);
        playerCraftRoot.position.copy(freeCraftPosRef.current);
        currentSpeed = 12;
        tmpNextPt.set(lookPt.x, playerCraftRoot.position.y, lookPt.z);
        if (playerCraftRoot.position.distanceToSquared(tmpNextPt) > 0.0001) {
          playerCraftRoot.lookAt(tmpNextPt);
          freeCraftYawRef.current = playerCraftRoot.rotation.y;
        }
        playerCraftRoot.rotation.x = 0.25;
      } else {
        // Walk directly across sculpted Terra-Island hills, lunar crater & unlocked Laser Bridges + Buffered Jump
        if (inMag > 0.08) {
          lastActivityRef.current = now;
          const targetYaw = Math.atan2(moveWorldX, moveWorldZ);
          freeCraftYawRef.current = lerpAngle(freeCraftYawRef.current, targetYaw, 1 - Math.exp(-12 * dt));
        }

        let blockedWarnSector: CampaignLevelId | null = null;
        const walkedRes = stepThirdPersonKinematics(k, {
          dt,
          nowMs: now,
          inputWorldDirX: moveWorldX,
          inputWorldDirZ: moveWorldZ,
          inputMagnitude: inMag,
          maxSpeed: isBoostingRef.current ? 10.2 : 6.4,
          gravity: 16.5,
          jumpVel: 6.8,
          evalFloorY: evalOverworldTerrainHeight,
          clampXZ: (x, z) => {
            const clamped = clampOverworldPosition(x, z, unlockedLevelsRef.current);
            if (clamped.blockedBySector) blockedWarnSector = clamped.blockedBySector;
            return { x: clamped.x, z: clamped.z };
          }
        });

        const warnTarget = blockedWarnSector as CampaignLevelId | null;
        if (warnTarget && now > lockWarnCooldownRef.current) {
          lockWarnCooldownRef.current = now + 2200;
          showLockedWarning(warnTarget);
        }
        if (walkedRes.jumped) {
          soundManager.playClick();
        }

        freeCraftPosRef.current.set(k.x, k.y, k.z);
        currentSpeed = walkedRes.speed;
        currentVelY = k.vy;
        walkedLanding = walkedRes.isLanding;

        playerCraftRoot.position.copy(freeCraftPosRef.current);
        playerCraftRoot.rotation.set(
          isBoostingRef.current && inMag > 0.1 ? 0.14 : 0,
          freeCraftYawRef.current,
          0
        );
      }

      // Focus nearest unlocked Sector Node during walk or flight
      if (!isAutoFlyingRef.current) {
        let bestLid = focusedLevelRef.current;
        let bestDist = Infinity;
        for (const n of TRAJECTORY_NODES) {
          const d = Math.hypot(
            playerCraftRoot.position.x - n.center.x,
            playerCraftRoot.position.z - n.center.z
          );
          if (d < bestDist) {
            bestDist = d;
            bestLid = n.levelId;
          }
        }
        if (bestDist < 4.5 && bestLid !== focusedLevelRef.current) {
          setFocusedLevel(bestLid);
        }
      }

      // Update Idle Speech Hint
      const idleSec = (now - lastActivityRef.current) / 1000;
      if (idleSec > 8.5) {
        setShowIdleHint(true);
      }

      // Animate Full Sculpted SPACE-FIT X Astronaut (decoupled Walk/Run/Jump/Land vs Zero-G Flight)
      const isCelebrating = now < celebrateUntilRef.current;
      const isZeroGAnim = isFlightModeRef.current || isAutoFlyingRef.current;
      const airborneWalk = !isZeroGAnim && !k.grounded;
      const jetActive = isZeroGAnim || (isBoostingRef.current && inMag > 0.08);
      const themeHex =
        suitStateRef.current?.suitTheme === 'mars_crimson'
          ? 0xf43f5e
          : suitStateRef.current?.suitTheme === 'gold_emerald'
          ? 0x10b981
          : 0x22d3ee;

      const activeSuit = suitStateRef.current || initialSpaceFitXState;
      const walkSpeedNorm = currentSpeed > 0.12 ? Math.min(1.0, currentSpeed / 10.2 + 0.25) : 0;
      const moveSpeedNorm = isZeroGAnim
        ? inMag > 0.08 || isAutoFlyingRef.current
          ? 1.0
          : 0.15
        : walkSpeedNorm;

      hero.update({
        t: elapsed,
        moveSpeed: moveSpeedNorm,
        isRunning: (isBoostingRef.current && inMag > 0.08) || isZeroGAnim,
        isJumping: airborneWalk,
        isLanding: !isZeroGAnim && walkedLanding,
        isZeroG: isZeroGAnim,
        suitState: {
          ...activeSuit,
          helmetEnabled: true,
          backpackStyle: jetActive ? 'thruster' : activeSuit.backpackStyle || 'eclss'
        },
        idleSeconds: idleSec,
        emote: isCelebrating ? 'celebrate' : 'none'
      });

      // Jetpack thruster InstancedMesh update
      thrusterInst.visible = jetActive;
      thrusterMat.color.setHex(isBoostingRef.current ? 0xfbbf24 : themeHex);
      const backSin = Math.sin(freeCraftYawRef.current);
      const backCos = Math.cos(freeCraftYawRef.current);
      if (jetActive) {
        for (let i = 0; i < thrusterCount; i++) {
          const p = thrusterParticles[i];
          p.life += dt;
          if (p.life > 0.42) {
            p.life = 0;
            const side = i % 2 === 0 ? -0.1 : 0.1;
            p.pos.set(
              playerCraftRoot.position.x - backSin * 0.24 + backCos * side,
              playerCraftRoot.position.y + 0.56,
              playerCraftRoot.position.z - backCos * 0.24 - backSin * side
            );
            p.vel.set(
              -backSin * 1.4 + (Math.random() - 0.5) * 0.5,
              -2.8 - Math.random() * 1.4,
              -backCos * 1.4 + (Math.random() - 0.5) * 0.5
            );
          }
          p.pos.addScaledVector(p.vel, dt);
          thrusterDummy.position.copy(p.pos);
          const sc = Math.max(0.01, (1 - p.life / 0.42) * (isBoostingRef.current ? 1.3 : 0.9));
          thrusterDummy.scale.setScalar(sc);
          thrusterDummy.updateMatrix();
          thrusterInst.setMatrixAt(i, thrusterDummy.matrix);
        }
        thrusterInst.instanceMatrix.needsUpdate = true;
      }

      floorArrow.update(
        new THREE.Vector3(playerCraftRoot.position.x, playerCraftRoot.position.y + 0.14, playerCraftRoot.position.z),
        activeTargetNode.center,
        playerCraftRoot.position.y + 0.14,
        elapsed
      );

      // Auto-Follow Close Over-the-Shoulder Third-Person Camera (pauses 2.2s after manual look drag)
      if ((currentSpeed > 0.25 || isAutoFlyingRef.current) && !activeLookRef.current && now - lastManualLookMsRef.current > 2200) {
        const behindPlayerYaw = freeCraftYawRef.current + Math.PI;
        targetOrbitYawRef.current = lerpAngle(
          targetOrbitYawRef.current,
          behindPlayerYaw,
          1 - Math.exp(-3.0 * dt)
        );
      }

      const camTarget = playerCraftRoot.position;
      const camDist = isFlightModeRef.current ? 7.4 : isAutoFlyingRef.current ? 8.2 : 5.4;
      const horizDist = camDist * Math.cos(orbitPitchRef.current);
      const camHeight = 1.35 + camDist * Math.sin(orbitPitchRef.current);
      const desiredX = camTarget.x + Math.sin(orbitYawRef.current) * horizDist;
      const desiredZ = camTarget.z + Math.cos(orbitYawRef.current) * horizDist;
      const minCamY = evalOverworldTerrainHeight(desiredX, desiredZ) + 0.9;
      const desiredY = Math.max(camTarget.y + camHeight, minCamY);

      camera.position.x = dampValue(camera.position.x, desiredX, 12, dt);
      camera.position.y = dampValue(camera.position.y, desiredY, 12, dt);
      camera.position.z = dampValue(camera.position.z, desiredZ, 12, dt);
      const lookFwdX = -Math.sin(orbitYawRef.current) * 1.1;
      const lookFwdZ = -Math.cos(orbitYawRef.current) * 1.1;
      const targetLookY = Math.max(camTarget.y + 1.35, minCamY - 0.25);
      camera.lookAt(camTarget.x + lookFwdX, targetLookY, camTarget.z + lookFwdZ);

      renderer.render(scene, camera);
      mount.dataset.drawCalls = String(renderer.info.render.calls);
      mount.dataset.glbLoaded = getLoadedGlbUrls().join(',');
      mount.dataset.cameraYaw = orbitYawRef.current.toFixed(3);
      mount.dataset.cameraPitch = orbitPitchRef.current.toFixed(3);
      mount.dataset.playerY = playerCraftRoot.position.y.toFixed(3);
      mount.dataset.playerVelY = currentVelY.toFixed(3);
      mount.dataset.playerSpeed = currentSpeed.toFixed(3);
      mount.dataset.playerGrounded = k.grounded && !isFlightModeRef.current && !isAutoFlyingRef.current ? 'true' : 'false';
    };

    animate();

    return () => {
      isDisposed = true;
      rendererRef.current = null;
      sunLightRef.current = null;
      worldFlyInTween.kill();
      worldYawInTween.kill();
      gsap.killTweensOf(orbitYawRef);
      gsap.killTweensOf(orbitPitchRef);
      gsap.killTweensOf(targetOrbitYawRef);
      gsap.killTweensOf(targetOrbitPitchRef);
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      domEl.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerCancel);
      window.removeEventListener('resize', onResize);
      skyHandle.dispose();
      floorArrow.dispose();
      hero.dispose();
      bridgeGeo.dispose();
      bridgeMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      thrusterGeo.dispose();
      thrusterMat.dispose();
      disposableTextures.forEach((t) => t.dispose());
      renderer.dispose();
    };
  }, [language, activeTargetLevelId, campaign.unlockedLevels.length]);

  const focusedNode = TRAJECTORY_NODES.find((n) => n.levelId === focusedLevel) || TRAJECTORY_NODES[0];
  const focusedMeta = LEVEL_TITLES_BILINGUAL[focusedLevel];
  const focusedUnlocked = campaign.unlockedLevels.includes(focusedLevel);
  const nextMeta = LEVEL_TITLES_BILINGUAL[activeTargetLevelId];

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
                onClick={() => flyCraftToNode(lid, true)}
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
                    ? tr(language, '🚀 Launch Mission', '🚀 دخول المحطة')
                    : tr(language, '🔒 Locked', '🔒 مقفل')}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div data-testid="world-navigator-3d" className="relative w-full h-full overflow-hidden select-none">
      {/* Full-Viewport Deep Space Earth-to-Moon 3D Trajectory Canvas */}
      <div
        ref={mountRef}
        data-testid="three-canvas-mount"
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* Top-Center Desktop Node Selector Strip (hidden on mobile/tablet so 85%+ viewport stays open) */}
      <div
        dir={language === 'ar' ? 'rtl' : 'ltr'}
        className="pointer-events-none fixed top-14 inset-x-0 z-20 hidden lg:flex justify-center px-3"
      >
        <div className="pointer-events-auto inline-flex items-center justify-center gap-1 px-2 py-1 rounded-full bg-slate-950/65 border border-cyan-400/40 backdrop-blur-md shadow-lg max-w-full">
          {([1, 2, 3, 4] as CampaignLevelId[]).map((lid) => {
            const meta = LEVEL_TITLES_BILINGUAL[lid];
            const unlocked = campaign.unlockedLevels.includes(lid);
            const completed = checkLevelCompleted(campaign, lid);
            const isFocused = focusedLevel === lid;
            return (
              <button
                key={lid}
                type="button"
                data-testid={`level-node-${lid}`}
                onClick={() => flyCraftToNode(lid, true)}
                className={`px-2.5 py-1 rounded-full border text-[11px] font-hud font-black flex items-center gap-1 transition-all cursor-pointer ${
                  !unlocked
                    ? 'bg-slate-900/55 border-white/15 text-slate-400 opacity-65'
                    : isFocused
                    ? 'bg-amber-400 text-slate-950 border-white shadow-md'
                    : 'bg-slate-900/75 border-white/25 text-white hover:bg-slate-800/90'
                }`}
              >
                <span>{meta.badge}</span>
                <span>{tr(language, meta.shortEn, meta.shortAr)}</span>
                {completed && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                {!unlocked && <Lock className="w-2.5 h-2.5 text-slate-400" />}
              </button>
            );
          })}

          <span
            data-testid="active-biome-badge"
            className="px-2 py-1 rounded-full bg-slate-900/70 border border-white/20 text-[10px] font-hud font-bold text-cyan-200 whitespace-nowrap"
          >
            {tr(language, focusedNode.telemetryEn, focusedNode.telemetryAr)}
          </span>
        </div>
      </div>

      {/* Sequential Lock Warning Toast */}
      {lockedToast && (
        <div
          dir={language === 'ar' ? 'rtl' : 'ltr'}
          className="pointer-events-none fixed top-28 inset-x-0 z-30 flex justify-center px-4"
        >
          <div className="px-4 py-2 rounded-full bg-slate-950/95 border-2 border-amber-400 text-amber-200 font-hud font-black text-xs shadow-2xl">
            {lockedToast}
          </div>
        </div>
      )}

      {/* Playful Idle Speech Bubble */}
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
                'Tap any Space Node or hit Fly! 🚀',
                'اضغط أي محطة فضائية أو جرّب الطيران الحر! 🚀'
              )}
            </span>
          </div>
        </div>
      )}

      {/* Bottom Arcade Controls + Direct Node Entry + Tap-to-Fly Next Mission */}
      <ThirdPersonControlsOverlay
        promptLabelAr={
          focusedUnlocked
            ? tr(
                language,
                `Enter ${focusedMeta.shortEn}`,
                `دخول ${focusedMeta.shortAr}`
              )
            : tr(language, `Node ${focusedLevel} Locked`, `المحطة ${focusedLevel} مقفلة`)
        }
        promptSubAr={focusedUnlocked ? tr(language, focusedMeta.titleEn, focusedMeta.titleAr) : undefined}
        onInteract={() => flyCraftToNode(focusedLevel, true)}
        onAutoWalkNext={() => flyCraftToNode(activeTargetLevelId, true)}
        autoWalkLabel={tr(
          language,
          `Auto-Fly to Active Sector: ${nextMeta.shortEn}`,
          `طيران ذاتي للقطاع النشط: ${nextMeta.shortAr}`
        )}
        onJoystickMove={(vec) => {
          lastActivityRef.current = performance.now();
          joystickVecRef.current = { x: vec.x, y: vec.z };
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
        jumpMode={isFlightMode ? 'boost' : 'jump'}
        highlightInteract={focusedUnlocked}
        secondaryAction={{
          icon: isFlightMode ? '🛰️' : '🚀',
          label: isFlightMode
            ? tr(language, 'Dock', 'التحام')
            : tr(language, 'Free Fly', 'طيران حر'),
          active: isFlightMode,
          testId: 'toggle-flight-btn',
          onClick: toggleFreeFlight
        }}
        onSprintChange={(s) => {
          lastActivityRef.current = performance.now();
          isBoostingRef.current = s;
        }}
        gravityLabelAr={
          isFlightMode
            ? tr(language, 'Orbital Jetpack Flight', 'طيران نفاث حر')
            : tr(language, focusedNode.telemetryEn, focusedNode.telemetryAr)
        }
        hintAr={
          isFlightMode
            ? tr(
                language,
                'WASD Fly • Space Boost Up • Shift Thruster • F Land on Terrain',
                'تحرك بالطيران الحر • Space للارتفاع • Shift للدفع • F للهبوط على التضاريس'
              )
            : tr(
                language,
                'WASD Walk Hills & Bridges • Shift Jetpack • F Free Fly • E Enter Sector',
                'امشِ فوق التلال والجسور • Shift نفاث • F طيران حر • E دخول القطاع'
              )
        }
      />
    </div>
  );
};
