export interface QuizOption {
  id: string;
  labelEn: string;
  labelAr: string;
  isCorrect: boolean;
  feedbackEn: string;
  feedbackAr: string;
}

export interface QuizQuestion {
  id: string;
  topic: 'space' | 'nutrition' | 'health_physics';
  icon: string;
  questionEn: string;
  questionAr: string;
  correctIndex: number;
  options: QuizOption[];
  nasaConnectionEn: string;
  nasaConnectionAr: string;
  nasaBadgeEn: string;
  nasaBadgeAr: string;
}

interface RawChoiceInput {
  labelEn: string;
  labelAr: string;
  feedbackEn: string;
  feedbackAr: string;
}

interface RawQuestionInput {
  id: string;
  topic: 'space' | 'nutrition' | 'health_physics';
  icon: string;
  questionEn: string;
  questionAr: string;
  correct: RawChoiceInput;
  wrongs: [RawChoiceInput, RawChoiceInput, RawChoiceInput];
  nasaConnectionEn: string;
  nasaConnectionAr: string;
  nasaBadgeEn: string;
  nasaBadgeAr: string;
}

const OPTION_IDS = ['a', 'b', 'c', 'd'] as const;

/**
 * Places the correct answer evenly across indices 0, 1, 2, 3 (A/B/C/D and أ/ب/ج/د)
 * so no option letter dominates the static banks.
 */
function buildBalancedBank(items: readonly RawQuestionInput[], offset: number): readonly QuizQuestion[] {
  return items.map((item, idx) => {
    const targetIndex = (idx + offset) % 4;
    const rawList: Omit<QuizOption, 'id'>[] = [
      { ...item.wrongs[0], isCorrect: false },
      { ...item.wrongs[1], isCorrect: false },
      { ...item.wrongs[2], isCorrect: false }
    ];
    rawList.splice(targetIndex, 0, {
      ...item.correct,
      isCorrect: true
    });

    const options: QuizOption[] = rawList.map((opt, optIdx) => ({
      id: OPTION_IDS[optIdx],
      labelEn: opt.labelEn,
      labelAr: opt.labelAr,
      isCorrect: opt.isCorrect,
      feedbackEn: opt.feedbackEn,
      feedbackAr: opt.feedbackAr
    }));

    return {
      id: item.id,
      topic: item.topic,
      icon: item.icon,
      questionEn: item.questionEn,
      questionAr: item.questionAr,
      correctIndex: targetIndex,
      options,
      nasaConnectionEn: item.nasaConnectionEn,
      nasaConnectionAr: item.nasaConnectionAr,
      nasaBadgeEn: item.nasaBadgeEn,
      nasaBadgeAr: item.nasaBadgeAr
    };
  });
}

