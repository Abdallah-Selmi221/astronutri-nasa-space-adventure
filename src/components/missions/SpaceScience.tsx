import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useGameState } from '../../context/GameContext';
import { AsteroidRadarModal } from './AsteroidRadarModal';
import { PlanetIllustration } from './PlanetIllustration';
import { InteractiveQuizDeck } from '../common/InteractiveQuizDeck';
import { SpaceFlight3DViewport } from '../three/SpaceFlight3DViewport';
import { SPACE_SCIENCE_QUESTIONS } from '../../data/questionBanks';
import { dialogueManager } from '../../utils/geminiTTS';
import { soundManager } from '../../utils/sound';
import { nasaCache } from '../../services/nasa/nasaCache';
import { shuffleArray } from '../../utils/shuffle';
import {
  Rocket,
  Radio,
  Compass,
  Sparkles,
  Scale,
  Check,
  X,
  ArrowLeft,
  ArrowRight,
  ArrowUp
} from 'lucide-react';

interface PlanetChallenge {
  questionAr: string;
  options: { id: string; labelAr: string; isCorrect: boolean; feedbackAr: string }[];
}

interface CelestialWorld {
  id: string;
  nameAr: string;
  englishName: string;
  gravityG: number;
  gravityLabelAr: string;
  jumpHeightPx: number;
  hopDurationSec: number;
  bgGradient: string;
  surfaceColor: string;
  surfaceBorder: string;
  scientificFactAr: string;
  nasaDiscoveryAr: string;
  nasaImage: string;
  badgeAccent: string;
  planetQuestion: PlanetChallenge;
}

