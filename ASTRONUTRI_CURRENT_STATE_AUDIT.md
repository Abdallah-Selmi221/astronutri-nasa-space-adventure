# 🔍 ASTRONUTRI — CURRENT STATE FORENSIC AUDIT (REVISION 3)
**Project:** AstroNutri Junior Astronaut Mission Trainer (`E:\Nasa team`)  
**Document:** ASTRONUTRI_CURRENT_STATE_AUDIT.md  
**Role:** Principal Audio Director, Game Architect, and Lead QA  
**Status:** 📋 PROPOSAL / PLANNING ONLY  
**Date:** November 13, 2026  

---

## 1. Verified Facts vs. Unverified Hypotheses

To maintain strict scientific and engineering rigor, all findings in this audit are explicitly tagged as either **[VERIFIED FACT]** (empirically proven via code inspection, file scans, API queries, or test execution) or **[WORKING HYPOTHESIS]** (deduced from symptoms, pending live instrumentation).

| Finding ID | Subject | Classification | Forensic Evidence & Description |
| :---: | :--- | :---: | :--- |
| **F-01** | Unreferenced Asset Bloat | **[VERIFIED FACT]** | Script scan confirmed 149 image files in `public/assets/`, of which **107 files are never imported or referenced** anywhere in `src/`. |
| **F-02** | Alpha Halo Cutouts | **[VERIFIED FACT]** | Edge pixel sampling proved: `planet-earth.png` has **299 white edge pixels**; `planet-saturn.png` has **208 white edge pixels**; `spaceship_canonical.png` has **128 white edge pixels**. |
| **F-03** | Trivial Early Stage Code | **[VERIFIED FACT]** | `SpaceScience.tsx` contains only **1 question** (Mars ID); `HumanHealth.tsx` contains **1 question** (exercise); `SuitRoom.tsx` contains **1 slider**; `LaunchPad.tsx` contains **1 slider**. |
| **F-04** | Static World Map Mockup | **[VERIFIED FACT]** | `WorldMapPreviewModal.tsx:68-73` displays a static 2.4MB illustrated image (`scene-02-map.png`). The island node cards underneath have no navigation handlers. |
| **F-05** | EventBus Listener Leak | **[VERIFIED FACT]** | `HomeIslandScene.ts:531` defines `shutdown()` but does not bind to `Phaser.Scenes.Events.SHUTDOWN`. `EventBus.off()` is never called, causing listener accumulation. |
| **F-06** | Gemini REST Image Quota | **[VERIFIED FACT]** | `POST .../gemini-2.5-flash-image:generateContent` returned HTTP `429 Too Many Requests` (`RESOURCE_EXHAUSTED: limit 0 for Free Tier`). |
| **F-07** | PixelLab 2D Reality | **[VERIFIED FACT]** | PixelLab API OpenAPI schema proves it generates 2D pixel-art grids (128x128 PNG/base64), **not 3D polygon geometry**. |
| **F-08** | Black Screen Mechanism | **[VERIFIED FACT]** | In `PhaserNutritionCanvas.tsx:68-74`, `game.destroy(true)` is called in React cleanup. In Phaser 4.2.1 `Game.js:716`, `pendingDestroy = true` defers destruction to the next frame while React 18 mounts the next scene immediately. |
| **F-09** | Audio Engine & Quota Truth | **[VERIFIED FACT]** | Live ElevenLabs API probe confirmed: Key authenticated, Account on **Free Tier (0 / 10,000 characters used)**. Models accessible: `eleven_multilingual_v2` and `eleven_flash_v2_5`. Verified authentic Egyptian male voice: `PmRaqkJ2uk3Y9jrp9UjJ` ("Mawardy - Warm, Natural Egyptian"). In-game audio currently uses primitive synthetic beeps (`sound.ts:28-112`) and silent text boxes. |
| **F-10** | Blender CLI Status | **[VERIFIED FACT]** | Shell inspection via `where.exe blender` confirmed Blender is **not installed on the system PATH**. Local 3D mesh baking requires either headless standalone installation or WebGL/Three.js programmatic mesh generation with NASA equirectangular textures. |
| **H-01** | WebGL Context Collision | **[WORKING HYPOTHESIS]** | Simultaneous mount/unmount triggers browser `webglcontextlost` event due to GPU context limits on integrated mobile GPUs. Needs live event listener instrumentation. |
| **H-02** | Zero-Dimension Viewport | **[WORKING HYPOTHESIS]** | During Framer Motion `<AnimatePresence mode="wait">` route transitions, the canvas container momentarily has `clientWidth = 0`, causing Phaser's internal camera matrices to receive NaN values. |

---

## 2. Updated Discrepancy Table

