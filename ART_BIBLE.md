# AstroNutri: The Visual Art Bible & World Design Standard
**Document Version:** 1.0.0  
**Phase:** 3.3 Visual Identity & Art Bible Overhaul  
**Target Audience:** Children aged 7–12  
**Artistic Style:** Whimsical 2.5D Pastel Glassmorphism (الزجاج الكرتوني الناعم)  
**Status:** Approved Master Specification for Production

---

## 1. The Anti-Frankenstein Manifesto: Why Mismatched Collages Are Banned

The earlier iteration suffered from visual incoherence: photorealistic textures sat next to flat icons, roughly cropped PNGs showed jagged edges, and military navy dashboards clashed with children's game expectations. 

### Core Asset Rules (Zero-Drift Standards):
1. **Zero Cropped-Image Collages:** No cutting out pieces of disparate stock photos or generic clip art.
2. **Unified Mathematical Vector Standard:** Every world element, character pose, island silhouette, and UI widget is rendered via structured **SVG vectors** and **procedural Canvas graphics**.
3. **Consistent Contour & Linework:**
   - Exterior Object Outlines: `2.5px – 3.5px` rounded strokes in dark navy slate (`#1E293B` or tinted `#0F172A`).
   - Interior Detail Lines: `1.5px – 2px` soft tinted strokes (`rgba(255, 255, 255, 0.35)` or dark translucent).
   - Zero razor-sharp 90° corners: Every corner uses rounded geometry ($R \ge 16\text{px}$ for panels, $R \ge 9999\text{px}$ for pills).
4. **Single Light Source Direction:**
   - Universal Key Light: 45° from the top-left (warm soft white `#FFFDF5`).
   - Universal Ambient Fill: Bottom-up cosmic glow (soft cyan `#8DE8F4` or lavender `#C9B8FF`).
   - Dynamic Cast Shadows: Soft elliptical blur (`rgba(13, 19, 38, 0.45)`) anchoring every floating object to its physical ground plane.

---

## 2. Standardized Color Harmony Palette

```
   [SOFT CYAN]       [SKY BLUE]       [LAVENDER]       [PASTEL PINK]    [CREAM GOLD]     [MINT GREEN]
     #8DE8F4          #A9C9FF          #C9B8FF           #FFC3D8          #FFE69A          #7AE582
   (UI & Glass)    (Atmosphere)      (Nebulae)        (Delight/Alert)    (Stars/Win)    (Hydroponics)
```

| Token Name | Hex Code | Visual Role & Usage Guidelines |
| :--- | :---: | :--- |
| **Pastel Cyan** | `#8DE8F4` | Primary interactive color: button borders, visor glow, energy shields, active dropzones. |
| **Sky Blue** | `#A9C9FF` | Atmospheric twilight gradients, sky lighting, ocean reflections on glass. |
| **Dream Lavender** | `#C9B8FF` | Deep space nebulae, cosmic clouds, magical mystery zones. |
| **Pastel Pink** | `#FFC3D8` | Sweet accent color: special collectibles, secondary highlights, warm friendly alerts. |
| **Cream Gold** | `#FFE69A` | Achievement color: star counters, badges, victory crowns, golden padlocks. |
| **Mint Green** | `#7AE582` | Organic living color: hydroponic greenhouse plants, space apples, safe food approvals. |
| **Pearl White** | `#F8FCFF` | Foreground typography, bright specular reflections, puffy cartoon clouds. |
| **Deep Twilight** | `#0D1326` | Deepest background horizon (soft midnight navy, never pitch black `#000000`). |

### The "Pastel Glassmorphism" Formula
Translucent glass surfaces represent futuristic, child-friendly space habitats:
```css
background: rgba(255, 255, 255, 0.12);
backdrop-filter: blur(16px);
-webkit-backdrop-filter: blur(16px);
border: 2px solid rgba(255, 255, 255, 0.45);
box-shadow: 0 12px 32px rgba(13, 19, 38, 0.35), inset 0 2px 4px rgba(255, 255, 255, 0.3);
border-radius: 24px;
```

---

## 3. The 3-Layer Environmental Depth Standard (2.5D Parallax)

Each planetary island is designed as an interactive, multi-layered cartoon world rather than a flat background image:

```
+─────────────────────────────────────────────────────────────────────────────+
| LAYER 3: FOREGROUND / PLAYER PLANE (Depth: 1.0)                             |
| • Translucent floating glass inventory shelf & illuminated cargo bay        |
| • Framing soft clouds and hanging hydroponic space-vines                    |
| • Minimum interaction scale: 64x64px touch targets                          |
+─────────────────────────────────────────────────────────────────────────────+
| LAYER 2: MIDGROUND / ACTION PLANE (Depth: 0.5)                              |
| • The Floating Planetary Island terrain with lush pastel moss               |
| • Landmark Architecture (Geodesic Greenhouse Dome, Planet Observatory)      |
| • Grounded Robo and docked Cartoon Spaceship with thruster glow             |
| • Real cast shadows on terrain                                              |
+─────────────────────────────────────────────────────────────────────────────+
| LAYER 1: BACKGROUND / CELESTIAL PLANE (Depth: 0.15)                         |
| • Distant floating island silhouettes shrouded in mist                      |
| • Orbiting cartoon moon with craters, twinkling pastel star clusters        |
| • Soft billowy twilight nebulae shifting with subtle parallax motion        |
+─────────────────────────────────────────────────────────────────────────────+
```

---

## 4. Robo Character Rig Specification (Vector/SVG Rig)

Robo is the living companion of the child. He is never a flat cut-out sticker; his proportions, lighting, and expressions reflect a friendly boy-robot:

### Proportions & Anatomy:
- **Head:** Oversized spherical dome ($1.2\times$ torso width) with glossy curved glass visor.
- **Visor (Face Display):** High-contrast cyan/gold LED matrix capable of displaying eyes, smile, wink, sound-waves, and warning icons.
- **Torso:** Pill-shaped chassis with pastel cyan chest-plate and glowing heart energy core.
- **Arms:** Floating magnetic hands without rigid sharp elbows; smooth organic motion.
- **Thruster Base:** Curved anti-gravity jet engine producing soft pastel particle rings instead of dirty exhaust.
- **Grounding Shadow:** Scaled ellipse that stretches and squashes dynamically when Robo bobs up and down.

```
                  ╭───────────────╮
                 │   ●  ‿  ●     │  <-- Expressive Curved Visor
                 ╰───────┬───────╯
                  ╭──────┴───────╮
             ✋   │     [♥]      │   ✋ <-- Floating Magnetic Hands
                  ╰──────┬───────╯
                        (✹)             <-- Anti-Grav Thruster
                     ░░░░░░░            <-- Cast Ground Shadow
```

### The 6 Canonical Character Poses:
1. **Idle / Floating (`IDLE`):** Gentle sinusoidal hover ($\pm 6\text{px}$), subtle breathing scale ($0.98\to 1.02$), natural visor blinks every 3–5 seconds.
2. **Happy Greeting (`WAVE`):** Right hand waving with joyful 15° head tilt, curved smiling eyes `( ˘ ᵕ ˘ )`, warm chest pulse.
3. **Talking / Guide (`TALK`):** Visor displays animated audio wave bars responding to voice amplitude; open palms gesturing to the game world.
4. **Curious / Thinking (`THINK`):** Hand under chin, tilted head, pulsing question mark on visor `( ? _ ? )`.
5. **Friendly Warning (`WARN`):** Protective forward palm, amber exclamation mark on visor `( ! _ ! )`, gentle head shake (caring peer, never scary).
6. **Celebrating Victory (`WIN`):** Both arms pumped skyward, bouncing hop, golden star halo bursting from his head.

---

## 5. Child-Friendly UX & Settings Philosophy

1. **The World is the Interface:** Navigation is achieved by tapping physical destinations (islands, ships, doors), not textual dropdowns or breadcrumbs.
2. **Massive Tactile Touch Targets:** All interactive buttons are minimum $64\times 64\text{ px}$ on mobile, styled with pillowy 3D bottom bevels (`box-shadow: 0 8px 0 ...`) that depress when tapped.
3. **Zero Jargon Settings:** Technical telemetry, sliders, and audio buffers are hidden. The child sees:
   - 🔊 Large Speaker Button (Sound Effects On/Off)
   - 🎵 Large Musical Note (Music On/Off)
   - 🤖 Large Robo Face (Voice On/Off)
   - 🚀 Large Rocket Button (Start Over from Beginning with gentle confirmation modal)

---

## 6. Implementation Strategy: From Sandbox to Engine

The `design_sandbox.html` page serves as the executable visual benchmark. Once approved:
- The SVG definitions are modularized into reusable React/Phaser components (`RoboRig.tsx`, `IslandWorld.tsx`, `PastelButton.tsx`).
- The Phase 2.3 game logic connects to these new visual containers with **zero modifications to the verified rules**.
