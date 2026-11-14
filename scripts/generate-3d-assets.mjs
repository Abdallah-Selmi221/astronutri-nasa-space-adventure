import fs from 'fs';
import path from 'path';

const foodDir = path.resolve('public/assets/food');
const uiDir = path.resolve('public/assets/ui');

fs.mkdirSync(foodDir, { recursive: true });
fs.mkdirSync(uiDir, { recursive: true });

// Common 3D SVG defs (Drop shadows, specular highlights, rim lighting)
const commonDefs = `
  <filter id="drop3d" x="-20%" y="-20%" width="140%" height="140%">
    <feDropShadow dx="0" dy="8" stdDeviation="5" flood-color="#020617" flood-opacity="0.65" />
    <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#38bdf8" flood-opacity="0.2" />
  </filter>
  <filter id="glow3d" x="-30%" y="-30%" width="160%" height="160%">
    <feGaussianBlur stdDeviation="4" result="blur" />
    <feComposite in="SourceGraphic" in2="blur" operator="over" />
  </filter>
  <linearGradient id="glassDome" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" stop-color="#ffffff" stop-opacity="0.55" />
    <stop offset="35%" stop-color="#38bdf8" stop-opacity="0.15" />
    <stop offset="70%" stop-color="#0284c7" stop-opacity="0.05" />
    <stop offset="100%" stop-color="#38bdf8" stop-opacity="0.4" />
  </linearGradient>
`;

