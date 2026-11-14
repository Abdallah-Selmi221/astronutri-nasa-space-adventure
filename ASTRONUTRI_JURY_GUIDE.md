# AstroNutri — ملف تقديم لجنة تحكيم مسابقة NASA Space Apps Challenge
# AstroNutri — Official Judging Panel Presentation Dossier

**المشروع / Project:** **AstroNutri — مدرب رواد الفضاء الصغار (Junior Astronaut Mission Trainer)**  
**الفئة العمرية المستهدفة / Target Audience:** الأطفال من **7 إلى 12 سنة** (واجهة عربية كاملة من اليمين لليسار مع مصطلحات ناسا العلمية الموثقة)  
**الهدف العلمي / Mission Vision:** تحويل علوم تغذية رواد الفضاء، فيزياء الجاذبية الصغرى (`0G` و`0.16G`)، وطقس الفضاء والهندسة المدارية إلى **مغامرة ثلاثية الأبعاد تفاعلية (Three.js 3D + Phaser 3 2.5D)** عبر **4 مستويات متسلسلة تضم 33 غرفة/موقعاً و21 تحدياً تفاعلياً**.

---

## 1. الهيكل الجديد للمستويات الأربعة (4 Sequential Levels • 33 Spatial Locations • 21 Mini-Games)

لضمان وضوح القصة للأطفال ومنع تداخل الغرف غير المرتبطة، تعمل اللعبة عبر **خريطة عالم ثلاثية الأبعاد (`WorldNavigator3D`)** تتصل فيها **4 محطات متسلسلة خطياً (`Level 1 -> Level 2 -> Level 3 -> Level 4`)**، وبداخل كل مستوى **خريطة محطة/قاعدة ثلاثية الأبعاد قابلة للمشي (`SpatialRoomMap3D`)** يتحكم فيها الطفل بكابتن **روبو** عبر `WASD` / الأسهم أو أزرار اللمس أو النقر على الأبواب المضيئة:

### المستوى 1: التحضير على الأرض (`Level 1: Earth Preparation`) — 6 غرف و5 مهام
- **الغرف (6):** `Food Storage`، `Equipment Room`، `Medical Room`، `Spaceship Bay`، `Mission Control`، `Launch Area`.
- **التحديات (5):**
  1. `l1_food_prep`: تجهيز الطعام الآمن ومراعاة **قاعدة منع الفتات (No Crumbs Rule)** والمشروبات الغازية وموازنة الوزن/التغذية.
  2. `l1_equipment_prep`: حزم أدوات ومستلزمات المهمة في حقيبة الطاقم.
  3. `l1_medical_check`: الفحص الطبي (النوم، الترطيب، والتغذية) مع قراءة الاستمرارية من مخزن الطعام.
  4. `l1_spaceship_inspect`: فحص الأكسجين والطاقة الكهربائية وأبواب الكبسولة.
  5. `l1_mission_launch`: مراجعة اكتمال المهام الأربع السابقة في مركز التحكم والعد التنازلي للإقلاع (`LAUNCH SUCCESSFUL!`).

### المستوى 2: رحلة انعدام الجاذبية (`Level 2: Zero-G Space Transit`) — 7 غرف و6 مهام
- **الغرف (7):** `Central Corridor`، `Storage / Supply Room`، `Kitchen / Food Area`، `Hydration Station`، `Medical / Rest Room`، `Spaceship Control Room`، `Observation Window / Space Radar`.
- **التحديات (6):**
  1. `l2_zerog_movement`: فيزياء الحركة بالقصور الذاتي والتمسك بمقابض انعدام الجاذبية (`0G`).
  2. `l2_secure_objects`: تثبيت 5 أدوات طائرة في خزاناتها قبل تشتتها بالمحطة.
  3. `l2_balanced_meal`: إعداد وجبة متوازنة في المدار (بروتين + كربوهيدرات + دهون صحية + فيتامينات).
  4. `l2_hydration`: لعبة شرب الماء المختوم (`HydrationGame`) ومعوض السوائل في `0G`.
  5. `l2_motion_sickness`: إدارة دوار الفضاء وإزاحة السوائل (`NASA OSDR OSD-245`).
  6. `l2_systems_neows`: فحص أنظمة الملاحة ورادار الكويكب الحقيقي **`2010 PK` (`NASA NeoWs`)** لتأكيد الوصول القمري (`LUNAR ARRIVAL CONFIRMED!`).

