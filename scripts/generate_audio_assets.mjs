import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const rootDir = process.cwd();
const envPath = path.join(rootDir, '.env');

// Read GEMINI_API_KEY from .env
let apiKey = process.env.GEMINI_API_KEY || '';
if (!apiKey && fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  const match = content.match(/^GEMINI_API_KEY=(.+)$/m);
  if (match) {
    apiKey = match[1].trim();
  }
}

// ---------------------------------------------------------------------------
// 1. RECONCILED CANONICAL DIALOGUE INVENTORY (43 UNIQUE EVENTS)
// 4 Independent Tracking Fields per Entry:
// 1. dialogueSpecExists: boolean
// 2. audioFileExists: checked dynamically
// 3. gameplayInteractionExists: boolean (16 IMPLEMENTED in current baseline, 27 PLANNED)
// 4. eventWiredToAudio: boolean (Phase 3.2B engine wiring)
// ---------------------------------------------------------------------------
export const DIALOGUE_INVENTORY = [
  // =========================================================================
  // GROUP 1: GLOBAL NAVIGATION & ONBOARDING (3 Events — Gameplay Implemented)
  // =========================================================================
  {
    id: 'nav_intro_welcome',
    category: 'navigation',
    island: 'GLOBAL',
    status: 'IMPLEMENTED',
    dialogueSpecExists: true,
    gameplayInteractionExists: true,
    eventWiredToAudio: false,
    trigger: 'APP_START',
    priority: 'HIGH',
    cooldownMs: 0,
    hasSpeech: true,
    hasSfx: true,
    sfxName: 'sfx_ui_click',
    tone: 'مبهج ومتحمس',
    textAr: 'يا مرحب يا بطل! أنا روبو.. جاهز للمغامرة في الفضاء؟ يلا بينا!'
  },
  {
    id: 'nav_map_welcome',
    category: 'navigation',
    island: 'GLOBAL',
    status: 'IMPLEMENTED',
    dialogueSpecExists: true,
    gameplayInteractionExists: true,
    eventWiredToAudio: false,
    trigger: 'MAP_ENTER',
    priority: 'NORMAL',
    cooldownMs: 8000,
    hasSpeech: true,
    hasSfx: true,
    sfxName: 'sfx_ui_click',
    tone: 'استكشافي ودود',
    textAr: 'دي خريطة الجزر الفضائية! كل جزيرة فيها تحدي ومغامرة جديدة!'
  },
  {
    id: 'nav_hangar_welcome',
    category: 'navigation',
    island: 'GLOBAL',
    status: 'IMPLEMENTED',
    dialogueSpecExists: true,
    gameplayInteractionExists: true,
    eventWiredToAudio: false,
    trigger: 'HANGAR_ENTER',
    priority: 'NORMAL',
    cooldownMs: 8000,
    hasSpeech: true,
    hasSfx: true,
    sfxName: 'sfx_ui_click',
    tone: 'فخور ومبدع',
    textAr: 'أهلاً بيك في مرآب سفينتك! تقدر تغير ألوانها وتشوف أوسمتك!'
  },

  // =========================================================================
  // GROUP 2: CINEMATIC TRAVEL TRANSITIONS (6 Events — Planned for Phase 3.2 Travel Machine)
  // =========================================================================
  {
    id: 'travel_liftoff',
    category: 'travel',
    island: 'GLOBAL',
    status: 'PLANNED',
    dialogueSpecExists: true,
    gameplayInteractionExists: false,
    eventWiredToAudio: false,
    trigger: 'TRAVEL_START',
    priority: 'CRITICAL',
    cooldownMs: 0,
    hasSpeech: true,
    hasSfx: true,
    sfxName: 'sfx_rocket_launch',
    tone: 'إثارة العد التنازلي',
    textAr: 'تلاتة.. اتنين.. واحد.. انطلاق في الفضاء!'
  },
  {
    id: 'travel_inflight',
    category: 'travel',
    island: 'GLOBAL',
    status: 'PLANNED',
    dialogueSpecExists: true,
    gameplayInteractionExists: false,
    eventWiredToAudio: false,
    trigger: 'TRAVEL_INFLIGHT',
    priority: 'LOW',
    cooldownMs: 12000,
    hasSpeech: true,
    hasSfx: false,
    tone: 'مرح وتشجيع',
    textAr: 'شايف النجوم والسدم الملونة؟ اجمع النجوم وإحنا طايرين!'
  },
  {
    id: 'travel_arrive_nutrition',
    category: 'travel',
    island: 'GLOBAL',
    status: 'PLANNED',
    dialogueSpecExists: true,
    gameplayInteractionExists: false,
    eventWiredToAudio: false,
    trigger: 'TRAVEL_ARRIVE_NUTRITION',
    priority: 'HIGH',
    cooldownMs: 0,
    hasSpeech: true,
    hasSfx: true,
    sfxName: 'sfx_landing_thud',
    tone: 'انتعاش وترحاب',
    textAr: 'وصلنا لحديقة التغذية الفضائية! يلا نجهز وجبات رواد الفضاء!'
  },
  {
    id: 'travel_arrive_science',
    category: 'travel',
    island: 'GLOBAL',
    status: 'PLANNED',
    dialogueSpecExists: true,
    gameplayInteractionExists: false,
    eventWiredToAudio: false,
    trigger: 'TRAVEL_ARRIVE_SCIENCE',
    priority: 'HIGH',
    cooldownMs: 0,
    hasSpeech: true,
    hasSfx: true,
    sfxName: 'sfx_landing_thud',
    tone: 'فضول واستكشاف',
    textAr: 'وصلنا لمرصد الكواكب والنجوم! التلسكوب الضخم جاهز للاستكشاف!'
  },
  {
    id: 'travel_arrive_suit',
    category: 'travel',
    island: 'GLOBAL',
    status: 'PLANNED',
    dialogueSpecExists: true,
    gameplayInteractionExists: false,
    eventWiredToAudio: false,
    trigger: 'TRAVEL_ARRIVE_TRAINING',
    priority: 'HIGH',
    cooldownMs: 0,
    hasSpeech: true,
    hasSfx: true,
    sfxName: 'sfx_landing_thud',
    tone: 'نشاط وتحدي',
    textAr: 'وصلنا لجزيرة تدريب بدلة الفضاء وانعدام الجاذبية! استعد يا بطل!'
  },
  {
    id: 'travel_arrive_launch',
    category: 'travel',
    island: 'GLOBAL',
    status: 'PLANNED',
    dialogueSpecExists: true,
    gameplayInteractionExists: false,
    eventWiredToAudio: false,
    trigger: 'TRAVEL_ARRIVE_LAUNCH',
    priority: 'HIGH',
    cooldownMs: 0,
    hasSpeech: true,
    hasSfx: true,
    sfxName: 'sfx_landing_thud',
    tone: 'فخر وهيبة',
    textAr: 'وصلنا لمنصة الانطلاق الكبرى! الصاروخ جاهز لرحلتنا للنجوم!'
  },

  // =========================================================================
  // GROUP 3: ISLAND 1 — SPACE NUTRITION GARDEN (13 Events — Gameplay Implemented)
  // NASA Microgravity Physics & Strict Mechanical Accuracy:
  // - Tortillas REDUCE crumbs; unleavened bread reduces hazards.
  // - Burger bread crumb hazard: loose particles clog environmental air filters.
  // - Soda physics: lack of buoyancy separation in zero-g causes liquid-gas reflux ("wet burps").
  // - Pizza hazard: dry crusts crumble easily & unsecured open toppings drift in the cabin. (No claims of free oils).
  // - Success wording: acknowledges 4 safe items packed, without claiming nonexistent nutritional balance algorithms.
  // =========================================================================
  {
    id: 'nutri_welcome',
    category: 'nutrition',
    island: 'ISLAND_1_NUTRITION',
    status: 'IMPLEMENTED',
    dialogueSpecExists: true,
    gameplayInteractionExists: true,
    eventWiredToAudio: false,
    trigger: 'LAB_START',
    priority: 'HIGH',
    cooldownMs: 0,
    hasSpeech: true,
    hasSfx: true,
    sfxName: 'sfx_ui_click',
    tone: 'توجيهي مشجع',
    textAr: 'أهلاً بيك في مطبخ الفضاء! اختار أربع وجبات صحية للصندوق، وابعد عن الأكل اللي بيفتت!'
  },
  {
    id: 'nutri_food_added',
    category: 'nutrition',
    island: 'ISLAND_1_NUTRITION',
    status: 'IMPLEMENTED',
    dialogueSpecExists: true,
    gameplayInteractionExists: true,
    eventWiredToAudio: false,
    trigger: 'FOOD_VALID_ADDED',
    priority: 'NORMAL',
    cooldownMs: 2500,
    hasSpeech: true,
    hasSfx: true,
    sfxName: 'sfx_food_pack',
    tone: 'إشادة وفرحة',
    textAr: 'اختيار ممتاز وصحي لمهمتنا!'
  },
  {
    id: 'nutri_fact_tortilla',
    category: 'nutrition',
    island: 'ISLAND_1_NUTRITION',
    status: 'IMPLEMENTED',
    dialogueSpecExists: true,
    gameplayInteractionExists: true,
    eventWiredToAudio: false,
    trigger: 'FOOD_FACT_TORTILLA',
    priority: 'NORMAL',
    cooldownMs: 4000,
    hasSpeech: true,
    hasSfx: true,
    sfxName: 'sfx_food_pack',
    tone: 'علمي مبسط',
    textAr: 'التورتيلا اختيار مناسب للفضاء لأنها بتقلل الفتات مقارنة بالخبز العادي!'
  },
  {
    id: 'nutri_fact_pouch',
    category: 'nutrition',
    island: 'ISLAND_1_NUTRITION',
    status: 'IMPLEMENTED',
    dialogueSpecExists: true,
    gameplayInteractionExists: true,
    eventWiredToAudio: false,
    trigger: 'FOOD_FACT_POUCH',
    priority: 'NORMAL',
    cooldownMs: 4000,
    hasSpeech: true,
    hasSfx: true,
    sfxName: 'sfx_food_pack',
    tone: 'تعليمي مشوق',
    textAr: 'وجبة مجففة بالتجميد.. الرائد بيحقنها بمية دافية قبل الأكل!'
  },
  {
    id: 'nutri_fact_drink',
    category: 'nutrition',
    island: 'ISLAND_1_NUTRITION',
    status: 'IMPLEMENTED',
    dialogueSpecExists: true,
    gameplayInteractionExists: true,
    eventWiredToAudio: false,
    trigger: 'FOOD_FACT_DRINK',
    priority: 'NORMAL',
    cooldownMs: 4000,
    hasSpeech: true,
    hasSfx: true,
    sfxName: 'sfx_food_pack',
    tone: 'علمي توضيحي',
    textAr: 'عصير في كيس محكم مع مشبك أمان لمنع هروب قطرات السائل!'
  },
  {
    id: 'nutri_fact_apple',
    category: 'nutrition',
    island: 'ISLAND_1_NUTRITION',
    status: 'IMPLEMENTED',
    dialogueSpecExists: true,
    gameplayInteractionExists: true,
    eventWiredToAudio: false,
    trigger: 'FOOD_FACT_APPLE',
    priority: 'NORMAL',
    cooldownMs: 4000,
    hasSpeech: true,
    hasSfx: true,
    sfxName: 'sfx_food_pack',
    tone: 'بهجة وصحة',
    textAr: 'التفاح الطازج بيمد الرواد بالفيتامينات والألياف وطاقة النشاط!'
  },
  {
    id: 'nutri_fact_broccoli',
    category: 'nutrition',
    island: 'ISLAND_1_NUTRITION',
    status: 'IMPLEMENTED',
    dialogueSpecExists: true,
    gameplayInteractionExists: true,
    eventWiredToAudio: false,
    trigger: 'FOOD_FACT_BROCCOLI',
    priority: 'NORMAL',
    cooldownMs: 4000,
    hasSpeech: true,
    hasSfx: true,
    sfxName: 'sfx_food_pack',
    tone: 'تشجيعي صحي',
    textAr: 'البروكلي مليان فيتامينات ومعادن مهمة لصحة الجسم والمناعة!'
  },
  {
    id: 'nutri_fact_milk',
    category: 'nutrition',
    island: 'ISLAND_1_NUTRITION',
    status: 'IMPLEMENTED',
    dialogueSpecExists: true,
    gameplayInteractionExists: true,
    eventWiredToAudio: false,
    trigger: 'FOOD_FACT_MILK',
    priority: 'NORMAL',
    cooldownMs: 4000,
    hasSpeech: true,
    hasSfx: true,
    sfxName: 'sfx_food_pack',
    tone: 'علمي دافئ',
    textAr: 'الحليب بيمدنا بالكالسيوم المهم لحماية العظام في انعدام الجاذبية!'
  },
  {
    id: 'nutri_banned_burger',
    category: 'nutrition',
    island: 'ISLAND_1_NUTRITION',
    status: 'IMPLEMENTED',
    dialogueSpecExists: true,
    gameplayInteractionExists: true,
    eventWiredToAudio: false,
    trigger: 'FOOD_BANNED_BURGER',
    priority: 'HIGH',
    cooldownMs: 2500,
    hasSpeech: true,
    hasSfx: true,
    sfxName: 'sfx_food_reject',
    tone: 'تحذير كرتوني لطيف',
    textAr: 'احترس! خبز البرجر بيتفتت، والفتات بيطير في الكابينة ويسد فلاتر الهواء!'
  },
  {
    id: 'nutri_banned_soda',
    category: 'nutrition',
    island: 'ISLAND_1_NUTRITION',
    status: 'IMPLEMENTED',
    dialogueSpecExists: true,
    gameplayInteractionExists: true,
    eventWiredToAudio: false,
    trigger: 'FOOD_BANNED_SODA',
    priority: 'HIGH',
    cooldownMs: 2500,
    hasSpeech: true,
    hasSfx: true,
    sfxName: 'sfx_food_reject',
    tone: 'تحذير علمي لطيف',
    textAr: 'المشروبات الغازية صعبة في الفضاء، لأن فقاعات الغاز مابتنفصلش عن السائل في المعدة بدون جاذبية!'
  },
  {
    id: 'nutri_banned_pizza',
    category: 'nutrition',
    island: 'ISLAND_1_NUTRITION',
    status: 'IMPLEMENTED',
    dialogueSpecExists: true,
    gameplayInteractionExists: true,
    eventWiredToAudio: false,
    trigger: 'FOOD_BANNED_PIZZA',
    priority: 'HIGH',
    cooldownMs: 2500,
    hasSpeech: true,
    hasSfx: true,
    sfxName: 'sfx_food_reject',
    tone: 'تنبيه ودود',
    textAr: 'احترس! أطراف خبز البيتزا بتتفتت بسهولة، ومكوناتها المفتوحة ممكن تطير في الكابينة!'
  },
  {
    id: 'nutri_cargo_full',
    category: 'nutrition',
    island: 'ISLAND_1_NUTRITION',
    status: 'IMPLEMENTED',
    dialogueSpecExists: true,
    gameplayInteractionExists: true,
    eventWiredToAudio: false,
    trigger: 'CARGO_CAPACITY_REACHED',
    priority: 'HIGH',
    cooldownMs: 3000,
    hasSpeech: true,
    hasSfx: true,
    sfxName: 'sfx_ui_click',
    tone: 'تنبيه إيجابي',
    textAr: 'الصندوق اكتمل بأربع وجبات ممتازة! اضغط زر الانطلاق يا كابتن!'
  },
  {
    id: 'nutri_complete',
    category: 'nutrition',
    island: 'ISLAND_1_NUTRITION',
    status: 'IMPLEMENTED',
    dialogueSpecExists: true,
    gameplayInteractionExists: true,
    eventWiredToAudio: false,
    trigger: 'MISSION_1_COMPLETE',
    priority: 'CRITICAL',
    cooldownMs: 0,
    hasSpeech: true,
    hasSfx: true,
    sfxName: 'sfx_mission_fanfare',
    tone: 'احتفال وانتصار',
    textAr: 'الله عليك يا كابتن! اختياراتك مناسبة وجاهزة للرحلة.. عاش يا بطل!'
  },

  // =========================================================================
  // GROUP 4: ISLAND 2 — PLANET OBSERVATORY (12 Events — Planned for Phase 3.3)
  // =========================================================================
  {
    id: 'sci_welcome',
    category: 'science',
    island: 'ISLAND_2_OBSERVATORY',
    status: 'PLANNED',
    dialogueSpecExists: true,
    gameplayInteractionExists: false,
    eventWiredToAudio: false,
    trigger: 'OBSERVATORY_START',
    priority: 'HIGH',
    cooldownMs: 0,
    hasSpeech: true,
    hasSfx: true,
    sfxName: 'sfx_ui_click',
    tone: 'استكشافي مشوق',
    textAr: 'أهلاً بيك في مرصد الفضاء! اضبط التلسكوب وامسح أسطح الكواكب بالرادار!'
  },
  {
    id: 'sci_prompt_mars',
    category: 'science',
    island: 'ISLAND_2_OBSERVATORY',
    status: 'PLANNED',
    dialogueSpecExists: true,
    gameplayInteractionExists: false,
    eventWiredToAudio: false,
    trigger: 'QUIZ_MARS',
    priority: 'NORMAL',
    cooldownMs: 4000,
    hasSpeech: true,
    hasSfx: false,
    tone: 'سؤال مرح',
    textAr: 'مين الكوكب الأحمر اللي صخوره مليانة أكسيد الحديد؟'
  },
  {
    id: 'sci_fact_mars',
    category: 'science',
    island: 'ISLAND_2_OBSERVATORY',
    status: 'PLANNED',
    dialogueSpecExists: true,
    gameplayInteractionExists: false,
    eventWiredToAudio: false,
    trigger: 'SCAN_OLYMPUS_MONS',
    priority: 'NORMAL',
    cooldownMs: 3000,
    hasSpeech: true,
    hasSfx: true,
    sfxName: 'sfx_ui_click',
    tone: 'انبهار علمي',
    textAr: 'جبل أوليمبوس على المريخ.. أضخم بركان في مجموعتنا الشمسية!'
  },
  {
    id: 'sci_prompt_saturn',
    category: 'science',
    island: 'ISLAND_2_OBSERVATORY',
    status: 'PLANNED',
    dialogueSpecExists: true,
    gameplayInteractionExists: false,
    eventWiredToAudio: false,
    trigger: 'QUIZ_SATURN',
    priority: 'NORMAL',
    cooldownMs: 4000,
    hasSpeech: true,
    hasSfx: false,
    tone: 'سؤال وصفي',
    textAr: 'أي كوكب مشهور بأجمل وأكبر حلقات بتدور حواليه؟'
  },
  {
    id: 'sci_fact_saturn',
    category: 'science',
    island: 'ISLAND_2_OBSERVATORY',
    status: 'PLANNED',
    dialogueSpecExists: true,
    gameplayInteractionExists: false,
    eventWiredToAudio: false,
    trigger: 'SCAN_SATURN_RINGS',
    priority: 'NORMAL',
    cooldownMs: 3000,
    hasSpeech: true,
    hasSfx: true,
    sfxName: 'sfx_ui_click',
    tone: 'حقيقة مدهشة',
    textAr: 'حلقات زحل مش صلبة، دي مليارات من قطع الجليد والصخور!'
  },
  {
    id: 'sci_prompt_jupiter',
    category: 'science',
    island: 'ISLAND_2_OBSERVATORY',
    status: 'PLANNED',
    dialogueSpecExists: true,
    gameplayInteractionExists: false,
    eventWiredToAudio: false,
    trigger: 'QUIZ_JUPITER',
    priority: 'NORMAL',
    cooldownMs: 4000,
    hasSpeech: true,
    hasSfx: false,
    tone: 'سؤال عظيم',
    textAr: 'ما هو أضخم كواكب المجموعة الشمسية اللي فيه العاصفة الحمراء؟'
  },
  {
    id: 'sci_fact_jupiter',
    category: 'science',
    island: 'ISLAND_2_OBSERVATORY',
    status: 'PLANNED',
    dialogueSpecExists: true,
    gameplayInteractionExists: false,
    eventWiredToAudio: false,
    trigger: 'SCAN_GREAT_RED_SPOT',
    priority: 'NORMAL',
    cooldownMs: 3000,
    hasSpeech: true,
    hasSfx: true,
    sfxName: 'sfx_ui_click',
    tone: 'انبهار بالعظمة',
    textAr: 'البقعة الحمراء على المشتري إعصار عملاق بقاله مئات السنين!'
  },
  {
    id: 'sci_prompt_earth',
    category: 'science',
    island: 'ISLAND_2_OBSERVATORY',
    status: 'PLANNED',
    dialogueSpecExists: true,
    gameplayInteractionExists: false,
    eventWiredToAudio: false,
    trigger: 'QUIZ_EARTH',
    priority: 'NORMAL',
    cooldownMs: 4000,
    hasSpeech: true,
    hasSfx: false,
    tone: 'سؤال دافئ',
    textAr: 'مين الكوكب الأزرق الجميل وطننا اللي المية بتغطي معظمه؟'
  },
  {
    id: 'sci_fact_earth',
    category: 'science',
    island: 'ISLAND_2_OBSERVATORY',
    status: 'PLANNED',
    dialogueSpecExists: true,
    gameplayInteractionExists: false,
    eventWiredToAudio: false,
    trigger: 'SCAN_EARTH_OCEANS',
    priority: 'NORMAL',
    cooldownMs: 3000,
    hasSpeech: true,
    hasSfx: true,
    sfxName: 'sfx_ui_click',
    tone: 'حقيقة دافئة',
    textAr: 'محيطات الأرض الزرقاء بتغطي أكتر من سبعين في المية من سطحه!'
  },
  {
    id: 'sci_correct',
    category: 'science',
    island: 'ISLAND_2_OBSERVATORY',
    status: 'PLANNED',
    dialogueSpecExists: true,
    gameplayInteractionExists: false,
    eventWiredToAudio: false,
    trigger: 'QUIZ_ANSWER_CORRECT',
    priority: 'HIGH',
    cooldownMs: 0,
    hasSpeech: true,
    hasSfx: true,
    sfxName: 'sfx_mission_fanfare',
    tone: 'إشادة ذكية',
    textAr: 'إجابة عبقرية وصحيحة يا بطل! أحسنت!'
  },
  {
    id: 'sci_wrong',
    category: 'science',
    island: 'ISLAND_2_OBSERVATORY',
    status: 'PLANNED',
    dialogueSpecExists: true,
    gameplayInteractionExists: false,
    eventWiredToAudio: false,
    trigger: 'QUIZ_ANSWER_WRONG',
    priority: 'HIGH',
    cooldownMs: 2500,
    hasSpeech: true,
    hasSfx: true,
    sfxName: 'sfx_food_reject',
    tone: 'تشجيع على المحاولة',
    textAr: 'فكر تاني يا بطل! ركز في السؤال وحاول مرة تانية!'
  },
  {
    id: 'sci_complete',
    category: 'science',
    island: 'ISLAND_2_OBSERVATORY',
    status: 'PLANNED',
    dialogueSpecExists: true,
    gameplayInteractionExists: false,
    eventWiredToAudio: false,
    trigger: 'MISSION_2_COMPLETE',
    priority: 'CRITICAL',
    cooldownMs: 0,
    hasSpeech: true,
    hasSfx: true,
    sfxName: 'sfx_mission_fanfare',
    tone: 'تتويج واحتفال',
    textAr: 'عاش يا مستكشف الفضاء! رصدت الكواكب بنجاح وجمعت كل النجوم!'
  },

  // =========================================================================
  // GROUP 5: ISLAND 3 — ASTRONAUT TRAINING ISLAND (5 Events — Planned for Phase 4)
  // =========================================================================
  {
    id: 'suit_welcome',
    category: 'suit_training',
    island: 'ISLAND_3_SUIT',
    status: 'PLANNED',
    dialogueSpecExists: true,
    gameplayInteractionExists: false,
    eventWiredToAudio: false,
    trigger: 'SUIT_ROOM_ENTER',
    priority: 'HIGH',
    cooldownMs: 0,
    hasSpeech: true,
    hasSfx: true,
    sfxName: 'sfx_ui_click',
    tone: 'حماسي واستعداد',
    textAr: 'أهلاً بيك في ورشة بدلات الفضاء! يلا نعاير البدلة ونقفل الخوذة بإحكام!'
  },
  {
    id: 'suit_helmet_lock',
    category: 'suit_training',
    island: 'ISLAND_3_SUIT',
    status: 'PLANNED',
    dialogueSpecExists: true,
    gameplayInteractionExists: false,
    eventWiredToAudio: false,
    trigger: 'HELMET_RING_LOCKED',
    priority: 'HIGH',
    cooldownMs: 2000,
    hasSpeech: true,
    hasSfx: true,
    sfxName: 'sfx_canopy_close',
    tone: 'أمان وتأكيد',
    textAr: 'تم قفل حلقة الخوذة بإحكام وضغط الهواء مضبوط تماماً!'
  },
  {
    id: 'suit_tether_attach',
    category: 'suit_training',
    island: 'ISLAND_3_SUIT',
    status: 'PLANNED',
    dialogueSpecExists: true,
    gameplayInteractionExists: false,
    eventWiredToAudio: false,
    trigger: 'SAFETY_TETHER_ATTACHED',
    priority: 'HIGH',
    cooldownMs: 2000,
    hasSpeech: true,
    hasSfx: true,
    sfxName: 'sfx_ui_click',
    tone: 'إشادة بالأمان',
    textAr: 'حبل الأمان مربوط بمشبك المحطة لمنع الانجراف في الفضاء المفتوح!'
  },
  {
    id: 'suit_zerog_training',
    category: 'suit_training',
    island: 'ISLAND_3_SUIT',
    status: 'PLANNED',
    dialogueSpecExists: true,
    gameplayInteractionExists: false,
    eventWiredToAudio: false,
    trigger: 'ZEROG_OBSTACLE_CLEAR',
    priority: 'NORMAL',
    cooldownMs: 3000,
    hasSpeech: true,
    hasSfx: true,
    sfxName: 'sfx_ui_click',
    tone: 'تشجيع حركي',
    textAr: 'حركة ممتازة في انعدام الجاذبية! اتعلمت تسبح بدون وزن!'
  },
  {
    id: 'suit_complete',
    category: 'suit_training',
    island: 'ISLAND_3_SUIT',
    status: 'PLANNED',
    dialogueSpecExists: true,
    gameplayInteractionExists: false,
    eventWiredToAudio: false,
    trigger: 'MISSION_3_COMPLETE',
    priority: 'CRITICAL',
    cooldownMs: 0,
    hasSpeech: true,
    hasSfx: true,
    sfxName: 'sfx_mission_fanfare',
    tone: 'انتصار تدريبي',
    textAr: 'بدلة الفضاء مضبوطة ومحكمة تمام! جاهز لرحلة الانطلاق الكبرى!'
  },

  // =========================================================================
  // GROUP 6: ISLAND 4 — GRAND LAUNCH ISLAND (4 Events — Planned for Phase 4 Climax)
  // =========================================================================
  {
    id: 'launch_welcome',
    category: 'launch',
    island: 'ISLAND_4_LAUNCH',
    status: 'PLANNED',
    dialogueSpecExists: true,
    gameplayInteractionExists: false,
    eventWiredToAudio: false,
    trigger: 'LAUNCH_PAD_ENTER',
    priority: 'HIGH',
    cooldownMs: 0,
    hasSpeech: true,
    hasSfx: true,
    sfxName: 'sfx_ui_click',
    tone: 'هيبة وترقب',
    textAr: 'وصلنا لبرج الانطلاق العملاق! راجع أنظمة الصاروخ قبل بدء العد التنازلي!'
  },
  {
    id: 'launch_checklist',
    category: 'launch',
    island: 'ISLAND_4_LAUNCH',
    status: 'PLANNED',
    dialogueSpecExists: true,
    gameplayInteractionExists: false,
    eventWiredToAudio: false,
    trigger: 'SYSTEMS_CHECKLIST_CLEAR',
    priority: 'HIGH',
    cooldownMs: 2000,
    hasSpeech: true,
    hasSfx: true,
    sfxName: 'sfx_ui_click',
    tone: 'اطمئنان تقني',
    textAr: 'كل أنظمة الملاحة ودعم الحياة خضراء وجاهزة للإطلاق!'
  },
  {
    id: 'launch_countdown',
    category: 'launch',
    island: 'ISLAND_4_LAUNCH',
    status: 'PLANNED',
    dialogueSpecExists: true,
    gameplayInteractionExists: false,
    eventWiredToAudio: false,
    trigger: 'FINAL_COUNTDOWN_START',
    priority: 'CRITICAL',
    cooldownMs: 0,
    hasSpeech: true,
    hasSfx: true,
    sfxName: 'sfx_rocket_launch',
    tone: 'إثارة العد التنازلي النهائي',
    textAr: 'عشرة، تسعة، تم إشعال المحركات الرئيسية.. ثلاثة، اثنان، واحد.. انطلاق!'
  },
  {
    id: 'launch_victory',
    category: 'launch',
    island: 'ISLAND_4_LAUNCH',
    status: 'PLANNED',
    dialogueSpecExists: true,
    gameplayInteractionExists: false,
    eventWiredToAudio: false,
    trigger: 'GRAND_LAUNCH_VICTORY',
    priority: 'CRITICAL',
    cooldownMs: 0,
    hasSpeech: true,
    hasSfx: true,
    sfxName: 'sfx_mission_fanfare',
    tone: 'تتويج أسطوري',
    textAr: 'ألف مبروك يا بطل! أتممت كل مهمات أكاديمية الفضاء بنجاح باهر!'
  }
];

