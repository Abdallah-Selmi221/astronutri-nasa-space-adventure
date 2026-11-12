import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useGameState } from '../../context/GameContext';
import { AnimatedRobo } from '../common/AnimatedRobo';
import { 
  ArrowRight, 
  Rocket, 
  AlertTriangle, 
  RotateCcw, 
  CheckCircle2, 
  Wine,
  Star,
  ArrowLeft
} from 'lucide-react';

export const LaunchPad: React.FC = () => {
  const { 
    state, 
    setLocation, 
    updateQTEPos, 
    checkQTESip, 
    retryQTE, 
    triggerBlastOff, 
    completeLevel1,
    startLevel2
  } = useGameState();

  const { launchPadState, cadetName, cargoWeight, o2Level, fuelLevel } = state;
  const { 
    qteIndicatorPos, 
    qteSipSuccess, 
    isLiquidSpilled, 
    isBlastingOff, 
    isLevel1Complete 
  } = launchPadState;

  const animRef = useRef<number | null>(null);
  const posRef = useRef(0);
  const dirRef = useRef(1);

  useEffect(() => {
    if (!qteSipSuccess && !isLiquidSpilled) {
      const speed = 1.35;

      const loop = () => {
        posRef.current += speed * dirRef.current;
        if (posRef.current >= 100) {
          posRef.current = 100;
          dirRef.current = -1;
        } else if (posRef.current <= 0) {
          posRef.current = 0;
          dirRef.current = 1;
        }

        updateQTEPos(posRef.current);
        animRef.current = requestAnimationFrame(loop);
      };

      animRef.current = requestAnimationFrame(loop);
    } else {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    }

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [qteSipSuccess, isLiquidSpilled, updateQTEPos]);

  const handleSipAttempt = () => {
    checkQTESip();
  };

  const handleLaunchRocket = () => {
    triggerBlastOff();

    setTimeout(() => {
      confetti({
        particleCount: 150,
        spread: 90,
        origin: { y: 0.5 }
      });
      completeLevel1();
    }, 3500);
  };

  const roboLaunchSpeech = 'جاهز للإقلاع الصاروخي يا بطل؟ بس استنى عندك! قبل ما ننطلق لازم تشرب عصير الأملاح المضاد لدوار الفضاء بدقة لما المؤشر يوصل للمنطقة الخضراء.. اوعى ينسكب منك!';

  return (
    <div className="w-full max-w-7xl mx-auto py-6 px-3 sm:px-6 flex flex-col flex-1 relative overflow-hidden">
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
              منصة انطلاق الصاروخ الكبرى <span className="text-cyan-400">🚀</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300">
              المرحلة 4: شرب عصير مقاومة دوار الفضاء والانطلاق لمدار القمر
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-space-900/90 px-4 py-2 rounded-2xl border-2 border-cyan-500/40 text-xs sm:text-sm font-black">
          <span className="text-slate-400">العد التنازلي:</span>
          <span className={isLevel1Complete ? 'text-emerald-400' : 'text-cyan-400'}>
            {isLevel1Complete ? 'تم الوصول لمدار القمر بنجاح! 🌕' : isBlastingOff ? 'جاري الإقلاع الصاروخي الآن! 🔥' : 'فحص الجاهزية قبل الإقلاع'}
          </span>
        </div>
      </div>

      {/* Robo Guidance Banner */}
      <div className="mb-6 p-4 rounded-3xl bg-gradient-to-r from-sky-950 via-space-900 to-indigo-950 border-2 border-cyan-400/40 shadow-xl flex flex-col sm:flex-row items-center gap-4">
        <div className="shrink-0">
          <AnimatedRobo
            state={isLevel1Complete ? 'CELEBRATING' : qteSipSuccess ? 'HAPPY' : isLiquidSpilled ? 'WARNING' : 'EXPLAINING'}
            size="sm"
            showSpeechBubble={false}
          />
        </div>
        <div className="flex-1 text-right">
          <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-cyan-900/80 text-cyan-200 border border-cyan-400/40 mb-1 inline-block">
            إرشادات روبو لمنصة الإطلاق 🤖
          </span>
          <p className="text-xs sm:text-sm text-slate-200 font-bold leading-relaxed">
            &ldquo;{isLiquidSpilled ? 'حاسب يا بطل! السوائل بتطير في انعدام الجاذبية وتدخل في أجهزة التحكم! جرب تشرب تاني بدقة!' : qteSipSuccess ? 'يا سلام عليك! شربت العصير بدقة والمعدة مستقرة.. اضغط زر الإطلاق الصاروخي!' : roboLaunchSpeech}&rdquo;
          </p>
        </div>
      </div>

      {/* ACTIVE BLAST OFF ANIMATION SCREEN */}
      {isBlastingOff && !isLevel1Complete && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 z-40 bg-space-950 flex flex-col items-center justify-center p-6 text-center"
        >
          <motion.div
            initial={{ y: 250, scale: 0.8 }}
            animate={{ y: -250, scale: 1.3 }}
            transition={{ duration: 3.5, ease: 'easeInOut' }}
            className="relative flex flex-col items-center"
          >
            <div className="w-36 h-36 sm:w-44 sm:h-44 filter drop-shadow-[0_0_40px_rgba(0,255,136,0.9)]">
              <img
                src="/assets/ui/rocket-3d.svg"
                alt="صاروخ الفضاء"
                className="w-full h-full object-contain"
              />
            </div>
            <motion.div
              animate={{ height: [40, 90, 50], opacity: [0.8, 1, 0.9] }}
              transition={{ repeat: Infinity, duration: 0.2 }}
              className="w-10 bg-gradient-to-b from-orange-400 via-amber-300 to-transparent rounded-b-full filter blur-xs"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 0.8 }}
            className="mt-8 font-hud font-black text-2xl sm:text-4xl text-amber-300 tracking-wider"
          >
            الإقلاع مستمر! الصاروخ يشق الفضاء نحو القمر! 🚀🔥
          </motion.div>
        </motion.div>
      )}

      {/* Main Launch Pad Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch flex-1">
        
        {/* LEFT COLUMN: Mission Verification Telemetry (4 cols) */}
        <div className="lg:col-span-4 bg-space-950/90 border-4 border-cyan-500/50 rounded-3xl p-5 sm:p-6 backdrop-blur-xl shadow-2xl flex flex-col justify-between">
          <div>
            <h3 className="font-hud font-black text-base sm:text-lg text-white mb-4 border-b border-space-800 pb-2 flex items-center gap-2">
              <span>فحص جاهزية الرحلة</span>
              <span className="text-xs text-cyan-400">✅</span>
            </h3>

            <div className="space-y-3 text-xs sm:text-sm font-bold">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-space-900/80 border border-space-800">
                <span className="flex items-center gap-2 text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>حقيبة وجبات الفضاء:</span>
                </span>
                <span className="text-emerald-400 font-black">{cargoWeight}% معبأة</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-space-900/80 border border-space-800">
                <span className="flex items-center gap-2 text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>ضغط بدلة الفضاء:</span>
                </span>
                <span className="text-emerald-400 font-black">4.3 PSI مثالي</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-space-900/80 border border-space-800">
                <span className="flex items-center gap-2 text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>خلايا الوقود الصاروخي:</span>
                </span>
                <span className="text-amber-400 font-black">{fuelLevel}% ممتلئة</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-space-900/80 border border-space-800">
                <span className="flex items-center gap-2 text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>تنقية الأكسجين:</span>
                </span>
                <span className="text-cyan-400 font-black">{o2Level}% نقي</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-space-800 text-center">
            <span className="text-[11px] font-bold text-slate-400">
              كابتن الرحلة: <strong className="text-yellow-300">{cadetName}</strong>
            </span>
          </div>
        </div>

        {/* RIGHT COLUMN: Zero-G Electrolyte Hydration Quick-Time Event (8 cols) */}
        <div className="lg:col-span-8 bg-space-950/90 border-4 border-cyan-500/50 rounded-3xl p-5 sm:p-6 backdrop-blur-xl shadow-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-space-800 pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-purple-950 border border-purple-400 text-purple-300">
                  <Wine className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-hud font-black text-base sm:text-lg text-white">
                    تحدي شرب عصير مقاومة دوار الفضاء (Zero-G QTE)
                  </h3>
                  <p className="text-xs text-slate-300">
                    اضغط زر الشرب بدقة متناهية عندما يصل المؤشر إلى المنطقة الخضراء!
                  </p>
                </div>
              </div>

              <span className={`text-xs font-black px-3 py-1 rounded-2xl border ${
                qteSipSuccess
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-400'
                  : isLiquidSpilled
                  ? 'bg-rose-950 text-rose-300 border-rose-500'
                  : 'bg-space-900 text-amber-300 border-space-700'
              }`}>
                {qteSipSuccess ? 'تم الشرب بأمان ✅' : isLiquidSpilled ? 'انسكب العصير! ⚠️' : 'جاهز للرشف...'}
              </span>
            </div>

            {/* Moving Indicator Track */}
            <div className="relative w-full h-14 bg-space-900 rounded-2xl border-4 border-space-700 my-6 overflow-hidden shadow-inner p-1">
              {/* Green Zone (42% to 58%) */}
              <div
                className="absolute top-1 bottom-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 rounded-xl border-2 border-emerald-300 shadow-lg shadow-emerald-500/40 flex items-center justify-center"
                style={{ right: '42%', left: '42%' }}
              >
                <span className="text-[10px] font-black text-space-950 uppercase tracking-wider hidden sm:inline">
                  المنطقة الخضراء ⭐
                </span>
              </div>

              {/* Red Danger Flanks */}
              <div className="absolute top-1 bottom-1 right-1 w-[40%] bg-rose-950/40 border border-rose-900/40 rounded-r-xl" />
              <div className="absolute top-1 bottom-1 left-1 w-[40%] bg-rose-950/40 border border-rose-900/40 rounded-l-xl" />

              {/* Oscillating Needle Indicator */}
              <div
                className="absolute top-0 bottom-0 w-2.5 bg-yellow-300 border-2 border-white rounded-full shadow-xl shadow-yellow-300/80 z-20"
                style={{ right: `${qteIndicatorPos}%` }}
              />
            </div>

            {/* Liquid Spill Warning Message */}
            {isLiquidSpilled && (
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="p-4 bg-rose-950/80 border-2 border-rose-500 rounded-2xl text-center mb-4"
              >
                <div className="flex items-center justify-center gap-2 text-rose-300 font-hud font-black text-sm mb-1">
                  <AlertTriangle className="w-5 h-5 text-rose-400 animate-bounce" />
                  <span>حاسب! السوائل بتطير في الفضاء وتدخل في لوحات التحكم!</span>
                </div>
                <p className="text-xs text-rose-200 mb-3 font-bold">
                  في انعدام الجاذبية، القطرات تطير وتتسلل للأسلاك الحساسة وتعمل ماس كهربائي!
                </p>
                <button
                  type="button"
                  onClick={retryQTE}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs shadow-lg inline-flex items-center gap-1.5"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>إعادة المحاولة ومسح القطرات</span>
                </button>
              </motion.div>
            )}

            {/* QTE Success Notice */}
            {qteSipSuccess && (
              <div className="p-4 bg-emerald-950/80 border-2 border-emerald-400 rounded-2xl text-center mb-4 text-emerald-300 text-xs font-bold flex items-center justify-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>ممتاز! تم شرب عصير الأملاح بنجاح، وامتص جسمك السوائل للحماية من دوار الحركة!</span>
              </div>
            )}
          </div>

          {/* Interactive Action Buttons */}
          <div className="mt-4">
            {!qteSipSuccess ? (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSipAttempt}
                disabled={isLiquidSpilled}
                className={`w-full py-4 px-6 rounded-2xl font-hud font-black text-base sm:text-lg tracking-wide shadow-xl flex items-center justify-center gap-2 transition-all ${
                  isLiquidSpilled
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'
                    : 'bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 text-white shadow-purple-500/40 hover:brightness-110 active:scale-95 animate-pulse'
                }`}
              >
                <Wine className="w-6 h-6" />
                <span>اشرب العصير الآن! (اضغط في المنطقة الخضراء)</span>
              </motion.button>
            ) : (
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={handleLaunchRocket}
                disabled={isBlastingOff}
                className="w-full py-4 px-6 rounded-3xl bg-gradient-to-r from-amber-400 via-orange-500 to-yellow-400 text-space-950 font-hud font-black text-lg sm:text-xl tracking-wider shadow-2xl shadow-orange-500/60 border-4 border-yellow-200 flex items-center justify-center gap-3 animate-pulse"
              >
                <Rocket className="w-7 h-7 fill-current" />
                <span>إطلاق الصاروخ نحو القمر! 🚀🔥</span>
              </motion.button>
            )}
          </div>
        </div>

      </div>

      {/* FINAL LEVEL 1 VICTORY POPUP */}
      <AnimatePresence>
        {isLevel1Complete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-lg bg-gradient-to-b from-space-900 via-sky-950 to-space-950 border-4 border-amber-400 rounded-3xl p-6 sm:p-8 text-center shadow-2xl shadow-amber-500/40"
            >
              <div className="w-20 h-20 rounded-full bg-amber-500/20 border-4 border-amber-400 flex items-center justify-center text-4xl mx-auto mb-4 animate-bounce">
                🏆
              </div>

              <div className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full bg-amber-950 border border-amber-400 text-yellow-300 font-black text-xs uppercase mb-2">
                <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                <span>اكتمل المستوى الأول بنجاح باهر!</span>
                <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
              </div>

              <h3 className="font-hud font-black text-2xl sm:text-3xl text-white mb-2">
                وصلت لمدار القمر يا كابتن {cadetName}! 🌕
              </h3>

              <p className="text-xs sm:text-sm text-slate-300 mb-6 leading-relaxed font-bold">
                أنت الآن جاهز لقيادة <strong className="text-yellow-300">المستوى 2: قاعدة عمليات القمر</strong> وإدارة تدوير المياه ونظام ECLSS ومواجهة العاصفة الشمسية!
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={startLevel2}
                  className="py-3.5 px-5 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-yellow-400 text-space-950 font-hud font-black text-sm shadow-xl flex items-center justify-center gap-2 hover:brightness-110 active:scale-95"
                >
                  <span>دخول قاعدة القمر (المستوى 2)</span>
                  <ArrowLeft className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setLocation('Map')}
                  className="py-3.5 px-5 rounded-2xl bg-space-800 hover:bg-space-700 border-2 border-space-600 text-white font-black text-sm"
                >
                  العودة لخريطة المحطة
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
