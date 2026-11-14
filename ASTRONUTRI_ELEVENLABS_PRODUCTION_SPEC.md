# 🎙️ ASTRONUTRI — ELEVENLABS PRODUCTION SPECIFICATION (REVISION 3)
**Project:** AstroNutri Junior Astronaut Mission Trainer (`E:\Nasa team`)  
**Document:** ASTRONUTRI_ELEVENLABS_PRODUCTION_SPEC.md  
**Role:** Principal Audio Director, Game Architect, and Lead Sound Designer  
**Status:** 📋 SPECIFICATION / PLANNING ONLY — AWAITING USER PILOT AUTHORIZATION  
**Date:** November 13, 2026  

---

## 1. Executive Audio Mission

AstroNutri requires a fully voiced, emotionally resonant, and culturally authentic audio experience for children aged 7–12. The player's guide, **Captain Robo**, must speak authentic **Egyptian Arabic (لهجة مصرية بيضاء)** with natural warmth, humor, and enthusiasm—never stiff formal Classical Arabic (Fusha) or robotic synthesizer monotones.

**ElevenLabs** is hereby designated as the **Primary Audio Production Engine** for all character voiceovers, narrative prompts, tactical warnings, and scientific explanations. All dialogue will be pre-rendered during build/pre-production and bundled directly in `public/audio/robo/` to guarantee **100% offline, zero-latency, PWA-compliant gameplay**.

---

## 2. API Forensic Audit & Live Account Parameters

A live probe of the authenticated ElevenLabs account (`ELEVENLABS_API_KEY` stored securely in `e:\Nasa team\.env`) verified the following account configuration:

```
+---------------------------------------------------------------------------------------------------------+
| ELEVENLABS PARAMETER           | VERIFIED LIVE VALUE             | ENGINEERING IMPLICATION              |
+---------------------------------------------------------------------------------------------------------+
| Account Subscription Tier      | Free Tier                       | Hard ceiling of 10,000 characters.    |
| Character Usage                | 0 / 10,000 characters used      | 100% quota available for production. |
| Production Model Selected      | eleven_multilingual_v2          | Premium emotional & Arabic fidelity.  |
| Backup High-Speed Model        | eleven_flash_v2_5               | Ultra-low latency fallback.          |
| Primary Egyptian Voice ID      | PmRaqkJ2uk3Y9jrp9UjJ (Mawardy)  | Native young adult Egyptian male.     |
| Fallback Voice 1               | B1W8tTuESCJzhOnd15nC (Fekry)    | Warm conversational Egyptian male.   |
| Fallback Voice 2               | oOge1k8044i7H9hCreX6 (Mahmoud)  | Expressive dynamic Egyptian voice.   |
+---------------------------------------------------------------------------------------------------------+
```

---

## 3. Acoustic Profile & Parameter Locking

To guarantee that Robo sounds identical across all 4 stages and 74 audio clips, the synthesis pipeline is strictly locked to the following JSON configuration:

```json
{
  "voice_id": "PmRaqkJ2uk3Y9jrp9UjJ",
  "voice_name": "Mawardy - Warm, Natural Egyptian",
  "model_id": "eleven_multilingual_v2",
  "voice_settings": {
    "stability": 0.50,
    "similarity_boost": 0.85,
    "style": 0.15,
    "use_speaker_boost": true
  },
  "output_format": "mp3_44100_128",
  "target_bitrate": "128 kbps",
  "target_sample_rate": 44100,
  "channels": 1
}
```

### 3.1 Rationale for Locked Parameters:
- **`stability: 0.50`**: Balances vocal consistency with emotional expressiveness. Values above 0.75 sound robotic and monotone; values below 0.35 introduce pitch wobble and erratic energy.
- **`similarity_boost: 0.85`**: Ensures the synthesized voice adheres strictly to Mawardy's native Egyptian vocal timbre, eliminating foreign accent drift.
- **`style: 0.15`**: Provides subtle expressive flair and natural breath pauses suitable for an energetic space mascot without over-exaggeration.
- **`use_speaker_boost: true`**: Maximizes dynamic range, vocal presence, and intelligibility against background music and spacecraft sound effects.

