/**
 * NASA Open Science Data Repository (OSDR) & Spaceflight Engineering Trade-Off Dataset
 * Grounded in published NASA Life Sciences / Exploration Medical Capability metrics.
 */

export interface OSDRStudyMetric {
  id: string;
  osdrCode: string;
  titleAr: string;
  titleEn: string;
  findingEn: string;
  findingAr: string;
  metricBadge: string;
  levelUsage: 1 | 2 | 3 | 4;
}

export interface EngineeringTradeOff {
  id: string;
  titleEn: string;
  titleAr: string;
  resources: string[];
  dilemmaEn: string;
  dilemmaAr: string;
  optimalDecisionEn: string;
  optimalDecisionAr: string;
  nasaDataset: string;
}

export const NASA_OSDR_METRICS: OSDRStudyMetric[] = [
  {
    id: 'osdr_bone_muscle',
    osdrCode: 'NASA OSDR (OSD-102 / ARED)',
    titleAr: 'كثافة العظام وكتلة العضلات في انعدام الجاذبية',
    titleEn: 'Microgravity Bone Mineral Density & Muscle Atrophy',
    findingEn:
      'NASA OSDR studies show astronauts can lose 1% to 1.5% of bone density per month in microgravity unless they practice daily resistance workouts (legs, arms, core) with balanced protein and Vitamin D.',
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
    findingEn:
      'Early in 0G flight, fluids shift toward the head—blunting thirst signals and causing brief space motion sickness—making scheduled straw hydration and sleep-pod rest vital protocols.',
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
    findingEn:
      'During solar storms (DONKI CME/SEP), vitamins alone cannot block space radiation—crews must move inside physical storm shelters and prioritize oxygen and shield power first.',
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
    findingEn:
      'Maintaining muscle tone, fluid hydration, and centered sample cargo reduces strain when re-entering Earth’s atmosphere from Moon gravity (0.16G) back to 1G.',
    findingAr:
      'الحفاظ على العضلات والسوائل وتوزيع مركز ثقل العينات القمرية يقلل إجهاد رائد الفضاء عند اختراق الغلاف الجوي والعودة من جاذبية القمر (0.16G) إلى جاذبية الأرض (1G).',
    metricBadge: '4G Re-Entry Tolerance',
    levelUsage: 4
  }
];

export const NASA_ENGINEERING_TRADEOFFS: EngineeringTradeOff[] = [
  {
    id: 'tradeoff_power_o2_shield',
    titleEn: 'Base Resource Trade-Off: Power ⚡ vs. Oxygen 🫁 vs. Shielding 🛡️',
    titleAr: 'موازنة الموارد الهندسية: الطاقة ⚡ مقابل الأكسجين 🫁 مقابل الدروع 🛡️',
    resources: ['Power (kW)', 'Oxygen (PSI)', 'Radiation Shielding'],
    dilemmaEn:
      'During a DONKI solar storm, heaters and ECLSS water loops draw high power. Routing all energy to grow-lights or thrusters weakens oxygen scrubbers and crew storm shields!',
    dilemmaAr:
      'عند رصد عاصفة شمسية في DONKI، تستهلك أنظمة التدفئة وإعادة تدوير المياه (ECLSS) قدراً كبيراً من الطاقة. تحويل كل الطاقة للزراعة أو المحركات قد يخفض كفاءة الدروع وتنقية الأكسجين!',
    optimalDecisionEn:
      'Human survival comes first: route power to crew radiation shelters & oxygen generation, then restore crop lighting once the storm clears.',
    optimalDecisionAr:
      'الأولوية الأولى لبقاء الطاقم: تشغيل دروع الملجأ وتنقية الأكسجين أولاً ثم استعادة طاقة الزراعة بعد زوال العاصفة.',
    nasaDataset: 'NASA DONKI + OSDR'
  },
  {
    id: 'tradeoff_mass_nutrition',
    titleEn: 'Launch Mass, Nutrition & Fuel Trade-Off 🚀',
    titleAr: 'موازنة الكتلة والغذاء والوقود في الإطلاق 🚀',
    resources: ['Payload Mass (kg)', 'Calories & Fiber', 'No-Crumbs Safety'],
    dilemmaEn:
      'Every extra kilogram needs extra rocket fuel, while flaky snacks clog cabin filters. Compact, nutrient-dense zero-crumb foods like Sinai Honey, Mish, Date Bars & freeze-dried fruits solve both!',
    dilemmaAr:
      'كل كيلوجرام إضافي في الصاروخ يحتاج وقوداً أكبر، بينما الأطعمة المتفتتة قد تسد فلاتر الهواء. الحل هو أطعمة خفيفة الوزن كثيفة العناصر الغذائية كعبوات العسل السيناوي والمش والعجوة والفواكه المجففة بالتجميد.',
    optimalDecisionEn:
      'Pack high-protein, high-fiber, completely crumb-free rations inside the mass budget.',
    optimalDecisionAr:
      'تعبئة أطعمة عالية البروتين والألياف وخالية من الفتات ضمن حد الوزن المسموح.',
    nasaDataset: 'NASA Space Food Systems + NeoWs'
  }
];
