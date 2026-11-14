import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { FoodItem } from '../../types/game';
import { soundManager } from '../../utils/sound';
import { AnimatedRobo } from '../common/AnimatedRobo';
import { 
  AlertTriangle,
  Sparkles,
  X
} from 'lucide-react';

interface CrumbsAlertModalProps {
  bannedItem: FoodItem;
  onClose: () => void;
}

export const CrumbsAlertModal: React.FC<CrumbsAlertModalProps> = ({
  bannedItem,
  onClose
}) => {
  useEffect(() => {
    soundManager.playAlertSiren();
  }, []);

  const roboWarningSpeech = `بس استنى عندك يا بطل! أوعى تحط ${bannedItem.nameAr || bannedItem.name} في الصندوق! الفتات ده خطير جداً، بيطير في الفضاء ويسد فلاتر الأكسجين ويدخل في عيون الرواد!`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      {/* Background Warning Flash Effect */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0.2, 0.45, 0.2] }}
        transition={{ repeat: Infinity, duration: 1.2 }}
        className="absolute inset-0 bg-rose-950/50 pointer-events-none"
      />

      <motion.div
        initial={{ scale: 0.7, opacity: 0, y: 30 }}
        animate={{ 
          scale: 1, 
          opacity: 1, 
          y: 0,
          rotate: [0, -1.5, 1.5, -1, 1, 0]
        }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ 
          type: 'spring', 
          stiffness: 300, 
          damping: 20 
        }}
        className="relative z-10 w-full max-w-xl bg-space-950 border-4 border-red-500 rounded-3xl p-5 sm:p-7 shadow-2xl shadow-red-600/50 text-center overflow-hidden my-auto"
      >
        {/* Animated Warning Stripe Banner */}
        <div className="absolute top-0 inset-x-0 h-3 bg-gradient-to-r from-red-600 via-amber-500 to-red-600 animate-pulse" />

        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        {/* PROMINENT ANIMATED ROBO SPEAKING IN WARNING STATE */}
        <div className="mb-2 flex items-center justify-center">
          <AnimatedRobo
            state="WARNING"
            spokenText={roboWarningSpeech}
            autoSpeak={true}
            size="md"
            showSpeechBubble={true}
          />
        </div>

        {/* Hazard Pill */}
        <div className="inline-block px-4 py-1 rounded-full bg-red-950 border-2 border-red-500 text-red-300 font-black text-xs uppercase mb-2 shadow-md">
          🚨 إنذار أحمر: مخالفة قاعدة ممنوع الفتات!
        </div>

        <h3 className="font-hud text-lg sm:text-2xl font-black text-red-500 tracking-wide leading-tight mb-2">
          مرفوض! طعام يفرز فتاتاً متطايراً!<br />
          <span className="text-white text-sm sm:text-lg font-bold">
            هذا الطعام سيطفو في انعدام الجاذبية ويعطل أجهزة المحطة!
          </span>
        </h3>

        {/* Rejected Item Card */}
        <div className="bg-red-950/50 border-2 border-red-500/60 rounded-2xl p-3 mb-4 flex items-center justify-center gap-3">
          <span className="text-4xl">{bannedItem.icon}</span>
          <div className="text-right">
            <h4 className="font-hud font-black text-sm sm:text-base text-red-300">
              {bannedItem.nameAr || bannedItem.name}
            </h4>
            <span className="text-xs text-red-200 font-bold">
              {bannedItem.bannedReasonAr || bannedItem.bannedReason}
            </span>
          </div>
        </div>

        {/* Educational NASA Real Science Context for Kids */}
        <div className="bg-space-900/90 border border-space-700 rounded-2xl p-3.5 mb-5 text-right text-xs text-slate-200 space-y-1.5">
          <div className="flex items-center gap-1.5 text-amber-300 font-black">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>ليه الطعام ده ممنوع في الفضاء؟</span>
          </div>
          <p className="leading-relaxed text-slate-300 text-xs">
            على الأرض، الجاذبية تسقط الفتات على الأرض.. لكن في محطة الفضاء، الفتات يطفو في الهواء إلى الأبد! ويدخل في فلاتر تبريد الحواسيب ويحرقها، أو يدخل في عيون الرواد!
          </p>
          <div className="pt-1.5 border-t border-space-800 text-[11px] text-cyan-300 font-bold flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>حل ناسا الذكي: رواد الفضاء يستبدلون الخبز المفتت بعبوات محكمة ومكعبات متماسكة وعسل سيناوي بلا فتات!</span>
          </div>
        </div>

        {/* Action Button */}
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => {
            soundManager.playClick();
            onClose();
          }}
          className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-600 text-white font-hud font-black text-sm sm:text-base tracking-wide shadow-xl shadow-red-600/40 hover:brightness-110 active:scale-95 transition-all"
        >
          فهمت يا روبو! لن أضع طعاماً مفتتاً أبداً 🚀
        </motion.button>
      </motion.div>
    </div>
  );
};
