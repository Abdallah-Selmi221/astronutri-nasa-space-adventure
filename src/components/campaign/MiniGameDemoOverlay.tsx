import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Play, SkipForward, Sparkles } from 'lucide-react';
import { MiniGameId } from '../../types/game';
import { useGameState } from '../../context/GameContext';
import { tr } from '../../utils/i18n';
import { soundManager } from '../../utils/sound';

interface MiniGameDemoOverlayProps {
  miniGameId: MiniGameId | string;
  onFinish: () => void;
}

interface DemoSpec {
  titleEn: string;
  titleAr: string;
  goalEn: string;
  goalAr: string;
  keyControlsEn: string;
  keyControlsAr: string;
  accentHex: string;
  visualKind:
    | 'food'
    | 'balance'
    | 'medical'
    | 'launch'
    | 'zerog'
    | 'meal'
    | 'neows'
    | 'pipes'
    | 'ared'
    | 'storm'
    | 'crater'
    | 'com'
    | 'reentry'
    | 'splash';
}

const DEMO_SPECS: Record<string, DemoSpec> = {
  l1_food_prep: {
    titleEn: 'How to Pack Zero-Crumb Space Food',
    titleAr: 'كيف تجهّز طعام الفضاء بدون فتات',
    goalEn: 'Drag or tap crumb-free space items into your tray to protect cabin HEPA filters & gain +Thruster Boost.',
    goalAr: 'اسحب أو اضغط الأطعمة الآمنة بدون فتات لصينيتك لحماية فلاتر الهواء وكسب دفع إضافي.',
    keyControlsEn: 'Drag or Tap Items → Confirm Tray',
    keyControlsAr: 'اسحب أو اضغط ← اعتمد الصينية',
    accentHex: '#38bdf8',
    visualKind: 'food'
  },
  l1_equipment_prep: {
    titleEn: 'How to Balance Launch Loadout (≤ 18 kg)',
    titleAr: 'كيف توازن حمولة الإطلاق (≤ 18 كجم)',
    goalEn: 'Toggle survival essentials & balance the 18 kg beam limit without overweight alarms.',
    goalAr: 'فعّل المعدات الأساسية ووازن ذراع الحمولة ضمن حد 18 كجم دون تجاوز الوزن.',
    keyControlsEn: 'Snap Suit Parts → Balance ≤ 18 kg Beam',
    keyControlsAr: 'ركّب المعدات ← وازن الحمولة ≤ 18 كجم',
    accentHex: '#a78bfa',
    visualKind: 'balance'
  },
  l1_medical_check: {
    titleEn: 'Pre-Launch Hydration & Sleep Calibration',
    titleAr: 'معايرة الترطيب والساعة البيولوجية قبل الإطلاق',
    goalEn: 'Hold the hydration valve for 1.5s to fill electrolytes, then align crew circadian sleep (10 PM → 6 AM).',
    goalAr: 'اضغط مطوّلاً على صمام الترطيب 1.5 ثانية واضبط جدول النوم (10 م ← 6 ص).',
    keyControlsEn: 'Hold Hydration Valve → Align 8h Sleep',
    keyControlsAr: 'اضغط الصمام مطوّلاً ← اضبط 8 ساعات نوم',
    accentHex: '#34d399',
    visualKind: 'medical'
  },
  l1_mission_launch: {
    titleEn: 'Artemis LOX / LH2 Propellant Valve Prep',
    titleAr: 'موازنة صمامات الوقود LOX / LH2 لصاروخ أرتميس',
    goalEn: 'Match Oxygen & Hydrogen valves inside the green ignition band before triggering T-3..2..1 liftoff!',
    goalAr: 'طابق صمامَي الأكسجين والهيدروجين داخل النطاق الأخضر قبل إطلاق العد التنازلي!',
    keyControlsEn: 'Balance Both Sliders → Launch Sequence',
    keyControlsAr: 'وازن الصمامين ← ابدأ الإطلاق',
    accentHex: '#fbbf24',
    visualKind: 'launch'
  },
  l2_zerog_movement: {
    titleEn: 'Zero-G Salvage & Handrail Docking',
    titleAr: 'الحركة بانعدام الجاذبية والتقاط الأدوات',
    goalEn: 'Push gently off bulkheads in 0.0G, collect floating tools, and tap the handrail brake before docking.',
    goalAr: 'ادفع بلطف في انعدام الجاذبية والتقط الأدوات الطافية ثم استخدم مكابح المقبض.',
    keyControlsEn: 'Impulse Push → Catch 3 Gear → Handrail Brake',
    keyControlsAr: 'دفع ← التقط 3 أدوات ← كبح بالمقبض',
    accentHex: '#60a5fa',
    visualKind: 'zerog'
  },
  l2_balanced_meal: {
    titleEn: 'ISS High-Protein Orbit Tray & Hydration',
    titleAr: 'صينية البروتين وفيتامين د + تحدي الترطيب المداري',
    goalEn: 'Build a Vitamin-D & protein orbit menu, then tap the live Hydration Meter inside the cyan target zone.',
    goalAr: 'شكّل وجبة غنية بالبروتين وفيتامين د، ثم اضغط مؤشر الترطيب في المنطقة الزرقاء.',
    keyControlsEn: 'Balance Nutrients → Live Hydration Meter',
    keyControlsAr: 'وازن العناصر ← اضغط مقياس الترطيب',
    accentHex: '#22d3ee',
    visualKind: 'meal'
  },
  l2_systems_neows: {
    titleEn: 'NASA NeoWs Debris Trajectory Intercept',
    titleAr: 'تفادي حطام الكويكب 2010 PK عبر رادار ناسا',
    goalEn: 'Steer left/right in real time to dodge approaching NeoWs debris. Trigger L1 Fuel Boosts for speedburst!',
    goalAr: 'تحرك يميناً ويساراً لتفادي الحطام القادم واستخدم دفعات الوقود الإضافية من المستوى الأول.',
    keyControlsEn: 'Steer Left/Right + Use L1 Thruster Boosts',
    keyControlsAr: 'حرّك يميناً ويساراً + استخدم الدفع النفاث',
    accentHex: '#f59e0b',
    visualKind: 'neows'
  },
  l3_water_recycling: {
    titleEn: 'ECLSS Pipe Solver & Hydroponic Lettuce Loop',
    titleAr: 'توصيل أنابيب تدوير المياه (98%) والزراعة المائية',
    goalEn: 'Rotate pipes until wastewater flows continuously from Inlet to Tank (98% recovery), then nurture lunar crops.',
    goalAr: 'دوّر الأنابيب لتوصيل المسار حتى استرجاع 98% من المياه ثم ركّب حوض الخس القمري.',
    keyControlsEn: 'Rotate 3x3 Conduits → Hydroponic Nutrient Feed',
    keyControlsAr: 'دوّر الشبكة 3×3 ← غذّ النباتات المائية',
    accentHex: '#38bdf8',
    visualKind: 'pipes'
  },
  l3_resistance_training: {
    titleEn: 'ARED Bone-Load Timing & EVA Tool Rack',
    titleAr: 'تدريب المقاومة ARED وتجهيز حقيبة أدوات القمر',
    goalEn: 'Hit the moving indicator inside the green sweet spot for bone protection, then pack all 4 crater tools manually.',
    goalAr: 'اضغط عندما يعبر المؤشر النطاق الأخضر لتوليد الطاقة، ثم ركّب أدوات الحفرة الأربع يدوياً.',
    keyControlsEn: 'Tap Sweet Spot Reps → Pack 4 Geological Tools',
    keyControlsAr: 'اضغط النطاق الأخضر ← اجمع الأدوات الـ 4',
    accentHex: '#34d399',
    visualKind: 'ared'
  },
  l3_solar_storm: {
    titleEn: '10s NASA DONKI CME Solar Storm Defense',
    titleAr: 'الدفاع ضد موجة الإشعاع الشمسي DONKI (10 ثوانٍ)',
    goalEn: 'Seal the blast door and shift power sliders between Storm Shielding & Hydroponics as CME waves hit.',
    goalAr: 'أغلق البوابة المدرعة ووازن توزيع الطاقة بين الدرع والزراعة مع وصول موجات الشمس.',
    keyControlsEn: 'Seal Blast Door + Balance 3 Power Sliders',
    keyControlsAr: 'أغلق البوابة + وازن أشرطة الطاقة',
    accentHex: '#fb923c',
    visualKind: 'storm'
  },
  l3_lunar_samples: {
    titleEn: '0.16G Shackleton Crater Excavation & Return Auth',
    titleAr: 'استخراج عينات القمر في 0.16G واعتماد العودة للأرض',
    goalEn: 'Use matched geological tools inside 0.16G lunar gravity while watching Suit O2, then sign Earth Return Auth.',
    goalAr: 'استخدم الأداة المناسبة لكل عينة قمرية مع مراقبة الأكسجين ثم اعتمد تصريح العودة.',
    keyControlsEn: 'Select Tool & Dig Craters → Authorize Return',
    keyControlsAr: 'اختر الأداة واحفر ← اعتمد تصريح العودة',
    accentHex: '#facc15',
    visualKind: 'crater'
  },
  l4_departure_prep: {
    titleEn: 'Orion Payload Mass Balance & Circuit Diagnostic',
    titleAr: 'اتزان كتلة العينات في أوريون وتشخيص الأعطال',
    goalEn: 'Distribute lunar samples across Left/Right bays (≤ 15 kg variance, ≤ 100 kg total), then flip the offline circuit breaker.',
    goalAr: 'وزّع الصخور القمرية بين الجناحين (فرق ≤ 15 كجم) ثم أصلح قاطع الدائرة الكهربائية.',
    keyControlsEn: 'Assign Left/Right Bays → Flip Fault Breaker',
    keyControlsAr: 'وازن الجناحين ← أصلح قاطع الدائرة',
    accentHex: '#818cf8',
    visualKind: 'com'
  },
  l4_earth_reentry: {
    titleEn: '1.3s DSN Light-Time Ping & ±18° Plasma Corridor',
    titleAr: 'إشارة الشبكة الفضائية 1.3ث وممر الدرع الحراري ±18°',
    goalEn: 'Await the true 1.3s lunar radio ping, then keep Orion pitched inside the ±18° fiery atmosphere corridor.',
    goalAr: 'انتظر زمن الإشارة الفعلي 1.3 ثانية، ثم وجّه أوريون داخل ممر الحرارة الآمن ±18 درجة.',
    keyControlsEn: 'Receive 1.3s DSN Signal → Hold Pitch Inside ±18°',
    keyControlsAr: 'استقبل إشارة 1.3ث ← ثبّت زاوية ±18°',
    accentHex: '#f97316',
    visualKind: 'reentry'
  },
  l4_safe_landing: {
    titleEn: '9,600m Chute Deployment & Pacific Splashdown',
    titleAr: 'فتح المظلات على 9,600م والهبوط السليم بالمحيط',
    goalEn: 'Watch altitude fall from 9,600m → deploy Drogue Chutes (≤ 7,800m) → deploy Main Tri-Chutes (≤ 3,600m)!',
    goalAr: 'راقب الارتفاع 9,600م ← افتح مظلات التوازن (≤ 7,800م) ← ثم المظلات الرئيسية الثلاث (≤ 3,600م)!',
    keyControlsEn: 'Drogues (≤ 7,800m) → Main Chutes (≤ 3,600m)',
    keyControlsAr: 'التوازن (≤ 7,800م) ← المظلات الرئيسية (≤ 3,600م)',
    accentHex: '#2dd4bf',
    visualKind: 'splash'
  }
};

