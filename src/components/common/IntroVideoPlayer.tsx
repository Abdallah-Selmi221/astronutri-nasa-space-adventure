import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Globe, Rocket, Sparkles, User, Volume2 } from 'lucide-react';
import { useGameState } from '../../context/GameContext';
import { buildSpaceFitXCharacter } from '../three/buildSpaceFitXCharacter';
import gsap from 'gsap';
import { createCosmicSkyBackdrop } from '../three/archipelagoPrimitives';
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
    en: '🤖 Robo: "Welcome Cadet! Launching camera into AstroNutri Orbital Academy..."',
    ar: '🤖 روبو: "أهلاً بك يا بطل! نطير الآن إلى أكاديمية أسترونوتري المدارية..."'
  },
  {
    atSec: 1.7,
    en: '👨‍🚀 SPACE-FIT X: "4 Space Nodes, 14 Stations & Real NASA DONKI / NeoWs / OSDR Data!"',
    ar: '👨‍🚀 بدلة SPACE-FIT X: "4 مراحل فضائية و14 محطة موجهة ببيانات ناسا الحقيقية!"'
  },
  {
    atSec: 3.4,
    en: '🌙 Ready for Liftoff: "Pick your language, age group & hit Start Adventure!"',
    ar: '🌙 جاهز للإقلاع: "اختر لغتك وفئتك العمرية واضغط ابدأ المغامرة!"'
  }
];

