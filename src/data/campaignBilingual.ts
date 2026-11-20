import type {
  AppLanguage,
  CadetAgeGroup,
  CampaignLevelId,
  CampaignProgressState,
  MiniGameId
} from '../types/game';
import { CAMPAIGN_LEVELS, MINI_GAME_SPECS, SpatialRoomNode } from './campaignLevels';
import { tr, adaptByAge } from '../utils/i18n';

export type NasaDatasetTag = 'OSDR' | 'DONKI' | 'NeoWs' | 'ECLSS' | 'NASA Food Lab' | 'Artemis DSN';

export interface MiniGameBriefing {
  datasetTag: NasaDatasetTag;
  icons: [string, string, string];
  en: [string, string];
  ar: [string, string];
  youngTipEn: string;
  youngTipAr: string;
  teenTipEn: string;
  teenTipAr: string;
}

export const LEVEL_TITLES_BILINGUAL: Record<
  CampaignLevelId,
  { badge: string; shortEn: string; shortAr: string; titleEn: string; titleAr: string; subtitleEn: string; subtitleAr: string }
> = {
  1: {
    badge: '🚀',
    shortEn: 'Earth Pad',
    shortAr: 'منصة الأرض',
    titleEn: 'Node 1: Earth Launchpad Prep',
    titleAr: 'المحطة 1: التجهيز في منصة إطلاق الأرض',
    subtitleEn: '4 guided stations from the Space Kitchen to the Rocket Launchpad',
    subtitleAr: '4 محطات متسلسلة من المطبخ الفضائي حتى منصة إطلاق الصاروخ للقمر'
  },
  2: {
    badge: '🛰️',
    shortEn: 'ISS Orbit',
    shortAr: 'محطة الفضاء',
    titleEn: 'Node 2: ISS Low-Earth Orbit',
    titleAr: 'المحطة 2: محطة الفضاء الدولية 0G',
    subtitleEn: '3 orbital microgravity challenges & NASA NeoWs asteroid radar navigation',
    subtitleAr: '3 محطات متسلسلة في انعدام الجاذبية وصولاً إلى مدار القمر'
  },
  3: {
    badge: '🌕',
    shortEn: 'Moon Base',
    shortAr: 'قاعدة القمر',
    titleEn: 'Node 3: Moon Shackleton Base',
    titleAr: 'المحطة 3: قاعدة القمر الحيوية شاكلتون',
    subtitleEn: '4 lunar biodome operations: ECLSS water, ARED workouts, DONKI shield & geology',
    subtitleAr: '4 محطات قمرية: تدوير المياه، تمارين العظام، درع DONKI، وجمع العينات'
  },
  4: {
    badge: '🪂',
    shortEn: 'Re-Entry',
    shortAr: 'العودة للأرض',
    titleEn: 'Node 4: Orion Earth Re-Entry',
    titleAr: 'المحطة 4: كبسولة العودة والهبوط',
    subtitleEn: '3 critical return stations: cargo lock, PICA-X heat shield & parachute splashdown',
    subtitleAr: '3 محطات حاسمة: تأمين العينات، الدرع الحراري، ونشر مظلات الهبوط'
  }
};

export const ROOM_OBJECTIVE_EN: Record<string, string> = {
  food_storage: 'Pack crumb-free space meals with balanced nutrients',
  equipment_room: 'Inspect flight hardware and calibrate SPACE-FIT X',
  medical_room: 'Verify hydration, sleep and flight surgeon clearance',
  launch_area: 'Complete pre-flight check and ignite launch countdown',
  corridor: 'Glide along orbital handrails safely in zero gravity',
  communication_room: 'Steer clear of asteroids on NASA NeoWs radar',
  water_recycling_room: 'Restore 98% ECLSS water filtration and hydroponics',
  fitness_room: 'Train bones with SPACE-FIT X & pack EVA tools',
  emergency_shelter: 'Balance base power against NASA DONKI solar waves',
  lunar_exploration_zone: 'Collect 3 lunar samples and authorize Earth return',
  cargo_sample_storage: 'Verify lunar sample containment and life support',
  systems_check_station: 'Steer the PICA-X heat shield safely through plasma',
  central_corridor: 'Deploy Orion parachutes cleanly for ocean splashdown'
};

