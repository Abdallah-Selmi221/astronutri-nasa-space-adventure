import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { motion } from 'framer-motion';
import {
  CampaignProgressState,
  LunarSampleId,
  LunarToolId,
  MiniGameId
} from '../../types/game';
import { useGameState, initialSpaceFitXState } from '../../context/GameContext';
import { tr } from '../../utils/i18n';
import { nasaCache } from '../../services/nasa/nasaCache';
import { NASA_ENGINEERING_TRADEOFFS, NASA_OSDR_METRICS } from '../../services/nasa/nasaOSDR';
import { ISS_WATER_MILESTONE, SCIENCE_BADGES } from '../../data/science';
import { SpaceFitXControlsHUD } from '../suit/SpaceFitXControlsHUD';
import { BodyTelemetryMeters } from './BodyTelemetryMeters';
import { soundManager } from '../../utils/sound';
import { dialogueManager } from '../../utils/geminiTTS';
import { AlertTriangle, CheckCircle2, ShieldAlert, Sun, Wrench } from 'lucide-react';

interface Level3Props {
  miniGameId: MiniGameId | 'l3_return_auth';
  campaign: CampaignProgressState;
  onCompleteMiniGame: (id: MiniGameId, patch?: Partial<CampaignProgressState>) => void;
  onUpdateCampaign: (patch: Partial<CampaignProgressState>) => void;
  onJumpToRoom: (roomId: string, miniGameId: MiniGameId) => void;
  onAuthorizeReturn: () => void;
  onNextLevel: () => void;
  onBackToLevel: () => void;
}

const EVA_TOOLS: Array<{
  id: LunarToolId;
  nameEn: string;
  nameAr: string;
  icon: string;
  purposeEn: string;
  purposeAr: string;
}> = [
  { id: 'gripper', nameEn: 'Gripper', nameAr: 'الملقط الدقيق', icon: '🦾', purposeEn: 'Pick up delicate silicate pebbles', purposeAr: 'التقاط الصخور الصغيرة' },
  { id: 'scoop', nameEn: 'Scoop', nameAr: 'المجرفة القمرية', icon: '🥄', purposeEn: 'Collect fine lunar regolith dust', purposeAr: 'جمع غبار وتربة القمر' },
  { id: 'hammer', nameEn: 'Hammer', nameAr: 'المطرقة الجيولوجية', icon: '🔨', purposeEn: 'Chip hard basalt rock fragments', purposeAr: 'أخذ شظايا الصخور الصلبة' },
  { id: 'collection_bag', nameEn: 'Collection Bag', nameAr: 'حقيبة العينات', icon: '🎒', purposeEn: 'Seal collected samples safely', purposeAr: 'تخزين العينات بأمان' }
];

const LUNAR_SITES: Array<{
  sampleId: LunarSampleId;
  nameEn: string;
  nameAr: string;
  icon: string;
  requiredTool: LunarToolId;
  requiredToolEn: string;
  requiredToolAr: string;
  observationEn: string;
  observationAr: string;
}> = [
  {
    sampleId: 'basalt_rock',
    nameEn: 'Hard Basalt Ridge',
    nameAr: 'موقع صخور البازلت الصلبة',
    icon: '🪨',
    requiredTool: 'hammer',
    requiredToolEn: 'Geology Hammer',
    requiredToolAr: 'المطرقة (Hammer)',
    observationEn: 'Titanium-rich lunar basalt formed from ancient volcanic lava.',
    observationAr: 'بازلت قمري غني بالتيتانيوم تشكل من حمم قمرية قديمة.'
  },
  {
    sampleId: 'regolith_dust',
    nameEn: 'Fine Regolith Crater',
    nameAr: 'فوهة الغبار القمري الناعم',
    icon: '🌫️',
    requiredTool: 'scoop',
    requiredToolEn: 'Lunar Scoop',
    requiredToolAr: 'المجرفة (Scoop)',
    observationEn: 'Powdery South Pole regolith containing trace water-ice molecules.',
    observationAr: 'ريجوليث ناعم يحتوي على آثار جليد مائي في القطب الجنوبي.'
  },
  {
    sampleId: 'crater_pebbles',
    nameEn: 'Crater Rim Pebbles',
    nameAr: 'حافة الحصى الدقيقة',
    icon: '💎',
    requiredTool: 'gripper',
    requiredToolEn: 'Precision Gripper',
    requiredToolAr: 'الملقط (Gripper)',
    observationEn: 'Silicate micro-pebbles recording ancient meteoroid impact history.',
    observationAr: 'حصى سيليكات صغيرة مفيدة لتحليل تاريخ النيازك.'
  }
];

