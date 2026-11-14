import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameState } from '../../context/GameContext';
import { FoodItem } from '../../types/game';
import { FOOD_DATABASE, NASA_OFFICIAL_REFERENCES } from '../../data/foodItems';
import { NUTRITION_QUIZ_QUESTIONS } from '../../data/questionBanks';
import { MissionSuccessModal } from './MissionSuccessModal';
import { InteractiveQuizDeck } from '../common/InteractiveQuizDeck';
import { PhaserNutritionCanvas } from '../../game/PhaserNutritionCanvas';
import {
  EventBus,
  NutritionBannedPayload,
  NutritionCargoDuplicatePayload,
  NutritionCargoFullPayload,
  NutritionInspectPayload,
  NutritionPackedPayload
} from '../../game/EventBus';
import {
  dialogueManager,
  DialogueStatus,
  getRandomSuccessPhrase,
  getRandomWarningPhrase
} from '../../utils/geminiTTS';
import { soundManager } from '../../utils/sound';
import {
  Check,
  RotateCcw,
  Zap,
  Apple,
  BookOpen,
  Volume2,
  Star,
  AlertTriangle,
  Dumbbell,
  Brain
} from 'lucide-react';

const DEFAULT_ROBO_TEXT =
  'أهلاً بك في مختبر التغذية الفضائي! اسحب أو اضغط على 4 وجبات فضائية آمنة (مثل العسل السيناوي، عبوة الفضاء، كيس العصير، التفاح، البروكلي، والحليب) داخل الصندوق وتجنب الأطعمة المتفتتة أو الغازية! 🎯';

