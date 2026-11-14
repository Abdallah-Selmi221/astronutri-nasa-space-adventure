import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useGameState } from '../../context/GameContext';
import { soundManager } from '../../utils/sound';
import { AnimatedRobo } from '../common/AnimatedRobo';
import { 
  Trophy, 
  CheckCircle2, 
  ArrowLeft, 
  Star
} from 'lucide-react';

interface MissionSuccessModalProps {
  onProceed: () => void;
}

export const MissionSuccessModal: React.FC<MissionSuccessModalProps> = ({ onProceed }) => {
  const { state } = useGameState();
  const { cargoWeight, nutritionScore, cadetName } = state;

  useEffect(() => {
    soundManager.playFanfare();

    const end = Date.now() + 2.5 * 1000;
    const colors = ['#00ff88', '#00f0ff', '#ffd166', '#ff3366', '#a855f7'];

    (function frame() {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: colors
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: colors
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    })();
  }, []);

  const handleClaimAndProceed = () => {
    onProceed();
  };

  const roboSuccessSpeech = `الله عليك يا بطل! أحسنت! جهزت وجبات الفضاء بنجاح وبنسبة متوازنة! تم فتح غرفة بدلة الفضاء الآن!`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ scale: 0.7, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        className="relative z-10 w-full max-w-xl bg-space-950 border-4 border-emerald-400 rounded-3xl p-5 sm:p-7 shadow-2xl shadow-emerald-500/40 text-center overflow-hidden my-auto"
      >
        {/* Animated Background Rays */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* PROMINENT ANIMATED ROBO CELEBRATING */}
        <div className="mb-2 flex items-center justify-center">
          <AnimatedRobo
            state="CELEBRATING"
            spokenText={roboSuccessSpeech}
            autoSpeak={true}
            size="md"
            showSpeechBubble={false}
          />
        </div>

        {/* Top Trophy */}
        <div className="relative mb-3 flex items-center justify-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.15, type: 'spring', stiffness: 200 }}
            className="w-16 h-16 rounded-2xl bg-emerald-950 border-2 border-emerald-400 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-950/60"
          >
            <Trophy className="w-9 h-9 text-yellow-300" />
          </motion.div>
        </div>

        {/* Mission Level Clear Badge */}
        <div className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full bg-emerald-950 border border-emerald-400 text-emerald-300 font-black text-xs uppercase tracking-wider mb-2">
          <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
          <span>تم اعتماد وتجهيز شحنة الغذاء بنجاح! ⭐⭐⭐</span>
          <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
        </div>

        <h3 className="font-hud text-xl sm:text-3xl font-black text-white tracking-wide mb-2">
          مبارك يا كابتن {cadetName}! 🚀
        </h3>

        <p className="text-slate-300 text-xs sm:text-sm font-medium mb-4">
          أنت الآن رائد فضاء محترف في التغذية! الوجبات متوازنة ومغلفة لتقليل الفتات المتطاير وحماية أجهزة المركبة!
        </p>

        {/* Accomplishment Checklist */}
        <div className="bg-space-900/90 border border-space-700 rounded-2xl p-4 mb-5 text-right space-y-2 text-xs sm:text-sm">
          <div className="flex items-center justify-between text-slate-200">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>وزن الشحنة المعبأة:</span>
            </span>
            <span className="font-black text-emerald-400">{cargoWeight}% ممتلئ</span>
          </div>

          <div className="flex items-center justify-between text-slate-200">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>التوازن الغذائي:</span>
            </span>
            <span className="font-black text-emerald-400">
              نسبة مثالية ({Math.round(nutritionScore.ratio * 100)}% بروتين / {100 - Math.round(nutritionScore.ratio * 100)}% طاقة)
            </span>
          </div>

          <div className="flex items-center justify-between text-slate-200">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>التغليف الآمن للجاذبية الصغرى:</span>
            </span>
            <span className="font-black text-emerald-400 flex items-center gap-1">
              🍯 عسل سيناوي وعبوات محكمة الصمامات
            </span>
          </div>

          <div className="flex items-center justify-between text-slate-200">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>قاعدة ممنوع الفتات:</span>
            </span>
            <span className="font-black text-emerald-400">100% وجبات آمنة للمحطة</span>
          </div>
        </div>

        {/* Action Button: Proceed to Next Room */}
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleClaimAndProceed}
          className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 text-space-950 font-hud font-black text-sm sm:text-base tracking-wide shadow-xl shadow-emerald-500/30 flex items-center justify-center gap-2"
        >
          <span>انطلق للمهمة التالية: غرفة بدلة الفضاء 👨‍🚀</span>
          <ArrowLeft className="w-5 h-5" />
        </motion.button>
      </motion.div>
    </div>
  );
};
