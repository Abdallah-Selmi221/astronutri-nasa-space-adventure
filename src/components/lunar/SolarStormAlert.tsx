import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameState } from '../../context/GameContext';
import { fetchSolarStormData } from '../../utils/nasaApi';
import { AnimatedRobo } from '../common/AnimatedRobo';
import { 
  Radio, 
  Activity, 
  Zap 
} from 'lucide-react';

export const SolarStormAlert: React.FC = () => {
  const { state, setSolarStormData, resolveTradeOff } = useGameState();
  const { isSolarStormActive, solarStormData } = state.level2State;
  const [loading, setLoading] = useState(false);

  // Fetch real NASA DONKI data or fallback when storm activates
  useEffect(() => {
    if (isSolarStormActive && !solarStormData) {
      setLoading(true);
      fetchSolarStormData().then((data) => {
        setSolarStormData(data);
        setLoading(false);
      });
    }
  }, [isSolarStormActive, solarStormData, setSolarStormData]);

  if (!isSolarStormActive) return null;

  const roboStormSpeech = 'إنذار رادار ناسا! عاصفة شمسية تقترب من القمر بسرعة فائقة! طاقة القاعدة تكفي لحاجة واحدة فقط: يا نشغل دروع الإشعاع لحماية حياة رائد الفضاء، يا نسيب لمبات المزرعة شغالة! ناسا تقدم صحة الإنسان دائماً، اختار بحكمة!';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
        {/* Pulsing red radar beacon */}
        <motion.div
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="absolute inset-0 bg-red-950/50 pointer-events-none"
        />

        <motion.div
          initial={{ scale: 0.85, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.85, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 240, damping: 20 }}
          className="relative z-10 w-full max-w-2xl bg-space-950 border-4 border-red-500 rounded-3xl p-5 sm:p-7 shadow-2xl shadow-red-600/50 text-center overflow-hidden my-auto"
        >
          {/* Animated Warning Stripe Banner */}
          <div className="absolute top-0 inset-x-0 h-3 bg-gradient-to-r from-red-600 via-amber-500 to-red-600 animate-pulse" />

          {/* Top Robo Warning in Egyptian Arabic */}
          <div className="mb-2 flex items-center justify-center">
            <AnimatedRobo
              state="WARNING"
              spokenText={roboStormSpeech}
              autoSpeak={true}
              size="sm"
              showSpeechBubble={true}
            />
          </div>

          <div className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full bg-red-950 border-2 border-red-500 text-red-300 text-xs font-black uppercase mb-2">
            <Radio className="w-4 h-4 animate-spin text-red-400" />
            <span>إنذار ناسا لطقس الفضاء الخارجي</span>
          </div>

          <h2 className="font-hud text-lg sm:text-2xl font-black text-red-500 tracking-wide leading-tight mb-2">
            إنذار رادار ناسا: عاصفة شمسية تقترب من القمر!
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 font-bold mb-4">
            انفجار كتلي إكليلي شمسي (CME) انطلق من الشمس نحو سطح القمر! في الفضاء لا يوجد غلاف جوي يحمينا، والإشعاع قد يكون خطيراً جداً!
          </p>

          {/* NASA DONKI Live Telemetry Box */}
          <div className="bg-space-900/90 border-2 border-space-700 rounded-2xl p-3.5 mb-4 text-right text-xs">
            <div className="flex items-center justify-between text-slate-400 border-b border-space-800 pb-2 mb-2">
              <span className="text-cyan-400 font-black flex items-center gap-1">
                <Activity className="w-3.5 h-3.5" />
                <span>بيانات أقمار ناسا الاصطناعية (DONKI API)</span>
              </span>
              <span className="text-[10px] text-amber-300 font-bold">
                {solarStormData?.isFallback ? 'محاكاة مرصد ناسا SOHO' : 'بيانات حية ومباشرة من ناسا'}
              </span>
            </div>

            {loading ? (
              <div className="py-3 text-center text-slate-400 animate-pulse">
                جاري الاتصال بشبكة أقمار ناسا للفضاء السحيق...
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300 font-bold">
                <div>
                  <span className="text-slate-400 block text-[10px]">تصنيف الانفجار الشمسي:</span>
                  <span className="text-rose-400 font-black">{solarStormData?.flareClass || 'فئة X2.8 عاصفة كبرى'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">سرعة العاصفة في الفضاء:</span>
                  <span className="text-amber-300 font-black">{solarStormData?.speedKmS || 1450} كم / ثانية</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">نوع المقذوف الشمسي:</span>
                  <span className="text-slate-200">{solarStormData?.eventType || 'انبعاث كتلي إكليلي هائل'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">منطقة البقعة الشمسية:</span>
                  <span className="text-slate-200">{solarStormData?.sourceLocation || 'البقعة النشطة AR3664'}</span>
                </div>
              </div>
            )}
          </div>

          {/* The Core Trade-Off Dilemma */}
          <div className="bg-red-950/40 border border-red-500/40 rounded-2xl p-3 mb-5 text-right text-xs text-slate-200 space-y-1">
            <span className="font-hud font-black text-amber-300 flex items-center gap-1.5">
              <Zap className="w-4 h-4" />
              <span>مفاضلة طاقة الطوارئ في القاعدة:</span>
            </span>
            <p className="text-[11px] text-slate-300 leading-relaxed font-bold">
              مولدات الطوارئ في محطة القمر تكفي لتشغيل <strong>نظام واحد فقط</strong>: يمكنك توجيه الكهرباء لدروع رائد الفضاء الكهرومغناطيسية، أو الإبقاء على إضاءة محاصيل المزرعة المائية! ما هو أمرك يا كابتن؟
            </p>
          </div>

          {/* TWO MASSIVE TRADE-OFF BUTTONS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* OPTION A: Power Radiation Shields (Correct Medical Choice) */}
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => resolveTradeOff('shields')}
              className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white font-hud text-right border-4 border-emerald-400 shadow-xl shadow-emerald-600/40 hover:brightness-110 transition-all flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-3xl">🛡️</span>
                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-400">
                  خيار ناسا الموصى به ⭐
                </span>
              </div>
              <h4 className="font-black text-sm sm:text-base leading-tight text-white mb-1">
                تفعيل دروع الإشعاع 🛡️
              </h4>
              <p className="text-xs text-emerald-100 font-sans font-bold leading-snug">
                حماية حياة رائد الفضاء! صحة الرائد تبقى 100% (وتنطفئ إضاءة المزرعة مؤقتاً بنسبة 10%).
              </p>
            </motion.button>

            {/* OPTION B: Keep Farm Lights On (Wrong Choice) */}
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => resolveTradeOff('farm')}
              className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-amber-700 to-orange-800 text-white font-hud text-right border-4 border-amber-400 shadow-xl shadow-amber-700/40 hover:brightness-110 transition-all flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-3xl">🥬</span>
                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-400">
                  أولوية الخضروات
                </span>
              </div>
              <h4 className="font-black text-sm sm:text-base leading-tight text-white mb-1">
                الإبقاء على لمبات المزرعة 🥬
              </h4>
              <p className="text-xs text-amber-100 font-sans font-bold leading-snug">
                تحفظ 100% من النباتات، ولكن يصاب رائد الفضاء بدوار إشعاعي وتنخفض صحته إلى 50%!
              </p>
            </motion.button>

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
