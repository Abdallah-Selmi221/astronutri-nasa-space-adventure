import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { soundManager } from '../../utils/sound';
import { dialogueManager } from '../../utils/geminiTTS';
import { CheckCircle2, RotateCcw } from 'lucide-react';

interface SuitPart {
  id: 'helmet' | 'gloves' | 'o2pack';
  nameAr: string;
  icon: string;
  slotNameAr: string;
  color: string;
}

const SUIT_PARTS: SuitPart[] = [
  { id: 'helmet', nameAr: 'خوذة الذهب العاكسة للأشعة', icon: '⛑️', slotNameAr: 'موضع الرأس والخوذة', color: 'from-amber-400 to-yellow-500' },
  { id: 'gloves', nameAr: 'قفازات الضغط الحراري', icon: '🧤', slotNameAr: 'موضع اليدين والقفازات', color: 'from-sky-400 to-blue-500' },
  { id: 'o2pack', nameAr: 'حقيبة الأكسجين والضغط 4.3 PSI', icon: '🎒', slotNameAr: 'موضع الظهر ودعم الحياة', color: 'from-emerald-400 to-teal-500' }
];

interface SuitPrepProps {
  onComplete?: () => void;
}

export const SuitPrep: React.FC<SuitPrepProps> = ({ onComplete }) => {
  const [attachedParts, setAttachedParts] = useState<{
    helmet: boolean;
    gloves: boolean;
    o2pack: boolean;
  }>({
    helmet: false,
    gloves: false,
    o2pack: false
  });

  const [draggedPartId, setDraggedPartId] = useState<string | null>(null);
  const [activeToast, setActiveToast] = useState<string | null>(null);

  const isAllAttached = attachedParts.helmet && attachedParts.gloves && attachedParts.o2pack;

  const handleSnapPart = (partId: 'helmet' | 'gloves' | 'o2pack') => {
    if (attachedParts[partId]) return;

    soundManager.playDropSuccess();
    setAttachedParts((prev) => {
      const next = { ...prev, [partId]: true };
      const allDone = next.helmet && next.gloves && next.o2pack;
      if (allDone) {
        soundManager.playFanfare();
        void dialogueManager.speak('البدلة الفضائية جاهزة ومحكمة 100%! ضغط الأكسجين 4.3 PSI آمن تماماً! 🚀');
        if (onComplete) onComplete();
      }
      return next;
    });

    setActiveToast(`تم تثبيت ${partId === 'helmet' ? 'الخوذة' : partId === 'gloves' ? 'القفازات' : 'حقيبة الأكسجين'} بنجاح! ✅`);
    setTimeout(() => setActiveToast(null), 2000);
  };

  const handleReset = () => {
    soundManager.playClick();
    setAttachedParts({ helmet: false, gloves: false, o2pack: false });
    setActiveToast(null);
  };

  return (
    <div
      className="relative w-full max-w-xl mx-auto p-5 sm:p-7 rounded-[2.5rem] bg-gradient-to-b from-slate-900/95 via-sky-950/95 to-slate-950/95 border-4 border-cyan-400 shadow-[0_0_50px_rgba(6,182,212,0.35)] select-none text-white flex flex-col items-center gap-5"
      dir="rtl"
    >
      {/* Header */}
      <div className="w-full flex items-center justify-between border-b border-cyan-500/30 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border-2 border-cyan-300 flex items-center justify-center text-2xl shadow">
            🧑‍🚀
          </div>
          <div>
            <h3 className="font-hud font-black text-lg sm:text-xl text-white">
              تجهيز ومعايرة بدلة السير الفضائي (EMU)
            </h3>
            <p className="text-xs font-hud font-bold text-cyan-200">
              اسحب القطع أو اضغط عليها لتثبيتها في نقاط البدلة الصحيحة!
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleReset}
          className="p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-600 transition-all cursor-pointer"
          title="إعادة التجهيز"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Main Spacesuit Silhouette & Snap Zones */}
      <div className="relative w-72 h-80 rounded-3xl bg-slate-950/80 border-3 border-cyan-400/40 p-4 flex flex-col items-center justify-between shadow-inner">
        {/* Helmet Snap Target (Head) */}
        <div
          onClick={() => handleSnapPart('helmet')}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (draggedPartId === 'helmet') handleSnapPart('helmet');
          }}
          className={`w-24 h-24 rounded-full border-3 border-dashed flex flex-col items-center justify-center transition-all cursor-pointer ${
            attachedParts.helmet
              ? 'bg-amber-500/20 border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.5)]'
              : 'border-slate-500 hover:border-yellow-300 bg-slate-900/60'
          }`}
        >
          {attachedParts.helmet ? (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-5xl filter drop-shadow">
              ⛑️
            </motion.div>
          ) : (
            <span className="text-[11px] font-hud font-black text-slate-400 text-center">
              ضع الخوذة هنا 🎯
            </span>
          )}
        </div>

        {/* Chest / Torso & Back O2 Pack Target */}
        <div
          onClick={() => handleSnapPart('o2pack')}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (draggedPartId === 'o2pack') handleSnapPart('o2pack');
          }}
          className={`w-36 h-28 rounded-2xl border-3 border-dashed flex flex-col items-center justify-center transition-all cursor-pointer ${
            attachedParts.o2pack
              ? 'bg-emerald-500/20 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.5)]'
              : 'border-slate-500 hover:border-emerald-300 bg-slate-900/60'
          }`}
        >
          {attachedParts.o2pack ? (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex flex-col items-center">
              <span className="text-4xl filter drop-shadow">🎒</span>
              <span className="text-[10px] font-hud font-black text-emerald-300 mt-1">4.3 PSI مثبت ✅</span>
            </motion.div>
          ) : (
            <span className="text-[11px] font-hud font-black text-slate-400 text-center">
              حقيبة الأكسجين 4.3 PSI
            </span>
          )}
        </div>

        {/* Gloves Snap Target (Hands) */}
        <div
          onClick={() => handleSnapPart('gloves')}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (draggedPartId === 'gloves') handleSnapPart('gloves');
          }}
          className={`w-48 h-14 rounded-2xl border-3 border-dashed flex items-center justify-center transition-all cursor-pointer ${
            attachedParts.gloves
              ? 'bg-sky-500/20 border-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.5)]'
              : 'border-slate-500 hover:border-sky-300 bg-slate-900/60'
          }`}
        >
          {attachedParts.gloves ? (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-4 text-3xl">
              <span>🧤</span>
              <span className="text-xs font-hud font-black text-sky-300">القفازات محكمة!</span>
              <span>🧤</span>
            </motion.div>
          ) : (
            <span className="text-[11px] font-hud font-black text-slate-400">
              قفازات العزل الحراري 🧤
            </span>
          )}
        </div>
      </div>

      {/* Parts Tray / Shelf */}
      <div className="w-full flex flex-col gap-2">
        <span className="text-xs font-hud font-bold text-slate-300 mr-2">
          قطع الغيار المتاحة (اسحب أو اضغط للتركيب):
        </span>
        <div className="grid grid-cols-3 gap-3">
          {SUIT_PARTS.map((part) => {
            const isInstalled = attachedParts[part.id];

            return (
              <motion.button
                key={part.id}
                type="button"
                draggable={!isInstalled}
                onDragStart={() => setDraggedPartId(part.id)}
                onDragEnd={() => setDraggedPartId(null)}
                onClick={() => handleSnapPart(part.id)}
                whileHover={!isInstalled ? { scale: 1.05 } : {}}
                whileTap={!isInstalled ? { scale: 0.95 } : {}}
                disabled={isInstalled}
                className={`p-3 rounded-2xl border-2 flex flex-col items-center justify-center gap-1.5 transition-all shadow-md ${
                  isInstalled
                    ? 'opacity-40 bg-slate-900 border-slate-700 cursor-default'
                    : `bg-gradient-to-b ${part.color} border-white text-slate-950 cursor-grab active:cursor-grabbing hover:shadow-lg`
                }`}
              >
                <span className="text-3xl filter drop-shadow">{part.icon}</span>
                <span className="text-[11px] font-hud font-black text-center leading-tight">
                  {part.nameAr}
                </span>
                {isInstalled && (
                  <span className="text-[9px] font-hud font-black px-1.5 py-0.5 rounded bg-emerald-600 text-white">
                    تم التثبيت ✓
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Completion Banner */}
      {isAllAttached ? (
        <div className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-hud font-black text-base flex items-center justify-center gap-2 shadow-lg animate-bounce">
          <CheckCircle2 className="w-6 h-6" />
          <span>تم تجهيز البدلة بنجاح! جاهز للخروج إلى الفضاء المفتوح 🧑‍🚀</span>
        </div>
      ) : activeToast ? (
        <span className="text-xs font-hud font-black text-emerald-300 bg-emerald-950/80 px-4 py-1.5 rounded-full border border-emerald-400">
          {activeToast}
        </span>
      ) : null}
    </div>
  );
};

export default SuitPrep;
