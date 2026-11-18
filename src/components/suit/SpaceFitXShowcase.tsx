import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { SpaceFitXState } from '../../types/game';
import { buildSpaceFitXCharacter } from '../three/buildSpaceFitXCharacter';
import { SpaceFitXControlsHUD } from './SpaceFitXControlsHUD';
import { initialSpaceFitXState, useGameState } from '../../context/GameContext';
import { soundManager } from '../../utils/sound';
import { tr } from '../../utils/i18n';
import { RotateCw, ShieldCheck, Sparkles, X } from 'lucide-react';

interface SpaceFitXShowcaseProps {
  isOpen: boolean;
  suitState?: SpaceFitXState;
  onChangeSuitState: (next: SpaceFitXState) => void;
  onClose: () => void;
}

type ViewAngle = 'front' | 'rear' | 'left' | 'right';

const MODULE_DESCRIPTIONS = [
  {
    id: 1,
    num: '01',
    titleEn: '01 • Smart Compression',
    titleAr: '01 • الضغط الذكي المتدرج',
    descEn: 'Graduated compression panels & pressure sensors supporting blood flow without restricting motion.',
    descAr: 'حساسات ضغط ومناطق شدّ لدعم الدورة الدموية دون كبت الحركة.'
  },
  {
    id: 2,
    num: '02',
    titleEn: '02 • Independent Resistance',
    titleAr: '02 • مقاومة مستقلة للمفاصل',
    descEn: 'Calibrated cable pulleys across shoulders, elbows, hips, knees & ankles for 0G strength training.',
    descAr: 'كابلات مقاومة على الكتفين والمرفقين والوركين والركبتين والكاحلين.'
  },
  {
    id: 3,
    num: '03',
    titleEn: '03 • Impact Protection',
    titleAr: '03 • وسائد حماية سداسية',
    descEn: 'Flexible hexagonal TPU shock pads shielding joints and spine from cabin wall bumps in 0G.',
    descAr: 'بطانات TPU مرنة لحماية المفاصل والعمود الفقري من ارتطام الجدار في 0G.'
  },
  {
    id: 4,
    num: '04',
    titleEn: '04 • Emergency Response',
    titleAr: '04 • الاستجابة السريعة للطوارئ',
    descEn: 'Instant Quick-Release lever freeing all resistance cables paired with a trauma first-aid pouch.',
    descAr: 'زر إطلاق سريع لفك المقاومة فوراً مع حقيبة إسعافات طبية.'
  },
  {
    id: 5,
    num: '05',
    titleEn: '05 • Physiological Monitoring',
    titleAr: '05 • المراقبة الفسيولوجية',
    descEn: 'Live sensors tracking heart rate, skin temperature, muscle load & joint flexion angles.',
    descAr: 'حساسات لقياس نبض القلب وحرارة الجلد وحمل العضلات وزوايا المفاصل.'
  },
  {
    id: 6,
    num: '06',
    titleEn: '06 • Personal Dosimeter',
    titleAr: '06 • مقياس الإشعاع الشخصي',
    descEn: 'Real-time & cumulative dose monitor (experimental tracking only—not a full radiation shield).',
    descAr: 'مؤشر للجرعة الحالية والتراكمية (مراقبة وبحث جزئي — ليس درعاً كاملاً).'
  },
  {
    id: 7,
    num: '07',
    titleEn: '07 • Energy & Harvesting',
    titleAr: '07 • حزمة الطاقة والحصاد الحركي',
    descEn: 'Swappable dorsal battery pack partially recharging via kinetic motion during workouts.',
    descAr: 'بطارية خلفية قابلة للفك تشحن جزئياً عبر الطاقة الحركية أثناء التمرين.'
  }
];

const VIEW_ANGLES: Record<ViewAngle, number> = {
  front: 0,
  right: Math.PI / 2,
  rear: Math.PI,
  left: -Math.PI / 2
};

