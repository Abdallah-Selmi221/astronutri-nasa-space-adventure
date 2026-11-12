import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameState } from '../../context/GameContext';
import { 
  Clock, 
  AlertTriangle, 
  Activity, 
  Syringe, 
  ShieldCheck, 
  CheckCircle2, 
  Info,
  AlertOctagon,
  LogOut
} from 'lucide-react';

export const EVATimer: React.FC = () => {
  const { 
    state, 
    tickEVATimer, 
    administerSaline, 
    concludeEVA 
  } = useGameState();

  const { 
    evaTimeRemaining, 
    bloodPressureStatus, 
    isSalineAdministered, 
    isEVASafeReturned 
  } = state.level2State;

  // Strict timer cleanup: 10 Hours mapped to ~60s total gameplay time
  useEffect(() => {
    if (evaTimeRemaining > 0 && !isEVASafeReturned) {
      const timer = window.setInterval(() => {
        tickEVATimer();
      }, 6000);

      return () => {
        clearInterval(timer);
      };
    }
  }, [evaTimeRemaining, isEVASafeReturned, tickEVATimer]);

  const getBPDisplay = () => {
    switch (bloodPressureStatus) {
      case 'stabilized':
        return {
          label: 'ضغط دم مستقر ومحمي (120/80)',
          color: 'text-emerald-300',
          border: 'border-emerald-400',
          bg: 'bg-emerald-950/80',
          icon: <ShieldCheck className="w-4 h-4 text-emerald-400" />
        };
      case 'low':
        return {
          label: 'ضغط منخفض / فقدان سوائل (90/55)',
          color: 'text-rose-400',
          border: 'border-rose-500',
          bg: 'bg-rose-950/80',
          icon: <AlertTriangle className="w-4 h-4 text-rose-400 animate-pulse" />
        };
      default:
        return {
          label: 'ضغط دم طبيعي (115/75)',
          color: 'text-cyan-300',
          border: 'border-cyan-500/50',
          bg: 'bg-space-900',
          icon: <Activity className="w-4 h-4 text-cyan-400" />
        };
    }
  };

  const bpInfo = getBPDisplay();

  return (
    <div className="bg-space-950/90 border-4 border-purple-500/50 rounded-3xl p-5 sm:p-6 backdrop-blur-xl shadow-2xl shadow-purple-950/30 flex flex-col justify-between relative overflow-hidden">
      <div>
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-space-800 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-purple-950 border border-purple-400 text-purple-300">
              <Clock className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-hud font-black text-base sm:text-lg text-white">
                  ساعة السير على سطح القمر وصحة الرائد ⏱️
                </h3>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-900/60 text-purple-200 border border-purple-500/40">
                  ساعة 1
                </span>
              </div>
              <p className="text-xs text-slate-300">
                مدة أكسجين بدلة الفضاء المتبقية للمهمة
              </p>
            </div>
          </div>

          <div className={`px-3 py-1 rounded-2xl border text-xs font-black flex items-center gap-1.5 ${
            evaTimeRemaining <= 1
              ? 'bg-rose-950 text-rose-300 border-rose-500 animate-pulse'
              : evaTimeRemaining <= 2
              ? 'bg-amber-950 text-amber-300 border-amber-500'
              : 'bg-space-900 text-purple-300 border-space-700'
          }`}>
            <Clock className="w-3.5 h-3.5" />
            <span>متبقي {evaTimeRemaining} ساعات</span>
          </div>
        </div>

        {/* Digital Wrist Chronometer Clock Display */}
        <div className="relative w-full bg-space-900/90 border-4 border-space-700 rounded-3xl p-4 my-3 text-center shadow-inner">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
            ساعة أكسجين السير القمري
          </div>
          <div className={`font-hud font-black text-4xl sm:text-5xl tracking-widest ${
            evaTimeRemaining <= 1
              ? 'text-rose-500 animate-pulse'
              : evaTimeRemaining <= 2
              ? 'text-amber-400'
              : 'text-white'
          }`}>
            0{evaTimeRemaining}:00 <span className="text-sm sm:text-base font-bold text-slate-400">ساعة</span>
          </div>

          {/* Time progress bar */}
          <div className="w-full h-3 bg-space-950 rounded-full overflow-hidden border border-space-700 mt-3 p-0.5">
            <motion.div
              className={`h-full rounded-full transition-all duration-500 ${
                evaTimeRemaining <= 1
                  ? 'bg-rose-600'
                  : evaTimeRemaining <= 2
                  ? 'bg-amber-500'
                  : 'bg-gradient-to-r from-purple-500 to-cyan-400'
              }`}
              style={{ width: `${(evaTimeRemaining / 10) * 100}%` }}
            />
          </div>
        </div>

        {/* 2 HOURS WARNING ALERT */}
        <AnimatePresence>
          {evaTimeRemaining === 2 && (
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-amber-950/90 border-2 border-amber-400 rounded-2xl p-3 mb-3 text-center"
            >
              <div className="flex items-center justify-center gap-1.5 text-amber-300 font-hud font-black text-xs sm:text-sm">
                <AlertTriangle className="w-4 h-4 animate-bounce text-amber-400" />
                <span>تحذير: أكسجين بدلة الفضاء يوشك على الانتهاء!</span>
              </div>
              <p className="text-[11px] text-slate-200 mt-1 font-bold">
                استعد لإنهاء الجولة القمرية. زوّد الرائد بماء الشرب من كيس البدلة (IDB) قبل دخول غرفة الإغلاق.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 1 HOUR CRITICAL RED ALERT WITH SIREN */}
        <AnimatePresence>
          {evaTimeRemaining <= 1 && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-rose-950 border-4 border-rose-500 rounded-3xl p-3.5 mb-3 text-center shadow-lg shadow-rose-950/60 animate-pulse"
            >
              <div className="flex items-center justify-center gap-1.5 text-rose-300 font-hud font-black text-xs sm:text-sm">
                <AlertOctagon className="w-5 h-5 animate-spin text-rose-400" />
                <span>خطر شديد! أعد رائد الفضاء فوراً للغرفة الهوائية!</span>
              </div>
              <p className="text-[11px] text-slate-100 mt-1 font-bold">
                احتياطي الأكسجين أقل من 10%! أكمل ترطيب الرائد وأغلق كابينة المحطة فوراً!
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Blood Pressure & Health Telemetry Card */}
        <div className={`border-2 rounded-2xl p-3.5 mb-4 ${bpInfo.bg} ${bpInfo.border} transition-colors text-right`}>
          <div className="flex items-center justify-between text-xs font-bold mb-1">
            <span className="flex items-center gap-1.5 text-slate-300">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span>ترطيب وضغط دم رائد الفضاء:</span>
            </span>
            <span className={`font-black flex items-center gap-1 ${bpInfo.color}`}>
              {bpInfo.icon}
              <span>{bpInfo.label}</span>
            </span>
          </div>

          <div className="text-[11px] text-slate-300 leading-relaxed mt-1.5 pt-1.5 border-t border-space-800">
            <div className="flex items-start gap-1.5">
              <Info className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
              <p className="text-[10px] text-slate-300 font-bold">
                <strong>حقيقة علمية من ناسا:</strong> أثناء السير الفضائي (EVA) يشرب الرائد الماء النقي من <strong>كيس الشرب داخل البدلة (IDB)</strong> لمنع الجفاف. أما بروتوكول شرب السوائل والأملاح فيُستخدم خصيصاً <strong>قبل الهبوط والعودة لجاذبية الأرض (1G)</strong> لمنع الدوار الهبوطي (وهنا ندمجهما كخطوة ترطيب مبسطة في اللعبة).
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Action Buttons: Administer Hydration & Conclude EVA */}
      <div className="space-y-2.5">
        {!isSalineAdministered ? (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            onClick={administerSaline}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-purple-500 via-pink-500 to-purple-400 hover:brightness-110 text-white font-hud font-black text-xs sm:text-sm tracking-wider shadow-lg shadow-purple-500/30 flex items-center justify-center gap-2"
          >
            <Syringe className="w-4 h-4" />
            <span>تزويد الرائد بماء كيس البدلة (IDB) وترطيب الجسم 💧</span>
          </motion.button>
        ) : (
          <div className="space-y-2">
            <div className="w-full py-2.5 px-4 rounded-xl bg-emerald-950/80 border border-emerald-400 text-emerald-300 text-xs font-black flex items-center justify-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>تم ترطيب الرائد عبر كيس البدلة (IDB): المؤشرات الحيوية مستقرة!</span>
            </div>

            {!isEVASafeReturned ? (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                onClick={concludeEVA}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-400 text-space-950 font-hud font-black text-xs sm:text-sm tracking-wide shadow-xl shadow-emerald-500/30 flex items-center justify-center gap-2 animate-pulse"
              >
                <LogOut className="w-4 h-4" />
                <span>إنهاء الجولة ودخول غرفة الإغلاق الهوائي 🚪</span>
              </motion.button>
            ) : (
              <div className="w-full py-3 px-4 rounded-xl bg-cyan-950 border border-cyan-400 text-cyan-300 text-xs font-black text-center">
                ✅ عاد رائد الفضاء بأمان داخل كابينة قاعدة القمر
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