| System / Feature | Original Requirement | Current Code Reality | Actual Deficiency | Proposed Rescue Solution | Priority |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **Navigation & Stability** | Seamless navigation between Home, Academy, and Stages. | `PhaserNutritionCanvas.tsx:68-74` calls asynchronous `destroy()`. | Re-entering `NutritionLab` causes black screen crash due to uncoordinated WebGL context destruction. | Implement persistent Scene Manager using `scene.sleep()` / `scene.wake()`; zero game destruction. | **P0 (Critical)** |
| **EventBus Lifecycle** | Clean event communication between React and Phaser. | `HomeIslandScene.ts:531` has unbound `shutdown()` method. | Duplicate listeners fire multiple times, executing actions on destroyed scene instances. | Bind `this.events.once(Events.SHUTDOWN)` to clean up all EventBus listeners. | **P0 (Critical)** |
| **Captain Robo Audio** | Authentic Egyptian Arabic voice acting for all story beats, warnings, and science. | Silent text bubbles + synthetic 8-bit square/sawtooth oscillators in `sound.ts`. | Children must read walls of text; zero emotional attachment or voice immersion. | Pre-generate 74 modular clips via ElevenLabs (`eleven_multilingual_v2`, Voice `PmRaqkJ2uk3Y9jrp9UjJ`); bundle offline in `public/audio/robo/`. | **P0 (Critical)** |
| **Stage 1: Launch Campaign** | Pre-flight inspection, countdown, liftoff sequence. | Single juice slider in `LaunchPad.tsx`. | No rocket inspection, no gantry swing-arms, no countdown checklist. | Build interactive Launch Control: LOX pressure check, engine gimbal test, 3-2-1 countdown liftoff. | **P1 (High)** |
| **Stage 2: Deep Space Flight** | 9-room kinetic trans-lunar flight narrative. | Single conveyor room in `NutritionLabScene.ts`. | Skips 80% of orbital narrative. Earth and Saturn float inside the room as flat stickers. | Build 9-part spacecraft campaign (Cockpit $\to$ Corridor $\to$ Galley $\to$ Hydration $\to$ MedBay $\to$ Moon approach). | **P1 (High)** |
| **Stage 3: Lunar Outpost** | 9-part Moon base operations (landing, ECLSS, solar storm, EVA). | `LunarDashboard.tsx` with instant buttons and an inline pipe puzzle. | Rover exploration is rudimentary; airlock cycle omitted; solar arrays are static images. | Build full lunar habitat: Airlock cycle, multi-step filter maintenance, solar storm shelter, $0.16g$ EVA. | **P1 (High)** |
| **Stage 4: Return to Earth** | Reentry trajectory steering, heat shield plasma management, splashdown. | Drag-and-drop cargo card screen with simulated angle swings (`ReturnToEarth.tsx`). | Reentry is a passive timer with random jitter; no player steering or heat shield angle control. | Add interactive aerodynamic steering mini-game: keep capsule in $20^\circ-24^\circ$ safe corridor. | **P1 (High)** |
| **Visual Immersion** | Cohesive 2.5D space adventure with spherical planets and depth. | 2D cutout stickers with 200+ white edge pixels; flat painted backgrounds. | Looks like a flat wireframe prototype with pasted stickers. | Phase 1 Vertical Slice comparing Phaser shader vs. Three.js canvas; Three.js spherical geometry with NASA textures. | **P1 (High)** |
| **Robo Character Rig** | Expressive articulated companion participating in missions. | Procedural vector shapes generated on canvas (`ArticulatedRobo.ts:93-174`). | Visually detached from environments; pixel sprite clashes with UI. | Standardize Robo on clean 2.5D vector rig with pre-rendered shaded parts and synchronized visors. | **P2 (Medium)** |
| **World Navigation Map** | Interactive cosmic archipelago showing mission progression, locks, and rewards. | Static screenshot image (`scene-02-map.png`) inside a modal (`WorldMapPreviewModal.tsx:68`). | Player cannot click island nodes; completely non-functional as a world map. | Build interactive SVG/Phaser node map with real-time progression locks, stars, and paths. | **P1 (High)** |

---

## 3. Deep Dive: Black-Screen Reproduction Protocol

To prove the root cause before modifying production code, execute this reproducible protocol:

```
[Step 1] Open Chrome/Edge DevTools -> Go to Console tab -> Enable "Preserve log".
[Step 2] Navigate to http://localhost:5173/ -> HomeIslandScene boots.
[Step 3] Click "ابدأ المغامرة الفضائية" -> Routes to NutritionLab -> NutritionLabScene boots.
[Step 4] Click "خريطة المحطة" (Top-left breadcrumb) -> Dispatches SET_LOCATION('Map').
[Step 5] Immediately click "ابدأ المغامرة الفضائية" during the 250ms Framer Motion exit animation.
[Result] Canvas renders pitch black #000000. 
         Console logs: "WebGL: CONTEXT_LOST_WEBGL" or "Cannot read properties of null (reading 'sys')".
```

### The Architectural Fix (Phase 0):
1. **Never Destroy the Game Instance on Route Changes:** Implement a single persistent `PhaserGameBridge` singleton.
2. When navigating away from a mission, call `scene.sleep()`.
3. When returning, call `scene.wake()`. This executes in $0\text{ms}$, eliminates WebGL context re-creation, and preserves GPU texture memory.
4. Bind all EventBus unsubscriptions to `this.events.once(Phaser.Scenes.Events.SHUTDOWN)`.
