import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { nasaCache } from '../../services/nasa/nasaCache';
import { NASA_OSDR_METRICS, NASA_ENGINEERING_TRADEOFFS } from '../../services/nasa/nasaOSDR';
import { soundManager } from '../../utils/sound';
import { X, Satellite, Sun, Sparkles, Orbit, ShieldCheck, Activity } from 'lucide-react';

export const NASA_DRAWER_OPEN_EVENT = 'astronutri:open-nasa-drawer';

export function openNasaDrawer(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(NASA_DRAWER_OPEN_EVENT));
  }
}

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
            className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-sm"
          />

          {/* Drawer Panel — Child-Friendly Space Observatory Storytelling */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 280 }}
            data-testid="nasa-observatory-drawer"
            className="fixed top-0 right-0 bottom-0 z-[90] w-full max-w-md sm:max-w-lg bg-gradient-to-b from-indigo-950 via-slate-900 to-sky-950 border-l-[3px] border-cyan-300/80 shadow-[0_0_50px_rgba(34,211,238,0.45)] flex flex-col overflow-hidden text-right"
            dir="rtl"
          >
            {/* Header */}
            <div className="p-4 sm:p-5 border-b-2 border-cyan-400/35 bg-gradient-to-r from-sky-900/70 to-indigo-900/70 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-400 border-2 border-white flex items-center justify-center text-2xl shadow-[0_3px_0_#b45309]">
                  🔭
                </div>
                <div>
                  <h3 className="font-hud font-black text-base sm:text-lg text-white">
                    مرصد تلسكوب كابتن نجم • NASA
                  </h3>
                  <p className="text-[11px] text-amber-200 font-bold">
                    اكتشف الكون والأرقام الحقيقية من تلسكوبات ناسا بلغة الأبطال!
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClose}
                className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center border-2 border-slate-500 transition-colors cursor-pointer"
                aria-label="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {/* Card 1: Friendly Asteroid Story (Real NASA NeoWs) */}
              <div className="casual-card p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-cyan-200 font-hud font-black text-xs sm:text-sm">
                    <Orbit className="w-4 h-4 text-cyan-300 shrink-0" />
                    <span>☄️ مغامرة الكويكب الصديق: {asteroid.name}</span>
                  </div>
                  <span className="text-[10px] font-hud font-black px-2.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-200 border border-emerald-300 flex items-center gap-1 shrink-0">
                    <ShieldCheck className="w-3 h-3" />
                    {asteroid.isPotentiallyHazardous ? 'تحت المراقبة 👀' : 'يمر بسلام بعيداً عن الأرض ✅'}
                  </span>
                </div>

                <p className="text-xs text-sky-100 leading-relaxed bg-sky-950/55 border border-sky-400/30 rounded-2xl p-2.5">
                  🚀 تخيّل صخرة فضائية عملاقة تسبح بين النجوم! عيون تلسكوبات ناسا (NeoWs) تراقبها
                  كل يوم لتحافظ على سلامة كوكبنا الجميل.
                </p>

                <div className="grid grid-cols-2 gap-2 text-xs font-bold text-slate-200">
                  <div className="p-2.5 rounded-2xl bg-slate-950/75 border border-cyan-400/30">
                    <div className="text-[10px] text-cyan-200/80">📏 حجم الكويكب:</div>
                    <div className="text-cyan-200 font-black font-hud text-sm mt-0.5">
                      {Math.round(asteroid.diameterMeters.min)} - {Math.round(asteroid.diameterMeters.max)} متر
                    </div>
                  </div>
                  <div className="p-2.5 rounded-2xl bg-slate-950/75 border border-amber-400/30">
                    <div className="text-[10px] text-amber-200/80">⚡ سرعته في الفضاء:</div>
                    <div className="text-amber-300 font-black font-hud text-sm mt-0.5">
                      {asteroid.relativeVelocityKmS || '14.8'} كم/ث
                    </div>
                  </div>
                  <div className="col-span-2 p-2.5 rounded-2xl bg-slate-950/75 border border-emerald-400/30">
                    <div className="text-[10px] text-emerald-200/80">🌍 المسافة الآمنة عن أرضنا:</div>
                    <div className="text-emerald-300 font-black font-hud text-xs mt-0.5">
                      {asteroid.missDistanceKm
                        ? `${Number(asteroid.missDistanceKm).toLocaleString()} كم (${asteroid.missDistanceLunar} ضعف مسافة القمر)`
                        : '7,457,360 كم'}
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-slate-300 leading-relaxed">
                  💡 {asteroid.educationalSafetyNoteAr || 'ترصد شبكة NASA NeoWs الكويكبات القريبة من الأرض باستمرار لتدريب رواد الفضاء على الملاحة الفضائية الآمنة.'}
                </p>
              </div>

              {/* Card 2: Sun Shield Story (Space Weather DONKI Solar Storm) */}
              <div className="casual-card p-4 space-y-3 border-amber-300/60">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-amber-200 font-hud font-black text-xs sm:text-sm">
                    <Sun className="w-4 h-4 text-amber-300 shrink-0" />
                    <span>☀️ درع الشمس المضيء وعاصفتها (CME)</span>
                  </div>
                  <span className="text-[10px] font-hud font-bold px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-200 border border-amber-300 shrink-0">
                    {cme.activityId || '2024-CME-001'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-bold text-slate-200">
                  <div className="p-2.5 rounded-2xl bg-slate-950/75 border border-amber-400/30">
                    <div className="text-[10px] text-amber-200/80">🌬️ سرعة رياح الشمس:</div>
                    <div className="text-amber-300 font-black font-hud text-sm mt-0.5">
                      {cme.speedKmS ? `${cme.speedKmS} كم/ث` : '1,120 كم/ث'}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-2xl bg-slate-950/75 border border-rose-400/30">
                    <div className="text-[10px] text-rose-200/80">🛡️ تنبيه البدلة:</div>
                    <div className="text-rose-300 font-black font-hud text-xs mt-0.5">
                      تشغيل المراقبة والحماية!
                    </div>
                  </div>
                </div>

                <p className="text-xs text-amber-100/90 leading-relaxed">
                  ✨ ترسل الشمس أحياناً موجات من الجسيمات المضيئة؛ لذلك تحمل بدلة <strong>SPACE-FIT X</strong> مقياس إشعاع شخصي ينبه الرائد فورياً للاحتماء داخل المقصورة!
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

              {/* Card 4: Child-Friendly Bio-Lab (NASA OSDR) & Engineering Trade-Offs */}
              <div className="casual-card p-4 space-y-3 border-emerald-300/60">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-emerald-200 font-hud font-black text-xs sm:text-sm">
                    <Activity className="w-4 h-4 text-emerald-300 shrink-0" />
                    <span>💪 كيف يحافظ أبطال الفضاء على أجسامهم؟</span>
                  </div>
                  <span className="text-[10px] font-hud font-bold px-2.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-200 border border-emerald-300 shrink-0">
                    NASA OSDR • 4 تجارب
                  </span>
                </div>

                <p className="text-xs text-emerald-100/90 leading-relaxed bg-emerald-950/45 border border-emerald-400/30 rounded-2xl p-2.5">
                  🧪 هذه تجارب حقيقية من قاعدة بيانات ناسا توضح لماذا نجمع بين الطعام الغني والرياضة وبدلة <strong>SPACE-FIT X</strong> لحماية العظام والعضلات في الفضاء!
                </p>

                <div className="space-y-2">
                  {NASA_OSDR_METRICS.map((study) => (
                    <div
                      key={study.id}
                      className="p-2.5 rounded-2xl bg-slate-950/80 border border-slate-700/80 space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2 text-[11px] font-black text-cyan-200">
                        <span>{study.titleAr}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/15 text-amber-300 border border-amber-400/40 shrink-0">
                          {study.osdrCode}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-200 leading-relaxed">{study.findingAr}</p>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-slate-700/70 space-y-2">
                  <div className="text-xs font-hud font-black text-amber-300">
                    ⚖️ لغز التوازن الذكي للمركبة (Trade-Offs):
                  </div>
                  {NASA_ENGINEERING_TRADEOFFS.map((tr) => (
                    <div
                      key={tr.id}
                      className="p-2.5 rounded-2xl bg-amber-950/35 border border-amber-400/40 space-y-1"
                    >
                      <div className="text-[11px] font-black text-amber-200">{tr.titleAr}</div>
                      <p className="text-[11px] text-slate-200 leading-relaxed">{tr.optimalDecisionAr}</p>
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