const foodAssets = {
  'meat.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
  <defs>
    ${commonDefs}
    <radialGradient id="pouch3d" cx="35%" cy="25%" r="75%">
      <stop offset="0%" stop-color="#bae6fd" />
      <stop offset="45%" stop-color="#0284c7" />
      <stop offset="85%" stop-color="#0c4a6e" />
      <stop offset="100%" stop-color="#082f49" />
    </radialGradient>
    <radialGradient id="steak3d" cx="35%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#fb7185" />
      <stop offset="40%" stop-color="#e11d48" />
      <stop offset="85%" stop-color="#881337" />
      <stop offset="100%" stop-color="#4c0519" />
    </radialGradient>
    <linearGradient id="steakRim" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffe4e6" />
      <stop offset="50%" stop-color="#fecdd3" />
      <stop offset="100%" stop-color="#fb7185" />
    </linearGradient>
  </defs>
  <g filter="url(#drop3d)">
    <!-- 3D Rounded Space Pouch Base -->
    <rect x="24" y="18" width="112" height="124" rx="28" fill="url(#pouch3d)" stroke="#7dd3fc" stroke-width="3" />
    <!-- Top 3D Metallic Zip Lock -->
    <rect x="34" y="26" width="92" height="10" rx="5" fill="#0f172a" opacity="0.5" />
    <rect x="34" y="24" width="92" height="8" rx="4" fill="#e0f2fe" opacity="0.85" />
    <!-- Specular Gloss Highlight on Left -->
    <path d="M 36 42 Q 32 80 36 122" stroke="#ffffff" stroke-width="6" stroke-linecap="round" fill="none" opacity="0.45" />
    
    <!-- 3D Cartoon T-Bone / Steak Medallion in Center -->
    <g transform="translate(0, 4)">
      <!-- 3D Extrusion Depth of Steak -->
      <path d="M 46 82 C 36 62, 58 44, 84 48 C 110 52, 122 72, 110 92 C 98 110, 56 104, 46 82 Z" fill="#4c0519" transform="translate(0, 7)" />
      <!-- Steak Fat Rim -->
      <path d="M 46 82 C 36 62, 58 44, 84 48 C 110 52, 122 72, 110 92 C 98 110, 56 104, 46 82 Z" fill="url(#steakRim)" stroke="#fff1f2" stroke-width="2" />
      <!-- Juicy 3D Meat Face -->
      <path d="M 52 80 C 44 64, 62 50, 84 53 C 105 56, 114 72, 104 88 C 94 102, 60 97, 52 80 Z" fill="url(#steak3d)" />
      <!-- 3D Bone Ring -->
      <circle cx="72" cy="74" r="9" fill="#fff1f2" stroke="#fda4af" stroke-width="2" />
      <circle cx="72" cy="74" r="4" fill="#be123c" />
      <!-- Marbling & Glossy Specular Highlights -->
      <path d="M 86 64 Q 95 68 92 78" stroke="#fecdd3" stroke-width="3.5" stroke-linecap="round" fill="none" opacity="0.85" />
      <ellipse cx="64" cy="61" rx="8" ry="3.5" transform="rotate(-20 64 61)" fill="#ffffff" opacity="0.65" />
    </g>

    <!-- Bottom 3D Glossy Badge -->
    <rect x="36" y="114" width="88" height="20" rx="10" fill="#082f49" stroke="#38bdf8" stroke-width="2" />
    <text x="80" y="128" font-size="11" font-family="Cairo, Tajawal, sans-serif" font-weight="900" fill="#e0f2fe" text-anchor="middle">بروتين الفضاء</text>
  </g>
</svg>`,

  'fruits.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
  <defs>
    ${commonDefs}
    <radialGradient id="apple3d" cx="35%" cy="28%" r="70%">
      <stop offset="0%" stop-color="#fda4af" />
      <stop offset="25%" stop-color="#f43f5e" />
      <stop offset="70%" stop-color="#be123c" />
      <stop offset="100%" stop-color="#4c0519" />
    </radialGradient>
    <radialGradient id="peach3d" cx="32%" cy="28%" r="70%">
      <stop offset="0%" stop-color="#fef08a" />
      <stop offset="40%" stop-color="#fb923c" />
      <stop offset="85%" stop-color="#ea580c" />
      <stop offset="100%" stop-color="#9a3412" />
    </radialGradient>
    <linearGradient id="leaf3d" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#86efac" />
      <stop offset="50%" stop-color="#22c55e" />
      <stop offset="100%" stop-color="#14532d" />
    </linearGradient>
  </defs>
  <g filter="url(#drop3d)">
    <!-- 3D Glowing Emerald Base Pad -->
    <ellipse cx="80" cy="126" rx="54" ry="16" fill="#064e3b" stroke="#34d399" stroke-width="2.5" />
    <ellipse cx="80" cy="123" rx="46" ry="11" fill="#047857" />

    <!-- 3D Golden Peach / Orange on Right -->
    <g transform="translate(24, 10)">
      <circle cx="80" cy="82" r="30" fill="url(#peach3d)" stroke="#fed7aa" stroke-width="1.5" />
      <ellipse cx="70" cy="68" rx="9" ry="5" transform="rotate(-30 70 68)" fill="#ffffff" opacity="0.65" />
      <circle cx="64" cy="78" r="2.5" fill="#ffffff" opacity="0.8" />
    </g>

    <!-- 3D Cartoon Glossy Red Apple / Strawberry Front & Center -->
    <g transform="translate(-12, 2)">
      <!-- Apple Body with 3D Indentation -->
      <path d="M 78 46 C 62 44, 46 58, 48 82 C 50 106, 66 118, 78 114 C 90 118, 106 106, 108 82 C 110 58, 94 44, 78 46 Z" fill="url(#apple3d)" stroke="#fecdd3" stroke-width="1.5" />
      <!-- Stem -->
      <path d="M 78 48 Q 80 32 88 30" stroke="#78350f" stroke-width="5" stroke-linecap="round" fill="none" />
      <!-- 3D Leaf -->
      <path d="M 80 42 C 92 28, 112 32, 104 46 C 96 54, 84 48, 80 42 Z" fill="url(#leaf3d)" stroke="#bbf7d0" stroke-width="1.5" />
      <!-- 3D Specular Highlights -->
      <ellipse cx="64" cy="66" rx="11" ry="6" transform="rotate(-35 64 66)" fill="#ffffff" opacity="0.75" />
      <circle cx="58" cy="80" r="3.5" fill="#ffffff" opacity="0.8" />
      <!-- Cute Rim Light -->
      <path d="M 56 98 Q 78 112 98 96" stroke="#fda4af" stroke-width="3" stroke-linecap="round" fill="none" opacity="0.5" />
    </g>

    <!-- Space Dome Ring Overlay -->
    <ellipse cx="80" cy="80" rx="60" ry="58" fill="url(#glassDome)" stroke="#6ee7b7" stroke-width="2.5" opacity="0.65" />
  </g>
</svg>`,

  'cheese.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
  <defs>
    ${commonDefs}
    <linearGradient id="cheeseTop" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a" />
      <stop offset="50%" stop-color="#facc15" />
      <stop offset="100%" stop-color="#eab308" />
    </linearGradient>
    <linearGradient id="cheeseSide" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#f59e0b" />
      <stop offset="70%" stop-color="#d97706" />
      <stop offset="100%" stop-color="#92400e" />
    </linearGradient>
    <radialGradient id="cheeseHole" cx="65%" cy="65%" r="70%">
      <stop offset="0%" stop-color="#fbbf24" />
      <stop offset="70%" stop-color="#b45309" />
      <stop offset="100%" stop-color="#78350f" />
    </radialGradient>
  </defs>
  <g filter="url(#drop3d)">
    <!-- 3D Floating Space Tray -->
    <ellipse cx="80" cy="126" rx="58" ry="18" fill="#1e293b" stroke="#38bdf8" stroke-width="3" />
    <ellipse cx="80" cy="122" rx="48" ry="12" fill="#0f172a" />

    <!-- 3D Cartoon Cheese Wedge Side Face -->
    <path d="M 30 78 L 130 66 L 130 108 C 130 114, 122 118, 114 118 L 38 118 C 32 118, 30 112, 30 106 Z" fill="url(#cheeseSide)" stroke="#fde047" stroke-width="2" stroke-linejoin="round" />

    <!-- 3D Cartoon Cheese Wedge Top Face -->
    <path d="M 30 78 L 88 34 C 108 40, 124 50, 130 66 L 30 78 Z" fill="url(#cheeseTop)" stroke="#fef9c3" stroke-width="2.5" stroke-linejoin="round" />

    <!-- 3D Concave Cheese Holes -->
    <ellipse cx="62" cy="96" rx="11" ry="8" fill="url(#cheeseHole)" stroke="#fde047" stroke-width="1.5" />
    <ellipse cx="102" cy="90" rx="13" ry="9" fill="url(#cheeseHole)" stroke="#fde047" stroke-width="1.5" />
    <ellipse cx="84" cy="60" rx="9" ry="5" fill="url(#cheeseHole)" stroke="#fef08a" stroke-width="1.5" />
    <ellipse cx="82" cy="106" rx="6" ry="4.5" fill="url(#cheeseHole)" />

    <!-- Specular Glossy Highlights -->
    <path d="M 40 73 L 84 40" stroke="#ffffff" stroke-width="4" stroke-linecap="round" opacity="0.75" />
    <circle cx="46" cy="88" r="3.5" fill="#ffffff" opacity="0.65" />
  </g>
</svg>`,

  'sauce.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
  <defs>
    ${commonDefs}
    <radialGradient id="bottle3d" cx="30%" cy="30%" r="75%">
      <stop offset="0%" stop-color="#fca5a5" />
      <stop offset="30%" stop-color="#ef4444" />
      <stop offset="75%" stop-color="#b91c1c" />
      <stop offset="100%" stop-color="#450a0a" />
    </radialGradient>
    <linearGradient id="capGreen" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#86efac" />
      <stop offset="50%" stop-color="#16a34a" />
      <stop offset="100%" stop-color="#14532d" />
    </linearGradient>
    <linearGradient id="flameGold" x1="0%" y1="100%" x2="0%" y2="0%">
      <stop offset="0%" stop-color="#ef4444" />
      <stop offset="50%" stop-color="#f97316" />
      <stop offset="100%" stop-color="#fef08a" />
    </linearGradient>
  </defs>
  <g filter="url(#drop3d)">
    <!-- Outer Golden Aura Ring -->
    <circle cx="80" cy="86" r="56" fill="#f97316" opacity="0.15" />

    <!-- Tilted 3D Cartoon Hot Sauce Bottle -->
    <g transform="rotate(-14 80 84)">
      <!-- Nozzle Tip -->
      <path d="M 72 16 L 88 16 L 84 32 L 76 32 Z" fill="#ef4444" stroke="#fca5a5" stroke-width="1.5" />
      <!-- 3D Ribbed Green Cap -->
      <rect x="65" y="30" width="30" height="16" rx="6" fill="url(#capGreen)" stroke="#bbf7d0" stroke-width="2" />
      <!-- Bottle Neck -->
      <path d="M 68 46 L 92 46 L 104 66 L 56 66 Z" fill="url(#bottle3d)" stroke="#fca5a5" stroke-width="1.5" />
      <!-- Bottle Rounded 3D Body -->
      <rect x="48" y="62" width="64" height="76" rx="22" fill="url(#bottle3d)" stroke="#fca5a5" stroke-width="2.5" />
      
      <!-- 3D Glossy Specular Highlight down the bottle -->
      <path d="M 58 70 L 58 124" stroke="#ffffff" stroke-width="6" stroke-linecap="round" opacity="0.55" />
      <circle cx="58" cy="56" r="3" fill="#ffffff" opacity="0.65" />

      <!-- Golden Shield Label -->
      <rect x="56" y="78" width="48" height="40" rx="12" fill="#450a0a" stroke="#facc15" stroke-width="2.5" />
      <!-- 3D Flame inside label -->
      <path d="M 80 83 C 88 92, 94 100, 86 110 C 82 114, 78 114, 74 110 C 66 100, 72 92, 80 83 Z" fill="url(#flameGold)" />
    </g>
  </g>
</svg>`,

  'banned_cookie.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
  <defs>
    ${commonDefs}
    <radialGradient id="cookie3d" cx="35%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#fde68a" />
      <stop offset="45%" stop-color="#d97706" />
      <stop offset="85%" stop-color="#92400e" />
      <stop offset="100%" stop-color="#451a03" />
    </radialGradient>
    <radialGradient id="chip3d" cx="35%" cy="35%" r="70%">
      <stop offset="0%" stop-color="#78350f" />
      <stop offset="60%" stop-color="#451a03" />
      <stop offset="100%" stop-color="#1c0a00" />
    </radialGradient>
  </defs>
  <g filter="url(#drop3d)">
    <!-- Red Danger Halo -->
    <circle cx="80" cy="80" r="56" fill="#ef4444" opacity="0.15" stroke="#ef4444" stroke-width="3" stroke-dasharray="8 6" />

    <!-- 3D Cookie Extrusion Shadow -->
    <circle cx="78" cy="86" r="44" fill="#451a03" />
    <!-- Main 3D Cookie Body (with bite/crack on top right) -->
    <path d="M 78 38 C 92 38, 102 44, 106 52 C 98 56, 96 66, 104 72 C 112 76, 120 74, 122 84 C 120 108, 100 124, 78 124 C 52 124, 34 106, 34 81 C 34 56, 52 38, 78 38 Z" fill="url(#cookie3d)" stroke="#fef3c7" stroke-width="2" />

    <!-- 3D Glossy Chocolate Chips -->
    <circle cx="62" cy="64" r="7" fill="url(#chip3d)" />
    <circle cx="60" cy="62" r="2" fill="#ffffff" opacity="0.5" />
    <circle cx="84" cy="82" r="8" fill="url(#chip3d)" />
    <circle cx="82" cy="80" r="2.5" fill="#ffffff" opacity="0.5" />
    <circle cx="58" cy="96" r="6.5" fill="url(#chip3d)" />
    <circle cx="88" cy="104" r="6" fill="url(#chip3d)" />
    <circle cx="76" cy="54" r="5.5" fill="url(#chip3d)" />

    <!-- Floating Zero-G Hazard Crumbs! -->
    <circle cx="118" cy="48" r="5.5" fill="url(#cookie3d)" stroke="#fde68a" stroke-width="1" />
    <circle cx="132" cy="62" r="4" fill="url(#cookie3d)" />
    <circle cx="112" cy="64" r="3.5" fill="#451a03" />
    <circle cx="126" cy="36" r="3" fill="url(#cookie3d)" />
    <circle cx="26" cy="54" r="3.5" fill="url(#cookie3d)" />
  </g>
</svg>`,

  'banned_chips.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
  <defs>
    ${commonDefs}
    <radialGradient id="bagRed3d" cx="30%" cy="30%" r="75%">
      <stop offset="0%" stop-color="#fda4af" />
      <stop offset="35%" stop-color="#e11d48" />
      <stop offset="85%" stop-color="#881337" />
      <stop offset="100%" stop-color="#4c0519" />
    </radialGradient>
    <radialGradient id="potatoChip3d" cx="40%" cy="35%" r="70%">
      <stop offset="0%" stop-color="#fef9c3" />
      <stop offset="55%" stop-color="#facc15" />
      <stop offset="90%" stop-color="#ca8a04" />
      <stop offset="100%" stop-color="#854d0e" />
    </radialGradient>
  </defs>
  <g filter="url(#drop3d)">
    <!-- Red Danger Halo -->
    <circle cx="80" cy="80" r="56" fill="#ef4444" opacity="0.15" stroke="#ef4444" stroke-width="3" stroke-dasharray="8 6" />

    <!-- 3D Crinkled Chips Bag -->
    <path d="M 42 54 L 118 54 L 110 132 C 90 138, 70 138, 50 132 Z" fill="url(#bagRed3d)" stroke="#fecdd3" stroke-width="2.5" stroke-linejoin="round" />
    <path d="M 52 64 L 50 120" stroke="#ffffff" stroke-width="5" stroke-linecap="round" opacity="0.4" />

    <!-- 3D Crispy Golden Chips Erupting Out -->
    <ellipse cx="66" cy="48" rx="18" ry="12" transform="rotate(-22 66 48)" fill="url(#potatoChip3d)" stroke="#fef08a" stroke-width="2" />
    <ellipse cx="94" cy="46" rx="17" ry="11" transform="rotate(25 94 46)" fill="url(#potatoChip3d)" stroke="#fef08a" stroke-width="2" />
    <ellipse cx="80" cy="36" rx="15" ry="10" fill="url(#potatoChip3d)" stroke="#fef08a" stroke-width="2" />

    <!-- Floating Sharp Shards & Crumbs -->
    <polygon points="32,36 42,30 38,44" fill="#facc15" stroke="#fef08a" stroke-width="1" />
    <polygon points="126,34 136,42 122,46" fill="#facc15" stroke="#fef08a" stroke-width="1" />
    <circle cx="130" cy="68" r="3.5" fill="#facc15" />
    <circle cx="28" cy="66" r="4" fill="#facc15" />

    <!-- Center Emblem on Bag -->
    <circle cx="80" cy="94" r="20" fill="#facc15" stroke="#ffffff" stroke-width="2.5" />
    <text x="80" y="99" font-size="12" font-family="Cairo, sans-serif" font-weight="900" fill="#881337" text-anchor="middle">شيبسي</text>
  </g>
</svg>`,

  'banned_bread.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
  <defs>
    ${commonDefs}
    <radialGradient id="crust3d" cx="35%" cy="25%" r="75%">
      <stop offset="0%" stop-color="#fbbf24" />
      <stop offset="50%" stop-color="#b45309" />
      <stop offset="90%" stop-color="#78350f" />
      <stop offset="100%" stop-color="#451a03" />
    </radialGradient>
    <radialGradient id="crumbFace3d" cx="40%" cy="35%" r="70%">
      <stop offset="0%" stop-color="#fffbeb" />
      <stop offset="65%" stop-color="#fde68a" />
      <stop offset="100%" stop-color="#f59e0b" />
    </radialGradient>
  </defs>
  <g filter="url(#drop3d)">
    <!-- Red Danger Halo -->
    <circle cx="80" cy="80" r="56" fill="#ef4444" opacity="0.15" stroke="#ef4444" stroke-width="3" stroke-dasharray="8 6" />

    <!-- 3D Bread Loaf Crust Extrusion (Back Layer) -->
    <path d="M 46 66 C 34 62, 36 38, 60 36 C 72 34, 96 34, 108 36 C 130 38, 132 62, 120 66 L 118 118 C 118 126, 110 130, 102 130 L 62 130 C 54 130, 46 126, 46 118 Z" fill="url(#crust3d)" stroke="#fcd34d" stroke-width="2" />

    <!-- 3D Bread Slice Soft Front Face -->
    <path d="M 40 72 C 28 68, 30 44, 54 42 C 66 40, 88 40, 100 42 C 122 44, 124 68, 112 72 L 110 122 C 110 128, 104 132, 96 132 L 56 132 C 48 132, 42 128, 42 122 Z" fill="url(#crumbFace3d)" stroke="#d97706" stroke-width="5" />

    <!-- Air Pores & Highlight -->
    <circle cx="64" cy="76" r="4" fill="#d97706" opacity="0.45" />
    <circle cx="88" cy="92" r="5" fill="#d97706" opacity="0.45" />
    <circle cx="68" cy="106" r="3.5" fill="#d97706" opacity="0.45" />
    <path d="M 48 52 Q 75 46 98 52" stroke="#ffffff" stroke-width="4" stroke-linecap="round" fill="none" opacity="0.8" />

    <!-- Floating Bread Crumbs Hazard -->
    <circle cx="130" cy="54" r="4.5" fill="#fde68a" stroke="#d97706" stroke-width="1.5" />
    <circle cx="136" cy="74" r="3" fill="#fde68a" />
    <circle cx="24" cy="60" r="4" fill="#fde68a" stroke="#d97706" stroke-width="1.5" />
    <circle cx="30" cy="84" r="3" fill="#fde68a" />
  </g>
</svg>`,

  'broccoli.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
  <defs>
    ${commonDefs}
    <radialGradient id="brocFloret1" cx="35%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#86efac" />
      <stop offset="45%" stop-color="#22c55e" />
      <stop offset="85%" stop-color="#15803d" />
      <stop offset="100%" stop-color="#14532d" />
    </radialGradient>
    <linearGradient id="brocStem" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#d9f99d" />
      <stop offset="55%" stop-color="#84cc16" />
      <stop offset="100%" stop-color="#3f6212" />
    </linearGradient>
  </defs>
  <g filter="url(#drop3d)">
    <!-- 3D Stalk / Stem -->
    <path d="M 64 86 L 96 86 L 90 132 C 90 138, 70 138, 70 132 Z" fill="url(#brocStem)" stroke="#bef264" stroke-width="2" />
    <path d="M 56 76 L 74 96" stroke="url(#brocStem)" stroke-width="10" stroke-linecap="round" />
    <path d="M 104 76 L 86 96" stroke="url(#brocStem)" stroke-width="10" stroke-linecap="round" />
    <!-- 3D Fluffy Green Florets -->
    <circle cx="52" cy="68" r="26" fill="url(#brocFloret1)" />
    <circle cx="108" cy="68" r="26" fill="url(#brocFloret1)" />
    <circle cx="80" cy="48" r="30" fill="url(#brocFloret1)" />
    <circle cx="68" cy="74" r="24" fill="url(#brocFloret1)" />
    <circle cx="94" cy="74" r="24" fill="url(#brocFloret1)" />
    <!-- Glossy 3D Highlights -->
    <ellipse cx="70" cy="36" rx="10" ry="5" transform="rotate(-20 70 36)" fill="#ffffff" opacity="0.6" />
    <ellipse cx="42" cy="58" rx="7" ry="3.5" transform="rotate(-30 42 58)" fill="#ffffff" opacity="0.55" />
    <ellipse cx="102" cy="56" rx="7" ry="3.5" transform="rotate(20 102 56)" fill="#ffffff" opacity="0.5" />
  </g>
</svg>`,

  'banned_burger.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
  <defs>
    ${commonDefs}
    <radialGradient id="bun3d" cx="35%" cy="25%" r="75%">
      <stop offset="0%" stop-color="#fde68a" />
      <stop offset="45%" stop-color="#f59e0b" />
      <stop offset="85%" stop-color="#b45309" />
      <stop offset="100%" stop-color="#78350f" />
    </radialGradient>
    <linearGradient id="patty3d" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#78350f" />
      <stop offset="50%" stop-color="#451a03" />
      <stop offset="100%" stop-color="#270e02" />
    </linearGradient>
  </defs>
  <g filter="url(#drop3d)">
    <!-- Bottom Bun -->
    <rect x="34" y="106" width="92" height="22" rx="11" fill="url(#bun3d)" stroke="#fef3c7" stroke-width="1.5" />
    <!-- Burger Patty -->
    <rect x="30" y="88" width="100" height="22" rx="11" fill="url(#patty3d)" stroke="#92400e" stroke-width="1.5" />
    <!-- Melted Yellow Cheese Corners -->
    <polygon points="36,88 124,88 112,102 92,90 72,104 52,90" fill="#facc15" stroke="#fef08a" stroke-width="1.5" />
    <!-- Tomato & Lettuce Wave -->
    <rect x="36" y="78" width="88" height="10" rx="5" fill="#ef4444" />
    <path d="M 28 78 Q 42 70 56 78 T 84 78 T 112 78 T 132 78" stroke="#22c55e" stroke-width="8" stroke-linecap="round" fill="none" />
    <!-- Top Dome Sesame Bun -->
    <path d="M 32 74 C 32 34, 128 34, 128 74 Z" fill="url(#bun3d)" stroke="#fef3c7" stroke-width="2" />
    <!-- Sesame Seeds & Floating Crumbs -->
    <ellipse cx="64" cy="52" rx="4" ry="2" transform="rotate(-15 64 52)" fill="#fef9c3" />
    <ellipse cx="82" cy="48" rx="4" ry="2" transform="rotate(10 82 48)" fill="#fef9c3" />
    <ellipse cx="98" cy="55" rx="4" ry="2" transform="rotate(25 98 55)" fill="#fef9c3" />
    <path d="M 48 54 Q 68 40 94 44" stroke="#ffffff" stroke-width="4" stroke-linecap="round" fill="none" opacity="0.55" />
    <!-- Floating Crumb Hazard -->
    <circle cx="134" cy="48" r="4" fill="#f59e0b" />
    <circle cx="24" cy="60" r="3.5" fill="#f59e0b" />
  </g>
</svg>`,

  'banned_cake.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
  <defs>
    ${commonDefs}
    <linearGradient id="icingPink" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fbcfe8" />
      <stop offset="50%" stop-color="#f472b6" />
      <stop offset="100%" stop-color="#db2777" />
    </linearGradient>
    <linearGradient id="spongeCake" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#fef08a" />
      <stop offset="100%" stop-color="#f59e0b" />
    </linearGradient>
  </defs>
  <g filter="url(#drop3d)">
    <!-- Cake Sponge Body -->
    <path d="M 34 70 L 126 56 L 126 116 L 34 128 Z" fill="url(#spongeCake)" stroke="#fde68a" stroke-width="2" stroke-linejoin="round" />
    <!-- Strawberry Cream Middle Stripe -->
    <path d="M 34 98 L 126 84 L 126 94 L 34 108 Z" fill="#f43f5e" />
    <!-- Glossy Pink Icing Top & Drips -->
    <path d="M 32 70 L 84 34 L 128 56 C 120 72, 110 72, 104 64 C 96 76, 84 76, 78 66 C 68 80, 54 80, 48 70 C 40 80, 32 78, 32 70 Z" fill="url(#icingPink)" stroke="#fce7f3" stroke-width="2" />
    <!-- 3D Glossy Red Cherry on Top -->
    <circle cx="82" cy="40" r="13" fill="#e11d48" stroke="#fecdd3" stroke-width="1.5" />
    <circle cx="78" cy="36" r="4" fill="#ffffff" opacity="0.8" />
    <path d="M 84 28 Q 92 14 104 18" stroke="#15803d" stroke-width="3.5" stroke-linecap="round" fill="none" />
    <!-- Floating Cake Crumbs -->
    <circle cx="136" cy="76" r="4" fill="#fbbf24" />
    <circle cx="24" cy="92" r="4.5" fill="#f472b6" />
  </g>
</svg>`,

  'banned_soda.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
  <defs>
    ${commonDefs}
    <linearGradient id="sodaCupRed" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fca5a5" />
      <stop offset="40%" stop-color="#ef4444" />
      <stop offset="90%" stop-color="#991b1b" />
      <stop offset="100%" stop-color="#450a0a" />
    </linearGradient>
  </defs>
  <g filter="url(#drop3d)">
    <!-- Bent Straw -->
    <path d="M 80 48 L 88 18 L 114 14" stroke="#38bdf8" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" fill="none" />
    <!-- Cup Body -->
    <path d="M 46 54 L 114 54 L 104 134 C 104 138, 56 138, 56 134 Z" fill="url(#sodaCupRed)" stroke="#fecaca" stroke-width="2" />
    <!-- White Wave Stripe -->
    <path d="M 49 88 Q 65 78 80 88 T 111 88" stroke="#ffffff" stroke-width="8" fill="none" opacity="0.9" />
    <!-- Dome Lid -->
    <path d="M 42 54 C 42 32, 118 32, 118 54 Z" fill="#e0f2fe" fill-opacity="0.65" stroke="#ffffff" stroke-width="2.5" />
    <rect x="40" y="50" width="80" height="8" rx="4" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5" />
    <!-- Floating Zero-G Fizzy Bubbles Escaping! -->
    <circle cx="124" cy="34" r="6" fill="#78350f" stroke="#fde68a" stroke-width="1.5" />
    <circle cx="134" cy="50" r="4" fill="#78350f" />
    <circle cx="34" cy="38" r="5" fill="#78350f" stroke="#fde68a" stroke-width="1.5" />
  </g>
</svg>`
};

const uiAssets = {
  'apple-3d.svg': foodAssets['fruits.svg'],

  'helmet-3d.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
  <defs>
    ${commonDefs}
    <radialGradient id="helmetShell3d" cx="35%" cy="25%" r="75%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="55%" stop-color="#e2e8f0" />
      <stop offset="85%" stop-color="#94a3b8" />
      <stop offset="100%" stop-color="#475569" />
    </radialGradient>
    <linearGradient id="goldVisor3d" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a" />
      <stop offset="30%" stop-color="#f59e0b" />
      <stop offset="70%" stop-color="#b45309" />
      <stop offset="100%" stop-color="#0284c7" />
    </linearGradient>
    <linearGradient id="earPod3d" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="100%" stop-color="#0369a1" />
    </linearGradient>
  </defs>
  <g filter="url(#drop3d)">
    <!-- Ear Muffs / Comm Pods -->
    <rect x="14" y="64" width="18" height="38" rx="9" fill="url(#earPod3d)" stroke="#bae6fd" stroke-width="2" />
    <rect x="128" y="64" width="18" height="38" rx="9" fill="url(#earPod3d)" stroke="#bae6fd" stroke-width="2" />

    <!-- Main 3D Spherical Helmet Shell -->
    <circle cx="80" cy="80" r="56" fill="url(#helmetShell3d)" stroke="#f8fafc" stroke-width="2.5" />

    <!-- Top forehead Blue Tech Light -->
    <rect x="66" y="28" width="28" height="10" rx="5" fill="#0284c7" stroke="#7dd3fc" stroke-width="1.5" />
    <circle cx="80" cy="33" r="3" fill="#e0f2fe" />

    <!-- 3D Curved Reflective Gold/Blue Visor -->
    <rect x="34" y="46" width="92" height="62" rx="30" fill="url(#goldVisor3d)" stroke="#fde047" stroke-width="3" />

    <!-- Specular Visor Reflection -->
    <path d="M 48 58 Q 80 48 110 58" stroke="#ffffff" stroke-width="6" stroke-linecap="round" fill="none" opacity="0.7" />
    <ellipse cx="54" cy="74" rx="8" ry="14" transform="rotate(-15 54 74)" fill="#ffffff" opacity="0.35" />

    <!-- Metallic Neck Ring -->
    <rect x="44" y="122" width="72" height="14" rx="7" fill="#334155" stroke="#94a3b8" stroke-width="2.5" />
  </g>
</svg>`,

  'engine-3d.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
  <defs>
    ${commonDefs}
    <radialGradient id="plasmaCore" cx="50%" cy="50%" r="55%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="35%" stop-color="#67e8f9" />
      <stop offset="70%" stop-color="#0284c7" />
      <stop offset="100%" stop-color="#1e1b4b" />
    </radialGradient>
    <linearGradient id="bolt3d" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a" />
      <stop offset="45%" stop-color="#facc15" />
      <stop offset="100%" stop-color="#ea580c" />
    </linearGradient>
  </defs>
  <g filter="url(#drop3d)">
    <!-- Outer 3D Turbine Ring -->
    <circle cx="80" cy="80" r="58" fill="#1e293b" stroke="#38bdf8" stroke-width="4" />
    <circle cx="80" cy="80" r="46" fill="url(#plasmaCore)" stroke="#a5f3fc" stroke-width="3" />

    <!-- 3D Golden Lightning Bolt -->
    <path d="M 88 24 L 46 86 L 78 86 L 68 136 L 116 72 L 82 72 Z" fill="url(#bolt3d)" stroke="#ffffff" stroke-width="2.5" stroke-linejoin="round" />
    <!-- Glossy Highlight on Bolt -->
    <path d="M 83 36 L 56 78" stroke="#ffffff" stroke-width="4" stroke-linecap="round" opacity="0.8" />
  </g>
</svg>`,

  'rocket-3d.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
  <defs>
    ${commonDefs}
    <radialGradient id="rocketBody3d" cx="35%" cy="30%" r="75%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="55%" stop-color="#e2e8f0" />
      <stop offset="90%" stop-color="#94a3b8" />
      <stop offset="100%" stop-color="#475569" />
    </radialGradient>
    <radialGradient id="noseRed3d" cx="35%" cy="30%" r="75%">
      <stop offset="0%" stop-color="#fda4af" />
      <stop offset="40%" stop-color="#ef4444" />
      <stop offset="90%" stop-color="#991b1b" />
      <stop offset="100%" stop-color="#450a0a" />
    </radialGradient>
    <linearGradient id="thrusterFlame" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#fef08a" />
      <stop offset="45%" stop-color="#f97316" />
      <stop offset="100%" stop-color="#ef4444" />
    </linearGradient>
  </defs>
  <g filter="url(#drop3d)" transform="rotate(18 80 80)">
    <!-- Thruster Flame -->
    <path d="M 64 118 C 60 138, 80 156, 80 156 C 80 156, 100 138, 96 118 Z" fill="url(#thrusterFlame)" />
    <path d="M 72 118 C 70 132, 80 144, 80 144 C 80 144, 90 132, 88 118 Z" fill="#fef9c3" />

    <!-- Left & Right 3D Red Fins -->
    <path d="M 52 84 C 30 92, 26 114, 34 124 C 42 120, 50 112, 56 108 Z" fill="url(#noseRed3d)" stroke="#fecaca" stroke-width="1.5" />
    <path d="M 108 84 C 130 92, 134 114, 126 124 C 118 120, 110 112, 104 108 Z" fill="url(#noseRed3d)" stroke="#fecaca" stroke-width="1.5" />

    <!-- Main 3D Rocket Fuselage -->
    <path d="M 80 14 C 54 42, 50 82, 56 114 L 104 114 C 110 82, 106 42, 80 14 Z" fill="url(#rocketBody3d)" stroke="#f8fafc" stroke-width="2" />

    <!-- Red Nose Cone Cap -->
    <path d="M 80 14 C 67 28, 60 44, 57 54 L 103 54 C 100 44, 93 28, 80 14 Z" fill="url(#noseRed3d)" />

    <!-- Orange Trim Stripe -->
    <rect x="56" y="102" width="48" height="7" rx="3" fill="#f97316" />

    <!-- 3D Glossy Porthole Window -->
    <circle cx="80" cy="76" r="15" fill="#0284c7" stroke="#facc15" stroke-width="4" />
    <circle cx="80" cy="76" r="11" fill="#0c4a6e" />
    <ellipse cx="75" cy="71" rx="5" ry="3" transform="rotate(-30 75 71)" fill="#ffffff" opacity="0.8" />

    <!-- Specular Fuselage Highlight -->
    <path d="M 66 56 Q 62 78 64 98" stroke="#ffffff" stroke-width="4" stroke-linecap="round" fill="none" opacity="0.7" />
  </g>
</svg>`,

  'trophy-3d.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
  <defs>
    ${commonDefs}
    <radialGradient id="goldCup3d" cx="35%" cy="25%" r="75%">
      <stop offset="0%" stop-color="#fef9c3" />
      <stop offset="30%" stop-color="#facc15" />
      <stop offset="75%" stop-color="#d97706" />
      <stop offset="100%" stop-color="#78350f" />
    </radialGradient>
  </defs>
  <g filter="url(#drop3d)">
    <!-- Side Handles -->
    <path d="M 44 42 C 18 42, 18 82, 50 86" stroke="url(#goldCup3d)" stroke-width="10" stroke-linecap="round" fill="none" />
    <path d="M 116 42 C 142 42, 142 82, 110 86" stroke="url(#goldCup3d)" stroke-width="10" stroke-linecap="round" fill="none" />

    <!-- Trophy Pedestal Base -->
    <rect x="48" y="122" width="64" height="18" rx="6" fill="#334155" stroke="#facc15" stroke-width="2" />
    <rect x="58" y="112" width="44" height="12" rx="4" fill="url(#goldCup3d)" />

    <!-- Stem -->
    <rect x="72" y="92" width="16" height="24" rx="4" fill="url(#goldCup3d)" />

    <!-- Main Cup Bowl -->
    <path d="M 40 30 L 120 30 L 112 72 C 108 92, 96 98, 80 98 C 64 98, 52 92, 48 72 Z" fill="url(#goldCup3d)" stroke="#fef08a" stroke-width="2.5" stroke-linejoin="round" />

    <!-- Center Glowing Star -->
    <polygon points="80,44 85,55 97,56 88,64 91,76 80,70 69,76 72,64 63,56 75,55" fill="#ffffff" opacity="0.9" />

    <!-- Specular Highlight -->
    <path d="M 52 38 L 56 72" stroke="#ffffff" stroke-width="5" stroke-linecap="round" opacity="0.65" />
  </g>
</svg>`,

  'moon-3d.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
  <defs>
    ${commonDefs}
    <radialGradient id="moonSphere3d" cx="35%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#fef9c3" />
      <stop offset="45%" stop-color="#fde047" />
      <stop offset="80%" stop-color="#ca8a04" />
      <stop offset="100%" stop-color="#713f12" />
    </radialGradient>
    <radialGradient id="crater3d" cx="65%" cy="65%" r="70%">
      <stop offset="0%" stop-color="#fde047" />
      <stop offset="70%" stop-color="#a16207" />
      <stop offset="100%" stop-color="#713f12" />
    </radialGradient>
  </defs>
  <g filter="url(#drop3d)">
    <circle cx="80" cy="80" r="56" fill="url(#moonSphere3d)" stroke="#fef08a" stroke-width="2" />
    <ellipse cx="58" cy="62" rx="14" ry="11" transform="rotate(-20 58 62)" fill="url(#crater3d)" />
    <ellipse cx="98" cy="88" rx="16" ry="13" transform="rotate(15 98 88)" fill="url(#crater3d)" />
    <circle cx="66" cy="104" r="9" fill="url(#crater3d)" />
    <circle cx="96" cy="52" r="7" fill="url(#crater3d)" />
    <path d="M 44 46 Q 68 30 94 36" stroke="#ffffff" stroke-width="5" stroke-linecap="round" fill="none" opacity="0.65" />
  </g>
</svg>`,

  'cadet-avatar.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
  <defs>
    ${commonDefs}
    <radialGradient id="avatarBg" cx="50%" cy="40%" r="60%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="65%" stop-color="#0284c7" />
      <stop offset="100%" stop-color="#0c4a6e" />
    </radialGradient>
    <radialGradient id="skinTone" cx="45%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#ffedd5" />
      <stop offset="55%" stop-color="#fdba74" />
      <stop offset="100%" stop-color="#ea580c" />
    </radialGradient>
    <linearGradient id="hairBrown" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#78350f" />
      <stop offset="50%" stop-color="#451a03" />
      <stop offset="100%" stop-color="#270e02" />
    </linearGradient>
    <linearGradient id="suitCollar" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="70%" stop-color="#e2e8f0" />
      <stop offset="100%" stop-color="#94a3b8" />
    </linearGradient>
  </defs>
  <g>
    <!-- Circular Sky Frame -->
    <circle cx="80" cy="80" r="74" fill="url(#avatarBg)" stroke="#bae6fd" stroke-width="6" />
    <!-- Junior Astronaut Shoulders & Suit Collar -->
    <path d="M 26 142 C 36 112, 124 112, 134 142 C 116 154, 44 154, 26 142 Z" fill="url(#suitCollar)" stroke="#38bdf8" stroke-width="3" />
    <path d="M 52 122 Q 80 138 108 122" stroke="#f97316" stroke-width="6" stroke-linecap="round" fill="none" />
    <!-- Neck -->
    <rect x="68" y="102" width="24" height="22" rx="10" fill="url(#skinTone)" />
    <!-- Ears -->
    <circle cx="44" cy="82" r="10" fill="url(#skinTone)" />
    <circle cx="116" cy="82" r="10" fill="url(#skinTone)" />
    <!-- Boy Head -->
    <rect x="46" y="44" width="68" height="68" rx="32" fill="url(#skinTone)" />
    <!-- Rosy Cheeks -->
    <ellipse cx="58" cy="88" rx="7" ry="4" fill="#fb7185" opacity="0.55" />
    <ellipse cx="102" cy="88" rx="7" ry="4" fill="#fb7185" opacity="0.55" />
    <!-- Expressive Dark Eyes with Catchlights -->
    <circle cx="64" cy="76" r="6.5" fill="#1e1b4b" />
    <circle cx="62" cy="74" r="2.2" fill="#ffffff" />
    <circle cx="96" cy="76" r="6.5" fill="#1e1b4b" />
    <circle cx="94" cy="74" r="2.2" fill="#ffffff" />
    <!-- Eyebrows -->
    <path d="M 56 65 Q 64 61 71 65" stroke="#451a03" stroke-width="3.5" stroke-linecap="round" fill="none" />
    <path d="M 89 65 Q 96 61 104 65" stroke="#451a03" stroke-width="3.5" stroke-linecap="round" fill="none" />
    <!-- Cute Nose -->
    <path d="M 78 80 Q 80 84 83 80" stroke="#c2410c" stroke-width="2.5" stroke-linecap="round" fill="none" />
    <!-- Cheerful Smile -->
    <path d="M 67 92 Q 80 104 93 92 Z" fill="#991b1b" />
    <path d="M 70 93 Q 80 97 90 93" stroke="#ffffff" stroke-width="3" stroke-linecap="round" fill="none" />
    <!-- Fluffy Wavy Brown Hair -->
    <path d="M 42 72 C 36 44, 58 24, 84 26 C 110 24, 126 44, 118 72 C 114 56, 102 48, 88 52 C 74 44, 54 50, 42 72 Z" fill="url(#hairBrown)" />
    <path d="M 56 34 Q 78 22 102 36" stroke="#92400e" stroke-width="4" stroke-linecap="round" fill="none" opacity="0.7" />
  </g>
</svg>`,

  'saturn-3d.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 160">
  <defs>
    ${commonDefs}
    <radialGradient id="saturnBody" cx="35%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#fde68a" />
      <stop offset="45%" stop-color="#f59e0b" />
      <stop offset="80%" stop-color="#b45309" />
      <stop offset="100%" stop-color="#451a03" />
    </radialGradient>
    <linearGradient id="saturnRing" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef3c7" stop-opacity="0.85" />
      <stop offset="50%" stop-color="#fbbf24" stop-opacity="0.45" />
      <stop offset="100%" stop-color="#fde68a" stop-opacity="0.9" />
    </linearGradient>
  </defs>
  <g filter="url(#drop3d)" transform="rotate(-16 110 80)">
    <!-- Back Ring Arc -->
    <path d="M 18 80 A 92 26 0 0 1 202 80" fill="none" stroke="url(#saturnRing)" stroke-width="14" opacity="0.7" />
    <!-- Planet Sphere -->
    <circle cx="110" cy="80" r="44" fill="url(#saturnBody)" />
    <!-- Atmospheric Bands -->
    <path d="M 68 68 Q 110 76 152 68" stroke="#fef3c7" stroke-width="4" fill="none" opacity="0.45" />
    <path d="M 66 84 Q 110 92 154 84" stroke="#92400e" stroke-width="5" fill="none" opacity="0.45" />
    <!-- Front Ring Arc -->
    <path d="M 202 80 A 92 26 0 0 1 18 80" fill="none" stroke="url(#saturnRing)" stroke-width="16" />
    <path d="M 190 80 A 80 20 0 0 1 30 80" fill="none" stroke="#ffffff" stroke-width="2.5" opacity="0.65" />
  </g>
</svg>`,

  'earth-3d.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180">
  <defs>
    ${commonDefs}
    <radialGradient id="earthFresnel" cx="50%" cy="50%" r="50%">
      <stop offset="70%" stop-color="#38bdf8" stop-opacity="0" />
      <stop offset="90%" stop-color="#38bdf8" stop-opacity="0.35" />
      <stop offset="100%" stop-color="#0284c7" stop-opacity="0.65" />
    </radialGradient>
    <radialGradient id="earthOcean" cx="35%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="35%" stop-color="#0284c7" />
      <stop offset="75%" stop-color="#034078" />
      <stop offset="100%" stop-color="#001220" />
    </radialGradient>
    <radialGradient id="earthShading" cx="30%" cy="30%" r="75%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.35" />
      <stop offset="55%" stop-color="#000000" stop-opacity="0" />
      <stop offset="100%" stop-color="#020617" stop-opacity="0.85" />
    </radialGradient>
    <clipPath id="earthClip">
      <circle cx="90" cy="90" r="62" />
    </clipPath>
  </defs>
  <g filter="url(#drop3d)">
    <!-- Atmospheric Outer Glow -->
    <circle cx="90" cy="90" r="68" fill="url(#earthFresnel)" />
    <!-- Base Ocean Sphere -->
    <circle cx="90" cy="90" r="62" fill="url(#earthOcean)" />
    
    <!-- Continents inside clip -->
    <g clip-path="url(#earthClip)">
      <!-- Landmass 1 (Eurasia / Africa shape) -->
      <path d="M 70 45 C 90 40, 115 50, 120 75 C 110 95, 95 105, 80 115 C 65 110, 55 90, 60 70 Z" fill="#22c55e" opacity="0.9" />
      <path d="M 85 55 C 95 50, 105 60, 100 70 C 90 75, 80 70, 85 55 Z" fill="#b45309" opacity="0.6" />
      <!-- Landmass 2 (Americas shape) -->
      <path d="M 40 55 C 50 48, 55 65, 48 85 C 42 98, 48 115, 42 125 C 34 115, 30 90, 36 70 Z" fill="#22c55e" opacity="0.9" />
      <!-- Australia / Islands -->
      <circle cx="125" cy="115" r="9" fill="#22c55e" />
      <circle cx="138" cy="100" r="5" fill="#22c55e" />
      
      <!-- Swirling Clouds -->
      <path d="M 45 60 Q 80 48 120 62" stroke="#ffffff" stroke-width="7" stroke-linecap="round" fill="none" opacity="0.65" />
      <path d="M 60 92 Q 95 102 135 90" stroke="#ffffff" stroke-width="6" stroke-linecap="round" fill="none" opacity="0.6" />
      <path d="M 35 105 Q 65 125 100 118" stroke="#ffffff" stroke-width="5" stroke-linecap="round" fill="none" opacity="0.5" />
      
      <!-- Spherical 3D Lighting Shade -->
      <circle cx="90" cy="90" r="62" fill="url(#earthShading)" />
    </g>
    <!-- Crisp Inner Rim Glow -->
    <circle cx="90" cy="90" r="61" fill="none" stroke="#7dd3fc" stroke-width="2" opacity="0.75" />
  </g>
</svg>`,

  'mars-3d.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180">
  <defs>
    ${commonDefs}
    <radialGradient id="marsBody" cx="35%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#fdba74" />
      <stop offset="40%" stop-color="#ea580c" />
      <stop offset="80%" stop-color="#9a3412" />
      <stop offset="100%" stop-color="#431407" />
    </radialGradient>
    <radialGradient id="marsShade" cx="30%" cy="30%" r="75%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.3" />
      <stop offset="60%" stop-color="#000000" stop-opacity="0" />
      <stop offset="100%" stop-color="#020617" stop-opacity="0.85" />
    </radialGradient>
    <clipPath id="marsClip">
      <circle cx="90" cy="90" r="60" />
    </clipPath>
  </defs>
  <g filter="url(#drop3d)">
    <circle cx="90" cy="90" r="60" fill="url(#marsBody)" />
    <g clip-path="url(#marsClip)">
      <!-- Craters and Iron Oxide Plains -->
      <ellipse cx="65" cy="72" rx="16" ry="12" fill="#7c2d12" opacity="0.6" />
      <ellipse cx="112" cy="95" rx="20" ry="15" fill="#7c2d12" opacity="0.65" />
      <circle cx="80" cy="115" r="10" fill="#7c2d12" opacity="0.5" />
      <!-- Polar Ice Cap -->
      <ellipse cx="90" cy="34" rx="22" ry="8" fill="#ffffff" opacity="0.85" />
      <circle cx="90" cy="90" r="60" fill="url(#marsShade)" />
    </g>
    <circle cx="90" cy="90" r="59" fill="none" stroke="#fed7aa" stroke-width="2" opacity="0.65" />
  </g>
</svg>`
};

for (const [filename, svgContent] of Object.entries(foodAssets)) {
  fs.writeFileSync(path.join(foodDir, filename), svgContent.trim(), 'utf8');
}

for (const [filename, svgContent] of Object.entries(uiAssets)) {
  fs.writeFileSync(path.join(uiDir, filename), svgContent.trim(), 'utf8');
}

const manifest = {
  name: 'AstroNutri 3D-Rendered Kids Space Assets',
  version: '3.0.0',
  assets: [
    ...Object.keys(foodAssets).map(f => ({ id: f.replace('.svg', ''), file: `/assets/food/${f}`, style: '3d-cartoon-svg' })),
    ...Object.keys(uiAssets).map(f => ({ id: f.replace('.svg', ''), file: `/assets/ui/${f}`, style: '3d-cartoon-svg' })),
    { id: 'hub_bg', file: '/assets/images/space-station-hub.jpg', style: '3d-illustrated-backdrop' },
    { id: 'intro_bg', file: '/assets/images/astronutri-intro.jpg', style: '3d-illustrated-backdrop' }
  ]
};

fs.writeFileSync(path.resolve('public/assets/manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
console.log('Generated 3D-styled 2D assets successfully:', Object.keys(foodAssets).length + Object.keys(uiAssets).length);
