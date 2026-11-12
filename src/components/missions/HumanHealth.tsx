import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameState } from '../../context/GameContext';
import { AnimatedRobo, RoboState } from '../common/AnimatedRobo';
import { dialogueManager } from '../../utils/geminiTTS';
import { soundManager } from '../../utils/sound';
import {
  Check,
  X,
  Heart,
  Star,
  Droplets,
  Moon,
  Dumbbell,
  Apple,
  ArrowLeft,
  Sparkles
} from 'lucide-react';

interface HealthOption {
  id: string;
  labelAr: string;
  icon: string;
  isCorrect: boolean;
  feedbackAr: string;
}

const HEART_HEALTH_OPTIONS: readonly HealthOption[] = [
  {
    id: 'exercise',
    labelAr: 'ممارسة الرياضة',
    icon: '🏃‍♂️',
    isCorrect: true,
    feedbackAr: 'أحسنت! الرياضة مهمة لصحة جسمك وتجعل قلب رائد الفضاء قوياً! 💪❤️'
  },
  {
    id: 'sleep_early',
    labelAr: 'النوم مبكراً',
    icon: '🛏️',
    isCorrect: false,
    feedbackAr: 'النوم الجيد مفيد جداً للراحة، لكن لتنشيط وتقوية عضلة القلب نحتاج إلى الحركة وممارسة الرياضة!'
  },
  {
    id: 'fast_food',
    labelAr: 'الأكل السريع',
    icon: '🍔',
    isCorrect: false,
    feedbackAr: 'حاسب يا بطل! الأكل السريع مليان دهون بتتعب القلب وممنوع لرواد الفضاء!'
  },
  {
    id: 'soda_drinks',
    labelAr: 'شرب المشروبات الغازية',
    icon: '🥤',
    isCorrect: false,
    feedbackAr: 'لا لا لا! المشروبات الغازية مليانة سكريات وبتضر صحة القلب والعظام في الفضاء!'
  }
];

interface HologramHabitCard {
  id: string;
  titleAr: string;
  subtitleAr: string;
  speechAr: string;
  icon: React.ReactNode;
}

const HOLOGRAM_HABITS: readonly HologramHabitCard[] = [
  {
    id: 'water',
    titleAr: 'الماء',
    subtitleAr: 'مهم للحياة',
    speechAr: 'شرب الماء باستمرار يحمي جسم رائد الفضاء من الجفاف ويحافظ على نشاطه! 💧',
    icon: <Droplets className="w-7 h-7 text-cyan-300 fill-cyan-400/50" />
  },
  {
    id: 'sports',
    titleAr: 'الرياضة',
    subtitleAr: 'تمنحك الطاقة',
    speechAr: 'رواد الفضاء يتمرنون ساعتين يومياً للحفاظ على قوة القلب والعضلات! 👟',
    icon: <Dumbbell className="w-7 h-7 text-rose-400" />
  },
  {
    id: 'sleep',
    titleAr: 'النوم الجيد',
    subtitleAr: 'يجعل جسمك قوياً',
    speechAr: 'النوم الكافي يساعد الدماغ والجسم على التركيز في مهمات الفضاء! 🛌',
    icon: <Moon className="w-7 h-7 text-amber-300 fill-amber-300/60" />
  },
  {
    id: 'healthy_food',
    titleAr: 'الأكل الصحي',
    subtitleAr: 'يحميك من المرض',
    speechAr: 'الفواكه والخضروات تمنح جسمك الفيتامينات والمناعة القوية! 🍎',
    icon: <Apple className="w-7 h-7 text-emerald-400 fill-emerald-400/60" />
  }
];

const GOLDEN_TIPS: readonly string[] = [
  'اشرب الماء',
  'مارس الرياضة',
  'تناول طعام صحي',
  'احصل على نوم كافٍ'
];

const INITIAL_HEALTH_SPEECH =
  'مرحباً بك في قسم الصحة وجسم الإنسان! ما هي أفضل عادة للحفاظ على صحة القلب؟ ❤️';

export interface HumanHealthProps {
  onComplete?: () => void;
}

