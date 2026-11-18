import { CampaignLevelId, MiniGameId } from '../types/game';

export type StationPropKey =
  | 'earth_launchpad'
  | 'iss_orbit_station'
  | 'lunar_biodome_base'
  | 'orion_reentry_capsule'
  | 'prop_kitchen_counter'
  | 'prop_suit_rack'
  | 'prop_medical_pod'
  | 'prop_hydro_rack'
  | 'prop_storm_console';

export interface SpatialRoomNode {
  id: string;
  nameEn: string;
  nameAr: string;
  icon: string;
  accentHex: string;
  /** Position in 3D station deck coordinates (-12..+12) */
  pos: [number, number];
  size: [number, number];
  /** Stylized Blender 3D prop key mounted at this station */
  propModel: StationPropKey;
  /** Primary mini-game launched when entering this station */
  miniGameId?: MiniGameId;
  /** Optional merged companion mini-games completed together with this station */
  mergedMiniGames?: MiniGameId[];
  /** Optional secondary console action */
  consoleAction?: 'l1_readiness' | 'l3_return_auth' | 'l3_power_tradeoff' | 'l3_medical_osdr' | 'l4_delay_comms';
  shortObjectiveAr: string;
  connectsTo?: string[];
}

export interface MiniGameSpec {
  id: MiniGameId;
  levelId: CampaignLevelId;
  orderInLevel: number;
  roomId: string;
  titleEn: string;
  titleAr: string;
  subtitleAr: string;
  icon: string;
  nasaBadge: string;
  roboPromptAr: string;
}

export interface CampaignLevelSpec {
  id: CampaignLevelId;
  titleEn: string;
  titleAr: string;
  subtitleAr: string;
  themeColorHex: string;
  nasaDatasets: string[];
  rooms: SpatialRoomNode[];
  miniGames: MiniGameId[];
  completionBannerEn: string;
  completionBannerAr: string;
}

/**
 * Maps streamlined flagship mini-games to consolidated companion mini-games so
 * legacy save flags and cross-level gates resolve automatically without clutter rooms.
 */
export const MERGED_COMPANION_MINIGAMES: Partial<Record<MiniGameId, MiniGameId[]>> = {
  l1_mission_launch: ['l1_spaceship_inspect'],
  l2_zerog_movement: ['l2_secure_objects'],
  l2_balanced_meal: ['l2_hydration'],
  l2_systems_neows: ['l2_motion_sickness'],
  l3_resistance_training: ['l3_eva_prep'],
  l4_departure_prep: ['l4_spacecraft_emergency'],
  l4_earth_reentry: ['l4_navigation_earth']
};

