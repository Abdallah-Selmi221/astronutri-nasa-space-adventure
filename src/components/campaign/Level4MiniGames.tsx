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
  const [cargoChecks, setCargoChecks] = useState<Record<string, boolean>>({
    oxygen: false,
    power: false,
    lifeSupport: false,
    comms: false,
    samplesSealed: false
  });

  const collectedSamples = campaign.l3CollectedSamples || [];
  const allCargoChecked = Object.values(cargoChecks).every(Boolean);

  const toggleCheck = (key: string) => {
    soundManager.playClick();
    setCargoChecks((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-amber-950/35 border border-amber-500/35 p-4">
        <div className="font-bold text-amber-200 text-sm mb-2">
          {tr(
            language,
            `📦 Verify Lunar Samples Stowed from Level 3 (${collectedSamples.length} samples)`,
            `📦 التحقق من عينات القمر الواردة من المستوى 3 (${collectedSamples.length} عينة)`
          )}
        </div>
        {collectedSamples.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {collectedSamples.map((sid) => {
              const info = SAMPLE_LABELS[sid];
              return (
                <span
                  key={sid}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-xs font-bold text-emerald-200"
                >
                  <span>{info?.icon || '🪨'}</span>
                  <span>{info ? tr(language, info.nameEn, info.nameAr) : sid}</span>
                </span>
              );
            })}
          </div>
        ) : (
          <div className="text-xs text-amber-200/90">
            {tr(
              language,
              'Reference sample canister secured in cargo locker.',
              'ملاحظة: دخلتَ المستوى 4 مباشرة أو لم تُخزَّن عينات؛ يتم تأمين كبسولة العينات القياسية المرجعية في المخزن.'
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[
          { key: 'oxygen', icon: '🫧', en: 'Oxygen Tanks Verified (100% O2)', ar: 'فحص خزانات الأكسجين (O₂ 100%)' },
          { key: 'power', icon: '⚡', en: 'Fuel Cells & Battery Balance', ar: 'توازن خلايا الطاقة والبطاريات' },
          { key: 'lifeSupport', icon: '🌡️', en: 'Capsule Pressure & Thermal Stable', ar: 'استقرار ضغط وحرارة الكبسولة' },
          { key: 'comms', icon: '📡', en: 'Deep Space Network (DSN) Aligned', ar: 'مواءمة هوائي شبكة الفضاء العميق' },
          { key: 'samplesSealed', icon: '🔒', en: 'Seal & Lock Lunar Sample Locker', ar: 'إغلاق وتثبيت حاوية عينات القمر' }
        ].map((item) => {
          const ok = cargoChecks[item.key];
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => toggleCheck(item.key)}
              className={`p-3.5 rounded-2xl border-2 flex items-center justify-between transition-all cursor-pointer ${
                language === 'ar' ? 'text-right' : 'text-left'
              } ${
                ok
                  ? 'bg-emerald-950/65 border-emerald-400 text-white'
                  : 'bg-slate-900/75 border-slate-700 text-slate-200 hover:border-amber-400'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-xl">{item.icon}</span>
                <span className="font-bold text-sm">{tr(language, item.en, item.ar)}</span>
              </div>
              <span className="text-xs font-black px-2 py-0.5 rounded-full bg-slate-950/70">
                {ok ? tr(language, '✅ Verified', '✅ مؤكد') : tr(language, 'Check', 'افحص')}
              </span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => {
          if (!allCargoChecked) return;
          soundManager.playDropSuccess();
          dialogueManager.speak(
            tr(
              language,
              'Lunar samples sealed and Orion systems checked! Ready for Trans-Earth departure!',
              'تم تأمين عينات القمر وفحص الأنظمة بنجاح! مستعدون للعودة إلى كوكب الأرض!'
            )
          );
          onComplete();
        }}
        disabled={!allCargoChecked}
        className={`w-full py-3.5 rounded-2xl font-black text-base transition-all ${
          allCargoChecked
            ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg cursor-pointer'
            : 'bg-slate-800 text-slate-500 cursor-not-allowed'
        }`}
      >
        {tr(language, 'Confirm Departure Readiness to Earth →', 'تأكيد جاهزية المغادرة والعودة للأرض ←')}
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

const ReentryShieldGame: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const { language } = useGameState();
  const [tilesChecked, setTilesChecked] = useState<Record<number, boolean>>({ 0: false, 1: false, 2: false });
  const [reentryStarted, setReentryStarted] = useState(false);
  const [shieldAngle, setShieldAngle] = useState(0);
  const [reentryProgress, setReentryProgress] = useState(0);
  const [reentryError, setReentryError] = useState<string | null>(null);
  const reentryDoneRef = useRef(false);

  const gLoadMetric = NASA_OSDR_METRICS.find((m) => m.id === 'osdr_reentry_gload') || NASA_OSDR_METRICS[3];
  const allTilesOk = Object.values(tilesChecked).every(Boolean);
  const inSafeZone = Math.abs(shieldAngle) <= 18;
  const reentryFinished = reentryProgress >= 100;

  useEffect(() => {
    if (!reentryStarted || reentryFinished) return;
    const timer = window.setInterval(() => {
      setShieldAngle((prev) => {
        const drift = (Math.random() - 0.5) * 8;
        return Math.max(-35, Math.min(35, Math.round(prev + drift)));
      });
    }, 450);
    return () => window.clearInterval(timer);
  }, [reentryStarted, reentryFinished]);

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

      {!reentryStarted ? (
        <button
          type="button"
          disabled={!allTilesOk}
          onClick={() => {
            soundManager.playClick();
            setReentryStarted(true);
          }}
          className={`w-full py-3.5 rounded-2xl font-black text-base transition-all ${
            allTilesOk
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
      return <ReentryShieldGame onComplete={() => onCompleteMiniGame('l4_earth_reentry')} />;
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
