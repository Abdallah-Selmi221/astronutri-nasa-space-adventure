import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Rocket, Lock, CheckCircle2 } from 'lucide-react';
import { soundManager } from '../../utils/sound';
import { useGameState } from '../../context/GameContext';
import { RoomLocation } from '../../types/game';

interface IslandHubEntry {
  id: string;
  number: number;
  locationKey: string;
  titleAr: string;
  subtitleAr: string;
  icon: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  accentGradient: string;
  features: string[];
}

export const SIX_ISLANDS_DATA: IslandHubEntry[] = [
  {
    id: 'island-1',
    number: 1,
    locationKey: 'NutritionLab',
    titleAr: 'حديقة ومختبر التغذية',
    subtitleAr: 'أشجار فضائية مضيئة، صوبة هيدروبونيك، وتعبئة وجبات الفضاء الخالية من الفتات.',
    icon: '🍏',
    badgeBg: 'bg-emerald-500/20',
    badgeBorder: 'border-emerald-400',
    badgeText: 'text-emerald-300',
    accentGradient: 'from-emerald-950/80 via-teal-900/60 to-slate-950/90',
    features: ['طعام ناسا الآمن', 'حظر الفتات 0G', 'توازن البروتين والطاقة']
  },
  {
    id: 'island-2',
    number: 2,
    locationKey: 'SpaceScience',
    titleAr: 'أكاديمية الكواكب ورادار ناسا',
    subtitleAr: 'قبة مرصد تيليسكوبية عملاقة، كواكب تدور، ورادار كويكب 2010 PK ببيانات ناسا الحقيقية.',
    icon: '🪐',
    badgeBg: 'bg-sky-500/20',
    badgeBorder: 'border-sky-400',
    badgeText: 'text-sky-300',
    accentGradient: 'from-sky-950/80 via-blue-900/60 to-slate-950/90',
    features: ['رادار كويكبات NeoWs', 'جاذبية الكواكب المختلفة', 'حقائق علمية حية']
  },
  {
    id: 'island-health',
    number: 3,
    locationKey: 'HumanHealth',
    titleAr: 'قسم الصحة وجسم الإنسان',
    subtitleAr: 'فحص صحة القلب في الفضاء، تحدي شرب الماء في انعدام الجاذبية، وتمارين المقاومة ARED.',
    icon: '🫀',
    badgeBg: 'bg-rose-500/20',
    badgeBorder: 'border-rose-400',
    badgeText: 'text-rose-300',
    accentGradient: 'from-rose-950/80 via-purple-900/60 to-slate-950/90',
    features: ['تشخيص القلب 0G', 'تحدي شرب الماء الآمن', 'تمارين حماية العظام']
  },
  {
    id: 'island-3',
    number: 4,
    locationKey: 'SuitRoom',
    titleAr: 'مركز اللياقة وبدلات الفضاء',
    subtitleAr: 'معايرة الخوذة الذهبية، ضبط ضغط الأكسجين 4.3 PSI، وفحص الـ 14 طبقة وحبل الأمان.',
    icon: '🧑‍🚀',
    badgeBg: 'bg-violet-500/20',
    badgeBorder: 'border-violet-400',
    badgeText: 'text-violet-300',
    accentGradient: 'from-violet-950/80 via-purple-900/60 to-slate-950/90',
    features: ['تجميع بدلة EMU', 'ضغط 4.3 PSI المثالي', 'حبل الأمان والـ 14 طبقة']
  },
  {
    id: 'island-engine',
    number: 5,
    locationKey: 'EngineRoom',
    titleAr: 'قلب المحرك والطاقة الفضائية',
    subtitleAr: 'ضخ منقي الأكسجين إلى 100% وشحن خلايا الوقود الصاروخي مع التحكم الذكي في الحرارة.',
    icon: '⚡',
    badgeBg: 'bg-amber-500/20',
    badgeBorder: 'border-amber-400',
    badgeText: 'text-amber-300',
    accentGradient: 'from-amber-950/80 via-red-900/60 to-slate-950/90',
    features: ['مضخة الأكسجين 100%', 'شحن خلايا الوقود', 'تجنب سخونة المحرك']
  },
  {
    id: 'island-4',
    number: 6,
    locationKey: 'LaunchPad',
    titleAr: 'منصة الإطلاق ورحلة انعدام الجاذبية',
    subtitleAr: 'فحص الجاهزية الحقيقي، تحدي شرب أملاح التوازن، والانطلاق لمدار القمر!',
    icon: '🚀',
    badgeBg: 'bg-amber-500/20',
    badgeBorder: 'border-amber-400',
    badgeText: 'text-amber-300',
    accentGradient: 'from-amber-950/80 via-orange-900/60 to-slate-950/90',
    features: ['فحص الطعام والبدلة والوقود', 'QTE أملاح الجاذبية', 'الإقلاع الصاروخي للمدار']
  },
  {
    id: 'island-5',
    number: 7,
    locationKey: 'LunarDashboard',
    titleAr: 'مستعمرة القمر أرتميس',
    subtitleAr: 'قباب فوهة شاكلتون، لغز تدوير المياه ECLSS، وإنذار عواصف ناسا الشمسية DONKI.',
    icon: '🌙',
    badgeBg: 'bg-indigo-500/20',
    badgeBorder: 'border-indigo-400',
    badgeText: 'text-indigo-300',
    accentGradient: 'from-indigo-950/80 via-blue-950/60 to-slate-950/90',
    features: ['لغز شبكة المياه BFS', 'إنذار CME الشمسي', 'حفر عينات الجليد 0.16g']
  },
  {
    id: 'island-6',
    number: 8,
    locationKey: 'ReturnToEarth',
    titleAr: 'كبسولة العودة إلى الأرض',
    subtitleAr: 'موازنة حمولة العينات (≤100 كجم)، توجيه زاوية الدخول 20°-24°، والهبوط بالمظلات.',
    icon: '🌍',
    badgeBg: 'bg-emerald-500/20',
    badgeBorder: 'border-emerald-400',
    badgeText: 'text-emerald-300',
    accentGradient: 'from-emerald-950/80 via-cyan-950/60 to-slate-950/90',
    features: ['موازنة مركز الثقل', 'ممر حرارة الغلاف الجوي', 'وسام بطل الفضاء الشامل']
  }
];

