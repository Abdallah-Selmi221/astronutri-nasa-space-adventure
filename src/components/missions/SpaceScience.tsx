import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameState } from '../../context/GameContext';
import { AnimatedRobo, RoboState } from '../common/AnimatedRobo';
import { dialogueManager } from '../../utils/geminiTTS';
import { soundManager } from '../../utils/sound';
import { Check, X, Lightbulb, Sparkles, ArrowLeft } from 'lucide-react';

interface PlanetOption {
  id: string;
  nameAr: string;
  sprite: string;
  isCorrect: boolean;
  wrongFeedbackAr: string;
}

const PLANET_OPTIONS: readonly PlanetOption[] = [
  {
    id: 'jupiter',
    nameAr: 'المشتري',
    sprite: '/assets/sprites/planet-jupiter.png',
    isCorrect: false,
    wrongFeedbackAr: 'حاول تاني يا بطل! المشتري هو أكبر كوكب، بس مش هو الكوكب الأحمر!'
  },
  {
    id: 'mars',
    nameAr: 'المريخ',
    sprite: '/assets/sprites/planet-mars.png',
    isCorrect: true,
    wrongFeedbackAr: ''
  },
  {
    id: 'saturn',
    nameAr: 'زحل',
    sprite: '/assets/sprites/planet-saturn.png',
    isCorrect: false,
    wrongFeedbackAr: 'قريب يا كابتن! زحل مشهور بحلقاته الجميلة، فكر في الكوكب اللي لونه أحمر!'
  },
  {
    id: 'earth',
    nameAr: 'الأرض',
    sprite: '/assets/sprites/planet-earth.png',
    isCorrect: false,
    wrongFeedbackAr: 'الأرض هي كوكبنا الأزرق الجميل! اختار الكوكب الأحمر يا بطل!'
  }
];

const INITIAL_QUESTION_SPEECH = 'ما هو الكوكب الأحمر؟ 🚀';
const CORRECT_ANSWER_SPEECH =
  'إجابة صحيحة يا بطل الفضاء! المريخ هو الكوكب الأحمر بسبب أكسيد الحديد على سطحه! 🌟';

export interface SpaceScienceProps {
  onComplete?: () => void;
}

