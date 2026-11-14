# 🔊 ASTRONUTRI — API & AUDIO CAPABILITY AUDIT (REVISION 3)
**Project:** AstroNutri Junior Astronaut Mission Trainer (`E:\Nasa team`)  
**Document:** ASTRONUTRI_API_AND_AUDIO_CAPABILITY_AUDIT.md  
**Role:** Principal Audio Director, Game Architect, and Lead Sound Designer  
**Status:** 📋 PROPOSAL / PLANNING ONLY  
**Date:** November 13, 2026  

---

## 1. Connected API Forensic Capabilities & Quota Truth

Live API probes, network instrumentation, and code audits established the following hard constraints:

```
+------------------------------------------------------------------------------------------------------------------+
| API SERVICE       | ACTUAL CAPABILITY                | QUOTA & ACCESS STATUS            | PRODUCTION ROLE        |
+------------------------------------------------------------------------------------------------------------------+
| ElevenLabs API    | Premium Multilingual AI TTS,     | Key Authenticated. Free Tier:    | PRIMARY AUDIO ENGINE:  |
| (REST /v1)        | Authentic Egyptian Arabic voice  | 0 / 10,000 characters used.      | All 74 Robo dialogue   |
|                   | cloning, emotional expression.   | Models: eleven_multilingual_v2,  | clips, warnings, and   |
|                   |                                  | eleven_flash_v2_5. Voice: Mawardy| mission debriefs.      |
+------------------------------------------------------------------------------------------------------------------+
| Gemini API        | Text generation, Multimodal,     | REST Image Endpoint = 429 Quota  | Scientific fact data   |
| (Google AI)       | Text-to-Speech (Puck voice).     | Exhausted (Limit 0 on Free Tier).| validation and dynamic |
|                   |                                  | TTS superseded by ElevenLabs.    | localized hints.       |
+------------------------------------------------------------------------------------------------------------------+
| PixelLab API      | 2D Pixel Art Sprites (128x128),  | Trial Authenticated. Balance:    | Retro mini-game arcade |
| (v2 OpenAPI)      | 4/8-direction walking frames.    | 38 credits remaining.            | terminal inside the    |
|                   | NOT 3D geometry or 2.5D vectors. | Deducts 1 credit per generation. | lunar habitat.         |
+------------------------------------------------------------------------------------------------------------------+
| Canva Connect     | Automated design creation,       | OAuth2 Active via tokens.json.   | Mission badges, UI     |
| API (v1 REST)     | asset upload, SVG/PNG export     | Zero billing cost on Developer   | frames, and printable  |
|                   | of 2D graphic layouts and HUDs.  | Sandbox.                         | Golden Wings diplomas. |
+------------------------------------------------------------------------------------------------------------------+
```

---

## 2. ElevenLabs as the Primary Audio Engine

### 2.1 Model & Voice Selection
- **Model:** `eleven_multilingual_v2` is selected as the primary synthesis engine. It handles Arabic phonemes and diacritical marks (tashkeel) with superior accuracy compared to standard flash models.
- **Voice Selection:** Community voice library scan identified Voice ID `PmRaqkJ2uk3Y9jrp9UjJ` (**Mawardy - Warm, Natural Egyptian**). Mawardy provides an authentic young adult Egyptian male voice with a friendly, energetic, and encouraging cadence suitable for a children's space adventure.
- **Voice Parameters:**
  - `stability: 0.50`
  - `similarity_boost: 0.85`
  - `style: 0.15`
  - `use_speaker_boost: true`

### 2.2 Quota Engineering (10,000 Character Boundary)
The complete narrative campaign script requires ~17,500 characters. To prevent unexpected quota depletion on the Free Tier (10,000 chars), generation is split into two prioritized batches:
1. **Batch A (Core Mission Critical - 8,420 chars):** Covers all 4 stages' primary gameplay loops, emergency warnings, and stage clears. Fits safely within the 10,000 limit with 1,580 characters reserved for retries.
2. **Batch B (Extended Deep Dives & Lore - 8,922 chars):** Optional detailed science explanations and room tour banter, to be generated when the user upgrades to the Starter Tier ($5/mo for 30,000 chars).

