import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Globe, Play, Rocket, Sparkles, User, Volume2 } from 'lucide-react';
import { useGameState } from '../../context/GameContext';
import { buildSpaceFitXCharacter } from '../three/buildSpaceFitXCharacter';
import gsap from 'gsap';
import { createCosmicSkyBackdrop } from '../three/archipelagoPrimitives';
import { attachEarthBuildingGlb, disposeObject3D, loadCachedGlbClone } from '../three/blenderModelLoader';
import { ColoredGeometryPart, mergeColoredParts } from '../three/threeMergeUtils';
import { soundManager } from '../../utils/sound';
import { speakWebSpeechNonBlocking, tr } from '../../utils/i18n';
import type { CadetAgeGroup } from '../../types/game';

interface IntroVideoPlayerProps {
  onComplete: () => void;
}

const CUTSCENE_BEATS: Array<{
  atSec: number;
  en: string;
  ar: string;
}> = [
  {
    atSec: 0,
    en: '🤖 Robo: "Welcome Space Hero! Ready to launch from Earth?"',
    ar: '🤖 روبو: "أهلاً يا بطل الفضاء! جاهز للإقلاع من الأرض؟"'
  },
  {
    atSec: 1.7,
    en: '🧑‍🚀 SPACE-FIT X: "4 Space Worlds & 14 Fun NASA Missions!"',
    ar: '🧑‍🚀 بدلة الفضاء: "4 عوالم فضائية و14 مهمة ممتعة من ناسا!"'
  },
  {
    atSec: 3.4,
    en: '🚀 Liftoff Ready: "Tap PLAY ADVENTURE to start your journey!"',
    ar: '🚀 جاهز للانطلاق: "اضغط ابدأ المغامرة لتبدأ رحلتك الآن!"'
  }
];

function extractGlbMeshGeometry(root: THREE.Object3D, meshName: string): THREE.BufferGeometry | null {
  const obj = root.getObjectByName(meshName);
  if (!obj) return null;
  root.updateMatrixWorld(true);
  let targetMesh: THREE.Mesh | null = null;
  if (obj instanceof THREE.Mesh) {
    targetMesh = obj;
  } else {
    obj.traverse((child) => {
      if (!targetMesh && child instanceof THREE.Mesh) targetMesh = child;
    });
  }
  if (!targetMesh?.geometry) return null;
  const cloned = targetMesh.geometry.clone();
  cloned.applyMatrix4(targetMesh.matrixWorld);
  if (!cloned.getAttribute('normal')) cloned.computeVertexNormals();
  return cloned;
}

