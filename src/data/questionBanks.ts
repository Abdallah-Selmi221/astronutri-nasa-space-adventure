export interface QuizQuestion {
  id: string;
  topic: 'space' | 'nutrition' | 'health_physics';
  icon: string;
  questionAr: string;
  options: {
    id: string;
    labelAr: string;
    isCorrect: boolean;
    feedbackAr: string;
  }[];
  nasaConnectionAr: string;
  nasaBadgeAr: string;
}

// 14 Space Science, Planets & Real NASA Exploration Questions
export const SPACE_SCIENCE_QUESTIONS: readonly QuizQuestion[] = [
  {
    id: 'sci_01',
    topic: 'space',
    icon: '🌙',
    questionAr: 'كم تبلغ الجاذبية على سطح القمر مقارنة بكوكب الأرض؟',
    options: [
      { id: 'a', labelAr: 'سُدس جاذبية الأرض (0.16G)', isCorrect: true, feedbackAr: 'عبقري الفضاء! على القمر الجاذبية 0.16G بس، عشان كده رواد أبولو نطوا عالي جداً!' },
      { id: 'b', labelAr: 'نفس جاذبية الأرض تماماً', isCorrect: false, feedbackAr: 'قربت جداً يا بطل! القمر أصغر من الأرض بكتير، فكر تاني في السُدس!' },
      { id: 'c', labelAr: 'أقوى من الأرض عشر مرات', isCorrect: false, feedbackAr: 'فكر تاني يا بطل! الأجسام بتطير بخفة على القمر مش بتتقَل!' }
    ],
    nasaConnectionAr: 'يستخدم مهندسو ناسا في برنامج أرتميس قيمة 1.62 م/ث² لتصميم بدلات ومركبات تتحرك بسهولة في فوهة شاكلتون.',
    nasaBadgeAr: 'Artemis Lunar Gravity'
  },
  {
    id: 'sci_02',
    topic: 'space',
    icon: '🔴',
    questionAr: 'لماذا يظهر كوكب المريخ باللون الأحمر من الفضاء؟',
    options: [
      { id: 'a', labelAr: 'لأن ترابه غني بأكسيد الحديد (الصدأ)', isCorrect: true, feedbackAr: 'ممتاز مية في المية! غبار الصدأ الأحمر يغطي صحراء المريخ بالكامل!' },
      { id: 'b', labelAr: 'لأنه مغطى بالنار المشتعلة', isCorrect: false, feedbackAr: 'فكر تاني يا بطل! المريخ كوكب بارد جداً مش مشتعل!' },
      { id: 'c', labelAr: 'لأن بحاره لونها أحمر', isCorrect: false, feedbackAr: 'لا يوجد بحار سائلة حالياً على سطح المريخ، فكر في الصدأ!' }
    ],
    nasaConnectionAr: 'ترسل ناسا مركبات مثل Perseverance لتحليل صخور أكسيد الحديد والبحث عن آثار مياه قديمة على المريخ.',
    nasaBadgeAr: 'NASA Mars Rover'
  },
  {
    id: 'sci_03',
    topic: 'space',
    icon: '🌋',
    questionAr: 'ما اسم أكبر بركان في المجموعة الشمسية كلها والموجود على المريخ؟',
    options: [
      { id: 'a', labelAr: 'جبل أوليمبوس مونس (Olympus Mons)', isCorrect: true, feedbackAr: 'أحسنت يا بطل! ارتفاعه حوالي 22 كيلومتر، يعني تلت أضعاف جبل إيفرست!' },
      { id: 'b', labelAr: 'جبل طارق القمري', isCorrect: false, feedbackAr: 'قربت جداً! اسم البركان العملاق على المريخ يبدأ بأوليمبوس!' },
      { id: 'c', labelAr: 'بركان حلقات زحل', isCorrect: false, feedbackAr: 'زحل كوكب غازي ملوش براكين صخرية! فكر في المريخ!' }
    ],
    nasaConnectionAr: 'تلتقط أقمار ناسا المدارية خرائط ليزر دقيقة لقمة أوليمبوس مونس لفهم تاريخ الكوكب الأحمر.',
    nasaBadgeAr: 'NASA MRO Mars Map'
  },
  {
    id: 'sci_04',
    topic: 'space',
    icon: '🪐',
    questionAr: 'مِمَّ تتكون حلقات كوكب زحل الخلابة التي نراها بالتليسكوب؟',
    options: [
      { id: 'a', labelAr: 'مليارات قطع الجليد والصخور الدوارة', isCorrect: true, feedbackAr: 'عاش يا بطل! قطع التلج اللامعة بتعكس ضوء الشمس فتظهر الحلقات ذهبية مذهلة!' },
      { id: 'b', labelAr: 'حلقة حديدية صلبة واحدة', isCorrect: false, feedbackAr: 'لا يا بطل! الحلقات مش قطعة واحدة، دي مليارات القطع المنفصلة!' },
      { id: 'c', labelAr: 'سحب من الدخان الأسود', isCorrect: false, feedbackAr: 'فكر تاني! لو كانت دخان أسود مكانتش هتعكس نور الشمس اللامع كده!' }
    ],
    nasaConnectionAr: 'درست مركبة كاسيني التابعة لناسا ووكالة الفضاء الأوروبية حلقات زحل لمدة 13 عاماً واكتشفت ينابيع جليد على قمره إنسيلادوس.',
    nasaBadgeAr: 'NASA Cassini'
  },
  {
    id: 'sci_05',
    topic: 'space',
    icon: '🌀',
    questionAr: 'إذا كان وزنك 30 كجم على الأرض، ماذا يحدث لوزنك لو وقفت قرب المشتري (2.53G)؟',
    options: [
      { id: 'a', labelAr: 'يصبح أثقل جداً (حوالي 76 كجم)', isCorrect: true, feedbackAr: 'عبقري رياضيات الفضاء! جاذبية المشتري الهائلة بتشدك للأسفل بضعفين ونص!' },
      { id: 'b', labelAr: 'تطير مثل الريشة بوزن 2 كجم', isCorrect: false, feedbackAr: 'العكس يا بطل! المشتري أكبر كوكب وجاذبيته شديدة جداً!' },
      { id: 'c', labelAr: 'يبقى 30 كجم بالضبط', isCorrect: false, feedbackAr: 'الكتلة ثابتة لكن الوزن يتغير حسب جاذبية كل كوكب!' }
    ],
    nasaConnectionAr: 'تدرس مهمة Juno التابعة لناسا حقل الجاذبية الضخم للمشتري لفهم نواة الكوكب العملاق.',
    nasaBadgeAr: 'NASA Juno Mission'
  },
  {
    id: 'sci_06',
    topic: 'space',
    icon: '☄️',
    questionAr: 'وفق بيانات رادار ناسا الحي لكويكب 2010 PK (3542519)، هل يمثل خطراً على الأرض؟',
    options: [
      { id: 'a', labelAr: 'لا، يمر بأمان على بعد يزيد عن 19 ضعف مسافة القمر', isCorrect: true, feedbackAr: 'ممتاز يا عالم ناسا! رادار NeoWs بيأكد إن مساره آمن ومش هيقرب من الأرض!' },
      { id: 'b', labelAr: 'نعم، سيهبط في المحيط غداً', isCorrect: false, feedbackAr: 'اطمن يا بطل! بيانات NeoWs بتأكد إن الكويكب بعيد جداً بـ 19 مسافة قمرية!' },
      { id: 'c', labelAr: 'يتوقف في مكانه ولا يتحرك', isCorrect: false, feedbackAr: 'الكويكبات بتجري بسرعة تقارب 15 كم/ث في مدارات حول الشمس!' }
    ],
    nasaConnectionAr: 'يراقب مكتب الدفاع الكوكبي في ناسا (NeoWs) آلاف الكويكبات يومياً بحساب قطرها وسرعتها ومسافة مرورها.',
    nasaBadgeAr: 'NASA NeoWs Radar'
  },
  {
    id: 'sci_07',
    topic: 'space',
    icon: '🌍',
    questionAr: 'ما الذي يجعل كوكب الأرض مميزاً ومناسباً للحياة مقارنة بباقي الكواكب؟',
    options: [
      { id: 'a', labelAr: 'وجود ماء سائل وغلاف جوي غني بالأكسجين وحرارة معتدلة', isCorrect: true, feedbackAr: 'برافو عليك! الغلاف الجوي والماء السائل هما سر الحياة على كوكبنا الأزرق!' },
      { id: 'b', labelAr: 'لأنه أكبر كوكب في المجموعة الشمسية', isCorrect: false, feedbackAr: 'المشتري وزحل أكبر بكتير من الأرض، فكر في الماء والهواء!' },
      { id: 'c', labelAr: 'لأنه الأقرب للشمس', isCorrect: false, feedbackAr: 'عطارد والزهرة أقرب للشمس ودرجة حرارتهما حارقة جداً!' }
    ],
    nasaConnectionAr: 'تلتقط أقمار ناسا ضمن مشروع Blue Marble صوراً يومية للغلاف الجوي والمحيطات لحماية مناخ الأرض.',
    nasaBadgeAr: 'NASA Earth Observatory'
  },
  {
    id: 'sci_08',
    topic: 'space',
    icon: '☀️',
    questionAr: 'ما هي العواصف الشمسية (CME) التي يرصدها نظام ناسا DONKI؟',
    options: [
      { id: 'a', labelAr: 'انفجارات من الجسيمات المشحونة والطاقة المنطلقة من الشمس', isCorrect: true, feedbackAr: 'ممتاز! عشان كده محطة القمر بتراقب رادار DONKI وتشغل الدروع في وقت العاصفة!' },
      { id: 'b', labelAr: 'أمطار غزيرة تتساقط على القمر', isCorrect: false, feedbackAr: 'مفيش أمطار على القمر! العاصفة الشمسية بتيجي من إشعاع الشمس!' },
      { id: 'c', labelAr: 'رياح باردة تخرج من المريخ', isCorrect: false, feedbackAr: 'اسمها شمسية لأنها بتخرج من الشمس نفسها!' }
    ],
    nasaConnectionAr: 'يحذر نظام NASA DONKI رواد الفضاء قبل وصول الجسيمات الشمسية حتى يختبئوا في ملاجئ محمية.',
    nasaBadgeAr: 'NASA DONKI Forecast'
  },
  {
    id: 'sci_09',
    topic: 'space',
    icon: '🔇',
    questionAr: 'لو صرخت بصوت عالٍ في الفضاء المفتوح بدون خوذة اتصال، هل سيسمعك زميلك؟',
    options: [
      { id: 'a', labelAr: 'لا، لأن الصوت يحتاج للهواء لكي ينتقل والفضاء فراغ', isCorrect: true, feedbackAr: 'صح مية في المية! رواد الفضاء بيتكلموا عبر الراديو جوه الخوذة!' },
      { id: 'b', labelAr: 'نعم، سيكون الصوت أعلى عشر مرات', isCorrect: false, feedbackAr: 'فكر تاني! الفضاء مفيهوش هواء ينقل موجات الصوت!' },
      { id: 'c', labelAr: 'نعم، لأن النجوم تنقل الكلام', isCorrect: false, feedbackAr: 'النجوم بعيدة جداً وموجات الصوت لا تسافر في الفراغ!' }
    ],
    nasaConnectionAr: 'تحتوي كل خوذة فضاء في ناسا على ميكروفون وسماعات متصلة بالراديو للتواصل الواضح في الفراغ.',
    nasaBadgeAr: 'NASA EMU Comms'
  },
  {
    id: 'sci_10',
    topic: 'space',
    icon: '🔭',
    questionAr: 'كيف تساعدنا صور ناسا اليومية (APOD) وتليسكوبات جيمس ويب وهابل؟',
    options: [
      { id: 'a', labelAr: 'ترصد المجرات البعيدة وتكشف ولادة النجوم والكواكب', isCorrect: true, feedbackAr: 'رائع! التليسكوبات الفضائية بتشوف أعماق الكون بوضوح خيالي فوق الغلاف الجوي!' },
      { id: 'b', labelAr: 'تستخدم فقط لتصوير الشوارع على الأرض', isCorrect: false, feedbackAr: 'تليسكوبات الفضاء موجهة نحو السماء والمجرات البعيدة!' },
      { id: 'c', labelAr: 'توقف دوران الكواكب', isCorrect: false, feedbackAr: 'التليسكوبات تراقب وتصور فقط ولا توقف الكواكب!' }
    ],
    nasaConnectionAr: 'تنشر ناسا يومياً صورة فلكية موثقة عبر واجهة APOD لشرح أسرار السدم والنجوم للطلاب والعلماء.',
    nasaBadgeAr: 'NASA APOD Explorer'
  },
  {
    id: 'sci_11',
    topic: 'space',
    icon: '🧊',
    questionAr: 'لماذا اختارت ناسا فوهة شاكلتون في القطب الجنوبي للقمر لبناء قاعدة أرتميس؟',
    options: [
      { id: 'a', labelAr: 'لأن قاعها المظلم يحتوي على جليد مائي وقممها ترى الشمس طويلاً', isCorrect: true, feedbackAr: 'مذهل! الجليد يدينا مية شرب وأكسجين ووقود، والشمس تدينا كهرباء مستمرة!' },
      { id: 'b', labelAr: 'لأن فيها غابات وأشجار طبيعية', isCorrect: false, feedbackAr: 'القمر مفهوش أشجار، لكن فيه جليد مائي نفيس جداً في الفوهات القطبية!' },
      { id: 'c', labelAr: 'لأنها أقرب نقطة للمريخ', isCorrect: false, feedbackAr: 'السبب الحقيقي هو الجليد المائي وأشعة الشمس الدائمة على الحواف!' }
    ],
    nasaConnectionAr: 'ترسل ناسا مهمات Artemis للقطب الجنوبي لاستخراج جليد المياه وتحويله لأكسجين ووقود صواريخ.',
    nasaBadgeAr: 'Artemis Shackleton'
  },
  {
    id: 'sci_12',
    topic: 'space',
    icon: '🛸',
    questionAr: 'لماذا يطفو رواد الفضاء داخل محطة الفضاء الدولية وكأنهم يسبحون في الهواء؟',
    options: [
      { id: 'a', labelAr: 'لأن المحطة في حالة سقوط حر مستمر حول الأرض (انعدام وزن)', isCorrect: true, feedbackAr: 'عبقري فيزياء الفضاء! المحطة تدور بسرعة 28 ألف كم/س فتعيش في جاذبية صغرى!' },
      { id: 'b', labelAr: 'لأن المحطة مملوءة بمياه غير مرئية', isCorrect: false, feedbackAr: 'المحطة مملوءة بالهواء للتنفس، السر في السقوط الحر أثناء الدوران!' },
      { id: 'c', labelAr: 'لأن أحذيتهم فيها مراوح خفية', isCorrect: false, feedbackAr: 'مفيش مراوح! الجاذبية الصغرى تجعل كل جسم حر يطفو!' }
    ],
    nasaConnectionAr: 'يدرس علماء ناسا في محطة الفضاء ISS تأثير الجاذبية الصغرى 0G على السوائل والنباتات وجسم الإنسان.',
    nasaBadgeAr: 'ISS Microgravity Lab'
  },
  {
    id: 'sci_13',
    topic: 'space',
    icon: '🔥',
    questionAr: 'لماذا تحترق مقدمة كبسولة الفضاء بدرجة حرارة عالية جداً عند العودة للأرض؟',
    options: [
      { id: 'a', labelAr: 'بسبب الاحتكاك الشديد مع الهواء عند الدخول بسرعة فائقة', isCorrect: true, feedbackAr: 'أحسنت! عشان كده الدرع الحراري وزاوية 20°-24° يحميان رواد الفضاء بأمان!' },
      { id: 'b', labelAr: 'لأن الشمس تلامس الكبسولة مباشرة', isCorrect: false, feedbackAr: 'السبب هو ضغط واحتكاك جزيئات الغلاف الجوي للأرض!' },
      { id: 'c', labelAr: 'لأن الرواد يشعلون مدفأة كبيرة', isCorrect: false, feedbackAr: 'الحرارة تأتي من احتكاك الغلاف الجوي السريع!' }
    ],
    nasaConnectionAr: 'تستخدم كبسولة Orion في برنامج أرتميس أكبر درع حراري مصنوع من مادة Avcoat لتحمل ~2760°م أثناء العودة.',
    nasaBadgeAr: 'Orion Heat Shield'
  },
  {
    id: 'sci_14',
    topic: 'space',
    icon: '🌑',
    questionAr: 'كم يوماً تقريباً تستغرق الأرض لتدور دورة كاملة واحدة حول الشمس؟',
    options: [
      { id: 'a', labelAr: 'حوالي 365 يوماً (سنة أرضية واحدة)', isCorrect: true, feedbackAr: 'ممتاز! الأرض بتكمل رحلتها حوالين الشمس كل سنة، وبسبب ميلها بتحصل الفصول الأربعة!' },
      { id: 'b', labelAr: '24 ساعة فقط', isCorrect: false, feedbackAr: '24 ساعة هي دوران الأرض حوالين نفسها، مش حوالين الشمس!' },
      { id: 'c', labelAr: '30 يوماً', isCorrect: false, feedbackAr: 'حوالي 30 يوماً هي رحلة القمر حوالين الأرض!' }
    ],
    nasaConnectionAr: 'تحسب فرق ناسا مسار الكواكب بدقة بالثواني لتحديد أفضل موعد "نافذة إطلاق" نحو القمر والمريخ.',
    nasaBadgeAr: 'NASA Orbital Mechanics'
  }
];

