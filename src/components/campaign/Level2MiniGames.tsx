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
import { StationLandscapeFrame } from './StationLandscapeFrame';
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
    const startMs = performance.now();
    const stars = Array.from({ length: 24 }, (_, i) => ({
      x: (i * 23) % canvas.width,
      y: 6 + ((i * 17) % (canvas.height - 12)),
      speed: 1.4 + (asteroid2010PK.relativeVelocityKmS || 10) * 0.14
    }));
    const draw = () => {
      rafId = window.requestAnimationFrame(draw);
      const t = (performance.now() - startMs) / 1000;
      const w = canvas.width;
      const h = canvas.height;
      const bg = ctx.createLinearGradient(0, 0, w, h);
      bg.addColorStop(0, '#020617');
      bg.addColorStop(1, '#091532');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      stars.forEach((s) => {
        s.x -= s.speed;
        if (s.x < 0) s.x = w;
        ctx.fillStyle = 'rgba(186,230,253,0.72)';
        ctx.fillRect(s.x, s.y, 4.5, 1.4);
      });

      // Phased-Array Conic Radar Sweep on Left
      const rCx = 24;
      const rCy = h * 0.5;
      for (const rad of [8, 15, 22]) {
        ctx.strokeStyle = 'rgba(52, 211, 153, 0.25)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(rCx, rCy, rad, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.save();
      ctx.translate(rCx, rCy);
      ctx.rotate(t * 3.1);
      const sweepGrad = ctx.createRadialGradient(0, 0, 1, 0, 0, 22);
      sweepGrad.addColorStop(0, 'rgba(52, 211, 153, 0.7)');
      sweepGrad.addColorStop(1, 'rgba(52, 211, 153, 0.02)');
      ctx.fillStyle = sweepGrad;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 22, -0.5, 0.2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Rotating Multi-Vertex Faceted Asteroid Polygon sweeping along track
      const ax = w - 26 - ((t * 42) % (w - 68));
      const ay = (shuttleLane + 0.5) * (h / 3);
      ctx.save();
      ctx.translate(ax, ay);
      ctx.rotate(t * 2.4);
      ctx.fillStyle = '#94a3b8';
      ctx.strokeStyle = '#f87171';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      [9, 6, 10, 7, 9, 6].forEach((r, i) => {
        const a = (i / 6) * Math.PI * 2;
        if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // Trajectory target scan corridor
      ctx.strokeStyle = 'rgba(56,189,248,0.4)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(48, ay);
      ctx.lineTo(w, ay);
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
      <StationLandscapeFrame
        accentBorderClass="border-cyan-400/70"
        roboTip={tr(
          language,
          'Push gently in 0G, grab floating gear, then brake with the handrail (≤ 1.2 m/s)!',
          'ادفع نفسك برفق في 0G والتقط الأدوات ثم امسك الدرابزين للتوقف بسرعة ≤ 1.2 م/ث!'
        )}
        leftStage={
          <div className="flex-1 min-h-0 flex flex-col justify-between gap-2 overflow-hidden">
            <div
              dir="ltr"
              className="relative flex-1 min-h-[140px] rounded-2xl bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 border-2 border-indigo-400/70 overflow-hidden px-3 flex items-center"
            >
              <svg
                viewBox="0 0 400 120"
                preserveAspectRatio="none"
                className="absolute inset-0 w-full h-full pointer-events-none opacity-65"
              >
                <defs>
                  <linearGradient id="issHullRib" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.45" />
                    <stop offset="50%" stopColor="#818cf8" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.45" />
                  </linearGradient>
                </defs>
                {[55, 115, 175, 235, 295, 355].map((rx) => (
                  <ellipse
                    key={rx}
                    cx={rx}
                    cy="60"
                    rx="18"
                    ry="54"
                    fill="none"
                    stroke="url(#issHullRib)"
                    strokeWidth="2.5"
                  />
                ))}
                <line x1="0" y1="60" x2="400" y2="60" stroke="rgba(56,189,248,0.18)" strokeDasharray="8 6" strokeWidth="1.5" />
              </svg>
              <div className="absolute top-2.5 inset-x-3 h-2 rounded-full bg-amber-400/80 border border-white/50" />
              <div className="absolute bottom-2.5 inset-x-3 h-2 rounded-full bg-amber-400/80 border border-white/50" />
              <div className="absolute left-2.5 top-5 bottom-5 w-11 rounded-xl bg-emerald-500/25 border-2 border-emerald-400 flex flex-col items-center justify-center text-[10px] font-hud font-black text-emerald-300">
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
                    className={`absolute top-6 -translate-x-1/2 px-1.5 py-0.5 rounded-lg border text-[11px] font-hud font-black transition-all cursor-pointer ${
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
                className="absolute top-1/2 -translate-y-1/2 text-3xl sm:text-4xl transition-all duration-75"
              >
                🧑‍🚀
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] font-hud font-bold text-cyan-200 px-1 shrink-0">
              <span>{tr(language, `Velcro Gear Salvaged: ${salvagedItems.length}/3`, `الأدوات الملتقطة: ${salvagedItems.length}/3`)}</span>
              <span className={Math.abs(velX) > 1.2 ? 'text-rose-300' : 'text-emerald-300'}>
                {tr(language, `Speed: ${velX.toFixed(1)} m/s`, `السرعة: ${velX.toFixed(1)} م/ث`)}
              </span>
            </div>
          </div>
        }
        rightHeader={
          <div className="flex items-center justify-between text-xs font-hud font-black">
            <span className="text-cyan-200">{tr(language, '🧑‍🚀 Zero-G Corridor Thruster & Brake', '🧑‍🚀 الدفع والفرملة في انعدام الجاذبية')}</span>
            <span className="text-amber-300 font-mono">{velX.toFixed(1)} m/s</span>
          </div>
        }
        rightContent={
          <div className="space-y-2 my-auto">
            <div className="p-2.5 rounded-xl bg-slate-950/90 border border-slate-700 flex items-center justify-between text-xs font-bold">
              <span className="text-slate-200">{tr(language, 'Target Docking Speed at Airlock:', 'سرعة الوصول الآمنة عند البوابة:')}</span>
              <span className={Math.abs(velX) <= 1.2 ? 'text-emerald-300 font-hud font-black' : 'text-rose-300 font-hud font-black'}>
                {tr(language, '≤ 1.2 m/s', '≤ 1.2 م/ث')}
              </span>
            </div>

            {bumpWarning && (
              <div className="p-2.5 rounded-xl bg-amber-950 border border-amber-400 text-amber-200 font-hud font-bold text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{bumpWarning}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  soundManager.playClick();
                  setBumpWarning(null);
                  setVelX((v) => Math.min(3.6, +(v + 0.9).toFixed(1)));
                }}
                className="py-3.5 px-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-hud font-black text-xs sm:text-sm cursor-pointer border-2 border-white shadow"
              >
                {tr(language, 'Push Forward 🚀', 'ادفع للأمام 🚀')}
              </button>
              <button
                type="button"
                onClick={() => {
                  soundManager.playPressurizeHiss();
                  setVelX((v) => +(v * 0.45).toFixed(1));
                }}
                className="py-3.5 px-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-hud font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer border-2 border-white shadow"
              >
                <Hand className="w-4 h-4 shrink-0" />
                <span>{tr(language, 'Grab Handrail (Brake)', 'امسك الدرابزين')}</span>
              </button>
            </div>
          </div>
        }
        primaryCta={
          handrailWon ? (
            <div className="py-2 rounded-xl bg-emerald-950/85 border border-emerald-400 text-center text-xs font-hud font-black text-emerald-200">
              {tr(language, '✅ Docked Safely at ≤ 1.2 m/s!', '✅ تم التوقف والوصول للبوابة بأمان!')}
            </div>
          ) : undefined
        }
      />
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
      <StationLandscapeFrame
        accentBorderClass="border-indigo-400/70"
        roboTip={tr(
          language,
          'Tap a floating item on the left, then tap its matching velcro locker on the right.',
          'اضغط الغرض الطافي باليسار ثم اضغط خزانته المطابقة باليمين.'
        )}
        leftStage={
          <div className="flex-1 min-h-0 flex flex-wrap content-start gap-2 p-2 rounded-xl bg-slate-950 border border-indigo-500/40 overflow-y-auto">
            {remaining.length === 0 ? (
              <span className="font-hud font-black text-xs text-emerald-300 m-auto">
                {tr(language, 'All 5 zero-G items stowed! ✅', 'تم تثبيت جميع الأغراض الخمسة! ✅')}
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
                  className={`px-2.5 py-1.5 rounded-xl border-2 font-hud font-black text-xs flex items-center gap-1.5 cursor-pointer ${
                    selectedFloating === item.id
                      ? 'bg-amber-400 text-slate-950 border-white scale-105'
                      : 'bg-sky-900 text-white border-cyan-400'
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  <span>{tr(language, item.nameEn, item.nameAr)}</span>
                </button>
              ))
            )}
          </div>
        }
        rightHeader={
          <div className="text-xs font-hud font-black text-indigo-200">
            {tr(language, `🧲 Velcro Lockers (${stowed.length}/${FLOATING_ITEMS.length})`, `🧲 خزانات الفيلكرو (${stowed.length}/${FLOATING_ITEMS.length})`)}
          </div>
        }
        rightContent={
          <div className="grid grid-cols-2 gap-1.5">
            {FLOATING_ITEMS.map((item) => {
              const done = stowed.includes(item.id);
              const itemName = tr(language, item.nameEn, item.nameAr);
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={done}
                  onClick={() => matchToLocker(item.id)}
                  className={`p-2 rounded-xl border-2 transition-all ${
                    language === 'ar' ? 'text-right' : 'text-left'
                  } ${
                    done
                      ? 'bg-emerald-950 border-emerald-400 text-emerald-200'
                      : selectedFloating
                      ? 'bg-slate-800 border-amber-300 text-white cursor-pointer hover:bg-sky-900'
                      : 'bg-slate-800/80 border-slate-600 text-slate-300'
                  }`}
                >
                  <p className="font-hud font-black text-xs truncate">{tr(language, item.lockerEn, item.lockerAr)}</p>
                  <p className="font-hud text-[10.5px] text-cyan-200 truncate mt-0.5">
                    {done ? `✅ ${item.icon} ${itemName}` : `${item.icon} ${itemName}`}
                  </p>
                </button>
              );
            })}
          </div>
        }
      />
    );
  }

  // 2.3 BALANCED SPACE MEAL + INLINE 0G HYDRATION
  if (miniGameId === 'l2_balanced_meal') {
    const toggleGroup = (id: string) => {
      soundManager.playDropSuccess();
      setTrayGroups((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    };
    const balanced = trayGroups.length >= MEAL_GROUPS.length;
    const readyToConfirmMeal = balanced && inlineHydrationDone;

    return (
      <StationLandscapeFrame
        accentBorderClass="border-emerald-400/70"
        roboTip={tr(
          language,
          'Select all 4 Egyptian & Sinai food groups and sip from the 0G water pouch!',
          'اختر المجموعات الغذائية الأربع واشرب برفق من كيس الماء الفضائي!'
        )}
        leftStage={
          <div className="flex-1 min-h-0 flex flex-col justify-between gap-1.5 overflow-hidden">
            <div className="px-2 py-1 rounded-xl bg-slate-950/90 border border-cyan-500/45 flex items-center justify-between gap-1.5 text-[10.5px] font-hud font-bold shrink-0">
              <span className="text-cyan-200 truncate">
                🔗 {tr(language, `L1 HEPA: ${effects.cabinFilterHealthPct}%`, `فلتر م1: ${effects.cabinFilterHealthPct}%`)}
              </span>
              <span className={effects.thrusterFuelBonus > 0 ? 'text-amber-300 shrink-0' : 'text-slate-400 shrink-0'}>
                ⚡ +{effects.thrusterFuelBonus}⚡
              </span>
            </div>

            <BodyTelemetryMeters
              compact
              language={language}
              titleEn="0G Body Telemetry"
              titleAr="تغذية الجسم في المدار"
              metrics={[
                { key: 'bone', value: Math.min(100, 52 + trayGroups.length * 12) },
                { key: 'muscle', value: Math.min(100, 50 + trayGroups.length * 12) }
              ]}
            />

            <div className="px-2 py-1 rounded-xl bg-sky-950/60 border border-sky-400/40 text-[10px] text-sky-100 flex items-center justify-between gap-1.5 shrink-0">
              <span className="truncate">
                📐 {DAILY_REFERENCE_ASSUMPTIONS.energyKcal} kcal • {DAILY_REFERENCE_ASSUMPTIONS.proteinGrams}g P
              </span>
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-amber-950 border border-amber-400 text-amber-200 shrink-0">
                {tr(language, SCIENCE_BADGES.GAME_RULE.labelEn, SCIENCE_BADGES.GAME_RULE.labelAr)}
              </span>
            </div>
          </div>
        }
        rightHeader={
          <div className="flex items-center justify-between gap-2 text-xs font-hud font-black">
            <span className="text-emerald-200 truncate">
              {tr(language, `🍱 0G Meal Groups (${trayGroups.length}/4)`, `🍱 مجموعات الطعام (${trayGroups.length}/4)`)}
            </span>
            <span className={inlineHydrationDone ? 'text-emerald-300 shrink-0' : 'text-cyan-200 shrink-0'}>
              {inlineHydrationDone ? tr(language, '💧 100% ✓', '💧 مكتمل ✓') : tr(language, '💧 Sip Valve ↓', '💧 تحدي الشرب ↓')}
            </span>
          </div>
        }
        rightContent={
          <div className="space-y-1">
            <div className="grid grid-cols-2 gap-1.5">
              {MEAL_GROUPS.map((g) => {
                const active = trayGroups.includes(g.id);
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => toggleGroup(g.id)}
                    className={`p-1.5 rounded-xl border-2 font-hud font-black text-[10.5px] leading-tight cursor-pointer transition-all ${
                      language === 'ar' ? 'text-right' : 'text-left'
                    } ${
                      active
                        ? 'bg-emerald-950 border-emerald-400 text-white'
                        : 'bg-slate-800 border-slate-600 text-slate-200 hover:border-cyan-400'
                    }`}
                  >
                    <span className="line-clamp-2">
                      {active ? '✅ ' : '⬜ '}
                      {tr(language, g.labelEn, g.labelAr)}
                    </span>
                  </button>
                );
              })}
            </div>

            {!inlineHydrationDone ? (
              <HydrationGame compact onComplete={() => setInlineHydrationDone(true)} />
            ) : (
              <div className="px-2.5 py-2 rounded-xl bg-emerald-950/70 border border-emerald-400 text-emerald-200 font-hud font-black text-xs flex items-center justify-between">
                <span>💧 {tr(language, 'Phase 2: Orbit Zero-G Hydration Valve', 'المرحلة 2: صمام الترطيب 0G')}</span>
                <span>{tr(language, 'Sealed 100% ✓', 'مكتمل 100% ✓')}</span>
              </div>
            )}
          </div>
        }
        primaryCta={
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
            className={`w-full py-2.5 rounded-xl font-hud font-black text-xs sm:text-sm border-2 ${
              readyToConfirmMeal
                ? 'bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 border-white cursor-pointer'
                : 'bg-slate-800 text-slate-400 border-slate-700 cursor-not-allowed'
            }`}
          >
            {readyToConfirmMeal
              ? tr(language, 'Confirm Balanced Space Meal 🍱', 'تأكيد الوجبة المتوازنة 🍱')
              : tr(language, 'Pick 4 food groups & sip 0G hydration 🔒', 'اختر المجموعات الأربع وأكمل الشرب 🔒')}
          </button>
        }
      />
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
      <StationLandscapeFrame
        accentBorderClass="border-pink-400/70"
        roboTip={tr(
          language,
          'Follow steps 1 → 2 → 3 to stabilize zero-G fluid shift and notify Ground Med!',
          'اتبع الخطوات الثلاث بالترتيب لعلاج دوار الفضاء وإبلاغ الطبيب الأرضي!'
        )}
        leftStage={
          <div className="flex-1 min-h-0 flex flex-col justify-between gap-1.5 overflow-hidden">
            <BodyTelemetryMeters
              compact
              language={language}
              titleEn="Vestibular Telemetry"
              titleAr="توازن السوائل والأذن"
              metrics={[
                { key: 'hydration', value: restedCrew ? 94 : 64 },
                { key: 'muscle', value: medSupportSent ? 92 : 68 }
              ]}
            />
            <div className="px-2 py-1 rounded-xl bg-sky-950/70 border border-cyan-400/50 text-[10.5px] font-hud text-cyan-100 truncate shrink-0">
              🧬 <strong>{osdrFluid.osdrCode}:</strong>{' '}
              {tr(language, '0G fluid shift lasts 48–72h', osdrFluid.findingAr)}
            </div>
          </div>
        }
        rightContent={
          <div className="space-y-2 my-auto">
            <button
              type="button"
              onClick={() => {
                soundManager.playClick();
                setDiagnosisPicked(true);
              }}
              className={`w-full p-2.5 rounded-xl border-2 cursor-pointer ${
                language === 'ar' ? 'text-right' : 'text-left'
              } ${diagnosisPicked ? 'bg-emerald-950 border-emerald-400' : 'bg-slate-800 border-pink-400/70'}`}
            >
              <p className="font-hud font-black text-xs text-white">{tr(language, '1. Diagnose Symptoms', '1. تشخيص الأعراض')}</p>
              <p className="font-hud text-[11px] text-slate-200">
                {diagnosisPicked ? tr(language, '✅ 0G vestibular adaptation', '✅ دوار التكيف مع انعدام الجاذبية') : tr(language, 'Identify cause of dizziness in 0G', 'حدد سبب الدوخة في 0G')}
              </p>
            </button>

            <button
              type="button"
              disabled={!diagnosisPicked}
              onClick={() => {
                soundManager.playCrystalSparkle();
                setRestedCrew(true);
              }}
              className={`w-full p-2.5 rounded-xl border-2 ${
                language === 'ar' ? 'text-right' : 'text-left'
              } ${
                restedCrew
                  ? 'bg-emerald-950 border-emerald-400'
                  : diagnosisPicked
                  ? 'bg-slate-800 border-purple-400 cursor-pointer'
                  : 'bg-slate-900 border-slate-700 opacity-60'
              }`}
            >
              <p className="font-hud font-black text-xs text-white">{tr(language, '2. Rest in Crew Quarters', '2. الراحة في حجرة الطاقم')}</p>
              <p className="font-hud text-[11px] text-slate-200">
                {restedCrew ? tr(language, '✅ Sleep bag + hydrated', '✅ استراح الطاقم وشرب ماء') : tr(language, 'Zip into sleep bag & hydrate', 'ثبّت كيس النوم واسترح')}
              </p>
            </button>

            <button
              type="button"
              disabled={!restedCrew}
              onClick={() => {
                soundManager.playFanfare();
                setMedSupportSent(true);
                void dialogueManager.speak(
                  tr(language, 'Motion sickness stabilized! Crew ready for lunar orbit!', 'تم استقرار حالة الدوار والطاقم بصحة ممتازة!')
                );
                onCompleteMiniGame('l2_motion_sickness', { l2MotionRested: true });
              }}
              className={`w-full p-2.5 rounded-xl border-2 ${
                language === 'ar' ? 'text-right' : 'text-left'
              } ${
                medSupportSent
                  ? 'bg-emerald-950 border-emerald-400'
                  : restedCrew
                  ? 'bg-slate-800 border-cyan-400 cursor-pointer'
                  : 'bg-slate-900 border-slate-700 opacity-60'
              }`}
            >
              <p className="font-hud font-black text-xs text-white">{tr(language, '3. Telemetry to Flight Surgeon', '3. اتصال الدعم الطبي')}</p>
              <p className="font-hud text-[11px] text-slate-200">
                {medSupportSent ? tr(language, '✅ Flight surgeon cleared', '✅ تم تأكيد التعافي') : tr(language, 'Send recovery report', 'أرسل التقرير للطبيب الأرضي')}
              </p>
            </button>
          </div>
        }
        primaryCta={
          allDone ? (
            <div className="py-2 rounded-xl bg-emerald-950/75 border border-emerald-400 text-emerald-200 font-hud font-black text-xs text-center">
              {tr(language, '✅ Crew fully recovered from Zero-G motion sickness!', '✅ تعافى الطاقم تماماً!')}
            </div>
          ) : undefined
        }
      />
    );
  }

  // 2.6 FINAL SYSTEMS CHECK & LIVE NASA NEOWS 3-LANE ASTEROID DODGE
  const systems = [
    { id: 'oxygen', labelEn: 'Oxygen Tanks (14.7 PSI)', labelAr: 'الأكسجين (14.7 PSI)' },
    { id: 'water', labelEn: 'Potable Water (100%)', labelAr: 'المياه النقية (100%)' },
    { id: 'power', labelEn: 'Solar & Power Bus', labelAr: 'الطاقة والخلايا الشمسية' },
    { id: 'comms', labelEn: 'Lunar Orbit Comms', labelAr: 'اتصالات المدار القمري' },
    {
      id: 'navigation',
      labelEn: `NeoWs Track: ${asteroid2010PK.name}`,
      labelAr: `رادار NeoWs: ${asteroid2010PK.name}`
    }
  ];
  const allSysChecked = sysChecks.length >= systems.length;
  const readyForMoon = allSysChecked && dodgesCleared >= 2 && vestibularChecked;

  return (
    <StationLandscapeFrame
      accentBorderClass="border-amber-400/70"
      roboTip={tr(
        language,
        'Dodge 2 asteroid rocks on NeoWs radar, stabilize vestibular check & verify 5 systems!',
        'تفادَ صخرتين على رادار NeoWs وأكّد التوازن وافحص الأنظمة الخمسة!'
      )}
      leftStage={
        <div className="flex-1 min-h-0 flex flex-col justify-between gap-1.5 overflow-hidden">
          {/* Compact NASA NeoWs Asteroid Corridor Readout */}
          <div className="p-1.5 rounded-xl bg-slate-950 border border-cyan-500/45 flex items-center justify-between gap-2 shrink-0">
            <div className="min-w-0">
              <p className="font-hud font-black text-[11px] text-amber-300 flex items-center gap-1 truncate">
                <Radar className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>{asteroid2010PK.name} • {asteroid2010PK.relativeVelocityKmS.toFixed(1)} km/s</span>
              </p>
              <p className="text-[10px] text-cyan-100 truncate">
                {tr(language, `Miss: ${asteroid2010PK.missDistanceLunar.toFixed(1)} LD (Safe)`, `المسافة: ${asteroid2010PK.missDistanceLunar.toFixed(1)} LD`)}
              </p>
            </div>
            <canvas
              ref={neowsCanvasRef}
              width={136}
              height={36}
              className="rounded-lg border border-cyan-500/40 shrink-0"
            />
          </div>

          {/* Interactive 3-Lane NeoWs Asteroid Evasion Radar */}
          <div
            data-testid="neows-dodge-radar"
            className="flex-1 min-h-0 rounded-xl bg-slate-950 border border-indigo-400/55 p-2 flex flex-col justify-between gap-1.5 overflow-hidden"
          >
            <div className="flex items-center justify-between gap-1 text-[11px] font-hud font-black shrink-0">
              <span className="text-cyan-200 truncate">☄️ {tr(language, 'NeoWs Trajectory', 'تفادي صخور المدار')}</span>
              <span className={dodgesCleared >= 2 ? 'text-emerald-300 shrink-0' : 'text-amber-300 shrink-0'}>
                {dodgesCleared >= 2 ? tr(language, 'Clear ✅ (2/2)', 'آمن ✅ (2/2)') : `${dodgesCleared}/2`}
              </span>
            </div>

            <div className="space-y-1 flex-1 flex flex-col justify-center">
              {[0, 1, 2].map((laneIdx) => (
                <button
                  key={laneIdx}
                  type="button"
                  dir="ltr"
                  onClick={() => {
                    soundManager.playClick();
                    setShuttleLane(laneIdx as 0 | 1 | 2);
                  }}
                  className={`relative w-full h-7 rounded-lg border flex items-center px-2 overflow-hidden cursor-pointer transition-colors ${
                    shuttleLane === laneIdx
                      ? 'bg-cyan-950/75 border-cyan-400'
                      : 'bg-slate-900/80 border-slate-700 hover:border-slate-500'
                  }`}
                >
                  {shuttleLane === laneIdx && <span className="text-base z-10 select-none">🛸</span>}
                  {rockLane === laneIdx && dodgesCleared < 2 && (
                    <span
                      style={{ left: `${rockX}%` }}
                      className="absolute text-base select-none transition-all duration-100"
                    >
                      🪨
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between gap-1.5 shrink-0">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  data-testid="neows-lane-up"
                  onClick={() => {
                    soundManager.playClick();
                    setShuttleLane((l) => (Math.max(0, l - 1) as 0 | 1 | 2));
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-cyan-700 text-white font-hud font-black text-[11px] border border-cyan-400/50 flex items-center gap-1 cursor-pointer"
                >
                  <ArrowUp className="w-3 h-3" />
                  <span>{tr(language, 'Up', 'أعلى')}</span>
                </button>
                <button
                  type="button"
                  data-testid="neows-lane-down"
                  onClick={() => {
                    soundManager.playClick();
                    setShuttleLane((l) => (Math.min(2, l + 1) as 0 | 1 | 2));
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-cyan-700 text-white font-hud font-black text-[11px] border border-cyan-400/50 flex items-center gap-1 cursor-pointer"
                >
                  <ArrowDown className="w-3 h-3" />
                  <span>{tr(language, 'Down', 'أسفل')}</span>
                </button>
              </div>
              {boostCharges > 0 && dodgesCleared < 2 ? (
                <button
                  type="button"
                  data-testid="neows-fuel-boost-btn"
                  onClick={() => {
                    soundManager.playFanfare();
                    setBoostCharges((c) => Math.max(0, c - 1));
                    setDodgesCleared((d) => Math.min(2, d + 1));
                    setRadarToast(tr(language, '⚡ Fuel surge cleared rock!', '⚡ الوقود فجّر المسار!'));
                  }}
                  className="px-2 py-1 rounded-full bg-amber-400 text-slate-950 font-hud font-black text-[10px] flex items-center gap-1 cursor-pointer"
                >
                  <Flame className="w-3 h-3" />
                  <span>{boostCharges}⚡</span>
                </button>
              ) : (
                radarToast && <span className="text-[10px] font-bold text-amber-200 truncate">{radarToast}</span>
              )}
            </div>
          </div>
        </div>
      }
      rightHeader={
        <div className="flex items-center justify-between gap-2 text-xs font-hud font-black text-amber-200">
          <span>{tr(language, `🛸 Lunar Systems (${sysChecks.length}/${systems.length})`, `🛸 أنظمة الهبوط (${sysChecks.length}/${systems.length})`)}</span>
          <span className={vestibularChecked ? 'text-emerald-300' : 'text-pink-300'}>
            {vestibularChecked ? tr(language, 'Crew Stable ✓', 'الطاقم مستقر ✓') : tr(language, 'Vestibular Pending', 'فحص التوازن')}
          </span>
        </div>
      }
      rightContent={
        <div className="space-y-1.5">
          <div className="p-2 rounded-xl bg-slate-950/90 border border-pink-400/45 flex items-center justify-between gap-2 text-[11px]">
            <span className="font-hud font-bold text-pink-200 truncate">
              🧬 {tr(language, '0G Vestibular Fluid Shift Check (OSDR-354)', 'فحص استقرار السوائل والأذن (OSDR-354)')}
            </span>
            <button
              type="button"
              onClick={() => {
                soundManager.playDropSuccess();
                setVestibularChecked(true);
              }}
              className={`px-2.5 py-1 rounded-lg font-hud font-black cursor-pointer shrink-0 ${
                vestibularChecked ? 'bg-emerald-500 text-slate-950' : 'bg-pink-400 hover:bg-pink-300 text-slate-950'
              }`}
            >
              {vestibularChecked ? tr(language, 'Stabilized ✓', 'مستقر ✓') : tr(language, 'Stabilize ✓', 'تأكيد')}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
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
                  className={`p-2 rounded-xl border-2 flex items-center justify-between gap-1.5 cursor-pointer ${
                    ok ? 'bg-emerald-950 border-emerald-400 text-white' : 'bg-slate-800 border-slate-600 text-slate-200'
                  }`}
                >
                  <span className="font-hud font-bold text-[11px] truncate">{tr(language, s.labelEn, s.labelAr)}</span>
                  {ok ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <span className="text-[10px] text-amber-300 shrink-0">{tr(language, 'Verify', 'فحص')}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      }
      primaryCta={
        arrivalConfirmed ? (
          <div className="p-2 rounded-xl bg-gradient-to-r from-indigo-950 via-slate-900 to-emerald-950 border-2 border-amber-300 flex items-center justify-between gap-2">
            <span className="font-hud font-black text-xs text-amber-300 truncate">
              {tr(language, 'LUNAR ARRIVAL CONFIRMED! Level 3 Unlocked 🌕', 'تم الوصول للقمر! فُتح المستوى 3 🌕')}
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={onNextLevel}
                data-testid="mission-next-level-btn"
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-300 to-orange-400 text-slate-950 font-hud font-black text-xs border border-white cursor-pointer"
              >
                {tr(language, 'Land on Moon 🚀', 'اهبط على القمر 🚀')}
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
            className={`w-full py-2.5 rounded-xl font-hud font-black text-xs sm:text-sm border-2 flex items-center justify-center gap-2 ${
              readyForMoon
                ? 'bg-gradient-to-r from-indigo-400 to-amber-400 text-slate-950 border-white cursor-pointer'
                : 'bg-slate-800 text-slate-400 border-slate-700 cursor-not-allowed'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>
              {readyForMoon
                ? tr(language, 'Confirm All Systems & Land on the Moon 🌕', 'تأكيد جميع الأنظمة والهبوط على القمر 🌕')
                : tr(language, 'Verify 5 systems, vestibular & dodge 2 rocks 🔒', 'افحص الأنظمة والتوازن وتفادَ صخرتين 🔒')}
            </span>
          </button>
        )
      }
    />
  );
};
