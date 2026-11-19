import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { createCosmicSkyBackdrop } from './archipelagoPrimitives';
import { mergeColoredParts } from './threeMergeUtils';
import { tr } from '../../utils/i18n';
import { soundManager } from '../../utils/sound';
import type { AppLanguage } from '../../types/game';

export interface RocketLaunchCutsceneProps {
  isOpen: boolean;
  language: AppLanguage;
  onComplete: () => void;
}

interface SmokeParticle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  age: number;
  life: number;
  maxScale: number;
}

/**
 * 5.2-second real-time 3D Rocket Liftoff cutscene (< 20 draw calls):
 * Bright green Earth Spaceport Valley -> Flame & Instanced Smoke Plume ->
 * Stratospheric Ascent -> Starry Low-Earth Orbit with curved Blue Earth below.
 */
export const RocketLaunchCutscene: React.FC<RocketLaunchCutsceneProps> = ({
  isOpen,
  language,
  onComplete
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [phaseIdx, setPhaseIdx] = useState<0 | 1 | 2>(0);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const finishedRef = useRef(false);

  const handleFinish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onCompleteRef.current();
  };

  useEffect(() => {
    if (!isOpen) return;
    finishedRef.current = false;
    setPhaseIdx(0);
    soundManager.playRocketLaunchRoar();

    const mount = mountRef.current;
    if (!mount) {
      const t = window.setTimeout(handleFinish, 450);
      return () => window.clearTimeout(t);
    }

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    } catch {
      const t = window.setTimeout(handleFinish, 600);
      return () => window.clearTimeout(t);
    }

    const w = Math.max(mount.clientWidth || window.innerWidth, 320);
    const h = Math.max(mount.clientHeight || window.innerHeight, 240);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setSize(w, h);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.innerHTML = '';
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, w / h, 0.2, 520);
    camera.position.set(9.5, 4.4, 17.5);

    const skyHandle = createCosmicSkyBackdrop(scene, 'sunny', { skipSatellite: true });

    const hemi = new THREE.HemisphereLight(0xc2e9ff, 0x22c55e, 1.5);
    const sun = new THREE.DirectionalLight(0xfff7d6, 2.35);
    sun.position.set(22, 34, 20);
    scene.add(hemi, sun);

    // 1. Lush Green Earth Spaceport Valley Ground (1 draw call)
    const valleyGeo = new THREE.PlaneGeometry(240, 240, 26, 26);
    valleyGeo.rotateX(-Math.PI / 2);
    const posAttr = valleyGeo.attributes.position as THREE.BufferAttribute;
    const cols = new Float32Array(posAttr.count * 3);
    const colTmp = new THREE.Color();
    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vz = posAttr.getZ(i);
      const r = Math.hypot(vx, vz);
      const hill =
        r > 18
          ? Math.min(14, (r - 18) * 0.14) +
            Math.max(0, Math.sin(vx * 0.08 + vz * 0.06) * 2.2)
          : 0;
      posAttr.setY(i, hill);
      if (r < 11) {
        colTmp.setHex(0x334155);
      } else if (r > 72) {
        colTmp.setHex(0x475569);
      } else {
        colTmp.setHex((Math.floor(vx + vz) & 1) === 0 ? 0x22c55e : 0x4ade80);
      }
      cols[i * 3] = colTmp.r;
      cols[i * 3 + 1] = colTmp.g;
      cols[i * 3 + 2] = colTmp.b;
    }
    valleyGeo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    valleyGeo.computeVertexNormals();
    const valleyMesh = new THREE.Mesh(
      valleyGeo,
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, flatShading: true })
    );
    scene.add(valleyMesh);

    // Curved Blue Planet Earth Horizon Sphere revealed during upper-atmosphere orbit pitch-over (2 draw calls)
    const earthHorizonMat = new THREE.MeshStandardMaterial({
      color: 0x1d4ed8,
      emissive: 0x0369a1,
      emissiveIntensity: 0.35,
      roughness: 0.65
    });
    const earthHorizon = new THREE.Mesh(new THREE.SphereGeometry(140, 32, 20), earthHorizonMat);
    earthHorizon.position.set(0, -142.5, -55);
    const earthAtmos = new THREE.Mesh(
      new THREE.SphereGeometry(142.5, 28, 18),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.25, side: THREE.BackSide })
    );
    earthAtmos.position.copy(earthHorizon.position);
    earthHorizon.visible = false;
    earthAtmos.visible = false;
    scene.add(earthHorizon, earthAtmos);

    // 2. Artemis Launch Complex Pad & Red Lattice Tower (1 draw call)
    const padGeom = mergeColoredParts([
      { geometry: new THREE.CylinderGeometry(7.2, 8.2, 0.9, 12), color: 0x475569, position: [0, 0.45, 0] },
      { geometry: new THREE.BoxGeometry(5.5, 0.6, 5.5), color: 0x1e293b, position: [0, 1.0, 0] },
      { geometry: new THREE.BoxGeometry(0.45, 11.5, 0.45), color: 0xdc2626, position: [-3.4, 6.2, -1.0] },
      { geometry: new THREE.BoxGeometry(0.45, 11.5, 0.45), color: 0xdc2626, position: [-2.1, 6.2, -1.0] },
      { geometry: new THREE.BoxGeometry(0.45, 11.5, 0.45), color: 0xdc2626, position: [-3.4, 6.2, 0.4] },
      { geometry: new THREE.BoxGeometry(0.45, 11.5, 0.45), color: 0xdc2626, position: [-2.1, 6.2, 0.4] },
      { geometry: new THREE.BoxGeometry(2.2, 0.35, 2.2), color: 0x94a3b8, position: [-2.75, 12.1, -0.3] },
      { geometry: new THREE.BoxGeometry(2.4, 0.3, 0.45), color: 0xfacc15, position: [-1.1, 9.6, -0.3] }
    ]);
    const padMesh = new THREE.Mesh(
      padGeom,
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.25, flatShading: true })
    );
    scene.add(padMesh);

    // 3. Detailed SLS / Artemis Rocket + Multi-Layer Flame Cone (2 draw calls)
    const rocketGroup = new THREE.Group();
    rocketGroup.position.set(0, 1.3, 0);
    const rocketBodyGeom = mergeColoredParts([
      // Core orange liquid-fuel tank
      { geometry: new THREE.CylinderGeometry(0.92, 0.92, 7.6, 16), color: 0xea580c, position: [0, 4.3, 0] },
      // Twin solid rocket boosters (Left & Right)
      { geometry: new THREE.CylinderGeometry(0.42, 0.44, 6.8, 12), color: 0xf8fafc, position: [-1.36, 3.7, 0] },
      { geometry: new THREE.ConeGeometry(0.42, 1.05, 12), color: 0xf8fafc, position: [-1.36, 7.62, 0] },
      { geometry: new THREE.CylinderGeometry(0.46, 0.56, 0.55, 12), color: 0x1e293b, position: [-1.36, 0.12, 0] },
      { geometry: new THREE.CylinderGeometry(0.42, 0.44, 6.8, 12), color: 0xf8fafc, position: [1.36, 3.7, 0] },
      { geometry: new THREE.ConeGeometry(0.42, 1.05, 12), color: 0xf8fafc, position: [1.36, 7.62, 0] },
      { geometry: new THREE.CylinderGeometry(0.46, 0.56, 0.55, 12), color: 0x1e293b, position: [1.36, 0.12, 0] },
      // Interstage ring, Orion crew module & abort tower
      { geometry: new THREE.CylinderGeometry(0.76, 0.92, 1.3, 14), color: 0xf8fafc, position: [0, 8.7, 0] },
      { geometry: new THREE.CylinderGeometry(0.76, 0.76, 0.35, 14), color: 0x0284c7, position: [0, 9.1, 0] },
      { geometry: new THREE.ConeGeometry(0.74, 1.35, 14), color: 0xe2e8f0, position: [0, 10.0, 0] },
      { geometry: new THREE.CylinderGeometry(0.08, 0.16, 1.3, 8), color: 0xf8fafc, position: [0, 11.2, 0] },
      // Core engine nozzle
      { geometry: new THREE.CylinderGeometry(0.46, 0.68, 0.7, 12), color: 0x1e293b, position: [0, 0.25, 0] }
    ]);
    const rocketMesh = new THREE.Mesh(
      rocketBodyGeom,
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.36, metalness: 0.24, flatShading: true })
    );
    const flameGeom = mergeColoredParts([
      { geometry: new THREE.ConeGeometry(1.1, 4.6, 12), color: 0xf97316, position: [0, -2.3, 0], rotation: [Math.PI, 0, 0] },
      { geometry: new THREE.ConeGeometry(0.62, 3.1, 10), color: 0xfef08a, position: [0, -1.55, 0], rotation: [Math.PI, 0, 0] },
      { geometry: new THREE.ConeGeometry(0.42, 2.8, 10), color: 0xfbbf24, position: [-1.36, -1.45, 0], rotation: [Math.PI, 0, 0] },
      { geometry: new THREE.ConeGeometry(0.42, 2.8, 10), color: 0xfbbf24, position: [1.36, -1.45, 0], rotation: [Math.PI, 0, 0] }
    ]);
    const flameMesh = new THREE.Mesh(
      flameGeom,
      new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.92 })
    );
    rocketGroup.add(rocketMesh, flameMesh);
    scene.add(rocketGroup);

    // 4. Instanced Billowing Exhaust Smoke Plume (1 draw call, 48 clouds)
    const maxSmoke = 48;
    const smokeGeo = new THREE.DodecahedronGeometry(0.95, 1);
    const smokeMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.92,
      emissive: 0xfdba74,
      emissiveIntensity: 0.22,
      transparent: true,
      opacity: 0.85,
      flatShading: true
    });
    const smokeInst = new THREE.InstancedMesh(smokeGeo, smokeMat, maxSmoke);
    smokeInst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    smokeInst.frustumCulled = false;
    const smokeDummy = new THREE.Object3D();
    const smokePool: SmokeParticle[] = Array.from({ length: maxSmoke }, () => ({
      x: 0,
      y: -999,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      age: 2,
      life: 1,
      maxScale: 1
    }));
    let smokeCursor = 0;
    scene.add(smokeInst);

    const spawnSmoke = (count: number, ry: number) => {
      for (let i = 0; i < count; i++) {
        const p = smokePool[smokeCursor % maxSmoke];
        smokeCursor++;
        const ang = Math.random() * Math.PI * 2;
        const speed = ry < 4 ? 3.5 + Math.random() * 5.5 : 1.4 + Math.random() * 2.4;
        p.x = (Math.random() - 0.5) * 1.4;
        p.y = Math.max(0.7, ry - 0.4);
        p.z = (Math.random() - 0.5) * 1.4;
        p.vx = Math.cos(ang) * speed;
        p.vy = ry < 4 ? 0.6 + Math.random() * 1.6 : -2.6 - Math.random() * 2.2;
        p.vz = Math.sin(ang) * speed;
        p.age = 0;
        p.life = 1.05 + Math.random() * 0.55;
        p.maxScale = 1.35 + Math.random() * 1.25;
      }
    };

    const handleResize = () => {
      if (!mountRef.current) return;
      const cw = Math.max(mountRef.current.clientWidth || window.innerWidth, 320);
      const ch = Math.max(mountRef.current.clientHeight || window.innerHeight, 240);
      camera.aspect = cw / ch;
      camera.updateProjectionMatrix();
      renderer.setSize(cw, ch);
    };
    window.addEventListener('resize', handleResize);

    const TOTAL_DURATION = 5.2;
    let rafId = 0;
    const tStart = performance.now();
    let prevMs = tStart;
    let emitAcc = 0;
    let currentPhase: 0 | 1 | 2 = 0;

    const animate = (now: number) => {
      const elapsed = (now - tStart) / 1000;
      const dt = Math.min(0.05, (now - prevMs) / 1000);
      prevMs = now;

      if (elapsed >= TOTAL_DURATION) {
        handleFinish();
        return;
      }
      rafId = requestAnimationFrame(animate);

      const nextPhase: 0 | 1 | 2 = elapsed < 1.3 ? 0 : elapsed < 3.4 ? 1 : 2;
      if (nextPhase !== currentPhase) {
        currentPhase = nextPhase;
        setPhaseIdx(nextPhase);
      }

      // Rocket vertical ascent profile + launch pad vibration during T-0..1.3s
      let ry = 1.3;
      let shake = 0;
      if (elapsed < 1.3) {
        shake = 0.09 * Math.sin(elapsed * 55);
        ry = 1.3 + Math.max(0, elapsed - 0.85) * 2.2;
      } else {
        const upT = elapsed - 1.3;
        ry = 2.29 + upT * 5.2 + upT * upT * 11.2;
        shake = Math.max(0, 0.06 * (1 - upT / 2.2));
      }
      rocketGroup.position.set(shake, ry, Math.cos(elapsed * 47) * shake * 0.6);
      rocketGroup.rotation.z = elapsed > 2.8 ? -Math.min(0.22, (elapsed - 2.8) * 0.09) : 0;

      // Dynamic exhaust flame pulse
      const fScaleY = (elapsed < 0.35 ? elapsed / 0.35 : 1) * (0.9 + Math.sin(elapsed * 42) * 0.22);
      const fScaleX = 0.92 + Math.cos(elapsed * 36) * 0.1;
      flameMesh.scale.set(fScaleX, Math.max(0.05, fScaleY), fScaleX);

      // Billowing smoke plume emission
      emitAcc += dt;
      if (emitAcc >= 0.04 && ry < 68) {
        emitAcc = 0;
        spawnSmoke(ry < 6 ? 3 : 2, ry);
      }
      for (let i = 0; i < maxSmoke; i++) {
        const p = smokePool[i];
        p.age += dt;
        if (p.age < p.life) {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.z += p.vz * dt;
          const u = p.age / p.life;
          const sc = p.maxScale * (0.45 + Math.sin(u * Math.PI) * 1.15);
          smokeDummy.position.set(p.x, Math.max(0.5, p.y), p.z);
          smokeDummy.rotation.set(elapsed + i, elapsed * 0.7, 0);
          smokeDummy.scale.setScalar(sc);
        } else {
          smokeDummy.position.set(0, -999, 0);
          smokeDummy.scale.setScalar(0);
        }
        smokeDummy.updateMatrix();
        smokeInst.setMatrixAt(i, smokeDummy.matrix);
      }
      smokeInst.instanceMatrix.needsUpdate = true;

      // Sky dome smoothly transitions from bright daytime blue Earth sky -> starry Low-Earth Orbit
      if (elapsed > 1.7) {
        skyHandle.setAtmosphere('nebula', Math.min(0.14, 0.03 + (elapsed - 1.7) * 0.03));
      }
      if (elapsed > 2.9) {
        earthHorizon.visible = true;
        earthAtmos.visible = true;
        valleyMesh.visible = false;
        padMesh.visible = false;
      }
      skyHandle.update(elapsed);

      // Cinematic tracking camera
      const trackY = elapsed < 1.3 ? 4.4 : Math.max(4.4, ry - 2.4);
      const camX = 9.5 + Math.max(0, elapsed - 1.3) * 2.2 + shake * 1.8;
      const camZ = 17.5 + Math.max(0, elapsed - 1.3) * 3.8;
      camera.position.set(camX, trackY, camZ);
      camera.lookAt(0, ry + 4.2, 0);

      renderer.render(scene, camera);
    };

    rafId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
      skyHandle.dispose();
      smokeGeo.dispose();
      smokeMat.dispose();
      valleyGeo.dispose();
      (valleyMesh.material as THREE.Material).dispose();
      padGeom.dispose();
      (padMesh.material as THREE.Material).dispose();
      rocketBodyGeom.dispose();
      (rocketMesh.material as THREE.Material).dispose();
      flameGeom.dispose();
      (flameMesh.material as THREE.Material).dispose();
      earthHorizon.geometry.dispose();
      earthHorizonMat.dispose();
      earthAtmos.geometry.dispose();
      (earthAtmos.material as THREE.Material).dispose();
      renderer.dispose();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const phaseLabels: [string, string][] = [
    ['T-0 IGNITION 🔥 Engines Full Thrust!', 'لحظة الإقلاع 🔥 اشتعال المحركات!'],
    ['MAX-Q ASCENT 🚀 Leaving Earth Valley!', 'صعود سريع 🚀 مغادرة الغلاف الجوي!'],
    ['LOW-EARTH ORBIT 🛰️ Approaching ISS!', 'المدار الأرضي 🛰️ الاقتراب من محطة الفضاء!']
  ];
  const [enPhase, arPhase] = phaseLabels[phaseIdx];

  return (
    <div
      data-testid="rocket-launch-cutscene"
      dir={language === 'ar' ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-[90] w-screen h-[100dvh] overflow-hidden bg-slate-950 select-none"
    >
      <div ref={mountRef} className="w-full h-full" />

      {/* Top Mission Phase Status Pill */}
      <div className="pointer-events-none fixed top-4 inset-x-0 z-10 flex justify-center px-4">
        <div className="px-4 py-2 rounded-full bg-slate-950/85 border-2 border-amber-400/90 backdrop-blur-md shadow-2xl flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-400 animate-ping" />
          <span className="font-hud font-black text-xs sm:text-sm text-white">
            {tr(language, enPhase, arPhase)}
          </span>
        </div>
      </div>

      {/* Prominent Skip Cutscene Button for Players & Judges */}
      <button
        type="button"
        data-testid="skip-launch-cutscene-btn"
        onClick={() => {
          soundManager.playClick();
          handleFinish();
        }}
        className="fixed bottom-5 right-5 z-20 px-4 py-2.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 hover:brightness-110 active:scale-95 text-slate-950 font-hud font-black text-xs sm:text-sm border-2 border-white shadow-[0_6px_0_#b45309] cursor-pointer transition-transform"
      >
        {tr(language, 'Skip 🚀', 'تخطي 🚀')}
      </button>
    </div>
  );
};
