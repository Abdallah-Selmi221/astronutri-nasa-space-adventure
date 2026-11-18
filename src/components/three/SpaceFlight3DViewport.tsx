import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  attachBlenderPlanetsFromPack,
  attachBlenderSpaceship,
  getLoadedGlbUrls
} from './blenderModelLoader';
import { createCosmicSkyBackdrop, SkyMode } from './archipelagoPrimitives';
import {
  createDustPuffSystem,
  lerpAngle,
  stepSmoothHorizontalVelocity
} from './thirdPersonPhysics';
import { ThirdPersonControlsOverlay } from './ThirdPersonControlsOverlay';
import { useGameState } from '../../context/GameContext';
import { tr } from '../../utils/i18n';
import { soundManager } from '../../utils/sound';

export interface SpaceFlight3DViewportProps {
  activePlanetId: string;
  onSelectPlanetId: (planetId: string) => void;
}

interface FlightPlanetNode {
  id: string;
  nameEn: string;
  nameAr: string;
  gravityLabelEn: string;
  gravityLabelAr: string;
  pos: THREE.Vector3;
  sky: SkyMode;
  hemiSky: number;
  hemiGround: number;
  dirColor: number;
  ringRadius: number;
}

const FLIGHT_PLANETS: FlightPlanetNode[] = [
  {
    id: 'earth',
    nameEn: 'Earth',
    nameAr: 'الأرض',
    gravityLabelEn: '1.0G 🌍 Earth Gravity',
    gravityLabelAr: '1.0G 🌍 جاذبية الأرض',
    pos: new THREE.Vector3(-14, 0.5, 2),
    sky: 'sunny',
    hemiSky: 0xf0f9ff,
    hemiGround: 0x0f3275,
    dirColor: 0xfffbeb,
    ringRadius: 5.5
  },
  {
    id: 'moon',
    nameEn: 'Moon',
    nameAr: 'القمر',
    gravityLabelEn: '0.16G 🌙 Lunar Gravity',
    gravityLabelAr: '0.16G 🌙 جاذبية القمر',
    pos: new THREE.Vector3(-4, 2.2, -9),
    sky: 'lunar',
    hemiSky: 0xdbeafe,
    hemiGround: 0x1e293b,
    dirColor: 0xf8fafc,
    ringRadius: 4.5
  },
  {
    id: 'mars',
    nameEn: 'Mars',
    nameAr: 'المريخ',
    gravityLabelEn: '0.38G 🔴 Mars Gravity',
    gravityLabelAr: '0.38G 🔴 جاذبية المريخ',
    pos: new THREE.Vector3(7, 1.0, -4),
    sky: 'mars',
    hemiSky: 0xfed7aa,
    hemiGround: 0x7c2d12,
    dirColor: 0xffedd5,
    ringRadius: 5.2
  },
  {
    id: 'saturn',
    nameEn: 'Saturn',
    nameAr: 'زحل',
    gravityLabelEn: '1.06G 🪐 Saturn Rings',
    gravityLabelAr: '1.06G 🪐 حلقات زحل',
    pos: new THREE.Vector3(16, 2.5, 5),
    sky: 'nebula',
    hemiSky: 0xfef3c7,
    hemiGround: 0x3b2f1e,
    dirColor: 0xfef08a,
    ringRadius: 6.2
  }
];

