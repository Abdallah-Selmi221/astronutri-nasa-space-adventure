import React, { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { AnimatePresence, motion } from 'framer-motion';
import { CampaignProgressState, MiniGameId } from '../../types/game';
import { useGameState } from '../../context/GameContext';
import { tr } from '../../utils/i18n';
import { soundManager } from '../../utils/sound';
import { dialogueManager } from '../../utils/geminiTTS';
import { NASA_ENGINEERING_TRADEOFFS } from '../../services/nasa/nasaOSDR';
import { EGYPTIAN_SINAI_SPACE_FOODS, FOOD_DATABASE } from '../../data/foodItems';
import { DAILY_REFERENCE_ASSUMPTIONS, SCIENCE_BADGES } from '../../data/science';
import { SpaceFitXControlsHUD } from '../suit/SpaceFitXControlsHUD';
import { BodyTelemetryMeters } from './BodyTelemetryMeters';
import { AstronautBioTwin } from './AstronautBioTwin';
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
  const [crumbParticles, setCrumbParticles] = useState<
    Array<{ id: number; emoji: string; x: number; y: number; dx: number; dy: number }>
  >([]);
  const particleTimerRef = useRef<number | null>(null);
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

  return (
    <div className="bg-slate-900/95 border-2 border-emerald-400/70 rounded-3xl p-4 sm:p-5 space-y-4 shadow-2xl">
      {/* Educational Header + Simplified Game Rule Notice */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950/85 rounded-2xl p-3 border border-cyan-500/35">
        <div className="text-xs font-hud font-bold text-slate-200">
          {tr(
            language,
            '🇪🇬 Pick 4+ crumb-free Egyptian, Sinai & NASA foods within 20 kg to balance nutrition:',
            '🇪🇬 اختر أطعمة مصرية وسيناوية وعالمية آمنة بلا فتات لبناء وجبة الفضاء المتوازنة (4+ أصناف ضمن 20 كجم):'
          )}
        </div>
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black border bg-amber-950/80 border-amber-400 text-amber-200">
          {tr(language, 'Educational Sim • Simplified Game Rule', `${SCIENCE_BADGES.GAME_RULE.labelAr} • تبسيط تعليمي`)}
        </span>
      </div>

      {safeToast && (
        <div
          data-testid="food-safe-toast"
          className="p-3 rounded-2xl bg-emerald-950/90 border-2 border-emerald-400 text-emerald-100 font-hud font-black text-xs sm:text-sm flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.28)]"
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{safeToast}</span>
        </div>
      )}

      {safetyAlert && (
        <div
          data-testid="food-hazard-alert"
          className="p-3 rounded-2xl bg-rose-950 border-2 border-rose-400 text-rose-100 font-hud font-bold text-xs sm:text-sm flex items-center gap-2"
        >
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{safetyAlert}</span>
        </div>
      )}

      {/* 3-Column Illustrated Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* LEFT: Pantry Shelves (Egyptian, Sinai, Hydroponic & Warning Items) */}
        <div className="lg:col-span-5 rounded-2xl bg-slate-950/80 border border-slate-700 p-3 space-y-2.5 max-h-[430px] overflow-y-auto">
          <div className="font-hud font-black text-xs text-cyan-200">
            {tr(language, `🥫 Space Pantry (${PANTRY_ENTRIES.length} items)`, `🥫 رفوف المخزن الفضائي (${PANTRY_ENTRIES.length} أصناف)`)}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
            {PANTRY_ENTRIES.map((entry) => {
              const isSelected = selectedIds.includes(entry.id);
              const displayName = tr(language, entry.nameEn, entry.nameAr);
              return (
                <button
                  key={entry.id}
                  type="button"
                  data-testid={`pantry-item-${entry.id}`}
                  onClick={() => toggleItem(entry)}
                  className={`p-2.5 rounded-2xl border-2 flex items-center justify-between gap-2 transition-all cursor-pointer ${
                    language === 'ar' ? 'text-right' : 'text-left'
                  } ${
                    entry.isBanned
                      ? 'bg-rose-950/45 border-rose-500/75 hover:bg-rose-900/60'
                      : isSelected
                      ? 'bg-emerald-950/75 border-emerald-400 shadow-[0_0_16px_rgba(16,185,129,0.35)]'
                      : 'bg-slate-900/85 border-slate-700 hover:border-cyan-400'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {entry.svgAsset ? (
                      <img src={entry.svgAsset} alt={displayName} className="w-10 h-10 object-contain shrink-0" />
                    ) : (
                      <span className="text-2xl shrink-0">{entry.icon}</span>
                    )}
                    <div className="min-w-0">
                      <div className="font-hud font-black text-xs text-white truncate">{displayName}</div>
                      <div className="text-[10px] text-slate-300 truncate">
                        {entry.kcal} kcal • P:{entry.protein}g • C:{entry.carbs}g • F:{entry.fats}g
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end shrink-0 gap-0.5">
                    {entry.originBadge && (
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                        entry.isBanned ? 'bg-rose-900 text-rose-200' : 'bg-cyan-950 text-cyan-200 border border-cyan-500/40'
                      }`}>
                        {tr(language, entry.originBadgeEn || entry.originBadge, entry.originBadge)}
                      </span>
                    )}
                    <span className="text-[10px] font-black text-amber-300">
                      {entry.weightKg} {tr(language, 'kg', 'كجم')}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* CENTER: Astronaut Chef & Meal Tray + Floating 0G Crumb/Droplet FX */}
        <div className="lg:col-span-4 rounded-2xl bg-gradient-to-b from-indigo-950/80 to-slate-950 border-2 border-indigo-400/50 p-4 flex flex-col items-center justify-between gap-3 min-h-[380px] relative overflow-hidden">
          {/* Zero-G Floating Crumbs / Droplets Visualizer */}
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
                className="pointer-events-none absolute z-30 text-2xl sm:text-3xl px-1.5 py-0.5 rounded-full bg-rose-950/80 border border-rose-300/80 select-none shadow-[0_0_16px_rgba(244,63,94,0.95)]"
              >
                {p.emoji}
              </motion.span>
            ))}
          </AnimatePresence>

          <div className="text-center space-y-1 relative z-10 w-full">
            <AstronautBioTwin
              compact
              language={language}
              rationsCount={packed.length}
              hydrationPct={Math.min(98, 72 + packed.length * 5)}
              boneMusclePct={Math.min(100, 76 + packed.length * 6)}
              suitCalibrated={false}
            />
            <div className="font-hud font-black text-sm text-white pt-1">
              {tr(language, 'Meal Tray & Cargo Crate', 'صينية الوجبة وصندوق الشحن')}
            </div>
            <div className="text-[11px] text-indigo-200">
              {tr(language, 'Tap pantry foods to pack safe rations', 'اضغط على الطعام لإضافته إلى الصندوق الآمن')}
            </div>
          </div>

          <div className="w-full flex-1 rounded-2xl bg-slate-900/80 border border-slate-700 p-3 space-y-2 relative z-10">
            <div className="flex items-center justify-between text-xs font-black text-emerald-300">
              <span>{tr(language, `📦 Packed (${packed.length})`, `📦 العناصر المحزومة (${packed.length})`)}</span>
              <span>{totalKcal} kcal</span>
            </div>
            {packed.length === 0 ? (
              <div className="h-32 flex items-center justify-center text-xs text-slate-400 text-center">
                {tr(
                  language,
                  'Tray empty — choose safe Egyptian, Sinai or hydroponic items!',
                  'الصينية فارغة الآن — اختر أطعمة مصرية أو سيناوية أو مائية آمنة!'
                )}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {packed.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggleItem(p)}
                    className="px-2.5 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-400/70 text-[11px] font-bold text-white flex items-center gap-1.5 cursor-pointer hover:bg-rose-950/70"
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

          <div className="w-full text-[11px] text-cyan-200 bg-sky-950/70 rounded-xl p-2.5 border border-cyan-500/30 text-center font-bold relative z-10">
            {tr(
              language,
              `Egyptian/Sinai foods packed: ${packed.filter((p) => EGYPTIAN_SINAI_SPACE_FOODS.some((e) => e.id === p.id)).length}`,
              `عدد عناصر السيناوي/المصري بالصندوق: ${packed.filter((p) => EGYPTIAN_SINAI_SPACE_FOODS.some((e) => e.id === p.id)).length}`
            )}
          </div>
        </div>

        {/* RIGHT: Glossy Telemetry Meters */}
        <div className="lg:col-span-3 rounded-2xl bg-slate-950/90 border border-cyan-400/40 p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-hud font-black text-xs text-white">
              {tr(language, '📊 Mission Telemetry', '📊 عدادات المهمة')}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              safetyAlert ? 'bg-rose-600 text-white' : 'bg-emerald-500 text-slate-950'
            }`}>
              {safetyAlert ? tr(language, 'WARNING ⚠️', 'تحذير ⚠️') : tr(language, 'Safety: SAFE ✅', 'آمن ✅')}
            </span>
          </div>

          {/* Cargo Capacity Meter */}
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
            <div className="flex justify-between text-[11px] font-black">
              <span className="text-amber-300">{tr(language, 'Cargo Capacity', 'سعة الشحن')}</span>
              <span className="text-white">{totalKg} / {maxKg} {tr(language, 'kg', 'كجم')}</span>
            </div>
            <div className="h-2 rounded-full bg-slate-950 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all"
                style={{ width: `${Math.min(100, (totalKg / maxKg) * 100)}%` }}
              />
            </div>
          </div>

          {/* 5 Macro/Micro Bars */}
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-cyan-200">
                {tr(language, 'Nutrition Balance', 'توازن التغذية')}
              </span>
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-amber-950 border border-amber-400 text-amber-200">
                {tr(language, 'Game Model', 'تبسيط')}
              </span>
            </div>
            {[
              { label: tr(language, 'Protein', 'بروتين'), pctVal: proteinPct, color: 'bg-sky-400', raw: `${totalProtein}g` },
              { label: tr(language, 'Carbs', 'كربوهيدرات'), pctVal: carbsPct, color: 'bg-amber-400', raw: `${totalCarbs}g` },
              { label: tr(language, 'Healthy Fats', 'دهون صحية'), pctVal: fatsPct, color: 'bg-yellow-300', raw: `${totalFats.toFixed(0)}g` },
              { label: tr(language, 'Vitamins', 'فيتامينات'), pctVal: vitPct, color: 'bg-emerald-400', raw: `${totalVitamins}%` },
              { label: tr(language, 'Fiber', 'ألياف'), pctVal: fiberPct, color: 'bg-pink-400', raw: `${totalFiber.toFixed(0)}g` }
            ].map((bar) => (
              <div key={bar.label} className="space-y-0.5">
                <div className="flex justify-between text-[10px] font-bold text-slate-300">
                  <span>{bar.label}</span>
                  <span>{bar.raw} ({bar.pctVal}%)</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-950 overflow-hidden">
                  <div className={`h-full ${bar.color} transition-all`} style={{ width: `${bar.pctVal}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div className="p-2 rounded-xl bg-sky-950/60 border border-sky-400/35 text-[10px] text-sky-100 leading-relaxed">
            📐 <strong>{tr(language, 'NASA Reference:', `${SCIENCE_BADGES.PLANNING_ASSUMPTION.labelAr}:`)}</strong>{' '}
            {tr(
              language,
              `70 kg crew/day = ${DAILY_REFERENCE_ASSUMPTIONS.energyKcal} kcal • ${DAILY_REFERENCE_ASSUMPTIONS.proteinGrams}g protein.`,
              `لرائد 70 كجم/يوم = ${DAILY_REFERENCE_ASSUMPTIONS.energyKcal} kcal و${DAILY_REFERENCE_ASSUMPTIONS.proteinGrams}g بروتين.`
            )}
          </div>
        </div>
      </div>

      <div className="p-3 rounded-2xl bg-sky-950/60 border border-cyan-500/35 text-xs font-hud text-cyan-100">
        🛰️ <strong>{tr(language, 'NASA Food Engineering:', `${NASA_ENGINEERING_TRADEOFFS[1].titleAr}:`)}</strong>{' '}
        {tr(
          language,
          'Zero-crumb pastes (Sinai Honey, pouches) protect air filters while hydroponics supply fresh micronutrients.',
          NASA_ENGINEERING_TRADEOFFS[1].optimalDecisionAr
        )}
      </div>

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
        className={`w-full py-3.5 rounded-2xl font-hud font-black text-base border-2 transition-all ${
          isBalanced
            ? 'bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 border-white cursor-pointer hover:brightness-110'
            : 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
        }`}
      >
        {isBalanced
          ? tr(language, 'Confirm Safe Space Meals & Seal Crate 🚀', 'تأكيد تعبئة الطعام الآمن وإغلاق الصندوق 🚀')
          : tr(language, 'Add 4+ varied crumb-free foods to continue', 'أضف 4+ أصناف متنوعة آمنة لنقلها لصندوق المهمة')}
      </button>

      {foodMissionDone && (
        <div
          data-testid="mission-complete-cta"
          className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-950 border-2 border-emerald-300 text-center space-y-2 shadow-[0_0_25px_rgba(52,211,153,0.35)]"
        >
          <p className="font-hud font-black text-base text-emerald-200">
            {tr(
              language,
              '✓ Mission rations sealed — zero-crumb & nutritionally balanced!',
              '✓ تم حفظ وجبات البعثة بنجاح — وجبة فضائية آمنة ومغذية!'
            )}
          </p>
        </div>
      )}
    </div>
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
  const resolvedCorrectly = EQUIP_INSPECTION_LIST.every((item) => {
    const d = decisions[item.id];
    return (item.shouldPack && d === 'packed') || (!item.shouldPack && d === 'rejected');
  });
  const resolvedCount = Object.keys(decisions).length;

  return (
    <div className="bg-slate-900/95 border-2 border-amber-400/70 rounded-3xl p-5 flex flex-col gap-4 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-hud font-bold text-xs sm:text-sm text-amber-200">
          {tr(
            language,
            `Inspect every item: pack certified hardware and reject damaged/excess cargo (${resolvedCount}/${EQUIP_INSPECTION_LIST.length}):`,
            `افحص كل عنصر: احزم المعدات السليمة فقط، وارفض التالف أو الزائد عن الحاجة (${resolvedCount}/${EQUIP_INSPECTION_LIST.length}):`
          )}
        </p>
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-950 border border-amber-400 text-amber-200">
          {tr(language, `Valid hardware needed: ${validItemsCount}`, `المعدات الصالحة المطلوبة: ${validItemsCount}`)}
        </span>
      </div>

      {feedback && (
        <div className="p-3 rounded-2xl bg-slate-950/90 border border-cyan-500/40 text-xs font-bold text-cyan-100">
          {feedback}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {EQUIP_INSPECTION_LIST.map((item) => {
          const d = decisions[item.id];
          return (
            <div
              key={item.id}
              className={`p-3.5 rounded-2xl border-2 flex flex-col justify-between gap-2.5 transition-all ${
                d === 'packed'
                  ? 'bg-emerald-950/60 border-emerald-400'
                  : d === 'rejected'
                  ? 'bg-slate-950/70 border-slate-600 opacity-85'
                  : 'bg-slate-800/85 border-slate-600'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl shrink-0">{item.icon}</span>
                <div>
                  <div className="font-hud font-black text-sm text-white">
                    {tr(language, item.nameEn, item.nameAr)}
                  </div>
                  <div className="text-[11px] text-slate-300">
                    {tr(language, item.bayEn, item.bay)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDecide(item, 'packed')}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-black flex items-center justify-center gap-1 cursor-pointer border ${
                    d === 'packed'
                      ? 'bg-emerald-500 text-slate-950 border-white'
                      : 'bg-slate-900 hover:bg-emerald-900/60 text-emerald-200 border-emerald-500/50'
                  }`}
                >
                  <PackageCheck className="w-3.5 h-3.5" />
                  <span>{d === 'packed' ? tr(language, 'Packed ✅', 'تم الحزم ✅') : tr(language, 'Pack Gear', 'احزم للمهمة')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDecide(item, 'rejected')}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-black flex items-center justify-center gap-1 cursor-pointer border ${
                    d === 'rejected'
                      ? 'bg-rose-500 text-white border-white'
                      : 'bg-slate-900 hover:bg-rose-900/60 text-rose-200 border-rose-500/50'
                  }`}
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>{d === 'rejected' ? tr(language, 'Rejected 🚫', 'تم الاستبعاد 🚫') : tr(language, 'Reject', 'رفض / استبعاد')}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive SPACE-FIT X Suit Pre-Flight Calibration */}
      {onUpdateCampaign && (
        <div className="pt-2 border-t border-slate-800 space-y-2">
          <p className="font-hud font-black text-xs sm:text-sm text-cyan-200">
            {tr(
              language,
              '🦺 Calibrate SPACE-FIT X Suit (Prototype 1.0 — AstroNutri):',
              '🦺 معايرة بدلة SPACE-FIT X الداخلية (Prototype 1.0 — AstroNutri):'
            )}
          </p>
          <SpaceFitXControlsHUD
            compact
            suitState={campaign.spaceFitX}
            onChange={(next) => onUpdateCampaign({ spaceFitX: next })}
          />
        </div>
      )}

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
        className={`w-full py-3.5 rounded-2xl font-hud font-black text-base border-2 ${
          resolvedCorrectly
            ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 border-white cursor-pointer'
            : 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
        }`}
      >
        {tr(language, 'Confirm Equipment Inspection ✅', 'تأكيد فحص وحزم المعدات ✅')}
      </button>
    </div>
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
  const [countdown, setCountdown] = useState<number | null>(null);
  const [launchSuccess, setLaunchSuccess] = useState(
    campaign.completedMiniGames.includes('l1_mission_launch')
  );
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  const isDemoUnlocked = campaign.unlockedLevels.length >= 4;
  const reqFood = campaign.completedMiniGames.includes('l1_food_prep') || isDemoUnlocked;
  const reqEquip = campaign.completedMiniGames.includes('l1_equipment_prep') || isDemoUnlocked;
  const reqMed = campaign.completedMiniGames.includes('l1_medical_check') || isDemoUnlocked;
  const reqShip = campaign.completedMiniGames.includes('l1_spaceship_inspect') || isDemoUnlocked;
  const canLaunch = reqFood && reqEquip && reqMed && reqShip && navSynced;

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
    <div className="bg-slate-900/95 border-2 border-purple-400/75 rounded-3xl p-5 flex flex-col gap-4 shadow-xl">
      {/* Launch Pad Illustrated Window + Telemetry Checklist */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        <div className="md:col-span-5 rounded-2xl bg-gradient-to-b from-[#081b3b] to-slate-950 border-2 border-cyan-400/50 p-4 flex flex-col items-center justify-center relative overflow-hidden min-h-[190px]">
          <div className="text-[11px] font-black text-cyan-200 absolute top-2.5 right-3">
            {tr(language, '🪟 Live Launch Pad Window', '🪟 نافذة منصة الإطلاق المباشرة')}
          </div>
          <div className={`text-6xl transition-transform duration-700 ${launchSuccess ? '-translate-y-12 scale-110' : ''}`}>
            🚀
          </div>
          <div className="w-32 h-3 rounded-full bg-slate-700 mt-3 border border-slate-500" />
          <div className="text-[11px] font-bold text-slate-300 mt-2">
            {launchSuccess
              ? tr(language, '🔥 Ascending to Orbit!', '🔥 تم الإقلاع نحو المدار!')
              : canLaunch
              ? tr(language, 'Go for Ignition', 'جاهز للاشتعال الكامل')
              : tr(language, 'Awaiting checks & navigation sync', 'في انتظار اكتمال الفحوصات ومزامنة الملاحة')}
          </div>
        </div>

        <div className="md:col-span-7 space-y-3">
          <h2 className="font-hud font-black text-base text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
            <span>{tr(language, 'Final Pre-Launch Checklist:', 'قائمة التحقق النهائية للإطلاق:')}</span>
          </h2>

          <div className="grid grid-cols-2 gap-2.5 text-xs font-hud font-black">
            {[
              { ok: reqFood, label: tr(language, '1. Food Pantry', '1. مخزن الطعام (Food)') },
              { ok: reqEquip, label: tr(language, '2. Gear Check', '2. فحص المعدات (Equipment)') },
              { ok: reqMed, label: tr(language, '3. Medical OK', '3. الفحص الطبي (Medical)') },
              { ok: reqShip, label: tr(language, '4. Ship Systems', '4. أنظمة المركبة (Rocket)') }
            ].map((r) => (
              <div
                key={r.label}
                className={`p-3 rounded-2xl border-2 flex items-center gap-2 ${
                  r.ok ? 'bg-emerald-950/70 border-emerald-400 text-emerald-200' : 'bg-rose-950/50 border-rose-500 text-rose-200'
                }`}
              >
                {r.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                <span>{r.label}</span>
              </div>
            ))}
          </div>

          {/* Interactive Fault Resolution: Sync Navigation Data */}
          <div className={`p-3 rounded-2xl border-2 flex flex-wrap items-center justify-between gap-2 ${
            navSynced ? 'bg-emerald-950/60 border-emerald-400' : 'bg-amber-950/50 border-amber-400 animate-pulse'
          }`}>
            <div className="text-xs font-bold text-white flex items-center gap-2">
              <Radio className="w-4 h-4 text-amber-300" />
              <span>
                {navSynced
                  ? tr(language, '✅ Navigation telemetry synced!', '✅ تم مزامنة بيانات الملاحة بنجاح!')
                  : tr(language, 'Alert: Sync navigation link before ignition', 'تنبيه: بيانات الملاحة تحتاج مزامنة قبل الإطلاق')}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                soundManager.playCrystalSparkle();
                setNavSynced(true);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black cursor-pointer ${
                navSynced ? 'bg-emerald-500 text-slate-950' : 'bg-amber-400 hover:bg-amber-300 text-slate-950'
              }`}
            >
              {navSynced ? tr(language, 'Synced ✓', 'تمت المزامنة ✓') : tr(language, 'Sync Navigation Data 🛰️', 'مزامنة الملاحة 🛰️')}
            </button>
          </div>
        </div>
      </div>

      {countdown !== null && countdown > 0 && (
        <div className="py-4 text-center font-hud font-black text-6xl text-amber-300 animate-bounce">
          {countdown}
        </div>
      )}

      {launchSuccess ? (
        <div className="p-5 rounded-3xl bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-950 border-4 border-emerald-300 text-center space-y-3">
          <p className="font-mono font-black text-lg sm:text-2xl text-amber-300 tracking-wide">
            {tr(language, 'LAUNCH SUCCESSFUL! THE JOURNEY TO THE MOON BEGINS!', 'انطلاق ناجح! بدأت رحلة الصاروخ نحو القمر!')}
          </p>
          <p className="font-hud font-black text-base text-white">
            {tr(
              language,
              'Liftoff confirmed! Level 2 Unlocked: Zero-G Orbit Transit 🚀🌕',
              'تم الإطلاق بنجاح! فُتح المستوى الثاني: الرحلة في انعدام الجاذبية 🚀🌕'
            )}
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-1">
            <button
              type="button"
              onClick={onNextLevel}
              data-testid="mission-next-level-btn"
              className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-300 via-yellow-300 to-orange-400 text-slate-950 font-hud font-black text-base border-2 border-white shadow-[0_0_26px_rgba(251,191,36,0.75)] cursor-pointer hover:scale-105 transition-transform animate-pulse"
            >
              {tr(language, 'Mission Complete! Advance to Level 2 🚀', 'المهمة اكتملت! انطلق للمرحلة التالية 🚀')}
            </button>
            <button
              type="button"
              onClick={onBackToLevel}
              className="px-5 py-3 rounded-2xl bg-slate-800 text-white font-hud font-bold text-sm border border-cyan-400 cursor-pointer"
            >
              {tr(language, 'Back to Station Map', 'العودة لخريطة الغرف')}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={!canLaunch || countdown !== null}
          onClick={startCountdown}
          className={`w-full py-4 rounded-2xl font-hud font-black text-lg border-2 flex items-center justify-center gap-2 ${
            canLaunch
              ? 'bg-gradient-to-r from-purple-500 via-pink-500 to-amber-500 text-white border-white cursor-pointer hover:brightness-110 shadow-[0_0_30px_rgba(168,85,247,0.5)]'
              : 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
          }`}
        >
          <Rocket className="w-6 h-6" />
          <span>
            {canLaunch
              ? tr(language, 'INITIATE LAUNCH (3-2-1) 🚀', 'ابدأ العد التنازلي والإطلاق (3-2-1) 🚀')
              : tr(language, 'Complete all station checks & sync navigation 🔒', 'أكمل محطات المهمة وزامن الملاحة للإطلاق 🔒')}
          </span>
        </button>
      )}
    </div>
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
  const [sleepFixed, setSleepFixed] = useState(campaign.l1MedicalCleared);
  const [checkedShip, setCheckedShip] = useState<string[]>(
    campaign.l1SpaceshipInspected ? L1_SHIP_SYSTEMS.map((s) => s.id) : []
  );

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
      <div className="bg-slate-900/95 border-2 border-pink-400/70 rounded-3xl p-5 flex flex-col gap-4 shadow-xl">
        <BodyTelemetryMeters
          language={language}
          titleEn="Pre-Flight Astronaut Biometrics"
          titleAr="المؤشرات الحيوية قبل الإطلاق"
          metrics={[
            { key: 'hydration', value: hydrationFixed ? 96 : 62 },
            { key: 'muscle', value: sleepFixed ? 92 : 65 }
          ]}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`p-4 rounded-2xl border-2 ${nutritionReady ? 'bg-emerald-950/70 border-emerald-400' : 'bg-amber-950/70 border-amber-400'}`}>
            <p className="font-hud font-black text-base text-white">
              {tr(language, '🥗 Nutrition Status', '🥗 مؤشر التغذية')}
            </p>
            <p className="font-hud text-xs mt-1 text-slate-200">
              {nutritionReady
                ? tr(language, 'Certified balanced pantry stowage verified.', 'مكتمل ومعتمد من مخزن الطعام (تأثير مباشر على جاهزية الطاقم).')
                : tr(language, 'Alert: Complete Food Storage check first.', 'تنبيه! لم تجهز الوجبات المتوازنة في مخزن الطعام بعد.')}
            </p>
          </div>

          <div className={`p-4 rounded-2xl border-2 ${hydrationFixed ? 'bg-emerald-950/70 border-emerald-400' : 'bg-rose-950/70 border-rose-400'}`}>
            <p className="font-hud font-black text-base text-white">
              {tr(language, '💧 Hydration Level', '💧 مؤشر الترطيب')}
            </p>
            <p className="font-hud text-xs mt-1 text-slate-200">
              {hydrationFixed
                ? tr(language, 'Optimal hydration: 96%!', 'ترطيب مثالي: 96%!')
                : tr(language, 'Mild dehydration (62%)! Drink water before launch.', 'تحذير جفاف طفيف (62%)! اشرب ماء قبل الإطلاق.')}
            </p>
            {!hydrationFixed && (
              <button
                type="button"
                onClick={() => {
                  soundManager.playDropSuccess();
                  setHydrationFixed(true);
                }}
                className="mt-3 px-3 py-1.5 rounded-xl bg-cyan-500 text-slate-950 font-hud font-black text-xs cursor-pointer"
              >
                {tr(language, 'Fix: Drink Water 💧', 'عالج: شرب الماء 💧')}
              </button>
            )}
          </div>

          <div className={`p-4 rounded-2xl border-2 ${sleepFixed ? 'bg-emerald-950/70 border-emerald-400' : 'bg-amber-950/70 border-amber-400'}`}>
            <p className="font-hud font-black text-base text-white">
              {tr(language, '😴 Sleep & Recovery', '😴 مؤشر النوم والراحة')}
            </p>
            <p className="font-hud text-xs mt-1 text-slate-200">
              {sleepFixed
                ? tr(language, 'Well-rested: 8.5 hours!', 'نوم كافٍ: 8.5 ساعات!')
                : tr(language, 'Alert: Only 5h sleep logged! Rest crew now.', 'تنبيه: 5 ساعات نوم فقط! اضبط راحة الطاقم.')}
            </p>
            {!sleepFixed && (
              <button
                type="button"
                onClick={() => {
                  soundManager.playCrystalSparkle();
                  setSleepFixed(true);
                }}
                className="mt-3 px-3 py-1.5 rounded-xl bg-indigo-400 text-slate-950 font-hud font-black text-xs cursor-pointer"
              >
                {tr(language, 'Fix: Complete 8h Rest 🛏️', 'عالج: إتمام 8 ساعات راحة 🛏️')}
              </button>
            )}
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-400/40 text-xs text-emerald-100 flex flex-wrap items-center justify-between gap-2">
          <span>
            💊{' '}
            {tr(
              language,
              'Key Micro-Nutrients: Calcium, Vitamins D/K/C/B12, Iron, Magnesium, Potassium, Omega-3 & Zinc for bone density and immunity.',
              'المغذيات الدقيقة للبعثة: الكالسيوم، فيتامينات D وK وC وB12، الحديد، المغنيسيوم، البوتاسيوم، أوميغا-3، والزنك لحماية العظام والمناعة.'
            )}
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-900 border border-emerald-400 text-emerald-200">
            {tr(language, SCIENCE_BADGES.ISS_PROVEN.labelEn, SCIENCE_BADGES.ISS_PROVEN.labelAr)}
          </span>
        </div>

        {onUpdateCampaign && (
          <SpaceFitXControlsHUD
            compact
            suitState={campaign.spaceFitX}
            onChange={(next) => onUpdateCampaign({ spaceFitX: next })}
          />
        )}

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
          className={`w-full py-3.5 rounded-2xl font-hud font-black text-base border-2 ${
            allClear
              ? 'bg-gradient-to-r from-emerald-400 to-cyan-500 text-slate-950 border-white cursor-pointer'
              : 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
          }`}
        >
          {nutritionReady
            ? tr(language, 'Approve Medical Flight Clearance 🩺', 'اعتماد التصريح الطبي للانطلاق 🩺')
            : tr(language, 'Complete Food Pantry first, then certify medical exam', 'أكمل مخزن الطعام أولاً ثم اعتمد الفحص الطبي')}
        </button>
      </div>
    );
  }

  if (miniGameId === 'l1_spaceship_inspect') {
    const allChecked = checkedShip.length >= L1_SHIP_SYSTEMS.length;
    const toggleCheck = (id: string) => {
      soundManager.playPressurizeHiss();
      setCheckedShip((prev) => (prev.includes(id) ? prev : [...prev, id]));
    };

    return (
      <div className="bg-slate-900/95 border-2 border-indigo-400/70 rounded-3xl p-5 flex flex-col gap-4 shadow-xl">
        <p className="font-hud font-bold text-sm text-indigo-200">
          {tr(
            language,
            `Inspect all 5 spacecraft systems inside the hangar (${checkedShip.length}/${L1_SHIP_SYSTEMS.length}):`,
            `افحص أنظمة المركبة الخمسة في حظيرة الصاروخ (${checkedShip.length}/${L1_SHIP_SYSTEMS.length}):`
          )}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {L1_SHIP_SYSTEMS.map((sys) => {
            const ok = checkedShip.includes(sys.id);
            return (
              <button
                key={sys.id}
                type="button"
                onClick={() => toggleCheck(sys.id)}
                className={`p-4 rounded-2xl border-2 flex items-center justify-between cursor-pointer transition-all ${
                  ok
                    ? 'bg-emerald-950 border-emerald-400 text-white'
                    : 'bg-slate-800 border-slate-600 text-slate-200 hover:border-cyan-400'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{sys.icon}</span>
                  <span className="font-hud font-black text-sm">{tr(language, sys.nameEn, sys.nameAr)}</span>
                </div>
                <span className={`text-xs font-hud font-black ${ok ? 'text-emerald-300' : 'text-amber-300'}`}>
                  {ok ? tr(language, '100% GO ✓', 'سليم 100% ✓') : tr(language, 'Inspect', 'افحص الآن')}
                </span>
              </button>
            );
          })}
        </div>

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
          className={`w-full py-3.5 rounded-2xl font-hud font-black text-base border-2 ${
            allChecked
              ? 'bg-gradient-to-r from-indigo-400 to-cyan-400 text-slate-950 border-white cursor-pointer'
              : 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
          }`}
        >
          {tr(language, 'Confirm Spacecraft Readiness 🛸', 'تأكيد سلامة المركبة الفضائية 🛸')}
        </button>
      </div>
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