export const MINI_GAME_SPECS: Record<MiniGameId, MiniGameSpec> = {
  // LEVEL 1 (4 Core Stations + 1 consolidated ship pre-check)
  l1_food_prep: {
    id: 'l1_food_prep',
    levelId: 1,
    orderInLevel: 1,
    roomId: 'food_storage',
    titleEn: 'Space Kitchen: Pack Zero-Crumb Food',
    titleAr: 'المطبخ الفضائي: تجهيز طعام بلا فتات',
    subtitleAr: 'اختر أطعمة متوازنة بدون فتات لحماية فلاتر الهواء وتغذية الطاقم!',
    icon: '🥗',
    nasaBadge: 'NASA Space Food Systems',
    roboPromptAr: 'أهلاً بك في المطبخ الفضائي! اختر وجبات متوازنة بدون فتات!'
  },
  l1_equipment_prep: {
    id: 'l1_equipment_prep',
    levelId: 1,
    orderInLevel: 2,
    roomId: 'equipment_room',
    titleEn: 'Suit Rack: Gear & SPACE-FIT X Check',
    titleAr: 'منصة البدلة: فحص المعدات وبدلة الفضاء',
    subtitleAr: 'افحص المعدات المعتمدة وعاير بدلة SPACE-FIT X قبل الصعود للصاروخ.',
    icon: '🧰',
    nasaBadge: 'Artemis Checklist Protocol',
    roboPromptAr: 'افحص المعدات السليمة واستبعد الأوزان التالفة ثم عاير البدلة!'
  },
  l1_medical_check: {
    id: 'l1_medical_check',
    levelId: 1,
    orderInLevel: 3,
    roomId: 'medical_room',
    titleEn: 'Biometric Pod: Pre-Launch Health Check',
    titleAr: 'الكبسولة الطبية: الفحص الحيوي قبل الإطلاق',
    subtitleAr: 'افحص الترطيب والتغذية والنوم للحصول على تصريح الطيران الطبي.',
    icon: '🩺',
    nasaBadge: 'NASA Flight Surgeon Check',
    roboPromptAr: 'دعنا نفحص الترطيب والتغذية والراحة قبل العد التنازلي للإقلاع!'
  },
  l1_spaceship_inspect: {
    id: 'l1_spaceship_inspect',
    levelId: 1,
    orderInLevel: 4,
    roomId: 'launch_area',
    titleEn: 'Spaceship Inspection',
    titleAr: 'فحص أنظمة المركبة الفضائية',
    subtitleAr: 'فحص الأكسجين والطاقة والاتصالات وأنظمة دعم الحياة في منصة الإطلاق.',
    icon: '🛸',
    nasaBadge: 'Orion Readiness Telemetry',
    roboPromptAr: 'تأكد من سلامة الأكسجين والكهرباء وأنظمة المركبة قبل الإطلاق!'
  },
  l1_mission_launch: {
    id: 'l1_mission_launch',
    levelId: 1,
    orderInLevel: 4,
    roomId: 'launch_area',
    titleEn: 'Artemis Launchpad: Pre-Flight & Ignition',
    titleAr: 'منصة الصاروخ: المراجعة والإقلاع نحو القمر',
    subtitleAr: 'راجع الجاهزية وزامن بيانات الملاحة ثم ابدأ العد التنازلي 3-2-1 للانطلاق!',
    icon: '🚀',
    nasaBadge: 'KSC Launch Control',
    roboPromptAr: 'كل الأنظمة جاهزة! زامن الملاحة وابدأ العد التنازلي للإقلاع!'
  },

  // LEVEL 2 (3 Core Stations + consolidated tasks)
  l2_zerog_movement: {
    id: 'l2_zerog_movement',
    levelId: 2,
    orderInLevel: 1,
    roomId: 'corridor',
    titleEn: 'ISS Airlock: Zero-G Movement & Braking',
    titleAr: 'ممر المحطة: الحركة بالقصور الذاتي 0G',
    subtitleAr: 'تحرك في انعدام الجاذبية وامسك الدرابزين لتخفيف سرعتك قبل الوصول لبوابة الأمان.',
    icon: '🧑‍🚀',
    nasaBadge: 'NASA Microgravity Dynamics',
    roboPromptAr: 'أنت الآن تطفو في انعدام الجاذبية! امسك الدرابزين للوصول بأمان!'
  },
  l2_secure_objects: {
    id: 'l2_secure_objects',
    levelId: 2,
    orderInLevel: 1,
    roomId: 'corridor',
    titleEn: 'Secure Floating Objects',
    titleAr: 'تثبيت الأغراض الطافية',
    subtitleAr: 'تأمين الأدوات الطافية داخل خزانات الفيلكرو المخصصة.',
    icon: '🧲',
    nasaBadge: 'ISS Housekeeping Rule',
    roboPromptAr: 'ثبت الأدوات الطافية في خزانتها الصحيحة!'
  },
  l2_balanced_meal: {
    id: 'l2_balanced_meal',
    levelId: 2,
    orderInLevel: 2,
    roomId: 'food_storage',
    titleEn: 'Orbital Galley: Zero-G Meal & Hydration',
    titleAr: 'مطبخ المدار: وجبة متوازنة وترطيب',
    subtitleAr: 'كوّن صينية طعام متكاملة في 0G لتغذية العضلات والعظام.',
    icon: '🍱',
    nasaBadge: 'NASA Space Nutrition',
    roboPromptAr: 'جمّع وجبة فضائية متوازنة تحمي عضلاتك في المدار!'
  },
  l2_hydration: {
    id: 'l2_hydration',
    levelId: 2,
    orderInLevel: 2,
    roomId: 'food_storage',
    titleEn: 'Water Hydration Challenge',
    titleAr: 'تحدي الشرب الآمن في 0G',
    subtitleAr: 'الشرب الآمن من كيس الماء المختوم بالماصة دون تطاير القطرات.',
    icon: '💧',
    nasaBadge: 'NASA OSDR (OSD-245 Fluid Shift)',
    roboPromptAr: 'اشرب برفق من الكيس المختوم للحفاظ على الترطيب!'
  },
  l2_motion_sickness: {
    id: 'l2_motion_sickness',
    levelId: 2,
    orderInLevel: 3,
    roomId: 'communication_room',
    titleEn: 'Motion Sickness & Rest',
    titleAr: 'علاج دوار الفضاء والراحة',
    subtitleAr: 'التعافي من دوار التكيف الفضائي وإبلاغ مركز الدعم الطبي.',
    icon: '🛌',
    nasaBadge: 'NASA Space Adaptation Syndrome',
    roboPromptAr: 'استرح وأرسل التقرير الطبي للسيطرة الأرضية!'
  },
  l2_systems_neows: {
    id: 'l2_systems_neows',
    levelId: 2,
    orderInLevel: 3,
    roomId: 'communication_room',
    titleEn: 'Flight Deck: Systems & NASA NeoWs Radar',
    titleAr: 'منصة القيادة: الأنظمة ورادار ناسا للكويكبات',
    subtitleAr: 'تفادَ صخور مدار القمر على رادار NASA NeoWs وافحص الأنظمة للهبوط!',
    icon: '📡',
    nasaBadge: 'NASA NeoWs (Asteroid 2010 PK)',
    roboPromptAr: 'راقب رادار ناسا وتفادَ الصخور الفضائية لتأكيد الهبوط القمري!'
  },

  // LEVEL 3 (4 Core Stations + integrated EVA preparation)
  l3_water_recycling: {
    id: 'l3_water_recycling',
    levelId: 3,
    orderInLevel: 1,
    roomId: 'water_recycling_room',
    titleEn: 'Hydroponic & ECLSS Water Lab',
    titleAr: 'مختبر النباتات وتدوير المياه ECLSS',
    subtitleAr: 'اعزل الصمامات ونظّف الفلتر لاستعادة 98% من نقاء المياه وتغذية المحاصيل القمرية.',
    icon: '🚰',
    nasaBadge: 'NASA ECLSS Recovery (98%)',
    roboPromptAr: 'نظّف فلتر نظام ECLSS لنستعيد 98% من مياه القاعدة والنباتات!'
  },
  l3_resistance_training: {
    id: 'l3_resistance_training',
    levelId: 3,
    orderInLevel: 2,
    roomId: 'fitness_room',
    titleEn: 'Suit Rack: ARED Workout & EVA Tools',
    titleAr: 'منصة البدلة: تمارين المقاومة وتجهيز السير القمري',
    subtitleAr: 'نفّذ تمارين المقاومة لحماية العظام والعضلات وحصد الطاقة الحركية وتجهيز أدوات القمر!',
    icon: '🏋️',
    nasaBadge: 'NASA OSDR (OSD-102 ARED)',
    roboPromptAr: 'ابدأ تمارين المقاومة ببدلة SPACE-FIT X لحماية عظامك في القمر!'
  },
  l3_eva_prep: {
    id: 'l3_eva_prep',
    levelId: 3,
    orderInLevel: 2,
    roomId: 'fitness_room',
    titleEn: 'EVA Suit & Scientific Tools Prep',
    titleAr: 'تجهيز بدلة القمر وأدوات البحث',
    subtitleAr: 'فحص بدلة الضغط القمرية وحزم الأدوات العلمية الأربع.',
    icon: '👨‍🚀',
    nasaBadge: 'Artemis xEMU + Tool Kit',
    roboPromptAr: 'جهّز البدلة القمرية والأدوات العلمية الأربع للخروج!'
  },
  l3_solar_storm: {
    id: 'l3_solar_storm',
    levelId: 3,
    orderInLevel: 3,
    roomId: 'emergency_shelter',
    titleEn: 'Storm Console: NASA DONKI Solar Shield',
    titleAr: 'منصة العواصف: درع الإشعاع الشمسي DONKI',
    subtitleAr: 'وازن كهرباء القاعدة بين الدروع والأكسجين والزراعة ثم احتمِ بالملجأ حتى مرور العاصفة.',
    icon: '☀️',
    nasaBadge: 'NASA DONKI (CME / SEP)',
    roboPromptAr: 'إنذار عاصفة شمسية من DONKI! وجّه الطاقة للدروع واحتمِ بالملجأ!'
  },
  l3_lunar_samples: {
    id: 'l3_lunar_samples',
    levelId: 3,
    orderInLevel: 4,
    roomId: 'lunar_exploration_zone',
    titleEn: 'Shackleton Biodome: Lunar Samples & Return',
    titleAr: 'قبة القمر الحيوية: جمع العينات وإذن العودة',
    subtitleAr: 'اجمع صخور البازلت وغبار الريجوليث والحصى في جاذبية 0.16G واعتمد العودة للأرض!',
    icon: '🪨',
    nasaBadge: 'NASA Artemis Geology + LROC',
    roboPromptAr: 'امشِ على سطح القمر واجمع العينات الثلاث لفتح رحلة العودة للأرض!'
  },

  // LEVEL 4 (3 Core Stations + consolidated comms/repair checks)
  l4_departure_prep: {
    id: 'l4_departure_prep',
    levelId: 4,
    orderInLevel: 1,
    roomId: 'cargo_sample_storage',
    titleEn: 'Medical & Cargo Bay: Orion Departure Check',
    titleAr: 'وحدة الشحن والطب: فحص المغادرة وتأمين العينات',
    subtitleAr: 'ثبّت عينات القمر وافحص الأكسجين والطاقة ودعم الحياة للعودة إلى الأرض.',
    icon: '📦',
    nasaBadge: 'Orion Return Cargo Check',
    roboPromptAr: 'ثبّت عينات القمر وافحص خزانات الأكسجين والضغط قبل العودة!'
  },
  l4_spacecraft_emergency: {
    id: 'l4_spacecraft_emergency',
    levelId: 4,
    orderInLevel: 1,
    roomId: 'cargo_sample_storage',
    titleEn: 'In-Flight Spacecraft Emergency',
    titleAr: 'إصلاح عطل طارئ أثناء العودة',
    subtitleAr: 'تشخيص وإصلاح أي عطل مفاجئ أثناء رحلة العودة للأرض.',
    icon: '🔧',
    nasaBadge: 'Orion Fault Isolation Protocol',
    roboPromptAr: 'شخّص العطل وأصلحه فوراً لاستقرار الكبسولة!'
  },
  l4_navigation_earth: {
    id: 'l4_navigation_earth',
    levelId: 4,
    orderInLevel: 2,
    roomId: 'systems_check_station',
    titleEn: 'Navigation Back to Earth (1.3s Delay)',
    titleAr: 'ملاحة العودة للأرض وتأخير الاتصال',
    subtitleAr: 'ضبط مسار العودة واختبار تأخير إشارة الفضاء العميق (~1.3 ثانية).',
    icon: '🧭',
    nasaBadge: 'NASA Deep Space Network (~1.3s)',
    roboPromptAr: 'اضبط مسار العودة للأرض عبر شبكة الفضاء العميق!'
  },
  l4_earth_reentry: {
    id: 'l4_earth_reentry',
    levelId: 4,
    orderInLevel: 2,
    roomId: 'systems_check_station',
    titleEn: 'Heat Shield Console: 1600°C Re-Entry',
    titleAr: 'منصة الدرع الحراري: اختراق الغلاف الجوي',
    subtitleAr: 'افحص ألواح PICA-X وحافظ على زاوية الدرع الحراري وسط البلازما عند 1600°C.',
    icon: '🔥',
    nasaBadge: 'NASA Orion Heat Shield + OSDR',
    roboPromptAr: 'حافظ على زاوية الدرع الحراري داخل الممر الآمن عند الدخول للأرض!'
  },
  l4_safe_landing: {
    id: 'l4_safe_landing',
    levelId: 4,
    orderInLevel: 3,
    roomId: 'central_corridor',
    titleEn: 'Orion Capsule: Parachute Splashdown',
    titleAr: 'كبسولة أوريون: نشر المظلات والهبوط بالمحيط',
    subtitleAr: 'انشر المظلات الكابحة والرئيسية عند الارتفاع المحدد للهبوط الآمن على كوكب الأرض!',
    icon: '🪂',
    nasaBadge: 'NASA Recovery Splashdown',
    roboPromptAr: 'افتح المظلات المتدرجة للهبوط الآمن في المحيط والعودة للأرض!'
  }
};