// 14 Space Science, Planets & Real NASA Exploration Questions
const RAW_SPACE_SCIENCE: readonly RawQuestionInput[] = [
  {
    id: 'sci_01',
    topic: 'space',
    icon: '🌙',
    questionEn: 'How strong is gravity on the Moon compared to planet Earth?',
    questionAr: 'كم تبلغ الجاذبية على سطح القمر مقارنة بكوكب الأرض؟',
    correct: {
      labelEn: 'One-sixth of Earth gravity (0.16G)',
      labelAr: 'سُدس جاذبية الأرض (0.16G)',
      feedbackEn: 'Space genius! On the Moon gravity is only 0.16G, which is why Apollo astronauts hopped so high!',
      feedbackAr: 'عبقري الفضاء! على القمر الجاذبية 0.16G بس، عشان كده رواد أبولو نطوا عالي جداً!'
    },
    wrongs: [
      {
        labelEn: 'Exactly the same as Earth gravity',
        labelAr: 'نفس جاذبية الأرض تماماً',
        feedbackEn: 'Almost! The Moon is much smaller than Earth—think about one-sixth!',
        feedbackAr: 'قربت جداً يا بطل! القمر أصغر من الأرض بكتير، فكر تاني في السُدس!'
      },
      {
        labelEn: 'Ten times stronger than Earth',
        labelAr: 'أقوى من الأرض عشر مرات',
        feedbackEn: 'Try again! Objects feel super light on the Moon, not heavy!',
        feedbackAr: 'فكر تاني يا بطل! الأجسام بتطير بخفة على القمر مش بتتقَل!'
      },
      {
        labelEn: 'Exactly double Earth gravity',
        labelAr: 'ضعف جاذبية الأرض بالضبط',
        feedbackEn: 'Nope! Lunar gravity is much weaker than Earth—about 1/6th only!',
        feedbackAr: 'لا يا بطل! جاذبية القمر أقل بكتير من الأرض، حوالي 1/6 فقط!'
      }
    ],
    nasaConnectionEn: 'NASA Artemis engineers use 1.62 m/s² gravity data to design spacesuits and rovers around Shackleton Crater.',
    nasaConnectionAr: 'يستخدم مهندسو ناسا في برنامج أرتميس قيمة 1.62 م/ث² لتصميم بدلات ومركبات تتحرك بسهولة في فوهة شاكلتون.',
    nasaBadgeEn: 'Artemis Lunar Gravity',
    nasaBadgeAr: 'جاذبية القمر أرتميس'
  },
  {
    id: 'sci_02',
    topic: 'space',
    icon: '🔴',
    questionEn: 'Why does planet Mars appear red from space?',
    questionAr: 'لماذا يظهر كوكب المريخ باللون الأحمر من الفضاء؟',
    correct: {
      labelEn: 'Its soil is rich in iron oxide (rust)',
      labelAr: 'لأن ترابه غني بأكسيد الحديد (الصدأ)',
      feedbackEn: '100% correct! Red iron-oxide dust blankets the entire Martian desert!',
      feedbackAr: 'ممتاز مية في المية! غبار الصدأ الأحمر يغطي صحراء المريخ بالكامل!'
    },
    wrongs: [
      {
        labelEn: 'Because it is covered in burning fire',
        labelAr: 'لأنه مغطى بالنار المشتعلة',
        feedbackEn: 'Think again! Mars is actually a freezing cold world, not on fire!',
        feedbackAr: 'فكر تاني يا بطل! المريخ كوكب بارد جداً مش مشتعل!'
      },
      {
        labelEn: 'Because its oceans are painted red',
        labelAr: 'لأن بحاره لونها أحمر',
        feedbackEn: 'Mars has no liquid oceans on its surface today—think of iron rust!',
        feedbackAr: 'لا يوجد بحار سائلة حالياً على سطح المريخ، فكر في الصدأ!'
      },
      {
        labelEn: 'Because astronauts painted it red',
        labelAr: 'لأن رواد الفضاء طلوه بالدهان الأحمر',
        feedbackEn: 'The color is completely natural from iron-oxide minerals in its soil!',
        feedbackAr: 'اللون طبيعي بسبب معادن أكسيد الحديد المنتشرة في تربته!'
      }
    ],
    nasaConnectionEn: 'NASA sends rovers like Perseverance to analyze iron-rich rocks and search for ancient water signs on Mars.',
    nasaConnectionAr: 'ترسل ناسا مركبات مثل Perseverance لتحليل صخور أكسيد الحديد والبحث عن آثار مياه قديمة على المريخ.',
    nasaBadgeEn: 'NASA Mars Rover',
    nasaBadgeAr: 'عربة مريخ ناسا'
  },
  {
    id: 'sci_03',
    topic: 'space',
    icon: '🌋',
    questionEn: 'What is the largest volcano in the entire Solar System, located on Mars?',
    questionAr: 'ما اسم أكبر بركان في المجموعة الشمسية كلها والموجود على المريخ؟',
    correct: {
      labelEn: 'Mount Olympus Mons',
      labelAr: 'جبل أوليمبوس مونس (Olympus Mons)',
      feedbackEn: 'Awesome! It stands nearly 22 km tall—almost three times higher than Mount Everest!',
      feedbackAr: 'أحسنت يا بطل! ارتفاعه حوالي 22 كيلومتر، يعني تلت أضعاف جبل إيفرست!'
    },
    wrongs: [
      {
        labelEn: 'Lunar Mount Tariq',
        labelAr: 'جبل طارق القمري',
        feedbackEn: 'Close try! The giant Martian volcano starts with "Olympus"!',
        feedbackAr: 'قربت جداً! اسم البركان العملاق على المريخ يبدأ بأوليمبوس!'
      },
      {
        labelEn: 'Saturn Rings Volcano',
        labelAr: 'بركان حلقات زحل',
        feedbackEn: 'Saturn is a gas giant with no rocky volcanoes! Focus on Mars!',
        feedbackAr: 'زحل كوكب غازي ملوش براكين صخرية! فكر في المريخ!'
      },
      {
        labelEn: 'Space Mount Kilimanjaro',
        labelAr: 'جبل كليمنجارو الفضائي',
        feedbackEn: 'Kilimanjaro is here on Earth in Africa—the Martian giant is Olympus Mons!',
        feedbackAr: 'كليمنجارو على الأرض في أفريقيا، أما بركان المريخ فاسمه أوليمبوس مونس!'
      }
    ],
    nasaConnectionEn: 'NASA Mars orbiters capture high-precision laser maps of Olympus Mons to study Mars history.',
    nasaConnectionAr: 'تلتقط أقمار ناسا المدارية خرائط ليزر دقيقة لقمة أوليمبوس مونس لفهم تاريخ الكوكب الأحمر.',
    nasaBadgeEn: 'NASA MRO Mars Map',
    nasaBadgeAr: 'خريطة مريخ ناسا'
  },
  {
    id: 'sci_04',
    topic: 'space',
    icon: '🪐',
    questionEn: 'What are Saturn’s breathtaking rings made of?',
    questionAr: 'مِمَّ تتكون حلقات كوكب زحل الخلابة التي نراها بالتليسكوب؟',
    correct: {
      labelEn: 'Billions of orbiting chunks of ice and rock',
      labelAr: 'مليارات قطع الجليد والصخور الدوارة',
      feedbackEn: 'Way to go! Shiny ice pieces reflect sunlight, making the rings glow like gold!',
      feedbackAr: 'عاش يا بطل! قطع التلج اللامعة بتعكس ضوء الشمس فتظهر الحلقات ذهبية مذهلة!'
    },
    wrongs: [
      {
        labelEn: 'One solid iron ring',
        labelAr: 'حلقة حديدية صلبة واحدة',
        feedbackEn: 'Not one piece! The rings are made of billions of separate icy particles!',
        feedbackAr: 'لا يا بطل! الحلقات مش قطعة واحدة، دي مليارات القطع المنفصلة!'
      },
      {
        labelEn: 'Clouds of dark black smoke',
        labelAr: 'سحب من الدخان الأسود',
        feedbackEn: 'Black smoke would not reflect bright sunlight like a mirror!',
        feedbackAr: 'فكر تاني! لو كانت دخان أسود مكانتش هتعكس نور الشمس اللامع كده!'
      },
      {
        labelEn: 'A glowing plastic ribbon',
        labelAr: 'شريط مضيء من البلاستيك',
        feedbackEn: 'Saturn’s rings are completely natural—water ice and space rock fragments!',
        feedbackAr: 'حلقات زحل طبيعية بالكامل من الجليد المائي وشظايا الصخور!'
      }
    ],
    nasaConnectionEn: 'NASA/ESA Cassini studied Saturn’s rings for 13 years and discovered icy water geysers on moon Enceladus.',
    nasaConnectionAr: 'درست مركبة كاسيني التابعة لناسا ووكالة الفضاء الأوروبية حلقات زحل لمدة 13 عاماً واكتشفت ينابيع جليد على قمره إنسيلادوس.',
    nasaBadgeEn: 'NASA Cassini',
    nasaBadgeAr: 'مهمة كاسيني'
  },
  {
    id: 'sci_05',
    topic: 'space',
    icon: '🌀',
    questionEn: 'If you weigh 30 kg on Earth, what happens to your weight near Jupiter (2.53G)?',
    questionAr: 'إذا كان وزنك 30 كجم على الأرض، ماذا يحدث لوزنك لو وقفت قرب المشتري (2.53G)؟',
    correct: {
      labelEn: 'You feel much heavier (about 76 kg)',
      labelAr: 'يصبح أثقل جداً (حوالي 76 كجم)',
      feedbackEn: 'Space math whiz! Jupiter’s massive gravity pulls down 2.5 times harder!',
      feedbackAr: 'عبقري رياضيات الفضاء! جاذبية المشتري الهائلة بتشدك للأسفل بضعفين ونص!'
    },
    wrongs: [
      {
        labelEn: 'You float like a feather weighing 2 kg',
        labelAr: 'تطير مثل الريشة بوزن 2 كجم',
        feedbackEn: 'Opposite! Jupiter is the biggest planet and has super strong gravity!',
        feedbackAr: 'العكس يا بطل! المشتري أكبر كوكب وجاذبيته شديدة جداً!'
      },
      {
        labelEn: 'Your weight stays exactly 30 kg',
        labelAr: 'يبقى 30 كجم بالضبط',
        feedbackEn: 'Your mass stays the same, but your weight changes with each planet’s gravity!',
        feedbackAr: 'الكتلة ثابتة لكن الوزن يتغير حسب جاذبية كل كوكب!'
      },
      {
        labelEn: 'Your weight becomes zero',
        labelAr: 'يصبح وزنك صفراً تماماً',
        feedbackEn: 'Zero weight only happens in free-fall microgravity—Jupiter’s pull is huge!',
        feedbackAr: 'الصفر يحصل فقط في انعدام الوزن، أما المشتري فجاذبيته عملاقة!'
      }
    ],
    nasaConnectionEn: 'NASA’s Juno mission orbits Jupiter to measure its intense gravitational field and deep interior.',
    nasaConnectionAr: 'تدرس مهمة Juno التابعة لناسا حقل الجاذبية الضخم للمشتري لفهم نواة الكوكب العملاق.',
    nasaBadgeEn: 'NASA Juno Mission',
    nasaBadgeAr: 'مهمة جونو ناسا'
  },
  {
    id: 'sci_06',
    topic: 'space',
    icon: '☄️',
    questionEn: 'According to live NASA radar for asteroid 2010 PK (3542519), is it a danger to Earth?',
    questionAr: 'وفق بيانات رادار ناسا الحي لكويكب 2010 PK (3542519)، هل يمثل خطراً على الأرض؟',
    correct: {
      labelEn: 'No, it passes safely over 19 lunar distances away',
      labelAr: 'لا، يمر بأمان على بعد يزيد عن 19 ضعف مسافة القمر',
      feedbackEn: 'Great NASA tracker! NeoWs radar confirms its trajectory is completely safe!',
      feedbackAr: 'ممتاز يا عالم ناسا! رادار NeoWs بيأكد إن مساره آمن ومش هيقرب من الأرض!'
    },
    wrongs: [
      {
        labelEn: 'Yes, it lands in the ocean tomorrow',
        labelAr: 'نعم، سيهبط في المحيط غداً',
        feedbackEn: 'Don’t worry! NeoWs confirms it stays over 19 Moon-distances away!',
        feedbackAr: 'اطمن يا بطل! بيانات NeoWs بتأكد إن الكويكب بعيد جداً بـ 19 مسافة قمرية!'
      },
      {
        labelEn: 'It stops completely and sits still',
        labelAr: 'يتوقف في مكانه ولا يتحرك',
        feedbackEn: 'Asteroids race around the Sun at speeds near 15 km/s!',
        feedbackAr: 'الكويكبات بتجري بسرعة تقارب 15 كم/ث في مدارات حول الشمس!'
      },
      {
        labelEn: 'It orbits the Moon like a second moon',
        labelAr: 'يدور حول القمر مثل قمر ثانٍ',
        feedbackEn: 'It follows its own solar orbit and glides safely past Earth-Moon space!',
        feedbackAr: 'هو في مدار شمسي ويمر بعيداً عن نظام الأرض والقمر بأمان!'
      }
    ],
    nasaConnectionEn: 'NASA’s Planetary Defense team (NeoWs) monitors thousands of asteroids daily by diameter, speed, and flyby distance.',
    nasaConnectionAr: 'يراقب مكتب الدفاع الكوكبي في ناسا (NeoWs) آلاف الكويكبات يومياً بحساب قطرها وسرعتها ومسافة مرورها.',
    nasaBadgeEn: 'NASA NeoWs Radar',
    nasaBadgeAr: 'رادار الكويكبات ناسا'
  },
  {
    id: 'sci_07',
    topic: 'space',
    icon: '🌍',
    questionEn: 'What makes Earth uniquely suited for life compared to other planets?',
    questionAr: 'ما الذي يجعل كوكب الأرض مميزاً ومناسباً للحياة مقارنة بباقي الكواكب؟',
    correct: {
      labelEn: 'Liquid water, an oxygen-rich atmosphere, and mild temperatures',
      labelAr: 'وجود ماء سائل وغلاف جوي غني بالأكسجين وحرارة معتدلة',
      feedbackEn: 'Bravo! Liquid water and our protective atmosphere make our blue planet bloom!',
      feedbackAr: 'برافو عليك! الغلاف الجوي والماء السائل هما سر الحياة على كوكبنا الأزرق!'
    },
    wrongs: [
      {
        labelEn: 'Because it is the largest planet',
        labelAr: 'لأنه أكبر كوكب في المجموعة الشمسية',
        feedbackEn: 'Jupiter and Saturn are way bigger—think about water and breathable air!',
        feedbackAr: 'المشتري وزحل أكبر بكتير من الأرض، فكر في الماء والهواء!'
      },
      {
        labelEn: 'Because it is closest to the Sun',
        labelAr: 'لأنه الأقرب للشمس',
        feedbackEn: 'Mercury and Venus are closer and scorchingly hot!',
        feedbackAr: 'عطارد والزهرة أقرب للشمس ودرجة حرارتهما حارقة جداً!'
      },
      {
        labelEn: 'Because it never orbits the Sun',
        labelAr: 'لأنه لا يدور حول الشمس أبداً',
        feedbackEn: 'Earth constantly orbits the Sun in the gentle habitable zone!',
        feedbackAr: 'الأرض تدور حول الشمس باستمرار في مدار معتدل داعم للحياة!'
      }
    ],
    nasaConnectionEn: 'NASA’s Blue Marble satellites image our oceans and atmosphere every day to protect Earth’s climate.',
    nasaConnectionAr: 'تلتقط أقمار ناسا ضمن مشروع Blue Marble صوراً يومية للغلاف الجوي والمحيطات لحماية مناخ الأرض.',
    nasaBadgeEn: 'NASA Earth Observatory',
    nasaBadgeAr: 'مرصد الأرض ناسا'
  },
  {
    id: 'sci_08',
    topic: 'space',
    icon: '☀️',
    questionEn: 'What are solar storms (CMEs) tracked by NASA’s DONKI system?',
    questionAr: 'ما هي العواصف الشمسية (CME) التي يرصدها نظام ناسا DONKI؟',
    correct: {
      labelEn: 'Bursts of charged particles and energy launched from the Sun',
      labelAr: 'انفجارات من الجسيمات المشحونة والطاقة المنطلقة من الشمس',
      feedbackEn: 'Spot on! That is why Moon bases watch DONKI radar and activate shields!',
      feedbackAr: 'ممتاز! عشان كده محطة القمر بتراقب رادار DONKI وتشغل الدروع في وقت العاصفة!'
    },
    wrongs: [
      {
        labelEn: 'Heavy rainstorms falling on the Moon',
        labelAr: 'أمطار غزيرة تتساقط على القمر',
        feedbackEn: 'No rain falls on the Moon! Solar storms come from the Sun’s radiation!',
        feedbackAr: 'مفيش أمطار على القمر! العاصفة الشمسية بتيجي من إشعاع الشمس!'
      },
      {
        labelEn: 'Cold winds blowing out of Mars',
        labelAr: 'رياح باردة تخرج من المريخ',
        feedbackEn: 'They are called solar storms because they erupt straight from the Sun!',
        feedbackAr: 'اسمها شمسية لأنها بتخرج من الشمس نفسها!'
      },
      {
        labelEn: 'Dust clouds from lunar deserts',
        labelAr: 'سحب غبار من صحراء القمر',
        feedbackEn: 'Solar storms travel across space from eruptions on the Sun!',
        feedbackAr: 'العواصف الشمسية تأتي من نشاط الشمس وتصل للفضاء المحيط بالأرض والقمر!'
      }
    ],
    nasaConnectionEn: 'NASA DONKI warns crews before solar particles arrive so astronauts can take cover inside shielded shelters.',
    nasaConnectionAr: 'يحذر نظام NASA DONKI رواد الفضاء قبل وصول الجسيمات الشمسية حتى يختبئوا في ملاجئ محمية.',
    nasaBadgeEn: 'NASA DONKI Forecast',
    nasaBadgeAr: 'توقعات شمس ناسا'
  },
  {
    id: 'sci_09',
    topic: 'space',
    icon: '🔇',
    questionEn: 'If you shout loudly in open space without a radio helmet, can your teammate hear you?',
    questionAr: 'لو صرخت بصوت عالٍ في الفضاء المفتوح بدون خوذة اتصال، هل سيسمعك زميلك؟',
    correct: {
      labelEn: 'No—sound waves need air to travel, and space is a vacuum',
      labelAr: 'لا، لأن الصوت يحتاج للهواء لكي ينتقل والفضاء فراغ',
      feedbackEn: '100% right! Astronauts speak using built-in radio headsets inside their helmets!',
      feedbackAr: 'صح مية في المية! رواد الفضاء بيتكلموا عبر الراديو جوه الخوذة!'
    },
    wrongs: [
      {
        labelEn: 'Yes, it sounds ten times louder',
        labelAr: 'نعم، سيكون الصوت أعلى عشر مرات',
        feedbackEn: 'Think again! There is no air in outer space to carry sound waves!',
        feedbackAr: 'فكر تاني! الفضاء مفيهوش هواء ينقل موجات الصوت!'
      },
      {
        labelEn: 'Yes, because stars carry voices',
        labelAr: 'نعم، لأن النجوم تنقل الكلام',
        feedbackEn: 'Stars are far away and sound cannot cross an empty vacuum!',
        feedbackAr: 'النجوم بعيدة جداً وموجات الصوت لا تسافر في الفراغ!'
      },
      {
        labelEn: 'Only during a full Moon',
        labelAr: 'فقط عندما يكون القمر بدراً',
        feedbackEn: 'Moonlight does not fill space with air—radios are always required!',
        feedbackAr: 'شكل القمر لا يملأ الفراغ بالهواء؛ التواصل يحتاج لموجات الراديو!'
      }
    ],
    nasaConnectionEn: 'Every NASA EVA helmet includes dual microphones and earpieces wired to radio transceivers.',
    nasaConnectionAr: 'تحتوي كل خوذة فضاء في ناسا على ميكروفون وسماعات متصلة بالراديو للتواصل الواضح في الفراغ.',
    nasaBadgeEn: 'NASA EMU Comms',
    nasaBadgeAr: 'اتصالات بدلة ناسا'
  },
  {
    id: 'sci_10',
    topic: 'space',
    icon: '🔭',
    questionEn: 'How do NASA APOD images and space telescopes like James Webb and Hubble help us?',
    questionAr: 'كيف تساعدنا صور ناسا اليومية (APOD) وتليسكوبات جيمس ويب وهابل؟',
    correct: {
      labelEn: 'They observe distant galaxies and reveal how stars and planets form',
      labelAr: 'ترصد المجرات البعيدة وتكشف ولادة النجوم والكواكب',
      feedbackEn: 'Amazing! Above Earth’s atmosphere, space telescopes see the universe crystal clear!',
      feedbackAr: 'رائع! التليسكوبات الفضائية بتشوف أعماق الكون بوضوح خيالي فوق الغلاف الجوي!'
    },
    wrongs: [
      {
        labelEn: 'Only for photographing city streets on Earth',
        labelAr: 'تستخدم فقط لتصوير الشوارع على الأرض',
        feedbackEn: 'Space telescopes point outward at deep galaxies, nebulae, and stars!',
        feedbackAr: 'تليسكوبات الفضاء موجهة نحو السماء والمجرات البعيدة!'
      },
      {
        labelEn: 'They stop planets from rotating',
        labelAr: 'توقف دوران الكواكب',
        feedbackEn: 'Telescopes only collect starlight—they never touch or stop planets!',
        feedbackAr: 'التليسكوبات تراقب وتصور فقط ولا توقف الكواكب!'
      },
      {
        labelEn: 'They pump air to distant worlds',
        labelAr: 'تضخ الهواء للكواكب البعيدة',
        feedbackEn: 'Their mission is capturing light and infrared signals to analyze deep space!',
        feedbackAr: 'وظيفتها التقاط الضوء والأشعة لتحليل السدم والمجرات والنجوم!'
      }
    ],
    nasaConnectionEn: 'NASA publishes a daily astronomy photo via APOD explaining nebulae and galaxies for students everywhere.',
    nasaConnectionAr: 'تنشر ناسا يومياً صورة فلكية موثقة عبر واجهة APOD لشرح أسرار السدم والنجوم للطلاب والعلماء.',
    nasaBadgeEn: 'NASA APOD Explorer',
    nasaBadgeAr: 'مرصد ناسا اليومي'
  },
  {
    id: 'sci_11',
    topic: 'space',
    icon: '🧊',
    questionEn: 'Why did NASA choose Shackleton Crater at the Moon’s South Pole for Artemis?',
    questionAr: 'لماذا اختارت ناسا فوهة شاكلتون في القطب الجنوبي للقمر لبناء قاعدة أرتميس؟',
    correct: {
      labelEn: 'Its shadowed floor holds water ice while crater rims catch long sunlight',
      labelAr: 'لأن قاعها المظلم يحتوي على جليد مائي وقممها ترى الشمس طويلاً',
      feedbackEn: 'Incredible! Water ice provides drinking water, oxygen & fuel while sunlit peaks give power!',
      feedbackAr: 'مذهل! الجليد يدينا مية شرب وأكسجين ووقود، والشمس تدينا كهرباء مستمرة!'
    },
    wrongs: [
      {
        labelEn: 'Because natural forests and trees grow there',
        labelAr: 'لأن فيها غابات وأشجار طبيعية',
        feedbackEn: 'There are no natural trees on the Moon—just precious polar water ice!',
        feedbackAr: 'القمر مفهوش أشجار، لكن فيه جليد مائي نفيس جداً في الفوهات القطبية!'
      },
      {
        labelEn: 'Because it touches planet Mars',
        labelAr: 'لأنها أقرب نقطة للمريخ',
        feedbackEn: 'The real treasure is polar water ice right next to sunlit solar ridges!',
        feedbackAr: 'السبب الحقيقي هو الجليد المائي وأشعة الشمس الدائمة على الحواف!'
      },
      {
        labelEn: 'Because it has warm lakes for swimming',
        labelAr: 'لوجود بحيرات دافئة للسباحة فيها',
        feedbackEn: 'Lunar polar craters are freezing cold—frozen ice must be harvested and melted!',
        feedbackAr: 'القمر متجمد في القطب الجنوبي، والموجود هو جليد مائي يحتاج استخلاصاً علمياً!'
      }
    ],
    nasaConnectionEn: 'Artemis missions aim to harvest South Pole ice for drinking water, oxygen, and rocket propellant.',
    nasaConnectionAr: 'ترسل ناسا مهمات Artemis للقطب الجنوبي لاستخراج جليد المياه وتحويله لأكسجين ووقود صواريخ.',
    nasaBadgeEn: 'Artemis Shackleton',
    nasaBadgeAr: 'أرتميس فوهة شاكلتون'
  },
  {
    id: 'sci_12',
    topic: 'space',
    icon: '🛸',
    questionEn: 'Why do astronauts float inside the International Space Station?',
    questionAr: 'لماذا يطفو رواد الفضاء داخل محطة الفضاء الدولية وكأنهم يسبحون في الهواء؟',
    correct: {
      labelEn: 'The station is in continuous free-fall orbiting Earth (microgravity)',
      labelAr: 'لأن المحطة في حالة سقوط حر مستمر حول الأرض (انعدام وزن)',
      feedbackEn: 'Orbital physics pro! Speeding around Earth at 28,000 km/h creates weightless free-fall!',
      feedbackAr: 'عبقري فيزياء الفضاء! المحطة تدور بسرعة 28 ألف كم/س فتعيش في جاذبية صغرى!'
    },
    wrongs: [
      {
        labelEn: 'The station is filled with invisible water',
        labelAr: 'لأن المحطة مملوءة بمياه غير مرئية',
        feedbackEn: 'Astronauts breathe clean air inside! Free-fall orbit makes them float!',
        feedbackAr: 'المحطة مملوءة بالهواء للتنفس، السر في السقوط الحر أثناء الدوران!'
      },
      {
        labelEn: 'Their boots hide tiny propellers',
        labelAr: 'لأن أحذيتهم فيها مراوح خفية',
        feedbackEn: 'No propellers needed! Microgravity lets every unstrapped object float!',
        feedbackAr: 'مفيش مراوح! الجاذبية الصغرى تجعل كل جسم حر يطفو!'
      },
      {
        labelEn: 'Earth has zero gravity up there',
        labelAr: 'لأن الأرض فقدت جاذبيتها تماماً',
        feedbackEn: 'Earth’s gravity still bends the ISS into an orbit—it’s the continuous free-fall that feels 0G!',
        feedbackAr: 'جاذبية الأرض لا تزال تشد المحطة في مسار دائري أثناء سقوطها الحر حول الأرض!'
      }
    ],
    nasaConnectionEn: 'NASA researchers on the ISS study how 0G microgravity affects fluids, plants, and human muscles.',
    nasaConnectionAr: 'يدرس علماء ناسا في محطة الفضاء ISS تأثير الجاذبية الصغرى 0G على السوائل والنباتات وجسم الإنسان.',
    nasaBadgeEn: 'ISS Microgravity Lab',
    nasaBadgeAr: 'مختبر الجاذبية الصغرى'
  },
  {
    id: 'sci_13',
    topic: 'space',
    icon: '🔥',
    questionEn: 'Why does the front of a spacecraft heat up intensely when re-entering Earth’s atmosphere?',
    questionAr: 'لماذا تحترق مقدمة كبسولة الفضاء بدرجة حرارة عالية جداً عند العودة للأرض؟',
    correct: {
      labelEn: 'Extreme atmospheric compression & friction at hypersonic speed',
      labelAr: 'بسبب الاحتكاك الشديد مع الهواء عند الدخول بسرعة فائقة',
      feedbackEn: 'Well done! That is why the heat shield and 20°–24° corridor keep astronauts safe!',
      feedbackAr: 'أحسنت! عشان كده الدرع الحراري وزاوية 20°-24° يحميان رواد الفضاء بأمان!'
    },
    wrongs: [
      {
        labelEn: 'Because the Sun touches the capsule directly',
        labelAr: 'لأن الشمس تلامس الكبسولة مباشرة',
        feedbackEn: 'The intense plasma heat comes from slamming into Earth’s air molecules!',
        feedbackAr: 'السبب هو ضغط واحتكاك جزيئات الغلاف الجوي للأرض!'
      },
      {
        labelEn: 'Because astronauts light a big heater',
        labelAr: 'لأن الرواد يشعلون مدفأة كبيرة',
        feedbackEn: 'It comes from fast atmospheric friction outside the heat shield!',
        feedbackAr: 'الحرارة تأتي من احتكاك الغلاف الجوي السريع!'
      },
      {
        labelEn: 'Because parachutes are made of fire',
        labelAr: 'لأن المظلات مصنوعة من النار',
        feedbackEn: 'Air compression heats the bottom heat shield long before parachutes deploy!',
        feedbackAr: 'الحرارة ناتجة عن ضغط الهواء واحتكاكه بالدرع الحراري قبل فتح المظلات!'
      }
    ],
    nasaConnectionEn: 'Artemis Orion carries NASA’s largest Avcoat heat shield to withstand ~2,760°C during splashdown entry.',
    nasaConnectionAr: 'تستخدم كبسولة Orion في برنامج أرتميس أكبر درع حراري مصنوع من مادة Avcoat لتحمل ~2760°م أثناء العودة.',
    nasaBadgeEn: 'Orion Heat Shield',
    nasaBadgeAr: 'الدرع الحراري أوريون'
  },
  {
    id: 'sci_14',
    topic: 'space',
    icon: '🌑',
    questionEn: 'Roughly how many days does Earth take to make one complete orbit around the Sun?',
    questionAr: 'كم يوماً تقريباً تستغرق الأرض لتدور دورة كاملة واحدة حول الشمس؟',
    correct: {
      labelEn: 'About 365 days (one Earth year)',
      labelAr: 'حوالي 365 يوماً (سنة أرضية واحدة)',
      feedbackEn: 'Awesome! Earth completes one solar orbit every year while its tilt creates the seasons!',
      feedbackAr: 'ممتاز! الأرض بتكمل رحلتها حوالين الشمس كل سنة، وبسبب ميلها بتحصل الفصول الأربعة!'
    },
    wrongs: [
      {
        labelEn: 'Only 24 hours',
        labelAr: '24 ساعة فقط',
        feedbackEn: '24 hours is Earth’s spin around itself (day & night), not its trip around the Sun!',
        feedbackAr: '24 ساعة هي دوران الأرض حوالين نفسها، مش حوالين الشمس!'
      },
      {
        labelEn: 'About 30 days',
        labelAr: '30 يوماً',
        feedbackEn: 'Around 30 days is the Moon’s orbit around Earth!',
        feedbackAr: 'حوالي 30 يوماً هي رحلة القمر حوالين الأرض!'
      },
      {
        labelEn: 'Just two weeks (14 days)',
        labelAr: 'أسبوعان فقط (14 يوماً)',
        feedbackEn: 'Far too short! Earth’s full trip around the Sun takes a whole year!',
        feedbackAr: 'أسبوعان وقت قصير جداً! رحلة الأرض الكاملة حول الشمس تستغرق عاماً كاملاً.'
      }
    ],
    nasaConnectionEn: 'NASA orbital engineers track planetary positions to the second to time launch windows to the Moon and Mars.',
    nasaConnectionAr: 'تحسب فرق ناسا مسار الكواكب بدقة بالثواني لتحديد أفضل موعد "نافذة إطلاق" نحو القمر والمريخ.',
    nasaBadgeEn: 'NASA Orbital Mechanics',
    nasaBadgeAr: 'ميكانيكا مدارات ناسا'
  }
];

