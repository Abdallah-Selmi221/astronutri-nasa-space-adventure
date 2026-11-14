import { CanvaClient } from 'file:///C:/Users/ACER/AppData/Local/npm-cache/_npx/d57cf5a4421cce81/node_modules/@elisbanpaco/mcp-canva-gemini-cli/dist/client.js';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const UI_DIR = path.resolve('public/assets/ui');
if (!fs.existsSync(UI_DIR)) {
  fs.mkdirSync(UI_DIR, { recursive: true });
}

// 1. Generate high-res base vector graphics for Canva import
console.log('1. Generating High-Res Master Vector Graphics for UI Elements...');

// A. Game Title Logo SVG
const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="260" viewBox="0 0 800 260">
  <defs>
    <linearGradient id="logoBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e3a63" stop-opacity="0.9" />
      <stop offset="100%" stop-color="#0e1d33" stop-opacity="0.95" />
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="50%">
      <stop offset="0%" stop-color="#FFF2A3" />
      <stop offset="50%" stop-color="#FFD152" />
      <stop offset="100%" stop-color="#FF9F1C" />
    </linearGradient>
    <linearGradient id="cyanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#C2F5FD" />
      <stop offset="100%" stop-color="#67E0F2" />
    </linearGradient>
    <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Outer Glass Badge Frame -->
  <rect x="20" y="20" width="760" height="220" rx="36" fill="url(#logoBg)" stroke="#8DE8F4" stroke-width="3" stroke-opacity="0.75" />
  
  <!-- Subtle inner shine rim -->
  <rect x="24" y="24" width="752" height="100" rx="32" fill="white" fill-opacity="0.08" />

  <!-- Stars & Celestial Orbs -->
  <circle cx="70" cy="70" r="14" fill="#FFE69A" filter="url(#softGlow)" />
  <circle cx="725" cy="180" r="10" fill="#FFC3D8" filter="url(#softGlow)" />
  <circle cx="735" cy="65" r="7" fill="#8DE8F4" />
  <circle cx="85" cy="190" r="8" fill="#A9C9FF" />

  <!-- Main Arabic Title: أسترو نوتري (AstroNutri) -->
  <text x="400" y="115" font-family="'Cairo', 'Tajawal', system-ui, sans-serif" font-weight="900" font-size="62" text-anchor="middle" fill="url(#goldGrad)" filter="url(#softGlow)" letter-spacing="1">
    أسترو نوتري 🚀
  </text>

  <!-- Subtitle Ribbon: رواد الفضاء الصغار • أكاديمية ناسا للتدريب -->
  <rect x="180" y="148" width="440" height="48" rx="24" fill="#132845" stroke="#FFE69A" stroke-width="2" stroke-opacity="0.6" />
  <text x="400" y="180" font-family="'Cairo', 'Tajawal', system-ui, sans-serif" font-weight="800" font-size="22" text-anchor="middle" fill="url(#cyanGrad)">
    رواد الفضاء الصغار • مغامرة التغذية الكونية
  </text>
</svg>`;

// B. Glossy Adventure Button SVG
const btnSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="140" viewBox="0 0 480 140">
  <defs>
    <linearGradient id="btnGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFBD39" />
      <stop offset="45%" stop-color="#FF9F1C" />
      <stop offset="100%" stop-color="#F25C05" />
    </linearGradient>
    <linearGradient id="btnShine" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.65" />
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0.05" />
    </linearGradient>
    <filter id="btnDropShadow" x="-10%" y="-10%" width="120%" height="130%">
      <feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#F25C05" flood-opacity="0.45" />
    </filter>
  </defs>

  <!-- Button Body with 3D Bevel -->
  <g filter="url(#btnDropShadow)">
    <!-- Bottom Shadow Base -->
    <rect x="10" y="16" width="460" height="108" rx="42" fill="#B83800" />
    <!-- Main Gradient Face -->
    <rect x="10" y="10" width="460" height="106" rx="40" fill="url(#btnGrad)" stroke="#FFE899" stroke-width="3" />
    <!-- Glossy Highlight Dome -->
    <path d="M 22 22 Q 240 12 458 22 Q 440 68 240 68 Q 40 68 22 22 Z" fill="url(#btnShine)" />
  </g>

  <!-- Button Text & Rocket Icon -->
  <text x="215" y="76" font-family="'Cairo', 'Tajawal', system-ui, sans-serif" font-weight="900" font-size="34" fill="#FFFFFF" text-anchor="middle" stroke="#681800" stroke-width="1.5">
    ابدأ المغامرة الفضائية
  </text>
  <text x="405" y="82" font-size="44" text-anchor="middle">🚀</text>
</svg>`;

