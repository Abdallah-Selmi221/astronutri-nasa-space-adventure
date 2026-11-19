export interface SpaceDiscoveryFact {
  id: string;
  badgeIcon: string;
  titleEn: string;
  titleAr: string;
  summaryEn: string;
  summaryAr: string;
  nasaSource: string;
  starReward: number;
}

export const EARTH_L1_KIOSKS: SpaceDiscoveryFact[] = [
  {
    id: 'kiosk_earth_food',
    badgeIcon: '🍯',
    titleEn: 'Sinai Space Honey & Nutrition Dome',
    titleAr: 'قبة تغذية الفضاء وعسل سيناء',
    summaryEn:
      'NASA astronauts eat thermostabilized & freeze-dried meals packed in light pouches. Pure Sinai honey gives fast energy, minerals, and antioxidants without spoiling!',
    summaryAr:
      'يتناول رواد ناسا وجبات مجففة بالتجميد أو معبأة في أكياس خفيفة. يمنح عسل سيناء النقي طاقة سريعة ومعادن مفيدة ولا يفسد في الفضاء!',
    nasaSource: 'NASA Space Food Systems',
    starReward: 15
  },
  {
    id: 'kiosk_earth_suit',
    badgeIcon: '🧑‍🚀',
    titleEn: 'SPACE-FIT X Pressure & Cooling Layers',
    titleAr: 'طبقات الضغط والتبريد في بدلة الفضاء',
    summaryEn:
      'An EVA spacesuit works like a miniature spaceship! Pressurized to ~4.3 PSI for mobility, it circulates cool water around the astronaut so body heat stays safe in sunlight.',
    summaryAr:
      'تعمل بدلة السير الفضائي كمركبة فضائية مصغرة! بضغط 4.3 رطل/بوصة لحرية الحركة، وتضخ ماءً بارداً لحماية الرائد من حرارة الشمس الشديدة.',
    nasaSource: 'NASA xEMU Suit Architecture',
    starReward: 15
  },
  {
    id: 'kiosk_earth_rocket',
    badgeIcon: '🚀',
    titleEn: 'Artemis SLS Rocket Overlook',
    titleAr: 'منصة متابعة صاروخ أرتميس العملاق',
    summaryEn:
      'Standing over 98 meters tall, the Artemis SLS rocket uses twin solid boosters plus liquid hydrogen engines to lift Orion astronauts beyond Earth gravity to the Moon!',
    summaryAr:
      'بارتفاع يفوق 98 متراً، يجمع صاروخ أرتميس بين معززين صلبين ومحركات الهيدروجين السائل لإطلاق كبسولة أوريون نحو القمر!',
    nasaSource: 'NASA Artemis Program',
    starReward: 15
  }
];

export const HUB_MUSEUM_FACTS: SpaceDiscoveryFact[] = [
  {
    id: 'museum_1_gravity',
    badgeIcon: '🌍',
    titleEn: 'Earth 1.0G -> Moon 0.16G Training',
    titleAr: 'التدريب من جاذبية الأرض 1G إلى القمر 0.16G',
    summaryEn:
      'Because the Moon has only 1/6th of Earth gravity, astronauts need balanced protein and daily resistance exercise so muscles and bones stay strong.',
    summaryAr:
      'بسبب ضعف جاذبية القمر (سُدس جاذبية الأرض)، يحتاج الرواد لبروتين متوازن وتمارين مقاومة يومية للحفاظ على قوة العضلات والعظام.',
    nasaSource: 'NASA Human Research Program',
    starReward: 15
  },
  {
    id: 'museum_2_iss_water',
    badgeIcon: '💧',
    titleEn: '98% Recycled Space Station Water',
    titleAr: 'إعادة تدوير 98% من مياه المحطة الفضائية',
    summaryEn:
      'In June 2023, NASA ISS ECLSS systems reached 98% water recovery — turning cabin humidity and wastewater back into ultra-clean drinking water!',
    summaryAr:
      'في يونيو 2023، حققت أنظمة دعم الحياة في محطة الفضاء الدولية استعادة 98% من المياه النظيفة الصالحة للشرب!',
    nasaSource: 'NASA ISS ECLSS Milestone',
    starReward: 15
  },
  {
    id: 'museum_3_hydroponics',
    badgeIcon: '🌱',
    titleEn: 'Lunar Hydroponic Space Gardens',
    titleAr: 'حدائق الزراعة المائية في الفضاء',
    summaryEn:
      'Fresh leafy greens grown under pink & blue LEDs on the ISS and future Lunar Biodomes provide vital vitamins and lift astronaut crew morale!',
    summaryAr:
      'توفر الخضروات الطازجة المزروعة تحت أضواء LED في الفضاء فيتامينات حيوية وترفع معنويات طاقم الرواد!',
    nasaSource: 'NASA Veggie / APH',
    starReward: 15
  },
  {
    id: 'museum_4_rover',
    badgeIcon: '🚙',
    titleEn: 'Drive Your Electric Lunar & Space Buggy',
    titleAr: 'قد مركبة الفضاء الكهربائية لاكتشاف الكواكب',
    summaryEn:
      'Solar-charged space buggies let explorers carry rock samples, water sensors, and nutrition supplies quickly across craters and spaceports!',
    summaryAr:
      'تساعد مركبات الفضاء الشمسية الرواد على نقل عينات الصخور وأجهزة استشعار المياه والمؤن بسرعة عبر التضاريس!',
    nasaSource: 'NASA Artemis LTV',
    starReward: 15
  }
];

const DISCOVERY_STORAGE_KEY = 'astronutri_discovered_facts_v1';

export function getDiscoveredFactIds(): string[] {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    const raw = window.localStorage.getItem(DISCOVERY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function markFactDiscovered(factId: string): { newlyDiscovered: boolean; totalCount: number } {
  const existing = getDiscoveredFactIds();
  if (existing.includes(factId)) {
    return { newlyDiscovered: false, totalCount: existing.length };
  }
  const updated = [...existing, factId];
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(DISCOVERY_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('astronutri:discovery-updated', { detail: { totalCount: updated.length } }));
    }
  } catch {
    // ignore storage errors
  }
  return { newlyDiscovered: true, totalCount: updated.length };
}
