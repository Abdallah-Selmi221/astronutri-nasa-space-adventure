import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useGameState } from '../../context/GameContext';
import { AnimatedRobo } from '../common/AnimatedRobo';
import { soundManager } from '../../utils/sound';
import { 
  ArrowRight, 
  Rocket, 
  Scale, 
  Flame, 
  RotateCcw, 
  Star
} from 'lucide-react';

interface ReturnCargoItem {
  id: string;
  nameAr: string;
  weightKg: number;
  icon: string;
  category: string;
}

const AVAILABLE_CARGO: ReturnCargoItem[] = [
  { id: 'ice_core', nameAr: 'عينة الجليد القمري العميق', weightKg: 25, icon: '🧊', category: 'scientific' },
  { id: 'rock_sample', nameAr: 'صخرة بازلت من فوهة شاكلتون', weightKg: 30, icon: '🪨', category: 'geological' },
  { id: 'biodome_seeds', nameAr: 'بذور القبة المائية المتكيفة', weightKg: 20, icon: '🌱', category: 'biological' },
  { id: 'telemetry_drive', nameAr: 'وحدة تسجيل بيانات الرحلة', weightKg: 15, icon: '💾', category: 'data' },
  { id: 'heavy_regolith', nameAr: 'كتلة تراب قمري ثقيلة', weightKg: 45, icon: '🧱', category: 'heavy' }
];

