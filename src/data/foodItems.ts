import { FoodItem } from '../types/game';

export interface NasaScientificReference {
  id: string;
  title: string;
  titleAr: string;
  url: string;
  verifiedFactAr: string;
  gameplayMechanicAr: string;
}

export const NASA_OFFICIAL_REFERENCES: readonly NasaScientificReference[] = [
  {
    id: 'space-food-systems',
    title: 'NASA Space Food Systems Laboratory',
    titleAr: 'مختبر أنظمة غذاء الفضاء التابع لناسا',
    url: 'https://www.nasa.gov/directorates/esdmd/hhp/space-food-systems/',
    verifiedFactAr:
      'في الجاذبية الصغرى (Zero-G)، يتطاير الفتات والسوائل الحرة في الكابينة، لذلك تُستخدم العبوات المحكمة بالصمامات وأكياس العسل والمعاجين المتماسكة.',
    gameplayMechanicAr:
      'تبسيط اللعبة: سحب الأطعمة الآمنة داخل صندوق الشحن الفضائي واستبعاد الأطعمة المتفتتة أو الفوارة.'
  },
  {
    id: 'jsc-food-nutrition',
    title: 'NASA JSC Food & Nutrition',
    titleAr: 'قسم التغذية والصحة بمركز جونسون للفضاء (NASA JSC)',
    url: 'https://www.nasa.gov/reference/jsc-food-nutrition/',
    verifiedFactAr:
      'يفقد رواد الفضاء كثافة العظام في انعدام الجاذبية، لذا يحتاجون إلى الكالسيوم وفيتامين (د) مع تقليل الصوديوم وممارسة الرياضة المقاومة يومياً.',
    gameplayMechanicAr:
      'تبسيط اللعبة: موازنة مؤشرات الفيتامينات، البروتين، الطاقة، والترطيب للوصول إلى 3 نجوم.'
  },
  {
    id: 'menu-for-mars',
    title: 'The Menu for Mars — Deep Space Food System',
    titleAr: 'قائمة طعام المريخ والفضاء العميق (NASA)',
    url: 'https://www.nasa.gov/humans-in-space/the-menu-for-mars-designing-a-deep-space-food-system/',
    verifiedFactAr:
      'تمد الفواكه والخضروات الطازجة الرواد بالفيتامينات والألياف والدعم النفسي، بينما تتطلب الحماية من الإشعاع الفضائي دروعاً مادية للمركبة وملاجئ عواصف (وليس مجرد تناول مضادات الأكسدة).',
    gameplayMechanicAr:
      'تبسيط اللعبة: منح نقاط الصحة والفيتامينات عند اختيار التفاح والبروكلي والجرجير ضمن الوجبة المتوازنة.'
  },
  {
    id: 'artemis-ii-menu',
    title: 'Artemis II — What’s on the Menu',
    titleAr: 'قائمة طعام مهمة أرتميس 2 القمرية (NASA)',
    url: 'https://www.nasa.gov/missions/artemis/artemis-2/artemis-ii-whats-on-the-menu/',
    verifiedFactAr:
      'تعتمد بعثات أرتميس على أطعمة مجففة بالتجميد (Rehydratable) وأطعمة معالجة حرارياً طويلة الصلاحية مثل أكياس العسل الجبلي والعبوات المغلقة بالصمامات.',
    gameplayMechanicAr:
      'تبسيط اللعبة: تجهيز صندوق إمدادات المهمة بـ 4 وجبات فضائية معتمدة للإقلاع.'
  }
];

