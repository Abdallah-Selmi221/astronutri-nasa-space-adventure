# 🎨 ASTRONUTRI — ASSET REPLACEMENT & PRODUCTION MATRIX (REVISION 3)
**Project:** AstroNutri Junior Astronaut Mission Trainer (`E:\Nasa team`)  
**Document:** ASTRONUTRI_ASSET_REPLACEMENT_MATRIX.md  
**Role:** Principal Audio Director, Game Architect, and Lead Visual Designer  
**Status:** 📋 PROPOSAL / PLANNING ONLY — ZERO ASSETS MODIFIED OR DELETED  
**Date:** November 13, 2026  

---

## 1. Executive Correction: Beyond 2D Alpha Cleaning

The initial proposal focused on running an alpha-matte cleaning script to remove white cutout halos from 2D flat sprites. **That is insufficient.** Removing white pixels from a flat sticker does not turn it into a convincing 2.5D celestial sphere, an articulated mascot, or an immersive spacecraft interior.

### The Revised Asset Production Standard:
1. **Planets Must Be Spherical Objects:** Real celestial spheres with equirectangular NASA planetary maps (Blue Marble Earth 2K, Saturn with semi-transparent ring alphas, Moon LROC 2K), featuring ambient sunlight shading and atmospheric Fresnel limb glows.
2. **Spacecraft Exterior & Interior Must Have True Perspective:** Modeled in 3D with baked ambient occlusion and normal maps, exported either as GLTF/GLB (for Three.js) or as high-DPI pre-rendered multi-angle sprite layers (for Phaser 2.5D).
3. **No Stickers Inside Rooms:** Earth and Saturn must **never** be placed inside interior rooms (such as the Nutrition Lab). Celestial bodies belong exclusively in the distant space skybox seen through structural spacecraft windows.
4. **Voice Acting Is an Indispensable Core Asset:** Visual assets alone cannot carry the narrative. 74 authentic Egyptian Arabic voice clips synthesized via ElevenLabs (`eleven_multilingual_v2`, Voice `PmRaqkJ2uk3Y9jrp9UjJ`) form an integrated layer of the asset production pipeline.

---

## 2. 3D Engine & Blender Technical Toolchain

| Metric | Assessment & Findings | Implementation Path |
| :--- | :--- | :--- |
| **Tool Name & Version** | Blender 4.x (Open Source 3D Creation Suite) | Offline desktop asset authoring tool. |
| **System Availability** | Not currently in system PATH (`where.exe blender` returned not found). | Can be installed locally or run headlessly via automated Python export scripts (`blender -b -P scripts/export_assets.py`). |
| **In-Engine Fallback** | Three.js WebGL programmatic primitives (`SphereGeometry`, `CylinderGeometry`). | Generates true 3D UV-mapped spheres directly in code without requiring a local Blender executable. |
| **Shading & Baking** | Cycles / Eevee baking: Ambient Occlusion (AO), Normal Maps, and Diffuse Albedo. | Bakes dimensional lighting directly into textures, providing rich visual depth even when rendered in 2.5D. |
| **Export Formats** | **Option 1:** `.glb` / `.gltf` with Draco compression (for Three.js runtime rendering during Phase 1 POC).<br>**Option 2:** 32-bit PNG orthographic sprite sheets with pre-multiplied alpha (for Phaser 2.5D rendering). | Dual export allows the Phase 1 Vertical Slice to test both runtime 3D and pre-rendered 2.5D approaches side by side. |

---

## 3. Honest Capability Matrix of Connected Services