export const SpaceFitXShowcase: React.FC<SpaceFitXShowcaseProps> = ({
  isOpen,
  suitState,
  onChangeSuitState,
  onClose
}) => {
  const { language } = useGameState();
  const langDir = language === 'ar' ? 'rtl' : 'ltr';
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [viewAngle, setViewAngle] = useState<ViewAngle>('front');
  const [highlightModule, setHighlightModule] = useState<number | null>(null);
  const [tabMode, setTabMode] = useState<'interactive3d' | 'renderSheet'>('interactive3d');
  const [webglFailed, setWebglFailed] = useState(false);

  const yawTargetRef = useRef<number>(0);
  const dragActiveRef = useRef(false);
  const lastXRef = useRef(0);
  const effectiveSuit = suitState || initialSpaceFitXState;
  const suitStateRef = useRef<SpaceFitXState>(effectiveSuit);
  const highlightRef = useRef<number | null>(highlightModule);
  suitStateRef.current = effectiveSuit;
  highlightRef.current = highlightModule;

  useEffect(() => {
    yawTargetRef.current = VIEW_ANGLES[viewAngle];
  }, [viewAngle]);

  useEffect(() => {
    if (!isOpen || tabMode !== 'interactive3d') return;
    const container = mountRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer | null = null;
    let rafId = 0;

    try {
      const width = Math.max(container.clientWidth || 360, 260);
      const height = Math.max(container.clientHeight || 380, 260);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 60);
      camera.position.set(0, 1.45, 4.1);
      camera.lookAt(0, 1.15, 0);

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      container.innerHTML = '';
      container.appendChild(renderer.domElement);

      scene.add(new THREE.AmbientLight(0xdbeafe, 1.05));
      const key = new THREE.DirectionalLight(0xffffff, 1.85);
      key.position.set(4, 7, 5);
      scene.add(key);
      const rim = new THREE.DirectionalLight(0x22d3ee, 1.1);
      rim.position.set(-4, 4, -5);
      scene.add(rim);

      // Sleek holographic pedestal
      const pedestal = new THREE.Mesh(
        new THREE.CylinderGeometry(1.05, 1.18, 0.16, 32),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.65, roughness: 0.3 })
      );
      pedestal.position.y = -0.08;
      scene.add(pedestal);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.02, 0.03, 10, 48),
        new THREE.MeshBasicMaterial({ color: 0x22d3ee })
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.01;
      scene.add(ring);

      const character = buildSpaceFitXCharacter({
        showEvaHelmet: suitStateRef.current.helmetEnabled ?? true,
        showCompanion: true,
        scale: 1.05
      });
      scene.add(character.group);

      const clock = new THREE.Clock();
      let currentYaw = yawTargetRef.current;

      const animate = () => {
        rafId = requestAnimationFrame(animate);
        const t = clock.getElapsedTime();
        currentYaw += (yawTargetRef.current - currentYaw) * 0.12;
        character.group.rotation.y = currentYaw;
        character.update({
          t,
          moveSpeed: 0,
          suitState: suitStateRef.current,
          highlightModule: highlightRef.current
        });
        renderer?.render(scene, camera);
      };
      animate();

      const handleResize = () => {
        if (!container || !renderer) return;
        const w = Math.max(container.clientWidth || 360, 260);
        const h = Math.max(container.clientHeight || 380, 260);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };
      window.addEventListener('resize', handleResize);

      return () => {
        cancelAnimationFrame(rafId);
        window.removeEventListener('resize', handleResize);
        character.dispose();
        pedestal.geometry.dispose();
        (pedestal.material as THREE.Material).dispose();
        ring.geometry.dispose();
        (ring.material as THREE.Material).dispose();
        renderer?.dispose();
        if (renderer?.domElement && renderer.domElement.parentNode) {
          renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
      };
    } catch {
      setWebglFailed(true);
    }
  }, [isOpen, tabMode]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/90 backdrop-blur-lg"
      dir={langDir}
    >
      <div className="w-full max-w-6xl max-h-[92vh] overflow-y-auto rounded-[2rem] bg-slate-900 border-2 border-cyan-400/70 p-4 sm:p-6 text-white shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-hud font-black text-lg sm:text-2xl text-white">
                {tr(language, '🦺 SPACE-FIT X Suit (Prototype 1.0) — AstroNutri', '🦺 بدلة SPACE-FIT X — أسترونوتري')}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400 text-cyan-200 font-mono text-[11px] font-black">
                {tr(language, 'IVA COUNTERMEASURE GARMENT', 'بدلة تدريب داخلية ذكية')}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              {tr(
                language,
                '7-module smart intravehicular training & countermeasure suit (distinct from pressurized EVA spacewalk suits).',
                'بدلة تدريب وحماية ذكية داخل المحطة بـ 7 أنظمة متكاملة (وليست بدلة ضغط للسير الفضائي الخارجي).'
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTabMode('interactive3d')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer border ${
                tabMode === 'interactive3d'
                  ? 'bg-cyan-400 text-slate-950 border-white'
                  : 'bg-slate-800 text-slate-200 border-slate-700'
              }`}
            >
              {tr(language, 'Interactive 3D View', 'معاينة 3D تفاعلية')}
            </button>
            <button
              type="button"
              onClick={() => setTabMode('renderSheet')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer border ${
                tabMode === 'renderSheet'
                  ? 'bg-amber-400 text-slate-950 border-white'
                  : 'bg-slate-800 text-slate-200 border-slate-700'
              }`}
            >
              {tr(language, 'Design & Hardware Sheets', 'بطاقات التصميم والعتاد')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-rose-600 text-white flex items-center justify-center cursor-pointer"
              aria-label={tr(language, 'Close Suit Showcase', 'إغلاق معرض البدلة')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {tabMode === 'renderSheet' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-slate-950 border border-cyan-400/40 p-3 space-y-2">
              <img
                src="/assets/suit/space_fit_x_front_rear.jpg"
                alt={tr(language, 'AstroNutri SPACE-FIT X Front and Rear', 'منظور أمامي وخلفي لبدلة SPACE-FIT X')}
                className="w-full rounded-xl object-cover"
              />
              <div className="text-xs font-bold text-cyan-200">
                {tr(
                  language,
                  'Front & Rear Perspective — AstroNutri crest, personal dosimeter & dorsal kinetic battery pack',
                  'منظور أمامي وخلفي — شعار أسترونوتري ومقياس الجرعة وحزمة الطاقة الخلفية'
                )}
              </div>
            </div>
            <div className="rounded-2xl bg-slate-950 border border-indigo-400/40 p-3 space-y-2">
              <img
                src="/assets/suit/space_fit_x_hardware.jpg"
                alt={tr(language, 'AstroNutri SPACE-FIT X Hardware Modules', 'مكونات عتاد بدلة SPACE-FIT X')}
                className="w-full rounded-xl object-cover"
              />
              <div className="text-xs font-bold text-indigo-200">
                {tr(
                  language,
                  '4 Hardware Callouts: smart compression weave, quick-release cable reels, TPU hex pads & battery pack',
                  'تفاصيل المكونات الـ 4: نسيج الضغط الذكي، بكرات المقاومة والإفلات السريع، وسائد TPU السداسية، ووحدة البطارية'
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            {/* Left 5 Cols: Interactive 3D Viewer */}
            <div className="lg:col-span-5 space-y-3">
              <div
                onPointerDown={(e) => {
                  dragActiveRef.current = true;
                  lastXRef.current = e.clientX;
                }}
                onPointerMove={(e) => {
                  if (!dragActiveRef.current) return;
                  const dx = e.clientX - lastXRef.current;
                  lastXRef.current = e.clientX;
                  yawTargetRef.current += dx * 0.014;
                }}
                onPointerUp={() => {
                  dragActiveRef.current = false;
                }}
                onPointerLeave={() => {
                  dragActiveRef.current = false;
                }}
                className="relative h-[340px] sm:h-[390px] w-full rounded-3xl bg-gradient-to-b from-[#07152e] via-slate-950 to-[#061124] border-2 border-cyan-400/60 overflow-hidden cursor-grab active:cursor-grabbing"
              >
                <div ref={mountRef} className="w-full h-full" />
                {webglFailed && (
                  <img
                    src="/assets/suit/space_fit_x_front_rear.jpg"
                    alt="SPACE-FIT X"
                    className="w-full h-full object-contain p-2"
                  />
                )}
                <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-slate-950/85 border border-cyan-400/50 text-[11px] font-bold text-cyan-200 flex items-center gap-1">
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>{tr(language, 'Drag to Rotate Suit 360°', 'اسحب لتدوير البدلة 360°')}</span>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-1.5">
                {(['front', 'rear', 'left', 'right'] as ViewAngle[]).map((ang) => (
                  <button
                    key={ang}
                    type="button"
                    onClick={() => {
                      soundManager.playClick();
                      setViewAngle(ang);
                    }}
                    className={`py-2 rounded-xl text-xs font-black border cursor-pointer ${
                      viewAngle === ang
                        ? 'bg-cyan-400 text-slate-950 border-white'
                        : 'bg-slate-800 text-slate-200 border-slate-700 hover:border-cyan-400'
                    }`}
                  >
                    {ang === 'front'
                      ? tr(language, 'Front', 'أمامي')
                      : ang === 'rear'
                      ? tr(language, 'Rear', 'خلفي')
                      : ang === 'left'
                      ? tr(language, 'Left', 'يسار')
                      : tr(language, 'Right', 'يمين')}
                  </button>
                ))}
              </div>
            </div>

            {/* Right 7 Cols: 7 Module Selector + Live Controls */}
            <div className="lg:col-span-7 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {MODULE_DESCRIPTIONS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      soundManager.playClick();
                      setHighlightModule(highlightModule === m.id ? null : m.id);
                    }}
                    className={`p-2.5 rounded-2xl border ${language === 'ar' ? 'text-right' : 'text-left'} transition-all cursor-pointer ${
                      highlightModule === m.id
                        ? 'bg-cyan-950/80 border-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.3)]'
                        : 'bg-slate-950/80 border-slate-800 hover:border-cyan-500/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-hud font-black text-xs text-cyan-200">
                        {tr(language, m.titleEn, m.titleAr)}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">#{m.num}</span>
                    </div>
                    <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                      {tr(language, m.descEn, m.descAr)}
                    </p>
                  </button>
                ))}
              </div>

              <div className="p-2.5 rounded-2xl bg-sky-950/50 border border-sky-400/40 text-xs text-sky-100 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan-300 shrink-0" />
                <span>
                  <Sparkles className="w-3.5 h-3.5 inline mx-1 text-amber-300" />
                  {tr(
                    language,
                    'Adjust the sliders below to watch live 3D reactions on your suit (compression, cable resistance, release & battery)!',
                    'جرّب تحريك الأزرار بالأسفل لرؤية التفاعل المباشر على البدلة الـ 3D (ضغط ذكي، كابلات المقاومة، زر الإفلات، والبطارية)!'
                  )}
                </span>
              </div>

              {/* Real-Time 3D Astronaut Appearance Customizer (Saved Immediately to Profile) */}
              <div
                data-testid="astronaut-customizer-panel"
                className="p-3 rounded-2xl bg-slate-950/90 border-2 border-amber-400/45 space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-hud font-black text-xs text-amber-300">
                    {tr(language, '🎨 3D Astronaut Appearance Customizer', '🎨 تخصيص مظهر رائد الفضاء 3D')}
                  </span>
                  <span className="text-[10px] text-cyan-200 font-bold">
                    {tr(language, 'Auto-saved across all missions ✨', 'يُحفظ تلقائياً في جميع المراحل ✨')}
                  </span>
                </div>

                {/* 1. Helmet Visor Toggle */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    data-testid="customizer-helmet-eva"
                    onClick={() => {
                      soundManager.playClick();
                      onChangeSuitState({ ...effectiveSuit, helmetEnabled: true });
                    }}
                    className={`py-1.5 px-2.5 rounded-xl text-[11px] font-black border cursor-pointer ${
                      (effectiveSuit.helmetEnabled ?? true)
                        ? 'bg-cyan-400 text-slate-950 border-white'
                        : 'bg-slate-800 text-slate-200 border-slate-700'
                    }`}
                  >
                    {tr(language, '🪖 Gold Glass Space Helmet (EVA)', '🪖 خوذة الفضاء الزجاجية')}
                  </button>
                  <button
                    type="button"
                    data-testid="customizer-helmet-iva"
                    onClick={() => {
                      soundManager.playClick();
                      onChangeSuitState({ ...effectiveSuit, helmetEnabled: false });
                    }}
                    className={`py-1.5 px-2.5 rounded-xl text-[11px] font-black border cursor-pointer ${
                      effectiveSuit.helmetEnabled === false
                        ? 'bg-amber-400 text-slate-950 border-white'
                        : 'bg-slate-800 text-slate-200 border-slate-700'
                    }`}
                  >
                    {tr(language, '🎧 Command Comms Headset (IVA)', '🎧 سماعة القيادة بدون خوذة')}
                  </button>
                </div>

                {/* 2. 4 Suit Themes */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {(
                    [
                      { id: 'cyan_black', labelEn: 'SPACE-FIT X', labelAr: 'أزرق سماوي', dot: 'bg-cyan-400' },
                      { id: 'nasa_white', labelEn: 'NASA White', labelAr: 'أبيض ناسا', dot: 'bg-blue-400' },
                      { id: 'gold_emerald', labelEn: 'Emerald Gold', labelAr: 'ذهبي زمردي', dot: 'bg-emerald-400' },
                      { id: 'mars_crimson', labelEn: 'Mars Crimson', labelAr: 'المريخ القرمزي', dot: 'bg-rose-400' }
                    ] as const
                  ).map((th) => {
                    const active = (effectiveSuit.suitTheme ?? 'cyan_black') === th.id;
                    return (
                      <button
                        key={th.id}
                        type="button"
                        data-testid={`customizer-theme-${th.id}`}
                        onClick={() => {
                          soundManager.playClick();
                          onChangeSuitState({ ...effectiveSuit, suitTheme: th.id });
                        }}
                        className={`py-1.5 px-2 rounded-xl text-[10px] font-black border flex items-center justify-center gap-1.5 cursor-pointer ${
                          active
                            ? 'bg-sky-400 text-slate-950 border-white shadow-[0_0_12px_rgba(56,189,248,0.45)]'
                            : 'bg-slate-900 text-slate-200 border-slate-700 hover:border-cyan-400'
                        }`}
                      >
                        <span className={`w-2.5 h-2.5 rounded-full ${th.dot} border border-white/70 shrink-0`} />
                        <span className="truncate">{tr(language, th.labelEn, th.labelAr)}</span>
                      </button>
                    );
                  })}
                </div>

                {/* 3. Backpack Gear */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    data-testid="customizer-pack-eclss"
                    onClick={() => {
                      soundManager.playClick();
                      onChangeSuitState({ ...effectiveSuit, backpackStyle: 'eclss' });
                    }}
                    className={`py-1.5 px-2.5 rounded-xl text-[11px] font-black border cursor-pointer ${
                      (effectiveSuit.backpackStyle ?? 'eclss') === 'eclss'
                        ? 'bg-emerald-400 text-slate-950 border-white'
                        : 'bg-slate-800 text-slate-200 border-slate-700'
                    }`}
                  >
                    {tr(language, '🫧 ECLSS Life Pack', '🫧 حقيبة الحياة المعاد تدويرها')}
                  </button>
                  <button
                    type="button"
                    data-testid="customizer-pack-thruster"
                    onClick={() => {
                      soundManager.playClick();
                      onChangeSuitState({ ...effectiveSuit, backpackStyle: 'thruster' });
                    }}
                    className={`py-1.5 px-2.5 rounded-xl text-[11px] font-black border cursor-pointer ${
                      effectiveSuit.backpackStyle === 'thruster'
                        ? 'bg-amber-400 text-slate-950 border-white'
                        : 'bg-slate-800 text-slate-200 border-slate-700'
                    }`}
                  >
                    {tr(language, '🚀 Zero-G Thruster Pack', '🚀 حقيبة نفاثات انعدام الوزن')}
                  </button>
                </div>
              </div>

              {/* Studio Concept & Hardware Quick-Inspect Preview Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playClick();
                    setTabMode('renderSheet');
                  }}
                  className={`group rounded-2xl bg-slate-950/90 hover:bg-slate-900 border-2 border-cyan-400/45 hover:border-cyan-300 p-2 ${language === 'ar' ? 'text-right' : 'text-left'} transition-all cursor-pointer flex items-center gap-2.5`}
                >
                  <img
                    src="/assets/suit/space_fit_x_front_rear.jpg"
                    alt="SPACE-FIT X Front and Rear"
                    className="w-16 h-14 rounded-xl object-cover shrink-0 border border-white/15 group-hover:scale-105 transition-transform"
                  />
                  <div className="min-w-0">
                    <div className="font-hud font-black text-xs text-cyan-200 truncate">
                      {tr(language, 'Studio Blueprint View', 'منظور التصميم الهندسي')}
                    </div>
                    <div className="text-[10px] text-slate-300 leading-snug mt-0.5">
                      {tr(
                        language,
                        'Full front & rear AstroNutri crest & IVA layout',
                        'عرض أمامي وخلفي كامل لشعار أسترونوتري والبدلة'
                      )}
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playClick();
                    setTabMode('renderSheet');
                  }}
                  className={`group rounded-2xl bg-slate-950/90 hover:bg-slate-900 border-2 border-indigo-400/45 hover:border-indigo-300 p-2 ${language === 'ar' ? 'text-right' : 'text-left'} transition-all cursor-pointer flex items-center gap-2.5`}
                >
                  <img
                    src="/assets/suit/space_fit_x_hardware.jpg"
                    alt="SPACE-FIT X Hardware Callouts"
                    className="w-16 h-14 rounded-xl object-cover shrink-0 border border-white/15 group-hover:scale-105 transition-transform"
                  />
                  <div className="min-w-0">
                    <div className="font-hud font-black text-xs text-indigo-200 truncate">
                      {tr(language, '7-Module Hardware Details', 'تفاصيل العتاد والـ 7 وحدات')}
                    </div>
                    <div className="text-[10px] text-slate-300 leading-snug mt-0.5">
                      {tr(
                        language,
                        'Tap to zoom compression, pulleys & kinetic pack diagrams',
                        'اضغط لتكبير مخططات الضغط، الكابلات، والبطارية'
                      )}
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Interactive Controls for all 7 modules */}
        <SpaceFitXControlsHUD
          suitState={suitState}
          onChange={onChangeSuitState}
          compact
          onHighlightModule={(idx) => setHighlightModule(idx)}
        />
      </div>
    </div>
  );
};
