# 🎙️ ASTRONUTRI — ROBO CHARACTER & AUDIO BIBLE
**Project:** AstroNutri Junior Astronaut Mission Trainer (`E:\Nasa team`)  
**Document:** ASTRONUTRI_ROBO_CHARACTER_AND_AUDIO_BIBLE.md  
**Role:** Principal Audio Director, Narrative Lead, and Executive Producer  
**Status:** 📋 PROPOSAL / PLANNING ONLY — PRODUCTION SPECIFICATION  
**Date:** November 13, 2026  

---

## 1. Robo Character Identity & Vocal Persona

### 1.1 Character Profile
- **Name:** Robo (روبو)
- **Role:** Junior Flight Instructor & Autonomous Robotic Mission Companion.
- **Target Demographic:** Children aged 7–12.
- **Vocal Persona:** Young adult Egyptian male (20–25 years), warm, brotherly, energetic, highly articulate, playful, and emotionally genuine.
- **Dialect:** Authentic colloquial Egyptian Arabic (*اللهجة المصرية البيضاء المحكية*), blending everyday warmth with crisp, accurate scientific terminology.
- **Key Vocal Traits:**
  - Speaks with bright upward inflection and infectious curiosity.
  - Never sounds like a cold, synthetic GPS navigator or a rigid news broadcaster.
  - Treats the player as an equal flight partner (*"يا كابتن"*, *"يا بطل"*).
  - Displays real emotional stakes: genuine urgency during alerts, proud warmth during achievements.

### 1.2 Core Vocabulary & Catchphrases
| Egyptian Colloquialism | Meaning in Context | Example Usage |
| :--- | :--- | :--- |
| **يا بطل / يا كابتن** | "Hero" / "Captain" | *"عاش يا بطل! التوازن كده مظبوط بالمللي!"* |
| **يلا بينا!** | "Let's go!" | *"يلا بينا نفتح بوابة الصعود للمركبة!"* |
| **حاسب عندك!** | "Watch out!" | *"حاسب عندك! أكياس الأكل بتطير في الممر!"* |
| **بالظبط كده!** | "Exactly right!" | *"بالظبط كده! الأكسجين وصل لـ 4.3 PSI تماماً!"* |
| **يا سيدي / يا فنان** | Endearing praise | *"الله عليك يا فنان! الدائرة اتقفلت والمية بتتدفق!"* |
| **متشغلش بالك!** | "Don't worry!" | *"متشغلش بالك، الدرع الحراري متصمم يتحمل الحرارة دي كلها!"* |

---

## 2. Aerospace Pronunciation & Phonetic Guide

To prevent mispronunciation or unnatural robotic accents in ElevenLabs, all technical and English-origin aerospace terms must be scripted using phonetic Arabic diacritics:

| Term | Phonetic Arabic Script | Target Audio Pronunciation | Audio Directing Note |
| :--- | :--- | :--- | :--- |
| **NASA** | نَاسَا | *NAA-sah* | Short, punchy, crisp initial 'N'. |
| **Artemis** | أَرْتِمِيسْ | *AR-te-mees* | Clear soft 't', elongated 'mees'. |
| **ECLSS** | إِيكْلِسْ (نِظَامُ دَعْمِ الحَيَاة) | *EEK-liss* | Pronounce acronym as a word, follow with Arabic descriptor. |
| **Shackleton** | شَاكِلْتُونْ | *SHAH-kel-ton* | Clear 'sh' and open 'o'. |
| **Regolith** | رِيجُولِيثْ (تُرَابُ القَمَر) | *REE-go-leeth* | Gentle 'th' sound, paired with "turab el-qamar". |
| **PSI** | بِي إِسْ آي | *P-S-I* | Spelled out clearly letter-by-letter. |
| **Apollo** | أَبُولُّو | *Ah-POL-lo* | Natural Egyptian pronunciation. |
| **Zero-G** | انْعِدَامُ الجَاذِبِيَّة | *In'idam el-Jazebeya* | Use Arabic term rather than English "Zero-G". |

---

## 3. Robo's Continuous Emotional Arc Across the 4 Stages