export const Level3MiniGames: React.FC<Level3Props> = ({
  miniGameId,
  campaign,
  onCompleteMiniGame,
  onUpdateCampaign,
  onJumpToRoom,
  onAuthorizeReturn,
  onNextLevel,
  onBackToLevel
}) => {
  const { language } = useGameState();

  // 3.1 Resistance Training (Leg -> Arm -> Core sequence)
  const [exStage, setExStage] = useState<'leg' | 'arm' | 'core' | 'done'>(
    campaign.completedMiniGames.includes('l3_resistance_training') ? 'done' : 'leg'
  );
  const [exReps, setExReps] = useState<number>(0);

  // 3.2 Water Recycling 4-step
  const [waterStep, setWaterStep] = useState<number>(campaign.l3WaterRecycled ? 4 : 0);

  // 3.3 Solar Storm DONKI
  const [stormStep, setStormStep] = useState<number>(campaign.l3SolarStormSheltered ? 4 : 0);
  const [tradeOffChoice, setTradeOffChoice] = useState<'shield_o2' | 'farm_only' | null>(
    campaign.l3SolarStormSheltered ? 'shield_o2' : null
  );
  const [powerSplit, setPowerSplit] = useState<{ water: number; hydro: number; shield: number }>(
    campaign.ecoPowerSplit || { water: 40, hydro: 20, shield: 40 }
  );
  const latestStorm = nasaCache.getLatestSolarStorm();

  // 3.4 EVA Prep (Part A suit + Part B 4 scientific tools)
  const [suitParts, setSuitParts] = useState<string[]>(
    campaign.l3EvaSuitAssembled ? ['helmet', 'gloves', 'boots', 'backpack', 'o2_comms'] : []
  );
  const [packedTools, setPackedTools] = useState<LunarToolId[]>(campaign.l3PackedTools);

  // 3.5 Lunar Sample Collection (0.16G + Oxygen + Tool Dependency!)
  const [suitO2, setSuitO2] = useState<number>(100);
  const [collectedSamples, setCollectedSamples] = useState<LunarSampleId[]>(campaign.l3CollectedSamples);
  const [loggedObservations, setLoggedObservations] = useState<boolean>(
    campaign.completedMiniGames.includes('l3_lunar_samples')
  );
  const [missingToolError, setMissingToolError] = useState<string | null>(null);

  // Countdown for Solar Storm shelter wait (step 3 -> 4)
  useEffect(() => {
    if (miniGameId === 'l3_solar_storm' && stormStep === 3) {
      const t = window.setTimeout(() => {
        setStormStep(4);
        soundManager.playFanfare();
        void dialogueManager.speak(
          tr(
            language,
            'Solar proton wave passed safely while sheltered!',
            'انتهت العاصفة الشمسية بأمان داخل الملجأ!'
          )
        );
        onCompleteMiniGame('l3_solar_storm', { l3SolarStormSheltered: true });
      }, 2200);
      return () => window.clearTimeout(t);
    }
  }, [miniGameId, stormStep, onCompleteMiniGame, language]);

  // ---------------------------------------------------------------------------
  // 3.1 RESISTANCE TRAINING CHALLENGE (Leg -> Arm -> Core)
  // ---------------------------------------------------------------------------
  if (miniGameId === 'l3_resistance_training') {
    const osdrBone = NASA_OSDR_METRICS[0];
    const suit = campaign.spaceFitX || initialSpaceFitXState;
    const currentLabel =
      exStage === 'leg'
        ? tr(language, '1️⃣ Leg Squat Press (ARED)', '1️⃣ تمرين الأرجل (Squat Press)')
        : exStage === 'arm'
        ? tr(language, '2️⃣ Arm Resistance Pull', '2️⃣ تمرين الذراعين (Resistance Pull)')
        : exStage === 'core'
        ? tr(language, '3️⃣ Core Stabilizer', '3️⃣ تمرين الجذع (Core Stabilizer)')
        : tr(language, '✅ All Strength Exercises Completed!', '✅ تم إتمام جميع تمارين القوة!');

    const boneScore = exStage === 'done' ? 100 : exStage === 'core' ? 86 : exStage === 'arm' ? 72 : 55 + exReps * 5;
    const muscleScore = exStage === 'done' ? 98 : exStage === 'core' ? 84 : exStage === 'arm' ? 70 : 52 + exReps * 5;

    const doRep = () => {
      if (exStage === 'done') return;
      if (suit.emergencyReleased) {
        soundManager.playAlertSiren();
        return;
      }
      soundManager.playClick();
      const avgLoad = Math.round(Object.values(suit.jointLoads).reduce((a, b) => a + b, 0) / 5);
      const harvestedGain = Number((0.6 + avgLoad * 0.015).toFixed(1));
      onUpdateCampaign({
        spaceFitX: {
          ...suit,
          heartRateBpm: Math.min(162, Math.max(108, suit.heartRateBpm + 4)),
          muscleLoadPct: Math.min(98, Math.max(avgLoad, suit.muscleLoadPct + 6)),
          jointAngleDeg: exStage === 'leg' ? 78 : exStage === 'arm' ? 54 : 32,
          harvestedWh: Number((suit.harvestedWh + harvestedGain).toFixed(1)),
          batteryPercent: Math.min(100, suit.batteryPercent + 2)
        }
      });

      const nextReps = exReps + 1;
      if (nextReps >= 3) {
        soundManager.playDropSuccess();
        setExReps(0);
        if (exStage === 'leg') setExStage('arm');
        else if (exStage === 'arm') setExStage('core');
        else if (exStage === 'core') {
          setExStage('done');
          soundManager.playFanfare();
          void dialogueManager.speak(
            tr(
              language,
              'Awesome! Resistance training with SPACE-FIT X protected bones and harvested kinetic battery energy!',
              'عاش يا بطل! تمارين المقاومة ببدلة SPACE-FIT X حمت عظامنا وحصدت طاقة حركية للبطارية!'
            )
          );
          onCompleteMiniGame('l3_resistance_training', { l3BoneMuscleScore: 100 });
        }
      } else {
        setExReps(nextReps);
      }
    };

    return (
      <div className="bg-slate-900/95 border-2 border-emerald-400/75 rounded-3xl p-5 flex flex-col gap-4 shadow-xl">
        <BodyTelemetryMeters
          language={language}
          titleEn="Astronaut Bone & Muscle Telemetry (NASA OSDR)"
          titleAr="مؤشر قوة العظام والعضلات (NASA OSDR)"
          metrics={[
            { key: 'bone', value: boneScore },
            { key: 'muscle', value: muscleScore }
          ]}
        />

        <div className="p-3.5 rounded-2xl bg-sky-950/75 border border-cyan-400/50 text-xs sm:text-sm font-hud text-cyan-100">
          🧬 <strong>{osdrBone.osdrCode}:</strong>{' '}
          {tr(
            language,
            'Astronauts lose ~1–1.5% bone density per month without heavy daily resistance workouts.',
            osdrBone.findingAr
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 text-center font-hud font-black text-xs sm:text-sm">
          <div className={`p-3 rounded-2xl border-2 ${exStage !== 'leg' ? 'bg-emerald-950 border-emerald-400 text-emerald-200' : 'bg-sky-900 border-amber-300 text-white'}`}>
            🦵 {tr(language, 'Legs', 'الأرجل')} {exStage !== 'leg' ? '✓' : `(${exReps}/3)`}
          </div>
          <div className={`p-3 rounded-2xl border-2 ${exStage === 'core' || exStage === 'done' ? 'bg-emerald-950 border-emerald-400 text-emerald-200' : exStage === 'arm' ? 'bg-sky-900 border-amber-300 text-white' : 'bg-slate-800 border-slate-600 text-slate-400'}`}>
            💪 {tr(language, 'Arms', 'الذراعان')} {exStage === 'core' || exStage === 'done' ? '✓' : exStage === 'arm' ? `(${exReps}/3)` : '○'}
          </div>
          <div className={`p-3 rounded-2xl border-2 ${exStage === 'done' ? 'bg-emerald-950 border-emerald-400 text-emerald-200' : exStage === 'core' ? 'bg-sky-900 border-amber-300 text-white' : 'bg-slate-800 border-slate-600 text-slate-400'}`}>
            🧘 {tr(language, 'Core', 'الجذع')} {exStage === 'done' ? '✓' : exStage === 'core' ? `(${exReps}/3)` : '○'}
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-slate-950 border border-emerald-500/40 text-center space-y-3">
          <p className="font-hud font-black text-xl text-white">{currentLabel}</p>
          {suit.emergencyReleased && (
            <p className="text-xs font-black text-rose-300">
              {tr(
                language,
                '⚠️ Emergency quick-release is open! Re-lock SPACE-FIT X tension below to exercise.',
                '⚠️ تم تفعيل زر الإفلات السريع! أعد قفل مقاومة بدلة SPACE-FIT X من الأسفل لإكمال التمرين.'
              )}
            </p>
          )}
          {exStage !== 'done' && (
            <button
              type="button"
              disabled={suit.emergencyReleased}
              onClick={doRep}
              className={`px-8 py-4 rounded-2xl font-hud font-black text-lg border-2 border-white transition-transform ${
                suit.emergencyReleased
                  ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-emerald-400 to-cyan-500 text-slate-950 cursor-pointer hover:scale-105'
              }`}
            >
              {tr(language, `Pull SPACE-FIT X Cables (${exReps}/3) 🏋️`, `اسحب كابلات SPACE-FIT X وحصد طاقة (${exReps}/3) 🏋️`)}
            </button>
          )}
        </div>

        <SpaceFitXControlsHUD
          compact
          suitState={suit}
          onChange={(next) => onUpdateCampaign({ spaceFitX: next })}
        />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 3.2 WATER RECYCLING SYSTEM (Isolate -> Open -> Clean/Replace Filter -> Reassemble & Test)
  // ---------------------------------------------------------------------------
  if (miniGameId === 'l3_water_recycling') {
    const steps = [
      {
        titleEn: '1. Isolate System Valves',
        titleAr: '1. عزل صمامات النظام (Isolate System)',
        btnEn: 'Shut Isolation Valve 🔒',
        btnAr: 'إغلاق صمام العزل 🔒'
      },
      {
        titleEn: '2. Open ECLSS Maintenance Panel',
        titleAr: '2. فتح لوحة الصيانة (Open Maintenance Panel)',
        btnEn: 'Open Hatch Panel 🔓',
        btnAr: 'فتح اللوحة المعدنية 🔓'
      },
      {
        titleEn: '3. Replace Clogged Carbon Filter',
        titleAr: '3. تنظيف واستبدال الفلتر المسدود (Clean/Replace Filter)',
        btnEn: 'Install Fresh Carbon Filter 🧽',
        btnAr: 'تركيب الفلتر الكربوني النظيف 🧽'
      },
      {
        titleEn: '4. Reassemble & Verify 98% Purity',
        titleAr: '4. إعادة التجميع واختبار نقاء المياه (Reassemble & Test)',
        btnEn: 'Test 98% Water Recovery 💧',
        btnAr: 'إعادة الإغلاق وفحص النقاء 98% 💧'
      }
    ];

    const filterPct = waterStep === 0 ? 15 : waterStep === 1 ? 45 : waterStep === 2 ? 95 : 98;

    const advanceWaterStep = () => {
      soundManager.playPressurizeHiss();
      const next = waterStep + 1;
      setWaterStep(next);
      if (next >= 4) {
        soundManager.playFanfare();
        void dialogueManager.speak(
          tr(
            language,
            'ECLSS filter replaced! Lunar water recovery restored to 98% purity!',
            'تم إصلاح نظام تدوير المياه ECLSS والمياه نقية بنسبة 98%!'
          )
        );
        onCompleteMiniGame('l3_water_recycling', { l3WaterRecycled: true });
      }
    };

    return (
      <div className="bg-slate-900/95 border-2 border-cyan-400/75 rounded-3xl p-5 flex flex-col gap-4 shadow-xl">
        <BodyTelemetryMeters
          language={language}
          titleEn="ECLSS Filter & Water Recovery Telemetry"
          titleAr="حالة الفلتر واسترجاع المياه (ECLSS)"
          metrics={[
            { key: 'filter', value: filterPct },
            { key: 'hydration', value: waterStep >= 3 ? 98 : 48 + waterStep * 15 }
          ]}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-3.5 rounded-2xl bg-cyan-950/60 border border-cyan-400/50 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-hud font-black text-xs sm:text-sm text-cyan-200">
                {tr(
                  language,
                  `💧 ISS Milestone: ${ISS_WATER_MILESTONE.recoveryPercent}% Water Recovery (${ISS_WATER_MILESTONE.dateLabel})`,
                  `💧 إنجاز ISS: ${ISS_WATER_MILESTONE.recoveryPercent}% استرجاع المياه (${ISS_WATER_MILESTONE.dateLabel})`
                )}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-950 border border-emerald-400 text-emerald-200 shrink-0">
                {tr(language, SCIENCE_BADGES.ISS_PROVEN.labelEn, SCIENCE_BADGES.ISS_PROVEN.labelAr)}
              </span>
            </div>
            <p className="text-[11px] text-slate-200 leading-relaxed">
              {tr(
                language,
                'Reclaims humidity, sweat, urine & hygiene water via the Brine Processor Assembly.',
                'تجمع المحطة ماء التنفس والعرق والبول ومياه النظافة وإعداد الطعام بمساعدة Brine Processor Assembly.'
              )}
            </p>
            <p className="text-[11px] text-amber-200 font-bold leading-relaxed">
              {tr(
                language,
                'Hardware needs periodic resupply/filter swaps — still not a perpetual closed loop.',
                ISS_WATER_MILESTONE.caveatAr
              )}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-indigo-950/55 border border-indigo-400/50 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-hud font-black text-xs sm:text-sm text-indigo-200">
                {tr(language, '🫧 Oxygen via Water Electrolysis (ECLSS)', '🫧 توليد الأكسجين بالتحليل الكهربائي للماء (ECLSS)')}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-950 border border-emerald-400 text-emerald-200 shrink-0">
                {tr(language, SCIENCE_BADGES.ISS_PROVEN.labelEn, SCIENCE_BADGES.ISS_PROVEN.labelAr)}
              </span>
            </div>
            <p className="text-[11px] text-slate-200 leading-relaxed">
              {tr(
                language,
                'ECLSS splits purified water to generate breathable O2 and scrubs CO2; plants & Spirulina act as backup.',
                'تشطر أجهزة ECLSS الماء كهربائياً لتوفير O₂ وتسحب CO₂ وتحافظ على الضغط والرطوبة، بينما تبقى النباتات والسبيرولينا وحدات مساعدة فقط.'
              )}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {steps.map((st, idx) => {
            const done = waterStep > idx;
            const current = waterStep === idx;
            return (
              <div
                key={st.titleAr}
                className={`p-4 rounded-2xl border-2 flex flex-wrap items-center justify-between gap-2 ${
                  done
                    ? 'bg-emerald-950 border-emerald-400 text-emerald-100'
                    : current
                    ? 'bg-sky-900 border-amber-300 text-white'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400'
                }`}
              >
                <span className="font-hud font-black text-sm sm:text-base">
                  {tr(language, st.titleEn, st.titleAr)}
                </span>
                {done ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : current ? (
                  <button
                    type="button"
                    onClick={advanceWaterStep}
                    className="px-4 py-2 rounded-xl bg-amber-400 text-slate-950 font-hud font-black text-xs sm:text-sm cursor-pointer"
                  >
                    {tr(language, st.btnEn, st.btnAr)}
                  </button>
                ) : (
                  <span className="text-xs font-hud">{tr(language, 'Pending previous step', 'بانتظار الخطوة السابقة')}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 3.3 SOLAR STORM EMERGENCY (NASA DONKI CME/SEP + Animated Wave Visualizer)
  // ---------------------------------------------------------------------------
  if (miniGameId === 'l3_solar_storm') {
    const tradeoff = NASA_ENGINEERING_TRADEOFFS[0];
    const shieldStrong = powerSplit.shield >= 45;

    return (
      <div className="bg-slate-900/95 border-2 border-rose-400/80 rounded-3xl p-5 flex flex-col gap-4 shadow-xl">
        <div className="p-4 rounded-2xl bg-rose-950/80 border-2 border-rose-400 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-rose-100">
            <Sun className="w-6 h-6 text-amber-300 animate-spin" />
            <div>
              <p className="font-hud font-black text-sm sm:text-base">
                {tr(language, `⚠️ NASA DONKI Solar Alert (${latestStorm.activityId})`, `⚠️ تنبيه طوارئ NASA DONKI (${latestStorm.activityId})`)}
              </p>
              <p className="font-hud text-xs text-rose-200">
                {tr(
                  language,
                  `Coronal Mass Ejection at ${latestStorm.speedKmS || 1200} km/s — divert power to shields & O2!`,
                  `انبعاث كتلي إكليلي بسرعة ${latestStorm.speedKmS || 1200} كم/ث — ${latestStorm.educationalLabelAr}`
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Animated Solar Storm Particle Wave Banner */}
        <div
          data-testid="donki-solar-wave-viz"
          className="relative h-24 rounded-2xl bg-gradient-to-r from-amber-950 via-rose-950/85 to-slate-950 border-2 border-amber-400/60 overflow-hidden flex items-center justify-between px-4"
        >
          <span className="text-3xl z-10 select-none">☀️</span>

          {/* Animated Solar Proton Wave Particles */}
          {[0, 1, 2, 3, 4].map((waveIdx) => (
            <motion.div
              key={waveIdx}
              initial={{ x: -20, opacity: 0.9 }}
              animate={{
                x: shieldStrong ? [0, 120, 145] : [0, 190, 260],
                opacity: shieldStrong ? [0.95, 0.9, 0] : [0.95, 0.85, 0.2],
                scale: [0.9, 1.15, 0.8]
              }}
              transition={{
                duration: 1.6,
                repeat: Infinity,
                delay: waveIdx * 0.3,
                ease: 'linear'
              }}
              className="text-lg select-none pointer-events-none"
            >
              {waveIdx % 2 === 0 ? '⚡' : '🔥'}
            </motion.div>
          ))}

          {/* Magnetic Shield Deflection Dome */}
          <div className="flex items-center gap-2 z-10">
            <div
              className={`px-2.5 py-1 rounded-full text-[11px] font-hud font-black border-2 transition-colors ${
                shieldStrong
                  ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200'
                  : 'bg-rose-500/30 border-rose-400 text-rose-200 animate-pulse'
              }`}
            >
              {shieldStrong
                ? tr(language, '🛡️ SHIELD DEFLECTING', '🛡️ الدرع يصد الموجة')
                : tr(language, '⚠️ LOW SHIELD', '⚠️ الدرع ضعيف')}
            </div>
            <span className="text-2xl select-none">🏛️</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            {
              en: '1. Halt Moonwalk (EVA) & Stow Gear',
              ar: '1. إيقاف السير القمري (Halt EVA) وتأمين المعدات'
            },
            {
              en: '2. Power Split: Prioritize Shields & O2 ⚡🛡️',
              ar: '2. موازنة الطاقة: توجيه الكهرباء للدروع والأكسجين ⚡🛡️'
            },
            {
              en: '3. Enter Radiation Storm Shelter & Seal Hatch',
              ar: '3. دخول ملجأ الطوارئ الإشعاعي وإحكام الباب'
            },
            {
              en: '4. Wait for Proton Flux All-Clear',
              ar: '4. انتظار زوال الإشعاع (All-Clear)'
            }
          ].map((item, idx) => {
            const done = stormStep > idx;
            const current = stormStep === idx;
            return (
              <div
                key={item.en}
                className={`p-4 rounded-2xl border-2 ${
                  done
                    ? 'bg-emerald-950 border-emerald-400 text-emerald-100'
                    : current
                    ? 'bg-amber-950/90 border-amber-300 text-white'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400'
                }`}
              >
                <p className="font-hud font-black text-sm">{tr(language, item.en, item.ar)}</p>
                {idx === 1 && current && (
                  <div className="mt-2 space-y-2.5">
                    <p className="text-xs font-hud text-amber-200">
                      {tr(
                        language,
                        'CME alert! Should we route power to radiation shields & O2 or keep hydroponic grow-lights at full blast?',
                        tradeoff.dilemmaAr
                      )}
                    </p>

                    <div className="p-3 rounded-xl bg-slate-950/85 border border-amber-400/40 space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-black text-amber-200">
                        <span>{tr(language, '⚡ Base Power Split (100% max):', '⚡ موازنة طاقة القاعدة (100%):')}</span>
                        <span className="px-2 py-0.5 rounded-full text-[9px] bg-amber-950 border border-amber-400">
                          {tr(language, SCIENCE_BADGES.GAME_RULE.labelEn, SCIENCE_BADGES.GAME_RULE.labelAr)}
                        </span>
                      </div>
                      {[
                        { key: 'shield' as const, label: tr(language, '🛡️ Radiation Shield (Need ≥ 45%)', '🛡️ دروع الإشعاع (مطلوب ≥ 45%)'), color: 'accent-amber-400' },
                        { key: 'water' as const, label: tr(language, '💧 ECLSS Water & Air (Need ≥ 30%)', '💧 تدوير المياه والهواء ECLSS (مطلوب ≥ 30%)'), color: 'accent-cyan-400' },
                        { key: 'hydro' as const, label: tr(language, '🌱 Hydroponic Lights (Dim during storm)', '🌱 إضاءة الزراعة المائية (تُخفّض أثناء العاصفة)'), color: 'accent-emerald-400' }
                      ].map((row) => (
                        <div key={row.key} className="space-y-0.5">
                          <div className="flex justify-between text-[10px] font-bold text-slate-200">
                            <span>{row.label}</span>
                            <span>{powerSplit[row.key]}%</span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            step={5}
                            value={powerSplit[row.key]}
                            onChange={(e) => {
                              const nextVal = Number(e.target.value);
                              const updated = { ...powerSplit, [row.key]: nextVal };
                              setPowerSplit(updated);
                              onUpdateCampaign({ ecoPowerSplit: updated });
                            }}
                            className={`w-full cursor-pointer ${row.color}`}
                          />
                        </div>
                      ))}
                      <div className="text-[10px] font-bold text-slate-300">
                        {tr(
                          language,
                          `Total Load: ${powerSplit.shield + powerSplit.water + powerSplit.hydro}% (Target ≤ 100%)`,
                          `إجمالي السحب: ${powerSplit.shield + powerSplit.water + powerSplit.hydro}% (الهدف ≤ 100%)`
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const totalPower = powerSplit.shield + powerSplit.water + powerSplit.hydro;
                          if (powerSplit.shield < 45 || powerSplit.water < 30 || totalPower > 100) {
                            soundManager.playAlertSiren();
                            setTradeOffChoice('farm_only');
                            return;
                          }
                          soundManager.playClick();
                          setTradeOffChoice('shield_o2');
                          setStormStep(2);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-emerald-400 text-slate-950 font-hud font-black text-xs cursor-pointer"
                      >
                        {tr(language, 'Route Power to Shields & O2 ✅', 'توجيه الطاقة للدروع والأكسجين أولاً ✅')}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          soundManager.playAlertSiren();
                          setTradeOffChoice('farm_only');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-rose-900 text-rose-100 font-hud font-bold text-xs cursor-pointer"
                      >
                        {tr(language, 'Keep Grow-Lights High Only', 'تجاهل الدروع وتشغيل الإضاءة فقط')}
                      </button>
                    </div>
                    {tradeOffChoice === 'farm_only' && (
                      <p className="text-xs text-rose-300 font-hud font-bold">
                        {tr(
                          language,
                          'Danger! Set Shields ≥ 45%, ECLSS ≥ 30%, and total load ≤ 100%!',
                          `خطر! ${tradeoff.optimalDecisionAr} (اضبط الدروع ≥ 45% والمياه ≥ 30% والمجموع ≤ 100%!)`
                        )}
                      </p>
                    )}
                  </div>
                )}
                {idx !== 1 && idx !== 3 && current && (
                  <button
                    type="button"
                    onClick={() => {
                      soundManager.playPressurizeHiss();
                      setStormStep(idx + 1);
                    }}
                    className="mt-2 px-4 py-1.5 rounded-xl bg-amber-400 text-slate-950 font-hud font-black text-xs cursor-pointer"
                  >
                    {tr(language, 'Execute Step 🛡️', 'نفّذ الإجراء الآن 🛡️')}
                  </button>
                )}
                {idx === 3 && current && (
                  <p className="mt-2 text-xs text-amber-300 font-hud font-bold animate-pulse">
                    {tr(language, 'Monitoring solar proton decay...', 'جاري فحص انخفاض مستوى الإشعاع...')}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 3.4 EVA SUIT & SCIENTIFIC TOOLS PREPARATION (Connected to 3.5!)
  // ---------------------------------------------------------------------------
  if (miniGameId === 'l3_eva_prep') {
    const partASuit = [
      { id: 'helmet', labelEn: '⛑️ Gold Visor Helmet', labelAr: '⛑️ خوذة الشمس الذهبية' },
      { id: 'gloves', labelEn: '🧤 Thermal Pressure Gloves', labelAr: '🧤 قفازات الضغط العازلة' },
      { id: 'boots', labelEn: '🥾 Lunar Surface Boots', labelAr: '🥾 أحذية السير القمري' },
      { id: 'backpack', labelEn: '🎒 PLSS Life Support Pack', labelAr: '🎒 حقيبة دعم الحياة PLSS' },
      { id: 'o2_comms', labelEn: '📡 O2 (4.3 PSI) & Comms Check', labelAr: '📡 فحص الأكسجين (4.3 PSI) والاتصال' }
    ];

    const toggleSuit = (id: string) => {
      soundManager.playDropSuccess();
      setSuitParts((prev) => (prev.includes(id) ? prev : [...prev, id]));
    };

    const toggleTool = (toolId: LunarToolId) => {
      soundManager.playClick();
      const next = packedTools.includes(toolId)
        ? packedTools.filter((t) => t !== toolId)
        : [...packedTools, toolId];
      setPackedTools(next);
      onUpdateCampaign({ l3PackedTools: next });
    };

    const partAReady = suitParts.length >= partASuit.length;
    const all4ToolsPacked = packedTools.length >= EVA_TOOLS.length;

    return (
      <div className="bg-slate-900/95 border-2 border-indigo-400/75 rounded-3xl p-5 flex flex-col gap-4 shadow-xl">
        <div className="p-3 rounded-2xl bg-cyan-950/60 border border-cyan-400/50 text-xs text-cyan-100 leading-relaxed">
          🦺{' '}
          {tr(
            language,
            'Science Fact: Inside the station you wear the lightweight SPACE-FIT X (IVA) suit; outside on the Moon you must don the pressurized Artemis xEMU (EVA) suit!',
            'معلومة علمية: داخل المحطة ترتدي بدلة التدريب SPACE-FIT X (IVA) الخفيفة، أما عند الخروج لسطح القمر فيلزم ارتداء بدلة الضغط الخارجية Artemis xEMU (EVA) ذات الخوذة والضغط الجوي!'
          )}
        </div>

        <div>
          <h3 className="font-hud font-black text-sm sm:text-base text-cyan-200 mb-2">
            {tr(
              language,
              `Part A: Assemble Pressurized Lunar Suit (${suitParts.length}/${partASuit.length}):`,
              `الجزء أ: ارتداء وفحص بدلة السير القمرية (${suitParts.length}/${partASuit.length}):`
            )}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {partASuit.map((p) => {
              const ok = suitParts.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggleSuit(p.id)}
                  className={`p-3 rounded-2xl border-2 font-hud font-bold text-xs sm:text-sm cursor-pointer ${
                    language === 'ar' ? 'text-right' : 'text-left'
                  } ${ok ? 'bg-emerald-950 border-emerald-400 text-white' : 'bg-slate-800 border-slate-600 text-slate-200'}`}
                >
                  {ok ? '✅ ' : '⬜ '}
                  {tr(language, p.labelEn, p.labelAr)}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <h3 className="font-hud font-black text-sm sm:text-base text-amber-300 mb-2">
            {tr(
              language,
              `Part B: Pack All 4 Scientific Tools (${packedTools.length}/4):`,
              `الجزء ب: احزم الأدوات العلمية الأربع في الحقيبة (${packedTools.length}/4):`
            )}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {EVA_TOOLS.map((tool) => {
              const packed = packedTools.includes(tool.id);
              return (
                <button
                  key={tool.id}
                  type="button"
                  data-testid={`pack-tool-${tool.id}`}
                  onClick={() => toggleTool(tool.id)}
                  className={`p-3.5 rounded-2xl border-2 flex items-center justify-between cursor-pointer ${
                    packed
                      ? 'bg-emerald-950 border-emerald-400 text-white'
                      : 'bg-slate-800 border-amber-400/60 text-slate-200'
                  }`}
                >
                  <div className={`flex items-center gap-2.5 ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                    <span className="text-2xl">{tool.icon}</span>
                    <div>
                      <p className="font-hud font-black text-sm">
                        {tr(language, tool.nameEn, `${tool.nameAr} (${tool.nameEn})`)}
                      </p>
                      <p className="font-hud text-xs text-cyan-200">{tr(language, tool.purposeEn, tool.purposeAr)}</p>
                    </div>
                  </div>
                  <span className="text-xs font-hud font-black text-amber-300">
                    {packed ? tr(language, 'Packed ✅', 'في الحقيبة ✅') : tr(language, 'Pack +', 'أضف للحقيبة +')}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={!partAReady}
            onClick={() => {
              soundManager.playFanfare();
              onUpdateCampaign({ l3EvaSuitAssembled: true, l3PackedTools: packedTools });
              if (all4ToolsPacked) {
                void dialogueManager.speak(
                  tr(
                    language,
                    'xEMU suit and all 4 geology tools ready! Head out to Lunar Exploration Zone!',
                    'البدلة القمرية والأدوات العلمية الأربع جاهزة! انطلق لجمع العينات!'
                  )
                );
                onCompleteMiniGame('l3_eva_prep', { l3EvaSuitAssembled: true, l3PackedTools: packedTools });
              } else {
                void dialogueManager.speak(
                  tr(
                    language,
                    'Suit ready — remember to pack all 4 tools before sampling!',
                    'البدلة جاهزة لكن لاحظ أنك لم تحزم كل الأدوات بعد!'
                  )
                );
              }
              onJumpToRoom('lunar_exploration_zone', 'l3_lunar_samples');
            }}
            className={`flex-1 py-3.5 rounded-2xl font-hud font-black text-base border-2 ${
              partAReady
                ? 'bg-gradient-to-r from-indigo-400 to-cyan-400 text-slate-950 border-white cursor-pointer'
                : 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
            }`}
          >
            {all4ToolsPacked
              ? tr(language, 'Step Out onto the Moon 👨‍🚀', 'تأكيد البدلة والأدوات ← الخروج لسطح القمر 👨‍🚀')
              : tr(language, 'Exit to Moon (Pack all 4 tools recommended) 👨‍🚀', 'اخرج لسطح القمر الآن (تحتاج كل الأدوات لاحقاً) 👨‍🚀')}
          </button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 3.5 LUNAR SAMPLE COLLECTION (Enforces Tool Dependency from 3.4!)
  // ---------------------------------------------------------------------------
  if (miniGameId === 'l3_lunar_samples') {
    const hasCollectionBag = campaign.l3PackedTools.includes('collection_bag');
    const all3Collected = collectedSamples.length >= LUNAR_SITES.length;

    const tryCollectSite = (site: (typeof LUNAR_SITES)[number]) => {
      if (collectedSamples.includes(site.sampleId)) return;
      setMissingToolError(null);

      if (!hasCollectionBag) {
        soundManager.playAlertSiren();
        const msg = tr(
          language,
          'Missing gear! Pack the Collection Bag in EVA Prep Room first!',
          'نسيت أداة مهمّة! لم تحزم "حقيبة العينات (Collection Bag)" في غرفة التجهيز (EVA Prep Room)!'
        );
        setMissingToolError(msg);
        void dialogueManager.speak(msg);
        return;
      }
      if (!campaign.l3PackedTools.includes(site.requiredTool)) {
        soundManager.playAlertSiren();
        const msg = tr(
          language,
          `Missing tool! Collecting "${site.nameEn}" requires ${site.requiredToolEn} from EVA Prep Room!`,
          `نسيت أداة مهمّة! لجمع "${site.nameAr}" تحتاج إلى ${site.requiredToolAr} من غرفة EVA Prep Room!`
        );
        setMissingToolError(msg);
        void dialogueManager.speak(msg);
        return;
      }

      soundManager.playCrystalSparkle();
      setSuitO2((o2) => Math.max(35, o2 - 15));
      const next = [...collectedSamples, site.sampleId];
      setCollectedSamples(next);
      onUpdateCampaign({ l3CollectedSamples: next });
    };

    const finishSamples = () => {
      if (!all3Collected) return;
      setLoggedObservations(true);
      soundManager.playFanfare();
      void dialogueManager.speak(
        tr(
          language,
          'All 3 lunar samples logged! Return to Mission Control to authorize Earth return!',
          'عاش يا بطل! جمعنا العينات الثلاث وسجلنا الملاحظات.. توجه إلى مركز القيادة للإذن بالعودة!'
        )
      );
      onCompleteMiniGame('l3_lunar_samples', { l3CollectedSamples: collectedSamples });
    };

    return (
      <div className="bg-slate-900/95 border-2 border-slate-400/75 rounded-3xl p-5 flex flex-col gap-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950 rounded-2xl p-3 border border-cyan-500/40">
          <span className="font-hud font-black text-sm text-cyan-200">
            {tr(language, `🌕 Lunar Gravity: 0.16G • Suit O2: ${suitO2}%`, `🌕 جاذبية سطح القمر: 0.16G • أكسجين البدلة: ${suitO2}%`)}
          </span>
          <span className="font-hud font-bold text-xs text-amber-300">
            {tr(
              language,
              `Packed Tools: ${campaign.l3PackedTools.length}/4 (${campaign.l3PackedTools.join(', ') || 'Empty!'})`,
              `الأدوات في حقيبتك: ${campaign.l3PackedTools.length}/4 (${campaign.l3PackedTools.join(', ') || 'فارغة!'})`
            )}
          </span>
        </div>

        {missingToolError && (
          <div className="p-4 rounded-2xl bg-rose-950 border-2 border-rose-400 text-rose-100 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 font-hud font-black text-sm">
              <AlertTriangle className="w-5 h-5 text-amber-300 shrink-0" />
              <span>{missingToolError}</span>
            </div>
            <button
              type="button"
              onClick={() => onJumpToRoom('eva_prep_room', 'l3_eva_prep')}
              className="px-4 py-2 rounded-xl bg-amber-400 text-slate-950 font-hud font-black text-xs cursor-pointer flex items-center gap-1.5"
            >
              <Wrench className="w-4 h-4" />
              <span>{tr(language, 'Return to EVA Prep Station 🎒', 'العودة إلى محطة تجهيز البدلة 🎒')}</span>
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {LUNAR_SITES.map((site) => {
            const collected = collectedSamples.includes(site.sampleId);
            return (
              <div
                key={site.sampleId}
                className={`p-4 rounded-2xl border-2 flex flex-col justify-between gap-3 ${
                  collected ? 'bg-emerald-950 border-emerald-400' : 'bg-slate-800 border-slate-600'
                }`}
              >
                <div>
                  <span className="text-3xl">{site.icon}</span>
                  <p className="font-hud font-black text-sm text-white mt-1">
                    {tr(language, site.nameEn, site.nameAr)}
                  </p>
                  <p className="font-hud text-xs text-amber-200 mt-1">
                    {tr(language, `Required Tool: ${site.requiredToolEn}`, `الأداة المطلوبة: ${site.requiredToolAr}`)}
                  </p>
                  {collected && (
                    <p className="font-hud text-xs text-emerald-200 mt-2">
                      📝 {tr(language, site.observationEn, `الملاحظة: ${site.observationAr}`)}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  disabled={collected}
                  onClick={() => tryCollectSite(site)}
                  className={`py-2 rounded-xl font-hud font-black text-xs ${
                    collected
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-cyan-500 text-slate-950 cursor-pointer hover:brightness-110'
                  }`}
                >
                  {collected ? tr(language, 'Collected & Logged ✅', 'تم الجمع والتسجيل ✅') : tr(language, 'Collect Sample 🪨', 'اجمع العينة الآن 🪨')}
                </button>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          disabled={!all3Collected}
          onClick={finishSamples}
          className={`w-full py-3.5 rounded-2xl font-hud font-black text-base border-2 ${
            all3Collected
              ? 'bg-gradient-to-r from-emerald-400 to-cyan-500 text-slate-950 border-white cursor-pointer'
              : 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
          }`}
        >
          {loggedObservations
            ? tr(language, 'Samples Saved ✅ Head to Mission Control for Earth Return', 'تم حفظ عينات القمر ✅ توجه لمركز القيادة لإذن العودة')
            : tr(language, `Log Samples & Return to Base (${collectedSamples.length}/3)`, `تسجيل العينات والعودة للقاعدة (${collectedSamples.length}/3)`)}
        </button>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 3.6 MISSION CONTROL — INITIATE RETURN TO EARTH GATE
  // ---------------------------------------------------------------------------
  const all5Complete = [
    'l3_resistance_training',
    'l3_water_recycling',
    'l3_solar_storm',
    'l3_eva_prep',
    'l3_lunar_samples'
  ].every((id) => campaign.completedMiniGames.includes(id as MiniGameId));

  return (
    <div className="bg-slate-900/95 border-4 border-purple-400 rounded-3xl p-6 flex flex-col gap-4 shadow-2xl">
      <h2 className="font-hud font-black text-xl text-white flex items-center gap-2">
        <ShieldAlert className="w-6 h-6 text-amber-300" />
        <span>{tr(language, 'Lunar Mission Control — Earth Return Authorization', 'مركز قيادة القمر — مراجعة الإذن بالعودة للأرض')}</span>
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-hud font-black">
        <div className="p-3.5 rounded-2xl bg-slate-950 border border-emerald-400/60">
          <p className="text-emerald-300">{tr(language, '💪 Bone & Muscle Score (OSDR)', '💪 كثافة العظام والعضلات (OSDR)')}</p>
          <p className="text-lg text-white mt-1">{campaign.l3BoneMuscleScore || (campaign.completedMiniGames.includes('l3_resistance_training') ? 100 : 60)}%</p>
        </div>
        <div className="p-3.5 rounded-2xl bg-slate-950 border border-cyan-400/60">
          <p className="text-cyan-300">{tr(language, '🪨 Lunar Samples Stowed', '🪨 عينات القمر المحفوظة')}</p>
          <p className="text-lg text-white mt-1">{campaign.l3CollectedSamples.length} / 3</p>
        </div>
        <div className="p-3.5 rounded-2xl bg-slate-950 border border-amber-400/60">
          <p className="text-amber-300">{tr(language, '☀️ Outpost Missions', '☀️ حالة المهام الخمس')}</p>
          <p className="text-lg text-white mt-1">
            {all5Complete ? tr(language, '5/5 Complete ✅', 'مكتملة 5/5 ✅') : tr(language, 'Complete 5 Missions 🔒', 'أكمل المهام أولاً 🔒')}
          </p>
        </div>
      </div>

      {campaign.l3ReturnAuthorized ? (
        <div className="p-5 rounded-3xl bg-gradient-to-br from-emerald-950 to-slate-950 border-4 border-emerald-300 text-center space-y-3">
          <p className="font-mono font-black text-lg sm:text-2xl text-amber-300">
            {tr(language, 'ALL SYSTEMS VERIFIED – RETURN TO EARTH AUTHORIZED!', 'تم التحقق من الأنظمة بالكامل — أُقر إذن العودة للأرض!')}
          </p>
          <p className="font-hud font-bold text-sm text-white">
            {tr(
              language,
              'All lunar systems & samples verified! Level 4 Unlocked: Return to Earth 🌍',
              'تم التحقق من كل الأنظمة وعينات القمر! فُتح المستوى الرابع: رحلة العودة إلى الأرض 🌍'
            )}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={onNextLevel}
              data-testid="mission-next-level-btn"
              className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-300 via-teal-300 to-cyan-300 text-slate-950 font-hud font-black text-base border-2 border-white shadow-[0_0_26px_rgba(52,211,153,0.75)] cursor-pointer hover:scale-105 transition-transform animate-pulse"
            >
              {tr(language, 'Mission Complete! Board Orion Home 🚀', 'المهمة اكتملت! انطلق للمرحلة التالية 🚀')}
            </button>
            <button
              type="button"
              onClick={onBackToLevel}
              className="px-4 py-3 rounded-2xl bg-slate-800 text-white font-hud font-bold text-sm border border-cyan-400 cursor-pointer"
            >
              {tr(language, 'Back to Station Map', 'العودة للخريطة')}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={!all5Complete}
          onClick={() => {
            confetti({ particleCount: 140, spread: 90 });
            void dialogueManager.speak(
              tr(
                language,
                'Return to Earth authorized! Level 4 Orion Transit is unlocked!',
                'الإذن بالعودة إلى الأرض مُعتمد! انطلق للمستوى الرابع!'
              )
            );
            onAuthorizeReturn();
          }}
          className={`w-full py-4 rounded-2xl font-hud font-black text-lg border-2 ${
            all5Complete
              ? 'bg-gradient-to-r from-purple-500 to-emerald-500 text-white border-white cursor-pointer'
              : 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
          }`}
        >
          {tr(language, 'INITIATE RETURN TO EARTH 🚀', 'اعتماد انطلاق رحلة العودة للأرض 🚀')}
        </button>
      )}
    </div>
  );
};