// 14 Space Nutrition Questions (Based strictly on foodItems.ts & NASA Food Systems)
export const NUTRITION_QUIZ_QUESTIONS: readonly QuizQuestion[] = [
  {
    id: 'nut_01',
    topic: 'nutrition',
    icon: '🍯',
    questionAr: 'لماذا يفضل رواد الفضاء عبوات العسل السيناوي والمكعبات المتماسكة بدلاً من الخبز العادي المنفوش؟',
    options: [
      { id: 'a', labelAr: 'لأنها محكمة الغلق ولا تترك فتاتاً يطير في الهواء ويدخل الفلاتر', isCorrect: true, feedbackAr: 'برافو! العبوات اللينة المحكمة والعسل السيناوي أبطال الفضاء لأنهم بدون فتات ويحفظوا الأجهزة!' },
      { id: 'b', labelAr: 'لأن لونها يضيء في الظلام', isCorrect: false, feedbackAr: 'لا، السر الحقيقي هو إنها محكمة الغلق وخالية من الفتات في انعدام الجاذبية!' },
      { id: 'c', labelAr: 'لأنها ثقيلة مثل الحديد', isCorrect: false, feedbackAr: 'بالعكس! العبوات السيناوية والعسل مضغوطة وخفيفة للشحن!' }
    ],
    nasaConnectionAr: 'تعتمد ناسا العبوات المحكمة والأطعمة غير المتفتتة منذ بعثات أبولو والمحطة الدولية.',
    nasaBadgeAr: 'NASA No-Crumbs Rule'
  },
  {
    id: 'nut_02',
    topic: 'nutrition',
    icon: '🍪',
    questionAr: 'ما الخطر الحقيقي لو فتح رائد فضاء كيس بسكويت مقرمش وشيبس في انعدام الجاذبية؟',
    options: [
      { id: 'a', labelAr: 'الفتات لا يسقط للأرض بل يطفو ويدخل العيون وفلاتر الأكسجين', isCorrect: true, feedbackAr: 'صحيح تماماً! ذرات الفتات في 0G بتسبح في الهوا وممكن تسد مراوح التهوية!' },
      { id: 'b', labelAr: 'يتحول فوراً إلى ماء سائل', isCorrect: false, feedbackAr: 'لا يتحول لماء، المشكلة إنه يتكسر لشظايا وفتات طائر!' },
      { id: 'c', labelAr: 'يسقط بسرعة أكبر تحت الطاولة', isCorrect: false, feedbackAr: 'في انعدام الجاذبية مفيش "تحت"! الفتات يفضل طاير!' }
    ],
    nasaConnectionAr: 'تمنع ناسا الأطعمة المتفتتة أو تغلفها بطبقة جيلاتين خاصة لحماية أجهزة التنفس والملاحة.',
    nasaBadgeAr: 'ISS Cabin Safety'
  },
  {
    id: 'nut_03',
    topic: 'nutrition',
    icon: '🌶️',
    questionAr: 'لماذا يحب رواد الفضاء أنبوب الصلصة الحارة والتوابل القوية في الفضاء؟',
    options: [
      { id: 'a', labelAr: 'لأن السوائل ترتفع للرأس في 0G وتُضعف حاسة التذوق والشم', isCorrect: true, feedbackAr: 'مذهل! احتقان الأنف الفضائي يخلّي طعم الأكل خفيف، والصلصة الحارة بتعيد النكهة!' },
      { id: 'b', labelAr: 'لتدفئة الصاروخ من الخارج', isCorrect: false, feedbackAr: 'الصلصة للأكل فقط لتقوية طعم الوجبة!' },
      { id: 'c', labelAr: 'لأنها تجعل الرائد يطير أسرع', isCorrect: false, feedbackAr: 'السر هو تغير حاسة التذوق بسبب ارتفاع السوائل للرأس!' }
    ],
    nasaConnectionAr: 'تؤكد مختبرات ناسا أن الصلصات الحارة والخردل من أكثر الإضافات طلباً في قائمة طعام ISS.',
    nasaBadgeAr: 'NASA Fluid Shift'
  },
  {
    id: 'nut_04',
    topic: 'nutrition',
    icon: '🍗',
    questionAr: 'ما أهمية الوجبات الغنية بالبروتين مثل دجاج الترياكي لرواد الفضاء؟',
    options: [
      { id: 'a', labelAr: 'تبني العضلات وتحميها من الضعف في الجاذبية الصغرى', isCorrect: true, feedbackAr: 'عاش يا بطل! البروتين مع التمارين بيمنع ضمور العضلات لما نعيش في الفضاء!' },
      { id: 'b', labelAr: 'تجعل بدلة الفضاء أطول', isCorrect: false, feedbackAr: 'البروتين يغذي عضلات الجسم نفسها مش البدلة!' },
      { id: 'c', labelAr: 'تحل محل الأكسجين للتنفس', isCorrect: false, feedbackAr: 'الرئة تتنفس الأكسجين، أما العضلات فتحتاج البروتين!' }
    ],
    nasaConnectionAr: 'تفرض معايير NASA JSC موازنة البروتين والكربوهيدرات يومياً لدعم الكتلة العضلية للطاقم.',
    nasaBadgeAr: 'NASA Muscle Nutrition'
  },
  {
    id: 'nut_05',
    topic: 'nutrition',
    icon: '🍓',
    questionAr: 'ما الفائدة الذكية من تجفيف الفراولة والفواكه بالتجميد (Freeze-Drying) قبل الإطلاق؟',
    options: [
      { id: 'a', labelAr: 'يقلل الوزن للشحن ويحفظ أكثر من 97% من الفيتامينات دون تلف', isCorrect: true, feedbackAr: 'رائع! سحب المياه يقلل وزن الصاروخ ويحفظ الفواكه شهور طويلة بدون ثلاجة!' },
      { id: 'b', labelAr: 'يجعل الفاكهة تتضاعف في الوزن عشر مرات', isCorrect: false, feedbackAr: 'العكس! إزالة الماء تجعل الوجبة خفيفة جداً وسهلة الشحن!' },
      { id: 'c', labelAr: 'يزيل كل الفيتامينات المفيدة', isCorrect: false, feedbackAr: 'التجفيف بالتجميد يحفظ تقريباً كل الفيتامينات الطبيعية!' }
    ],
    nasaConnectionAr: 'كل كيلوجرام يُحمل للفضاء يكلف آلاف الدولارات، لذا يُسحب الماء من الأكل ويُضاف ماء معاد تدويره في المدار.',
    nasaBadgeAr: 'NASA Freeze-Dry Tech'
  },
  {
    id: 'nut_06',
    topic: 'nutrition',
    icon: '🧂',
    questionAr: 'لماذا تمنع ناسا الأطعمة شديدة الملوحة (الصوديوم العالي) مثل الرقائق المالحة؟',
    options: [
      { id: 'a', labelAr: 'لأن الملح الزائد يسحب الكالسيوم من العظام ويسرع هشاشتها في الفضاء', isCorrect: true, feedbackAr: 'إجابة عالم حقيقي! العظام في انعدام الجاذبية بتفقد كالسيوم، والملح الكتير يزود الخطر!' },
      { id: 'b', labelAr: 'لأن الملح يغير لون النجوم', isCorrect: false, feedbackAr: 'الخطر صحي تماماً على عظام رائد الفضاء!' },
      { id: 'c', labelAr: 'لأنه يجعل البدلة تطير للخارج', isCorrect: false, feedbackAr: 'المشكلة في تأثير الصوديوم على الكالسيوم والعظام!' }
    ],
    nasaConnectionAr: 'قلص أطباء التغذية في ناسا كمية الصوديوم في وجبات محطة الفضاء لحماية كثافة عظام الرواد.',
    nasaBadgeAr: 'NASA Bone Protection'
  },
  {
    id: 'nut_07',
    topic: 'nutrition',
    icon: '🥤',
    questionAr: 'كيف يشرب رائد الفضاء العصير أو الماء في انعدام الجاذبية بدون أن ينسكب في الغرفة؟',
    options: [
      { id: 'a', labelAr: 'من أكياس مغلقة مزودة بماصة وصمام منع التسرب', isCorrect: true, feedbackAr: 'صح يا بطل! لو صبيت كوباية مفتوحة هتطير كور مية في الهواء وتلمس الأجهزة الكهربائية!' },
      { id: 'b', labelAr: 'من كوب زجاجي مفتوح كما في المنزل', isCorrect: false, feedbackAr: 'الكوب المفتوح خطر في 0G لأن السائل يطير كفقاعات!' },
      { id: 'c', labelAr: 'لا يشرب الماء أبداً في الفضاء', isCorrect: false, feedbackAr: 'الماء ضروري جداً لصحة الرائد وكل سائل يُشرب من أكياس محكمة!' }
    ],
    nasaConnectionAr: 'تُزود أكياس مشروبات ناسا بصمامات تغلق تلقائياً فور سحب الماصة.',
    nasaBadgeAr: 'NASA Drink Pouch'
  },
  {
    id: 'nut_08',
    topic: 'nutrition',
    icon: '🧀',
    questionAr: 'كيف يسخّن رائد الفضاء كيس المكرونة بالجبنة أو الدجاج قبل الأكل؟',
    options: [
      { id: 'a', labelAr: 'بحقن ماء ساخن داخل الكيس المغلق وخلطه أو بتسخين الكيس داخل سخان صينية مغلق', isCorrect: true, feedbackAr: 'ممتاز! محطة حقن المياه والسخان المخصص بيخلوا الوجبة دافئة ولذيذة من غير تسريب!' },
      { id: 'b', labelAr: 'بإشعال نار مفتوحة داخل المركبة', isCorrect: false, feedbackAr: 'النار المفتوحة ممنوعة وخطيرة جداً في مركبة مملوءة بالأكسجين!' },
      { id: 'c', labelAr: 'بإخراج الكيس للشمس خارج الصاروخ', isCorrect: false, feedbackAr: 'التسخين بيتم بأمان جوه المطبخ الفضائي بماء ساخن أو سخان كهربائي مغلق!' }
    ],
    nasaConnectionAr: 'يستخدم الطاقم "لوح المطبخ" (Galley) المزود بموزع مياه دقيقة وسخان أطباق مغناطيسي.',
    nasaBadgeAr: 'ISS Space Galley'
  },
  {
    id: 'nut_09',
    topic: 'nutrition',
    icon: '⚖️',
    questionAr: 'في مختبر التغذية باللعبة، لماذا نحتاج موازنة نسبة البروتين والطاقة بين 20% و85%؟',
    options: [
      { id: 'a', labelAr: 'لأن الطاقة تحرك الجسم بينما البروتين يبني العضلات وكلاهما ضروري معاً', isCorrect: true, feedbackAr: 'برافو عليك! الأكل المتنوع بيدي جسمك كل اللي محتاجه مش نوع واحد بس!' },
      { id: 'b', labelAr: 'لكي يكون لون الصندوق جميلاً فقط', isCorrect: false, feedbackAr: 'التوازن الغذائي مهم لصحة القلب والعضلات والتركيز في المهمة!' },
      { id: 'c', labelAr: 'لأن البروتين والفيتامينات يمنعان الصاروخ من الدوران', isCorrect: false, feedbackAr: 'الهدف هو تغذية رائد الفضاء بشكل متوازن وكامل!' }
    ],
    nasaConnectionAr: 'يصمم اختصاصيو التغذية في مركز جونسون الفضائي جداول متوازنة السعرات والفيتامينات لكل رائد.',
    nasaBadgeAr: 'JSC Nutrition Balance'
  },
  {
    id: 'nut_10',
    topic: 'nutrition',
    icon: '🥦',
    questionAr: 'لماذا تزرع ناسا الخضروات الطازجة مثل الخس والفلفل داخل محطة الفضاء (Veggie Lab)؟',
    options: [
      { id: 'a', labelAr: 'لإمداد الرواد بفيتامينات طازجة وتحسين حالتهم النفسية في الرحلات الطويلة', isCorrect: true, feedbackAr: 'يا سلام! النباتات الخضراء تدي فيتامينات طازجة وتفرح رواد الفضاء بريحة الأرض الجميلة!' },
      { id: 'b', labelAr: 'لتغطية نوافذ المركبة من النجوم', isCorrect: false, feedbackAr: 'الهدف هو الغذاء الطازج والصحة النفسية وتجارب الزراعة القمرية!' },
      { id: 'c', labelAr: 'لأن النباتات تقود الصاروخ', isCorrect: false, feedbackAr: 'النباتات توفر غذاءً وأكسجيناً ومناظر خضراء مريحة للطاقم!' }
    ],
    nasaConnectionAr: 'نجح مشروع NASA Veggie في زراعة الخس الأحمر والفجل والفلفل الحار باستخدام إضاءة LED في انعدام الجاذبية.',
    nasaBadgeAr: 'NASA Veggie Garden'
  },
  {
    id: 'nut_11',
    topic: 'nutrition',
    icon: '🫧',
    questionAr: 'لماذا تُمنع المشروبات الغازية تماماً على متن محطة الفضاء الدولية؟',
    options: [
      { id: 'a', labelAr: 'لأن فقاعات الغاز لا ترتفع للأعلى في 0G فتسبب آلاماً واضطراباً في المعدة', isCorrect: true, feedbackAr: 'معلومة مذهلة! في الفضاء الغازات والسوائل تتلخبط مع بعض في البطن من غير جاذبية!' },
      { id: 'b', labelAr: 'لأن لونها داكن', isCorrect: false, feedbackAr: 'السبب العلمي هو سلوك فقاعات غاز ثاني أكسيد الكربون في المعدة!' },
      { id: 'c', labelAr: 'لأنها تجعل الخوذة تنفجر فوراً', isCorrect: false, feedbackAr: 'المشكلة في المعدة والانضغاط الغازي في انعدام الوزن!' }
    ],
    nasaConnectionAr: 'اختبرت ناسا علب مشروبات غازية في التجارب المدارية فوجدت أن الفقاعات تظل معلقة داخل السائل بدل فصلها.',
    nasaBadgeAr: 'NASA Zero-G Fluids'
  },
  {
    id: 'nut_12',
    topic: 'nutrition',
    icon: '🍎',
    questionAr: 'عند إرسال تفاح أو فواكه طازجة في مركبة الشحن، ما القاعدة المهمة لاستهلاكها؟',
    options: [
      { id: 'a', labelAr: 'يجب أكلها خلال الأيام الأولى قبل أن تفسد لأنها غير مجففة', isCorrect: true, feedbackAr: 'صح! الفاكهة الطازجة بتكون مكافأة لذيذة أول ما توصل مركبة الإمداد وبتتاكل بسرعة!' },
      { id: 'b', labelAr: 'تبقى صالحة عشرين سنة بدون ثلاجة', isCorrect: false, feedbackAr: 'الطعام المجفف أو المعقم بالحرارة هو اللي بيعيش شهور وسنين، أما الطازج بيتاكل بدري!' },
      { id: 'c', labelAr: 'يتم رميها خارج المركبة فوراً', isCorrect: false, feedbackAr: 'الرواد يفرحون جداً بوصول الفواكه الطازجة ويأكلونها طازجة!' }
    ],
    nasaConnectionAr: 'تحمل مركبات SpaceX Dragon وCygnus صناديق صغيرة من التفاح والبرتقال الطازج كهدية معنوية للطاقم.',
    nasaBadgeAr: 'ISS Resupply Fresh'
  },
  {
    id: 'nut_13',
    topic: 'nutrition',
    icon: '🍔',
    questionAr: 'لماذا يختار المخططون أطعمة قليلة الدهون المشبعة بدلاً من البرجر والبيتزا الدسمة؟',
    options: [
      { id: 'a', labelAr: 'لحماية صحة القلب والأوعية وتقليل الفتات والزيوت الملوثة للهواء', isCorrect: true, feedbackAr: 'عاش يا كابتن! الأكل الصحي الخفيف يحافظ على قلب الرائد قوي ونظافة هواء المركبة!' },
      { id: 'b', labelAr: 'لأن شكل الدائرة غير مسموح به', isCorrect: false, feedbackAr: 'شكل الطعام مش هو السبب! المشكلة الحقيقية في الدهون والفتات المتطاير والملح العالي!' },
      { id: 'c', labelAr: 'لأن البرجر أثقل من المريخ', isCorrect: false, feedbackAr: 'السبب طبي وصحي لحماية القلب وأجهزة الفضاء!' }
    ],
    nasaConnectionAr: 'تصمم قوائم ناسا تحت إشراف أطباء القلب والتغذية للحفاظ على لياقة الرواد أثناء المهام الطويلة.',
    nasaBadgeAr: 'NASA Crew Health'
  },
  {
    id: 'nut_14',
    topic: 'nutrition',
    icon: '🧲',
    questionAr: 'كيف تمنع ناسا الملعقة والوجبات من الطفو والهرب فوق الطاولة أثناء الأكل؟',
    options: [
      { id: 'a', labelAr: 'بتثبيت الصواني والأكياس بشرائط الفيلكرو اللاصقة والمغناطيس', isCorrect: true, feedbackAr: 'عبقري! المغناطيس والفيلكرو هما اللي بيمسكوا المعلقة والكيس على صينية الأكل!' },
      { id: 'b', labelAr: 'باستخدام الغراء الصمغي الدائم في الأكل', isCorrect: false, feedbackAr: 'الفيلكرو والمغناطيس يسمحان بفك وتثبيت الأشياء بسهولة ونظافة!' },
      { id: 'c', labelAr: 'بوضع صخرة ثقيلة فوق كل ملعقة', isCorrect: false, feedbackAr: 'حتى الصخرة هتطير في انعدام الوزن لو مش متثبتة!' }
    ],
    nasaConnectionAr: 'كل صينية طعام في محطة الفضاء تحتوي على شرائط Velcro ومشابك تثبيت لحفظ الأدوات المعدنية.',
    nasaBadgeAr: 'ISS Dining Tray'
  }
];

