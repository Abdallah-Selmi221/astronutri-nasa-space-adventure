import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Rocket, Volume2, Sparkles } from 'lucide-react';
import { soundManager } from '../../utils/sound';

interface IntroVideoPlayerProps {
  onComplete: () => void;
}

export const IntroVideoPlayer: React.FC<IntroVideoPlayerProps> = ({ onComplete }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [needsUserInteraction, setNeedsUserInteraction] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setIsPlaying(true);
          setNeedsUserInteraction(false);
        })
        .catch(() => {
          setNeedsUserInteraction(true);
        });
    }
  }, []);

  const handleStartPlay = () => {
    soundManager.playClick();
    const video = videoRef.current;
    if (video) {
      video.muted = false;
      video
        .play()
        .then(() => {
          setIsPlaying(true);
          setNeedsUserInteraction(false);
        })
        .catch(() => {
          onComplete();
        });
    } else {
      onComplete();
    }
  };

  const handleVideoEnded = () => {
    soundManager.playFanfare();
    onComplete();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-gradient-to-b from-indigo-950 via-sky-950 to-slate-950 flex flex-col items-center justify-between py-4 px-3 sm:py-6 sm:px-6 overflow-hidden select-none"
      dir="rtl"
    >
      {/* Rich Animated Cosmic Backdrop (Fills Top & Bottom cleanly on Mobile Portrait) */}
      <div className="absolute inset-0 space-stars opacity-90 pointer-events-none" />
      <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-cyan-500/20 blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-amber-500/20 blur-3xl pointer-events-none animate-pulse" />

      {/* Top Floating AstroNutri Title Banner (Prominent on Mobile Portrait, Compact on Desktop) */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="relative z-10 flex flex-col items-center gap-1.5 text-center shrink-0"
      >
        <div className="inline-flex items-center gap-2 px-4 py-1.5 sm:px-6 sm:py-2 rounded-full bg-gradient-to-r from-sky-500/35 via-indigo-600/45 to-purple-600/35 border-2 border-cyan-300/80 shadow-[0_8px_25px_rgba(6,182,212,0.4)] backdrop-blur-md">
          <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-300 animate-pulse" />
          <span className="font-hud font-black text-sm sm:text-xl text-white tracking-wide">
            AstroNutri • أكاديمية روبو الفضائية
          </span>
          <span className="text-lg sm:text-2xl">🚀</span>
        </div>
        <span className="md:hidden font-hud font-bold text-xs text-cyan-200 bg-slate-900/70 px-3 py-0.5 rounded-full border border-cyan-400/40">
          مغامرة ناسا التعليمية لرواد الفضاء الصغار ✨
        </span>
      </motion.div>

      {/* Center Glossy Cosmic Frame with Uncropped 16:9 Video */}
      <div className="relative z-10 w-full max-w-5xl my-auto flex items-center justify-center px-1 sm:px-4">
        <div className="relative w-full aspect-video max-h-[58vh] sm:max-h-[72vh] rounded-3xl border-4 border-cyan-300/90 bg-slate-950 shadow-[0_0_55px_rgba(34,211,238,0.45)] overflow-hidden flex items-center justify-center">
          {/* Corner glossy accents */}
          <div className="absolute inset-0 pointer-events-none rounded-[20px] ring-2 ring-inset ring-white/25 z-10" />

          {/* Unskippable video: full width visible without cropping */}
          <video
            ref={videoRef}
            src="/video/intro_video.mp4"
            className="w-full h-full object-contain pointer-events-none"
            playsInline
            controls={false}
            disablePictureInPicture
            onEnded={handleVideoEnded}
            onError={() => {
              console.warn('Video failed to load or play, continuing to game.');
              onComplete();
            }}
          />
        </div>
      </div>

      {/* Bottom Cosmic Mascot Cheering Band & Playing Badge */}
      <div className="relative z-10 flex flex-col sm:flex-row items-center justify-center gap-3 shrink-0 w-full max-w-2xl">
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          className="flex items-center gap-3 bg-slate-900/80 backdrop-blur-md border-2 border-amber-300/70 rounded-full px-4 py-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.45)]"
        >
          <img
            src="/assets/generated/characters/robo_chibi_sprite.png"
            alt="روبو يشجعك"
            className="w-10 h-10 sm:w-12 sm:h-12 object-contain drop-shadow"
          />
          <div className="text-right">
            <p className="font-hud font-black text-xs sm:text-sm text-amber-200">
              الكابتن روبو جاهز للعد التنازلي! 🤖
            </p>
            <p className="font-hud font-bold text-[11px] text-cyan-200">
              {isPlaying && !needsUserInteraction
                ? 'شاهد قصة المهمة كاملة للانطلاق نحو القمر 🌕'
                : 'اضغط للبدء بالصوت الكامل'}
            </p>
          </div>
        </motion.div>

        {isPlaying && !needsUserInteraction && (
          <div className="flex items-center gap-2 bg-cyan-950/85 border-2 border-cyan-400/60 px-3.5 py-1.5 rounded-full text-xs font-hud font-bold text-cyan-100 pointer-events-none shadow">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span>جاري تشغيل مقدمة المغامرة...</span>
          </div>
        )}
      </div>

      {/* Autoplay blocked fallback modal */}
      <AnimatePresence>
        {needsUserInteraction && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/85 backdrop-blur-md p-6 text-center z-20"
          >
            <div className="max-w-md p-7 sm:p-8 rounded-[2rem] bg-gradient-to-b from-sky-900/95 via-indigo-950/95 to-slate-950/95 border-4 border-cyan-300 shadow-[0_0_55px_rgba(34,211,238,0.55)] flex flex-col items-center gap-5">
              <div className="w-20 h-20 rounded-full bg-cyan-400/20 border-3 border-cyan-300 flex items-center justify-center animate-bounce shadow-lg">
                <Rocket className="w-10 h-10 text-amber-300" />
              </div>

              <div>
                <h2 className="font-hud font-black text-2xl sm:text-3xl text-white">
                  مرحباً بك في أكاديمية ناسا الفضائية! 🌌
                </h2>
                <p className="font-hud font-bold text-sm sm:text-base text-cyan-100 mt-2 leading-relaxed">
                  اضغط على الزر لتشغيل قصة المغامرة بصوت روبو والانطلاق إلى الأرخبيل الكوني!
                </p>
              </div>

              <motion.button
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleStartPlay}
                className="btn-chunky-adventure px-8 py-3.5 text-xl flex items-center gap-3 shadow-[0_10px_30px_rgba(255,159,28,0.6)] cursor-pointer"
              >
                <span>ابدأ المغامرة</span>
                <Volume2 className="w-6 h-6" />
                <span className="text-2xl">🚀</span>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