export const ReturnToEarth: React.FC = () => {
  const { state, setLocation, resetGameFull, completeReturnMission } = useGameState();
  const { cadetName } = state;

  // Stages: 1 = Cargo Balancing, 2 = Ascent, 3 = Re-Entry Plasma, 4 = Splashdown
  const [returnStage, setReturnStage] = useState<1 | 2 | 3 | 4>(1);

  // Cargo Bay State
  const [leftBay, setLeftBay] = useState<ReturnCargoItem[]>([AVAILABLE_CARGO[0]]); // 25kg
  const [rightBay, setRightBay] = useState<ReturnCargoItem[]>([AVAILABLE_CARGO[1]]); // 30kg
  const [unassignedCargo, setUnassignedCargo] = useState<ReturnCargoItem[]>([
    AVAILABLE_CARGO[2],
    AVAILABLE_CARGO[3],
    AVAILABLE_CARGO[4]
  ]);

  // Physical Drag-and-Drop Drop Zone Targets
  const leftBayRef = useRef<HTMLDivElement>(null);
  const rightBayRef = useRef<HTMLDivElement>(null);
  const [_draggedItem, setDraggedItem] = useState<ReturnCargoItem | null>(null);
  const [isOverLeft, setIsOverLeft] = useState<boolean>(false);
  const [isOverRight, setIsOverRight] = useState<boolean>(false);

  // Re-Entry Heat Shield Balance State
  const [capsuleAngle, setCapsuleAngle] = useState<number>(0); // -40 to +40 deg
  const [reentryProgress, setReentryProgress] = useState<number>(0); // 0 to 100%
  const [isOverheating, setIsOverheating] = useState<boolean>(false);

  // Calculate Weights
  const leftWeight = leftBay.reduce((sum, item) => sum + item.weightKg, 0);
  const rightWeight = rightBay.reduce((sum, item) => sum + item.weightKg, 0);
  const totalWeight = leftWeight + rightWeight;
  const weightDifference = Math.abs(leftWeight - rightWeight);

  const isWeightSafe = totalWeight <= 100;
  const isBalanceSafe = weightDifference <= 15;
  const canLaunchAscent = isWeightSafe && isBalanceSafe && (leftBay.length + rightBay.length >= 2);

  // Re-entry heat shield simulation loop
  useEffect(() => {
    if (returnStage === 3) {
      const interval = window.setInterval(() => {
        // Natural aerodynamic turbulence swings capsule angle
        const turbulence = (Math.random() - 0.49) * 9;
        setCapsuleAngle((prev) => {
          const next = prev + turbulence;
          const clamped = Math.max(-42, Math.min(42, next));
          setIsOverheating(Math.abs(clamped) > 18);
          return clamped;
        });

        setReentryProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setReturnStage(4);
            completeReturnMission();
            soundManager.playFanfare();
            confetti({ particleCount: 200, spread: 100, origin: { y: 0.6 } });
            return 100;
          }
          return prev + 2.8;
        });
      }, 180);

      return () => clearInterval(interval);
    }
  }, [returnStage]);

  const handleAssignToBay = (item: ReturnCargoItem, bay: 'left' | 'right') => {
    soundManager.playClick();
    setUnassignedCargo((prev) => prev.filter((c) => c.id !== item.id));
    if (bay === 'left') {
      setLeftBay((prev) => [...prev, item]);
    } else {
      setRightBay((prev) => [...prev, item]);
    }
  };

  const handleRemoveFromBay = (item: ReturnCargoItem, bay: 'left' | 'right') => {
    soundManager.playClick();
    if (bay === 'left') {
      setLeftBay((prev) => prev.filter((c) => c.id !== item.id));
    } else {
      setRightBay((prev) => prev.filter((c) => c.id !== item.id));
    }
    setUnassignedCargo((prev) => [...prev, item]);
  };

  const handleDragOver = (e: React.DragEvent, bay: 'left' | 'right') => {
    e.preventDefault();
    if (bay === 'left') setIsOverLeft(true);
    else setIsOverRight(true);
  };

  const handleDragLeave = (_e: React.DragEvent, bay: 'left' | 'right') => {
    if (bay === 'left') setIsOverLeft(false);
    else setIsOverRight(false);
  };

  const handleDrop = (e: React.DragEvent, bay: 'left' | 'right') => {
    e.preventDefault();
    setIsOverLeft(false);
    setIsOverRight(false);
    const itemId = e.dataTransfer.getData('text/plain');
    const targetItem = AVAILABLE_CARGO.find((c) => c.id === itemId);
    if (targetItem) {
      handleAssignToBay(targetItem, bay);
      soundManager.playDropSuccess();
    }
  };

  const handleStartAscent = () => {
    soundManager.playFanfare();
    setReturnStage(2);
    setTimeout(() => {
      setReturnStage(3);
    }, 3800);
  };

  const nudgeSteering = (dir: -1 | 1) => {
    soundManager.playClick();
    setCapsuleAngle((prev) => {
      const next = prev + dir * 12;
      return Math.max(-40, Math.min(40, next));
    });
  };

  return (
    <div className="w-full max-w-7xl mx-auto pt-24 pb-8 px-3 sm:px-6 flex flex-col gap-4 flex-1 relative overflow-hidden">
      {/* Top Breadcrumb Navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLocation('Map')}
            className="p-2.5 rounded-2xl bg-space-900 hover:bg-space-800 border-2 border-cyan-500/40 text-cyan-300 hover:text-white transition-all flex items-center gap-1.5 text-xs font-black shadow-md"
          >
            <ArrowRight className="w-4 h-4 text-cyan-400" />
            <span>خريطة الأكاديمية</span>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-orange-950 text-orange-300 border border-orange-500/50">
                المرحلة 4: الختامية 🌍
              </span>
              <h2 className="font-hud font-black text-xl sm:text-2xl text-white tracking-wide flex items-center gap-2">
                رحلة العودة إلى كوكب الأرض <span className="text-cyan-400">🚀</span>
              </h2>
            </div>
            <p className="text-xs text-slate-300">
              توازن وزن عينات القمر • انطلاق العودة • اختراق بلازما الغلاف الجوي • الهبوط المائي
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-space-900/90 px-4 py-2 rounded-2xl border-2 border-cyan-500/30 text-xs font-black">
          <span className="text-slate-400">حالة الكبسولة:</span>
          <span className={returnStage === 4 ? 'text-emerald-400' : 'text-amber-300'}>
            {returnStage === 1 && 'مرحلة موازنة وزن الحمولة'}
            {returnStage === 2 && 'إقلاع صعود مدار القمر! 🔥'}
            {returnStage === 3 && 'دخول بلازما الغلاف الجوي! ☄️'}
            {returnStage === 4 && 'هبوط مائي آمن بالمحيط! 🌊'}
          </span>
        </div>
      </div>

      {/* Robo Guidance Banner (Casual Kids UI) */}
      <div className="mb-6 p-4 casual-card flex flex-col sm:flex-row items-center gap-4">
        <div className="shrink-0">
          <AnimatedRobo
            state={returnStage === 4 ? 'CELEBRATING' : isOverheating ? 'WARNING' : 'EXPLAINING'}
            size="sm"
            showSpeechBubble={false}
          />
        </div>
        <div className="flex-1 text-right">
          <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-cyan-900/80 text-cyan-200 border border-cyan-400/40 mb-1 inline-block">
            إرشادات روبو لرحلة العودة 🤖
          </span>
          <p className="text-xs sm:text-sm text-slate-200 font-bold leading-relaxed">
            {returnStage === 1 &&
              'يا بطل، كبسولة العودة حساسة جداً لمركز الثقل! حمولة الكبسولة لازم ما تزيدش عن 100 كجم، والفرق بين الجانب الأيمن والأيسر ما يزيدش عن 15 كجم عشان الكبسولة ما تنقلبش في الفضاء!'}
            {returnStage === 2 &&
              'محركات الصعود القمري تعمل بكفاءة! ننطلق الآن من سطح القمر عودةً إلى الوطن الأم.. كوكب الأرض! 🌕➡️🌍'}
            {returnStage === 3 &&
              'حاسب يا كابتن! درجات الحرارة وصلت 1600 درجة مئوية في طبقة البلازما! حافظ على اتجاه درع الحماية في المنطقة الخضراء باستخدام أزرار التوجيه!'}
            {returnStage === 4 &&
              'مبروووووك! تفتحت المظلات وهبطت الكبسولة بسلام في مياه المحيط الهادئ! أنجزت كل مهمات ناسا بنجاح باهر واستحقيت وسام بطل الفضاء الذهبي!'}
          </p>
        </div>
      </div>

      {/* ======================================================== */}
      {/* STAGE 4.1: CARGO WEIGHT & CENTER-OF-GRAVITY BALANCING    */}
      {/* ======================================================== */}
      {returnStage === 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Orion Capsule Cross-Section Header */}
          <div className="lg:col-span-12 flex flex-col items-center justify-center p-3 rounded-2xl bg-gradient-to-r from-cyan-950/70 via-slate-900/90 to-cyan-950/70 border border-cyan-400/40 shadow-inner">
            <div className="w-28 sm:w-36 h-2.5 bg-gradient-to-r from-cyan-400 via-amber-300 to-cyan-400 rounded-full shadow-[0_0_12px_rgba(34,211,238,0.7)] mb-1.5" />
            <span className="text-xs sm:text-sm font-hud font-black text-cyan-200 tracking-wide">
              مقطع مقصورة كبسولة العودة (Orion Cargo Bay Cross-Section) ⚖️
            </span>
          </div>

          {/* Left Bay Container (Drop Zone A) */}
          <div
            ref={leftBayRef}
            onDragOver={(e) => handleDragOver(e, 'left')}
            onDragLeave={(e) => handleDragLeave(e, 'left')}
            onDrop={(e) => handleDrop(e, 'left')}
            className={`lg:col-span-4 p-5 rounded-3xl bg-space-950/90 border-2 transition-all shadow-xl flex flex-col ${
              isOverLeft
                ? 'border-emerald-400 bg-emerald-950/50 shadow-[0_0_30px_rgba(52,211,153,0.5)] scale-[1.02]'
                : 'border-cyan-500/40'
            }`}
          >
            <div className="flex items-center justify-between mb-3 border-b border-cyan-500/30 pb-2">
              <span className="text-xs font-black text-cyan-300">مقصورة الحمولة اليسرى (Left Bay)</span>
              <span className="text-xs font-hud font-black text-yellow-300">{leftWeight} كجم</span>
            </div>

            <div className="flex-1 min-h-[160px] flex flex-col gap-2">
              {leftBay.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-space-900 border border-cyan-400/30 text-xs shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{item.icon}</span>
                    <span className="font-bold text-white">{item.nameAr}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-black">{item.weightKg} كجم</span>
                    <button
                      onClick={() => handleRemoveFromBay(item, 'left')}
                      className="px-2 py-1 rounded-lg bg-red-950 hover:bg-red-900 border border-red-500 text-red-300 text-[10px] font-black"
                    >
                      إزالة
                    </button>
                  </div>
                </div>
              ))}
              {leftBay.length === 0 && (
                <div className={`flex-1 flex flex-col items-center justify-center p-4 text-xs font-bold border-2 border-dashed rounded-2xl transition-colors ${
                  isOverLeft ? 'border-emerald-400 text-emerald-300 bg-emerald-950/30' : 'border-slate-700 text-slate-500'
                }`}>
                  <span className="text-2xl mb-1">📥</span>
                  <span>{isOverLeft ? 'أفلت العينة هنا!' : 'اسحب العينة وأفلتها هنا'}</span>
                </div>
              )}
            </div>
          </div>

          {/* Center Weight & Center-of-Gravity Gauge */}
          <div className="lg:col-span-4 p-6 rounded-3xl bg-gradient-to-b from-space-900 via-sky-950 to-space-950 border-3 border-amber-400/60 shadow-2xl flex flex-col items-center justify-between text-center">
            <div className="w-16 h-16 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-3xl mb-2">
              <Scale className="w-8 h-8 text-amber-300" />
            </div>

            <h3 className="font-hud font-black text-lg text-white mb-1">
              ميزان كبسولة العودة (Centering Balance)
            </h3>
            <p className="text-[11px] text-slate-300 mb-4 font-bold">
              الوزن الأقصى: 100 كجم • فرق التوازن المسموح: أقل من 15 كجم
            </p>

            {/* Total Weight Bar */}
            <div className="w-full mb-4 text-right">
              <div className="flex justify-between text-xs font-black mb-1">
                <span className={isWeightSafe ? 'text-emerald-300' : 'text-rose-400'}>
                  {totalWeight} / 100 كجم
                </span>
                <span className="text-slate-400">الوزن الإجمالي:</span>
              </div>
              <div className="w-full h-3 rounded-full bg-space-800 overflow-hidden border border-slate-600">
                <div
                  className={`h-full transition-all duration-300 ${
                    totalWeight > 100
                      ? 'bg-rose-500'
                      : totalWeight > 80
                      ? 'bg-amber-400'
                      : 'bg-emerald-400'
                  }`}
                  style={{ width: `${Math.min(100, (totalWeight / 100) * 100)}%` }}
                />
              </div>
            </div>

            {/* Real Seesaw Balance Tilt Scale */}
            <div className="w-full p-3 rounded-2xl bg-space-950/90 border border-slate-700 mb-4 flex flex-col items-center">
              <div className="w-full flex justify-between text-[11px] font-black text-slate-300 mb-3">
                <span className="text-cyan-300">يسار: {leftWeight} كجم</span>
                <span className={isBalanceSafe ? 'text-emerald-400 font-extrabold' : 'text-rose-400 font-extrabold'}>
                  الفرق: {weightDifference} كجم ({isBalanceSafe ? 'متزن ومستقر ✓' : 'مائل وخطر ⚠️'})
                </span>
                <span className="text-cyan-300">يمين: {rightWeight} كجم</span>
              </div>

              {/* Animated Tilting Seesaw Beam */}
              <div className="relative w-48 sm:w-56 h-12 flex items-center justify-center">
                {/* Tilting Beam */}
                <motion.div
                  animate={{ rotate: Math.max(-20, Math.min(20, (rightWeight - leftWeight) * 0.9)) }}
                  transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                  className="w-full h-2.5 rounded-full bg-gradient-to-r from-cyan-400 via-amber-300 to-cyan-400 relative shadow flex items-center justify-between px-1"
                >
                  <div className={`w-4 h-4 rounded-full border-2 border-white shadow ${leftWeight > rightWeight ? 'bg-amber-400 scale-110' : 'bg-cyan-500'}`} />
                  <div className={`w-4 h-4 rounded-full border-2 border-white shadow ${rightWeight > leftWeight ? 'bg-amber-400 scale-110' : 'bg-cyan-500'}`} />
                </motion.div>

                {/* Central Fulcrum Pivot Triangle */}
                <div className="absolute bottom-0 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-b-[18px] border-b-cyan-400" />
              </div>
            </div>

            {/* Launch Return Capsule Action Button */}
            <motion.button
              whileHover={canLaunchAscent ? { scale: 1.04 } : undefined}
              whileTap={canLaunchAscent ? { scale: 0.96 } : undefined}
              onClick={handleStartAscent}
              disabled={!canLaunchAscent}
              className={`w-full py-4 px-6 rounded-2xl font-hud font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-xl transition-all ${
                canLaunchAscent
                  ? 'bg-gradient-to-r from-amber-400 via-orange-500 to-yellow-400 text-space-950 shadow-orange-500/50 hover:brightness-110 animate-pulse border-2 border-yellow-200'
                  : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
              }`}
            >
              <Rocket className="w-5 h-5 fill-current" />
              <span>
                {canLaunchAscent
                  ? 'إغلاق الكبسولة والانطلاق للأرض! 🚀'
                  : !isWeightSafe
                  ? 'حمولة زائدة عن 100 كجم!'
                  : !isBalanceSafe
                  ? 'توازن الكبسولة مائل وغير آمن!'
                  : 'ضع عينات متزنة في الجانبين'}
              </span>
            </motion.button>
          </div>

          {/* Right Bay Container (Drop Zone B) */}
          <div
            ref={rightBayRef}
            onDragOver={(e) => handleDragOver(e, 'right')}
            onDragLeave={(e) => handleDragLeave(e, 'right')}
            onDrop={(e) => handleDrop(e, 'right')}
            className={`lg:col-span-4 p-5 rounded-3xl bg-space-950/90 border-2 transition-all shadow-xl flex flex-col ${
              isOverRight
                ? 'border-emerald-400 bg-emerald-950/50 shadow-[0_0_30px_rgba(52,211,153,0.5)] scale-[1.02]'
                : 'border-cyan-500/40'
            }`}
          >
            <div className="flex items-center justify-between mb-3 border-b border-cyan-500/30 pb-2">
              <span className="text-xs font-black text-cyan-300">مقصورة الحمولة اليمنى (Right Bay)</span>
              <span className="text-xs font-hud font-black text-yellow-300">{rightWeight} كجم</span>
            </div>

            <div className="flex-1 min-h-[160px] flex flex-col gap-2">
              {rightBay.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-space-900 border border-cyan-400/30 text-xs shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{item.icon}</span>
                    <span className="font-bold text-white">{item.nameAr}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-black">{item.weightKg} كجم</span>
                    <button
                      onClick={() => handleRemoveFromBay(item, 'right')}
                      className="px-2 py-1 rounded-lg bg-red-950 hover:bg-red-900 border border-red-500 text-red-300 text-[10px] font-black"
                    >
                      إزالة
                    </button>
                  </div>
                </div>
              ))}
              {rightBay.length === 0 && (
                <div className={`flex-1 flex flex-col items-center justify-center p-4 text-xs font-bold border-2 border-dashed rounded-2xl transition-colors ${
                  isOverRight ? 'border-emerald-400 text-emerald-300 bg-emerald-950/30' : 'border-slate-700 text-slate-500'
                }`}>
                  <span className="text-2xl mb-1">📥</span>
                  <span>{isOverRight ? 'أفلت العينة هنا!' : 'اسحب العينة وأفلتها هنا'}</span>
                </div>
              )}
            </div>
          </div>

          {/* Available Lunar Samples Ready for Physical Drag and Drop */}
          <div className="lg:col-span-12 p-5 rounded-3xl bg-space-900/80 border-2 border-slate-700 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-hud font-black text-sm text-cyan-300 flex items-center gap-2">
                <span>عينات ومعدات القمر المتاحة للنقل إلى الأرض:</span>
                <span className="text-xs text-slate-400 font-normal">
                  (اسحب العينة بيدك أو بالفأرة وأفلتها داخل المقصورة اليمنى أو اليسرى)
                </span>
              </h4>
              <span className="text-[11px] font-black text-amber-300 bg-amber-950/60 px-2.5 py-0.5 rounded-full border border-amber-500/40 hidden sm:inline">
                ✨ سحب وإفلات تفاعلي (Drag & Drop)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {unassignedCargo.map((item) => (
                <motion.div
                  key={item.id}
                  drag
                  dragSnapToOrigin
                  whileHover={{ scale: 1.02 }}
                  whileDrag={{ scale: 1.08, zIndex: 60, boxShadow: '0 20px 35px rgba(0,0,0,0.8)' }}
                  style={{ touchAction: 'none' }}
                  onDragStart={() => {
                    setDraggedItem(item);
                    soundManager.playClick();
                  }}
                  onDrag={(_e, info) => {
                    const x = info.point.x;
                    const y = info.point.y;
                    if (leftBayRef.current) {
                      const rect = leftBayRef.current.getBoundingClientRect();
                      setIsOverLeft(x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom);
                    }
                    if (rightBayRef.current) {
                      const rect = rightBayRef.current.getBoundingClientRect();
                      setIsOverRight(x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom);
                    }
                  }}
                  onDragEnd={(_e, info) => {
                    const x = info.point.x;
                    const y = info.point.y;
                    setIsOverLeft(false);
                    setIsOverRight(false);
                    setDraggedItem(null);

                    if (leftBayRef.current) {
                      const rect = leftBayRef.current.getBoundingClientRect();
                      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
                        handleAssignToBay(item, 'left');
                        soundManager.playDropSuccess();
                        return;
                      }
                    }

                    if (rightBayRef.current) {
                      const rect = rightBayRef.current.getBoundingClientRect();
                      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
                        handleAssignToBay(item, 'right');
                        soundManager.playDropSuccess();
                        return;
                      }
                    }
                  }}
                  className="p-3.5 rounded-2xl bg-space-950 border border-slate-700 flex items-center justify-between hover:border-cyan-400/60 transition-all cursor-grab active:cursor-grabbing select-none touch-none shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl filter drop-shadow">{item.icon}</span>
                    <div>
                      <h5 className="font-bold text-xs text-white">{item.nameAr}</h5>
                      <span className="text-[11px] font-black text-amber-300">{item.weightKg} كجم</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-cyan-400/70 mr-1 hidden md:inline">
                      🖐️ اسحب أو:
                    </span>
                    <button
                      type="button"
                      onClick={() => handleAssignToBay(item, 'left')}
                      className="px-2.5 py-1.5 rounded-xl bg-cyan-950 hover:bg-cyan-900 border border-cyan-400 text-cyan-200 text-[10px] font-black"
                    >
                      ⬅ يسار
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAssignToBay(item, 'right')}
                      className="px-2.5 py-1.5 rounded-xl bg-cyan-950 hover:bg-cyan-900 border border-cyan-400 text-cyan-200 text-[10px] font-black"
                    >
                      يمين ➡
                    </button>
                  </div>
                </motion.div>
              ))}
              {unassignedCargo.length === 0 && (
                <div className="col-span-full py-4 text-center text-emerald-400 text-xs font-bold">
                  ✓ تم تحميل كل العينات المتاحة داخل مقصورات الكبسولة
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* STAGE 4.2: LUNAR ASCENT ANIMATION                        */}
      {/* ======================================================== */}
      {returnStage === 2 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex-1 flex flex-col items-center justify-center p-8 bg-space-950/95 rounded-3xl border-2 border-cyan-500/50 text-center min-h-[460px] relative overflow-hidden"
        >
          <motion.div
            initial={{ y: 150, scale: 0.9 }}
            animate={{ y: -160, scale: 1.25 }}
            transition={{ duration: 3.6, ease: 'easeInOut' }}
            className="flex flex-col items-center z-10"
          >
            <div className="w-28 h-28 rounded-full bg-gradient-to-t from-orange-500 via-amber-400 to-yellow-200 flex items-center justify-center text-5xl shadow-2xl shadow-orange-500/80 mb-3 animate-pulse">
              🚀
            </div>
            <div className="w-16 h-28 bg-gradient-to-b from-orange-500 via-yellow-400 to-transparent blur-md" />
          </motion.div>

          <div className="z-20 text-center mt-6">
            <h3 className="font-hud font-black text-2xl text-white mb-2 animate-bounce">
              صعود مداري من فوهة شاكلتون! 🌕🔥
            </h3>
            <p className="text-sm text-cyan-300 font-bold">
              الكبسولة تنطلق بسرعة الإفلات متجهةً إلى مدار كوكب الأرض...
            </p>
          </div>
        </motion.div>
      )}

      {/* ======================================================== */}
      {/* STAGE 4.3: ATMOSPHERIC RE-ENTRY PLASMA HEAT SHIELD QTE   */}
      {/* ======================================================== */}
      {returnStage === 3 && (
        <div className="flex-1 flex flex-col p-6 sm:p-8 bg-gradient-to-b from-orange-950/80 via-space-950 to-space-950 rounded-3xl border-3 border-orange-500 shadow-2xl relative overflow-hidden">
          {/* Plasma Fire Ambient Glow */}
          <motion.div
            animate={{ opacity: [0.35, 0.75, 0.35] }}
            transition={{ repeat: Infinity, duration: 0.6 }}
            className="absolute inset-0 bg-gradient-to-t from-transparent via-orange-600/20 to-yellow-500/30 pointer-events-none"
          />

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 z-10">
            <div>
              <span className="text-xs font-black px-3 py-1 rounded-full bg-red-950 text-red-300 border border-red-500 flex items-center gap-1.5 w-fit mb-2">
                <Flame className="w-4 h-4 text-orange-400 animate-pulse" />
                <span>حرارة درع الحماية: 1600°C (طبقة البلازما)</span>
              </span>
              <h3 className="font-hud font-black text-xl sm:text-2xl text-white">
                توجيه درع الحماية الحراري (PICA-X Re-Entry)
              </h3>
            </div>

            {/* Re-entry Progress Bar */}
            <div className="w-full sm:w-64 text-right">
              <div className="flex justify-between text-xs font-black text-slate-300 mb-1">
                <span className="text-yellow-300">{Math.round(reentryProgress)}%</span>
                <span>اكتمال اختراق الغلاف:</span>
              </div>
              <div className="w-full h-3 rounded-full bg-space-900 border border-orange-500/50 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-orange-500 to-yellow-400 transition-all duration-200"
                  style={{ width: `${reentryProgress}%` }}
                />
              </div>
            </div>
          </div>

          {/* Interactive Gyroscope / Angle Visualization */}
          <div className="flex-1 flex flex-col items-center justify-center my-6 z-10">
            <div className="relative w-64 h-64 flex items-center justify-center">
              {/* Green Safe Cone Angle Target */}
              <div className="absolute w-48 h-48 rounded-full border-4 border-dashed border-emerald-400/60 flex items-center justify-center">
                <div className="w-32 h-32 rounded-full bg-emerald-500/10" />
              </div>

              {/* Tilted Capsule Visual */}
              <motion.div
                animate={{ rotate: capsuleAngle }}
                transition={{ type: 'spring', damping: 18, stiffness: 200 }}
                className="relative flex flex-col items-center"
              >
                <div className="text-6xl mb-1 filter drop-shadow-[0_0_20px_rgba(249,115,22,0.8)]">
                  🛸
                </div>
                {/* Plasma Shield Bow Shock */}
                <div
                  className={`w-28 h-6 rounded-full blur-sm transition-all ${
                    isOverheating ? 'bg-red-500 scale-125 animate-ping' : 'bg-orange-400'
                  }`}
                />
              </motion.div>
            </div>

            {/* Tilt Angle Feedback Text */}
            <div className="text-center mt-3">
              <span
                className={`font-hud font-black text-sm px-4 py-1.5 rounded-full border ${
                  isOverheating
                    ? 'bg-red-950 text-red-300 border-red-500 animate-bounce'
                    : 'bg-emerald-950 text-emerald-300 border-emerald-500'
                }`}
              >
                {isOverheating
                  ? `⚠️ انحراف خطير: ${Math.round(capsuleAngle)}°! وجّه الكبسولة للمنتصف فوراً!`
                  : `✓ زاوية الدخول آمنة: ${Math.round(capsuleAngle)}° (ضمن النطاق المسموح)`}
              </span>
            </div>
          </div>

          {/* Player Steering Controls */}
          <div className="grid grid-cols-2 gap-4 max-w-md mx-auto w-full z-10">
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => nudgeSteering(-1)}
              className="py-4 px-6 rounded-2xl bg-space-900 hover:bg-space-850 border-2 border-cyan-400 text-cyan-200 font-hud font-black text-base shadow-xl flex items-center justify-center gap-2"
            >
              <span>توجيه يسار ◀</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => nudgeSteering(1)}
              className="py-4 px-6 rounded-2xl bg-space-900 hover:bg-space-850 border-2 border-cyan-400 text-cyan-200 font-hud font-black text-base shadow-xl flex items-center justify-center gap-2"
            >
              <span>توجيه يمين ▶</span>
            </motion.button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* STAGE 4.4: OCEAN SPLASHDOWN & GOLD MEDAL CEREMONY        */}
      {/* ======================================================== */}
      {returnStage === 4 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex-1 flex flex-col p-6 sm:p-10 bg-gradient-to-b from-sky-950 via-space-950 to-space-950 rounded-3xl border-4 border-yellow-400 shadow-2xl text-center relative overflow-hidden my-auto"
        >
          {/* Floating Gold Confetti Glow */}
          <div className="w-24 h-24 rounded-full bg-gradient-to-t from-yellow-500 to-amber-300 border-4 border-yellow-200 flex items-center justify-center text-5xl mx-auto mb-3 shadow-2xl shadow-yellow-500/60 animate-bounce">
            🥇
          </div>

          <div className="inline-flex items-center gap-2 px-5 py-1.5 rounded-full bg-amber-950 border border-amber-400 text-yellow-300 font-hud font-black text-xs uppercase mx-auto mb-3">
            <Star className="w-4 h-4 fill-yellow-400" />
            <span>وسام رائد الفضاء الذهبي الشامل من ناسا</span>
            <Star className="w-4 h-4 fill-yellow-400" />
          </div>

          <h3 className="font-hud font-black text-2xl sm:text-3xl text-white mb-2">
            مرحباً بعودتك إلى كوكب الأرض يا كابتن {cadetName}! 🌍✨
          </h3>

          <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto mb-6 font-bold leading-relaxed">
            لقد أتممت بنجاح أضخم مهمة فضائية وتغذوية متكاملة في تاريخ الأكاديمية! هبطت كبسولتك بسلام في مياه المحيط الهادئ بحمولة علمية متزنة قدرها <span className="text-yellow-300">{totalWeight} كجم</span>.
          </p>

          {/* 4 Stages Grand Accomplishment Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 max-w-4xl mx-auto w-full mb-8 text-right">
            <div className="p-3.5 rounded-2xl bg-space-900/90 border border-emerald-500/40">
              <span className="text-[10px] text-emerald-400 font-black block mb-0.5">المرحلة 1: قاعدة الأرض ✓</span>
              <h5 className="font-hud font-black text-xs text-white">فحص البدلة وعصير الأملاح والإقلاع</h5>
            </div>

            <div className="p-3.5 rounded-2xl bg-space-900/90 border border-emerald-500/40">
              <span className="text-[10px] text-emerald-400 font-black block mb-0.5">المرحلة 2: رحلة الفضاء ✓</span>
              <h5 className="font-hud font-black text-xs text-white">توازن وجبة الفضاء وحظر الفتات</h5>
            </div>

            <div className="p-3.5 rounded-2xl bg-space-900/90 border border-emerald-500/40">
              <span className="text-[10px] text-emerald-400 font-black block mb-0.5">المرحلة 3: قاعدة القمر ✓</span>
              <h5 className="font-hud font-black text-xs text-white">تدوير 98% ماء ومواجهة العاصفة الشمسية</h5>
            </div>

            <div className="p-3.5 rounded-2xl bg-space-900/90 border border-emerald-500/40">
              <span className="text-[10px] text-emerald-400 font-black block mb-0.5">المرحلة 4: العودة للأرض ✓</span>
              <h5 className="font-hud font-black text-xs text-white">توازن الحمولة واختراق البلازما</h5>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto w-full">
            <button
              onClick={() => resetGameFull()}
              className="py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-yellow-400 text-space-950 font-hud font-black text-sm shadow-xl hover:brightness-110 flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>إعادة خوض المغامرة الكبرى 🚀</span>
            </button>

            <button
              onClick={() => setLocation('Map')}
              className="py-4 px-6 rounded-2xl bg-space-850 hover:bg-space-800 border-2 border-cyan-500/40 text-white font-hud font-black text-sm flex items-center justify-center gap-2"
            >
              <ArrowRight className="w-4 h-4 text-cyan-400" />
              <span>العودة لخريطة الأكاديمية</span>
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default ReturnToEarth;
