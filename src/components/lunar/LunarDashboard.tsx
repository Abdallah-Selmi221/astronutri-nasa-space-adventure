import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameState } from '../../context/GameContext';
import { ECLSSSystem } from './ECLSSSystem';
import { EVATimer } from './EVATimer';
import { SolarStormAlert } from './SolarStormAlert';
import { VictoryModal } from './VictoryModal';
import { AnimatedRobo } from '../common/AnimatedRobo';
import { PhaserLunarCanvas } from '../../game/PhaserLunarCanvas';
import { EventBus } from '../../game/EventBus';
import { FilterMaintenance } from '../minigames/FilterMaintenance';
import { ResourceDashboard } from '../minigames/ResourceDashboard';
import { nasaCache } from '../../services/nasa/nasaCache';
import { soundManager } from '../../utils/sound';
import { 
  ArrowRight, 
  Droplets, 
  Clock, 
  Activity, 
  Sparkles, 
  ShieldCheck,
  CheckCircle2,
  Radio,
  Heart,
  Sprout,
  AlertTriangle,
  Award,
  Compass,
  Info
} from 'lucide-react';

export const LunarDashboard: React.FC = () => {
  const { state, setLocation, triggerSolarStorm, openVictoryModal } = useGameState();
  const { cadetName, level2State } = state;
  const [lunarTab, setLunarTab] = useState<'overview' | 'filters' | 'power'>('overview');
  const { 
    waterLevel, 
    evaTimeRemaining, 
    bloodPressureStatus, 
    isSalineAdministered,
    isSolarStormActive,
    isTradeOffResolved,
    tradeOffChoice,
    tradeOffFeedback,
    astronautHealthPercent,
    lunarFarmHealthPercent,
    isEVASafeReturned
  } = level2State;

  const [lunarToast, setLunarToast] = useState<{ title: string; message: string } | null>(null);
  const [extractedSamples, setExtractedSamples] = useState<number>(0);
  const latestCme = nasaCache.getLatestSolarStorm();
  const cmeSpeedText = latestCme.speedKmS ? `${latestCme.speedKmS} كم/ث` : latestCme.educationalLabelAr;

  // Sync Solar Storm status to Phaser 2.5D Canvas
  useEffect(() => {
    EventBus.emit('lunar:storm-alert', isSolarStormActive);
  }, [isSolarStormActive]);

  // Subscribe to Phaser Scene interactions
  useEffect(() => {
    const handlePropInspected = (payload: { title: string; message: string }) => {
      setLunarToast(payload);
      setTimeout(() => setLunarToast(null), 4500);
    };

    const handleSampleExtracted = () => {
      setExtractedSamples((prev) => Math.min(3, prev + 1));
      setLunarToast({
        title: 'استخراج جليد قمري نقي! 💎🧊',
        message: 'تم حفر عينة جليد من قاع فوهة شاكلتون.. الجليد سيتحول لماء شرب ووقود هيدروجيني!'
      });
      setTimeout(() => setLunarToast(null), 4000);
    };

    EventBus.on('lunar:prop-inspected', handlePropInspected);
    EventBus.on('lunar:sample-extracted', handleSampleExtracted);

    return () => {
      EventBus.off('lunar:prop-inspected', handlePropInspected);
      EventBus.off('lunar:sample-extracted', handleSampleExtracted);
    };
  }, []);

  // Dynamically trigger the Solar Storm event 7 seconds into Level 2 if not yet triggered/resolved
  useEffect(() => {
    if (!isSolarStormActive && !isTradeOffResolved) {
      const timer = setTimeout(() => {
        triggerSolarStorm();
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [isSolarStormActive, isTradeOffResolved, triggerSolarStorm]);

  return (
    <div className="w-full max-w-7xl mx-auto pt-24 pb-8 px-3 sm:px-6 flex flex-col gap-4 flex-1">
      {/* Top Breadcrumb & Outpost Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLocation('Map')}
            className="p-2.5 rounded-2xl bg-space-900 hover:bg-space-800 border-2 border-cyan-500/40 text-cyan-300 hover:text-white transition-all flex items-center gap-1.5 text-xs font-black shadow-md"
          >
            <ArrowRight className="w-4 h-4 text-cyan-400" />
            <span>خريطة المحطة</span>
          </button>
          <div className="flex items-center gap-3">
            <img 
              src="/assets/generated/ui/mission_banner_shackleton.svg" 
              alt="شعار مهمة شاكلتون" 
              className="hidden md:block h-10 w-auto object-contain filter drop-shadow-md"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-500/50">
                  المستوى 2: نشط 🌕
                </span>
                <h2 className="font-hud font-black text-xl sm:text-2xl text-white tracking-wide flex items-center gap-2">
                  قاعدة عمليات القمر <span className="text-cyan-400">أرتميس</span>
                </h2>
              </div>
              <p className="text-xs text-slate-300">
                قاعدة القطب الجنوبي للقمر • فوهة شاكلتون الفضائية
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Manual Radar Surge Button for instant testing */}
          {!isTradeOffResolved && (
            <button
              onClick={triggerSolarStorm}
              className="px-3.5 py-2 rounded-2xl bg-red-950/90 hover:bg-red-900 border-2 border-red-500 text-red-300 text-xs font-black transition-all flex items-center gap-1.5 shadow-lg shadow-red-950"
              title="إطلاق إنذار الرادار الشمسي لناسا فوراً"
            >
              <Radio className="w-4 h-4 animate-pulse text-red-400" />
              <span>{isSolarStormActive ? 'عاصفة شمسية تقترب!' : '⚡ محاكاة عاصفة شمسية'}</span>
            </button>
          )}

          {isEVASafeReturned && isTradeOffResolved && (
            <button
              onClick={openVictoryModal}
              className="px-3.5 py-2 rounded-2xl bg-yellow-400/20 hover:bg-yellow-400/30 border-2 border-yellow-400 text-yellow-300 text-xs font-black transition-all flex items-center gap-1.5 shadow-md"
            >
              <Award className="w-4 h-4 text-yellow-400" />
              <span>وسام البطولة الفضائية 🏅</span>
            </button>
          )}

          <div className="flex items-center gap-2 bg-space-900/90 px-4 py-2 rounded-2xl border-2 border-cyan-500/30 text-xs font-black">
            <span>🌕</span>
            <span className="text-slate-400">قائد القاعدة:</span>
            <span className="text-yellow-300">{cadetName}</span>
          </div>
        </div>
      </div>

      {/* Robo Companion Advice */}
      <div className="mb-6 p-4 rounded-3xl bg-gradient-to-r from-sky-950 via-space-900 to-indigo-950 border-2 border-cyan-400/40 shadow-xl flex flex-col sm:flex-row items-center gap-4">
        <div className="shrink-0">
          <AnimatedRobo
            state={isTradeOffResolved && isEVASafeReturned ? 'CELEBRATING' : isSolarStormActive ? 'WARNING' : 'EXPLAINING'}
            size="sm"
            showSpeechBubble={false}
          />
        </div>
        <div className="flex-1 text-right">
          <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-cyan-900/80 text-cyan-200 border border-cyan-400/40 mb-1 inline-block">
            إرشادات روبو لقاعدة القمر 🤖
          </span>
          <p className="text-xs sm:text-sm text-slate-200 font-bold leading-relaxed">
            &quot;أهلاً بيك في محطة القمر يا بطل! حافظ على خزان مياه الشرب ECLSS، وراقب وقت بدلة زميلك في السير القمري وزوّده بماء الشرب من كيس البدلة (IDB)، واستعد لرادار العواصف الشمسية بالدروع المادية!&quot;
          </p>
          <p className="text-[11px] font-hud font-bold text-amber-300 mt-1 flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 animate-pulse shrink-0" />
            <span>رصد عواصف الشمس NASA DONKI الحية: سرعة الانبعاث {cmeSpeedText} — فحص الدروع الإشعاعية نشط!</span>
          </p>
        </div>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex items-center justify-center gap-2 sm:gap-3 mb-6 flex-wrap" dir="rtl">
        <button
          type="button"
          onClick={() => setLunarTab('overview')}
          className={`px-4 sm:px-6 py-2 rounded-2xl font-hud font-black text-xs sm:text-sm transition-all cursor-pointer ${
            lunarTab === 'overview'
              ? 'bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.5)] scale-105'
              : 'bg-space-900 text-slate-300 hover:bg-space-800 border border-slate-700'
          }`}
        >
          مستعمرة القمر وأنابيب ECLSS 🌕
        </button>
        <button
          type="button"
          onClick={() => setLunarTab('filters')}
          className={`px-4 sm:px-6 py-2 rounded-2xl font-hud font-black text-xs sm:text-sm transition-all cursor-pointer ${
            lunarTab === 'filters'
              ? 'bg-emerald-500 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.5)] scale-105'
              : 'bg-space-900 text-slate-300 hover:bg-space-800 border border-slate-700'
          }`}
        >
          صيانة فلاتر تنقية الهواء 🔧
        </button>
        <button
          type="button"
          onClick={() => setLunarTab('power')}
          className={`px-4 sm:px-6 py-2 rounded-2xl font-hud font-black text-xs sm:text-sm transition-all cursor-pointer ${
            lunarTab === 'power'
              ? 'bg-amber-500 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.5)] scale-105'
              : 'bg-space-900 text-slate-300 hover:bg-space-800 border border-slate-700'
          }`}
        >
          لوحة إدارة طاقة القاعدة ⚡
        </button>
      </div>

      {lunarTab === 'filters' ? (
        <div className="mb-6">
          <FilterMaintenance onComplete={() => { soundManager.playFanfare(); setLunarTab('overview'); }} />
        </div>
      ) : lunarTab === 'power' ? (
        <div className="mb-6">
          <ResourceDashboard onComplete={() => { soundManager.playFanfare(); setLunarTab('overview'); }} />
        </div>
      ) : (
      <>

      {/* 2.5D Interactive Lunar Outpost Exploration Viewport */}
      <div className="mb-6 rounded-3xl border-2 border-cyan-400/50 bg-space-950/95 shadow-2xl overflow-hidden relative">
        <div className="h-64 sm:h-80 w-full relative">
          <PhaserLunarCanvas />

          {/* Interactive Exploration Overlay Badge */}
          <div className="absolute top-3 right-3 flex items-center gap-2">
            <div className="bg-space-950/85 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-cyan-400/50 text-[11px] font-black text-cyan-200 flex items-center gap-2 shadow-lg">
              <Sparkles className="w-3.5 h-3.5 text-yellow-400 animate-spin" />
              <span>عينات الجليد القمري: {extractedSamples}/3</span>
            </div>
            <div className="hidden sm:flex bg-space-950/85 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-cyan-400/40 text-[11px] font-black text-slate-300 items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-cyan-400" />
              <span>اضغط على صخور الجليد أو القباب للاستكشاف</span>
            </div>
          </div>

          {/* Toast Notification for Base Exploration */}
          <AnimatePresence>
            {lunarToast && (
              <motion.div
                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                className="absolute bottom-3 inset-x-3 sm:inset-x-auto sm:right-4 sm:max-w-md p-3.5 rounded-2xl bg-gradient-to-r from-space-900 via-sky-950 to-indigo-950 border-2 border-cyan-400/80 shadow-2xl text-right backdrop-blur-md z-30"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Info className="w-4 h-4 text-cyan-300 shrink-0" />
                  <h5 className="font-hud font-black text-xs sm:text-sm text-cyan-200">
                    {lunarToast.title}
                  </h5>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-200 font-bold leading-relaxed">
                  {lunarToast.message}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* High-Tech Control Panel Top Indicators HUD */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
      >
        {/* INDICATOR 1: WATER LEVEL */}
        <div className="bg-space-950/90 border-2 border-cyan-500/40 rounded-2xl p-4 shadow-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-950 border border-cyan-400 text-cyan-300">
              <Droplets className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] uppercase text-slate-400 block font-black">
                خزان مياه ECLSS
              </span>
              <h4 className="font-hud font-black text-lg text-white">
                {Math.round(waterLevel)}%
              </h4>
            </div>
          </div>
          <span className={`text-[11px] font-black px-2.5 py-1 rounded-xl ${
            waterLevel > 30 ? 'bg-emerald-950 text-emerald-300 border border-emerald-500' : 'bg-rose-950 text-rose-300 border border-rose-500 animate-pulse'
          }`}>
            {waterLevel > 30 ? 'آمن وطبيعي' : 'خطر التسريب!'}
          </span>
        </div>

        {/* INDICATOR 2: EVA SUIT TIME */}
        <div className="bg-space-950/90 border-2 border-purple-500/40 rounded-2xl p-4 shadow-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-950 border border-purple-400 text-purple-300">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase text-slate-400 block font-black">
                أكسجين بدلة السير EVA
              </span>
              <h4 className="font-hud font-black text-lg text-white">
                {evaTimeRemaining} ساعات
              </h4>
            </div>
          </div>
          <span className={`text-[11px] font-black px-2.5 py-1 rounded-xl ${
            evaTimeRemaining > 2 
              ? 'bg-purple-950 text-purple-300 border border-purple-500' 
              : evaTimeRemaining === 2 
              ? 'bg-amber-950 text-amber-300 border border-amber-500 animate-pulse'
              : 'bg-rose-950 text-rose-300 border border-rose-500 animate-pulse'
          }`}>
            {evaTimeRemaining > 2 ? 'وقت آمن' : evaTimeRemaining === 2 ? 'تحذير أكسجين' : 'خطر العودة فوراً!'}
          </span>
        </div>

        {/* INDICATOR 3: ASTRONAUT HEALTH & BLOOD PRESSURE */}
        <div className="bg-space-950/90 border-2 border-emerald-500/40 rounded-2xl p-4 shadow-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-950 border border-emerald-400 text-emerald-300">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase text-slate-400 block font-black">
                ضغط دم الرائد والقلب
              </span>
              <h4 className="font-hud font-black text-lg text-white">
                {bloodPressureStatus === 'stabilized' 
                  ? 'مستقر ومحمي' 
                  : bloodPressureStatus === 'low' 
                  ? 'منخفض (خطر الإغماء)' 
                  : 'طبيعي'}
              </h4>
            </div>
          </div>
          <span className={`text-[11px] font-black px-2.5 py-1 rounded-xl ${
            bloodPressureStatus === 'stabilized'
              ? 'bg-emerald-950 text-emerald-300 border border-emerald-500'
              : bloodPressureStatus === 'low'
              ? 'bg-rose-950 text-rose-300 border border-rose-500 animate-pulse'
              : 'bg-space-900 text-slate-300 border border-space-700'
          }`}>
            {bloodPressureStatus === 'stabilized' ? 'أُعطي المحلول' : bloodPressureStatus === 'low' ? 'خطر إغماء' : 'مستقر'}
          </span>
        </div>

        {/* INDICATOR 4: RADIATION DEFENSE & FARM */}
        <div className="bg-space-950/90 border-2 border-amber-500/40 rounded-2xl p-4 shadow-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-950 border border-amber-400 text-amber-300">
              <Heart className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase text-slate-400 block font-black">
                صحة الرائد / مزارع القمر
              </span>
              <h4 className="font-hud font-black text-lg text-white flex items-center gap-2">
                <span>{astronautHealthPercent}%</span>
                <span className="text-xs font-bold text-slate-400">/ {lunarFarmHealthPercent}%</span>
              </h4>
            </div>
          </div>
          <span className={`text-[11px] font-black px-2.5 py-1 rounded-xl ${
            isTradeOffResolved 
              ? 'bg-emerald-950 text-emerald-300 border border-emerald-500' 
              : 'bg-yellow-950 text-amber-300 border border-amber-500'
          }`}>
            {isTradeOffResolved ? (tradeOffChoice === 'shields' ? 'الدروع مفعلة' : 'المزارع مضاءة') : 'مسح الرادار'}
          </span>
        </div>
      </motion.div>

      {/* Trade-off Resolution Feedback Banner */}
      <AnimatePresence>
        {isTradeOffResolved && tradeOffFeedback && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-3xl mb-6 border-4 flex items-start sm:items-center justify-between gap-3 ${
              tradeOffChoice === 'shields'
                ? 'bg-emerald-950/80 border-emerald-400 text-emerald-200'
                : 'bg-amber-950/80 border-amber-400 text-amber-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-space-950 border border-current shrink-0">
                {tradeOffChoice === 'shields' ? (
                  <ShieldCheck className="w-6 h-6 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-amber-400" />
                )}
              </div>
              <div className="text-right">
                <span className="font-hud font-black text-xs sm:text-sm uppercase tracking-wider block">
                  {tradeOffChoice === 'shields' ? '✅ قرار طبي حكيم: تم تفعيل الدروع الكهرومغناطيسية لحماية حياة الرائد' : '⚠️ تحذير: تم الإبقاء على إضاءة المزارع وتأثرت صحة الرائد'}
                </span>
                <p className="text-xs sm:text-sm font-bold mt-0.5">
                  {tradeOffFeedback}
                </p>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-3 text-xs font-black shrink-0">
              <span className="flex items-center gap-1">
                <Heart className="w-4 h-4 text-rose-400" />
                <span>الرائد: {astronautHealthPercent}%</span>
              </span>
              <span className="flex items-center gap-1">
                <Sprout className="w-4 h-4 text-emerald-400" />
                <span>المزرعة: {lunarFarmHealthPercent}%</span>
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Grid: ECLSS System (Right) and EVA Timer / Saline (Left) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch flex-1">
        <ECLSSSystem />
        <EVATimer />
      </div>

      {/* Level 2 Objectives Bar */}
      <div className="mt-6 p-4 rounded-3xl bg-space-950/90 border-2 border-space-800 text-xs font-bold flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-slate-300">
          <Sparkles className="w-4 h-4 text-yellow-400 shrink-0" />
          <span><strong>مهام المستوى 2:</strong> تنقية مياه ECLSS، تفعيل دروع الحماية من العاصفة الشمسية، وتزويد الرائد بماء الشرب من كيس البدلة (IDB) قبل دخول غرفة الإغلاق.</span>
        </div>
        <div className="flex items-center gap-4 text-[11px]">
          <span className="flex items-center gap-1 text-slate-300">
            {waterLevel > 30 ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <ShieldCheck className="w-4 h-4 text-rose-400" />}
            <span>مياه نقية 98%</span>
          </span>
          <span className="flex items-center gap-1 text-slate-300">
            {isTradeOffResolved ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <ShieldCheck className="w-4 h-4 text-amber-400" />}
            <span>حماية الإشعاع</span>
          </span>
          <span className="flex items-center gap-1 text-slate-300">
            {isSalineAdministered ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <ShieldCheck className="w-4 h-4 text-purple-400" />}
            <span>محلول الأملاح</span>
          </span>
        </div>
      </div>
      </>
      )}

      {/* MODALS */}
      <SolarStormAlert />
      <VictoryModal />
    </div>
  );
};
