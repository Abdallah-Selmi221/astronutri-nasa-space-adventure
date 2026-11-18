import React, { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { CampaignProgressState, LunarSampleId, MiniGameId } from '../../types/game';
import { useGameState } from '../../context/GameContext';
import { tr } from '../../utils/i18n';
import { NASA_OSDR_METRICS } from '../../services/nasa/nasaOSDR';
import { BodyTelemetryMeters } from './BodyTelemetryMeters';
import { soundManager } from '../../utils/sound';
import { dialogueManager } from '../../utils/geminiTTS';
import { AlertTriangle, CheckCircle2, Flame, Navigation, Radio, ShieldCheck, Wrench } from 'lucide-react';
import { computeCrossStageEffects } from '../../utils/consequences';

interface Level4Props {
  miniGameId: MiniGameId;
  campaign: CampaignProgressState;
  onCompleteMiniGame: (id: MiniGameId, patch?: Partial<CampaignProgressState>) => void;
  onBackToLevel: () => void;
  onBackToWorldMap: () => void;
}

const SAMPLE_LABELS: Record<LunarSampleId, { nameEn: string; nameAr: string; icon: string }> = {
  basalt_rock: { nameEn: 'Lunar Basalt Rock', nameAr: 'صخور البازلت القمرية', icon: '🪨' },
  regolith_dust: { nameEn: 'Lunar Regolith Soil', nameAr: 'عينات تربة الريجوليث', icon: '🌫️' },
  crater_pebbles: { nameEn: 'Crater Rim Pebbles', nameAr: 'حصى فوهات القمر', icon: '🌑' }
};

type FaultType = 'power_drop' | 'comms_noise' | 'life_support';

interface FaultSpec {
  id: FaultType;
  titleEn: string;
  titleAr: string;
  symptomEn: string;
  symptomAr: string;
  correctToolId: 'breaker' | 'antenna' | 'scrubber';
  tools: Array<{ id: 'breaker' | 'antenna' | 'scrubber'; labelEn: string; labelAr: string; icon: string }>;
}

const FAULT_SCENARIOS: FaultSpec[] = [
  {
    id: 'power_drop',
    titleEn: 'Main Power Bus Voltage Drop',
    titleAr: 'هبوط جهد حزمة الطاقة الرئيسية',
    symptomEn: 'Battery Bus B voltage dropped to 18V right after Trans-Earth Injection!',
    symptomAr: 'انخفض الفولت في البطارية B إلى 18V بعد مغادرة المدار القمري!',
    correctToolId: 'breaker',
    tools: [
      { id: 'breaker', labelEn: 'Backup Power Breaker', labelAr: 'قاطع الطاقة الاحتياطي', icon: '⚡' },
      { id: 'antenna', labelEn: 'Radio Dish Calibrator', labelAr: 'معاير هوائي الراديو', icon: '📡' },
      { id: 'scrubber', labelEn: 'CO2 Scrubber Cartridge', labelAr: 'فلتر ثاني أكسيد الكربون', icon: '🫧' }
    ]
  },
  {
    id: 'comms_noise',
    titleEn: 'Deep Space Antenna Interference',
    titleAr: 'تشويش في إشارة العودة الأرضية',
    symptomEn: 'Engine vibration misaligned the high-gain dish; Telemetry signal is noisy.',
    symptomAr: 'انحرف الطبق الهوائي بسبب ارتداد المحرك ويحتاج إعادة معايرة.',
    correctToolId: 'antenna',
    tools: [
      { id: 'breaker', labelEn: 'Backup Power Breaker', labelAr: 'قاطع الطاقة الاحتياطي', icon: '⚡' },
      { id: 'antenna', labelEn: 'Radio Dish Calibrator', labelAr: 'معاير هوائي الراديو', icon: '📡' },
      { id: 'scrubber', labelEn: 'CO2 Scrubber Cartridge', labelAr: 'فلتر ثاني أكسيد الكربون', icon: '🫧' }
    ]
  },
  {
    id: 'life_support',
    titleEn: 'Cabin CO2 Buildup Warning',
    titleAr: 'تحذير تراكم CO2 في الكبسولة',
    symptomEn: 'CO2 partial pressure climbed inside Orion crew cabin and needs valve swap.',
    symptomAr: 'ارتفع مؤشر ثاني أكسيد الكربون في غرفة الطاقم ويحتاج تبديل الصمام.',
    correctToolId: 'scrubber',
    tools: [
      { id: 'breaker', labelEn: 'Backup Power Breaker', labelAr: 'قاطع الطاقة الاحتياطي', icon: '⚡' },
      { id: 'antenna', labelEn: 'Radio Dish Calibrator', labelAr: 'معاير هوائي الراديو', icon: '📡' },
      { id: 'scrubber', labelEn: 'CO2 Scrubber Cartridge', labelAr: 'فلتر ثاني أكسيد الكربون', icon: '🫧' }
    ]
  }
];

const DeparturePrepGame: React.FC<{
  campaign: CampaignProgressState;
  onComplete: () => void;
}> = ({ campaign, onComplete }) => {
  const { language } = useGameState();
  const rawCollected = campaign.l3CollectedSamples || [];
  const sampleItems = (rawCollected.length > 0 ? rawCollected : (['basalt_rock', 'regolith_dust', 'crater_pebbles'] as LunarSampleId[])).map(
    (sid) => ({
      id: sid,
      massKg: sid === 'basalt_rock' ? 22 : sid === 'regolith_dust' ? 16 : 18,
      info: SAMPLE_LABELS[sid]
    })
  );
  const [bayAssignment, setBayAssignment] = useState<Record<string, 'left' | 'right'>>({});
  const [inlineFaultFixed, setInlineFaultFixed] = useState<boolean>(
    campaign.completedMiniGames.includes('l4_departure_prep') ||
      campaign.completedMiniGames.includes('l4_spacecraft_emergency')
  );

  const leftMassKg = sampleItems.reduce((s, item) => s + (bayAssignment[item.id] === 'left' ? item.massKg : 0), 0);
  const rightMassKg = sampleItems.reduce((s, item) => s + (bayAssignment[item.id] === 'right' ? item.massKg : 0), 0);
  const assignedCount = sampleItems.filter((item) => bayAssignment[item.id]).length;
  const totalSampleKg = leftMassKg + rightMassKg;
  const varianceKg = Math.abs(leftMassKg - rightMassKg);
  const comBalanced = assignedCount === sampleItems.length && totalSampleKg <= 100 && varianceKg <= 15;
  const allReady = comBalanced && inlineFaultFixed;
  const comCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = comCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let rafId = 0;
    const t0 = performance.now();
    let smoothTiltRad = 0;

    const renderFrame = () => {
      rafId = window.requestAnimationFrame(renderFrame);
      const t = (performance.now() - t0) / 1000;
      const w = canvas.width;
      const h = canvas.height;

      // Deep aerospace blueprint telemetry backdrop + grid
      const bg = ctx.createLinearGradient(0, 0, w, h);
      bg.addColorStop(0, '#040a1a');
      bg.addColorStop(0.5, '#0b1736');
      bg.addColorStop(1, '#050d20');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
      ctx.lineWidth = 1;
      for (let gx = 0; gx <= w; gx += 24) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, h);
        ctx.stroke();
      }
      for (let gy = 0; gy <= h; gy += 24) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(w, gy);
        ctx.stroke();
      }

      const targetTiltDeg = Math.max(-16, Math.min(16, (rightMassKg - leftMassKg) * 0.45));
      const targetRad = (targetTiltDeg * Math.PI) / 180;
      smoothTiltRad += (targetRad - smoothTiltRad) * 0.14;

      const cx = w * 0.5;
      const cy = h * 0.56;

      // Horizon zero-pitch reference line
      ctx.strokeStyle = comBalanced ? 'rgba(52, 211, 153, 0.35)' : 'rgba(251, 191, 36, 0.25)';
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(24, cy);
      ctx.lineTo(w - 24, cy);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(smoothTiltRad);

      // Animated RCS Attitude Control Thruster Plumes Firing to Counteract CoM Torque
      const fireLeftJet = leftMassKg > rightMassKg + 2 || comBalanced;
      const fireRightJet = rightMassKg > leftMassKg + 2 || comBalanced;
      const pulse = 0.75 + Math.sin(t * 22) * 0.25;

      if (fireLeftJet) {
        const jetLen = (comBalanced ? 16 : 26) * pulse;
        const jGrad = ctx.createLinearGradient(-118, 12, -118, 12 + jetLen);
        jGrad.addColorStop(0, '#fef08a');
        jGrad.addColorStop(0.5, comBalanced ? '#34d399' : '#38bdf8');
        jGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
        ctx.fillStyle = jGrad;
        ctx.beginPath();
        ctx.moveTo(-124, 11);
        ctx.lineTo(-112, 11);
        ctx.lineTo(-118, 11 + jetLen);
        ctx.closePath();
        ctx.fill();
      }

      if (fireRightJet) {
        const jetLen = (comBalanced ? 16 : 26) * pulse;
        const jGrad = ctx.createLinearGradient(118, 12, 118, 12 + jetLen);
        jGrad.addColorStop(0, '#fef08a');
        jGrad.addColorStop(0.5, comBalanced ? '#34d399' : '#38bdf8');
        jGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
        ctx.fillStyle = jGrad;
        ctx.beginPath();
        ctx.moveTo(112, 11);
        ctx.lineTo(124, 11);
        ctx.lineTo(118, 11 + jetLen);
        ctx.closePath();
        ctx.fill();
      }

      // Main Structural Service Beam & RCS Thruster Pods
      const beamGrad = ctx.createLinearGradient(-126, 0, 126, 0);
      beamGrad.addColorStop(0, '#0284c7');
      beamGrad.addColorStop(0.5, comBalanced ? '#10b981' : '#f59e0b');
      beamGrad.addColorStop(1, '#4f46e5');
      ctx.fillStyle = beamGrad;
      ctx.beginPath();
      ctx.roundRect(-126, 3, 252, 8, 4);
      ctx.fill();

      //Orion Conical Crew Module Cross-Section Hull + PICA-X Aft Heat Shield
      const hullGrad = ctx.createLinearGradient(-56, -36, 56, 8);
      hullGrad.addColorStop(0, '#1e293b');
      hullGrad.addColorStop(0.5, '#334155');
      hullGrad.addColorStop(1, '#0f172a');
      ctx.fillStyle = hullGrad;
      ctx.strokeStyle = comBalanced ? '#34d399' : '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-58, 4);
      ctx.lineTo(-22, -32);
      ctx.lineTo(22, -32);
      ctx.lineTo(58, 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // PICA-X Heat Shield Base Curvature
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.roundRect(-60, 4, 120, 6, 3);
      ctx.fill();

      // Left (Port) & Right (Starboard) Cargo Bay Lock Cells
      const leftLocks = sampleItems.filter((i) => bayAssignment[i.id] === 'left');
      const rightLocks = sampleItems.filter((i) => bayAssignment[i.id] === 'right');

      // Port Bay Lock Frame
      ctx.fillStyle = 'rgba(2, 132, 199, 0.22)';
      ctx.strokeStyle = leftLocks.length > 0 ? '#38bdf8' : '#475569';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.roundRect(-116, -22, 52, 23, 5);
      ctx.fill();
      ctx.stroke();

      leftLocks.forEach((_, idx) => {
        ctx.fillStyle = comBalanced ? '#34d399' : '#38bdf8';
        ctx.beginPath();
        ctx.roundRect(-111 + idx * 15, -17, 12, 13, 3);
        ctx.fill();
      });

      // Starboard Bay Lock Frame
      ctx.fillStyle = 'rgba(79, 70, 229, 0.22)';
      ctx.strokeStyle = rightLocks.length > 0 ? '#818cf8' : '#475569';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.roundRect(64, -22, 52, 23, 5);
      ctx.fill();
      ctx.stroke();

      rightLocks.forEach((_, idx) => {
        ctx.fillStyle = comBalanced ? '#34d399' : '#818cf8';
        ctx.beginPath();
        ctx.roundRect(69 + idx * 15, -17, 12, 13, 3);
        ctx.fill();
      });

      // Dynamic Center-of-Mass (CoM) Target Reticle inside Orion Cross-Section
      const comShiftX = Math.max(-28, Math.min(28, (rightMassKg - leftMassKg) * 0.75));
      ctx.strokeStyle = comBalanced ? '#34d399' : '#fbbf24';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(comShiftX, -12, 7, 0, Math.PI * 2);
      ctx.moveTo(comShiftX - 11, -12);
      ctx.lineTo(comShiftX + 11, -12);
      ctx.moveTo(comShiftX, -23);
      ctx.lineTo(comShiftX, -1);
      ctx.stroke();

      ctx.restore();

      // Top Telemetry Readout Strip
      ctx.fillStyle = comBalanced ? '#6ee7b7' : '#fde047';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(
        language === 'ar'
          ? comBalanced
            ? '✓ اتزان مركز الكتلة وتثبيت نفاثات أوريون'
            : `نفاثات التوازن نشطة • ميل ${targetTiltDeg.toFixed(1)}°`
          : comBalanced
          ? '✓ ORION CoM LOCKED • RCS ATTITUDE TRIM STABLE'
          : `RCS ATTITUDE JETS FIRING • PITCH TRIM ${targetTiltDeg > 0 ? '+' : ''}${targetTiltDeg.toFixed(1)}°`,
        cx,
        15
      );
    };

    renderFrame();
    return () => window.cancelAnimationFrame(rafId);
  }, [leftMassKg, rightMassKg, comBalanced, bayAssignment, sampleItems, language]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-amber-950/35 border border-amber-500/35 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="font-bold text-amber-200 text-sm">
            {tr(
              language,
              `⚖️ Orion Left/Right Sample Bay Center-of-Mass Balancer (${sampleItems.length} canisters)`,
              `⚖️ موازنة مركز كتلة عينات القمر في أوريون (${sampleItems.length} حاويات)`
            )}
          </div>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-hud font-black border ${
            comBalanced ? 'bg-emerald-950 border-emerald-400 text-emerald-300' : 'bg-amber-950 border-amber-400 text-amber-200'
          }`}>
            {tr(language, `Δ ${varianceKg} kg (Target ≤ 15 kg)`, `الفرق ${varianceKg} كجم (الهدف ≤ 15 كجم)`)}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs font-hud font-black">
          <div className="p-2.5 rounded-xl bg-slate-950/80 border border-sky-400/50 text-sky-200 flex justify-between">
            <span>{tr(language, '◀ Left Cargo Bay', '◀ الجناح الأيسر')}</span>
            <span>{leftMassKg} kg</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950/80 border border-indigo-400/50 text-indigo-200 flex justify-between">
            <span>{tr(language, 'Right Cargo Bay ▶', 'الجناح الأيمن ▶')}</span>
            <span>{rightMassKg} kg</span>
          </div>
        </div>

        {/* High-Craft 60fps Orion Spacecraft Cross-Section, RCS Attitude Jets & Cargo Mass Locks Canvas */}
        <div className="relative rounded-xl bg-slate-950 border border-cyan-500/35 overflow-hidden shadow-inner">
          <canvas
            ref={comCanvasRef}
            width={340}
            height={102}
            data-testid="orion-com-canvas"
            className="w-full h-28 sm:h-32 block"
          />
        </div>

        <div className="space-y-2">
          {sampleItems.map((item) => {
            const side = bayAssignment[item.id];
            return (
              <div
                key={item.id}
                className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-700 flex flex-wrap items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2 text-xs font-bold text-white">
                  <span className="text-lg">{item.info?.icon || '🪨'}</span>
                  <span>{item.info ? tr(language, item.info.nameEn, item.info.nameAr) : item.id}</span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-amber-300">{item.massKg} kg</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      soundManager.playClick();
                      setBayAssignment((prev) => ({ ...prev, [item.id]: 'left' }));
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-hud font-black cursor-pointer ${
                      side === 'left' ? 'bg-sky-400 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {tr(language, 'Left Bay', 'يسار')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      soundManager.playClick();
                      setBayAssignment((prev) => ({ ...prev, [item.id]: 'right' }));
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-hud font-black cursor-pointer ${
                      side === 'right' ? 'bg-indigo-400 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {tr(language, 'Right Bay', 'يمين')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Phase 2: Embedded Spacecraft Emergency Circuit Breaker Repair */}
      <div className="rounded-2xl border-2 border-rose-400/50 bg-slate-950/75 p-3 space-y-2">
        <div className="flex items-center justify-between text-xs font-hud font-black">
          <span className="text-rose-200">
            🔧 {tr(language, 'Phase 2: In-Flight Fault Diagnostic & Circuit Breaker', 'المرحلة 2: تشخيص العطل وإصلاح قاطع الدائرة')}
          </span>
          <span className={inlineFaultFixed ? 'text-emerald-300' : 'text-amber-300'}>
            {inlineFaultFixed ? tr(language, 'Breaker Fixed ✓', 'تم الإصلاح ✓') : tr(language, 'Resolve Fault Below', 'أصلح العطل بالأسفل')}
          </span>
        </div>
        {!inlineFaultFixed && (
          <EmergencyRepairGame onComplete={() => setInlineFaultFixed(true)} />
        )}
      </div>

      <button
        type="button"
        onClick={() => {
          if (!allReady) return;
          soundManager.playDropSuccess();
          dialogueManager.speak(
            tr(
              language,
              'Lunar sample bay balanced and spacecraft fault resolved! Ready for Earth corridor!',
              'تم اتزان عينات القمر وإصلاح العطل بنجاح! مستعدون للعودة إلى الأرض!'
            )
          );
          onComplete();
        }}
        disabled={!allReady}
        className={`w-full py-3.5 rounded-2xl font-black text-base transition-all ${
          allReady
            ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg cursor-pointer'
            : 'bg-slate-800 text-slate-500 cursor-not-allowed'
        }`}
      >
        {allReady
          ? tr(language, 'Confirm Balanced Payload & Launch Home →', 'تأكيد اتزان الحمولة والعودة للأرض ←')
          : tr(language, 'Balance Left/Right Bays (Δ ≤ 15 kg) & Fix Fault 🔒', 'وازن الجناحين (فرق ≤ 15 كجم) وأصلح العطل 🔒')}
      </button>
    </div>
  );
};

const NavigationEarthGame: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const { language } = useGameState();
  const [headingDeg, setHeadingDeg] = useState(-14);
  const [delayState, setDelayState] = useState<'idle' | 'transmitting' | 'confirmed'>('idle');
  const [delayMsElapsed, setDelayMsElapsed] = useState(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
    };
  }, []);

  const inCorridor = Math.abs(headingDeg) <= 4;

  const handleSendDsnSignal = () => {
    if (!inCorridor || delayState === 'transmitting') return;
    soundManager.playClick();
    setDelayState('transmitting');
    setDelayMsElapsed(0);
    const start = Date.now();
    timerRef.current = window.setInterval(() => {
      const diff = Date.now() - start;
      setDelayMsElapsed(Math.min(1300, diff));
      if (diff >= 1300) {
        if (timerRef.current !== null) window.clearInterval(timerRef.current);
        timerRef.current = null;
        setDelayState('confirmed');
        soundManager.playDropSuccess();
        dialogueManager.speak(
          tr(
            language,
            'Earth control received your Deep Space Network signal after 1.3s light delay! Trajectory locked!',
            'استقبل مركز الأرض الإشارة بعد 1.3 ثانية! مسار العودة مضبوط بدقة!'
          )
        );
      }
    }, 60);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-indigo-950/45 border border-indigo-400/35 p-4 space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-indigo-200">
          <span className="flex items-center gap-1.5">
            <Navigation className="w-4 h-4 text-sky-400" />
            {tr(language, 'Align Earth Re-Entry Corridor (Target: -4° to +4°)', 'ضبط زاوية مسار العودة إلى الأرض (الهدف: بين -4° و +4°)')}
          </span>
          <span className={inCorridor ? 'text-emerald-300' : 'text-amber-300'}>
            {tr(language, 'Heading:', 'الزاوية الحالية:')} {headingDeg > 0 ? `+${headingDeg}°` : `${headingDeg}°`}
          </span>
        </div>

        <input
          type="range"
          min={-25}
          max={25}
          step={1}
          value={headingDeg}
          onChange={(e) => {
            setHeadingDeg(Number(e.target.value));
            if (delayState === 'confirmed') setDelayState('idle');
          }}
          className="w-full accent-sky-400 cursor-pointer"
        />

        <div className="relative h-14 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between px-4 overflow-hidden">
          <span className="text-2xl">🌕</span>
          <div className="flex-1 mx-3 h-1.5 bg-slate-800 rounded-full relative">
            <div
              className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full transition-all shadow ${
                inCorridor ? 'bg-emerald-400 shadow-emerald-400/50' : 'bg-amber-400'
              }`}
              style={{ left: '50%', transform: `translate(-50%, calc(-50% + ${headingDeg * 0.9}px))` }}
            />
          </div>
          <span className="text-2xl">🌍</span>
        </div>
      </div>

      <div className="rounded-2xl bg-slate-900/80 border border-sky-500/30 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-sky-200">
            <Radio className="w-4 h-4 text-sky-400" />
            {tr(
              language,
              'Deep Space Light-Delay Test (384,400 km / c = 1.3s)',
              'اختبار تأخير الاتصال الفضائي (384,400 كم ÷ سرعة الضوء = 1.3 ثانية)'
            )}
          </div>
          <span className="text-xs font-mono text-sky-300">{(delayMsElapsed / 1000).toFixed(2)}s / 1.30s</span>
        </div>
        <div className="h-2.5 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
          <div
            className="h-full bg-gradient-to-r from-sky-400 to-emerald-400 transition-all duration-75"
            style={{ width: `${(delayMsElapsed / 1300) * 100}%` }}
          />
        </div>
        <button
          type="button"
          onClick={handleSendDsnSignal}
          disabled={!inCorridor || delayState === 'transmitting'}
          className={`w-full py-3 rounded-xl font-bold text-sm transition-all cursor-pointer ${
            inCorridor
              ? 'bg-sky-600 hover:bg-sky-500 text-white'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
          }`}
        >
          {delayState === 'transmitting'
            ? tr(language, '📡 Transmitting signal across 384,400 km (1.3s)...', '📡 جاري إرسال الإشارة عبر الفضاء (1.3 ثانية)...')
            : delayState === 'confirmed'
            ? tr(language, '✅ Earth Control Confirmed Trajectory!', '✅ تم استلام رد مركز التحكم الأرضي!')
            : tr(language, 'Transmit Earth Return Coordinates', 'إرسال إحداثيات العودة لمركز الأرض')}
        </button>
      </div>

      <button
        type="button"
        disabled={delayState !== 'confirmed'}
        onClick={onComplete}
        className={`w-full py-3.5 rounded-2xl font-black text-base transition-all ${
          delayState === 'confirmed'
            ? 'bg-gradient-to-r from-emerald-500 to-sky-600 text-white shadow-lg cursor-pointer'
            : 'bg-slate-800 text-slate-500 cursor-not-allowed'
        }`}
      >
        {tr(language, 'Lock Earth Return Trajectory →', 'تثبيت مسار العودة إلى الأرض ←')}
      </button>
    </div>
  );
};