```
+---------------------------------------------------------------------------------------------------------+
| TOOL / SERVICE       | CAPABILITY TRUTH                 | HARD LIMITATIONS        | ROLE IN REBUILD     |
+---------------------------------------------------------------------------------------------------------+
| ElevenLabs API       | Premium Multilingual AI TTS,     | Free tier limit of      | PRIMARY AUDIO:      |
| (REST /v1)           | authentic Egyptian Arabic voice  | 10,000 characters. Must | All 74 Robo dialogue|
|                      | cloning, emotional modulation.   | split into batches.     | lines & alerts.     |
+---------------------------------------------------------------------------------------------------------+
| Three.js / Blender   | Full 3D polygon modeling, UV     | Blender not on PATH;    | Core visual engine  |
| (3D Architecture)    | mapping, dynamic perspective,    | Three.js requires GPU   | for planets, ship   |
|                      | GLTF export, sprite rendering.   | lifecycle management.   | hull, and cockpit.  |
+---------------------------------------------------------------------------------------------------------+
| Gemini API           | Text generation, multimodal      | Does NOT generate       | Scientific dialogue,|
| (Google AI)          | reference analysis.              | 3D meshes. Image REST   | hint system, and    |
|                      |                                  | endpoint is 429.        | fact validation.    |
+---------------------------------------------------------------------------------------------------------+
| PixelLab API         | 2D pixel-art sprites (128x128),  | Does NOT generate 3D    | Optional 8-bit retro|
| (v2 OpenAPI)         | 4-dir/8-dir walk cycle frames.   | geometry or vectors.    | mini-games in lunar |
|                      | Balance: 38 credits remaining.   | Clashes with 2.5D.      | arcade terminal.    |
+---------------------------------------------------------------------------------------------------------+
| Canva Connect API    | Automated layout creation, 2D    | Does NOT generate       | Mission badges, HUD |
| (v1 REST)            | vector badges, export of banners.| 3D models or physics.   | frames, printable   |
|                      | Active OAuth2 in tokens.json.    |                         | certificates.       |
+---------------------------------------------------------------------------------------------------------+
```

---

## 4. Master Asset Replacement & Production Inventory

### 4.1 Celestial Bodies & Space Environment

| Asset ID | Current Defective Asset | Required Production Asset | Modeling & Texturing Method | Export Format | Target Scene | Quality Acceptance Standard |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **AST-CEL-01** | `planet-earth.png` (165x156 cutout, 299 white edge px) | True 3D Spherical Earth with Blue Marble 2K texture, cloud layer, and Fresnel atmospheric rim. | Three.js `SphereGeometry(64,64)` or Blender UV Sphere with NASA Visible Earth albedo + cloud bump map. | `.glb` (Three.js) + 512x512 pre-rendered rotation frames | Space Skybox (Distant $Z=0$) | Zero cutout fringe; natural spherical terminator shadow; smooth atmospheric glow. |
| **AST-CEL-02** | `planet-saturn.png` (270x177 cutout, 208 white edge px) | True 3D Saturn with semi-transparent Cassini ice rings and ring shadow cast onto planet. | Three.js sphere + planar ring with alpha transparency channel. | `.glb` + 640x360 pre-rendered sprite | Space Skybox (Distant $Z=0$) | Translucent rings; correct shadow casting; never rendered inside interior rooms. |
| **AST-CEL-03** | `lunar_outpost_shackleton_2_5d.jpg` (Flat 2D painting) | Multi-plane 2.5D Lunar Outpost: Crater rim terrain, glowing habitat domes, and animated solar arrays. | Modular terrain strip with baked AO and separate foreground rock props. | 2560x1440 PNG layers + normal maps | `LunarOutpostScene.ts` | Parallax scrolling at 3 distinct depth speeds; Robo scales naturally with perspective. |

---

### 4.2 Spacecraft Exterior & Boarding Sequence

| Asset ID | Current Defective Asset | Required Production Asset | Modeling & Texturing Method | Export Format | Target Scene | Quality Acceptance Standard |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **AST-SHP-01** | `spaceship_canonical.png` (1024x1024 sticker, 128 white edge px) | Modular 3D Spaceship: Aerodynamic fuselage, landing pads, glowing ion thrusters, and animated pneumatic hatch. | Modeled in Blender / Three.js: Rigged hatch door, interior airlock threshold, landing gear pistons. | `.glb` + 8-frame hatch opening sprite sheet | `HomeIslandScene.ts` & `LaunchPad.tsx` | Hatch unlatches and swings down into a boarding ramp; Robo physically walks inside. |

---

### 4.3 Spacecraft Interior Environments (Stage 2)