export const NutritionLab: React.FC = () => {
  const {
    state,
    setLocation,
    addFoodItem,
    removeFoodItem,
    clearCargo,
    completeNutritionMission,
    canCompleteMission
  } = useGameState();

  const [roboSpeech, setRoboSpeech] = useState<string>(DEFAULT_ROBO_TEXT);
  const [inspectedItem, setInspectedItem] = useState<FoodItem>(FOOD_DATABASE[0]);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [showNasaSourcesModal, setShowNasaSourcesModal] = useState<boolean>(false);
  const [showNutritionQuizModal, setShowNutritionQuizModal] = useState<boolean>(false);
  const [cargoWarningToast, setCargoWarningToast] = useState<string | null>(null);
  const [dialogueStatus, setDialogueStatus] = useState<DialogueStatus>(
    dialogueManager.getStatusSnapshot()
  );

  // Strict capacity of 4 accepted items & Star Rating (0 to 3 Stars)
  const packedCount = state.cargoItems.reduce((sum, e) => sum + e.quantity, 0);
  const uniqueCategories = new Set(state.cargoItems.map((e) => e.item.category)).size;
  const starCount =
    packedCount >= 4 && uniqueCategories >= 2
      ? 3
      : packedCount >= 2
      ? 2
      : packedCount >= 1
      ? 1
      : 0;

  // Dynamic nutrition metrics for the "التوازن الغذائي" HUD (strictly derived from real packed cargo)
  const vitaminCategoryCount = state.cargoItems.filter(
    (e) =>
      e.item.id.includes('apple') ||
      e.item.id.includes('broccoli') ||
      e.item.id.includes('strawberr') ||
      e.item.category === 'carbs' ||
      e.item.category === 'special'
  ).length;
  const vitaminsPercent = packedCount === 0 ? 0 : Math.min(100, vitaminCategoryCount * 35);
  const proteinPercent =
    packedCount === 0 ? 0 : Math.min(100, Math.round((state.nutritionScore.totalProtein / 75) * 100));
  const energyPercent =
    packedCount === 0 ? 0 : Math.min(100, Math.round((state.nutritionScore.totalCarbs / 85) * 100));

  // Subscribe to DialogueManager status for live voice telemetry
  useEffect(() => {
    const unsub = dialogueManager.subscribeStatus((status) => {
      setDialogueStatus(status);
    });
    return () => {
      unsub();
      dialogueManager.stop();
    };
  }, []);

  // Sync React Cargo state -> Phaser Scene whenever cargoItems change
  useEffect(() => {
    EventBus.emit('nutrition:sync-cargo', {
      cargoItems: state.cargoItems,
      stars: starCount
    });
  }, [state.cargoItems, starCount]);

  // Handle Phaser -> React Events
  const handleFoodPacked = useCallback(
    ({ item }: NutritionPackedPayload) => {
      setCargoWarningToast(null);
      addFoodItem(item);
      setInspectedItem(item);

      const praise = getRandomSuccessPhrase();
      const fullSpeech = `${praise} ${item.funFactAr || ''}`;
      setRoboSpeech(fullSpeech);
      void dialogueManager.speak(fullSpeech);
    },
    [addFoodItem]
  );

  const handleFoodBanned = useCallback(({ item }: NutritionBannedPayload) => {
    soundManager.playAlertSiren();
    setInspectedItem(item);

    const warn = item.bannedReasonAr || getRandomWarningPhrase();
    setRoboSpeech(warn);
    void dialogueManager.speak(warn);
  }, []);

  const handleCargoFull = useCallback(({ item }: NutritionCargoFullPayload) => {
    soundManager.playAlertSiren();
    setInspectedItem(item);

    const fullMsg =
      'الصندوق ممتلئ! (4/4 وجبات معبأة) — لا يمكن إضافة وجبة إضافية. اضغط على «موافق (4/4)» لإتمام المهمة! 📦';
    setCargoWarningToast(fullMsg);
    setRoboSpeech(fullMsg);
    void dialogueManager.speak(
      'الصندوق ممتلئ يا بطل الفضاء! جهزت أربع وجبات كاملة، اضغط على موافق للانطلاق!'
    );
  }, []);

  const handleCargoDuplicate = useCallback(({ item }: NutritionCargoDuplicatePayload) => {
    soundManager.playClick();
    setInspectedItem(item);

    const dupMsg = `تم اختيار (${item.nameAr}) بالفعل في الصندوق! اختر وجبة فضائية أخرى 🌟`;
    setCargoWarningToast(dupMsg);
    setRoboSpeech(dupMsg);
  }, []);

  const handleFoodInspected = useCallback(({ item }: NutritionInspectPayload) => {
    setInspectedItem(item);
  }, []);

  const handleRemoveFoodFromPhaser = useCallback(
    (itemId: string) => {
      setCargoWarningToast(null);
      removeFoodItem(itemId);
    },
    [removeFoodItem]
  );

  const handleRoboClicked = useCallback(() => {
    soundManager.playClick();
    void dialogueManager.speak(roboSpeech);
  }, [roboSpeech]);

  const handleSceneReady = useCallback(() => {
    EventBus.emit('nutrition:sync-cargo', {
      cargoItems: state.cargoItems,
      stars: starCount
    });
  }, [state.cargoItems, starCount]);

  useEffect(() => {
    EventBus.on('nutrition:food-packed', handleFoodPacked);
    EventBus.on('nutrition:food-banned', handleFoodBanned);
    EventBus.on('nutrition:cargo-full', handleCargoFull);
    EventBus.on('nutrition:cargo-duplicate', handleCargoDuplicate);
    EventBus.on('nutrition:food-inspected', handleFoodInspected);
    EventBus.on('nutrition:remove-food', handleRemoveFoodFromPhaser);
    EventBus.on('nutrition:robo-clicked', handleRoboClicked);
    EventBus.on('nutrition:scene-ready', handleSceneReady);

    return () => {
      EventBus.off('nutrition:food-packed', handleFoodPacked);
      EventBus.off('nutrition:food-banned', handleFoodBanned);
      EventBus.off('nutrition:cargo-full', handleCargoFull);
      EventBus.off('nutrition:cargo-duplicate', handleCargoDuplicate);
      EventBus.off('nutrition:food-inspected', handleFoodInspected);
      EventBus.off('nutrition:remove-food', handleRemoveFoodFromPhaser);
      EventBus.off('nutrition:robo-clicked', handleRoboClicked);
      EventBus.off('nutrition:scene-ready', handleSceneReady);
    };
  }, [
    handleFoodPacked,
    handleFoodBanned,
    handleCargoFull,
    handleCargoDuplicate,
    handleFoodInspected,
    handleRemoveFoodFromPhaser,
    handleRoboClicked,
    handleSceneReady
  ]);

  const handleConfirmMission = () => {
    dialogueManager.stop();
    if (packedCount === 4 && canCompleteMission) {
      soundManager.playFanfare();
      EventBus.emit('nutrition:celebrate');
      completeNutritionMission();
      setShowSuccessModal(true);
    } else if (packedCount === 4 && !canCompleteMission) {
      const balancePrompt = state.nutritionScore.feedbackTip;
      soundManager.playAlertSiren();
      setCargoWarningToast(balancePrompt);
      setRoboSpeech(balancePrompt);
      EventBus.emit('nutrition:robo-state', { state: 'WARNING' });
      void dialogueManager.speak(balancePrompt);
    } else {
      const promptPhrase = `يا بطل الفضاء! نحتاج إلى 4 وجبات فضائية متوازنة داخل الصندوق قبل الإقلاع (لديك الآن ${packedCount}/4).`;
      setCargoWarningToast(promptPhrase);
      setRoboSpeech(promptPhrase);
      EventBus.emit('nutrition:robo-state', { state: 'TALKING' });
      void dialogueManager.speak(promptPhrase);
    }
  };

  return (
    <div className="relative w-full min-h-screen flex flex-col justify-between gap-4 overflow-x-hidden select-none pt-24 pb-6 px-3 sm:px-6 lg:px-8 bg-slate-950">
      {/* ===================================================================
          1. TOP MISSION HEADER HUD & 3-STAR PROGRESS BAR
         =================================================================== */}
      <div className="relative z-20 w-full max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 casual-card p-4">
        {/* Title & Objective */}
        <div className="flex items-center gap-3">
          <img
            src="/assets/food/sinai_honey.svg"
            alt="عسل النحل الجبلي السيناوي"
            className="w-11 h-11 sm:w-12 sm:h-12 object-contain drop-shadow"
          />
          <div className="text-right">
            <div className="flex items-center gap-2">
              <h1 className="font-hud font-black text-xl sm:text-2xl text-white">
                مختبر التغذية الفضائي
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-hud font-black bg-cyan-500/20 border border-cyan-300 text-cyan-200">
                Phaser 3 Interactive
              </span>
            </div>
            <p className="font-hud font-bold text-xs sm:text-sm text-cyan-200">
              الهدف: اسحب أو اضغط على 4 وجبات فضائية آمنة للجاذبية الصغرى داخل الصندوق 🎯
            </p>
          </div>
        </div>

        {/* Center 3-Star Mission Score Tracker */}
        <div className="flex items-center gap-3 bg-slate-950/90 border-2 border-amber-400/70 rounded-2xl px-4 py-1.5 shadow-inner">
          <div className="flex items-center gap-1">
            {[1, 2, 3].map((idx) => {
              const earned = starCount >= idx;
              return (
                <motion.div
                  key={idx}
                  animate={earned ? { scale: [1, 1.25, 1], rotate: [0, 10, -10, 0] } : {}}
                  transition={{ duration: 0.45 }}
                >
                  <Star
                    className={`w-6 h-6 sm:w-7 sm:h-7 transition-all ${
                      earned
                        ? 'text-yellow-300 fill-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.9)]'
                        : 'text-slate-600 fill-slate-800'
                    }`}
                  />
                </motion.div>
              );
            })}
          </div>
          <div className="text-right border-r border-slate-700 pr-3">
            <span className="block font-hud font-black text-xs sm:text-sm text-amber-300">
              {starCount} / 3 نجوم
            </span>
            <span className="block font-hud font-bold text-[11px] text-slate-300">
              {packedCount} / 4 وجبات معبأة
            </span>
          </div>
        </div>

        {/* Action Controls: Quiz, NASA Sources & Confirm Button */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              setShowNutritionQuizModal(true);
            }}
            className="casual-btn-primary px-3.5 py-2 text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer"
          >
            <Brain className="w-4 h-4" />
            <span>تحدي التغذية ({NUTRITION_QUIZ_QUESTIONS.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setShowNasaSourcesModal(true)}
            className="casual-btn-cyan px-3.5 py-2 text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer"
          >
            <BookOpen className="w-4 h-4" />
            <span>مراجع ناسا العلمية</span>
          </button>

          {packedCount > 0 && (
            <button
              type="button"
              onClick={() => {
                setCargoWarningToast(null);
                clearCargo();
              }}
              className="p-2.5 rounded-2xl bg-slate-800 hover:bg-rose-600 text-white border-2 border-slate-600 transition-colors cursor-pointer"
              title="إفراغ الصندوق"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}

          <motion.button
            type="button"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={handleConfirmMission}
            className={`px-5 py-2.5 rounded-2xl border-3 font-hud font-black text-sm sm:text-base flex items-center gap-2 shadow-lg cursor-pointer ${
              packedCount === 4 && canCompleteMission
                ? 'bg-gradient-to-r from-emerald-400 via-green-500 to-teal-600 border-white text-white shadow-[0_0_25px_rgba(16,185,129,0.7)]'
                : packedCount === 4
                ? 'bg-amber-900/80 border-amber-400 text-amber-200 hover:brightness-110'
                : 'bg-slate-800 border-slate-500 text-slate-300 hover:border-cyan-300'
            }`}
          >
            <Check className="w-5 h-5 stroke-[3]" />
            <span>موافق ({packedCount}/4)</span>
          </motion.button>
        </div>
      </div>

      {/* ===================================================================
          2. MAIN CHILD-FRIENDLY WORKSPACE: 85%+ 2.5D GAMEPLAY VIEWPORT
         =================================================================== */}
      <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col gap-2.5 flex-1 items-stretch">
        {/* Packed Cargo Cartoon Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900/95 border-2 border-cyan-400/60 rounded-2xl px-4 py-2 shadow-lg">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-hud font-black text-xs sm:text-sm text-cyan-300 ml-1">
              🍱 محتويات الصندوق:
            </span>
            {inspectedItem && (
              <span className="text-[11px] font-hud font-bold px-2 py-0.5 rounded-lg bg-sky-950 text-cyan-200 border border-cyan-500/40">
                فحص: {inspectedItem.nameAr}
              </span>
            )}
            {state.cargoItems.length === 0 ? (
              <span className="font-hud font-bold text-xs text-slate-300">
                الصندوق فارغ — اسحب أو اضغط على أي وجبة فضائية داخل مساحة اللعب!
              </span>
            ) : (
              state.cargoItems.map(({ item, quantity }) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setCargoWarningToast(null);
                    removeFoodItem(item.id);
                  }}
                  className="px-3 py-1 rounded-full bg-emerald-600/90 hover:bg-rose-600 text-white font-hud font-black text-xs border border-white flex items-center gap-1.5 transition-colors cursor-pointer shadow"
                  title="اضغط لإزالة عنصر"
                >
                  <span>{item.icon}</span>
                  <span>{item.nameAr}</span>
                  <span>×{quantity}</span>
                </button>
              ))
            )}
          </div>

          {packedCount === 4 && (
            <span className="px-3 py-1 rounded-full bg-amber-500/25 border-2 border-amber-400 text-amber-300 font-hud font-black text-xs animate-pulse">
              الصندوق ممتلئ وجاهز للانطلاق! (4/4) ✅
            </span>
          )}
        </div>

        {cargoWarningToast && (
          <div
            role="alert"
            data-testid="cargo-warning-toast"
            className="flex items-center justify-between gap-2 bg-amber-950/95 border-2 border-amber-400 rounded-2xl px-4 py-2 text-amber-200 font-hud font-black text-xs sm:text-sm shadow-lg"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
              <span>{cargoWarningToast}</span>
            </div>
            <button
              type="button"
              onClick={() => setCargoWarningToast(null)}
              className="px-2.5 py-1 rounded-xl bg-amber-900 hover:bg-amber-800 text-amber-100 text-xs font-hud font-bold cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        )}

        {/* 2.5D INTERACTIVE VIEWPORT OCCUPYING 85%+ VIEWPORT HEIGHT */}
        <div className="w-full flex-1 min-h-[480px] sm:min-h-[540px] rounded-3xl border-4 border-cyan-400/80 shadow-[0_0_40px_rgba(6,182,212,0.35)] overflow-hidden relative bg-slate-950 flex flex-col">
          <PhaserNutritionCanvas className="flex-1 w-full h-full" />
        </div>

        {/* BOTTOM CARTOON ROBO GUIDANCE & NUTRITION TELEMETRY DOCK */}
        <div className="w-full grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Playful Robo Speech Balloon (8 Cols) */}
          <div className="md:col-span-8 bg-gradient-to-r from-sky-950/95 via-slate-900/95 to-slate-950/95 border-2 border-cyan-400/70 rounded-2xl p-3 flex items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-2.5 flex-1">
              <span className="text-2xl shrink-0">🤖</span>
              <p className="font-hud font-bold text-xs sm:text-sm text-white leading-relaxed">
                {roboSpeech}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void dialogueManager.speak(roboSpeech)}
              className="px-3 py-1.5 rounded-xl bg-cyan-500/25 hover:bg-cyan-500/40 border border-cyan-300 text-cyan-200 font-hud font-bold text-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Volume2 className="w-4 h-4 text-cyan-300" />
              <span>{dialogueStatus.isSpeaking ? 'يتحدث 🔊' : 'استمع لروبو'}</span>
            </button>
          </div>

          {/* Simple Cartoon Nutrient Gauges (4 Cols) */}
          <div className="md:col-span-4 bg-slate-900/95 border-2 border-sky-400/70 rounded-2xl p-2.5 flex items-center justify-around gap-2 shadow-md">
            {/* Vitamins */}
            <div className="flex flex-col items-center">
              <span className="text-[11px] font-hud font-black text-emerald-400 flex items-center gap-0.5">
                <Apple className="w-3 h-3" /> فيتامين
              </span>
              <span className="text-xs font-hud font-black text-white">{vitaminsPercent}%</span>
              <div className="w-14 h-1.5 bg-slate-800 rounded-full overflow-hidden mt-0.5">
                <div style={{ width: `${vitaminsPercent}%` }} className="h-full bg-emerald-400" />
              </div>
            </div>

            {/* Protein */}
            <div className="flex flex-col items-center">
              <span className="text-[11px] font-hud font-black text-indigo-400 flex items-center gap-0.5">
                <Dumbbell className="w-3 h-3" /> بروتين
              </span>
              <span className="text-xs font-hud font-black text-white">{proteinPercent}%</span>
              <div className="w-14 h-1.5 bg-slate-800 rounded-full overflow-hidden mt-0.5">
                <div style={{ width: `${proteinPercent}%` }} className="h-full bg-indigo-400" />
              </div>
            </div>

            {/* Energy */}
            <div className="flex flex-col items-center">
              <span className="text-[11px] font-hud font-black text-amber-400 flex items-center gap-0.5">
                <Zap className="w-3 h-3" /> طاقة
              </span>
              <span className="text-xs font-hud font-black text-white">{energyPercent}%</span>
              <div className="w-14 h-1.5 bg-slate-800 rounded-full overflow-hidden mt-0.5">
                <div style={{ width: `${energyPercent}%` }} className="h-full bg-amber-400" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================================
          3. NASA OFFICIAL SCIENTIFIC REFERENCES MODAL
         =================================================================== */}
      <AnimatePresence>
        {showNasaSourcesModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              className="w-full max-w-2xl rounded-3xl bg-slate-950 border-4 border-cyan-400 p-5 sm:p-6 text-right shadow-2xl max-h-[88vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
                <h2 className="font-hud font-black text-xl sm:text-2xl text-white flex items-center gap-2">
                  <BookOpen className="w-6 h-6 text-cyan-400" />
                  <span>الدليل العلمي الموثق من وكالة ناسا (NASA)</span>
                </h2>
                <button
                  type="button"
                  onClick={() => setShowNasaSourcesModal(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-600 text-white font-hud font-black text-sm cursor-pointer"
                >
                  إغلاق ✕
                </button>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-950/60 border border-amber-400/60 text-amber-100 font-hud font-bold text-xs sm:text-sm mb-4 flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong>تمييز علمي هام:</strong> الفواكه والخضروات الغنية بالفيتامينات ومضادات الأكسدة تدعم صحة الخلايا والمناعة والروح المعنوية للرواد، لكنها <strong>لا تُعد درعاً واقياً من الإشعاع الفضائي</strong> (حيث تتطلب الحماية من الإشعاع دروعاً مادية للمركبة وملاجئ عواصف). كما أن بروتوكول شرب السوائل والأملاح يُستخدم <strong>قبل الهبوط والعودة لجاذبية الأرض (1G)</strong> وليس كحقنة في كل مهمة سير فضائي.
                </div>
              </div>

              <div className="space-y-3">
                {NASA_OFFICIAL_REFERENCES.map((ref) => (
                  <div
                    key={ref.id}
                    className="rounded-2xl bg-slate-900 border border-cyan-500/40 p-4 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-hud font-black text-sm sm:text-base text-cyan-300">
                        {ref.titleAr}
                      </h3>
                      <div className="px-3 py-1 rounded-xl bg-cyan-500/20 border border-cyan-400 text-cyan-200 font-hud font-bold text-xs flex items-center gap-1.5 shrink-0">
                        <span className="text-sm">🛰️</span>
                        <span>مختوم ببيانات ناسا الرسمية</span>
                      </div>
                    </div>
                    <p className="font-hud font-bold text-xs sm:text-sm text-white">
                      ✅ <strong>الحقيقة العلمية:</strong> {ref.verifiedFactAr}
                    </p>
                    <p className="font-hud font-bold text-xs text-amber-200">
                      🎮 <strong>في اللعبة:</strong> {ref.gameplayMechanicAr}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ===================================================================
          3B. INTERACTIVE NUTRITION 14-QUESTION QUIZ MODAL
         =================================================================== */}
      <AnimatePresence>
        {showNutritionQuizModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-[28px] bg-slate-950/95 border-4 border-amber-300 p-4 sm:p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <span className="font-hud font-black text-base sm:text-lg text-amber-200">
                  🥗 مسابقة أبطال التغذية الفضائية
                </span>
                <button
                  type="button"
                  onClick={() => setShowNutritionQuizModal(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-600 text-white font-hud font-black text-xs sm:text-sm cursor-pointer"
                >
                  إغلاق ✕
                </button>
              </div>
              <InteractiveQuizDeck
                questions={NUTRITION_QUIZ_QUESTIONS}
                titleAr="تحدي غذاء رواد الفضاء من ناسا"
                subtitleAr="تعرف على سر العسل السيناوي، منع الفتات في 0G، والبوتاسيوم لحماية العظام!"
                accent="emerald"
                milestoneCount={3}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ===================================================================
          4. MISSION SUCCESS CELEBRATION MODAL
         =================================================================== */}
      <AnimatePresence>
        {showSuccessModal && (
          <MissionSuccessModal
            onProceed={() => {
              dialogueManager.stop();
              setShowSuccessModal(false);
              setLocation('SuitRoom');
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
