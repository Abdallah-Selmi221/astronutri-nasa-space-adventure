import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { SpaceFitXState } from '../../types/game';
import { buildSpaceFitXCharacter } from '../three/buildSpaceFitXCharacter';
import { SpaceFitXControlsHUD } from './SpaceFitXControlsHUD';
import { initialSpaceFitXState } from '../../context/GameContext';
import { soundManager } from '../../utils/sound';
import { RotateCw, ShieldCheck, Sparkles, X } from 'lucide-react';

interface SpaceFitXShowcaseProps {
  isOpen: boolean;
  suitState?: SpaceFitXState;
  onChangeSuitState: (next: SpaceFitXState) => void;
  onClose: () => void;
}

type ViewAngle = 'front' | 'rear' | 'left' | 'right';

const MODULE_DESCRIPTIONS = [
  { id: 1, title: '01 • Smart Compression', titleAr: 'الضغط الذكي المتدرج', descAr: 'حساسات ضغط ومناطق شدّ لدعم الدورة الدموية دون كبت الحركة.' },
  { id: 2, title: '02 • Independent Resistance', titleAr: 'مقاومة مستقلة للمفاصل', descAr: 'كابلات مقاومة على الكتفين والمرفقين والوركين والركبتين والكاحلين.' },
  { id: 3, title: '03 • Impact Protection', titleAr: 'وسائد حماية سداسية', descAr: 'بطانات TPU مرنة لحماية المفاصل والعمود الفقري من ارتطام الجدار في 0G.' },
  { id: 4, title: '04 • Emergency Response', titleAr: 'الاستجابة السريعة للطوارئ', descAr: 'زر Quick-Release لفك المقاومة فوراً مع حقيبة إسعافات طبية.' },
  { id: 5, title: '05 • Physiological Monitoring', titleAr: 'المراقبة الفسيولوجية', descAr: 'حساسات لقياس نبض القلب وحرارة الجلد وحمل العضلات وزوايا المفاصل.' },
  { id: 6, title: '06 • Personal Dosimeter', titleAr: 'مقياس الإشعاع الشخصي', descAr: 'مؤشر للجرعة الحالية والتراكمية (مراقبة وبحث جزئي — ليس درعاً كاملاً).' },
  { id: 7, title: '07 • Energy & Harvesting', titleAr: 'حزمة الطاقة والحصاد الحركي', descAr: 'بطارية خلفية قابلة للفك تشحن جزئياً عبر الطاقة الحركية أثناء التمرين.' }
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
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [viewAngle, setViewAngle] = useState<ViewAngle>('front');
  const [highlightModule, setHighlightModule] = useState<number | null>(null);
  const [tabMode, setTabMode] = useState<'interactive3d' | 'renderSheet'>('interactive3d');
  const [webglFailed, setWebglFailed] = useState(false);

  const yawTargetRef = useRef<number>(0);
  const dragActiveRef = useRef(false);
  const lastXRef = useRef(0);
  const suitStateRef = useRef<SpaceFitXState>(suitState || initialSpaceFitXState);
  const highlightRef = useRef<number | null>(highlightModule);
  suitStateRef.current = suitState || initialSpaceFitXState;
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
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
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

      const character = buildSpaceFitXCharacter({ showEvaHelmet: false, scale: 1.05 });
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
      dir="rtl"
    >
      <div className="w-full max-w-6xl max-h-[92vh] overflow-y-auto rounded-[2rem] bg-slate-900 border-2 border-cyan-400/70 p-4 sm:p-6 text-white shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-hud font-black text-lg sm:text-2xl text-white">
                🦺 بدلة SPACE-FIT X (Prototype 1.0) — AstroNutri
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400 text-cyan-200 font-mono text-[11px] font-black">
                IVA COUNTERMEASURE GARMENT
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              بدلة تدريب وحماية ذكية داخل المحطة بـ 7 أنظمة متكاملة (وليست بدلة ضغط للسير الفضائي EVA).
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
              معاينة 3D تفاعلية
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
              بطاقات التصميم والعتاد
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-rose-600 text-white flex items-center justify-center cursor-pointer"
              aria-label="إغلاق معرض البدلة"
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
                alt="AstroNutri SPACE-FIT X Front and Rear"
                className="w-full rounded-xl object-cover"
              />
              <div className="text-xs font-bold text-cyan-200">
                منظور أمامي وخلفي — شعار AstroNutri ومقياس الجرعة وحزمة الطاقة الخلفية
              </div>
            </div>
            <div className="rounded-2xl bg-slate-950 border border-indigo-400/40 p-3 space-y-2">
              <img
                src="/assets/suit/space_fit_x_hardware.jpg"
                alt="AstroNutri SPACE-FIT X Hardware Modules"
                className="w-full rounded-xl object-cover"
              />
              <div className="text-xs font-bold text-indigo-200">
                تفاصيل المكونات الـ 4: نسيج الضغط الذكي، بكرات المقاومة والإفلات السريع، وسائد TPU السداسية، ووحدة البطارية
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
                  <span>اسحب لتدوير البدلة 360°</span>
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
                    {ang === 'front' ? 'أمامي' : ang === 'rear' ? 'خلفي' : ang === 'left' ? 'يسار' : 'يمين'}
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
                    className={`p-2.5 rounded-2xl border text-right transition-all cursor-pointer ${
                      highlightModule === m.id
                        ? 'bg-cyan-950/80 border-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.3)]'
                        : 'bg-slate-950/80 border-slate-800 hover:border-cyan-500/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-hud font-black text-xs text-cyan-200">{m.titleAr}</span>
                      <span className="text-[10px] font-mono text-slate-400">{m.title.split('•')[0]}</span>
                    </div>
                    <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">{m.descAr}</p>
                  </button>
                ))}
              </div>

              <div className="p-2.5 rounded-2xl bg-sky-950/50 border border-sky-400/40 text-xs text-sky-100 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan-300 shrink-0" />
                <span>
                  <Sparkles className="w-3.5 h-3.5 inline ml-1 text-amber-300" />
                  جرّب تحريك الأزرار بالأسفل لرؤية التفاعل المباشر على البدلة الـ 3D (ضغط ذكي، كابلات المقاومة، زر الإفلات، والبطارية)!
                </span>
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
