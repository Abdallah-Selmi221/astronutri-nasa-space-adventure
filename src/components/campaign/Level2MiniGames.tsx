import React, { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { CampaignProgressState, MiniGameId } from '../../types/game';
import { useGameState } from '../../context/GameContext';
import { tr } from '../../utils/i18n';
import { HydrationGame } from '../minigames/HydrationGame';
import { nasaCache } from '../../services/nasa/nasaCache';
import { soundManager } from '../../utils/sound';
import { dialogueManager } from '../../utils/geminiTTS';
import { NASA_OSDR_METRICS } from '../../services/nasa/nasaOSDR';
import { DAILY_REFERENCE_ASSUMPTIONS, SCIENCE_BADGES } from '../../data/science';
import { computeCrossStageEffects } from '../../utils/consequences';
import { BodyTelemetryMeters } from './BodyTelemetryMeters';
import { AlertTriangle, ArrowDown, ArrowUp, CheckCircle2, Flame, Hand, Radar, ShieldCheck } from 'lucide-react';

interface Level2Props {
  miniGameId: MiniGameId;
  campaign: CampaignProgressState;
  onCompleteMiniGame: (id: MiniGameId, patch?: Partial<CampaignProgressState>) => void;
  onNextLevel: () => void;
  onBackToLevel: () => void;
}

const FLOATING_ITEMS = [
  { id: 'food_packages', nameEn: 'Space Meal Pouches', nameAr: 'عبوات الطعام الفضائي', icon: '🍱', lockerEn: 'Galley Locker 1', lockerAr: 'خزانة المطبخ 1' },
  { id: 'water_pouches', nameEn: 'Sealed Water Pouches', nameAr: 'أكياس الماء المختومة', icon: '💧', lockerEn: 'Hydration Bay 2', lockerAr: 'خزانة الترطيب 2' },
  { id: 'screwdriver', nameEn: 'Magnetic Screwdriver', nameAr: 'مفك الصيانة المغناطيسي', icon: '🪛', lockerEn: 'Toolbox Locker 3', lockerAr: 'خزانة الأدوات 3' },
  { id: 'medical_kit', nameEn: 'Floating First-Aid Kit', nameAr: 'حقيبة الإسعاف الطائر', icon: '🩹', lockerEn: 'Med Bay Locker 4', lockerAr: 'العيادة الطبية 4' },
  { id: 'scientific_instrument', nameEn: 'Science Sensor Unit', nameAr: 'جهاز القياس العلمي', icon: '🔬', lockerEn: 'Research Bay 5', lockerAr: 'خزانة الأبحاث 5' }
];

const MEAL_GROUPS = [
  {
    id: 'protein',
    labelEn: '🧀 Egyptian Mish Pouch or Chicken (Protein & Calcium)',
    labelAr: '🧀 المش المصري بالملح الصخري أو الدجاج (بروتين وكالسيوم)',
    color: 'indigo'
  },
  {
    id: 'carbs',
    labelEn: '🍯 Sinai Honey + 🌴 Date Bars (Zero-Crumb Carbs & Energy)',
    labelAr: '🍯 العسل الجبلي السيناوي + 🌴 العجوة المضغوطة (طاقة وكربوهيدرات بدون فتات)',
    color: 'amber'
  },
  {
    id: 'fats',
    labelEn: '🫒 Sinai Olive Oil + Sesame Tahini (Healthy Omega Fats)',
    labelAr: '🫒 زيت الزيتون السيناوي + طحينة السمسم (دهون صحية وأوميغا)',
    color: 'emerald'
  },
  {
    id: 'vitamins',
    labelEn: '🥬 Hydroponic Lettuce, Arugula & Herbs (Vitamins & Fiber)',
    labelAr: '🥬 الكابوتشا والجرجير واللفت المائي + توابل سيناوية (فيتامينات وألياف)',
    color: 'pink'
  }
];

export const Level2MiniGames: React.FC<Level2Props> = ({
  miniGameId,
  campaign,
  onCompleteMiniGame,
  onNextLevel,
  onBackToLevel
}) => {
  const { language } = useGameState();
  const effects = computeCrossStageEffects(campaign);

  // 2.1 Zero-G Handrail Momentum & Velcro Salvage
  const CORRIDOR_VELCRO_ITEMS = [
    { id: 'wrench', pct: 28, icon: '🔧', en: 'Zero-G Wrench', ar: 'مفتاح ربط طائر' },
    { id: 'pouch', pct: 52, icon: '🥗', en: 'Sealed Ration', ar: 'كيس طعام' },
    { id: 'sensor', pct: 72, icon: '📡', en: 'Comms Sensor', ar: 'حساس اتصال' }
  ];
  const [roboX, setRoboX] = useState<number>(8); // 0..92 %
  const [velX, setVelX] = useState<number>(0);
  const [salvagedItems, setSalvagedItems] = useState<string[]>(
    campaign.completedMiniGames.includes('l2_zerog_movement')
      ? ['wrench', 'pouch', 'sensor']
      : campaign.l2SecuredObjects
  );
  const [handrailWon, setHandrailWon] = useState<boolean>(
    campaign.completedMiniGames.includes('l2_zerog_movement')
  );
  const [bumpWarning, setBumpWarning] = useState<string | null>(null);

  // 2.2 Secure 5 Floating Objects
  const [stowed, setStowed] = useState<string[]>(campaign.l2SecuredObjects);
  const [selectedFloating, setSelectedFloating] = useState<string | null>(null);

  // 2.3 Balanced Meal + Inline Embedded HydrationGame
  const [trayGroups, setTrayGroups] = useState<string[]>(
    campaign.completedMiniGames.includes('l2_balanced_meal') ? MEAL_GROUPS.map((g) => g.id) : []
  );
  const [inlineHydrationDone, setInlineHydrationDone] = useState<boolean>(
    campaign.l2HydrationPercent >= 90 ||
      campaign.completedMiniGames.includes('l2_hydration') ||
      campaign.completedMiniGames.includes('l2_balanced_meal')
  );

  // 2.5 Motion Sickness & Rest
  const [diagnosisPicked, setDiagnosisPicked] = useState<boolean>(campaign.l2MotionRested);
  const [restedCrew, setRestedCrew] = useState<boolean>(campaign.l2MotionRested);
  const [medSupportSent, setMedSupportSent] = useState<boolean>(campaign.l2MotionRested);

  // 2.6 Final Systems & Live NASA NeoWs Asteroid Dodge
  const [sysChecks, setSysChecks] = useState<string[]>(
    campaign.completedMiniGames.includes('l2_systems_neows')
      ? ['oxygen', 'water', 'power', 'comms', 'navigation']
      : []
  );
  const [shuttleLane, setShuttleLane] = useState<0 | 1 | 2>(1);
  const [rockLane, setRockLane] = useState<0 | 1 | 2>(1);
  const [rockX, setRockX] = useState<number>(88);
  const [dodgesCleared, setDodgesCleared] = useState<number>(
    campaign.completedMiniGames.includes('l2_systems_neows') ? 2 : 0
  );
  const [boostCharges, setBoostCharges] = useState<number>(effects.thrusterFuelBonus);
  const [vestibularChecked, setVestibularChecked] = useState<boolean>(
    campaign.l2MotionRested || campaign.completedMiniGames.includes('l2_systems_neows')
  );
  const [radarToast, setRadarToast] = useState<string | null>(null);
  const [arrivalConfirmed, setArrivalConfirmed] = useState<boolean>(
    campaign.completedMiniGames.includes('l2_systems_neows')
  );
  const asteroid2010PK = nasaCache.getAsteroid('3542519');
  const neowsCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = neowsCanvasRef.current;
    if (!canvas || miniGameId !== 'l2_systems_neows') return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let rafId = 0;
    const stars = Array.from({ length: 26 }, (_, i) => ({
      x: (i * 23) % canvas.width,
      y: 6 + ((i * 17) % (canvas.height - 12)),
      speed: 1.4 + (asteroid2010PK.relativeVelocityKmS || 10) * 0.14
    }));
    const draw = () => {
      rafId = window.requestAnimationFrame(draw);
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      stars.forEach((s) => {
        s.x -= s.speed;
        if (s.x < 0) s.x = canvas.width;
        ctx.fillStyle = 'rgba(186,230,253,0.72)';
        ctx.fillRect(s.x, s.y, 4, 1.5);
      });
      // Trajectory target scan line
      ctx.strokeStyle = 'rgba(56,189,248,0.28)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, (shuttleLane + 0.5) * (canvas.height / 3));
      ctx.lineTo(canvas.width, (shuttleLane + 0.5) * (canvas.height / 3));
      ctx.stroke();
      ctx.setLineDash([]);
    };
    draw();
    return () => window.cancelAnimationFrame(rafId);
  }, [miniGameId, shuttleLane, asteroid2010PK.relativeVelocityKmS]);

  // Physics loop for 2.1 Zero-G Corridor & Velcro Salvage
  useEffect(() => {
    if (miniGameId !== 'l2_zerog_movement' || handrailWon) return;
    const timer = window.setInterval(() => {
      setRoboX((x) => {
        const next = x + velX;
        CORRIDOR_VELCRO_ITEMS.forEach((vItem) => {
          if (Math.abs(next - vItem.pct) <= 8) {
            setSalvagedItems((prev) => {
              if (prev.includes(vItem.id)) return prev;
              soundManager.playDropSuccess();
              return [...prev, vItem.id];
            });
          }
        });

        if (next >= 86) {
          if (Math.abs(velX) <= 1.2) {
            setHandrailWon(true);
            soundManager.playFanfare();
            void dialogueManager.speak(
              tr(
                language,
                'Awesome! You salvaged the zero-G tools and docked safely using the handrail brake!',
                'عاش يا بطل! التقطت الأدوات الطافية ووصلت لنهاية الممر باستخدام الدرابزين بأمان!'
              )
            );
            onCompleteMiniGame('l2_zerog_movement', {
              l2SecuredObjects: ['wrench', 'pouch', 'sensor']
            });
            return 88;
          } else {
            soundManager.playAlertSiren();
            setBumpWarning(
              tr(
                language,
                'Whoa! Too fast for safe docking — grab the handrail brake before hitting the hatch!',
                'أوه! سرعتك عالية جداً عند الوصول! استخدم فرملة الدرابزين قبل فتحة القفل!'
              )
            );
            setVelX(-0.6);
            return 80;
          }
        }
        if (next <= 4) {
          setVelX(Math.max(0, velX));
          return 6;
        }
        return next;
      });
    }, 60);
    return () => window.clearInterval(timer);
  }, [miniGameId, velX, handrailWon, onCompleteMiniGame, language]);

  // Live 3-lane NeoWs Asteroid Dodge loop for 2.6
  useEffect(() => {
    if (miniGameId !== 'l2_systems_neows' || dodgesCleared >= 2) return;
    const timer = window.setInterval(() => {
      setRockX((prev) => {
        const next = prev - 4;
        if (next <= 16) {
          if (rockLane === shuttleLane) {
            soundManager.playCautionBeep();
            setRadarToast(
              tr(
                language,
                '⚠️ Micrometeoroid graze! Move shuttle to a clear lane!',
                '⚠️ اقتربت صخرة 2010 PK! حرك المكوك لمسار آمن!'
              )
            );
          } else {
            soundManager.playCrystalSparkle();
            setDodgesCleared((c) => c + 1);
            setRadarToast(
              tr(
                language,
                '✅ Clean evasion pass! Radar vector safe.',
                '✅ تفادٍ ناجح للصخرة! المسار آمن!'
              )
            );
          }
          setRockLane((old) => (((old + 1) % 3) as 0 | 1 | 2));
          return 92;
        }
        return next;
      });
    }, 110);
    return () => window.clearInterval(timer);
  }, [miniGameId, dodgesCleared, rockLane, shuttleLane, language]);

  // 2.1 ZERO-G MOVEMENT CHALLENGE
  if (miniGameId === 'l2_zerog_movement') {
    return (
      <div className="bg-slate-900/95 border-2 border-cyan-400/75 rounded-3xl p-5 flex flex-col gap-4 shadow-xl">
        <p className="font-hud font-bold text-sm text-cyan-200">
          {tr(
            language,
            'Zero air friction in 0G! Push forward gently, then grab the yellow handrail brake to dock slowly (≤ 1.2 m/s):',
            'في الفضاء لا يوجد احتكاك! ادفع نفسك برفق ثم امسك الدرابزين لتخفيف السرعة عند الوصول للمخرج (الهدف: ≤ 1.2 م/ث):'
          )}
        </p>

        <div className="relative h-40 rounded-2xl bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 border-2 border-indigo-400/70 overflow-hidden px-4 flex items-center">
          <div className="absolute top-3 inset-x-4 h-2.5 rounded-full bg-amber-400/80 border border-white/50" />
          <div className="absolute bottom-3 inset-x-4 h-2.5 rounded-full bg-amber-400/80 border border-white/50" />
          <div className="absolute left-3 top-6 bottom-6 w-12 rounded-xl bg-emerald-500/25 border-2 border-emerald-400 flex flex-col items-center justify-center text-xs font-hud font-black text-emerald-300">
            <span>🚪</span>
            <span>{tr(language, 'GOAL', 'هدف')}</span>
          </div>
          {CORRIDOR_VELCRO_ITEMS.map((item) => {
            const caught = salvagedItems.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (!caught) {
                    soundManager.playDropSuccess();
                    setSalvagedItems((prev) => (prev.includes(item.id) ? prev : [...prev, item.id]));
                  }
                }}
                style={{ right: `${item.pct}%` }}
                className={`absolute top-8 -translate-x-1/2 px-2 py-1 rounded-xl border text-xs font-hud font-black transition-all cursor-pointer ${
                  caught
                    ? 'bg-emerald-950/70 border-emerald-400 text-emerald-300 opacity-50 scale-90'
                    : 'bg-sky-950/90 border-cyan-300 text-white animate-bounce shadow-lg'
                }`}
                title={tr(language, item.en, item.ar)}
              >
                {item.icon} {caught ? '✓' : ''}
              </button>
            );
          })}
          <div
            style={{ right: `${roboX}%` }}
            className="absolute top-1/2 -translate-y-1/2 text-4xl transition-all duration-75"
          >
            🧑‍🚀
          </div>
        </div>
        <div className="flex items-center justify-between text-xs font-hud font-bold text-cyan-200 px-1">
          <span>
            {tr(
              language,
              `Floating Velcro Gear Salvaged: ${salvagedItems.length}/3 (auto-collect on pass or tap)`,
              `الأدوات الملتقطة بانعدام الجاذبية: ${salvagedItems.length}/3 (مر بها أو اضغطها)`
            )}
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/90 rounded-2xl p-3 border border-slate-700">
          <span className="font-mono font-bold text-sm text-amber-300">
            {tr(language, `Inertia Drift: ${velX.toFixed(1)} m/s`, `سرعة القصور الذاتي: ${velX.toFixed(1)} m/s`)}
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                soundManager.playClick();
                setBumpWarning(null);
                setVelX((v) => Math.min(3.6, +(v + 0.9).toFixed(1)));
              }}
              className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-hud font-black text-sm cursor-pointer"
            >
              {tr(language, 'Push Forward 🚀', 'ادفع للأمام باليد 🚀')}
            </button>
            <button
              type="button"
              onClick={() => {
                soundManager.playPressurizeHiss();
                setVelX((v) => +(v * 0.45).toFixed(1));
              }}
              className="px-4 py-2 rounded-xl bg-amber-400 text-slate-950 font-hud font-black text-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Hand className="w-4 h-4" />
              <span>{tr(language, 'Grab Handrail (Brake)', 'امسك الدرابزين (تهدئة)')}</span>
            </button>
          </div>
        </div>

        {bumpWarning && (
          <div className="p-3 rounded-2xl bg-amber-950 border border-amber-400 text-amber-200 font-hud font-bold text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{bumpWarning}</span>
          </div>
        )}
      </div>
    );
  }

  // 2.2 SECURE 5 FLOATING OBJECTS
  if (miniGameId === 'l2_secure_objects') {
    const remaining = FLOATING_ITEMS.filter((i) => !stowed.includes(i.id));

    const matchToLocker = (lockerItemId: string) => {
      if (!selectedFloating) return;
      if (selectedFloating === lockerItemId) {
        soundManager.playDropSuccess();
        const next = [...stowed, lockerItemId];
        setStowed(next);
        setSelectedFloating(null);
        if (next.length >= FLOATING_ITEMS.length) {
          soundManager.playFanfare();
          void dialogueManager.speak(
            tr(
              language,
              'All 5 floating items stowed cleanly into velcro lockers!',
              'ممتاز! ثبتّ كل الأدوات الطافية الخمسة في خزانتها بأمان!'
            )
          );
          onCompleteMiniGame('l2_secure_objects', { l2SecuredObjects: next });
        }
      } else {
        soundManager.playAlertSiren();
      }
    };

    return (
      <div className="bg-slate-900/95 border-2 border-indigo-400/75 rounded-3xl p-5 flex flex-col gap-4 shadow-xl">
        <p className="font-hud font-bold text-sm text-indigo-200">
          {tr(
            language,
            `Tap a floating object, then tap its matching velcro locker (${stowed.length}/${FLOATING_ITEMS.length} stowed):`,
            `اضغط على الغرض الطافي ثم اضغط على خزانته الصحيحة (${stowed.length}/${FLOATING_ITEMS.length} مثبّت):`
          )}
        </p>

        <div className="flex flex-wrap gap-3 p-4 rounded-2xl bg-slate-950 border border-indigo-500/40 min-h-[96px]">
          {remaining.length === 0 ? (
            <span className="font-hud font-black text-emerald-300 m-auto">
              {tr(language, 'All 5 zero-G items stowed safely! ✅', 'تم تثبيت جميع الأغراض الخمسة بنجاح! ✅')}
            </span>
          ) : (
            remaining.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  soundManager.playClick();
                  setSelectedFloating(item.id);
                }}
                className={`px-3.5 py-2 rounded-2xl border-2 font-hud font-black text-xs sm:text-sm flex items-center gap-2 cursor-pointer animate-bounce ${
                  selectedFloating === item.id
                    ? 'bg-amber-400 text-slate-950 border-white scale-105'
                    : 'bg-sky-900 text-white border-cyan-400'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span>{tr(language, item.nameEn, item.nameAr)}</span>
              </button>
            ))
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {FLOATING_ITEMS.map((item) => {
            const done = stowed.includes(item.id);
            const itemName = tr(language, item.nameEn, item.nameAr);
            return (
              <button
                key={item.id}
                type="button"
                disabled={done}
                onClick={() => matchToLocker(item.id)}
                className={`p-3.5 rounded-2xl border-2 transition-all ${
                  language === 'ar' ? 'text-right' : 'text-left'
                } ${
                  done
                    ? 'bg-emerald-950 border-emerald-400 text-emerald-200'
                    : selectedFloating
                    ? 'bg-slate-800 border-amber-300 text-white cursor-pointer hover:bg-sky-900'
                    : 'bg-slate-800/80 border-slate-600 text-slate-300'
                }`}
              >
                <p className="font-hud font-black text-sm">{tr(language, item.lockerEn, item.lockerAr)}</p>
                <p className="font-hud text-xs text-cyan-200 mt-1">
                  {done
                    ? `${tr(language, '✅ Stowed:', '✅ مثبّت:')} ${item.icon} ${itemName}`
                    : `${tr(language, 'Slot for:', 'المكان المخصص لـ:')} ${item.icon} ${itemName}`}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // 2.3 BALANCED SPACE MEAL
  if (miniGameId === 'l2_balanced_meal') {
    const toggleGroup = (id: string) => {
      soundManager.playDropSuccess();
      setTrayGroups((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    };
    const balanced = trayGroups.length >= MEAL_GROUPS.length;
    const readyToConfirmMeal = balanced && inlineHydrationDone;

    return (
      <div className="bg-slate-900/95 border-2 border-emerald-400/75 rounded-3xl p-5 flex flex-col gap-4 shadow-xl">
        {/* Stage 1 -> Stage 2 Live Consequence Banner */}
        <div className="p-3 rounded-2xl bg-slate-950/90 border border-cyan-500/45 flex flex-wrap items-center justify-between gap-2 text-xs font-hud font-bold">
          <span className="text-cyan-200">
            🔗 {tr(
              language,
              `Level 1 Carry-Over: Cabin HEPA Filter ${effects.cabinFilterHealthPct}%`,
              `تأثير المرحلة 1: نقاء فلتر الكابينة ${effects.cabinFilterHealthPct}%`
            )}
          </span>
          <span className={effects.thrusterFuelBonus > 0 ? 'text-amber-300' : 'text-slate-400'}>
            ⚡ {tr(
              language,
              `Compact Fuel Boost Ready: +${effects.thrusterFuelBonus}⚡`,
              `وقود الدفع الإضافي للمدار: +${effects.thrusterFuelBonus}⚡`
            )}
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-hud font-bold text-sm text-emerald-200">
            {tr(
              language,
              `Assemble a balanced 0G meal tray from Egyptian, Sinai & hydroponic foods (${trayGroups.length}/4):`,
              `كوّن صينية طعام متكاملة في 0G من المطبخ المصري والسيناوي والزراعة المائية (${trayGroups.length}/4):`
            )}
          </p>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-950 border border-amber-400 text-amber-200">
            {tr(language, SCIENCE_BADGES.GAME_RULE.labelEn, SCIENCE_BADGES.GAME_RULE.labelAr)}
          </span>
        </div>

        <BodyTelemetryMeters
          language={language}
          titleEn="Microgravity Body Nutrition Telemetry"
          titleAr="مؤشر تغذية الجسم في المدار"
          metrics={[
            { key: 'bone', value: Math.min(100, 52 + trayGroups.length * 12) },
            { key: 'muscle', value: Math.min(100, 50 + trayGroups.length * 12) }
          ]}
        />

        <div className="p-3 rounded-2xl bg-sky-950/60 border border-sky-400/40 text-xs text-sky-100">
          📐 <strong>{tr(language, SCIENCE_BADGES.PLANNING_ASSUMPTION.labelEn, SCIENCE_BADGES.PLANNING_ASSUMPTION.labelAr)}:</strong>{' '}
          {tr(
            language,
            `70 kg crew/day = ${DAILY_REFERENCE_ASSUMPTIONS.energyKcal} kcal • ${DAILY_REFERENCE_ASSUMPTIONS.proteinGrams}g protein • ${DAILY_REFERENCE_ASSUMPTIONS.carbsGrams}g carbs • ${DAILY_REFERENCE_ASSUMPTIONS.fatsGrams}g fat.`,
            `لرائد 70 كجم/يوم = ${DAILY_REFERENCE_ASSUMPTIONS.energyKcal} kcal • ${DAILY_REFERENCE_ASSUMPTIONS.proteinGrams}g بروتين • ${DAILY_REFERENCE_ASSUMPTIONS.carbsGrams}g كربوهيدرات • ${DAILY_REFERENCE_ASSUMPTIONS.fatsGrams}g دهون • ${DAILY_REFERENCE_ASSUMPTIONS.fiberGramsRange} ألياف.`
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {MEAL_GROUPS.map((g) => {
            const active = trayGroups.includes(g.id);
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => toggleGroup(g.id)}
                className={`p-4 rounded-2xl border-2 font-hud font-black text-sm cursor-pointer transition-all ${
                  language === 'ar' ? 'text-right' : 'text-left'
                } ${
                  active
                    ? 'bg-emerald-950 border-emerald-400 text-white'
                    : 'bg-slate-800 border-slate-600 text-slate-200 hover:border-cyan-400'
                }`}
              >
                {active ? '✅ ' : '⬜ '}
                {tr(language, g.labelEn, g.labelAr)}
              </button>
            );
          })}
        </div>

        {/* Phase 2: Embedded Inline Zero-G Hydration Valve Challenge */}
        <div className="rounded-2xl border-2 border-cyan-400/50 bg-slate-950/75 p-3 space-y-2">
          <div className="flex items-center justify-between text-xs font-hud font-black">
            <span className="text-cyan-200">
              💧 {tr(language, 'Phase 2: Orbit Zero-G Hydration Valve', 'المرحلة 2: صمام الترطيب في انعدام الجاذبية')}
            </span>
            <span className={inlineHydrationDone ? 'text-emerald-300' : 'text-amber-300'}>
              {inlineHydrationDone
                ? tr(language, 'Hydration Sealed ✓ (100%)', 'الترطيب مكتمل ✓ (100%)')
                : tr(language, 'Complete valve below', 'أكمل تحدي الترطيب بالأسفل')}
            </span>
          </div>
          {!inlineHydrationDone && (
            <HydrationGame onComplete={() => setInlineHydrationDone(true)} />
          )}
        </div>

        <button
          type="button"
          disabled={!readyToConfirmMeal}
          onClick={() => {
            soundManager.playFanfare();
            void dialogueManager.speak(
              tr(
                language,
                'Balanced space meal locked in! Fueling muscles and bones in orbit!',
                'وجبة فضائية متوازنة مية في المية! هتدينا طاقة وبروتين في الرحلة!'
              )
            );
            onCompleteMiniGame('l2_balanced_meal', { l2HydrationPercent: 100 });
          }}
          className={`w-full py-3.5 rounded-2xl font-hud font-black text-base border-2 ${
            readyToConfirmMeal
              ? 'bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 border-white cursor-pointer'
              : 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
          }`}
        >
          {readyToConfirmMeal
            ? tr(language, 'Confirm Balanced Space Meal 🍱', 'تأكيد الوجبة المتوازنة 🍱')
            : tr(language, 'Select all 4 food groups & complete Orbit Hydration 🔒', 'اختر المجموعات الأربع وأكمل تحدي الترطيب 🔒')}
        </button>
      </div>
    );
  }

  // 2.4 WATER HYDRATION CHALLENGE
  if (miniGameId === 'l2_hydration') {
    return (
      <HydrationGame
        onComplete={() => {
          onCompleteMiniGame('l2_hydration', { l2HydrationPercent: 100 });
        }}
      />
    );
  }

  // 2.5 MOTION SICKNESS & REST
  if (miniGameId === 'l2_motion_sickness') {
    const allDone = diagnosisPicked && restedCrew && medSupportSent;
    const osdrFluid = NASA_OSDR_METRICS[1];

    return (
      <div className="bg-slate-900/95 border-2 border-pink-400/75 rounded-3xl p-5 flex flex-col gap-4 shadow-xl">
        <BodyTelemetryMeters
          language={language}
          titleEn="Vestibular & Fluid Shift Telemetry"
          titleAr="توازن السوائل والأذن الداخلية"
          metrics={[
            { key: 'hydration', value: restedCrew ? 94 : 64 },
            { key: 'muscle', value: medSupportSent ? 92 : 68 }
          ]}
        />

        <div className="p-3 rounded-2xl bg-sky-950/70 border border-cyan-400/50 text-xs font-hud text-cyan-100">
          🧬 <strong>{osdrFluid.osdrCode}:</strong>{' '}
          {tr(
            language,
            'Cephalad fluid shift triggers space motion sickness during the first 48–72 hours of 0G.',
            osdrFluid.findingAr
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              setDiagnosisPicked(true);
            }}
            className={`p-4 rounded-2xl border-2 cursor-pointer ${
              language === 'ar' ? 'text-right' : 'text-left'
            } ${diagnosisPicked ? 'bg-emerald-950 border-emerald-400' : 'bg-slate-800 border-pink-400/70'}`}
          >
            <p className="font-hud font-black text-base text-white">
              {tr(language, '1. Diagnose Symptoms', '1. تشخيص الأعراض')}
            </p>
            <p className="font-hud text-xs text-slate-200 mt-1">
              {diagnosisPicked
                ? tr(language, '✅ Zero-G vestibular adaptation + fatigue', '✅ دوار التكيف مع انعدام الجاذبية + إرهاق')
                : tr(language, 'Identify cause of dizziness in 0G', 'حدد سبب الدوخة والإرهاق في 0G')}
            </p>
          </button>

          <button
            type="button"
            disabled={!diagnosisPicked}
            onClick={() => {
              soundManager.playCrystalSparkle();
              setRestedCrew(true);
            }}
            className={`p-4 rounded-2xl border-2 ${
              language === 'ar' ? 'text-right' : 'text-left'
            } ${
              restedCrew
                ? 'bg-emerald-950 border-emerald-400'
                : diagnosisPicked
                ? 'bg-slate-800 border-purple-400 cursor-pointer'
                : 'bg-slate-900 border-slate-700 opacity-60'
            }`}
          >
            <p className="font-hud font-black text-base text-white">
              {tr(language, '2. Rest in Crew Quarters', '2. الراحة في حجرة الطاقم')}
            </p>
            <p className="font-hud text-xs text-slate-200 mt-1">
              {restedCrew
                ? tr(language, '✅ Secured sleep bag + hydrated', '✅ استراح الطاقم وثبّت حزام النوم + شرب ماء')
                : tr(language, 'Zip into sleep bag & hydrate calmly', 'ثبّت كيس النوم واسترح لتوازن الأذن الداخلية')}
            </p>
          </button>

          <button
            type="button"
            disabled={!restedCrew}
            onClick={() => {
              soundManager.playFanfare();
              setMedSupportSent(true);
              void dialogueManager.speak(
                tr(
                  language,
                  'Motion sickness stabilized! Crew ready for lunar orbit!',
                  'تم استقرار حالة الدوار والطاقم بصحة ممتازة للهبوط على القمر!'
                )
              );
              onCompleteMiniGame('l2_motion_sickness', { l2MotionRested: true });
            }}
            className={`p-4 rounded-2xl border-2 ${
              language === 'ar' ? 'text-right' : 'text-left'
            } ${
              medSupportSent
                ? 'bg-emerald-950 border-emerald-400'
                : restedCrew
                ? 'bg-slate-800 border-cyan-400 cursor-pointer'
                : 'bg-slate-900 border-slate-700 opacity-60'
            }`}
          >
            <p className="font-hud font-black text-base text-white">
              {tr(language, '3. Telemetry to Flight Surgeon', '3. اتصال الدعم الطبي')}
            </p>
            <p className="font-hud text-xs text-slate-200 mt-1">
              {medSupportSent
                ? tr(language, '✅ Flight surgeon notified & cleared', '✅ تم إبلاغ طبيب الرحلة وتأكيد التعافي')
                : tr(language, 'Send recovery report to Earth med team', 'أرسل التقرير لغرفة الطب الأرضي')}
            </p>
          </button>
        </div>

        {allDone && (
          <div className="p-3 rounded-2xl bg-emerald-950/70 border border-emerald-400 text-emerald-200 font-hud font-black text-sm text-center">
            {tr(language, '✅ Crew fully recovered from Zero-G motion sickness!', '✅ تعافى الطاقم تماماً من دوار انعدام الجاذبية!')}
          </div>
        )}
      </div>
    );
  }

  // 2.6 FINAL SYSTEMS CHECK & LIVE NASA NEOWS 3-LANE ASTEROID DODGE
  const systems = [
    { id: 'oxygen', labelEn: 'Oxygen Tanks (14.7 PSI)', labelAr: 'الأكسجين (O2 Pressure 14.7 PSI)' },
    { id: 'water', labelEn: 'Potable Water Tanks (100%)', labelAr: 'خزانات المياه النقية (100%)' },
    { id: 'power', labelEn: 'Solar Array & Power Bus', labelAr: 'الطاقة الكهربائية والخلايا الشمسية' },
    { id: 'comms', labelEn: 'Lunar Orbit Comms Relay', labelAr: 'شبكة الاتصالات بالمدار القمري' },
    {
      id: 'navigation',
      labelEn: `NASA NeoWs Tracking: Asteroid ${asteroid2010PK.name}`,
      labelAr: `تتبع رادار ناسا NeoWs لكويكب ${asteroid2010PK.name}`
    }
  ];
  const allSysChecked = sysChecks.length >= systems.length;
  const readyForMoon = allSysChecked && dodgesCleared >= 2 && vestibularChecked;

  return (
    <div className="bg-slate-900/95 border-2 border-amber-400/75 rounded-3xl p-5 flex flex-col gap-4 shadow-xl">
      <div className="p-4 rounded-2xl bg-slate-950 border-2 border-cyan-500/50 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-hud font-black text-sm text-amber-300 flex items-center gap-1.5">
            <Radar className="w-4 h-4 text-cyan-400" />
            <span>{tr(language, 'Live NASA NeoWs Asteroid Corridor Radar:', 'رادار NASA NeoWs الحي (بيانات ناسا المحفوظة محلياً):')}</span>
          </p>
          <p className="font-hud text-xs sm:text-sm text-cyan-100 mt-1">
            {tr(
              language,
              `Object ${asteroid2010PK.name} • Velocity: ${asteroid2010PK.relativeVelocityKmS.toFixed(1)} km/s • Safe Miss Distance: ${asteroid2010PK.missDistanceLunar.toFixed(1)} LD (Safe 100%).`,
              `الكويكب ${asteroid2010PK.name} • السرعة: ${asteroid2010PK.relativeVelocityKmS.toFixed(1)} كم/ث • مسافة المرور الآمنة: ${asteroid2010PK.missDistanceLunar.toFixed(1)} ضعف مسافة القمر (آمن 100%).`
            )}
          </p>
        </div>
        <canvas
          ref={neowsCanvasRef}
          width={156}
          height={46}
          className="rounded-xl border border-cyan-500/40 shrink-0"
        />
      </div>

      {/* Inline Vestibular Fluid Shift Check (OSDR-354) */}
      <div className="p-3 rounded-2xl bg-slate-950/90 border border-pink-400/45 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-hud font-bold text-pink-200">
          🧬 {tr(
            language,
            'Vestibular Adaptation Check: Counteract 0G fluid shift before lunar landing',
            'فحص التوازن في 0G: تأكيد استقرار السوائل والأذن الداخلية قبل الهبوط'
          )}
        </span>
        <button
          type="button"
          onClick={() => {
            soundManager.playDropSuccess();
            setVestibularChecked(true);
          }}
          className={`px-3 py-1.5 rounded-xl font-hud font-black cursor-pointer ${
            vestibularChecked
              ? 'bg-emerald-500 text-slate-950'
              : 'bg-pink-400 hover:bg-pink-300 text-slate-950'
          }`}
        >
          {vestibularChecked ? tr(language, 'Stabilized ✓', 'مستقر ✓') : tr(language, 'Stabilize Vestibular ✓', 'تأكيد استقرار الطاقم')}
        </button>
      </div>

      {/* Interactive 3-Lane NeoWs Asteroid Evasion Radar */}
      <div
        data-testid="neows-dodge-radar"
        className="rounded-2xl bg-slate-950 border-2 border-indigo-400/60 p-3.5 space-y-2.5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-hud font-black">
          <span className="text-cyan-200">
            ☄️ {tr(language, 'NeoWs Trajectory Evasion', 'تفادي صخور المدار القمري')}
          </span>
          <div className="flex items-center gap-2">
            {boostCharges > 0 && dodgesCleared < 2 && (
              <button
                type="button"
                data-testid="neows-fuel-boost-btn"
                onClick={() => {
                  soundManager.playFanfare();
                  setBoostCharges((c) => Math.max(0, c - 1));
                  setDodgesCleared((d) => Math.min(2, d + 1));
                  setRadarToast(
                    tr(
                      language,
                      '⚡ L1 Compact Ration Fuel Surge cleared the debris arc!',
                      '⚡ وقود الطعام المضغوط فجّر مسار الحطام بنجاح!'
                    )
                  );
                }}
                className="px-2.5 py-1 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-hud font-black text-[11px] flex items-center gap-1 cursor-pointer"
              >
                <Flame className="w-3 h-3" />
                <span>{tr(language, `Use L1 Fuel Boost (${boostCharges}⚡)`, `دفع وقود م1 (${boostCharges}⚡)`)}</span>
              </button>
            )}
            <span className={dodgesCleared >= 2 ? 'text-emerald-300' : 'text-amber-300'}>
              {dodgesCleared >= 2
                ? tr(language, 'Corridor Clear! ✅ (2/2)', 'تم تأمين الممر! ✅ (2/2)')
                : tr(language, `Dodge 2 Rocks: ${dodgesCleared}/2`, `تفادَ صخرتين: ${dodgesCleared}/2`)}
            </span>
          </div>
        </div>

        <div className="space-y-1.5">
          {[0, 1, 2].map((laneIdx) => (
            <button
              key={laneIdx}
              type="button"
              onClick={() => {
                soundManager.playClick();
                setShuttleLane(laneIdx as 0 | 1 | 2);
              }}
              className={`relative w-full h-10 rounded-xl border flex items-center px-3 overflow-hidden cursor-pointer transition-colors ${
                shuttleLane === laneIdx
                  ? 'bg-cyan-950/75 border-cyan-400'
                  : 'bg-slate-900/80 border-slate-700 hover:border-slate-500'
              }`}
            >
              {shuttleLane === laneIdx && (
                <span className="text-xl z-10 select-none">🛸</span>
              )}
              {rockLane === laneIdx && dodgesCleared < 2 && (
                <span
                  style={{ left: `${rockX}%` }}
                  className="absolute text-xl select-none transition-all duration-100"
                >
                  🪨
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="neows-lane-up"
              onClick={() => {
                soundManager.playClick();
                setShuttleLane((l) => (Math.max(0, l - 1) as 0 | 1 | 2));
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-cyan-700 text-white font-hud font-black text-xs border border-cyan-400/50 flex items-center gap-1 cursor-pointer"
            >
              <ArrowUp className="w-3.5 h-3.5" />
              <span>{tr(language, 'Up', 'أعلى')}</span>
            </button>
            <button
              type="button"
              data-testid="neows-lane-down"
              onClick={() => {
                soundManager.playClick();
                setShuttleLane((l) => (Math.min(2, l + 1) as 0 | 1 | 2));
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-cyan-700 text-white font-hud font-black text-xs border border-cyan-400/50 flex items-center gap-1 cursor-pointer"
            >
              <ArrowDown className="w-3.5 h-3.5" />
              <span>{tr(language, 'Down', 'أسفل')}</span>
            </button>
          </div>
          {radarToast && <span className="text-xs font-bold text-amber-200">{radarToast}</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {systems.map((s) => {
          const ok = sysChecks.includes(s.id);
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                soundManager.playClick();
                setSysChecks((prev) => (prev.includes(s.id) ? prev : [...prev, s.id]));
              }}
              className={`p-3.5 rounded-2xl border-2 flex items-center justify-between cursor-pointer ${
                ok ? 'bg-emerald-950 border-emerald-400 text-white' : 'bg-slate-800 border-slate-600 text-slate-200'
              }`}
            >
              <span className="font-hud font-bold text-xs sm:text-sm">
                {tr(language, s.labelEn, s.labelAr)}
              </span>
              {ok ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <span className="text-xs text-amber-300">{tr(language, 'Verify', 'فحص')}</span>
              )}
            </button>
          );
        })}
      </div>

      {arrivalConfirmed ? (
        <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-emerald-950 border-4 border-amber-300 text-center space-y-3">
          <p className="font-mono font-black text-xl sm:text-2xl text-amber-300">
            {tr(language, 'LUNAR ARRIVAL CONFIRMED!', 'تم تأكيد الوصول إلى القمر بنجاح!')}
          </p>
          <p className="font-hud font-black text-base text-white">
            {tr(
              language,
              'Artemis Lunar Base reached! Level 3 Unlocked 🌕',
              'تم تأكيد الوصول إلى قاعدة القمر أرتميس! فُتح المستوى الثالث 🌕'
            )}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={onNextLevel}
              data-testid="mission-next-level-btn"
              className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-300 via-yellow-300 to-orange-400 text-slate-950 font-hud font-black text-base border-2 border-white shadow-[0_0_26px_rgba(251,191,36,0.75)] cursor-pointer hover:scale-105 transition-transform animate-pulse"
            >
              {tr(language, 'Mission Complete! Land on the Moon 🚀', 'المهمة اكتملت! انطلق للمرحلة التالية 🚀')}
            </button>
            <button
              type="button"
              onClick={onBackToLevel}
              className="px-5 py-3 rounded-2xl bg-slate-800 text-white font-hud font-bold text-sm border border-cyan-400 cursor-pointer"
            >
              {tr(language, 'Back to Station Map', 'العودة للخريطة')}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={!readyForMoon}
          onClick={() => {
            setArrivalConfirmed(true);
            soundManager.playFanfare();
            confetti({ particleCount: 140, spread: 90 });
            void dialogueManager.speak(
              tr(
                language,
                'Touchdown! Welcome to Artemis Lunar Base on the Moon!',
                'مبروووك! تم تأكيد الوصول إلى القمر! استعد لمهمات قاعدة أرتميس!'
              )
            );
            onCompleteMiniGame('l2_systems_neows', { l2MotionRested: true });
          }}
          className={`w-full py-3.5 rounded-2xl font-hud font-black text-base border-2 flex items-center justify-center gap-2 ${
            readyForMoon
              ? 'bg-gradient-to-r from-indigo-400 to-amber-400 text-slate-950 border-white cursor-pointer'
              : 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
          }`}
        >
          <ShieldCheck className="w-5 h-5" />
          <span>
            {readyForMoon
              ? tr(language, 'Confirm All Systems & Land on the Moon 🌕', 'تأكيد جميع الأنظمة والهبوط على القمر 🌕')
              : tr(language, 'Verify 5 systems & dodge 2 radar rocks to land 🔒', 'افحص الـ 5 أنظمة وتفادَ صخرتين للهبوط 🔒')}
          </span>
        </button>
      )}
    </div>
  );
};
