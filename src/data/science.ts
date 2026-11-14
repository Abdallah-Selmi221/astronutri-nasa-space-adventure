import linkStatusData from './scienceLinkStatus.json';

export type ScienceBadgeType =
  | 'ISS_PROVEN'
  | 'EXPERIMENTAL'
  | 'PLANNING_ASSUMPTION'
  | 'GAME_RULE';

export interface ScienceBadgeMeta {
  type: ScienceBadgeType;
  labelAr: string;
  labelEn: string;
  shortTagAr: string;
  colorClass: string;
}

export const SCIENCE_BADGES: Record<ScienceBadgeType, ScienceBadgeMeta> = {
  ISS_PROVEN: {
    type: 'ISS_PROVEN',
    labelAr: '✅ مثبتة على ISS',
    labelEn: 'Proven on ISS',
    shortTagAr: 'مثبتة على ISS',
    colorClass: 'bg-emerald-950/80 border-emerald-400 text-emerald-200'
  },
  EXPERIMENTAL: {
    type: 'EXPERIMENTAL',
    labelAr: '🧪 تجريبية (لسه بحث)',
    labelEn: 'Experimental / Research',
    shortTagAr: 'تجريبية',
    colorClass: 'bg-purple-950/80 border-purple-400 text-purple-200'
  },
  PLANNING_ASSUMPTION: {
    type: 'PLANNING_ASSUMPTION',
    labelAr: '📐 افتراض تخطيطي',
    labelEn: 'Planning Assumption',
    shortTagAr: 'افتراض تخطيطي',
    colorClass: 'bg-sky-950/80 border-sky-400 text-sky-200'
  },
  GAME_RULE: {
    type: 'GAME_RULE',
    labelAr: '🎮 قاعدة لعبة مبسطة',
    labelEn: 'Simplified Game Rule',
    shortTagAr: 'تبسيط',
    colorClass: 'bg-amber-950/80 border-amber-400 text-amber-200'
  }
};

export interface ScientificSource {
  id: string;
  index: number;
  title: string;
  titleAr: string;
  year: string;
  url: string;
}

