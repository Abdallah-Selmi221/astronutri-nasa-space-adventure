import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import { CAMPAIGN_LEVELS } from '../../data/campaignLevels';
import { CampaignLevelId, CampaignProgressState, SpaceFitXState } from '../../types/game';
import { soundManager } from '../../utils/sound';
import { useGameState } from '../../context/GameContext';
import { LEVEL_TITLES_BILINGUAL } from '../../data/campaignBilingual';
import { tr } from '../../utils/i18n';
import { CheckCircle2, Lock } from 'lucide-react';
import { createCosmicSkyBackdrop } from './archipelagoPrimitives';
import {
  animateBlenderEnvironmentGlb,
  attachBlenderPlanetsFromPack,
  attachBlenderSpaceship,
  attachSpaceNodeGlb,
  disposeObject3D,
  getLoadedGlbUrls,
  SpaceNodeModelKey
} from './blenderModelLoader';
import { ColoredGeometryPart, mergeColoredParts } from './threeMergeUtils';
import { createFloorGuideArrowSystem, lerpAngle } from './thirdPersonPhysics';
import { ThirdPersonControlsOverlay } from './ThirdPersonControlsOverlay';

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
  sprite.scale.set(5.4, 1.35, 1);
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

  // Orbital trajectory state (0..1 spline parameter along Nodes 1 -> 2 -> 3 -> 4)
  const initialIdx = Math.max(0, TRAJECTORY_NODES.findIndex((n) => n.levelId === activeTargetLevelId));
  const splineTRef = useRef<number>(initialIdx / 3);
  const targetSplineTRef = useRef<number>(initialIdx / 3);
  const pendingEnterLevelRef = useRef<CampaignLevelId | null>(null);

  // Free flight & camera controls
  const isFlightModeRef = useRef<boolean>(false);
  const freeCraftPosRef = useRef<THREE.Vector3>(TRAJECTORY_NODES[initialIdx].center.clone().add(new THREE.Vector3(0, 2.2, 0)));
  const freeCraftYawRef = useRef<number>(Math.PI / 2);
  const joystickVecRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isBoostingRef = useRef<boolean>(false);
  const ascendUntilRef = useRef<number>(0);
  const orbitYawRef = useRef<number>(0);
  const orbitPitchRef = useRef<number>(0.42);
  const celebrateUntilRef = useRef<number>(0);
  const lastActivityRef = useRef<number>(performance.now());
  const toastTimerRef = useRef<number | null>(null);

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
    soundManager.playClick();
    setFocusedLevel(lid);
    isFlightModeRef.current = false;
    setIsFlightMode(false);
    targetSplineTRef.current = idx / 3;
    pendingEnterLevelRef.current = enterWhenDocked ? lid : null;
    gsap.to(orbitYawRef, {
      current: Math.max(-0.34, Math.min(0.34, -TRAJECTORY_NODES[idx].center.x * 0.018)),
      duration: 0.85,
      ease: 'power2.out'
    });

    // If spacecraft is already docked cleanly at that node, enter immediately!
    if (enterWhenDocked && Math.abs(splineTRef.current - idx / 3) < 0.03) {
      pendingEnterLevelRef.current = null;
      soundManager.playDropSuccess();
      onSelectLevelRef.current(lid);
    }
  };

  const toggleFreeFlight = () => {
    lastActivityRef.current = performance.now();
    soundManager.playClick();
    const next = !isFlightModeRef.current;
    isFlightModeRef.current = next;
    setIsFlightMode(next);
    pendingEnterLevelRef.current = null;
    if (next) {
      const node = TRAJECTORY_NODES.find((n) => n.levelId === focusedLevelRef.current) || TRAJECTORY_NODES[0];
      freeCraftPosRef.current.copy(node.center).add(new THREE.Vector3(0, 2.4, 2.2));
    }
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
    let isDisposed = false;
    const camera = new THREE.PerspectiveCamera(48, dims.w / dims.h, 0.1, 240);
    camera.position.set(-6, 17, 31);
    orbitPitchRef.current = 0.78;
    orbitYawRef.current = -0.35;
    const worldFlyInTween = gsap.to(orbitPitchRef, {
      current: 0.42,
      duration: 1.45,
      ease: 'power2.out'
    });
    const worldYawInTween = gsap.to(orbitYawRef, {
      current: 0,
      duration: 1.45,
      ease: 'power2.out'
    });

    const skyHandle = createCosmicSkyBackdrop(scene, 'nebula');
    const hemi = new THREE.HemisphereLight(0xe0f2fe, 0x0f172a, 1.28);
    const sun = new THREE.DirectionalLight(0xfffbeb, 1.75);
    sun.position.set(16, 22, 18);
    const rim = new THREE.DirectionalLight(0x38bdf8, 0.85);
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
        { nodeName: 'PlanetMoon', id: 'BgMoon', position: [5.5, 4.4, -7.8], scale: 2.5 },
        { nodeName: 'PlanetSaturn', id: 'BgSaturn', position: [18, 7.2, -16], scale: 2.1 }
      ],
      isDisposed: () => isDisposed,
      onLoaded: (loaded) => {
        blenderPlanets = loaded;
        if (loaded.BgEarth) disposeObject3D(earthFallback);
        if (loaded.BgMoon) disposeObject3D(moonFallback);
      }
    });

    // 2. Curved 3D Earth-to-Moon Orbital Trajectory Spline (Nodes 1 -> 2 -> 3 -> 4)
    const trajectoryCurve = new THREE.CatmullRomCurve3(
      TRAJECTORY_NODES.map((n) => n.center.clone()),
      false,
      'centripetal',
      0.4
    );

    const unlockedSet = new Set<CampaignLevelId>(campaign.unlockedLevels);
    for (let legIdx = 0; legIdx < TRAJECTORY_NODES.length - 1; legIdx++) {
      const b = TRAJECTORY_NODES[legIdx + 1];
      const legUnlocked = unlockedSet.has(b.levelId);
      const pts: THREE.Vector3[] = [];
      for (let s = 0; s <= 16; s++) {
        const t = (legIdx + s / 16) / 3;
        pts.push(trajectoryCurve.getPointAt(Math.min(1, t)));
      }
      const legCurve = new THREE.CatmullRomCurve3(pts);
      const legMesh = new THREE.Mesh(
        new THREE.TubeGeometry(legCurve, 20, legUnlocked ? 0.14 : 0.08, 8, false),
        new THREE.MeshStandardMaterial({
          color: legUnlocked ? b.accentColor : 0x475569,
          emissive: legUnlocked ? b.accentColor : 0x1e293b,
          emissiveIntensity: legUnlocked ? 0.85 : 0.25,
          transparent: true,
          opacity: legUnlocked ? 0.92 : 0.38
        })
      );
      scene.add(legMesh);
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
    const nodeGroups: { cfg: TrajectoryNodeConfig; root: THREE.Group; ring: THREE.Mesh; halo: THREE.Object3D }[] = [];
    const glbLoadedRefs: THREE.Object3D[] = [];

    TRAJECTORY_NODES.forEach((cfg) => {
      const unlocked = unlockedSet.has(cfg.levelId);
      const completed = checkLevelCompleted(campaign, cfg.levelId);
      const isActive = activeTargetLevelId === cfg.levelId;

      const root = new THREE.Group();
      root.position.copy(cfg.center);
      scene.add(root);

      // Orbital ring docking halo
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(2.65, 0.12, 10, 32),
        new THREE.MeshStandardMaterial({
          color: completed ? 0x34d399 : unlocked ? cfg.accentColor : 0x475569,
          emissive: completed ? 0x10b981 : isActive ? cfg.accentColor : 0x0f172a,
          emissiveIntensity: isActive ? 0.95 : unlocked ? 0.48 : 0.15,
          roughness: 0.3
        })
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = -0.35;
      root.add(ring);

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
      sprite.position.set(0, 3.85, 0);
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
      halo.position.set(0, 4.95, 0);
      halo.visible = isActive;
      root.add(halo);

      nodeGroups.push({ cfg, root, ring, halo });
    });

    // 4. Player's Animated Spacecraft + SPACE-FIT X Astronaut Pilot
    const playerCraftRoot = new THREE.Group();
    scene.add(playerCraftRoot);
    const craftFallback = new THREE.Mesh(
      mergeColoredParts([
        { geometry: new THREE.ConeGeometry(0.55, 1.5, 8), color: 0xf8fafc, rotation: [Math.PI / 2, 0, 0] },
        { geometry: new THREE.BoxGeometry(1.55, 0.14, 0.65), color: 0x38bdf8, position: [0, -0.05, -0.25] }
      ]),
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35 })
    );
    playerCraftRoot.add(craftFallback);
    attachBlenderSpaceship({
      targetParent: playerCraftRoot,
      position: [0, 0, 0],
      rotationY: 0,
      scale: 1.15,
      fallbackNodes: [craftFallback],
      isDisposed: () => isDisposed
    });

    const thrusterHalo = new THREE.Mesh(
      new THREE.ConeGeometry(0.32, 0.95, 10),
      new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.78 })
    );
    thrusterHalo.rotation.x = -Math.PI / 2;
    thrusterHalo.position.set(0, 0, -1.25);
    playerCraftRoot.add(thrusterHalo);

    // Lightweight 2-draw-call merged SPACE-FIT X Pilot Astronaut + Hovering Robo Companion
    const pilotMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.25 });
    const pilotBust = new THREE.Mesh(
      mergeColoredParts([
        { geometry: new THREE.CylinderGeometry(0.24, 0.28, 0.44, 10), color: 0x0f172a, position: [0, 0.22, 0] },
        { geometry: new THREE.BoxGeometry(0.32, 0.22, 0.28), color: 0x22d3ee, position: [0, 0.28, -0.02] },
        { geometry: new THREE.SphereGeometry(0.24, 12, 10), color: 0xe2e8f0, position: [0, 0.56, 0] },
        { geometry: new THREE.SphereGeometry(0.2, 10, 8), color: 0xf59e0b, position: [0, 0.56, 0.08] }
      ]),
      pilotMat
    );
    pilotBust.position.set(0, 0.38, 0.08);
    playerCraftRoot.add(pilotBust);

    const roboMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0.35 });
    const roboDrone = new THREE.Mesh(
      mergeColoredParts([
        { geometry: new THREE.SphereGeometry(0.18, 10, 8), color: 0x38bdf8, position: [0, 0, 0] },
        { geometry: new THREE.BoxGeometry(0.22, 0.09, 0.14), color: 0x0f172a, position: [0, 0.02, 0.12] },
        { geometry: new THREE.SphereGeometry(0.05, 6, 6), color: 0xfacc15, position: [0, 0.24, 0] }
      ]),
      roboMat
    );
    roboDrone.position.set(0.62, 0.95, -0.15);
    playerCraftRoot.add(roboDrone);

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
      if (k === ' ' || e.code === 'Space') ascendUntilRef.current = performance.now() + 260;
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

    let dragOrbiting = false;
    let downPos = { x: 0, y: 0 };
    let prevPos = { x: 0, y: 0 };
    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();
    const domEl = renderer.domElement;

    const onPointerDown = (e: PointerEvent) => {
      lastActivityRef.current = performance.now();
      dragOrbiting = true;
      downPos = { x: e.clientX, y: e.clientY };
      prevPos = { x: e.clientX, y: e.clientY };
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!dragOrbiting) return;
      const dx = e.clientX - prevPos.x;
      const dy = e.clientY - prevPos.y;
      prevPos = { x: e.clientX, y: e.clientY };
      orbitYawRef.current -= dx * 0.0055;
      orbitPitchRef.current = Math.max(0.12, Math.min(0.95, orbitPitchRef.current + dy * 0.004));
    };
    const onPointerUp = (e: PointerEvent) => {
      if (!dragOrbiting) return;
      dragOrbiting = false;
      if (Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y) > 7) return;
      const rect = domEl.getBoundingClientRect();
      pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
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
    domEl.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

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
      const dt = Math.min((now - prevMs) / 1000, 0.05);
      const elapsed = (now - startMs) / 1000;
      prevMs = now;

      skyHandle.update(elapsed);

      // Slowly spin background Earth & Moon
      if (blenderPlanets.BgEarth) blenderPlanets.BgEarth.rotation.y = elapsed * 0.08;
      if (blenderPlanets.BgMoon) blenderPlanets.BgMoon.rotation.y = -elapsed * 0.06;
      if (blenderPlanets.BgSaturn) blenderPlanets.BgSaturn.rotation.y = elapsed * 0.05;
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

      // Gentle hover + beacon spin on space nodes + animated Blender GLBs
      glbLoadedRefs.forEach((g, idx) => animateBlenderEnvironmentGlb(g, elapsed + idx * 0.85));
      nodeGroups.forEach(({ root, ring, halo, cfg }, idx) => {
        ring.rotation.z = elapsed * 0.22 * (idx % 2 === 0 ? 1 : -1);
        root.position.y = cfg.center.y + Math.sin(elapsed * 1.15 + idx * 1.1) * 0.14;
        if (halo.visible) {
          halo.rotation.y = elapsed * 2.2;
          halo.position.y = 4.85 + Math.sin(elapsed * 3.4) * 0.25;
        }
      });

      // Spacecraft Motion: either Free Flight OR Smooth Orbital Spline Auto-Fly
      let inputX = joystickVecRef.current.x;
      let inputZ = joystickVecRef.current.y;
      if (keysDown.has('a') || keysDown.has('arrowleft')) inputX -= 1;
      if (keysDown.has('d') || keysDown.has('arrowright')) inputX += 1;
      if (keysDown.has('w') || keysDown.has('arrowup')) inputZ -= 1;
      if (keysDown.has('s') || keysDown.has('arrowdown')) inputZ += 1;
      const inLen = Math.hypot(inputX, inputZ);

      if (isFlightModeRef.current) {
        if (inLen > 0.08) {
          lastActivityRef.current = now;
          const speed = (isBoostingRef.current ? 16 : 9.5) * dt;
          freeCraftPosRef.current.x = Math.max(-24, Math.min(24, freeCraftPosRef.current.x + (inputX / inLen) * speed));
          freeCraftPosRef.current.z = Math.max(-14, Math.min(14, freeCraftPosRef.current.z + (inputZ / inLen) * speed));
          const yaw = Math.atan2(inputX, inputZ);
          freeCraftYawRef.current = lerpAngle(freeCraftYawRef.current, yaw, 1 - Math.exp(-10 * dt));
        }
        if (now < ascendUntilRef.current) {
          freeCraftPosRef.current.y = Math.min(10, freeCraftPosRef.current.y + 7.5 * dt);
        } else if (freeCraftPosRef.current.y > 2.2) {
          freeCraftPosRef.current.y = Math.max(2.2, freeCraftPosRef.current.y - 3.0 * dt);
        }
        playerCraftRoot.position.copy(freeCraftPosRef.current);
        playerCraftRoot.rotation.set(0, freeCraftYawRef.current, inLen > 0.1 ? -inputX * 0.18 : 0);

        // Focus nearest node during free flight
        let bestLid = focusedLevelRef.current;
        let bestDist = Infinity;
        for (const n of TRAJECTORY_NODES) {
          const d = playerCraftRoot.position.distanceTo(n.center);
          if (d < bestDist) {
            bestDist = d;
            bestLid = n.levelId;
          }
        }
        if (bestLid !== focusedLevelRef.current) {
          setFocusedLevel(bestLid);
        }
      } else {
        // Check if manual input switches to free flight or nudges spline target
        if (inLen > 0.45) {
          const nextDelta = Math.sign(inputX) * 0.25 * dt;
          splineTRef.current = Math.max(0, Math.min(1, splineTRef.current + nextDelta));
          targetSplineTRef.current = splineTRef.current;
        } else {
          const diff = targetSplineTRef.current - splineTRef.current;
          if (Math.abs(diff) > 0.004) {
            const step = Math.sign(diff) * Math.min(Math.abs(diff), 0.55 * dt);
            splineTRef.current += step;
          } else {
            splineTRef.current = targetSplineTRef.current;
            const queued = pendingEnterLevelRef.current;
            if (queued) {
              pendingEnterLevelRef.current = null;
              soundManager.playDropSuccess();
              onSelectLevelRef.current(queued);
            }
          }
        }

        const craftPt = trajectoryCurve.getPointAt(Math.max(0, Math.min(1, splineTRef.current)));
        const lookPt = trajectoryCurve.getPointAt(Math.min(1, splineTRef.current + 0.015));
        playerCraftRoot.position.set(craftPt.x, craftPt.y + 2.3 + Math.sin(elapsed * 2.2) * 0.15, craftPt.z);
        tmpNextPt.set(lookPt.x, playerCraftRoot.position.y, lookPt.z);
        if (playerCraftRoot.position.distanceToSquared(tmpNextPt) > 0.0001) {
          playerCraftRoot.lookAt(tmpNextPt);
        }
      }

      // Pulse thruster flame
      const thrustScale = 0.85 + Math.sin(elapsed * 18) * 0.18;
      thrusterHalo.scale.set(1, thrustScale, 1);

      // Update Pilot Astronaut animation + Space Floor Guide Arrow pointing toward Next Mission
      const idleSec = (now - lastActivityRef.current) / 1000;
      if (idleSec > 8.5) {
        setShowIdleHint(true);
      }

      // Animate lightweight Pilot Bust + Robo Companion
      const isCelebrating = now < celebrateUntilRef.current;
      const themeHex =
        suitStateRef.current?.suitTheme === 'mars_crimson'
          ? 0xf43f5e
          : suitStateRef.current?.suitTheme === 'gold_emerald'
          ? 0x10b981
          : 0x22d3ee;
      pilotMat.emissive.setHex(inLen > 0.1 ? themeHex : 0x000000);
      pilotMat.emissiveIntensity = inLen > 0.1 ? 0.18 : 0;
      pilotBust.position.y = 0.38 + (isCelebrating ? Math.abs(Math.sin(elapsed * 8)) * 0.28 : Math.sin(elapsed * 2.4) * 0.04);
      pilotBust.rotation.y = isCelebrating ? elapsed * 4 : Math.sin(elapsed * 1.4) * 0.15;
      roboDrone.position.y = 0.95 + Math.sin(elapsed * 3.4) * 0.14;
      roboDrone.rotation.y = Math.sin(elapsed * 1.8) * 0.45;

      floorArrow.update(
        new THREE.Vector3(playerCraftRoot.position.x, playerCraftRoot.position.y - 1.6, playerCraftRoot.position.z),
        activeTargetNode.center,
        playerCraftRoot.position.y - 1.6,
        elapsed
      );

      // Smooth Follow Camera framed along Earth-to-Moon trajectory
      const camTarget = isFlightModeRef.current
        ? playerCraftRoot.position
        : playerCraftRoot.position.clone().lerp(new THREE.Vector3(0, 0.8, 0), 0.62);

      const camDist = isFlightModeRef.current ? 12.5 : 27.5;
      const desiredX = camTarget.x + Math.sin(orbitYawRef.current) * camDist * 0.45;
      const desiredY = camTarget.y + 4.8 + orbitPitchRef.current * 9.5;
      const desiredZ = camTarget.z + Math.cos(orbitYawRef.current) * camDist;

      camera.position.lerp(new THREE.Vector3(desiredX, desiredY, desiredZ), 1 - Math.exp(-5.5 * dt));
      camera.lookAt(camTarget.x, camTarget.y, camTarget.z);

      renderer.render(scene, camera);
      mount.dataset.drawCalls = String(renderer.info.render.calls);
      mount.dataset.glbLoaded = getLoadedGlbUrls().join(',');
    };

    animate();

    return () => {
      isDisposed = true;
      worldFlyInTween.kill();
      worldYawInTween.kill();
      gsap.killTweensOf(orbitYawRef);
      gsap.killTweensOf(orbitPitchRef);
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      domEl.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('resize', onResize);
      skyHandle.dispose();
      floorArrow.dispose();
      pilotBust.geometry.dispose();
      pilotMat.dispose();
      roboDrone.geometry.dispose();
      roboMat.dispose();
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

      {/* Top-Center Compact Orbital Node Selector Strip */}
      <div
        dir={language === 'ar' ? 'rtl' : 'ltr'}
        className="pointer-events-none fixed top-16 sm:top-3.5 inset-x-0 z-20 flex justify-center px-3"
      >
        <div className="pointer-events-auto inline-flex flex-wrap items-center justify-center gap-1 px-2 py-1 rounded-full bg-slate-950/65 border border-cyan-400/40 backdrop-blur-md shadow-lg max-w-full">
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
            onClick={toggleFreeFlight}
            className={`px-2.5 py-1 rounded-full border text-[11px] font-hud font-black flex items-center gap-1 transition-all cursor-pointer ${
              isFlightMode
                ? 'bg-cyan-400 text-slate-950 border-white shadow-[0_0_12px_rgba(34,211,238,0.75)]'
                : 'bg-indigo-950/75 border-cyan-300/65 text-cyan-100 hover:bg-indigo-900'
            }`}
          >
            <span>
              {isFlightMode
                ? tr(language, '🛰️ Dock', '🛰️ التحام')
                : tr(language, '🚀 Fly', '🚀 طيران')}
            </span>
          </button>

          <span
            data-testid="active-biome-badge"
            className="hidden sm:inline-flex px-2 py-1 rounded-full bg-slate-900/70 border border-white/20 text-[10px] font-hud font-bold text-cyan-200 whitespace-nowrap"
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
          `Fly to Next Mission: ${nextMeta.shortEn}`,
          `انطلق للمهمة التالية: ${nextMeta.shortAr}`
        )}
        onJoystickMove={(vec) => {
          lastActivityRef.current = performance.now();
          joystickVecRef.current = { x: vec.x, y: vec.z };
        }}
        onJump={() => {
          lastActivityRef.current = performance.now();
          ascendUntilRef.current = performance.now() + 260;
        }}
        onSprintChange={(s) => {
          lastActivityRef.current = performance.now();
          isBoostingRef.current = s;
        }}
        gravityLabelAr={
          isFlightMode
            ? tr(language, 'Orbital Free Flight', 'طيران فضائي حر')
            : tr(language, focusedNode.telemetryEn, focusedNode.telemetryAr)
        }
        hintAr={
          isFlightMode
            ? tr(
                language,
                'WASD Fly • Space Boost Up • F Dock to Route',
                'WASD للطيران • Space للارتفاع • F للعودة للمسار'
              )
            : tr(
                language,
                'Tap any Node or Fly to Launch • F Free Flight • E Enter',
                'اضغط أي محطة للإقلاع • F للطيران الحر • E للدخول'
              )
        }
      />
    </div>
  );
};
