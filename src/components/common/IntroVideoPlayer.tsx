import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Rocket, Volume2, Sparkles, Film, FastForward } from 'lucide-react';
import { soundManager } from '../../utils/sound';
import { dialogueManager } from '../../utils/geminiTTS';

interface IntroVideoPlayerProps {
  onComplete: () => void;
}

export const IntroVideoPlayer: React.FC<IntroVideoPlayerProps> = ({ onComplete }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showVideoPlayer, setShowVideoPlayer] = useState<boolean>(false);

  // Instant 0ms synchronous dismissal: zero waiting for 16.5 MB video or network TTS audio
  const handleInstantStart = () => {
    try {
      sessionStorage.setItem('astronutri_intro_played', 'true');
    } catch {
      // Ignore storage errors in private mode
    }

    // Complete immediately so mobile users enter the 3D world with 0ms delay
    onComplete();

    // Trigger optional audio feedback asynchronously with strict non-blocking timeout
    window.setTimeout(() => {
      try {
        soundManager.playFanfare();
      } catch {
        // Ignore un-unlocked audio context on restricted browsers
      }
      void Promise.race([
        dialogueManager.speak('مرحباً بك في أكاديمية أسترونوتري! انطلق للمغامرة!'),
        new Promise<void>((resolve) => setTimeout(resolve, 1500))
      ]).catch(() => {});
    }, 0);
  };

  const handleOpenOptionalVideo = () => {
    try {
      soundManager.playClick();
    } catch {
      // Ignore sound errors
    }
    setShowVideoPlayer(true);
    window.setTimeout(() => {
      const video = videoRef.current;
      if (video) {
        video.muted = false;
        void video.play().catch(() => {
          // Video playback remains optional; user can skip anytime
        });
      }
    }, 30);
  };

  const handleVideoEnded = () => {
    try {
      soundManager.playFanfare();
    } catch {
      // Ignore sound errors
    }
    onComplete();
  };

  return (
    <div
      data-testid="intro-welcome-screen"
      className="fixed inset-0 z-50 bg-gradient-to-b from-indigo-950 via-sky-950 to-slate-950 flex flex-col items-center justify-between py-4 px-3 sm:py-6 sm:px-6 overflow-y-auto overflow-x-hidden select-none"
      dir="rtl"
    >
      {/* Lightweight Cosmic Backdrop */}
      <div className="fixed inset-0 space-stars opacity-90 pointer-events-none" />
      <div className="fixed -top-24 -left-24 w-72 h-72 rounded-full bg-cyan-500/20 blur-3xl pointer-events-none" />
      <div className="fixed -bottom-24 -right-24 w-80 h-80 rounded-full bg-amber-500/20 blur-3xl pointer-events-none" />

      {/* Top Floating AstroNutri Title Banner */}
      <motion.div
        initial={{ y: -16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.25 }}
        className="relative z-10 flex flex-col items-center gap-1.5 text-center shrink-0"
      >
        <div className="inline-flex items-center gap-2 px-4 py-1.5 sm:px-6 sm:py-2 rounded-full bg-gradient-to-r from-sky-500/35 via-indigo-600/45 to-purple-600/35 border-2 border-cyan-300/80 shadow-[0_8px_25px_rgba(6,182,212,0.4)] backdrop-blur-md">
          <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-300" />
          <span className="font-hud font-black text-sm sm:text-xl text-white tracking-wide">
            AstroNutri • أكاديمية روبو الفضائية
          </span>
          <span className="text-lg sm:text-2xl">🚀</span>
        </div>
        <span className="md:hidden font-hud font-bold text-xs text-cyan-200 bg-slate-900/70 px-3 py-0.5 rounded-full border border-cyan-400/40">
          مغامرة ناسا التعليمية لرواد الفضاء الصغار ✨
        </span>
      </motion.div>

      {/* Center Welcome Card OR Optional On-Demand Video Player */}
      <div className="relative z-10 w-full max-w-2xl my-auto flex items-center justify-center px-1 sm:px-4 py-3">
        {showVideoPlayer ? (
          <div className="w-full flex flex-col items-center gap-4">
            <div className="relative w-full aspect-video max-h-[56vh] rounded-3xl border-4 border-cyan-300/90 bg-slate-950 shadow-[0_0_55px_rgba(34,211,238,0.45)] overflow-hidden flex items-center justify-center">
              <video
                ref={videoRef}
                src="/video/intro_video.mp4"
                className="w-full h-full object-contain"
                playsInline
                controls
                preload="metadata"
                onEnded={handleVideoEnded}
                onError={handleInstantStart}
              />
            </div>

            <button
              type="button"
              data-testid="skip-video-enter-btn"
              onClick={handleInstantStart}
              className="btn-chunky-adventure px-8 py-3.5 text-lg sm:text-xl flex items-center gap-2.5 shadow-[0_10px_30px_rgba(255,159,28,0.6)] cursor-pointer touch-manipulation active:scale-95 transition-transform"
            >
              <FastForward className="w-5 h-5" />
              <span>ابدأ المغامرة الآن</span>
              <span>🚀</span>
            </button>
          </div>
        ) : (
          <div className="w-full max-w-md p-6 sm:p-8 rounded-[2rem] bg-gradient-to-b from-sky-900/95 via-indigo-950/95 to-slate-950/95 border-4 border-cyan-300 shadow-[0_0_55px_rgba(34,211,238,0.5)] flex flex-col items-center text-center gap-5">
            <div className="relative flex items-center justify-center">
              <div className="w-24 h-24 rounded-full bg-cyan-400/20 border-3 border-cyan-300 flex items-center justify-center shadow-lg">
                <img
                  src="/assets/ui/astro_badge.svg"
                  alt="شعار أسترونوتري"
                  className="w-16 h-16 object-contain drop-shadow"
                />
              </div>
              <span className="absolute -bottom-1 -left-2 w-10 h-10 rounded-full bg-amber-400 border-2 border-white flex items-center justify-center shadow-md">
                <Rocket className="w-5 h-5 text-slate-950" />
              </span>
            </div>

            <div>
              <h1 className="font-hud font-black text-2xl sm:text-3xl text-white">
                مرحباً بك في أكاديمية ناسا الفضائية! 🌌
              </h1>
              <p className="font-hud font-bold text-sm sm:text-base text-cyan-100 mt-2 leading-relaxed">
                استكشف جزر الفضاء ثلاثية الأبعاد، صمّم بدلة SPACE-FIT X، وجهّز أكلات سيناء ومصر للبعثة القمرية!
              </p>
            </div>

            {/* Instant synchronous start button (0ms non-blocking on mobile & offline) */}
            <button
              type="button"
              data-testid="start-adventure-btn"
              onClick={handleInstantStart}
              className="w-full btn-chunky-adventure px-8 py-4 text-xl sm:text-2xl flex items-center justify-center gap-3 shadow-[0_10px_30px_rgba(255,159,28,0.65)] cursor-pointer touch-manipulation active:scale-95 transition-transform"
            >
              <span>ابدأ المغامرة</span>
              <Volume2 className="w-6 h-6" />
              <span className="text-2xl">🚀</span>
            </button>

            {/* Optional Heavy MP4 Video Loader (Never blocks app entry) */}
            <button
              type="button"
              data-testid="watch-intro-video-btn"
              onClick={handleOpenOptionalVideo}
              className="w-full py-2.5 px-4 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border-2 border-cyan-400/50 text-cyan-200 font-hud font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer touch-manipulation active:scale-95 transition-all"
            >
              <Film className="w-4 h-4 text-amber-300" />
              <span>شاهد الفيديو التعريفي (اختياري)</span>
            </button>
          </div>
        )}
      </div>

      {/* Bottom Cosmic Mascot Cheering Pill */}
      <div className="relative z-10 flex items-center justify-center shrink-0 w-full max-w-md pb-1">
        <div className="flex items-center gap-3 bg-slate-900/85 border-2 border-amber-300/70 rounded-full px-4 py-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.45)]">
          <img
            src="/assets/generated/characters/robo_chibi_sprite.png"
            alt="روبو يشجعك"
            className="w-9 h-9 sm:w-11 sm:h-11 object-contain drop-shadow"
          />
          <div className="text-right">
            <p className="font-hud font-black text-xs sm:text-sm text-amber-200">
              الكابتن روبو جاهز للعد التنازلي! 🤖
            </p>
            <p className="font-hud font-bold text-[11px] text-cyan-200">
              دخول فوري للأرخبيل الكوني ثلاثي الأبعاد 🌍🌙
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
