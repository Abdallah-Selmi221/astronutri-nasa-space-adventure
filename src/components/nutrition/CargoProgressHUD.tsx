import React from 'react';
import { motion } from 'framer-motion';
import { useGameState } from '../../context/GameContext';
import { CheckCircle2, Sparkles } from 'lucide-react';

export const CargoProgressHUD: React.FC = () => {
  const { state } = useGameState();
  const { cargoWeight, nutritionScore, cargoItems } = state;
  const { totalProtein, totalCarbs, status } = nutritionScore;

  // Kid-friendly 0-100% progress bars derived from packed items
  const vitaminsScore = Math.min(
    100,
    cargoItems.reduce((acc, entry) => {
      if (entry.item.id === 'rehydratable_fruits' || entry.item.id === 'space_broccoli' || entry.item.isSpecial) {
        return acc + 35 * entry.quantity;
      }
      return acc + 15 * entry.quantity;
    }, 0)
  );

  const energyScore = Math.min(100, Math.round((totalCarbs / 45) * 100));
  const proteinHydrationScore = Math.min(100, Math.round((totalProtein / 45) * 100));

  const bars = [
    {
      id: 'vitamins',
      label: 'الفيتامينات والمناعة',
      icon: '🍎',
      percent: vitaminsScore,
      gradient: 'from-emerald-400 via-green-500 to-teal-500',
      trackBorder: 'border-emerald-300',
      badgeColor: 'text-emerald-700 bg-emerald-100'
    },
    {
      id: 'energy',
      label: 'الطاقة والنشاط',
      icon: '⚡',
      percent: energyScore,
      gradient: 'from-yellow-300 via-amber-400 to-orange-500',
      trackBorder: 'border-amber-300',
      badgeColor: 'text-amber-800 bg-amber-100'
    },
    {
      id: 'protein',
      label: 'البروتين والترطيب',
      icon: '💧',
      percent: proteinHydrationScore,
      gradient: 'from-cyan-300 via-sky-500 to-blue-600',
      trackBorder: 'border-sky-300',
      badgeColor: 'text-sky-800 bg-sky-100'
    }
  ];

  return (
    <div className="w-full bg-gradient-to-b from-white/95 via-sky-50/95 to-cyan-100/90 border-4 border-sky-300 rounded-[2.2rem] p-4 sm:p-5 shadow-[0_14px_40px_rgba(14,165,233,0.3)] text-right select-none relative overflow-hidden">
      {/* Top Specular Gloss Highlight */}
      <div className="absolute top-1.5 inset-x-6 h-3 rounded-full bg-gradient-to-b from-white to-transparent pointer-events-none" />

      {/* Panel Title Header */}
      <div className="flex items-center justify-between border-b-2 border-sky-200 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-b from-sky-400 to-blue-600 text-white flex items-center justify-center text-lg shadow-md border-2 border-white">
            📊
          </div>
          <div>
            <h3 className="font-hud font-black text-base sm:text-xl text-slate-900 leading-none">
              التوازن الغذائي
            </h3>
            <span className="text-[11px] font-bold text-sky-700">
              مؤشرات صحة رائد الفضاء
            </span>
          </div>
        </div>

        <span
          className={`px-3 py-1 rounded-full text-xs font-black border-2 flex items-center gap-1 shadow-sm ${
            status === 'optimal_balanced' && cargoWeight >= 60
              ? 'bg-emerald-500 text-white border-emerald-200'
              : 'bg-sky-200/90 text-sky-900 border-sky-300'
          }`}
        >
          {status === 'optimal_balanced' && cargoWeight >= 60 ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>متوازن 100%</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>{cargoWeight}%</span>
            </>
          )}
        </span>
      </div>

      {/* 3 Simple Colorful Kid-Friendly Progress Bars */}
      <div className="space-y-3.5">
        {bars.map((bar) => (
          <div key={bar.id} className="bg-white/90 rounded-2xl p-2.5 border-2 border-sky-200/80 shadow-sm">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-base shadow-inner">
                  {bar.icon}
                </span>
                <span className="font-hud font-black text-xs sm:text-sm text-slate-800">
                  {bar.label}
                </span>
              </div>

              <span className={`font-hud font-black text-xs px-2 py-0.5 rounded-lg ${bar.badgeColor}`}>
                {bar.percent}%
              </span>
            </div>

            <div className={`w-full h-4 bg-slate-200/90 rounded-full overflow-hidden border ${bar.trackBorder} p-0.5`}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${bar.percent}%` }}
                transition={{ type: 'spring', stiffness: 120, damping: 18 }}
                className={`h-full rounded-full bg-gradient-to-l ${bar.gradient} shadow-inner`}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Kid-Friendly Status Tip */}
      <div className="mt-4 p-2.5 rounded-2xl bg-sky-200/60 border border-sky-300 text-center">
        <p className="text-xs font-black text-sky-950 leading-relaxed">
          {cargoWeight === 0
            ? 'اسحب التفاح والبروكلي واللحم والجبن إلى الصندوق! 🎯'
            : status === 'optimal_balanced' && cargoWeight >= 60
            ? 'وجبة فضائية متكاملة! اضغط زر اعتماد الصندوق! 🌟'
            : nutritionScore.feedbackTip}
        </p>
      </div>
    </div>
  );
};
