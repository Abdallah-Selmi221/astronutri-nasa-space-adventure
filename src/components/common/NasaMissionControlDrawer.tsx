import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { nasaCache } from '../../services/nasa/nasaCache';
import { NASA_OSDR_METRICS, NASA_ENGINEERING_TRADEOFFS } from '../../services/nasa/nasaOSDR';
import { soundManager } from '../../utils/sound';
import { X, Satellite, Sun, Sparkles, Orbit, ShieldCheck, Activity } from 'lucide-react';

interface NasaMissionControlDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NasaMissionControlDrawer: React.FC<NasaMissionControlDrawerProps> = ({
  isOpen,
  onClose
}) => {
  const asteroid = nasaCache.getAsteroid('3542519');
  const cme = nasaCache.getLatestSolarStorm();
  const apod = nasaCache.getLatestAPOD();
  const attribution = nasaCache.getAttribution();
  const syncedAt = nasaCache.getSyncedAt();
  const formattedSyncDate = (() => {
    try {
      return new Date(syncedAt).toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return syncedAt.slice(0, 10);
    }
  })();

  const handleClose = () => {
    soundManager.playClick();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 280 }}
            className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-md sm:max-w-lg bg-gradient-to-b from-slate-950 via-slate-900 to-space-950 border-l-2 border-cyan-400/60 shadow-[0_0_50px_rgba(6,182,212,0.4)] flex flex-col overflow-hidden text-right"
            dir="rtl"
          >
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-cyan-500/30 bg-slate-900/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-300 flex items-center justify-center text-xl text-cyan-300 shadow">
                  🛰️
                </div>
                <div>
                  <h3 className="font-hud font-black text-base sm:text-lg text-white">
                    بيانات ناسا الحية • NASA Live Data
                  </h3>
                  <p className="text-[11px] text-cyan-300 font-bold">
                    مرصد الفضاء وبيانات تلسكوبات ناسا الرسمية
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClose}
                className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center border border-slate-600 transition-colors cursor-pointer"
                aria-label="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {/* Card 1: Real Near-Earth Asteroid (NeoWs) */}
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-cyan-400/40 shadow-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-cyan-300 font-hud font-black text-xs sm:text-sm">
                    <Orbit className="w-4 h-4 text-cyan-400" />
                    <span>الكويكب المرصود: {asteroid.name}</span>
                  </div>
                  <span className="text-[10px] font-hud font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    {asteroid.isPotentiallyHazardous ? 'تحت المراقبة' : 'آمن ويمر بسلام'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-bold text-slate-300">
                  <div className="p-2.5 rounded-xl bg-space-950/70 border border-slate-800">
                    <div className="text-[10px] text-slate-400">القطر التقديري:</div>
                    <div className="text-cyan-200 font-black font-hud text-sm mt-0.5">
                      {Math.round(asteroid.diameterMeters.min)} - {Math.round(asteroid.diameterMeters.max)} متر
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-space-950/70 border border-slate-800">
                    <div className="text-[10px] text-slate-400">سرعة التحليق:</div>
                    <div className="text-amber-300 font-black font-hud text-sm mt-0.5">
                      {asteroid.relativeVelocityKmS || '14.8'} كم/ث
                    </div>
                  </div>
                  <div className="col-span-2 p-2.5 rounded-xl bg-space-950/70 border border-slate-800">
                    <div className="text-[10px] text-slate-400">المسافة الآمنة من الأرض:</div>
                    <div className="text-emerald-300 font-black font-hud text-xs mt-0.5">
                      {asteroid.missDistanceKm
                        ? `${Number(asteroid.missDistanceKm).toLocaleString()} كم (${asteroid.missDistanceLunar} ضعف مسافة القمر)`
                        : '7,457,360 كم'}
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  💡 {asteroid.educationalSafetyNoteAr || 'ترصد شبكة NASA NeoWs الكويكبات القريبة من الأرض باستمرار لحماية كوكبنا وتدريب رواد الفضاء على ملاحة الأعماق.'}
                </p>
              </div>

              {/* Card 2: Space Weather DONKI Solar Storm */}
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-amber-400/40 shadow-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-300 font-hud font-black text-xs sm:text-sm">
                    <Sun className="w-4 h-4 text-amber-400" />
                    <span>طقس الفضاء: عاصفة شمسية (CME)</span>
                  </div>
                  <span className="text-[10px] font-hud font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400">
                    {cme.activityId || '2024-CME-001'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-bold text-slate-300">
                  <div className="p-2.5 rounded-xl bg-space-950/70 border border-slate-800">
                    <div className="text-[10px] text-slate-400">سرعة الانبعاث الأكليلي:</div>
                    <div className="text-amber-300 font-black font-hud text-sm mt-0.5">
                      {cme.speedKmS ? `${cme.speedKmS} كم/ث` : '1,120 كم/ث'}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-space-950/70 border border-slate-800">
                    <div className="text-[10px] text-slate-400">التأثير على المركبة:</div>
                    <div className="text-rose-300 font-black font-hud text-xs mt-0.5">
                      تفعيل دروع الإشعاع 🛡️
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  ☀️ ترسل الشمس جسيمات مشحونة بسرعة فائقة في الفضاء. في اللعبة، يساعدك كابتن روبو في تفعيل الدروع المغناطيسية لحماية بدلة الفضاء.
                </p>
              </div>

              {/* Card 3: Verified Real NASA Imagery Showcase */}
              <div className="casual-card p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-purple-200 font-hud font-black text-sm">
                    <Sparkles className="w-4 h-4 text-purple-300" />
                    <span>صور ناسا الفضائية الحقيقية</span>
                  </div>
                  <span className="text-[11px] font-hud font-bold text-cyan-200">
                    {apod.date || formattedSyncDate}
                  </span>
                </div>

                {/* APOD Space Nebula */}
                <div className="rounded-2xl overflow-hidden border-2 border-cyan-300/60 bg-slate-950/90 shadow-lg">
                  <div className="h-44 overflow-hidden">
                    <img
                      src={apod.localAssetPath || apod.url || '/assets/nasa/apod_sample.jpg'}
                      alt={apod.titleAr || apod.title}
                      onError={(e) => {
                        const img = e.currentTarget as HTMLImageElement;
                        if (!img.dataset.fallbackApplied) {
                          img.dataset.fallbackApplied = '1';
                          img.src = '/assets/nasa/apod_sample.jpg';
                        }
                      }}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-3 space-y-1">
                    <div className="text-xs sm:text-sm font-hud font-black text-white">
                      🔭 {apod.titleAr || apod.title}
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed">
                      {apod.explanationAr || 'تُظهر صورة ناسا أعمدة الغبار الكوني وسحب الهيدروجين المتوهجة حيث تولد النجوم الجديدة.'}
                    </p>
                  </div>
                </div>

                {/* Earth Blue Marble & Lunar LROC Gallery */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-2xl overflow-hidden border-2 border-sky-300/60 bg-slate-950/90">
                    <div className="h-32 overflow-hidden">
                      <img
                        src="/assets/nasa/earth_blue_marble.jpg"
                        alt="كوكب الأرض الكرة الزرقاء — NASA EPIC"
                        onError={(e) => {
                          const img = e.currentTarget as HTMLImageElement;
                          if (!img.dataset.fallbackApplied) {
                            img.dataset.fallbackApplied = '1';
                            img.src = '/assets/nasa/apod_sample.jpg';
                          }
                        }}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-2.5">
                      <div className="text-xs font-hud font-black text-sky-200">🌍 الكرة الزرقاء (EPIC)</div>
                      <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                        التقطها مرصد DSCOVR لتوضح الغلاف الجوي والمحيطات التي تحمي الحياة.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl overflow-hidden border-2 border-amber-300/60 bg-slate-950/90">
                    <div className="h-32 overflow-hidden">
                      <img
                        src="/assets/nasa/moon_surface_lroc.jpg"
                        alt="سطح القمر وفوهة شاكلتون — NASA LROC"
                        onError={(e) => {
                          const img = e.currentTarget as HTMLImageElement;
                          if (!img.dataset.fallbackApplied) {
                            img.dataset.fallbackApplied = '1';
                            img.src = '/assets/nasa/apod_sample.jpg';
                          }
                        }}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-2.5">
                      <div className="text-xs font-hud font-black text-amber-200">🌕 القطب الجنوبي للقمر (LROC)</div>
                      <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                        رصدت مركبة LRO فوهة شاكلتون الغنية بالجليد المائي لمهمة أرتميس!
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 4: NASA OSDR Biological Datasets & Engineering Trade-Offs */}
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-emerald-400/40 shadow-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-300 font-hud font-black text-xs sm:text-sm">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    <span>مختبر بيانات ناسا الحيوية (NASA OSDR)</span>
                  </div>
                  <span className="text-[10px] font-hud font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400">
                    4 دراسات نشطة
                  </span>
                </div>

                <div className="space-y-2">
                  {NASA_OSDR_METRICS.map((study) => (
                    <div
                      key={study.id}
                      className="p-2.5 rounded-xl bg-space-950/75 border border-slate-800 space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2 text-[11px] font-black text-cyan-200">
                        <span>{study.titleAr}</span>
                        <span className="text-[10px] text-amber-300">{study.osdrCode}</span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">{study.findingAr}</p>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-slate-800 space-y-2">
                  <div className="text-xs font-hud font-black text-amber-300">
                    ⚖️ موازنات الهندسة والطاقة (Trade-Offs):
                  </div>
                  {NASA_ENGINEERING_TRADEOFFS.map((tr) => (
                    <div
                      key={tr.id}
                      className="p-2.5 rounded-xl bg-amber-950/25 border border-amber-500/30 space-y-1"
                    >
                      <div className="text-[11px] font-black text-amber-200">{tr.titleAr}</div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">{tr.optimalDecisionAr}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer with Attribution */}
            <div className="p-4 border-t border-slate-800 bg-slate-950 text-center space-y-1">
              <div className="text-[10px] text-slate-400 font-bold flex items-center justify-center gap-1.5">
                <Satellite className="w-3.5 h-3.5 text-cyan-400" />
                <span>المصدر العلمي المعتمد: {attribution}</span>
              </div>
              <div className="text-[10px] text-cyan-300/80 font-bold">
                نسخة بيانات ناسا المزامَنة: {formattedSyncDate} (تعمل بسرعة فائقة ودون اتصال)
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
