import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import { CAMPAIGN_LEVELS } from '../../data/campaignLevels';
import { CampaignLevelId, CampaignProgressState, SpaceFitXState } from '../../types/game';
import { soundManager } from '../../utils/sound';
import { initialSpaceFitXState, useGameState } from '../../context/GameContext';
import { LEVEL_TITLES_BILINGUAL } from '../../data/campaignBilingual';
import { HUB_MUSEUM_FACTS, markFactDiscovered } from '../../data/earthDiscoveryFacts';
import { tr } from '../../utils/i18n';
import { CheckCircle2, ChevronLeft, ChevronRight, Lock, X } from 'lucide-react';
import { buildSpaceFitXCharacter } from './buildSpaceFitXCharacter';
import { createSpaceRoverVehicle, SpaceRoverController } from './buildRoverVehicle';
import { createCosmicSkyBackdrop } from './archipelagoPrimitives';
import {
  animateBlenderEnvironmentGlb,
  attachEarthBuildingGlb,
  attachPhase3PlanetGlb,
  getLoadedGlbUrls,
  SpaceNodeModelKey
} from './blenderModelLoader';
import { getQualityRenderConfig, useDisplaySettings } from '../../utils/displaySettings';
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

const COMMAND_DECK_PLAY_RADIUS = 30;
const evalCommandDeckFloorY = (_x: number, _z: number): number => 0;
const evalCommandDeckNormal = (_x: number, _z: number): { x: number; y: number; z: number } => ({
  x: 0,
  y: 1,
  z: 0
});
function clampCommandDeckPosition(x: number, z: number): { x: number; z: number } {
  const d = Math.hypot(x, z);
  if (d > COMMAND_DECK_PLAY_RADIUS) {
    const s = COMMAND_DECK_PLAY_RADIUS / d;
    return { x: x * s, z: z * s };
  }
  return { x, z };
}

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

interface GatewayNodeConfig {
  levelId: CampaignLevelId;
  modelKey: SpaceNodeModelKey;
  x: number;
  z: number;
  accentColor: number;
  accentHex: string;
  enLabel: string;
  arLabel: string;
  telemetryEn: string;
  telemetryAr: string;
}

const GATEWAY_NODES: GatewayNodeConfig[] = [
  {
    levelId: 1,
    modelKey: 'earth_launchpad',
    x: -13.5,
    z: -4.5,
    accentColor: 0x38bdf8,
    accentHex: '#38bdf8',
    enLabel: '1. Earth Spaceport',
    arLabel: '1. كوكب الأرض',
    telemetryEn: 'Earth Spaceport • 1.0G',
    telemetryAr: 'مركز الأرض • 1.0G'
  },
  {
    levelId: 2,
    modelKey: 'iss_orbit_station',
    x: -4.6,
    z: -10.5,
    accentColor: 0x818cf8,
    accentHex: '#818cf8',
    enLabel: '2. ISS Orbit',
    arLabel: '2. محطة الفضاء',
    telemetryEn: 'ISS Orbital Station • 0.0G',
    telemetryAr: 'محطة الفضاء • 0.0G'
  },
  {
    levelId: 3,
    modelKey: 'lunar_biodome_base',
    x: 4.6,
    z: -10.5,
    accentColor: 0xfbbf24,
    accentHex: '#fbbf24',
    enLabel: '3. Moon Base',
    arLabel: '3. قاعدة القمر',
    telemetryEn: 'Moon Shackleton Base • 0.16G',
    telemetryAr: 'قاعدة القمر • 0.16G'
  },
  {
    levelId: 4,
    modelKey: 'orion_reentry_capsule',
    x: 13.5,
    z: -4.5,
    accentColor: 0xf97316,
    accentHex: '#f97316',
    enLabel: '4. Mars Canyon',
    arLabel: '4. كوكب المريخ',
    telemetryEn: 'Mars Red Canyon • 0.38G',
    telemetryAr: 'وادي المريخ • 0.38G'
  }
];

function createStarportDeckTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const cx = size / 2;
    const cy = size / 2;
    const grad = ctx.createRadialGradient(cx, cy, 40, cx, cy, size * 0.5);
    grad.addColorStop(0, '#0f2547');
    grad.addColorStop(0.45, '#0b1833');
    grad.addColorStop(1, '#060d1f');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    // Subtle titanium plate grid
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
    ctx.lineWidth = 2;
    for (let i = 0; i <= size; i += 64) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(size, i);
      ctx.stroke();
    }

    // Concentric glowing cyan & gold deck rings
    [130, 240, 360, 455].forEach((r, idx) => {
      ctx.strokeStyle = idx % 2 === 0 ? 'rgba(34, 211, 238, 0.38)' : 'rgba(251, 191, 36, 0.28)';
      ctx.lineWidth = idx === 3 ? 6 : 3;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    });
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, maxAnisotropy);
  tex.needsUpdate = true;
  return tex;
}