export const SpaceScience: React.FC<SpaceScienceProps> = ({ onComplete }) => {
  const { setLocation } = useGameState();
  const [selectedPlanetId, setSelectedPlanetId] = useState<string | null>(null);
  const [isAnsweredCorrectly, setIsAnsweredCorrectly] = useState<boolean>(false);
  const [roboState, setRoboState] = useState<RoboState>('EXPLAINING');
  const [roboSpeech, setRoboSpeech] = useState<string>(INITIAL_QUESTION_SPEECH);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void dialogueManager.speak(INITIAL_QUESTION_SPEECH);
    }, 120);

    return () => {
      window.clearTimeout(timer);
      dialogueManager.stop();
    };
  }, []);

  const handleSelectOption = (option: PlanetOption) => {
    setSelectedPlanetId(option.id);

    if (option.isCorrect) {
      soundManager.playFanfare();
      setIsAnsweredCorrectly(true);
      setRoboState('CELEBRATING');
      setRoboSpeech(CORRECT_ANSWER_SPEECH);
      void dialogueManager.speak(CORRECT_ANSWER_SPEECH);
    } else {
      soundManager.playAlertSiren();
      setRoboState('WARNING');
      setRoboSpeech(option.wrongFeedbackAr);
      void dialogueManager.speak(option.wrongFeedbackAr);
    }
  };

  const handleNextMission = () => {
    dialogueManager.stop();
    soundManager.playClick();
    if (onComplete) {
      onComplete();
    } else {
      setLocation('HumanHealth');
    }
  };

  return (
    <div className="relative w-full min-h-screen flex flex-col justify-between overflow-x-hidden select-none pt-20 pb-6 px-3 sm:px-6 lg:px-8">
      {/* ===================================================================
          CLEAN SPACE OBSERVATORY BACKGROUND (NO FLATTENED SCREENSHOT)
         =================================================================== */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#0b2963_0%,_#061539_55%,_#020617_100%)]" />
        <div className="absolute inset-0 space-stars opacity-75" />

        {/* Distant Floating Saturn & Earth in Observatory Viewport */}
        <motion.img
          src="/assets/ui/saturn-3d.svg"
          alt=""
          animate={{ y: [0, -8, 0], rotate: [-2, 2, -2] }}
          transition={{ repeat: Infinity, duration: 7, ease: 'easeInOut' }}
          className="absolute top-20 left-[12%] w-24 sm:w-36 object-contain opacity-80"
        />

        {/* Futuristic Observatory Ceiling Arch & Floor */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[130%] h-40 rounded-b-[100%] border-b-4 border-cyan-300/50 bg-gradient-to-b from-sky-900/60 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-[28%] bg-gradient-to-t from-sky-950 via-slate-900/90 to-transparent border-t-2 border-cyan-400/40" />
      </div>

      {/* ===================================================================
          1. TOP RESPONSIVE TITLE BANNER ("علوم الفضاء")
         =================================================================== */}
      <div className="relative z-10 w-full max-w-4xl mx-auto flex flex-col items-center text-center mb-4">
        <div className="inline-flex items-center gap-3 px-6 sm:px-12 py-2.5 sm:py-3.5 rounded-full bg-gradient-to-r from-blue-950 via-sky-700 to-blue-950 border-4 border-cyan-300 shadow-[0_10px_30px_rgba(6,182,212,0.5)]">
          <img
            src="/assets/ui/saturn-3d.svg"
            alt="كوكب"
            className="w-10 h-10 sm:w-12 sm:h-12 object-contain"
          />
          <h1 className="font-hud font-black text-2xl sm:text-4xl text-white drop-shadow">
            علوم الفضاء
          </h1>
        </div>

        <div className="mt-2.5 px-6 sm:px-10 py-2 rounded-full bg-gradient-to-r from-slate-900/95 via-sky-950/95 to-slate-900/95 border-2 border-amber-400/80 shadow-lg">
          <p className="font-hud font-black text-sm sm:text-xl text-white">
            اكتشف الكواكب وأجب على الأسئلة 🪐
          </p>
        </div>
      </div>

      {/* ===================================================================
          2. MIDDLE 3-COLUMN RESPONSIVE STAGE (Flexbox & Grid)
             [Robo + Question Bubble] | [3D Floating Planet Display] | [Quick Facts Card]
         =================================================================== */}
      <div className="relative z-10 w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-center my-auto py-2">
        {/* COLUMN 1 (Right in RTL, 3 cols): AnimatedRobo + Question Bubble */}
        <div className="lg:col-span-3 w-full flex flex-col items-center justify-center order-2 lg:order-1">
          <AnimatedRobo
            state={roboState}
            spokenText={roboSpeech}
            autoSpeak={false}
            size="lg"
            showSpeechBubble={true}
          />
        </div>

        {/* COLUMN 2 (Center, 6 cols): Separate 3D-Styled Floating Planet in Sci-Fi Frame */}
        <div className="lg:col-span-6 w-full flex flex-col items-center justify-center order-1 lg:order-2">
          <div className="relative w-full max-w-xl rounded-[2.5rem] p-4 sm:p-6 bg-gradient-to-b from-slate-950/90 via-indigo-950/90 to-slate-950/95 border-4 border-cyan-300 shadow-[0_0_50px_rgba(34,211,238,0.5)] flex flex-col items-center justify-center overflow-hidden min-h-[260px] sm:min-h-[320px]">
            {/* Starfield inside Hologram Frame */}
            <div className="absolute inset-0 space-stars opacity-85 pointer-events-none" />

            {/* Neon Corner Brackets */}
            <div className="absolute top-3 left-3 w-8 h-8 border-t-4 border-l-4 border-cyan-300 rounded-tl-xl pointer-events-none" />
            <div className="absolute top-3 right-3 w-8 h-8 border-t-4 border-r-4 border-cyan-300 rounded-tr-xl pointer-events-none" />
            <div className="absolute bottom-3 left-3 w-8 h-8 border-b-4 border-l-4 border-cyan-300 rounded-bl-xl pointer-events-none" />
            <div className="absolute bottom-3 right-3 w-8 h-8 border-b-4 border-r-4 border-cyan-300 rounded-br-xl pointer-events-none" />

            {/* Floating 3D Red Planet Component */}
            <motion.div
              animate={{
                y: [0, -12, 0],
                rotate: [0, 3, -3, 0],
                scale: isAnsweredCorrectly ? [1, 1.08, 1] : 1
              }}
              transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut' }}
              className="relative z-10 w-48 h-48 sm:w-64 sm:h-64 rounded-full flex items-center justify-center"
            >
              <div className="absolute inset-0 rounded-full bg-orange-500/30 blur-2xl pointer-events-none" />
              <img
                src="/assets/sprites/mars-hero.png"
                alt="الكوكب الأحمر - المريخ"
                draggable={false}
                className="w-full h-full object-contain rounded-full shadow-[0_0_45px_rgba(234,88,12,0.75)] border-2 border-orange-300/40"
              />
            </motion.div>
          </div>
        </div>

        {/* COLUMN 3 (Left in RTL, 3 cols): "معلومات سريعة" (Quick Facts) Panel */}
        <div className="lg:col-span-3 w-full flex justify-center order-3">
          <div className="w-full max-w-sm rounded-[2rem] bg-gradient-to-b from-amber-100 via-orange-50 to-amber-100 border-4 border-amber-400 shadow-[0_12px_35px_rgba(245,158,11,0.35)] p-4 sm:p-5 text-slate-900 relative">
            <div className="flex items-center justify-between bg-gradient-to-r from-blue-950 via-sky-800 to-blue-950 text-white font-hud font-black text-base sm:text-lg px-4 py-2 rounded-2xl border-2 border-cyan-300 mb-3 shadow">
              <span>معلومات سريعة</span>
              <Lightbulb className="w-6 h-6 text-yellow-300 fill-yellow-300 animate-pulse" />
            </div>

            <p className="font-hud font-black text-sm sm:text-lg text-slate-900 leading-relaxed text-center py-2">
              المريخ يُعرف بالكوكب الأحمر بسبب لونه المميز الغني بأكسيد الحديد! 🔴
            </p>

            <div className="mt-3 rounded-2xl overflow-hidden border-2 border-amber-300 bg-gradient-to-r from-orange-800 via-amber-700 to-red-900 p-3 text-center text-amber-100 font-hud font-bold text-xs sm:text-sm">
              🏔️ يضم كوكب المريخ جبل أوليمبوس، وهو أكبر بركان في المجموعة الشمسية!
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================================
          3. BOTTOM 4 RESPONSIVE ANSWER BUTTONS (Grid Layout)
         =================================================================== */}
      <div className="relative z-20 w-full max-w-5xl mx-auto mt-4">
        <div className="bg-sky-950/85 backdrop-blur-md border-4 border-cyan-400/70 rounded-[2.2rem] p-3.5 sm:p-5 shadow-2xl">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 sm:gap-5">
            {PLANET_OPTIONS.map((option) => {
              const isSelected = selectedPlanetId === option.id;
              const showCorrectStyle = isSelected && option.isCorrect;
              const showWrongStyle = isSelected && !option.isCorrect;

              return (
                <motion.button
                  key={option.id}
                  type="button"
                  whileHover={{ scale: 1.05, y: -5 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => handleSelectOption(option)}
                  className={`relative rounded-3xl p-3 sm:p-4 flex flex-col items-center justify-between border-4 transition-all cursor-pointer ${
                    showCorrectStyle
                      ? 'bg-gradient-to-b from-lime-200 via-emerald-300 to-green-500 border-emerald-300 shadow-[0_0_35px_rgba(16,185,129,0.8)]'
                      : showWrongStyle
                      ? 'bg-gradient-to-b from-rose-100 to-rose-300 border-rose-500 shadow-[0_0_25px_rgba(244,63,94,0.7)]'
                      : 'bg-gradient-to-b from-white via-sky-50 to-sky-100 border-sky-300 hover:border-cyan-300 shadow-lg'
                  }`}
                >
                  {/* Top-Right Status Badge when Selected */}
                  {isSelected && (
                    <div
                      className={`absolute -top-3 -right-3 w-9 h-9 sm:w-10 sm:h-10 rounded-full border-3 border-white flex items-center justify-center shadow-lg ${
                        option.isCorrect ? 'bg-emerald-500 text-white' : 'bg-rose-600 text-white'
                      }`}
                    >
                      {option.isCorrect ? (
                        <Check className="w-6 h-6 stroke-[3.5]" />
                      ) : (
                        <X className="w-6 h-6 stroke-[3.5]" />
                      )}
                    </div>
                  )}

                  {/* Planet 3D Sprite */}
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white/90 flex items-center justify-center p-1.5 shadow-inner">
                    <img
                      src={option.sprite}
                      alt={option.nameAr}
                      draggable={false}
                      className="w-full h-full object-contain pointer-events-none"
                    />
                  </div>

                  {/* Planet Arabic Label */}
                  <span className="font-hud font-black text-base sm:text-xl text-slate-950 mt-2">
                    {option.nameAr}
                  </span>
                </motion.button>
              );
            })}
          </div>

          {/* Proceed Button after Correct Answer */}
          <AnimatePresence>
            {isAnsweredCorrectly && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-4 flex justify-center"
              >
                <button
                  type="button"
                  onClick={handleNextMission}
                  className="px-8 py-3.5 rounded-full bg-gradient-to-r from-emerald-400 via-green-500 to-teal-600 hover:brightness-110 text-white font-hud font-black text-lg sm:text-xl border-4 border-white shadow-[0_0_30px_rgba(16,185,129,0.7)] flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-6 h-6" />
                  <span>المهمة التالية: الصحة وجسم الإنسان</span>
                  <ArrowLeft className="w-6 h-6" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