// 14 Space Nutrition Questions (Based strictly on foodItems.ts & NASA Food Systems)
const RAW_NUTRITION_QUIZ: readonly RawQuestionInput[] = [
  {
    id: 'nut_01',
    topic: 'nutrition',
    icon: '🍯',
    questionEn: 'Why do astronauts prefer sealed Sinai Honey tubes and dense bite-cubes over fluffy bread?',
    questionAr: 'لماذا يفضل رواد الفضاء عبوات العسل السيناوي والمكعبات المتماسكة بدلاً من الخبز العادي المنفوش؟',
    correct: {
      labelEn: 'They stay sealed and leave zero crumbs floating into eyes or air filters',
      labelAr: 'لأنها محكمة الغلق ولا تترك فتاتاً يطير في الهواء ويدخل الفلاتر',
      feedbackEn: 'Bravo! Sealed pouches and Sinai Honey keep astronauts energized and equipment safe!',
      feedbackAr: 'برافو! العبوات اللينة المحكمة والعسل السيناوي أبطال الفضاء لأنهم بدون فتات ويحفظوا الأجهزة!'
    },
    wrongs: [
      {
        labelEn: 'Because honey tubes glow in the dark',
        labelAr: 'لأن لونها يضيء في الظلام',
        feedbackEn: 'Nope—their superpower is being airtight and completely crumb-free in 0G!',
        feedbackAr: 'لا، السر الحقيقي هو إنها محكمة الغلق وخالية من الفتات في انعدام الجاذبية!'
      },
      {
        labelEn: 'Because they are heavy like solid iron',
        labelAr: 'لأنها ثقيلة مثل الحديد',
        feedbackEn: 'Actually, space pouches are lightweight and compact for launch!',
        feedbackAr: 'بالعكس! العبوات السيناوية والعسل مضغوطة وخفيفة للشحن!'
      },
      {
        labelEn: 'Because they turn into plastic toys',
        labelAr: 'لأنها تتحول إلى ألعاب بلاستيكية',
        feedbackEn: 'They are pure, nutritious food sealed to prevent stray crumbs!',
        feedbackAr: 'الهدف هو تغذية نقية وآمنة لا تنتج أي فتات متطاير!'
      }
    ],
    nasaConnectionEn: 'NASA has relied on sealed pouches and crumb-free food bites since Apollo and ISS missions.',
    nasaConnectionAr: 'تعتمد ناسا العبوات المحكمة والأطعمة غير المتفتتة منذ بعثات أبولو والمحطة الدولية.',
    nasaBadgeEn: 'NASA No-Crumbs Rule',
    nasaBadgeAr: 'قاعدة منع الفتات'
  },
  {
    id: 'nut_02',
    topic: 'nutrition',
    icon: '🍪',
    questionEn: 'What is the real danger of opening crispy crackers or potato chips in zero gravity?',
    questionAr: 'ما الخطر الحقيقي لو فتح رائد فضاء كيس بسكويت مقرمش وشيبس في انعدام الجاذبية؟',
    correct: {
      labelEn: 'Crumbs never fall down—they float into eyes and clog oxygen filters',
      labelAr: 'الفتات لا يسقط للأرض بل يطفو ويدخل العيون وفلاتر الأكسجين',
      feedbackEn: 'Exactly! Floating crumbs in 0G drift everywhere and can choke cabin ventilation fans!',
      feedbackAr: 'صحيح تماماً! ذرات الفتات في 0G بتسبح في الهوا وممكن تسد مراوح التهوية!'
    },
    wrongs: [
      {
        labelEn: 'Chips instantly melt into liquid water',
        labelAr: 'يتحول فوراً إلى ماء سائل',
        feedbackEn: 'Crumbs don’t melt—they shatter into floating dust and sharp flakes!',
        feedbackAr: 'لا يتحول لماء، المشكلة إنه يتكسر لشظايا وفتات طائر!'
      },
      {
        labelEn: 'Crumbs fall fast under the kitchen table',
        labelAr: 'يسقط بسرعة أكبر تحت الطاولة',
        feedbackEn: 'In microgravity there is no "down"—crumbs stay hovering mid-air!',
        feedbackAr: 'في انعدام الجاذبية مفيش "تحت"! الفتات يفضل طاير!'
      },
      {
        labelEn: 'They vanish automatically into outer space',
        labelAr: 'يختفي في الفضاء الخارجي تلقائياً',
        feedbackEn: 'Crumbs stay trapped inside the cabin where crew breathe and work!',
        feedbackAr: 'الفتات يظل محبوساً داخل الكابينة ويهدد العينين وأجهزة التنقية!'
      }
    ],
    nasaConnectionEn: 'NASA bans flaky snacks or seals bite-sized snacks with edible coatings to protect life-support hardware.',
    nasaConnectionAr: 'تمنع ناسا الأطعمة المتفتتة أو تغلفها بطبقة جيلاتين خاصة لحماية أجهزة التنفس والملاحة.',
    nasaBadgeEn: 'ISS Cabin Safety',
    nasaBadgeAr: 'سلامة هواء المحطة'
  },
  {
    id: 'nut_03',
    topic: 'nutrition',
    icon: '🌶️',
    questionEn: 'Why do astronauts love hot sauce tubes and bold spices in orbit?',
    questionAr: 'لماذا يحب رواد الفضاء أنبوب الصلصة الحارة والتوابل القوية في الفضاء؟',
    correct: {
      labelEn: 'Fluids shift upward toward the head in 0G, dulling taste and smell',
      labelAr: 'لأن السوائل ترتفع للرأس في 0G وتُضعف حاسة التذوق والشم',
      feedbackEn: 'Awesome! Space stuffiness makes food taste mild, so zesty spices wake up flavor!',
      feedbackAr: 'مذهل! احتقان الأنف الفضائي يخلّي طعم الأكل خفيف، والصلصة الحارة بتعيد النكهة!'
    },
    wrongs: [
      {
        labelEn: 'To heat up the outside of the rocket',
        labelAr: 'لتدفئة الصاروخ من الخارج',
        feedbackEn: 'Hot sauce is strictly for tasty meals, not rocket engines!',
        feedbackAr: 'الصلصة للأكل فقط لتقوية طعم الوجبة!'
      },
      {
        labelEn: 'Because spicy food makes astronauts fly faster',
        labelAr: 'لأنها تجعل الرائد يطير أسرع',
        feedbackEn: 'The real reason is dulled taste buds caused by orbital fluid shift!',
        feedbackAr: 'السر هو تغير حاسة التذوق بسبب ارتفاع السوائل للرأس!'
      },
      {
        labelEn: 'To paint cabin windows red',
        labelAr: 'لتلوين النوافذ باللون الأحمر',
        feedbackEn: 'They are natural flavor boosters that counteract orbital sinus congestion!',
        feedbackAr: 'هي منكهات غذائية طبيعية تعوض ضعف التذوق في المدار!'
      }
    ],
    nasaConnectionEn: 'NASA food labs report hot sauces, horseradish, and mustard are top crew requests on the ISS.',
    nasaConnectionAr: 'تؤكد مختبرات ناسا أن الصلصات الحارة والخردل من أكثر الإضافات طلباً في قائمة طعام ISS.',
    nasaBadgeEn: 'NASA Fluid Shift',
    nasaBadgeAr: 'تغير التذوق في المدار'
  },
  {
    id: 'nut_04',
    topic: 'nutrition',
    icon: '🍗',
    questionEn: 'Why are protein-rich meals like Teriyaki Chicken vital for astronauts?',
    questionAr: 'ما أهمية الوجبات الغنية بالبروتين مثل دجاج الترياكي لرواد الفضاء؟',
    correct: {
      labelEn: 'They build muscles and protect against muscle loss in microgravity',
      labelAr: 'تبني العضلات وتحميها من الضعف في الجاذبية الصغرى',
      feedbackEn: 'Way to go! Protein paired with daily workouts fights muscle atrophy in space!',
      feedbackAr: 'عاش يا بطل! البروتين مع التمارين بيمنع ضمور العضلات لما نعيش في الفضاء!'
    },
    wrongs: [
      {
        labelEn: 'They make the spacesuit grow taller',
        labelAr: 'تجعل بدلة الفضاء أطول',
        feedbackEn: 'Protein feeds human muscles inside your body, not the suit fabric!',
        feedbackAr: 'البروتين يغذي عضلات الجسم نفسها مش البدلة!'
      },
      {
        labelEn: 'They replace oxygen for breathing',
        labelAr: 'تحل محل الأكسجين للتنفس',
        feedbackEn: 'Lungs need oxygen, while muscles need protein and strength exercise!',
        feedbackAr: 'الرئة تتنفس الأكسجين، أما العضلات فتحتاج البروتين!'
      },
      {
        labelEn: 'They power the rocket booster instead of fuel',
        labelAr: 'تشغل محرك الصاروخ بدلاً من الوقود',
        feedbackEn: 'Rocket fuel powers engines; dietary protein powers your muscles!',
        feedbackAr: 'وقود الصاروخ يختلف تماماً عن البروتين الغذائي للعضلات!'
      }
    ],
    nasaConnectionEn: 'NASA JSC nutrition standards balance daily protein and carbs to maintain crew lean muscle mass.',
    nasaConnectionAr: 'تفرض معايير NASA JSC موازنة البروتين والكربوهيدرات يومياً لدعم الكتلة العضلية للطاقم.',
    nasaBadgeEn: 'NASA Muscle Nutrition',
    nasaBadgeAr: 'تغذية عضلات ناسا'
  },
  {
    id: 'nut_05',
    topic: 'nutrition',
    icon: '🍓',
    questionEn: 'What is the smart benefit of freeze-drying strawberries and fruits before launch?',
    questionAr: 'ما الفائدة الذكية من تجفيف الفراولة والفواكه بالتجميد (Freeze-Drying) قبل الإطلاق؟',
    correct: {
      labelEn: 'Cuts launch weight while keeping over 97% of vitamins without spoiling',
      labelAr: 'يقلل الوزن للشحن ويحفظ أكثر من 97% من الفيتامينات دون تلف',
      feedbackEn: 'Awesome! Removing water cuts rocket weight and keeps fruit fresh for months with no fridge!',
      feedbackAr: 'رائع! سحب المياه يقلل وزن الصاروخ ويحفظ الفواكه شهور طويلة بدون ثلاجة!'
    },
    wrongs: [
      {
        labelEn: 'Makes the fruit ten times heavier',
        labelAr: 'يجعل الفاكهة تتضاعف في الوزن عشر مرات',
        feedbackEn: 'Just the opposite! Removing water makes meals super light for launch!',
        feedbackAr: 'العكس! إزالة الماء تجعل الوجبة خفيفة جداً وسهلة الشحن!'
      },
      {
        labelEn: 'Destroys all helpful vitamins',
        labelAr: 'يزيل كل الفيتامينات المفيدة',
        feedbackEn: 'Freeze-drying actually locks in almost all natural vitamins!',
        feedbackAr: 'التجفيف بالتجميد يحفظ تقريباً كل الفيتامينات الطبيعية!'
      },
      {
        labelEn: 'Turns fruit into inedible solid metal',
        labelAr: 'يحول الفاكهة إلى معدن قاسٍ لا يُؤكل',
        feedbackEn: 'Freeze-dried fruit is crispy and delicious—or softens fast when rehydrated!',
        feedbackAr: 'تظل لذيذة ومقرمشة أو تعود طرية بإضافة قليل من الماء!'
      }
    ],
    nasaConnectionEn: 'Every kilogram launched to space costs thousands of dollars, so food is dehydrated and rehydrated on orbit.',
    nasaConnectionAr: 'كل كيلوجرام يُحمل للفضاء يكلف آلاف الدولارات، لذا يُسحب الماء من الأكل ويُضاف ماء معاد تدويره في المدار.',
    nasaBadgeEn: 'NASA Freeze-Dry Tech',
    nasaBadgeAr: 'تقنية التجفيف ناسا'
  },
  {
    id: 'nut_06',
    topic: 'nutrition',
    icon: '🧂',
    questionEn: 'Why does NASA strictly limit super salty foods (high sodium) like salty chips?',
    questionAr: 'لماذا تمنع ناسا الأطعمة شديدة الملوحة (الصوديوم العالي) مثل الرقائق المالحة؟',
    correct: {
      labelEn: 'Extra salt pulls calcium out of bones and speeds up bone loss in space',
      labelAr: 'لأن الملح الزائد يسحب الكالسيوم من العظام ويسرع هشاشتها في الفضاء',
      feedbackEn: 'True scientist answer! Bones already lose calcium in 0G, and extra sodium worsens it!',
      feedbackAr: 'إجابة عالم حقيقي! العظام في انعدام الجاذبية بتفقد كالسيوم، والملح الكتير يزود الخطر!'
    },
    wrongs: [
      {
        labelEn: 'Because salt changes the color of the stars',
        labelAr: 'لأن الملح يغير لون النجوم',
        feedbackEn: 'No—it’s a real medical risk for astronauts’ bone strength!',
        feedbackAr: 'الخطر صحي تماماً على عظام رائد الفضاء!'
      },
      {
        labelEn: 'Because salt makes the spacesuit float outside',
        labelAr: 'لأنه يجعل البدلة تطير للخارج',
        feedbackEn: 'The issue is sodium causing calcium loss from bones!',
        feedbackAr: 'المشكلة في تأثير الصوديوم على الكالسيوم والعظام!'
      },
      {
        labelEn: 'Because salt melts capsule glass windows',
        labelAr: 'لأن الملح يذيب زجاج الكبسولة',
        feedbackEn: 'Too much sodium affects human calcium and bones, not spacecraft glass!',
        feedbackAr: 'الملح الزائد يؤثر على جسم الإنسان وصحة العظام لا على الزجاج!'
      }
    ],
    nasaConnectionEn: 'NASA nutritionists cut sodium levels across ISS menus specifically to protect bone mineral density.',
    nasaConnectionAr: 'قلص أطباء التغذية في ناسا كمية الصوديوم في وجبات محطة الفضاء لحماية كثافة عظام الرواد.',
    nasaBadgeEn: 'NASA Bone Protection',
    nasaBadgeAr: 'حماية عظام رواد ناسا'
  },
  {
    id: 'nut_07',
    topic: 'nutrition',
    icon: '🥤',
    questionEn: 'How do astronauts drink juice or water in zero gravity without spilling blobs everywhere?',
    questionAr: 'كيف يشرب رائد الفضاء العصير أو الماء في انعدام الجاذبية بدون أن ينسكب في الغرفة؟',
    correct: {
      labelEn: 'From sealed drink pouches fitted with straws and leak-proof valves',
      labelAr: 'من أكياس مغلقة مزودة بماصة وصمام منع التسرب',
      feedbackEn: 'Spot on! From an open cup, water floats into giant spheres right toward electronics!',
      feedbackAr: 'صح يا بطل! لو صبيت كوباية مفتوحة هتطير كور مية في الهواء وتلمس الأجهزة الكهربائية!'
    },
    wrongs: [
      {
        labelEn: 'From an open glass cup like at home',
        labelAr: 'من كوب زجاجي مفتوح كما في المنزل',
        feedbackEn: 'Open cups spill floating blobs of liquid everywhere in 0G!',
        feedbackAr: 'الكوب المفتوح خطر في 0G لأن السائل يطير كفقاعات!'
      },
      {
        labelEn: 'Astronauts never drink water in space',
        labelAr: 'لا يشرب الماء أبداً في الفضاء',
        feedbackEn: 'Staying hydrated is vital—every drop is sipped from sealed valve pouches!',
        feedbackAr: 'الماء ضروري جداً لصحة الرائد وكل سائل يُشرب من أكياس محكمة!'
      },
      {
        labelEn: 'Using a wide open soup bowl',
        labelAr: 'باستخدام طبق حساء واسع مفتوح',
        feedbackEn: 'An open bowl lets liquids drift freely all across the cabin!',
        feedbackAr: 'الطبق المفتوح يترك الماء يسبح في الكابينة بالكامل!'
      }
    ],
    nasaConnectionEn: 'NASA beverage pouches feature automatic pinch-valves that seal shut the instant you pull the straw out.',
    nasaConnectionAr: 'تُزود أكياس مشروبات ناسا بصمامات تغلق تلقائياً فور سحب الماصة.',
    nasaBadgeEn: 'NASA Drink Pouch',
    nasaBadgeAr: 'أكياس شراب ناسا'
  },
  {
    id: 'nut_08',
    topic: 'nutrition',
    icon: '🧀',
    questionEn: 'How does an astronaut warm up a sealed pouch of mac & cheese or chicken before eating?',
    questionAr: 'كيف يسخّن رائد الفضاء كيس المكرونة بالجبنة أو الدجاج قبل الأكل؟',
    correct: {
      labelEn: 'Inject hot water into the sealed pouch or warm it in a closed galley tray oven',
      labelAr: 'بحقن ماء ساخن داخل الكيس المغلق وخلطه أو بتسخين الكيس داخل سخان صينية مغلق',
      feedbackEn: 'Great! The water dispenser and briefcase-style warmer serve hot meals safely without spills!',
      feedbackAr: 'ممتاز! محطة حقن المياه والسخان المخصص بيخلوا الوجبة دافئة ولذيذة من غير تسريب!'
    },
    wrongs: [
      {
        labelEn: 'By lighting an open campfire inside the cabin',
        labelAr: 'بإشعال نار مفتوحة داخل المركبة',
        feedbackEn: 'Open flames are strictly forbidden inside oxygen-filled spacecraft!',
        feedbackAr: 'النار المفتوحة ممنوعة وخطيرة جداً في مركبة مملوءة بالأكسجين!'
      },
      {
        labelEn: 'By tossing the pouch outside toward the Sun',
        labelAr: 'بإخراج الكيس للشمس خارج الصاروخ',
        feedbackEn: 'Cooking happens safely indoors inside the sealed Space Galley unit!',
        feedbackAr: 'التسخين بيتم بأمان جوه المطبخ الفضائي بماء ساخن أو سخان كهربائي مغلق!'
      },
      {
        labelEn: 'By tucking it under the pilot’s seat',
        labelAr: 'بوضعه تحت كرسي الطيار في قمرة القيادة',
        feedbackEn: 'Flight seats are for piloting—meals warm cleanly inside the Galley!',
        feedbackAr: 'قمرة القيادة للتحكم فقط؛ التسخين يتم داخل لوح المطبخ Galley!'
      }
    ],
    nasaConnectionEn: 'Crew use the Space Galley fitted with a needle water injector and magnetic food-warmer trays.',
    nasaConnectionAr: 'يستخدم الطاقم "لوح المطبخ" (Galley) المزود بموزع مياه دقيقة وسخان أطباق مغناطيسي.',
    nasaBadgeEn: 'ISS Space Galley',
    nasaBadgeAr: 'مطبخ محطة الفضاء'
  },
  {
    id: 'nut_09',
    topic: 'nutrition',
    icon: '⚖️',
    questionEn: 'Why should we balance Protein and Energy proportions between 20% and 85% in our ration kit?',
    questionAr: 'في مختبر التغذية باللعبة، لماذا نحتاج موازنة نسبة البروتين والطاقة بين 20% و85%؟',
    correct: {
      labelEn: 'Energy fuels activity while protein repairs muscles—astronauts need both together',
      labelAr: 'لأن الطاقة تحرك الجسم بينما البروتين يبني العضلات وكلاهما ضروري معاً',
      feedbackEn: 'Bravo! A balanced diet gives your body every nutrient instead of just one!',
      feedbackAr: 'برافو عليك! الأكل المتنوع بيدي جسمك كل اللي محتاجه مش نوع واحد بس!'
    },
    wrongs: [
      {
        labelEn: 'Only so the lunchbox looks colorful',
        labelAr: 'لكي يكون لون الصندوق جميلاً فقط',
        feedbackEn: 'Nutrient balance protects heart health, strong muscles, and sharp focus!',
        feedbackAr: 'التوازن الغذائي مهم لصحة القلب والعضلات والتركيز في المهمة!'
      },
      {
        labelEn: 'Because protein stops the rocket from spinning',
        labelAr: 'لأن البروتين والفيتامينات يمنعان الصاروخ من الدوران',
        feedbackEn: 'It fuels the astronaut’s body evenly, not the rocket thrusters!',
        feedbackAr: 'الهدف هو تغذية رائد الفضاء بشكل متوازن وكامل!'
      },
      {
        labelEn: 'So food boxes grow wings in orbit',
        labelAr: 'لكي تنمو أجنحة للطعام في المدار',
        feedbackEn: 'This kid-friendly game rule teaches balanced muscle-building + energy nutrition!',
        feedbackAr: 'المعادلة المبسطة باللعبة تعلمك توازن العناصر لبناء العضلات وإنتاج الطاقة!'
      }
    ],
    nasaConnectionEn: 'Johnson Space Center dietitians craft daily calorie, protein, and vitamin plans tailored per astronaut.',
    nasaConnectionAr: 'يصمم اختصاصيو التغذية في مركز جونسون الفضائي جداول متوازنة السعرات والفيتامينات لكل رائد.',
    nasaBadgeEn: 'JSC Nutrition Balance',
    nasaBadgeAr: 'توازن تغذية جونسون'
  },
  {
    id: 'nut_10',
    topic: 'nutrition',
    icon: '🥦',
    questionEn: 'Why does NASA grow fresh lettuce and peppers inside the ISS Veggie Garden?',
    questionAr: 'لماذا تزرع ناسا الخضروات الطازجة مثل الخس والفلفل داخل محطة الفضاء (Veggie Lab)؟',
    correct: {
      labelEn: 'To deliver fresh vitamins and boost astronaut mood on long missions',
      labelAr: 'لإمداد الرواد بفيتامينات طازجة وتحسين حالتهم النفسية في الرحلات الطويلة',
      feedbackEn: 'Wonderful! Fresh green plants add crisp vitamins and a joyful reminder of home!',
      feedbackAr: 'يا سلام! النباتات الخضراء تدي فيتامينات طازجة وتفرح رواد الفضاء بريحة الأرض الجميلة!'
    },
    wrongs: [
      {
        labelEn: 'To block out starlight from the windows',
        labelAr: 'لتغطية نوافذ المركبة من النجوم',
        feedbackEn: 'They grow fresh food, oxygen, and happiness for long-duration crews!',
        feedbackAr: 'الهدف هو الغذاء الطازج والصحة النفسية وتجارب الزراعة القمرية!'
      },
      {
        labelEn: 'Because lettuce steers the spacecraft',
        labelAr: 'لأن النباتات تقود الصاروخ',
        feedbackEn: 'Plants provide nutrition, oxygen, and calming greenery in orbit!',
        feedbackAr: 'النباتات توفر غذاءً وأكسجيناً ومناظر خضراء مريحة للطاقم!'
      },
      {
        labelEn: 'To sell vegetables to passing planets',
        labelAr: 'لبيع الخضروات لكواكب أخرى',
        feedbackEn: 'Space farming supports crew sustenance and microgravity plant research!',
        feedbackAr: 'الزراعة مخصصة لإعاشة الرواد وإجراء أبحاث نمو النبات في الجاذبية الصغرى!'
      }
    ],
    nasaConnectionEn: 'NASA’s Veggie chamber successfully grew red romaine lettuce, radishes, and chili peppers under LEDs in 0G.',
    nasaConnectionAr: 'نجح مشروع NASA Veggie في زراعة الخس الأحمر والفجل والفلفل الحار باستخدام إضاءة LED في انعدام الجاذبية.',
    nasaBadgeEn: 'NASA Veggie Garden',
    nasaBadgeAr: 'حديقة ناسا الفضائية'
  },
  {
    id: 'nut_11',
    topic: 'nutrition',
    icon: '🫧',
    questionEn: 'Why are fizzy carbonated sodas completely banned aboard the Space Station?',
    questionAr: 'لماذا تُمنع المشروبات الغازية تماماً على متن محطة الفضاء الدولية؟',
    correct: {
      labelEn: 'Gas bubbles don’t rise to the top in 0G, causing painful stomach upset',
      labelAr: 'لأن فقاعات الغاز لا ترتفع للأعلى في 0G فتسبب آلاماً واضطراباً في المعدة',
      feedbackEn: 'Fascinating science! Without gravity, gas bubbles stay trapped mixed inside liquid in your tummy!',
      feedbackAr: 'معلومة مذهلة! في الفضاء الغازات والسوائل تتلخبط مع بعض في البطن من غير جاذبية!'
    },
    wrongs: [
      {
        labelEn: 'Because dark soda colors are scary',
        labelAr: 'لأن لونها داكن',
        feedbackEn: 'It is physics! Carbon dioxide bubbles refuse to separate from liquid in 0G!',
        feedbackAr: 'السبب العلمي هو سلوك فقاعات غاز ثاني أكسيد الكربون في المعدة!'
      },
      {
        labelEn: 'Because sodas explode helmets right away',
        labelAr: 'لأنها تجعل الخوذة تنفجر فوراً',
        feedbackEn: 'The real issue is bubbly stomach discomfort inside weightless zero-G!',
        feedbackAr: 'المشكلة في المعدة والانضغاط الغازي في انعدام الوزن!'
      },
      {
        labelEn: 'Because cans cost more than rockets',
        labelAr: 'لأن ثمنها أغلى من الصاروخ',
        feedbackEn: 'The ban is biological and physical due to trapped gas bubbles in 0G!',
        feedbackAr: 'المنع فيزيائي وطبي بسبب بقاء الفقاعات عالقة داخل السائل في 0G!'
      }
    ],
    nasaConnectionEn: 'NASA tested fizzy drinks in orbital fluid studies and confirmed bubbles stay suspended evenly in liquid.',
    nasaConnectionAr: 'اختبرت ناسا علب مشروبات غازية في التجارب المدارية فوجدت أن الفقاعات تظل معلقة داخل السائل بدل فصلها.',
    nasaBadgeEn: 'NASA Zero-G Fluids',
    nasaBadgeAr: 'سوائل الجاذبية الصغرى'
  },
  {
    id: 'nut_12',
    topic: 'nutrition',
    icon: '🍎',
    questionEn: 'When fresh apples or oranges arrive on a cargo ship, what is the rule for eating them?',
    questionAr: 'عند إرسال تفاح أو فواكه طازجة في مركبة الشحن، ما القاعدة المهمة لاستهلاكها؟',
    correct: {
      labelEn: 'Eat them within the first few days before spoiling since they aren’t dried',
      labelAr: 'يجب أكلها خلال الأيام الأولى قبل أن تفسد لأنها غير مجففة',
      feedbackEn: 'Correct! Fresh fruit is a yummy welcome treat eaten right after resupply arrives!',
      feedbackAr: 'صح! الفاكهة الطازجة بتكون مكافأة لذيذة أول ما توصل مركبة الإمداد وبتتاكل بسرعة!'
    },
    wrongs: [
      {
        labelEn: 'They stay fresh for twenty years with no fridge',
        labelAr: 'تبقى صالحة عشرين سنة بدون ثلاجة',
        feedbackEn: 'Only freeze-dried or thermostabilized packs last long—fresh fruit is eaten early!',
        feedbackAr: 'الطعام المجفف أو المعقم بالحرارة هو اللي بيعيش شهور وسنين، أما الطازج بيتاكل بدري!'
      },
      {
        labelEn: 'Throw them straight out into space',
        labelAr: 'يتم رميها خارج المركبة فوراً',
        feedbackEn: 'Crews celebrate fresh fruit deliveries and enjoy every bite quickly!',
        feedbackAr: 'الرواد يفرحون جداً بوصول الفواكه الطازجة ويأكلونها طازجة!'
      },
      {
        labelEn: 'Pour them into the rocket fuel tank',
        labelAr: 'توضع في خزان وقود المحرك',
        feedbackEn: 'Fresh fruit feeds happy astronauts right after cargo docking!',
        feedbackAr: 'الرواد يأكلون الفواكه الطازجة في الأيام الأولى فور وصول مركبة الإمداد!'
      }
    ],
    nasaConnectionEn: 'SpaceX Dragon and Cygnus supply ships pack small crates of fresh apples and oranges as crew treats.',
    nasaConnectionAr: 'تحمل مركبات SpaceX Dragon وCygnus صناديق صغيرة من التفاح والبرتقال الطازج كهدية معنوية للطاقم.',
    nasaBadgeEn: 'ISS Resupply Fresh',
    nasaBadgeAr: 'فواكه الإمداد الطازجة'
  },
  {
    id: 'nut_13',
    topic: 'nutrition',
    icon: '🍔',
    questionEn: 'Why do mission planners choose lean healthy meals over greasy burgers and pizza?',
    questionAr: 'لماذا يختار المخططون أطعمة قليلة الدهون المشبعة بدلاً من البرجر والبيتزا الدسمة؟',
    correct: {
      labelEn: 'To protect heart health and keep crumbs and oils out of cabin air',
      labelAr: 'لحماية صحة القلب والأوعية وتقليل الفتات والزيوت الملوثة للهواء',
      feedbackEn: 'Awesome captain! Light healthy meals keep hearts strong and spacecraft air crystal clean!',
      feedbackAr: 'عاش يا كابتن! الأكل الصحي الخفيف يحافظ على قلب الرائد قوي ونظافة هواء المركبة!'
    },
    wrongs: [
      {
        labelEn: 'Because round foods are illegal in space',
        labelAr: 'لأن شكل الدائرة غير مسموح به',
        feedbackEn: 'Shape isn’t the problem—excess fat, salt, and flying crumbs are!',
        feedbackAr: 'شكل الطعام مش هو السبب! المشكلة الحقيقية في الدهون والفتات المتطاير والملح العالي!'
      },
      {
        labelEn: 'Because burgers weigh more than Mars',
        labelAr: 'لأن البرجر أثقل من المريخ',
        feedbackEn: 'The real reason is heart protection and clean spacecraft ventilation!',
        feedbackAr: 'السبب طبي وصحي لحماية القلب وأجهزة الفضاء!'
      },
      {
        labelEn: 'Because astronauts chew too slowly',
        labelAr: 'لأن رواد الفضاء يأكلون بطيء جداً',
        feedbackEn: 'The goal is cardiovascular fitness and clean closed-loop cabin air!',
        feedbackAr: 'الهدف هو الحفاظ على القلب والشرايين ونظافة الهواء المغلق داخل الكابينة!'
      }
    ],
    nasaConnectionEn: 'NASA flight surgeons and dietitians craft heart-healthy menus for endurance during long missions.',
    nasaConnectionAr: 'تصمم قوائم ناسا تحت إشراف أطباء القلب والتغذية للحفاظ على لياقة الرواد أثناء المهام الطويلة.',
    nasaBadgeEn: 'NASA Crew Health',
    nasaBadgeAr: 'صحة طاقم ناسا'
  },
  {
    id: 'nut_14',
    topic: 'nutrition',
    icon: '🧲',
    questionEn: 'How does NASA keep spoons and meal pouches from floating away during dinner?',
    questionAr: 'كيف تمنع ناسا الملعقة والوجبات من الطفو والهرب فوق الطاولة أثناء الأكل؟',
    correct: {
      labelEn: 'By fastening trays and packs with Velcro strips and magnets',
      labelAr: 'بتثبيت الصواني والأكياس بشرائط الفيلكرو اللاصقة والمغناطيس',
      feedbackEn: 'Smart! Velcro dots and magnetic tray slots hold spoons and pouches neatly in place!',
      feedbackAr: 'عبقري! المغناطيس والفيلكرو هما اللي بيمسكوا المعلقة والكيس على صينية الأكل!'
    },
    wrongs: [
      {
        labelEn: 'By pouring permanent super-glue into the soup',
        labelAr: 'باستخدام الغراء الصمغي الدائم في الأكل',
        feedbackEn: 'Velcro and magnets hold tools cleanly so you can detach them anytime!',
        feedbackAr: 'الفيلكرو والمغناطيس يسمحان بفك وتثبيت الأشياء بسهولة ونظافة!'
      },
      {
        labelEn: 'By placing a heavy boulder on each spoon',
        labelAr: 'بوضع صخرة ثقيلة فوق كل ملعقة',
        feedbackEn: 'Even a heavy rock would float in zero-G unless strapped down!',
        feedbackAr: 'حتى الصخرة هتطير في انعدام الوزن لو مش متثبتة!'
      },
      {
        labelEn: 'By tying plates to the outside robot arm',
        labelAr: 'بربط كل طبق بالذراع الآلي خارج المحطة',
        feedbackEn: 'Trays inside the cabin safely secure cutlery with Velcro, clips, and magnets!',
        feedbackAr: 'تُثبت أدوات الطعام داخل الكابينة بأشرطة فيلكرو ومشابك ومغناطيس!'
      }
    ],
    nasaConnectionEn: 'Every ISS dining tray includes Velcro strips and magnetic clamps to keep utensils anchored.',
    nasaConnectionAr: 'كل صينية طعام في محطة الفضاء تحتوي على شرائط Velcro ومشابك تثبيت لحفظ الأدوات المعدنية.',
    nasaBadgeEn: 'ISS Dining Tray',
    nasaBadgeAr: 'صينية طعام المحطة'
  }
];

