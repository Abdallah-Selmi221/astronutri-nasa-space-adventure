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
import { useGameState } from '../../context/GameContext';
import { tr } from '../../utils/i18n';
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
  const { language } = useGameState();
  const langDir = language === 'ar' ? 'rtl' : 'ltr';
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [webglFailed, setWebglFailed] = useState(false);

  const [ledOn, setLedOn] = useState<boolean>(Boolean(campaign.ecoLedActive));
  const [spectrumRatio, setSpectrumRatio] = useState<number>(68);
  const [nutrientOn, setNutrientOn] = useState<boolean>(Boolean(campaign.ecoNutrientOk));
  const [waterLoopOn, setWaterLoopOn] = useState<boolean>(Boolean(campaign.ecoWaterRecyclingOk));
  const [harvested, setHarvested] = useState<string[]>(campaign.ecoCropsHarvested || []);
  const [showSpirulinaLab, setShowSpirulinaLab] = useState(true);
  const [spirulinaParams, setSpirulinaParams] = useState({
    lightIntensity: 78,
    co2Flow: 72,
    phLevel: 7.0
  });

  const spirulinaPhOptimal = spirulinaParams.phLevel >= 6.5 && spirulinaParams.phLevel <= 7.5;
  const spirulinaBiomassPct = Math.round(
    (spirulinaParams.lightIntensity * 0.4 +
      spirulinaParams.co2Flow * 0.4 +
      (spirulinaPhOptimal ? 20 : 6))
  );
  const spirulinaO2LitersPerHour = Number((spirulinaBiomassPct * 0.045).toFixed(1));

  // Shared refs for live 3D reactive updates without recreating renderer
  const liveStateRef = useRef({
    ledOn,
    nutrientOn,
    waterLoopOn,
    spectrumRatio,
    spirulinaBiomassPct,
    spirulinaPhOptimal
  });
  liveStateRef.current = {
    ledOn,
    nutrientOn,
    waterLoopOn,
    spectrumRatio,
    spirulinaBiomassPct,
    spirulinaPhOptimal
  };

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
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
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

    // Left-Side Experimental Spirulina Photobioreactor Cylinder Column (ESA/MELiSSA)
    const reactorShell = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.46, 0.46, 1.85, 16)),
      trackMat(new THREE.MeshStandardMaterial({ color: 0xa7f3d0, transparent: true, opacity: 0.24 }))
    );
    reactorShell.position.set(-3.45, 0.9, -0.15);
    scene.add(reactorShell);

    const spirulinaMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x10b981,
        emissive: 0x059669,
        emissiveIntensity: 0.95,
        transparent: true,
        opacity: 0.88
      })
    );
    const spirulinaCore = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.36, 0.36, 1.45, 16)),
      spirulinaMat
    );
    spirulinaCore.position.set(-3.45, 0.72, -0.15);
    scene.add(spirulinaCore);

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

      // Tank fluid & Spirulina Photobioreactor feedback
      tankFluidMat.color.setHex(s.nutrientOn ? 0x10b981 : 0x38bdf8);
      tankFluid.scale.y = s.nutrientOn ? 1.0 : 0.45;
      tankFluid.position.y = s.nutrientOn ? 0.72 : 0.38;

      const bioFactor = Math.max(0.2, Math.min(1, s.spirulinaBiomassPct / 100));
      spirulinaCore.scale.y = bioFactor;
      spirulinaCore.position.y = 0.72 * bioFactor;
      spirulinaMat.emissiveIntensity = (s.spirulinaPhOptimal ? 0.9 : 0.35) + Math.sin(t * 3.1) * 0.25;
      spirulinaMat.color.setHex(s.spirulinaPhOptimal ? 0x10b981 : 0xf59e0b);

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

  const handleHarvestCrop = (cropId: string, cropNameDisplay: string) => {
    if (growthScore < 75) {
      soundManager.playCautionBeep();
      dialogueManager.speak(
        tr(
          language,
          'Turn on LED grow lights, NPK nutrient pump & water recycling first so crops flourish!',
          'شغّل إضاءة LED ومحلول المغذيات وإعادة تدوير الماء أولاً لتنمو المحاصيل المائية!'
        )
      );
      return;
    }
    if (harvested.includes(cropId)) return;
    soundManager.playCrystalSparkle();
    const next = [...harvested, cropId];
    setHarvested(next);
    syncEcoPatch(ledOn, nutrientOn, waterLoopOn, next);
    dialogueManager.speak(
      tr(
        language,
        `Harvested ${cropNameDisplay} to supply fresh vitamins and fiber alongside stored rations!`,
        `تم حصاد ${cropNameDisplay} لدعم الفيتامينات والألياف مع الطعام المخزن!`
      )
    );
  };

  return (
    <div
      className="rounded-3xl bg-slate-900/95 border-2 border-emerald-400/60 p-4 sm:p-5 space-y-4 shadow-2xl text-white"
      dir={langDir}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400 flex items-center justify-center">
            <Sprout className="w-5 h-5 text-emerald-300" />
          </div>
          <div>
            <h3 className="font-hud font-black text-base sm:text-lg text-white">
              {tr(
                language,
                `🌱 Self-Sustaining Hydroponic Eco-Bio Cabin (Node ${levelId})`,
                `🌱 كابينة الزراعة المائية الذاتية (المرحلة ${levelId})`
              )}
            </h3>
            <p className="text-xs text-emerald-200/90 font-bold">
              {tr(
                language,
                'Grow supplemental Space Lettuce, Arugula & Turnips using tuned LED spectrum, NPK feed & closed water loop',
                'إنتاج مكمل للكابوتشا والجرجير واللفت الفضائي بنظام الإضاءة الموجه ومحلول المغذيات والمياه المغلقة'
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-black border bg-emerald-950/80 border-emerald-400 text-emerald-200">
            {tr(language, SCIENCE_BADGES.ISS_PROVEN.labelEn, SCIENCE_BADGES.ISS_PROVEN.labelAr)}
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
              {tr(language, 'Close ✕', 'إغلاق ✕')}
            </button>
          )}
        </div>
      </div>

      {/* 3D Interactive Chamber Viewport */}
      <div className="relative rounded-2xl overflow-hidden border-2 border-cyan-400/40 bg-[#071324] h-64 sm:h-72">
        {!webglFailed ? (
          <div ref={mountRef} className="w-full h-full" />
        ) : (
          <div className="w-full h-full flex items-center justify-around px-6 bg-gradient-to-b from-purple-950/50 to-slate-950">
            {HYDROPONIC_CROPS.map((c) => (
              <div key={c.id} className="flex flex-col items-center gap-2">
                <img src={c.svgAsset} alt={tr(language, c.name, c.nameAr || c.name)} className="w-20 h-20 object-contain" />
                <span className="text-xs font-black text-emerald-200">{tr(language, c.name, c.nameAr || c.name)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Growth Progress Pill */}
        <div className="absolute top-3 left-3 px-3 py-1.5 rounded-2xl bg-slate-950/85 border border-emerald-400/50 text-xs font-black text-emerald-200 flex items-center gap-2">
          <span>{tr(language, `Bio-Growth Health: ${growthScore}%`, `صحة النمو الحيوي: ${growthScore}%`)}</span>
        </div>

        {/* Water Caveat Pill */}
        <div className="absolute top-3 right-3 px-3 py-1.5 rounded-2xl bg-slate-950/85 border border-cyan-400/50 text-[11px] font-bold text-cyan-200">
          {tr(
            language,
            `💧 ISS Record Water Loop: ${ISS_WATER_MILESTONE.recoveryPercent}% (Backup tank required)`,
            `💧 استرجاع المحطة القياسي للمياه: ${ISS_WATER_MILESTONE.recoveryPercent}% (يحتاج احتياطي طوارئ)`
          )}
        </div>
      </div>

      {/* 3 Hydroponic Control Modules */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className={`p-3.5 rounded-2xl border-2 space-y-2 ${ledOn ? 'bg-fuchsia-950/40 border-fuchsia-400' : 'bg-slate-950/75 border-slate-700'}`}>
          <div className="flex items-center justify-between">
            <span className="font-black text-xs text-fuchsia-200 flex items-center gap-1.5">
              <Lightbulb className="w-4 h-4" />
              {tr(language, '1. LED Grow Array', '1. إضاءة النمو الموجهة')}
            </span>
            <button
              type="button"
              onClick={handleToggleLed}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-black cursor-pointer ${
                ledOn ? 'bg-fuchsia-500 text-white' : 'bg-slate-800 text-slate-300'
              }`}
            >
              {ledOn ? tr(language, 'Lit ✅', 'مضاءة ✅') : tr(language, 'Turn On', 'تشغيل')}
            </button>
          </div>
          <label className="block text-[11px] text-slate-300 font-bold">
            {tr(
              language,
              `Red/Blue Photosynthesis Spectrum (${spectrumRatio}%):`,
              `طيف الأحمر/الأزرق للتمثيل الضوئي (${spectrumRatio}%):`
            )}
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
              {tr(language, '2. NPK Nutrient Solution', '2. محلول المغذيات المعدنية')}
            </span>
            <button
              type="button"
              onClick={handleToggleNutrient}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-black cursor-pointer ${
                nutrientOn ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-300'
              }`}
            >
              {nutrientOn ? tr(language, 'Balanced ✅', 'متوازن ✅') : tr(language, 'Pump Feed', 'ضخ المحلول')}
            </button>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            {tr(
              language,
              'Cleanly reclaimed Nitrogen, Phosphorus & Potassium from treated plant compost (untreated human waste is strictly prohibited!).',
              'استخلاص آمن لعناصر النيتروجين والفوسفور والبوتاسيوم بعد معالجة البقايا النباتية.'
            )}
          </p>
        </div>

        <div className={`p-3.5 rounded-2xl border-2 space-y-2 ${waterLoopOn ? 'bg-cyan-950/45 border-cyan-400' : 'bg-slate-950/75 border-slate-700'}`}>
          <div className="flex items-center justify-between">
            <span className="font-black text-xs text-cyan-200 flex items-center gap-1.5">
              <Recycle className="w-4 h-4" />
              {tr(language, '3. Closed Water Recovery Loop', '3. حلقة المياه المغلقة')}
            </span>
            <button
              type="button"
              onClick={handleToggleWater}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-black cursor-pointer ${
                waterLoopOn ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-300'
              }`}
            >
              {waterLoopOn ? tr(language, 'Active ✅', 'نشطة ✅') : tr(language, 'Start Loop', 'تشغيل الحلقة')}
            </button>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            {tr(
              language,
              'Reclaims plant transpiration moisture back into the reservoir. ISS hit 98% recovery (2023), though backup water remains mandatory.',
              'تجميع بخار النتح لإعادته للخزان. بلغت محطة الفضاء نسبة 98%، لكنها تحتاج خزان طوارئ.'
            )}
          </p>
        </div>
      </div>

      {/* Harvest Crops */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {HYDROPONIC_CROPS.map((crop) => {
          const isPicked = harvested.includes(crop.id);
          const cropDisplayName = tr(language, crop.name, crop.nameAr || crop.name);
          return (
            <div
              key={crop.id}
              className={`p-3 rounded-2xl border-2 flex items-center justify-between gap-3 ${
                isPicked ? 'bg-emerald-950/55 border-emerald-400' : 'bg-slate-950/80 border-slate-700'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <img src={crop.svgAsset} alt={cropDisplayName} className="w-12 h-12 object-contain shrink-0" />
                <div className="min-w-0">
                  <div className="font-black text-xs text-white truncate">{cropDisplayName}</div>
                  <div className="text-[10px] text-emerald-300 truncate">
                    {language === 'en'
                      ? 'Fresh Vitamins • Crisp Fiber'
                      : crop.micronutrientsAr?.slice(0, 2).join(' • ')}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleHarvestCrop(crop.id, cropDisplayName)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-black shrink-0 cursor-pointer ${
                  isPicked
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400'
                    : growthScore >= 75
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {isPicked ? tr(language, 'Harvested ✅', 'محصود ✅') : tr(language, 'Harvest 🌱', 'حصاد 🌱')}
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
            {tr(language, 'NASA Veggie Garden Scientific Rule:', 'القاعدة العلمية لحديقة الفضاء بناسا:')}
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-sky-900 border border-sky-400 text-sky-200">
            {tr(language, SCIENCE_BADGES.PLANNING_ASSUMPTION.labelEn, SCIENCE_BADGES.PLANNING_ASSUMPTION.labelAr)}
          </span>
        </div>
        <p className="text-slate-200 leading-relaxed">
          {tr(
            language,
            `Hydroponic greens supply fresh vitamins, fiber & morale boosts, while stored packaged space rations remain the reliable backbone for ${DAILY_REFERENCE_ASSUMPTIONS.energyKcal.toLocaleString()} kcal & ${DAILY_REFERENCE_ASSUMPTIONS.proteinGrams}g daily protein.`,
            `المحاصيل المائية تُمد الطاقم بفيتامينات ومعادن وألياف وتنوع نفسي فقط، بينما يبقى الطعام الفضائي المخزّن هو المصدر الأساسي المضمون لـ ${DAILY_REFERENCE_ASSUMPTIONS.energyKcal.toLocaleString()} سعرة و${DAILY_REFERENCE_ASSUMPTIONS.proteinGrams} جم بروتين يومياً.`
          )}
        </p>
        <p className="text-[11px] text-amber-200 flex items-center gap-1.5 font-bold">
          <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400" />
          <span>
            {tr(
              language,
              `Mars Soil Caution (${SCIENCE_BADGES.EXPERIMENTAL.labelEn}): Astronauts cannot plant crops directly in Martian soil because it contains toxic perchlorate salts!`,
              `تحذير تربة المريخ (${SCIENCE_BADGES.EXPERIMENTAL.labelAr}): لا يمكن الزراعة مباشرة في تربة المريخ لأنها تحتوي على أملاح البيركلورات السامة!`
            )}
          </span>
        </p>
      </div>

      {/* Optional Spirulina Photobioreactor Experimental Lab Card */}
      <div
        data-testid="spirulina-bioreactor-card"
        className="rounded-2xl bg-purple-950/35 border border-purple-400/50 p-3.5 space-y-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              setShowSpirulinaLab((v) => !v);
            }}
            className="flex items-center gap-2 font-hud font-black text-xs sm:text-sm text-purple-200 cursor-pointer"
          >
            <FlaskConical className="w-4 h-4 text-emerald-300" />
            <span>{tr(language, 'Interactive Spirulina Photobioreactor (ESA / MELiSSA) 🌿', 'مفاعل السبيرولينا الضوئي التفاعلي لوكالة الفضاء الأوروبية 🌿')}</span>
          </button>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-900 border border-purple-400 text-purple-100">
            {tr(
              language,
              '🧪 Experimental — ESA/MELiSSA Assistive Biotech',
              '🧪 تجريبية — أبحاث مساعدة لإنتاج الأكسجين والكتلة الحيوية'
            )}
          </span>
        </div>

        {showSpirulinaLab && (
          <div className="space-y-3 pt-1 text-xs">
            <p className="text-purple-100/90 leading-relaxed">
              {tr(
                language,
                'ESA’s MELiSSA (e.g. ARTHROSPIRA-C) studies microalgae photobioreactors to generate oxygen and supplementary biomass alongside core mission rations.',
                'تدرس أبحاث الفضاء استزراع طحالب السبيرولينا لدعم توليد الأكسجين والكتلة الحيوية المكملة، وتظل تجربة بحثية مساعدة بجانب مخزون الطعام الأساسي.'
              )}
            </p>

            {/* Live Numeric Photobioreactor Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <label className="p-2.5 rounded-xl bg-slate-950/80 border border-emerald-400/35 space-y-1">
                <div className="flex justify-between font-black text-[11px] text-amber-200">
                  <span>{tr(language, 'Light Intensity 💡', 'شدة الإضاءة 💡')}</span>
                  <span>{spirulinaParams.lightIntensity}%</span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={100}
                  value={spirulinaParams.lightIntensity}
                  data-testid="spirulina-light-slider"
                  onChange={(e) =>
                    setSpirulinaParams((p) => ({ ...p, lightIntensity: Number(e.target.value) }))
                  }
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </label>

              <label className="p-2.5 rounded-xl bg-slate-950/80 border border-cyan-400/35 space-y-1">
                <div className="flex justify-between font-black text-[11px] text-cyan-200">
                  <span>{tr(language, 'CO2 Bubble Flow 🫧', 'تدفق فقاعات ثاني أكسيد الكربون 🫧')}</span>
                  <span>{spirulinaParams.co2Flow}%</span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={100}
                  value={spirulinaParams.co2Flow}
                  data-testid="spirulina-co2-slider"
                  onChange={(e) =>
                    setSpirulinaParams((p) => ({ ...p, co2Flow: Number(e.target.value) }))
                  }
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </label>

              <label className="p-2.5 rounded-xl bg-slate-950/80 border border-purple-400/35 space-y-1">
                <div className="flex justify-between font-black text-[11px] text-purple-200">
                  <span>{tr(language, 'Culture pH ⚖️', 'درجة الحموضة ⚖️')}</span>
                  <span className={spirulinaPhOptimal ? 'text-emerald-300' : 'text-amber-300'}>
                    {spirulinaParams.phLevel.toFixed(1)}{' '}
                    {spirulinaPhOptimal ? tr(language, '(Optimal)', '(مثالي)') : tr(language, '(Outside 6.5–7.5)', '(خارج 6.5-7.5)')}
                  </span>
                </div>
                <input
                  type="range"
                  min={5.5}
                  max={8.5}
                  step={0.1}
                  value={spirulinaParams.phLevel}
                  data-testid="spirulina-ph-slider"
                  onChange={(e) =>
                    setSpirulinaParams((p) => ({ ...p, phLevel: Number(e.target.value) }))
                  }
                  className="w-full accent-emerald-400 cursor-pointer"
                />
              </label>
            </div>

            {/* Biomass & Supplemental Oxygen Readout */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-400/45 flex items-center justify-between">
                <span className="font-bold text-emerald-200">{tr(language, 'Green Biomass Growth:', 'نمو الكتلة الحيوية الخضراء:')}</span>
                <span data-testid="spirulina-biomass-pct" className="font-mono font-black text-emerald-300 text-sm">
                  {spirulinaBiomassPct}%
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-sky-950/60 border border-cyan-400/45 flex items-center justify-between">
                <span className="font-bold text-cyan-200">{tr(language, 'Supplemental O2 Output:', 'أكسجين تكميلي مساعد:')}</span>
                <span className="font-mono font-black text-cyan-300 text-sm">
                  +{spirulinaO2LitersPerHour} L/h
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