export const MINI_GAME_BRIEFINGS: Record<MiniGameId, MiniGameBriefing> = {
  l1_food_prep: {
    datasetTag: 'NASA Food Lab',
    icons: ['🍯', '🚫🍪', '📦'],
    en: [
      'In zero gravity, dry crumbs float into air filters and electronics — that is why NASA packs sticky pastes and squeeze pouches like Sinai Honey.',
      'Select 4+ crumb-free Egyptian & space foods to fill protein, carbs, healthy fats, fiber, and vitamins!'
    ],
    ar: [
      'في انعدام الجاذبية يتطاير الفتات داخل الفلاتر والأجهزة، لذلك تعتمد ناسا معاجين وأكياس ضغط مثل عسل سيناء والمش.',
      'اختر 4+ أطعمة آمنة بلا فتات لموازنة البروتين والكربوهيدرات والفيتامينات والألياف!'
    ],
    youngTipEn: 'Pick yummy foods with zero crumbs (like Sinai Honey!) and avoid crunchy snacks.',
    youngTipAr: 'اختر أكلات لذيذة بدون فتات (مثل عسل سيناء) وتجنب المقرمشات.',
    teenTipEn: 'Optimize caloric density and amino/micronutrient diversity inside the 20 kg stowage limit.',
    teenTipAr: 'وازن السعرات والبروتين والألياف والدهون الصحية ضمن حد حمولة 20 كجم.'
  },
  l1_equipment_prep: {
    datasetTag: 'Artemis DSN',
    icons: ['🧰', '⚡', '🦺'],
    en: [
      'Every kilogram launched into space costs rocket fuel, so NASA astronauts reject faulty batteries and heavy non-essential toys.',
      'Check each item carefully, calibrate your SPACE-FIT X suit telemetry, and pack only flight-certified gear.'
    ],
    ar: [
      'كل كيلوجرام إضافي في الصاروخ يستهلك وقوداً، لذا يستبعد رواد الفضاء البطاريات التالفة والألعاب غير الضرورية.',
      'افحص كل أداة بدقة، وعاير بدلة SPACE-FIT X، واحزم المعدات السليمة فقط.'
    ],
    youngTipEn: 'Pack safety gear you really need and say NO to broken batteries or game consoles!',
    youngTipAr: 'احزم أدوات الأمان الضرورية وارفض البطاريات التالفة والألعاب!',
    teenTipEn: 'Mass budgeting + Li-ion thermal safety screening prior to Orion payload integration.',
    teenTipAr: 'ترشيد الكتلة وفحص سلامة بطاريات الليثيوم قبل دمج الحمولة.'
  },
  l1_medical_check: {
    datasetTag: 'OSDR',
    icons: ['🩺', '💧', '😴'],
    en: [
      'Before launch, Flight Surgeons inspect crew hydration and sleep quality so astronauts handle 3G+ launch acceleration safely.',
      'Boost Hydration and Rest to 100% on the body telemetry meters to earn your medical flight clearance.'
    ],
    ar: [
      'يفحص أطباء الطيران الترطيب وساعات النوم قبل الإقلاع لتحمّل تسارع الصاروخ.',
      'ارفع مؤشرات الترطيب والنوم على عدادات الجسم إلى 100% للحصول على التصريح الطبي.'
    ],
    youngTipEn: 'Tap Drink Water and Deep Sleep until every body meter turns bright green!',
    youngTipAr: 'اضغط شرب الماء والنوم الكافي حتى تتحول مؤشرات الجسم للأخضر!',
    teenTipEn: 'Confirm euvolemic hydration baseline and circadian readiness per Flight Surgeon protocol.',
    teenTipAr: 'اعتمد توازن السوائل والاستعداد العصبي وفق بروتوكول طب الطيران.'
  },
  l1_spaceship_inspect: {
    datasetTag: 'Artemis DSN',
    icons: ['🛸', '🫧', '🔒'],
    en: [
      'The spacecraft acts like a sealed life-support bubble protecting astronauts from the vacuum of space.',
      'Inspect oxygen pressure, fuel cells, comms, CO2 scrubbers, and hatch seals until every gauge reads green.'
    ],
    ar: [
      'المركبة الفضائية كبسولة محكمة تحمي الرواد من فراغ الفضاء عبر الأكسجين والطاقة وتنقية الهواء.',
      'افحص الأكسجين والطاقة والرادار وCO₂ وأبواب الكابينة حتى تكتمل بنسبة 100%.'
    ],
    youngTipEn: 'Tap all 5 ship check cards to turn every light green before launch!',
    youngTipAr: 'اضغط على البطاقات الخمس لتضيء أنظمة المركبة بالأخضر!',
    teenTipEn: 'Verify redundant Orion ECLSS loops, bus voltage, and cabin hatch pressure interlocks.',
    teenTipAr: 'تحقق من دوائر دعم الحياة الاحتياطية وأقفال ضغط الأبواب.'
  },
  l1_mission_launch: {
    datasetTag: 'Artemis DSN',
    icons: ['🚀', '📡', '🔥'],
    en: [
      'Launch Control verifies that navigation telemetry locks onto the Moon transfer orbit before igniting main engines.',
      'Sync Earth-Moon navigation, confirm green systems, and fire the 3-2-1 rocket countdown!'
    ],
    ar: [
      'يتحقق مركز الإطلاق من تطابق مدار الانتقال القمري قبل تشغيل المحركات الرئيسية.',
      'اضبط التوجيه الأرضي-القمري وابدأ العد التنازلي للانطلاق!'
    ],
    youngTipEn: 'Press Sync Radar first, then tap Launch Rocket for blastoff!',
    youngTipAr: 'اضغط مزامنة التوجيه أولاً ثم ابدأ العد التنازلي للانطلاق!',
    teenTipEn: 'Lock Trans-Lunar Injection (TLI) guidance telemetry prior to SRB ignition.',
    teenTipAr: 'طابق مسار حقن الانتقال القمري TLI قبل إشعال المعززات.'
  },
  l2_zerog_movement: {
    datasetTag: 'OSDR',
    icons: ['🧑‍🚀', '🚧', '⚖️'],
    en: [
      'In zero gravity (Newton’s 1st Law), once you push off a wall, you keep drifting until another force stops you!',
      'Push gently, then grab handrails so you reach the airlock smoothly at or below 1.2 m/s.'
    ],
    ar: [
      'في انعدام الجاذبية (قانون نيوتن الأول)، إذا دفعت نفسك تستمر بالحركة دون توقف حتى تمسك بشيء!',
      'ادفع برفق ثم امسك الدرابزين لتصل للبوابة بسرعة ≤ 1.2 م/ث.'
    ],
    youngTipEn: 'Give 1 gentle push, then tap Grab Handrail before crashing into the exit!',
    youngTipAr: 'ادفع برفق ثم اضغط امسك الدرابزين لتتوقف بأمان!',
    teenTipEn: 'Control linear momentum p = mv along the zero-friction ISS Z-axis corridor.',
    teenTipAr: 'اضبط كمية التحرك الخطية في غياب الاحتكاك داخل الممر المداري.'
  },
  l2_secure_objects: {
    datasetTag: 'NASA Food Lab',
    icons: ['🧲', '🍱', '🔧'],
    en: [
      'Inside a microgravity cabin, any loose screwdriver or food pouch floats around like a missile hazard!',
      'Tap each floating item and snap it securely into its matching velcro locker.'
    ],
    ar: [
      'في 0G أي مفك أو عبوة سائبة قد تطفو وتصطدم بالرواد أو لوحات القيادة!',
      'اضغط على كل غرض طافٍ ثم ثبته داخل خزانته المطابقة.'
    ],
    youngTipEn: 'Click any floating tool on top, then click the matching locker box below.',
    youngTipAr: 'اضغط الغرض الطافي بالأعلى ثم اضغط خزانته المطابقة بالأسفل.',
    teenTipEn: 'Zero-G FOD (Foreign Object Debris) mitigation using crew stowage restraints.',
    teenTipAr: 'منع الحطام السائب FOD بتأمين الحمولة داخل وحدات التخزين.'
  },
  l2_balanced_meal: {
    datasetTag: 'NASA Food Lab',
    icons: ['🧀', '🍯', '🥬'],
    en: [
      'Astronauts need protein for muscles, fast carbs for energy, healthy fats for cells, and leafy greens for vitamins.',
      'Build a complete 4-group Egyptian/Sinai space tray to keep the astronaut body meters strong in orbit.'
    ],
    ar: [
      'يحتاج الرواد للبروتين لحماية العضلات، والكربوهيدرات للطاقة، والدهون الصحية، والخضروات للفيتامينات.',
      'كوّن صينية متكاملة من المجموعات الأربع لترفع مؤشرات جسم الرائد في المدار.'
    ],
    youngTipEn: 'Tap all 4 food group cards to fill every bar on the astronaut meter!',
    youngTipAr: 'اختر المجموعات الأربع لتمتلئ جميع عدادات الجسم في الصينية!',
    teenTipEn: 'Balance macronutrients + bone-protective vitamins under microgravity metabolic stress.',
    teenTipAr: 'حقق توازن الماكروز والفيتامينات تحت إجهاد التمثيل الغذائي المداري.'
  },
  l2_hydration: {
    datasetTag: 'OSDR',
    icons: ['💧', '🥤', '🧠'],
    en: [
      'Per NASA OSDR Fluid Shift studies, body fluids move toward the head in 0G, making hydration timing tricky.',
      'Sip smoothly from the sealed valve straw and pause to swallow when droplets appear!'
    ],
    ar: [
      'وفق أبحاث NASA OSDR تنتقل السوائل للرأس في 0G، لذا يجب شرب الماء ببطء وبكميات مقننة.',
      'اضغط للشرب من الكيس المختوم وتوقف للبلع حتى لا تتطاير القطرات!'
    ],
    youngTipEn: 'Take short sips from the sealed pouch and stop right on the target line!',
    youngTipAr: 'خذ رشفات هادئة وتوقف عند العلامة الآمنة!',
    teenTipEn: 'Manage cephalad fluid shift hydration using valve-sealed potable water bags.',
    teenTipAr: 'إدارة الترطيب مع تغير توزيع السوائل للرأس عبر أكياس الصمامات المحكمة.'
  },
  l2_motion_sickness: {
    datasetTag: 'OSDR',
    icons: ['🛌', '🩺', '⚡'],
    en: [
      'Space Adaptation Syndrome happens when your inner ear feels confused in weightlessness during the first 48 hours.',
      'Diagnose the cause, rest in anchored sleep bags, and alert the Ground Flight Surgeon.'
    ],
    ar: [
      'يحدث دوار الفضاء عند ارتباك الأذن الداخلية في غياب اتجاه الجاذبية خلال أول يومين.',
      'شخّص الأعراض، استرح في كيس النوم المثبت، وأبلغ طبيب الرحلة الأرضي.'
    ],
    youngTipEn: 'Follow the 3 calm recovery cards in order: Diagnose -> Rest -> Call Doctor!',
    youngTipAr: 'اتبع الخطوات الثلاث بالترتيب: التشخيص ثم الراحة ثم إبلاغ الطبيب!',
    teenTipEn: 'Address neurovestibular mismatch via sleep-restraint stabilization and telemedicine.',
    teenTipAr: 'علاج اضطراب الأذن الداخلية بالتثبيت النومي والتطبيب عن بُعد.'
  },
  l2_systems_neows: {
    datasetTag: 'NeoWs',
    icons: ['☄️', '📡', '🌕'],
    en: [
      'NASA’s NeoWs (Near-Earth Object Web Service) tracks asteroids like 2010 PK so spacecraft avoid crossing debris corridors.',
      'Pilot through the live NeoWs Asteroid Dodge radar lanes and verify all 5 arrival systems!'
    ],
    ar: [
      'يتابع نظام NASA NeoWs الكويكبات القريبة مثل 2010 PK لتتجنب المركبات مسارات الشظايا.',
      'تجنّب صخور الكويكب في رادار NeoWs الحي وافحص الأنظمة الخمسة للهبوط على القمر!'
    ],
    youngTipEn: 'Use Up/Down buttons to dodge floating asteroid rocks while systems lock on!',
    youngTipAr: 'استخدم أزرار أعلى/أسفل لتفادي صخور الكويكب أثناء فحص الأنظمة!',
    teenTipEn: 'Combine NeoWs close-approach ephemeris telemetry with active orbital corridor dodging.',
    teenTipAr: 'ادمج بيانات اقتراب كويكب NeoWs مع المناورة الآمنة عبر الممر المداري.'
  },
  l3_resistance_training: {
    datasetTag: 'OSDR',
    icons: ['🏋️', '🦴', '⚡'],
    en: [
      'NASA OSDR (OSD-102) proves astronauts lose bone density and muscle strength rapidly without heavy resistance exercise.',
      'Complete Leg, Arm & Core reps in your SPACE-FIT X suit to boost the Bone & Muscle meters and harvest energy!'
    ],
    ar: [
      'تؤكد بيانات NASA OSDR فقدان العظام والعضلات دون تمارين مقاومة يومية في الفضاء والقمر.',
      'نفّذ تمارين الأرجل والذراعين والجذع لترفع مؤشر العظام وتحصد طاقة حركية ببدلة SPACE-FIT X!'
    ],
    youngTipEn: 'Tap the big workout button to do 3 Leg, 3 Arm, and 3 Core reps!',
    youngTipAr: 'اضغط زر التمرين لإتمام الأرجل ثم الذراعين ثم الجذع!',
    teenTipEn: 'Joint-specific cable load triggers piezoelectric harvesting while countering osteopenia.',
    teenTipAr: 'مقاومة المفاصل تقاوم فقدان الكتلة العظمية وتولد طاقة حركية للبطارية.'
  },
  l3_water_recycling: {
    datasetTag: 'ECLSS',
    icons: ['🚰', '🧽', '💧'],
    en: [
      'In June 2023, the ISS ECLSS achieved 98% water recovery by purifying sweat, breath condensation, and wastewater.',
      'Isolate the valve, swap the clogged carbon filter, and watch Filter Cleanliness hit 98% purity!'
    ],
    ar: [
      'حققت محطة الفضاء ISS استرجاع 98% من المياه في يونيو 2023 بتقنيات ECLSS.',
      'اعزل الصمام واستبدل الفلتر الكربوني ليرتفع مؤشر نظافة الفلتر ونقاء الماء إلى 98%!'
    ],
    youngTipEn: 'Complete the 4 numbered pipe steps in order to clean the water tank!',
    youngTipAr: 'نفّذ خطوات الصيانة الأربع بالترتيب لتنقية خزان المياه!',
    teenTipEn: 'Simulated brine-processing + multi-filtration loop maintenance (with experimental caveat).',
    teenTipAr: 'صيانة حلقة معالجة المحلول المائي والترشيح الكربوني متعددة المراحل.'
  },
  l3_solar_storm: {
    datasetTag: 'DONKI',
    icons: ['☀️', '🌊', '🛡️'],
    en: [
      'NASA DONKI tracks real Coronal Mass Ejections (CME) that blast high-energy solar proton waves across the Moon.',
      'Halt Moonwalks, route >=45% power to Radiation Shields & >=30% to ECLSS, and deflect the incoming storm wave!'
    ],
    ar: [
      'يرصد نظام NASA DONKI الانبعاثات الشمسية التي ترسل موجات إشعاعية عالية نحو سطح القمر.',
      'أوقف السير القمري ووجّه >=45% للدروع و>=30% للماء/الهواء لصد الموجات الشمسية!'
    ],
    youngTipEn: 'Stop EVA outside, move Shield slider >= 45% + Water >= 30%, and lock the shelter!',
    youngTipAr: 'أوقف العمل بالخارج وارفع شريط الدروع >= 45% والمياه >= 30% واحتمِ بالملجأ!',
    teenTipEn: 'Power trade-off optimization under CME radiation flux: crew survival + ECLSS over grow lights.',
    teenTipAr: 'موازنة حمل الطاقة خلال تدفق الجسيمات الشمسية: أولوية الدروع ودعم الحياة.'
  },
  l3_eva_prep: {
    datasetTag: 'Artemis DSN',
    icons: ['👨‍🚀', '🔨', '🛍️'],
    en: [
      'While SPACE-FIT X is an inside training suit (IVA), stepping into Moon vacuum requires a pressurized Artemis EVA suit.',
      'Assemble all 5 EVA suit layers and pack the 4 geology tools needed for rock sampling!'
    ],
    ar: [
      'بدلة SPACE-FIT X للتدريب داخل المحطة، أما السير على القمر فيتطلب بدلة ضغط فضائية خالية من التسريب EVA.',
      'ركّب أجزاء البدلة القمرية الخمسة واحزم الأدوات الجيولوجية الأربع!'
    ],
    youngTipEn: 'Click all 5 blue suit pieces and all 4 yellow science tools before heading outside!',
    youngTipAr: 'اختر أجزاء البدلة الخمسة والأدوات الأربع قبل الخروج لسطح القمر!',
    teenTipEn: 'Verify 4.3 PSI EVA suit pressure integrity and full Artemis geological toolkit.',
    teenTipAr: 'تأكد من ضغط 4.3 PSI للبدلة الخارجية واكتمال عدة الجيولوجيا القمرية.'
  },
  l3_lunar_samples: {
    datasetTag: 'Artemis DSN',
    icons: ['🪨', '🌙', '👜'],
    en: [
      'Lunar geology lets scientists study craters under 1/6th Earth gravity (0.16G) using specialized scoops, hammers & tongs.',
      'Visit each crater site and collect Basalt, Regolith Dust & Crater Pebbles with your packed tools!'
    ],
    ar: [
      'في جاذبية القمر السدسية (0.16G) يستخدم الرواد المطرقة والمجرفة والملقط لجمع عينات البازلت والريجوليث.',
      'زر مواقع القمر الثلاث واجمع العينات باستخدام الأدوات التي حزمتها!'
    ],
    youngTipEn: 'Tap all 3 Moon sample craters to fill your science bag before logging results!',
    youngTipAr: 'اضغط على مواقع العينات الثلاث لجمع صخور القمر وتوثيقها!',
    teenTipEn: 'LROC geological traverse across 0.16G basalt/regolith sites with EVA O2 budget.',
    teenTipAr: 'جمع عينات البازلت والتربة القمرية ضمن مخزون الأكسجين في 0.16G.'
  },
  l4_departure_prep: {
    datasetTag: 'Artemis DSN',
    icons: ['📦', '🫧', '🔋'],
    en: [
      'Before leaving Lunar orbit, astronauts seal every Moon rock canister and inspect capsule life support.',
      'Check all 5 return capsule readiness switches and verify your lunar cargo is locked down.'
    ],
    ar: [
      'قبل مغادرة مدار القمر، يتأكد الرواد من إحكام إغلاق حاويات الصخور القمرية وأنظمة الكبسولة.',
      'راجع مؤشرات المغادرة الخمسة وتأكد من تثبيت عينات القمر بإحكام.'
    ],
    youngTipEn: 'Check off all 5 green readiness cards to clear the capsule for departure!',
    youngTipAr: 'فعّل البطاقات الخمس حتى تجهز الكبسولة لرحلة العودة!',
    teenTipEn: 'Verify sample return containment seals and Orion service-module consumables.',
    teenTipAr: 'تأمين حاويات العينات ومستهلكات وحدة الخدمة قبل حرق المغادرة.'
  },
  l4_navigation_earth: {
    datasetTag: 'Artemis DSN',
    icons: ['🧭', '📡', '🌍'],
    en: [
      'Even at the speed of light, radio signals from the Moon (384,400 km away) take ~1.3 seconds to reach Earth!',
      'Steer your return corridor between -4° and +4° and observe the real Deep Space Network signal delay.'
    ],
    ar: [
      'تستغرق إشارات الراديو من القمر للأرض (~384,400 كم) نحو 1.3 ثانية بسرعة الضوء!',
      'اضبط زاوية المسار بين -4° و+4° وأرسل الإشارة لمركز التحكم الأرضي.'
    ],
    youngTipEn: 'Slide the angle near 0° until the dot turns green, then press Send Signal!',
    youngTipAr: 'حرّك الشريط نحو الصفر ليضيء المسار بالأخضر ثم أرسل الإشارة!',
    teenTipEn: 'Earth Trans-Earth Injection (TEI) trajectory alignment + speed-of-light DSN RTT.',
    teenTipAr: 'مواءمة مسار العودة TEI واختبار زمن انتقال إشارة الفضاء العميق.'
  },
  l4_spacecraft_emergency: {
    datasetTag: 'Artemis DSN',
    icons: ['🔧', '⚡', '🚨'],
    en: [
      'Deep-space crews must isolate and diagnose voltage drops, antenna drift, or CO2 valve faults quickly without waiting on ground teams.',
      'Run the Fault Diagnostic Scanner, then choose the matching repair tool!'
    ],
    ar: [
      'يعتمد رواد الفضاء على تشخيص الأعطال بأنفسهم سريعاً دون انتظار تدخل الأرض المباشر.',
      'شغّل فاحص الأعطال أولاً ثم اختر أداة الصيانة المطابقة للعطل!'
    ],
    youngTipEn: 'Tap Scan Fault first, then pick the tool icon that matches the problem!',
    youngTipAr: 'اضغط زر التشخيص أولاً ثم اختر الأداة المناسبة للمشكلة!',
    teenTipEn: 'Rapid fault-tree isolation across power bus, S-band gimbal, and CO2 scrubber loop.',
    teenTipAr: 'عزل الأعطال السريع لدوائر الجهد والهوائي وصمام ثاني أكسيد الكربون.'
  },
  l4_earth_reentry: {
    datasetTag: 'OSDR',
    icons: ['🔥', '🛡️', '🌍'],
    en: [
      'Re-entering Earth’s atmosphere compresses air into ~1,600°C plasma, shielded by PICA-X thermal tiles while crew experience high G-loads.',
      'Inspect all heat-shield tiles, start re-entry, and keep capsule angle inside the green safety corridor!'
    ],
    ar: [
      'عند دخول الغلاف الجوي ترتفع الحرارة إلى ~1600°C فيحمي الدرع الحراري الكبسولة وسط جاذبية عالية.',
      'افحص بلاطات الدرع الحراري ثم أبقِ زاوية الكبسولة في المنطقة الخضراء!'
    ],
    youngTipEn: 'Inspect the 3 heat tiles, start entry, and tap Left/Right to keep angle green!',
    youngTipAr: 'افحص البلاطات الثلاث ثم حافظ على الزاوية في المنطقة الخضراء!',
    teenTipEn: 'Manage PICA-X ablative pitch corridor against atmospheric shear & peak G-loading.',
    teenTipAr: 'ضبط زاوية الهجوم للدرع الحراري PICA-X أثناء ذروة التسارع والبلازما.'
  },
  l4_safe_landing: {
    datasetTag: 'Artemis DSN',
    icons: ['🪂', '🌊', '🎉'],
    en: [
      'In the final descent over the ocean, drogue chutes stabilize the capsule before huge main parachutes slow splashdown.',
      'Deploy Drogue Chutes, then Main Parachutes, and celebrate Mission Accomplished back on Earth!'
    ],
    ar: [
      'في المرحلة الأخيرة فوق المحيط تفتح المظلات الكابحة ثم الرئيسية لتهدئة السرعة حتى الهبوط الآمن.',
      'افتح المظلات الكابحة ثم الرئيسية واحتفل بعودة البعثة إلى كوكب الأرض!'
    ],
    youngTipEn: 'Tap Deploy Drogue Chutes, then Main Parachutes when prompted!',
    youngTipAr: 'افتح المظلات الكابحة ثم الرئيسية للهبوط الآمن على المحيط!',
    teenTipEn: 'Staged aerodynamic deceleration sequence from terminal velocity to safe splashdown.',
    teenTipAr: 'تسلسل فتح المظلات لتهدئة السرعة الانتهائية حتى الهبوط المائي السليم.'
  }
};

