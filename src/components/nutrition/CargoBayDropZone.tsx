import { forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameState } from '../../context/GameContext';
import { TARGET_NUTRITION_REQUIREMENTS } from '../../data/foodItems';
import { Trash2, X, Sparkles, ArrowDown } from 'lucide-react';

interface CargoBayDropZoneProps {
  onSuccessTrigger: () => void;
}

export const CargoBayDropZone = forwardRef<HTMLDivElement, CargoBayDropZoneProps>(
  ({ onSuccessTrigger }, ref) => {
    const { state, removeFoodItem, clearCargo, canCompleteMission } = useGameState();
    const { cargoItems, cargoWeight } = state;

    return (
      <div className="relative w-full flex flex-col items-center justify-center select-none py-1">
        
        {/* 1. BOUNCING 3D DOWNWARD ARROW ("Drop Here") */}
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 1.25, ease: 'easeInOut' }}
          className="flex flex-col items-center mb-2 z-20 pointer-events-none"
        >
          <span className="px-4 py-1 rounded-full bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 text-slate-950 font-hud font-black text-xs sm:text-sm border-2 border-white shadow-[0_4px_15px_rgba(250,204,21,0.65)] mb-1">
            ضع الطعام الصحي هنا
          </span>
          <div className="w-11 h-11 rounded-full bg-gradient-to-b from-emerald-400 to-green-600 border-3 border-white flex items-center justify-center text-white shadow-[0_6px_20px_rgba(16,185,129,0.7)]">
            <ArrowDown className="w-6 h-6 stroke-[3]" />
          </div>
        </motion.div>

        {/* 2. CENTERED 3D OPEN SPACE CARGO BOX (Drop Target Ref) */}
        <div
          ref={ref}
          className="relative w-full max-w-[360px] sm:max-w-[400px] flex flex-col items-center touch-manipulation"
        >
          {/* Back Open Flap of the 3D Crate */}
          <div
            className="w-[84%] h-7 bg-gradient-to-b from-sky-200 to-sky-400 border-t-4 border-x-4 border-white rounded-t-2xl shadow-inner"
            style={{ transform: 'perspective(400px) rotateX(28deg)' }}
          />

          {/* Left & Right Angled Open Flaps + Deep Box Interior */}
          <div className="relative w-full flex items-stretch justify-center -mt-1">
            {/* Left Open Flap */}
            <div
              className="hidden sm:block w-6 bg-gradient-to-r from-sky-300 to-sky-500 border-y-3 border-l-3 border-white rounded-l-xl -mr-1 shadow-md"
              style={{ transform: 'skewY(-14deg)' }}
            />

            {/* Open Interior Cavity of the 3D Box (Where Packed Foods Sit) */}
            <div className="relative flex-1 min-h-[145px] sm:min-h-[160px] bg-gradient-to-b from-slate-900 via-sky-950 to-slate-950 border-4 border-sky-300 rounded-t-2xl p-3 flex flex-col items-center justify-center shadow-[inset_0_12px_30px_rgba(0,0,0,0.85)] overflow-hidden">
              {/* Glowing Holographic Grid Floor Inside Box */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(56,189,248,0.22)_0%,_transparent_70%)] pointer-events-none" />

              {cargoItems.length === 0 ? (
                <div className="relative z-10 flex flex-col items-center text-center px-3">
                  <div className="w-16 h-16 rounded-full border-3 border-dashed border-cyan-300/70 bg-cyan-400/10 flex items-center justify-center mb-1.5 animate-pulse">
                    <ArrowDown className="w-7 h-7 text-cyan-300" />
                  </div>
                  <p className="font-hud font-black text-xs sm:text-sm text-cyan-100">
                    صندوق شحن الفضاء مفتوح!
                  </p>
                  <p className="text-[11px] font-bold text-sky-300/90">
                    اسحب الأطعمة الصحية التي عليها علامة ✓ إلى داخل الصندوق
                  </p>
                </div>
              ) : (
                <div className="relative z-10 w-full">
                  <div className="flex flex-wrap items-center justify-center gap-2.5 py-1">
                    <AnimatePresence>
                      {cargoItems.map(({ item, quantity }) => (
                        <motion.div
                          key={item.id}
                          initial={{ scale: 0.4, y: -30, opacity: 0 }}
                          animate={{ scale: 1, y: 0, opacity: 1 }}
                          exit={{ scale: 0.4, opacity: 0 }}
                          className="relative group bg-white/95 border-2 border-sky-300 rounded-2xl p-1.5 w-16 h-16 sm:w-18 sm:h-18 flex items-center justify-center shadow-lg"
                        >
                          {item.svgAsset ? (
                            <img
                              src={item.svgAsset}
                              alt={item.nameAr || item.name}
                              className="w-12 h-12 object-contain drop-shadow"
                            />
                          ) : (
                            <span className="text-3xl">{item.icon}</span>
                          )}

                          {/* Quantity Badge */}
                          <span className="absolute -bottom-1.5 -right-1.5 px-1.5 py-0.2 rounded-full bg-emerald-500 text-white font-hud font-black text-[10px] border border-white shadow">
                            x{quantity}
                          </span>

                          {/* Quick Remove Button */}
                          <button
                            type="button"
                            onClick={() => removeFoodItem(item.id)}
                            className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow border border-white"
                            title="إزالة"
                          >
                            <X className="w-3 h-3 stroke-[3]" />
                          </button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              )}
            </div>

            {/* Right Open Flap */}
            <div
              className="hidden sm:block w-6 bg-gradient-to-l from-sky-300 to-sky-500 border-y-3 border-r-3 border-white rounded-r-xl -ml-1 shadow-md"
              style={{ transform: 'skewY(14deg)' }}
            />
          </div>

          {/* 3D Front Wall of the Space Cargo Crate */}
          <div className="relative z-10 w-full bg-gradient-to-b from-sky-400 via-blue-600 to-indigo-900 border-4 border-white rounded-b-[2rem] px-5 py-3.5 shadow-[0_18px_40px_rgba(2,6,23,0.65)]">
            {/* Top Metallic Rim Strip */}
            <div className="absolute top-1 inset-x-4 h-2 rounded-full bg-white/45 pointer-events-none" />

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="px-3 py-1 rounded-xl bg-slate-950/80 border border-cyan-300/60 text-cyan-200 font-hud font-black text-xs sm:text-sm">
                  شحنة الصندوق: <span className="text-yellow-300">{cargoWeight}%</span>
                </div>
                <span className="text-[11px] font-black text-sky-100">
                  (الهدف: {TARGET_NUTRITION_REQUIREMENTS.minCargoWeight}%+)
                </span>
              </div>

              {cargoItems.length > 0 && (
                <button
                  type="button"
                  onClick={clearCargo}
                  className="px-2.5 py-1 rounded-xl bg-rose-500/90 hover:bg-rose-500 text-white font-black text-[11px] border border-rose-200 flex items-center gap-1 shadow active:scale-95 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>تفريغ</span>
                </button>
              )}
            </div>

            {/* Crate Progress Bar */}
            <div className="w-full h-3.5 bg-slate-950/80 rounded-full overflow-hidden border border-sky-200/60 mt-2.5 p-0.5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${cargoWeight}%` }}
                className="h-full rounded-full bg-gradient-to-l from-emerald-400 via-yellow-300 to-cyan-400"
              />
            </div>

            {/* Proceed Button When Cargo Is Ready */}
            {canCompleteMission && (
              <motion.button
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={onSuccessTrigger}
                className="mt-3 w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-yellow-300 via-amber-400 to-orange-500 text-slate-950 font-hud font-black text-sm sm:text-base border-2 border-white shadow-[0_0_25px_rgba(250,204,21,0.85)] flex items-center justify-center gap-2 animate-bounce"
              >
                <Sparkles className="w-5 h-5" />
                <span>اعتماد الصندوق والانطلاق! 🚀</span>
              </motion.button>
            )}
          </div>
        </div>
      </div>
    );
  }
);

CargoBayDropZone.displayName = 'CargoBayDropZone';
