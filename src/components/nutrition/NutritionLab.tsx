import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameState } from '../../context/GameContext';
import { FoodItem } from '../../types/game';
import { FOOD_DATABASE, NASA_OFFICIAL_REFERENCES } from '../../data/foodItems';
import { MissionSuccessModal } from './MissionSuccessModal';
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
  Droplets,
  Apple,
  ShieldCheck,
  BookOpen,
  ExternalLink,
  Volume2,
  Star,
  AlertTriangle,
  Sparkles,
  Dumbbell
} from 'lucide-react';

const DEFAULT_ROBO_TEXT =
  'أهلاً بك في مختبر التغذية الفضائي! اسحب أو اضغط على 4 وجبات فضائية آمنة (مثل التورتيلا، عبوة الفضاء، كيس العصير، التفاح، البروكلي، والحليب) داخل الصندوق وتجنب الأطعمة المتفتتة أو الغازية! 🎯';

export const NutritionLab: React.FC = () => {
  const {
    state,
    setLocation,
    addFoodItem,
    removeFoodItem,
    clearCargo,
    completeNutritionMission
  } = useGameState();

  const [roboSpeech, setRoboSpeech] = useState<string>(DEFAULT_ROBO_TEXT);
  const [inspectedItem, setInspectedItem] = useState<FoodItem>(FOOD_DATABASE[0]);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [showNasaSourcesModal, setShowNasaSourcesModal] = useState<boolean>(false);
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

  // Dynamic nutrition metrics for the "التوازن الغذائي" HUD
  const vitaminsPercent = Math.min(100, packedCount === 0 ? 15 : 25 + packedCount * 20);
  const proteinPercent = Math.min(
    100,
    Math.round((state.nutritionScore.totalProtein / 75) * 100) || (packedCount > 0 ? 35 : 10)
  );
  const energyPercent = Math.min(
    100,
    Math.round((state.nutritionScore.totalCarbs / 85) * 100) || (packedCount > 0 ? 40 : 15)
  );
  const hasDrinkTube = state.cargoItems.some((e) => e.item.id === 'drink_tube');
  const waterPercent = hasDrinkTube ? 100 : Math.min(95, 50 + packedCount * 12);

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
    if (packedCount === 4) {
      soundManager.playFanfare();
      EventBus.emit('nutrition:celebrate');
      completeNutritionMission();
      setShowSuccessModal(true);
    } else {
      const promptPhrase = `يا بطل الفضاء! نحتاج إلى 4 وجبات فضائية آمنة داخل الصندوق قبل الإقلاع (لديك الآن ${packedCount}/4).`;
      setCargoWarningToast(promptPhrase);
      setRoboSpeech(promptPhrase);
      EventBus.emit('nutrition:robo-state', { state: 'TALKING' });
      void dialogueManager.speak(promptPhrase);
    }
  };

  return (
    <div className="relative w-full min-h-screen flex flex-col justify-between overflow-x-hidden select-none pt-20 pb-4 px-2.5 sm:px-5 lg:px-7 bg-slate-950">
      {/* ===================================================================
          1. TOP MISSION HEADER HUD & 3-STAR PROGRESS BAR
         =================================================================== */}
      <div className="relative z-20 w-full max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 mb-2.5 bg-gradient-to-r from-slate-900/95 via-sky-950/95 to-slate-900/95 border-2 border-cyan-400/60 rounded-3xl px-4 py-2.5 shadow-[0_8px_30px_rgba(6,182,212,0.3)]">
        {/* Title & Objective */}
        <div className="flex items-center gap-3">
          <img
            src="/assets/sprites/food/food-tortilla.png"
            alt="تورتيلا الفضاء"
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

        {/* Action Controls: NASA Sources & Confirm Button */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button
            type="button"
            onClick={() => setShowNasaSourcesModal(true)}
            className="px-3.5 py-2 rounded-2xl bg-sky-900/90 hover:bg-sky-800 border-2 border-cyan-300/70 text-cyan-100 font-hud font-black text-xs sm:text-sm flex items-center gap-1.5 shadow cursor-pointer"
          >
            <BookOpen className="w-4 h-4 text-cyan-300" />
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
              packedCount === 4
                ? 'bg-gradient-to-r from-emerald-400 via-green-500 to-teal-600 border-white text-white shadow-[0_0_25px_rgba(16,185,129,0.7)]'
                : 'bg-slate-800 border-slate-500 text-slate-300 hover:border-cyan-300'
            }`}
          >
            <Check className="w-5 h-5 stroke-[3]" />
            <span>موافق ({packedCount}/4)</span>
          </motion.button>
        </div>
      </div>

      {/* ===================================================================
          2. MAIN HYBRID WORKSPACE: PHASER 3 GAME STAGE + REACT HUD SIDEBAR
         =================================================================== */}
      <div className="relative z-10 w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-3.5 flex-1 items-stretch">
        {/* PHASER 3 INTERACTIVE CANVAS LAYER (8 Cols on Desktop) — Zero Overlapping HTML Overlays */}
        <div className="lg:col-span-8 w-full flex flex-col gap-2">
          {/* Packed Cargo Strip Positioned Cleanly Above Canvas (Never Blocks Pointer Events) */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900/95 border-2 border-cyan-400/50 rounded-2xl px-3.5 py-2 shadow">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-hud font-black text-xs text-cyan-300 ml-1">
                محتويات الصندوق:
              </span>
              {state.cargoItems.length === 0 ? (
                <span className="font-hud font-bold text-xs text-slate-300">
                  الصندوق فارغ — اسحب أو اضغط على أي وجبة داخل مساحة اللعب!
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
                    className="px-2.5 py-0.5 rounded-full bg-emerald-600/90 hover:bg-rose-600 text-white font-hud font-black text-xs border border-white/80 flex items-center gap-1 transition-colors cursor-pointer"
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
              <span className="px-3 py-0.5 rounded-full bg-amber-500/20 border border-amber-400 text-amber-300 font-hud font-black text-xs">
                الصندوق ممتلئ (4/4) ✅
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
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{cargoWarningToast}</span>
              </div>
              <button
                type="button"
                onClick={() => setCargoWarningToast(null)}
                className="px-2 py-0.5 rounded-lg bg-amber-900/80 hover:bg-amber-800 text-amber-100 text-xs cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          )}

          <div className="w-full h-[460px] sm:h-[520px] lg:h-[550px] rounded-3xl border-4 border-cyan-400/75 shadow-[0_0_40px_rgba(6,182,212,0.35)] overflow-hidden relative bg-slate-950 flex flex-col">
            <PhaserNutritionCanvas className="flex-1 w-full h-full" />
          </div>
        </div>

        {/* REACT SCIENTIFIC & TELEMETRY HUD SIDEBAR (4 Cols on Desktop) */}
        <div className="lg:col-span-4 w-full flex flex-col justify-between gap-3">
          {/* PANEL A: ROBO LIVE DIALOGUE & VOICE STATUS CARD */}
          <div className="rounded-3xl bg-gradient-to-b from-sky-950/95 via-slate-900/95 to-slate-950/95 border-3 border-cyan-400/80 p-4 shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
                <span className="font-hud font-black text-sm text-cyan-300">
                  توجيهات الكابتن روبو 🤖
                </span>
              </div>

              <button
                type="button"
                onClick={() => void dialogueManager.speak(roboSpeech)}
                className="px-2.5 py-1 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-300 text-cyan-100 font-hud font-bold text-xs flex items-center gap-1 cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5 text-cyan-300" />
                <span>
                  {dialogueStatus.isLoading
                    ? 'جاري التحميل...'
                    : dialogueStatus.isSpeaking
                    ? 'يتحدث الآن 🔊'
                    : 'استمع لروبو'}
                </span>
              </button>
            </div>

            <p className="font-hud font-black text-sm sm:text-base text-white leading-relaxed bg-slate-950/80 border border-cyan-500/30 rounded-2xl p-3">
              {roboSpeech}
            </p>

            {dialogueStatus.toastError && (
              <div className="mt-2 px-3 py-1.5 rounded-xl bg-amber-950/90 border border-amber-400/60 text-amber-200 font-hud font-bold text-xs">
                {dialogueStatus.toastError}
              </div>
            )}
          </div>

          {/* PANEL B: VERIFIED NASA SCIENCE vs. GAMEPLAY MECHANIC INSPECTOR */}
          <div className="rounded-3xl bg-gradient-to-b from-slate-900/95 to-slate-950/95 border-3 border-amber-400/70 p-4 shadow-xl flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 pb-2 mb-2.5 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <img
                    src={inspectedItem.svgAsset}
                    alt={inspectedItem.nameAr}
                    className="w-10 h-10 object-contain rounded-xl bg-slate-800 p-1 border border-slate-700"
                  />
                  <div>
                    <h3 className="font-hud font-black text-base text-white">
                      {inspectedItem.nameAr}
                    </h3>
                    <span
                      className={`inline-block text-[11px] font-hud font-black px-2 py-0.5 rounded-full ${
                        inspectedItem.isBanned
                          ? 'bg-rose-950 text-rose-300 border border-rose-500'
                          : 'bg-emerald-950 text-emerald-300 border border-emerald-500'
                      }`}
                    >
                      {inspectedItem.isBanned
                        ? 'ممنوع في الجاذبية الصغرى 🚫'
                        : 'معتمد لرواد الفضاء ✅'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Verified NASA Scientific Fact */}
              <div className="rounded-2xl bg-sky-950/70 border border-cyan-400/50 p-3 mb-2.5">
                <div className="flex items-center gap-1.5 text-cyan-300 font-hud font-black text-xs mb-1">
                  <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>حقيقة علمية موثقة (NASA):</span>
                </div>
                <p className="font-hud font-bold text-xs sm:text-sm text-slate-100 leading-relaxed">
                  {inspectedItem.nasaVerifiedFactAr || inspectedItem.funFactAr}
                </p>
              </div>

              {/* Explicit Gameplay Simplification Distinction */}
              <div className="rounded-2xl bg-amber-950/45 border border-amber-400/45 p-2.5 mb-2">
                <div className="flex items-center gap-1.5 text-amber-300 font-hud font-black text-xs mb-0.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>ميكانيكية اللعب المبسطة:</span>
                </div>
                <p className="font-hud font-bold text-xs text-amber-100 leading-relaxed">
                  {inspectedItem.gameplaySimplificationAr}
                </p>
              </div>
            </div>

            {/* Official NASA Reference Link */}
            {inspectedItem.nasaSourceUrl && (
              <a
                href={inspectedItem.nasaSourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center justify-between w-full px-3 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-cyan-400/40 text-cyan-200 font-hud font-bold text-xs transition-colors"
              >
                <span>المصدر: {inspectedItem.nasaSourceTitle}</span>
                <ExternalLink className="w-3.5 h-3.5 text-cyan-300" />
              </a>
            )}
          </div>

          {/* PANEL C: NUTRITIONAL BALANCE TELEMETRY ("التوازن الغذائي") */}
          <div className="rounded-3xl bg-gradient-to-b from-white/95 via-sky-50/95 to-cyan-100/95 border-3 border-sky-400 p-4 text-slate-900 shadow-lg">
            <div className="bg-gradient-to-r from-blue-950 via-sky-800 to-blue-950 text-white font-hud font-black text-sm sm:text-base text-center py-1.5 rounded-xl border border-cyan-300 mb-3">
              التوازن الغذائي للشحنة
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {/* Vitamins */}
              <div>
                <div className="flex items-center justify-between text-xs font-hud font-black mb-1">
                  <span className="flex items-center gap-1 text-emerald-800">
                    <Apple className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                    <span>فيتامينات</span>
                  </span>
                  <span>{vitaminsPercent}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden border border-slate-300">
                  <motion.div
                    animate={{ width: `${vitaminsPercent}%` }}
                    className="h-full bg-gradient-to-r from-emerald-400 to-green-600 rounded-full"
                  />
                </div>
              </div>

              {/* Protein & Bones */}
              <div>
                <div className="flex items-center justify-between text-xs font-hud font-black mb-1">
                  <span className="flex items-center gap-1 text-indigo-800">
                    <Dumbbell className="w-3.5 h-3.5 text-indigo-600" />
                    <span>بروتين وعظام</span>
                  </span>
                  <span>{proteinPercent}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden border border-slate-300">
                  <motion.div
                    animate={{ width: `${proteinPercent}%` }}
                    className="h-full bg-gradient-to-r from-indigo-400 to-blue-600 rounded-full"
                  />
                </div>
              </div>

              {/* Energy */}
              <div>
                <div className="flex items-center justify-between text-xs font-hud font-black mb-1">
                  <span className="flex items-center gap-1 text-amber-800">
                    <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                    <span>طاقة</span>
                  </span>
                  <span>{energyPercent}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden border border-slate-300">
                  <motion.div
                    animate={{ width: `${energyPercent}%` }}
                    className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"
                  />
                </div>
              </div>

              {/* Zero-G Hydration */}
              <div>
                <div className="flex items-center justify-between text-xs font-hud font-black mb-1">
                  <span className="flex items-center gap-1 text-sky-800">
                    <Droplets className="w-3.5 h-3.5 text-sky-500 fill-sky-400" />
                    <span>ترطيب آمن</span>
                  </span>
                  <span>{waterPercent}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden border border-slate-300">
                  <motion.div
                    animate={{ width: `${waterPercent}%` }}
                    className="h-full bg-gradient-to-r from-cyan-400 to-blue-600 rounded-full"
                  />
                </div>
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
                      <a
                        href={ref.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-400 text-cyan-100 font-hud font-bold text-xs flex items-center gap-1 shrink-0"
                      >
                        <span>رابط ناسا</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
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
          4. MISSION SUCCESS CELEBRATION MODAL
         =================================================================== */}
      <AnimatePresence>
        {showSuccessModal && (
          <MissionSuccessModal
            onProceed={() => {
              dialogueManager.stop();
              setShowSuccessModal(false);
              setLocation('SpaceScience');
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
