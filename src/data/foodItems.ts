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
      'في الجاذبية الصغرى (Zero-G)، يتطاير الفتات والسوائل الحرة في الكابينة، لذلك يُستخدم خبز التورتيلا والعبوات المغلقة بالصمامات.',
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
      'تبسيط اللعبة: منح نقاط الصحة والفيتامينات عند اختيار التفاح والبروكلي ضمن الوجبة المتوازنة.'
  },
  {
    id: 'artemis-ii-menu',
    title: 'Artemis II — What’s on the Menu',
    titleAr: 'قائمة طعام مهمة أرتميس 2 القمرية (NASA)',
    url: 'https://www.nasa.gov/missions/artemis/artemis-2/artemis-ii-whats-on-the-menu/',
    verifiedFactAr:
      'تعتمد بعثات أرتميس على أطعمة مجففة بالتجميد (Rehydratable) وأطعمة معالجة حرارياً طويلة الصلاحية مع خبز التورتيلا وأكياس الشرب المغلقة.',
    gameplayMechanicAr:
      'تبسيط اللعبة: تجهيز صندوق إمدادات المهمة بـ 4 وجبات فضائية معتمدة للإقلاع.'
  }
];

export const FOOD_DATABASE: FoodItem[] = [
  // 1. Space Tortilla Wrap — APPROVED [✓] (Zero-G Packaging Prop)
  {
    id: 'space_tortilla',
    name: 'Space Tortilla Wrap',
    nameAr: 'خبز التورتيلا الفضائي',
    svgAsset: '/assets/sprites/food/food-tortilla.png',
    category: 'carbs',
    weightPercentage: 25,
    proteinGrams: 12,
    carbsGrams: 28,
    isBanned: false,
    funFact: 'NASA astronauts prefer specially formulated tortillas over ordinary sliced bread because tortillas drastically reduce floating crumbs in microgravity!',
    funFactAr: 'يفضل رواد ناسا خبز التورتيلا المخصص للفضاء بدلاً من الخبز العادي لأنه يقلل الفتات المتطاير بشكل كبير جداً في الجاذبية الصغرى!',
    nasaVerifiedFactAr: 'حقيقة علمية (ناسا): منذ عام 1985 يعتمد الرواد على التورتيلا لتقليل تطاير الفتات مقارنة بالخبز العادي وحماية أعين الطاقم وفلاتر الهواء.',
    gameplaySimplificationAr: 'تبسيط اللعبة: يمنح طاقة كربوهيدرات آمنة بنسبة 25% من سعة الصندوق.',
    nasaSourceTitle: 'NASA Space Food Systems',
    nasaSourceUrl: 'https://www.nasa.gov/directorates/esdmd/hhp/space-food-systems/',
    icon: '🌯',
    color: 'from-amber-400 to-orange-600'
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
    bannedReason: 'The No-Crumbs Rule! Crumbly burger buns and loose sesame seeds float in Zero-G into astronaut eyes and air filters!',
    bannedReasonAr: 'ممنوع في الجاذبية الصغرى! خبز البرجر وحبوب السمسم تتفتت وتطفو في الهواء فتدخل في أعين الرواد وفلاتر التهوية!',
    funFact: 'Astronauts wrap burger patties or meats inside tortillas instead of crumbly buns to minimize crumbs!',
    funFactAr: 'يستخدم الرواد خبز التورتيلا بدلاً من خبز البرجر لأنه يقلل الفتات المتطاير بشكل كبير جداً!',
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
  }
];

export const TARGET_NUTRITION_REQUIREMENTS = {
  minCargoWeight: 50,
  maxCargoWeight: 100,
  optimalRatioMin: 0.2,
  optimalRatioMax: 0.85,
  requiredSpecialItem: 'space_tortilla',
  idealProteinRatioMin: 0.2,
  idealProteinRatioMax: 0.85,
  requiresSpecialItem: 'space_tortilla'
};