```
STAGE 1: Earth Academy & Launch
Emotional State: Welcoming, Eager, Inspiring
"أهلاً بيك في الأكاديمية يا بطل! مش مصدق إننا خلاص رايحين القمر سوا!"
                                   │
                                   ▼
STAGE 2: Deep Space Orbital Journey
Emotional State: Awe-struck by Zero-G -> Tense during Loose Objects -> Reassuring & Caring in MedBay
"شايف الأرض من الشباك عاملة إزاي؟ سبحان الخالق!.. حاسب! كبسولة الأكل بتطير!"
                                   │
                                   ▼
STAGE 3: Artemis Lunar Outpost
Emotional State: Thrilled by touchdown -> High Alert during Solar CME -> Adventurous on Lunar Surface
"وصلنا فوهة شاكلتون! انزل بالراحة على سدس الجاذبية.. صوت الإنذار ده مش طبيعي! اجري عالمخبأ!"
                                   │
                                   ▼
STAGE 4: Return to Earth & Splashdown
Emotional State: Hyper-focused during Reentry Corridor -> Pure Unbridled Joy at Splashdown
"ركز معايا في زاوية الدخول.. أوعى تنحرف عن 22 درجة!.. عملناها يا بطل! المظلات فتحت وهبطنا بسلام!"
```

---

## 4. Master Script Map (~20 Minutes Total Spoken Audio)

To achieve the 20-minute production target without overwhelming the player, dialogue is broken into **74 short, callable audio clips** ($10–25\text{s}$ each, organized by exact gameplay state triggers).

### 4.1 Stage 1: Earth Academy & Launch Sequence (16 Clips — ~4.2 Minutes)
- `S1_01_WELCOME_ISLAND` (22s): Welcoming child to floating island, explaining the mission to Artemis base.
- `S1_02_CLICK_CRYSTAL` (12s): Playful reaction to energy quartz crystals.
- `S1_03_CLICK_SHROOM` (10s): Commenting on the bouncy alien mushrooms.
- `S1_04_SPACESHIP_PROMPT` (15s): Urging player to approach the docked exploration ship.
- `S1_05_HATCH_OPEN` (14s): Announcing pneumatic hatch depressurization and boarding ramp extension.
- `S1_06_NUTRITION_INTRO` (20s): Explaining freeze-dried storage and the importance of zero crumbs.
- `S1_07_TORTILLA_PRAISE` (15s): Explaining why tortillas replaced crumbly bread on Gemini 3.
- `S1_08_CRUMB_WARNING` (18s): Warning against chips/crackers that endanger ventilation filters.
- `S1_09_ORRERY_INTRO` (18s): Introducing the solar system observatory dome.
- `S1_10_MARS_FACT` (16s): Explaining iron oxide and why Mars is red.
- `S1_11_HEALTH_GYM` (22s): Explaining why astronauts must exercise 2.5 hours daily to prevent bone decay.
- `S1_12_SUIT_INTRO` (20s): Introducing the 14-layer spacesuit and gold-plated visor.
- `S1_13_PSI_CORRECT` (15s): Confirming $4.3\,\text{PSI}$ pure $O_2$ seal is locked.
- `S1_14_GANTRY_CHECK` (20s): Running the launch gantry fuel pressure checklist.
- `S1_15_COUNTDOWN_LEAD` (16s): Leading the 3-2-1 rocket ignition countdown.
- `S1_16_LIFTOFF_ROAR` (18s): Excited vocalization as the rocket punches through the troposphere.

### 4.2 Stage 2: Deep Space Trans-Lunar Flight (22 Clips — ~6.1 Minutes)
- `S2_01_ORBIT_AWE` (22s): Marveling at Earth's curvature through the observation window.
- `S2_02_FLOAT_SURPRISE` (16s): Reacting as gravity cuts out and items begin drifting.
- `S2_03_HANDRAIL_TUTORIAL` (20s): Explaining slingshot vector pulling and handrail latching.
- `S2_04_HANDRAIL_BRAKE` (14s): Teaching player to tap `E` to grab handrails before hitting bulkheads.
- `S2_05_EMERGENCY_ALARM` (18s): Shouting as thruster attitude adjustment scatters loose tools.
- `S2_06_SCRAMBLE_HURRY` (12s): Timer countdown prompt with 20 seconds remaining.
- `S2_07_LOCKER_SECURE` (14s): Praising player for latching loose tools into magnetic lockers.
- `S2_08_FOOD_GALLEY_INTRO` (18s): Welcoming player to assemble the meal tray.
- `S2_09_PROTEIN_EXPLAIN` (15s): Highlighting irradiated poultry and muscle preservation.
- `S2_10_CALCIUM_MILK` (15s): Explaining calcium and vitamin D for zero-G skeletal health.
- `S2_11_MEAL_COMPLETE` (16s): Praising balanced meal score and tray locking.
- `S2_12_HYDRATION_INTRO` (18s): Demonstrating why open cups fail in microgravity.
- `S2_13_DRINK_BAG_HOLD` (15s): Coaching player on hold-and-release pressure gauge timing.
- `S2_14_HYDRATION_PERFECT` (14s): Confirming exact $250\,\text{ml}$ fluid pouch intake.
- `S2_15_MEDBAY_SYMPTOMS` (20s): Noticing player's dizziness from fluid shift to head.
- `S2_16_MEDBAY_DIAGNOSE` (16s): Reviewing vital telemetry and prescribing electrolyte rest.
- `S2_17_REST_RECOVERY` (15s): Reassuring player as vital signs stabilize to $100\%$.
- `S2_18_RESOURCE_CHECK` (18s): Auditing the 6-meter telemetry HUD before approach.
- `S2_19_COCKPIT_RETURN` (14s): Requesting player return to cockpit forward flight deck.
- `S2_20_AVIONICS_VERIFY` (18s): Verifying lunar landing coordinates and retro-rocket fuel.
- `S2_21_MOON_APPROACH` (20s): Gazing at Shackleton crater growing in the viewport.
- `S2_22_RETRO_BURN` (16s): Announcing retro-burn ignition for lunar orbit insertion.

