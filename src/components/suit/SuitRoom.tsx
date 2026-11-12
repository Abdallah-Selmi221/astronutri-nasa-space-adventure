import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useGameState } from '../../context/GameContext';
import { soundManager } from '../../utils/sound';
import { AnimatedRobo } from '../common/AnimatedRobo';
import { 
  ArrowRight, 
  Wind, 
  Sun, 
  Link2, 
  Sparkles, 
  ArrowLeft
} from 'lucide-react';

export const SuitRoom: React.FC = () => {
  const { 
    state, 
    setLocation, 
    setO2Pressure, 
    toggleSuitEquipment, 
    completeSuitMission,
    isSuitReadyForEVA 
  } = useGameState();

  const { suitState, cadetName } = state;
  const [showCelebration, setShowCelebration] = useState(false);

  // Pressure evaluation in Egyptian Arabic
  const getPressureFeedback = () => {
    const psi = suitState.o2PressurePSI;
    if (psi < 3.8) {
      return {
        label: 'خطر نقص الأكسجين (الضغط منخفض جداً!)',
        tip: 'الهواء رقيق جداً! ارفع منظم الأكسجين واقترب من 4.3 PSI.',
        color: 'text-amber-400',
        bg: 'bg-amber-950/80 border-amber-500'
      };
    }
    if (psi > 4.8) {
      return {
        label: 'خطر انتفاخ البدلة (الضغط عالي جداً!)',
        tip: 'البدلة ستنتفخ مثل إطار السيارة الحديدي ولن تستطيع تحريك يدك! قلل الضغط نحو 4.3 PSI.',
        color: 'text-rose-400',
        bg: 'bg-rose-950/80 border-rose-500'
      };
    }
    if (suitState.isO2Calibrated) {
      return {
        label: 'الضغط الذهبي المثالي 4.3 PSI! 🌟',
        tip: 'هذا هو ضغط الأكسجين النقي المعتمد في بدلات ناسا! تنفس رائع وحركة سهلة.',
        color: 'text-emerald-300',
        bg: 'bg-emerald-950/80 border-emerald-400'
      };
    }
    return {
      label: 'جاري الضبط...',
      tip: 'اضبط المنظم على 4.3 PSI.',
      color: 'text-cyan-400',
      bg: 'bg-space-900 border-space-700'
    };
  };

  const pressureStatus = getPressureFeedback();

  const handleCompleteEVA = () => {
    soundManager.playFanfare();
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
    completeSuitMission();
    setShowCelebration(true);
  };

  const roboSuitSpeech = 'عظيم يا بطل! دلوقتي في غرفة بدلة الفضاء، لازم نقفل قناع الخوذة الذهبي لحماية عينك من أشعة الشمس، ونظبط ضغط الأكسجين بالظبط على 4.3 PSI، ونفحص طبقات الحماية ونربط حبل الأمان!';

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
              غرفة تجهيز بدلة الفضاء <span className="text-cyan-400">👨‍🚀</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300">
              المرحلة 2: ضبط ضغط الأكسجين وفحص الخوذة الذهبية وحبل الأمان
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-space-900/90 px-4 py-2 rounded-2xl border-2 border-cyan-500/40 text-xs sm:text-sm font-black">
          <span className="text-slate-400">حالة البدلة:</span>
          <span className={isSuitReadyForEVA ? 'text-emerald-400 animate-pulse' : 'text-amber-400'}>
            {isSuitReadyForEVA ? 'جاهزة 100% للسير في الفضاء ✅' : 'الفحص غير مكتمل ⚠️'}
          </span>
        </div>
      </div>

      {/* Robo Companion Advice */}
      <div className="mb-6 p-4 rounded-3xl bg-gradient-to-r from-sky-950 via-space-900 to-cyan-950 border-2 border-cyan-400/40 shadow-xl flex flex-col sm:flex-row items-center gap-4">
        <div className="shrink-0">
          <AnimatedRobo
            state={isSuitReadyForEVA ? 'HAPPY' : 'EXPLAINING'}
            size="sm"
            showSpeechBubble={false}
          />
        </div>
        <div className="flex-1 text-right">
          <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-cyan-900/80 text-cyan-200 border border-cyan-400/40 mb-1 inline-block">
            إرشادات روبو لبدلة الفضاء 🤖
          </span>
          <p className="text-xs sm:text-sm text-slate-200 font-bold leading-relaxed">
            &ldquo;{roboSuitSpeech}&rdquo;
          </p>
        </div>
      </div>

      {/* Main Grid: Spacesuit Avatar Hologram + Interactive Checklist Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Interactive Spacesuit Hologram (5 cols) */}
        <div className="lg:col-span-5 bg-space-950/90 border-4 border-cyan-500/50 rounded-3xl p-6 backdrop-blur-xl shadow-2xl shadow-cyan-950/30 flex flex-col items-center justify-center relative overflow-hidden min-h-[460px]">
          {/* Hologram scanlines effect */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent pointer-events-none animate-pulse-slow" />

          {/* Spacesuit Display */}
          <div className="relative z-10 flex flex-col items-center">
            {/* Helmet & Visor */}
            <motion.div
              animate={{ 
                scale: suitState.helmetVisorLocked ? 1.05 : 1,
                borderColor: suitState.helmetVisorLocked ? '#10b981' : '#38bdf8'
              }}
              className="w-32 h-32 rounded-full border-4 flex items-center justify-center relative transition-all duration-300 shadow-2xl bg-space-900/90 p-3"
            >
              <img
                src="/assets/ui/helmet-3d.svg"
                alt="خوذة رائد الفضاء"
                className={`w-full h-full object-contain transition-all duration-300 ${
                  suitState.helmetVisorLocked ? 'drop-shadow-[0_0_20px_rgba(16,185,129,0.6)]' : 'opacity-80'
                }`}
              />

              {suitState.helmetVisorLocked && (
                <div className="absolute -top-2 px-2.5 py-0.5 rounded-full bg-emerald-950 border border-emerald-400 text-emerald-300 text-[10px] font-black animate-pulse">
                  تم إغلاق القناع الذهبي 🔒
                </div>
              )}
            </motion.div>

            {/* Torso & Backpack (O2 Tanks) */}
            <div className="w-48 h-40 mt-3 rounded-2xl bg-space-900/90 border-2 border-space-700 p-3.5 flex flex-col items-center justify-between relative shadow-lg">
              <div className="flex items-center justify-between w-full text-xs font-bold text-slate-300 border-b border-space-800 pb-1">
                <span>حقيبة دعم الحياة xEMU</span>
                <span className={suitState.isO2Calibrated ? 'text-emerald-400 font-black' : 'text-amber-400'}>
                  {suitState.o2PressurePSI} PSI
                </span>
              </div>

              {/* O2 level indicator */}
              <div className="w-full flex items-center gap-2">
                <Wind className="w-4 h-4 text-cyan-400 animate-pulse" />
                <div className="flex-1 h-3 bg-space-950 rounded-full overflow-hidden border border-cyan-800">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-300"
                    style={{ width: `${Math.min(100, (suitState.o2PressurePSI / 6) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Suit layers status icons */}
              <div className="flex items-center justify-around w-full pt-1.5 border-t border-space-800 text-xs">
                <span className={`flex items-center gap-1 ${suitState.thermalLayersInspected ? 'text-emerald-400 font-bold' : 'text-slate-500'}`}>
                  <Sun className="w-3.5 h-3.5" />
                  <span>14 طبقة</span>
                </span>
                <span className={`flex items-center gap-1 ${suitState.safetyTetherLatched ? 'text-emerald-400 font-bold' : 'text-slate-500'}`}>
                  <Link2 className="w-3.5 h-3.5" />
                  <span>حبل الأمان</span>
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 text-center">
            <span className="text-xs font-bold text-slate-300">
              مجسم فحص البدلة التفاعلي
            </span>
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Checklist Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* ITEM 1: Helmet Gold-Coated Visor Lock */}
          <div className={`p-4 sm:p-5 rounded-3xl border-2 transition-all ${
            suitState.helmetVisorLocked
              ? 'bg-emerald-950/60 border-emerald-400 text-white'
              : 'bg-space-950/80 border-space-800 text-slate-200'
          }`}>
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">🪖</span>
                <div>
                  <h4 className="font-hud font-black text-sm sm:text-base text-white">
                    1. إغلاق قناع الخوذة المطلي بالذهب
                  </h4>
                  <p className="text-xs text-slate-300">
                    طبقة رقيقة من الذهب الخالص تحمي عيون الرائد من أشعة الشمس فوق البنفسجية الحارقة.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => toggleSuitEquipment('helmetVisorLocked')}
                className={`px-4 py-2 rounded-2xl text-xs font-black shadow-md transition-all active:scale-95 shrink-0 ${
                  suitState.helmetVisorLocked
                    ? 'bg-emerald-500 text-space-950'
                    : 'bg-gradient-to-r from-amber-400 to-orange-500 text-space-950'
                }`}
              >
                {suitState.helmetVisorLocked ? 'مغلق ومحمي ✅' : 'إغلاق القناع 🔒'}
              </button>
            </div>
          </div>

          {/* ITEM 2: Oxygen Regulator (Slider 1.0 to 6.0 PSI with 4.3 Goldilocks Zone) */}
          <div className={`p-4 sm:p-5 rounded-3xl border-2 transition-all ${
            suitState.isO2Calibrated
              ? 'bg-emerald-950/60 border-emerald-400 text-white'
              : 'bg-space-950/80 border-space-800 text-slate-200'
          }`}>
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">💨</span>
                <div>
                  <h4 className="font-hud font-black text-sm sm:text-base text-white">
                    2. ضبط منظم ضغط الأكسجين النقي
                  </h4>
                  <p className="text-xs text-slate-300">
                    المعيار الذهبي لناسا هو <strong className="text-cyan-300">4.3 PSI</strong> لسهولة الحركة والتنفس.
                  </p>
                </div>
              </div>

              <span className={`px-3 py-1 rounded-2xl text-xs font-black border ${pressureStatus.bg} ${pressureStatus.color}`}>
                {suitState.o2PressurePSI} PSI
              </span>
            </div>

            {/* Slider */}
            <div className="my-3">
              <input
                type="range"
                min="1.0"
                max="6.0"
                step="0.1"
                value={suitState.o2PressurePSI}
                onChange={(e) => setO2Pressure(parseFloat(e.target.value))}
                className="w-full h-3 bg-space-900 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
              <div className="flex justify-between text-[10px] font-bold text-slate-400 mt-1">
                <span>1.0 منخفض</span>
                <span className="text-emerald-400 font-black">الهدف: 4.3 PSI ⭐</span>
                <span>6.0 مرتفع</span>
              </div>
            </div>

            <p className={`text-xs font-bold mt-1 ${pressureStatus.color}`}>
              {pressureStatus.tip}
            </p>
          </div>

          {/* ITEM 3: 14-Layer Thermal Micrometeorite Garment */}
          <div className={`p-4 sm:p-5 rounded-3xl border-2 transition-all ${
            suitState.thermalLayersInspected
              ? 'bg-emerald-950/60 border-emerald-400 text-white'
              : 'bg-space-950/80 border-space-800 text-slate-200'
          }`}>
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">🛡️</span>
                <div>
                  <h4 className="font-hud font-black text-sm sm:text-base text-white">
                    3. فحص الـ 14 طبقة للحماية الحرارية
                  </h4>
                  <p className="text-xs text-slate-300">
                    طبقات مايلر وألياف تحمي الرائد من درجات حرارة الفضاء القاسية (-150°C إلى +120°C)!
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => toggleSuitEquipment('thermalLayersInspected')}
                className={`px-4 py-2 rounded-2xl text-xs font-black shadow-md transition-all active:scale-95 shrink-0 ${
                  suitState.thermalLayersInspected
                    ? 'bg-emerald-500 text-space-950'
                    : 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white'
                }`}
              >
                {suitState.thermalLayersInspected ? 'تم الفحص ✅' : 'فحص الطبقات'}
              </button>
            </div>
          </div>

          {/* ITEM 4: Safety Tether Latch */}
          <div className={`p-4 sm:p-5 rounded-3xl border-2 transition-all ${
            suitState.safetyTetherLatched
              ? 'bg-emerald-950/60 border-emerald-400 text-white'
              : 'bg-space-950/80 border-space-800 text-slate-200'
          }`}>
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">🪢</span>
                <div>
                  <h4 className="font-hud font-black text-sm sm:text-base text-white">
                    4. ربط حبل الأمان الصلب بالمركبة
                  </h4>
                  <p className="text-xs text-slate-300">
                    حبل أمان يمنع الرائد من الانجراف والضياع في ظلمة الفضاء السحيق!
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => toggleSuitEquipment('safetyTetherLatched')}
                className={`px-4 py-2 rounded-2xl text-xs font-black shadow-md transition-all active:scale-95 shrink-0 ${
                  suitState.safetyTetherLatched
                    ? 'bg-emerald-500 text-space-950'
                    : 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white'
                }`}
              >
                {suitState.safetyTetherLatched ? 'مربوط ومؤمن ✅' : 'ربط الحبل 🔗'}
              </button>
            </div>
          </div>

          {/* Master Complete Button */}
          {isSuitReadyForEVA ? (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleCompleteEVA}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 text-space-950 font-hud font-black text-base tracking-wide shadow-2xl shadow-emerald-500/40 flex items-center justify-center gap-2 animate-pulse"
            >
              <Sparkles className="w-6 h-6" />
              <span>البدلة جاهزة 100%! اعتمد الفحص وافتح المحرك 🚀</span>
            </motion.button>
          ) : (
            <div className="p-3.5 bg-space-950/80 border-2 border-space-800 rounded-2xl text-center text-xs text-amber-300 font-bold">
              ⚠️ يجب إتمام جميع الفحوصات الأربعة وضبط الضغط على 4.3 PSI لفتح بوابة الخروج.
            </div>
          )}

        </div>
      </div>

      {/* Success Celebration Modal */}
      <AnimatePresence>
        {showCelebration && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="w-full max-w-md bg-space-950 border-4 border-cyan-400 rounded-3xl p-6 text-center shadow-2xl"
            >
              <div className="w-16 h-16 rounded-full bg-cyan-950 border-2 border-cyan-400 flex items-center justify-center text-3xl mx-auto mb-3">
                👨‍🚀
              </div>
              <h3 className="font-hud font-black text-2xl text-white mb-2">
                أحسنت يا كابتن {cadetName}!
              </h3>
              <p className="text-sm text-slate-300 mb-5 leading-relaxed font-bold">
                بدلة الفضاء آمنة ومجهزة بالكامل للسير في الفضاء! تم فتح غرفة المحرك والطاقة.
              </p>
              <button
                onClick={() => {
                  setShowCelebration(false);
                  setLocation('EngineRoom');
                }}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 text-space-950 font-black text-sm shadow-lg flex items-center justify-center gap-2"
              >
                <span>الانتقال لغرفة المحرك ⚡</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