export interface SequentialMissionTarget {
  stepNumber: number;
  totalSteps: number;
  doneCount: number;
  activeMiniGameId: MiniGameId | null;
  activeRoom: SpatialRoomNode | null;
  requiresReturnAuth: boolean;
  isAllDone: boolean;
  bannerEn: string;
  bannerAr: string;
  roboEn: string;
  roboAr: string;
}

const SHORT_ROBO_STEP_LINES: Partial<Record<MiniGameId, { en: string; ar: string }>> = {
  l1_food_prep: {
    en: 'Hop in the Buggy and drive to the Space Kitchen! 🚙',
    ar: 'اركب المركبة وانطلق إلى المطبخ الفضائي! 🚙'
  },
  l1_equipment_prep: {
    en: 'Snacks packed! Next: drive to the Suit Hangar! ✨',
    ar: 'جهزنا الطعام! الآن: انطلق لحظيرة البدلة! ✨'
  },
  l1_medical_check: {
    en: 'Suit ready! Next: visit the Medical Clinic! 🩺',
    ar: 'البدلة جاهزة! التالي: زر العيادة الطبية! 🩺'
  },
  l1_mission_launch: {
    en: 'All clear! Head to the Rocket Pad for liftoff! 🚀',
    ar: 'كل شيء جاهز! اتجه لمنصة الصاروخ للإقلاع! 🚀'
  },
  l2_zerog_movement: {
    en: 'Welcome to Zero-G! Glide into the ISS Airlock! 🧑‍🚀',
    ar: 'أهلاً في انعدام الجاذبية! ادخل غرفة معادلة الضغط! 🧑‍🚀'
  },
  l2_balanced_meal: {
    en: 'Great glide! Next: pack your orbital tray in the Galley! 🍱',
    ar: 'حركة رائعة! التالي: جهّز وجبتك في المطبخ المداري! 🍱'
  },
  l2_systems_neows: {
    en: 'Tray ready! Head to Radar Deck to dodge asteroids! ☄️',
    ar: 'الوجبة جاهزة! اتجه للرادار لتفادي الكويكبات! ☄️'
  },
  l3_water_recycling: {
    en: 'Touchdown on the Moon! First: clean water at Hydroponics! 💧',
    ar: 'هبطنا على القمر! أولاً: نقِّ المياه في محطة الزراعة! 💧'
  },
  l3_resistance_training: {
    en: 'Water pure! Next: train muscles in the Fitness Bay! 🏋️',
    ar: 'المياه نقية! التالي: درّب عضلاتك في صالة اللياقة! 🏋️'
  },
  l3_solar_storm: {
    en: 'Solar alert! Rush to the Storm Shield Console! ☀️',
    ar: 'تنبيه شمسي! أسرع إلى وحدة درع العاصفة! ☀️'
  },
  l3_lunar_samples: {
    en: 'Storm blocked! Drive the 6x6 Rover to collect Moon rocks! 🪨',
    ar: 'صددنا العاصفة! قد المركبة السداسية لجمع صخور القمر! 🪨'
  },
  l4_departure_prep: {
    en: 'Welcome to Mars Canyon! Lock samples in Cargo Bay! 📦',
    ar: 'أهلاً في وادي المريخ! ثبّت العينات في مخزن الشحن! 📦'
  },
  l4_earth_reentry: {
    en: 'Cargo locked! Check the Heat Shield for Earth reentry! 🔥',
    ar: 'تم تأمين الشحن! افحص الدرع الحراري للعودة للأرض! 🔥'
  },
  l4_safe_landing: {
    en: 'Final step! Deploy Orion parachutes for splashdown! 🪂',
    ar: 'الخطوة الأخيرة! افتح مظلات أوريون للهبوط الآمن! 🪂'
  }
};

