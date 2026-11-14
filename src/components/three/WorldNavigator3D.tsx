import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { CampaignLevelId, CampaignProgressState, SpaceFitXState } from '../../types/game';
import { CAMPAIGN_LEVELS } from '../../data/campaignLevels';
import { soundManager } from '../../utils/sound';
import { CheckCircle2, Lock, Rocket } from 'lucide-react';
import { buildSpaceFitXCharacter } from './buildSpaceFitXCharacter';
import {
  createCosmicSkyBackdrop,
  createFloatingIslandMesh,
  createFloatingLabelSprite
} from './archipelagoPrimitives';
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
    radius: 5.5,
    topColor: 0x15803d,
    rimColor: 0x38bdf8,
    rockColor: 0x78350f,
    crystalColor: 0x22d3ee,
    accentHex: '#38bdf8'
  },
  {
    levelId: 2,
    center: new THREE.Vector3(-6.5, 0.85, -2.2),
    radius: 5.3,
    topColor: 0x1e293b,
    rimColor: 0x818cf8,
    rockColor: 0x334155,
    crystalColor: 0x60a5fa,
    accentHex: '#818cf8'
  },
  {
    levelId: 3,
    center: new THREE.Vector3(6.5, 0.55, 2.0),
    radius: 5.5,
    topColor: 0x64748b,
    rimColor: 0xf59e0b,
    rockColor: 0x334155,
    crystalColor: 0xfbbf24,
    accentHex: '#f59e0b',
    accentCraters: true
  },
  {
    levelId: 4,
    center: new THREE.Vector3(19.5, -0.15, -1.4),
    radius: 5.3,
    topColor: 0x0369a1,
    rimColor: 0x34d399,
    rockColor: 0x0f766e,
    crystalColor: 0x10b981,
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

function addIslandLandmarkDecor(group: THREE.Group, levelId: CampaignLevelId): THREE.Object3D[] {
  const animated: THREE.Object3D[] = [];

  if (levelId === 1) {
    // Launch Pad Rocket + Pine Trees
    const pad = new THREE.Mesh(
      new THREE.CylinderGeometry(1.4, 1.6, 0.2, 8),
      new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.4 })
    );
    pad.position.set(1.8, 0.1, -1.6);
    group.add(pad);

    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.52, 2.2, 16),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.35 })
    );
    body.position.set(1.8, 1.3, -1.6);
    const nose = new THREE.Mesh(
      new THREE.ConeGeometry(0.42, 0.9, 16),
      new THREE.MeshStandardMaterial({ color: 0xf97316 })
    );
    nose.position.set(1.8, 2.85, -1.6);
    group.add(body, nose);

    // Mini Stylized Trees
    [
      [-2.3, -1.9],
      [-2.8, 1.2],
      [2.4, 1.8]
    ].forEach(([tx, tz]) => {
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.14, 0.65, 8),
        new THREE.MeshStandardMaterial({ color: 0x78350f })
      );
      trunk.position.set(tx, 0.32, tz);
      const foliage = new THREE.Mesh(
        new THREE.ConeGeometry(0.55, 1.25, 10),
        new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.7 })
      );
      foliage.position.set(tx, 1.1, tz);
      group.add(trunk, foliage);
    });
  } else if (levelId === 2) {
    // Solar Array Wing + Orbiting NASA 2010 PK Asteroid
    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.2, 2.1, 10),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.6 })
    );
    mast.position.set(-2.1, 1.05, -1.8);
    const solar = new THREE.Mesh(
      new THREE.BoxGeometry(2.8, 0.08, 1.2),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, emissive: 0x0369a1, emissiveIntensity: 0.45 })
    );
    solar.position.set(-2.1, 2.1, -1.8);
    solar.rotation.x = 0.35;
    group.add(mast, solar);

    const asteroid = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.75, 0),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, flatShading: true, roughness: 0.9 })
    );
    asteroid.position.set(2.5, 2.35, -1.2);
    group.add(asteroid);
    animated.push(asteroid);
  } else if (levelId === 3) {
    // Lunar Habitat Domes + Water Tank Towers
    [-2.0, 2.0].forEach((dx, idx) => {
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(0.95, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5),
        new THREE.MeshStandardMaterial({
          color: idx === 0 ? 0xe2e8f0 : 0x4ade80,
          emissive: idx === 0 ? 0x000000 : 0x16a34a,
          emissiveIntensity: idx === 0 ? 0 : 0.35,
          metalness: 0.35,
          roughness: 0.3
        })
      );
      dome.position.set(dx, 0.02, -1.8);
      group.add(dome);
    });
    const dish = new THREE.Mesh(
      new THREE.ConeGeometry(0.55, 0.38, 14),
      new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.5 })
    );
    dish.position.set(2.2, 1.3, 1.9);
    dish.rotation.z = -0.6;
    group.add(dish);
  } else {
    // Earth Ocean Recovery Buoy + Golden Victory Crest
    const buoy = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.65, 1.1, 12),
      new THREE.MeshStandardMaterial({ color: 0xf97316, emissive: 0xea580c, emissiveIntensity: 0.35 })
    );
    buoy.position.set(-2.1, 0.55, -1.6);
    const crest = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.75, 0),
      new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xd97706, emissiveIntensity: 0.65, metalness: 0.7 })
    );
    crest.position.set(2.1, 1.75, -1.4);
    group.add(buoy, crest);
    animated.push(crest);
  }

  return animated;
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

  const playerPosRef = useRef(new THREE.Vector3(initialCenter.x, initialCenter.y, initialCenter.z + 2.2));
  const playerVelYRef = useRef(0);
  const isGroundedRef = useRef(true);
  const walkTargetRef = useRef<THREE.Vector3 | null>(null);
  const joystickVecRef = useRef({ x: 0, z: 0 });
  const isSprintingRef = useRef(false);
  const cameraOrbitYawRef = useRef(0.18);
  const cameraOrbitPitchRef = useRef(0.44);

  const suitStateRef = useRef(suitState);
  suitStateRef.current = suitState;

  const onSelectLevelRef = useRef(onSelectLevel);
  onSelectLevelRef.current = onSelectLevel;

  const unlockedSet = new Set(campaign.unlockedLevels);
  const unlockedSetRef = useRef(unlockedSet);
  unlockedSetRef.current = unlockedSet;

  const triggerJump = () => {
    if (isGroundedRef.current) {
      playerVelYRef.current = 8.4;
      isGroundedRef.current = false;
      soundManager.playClick();
    }
  };

  const handleEnterFocusedIsland = () => {
    const lid = focusedLevelRef.current;
    if (unlockedSetRef.current.has(lid)) {
      soundManager.playClick();
      onSelectLevelRef.current(lid);
    } else {
      soundManager.playCautionBeep();
    }
  };

  const focusOrOpenLevelPill = (lid: CampaignLevelId) => {
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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(dims.w, dims.h);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.innerHTML = '';
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(48, dims.w / dims.h, 0.1, 180);
    camera.position.set(playerPosRef.current.x, playerPosRef.current.y + 6.5, playerPosRef.current.z + 11.5);

    const skyHandle = createCosmicSkyBackdrop(scene);

    // Rich Cosmic Studio Lighting
    const hemi = new THREE.HemisphereLight(0xe0f2fe, 0x0f172a, 1.35);
    scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xffffff, 1.75);
    dir.position.set(16, 28, 18);
    scene.add(dir);
    const rim = new THREE.DirectionalLight(0x38bdf8, 0.85);
    rim.position.set(-18, 10, -16);
    scene.add(rim);

    // Build 4 Floating Islands + Glowing Portals + In-World Labels
    const disposableTextures: THREE.Texture[] = [];
    const portalMeshes: THREE.Mesh[] = [];
    const clickTargets: { mesh: THREE.Object3D; levelId: CampaignLevelId }[] = [];
    const floatingProps: { obj: THREE.Object3D; baseY: number; phase: number }[] = [];

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
      islandGroup.position.copy(cfg.center);
      scene.add(islandGroup);

      // Add landmark buildings / trees / asteroids on island
      const props = addIslandLandmarkDecor(islandGroup, cfg.levelId);
      props.forEach((obj, pIdx) => {
        floatingProps.push({ obj, baseY: obj.position.y, phase: idx * 1.4 + pIdx });
      });

      // Central Gateway Portal Ring at rear-center of island
      const portalMat = new THREE.MeshStandardMaterial({
        color: completed ? 0x10b981 : unlocked ? cfg.rimColor : 0x64748b,
        emissive: completed ? 0x059669 : unlocked ? cfg.rimColor : 0x1e293b,
        emissiveIntensity: unlocked ? 0.85 : 0.15,
        roughness: 0.25
      });
      const portalRing = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.15, 14, 34, Math.PI * 1.2), portalMat);
      portalRing.position.set(0, 1.2, -0.4);
      islandGroup.add(portalRing);
      portalMeshes.push(portalRing);

      const portalCurtain = new THREE.Mesh(
        new THREE.CircleGeometry(1.05, 24),
        new THREE.MeshBasicMaterial({
          color: unlocked ? cfg.rimColor : 0x334155,
          transparent: true,
          opacity: unlocked ? 0.28 : 0.12,
          side: THREE.DoubleSide
        })
      );
      portalCurtain.position.set(0, 1.2, -0.4);
      islandGroup.add(portalCurtain);

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

    // Glowing Sky-Bridges Connecting Islands 1<->2<->3<->4 Seamlessly
    for (let i = 0; i < ISLAND_CONFIGS.length - 1; i++) {
      const a = ISLAND_CONFIGS[i];
      const b = ISLAND_CONFIGS[i + 1];
      const start = new THREE.Vector3(a.center.x, a.center.y, a.center.z);
      const end = new THREE.Vector3(b.center.x, b.center.y, b.center.z);
      const mid = start.clone().add(end).multiplyScalar(0.5);
      const totalDist = start.distanceTo(end);

      const bridgeLen = Math.max(4, totalDist - 3.8);
      const bridgeMesh = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, 0.22, bridgeLen),
        new THREE.MeshStandardMaterial({
          color: 0x0ea5e9,
          emissive: 0x0284c7,
          emissiveIntensity: 0.45,
          transparent: true,
          opacity: 0.78,
          roughness: 0.2
        })
      );
      bridgeMesh.position.copy(mid);
      bridgeMesh.position.y -= 0.1;
      bridgeMesh.lookAt(end.x, end.y - 0.1, end.z);
      scene.add(bridgeMesh);

      // Glowing bridge side rails along Z length
      [-1.02, 1.02].forEach((rx) => {
        const rail = new THREE.Mesh(
          new THREE.BoxGeometry(0.08, 0.08, bridgeLen),
          new THREE.MeshBasicMaterial({ color: 0x7dd3fc })
        );
        rail.position.set(rx, 0.16, 0);
        bridgeMesh.add(rail);
      });
    }

    // Third-Person Articulated Robo Astronaut in SPACE-FIT X IVA Suit
    const hero = buildSpaceFitXCharacter();
    hero.group.scale.setScalar(1.05);
    hero.group.position.copy(playerPosRef.current);
    scene.add(hero.group);

    // Keyboard & Orbit Pointer Input
    const keysDown = new Set<string>();
    const onKeyDown = (e: KeyboardEvent) => {
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
    let lastTime = performance.now();
    const startTime = lastTime;

    const animate = (now: number) => {
      rafId = requestAnimationFrame(animate);
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      const elapsed = (now - startTime) / 1000;

      skyHandle.update(elapsed);

      // Gentle cosmic bob on floating props & portal pulse
      floatingProps.forEach((fp) => {
        fp.obj.position.y = fp.baseY + Math.sin(elapsed * 1.4 + fp.phase) * 0.14;
        fp.obj.rotation.y = elapsed * 0.45 + fp.phase;
      });
      portalMeshes.forEach((p, idx) => {
        p.rotation.z = Math.sin(elapsed * 1.2 + idx) * 0.08;
      });

      // Compute Horizontal Movement Relative to Camera Yaw
      let ix = joystickVecRef.current.x;
      let iz = joystickVecRef.current.z;
      if (keysDown.has('a') || keysDown.has('arrowleft')) ix -= 1;
      if (keysDown.has('d') || keysDown.has('arrowright')) ix += 1;
      if (keysDown.has('w') || keysDown.has('arrowup')) iz -= 1;
      if (keysDown.has('s') || keysDown.has('arrowdown')) iz += 1;

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

      hero.group.position.copy(pos);
      hero.update({
        t: elapsed,
        moveSpeed,
        isRunning: sprint && moveSpeed > 0.1,
        isJumping: !isGroundedRef.current,
        suitState: suitStateRef.current
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
    };

    rafId = requestAnimationFrame(animate);

    return () => {
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
        if (obj instanceof THREE.Mesh) {
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
  const focusedMeta = LEVEL_UI_META[focusedLevel];
  const focusedUnlocked = unlockedSet.has(focusedLevel);

  return (
    <div data-testid="world-navigator-3d" className="relative w-full h-full overflow-hidden select-none">
      {/* Full-Viewport 3D WebGL Canvas */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Top-Center Compact Edge Pill Selector (Non-Overlapping, keeps data-testid="level-node-*") */}
      <div
        dir="rtl"
        className="pointer-events-none fixed top-20 inset-x-0 z-20 flex justify-center px-3"
      >
        <div className="pointer-events-auto inline-flex flex-wrap items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-2xl bg-slate-950/75 border border-cyan-500/35 backdrop-blur-md shadow-xl max-w-full">
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
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  !unlocked
                    ? 'bg-slate-900/70 border-slate-700 text-slate-500 opacity-65'
                    : isFocused
                      ? 'bg-gradient-to-r from-cyan-500/40 to-sky-500/35 border-cyan-300 text-white shadow-[0_0_12px_rgba(34,211,238,0.35)]'
                      : 'bg-slate-900/80 border-slate-700 text-slate-200 hover:border-cyan-400/60'
                }`}
              >
                <span>{meta.badge}</span>
                <span className="hidden sm:inline">{meta.shortTitleAr}</span>
                <span className="sm:hidden">م{lid}</span>
                {completed ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : !unlocked ? (
                  <Lock className="w-3 h-3 text-slate-500" />
                ) : (
                  <Rocket className="w-3 h-3 text-cyan-300" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Edge Third-Person Controls (Joystick + Single Enter Prompt + Sprint/Jump) */}
      <ThirdPersonControlsOverlay
        promptLabelAr={
          focusedUnlocked
            ? `ادخل جزيرة المستوى ${focusedLevel}: ${focusedSpec.titleAr}`
            : `الجزيرة ${focusedLevel} مقفلة (${focusedMeta.shortTitleAr})`
        }
        promptSubAr={focusedUnlocked ? focusedSpec.subtitleAr : 'أكمل الجزيرة السابقة لفتح الجسر الجوي'}
        onInteract={handleEnterFocusedIsland}
        onJoystickMove={(vec) => {
          joystickVecRef.current = vec;
        }}
        onJump={triggerJump}
        onSprintChange={(s) => {
          isSprintingRef.current = s;
        }}
        gravityLabelAr="جاذبية الأرخبيل 1G"
        hintAr="WASD / الأسهم للمشي • Space للقفز • اسحب الشاشة لتدوير الكاميرا • E لدخول الجزيرة"
      />
    </div>
  );
};