const CELESTIAL_WORLDS: CelestialWorld[] = [
  {
    id: 'mercury',
    nameAr: 'عطارد',
    englishName: 'Mercury',
    gravityG: 0.38,
    gravityLabelAr: '0.38G (أقرب كوكب للشمس)',
    jumpHeightPx: 85,
    hopDurationSec: 0.85,
    bgGradient: 'from-stone-950 via-amber-950/60 to-slate-950',
    surfaceColor: 'bg-stone-800/90',
    surfaceBorder: 'border-amber-400',
    scientificFactAr:
      'عطارد هو أصغر كواكب المجموعة الشمسية وأقربها للشمس؛ سطحه مليء بالفوهات الصخرية مثل القمر لأن غلافه الجوي رقيق جداً.',
    nasaDiscoveryAr: 'مركبة NASA MESSENGER التقطت أكثر من 250 ألف صورة واكتشفت آثار جليد داخل فوهات القطبين المظلمة!',
    nasaImage: '/assets/nasa/moon_surface_lroc.jpg',
    badgeAccent: 'text-amber-200 border-amber-300 bg-amber-500/20',
    planetQuestion: {
      questionAr: 'لماذا تكون السماء فوق كوكب عطارد سوداء حتى في وقت النهار؟',
      options: [
        { id: 'a', labelAr: 'لأنه لا يملك غلافاً جوياً سميكاً ينثر ضوء الشمس', isCorrect: true, feedbackAr: 'أحسنت يا بطل! بدون هواء كثيف ينشر الضوء، تبدو السماء مليئة بالنجوم نهاراً!' },
        { id: 'b', labelAr: 'لأن الشمس لا تصل إليه أبداً', isCorrect: false, feedbackAr: 'عطارد أقرب كوكب للشمس! لكنه بلا غلاف جوي سميك!' },
        { id: 'c', labelAr: 'لأنه مغطى بالمحيطات المظلمة', isCorrect: false, feedbackAr: 'فكر تاني! عطارد كوكب صخري جاف بلا محيطات!' },
        { id: 'd', labelAr: 'لأنه يدور خارج مجرة درب التبانة', isCorrect: false, feedbackAr: 'عطارد أول كوكب يدور حول شمسنا مباشرة!' }
      ]
    }
  },
  {
    id: 'venus',
    nameAr: 'الزهرة',
    englishName: 'Venus',
    gravityG: 0.91,
    gravityLabelAr: '0.91G (أكثر الكواكب سخونة)',
    jumpHeightPx: 50,
    hopDurationSec: 0.55,
    bgGradient: 'from-amber-950 via-orange-950 to-slate-950',
    surfaceColor: 'bg-amber-900/90',
    surfaceBorder: 'border-orange-400',
    scientificFactAr:
      'الزهرة هو الكوكب الأكثر سخونة في المجموعة الشمسية (أكثر من 460°م) بسبب غلافه الكثيف من ثاني أكسيد الكربون الذي يحبس الحرارة.',
    nasaDiscoveryAr: 'تستعد مهمة NASA DAVINCI لإرسال مسبار يخترق السحب الذهبية للزهرة لتحليل غازاته!',
    nasaImage: '/assets/nasa/apod_sample.jpg',
    badgeAccent: 'text-orange-200 border-orange-300 bg-orange-500/20',
    planetQuestion: {
      questionAr: 'ما السبب الرئيسي الذي يجعل الزهرة أسخن من عطارد رغم أنه أبعد عن الشمس؟',
      options: [
        { id: 'a', labelAr: 'لأنه يمتلك حلقات جليدية تحرقه', isCorrect: false, feedbackAr: 'الزهرة ليس له حلقات يا بطل، الجواب في سحبه الكثيفة!' },
        { id: 'b', labelAr: 'غلافه الجوي السميك جداً يحبس الحرارة كالدفيئة', isCorrect: true, feedbackAr: 'عبقري الفضاء! ظاهرة الاحتباس الحراري تجعله الكوكب الأشد حرارة!' },
        { id: 'c', labelAr: 'لأنه أصغر حجماً من القمر', isCorrect: false, feedbackAr: 'الزهرة حجمه قريب جداً من حجم الأرض!' },
        { id: 'd', labelAr: 'لوجود محيطات حارة تغطي 100% من سطحه', isCorrect: false, feedbackAr: 'الماء لا يبقى سائلاً على سطح الزهرة الشديد الحرارة!' }
      ]
    }
  },
  {
    id: 'earth',
    nameAr: 'الأرض',
    englishName: 'Earth',
    gravityG: 1.0,
    gravityLabelAr: '1.0G (جاذبية مثالية 9.8 م/ث²)',
    jumpHeightPx: 45,
    hopDurationSec: 0.5,
    bgGradient: 'from-blue-950 via-sky-900 to-indigo-950',
    surfaceColor: 'bg-emerald-900/85',
    surfaceBorder: 'border-emerald-400',
    scientificFactAr:
      'كوكبنا الأزرق الجميل، الكوكب الوحيد المعروف بوجود ماء سائل على سطحه وغلاف جوي غني بالأكسجين يحمي الحياة.',
    nasaDiscoveryAr: 'قمر NASA DSCOVR EPIC يراقب الكوكب الأزرق يومياً لحماية المناخ والغلاف الجوي.',
    nasaImage: '/assets/nasa/earth_blue_marble.jpg',
    badgeAccent: 'text-emerald-200 border-emerald-300 bg-emerald-500/20',
    planetQuestion: {
      questionAr: 'ما النسبة التقريبية التي يغطيها الماء من سطح كوكب الأرض الأزرق؟',
      options: [
        { id: 'a', labelAr: 'فقط 5% مثل المريخ', isCorrect: false, feedbackAr: 'المياه تغطي معظم كوكبنا! فكر في نسبة قريبة من ثلاثة أرباع الكوكب!' },
        { id: 'b', labelAr: '100% ثلوج بدون يابسة', isCorrect: false, feedbackAr: 'توجد قارات واسعة بجانب البحار والمحيطات!' },
        { id: 'c', labelAr: 'حوالي 71% محيطات ومياه سائلة', isCorrect: true, feedbackAr: 'ممتاز! عشان كده أطلقت ناسا على الأرض لقب «الكرة الزرقاء»!' },
        { id: 'd', labelAr: '0% ماء لأن الأرض كوكب غازي', isCorrect: false, feedbackAr: 'الأرض كوكب صخري غني بالمحيطات والأنهار!' }
      ]
    }
  },
  {
    id: 'moon',
    nameAr: 'القمر',
    englishName: 'The Moon',
    gravityG: 0.16,
    gravityLabelAr: '0.16G (سُدس جاذبية الأرض)',
    jumpHeightPx: 120,
    hopDurationSec: 1.2,
    bgGradient: 'from-slate-950 via-slate-900 to-indigo-950',
    surfaceColor: 'bg-slate-800/90',
    surfaceBorder: 'border-slate-300',
    scientificFactAr:
      'الجاذبية على القمر خفيفة جداً (سُدس الأرض فقط)، لذلك يقفز رواد الفضاء عالياً وببطء ممتع!',
    nasaDiscoveryAr: 'مركبة NASA LRO رسمت خرائط فوهة شاكلتون بالقطب الجنوبي لاكتشاف الجليد المائي لمهمة أرتميس.',
    nasaImage: '/assets/nasa/moon_surface_lroc.jpg',
    badgeAccent: 'text-yellow-200 border-yellow-300 bg-yellow-500/20',
    planetQuestion: {
      questionAr: 'كم تبلغ جاذبية القمر مقارنة بكوكب الأرض؟',
      options: [
        { id: 'a', labelAr: 'نفس جاذبية الأرض بالضبط', isCorrect: false, feedbackAr: 'جرب زر القفز فوق ولاحظ مدى ارتفاع قفزة روبو على القمر!' },
        { id: 'b', labelAr: 'أقوى من المشتري', isCorrect: false, feedbackAr: 'المشتري أضخم كوكب وجاذبيته شديدة، بينما القمر خفيف جداً!' },
        { id: 'c', labelAr: 'ثلاثة أضعاف جاذبية الأرض', isCorrect: false, feedbackAr: 'بالعكس! جاذبية القمر أقل بكثير من جاذبية الأرض!' },
        { id: 'd', labelAr: 'سُدس جاذبية الأرض (0.16G)', isCorrect: true, feedbackAr: 'صحيح! ولذلك تستطيع القفز على القمر 6 مرات أعلى من الأرض!' }
      ]
    }
  },
  {
    id: 'mars',
    nameAr: 'المريخ',
    englishName: 'Mars',
    gravityG: 0.38,
    gravityLabelAr: '0.38G (الكوكب الأحمر)',
    jumpHeightPx: 85,
    hopDurationSec: 0.85,
    bgGradient: 'from-orange-950 via-red-950 to-slate-950',
    surfaceColor: 'bg-amber-900/90',
    surfaceBorder: 'border-orange-500',
    scientificFactAr:
      'الكوكب الأحمر غني بأكسيد الحديد (الصدأ)، ويضم جبل «أوليمبوس مونس» أكبر بركان في المجموعة الشمسية بارتفاع 22 كم!',
    nasaDiscoveryAr: 'تتجول عربة NASA Perseverance حالياً لتحليل صخور المريخ والبحث عن آثار بحيرات قديمة.',
    nasaImage: '/assets/nasa/apod_sample.jpg',
    badgeAccent: 'text-orange-200 border-orange-300 bg-orange-500/20',
    planetQuestion: {
      questionAr: 'ما الذي يمنح رمال كوكب المريخ لونها الأحمر المميز؟',
      options: [
        { id: 'a', labelAr: 'غبار أكسيد الحديد (الصدأ)', isCorrect: true, feedbackAr: 'عبقري المريخ! الصدأ الأحمر يغطي صحراء الكوكب الأحمر بالكامل!' },
        { id: 'b', labelAr: 'أشجار الفراولة الحمراء', isCorrect: false, feedbackAr: 'لا توجد غابات حالياً على سطح المريخ البارد!' },
        { id: 'c', labelAr: 'حمم بركانية مشتعلة دائماً', isCorrect: false, feedbackAr: 'براكين المريخ خامدة منذ ملايين السنين!' },
        { id: 'd', labelAr: 'أضواء ليزر من الأقمار الصناعية', isCorrect: false, feedbackAr: 'اللون طبيعي وموجود في صخور وتربة الكوكب نفسها!' }
      ]
    }
  },
  {
    id: 'jupiter',
    nameAr: 'المشتري',
    englishName: 'Jupiter',
    gravityG: 2.53,
    gravityLabelAr: '2.53G (جاذبية عملاقة هائلة)',
    jumpHeightPx: 18,
    hopDurationSec: 0.32,
    bgGradient: 'from-stone-950 via-amber-950 to-indigo-950',
    surfaceColor: 'bg-stone-900/90',
    surfaceBorder: 'border-amber-500',
    scientificFactAr:
      'أكبر كواكب المجموعة الشمسية؛ جاذبيته تعادل ضعفين ونصف جاذبية الأرض وتدور فيه «البقعة الحمراء العظيمة».',
    nasaDiscoveryAr: 'تدور مركبة NASA Juno حول المشتري لدراسة عواصفه العملاقة وأقماره الجليدية مثل أوروبا.',
    nasaImage: '/assets/nasa/apod_sample.jpg',
    badgeAccent: 'text-rose-200 border-rose-300 bg-rose-500/20',
    planetQuestion: {
      questionAr: 'ما هي «البقعة الحمراء العظيمة» الشهيرة على كوكب المشتري؟',
      options: [
        { id: 'a', labelAr: 'قارة صخرية مزروعة بالقمح', isCorrect: false, feedbackAr: 'المشتري كوكب غازي عملاق ليس له قارات صخرية!' },
        { id: 'b', labelAr: 'عاصفة إعصارية عملاقة أكبر من حجم الأرض تدور منذ قرون', isCorrect: true, feedbackAr: 'إجابة رائعة! هي أكبر عاصفة مرصودة في المجموعة الشمسية!' },
        { id: 'c', labelAr: 'محطة وقود قديمة لرواد الفضاء', isCorrect: false, feedbackAr: 'فكر في الطقس والعواصف الغازية الهائلة!' },
        { id: 'd', labelAr: 'فوهة بركان مليئة بالجليد الأزرق', isCorrect: false, feedbackAr: 'إنها دوامة سحب ورياح شديدة السرعة لا تتوقف!' }
      ]
    }
  },
  {
    id: 'saturn',
    nameAr: 'زحل',
    englishName: 'Saturn',
    gravityG: 1.06,
    gravityLabelAr: '1.06G (ذو الحلقات الجليدية)',
    jumpHeightPx: 42,
    hopDurationSec: 0.48,
    bgGradient: 'from-amber-950 via-yellow-950 to-slate-950',
    surfaceColor: 'bg-yellow-950/90',
    surfaceBorder: 'border-yellow-400',
    scientificFactAr:
      'عملاق غازي رائع تزينه حلقات ذهبية واسعة تتكون من مليارات قطع الجليد والصخور الدوارة حوله.',
    nasaDiscoveryAr: 'اكتشفت مركبة NASA Cassini ينابيع ماء جليدية تنطلق من قمره إنسيلادوس!',
    nasaImage: '/assets/nasa/apod_sample.jpg',
    badgeAccent: 'text-amber-200 border-amber-300 bg-amber-500/20',
    planetQuestion: {
      questionAr: 'مِمَّ تتكون حلقات كوكب زحل اللامعة التي نراها بالتلسكوب؟',
      options: [
        { id: 'a', labelAr: 'طوق حديدي صلب مصبوب في قطعة واحدة', isCorrect: false, feedbackAr: 'ليست قطعة واحدة صلبة؛ إنها مليارات القطع المنفصلة!' },
        { id: 'b', labelAr: 'شرارات نار مشتعلة', isCorrect: false, feedbackAr: 'الفضاء الخارجي بارد جداً؛ الحلقات جليدية وليست ناراً!' },
        { id: 'c', labelAr: 'مليارات قطع الجليد والصخور الدوارة التي تعكس ضوء الشمس', isCorrect: true, feedbackAr: 'بطل زحل! قطع الجليد النظيفة تعكس ضوء الشمس كالمرآة!' },
        { id: 'd', labelAr: 'سحب من دخان المصانع الأرضية', isCorrect: false, feedbackAr: 'حلقات زحل طبيعية بالكامل منذ نشأة المجموعة الشمسية!' }
      ]
    }
  },
  {
    id: 'asteroid_2010pk',
    nameAr: 'كويكب 2010 PK',
    englishName: 'Asteroid 2010 PK',
    gravityG: 0.001,
    gravityLabelAr: 'انعدام جاذبية تقريباً (رادار NeoWs)',
    jumpHeightPx: 145,
    hopDurationSec: 1.5,
    bgGradient: 'from-purple-950 via-slate-950 to-black',
    surfaceColor: 'bg-zinc-900/90',
    surfaceBorder: 'border-cyan-400',
    scientificFactAr:
      'كويكب حقيقي ترصده ناسا باستمرار بقطر ~164 متراً وسرعة ~14.8 كم/ث، ويمر بأمان بعيداً عن الأرض!',
    nasaDiscoveryAr: 'بيانات NASA NeoWs المباشرة تحسب مسافة مروره (أكثر من 19 ضعف مسافة القمر) بدقة عالية.',
    nasaImage: '/assets/nasa/apod_sample.jpg',
    badgeAccent: 'text-cyan-200 border-cyan-300 bg-cyan-500/20',
    planetQuestion: {
      questionAr: 'وفق رادار ناسا الحي لكويكب 2010 PK، هل يمثل خطراً على كوكب الأرض؟',
      options: [
        { id: 'a', labelAr: 'نعم، سيهبط في منتصف ملعب كرة قدم غداً', isCorrect: false, feedbackAr: 'بيانات NeoWs الحية تؤكد أن مساره بعيد جداً وآمن 100%!' },
        { id: 'b', labelAr: 'يتجمد في مكانه ولا يتحرك في الفضاء', isCorrect: false, feedbackAr: 'الكويكب يتحرك بسرعة تقارب 14.8 كم في الثانية!' },
        { id: 'c', labelAr: 'يدور داخل الغلاف الجوي للأرض كل ساعة', isCorrect: false, feedbackAr: 'مسافة مروره بعيدة جداً وتتفوق على 19 ضعف بعد القمر!' },
        { id: 'd', labelAr: 'لا، يمر بأمان تام على بعد يزيد عن 19 ضعف مسافة القمر', isCorrect: true, feedbackAr: 'ممتاز يا مراقب ناسا! الكويكب في مسار آمن وبعيد تماماً!' }
      ]
    }
  }
];

