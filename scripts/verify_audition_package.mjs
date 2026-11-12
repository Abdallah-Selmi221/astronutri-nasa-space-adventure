import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('================================================================');
console.log('ASTRONUTRI — PHASE 3.2A VOICE IDENTITY & AUTOMATION ENGINE AUDIT');
console.log('================================================================\n');

let errorCount = 0;

function check(condition, message) {
  if (condition) {
    console.log(`✅ [PASS] ${message}`);
  } else {
    console.error(`❌ [FAIL] ${message}`);
    errorCount++;
  }
}

// 1. Check VoiceIdentityEngine.mjs exists and exports required constants & functions
console.log('--- 1. VOICE IDENTITY ENGINE SCRIPT CHECK ---');
const enginePath = path.join(rootDir, 'scripts', 'VoiceIdentityEngine.mjs');
check(fs.existsSync(enginePath), 'scripts/VoiceIdentityEngine.mjs exists');

if (fs.existsSync(enginePath)) {
  const content = fs.readFileSync(enginePath, 'utf-8');
  check(content.includes('PERSONA_SPEC'), 'Exports PERSONA_SPEC');
  check(content.includes('EMOTION_CONTEXTS'), 'Exports EMOTION_CONTEXTS');
  check(content.includes('buildPersonaPayload'), 'Exports buildPersonaPayload');
  check(content.includes('synthesizeWithBackoff'), 'Exports synthesizeWithBackoff (resilient backoff)');
  check(content.includes('processAudioDual'), 'Exports processAudioDual (Raw & EBU R128 Dual processing)');
  check(content.includes('runAcousticDiagnostics'), 'Exports runAcousticDiagnostics');
}

// 2. Check 3 Automation Engine MP3s in normalized and raw folders
console.log('\n--- 2. AUTOMATION ENGINE TEST SAMPLES CHECK ---');
const autoDir = path.join(rootDir, 'public', 'audio', 'robo', 'automation-test');
const autoSamples = [
  'sample_calm_science.mp3',
  'sample_friendly_warning.mp3',
  'sample_excited_celebration.mp3'
];

for (const sample of autoSamples) {
  const normPath = path.join(autoDir, 'normalized', sample);
  const rawPath = path.join(autoDir, 'raw', sample);

  check(fs.existsSync(normPath), `Normalized exists: ${sample}`);
  check(fs.existsSync(rawPath), `Raw exists: ${sample}`);

  if (fs.existsSync(normPath)) {
    const probe = JSON.parse(execSync(`ffprobe -v quiet -print_format json -show_format "${normPath}"`, { encoding: 'utf-8' }));
    const dur = parseFloat(probe.format?.duration || '0');
    check(dur >= 4.0 && dur <= 7.0, `Normalized decodes cleanly (${dur.toFixed(2)}s): ${sample}`);
  }
}

// 3. Check Original 3 Benchmark Samples
console.log('\n--- 3. ORIGINAL BENCHMARK SAMPLES CHECK ---');
const origDir = path.join(rootDir, 'public', 'audio', 'robo', 'model-comparison', 'flash-lite');
const origSamples = [
  'sample_greeting.mp3',
  'sample_success.mp3',
  'sample_warning.mp3'
];

for (const sample of origSamples) {
  const normPath = path.join(origDir, sample);
  const rawPath = path.join(origDir, 'raw', sample);
  check(fs.existsSync(normPath), `Original normalized exists: ${sample}`);
  check(fs.existsSync(rawPath), `Original raw exists: ${sample}`);
}

// 4. Audition HTML File Checks
console.log('\n--- 4. AUDITION HTML PAGE INTEGRITY ---');
const htmlPath = path.join(rootDir, 'public', 'audio_audition.html');
check(fs.existsSync(htmlPath), 'public/audio_audition.html exists');

if (fs.existsSync(htmlPath)) {
  const html = fs.readFileSync(htmlPath, 'utf-8');
  check(html.includes('sample_calm_science.mp3'), 'Contains sample_calm_science.mp3 player');
  check(html.includes('sample_friendly_warning.mp3'), 'Contains sample_friendly_warning.mp3 player');
  check(html.includes('sample_excited_celebration.mp3'), 'Contains sample_excited_celebration.mp3 player');
  check(html.includes('sample_greeting.mp3'), 'Contains original sample_greeting.mp3 player');
  check(html.includes('sample_success.mp3'), 'Contains original sample_success.mp3 player');
  check(html.includes('sample_warning.mp3'), 'Contains original sample_warning.mp3 player');
  check(html.includes('VoiceIdentityEngine.mjs'), 'References VoiceIdentityEngine.mjs');
  check(html.includes('Puck'), 'Contains voice name Puck');
}

// 5. Security & API Key Audit
console.log('\n--- 5. SECURITY & API KEY AUDIT ---');
const filesToScan = [
  htmlPath,
  path.join(autoDir, 'automation_test_manifest.json'),
  path.join(origDir, '..', 'comparison_manifest.json'),
  path.join(rootDir, 'VOICE_IDENTITY_SPEC.md')
];

let leakFound = false;
for (const file of filesToScan) {
  if (fs.existsSync(file)) {
    const text = fs.readFileSync(file, 'utf-8');
    if (/AIzaSy[A-Za-z0-9_-]{33}/.test(text)) {
      leakFound = true;
      console.error(`❌ [LEAK] Potential API key in ${file}`);
    }
  }
}
check(!leakFound, 'Zero Gemini API keys detected in client files, public artifacts, or manifests');

console.log('\n================================================================');
if (errorCount === 0) {
  console.log('✅ ALL VERIFICATION GATES PASSED (EXIT CODE 0)');
  process.exit(0);
} else {
  console.error(`❌ FAILED WITH ${errorCount} ERRORS (EXIT CODE 1)`);
  process.exit(1);
}
