import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameState } from '../../context/GameContext';
import { soundManager } from '../../utils/sound';
import { geminiTTS } from '../../utils/geminiTTS';
import {
  X,
  Volume2,
  VolumeX,
  Bot,
  Globe,
  RotateCcw,
  Sliders,
  CheckCircle2,
  UserCheck
} from 'lucide-react';

interface SettingsMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsMenu: React.FC<SettingsMenuProps> = ({ isOpen, onClose }) => {
  const { state, toggleSound, resetGameFull, dispatch } = useGameState();

  const [volume, setVolume] = useState<number>(() => soundManager.getVolume());
  const [roboVoiceEnabled, setRoboVoiceEnabled] = useState<boolean>(() => geminiTTS.isVoiceEnabled());
  const [language, setLanguage] = useState<'ar' | 'en'>(() => {
    try {
      return (localStorage.getItem('astronutri_language') as 'ar' | 'en') || 'ar';
    } catch {
      return 'ar';
    }
  });
  const [cadetInput, setCadetInput] = useState<string>(state.cadetName);
  const [confirmReset, setConfirmReset] = useState<boolean>(false);
  const [resetNotice, setResetNotice] = useState<boolean>(false);

  useEffect(() => {
    setCadetInput(state.cadetName);
  }, [state.cadetName]);

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    soundManager.setVolume(newVol);
    if (newVol > 0 && !state.soundEnabled) {
      toggleSound();
    }
  };

  const handleToggleRoboVoice = () => {
    const nextState = !roboVoiceEnabled;
    setRoboVoiceEnabled(nextState);
    geminiTTS.setVoiceEnabled(nextState);
    soundManager.playClick();
    if (nextState) {
      geminiTTS.speak('أهلاً بيك يا بطل! صوت روبو شغال وجاهز يساعدك في كل المهمات!');
    }
  };

  const handleLanguageChange = (lang: 'ar' | 'en') => {
    soundManager.playClick();
    setLanguage(lang);
    try {
      localStorage.setItem('astronutri_language', lang);
    } catch {
      // ignore storage errors
    }
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  };

  const handleSaveCadetName = () => {
    const trimmed = cadetInput.trim();
    if (!trimmed) return;
    soundManager.playDropSuccess();
    dispatch({ type: 'SET_CADET_NAME', payload: trimmed });
  };

  const handleFullReset = () => {
    soundManager.playAlertSiren();
    geminiTTS.stop();
    try {
      localStorage.clear();
    } catch {
      // ignore storage errors
    }
    // Restore defaults
    soundManager.setVolume(85);
    soundManager.setEnabled(true);
    geminiTTS.setVoiceEnabled(true);
    setVolume(85);
    setRoboVoiceEnabled(true);
    setLanguage('ar');
    document.documentElement.lang = 'ar';
    document.documentElement.dir = 'rtl';

    resetGameFull();
    setConfirmReset(false);
    setResetNotice(true);
    setTimeout(() => {
      setResetNotice(false);
      onClose();
    }, 1100);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md">
          {/* Backdrop Click to Close */}
          <div className="absolute inset-0" onClick={onClose} />

          {/* 3D Command Center Settings Modal */}
          <motion.div
            initial={{ scale: 0.88, opacity: 0, y: 24 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.88, opacity: 0, y: 24 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            className="relative z-10 w-full max-w-xl bg-gradient-to-b from-sky-950 via-space-900 to-space-950 border-4 border-cyan-400 rounded-[2rem] p-5 sm:p-7 shadow-[0_20px_60px_rgba(6,182,212,0.45)] text-right overflow-hidden"
          >
            {/* Ambient Top Glow */}
            <div className="absolute -top-20 -right-20 w-56 h-56 bg-cyan-400/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 w-56 h-56 bg-amber-400/15 rounded-full blur-3xl pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between border-b-2 border-cyan-500/30 pb-4 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-400 p-0.5 shadow-lg shadow-cyan-500/30">
                  <div className="w-full h-full bg-space-950 rounded-[14px] flex items-center justify-center">
                    <Sliders className="w-6 h-6 text-cyan-300" />
                  </div>
                </div>
                <div>
                  <h2 className="font-hud font-black text-lg sm:text-2xl text-white flex items-center gap-2">
                    <span>إعدادات مركز القيادة</span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-900/90 border border-cyan-400/50 text-cyan-200">
                      تحكم كامل ⚙️
                    </span>
                  </h2>
                  <p className="text-xs text-slate-300 font-bold">
                    اضبط مستوى الصوت، صوت المرشد روبو، اللغة، أو أعد تشغيل المهمة
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  soundManager.playClick();
                  onClose();
                }}
                className="p-2.5 rounded-2xl bg-slate-800/90 hover:bg-rose-600 text-slate-200 hover:text-white border-2 border-slate-600 transition-all active:scale-90"
                aria-label="إغلاق الإعدادات"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              {/* 1. MASTER VOLUME SLIDER & MUTE TOGGLE */}
              <div className="p-4 rounded-3xl bg-space-950/90 border-2 border-cyan-500/40 shadow-inner">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-2.5 rounded-2xl border ${
                      state.soundEnabled && volume > 0
                        ? 'bg-cyan-950 border-cyan-400 text-cyan-300'
                        : 'bg-rose-950 border-rose-500 text-rose-300'
                    }`}>
                      {state.soundEnabled && volume > 0 ? (
                        <Volume2 className="w-5 h-5" />
                      ) : (
                        <VolumeX className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-hud font-black text-sm sm:text-base text-white">
                        مستوى المؤثرات الصوتية (Master Volume)
                      </h3>
                      <p className="text-[11px] text-slate-300 font-bold">
                        تحكم في قوة أصوات الصواريخ والأزرار والتنبيهات
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={toggleSound}
                    className={`px-4 py-2 rounded-2xl text-xs font-black border-2 transition-all active:scale-95 ${
                      state.soundEnabled
                        ? 'bg-emerald-500 text-space-950 border-emerald-200 shadow-lg shadow-emerald-500/30'
                        : 'bg-rose-900/90 text-rose-200 border-rose-400'
                    }`}
                  >
                    {state.soundEnabled ? 'الصوت مفعل 🔊' : 'مكتوم 🔇'}
                  </button>
                </div>

                {/* Volume Slider */}
                <div className="flex items-center gap-3 pt-1">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={state.soundEnabled ? volume : 0}
                    onChange={(e) => handleVolumeChange(Number(e.target.value))}
                    onMouseUp={() => soundManager.playClick()}
                    onTouchEnd={() => soundManager.playClick()}
                    className="w-full h-3 bg-space-800 rounded-xl appearance-none cursor-pointer accent-cyan-400"
                  />
                  <span className="min-w-[48px] text-center font-hud font-black text-xs px-2 py-1 rounded-xl bg-cyan-950 border border-cyan-500/40 text-cyan-300">
                    {state.soundEnabled ? `${volume}%` : '0%'}
                  </span>
                </div>
              </div>

              {/* 2. ROBO VOICE TOGGLE (GEMINI TTS) */}
              <div className="p-4 rounded-3xl bg-space-950/90 border-2 border-amber-400/40 shadow-inner flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-2xl border ${
                    roboVoiceEnabled
                      ? 'bg-amber-950 border-amber-400 text-amber-300'
                      : 'bg-slate-900 border-slate-700 text-slate-400'
                  }`}>
                    <Bot className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-hud font-black text-sm sm:text-base text-white flex items-center gap-1.5">
                      <span>صوت المرشد روبو التفاعلي</span>
                    </h3>
                    <p className="text-[11px] text-slate-300 font-bold">
                      تشغيل أو إيقاف الشرح الصوتي باللهجة المصرية المحببة للأطفال
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleToggleRoboVoice}
                  className={`w-full sm:w-auto px-5 py-2.5 rounded-2xl text-xs font-black border-2 transition-all active:scale-95 shrink-0 ${
                    roboVoiceEnabled
                      ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-space-950 border-yellow-200 shadow-lg shadow-amber-500/30'
                      : 'bg-slate-800 text-slate-300 border-slate-600'
                  }`}
                >
                  {roboVoiceEnabled ? 'صوت روبو: يعمل 🤖🔊' : 'صوت روبو: متوقف 🔕'}
                </button>
              </div>

              {/* 3. LANGUAGE SELECTOR (ARABIC [DEFAULT] / ENGLISH) */}
              <div className="p-4 rounded-3xl bg-space-950/90 border-2 border-purple-400/40 shadow-inner flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-purple-950 border border-purple-400 text-purple-300">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-hud font-black text-sm sm:text-base text-white">
                      لغة واجهة اللعبة (Language)
                    </h3>
                    <p className="text-[11px] text-slate-300 font-bold">
                      اختر اللغة المفضلة لعرض القوائم واتجاه الشاشة
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto bg-space-900 p-1.5 rounded-2xl border border-purple-500/40">
                  <button
                    type="button"
                    onClick={() => handleLanguageChange('ar')}
                    className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-xl text-xs font-black transition-all ${
                      language === 'ar'
                        ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    العربية (الافتراضي) 🇪🇬
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLanguageChange('en')}
                    className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-xl text-xs font-black transition-all ${
                      language === 'en'
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    English 🇺🇸
                  </button>
                </div>
              </div>

              {/* 4. CADET PROFILE NAME */}
              <div className="p-4 rounded-3xl bg-space-950/90 border-2 border-emerald-500/30 shadow-inner">
                <div className="flex items-center gap-2.5 mb-2.5">
                  <UserCheck className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-hud font-black text-sm text-white">
                    اسم رائد الفضاء البطل
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={cadetInput}
                    onChange={(e) => setCadetInput(e.target.value)}
                    maxLength={22}
                    placeholder="اكتب اسمك هنا يا بطل..."
                    className="flex-1 bg-space-900 border-2 border-space-700 focus:border-emerald-400 rounded-2xl px-3.5 py-2 text-xs sm:text-sm text-white font-bold outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleSaveCadetName}
                    className="px-4 py-2 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-space-950 font-black text-xs shadow-md active:scale-95 transition-all"
                  >
                    حفظ الاسم ✅
                  </button>
                </div>
              </div>

              {/* 5. RESET GAME (CLEAR LOCALSTORAGE & RESTART FROM LEVEL 1) */}
              <div className="p-4 rounded-3xl bg-rose-950/50 border-2 border-rose-500/50 shadow-inner">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-hud font-black text-sm sm:text-base text-rose-200 flex items-center gap-2">
                      <RotateCcw className="w-4 h-4 text-rose-400" />
                      <span>إعادة ضبط اللعبة بالكامل (Reset Game)</span>
                    </h3>
                    <p className="text-[11px] text-rose-200/80 font-bold mt-0.5">
                      مسح الذاكرة المحفوظة والبدء من جديد من المرحلة الأولى
                    </p>
                  </div>

                  {!confirmReset ? (
                    <button
                      type="button"
                      onClick={() => {
                        soundManager.playClick();
                        setConfirmReset(true);
                      }}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs border-2 border-rose-300 shadow-lg active:scale-95 transition-all shrink-0"
                    >
                      إعادة بدء المهمة 🔄
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={handleFullReset}
                        className="flex-1 sm:flex-initial px-4 py-2 rounded-2xl bg-red-500 hover:bg-red-400 text-white font-black text-xs border-2 border-yellow-300 animate-pulse"
                      >
                        تأكيد المسح والبدء! ⚠️
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmReset(false)}
                        className="px-3 py-2 rounded-2xl bg-slate-800 text-slate-300 text-xs font-bold"
                      >
                        إلغاء
                      </button>
                    </div>
                  )}
                </div>

                {resetNotice && (
                  <div className="mt-3 p-2.5 rounded-2xl bg-emerald-950 border border-emerald-400 text-emerald-300 text-xs font-black flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>تم مسح الذاكرة وإعادة اللعبة للمستوى الأول بنجاح!</span>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Close Action */}
            <div className="mt-5 pt-3 border-t border-cyan-500/30 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  soundManager.playClick();
                  onClose();
                }}
                className="w-full sm:w-auto px-8 py-3 rounded-2xl bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 text-space-950 font-hud font-black text-sm shadow-xl shadow-cyan-500/30 border-2 border-cyan-100 active:scale-95 transition-all"
              >
                حفظ والعودة للمهمة 🚀
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
