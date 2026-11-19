import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { soundManager } from '../../utils/sound';
import { dialogueManager } from '../../utils/geminiTTS';
import { useGameState } from '../../context/GameContext';
import { tr } from '../../utils/i18n';
import { Droplets, AlertTriangle, CheckCircle2, RotateCcw } from 'lucide-react';

interface HydrationGameProps {
  onComplete?: () => void;
  compact?: boolean;
}

export const HydrationGame: React.FC<HydrationGameProps> = ({ onComplete, compact = false }) => {
  const { language } = useGameState();
  const langDir = language === 'ar' ? 'rtl' : 'ltr';
  const [hydrationLevel, setHydrationLevel] = useState<number>(15);
  const [waterWaste, setWaterWaste] = useState<number>(0);
  const [isPressing, setIsPressing] = useState<boolean>(false);
  const [wasteWarning, setWasteWarning] = useState<boolean>(false);
  const [isFinished, setIsFinished] = useState<boolean>(false);

  // Escaping water droplets in zero-g
  const [escapingDrops, setEscapingDrops] = useState<Array<{ id: number; x: number; y: number }>>([]);

  const holdStartTimeRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastTickTimeRef = useRef<number>(performance.now());
  const dropCounterRef = useRef<number>(0);

  const triggerWasteWarning = useCallback(() => {
    soundManager.playAlertSiren();
    setWasteWarning(true);
    setWaterWaste((prev) => Math.min(100, prev + 8));

    // Spawn 3 floating zero-g bubbles
    const newDrops = Array.from({ length: 3 }, () => ({
      id: dropCounterRef.current++,
      x: 35 + Math.random() * 30,
      y: 20 + Math.random() * 20
    }));
    setEscapingDrops((prev) => [...prev, ...newDrops]);

    void dialogueManager.speak(
      tr(
        language,
        'Pause and swallow! Holding continuously sprays floating water droplets inside the cabin!',
        'توقف وابلع يا بطل! الضغط الطويل يطيّر قطرات الماء في الكابينة!'
      )
    );
  }, [language]);

  const updateLoop = useCallback(() => {
    if (!isPressing || isFinished) return;

    const now = performance.now();
    const dt = (now - lastTickTimeRef.current) / 1000;
    lastTickTimeRef.current = now;

    if (holdStartTimeRef.current !== null) {
      const holdDuration = (now - holdStartTimeRef.current) / 1000;

      // Penalty logic: continuous hold > 3.0 seconds without swallow pause
      if (holdDuration > 3.0) {
        triggerWasteWarning();
        holdStartTimeRef.current = now; // reset timer to prevent infinite spam
      }
    }

    setHydrationLevel((prev) => {
      const next = prev + 18 * dt;
      if (next >= 100) {
        setIsFinished(true);
        soundManager.playFanfare();
        void dialogueManager.speak(
          tr(
            language,
            'Awesome! You stayed 100% hydrated without wasting floating water drops! 🌟',
            'يا سلام! ارتويت تماماً بدون هدر قطرات في الفضاء! 🌟'
          )
        );
        if (onComplete) onComplete();
        return 100;
      }
      return next;
    });

    animationFrameRef.current = requestAnimationFrame(updateLoop);
  }, [isPressing, isFinished, triggerWasteWarning, onComplete, language]);

  useEffect(() => {
    if (isPressing && !isFinished) {
      lastTickTimeRef.current = performance.now();
      animationFrameRef.current = requestAnimationFrame(updateLoop);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPressing, isFinished, updateLoop]);

  const handlePointerDown = () => {
    if (isFinished) return;
    soundManager.playClick();
    setIsPressing(true);
    setWasteWarning(false);
    holdStartTimeRef.current = performance.now();
  };

  const handlePointerUp = () => {
    if (!isPressing) return;
    setIsPressing(false);
    holdStartTimeRef.current = null;
    soundManager.playBoing();
  };

  const handleReset = () => {
    soundManager.playClick();
    setHydrationLevel(15);
    setWaterWaste(0);
    setIsFinished(false);
    setWasteWarning(false);
    setEscapingDrops([]);
  };

  // Water pouch volume percentage
  const pouchLiquidRemaining = Math.max(0, 100 - hydrationLevel);

  const renderPouchSvg = () => (
    <svg viewBox="0 0 180 240" className="w-full h-full filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.55)]">
      <defs>
        <linearGradient id="pouchBorder" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#bae6fd" />
          <stop offset="50%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>
        <linearGradient id="waterFlow" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#7dd3fc" />
          <stop offset="50%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>
        <clipPath id="pouchInnerClip">
          <path d="M 45 45 C 50 40, 130 40, 135 45 C 145 75, 145 185, 135 210 C 130 215, 50 215, 45 210 C 35 185, 35 75, 45 45 Z" />
        </clipPath>
      </defs>

      <rect x="84" y="8" width="12" height="36" rx="4" fill="#f8fafc" stroke="#64748b" strokeWidth="2" />
      <rect x="80" y="22" width="20" height="8" rx="3" fill="#ef4444" stroke="#991b1b" strokeWidth="1.5" />

      <path
        d="M 45 45 C 50 40, 130 40, 135 45 C 145 75, 145 185, 135 210 C 130 215, 50 215, 45 210 C 35 185, 35 75, 45 45 Z"
        fill="rgba(15, 23, 42, 0.75)"
        stroke="url(#pouchBorder)"
        strokeWidth="5"
      />

      <g clipPath="url(#pouchInnerClip)">
        <motion.rect
          x="30"
          y={215 - pouchLiquidRemaining * 1.6}
          width="120"
          height={pouchLiquidRemaining * 1.7}
          fill="url(#waterFlow)"
          opacity="0.85"
        />
        {isPressing && (
          <motion.path
            animate={{ x: [-20, 20, -20] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
            d={`M 20 ${215 - pouchLiquidRemaining * 1.6} Q 55 ${210 - pouchLiquidRemaining * 1.6} 90 ${215 - pouchLiquidRemaining * 1.6} T 160 ${215 - pouchLiquidRemaining * 1.6} L 160 220 L 20 220 Z`}
            fill="#38bdf8"
            opacity="0.9"
          />
        )}
      </g>

      <path d="M 52 60 Q 48 120 52 195" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.45" />
      <circle cx="90" cy="125" r="22" fill="#0369a1" stroke="#ffffff" strokeWidth="2" opacity="0.85" />
      <text x="90" y="130" fontSize="9" fontFamily="sans-serif" fontWeight="900" fill="#ffffff" textAnchor="middle">
        NASA 0G
      </text>
    </svg>
  );

  if (compact) {
    return (
      <div
        data-testid="hydration-game-compact"
        className="relative w-full rounded-2xl bg-slate-950/90 border border-cyan-400/55 p-1.5 flex items-center gap-2 select-none text-white"
        dir={langDir}
      >
        <div className="relative w-14 h-20 shrink-0 flex items-center justify-center">
          {escapingDrops.map((drop) => (
            <motion.div
              key={drop.id}
              initial={{ scale: 0, opacity: 1, x: 0, y: 0 }}
              animate={{ scale: [0.5, 1.2, 0.7], opacity: [1, 0.85, 0], y: -48 }}
              transition={{ duration: 1.4, ease: 'easeOut' }}
              className="absolute z-20 pointer-events-none text-sm"
              style={{ left: `${drop.x}%`, top: `${drop.y}%` }}
            >
              💧
            </motion.div>
          ))}
          {renderPouchSvg()}
        </div>

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center justify-between gap-1.5">
            <span className="font-hud font-black text-[11px] text-cyan-200 truncate">
              💧 {tr(language, '0G Sip Valve (pause every 2s)', 'صمام الشرب 0G (توقف كل ثانيتين)')}
            </span>
            <button
              type="button"
              onClick={handleReset}
              className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-600 cursor-pointer shrink-0"
              title={tr(language, 'Retry', 'إعادة المحاولة')}
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-1.5 text-[10px] font-hud font-bold">
            <div className="px-1.5 py-1 rounded-lg bg-slate-900 border border-cyan-400/40">
              <div className="flex justify-between text-cyan-200 mb-0.5">
                <span>{tr(language, 'Hydration', 'الارتواء')}</span>
                <span className="text-white font-black">{Math.round(hydrationLevel)}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500" style={{ width: `${hydrationLevel}%` }} />
              </div>
            </div>

            <div className="px-1.5 py-1 rounded-lg bg-slate-900 border border-rose-500/40">
              <div className="flex justify-between text-rose-200 mb-0.5">
                <span>{tr(language, 'Waste', 'الهدر')}</span>
                <span className="text-white font-black">{Math.round(waterWaste)}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div className={`h-full rounded-full ${waterWaste > 50 ? 'bg-rose-600' : 'bg-amber-400'}`} style={{ width: `${waterWaste}%` }} />
              </div>
            </div>
          </div>

          {wasteWarning && (
            <div className="text-[10px] font-black text-amber-200 bg-rose-950/90 border border-rose-400/60 px-2 py-0.5 rounded-lg truncate">
              ⚠️ {tr(language, 'Droplets floated! Release to swallow.', 'القطرات تطايرت! ارفع إصبعك للبلع.')}
            </div>
          )}

          {!isFinished ? (
            <button
              type="button"
              onMouseDown={handlePointerDown}
              onMouseUp={handlePointerUp}
              onMouseLeave={handlePointerUp}
              onTouchStart={handlePointerDown}
              onTouchEnd={handlePointerUp}
              className={`w-full py-1.5 px-3 rounded-xl font-hud font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer select-none transition-all ${
                isPressing
                  ? 'bg-gradient-to-r from-sky-400 to-blue-600 text-white'
                  : 'btn-chunky-adventure text-slate-950'
              }`}
            >
              <Droplets className="w-3.5 h-3.5" />
              <span>
                {isPressing
                  ? tr(language, 'Sipping in 0G… Pause to Swallow!', 'جاري الشرب… توقف للبلع!')
                  : tr(language, 'Press & Hold to Drink 🧃', 'اضغط مطولاً للشرب 🧃')}
              </span>
            </button>
          ) : (
            <div className="w-full py-1.5 px-3 rounded-xl bg-emerald-500/20 border border-emerald-400 text-emerald-200 font-hud font-black text-xs flex items-center justify-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{tr(language, '100% Hydrated ✓', 'ارتواء مكتمل 100% ✓')}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative w-full h-full p-3 sm:p-4 rounded-2xl bg-gradient-to-b from-sky-950/95 via-slate-900/95 to-slate-950/95 border-2 border-cyan-400 shadow-xl select-none text-white grid grid-cols-12 gap-3 items-center overflow-hidden"
      dir={langDir}
    >
      <div className="col-span-5 h-full flex items-center justify-center relative">
        {escapingDrops.map((drop) => (
          <motion.div
            key={drop.id}
            initial={{ scale: 0, opacity: 1, x: 0, y: 0 }}
            animate={{
              scale: [0.5, 1.4, 0.8],
              opacity: [1, 0.9, 0],
              x: (Math.random() - 0.5) * 140,
              y: -100 - Math.random() * 50
            }}
            transition={{ duration: 2.0, ease: 'easeOut' }}
            className="absolute z-30 pointer-events-none text-xl"
            style={{ left: `${drop.x}%`, top: `${drop.y}%` }}
          >
            💧
          </motion.div>
        ))}
        <div className="w-36 h-48 sm:w-48 sm:h-64">{renderPouchSvg()}</div>
      </div>

      <div className="col-span-7 flex flex-col justify-between gap-2.5 h-full min-w-0">
        <div className="flex items-center justify-between border-b border-cyan-500/30 pb-2">
          <div className="min-w-0">
            <h3 className="font-hud font-black text-sm sm:text-base text-white truncate">
              🧃 {tr(language, 'Zero-G Safe Hydration', 'تحدي الشرب الآمن في 0G')}
            </h3>
            <p className="text-[11px] font-bold text-cyan-200 leading-snug">
              {tr(language, 'Hold to sip, pause every 2s so drops stay put!', 'اضغط للشرب وتوقف كل ثانيتين للبلع!')}
            </p>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-600 cursor-pointer shrink-0"
            title={tr(language, 'Retry', 'إعادة المحاولة')}
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-cyan-400/50">
            <div className="flex items-center justify-between text-xs font-hud font-bold text-cyan-200 mb-1">
              <span>💧 {tr(language, 'Hydration', 'الارتواء')}</span>
              <span className="text-white font-black">{Math.round(hydrationLevel)}%</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden p-0.5">
              <motion.div animate={{ width: `${hydrationLevel}%` }} className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500" />
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-rose-500/50">
            <div className="flex items-center justify-between text-xs font-hud font-bold text-rose-200 mb-1">
              <span>⚠️ {tr(language, 'Waste', 'الهدر')}</span>
              <span className="text-white font-black">{Math.round(waterWaste)}%</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden p-0.5">
              <motion.div
                animate={{ width: `${waterWaste}%` }}
                className={`h-full rounded-full ${waterWaste > 50 ? 'bg-rose-600' : 'bg-amber-400'}`}
              />
            </div>
          </div>
        </div>

        {wasteWarning && (
          <div className="bg-rose-600/90 text-white font-hud font-black text-xs px-3 py-1 rounded-xl border border-white flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-yellow-300 shrink-0" />
            <span>{tr(language, 'Careful! Release to swallow!', 'حاسب! ابلع وتوقف!')}</span>
          </div>
        )}

        {!isFinished ? (
          <button
            type="button"
            onMouseDown={handlePointerDown}
            onMouseUp={handlePointerUp}
            onMouseLeave={handlePointerUp}
            onTouchStart={handlePointerDown}
            onTouchEnd={handlePointerUp}
            className={`w-full py-3 px-4 rounded-2xl font-hud font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-xl transition-all select-none cursor-pointer active:scale-95 ${
              isPressing ? 'bg-gradient-to-r from-sky-400 to-blue-600 text-white' : 'btn-chunky-adventure text-slate-950'
            }`}
          >
            <span>
              {isPressing
                ? tr(language, 'Sipping in 0G 🥤 (Pause every 2s!)', 'جاري الشرب 🥤 (ابلع كل ثانيتين!)')
                : tr(language, 'Press & Hold to Drink 🧃', 'اضغط مع الاستمرار للشرب 🧃')}
            </span>
            <Droplets className="w-5 h-5" />
          </button>
        ) : (
          <div className="w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-hud font-black text-sm flex items-center justify-center gap-2 shadow-lg">
            <CheckCircle2 className="w-5 h-5" />
            <span>{tr(language, '100% Hydrated Successfully! 🚀', 'تم الارتواء بالكامل 100%! 🚀')}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default HydrationGame;
