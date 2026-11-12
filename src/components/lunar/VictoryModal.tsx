import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useGameState } from '../../context/GameContext';
import { AnimatedRobo } from '../common/AnimatedRobo';
import { 
  Award, 
  RotateCcw, 
  Sparkles, 
  CheckCircle2, 
  Droplets, 
  Activity, 
  Heart, 
  Sprout,
  ArrowRight
} from 'lucide-react';

export const VictoryModal: React.FC = () => {
  const { state, dismissVictoryModal, resetGameFull, setLocation } = useGameState();
  const { level2State, cadetName } = state;
  const { 
    isGameVictoryModalOpen, 
    astronautHealthPercent, 
    lunarFarmHealthPercent, 
    tradeOffChoice 
  } = level2State;

  useEffect(() => {
    if (isGameVictoryModalOpen) {
      const duration = 3.5 * 1000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.7 },
          colors: ['#00F0FF', '#39FF14', '#FFE600', '#FF007F', '#A855F7']
        });
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.7 },
          colors: ['#00F0FF', '#39FF14', '#FFE600', '#FF007F', '#A855F7']
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };

      frame();
    }
  }, [isGameVictoryModalOpen]);

  if (!isGameVictoryModalOpen) return null;

  const handlePlayAgain = () => {
    resetGameFull();
  };

  const handleReturnToMap = () => {
    dismissVictoryModal();
    setLocation('Map');
  };

  const roboVictorySpeech = 'مبروووك يا كابتن! 🚀✨ أدرت قاعدة القمر كعالم حقيقي من وكالة ناسا! حميت حياة الطاقم، وأصلحت تدوير المياه، واستحقيت وسام بطل الفضاء للأغذية والعلوم!';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-lg overflow-y-auto">
        {/* Golden particle radiant background */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.15, 0.35, 0.15],
            rotate: [0, 90, 180, 270, 360]
          }}
          transition={{ repeat: Infinity, duration: 20, ease: 'linear' }}
          className="absolute w-[600px] h-[600px] rounded-full bg-gradient-to-r from-yellow-500/30 via-amber-500/20 to-purple-600/30 blur-3xl pointer-events-none"
        />

        <motion.div
          initial={{ scale: 0.75, opacity: 0, y: 40 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: 'spring', damping: 22, stiffness: 220 }}
          className="relative z-10 w-full max-w-2xl bg-gradient-to-b from-space-900 via-space-950 to-black border-4 border-yellow-400 rounded-3xl p-5 sm:p-8 text-center shadow-2xl shadow-yellow-500/40 overflow-hidden my-auto"
        >
          {/* Golden Ribbon Banner */}
          <div className="absolute top-0 inset-x-0 h-3 bg-gradient-to-r from-yellow-500 via-amber-300 to-yellow-500 shadow-md" />

          {/* Animated Robo Celebrating */}
          <div className="mb-2 flex items-center justify-center">
            <AnimatedRobo
              state="CELEBRATING"
              spokenText={roboVictorySpeech}
              autoSpeak={true}
              size="sm"
              showSpeechBubble={true}
            />
          </div>

          {/* Glowing Golden Space Hero Medal */}
          <div className="relative mb-4 flex items-center justify-center">
            <motion.div
              animate={{ scale: [1, 1.18, 1], opacity: [0.4, 0.8, 0.4] }}
              transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
              className="absolute w-28 h-28 rounded-full bg-yellow-400/30 blur-xl"
            />

            <motion.div
              animate={{ rotate: [0, -3, 3, 0] }}
              transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
              className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-tr from-yellow-500 via-amber-400 to-yellow-200 border-4 border-yellow-100 flex items-center justify-center shadow-2xl shadow-yellow-500/60"
            >
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-2 border-dashed border-amber-900/60 flex flex-col items-center justify-center text-space-950">
                <span className="text-3xl sm:text-4xl">🏅</span>
                <span className="text-[10px] font-black tracking-widest text-amber-950 uppercase mt-0.5">
                  بطل ناسا
                </span>
              </div>

              <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-yellow-200 animate-spin" />
              <Sparkles className="absolute -bottom-2 -left-2 w-5 h-5 text-amber-300 animate-bounce" />
            </motion.div>
          </div>

          {/* Subtitle Badge */}
          <div className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full bg-yellow-400/20 border border-yellow-400/60 text-yellow-300 text-xs font-black uppercase mb-2">
            <Award className="w-4 h-4" />
            <span>وسام بطل الفضاء للأغذية والعلوم • ناسا 🏅</span>
          </div>

          {/* Cadet Recognition Header */}
          <h2 className="font-hud text-xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-yellow-400 to-amber-300 tracking-wide mb-3">
            المهمة اكتملت بنجاح، يا كابتن {cadetName}!
          </h2>

          {/* Exact User-Specified Congratulatory Text in Arabic and English */}
          <div className="bg-yellow-950/40 border-2 border-yellow-500/40 rounded-2xl p-4 sm:p-5 mb-5 shadow-inner text-right">
            <p className="text-sm sm:text-base text-yellow-100 font-bold leading-relaxed mb-2">
              &ldquo;تهانينا يا كابتن! 🚀✨ لقد أدرت قاعدة القمر كعالم حقيقي من وكالة ناسا! تحكمت في الأكسجين، وأصلحت نظام تدوير المياه، وحميت الطاقم من الإشعاع الشمسي!&rdquo;
            </p>
            <p className="text-[11px] text-yellow-300/80 font-sans italic" style={{ direction: 'ltr', textAlign: 'left' }}>
              &ldquo;Congratulations Captain! 🚀✨ You managed the Lunar Outpost like a true NASA scientist! You managed oxygen, fixed the ECLSS water recovery, and protected the crew from solar radiation.&rdquo;
            </p>
          </div>

          {/* Mission Debrief / Scientific Achievements Log */}
          <div className="bg-space-900/90 border-2 border-space-700 rounded-2xl p-4 mb-6 text-right">
            <span className="text-xs text-slate-300 block font-black mb-3 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>سجل إنجازات قاعدة أرتميس الرسمية:</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs font-bold">
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-space-950/80 border border-space-800">
                <Droplets className="w-4 h-4 text-cyan-400 shrink-0" />
                <div className="leading-tight">
                  <span className="text-slate-400 block text-[10px]">تدوير المياه (ECLSS):</span>
                  <span className="text-white">حلقة تنقية 98% مغلقة</span>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-space-950/80 border border-space-800">
                <Activity className="w-4 h-4 text-purple-400 shrink-0" />
                <div className="leading-tight">
                  <span className="text-slate-400 block text-[10px]">محلول أملاح السير القمري:</span>
                  <span className="text-emerald-400">ضغط الدم مستقر</span>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-space-950/80 border border-space-800">
                <Heart className="w-4 h-4 text-rose-400 shrink-0" />
                <div className="leading-tight">
                  <span className="text-slate-400 block text-[10px]">صحة طاقم الفضاء:</span>
                  <span className={astronautHealthPercent >= 90 ? 'text-emerald-400' : 'text-amber-400'}>
                    {astronautHealthPercent}% حيوية ممتازة
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-space-950/80 border border-space-800">
                <Sprout className="w-4 h-4 text-emerald-400 shrink-0" />
                <div className="leading-tight">
                  <span className="text-slate-400 block text-[10px]">المزرعة المائية:</span>
                  <span className={lunarFarmHealthPercent >= 90 ? 'text-emerald-400' : 'text-amber-400'}>
                    {lunarFarmHealthPercent}% محصول ({tradeOffChoice === 'shields' ? 'أولوية لحياة الرائد' : 'أولوية للنبات'})
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons: Play Again & Return to Map */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              onClick={handlePlayAgain}
              className="py-3.5 px-5 rounded-2xl bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-300 text-space-950 font-hud font-black text-sm tracking-wide shadow-xl shadow-yellow-500/40 hover:brightness-110 transition-all flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>العب مرة أخرى (إعادة البداية)</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              onClick={handleReturnToMap}
              className="py-3.5 px-5 rounded-2xl bg-space-800 hover:bg-space-700 border-2 border-space-600 text-white font-hud font-black text-sm tracking-wide shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <ArrowRight className="w-4 h-4 text-cyan-400" />
              <span>العودة لخريطة الأكاديمية</span>
            </motion.button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
