import React from 'react';
import { SpaceFitXJointKey, SpaceFitXState } from '../../types/game';
import { initialSpaceFitXState } from '../../context/GameContext';
import { soundManager } from '../../utils/sound';
import {
  Activity,
  AlertTriangle,
  BatteryCharging,
  Dumbbell,
  Radiation,
  Shield,
  Sliders,
  Zap
} from 'lucide-react';

interface SpaceFitXControlsHUDProps {
  suitState?: SpaceFitXState;
  onChange: (next: SpaceFitXState) => void;
  compact?: boolean;
  onHighlightModule?: (moduleIndex: number | null) => void;
}

const JOINT_META: Array<{ key: SpaceFitXJointKey; labelAr: string; icon: string }> = [
  { key: 'shoulders', labelAr: 'الكتفان', icon: '💪' },
  { key: 'elbows', labelAr: 'المرفقان', icon: '🦾' },
  { key: 'hips', labelAr: 'الوركان', icon: '🦵' },
  { key: 'knees', labelAr: 'الركبتان', icon: '🛡️' },
  { key: 'ankles', labelAr: 'الكاحلان', icon: '👟' }
];

const MODE_LOADS: Record<'level1' | 'level2' | 'level3', Record<SpaceFitXJointKey, number>> = {
  level1: { shoulders: 30, elbows: 25, hips: 35, knees: 40, ankles: 30 },
  level2: { shoulders: 55, elbows: 45, hips: 65, knees: 70, ankles: 50 },
  level3: { shoulders: 85, elbows: 75, hips: 90, knees: 95, ankles: 80 }
};

