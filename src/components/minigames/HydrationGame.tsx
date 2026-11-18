import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { soundManager } from '../../utils/sound';
import { dialogueManager } from '../../utils/geminiTTS';
import { useGameState } from '../../context/GameContext';
import { tr } from '../../utils/i18n';
import { Droplets, AlertTriangle, CheckCircle2, RotateCcw } from 'lucide-react';

interface HydrationGameProps {
  onComplete?: () => void;
}

export const HydrationGame: React.FC<HydrationGameProps> = ({ onComplete }) => {
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

  return (
    <div
      className="relative w-full max-w-xl mx-auto p-5 sm:p-7 rounded-[2.5rem] bg-gradient-to-b from-sky-950/95 via-slate-900/95 to-slate-950/95 border-4 border-cyan-400 shadow-[0_0_50px_rgba(6,182,212,0.35)] select-none text-white flex flex-col items-center gap-5"
      dir={langDir}
    >
      {/* Title & Status */}
      <div className="w-full flex items-center justify-between border-b border-cyan-500/30 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border-2 border-cyan-300 flex items-center justify-center text-2xl shadow">
            🧃
          </div>
          <div>
            <h3 className="font-hud font-black text-lg sm:text-xl text-white">
              {tr(language, 'Zero-G Safe Hydration Challenge', 'تحدي شرب الماء الآمن في انعدام الجاذبية')}
            </h3>
            <p className="text-xs font-hud font-bold text-cyan-200">
              {tr(
                language,
                'Press and hold to sip, then pause every 2s to swallow so droplets don’t float away!',
                'اضغط مع الاستمرار للشرب، وتوقف كل ثانيتين للبلع حتى لا تتطاير القطرات!'
              )}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleReset}
          className="p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-600 transition-all cursor-pointer"
          title={tr(language, 'Retry', 'إعادة المحاولة')}
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Main Hydration Pouch Simulation Container */}
      <div className="relative w-64 h-72 flex items-center justify-center">
        {/* Animated Zero-G Escaping Droplets */}
        {escapingDrops.map((drop) => (
          <motion.div
            key={drop.id}
            initial={{ scale: 0, opacity: 1, x: 0, y: 0 }}
            animate={{
              scale: [0.5, 1.4, 0.8],
              opacity: [1, 0.9, 0],
              x: (Math.random() - 0.5) * 160,
              y: -120 - Math.random() * 60
            }}
            transition={{ duration: 2.2, ease: 'easeOut' }}
            className="absolute z-30 pointer-events-none text-2xl filter drop-shadow-[0_0_8px_rgba(56,189,248,0.9)]"
            style={{ left: `${drop.x}%`, top: `${drop.y}%` }}
          >
            💧
          </motion.div>
        ))}

        {/* 3D Zero-G Water Pouch SVG with Draining Liquid Scale */}
        <svg viewBox="0 0 180 240" className="w-full h-full filter drop-shadow-[0_12px_24px_rgba(0,0,0,0.6)]">
          <defs>
            <linearGradient id="pouchBorder" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#bae6fd" />
              <stop offset="50%" stop-color="#38bdf8" />
              <stop offset="100%" stop-color="#0284c7" />
            </linearGradient>
            <linearGradient id="waterFlow" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#7dd3fc" />
              <stop offset="50%" stop-color="#38bdf8" />
              <stop offset="100%" stop-color="#0284c7" />
            </linearGradient>
            <clipPath id="pouchInnerClip">
              <path d="M 45 45 C 50 40, 130 40, 135 45 C 145 75, 145 185, 135 210 C 130 215, 50 215, 45 210 C 35 185, 35 75, 45 45 Z" />
            </clipPath>
          </defs>

          {/* Straw Valve */}
          <rect x="84" y="8" width="12" height="36" rx="4" fill="#f8fafc" stroke="#64748b" stroke-width="2" />
          <rect x="80" y="22" width="20" height="8" rx="3" fill="#ef4444" stroke="#991b1b" stroke-width="1.5" />

          {/* Pouch Transparent Foil Body */}
          <path
            d="M 45 45 C 50 40, 130 40, 135 45 C 145 75, 145 185, 135 210 C 130 215, 50 215, 45 210 C 35 185, 35 75, 45 45 Z"
            fill="rgba(15, 23, 42, 0.75)"
            stroke="url(#pouchBorder)"
            stroke-width="5"
          />

          {/* Liquid Level with Dynamic Fill */}
          <g clip-path="url(#pouchInnerClip)">
            <motion.rect
              x="30"
              y={215 - (pouchLiquidRemaining * 1.6)}
              width="120"
              height={pouchLiquidRemaining * 1.7}
              fill="url(#waterFlow)"
              opacity="0.85"
            />
            {/* Wave crest */}
            {isPressing && (
              <motion.path
                animate={{ x: [-20, 20, -20] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                d={`M 20 ${215 - (pouchLiquidRemaining * 1.6)} Q 55 ${210 - (pouchLiquidRemaining * 1.6)} 90 ${215 - (pouchLiquidRemaining * 1.6)} T 160 ${215 - (pouchLiquidRemaining * 1.6)} L 160 220 L 20 220 Z`}
                fill="#38bdf8"
                opacity="0.9"
              />
            )}
          </g>

          {/* Glossy Specular Highlight Line */}
          <path d="M 52 60 Q 48 120 52 195" stroke="#ffffff" stroke-width="4" stroke-linecap="round" fill="none" opacity="0.45" />

          {/* NASA Mission Logo Badge */}
          <circle cx="90" cy="125" r="22" fill="#0369a1" stroke="#ffffff" stroke-width="2" opacity="0.85" />
          <text x="90" y="130" font-size="9" font-family="sans-serif" font-weight="900" fill="#ffffff" text-anchor="middle">NASA 0G</text>
        </svg>

        {/* Warning Indicator Overlay */}
        {wasteWarning && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute top-2 bg-rose-600/90 text-white font-hud font-black text-xs px-3 py-1 rounded-full border border-white flex items-center gap-1 shadow-lg"
          >
            <AlertTriangle className="w-4 h-4 text-yellow-300" />
            <span>{tr(language, 'Careful! Droplets escaped! Release to swallow!', 'حاسب! قطرات الماء طارت! ابلع وتوقف!')}</span>
          </motion.div>
        )}
      </div>

      {/* Progress Bars HUD */}
      <div className="w-full grid grid-cols-2 gap-3">
        {/* Hydration Bar */}
        <div className="p-3 rounded-2xl bg-slate-900/80 border-2 border-cyan-400/50">
          <div className="flex items-center justify-between text-xs font-hud font-bold text-cyan-200 mb-1">
            <span className="flex items-center gap-1">
              <Droplets className="w-3.5 h-3.5 text-cyan-400" /> {tr(language, 'Hydration Level', 'مستوى الارتواء')}
            </span>
            <span className="text-white font-black">{Math.round(hydrationLevel)}%</span>
          </div>
          <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden p-0.5">
            <motion.div
              animate={{ width: `${hydrationLevel}%` }}
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 shadow-[0_0_12px_rgba(56,189,248,0.8)]"
            />
          </div>
        </div>

        {/* Water Waste Bar */}
        <div className="p-3 rounded-2xl bg-slate-900/80 border-2 border-rose-500/50">
          <div className="flex items-center justify-between text-xs font-hud font-bold text-rose-200 mb-1">
            <span className="flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" /> {tr(language, 'Floating Waste', 'هدر القطرات المتطايرة')}
            </span>
            <span className="text-white font-black">{Math.round(waterWaste)}%</span>
          </div>
          <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden p-0.5">
            <motion.div
              animate={{ width: `${waterWaste}%` }}
              className={`h-full rounded-full ${
                waterWaste > 50 ? 'bg-rose-600' : 'bg-amber-400'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Chunky Action Button: Hold-to-Drink */}
      {!isFinished ? (
        <button
          type="button"
          onMouseDown={handlePointerDown}
          onMouseUp={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchEnd={handlePointerUp}
          className={`w-full py-4 px-6 rounded-2xl font-hud font-black text-lg sm:text-xl flex items-center justify-center gap-3 shadow-xl transition-all select-none cursor-pointer active:scale-95 ${
            isPressing
              ? 'bg-gradient-to-r from-sky-400 to-blue-600 text-white shadow-[0_0_30px_rgba(14,165,233,0.8)] scale-[0.98]'
              : 'btn-chunky-adventure text-slate-950'
          }`}
        >
          <span>
            {isPressing
              ? tr(language, 'Sipping in 0G 🥤 (Pause every 2s to swallow!)', 'جاري الشرب والامتصاص 🥤 (ابلع كل ثانيتين!)')
              : tr(language, 'Press & Hold to Drink 🧃', 'اضغط مع الاستمرار للشرب 🧃')}
          </span>
          <Droplets className="w-6 h-6 animate-pulse" />
        </button>
      ) : (
        <div className="w-full py-3 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-hud font-black text-base sm:text-lg flex items-center justify-center gap-2 shadow-lg animate-bounce">
          <CheckCircle2 className="w-6 h-6" />
          <span>{tr(language, '100% Hydrated Successfully! Well done Cadet! 🚀', 'تم الارتواء بالكامل بنجاح 100%! أحسنت يا بطل! 🚀')}</span>
        </div>
      )}
    </div>
  );
};

export default HydrationGame;