interface WorldMapPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMission?: (missionId: string) => void;
  currentIslandIndex?: number;
}

export const WorldMapPreviewModal: React.FC<WorldMapPreviewModalProps> = ({
  isOpen,
  onClose,
  onSelectMission,
  currentIslandIndex = 0
}) => {
  const { state } = useGameState();

  if (!isOpen) return null;

  const isCompletedRoom = (key: string): boolean => {
    switch (key) {
      case 'NutritionLab':
        return state.isNutritionMissionComplete;
      case 'HumanHealth':
        return state.isHumanHealthComplete;
      case 'SuitRoom':
        return state.isSuitMissionComplete;
      case 'EngineRoom':
        return state.engineCoreState.isEngineComplete;
      case 'LaunchPad':
        return state.launchPadState.isLevel1Complete;
      case 'LunarDashboard':
        return state.level2State.isEVASafeReturned && state.level2State.isTradeOffResolved;
      case 'ReturnToEarth':
        return state.isReturnMissionComplete;
      default:
        return false;
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md select-none">
        <div className="absolute inset-0" onClick={onClose} />

        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 280 }}
          className="relative z-10 w-full max-w-5xl max-h-[92vh] flex flex-col bg-gradient-to-b from-sky-950/95 via-slate-900/95 to-slate-950/95 border-4 border-cyan-400 rounded-[2rem] shadow-[0_25px_60px_rgba(0,0,0,0.85)] overflow-hidden"
          dir="rtl"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-cyan-400/30 bg-slate-900/75">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-amber-300 to-orange-500 border-2 border-white flex items-center justify-center text-2xl shadow-lg">
                🧭
              </div>
              <div>
                <h2 className="font-hud font-black text-lg sm:text-2xl text-white flex items-center gap-2 flex-wrap">
                  <span>خريطة مسار أرتميس الفضائية (4 مراحل • 14 محطة)</span>
                  <span className="casual-badge text-[11px] px-2.5 py-0.5">
                    قيادة مهمات ناسا ✈️
                  </span>
                </h2>
                <p className="text-xs sm:text-sm text-cyan-200/85 font-bold">
                  اضغط على أي محطة فضائية مفتوحة للانطلاق إليها أو بدء المهمة مباشرة!
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                soundManager.playClick();
                onClose();
              }}
              className="p-2.5 rounded-2xl bg-slate-800/80 hover:bg-rose-600 text-slate-300 hover:text-white transition-all active:scale-90 cursor-pointer"
              aria-label="إغلاق الخريطة"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Interactive Flight Path Progress Strip */}
          <div className="px-4 sm:px-6 pt-3 pb-2 bg-slate-950/60 border-b border-white/10 overflow-x-auto">
            <div className="flex items-center gap-1.5 min-w-max">
              {SIX_ISLANDS_DATA.map((island, idx) => {
                const isUnlocked = state.unlockedRooms.includes(island.locationKey as RoomLocation);
                const isDone = isCompletedRoom(island.locationKey);
                const isHere = state.currentLocation === island.locationKey || currentIslandIndex === idx;
                return (
                  <React.Fragment key={`node-${island.id}`}>
                    <button
                      type="button"
                      onClick={() => {
                        if (!isUnlocked) soundManager.playAlertSiren();
                        else soundManager.playFanfare();
                        if (onSelectMission) onSelectMission(island.locationKey);
                        onClose();
                      }}
                      className={`px-3 py-1.5 rounded-2xl font-hud font-black text-[11px] flex items-center gap-1.5 border-2 transition-all cursor-pointer ${
                        isDone
                          ? 'bg-emerald-500/25 border-emerald-300 text-emerald-100'
                          : isHere
                          ? 'bg-amber-400 text-amber-950 border-white shadow'
                          : isUnlocked
                          ? 'bg-cyan-500/20 border-cyan-300 text-cyan-100 hover:bg-cyan-500/35'
                          : 'bg-slate-900 border-slate-700 text-slate-400'
                      }`}
                    >
                      <span>{isUnlocked ? island.icon : '🔒'}</span>
                      <span>{island.number}</span>
                      {isHere && <span className="text-[10px] font-black">📍 هنا</span>}
                    </button>
                    {idx < SIX_ISLANDS_DATA.length - 1 && (
                      <span className="text-cyan-400/70 font-black text-xs select-none">┄✈️┄</span>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Dynamic Island-Hopping Hub Grid (Zero static image maps!) */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {SIX_ISLANDS_DATA.map((island, idx) => {
                const isUnlocked = state.unlockedRooms.includes(island.locationKey as RoomLocation);
                const isDone = isCompletedRoom(island.locationKey);
                const isCurrent = state.currentLocation === island.locationKey || (currentIslandIndex === idx && isUnlocked);

                return (
                  <motion.div
                    key={island.id}
                    whileHover={isUnlocked ? { scale: 1.02, y: -4 } : undefined}
                    className={`relative p-4 rounded-3xl border-3 bg-gradient-to-br ${island.accentGradient} flex flex-col justify-between shadow-xl transition-all ${
                      !isUnlocked
                        ? 'border-slate-700 opacity-75 grayscale-[35%]'
                        : isDone
                        ? 'border-emerald-300 shadow-[0_0_25px_rgba(16,185,129,0.28)]'
                        : isCurrent
                        ? 'border-yellow-300 ring-2 ring-yellow-300/60 shadow-[0_0_30px_rgba(250,204,21,0.35)]'
                        : `${island.badgeBorder} hover:border-white`
                    }`}
                  >
                    <div>
                      {/* Top Island Badge & Number + Stars */}
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className={`text-xs font-hud font-black px-2.5 py-0.5 rounded-full ${island.badgeBg} ${island.badgeText} border ${island.badgeBorder} flex items-center gap-1`}
                        >
                          <span>المحطة {island.number}</span>
                          {isDone && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-300">
                              <CheckCircle2 className="w-3 h-3" /> ⭐⭐⭐
                            </span>
                          )}
                          {!isUnlocked && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-300">
                              <Lock className="w-3 h-3" /> مقفلة
                            </span>
                          )}
                        </span>
                        <span className="text-2xl">{isUnlocked ? island.icon : '🔒'}</span>
                      </div>

                      {/* Island Title & Story Subtitle */}
                      <h3 className="font-hud font-black text-base text-white mt-1">
                        {island.titleAr}
                      </h3>
                      <p className="text-xs text-slate-300 font-bold mt-1.5 leading-relaxed">
                        {island.subtitleAr}
                      </p>

                      {/* Mini Feature Chips */}
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {island.features.map((feat, fIdx) => (
                          <span
                            key={fIdx}
                            className="text-[10px] font-hud font-bold px-2 py-0.5 rounded-lg bg-black/40 text-cyan-200 border border-cyan-400/20"
                          >
                            ✓ {feat}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Launch / Fly to Island Button */}
                    <button
                      type="button"
                      onClick={() => {
                        if (!isUnlocked) {
                          soundManager.playAlertSiren();
                        } else {
                          soundManager.playFanfare();
                        }
                        if (onSelectMission) onSelectMission(island.locationKey);
                        onClose();
                      }}
                      className={`mt-4 w-full py-2.5 px-3 rounded-2xl font-hud font-black text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        !isUnlocked
                          ? 'bg-slate-800 border border-amber-400/50 text-amber-200 hover:bg-slate-700'
                          : isDone
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:brightness-110 active:scale-95'
                          : 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:brightness-110 text-white active:scale-95'
                      }`}
                    >
                      {!isUnlocked ? <Lock className="w-4 h-4" /> : <Rocket className="w-4 h-4" />}
                      <span>
                        {!isUnlocked
                          ? 'مقفلة — أكمل المرحلة السابقة 🔒'
                          : isDone
                          ? `إعادة المحطة ${island.number} ✅`
                          : `الانطلاق إلى المحطة ${island.number} 🚀`}
                      </span>
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default WorldMapPreviewModal;