// ---------------------------------------------------------------------------
// 2. CONSISTENT GEMINI TTS CONFIGURATION (PINNED MODEL)
// ---------------------------------------------------------------------------
export const PINNED_TTS_MODEL = 'gemini-3.8-flash-lite-tts';
export const PINNED_VOICE_NAME = 'Puck';

function createWavHeader(pcmLength, sampleRate = 24000, numChannels = 1, bitsPerSample = 16) {
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const buffer = Buffer.alloc(44);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + pcmLength, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(pcmLength, 40);

  return buffer;
}

export async function synthesizeText(text, maxRetries = 3) {
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured.');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${PINNED_TTS_MODEL}:generateContent?key=${apiKey}`;
  const payload = {
    contents: [{ parts: [{ text }] }],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: PINNED_VOICE_NAME
          }
        }
      }
    }
  };

  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`${PINNED_TTS_MODEL} returned HTTP ${response.status}: ${errText}`);
      }

      const json = await response.json();
      const base64Data = json?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Data) {
        throw new Error(`${PINNED_TTS_MODEL} returned empty audio payload.`);
      }

      return Buffer.from(base64Data, 'base64');
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        console.warn(`      [Attempt ${attempt}/${maxRetries} failed: ${err.message}. Retrying in 1s...]`);
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }

  throw lastError;
}

