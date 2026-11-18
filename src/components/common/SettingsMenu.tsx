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
  UserCheck,
  Music,
  PlayCircle,
  AlertTriangle,
  Info,
  Rocket,
  Lock
} from 'lucide-react';

import { tr } from '../../utils/i18n';
import type { AppLanguage, CadetAgeGroup } from '../../types/game';

interface SettingsMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onReplayIntro?: () => void;
}

export const SettingsMenu: React.FC<SettingsMenuProps> = ({ isOpen, onClose, onReplayIntro }) => {
  const {
    state,
    toggleSound,
    resetGameFull,
    unlockAllDemoLevels,
    language,
    ageGroup,
    setLanguage,
    setAgeGroup,
    dispatch,
    storageStatus
  } = useGameState();

  const [volume, setVolume] = useState<number>(() => soundManager.getVolume());
  const [bgmVolume, setBgmVolume] = useState<number>(() => soundManager.getBgmVolume());
  const [bgmEnabled, setBgmEnabled] = useState<boolean>(() => soundManager.isBgmEnabled());
  const [roboVoiceEnabled, setRoboVoiceEnabled] = useState<boolean>(() => geminiTTS.isVoiceEnabled());
  const [cadetInput, setCadetInput] = useState<string>(state.cadetName);
  const [confirmReset, setConfirmReset] = useState<boolean>(false);
  const [resetNotice, setResetNotice] = useState<boolean>(false);
  const [demoUnlockNotice, setDemoUnlockNotice] = useState<boolean>(false);

  const isAllDemoUnlocked =
    (state.campaign?.unlockedLevels.length ?? 1) >= 4 &&
    state.unlockedRooms.length >= 9 &&
    Boolean(state.campaign?.l3ReturnAuthorized) &&
    (state.campaign?.l3PackedTools.length ?? 0) >= 4;

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

  const handleBgmVolumeChange = (newVol: number) => {
    setBgmVolume(newVol);
    soundManager.setBgmVolume(newVol);
  };

  const handleToggleBgm = () => {
    const nextState = !bgmEnabled;
    setBgmEnabled(nextState);
    soundManager.setBgmEnabled(nextState);
    soundManager.playClick();
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

  const handleLanguageChange = (lang: AppLanguage) => {
    soundManager.playClick();
    setLanguage(lang);
  };

  const handleSaveCadetName = () => {
    const trimmed = cadetInput.trim();
    if (!trimmed) return;
    soundManager.playDropSuccess();
    dispatch({ type: 'SET_CADET_NAME', payload: trimmed });
  };

  const handleReplayIntroduction = () => {
    soundManager.playClick();
    if (onReplayIntro) {
      onReplayIntro();
      onClose();
    } else {
      geminiTTS.speak('جاهز للمغامرة يا بطل؟ يلا بينا نستكشف أسرار فضاء أكاديمية ناسا للتغذية!');
    }
  };

  const handleFullReset = () => {
    soundManager.playAlertSiren();
    geminiTTS.stop();
    try {
      localStorage.removeItem('astronutri_save_v1');
    } catch {
      // ignore storage errors
    }

    resetGameFull();
    setConfirmReset(false);
    setDemoUnlockNotice(false);
    setResetNotice(true);
    setTimeout(() => {
      setResetNotice(false);
      onClose();
    }, 1100);
  };

  const handleUnlockAllDemo = () => {
    unlockAllDemoLevels();
    setDemoUnlockNotice(true);
    setResetNotice(false);
  };

  const handleResetToLevelOne = () => {
    resetGameFull();
    setDemoUnlockNotice(false);
    setConfirmReset(false);
    setResetNotice(true);
    setTimeout(() => setResetNotice(false), 1800);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          data-testid="settings-modal"
          className="fixed inset-0 z-[95] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md"
        >
          {/* Backdrop Click to Close */}
          <div className="absolute inset-0" onClick={onClose} />

          {/* 3D Command Center Settings Modal */}
          <motion.div
            initial={{ scale: 0.88, opacity: 0, y: 24 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.88, opacity: 0, y: 24 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            dir={language === 'ar' ? 'rtl' : 'ltr'}
            className={`relative z-10 w-full max-w-xl bg-gradient-to-b from-sky-950 via-space-900 to-space-950 border-4 border-cyan-400 rounded-[2rem] p-5 sm:p-7 shadow-[0_20px_60px_rgba(6,182,212,0.45)] ${
              language === 'ar' ? 'text-right' : 'text-left'
            } overflow-hidden`}
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
                    <span>{tr(language, 'Command Center Settings', 'إعدادات مركز القيادة')}</span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-900/90 border border-cyan-400/50 text-cyan-200">
                      {tr(language, 'Full Control ⚙️', 'تحكم كامل ⚙️')}
                    </span>
                  </h2>
                  <p className="text-xs text-slate-300 font-bold">
                    {tr(
                      language,
                      'Switch EN/AR language, profile, audio, or unlock all levels for judging',
                      'اضبط مستوى الصوت، صوت المرشد روبو، اللغة، أو أعد تشغيل المهمة'
                    )}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  soundManager.playClick();
                  onClose();
                }}
                className="p-2.5 rounded-2xl bg-slate-800/90 hover:bg-rose-600 text-slate-200 hover:text-white border-2 border-slate-600 transition-all active:scale-90 cursor-pointer"
                aria-label={tr(language, 'Close Settings', 'إغلاق الإعدادات')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              {/* 0. JURY DEMO MODE: UNLOCK ALL 4 NODES / 14 STATIONS */}
              <div className="p-4 rounded-3xl bg-gradient-to-br from-emerald-950/90 via-cyan-950/85 to-slate-950 border-2 border-amber-400/80 shadow-[0_0_24px_rgba(251,191,36,0.22)] space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-hud font-black text-sm sm:text-base text-amber-300 flex items-center gap-2">
                      <Rocket className="w-5 h-5 text-emerald-300 shrink-0" />
                      <span>
                        {tr(
                          language,
                          '🚀 Jury Demo Mode: Unlock All 4 Nodes (14 Stations)',
                          '🚀 وضع لجنة التحكيم: فتح كل المراحل (14 محطة)'
                        )}
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-200 font-bold mt-1 leading-relaxed">
                      {tr(
                        language,
                        'Unlocks all 4 space mission nodes, 14 guided stations, and pre-equips lunar gear & samples for immediate judging.',
                        'يفتح المحطات الفضائية الـ 4 وجميع المحطات التفاعلية الـ 14 مع تجهيز أدوات وعينات القمر للتجربة الفورية.'
                      )}
                    </p>
                  </div>

                  <button
                    type="button"
                    data-testid="unlock-all-demo-btn"
                    onClick={handleUnlockAllDemo}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-emerald-400 hover:brightness-110 text-slate-950 font-hud font-black text-xs sm:text-sm border-2 border-white shadow-lg active:scale-95 transition-all shrink-0 cursor-pointer"
                  >
                    {tr(language, 'Unlock All Levels 🔓', 'فتح كل المراحل للتجربة 🔓')}
                  </button>
                </div>

                {(demoUnlockNotice || isAllDemoUnlocked) && (
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-emerald-500/30">
                    <span
                      data-testid="demo-unlocked-badge"
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-200 font-hud font-black text-xs"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                      <span>
                        {tr(language, '✓ All Levels Unlocked for Demo', '✓ تم فتح جميع المستويات للتجربة')}
                      </span>
                    </span>

                    <button
                      type="button"
                      data-testid="reset-to-level1-btn"
                      onClick={handleResetToLevelOne}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-700 text-rose-200 hover:text-white font-hud font-bold text-[11px] border border-rose-400/50 transition-all cursor-pointer"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>{tr(language, 'Reset to Level 1', 'إعادة التقدم للمستوى 1')}</span>
                    </button>
                  </div>
                )}
              </div>

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
                        {tr(language, 'Sound Effects Volume', 'مستوى المؤثرات الصوتية')}
                      </h3>
                      <p className="text-[11px] text-slate-300 font-bold">
                        {tr(
                          language,
                          'Adjust rocket ignition, chimes, and alert effects',
                          'تحكم في قوة أصوات الصواريخ والأزرار والتنبيهات'
                        )}
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
                    {state.soundEnabled
                      ? tr(language, 'Sound On 🔊', 'الصوت مفعل 🔊')
                      : tr(language, 'Muted 🔇', 'مكتوم 🔇')}
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

              {/* 1B. BACKGROUND MUSIC (BGM) */}
              <div className="p-4 rounded-3xl bg-space-950/90 border-2 border-emerald-500/40 shadow-inner">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-2.5 rounded-2xl border ${
                      bgmEnabled && bgmVolume > 0
                        ? 'bg-emerald-950 border-emerald-400 text-emerald-300'
                        : 'bg-rose-950 border-rose-500 text-rose-300'
                    }`}>
                      <Music className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-hud font-black text-sm sm:text-base text-white">
                        {tr(language, 'Ambient Space Music', 'موسيقى الفضاء الحالمة')}
                      </h3>
                      <p className="text-[11px] text-slate-300 font-bold">
                        {tr(
                          language,
                          'Calm cosmic soundtrack while exploring missions',
                          'ألحان هادئة ومريحة تساعد على التركيز والاستكشاف'
                        )}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleToggleBgm}
                    className={`px-4 py-2 rounded-2xl text-xs font-black border-2 transition-all active:scale-95 ${
                      bgmEnabled
                        ? 'bg-emerald-500 text-space-950 border-emerald-200 shadow-lg shadow-emerald-500/30'
                        : 'bg-rose-900/90 text-rose-200 border-rose-400'
                    }`}
                  >
                    {bgmEnabled
                      ? tr(language, 'Music On 🎵', 'الموسيقى مفعلة 🎵')
                      : tr(language, 'Muted 🔇', 'مكتومة 🔇')}
                  </button>
                </div>

                {/* BGM Slider */}
                <div className="flex items-center gap-3 pt-1">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={bgmEnabled ? bgmVolume : 0}
                    onChange={(e) => handleBgmVolumeChange(Number(e.target.value))}
                    onMouseUp={() => soundManager.playClick()}
                    onTouchEnd={() => soundManager.playClick()}
                    className="w-full h-3 bg-space-800 rounded-xl appearance-none cursor-pointer accent-emerald-400"
                  />
                  <span className="min-w-[48px] text-center font-hud font-black text-xs px-2 py-1 rounded-xl bg-emerald-950 border border-emerald-500/40 text-emerald-300">
                    {bgmEnabled ? `${bgmVolume}%` : '0%'}
                  </span>
                </div>
              </div>

              {/* 1C. REPLAY INTRODUCTION TUTORIAL */}
              <div className="p-3.5 rounded-3xl bg-space-950/90 border-2 border-sky-400/30 shadow-inner flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-sky-950 border border-sky-400 text-sky-300">
                    <PlayCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-hud font-bold text-xs sm:text-sm text-white">
                      {tr(language, 'Replay Voice Briefing', 'إعادة سماع الترحيب والتعليمات')}
                    </h4>
                    <p className="text-[10px] text-slate-300 font-bold">
                      {tr(
                        language,
                        'Hear Companion Robo introduce the mission again',
                        'استمع إلى روبو يشرح لك خطوات المغامرة من جديد'
                      )}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleReplayIntroduction}
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-black text-xs border border-sky-300 shadow-md active:scale-95 transition-all shrink-0"
                >
                  {tr(language, 'Play Intro 🔊', 'استمع الآن 🔊')}
                </button>
              </div>

              {/* 2. ROBO VOICE TOGGLE */}
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
                      <span>{tr(language, 'Interactive Robo Voice', 'صوت المرشد روبو التفاعلي')}</span>
                    </h3>
                    <p className="text-[11px] text-slate-300 font-bold">
                      {tr(
                        language,
                        'Enable or mute voice hints and mission announcements',
                        'تشغيل أو إيقاف الشرح الصوتي باللهجة المصرية المحببة للأطفال'
                      )}
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
                  {roboVoiceEnabled
                    ? tr(language, 'Robo Voice: On 🤖🔊', 'صوت روبو: يعمل 🤖🔊')
                    : tr(language, 'Robo Voice: Off 🔕', 'صوت روبو: متوقف 🔕')}
                </button>
              </div>

              {/* 3. LANGUAGE SELECTOR (STRICT EN VS AR ISOLATION) */}
              <div className="p-4 rounded-3xl bg-space-950/90 border-2 border-purple-400/40 shadow-inner flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-purple-950 border border-purple-400 text-purple-300">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-hud font-black text-sm sm:text-base text-white">
                      {tr(language, 'Interface Language', 'لغة واجهة اللعبة')}
                    </h3>
                    <p className="text-[11px] text-slate-300 font-bold">
                      {tr(
                        language,
                        'Switch instantly between Global English and Arabic',
                        'اختر اللغة المفضلة لعرض القوائم واتجاه الشاشة'
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto bg-space-900 p-1.5 rounded-2xl border border-purple-500/40">
                  <button
                    type="button"
                    onClick={() => handleLanguageChange('en')}
                    className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      language === 'en'
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {tr(language, 'English 🌍', 'الإنجليزية 🌍')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLanguageChange('ar')}
                    className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      language === 'ar'
                        ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {tr(language, 'Arabic 🇪🇬', 'العربية 🇪🇬')}
                  </button>
                </div>
              </div>

              {/* 4. CADET PROFILE NAME & AGE GROUP */}
              <div className="p-4 rounded-3xl bg-space-950/90 border-2 border-emerald-500/30 shadow-inner space-y-3">
                <div className="flex items-center gap-2.5">
                  <UserCheck className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-hud font-black text-sm text-white">
                    {tr(language, 'Cadet Profile & Hint Complexity', 'ملف رائد الفضاء والفئة العمرية')}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={cadetInput}
                    onChange={(e) => setCadetInput(e.target.value)}
                    maxLength={22}
                    placeholder={tr(language, 'Cadet Name...', 'اكتب اسمك هنا يا بطل...')}
                    className="flex-1 bg-space-900 border-2 border-space-700 focus:border-emerald-400 rounded-2xl px-3.5 py-2 text-xs sm:text-sm text-white font-bold outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleSaveCadetName}
                    className="px-4 py-2 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-space-950 font-black text-xs shadow-md active:scale-95 transition-all cursor-pointer"
                  >
                    {tr(language, 'Save ✅', 'حفظ الاسم ✅')}
                  </button>
                </div>
                <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
                  <span className="text-[11px] font-bold text-slate-300">
                    {tr(language, 'Age Group (adapts hint simplicity):', 'الفئة العمرية (لتبسيط الشرح):')}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {(['7-10', '11-14', '15+'] as CadetAgeGroup[]).map((ag) => (
                      <button
                        key={ag}
                        type="button"
                        onClick={() => {
                          soundManager.playClick();
                          setAgeGroup(ag);
                        }}
                        className={`px-3 py-1 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                          ageGroup === ag
                            ? 'bg-emerald-400 text-slate-950 border-white'
                            : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-emerald-400'
                        }`}
                      >
                        {ag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 4B. QUICK RE-LOCK / RESET DEMO PROGRESSION NOTE */}

              {/* 5. RESET GAME (CLEAR LOCALSTORAGE & RESTART FROM LEVEL 1) */}
              <div className="p-4 rounded-3xl bg-rose-950/50 border-2 border-rose-500/50 shadow-inner">
                {/* Safe Recovery Status Banners */}
                {storageStatus === 'CORRUPT_SAVE' && (
                  <div className="mb-3.5 p-3 rounded-2xl bg-amber-950/80 border-2 border-amber-500 text-amber-200 text-xs font-bold flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-hud font-black text-amber-300">
                        {tr(
                          language,
                          'Warning: Previous progress file could not be read',
                          'تنبيه: تعذر قراءة ملف التقدم السابق'
                        )}
                      </p>
                      <p className="text-[11px] text-amber-200/90 leading-relaxed font-bold">
                        {tr(
                          language,
                          'Auto-save paused to protect your data. Continue playing or use Reset Progress below.',
                          'تم إيقاف الحفظ التلقائي لحماية بياناتك الأصلية. يمكنك الاستمرار في اللعب، أو استخدام زر إعادة بدء المهمة أدناه.'
                        )}
                      </p>
                    </div>
                  </div>
                )}

                {storageStatus === 'FUTURE_SAVE' && (
                  <div className="mb-3.5 p-3 rounded-2xl bg-cyan-950/80 border-2 border-cyan-400 text-cyan-200 text-xs font-bold flex items-start gap-2.5">
                    <Info className="w-5 h-5 text-cyan-300 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-hud font-black text-cyan-300">
                        {tr(
                          language,
                          'Info: Save file from a newer engine version detected',
                          'معلومة: تم اكتشاف ملف حفظ من إصدار مستقبلي أحدث'
                        )}
                      </p>
                      <p className="text-[11px] text-cyan-200/90 leading-relaxed font-bold">
                        {tr(
                          language,
                          'Auto-save disabled to protect newer progress; play freely this session.',
                          'تم إيقاف الحفظ التلقائي لمنع الكتابة فوق تقدمك من الإصدار الأحدث. يمكنك اللعب بشكل طبيعي في هذه الجلسة.'
                        )}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-hud font-black text-sm sm:text-base text-rose-200 flex items-center gap-2">
                      <RotateCcw className="w-4 h-4 text-rose-400" />
                      <span>{tr(language, 'Reset All Progress', 'إعادة ضبط اللعبة بالكامل')}</span>
                    </h3>
                    <p className="text-[11px] text-rose-200/80 font-bold mt-0.5">
                      {tr(
                        language,
                        'Clear saved memory and start fresh from Level 1',
                        'مسح الذاكرة المحفوظة والبدء من جديد من المرحلة الأولى'
                      )}
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
                      {tr(language, 'Reset Progress 🔄', 'إعادة بدء المهمة 🔄')}
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={handleFullReset}
                        className="flex-1 sm:flex-initial px-4 py-2 rounded-2xl bg-red-500 hover:bg-red-400 text-white font-black text-xs border-2 border-yellow-300 animate-pulse"
                      >
                        {tr(language, 'Confirm Reset! ⚠️', 'تأكيد المسح والبدء! ⚠️')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmReset(false)}
                        className="px-3 py-2 rounded-2xl bg-slate-800 text-slate-300 text-xs font-bold"
                      >
                        {tr(language, 'Cancel', 'إلغاء')}
                      </button>
                    </div>
                  )}
                </div>

                {resetNotice && (
                  <div className="mt-3 p-2.5 rounded-2xl bg-emerald-950 border border-emerald-400 text-emerald-300 text-xs font-black flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {tr(
                        language,
                        'Progress cleared and reset to Level 1!',
                        'تم مسح الذاكرة وإعادة اللعبة للمستوى الأول بنجاح!'
                      )}
                    </span>
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
                className="w-full sm:w-auto px-8 py-3 rounded-2xl bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 text-space-950 font-hud font-black text-sm shadow-xl shadow-cyan-500/30 border-2 border-cyan-100 active:scale-95 transition-all cursor-pointer"
              >
                {tr(language, 'Save & Return to Mission 🚀', 'حفظ والعودة للمهمة 🚀')}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