export const SHORT_WORLD_HUB_ROBO_LINES: Record<CampaignLevelId, { en: string; ar: string }> = {
  1: {
    en: 'Follow the golden arrow to Earth Launchpad! 🚀',
    ar: 'اتبع السهم الذهبي إلى بوابة منصة الأرض! 🚀'
  },
  2: {
    en: 'Earth complete! Enter the ISS Orbit Portal ahead! 🛰️',
    ar: 'اكتملت الأرض! ادخل بوابة محطة الفضاء أمامك! 🛰️'
  },
  3: {
    en: 'Orbit mastered! Head into the Moon Base Portal! 🌕',
    ar: 'أتممت المدار! انطلق إلى بوابة قاعدة القمر! 🌕'
  },
  4: {
    en: 'Moon mission done! Enter the Final Return Portal! 🪂',
    ar: 'أنجزت مهمة القمر! ادخل بوابة العودة النهائية! 🪂'
  }
};

export function getNextSequentialMissionTarget(
  levelId: CampaignLevelId,
  campaign: CampaignProgressState
): SequentialMissionTarget {
  const spec = CAMPAIGN_LEVELS[levelId];
  const miniGames = spec.miniGames;
  const totalSteps = miniGames.length;
  const doneCount = miniGames.filter((id) => campaign.completedMiniGames.includes(id)).length;
  const firstPendingIdx = miniGames.findIndex((id) => !campaign.completedMiniGames.includes(id));

  if (firstPendingIdx === -1) {
    if (levelId === 3 && !campaign.l3ReturnAuthorized) {
      const mcRoom = spec.rooms.find((r) => r.consoleAction === 'l3_return_auth') || spec.rooms[0];
      return {
        stepNumber: totalSteps,
        totalSteps,
        doneCount,
        activeMiniGameId: null,
        activeRoom: mcRoom,
        requiresReturnAuth: true,
        isAllDone: false,
        bannerEn: `Final Step: Authorize Earth Return`,
        bannerAr: `الخطوة الأخيرة: اعتمد إذن العودة للأرض`,
        roboEn: 'Rocks collected! Tap Lunar Control to authorize return! 🛸',
        roboAr: 'جمعنا الصخور! اضغط مركز القيادة لاعتماد العودة! 🛸'
      };
    }

    return {
      stepNumber: totalSteps,
      totalSteps,
      doneCount,
      activeMiniGameId: null,
      activeRoom: null,
      requiresReturnAuth: false,
      isAllDone: true,
      bannerEn: `Stage ${levelId} Complete (${totalSteps}/${totalSteps})!`,
      bannerAr: `اكتملت المرحلة ${levelId} (${totalSteps}/${totalSteps})!`,
      roboEn:
        levelId === 1
          ? 'Earth ready! Tap Launch Rocket to blast into Orbit! 🚀'
          : `Awesome! Stage ${levelId} complete — advance to the next world! 🎉`,
      roboAr:
        levelId === 1
          ? 'الأرض جاهزة! اضغط إقلاع الصاروخ للانطلاق للمدار! 🚀'
          : `رائع! اكتملت المرحلة ${levelId} — انتقل للعالم التالي! 🎉`
    };
  }

  const activeMiniGameId = miniGames[firstPendingIdx];
  const mgSpec = MINI_GAME_SPECS[activeMiniGameId];
  const activeRoom =
    spec.rooms.find((r) => r.id === mgSpec.roomId) ||
    spec.rooms.find((r) => r.miniGameId === activeMiniGameId) ||
    spec.rooms[0];

  const stepNumber = firstPendingIdx + 1;
  const shortRobo = SHORT_ROBO_STEP_LINES[activeMiniGameId] || {
    en: `Follow the arrow to ${mgSpec.titleEn}! 🚀`,
    ar: `اتبع السهم إلى ${mgSpec.titleAr}! 🚀`
  };
  return {
    stepNumber,
    totalSteps,
    doneCount,
    activeMiniGameId,
    activeRoom,
    requiresReturnAuth: false,
    isAllDone: false,
    bannerEn: `Step ${stepNumber} of ${totalSteps}: ${mgSpec.titleEn}`,
    bannerAr: `الخطوة ${stepNumber} من ${totalSteps}: ${mgSpec.titleAr}`,
    roboEn: shortRobo.en,
    roboAr: shortRobo.ar
  };
}