const DEMO_DURATION_MS = 5000;

export const MiniGameDemoOverlay: React.FC<MiniGameDemoOverlayProps> = ({
  miniGameId,
  onFinish
}) => {
  const { language } = useGameState();
  const spec = DEMO_SPECS[miniGameId] || DEMO_SPECS.l1_food_prep;
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    const start = performance.now();
    const timer = window.setInterval(() => {
      const next = performance.now() - start;
      if (next >= DEMO_DURATION_MS) {
        window.clearInterval(timer);
        setElapsedMs(DEMO_DURATION_MS);
        onFinish();
      } else {
        setElapsedMs(next);
      }
    }, 60);
    return () => window.clearInterval(timer);
  }, [onFinish]);

  const pct = Math.min(100, Math.round((elapsedMs / DEMO_DURATION_MS) * 100));
  const remainSec = Math.max(0.1, (DEMO_DURATION_MS - elapsedMs) / 1000).toFixed(1);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      data-testid="minigame-demo-overlay"
      dir={language === 'ar' ? 'rtl' : 'ltr'}
      className="rounded-3xl bg-slate-950/95 border-2 border-cyan-400/75 p-4 sm:p-5 shadow-2xl space-y-4 max-h-[82vh] overflow-y-auto"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-300/60 text-cyan-200 font-hud font-black text-[11px]">
            <Play className="w-3.5 h-3.5 fill-current" />
            {tr(language, 'LIVE VISUAL DEMO • 5s', 'شرح مرئي تفاعلي • 5 ثوانٍ')}
          </span>
          <span className="text-xs font-mono font-bold text-slate-300">{remainSec}s</span>
        </div>

        <button
          type="button"
          data-testid="demo-skip-btn"
          onClick={() => {
            soundManager.playClick();
            onFinish();
          }}
          className="px-4 py-2 rounded-full bg-gradient-to-r from-amber-400 via-yellow-300 to-emerald-400 hover:brightness-110 active:scale-95 text-slate-950 font-hud font-black text-xs sm:text-sm shadow-lg inline-flex items-center gap-1.5 cursor-pointer"
        >
          <span>{tr(language, 'Skip / Play Now 🚀', 'تخطي / العب الآن 🚀')}</span>
          <SkipForward className="w-4 h-4" />
        </button>
      </div>

      {/* Animated SVG Simulation Canvas */}
      <div className="relative rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950/80 to-slate-900 border border-white/15 p-3 overflow-hidden">
        <svg viewBox="0 0 360 135" className="w-full h-32 sm:h-40 select-none">
          <defs>
            <linearGradient id="demoBeam" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={spec.accentHex} stopOpacity="0.25" />
              <stop offset="50%" stopColor={spec.accentHex} stopOpacity="0.9" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.35" />
            </linearGradient>
          </defs>
          <rect x="6" y="6" width="348" height="123" rx="14" fill="rgba(15,23,42,0.8)" stroke="rgba(56,189,248,0.28)" />

          {(spec.visualKind === 'food' || spec.visualKind === 'meal') && (
            <g>
              <rect x="210" y="34" width="118" height="68" rx="12" fill="#0f172a" stroke={spec.accentHex} strokeWidth="2.5" />
              <motion.g
                animate={{ x: [0, 152, 152, 0], y: [0, -6, 0, 0], scale: [1, 1.1, 0.96, 1] }}
                transition={{ duration: 2.2, repeat: Infinity }}
              >
                <rect x="40" y="48" width="54" height="36" rx="10" fill={spec.accentHex} />
                <text x="67" y="71" textAnchor="middle" fill="#0f172a" fontSize="16" fontWeight="bold">🍱</text>
              </motion.g>
              <motion.circle
                cx="268"
                cy="68"
                r="14"
                fill="none"
                stroke="#10b981"
                strokeWidth="3"
                animate={{ scale: [0.8, 1.25, 0.8], opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <text x="268" y="114" textAnchor="middle" fill="#34d399" fontSize="11" fontWeight="bold">HEPA OK ✓</text>
            </g>
          )}

          {(spec.visualKind === 'balance' || spec.visualKind === 'com') && (
            <g>
              <polygon points="180,104 166,120 194,120" fill="#64748b" />
              <motion.g
                style={{ originX: '180px', originY: '84px' }}
                animate={{ rotate: [-8, 6, 0, 0] }}
                transition={{ duration: 2.4, repeat: Infinity }}
              >
                <rect x="70" y="78" width="220" height="8" rx="4" fill={spec.accentHex} />
                <rect x="82" y="50" width="44" height="26" rx="6" fill="#38bdf8" />
                <rect x="234" y="50" width="44" height="26" rx="6" fill="#34d399" />
              </motion.g>
              <text x="180" y="34" textAnchor="middle" fill="#a7f3d0" fontSize="12" fontWeight="bold">
                {spec.visualKind === 'balance' ? '≤ 18 kg BALANCED' : 'Δ MASS ≤ 15 kg'}
              </text>
            </g>
          )}

          {(spec.visualKind === 'medical' || spec.visualKind === 'launch' || spec.visualKind === 'storm' || spec.visualKind === 'ared') && (
            <g>
              <rect x="44" y="56" width="272" height="18" rx="9" fill="#1e293b" stroke="#475569" />
              <rect x="148" y="56" width="64" height="18" rx="4" fill="rgba(16,185,129,0.45)" stroke="#34d399" strokeWidth="2" />
              <motion.rect
                y="49"
                width="14"
                height="32"
                rx="5"
                fill={spec.accentHex}
                animate={{ x: [52, 290, 174, 52] }}
                transition={{ duration: 2.4, repeat: Infinity }}
              />
              <text x="180" y="102" textAnchor="middle" fill="#fde047" fontSize="12" fontWeight="bold">
                {spec.visualKind === 'launch'
                  ? 'LOX + LH2 → GREEN ZONE'
                  : spec.visualKind === 'ared'
                  ? 'SWEET SPOT → PACK TOOLS'
                  : spec.visualKind === 'storm'
                  ? 'SHELTER SHIELD ACTIVE'
                  : '1.5s HYDRATION HOLD'}
              </text>
            </g>
          )}

          {(spec.visualKind === 'zerog' || spec.visualKind === 'neows' || spec.visualKind === 'reentry' || spec.visualKind === 'splash') && (
            <g>
              <path d="M 35 95 Q 180 28 325 90" fill="none" stroke="url(#demoBeam)" strokeWidth="4" strokeDasharray="8 6" />
              <motion.g
                animate={{
                  x: spec.visualKind === 'splash' ? [0, 0, 0] : [0, 140, 250, 0],
                  y: spec.visualKind === 'splash' ? [0, 62, 62] : [0, -28, 6, 0]
                }}
                transition={{ duration: 2.5, repeat: Infinity }}
              >
                <circle cx={spec.visualKind === 'splash' ? 180 : 54} cy={spec.visualKind === 'splash' ? 28 : 82} r="13" fill={spec.accentHex} />
                <text x={spec.visualKind === 'splash' ? 180 : 54} y={spec.visualKind === 'splash' ? 33 : 87} textAnchor="middle" fill="#0f172a" fontSize="13">
                  {spec.visualKind === 'splash' ? '🪂' : '👩‍🚀'}
                </text>
              </motion.g>
              <text x="180" y="116" textAnchor="middle" fill="#bae6fd" fontSize="11" fontWeight="bold">
                {spec.visualKind === 'reentry' ? '1.3s DSN → ±18° CORRIDOR' : spec.visualKind === 'splash' ? '7,800m DROGUE → 3,600m MAIN' : 'REAL-TIME PHYSICS'}
              </text>
            </g>
          )}

          {(spec.visualKind === 'pipes' || spec.visualKind === 'crater') && (
            <g>
              <path d="M 55 68 L 145 68 L 145 44 L 225 44 L 225 84 L 305 84" fill="none" stroke="#1e293b" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" />
              <motion.path
                d="M 55 68 L 145 68 L 145 44 L 225 44 L 225 84 L 305 84"
                fill="none"
                stroke={spec.accentHex}
                strokeWidth="6"
                strokeDasharray="16 10"
                animate={{ strokeDashoffset: [52, 0] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
              />
              <circle cx="55" cy="68" r="10" fill="#fbbf24" />
              <circle cx="305" cy="84" r="10" fill="#34d399" />
            </g>
          )}
        </svg>
      </div>

      {/* Clear 1-line Objective + Control Strip */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-cyan-200 font-hud font-black text-sm sm:text-base">
          <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
          <span>{tr(language, spec.titleEn, spec.titleAr)}</span>
        </div>
        <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
          {tr(language, spec.goalEn, spec.goalAr)}
        </p>
        <div className="inline-block px-3 py-1 rounded-xl bg-white/10 border border-white/15 text-[11px] font-hud font-bold text-amber-200">
          {tr(language, spec.keyControlsEn, spec.keyControlsAr)}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-cyan-400 via-sky-400 to-emerald-400 transition-all duration-75"
          style={{ width: `${pct}%` }}
        />
      </div>
    </motion.div>
  );
};