### 4.3 Stage 3: Artemis Lunar Outpost Operations (20 Clips — ~5.6 Minutes)
- `S3_01_TOUCHDOWN_MOON` (20s): Celebrating safe touchdown on Shackleton Crater rim.
- `S3_02_BASE_AIRLOCK_IN` (15s): Guiding player through habitat outer airlock door.
- `S3_03_HABITAT_EXPLORE` (18s): Introducing hydroponic dome and water recycling unit.
- `S3_04_WATER_ALARM` (18s): Urgently flagging the contaminated ECLSS water recycler.
- `S3_05_UNBOLT_CASING` (14s): Instructing player to unbolt the outer titanium maintenance panel.
- `S3_06_EXTRACT_FILTER` (16s): Identifying clogged filter cartridge and asking for alignment.
- `S3_07_PIPE_SOLVE_HINT` (18s): Explaining catalytic valve fluid flow from cabin to processor.
- `S3_08_WATER_RESTORED` (18s): Cheering as water reserves recharge to $100\%$.
- `S3_09_SOLAR_STORM_SIREN` (18s): Screaming over radiation siren to drop tools and run.
- `S3_10_SHELTER_RETREAT` (16s): Ordering crew into the water-jacketed Habitat core vault.
- `S3_11_STORM_SUBSIDES` (15s): Confirming radiation levels have returned to safe background levels.
- `S3_12_PRE_EVA_SUIT` (20s): Guiding player to don surface spacesuit and verify $4.3\,\text{PSI}$.
- `S3_13_AIRLOCK_DEPRESS` (16s): Depressurizing airlock and opening outer hatch to lunar surface.
- `S3_14_LOW_G_HOPS` (18s): Laughing and demonstrating the $0.16g$ kangaroo hop technique.
- `S3_15_DRILL_ICE_CORE` (18s): Directing laser drill into permanently shadowed crater ice.
- `S3_16_COLLECT_BASALT` (15s): Scooping titanium basalt rocks from the crater rim.
- `S3_17_OXYGEN_WARNING` (16s): Alerting that suit oxygen is at $25\%$ and it is time to turn back.
- `S3_18_AIRLOCK_DUST_OFF` (18s): Actuating electrostatic vacuum to remove jagged regolith dust.
- `S3_19_SOLAR_REPAIR` (18s): Guiding player to replace blown micro-meteoroid fuse on solar array.
- `S3_20_CLEARANCE_EARTH` (18s): Confirming Houston Mission Control clearance for Earth return.