const EmergencyRepairGame: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const { language } = useGameState();
  const [faultIdx, setFaultIdx] = useState(0);
  const [faultDiagnosed, setFaultDiagnosed] = useState(false);
  const [faultFixed, setFaultFixed] = useState(false);
  const [wrongMsg, setWrongMsg] = useState<string | null>(null);

  const fault = FAULT_SCENARIOS[faultIdx % FAULT_SCENARIOS.length];

  const handlePickTool = (toolId: string) => {
    if (!faultDiagnosed) return;
    if (toolId === fault.correctToolId) {
      setWrongMsg(null);
      soundManager.playDropSuccess();
      setFaultFixed(true);
      dialogueManager.speak(
        tr(
          language,
          'Great fix! Spacecraft fault stabilized cleanly with the right tool!',
          'رائع! تم تشخيص العطل وإصلاحه بأداة الصيانة الصحيحة واستقرت المركبة!'
        )
      );
    } else {
      soundManager.playCautionBeep();
      setWrongMsg(
        tr(
          language,
          '⚠️ Wrong repair tool! Read the diagnostic report carefully and pick the matching fix.',
          '⚠️ هذه الأداة لا تناسب هذا العطل! اقرأ التشخيص واختر الأداة المطابقة.'
        )
      );
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-rose-950/45 border border-rose-500/45 p-4 flex items-start gap-3">
        <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
        <div className="space-y-1 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-black text-rose-200 text-base">{tr(language, fault.titleEn, fault.titleAr)}</h4>
            <button
              type="button"
              onClick={() => {
                setFaultIdx((i) => (i + 1) % FAULT_SCENARIOS.length);
                setFaultDiagnosed(false);
                setFaultFixed(false);
                setWrongMsg(null);
              }}
              className="text-xs px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 hover:bg-slate-800 cursor-pointer"
            >
              {tr(language, 'Next Fault ↻', 'تجربة عطل آخر ↻')}
            </button>
          </div>
          <p className="text-xs text-rose-100/90 leading-relaxed">{tr(language, fault.symptomEn, fault.symptomAr)}</p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => {
          soundManager.playClick();
          setFaultDiagnosed(true);
        }}
        className={`w-full py-3 rounded-2xl border font-bold text-sm transition-all cursor-pointer ${
          faultDiagnosed
            ? 'bg-emerald-950/60 border-emerald-400 text-emerald-200'
            : 'bg-amber-600 hover:bg-amber-500 border-amber-400 text-white'
        }`}
      >
        {faultDiagnosed
          ? tr(language, '✅ Step 1: Circuit Scanned & Fault Located', '✅ الخطوة 1: تم فحص الدائرة وتحديد مكان العطل')
          : tr(language, '🔍 Step 1: Run Diagnostic Scanner', '🔍 الخطوة 1: تشغيل جهاز تشخيص الأعطال')}
      </button>

      <div className="space-y-2">
        <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
          <Wrench className="w-4 h-4 text-amber-400" />
          {tr(language, 'Step 2: Select the matching repair tool:', 'الخطوة 2: اختر أداة الصيانة المناسبة من غرفة المعدات:')}
        </div>
        {wrongMsg && <div className="text-xs font-bold text-rose-300">{wrongMsg}</div>}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {fault.tools.map((t) => (
            <button
              key={t.id}
              type="button"
              disabled={!faultDiagnosed || faultFixed}
              onClick={() => handlePickTool(t.id)}
              className={`p-3.5 rounded-2xl border-2 text-center transition-all ${
                faultFixed && t.id === fault.correctToolId
                  ? 'bg-emerald-950/75 border-emerald-400 text-white'
                  : faultDiagnosed
                  ? 'bg-slate-900/80 border-slate-700 hover:border-amber-400 text-slate-100 cursor-pointer'
                  : 'bg-slate-900/40 border-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <div className="text-2xl mb-1">{t.icon}</div>
              <div className="text-xs font-bold">{tr(language, t.labelEn, t.labelAr)}</div>
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        disabled={!faultFixed}
        onClick={onComplete}
        className={`w-full py-3.5 rounded-2xl font-black text-base transition-all ${
          faultFixed
            ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg cursor-pointer'
            : 'bg-slate-800 text-slate-500 cursor-not-allowed'
        }`}
      >
        {tr(language, 'Confirm Spacecraft Stability & Continue →', 'تأكيد استقرار المركبة ومتابعة الهبوط ←')}
      </button>
    </div>
  );
};

const ReentryShieldGame: React.FC<{ campaign: CampaignProgressState; onComplete: () => void }> = ({
  campaign,
  onComplete
}) => {
  const { language } = useGameState();
  const effects = computeCrossStageEffects(campaign);
  const [dsnLinked, setDsnLinked] = useState(false);
  const [tilesChecked, setTilesChecked] = useState<Record<number, boolean>>({ 0: false, 1: false, 2: false });
  const [reentryStarted, setReentryStarted] = useState(false);
  const [shieldAngle, setShieldAngle] = useState(0);
  const [reentryProgress, setReentryProgress] = useState(0);
  const [reentryError, setReentryError] = useState<string | null>(null);
  const reentryDoneRef = useRef(false);
  const plasmaCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const gLoadMetric = NASA_OSDR_METRICS.find((m) => m.id === 'osdr_reentry_gload') || NASA_OSDR_METRICS[3];
  const allTilesOk = Object.values(tilesChecked).every(Boolean);
  const inSafeZone = Math.abs(shieldAngle) <= 18;
  const reentryFinished = reentryProgress >= 100;

  useEffect(() => {
    const canvas = plasmaCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let rafId = 0;
    const startMs = performance.now();
    const render = () => {
      rafId = window.requestAnimationFrame(render);
      const t = (performance.now() - startMs) / 1000;
      const w = canvas.width;
      const h = canvas.height;
      const atmo = ctx.createLinearGradient(0, 0, 0, h);
      atmo.addColorStop(0, '#020617');
      atmo.addColorStop(0.6, '#1e1b4b');
      atmo.addColorStop(1, reentryStarted ? '#451a03' : '#0f172a');
      ctx.fillStyle = atmo;
      ctx.fillRect(0, 0, w, h);

      // Re-entry ionized plasma wind streaks & sparks
      const cx = w * 0.5;
      const cy = h * 0.54;
      const hotDanger = Math.abs(shieldAngle) > 18;
      for (let i = 0; i < 18; i++) {
        const sx = ((i * 31 + t * (reentryStarted ? 220 : 60)) % (w + 40)) - 20;
        const sy = 10 + ((i * 23) % (h - 20));
        ctx.strokeStyle = !reentryStarted
          ? 'rgba(186,230,253,0.35)'
          : hotDanger
          ? 'rgba(244,63,94,0.75)'
          : 'rgba(251,146,60,0.65)';
        ctx.lineWidth = reentryStarted ? 2 : 1.2;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx - 18, sy - 6);
        ctx.stroke();
      }

      // Multi-band PICA-X Detached Bow Shockwave Arc
      [
        { r: 50, lw: reentryStarted ? 8 + Math.sin(t * 16) * 2 : 2, col: hotDanger ? 'rgba(244,63,94,0.38)' : 'rgba(251,146,60,0.35)' },
        { r: 44, lw: reentryStarted ? 4 : 2, col: !reentryStarted ? '#38bdf8' : hotDanger ? '#fb7185' : '#fdba74' },
        { r: 40, lw: 2, col: reentryStarted ? '#fef08a' : 'rgba(125,211,252,0.6)' }
      ].forEach((band) => {
        ctx.strokeStyle = band.col;
        ctx.lineWidth = band.lw;
        ctx.beginPath();
        ctx.arc(cx, cy + 12, band.r, Math.PI * 1.12, Math.PI * 1.88);
        ctx.stroke();
      });

      // Rotated Orion Crew Module + Segmented PICA-X Heat Shield
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate((shieldAngle * Math.PI) / 180);
      const shieldGrad = ctx.createLinearGradient(-32, 0, 32, 0);
      shieldGrad.addColorStop(0, '#9a3412');
      shieldGrad.addColorStop(0.5, '#f97316');
      shieldGrad.addColorStop(1, '#7c2d12');
      ctx.fillStyle = shieldGrad;
      ctx.beginPath();
      ctx.ellipse(0, 11, 32, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      const hullGrad = ctx.createLinearGradient(-26, -24, 26, 8);
      hullGrad.addColorStop(0, '#f8fafc');
      hullGrad.addColorStop(1, '#94a3b8');
      ctx.fillStyle = hullGrad;
      ctx.beginPath();
      ctx.moveTo(-27, 8);
      ctx.lineTo(-9, -24);
      ctx.lineTo(9, -24);
      ctx.lineTo(27, 8);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(-5, -13, 10, 6);
      ctx.restore();
    };
    render();
    return () => window.cancelAnimationFrame(rafId);
  }, [shieldAngle, reentryStarted]);

  useEffect(() => {
    if (!reentryStarted || reentryFinished) return;
    const turbulenceScale = effects.crewAdaptionScore >= 80 ? 5.5 : 8.5;
    const timer = window.setInterval(() => {
      setShieldAngle((prev) => {
        const drift = (Math.random() - 0.5) * turbulenceScale;
        return Math.max(-35, Math.min(35, Math.round(prev + drift)));
      });
    }, 450);
    return () => window.clearInterval(timer);
  }, [reentryStarted, reentryFinished, effects.crewAdaptionScore]);

  useEffect(() => {
    if (!reentryStarted || reentryFinished) return;
    const ticker = window.setInterval(() => {
      setReentryProgress((prev) => {
        const delta = Math.abs(shieldAngle) <= 18 ? 6 : -3;
        const next = Math.max(0, Math.min(100, prev + delta));
        if (Math.abs(shieldAngle) > 18) {
          setReentryError(
            tr(
              language,
              '⚠️ Capsule tilted past heat shield safe margin! Steer between -18° and +18°!',
              '⚠️ الكبسولة مالت خارج زاوية الدرع الحراري! اضبطها بين -18° و +18°!'
            )
          );
        } else {
          setReentryError(null);
        }
        if (next >= 100 && !reentryDoneRef.current) {
          reentryDoneRef.current = true;
          soundManager.playDropSuccess();
          dialogueManager.speak(
            tr(
              language,
              'Plasma corridor cleared! Survived 1600°C re-entry with intact PICA-X heat shield!',
              'برافو! تجاوزنا البلازما عند 1600 درجة مئوية بأمان تام!'
            )
          );
        }
        return next;
      });
    }, 280);
    return () => window.clearInterval(ticker);
  }, [reentryStarted, reentryFinished, shieldAngle, language]);

  return (
    <div className="space-y-4">
      <BodyTelemetryMeters
        language={language}
        titleEn="4.0G Peak Re-Entry & Crew Biometrics"
        titleAr="مؤشر تحمل الجاذبية أثناء الدخول (4.0G)"
        metrics={[
          { key: 'muscle', value: inSafeZone ? 90 : 58 },
          { key: 'hydration', value: reentryFinished ? 92 : 76 }
        ]}
      />

      <div className="rounded-2xl bg-slate-900/75 border border-pink-400/30 p-3.5 text-xs text-pink-200 flex items-center justify-between gap-2">
        <span>
          🩺 <strong>{gLoadMetric.osdrCode}:</strong>{' '}
          {tr(language, 'Orion Re-Entry Biometrics — Peak G-Load: 4.0G', `${gLoadMetric.titleAr} — ذروة الجاذبية خلال الدخول 4.0G`)}
        </span>
        <span className="px-2 py-0.5 rounded-full bg-orange-950 border border-orange-500/40 text-orange-200 font-bold">
          {tr(language, 'Plasma Temp:', 'حرارة البلازما:')} {reentryStarted ? `${Math.round(800 + reentryProgress * 8)}°C` : '22°C'}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        {[0, 1, 2].map((idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => {
              soundManager.playClick();
              setTilesChecked((prev) => ({ ...prev, [idx]: true }));
            }}
            className={`p-3 rounded-2xl border-2 text-center text-xs font-bold transition-all cursor-pointer ${
              tilesChecked[idx]
                ? 'bg-emerald-950/65 border-emerald-400 text-emerald-200'
                : 'bg-slate-900/75 border-slate-700 hover:border-orange-400 text-slate-200'
            }`}
          >
            <ShieldCheck className="w-5 h-5 mx-auto mb-1 text-orange-400" />
            {tr(language, `PICA-X Tile #${idx + 1}`, `لوح PICA-X #${idx + 1}`)} {tilesChecked[idx] ? '✅' : ''}
          </button>
        ))}
      </div>

      {/* Phase 1: Inline 1.3s Deep Space Network (DSN) Trajectory Lock */}
      <div className="rounded-2xl border-2 border-indigo-400/50 bg-slate-950/80 p-3 space-y-2">
        <div className="flex items-center justify-between text-xs font-hud font-black">
          <span className="text-indigo-200">
            📡 {tr(language, 'Phase 1: 1.3s DSN Corridor Trajectory Sync', 'المرحلة 1: بث الشبكة الفضائية DSN وتثبيت المسار')}
          </span>
          <span className={dsnLinked ? 'text-emerald-300' : 'text-amber-300'}>
            {dsnLinked ? tr(language, 'DSN Vector Locked ✓', 'المسار معتمد ✓') : tr(language, 'Align ±4° & Ping', 'قم بالمحاذاة والاتصال')}
          </span>
        </div>
        {!dsnLinked && <NavigationEarthGame onComplete={() => setDsnLinked(true)} />}
      </div>

      {/* Live Plasma & PICA-X Angle Canvas */}
      <div className="rounded-2xl bg-slate-950 border border-orange-500/40 p-2.5 flex flex-col items-center gap-1.5">
        <div className="w-full flex justify-between text-[11px] font-hud font-bold px-1">
          <span className="text-orange-300">{tr(language, '🔥 Plasma Re-Entry Attitude Visualizer', '🔥 زاوية اختراق الغلاف الجوي والدرع الحراري')}</span>
          <span className="text-cyan-300">
            {tr(language, `Crew Stability Assist: ${effects.crewAdaptionScore}%`, `دعم استقرار الطاقم: ${effects.crewAdaptionScore}%`)}
          </span>
        </div>
        <canvas ref={plasmaCanvasRef} width={340} height={94} className="w-full max-w-md h-24 rounded-xl" />
      </div>

      {!reentryStarted ? (
        <button
          type="button"
          disabled={!allTilesOk || !dsnLinked}
          onClick={() => {
            soundManager.playClick();
            setReentryStarted(true);
          }}
          className={`w-full py-3.5 rounded-2xl font-black text-base transition-all ${
            allTilesOk && dsnLinked
              ? 'bg-gradient-to-r from-orange-500 to-rose-600 text-white shadow-lg cursor-pointer'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
          }`}
        >
          {tr(language, '🔥 Begin Atmospheric Re-Entry (Steer Heat Shield)', '🔥 بدء اختراق الغلاف الجوي (تحكّم بالدرع الحراري)')}
        </button>
      ) : (
        <div className="rounded-2xl bg-slate-900/85 border border-orange-500/40 p-4 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="flex items-center gap-1.5 text-orange-300">
              <Flame className="w-4 h-4" />
              {tr(language, 'Heat Shield Angle:', 'تثبيت زاوية الدرع الحراري')} ({shieldAngle > 0 ? `+${shieldAngle}°` : `${shieldAngle}°`})
            </span>
            <span className={inSafeZone ? 'text-emerald-300' : 'text-rose-300'}>
              {inSafeZone ? tr(language, '✅ Safe Corridor', '✅ داخل الممر الآمن') : tr(language, '⚠️ Hazardous Tilt', '⚠️ انحراف خطير')}
            </span>
          </div>

          <input
            type="range"
            min={-35}
            max={35}
            step={1}
            value={shieldAngle}
            onChange={(e) => setShieldAngle(Number(e.target.value))}
            className="w-full accent-orange-400 cursor-pointer"
          />

          {reentryError && <div className="text-xs font-bold text-rose-300">{reentryError}</div>}

          <div className="h-3 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-orange-400 via-amber-400 to-emerald-400 transition-all"
              style={{ width: `${reentryProgress}%` }}
            />
          </div>
          <div className="text-xs text-slate-300 text-center font-bold">
            {tr(language, `Re-Entry Progress: ${reentryProgress}%`, `تقدم اجتياز الغلاف الجوي: ${reentryProgress}%`)}
          </div>
        </div>
      )}

      <button
        type="button"
        disabled={!reentryFinished}
        onClick={onComplete}
        className={`w-full py-3.5 rounded-2xl font-black text-base transition-all ${
          reentryFinished
            ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg cursor-pointer'
            : 'bg-slate-800 text-slate-500 cursor-not-allowed'
        }`}
      >
        {tr(language, 'Proceed to Parachute Splashdown →', 'الانتقال لنشر مظلات الهبوط ←')}
      </button>
    </div>
  );
};

