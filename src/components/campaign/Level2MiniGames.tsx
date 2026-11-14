import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { CampaignProgressState, MiniGameId } from '../../types/game';
import { HydrationGame } from '../minigames/HydrationGame';
import { nasaCache } from '../../services/nasa/nasaCache';
import { soundManager } from '../../utils/sound';
import { dialogueManager } from '../../utils/geminiTTS';
import { NASA_OSDR_METRICS } from '../../services/nasa/nasaOSDR';
import { DAILY_REFERENCE_ASSUMPTIONS, SCIENCE_BADGES } from '../../data/science';
import { CheckCircle2, Hand, Radar, ShieldCheck, AlertTriangle } from 'lucide-react';

interface Level2Props {
  miniGameId: MiniGameId;
  campaign: CampaignProgressState;
  onCompleteMiniGame: (id: MiniGameId, patch?: Partial<CampaignProgressState>) => void;
  onNextLevel: () => void;
  onBackToLevel: () => void;
}

const FLOATING_ITEMS = [
  { id: 'food_packages', nameAr: 'عبوات الطعام الفضائي', icon: '🍱', lockerAr: 'خزانة المطبخ 1' },
  { id: 'water_pouches', nameAr: 'أكياس الماء المختومة', icon: '💧', lockerAr: 'خزانة الترطيب 2' },
  { id: 'screwdriver', nameAr: 'مفك الصيانة المغناطيسي', icon: '🪛', lockerAr: 'خزانة الأدوات 3' },
  { id: 'medical_kit', nameAr: 'حقيبة الإسعاف الطائر', icon: '🩹', lockerAr: 'العيادة الطبية 4' },
  { id: 'scientific_instrument', nameAr: 'جهاز القياس العلمي', icon: '🔬', lockerAr: 'خزانة الأبحاث 5' }
];

const MEAL_GROUPS = [
  { id: 'protein', labelAr: '🧀 المش المصري بالملح الصخري أو الدجاج (بروتين وكالسيوم)', color: 'indigo' },
  { id: 'carbs', labelAr: '🍯 العسل الجبلي السيناوي + 🌴 العجوة المضغوطة (طاقة وكربوهيدرات بدون فتات)', color: 'amber' },
  { id: 'fats', labelAr: '🫒 زيت الزيتون السيناوي + طحينة السمسم (دهون صحية وأوميغا)', color: 'emerald' },
  { id: 'vitamins', labelAr: '🥬 الكابوتشا والجرجير واللفت المائي + توابل سيناوية (فيتامينات وألياف)', color: 'pink' }
];