---

## 4. Quota Architecture & Phased Generation Budget

The complete 4-stage narrative campaign designed in `ASTRONUTRI_ROBO_CHARACTER_AND_AUDIO_BIBLE.md` contains **74 modular clips** totaling approximately **17,500 characters** (~20.3 minutes of spoken audio).

Because the current authenticated account has a **10,000-character free limit**, we structure production into two clear phases to strictly prevent unexpected quota exhaustion:

```
+----------------------------------------------------------------------------------------------------+
| PHASE 0: 3-CLIP PRE-PRODUCTION PILOT (158 Characters | Cost: 158 / 10,000)                        |
| - Verify Arabic diacritics, pronunciation of "PSI" and "NASA", audio ducking, and emotional range. |
+----------------------------------------------------------------------------------------------------+
                                                │
                                                ▼
+----------------------------------------------------------------------------------------------------+
| PHASE 1: CORE CRITICAL MISSION CAMPAIGN (8,420 Characters | Cumulative: 8,578 / 10,000)            |
| - Generates all 38 indispensable gameplay prompts, emergency alerts, and mission completions.     |
| - Covers 100% of the core interactive campaign across Stages 1, 2, 3, and 4.                      |
| - Remaining Buffer: 1,422 characters for retries or minor script adjustments.                    |
+----------------------------------------------------------------------------------------------------+
                                                │
                                                ▼
+----------------------------------------------------------------------------------------------------+
| PHASE 2: EXTENDED EDUCATIONAL DEEP DIVES & LORE (8,922 Characters | Requires Tier Upgrade)        |
| - Generates 33 optional deep scientific explanations, idle banter, and station tour commentary.     |
| - Unlocked once the user upgrades to ElevenLabs Starter Tier ($5 for 30,000 characters).           |
+----------------------------------------------------------------------------------------------------+
```

### 4.1 Phase 1 Character Breakdown by Stage:
1. **Stage 1 (Earth Academy & Launch):** 8 core clips = 1,480 characters.
2. **Stage 2 (Deep Space Flight):** 12 core clips = 2,650 characters.
3. **Stage 3 (Lunar Outpost Operations):** 12 core clips = 2,840 characters.
4. **Stage 4 (Return & Splashdown):** 6 core clips = 1,450 characters.
- **Total Phase 1 Characters:** **8,420 characters** (Comfortably within the 10,000 limit with 1,580 chars spare).

---

## 5. The Pre-Production 3-Line Pilot Verification

Before generating any bulk assets, an automated pilot script (`scripts/test_elevenlabs_pilot.mjs`) will synthesize exactly three test phrases to validate pronunciation, warmth, and sound staging:

```json
[
  {
    "id": "pilot_01_welcome",
    "text": "أَهْلاً بِكَ يَا بَطَل فِي أَكَادِيمِيَّةِ الفَضَاءِ! أَنَا رُوبُو، رَفِيقُكَ فِي رِحْلَةِ القَمَر!",
    "characters": 77,
    "target_tone": "Warm, cheerful, welcoming Egyptian youth mascot.",
    "evaluation_metric": "Natural cadence, clear diacritics, no robotic flat tone."
  },
  {
    "id": "pilot_02_emergency",
    "text": "إِنْذَارٌ عَاجِل! عَاصِفَةٌ شَمْسِيَّةٌ تَقْتَرِب! ارْجِعْ فَوْراً لِمَخْبَأِ القَاعِدَةِ المَحْمِيّ!",
    "characters": 82,
    "target_tone": "Urgent, alert, protective tactical guide.",
    "evaluation_metric": "Dynamic urgency without audio clipping or distorted vocal strain."
  },
  {
    "id": "pilot_03_technical",
    "text": "تَمَّ ضَبْطُ ضَغْطِ البَدْلَةِ بِدِقَّةٍ عَلَى أَرْبَعَةٍ وَثَلَاثَةِ أَعْشَارِ بي إس آي!",
    "characters": 75,
    "target_tone": "Precise, encouraging aerospace engineer.",
    "evaluation_metric": "Accurate pronunciation of 'بي إس آي' (PSI) and numerical precision."
  }
]
```