### المستوى 3: مستعمرة القمر والعمليات العلمية (`Level 3: Moon Colony`) — 12 غرفة و5 مهام + إذن العودة
- **الغرف (12):** `Central Hall`، `Exercise Gym`، `ECLSS / Water System Room`، `Greenhouse / Food Lab`، `Medical Bay`، `Power & Control Room`، `Mission Control`، `EVA Prep Room`، `Emergency Shelter`، `Solar Panel Field`، `Lunar Rover Parking`، `Lunar Exploration Zone`.
- **التحديات (5 + غرفة تفويض العودة):**
  1. `l3_resistance_training`: تمارين المقاومة اليومية (**الأرجل -> الذراعين -> الجذع**) للحفاظ على كثافة العظام والعضلات (`NASA OSDR OSD-102 ARED`).
  2. `l3_water_recycling`: صيانة نظام إعادة تدوير المياه المغلق (**ECLSS** — عزل، فتح، تنظيف الفلتر، واختبار النقاء).
  3. `l3_solar_storm`: الاستجابة للعاصفة الشمسية الحقيقية (`NASA DONKI CME`) وموازنة **الطاقة ⚡ مقابل الأكسجين 🫁 مقابل الدروع 🛡️** ثم الاحتماء بالملجأ الإشعاعي.
  4. `l3_eva_prep`: ارتداء بدلة القمر (`4.3 PSI`) وحزم **الأدوات العلمية الأربع (`Gripper`, `Scoop`, `Hammer`, `Collection Bag`)**.
  5. `l3_lunar_samples`: الاستكشاف على سطح القمر بجاذبية `0.16G` ومراقبة أكسجين البدلة — مع **ترابط حقيقي عابر للغرف**: إذا نسي الطفل حزم أي أداة في `EVA Prep Room`، تعيده اللعبة مباشرةً لحزمها قبل السماح بجمع العينة!
  6. **مركز قيادة القمر (`l3_return_auth`):** مراجعة إتمام التحديات الخمسة ومنح الإذن الرسمي (`ALL SYSTEMS VERIFIED – RETURN TO EARTH AUTHORIZED!`) لفتح المستوى الرابع.

### المستوى 4: رحلة العودة إلى الأرض (`Level 4: Return to Earth`) — 8 غرف و5 مهام
- **الغرف (8):** `Central Corridor`، `Cargo & Sample Storage`، `Cockpit / Navigation`، `Communication Room`، `Systems Check Station`، `Equipment & Maintenance`، `Medical Bay`، `Crew Quarters`.
- **التحديات (5):**
  1. `l4_departure_prep`: فحص الأكسجين والطاقة والاتصالات وتأمين **عينات القمر المجموعة من المستوى 3** (`l3CollectedSamples`) داخل مخزن الشحن.
  2. `l4_navigation_earth`: ضبط زاوية مسار العودة واختبار **تأخير إشارة الفضاء العميق الحقيقي (~1.3 ثانية)** بين القمر والأرض (`NASA DSN`).
  3. `l4_spacecraft_emergency`: تشخيص عطل طارئ أثناء العودة (طاقة / اتصال / `CO2`) وإصلاحه بأداة الصيانة الصحيحة.
  4. `l4_earth_reentry`: فحص ألواح الدرع الحراري **`PICA-X`** وتثبيت زاوية الكبسولة داخل الممر الآمن (`-18° .. +18°`) عند ذروة حرارة `1600°C` وتحمل جاذبية `4.0G` (`NASA OSDR`).
  5. `l4_safe_landing`: التسلسل الزمني لفتح المظلات الكابحة (`Drogue`) ثم الرئيسية (`Main Chutes`) حتى الهبوط المائي الآمن (`MISSION ACCOMPLISHED!`).