export const Level2MiniGames: React.FC<Level2Props> = ({
  miniGameId,
  campaign,
  onCompleteMiniGame,
  onNextLevel,
  onBackToLevel
}) => {
  // 2.1 Zero-G Handrail Momentum
  const [roboX, setRoboX] = useState<number>(8); // 0..92 %
  const [velX, setVelX] = useState<number>(0);
  const [handrailWon, setHandrailWon] = useState<boolean>(
    campaign.completedMiniGames.includes('l2_zerog_movement')
  );
  const [bumpWarning, setBumpWarning] = useState<string | null>(null);

  // 2.2 Secure 5 Floating Objects
  const [stowed, setStowed] = useState<string[]>(campaign.l2SecuredObjects);
  const [selectedFloating, setSelectedFloating] = useState<string | null>(null);

  // 2.3 Balanced Meal
  const [trayGroups, setTrayGroups] = useState<string[]>(
    campaign.completedMiniGames.includes('l2_balanced_meal') ? MEAL_GROUPS.map((g) => g.id) : []
  );

  // 2.5 Motion Sickness & Rest
  const [diagnosisPicked, setDiagnosisPicked] = useState<boolean>(campaign.l2MotionRested);
  const [restedCrew, setRestedCrew] = useState<boolean>(campaign.l2MotionRested);
  const [medSupportSent, setMedSupportSent] = useState<boolean>(campaign.l2MotionRested);

  // 2.6 Final Systems & NeoWs Radar
  const [sysChecks, setSysChecks] = useState<string[]>(
    campaign.completedMiniGames.includes('l2_systems_neows')
      ? ['oxygen', 'water', 'power', 'comms', 'navigation']
      : []
  );
  const [arrivalConfirmed, setArrivalConfirmed] = useState<boolean>(
    campaign.completedMiniGames.includes('l2_systems_neows')
  );
  const asteroid2010PK = nasaCache.getAsteroid('3542519');

  // Physics loop for 2.1 Zero-G Corridor
  useEffect(() => {
    if (miniGameId !== 'l2_zerog_movement' || handrailWon) return;
    const timer = window.setInterval(() => {
      setRoboX((x) => {
        const next = x + velX;
        if (next >= 86) {
          if (Math.abs(velX) <= 1.2) {
            setHandrailWon(true);
            soundManager.playFanfare();
            void dialogueManager.speak('عاش يا بطل! وصلت لنهاية الممر باستخدام الدرابزين بأمان في انعدام الجاذبية!');
            onCompleteMiniGame('l2_zerog_movement');
            return 88;
          } else {
            soundManager.playAlertSiren();
            setBumpWarning('أوه! سرعتك عالية جداً عند الوصول! استخدم فرملة الدرابزين قبل فتحة القفل!');
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
  }, [miniGameId, velX, handrailWon, onCompleteMiniGame]);

  // 2.1 ZERO-G MOVEMENT CHALLENGE
  if (miniGameId === 'l2_zerog_movement') {
    return (
      <div className="bg-slate-900/95 border-2 border-cyan-400/75 rounded-3xl p-5 flex flex-col gap-4 shadow-xl">
        <p className="font-hud font-bold text-sm text-cyan-200">
          في الفضاء لا يوجد احتكاك! ادفع نفسك برفق ثم امسك الدرابزين لتخفيف السرعة عند الوصول للمخرج (الهدف: ≤ 1.2 م/ث):
        </p>

        <div className="relative h-40 rounded-2xl bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 border-2 border-indigo-400/70 overflow-hidden px-4 flex items-center">
          {/* Handrail Top & Bottom Bars */}
          <div className="absolute top-3 inset-x-4 h-2.5 rounded-full bg-amber-400/80 border border-white/50" />
          <div className="absolute bottom-3 inset-x-4 h-2.5 rounded-full bg-amber-400/80 border border-white/50" />
          {/* Goal Airlock */}
          <div className="absolute left-3 top-6 bottom-6 w-12 rounded-xl bg-emerald-500/25 border-2 border-emerald-400 flex flex-col items-center justify-center text-xs font-hud font-black text-emerald-300">
            <span>🚪</span>
            <span>هدف</span>
          </div>
          {/* Floating Robo */}
          <div
            style={{ right: `${roboX}%` }}
            className="absolute top-1/2 -translate-y-1/2 text-4xl transition-all duration-75"
          >
            🧑‍🚀
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/90 rounded-2xl p-3 border border-slate-700">
          <span className="font-mono font-bold text-sm text-amber-300">
            سرعة القصور الذاتي: {velX.toFixed(1)} m/s
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
              ادفع للأمام باليد 🚀
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
              <span>امسك الدرابزين (تهدئة)</span>
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
          void dialogueManager.speak('ممتاز! ثبتّ كل الأدوات الطافية الخمسة في خزانتها بأمان!');
          onCompleteMiniGame('l2_secure_objects', { l2SecuredObjects: next });
        }
      } else {
        soundManager.playAlertSiren();
      }
    };

    return (
      <div className="bg-slate-900/95 border-2 border-indigo-400/75 rounded-3xl p-5 flex flex-col gap-4 shadow-xl">
        <p className="font-hud font-bold text-sm text-indigo-200">
          اضغط على الغرض الطافي ثم اضغط على خزانته الصحيحة ({stowed.length}/{FLOATING_ITEMS.length} مثبّت):
        </p>

        {/* Floating Pool */}
        <div className="flex flex-wrap gap-3 p-4 rounded-2xl bg-slate-950 border border-indigo-500/40 min-h-[96px]">
          {remaining.length === 0 ? (
            <span className="font-hud font-black text-emerald-300 m-auto">
              تم تثبيت جميع الأغراض الخمسة بنجاح! ✅
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
                <span>{item.nameAr}</span>
              </button>
            ))
          )}
        </div>

        {/* Matching Lockers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {FLOATING_ITEMS.map((item) => {
            const done = stowed.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                disabled={done}
                onClick={() => matchToLocker(item.id)}
                className={`p-3.5 rounded-2xl border-2 text-right transition-all ${
                  done
                    ? 'bg-emerald-950 border-emerald-400 text-emerald-200'
                    : selectedFloating
                    ? 'bg-slate-800 border-amber-300 text-white cursor-pointer hover:bg-sky-900'
                    : 'bg-slate-800/80 border-slate-600 text-slate-300'
                }`}
              >
                <p className="font-hud font-black text-sm">{item.lockerAr}</p>
                <p className="font-hud text-xs text-cyan-200 mt-1">
                  {done ? `✅ مثبّت: ${item.icon} ${item.nameAr}` : `المكان المخصص لـ: ${item.icon} ${item.nameAr}`}
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

    return (
      <div className="bg-slate-900/95 border-2 border-emerald-400/75 rounded-3xl p-5 flex flex-col gap-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-hud font-bold text-sm text-emerald-200">
            كوّن صينية طعام متكاملة في 0G من المطبخ المصري والسيناوي والزراعة المائية ({trayGroups.length}/4):
          </p>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-950 border border-amber-400 text-amber-200">
            {SCIENCE_BADGES.GAME_RULE.labelAr}
          </span>
        </div>
        <div className="p-3 rounded-2xl bg-sky-950/60 border border-sky-400/40 text-xs text-sky-100">
          📐 <strong>{SCIENCE_BADGES.PLANNING_ASSUMPTION.labelAr}:</strong> لرائد 70 كجم/يوم = {DAILY_REFERENCE_ASSUMPTIONS.energyKcal} kcal • {DAILY_REFERENCE_ASSUMPTIONS.proteinGrams}g بروتين • {DAILY_REFERENCE_ASSUMPTIONS.carbsGrams}g كربوهيدرات • {DAILY_REFERENCE_ASSUMPTIONS.fatsGrams}g دهون • {DAILY_REFERENCE_ASSUMPTIONS.fiberGramsRange} ألياف (الزراعة المائية مكملة فقط).
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {MEAL_GROUPS.map((g) => {
            const active = trayGroups.includes(g.id);
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => toggleGroup(g.id)}
                className={`p-4 rounded-2xl border-2 text-right font-hud font-black text-sm cursor-pointer transition-all ${
                  active
                    ? 'bg-emerald-950 border-emerald-400 text-white'
                    : 'bg-slate-800 border-slate-600 text-slate-200 hover:border-cyan-400'
                }`}
              >
                {active ? '✅ ' : '⬜ '}
                {g.labelAr}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          disabled={!balanced}
          onClick={() => {
            soundManager.playFanfare();
            void dialogueManager.speak('وجبة فضائية متوازنة مية في المية! هتدينا طاقة وبروتين في الرحلة!');
            onCompleteMiniGame('l2_balanced_meal');
          }}
          className={`w-full py-3.5 rounded-2xl font-hud font-black text-base border-2 ${
            balanced
              ? 'bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 border-white cursor-pointer'
              : 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
          }`}
        >
          تأكيد الوجبة المتوازنة 🍱
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
        <div className="p-3 rounded-2xl bg-sky-950/70 border border-cyan-400/50 text-xs font-hud text-cyan-100">
          🧬 <strong>{osdrFluid.osdrCode}:</strong> {osdrFluid.findingAr}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              setDiagnosisPicked(true);
            }}
            className={`p-4 rounded-2xl border-2 text-right cursor-pointer ${
              diagnosisPicked ? 'bg-emerald-950 border-emerald-400' : 'bg-slate-800 border-pink-400/70'
            }`}
          >
            <p className="font-hud font-black text-base text-white">1. تشخيص الأعراض</p>
            <p className="font-hud text-xs text-slate-200 mt-1">
              {diagnosisPicked ? '✅ دوار التكيف مع انعدام الجاذبية + إرهاق' : 'حدد سبب الدوخة والإرهاق في 0G'}
            </p>
          </button>

          <button
            type="button"
            disabled={!diagnosisPicked}
            onClick={() => {
              soundManager.playCrystalSparkle();
              setRestedCrew(true);
            }}
            className={`p-4 rounded-2xl border-2 text-right ${
              restedCrew
                ? 'bg-emerald-950 border-emerald-400'
                : diagnosisPicked
                ? 'bg-slate-800 border-purple-400 cursor-pointer'
                : 'bg-slate-900 border-slate-700 opacity-60'
            }`}
          >
            <p className="font-hud font-black text-base text-white">2. الراحة في Crew Quarters</p>
            <p className="font-hud text-xs text-slate-200 mt-1">
              {restedCrew ? '✅ استراح الطاقم وثبّت حزام النوم + شرب ماء' : 'ثبّت كيس النوم واسترح لتوازن الأذن الداخلية'}
            </p>
          </button>

          <button
            type="button"
            disabled={!restedCrew}
            onClick={() => {
              soundManager.playFanfare();
              setMedSupportSent(true);
              void dialogueManager.speak('تم استقرار حالة الدوار والطاقم بصحة ممتازة للهبوط على القمر!');
              onCompleteMiniGame('l2_motion_sickness', { l2MotionRested: true });
            }}
            className={`p-4 rounded-2xl border-2 text-right ${
              medSupportSent
                ? 'bg-emerald-950 border-emerald-400'
                : restedCrew
                ? 'bg-slate-800 border-cyan-400 cursor-pointer'
                : 'bg-slate-900 border-slate-700 opacity-60'
            }`}
          >
            <p className="font-hud font-black text-base text-white">3. اتصال الدعم الطبي</p>
            <p className="font-hud text-xs text-slate-200 mt-1">
              {medSupportSent ? '✅ تم إبلاغ طبيب الرحلة وتأكيد التعافي' : 'أرسل التقرير لغرفة الطب الأرضي'}
            </p>
          </button>
        </div>

        {allDone && (
          <div className="p-3 rounded-2xl bg-emerald-950/70 border border-emerald-400 text-emerald-200 font-hud font-black text-sm text-center">
            ✅ تعافى الطاقم تماماً من دوار انعدام الجاذبية!
          </div>
        )}
      </div>
    );
  }

  // 2.6 FINAL SYSTEMS CHECK & NASA NEOWS RADAR -> LUNAR ARRIVAL CONFIRMED!
  const systems = [
    { id: 'oxygen', labelAr: 'الأكسجين (O2 Pressure 14.7 PSI)' },
    { id: 'water', labelAr: 'خزانات المياه النقية (100%)' },
    { id: 'power', labelAr: 'الطاقة الكهربائية والخلايا الشمسية' },
    { id: 'comms', labelAr: 'شبكة الاتصالات بالمدار القمري' },
    { id: 'navigation', labelAr: `تتبع رادار ناسا NeoWs لكويكب ${asteroid2010PK.name}` }
  ];
  const allSysChecked = sysChecks.length >= systems.length;

  return (
    <div className="bg-slate-900/95 border-2 border-amber-400/75 rounded-3xl p-5 flex flex-col gap-4 shadow-xl">
      <div className="p-4 rounded-2xl bg-slate-950 border-2 border-cyan-500/50 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-hud font-black text-sm text-amber-300 flex items-center gap-1.5">
            <Radar className="w-4 h-4 text-cyan-400" />
            <span>رادار NASA NeoWs الحي (بيانات ناسا المحفوظة محلياً):</span>
          </p>
          <p className="font-hud text-xs sm:text-sm text-cyan-100 mt-1">
            الكويكب {asteroid2010PK.name} • السرعة: {asteroid2010PK.relativeVelocityKmS.toFixed(1)} كم/ث • مسافة المرور الآمنة: {asteroid2010PK.missDistanceLunar.toFixed(1)} ضعف مسافة القمر (آمن 100%).
          </p>
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
              <span className="font-hud font-bold text-xs sm:text-sm">{s.labelAr}</span>
              {ok ? <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" /> : <span className="text-xs text-amber-300">فحص ⬅</span>}
            </button>
          );
        })}
      </div>

      {arrivalConfirmed ? (
        <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-emerald-950 border-4 border-amber-300 text-center space-y-3">
          <p className="font-mono font-black text-xl sm:text-2xl text-amber-300">
            LUNAR ARRIVAL CONFIRMED!
          </p>
          <p className="font-hud font-black text-base text-white">
            تم تأكيد الوصول إلى قاعدة القمر أرتميس! فُتح المستوى الثالث 🌕
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={onNextLevel}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-hud font-black text-base border-2 border-white cursor-pointer"
            >
              ابدأ المستوى 3: عمليات القاعدة القمرية 🌕
            </button>
            <button
              type="button"
              onClick={onBackToLevel}
              className="px-5 py-3 rounded-2xl bg-slate-800 text-white font-hud font-bold text-sm border border-cyan-400 cursor-pointer"
            >
              العودة للخريطة
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={!allSysChecked}
          onClick={() => {
            setArrivalConfirmed(true);
            soundManager.playFanfare();
            confetti({ particleCount: 140, spread: 90 });
            void dialogueManager.speak('مبروووك! تم تأكيد الوصول إلى القمر! استعد لمهمات قاعدة أرتميس!');
            onCompleteMiniGame('l2_systems_neows');
          }}
          className={`w-full py-3.5 rounded-2xl font-hud font-black text-base border-2 flex items-center justify-center gap-2 ${
            allSysChecked
              ? 'bg-gradient-to-r from-indigo-400 to-amber-400 text-slate-950 border-white cursor-pointer'
              : 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
          }`}
        >
          <ShieldCheck className="w-5 h-5" />
          <span>تأكيد جميع الأنظمة والهبوط على القمر 🌕</span>
        </button>
      )}
    </div>
  );
};