export const SpaceFlight3DViewport: React.FC<SpaceFlight3DViewportProps> = ({
  activePlanetId,
  onSelectPlanetId
}) => {
  const { language } = useGameState();
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [nearestNode, setNearestNode] = useState<FlightPlanetNode>(FLIGHT_PLANETS[0]);
  const shipPosRef = useRef(new THREE.Vector3(-10, 1.6, 8));
  const shipVelYRef = useRef(0);
  const horizVelRef = useRef({ x: 0, z: 0 });
  const joystickVecRef = useRef({ x: 0, z: 0 });
  const isBoostingRef = useRef(false);
  const yawRef = useRef(0.2);

  const onSelectRef = useRef(onSelectPlanetId);
  onSelectRef.current = onSelectPlanetId;

  useEffect(() => {
    const target = FLIGHT_PLANETS.find((p) => p.id === activePlanetId);
    if (target) {
      shipPosRef.current.set(target.pos.x, target.pos.y + 1.2, target.pos.z + target.ringRadius + 2.5);
      setNearestNode(target);
    }
  }, [activePlanetId]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    } catch {
      return;
    }

    const getDims = () => ({
      w: Math.max(mount.clientWidth || 640, 300),
      h: Math.max(mount.clientHeight || 380, 300)
    });
    const dims = getDims();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(dims.w, dims.h);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.innerHTML = '';
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, dims.w / dims.h, 0.1, 160);
    const skyHandle = createCosmicSkyBackdrop(scene, 'nebula');

    const hemi = new THREE.HemisphereLight(0xe0f2fe, 0x1e293b, 1.35);
    scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xfffbeb, 1.85);
    dir.position.set(14, 22, 16);
    scene.add(dir);

    let isDisposed = false;
    const spinMeshes: { obj: THREE.Object3D; speed: number; baseY: number; phase: number }[] = [];

    attachBlenderPlanetsFromPack({
      targetParent: scene,
      placements: [
        { nodeName: 'PlanetEarth', id: 'FlightEarth', position: [-14, 0.5, 2], scale: 2.6 },
        { nodeName: 'PlanetMoon', id: 'FlightMoon', position: [-4, 2.2, -9], scale: 1.9 },
        { nodeName: 'PlanetMars', id: 'FlightMars', position: [7, 1.0, -4], scale: 2.2 },
        { nodeName: 'PlanetSaturn', id: 'FlightSaturn', position: [16, 2.5, 5], scale: 2.4 }
      ],
      isDisposed: () => isDisposed,
      onLoaded: (mounted) => {
        Object.entries(mounted).forEach(([, obj], i) => {
          spinMeshes.push({ obj, speed: 0.22 + i * 0.05, baseY: obj.position.y, phase: i * 1.4 });
        });
      }
    });

    const shipRig = new THREE.Group();
    scene.add(shipRig);
    attachBlenderSpaceship({
      targetParent: shipRig,
      position: [0, 0, 0],
      rotationY: 0,
      scale: 0.72,
      isDisposed: () => isDisposed
    });

    const dust = createDustPuffSystem(scene, 18);
    let trailTimer = 0;

    const keys = new Set<string>();
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) {
        if (k === ' ' || k.startsWith('arrow')) e.preventDefault();
      }
      keys.add(k);
      if (k === 'e' || k === 'enter') {
        soundManager.playClick();
        onSelectRef.current(nearestNode.id);
      }
      if (k === 'shift') isBoostingRef.current = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      keys.delete(k);
      if (k === 'shift') isBoostingRef.current = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    let activeZoneId = 'earth';
    let lastTime = performance.now();
    const startTime = lastTime;
    let rafId = 0;

    const animate = (now: number) => {
      rafId = requestAnimationFrame(animate);
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      const elapsed = (now - startTime) / 1000;

      skyHandle.update(elapsed);
      spinMeshes.forEach((p) => {
        p.obj.rotation.y = elapsed * p.speed + p.phase;
        p.obj.position.y = p.baseY + Math.sin(elapsed * 0.9 + p.phase) * 0.28;
      });

      let ix = joystickVecRef.current.x;
      let iz = joystickVecRef.current.z;
      if (keys.has('a') || keys.has('arrowleft')) ix -= 1;
      if (keys.has('d') || keys.has('arrowright')) ix += 1;
      if (keys.has('w') || keys.has('arrowup')) iz -= 1;
      if (keys.has('s') || keys.has('arrowdown')) iz += 1;

      const boost = isBoostingRef.current || keys.has('shift');
      const spd = boost ? 16 : 10.5;
      const len = Math.hypot(ix, iz);
      const targetVx = len > 0.08 ? (ix / len) * spd : 0;
      const targetVz = len > 0.08 ? (iz / len) * spd : 0;
      const { speed } = stepSmoothHorizontalVelocity(horizVelRef.current, targetVx, targetVz, dt, 10, 4.5);

      const pos = shipPosRef.current;
      pos.x = Math.max(-24, Math.min(24, pos.x + horizVelRef.current.x * dt));
      pos.z = Math.max(-18, Math.min(18, pos.z + horizVelRef.current.z * dt));

      if (keys.has(' ') || keys.has('r')) shipVelYRef.current += 12 * dt;
      else if (keys.has('c')) shipVelYRef.current -= 12 * dt;
      else shipVelYRef.current *= Math.exp(-3.5 * dt);
      pos.y = Math.max(-2, Math.min(9, pos.y + shipVelYRef.current * dt));

      if (speed > 0.2) {
        const targetYaw = Math.atan2(horizVelRef.current.x, horizVelRef.current.z);
        yawRef.current = lerpAngle(yawRef.current, targetYaw, 1 - Math.exp(-12 * dt));
      }

      shipRig.position.set(pos.x, pos.y + Math.sin(elapsed * 3) * 0.12, pos.z);
      shipRig.rotation.y = yawRef.current;
      shipRig.rotation.x = Math.min(0.32, speed * 0.02);

      trailTimer += dt;
      if (trailTimer >= (boost ? 0.06 : 0.14)) {
        trailTimer = 0;
        dust.emit(pos.x, pos.y, pos.z, boost ? 0x22d3ee : 0xfbbf24, boost ? 3 : 1, 1.0);
      }
      dust.update(dt);

      // Find nearest Blender planet and shift sky/lighting/gravity dynamically
      let closest = FLIGHT_PLANETS[0];
      let bestDist = Infinity;
      for (const pl of FLIGHT_PLANETS) {
        const d = pos.distanceTo(pl.pos);
        if (d < bestDist) {
          bestDist = d;
          closest = pl;
        }
      }
      skyHandle.setAtmosphere(closest.sky, 0.07);
      hemi.color.lerp(new THREE.Color(closest.hemiSky), 0.06);
      hemi.groundColor.lerp(new THREE.Color(closest.hemiGround), 0.06);
      dir.color.lerp(new THREE.Color(closest.dirColor), 0.06);

      if (closest.id !== activeZoneId) {
        activeZoneId = closest.id;
        setNearestNode(closest);
      }

      camera.position.lerp(new THREE.Vector3(pos.x, pos.y + 4.8, pos.z + 10.5), 0.12);
      camera.lookAt(pos.x, pos.y + 0.6, pos.z - 2);

      renderer.render(scene, camera);
      mount.dataset.drawCalls = String(renderer.info.render.calls);
      mount.dataset.glbLoaded = getLoadedGlbUrls().join(',');
    };

    rafId = requestAnimationFrame(animate);

    const handleResize = () => {
      if (!mountRef.current) return;
      const d = getDims();
      camera.aspect = d.w / d.h;
      camera.updateProjectionMatrix();
      renderer.setSize(d.w, d.h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      isDisposed = true;
      cancelAnimationFrame(rafId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', handleResize);
      skyHandle.dispose();
      dust.dispose();
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.InstancedMesh || obj instanceof THREE.Points) {
          obj.geometry?.dispose();
          const m = obj.material;
          if (Array.isArray(m)) m.forEach((x) => x.dispose());
          else m?.dispose();
        }
      });
      renderer.dispose();
    };
  }, []);

  return (
    <div
      data-testid="space-flight-3d-viewport"
      className="relative w-full h-[360px] sm:h-[420px] rounded-3xl border-4 border-cyan-300/80 overflow-hidden shadow-[0_0_40px_rgba(6,182,212,0.28)]"
    >
      <div ref={mountRef} className="w-full h-full" />
      <div
        dir={language === 'ar' ? 'rtl' : 'ltr'}
        className="pointer-events-none absolute top-3 right-3 z-10 px-3.5 py-1.5 rounded-full bg-slate-950/80 border border-cyan-300/65 text-xs font-hud font-black text-cyan-100 backdrop-blur-md"
      >
        {tr(language, nearestNode.gravityLabelEn, nearestNode.gravityLabelAr)}
      </div>
      <div className="absolute inset-x-0 bottom-0">
        <ThirdPersonControlsOverlay
          promptLabelAr={tr(language, `Inspect ${nearestNode.nameEn}`, `فحص كوكب ${nearestNode.nameAr}`)}
          onInteract={() => {
            soundManager.playClick();
            onSelectPlanetId(nearestNode.id);
          }}
          onJoystickMove={(v) => {
            joystickVecRef.current = v;
          }}
          onJump={() => {
            shipVelYRef.current = 6.5;
          }}
          onSprintChange={(b) => {
            isBoostingRef.current = b;
          }}
          embedded
          hintAr={tr(language, 'WASD Fly • Space Climb • Shift Boost 🚀', 'WASD للطيران • مسافة ارتفاع • شفت تعزيز 🚀')}
        />
      </div>
    </div>
  );
};