export const HumanHealth: React.FC<HumanHealthProps> = ({ onComplete }) => {
  const { setLocation } = useGameState();
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [roboState, setRoboState] = useState<RoboState>('EXPLAINING');
  const [roboSpeech, setRoboSpeech] = useState<string>(INITIAL_HEALTH_SPEECH);
  const [activeHabitId, setActiveHabitId] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void dialogueManager.speak(INITIAL_HEALTH_SPEECH);
    }, 120);

    return () => {
      window.clearTimeout(timer);
      dialogueManager.stop();
    };
  }, []);

  const handleSelectOption = (option: HealthOption) => {
    setSelectedOptionId(option.id);
    setRoboSpeech(option.feedbackAr);

    if (option.isCorrect) {
      soundManager.playFanfare();
      setIsCompleted(true);
      setRoboState('CELEBRATING');
      void dialogueManager.speak(option.feedbackAr);
    } else {
      soundManager.playAlertSiren();
      setRoboState('WARNING');
      void dialogueManager.speak(option.feedbackAr);
    }
  };

  const handleInspectHabit = (habit: HologramHabitCard) => {
    soundManager.playClick();
    setActiveHabitId(habit.id);
    setRoboState('HAPPY');
    setRoboSpeech(habit.speechAr);
    void dialogueManager.speak(habit.speechAr);
  };

  const handleProceed = () => {
    dialogueManager.stop();
    soundManager.playClick();
    if (onComplete) {
      onComplete();
    } else {
      setLocation('Map');
    }
  };

  const healthBarPercent = isCompleted ? 100 : selectedOptionId ? 75 : 85;

  return (
    <div className="relative w-full min-h-screen flex flex-col justify-between overflow-x-hidden select-none pt-20 pb-6 px-3 sm:px-6 lg:px-8">
      {/* ===================================================================
          CLEAN BIO-MEDICAL SPACE LAB BACKGROUND (NO FLATTENED SCREENSHOT)
         =================================================================== */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#0c2d6b_0%,_#071942_55%,_#03091e_100%)]" />
        <div className="absolute inset-0 space-stars opacity-65" />

        {/* Glowing Cyan Bio-Lab Arch & Floor */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[130%] h-40 rounded-b-[100%] border-b-4 border-cyan-300/50 bg-gradient-to-b from-sky-900/60 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-[30%] bg-gradient-to-t from-sky-950 via-slate-900/90 to-transparent border-t-2 border-cyan-400/40" />
      </div>

      {/* ===================================================================
          1. TOP RESPONSIVE TITLE BANNER ("الصحة وجسم الإنسان")
         =================================================================== */}
      <div className="relative z-10 w-full max-w-4xl mx-auto flex flex-col items-center text-center mb-3">
        <div className="inline-flex items-center gap-3 px-6 sm:px-12 py-2.5 sm:py-3.5 rounded-full bg-gradient-to-r from-blue-950 via-sky-700 to-blue-950 border-4 border-cyan-300 shadow-[0_10px_30px_rgba(6,182,212,0.5)]">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-rose-500/20 border-2 border-rose-400 flex items-center justify-center">
            <Heart className="w-6 h-6 sm:w-7 sm:h-7 text-rose-500 fill-rose-500 animate-pulse" />
          </div>
          <h1 className="font-hud font-black text-2xl sm:text-4xl text-white drop-shadow">
            الصحة وجسم الإنسان
          </h1>
        </div>

        <div className="mt-2 px-6 sm:px-10 py-1.5 rounded-full bg-gradient-to-r from-slate-900/95 via-sky-950/95 to-slate-900/95 border-2 border-amber-400/80 shadow-lg">
          <p className="font-hud font-black text-sm sm:text-xl text-white">
            حافظ على صحتك لتكون رائد فضاء قوياً 💪
          </p>
        </div>
      </div>

      {/* ===================================================================
          2. MIDDLE 3-COLUMN RESPONSIVE STAGE (Flexbox & Grid)
             [Robo + Health Meter] | [Interactive Human Body Hologram + 4 Pillars] | [Golden Tips]
         =================================================================== */}
      <div className="relative z-10 w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-5 items-center my-auto py-2">
        {/* COLUMN 1 (Right in RTL, 3 cols): AnimatedRobo + "صحة ممتازة" Meter */}
        <div className="lg:col-span-3 w-full flex flex-col items-center justify-center gap-3 order-2 lg:order-1">
          <AnimatedRobo
            state={roboState}
            spokenText={roboSpeech}
            autoSpeak={false}
            size="md"
            showSpeechBubble={true}
          />

          {/* "صحة ممتازة" Status Card */}
          <div className="w-full max-w-xs rounded-3xl bg-sky-950/90 border-3 border-cyan-300 p-3.5 shadow-[0_0_25px_rgba(34,211,238,0.4)]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Heart className="w-6 h-6 text-rose-500 fill-rose-500 animate-pulse" />
                <span className="font-hud font-black text-base sm:text-lg text-white">
                  صحة ممتازة
                </span>
              </div>
              <span className="font-hud font-black text-sm text-emerald-300">
                {healthBarPercent}%
              </span>
            </div>
            <div className="w-full h-3.5 bg-slate-900 rounded-full overflow-hidden border border-cyan-400/50">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${healthBarPercent}%` }}
                className="h-full bg-gradient-to-r from-emerald-400 to-green-500 rounded-full"
              />
            </div>
          </div>
        </div>

        {/* COLUMN 2 (Center, 6 cols): Separate Interactive Human Body Hologram + 4 Pillar Cards */}
        <div className="lg:col-span-6 w-full flex flex-col items-center justify-center order-1 lg:order-2">
          <div className="w-full grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
            {/* Right Pair of Hologram Cards */}
            <div className="sm:col-span-4 flex flex-row sm:flex-col gap-3 justify-center">
              {HOLOGRAM_HABITS.slice(0, 2).map((habit) => (
                <motion.button
                  key={habit.id}
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleInspectHabit(habit)}
                  className={`flex-1 rounded-2xl p-3 bg-sky-950/80 border-2 text-center flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                    activeHabitId === habit.id
                      ? 'border-yellow-300 shadow-[0_0_25px_rgba(250,204,21,0.6)]'
                      : 'border-cyan-400/70 hover:border-cyan-200 shadow-lg'
                  }`}
                >
                  {habit.icon}
                  <span className="font-hud font-black text-sm sm:text-base text-white">
                    {habit.titleAr}
                  </span>
                  <span className="font-hud font-bold text-xs text-cyan-200">
                    {habit.subtitleAr}
                  </span>
                </motion.button>
              ))}
            </div>

            {/* Central Interactive 3D Human Body Hologram */}
            <div className="sm:col-span-4 flex flex-col items-center justify-center">
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ repeat: Infinity, duration: 3.5, ease: 'easeInOut' }}
                onClick={() =>
                  void dialogueManager.speak(
                    'هذا هو الهولوجرام الطبي لجسم رائد الفضاء! القلب يضخ الدم، والرئتان تتنفسان الأكسجين!'
                  )
                }
                className="cursor-pointer relative w-40 sm:w-48 h-64 sm:h-72 rounded-3xl overflow-hidden border-3 border-cyan-300/80 bg-sky-950/70 shadow-[0_0_40px_rgba(34,211,238,0.65)] flex items-center justify-center p-1"
                title="اضغط لفحص جسم رائد الفضاء"
              >
                <img
                  src="/assets/sprites/body-hologram.png"
                  alt="هولوجرام جسم الإنسان"
                  draggable={false}
                  className="w-full h-full object-contain rounded-2xl pointer-events-none"
                />
              </motion.div>
            </div>

            {/* Left Pair of Hologram Cards */}
            <div className="sm:col-span-4 flex flex-row sm:flex-col gap-3 justify-center">
              {HOLOGRAM_HABITS.slice(2, 4).map((habit) => (
                <motion.button
                  key={habit.id}
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleInspectHabit(habit)}
                  className={`flex-1 rounded-2xl p-3 bg-sky-950/80 border-2 text-center flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                    activeHabitId === habit.id
                      ? 'border-yellow-300 shadow-[0_0_25px_rgba(250,204,21,0.6)]'
                      : 'border-cyan-400/70 hover:border-cyan-200 shadow-lg'
                  }`}
                >
                  {habit.icon}
                  <span className="font-hud font-black text-sm sm:text-base text-white">
                    {habit.titleAr}
                  </span>
                  <span className="font-hud font-bold text-xs text-cyan-200">
                    {habit.subtitleAr}
                  </span>
                </motion.button>
              ))}
            </div>
          </div>
        </div>

        {/* COLUMN 3 (Left in RTL, 3 cols): "نصائح ذهبية" Checklist Panel */}
        <div className="lg:col-span-3 w-full flex justify-center order-3">
          <div className="w-full max-w-xs rounded-[2rem] bg-gradient-to-b from-white/95 via-sky-50/95 to-cyan-100/95 border-4 border-sky-400 shadow-[0_12px_35px_rgba(14,165,233,0.4)] p-4 sm:p-5 text-slate-900 relative">
            <div className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-950 via-sky-800 to-blue-950 text-white font-hud font-black text-lg py-2 px-4 rounded-2xl border-2 border-cyan-300 mb-3.5 shadow">
              <Star className="w-5 h-5 text-yellow-300 fill-yellow-400" />
              <span>نصائح ذهبية</span>
            </div>

            <div className="space-y-2.5">
              {GOLDEN_TIPS.map((tip) => (
                <div
                  key={tip}
                  className="flex items-center justify-between gap-2 p-2.5 rounded-2xl bg-white border border-sky-200 shadow-sm"
                >
                  <span className="font-hud font-black text-sm sm:text-base text-slate-900">
                    {tip}
                  </span>
                  <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                    <Check className="w-4 h-4 stroke-[3.5]" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================================
          3. BOTTOM RESPONSIVE HEART HEALTH QUESTION CONSOLE
             "ما هو أفضل عادة للحفاظ على صحة القلب؟"
         =================================================================== */}
      <div className="relative z-20 w-full max-w-4xl mx-auto mt-3">
        <div className="bg-gradient-to-b from-blue-950/95 via-sky-950/95 to-slate-950/95 backdrop-blur-md border-4 border-cyan-400 rounded-[2.2rem] p-4 sm:p-5 shadow-2xl">
          <h2 className="font-hud font-black text-lg sm:text-2xl text-white text-center mb-3.5 drop-shadow">
            ما هو أفضل عادة للحفاظ على صحة القلب؟ ❤️
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {HEART_HEALTH_OPTIONS.map((option) => {
              const isSelected = selectedOptionId === option.id;
              const isCorrectSelected = isSelected && option.isCorrect;
              const isWrongSelected = isSelected && !option.isCorrect;

              return (
                <motion.button
                  key={option.id}
                  type="button"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleSelectOption(option)}
                  className={`relative py-3.5 px-5 rounded-full border-4 font-hud font-black text-base sm:text-xl flex items-center justify-between gap-3 transition-all cursor-pointer ${
                    isCorrectSelected
                      ? 'bg-gradient-to-r from-lime-300 via-emerald-400 to-green-500 border-white text-slate-950 shadow-[0_0_30px_rgba(16,185,129,0.85)]'
                      : isWrongSelected
                      ? 'bg-gradient-to-r from-rose-200 to-rose-400 border-rose-500 text-slate-950 shadow-[0_0_25px_rgba(244,63,94,0.7)]'
                      : 'bg-gradient-to-b from-white via-sky-50 to-sky-100 border-sky-300 hover:border-cyan-300 text-slate-900 shadow-md'
                  }`}
                >
                  <span className="text-2xl">{option.icon}</span>
                  <span className="flex-1 text-center">{option.labelAr}</span>

                  {isSelected && (
                    <div
                      className={`w-8 h-8 rounded-full border-2 border-white flex items-center justify-center shrink-0 ${
                        option.isCorrect ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                      }`}
                    >
                      {option.isCorrect ? (
                        <Check className="w-5 h-5 stroke-[3.5]" />
                      ) : (
                        <X className="w-5 h-5 stroke-[3.5]" />
                      )}
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Proceed Button after Correct Answer */}
          <AnimatePresence>
            {isCompleted && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-4 flex justify-center"
              >
                <button
                  type="button"
                  onClick={handleProceed}
                  className="px-8 py-3 rounded-full bg-gradient-to-r from-emerald-400 via-green-500 to-teal-600 hover:brightness-110 text-white font-hud font-black text-base sm:text-lg border-4 border-white shadow-[0_0_30px_rgba(16,185,129,0.7)] flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-5 h-5" />
                  <span>العودة لخريطة الأكاديمية واستكمال المهام</span>
                  <ArrowLeft className="w-5 h-5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