### 2.3 The 3-Line Offline Pilot Test Protocol
Before running Batch A, a non-destructive 3-line pilot script (`scripts/test_elevenlabs_pilot.mjs`) will synthesize 158 characters:

```json
[
  {
    "id": "pilot_01_welcome",
    "text": "أَهْلاً بِكَ يَا بَطَل فِي أَكَادِيمِيَّةِ الفَضَاءِ! أَنَا رُوبُو، رَفِيقُكَ فِي رِحْلَةِ القَمَر!",
    "purpose": "Verify Arabic diacritics (tashkeel), warm Egyptian greeting, and vocal presence."
  },
  {
    "id": "pilot_02_emergency",
    "text": "إِنْذَارٌ عَاجِل! عَاصِفَةٌ شَمْسِيَّةٌ تَقْتَرِب! ارْجِعْ فَوْراً لِمَخْبَأِ القَاعِدَةِ المَحْمِيّ!",
    "purpose": "Verify urgent emotional modulation, dynamic range, and ducking suitability."
  },
  {
    "id": "pilot_03_technical",
    "text": "تَمَّ ضَبْطُ ضَغْطِ البَدْلَةِ بِدِقَّةٍ عَلَى أَرْبَعَةٍ وَثَلَاثَةِ أَعْشَارِ بي إس آي!",
    "purpose": "Verify technical terminology, numerical reading, and acronym pronunciation ('PSI')."
  }
]
```

### 2.4 Pilot Acceptance Criteria:
1. Native Egyptian pronunciation verified; zero flat synthetic monotone.
2. Output format: $44.1\text{kHz}$ MP3 at $128\text{kbps}$.
3. Zero clipping or unnatural distortion during high-energy alerts.
4. Voice files saved directly to `public/audio/robo/pilot/` for immediate browser playback verification.

---

## 3. 3D Environment Asset Reality & Blender Toolchain

### 3.1 Local Blender CLI Audit
- System command `where.exe blender` returned code 1 (not installed on system PATH).
- Relying on manual local Blender artist interaction is an active development blocker unless automated or substituted.

### 3.2 Dual Resolution Strategy:
1. **Immediate In-Engine Solution (Three.js WebGL Primitives):**
   - Three.js can programmatically generate true 3D spherical meshes with smooth subdivision (`THREE.SphereGeometry(radius, 64, 64)`).
   - High-resolution equirectangular NASA textures (Earth 8K, Moon 4K, Saturn ring geometry) mapped onto meshes with custom GLSL atmospheric shaders.
   - Requires zero external 3D software installation and produces authentic perspective depth and lighting.
2. **Offline Pre-Rendering Pipeline (Automated Headless Blender):**
   - If standalone Blender is installed by the user, an automated Python script (`scripts/blender_render_sprites.py`) executed via `blender -b -P scripts/blender_render_sprites.py` will render multi-angle isometric sprite sheets with baked ambient occlusion and shadows.

---

## 4. Separation of Genuine Aerospace Science vs. Game Balancing Rules

To preserve AstroNutri's educational integrity, design specifications must strictly distinguish physical reality from educational game balancing:

| Concept / Parameter | Scientific Reality (NASA / ESA Standard) | Game Design Balancing Rule | Educational Objective for Children |
| :--- | :--- | :--- | :--- |
| **Spacesuit Pressure** | **Genuine Aerospace Science:** NASA Extravehicular Mobility Units (EMU) pressurize to **$4.3\,\text{PSI}$ ($29.6\,\text{kPa}$) of 100% pure oxygen**. This lower pressure prevents the spacesuit joints from inflating stiff like a tire, allowing astronauts to bend their fingers and knees in a vacuum. | Player adjusts digital regulator needle to match $4.3\,\text{PSI}$ target. | Teaches the physics of pressure differentials and why spacesuits are pressurized vessels. |
| **Water Recycling (ECLSS)** | **Genuine Aerospace Science:** The ISS and Artemis Environmental Control and Life Support Systems recover up to **$98\%$ of all wastewater** (breath moisture, sweat, urine) via vacuum distillation and catalytic oxidation. | $3\times 3$ pipe rotation mini-game restoring base water meter from $30\%$ to $100\%$. | Teaches that water is a scarce, precious resource in space that must be recycled closed-loop. |
| **Food Crumb Hazard** | **Genuine Aerospace Science:** Regular bread was banned by NASA after the 1965 Gemini 3 corned beef sandwich incident because floating crumbs enter electrical conduits and astronaut eyes. Tortillas have been standard since 1985. | Crumb alert modal triggers if the player packs biscuits or crackers into the flight tray. | Teaches fluid and particulate behavior in microgravity. |
| **Fluid Shift & Taste** | **Genuine Aerospace Science:** Without gravity pulling blood to the legs, $1.5–2\,\text{liters}$ of bodily fluid shifts into the head and torso, causing facial puffiness, nasal congestion, and blunted taste buds. | Medical Bay diagnosis prompt; astronauts request spicy or flavorful foods. | Teaches human physiological adaptation to spaceflight. |
| **Return Cargo Weight ($100\,\text{kg}$)** | **Game Balancing Rule (NOT a NASA regulation):** Spacecraft payload limits vary wildly by mission architecture (Apollo CM payload was $\sim 105\,\text{kg}$ of rocks; Artemis Orion payload is $\sim 100\,\text{kg}$ to $250\,\text{kg}$). | Enforcing a fixed $100\,\text{kg}$ total capacity with Left/Right bay slots. | Teaches children addition, constraint budgeting, and resource prioritization. |
| **Cargo Variance ($\le 15\,\text{kg}$)** | **Game Balancing Rule (NOT a NASA regulation):** Spacecraft center-of-mass (CG) is calculated via complex moment-of-inertia matrices, ballistic trim angles, and ballast tanks. | Requiring $\|W_{\text{left}} - W_{\text{right}}\| \le 15\,\text{kg}$ to unlock launch. | Teaches children physical balance, symmetry, and center-of-gravity concepts. |

---

## 5. Curated Audio Production Inventory

### 5.1 Robo Voice Packs (Pre-Rendered ElevenLabs MP3s)
- Total clips: 74 clips (~20.3 minutes audio).
- Location: `public/audio/robo/{stage}/{clip_id}.mp3`.
- Bundled directly with Vite build for 100% offline playback.

### 5.2 Environmental Ambience (Sampled Stereo Audio)
- `earth_island_breeze.mp3`: Gentle coastal breeze with subtle electronic telemetry ($96\text{kbps}$, loop).
- `ship_cabin_hum.mp3`: Deep $60\text{Hz}$ spacecraft avionics hum, air circulation, cooling pumps ($96\text{kbps}$, loop).
- `lunar_eva_breath.mp3`: Vacuum silence, subtle helmet breathing regulator hiss ($96\text{kbps}$, loop).
- `reentry_plasma_roar.mp3`: Roaring atmospheric friction plasma, buffeting re-entry wind ($112\text{kbps}$, loop).

### 5.3 Tactile Mechanical Sound Effects
- `slingshot_gas_burst.mp3`: Pressurized gas burst + bungee release tension ($<15\text{ms}$ latency).
- `zero_g_pod_bounce.mp3`: Soft rubberized elastic bounce with metallic resonance.
- `pneumatic_hatch_open.mp3`: Pneumatic seal depressurization followed by hydraulic slide.
- `pipe_valve_ratchet.mp3`: Metallic ratchet click with high-pressure fluid rush.
- `locker_magnetic_lock.mp3`: Magnetic latch snapping shut with verification chime.
- `suit_helmet_seal.mp3`: O-ring air seal clamp + pressure regulator valve chirp.