export const IntroVideoPlayer: React.FC<IntroVideoPlayerProps> = ({ onComplete }) => {
  const { state, language, ageGroup, setLanguage, setAgeGroup, setCadetName } = useGameState();
  const [nameInput, setNameInput] = useState<string>(state.cadetName || 'Explorer');
  const [cutsceneElapsed, setCutsceneElapsed] = useState<number>(0);
  const [beatIdx, setBeatIdx] = useState<number>(0);
  const canvasHostRef = useRef<HTMLDivElement | null>(null);

  // 5-second in-engine 3D orbital fly-in cutscene (zero MP4 video download)
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
    const camera = new THREE.PerspectiveCamera(46, w / h, 0.1, 160);
    camera.position.set(5.4, 3.6, 9.6);

    const sky = createCosmicSkyBackdrop(scene, 'nebula');
    const hemi = new THREE.HemisphereLight(0xe0f2fe, 0x0f172a, 1.15);
    const sun = new THREE.DirectionalLight(0xfffbeb, 1.55);
    sun.position.set(6, 10, 7);
    scene.add(hemi, sun);

    const orbitalDeck = new THREE.Group();
    const deckMat = new THREE.MeshStandardMaterial({
      color: 0x162238,
      metalness: 0.55,
      roughness: 0.35
    });
    const deckBase = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.5, 0.36, 36), deckMat);
    deckBase.position.y = -0.18;
    const dockRing = new THREE.Mesh(
      new THREE.TorusGeometry(4.22, 0.08, 12, 48),
      new THREE.MeshBasicMaterial({ color: 0x22d3ee })
    );
    dockRing.rotation.x = Math.PI / 2;
    const innerRing = new THREE.Mesh(
      new THREE.TorusGeometry(2.3, 0.045, 10, 40),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.72 })
    );
    innerRing.rotation.x = Math.PI / 2;
    innerRing.position.y = 0.02;
    const moonBackdrop = new THREE.Mesh(
      new THREE.SphereGeometry(2.1, 20, 14),
      new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.85, metalness: 0.08 })
    );
    moonBackdrop.position.set(-7.5, 4.2, -13);
    const earthBackdrop = new THREE.Mesh(
      new THREE.SphereGeometry(3.4, 24, 16),
      new THREE.MeshStandardMaterial({
        color: 0x1d4ed8,
        emissive: 0x075985,
        emissiveIntensity: 0.35,
        roughness: 0.65
      })
    );
    earthBackdrop.position.set(8.8, 3.8, -16);
    orbitalDeck.add(deckBase, dockRing, innerRing, moonBackdrop, earthBackdrop);
    orbitalDeck.position.set(0, -0.35, 0);
    scene.add(orbitalDeck);

    // Smooth GSAP camera fly-in target
    const introCamProxy = { x: 5.8, y: 4.1, z: 10.4 };
    const camTween = gsap.to(introCamProxy, {
      x: 1.35,
      y: 1.85,
      z: 5.1,
      duration: 4.8,
      ease: 'power3.out'
    });

    // Mini showcase ringed planet in skyline
    const planetGroup = new THREE.Group();
    const planetBody = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.15, 2),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.45, metalness: 0.15, flatShading: true })
    );
    const planetRing = new THREE.Mesh(
      new THREE.RingGeometry(1.5, 2.05, 28),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.72 })
    );
    planetRing.rotation.x = Math.PI * 0.36;
    planetGroup.add(planetBody, planetRing);
    planetGroup.position.set(-4.8, 3.3, -6.5);
    scene.add(planetGroup);

    // 3D SPACE-FIT X Astronaut + built-in hovering Robo companion
    const hero = buildSpaceFitXCharacter();
    hero.group.position.set(0, 0, 0.35);
    hero.group.scale.setScalar(1.22);
    scene.add(hero.group);

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

      // Update React subtitle beat cleanly only when transitioning threshold
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
      planetGroup.rotation.y = elapsed * 0.28;
      hero.update({
        t: elapsed,
        moveSpeed: 0,
        emote: elapsed < 3.4 ? 'wave' : 'celebrate',
        suitState: state.campaign?.spaceFitX
      });
      hero.group.rotation.y = Math.sin(elapsed * 0.6) * 0.28;

      // GSAP-driven fly-in + gentle post-arrival orbit sway
      const idleSway = Math.max(0, elapsed - 4.8) * 0.25;
      const camX = introCamProxy.x + Math.sin(idleSway) * 0.45;
      const camY = introCamProxy.y;
      const camZ = introCamProxy.z;
      dockRing.rotation.z = elapsed * 0.16;
      camera.position.set(camX, camY, camZ);
      camera.lookAt(0, 1.15, 0.2);

      renderer?.render(scene, camera);
    };
    rafId = requestAnimationFrame(tick);

    return () => {
      camTween.kill();
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
      sky.dispose();
      hero.dispose();
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

    // Immediate synchronous UI transition (0 ms delay)
    onComplete();

    // Non-blocking background audio & Web Speech greeting
    window.setTimeout(() => {
      try {
        soundManager.playFanfare();
      } catch {
        // ignore un-unlocked AudioContext
      }
      speakWebSpeechNonBlocking(
        language === 'ar'
          ? `أهلاً بك يا ${cleanedName}! انطلق في مهمة أسترونوتري من الأرض إلى القمر!`
          : `Welcome Cadet ${cleanedName}! Launching into the Earth-to-Moon Space Map!`,
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
        ? 'مرحباً بك في أكاديمية ناسا أسترونوتري! اختر لغتك واضغط ابدأ المغامرة للانطلاق إلى الفضاء.'
        : 'Welcome to AstroNutri NASA Space Academy! Choose your profile and tap Start Adventure to explore the Earth-to-Moon space missions.';
    speakWebSpeechNonBlocking(text, language);
  };

  const currentBeat = CUTSCENE_BEATS[beatIdx] || CUTSCENE_BEATS[0];

  return (
    <div
      data-testid="intro-welcome-screen"
      dir={language === 'ar' ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-50 bg-[#04091a] flex flex-col justify-between scrollable-panel select-none"
    >
      {/* Live 5-Second In-Engine 3D Orbital Cutscene Backdrop */}
      <div
        ref={canvasHostRef}
        data-testid="intro-3d-cutscene-canvas"
        className="fixed inset-0 w-full h-full z-0 pointer-events-none"
      />
      <div className="fixed inset-0 bg-gradient-to-t from-[#030712]/90 via-transparent to-[#030712]/70 pointer-events-none z-0" />

      {/* Top Bar: AstroNutri Brand + Prominent EN / AR Language Toggle + Voice Button */}
      <div className="relative z-10 w-full max-w-5xl mx-auto px-3 pt-3 sm:px-6 sm:pt-5 flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-950/80 border-2 border-cyan-300/80 backdrop-blur-md shadow-lg">
          <Sparkles className="w-4 h-4 text-yellow-300" />
          <span className="font-hud font-black text-xs sm:text-base text-white tracking-wide">
            {tr(language, 'AstroNutri • NASA Space Apps Edition', 'أسترونوتري • تحدي ناسا لتطبيقات الفضاء')}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleHearCutsceneVoice}
            className="px-3 py-1.5 rounded-full bg-slate-950/80 hover:bg-slate-800 border-2 border-amber-300/70 text-amber-200 font-hud font-black text-xs flex items-center gap-1.5 cursor-pointer backdrop-blur-md"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{tr(language, 'Voice Intro', 'اسمع الترحيب')}</span>
          </button>

          {/* First-Screen EN / AR Language Selector */}
          <div
            data-testid="intro-language-toggle"
            className="inline-flex items-center gap-1 p-1 rounded-full bg-slate-950/85 border-2 border-cyan-400/80 backdrop-blur-md shadow-lg"
          >
            <Globe className="w-3.5 h-3.5 text-cyan-300 mx-1" />
            <button
              type="button"
              data-testid="intro-lang-en"
              onClick={() => {
                soundManager.playClick();
                setLanguage('en');
              }}
              className={`px-3 py-1 rounded-full text-xs font-hud font-black transition-all cursor-pointer ${
                language === 'en' ? 'bg-cyan-400 text-slate-950 shadow' : 'text-slate-200 hover:text-white'
              }`}
            >
              {tr(language, 'EN', 'الإنجليزية')}
            </button>
            <button
              type="button"
              data-testid="intro-lang-ar"
              onClick={() => {
                soundManager.playClick();
                setLanguage('ar');
              }}
              className={`px-3 py-1 rounded-full text-xs font-hud font-black transition-all cursor-pointer ${
                language === 'ar' ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-200 hover:text-white'
              }`}
            >
              {tr(language, 'Arabic', 'العربية')}
            </button>
          </div>
        </div>
      </div>

      {/* Animated 5-Second 3D Cutscene Subtitle Bubble */}
      <div className="relative z-10 w-full max-w-2xl mx-auto px-4 mt-2 flex flex-col items-center gap-2 pointer-events-none">
        <div
          data-testid="intro-cutscene-subtitle"
          className="px-4 py-2.5 rounded-2xl bg-slate-950/80 border-2 border-cyan-300/85 backdrop-blur-md text-center shadow-2xl"
        >
          <p className="font-hud font-black text-xs sm:text-sm text-white leading-relaxed">
            {tr(language, currentBeat.en, currentBeat.ar)}
          </p>
          <div className="mt-1.5 flex items-center justify-center gap-2 text-[10px] font-mono text-cyan-300">
            <span>{tr(language, '3D FLY-IN CUTSCENE', 'مشهد طيران ثلاثي الأبعاد')}</span>
            <div className="w-24 h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 to-amber-400 transition-all duration-150"
                style={{ width: `${Math.min(100, (cutsceneElapsed / 5) * 100)}%` }}
              />
            </div>
            <span>{Math.min(5, Math.round(cutsceneElapsed))}/5s</span>
          </div>
        </div>
      </div>

      {/* Bottom Compact Onboarding Setup & Instant Start CTA (Leaves center 3D Astronaut clearly visible!) */}
      <div className="relative z-10 w-full max-w-xl mx-auto px-3 pb-4 sm:pb-6 mt-auto">
        <div className="rounded-3xl bg-slate-950/88 border-2 border-cyan-400/80 backdrop-blur-md p-4 sm:p-5 shadow-[0_14px_45px_rgba(6,182,212,0.45)] space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h1 className="font-hud font-black text-base sm:text-xl text-white">
                {tr(language, 'Cadet Mission Profile', 'ملف رائد الفضاء الصغير')}
              </h1>
              <p className="font-hud text-[11px] sm:text-xs text-cyan-200 font-bold">
                {tr(
                  language,
                  'Adapts mission hints & NASA briefings to your explorer level',
                  'تُخصّص تلميحات ناسا وشرح روبو حسب اسمك وفئتك العمرية'
                )}
              </p>
            </div>
            <span className="self-start sm:self-auto px-2.5 py-1 rounded-full bg-emerald-950/90 border border-emerald-400/70 text-[10px] font-hud font-black text-emerald-200 whitespace-nowrap">
              {tr(language, '4 Space Nodes • 14 Stations', '4 مراحل فضائية • 14 محطة')}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Cadet Name */}
            <label className="block space-y-1">
              <span className="text-[11px] font-hud font-black text-slate-300 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-cyan-300" />
                <span>{tr(language, 'Cadet Name', 'الاسم')}</span>
              </span>
              <input
                type="text"
                data-testid="onboarding-name-input"
                maxLength={20}
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder={tr(language, 'Enter your name...', 'اكتب اسمك هنا...')}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border-2 border-slate-700 focus:border-cyan-400 text-white text-xs sm:text-sm font-hud font-bold outline-none"
              />
            </label>

            {/* Age Group */}
            <div className="space-y-1">
              <span className="text-[11px] font-hud font-black text-slate-300 block">
                {tr(language, 'Age Group (Hint Simplicity)', 'الفئة العمرية')}
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    { id: '7-10', label: '7-10 🌱' },
                    { id: '11-14', label: '11-14 🚀' },
                    { id: '15+', label: '15+ 🛰️' }
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
                    className={`py-2 px-1.5 rounded-xl text-[11px] sm:text-xs font-hud font-black border-2 transition-all cursor-pointer ${
                      ageGroup === grp.id
                        ? 'bg-emerald-400 text-slate-950 border-white shadow'
                        : 'bg-slate-900 text-slate-200 border-slate-700 hover:border-cyan-400'
                    }`}
                  >
                    {grp.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            type="button"
            data-testid="start-adventure-btn"
            onClick={handleInstantStart}
            className="w-full btn-chunky-adventure py-3.5 px-6 text-lg sm:text-xl flex items-center justify-center gap-2.5 shadow-[0_10px_28px_rgba(255,159,28,0.65)] cursor-pointer touch-manipulation active:scale-95 transition-transform"
          >
            <Rocket className="w-6 h-6" />
            <span>{tr(language, 'Start Adventure', 'ابدأ المغامرة')}</span>
            <span>🚀</span>
          </button>

          <div className="sm:hidden text-center text-[10px] font-hud font-bold text-cyan-200/85 pt-0.5">
            {tr(
              language,
              '📱 Tip: Rotate to Landscape for best 3D play • Left thumb moves • Right thumb turns camera',
              '📱 نصيحة: لف الموبايل بالعرض لأفضل تجربة 3D • اليسار للحركة • اليمين للكاميرا'
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