export const FOOD_DATABASE: FoodItem[] = [
  // 1. Sinai Mountain Honey Squeeze Pouch — APPROVED [✓] (Egyptian/Sinai Zero-Crumb Space Energy)
  {
    id: 'sinai_honey',
    name: 'Sinai Mountain Honey Pouch',
    nameAr: 'عسل النحل الجبلي السيناوي — عبوة ضغط محكمة',
    svgAsset: '/assets/food/sinai_honey.svg',
    category: 'carbs',
    weightPercentage: 25,
    proteinGrams: 1,
    carbsGrams: 52,
    kcal: 195,
    fatsGrams: 0,
    fiberGrams: 0.5,
    massGrams: 65,
    shelfLifeMonths: 48,
    originTag: 'egypt_sinai',
    badgeType: 'ISS_PROVEN',
    micronutrientsAr: ['مضادات الأكسدة الطبيعية', 'كربوهيدرات سريعة', 'خصائص طبيعية مضادة للميكروبات'],
    crumbRating: 'zero_crumbs',
    isBanned: false,
    funFact: 'Pure Sinai Mountain honey sealed in a zero-crumb squeeze pouch provides natural antioxidants, antimicrobial stability (48+ months), and fast energy in 0G!',
    funFactAr: 'عسل النحل الجبلي السيناوي في عبوة ضغط محكمة خالٍ تماماً من الفتات، غني بمضادات الأكسدة والطاقة السريعة، ويدوم طويلاً بخصائصه الطبيعية المضادة للميكروبات!',
    nasaVerifiedFactAr: '✅ مثبتة على ISS: العبوات اللينة المحكمة بصمام ضغط تمنع تطاير السوائل والفتات في 0G وتحفظ العسل مستقراً آمناً لسنوات دون تبريد.',
    gameplaySimplificationAr: '🎮 قاعدة لعبة مبسطة: يمنح طاقة كربوهيدرات سريعة وآمنة 100% بنسبة 25% من سعة الصندوق.',
    nasaSourceTitle: 'NASA Space Food Systems',
    nasaSourceUrl: 'https://www.nasa.gov/directorates/esdmd/hhp/space-food-systems/',
    icon: '🍯',
    color: 'from-amber-400 to-yellow-600'
  },

  // 2. Rehydratable Space Pouch — APPROVED [✓] (Zero-G Packaging Prop)
  {
    id: 'space_pouch',
    name: 'Rehydratable Space Meal Pouch',
    nameAr: 'عبوة طعام الفضاء المجفف',
    svgAsset: '/assets/sprites/food/food-space-pouch.png',
    category: 'protein',
    weightPercentage: 25,
    proteinGrams: 26,
    carbsGrams: 18,
    isBanned: false,
    funFact: 'Freeze-dried space pouches remove water to save launch weight; astronauts inject warm water through the top valve before eating!',
    funFactAr: 'وجبة مجففة بالتجميد لتقليل وزن الإطلاق؛ يضخ الرائد الماء الدافئ عبر الصمام العلوي قبل الأكل!',
    nasaVerifiedFactAr: 'حقيقة علمية (ناسا): التجفيف بالتجميد يحفظ القيمة الغذائية ويقلل الكتلة والميكروبات في مهام أرتميس ومحطة الفضاء.',
    gameplaySimplificationAr: 'تبسيط اللعبة: مصدر رئيسي للبروتين لحماية عضلات رائد الفضاء.',
    nasaSourceTitle: 'Artemis II Menu — NASA',
    nasaSourceUrl: 'https://www.nasa.gov/missions/artemis/artemis-2/artemis-ii-whats-on-the-menu/',
    icon: '🥘',
    color: 'from-sky-400 to-blue-600'
  },

  // 3. Zero-G Drink Tube / Bag — APPROVED [✓] (Zero-G Packaging Prop)
  {
    id: 'drink_tube',
    name: 'Zero-G Sealed Drink Bag',
    nameAr: 'كيس عصير الفضاء بصمام',
    svgAsset: '/assets/sprites/food/food-drink-tube.png',
    category: 'special',
    weightPercentage: 25,
    proteinGrams: 6,
    carbsGrams: 22,
    isBanned: false,
    funFact: 'Sealed drink bags have a one-way valve and locking straw clamp so liquid droplets never float into spacecraft electronics!',
    funFactAr: 'كيس شرب محكم الغلق مزود بمشبك أمان على الماصة لمنع هروب قطرات العصير في انعدام الجاذبية!',
    nasaVerifiedFactAr: 'حقيقة علمية (ناسا): السوائل الحرة تتكور وتطفو في الجاذبية الصغرى، لذا تُشرب السوائل عبر أكياس مغلقة وماصة بمشبك إغلاق.',
    gameplaySimplificationAr: 'تبسيط اللعبة: يرفع مستوى الترطيب والفيتامينات في الصندوق الفضائي.',
    nasaSourceTitle: 'NASA JSC Food & Nutrition',
    nasaSourceUrl: 'https://www.nasa.gov/reference/jsc-food-nutrition/',
    icon: '🧃',
    color: 'from-cyan-400 to-sky-600'
  },

  // 4. Fresh Space Apple — APPROVED [✓]
  {
    id: 'rehydratable_fruits',
    name: 'Fresh Space Apple',
    nameAr: 'تفاح طازج للرواد',
    svgAsset: '/assets/sprites/food/food-apple.png',
    category: 'carbs',
    weightPercentage: 25,
    proteinGrams: 14,
    carbsGrams: 24,
    isBanned: false,
    funFact: 'Fresh apples provide natural vitamins, fiber, and psychological morale on space missions (though dietary antioxidants never replace physical spacecraft radiation shielding!).',
    funFactAr: 'يمد الرواد بالفيتامينات والألياف ويرفع الروح المعنوية! (ملاحظة علمية: الفيتامينات تدعم صحة الخلايا لكنها لا تغني عن دروع الحماية من الإشعاع).',
    nasaVerifiedFactAr: 'حقيقة علمية (ناسا): الفواكه الطازجة تدعم التغذية والروح المعنوية، بينما الحماية من الإشعاع الفضائي تتطلب دروعاً مادية للمركبة.',
    gameplaySimplificationAr: 'تبسيط اللعبة: يضيف فيتامينات وطاقة طبيعية متوازنة للشحنة.',
    nasaSourceTitle: 'The Menu for Mars — NASA',
    nasaSourceUrl: 'https://www.nasa.gov/humans-in-space/the-menu-for-mars-designing-a-deep-space-food-system/',
    icon: '🍎',
    color: 'from-emerald-400 to-green-600'
  },

  // 5. Space Broccoli — APPROVED [✓]
  {
    id: 'space_broccoli',
    name: 'Space Broccoli',
    nameAr: 'بروكلي غني بالمعادن',
    svgAsset: '/assets/sprites/food/food-broccoli.png',
    category: 'protein',
    weightPercentage: 25,
    proteinGrams: 20,
    carbsGrams: 16,
    isBanned: false,
    funFact: 'Broccoli supplies Vitamin K, Vitamin C, iron, and dietary fiber to support astronaut nutrition alongside daily exercise!',
    funFactAr: 'غني بفيتامين K وفيتامين C والحديد والألياف لدعم صحة الجسم والمناعة في الفضاء!',
    nasaVerifiedFactAr: 'حقيقة علمية (ناسا): الخضروات المجففة أو المزروعة في الفضاء تعوض نقص الفيتامينات والألياف في المهام الطويلة.',
    gameplaySimplificationAr: 'تبسيط اللعبة: يعزز نقاط البروتين النباتي والفيتامينات.',
    nasaSourceTitle: 'NASA JSC Food & Nutrition',
    nasaSourceUrl: 'https://www.nasa.gov/reference/jsc-food-nutrition/',
    icon: '🥦',
    color: 'from-emerald-400 to-teal-600'
  },

  // 6. Fortified Space Milk — APPROVED [✓]
  {
    id: 'space_milk',
    name: 'Calcium & Vitamin D Milk',
    nameAr: 'حليب بالكالسيوم وفيتامين د',
    svgAsset: '/assets/sprites/food/food-milk-carton.png',
    category: 'protein',
    weightPercentage: 25,
    proteinGrams: 22,
    carbsGrams: 14,
    isBanned: false,
    funFact: 'Shelf-stable dairy provides calcium and Vitamin D to help counter bone density loss in microgravity alongside resistive exercise!',
    funFactAr: 'يمد جسم رائد الفضاء بالكالسيوم وفيتامين (د) للمساعدة في حماية العظام مع التمارين الرياضية اليومية!',
    nasaVerifiedFactAr: 'حقيقة علمية (ناسا): يفقد الرواد جزءاً من كثافة العظام في الجاذبية الصغرى، لذا يُدعم غذائهم بالكالسيوم وفيتامين (د).',
    gameplaySimplificationAr: 'تبسيط اللعبة: يمنح دفعة قوية لمؤشر البروتين وصحة العظام.',
    nasaSourceTitle: 'NASA JSC Food & Nutrition',
    nasaSourceUrl: 'https://www.nasa.gov/reference/jsc-food-nutrition/',
    icon: '🥛',
    color: 'from-blue-400 to-indigo-600'
  },

  // 7. Crumbly Fast-Food Burger — BANNED [X]
  {
    id: 'banned_burger',
    name: 'Crumbly Sesame Burger',
    nameAr: 'برجر بخبز متفتت',
    svgAsset: '/assets/sprites/food/food-burger.png',
    category: 'banned',
    weightPercentage: 15,
    proteinGrams: 8,
    carbsGrams: 25,
    isBanned: true,
    hasCrumbs: true,
    isForbidden: true,
    crumbRating: 'high_crumbs',
    bannedReason: 'The No-Crumbs Rule! Crumbly burger buns and loose sesame seeds float in Zero-G into astronaut eyes and air filters!',
    bannedReasonAr: 'ممنوع في الجاذبية الصغرى! خبز البرجر وحبوب السمسم تتفتت وتطفو في الهواء فتدخل في أعين الرواد وفلاتر التهوية!',
    funFact: 'Open sliced bread and sesame buns shed crumbs in 0G, so astronauts use sealed squeeze pouches and cohesive bars instead!',
    funFactAr: 'الخبز المنفوش وحبوب السمسم السائبة تتفتت وتطفو في 0G، لذلك يعتمد الرواد على العبوات المحكمة والعصارات المتماسكة كبديل آمن!',
    nasaVerifiedFactAr: 'حقيقة علمية (ناسا): الفتات الحر لا يسقط على الأرض في انعدام الجاذبية بل يطفو في الكابينة ويشكل خطراً على التنفس والأجهزة.',
    gameplaySimplificationAr: 'تبسيط اللعبة: يرفض الصندوق هذا العنصر وينبهك روبو فوراً.',
    nasaSourceTitle: 'NASA Space Food Systems',
    nasaSourceUrl: 'https://www.nasa.gov/directorates/esdmd/hhp/space-food-systems/',
    icon: '🍔',
    color: 'from-rose-600 to-red-800'
  },

  // 8. Fizzy Carbonated Soda — BANNED [X]
  {
    id: 'banned_soda',
    name: 'Carbonated Fizzy Soda',
    nameAr: 'مشروب غازي فوّار',
    svgAsset: '/assets/sprites/food/food-soda-can.png',
    category: 'banned',
    weightPercentage: 15,
    proteinGrams: 0,
    carbsGrams: 28,
    isBanned: true,
    hasCrumbs: false,
    isForbidden: true,
    bannedReason: 'Without gravity buoyancy, CO2 gas bubbles stay mixed with stomach liquid in Zero-G, causing uncomfortable wet burps!',
    bannedReasonAr: 'لا يصلح للجاذبية الصغرى! فقاعات الغاز لا تنفصل عن السائل داخل المعدة في انعدام الجاذبية مما يسبب ارتجاعاً مزعجاً!',
    funFact: 'Carbonated drinks foam excessively and cause "wet burps" in microgravity because gas does not rise above liquid!',
    funFactAr: 'في انعدام الجاذبية لا يرتفع الغاز فوق السائل داخل المعدة فيسبب ما يسميه العلماء التجشؤ الرطب!',
    nasaVerifiedFactAr: 'حقيقة علمية (ناسا): غياب الطفو في الجاذبية الصغرى يمنع انفصال غاز ثاني أكسيد الكربون عن السوائل في الجهاز الهضمي.',
    gameplaySimplificationAr: 'تبسيط اللعبة: عنصر محظور في رحلات الجاذبية الصغرى.',
    nasaSourceTitle: 'NASA JSC Food & Nutrition',
    nasaSourceUrl: 'https://www.nasa.gov/reference/jsc-food-nutrition/',
    icon: '🥤',
    color: 'from-rose-600 to-red-800'
  },

  // 9. Open Greasy Pizza Slice — BANNED [X]
  {
    id: 'banned_pizza',
    name: 'Unsealed Crumbly Pizza',
    nameAr: 'بيتزا مفتوحة عالية الملح',
    svgAsset: '/assets/sprites/food/food-pizza.png',
    category: 'banned',
    weightPercentage: 15,
    proteinGrams: 6,
    carbsGrams: 26,
    isBanned: true,
    hasCrumbs: true,
    isForbidden: true,
    crumbRating: 'high_crumbs',
    bannedReason: 'Unsealed crust crumbs float in Zero-G, and excessive sodium accelerates urinary calcium loss from astronaut bones!',
    bannedReasonAr: 'حاسب يا بطل! القشرة المتفتتة تطفو في انعدام الجاذبية، والملح الزائد (الصوديوم) يسرّع فقدان الكالسيوم من عظام الرواد!',
    funFact: 'High dietary sodium increases calcium excretion in urine, increasing bone loss and kidney stone risk in space!',
    funFactAr: 'الصوديوم العالي يزيد من فقدان الكالسيوم ويزيد خطر حصوات الكلى في الفضاء!',
    nasaVerifiedFactAr: 'حقيقة علمية (ناسا): خفضت ناسا نسبة الصوديوم في وجبات الفضاء لأن الملح الزائد يسرع تآكل العظام في الجاذبية الصغرى.',
    gameplaySimplificationAr: 'تبسيط اللعبة: عنصر مرفوض بسبب الفتات وارتفاع الصوديوم.',
    nasaSourceTitle: 'NASA JSC Food & Nutrition',
    nasaSourceUrl: 'https://www.nasa.gov/reference/jsc-food-nutrition/',
    icon: '🍕',
    color: 'from-rose-600 to-red-800'
  },

  // 10. Freeze-Dried Strawberries — APPROVED [✓]
  {
    id: 'freeze_dried_strawberries',
    name: 'Freeze-Dried Space Strawberries',
    nameAr: 'فراولة مجففة بالتجميد',
    svgAsset: '/assets/food/fruits.svg',
    category: 'carbs',
    weightPercentage: 25,
    proteinGrams: 4,
    carbsGrams: 28,
    isBanned: false,
    funFact: 'Freeze-dried fruit locks in sweet flavors and vitamins with zero liquids to spill!',
    funFactAr: 'من أشهى فواكه رواد الفضاء! تُجفف في غرف تبريد عملاقة لتحتفظ بطعمها الرائع بدون أي سوائل حرة!',
    nasaVerifiedFactAr: 'حقيقة علمية (ناسا): التجفيف بالتجميد يحفظ أكثر من 97% من العناصر الغذائية والفيتامينات مع تقليل وزن الشحن.',
    gameplaySimplificationAr: 'تبسيط اللعبة: تمنح شحنة سريعة من الفيتامينات الطبيعية.',
    nasaSourceTitle: 'NASA Space Food Systems',
    nasaSourceUrl: 'https://www.nasa.gov/directorates/esdmd/hhp/space-food-systems/',
    icon: '🍓',
    color: 'from-pink-500 to-rose-600'
  },

  // 11. Mac & Cheese Space Pouch — APPROVED [✓]
  {
    id: 'mac_and_cheese_pouch',
    name: 'NASA Mac & Cheese Pouch',
    nameAr: 'مكرونة بالجبنة الفضائية',
    svgAsset: '/assets/food/cheese.svg',
    category: 'carbs',
    weightPercentage: 25,
    proteinGrams: 16,
    carbsGrams: 35,
    isBanned: false,
    funFact: 'Warm and comforting in zero-g! Astronauts inject hot water into the pouch and knead it before eating with a long spoon.',
    funFactAr: 'وجبة دافئة شهيرة لرواد الفضاء! يُحقن فيها الماء الساخن وتُخلط جيداً داخل الكيس المغلق.',
    nasaVerifiedFactAr: 'حقيقة علمية (ناسا): توفر الكربوهيدرات المعقدة دفعة طاقة متواصلة لرواد الفضاء أثناء مهام الصيانة الطويلة.',
    gameplaySimplificationAr: 'تبسيط اللعبة: توفر طاقة كربوهيدرات عالية ومستمرة.',
    nasaSourceTitle: 'NASA Space Food Systems',
    nasaSourceUrl: 'https://www.nasa.gov/directorates/esdmd/hhp/space-food-systems/',
    icon: '🧀',
    color: 'from-yellow-400 to-amber-600'
  },

  // 12. Chicken Teriyaki Space Pouch — APPROVED [✓]
  {
    id: 'chicken_teriyaki_pouch',
    name: 'Chicken Teriyaki & Veggies Pouch',
    nameAr: 'دجاج ترياكي بالخضار',
    svgAsset: '/assets/food/meat.svg',
    category: 'protein',
    weightPercentage: 25,
    proteinGrams: 28,
    carbsGrams: 14,
    isBanned: false,
    funFact: 'High in lean protein to help astronauts maintain muscle mass while living in microgravity.',
    funFactAr: 'قطع دجاج متبلة غنية بالبروتين لدعم بناء العضلات ومنع ضمورها في الجاذبية الصغرى!',
    nasaVerifiedFactAr: 'حقيقة علمية (ناسا): يحتاج الرواد لجرعات بروتين يومية مع تمارين المقاومة لحماية الكتلة العضلية.',
    gameplaySimplificationAr: 'تبسيط اللعبة: يعزز مؤشر البروتين العضلي بقوة.',
    nasaSourceTitle: 'NASA JSC Food & Nutrition',
    nasaSourceUrl: 'https://www.nasa.gov/reference/jsc-food-nutrition/',
    icon: '🍗',
    color: 'from-orange-500 to-red-600'
  },

  // 13. Hot Sauce Squeeze Tube — APPROVED [✓]
  {
    id: 'spicy_sauce_tube',
    name: 'NASA Spicy Hot Sauce Tube',
    nameAr: 'أنبوب الصلصة الحارة',
    svgAsset: '/assets/food/sauce.svg',
    category: 'special',
    weightPercentage: 15,
    proteinGrams: 2,
    carbsGrams: 8,
    isBanned: false,
    funFact: 'Fluid shifts cause astronauts to lose taste acuity; hot sauce is their number one favorite condiment to revive flavors!',
    funFactAr: 'في انعدام الجاذبية، ترتفع سوائل الجسم نحو الرأس فيضعف التذوق! الصلصة الحارة هي المفضل لديهم لإعادة النكهة القوية!',
    nasaVerifiedFactAr: 'حقيقة علمية (ناسا): ظاهرة "تغير حاسة التذوق" تجعل الصلصات الحارة من أكثر العناصر طلباً بين طاقم محطة الفضاء.',
    gameplaySimplificationAr: 'تبسيط اللعبة: عنصر معنوي مميز يرفع حيوية الطاقم.',
    nasaSourceTitle: 'NASA Space Food Systems',
    nasaSourceUrl: 'https://www.nasa.gov/directorates/esdmd/hhp/space-food-systems/',
    icon: '🌶️',
    color: 'from-red-500 to-rose-700'
  },

  // 14. Crumbly Chocolate Cookies — BANNED [X]
  {
    id: 'banned_cookies',
    name: 'Crumbly Chocolate Cookies',
    nameAr: 'بسكويت شوكولاتة متفتت',
    svgAsset: '/assets/food/banned_cookie.svg',
    category: 'banned',
    weightPercentage: 15,
    proteinGrams: 3,
    carbsGrams: 32,
    isBanned: true,
    hasCrumbs: true,
    isForbidden: true,
    crumbRating: 'high_crumbs',
    bannedReason: 'The No-Crumbs Rule! Cookie crumbs break and float in microgravity, posing serious hazards to eyes and cabin air scrubbers!',
    bannedReasonAr: 'قاعدة حظر الفتات الصارمة! بسكويت الشوكولاتة يتفتت إلى آلاف الشظايا الصغيرة التي تطفو وتدخل في أعين الرواد وفلاتر الأكسجين!',
    funFact: 'Ordinary cookies are strictly prohibited; astronauts eat bite-sized gelatin-coated treats instead!',
    funFactAr: 'ممنوع في الفضاء! الفتات المتطاير لا يسقط بل يسبح في الهواء كالغبار!',
    nasaVerifiedFactAr: 'حقيقة علمية (ناسا): الفتات الجاف قد يسبب حرائق أو انسداداً في أنظمة تنقية الهواء.',
    gameplaySimplificationAr: 'تبسيط اللعبة: يرفض الصندوق البسكويت المتفتت لحماية المحطة.',
    nasaSourceTitle: 'NASA Space Food Systems',
    nasaSourceUrl: 'https://www.nasa.gov/directorates/esdmd/hhp/space-food-systems/',
    icon: '🍪',
    color: 'from-amber-800 to-yellow-900'
  },

  // 15. Crispy Potato Chips — BANNED [X]
  {
    id: 'banned_chips',
    name: 'Crispy Salty Chips',
    nameAr: 'رقائق شيبس متطايرة',
    svgAsset: '/assets/food/banned_chips.svg',
    category: 'banned',
    weightPercentage: 15,
    proteinGrams: 2,
    carbsGrams: 30,
    isBanned: true,
    hasCrumbs: true,
    isForbidden: true,
    crumbRating: 'high_crumbs',
    bannedReason: 'Chips shatter into sharp floating crumbs and contain heavy sodium that weakens astronaut bone density!',
    bannedReasonAr: 'ممنوع تماماً! الشيبس ينكسر لفتات حاد يطفو في الهواء، ونسبة الملح العالية تسرع تآكل عظام رواد الفضاء!',
    funFact: 'Sodium draws calcium out of bones, worsening space osteoporosis!',
    funFactAr: 'الملح الزائد يطرد الكالسيوم خارج العظام ويزيد من هشاشتها في انعدام الجاذبية!',
    nasaVerifiedFactAr: 'حقيقة علمية (ناسا): تمنع الأطعمة شديدة التفتت والملوحة لحماية العظام وأنظمة الملاحة.',
    gameplaySimplificationAr: 'تبسيط اللعبة: مرفوض لحماية العظام ومنع الفتات المتطاير.',
    nasaSourceTitle: 'NASA JSC Food & Nutrition',
    nasaSourceUrl: 'https://www.nasa.gov/reference/jsc-food-nutrition/',
    icon: '🥔',
    color: 'from-amber-700 to-orange-800'
  },

  // ==================== AUTHENTIC EGYPTIAN & SINAI SPACE FOODS ====================
  // 16. الكابوتشا الفضائية — Space Iceberg Lettuce (Hydroponic)
  {
    id: 'egy_space_cabbage_lettuce',
    name: 'Space Iceberg Lettuce (Hydroponic)',
    nameAr: 'الكابوتشا الفضائية (زراعة مائية)',
    svgAsset: '/assets/food/egy_cabbage_lettuce.svg',
    category: 'special',
    weightPercentage: 10,
    proteinGrams: 2,
    carbsGrams: 5,
    kcal: 28,
    fatsGrams: 0.3,
    fiberGrams: 3.2,
    massGrams: 150,
    shelfLifeMonths: 1,
    originTag: 'hydroponic',
    badgeType: 'ISS_PROVEN',
    micronutrientsAr: ['فيتامين K', 'فيتامين C', 'ألياف غذائية', 'ترطيب طازج'],
    crumbRating: 'zero_crumbs',
    isBanned: false,
    funFact: 'Hydroponically grown iceberg lettuce mirrors NASA Veggie crops, giving astronauts crisp vitamins, fiber, and a huge psychological boost!',
    funFactAr: 'تُنبت في كابينة الزراعة المائية بالمحطة لتمُد الرائد بفيتامينات وألياف طازجة ودعم نفسي، لكنها مكملة ولا تغني عن الطعام المخزّن!',
    nasaVerifiedFactAr: '✅ مثبتة على ISS: زُرع الخس بنجاح في نظام NASA Veggie، ويوفر فيتامينات وأليافاً وتنوعاً نفسياً (كمكمل وليس مصدراً أساسياً للسعرات).',
    gameplaySimplificationAr: '🎮 قاعدة لعبة مبسطة: تعزز الفيتامينات والألياف دون فتات.',
    nasaSourceTitle: 'NASA Growing Plants in Space',
    nasaSourceUrl: 'https://www.nasa.gov/exploration-research-and-technology/growing-plants-in-space/',
    icon: '🥬',
    color: 'from-lime-400 to-emerald-600'
  },

  // 17. الجرجير الفضائي — Space Arugula / Rocket (Hydroponic)
  {
    id: 'egy_space_arugula',
    name: 'Space Arugula / Rocket (Hydroponic)',
    nameAr: 'الجرجير الفضائي (زراعة مائية)',
    svgAsset: '/assets/food/egy_arugula.svg',
    category: 'special',
    weightPercentage: 10,
    proteinGrams: 3,
    carbsGrams: 4,
    kcal: 32,
    fatsGrams: 0.7,
    fiberGrams: 2.6,
    massGrams: 100,
    shelfLifeMonths: 1,
    originTag: 'hydroponic',
    badgeType: 'ISS_PROVEN',
    micronutrientsAr: ['فيتامين K', 'الكالسيوم', 'الحديد', 'مضادات أكسدة'],
    crumbRating: 'zero_crumbs',
    isBanned: false,
    funFact: 'Fast-growing Egyptian arugula thrives in hydroponic LED racks and delivers concentrated Vitamin K, Calcium, and Iron for bone health!',
    funFactAr: 'ينمو الجرجير المصري بسرعة في الزراعة المائية ويمنح الطاقم فيتامين K وكالسيوم وحديداً لحماية العظام!',
    nasaVerifiedFactAr: '✅ مثبتة على ISS: الخضروات الورقية المماثلة تُمد الطاقم بفيتامين K والكالسيوم والحديد لدعم العظام والمناعة.',
    gameplaySimplificationAr: '🎮 قاعدة لعبة مبسطة: محصول مائي سريع يرفع الفيتامينات والمعادن.',
    nasaSourceTitle: 'NASA Growing Plants in Space',
    nasaSourceUrl: 'https://www.nasa.gov/exploration-research-and-technology/growing-plants-in-space/',
    icon: '🌿',
    color: 'from-emerald-400 to-green-700'
  },

  // 18. اللفت الفضائي — Space Turnip & Greens (Hydroponic)
  {
    id: 'egy_space_turnip',
    name: 'Space Turnip & Greens (Hydroponic)',
    nameAr: 'اللفت الفضائي وأوراقه (زراعة مائية)',
    svgAsset: '/assets/food/egy_turnip.svg',
    category: 'carbs',
    weightPercentage: 15,
    proteinGrams: 3,
    carbsGrams: 12,
    kcal: 56,
    fatsGrams: 0.4,
    fiberGrams: 4.1,
    massGrams: 160,
    shelfLifeMonths: 2,
    originTag: 'hydroponic',
    badgeType: 'PLANNING_ASSUMPTION',
    micronutrientsAr: ['البوتاسيوم', 'فيتامين C', 'الكالسيوم', 'ألياف'],
    crumbRating: 'zero_crumbs',
    isBanned: false,
    funFact: 'Both the crisp purple-white root and mineral-rich greens grow in balanced NPK nutrient water with zero soil!',
    funFactAr: 'ينمو جذر اللفت وأوراقه الغنية بالمعادن في محلول المغذيات NPK دون تربة، ويُثري وجبات الطاقم بالألياف والبوتاسيوم!',
    nasaVerifiedFactAr: '📐 افتراض تخطيطي: دمج الجذور والأوراق المائية يعظّم الاستفادة من الكتلة الحيوية داخل المساحات المحدودة.',
    gameplaySimplificationAr: '🎮 قاعدة لعبة مبسطة: يضيف كربوهيدرات خفيفة ومعادن وأليافاً.',
    nasaSourceTitle: 'NASA Growing Plants in Space',
    nasaSourceUrl: 'https://www.nasa.gov/exploration-research-and-technology/growing-plants-in-space/',
    icon: '🟣',
    color: 'from-purple-400 to-emerald-600'
  },

  // 19. المش المصري بالملح الصخري — Aged Egyptian Mish Cheese Pouch with Rock Salt
  {
    id: 'egy_mish_pouch',
    name: 'Aged Egyptian Mish Cheese Pouch (Rock Salt)',
    nameAr: 'المش المصري بالملح الصخري (عبوة عصّارة)',
    svgAsset: '/assets/food/egy_mish_pouch.svg',
    category: 'protein',
    weightPercentage: 20,
    proteinGrams: 19,
    carbsGrams: 6,
    kcal: 245,
    fatsGrams: 15,
    fiberGrams: 0,
    massGrams: 95,
    shelfLifeMonths: 24,
    originTag: 'egypt_sinai',
    badgeType: 'PLANNING_ASSUMPTION',
    micronutrientsAr: ['الكالسيوم', 'البروتين', 'إلكترولايت الصوديوم المتوازن', 'نكهة قوية'],
    crumbRating: 'zero_crumbs',
    isBanned: false,
    funFact: 'Packaged in a zero-crumb squeeze pouch, savory Egyptian Mish with balanced rock salt helps counter microgravity taste dulling!',
    funFactAr: 'معبأ في أنبوب عصّار محكم بلا فتات! يمنح الرائد كالسيوم وبروتيناً ونكهة شرقية قوية تتغلب على ضعف التذوق في انعدام الجاذبية.',
    nasaVerifiedFactAr: '✅ مثبتة على ISS: الأطعمة الغنية بالنكهة داخل عبوات مغلقة تساعد على التغلب على تبلّد حاسة التذوق الناتج عن إزاحة السوائل (مع ضبط الصوديوم بدقة لحماية العظام).',
    gameplaySimplificationAr: '🎮 قاعدة لعبة مبسطة: بروتين وكالسيوم عالٍ في عبوة آمنة تماماً في 0G.',
    nasaSourceTitle: 'NASA Space Food Systems',
    nasaSourceUrl: 'https://www.nasa.gov/directorates/esdmd/hhp/space-food-systems/',
    icon: '🧀',
    color: 'from-amber-400 to-yellow-700'
  },

  // 20. العجوة السيناوية المضغوطة — Compressed Sinai Date Paste Bars
  {
    id: 'sinai_date_bars',
    name: 'Compressed Sinai Date Paste Bars',
    nameAr: 'مكعبات العجوة السيناوية المضغوطة',
    svgAsset: '/assets/food/sinai_dates.svg',
    category: 'carbs',
    weightPercentage: 20,
    proteinGrams: 4,
    carbsGrams: 54,
    kcal: 290,
    fatsGrams: 1.5,
    fiberGrams: 6.5,
    massGrams: 90,
    shelfLifeMonths: 36,
    originTag: 'egypt_sinai',
    badgeType: 'ISS_PROVEN',
    micronutrientsAr: ['البوتاسيوم', 'الحديد', 'المغنيسيوم', 'ألياف طبيعية'],
    crumbRating: 'zero_crumbs',
    isBanned: false,
    funFact: 'Compressed Sinai date squares are sticky and cohesive—zero floating crumbs—while packing dense natural energy, potassium, iron, and fiber!',
    funFactAr: 'مكعبات عجوة سيناء متماسكة بحجم اللقمة فلا تتفتت أبداً، وتعطي طاقة عالية وبوتاسيوم وحديداً وأليافاً لـ 36 شهراً!',
    nasaVerifiedFactAr: '✅ مثبتة على ISS: الأطعمة اللدنة/المضغوطة بحجم اللقمة تمنع تطاير الفتات وتحقق كثافة طاقة ومعادن ممتازة لمدة تخزين طويلة.',
    gameplaySimplificationAr: '🎮 قاعدة لعبة مبسطة: طاقة مركزة وألياف خالية من الفتات.',
    nasaSourceTitle: 'NASA Space Food Systems',
    nasaSourceUrl: 'https://www.nasa.gov/directorates/esdmd/hhp/space-food-systems/',
    icon: '🌴',
    color: 'from-amber-700 to-stone-900'
  },

  // 21. طحينة وبذور السمسم المحمصة — Roasted Sesame & Tahini Squeeze Pack
  {
    id: 'egy_tahini_pouch',
    name: 'Roasted Sesame & Tahini Squeeze Pack',
    nameAr: 'عبوة طحينة وبذور السمسم المحمصة',
    svgAsset: '/assets/food/egy_tahini.svg',
    category: 'protein',
    weightPercentage: 20,
    proteinGrams: 16,
    carbsGrams: 14,
    kcal: 360,
    fatsGrams: 27,
    fiberGrams: 5.0,
    massGrams: 75,
    shelfLifeMonths: 24,
    originTag: 'egypt_sinai',
    badgeType: 'PLANNING_ASSUMPTION',
    micronutrientsAr: ['الكالسيوم', 'الزنك', 'المغنيسيوم', 'دهون صحية'],
    crumbRating: 'zero_crumbs',
    isBanned: false,
    funFact: 'Creamy roasted sesame tahini delivers compact healthy fats, zinc, magnesium, and calcium inside a lightweight zero-crumb pouch!',
    funFactAr: 'طحينة السمسم السائلة المتماسكة غنية بالدهون الصحية والكالسيوم والزنك والمغنيسيوم في وزن خفيف دون فتات!',
    nasaVerifiedFactAr: '📐 افتراض تخطيطي: الدهون الصحية الكثيفة تدعم بلوغ هدف 113 جم دهون و3,000 سعرة يومياً بأقل كتلة صاروخية ممكنة.',
    gameplaySimplificationAr: '🎮 قاعدة لعبة مبسطة: تعزز الدهون الصحية والبروتين والمعادن.',
    nasaSourceTitle: 'Smith & Zwart, Physiology (2021)',
    nasaSourceUrl: 'https://doi.org/10.1152/physiol.00011.2021',
    icon: '🥣',
    color: 'from-yellow-400 to-amber-700'
  },

  // 22. زيت الزيتون السيناوي البكر — Sinai Extra-Virgin Olive Oil Drops
  {
    id: 'sinai_olive_oil_drops',
    name: 'Sinai Extra-Virgin Olive Oil Drops',
    nameAr: 'قطرات زيت الزيتون السيناوي البكر',
    svgAsset: '/assets/food/sinai_olive_oil.svg',
    category: 'special',
    weightPercentage: 10,
    proteinGrams: 0,
    carbsGrams: 0,
    kcal: 265,
    fatsGrams: 30,
    fiberGrams: 0,
    massGrams: 30,
    shelfLifeMonths: 24,
    originTag: 'egypt_sinai',
    badgeType: 'PLANNING_ASSUMPTION',
    micronutrientsAr: ['أحماض أوميغا الدهنية', 'فيتامين E', 'دهون صحية مركزة'],
    crumbRating: 'zero_crumbs',
    isBanned: false,
    funFact: 'A tiny 30 g dropper pouch of Sinai olive oil packs 265 kcal of pure healthy fats and Omega fatty acids toward the 113 g daily planning target!',
    funFactAr: 'قطّارة صغيرة (30 جم فقط!) من زيت زيتون سيناء تمنح 265 سعرة وأحماض أوميغا لدعم هدف الـ 113 جم دهون بأقل وزن ممكن!',
    nasaVerifiedFactAr: '📐 افتراض تخطيطي: الدهون المركزة توفر أعلى طاقة لكل جرام كتلة إطلاق لدعم هدف 3,000 سعرة / 113 جم دهون.',
    gameplaySimplificationAr: '🎮 قاعدة لعبة مبسطة: يملأ شريط الدهون الصحية والأوميغا بوزن ضئيل.',
    nasaSourceTitle: 'NASA Human Adaptation to Spaceflight',
    nasaSourceUrl: 'https://www.nasa.gov/wp-content/uploads/2024/08/human-adaptation-2021-final-b.pdf',
    icon: '🫒',
    color: 'from-lime-500 to-olive-700'
  },

  // 23. معجون الأعشاب والتوابل السيناوية — Sinai Herbal & Spice Seasoning Gel/Paste
  {
    id: 'sinai_herbal_paste',
    name: 'Sinai Herbal & Spice Seasoning Gel/Paste',
    nameAr: 'معجون الأعشاب والتوابل السيناوية',
    svgAsset: '/assets/food/sinai_herbs.svg',
    category: 'special',
    weightPercentage: 10,
    proteinGrams: 2,
    carbsGrams: 6,
    kcal: 42,
    fatsGrams: 1.2,
    fiberGrams: 1.5,
    massGrams: 40,
    shelfLifeMonths: 30,
    originTag: 'egypt_sinai',
    badgeType: 'ISS_PROVEN',
    micronutrientsAr: ['مضادات الأكسدة', 'نكهة بدون غبار طائر'],
    crumbRating: 'zero_crumbs',
    isBanned: false,
    funFact: 'Dry spice powder floats into astronauts’ noses in 0G, so dry Sinai herbs are suspended in liquid paste—just like NASA’s liquid salt & pepper!',
    funFactAr: 'مساحيق التوابل الجافة تطير في هواء 0G؛ لذلك حولنا أعشاب سيناء لمعجون متماسك يحيي النكهة دون غبار متطاير!',
    nasaVerifiedFactAr: '✅ مثبتة على ISS: على المحطة يُستخدم الملح والفلفل والتوابل في صورة سوائل/معاجين لأن البودرة الجافة تتطاير وتؤذي الأعين والأجهزة.',
    gameplaySimplificationAr: '🎮 قاعدة لعبة مبسطة: معزّز نكهة ذكي يمنع تطاير البودرة.',
    nasaSourceTitle: 'NASA Space Food Systems',
    nasaSourceUrl: 'https://www.nasa.gov/directorates/esdmd/hhp/space-food-systems/',
    icon: '🌿',
    color: 'from-emerald-500 to-teal-800'
  }
];

export const EGYPTIAN_SINAI_SPACE_FOODS = FOOD_DATABASE.filter(
  (item) => item.originTag === 'egypt_sinai' || item.originTag === 'hydroponic'
);

export const TARGET_NUTRITION_REQUIREMENTS = {
  minCargoWeight: 50,
  maxCargoWeight: 100,
  optimalRatioMin: 0.2,
  optimalRatioMax: 0.85,
  requiredSpecialItem: 'sinai_honey',
  idealProteinRatioMin: 0.2,
  idealProteinRatioMax: 0.85,
  requiresSpecialItem: 'sinai_honey'
};
