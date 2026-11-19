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
import { PipePuzzle } from '../lunar/PipePuzzle';
import { BodyTelemetryMeters } from './BodyTelemetryMeters';
import { StationLandscapeFrame } from './StationLandscapeFrame';
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
      <StationLandscapeFrame
        accentBorderClass="border-emerald-400/70"
        roboTip={tr(
          language,
          'Pull ARED in the green zone for Legs, Arms & Core + pack all 4 EVA tools!',
          'اسحب في النطاق الأخضر للتمارين الثلاثة ثم احزم أدوات القمر الأربع!'
        )}
        leftStage={
          <div className="flex-1 min-h-0 flex flex-col justify-between gap-1.5 overflow-hidden">
            <BodyTelemetryMeters
              compact
              language={language}
              titleEn="Bone & Muscle (NASA OSDR)"
              titleAr="العظام والعضلات (NASA OSDR)"
              metrics={[
                { key: 'bone', value: boneScore },
                { key: 'muscle', value: muscleScore }
              ]}
            />

            <div className="grid grid-cols-3 gap-1 text-center font-hud font-black text-[10.5px] shrink-0">
              <div className={`py-1 px-1.5 rounded-xl border ${exStage !== 'leg' ? 'bg-emerald-950 border-emerald-400 text-emerald-200' : 'bg-sky-900 border-amber-300 text-white'}`}>
                🦵 {tr(language, 'Legs', 'الأرجل')} {exStage !== 'leg' ? '✓' : `(${exReps}/3)`}
              </div>
              <div className={`py-1 px-1.5 rounded-xl border ${exStage === 'core' || exStage === 'done' ? 'bg-emerald-950 border-emerald-400 text-emerald-200' : exStage === 'arm' ? 'bg-sky-900 border-amber-300 text-white' : 'bg-slate-800 border-slate-600 text-slate-400'}`}>
                💪 {tr(language, 'Arms', 'الذراعين')} {exStage === 'core' || exStage === 'done' ? '✓' : exStage === 'arm' ? `(${exReps}/3)` : '○'}
              </div>
              <div className={`py-1 px-1.5 rounded-xl border ${exStage === 'done' ? 'bg-emerald-950 border-emerald-400 text-emerald-200' : exStage === 'core' ? 'bg-sky-900 border-amber-300 text-white' : 'bg-slate-800 border-slate-600 text-slate-400'}`}>
                🧘 {tr(language, 'Core', 'الجذع')} {exStage === 'done' ? '✓' : exStage === 'core' ? `(${exReps}/3)` : '○'}
              </div>
            </div>

            <div className="px-2 py-1 rounded-xl bg-sky-950/75 border border-cyan-400/45 text-[10px] font-hud text-cyan-100 truncate shrink-0">
              🧬 <strong>{osdrBone.osdrCode}:</strong>{' '}
              {tr(language, 'Daily ARED counters 1–1.5%/mo bone loss.', osdrBone.findingAr)}
            </div>
          </div>
        }
        rightHeader={
          <div className="flex items-center justify-between gap-2 text-xs font-hud font-black">
            <span className="text-white truncate">{currentLabel}</span>
            <span className={`shrink-0 ${isSweetSpot ? 'text-emerald-300' : 'text-amber-300'}`}>
              {exStage === 'done'
                ? tr(language, 'Workout Done ✓', 'التمرين مكتمل ✓')
                : isSweetSpot
                ? tr(language, 'GREEN SWEET SPOT!', 'النطاق الأخضر!')
                : `${aredCursor}%`}
            </span>
          </div>
        }
        rightContent={
          <div className="space-y-1.5">
            {suit.emergencyReleased && (
              <p className="text-[11px] font-black text-rose-300 bg-rose-950/70 border border-rose-400/60 px-2 py-1 rounded-lg">
                {tr(language, '⚠️ Quick-release open! Re-lock Moon Suit mode below.', '⚠️ الإفلات السريع مفتوح! أعد قفل البدلة بالأسفل.')}
              </p>
            )}

            {exStage !== 'done' && (
              <div className="p-2 rounded-xl bg-slate-950 border border-emerald-500/40 space-y-1.5">
                <div className="flex items-center gap-2">
                  <svg viewBox="0 0 280 54" className="w-28 sm:w-36 h-10 shrink-0 overflow-visible">
                    <defs>
                      <linearGradient id="aredBarGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#38bdf8" />
                        <stop offset="50%" stopColor={isSweetSpot ? '#34d399' : '#fbbf24'} />
                        <stop offset="100%" stopColor="#38bdf8" />
                      </linearGradient>
                    </defs>
                    {[52, 228].map((fx, idx) => (
                      <g key={fx} transform={`translate(${fx}, 27) rotate(${aredCursor * (idx === 0 ? 3.6 : -3.6)})`}>
                        <circle r="17" fill="#0f172a" stroke={isSweetSpot ? '#34d399' : '#38bdf8'} strokeWidth="2.5" />
                        {[0, 60, 120].map((deg) => (
                          <line
                            key={deg}
                            x1="-13"
                            y1="0"
                            x2="13"
                            y2="0"
                            stroke="rgba(186,230,253,0.45)"
                            strokeWidth="2"
                            transform={`rotate(${deg})`}
                          />
                        ))}
                        <circle r="4.5" fill={isSweetSpot ? '#34d399' : '#fbbf24'} />
                      </g>
                    ))}
                    <line x1="72" y1="27" x2="208" y2="27" stroke="#334155" strokeWidth="5" strokeLinecap="round" />
                    <line
                      x1="72"
                      y1={27 + (aredCursor - 50) * 0.24}
                      x2="208"
                      y2={27 + (aredCursor - 50) * 0.24}
                      stroke="url(#aredBarGrad)"
                      strokeWidth="5"
                      strokeLinecap="round"
                    />
                  </svg>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="relative h-3.5 rounded-full bg-slate-900 border border-slate-700 overflow-hidden">
                      <div className="absolute inset-y-0 left-[32%] right-[32%] bg-emerald-500/35 border-x-2 border-emerald-400" />
                      <div
                        className="absolute top-0 bottom-0 w-2.5 -ml-1 rounded-full bg-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.9)]"
                        style={{ left: `${aredCursor}%` }}
                      />
                    </div>
                    {aredFeedback && <p className="text-[10px] font-hud font-bold text-emerald-300 truncate">{aredFeedback}</p>}
                  </div>

                  <button
                    type="button"
                    disabled={suit.emergencyReleased}
                    onClick={doRep}
                    className={`px-3 py-2 rounded-xl font-hud font-black text-xs border-2 border-white shrink-0 ${
                      suit.emergencyReleased
                        ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                        : isSweetSpot
                        ? 'bg-gradient-to-r from-emerald-400 to-cyan-400 text-slate-950 cursor-pointer'
                        : 'bg-gradient-to-r from-sky-400 to-cyan-500 text-slate-950 cursor-pointer'
                    }`}
                  >
                    {tr(language, `Pull (${exReps}/3) 🏋️`, `اسحب (${exReps}/3) 🏋️`)}
                  </button>
                </div>
              </div>
            )}

            {/* Compact 4-Tool EVA Rack */}
            <div className="p-2 rounded-xl bg-slate-950/90 border border-amber-400/50 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-hud font-black text-amber-200">
                <span>🎒 {tr(language, `Pack 4 EVA Crater Tools (${packedTools.length}/4)`, `أدوات الفوهة (${packedTools.length}/4)`)}</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {EVA_TOOLS.map((tool) => {
                  const packed = packedTools.includes(tool.id);
                  return (
                    <button
                      key={tool.id}
                      type="button"
                      data-testid={`pack-tool-${tool.id}`}
                      onClick={() => toggleFitnessTool(tool.id)}
                      className={`p-1.5 rounded-xl border-2 flex items-center justify-between gap-1 cursor-pointer transition-all ${
                        packed
                          ? 'bg-emerald-950 border-emerald-400 text-white'
                          : 'bg-slate-900 border-amber-400/60 text-slate-200 hover:border-cyan-400'
                      }`}
                    >
                      <div className={`flex items-center gap-1.5 min-w-0 ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                        <span className="text-base shrink-0">{tool.icon}</span>
                        <span className="font-hud font-black text-[11px] truncate">{tr(language, tool.nameEn, tool.nameAr)}</span>
                      </div>
                      <span className="text-[10px] font-hud font-black text-amber-300 shrink-0">
                        {packed ? '✅' : '+'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3-Button Moon Suit Strength Mode */}
            <div
              data-testid="moon-suit-strength-card"
              className="p-2 rounded-xl bg-slate-950/85 border border-cyan-400/45 space-y-1.5"
            >
              <div className="flex items-center justify-between gap-2 text-[11px] font-hud font-black text-cyan-200">
                <span>🌙 {tr(language, 'Moon Suit Strength:', 'قوة بدلة القمر:')}</span>
                {suit.emergencyReleased && (
                  <button
                    type="button"
                    onClick={() => {
                      soundManager.playClick();
                      onUpdateCampaign({
                        spaceFitX: { ...suit, emergencyReleased: false, resistanceMode: 'level2', muscleLoadPct: 65 }
                      });
                    }}
                    className="px-2 py-0.5 rounded-full bg-emerald-400 text-slate-950 text-[10px] cursor-pointer"
                  >
                    {tr(language, 'Re-Lock ✓', 'إعادة قفل ✓')}
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    { mode: 'level1' as const, load: 35, en: '⭐ Easy', ar: '⭐ سهل' },
                    { mode: 'level2' as const, load: 65, en: '⭐⭐ Strong', ar: '⭐⭐ قوي' },
                    { mode: 'level3' as const, load: 90, en: '⭐⭐⭐ Super', ar: '⭐⭐⭐ خارق' }
                  ]
                ).map((opt) => (
                  <button
                    key={opt.mode}
                    type="button"
                    onClick={() => {
                      soundManager.playClick();
                      onUpdateCampaign({
                        spaceFitX: {
                          ...suit,
                          emergencyReleased: false,
                          resistanceMode: opt.mode,
                          muscleLoadPct: opt.load,
                          jointLoads: { shoulders: opt.load, elbows: opt.load, hips: opt.load, knees: opt.load, ankles: opt.load }
                        }
                      });
                    }}
                    className={`py-1.5 px-1.5 rounded-xl font-hud font-black text-[11px] border-2 cursor-pointer transition-all truncate ${
                      suit.resistanceMode === opt.mode && !suit.emergencyReleased
                        ? 'bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-950 border-white shadow'
                        : 'bg-slate-900 text-slate-200 border-slate-700 hover:border-cyan-400'
                    }`}
                  >
                    {tr(language, opt.en, opt.ar)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        }
        primaryCta={
          <button
            type="button"
            disabled={!(exStage === 'done' && allToolsPacked)}
            onClick={() => completeFitnessStation(packedTools)}
            className={`w-full py-2.5 rounded-xl font-hud font-black text-xs sm:text-sm border-2 ${
              exStage === 'done' && allToolsPacked
                ? 'bg-gradient-to-r from-emerald-400 to-cyan-400 text-slate-950 border-white cursor-pointer'
                : 'bg-slate-800 text-slate-400 border-slate-700 cursor-not-allowed'
            }`}
          >
            {exStage === 'done' && allToolsPacked
              ? tr(language, 'Complete ARED Workout & EVA Kit ✅', 'اعتماد التمرين وأدوات القمر ✅')
              : tr(language, `Finish ARED reps & pack ${packedTools.length}/4 EVA tools 🔒`, `أكمل التمرين وحزم ${packedTools.length}/4 أدوات 🔒`)}
          </button>
        }
      />
    );
  }

  // ---------------------------------------------------------------------------
  // 3.2 WATER RECYCLING & HYDROPONIC LETTUCE LOOP (BFS PipePuzzle + BioTank)
  // ---------------------------------------------------------------------------
  if (miniGameId === 'l3_water_recycling') {
    const recoveryPct = waterRecycledDone ? 98 : pipeSolved ? 95 : 48;

    return (
      <StationLandscapeFrame
        accentBorderClass="border-cyan-400/70"
        roboTip={tr(
          language,
          'Rotate the 3×3 pipes to route reclaimed water cleanly to the greenhouse!',
          'أدِر الأنابيب 3×3 لتوصيل مدخل العادم بخزان الشرب وتغذية النباتات!'
        )}
        leftStage={
          <div className="flex-1 min-h-0 flex flex-col justify-between gap-1.5 overflow-hidden">
            <BodyTelemetryMeters
              compact
              language={language}
              titleEn="ECLSS Recovery Telemetry"
              titleAr="حالة الفلتر والمياه (ECLSS)"
              metrics={[
                { key: 'filter', value: recoveryPct },
                { key: 'hydration', value: recoveryPct }
              ]}
            />

            <div className="p-2 rounded-xl bg-emerald-950/55 border border-emerald-400/50 space-y-1 shrink-0">
              <div className="flex items-center justify-between text-[11px] font-hud font-black text-emerald-200 gap-1">
                <span className="truncate">🌱 {tr(language, 'Lunar Hydroponics', 'الزراعة المائية القمرية')}</span>
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-emerald-900 border border-emerald-400 text-emerald-200 shrink-0">
                  {tr(language, `${ISS_WATER_MILESTONE.recoveryPercent}% ${SCIENCE_BADGES.ISS_PROVEN.labelEn}`, `${ISS_WATER_MILESTONE.recoveryPercent}% ${SCIENCE_BADGES.ISS_PROVEN.labelAr}`)}
                </span>
              </div>
              <div className="h-2 rounded-full bg-slate-950 border border-emerald-500/40 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-500"
                  style={{ width: `${recoveryPct}%` }}
                />
              </div>
            </div>
          </div>
        }
        rightContent={<PipePuzzle compact isProcessorFailed={false} onPuzzleSolved={() => setPipeSolved(true)} />}
        primaryCta={
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
            className={`w-full py-2.5 rounded-xl font-hud font-black text-xs sm:text-sm border-2 flex items-center justify-center gap-2 ${
              pipeSolved
                ? 'bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-950 border-white cursor-pointer'
                : 'bg-slate-800 text-slate-400 border-slate-700 cursor-not-allowed'
            }`}
          >
            <Droplets className="w-4 h-4" />
            <span>
              {pipeSolved
                ? tr(language, 'Seal 98% Water Loop & Feed Greenhouse 💧🌱', 'اعتماد نقاء المياه 98% وتغذية النباتات 💧🌱')
                : tr(language, 'Connect Wastewater Inlet to Drink Tank first 🔒', 'وصّل شبكة الأنابيب باليمين أولاً 🔒')}
            </span>
          </button>
        }
      />
    );
  }

  // ---------------------------------------------------------------------------
  // 3.3 SOLAR STORM EMERGENCY (NASA DONKI CME/SEP + Animated Wave Visualizer)
  // ---------------------------------------------------------------------------
  if (miniGameId === 'l3_solar_storm') {
    const tradeoff = NASA_ENGINEERING_TRADEOFFS[0];
    const shieldStrong = powerSplit.shield >= 45;
    const totalPower = powerSplit.shield + powerSplit.water + powerSplit.hydro;

    return (
      <StationLandscapeFrame
        accentBorderClass="border-rose-400/75"
        roboTip={tr(
          language,
          'Seal blast door, keep total ≤100% with Shield ≥45% & ECLSS ≥30%, then hold 10s!',
          'أغلق البوابة واضبط الدروع ≥45% والمياه ≥30% (المجموع ≤100%) واصمد 10 ثوانٍ!'
        )}
        leftStage={
          <div className="flex-1 min-h-0 flex flex-col justify-between gap-1.5 overflow-hidden">
            <div className="px-2.5 py-1.5 rounded-xl bg-rose-950/80 border border-rose-400 flex items-center gap-2 shrink-0">
              <Sun className="w-4 h-4 text-amber-300 animate-spin shrink-0" />
              <div className="min-w-0">
                <p className="font-hud font-black text-[11px] text-rose-100 truncate">
                  {tr(language, `⚠️ NASA DONKI Alert (${latestStorm.activityId})`, `⚠️ تنبيه DONKI (${latestStorm.activityId})`)}
                </p>
                <p className="font-hud text-[10px] text-rose-200 truncate">
                  {tr(language, `CME ${latestStorm.speedKmS || 1200} km/s`, `انبعاث ${latestStorm.speedKmS || 1200} كم/ث`)}
                </p>
              </div>
            </div>

            <div
              dir="ltr"
              data-testid="donki-solar-wave-viz"
              className="relative flex-1 min-h-[100px] rounded-xl bg-slate-950 border border-amber-400/60 overflow-hidden flex items-center justify-between px-3"
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
                <path d="M326 96 A38 36 0 0 1 402 96 Z" fill="url(#domeShieldGlow)" stroke="#38bdf8" strokeWidth="1.8" />
                <path
                  d="M306 96 A58 52 0 0 1 414 58"
                  fill="none"
                  stroke={shieldStrong ? '#34d399' : '#f43f5e'}
                  strokeWidth={shieldStrong ? 4 : 2}
                  strokeDasharray={shieldStrong ? 'none' : '8 6'}
                />
              </svg>

              <span className="text-2xl z-10 select-none">☀️</span>

              {[0, 1, 2, 3, 4].map((waveIdx) => (
                <motion.div
                  key={waveIdx}
                  initial={{ x: -20, y: 0, opacity: 0.9 }}
                  animate={{
                    x: shieldStrong ? [0, 90, 130] : [0, 140, 200],
                    y: shieldStrong ? [0, -16, -28] : [0, 6, 12],
                    opacity: shieldStrong ? [0.95, 0.9, 0] : [0.95, 0.85, 0.25],
                    scale: [0.9, 1.1, 0.8]
                  }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: waveIdx * 0.28, ease: 'linear' }}
                  className="text-sm font-black text-amber-300 select-none pointer-events-none z-10"
                >
                  {waveIdx % 2 === 0 ? '⚡' : '☄️'}
                </motion.div>
              ))}

              <div
                className={`z-10 self-start mt-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-hud font-black border transition-colors ${
                  shieldStrong
                    ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200'
                    : 'bg-rose-500/30 border-rose-400 text-rose-200 animate-pulse'
                }`}
              >
                {shieldStrong ? tr(language, '🛡️ DEFLECTING', '🛡️ الدرع يصد') : tr(language, '⚠️ LOW SHIELD', '⚠️ درع ضعيف')}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                soundManager.playPressurizeHiss();
                setBlastDoorSealed((s) => !s);
              }}
              className={`w-full py-2 rounded-xl font-hud font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer border-2 shrink-0 ${
                blastDoorSealed
                  ? 'bg-emerald-950 border-emerald-400 text-emerald-200'
                  : 'bg-rose-950 border-rose-400 text-rose-200 animate-pulse'
              }`}
            >
              {blastDoorSealed ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
              <span>
                {blastDoorSealed
                  ? tr(language, 'Blast Door Sealed ✓', 'البوابة المدرعة مغلقة ✓')
                  : tr(language, 'Seal Blast Door NOW! 🚪', 'أغلق البوابة المدرعة الآن! 🚪')}
              </span>
            </button>
          </div>
        }
        rightHeader={
          <div className="flex items-center justify-between gap-2 text-xs font-hud font-black">
            <span className="text-amber-200 truncate">
              {stormStep >= 4
                ? tr(language, '✅ Solar Storm Cleared!', '✅ انتهت العاصفة بأمان!')
                : stormDefenseActive
                ? tr(language, `⏳ Hold Shield: ${(stormRemainMs / 1000).toFixed(1)}s`, `⏳ صمود الدرع: ${(stormRemainMs / 1000).toFixed(1)}ث`)
                : tr(language, '⚡ Power Split (Total ≤ 100%)', '⚡ توزيع الطاقة (المجموع ≤ 100%)')}
            </span>
            <span className={totalPower > 100 ? 'text-rose-300 shrink-0' : 'text-emerald-300 shrink-0'}>
              {totalPower}%
            </span>
          </div>
        }
        rightContent={
          <div className="space-y-1.5">
            <p className="text-[10.5px] text-slate-300 leading-snug">
              {tr(language, tradeoff.dilemmaEn, tradeoff.dilemmaAr)}
            </p>

            {[
              { key: 'shield' as const, label: tr(language, '🛡️ Radiation Shield (≥ 45%)', '🛡️ دروع الإشعاع (≥ 45%)'), color: 'accent-amber-400' },
              { key: 'water' as const, label: tr(language, '💧 ECLSS Water & Air (≥ 30%)', '💧 المياه والهواء ECLSS (≥ 30%)'), color: 'accent-cyan-400' },
              { key: 'hydro' as const, label: tr(language, '🌱 Hydroponic Lights (Dim)', '🌱 إضاءة الزراعة (تُخفّض)'), color: 'accent-emerald-400' }
            ].map((row) => (
              <div key={row.key} className="p-1.5 rounded-xl bg-slate-950/90 border border-slate-800 space-y-0.5">
                <div className="flex justify-between text-[11px] font-bold text-slate-200">
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
                    const updated = { ...powerSplit, [row.key]: Number(e.target.value) };
                    setPowerSplit(updated);
                    onUpdateCampaign({ ecoPowerSplit: updated });
                  }}
                  className={`w-full cursor-pointer ${row.color}`}
                />
              </div>
            ))}

            {stormStep < 4 && (
              <div className="space-y-1">
                <div className="h-2 rounded-full bg-slate-900 border border-slate-700 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all duration-100"
                    style={{ width: `${Math.round(((10000 - stormRemainMs) / 10000) * 100)}%` }}
                  />
                </div>
                {tradeOffChoice === 'farm_only' && !stormDefenseActive && (
                  <p className="text-[11px] text-rose-300 font-hud font-bold">
                    {tr(language, 'Seal blast door, set Shield ≥ 45%, ECLSS ≥ 30%, Total ≤ 100%!', 'أغلق البوابة واضبط الدروع ≥ 45% والمياه ≥ 30% والمجموع ≤ 100%!')}
                  </p>
                )}
              </div>
            )}
          </div>
        }
        primaryCta={
          stormStep < 4 ? (
            !stormDefenseActive ? (
              <button
                type="button"
                onClick={() => {
                  if (!blastDoorSealed || powerSplit.shield < 45 || powerSplit.water < 30 || totalPower > 100) {
                    soundManager.playAlertSiren();
                    setTradeOffChoice('farm_only');
                    return;
                  }
                  soundManager.playClick();
                  setTradeOffChoice('shield_o2');
                  setStormDefenseActive(true);
                }}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-hud font-black text-xs sm:text-sm cursor-pointer border-2 border-white"
              >
                {tr(language, 'Start 10s Storm Defense & Hold Shield! 🛡️', 'ابدأ صمود العاصفة (10 ثوانٍ) 🛡️')}
              </button>
            ) : (
              <div className="py-2 rounded-xl bg-cyan-950/80 border border-cyan-400 text-xs font-hud font-bold text-center text-cyan-200">
                {blastDoorSealed && powerSplit.shield >= 45 && powerSplit.water >= 30 && totalPower <= 100
                  ? tr(language, '🛡️ Shield holding steady against CME plasma burst!', '🛡️ الدرع يصد العاصفة الشمسية بنجاح!')
                  : tr(language, '⚠️ Restore Shield ≥45%, ECLSS ≥30%, Total ≤100% & Seal Door!', '⚠️ أعد ضبط الطاقة وأغلق البوابة!')}
              </div>
            )
          ) : (
            <div className="py-2 rounded-xl bg-emerald-950/85 border border-emerald-400 text-center text-xs font-hud font-black text-emerald-200">
              {tr(language, '✅ Lunar Base Safe — Solar Storm Deflected!', '✅ القاعدة آمنة — تم صد العاصفة الشمسية!')}
            </div>
          )
        }
      />
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
      <StationLandscapeFrame
        accentBorderClass="border-indigo-400/70"
        roboTip={tr(
          language,
          'Assemble all 5 pressurized Artemis xEMU parts and pack 4 geology tools!',
          'ركّب أجزاء بدلة القمر الخمسة واحزم الأدوات الجيولوجية الأربع!'
        )}
        leftStage={
          <div className="flex-1 min-h-0 flex flex-col justify-between gap-1.5 overflow-hidden">
            <div className="px-2 py-1 rounded-xl bg-cyan-950/60 border border-cyan-400/50 text-[10.5px] text-cyan-100 leading-snug shrink-0">
              🦺 {tr(language, 'EVA Artemis xEMU keeps 4.3 PSI outside on the Moon!', 'بدلة xEMU تحفظ ضغط 4.3 PSI خارج القمر!')}
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto space-y-1">
              <div className="text-[11px] font-hud font-black text-cyan-200">
                {tr(language, `Part A: xEMU Suit (${suitParts.length}/${partASuit.length})`, `أ: البدلة (${suitParts.length}/${partASuit.length})`)}
              </div>
              {partASuit.map((p) => {
                const ok = suitParts.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggleSuit(p.id)}
                    className={`w-full p-1.5 rounded-xl border-2 font-hud font-bold text-[11px] cursor-pointer ${
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
        }
        rightHeader={
          <div className="text-xs font-hud font-black text-amber-300">
            {tr(language, `Part B: Pack 4 Scientific Tools (${packedTools.length}/4)`, `ب: حزم الأدوات العلمية الأربع (${packedTools.length}/4)`)}
          </div>
        }
        rightContent={
          <div className="grid grid-cols-2 gap-1.5 my-auto">
            {EVA_TOOLS.map((tool) => {
              const packed = packedTools.includes(tool.id);
              return (
                <button
                  key={tool.id}
                  type="button"
                  data-testid={`pack-tool-${tool.id}`}
                  onClick={() => toggleTool(tool.id)}
                  className={`p-2 rounded-xl border-2 flex items-center justify-between gap-1.5 cursor-pointer ${
                    packed
                      ? 'bg-emerald-950 border-emerald-400 text-white'
                      : 'bg-slate-800 border-amber-400/60 text-slate-200'
                  }`}
                >
                  <div className={`flex items-center gap-1.5 min-w-0 ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                    <span className="text-xl shrink-0">{tool.icon}</span>
                    <div className="min-w-0">
                      <p className="font-hud font-black text-xs truncate">{tr(language, tool.nameEn, tool.nameAr)}</p>
                      <p className="font-hud text-[10px] text-cyan-200 truncate">{tr(language, tool.purposeEn, tool.purposeAr)}</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-hud font-black text-amber-300 shrink-0">
                    {packed ? '✅' : '+'}
                  </span>
                </button>
              );
            })}
          </div>
        }
        primaryCta={
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
                  tr(language, 'Suit ready — remember to pack all 4 tools before sampling!', 'البدلة جاهزة لكن تذكر حزم كل الأدوات!')
                );
              }
              onJumpToRoom('lunar_exploration_zone', 'l3_lunar_samples');
            }}
            className={`w-full py-2.5 rounded-xl font-hud font-black text-xs sm:text-sm border-2 ${
              partAReady
                ? 'bg-gradient-to-r from-indigo-400 to-cyan-400 text-slate-950 border-white cursor-pointer'
                : 'bg-slate-800 text-slate-400 border-slate-700 cursor-not-allowed'
            }`}
          >
            {all4ToolsPacked
              ? tr(language, 'Step Out onto the Moon 👨‍🚀', 'تأكيد البدلة والأدوات ← سطح القمر 👨‍🚀')
              : tr(language, 'Exit to Moon (Pack all 4 tools recommended) 👨‍🚀', 'اخرج لسطح القمر الآن 👨‍🚀')}
          </button>
        }
      />
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
      <StationLandscapeFrame
        accentBorderClass="border-slate-400/70"
        roboTip={tr(
          language,
          'Visit each crater site and collect Basalt, Regolith & Pebbles using your tools!',
          'زر مواقع القمر الثلاث واجمع عينات البازلت والريجوليث والحصى بأدواتك!'
        )}
        leftStage={
          <div className="flex-1 min-h-0 flex flex-col justify-between gap-1.5 overflow-hidden">
            <div className="px-2 py-1.5 rounded-xl bg-slate-950 border border-cyan-500/40 flex items-center justify-between gap-1.5 text-[11px] shrink-0">
              <span className="font-hud font-black text-cyan-200">
                {tr(language, `🌕 0.16G • O2: ${suitO2}%`, `🌕 0.16G • أكسجين: ${suitO2}%`)}
              </span>
              <span className="font-hud font-bold text-amber-300 truncate">
                {tr(language, `Tools: ${campaign.l3PackedTools.length}/4`, `الأدوات: ${campaign.l3PackedTools.length}/4`)}
              </span>
            </div>

            {missingToolError && (
              <div className="p-2 rounded-xl bg-rose-950 border border-rose-400 text-rose-100 flex items-center justify-between gap-2 text-[11px] shrink-0">
                <div className="flex items-center gap-1.5 font-hud font-bold min-w-0">
                  <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0" />
                  <span className="line-clamp-2">{missingToolError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => onJumpToRoom('fitness_room', 'l3_resistance_training')}
                  className="px-2.5 py-1 rounded-lg bg-amber-400 text-slate-950 font-hud font-black text-[10px] cursor-pointer flex items-center gap-1 shrink-0"
                >
                  <Wrench className="w-3 h-3" />
                  <span>{tr(language, 'Tool Rack 🎒', 'الأدوات 🎒')}</span>
                </button>
              </div>
            )}

            <div className="flex-1 min-h-0 rounded-xl bg-slate-950/90 border border-slate-700 p-2 flex flex-col justify-between gap-1">
              <div className="flex items-center justify-between text-[10.5px] font-hud font-bold text-slate-300 shrink-0">
                <span>{tr(language, '🌑 0.16G Lunar Crater LIDAR', '🌑 مستشعر غبار فوهة القمر 0.16G')}</span>
                <span className="text-amber-300">{tr(language, `${collectedSamples.length}/3 Sealed`, `${collectedSamples.length}/3 عينات`)}</span>
              </div>
              <canvas ref={craterCanvasRef} width={380} height={84} className="w-full flex-1 min-h-[80px] rounded-lg object-cover" />
            </div>
          </div>
        }
        rightHeader={
          <div className="text-xs font-hud font-black text-slate-200">
            {tr(language, `🪨 Lunar Crater Sampling Sites (${collectedSamples.length}/3)`, `🪨 مواقع جمع عينات القمر (${collectedSamples.length}/3)`)}
          </div>
        }
        rightContent={
          <div className="space-y-1.5 my-auto">
            {LUNAR_SITES.map((site) => {
              const collected = collectedSamples.includes(site.sampleId);
              return (
                <div
                  key={site.sampleId}
                  className={`p-2 rounded-xl border-2 flex items-center justify-between gap-2 ${
                    collected ? 'bg-emerald-950 border-emerald-400' : 'bg-slate-800 border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-2xl shrink-0">{site.icon}</span>
                    <div className="min-w-0">
                      <p className="font-hud font-black text-xs text-white truncate">{tr(language, site.nameEn, site.nameAr)}</p>
                      <p className="font-hud text-[10.5px] text-amber-200 truncate">
                        {collected
                          ? `📝 ${tr(language, site.observationEn, site.observationAr)}`
                          : tr(language, `Tool: ${site.requiredToolEn}`, `الأداة: ${site.requiredToolAr}`)}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={collected}
                    onClick={() => tryCollectSite(site)}
                    className={`px-3 py-1.5 rounded-lg font-hud font-black text-[11px] shrink-0 ${
                      collected
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-cyan-500 text-slate-950 cursor-pointer hover:brightness-110'
                    }`}
                  >
                    {collected ? tr(language, 'Logged ✅', 'تم الجمع ✅') : tr(language, 'Collect 🪨', 'اجمع 🪨')}
                  </button>
                </div>
              );
            })}
          </div>
        }
        primaryCta={
          loggedObservations ? (
            campaign.l3ReturnAuthorized ? (
              <button
                type="button"
                data-testid="mission-next-level-btn"
                onClick={() => {
                  soundManager.playClick();
                  onNextLevel();
                }}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-300 to-emerald-400 text-slate-950 font-hud font-black text-xs sm:text-sm border-2 border-white cursor-pointer"
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
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-300 to-orange-400 text-slate-950 font-hud font-black text-xs sm:text-sm border-2 border-white shadow cursor-pointer"
              >
                {tr(language, '🚀 Authorize Earth Return & Unlock Level 4 🌍', '🚀 اعتماد تصريح العودة وفتح المرحلة 4 🌍')}
              </button>
            )
          ) : (
            <button
              type="button"
              disabled={!all3Collected}
              onClick={finishSamples}
              className={`w-full py-2.5 rounded-xl font-hud font-black text-xs sm:text-sm border-2 ${
                all3Collected
                  ? 'bg-gradient-to-r from-emerald-400 to-cyan-500 text-slate-950 border-white cursor-pointer'
                  : 'bg-slate-800 text-slate-400 border-slate-700 cursor-not-allowed'
              }`}
            >
              {tr(language, `Log Samples & Seal Container (${collectedSamples.length}/3)`, `تسجيل العينات وإغلاق الحاوية (${collectedSamples.length}/3)`)}
            </button>
          )
        }
      />
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
    <StationLandscapeFrame
      accentBorderClass="border-purple-400/75"
      roboTip={tr(
        language,
        'Review Moon mission telemetry and authorize Orion Trans-Earth Injection!',
        'راجع نتائج القمر واعتمد إذن العودة إلى كوكب الأرض!'
      )}
      leftStage={
        <div className="flex-1 min-h-0 flex flex-col justify-center gap-2 p-1">
          <div className="flex items-center gap-2 text-sm font-hud font-black text-white">
            <ShieldAlert className="w-5 h-5 text-amber-300 shrink-0" />
            <span>{tr(language, 'Lunar Command Auth', 'إذن قيادة القمر')}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950 border border-emerald-400/60 flex justify-between text-xs font-hud font-black">
            <span className="text-emerald-300">{tr(language, '💪 Bone Score', '💪 العظام والعضلات')}</span>
            <span className="text-white">{campaign.l3BoneMuscleScore || (campaign.completedMiniGames.includes('l3_resistance_training') ? 100 : 60)}%</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950 border border-cyan-400/60 flex justify-between text-xs font-hud font-black">
            <span className="text-cyan-300">{tr(language, '🪨 Samples Stowed', '🪨 عينات القمر')}</span>
            <span className="text-white">{campaign.l3CollectedSamples.length} / 3</span>
          </div>
        </div>
      }
      rightContent={
        <div className="my-auto p-3 rounded-2xl bg-slate-950/85 border border-purple-400/50 text-center space-y-2">
          <p className="font-hud font-black text-sm text-amber-300">
            {all5Complete ? tr(language, 'All Lunar Outpost Missions Complete ✅', 'المهام القمرية مكتملة ✅') : tr(language, 'Complete Outpost Missions First 🔒', 'أكمل مهام القمر أولاً 🔒')}
          </p>
          <p className="text-xs text-slate-200">
            {tr(
              language,
              'All lunar systems & samples verified for Orion return trajectory.',
              'تم التحقق من كل الأنظمة وعينات القمر لإطلاق رحلة العودة.'
            )}
          </p>
        </div>
      }
      primaryCta={
        campaign.l3ReturnAuthorized ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onNextLevel}
              data-testid="mission-next-level-btn"
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-300 via-teal-300 to-cyan-300 text-slate-950 font-hud font-black text-xs sm:text-sm border-2 border-white cursor-pointer"
            >
              {tr(language, 'Mission Complete! Board Orion Home 🚀', 'انطلق للمرحلة الرابعة 🌍🚀')}
            </button>
            <button
              type="button"
              onClick={onBackToLevel}
              className="px-4 py-2.5 rounded-xl bg-slate-800 text-white font-hud font-bold text-xs border border-cyan-400 cursor-pointer"
            >
              {tr(language, 'Back', 'رجوع')}
            </button>
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
            className={`w-full py-2.5 rounded-xl font-hud font-black text-xs sm:text-sm border-2 ${
              all5Complete
                ? 'bg-gradient-to-r from-purple-500 to-emerald-500 text-white border-white cursor-pointer'
                : 'bg-slate-800 text-slate-400 border-slate-700 cursor-not-allowed'
            }`}
          >
            {tr(language, 'INITIATE RETURN TO EARTH 🚀', 'اعتماد انطلاق رحلة العودة للأرض 🚀')}
          </button>
        )
      }
    />
  );
};