export const SCIENTIFIC_SOURCES: ScientificSource[] = [
  {
    id: 'src_1_nasa_food_systems',
    index: 1,
    title: 'NASA Space Food Systems',
    titleAr: 'أنظمة غذاء الفضاء — وكالة ناسا',
    year: '2026',
    url: 'https://www.nasa.gov/directorates/esdmd/hhp/space-food-systems/'
  },
  {
    id: 'src_2_human_adaptation',
    index: 2,
    title: 'NASA Human Adaptation to Spaceflight: The Role of Food and Nutrition',
    titleAr: 'تكيّف الإنسان مع الطيران الفضائي: دور الغذاء والتغذية (ناسا)',
    year: '2021',
    url: 'https://www.nasa.gov/wp-content/uploads/2024/08/human-adaptation-2021-final-b.pdf'
  },
  {
    id: 'src_3_nasa_eclss',
    index: 3,
    title: 'NASA Environmental Control and Life Support Systems (ECLSS)',
    titleAr: 'أنظمة التحكم البيئي ودعم الحياة (ECLSS) — ناسا',
    year: '2025',
    url: 'https://www.nasa.gov/reference/environmental-control-and-life-support-systems-eclss/'
  },
  {
    id: 'src_4_water_recovery_98',
    index: 4,
    title: 'NASA Achieves Water Recovery Milestone on ISS',
    titleAr: 'ناسا تحقق إنجاز استرجاع المياه بنسبة 98% على محطة الفضاء الدولية',
    year: '2023',
    url: 'https://www.nasa.gov/missions/station/iss-research/nasa-achieves-water-recovery-milestone-on-international-space-station/'
  },
  {
    id: 'src_5_growing_plants',
    index: 5,
    title: 'NASA Growing Plants in Space',
    titleAr: 'زراعة النباتات في الفضاء — ناسا (نظام Veggie)',
    year: '2025',
    url: 'https://www.nasa.gov/exploration-research-and-technology/growing-plants-in-space/'
  },
  {
    id: 'src_6_hrr_fn102',
    index: 6,
    title: 'NASA Human Research Roadmap FN-102',
    titleAr: 'خارطة أبحاث الإنسان — الفجوة البحثية FN-102 (الغذاء الفضائي)',
    year: '2025',
    url: 'https://humanresearchroadmap.nasa.gov/Gaps/gap.aspx?i=780'
  },
  {
    id: 'src_7_efri_elis_perchlorates',
    index: 7,
    title: 'NASA EFRI ELiS (Perchlorates in Martian Regolith)',
    titleAr: 'مشروع NASA EFRI ELiS لدراسة البيركلورات في تربة المريخ',
    year: '2025',
    url: 'https://science.nasa.gov/biological-physical/investigations/efri-elis-kpmsg/'
  },
  {
    id: 'src_8_melissa_pbr',
    index: 8,
    title: 'MELiSSA Photobioreactor',
    titleAr: 'المفاعل الضوئي الحيوي في برنامج MELiSSA الأوروبي',
    year: '2025',
    url: 'https://melissafoundation.org/the-melissa-program/research-development/photobioreactor/'
  },
  {
    id: 'src_9_melissa_flight',
    index: 9,
    title: 'MELiSSA Flight Experiments',
    titleAr: 'التجارب الفضائية لبرنامج MELiSSA (أرتميس/ISS)',
    year: '2025',
    url: 'https://melissafoundation.org/the-melissa-program/flight-experiments/'
  },
  {
    id: 'src_10_esa_planting_oxygen',
    index: 10,
    title: 'ESA Planting Oxygen',
    titleAr: 'زراعة الأكسجين بالسبيرولينا — وكالة الفضاء الأوروبية ESA',
    year: '2017',
    url: 'https://www.esa.int/Science_Exploration/Human_and_Robotic_Exploration/Research/Planting_oxygen'
  },
  {
    id: 'src_11_arthrospira_c',
    index: 11,
    title: 'ARTHROSPIRA-C, Acta Astronautica',
    titleAr: 'دراسة ARTHROSPIRA-C للسبيرولينا في الفضاء — Acta Astronautica',
    year: '2025',
    url: 'https://www.sciencedirect.com/science/article/pii/S009457652400657X'
  },
  {
    id: 'src_12_smith_zwart',
    index: 12,
    title: 'Smith & Zwart, Nutrition as Fuel for Human Spaceflight, Physiology 36(5)',
    titleAr: 'التغذية كوقود لرحلات الفضاء البشرية — سميث وزوارت',
    year: '2021',
    url: 'https://doi.org/10.1152/physiol.00011.2021'
  },
  {
    id: 'src_13_nasa_eclss_tech',
    index: 13,
    title: 'NASA ISS ECLSS Technical Overview (ICES-2023-312)',
    titleAr: 'الملخص الهندسي لأنظمة ECLSS على محطة الفضاء الدولية (ناسا)',
    year: '2025',
    url: 'https://ntrs.nasa.gov/api/citations/20230008504/downloads/ICES-2023-312%20Final.pdf'
  }
];

export interface SciencePillarEntry {
  id: string;
  titleAr: string;
  titleEn: string;
  textAr: string;
  textEn: string;
  badgeType: ScienceBadgeType;
  badgeLabelAr: string;
  badgeLabelEn: string;
  sourceId: string;
}

const makeBadgeFields = (badgeType: ScienceBadgeType) => ({
  badgeType,
  badgeLabelAr: SCIENCE_BADGES[badgeType].labelAr,
  badgeLabelEn: SCIENCE_BADGES[badgeType].labelEn
});

