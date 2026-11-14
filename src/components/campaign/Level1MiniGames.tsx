import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { CampaignProgressState, MiniGameId } from '../../types/game';
import { soundManager } from '../../utils/sound';
import { dialogueManager } from '../../utils/geminiTTS';
import { NASA_ENGINEERING_TRADEOFFS } from '../../services/nasa/nasaOSDR';
import { CheckCircle2, AlertTriangle, Rocket, ShieldCheck, PackageCheck } from 'lucide-react';

interface Level1Props {
  miniGameId: MiniGameId;
  campaign: CampaignProgressState;
  onCompleteMiniGame: (id: MiniGameId, patch?: Partial<CampaignProgressState>) => void;
  onNextLevel: () => void;
  onBackToLevel: () => void;
}

interface L1FoodChoice {
  id: string;
  nameAr: string;
  icon: string;
  group: 'protein' | 'carbs' | 'fats' | 'vitamins' | 'banned';
  groupAr: string;
  weightKg: number;
  crumbWarning?: string;
}

const L1_FOOD_OPTIONS: L1FoodChoice[] = [
  { id: 'chicken_pouch', nameAr: 'دجاج فضائي مجفف', icon: '🍗', group: 'protein', groupAr: 'بروتين', weightKg: 6 },
  { id: 'space_tortilla', nameAr: 'خبز التورتيلا (بدون فتات)', icon: '🌯', group: 'carbs', groupAr: 'كربوهيدرات', weightKg: 4 },
  { id: 'almond_pack', nameAr: 'كيس لوز مغلف', icon: '🥜', group: 'fats', groupAr: 'دهون صحية', weightKg: 3 },
  { id: 'broccoli_strawberries', nameAr: 'بروكلي وفراولة مجففة', icon: '🥦', group: 'vitamins', groupAr: 'فيتامينات وألياف', weightKg: 4 },
  { id: 'cracker_chips', nameAr: 'بسكويت وشيبسي مقرمش', icon: '🍪', group: 'banned', groupAr: 'ممنوع بالفضاء', weightKg: 3, crumbWarning: 'قاعدة ممنوع الفتات! البسكويت والشيبسي يطيران في 0G ويدمران أجهزة التنفس!' },
  { id: 'soda_can', nameAr: 'مشروب غازي', icon: '🥤', group: 'banned', groupAr: 'ممنوع بالفضاء', weightKg: 4, crumbWarning: 'المشروبات الغازية ممنوعة لأن الغاز لا ينفصل عن السائل في انعدام الجاذبية!' }
];

const L1_EQUIPMENT = [
  { id: 'suit_liner', nameAr: 'بطانة بدلة الفضاء', icon: '🦺', bay: 'خزانة البدلات' },
  { id: 'telemetry_tablet', nameAr: 'جهاز قياس المركبة', icon: '📟', bay: 'خزانة القيادة' },
  { id: 'first_aid', nameAr: 'حقيبة الإسعاف الطبي', icon: '🩹', bay: 'الخزانة الطبية' },
  { id: 'tool_kit', nameAr: 'طقم مفاتيح الصيانة', icon: '🔧', bay: 'خزانة الأدوات' },
  { id: 'ration_seal', nameAr: 'أكياس حفظ الطعام المختومة', icon: '🥡', bay: 'خزانة التغذية' }
];

const L1_SHIP_SYSTEMS = [
  { id: 'oxygen', nameAr: 'خزانات الأكسجين النقي (100%)', icon: '🫁' },
  { id: 'power', nameAr: 'الطاقة الكهربائية والبطاريات', icon: '⚡' },
  { id: 'comms', nameAr: 'هوائي الاتصالات الأرضية', icon: '📡' },
  { id: 'life_support', nameAr: 'وحدة دعم الحياة وتنقية CO2', icon: '♻️' },
  { id: 'cabin_doors', nameAr: 'أقفال وأبواب الكابينة المحكمة', icon: '🚪' }
];

