import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameState } from '../../context/GameContext';
import { 
  Droplets, 
  AlertTriangle, 
  Wrench, 
  Sparkles, 
  Info,
  ShieldCheck
} from 'lucide-react';

export const ECLSSSystem: React.FC = () => {
  const { 
    state, 
    drainWaterTick, 
    repairECLSS, 
    dismissECLSSModal 
  } = useGameState();

  const { waterLevel, isProcessorFailed, isECLSSSuccessModalOpen } = state.level2State;

  // Drain water over time with strict interval cleanup
  useEffect(() => {
    const drainInterval = window.setInterval(() => {
      drainWaterTick(2.2);
    }, 1200);

    return () => {
      clearInterval(drainInterval);
    };
  }, [drainWaterTick]);

  const getWaterColor = () => {
    if (waterLevel <= 30) return 'from-rose-600 to-red-500';
    if (waterLevel <= 60) return 'from-amber-400 to-yellow-400';
    return 'from-cyan-400 to-blue-500';
  };

  return (
    <div className="bg-space-950/90 border-4 border-cyan-500/50 rounded-3xl p-5 sm:p-6 backdrop-blur-xl shadow-2xl shadow-cyan-950/40 flex flex-col justify-between relative overflow-hidden">
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between border-b border-space-800 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-cyan-950 border border-cyan-400 text-cyan-300">
              <Droplets className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-hud font-black text-base sm:text-lg text-white">
                  استعادة وتدوير مياه الشرب ECLSS 💧
                </h3>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-cyan-900/60 text-cyan-200 border border-cyan-500/40">
                  خزان 2
                </span>
              </div>
              <p className="text-xs text-slate-300">
                حلقة تنقية العرق وبخار التنفس ومياه الصرف
              </p>
            </div>
          </div>

          <div className={`px-3 py-1 rounded-2xl border text-xs font-black flex items-center gap-1.5 ${
            isProcessorFailed
              ? 'bg-rose-950 text-rose-300 border-rose-500 animate-pulse'
              : 'bg-space-900 text-cyan-300 border-space-700'
          }`}>
            {isProcessorFailed ? <AlertTriangle className="w-4 h-4 text-rose-400" /> : <Droplets className="w-4 h-4" />}
            <span>{Math.round(waterLevel)}%</span>
          </div>
        </div>

        {/* Visual Water Tank Column */}
        <div className="relative w-full h-44 bg-space-900 rounded-2xl border-4 border-space-700 overflow-hidden my-4 p-1 flex flex-col justify-end">
          <motion.div
            initial={{ height: '100%' }}
            animate={{ height: `${waterLevel}%` }}
            transition={{ ease: 'easeInOut', duration: 0.5 }}
            className={`w-full rounded-xl bg-gradient-to-t ${getWaterColor()} relative shadow-lg shadow-cyan-500/20`}
          >
            <div className="absolute top-0 inset-x-0 h-2 bg-white/40 filter blur-xs animate-pulse" />

            {/* Bubble particles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-60">
              <div className="w-2.5 h-2.5 rounded-full bg-white/70 absolute bottom-2 left-1/4 animate-bounce" />
              <div className="w-3 h-3 rounded-full bg-white/50 absolute bottom-6 right-1/3 animate-bounce" style={{ animationDelay: '0.4s' }} />
              <div className="w-2 h-2 rounded-full bg-white/80 absolute bottom-1 right-1/4 animate-bounce" style={{ animationDelay: '0.8s' }} />
            </div>
          </motion.div>

          {/* Level Overlay Numbers */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="font-hud font-black text-4xl text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
              {Math.round(waterLevel)}%
            </span>
          </div>

          {/* 30% Threshold Warning Line */}
          <div 
            className="absolute left-0 right-0 h-0.5 bg-rose-500 z-10 pointer-events-none opacity-70 flex items-center justify-start pl-2"
            style={{ bottom: '30%' }}
          >
            <span className="text-[9px] font-black text-rose-300 bg-space-950/90 px-1.5 py-0.5 rounded">
              خط الخطر (30%)
            </span>
          </div>
        </div>

        {/* Educational Info Note */}
        <div className="bg-space-900/90 border-2 border-space-800 rounded-2xl p-3.5 mb-4 text-xs text-slate-300 flex items-start gap-2.5 leading-relaxed font-bold">
          <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <p className="text-[11px]">
            نظام ECLSS بناسا يقوم بفلترة بخار تنفس الرواد وعرقهم وبولهم. نقل لتر الماء الواحد من الأرض للقمر يكلف 20,000 دولار، لذلك تدوير 98% من الماء مسألة حياة أو موت!
          </p>
        </div>

        {/* THRESHOLD ALERT: Waste Water & Urine Processor Failed! */}
        <AnimatePresence>
          {isProcessorFailed && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-rose-950/90 border-2 border-rose-500 rounded-2xl p-3.5 mb-4 text-center shadow-lg shadow-rose-950/60"
            >
              <div className="flex items-center justify-center gap-1.5 text-rose-300 font-hud font-black text-xs sm:text-sm mb-1">
                <AlertTriangle className="w-4 h-4 animate-pulse text-rose-400" />
                <span>إنذار! عطل في معالج تنقية البول والعرق ومياه الصرف!</span>
              </div>
              <p className="text-[11px] text-slate-200 leading-relaxed font-bold">
                انخفض منسوب الخزان لمستوى الخطر! أصلح المعالج فوراً قبل نفاد مياه الشرب بالقاعدة!
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Repair Interaction Button */}
      <div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.96 }}
          onClick={repairECLSS}
          className={`w-full py-4 px-6 rounded-2xl font-hud font-black text-sm sm:text-base tracking-wide transition-all flex items-center justify-center gap-2 shadow-xl ${
            isProcessorFailed
              ? 'bg-gradient-to-r from-rose-600 to-red-600 text-white animate-pulse border-2 border-rose-400 shadow-rose-600/50'
              : 'bg-gradient-to-r from-cyan-400 to-blue-500 text-space-950 shadow-cyan-500/30 hover:brightness-110 active:scale-95'
          }`}
        >
          <Wrench className="w-5 h-5" />
          <span>إصلاح معالج البول والعرق وإعادة التدوير 🔧</span>
        </motion.button>
      </div>

      {/* Success Modal: 98% recycled fact */}
      <AnimatePresence>
        {isECLSSSuccessModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="w-full max-w-md bg-space-950 border-4 border-emerald-400 rounded-3xl p-6 text-center shadow-2xl"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-950 border-2 border-emerald-400 flex items-center justify-center text-3xl mx-auto mb-3">
                💧
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950 border border-emerald-400 text-emerald-300 font-black text-xs uppercase mb-2">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>تم التدوير بنجاح 100%</span>
              </div>
              <h3 className="font-hud font-black text-2xl text-white mb-2">
                أحسنت يا كابتن الفضاء! 🌟
              </h3>
              <div className="bg-space-900 border border-space-800 rounded-2xl p-4 mb-5 text-right">
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-bold">
                  &ldquo;عمل رائع! قمت باستعادة وتنقية 98% من العرق والبول وتحويلها إلى مياه شرب نقية وعذبة لطاقم المحطة!&rdquo;
                </p>
              </div>
              <button
                onClick={dismissECLSSModal}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-500 text-space-950 font-black text-sm shadow-lg flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>استكمال مهام القمر</span>
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