export const SCIENCE_PILLARS: SciencePillarEntry[] = [
  {
    id: 'pillar_1_hybrid_mission',
    titleAr: '1. مهمة هجينة مغلقة (180 يوماً)',
    titleEn: '1. Hybrid Closed-Loop Mission (180 Days)',
    textAr:
      'تفترض هذه المهمة التخطيطية رائد فضاء واحداً داخل مركبة مغلقة مضغوطة لمدة 180 يوماً. تجمع المركبة بين الطعام الفضائي المخزّن كمصدر أساسي مضمون وأنظمة دعم الحياة المساعدة.',
    textEn:
      'This engineering planning model simulates 1 astronaut inside a closed pressurized spacecraft for 180 days. It pairs reliable stored space food as the primary base with supplemental life-support systems.',
    ...makeBadgeFields('PLANNING_ASSUMPTION'),
    sourceId: 'src_1_nasa_food_systems'
  },
  {
    id: 'pillar_2_stored_food',
    titleAr: '2. معايير الطعام الفضائي المخزّن ومنع الفتات',
    titleEn: '2. Stored Space Food Criteria & Zero Crumbs',
    textAr:
      'الطعام المخزّن (المجفف بالتجميد، المعقم حرارياً، المجفف، والبروتين الجاهز والمقوى) يُختار حسب أمانه الميكروبي، كثافته الغذائية، عمره الطويل، قلة وزنه، وسهولة أكله دون تطاير الفتات. التخزين الطويل قد يُضعف فيتامين C والثيامين، لذا تراقب ناسا استقرار الفيتامينات عبر الزمن.',
    textEn:
      'Stored food (freeze-dried, thermostabilized, dehydrated, and shelf-stable items) is selected for microbial safety, nutrition density, low mass, ease of preparation, acceptability, and minimal crumbs. Long storage can degrade Vitamin C and Thiamin over multi-month missions.',
    ...makeBadgeFields('ISS_PROVEN'),
    sourceId: 'src_2_human_adaptation'
  },
  {
    id: 'pillar_3_veggie_farming',
    titleAr: '3. الزراعة الفضائية المساعدة (Veggie) وتحذير المريخ',
    titleEn: '3. Supplemental Space Farming (NASA Veggie)',
    textAr:
      'نجحت ناسا في زراعة الخس (الكابوتشا) والميزونا والكيل الأحمر والكرنب الصيني على المحطة لإمداد الطاقم بالفيتامينات والألياف والتنوع النفسي، لكنها لا تكفي وحدها لإجمالي الطاقة أو البروتين. كما لا يمكن استخدام تربة المريخ مباشرة لأنها تحتوي على أملاح البيركلورات السامة.',
    textEn:
      'Lettuce, Mizuna, Red Russian Kale, and Chinese Cabbage have grown aboard the ISS as supplemental sources of vitamins, fiber, and morale—NOT total calories or protein. Raw Martian soil is toxic for direct farming because it contains Perchlorates.',
    ...makeBadgeFields('ISS_PROVEN'),
    sourceId: 'src_5_growing_plants'
  },
  {
    id: 'pillar_4_spirulina',
    titleAr: '4. المفاعل الضوئي الحيوي للسبيرولينا 🧪',
    titleEn: '4. Spirulina Experimental Photobioreactor',
    textAr:
      'تدرس أبحاث ESA/MELiSSA مفاعلات السبيرولينا الدقيقة لإنتاج كتلة حيوية غنية بالبروتين وبعض الأكسجين، لكنها تحتاج تحكماً دقيقاً في الضوء وCO2 والمغذيات والحرارة ودرجة الحموضة (pH). هذه الوحدة لا تزال تجريبية ومساعدة وليست مصدراً أساسياً مضموناً للطاقم.',
    textEn:
      'ESA MELiSSA research tests Spirulina photobioreactors to produce protein-rich biomass and oxygen using controlled light, CO2, nutrients, temperature, and pH. It remains an experimental supplemental unit rather than a guaranteed primary food supply.',
    ...makeBadgeFields('EXPERIMENTAL'),
    sourceId: 'src_8_melissa_pbr'
  },
  {
    id: 'pillar_5_water_98',
    titleAr: '5. استرجاع المياه 98% مع جهاز المحلول الملحي (Brine)',
    titleEn: '5. 98% ISS Water Recovery & Brine Processor',
    textAr:
      'تجمع المركبة ماء التنفس والعرق والبول ومياه النظافة وإعداد الطعام لإعادة تنقيتها؛ وقد بلغت محطة الفضاء الدولية نسبة استرجاع 98% في يونيو 2023 بعد إضافة مجمع Brine Processor. ومع ذلك فإن نسبة 98% ليست مضمونة لكل مركبة مستقبلية، لذلك يخصص النموذج مخزون طوارئ وأعطال.',
    textEn:
      'Spacecraft water loops recover urine, sweat, breath condensate, hygiene, and food-prep water, reaching 98% total recovery on the ISS in June 2023 with the Brine Processor Assembly. However, 98% recovery is NOT guaranteed for every future spacecraft, so emergency reserves are essential.',
    ...makeBadgeFields('ISS_PROVEN'),
    sourceId: 'src_4_water_recovery_98'
  },
  {
    id: 'pillar_6_air_eclss',
    titleAr: '6. توليد الأكسجين بالتحليل الكهربائي للماء (ECLSS)',
    titleEn: '6. Air Generation via Water Electrolysis (ECLSS)',
    textAr:
      'تُنتج أجهزة ECLSS الهندسية الأكسجين عبر التحليل الكهربائي للماء (شطر الماء إلى أكسجين وهيدروجين) مع سحب ثاني أكسيد الكربون CO2 وتنقية الهواء ومراقبة الضغط والرطوبة. النباتات والسبيرولينا عناصر مساعدة فقط، بينما تبقى المعدات الهندسية هي العمود الفقري الموثوق للتنفس.',
    textEn:
      'Engineered ECLSS hardware reliably generates oxygen by water electrolysis while scrubbing CO2 and monitoring cabin pressure and humidity. Plants and Spirulina remain supplemental helpers alongside primary mechanical life support.',
    ...makeBadgeFields('ISS_PROVEN'),
    sourceId: 'src_3_nasa_eclss'
  },
  {
    id: 'pillar_7_waste_npk',
    titleAr: '7. تدوير المخلفات العضوية واستخلاص NPK بأمان',
    titleEn: '7. Safe Waste & NPK Nutrient Recovery',
    textAr:
      'تُفرز بقايا الطعام وأوراق النباتات لتُعالج علمياً قبل استخلاص النيتروجين (N) والفوسفور (P) والبوتاسيوم (K) لمحلول الزراعة المائية. ويُمنع تماماً استخدام المخلفات البشرية غير المعالجة مباشرة في الزراعة لحماية صحة الطاقم.',
    textEn:
      'Food scraps and inedible plant biomass must be sorted and properly processed before recovering Nitrogen (N), Phosphorus (P), and Potassium (K) for hydroponics. Direct use of untreated human waste in space farming is strictly prohibited.',
    ...makeBadgeFields('ISS_PROVEN'),
    sourceId: 'src_13_nasa_eclss_tech'
  },
  {
    id: 'pillar_8_daily_assumptions',
    titleAr: '8. الافتراض التخطيطي اليومي لرائد بوزن 70 كجم',
    titleEn: '8. Daily Reference Assumptions (70 kg Astronaut)',
    textAr:
      'يستخدم المهندسون افتراضاً تخطيطياً لرائد بالغ (70 كجم): 3,000 سعرة حرارية، 105 جم بروتين (1.5 جم/كجم ضمن نطاق 1.2–1.8)، 390 جم كربوهيدرات، 113 جم دهون، و25–35 جم ألياف يومياً. هذه أرقام تخطيط هندسي للمغذيات الصافية وليست وصفة طبية أو وزن العبوات.',
    textEn:
      'Engineering planning assumes 3,000 kcal/day, 105 g protein (1.5 g/kg; 1.2–1.8 g/kg range), 390 g carbs, 113 g fats, and 25–35 g fiber for a 70 kg adult. This is a planning assumption for net nutrients—NOT a medical prescription or packaged ration weight.',
    ...makeBadgeFields('PLANNING_ASSUMPTION'),
    sourceId: 'src_12_smith_zwart'
  },
  {
    id: 'pillar_9_micronutrients',
    titleAr: '9. المغذيات الدقيقة الداعمة للعظام والمناعة',
    titleEn: '9. Key Spaceflight Micronutrients',
    textAr:
      'تساعد فيتامينات D وK وC وB12 ومعادن الكالسيوم والحديد والمغنيسيوم والبوتاسيوم والزنك مع أوميغا-3 في حماية العظام والعضلات والأعصاب والمناعة في انعدام الجاذبية. وتكمل هذه العناصر نظام التمارين اليومية دون أن تحل محل دروع الإشعاع.',
    textEn:
      'Calcium, Vitamins D, K, C, and B12, Iron, Magnesium, Potassium, Omega-3, and Zinc support bone, muscle, nerve, immune, and metabolic health in microgravity. They work together with resistive exercise and physical radiation shields.',
    ...makeBadgeFields('ISS_PROVEN'),
    sourceId: 'src_6_hrr_fn102'
  },
  {
    id: 'pillar_10_trl_caution',
    titleAr: '10. الحذر العلمي ومستوى الجاهزية التكنولوجية (TRL)',
    titleEn: '10. Scientific Caution & Technology Readiness Level (TRL)',
    textAr:
      'نجاح تجربة واحدة صغيرة في المدار المنخفض على محطة الفضاء الدولية لا يعني جاهزية النظام بالكامل لمهمة عميقة مدتها 180 يوماً. يقيس المهندسون نضج كل تقنية بمقياس مستوى الجاهزية التكنولوجية (TRL) قبل الاعتماد عليها.',
    textEn:
      'Success of a single small experiment on the ISS does not guarantee readiness for a full 180-day deep-space mission. Engineers evaluate every subsystem strictly by its Technology Readiness Level (TRL).',
    ...makeBadgeFields('PLANNING_ASSUMPTION'),
    sourceId: 'src_9_melissa_flight'
  },
  {
    id: 'pillar_11_simplified_game_rule',
    titleAr: '11. كيف بسطنا التغذية داخل لعبة أسترونوتري؟',
    titleEn: '11. Simplified Game Nutrition Rules',
    textAr:
      'لتسهيل اللعب للأطفال بعمر 7–12 سنة، حولنا الحسابات الهندسية إلى مؤشرات لونية (بروتين، كربوهيدرات، دهون صحية، فيتامينات، وألياف) وصندوق حمولة واضح مع إبقاء القيم العلمية الدقيقة ظاهرة عند الشرح.',
    textEn:
      'For players aged 7–12, complex metabolic balances are simplified into visual progress bars for macros, vitamins, fiber, and cargo mass. Every simplified rule is clearly tagged as a game simplification.',
    ...makeBadgeFields('GAME_RULE'),
    sourceId: 'src_1_nasa_food_systems'
  }
];

