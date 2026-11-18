import React, { useEffect, useRef, useState } from 'react';
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
import { computeCrossStageEffects } from '../../utils/consequences';
import { SpaceFitXControlsHUD } from '../suit/SpaceFitXControlsHUD';
import { PipePuzzle } from '../lunar/PipePuzzle';
import { BodyTelemetryMeters } from './BodyTelemetryMeters';
import { soundManager } from '../../utils/sound';
import { dialogueManager } from '../../utils/geminiTTS';
import { AlertTriangle, Droplets, Lock, ShieldAlert, Sun, Unlock, Wrench } from 'lucide-react';

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
  const effects = computeCrossStageEffects(campaign);

  // 3.1 Resistance Training (ARED Rhythm Force Gauge + Manual 4-EVA Tool Packing)
  const [exStage, setExStage] = useState<'leg' | 'arm' | 'core' | 'done'>(
    campaign.completedMiniGames.includes('l3_resistance_training') ? 'done' : 'leg'
  );
  const [exReps, setExReps] = useState<number>(0);
  const [aredCursor, setAredCursor] = useState<number>(50);
  const [aredFeedback, setAredFeedback] = useState<string | null>(null);
  const [packedTools, setPackedTools] = useState<LunarToolId[]>(campaign.l3PackedTools);

  // 3.2 Water Recycling BFS Pipe Solver + Hydroponic Bio-Tank
  const [pipeSolved, setPipeSolved] = useState<boolean>(campaign.l3WaterRecycled);
  const [waterRecycledDone, setWaterRecycledDone] = useState<boolean>(campaign.l3WaterRecycled);

  // 3.3 Solar Storm DONKI (Active 10s Defense + Blast Door + 3-Slider Power Split)
  const [stormStep, setStormStep] = useState<number>(campaign.l3SolarStormSheltered ? 4 : 0);
  const [tradeOffChoice, setTradeOffChoice] = useState<'shield_o2' | 'farm_only' | null>(
    campaign.l3SolarStormSheltered ? 'shield_o2' : null
  );
  const [powerSplit, setPowerSplit] = useState<{ water: number; hydro: number; shield: number }>(
    campaign.ecoPowerSplit || { water: 40, hydro: 20, shield: 40 }
  );
  const [blastDoorSealed, setBlastDoorSealed] = useState<boolean>(campaign.l3SolarStormSheltered);
  const [stormDefenseActive, setStormDefenseActive] = useState<boolean>(false);
  const [stormRemainMs, setStormRemainMs] = useState<number>(campaign.l3SolarStormSheltered ? 0 : 10000);
  const latestStorm = nasaCache.getLatestSolarStorm();

  // 3.4 EVA Prep (Part A suit + Part B 4 scientific tools)
  const [suitParts, setSuitParts] = useState<string[]>(
    campaign.l3EvaSuitAssembled ? ['helmet', 'gloves', 'boots', 'backpack', 'o2_comms'] : []
  );

  // 3.5 Lunar Sample Collection (0.16G + Oxygen + Tool Dependency!)
  const [suitO2, setSuitO2] = useState<number>(100);
  const [collectedSamples, setCollectedSamples] = useState<LunarSampleId[]>(campaign.l3CollectedSamples);
  const [loggedObservations, setLoggedObservations] = useState<boolean>(
    campaign.completedMiniGames.includes('l3_lunar_samples')
  );
  const [missingToolError, setMissingToolError] = useState<string | null>(null);
  const [dustBurstTick, setDustBurstTick] = useState<number>(0);
  const craterCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Oscillating ARED timing cursor for 3.1
  useEffect(() => {
    if (miniGameId !== 'l3_resistance_training' || exStage === 'done') return;
    const tStart = performance.now();
    const timer = window.setInterval(() => {
      const elapsed = (performance.now() - tStart) / 1000;
      const spd = effects.crewAdaptionScore >= 80 ? 2.15 : 2.75;
      setAredCursor(Math.round(50 + Math.sin(elapsed * spd) * 44));
    }, 45);
    return () => window.clearInterval(timer);
  }, [miniGameId, exStage, effects.crewAdaptionScore]);

  // 10s Active NASA DONKI CME Storm Defense timer for 3.3
  useEffect(() => {
    if (miniGameId !== 'l3_solar_storm' || !stormDefenseActive || stormStep >= 4) return;
    const timer = window.setInterval(() => {
      const shieldedOk = blastDoorSealed && powerSplit.shield >= 45 && powerSplit.water >= 30 && powerSplit.shield + powerSplit.water + powerSplit.hydro <= 100;
      setStormRemainMs((prev) => {
        if (!shieldedOk) return prev; // hold progress until player seals door & raises shield power!
        const next = Math.max(0, prev - 100);
        if (next === 0) {
          setStormDefenseActive(false);
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
        }
        return next;
      });
    }, 100);
    return () => window.clearInterval(timer);
  }, [miniGameId, stormDefenseActive, stormStep, blastDoorSealed, powerSplit, onCompleteMiniGame, language]);

  // 0.16G Lunar Crater Dust + Spectral LIDAR Scanner Canvas for 3.5
  useEffect(() => {
    const canvas = craterCanvasRef.current;
    if (!canvas || miniGameId !== 'l3_lunar_samples') return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let rafId = 0;
    const startMs = performance.now();
    const motes = Array.from({ length: 28 }, (_, i) => ({
      x: 30 + ((i * 29) % (canvas.width - 60)),
      y: canvas.height - 14 - (i % 5) * 6,
      vx: ((i % 2 === 0 ? 1 : -1) * (0.4 + (i % 3) * 0.25)),
      vy: dustBurstTick > 0 ? -(1.5 + (i % 4) * 0.45) : -0.25
    }));
    const draw = () => {
      rafId = window.requestAnimationFrame(draw);
      const t = (performance.now() - startMs) / 1000;
      const w = canvas.width;
      const h = canvas.height;
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, '#020617');
      bg.addColorStop(1, '#1e293b');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // Far sunlit Shackleton rim ridge
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.moveTo(0, h - 18);
      ctx.quadraticCurveTo(w * 0.28, h - 34, w * 0.56, h - 22);
      ctx.quadraticCurveTo(w * 0.82, h - 36, w, h - 18);
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fill();

      // Sweeping Cyan Spectral LIDAR Fan Beam
      const scanX = w * 0.5 + Math.sin(t * 2.1) * (w * 0.34);
      const beam = ctx.createLinearGradient(w * 0.5, 4, scanX, h - 8);
      beam.addColorStop(0, 'rgba(34, 211, 238, 0.48)');
      beam.addColorStop(1, 'rgba(34, 211, 238, 0.04)');
      ctx.fillStyle = beam;
      ctx.beginPath();
      ctx.moveTo(w * 0.5 - 6, 4);
      ctx.lineTo(w * 0.5 + 6, 4);
      ctx.lineTo(scanX + 24, h - 10);
      ctx.lineTo(scanX - 24, h - 10);
      ctx.closePath();
      ctx.fill();

      // Foreground Regolith Crater Basin
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.moveTo(0, h - 12);
      ctx.quadraticCurveTo(w * 0.5, h - 4, w, h - 12);
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fill();

      // Mineral glints embedded in regolith floor
      [
        [w * 0.26, h - 12, '#38bdf8'],
        [w * 0.52, h - 9, '#fde047'],
        [w * 0.76, h - 12, '#34d399']
      ].forEach(([gx, gy, col]) => {
        ctx.fillStyle = col as string;
        ctx.beginPath();
        ctx.moveTo(gx as number, (gy as number) - 4);
        ctx.lineTo((gx as number) + 4, gy as number);
        ctx.lineTo(gx as number, (gy as number) + 4);
        ctx.lineTo((gx as number) - 4, gy as number);
        ctx.closePath();
        ctx.fill();
      });

      motes.forEach((m) => {
        m.vy += 0.018; // gentle 0.16G settle
        m.x += m.vx;
        m.y += m.vy;
        if (m.y >= h - 14) {
          m.y = h - 14;
          m.vy = -(0.5 + Math.random() * 1.1);
        }
        if (m.x < 8 || m.x > w - 8) m.vx *= -1;
        ctx.fillStyle = 'rgba(226, 232, 240, 0.85)';
        ctx.beginPath();
        ctx.arc(m.x, m.y, 1.7, 0, Math.PI * 2);
        ctx.fill();
      });
    };
    draw();
    return () => window.cancelAnimationFrame(rafId);
  }, [miniGameId, dustBurstTick]);

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

    const isSweetSpot = aredCursor >= 32 && aredCursor <= 68;
    const allToolsPacked = packedTools.length >= EVA_TOOLS.length;
    const completeFitnessStation = (toolsToSave: LunarToolId[]) => {
      soundManager.playFanfare();
      void dialogueManager.speak(
        tr(
          language,
          'Awesome! ARED workout and 4 lunar geological tools packed! Head outside onto the Moon!',
          'عاش يا بطل! أتممت تمارين المقاومة وجهزت أدوات القمر الأربع بنجاح!'
        )
      );
      onCompleteMiniGame('l3_resistance_training', {
        l3BoneMuscleScore: 100,
        l3EvaSuitAssembled: true,
        l3PackedTools: toolsToSave
      });
    };

    const toggleFitnessTool = (toolId: LunarToolId) => {
      soundManager.playClick();
      const next = packedTools.includes(toolId)
        ? packedTools.filter((t) => t !== toolId)
        : [...packedTools, toolId];
      setPackedTools(next);
      onUpdateCampaign({ l3PackedTools: next });
      if (exStage === 'done' && next.length >= EVA_TOOLS.length) {
        completeFitnessStation(next);
      }
    };

    const doRep = () => {
      if (exStage === 'done') return;
      if (suit.emergencyReleased) {
        soundManager.playAlertSiren();
        return;
      }
      soundManager.playClick();
      const avgLoad = Math.round(Object.values(suit.jointLoads).reduce((a, b) => a + b, 0) / 5);
      const sweetBonus = isSweetSpot ? 1.4 : 0.7;
      const harvestedGain = Number((sweetBonus + avgLoad * 0.015).toFixed(1));
      setAredFeedback(
        isSweetSpot
          ? tr(language, `🔥 SWEET SPOT! +${harvestedGain} Wh kinetic charge`, `🔥 توقيت مثالي! +${harvestedGain} واط-ساعة طاقة`)
          : tr(language, `✓ Safe Form Rep (+${harvestedGain} Wh)`, `✓ تكرار سليم (+${harvestedGain} واط-ساعة)`)
      );
      onUpdateCampaign({
        spaceFitX: {
          ...suit,
          heartRateBpm: Math.min(162, Math.max(108, suit.heartRateBpm + 4)),
          muscleLoadPct: Math.min(98, Math.max(avgLoad, suit.muscleLoadPct + (isSweetSpot ? 9 : 6))),
          jointAngleDeg: exStage === 'leg' ? 78 : exStage === 'arm' ? 54 : 32,
          harvestedWh: Number((suit.harvestedWh + harvestedGain).toFixed(1)),
          batteryPercent: Math.min(100, suit.batteryPercent + 2)
        }
      });

      const nextReps = exReps + (isSweetSpot ? 2 : 1);
      if (nextReps >= 3) {
        soundManager.playDropSuccess();
        setExReps(0);
        if (exStage === 'leg') setExStage('arm');
        else if (exStage === 'arm') setExStage('core');
        else if (exStage === 'core') {
          setExStage('done');
          if (packedTools.length >= EVA_TOOLS.length) {
            completeFitnessStation(packedTools);
          }
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
            <div className="space-y-3 max-w-md mx-auto">
              {/* Kinetic ARED Dual-Flywheel & Vacuum Piston Visualizer */}
              <svg viewBox="0 0 280 58" className="w-full h-14 mx-auto overflow-visible">
                <defs>
                  <linearGradient id="aredBarGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="50%" stopColor={isSweetSpot ? '#34d399' : '#fbbf24'} />
                    <stop offset="100%" stopColor="#38bdf8" />
                  </linearGradient>
                </defs>
                {/* Left & Right Flywheels spinning with cursor tension */}
                {[52, 228].map((fx, idx) => (
                  <g key={fx} transform={`translate(${fx}, 29) rotate(${aredCursor * (idx === 0 ? 3.6 : -3.6)})`}>
                    <circle r="19" fill="#0f172a" stroke={isSweetSpot ? '#34d399' : '#38bdf8'} strokeWidth="2.5" />
                    {[0, 60, 120].map((deg) => (
                      <line
                        key={deg}
                        x1="-15"
                        y1="0"
                        x2="15"
                        y2="0"
                        stroke="rgba(186,230,253,0.45)"
                        strokeWidth="2"
                        transform={`rotate(${deg})`}
                      />
                    ))}
                    <circle r="5" fill={isSweetSpot ? '#34d399' : '#fbbf24'} />
                  </g>
                ))}
                {/* Twin vacuum cylinder cables */}
                <line x1="72" y1="29" x2="208" y2="29" stroke="#334155" strokeWidth="6" strokeLinecap="round" />
                <line
                  x1="72"
                  y1={29 + (aredCursor - 50) * 0.28}
                  x2="208"
                  y2={29 + (aredCursor - 50) * 0.28}
                  stroke="url(#aredBarGrad)"
                  strokeWidth="6"
                  strokeLinecap="round"
                />
              </svg>
              <div className="space-y-1 text-left">
                <div className="flex justify-between text-[11px] font-hud font-bold">
                  <span className="text-cyan-200">{tr(language, 'ARED Force Rhythm Zone', 'نطاق قوة السحب المثالي')}</span>
                  <span className={isSweetSpot ? 'text-emerald-300' : 'text-amber-200'}>
                    {isSweetSpot ? tr(language, 'GREEN SWEET SPOT!', 'النطاق الأخضر المثالي!') : `${aredCursor}%`}
                  </span>
                </div>
                <div className="relative h-5 rounded-full bg-slate-900 border border-slate-700 overflow-hidden">
                  <div className="absolute inset-y-0 left-[32%] right-[32%] bg-emerald-500/35 border-x-2 border-emerald-400" />
                  <div
                    className="absolute top-0 bottom-0 w-3 -ml-1.5 rounded-full bg-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.9)]"
                    style={{ left: `${aredCursor}%` }}
                  />
                </div>
              </div>
              {aredFeedback && <p className="text-xs font-hud font-bold text-emerald-300">{aredFeedback}</p>}
              <button
                type="button"
                disabled={suit.emergencyReleased}
                onClick={doRep}
                className={`px-8 py-3.5 rounded-2xl font-hud font-black text-base sm:text-lg border-2 border-white transition-transform ${
                  suit.emergencyReleased
                    ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                    : isSweetSpot
                    ? 'bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 text-slate-950 cursor-pointer scale-[1.03]'
                    : 'bg-gradient-to-r from-sky-400 to-cyan-500 text-slate-950 cursor-pointer hover:scale-105'
                }`}
              >
                {tr(language, `Pull ARED Bar (${exReps}/3) 🏋️`, `اسحب قضيب ARED (${exReps}/3) 🏋️`)}
              </button>
            </div>
          )}
        </div>

        {/* Manual Interactive 4-EVA Geological Tool Packing Rack (Required for Crater Samples) */}
        <div className="p-4 rounded-2xl bg-slate-950/90 border-2 border-amber-400/55 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-hud font-black text-xs sm:text-sm text-amber-200">
              🎒 {tr(
                language,
                `Pack 4 Geological EVA Tools (${packedTools.length}/4 Required for Crater Samples):`,
                `جهّز الأدوات الجيولوجية الأربع (${packedTools.length}/4 مطلوبة في الفوهة):`
              )}
            </span>
            {exStage === 'done' && allToolsPacked && !campaign.completedMiniGames.includes('l3_resistance_training') && (
              <button
                type="button"
                onClick={() => completeFitnessStation(packedTools)}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-400 text-slate-950 font-hud font-black text-xs cursor-pointer"
              >
                {tr(language, 'Complete Station ✅', 'إنهاء المحطة ✅')}
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {EVA_TOOLS.map((tool) => {
              const packed = packedTools.includes(tool.id);
              return (
                <button
                  key={tool.id}
                  type="button"
                  data-testid={`pack-tool-${tool.id}`}
                  onClick={() => toggleFitnessTool(tool.id)}
                  className={`p-3 rounded-xl border-2 flex items-center justify-between cursor-pointer transition-all ${
                    packed
                      ? 'bg-emerald-950 border-emerald-400 text-white'
                      : 'bg-slate-900 border-amber-400/60 text-slate-200 hover:border-cyan-400'
                  }`}
                >
                  <div className={`flex items-center gap-2 ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                    <span className="text-xl">{tool.icon}</span>
                    <div>
                      <p className="font-hud font-black text-xs">{tr(language, tool.nameEn, `${tool.nameAr} (${tool.nameEn})`)}</p>
                      <p className="text-[10px] text-cyan-200">{tr(language, tool.purposeEn, tool.purposeAr)}</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-hud font-black text-amber-300">
                    {packed ? tr(language, 'Packed ✅', 'محزوم ✅') : tr(language, 'Pack +', 'أضف +')}
                  </span>
                </button>
              );
            })}
          </div>
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
  // 3.2 WATER RECYCLING & HYDROPONIC LETTUCE LOOP (BFS PipePuzzle + BioTank)
  // ---------------------------------------------------------------------------
  if (miniGameId === 'l3_water_recycling') {
    const recoveryPct = waterRecycledDone ? 98 : pipeSolved ? 95 : 48;

    return (
      <div className="bg-slate-900/95 border-2 border-cyan-400/75 rounded-3xl p-5 flex flex-col gap-4 shadow-xl">
        <BodyTelemetryMeters
          language={language}
          titleEn="ECLSS Filter & Water Recovery Telemetry"
          titleAr="حالة الفلتر واسترجاع المياه (ECLSS)"
          metrics={[
            { key: 'filter', value: recoveryPct },
            { key: 'hydration', value: recoveryPct }
          ]}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-3.5 rounded-2xl bg-cyan-950/60 border border-cyan-400/50 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-hud font-black text-xs sm:text-sm text-cyan-200">
                {tr(
                  language,
                  `💧 ISS Milestone: ${ISS_WATER_MILESTONE.recoveryPercent}% Water Recovery (${ISS_WATER_MILESTONE.dateLabelEn})`,
                  `💧 إنجاز ISS: ${ISS_WATER_MILESTONE.recoveryPercent}% استرجاع المياه (${ISS_WATER_MILESTONE.dateLabelAr})`
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
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-950/55 border border-emerald-400/50 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-hud font-black text-emerald-200">
              <span>{tr(language, '🌱 Lunar Hydroponic Spirulina & Lettuce Tank', '🌱 حوض الزراعة المائية والسبيرولينا')}</span>
              <span>{pipeSolved ? tr(language, '98% Fed ✓', 'مُغذّى 98% ✓') : tr(language, 'Waiting Flow', 'بانتظار الماء')}</span>
            </div>
            <div className="h-3 rounded-full bg-slate-950 border border-emerald-500/40 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-500"
                style={{ width: `${recoveryPct}%` }}
              />
            </div>
            <p className="text-[11px] text-emerald-100">
              {pipeSolved
                ? tr(language, '🌱 Fresh lunar lettuce & Spirulina thriving on 98% recovered ECLSS loop!', '🌱 الخس القمري والسبيرولينا ينموان بنجاح باستخدام 98% من المياه المعاد تدويرها!')
                : tr(language, 'Solve the 3x3 ECLSS pipe loop below to route purified water to the greenhouse.', 'وصل أنابيب الشبكة 3×3 بالأسفل لإيصال الماء النقي لحوض النباتات.')}
            </p>
          </div>
        </div>

        <PipePuzzle isProcessorFailed={false} onPuzzleSolved={() => setPipeSolved(true)} />

        <button
          type="button"
          disabled={!pipeSolved}
          onClick={() => {
            setWaterRecycledDone(true);
            soundManager.playFanfare();
            void dialogueManager.speak(
              tr(
                language,
                'ECLSS water circuit restored to 98% purity and lunar greenhouse nourished!',
                'تم إصلاح دائرة المياه ECLSS بنسبة 98% وتغذية حوض النباتات القمري!'
              )
            );
            onCompleteMiniGame('l3_water_recycling', { l3WaterRecycled: true });
          }}
          className={`w-full py-3.5 rounded-2xl font-hud font-black text-base border-2 flex items-center justify-center gap-2 ${
            pipeSolved
              ? 'bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-950 border-white cursor-pointer'
              : 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
          }`}
        >
          <Droplets className="w-5 h-5" />
          <span>
            {pipeSolved
              ? tr(language, 'Seal 98% Water Loop & Feed Greenhouse 💧🌱', 'اعتماد نقاء المياه 98% وتغذية النباتات 💧🌱')
              : tr(language, 'Connect Wastewater Inlet to Drink Tank first 🔒', 'وصّل شبكة الأنابيب أعلاه أولاً 🔒')}
          </span>
        </button>
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

        {/* Animated Solar Storm Magnetic Plasma Dome Deflector */}
        <div
          data-testid="donki-solar-wave-viz"
          className="relative h-28 rounded-2xl bg-slate-950 border-2 border-amber-400/60 overflow-hidden flex items-center justify-between px-4"
        >
          <svg
            viewBox="0 0 420 100"
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full pointer-events-none"
          >
            <defs>
              <radialGradient id="solarFlareCore" cx="10%" cy="50%" r="48%">
                <stop offset="0%" stopColor="#fef08a" stopOpacity="0.95" />
                <stop offset="40%" stopColor="#f97316" stopOpacity="0.55" />
                <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="domeShieldGlow" cx="50%" cy="95%" r="85%">
                <stop offset="0%" stopColor={shieldStrong ? '#10b981' : '#f43f5e'} stopOpacity="0.45" />
                <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
              </radialGradient>
            </defs>
            <rect width="420" height="100" fill="url(#solarFlareCore)" />
            {/* Geodesic Lunar Bio-Dome Silhouette on Lower-Right */}
            <path d="M326 96 A38 36 0 0 1 402 96 Z" fill="url(#domeShieldGlow)" stroke="#38bdf8" strokeWidth="1.8" />
            <path d="M344 96 A20 30 0 0 1 384 96 M364 60 L364 96" fill="none" stroke="rgba(186,230,253,0.45)" strokeWidth="1.2" />
            {/* Outer Magnetic Shield Deflector Arc */}
            <path
              d="M306 96 A58 52 0 0 1 414 58"
              fill="none"
              stroke={shieldStrong ? '#34d399' : '#f43f5e'}
              strokeWidth={shieldStrong ? 4 : 2}
              strokeDasharray={shieldStrong ? 'none' : '8 6'}
            />
          </svg>

          <span className="text-3xl z-10 select-none">☀️</span>

          {/* Curved Deflected Solar Proton Particle Arcs */}
          {[0, 1, 2, 3, 4].map((waveIdx) => (
            <motion.div
              key={waveIdx}
              initial={{ x: -20, y: 0, opacity: 0.9 }}
              animate={{
                x: shieldStrong ? [0, 110, 155] : [0, 170, 240],
                y: shieldStrong ? [0, -18, -32] : [0, 6, 12],
                opacity: shieldStrong ? [0.95, 0.9, 0] : [0.95, 0.85, 0.25],
                scale: [0.9, 1.15, 0.8]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: waveIdx * 0.28,
                ease: 'linear'
              }}
              className="text-base font-black text-amber-300 select-none pointer-events-none z-10"
            >
              {waveIdx % 2 === 0 ? '⚡' : '☄️'}
            </motion.div>
          ))}

          {/* Magnetic Shield Deflection Status Pill (Cleanly above the dome arc) */}
          <div className="flex items-center gap-2 z-10 self-start mt-2">
            <div
              className={`px-3 py-1 rounded-full text-[11px] font-hud font-black border-2 transition-colors ${
                shieldStrong
                  ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200'
                  : 'bg-rose-500/30 border-rose-400 text-rose-200 animate-pulse'
              }`}
            >
              {shieldStrong
                ? tr(language, '🛡️ SHIELD DEFLECTING', '🛡️ الدرع يصد الموجة')
                : tr(language, '⚠️ LOW SHIELD', '⚠️ الدرع ضعيف')}
            </div>
          </div>
        </div>

        {/* Active 10s DONKI CME Storm Defense Controls */}
        <div className="p-4 rounded-2xl bg-slate-950/90 border-2 border-amber-400/50 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-hud font-black text-sm text-amber-200">
                {stormStep >= 4
                  ? tr(language, '✅ Solar Proton Storm Cleared Safely!', '✅ انتهت العاصفة الشمسية بأمان!')
                  : stormDefenseActive
                  ? tr(
                      language,
                      `⏳ Active Shield Defense: ${(stormRemainMs / 1000).toFixed(1)}s remaining`,
                      `⏳ صمود الدرع ضد الإشعاع: ${(stormRemainMs / 1000).toFixed(1)} ثانية`
                    )
                  : tr(language, '🛡️ 10s Active DONKI Storm Defense Simulator', '🛡️ محاكاة الدفاع النشط ضد العاصفة (10 ثوانٍ)')}
              </p>
              <p className="text-[11px] text-slate-300">
                {tr(language, tradeoff.dilemmaEn, tradeoff.dilemmaAr)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                soundManager.playPressurizeHiss();
                setBlastDoorSealed((s) => !s);
              }}
              className={`px-3.5 py-2 rounded-xl font-hud font-black text-xs flex items-center gap-1.5 cursor-pointer border-2 ${
                blastDoorSealed
                  ? 'bg-emerald-950 border-emerald-400 text-emerald-200'
                  : 'bg-rose-950 border-rose-400 text-rose-200 animate-pulse'
              }`}
            >
              {blastDoorSealed ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
              <span>
                {blastDoorSealed
                  ? tr(language, 'Blast Door Sealed ✓', 'البوابة المدرعة مغلقة ✓')
                  : tr(language, 'Seal Blast Door! 🚪', 'أغلق البوابة المدرعة! 🚪')}
              </span>
            </button>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/90 border border-amber-400/35 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-black text-amber-200">
              <span>{tr(language, '⚡ Base Power Allocation (Total ≤ 100%):', '⚡ توزيع طاقة القاعدة (المجموع ≤ 100%):')}</span>
              <span className={powerSplit.shield + powerSplit.water + powerSplit.hydro > 100 ? 'text-rose-300' : 'text-emerald-300'}>
                {powerSplit.shield + powerSplit.water + powerSplit.hydro}%
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
          </div>

          {stormStep < 4 && (
            <div className="space-y-2">
              <div className="h-2.5 rounded-full bg-slate-900 border border-slate-700 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all duration-100"
                  style={{ width: `${Math.round(((10000 - stormRemainMs) / 10000) * 100)}%` }}
                />
              </div>
              {!stormDefenseActive ? (
                <button
                  type="button"
                  onClick={() => {
                    const totalPower = powerSplit.shield + powerSplit.water + powerSplit.hydro;
                    if (!blastDoorSealed || powerSplit.shield < 45 || powerSplit.water < 30 || totalPower > 100) {
                      soundManager.playAlertSiren();
                      setTradeOffChoice('farm_only');
                      return;
                    }
                    soundManager.playClick();
                    setTradeOffChoice('shield_o2');
                    setStormDefenseActive(true);
                  }}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-hud font-black text-sm cursor-pointer border-2 border-white"
                >
                  {tr(language, 'Start 10s Storm Defense & Hold Shield! 🛡️', 'ابدأ صمود العاصفة (10 ثوانٍ) 🛡️')}
                </button>
              ) : (
                <p className="text-xs font-hud font-bold text-center text-cyan-200">
                  {blastDoorSealed && powerSplit.shield >= 45 && powerSplit.water >= 30 && powerSplit.shield + powerSplit.water + powerSplit.hydro <= 100
                    ? tr(language, '🛡️ Shield holding steady against CME plasma burst!', '🛡️ الدرع يصد العاصفة الشمسية بنجاح!')
                    : tr(language, '⚠️ Restore Shield ≥ 45%, ECLSS ≥ 30%, Total ≤ 100% & Seal Door!', '⚠️ اضبط الدرع ≥ 45% والمياه ≥ 30% والمجموع ≤ 100% وأغلق البوابة!')}
                </p>
              )}
              {tradeOffChoice === 'farm_only' && !stormDefenseActive && (
                <p className="text-xs text-rose-300 font-hud font-bold text-center">
                  {tr(
                    language,
                    'Seal the blast door, set Shield ≥ 45%, ECLSS ≥ 30%, and Total ≤ 100% first!',
                    'أغلق البوابة واضبط الدروع ≥ 45% والمياه ≥ 30% والمجموع ≤ 100% أولاً!'
                  )}
                </p>
              )}
            </div>
          )}
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
      setDustBurstTick((t) => t + 1);
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
              onClick={() => onJumpToRoom('fitness_room', 'l3_resistance_training')}
              className="px-4 py-2 rounded-xl bg-amber-400 text-slate-950 font-hud font-black text-xs cursor-pointer flex items-center gap-1.5"
            >
              <Wrench className="w-4 h-4" />
              <span>{tr(language, 'Return to Fitness & EVA Tool Rack 🎒', 'العودة إلى محطة التمارين وحقيبة الأدوات 🎒')}</span>
            </button>
          </div>
        )}

        {/* 0.16G Low-Gravity Crater Dust Settling Canvas */}
        <div className="rounded-2xl bg-slate-950/90 border border-slate-700 p-2.5 space-y-1">
          <div className="flex items-center justify-between text-[11px] font-hud font-bold text-slate-300">
            <span>{tr(language, '🌑 0.16G Lunar Regolith Plume & Crater Rim Sensor', '🌑 مستشعر غبار القمر (جاذبية 0.16G)')}</span>
            <span className="text-amber-300">{tr(language, `${collectedSamples.length}/3 Samples Sealed`, `${collectedSamples.length}/3 عينات`)}</span>
          </div>
          <canvas ref={craterCanvasRef} width={380} height={64} className="w-full h-16 rounded-xl" />
        </div>

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
            ? tr(language, 'Samples Saved ✅ Ready for Earth Return Gate', 'تم حفظ عينات القمر ✅ جاهز لإذن العودة')
            : tr(language, `Log Samples & Seal Container (${collectedSamples.length}/3)`, `تسجيل العينات وإغلاق الحاوية (${collectedSamples.length}/3)`)}
        </button>

        {loggedObservations && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950 via-indigo-950 to-slate-950 border-2 border-purple-400 text-center space-y-2.5">
            {campaign.l3ReturnAuthorized ? (
              <button
                type="button"
                data-testid="mission-next-level-btn"
                onClick={() => {
                  soundManager.playClick();
                  onNextLevel();
                }}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-300 to-emerald-400 text-slate-950 font-hud font-black text-sm sm:text-base border-2 border-white cursor-pointer"
              >
                {tr(language, 'Earth Return Authorized! Launch Level 4 🌍🚀', 'تم اعتماد العودة! انطلق للمرحلة 4 🌍🚀')}
              </button>
            ) : (
              <button
                type="button"
                data-testid="authorize-earth-return-btn"
                onClick={() => {
                  soundManager.playFanfare();
                  confetti({ particleCount: 140, spread: 90 });
                  onAuthorizeReturn();
                }}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-300 to-orange-400 text-slate-950 font-hud font-black text-base border-2 border-white shadow-lg cursor-pointer"
              >
                {tr(language, '🚀 Authorize Earth Return & Unlock Level 4 🌍', '🚀 اعتماد تصريح العودة وفتح المرحلة الرابعة 🌍')}
              </button>
            )}
          </div>
        )}
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