export function getRoomLabel(room: SpatialRoomNode, lang: AppLanguage): { title: string; objective: string } {
  return {
    title: tr(lang, room.nameEn, room.nameAr),
    objective: tr(lang, ROOM_OBJECTIVE_EN[room.id] || room.nameEn, room.shortObjectiveAr)
  };
}

export interface StageCauseEffectStory {
  levelId: CampaignLevelId;
  prevIcon: string;
  prevTitleEn: string;
  prevTitleAr: string;
  prevImpactEn: string;
  prevImpactAr: string;
  goalIcon: string;
  goalTitleEn: string;
  goalTitleAr: string;
  goalWhyEn: string;
  goalWhyAr: string;
}

export const STAGE_CAUSE_EFFECT: Record<CampaignLevelId, StageCauseEffectStory> = {
  1: {
    levelId: 1,
    prevIcon: '🌍',
    prevTitleEn: 'Mission Kickoff on Earth',
    prevTitleAr: 'انطلاق المهمة من الأرض',
    prevImpactEn: 'Your Artemis rocket waits at Sector 1, but zero-G crumbs & unsealed gear will fail in orbit.',
    prevImpactAr: 'صاروخ أرتميس ينتظرك الآن، لكن فتات الطعام أو نقص التجهيز يعطلان الرحلة في الفضاء.',
    goalIcon: '🚀',
    goalTitleEn: 'Stage 1 Goal: Fuel, Suit Up & Blast Off',
    goalTitleAr: 'هدف المرحلة 1: تجهيز الغذاء والبدلة والإقلاع',
    goalWhyEn: 'Pack 4 crumb-free foods & calibrate SPACE-FIT X to open the Sector 2 Laser Bridge!',
    goalWhyAr: 'احزم 4 وجبات آمنة ومعايرة البدلة لفتح جسر الليزر والوصول لمحطة الفضاء الدولية!'
  },
  2: {
    levelId: 2,
    prevIcon: '🍲',
    prevTitleEn: 'Stage 1 Powered Launch',
    prevTitleAr: 'نجاح الإطلاق من المرحلة 1',
    prevImpactEn: 'Your packed Sinai rations & suit telemetry safely carried the crew into zero-G orbit.',
    prevImpactAr: 'الوجبات المحزومة ومعايرة البدلة أوصلا الطاقم بنجاح إلى المدار الأرضي دون جاذبية.',
    goalIcon: '🛰️',
    goalTitleEn: 'Stage 2 Goal: Balance Orbit Nutrition & Dodging',
    goalTitleAr: 'هدف المرحلة 2: توازن الغذاء وتفادي الكويكبات',
    goalWhyEn: 'Prevent zero-G dehydration & dodge NASA NeoWs asteroids to unlock Moon Shackleton Base!',
    goalWhyAr: 'حافظ على ترطيب الجسم في 0G وتفادَ الكويكبات ببيانات ناسا لفتح قاعدة القمر!'
  },
  3: {
    levelId: 3,
    prevIcon: '🛰️',
    prevTitleEn: 'Stage 2 Orbit Navigation',
    prevTitleAr: 'اجتياز مدار الأرض بسلام',
    prevImpactEn: 'Dodging asteroids & maintaining ISS hydration delivered the crew to the lunar South Pole.',
    prevImpactAr: 'تفادي الكويكبات والحفاظ على ترطيب الجسم مكّن الطاقم من الهبوط بالقطب الجنوبي للقمر.',
    goalIcon: '🌕',
    goalTitleEn: 'Stage 3 Goal: Sustain Life Inside Moon Dome',
    goalTitleAr: 'هدف المرحلة 3: استدامة قاعدة القمر شاكلتون',
    goalWhyEn: 'Recycle 98% water, train bones with ARED & shield solar storms so Orion can return home!',
    goalWhyAr: 'دوّر 98% من المياه واحمِ العظام ودرع العواصف الشمسية لاعتماد العودة للأرض!'
  },
  4: {
    levelId: 4,
    prevIcon: '🌕',
    prevTitleEn: 'Stage 3 Moon Base Certified',
    prevTitleAr: 'اعتماد عينات وإنجاز القمر',
    prevImpactEn: 'Recycled ECLSS water, bone fitness & lunar samples unlocked your Artemis return clearance.',
    prevImpactAr: 'تدوير المياه وتقوية العظام وتأمين عينات القمر فتحوا مسار العودة عبر الغلاف الجوي.',
    goalIcon: '🪂',
    goalTitleEn: 'Stage 4 Goal: Safe Plasma Re-Entry & Splashdown',
    goalTitleAr: 'هدف المرحلة 4: اختراق الغلاف الجوي والهبوط الآمن',
    goalWhyEn: 'Balance lunar cargo weight, hold the PICA-X heat shield angle & deploy splashdown chutes!',
    goalWhyAr: 'وازن حمولة العينات، وحافظ على زاوية الدرع الحراري، وافتح مظلات الهبوط!'
  }
};

export function getAdaptedBriefingHint(
  miniGameId: MiniGameId,
  lang: AppLanguage,
  ageGroup: CadetAgeGroup
): string {
  const b = MINI_GAME_BRIEFINGS[miniGameId];
  return adaptByAge(ageGroup, lang, {
    youngEn: b.youngTipEn,
    youngAr: b.youngTipAr,
    midEn: b.en[1],
    midAr: b.ar[1],
    teenEn: b.teenTipEn,
    teenAr: b.teenTipAr
  });
}
