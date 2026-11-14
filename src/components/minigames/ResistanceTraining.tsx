import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { soundManager } from '../../utils/sound';
import { dialogueManager } from '../../utils/geminiTTS';
import { Dumbbell, CheckCircle2, RotateCcw } from 'lucide-react';

interface ResistanceTrainingProps {
  onComplete?: () => void;
  targetReps?: number;
}

export const ResistanceTraining: React.FC<ResistanceTrainingProps> = ({
  onComplete,
  targetReps = 12
}) => {
  const [repCount, setRepCount] = useState<number>(0);
  const [sliderPosition, setSliderPosition] = useState<number>(10); // 0 to 100%
  const [direction, setDirection] = useState<'right' | 'left'>('right');
  const [feedbackState, setFeedbackState] = useState<'idle' | 'perfect' | 'miss'>('idle');
  const [feedbackText, setFeedbackText] = useState<string>('');
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const speedRef = useRef<number>(65); // slider speed (% per second)

  // Oscillating indicator loop (0 to 100)
  const animateSlider = useCallback(() => {
    if (isCompleted) return;

    const now = performance.now();
    const dt = (now - lastTimeRef.current) / 1000;
    lastTimeRef.current = now;

    setSliderPosition((prev) => {
      let next = direction === 'right' ? prev + speedRef.current * dt : prev - speedRef.current * dt;
      if (next >= 100) {
        next = 100;
        setDirection('left');
      } else if (next <= 0) {
        next = 0;
        setDirection('right');
      }
      return next;
    });

    animationFrameRef.current = requestAnimationFrame(animateSlider);
  }, [direction, isCompleted]);

  useEffect(() => {
    lastTimeRef.current = performance.now();
    animationFrameRef.current = requestAnimationFrame(animateSlider);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [animateSlider]);

  // Handle pull/press repetition attempt
  const handlePerformRep = useCallback(() => {
    if (isCompleted) return;

    // Green Target Zone: 38% to 62%
    const isTargetZone = sliderPosition >= 38 && sliderPosition <= 62;

    if (isTargetZone) {
      soundManager.playDropSuccess();
      setFeedbackState('perfect');
      setFeedbackText('عضلات قوية! تكرار ممتاز! 💪');

      setRepCount((prev) => {
        const next = prev + 1;
        if (next >= targetReps) {
          setIsCompleted(true);
          soundManager.playFanfare();
          void dialogueManager.speak('عاش يا بطل! أتممت 12 تكراراً وحميت عظامك وعضلاتك من انعدام الجاذبية! 🏆');
          if (onComplete) onComplete();
        }
        return next;
      });
    } else {
      soundManager.playBoing();
      setFeedbackState('miss');
      setFeedbackText('اضغط لما المؤشر يوصل للمنطقة الخضراء في النص! 🎯');
    }

    // Reset feedback after 1.2s
    const timer = setTimeout(() => setFeedbackState('idle'), 1200);
    return () => clearTimeout(timer);
  }, [sliderPosition, isCompleted, targetReps, onComplete]);

  // Keyboard spacebar listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        handlePerformRep();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePerformRep]);

  const handleReset = () => {
    soundManager.playClick();
    setRepCount(0);
    setIsCompleted(false);
    setFeedbackState('idle');
  };

  return (
    <div
      className="relative w-full max-w-xl mx-auto p-5 sm:p-7 rounded-[2.5rem] bg-gradient-to-b from-indigo-950/95 via-slate-900/95 to-slate-950/95 border-4 border-violet-400 shadow-[0_0_50px_rgba(167,139,250,0.35)] select-none text-white flex flex-col items-center gap-5"
      dir="rtl"
    >
      {/* Header */}
      <div className="w-full flex items-center justify-between border-b border-violet-500/30 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-violet-500/20 border-2 border-violet-300 flex items-center justify-center text-2xl shadow">
            🏋️‍♂️
          </div>
          <div>
            <h3 className="font-hud font-black text-lg sm:text-xl text-white">
              جهاز المقاومة المتقدم لرواد الفضاء (ARED)
            </h3>
            <p className="text-xs font-hud font-bold text-violet-200">
              اضغط زر المسطرة [SPACE] أو الزر الكبير عندما يكون المؤشر داخل المنطقة الخضراء!
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleReset}
          className="p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-violet-300 border border-slate-600 transition-all cursor-pointer"
          title="إعادة المحاولة"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Muscle Flexing Animated Mascot Badge */}
      <div className="relative w-36 h-36 rounded-full bg-gradient-to-tr from-violet-600/30 to-purple-400/20 border-4 border-violet-400 flex items-center justify-center shadow-inner overflow-hidden">
        <motion.div
          animate={
            feedbackState === 'perfect'
              ? { scale: [1, 1.3, 1], rotate: [0, -10, 10, 0] }
              : { y: [0, -4, 0] }
          }
          transition={{ duration: 0.4 }}
          className="text-6xl filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)]"
        >
          {isCompleted ? '🏆' : feedbackState === 'perfect' ? '💪' : '🤖'}
        </motion.div>

        {/* Orbiting star particles */}
        <div className="absolute inset-0 border-2 border-dashed border-violet-300/40 rounded-full animate-spin pointer-events-none" style={{ animationDuration: '14s' }} />
      </div>

      {/* Rep Counter Banner */}
      <div className="flex items-center gap-4 bg-slate-900/90 border-2 border-violet-400/60 rounded-2xl px-6 py-2 shadow-inner">
        <div className="flex items-center gap-2">
          <Dumbbell className="w-5 h-5 text-violet-400" />
          <span className="font-hud font-black text-sm text-slate-300">التكرارات المنجزة:</span>
        </div>
        <span className="font-hud font-black text-2xl text-yellow-300">
          {repCount} / {targetReps}
        </span>
      </div>

      {/* Oscillating Slider Target Zone Track */}
      <div className="w-full flex flex-col gap-1.5">
        <div className="relative w-full h-14 rounded-2xl bg-slate-950 border-3 border-slate-700 overflow-hidden shadow-inner flex items-center">
          {/* Red/Yellow Danger Zones */}
          <div className="absolute left-0 w-[38%] h-full bg-rose-950/40 border-r border-rose-500/40" />
          <div className="absolute right-0 w-[38%] h-full bg-rose-950/40 border-l border-rose-500/40" />

          {/* Green Target Zone (38% to 62%) */}
          <div className="absolute left-[38%] w-[24%] h-full bg-emerald-500/35 border-x-2 border-emerald-400 flex items-center justify-center">
            <span className="font-hud font-black text-[11px] text-emerald-300 animate-pulse">
              🎯 اسحب هنا!
            </span>
          </div>

          {/* Oscillating Indicator Cursor */}
          <div
            className="absolute top-1 bottom-1 w-5 rounded-full bg-gradient-to-b from-yellow-300 via-amber-400 to-orange-500 border-2 border-white shadow-[0_0_15px_rgba(250,204,21,1)] transition-transform z-20 pointer-events-none"
            style={{
              left: `calc(${sliderPosition}% - 10px)`
            }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] font-hud font-bold text-slate-400 px-2">
          <span>منطقة غير دقيقة ⚠️</span>
          <span className="text-emerald-400 font-black">المنطقة الخضراء المستهدفة (38%–62%)</span>
          <span>منطقة غير دقيقة ⚠️</span>
        </div>
      </div>

      {/* Feedback Toast */}
      <div className="min-h-[28px] flex items-center justify-center">
        {feedbackState !== 'idle' && (
          <motion.span
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className={`text-sm font-hud font-black px-4 py-1 rounded-full border shadow-md ${
              feedbackState === 'perfect'
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                : 'bg-rose-500/20 border-rose-400 text-rose-300'
            }`}
          >
            {feedbackText}
          </motion.span>
        )}
      </div>

      {/* Main Chunky Exercise Button */}
      {!isCompleted ? (
        <button
          type="button"
          onClick={handlePerformRep}
          className="w-full py-4 px-6 rounded-2xl btn-chunky-adventure text-slate-950 font-hud font-black text-xl flex items-center justify-center gap-3 shadow-xl cursor-pointer active:scale-95"
        >
          <span>تمرين المقاومة الآن</span>
          <Dumbbell className="w-6 h-6" />
          <span className="text-xs bg-slate-900/30 px-2 py-0.5 rounded-lg border border-black/20">
            أو اضغط مسطرة [SPACE]
          </span>
        </button>
      ) : (
        <div className="w-full py-3 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-hud font-black text-lg flex items-center justify-center gap-2 shadow-lg animate-bounce">
          <CheckCircle2 className="w-6 h-6" />
          <span>تم إنجاز 12 تكراراً بنجاح! عضلاتك وعظامك في أمان تام! 🚀</span>
        </div>
      )}
    </div>
  );
};

export default ResistanceTraining;
