import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { soundManager } from '../../utils/sound';
import { dialogueManager } from '../../utils/geminiTTS';
import { CheckCircle2, RotateCcw } from 'lucide-react';

interface FilterMaintenanceProps {
  onComplete?: () => void;
}

export const FilterMaintenance: React.FC<FilterMaintenanceProps> = ({ onComplete }) => {
  // Steps: 1 = Remove Dirty Filter, 2 = Clean Housing, 3 = Install Clean Filter, 4 = Tested
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [dirtyFilterRemoved, setDirtyFilterRemoved] = useState<boolean>(false);
  const [housingCleaned, setHousingCleaned] = useState<boolean>(false);
  const [cleanFilterInstalled, setCleanFilterInstalled] = useState<boolean>(false);
  const [isSealed, setIsSealed] = useState<boolean>(false);

  const handleRemoveDirty = () => {
    soundManager.playPressurizeHiss();
    setDirtyFilterRemoved(true);
    setStep(2);
    void dialogueManager.speak('ممتاز! أزلت الفلتر القديم الممتلئ بالشوائب.. الآن نظف مجرى الهواء بالفرشاة!');
  };

  const handleCleanHousing = () => {
    soundManager.playCrystalSparkle();
    setHousingCleaned(true);
    setStep(3);
    void dialogueManager.speak('رائع! مجرى الفلتر نظيف ولامع.. اسحب الفلتر الكربوني الجديد وركبه مكانه!');
  };

  const handleInstallClean = () => {
    soundManager.playDropSuccess();
    setCleanFilterInstalled(true);
    setStep(4);
    void dialogueManager.speak('أحسنت! الفلتر الجديد راكب بإحكام.. اضغط على زر قفل الضغط لتفعيل دورة المياه والأكسجين!');
  };

  const handleLockSeal = () => {
    soundManager.playFanfare();
    setIsSealed(true);
    void dialogueManager.speak('تم إحكام دورة تنقية الحياة ECLSS بنجاح 100%! الهواء والماء نقيان الآن! 🌟');
    if (onComplete) onComplete();
  };

  const handleReset = () => {
    soundManager.playClick();
    setStep(1);
    setDirtyFilterRemoved(false);
    setHousingCleaned(false);
    setCleanFilterInstalled(false);
    setIsSealed(false);
  };

  return (
    <div
      className="relative w-full max-w-xl mx-auto p-5 sm:p-7 rounded-[2.5rem] bg-gradient-to-b from-slate-900/95 via-sky-950/95 to-slate-950/95 border-4 border-cyan-400 shadow-[0_0_50px_rgba(6,182,212,0.35)] select-none text-white flex flex-col items-center gap-5"
      dir="rtl"
    >
      {/* Header */}
      <div className="w-full flex items-center justify-between border-b border-cyan-500/30 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border-2 border-cyan-300 flex items-center justify-center text-2xl shadow">
            🛠️
          </div>
          <div>
            <h3 className="font-hud font-black text-lg sm:text-xl text-white">
              صيانة فلتر تنقية الهواء والماء (ECLSS)
            </h3>
            <p className="text-xs font-hud font-bold text-cyan-200">
              خطوة {step} من 4: {step === 1 ? 'إزالة الفلتر المستهلك' : step === 2 ? 'تنظيف المجرى' : step === 3 ? 'تركيب الفلتر الكربوني النظيف' : 'إحكام القفل'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleReset}
          className="p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-600 transition-all cursor-pointer"
          title="إعادة الصيانة"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Main Filter Housing Mechanism Box */}
      <div className="relative w-72 h-56 rounded-3xl bg-slate-950 border-4 border-cyan-500/60 p-4 flex flex-col items-center justify-center shadow-inner overflow-hidden">
        {/* Airflow / Water Pipes Background */}
        <div className="absolute inset-x-0 h-10 bg-cyan-950/40 border-y border-cyan-400/30 flex items-center justify-around">
          <span className="text-xs text-cyan-400 font-mono animate-pulse">FLOW &gt;&gt;&gt;</span>
          <span className="text-xs text-cyan-400 font-mono animate-pulse">ECLSS PURIFY</span>
          <span className="text-xs text-cyan-400 font-mono animate-pulse">&gt;&gt;&gt; CLEAN</span>
        </div>

        {/* Center Slot */}
        <div className="relative z-10 w-44 h-36 rounded-2xl border-3 border-dashed border-cyan-400 bg-slate-900/90 flex flex-col items-center justify-center shadow-lg">
          {!dirtyFilterRemoved ? (
            <motion.div
              whileHover={{ scale: 1.05 }}
              onClick={handleRemoveDirty}
              className="p-3 rounded-xl bg-amber-950/80 border-2 border-amber-600 flex flex-col items-center cursor-pointer shadow-md"
            >
              <span className="text-4xl filter grayscale">🧽</span>
              <span className="text-[11px] font-hud font-black text-amber-300 mt-1">
                فلتر قديم ممتلئ بالشوائب
              </span>
              <span className="text-[9px] font-hud font-bold text-amber-400">اضغط للإزالة ⚠️</span>
            </motion.div>
          ) : !housingCleaned ? (
            <motion.div
              whileHover={{ scale: 1.05 }}
              onClick={handleCleanHousing}
              className="p-3 rounded-xl bg-sky-950/80 border-2 border-sky-400 flex flex-col items-center cursor-pointer shadow-md"
            >
              <span className="text-4xl animate-bounce">🧹</span>
              <span className="text-[11px] font-hud font-black text-sky-200 mt-1">
                المجرى بحاجة للتنظيف
              </span>
              <span className="text-[9px] font-hud font-bold text-sky-400">اضغط للكنس والتنظيف ✨</span>
            </motion.div>
          ) : !cleanFilterInstalled ? (
            <div
              onClick={handleInstallClean}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleInstallClean();
              }}
              className="w-full h-full rounded-2xl border-2 border-dashed border-emerald-400 bg-emerald-950/20 flex flex-col items-center justify-center cursor-pointer hover:bg-emerald-900/30"
            >
              <span className="text-xs font-hud font-black text-emerald-300">
                ضع الفلتر الكربوني الجديد هنا 🎯
              </span>
              <span className="text-[10px] font-hud font-bold text-emerald-400 mt-1">
                (اضغط أو اسحب الفلتر الأخضر)
              </span>
            </div>
          ) : (
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="p-3 rounded-xl bg-emerald-950/90 border-2 border-emerald-400 flex flex-col items-center shadow-lg"
            >
              <span className="text-4xl">💎</span>
              <span className="text-xs font-hud font-black text-emerald-300 mt-1">
                فلتر كربوني نشط 100%
              </span>
              <span className="text-[10px] font-hud font-bold text-emerald-400">
                {isSealed ? 'محكم ومغلق بنجاح ✅' : 'جاهز للإغلاق'}
              </span>
            </motion.div>
          )}
        </div>
      </div>

      {/* Part Tray when on step 3 */}
      {step === 3 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full flex flex-col items-center gap-2 p-3 rounded-2xl bg-slate-900/80 border-2 border-emerald-400"
        >
          <span className="text-xs font-hud font-bold text-emerald-300">
            القطعة النظيفة المتاحة:
          </span>
          <button
            type="button"
            draggable
            onDragStart={handleInstallClean}
            onClick={handleInstallClean}
            className="py-2.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-hud font-black text-sm flex items-center gap-3 shadow-lg hover:scale-105 active:scale-95 cursor-pointer"
          >
            <span className="text-2xl">💎</span>
            <span>فلتر كربوني فائق النقاء (اضغط للتركيب)</span>
          </button>
        </motion.div>
      )}

      {/* Action Button for step 4 */}
      {step === 4 && !isSealed && (
        <button
          type="button"
          onClick={handleLockSeal}
          className="w-full py-4 px-6 rounded-2xl btn-chunky-adventure text-slate-950 font-hud font-black text-lg flex items-center justify-center gap-3 shadow-xl cursor-pointer"
        >
          <span>إحكام غطاء الفلتر وبدء ضخ المياه والأكسجين 🚀</span>
        </button>
      )}

      {/* Final Success Banner */}
      {isSealed && (
        <div className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-hud font-black text-base flex items-center justify-center gap-2 shadow-lg animate-bounce">
          <CheckCircle2 className="w-6 h-6" />
          <span>تمت صيانة وتفعيل نظام ECLSS بنجاح 100%! مياه وهواء نقيان! ✅</span>
        </div>
      )}
    </div>
  );
};

export default FilterMaintenance;
