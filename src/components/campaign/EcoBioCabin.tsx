import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { CampaignLevelId, CampaignProgressState } from '../../types/game';
import {
  DAILY_REFERENCE_ASSUMPTIONS,
  ISS_WATER_MILESTONE,
  SCIENCE_BADGES
} from '../../data/science';
import { EGYPTIAN_SINAI_SPACE_FOODS } from '../../data/foodItems';
import { soundManager } from '../../utils/sound';
import { dialogueManager } from '../../utils/geminiTTS';
import {
  CheckCircle2,
  Droplets,
  FlaskConical,
  Lightbulb,
  Recycle,
  ShieldAlert,
  Sprout
} from 'lucide-react';

interface EcoBioCabinProps {
  levelId: CampaignLevelId;
  campaign: CampaignProgressState;
  onUpdateCampaign: (patch: Partial<CampaignProgressState>) => void;
  onClose?: () => void;
}

const HYDROPONIC_CROPS = EGYPTIAN_SINAI_SPACE_FOODS.filter(
  (f) => f.originTag === 'hydroponic'
);

export const EcoBioCabin: React.FC<EcoBioCabinProps> = ({
  levelId,
  campaign,
  onUpdateCampaign,
  onClose
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [webglFailed, setWebglFailed] = useState(false);

  const [ledOn, setLedOn] = useState<boolean>(Boolean(campaign.ecoLedActive));
  const [spectrumRatio, setSpectrumRatio] = useState<number>(68);
  const [nutrientOn, setNutrientOn] = useState<boolean>(Boolean(campaign.ecoNutrientOk));
  const [waterLoopOn, setWaterLoopOn] = useState<boolean>(Boolean(campaign.ecoWaterRecyclingOk));
  const [harvested, setHarvested] = useState<string[]>(campaign.ecoCropsHarvested || []);
  const [showSpirulinaLab, setShowSpirulinaLab] = useState(false);
  const [spirulinaParams, setSpirulinaParams] = useState({
    light: true,
    co2: true,
    phOk: true
  });

  // Shared refs for live 3D reactive updates without recreating renderer
  const liveStateRef = useRef({ ledOn, nutrientOn, waterLoopOn, spectrumRatio });
  liveStateRef.current = { ledOn, nutrientOn, waterLoopOn, spectrumRatio };

  const optimalSpectrum = spectrumRatio >= 55 && spectrumRatio <= 85;
  const growthScore =
    (ledOn && optimalSpectrum ? 35 : ledOn ? 20 : 5) +
    (nutrientOn ? 35 : 5) +
    (waterLoopOn ? 30 : 5);

  const syncEcoPatch = (nextLed: boolean, nextNut: boolean, nextWater: boolean, nextHarvest?: string[]) => {
    onUpdateCampaign({
      ecoLedActive: nextLed,
      ecoNutrientOk: nextNut,
      ecoWaterRecyclingOk: nextWater,
      ...(nextHarvest ? { ecoCropsHarvested: nextHarvest } : {})
    });
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer | null = null;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(container.clientWidth || 640, container.clientHeight || 280);
      renderer.shadowMap.enabled = false;
      container.innerHTML = '';
      container.appendChild(renderer.domElement);
    } catch {
      setWebglFailed(true);
      return;
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#071324');

    const camera = new THREE.PerspectiveCamera(
      40,
      (container.clientWidth || 640) / (container.clientHeight || 280),
      0.1,
      60
    );
    camera.position.set(0, 3.6, 8.2);
    camera.lookAt(0, 0.7, 0);

    const ambient = new THREE.AmbientLight(0xdbeafe, 0.75);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.0);
    keyLight.position.set(3, 6, 4);
    scene.add(keyLight);

    const ledPointLight = new THREE.PointLight(0xe879f9, 0.4, 14);
    ledPointLight.position.set(0, 2.5, 0.4);
    scene.add(ledPointLight);

    // Track disposable resources
    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];
    const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
      geometries.push(g);
      return g;
    };
    const trackMat = <T extends THREE.Material>(m: T): T => {
      materials.push(m);
      return m;
    };

    // Cabin Deck & Hydroponic Tray Base
    const deck = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(8.8, 0.3, 4.0)),
      trackMat(new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.7 }))
    );
    deck.position.y = -0.2;
    scene.add(deck);

    const tray = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(6.2, 0.55, 2.2)),
      trackMat(new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.4, roughness: 0.5 }))
    );
    tray.position.set(-0.5, 0.22, 0);
    scene.add(tray);

    // Overhead LED Grow Light Frame
    const frameMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.6 }));
    [-3.4, 2.4].forEach((xPos) => {
      const post = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.18, 2.6, 0.18)), frameMat);
      post.position.set(xPos, 1.35, 0);
      scene.add(post);
    });
    const ledBarMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xf0abfc,
        emissive: 0xa21caf,
        emissiveIntensity: 0.35
      })
    );
    const ledBar = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(6.0, 0.16, 0.55)), ledBarMat);
    ledBar.position.set(-0.5, 2.65, 0);
    scene.add(ledBar);

    // 3D Crop Groups: [0] Lettuce (كابوتشا), [1] Arugula (جرجير), [2] Turnip (لفت)
    const cropGroups: THREE.Group[] = [];

    // 1. Space Iceberg Lettuce (layered green spheres)
    const lettuceGrp = new THREE.Group();
    lettuceGrp.position.set(-2.3, 0.6, 0);
    for (let i = 0; i < 4; i++) {
      const leaf = new THREE.Mesh(
        trackGeo(new THREE.DodecahedronGeometry(0.32 - i * 0.04, 1)),
        trackMat(new THREE.MeshStandardMaterial({ color: i % 2 === 0 ? 0x4ade80 : 0x86efac, roughness: 0.65 }))
      );
      leaf.position.set(Math.cos(i * 1.5) * 0.16, 0.25 + i * 0.05, Math.sin(i * 1.5) * 0.14);
      lettuceGrp.add(leaf);
    }
    scene.add(lettuceGrp);
    cropGroups.push(lettuceGrp);

    // 2. Space Arugula (bushy upright leaves)
    const arugulaGrp = new THREE.Group();
    arugulaGrp.position.set(-0.5, 0.6, 0);
    for (let i = 0; i < 6; i++) {
      const blade = new THREE.Mesh(
        trackGeo(new THREE.ConeGeometry(0.14, 0.72, 6)),
        trackMat(new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.5 }))
      );
      blade.position.set(((i % 3) - 1) * 0.22, 0.35, Math.floor(i / 3) * 0.25 - 0.12);
      blade.rotation.z = ((i % 3) - 1) * -0.2;
      arugulaGrp.add(blade);
    }
    scene.add(arugulaGrp);
    cropGroups.push(arugulaGrp);

    // 3. Space Turnip & Greens (purple-white bulb + green shoots)
    const turnipGrp = new THREE.Group();
    turnipGrp.position.set(1.3, 0.6, 0);
    const bulb = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.32, 16, 12)),
      trackMat(new THREE.MeshStandardMaterial({ color: 0xc084fc, roughness: 0.4 }))
    );
    bulb.position.y = 0.2;
    turnipGrp.add(bulb);
    for (let i = 0; i < 3; i++) {
      const topLeaf = new THREE.Mesh(
        trackGeo(new THREE.ConeGeometry(0.13, 0.55, 6)),
        trackMat(new THREE.MeshStandardMaterial({ color: 0x22c55e }))
      );
      topLeaf.position.set((i - 1) * 0.16, 0.62, 0);
      topLeaf.rotation.z = (i - 1) * -0.25;
      turnipGrp.add(topLeaf);
    }
    scene.add(turnipGrp);
    cropGroups.push(turnipGrp);

    // Right-Side Nutrient & Recycled Water Tank
    const tankFluidMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.4,
        transparent: true,
        opacity: 0.75
      })
    );
    const tankShell = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.55, 0.55, 1.85, 16)),
      trackMat(new THREE.MeshStandardMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.25 }))
    );
    tankShell.position.set(3.25, 0.9, 0);
    scene.add(tankShell);

    const tankFluid = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.46, 0.46, 1.4, 16)),
      tankFluidMat
    );
    tankFluid.position.set(3.25, 0.7, 0);
    scene.add(tankFluid);

    // Closed-Loop Water Flow Droplet Ring
    const dropletMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0ea5e9, emissiveIntensity: 0.8 })
    );
    const droplets: THREE.Mesh[] = [];
    for (let i = 0; i < 6; i++) {
      const d = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.09, 10, 10)), dropletMat);
      scene.add(d);
      droplets.push(d);
    }

    let rafId = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      rafId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      const s = liveStateRef.current;

      // LED glow feedback
      ledBarMat.emissiveIntensity = s.ledOn ? 1.35 : 0.15;
      ledPointLight.intensity = s.ledOn ? 1.8 : 0.15;
      ledPointLight.color.setHex(s.spectrumRatio >= 55 ? 0xe879f9 : 0x38bdf8);

      // Tank fluid feedback
      tankFluidMat.color.setHex(s.nutrientOn ? 0x10b981 : 0x38bdf8);
      tankFluid.scale.y = s.nutrientOn ? 1.0 : 0.45;
      tankFluid.position.y = s.nutrientOn ? 0.72 : 0.38;

      // Plants smoothly grow according to subsystem health
      const targetScale =
        0.58 + (s.ledOn ? 0.26 : 0) + (s.nutrientOn ? 0.24 : 0) + (s.waterLoopOn ? 0.2 : 0);
      cropGroups.forEach((grp, idx) => {
        grp.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.08);
        grp.rotation.y = Math.sin(t * 0.6 + idx) * 0.12;
      });

      // Flowing water droplets along closed loop
      droplets.forEach((d, idx) => {
        d.visible = s.waterLoopOn;
        if (s.waterLoopOn) {
          const phase = ((t * 0.45 + idx / droplets.length) % 1) * Math.PI * 2;
          d.position.set(
            Math.cos(phase) * 2.9 + 0.35,
            0.35 + Math.abs(Math.sin(phase)) * 1.6,
            Math.sin(phase) * 0.45
          );
        }
      });

      renderer!.render(scene, camera);
    };
    animate();

    const onResize = () => {
      if (!container || !renderer) return;
      const w = container.clientWidth || 640;
      const h = container.clientHeight || 280;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      renderer?.dispose();
    };
  }, []);

  const handleToggleLed = () => {
    soundManager.playClick();
    const next = !ledOn;
    setLedOn(next);
    syncEcoPatch(next, nutrientOn, waterLoopOn);
  };

  const handleToggleNutrient = () => {
    soundManager.playDropSuccess();
    const next = !nutrientOn;
    setNutrientOn(next);
    syncEcoPatch(ledOn, next, waterLoopOn);
  };

  const handleToggleWater = () => {
    soundManager.playWaterRecycle();
    const next = !waterLoopOn;
    setWaterLoopOn(next);
    syncEcoPatch(ledOn, nutrientOn, next);
  };

  const handleHarvestCrop = (cropId: string, cropNameAr: string) => {
    if (growthScore < 75) {
      soundManager.playCautionBeep();
      dialogueManager.speak('شغّل إضاءة LED ومحلول المغذيات وإعادة تدوير الماء أولاً لتنمو المحاصيل المائية!');
      return;
    }
    if (harvested.includes(cropId)) return;
    soundManager.playCrystalSparkle();
    const next = [...harvested, cropId];
    setHarvested(next);
    syncEcoPatch(ledOn, nutrientOn, waterLoopOn, next);
    dialogueManager.speak(`تم حصاد ${cropNameAr} لدعم الفيتامينات والألياف مع الطعام المخزن!`);
  };

  return (
    <div className="rounded-3xl bg-slate-900/95 border-2 border-emerald-400/60 p-4 sm:p-5 space-y-4 shadow-2xl text-white" dir="rtl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400 flex items-center justify-center">
            <Sprout className="w-5 h-5 text-emerald-300" />
          </div>
          <div>
            <h3 className="font-hud font-black text-base sm:text-lg text-white">
              🌱 كابينة الزراعة المائية الذاتية (Eco-Bio Cabin — المستوى {levelId})
            </h3>
            <p className="text-xs text-emerald-200/90 font-bold">
              إنتاج مكمل للكابوتشا والجرجير واللفت الفضائي بنظام LED ومحلول NPK والمياه المغلقة
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-black border bg-emerald-950/80 border-emerald-400 text-emerald-200">
            {SCIENCE_BADGES.ISS_PROVEN.labelAr}
          </span>
          {onClose && (
            <button
              type="button"
              onClick={() => {
                soundManager.playClick();
                onClose();
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold border border-slate-600 cursor-pointer"
            >
              إغلاق ✕
            </button>
          )}
        </div>
      </div>

      {/* 3D Interactive Chamber Viewport (with clean 2.5D SVG fallback if WebGL unavailable) */}
      <div className="relative rounded-2xl overflow-hidden border-2 border-cyan-400/40 bg-[#071324] h-64 sm:h-72">
        {!webglFailed ? (
          <div ref={mountRef} className="w-full h-full" />
        ) : (
          <div className="w-full h-full flex items-center justify-around px-6 bg-gradient-to-b from-purple-950/50 to-slate-950">
            {HYDROPONIC_CROPS.map((c) => (
              <div key={c.id} className="flex flex-col items-center gap-2">
                <img src={c.svgAsset} alt={c.nameAr} className="w-20 h-20 object-contain" />
                <span className="text-xs font-black text-emerald-200">{c.nameAr}</span>
              </div>
            ))}
          </div>
        )}

        {/* Top-left Growth Progress Pill */}
        <div className="absolute top-3 left-3 px-3 py-1.5 rounded-2xl bg-slate-950/85 border border-emerald-400/50 text-xs font-black text-emerald-200 flex items-center gap-2">
          <span>صحة النمو الحيوي: {growthScore}%</span>
        </div>

        {/* Top-right Water Caveat Pill */}
        <div className="absolute top-3 right-3 px-3 py-1.5 rounded-2xl bg-slate-950/85 border border-cyan-400/50 text-[11px] font-bold text-cyan-200">
          💧 استرجاع ISS القياسي: {ISS_WATER_MILESTONE.recoveryPercent}% (يحتاج احتياطي طوارئ)
        </div>
      </div>

      {/* 3 Hydroponic Control Modules */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className={`p-3.5 rounded-2xl border-2 space-y-2 ${ledOn ? 'bg-fuchsia-950/40 border-fuchsia-400' : 'bg-slate-950/75 border-slate-700'}`}>
          <div className="flex items-center justify-between">
            <span className="font-black text-xs text-fuchsia-200 flex items-center gap-1.5">
              <Lightbulb className="w-4 h-4" />
              1. إضاءة LED للنمو
            </span>
            <button
              type="button"
              onClick={handleToggleLed}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-black cursor-pointer ${
                ledOn ? 'bg-fuchsia-500 text-white' : 'bg-slate-800 text-slate-300'
              }`}
            >
              {ledOn ? 'مضاءة ✅' : 'تشغيل'}
            </button>
          </div>
          <label className="block text-[11px] text-slate-300 font-bold">
            طيف الأحمر/الأزرق للتمثيل الضوئي ({spectrumRatio}%):
            <input
              type="range"
              min={30}
              max={100}
              value={spectrumRatio}
              onChange={(e) => setSpectrumRatio(Number(e.target.value))}
              className="w-full accent-fuchsia-400 mt-1 cursor-pointer"
            />
          </label>
        </div>

        <div className={`p-3.5 rounded-2xl border-2 space-y-2 ${nutrientOn ? 'bg-emerald-950/45 border-emerald-400' : 'bg-slate-950/75 border-slate-700'}`}>
          <div className="flex items-center justify-between">
            <span className="font-black text-xs text-emerald-200 flex items-center gap-1.5">
              <Droplets className="w-4 h-4" />
              2. محلول المغذيات NPK
            </span>
            <button
              type="button"
              onClick={handleToggleNutrient}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-black cursor-pointer ${
                nutrientOn ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-300'
              }`}
            >
              {nutrientOn ? 'متوازن ✅' : 'ضخ المحلول'}
            </button>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            استخلاص آمن لـ N وP وK بعد معالجة البقايا النباتية (يُمنع تماماً استخدام المخلفات البشرية غير المعالجة!).
          </p>
        </div>

        <div className={`p-3.5 rounded-2xl border-2 space-y-2 ${waterLoopOn ? 'bg-cyan-950/45 border-cyan-400' : 'bg-slate-950/75 border-slate-700'}`}>
          <div className="flex items-center justify-between">
            <span className="font-black text-xs text-cyan-200 flex items-center gap-1.5">
              <Recycle className="w-4 h-4" />
              3. حلقة المياه المغلقة
            </span>
            <button
              type="button"
              onClick={handleToggleWater}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-black cursor-pointer ${
                waterLoopOn ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-300'
              }`}
            >
              {waterLoopOn ? 'نشطة ✅' : 'تشغيل الحلقة'}
            </button>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            تجميع بخار النتح لإعادته للخزان. بلغت ISS نسبة 98% (2023)، لكنها ليست مضمونة لكل مركبة مستقبلية.
          </p>
        </div>
      </div>

      {/* Harvest Crops (Kabocha Lettuce, Egyptian Arugula, Space Turnip) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {HYDROPONIC_CROPS.map((crop) => {
          const isPicked = harvested.includes(crop.id);
          return (
            <div
              key={crop.id}
              className={`p-3 rounded-2xl border-2 flex items-center justify-between gap-3 ${
                isPicked ? 'bg-emerald-950/55 border-emerald-400' : 'bg-slate-950/80 border-slate-700'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <img src={crop.svgAsset} alt={crop.nameAr} className="w-12 h-12 object-contain shrink-0" />
                <div className="min-w-0">
                  <div className="font-black text-xs text-white truncate">{crop.nameAr}</div>
                  <div className="text-[10px] text-emerald-300 truncate">
                    {crop.micronutrientsAr?.slice(0, 2).join(' • ')}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleHarvestCrop(crop.id, crop.nameAr || crop.name)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-black shrink-0 cursor-pointer ${
                  isPicked
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400'
                    : growthScore >= 75
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {isPicked ? 'محصود ✅' : 'حصاد 🌱'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Explicit Scientific Rule + Perchlorate Warning */}
      <div className="p-3.5 rounded-2xl bg-sky-950/45 border border-sky-400/50 space-y-1.5 text-xs">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="font-black text-sky-200 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            القاعدة العلمية لنظام NASA Veggie:
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-sky-900 border border-sky-400 text-sky-200">
            {SCIENCE_BADGES.PLANNING_ASSUMPTION.labelAr}
          </span>
        </div>
        <p className="text-slate-200 leading-relaxed">
          المحاصيل المائية تُمد الطاقم بفيتامينات ومعادن وألياف وتنوع نفسي فقط، بينما{' '}
          <strong>يبقى الطعام الفضائي المخزّن هو المصدر الأساسي المضمون لـ {DAILY_REFERENCE_ASSUMPTIONS.energyKcal.toLocaleString()} سعرة و{DAILY_REFERENCE_ASSUMPTIONS.proteinGrams} جم بروتين يومياً</strong>.
        </p>
        <p className="text-[11px] text-amber-200 flex items-center gap-1.5 font-bold">
          <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400" />
          <span>
            تحذير تربة المريخ ({SCIENCE_BADGES.EXPERIMENTAL.labelAr}): لا يمكن الزراعة مباشرة في تربة المريخ لأنها تحتوي على أملاح البيركلورات السامة!
          </span>
        </p>
      </div>

      {/* Optional Spirulina Photobioreactor Experimental Lab Card */}
      <div className="rounded-2xl bg-purple-950/35 border border-purple-400/50 p-3.5 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              setShowSpirulinaLab((v) => !v);
            }}
            className="flex items-center gap-2 font-hud font-black text-xs sm:text-sm text-purple-200 cursor-pointer"
          >
            <FlaskConical className="w-4 h-4 text-purple-300" />
            <span>تجربة مستقبلية: مفاعل السبيرولينا الحيوي (ESA MELiSSA) 🧪</span>
          </button>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-900 border border-purple-400 text-purple-200">
            {SCIENCE_BADGES.EXPERIMENTAL.labelAr}
          </span>
        </div>

        {showSpirulinaLab && (
          <div className="space-y-2.5 pt-1 text-xs">
            <p className="text-purple-100/90 leading-relaxed">
              تدرس أبحاث ESA/MELiSSA (مثل ARTHROSPIRA-C) زراعة طحالب السبيرولينا لإنتاج كتلة حيوية غنية بالبروتين وبعض الأكسجين، لكنها <strong>وحدة بحث تجريبية مساعدة وليست مصدراً أساسياً مضموناً</strong> حسب مقياس TRL.
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'light' as const, label: 'ضوء + حرارة مستقرة 💡' },
                { key: 'co2' as const, label: 'تغذية CO2 + محلول مغذٍ 🫧' },
                { key: 'phOk' as const, label: 'ضبط درجة الحموضة pH ⚖️' }
              ].map((ctrl) => (
                <button
                  key={ctrl.key}
                  type="button"
                  onClick={() => {
                    soundManager.playClick();
                    setSpirulinaParams((p) => ({ ...p, [ctrl.key]: !p[ctrl.key] }));
                  }}
                  className={`px-3 py-1.5 rounded-xl border text-[11px] font-black cursor-pointer ${
                    spirulinaParams[ctrl.key]
                      ? 'bg-purple-600/60 border-purple-300 text-white'
                      : 'bg-slate-900 border-slate-700 text-slate-400'
                  }`}
                >
                  {ctrl.label} {spirulinaParams[ctrl.key] ? '✅' : ''}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
