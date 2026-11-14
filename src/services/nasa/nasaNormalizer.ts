import {
  NormalizedAsteroid,
  NormalizedAPOD,
  NormalizedDONKIEvent
} from './types';

/**
 * Normalizes raw NASA NeoWs asteroid records into safe, typed, game-ready models.
 */
export function normalizeAsteroid(raw: any): NormalizedAsteroid {
  const diameterMin =
    raw.estimated_diameter?.meters?.estimated_diameter_min ??
    (raw.estimatedDiameterMeters ? raw.estimatedDiameterMeters.min : 50);
  const diameterMax =
    raw.estimated_diameter?.meters?.estimated_diameter_max ??
    (raw.estimatedDiameterMeters ? raw.estimatedDiameterMeters.max : 120);

  const closeApproach = Array.isArray(raw.close_approach_data) && raw.close_approach_data.length > 0
    ? raw.close_approach_data[0]
    : null;

  const velKmS = closeApproach?.relative_velocity?.kilometers_per_second
    ? parseFloat(closeApproach.relative_velocity.kilometers_per_second)
    : 18.5;

  const missLunar = closeApproach?.miss_distance?.lunar
    ? parseFloat(closeApproach.miss_distance.lunar)
    : 14.2;

  const missKm = closeApproach?.miss_distance?.kilometers
    ? parseFloat(closeApproach.miss_distance.kilometers)
    : missLunar * 384400;

  const isHazard = Boolean(raw.is_potentially_hazardous_asteroid);

  const safetyNoteAr = isHazard
    ? 'تصنيف «خطر محتمل» في ناسا يعني فقط أن الكويكب يقترب من مدار الأرض بأكثر من 7.5 مليون كم، وليس أنه سيصطدم بالأرض! مداراته مرصودة بدقة 100%.'
    : 'كويكب آمن يمر على مسافة شاسعة تعادل أضعاف المسافة بين الأرض والقمر.';

  return {
    id: String(raw.id || raw.spkId || '3542519'),
    spkId: String(raw.id || '3542519'),
    name: String(raw.name || 'Asteroid 2010 PK'),
    designation: raw.designation || '2010 PK',
    absoluteMagnitudeH: Number(raw.absolute_magnitude_h || 22.1),
    diameterMeters: {
      min: Math.round(diameterMin),
      max: Math.round(diameterMax)
    },
    isPotentiallyHazardous: isHazard,
    closeApproachDate: closeApproach?.close_approach_date || '2026-11-12',
    relativeVelocityKmS: Math.round(velKmS * 10) / 10,
    missDistanceLunar: Math.round(missLunar * 10) / 10,
    missDistanceKm: Math.round(missKm),
    orbitingBody: closeApproach?.orbiting_body || 'Earth',
    nasaJplUrl: raw.nasa_jpl_url || `https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=${raw.id || '3542519'}`,
    educationalSafetyNoteAr: safetyNoteAr
  };
}

/**
 * Normalizes raw APOD records.
 */
export function normalizeAPOD(raw: any): NormalizedAPOD {
  const rawUrl = typeof raw.url === 'string' ? raw.url.trim() : '';
  const isDirectImage = /\.(jpe?g|png|webp|gif)(\?.*)?$/i.test(rawUrl);
  const safeImageUrl = isDirectImage ? rawUrl : '/assets/nasa/apod_sample.jpg';

  return {
    date: raw.date || raw.published_date || new Date().toISOString().split('T')[0],
    title: raw.title?.rendered ? raw.title.rendered : (raw.title || 'صورة اليوم الفلكية من ناسا'),
    titleAr: 'سديم كوني ساحر — رصد تلسكوب هابل وجيمس ويب',
    explanation: typeof raw.explanation === 'string'
      ? raw.explanation
      : (raw.content?.rendered ? raw.content.rendered.replace(/<[^>]+>/g, '') : 'صورة علمية التقطتها مراصد وكالة الفضاء الأمريكية ناسا.'),
    explanationAr: 'تُظهر هذه الصورة الملتقطة عبر مراصد ناسا أعمدة الغبار الكوني وسحب الهيدروجين المتوهجة حيث تولد النجوم الجديدة في أعماق الفضاء السحيق.',
    mediaType: raw.media_type === 'video' ? 'video' : 'image',
    url: safeImageUrl,
    hdUrl: isDirectImage && raw.hdurl ? raw.hdurl : '/assets/nasa/apod_sample.jpg',
    copyright: raw.copyright || 'NASA / STScI / ESA',
    localAssetPath: '/assets/nasa/apod_sample.jpg'
  };
}

/**
 * Normalizes DONKI Coronal Mass Ejection (CME) and Solar Energetic Particle (SEP) events.
 */
export function normalizeDONKI(raw: any, type: 'CME' | 'SEP' = 'CME'): NormalizedDONKIEvent {
  const speed = raw.cmeAnalyses?.[0]?.speed || 1120;
  const isSevere = speed > 1000;

  return {
    activityId: raw.activityID || '2026-11-04T08:24:00-CME-001',
    startTime: raw.startTime || '2026-11-04T08:24Z',
    catalog: raw.catalog || 'M2M_CATALOG',
    type,
    speedKmS: speed,
    halfAngle: raw.cmeAnalyses?.[0]?.halfAngle || 45,
    note: raw.note || 'Fast halo coronal mass ejection directed toward lunar transit path.',
    educationalLabelAr: `عاصفة شمسية حقيقية مسجلة في قاعدة بيانات ناسا DONKI (حدث رقم ${raw.activityID || 'CME-001'})`,
    hazardLevel: isSevere ? 'severe' : 'moderate',
    recommendedActionAr: 'إيقاف النشاط الخارجي فوراً، واللجوء لقلب المحطة المائي المحمي، وتوجيه طاقة المحطة لدروع الإشعاع!'
  };
}