export const Level1MiniGames: React.FC<Level1Props> = ({
  miniGameId,
  campaign,
  onCompleteMiniGame,
  onNextLevel,
  onBackToLevel
}) => {
  // Mini-Game 1: Food Preparation
  const [selectedFoods, setSelectedFoods] = useState<string[]>(campaign.l1SelectedFoodIds);
  const [crumbAlert, setCrumbAlert] = useState<string | null>(null);

  // Mini-Game 2: Equipment Preparation
  const [packedEquipment, setPackedEquipment] = useState<string[]>(campaign.l1EquipmentPacked);

  // Mini-Game 3: Medical Checkup
  const [hydrationFixed, setHydrationFixed] = useState<boolean>(campaign.l1MedicalCleared);
  const [sleepFixed, setSleepFixed] = useState<boolean>(campaign.l1MedicalCleared);

  // Mini-Game 4: Spaceship Inspection
  const [checkedShip, setCheckedShip] = useState<string[]>(
    campaign.l1SpaceshipInspected ? L1_SHIP_SYSTEMS.map((s) => s.id) : []
  );

  // Mini-Game 5: Launch Countdown
  const [countdown, setCountdown] = useState<number | null>(null);
  const [launchSuccess, setLaunchSuccess] = useState<boolean>(
    campaign.completedMiniGames.includes('l1_mission_launch')
  );

  // ---------------------------------------------------------------------------
  // 1.1 FOOD PREPARATION
  // ---------------------------------------------------------------------------
  if (miniGameId === 'l1_food_prep') {
    const pickedItems = L1_FOOD_OPTIONS.filter((f) => selectedFoods.includes(f.id));
    const totalKg = pickedItems.reduce((sum, f) => sum + f.weightKg, 0);
    const hasProtein = pickedItems.some((f) => f.group === 'protein');
    const hasCarbs = pickedItems.some((f) => f.group === 'carbs');
    const hasFats = pickedItems.some((f) => f.group === 'fats');
    const hasVitamins = pickedItems.some((f) => f.group === 'vitamins');
    const all4Groups = hasProtein && hasCarbs && hasFats && hasVitamins && totalKg <= 20;

    const toggleFood = (item: L1FoodChoice) => {
      if (item.group === 'banned') {
        soundManager.playAlertSiren();
        setCrumbAlert(item.crumbWarning || 'طعام مسبب للفتات وممنوع!');
        void dialogueManager.speak('حاسب! ده هيعمل فتات ويبوظ الأجهزة في الفضاء!');
        return;
      }
      soundManager.playClick();
      setCrumbAlert(null);
      setSelectedFoods((prev) =>
        prev.includes(item.id) ? prev.filter((id) => id !== item.id) : [...prev, item.id]
      );
    };

    const confirmFood = () => {
      if (!all4Groups) return;
      soundManager.playFanfare();
      void dialogueManager.speak('عاش يا بطل! الأكل متوازن وبدون فتات وجاهز للصاروخ!');
      onCompleteMiniGame('l1_food_prep', {
        l1SelectedFoodIds: selectedFoods,
        l1FoodWeightKg: totalKg
      });
    };

    return (
      <div className="bg-slate-900/95 border-2 border-emerald-400/70 rounded-3xl p-5 flex flex-col gap-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950/80 rounded-2xl p-3 border border-slate-700">
          <div className="flex flex-wrap gap-2 text-xs font-hud font-black">
            <span className={hasProtein ? 'text-emerald-300' : 'text-slate-400'}>🍗 بروتين {hasProtein ? '✓' : '○'}</span>
            <span className={hasCarbs ? 'text-emerald-300' : 'text-slate-400'}>🌯 تورتيلا (كربوهيدرات) {hasCarbs ? '✓' : '○'}</span>
            <span className={hasFats ? 'text-emerald-300' : 'text-slate-400'}>🥜 دهون صحية {hasFats ? '✓' : '○'}</span>
            <span className={hasVitamins ? 'text-emerald-300' : 'text-slate-400'}>🥦 فيتامينات وألياف {hasVitamins ? '✓' : '○'}</span>
          </div>
          <span className="font-hud font-black text-sm text-amber-300">
            سعة الشحن: {totalKg} / 20 كجم
          </span>
        </div>

        {crumbAlert && (
          <div className="p-3 rounded-2xl bg-rose-950 border-2 border-rose-400 text-rose-100 font-hud font-bold text-sm flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{crumbAlert}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {L1_FOOD_OPTIONS.map((item) => {
            const active = selectedFoods.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => toggleFood(item)}
                className={`p-4 rounded-2xl border-2 text-right transition-all cursor-pointer ${
                  item.group === 'banned'
                    ? 'bg-rose-950/40 border-rose-500/60 hover:bg-rose-900/50'
                    : active
                    ? 'bg-emerald-950 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.4)]'
                    : 'bg-slate-800/80 border-slate-600 hover:border-cyan-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-3xl">{item.icon}</span>
                  <span className="text-xs font-hud font-bold px-2 py-0.5 rounded-full bg-slate-950 text-cyan-200">
                    {item.groupAr} • {item.weightKg}kg
                  </span>
                </div>
                <p className="font-hud font-black text-base text-white mt-2">{item.nameAr}</p>
              </button>
            );
          })}
        </div>

        <div className="p-3 rounded-2xl bg-sky-950/70 border border-cyan-500/40 text-xs font-hud text-cyan-100">
          🛰️ <strong>{NASA_ENGINEERING_TRADEOFFS[1].titleAr}:</strong> {NASA_ENGINEERING_TRADEOFFS[1].optimalDecisionAr}
        </div>

        <button
          type="button"
          disabled={!all4Groups}
          onClick={confirmFood}
          className={`w-full py-3.5 rounded-2xl font-hud font-black text-base border-2 transition-all ${
            all4Groups
              ? 'bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 border-white cursor-pointer hover:brightness-110'
              : 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
          }`}
        >
          تأكيد تعبئة الطعام الآمن 🚀
        </button>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 1.2 EQUIPMENT PREPARATION
  // ---------------------------------------------------------------------------
  if (miniGameId === 'l1_equipment_prep') {
    const toggleItem = (id: string) => {
      soundManager.playDropSuccess();
      setPackedEquipment((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      );
    };
    const allPacked = packedEquipment.length >= L1_EQUIPMENT.length;

    return (
      <div className="bg-slate-900/95 border-2 border-amber-400/70 rounded-3xl p-5 flex flex-col gap-4 shadow-xl">
        <p className="font-hud font-bold text-sm text-amber-200">
          اضغط على كل أداة من قائمة الجرد لحزمها في خزانتها الصحيحة ({packedEquipment.length}/{L1_EQUIPMENT.length}):
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {L1_EQUIPMENT.map((eq) => {
            const done = packedEquipment.includes(eq.id);
            return (
              <button
                key={eq.id}
                type="button"
                onClick={() => toggleItem(eq.id)}
                className={`p-4 rounded-2xl border-2 flex items-center justify-between cursor-pointer transition-all ${
                  done
                    ? 'bg-emerald-950 border-emerald-400 text-white'
                    : 'bg-slate-800 border-slate-600 text-slate-200 hover:border-amber-300'
                }`}
              >
                <div className="flex items-center gap-3 text-right">
                  <span className="text-3xl">{eq.icon}</span>
                  <div>
                    <p className="font-hud font-black text-sm sm:text-base">{eq.nameAr}</p>
                    <p className="font-hud text-xs text-cyan-200">📍 {eq.bay}</p>
                  </div>
                </div>
                {done ? <PackageCheck className="w-6 h-6 text-emerald-400" /> : <span className="text-xs font-hud text-amber-300">احزم ⬅</span>}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          disabled={!allPacked}
          onClick={() => {
            soundManager.playFanfare();
            void dialogueManager.speak('ممتاز! جميع المعدات جاهزة ومرتبة داخل الصاروخ!');
            onCompleteMiniGame('l1_equipment_prep', { l1EquipmentPacked: packedEquipment });
          }}
          className={`w-full py-3.5 rounded-2xl font-hud font-black text-base border-2 ${
            allPacked
              ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 border-white cursor-pointer'
              : 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
          }`}
        >
          تأكيد حزم المعدات ✅
        </button>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 1.3 MEDICAL CHECKUP (Reads Food Prep Continuity!)
  // ---------------------------------------------------------------------------
  if (miniGameId === 'l1_medical_check') {
    const nutritionReady = campaign.completedMiniGames.includes('l1_food_prep');
    const allClear = nutritionReady && hydrationFixed && sleepFixed;

    return (
      <div className="bg-slate-900/95 border-2 border-pink-400/70 rounded-3xl p-5 flex flex-col gap-4 shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`p-4 rounded-2xl border-2 ${nutritionReady ? 'bg-emerald-950/70 border-emerald-400' : 'bg-amber-950/70 border-amber-400'}`}>
            <p className="font-hud font-black text-base text-white">🥗 مؤشر التغذية</p>
            <p className="font-hud text-xs mt-1 text-slate-200">
              {nutritionReady
                ? 'مكتمل ومعتمد من مخزن الطعام (تأثير مباشر على جاهزية الطاقم).'
                : 'تنبيه! لم تجهز الوجبات المتوازنة في مخزن الطعام بعد.'}
            </p>
          </div>

          <div className={`p-4 rounded-2xl border-2 ${hydrationFixed ? 'bg-emerald-950/70 border-emerald-400' : 'bg-rose-950/70 border-rose-400'}`}>
            <p className="font-hud font-black text-base text-white">💧 مؤشر الترطيب</p>
            <p className="font-hud text-xs mt-1 text-slate-200">
              {hydrationFixed ? 'ترطيب مثالي: 96%!' : 'تحذير جفاف طفيف (62%)! اشرب ماء قبل الإطلاق.'}
            </p>
            {!hydrationFixed && (
              <button
                type="button"
                onClick={() => {
                  soundManager.playDropSuccess();
                  setHydrationFixed(true);
                }}
                className="mt-3 px-3 py-1.5 rounded-xl bg-cyan-500 text-slate-950 font-hud font-black text-xs cursor-pointer"
              >
                عالج: شرب الماء 💧
              </button>
            )}
          </div>

          <div className={`p-4 rounded-2xl border-2 ${sleepFixed ? 'bg-emerald-950/70 border-emerald-400' : 'bg-amber-950/70 border-amber-400'}`}>
            <p className="font-hud font-black text-base text-white">😴 مؤشر النوم والراحة</p>
            <p className="font-hud text-xs mt-1 text-slate-200">
              {sleepFixed ? 'نوم كافٍ: 8.5 ساعات!' : 'تنبيه: 5 ساعات نوم فقط! اضبط راحة الطاقم.'}
            </p>
            {!sleepFixed && (
              <button
                type="button"
                onClick={() => {
                  soundManager.playCrystalSparkle();
                  setSleepFixed(true);
                }}
                className="mt-3 px-3 py-1.5 rounded-xl bg-indigo-400 text-slate-950 font-hud font-black text-xs cursor-pointer"
              >
                عالج: إتمام 8 ساعات راحة 🛏️
              </button>
            )}
          </div>
        </div>

        <button
          type="button"
          disabled={!allClear}
          onClick={() => {
            soundManager.playFanfare();
            void dialogueManager.speak('أحسنت! الفحص الطبي سليم 100% والطاقم لائق للانطلاق!');
            onCompleteMiniGame('l1_medical_check', { l1MedicalCleared: true });
          }}
          className={`w-full py-3.5 rounded-2xl font-hud font-black text-base border-2 ${
            allClear
              ? 'bg-gradient-to-r from-emerald-400 to-cyan-500 text-slate-950 border-white cursor-pointer'
              : 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
          }`}
        >
          {nutritionReady ? 'اعتماد التصريح الطبي للانطلاق 🩺' : 'أكمل مخزن الطعام أولاً ثم اعتمد الفحص الطبي'}
        </button>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 1.4 SPACESHIP INSPECTION
  // ---------------------------------------------------------------------------
  if (miniGameId === 'l1_spaceship_inspect') {
    const allChecked = checkedShip.length >= L1_SHIP_SYSTEMS.length;
    const toggleCheck = (id: string) => {
      soundManager.playPressurizeHiss();
      setCheckedShip((prev) => (prev.includes(id) ? prev : [...prev, id]));
    };

    return (
      <div className="bg-slate-900/95 border-2 border-indigo-400/70 rounded-3xl p-5 flex flex-col gap-4 shadow-xl">
        <p className="font-hud font-bold text-sm text-indigo-200">
          افحص أنظمة المركبة الخمسة في حظيرة الصاروخ ({checkedShip.length}/{L1_SHIP_SYSTEMS.length}):
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {L1_SHIP_SYSTEMS.map((sys) => {
            const ok = checkedShip.includes(sys.id);
            return (
              <button
                key={sys.id}
                type="button"
                onClick={() => toggleCheck(sys.id)}
                className={`p-4 rounded-2xl border-2 flex items-center justify-between cursor-pointer transition-all ${
                  ok
                    ? 'bg-emerald-950 border-emerald-400 text-white'
                    : 'bg-slate-800 border-slate-600 text-slate-200 hover:border-cyan-400'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{sys.icon}</span>
                  <span className="font-hud font-black text-sm">{sys.nameAr}</span>
                </div>
                <span className={`text-xs font-hud font-black ${ok ? 'text-emerald-300' : 'text-amber-300'}`}>
                  {ok ? 'سليم 100% ✓' : 'افحص الآن'}
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          disabled={!allChecked}
          onClick={() => {
            soundManager.playFanfare();
            void dialogueManager.speak('أنظمة المركبة خضراء بالكامل! توجه إلى منصة الإطلاق!');
            onCompleteMiniGame('l1_spaceship_inspect', { l1SpaceshipInspected: true });
          }}
          className={`w-full py-3.5 rounded-2xl font-hud font-black text-base border-2 ${
            allChecked
              ? 'bg-gradient-to-r from-indigo-400 to-cyan-400 text-slate-950 border-white cursor-pointer'
              : 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
          }`}
        >
          تأكيد سلامة المركبة الفضائية 🛸
        </button>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 1.5 MISSION CONTROL & LAUNCH
  // ---------------------------------------------------------------------------
  const reqFood = campaign.completedMiniGames.includes('l1_food_prep');
  const reqEquip = campaign.completedMiniGames.includes('l1_equipment_prep');
  const reqMed = campaign.completedMiniGames.includes('l1_medical_check');
  const reqShip = campaign.completedMiniGames.includes('l1_spaceship_inspect');
  const canLaunch = reqFood && reqEquip && reqMed && reqShip;

  const startCountdown = () => {
    if (!canLaunch || countdown !== null) return;
    soundManager.playClick();
    setCountdown(3);
    const t1 = window.setTimeout(() => setCountdown(2), 800);
    const t2 = window.setTimeout(() => setCountdown(1), 1600);
    const t3 = window.setTimeout(() => {
      setCountdown(0);
      setLaunchSuccess(true);
      soundManager.playFanfare();
      confetti({ particleCount: 160, spread: 95, origin: { y: 0.6 } });
      void dialogueManager.speak('عاش يا بطل! تم إطلاق الصاروخ بنجاح وانطلقت الرحلة إلى القمر!');
      onCompleteMiniGame('l1_mission_launch');
      void t1;
      void t2;
      void t3;
    }, 2400);
  };

  return (
    <div className="bg-slate-900/95 border-2 border-purple-400/75 rounded-3xl p-5 flex flex-col gap-4 shadow-xl">
      <h2 className="font-hud font-black text-lg text-white flex items-center gap-2">
        <ShieldCheck className="w-5 h-5 text-cyan-400" />
        <span>فحص جاهزية المهام الأربع قبل الإطلاق:</span>
      </h2>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-hud font-black">
        {[
          { ok: reqFood, label: '1. تجهيز الطعام' },
          { ok: reqEquip, label: '2. حزم المعدات' },
          { ok: reqMed, label: '3. الفحص الطبي' },
          { ok: reqShip, label: '4. فحص المركبة' }
        ].map((r) => (
          <div
            key={r.label}
            className={`p-3 rounded-2xl border-2 flex items-center gap-2 ${
              r.ok ? 'bg-emerald-950/70 border-emerald-400 text-emerald-200' : 'bg-rose-950/50 border-rose-500 text-rose-200'
            }`}
          >
            {r.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
            <span>{r.label}</span>
          </div>
        ))}
      </div>

      {countdown !== null && countdown > 0 && (
        <div className="py-6 text-center font-hud font-black text-6xl text-amber-300 animate-bounce">
          {countdown}
        </div>
      )}

      {launchSuccess ? (
        <div className="p-6 rounded-3xl bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-950 border-4 border-emerald-300 text-center space-y-3">
          <p className="font-mono font-black text-lg sm:text-2xl text-amber-300 tracking-wide">
            LAUNCH SUCCESSFUL! THE JOURNEY TO THE MOON BEGINS!
          </p>
          <p className="font-hud font-black text-lg text-white">
            تم الإطلاق بنجاح! فُتح المستوى الثاني: الرحلة في انعدام الجاذبية 🚀🌕
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={onNextLevel}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-hud font-black text-base border-2 border-white cursor-pointer hover:scale-105 transition-transform"
            >
              انتقل للمستوى 2: الرحلة في 0G 🛸
            </button>
            <button
              type="button"
              onClick={onBackToLevel}
              className="px-5 py-3 rounded-2xl bg-slate-800 text-white font-hud font-bold text-sm border border-cyan-400 cursor-pointer"
            >
              العودة لخريطة الغرف
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={!canLaunch || countdown !== null}
          onClick={startCountdown}
          className={`w-full py-4 rounded-2xl font-hud font-black text-lg border-2 flex items-center justify-center gap-2 ${
            canLaunch
              ? 'bg-gradient-to-r from-purple-500 via-pink-500 to-amber-500 text-white border-white cursor-pointer hover:brightness-110 shadow-[0_0_30px_rgba(168,85,247,0.5)]'
              : 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
          }`}
        >
          <Rocket className="w-6 h-6" />
          <span>{canLaunch ? 'ابدأ العد التنازلي وإطلاق الصاروخ (3-2-1)' : 'أكمل الغرف الأربع أولاً للسماح بالإطلاق 🔒'}</span>
        </button>
      )}
    </div>
  );
};