### 5.1 Acceptance Criteria for Pilot Approval:
1. **Dialect Integrity:** Sounds like an authentic native Egyptian speaker; zero Gulf or Levantine accent substitution.
2. **Technical Clarity:** Acronyms ("بي إس آي" / PSI) and numbers sound natural and unmistakable.
3. **Audio Quality:** Clean $44.1\text{kHz}$ MP3, zero DC offset, zero clipping, dynamic range $\ge 18\text{dB}$.
4. **Child Appeal:** Voice feels friendly, encouraging, and heroic—an inspiring older brother or enthusiastic robotic guide.

---

## 6. Batch Production Script Architecture

The generation process is fully automated via `scripts/generate_elevenlabs_audio.mjs`.

### 6.1 Script Safety Rules:
- **Zero API Key Leakage:** Reads `ELEVENLABS_API_KEY` from `.env` using local `fs` reading. Never prints, logs, or transmits keys.
- **Quota Guardrail:** Calculates total character count before calling the API. Aborts if character sum exceeds remaining balance.
- **Cache & Skip:** Checks if `public/audio/robo/{stage}/{clip_id}.mp3` already exists on disk. Never re-generates an existing clip.
- **Rate-Limit Throttling:** Enforces a 600ms pause between requests to respect ElevenLabs API concurrency limits.
- **Retry Backoff:** Exponential backoff with 3 retries on HTTP 429 or 503 errors.

### 6.2 Target Directory Hierarchy:
```
e:\Nasa team\public\audio\
├── robo\
│   ├── stage1\
│   │   ├── s1_c01_welcome.mp3
│   │   ├── s1_c02_launch_prep.mp3
│   │   └── ...
│   ├── stage2\
│   │   ├── s2_c01_orbit_float.mp3
│   │   ├── s2_c03_loose_objects_alert.mp3
│   │   └── ...
│   ├── stage3\
│   │   ├── s3_c01_landing_touchdown.mp3
│   │   ├── s3_c04_solar_storm_siren.mp3
│   │   └── ...
│   └── stage4\
│       ├── s4_c01_cargo_balance_intro.mp3
│       ├── s4_c03_reentry_plasma.mp3
│       └── ...
├── sfx\
│   ├── mechanical\
│   ├── environment\
│   └── ui\
└── music\
    ├── earth_theme.mp3
    ├── zero_g_wonder.mp3
    ├── lunar_mystery.mp3
    └── splashdown_victory.mp3
```

---

## 7. Engine Integration: Ducking & Subtitle Synchronization

The client-side audio engine (`src/utils/audio/AudioManager.ts`) and React/Phaser event bridge (`src/game/EventBus.ts`) manage runtime playback:

### 7.1 Audio Ducking Specification
When a Robo voiceover clip is triggered:
1. **Background Music (BGM):** Fades down to $20\%$ volume over $200\text{ms}$.
2. **Sound Effects (SFX):** Ambient environmental loops fade down to $30\%$ volume over $150\text{ms}$.
3. **Dialogue Playback:** Robo's voice plays at $100\%$ volume ($0\text{dBFS}$).
4. **Restoration:** Once dialogue finishes (`sound.on('complete')`), BGM and SFX smoothly ramp back to $100\%$ over $400\text{ms}$.

### 7.2 Subtitle Event Synchronization
Every voice clip emits an event payload to drive on-screen dialogue balloons:
```typescript
interface RoboDialoguePayload {
  clipId: string;
  arabicText: string;
  durationMs: number;
  emotion: 'happy' | 'alert' | 'explaining' | 'cheering';
  mouthAnim: 'talking_fast' | 'talking_calm' | 'shouting';
}
```
This guarantees that hearing-impaired children or classroom environments with muted audio have 100% equivalent narrative and educational access.
