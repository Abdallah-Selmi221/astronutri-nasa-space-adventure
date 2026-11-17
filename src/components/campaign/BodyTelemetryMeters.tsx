import React from 'react';
import { AppLanguage } from '../../types/game';
import { tr } from '../../utils/i18n';

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
    labelEn: 'Bone Density',
    labelAr: 'كثافة العظام',
    defaultGradient: 'from-amber-400 to-emerald-400'
  },
  muscle: {
    icon: '💪',
    labelEn: 'Muscle Mass',
    labelAr: 'الكتلة العضلية',
    defaultGradient: 'from-cyan-400 to-emerald-400'
  },
  hydration: {
    icon: '💧',
    labelEn: 'Hydration',
    labelAr: 'ترطيب الجسم',
    defaultGradient: 'from-sky-400 to-blue-500'
  },
  filter: {
    icon: '🫧',
    labelEn: 'Filter Cleanliness',
    labelAr: 'نظافة الفلتر',
    defaultGradient: 'from-teal-400 to-emerald-400'
  }
};

export const BodyTelemetryMeters: React.FC<BodyTelemetryMetersProps> = ({
  metrics,
  language,
  titleEn = 'Astronaut Biometric Telemetry',
  titleAr = 'مؤشرات جسم الرائد والأنظمة',
  compact = false
}) => {
  return (
    <div
      data-testid="body-telemetry-meters"
      className={`rounded-2xl bg-slate-950/85 border border-cyan-400/40 ${
        compact ? 'p-2.5 space-y-2' : 'p-3.5 space-y-2.5'
      }`}
    >
      <div className="flex items-center justify-between text-[11px] font-hud font-black text-cyan-200">
        <span>🩺 {tr(language, titleEn, titleAr)}</span>
        <span className="text-emerald-300">LIVE BIO</span>
      </div>

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
              className={`rounded-xl bg-slate-900/90 border p-2 transition-colors ${
                computedStatus === 'critical' ? 'border-rose-400/70' : 'border-slate-700/80'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold mb-1">
                <span className="text-slate-100 flex items-center gap-1">
                  <span>{meta.icon}</span>
                  <span>{tr(language, meta.labelEn, meta.labelAr)}</span>
                </span>
                <span className={`font-hud font-black ${textColor}`}>{clamped}%</span>
              </div>
              <div className="h-2.5 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
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