// 14 Astronaut Health, Suit & Space Physics Questions
const RAW_HEALTH_PHYSICS: readonly RawQuestionInput[] = [
  {
    id: 'hp_01',
    topic: 'health_physics',
    icon: '❤️',
    questionEn: 'What is the best daily habit to keep an astronaut’s heart muscle strong?',
    questionAr: 'ما هي أفضل عادة يومية للحفاظ على قوة عضلة قلب رائد الفضاء؟',
    correct: {
      labelEn: 'Practicing regular daily exercise and cardio training',
      labelAr: 'ممارسة الرياضة والتمارين المنتظمة يومياً',
      feedbackEn: 'Awesome! Daily exercise keeps your heart strong on Earth and throughout space! 💪❤️',
      feedbackAr: 'أحسنت! الرياضة مهمة لصحة جسمك وتجعل قلب رائد الفضاء قوياً في الأرض والفضاء! 💪❤️'
    },
    wrongs: [
      {
        labelEn: 'Eating fried fast food every day',
        labelAr: 'الأكل السريع والوجبات المقلية',
        feedbackEn: 'Watch out! Heavy greasy food tires the heart and isn’t used on missions!',
        feedbackAr: 'حاسب يا بطل! الأكل السريع مليان دهون بتتعب القلب وممنوع لرواد الفضاء!'
      },
      {
        labelEn: 'Drinking fizzy sodas before launch',
        labelAr: 'شرب المشروبات الغازية قبل الإطلاق',
        feedbackEn: 'Nope! Fizzy sodas upset stomachs and don’t help heart fitness!',
        feedbackAr: 'لا لا لا! المشروبات الغازية بتضر صحة العظام والمعدة في الفضاء!'
      },
      {
        labelEn: 'Sitting motionless at a screen all day',
        labelAr: 'الجلوس أمام الشاشة طوال اليوم بلا حركة',
        feedbackEn: 'Zero movement weakens the heart—daily training keeps astronauts strong!',
        feedbackAr: 'قلة الحركة تُضعف عضلة القلب! التمارين المنتظمة سر القوة!'
      }
    ],
    nasaConnectionEn: 'ISS astronauts work out 2 hours every day on treadmills and resistance rigs to protect heart power.',
    nasaConnectionAr: 'يتدرب رواد محطة الفضاء ساعتين يومياً بجهاز الركض والمقاومة لحماية عضلة القلب.',
    nasaBadgeEn: 'NASA Cardio Care',
    nasaBadgeAr: 'عناية قلب ناسا'
  },
  {
    id: 'hp_02',
    topic: 'health_physics',
    icon: '💪',
    questionEn: 'How do astronauts train muscles and bones in 0G where regular iron weights weigh nothing?',
    questionAr: 'ماذا يستخدم رواد الفضاء لتمرين العضلات والعظام في انعدام الجاذبية حيث لا يوجد وزن؟',
    correct: {
      labelEn: 'The Advanced Resistive Exercise Device (ARED) using vacuum air cylinders',
      labelAr: 'جهاز المقاومة المتطور ARED الذي يولد مقاومة هوائية بالشفط',
      feedbackEn: 'Bravo! Iron bars weigh 0 kg in 0G, so ARED uses vacuum pistons to build strong muscles!',
      feedbackAr: 'برافو! الحديد العادي وزنه صفر في الفضاء، فجهاز ARED يستخدم أسطوانات مفرغة لمقاومة العضلات!'
    },
    wrongs: [
      {
        labelEn: 'Lifting fluffy cotton bags',
        labelAr: 'رفع حقائب قطن خفيفة',
        feedbackEn: 'Any object floats without downward pull in 0G—vacuum resistance ARED solves this!',
        feedbackAr: 'أي كتلة مش بتتشد لتحت في 0G، فكر في جهاز المقاومة ARED!'
      },
      {
        labelEn: 'Standing totally still for a month',
        labelAr: 'الوقوف بدون حركة لشهر كامل',
        feedbackEn: 'Not exercising in space causes rapid bone and muscle weakness!',
        feedbackAr: 'قلة الحركة في الفضاء تضعف العظام والعضلات سريعاً!'
      },
      {
        labelEn: 'Lifting traditional 100 kg iron dumbbells',
        labelAr: 'رفع أثقال حديدية تقليدية تزن 100 كجم',
        feedbackEn: 'In weightlessness iron bars feel like feathers—vacuum resistance on ARED works everywhere!',
        feedbackAr: 'في انعدام الوزن تصبح الأثقال الحديدية بلا وزن، لذلك نستخدم الشفط والضغط الهوائي في ARED!'
      }
    ],
    nasaConnectionEn: 'NASA data shows daily ARED workouts plus good protein preserve over 95% of crew muscle mass.',
    nasaConnectionAr: 'أثبتت دراسات ناسا أن التمرين اليومي على ARED مع البروتين يحفظ أكثر من 95% من كتلة العضلات.',
    nasaBadgeEn: 'NASA ARED System',
    nasaBadgeAr: 'جهاز المقاومة ARED'
  },
  {
    id: 'hp_03',
    topic: 'health_physics',
    icon: '👩‍🚀',
    questionEn: 'What is the ideal pure-oxygen operating pressure inside NASA’s EMU spacesuit?',
    questionAr: 'ما الضغط المثالي للأكسجين النقي داخل بدلة السير الفضائي NASA EMU؟',
    correct: {
      labelEn: '4.3 PSI so fingers and joints can still bend safely and easily',
      labelAr: '4.3 PSI ليسمح بحركة المفاصل والأصابع بمرونة وأمان',
      feedbackEn: '100% right! If pressure goes too high, the suit stiffens up like an over-inflated balloon!',
      feedbackAr: 'ممتاز مية في المية! لو الضغط علي أوي البدلة هتتيبس زي البالونة المنفوخة!'
    },
    wrongs: [
      {
        labelEn: 'Zero PSI (no air at all)',
        labelAr: 'صفر PSI (بدون هواء)',
        feedbackEn: 'Humans need oxygen pressure to survive in the vacuum outside a spacecraft!',
        feedbackAr: 'بدون ضغط وأكسجين لا يستطيع الإنسان البقاء حياً خارج المركبة!'
      },
      {
        labelEn: '50 PSI (like heavy truck tires)',
        labelAr: '50 PSI (مثل إطارات الشاحنات)',
        feedbackEn: 'At 50 PSI the suit would become rock-hard—an astronaut couldn’t bend one finger!',
        feedbackAr: 'لو كان 50 PSI مكنش الرائد يقدر يتني صباعه أو ذراعه أبداً!'
      },
      {
        labelEn: '100 PSI underwater only',
        labelAr: '100 PSI تحت الماء فقط',
        feedbackEn: '4.3 PSI pure oxygen is NASA’s balanced sweet spot for nimble EVA spacewalks!',
        feedbackAr: 'الضغط 4.3 PSI هو المعيار المتزن في بدلات السير الفضائي الحرة!'
      }
    ],
    nasaConnectionEn: 'NASA suits maintain 4.3 PSI pure oxygen paired with a gold-coated visor to reflect scorching sunlight.',
    nasaConnectionAr: 'تعمل بدلات ناسا عند 4.3 PSI بالأكسجين النقي مع خوذة ذهبية تعكس أشعة الشمس الحارقة.',
    nasaBadgeEn: 'NASA EMU 4.3 PSI',
    nasaBadgeAr: 'ضغط بدلة ناسا 4.3'
  },
  {
    id: 'hp_04',
    topic: 'health_physics',
    icon: '🕶️',
    questionEn: 'Why does a spacewalk helmet feature an outer visor coated in a thin layer of gold?',
    questionAr: 'لماذا تحتوي خوذة بدلة الفضاء على حاجب مطلي بطبقة رقيقة من الذهب؟',
    correct: {
      labelEn: 'To reflect scorching sunlight and shield eyes from glare and UV rays',
      labelAr: 'لتعكس الأشعة الشمسية الحارقة وتحمي عيون الرائد من الوهج والأشعة فوق البنفسجية',
      feedbackEn: 'Awesome! Sunlight in space has no atmosphere filtering it, so gold safely reflects harsh heat and rays!',
      feedbackAr: 'رائع! الشمس في الفضاء ساطعة جداً بدون غلاف جوي، والذهب يعكس الحرارة والضوء الضار!'
    },
    wrongs: [
      {
        labelEn: 'Just for shiny space fashion photos',
        labelAr: 'للزينة والتصوير فقط',
        feedbackEn: 'Gold is a real optical and thermal mirror protecting the astronaut’s eyesight!',
        feedbackAr: 'الذهب درع بصري وحراري حقيقي لحماية العين!'
      },
      {
        labelEn: 'To hide astronauts from passing planets',
        labelAr: 'لإخفاء وجه الرائد عن الكواكب',
        feedbackEn: 'Its true job is blocking blinding sunlight and ultraviolet radiation!',
        feedbackAr: 'الوظيفة طبية وفيزيائية لحماية البصر من أشعة الشمس غير المرشحة!'
      },
      {
        labelEn: 'To make the helmet super heavy in 0G',
        labelAr: 'لزيادة وزن الخوذة في انعدام الوزن',
        feedbackEn: 'The gold film is whisper-thin and shields astronauts’ eyes from intense glare!',
        feedbackAr: 'الطبقة فائقة الرقة لحماية العينين من وهج الشمس وحرارتها الشديدة!'
      }
    ],
    nasaConnectionEn: 'EVA visors use a micro-thin gold film that reflects up to 98% of harmful rays while keeping vision clear.',
    nasaConnectionAr: 'تُطلى خوذات EVA بطبقة ذهب فائقة الرقة تعكس 98% من الأشعة الضارة مع بقاء الرؤية واضحة.',
    nasaBadgeEn: 'Gold Visor Shield',
    nasaBadgeAr: 'درع الخوذة الذهبي'
  },
  {
    id: 'hp_05',
    topic: 'health_physics',
    icon: '💧',
    questionEn: 'How can a Moon base maintain clean water without launching thousands of liters daily?',
    questionAr: 'كيف نحافظ على إمداد مستعمرة القمر بالمياه النظيفة بدون شحن آلاف اللترات كل يوم؟',
    correct: {
      labelEn: 'Using the ECLSS system to purify and recycle up to 98% of water and humidity',
      labelAr: 'بنظام ECLSS لتنقية وتدوير 98% من المياه والرطوبة داخل القاعدة',
      feedbackEn: 'Life-support engineer! ECLSS recycles every drop until it’s purer than tap water on Earth!',
      feedbackAr: 'عبقري الهندسة الفضائية! نظام ECLSS يعيد تنقية كل قطرة مية حتى تصبح أنقى من مياه الصنبور!'
    },
    wrongs: [
      {
        labelEn: 'Waiting for rainstorms on the Moon',
        labelAr: 'بانتظار هطول المطر على القمر',
        feedbackEn: 'The Moon has no atmosphere or rain clouds—recycling and ice mining are key!',
        feedbackAr: 'لا يوجد مطر على القمر بسبب انعدام الغلاف الجوي!'
      },
      {
        labelEn: 'Scooping salty oceans from lunar clouds',
        labelAr: 'باستخدام مياه البحر المالحة من الغيوم',
        feedbackEn: 'There are no clouds or seas on the Moon—water must be recycled and extracted from polar ice!',
        feedbackAr: 'لا توجد بحار ولا غيوم على القمر؛ التدوير وحفر الجليد هما الحل!'
      },
      {
        labelEn: 'Squeezing dry basalt rocks by hand',
        labelAr: 'عن طريق عصر صخور البازلت الجافة بيدينا',
        feedbackEn: 'Closed-loop ECLSS purification recycles up to 98% cleanly and reliably!',
        feedbackAr: 'تدوير المياه والرطوبة بنظام ECLSS هو ما يوفر حتى 98% في التجارب الموثقة!'
      }
    ],
    nasaConnectionEn: 'NASA’s ISS ECLSS system achieved a 98% water-recovery milestone, paving the way for Artemis.',
    nasaConnectionAr: 'حقق نظام ECLSS في محطة الفضاء الدولية معدل إعادة تدوير مياه يصل إلى 98% تمهيداً لرحلات القمر والمريخ.',
    nasaBadgeEn: 'NASA ECLSS 98%',
    nasaBadgeAr: 'تدوير المياه 98%'
  },
  {
    id: 'hp_06',
    topic: 'health_physics',
    icon: '🧂',
    questionEn: 'Why do astronauts drink hydration & electrolyte fluids when changing gravity levels?',
    questionAr: 'لماذا يشرب الرواد محاليل أملاح الإرواء والترطيب قبل وبعد الانتقال للجاذبية الصغرى؟',
    correct: {
      labelEn: 'To prevent blood-pressure drops, space dizziness, and balance body fluids',
      labelAr: 'لمنع هبوط ضغط الدم ودوار الفضاء وتنظيم سوائل الجسم',
      feedbackEn: 'Space doc pro! Water + electrolytes stabilize blood circulation during gravity shifts!',
      feedbackAr: 'صح يا دكتور الفضاء! التوازن المائي والملحي يحمي الرائد من الدوخة عند العودة أو الهبوط!'
    },
    wrongs: [
      {
        labelEn: 'To change the sound of their voice',
        labelAr: 'لتغيير لون صوتهم',
        feedbackEn: 'Electrolytes regulate healthy blood pressure and body hydration volume!',
        feedbackAr: 'الأملاح تنظم ضغط الدم وحجم السوائل في الأوعية الدموية!'
      },
      {
        labelEn: 'To make their hair stop growing',
        labelAr: 'لإيقاف نمو الشعر',
        feedbackEn: 'It is strictly for safe blood pressure and healthy hydration!',
        feedbackAr: 'الهدف هو استقرار ضغط الدم والترطيب الحيوي!'
      },
      {
        labelEn: 'To make spacesuits sparkle under the stars',
        labelAr: 'لجعل البدلة تلمع تحت النجوم',
        feedbackEn: 'Fluid loading prepares the astronaut’s body for sudden gravity changes!',
        feedbackAr: 'الترطيب والإلكترولايت يعالجان تغير توزيع الدم عند تغير الجاذبية!'
      }
    ],
    nasaConnectionEn: 'NASA’s Fluid Loading protocol (water + electrolytes) protects astronauts from dizziness upon landing.',
    nasaConnectionAr: 'يُطبق بروتوكول NASA Fluid Loading (ماء + إلكترولايت) لحماية الرواد من الإغماء الموضعي بعد الهبوط.',
    nasaBadgeEn: 'NASA Fluid Loading',
    nasaBadgeAr: 'ترطيب رواد ناسا'
  },
  {
    id: 'hp_07',
    topic: 'health_physics',
    icon: '🔗',
    questionEn: 'What is the job of the steel Safety Tether during a spacewalk outside the station?',
    questionAr: 'ما وظيفة حبل الأمان الفولاذي (Safety Tether) أثناء السير الفضائي خارج المركبة؟',
    correct: {
      labelEn: 'Keeps the astronaut anchored to the station so inertia can’t drift them away',
      labelAr: 'يربط الرائد بالمركبة حتى لا يبتعد في الفضاء حسب قانون نيوتن للقصور',
      feedbackEn: 'Physics champion! In empty space without a tether, one tiny push sends you drifting endlessly!',
      feedbackAr: 'عبقري الفيزياء! في الفراغ لو اندفعت للخارج ومفيش حبل، هتفضل ماشي للأبد!'
    },
    wrongs: [
      {
        labelEn: 'Used as a fishing line to catch meteors',
        labelAr: 'يستخدم لصيد النيازك الصغيرة',
        feedbackEn: 'The safety tether keeps the astronaut securely clipped to the spacecraft!',
        feedbackAr: 'حبل الأمان يحفظ حياة الرائد مربوطاً بجدار المحطة دائماً!'
      },
      {
        labelEn: 'Used to recharge batteries from planets',
        labelAr: 'يملأ البطارية من الكواكب',
        feedbackEn: 'It’s a rugged braided steel safety cable holding over 1,000 pounds of force!',
        feedbackAr: 'هو رابط ميكانيكي متين يتحمل شد أكثر من 1000 رطل!'
      },
      {
        labelEn: 'Used for trampoline jumps inside the cabin',
        labelAr: 'يستخدم للقفز على الترامبولين داخل القمرة',
        feedbackEn: 'Its life-saving duty is anchoring spacewalkers outside the hull during EVAs!',
        feedbackAr: 'وظيفته حماية الرائد خارج المركبة أثناء السير الفضائي EVA!'
      }
    ],
    nasaConnectionEn: 'NASA spacewalkers follow the Two-Tether Rule—never unclipping one hook before locking the second.',
    nasaConnectionAr: 'يتبع رواد ناسا قاعدة "Two-Tether Rule" فلا يفصلون خطافاً أبداً قبل تثبيت الثاني.',
    nasaBadgeEn: 'NASA EVA Tether',
    nasaBadgeAr: 'حبل أمان الفضاء'
  },
  {
    id: 'hp_08',
    topic: 'health_physics',
    icon: '⚖️',
    questionEn: 'Why must lunar samples be balanced evenly left-to-right (diff ≤ 15 kg) inside the return capsule?',
    questionAr: 'لماذا نوزع وزن العينات القمرية بالتساوي بين اليمين واليسار في كبسولة العودة (فارق ≤ 15 كجم)؟',
    correct: {
      labelEn: 'To protect center-of-mass so the capsule won’t tilt off its heat shield during entry',
      labelAr: 'للحفاظ على مركز الثقل حتى لا تميل الكبسولة وتحترق أثناء اختراق الغلاف الجوي',
      feedbackEn: 'Spot on! Balanced mass prevents wild spin and keeps the protective heat shield pointed forward!',
      feedbackAr: 'ممتاز! توازن الكتلة يمنع الدوران العشوائي ويخلي الدرع الحراري في الاتجاه الصح!'
    },
    wrongs: [
      {
        labelEn: 'So cargo boxes look symmetrical in team photos',
        labelAr: 'لكي تبدو الصناديق متشابهة في الصورة',
        feedbackEn: 'It is critical flight physics—unbalanced weight tilts the heat shield off course!',
        feedbackAr: 'الموضوع فيزياء طيران حيوية جداً؛ اختلال التوازن يغير زاوية الدرع الحراري!'
      },
      {
        labelEn: 'Because Moon rocks get grumpy sitting alone',
        labelAr: 'لأن الصخور تغضب لو جلست وحدها',
        feedbackEn: 'Aerodynamic balance and center-of-mass control save the capsule on reentry!',
        feedbackAr: 'السبب هو ضبط مركز الثقل والاتزان الهوائي!'
      },
      {
        labelEn: 'To make the capsule spin fast like a ceiling fan',
        labelAr: 'لكي تدور الكبسولة بسرعة أكبر كالمروحة',
        feedbackEn: 'We need rock-steady balance so the Avcoat heat shield hits the atmosphere cleanly!',
        feedbackAr: 'نحتاج ثباتاً وتوازناً دقيقاً حتى يدخل الدرع الحراري بزاوية آمنة!'
      }
    ],
    nasaConnectionEn: 'NASA Johnson engineers weigh every gram of return cargo to hold the safe 20°–24° entry angle.',
    nasaConnectionAr: 'تحسب فرق مركز لندون جونسون كل جرام في كبسولات العودة لضبط زاوية الدخول الآمنة 20°-24°.',
    nasaBadgeEn: 'Capsule Center-of-Mass',
    nasaBadgeAr: 'توازن كبسولة العودة'
  },
  {
    id: 'hp_09',
    topic: 'health_physics',
    icon: '🛰️',
    questionEn: 'Why do astronauts’ faces look slightly puffy and legs look thinner in zero gravity?',
    questionAr: 'في انعدام الجاذبية، لماذا تبدو وجوه رواد الفضاء ممتلئة قليلاً وأرجلهم أنحف (Puffy Face)؟',
    correct: {
      labelEn: 'Gravity stops pulling fluids to the feet, so blood shifts upward to chest & head',
      labelAr: 'لأن الجاذبية لم تعد تسحب الدم والسوائل للقدمين فتصعد السوائل نحو الصدر والرأس',
      feedbackEn: '100% correct! Your body naturally redistributes fluids evenly upward in early orbit!',
      feedbackAr: 'ممتاز مية في المية! الجسم يعيد توزيع السوائل بالتساوي لفوق في أول أيام الفضاء!'
    },
    wrongs: [
      {
        labelEn: 'Because astronauts only sleep upside down',
        labelAr: 'لأنهم ينامون رأساً على عقب فقط',
        feedbackEn: 'There isn’t even an "up" or "down" in 0G—no downward pull causes fluid shift!',
        feedbackAr: 'في الفضاء مفيش فوق وتحت أصلاً! عدم وجود شد للأسفل هو السبب!'
      },
      {
        labelEn: 'Because the helmet squeezes their cheeks',
        labelAr: 'لأن الخوذة تضغط على الخدود',
        feedbackEn: 'This happens indoors without a helmet too, purely due to upward fluid shift!',
        feedbackAr: 'تظهر هذه الظاهرة حتى داخل المحطة بدون خوذة بسبب انتقال السوائل!'
      },
      {
        labelEn: 'From eating too much candy before bedtime',
        labelAr: 'بسبب تناول الحلوى قبل النوم مباشرة',
        feedbackEn: 'Weightless blood redistribution upward in the body is the real scientific cause!',
        feedbackAr: 'تغير توزيع السوائل في انعدام الجاذبية هو السبب العلمي الموثق!'
      }
    ],
    nasaConnectionEn: 'NASA doctors call this Cephalad Fluid Shift and check crew eye pressure regularly on orbit.',
    nasaConnectionAr: 'يسمي أطباء ناسا هذه الظاهرة Cephalad Fluid Shift ويراقبون معها ضغط العين بانتظام.',
    nasaBadgeEn: 'NASA Physiology',
    nasaBadgeAr: 'فسيولوجيا الفضاء ناسا'
  },
  {
    id: 'hp_10',
    topic: 'health_physics',
    icon: '⚡',
    questionEn: 'What does a spacecraft Fuel Cell reactor need to produce both electricity and pure water?',
    questionAr: 'ماذا نحتاج في قلب المحرك لتوليد الكهرباء والماء النقي معاً من خلايا الوقود (Fuel Cells)؟',
    correct: {
      labelEn: 'Combine Hydrogen and Oxygen while managing cooling to prevent overheating',
      labelAr: 'دمج الهيدروجين والأكسجين مع الحفاظ على التبريد ومنع السخونة الزائدة',
      feedbackEn: 'Rocket engineer! Combining hydrogen & oxygen generates power plus pure drinking water!',
      feedbackAr: 'إجابة مهندس صواريخ! تفاعل الهيدروجين والأكسجين يدينا كهرباء ومية شرب نقية للطاقم!'
    },
    wrongs: [
      {
        labelEn: 'Pour lunar sand and rocks into the tank',
        labelAr: 'خلط الرمل والتراب القمري في الخزان',
        feedbackEn: 'Moon dust can’t power fuel cells—hydrogen and oxygen gas are essential!',
        feedbackAr: 'التراب القمري لا يولد كهرباء في خلايا الوقود؛ الهيدروجين والأكسجين هما الأساس!'
      },
      {
        labelEn: 'Leave the battery uncooled without airflow',
        labelAr: 'ترك البطارية بدون شحن أو تهوية',
        feedbackEn: 'Active thermal cooling keeps fuel-cell reactors efficient and safe!',
        feedbackAr: 'المتابعة الحرارية والتبريد ضروريان لحماية خلايا الطاقة!'
      },
      {
        labelEn: 'Boil fruit juice inside the engine core',
        labelAr: 'غلي عصير الفواكه في المفاعلات',
        feedbackEn: 'Spacecraft fuel cells react pure hydrogen and oxygen to create power + clean water!',
        feedbackAr: 'خلايا الوقود الفضائية تدمج الهيدروجين والأكسجين لتوليد الطاقة والمياه الصافية!'
      }
    ],
    nasaConnectionEn: 'Apollo capsules and the Space Shuttle ran on fuel cells whose clean byproduct was drinking water.',
    nasaConnectionAr: 'استخدمت مركبات أبولو ومكوك الفضاء خلايا الوقود لأن ناتجها الثانوي هو ماء شرب نقي للرواد.',
    nasaBadgeEn: 'NASA Fuel Cell Tech',
    nasaBadgeAr: 'خلايا وقود ناسا'
  },
  {
    id: 'hp_11',
    topic: 'health_physics',
    icon: '😴',
    questionEn: 'How many sunrises does an ISS astronaut see each day, and how do they sleep steadily?',
    questionAr: 'كم شروق شمس يراه رائد الفضاء كل يوم على متن محطة الفضاء الدولية، وكيف ينام بانتظام؟',
    correct: {
      labelEn: '16 sunrises daily, sleeping on a strict schedule inside a wall-tethered sleeping bag',
      labelAr: '16 شروقاً يومياً، لذا ينام بجدول زمني صارم داخل كيس نوم مثبت بالجدار',
      feedbackEn: 'Awesome fact! The ISS orbits Earth 16 times daily, and strapped sleep pods keep crew from drifting!',
      feedbackAr: 'معلومة تحفة! المحطة بتلف حول الأرض 16 مرة في اليوم، وكيس النوم المثبت يمنعهم من الطفو!'
    },
    wrongs: [
      {
        labelEn: 'Only one sunrise per year',
        labelAr: 'شروق واحد كل سنة',
        feedbackEn: 'The ISS loops around Earth every 90 minutes—making 16 sunrises every day!',
        feedbackAr: 'المحطة تكمل دورة حول الأرض كل 90 دقيقة، يعني 16 شروق يومياً!'
      },
      {
        labelEn: 'Astronauts never sleep in space',
        labelAr: 'لا ينام الرواد أبداً',
        feedbackEn: '7–8 hours of solid sleep keeps reaction times sharp and missions safe!',
        feedbackAr: 'النوم الجيد لمدة 7-8 ساعات أساسي لتركيز الرائد وسلامة المهمة!'
      },
      {
        labelEn: 'One sunrise a month while standing outside',
        labelAr: 'شروق واحد كل شهر بينما ينامون وقوفاً في الخارج',
        feedbackEn: 'They witness 16 sunrises daily and snooze inside cozy strapped crew quarters!',
        feedbackAr: 'يرى الطاقم 16 شروقاً وينامون في كبائن خاصة مثبتة بالأحزمة!'
      }
    ],
    nasaConnectionEn: 'ISS cabins shift LED lighting from crisp blue daylight to warm evening tones to protect sleep cycles.',
    nasaConnectionAr: 'تستخدم محطة الفضاء إضاءة LED تتغير ألوانها بين الأزرق النهاري والدافئ المسائي لضبط الساعة البيولوجية للطاقم.',
    nasaBadgeEn: 'ISS Circadian Light',
    nasaBadgeAr: 'إضاءة نوم المحطة'
  },
  {
    id: 'hp_12',
    topic: 'health_physics',
    icon: '🧤',
    questionEn: 'About how many protective layers guard an astronaut inside an EMU spacewalk suit?',
    questionAr: 'كم طبقة تقريباً تحمي رائد الفضاء داخل بدلة السير الفضائي (EMU) من البرد الشديد والحرارة؟',
    correct: {
      labelEn: 'Around 14 engineered layers including water-cooling, insulation & micrometeoroid shielding',
      labelAr: 'حوالي 14 طبقة متكاملة تشمل التبريد بالماء والعزل الحراري وصد النيازك الدقيقة',
      feedbackEn: 'Heroic! 14 smart layers make a spacesuit like a wearable personal spacecraft against +120°C to -150°C!',
      feedbackAr: 'عاش يا بطل! 14 طبقة تخلي البدلة زي مركبة فضائية صغيرة تلبسها وتحميك من +120° إلى -150°م!'
    },
    wrongs: [
      {
        labelEn: 'A single thin cotton T-shirt layer',
        labelAr: 'طبقة قطنية رقيقة واحدة',
        feedbackEn: 'One layer could never survive deep vacuum and extreme cosmic temperatures!',
        feedbackAr: 'الطبقة الواحدة لا تحمي من فراغ الفضاء وتقلبات حرارته القاسية!'
      },
      {
        labelEn: 'Two sheets of cardboard',
        labelAr: 'طبقتان من الورق المقوى',
        feedbackEn: 'A NASA spacesuit is a 14-layer engineering marvel built for extreme survival!',
        feedbackAr: 'بدلة الفضاء من أعقد الملابس الهندسية وتضم 14 طبقة متطورة!'
      },
      {
        labelEn: '100 layers of heavy winter wool',
        labelAr: '100 طبقة من الصوف الشتوي الثقيل',
        feedbackEn: 'About 14 specialized high-tech layers provide agile flexibility plus extreme shielding!',
        feedbackAr: 'بدلة ناسا مكونة من حوالي 14 طبقة متطورة عالية الكفاءة وخفيفة نسبياً!'
      }
    ],
    nasaConnectionEn: 'NASA’s 14-layer EMU blends water-cooling tubing loops with Kevlar and reflective Mylar blankets.',
    nasaConnectionAr: 'تشمل بدلة NASA 14 طبقة منها شبكات أنابيب تبريد مائي ومواد Kevlar وMylar العاكسة.',
    nasaBadgeEn: 'NASA 14-Layer Suit',
    nasaBadgeAr: 'بدلة ناسا 14 طبقة'
  },
  {
    id: 'hp_13',
    topic: 'health_physics',
    icon: '🛡️',
    questionEn: 'During a Moon solar storm, why must command balance limited power between shields & crops?',
    questionAr: 'عند اقتراب عاصفة شمسية في محطة القمر، لماذا تضطر القيادة لموازنة الطاقة بين الدروع والزراعة؟',
    correct: {
      labelEn: 'Emergency power is limited, so crew radiation shields come first alongside crop backup',
      labelAr: 'لأن الطاقة الكهربائية محدودة في الطوارئ ويجب حماية الإنسان أولاً مع خطة دعم للنبات',
      feedbackEn: 'Wise commander decision! Batteries are finite during solar storms—human shields always take priority!',
      feedbackAr: 'قرار قيادي حكيم! البطاريات محدودة أثناء العاصفة، وحماية الطاقم بالدروع أولوية قصوى!'
    },
    wrongs: [
      {
        labelEn: 'Because shields eat green vegetables',
        labelAr: 'لأن الدروع تأكل النباتات الخضراء',
        feedbackEn: 'It is a power budget trade-off splitting electricity between shields and grow lights!',
        feedbackAr: 'الموضوع توزيع طاقة كهربائية محدودة بين أنظمة الحماية والإضاءة!'
      },
      {
        labelEn: 'Because sunlight permanently destroys generators',
        labelAr: 'لأن الشمس تطفئ المولدات للأبد',
        feedbackEn: 'Once the solar storm passes, power allocation returns cleanly to normal!',
        feedbackAr: 'بعد مرور العاصفة تعود الكهرباء بشكل طبيعي في المدار والقاعدة!'
      },
      {
        labelEn: 'So plants take X-ray naps in the dark',
        labelAr: 'لكي تنام النباتات تحت أشعة الإكس',
        feedbackEn: 'The goal is safeguarding human lives first while keeping greenhouses alive safely!',
        feedbackAr: 'هدف الموازنة الحفاظ على الطاقم أولاً دون هلاك المحاصيل الزراعية!'
      }
    ],
    nasaConnectionEn: 'NASA flight directors practice "Load Shedding" to route vital electricity to crew life-support first.',
    nasaConnectionAr: 'تتدرب مراكز تحكم ناسا على "تخفيف الأحمال" (Load Shedding) لتوجيه الكهرباء لأهم الأنظمة الحيوية وقت الطوارئ.',
    nasaBadgeEn: 'NASA Power Trade-off',
    nasaBadgeAr: 'توزيع طاقة الطوارئ'
  },
  {
    id: 'hp_14',
    topic: 'health_physics',
    icon: '🪂',
    questionEn: 'What deploys right before the Orion capsule touches the ocean to slow it gently to rest?',
    questionAr: 'ماذا يفتح قبل ملامسة كبسولة العودة لمياه المحيط لتخفيف السرعة من مئات الكيلومترات للسكون؟',
    correct: {
      labelEn: 'Staged parachutes that open sequentially for a soft ocean splashdown',
      labelAr: 'مظلات هوائية متتابعة تفتح في الهواء لتهبط الكبسولة برفق في المحيط',
      feedbackEn: 'Awesome pilot! Sequenced parachutes float Orion safely into the sea for recovery crews!',
      feedbackAr: 'ممتاز يا بطل! المظلات تفتح على مراحل لتنزل الكبسولة بسلام في المياه وتستقبلها فرق الإنقاذ!'
    },
    wrongs: [
      {
        labelEn: 'Giant paper airplane wings',
        labelAr: 'أجنحة طائرة ورقية ضخمة',
        feedbackEn: 'Capsules like Orion and Dragon rely on a giant multi-stage parachute canopy system!',
        feedbackAr: 'الكبسولات مثل Orion وDragon تعتمد على نظام مظلات عملاق موثق!'
      },
      {
        labelEn: 'Heavy iron train wheels',
        labelAr: 'عجلات قطار حديدية',
        feedbackEn: 'Ocean splashdown cushions the final touchdown using wide orange-and-white parachutes!',
        feedbackAr: 'الهبوط فوق المحيط (Splashdown) يمتص الصدمة بنعومة باستخدام المظلات!'
      },
      {
        labelEn: 'A giant floating cotton pillow in the clouds',
        labelAr: 'وسادة قطنية عملاقة تطفو في السماء',
        feedbackEn: 'Staged aerodynamic parachutes brake descent safely before touching Pacific waters!',
        feedbackAr: 'المظلات الهوائية المتدرجة هي التي تبطئ سرعة السقوط بأمان فوق المحيط!'
      }
    ],
    nasaConnectionEn: 'NASA’s Orion deploys 11 staged parachutes to slow splashdown below 32 km/h in the Pacific Ocean.',
    nasaConnectionAr: 'تستخدم كبسولة Orion 11 مظلة متسلسلة لضمان سرعة هبوط آمنة تقل عن 32 كم/س عند ملامسة المحيط الهادئ.',
    nasaBadgeEn: 'Artemis Splashdown',
    nasaBadgeAr: 'هبوط كبسولة أرتميس'
  }
];

export const SPACE_SCIENCE_QUESTIONS: readonly QuizQuestion[] = buildBalancedBank(RAW_SPACE_SCIENCE, 0);
export const NUTRITION_QUIZ_QUESTIONS: readonly QuizQuestion[] = buildBalancedBank(RAW_NUTRITION_QUIZ, 1);
export const HEALTH_PHYSICS_QUESTIONS: readonly QuizQuestion[] = buildBalancedBank(RAW_HEALTH_PHYSICS, 2);