### أكاديمية الكواكب وبنك الـ 42 سؤالاً (`SpaceScience`)
- تظل **أكاديمية الكواكب الـ 8 والـ 42 سؤالاً** متاحة بضغطة واحدة من الخريطة الرئيسية، مع قفز روبو على جاذبية كل جرم سماوي ومقارنة الوزن والصور الحقيقية من ناسا.

---

## 2. التكامل الفعلي مع بيانات ناسا الحية | Real NASA Data Integration

تتغذى اللعبة من بيانات ناسا الموثقة عبر `src/services/nasa/nasaCache.ts` و`src/services/nasa/nasaOSDR.ts` ولقطة البيانات المعقمة محلياً `public/data/nasa_snapshots.json` (دون تسريب أي مفاتيح API للمتصفح):

| مصدر ناسا الرسمي / NASA Dataset | دوره الفعلي داخل اللعب |
| :--- | :--- |
| **NASA NeoWs (`2010 PK`, SPK-ID `3542519`)** | يُغذي فحص الملاحة في المستوى 2 (`l2_systems_neows`) ورادار الكويكبات بالقطر والسرعة ومسافة المرور الآمنة. |
| **NASA DONKI (CME Space Weather)** | يُطلق سيناريو العاصفة الشمسية في المستوى 3 (`l3_solar_storm`) وموازنة الطاقة/الأكسجين/الدروع الإشعاعية. |
| **NASA OSDR (`OSD-102`, `OSD-245`, `OSD-318`, `Re-Entry 4G`)** | يدعم تمارين المقاومة ضد ضمور العضلات والعظام، بروتوكول دوار الفضاء والترطيب، الحماية الإشعاعية، وتحمل جاذبية العودة. |
| **NASA APOD, EPIC & LROC Imagery** | معروضة في لوحة **بيانات ناسا الحية (`NasaMissionControlDrawer`)** ومختبر الكواكب مع صور محلية تعمل بدون إنترنت. |

---

## 3. البنية التقنية، الصوت العربي والعمل دون إنترنت | Tech Architecture & Offline PWA

- **3D & 2.5D Engines:** `Three.js` (`WorldNavigator3D.tsx`, `SpatialRoomMap3D.tsx`) لخريطة العالم الـ 4 محطات والمجسمات والروبوت المتحرك داخل 33 غرفة؛ مع `Phaser 3.90` للمشاهد التخصصية.
- **Frontend Stack:** `React 18` + `TypeScript` + `Tailwind CSS` + `Framer Motion` مع دعم عربي كامل (`RTL`) ومفاتيح `WASD`/الأسهم وأزرار اللمس للأطفال.
- **ElevenLabs Egyptian Arabic Voice (`dialogueManager`):**
  - صوت عربي مصري دافئ ومخزن محلياً في `public/audio/robo/` (`eleven_multilingual_v2`, Voice ID `TX3LPaxmHKxFdv7VOQHJ`) يغطي التوجيهات الصوتية عبر المستويات الأربعة مع مؤثرات Web Audio في `sound.ts`.
- **Offline PWA & Fail-Closed Persistence:**
  - حزمة `vite-plugin-pwa` بتخزين حتى `25 MB` لدعم فيديو البداية والصوتيات وبيانات ناسا دون إنترنت، مع `AstroNutriSaveDataV1` (`src/utils/storage.ts`) لحفظ التقدم واستمرارية الموارد (الطعام، الأدوات الـ 4، وعينات القمر) بين المستويات بأمان.
