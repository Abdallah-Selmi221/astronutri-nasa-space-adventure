import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { nasaCache } from '../../services/nasa/nasaCache';
import { soundManager } from '../../utils/sound';
import { dialogueManager } from '../../utils/geminiTTS';
import { 
  Radar, 
  ShieldCheck, 
  Compass, 
  Check, 
  X,
  Volume2
} from 'lucide-react';

interface AsteroidRadarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmSafeNavigation?: () => void;
}

export const AsteroidRadarModal: React.FC<AsteroidRadarModalProps> = ({
  isOpen,
  onClose,
  onConfirmSafeNavigation
}) => {
  const targetAsteroid = nasaCache.getAsteroid('3542519');
  const feedAsteroids = nasaCache.getNearEarthAsteroids();
  const [selectedAsteroid, setSelectedAsteroid] = useState(targetAsteroid);
  const [isObserving, setIsObserving] = useState(false);
  const [hasObserved, setHasObserved] = useState(false);

  if (!isOpen) return null;

  const handleSpeakExplanation = () => {
    soundManager.playClick();
    const explanation = `رادار المركبة رصد كويكب ${selectedAsteroid.name}! قطره حوالي ${selectedAsteroid.diameterMeters.max} متر وبيتحرك بسرعة ${selectedAsteroid.relativeVelocityKmS} كيلومتر في الثانية. بس متقلقش يا بطل، ده بيمر على بعد ${selectedAsteroid.missDistanceLunar} ضعف المسافة للقمر، يعني في أمان تام!`;
    void dialogueManager.speak(explanation);
  };

  const handleScanTrajectory = () => {
    soundManager.playCrystalSparkle();
    setIsObserving(true);
    setTimeout(() => {
      setIsObserving(false);
      setHasObserved(true);
      soundManager.playFanfare();
    }, 1400);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="w-full max-w-4xl bg-gradient-to-b from-slate-900 via-sky-950 to-slate-950 border-3 border-cyan-400 rounded-3xl p-5 sm:p-7 text-white shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border-2 border-cyan-400 flex items-center justify-center text-cyan-300">
                <Radar className="w-7 h-7 animate-spin" style={{ animationDuration: '6s' }} />
              </div>
              <div>
                <span className="text-[10px] font-hud font-black px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500">
                  بيانات حية من مرصد ناسا (NASA NeoWs) 🛰️
                </span>
                <h2 className="font-hud font-black text-xl sm:text-2xl text-white flex items-center gap-2">
                  رادار الملاحة ورصد الكويكبات القريبة
                </h2>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 overflow-y-auto pr-1 flex-1">
            {/* Left 5 Cols: Asteroid Selector Feed */}
            <div className="lg:col-span-5 space-y-2">
              <h3 className="font-hud font-bold text-xs sm:text-sm text-cyan-300 flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-cyan-400" />
                <span>الكويكبات القريبة في نافذة الرحلة (7 أيام):</span>
              </h3>

              <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
                {feedAsteroids.map((ast) => (
                  <button
                    key={ast.id}
                    onClick={() => {
                      soundManager.playClick();
                      setSelectedAsteroid(ast);
                      setHasObserved(false);
                    }}
                    className={`w-full p-2.5 rounded-xl border text-right transition-all flex items-center justify-between gap-2 cursor-pointer ${
                      selectedAsteroid.id === ast.id
                        ? 'bg-cyan-500/25 border-cyan-300 shadow-md'
                        : 'bg-slate-800/80 border-slate-700 hover:border-slate-500'
                    }`}
                  >
                    <div>
                      <div className="font-hud font-black text-xs text-white">
                        {ast.name}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        القطر: {ast.diameterMeters.min}–{ast.diameterMeters.max}م • السرعة: {ast.relativeVelocityKmS} كم/ث
                      </div>
                    </div>
                    {ast.isPotentiallyHazardous ? (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-500 shrink-0">
                        خطر محتمل ⚠️
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500 shrink-0">
                        آمن ✅
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Attribution */}
              <div className="text-[10px] text-slate-400 italic pt-1">
                المصدر: {nasaCache.getAttribution()}
              </div>
            </div>

            {/* Right 7 Cols: Telemetry & Educational Safety Inspector */}
            <div className="lg:col-span-7 space-y-3 flex flex-col justify-between">
              <div className="rounded-2xl bg-slate-950/80 border-2 border-cyan-500/50 p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div>
                    <span className="text-[11px] font-bold text-cyan-400">كود ناسا SPK-ID: {selectedAsteroid.spkId}</span>
                    <h3 className="font-hud font-black text-lg text-white">{selectedAsteroid.name}</h3>
                  </div>

                  <button
                    onClick={handleSpeakExplanation}
                    className="px-2.5 py-1 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-400 text-cyan-200 font-hud font-bold text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-cyan-300" />
                    <span>صوت روبو</span>
                  </button>
                </div>

                {/* 4 Metric Cards */}
                <div className="grid grid-cols-2 gap-2 text-center font-hud">
                  <div className="bg-slate-900/90 border border-slate-700 p-2 rounded-xl">
                    <span className="text-[10px] text-slate-400">القطر التقديري</span>
                    <p className="font-black text-sm text-cyan-300">
                      {selectedAsteroid.diameterMeters.min}–{selectedAsteroid.diameterMeters.max} متر
                    </p>
                  </div>
                  <div className="bg-slate-900/90 border border-slate-700 p-2 rounded-xl">
                    <span className="text-[10px] text-slate-400">السرعة النسبية</span>
                    <p className="font-black text-sm text-amber-300">
                      {selectedAsteroid.relativeVelocityKmS} كم/ثانية
                    </p>
                  </div>
                  <div className="bg-slate-900/90 border border-slate-700 p-2 rounded-xl">
                    <span className="text-[10px] text-slate-400">مسافة المرور الآمنة</span>
                    <p className="font-black text-sm text-emerald-300">
                      {selectedAsteroid.missDistanceLunar} مسافة قمرية
                    </p>
                  </div>
                  <div className="bg-slate-900/90 border border-slate-700 p-2 rounded-xl">
                    <span className="text-[10px] text-slate-400">المسافة بالكيلومتر</span>
                    <p className="font-black text-sm text-sky-300">
                      {(selectedAsteroid.missDistanceKm / 1_000_000).toFixed(2)} مليون كم
                    </p>
                  </div>
                </div>

                {/* Scientific Fact Note */}
                <div className="p-3 rounded-xl bg-sky-950/70 border border-cyan-400/50 text-xs font-hud font-bold leading-relaxed text-slate-200">
                  <div className="flex items-center gap-1.5 text-cyan-300 font-black mb-1">
                    <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>تفسير وكالة ناسا العلمي (NASA Fact):</span>
                  </div>
                  {selectedAsteroid.educationalSafetyNoteAr}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2">
                {!hasObserved ? (
                  <button
                    onClick={handleScanTrajectory}
                    disabled={isObserving}
                    className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-hud font-black text-sm shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <Radar className={`w-4 h-4 ${isObserving ? 'animate-spin' : ''}`} />
                    <span>{isObserving ? 'جاري مسح مسار الكويكب...' : 'رصد وتأكيد المسار الآمن 🔭'}</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      soundManager.playFanfare();
                      if (onConfirmSafeNavigation) {
                        onConfirmSafeNavigation();
                      } else {
                        onClose();
                      }
                    }}
                    className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-hud font-black text-sm shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <Check className="w-5 h-5 stroke-[3]" />
                    <span>تم الرصد بنجاح! متابعة الرحلة نحو القمر 🚀</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
