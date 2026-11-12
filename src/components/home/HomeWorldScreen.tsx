import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useGameState } from '../../context/GameContext';
import { soundManager } from '../../utils/sound';
import { dialogueManager } from '../../utils/geminiTTS';
import { RoboCharacter, RoboPose } from '../common/RoboCharacter';
import { CartoonSpaceship } from '../common/CartoonSpaceship';
import { SettingsMenu } from '../common/SettingsMenu';
import { Star, Settings, Volume2, VolumeX } from 'lucide-react';

const WELCOME_DIALOGUE =
  'جاهز للمغامرة يا بطل؟ يلا بينا نطير لحديقة التغذية الفضائية ونستكشف أسرار طعام رواد الفضاء!';

export const HomeWorldScreen: React.FC = () => {
  const { state, setLocation } = useGameState();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [roboPose, setRoboPose] = useState<RoboPose>('WAVE');
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Subscribe to DialogueManager audio playback status
  useEffect(() => {
    const unsub = dialogueManager.subscribeStatus(({ isSpeaking }) => {
      setIsAudioPlaying(isSpeaking);
      if (isSpeaking) {
        setRoboPose('TALKING');
      } else {
        setRoboPose('WAVE');
      }
    });
    return () => unsub();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      dialogueManager.stop();
    };
  }, []);

  // Subtle 2.5D mouse parallax movement
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const offsetX = (e.clientX - centerX) / (rect.width / 2);
    const offsetY = (e.clientY - centerY) / (rect.height / 2);
    setMouseOffset({ x: offsetX * 12, y: offsetY * 8 });
  };

  const handleSpeakWelcome = () => {
    if (isAudioPlaying) {
      dialogueManager.stop();
    } else {
      soundManager.playClick();
      void dialogueManager.speak(WELCOME_DIALOGUE);
    }
  };

  const handleStartAdventure = () => {
    dialogueManager.stop();
    soundManager.playFanfare();
    setRoboPose('CELEBRATING');

    // Smooth delay for celebratory reaction before route transition
    window.setTimeout(() => {
      setLocation('NutritionLab');
    }, 450);
  };

  // Calculate player stars score
  const completedMissionsCount = [
    state.isNutritionMissionComplete,
    state.isSuitMissionComplete,
    state.engineCoreState.isEngineComplete,
    state.launchPadState.isLevel1Complete
  ].filter(Boolean).length;
  const totalStarsScore = 250 + completedMissionsCount * 50 + state.cargoItems.length * 25;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative flex-1 min-h-[calc(100vh-1rem)] flex flex-col justify-between overflow-hidden select-none px-4 py-3 sm:px-8 sm:py-6"
      style={{
        background:
          'radial-gradient(ellipse at 50% 25%, #222d4f 0%, #131a31 50%, #0d1326 100%)'
      }}
    >
      {/* =====================================================================
          LAYER 1: CELESTIAL BACKGROUND & DISTANT ARCHIPELAGO PARALLAX
          ===================================================================== */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {/* Pastel Drifting Nebulae */}
        <motion.div
          animate={{
            x: [0, 25, 0],
            y: [0, -18, 0],
            scale: [1, 1.06, 1]
          }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-16 -right-20 w-[550px] h-[480px] rounded-full blur-[65px] opacity-25"
          style={{
            background:
              'radial-gradient(circle, #C9B8FF 0%, #8DE8F4 50%, transparent 75%)'
          }}
        />

        <motion.div
          animate={{
            x: [0, -30, 0],
            y: [0, 22, 0],
            scale: [1, 1.08, 1]
          }}
          transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -bottom-24 -left-20 w-[600px] h-[450px] rounded-full blur-[70px] opacity-20"
          style={{
            background:
              'radial-gradient(circle, #FFC3D8 0%, #A9C9FF 60%, transparent 80%)'
          }}
        />

        {/* Twinkling Cartoon Stars */}
        <div className="absolute inset-0">
          {[
            { top: '12%', left: '15%', size: 'w-2 h-2', delay: 0 },
            { top: '22%', left: '82%', size: 'w-3 h-3', delay: 1.2 },
            { top: '35%', left: '28%', size: 'w-2.5 h-2.5', delay: 0.6 },
            { top: '48%', left: '74%', size: 'w-2 h-2', delay: 2.1 },
            { top: '65%', left: '12%', size: 'w-3 h-3', delay: 1.5 },
            { top: '18%', left: '48%', size: 'w-2 h-2', delay: 0.9 },
            { top: '55%', left: '88%', size: 'w-2.5 h-2.5', delay: 2.7 }
          ].map((star, idx) => (
            <motion.div
              key={idx}
              animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.25, 0.8] }}
              transition={{
                duration: 2.8 + (idx % 3),
                repeat: Infinity,
                delay: star.delay,
                ease: 'easeInOut'
              }}
              className={`absolute ${star.size} rounded-full bg-pastel-yellow shadow-[0_0_8px_#FFE69A]`}
              style={{ top: star.top, left: star.left }}
            />
          ))}
        </div>

        {/* Distant Islands Silhouettes (Observatory & Launch Gantry) */}
        <motion.svg
          animate={{
            x: mouseOffset.x * 0.4,
            y: mouseOffset.y * 0.4
          }}
          transition={{ type: 'spring', damping: 25, stiffness: 120 }}
          className="absolute top-12 inset-x-0 mx-auto w-full max-w-5xl opacity-45 drop-shadow-[0_12px_24px_rgba(0,0,0,0.4)]"
          viewBox="0 0 1000 260"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Distant Island: Cosmic Observatory (Left) */}
          <g transform="translate(110, 45) scale(0.65)">
            <ellipse cx="100" cy="80" rx="90" ry="34" fill="#29355A" />
            <path d="M40 80 Q100 135 160 80 Z" fill="#1C2541" />
            <circle
              cx="100"
              cy="48"
              r="30"
              fill="#8DE8F4"
              fillOpacity="0.45"
              stroke="#A9C9FF"
              strokeWidth="3"
            />
            <line
              x1="85"
              y1="34"
              x2="135"
              y2="14"
              stroke="#FFE69A"
              strokeWidth="5"
              strokeLinecap="round"
            />
          </g>

          {/* Distant Island: Launch Pad Gantry (Right) */}
          <g transform="translate(770, 30) scale(0.6)">
            <ellipse cx="100" cy="80" rx="95" ry="38" fill="#29355A" />
            <rect
              x="90"
              y="20"
              width="20"
              height="60"
              fill="#C9B8FF"
              fillOpacity="0.5"
            />
            <polygon points="100,6 85,26 115,26" fill="#FFC3D8" />
          </g>
        </motion.svg>
      </div>

      {/* =====================================================================
          LAYER 2: TOP HUD BAR (Player Profile & Stars & Settings)
          ===================================================================== */}
      <header className="relative z-30 w-full max-w-6xl mx-auto flex items-center justify-between gap-3">
        {/* Player Cadet Profile Pill */}
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          className="pastel-glass-panel flex items-center gap-2.5 sm:gap-3.5 px-3 py-1.5 sm:px-4 sm:py-2"
          dir="rtl"
        >
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-gradient-to-tr from-pastel-yellow via-pastel-pink to-pastel-sky border-2 border-white flex items-center justify-center text-lg sm:text-xl shadow-sm">
            👨‍🚀
          </div>
          <div className="flex flex-col text-right">
            <span className="font-hud font-black text-xs sm:text-sm text-pastel-white">
              {state.cadetName
                ? state.cadetName.startsWith('البطل')
                  ? state.cadetName
                  : `البطل ${state.cadetName}`
                : 'البطل الصغير'}
            </span>
            <span className="font-hud text-[10px] sm:text-xs text-pastel-cyan font-bold">
              رائد فضاء ناشئ • المستوى 1
            </span>
          </div>
        </motion.div>

        {/* Score & Settings Actions */}
        <div className="flex items-center gap-2.5 sm:gap-4">
          {/* Star Counter Pill */}
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="pastel-glass-panel flex items-center gap-2 px-3.5 py-1.5 sm:px-5 sm:py-2 text-pastel-yellow font-hud font-black text-sm sm:text-lg"
          >
            <Star className="w-5 h-5 sm:w-6 sm:h-6 fill-pastel-yellow drop-shadow-[0_0_8px_#FFE69A]" />
            <span className="tracking-wide">{totalStarsScore}</span>
            <span className="hidden sm:inline text-xs text-pastel-white/80 font-bold">
              نجمة
            </span>
          </motion.div>

          {/* Child-Friendly Settings Button */}
          <motion.button
            type="button"
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            whileHover={{ scale: 1.08, rotate: 20 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => {
              soundManager.playClick();
              setIsSettingsOpen(true);
            }}
            className="pastel-glass-panel-interactive w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center text-pastel-cyan"
            aria-label="إعدادات اللعبة والصوت"
          >
            <Settings className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
          </motion.button>
        </div>
      </header>

      {/* =====================================================================
          LAYER 3: CENTERPIECE 2.5D FLOATING ISLAND WITH GROUNDED ROBO & SPACESHIP
          ===================================================================== */}
      <main className="relative z-20 flex-1 flex flex-col items-center justify-center my-auto w-full max-w-5xl mx-auto py-2">
        <div className="relative w-full max-w-[620px] aspect-[16/11] flex items-center justify-center">
          {/* Main Floating Launchpad Island SVG */}
          <motion.div
            animate={{
              y: [0, -10, 0],
              x: mouseOffset.x * 0.6
            }}
            transition={{
              y: { duration: 5.5, repeat: Infinity, ease: 'easeInOut' },
              x: { type: 'spring', damping: 30, stiffness: 100 }
            }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <svg
              className="w-full h-full filter drop-shadow-[0_24px_45px_rgba(0,0,0,0.65)]"
              viewBox="0 0 600 280"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient
                  id="islandRockGrad"
                  x1="300"
                  y1="105"
                  x2="300"
                  y2="265"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="0%" stopColor="#3C4B75" />
                  <stop offset="55%" stopColor="#253150" />
                  <stop offset="100%" stopColor="#12192E" />
                </linearGradient>

                <linearGradient
                  id="mossGrassGrad"
                  x1="60"
                  y1="85"
                  x2="540"
                  y2="135"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="0%" stopColor="#7AE582" />
                  <stop offset="48%" stopColor="#8DE8F4" />
                  <stop offset="100%" stopColor="#A9C9FF" />
                </linearGradient>
              </defs>

              {/* Rocky Base Underneath */}
              <path
                d="M70,105 Q125,250 300,262 Q475,250 530,105 Q400,122 300,122 Q200,122 70,105 Z"
                fill="url(#islandRockGrad)"
                stroke="#1E293B"
                strokeWidth="4"
                strokeLinejoin="round"
              />

              {/* Island Surface / Moss Grass Top */}
              <ellipse
                cx="300"
                cy="105"
                rx="230"
                ry="36"
                fill="url(#mossGrassGrad)"
                stroke="#1E293B"
                strokeWidth="4"
              />

              {/* Tech Launch Pad Platform Rings */}
              <ellipse
                cx="300"
                cy="105"
                rx="160"
                ry="22"
                fill="rgba(255, 255, 255, 0.22)"
                stroke="#FFFFFF"
                strokeWidth="2.5"
                strokeDasharray="9 7"
              />
              <ellipse
                cx="300"
                cy="105"
                rx="105"
                ry="14"
                fill="rgba(141, 232, 244, 0.35)"
              />

              {/* Soft Runway Beacon Lights */}
              <circle
                cx="155"
                cy="98"
                r="4.5"
                fill="#FFE69A"
                className="animate-pulse"
              />
              <circle
                cx="445"
                cy="98"
                r="4.5"
                fill="#FFE69A"
                className="animate-pulse"
              />
            </svg>

            {/* DOCKED CARTOON SPACESHIP (Grounded on left side of platform) */}
            <div className="absolute left-[14%] bottom-[34%] z-10 w-[24%] max-w-[135px]">
              <CartoonSpaceship
                size="100%"
                animated={true}
                interactive={true}
                showShadow={true}
                onClick={() => {
                  soundManager.playClick();
                }}
              />
            </div>

            {/* GROUNDED CANONICAL ROBO (Grounded on right side of platform) */}
            <div className="absolute right-[18%] bottom-[32%] z-20 w-[27%] max-w-[155px]">
              {/* Welcoming Speech Bubble */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{
                  type: 'spring',
                  damping: 18,
                  stiffness: 240,
                  delay: 0.3
                }}
                onClick={handleSpeakWelcome}
                dir="rtl"
                className="absolute -top-16 sm:-top-20 -right-4 sm:-right-8 cursor-pointer z-30 bg-white/95 backdrop-blur-md text-slate-900 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-2xl rounded-br-sm border-2 sm:border-3 border-pastel-cyan shadow-[0_10px_25px_rgba(0,0,0,0.35)] flex items-center gap-2 sm:gap-2.5 min-w-[210px] sm:min-w-[270px] hover:scale-105 active:scale-95 transition-transform"
                title="اضغط للاستماع إلى روبو"
              >
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                    isAudioPlaying
                      ? 'bg-pastel-cyan text-slate-950 animate-pulse'
                      : 'bg-pastel-sky/30 text-sky-800'
                  }`}
                >
                  {isAudioPlaying ? (
                    <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />
                  ) : (
                    <VolumeX className="w-4 h-4 sm:w-5 sm:h-5" />
                  )}
                </div>
                <div className="flex-1 text-right">
                  <span className="block text-[10px] sm:text-xs font-hud font-black text-sky-700">
                    روبو • مرشد الفضاء 🤖
                  </span>
                  <p className="font-hud font-bold text-xs sm:text-sm text-slate-900 leading-snug">
                    جاهز للمغامرة يا بطل؟ يلا بينا! 🚀
                  </p>
                </div>
              </motion.div>

              {/* The Canonical Vector Robo Component */}
              <RoboCharacter
                pose={roboPose}
                size="100%"
                animated={true}
                interactive={true}
                showShadow={true}
                onClick={handleSpeakWelcome}
              />
            </div>
          </motion.div>
        </div>

        {/* ===================================================================
            LAYER 4: THE ONE OBVIOUS ACTION BUTTON (CTA)
            =================================================================== */}
        <div className="relative z-30 flex flex-col items-center gap-2 sm:gap-3 mt-1 sm:mt-4">
          <motion.button
            type="button"
            onHoverStart={() => {
              setRoboPose('CELEBRATING');
            }}
            onHoverEnd={() => {
              if (!isAudioPlaying) setRoboPose('WAVE');
            }}
            onClick={handleStartAdventure}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="btn-chunky-adventure px-8 py-3.5 sm:px-14 sm:py-5 text-xl sm:text-3xl flex items-center gap-3 sm:gap-4 shadow-[0_12px_36px_rgba(255,159,28,0.55)] cursor-pointer"
            dir="rtl"
            aria-label="ابدأ المغامرة الفضائية"
          >
            <span>ابدأ المغامرة الفضائية</span>
            <span className="text-2xl sm:text-4xl filter drop-shadow">🚀</span>
          </motion.button>

          <p
            dir="rtl"
            className="text-center font-hud font-bold text-xs sm:text-sm text-pastel-sky/90 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
          >
            المحطة الأولى:{' '}
            <span className="text-pastel-cyan font-black">
              حديقة التغذية الفضائية
            </span>{' '}
            (مفتوحة وجاهزة للاستكشاف) 🍏
          </p>
        </div>
      </main>

      {/* Settings Modal (Self-contained) */}
      <SettingsMenu
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
};
export default HomeWorldScreen;
