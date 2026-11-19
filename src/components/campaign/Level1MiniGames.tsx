import React, { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { AnimatePresence, motion } from 'framer-motion';
import { CampaignProgressState, MiniGameId } from '../../types/game';
import { useGameState, initialSpaceFitXState } from '../../context/GameContext';
import { tr } from '../../utils/i18n';
import { soundManager } from '../../utils/sound';
import { dialogueManager } from '../../utils/geminiTTS';
import { EGYPTIAN_SINAI_SPACE_FOODS, FOOD_DATABASE } from '../../data/foodItems';
import { SCIENCE_BADGES } from '../../data/science';
import { BodyTelemetryMeters } from './BodyTelemetryMeters';
import { AstronautBioTwin } from './AstronautBioTwin';
import { StationLandscapeFrame } from './StationLandscapeFrame';
import {
  AlertTriangle,
  CheckCircle2,
  PackageCheck,
  Radio,
  Rocket,
  ShieldCheck,
  XCircle
} from 'lucide-react';

interface Level1Props {
  miniGameId: MiniGameId;
  campaign: CampaignProgressState;
  onCompleteMiniGame: (id: MiniGameId, patch?: Partial<CampaignProgressState>) => void;
  onUpdateCampaign?: (patch: Partial<CampaignProgressState>) => void;
  onNextLevel: () => void;
  onBackToLevel: () => void;
}

interface PantryEntry {
  id: string;
  nameAr: string;
  nameEn: string;
  icon: string;
  svgAsset?: string;
  weightKg: number;
  kcal: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber: number;
  vitamins: number;
  isBanned: boolean;
  hasCrumbs?: boolean;
  isForbidden?: boolean;
  originBadge?: string;
  originBadgeEn?: string;
  bannedMsg?: string;
  bannedMsgEn?: string;
}

const buildPantryEntries = (): PantryEntry[] => {
  const fromFoodDb = (
    id: string,
    fallbackWeight: number,
    vitBoost: number,
    originBadge?: string,
    originBadgeEn?: string
  ): PantryEntry | null => {
    const f = FOOD_DATABASE.find((item) => item.id === id);
    if (!f) return null;
    return {
      id: f.id,
      nameAr: f.nameAr || f.name,
      nameEn: f.name,
      icon: f.icon,
      svgAsset: f.svgAsset,
      weightKg: fallbackWeight,
      kcal: f.kcal ?? f.proteinGrams * 4 + f.carbsGrams * 4,
      protein: f.proteinGrams,
      carbs: f.carbsGrams,
      fats: f.fatsGrams ?? 2,
      fiber: f.fiberGrams ?? 2,
      vitamins: vitBoost,
      isBanned: f.isBanned,
      hasCrumbs: Boolean(f.hasCrumbs || f.crumbRating === 'high_crumbs'),
      isForbidden: Boolean(f.isForbidden || f.isBanned),
      originBadge,
      originBadgeEn: originBadgeEn || originBadge,
      bannedMsg: f.bannedReasonAr,
      bannedMsgEn: f.bannedReasonAr ? 'Unsafe in microgravity: floating crumbs or liquid droplets hazard!' : undefined
    };
  };

  const candidates = [
    fromFoodDb('sinai_honey', 2, 18, 'سيناوي 🍯', 'Sinai 🍯'),
    fromFoodDb('egy_mish_pouch', 3, 20, 'مصري 🇪🇬', 'Egyptian 🇪🇬'),
    fromFoodDb('sinai_date_bars', 3, 20, 'سيناوي 🌴', 'Sinai 🌴'),
    fromFoodDb('egy_tahini_pouch', 2, 18, 'مصري 🥣', 'Egyptian 🥣'),
    fromFoodDb('sinai_olive_oil_drops', 1, 16, 'سيناوي 🫒', 'Sinai 🫒'),
    fromFoodDb('sinai_herbal_paste', 1, 22, 'سيناوي 🌿', 'Sinai 🌿'),
    fromFoodDb('egy_space_cabbage_lettuce', 2, 35, 'زراعة مائية 🌱', 'Hydroponic 🌱'),
    fromFoodDb('egy_space_arugula', 2, 35, 'زراعة مائية 🌱', 'Hydroponic 🌱'),
    fromFoodDb('egy_space_turnip', 2, 28, 'زراعة مائية 🌱', 'Hydroponic 🌱'),
    fromFoodDb('chicken_teriyaki_pouch', 4, 15, 'ناسا المعتمدة', 'NASA Approved')
  ].filter(Boolean) as PantryEntry[];

  // Red-warning banned items
  candidates.push(
    {
      id: 'banned_crumbly_biscuits',
      nameAr: 'بسكويت متفتت (خطر)',
      nameEn: 'Crumbly Biscuits (Hazard)',
      icon: '🍪',
      weightKg: 2,
      kcal: 220,
      protein: 3,
      carbs: 35,
      fats: 8,
      fiber: 1,
      vitamins: 0,
      isBanned: true,
      hasCrumbs: true,
      isForbidden: true,
      originBadge: 'ممنوع بالفضاء 🚫',
      originBadgeEn: '0G Hazard 🚫',
      bannedMsg:
        '⚠️ خطر الفتات! البسكويت المتفتت يسبح في الجاذبية الصغرى ويسد فلاتر الهواء ويؤذي أعين الرواد!',
      bannedMsgEn:
        '⚠️ Crumb Hazard! Dry biscuit crumbs float in 0G, clog ECLSS air filters, and irritate astronauts’ eyes!'
    },
    {
      id: 'banned_open_juice',
      nameAr: 'عصير في كوب مفتوح (خطر)',
      nameEn: 'Open Juice Cup (Hazard)',
      icon: '🧃',
      weightKg: 2,
      kcal: 110,
      protein: 0,
      carbs: 26,
      fats: 0,
      fiber: 0,
      vitamins: 15,
      isBanned: true,
      hasCrumbs: false,
      isForbidden: true,
      originBadge: 'ممنوع بالفضاء 🚫',
      originBadgeEn: '0G Hazard 🚫',
      bannedMsg:
        '⚠️ السوائل الحرة ممنوعة! في 0G تتطاير قطرات العصير وتُحدث تماساً كهربائياً بالأجهزة!',
      bannedMsgEn:
        '⚠️ Unsealed Liquid Hazard! Free droplets float into avionics and short-circuit spacecraft panels in 0G!'
    }
  );

  return candidates;
};

const PANTRY_ENTRIES = buildPantryEntries();

interface EquipInspectionItem {
  id: string;
  nameAr: string;
  nameEn: string;
  icon: string;
  bay: string;
  bayEn: string;
  shouldPack: boolean;
  reasonAr: string;
  reasonEn: string;
}

const EQUIP_INSPECTION_LIST: EquipInspectionItem[] = [
  {
    id: 'med_kit',
    nameAr: 'حقيبة الإسعافات والقياس الحيوي',
    nameEn: 'Space Medical Kit',
    icon: '🧰',
    bay: 'العيادة الطبية',
    bayEn: 'Medical Bay',
    shouldPack: true,
    reasonAr: 'ضرورية لمتابعة النبض والضغط والإسعاف الأولي.',
    reasonEn: 'Essential for tracking pulse, blood pressure, and crew first aid.'
  },
  {
    id: 'damaged_batteries',
    nameAr: 'بطاريات تالفة ومنتفخة',
    nameEn: 'Damaged Swollen Batteries',
    icon: '🪫',
    bay: 'ممنوعة — أمان الطاقة',
    bayEn: 'Rejected — Power Safety',
    shouldPack: false,
    reasonAr: 'مرفوض! البطاريات التالفة تشكل خطر حريق وتسرب كيميائي بالمركبة.',
    reasonEn: 'Rejected! Damaged cells pose thermal runaway and toxic leak risks.'
  },
  {
    id: 'comms_headset',
    nameAr: 'سماعة اتصال مركز الأرض',
    nameEn: 'Mission Comms Headset',
    icon: '🎧',
    bay: 'غرفة التحكم',
    bayEn: 'Mission Control',
    shouldPack: true,
    reasonAr: 'أساسية للتواصل المستمر مع مركز التحكم الأرضي.',
    reasonEn: 'Required for continuous two-way voice telemetry with Earth control.'
  },
  {
    id: 'game_console',
    nameAr: 'جهاز ألعاب كبير غير ضروري',
    nameEn: 'Bulky Unapproved Game Console',
    icon: '🎮',
    bay: 'مرفوض — وزن زائد',
    bayEn: 'Rejected — Excess Mass',
    shouldPack: false,
    reasonAr: 'مرفوض! كل كيلوجرام في الصاروخ يستهلك وقوداً غالياً بلا فائدة علمية.',
    reasonEn: 'Rejected! Every extra kilogram wastes precious launch propellant without mission value.'
  },
  {
    id: 'o2_monitor',
    nameAr: 'جهاز قياس الأكسجين المحمول',
    nameEn: 'Portable O2 Monitor',
    icon: '🫧',
    bay: 'حظيرة المركبة',
    bayEn: 'Spaceship Bay',
    shouldPack: true,
    reasonAr: 'يراقب نقاء هواء الكابينة وضغط الأكسجين.',
    reasonEn: 'Continuously checks cabin air purity and partial oxygen pressure.'
  },
  {
    id: 'expired_pack',
    nameAr: 'عبوة طعام منتهية الصلاحية',
    nameEn: 'Expired Food Ration',
    icon: '📦',
    bay: 'مرفوض — سلامة ميكروبية',
    bayEn: 'Rejected — Microbial Safety',
    shouldPack: false,
    reasonAr: 'مرفوض! السلامة الميكروبية وصلاحية الغذاء شرط أساسي في الفضاء.',
    reasonEn: 'Rejected! Strict microbial stability and shelf-life verification are mandatory.'
  },
  {
    id: 'safety_tethers',
    nameAr: 'أحزمة وحبال أمان الجاذبية',
    nameEn: 'Zero-G Safety Tethers',
    icon: '🪢',
    bay: 'ممر انعدام الجاذبية',
    bayEn: 'Zero-G Corridor',
    shouldPack: true,
    reasonAr: 'تمنع طفو الأدوات وارتطامها في انعدام الجاذبية.',
    reasonEn: 'Secures hardware and prevents tools drifting away in weightlessness.'
  },
  {
    id: 'toy_camera',
    nameAr: 'كاميرا بلاستيكية لعبة',
    nameEn: 'Unverified Toy Camera',
    icon: '📷',
    bay: 'مرفوض — غير معتمدة',
    bayEn: 'Rejected — Uncertified',
    shouldPack: false,
    reasonAr: 'مرفوض! استبدلها بأدوات الرصد العلمية المعايرة.',
    reasonEn: 'Rejected! Swap for flight-certified optical scientific instruments.'
  }
];

const L1_SHIP_SYSTEMS = [
  { id: 'oxygen', nameAr: 'خزانات الأكسجين ومعدل الضغط (O₂)', nameEn: 'Oxygen Tanks & Pressure (O₂)', icon: '🫧' },
  { id: 'power', nameAr: 'البطاريات وخلايا الطاقة الكهربائية', nameEn: 'Power Cells & Battery Arrays', icon: '⚡' },
  { id: 'comms', nameAr: 'هوائي الاتصال الأرضي والرادار', nameEn: 'Ground Antenna & Radar Link', icon: '📡' },
  { id: 'life_support', nameAr: 'نظام دعم الحياة وإزالة CO₂ (ECLSS)', nameEn: 'ECLSS Life Support & CO₂ Scrubber', icon: '💨' },
  { id: 'cabin_doors', nameAr: 'إغلاق وأمان أبواب الكبسولة', nameEn: 'Capsule Hatch Seals & Locks', icon: '🚪' }
];

// ---------------------------------------------------------------------------
// 1.1 FOOD PACKING CHALLENGE (2.5D Pantry Shelves + Meal Tray + Simplified Game Meters)
// ---------------------------------------------------------------------------
const FoodPackingScene: React.FC<{
  campaign: CampaignProgressState;
  onComplete: (ids: string[], weightKg: number) => void;
}> = ({ campaign, onComplete }) => {
  const { language } = useGameState();
  const [selectedIds, setSelectedIds] = useState<string[]>(
    campaign.l1SelectedFoodIds.length > 0 ? campaign.l1SelectedFoodIds : []
  );
  const [safetyAlert, setSafetyAlert] = useState<string | null>(null);
  const [safeToast, setSafeToast] = useState<string | null>(null);
  const [cabinFilterPct, setCabinFilterPct] = useState<number>(campaign.cabinFilterHealthPct ?? 100);
  const [isDragOverTray, setIsDragOverTray] = useState<boolean>(false);
  const hepaCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [crumbParticles, setCrumbParticles] = useState<
    Array<{ id: number; emoji: string; x: number; y: number; dx: number; dy: number }>
  >([]);
  const particleTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = hepaCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let rafId = 0;
    const startMs = performance.now();
    const sparks = Array.from({ length: 24 }, (_, idx) => ({
      x: 34 + ((idx * 17) % (canvas.width - 52)),
      y: 6 + ((idx * 11) % (canvas.height - 12)),
      vx: 1.0 + (idx % 4) * 0.35
    }));
    const renderLoop = () => {
      rafId = window.requestAnimationFrame(renderLoop);
      const t = (performance.now() - startMs) / 1000;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      const isClogged = cabinFilterPct < 90 || safetyAlert !== null;

      // Brushed aerospace duct gradient backdrop
      const duct = ctx.createLinearGradient(0, 0, w, 0);
      duct.addColorStop(0, '#091124');
      duct.addColorStop(0.5, isClogged ? 'rgba(127, 29, 29, 0.5)' : 'rgba(6, 78, 59, 0.38)');
      duct.addColorStop(1, '#091124');
      ctx.fillStyle = duct;
      ctx.fillRect(0, 0, w, h);

      // Left intake rotating 5-blade HEPA impeller fan
      const fanX = 18;
      const fanY = h * 0.5;
      ctx.save();
      ctx.translate(fanX, fanY);
      ctx.strokeStyle = isClogged ? '#f59e0b' : '#38bdf8';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.rotate(t * (isClogged ? 2.1 : 8.5));
      for (let b = 0; b < 5; b++) {
        ctx.rotate((Math.PI * 2) / 5);
        ctx.fillStyle = isClogged ? '#fbbf24' : '#bae6fd';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(6, -3.5, 10, 0);
        ctx.quadraticCurveTo(5, 3, 0, 0);
        ctx.fill();
      }
      ctx.restore();

      // V-pleated HEPA accordion filter curtain at right edge
      ctx.strokeStyle = isClogged ? '#f59e0b' : '#34d399';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      for (let ry = 4; ry <= h - 4; ry += 6) {
        const rx = w - 18 + (((ry - 4) / 6) % 2 === 0 ? 0 : 9);
        if (ry === 4) ctx.moveTo(rx, ry);
        else ctx.lineTo(rx, ry);
      }
      ctx.stroke();

      // Laminar aerodynamic flow streaks + crumb sparks
      sparks.forEach((p, idx) => {
        p.x += p.vx * (isClogged ? 0.45 : 1.5);
        if (p.x > w - 22) p.x = 32;
        const py = p.y + Math.sin(p.x * 0.08 + idx + t * 2) * 2.2;
        ctx.strokeStyle = isClogged ? 'rgba(251, 191, 36, 0.8)' : 'rgba(56, 189, 248, 0.78)';
        ctx.lineWidth = isClogged ? 2.2 : 1.6;
        ctx.beginPath();
        ctx.moveTo(p.x - 8, py);
        ctx.lineTo(p.x, py);
        ctx.stroke();
      });
    };
    renderLoop();
    return () => window.cancelAnimationFrame(rafId);
  }, [cabinFilterPct, safetyAlert]);
  const [foodMissionDone, setFoodMissionDone] = useState<boolean>(
    campaign.completedMiniGames.includes('l1_food_prep')
  );

  useEffect(() => {
    return () => {
      if (particleTimerRef.current !== null) {
        window.clearTimeout(particleTimerRef.current);
      }
    };
  }, []);

  const packed = PANTRY_ENTRIES.filter((p) => selectedIds.includes(p.id));
  const totalKg = packed.reduce((s, p) => s + p.weightKg, 0);
  const totalProtein = packed.reduce((s, p) => s + p.protein, 0);
  const totalCarbs = packed.reduce((s, p) => s + p.carbs, 0);
  const totalFats = packed.reduce((s, p) => s + p.fats, 0);
  const totalFiber = packed.reduce((s, p) => s + p.fiber, 0);
  const totalVitamins = packed.reduce((s, p) => s + p.vitamins, 0);
  const totalKcal = packed.reduce((s, p) => s + p.kcal, 0);

  const maxKg = 20;
  const pct = (val: number, goal: number) => Math.min(100, Math.round((val / goal) * 100));

  const proteinPct = pct(totalProtein, 35);
  const carbsPct = pct(totalCarbs, 55);
  const fatsPct = pct(totalFats, 25);
  const vitPct = pct(totalVitamins, 55);
  const fiberPct = pct(totalFiber, 9);

  // Healthy Egyptian/Sinai & NASA food combinations (zero-crumb, non-forbidden) should unlock smoothly without overly punishing low-fat selections
  const isBalanced =
    packed.length >= 4 &&
    totalKg <= maxKg &&
    proteinPct >= 45 &&
    carbsPct >= 45 &&
    vitPct >= 50 &&
    fiberPct >= 40 &&
    (fatsPct >= 30 || totalFats >= 5);

  const spawnFloating0GParticles = (isCrumb: boolean) => {
    const icons = isCrumb ? ['🍪', '✨', '💨', '⚠️'] : ['💧', '🫧', '⚡', '⚠️'];
    const batch = Array.from({ length: 10 }, (_, idx) => ({
      id: Date.now() + idx,
      emoji: icons[idx % icons.length],
      x: 20 + ((idx * 17) % 60),
      y: 30 + ((idx * 23) % 45),
      dx: (idx % 2 === 0 ? 1 : -1) * (35 + (idx % 4) * 18),
      dy: -(25 + (idx % 5) * 18)
    }));
    setCrumbParticles(batch);
    if (particleTimerRef.current !== null) {
      window.clearTimeout(particleTimerRef.current);
    }
    particleTimerRef.current = window.setTimeout(() => setCrumbParticles([]), 2100);
  };

  const toggleItem = (entry: PantryEntry) => {
    const isHazardous = Boolean(entry.hasCrumbs || entry.isForbidden || entry.isBanned);
    if (isHazardous) {
      soundManager.playAlertSiren();
      setSafeToast(null);
      setCabinFilterPct((prev) => Math.max(48, prev - 14));
      spawnFloating0GParticles(Boolean(entry.hasCrumbs));
      setSafetyAlert(
        tr(
          language,
          entry.bannedMsgEn || '0G Hazard! Crumbs and free liquids clog air filters in space!',
          entry.bannedMsg || 'ممنوع في الفضاء! خطر الفتات والسوائل الحرة!'
        )
      );
      void dialogueManager.speak(
        tr(
          language,
          'Careful! Crumbs and open drinks float into air filters in zero gravity!',
          'حاسب! ده ممنوع في الفضاء عشان الفتات والسوائل الحرة!'
        )
      );
      return;
    }
    soundManager.playClick();
    setSafetyAlert(null);
    setCabinFilterPct((prev) => Math.min(100, prev + 4));
    setSelectedIds((prev) => {
      if (prev.includes(entry.id)) {
        setSafeToast(null);
        return prev.filter((x) => x !== entry.id);
      }
      if (totalKg + entry.weightKg > maxKg) {
        soundManager.playCautionBeep();
        setSafeToast(null);
        setSafetyAlert(
          tr(
            language,
            '⚠️ Cargo crate full (20 kg max)! Remove one item first.',
            '⚠️ وصلت للحد الأقصى لسعة صندوق الشحن (20 كجم)! أزل صنفاً لتضيف غيره.'
          )
        );
        return prev;
      }
      setSafeToast(
        tr(
          language,
          `✓ Safe & nutritious zero-G food — ${entry.nameEn}`,
          `✓ وجبة فضائية آمنة ومغذية — ${entry.nameAr}`
        )
      );
      return [...prev, entry.id];
    });
  };

  const sinaiEgCount = packed.filter((p) => EGYPTIAN_SINAI_SPACE_FOODS.some((e) => e.id === p.id)).length;
  const fuelGain =
    (selectedIds.includes('sinai_honey') ? 2 : selectedIds.length > 0 ? 1 : 0) +
    (totalKg > 0 && totalKg <= 16 ? 1 : 0);

  return (
    <StationLandscapeFrame
      accentBorderClass="border-emerald-400/60"
      leftDataTestId="food-tray-dropzone"
      leftExtraClass={`bg-gradient-to-b from-indigo-950/85 to-slate-950 border-2 ${
        isDragOverTray ? 'border-emerald-300 ring-2 ring-emerald-400/60' : 'border-indigo-400/50'
      }`}
      leftExtraProps={{
        onDragOver: (e) => {
          e.preventDefault();
          setIsDragOverTray(true);
        },
        onDragLeave: () => setIsDragOverTray(false),
        onDrop: (e) => {
          e.preventDefault();
          setIsDragOverTray(false);
          const droppedId = e.dataTransfer.getData('text/plain');
          const entry = PANTRY_ENTRIES.find((p) => p.id === droppedId);
          if (entry) toggleItem(entry);
        }
      }}
      roboTip={tr(
        language,
        'Tap or drag 4+ zero-crumb snacks (like Sinai Honey!) within 20 kg.',
        'اسحب أو اضغط 4+ وجبات بلا فتات (مثل عسل سيناء) ضمن 20 كجم.'
      )}
      leftStage={
        <div className="relative flex-1 min-h-0 flex flex-col justify-between gap-1.5 overflow-hidden">
          <AnimatePresence>
            {crumbParticles.map((p) => (
              <motion.span
                key={p.id}
                data-testid="zerog-crumb-particle"
                initial={{ opacity: 1, scale: 0.9, left: `${p.x}%`, top: `${p.y}%` }}
                animate={{
                  opacity: [1, 1, 0],
                  scale: [1, 1.35, 0.9],
                  x: p.dx,
                  y: p.dy,
                  rotate: [0, 180, 360]
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.9, ease: 'easeOut' }}
                className="pointer-events-none absolute z-30 text-xl sm:text-2xl px-1 py-0.5 rounded-full bg-rose-950/85 border border-rose-300/80 select-none"
              >
                {p.emoji}
              </motion.span>
            ))}
          </AnimatePresence>

          {safeToast && (
            <div
              data-testid="food-safe-toast"
              className="shrink-0 px-2 py-1 rounded-xl bg-emerald-950/95 border border-emerald-400 text-emerald-100 font-hud font-bold text-[10.5px] flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="truncate">{safeToast}</span>
            </div>
          )}

          {safetyAlert && (
            <div
              data-testid="food-hazard-alert"
              className="shrink-0 px-2 py-1 rounded-xl bg-rose-950/95 border border-rose-400 text-rose-100 font-hud font-bold text-[10.5px] flex items-center gap-1.5"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span className="line-clamp-2">{safetyAlert}</span>
            </div>
          )}

          <AstronautBioTwin
            mini
            language={language}
            rationsCount={packed.length}
            hydrationPct={Math.min(98, 72 + packed.length * 5)}
            boneMusclePct={Math.min(100, 76 + packed.length * 6)}
            suitCalibrated={false}
          />

          {/* Compact HEPA Airflow & Bag Weight Bar */}
          <div className="shrink-0 rounded-xl bg-slate-950/90 border border-cyan-500/40 p-1.5 space-y-1">
            <div className="flex items-center justify-between text-[10.5px] font-hud font-bold gap-1">
              <span className="text-cyan-200 truncate">
                {tr(language, `HEPA Air: ${cabinFilterPct}%`, `فلتر الهواء: ${cabinFilterPct}%`)}
              </span>
              <span className="text-amber-300 shrink-0">
                {totalKg}/{maxKg} {tr(language, 'kg', 'كجم')} • +{fuelGain}⚡
              </span>
            </div>
            <canvas ref={hepaCanvasRef} width={220} height={24} className="w-full h-5 rounded-md block" />
          </div>

          {/* 5 Compact Nutrient Power Bars */}
          <div className="shrink-0 grid grid-cols-5 gap-1">
            {[
              { label: '💪', title: tr(language, 'Protein', 'بروتين'), pctVal: proteinPct, color: 'bg-sky-400' },
              { label: '🚀', title: tr(language, 'Carbs', 'طاقة'), pctVal: carbsPct, color: 'bg-amber-400' },
              { label: '🧠', title: tr(language, 'Fats', 'دهون'), pctVal: fatsPct, color: 'bg-yellow-300' },
              { label: '🛡️', title: tr(language, 'Vitamins', 'فيتامين'), pctVal: vitPct, color: 'bg-emerald-400' },
              { label: '🌿', title: tr(language, 'Fiber', 'ألياف'), pctVal: fiberPct, color: 'bg-pink-400' }
            ].map((bar) => (
              <div key={bar.label} title={bar.title} className="p-1 rounded-lg bg-slate-950/80 border border-slate-800 space-y-0.5 text-center">
                <div className="text-[10px] font-black text-slate-200 leading-none">
                  {bar.label} {bar.pctVal}%
                </div>
                <div className="h-1.5 rounded-full bg-slate-900 overflow-hidden">
                  <div className={`h-full ${bar.color} rounded-full transition-all`} style={{ width: `${bar.pctVal}%` }} />
                </div>
              </div>
            ))}
          </div>

          {/* Packed Meal Tray Chips */}
          <div className="flex-1 min-h-0 overflow-y-auto rounded-xl bg-slate-950/75 border border-slate-700/80 p-1.5">
            {packed.length === 0 ? (
              <div className="h-full flex items-center justify-center text-[11px] text-slate-400 text-center px-2">
                {tr(language, 'Tray empty — pick safe snacks from pantry ▶', 'الصينية فارغة — اختر وجبات آمنة من اليمين')}
              </div>
            ) : (
              <div className="flex flex-wrap gap-1">
                {packed.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggleItem(p)}
                    className="px-2 py-0.5 rounded-lg bg-emerald-950/85 border border-emerald-400/70 text-[10.5px] font-bold text-white flex items-center gap-1 cursor-pointer hover:bg-rose-950/70"
                    title={tr(language, 'Tap to remove', 'اضغط للإزالة')}
                  >
                    <span>{p.icon}</span>
                    <span>{tr(language, p.nameEn, p.nameAr).split(' (')[0]}</span>
                    <span className="text-rose-300">✕</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      }
      rightHeader={
        <div className="flex items-center justify-between gap-2 text-xs font-hud font-black">
          <span className="text-cyan-200 truncate">
            {tr(language, `🥫 Pantry (${PANTRY_ENTRIES.length}) • ${packed.length}/4+ Packed`, `🥫 المخزن (${PANTRY_ENTRIES.length}) • المحزوم: ${packed.length}/4+`)}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-sky-950 border border-sky-400/50 text-sky-200">
              🇪🇬 {sinaiEgCount} • {totalKcal} kcal
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] ${
                safetyAlert ? 'bg-rose-600 text-white' : 'bg-emerald-500 text-slate-950'
              }`}
            >
              {safetyAlert ? tr(language, 'Hazard ⚠️', 'تحذير ⚠️') : tr(language, 'Clean ✅', 'آمن ✅')}
            </span>
          </div>
        </div>
      }
      rightContent={
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          {PANTRY_ENTRIES.map((entry) => {
            const isSelected = selectedIds.includes(entry.id);
            const displayName = tr(language, entry.nameEn, entry.nameAr);
            return (
              <button
                key={entry.id}
                type="button"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', entry.id);
                  e.dataTransfer.effectAllowed = 'copy';
                }}
                data-testid={`pantry-item-${entry.id}`}
                onClick={() => toggleItem(entry)}
                className={`p-2 rounded-xl border-2 flex items-center gap-1.5 transition-all cursor-pointer ${
                  language === 'ar' ? 'text-right' : 'text-left'
                } ${
                  entry.isBanned
                    ? 'bg-rose-950/45 border-rose-500/75 hover:bg-rose-900/60'
                    : isSelected
                    ? 'bg-emerald-950/75 border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                    : 'bg-slate-800/85 border-slate-700 hover:border-cyan-400'
                }`}
              >
                {entry.svgAsset ? (
                  <img src={entry.svgAsset} alt={displayName} className="w-7 h-7 object-contain shrink-0" />
                ) : (
                  <span className="text-xl shrink-0">{entry.icon}</span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-hud font-black text-[11px] text-white truncate">{displayName}</div>
                  <div className="flex items-center justify-between gap-1 text-[10px] font-bold mt-0.5">
                    {entry.isBanned ? (
                      <span className="text-rose-300 truncate">{tr(language, '⚠️ Hazard', '⚠️ خطر')}</span>
                    ) : (
                      <span className="text-cyan-200 truncate">
                        {tr(language, entry.originBadgeEn || entry.originBadge || '', entry.originBadge || '')}
                      </span>
                    )}
                    <span className="text-amber-300 shrink-0">{entry.weightKg}kg</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      }
      primaryCta={
        <div className="space-y-1">
          <button
            type="button"
            disabled={!isBalanced}
            onClick={() => {
              soundManager.playFanfare();
              setFoodMissionDone(true);
              void dialogueManager.speak(
                tr(
                  language,
                  'Awesome! Your zero-crumb mission tray is balanced and packed for launch!',
                  'عاش يا بطل! الوجبة متوازنة وتجمع أكلات مصر وسيناء الآمنة بدون فتات!'
                )
              );
              onComplete(selectedIds, totalKg);
            }}
            className={`w-full py-2.5 rounded-xl font-hud font-black text-xs sm:text-sm border-2 transition-all ${
              isBalanced
                ? 'bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 border-white cursor-pointer hover:brightness-110'
                : 'bg-slate-800 text-slate-400 border-slate-700 cursor-not-allowed'
            }`}
          >
            {isBalanced
              ? tr(language, 'Confirm Safe Space Meals & Seal Crate 🚀', 'تأكيد تعبئة الطعام الآمن وإغلاق الصندوق 🚀')
              : tr(language, `Add 4+ varied safe foods (${packed.length}/4)`, `أضف 4+ أصناف آمنة (${packed.length}/4)`)}
          </button>

          {foodMissionDone && (
            <div
              data-testid="mission-complete-cta"
              className="px-2.5 py-1 rounded-lg bg-emerald-950/90 border border-emerald-400 text-center font-hud font-black text-[11px] text-emerald-200"
            >
              {tr(language, '✓ Mission rations sealed!', '✓ تم حفظ وجبات البعثة بنجاح!')}
            </div>
          )}
        </div>
      }
    />
  );
};

// ---------------------------------------------------------------------------
// 1.2 EQUIPMENT & INSPECTION (Accept Valid Gear / Reject Faulty Items)
// ---------------------------------------------------------------------------
const EquipmentInspectionScene: React.FC<{
  campaign: CampaignProgressState;
  onUpdateCampaign?: (patch: Partial<CampaignProgressState>) => void;
  onComplete: (packedIds: string[]) => void;
}> = ({ campaign, onUpdateCampaign, onComplete }) => {
  const { language } = useGameState();
  const [decisions, setDecisions] = useState<Record<string, 'packed' | 'rejected'>>(() => {
    const init: Record<string, 'packed' | 'rejected'> = {};
    campaign.l1EquipmentPacked.forEach((id) => {
      init[id] = 'packed';
    });
    return init;
  });
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleDecide = (item: EquipInspectionItem, choice: 'packed' | 'rejected') => {
    const correct = (choice === 'packed' && item.shouldPack) || (choice === 'rejected' && !item.shouldPack);
    const reason = tr(language, item.reasonEn, item.reasonAr);
    if (!correct) {
      soundManager.playAlertSiren();
      setFeedback(`⚠️ ${tr(language, 'Watch out!', 'انتبه!')} ${reason}`);
      return;
    }
    soundManager.playDropSuccess();
    setFeedback(`✅ ${tr(language, 'Great decision:', 'قرار سليم:')} ${reason}`);
    setDecisions((prev) => ({ ...prev, [item.id]: choice }));
  };

  const validItemsCount = EQUIP_INSPECTION_LIST.filter((i) => i.shouldPack).length;
  const EQUIP_MASS_KG: Record<string, number> = {
    med_kit: 3.5,
    tool_set: 4.5,
    comms_headset: 2.0,
    oxygen_gauge: 3.0,
    sleep_bag: 4.0,
    game_console: 6.5,
    broken_helmet: 5.5
  };
  const packedKg = EQUIP_INSPECTION_LIST.reduce(
    (sum, item) => sum + (decisions[item.id] === 'packed' ? (EQUIP_MASS_KG[item.id] ?? 3.0) : 0),
    0
  );
  const maxEquipKg = 18;
  const beamTiltDeg = Math.max(-14, Math.min(14, (packedKg - maxEquipKg) * 2.4));
  const resolvedCorrectly = EQUIP_INSPECTION_LIST.every((item) => {
    const d = decisions[item.id];
    return (item.shouldPack && d === 'packed') || (!item.shouldPack && d === 'rejected');
  });
  const resolvedCount = Object.keys(decisions).length;

  return (
    <StationLandscapeFrame
      accentBorderClass="border-amber-400/65"
      roboTip={tr(
        language,
        'Pack certified gear (≤18 kg), reject unsafe mass & set SPACE-FIT X mode.',
        'احزم المعدات السليمة (≤18 كجم) وارفض التالف واضبط قوة البدلة.'
      )}
      leftStage={
        <div className="flex-1 min-h-0 flex flex-col justify-between gap-2 overflow-hidden">
          {/* Interactive Launch Loadout Balance Beam (<= 18 kg) */}
          <div className="rounded-xl bg-slate-950/90 border border-amber-400/40 p-2 space-y-1 shrink-0">
            <div className="flex items-center justify-between text-[11px] font-hud font-black">
              <span className={packedKg > maxEquipKg ? 'text-rose-300' : 'text-emerald-300'}>
                {tr(
                  language,
                  `⚖️ Loadout: ${packedKg.toFixed(1)} / ${maxEquipKg} kg`,
                  `⚖️ الحمولة: ${packedKg.toFixed(1)} / ${maxEquipKg} كجم`
                )}
              </span>
              <span className="text-slate-300">
                {packedKg > maxEquipKg
                  ? tr(language, 'Overweight!', 'وزن زائد!')
                  : resolvedCorrectly
                  ? tr(language, 'Balanced ✓', 'متوازن ✓')
                  : tr(language, 'Within Limit', 'ضمن الحد')}
              </span>
            </div>
            <svg viewBox="0 0 260 50" className="w-full h-11 overflow-visible">
              <defs>
                <linearGradient id="equipBeamGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="50%" stopColor={packedKg > maxEquipKg ? '#f43f5e' : '#34d399'} />
                  <stop offset="100%" stopColor="#fbbf24" />
                </linearGradient>
                <linearGradient id="equipFulcrum" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#94a3b8" />
                  <stop offset="100%" stopColor="#1e293b" />
                </linearGradient>
              </defs>
              <rect x="34" y="43" width="192" height="4" rx="2" fill="#334155" />
              <line x1="60" y1="26" x2="60" y2="44" stroke="rgba(56,189,248,0.45)" strokeWidth="3" strokeDasharray="3 2" />
              <line x1="200" y1="26" x2="200" y2="44" stroke="rgba(251,191,36,0.45)" strokeWidth="3" strokeDasharray="3 2" />
              <polygon points="130,23 118,44 142,44" fill="url(#equipFulcrum)" stroke="#64748b" strokeWidth="1" />
              <circle cx="130" cy="23" r="4" fill="#e2e8f0" />
              <g transform={`rotate(${beamTiltDeg}, 130, 23)`}>
                <rect x="26" y="19" width="208" height="7" rx="3.5" fill="url(#equipBeamGrad)" />
                <rect x="34" y="3" width="46" height="15" rx="4" fill="#0284c7" stroke="#7dd3fc" strokeWidth="1.2" />
                <rect x="180" y="3" width="46" height="15" rx="4" fill="#d97706" stroke="#fde047" strokeWidth="1.2" />
              </g>
            </svg>
          </div>

          {feedback && (
            <div className="px-2.5 py-1.5 rounded-xl bg-slate-950/95 border border-cyan-500/45 text-[11px] font-bold text-cyan-100 line-clamp-2 shrink-0">
              {feedback}
            </div>
          )}

          {/* Kid-Friendly Space Suit Power Selector (no clinical sliders) */}
          {onUpdateCampaign && (
            <div
              data-testid="kid-suit-power-card"
              className="rounded-xl bg-slate-950/85 border border-cyan-400/40 p-2 space-y-1.5 shrink-0"
            >
              <p className="font-hud font-black text-[11px] text-cyan-200">
                {tr(language, '🦺 Space Suit Power Mode:', '🦺 قوة بدلتك الفضائية:')}
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {(
                  [
                    { mode: 'level1' as const, comp: 'low' as const, load: 35, en: '🌱 Light', ar: '🌱 خفيف' },
                    { mode: 'level2' as const, comp: 'medium' as const, load: 65, en: '🚀 Hero', ar: '🚀 بطل' },
                    { mode: 'level3' as const, comp: 'high' as const, load: 90, en: '⚡ Super', ar: '⚡ خارق' }
                  ]
                ).map((opt) => {
                  const cur = campaign.spaceFitX || initialSpaceFitXState;
                  const selected = cur.resistanceMode === opt.mode;
                  return (
                    <button
                      key={opt.mode}
                      type="button"
                      onClick={() => {
                        soundManager.playClick();
                        onUpdateCampaign({
                          spaceFitX: {
                            ...cur,
                            resistanceMode: opt.mode,
                            compressionLevel: opt.comp,
                            emergencyReleased: false,
                            muscleLoadPct: opt.load,
                            jointLoads: {
                              shoulders: opt.load,
                              elbows: opt.load,
                              hips: opt.load,
                              knees: opt.load,
                              ankles: opt.load
                            }
                          }
                        });
                      }}
                      className={`py-1.5 px-2 rounded-xl font-hud font-black text-[11px] border-2 transition-all cursor-pointer ${
                        selected
                          ? 'bg-gradient-to-r from-cyan-400 to-sky-300 text-slate-950 border-white shadow-[0_0_12px_rgba(34,211,238,0.45)]'
                          : 'bg-slate-900 text-slate-200 border-slate-700 hover:border-cyan-400'
                      }`}
                    >
                      {tr(language, opt.en, opt.ar)}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playClick();
                    const cur = campaign.spaceFitX || initialSpaceFitXState;
                    onUpdateCampaign({
                      spaceFitX: {
                        ...cur,
                        impactProtectionActive: !cur.impactProtectionActive
                      }
                    });
                  }}
                  className={`py-1.5 px-2 rounded-xl font-hud font-black text-[11px] border-2 cursor-pointer transition-all truncate ${
                    (campaign.spaceFitX || initialSpaceFitXState).impactProtectionActive
                      ? 'bg-emerald-500/25 border-emerald-400 text-emerald-100'
                      : 'bg-slate-900 border-slate-700 text-slate-300'
                  }`}
                >
                  🛡️ {tr(language, 'Cushion Pads', 'وسائد الحماية')} {(campaign.spaceFitX || initialSpaceFitXState).impactProtectionActive ? '✓' : ''}
                </button>
              </div>
            </div>
          )}
        </div>
      }
      rightHeader={
        <div className="flex items-center justify-between gap-2 text-xs font-hud font-black">
          <span className="text-amber-200 truncate">
            {tr(
              language,
              `🧰 Inspect Cargo (${resolvedCount}/${EQUIP_INSPECTION_LIST.length})`,
              `🧰 فحص المعدات (${resolvedCount}/${EQUIP_INSPECTION_LIST.length})`
            )}
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-950 border border-amber-400 text-amber-200 shrink-0">
            {tr(language, `Valid: ${validItemsCount}`, `صالحة: ${validItemsCount}`)}
          </span>
        </div>
      }
      rightContent={
        <div className="grid grid-cols-2 gap-1.5">
          {EQUIP_INSPECTION_LIST.map((item) => {
            const d = decisions[item.id];
            return (
              <div
                key={item.id}
                className={`p-2 rounded-xl border-2 flex flex-col justify-between gap-1.5 transition-all ${
                  d === 'packed'
                    ? 'bg-emerald-950/60 border-emerald-400'
                    : d === 'rejected'
                    ? 'bg-slate-950/70 border-slate-600 opacity-85'
                    : 'bg-slate-800/85 border-slate-600'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xl shrink-0">{item.icon}</span>
                  <div className="min-w-0">
                    <div className="font-hud font-black text-[11px] text-white truncate">
                      {tr(language, item.nameEn, item.nameAr)}
                    </div>
                    <div className="text-[10px] text-slate-300 truncate">
                      {tr(language, item.bayEn, item.bay)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleDecide(item, 'packed')}
                    className={`flex-1 py-1 rounded-lg text-[11px] font-black flex items-center justify-center gap-1 cursor-pointer border ${
                      d === 'packed'
                        ? 'bg-emerald-500 text-slate-950 border-white'
                        : 'bg-slate-900 hover:bg-emerald-900/60 text-emerald-200 border-emerald-500/50'
                    }`}
                  >
                    <PackageCheck className="w-3 h-3 shrink-0" />
                    <span>{d === 'packed' ? tr(language, 'Packed', 'حُزم') : tr(language, 'Pack', 'احزم')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDecide(item, 'rejected')}
                    className={`flex-1 py-1 rounded-lg text-[11px] font-black flex items-center justify-center gap-1 cursor-pointer border ${
                      d === 'rejected'
                        ? 'bg-rose-500 text-white border-white'
                        : 'bg-slate-900 hover:bg-rose-900/60 text-rose-200 border-rose-500/50'
                    }`}
                  >
                    <XCircle className="w-3 h-3 shrink-0" />
                    <span>{d === 'rejected' ? tr(language, 'Rejected', 'رُفض') : tr(language, 'Reject', 'ارفض')}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      }
      primaryCta={
        <button
          type="button"
          disabled={!resolvedCorrectly}
          onClick={() => {
            soundManager.playFanfare();
            void dialogueManager.speak(
              tr(
                language,
                'Excellent! You verified certified equipment and rejected unsafe mass!',
                'ممتاز! فرزت المعدات السليمة واستبعدت الأوزان والأشياء التالفة بنجاح!'
              )
            );
            onComplete(EQUIP_INSPECTION_LIST.filter((i) => i.shouldPack).map((i) => i.id));
          }}
          className={`w-full py-2.5 rounded-xl font-hud font-black text-xs sm:text-sm border-2 ${
            resolvedCorrectly
              ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 border-white cursor-pointer'
              : 'bg-slate-800 text-slate-400 border-slate-700 cursor-not-allowed'
          }`}
        >
          {tr(language, 'Confirm Equipment Inspection ✅', 'تأكيد فحص وحزم المعدات ✅')}
        </button>
      }
    />
  );
};

// ---------------------------------------------------------------------------
// 1.5 MISSION CONTROL & FINAL LAUNCH (Rocket Window + Fault Fix + Countdown)
// ---------------------------------------------------------------------------
const MissionControlLaunchScene: React.FC<{
  campaign: CampaignProgressState;
  onComplete: () => void;
  onNextLevel: () => void;
  onBackToLevel: () => void;
}> = ({ campaign, onComplete, onNextLevel, onBackToLevel }) => {
  const { language } = useGameState();
  const [navSynced, setNavSynced] = useState(false);
  const [loxPct, setLoxPct] = useState(52);
  const [lh2Pct, setLh2Pct] = useState(56);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [launchSuccess, setLaunchSuccess] = useState(
    campaign.completedMiniGames.includes('l1_mission_launch')
  );
  const timersRef = useRef<number[]>([]);
  const gantryCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  const propCalibrated = loxPct >= 68 && loxPct <= 84 && lh2Pct >= 68 && lh2Pct <= 84;
  const isDemoUnlocked = campaign.unlockedLevels.length >= 4;
  const reqFood = campaign.completedMiniGames.includes('l1_food_prep') || isDemoUnlocked;
  const reqEquip = campaign.completedMiniGames.includes('l1_equipment_prep') || isDemoUnlocked;
  const reqMed = campaign.completedMiniGames.includes('l1_medical_check') || isDemoUnlocked;
  const reqShip = propCalibrated || isDemoUnlocked || launchSuccess;
  const canLaunch = reqFood && reqEquip && reqMed && reqShip && navSynced;

  useEffect(() => {
    const canvas = gantryCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let rafId = 0;
    const startMs = performance.now();
    const render = () => {
      rafId = window.requestAnimationFrame(render);
      const t = (performance.now() - startMs) / 1000;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Night-to-twilight launchpad sky gradient & stars
      const bg = ctx.createLinearGradient(0, 0, 0, canvas.height);
      bg.addColorStop(0, '#020617');
      bg.addColorStop(0.65, '#1e1b4b');
      bg.addColorStop(1, '#312e81');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (let st = 0; st < 18; st++) {
        ctx.fillStyle = `rgba(226, 232, 240, ${0.28 + Math.sin(t * 2 + st) * 0.25})`;
        ctx.fillRect((st * 37) % canvas.width, 6 + ((st * 19) % 68), 1.8, 1.8);
      }

      // Open-Lattice Red Steel Umbilical Gantry Tower + Diagonal Cross-Bracing
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 2.4;
      ctx.strokeRect(32, 18, 22, 128);
      for (let ty = 22; ty < 138; ty += 14) {
        ctx.beginPath();
        ctx.moveTo(32, ty);
        ctx.lineTo(54, ty + 14);
        ctx.moveTo(54, ty);
        ctx.lineTo(32, ty + 14);
        ctx.stroke();
      }
      // Retractable Crew Access + Umbilical Swing Arms
      const armRetract = launchSuccess || (countdown !== null && countdown <= 1) ? -22 : 0;
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(54, 48);
      ctx.lineTo(96 + armRetract, 48);
      ctx.moveTo(54, 82);
      ctx.lineTo(96 + armRetract * 0.85, 82);
      ctx.stroke();

      const liftY = launchSuccess ? -52 : countdown !== null ? Math.sin(t * 28) * 1.5 : 0;
      const rx = 104;
      const ry = 36 + liftY;

      // Cryogenic LOX vent steam wisps
      for (let i = 0; i < 8; i++) {
        const wispX = rx + 8 + Math.sin(t * 2.4 + i) * 18;
        const wispY = ry + 28 + ((t * 18 + i * 9) % 44);
        ctx.fillStyle = `rgba(186, 230, 253, ${0.18 + (i % 3) * 0.06})`;
        ctx.beginPath();
        ctx.arc(wispX, wispY, 4 + (i % 3) * 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Multi-layered Incandescent Mach-Diamond Rocket Exhaust Plume
      if (launchSuccess || countdown !== null) {
        const flameH = launchSuccess ? 62 + Math.sin(t * 32) * 8 : 30 + Math.sin(t * 25) * 6;
        const outerFlame = ctx.createRadialGradient(rx + 8, ry + 90, 4, rx + 8, ry + 98, flameH);
        outerFlame.addColorStop(0, '#fef08a');
        outerFlame.addColorStop(0.45, '#f97316');
        outerFlame.addColorStop(1, 'rgba(239, 68, 68, 0)');
        ctx.fillStyle = outerFlame;
        ctx.beginPath();
        ctx.moveTo(rx - 14, ry + 84);
        ctx.lineTo(rx + 30, ry + 84);
        ctx.lineTo(rx + 8, ry + 86 + flameH);
        ctx.closePath();
        ctx.fill();

        // Twin Shockwave Mach Diamonds
        [0, 1].forEach((dIdx) => {
          const dy = ry + 92 + dIdx * 14 + Math.sin(t * 38 + dIdx) * 1.5;
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.moveTo(rx + 8, dy - 4);
          ctx.lineTo(rx + 12, dy);
          ctx.lineTo(rx + 8, dy + 4);
          ctx.lineTo(rx + 4, dy);
          ctx.closePath();
          ctx.fill();
        });
      }

      // Twin Sculpted Solid Rocket Boosters + Metallic Cones + Segmented Bands
      [-8, 16].forEach((bx) => {
        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.roundRect(rx + bx, ry + 20, 8, 66, 2);
        ctx.fill();
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(rx + bx, ry + 32, 8, 4);
        ctx.fillRect(rx + bx, ry + 64, 8, 4);
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.moveTo(rx + bx + 4, ry + 11);
        ctx.lineTo(rx + bx, ry + 20);
        ctx.lineTo(rx + bx + 8, ry + 20);
        ctx.closePath();
        ctx.fill();
      });

      // Shaded Orange Artemis Core Tank & Interstage
      const coreGrad = ctx.createLinearGradient(rx, 0, rx + 16, 0);
      coreGrad.addColorStop(0, '#c2410c');
      coreGrad.addColorStop(0.45, '#fb923c');
      coreGrad.addColorStop(1, '#9a3412');
      ctx.fillStyle = coreGrad;
      ctx.fillRect(rx, ry + 12, 16, 74);

      // White Upper Stage & Orion Launch Abort Tower
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.moveTo(rx + 8, ry - 9);
      ctx.lineTo(rx, ry + 12);
      ctx.lineTo(rx + 16, ry + 12);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(rx + 8, ry - 9);
      ctx.lineTo(rx + 8, ry - 18);
      ctx.stroke();

      // Reinforced Flame Trench Deck & Floodlights
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(14, 144, canvas.width - 28, 14);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(22, 144, 10, 3);
      ctx.fillRect(canvas.width - 34, 144, 10, 3);
    };
    render();
    return () => window.cancelAnimationFrame(rafId);
  }, [countdown, launchSuccess]);

  const startCountdown = () => {
    if (!canLaunch || countdown !== null) return;
    soundManager.playClick();
    setCountdown(3);
    timersRef.current.push(window.setTimeout(() => setCountdown(2), 800));
    timersRef.current.push(window.setTimeout(() => setCountdown(1), 1600));
    timersRef.current.push(
      window.setTimeout(() => {
        setCountdown(0);
        setLaunchSuccess(true);
        soundManager.playFanfare();
        confetti({ particleCount: 160, spread: 95, origin: { y: 0.6 } });
        void dialogueManager.speak(
          tr(
            language,
            'Liftoff! Rocket launched successfully on a trajectory to the Moon!',
            'عاش يا بطل! تم إطلاق الصاروخ بنجاح وانطلقت الرحلة إلى القمر!'
          )
        );
        onComplete();
      }, 2400)
    );
  };

  return (
    <StationLandscapeFrame
      accentBorderClass="border-purple-400/70"
      roboTip={tr(
        language,
        'Calibrate LOX/LH2 valves to 68%–84%, sync navigation, then ignite countdown!',
        'اضبط صمامات LOX وLH2 بين 68%–84% وزامن الملاحة ثم ابدأ العد التنازلي!'
      )}
      leftStage={
        <div className="flex-1 min-h-0 flex flex-col justify-between gap-1.5 overflow-hidden">
          <div className="flex items-center justify-between text-[11px] font-black text-cyan-200 shrink-0">
            <span>{tr(language, '🪟 Artemis Gantry Live View', '🪟 منصة أرتميس المباشرة')}</span>
            <span className={launchSuccess ? 'text-emerald-300' : canLaunch ? 'text-amber-300' : 'text-slate-300'}>
              {launchSuccess
                ? tr(language, '🔥 Ascending!', '🔥 انطلق للمدار!')
                : canLaunch
                ? tr(language, 'Go Ignition', 'جاهز للإطلاق')
                : tr(language, 'Hold', 'تجهيز')}
            </span>
          </div>

          <div className="relative flex-1 min-h-0 rounded-xl bg-slate-950 border border-cyan-500/35 overflow-hidden flex items-center justify-center">
            <canvas
              ref={gantryCanvasRef}
              width={216}
              height={162}
              className="w-full h-full object-contain block"
            />
            {countdown !== null && countdown > 0 && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950/45 pointer-events-none">
                <span className="font-hud font-black text-5xl sm:text-6xl text-amber-300 animate-bounce drop-shadow-[0_0_18px_rgba(251,191,36,0.9)]">
                  {countdown}
                </span>
              </div>
            )}
          </div>
        </div>
      }
      rightHeader={
        <div className="flex items-center justify-between text-xs font-hud font-black text-white">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            {tr(language, 'Pre-Launch Checklist & Propellant', 'قائمة الإطلاق ومعايرة الوقود')}
          </span>
          <span className={propCalibrated ? 'text-emerald-300' : 'text-amber-300'}>
            {propCalibrated ? tr(language, 'Valves Sealed ✓', 'الصمامات متزنة ✓') : tr(language, 'Target: 68%–84%', 'الهدف: 68%–84%')}
          </span>
        </div>
      }
      rightContent={
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-1.5 text-[11px] font-hud font-black">
            {[
              { ok: reqFood, label: tr(language, '1. Food Pantry', '1. مخزن الطعام') },
              { ok: reqEquip, label: tr(language, '2. Gear Check', '2. فحص المعدات') },
              { ok: reqMed, label: tr(language, '3. Medical OK', '3. الفحص الطبي') },
              { ok: reqShip, label: tr(language, '4. LOX/LH2 Propellant', '4. صمامات الوقود') }
            ].map((r) => (
              <div
                key={r.label}
                className={`p-2 rounded-xl border-2 flex items-center gap-1.5 ${
                  r.ok ? 'bg-emerald-950/70 border-emerald-400 text-emerald-200' : 'bg-rose-950/50 border-rose-500 text-rose-200'
                }`}
              >
                {r.ok ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
                <span className="truncate">{r.label}</span>
              </div>
            ))}
          </div>

          <div className="p-2 rounded-xl bg-slate-950/85 border border-cyan-500/40 grid grid-cols-2 gap-2 text-[11px]">
            <label className="space-y-0.5 block">
              <span className="flex justify-between font-bold text-sky-200">
                <span>{tr(language, 'LOX Oxygen', 'الأكسجين LOX')}</span>
                <span className={loxPct >= 68 && loxPct <= 84 ? 'text-emerald-300' : 'text-amber-300'}>{loxPct}%</span>
              </span>
              <input
                type="range"
                min={30}
                max={100}
                value={loxPct}
                onChange={(e) => setLoxPct(Number(e.target.value))}
                className="w-full accent-sky-400 cursor-pointer"
              />
            </label>
            <label className="space-y-0.5 block">
              <span className="flex justify-between font-bold text-amber-200">
                <span>{tr(language, 'LH2 Hydrogen', 'الهيدروجين LH2')}</span>
                <span className={lh2Pct >= 68 && lh2Pct <= 84 ? 'text-emerald-300' : 'text-amber-300'}>{lh2Pct}%</span>
              </span>
              <input
                type="range"
                min={30}
                max={100}
                value={lh2Pct}
                onChange={(e) => setLh2Pct(Number(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </label>
          </div>

          <div
            className={`p-2 rounded-xl border-2 flex items-center justify-between gap-2 ${
              navSynced ? 'bg-emerald-950/60 border-emerald-400' : 'bg-amber-950/50 border-amber-400'
            }`}
          >
            <div className="text-[11px] font-bold text-white flex items-center gap-1.5 min-w-0">
              <Radio className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span className="truncate">
                {navSynced
                  ? tr(language, 'Navigation telemetry synced!', 'تمت مزامنة الملاحة بنجاح!')
                  : tr(language, 'Sync navigation link before ignition', 'زامن بيانات الملاحة قبل الإطلاق')}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                soundManager.playCrystalSparkle();
                setNavSynced(true);
              }}
              className={`px-3 py-1 rounded-lg text-[11px] font-black cursor-pointer shrink-0 ${
                navSynced ? 'bg-emerald-500 text-slate-950' : 'bg-amber-400 hover:bg-amber-300 text-slate-950'
              }`}
            >
              {navSynced ? tr(language, 'Synced ✓', 'متزامن ✓') : tr(language, 'Sync Nav 🛰️', 'مزامنة 🛰️')}
            </button>
          </div>
        </div>
      }
      primaryCta={
        launchSuccess ? (
          <div className="p-2 rounded-xl bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-950 border-2 border-emerald-300 flex items-center justify-between gap-2">
            <span className="font-hud font-black text-xs sm:text-sm text-amber-300 truncate">
              {tr(language, 'LIFTOFF CONFIRMED! Level 2 Unlocked 🚀🌕', 'تم الإقلاع! فُتح المستوى الثاني 🚀🌕')}
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={onNextLevel}
                data-testid="mission-next-level-btn"
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-300 to-orange-400 text-slate-950 font-hud font-black text-xs border border-white cursor-pointer"
              >
                {tr(language, 'Advance to Level 2 🚀', 'للمستوى الثاني 🚀')}
              </button>
              <button
                type="button"
                onClick={onBackToLevel}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 text-white font-hud font-bold text-xs border border-cyan-400 cursor-pointer"
              >
                {tr(language, 'Deck', 'الخريطة')}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            disabled={!canLaunch || countdown !== null}
            onClick={startCountdown}
            className={`w-full py-2.5 rounded-xl font-hud font-black text-xs sm:text-sm border-2 flex items-center justify-center gap-2 ${
              canLaunch
                ? 'bg-gradient-to-r from-purple-500 via-pink-500 to-amber-500 text-white border-white cursor-pointer hover:brightness-110 shadow-[0_0_20px_rgba(168,85,247,0.45)]'
                : 'bg-slate-800 text-slate-400 border-slate-700 cursor-not-allowed'
            }`}
          >
            <Rocket className="w-4 h-4" />
            <span>
              {canLaunch
                ? tr(language, 'INITIATE LAUNCH (3-2-1) 🚀', 'ابدأ العد التنازلي والإطلاق (3-2-1) 🚀')
                : tr(language, 'Complete checks, calibrate valves & sync nav 🔒', 'أكمل الفحص والمعايرة والمزامنة 🔒')}
            </span>
          </button>
        )
      }
    />
  );
};

export const Level1MiniGames: React.FC<Level1Props> = ({
  miniGameId,
  campaign,
  onCompleteMiniGame,
  onUpdateCampaign,
  onNextLevel,
  onBackToLevel
}) => {
  const { language } = useGameState();
  const [hydrationFixed, setHydrationFixed] = useState(campaign.l1MedicalCleared);
  const [hydrationHoldMs, setHydrationHoldMs] = useState(campaign.l1MedicalCleared ? 1500 : 0);
  const [sleepBedHour, setSleepBedHour] = useState<number>(campaign.l1MedicalCleared ? 22 : 24);
  const [sleepFixed, setSleepFixed] = useState(campaign.l1MedicalCleared);
  const holdTimerRef = useRef<number | null>(null);
  const [checkedShip, setCheckedShip] = useState<string[]>(
    campaign.l1SpaceshipInspected ? L1_SHIP_SYSTEMS.map((s) => s.id) : []
  );

  useEffect(() => {
    return () => {
      if (holdTimerRef.current !== null) window.clearInterval(holdTimerRef.current);
    };
  }, []);

  const startHydrationHold = () => {
    if (hydrationFixed || holdTimerRef.current !== null) return;
    soundManager.playClick();
    holdTimerRef.current = window.setInterval(() => {
      setHydrationHoldMs((prev) => {
        const next = prev + 100;
        if (next >= 1500) {
          if (holdTimerRef.current !== null) {
            window.clearInterval(holdTimerRef.current);
            holdTimerRef.current = null;
          }
          soundManager.playDropSuccess();
          setHydrationFixed(true);
          return 1500;
        }
        return next;
      });
    }, 90);
  };

  const stopHydrationHold = () => {
    if (holdTimerRef.current !== null) {
      window.clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  };

  if (miniGameId === 'l1_food_prep') {
    return (
      <FoodPackingScene
        campaign={campaign}
        onComplete={(ids, weightKg) =>
          onCompleteMiniGame('l1_food_prep', { l1SelectedFoodIds: ids, l1FoodWeightKg: weightKg })
        }
      />
    );
  }

  if (miniGameId === 'l1_equipment_prep') {
    return (
      <EquipmentInspectionScene
        campaign={campaign}
        onUpdateCampaign={onUpdateCampaign}
        onComplete={(packedIds) =>
          onCompleteMiniGame('l1_equipment_prep', { l1EquipmentPacked: packedIds })
        }
      />
    );
  }

  if (miniGameId === 'l1_medical_check') {
    const nutritionReady =
      campaign.completedMiniGames.includes('l1_food_prep') || campaign.unlockedLevels.length >= 4;
    const allClear = nutritionReady && hydrationFixed && sleepFixed;

    return (
      <StationLandscapeFrame
        accentBorderClass="border-pink-400/65"
        roboTip={tr(
          language,
          'Hold the hydration valve for 1.5s and slide bedtime to 10 PM (8h sleep)!',
          'اضغط مطوّلاً على صمام الترطيب 1.5ث واسحب النوم إلى 10 مساءً (8 ساعات)!'
        )}
        leftStage={
          <div className="flex-1 min-h-0 flex flex-col justify-between gap-1.5 overflow-hidden">
            <BodyTelemetryMeters
              compact
              language={language}
              titleEn="Pre-Flight Biometrics"
              titleAr="المؤشرات الحيوية"
              metrics={[
                { key: 'hydration', value: hydrationFixed ? 96 : 62 },
                { key: 'muscle', value: sleepFixed ? 92 : 65 }
              ]}
            />
            <div className="px-2 py-1.5 rounded-xl bg-emerald-950/45 border border-emerald-400/40 text-[10.5px] text-emerald-100 flex items-center justify-between gap-1.5 shrink-0">
              <span className="truncate">
                💊 {tr(language, 'Ca, Vit D/K/C/B12, Fe, Mg, K, Omega-3 & Zinc', 'الكالسيوم، فيتامينات D/K/C/B12، الحديد، المغنيسيوم وأوميغا-3')}
              </span>
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-emerald-900 border border-emerald-400 text-emerald-200 shrink-0">
                {tr(language, SCIENCE_BADGES.ISS_PROVEN.labelEn, SCIENCE_BADGES.ISS_PROVEN.labelAr)}
              </span>
            </div>
          </div>
        }
        rightContent={
          <div className="space-y-2">
            <div className={`p-2 rounded-xl border-2 flex items-center justify-between gap-2 ${nutritionReady ? 'bg-emerald-950/70 border-emerald-400' : 'bg-amber-950/70 border-amber-400'}`}>
              <div className="min-w-0">
                <p className="font-hud font-black text-xs text-white">{tr(language, '🥗 Nutrition Status', '🥗 مؤشر التغذية')}</p>
                <p className="font-hud text-[11px] text-slate-200 truncate">
                  {nutritionReady
                    ? tr(language, 'Balanced pantry stowage verified.', 'مكتمل ومعتمد من مخزن الطعام.')
                    : tr(language, 'Complete Food Pantry station first.', 'أكمل محطة مخزن الطعام أولاً.')}
                </p>
              </div>
              <span className="text-xs font-hud font-black shrink-0">{nutritionReady ? '✅' : '⏳'}</span>
            </div>

            <div className={`p-2 rounded-xl border-2 space-y-1.5 ${hydrationFixed ? 'bg-emerald-950/70 border-emerald-400' : 'bg-rose-950/70 border-rose-400'}`}>
              <div className="flex items-center justify-between gap-2">
                <p className="font-hud font-black text-xs text-white">
                  {tr(language, '💧 Hydration Level', '💧 مؤشر الترطيب')}: {hydrationFixed ? '96% ✅' : `${Math.min(100, Math.round((hydrationHoldMs / 1500) * 100))}%`}
                </p>
                {!hydrationFixed && (
                  <button
                    type="button"
                    onPointerDown={startHydrationHold}
                    onPointerUp={stopHydrationHold}
                    onPointerLeave={stopHydrationHold}
                    className="px-3 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-hud font-black text-[11px] cursor-pointer select-none shrink-0"
                  >
                    {tr(language, 'Hold Valve 1.5s 💧', 'اضغط الصمام 1.5ث 💧')}
                  </button>
                )}
              </div>
              <div className="h-2 w-full rounded-full bg-slate-950 overflow-hidden border border-cyan-500/40">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-100"
                  style={{ width: `${Math.min(100, Math.round((hydrationHoldMs / 1500) * 100))}%` }}
                />
              </div>
            </div>

            <div className={`p-2 rounded-xl border-2 space-y-1 ${sleepFixed ? 'bg-emerald-950/70 border-emerald-400' : 'bg-amber-950/70 border-amber-400'}`}>
              <div className="flex items-center justify-between text-xs font-hud font-black">
                <span className="text-white">{tr(language, '😴 Circadian Sleep (10 PM → 6 AM)', '😴 الساعة البيولوجية (10 م ← 6 ص)')}</span>
                <span className={sleepFixed ? 'text-emerald-300' : 'text-amber-200'}>
                  {sleepBedHour}:00 • {sleepFixed ? '8.0h ✓' : `${Math.max(4, 30 - sleepBedHour - 2).toFixed(0)}h`}
                </span>
              </div>
              <input
                type="range"
                min={20}
                max={24}
                step={1}
                value={sleepBedHour}
                onChange={(e) => {
                  const hr = Number(e.target.value);
                  setSleepBedHour(hr);
                  if (hr <= 22 && hr >= 21) {
                    soundManager.playCrystalSparkle();
                    setSleepFixed(true);
                  } else {
                    setSleepFixed(false);
                  }
                }}
                className="w-full accent-indigo-400 cursor-pointer"
              />
            </div>
          </div>
        }
        primaryCta={
          <button
            type="button"
            disabled={!allClear}
            onClick={() => {
              soundManager.playFanfare();
              void dialogueManager.speak(
                tr(language, 'Flight surgeon clearance granted! Crew is 100% go for launch!', 'أحسنت! الفحص الطبي سليم 100% والطاقم لائق للانطلاق!')
              );
              onCompleteMiniGame('l1_medical_check', { l1MedicalCleared: true });
            }}
            className={`w-full py-2.5 rounded-xl font-hud font-black text-xs sm:text-sm border-2 ${
              allClear
                ? 'bg-gradient-to-r from-emerald-400 to-cyan-500 text-slate-950 border-white cursor-pointer'
                : 'bg-slate-800 text-slate-400 border-slate-700 cursor-not-allowed'
            }`}
          >
            {nutritionReady
              ? tr(language, 'Approve Medical Flight Clearance 🩺', 'اعتماد التصريح الطبي للانطلاق 🩺')
              : tr(language, 'Complete Food Pantry first, then certify medical exam', 'أكمل مخزن الطعام أولاً ثم اعتمد الفحص الطبي')}
          </button>
        }
      />
    );
  }

  if (miniGameId === 'l1_spaceship_inspect') {
    const allChecked = checkedShip.length >= L1_SHIP_SYSTEMS.length;
    const toggleCheck = (id: string) => {
      soundManager.playPressurizeHiss();
      setCheckedShip((prev) => (prev.includes(id) ? prev : [...prev, id]));
    };

    return (
      <StationLandscapeFrame
        accentBorderClass="border-indigo-400/70"
        roboTip={tr(
          language,
          'Inspect all 5 spacecraft life-support and power systems to turn every gauge green!',
          'افحص أنظمة المركبة الخمسة حتى تضيء جميعها باللون الأخضر!'
        )}
        leftStage={
          <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-3 text-center p-2">
            <span className="text-5xl">🛸</span>
            <div className="font-hud font-black text-sm text-indigo-200">
              {tr(
                language,
                `Systems Inspected: ${checkedShip.length}/${L1_SHIP_SYSTEMS.length}`,
                `الأنظمة المفحوصة: ${checkedShip.length}/${L1_SHIP_SYSTEMS.length}`
              )}
            </div>
            <div className="w-full h-3 rounded-full bg-slate-950 border border-indigo-400/50 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-400 to-emerald-400 transition-all"
                style={{ width: `${(checkedShip.length / L1_SHIP_SYSTEMS.length) * 100}%` }}
              />
            </div>
          </div>
        }
        rightContent={
          <div className="grid grid-cols-2 gap-1.5">
            {L1_SHIP_SYSTEMS.map((sys) => {
              const ok = checkedShip.includes(sys.id);
              return (
                <button
                  key={sys.id}
                  type="button"
                  onClick={() => toggleCheck(sys.id)}
                  className={`p-2.5 rounded-xl border-2 flex items-center justify-between gap-2 cursor-pointer transition-all ${
                    ok
                      ? 'bg-emerald-950 border-emerald-400 text-white'
                      : 'bg-slate-800 border-slate-600 text-slate-200 hover:border-cyan-400'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xl shrink-0">{sys.icon}</span>
                    <span className="font-hud font-black text-xs truncate">{tr(language, sys.nameEn, sys.nameAr)}</span>
                  </div>
                  <span className={`text-[11px] font-hud font-black shrink-0 ${ok ? 'text-emerald-300' : 'text-amber-300'}`}>
                    {ok ? tr(language, 'OK ✓', 'سليم ✓') : tr(language, 'Inspect', 'افحص')}
                  </span>
                </button>
              );
            })}
          </div>
        }
        primaryCta={
          <button
            type="button"
            disabled={!allChecked}
            onClick={() => {
              soundManager.playFanfare();
              void dialogueManager.speak(
                tr(language, 'All spacecraft systems green! Proceed to the Launch Pad!', 'أنظمة المركبة خضراء بالكامل! توجه إلى منصة الإطلاق!')
              );
              onCompleteMiniGame('l1_spaceship_inspect', { l1SpaceshipInspected: true });
            }}
            className={`w-full py-2.5 rounded-xl font-hud font-black text-xs sm:text-sm border-2 ${
              allChecked
                ? 'bg-gradient-to-r from-indigo-400 to-cyan-400 text-slate-950 border-white cursor-pointer'
                : 'bg-slate-800 text-slate-400 border-slate-700 cursor-not-allowed'
            }`}
          >
            {tr(language, 'Confirm Spacecraft Readiness 🛸', 'تأكيد سلامة المركبة الفضائية 🛸')}
          </button>
        }
      />
    );
  }

  return (
    <MissionControlLaunchScene
      campaign={campaign}
      onComplete={() => onCompleteMiniGame('l1_mission_launch')}
      onNextLevel={onNextLevel}
      onBackToLevel={onBackToLevel}
    />
  );
};