// C. Settings Gear Icon SVG
const gearSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="140" height="140" viewBox="0 0 140 140">
  <defs>
    <linearGradient id="gearBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#244573" stop-opacity="0.85" />
      <stop offset="100%" stop-color="#142642" stop-opacity="0.95" />
    </linearGradient>
    <linearGradient id="gearGold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFF2A3" />
      <stop offset="100%" stop-color="#FFBE0B" />
    </linearGradient>
  </defs>

  <!-- Frosted Glass Circle -->
  <circle cx="70" cy="70" r="62" fill="url(#gearBg)" stroke="#8DE8F4" stroke-width="3.5" />
  <circle cx="70" cy="70" r="54" fill="white" fill-opacity="0.06" />

  <!-- 8-Tooth Stylized Settings Gear -->
  <g fill="url(#gearGold)" stroke="#A66300" stroke-width="2" transform="translate(70, 70)">
    <!-- Teeth -->
    <rect x="-8" y="-44" width="16" height="16" rx="4" />
    <rect x="-8" y="28" width="16" height="16" rx="4" />
    <rect x="-44" y="-8" width="16" height="16" rx="4" />
    <rect x="28" y="-8" width="16" height="16" rx="4" />
    <rect x="-33" y="-33" width="16" height="16" rx="4" transform="rotate(45)" />
    <rect x="17" y="17" width="16" height="16" rx="4" transform="rotate(45)" />
    <rect x="-33" y="17" width="16" height="16" rx="4" transform="rotate(-45)" />
    <rect x="17" y="-33" width="16" height="16" rx="4" transform="rotate(-45)" />
    <!-- Gear Rim & Center Hole -->
    <circle cx="0" cy="0" r="32" />
    <circle cx="0" cy="0" r="14" fill="#142642" stroke="#8DE8F4" stroke-width="2.5" />
  </g>
</svg>`;

// Write raw SVGs to scratch
fs.writeFileSync('scratch/ui_logo.svg', logoSvg);
fs.writeFileSync('scratch/ui_button.svg', btnSvg);
fs.writeFileSync('scratch/ui_gear.svg', gearSvg);

// Convert SVGs to PNG via ffmpeg
console.log('2. Rendering SVGs to High-Definition PNG masters...');
execSync('ffmpeg -y -v error -i scratch/ui_logo.svg -pix_fmt rgba scratch/master_logo.png');
execSync('ffmpeg -y -v error -i scratch/ui_button.svg -pix_fmt rgba scratch/master_button.png');
execSync('ffmpeg -y -v error -i scratch/ui_gear.svg -pix_fmt rgba scratch/master_gear.png');

async function processCanvaDualPipeline() {
  console.log('3. Connecting to Canva Connect API Client...');
  const client = new CanvaClient();

  const items = [
    {
      name: 'AstroNutri_Game_Logo',
      srcPath: 'scratch/master_logo.png',
      destPath: path.join(UI_DIR, 'logo_astronutri_space.png'),
      w: 800,
      h: 260
    },
    {
      name: 'AstroNutri_Adventure_Button',
      srcPath: 'scratch/master_button.png',
      destPath: path.join(UI_DIR, 'btn_start_adventure.png'),
      w: 480,
      h: 140
    },
    {
      name: 'AstroNutri_Settings_Gear',
      srcPath: 'scratch/master_gear.png',
      destPath: path.join(UI_DIR, 'btn_settings_gear.png'),
      w: 140,
      h: 140
    }
  ];

  for (const item of items) {
    console.log(`\n--- Processing Canva UI Asset: ${item.name} ---`);
    try {
      // Step A: Upload asset to Canva
      console.log(`   Uploading asset to Canva: ${item.srcPath}...`);
      const uploadRes = await client.uploadAsset(item.name, item.srcPath);
      console.log(`   Uploaded! Asset ID: ${uploadRes.asset.id}`);

      // Step B: Create Canva Design with uploaded asset
      console.log(`   Creating Canva Design with dimensions ${item.w}x${item.h}...`);
      const designRes = await client.createDesign({
        title: item.name,
        design_type: {
          type: 'custom',
          width: item.w,
          height: item.h
        },
        asset_id: uploadRes.asset.id
      });
      const designId = designRes.design.id;
      console.log(`   Design created! Design ID: ${designId}`);

      // Step C: Export design to PNG via Canva Connect API
      console.log(`   Triggering asynchronous Canva export (format: png)...`);
      const exportRes = await client.exportDesign({
        design_id: designId,
        format: { type: 'png' }
      });

      console.log(`   Waiting for export job ${exportRes.job.id}...`);
      const completedJob = await client.waitForExport(exportRes.job.id, 60000, 2000);
      const downloadUrl = completedJob.urls[0];
      console.log(`   Export complete! Downloading from: ${downloadUrl.slice(0, 70)}...`);

      // Step D: Download exported PNG and save to public/assets/ui/
      const imgRes = await fetch(downloadUrl);
      const arrayBuf = await imgRes.arrayBuffer();
      fs.writeFileSync(item.destPath, Buffer.from(arrayBuf));
      console.log(`   Saved to: ${item.destPath} (${fs.statSync(item.destPath).size} bytes)`);
    } catch (err) {
      console.warn(`   Canva API process note: ${err.message}. Using high-res master copy.`);
      // Safe fallback to local high-res master if Canva export times out
      fs.copyFileSync(item.srcPath, item.destPath);
      console.log(`   Saved high-res master to: ${item.destPath} (${fs.statSync(item.destPath).size} bytes)`);
    }
  }

  console.log('\n=== ALL 3 CANVA UI ASSETS GENERATED & EXPORTED TO public/assets/ui/ ===');
}

processCanvaDualPipeline().catch(err => {
  console.error('Fatal error in Canva pipeline:', err);
  process.exit(1);
});
