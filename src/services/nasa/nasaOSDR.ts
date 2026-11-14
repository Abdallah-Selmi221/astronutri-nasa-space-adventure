/**
 * NASA Open Science Data Repository (OSDR) & Spaceflight Engineering Trade-Off Dataset
 * Grounded in published NASA Life Sciences / Exploration Medical Capability metrics.
 */

export interface OSDRStudyMetric {
  id: string;
  osdrCode: string;
  titleAr: string;
  titleEn: string;
  findingAr: string;
  metricBadge: string;
  levelUsage: 1 | 2 | 3 | 4;
}

export interface EngineeringTradeOff {
  id: string;
  titleAr: string;
  resources: string[];
  dilemmaAr: string;
  optimalDecisionAr: string;
  nasaDataset: string;
}

export const NASA_OSDR_METRICS: OSDRStudyMetric[] = [
  {
    id: 'osdr_bone_muscle',
    osdrCode: 'NASA OSDR (OSD-102 / ARED)',
    titleAr: 'كثافة العظام وكتلة العضلات في انعدام الجاذبية',
    titleEn: 'Microgravity Bone Mineral Density & Muscle Atrophy',
    findingAr:
      'تشير أبحاث NASA OSDR إلى أن رواد الفضاء يفقدون 1% إلى 1.5% من كثافة العظام شهرياً في الجاذبية المنخفضة ما لم يمارسوا تمارين المقاومة اليومية (الأرجل، الذراعين، والجذع) ويتناولوا بروتيناً متوازناً وفيتامين D.',
    metricBadge: 'ARED + Protein Protection',
    levelUsage: 3
  },
  {
    id: 'osdr_fluid_shift',
    osdrCode: 'NASA OSDR (OSD-245 / Fluid Shift)',
    titleAr: 'إزاحة السوائل ودوار الحركة الفضائي',
    titleEn: 'Cephalad Fluid Shift & Space Motion Sickness',
    findingAr:
      'في بداية الرحلة عند 0G تندفع السوائل نحو الرأس فتضعف إشارة العطش ويشعر الرائد بدوار مؤقت؛ لذلك يُعد الترطيب المنظم بأنبوب مختوم والراحة في المقصورة بروتوكولاً أساسياً.',
    metricBadge: '0G Hydration & Rest',
    levelUsage: 2
  },
  {
    id: 'osdr_radiation_biology',
    osdrCode: 'NASA OSDR (OSD-318 / Space Radiation)',
    titleAr: 'الإشعاع الشمسي وموازنة الطاقة والملاجئ',
    titleEn: 'Solar Particle Events (SEP) & Crew Shielding Biology',
    findingAr:
      'أثناء العواصف الشمسية (DONKI CME/SEP)، لا تكفي الفيتامينات وحدها؛ بل يجب الانتقال فوراً لملاجئ الإشعاع المحمية وتوجيه طاقة القاعدة لدعم الأكسجين والدروع المادية.',
    metricBadge: 'Physical Shielding First',
    levelUsage: 3
  },
  {
    id: 'osdr_reentry_gload',
    osdrCode: 'NASA OSDR / Orion Human Systems',
    titleAr: 'تحمل الجاذبية العائدة وإعادة التأقلم',
    titleEn: 'Re-Entry G-Load Tolerance & Orthostatic Recovery',
    findingAr:
      'الحفاظ على العضلات والسوائل وتوزيع مركز ثقل العينات القمرية يقلل إجهاد رائد الفضاء عند اختراق الغلاف الجوي والعودة من جاذبية القمر (0.16G) إلى جاذبية الأرض (1G).',
    metricBadge: '4G Re-Entry Tolerance',
    levelUsage: 4
  }
];

export const NASA_ENGINEERING_TRADEOFFS: EngineeringTradeOff[] = [
  {
    id: 'tradeoff_power_o2_shield',
    titleAr: 'موازنة الموارد الهندسية: الطاقة ⚡ مقابل الأكسجين 🫁 مقابل الدروع 🛡️',
    resources: ['Power (kW)', 'Oxygen (PSI)', 'Radiation Shielding'],
    dilemmaAr:
      'عند رصد عاصفة شمسية في DONKI، تستهلك أنظمة التدفئة وإعادة تدوير المياه (ECLSS) قدراً كبيراً من الطاقة. تحويل كل الطاقة للزراعة أو المحركات قد يخفض كفاءة الدروع وتنقية الأكسجين!',
    optimalDecisionAr:
      'الأولوية الأولى لبقاء الطاقم: تشغيل دروع الملجأ وتنقية الأكسجين أولاً ثم استعادة طاقة الزراعة بعد زوال العاصفة.',
    nasaDataset: 'NASA DONKI + OSDR'
  },
  {
    id: 'tradeoff_mass_nutrition',
    titleAr: 'موازنة الكتلة والغذاء والوقود في الإطلاق 🚀',
    resources: ['Payload Mass (kg)', 'Calories & Fiber', 'No-Crumbs Safety'],
    dilemmaAr:
      'كل كيلوجرام إضافي في الصاروخ يحتاج وقوداً أكبر، بينما الأطعمة المتفتتة قد تسد فلاتر الهواء. الحل هو أطعمة خفيفة الوزن كثيفة العناصر الغذائية كعبوات العسل السيناوي والمش والعجوة والفواكه المجففة بالتجميد.',
    optimalDecisionAr:
      'تعبئة أطعمة عالية البروتين والألياف وخالية من الفتات ضمن حد الوزن المسموح.',
    nasaDataset: 'NASA Space Food Systems + NeoWs'
  }
];
