import { StationRoomInfo } from '../types/game';

export const STATION_ROOMS: StationRoomInfo[] = [
  {
    id: 'NutritionLab',
    name: 'مختبر التغذية',
    shortCode: 'المرحلة 1',
    subtitle: 'تجهيز وجبات الفضاء المتوازنة وصندوق الشحن',
    description: 'ساعد رائد الفضاء في تعبئة صندوق الطعام بوجبات متوازنة ومغذية، واحذر من قاعدة ممنوع الفتات!',
    isUnlocked: true,
    accentColor: '#38bdf8',
    iconName: 'Apple',
    deckCoordinates: { x: 20, y: 40 }
  },
  {
    id: 'SuitRoom',
    name: 'علوم الفضاء',
    shortCode: 'المرحلة 2',
    subtitle: 'بدلة الفضاء وضغط الأكسجين 4.3 PSI',
    description: 'افحص خوذة الفضاء الذهبية، واضبط منظم الأكسجين، وافحص طبقات الحماية وحبل الأمان!',
    isUnlocked: false,
    unlockRequirement: 'أكمل مرحلة "مختبر التغذية" بنجاح لفتح علوم الفضاء!',
    accentColor: '#00f0ff',
    iconName: 'Shield',
    deckCoordinates: { x: 45, y: 50 }
  },
  {
    id: 'EngineRoom',
    name: 'الصحة وجسم الإنسان',
    shortCode: 'المرحلة 3',
    subtitle: 'تنقية الأكسجين والطاقة الحيوية للرواد',
    description: 'اضخ جهاز تنقية الأكسجين حتى 100% واشحن خلايا الوقود الصاروخي بحذر دون زيادة الحرارة!',
    isUnlocked: false,
    unlockRequirement: 'أكمل مرحلة "علوم الفضاء" بنجاح أولاً!',
    accentColor: '#ff9f1c',
    iconName: 'Zap',
    deckCoordinates: { x: 70, y: 58 }
  },
  {
    id: 'LaunchPad',
    name: 'المهمة النهائية',
    shortCode: 'المرحلة 4',
    subtitle: 'تحدي مضاد دوار الفضاء والانطلاق للقمر 🚀',
    description: 'اشرب عصير الأملاح بمجرد وصول المؤشر للمنطقة الخضراء وانطلق بقوة الصاروخ نحو محطة القمر!',
    isUnlocked: false,
    unlockRequirement: 'أكمل مرحلة "الصحة وجسم الإنسان" لفتح المهمة النهائية!',
    accentColor: '#a855f7',
    iconName: 'Rocket',
    deckCoordinates: { x: 90, y: 68 }
  }
];
