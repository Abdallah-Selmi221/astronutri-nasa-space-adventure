import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Map, Lock, CheckCircle2 } from 'lucide-react';
import { soundManager } from '../../utils/sound';

interface WorldMapPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMission?: (missionId: string) => void;
}

export const WorldMapPreviewModal: React.FC<WorldMapPreviewModalProps> = ({
  isOpen,
  onClose,
  onSelectMission
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md select-none">
        <div className="absolute inset-0" onClick={onClose} />

        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 280 }}
          className="relative z-10 w-full max-w-4xl max-h-[92vh] flex flex-col bg-gradient-to-b from-sky-950/95 via-slate-900/95 to-slate-950/95 border-4 border-pastel-cyan rounded-[2rem] shadow-[0_25px_60px_rgba(0,0,0,0.7)] overflow-hidden"
          dir="rtl"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-pastel-cyan/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-pastel-cyan to-pastel-sky flex items-center justify-center shadow-lg">
                <Map className="w-5 h-5 sm:w-6 sm:h-6 text-slate-950" />
              </div>
              <div>
                <h2 className="font-hud font-black text-lg sm:text-2xl text-white flex items-center gap-2">
                  <span>خريطة الأرخبيل الكوني (معاينة المراحل)</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-pastel-yellow/20 text-pastel-yellow border border-pastel-yellow/40">
                    4 جزر فضائية 🌌
                  </span>
                </h2>
                <p className="text-xs text-pastel-sky font-bold">
                  مسار تدريب رواد الفضاء الصغار في أكاديمية ناسا
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                soundManager.playClick();
                onClose();
              }}
              className="p-2 rounded-2xl bg-slate-800/80 hover:bg-rose-600 text-slate-300 hover:text-white transition-all active:scale-90"
              aria-label="إغلاق الخريطة"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body: High-Resolution Concept Art & Island Stage Nodes */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {/* World Map Rendered Art */}
            <div className="relative rounded-2xl overflow-hidden border-2 border-pastel-cyan/40 shadow-xl aspect-[16/9] bg-slate-950">
              <img
                src="/assets/scenes/scene-02-map.png"
                alt="خريطة أرخبيل الفضاء الكوني"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />
              
              <div className="absolute bottom-3 right-3 left-3 flex items-center justify-between pointer-events-none">
                <span className="px-3 py-1 rounded-full bg-emerald-500/90 text-slate-950 font-hud font-black text-xs shadow-md">
                  الجزيرة 1: حديقة التغذية (مفتوحة وجاهزة للاستكشاف) 🍏
                </span>
                <span className="px-3 py-1 rounded-full bg-slate-900/90 text-pastel-sky font-hud font-bold text-xs border border-pastel-sky/30">
                  الجزر 2-4: مغلقة حالياً 🔒
                </span>
              </div>
            </div>

            {/* 4 Island Stages Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Island 1 */}
              <div className="p-3.5 rounded-2xl bg-emerald-950/40 border-2 border-emerald-400/80 shadow-md flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-hud font-black px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950">
                      المحطة الأولى 1
                    </span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  </div>
                  <h4 className="font-hud font-black text-sm text-white">حديقة التغذية الفضائية</h4>
                  <p className="text-[10px] text-emerald-200/80 mt-1">
                    تعلم أسرار طعام الفضاء الخالي من الفتات وقواعد التغذية في الجاذبية الصغرى.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playClick();
                    if (onSelectMission) onSelectMission('NutritionLab');
                    onClose();
                  }}
                  className="mt-3 w-full py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-hud font-black text-xs shadow-sm active:scale-95 transition-transform cursor-pointer"
                >
                  دخول المهمة الآن 🚀
                </button>
              </div>

              {/* Island 2 */}
              <div className="p-3.5 rounded-2xl bg-slate-900/60 border-2 border-slate-700/60 opacity-80 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-hud font-black px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                      المحطة الثانية 2
                    </span>
                    <Lock className="w-4 h-4 text-slate-500" />
                  </div>
                  <h4 className="font-hud font-black text-sm text-slate-300">قبة علوم الفضاء</h4>
                  <p className="text-[10px] text-slate-400 mt-1">
                    استكشاف الكواكب وحزام الكويكبات وظواهر العواصف الشمسية.
                  </p>
                </div>
                <span className="mt-3 text-center text-[10px] font-hud font-bold text-slate-500 py-1.5">
                  قريباً بعد إتمام التغذية 🔒
                </span>
              </div>

              {/* Island 3 */}
              <div className="p-3.5 rounded-2xl bg-slate-900/60 border-2 border-slate-700/60 opacity-80 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-hud font-black px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                      المحطة الثالثة 3
                    </span>
                    <Lock className="w-4 h-4 text-slate-500" />
                  </div>
                  <h4 className="font-hud font-black text-sm text-slate-300">مختبر بدلات ورواد الفضاء</h4>
                  <p className="text-[10px] text-slate-400 mt-1">
                    فحص خوذة الفضاء ومستوى الأكسجين وضغط الدم وتمارين العضلات.
                  </p>
                </div>
                <span className="mt-3 text-center text-[10px] font-hud font-bold text-slate-500 py-1.5">
                  قريباً بعد إتمام التغذية 🔒
                </span>
              </div>

              {/* Island 4 */}
              <div className="p-3.5 rounded-2xl bg-slate-900/60 border-2 border-slate-700/60 opacity-80 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-hud font-black px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                      المحطة الرابعة 4
                    </span>
                    <Lock className="w-4 h-4 text-slate-500" />
                  </div>
                  <h4 className="font-hud font-black text-sm text-slate-300">منصة الإطلاق الكبرى</h4>
                  <p className="text-[10px] text-slate-400 mt-1">
                    العد التنازلي لإطلاق الصاروخ نحو المحطة القمرية والانتصار النهائي!
                  </p>
                </div>
                <span className="mt-3 text-center text-[10px] font-hud font-bold text-slate-500 py-1.5">
                  المهمة النهائية 🔒
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
export default WorldMapPreviewModal;