export const DAILY_REFERENCE_ASSUMPTIONS = {
  bodyMassKg: 70,
  missionDays: 180,
  astronautCount: 1,
  energyKcal: 3000,
  proteinGrams: 105,
  proteinPerKg: 1.5,
  proteinRangePerKg: '1.2–1.8 g/kg',
  carbsGrams: 390,
  fatsGrams: 113,
  fiberGramsRange: '25–35 g',
  disclaimerAr:
    '📐 افتراض تخطيطي هندسي لرائد فضاء بالغ (70 كجم) يمثل صافي المغذيات وليس وصفة طبية أو إجمالي وزن التغليف.',
  disclaimerEn:
    'Engineering planning assumption for a 70 kg adult (net nutrients, not medical prescription or packaged food weight).'
} as const;

export const ISS_WATER_MILESTONE = {
  recoveryPercent: 98,
  dateLabel: 'June 2023 / يونيو 2023',
  systemName: 'Brine Processor Assembly + Water Recovery System',
  caveatAr:
    '⚠️ تنبيه علمي: نسبة الاسترجاع 98% تحققت على محطة الفضاء الدولية (ISS) وليست مضمونة تلقائياً لكل مركبة مستقبلية، لذا يظل مخزون الطوارئ ضرورياً.',
  caveatEn:
    'ISS milestone achieved with Brine Processor Assembly (June 2023); NOT guaranteed for every future spacecraft.'
} as const;

export interface LinkCheckRecord {
  statusCode: number | null;
  reachable: boolean;
  reviewRequired: boolean;
  note: string;
}

const storedLinkResults = (linkStatusData?.results || {}) as Record<string, LinkCheckRecord>;

export function getSourceVerificationStatus(sourceId: string): LinkCheckRecord | null {
  return storedLinkResults[sourceId] || null;
}

export const SCIENCE_LINK_CHECKED_AT: string | null = linkStatusData?.checkedAt || null;
