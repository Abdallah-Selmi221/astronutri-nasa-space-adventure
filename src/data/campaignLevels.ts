import { CampaignLevelId, MiniGameId } from '../types/game';

export interface SpatialRoomNode {
  id: string;
  nameEn: string;
  nameAr: string;
  icon: string;
  accentHex: string;
  /** Position in 3D station floorplan coordinates (-12..+12) */
  pos: [number, number];
  size: [number, number];
  /** Primary mini-game launched when entering this door, or 'return_auth' / 'briefing' */
  miniGameId?: MiniGameId;
  /** Optional secondary console action if this room is a control/support hub */
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

export const MINI_GAME_SPECS: Record<MiniGameId, MiniGameSpec> = {
  // LEVEL 1 (5)
  l1_food_prep: {
    id: 'l1_food_prep',
    levelId: 1,
    orderInLevel: 1,
    roomId: 'food_storage',
    titleEn: 'Food Preparation',
    titleAr: 'تجهيز طعام الفضاء',
    subtitleAr: 'اختر البروتينات والكربوهيدرات والدهون الصحية والفيتامينات مع الالتزام بقاعدة ممنوع الفتات!',
    icon: '🥗',
    nasaBadge: 'NASA Space Food Systems',
    roboPromptAr: 'أهلاً بك في مخزن الطعام! اختر وجبات متوازنة واحذر من البسكويت والشيبسي المتفتت!'
  },
  l1_equipment_prep: {
    id: 'l1_equipment_prep',
    levelId: 1,
    orderInLevel: 2,
    roomId: 'equipment_room',
    titleEn: 'Equipment Preparation',
    titleAr: 'تجهيز أدوات المهمة',
    subtitleAr: 'راجع قائمة المعدات الأساسية ورتب كل أداة في الخزانة المخصصة لها قبل الصعود للصاروخ.',
    icon: '🧰',
    nasaBadge: 'Artemis Checklist Protocol',
    roboPromptAr: 'رتب معدات الرواد بدقة داخل حقائب التخزين المخصصة لها!'
  },
  l1_medical_check: {
    id: 'l1_medical_check',
    levelId: 1,
    orderInLevel: 3,
    roomId: 'medical_room',
    titleEn: 'Medical Checkup',
    titleAr: 'الفحص الطبي قبل الإقلاع',
    subtitleAr: 'افحص الترطيب والتغذية وساعات النوم وعالج أي مؤشر تحذيري للحصول على التصريح الطبي.',
    icon: '🩺',
    nasaBadge: 'NASA Flight Surgeon Check',
    roboPromptAr: 'دعنا نفحص مؤشرات الجسم: الترطيب والتغذية والنوم قبل السماح بالإقلاع!'
  },
  l1_spaceship_inspect: {
    id: 'l1_spaceship_inspect',
    levelId: 1,
    orderInLevel: 4,
    roomId: 'spaceship_bay',
    titleEn: 'Spaceship Inspection',
    titleAr: 'فحص أنظمة المركبة الفضائية',
    subtitleAr: 'افحص الأكسجين والطاقة الكهربائية والاتصالات ودعم الحياة وأبواب الكابينة.',
    icon: '🛸',
    nasaBadge: 'Orion Readiness Telemetry',
    roboPromptAr: 'نحن في حظيرة المركبة! تأكد من سلامة الأكسجين والكهرباء والأبواب قبل الإقلاع.'
  },
  l1_mission_launch: {
    id: 'l1_mission_launch',
    levelId: 1,
    orderInLevel: 5,
    roomId: 'launch_area',
    titleEn: 'Mission Control & Launch',
    titleAr: 'مركز التحكم وإطلاق الصاروخ',
    subtitleAr: 'تحقق من إتمام المهام الأربع السابقة ثم ابدأ العد التنازلي 3-2-1 للانطلاق نحو القمر!',
    icon: '🚀',
    nasaBadge: 'KSC Launch Control',
    roboPromptAr: 'هل كل الأنظمة خضراء؟ اضغط إطلاق الصاروخ واستعد للرحلة إلى القمر!'
  },

  // LEVEL 2 (6)
  l2_zerog_movement: {
    id: 'l2_zerog_movement',
    levelId: 2,
    orderInLevel: 1,
    roomId: 'corridor',
    titleEn: 'Zero-G Movement Challenge',
    titleAr: 'تحدي الحركة بالقصور الذاتي 0G',
    subtitleAr: 'تحرك عبر الممر المركزي باستخدام الدرابزين دون فقدان السيطرة أو الارتطام بالجدران.',
    icon: '🧑‍🚀',
    nasaBadge: 'NASA Microgravity Dynamics',
    roboPromptAr: 'أنت الآن تطفو في انعدام الجاذبية! استخدم الدرابزين للتحكم في سرعتك داخل الممر!'
  },
  l2_secure_objects: {
    id: 'l2_secure_objects',
    levelId: 2,
    orderInLevel: 2,
    roomId: 'cockpit',
    titleEn: 'Secure Floating Objects',
    titleAr: 'تثبيت الأغراض الطافية',
    subtitleAr: 'التقط العناصر الطافية الخمسة (الطعام، الماء، المفك، حقيبة الإسعاف، الجهاز العلمي) وثبتها في خزانتها.',
    icon: '🧲',
    nasaBadge: 'ISS Housekeeping Rule',
    roboPromptAr: 'بسرعة! هناك 5 أدوات تطفو في الهواء.. امسكها وثبتها في خزانتها الصحيحة!'
  },
  l2_balanced_meal: {
    id: 'l2_balanced_meal',
    levelId: 2,
    orderInLevel: 3,
    roomId: 'food_storage',
    titleEn: 'Balanced Space Meal',
    titleAr: 'تجميع الوجبة الفضائية المتوازنة',
    subtitleAr: 'كوّن صينية طعام متكاملة تغطي جميع المجموعات الغذائية لحماية عضلاتك ومناعتك.',
    icon: '🍱',
    nasaBadge: 'NASA Space Nutrition',
    roboPromptAr: 'جمّع وجبة فضائية متوازنة تحتوي على البروتين والطاقة والفيتامينات!'
  },
  l2_hydration: {
    id: 'l2_hydration',
    levelId: 2,
    orderInLevel: 4,
    roomId: 'hydration_station',
    titleEn: 'Water Hydration Challenge',
    titleAr: 'تحدي الشرب الآمن في 0G',
    subtitleAr: 'اشرب من كيس الماء المختوم بالماصة بانتظام للوصول للترطيب المطلوب دون تطاير القطرات.',
    icon: '💧',
    nasaBadge: 'NASA OSDR (OSD-245 Fluid Shift)',
    roboPromptAr: 'اشرب برفق من الكيس المختوم وتوقف للبلع كي لا تطير قطرات الماء في الكابينة!'
  },
  l2_motion_sickness: {
    id: 'l2_motion_sickness',
    levelId: 2,
    orderInLevel: 5,
    roomId: 'medical_bay',
    titleEn: 'Motion Sickness & Rest',
    titleAr: 'علاج دوار الفضاء والراحة',
    subtitleAr: 'شخّص أعراض الدوار والإرهاق، واسترح في مقصورة الطاقم، وتناول الماء وتواصل مع الطب الفضائي.',
    icon: '🛌',
    nasaBadge: 'NASA Space Adaptation Syndrome',
    roboPromptAr: 'هل تشعر بدوار 0G؟ لنشخص الحالة ونرتاح في مقصورة الطاقم مع الترطيب!'
  },
  l2_systems_neows: {
    id: 'l2_systems_neows',
    levelId: 2,
    orderInLevel: 6,
    roomId: 'communication_room',
    titleEn: 'Final Systems & NASA NeoWs Radar',
    titleAr: 'فحص الأنظمة ورادار كويكبات ناسا',
    subtitleAr: 'افحص الأكسجين والماء والطاقة والاتصالات والملاحة مع تتبع مسار كويكب 2010 PK من NASA NeoWs.',
    icon: '📡',
    nasaBadge: 'NASA NeoWs (Asteroid 2010 PK)',
    roboPromptAr: 'راقب رادار ناسا للأجرام القريبة وتأكد من كل الأنظمة لتأكيد الوصول للقمر!'
  },

  // LEVEL 3 (5)
  l3_resistance_training: {
    id: 'l3_resistance_training',
    levelId: 3,
    orderInLevel: 1,
    roomId: 'fitness_room',
    titleEn: 'Resistance Training Challenge',
    titleAr: 'تدريب المقاومة (ARED) للعضلات والعظام',
    subtitleAr: 'أدِّ تمارين الأرجل والذراعين والجذع بالتتابع لحماية كثافة العظام والعضلات وفق بيانات NASA OSDR.',
    icon: '🏋️',
    nasaBadge: 'NASA OSDR (OSD-102 ARED)',
    roboPromptAr: 'ابدأ تمارين الأرجل ثم الذراعين ثم الجذع حتى لا تضعف عظامنا في جاذبية القمر المنخفضة!'
  },
  l3_water_recycling: {
    id: 'l3_water_recycling',
    levelId: 3,
    orderInLevel: 2,
    roomId: 'water_recycling_room',
    titleEn: 'Water Recycling System',
    titleAr: 'صيانة نظام تدوير المياه (ECLSS)',
    subtitleAr: 'اعزل النظام -> افتح لوحة الصيانة -> نظّف/استبدل الفلتر المسدود -> أعد التركيب واختبر نقاء الماء.',
    icon: '🚰',
    nasaBadge: 'NASA ECLSS Recovery (98%)',
    roboPromptAr: 'جهاز تدوير المياه متوقف! اعزل الصمام، افتح اللوحة، ونظف الفلتر لنحصل على مياه نقية!'
  },
  l3_solar_storm: {
    id: 'l3_solar_storm',
    levelId: 3,
    orderInLevel: 3,
    roomId: 'emergency_shelter',
    titleEn: 'Solar Storm Emergency (NASA DONKI)',
    titleAr: 'طوارئ العاصفة الشمسية (بيانات DONKI)',
    subtitleAr: 'استقبل تنبيه DONKI -> أوقف السير الفضائي -> أمّن المعدات -> احتمِ بملجأ الطوارئ وأغلق الباب.',
    icon: '☀️',
    nasaBadge: 'NASA DONKI (CME / SEP)',
    roboPromptAr: 'إنذار عاصفة شمسية حقيقية من DONKI! أوقف العمل بالخارج واتجه فوراً لملجأ الطوارئ!'
  },
  l3_eva_prep: {
    id: 'l3_eva_prep',
    levelId: 3,
    orderInLevel: 4,
    roomId: 'eva_prep_room',
    titleEn: 'EVA Suit & Scientific Tools Prep',
    titleAr: 'تجهيز بدلة القمر وأدوات البحث',
    subtitleAr: 'ركّب الخوذة والقفازات والحذاء وحقيبة دعم الحياة (4.3 PSI)، ثم ضع الأدوات العلمية الأربع في الحقيبة!',
    icon: '👨‍🚀',
    nasaBadge: 'Artemis xEMU + Tool Kit',
    roboPromptAr: 'جهّز البدلة القمرية وتذكر حزم الأدوات الأربع: الملقط والمجرفة والمطرقة وحقيبة العينات!'
  },
  l3_lunar_samples: {
    id: 'l3_lunar_samples',
    levelId: 3,
    orderInLevel: 5,
    roomId: 'lunar_exploration_zone',
    titleEn: 'Lunar Sample Collection (0.16G)',
    titleAr: 'جمع عينات القمر في جاذبية 0.16G',
    subtitleAr: 'تجول على سطح القمر وراقب الأكسجين واجمع الصخور والغبار باستخدام الأدوات التي حزمتها في الغرفة السابقة!',
    icon: '🪨',
    nasaBadge: 'NASA Artemis Geology + LROC',
    roboPromptAr: 'امشِ بخفة على سطح القمر واجمع العينات! إذا نسيت أداة فستحتاج للعودة لغرفة التجهيز!'
  },

  // LEVEL 4 (5)
  l4_departure_prep: {
    id: 'l4_departure_prep',
    levelId: 4,
    orderInLevel: 1,
    roomId: 'cargo_sample_storage',
    titleEn: 'Departure & Sample Verification',
    titleAr: 'تجهيز المغادرة وتأمين عينات القمر',
    subtitleAr: 'افحص الأكسجين والطاقة ودعم الحياة والاتصالات وتأكد من تثبيت عينات القمر التي جمعتها في المستوى 3!',
    icon: '📦',
    nasaBadge: 'Orion Return Cargo Check',
    roboPromptAr: 'تأكد من حفظ عينات القمر التي جمعناها في المستوى الثالث وإغلاق خزانات الشحن بإحكام!'
  },
  l4_navigation_earth: {
    id: 'l4_navigation_earth',
    levelId: 4,
    orderInLevel: 2,
    roomId: 'cockpit_navigation',
    titleEn: 'Navigation Back to Earth (1.3s Delay)',
    titleAr: 'ملاحة العودة للأرض وتأخير الاتصال',
    subtitleAr: 'ارسم مسار العودة من القمر للأرض واختبر تأخير الإشارة اللاسلكية الحقيقي (~1.3 ثانية) مع مركز الأرض.',
    icon: '🧭',
    nasaBadge: 'NASA Deep Space Network (~1.3s)',
    roboPromptAr: 'وجّه مسار الكبسولة نحو الأرض ولاحظ أن إشارة الراديو من القمر تستغرق 1.3 ثانية!'
  },
  l4_spacecraft_emergency: {
    id: 'l4_spacecraft_emergency',
    levelId: 4,
    orderInLevel: 3,
    roomId: 'equipment_maintenance',
    titleEn: 'In-Flight Spacecraft Emergency',
    titleAr: 'إصلاح عطل طارئ أثناء العودة',
    subtitleAr: 'شخّص العطل المفاجئ (هبوط الطاقة / تشويش الاتصال / تحذير الحياة) وأصلحه بأدوات الصيانة.',
    icon: '🔧',
    nasaBadge: 'Orion Fault Isolation Protocol',
    roboPromptAr: 'حدث عطل طارئ في المركبة! استخدم أدوات غرفة الصيانة لإصلاحه بسرعة وأمان!'
  },
  l4_earth_reentry: {
    id: 'l4_earth_reentry',
    levelId: 4,
    orderInLevel: 4,
    roomId: 'systems_check_station',
    titleEn: 'Earth Re-Entry & Heat Shield',
    titleAr: 'اختراق الغلاف الجوي والدرع الحراري',
    subtitleAr: 'افحص الدرع الحراري PICA-X وحافظ على زاوية الكبسولة داخل الممر الآمن وسط البلازما عند 1600°C.',
    icon: '🔥',
    nasaBadge: 'NASA Orion Heat Shield + OSDR',
    roboPromptAr: 'أبقِ زاوية الدرع الحراري في المنطقة الخضراء حتى لا تحترق الكبسولة عند دخول الغلاف الجوي!'
  },
  l4_safe_landing: {
    id: 'l4_safe_landing',
    levelId: 4,
    orderInLevel: 5,
    roomId: 'central_corridor',
    titleEn: 'Safe Parachute Splashdown',
    titleAr: 'نشر المظلات والهبوط الآمن',
    subtitleAr: 'أطلق المظلات الكابحة والرئيسية عند الارتفاع المحدد وراقب سرعة الهبوط حتى الهبوط المائي السليم!',
    icon: '🪂',
    nasaBadge: 'NASA Recovery Splashdown',
    roboPromptAr: 'افتح المظلات في الوقت المناسب وراقب السرعة للهبوط الآمن على كوكب الأرض!'
  }
};

export const CAMPAIGN_LEVELS: Record<CampaignLevelId, CampaignLevelSpec> = {
  1: {
    id: 1,
    titleEn: 'Level 1: Earth Preparation',
    titleAr: 'المستوى 1: التحضير على الأرض',
    subtitleAr: '6 غرف و5 مهام تجهيز متسلسلة قبل انطلاق الصاروخ إلى القمر',
    themeColorHex: '#38bdf8',
    nasaDatasets: ['NASA Space Food Systems', 'Orion Pre-Launch Telemetry', 'APOD'],
    miniGames: ['l1_food_prep', 'l1_equipment_prep', 'l1_medical_check', 'l1_spaceship_inspect', 'l1_mission_launch'],
    completionBannerEn: 'LAUNCH SUCCESSFUL! THE JOURNEY TO THE MOON BEGINS!',
    completionBannerAr: 'تم الإطلاق بنجاح! انطلقت الرحلة إلى القمر! 🚀',
    rooms: [
      {
        id: 'food_storage',
        nameEn: 'Food Storage',
        nameAr: 'مخزن الطعام',
        icon: '🥗',
        accentHex: '#10b981',
        pos: [-8, -4],
        size: [4.2, 3.4],
        miniGameId: 'l1_food_prep',
        shortObjectiveAr: 'تعبئة الوجبات الآمنة ومنع الفتات'
      },
      {
        id: 'equipment_room',
        nameEn: 'Equipment Room',
        nameAr: 'غرفة المعدات',
        icon: '🧰',
        accentHex: '#f59e0b',
        pos: [0, -4.5],
        size: [4.2, 3.4],
        miniGameId: 'l1_equipment_prep',
        shortObjectiveAr: 'حزم أدوات ومستلزمات المهمة'
      },
      {
        id: 'medical_room',
        nameEn: 'Medical Room',
        nameAr: 'الغرفة الطبية',
        icon: '🩺',
        accentHex: '#ec4899',
        pos: [8, -4],
        size: [4.2, 3.4],
        miniGameId: 'l1_medical_check',
        shortObjectiveAr: 'فحص الترطيب والتغذية والنوم'
      },
      {
        id: 'spaceship_bay',
        nameEn: 'Spaceship Bay',
        nameAr: 'حظيرة المركبة',
        icon: '🛸',
        accentHex: '#6366f1',
        pos: [-6.5, 4.5],
        size: [4.6, 3.6],
        miniGameId: 'l1_spaceship_inspect',
        shortObjectiveAr: 'فحص الأكسجين والكهرباء والأبواب'
      },
      {
        id: 'mission_control',
        nameEn: 'Mission Control',
        nameAr: 'مركز التحكم',
        icon: '🖥️',
        accentHex: '#06b6d4',
        pos: [0.5, 4.5],
        size: [4.4, 3.6],
        miniGameId: 'l1_mission_launch',
        consoleAction: 'l1_readiness',
        shortObjectiveAr: 'مراجعة الجاهزية والعد التنازلي'
      },
      {
        id: 'launch_area',
        nameEn: 'Launch Area',
        nameAr: 'منصة الإطلاق',
        icon: '🚀',
        accentHex: '#a855f7',
        pos: [8, 4.5],
        size: [4.4, 3.8],
        miniGameId: 'l1_mission_launch',
        shortObjectiveAr: 'الإقلاع إلى المدار القمري'
      }
    ]
  },

  2: {
    id: 2,
    titleEn: 'Level 2: Zero-G Transit',
    titleAr: 'المستوى 2: الرحلة في انعدام الجاذبية',
    subtitleAr: '7 غرف متصلة بالممر المركزي و6 تحديات في انعدام الجاذبية وصولاً إلى القمر',
    themeColorHex: '#818cf8',
    nasaDatasets: ['NASA NeoWs (Asteroid 2010 PK)', 'NASA OSDR (OSD-245 Fluid Shift)', 'APOD'],
    miniGames: [
      'l2_zerog_movement',
      'l2_secure_objects',
      'l2_balanced_meal',
      'l2_hydration',
      'l2_motion_sickness',
      'l2_systems_neows'
    ],
    completionBannerEn: 'LUNAR ARRIVAL CONFIRMED!',
    completionBannerAr: 'تم تأكيد الوصول إلى مدار القمر! 🌕',
    rooms: [
      {
        id: 'corridor',
        nameEn: 'Central Zero-G Corridor',
        nameAr: 'الممر المركزي 0G',
        icon: '🧑‍🚀',
        accentHex: '#38bdf8',
        pos: [0, 0],
        size: [14, 2.5],
        miniGameId: 'l2_zerog_movement',
        shortObjectiveAr: 'الحركة بالدرابزين في 0G'
      },
      {
        id: 'cockpit',
        nameEn: 'Cockpit',
        nameAr: 'مقصورة القيادة',
        icon: '🧲',
        accentHex: '#6366f1',
        pos: [-8.5, -4.5],
        size: [4.2, 3.2],
        miniGameId: 'l2_secure_objects',
        shortObjectiveAr: 'تثبيت الأغراض الـ 5 الطافية'
      },
      {
        id: 'food_storage',
        nameEn: 'Food Storage',
        nameAr: 'مخزن الطعام الفضائي',
        icon: '🍱',
        accentHex: '#10b981',
        pos: [0, -4.8],
        size: [4.2, 3.2],
        miniGameId: 'l2_balanced_meal',
        shortObjectiveAr: 'تجميع صينية غذاء متوازنة'
      },
      {
        id: 'hydration_station',
        nameEn: 'Hydration Station',
        nameAr: 'محطة الترطيب',
        icon: '💧',
        accentHex: '#06b6d4',
        pos: [8.5, -4.5],
        size: [4.2, 3.2],
        miniGameId: 'l2_hydration',
        shortObjectiveAr: 'الشرب الآمن من كيس الماء'
      },
      {
        id: 'crew_quarters',
        nameEn: 'Crew Quarters',
        nameAr: 'مقصورة نوم الطاقم',
        icon: '🛏️',
        accentHex: '#a855f7',
        pos: [-7.5, 4.8],
        size: [4.4, 3.2],
        miniGameId: 'l2_motion_sickness',
        shortObjectiveAr: 'الراحة للتعافي من دوار 0G'
      },
      {
        id: 'medical_bay',
        nameEn: 'Medical Bay',
        nameAr: 'العيادة الطبية',
        icon: '🏥',
        accentHex: '#ec4899',
        pos: [0, 4.8],
        size: [4.2, 3.2],
        miniGameId: 'l2_motion_sickness',
        shortObjectiveAr: 'تشخيص دوار الحركة والترطيب'
      },
      {
        id: 'communication_room',
        nameEn: 'Communication Room',
        nameAr: 'غرفة الاتصالات ورادار ناسا',
        icon: '📡',
        accentHex: '#f59e0b',
        pos: [8.2, 4.8],
        size: [4.6, 3.2],
        miniGameId: 'l2_systems_neows',
        shortObjectiveAr: 'فحص الأنظمة ورادار NeoWs'
      }
    ]
  },

  3: {
    id: 3,
    titleEn: 'Level 3: Lunar Outpost Operations',
    titleAr: 'المستوى 3: عمليات قاعدة القمر أرتميس',
    subtitleAr: '12 منطقة قمرية، 5 مهام علمية مترابطة، وعاصفة DONKI الشمسية قبل الإذن بالعودة',
    themeColorHex: '#fbbf24',
    nasaDatasets: ['NASA DONKI (CME/SEP)', 'NASA OSDR (Bone/Muscle & Radiation)', 'NASA LROC Crater Imagery'],
    miniGames: [
      'l3_resistance_training',
      'l3_water_recycling',
      'l3_solar_storm',
      'l3_eva_prep',
      'l3_lunar_samples'
    ],
    completionBannerEn: 'ALL SYSTEMS VERIFIED – RETURN TO EARTH AUTHORIZED!',
    completionBannerAr: 'تم التحقق من كل الأنظمة – الإذن بالعودة إلى الأرض مُعتمد! 🌍',
    rooms: [
      {
        id: 'habitat',
        nameEn: 'Habitat',
        nameAr: 'وحدة السكن',
        icon: '🏠',
        accentHex: '#38bdf8',
        pos: [-9, -5],
        size: [3.6, 2.8],
        miniGameId: 'l3_resistance_training',
        shortObjectiveAr: 'بيئة المعيشة ومتابعة الرواد'
      },
      {
        id: 'fitness_room',
        nameEn: 'Fitness Room',
        nameAr: 'صالة تمارين المقاومة',
        icon: '🏋️',
        accentHex: '#10b981',
        pos: [-3.5, -5.2],
        size: [3.8, 2.8],
        miniGameId: 'l3_resistance_training',
        shortObjectiveAr: 'تمارين الأرجل والذراعين والجذع'
      },
      {
        id: 'medical_room',
        nameEn: 'Medical Room',
        nameAr: 'الغرفة الطبية (OSDR)',
        icon: '🧬',
        accentHex: '#ec4899',
        pos: [2.5, -5.2],
        size: [3.6, 2.8],
        consoleAction: 'l3_medical_osdr',
        miniGameId: 'l3_resistance_training',
        shortObjectiveAr: 'مراقبة كثافة العظام والعضلات'
      },
      {
        id: 'food_nutrition_lab',
        nameEn: 'Food & Nutrition Lab',
        nameAr: 'مختبر الغذاء القمري',
        icon: '🌱',
        accentHex: '#84cc16',
        pos: [8.5, -5],
        size: [3.8, 2.8],
        miniGameId: 'l3_water_recycling',
        shortObjectiveAr: 'دعم الفيتامينات ونمو النباتات'
      },
      {
        id: 'water_recycling_room',
        nameEn: 'Water Recycling Room',
        nameAr: 'غرفة تدوير المياه ECLSS',
        icon: '🚰',
        accentHex: '#06b6d4',
        pos: [-9, 0],
        size: [3.8, 2.8],
        miniGameId: 'l3_water_recycling',
        shortObjectiveAr: 'عزل الفلتر وتنظيفه واختباره'
      },
      {
        id: 'power_solar_control',
        nameEn: 'Power & Solar Control',
        nameAr: 'تحكم الطاقة والدروع',
        icon: '⚡',
        accentHex: '#f59e0b',
        pos: [-3, 0],
        size: [3.8, 2.8],
        consoleAction: 'l3_power_tradeoff',
        miniGameId: 'l3_solar_storm',
        shortObjectiveAr: 'موازنة الطاقة والأكسجين والدروع'
      },
      {
        id: 'mission_control',
        nameEn: 'Mission Control',
        nameAr: 'مركز قيادة القمر',
        icon: '🛸',
        accentHex: '#a855f7',
        pos: [3, 0],
        size: [4.0, 2.9],
        consoleAction: 'l3_return_auth',
        shortObjectiveAr: 'مراجعة العينات وإذن العودة للأرض'
      },
      {
        id: 'eva_prep_room',
        nameEn: 'EVA Prep Room',
        nameAr: 'غرفة تجهيز البدلة والأدوات',
        icon: '👨‍🚀',
        accentHex: '#6366f1',
        pos: [9, 0],
        size: [3.8, 2.8],
        miniGameId: 'l3_eva_prep',
        shortObjectiveAr: 'البدلة وحزم الأدوات الـ 4 العلمية'
      },
      {
        id: 'emergency_shelter',
        nameEn: 'Emergency Shelter',
        nameAr: 'ملجأ الطوارئ الإشعاعي',
        icon: '🛡️',
        accentHex: '#ef4444',
        pos: [-9, 5.2],
        size: [3.8, 2.8],
        miniGameId: 'l3_solar_storm',
        shortObjectiveAr: 'الاحتماء من العاصفة الشمسية DONKI'
      },
      {
        id: 'solar_panel_field',
        nameEn: 'Solar Panel Field',
        nameAr: 'حقل الألواح الشمسية',
        icon: '☀️',
        accentHex: '#eab308',
        pos: [-3, 5.2],
        size: [3.8, 2.8],
        miniGameId: 'l3_solar_storm',
        shortObjectiveAr: 'تأمين الألواح عند عاصفة CME'
      },
      {
        id: 'lunar_rover_parking',
        nameEn: 'Lunar Rover Parking',
        nameAr: 'موقف العربة القمرية',
        icon: '🛞',
        accentHex: '#94a3b8',
        pos: [3, 5.2],
        size: [3.8, 2.8],
        miniGameId: 'l3_lunar_samples',
        shortObjectiveAr: 'التحرك لمنطقة البحث القمرية'
      },
      {
        id: 'lunar_exploration_zone',
        nameEn: 'Lunar Exploration Zone',
        nameAr: 'منطقة استكشاف العينات القمرية',
        icon: '🪨',
        accentHex: '#cbd5e1',
        pos: [9, 5.2],
        size: [4.1, 3.0],
        miniGameId: 'l3_lunar_samples',
        shortObjectiveAr: 'جمع الصخور بأدوات EVA المعبأة'
      }
    ]
  },

  4: {
    id: 4,
    titleEn: 'Level 4: Return to Earth',
    titleAr: 'المستوى 4: رحلة العودة إلى الأرض',
    subtitleAr: '8 غرف في مركبة العودة و5 تحديات حاسمة حتى الهبوط الآمن على الأرض',
    themeColorHex: '#34d399',
    nasaDatasets: ['Orion Heat Shield (PICA-X)', 'DSN Light-Time Delay (~1.3s)', 'NASA OSDR G-Load'],
    miniGames: [
      'l4_departure_prep',
      'l4_navigation_earth',
      'l4_spacecraft_emergency',
      'l4_earth_reentry',
      'l4_safe_landing'
    ],
    completionBannerEn: 'MISSION ACCOMPLISHED!',
    completionBannerAr: 'تمت المهمة بنجاح باهر! أهلاً بكم في كوكب الأرض 🌍🎉',
    rooms: [
      {
        id: 'central_corridor',
        nameEn: 'Central Corridor',
        nameAr: 'الممر المركزي وبوابة الهبوط',
        icon: '🪂',
        accentHex: '#10b981',
        pos: [0, 0],
        size: [14, 2.4],
        miniGameId: 'l4_safe_landing',
        shortObjectiveAr: 'الربط بين الغرف ونشر مظلات الهبوط'
      },
      {
        id: 'cargo_sample_storage',
        nameEn: 'Cargo & Sample Storage',
        nameAr: 'مخزن الشحن وعينات القمر',
        icon: '📦',
        accentHex: '#f59e0b',
        pos: [-8.5, -4.6],
        size: [4.2, 3.1],
        miniGameId: 'l4_departure_prep',
        shortObjectiveAr: 'تثبيت عينات القمر من المستوى 3'
      },
      {
        id: 'cockpit_navigation',
        nameEn: 'Cockpit / Navigation',
        nameAr: 'مقصورة القيادة والملاحة',
        icon: '🧭',
        accentHex: '#38bdf8',
        pos: [-2.8, -4.6],
        size: [4.1, 3.1],
        miniGameId: 'l4_navigation_earth',
        shortObjectiveAr: 'رسم مسار العودة للأرض وتصحيحه'
      },
      {
        id: 'communication_room',
        nameEn: 'Communication Room',
        nameAr: 'غرفة الاتصالات (تأخير 1.3ث)',
        icon: '📡',
        accentHex: '#818cf8',
        pos: [3, -4.6],
        size: [4.1, 3.1],
        consoleAction: 'l4_delay_comms',
        miniGameId: 'l4_navigation_earth',
        shortObjectiveAr: 'تجربة تأخير الإشارة الأرضية 1.3 ثانية'
      },
      {
        id: 'systems_check_station',
        nameEn: 'Systems Check Station',
        nameAr: 'محطة الدرع الحراري والأنظمة',
        icon: '🔥',
        accentHex: '#f97316',
        pos: [8.6, -4.6],
        size: [4.1, 3.1],
        miniGameId: 'l4_earth_reentry',
        shortObjectiveAr: 'فحص PICA-X واختراق الغلاف الجوي'
      },
      {
        id: 'equipment_maintenance',
        nameEn: 'Equipment & Maintenance',
        nameAr: 'غرفة الصيانة والطوارئ',
        icon: '🔧',
        accentHex: '#ef4444',
        pos: [-6.5, 4.6],
        size: [4.5, 3.1],
        miniGameId: 'l4_spacecraft_emergency',
        shortObjectiveAr: 'تشخيص وإصلاح أعطال الطيران'
      },
      {
        id: 'medical_bay',
        nameEn: 'Medical Bay',
        nameAr: 'العيادة الطبية للعودة',
        icon: '🩺',
        accentHex: '#ec4899',
        pos: [0.5, 4.6],
        size: [4.2, 3.1],
        miniGameId: 'l4_earth_reentry',
        shortObjectiveAr: 'متابعة تحمل الجاذبية 4G للطاقم'
      },
      {
        id: 'crew_quarters',
        nameEn: 'Crew Quarters',
        nameAr: 'مقصورة الطاقم والهبوط',
        icon: '🪑',
        accentHex: '#34d399',
        pos: [7.5, 4.6],
        size: [4.2, 3.1],
        miniGameId: 'l4_safe_landing',
        shortObjectiveAr: 'تأمين الأحزمة ومراقبة المظلات'
      }
    ]
  }
};
