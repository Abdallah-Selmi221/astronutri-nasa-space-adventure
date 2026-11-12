import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useGameState } from '../../context/GameContext';
import { AnimatedRobo } from '../common/AnimatedRobo';
import { 
  ArrowRight, 
  Wind, 
  Fuel, 
  Flame, 
  Sparkles, 
  ArrowLeft,
  AlertTriangle,
  RotateCcw,
  Zap
} from 'lucide-react';

export const EngineCore: React.FC = () => {
  const { 
    state, 
    setLocation, 
    pumpO2Scrubber, 
    fillFuelCellTick, 
    coolFuelCellTick, 
    resetFuelOverheat, 
    completeEngineCore 
  } = useGameState();

  const { engineCoreState, cadetName } = state;
  const [showCelebration, setShowCelebration] = useState(false);
  const [isHoldingFuel, setIsHoldingFuel] = useState(false);
  const fuelIntervalRef = useRef<number | null>(null);

  const { o2ScrubberProgress, fuelCellProgress, fuelCellTemp, isOverheated } = engineCoreState;

  const isBothComplete = o2ScrubberProgress >= 100 && fuelCellProgress >= 100;

  // Handle continuous fuel filling on hold
  useEffect(() => {
    if (isHoldingFuel && !isOverheated && fuelCellProgress < 100) {
      fuelIntervalRef.current = window.setInterval(() => {
        fillFuelCellTick(2.5, 3.2);
      }, 100);
    } else {
      if (fuelIntervalRef.current) {
        clearInterval(fuelIntervalRef.current);
        fuelIntervalRef.current = null;
      }
    }

    return () => {
      if (fuelIntervalRef.current) clearInterval(fuelIntervalRef.current);
    };
  }, [isHoldingFuel, isOverheated, fuelCellProgress, fillFuelCellTick]);

  // Passive cooling when not holding fuel
  useEffect(() => {
    const coolingTimer = window.setInterval(() => {
      if (!isHoldingFuel && fuelCellTemp > 25 && !isOverheated) {
        coolFuelCellTick();
      }
    }, 150);

    return () => clearInterval(coolingTimer);
  }, [isHoldingFuel, fuelCellTemp, isOverheated, coolFuelCellTick]);

  const handleComplete = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
    completeEngineCore();
    setShowCelebration(true);
  };

  const roboEngineSpeech = 'عاش يا بطل! في قلب المحرك، اضغط على زر مضخة الأكسجين عشان نوصل 100%، وخلي إيدك دايسة على زر شحن الوقود.. بس اوعى الحرارة تسخن زيادة!';

  return (
    <div className="w-full max-w-7xl mx-auto py-6 px-3 sm:px-6 flex flex-col flex-1">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLocation('Map')}
            className="p-2.5 rounded-2xl bg-space-900 hover:bg-space-800 border-2 border-cyan-500/40 text-cyan-300 hover:text-white transition-all flex items-center gap-1.5 text-xs font-black shadow-md"
          >
            <ArrowRight className="w-4 h-4 text-cyan-400" />
            <span>خريطة المحطة</span>
          </button>
          <div>
            <h2 className="font-hud font-black text-xl sm:text-2xl text-white tracking-wide flex items-center gap-2">
              قلب المحرك والطاقة الفضائية <span className="text-amber-400">⚡</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300">
              المرحلة 3: تنقية الأكسجين وشحن خلايا الوقود الصاروخي
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-space-900/90 px-4 py-2 rounded-2xl border-2 border-cyan-500/40 text-xs sm:text-sm font-black">
          <span className="text-slate-400">جاهزية المحركات:</span>
          <span className={isBothComplete ? 'text-emerald-400 animate-pulse' : 'text-amber-400'}>
            {isBothComplete ? '100% جاهزة للإطلاق الفضائي 🚀' : 'جاري الشحن والتنقية...'}
          </span>
        </div>
      </div>

      {/* Robo Companion Advice */}
      <div className="mb-6 p-4 rounded-3xl bg-gradient-to-r from-sky-950 via-space-900 to-amber-950 border-2 border-amber-400/40 shadow-xl flex flex-col sm:flex-row items-center gap-4">
        <div className="shrink-0">
          <AnimatedRobo
            state={isBothComplete ? 'HAPPY' : 'THINKING'}
            size="sm"
            showSpeechBubble={false}
          />
        </div>
        <div className="flex-1 text-right">
          <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-400/40 mb-1 inline-block">
            إرشادات روبو للمحرك 🤖
          </span>
          <p className="text-xs sm:text-sm text-slate-200 font-bold leading-relaxed">
            &ldquo;{roboEngineSpeech}&rdquo;
          </p>
        </div>
      </div>

      {/* Main Grid: O2 Scrubber (Right) & Fuel Cell (Left) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch flex-1">
        
        {/* MINI-GAME 1: O2 Scrubber Pump (20% -> 100%) */}
        <div className="bg-space-950/90 border-4 border-cyan-500/50 rounded-3xl p-5 sm:p-6 backdrop-blur-xl shadow-2xl shadow-cyan-950/30 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-space-800 pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-cyan-950 border border-cyan-400 text-cyan-300">
                  <Wind className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-hud font-black text-base sm:text-lg text-white">
                    1. مضخة تنقية الأكسجين
                  </h3>
                  <p className="text-xs text-slate-400">
                    اضغط عدة مرات متتالية لرفع نسبة الأكسجين النقي إلى 100%
                  </p>
                </div>
              </div>

              <span className={`font-black text-sm px-3 py-1 rounded-2xl border ${
                o2ScrubberProgress >= 100
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-400'
                  : 'bg-space-900 text-cyan-300 border-space-700'
              }`}>
                {o2ScrubberProgress}%
              </span>
            </div>

            {/* Circular Progress Gauge */}
            <div className="relative w-44 h-44 mx-auto my-4 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  stroke="#1c2541"
                  strokeWidth="10"
                  fill="transparent"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  stroke="#00f0ff"
                  strokeWidth="10"
                  strokeDasharray={`${2 * Math.PI * 50}`}
                  strokeDashoffset={`${2 * Math.PI * 50 * (1 - o2ScrubberProgress / 100)}`}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-300"
                />
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <Wind className="w-8 h-8 text-cyan-400 animate-pulse mb-1" />
                <span className="font-hud font-black text-3xl text-white">
                  {o2ScrubberProgress}%
                </span>
                <span className="text-[10px] text-cyan-300 font-bold uppercase">
                  أكسجين نقي
                </span>
              </div>
            </div>
          </div>

          <div>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => pumpO2Scrubber(8)}
              disabled={o2ScrubberProgress >= 100}
              className={`w-full py-4 px-6 rounded-2xl font-hud font-black text-sm sm:text-base tracking-wide shadow-xl flex items-center justify-center gap-2 transition-all ${
                o2ScrubberProgress >= 100
                  ? 'bg-emerald-950/80 border-2 border-emerald-500 text-emerald-300 cursor-default'
                  : 'bg-gradient-to-r from-cyan-400 to-blue-500 text-space-950 shadow-cyan-500/30 active:scale-95'
              }`}
            >
              {o2ScrubberProgress >= 100 ? (
                <span>الأكسجين مكتمل 100% بنجاح ✅</span>
              ) : (
                <>
                  <Wind className="w-5 h-5" />
                  <span>اضغط هنا لضخ الأكسجين! 💨</span>
                </>
              )}
            </motion.button>
          </div>
        </div>

        {/* MINI-GAME 2: Fuel Cell Hold to Fill with Overheat Warning */}
        <div className="bg-space-950/90 border-4 border-amber-500/50 rounded-3xl p-5 sm:p-6 backdrop-blur-xl shadow-2xl shadow-amber-950/30 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-space-800 pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-amber-950 border border-amber-400 text-amber-300">
                  <Fuel className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-hud font-black text-base sm:text-lg text-white">
                    2. خلايا الوقود الصاروخي المبرد
                  </h3>
                  <p className="text-xs text-slate-400">
                    اضغط واستمر بالضغط للشحن.. وتوقف فوراً قبل أن تسخن الحرارة (100°C)!
                  </p>
                </div>
              </div>

              <span className={`font-black text-sm px-3 py-1 rounded-2xl border ${
                fuelCellProgress >= 100
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-400'
                  : 'bg-space-900 text-amber-300 border-space-700'
              }`}>
                {Math.round(fuelCellProgress)}%
              </span>
            </div>

            {/* Fuel Bar Progress */}
            <div className="space-y-4 my-4">
              <div>
                <div className="flex justify-between text-xs font-black text-slate-300 mb-1">
                  <span>مستوى الوقود الصاروخي:</span>
                  <span className="text-amber-300">{Math.round(fuelCellProgress)}%</span>
                </div>
                <div className="w-full h-5 bg-space-900 rounded-xl overflow-hidden border border-space-700 p-0.5">
                  <motion.div
                    className="h-full rounded-lg bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-100"
                    style={{ width: `${fuelCellProgress}%` }}
                  />
                </div>
              </div>

              {/* Temperature Bar & Danger Gauge */}
              <div>
                <div className="flex justify-between text-xs font-black text-slate-300 mb-1">
                  <span className="flex items-center gap-1">
                    <Flame className="w-4 h-4 text-rose-400" />
                    <span>حرارة الخلايا (الحد الأقصى 100°C):</span>
                  </span>
                  <span className={fuelCellTemp > 80 ? 'text-rose-400 font-black animate-pulse' : 'text-slate-300'}>
                    {Math.round(fuelCellTemp)}°C
                  </span>
                </div>
                <div className="w-full h-5 bg-space-900 rounded-xl overflow-hidden border border-space-700 p-0.5">
                  <div
                    className={`h-full rounded-lg transition-all duration-100 ${
                      fuelCellTemp > 80
                        ? 'bg-gradient-to-r from-orange-500 to-rose-600'
                        : 'bg-gradient-to-r from-cyan-400 to-amber-400'
                    }`}
                    style={{ width: `${Math.min(100, (fuelCellTemp / 100) * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Overheat Alert Card */}
            {isOverheated && (
              <div className="p-3.5 bg-rose-950/80 border-2 border-rose-500 rounded-2xl flex items-center justify-between text-rose-200 text-xs font-bold animate-pulse">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-rose-400" />
                  <span>انفجار حراري! ارتفعت الحرارة فوق 100°C!</span>
                </div>
                <button
                  type="button"
                  onClick={resetFuelOverheat}
                  className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs flex items-center gap-1 shadow"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>إعادة تبريد</span>
                </button>
              </div>
            )}
          </div>

          <div>
            <motion.button
              whileHover={{ scale: isOverheated ? 1 : 1.02 }}
              whileTap={{ scale: isOverheated ? 1 : 0.97 }}
              onMouseDown={() => setIsHoldingFuel(true)}
              onMouseUp={() => setIsHoldingFuel(false)}
              onMouseLeave={() => setIsHoldingFuel(false)}
              onTouchStart={() => setIsHoldingFuel(true)}
              onTouchEnd={() => setIsHoldingFuel(false)}
              disabled={fuelCellProgress >= 100 || isOverheated}
              className={`w-full py-4 px-6 rounded-2xl font-hud font-black text-sm sm:text-base tracking-wide shadow-xl flex items-center justify-center gap-2 transition-all ${
                fuelCellProgress >= 100
                  ? 'bg-emerald-950/80 border-2 border-emerald-500 text-emerald-300 cursor-default'
                  : isOverheated
                  ? 'bg-rose-950 border-2 border-rose-700 text-rose-400 cursor-not-allowed opacity-60'
                  : isHoldingFuel
                  ? 'bg-orange-500 text-space-950 scale-[0.98] shadow-orange-500/50'
                  : 'bg-gradient-to-r from-amber-400 to-orange-500 text-space-950 shadow-amber-500/30'
              }`}
            >
              {fuelCellProgress >= 100 ? (
                <span>خلايا الوقود ممتلئة 100% بنجاح ✅</span>
              ) : isOverheated ? (
                <span>اضغط &quot;إعادة تبريد&quot; بالأعلى للاستمرار ⚠️</span>
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  <span>{isHoldingFuel ? 'جاري الشحن المستمر... (اترك قبل 100°C!)' : 'اضغط باستمرار للشحن! ⛽'}</span>
                </>
              )}
            </motion.button>
          </div>
        </div>

      </div>

      {/* Unlock Launch Pad Button when both are complete */}
      <div className="mt-6">
        {isBothComplete ? (
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleComplete}
            className="w-full py-4 px-6 rounded-3xl bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 text-space-950 font-hud font-black text-base tracking-wide shadow-2xl shadow-emerald-500/40 flex items-center justify-center gap-2 animate-pulse"
          >
            <Sparkles className="w-6 h-6" />
            <span>المحركات والأكسجين 100%! افتح منصة الإطلاق وانطلق 🚀</span>
          </motion.button>
        ) : (
          <div className="p-3.5 bg-space-950/80 border-2 border-space-800 rounded-2xl text-center text-xs text-amber-300 font-bold">
            ⚠️ يجب إكمال مضخة الأكسجين إلى 100% وشحن خلايا الوقود إلى 100% لفتح منصة الإطلاق.
          </div>
        )}
      </div>

      {/* Celebration Modal */}
      <AnimatePresence>
        {showCelebration && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="w-full max-w-md bg-space-950 border-4 border-amber-400 rounded-3xl p-6 text-center shadow-2xl"
            >
              <div className="w-16 h-16 rounded-full bg-amber-950 border-2 border-amber-400 flex items-center justify-center text-3xl mx-auto mb-3">
                ⚡
              </div>
              <h3 className="font-hud font-black text-2xl text-white mb-2">
                محركات الصاروخ جاهزة يا كابتن {cadetName}!
              </h3>
              <p className="text-sm text-slate-300 mb-5 leading-relaxed font-bold">
                تم تنقية الهواء بالكامل وشحن طاقة الصاروخ بنجاح! تم فتح منصة الإطلاق الكبرى.
              </p>
              <button
                onClick={() => {
                  setShowCelebration(false);
                  setLocation('LaunchPad');
                }}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 text-space-950 font-black text-sm shadow-lg flex items-center justify-center gap-2"
              >
                <span>الانتقال لمنصة الإطلاق 🚀</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