export const SpaceFitXControlsHUD: React.FC<SpaceFitXControlsHUDProps> = ({
  suitState,
  onChange,
  compact = false,
  onHighlightModule
}) => {
  const current: SpaceFitXState = suitState || initialSpaceFitXState;

  const setCompression = (level: 'low' | 'medium' | 'high') => {
    soundManager.playClick();
    onHighlightModule?.(1);
    const drawBonus = level === 'high' ? 1.8 : level === 'medium' ? 0.9 : 0.3;
    onChange({
      ...current,
      compressionLevel: level,
      powerDrawWatts: Number((4.5 + drawBonus).toFixed(1))
    });
  };

  const setResistanceMode = (mode: 'level1' | 'level2' | 'level3') => {
    soundManager.playClick();
    onHighlightModule?.(2);
    const loads = MODE_LOADS[mode];
    const avg = Math.round(Object.values(loads).reduce((a, b) => a + b, 0) / 5);
    onChange({
      ...current,
      resistanceMode: mode,
      emergencyReleased: false,
      jointLoads: { ...loads },
      muscleLoadPct: avg,
      heartRateBpm: Math.min(148, 68 + Math.round(avg * 0.45))
    });
  };

  const setJointLoad = (joint: SpaceFitXJointKey, val: number) => {
    onHighlightModule?.(2);
    const nextJoints = { ...current.jointLoads, [joint]: val };
    const avg = Math.round(Object.values(nextJoints).reduce((a, b) => a + b, 0) / 5);
    onChange({
      ...current,
      resistanceMode: 'custom',
      emergencyReleased: val === 0 ? current.emergencyReleased : false,
      jointLoads: nextJoints,
      muscleLoadPct: avg,
      jointAngleDeg: 10 + Math.round((val / 100) * 65)
    });
  };

  const triggerEmergencyRelease = () => {
    soundManager.playAlertSiren();
    onHighlightModule?.(4);
    onChange({
      ...current,
      emergencyReleased: true,
      resistanceMode: 'custom',
      jointLoads: { shoulders: 0, elbows: 0, hips: 0, knees: 0, ankles: 0 },
      muscleLoadPct: 5,
      heartRateBpm: Math.max(66, current.heartRateBpm - 10)
    });
  };

  return (
    <div className="space-y-3" dir="rtl">
      {/* Banner */}
      <div className="p-3 rounded-2xl bg-gradient-to-l from-slate-900 via-[#0d1f3a] to-slate-900 border border-cyan-400/50 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-300 text-cyan-200 font-mono font-black text-[11px]">
            AstroNutri • SPACE-FIT X (v1.0)
          </span>
          <span className="text-xs font-bold text-slate-200">
            بدلة تدريب وحماية داخلية (IVA — ليست بدلة سير خارجي)
          </span>
        </div>
        {current.emergencyReleased ? (
          <button
            type="button"
            onClick={() => setResistanceMode('level2')}
            className="px-3 py-1 rounded-xl bg-emerald-400 text-slate-950 font-black text-xs cursor-pointer"
          >
            إعادة قفل المقاومة ✓
          </button>
        ) : (
          <button
            type="button"
            data-testid="spacefitx-emergency-release"
            onClick={triggerEmergencyRelease}
            className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs border border-rose-200 shadow cursor-pointer flex items-center gap-1"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Release All Resistance • إفلات فوري</span>
          </button>
        )}
      </div>

      {/* Main Grid */}
      <div className={`grid grid-cols-1 ${compact ? 'md:grid-cols-2' : 'lg:grid-cols-3'} gap-3`}>
        {/* Module 01: Smart Compression + Module 03: Impact + Module 07: Power */}
        <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-cyan-400/40 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-hud font-black text-xs text-cyan-200 flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span>01 • الضغط الذكي (Compression)</span>
            </span>
            <span className="text-[10px] font-mono text-cyan-300 uppercase">
              {current.compressionLevel}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {(['low', 'medium', 'high'] as const).map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setCompression(lvl)}
                className={`py-1.5 rounded-xl text-xs font-black border cursor-pointer transition-all ${
                  current.compressionLevel === lvl
                    ? 'bg-cyan-400 text-slate-950 border-white shadow-[0_0_12px_rgba(34,211,238,0.6)]'
                    : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-cyan-400/60'
                }`}
              >
                {lvl === 'low' ? 'Low • خفيف' : lvl === 'medium' ? 'Med • متوسط' : 'High • عالٍ'}
              </button>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-indigo-400" />
              <span>03 • وسائد TPU الماصة للصدمات</span>
            </span>
            <button
              type="button"
              onClick={() => {
                soundManager.playClick();
                onHighlightModule?.(3);
                onChange({ ...current, impactProtectionActive: !current.impactProtectionActive });
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-black cursor-pointer border ${
                current.impactProtectionActive
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                  : 'bg-slate-800 border-slate-600 text-slate-400'
              }`}
            >
              {current.impactProtectionActive ? 'مفعّلة ✓' : 'مفكوكة'}
            </button>
          </div>

          <div className="pt-2 border-t border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-black text-emerald-300">
              <span className="flex items-center gap-1.5">
                <BatteryCharging className="w-4 h-4" />
                <span>07 • الطاقة والحصاد الحركي</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  soundManager.playClick();
                  onHighlightModule?.(7);
                  onChange({ ...current, batteryAttached: !current.batteryAttached });
                }}
                className="px-2 py-0.5 rounded bg-slate-800 border border-emerald-400/40 text-[10px] text-emerald-200 cursor-pointer"
              >
                {current.batteryAttached ? 'البطارية مثبتة ✓' : 'إعادة تركيب البطارية'}
              </button>
            </div>
            <div className="grid grid-cols-3 gap-1.5 text-center text-[11px]">
              <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800">
                <div className="text-slate-400 text-[9px]">الشحن</div>
                <div className="font-black text-cyan-300">{current.batteryPercent}%</div>
              </div>
              <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800">
                <div className="text-slate-400 text-[9px]">الاستهلاك</div>
                <div className="font-black text-amber-300">{current.powerDrawWatts}W</div>
              </div>
              <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800">
                <div className="text-slate-400 text-[9px]">طاقة محصودة</div>
                <div className="font-black text-emerald-300">+{current.harvestedWh.toFixed(1)}Wh</div>
              </div>
            </div>
          </div>
        </div>

        {/* Module 02: Independent 5-Joint Resistance */}
        <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-sky-400/40 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-hud font-black text-xs text-sky-200 flex items-center gap-1.5">
              <Dumbbell className="w-4 h-4 text-sky-400" />
              <span>02 • مقاومة مستقلة لكل مفصل</span>
            </span>
            <span className="text-[10px] font-mono text-amber-300">
              {current.emergencyReleased ? 'RELEASED' : current.resistanceMode}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-1">
            {(['level1', 'level2', 'level3'] as const).map((m, idx) => (
              <button
                key={m}
                type="button"
                onClick={() => setResistanceMode(m)}
                className={`py-1 rounded-lg text-[11px] font-black border cursor-pointer ${
                  current.resistanceMode === m && !current.emergencyReleased
                    ? 'bg-sky-400 text-slate-950 border-white'
                    : 'bg-slate-900 text-slate-300 border-slate-700'
                }`}
              >
                L{idx + 1}
              </button>
            ))}
            <span className={`py-1 rounded-lg text-[10px] font-black text-center border ${
              current.resistanceMode === 'custom'
                ? 'bg-amber-400/20 border-amber-400 text-amber-200'
                : 'bg-slate-900/60 border-slate-800 text-slate-500'
            }`}>
              Custom
            </span>
          </div>

          <div className="space-y-1.5">
            {JOINT_META.map((j) => (
              <div key={j.key} className="space-y-0.5">
                <div className="flex justify-between text-[11px] font-bold text-slate-200">
                  <span>{j.icon} {j.labelAr}</span>
                  <span className="text-cyan-300 font-mono">{current.jointLoads[j.key]}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={current.jointLoads[j.key]}
                  onChange={(e) => setJointLoad(j.key, Number(e.target.value))}
                  className="w-full h-1.5 accent-cyan-400 cursor-pointer"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Module 05: Physio Monitoring + Module 06: Personal Dosimeter + Module 04 Med Pouch */}
        <div className={`p-3.5 rounded-2xl bg-slate-950/90 border border-emerald-400/40 space-y-2.5 ${compact ? 'md:col-span-2' : ''}`}>
          <div className="font-hud font-black text-xs text-emerald-200 flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span>05 • المراقبة الفسيولوجية الحية</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400 text-[10px]">❤️ نبض القلب</span>
              <span className="font-mono font-black text-rose-300">{current.heartRateBpm} bpm</span>
            </div>
            <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400 text-[10px]">🌡️ حرارة الجلد</span>
              <span className="font-mono font-black text-amber-300">{current.skinTempC}°C</span>
            </div>
            <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400 text-[10px]">⚡ حمل العضلات</span>
              <span className="font-mono font-black text-cyan-300">{current.muscleLoadPct}%</span>
            </div>
            <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400 text-[10px]">📐 زاوية الركبة</span>
              <span className="font-mono font-black text-emerald-300">{current.jointAngleDeg}°</span>
            </div>
          </div>

          {/* Module 06: Radiation Dosimeter (Honesty CAVEAT) */}
          <div
            onClick={() => onHighlightModule?.(6)}
            className="p-2.5 rounded-xl bg-amber-950/45 border border-amber-400/55 space-y-1 cursor-pointer"
          >
            <div className="flex items-center justify-between text-xs font-black text-amber-200">
              <span className="flex items-center gap-1.5">
                <Radiation className="w-4 h-4 text-amber-400" />
                <span>06 • مقياس الجرعة الإشعاعية (Dosimeter)</span>
              </span>
              <span className="font-mono text-[11px]">
                {current.dosimeterCurrentMsv.toFixed(2)} / {current.dosimeterCumulativeMsv.toFixed(2)} mSv
              </span>
            </div>
            <p className="text-[10px] text-amber-100/90 leading-relaxed font-bold">
              ⚠️ للرصد والبحث التجريبي الجزئي فقط — هذه البدلة الداخلية <strong>لا توفر حماية كاملة</strong> من إشعاع العواصف الشمسية (يلزم درع المركبة والملجأ).
            </p>
          </div>

          <div className="flex items-center justify-between p-2 rounded-xl bg-rose-950/35 border border-rose-400/35 text-[11px]">
            <span className="text-rose-200 font-bold flex items-center gap-1">
              <Zap className="w-3.5 h-3.5" />
              <span>04 • حقيبة الطوارئ والإفلات:</span>
            </span>
            <span className="font-black text-emerald-300">
              {current.emergencyReleased ? 'تم التحرير الفوري 🔓' : 'مؤمّنة وجاهزة ✓'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