const SafeLandingGame: React.FC<{
  onComplete: () => void;
  onBackToLevel: () => void;
  onBackToWorldMap: () => void;
}> = ({ onComplete, onBackToLevel, onBackToWorldMap }) => {
  const { language } = useGameState();
  const [altitudeM, setAltitudeM] = useState(9600);
  const [speedMs, setSpeedMs] = useState(95);
  const [drogueDeployed, setDrogueDeployed] = useState(false);
  const [mainDeployed, setMainDeployed] = useState(false);
  const [splashdownDone, setSplashdownDone] = useState(false);
  const splashTriggeredRef = useRef(false);
  const landingCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = landingCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let rafId = 0;
    const startMs = performance.now();
    const render = () => {
      rafId = window.requestAnimationFrame(render);
      const t = (performance.now() - startMs) / 1000;
      const w = canvas.width;
      const h = canvas.height;
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, '#082f49');
      sky.addColorStop(0.55, '#0284c7');
      sky.addColorStop(0.78, '#7dd3fc');
      sky.addColorStop(1, '#0369a1');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);

      // Soft horizon cloud bank silhouettes
      ctx.fillStyle = 'rgba(248, 250, 252, 0.25)';
      [0.2, 0.72].forEach((cf, idx) => {
        const cx = ((w * cf + t * (6 + idx * 3)) % (w + 60)) - 30;
        const cy = 24 + idx * 14;
        ctx.beginPath();
        ctx.arc(cx, cy, 12, 0, Math.PI * 2);
        ctx.arc(cx + 12, cy - 3, 14, 0, Math.PI * 2);
        ctx.arc(cx + 24, cy, 11, 0, Math.PI * 2);
        ctx.fill();
      });

      // Multi-layer sinusoidal Pacific Ocean swells + whitecrest foam
      const oceanY = h - 24;
      const seaGrad = ctx.createLinearGradient(0, oceanY, 0, h);
      seaGrad.addColorStop(0, '#0ea5e9');
      seaGrad.addColorStop(1, '#0c4a6e');
      ctx.fillStyle = seaGrad;
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let x = 0; x <= w; x += 10) {
        const wy = oceanY + Math.sin(x * 0.06 + t * 3.8) * 3;
        ctx.lineTo(x, wy);
      }
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = 'rgba(224, 242, 254, 0.85)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 10) {
        const wy = oceanY + Math.sin(x * 0.06 + t * 3.8) * 3;
        if (x === 0) ctx.moveTo(x, wy);
        else ctx.lineTo(x, wy);
      }
      ctx.stroke();

      const progressFrac = Math.max(0, Math.min(1, 1 - altitudeM / 9600));
      const capY = 30 + progressFrac * (oceanY - 40);
      const capX = w * 0.5 + Math.sin(t * 2.4) * (mainDeployed ? 4 : 8);

      // Draw Segmented Orange-and-White Gore Tri-Chutes + Shroud Rigging
      if (mainDeployed) {
        [-19, 0, 19].forEach((ox, idx) => {
          const cxCh = capX + ox;
          const cyCh = capY - 26 - (idx === 1 ? 4 : 0);
          ctx.strokeStyle = 'rgba(226, 232, 240, 0.78)';
          ctx.lineWidth = 1.1;
          ctx.beginPath();
          ctx.moveTo(capX, capY - 6);
          ctx.lineTo(cxCh - 9, cyCh);
          ctx.moveTo(capX, capY - 6);
          ctx.lineTo(cxCh + 9, cyCh);
          ctx.stroke();

          ctx.fillStyle = '#f97316';
          ctx.beginPath();
          ctx.arc(cxCh, cyCh, 10, Math.PI, 0);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(cxCh, cyCh, 10, Math.PI * 1.32, Math.PI * 1.68);
          ctx.lineTo(cxCh, cyCh);
          ctx.closePath();
          ctx.fill();
        });
      } else if (drogueDeployed) {
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(capX, capY - 6);
        ctx.lineTo(capX - 6, capY - 22);
        ctx.moveTo(capX, capY - 6);
        ctx.lineTo(capX + 6, capY - 22);
        ctx.stroke();
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(capX, capY - 22, 8, Math.PI, 0);
        ctx.closePath();
        ctx.fill();
      }

      // Contoured Beveled Orion Capsule + PICA-X Base + Floating Airbags
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.moveTo(capX - 5, capY - 8);
      ctx.lineTo(capX + 5, capY - 8);
      ctx.lineTo(capX + 12, capY + 6);
      ctx.lineTo(capX - 12, capY + 6);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ea580c';
      ctx.fillRect(capX - 12, capY + 5, 24, 3);

      // Splashdown shockwave & uprighting foam rings on Pacific water
      if (splashdownDone) {
        [0, 14].forEach((off) => {
          const ringR = 12 + ((t * 28 + off) % 34);
          ctx.strokeStyle = `rgba(255,255,255,${Math.max(0.15, 0.85 - ringR / 46)})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(capX, oceanY + 4, ringR, ringR * 0.34, 0, 0, Math.PI * 2);
          ctx.stroke();
        });
      }
    };
    render();
    return () => window.cancelAnimationFrame(rafId);
  }, [altitudeM, drogueDeployed, mainDeployed, splashdownDone]);

  useEffect(() => {
    if (splashdownDone) return;
    const timer = window.setInterval(() => {
      setAltitudeM((prevAlt) => {
        if (prevAlt <= 0) return 0;
        const step = mainDeployed ? 420 : drogueDeployed ? 680 : 950;
        const nextAlt = Math.max(0, prevAlt - step);
        if (nextAlt === 0 && mainDeployed && !splashTriggeredRef.current) {
          splashTriggeredRef.current = true;
          setSpeedMs(6);
          setSplashdownDone(true);
          soundManager.playFanfare();
          confetti({ particleCount: 150, spread: 90, origin: { y: 0.55 } });
          dialogueManager.speak(
            tr(
              language,
              'AstroNutri mission accomplished! Safe ocean splashdown on Earth with all lunar samples!',
              'مهمة أسترونوتري مكتملة بنجاح باهر! هبطنا بسلام في مياه المحيط على كوكب الأرض!'
            )
          );
          onComplete();
        } else if (nextAlt === 0 && !mainDeployed) {
          return 900;
        }
        return nextAlt;
      });
    }, 650);
    return () => window.clearInterval(timer);
  }, [drogueDeployed, mainDeployed, splashdownDone, onComplete, language]);

  const deployDrogue = () => {
    if (drogueDeployed || altitudeM > 7800) return;
    soundManager.playClick();
    setDrogueDeployed(true);
    setSpeedMs(36);
  };

  const deployMain = () => {
    if (!drogueDeployed || mainDeployed || altitudeM > 3600) return;
    soundManager.playDropSuccess();
    setMainDeployed(true);
    setSpeedMs(7);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-slate-900/80 border border-emerald-500/35 p-4 space-y-3">
        <canvas ref={landingCanvasRef} width={360} height={116} className="w-full max-w-lg mx-auto h-28 rounded-xl border border-sky-400/40" />
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="rounded-xl bg-slate-950/75 p-3 border border-slate-800">
            <div className="text-xs text-slate-400">{tr(language, 'Altitude Above Ocean', 'الارتفاع عن سطح المحيط')}</div>
            <div className="text-2xl font-black text-sky-300">
              {altitudeM.toLocaleString()} {tr(language, 'm', 'م')}
            </div>
          </div>
          <div className="rounded-xl bg-slate-950/75 p-3 border border-slate-800">
            <div className="text-xs text-slate-400">{tr(language, 'Descent Speed', 'سرعة الهبوط')}</div>
            <div className="text-2xl font-black text-emerald-300">
              {speedMs} {tr(language, 'm/s', 'م/ث')}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={deployDrogue}
            disabled={drogueDeployed || altitudeM > 7800}
            className={`p-3.5 rounded-2xl border-2 font-bold text-sm transition-all ${
              drogueDeployed
                ? 'bg-emerald-950/70 border-emerald-400 text-emerald-200'
                : altitudeM <= 7800
                ? 'bg-amber-600 hover:bg-amber-500 border-amber-300 text-white animate-pulse cursor-pointer'
                : 'bg-slate-800/60 border-slate-700 text-slate-400 cursor-not-allowed'
            }`}
          >
            {drogueDeployed
              ? tr(language, '✅ Drogue Chutes Deployed', '✅ تم فتح المظلات الكابحة (Drogue)')
              : altitudeM <= 7800
              ? tr(language, '🪂 Deploy Drogue Chutes NOW!', '🪂 افتح المظلات الكابحة الآن!')
              : tr(language, '⏳ Wait until below 7,800 m', '⏳ انتظر النزول تحت 7,800 م')}
          </button>

          <button
            type="button"
            onClick={deployMain}
            disabled={!drogueDeployed || mainDeployed || altitudeM > 3600}
            className={`p-3.5 rounded-2xl border-2 font-bold text-sm transition-all ${
              mainDeployed
                ? 'bg-emerald-950/70 border-emerald-400 text-emerald-200'
                : drogueDeployed && altitudeM <= 3600
                ? 'bg-emerald-600 hover:bg-emerald-500 border-emerald-300 text-white animate-pulse cursor-pointer'
                : 'bg-slate-800/60 border-slate-700 text-slate-400 cursor-not-allowed'
            }`}
          >
            {mainDeployed
              ? tr(language, '✅ All 3 Main Chutes Deployed!', '✅ تم نشر المظلات الرئيسية الثلاث!')
              : !drogueDeployed
              ? tr(language, '1️⃣ Deploy Drogue Chutes First', '1️⃣ افتح المظلات الكابحة أولاً')
              : altitudeM <= 3600
              ? tr(language, '🪂 Deploy Main Chutes NOW!', '🪂 افتح المظلات الرئيسية الآن!')
              : tr(language, '⏳ Wait until below 3,600 m', '⏳ انتظر النزول تحت 3,600 م')}
          </button>
        </div>
      </div>

      {splashdownDone && (
        <div className="rounded-3xl bg-gradient-to-br from-emerald-950/90 to-sky-950/90 border-2 border-emerald-400 p-5 text-center space-y-3 shadow-2xl">
          <div className="text-4xl">🌍🎉🚀</div>
          <div className="text-xl font-black text-emerald-300 tracking-wide">
            {tr(language, 'MISSION ACCOMPLISHED!', 'اكتملت المهمة الفضائية بنجاح باهر!')}
          </div>
          <p className="text-sm text-slate-100 leading-relaxed">
            {tr(
              language,
              'The AstroNutri crew splashed down safely on Earth with valuable lunar samples after completing all 4 Space Nodes and 14 Stations!',
              'هبط طاقم أسترونوتري بسلام على كوكب الأرض ومعه عينات القمر الثمينة بعد اجتياز المراحل الأربع والـ 14 محطة فضائية!'
            )}
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={onBackToLevel}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs cursor-pointer"
            >
              {tr(language, 'View Capsule Stations', 'عرض محطات الكبسولة')}
            </button>
            <button
              type="button"
              onClick={onBackToWorldMap}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              {tr(language, 'Return to 3D Space Map', 'العودة لخريطة الفضاء الـ 3D')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export const Level4MiniGames: React.FC<Level4Props> = ({
  miniGameId,
  campaign,
  onCompleteMiniGame,
  onBackToLevel,
  onBackToWorldMap
}) => {
  switch (miniGameId) {
    case 'l4_departure_prep':
      return (
        <DeparturePrepGame
          campaign={campaign}
          onComplete={() => onCompleteMiniGame('l4_departure_prep')}
        />
      );
    case 'l4_navigation_earth':
      return <NavigationEarthGame onComplete={() => onCompleteMiniGame('l4_navigation_earth')} />;
    case 'l4_spacecraft_emergency':
      return <EmergencyRepairGame onComplete={() => onCompleteMiniGame('l4_spacecraft_emergency')} />;
    case 'l4_earth_reentry':
      return <ReentryShieldGame campaign={campaign} onComplete={() => onCompleteMiniGame('l4_earth_reentry')} />;
    case 'l4_safe_landing':
    default:
      return (
        <SafeLandingGame
          onComplete={() => onCompleteMiniGame('l4_safe_landing')}
          onBackToLevel={onBackToLevel}
          onBackToWorldMap={onBackToWorldMap}
        />
      );
  }
};