export interface SpaceScienceProps {
  onComplete?: () => void;
}

export const SpaceScience: React.FC<SpaceScienceProps> = ({ onComplete: _onComplete }) => {
  const { state, setLocation } = useGameState();
  const [activeWorld, setActiveWorld] = useState<CelestialWorld>(CELESTIAL_WORLDS[2]); // Start warmly on Earth
  const [scienceTab, setScienceTab] = useState<'explore' | 'flight' | 'quiz'>('explore');
  const [isRadarOpen, setIsRadarOpen] = useState<boolean>(false);
  const [roboPosX, setRoboPosX] = useState<number>(50);
  const [isJumping, setIsJumping] = useState<boolean>(false);
  const [completedWorlds, setCompletedWorlds] = useState<Set<string>>(new Set());
  const [planetAnswers, setPlanetAnswers] = useState<Record<string, { optionId: string; isCorrect: boolean }>>({});
  const [quizSolvedCount, setQuizSolvedCount] = useState<number>(0);

  const terrainRef = useRef<HTMLDivElement>(null);
  const mapTopRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const speech = `أهلاً بك على ${activeWorld.nameAr}! ${activeWorld.scientificFactAr}`;
    void dialogueManager.speak(speech);
  }, [activeWorld]);

  const handleSelectWorld = (world: CelestialWorld) => {
    soundManager.playClick();
    setActiveWorld(world);
    setRoboPosX(50);
  };

  const handleTriggerJump = () => {
    if (isJumping) return;
    soundManager.playBoing();
    setIsJumping(true);
    setTimeout(() => setIsJumping(false), activeWorld.hopDurationSec * 1000);
  };

  const handleMoveRoboStep = (deltaPercent: number) => {
    soundManager.playClick();
    setRoboPosX((prev) => Math.max(14, Math.min(86, prev + deltaPercent)));
  };

  const handleTerrainClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement)?.closest('button')) return;
    if (!terrainRef.current) return;
    const rect = terrainRef.current.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 100;
    setRoboPosX(Math.max(14, Math.min(86, clickX)));
    handleTriggerJump();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (scienceTab !== 'explore') return;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        setRoboPosX((prev) => Math.min(86, prev + 6));
      } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        setRoboPosX((prev) => Math.max(14, prev - 6));
      } else if (e.code === 'Space' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        handleTriggerJump();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeWorld, scienceTab]);

  const handleAnswerPlanetQuestion = (opt: PlanetChallenge['options'][number]) => {
    soundManager.playClick();
    setPlanetAnswers((prev) => ({
      ...prev,
      [activeWorld.id]: { optionId: opt.id, isCorrect: opt.isCorrect }
    }));

    if (opt.isCorrect) {
      soundManager.playDropSuccess();
      setCompletedWorlds((prev) => new Set([...prev, activeWorld.id]));
      void dialogueManager.speak('إجابة عبقرية! بطل ناسا الحقيقي ممتاز جداً!');
    } else {
      soundManager.playAlertSiren();
      void dialogueManager.speak('قربت جداً يا بطل! فكر تاني وجرب الخيار الصح!');
    }
  };

  const handleExploreNextPlanet = () => {
    soundManager.playClick();
    const unvisited = CELESTIAL_WORLDS.find((w) => w.id !== activeWorld.id && !completedWorlds.has(w.id));
    const currentIdx = CELESTIAL_WORLDS.findIndex((w) => w.id === activeWorld.id);
    const nextWorld = unvisited || CELESTIAL_WORLDS[(currentIdx + 1) % CELESTIAL_WORLDS.length];
    handleSelectWorld(nextWorld);
    mapTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleProceedNextStage = () => {
    soundManager.playFanfare();
    if (state.unlockedRooms.includes('LunarDashboard')) {
      setLocation('LunarDashboard');
    } else {
      setLocation('Map');
    }
  };

  const liveAsteroid = nasaCache.getAsteroid('3542519');
  const sampleKidWeightOnWorld = Math.round(30 * activeWorld.gravityG * 10) / 10;
  const shuffledPlanetOptions = useMemo(
    () => shuffleArray(activeWorld.planetQuestion.options),
    [activeWorld.id]
  );
  const activeAnswer = planetAnswers[activeWorld.id];
  const selectedOption = activeAnswer
    ? shuffledPlanetOptions.find((o) => o.id === activeAnswer.optionId)
    : undefined;

  return (
    <div
      className={`relative w-full min-h-screen flex flex-col gap-4 overflow-x-hidden select-none pt-20 pb-8 px-3 sm:px-6 lg:px-8 bg-gradient-to-b ${activeWorld.bgGradient} transition-colors duration-700`}
      dir="rtl"
    >
      {/* Clean Subtle Cosmic Background */}
      <div className="fixed inset-0 space-stars opacity-65 pointer-events-none" />

      {/* 1. CLEAN HEADER & MODE SWITCHER */}
      <div ref={mapTopRef} className="relative z-10 w-full max-w-6xl mx-auto flex flex-col gap-4">
        <div className="casual-card p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <PlanetIllustration planetId={activeWorld.id} size={52} />
            <div>
              <h1 className="font-hud font-black text-xl sm:text-2xl text-white flex items-center gap-2 flex-wrap">
                <span>أكاديمية الكواكب والجاذبية</span>
                <span className={`text-xs px-3 py-0.5 rounded-full border ${activeWorld.badgeAccent}`}>
                  {activeWorld.nameAr}
                </span>
              </h1>
              <p className="text-xs sm:text-sm font-hud font-bold text-cyan-200 mt-0.5">
                {activeWorld.gravityLabelAr} • الكواكب المكتملة: {completedWorlds.size} / {CELESTIAL_WORLDS.length}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setIsRadarOpen(true)}
              className="casual-btn-cyan py-2.5 px-4 text-xs sm:text-sm flex items-center gap-2 cursor-pointer"
            >
              <Radio className="w-4 h-4 animate-pulse" />
              <span>رادار كويكب ناسا 2010 PK 📡</span>
            </button>

            <button
              type="button"
              onClick={handleProceedNextStage}
              className="casual-btn-primary py-2.5 px-4 text-xs sm:text-sm flex items-center gap-2 cursor-pointer"
            >
              <Rocket className="w-4 h-4" />
              <span>
                {state.unlockedRooms.includes('LunarDashboard')
                  ? 'الانتقال لمستعمرة القمر 🌙'
                  : 'العودة لاستكمال تجهيز الرحلة 🚀'}
              </span>
            </button>
          </div>
        </div>

        {/* Mode Tabs */}
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              setScienceTab('explore');
            }}
            className={`px-5 py-2.5 rounded-2xl font-hud font-black text-xs sm:text-sm transition-all cursor-pointer ${
              scienceTab === 'explore'
                ? 'casual-btn-cyan'
                : 'bg-slate-900/80 text-slate-200 border-2 border-white/20 hover:bg-slate-800'
            }`}
          >
            🪐 خريطة المجموعة الشمسية واستكشاف الكواكب
          </button>
          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              setScienceTab('flight');
            }}
            className={`px-5 py-2.5 rounded-2xl font-hud font-black text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-2 ${
              scienceTab === 'flight'
                ? 'casual-btn-cyan'
                : 'bg-slate-900/80 text-slate-200 border-2 border-white/20 hover:bg-slate-800'
            }`}
          >
            <Rocket className="w-4 h-4" />
            <span>🛸 الطيران الحر بين الكواكب 3D</span>
          </button>
          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              setScienceTab('quiz');
            }}
            className={`px-5 py-2.5 rounded-2xl font-hud font-black text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-2 ${
              scienceTab === 'quiz'
                ? 'casual-btn-primary'
                : 'bg-slate-900/80 text-slate-200 border-2 border-white/20 hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>🧠 تحدي أسئلة الفضاء ({SPACE_SCIENCE_QUESTIONS.length} سؤال)</span>
            {quizSolvedCount >= 3 && <span className="text-emerald-200">✅</span>}
          </button>
        </div>

        {/* INTERACTIVE TRANSPARENT PLANET SELECTOR MAP (8 CELESTIAL BODIES, ZERO BOXES, RESPONSIVE GRID) */}
        {scienceTab !== 'quiz' && (
          <div className="relative py-2 px-1">
            <div className="grid grid-cols-4 lg:grid-cols-8 gap-2 sm:gap-3 items-end relative">
              {/* Soft Orbit Line Behind Transparent Planets */}
              <div className="hidden lg:block absolute left-8 right-8 top-9 h-0.5 bg-gradient-to-r from-amber-300/35 via-cyan-300/45 to-purple-300/35 pointer-events-none rounded-full" />

              {CELESTIAL_WORLDS.map((world) => {
                const isSelected = activeWorld.id === world.id;
                const isSolved = completedWorlds.has(world.id);

                return (
                  <motion.button
                    key={world.id}
                    type="button"
                    whileHover={{ scale: 1.12, y: -4 }}
                    whileTap={{ scale: 0.94 }}
                    onClick={() => handleSelectWorld(world)}
                    className="relative z-10 flex flex-col items-center gap-1.5 bg-transparent border-0 p-1 cursor-pointer group focus:outline-none"
                  >
                    <div
                      className={`relative flex items-center justify-center rounded-full transition-all duration-300 ${
                        isSelected
                          ? 'scale-115 drop-shadow-[0_0_22px_rgba(34,211,238,0.9)]'
                          : 'opacity-85 group-hover:opacity-100'
                      }`}
                    >
                      <PlanetIllustration planetId={world.id} size={isSelected ? 74 : 62} />
                      {isSolved && (
                        <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-black border-2 border-white shadow-md">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </span>
                      )}
                    </div>
                    <span
                      className={`font-hud font-black text-xs sm:text-sm px-2.5 py-0.5 rounded-full transition-colors ${
                        isSelected
                          ? 'bg-cyan-400 text-slate-950 shadow'
                          : 'text-slate-100 group-hover:text-cyan-200'
                      }`}
                    >
                      {world.nameAr}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {scienceTab === 'quiz' ? (
        <div className="relative z-10 w-full max-w-4xl mx-auto my-2 flex-1">
          <InteractiveQuizDeck
            questions={SPACE_SCIENCE_QUESTIONS}
            titleAr="اختبار أبطال الفضاء من ناسا"
            subtitleAr="اختبر معلوماتك عن عطارد، الزهرة، المريخ، حلقات زحل، وكويكب 2010 PK!"
            accent="cyan"
            milestoneCount={3}
            onMilestoneComplete={(score) => setQuizSolvedCount(score)}
          />
        </div>
      ) : (
        <div className="relative z-10 w-full max-w-6xl mx-auto flex flex-col gap-4">
          {scienceTab === 'flight' ? (
            <SpaceFlight3DViewport
              activePlanetId={activeWorld.id}
              onSelectPlanetId={(pid) => {
                const match = CELESTIAL_WORLDS.find((w) => w.id === pid);
                if (match) handleSelectWorld(match);
              }}
            />
          ) : (
            <>
              {/* 2. UNCLUTTERED 2.5D CARTOON SURFACE VIEWPORT WITH TOUCH + KEYBOARD PAD */}
              <div
                ref={terrainRef}
                onClick={handleTerrainClick}
                className="relative w-full h-[340px] sm:h-[400px] rounded-3xl border-4 border-cyan-300/80 overflow-hidden shadow-[0_0_40px_rgba(6,182,212,0.28)] bg-gradient-to-b from-transparent via-black/35 to-black/80 flex flex-col justify-end cursor-pointer"
              >
            {/* Top-Right Compact Gravity Weight Comparator Badge */}
            <div className="absolute top-4 right-4 z-20 casual-pill px-4 py-2 flex items-center gap-2 text-xs sm:text-sm font-hud font-black text-amber-200 pointer-events-none">
              <Scale className="w-4 h-4 text-amber-300 shrink-0" />
              <span>
                وزن 30 كجم على الأرض = <strong className="text-white">{sampleKidWeightOnWorld} كجم</strong> على {activeWorld.nameAr}
              </span>
            </div>

            {/* Floating Transparent Celestial Planet in Sky */}
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute top-6 left-8 pointer-events-none opacity-95"
            >
              <PlanetIllustration planetId={activeWorld.id} size={96} />
            </motion.div>

            {/* Interactive Chibi Robo Character */}
            <div
              className="absolute bottom-20 transition-all duration-300 pointer-events-none"
              style={{ left: `${roboPosX}%`, transform: 'translateX(-50%)' }}
            >
              <motion.div
                animate={
                  isJumping
                    ? {
                        y: -activeWorld.jumpHeightPx,
                        rotate: [0, -8, 8, 0],
                        scale: [1, 1.12, 0.96, 1]
                      }
                    : { y: [0, -4, 0] }
                }
                transition={{
                  duration: isJumping ? activeWorld.hopDurationSec : 1.4,
                  ease: isJumping ? 'easeOut' : 'easeInOut',
                  repeat: isJumping ? 0 : Infinity
                }}
                className="flex flex-col items-center"
              >
                <img
                  src="/assets/generated/characters/robo_chibi_sprite.png"
                  alt="روبو"
                  className="w-20 h-20 sm:w-24 sm:h-24 object-contain drop-shadow-[0_10px_18px_rgba(0,0,0,0.85)]"
                />
                <motion.div
                  animate={isJumping ? { scale: 0.35, opacity: 0.2 } : { scale: 1, opacity: 0.6 }}
                  transition={{ duration: activeWorld.hopDurationSec }}
                  className="w-16 h-3.5 rounded-full bg-black/60 blur-[2px] mt-1"
                />
              </motion.div>
            </div>

            {/* Surface Deck with On-Screen Robo Touch & Keyboard Controls */}
            <div
              className={`w-full min-h-[76px] py-2 ${activeWorld.surfaceColor} border-t-4 ${activeWorld.surfaceBorder} flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 shadow-2xl relative z-10`}
            >
              <div className="flex items-center gap-2 text-white font-hud font-black text-xs sm:text-sm">
                <Compass className="w-4 h-4 text-cyan-300 shrink-0" />
                <span>سطح {activeWorld.nameAr} • الجاذبية: {activeWorld.gravityG}G</span>
              </div>

              {/* Intuitive Touch + Keyboard Control Pad */}
              <div className="flex items-center gap-2" dir="ltr">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMoveRoboStep(-10);
                  }}
                  className="p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border-2 border-cyan-300 text-white cursor-pointer"
                  aria-label="تحريك لليسار"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTriggerJump();
                  }}
                  className="casual-btn-primary py-2 px-4 text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowUp className="w-4 h-4" />
                  <span>اقفز [SPACE] 🚀</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMoveRoboStep(10);
                  }}
                  className="p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border-2 border-cyan-300 text-white cursor-pointer"
                  aria-label="تحريك لليمين"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
            </>
          )}

          {/* 3. FOCUSED PER-PLANET LESSON + INTERACTIVE CHALLENGE (MAX 2 CARDS, GENEROUS GAP-4) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
            {/* Left/Top Lesson + Real NASA Photo Card (5 Cols) */}
            <div className="lg:col-span-5 casual-card p-4 flex flex-col justify-between gap-4">
              <div className="flex items-center gap-3">
                <PlanetIllustration planetId={activeWorld.id} size={48} />
                <div>
                  <h2 className="font-hud font-black text-base sm:text-lg text-white">
                    بطاقة استكشاف {activeWorld.nameAr}
                  </h2>
                  <p className="text-xs text-cyan-200 font-bold">{activeWorld.englishName}</p>
                </div>
              </div>

              <div className="rounded-2xl overflow-hidden border-2 border-cyan-300/50 h-36 bg-slate-950">
                <img
                  src={activeWorld.nasaImage}
                  alt={`صورة ناسا لـ ${activeWorld.nameAr}`}
                  onError={(e) => {
                    const img = e.currentTarget as HTMLImageElement;
                    if (!img.dataset.fallbackApplied) {
                      img.dataset.fallbackApplied = '1';
                      img.src = '/assets/nasa/apod_sample.jpg';
                    }
                  }}
                  className="w-full h-full object-cover"
                />
              </div>

              <p className="font-hud font-bold text-xs sm:text-sm text-white leading-relaxed">
                {activeWorld.scientificFactAr}
              </p>

              <div className="rounded-2xl bg-slate-950/75 border border-cyan-400/35 p-3 text-xs font-hud font-bold text-cyan-200 leading-relaxed">
                🛰️ <strong>رصد ناسا:</strong> {activeWorld.nasaDiscoveryAr}
                {activeWorld.id === 'asteroid_2010pk' && (
                  <span className="block mt-1 text-amber-200">
                    سرعة الكويكب: {Math.round(liveAsteroid.relativeVelocityKmS * 10) / 10} كم/ث • القطر: {Math.round(liveAsteroid.diameterMeters.max)} م
                  </span>
                )}
              </div>
            </div>

            {/* Right Focused Interactive Planet Question + Continuation Choice (7 Cols) */}
            <div className="lg:col-span-7 casual-card p-4 sm:p-5 flex flex-col justify-between gap-4">
              <div className="space-y-3">
                <span className="casual-badge inline-flex items-center gap-1.5 px-3 py-1 text-xs font-hud font-black">
                  🎯 سؤال محطة {activeWorld.nameAr}
                </span>
                <h3 className="font-hud font-black text-base sm:text-xl text-white leading-relaxed">
                  {activeWorld.planetQuestion.questionAr}
                </h3>

                <div className="space-y-2.5 pt-1">
                  {shuffledPlanetOptions.map((opt, optIdx) => {
                    const isPicked = activeAnswer?.optionId === opt.id;
                    const showGood = isPicked && opt.isCorrect;
                    const showBad = isPicked && !opt.isCorrect;
                    const revealGood = Boolean(activeAnswer?.isCorrect) && opt.isCorrect;
                    const badgeLetter = ['أ', 'ب', 'ج', 'د'][optIdx] || String(optIdx + 1);

                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleAnswerPlanetQuestion(opt)}
                        className={`w-full text-right p-3.5 rounded-2xl border-2 border-b-4 font-hud font-bold text-sm sm:text-base transition-all cursor-pointer flex items-center justify-between gap-3 active:translate-y-0.5 ${
                          showGood || revealGood
                            ? 'bg-emerald-500/35 border-emerald-300 text-white shadow-[0_4px_0_#047857]'
                            : showBad
                            ? 'bg-rose-500/35 border-rose-300 text-rose-100 shadow-[0_4px_0_#9f1239]'
                            : 'bg-slate-900/85 hover:bg-indigo-900/75 border-white/25 hover:border-cyan-300 text-slate-100 shadow-[0_4px_0_rgba(15,23,42,0.95)]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-400 to-indigo-500 border border-white/60 text-slate-950 font-black text-xs flex items-center justify-center shrink-0 shadow-sm">
                            {badgeLetter}
                          </span>
                          <span>{opt.labelAr}</span>
                        </div>
                        {(showGood || revealGood) && <Check className="w-5 h-5 text-emerald-300 shrink-0" />}
                        {showBad && <X className="w-5 h-5 text-rose-300 shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                {selectedOption && (
                  <div
                    className={`rounded-2xl p-3.5 border-2 font-hud font-bold text-xs sm:text-sm ${
                      selectedOption.isCorrect
                        ? 'bg-emerald-950/65 border-emerald-400/70 text-emerald-100'
                        : 'bg-amber-950/65 border-amber-400/70 text-amber-100'
                    }`}
                  >
                    💡 {selectedOption.feedbackAr}
                  </div>
                )}
              </div>

              {/* Post-Answer Continuation Choice Prompt */}
              {activeAnswer?.isCorrect && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl bg-gradient-to-r from-cyan-950/90 to-emerald-950/90 border-2 border-cyan-300/70 p-4 space-y-3"
                >
                  <p className="font-hud font-black text-sm sm:text-base text-white">
                    🎉 رائع يا رائد الفضاء! ماذا تريد أن تفعل الآن؟
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={handleExploreNextPlanet}
                      className="casual-btn-cyan px-4 py-2.5 text-xs sm:text-sm cursor-pointer"
                    >
                      استكشاف كوكب آخر 🪐
                    </button>
                    <button
                      type="button"
                      onClick={handleProceedNextStage}
                      className="casual-btn-primary px-4 py-2.5 text-xs sm:text-sm cursor-pointer"
                    >
                      إكمال المهمة والانتقال للمرحلة التالية 🚀
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* NASA Asteroid Radar Modal */}
      <AsteroidRadarModal
        isOpen={isRadarOpen}
        onClose={() => setIsRadarOpen(false)}
      />
    </div>
  );
};

export default SpaceScience;