function createPlanetSphereTexture(kind: 'earth' | 'moon' | 'mars'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    if (kind === 'earth') {
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(0, 0, 256, 128);
      ctx.fillStyle = '#22c55e';
      const continents = [
        [45, 48, 28, 18],
        [98, 42, 34, 24],
        [156, 55, 26, 20],
        [205, 44, 30, 16]
      ];
      continents.forEach(([x, y, rx, ry]) => {
        ctx.beginPath();
        ctx.ellipse(x, y, rx, ry, 0.3, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillRect(0, 0, 256, 12);
      ctx.fillRect(0, 116, 256, 12);
    } else if (kind === 'moon') {
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(0, 0, 256, 128);
      for (let i = 0; i < 24; i++) {
        const cx = (i * 47 + 19) % 240 + 8;
        const cy = (i * 31 + 17) % 108 + 10;
        const r = 4 + (i % 5) * 3;
        ctx.fillStyle = '#94a3b8';
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    } else {
      ctx.fillStyle = '#c2410c';
      ctx.fillRect(0, 0, 256, 128);
      ctx.fillStyle = '#ea580c';
      for (let i = 0; i < 6; i++) {
        ctx.fillRect(0, i * 22 + 4, 256, 8);
      }
      ctx.fillStyle = '#7c2d12';
      for (let i = 0; i < 14; i++) {
        ctx.beginPath();
        ctx.arc((i * 53 + 22) % 240 + 8, (i * 29 + 14) % 100 + 14, 5 + (i % 4) * 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(255,237,213,0.7)';
      ctx.fillRect(0, 0, 256, 9);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createGatewayHologram(
  levelId: CampaignLevelId,
  disposableTextures: THREE.Texture[]
): THREE.Group {
  const holo = new THREE.Group();
  if (levelId === 1) {
    const tex = createPlanetSphereTexture('earth');
    disposableTextures.push(tex);
    const globe = new THREE.Mesh(
      new THREE.SphereGeometry(1.38, 24, 24),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.45, metalness: 0.1 })
    );
    holo.add(globe);
    const rocketOrbit = new THREE.Mesh(
      new THREE.TorusGeometry(1.9, 0.06, 8, 32),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.85 })
    );
    rocketOrbit.rotation.x = Math.PI * 0.36;
    holo.add(rocketOrbit);
  } else if (levelId === 2) {
    const core = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.42, 2.3, 14),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.6, roughness: 0.25 })
    );
    core.rotation.z = Math.PI / 2;
    const solarL = new THREE.Mesh(
      new THREE.BoxGeometry(0.95, 0.08, 2.55),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x1d4ed8, emissiveIntensity: 0.55 })
    );
    solarL.position.x = -1.25;
    const solarR = solarL.clone();
    solarR.position.x = 1.25;
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.65, 0.07, 8, 28),
      new THREE.MeshBasicMaterial({ color: 0x818cf8, transparent: true, opacity: 0.8 })
    );
    ring.rotation.x = Math.PI * 0.42;
    holo.add(core, solarL, solarR, ring);
  } else if (levelId === 3) {
    const tex = createPlanetSphereTexture('moon');
    disposableTextures.push(tex);
    const moon = new THREE.Mesh(
      new THREE.SphereGeometry(1.32, 24, 24),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.78, metalness: 0.05 })
    );
    const orbit = new THREE.Mesh(
      new THREE.TorusGeometry(1.85, 0.06, 8, 32),
      new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.85 })
    );
    orbit.rotation.x = -Math.PI * 0.35;
    holo.add(moon, orbit);
  } else {
    const tex = createPlanetSphereTexture('mars');
    disposableTextures.push(tex);
    const mars = new THREE.Mesh(
      new THREE.SphereGeometry(1.38, 24, 24),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.65, metalness: 0.08, emissive: 0x431407, emissiveIntensity: 0.35 })
    );
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.9, 0.06, 8, 32),
      new THREE.MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.85 })
    );
    ring.rotation.x = Math.PI * 0.38;
    holo.add(mars, ring);
  }
  return holo;
}

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
    const bg = locked ? 'rgba(15, 23, 42, 0.88)' : 'rgba(9, 17, 38, 0.94)';
    const border = completed ? '#34d399' : locked ? '#64748b' : badgeColorHex;

    ctx.fillStyle = bg;
    ctx.strokeStyle = border;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.roundRect(14, 18, 484, 92, 28);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = locked ? '#cbd5e1' : '#f8fafc';
    ctx.font = 'bold 34px Cairo, Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 65, 450);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(6.2, 1.55, 1);
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
  const [isDrivingRover, setIsDrivingRover] = useState<boolean>(false);
  const [showIdleHint, setShowIdleHint] = useState<boolean>(false);
  const [lockedToast, setLockedToast] = useState<string | null>(null);
  const [isMuseumOpen, setIsMuseumOpen] = useState<boolean>(false);
  const [museumIndex, setMuseumIndex] = useState<number>(0);

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

  // Player starts on the Futuristic Orbital Space Command Deck facing straight toward the 4 Planet Gateways!
  const spawnX = 0;
  const spawnZ = 8.0;
  const spawnY = evalCommandDeckFloorY(spawnX, spawnZ);
  const initFacingYaw = Math.PI; // Facing straight toward -Z where all 4 semicircular gateways stand
  const initCameraYaw = 0; // Camera behind astronaut at +Z looking toward -Z

  const autoNavTargetRef = useRef<{ x: number; z: number } | null>(null);
  const pendingEnterLevelRef = useRef<CampaignLevelId | null>(null);
  const isFlightModeRef = useRef<boolean>(false);
  const isDrivingRoverRef = useRef<boolean>(false);
  const suppressedMuseumRef = useRef<boolean>(false);

  const freeCraftPosRef = useRef<THREE.Vector3>(new THREE.Vector3(spawnX, spawnY, spawnZ));
  const kinematicsRef = useRef<ThirdPersonKinematicsState>(
    createKinematicsState(spawnX, spawnY, spawnZ, performance.now())
  );
  const freeCraftYawRef = useRef<number>(initFacingYaw);

  // Drivable Hub Space Buggy parked on East Wing of Orbital Space Command Deck
  const garageX = 9.5;
  const garageZ = 6.5;
  const roverPosRef = useRef<THREE.Vector3>(
    new THREE.Vector3(garageX, evalCommandDeckFloorY(garageX, garageZ), garageZ)
  );
  const roverYawRef = useRef<number>(-Math.PI * 0.72);
  const roverVelRef = useRef<{ x: number; z: number }>({ x: 0, z: 0 });
  const roverSpeedRef = useRef<number>(0);
  const roverBoostUntilRef = useRef<number>(0);
  const roverDustTimerRef = useRef<number>(0);
  const roverToggleHandlerRef = useRef<() => void>(() => {});

  const joystickVecRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isBoostingRef = useRef<boolean>(false);
  const ascendUntilRef = useRef<number>(0);
  const activeLookRef = useRef<boolean>(false);
  const orbitYawRef = useRef<number>(initCameraYaw);
  const orbitPitchRef = useRef<number>(0.24);
  const targetOrbitYawRef = useRef<number>(initCameraYaw);
  const targetOrbitPitchRef = useRef<number>(0.22);
  const [displaySettings] = useDisplaySettings();
  const displaySettingsRef = useRef(displaySettings);
  displaySettingsRef.current = displaySettings;
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
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
      -0.18,
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
        `Locked! Complete Gateway ${lid - 1} first to open this planetary portal.`,
        `مقفل! أكمل البوابة ${lid - 1} أولاً لفتح هذه البوابة الكوكبية.`
      )
    );
    if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setLockedToast(null), 2600);
  };

  const openSpaceMuseumCard = (factIdx = museumIndex) => {
    soundManager.playClick();
    setIsMuseumOpen(true);
    suppressedMuseumRef.current = false;
    const fact = HUB_MUSEUM_FACTS[factIdx % HUB_MUSEUM_FACTS.length];
    if (fact) {
      const res = markFactDiscovered(fact.id);
      if (res.newlyDiscovered) soundManager.playDropSuccess();
    }
  };

  const getGatewayEntrySpot = (node: GatewayNodeConfig) => {
    const toPlazaLen = Math.hypot(-node.x, 8 - node.z) || 1;
    const ux = -node.x / toPlazaLen;
    const uz = (8 - node.z) / toPlazaLen;
    return { x: node.x + ux * 4.4, z: node.z + uz * 4.4 };
  };

  const flyCraftToNode = (lid: CampaignLevelId, enterWhenDocked = true, immediateOnUnlocked = false) => {
    lastActivityRef.current = performance.now();
    setShowIdleHint(false);
    if (!unlockedLevelsRef.current.includes(lid)) {
      showLockedWarning(lid);
      return;
    }
    const destNode = GATEWAY_NODES.find((n) => n.levelId === lid) || GATEWAY_NODES[0];
    const entry = getGatewayEntrySpot(destNode);
    soundManager.playClick();
    setFocusedLevel(lid);
    isFlightModeRef.current = false;
    setIsFlightMode(false);
    const activePos = isDrivingRoverRef.current ? roverPosRef.current : freeCraftPosRef.current;
    const distXZ = Math.hypot(activePos.x - entry.x, activePos.z - entry.z);
    if (immediateOnUnlocked || (enterWhenDocked && distXZ < 4.5)) {
      autoNavTargetRef.current = null;
      pendingEnterLevelRef.current = null;
      soundManager.playDropSuccess();
      onSelectLevelRef.current(lid);
      return;
    }

    autoNavTargetRef.current = entry;
    pendingEnterLevelRef.current = enterWhenDocked ? lid : null;
  };

  const toggleFreeFlight = () => {
    lastActivityRef.current = performance.now();
    soundManager.playClick();
    if (isDrivingRoverRef.current) {
      isDrivingRoverRef.current = false;
      setIsDrivingRover(false);
    }
    const next = !isFlightModeRef.current;
    isFlightModeRef.current = next;
    autoNavTargetRef.current = null;
    pendingEnterLevelRef.current = null;
    setIsFlightMode(next);
    if (next) {
      freeCraftPosRef.current.y = Math.max(
        freeCraftPosRef.current.y + 1.8,
        evalCommandDeckFloorY(freeCraftPosRef.current.x, freeCraftPosRef.current.z) + 2.4
      );
      ascendUntilRef.current = performance.now() + 260;
    } else {
      const clamped = clampCommandDeckPosition(freeCraftPosRef.current.x, freeCraftPosRef.current.z);
      const groundY = evalCommandDeckFloorY(clamped.x, clamped.z);
      freeCraftPosRef.current.set(clamped.x, groundY, clamped.z);
      kinematicsRef.current = createKinematicsState(clamped.x, groundY, clamped.z, performance.now());
    }
  };

  const triggerWorldJump = () => {
    const now = performance.now();
    lastActivityRef.current = now;
    if (isDrivingRoverRef.current) {
      roverBoostUntilRef.current = now + 1150;
      soundManager.playClick();
      return;
    }
    if (isFlightModeRef.current) {
      ascendUntilRef.current = now + 260;
      soundManager.playClick();
      return;
    }
    if (autoNavTargetRef.current) return;
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
    freeCraftYawRef.current = initFacingYaw;

    const camera = new THREE.PerspectiveCamera(58, dims.w / dims.h, 0.1, 420);
    camera.position.set(spawnX, spawnY + 4.4, spawnZ + 7.2);
    orbitPitchRef.current = 0.28;
    orbitYawRef.current = initCameraYaw - 0.12;
    targetOrbitPitchRef.current = 0.22;
    targetOrbitYawRef.current = initCameraYaw;
    const worldFlyInTween = gsap.to(targetOrbitPitchRef, {
      current: 0.21,
      duration: 0.75,
      ease: 'power2.out'
    });
    const worldYawInTween = gsap.to(targetOrbitYawRef, {
      current: initCameraYaw,
      duration: 0.75,
      ease: 'power2.out'
    });

    // 1. Futuristic Orbital Space Command Deck (ZERO Green Grass or Earth Trees — Deep Space Starfield Backdrop!)
    const cosmicSky = createCosmicSkyBackdrop(scene, 'nebula', { skipSatellite: true });
    scene.fog = new THREE.FogExp2(0x050d24, 0.0085);

    const hemi = new THREE.HemisphereLight(0x93c5fd, 0x1e293b, 1.45);
    const sun = new THREE.DirectionalLight(0xe0f2fe, 2.05);
    sun.position.set(22, 42, 26);
    sun.castShadow = initUltraShadows;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.near = 2;
    sun.shadow.camera.far = 140;
    sun.shadow.camera.left = -45;
    sun.shadow.camera.right = 45;
    sun.shadow.camera.top = 45;
    sun.shadow.camera.bottom = -45;
    sunLightRef.current = sun;
    const rim = new THREE.DirectionalLight(0xfbbf24, 0.85);
    rim.position.set(-24, 14, -22);
    scene.add(hemi, sun, rim);

    const disposableTextures: THREE.Texture[] = [];
    const glbLoadedRefs: THREE.Object3D[] = [];
    const hubObstacles: CircleObstacle[] = [];

    // Main Dark-Titanium Observation Deck (Radius 33m, flush top surface at y = 0)
    const deckTex = createStarportDeckTexture(renderer.capabilities.getMaxAnisotropy());
    disposableTextures.push(deckTex);
    const deckFloor = new THREE.Mesh(
      new THREE.CylinderGeometry(33, 35, 1.4, 48),
      new THREE.MeshStandardMaterial({
        map: deckTex,
        color: 0xffffff,
        metalness: 0.45,
        roughness: 0.42
      })
    );
    deckFloor.position.set(0, -0.7, 0);
    deckFloor.receiveShadow = true;
    scene.add(deckFloor);

    // Outer Glowing Cyan Rim Ring & Observation Deck Safety Pillars
    const deckTrimRing = new THREE.Mesh(
      new THREE.TorusGeometry(32.5, 0.22, 10, 64),
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.9,
        roughness: 0.25
      })
    );
    deckTrimRing.rotation.x = Math.PI / 2;
    deckTrimRing.position.y = 0.06;
    scene.add(deckTrimRing);

    const railParts: ColoredGeometryPart[] = [];
    for (let i = 0; i < 18; i++) {
      const ang = (i / 18) * Math.PI * 2;
      const rx = Math.cos(ang) * 30.8;
      const rz = Math.sin(ang) * 30.8;
      railParts.push({
        geometry: new THREE.CylinderGeometry(0.16, 0.22, 1.35, 8),
        color: i % 3 === 0 ? 0xfbbf24 : 0x38bdf8,
        position: [rx, 0.68, rz]
      });
    }
    const railsMesh = new THREE.Mesh(
      mergeColoredParts(railParts),
      new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.55, roughness: 0.35 })
    );
    scene.add(railsMesh);

    // Center Hologram Spawn Pad at (0, 0, 8) + 4 Radial Glowing Light-Strips to Planet Gateways
    const plazaParts: ColoredGeometryPart[] = [
      { geometry: new THREE.CylinderGeometry(4.2, 4.7, 0.14, 32), color: 0x0f2547, position: [0, 0.04, 8] },
      { geometry: new THREE.TorusGeometry(4.15, 0.09, 8, 36), color: 0x22d3ee, position: [0, 0.12, 8], rotation: [Math.PI / 2, 0, 0] },
      { geometry: new THREE.TorusGeometry(2.6, 0.06, 8, 28), color: 0xfbbf24, position: [0, 0.12, 8], rotation: [Math.PI / 2, 0, 0] }
    ];
    GATEWAY_NODES.forEach((n) => {
      const dx = n.x - spawnX;
      const dz = n.z - spawnZ;
      const len = Math.hypot(dx, dz);
      const midX = (spawnX + n.x) * 0.5;
      const midZ = (spawnZ + n.z) * 0.5;
      const rotY = Math.atan2(dx, dz);
      plazaParts.push({
        geometry: new THREE.BoxGeometry(0.45, 0.04, Math.max(2, len - 5.2)),
        color: campaign.unlockedLevels.includes(n.levelId) ? n.accentColor : 0x334155,
        position: [midX, 0.03, midZ],
        rotation: [0, rotY, 0]
      });
    });
    const plazaStripsMesh = new THREE.Mesh(
      mergeColoredParts(plazaParts),
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        emissive: 0x0ea5e9,
        emissiveIntensity: 0.35,
        roughness: 0.25
      })
    );
    scene.add(plazaStripsMesh);

    // Sci-Fi Orbital Rib Arches far behind gateways (clean background architecture)
    const archGroup = new THREE.Group();
    archGroup.position.set(0, 0, -21);
    scene.add(archGroup);
    attachPhase3PlanetGlb({
      modelName: 'iss_orbital_ribs',
      targetParent: archGroup,
      scale: 1.35,
      position: [0, -0.2, 0],
      rotationY: 0,
      isDisposed: () => isDisposed,
      onLoaded: (g) => {
        glbLoadedRefs.push(g);
      }
    });

    // 3. Drivable Hub Space Buggy parked on East Wing of Orbital Deck
    const initRoverY = evalCommandDeckFloorY(roverPosRef.current.x, roverPosRef.current.z);
    roverPosRef.current.y = initRoverY;
    const roverCtrl: SpaceRoverController = createSpaceRoverVehicle({
      scene,
      position: [roverPosRef.current.x, initRoverY, roverPosRef.current.z],
      rotationY: roverYawRef.current,
      isDisposed: () => isDisposed
    });
    const roverBeaconRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.75, 0.08, 8, 28),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.85 })
    );
    roverBeaconRing.rotation.x = Math.PI / 2;
    roverBeaconRing.position.set(roverPosRef.current.x, initRoverY + 0.08, roverPosRef.current.z);
    scene.add(roverBeaconRing);

    roverToggleHandlerRef.current = () => {
      lastActivityRef.current = performance.now();
      soundManager.playClick();
      if (isFlightModeRef.current) {
        isFlightModeRef.current = false;
        setIsFlightMode(false);
      }
      const next = !isDrivingRoverRef.current;
      isDrivingRoverRef.current = next;
      setIsDrivingRover(next);
      autoNavTargetRef.current = null;
      pendingEnterLevelRef.current = null;
      roverVelRef.current = { x: 0, z: 0 };
      roverBoostUntilRef.current = 0;
      const now = performance.now();
      if (next) {
        roverCtrl.setHeadlights(true);
        roverBeaconRing.visible = false;
        freeCraftPosRef.current.copy(roverPosRef.current);
        kinematicsRef.current = createKinematicsState(
          roverPosRef.current.x,
          roverPosRef.current.y,
          roverPosRef.current.z,
          now
        );
      } else {
        roverCtrl.setHeadlights(false);
        roverBeaconRing.visible = true;
        const sideX = roverPosRef.current.x + Math.cos(roverYawRef.current) * 2.15;
        const sideZ = roverPosRef.current.z - Math.sin(roverYawRef.current) * 2.15;
        const sideY = evalCommandDeckFloorY(sideX, sideZ);
        freeCraftPosRef.current.set(sideX, sideY, sideZ);
        kinematicsRef.current = createKinematicsState(sideX, sideY, sideZ, now);
        roverSpeedRef.current = 0;
      }
    };

    // 4. Four Large, Distinct Rotating 3D Planet Gateways in a Wide Semicircle Front-Center
    const unlockedSet = new Set<CampaignLevelId>(campaign.unlockedLevels);
    const ringGeo = new THREE.TorusGeometry(3.25, 0.14, 10, 32);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.52,
      roughness: 0.25
    });
    const ringInst = new THREE.InstancedMesh(ringGeo, ringMat, GATEWAY_NODES.length);
    scene.add(ringInst);
    const ringDummy = new THREE.Object3D();

    const gatewayPedestalParts: ColoredGeometryPart[] = [];
    const nodeGroups: {
      cfg: GatewayNodeConfig;
      root: THREE.Group;
      holo: THREE.Group;
      halo: THREE.Object3D;
      posY: number;
    }[] = [];

    GATEWAY_NODES.forEach((cfg, idx) => {
      const unlocked = unlockedSet.has(cfg.levelId);
      const completed = checkLevelCompleted(campaign, cfg.levelId);
      const isActive = activeTargetLevelId === cfg.levelId;
      const gy = evalCommandDeckFloorY(cfg.x, cfg.z);

      const root = new THREE.Group();
      root.position.set(cfg.x, gy, cfg.z);
      scene.add(root);

      gatewayPedestalParts.push(
        {
          geometry: new THREE.CylinderGeometry(3.3, 3.8, 0.42, 12),
          color: completed ? 0x065f46 : unlocked ? 0x1e3a8a : 0x334155,
          position: [cfg.x, gy + 0.05, cfg.z]
        },
        {
          geometry: new THREE.CylinderGeometry(2.8, 3.1, 0.24, 12),
          color: 0x0f172a,
          position: [cfg.x, gy + 0.34, cfg.z]
        }
      );
      hubObstacles.push({ x: cfg.x, z: cfg.z, radius: 2.95 });

      ringInst.setColorAt(
        idx,
        new THREE.Color(completed ? 0x34d399 : unlocked ? cfg.accentColor : 0x64748b)
      );

      // Distinct Rotating 3D Planet / Orbital Station Hologram mounted squarely on the gateway plinth
      const holo = createGatewayHologram(cfg.levelId, disposableTextures);
      holo.position.set(0, 2.55, 0);
      if (!unlocked) holo.scale.setScalar(0.86);
      root.add(holo);

      const rawTitle = tr(language, cfg.enLabel, cfg.arLabel);
      const labelText = completed ? `✅ ${rawTitle}` : isActive ? `🎯 ${rawTitle}` : unlocked ? rawTitle : `🔒 ${rawTitle}`;
      const { sprite, texture } = createNodeLabelSprite(labelText, isActive ? '#facc15' : cfg.accentHex, !unlocked, completed);
      sprite.position.set(0, 5.2, 0);
      if (!unlocked) {
        sprite.material.opacity = 0.55;
        sprite.scale.set(5.2, 1.3, 1);
      } else if (isActive) {
        sprite.scale.set(6.8, 1.7, 1);
      } else {
        sprite.scale.set(6.0, 1.5, 1);
      }
      root.add(sprite);
      disposableTextures.push(texture);

      const halo = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.58, 0),
        new THREE.MeshStandardMaterial({
          color: 0xfacc15,
          emissive: 0xf59e0b,
          emissiveIntensity: 1.25,
          roughness: 0.18
        })
      );
      halo.position.set(0, 6.45, 0);
      halo.visible = isActive;
      root.add(halo);

      if (isActive) {
        const skyBeacon = new THREE.Mesh(
          new THREE.CylinderGeometry(0.16, 0.85, 14, 12, 1, true),
          new THREE.MeshBasicMaterial({
            color: 0xfacc15,
            transparent: true,
            opacity: 0.22,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide
          })
        );
        skyBeacon.position.set(0, 7.2, 0);
        root.add(skyBeacon);
      }

      nodeGroups.push({ cfg, root, holo, halo, posY: gy });
    });
    if (ringInst.instanceColor) ringInst.instanceColor.needsUpdate = true;

    const gatewayPedestalMesh = new THREE.Mesh(
      mergeColoredParts(gatewayPedestalParts),
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.38, metalness: 0.45 })
    );
    gatewayPedestalMesh.castShadow = true;
    gatewayPedestalMesh.receiveShadow = true;
    scene.add(gatewayPedestalMesh);

    // 5. Side Space Museum / Fact Board Discovery Terminal on West Wing
    const museumPos = new THREE.Vector3(-9.5, 0, 6.5);
    const museumGroup = new THREE.Group();
    museumGroup.position.copy(museumPos);
    scene.add(museumGroup);

    const mFallback = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 2.2, 0.9),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.35, metalness: 0.4 })
    );
    mFallback.position.set(0, 1.1, 0);
    museumGroup.add(mFallback);

    attachEarthBuildingGlb({
      modelName: 'earth_discovery_kiosk',
      targetParent: museumGroup,
      scale: 1.08,
      position: [0, 0, 0],
      rotationY: Math.PI * 0.28,
      fallbackNodes: [mFallback],
      isDisposed: () => isDisposed,
      onLoaded: (g) => {
        glbLoadedRefs.push(g);
      }
    });

    const museumSign = createNodeLabelSprite(
      tr(language, '🏛️ Space Museum +15⭐', '🏛️ متحف الفضاء +15⭐'),
      '#facc15',
      false,
      false
    );
    museumSign.sprite.position.set(0, 4.2, 0);
    museumSign.sprite.scale.set(5.2, 1.3, 1);
    museumGroup.add(museumSign.sprite);
    disposableTextures.push(museumSign.texture);
    hubObstacles.push({ x: museumPos.x, z: museumPos.z, radius: 1.55 });

    // 6. Player's Articulated SPACE-FIT X Astronaut (astronaut_hero.glb)
    const playerCraftRoot = new THREE.Group();
    scene.add(playerCraftRoot);
    const hero = buildSpaceFitXCharacter({
      showEvaHelmet: true,
      showCompanion: true,
      scale: 0.85
    });
    hero.group.traverse((node) => {
      if (node instanceof THREE.Mesh) node.castShadow = true;
    });
    playerCraftRoot.add(hero.group);

    // Lightweight Jetpack & Dust Particle Systems
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
    const dustSystem = createDustPuffSystem(scene, 18);

    const floorArrow = createFloorGuideArrowSystem(scene);
    const activeTargetNode = GATEWAY_NODES.find((n) => n.levelId === activeTargetLevelId) || GATEWAY_NODES[0];
    const activeGatewayVec = new THREE.Vector3(activeTargetNode.x, evalCommandDeckFloorY(activeTargetNode.x, activeTargetNode.z), activeTargetNode.z);

    // Keyboard & Pointer Controls
    const keysDown = new Set<string>();
    const onKeyDown = (e: KeyboardEvent) => {
      lastActivityRef.current = performance.now();
      const k = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) {
        if (document.activeElement?.tagName !== 'INPUT') e.preventDefault();
      }
      keysDown.add(k);
      if (k === 'f') toggleFreeFlight();
      if (k === 'r') roverToggleHandlerRef.current();
      if ((k === ' ' || e.code === 'Space') && !e.repeat) jumpHandlerRef.current();
      if (k === 'e' || k === 'enter') flyCraftToNode(focusedLevelRef.current, true, true);
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

      if (museumGroup) {
        const mHits = raycaster.intersectObject(museumGroup, true);
        if (mHits.length > 0) {
          openSpaceMuseumCard();
          return;
        }
      }

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
          flyCraftToNode(matched.cfg.levelId, true, true);
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

      const dampRate = 6.0 + (1.0 - displaySettingsRef.current.cameraSmoothness) * 18.0;
      const dampAlpha = 1 - Math.exp(-dampRate * dt);
      orbitYawRef.current = lerpAngle(orbitYawRef.current, targetOrbitYawRef.current, dampAlpha);
      orbitPitchRef.current += (targetOrbitPitchRef.current - orbitPitchRef.current) * dampAlpha;

      cosmicSky.update(elapsed);
      glbLoadedRefs.forEach((g, idx) => animateBlenderEnvironmentGlb(g, elapsed + idx * 0.85));

      nodeGroups.forEach(({ root, holo, halo, cfg, posY }, idx) => {
        ringDummy.position.set(cfg.x, posY + 0.35, cfg.z);
        ringDummy.rotation.set(Math.PI / 2, 0, elapsed * 0.28 * (idx % 2 === 0 ? 1 : -1));
        ringDummy.updateMatrix();
        ringInst.setMatrixAt(idx, ringDummy.matrix);
        root.position.y = posY;
        holo.rotation.y = elapsed * 0.65 + idx * 0.8;
        holo.position.y = 2.55 + Math.sin(elapsed * 2.1 + idx) * 0.16;
        if (halo.visible) {
          halo.rotation.y = elapsed * 2.2;
          halo.position.y = 6.45 + Math.sin(elapsed * 3.4) * 0.22;
        }
      });
      ringInst.instanceMatrix.needsUpdate = true;

      let inputX = joystickVecRef.current.x;
      let inputZ = joystickVecRef.current.y;
      if (keysDown.has('a') || keysDown.has('arrowleft')) inputX -= 1;
      if (keysDown.has('d') || keysDown.has('arrowright')) inputX += 1;
      if (keysDown.has('w') || keysDown.has('arrowup')) inputZ -= 1;
      if (keysDown.has('s') || keysDown.has('arrowdown')) inputZ += 1;
      const inLen = Math.hypot(inputX, inputZ);
      const inMag = Math.min(1, inLen);
      const k = kinematicsRef.current;

      const sinYaw = Math.sin(orbitYawRef.current);
      const cosYaw = Math.cos(orbitYawRef.current);
      const moveWorldX = inLen > 0.08 ? (inputX * cosYaw + inputZ * sinYaw) / inLen : 0;
      const moveWorldZ = inLen > 0.08 ? (-inputX * sinYaw + inputZ * cosYaw) / inLen : 0;

      if (inMag > 0.08) {
        lastActivityRef.current = now;
        autoNavTargetRef.current = null;
        pendingEnterLevelRef.current = null;
      }

      let currentSpeed = 0;
      let currentVelY = 0;
      let walkedLanding = false;
      let activeSteerAngle = 0;

      if (isDrivingRoverRef.current) {
        const rPos = roverPosRef.current;
        const boosting = isBoostingRef.current || now < roverBoostUntilRef.current;
        let steerAngle = 0;
        if (inMag > 0.08) {
          const maxSpd = (boosting ? 25.0 : 17.5) * inMag;
          const { speed } = stepSmoothHorizontalVelocity(
            roverVelRef.current,
            moveWorldX * maxSpd,
            moveWorldZ * maxSpd,
            dt,
            10,
            7
          );
          roverSpeedRef.current = speed;
          rPos.x += roverVelRef.current.x * dt;
          rPos.z += roverVelRef.current.z * dt;
          const targetYaw = Math.atan2(moveWorldX, moveWorldZ);
          const diff = Math.atan2(Math.sin(targetYaw - roverYawRef.current), Math.cos(targetYaw - roverYawRef.current));
          steerAngle = Math.max(-0.42, Math.min(0.42, diff * 0.65));
          roverYawRef.current = lerpAngle(roverYawRef.current, targetYaw, 1 - Math.exp(-8.5 * dt));
        } else if (autoNavTargetRef.current) {
          const dx = autoNavTargetRef.current.x - rPos.x;
          const dz = autoNavTargetRef.current.z - rPos.z;
          const dist = Math.hypot(dx, dz);
          if (dist > 2.4) {
            const wx = dx / dist;
            const wz = dz / dist;
            const { speed } = stepSmoothHorizontalVelocity(roverVelRef.current, wx * 21.0, wz * 21.0, dt, 10, 7);
            roverSpeedRef.current = speed;
            rPos.x += roverVelRef.current.x * dt;
            rPos.z += roverVelRef.current.z * dt;
            const targetYaw = Math.atan2(wx, wz);
            roverYawRef.current = lerpAngle(roverYawRef.current, targetYaw, 1 - Math.exp(-8.5 * dt));
          } else {
            autoNavTargetRef.current = null;
            roverVelRef.current = { x: 0, z: 0 };
            roverSpeedRef.current = 0;
            const queued = pendingEnterLevelRef.current;
            pendingEnterLevelRef.current = null;
            if (queued) {
              soundManager.playDropSuccess();
              onSelectLevelRef.current(queued);
            }
          }
        } else {
          const { speed } = stepSmoothHorizontalVelocity(roverVelRef.current, 0, 0, dt, 10, 7);
          roverSpeedRef.current = speed;
          rPos.x += roverVelRef.current.x * dt;
          rPos.z += roverVelRef.current.z * dt;
        }

        resolveCircleObstacles(rPos, roverVelRef.current, 1.35, hubObstacles);
        const clamped = clampCommandDeckPosition(rPos.x, rPos.z);
        rPos.x = clamped.x;
        rPos.z = clamped.z;
        rPos.y = evalCommandDeckFloorY(rPos.x, rPos.z);
        const normal = evalCommandDeckNormal(rPos.x, rPos.z);

        roverCtrl.group.position.copy(rPos);
        roverCtrl.group.rotation.y = roverYawRef.current;
        roverCtrl.updateVisuals({ dt, speed: roverSpeedRef.current, steerAngle, normal });
        activeSteerAngle = steerAngle;

        freeCraftPosRef.current.copy(rPos);
        k.x = rPos.x;
        k.y = rPos.y;
        k.z = rPos.z;
        k.vx = roverVelRef.current.x;
        k.vz = roverVelRef.current.z;
        k.vy = 0;
        k.grounded = true;
        k.lastGroundedMs = now;
        currentSpeed = roverSpeedRef.current;

        if (currentSpeed > 2.2) {
          roverDustTimerRef.current += dt;
          if (roverDustTimerRef.current >= 0.08) {
            roverDustTimerRef.current = 0;
            dustSystem.emit(
              rPos.x - Math.sin(roverYawRef.current) * 1.15,
              rPos.y + 0.14,
              rPos.z - Math.cos(roverYawRef.current) * 1.15,
              0x38bdf8,
              Math.max(1, Math.round(3 * qCfg.particleDensity)),
              1.6
            );
          }
        }
      } else if (isFlightModeRef.current) {
        if (inMag > 0.08) {
          const speed = (isBoostingRef.current ? 22.0 : 14.0) * inMag;
          currentSpeed = speed;
          const nextX = freeCraftPosRef.current.x + moveWorldX * speed * dt;
          const nextZ = freeCraftPosRef.current.z + moveWorldZ * speed * dt;
          const dist = Math.hypot(nextX, nextZ);
          if (dist > COMMAND_DECK_PLAY_RADIUS) {
            freeCraftPosRef.current.x = (nextX / dist) * COMMAND_DECK_PLAY_RADIUS;
            freeCraftPosRef.current.z = (nextZ / dist) * COMMAND_DECK_PLAY_RADIUS;
          } else {
            freeCraftPosRef.current.x = nextX;
            freeCraftPosRef.current.z = nextZ;
          }
          const yaw = Math.atan2(moveWorldX, moveWorldZ);
          freeCraftYawRef.current = lerpAngle(freeCraftYawRef.current, yaw, 1 - Math.exp(-10 * dt));
        }
        if (now < ascendUntilRef.current || isBoostingRef.current) {
          currentVelY = 8.0;
          freeCraftPosRef.current.y = Math.min(22.0, freeCraftPosRef.current.y + 8.0 * dt);
        } else {
          const minHoverY = evalCommandDeckFloorY(freeCraftPosRef.current.x, freeCraftPosRef.current.z) + 2.0;
          if (freeCraftPosRef.current.y > minHoverY) {
            currentVelY = -3.2;
            freeCraftPosRef.current.y = Math.max(minHoverY, freeCraftPosRef.current.y - 3.2 * dt);
          }
        }
        playerCraftRoot.position.copy(freeCraftPosRef.current);
        playerCraftRoot.rotation.set(inMag > 0.1 ? 0.28 : 0.08, freeCraftYawRef.current, inMag > 0.1 ? -inputX * 0.16 : 0);
      } else {
        let dirX = moveWorldX;
        let dirZ = moveWorldZ;
        let walkMag = inMag;
        let maxWalkSpd = isBoostingRef.current ? 12.2 : 8.2;

        if (inMag > 0.08) {
          const targetYaw = Math.atan2(moveWorldX, moveWorldZ);
          freeCraftYawRef.current = lerpAngle(freeCraftYawRef.current, targetYaw, 1 - Math.exp(-13 * dt));
        } else if (autoNavTargetRef.current) {
          const dx = autoNavTargetRef.current.x - k.x;
          const dz = autoNavTargetRef.current.z - k.z;
          const dist = Math.hypot(dx, dz);
          if (dist > 1.25) {
            dirX = dx / dist;
            dirZ = dz / dist;
            walkMag = 1;
            maxWalkSpd = 17.5;
            const targetYaw = Math.atan2(dirX, dirZ);
            freeCraftYawRef.current = lerpAngle(freeCraftYawRef.current, targetYaw, 1 - Math.exp(-13 * dt));
          } else {
            autoNavTargetRef.current = null;
            k.vx = 0;
            k.vz = 0;
            const queued = pendingEnterLevelRef.current;
            pendingEnterLevelRef.current = null;
            if (queued) {
              soundManager.playDropSuccess();
              onSelectLevelRef.current(queued);
            }
          }
        }

        const walkedRes = stepThirdPersonKinematics(k, {
          dt,
          nowMs: now,
          inputWorldDirX: dirX,
          inputWorldDirZ: dirZ,
          inputMagnitude: walkMag,
          maxSpeed: maxWalkSpd,
          gravity: 21.0,
          jumpVel: 8.4,
          evalFloorY: evalCommandDeckFloorY,
          clampXZ: (x, z) => clampCommandDeckPosition(x, z),
          obstacles: hubObstacles,
          playerRadius: 0.55
        });

        if (walkedRes.jumped) soundManager.playClick();
        freeCraftPosRef.current.set(k.x, k.y, k.z);
        currentSpeed = walkedRes.speed;
        currentVelY = k.vy;
        walkedLanding = walkedRes.isLanding;

        playerCraftRoot.position.copy(freeCraftPosRef.current);
        playerCraftRoot.rotation.set(0, freeCraftYawRef.current, 0);

        roverCtrl.updateVisuals({
          dt,
          speed: 0,
          steerAngle: 0,
          normal: evalCommandDeckNormal(roverPosRef.current.x, roverPosRef.current.z)
        });
      }
      dustSystem.update(dt);

      // Proximity check for South Terrace Space Museum Kiosk
      if (museumGroup && !isFlightModeRef.current) {
        const md = Math.hypot(freeCraftPosRef.current.x - museumPos.x, freeCraftPosRef.current.z - museumPos.z);
        if (md < 4.2 && !suppressedMuseumRef.current) {
          setIsMuseumOpen(true);
          suppressedMuseumRef.current = true;
          const res = markFactDiscovered(HUB_MUSEUM_FACTS[0].id);
          if (res.newlyDiscovered) soundManager.playDropSuccess();
        } else if (md > 8.5) {
          suppressedMuseumRef.current = false;
        }
      }

      // Focus nearest Gateway Node
      let bestLid = focusedLevelRef.current;
      let bestDist = Infinity;
      for (const n of GATEWAY_NODES) {
        const entry = getGatewayEntrySpot(n);
        const d = Math.hypot(freeCraftPosRef.current.x - entry.x, freeCraftPosRef.current.z - entry.z);
        if (d < bestDist) {
          bestDist = d;
          bestLid = n.levelId;
        }
      }
      if (bestDist < 10.5 && bestLid !== focusedLevelRef.current) {
        setFocusedLevel(bestLid);
      }

      const idleSec = (now - lastActivityRef.current) / 1000;
      if (idleSec > 8.5) setShowIdleHint(true);

      const isZeroGAnim = isFlightModeRef.current;
      const airborneWalk = !isZeroGAnim && !isDrivingRoverRef.current && !k.grounded;
      const jetActive = isZeroGAnim || (!isDrivingRoverRef.current && isBoostingRef.current && inMag > 0.08);
      const themeHex =
        suitStateRef.current?.suitTheme === 'mars_crimson'
          ? 0xf43f5e
          : suitStateRef.current?.suitTheme === 'gold_emerald'
          ? 0x10b981
          : 0x22d3ee;

      const activeSuit = suitStateRef.current || initialSpaceFitXState;
      const walkSpeedNorm = currentSpeed > 0.12 ? Math.min(1.0, currentSpeed / 12.0 + 0.22) : 0;

      if (isDrivingRoverRef.current) {
        roverCtrl.getSeatWorldTransform(playerCraftRoot.position, playerCraftRoot.quaternion);
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
          suitState: { ...activeSuit, helmetEnabled: true },
          idleSeconds: 0,
          emote: 'none'
        });
      } else {
        hero.update({
          t: elapsed,
          moveSpeed: isZeroGAnim ? (inMag > 0.08 ? 1.0 : 0.15) : walkSpeedNorm,
          isRunning: (!isFlightModeRef.current && isBoostingRef.current && inMag > 0.08) || isZeroGAnim,
          isJumping: airborneWalk,
          isLanding: !isZeroGAnim && walkedLanding,
          isZeroG: isZeroGAnim,
          isSeated: false,
          suitState: {
            ...activeSuit,
            helmetEnabled: true,
            backpackStyle: jetActive ? 'thruster' : activeSuit.backpackStyle || 'eclss'
          },
          idleSeconds: idleSec,
          emote: 'none'
        });
      }

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
        freeCraftPosRef.current,
        activeGatewayVec,
        evalCommandDeckFloorY(freeCraftPosRef.current.x, freeCraftPosRef.current.z) + 0.14,
        elapsed
      );

      if (currentSpeed > 0.25 && !activeLookRef.current && now - lastManualLookMsRef.current > 2200) {
        const refYaw = isDrivingRoverRef.current ? roverYawRef.current : freeCraftYawRef.current;
        targetOrbitYawRef.current = lerpAngle(
          targetOrbitYawRef.current,
          refYaw + Math.PI,
          1 - Math.exp(-3.0 * dt)
        );
      }

      const camTarget = isDrivingRoverRef.current ? roverPosRef.current : playerCraftRoot.position;
      const camDist = isFlightModeRef.current ? 7.4 : isDrivingRoverRef.current ? 6.8 : 5.4;
      const horizDist = camDist * Math.cos(orbitPitchRef.current);
      const camHeight = 1.35 + camDist * Math.sin(orbitPitchRef.current);
      const desiredX = camTarget.x + Math.sin(orbitYawRef.current) * horizDist;
      const desiredZ = camTarget.z + Math.cos(orbitYawRef.current) * horizDist;
      const minCamY = evalCommandDeckFloorY(desiredX, desiredZ) + 0.9;
      const desiredY = Math.max(camTarget.y + camHeight, minCamY);

      camera.position.x = dampValue(camera.position.x, desiredX, 12, dt);
      camera.position.y = dampValue(camera.position.y, desiredY, 12, dt);
      camera.position.z = dampValue(camera.position.z, desiredZ, 12, dt);
      const lookFwdX = -Math.sin(orbitYawRef.current) * 1.15;
      const lookFwdZ = -Math.cos(orbitYawRef.current) * 1.15;
      const targetLookY = Math.max(camTarget.y + 1.45, minCamY - 0.25);
      camera.lookAt(camTarget.x + lookFwdX, targetLookY, camTarget.z + lookFwdZ);

      renderer.render(scene, camera);
      mount.dataset.hubTheme = 'orbital_command_deck';
      mount.dataset.drawCalls = String(renderer.info.render.calls);
      mount.dataset.glbLoaded = getLoadedGlbUrls().join(',');
      mount.dataset.roverActive = isDrivingRoverRef.current ? 'true' : 'false';
      mount.dataset.cameraYaw = orbitYawRef.current.toFixed(3);
      mount.dataset.cameraPitch = orbitPitchRef.current.toFixed(3);
      mount.dataset.playerY = camTarget.y.toFixed(3);
      mount.dataset.playerVelY = currentVelY.toFixed(3);
      mount.dataset.playerSpeed = currentSpeed.toFixed(3);
      mount.dataset.playerGrounded = k.grounded && !isFlightModeRef.current ? 'true' : 'false';
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
      cosmicSky.dispose();
      roverCtrl.dispose();
      dustSystem.dispose();
      floorArrow.dispose();
      hero.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      thrusterGeo.dispose();
      thrusterMat.dispose();
      disposableTextures.forEach((t) => t.dispose());
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.InstancedMesh) {
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
  }, [language, activeTargetLevelId, campaign.unlockedLevels.length]);

  const focusedNode = GATEWAY_NODES.find((n) => n.levelId === focusedLevel) || GATEWAY_NODES[0];
  const focusedMeta = LEVEL_TITLES_BILINGUAL[focusedLevel];
  const focusedUnlocked = campaign.unlockedLevels.includes(focusedLevel);
  const nextMeta = LEVEL_TITLES_BILINGUAL[activeTargetLevelId];
  const currentMuseumFact = HUB_MUSEUM_FACTS[museumIndex % HUB_MUSEUM_FACTS.length];

  if (webglFailed) {
    return (
      <div
        data-testid="world-navigator-3d"
        className="w-full h-full flex items-center justify-center bg-sky-950 p-6"
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
      <div
        ref={mountRef}
        data-testid="three-canvas-mount"
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* Always-Visible Bottom-Center 4-Planet Quick Pill Bar (Mobile + Desktop) */}
      <div
        data-testid="hub-planet-pills"
        dir={language === 'ar' ? 'rtl' : 'ltr'}
        className="pointer-events-none fixed bottom-2.5 inset-x-0 z-20 flex justify-center pl-24 pr-44 sm:pl-28 sm:pr-52 lg:px-3"
      >
        <div className="pointer-events-auto inline-flex items-center justify-center gap-1 px-1.5 py-0.5 rounded-full bg-slate-950/82 border border-cyan-400/55 backdrop-blur-md shadow-xl max-w-full overflow-x-auto">
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
                onClick={() => flyCraftToNode(lid, true, true)}
                className={`px-2 py-0.5 rounded-full border text-[10px] sm:text-[11px] font-hud font-black flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  !unlocked
                    ? 'bg-slate-900/55 border-white/15 text-slate-400 opacity-65'
                    : isFocused
                    ? 'bg-amber-400 text-slate-950 border-white shadow-md'
                    : 'bg-slate-900/80 border-white/25 text-white hover:bg-slate-800/90'
                }`}
              >
                <span>{meta.badge}</span>
                <span>{tr(language, meta.shortEn, meta.shortAr)}</span>
                {completed && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                {!unlocked && <Lock className="w-2.5 h-2.5 text-slate-400" />}
              </button>
            );
          })}
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

      {/* Side Space Museum Fact Board Discovery Modal (Compact Zero-Scroll) */}
      {isMuseumOpen && currentMuseumFact && (
        <div
          data-testid="hub-museum-modal"
          dir={language === 'ar' ? 'rtl' : 'ltr'}
          className="fixed top-12 right-2.5 sm:right-4 z-30 w-[calc(100vw-20px)] max-w-xs sm:max-w-sm rounded-2xl bg-slate-950/94 border-2 border-amber-400/80 p-3 shadow-2xl backdrop-blur-md text-white"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-2xl shrink-0">{currentMuseumFact.badgeIcon}</span>
              <div className="min-w-0">
                <div className="font-hud font-black text-xs sm:text-sm text-amber-300 truncate">
                  {tr(language, currentMuseumFact.titleEn, currentMuseumFact.titleAr)}
                </div>
                <div className="text-[10px] font-bold text-cyan-300">
                  🏛️ {tr(language, 'Academy Space Museum', 'متحف أكاديمية الفضاء')} • {museumIndex + 1}/{HUB_MUSEUM_FACTS.length}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsMuseumOpen(false)}
              className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center cursor-pointer shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="mt-1.5 text-[11px] sm:text-xs leading-snug text-slate-100">
            {tr(language, currentMuseumFact.summaryEn, currentMuseumFact.summaryAr)}
          </p>
          <div className="mt-2 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                const prevIdx = (museumIndex - 1 + HUB_MUSEUM_FACTS.length) % HUB_MUSEUM_FACTS.length;
                setMuseumIndex(prevIdx);
                openSpaceMuseumCard(prevIdx);
              }}
              className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>{tr(language, 'Prev', 'السابق')}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                const nextIdx = (museumIndex + 1) % HUB_MUSEUM_FACTS.length;
                setMuseumIndex(nextIdx);
                openSpaceMuseumCard(nextIdx);
              }}
              className="px-2.5 py-1 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-[11px] font-black flex items-center gap-1 cursor-pointer"
            >
              <span>{tr(language, 'Next Fact', 'المعلومة التالية')}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
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
                'Explore the Spaceport Plaza or Drive the Buggy to a Gateway! 🚙',
                'استكشف ساحة الأكاديمية أو قد المركبة نحو البوابة الكوكبية! 🚙'
              )}
            </span>
          </div>
        </div>
      )}

      {/* Bottom Arcade Controls + Direct Gateway Entry + Auto-Go + Buggy Toggle */}
      <ThirdPersonControlsOverlay
        promptLabelAr={
          focusedUnlocked
            ? tr(
                language,
                `Enter ${focusedMeta.shortEn}`,
                `دخول ${focusedMeta.shortAr}`
              )
            : tr(language, `Gateway ${focusedLevel} Locked`, `البوابة ${focusedLevel} مقفلة`)
        }
        promptSubAr={focusedUnlocked ? tr(language, focusedMeta.titleEn, focusedMeta.titleAr) : undefined}
        onInteract={() => flyCraftToNode(focusedLevel, true, true)}
        onAutoWalkNext={() => flyCraftToNode(activeTargetLevelId, true, false)}
        autoWalkLabel={tr(
          language,
          `Go to Active Portal: ${nextMeta.shortEn}`,
          `اذهب للبوابة النشطة: ${nextMeta.shortAr}`
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
        jumpMode={isDrivingRover || isFlightMode ? 'boost' : 'jump'}
        highlightInteract={focusedUnlocked}
        secondaryAction={{
          icon: isDrivingRover ? '🚶' : '🚙',
          label: isDrivingRover
            ? tr(language, 'Exit Buggy (R)', 'نزول من المركبة (R)')
            : tr(language, 'Drive Buggy (R)', 'قيادة المركبة (R)'),
          active: isDrivingRover,
          testId: 'toggle-rover-btn',
          onClick: () => roverToggleHandlerRef.current()
        }}
        onSprintChange={(s) => {
          lastActivityRef.current = performance.now();
          isBoostingRef.current = s;
        }}
        gravityLabelAr={
          isDrivingRover
            ? tr(language, 'Academy Space Buggy', 'مركبة الأكاديمية')
            : isFlightMode
            ? tr(language, 'Academy Jetpack Flight', 'طيران نفاث')
            : tr(language, focusedNode.telemetryEn, focusedNode.telemetryAr)
        }
        hintAr={tr(
          language,
          'WASD Walk • Space Jump • R Buggy • F Fly • E Enter Gateway',
          'WASD للمشي • Space للقفز • R للمركبة • F للطيران • E لدخول البوابة'
        )}
      />
    </div>
  );
};