| Asset ID | Current Defective Asset | Required Production Asset | Modeling & Texturing Method | Export Format | Target Scene | Quality Acceptance Standard |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **AST-INT-01** | Missing (No cockpit exists) | Spacecraft Cockpit: Viewport looking out to Earth, dual avionics consoles, pilot seat for Robo. | Modeled in Blender: Perspective corridor with metallic bulkheads and illuminated glass displays. | 1920x1080 2.5D layered PNG | `SpacecraftCockpit.tsx` | Viewport reveals receding Earth; interactive instrument checklist triggers. |
| **AST-INT-02** | `platform-bridge-metal-left.png` (Repurposed platformer ledge) | Padded Zero-G Transit Corridor with high-visibility EVA handrails and emergency magnetic lockers. | Modeled in Blender: Cylindrical tunnel perspective with wall-mounted rails and lockable bins. | 1920x1080 2.5D layered PNG | `TransitCorridorScene.ts` | 4 tactile handrails with physics aiming vectors; lockers open and snap shut. |
| **AST-INT-03** | `cargo-crate-clean.png` (Wooden crate style) | NASA Space Food Galley: Magnetic food tray holder, convection food warmer, rehydration port. | Modeled in Blender with clean anodized aluminum and brushed steel materials. | 1280x720 2.5D PNG + SVG tray slots | `FoodStorageGalley.tsx` | Drag-and-drop meal tray slots; magnetic snap zones; crumb warning sensor. |
| **AST-INT-04** | Missing (Drink tube icon only) | Zero-G Hydration Station: Potable water dispenser, sealed pouch clamp, and surface-tension droplet physics. | Modeled in Blender: Precision medical-grade water dispensing unit with pressure gauge. | 800x600 SVG/Canvas interactive rig | `HydrationStation.tsx` | Hold-and-release pressure timing gauge; floating droplet particle emitter. |

---

### 4.4 Artemis Lunar Outpost Systems (Stage 3)

| Asset ID | Current Defective Asset | Required Production Asset | Modeling & Texturing Method | Export Format | Target Scene | Quality Acceptance Standard |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **AST-LUN-01** | `PipePuzzle.tsx` (Isolated SVG pipes) | Multi-Step ECLSS Water Processor: Heavy unit casing, latch bolts, removable filter core, UV chamber. | Modeled in Blender with mechanical hinges and modular pipe cartridge assemblies. | 960x720 SVG/PNG interactive component | `ECLSSSystem.tsx` | Step 1: Unbolt casing $\to$ Step 2: Extract dirty filter $\to$ Step 3: Align pipe flow $\to$ Step 4: Re-seal. |
| **AST-LUN-02** | Missing (Screen flash only) | Water-Jacketed Habitat Core Radiation Shelter with heavy blast doors and dosimeter display. | Modeled in Blender: Reinforced survival vault interior with emergency lighting. | 1280x720 2.5D PNG | `HabitatShelter.tsx` | Siren beacon illuminates; door slides shut; radiation gauge normalizes before exit. |
| **AST-LUN-03** | Missing (Instant drill sparkles) | Lunar Geological Traverse: Shackleton Crater rim with shadowed ice fissures, basalt rocks, and Artemis rover. | Modeled in Blender: Detailed lunar surface with boulder props and core drilling markers. | 3840x1080 scrollable terrain strip | `LunarSurfaceScene.ts` | $0.16g$ kangaroo hopping; laser drill animation; drill core extraction feedback. |

---

### 4.5 Master Audio Asset Inventory (ElevenLabs Egyptian Arabic)

| Asset Group | Directory | Clip Count | Audio Format | Source Engine | Playback Rule |
| :--- | :--- | :---: | :--- | :--- | :--- |
| **Stage 1 Voice** | `public/audio/robo/stage1/` | 14 clips | $44.1\text{kHz}$ MP3, $128\text{kbps}$ | ElevenLabs (`PmRaqkJ2uk3Y9jrp9UjJ`) | 100% offline, duck BGM to 20%. |
| **Stage 2 Voice** | `public/audio/robo/stage2/` | 24 clips | $44.1\text{kHz}$ MP3, $128\text{kbps}$ | ElevenLabs (`PmRaqkJ2uk3Y9jrp9UjJ`) | Zero-latency, triggers subtitles. |
| **Stage 3 Voice** | `public/audio/robo/stage3/` | 24 clips | $44.1\text{kHz}$ MP3, $128\text{kbps}$ | ElevenLabs (`PmRaqkJ2uk3Y9jrp9UjJ`) | Synchronized with alarm sirens. |
| **Stage 4 Voice** | `public/audio/robo/stage4/` | 12 clips | $44.1\text{kHz}$ MP3, $128\text{kbps}$ | ElevenLabs (`PmRaqkJ2uk3Y9jrp9UjJ`) | Plasma roar ducking, victory sting. |
| **Atmospheric BGM** | `public/audio/music/` | 4 loops | Stereo MP3, $160\text{kbps}$ | Pre-rendered orchestral synth | Dynamic crossfading per room. |
| **Mechanical SFX** | `public/audio/sfx/` | 28 effects | Stereo MP3, $128\text{kbps}$ | Foley & procedural synthesis | Triggered by physics collisions/UI. |