// ---------------------------------------------------------------------------
// 3. ENHANCED SILENCE REMOVAL & EBU R128 LOUDNORM (VOICE_IDENTITY_SPEC.md)
// ---------------------------------------------------------------------------
export function convertWavToMp3WithSilenceTrim(wavPath, mp3Path, thresholdDb = -48, targetLufs = -16, targetTp = -1.5, targetLra = 7) {
  execFileSync('ffmpeg', [
    '-y',
    '-i',
    wavPath,
    '-af',
    `silenceremove=start_periods=1:start_duration=0.01:start_threshold=${thresholdDb}dB:stop_periods=1:stop_duration=0.45:stop_threshold=${thresholdDb}dB,loudnorm=I=${targetLufs}:TP=${targetTp}:LRA=${targetLra}`,
    '-codec:a',
    'libmp3lame',
    '-b:a',
    '64k',
    '-ar',
    '24000',
    '-ac',
    '1',
    mp3Path
  ]);
}

export function getAudioDuration(filePath) {
  const stdout = execFileSync('ffprobe', [
    '-i',
    filePath,
    '-show_entries',
    'format=duration',
    '-v',
    'quiet',
    '-of',
    'csv=p=0'
  ]);
  return Math.round(parseFloat(stdout.toString().trim()) * 100) / 100;
}

