import React from 'react';
import { AppLanguage } from '../../types/game';
import { tr } from '../../utils/i18n';
import { AstronautBioTwin } from './AstronautBioTwin';

export type TelemetryMetricKey = 'bone' | 'muscle' | 'hydration' | 'filter';

export interface TelemetryMetricValue {
  key: TelemetryMetricKey;
  value: number; // 0..100
  status?: 'good' | 'warn' | 'critical';
}

export interface BodyTelemetryMetersProps {
  metrics: TelemetryMetricValue[];
  language: AppLanguage;
  titleEn?: string;
  titleAr?: string;
  compact?: boolean;
}

const METRIC_META: Record<
  TelemetryMetricKey,
  { icon: string; labelEn: string; labelAr: string; defaultGradient: string }
> = {
  bone: {
    icon: '🦴',
    labelEn: 'Bone Power',
    labelAr: 'قوة العظام',
    defaultGradient: 'from-amber-400 to-emerald-400'
  },
  muscle: {
    icon: '💪',
    labelEn: 'Hero Energy',
    labelAr: 'طاقة البطل',
    defaultGradient: 'from-rose-400 via-pink-400 to-amber-300'
  },
  hydration: {
    icon: '🫧',
    labelEn: 'O2 & Water',
    labelAr: 'الأكسجين والماء',
    defaultGradient: 'from-cyan-400 to-blue-500'
  },
  filter: {
    icon: '✨',
    labelEn: 'Clean Air',
    labelAr: 'هواء نقي',
    defaultGradient: 'from-teal-400 to-emerald-400'
  }
};

export const BodyTelemetryMeters: React.FC<BodyTelemetryMetersProps> = ({
  metrics,
  language,
  titleEn = 'Space Hero Health',
  titleAr = 'صحة بطل الفضاء',
  compact = false
}) => {
  const byKey = (k: TelemetryMetricKey, fallback: number) =>
    metrics.find((m) => m.key === k)?.value ?? fallback;
  const boneMuscleAvg = Math.round((byKey('bone', 92) + byKey('muscle', 92)) / 2);
  const hydrVal = Math.round(byKey('hydration', 88));
  const shieldReady = byKey('filter', 0) >= 85;

  return (
    <div
      data-testid="body-telemetry-meters"
      className={`rounded-3xl bg-slate-950/88 border-2 border-cyan-400/50 ${
        compact ? 'p-2.5 space-y-2' : 'p-3.5 space-y-2.5'
      }`}
    >
      <div className="flex items-center justify-between text-xs font-hud font-black text-cyan-200">
        <span>❤️ {tr(language, titleEn, titleAr)}</span>
        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/60 text-emerald-300 text-[10px]">
          {tr(language, 'READY ✨', 'جاهز ✨')}
        </span>
      </div>

      <AstronautBioTwin
        compact
        language={language}
        rationsCount={3}
        hydrationPct={hydrVal}
        boneMusclePct={boneMuscleAvg}
        suitCalibrated
        radiationShielded={shieldReady}
      />

      <div className={`grid grid-cols-1 ${metrics.length > 1 ? 'sm:grid-cols-2' : ''} gap-2.5`}>
        {metrics.map((m) => {
          const meta = METRIC_META[m.key];
          const clamped = Math.max(0, Math.min(100, Math.round(m.value)));
          const computedStatus =
            m.status ?? (clamped >= 75 ? 'good' : clamped >= 45 ? 'warn' : 'critical');

          const barGradient =
            computedStatus === 'critical'
              ? 'from-rose-500 to-red-600'
              : computedStatus === 'warn'
              ? 'from-amber-400 to-orange-500'
              : meta.defaultGradient;

          const textColor =
            computedStatus === 'critical'
              ? 'text-rose-300'
              : computedStatus === 'warn'
              ? 'text-amber-300'
              : 'text-emerald-300';

          return (
            <div
              key={m.key}
              data-testid={`telemetry-metric-${m.key}`}
              className={`rounded-2xl bg-slate-900/90 border-2 p-2.5 transition-colors ${
                computedStatus === 'critical' ? 'border-rose-400/70' : 'border-cyan-500/30'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-black mb-1.5">
                <span className="text-slate-100 flex items-center gap-1.5">
                  <span>{meta.icon}</span>
                  <span>{tr(language, meta.labelEn, meta.labelAr)}</span>
                </span>
                <span className={`font-hud font-black ${textColor}`}>{clamped}%</span>
              </div>
              <div className="h-3.5 rounded-full bg-slate-950 overflow-hidden border border-slate-700/80 p-0.5">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${barGradient} transition-all duration-500`}
                  style={{ width: `${clamped}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