// 14 Astronaut Health, Suit & Space Physics Questions
export const HEALTH_PHYSICS_QUESTIONS: readonly QuizQuestion[] = [
  {
    id: 'hp_01',
    topic: 'health_physics',
    icon: '❤️',
    questionAr: 'ما هي أفضل عادة يومية للحفاظ على قوة عضلة قلب رائد الفضاء؟',
    options: [
      { id: 'a', labelAr: 'ممارسة الرياضة والتمارين المنتظمة يومياً', isCorrect: true, feedbackAr: 'أحسنت! الرياضة مهمة لصحة جسمك وتجعل قلب رائد الفضاء قوياً في الأرض والفضاء! 💪❤️' },
      { id: 'b', labelAr: 'الأكل السريع والوجبات المقلية', isCorrect: false, feedbackAr: 'حاسب يا بطل! الأكل السريع مليان دهون بتتعب القلب وممنوع لرواد الفضاء!' },
      { id: 'c', labelAr: 'شرب المشروبات الغازية قبل الإطلاق', isCorrect: false, feedbackAr: 'لا لا لا! المشروبات الغازية بتضر صحة العظام والمعدة في الفضاء!' }
    ],
    nasaConnectionAr: 'يتدرب رواد محطة الفضاء ساعتين يومياً بجهاز الركض والمقاومة لحماية عضلة القلب.',
    nasaBadgeAr: 'NASA Cardio Care'
  },
  {
    id: 'hp_02',
    topic: 'health_physics',
    icon: '💪',
    questionAr: 'ماذا يستخدم رواد الفضاء لتمرين العضلات والعظام في انعدام الجاذبية حيث لا يوجد وزن؟',
    options: [
      { id: 'a', labelAr: 'جهاز المقاومة المتطور ARED الذي يولد مقاومة هوائية بالشفط', isCorrect: true, feedbackAr: 'برافو! الحديد العادي وزنه صفر في الفضاء، فجهاز ARED يستخدم أسطوانات مفرغة لمقاومة العضلات!' },
      { id: 'b', labelAr: 'رفع حقائب قطن خفيفة', isCorrect: false, feedbackAr: 'أي كتلة مش بتتشد لتحت في 0G، فكر في جهاز المقاومة ARED!' },
      { id: 'c', labelAr: 'الوقوف بدون حركة لشهر كامل', isCorrect: false, feedbackAr: 'قلة الحركة في الفضاء تضعف العظام والعضلات سريعاً!' }
    ],
    nasaConnectionAr: 'أثبتت دراسات ناسا أن التمرين اليومي على ARED مع البروتين يحفظ أكثر من 95% من كتلة العضلات.',
    nasaBadgeAr: 'NASA ARED System'
  },
  {
    id: 'hp_03',
    topic: 'health_physics',
    icon: '👩‍🚀',
    questionAr: 'ما الضغط المثالي للأكسجين النقي داخل بدلة السير الفضائي NASA EMU؟',
    options: [
      { id: 'a', labelAr: '4.3 PSI ليسمح بحركة المفاصل والأصابع بمرونة وأمان', isCorrect: true, feedbackAr: 'ممتاز مية في المية! لو الضغط علي أوي البدلة هتتيبس زي البالونة المنفوخة!' },
      { id: 'b', labelAr: 'صفر PSI (بدون هواء)', isCorrect: false, feedbackAr: 'بدون ضغط وأكسجين لا يستطيع الإنسان البقاء حياً خارج المركبة!' },
      { id: 'c', labelAr: '50 PSI (مثل إطارات الشاحنات)', isCorrect: false, feedbackAr: 'لو كان 50 PSI مكنش الرائد يقدر يتني صباعه أو ذراعه أبداً!' }
    ],
    nasaConnectionAr: 'تعمل بدلات ناسا عند 4.3 PSI بالأكسجين النقي مع خوذة ذهبية تعكس أشعة الشمس الحارقة.',
    nasaBadgeAr: 'NASA EMU 4.3 PSI'
  },
  {
    id: 'hp_04',
    topic: 'health_physics',
    icon: '🕶️',
    questionAr: 'لماذا تحتوي خوذة بدلة الفضاء على حاجب مطلي بطبقة رقيقة من الذهب؟',
    options: [
      { id: 'a', labelAr: 'لتعكس الأشعة الشمسية الحارقة وتحمي عيون الرائد من الوهج والأشعة فوق البنفسجية', isCorrect: true, feedbackAr: 'رائع! الشمس في الفضاء ساطعة جداً بدون غلاف جوي، والذهب يعكس الحرارة والضوء الضار!' },
      { id: 'b', labelAr: 'للزينة والتصوير فقط', isCorrect: false, feedbackAr: 'الذهب درع بصري وحراري حقيقي لحماية العين!' },
      { id: 'c', labelAr: 'لإخفاء وجه الرائد عن الكواكب', isCorrect: false, feedbackAr: 'الوظيفة طبية وفيزيائية لحماية البصر من أشعة الشمس غير المرشحة!' }
    ],
    nasaConnectionAr: 'تُطلى خوذات EVA بطبقة ذهب فائقة الرقة تعكس 98% من الأشعة الضارة مع بقاء الرؤية واضحة.',
    nasaBadgeAr: 'Gold Visor Shield'
  },
  {
    id: 'hp_05',
    topic: 'health_physics',
    icon: '💧',
    questionAr: 'كيف نحافظ على إمداد مستعمرة القمر بالمياه النظيفة بدون شحن آلاف اللترات كل يوم؟',
    options: [
      { id: 'a', labelAr: 'بنظام ECLSS لتنقية وتدوير 98% من المياه والرطوبة داخل القاعدة', isCorrect: true, feedbackAr: 'عبقري الهندسة الفضائية! نظام ECLSS يعيد تنقية كل قطرة مية حتى تصبح أنقى من مياه الصنبور!' },
      { id: 'b', labelAr: 'بانتظار هطول المطر على القمر', isCorrect: false, feedbackAr: 'لا يوجد مطر على القمر بسبب انعدام الغلاف الجوي!' },
      { id: 'c', labelAr: 'باستخدام مياه البحر المالحة من الغيوم', isCorrect: false, feedbackAr: 'لا توجد بحار ولا غيوم على القمر؛ التدوير وحفر الجليد هما الحل!' }
    ],
    nasaConnectionAr: 'حقق نظام ECLSS في محطة الفضاء الدولية معدل إعادة تدوير مياه يصل إلى 98% تمهيداً لرحلات القمر والمريخ.',
    nasaBadgeAr: 'NASA ECLSS 98%'
  },
  {
    id: 'hp_06',
    topic: 'health_physics',
    icon: '🧂',
    questionAr: 'لماذا يشرب الرواد محاليل أملاح الإرواء والترطيب قبل وبعد الانتقال للجاذبية الصغرى؟',
    options: [
      { id: 'a', labelAr: 'لمنع هبوط ضغط الدم ودوار الفضاء وتنظيم سوائل الجسم', isCorrect: true, feedbackAr: 'صح يا دكتور الفضاء! التوازن المائي والملحي يحمي الرائد من الدوخة عند العودة أو الهبوط!' },
      { id: 'b', labelAr: 'لتغيير لون صوتهم', isCorrect: false, feedbackAr: 'الأملاح تنظم ضغط الدم وحجم السوائل في الأوعية الدموية!' },
      { id: 'c', labelAr: 'لإيقاف نمو الشعر', isCorrect: false, feedbackAr: 'الهدف هو استقرار ضغط الدم والترطيب الحيوي!' }
    ],
    nasaConnectionAr: 'يُطبق بروتوكول NASA Fluid Loading (ماء + إلكترولايت) لحماية الرواد من الإغماء الموضعي بعد الهبوط.',
    nasaBadgeAr: 'NASA Fluid Loading'
  },
  {
    id: 'hp_07',
    topic: 'health_physics',
    icon: '🔗',
    questionAr: 'ما وظيفة حبل الأمان الفولاذي (Safety Tether) أثناء السير الفضائي خارج المركبة؟',
    options: [
      { id: 'a', labelAr: 'يربط الرائد بالمركبة حتى لا يبتعد في الفضاء حسب قانون نيوتن للقصور', isCorrect: true, feedbackAr: 'عبقري الفيزياء! في الفراغ لو اندفعت للخارج ومفيش حبل، هتفضل ماشي للأبد!' },
      { id: 'b', labelAr: 'يستخدم لصيد النيازك الصغيرة', isCorrect: false, feedbackAr: 'حبل الأمان يحفظ حياة الرائد مربوطاً بجدار المحطة دائماً!' },
      { id: 'c', labelAr: 'يملأ البطارية من الكواكب', isCorrect: false, feedbackAr: 'هو رابط ميكانيكي متين يتحمل شد أكثر من 1000 رطل!' }
    ],
    nasaConnectionAr: 'يتبع رواد ناسا قاعدة "Two-Tether Rule" فلا يفصلون خطافاً أبداً قبل تثبيت الثاني.',
    nasaBadgeAr: 'NASA EVA Tether'
  },
  {
    id: 'hp_08',
    topic: 'health_physics',
    icon: '⚖️',
    questionAr: 'لماذا نوزع وزن العينات القمرية بالتساوي بين اليمين واليسار في كبسولة العودة (فارق ≤ 15 كجم)؟',
    options: [
      { id: 'a', labelAr: 'للحفاظ على مركز الثقل حتى لا تميل الكبسولة وتحترق أثناء اختراق الغلاف الجوي', isCorrect: true, feedbackAr: 'ممتاز! توازن الكتلة يمنع الدوران العشوائي ويخلي الدرع الحراري في الاتجاه الصح!' },
      { id: 'b', labelAr: 'لكي تبدو الصناديق متشابهة في الصورة', isCorrect: false, feedbackAr: 'الموضوع فيزياء طيران حيوية جداً؛ اختلال التوازن يغير زاوية الدرع الحراري!' },
      { id: 'c', labelAr: 'لأن الصخور تغضب لو جلست وحدها', isCorrect: false, feedbackAr: 'السبب هو ضبط مركز الثقل والاتزان الهوائي!' }
    ],
    nasaConnectionAr: 'تحسب فرق مركز لندون جونسون كل جرام في كبسولات العودة لضبط زاوية الدخول الآمنة 20°-24°.',
    nasaBadgeAr: 'Capsule Center-of-Mass'
  },
  {
    id: 'hp_09',
    topic: 'health_physics',
    icon: '🛰️',
    questionAr: 'في انعدام الجاذبية، لماذا تبدو وجوه رواد الفضاء ممتلئة قليلاً وأرجلهم أنحف (Puffy Face)؟',
    options: [
      { id: 'a', labelAr: 'لأن الجاذبية لم تعد تسحب الدم والسوائل للقدمين فتصعد السوائل نحو الصدر والرأس', isCorrect: true, feedbackAr: 'ممتاز مية في المية! الجسم يعيد توزيع السوائل بالتساوي لفوق في أول أيام الفضاء!' },
      { id: 'b', labelAr: 'لأنهم ينامون رأساً على عقب فقط', isCorrect: false, feedbackAr: 'في الفضاء مفيش فوق وتحت أصلاً! عدم وجود شد للأسفل هو السبب!' },
      { id: 'c', labelAr: 'لأن الخوذة تضغط على الخدود', isCorrect: false, feedbackAr: 'تظهر هذه الظاهرة حتى داخل المحطة بدون خوذة بسبب انتقال السوائل!' }
    ],
    nasaConnectionAr: 'يسمي أطباء ناسا هذه الظاهرة Cephalad Fluid Shift ويراقبون معها ضغط العين بانتظام.',
    nasaBadgeAr: 'NASA Physiology'
  },
  {
    id: 'hp_10',
    topic: 'health_physics',
    icon: '⚡',
    questionAr: 'ماذا نحتاج في قلب المحرك لتوليد الكهرباء والماء النقي معاً من خلايا الوقود (Fuel Cells)؟',
    options: [
      { id: 'a', labelAr: 'دمج الهيدروجين والأكسجين مع الحفاظ على التبريد ومنع السخونة الزائدة', isCorrect: true, feedbackAr: 'إجابة مهندس صواريخ! تفاعل الهيدروجين والأكسجين يدينا كهرباء ومية شرب نقية للطاقم!' },
      { id: 'b', labelAr: 'خلط الرمل والتراب القمري في الخزان', isCorrect: false, feedbackAr: 'التراب القمري لا يولد كهرباء في خلايا الوقود؛ الهيدروجين والأكسجين هما الأساس!' },
      { id: 'c', labelAr: 'ترك البطارية بدون شحن أو تهوية', isCorrect: false, feedbackAr: 'المتابعة الحرارية والتبريد ضروريان لحماية خلايا الطاقة!' }
    ],
    nasaConnectionAr: 'استخدمت مركبات أبولو ومكوك الفضاء خلايا الوقود لأن ناتجها الثانوي هو ماء شرب نقي للرواد.',
    nasaBadgeAr: 'NASA Fuel Cell Tech'
  },
  {
    id: 'hp_11',
    topic: 'health_physics',
    icon: '😴',
    questionAr: 'كم شروق شمس يراه رائد الفضاء كل يوم على متن محطة الفضاء الدولية، وكيف ينام بانتظام؟',
    options: [
      { id: 'a', labelAr: '16 شروقاً يومياً، لذا ينام بجدول زمني صارم داخل كيس نوم مثبت بالجدار', isCorrect: true, feedbackAr: 'معلومة تحفة! المحطة بتلف حول الأرض 16 مرة في اليوم، وكيس النوم المثبت يمنعهم من الطفو!' },
      { id: 'b', labelAr: 'شروق واحد كل سنة', isCorrect: false, feedbackAr: 'المحطة تكمل دورة حول الأرض كل 90 دقيقة، يعني 16 شروق يومياً!' },
      { id: 'c', labelAr: 'لا ينام الرواد أبداً', isCorrect: false, feedbackAr: 'النوم الجيد لمدة 7-8 ساعات أساسي لتركيز الرائد وسلامة المهمة!' }
    ],
    nasaConnectionAr: 'تستخدم محطة الفضاء إضاءة LED تتغير ألوانها بين الأزرق النهاري والدافئ المسائي لضبط الساعة البيولوجية للطاقم.',
    nasaBadgeAr: 'ISS Circadian Light'
  },
  {
    id: 'hp_12',
    topic: 'health_physics',
    icon: '🧤',
    questionAr: 'كم طبقة تقريباً تحمي رائد الفضاء داخل بدلة السير الفضائي (EMU) من البرد الشديد والحرارة؟',
    options: [
      { id: 'a', labelAr: 'حوالي 14 طبقة متكاملة تشمل التبريد بالماء والعزل الحراري وصد النيازك الدقيقة', isCorrect: true, feedbackAr: 'عاش يا بطل! 14 طبقة تخلي البدلة زي مركبة فضائية صغيرة تلبسها وتحميك من +120° إلى -150°م!' },
      { id: 'b', labelAr: 'طبقة قطنية رقيقة واحدة', isCorrect: false, feedbackAr: 'الطبقة الواحدة لا تحمي من فراغ الفضاء وتقلبات حرارته القاسية!' },
      { id: 'c', labelAr: 'طبقتان من الورق المقوى', isCorrect: false, feedbackAr: 'بدلة الفضاء من أعقد الملابس الهندسية وتضم 14 طبقة متطورة!' }
    ],
    nasaConnectionAr: 'تشمل بدلة NASA 14 طبقة منها شبكات أنابيب تبريد مائي ومواد Kevlar وMylar العاكسة.',
    nasaBadgeAr: 'NASA 14-Layer Suit'
  },
  {
    id: 'hp_13',
    topic: 'health_physics',
    icon: '🛡️',
    questionAr: 'عند اقتراب عاصفة شمسية في محطة القمر، لماذا تضطر القيادة لموازنة الطاقة بين الدروع والزراعة؟',
    options: [
      { id: 'a', labelAr: 'لأن الطاقة الكهربائية محدودة في الطوارئ ويجب حماية الإنسان أولاً مع خطة دعم للنبات', isCorrect: true, feedbackAr: 'قرار قيادي حكيم! البطاريات محدودة أثناء العاصفة، وحماية الطاقم بالدروع أولوية قصوى!' },
      { id: 'b', labelAr: 'لأن الدروع تأكل النباتات الخضراء', isCorrect: false, feedbackAr: 'الموضوع توزيع طاقة كهربائية محدودة بين أنظمة الحماية والإضاءة!' },
      { id: 'c', labelAr: 'لأن الشمس تطفئ المولدات للأبد', isCorrect: false, feedbackAr: 'بعد مرور العاصفة تعود الكهرباء بشكل طبيعي في المدار والقاعدة!' }
    ],
    nasaConnectionAr: 'تتدرب مراكز تحكم ناسا على "تخفيف الأحمال" (Load Shedding) لتوجيه الكهرباء لأهم الأنظمة الحيوية وقت الطوارئ.',
    nasaBadgeAr: 'NASA Power Trade-off'
  },
  {
    id: 'hp_14',
    topic: 'health_physics',
    icon: '🪂',
    questionAr: 'ماذا يفتح قبل ملامسة كبسولة العودة لمياه المحيط لتخفيف السرعة من مئات الكيلومترات للسكون؟',
    options: [
      { id: 'a', labelAr: 'مظلات هوائية متتابعة تفتح في الهواء لتهبط الكبسولة برفق في المحيط', isCorrect: true, feedbackAr: 'ممتاز يا بطل! المظلات تفتح على مراحل لتنزل الكبسولة بسلام في المياه وتستقبلها فرق الإنقاذ!' },
      { id: 'b', labelAr: 'أجنحة طائرة ورقية ضخمة', isCorrect: false, feedbackAr: 'الكبسولات مثل Orion وDragon تعتمد على نظام مظلات عملاق موثق!' },
      { id: 'c', labelAr: 'عجلات قطار حديدية', isCorrect: false, feedbackAr: 'الهبوط فوق المحيط (Splashdown) يمتص الصدمة بنعومة باستخدام المظلات!' }
    ],
    nasaConnectionAr: 'تستخدم كبسولة Orion 11 مظلة متسلسلة لضمان سرعة هبوط آمنة تقل عن 32 كم/س عند ملامسة المحيط الهادئ.',
    nasaBadgeAr: 'Artemis Splashdown'
  }
];