// ---------------------------------------------------------------------------
// 4. MAIN RUNNER (SAMPLE OR FULL)
// ---------------------------------------------------------------------------
export async function main() {
  const isSampleMode = process.argv.includes('--sample') || !process.argv.includes('--all');

  const targetDir = isSampleMode
    ? path.join(rootDir, 'public', 'audio', 'robo', 'sample')
    : path.join(rootDir, 'public', 'audio', 'robo');

  fs.mkdirSync(targetDir, { recursive: true });

  const itemsToGenerate = isSampleMode
    ? [
        {
          id: 'sample_greeting',
          category: 'sample',
          island: 'GLOBAL',
          status: 'SAMPLE',
          trigger: 'SAMPLE_GREETING',
          priority: 'HIGH',
          cooldownMs: 0,
          tone: 'مبهج ومتحمس',
          textAr: 'يا مرحب يا بطل! أنا روبو.. جاهز للمغامرة في الفضاء؟ يلا بينا!'
        },
        {
          id: 'sample_success',
          category: 'sample',
          island: 'ISLAND_1_NUTRITION',
          status: 'SAMPLE',
          trigger: 'SAMPLE_SUCCESS',
          priority: 'CRITICAL',
          cooldownMs: 0,
          tone: 'احتفال وانتصار',
          textAr: 'الله عليك يا كابتن! اختياراتك مناسبة وجاهزة للرحلة.. عاش يا بطل!'
        },
        {
          id: 'sample_warning',
          category: 'sample',
          island: 'ISLAND_1_NUTRITION',
          status: 'SAMPLE',
          trigger: 'SAMPLE_WARNING',
          priority: 'HIGH',
          cooldownMs: 0,
          tone: 'تحذير كرتوني لطيف',
          textAr: 'احترس! خبز البرجر بيتفتت، والفتات بيطير في الكابينة ويسد فلاتر الهواء!'
        }
      ]
    : DIALOGUE_INVENTORY;

  console.log(`================================================================`);
  console.log(`ASTRONUTRI ROBO VOICE PRODUCTION GENERATOR`);
  console.log(`Mode: ${isSampleMode ? 'SAMPLE (3 Files)' : `FULL INVENTORY (${DIALOGUE_INVENTORY.length} Files)`}`);
  console.log(`Model: ${PINNED_TTS_MODEL} (Voice: ${PINNED_VOICE_NAME})`);
  console.log(`Silence Trim Threshold: -48dB (preserves phoneme onsets & releases)`);
  console.log(`Target: ${targetDir}`);
  console.log(`================================================================\n`);

  const manifestEntries = {};

  for (let i = 0; i < itemsToGenerate.length; i++) {
    const item = itemsToGenerate[i];
    const wavPath = path.join(targetDir, `${item.id}.wav`);
    const mp3Path = path.join(targetDir, `${item.id}.mp3`);

    console.log(`[${i + 1}/${itemsToGenerate.length}] Generating "${item.id}"...`);
    console.log(`   Text: "${item.textAr}"`);

    try {
      const pcmBytes = await synthesizeText(item.textAr);
      const rawDurationSec = Math.round((pcmBytes.length / (24000 * 2)) * 100) / 100;
      const wavHeader = createWavHeader(pcmBytes.length, 24000, 1, 16);
      const wavBuffer = Buffer.concat([wavHeader, pcmBytes]);

      fs.writeFileSync(wavPath, wavBuffer);

      // Convert WAV to trimmed 64k MP3 with -48dB threshold
      convertWavToMp3WithSilenceTrim(wavPath, mp3Path, -48);

      // Inspect actual trimmed file size and duration using ffprobe
      const mp3Stat = fs.statSync(mp3Path);
      const actualDurationSec = getAudioDuration(mp3Path);

      fs.unlinkSync(wavPath); // Clean up intermediate uncompressed WAV

      manifestEntries[item.id] = {
        path: `/audio/robo/${isSampleMode ? 'sample/' : ''}${item.id}.mp3`,
        text: item.textAr,
        rawDuration: rawDurationSec,
        duration: actualDurationSec,
        fileSizeBytes: mp3Stat.size,
        category: item.category,
        island: item.island,
        status: item.status,
        trigger: item.trigger,
        priority: item.priority,
        model: PINNED_TTS_MODEL,
        voice: PINNED_VOICE_NAME,
        trimThresholdDb: -48
      };

      console.log(`   ✓ Saved: ${item.id}.mp3`);
      console.log(`     Raw: ${rawDurationSec}s -> Trimmed (-48dB): ${actualDurationSec}s (${mp3Stat.size} bytes)\n`);

      // Polite delay between API calls
      await new Promise((r) => setTimeout(r, 600));
    } catch (err) {
      console.error(`   ✗ Error generating "${item.id}":`, err.message);
      process.exit(1);
    }
  }

  const manifestPath = path.join(targetDir, isSampleMode ? 'sample_manifest.json' : 'audio_manifest.json');
  fs.writeFileSync(
    manifestPath,
    JSON.stringify(
      {
        version: 3,
        generatedAt: new Date().toISOString(),
        mode: isSampleMode ? 'sample' : 'production',
        model: PINNED_TTS_MODEL,
        voice: PINNED_VOICE_NAME,
        totalFiles: Object.keys(manifestEntries).length,
        items: manifestEntries
      },
      null,
      2
    )
  );

  console.log(`================================================================`);
  console.log(`GENERATION COMPLETE! Manifest saved to: ${manifestPath}`);
  console.log(`================================================================`);
}

// Ensure main() only executes when invoked directly, NOT when imported as a module
const isDirectExecution =
  process.argv[1] &&
  path.resolve(process.argv[1]).toLowerCase() === path.resolve(import.meta.filename || '').toLowerCase();

if (isDirectExecution) {
  main().catch((err) => {
    console.error('Fatal error in audio generator:', err);
    process.exit(1);
  });
}