export const IntroVideoPlayer: React.FC<IntroVideoPlayerProps> = ({ onComplete }) => {
  const { state, language, ageGroup, setLanguage, setAgeGroup, setCadetName } = useGameState();
  const [nameInput, setNameInput] = useState<string>(state.cadetName || 'Explorer');
  const [cutsceneElapsed, setCutsceneElapsed] = useState<number>(0);
  const [beatIdx, setBeatIdx] = useState<number>(0);
  const [showBootSplash, setShowBootSplash] = useState<boolean>(true);
  const [splashProgress, setSplashProgress] = useState<number>(8);
  const canvasHostRef = useRef<HTMLDivElement | null>(null);

  // Instant AAA Game Boot Logo Splash (< 1.6s auto-transition or instant on tap, zero network wait)
  useEffect(() => {
    const tFill = window.setTimeout(() => setSplashProgress(100), 40);
    const tDone = window.setTimeout(() => setShowBootSplash(false), 1550);
    return () => {
      window.clearTimeout(tFill);
      window.clearTimeout(tDone);
    };
  }, []);

  // Live 3D Hero Stage: Sunlit Bright Earth Launchpad Vista + SPACE-FIT X Astronaut & Robo + Rocket Backdrop
  useEffect(() => {
    const host = canvasHostRef.current;
    if (!host) return;

    let renderer: THREE.WebGLRenderer | null = null;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    } catch {
      return;
    }

    const w = Math.max(host.clientWidth || window.innerWidth, 320);
    const h = Math.max(host.clientHeight || window.innerHeight, 320);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(w, h);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    let isDisposed = false;
    const camera = new THREE.PerspectiveCamera(44, w / h, 0.1, 280);
    camera.position.set(3.2, 2.4, 7.6);

    // Bright Sunlit Daylight Sky Dome + Drifting Fluffy Clouds
    const sky = createCosmicSkyBackdrop(scene, 'sunny', { skipSatellite: true });
    scene.background = new THREE.Color(0x56c2ff);
    scene.fog = new THREE.Fog(0x9bd9ff, 65, 220);

    const hemi = new THREE.HemisphereLight(0xd8f3ff, 0x3b8c4a, 1.55);
    const sun = new THREE.DirectionalLight(0xfff6d6, 2.35);
    sun.position.set(16, 28, 20);
    const fill = new THREE.DirectionalLight(0x7dd3fc, 0.75);
    fill.position.set(-14, 10, -12);
    scene.add(hemi, sun, fill);

    // Sunlit Lush Green Valley Meadow + Paved Launchpad Promenade Stage
    const stageGroup = new THREE.Group();
    const stageParts: ColoredGeometryPart[] = [
      // Lush emerald valley floor & rolling hills
      { geometry: new THREE.CylinderGeometry(58, 62, 1.6, 36), color: 0x38b449, position: [0, -0.95, -6] },
      { geometry: new THREE.SphereGeometry(22, 18, 12), color: 0x2ea043, position: [-24, -15.5, -24], scale: [1.5, 0.45, 1.1] },
      { geometry: new THREE.SphereGeometry(24, 18, 12), color: 0x45c458, position: [26, -16.2, -26], scale: [1.4, 0.45, 1.1] },
      // Asphalt approach road leading from hero dais to Artemis Launchpad
      { geometry: new THREE.BoxGeometry(4.2, 0.14, 24), color: 0x3f4b5b, position: [1.6, -0.14, -9.5], rotation: [0, -0.14, 0] },
      { geometry: new THREE.BoxGeometry(0.18, 0.15, 22), color: 0xfacc15, position: [1.6, -0.13, -9.5], rotation: [0, -0.14, 0] },
      // Hero Astronaut Launchpad Dais (Positioned slightly left-center at x = -1.15 so right UI dock never covers hero!)
      { geometry: new THREE.CylinderGeometry(2.85, 3.25, 0.28, 32), color: 0x475569, position: [-1.15, -0.14, 0.2] },
      { geometry: new THREE.CylinderGeometry(2.35, 2.55, 0.14, 32), color: 0x1e293b, position: [-1.15, -0.02, 0.2] }
    ];

    // Stylized Colorful Rounded Meadow Trees framing the sunlit vista (Emerald, Golden-Orange, Blossom Pink)
    const treePlacements: Array<{ x: number; z: number; s: number; col: number }> = [
      { x: -7.5, z: -4.8, s: 1.05, col: 0x22c55e },
      { x: -11.5, z: -10.5, s: 1.25, col: 0xf59e0b },
      { x: -5.4, z: -14.0, s: 0.95, col: 0xf472b6 },
      { x: 9.2, z: -7.5, s: 1.1, col: 0x4ade80 },
      { x: 12.8, z: -13.5, s: 1.2, col: 0xfb923c },
      { x: -14.8, z: -4.2, s: 1.15, col: 0x16a34a }
    ];
    for (const tp of treePlacements) {
      stageParts.push(
        { geometry: new THREE.CylinderGeometry(0.18 * tp.s, 0.30 * tp.s, 1.8 * tp.s, 8), color: 0x6b3e1e, position: [tp.x, 0.7 * tp.s, tp.z] },
        { geometry: new THREE.IcosahedronGeometry(1.15 * tp.s, 1), color: tp.col, position: [tp.x, 2.25 * tp.s, tp.z], scale: [1.15, 0.92, 1.12] },
        { geometry: new THREE.IcosahedronGeometry(0.85 * tp.s, 1), color: tp.col, position: [tp.x - 0.65 * tp.s, 1.85 * tp.s, tp.z + 0.3 * tp.s], scale: [1.05, 0.85, 1.05] },
        { geometry: new THREE.IcosahedronGeometry(0.82 * tp.s, 1), color: tp.col, position: [tp.x + 0.65 * tp.s, 1.9 * tp.s, tp.z - 0.25 * tp.s], scale: [1.05, 0.85, 1.05] }
      );
    }

    const stageMesh = new THREE.Mesh(
      mergeColoredParts(stageParts),
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0.12 })
    );
    stageGroup.add(stageMesh);

    const daisRing = new THREE.Mesh(
      new THREE.TorusGeometry(2.42, 0.06, 10, 48),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    daisRing.rotation.x = Math.PI / 2;
    daisRing.position.set(-1.15, 0.05, 0.2);
    stageGroup.add(daisRing);
    scene.add(stageGroup);

    // Craggy Snow-Capped Alpine Mountain Backdrop Ring
    const fallbackMtnParts: ColoredGeometryPart[] = [];
    for (let i = 0; i < 18; i++) {
      const ang = (i / 18) * Math.PI * 2;
      const r = 115 + (i % 3) * 8;
      const h = 24 + (i % 4) * 7;
      fallbackMtnParts.push(
        { geometry: new THREE.ConeGeometry(22, h, 5), color: 0x475569, position: [Math.cos(ang) * r, h * 0.38 - 3, Math.sin(ang) * r] },
        { geometry: new THREE.ConeGeometry(9.5, h * 0.42, 5), color: 0xf8fafc, position: [Math.cos(ang) * r, h * 0.68 - 3, Math.sin(ang) * r] }
      );
    }
    const mtnMesh = new THREE.Mesh(
      mergeColoredParts(fallbackMtnParts),
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, flatShading: true })
    );
    scene.add(mtnMesh);

    void loadCachedGlbClone('/models/earth_mountains_craggy.glb').then((glb) => {
      if (!glb) return;
      if (isDisposed) {
        disposeObject3D(glb);
        return;
      }
      const mtnGeom = extractGlbMeshGeometry(glb, 'CraggyMountains');
      if (mtnGeom) {
        mtnGeom.scale(0.82, 0.85, 0.82);
        mtnMesh.geometry.dispose();
        mtnMesh.geometry = mtnGeom;
      }
      disposeObject3D(glb);
    });

    // Artemis Rocket & Red Umbilical Launch Tower standing proudly in the sunlit background
    const rocketGroup = new THREE.Group();
    rocketGroup.position.set(3.8, -0.15, -15.5);
    scene.add(rocketGroup);
    const fallbackRocket = new THREE.Mesh(
      mergeColoredParts([
        { geometry: new THREE.CylinderGeometry(0.8, 0.85, 7.5, 16), color: 0xf97316, position: [0, 4.2, 0] },
        { geometry: new THREE.ConeGeometry(0.8, 2.2, 16), color: 0xf8fafc, position: [0, 9.0, 0] },
        { geometry: new THREE.BoxGeometry(1.4, 11.0, 1.4), color: 0xdc2626, position: [-2.4, 5.5, 0] }
      ]),
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45 })
    );
    rocketGroup.add(fallbackRocket);

    attachEarthBuildingGlb({
      modelName: 'earth_launch_complex',
      targetParent: rocketGroup,
      scale: 0.72,
      position: [0, 0, 0],
      rotationY: -0.35,
      fallbackNodes: [fallbackRocket],
      isDisposed: () => isDisposed
    });

    // 3D SPACE-FIT X Astronaut + built-in hovering Robo companion on the Hero Dais (left-center)
    const hero = buildSpaceFitXCharacter({
      showEvaHelmet: true,
      showCompanion: true,
      scale: 1.24
    });
    hero.group.position.set(-1.15, 0.05, 0.25);
    scene.add(hero.group);

    // Smooth GSAP camera fly-in framing hero on left & rocket/mountains across the vista
    const introCamProxy = { x: 2.4, y: 2.6, z: 7.4 };
    const camTween = gsap.to(introCamProxy, {
      x: 0.35,
      y: 1.58,
      z: 4.55,
      duration: 3.2,
      ease: 'power3.out'
    });

    const handleResize = () => {
      if (!host || !renderer) return;
      const cw = Math.max(host.clientWidth || window.innerWidth, 320);
      const ch = Math.max(host.clientHeight || window.innerHeight, 320);
      camera.aspect = cw / ch;
      camera.updateProjectionMatrix();
      renderer.setSize(cw, ch);
    };
    window.addEventListener('resize', handleResize);

    const startMs = performance.now();
    let lastSubtitleBucket = 0;
    let rafId = 0;

    const tick = (now: number) => {
      rafId = requestAnimationFrame(tick);
      const elapsed = (now - startMs) / 1000;
      const flyT = Math.min(1, elapsed / 5.0);

      const bucket = elapsed < 1.7 ? 0 : elapsed < 3.4 ? 1 : 2;
      if (bucket !== lastSubtitleBucket) {
        lastSubtitleBucket = bucket;
        setBeatIdx(bucket);
      }
      if (flyT < 1 && Math.floor(elapsed * 4) !== Math.floor((elapsed - 0.016) * 4)) {
        setCutsceneElapsed(Math.min(5, Number(elapsed.toFixed(1))));
      } else if (flyT >= 1 && lastSubtitleBucket === 2) {
        setCutsceneElapsed(5);
      }

      sky.update(elapsed);
      hero.update({
        t: elapsed,
        moveSpeed: 0,
        emote: 'wave',
        suitState: state.campaign?.spaceFitX
      });
      hero.group.rotation.y = 0.22 + Math.sin(elapsed * 0.75) * 0.18;

      const orbitSway = Math.sin(elapsed * 0.42) * 0.32;
      const camX = introCamProxy.x + orbitSway;
      const camY = introCamProxy.y + Math.sin(elapsed * 0.65) * 0.06;
      const camZ = introCamProxy.z;
      daisRing.rotation.z = elapsed * 0.25;
      camera.position.set(camX, camY, camZ);
      camera.lookAt(-0.15, 1.25, -0.6);

      renderer?.render(scene, camera);
    };
    rafId = requestAnimationFrame(tick);

    return () => {
      isDisposed = true;
      camTween.kill();
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
      sky.dispose();
      hero.dispose();
      disposeObject3D(rocketGroup);
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.InstancedMesh) {
          obj.geometry?.dispose();
          const m = obj.material;
          if (Array.isArray(m)) m.forEach((x) => x.dispose());
          else m?.dispose();
        }
      });
      renderer?.dispose();
      if (renderer?.domElement.parentNode === host) {
        host.removeChild(renderer.domElement);
      }
    };
  }, []);

  const handleInstantStart = () => {
    const cleanedName = nameInput.trim() || (language === 'ar' ? 'مستكشف الفضاء' : 'Explorer');
    setCadetName(cleanedName);
    try {
      sessionStorage.setItem('astronutri_intro_played', 'true');
    } catch {
      // ignore storage errors
    }

    onComplete();

    window.setTimeout(() => {
      try {
        soundManager.playFanfare();
      } catch {
        // ignore un-unlocked AudioContext
      }
      speakWebSpeechNonBlocking(
        language === 'ar'
          ? `أهلاً يا ${cleanedName}! انطلق نحو بوابة الأرض لبدء المغامرة!`
          : `Welcome Cadet ${cleanedName}! Head to the Earth Launchpad to start your adventure!`,
        language
      );
    }, 0);
  };

  const handleHearCutsceneVoice = () => {
    try {
      soundManager.playClick();
    } catch {
      // ignore
    }
    const text =
      language === 'ar'
        ? 'مرحباً بك في مغامرة أسترونوتري الفضائية! اضغط ابدأ المغامرة للانطلاق من منصة الأرض.'
        : 'Welcome to AstroNutri Space Adventure! Tap Play Adventure to launch from the sunlit Earth Spaceport.';
    speakWebSpeechNonBlocking(text, language);
  };

  const currentBeat = CUTSCENE_BEATS[beatIdx] || CUTSCENE_BEATS[0];
  void cutsceneElapsed;

  return (
    <div
      data-testid="intro-welcome-screen"
      dir={language === 'ar' ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-50 h-[100dvh] w-full overflow-hidden bg-[#1e90ff] flex flex-col justify-between p-2.5 sm:p-5 select-none"
    >
      {/* Instant AAA Game Boot Logo Splash (< 1.6s auto-transition or instant on tap) */}
      {showBootSplash && (
        <div
          data-testid="boot-logo-splash"
          onClick={() => setShowBootSplash(false)}
          className="fixed inset-0 z-50 bg-[radial-gradient(circle_at_center,_#0c2d6b_0%,_#04091a_70%,_#020510_100%)] flex flex-col items-center justify-center p-4 cursor-pointer select-none animate-fade-in"
        >
          <div className="relative flex flex-col items-center max-w-lg w-full text-center space-y-3">
            <div className="relative w-28 h-28 sm:w-40 sm:h-40 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-cyan-500/20 blur-2xl animate-pulse" />
              <svg viewBox="0 0 200 200" className="w-full h-full overflow-visible">
                <defs>
                  <linearGradient id="splashOrbitGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#22d3ee" />
                    <stop offset="50%" stopColor="#38bdf8" />
                    <stop offset="100%" stopColor="#fbbf24" />
                  </linearGradient>
                  <radialGradient id="splashCoreGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.85" />
                    <stop offset="65%" stopColor="#1e3a8a" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="#04091a" stopOpacity="0" />
                  </radialGradient>
                </defs>
                <circle cx="100" cy="100" r="68" fill="url(#splashCoreGlow)" />
                <circle cx="100" cy="100" r="46" fill="#071330" stroke="url(#splashOrbitGrad)" strokeWidth="3.5" />
                <ellipse cx="100" cy="100" rx="46" ry="18" fill="none" stroke="rgba(56,189,248,0.35)" strokeWidth="1.5" />
                <ellipse cx="100" cy="100" rx="18" ry="46" fill="none" stroke="rgba(56,189,248,0.35)" strokeWidth="1.5" />
                <g transform="rotate(-22 100 100)">
                  <ellipse cx="100" cy="100" rx="84" ry="32" fill="none" stroke="url(#splashOrbitGrad)" strokeWidth="3" strokeDasharray="12 6" />
                </g>
                <g className="origin-center animate-spin" style={{ animationDuration: '2.4s' }}>
                  <circle cx="100" cy="100" r="64" fill="none" stroke="rgba(34,211,238,0.45)" strokeWidth="2" strokeDasharray="24 14" />
                  <g transform="translate(100, 36)">
                    <circle cx="-10" cy="0" r="5" fill="#fbbf24" opacity="0.85" />
                    <path d="M 12 0 L -6 -7 L -2 0 L -6 7 Z" fill="#f8fafc" stroke="#22d3ee" strokeWidth="1.5" />
                  </g>
                </g>
                <path d="M100 68 L112 96 L106 112 L94 112 L88 96 Z" fill="#f8fafc" stroke="#38bdf8" strokeWidth="2" />
                <polygon points="88,98 78,112 90,110" fill="#f59e0b" />
                <polygon points="112,98 122,112 110,110" fill="#f59e0b" />
                <circle cx="100" cy="89" r="5" fill="#22d3ee" />
                <path d="M95 113 L100 128 L105 113 Z" fill="#fbbf24" />
              </svg>
            </div>

            <div className="space-y-1">
              <div className="font-hud font-black text-3xl sm:text-5xl tracking-[0.22em] text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-white to-amber-300 drop-shadow-[0_0_24px_rgba(34,211,238,0.65)]">
                ASTRONUTRI
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-400/15 border border-amber-300/70 text-amber-200 font-hud font-black text-[10px] sm:text-xs tracking-wider uppercase shadow-lg">
                <span>🏆</span>
                <span>
                  {tr(
                    language,
                    'JUNIOR ASTRONAUT MISSION TRAINER — NASA SPACE APPS',
                    'مدرب رواد الفضاء الصغار — تحدي ناسا لتطبيقات الفضاء'
                  )}
                </span>
              </div>
            </div>

            <div className="w-60 sm:w-76 space-y-1 pt-1">
              <div className="h-2 w-full rounded-full bg-slate-900/90 border border-cyan-400/50 p-0.5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-sky-300 to-amber-400 transition-all ease-out"
                  style={{ width: `${splashProgress}%`, transitionDuration: '1400ms' }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono text-cyan-200/80 px-1">
                <span>{tr(language, 'LOADING SUNLIT SPACEPORT...', 'جاري تجهيز مركز الفضاء...')}</span>
                <span>{tr(language, 'TAP TO SKIP ⚡', 'اضغط للتخطي ⚡')}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Live 3D Sunlit Launchpad Hero Stage Canvas */}
      <div
        ref={canvasHostRef}
        data-testid="intro-3d-cutscene-canvas"
        className="fixed inset-0 w-full h-full z-0 pointer-events-none"
      />
      <div className="fixed inset-0 bg-gradient-to-r from-slate-950/35 via-transparent to-slate-950/55 pointer-events-none z-0" />

      {/* Top Row: Stylized ASTRONUTRI Hero Emblem (Left) + Voice & EN/AR Toggle Pill (Right) */}
      <header className="relative z-10 w-full max-w-6xl mx-auto flex items-center justify-between gap-2 shrink-0">
        {/* Stylized ASTRONUTRI Logo Badge */}
        <div className="flex items-center gap-2.5 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-2xl bg-slate-950/82 border-2 border-cyan-300/85 backdrop-blur-md shadow-[0_8px_28px_rgba(2,6,23,0.55)]">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-cyan-400 via-sky-500 to-indigo-600 p-0.5 shadow-md flex items-center justify-center shrink-0">
            <Rocket className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-hud font-black text-base sm:text-2xl tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 via-white to-amber-300">
                ASTRONUTRI
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-hud font-black text-[9px] sm:text-[10px] uppercase shadow">
                NASA 3D
              </span>
            </div>
            <p className="text-[10px] sm:text-xs font-hud font-bold text-cyan-200 leading-tight">
              {tr(
                language,
                'Earth-to-Mars Space Nutrition & Rover Adventure',
                'مغامرة التغذية ومركبات الفضاء من الأرض للمريخ'
              )}
            </p>
          </div>
        </div>

        {/* Top-Right Voice & Clean EN | عربي Toggle Pill */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={handleHearCutsceneVoice}
            className="h-9 px-2.5 sm:px-3 rounded-full bg-slate-950/82 hover:bg-slate-900 border-2 border-amber-300/80 text-amber-200 font-hud font-black text-xs flex items-center gap-1.5 cursor-pointer backdrop-blur-md shadow-lg"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{tr(language, 'Voice', 'ترحيب صوتي')}</span>
          </button>

          <div
            data-testid="intro-language-toggle"
            className="h-9 inline-flex items-center gap-1 p-1 rounded-full bg-slate-950/85 border-2 border-cyan-300/85 backdrop-blur-md shadow-lg"
          >
            <Globe className="w-3.5 h-3.5 text-cyan-300 mx-1" />
            <button
              type="button"
              data-testid="intro-lang-en"
              onClick={() => {
                soundManager.playClick();
                setLanguage('en');
              }}
              className={`px-2.5 py-0.5 rounded-full text-xs font-hud font-black transition-all cursor-pointer ${
                language === 'en' ? 'bg-cyan-400 text-slate-950 shadow' : 'text-slate-200 hover:text-white'
              }`}
            >
              EN
            </button>
            <button
              type="button"
              data-testid="intro-lang-ar"
              onClick={() => {
                soundManager.playClick();
                setLanguage('ar');
              }}
              className={`px-2.5 py-0.5 rounded-full text-xs font-hud font-black transition-all cursor-pointer ${
                language === 'ar' ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-200 hover:text-white'
              }`}
            >
              {tr(language, 'AR', 'عربي')}
            </button>
          </div>
        </div>
      </header>

      {/* Main Landscape Content: Left 3D Hero Stage Subtitle Pill + Right Compact Translucent Glass Launch Dock */}
      <div className="relative z-10 w-full max-w-6xl mx-auto flex-1 min-h-0 flex flex-col sm:flex-row items-center sm:items-end justify-end sm:justify-between gap-2.5 pb-1 sm:pb-3">
        {/* Bottom-Left Speech Bubble under the 3D Astronaut & Robo */}
        <div className="hidden sm:flex flex-col items-start gap-1.5 max-w-md pointer-events-none">
          <div
            data-testid="intro-cutscene-subtitle"
            className="px-4 py-2.5 rounded-2xl bg-slate-950/82 border-2 border-cyan-300/85 backdrop-blur-md shadow-2xl"
          >
            <p className="font-hud font-black text-xs sm:text-sm text-white leading-snug">
              {tr(language, currentBeat.en, currentBeat.ar)}
            </p>
          </div>
        </div>

        {/* Sleek Translucent Glass Dock: Glowing PLAY ADVENTURE CTA + Compact Cadet Name & 3-Pill Age Selector */}
        <div className="w-full max-w-[360px] sm:max-w-[380px] rounded-3xl bg-slate-950/85 border-2 border-cyan-300/85 backdrop-blur-xl p-3 sm:p-4 shadow-[0_16px_48px_rgba(2,6,23,0.75)] space-y-2.5 shrink-0">
          {/* Primary Unmistakable Glowing PLAY ADVENTURE CTA at Top of Dock */}
          <button
            type="button"
            data-testid="start-adventure-btn"
            onClick={handleInstantStart}
            className="w-full btn-chunky-adventure py-3 sm:py-3.5 px-5 text-base sm:text-xl flex items-center justify-center gap-2 shadow-[0_10px_28px_rgba(255,159,28,0.65)] cursor-pointer touch-manipulation active:scale-95 transition-transform"
          >
            <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-slate-950" />
            <span>{tr(language, 'PLAY ADVENTURE', 'ابدأ المغامرة')}</span>
            <span>🚀</span>
          </button>

          {/* Compact Single-Row Cadet Name + 3-Pill Age Selector */}
          <div className="grid grid-cols-12 gap-2 items-end pt-0.5">
            <label className="col-span-6 block space-y-1">
              <span className="text-[10px] font-hud font-black text-cyan-200 flex items-center gap-1">
                <User className="w-3 h-3 text-cyan-300" />
                <span>{tr(language, 'Cadet Name', 'اسم البطل')}</span>
              </span>
              <input
                type="text"
                data-testid="onboarding-name-input"
                maxLength={18}
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder={tr(language, 'Explorer...', 'اسمك...')}
                className="w-full h-8 px-2.5 rounded-xl bg-slate-900/95 border border-cyan-400/50 focus:border-amber-300 text-white text-xs font-hud font-bold outline-none"
              />
            </label>

            <div className="col-span-6 space-y-1">
              <span className="text-[10px] font-hud font-black text-cyan-200 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-300" />
                <span>{tr(language, 'Age Group', 'العمر')}</span>
              </span>
              <div className="grid grid-cols-3 gap-1">
                {(
                  [
                    { id: '7-10', label: '7-10' },
                    { id: '11-14', label: '11-14' },
                    { id: '15+', label: '15+' }
                  ] as Array<{ id: CadetAgeGroup; label: string }>
                ).map((grp) => (
                  <button
                    key={grp.id}
                    type="button"
                    data-testid={`age-group-${grp.id}`}
                    onClick={() => {
                      soundManager.playClick();
                      setAgeGroup(grp.id);
                    }}
                    className={`h-8 rounded-xl text-[10px] sm:text-[11px] font-hud font-black border transition-all cursor-pointer ${
                      ageGroup === grp.id
                        ? 'bg-emerald-400 text-slate-950 border-white shadow'
                        : 'bg-slate-900/90 text-slate-200 border-slate-700 hover:border-cyan-400'
                    }`}
                  >
                    {grp.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