### 4.4 Stage 4: Return to Earth & Splashdown Finale (16 Clips — ~4.4 Minutes)
- `S4_01_CARGO_INTRO` (20s): Explaining cargo bay weight limit ($\le 100\,\text{kg}$) and balance ($\le 15\,\text{kg}$).
- `S4_02_OVERLOAD_WARN` (15s): Warning that cargo exceeds $100\,\text{kg}$ capacity.
- `S4_03_IMBALANCE_WARN` (15s): Warning that left and right bays are tilted and unsafe.
- `S4_04_BALANCED_PRAISE` (16s): Confirming cargo is locked with perfect center-of-gravity.
- `S4_05_ASCENT_LIFTOFF` (18s): Counting down lunar ascent stage ignition.
- `S4_06_TRANS_EARTH` (18s): Confirming trans-Earth injection burn and Earth approach trajectory.
- `S4_07_EARTH_HORIZON` (18s): Emotional reflection on seeing Earth's glowing blue atmosphere again.
- `S4_08_REENTRY_BRIEF` (18s): Briefing player on aerodynamic steering corridor ($20^\circ-24^\circ$).
- `S4_09_PLASMA_STRIKE` (16s): Calling out as orange plasma flames envelop the heat shield.
- `S4_10_STEER_HOT_WARN` (14s): Yelling that pitch is too steep ($>24^\circ$) and shield is overheating.
- `S4_11_STEER_SKIP_WARN` (14s): Yelling that pitch is too shallow ($<20^\circ$) and capsule is skipping off.
- `S4_12_CORRIDOR_PERFECT` (16s): Cheering steady pitch control through peak heating.
- `S4_13_DROGUE_DEPLOY` (15s): Confirming drogue chutes have deployed at $10,\text{000m}$.
- `S4_14_MAINS_INFLATE` (18s): Roaring with joy as the 3 giant orange main parachutes bloom.
- `S4_15_SPLASHDOWN_HIT` (18s): Celebrating gentle splashdown into the Pacific Ocean.
- `S4_16_GRADUATION_SPEECH` (24s): Final emotional congratulations awarding Junior Astronaut Wings.

---

## 5. Music & Environmental Soundscape Matrix

```
+------------------------------------------------------------------------------------------------------+
| STAGE / ROOM           | MUSIC THEME & INSTRUMENTATION          | ENVIRONMENTAL AMBIENCE & FOLEY     |
+------------------------------------------------------------------------------------------------------+
| Earth Academy Hub      | Upbeat, playful orchestral sci-fi with | Coastal breeze, rustling leaves,   |
| (Stage 1)              | marimba, pizzicato strings, soft brass.| radar station pings.               |
+------------------------------------------------------------------------------------------------------+
| Launch Pad Gantry      | Tense, rhythmic building brass pulse   | Cryogenic LOX vent hiss, hydraulic |
| (Stage 1 Liftoff)      | leading into thunderous liftoff theme. | swing-arm clamp releases.          |
+------------------------------------------------------------------------------------------------------+
| Spacecraft Interior    | Ethereal ambient synth pads, floating  | Low 60Hz avionics hum, air cooling |
| (Stage 2 Transit)      | bells, low-gravity reverberant chime.  | vents, rhythmic air circulation.   |
+------------------------------------------------------------------------------------------------------+
| Loose Objects Alert    | Fast 140BPM electronic arpeggio,       | Flashing hazard strobe siren,      |
| (Stage 2 Emergency)    | ticking clock pulse, urgent bassline.  | metallic locker slam latches.      |
+------------------------------------------------------------------------------------------------------+
| Artemis Lunar Base     | Wonderous, expansive strings and piano | Heavy airlock pneumatic slide,     |
| (Stage 3 Habitat)      | conveying quiet scientific frontier.   | ECLSS water pump thrum.            |
+------------------------------------------------------------------------------------------------------+
| Lunar Surface EVA      | Deep atmospheric drone, sparse celesta | Vacuum silence, helmet breathing   |
| (Stage 3 Traverse)     | notes, expansive low-gravity rhythm.   | regulator, boot crunch on regolith.|
+------------------------------------------------------------------------------------------------------+
| Reentry Plasma Flight  | Raging cinematic percussion, soaring   | Violent atmospheric buffeting roar,|
| (Stage 4 Reentry)      | french horns, turbulent brass risers.  | heat shield plasma ablation crackle|
+------------------------------------------------------------------------------------------------------+
| Pacific Splashdown     | Triumphant, heartwarming orchestral    | Ocean waves lapping capsule hull,  |
| (Stage 4 Finale)       | graduation fanfare with full horns.    | helicopter rotors overhead.        |
+------------------------------------------------------------------------------------------------------+
```

---

## 6. Centralized AudioManager Architecture

```typescript
// Architectural Blueprint for src/utils/AudioManager.ts
export class AudioManager {
  private speechChannel: HTMLAudioElement;
  private musicChannel: HTMLAudioElement;
  private sfxChannel: HTMLAudioElement;

  private voiceCache: Map<string, AudioBuffer> = new Map();
  private isMuted: boolean = false;
  private speechDuckingFactor: number = 0.20; // Ducks music to 20% during Robo dialogue

  public async playVoice(clipId: string): Promise<void> {
    // 1. Duck background music smoothly over 250ms
    this.fadeMusic(this.speechDuckingFactor, 250);

    // 2. Play pre-cached offline MP3 voice clip
    await this.playClip(`/audio/robo/${clipId}.mp3`);

    // 3. Restore background music smoothly over 400ms
    this.fadeMusic(1.0, 400);
  }
}
```
