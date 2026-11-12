import { extractTransparentPNG } from './matte_extractor.mjs';

const assets = [
  {
    src: 'C:/Users/ACER/.gemini/antigravity/brain/a359c7a6-4d60-4643-9e78-c4834f781ff4/floating_space_island_1794501701119.jpg',
    dest: 'public/assets/art/island_floating_base.png',
    threshold: 242,
    options: { removeFloorShadow: true, floorShadowStartY: 720, shadowSatMax: 22, minShadowAvg: 190 }
  },
  {
    src: 'C:/Users/ACER/.gemini/antigravity/brain/a359c7a6-4d60-4643-9e78-c4834f781ff4/robo_character_canonical_1794501760466.jpg',
    dest: 'public/assets/art/robo_canonical_wave.png',
    threshold: 244,
    options: { removeFloorShadow: true, floorShadowStartY: 740, shadowSatMax: 16, minShadowAvg: 145 }
  },
  {
    src: 'C:/Users/ACER/.gemini/antigravity/brain/a359c7a6-4d60-4643-9e78-c4834f781ff4/robo_astro_spaceship_1794501805745.jpg',
    dest: 'public/assets/art/spaceship_canonical.png',
    threshold: 244,
    options: { removeFloorShadow: true, floorShadowStartY: 480, shadowSatMax: 18, minShadowAvg: 140 }
  }
];

for (const a of assets) {
  console.log(`Extracting ${a.dest}...`);
  extractTransparentPNG(a.src, a.dest, 1024, 1024, a.threshold, 4, a.options);
}
console.log('All 3 core assets extracted!');
