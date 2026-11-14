import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { soundManager } from '../../utils/sound';
import { dialogueManager } from '../../utils/geminiTTS';
import { Zap, ShieldAlert, CheckCircle2, RotateCcw, AlertTriangle, Wind, Droplets, Sprout } from 'lucide-react';

interface SubSystem {
  id: 'life_support' | 'eclss' | 'shields' | 'farm';
  nameAr: string;
  icon: React.ReactNode;
  power: number;
  minPower: number;
  color: string;
  descriptionAr: string;
}

interface ResourceDashboardProps {
  onComplete?: () => void;
  isSolarStormWarning?: boolean;
}

export const ResourceDashboard: React.FC<ResourceDashboardProps> = ({
  onComplete,
  isSolarStormWarning = false
}) => {
  const TOTAL_POWER_AVAILABLE = 100;

  const [systems, setSystems] = useState<SubSystem[]>([
    {
      id: 'life_support',
      nameAr: 'دعم الحياة والأكسجين',
      icon: <Wind className="w-5 h-5 text-cyan-300" />,
      power: 35,
      minPower: 25,
      color: 'from-cyan-500 to-blue-600',
      descriptionAr: 'تنفس الطاقم وضغط الكابينة 4.3 PSI'
    },
    {
      id: 'eclss',
      nameAr: 'تدوير المياه ECLSS',
      icon: <Droplets className="w-5 h-5 text-sky-300" />,
      power: 25,
      minPower: 15,
      color: 'from-sky-500 to-indigo-600',
      descriptionAr: 'تنقية وتدوير مياه الشرب بنسبة 100%'
    },
    {
      id: 'shields',
      nameAr: 'الدرع الإشعاعي الشمسي (DONKI)',
      icon: <ShieldAlert className="w-5 h-5 text-amber-300" />,
      power: isSolarStormWarning ? 30 : 15,
      minPower: 10,
      color: 'from-amber-500 to-orange-600',
      descriptionAr: 'صد الجسيمات المشحونة والعواصف الشمسية'
    },
    {
      id: 'farm',
      nameAr: 'إضاءة المزرعة والترفيه',
      icon: <Sprout className="w-5 h-5 text-emerald-300" />,
      power: 20,
      minPower: 5,
      color: 'from-emerald-500 to-teal-600',
      descriptionAr: 'نمو النباتات الهيدروبونية وراحة الطاقم'
    }
  ]);

  const [isOverloadAlert, setIsOverloadAlert] = useState<boolean>(false);
  const [isBalancedSuccess, setIsBalancedSuccess] = useState<boolean>(false);

  const totalAllocated = systems.reduce((sum, s) => sum + s.power, 0);
  const powerRemaining = TOTAL_POWER_AVAILABLE - totalAllocated;

  const handleSliderChange = (id: string, newPower: number) => {
    const currentSys = systems.find((s) => s.id === id);
    if (!currentSys) return;

    const diff = newPower - currentSys.power;
    const testTotal = totalAllocated + diff;

    // Strict constraint: cannot exceed TOTAL_POWER_AVAILABLE (100)
    if (testTotal > TOTAL_POWER_AVAILABLE) {
      soundManager.playAlertSiren();
      setIsOverloadAlert(true);
      setTimeout(() => setIsOverloadAlert(false), 2000);
      return;
    }

    soundManager.playClick();
    setSystems((prev) =>
      prev.map((s) => (s.id === id ? { ...s, power: Math.max(s.minPower, newPower) } : s))
    );
  };

  const handleConfirmDistribution = () => {
    if (totalAllocated > TOTAL_POWER_AVAILABLE) {
      soundManager.playAlertSiren();
      setIsOverloadAlert(true);
      return;
    }

    // Check if shields have sufficient power during storm
    const shieldSys = systems.find((s) => s.id === 'shields');
    if (isSolarStormWarning && shieldSys && shieldSys.power < 30) {
      soundManager.playAlertSiren();
      void dialogueManager.speak('تحذير! عاصفة ناسا الشمسية نشطة.. ارفع طاقة الدرع إلى 30 على الأقل لحماية الطاقم!');
      return;
    }

    soundManager.playFanfare();
    setIsBalancedSuccess(true);
    void dialogueManager.speak('توزيع طاقة مثالي ومستقر! أنظمة المحطة الفضائية تعمل بكفاءة 100%! ⚡');
    if (onComplete) onComplete();
  };

  const handleReset = () => {
    soundManager.playClick();
    setSystems([
      { ...systems[0], power: 35 },
      { ...systems[1], power: 25 },
      { ...systems[2], power: 20 },
      { ...systems[3], power: 20 }
    ]);
    setIsOverloadAlert(false);
    setIsBalancedSuccess(false);
  };

  return (
    <div
      className={`relative w-full max-w-xl mx-auto p-5 sm:p-7 rounded-[2.5rem] bg-gradient-to-b from-slate-900/95 via-sky-950/95 to-slate-950/95 border-4 select-none text-white flex flex-col items-center gap-5 transition-all ${
        isOverloadAlert
          ? 'pulsing-glow-red border-rose-500'
          : 'border-cyan-400 shadow-[0_0_50px_rgba(6,182,212,0.35)]'
      }`}
      dir="rtl"
    >
      {/* Header */}
      <div className="w-full flex items-center justify-between border-b border-cyan-500/30 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border-2 border-amber-300 flex items-center justify-center text-2xl shadow">
            ⚡
          </div>
          <div>
            <h3 className="font-hud font-black text-lg sm:text-xl text-white">
              لوحة توزيع طاقة المحطة الفضائية
            </h3>
            <p className="text-xs font-hud font-bold text-cyan-200">
              المتاح: {TOTAL_POWER_AVAILABLE} ميجاوات • المستهلك: {totalAllocated} ميجاوات
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleReset}
          className="p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-600 transition-all cursor-pointer"
          title="إعادة التوزيع"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Main Power Battery Meter */}
      <div className="w-full p-4 rounded-2xl bg-slate-950/80 border-2 border-cyan-400/50 flex flex-col gap-2">
        <div className="flex items-center justify-between font-hud font-bold text-xs sm:text-sm">
          <span className="flex items-center gap-1.5 text-cyan-300">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>حالة المولد والمصفوفة الشمسية:</span>
          </span>
          <span className={`font-black ${powerRemaining === 0 ? 'text-emerald-400' : 'text-amber-300'}`}>
            {powerRemaining === 0 ? 'متوازن بنسبة 100% ✅' : `متبقي: ${powerRemaining} ميجاوات`}
          </span>
        </div>

        {/* Multi-Segment Stacked Battery Bar */}
        <div className="w-full h-4 rounded-full bg-slate-800 overflow-hidden flex p-0.5 border border-slate-700">
          {systems.map((sys) => (
            <div
              key={sys.id}
              style={{ width: `${sys.power}%` }}
              className={`h-full bg-gradient-to-r ${sys.color} transition-all duration-200`}
              title={`${sys.nameAr}: ${sys.power}%`}
            />
          ))}
        </div>
      </div>

      {/* Overload Alert Warning */}
      {isOverloadAlert && (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full p-3 rounded-2xl bg-rose-600/90 border-2 border-white text-white font-hud font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg animate-pulse"
        >
          <AlertTriangle className="w-5 h-5 text-yellow-300 shrink-0" />
          <span>تحذير: تجاوزت الطاقة القصوى المتاحة (100 ميجاوات)! خفّض أحد الأنظمة أولاً!</span>
        </motion.div>
      )}

      {/* 4 Systems Sliders */}
      <div className="w-full flex flex-col gap-3.5">
        {systems.map((sys) => (
          <div
            key={sys.id}
            className="p-3.5 rounded-2xl bg-slate-900/80 border-2 border-slate-700 hover:border-cyan-400/60 transition-all flex flex-col gap-2"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {sys.icon}
                <div>
                  <h4 className="font-hud font-black text-xs sm:text-sm text-white">
                    {sys.nameAr}
                  </h4>
                  <span className="text-[10px] text-slate-400 font-bold block">
                    {sys.descriptionAr}
                  </span>
                </div>
              </div>

              <span className="font-hud font-black text-sm text-cyan-200 px-2.5 py-0.5 rounded-lg bg-slate-800 border border-slate-600">
                {sys.power} MW
              </span>
            </div>

            {/* Slider with Touch Control */}
            <input
              type="range"
              min={sys.minPower}
              max={60}
              step={1}
              value={sys.power}
              onChange={(e) => handleSliderChange(sys.id, parseInt(e.target.value, 10))}
              className="w-full accent-cyan-400 cursor-pointer h-2 bg-slate-950 rounded-lg"
            />
          </div>
        ))}
      </div>

      {/* Action Button */}
      {!isBalancedSuccess ? (
        <button
          type="button"
          onClick={handleConfirmDistribution}
          className="w-full py-4 px-6 rounded-2xl btn-chunky-adventure text-slate-950 font-hud font-black text-lg flex items-center justify-center gap-3 shadow-xl cursor-pointer active:scale-95"
        >
          <span>تأكيد وتشغيل توزيع الطاقة ⚡</span>
        </button>
      ) : (
        <div className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-hud font-black text-base flex items-center justify-center gap-2 shadow-lg animate-bounce">
          <CheckCircle2 className="w-6 h-6" />
          <span>تم تشغيل وتأمين جميع أنظمة المحطة بنجاح! 🚀</span>
        </div>
      )}
    </div>
  );
};

export default ResourceDashboard;