export const CAMPAIGN_LEVELS: Record<CampaignLevelId, CampaignLevelSpec> = {
  1: {
    id: 1,
    titleEn: 'Node 1: Earth Launchpad Prep',
    titleAr: 'المحطة 1: التجهيز في منصة إطلاق الأرض',
    subtitleAr: '4 محطات متسلسلة من المطبخ الفضائي إلى منصة الصاروخ قبل الإقلاع للقمر',
    themeColorHex: '#38bdf8',
    nasaDatasets: ['NASA Space Food Systems', 'Orion Pre-Launch Telemetry', 'APOD'],
    miniGames: ['l1_food_prep', 'l1_equipment_prep', 'l1_medical_check', 'l1_mission_launch'],
    completionBannerEn: 'LAUNCH SUCCESSFUL! ENTERING EARTH ORBIT!',
    completionBannerAr: 'تم الإطلاق بنجاح! انطلقت الرحلة إلى المدار الأرضي! 🚀',
    rooms: [
      {
        id: 'food_storage',
        nameEn: 'Space Kitchen Counter',
        nameAr: 'المطبخ الفضائي',
        icon: '🥗',
        accentHex: '#10b981',
        pos: [-10.5, 0],
        size: [4.2, 3.6],
        propModel: 'prop_kitchen_counter',
        miniGameId: 'l1_food_prep',
        shortObjectiveAr: 'تعبئة وجبات متوازنة بلا فتات'
      },
      {
        id: 'equipment_room',
        nameEn: 'Suit & Gear Rack',
        nameAr: 'منصة البدلة والمعدات',
        icon: '🧰',
        accentHex: '#f59e0b',
        pos: [-3.5, 0],
        size: [4.2, 3.6],
        propModel: 'prop_suit_rack',
        miniGameId: 'l1_equipment_prep',
        shortObjectiveAr: 'فحص المعدات ومعايرة بدلة SPACE-FIT X'
      },
      {
        id: 'medical_room',
        nameEn: 'Medical Biometric Pod',
        nameAr: 'كبسولة الفحص الطبي',
        icon: '🩺',
        accentHex: '#ec4899',
        pos: [3.5, 0],
        size: [4.2, 3.6],
        propModel: 'prop_medical_pod',
        miniGameId: 'l1_medical_check',
        shortObjectiveAr: 'فحص الترطيب والتغذية والراحة'
      },
      {
        id: 'launch_area',
        nameEn: 'Artemis Rocket Launchpad',
        nameAr: 'منصة إطلاق الصاروخ',
        icon: '🚀',
        accentHex: '#a855f7',
        pos: [10.5, 0],
        size: [4.6, 3.8],
        propModel: 'earth_launchpad',
        miniGameId: 'l1_mission_launch',
        mergedMiniGames: ['l1_spaceship_inspect'],
        consoleAction: 'l1_readiness',
        shortObjectiveAr: 'فحص الصاروخ والعد التنازلي للإقلاع'
      }
    ]
  },

  2: {
    id: 2,
    titleEn: 'Node 2: ISS Orbit Station',
    titleAr: 'المحطة 2: محطة الفضاء الدولية (انعدام الجاذبية)',
    subtitleAr: '3 محطات متسلسلة داخل المدار الأرضي للتكيف مع 0G وتفادي كويكب NeoWs',
    themeColorHex: '#818cf8',
    nasaDatasets: ['NASA NeoWs (Asteroid 2010 PK)', 'NASA OSDR (OSD-245 Fluid Shift)', 'APOD'],
    miniGames: ['l2_zerog_movement', 'l2_balanced_meal', 'l2_systems_neows'],
    completionBannerEn: 'LUNAR ORBIT CORRIDOR CLEAR!',
    completionBannerAr: 'تم تأكيد الوصول إلى مسار القمر بأمان! 🌕',
    rooms: [
      {
        id: 'corridor',
        nameEn: 'ISS Zero-G Airlock Bay',
        nameAr: 'بوابة انعدام الجاذبية 0G',
        icon: '🧑‍🚀',
        accentHex: '#38bdf8',
        pos: [-8.5, 0],
        size: [4.4, 3.6],
        propModel: 'iss_orbit_station',
        miniGameId: 'l2_zerog_movement',
        mergedMiniGames: ['l2_secure_objects'],
        shortObjectiveAr: 'التحكم بالحركة بالدرابزين في 0G'
      },
      {
        id: 'food_storage',
        nameEn: 'Orbital Galley Counter',
        nameAr: 'مطبخ المدار والترطيب',
        icon: '🍱',
        accentHex: '#10b981',
        pos: [0, 0],
        size: [4.4, 3.6],
        propModel: 'prop_kitchen_counter',
        miniGameId: 'l2_balanced_meal',
        mergedMiniGames: ['l2_hydration'],
        shortObjectiveAr: 'تكوين وجبة مدارية وترطيب مختوم'
      },
      {
        id: 'communication_room',
        nameEn: 'NeoWs Asteroid Radar Deck',
        nameAr: 'رادار ناسا وقيادة المدار',
        icon: '📡',
        accentHex: '#f59e0b',
        pos: [8.5, 0],
        size: [4.6, 3.6],
        propModel: 'prop_storm_console',
        miniGameId: 'l2_systems_neows',
        mergedMiniGames: ['l2_motion_sickness'],
        shortObjectiveAr: 'رادار كويكبات NeoWs وفحص الأنظمة'
      }
    ]
  },

  3: {
    id: 3,
    titleEn: 'Node 3: Moon Shackleton Base',
    titleAr: 'المحطة 3: قاعدة القمر الحيوية (فوهة شاكلتون)',
    subtitleAr: '4 محطات متسلسلة لتدوير المياه، مقاومة العظام، صد العاصفة DONKI، وجمع عينات القمر',
    themeColorHex: '#fbbf24',
    nasaDatasets: ['NASA DONKI (CME/SEP)', 'NASA OSDR (Bone/Muscle & Radiation)', 'NASA LROC Crater Imagery'],
    miniGames: ['l3_water_recycling', 'l3_resistance_training', 'l3_solar_storm', 'l3_lunar_samples'],
    completionBannerEn: 'RETURN TO EARTH AUTHORIZED!',
    completionBannerAr: 'تم التحقق من كل الأنظمة وعينات القمر – الإذن بالعودة مُعتمد! 🌍',
    rooms: [
      {
        id: 'water_recycling_room',
        nameEn: 'Hydroponic & ECLSS Rack',
        nameAr: 'حامل النباتات وتدوير المياه',
        icon: '🚰',
        accentHex: '#06b6d4',
        pos: [-10.5, 0],
        size: [4.2, 3.6],
        propModel: 'prop_hydro_rack',
        miniGameId: 'l3_water_recycling',
        shortObjectiveAr: 'استعادة 98% من نقاء المياه ودعم النباتات'
      },
      {
        id: 'fitness_room',
        nameEn: 'SPACE-FIT X Fitness & EVA Bay',
        nameAr: 'منصة اللياقة وتجهيز القمر',
        icon: '🏋️',
        accentHex: '#10b981',
        pos: [-3.5, 0],
        size: [4.2, 3.6],
        propModel: 'prop_suit_rack',
        miniGameId: 'l3_resistance_training',
        mergedMiniGames: ['l3_eva_prep'],
        shortObjectiveAr: 'تمارين العظام وتجهيز أدوات الجمع'
      },
      {
        id: 'emergency_shelter',
        nameEn: 'Solar Storm Shield Console',
        nameAr: 'منصة درع العاصفة الشمسية',
        icon: '☀️',
        accentHex: '#ef4444',
        pos: [3.5, 0],
        size: [4.2, 3.6],
        propModel: 'prop_storm_console',
        miniGameId: 'l3_solar_storm',
        consoleAction: 'l3_power_tradeoff',
        shortObjectiveAr: 'موازنة الطاقة والاحتماء من DONKI'
      },
      {
        id: 'lunar_exploration_zone',
        nameEn: 'Shackleton Biodome & Samples',
        nameAr: 'قبة القمر وجمع العينات',
        icon: '🪨',
        accentHex: '#a855f7',
        pos: [10.5, 0],
        size: [4.6, 3.8],
        propModel: 'lunar_biodome_base',
        miniGameId: 'l3_lunar_samples',
        consoleAction: 'l3_return_auth',
        shortObjectiveAr: 'جمع صخور القمر واعتماد العودة للأرض'
      }
    ]
  },

  4: {
    id: 4,
    titleEn: 'Node 4: Orion Earth Re-Entry',
    titleAr: 'المحطة 4: كبسولة العودة والهبوط على الأرض',
    subtitleAr: '3 محطات حاسمة: تأمين العينات، عبور بلازما الغلاف الجوي، ونشر المظلات بالمحيط',
    themeColorHex: '#34d399',
    nasaDatasets: ['Orion Heat Shield (PICA-X)', 'DSN Light-Time Delay (~1.3s)', 'NASA OSDR G-Load'],
    miniGames: ['l4_departure_prep', 'l4_earth_reentry', 'l4_safe_landing'],
    completionBannerEn: 'MISSION ACCOMPLISHED!',
    completionBannerAr: 'تمت المهمة بنجاح باهر! أهلاً بكم في كوكب الأرض 🌍🎉',
    rooms: [
      {
        id: 'cargo_sample_storage',
        nameEn: 'Sample Cargo & Med Bay',
        nameAr: 'مخزن العينات والفحص الطبي',
        icon: '📦',
        accentHex: '#f59e0b',
        pos: [-8.5, 0],
        size: [4.4, 3.6],
        propModel: 'prop_medical_pod',
        miniGameId: 'l4_departure_prep',
        mergedMiniGames: ['l4_spacecraft_emergency'],
        shortObjectiveAr: 'تأمين عينات القمر وفحص جاهزية العودة'
      },
      {
        id: 'systems_check_station',
        nameEn: 'PICA-X Heat Shield Console',
        nameAr: 'منصة الدرع الحراري والملاحة',
        icon: '🔥',
        accentHex: '#f97316',
        pos: [0, 0],
        size: [4.4, 3.6],
        propModel: 'prop_storm_console',
        miniGameId: 'l4_earth_reentry',
        mergedMiniGames: ['l4_navigation_earth'],
        consoleAction: 'l4_delay_comms',
        shortObjectiveAr: 'توجيه الدرع الحراري عبر البلازما'
      },
      {
        id: 'central_corridor',
        nameEn: 'Orion Splashdown Capsule',
        nameAr: 'كبسولة المظلات والهبوط الآمن',
        icon: '🪂',
        accentHex: '#10b981',
        pos: [8.5, 0],
        size: [4.6, 3.8],
        propModel: 'orion_reentry_capsule',
        miniGameId: 'l4_safe_landing',
        shortObjectiveAr: 'نشر المظلات والهبوط المائي السليم'
      }
    ]
  }
};
