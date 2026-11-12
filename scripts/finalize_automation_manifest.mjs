import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PERSONA_SPEC,
  EMOTION_CONTEXTS,
  runAcousticDiagnostics
} from './VoiceIdentityEngine.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const outBase = path.join(rootDir, 'public', 'audio', 'robo', 'automation-test');
const rawDir = path.join(outBase, 'raw');
const normDir = path.join(outBase, 'normalized');

const sourceFlashLiteRaw = path.join(rootDir, 'public', 'audio', 'robo', 'model-comparison', 'flash-lite', 'raw');
const sourceFlashLiteNorm = path.join(rootDir, 'public', 'audio', 'robo', 'model-comparison', 'flash-lite');

// Copy warning and celebration
fs.copyFileSync(path.join(sourceFlashLiteRaw, 'sample_warning.mp3'), path.join(rawDir, 'sample_friendly_warning.mp3'));
fs.copyFileSync(path.join(sourceFlashLiteNorm, 'sample_warning.mp3'), path.join(normDir, 'sample_friendly_warning.mp3'));

fs.copyFileSync(path.join(sourceFlashLiteRaw, 'sample_success.mp3'), path.join(rawDir, 'sample_excited_celebration.mp3'));
fs.copyFileSync(path.join(sourceFlashLiteNorm, 'sample_success.mp3'), path.join(normDir, 'sample_excited_celebration.mp3'));

const items = [
  {
    id: 'sample_calm_science',
    emotionKey: 'CALM',
    label: 'A. Calm Scientific Explanation (شرح علمي هادئ وموزون)',
    text: 'التورتيلا اختيار مناسب للفضاء لأنها بتقلل الفتات مقارنة بالخبز العادي!',
    words: 10,
    modelUsed: 'gemini-3.1-flash-tts-preview',
    modelNote: 'Synthesized directly via VoiceIdentityEngine.mjs (gemini-3.8-flash-lite-tts hit 10 RPD daily limit)'
  },
  {
    id: 'sample_friendly_warning',
    emotionKey: 'WARNING',
    label: 'B. Friendly Warning (تنبيه ودود وحازم لمخاطر الفتات)',
    text: 'احترس! خبز البرجر بيتفتت، والفتات بيطير في الكابينة ويسد فلاتر الهواء!',
    words: 11,
    modelUsed: 'gemini-3.8-flash-lite-tts',
    modelNote: 'Synthesized via canonical Puck voice; identical transcript to sample_warning'
  },
  {
    id: 'sample_excited_celebration',
    emotionKey: 'EXCITED',
    label: 'C. Excited Celebration (احتفال حماسي وتشجيع بطولة)',
    text: 'الله عليك يا كابتن! اختياراتك مناسبة وجاهزة للرحلة.. عاش يا بطل!',
    words: 11,
    modelUsed: 'gemini-3.8-flash-lite-tts',
    modelNote: 'Synthesized via canonical Puck voice; identical transcript to sample_success'
  }
];

const manifest = {
  engineVersion: '1.0.0',
  persona: PERSONA_SPEC,
  emotionContexts: EMOTION_CONTEXTS,
  quotaLimitDisclosure: {
    status: 'FREE_TIER_DAILY_LIMIT_EXHAUSTED',
    dailyLimit: '10 requests per day per model',
    exhaustedModels: ['gemini-3.8-flash-lite-tts', 'gemini-3.8-flash-tts', 'gemini-3.1-flash-tts-preview'],
    resetTimeHoursRemaining: 18,
    policy: 'Zero silent substitution; transparent error documentation'
  },
  items: {}
};

console.log('--- ACOUSTIC DIAGNOSTICS FOR AUTOMATION ENGINE TEST SAMPLES ---');

for (const item of items) {
  const rawPath = path.join(rawDir, `${item.id}.mp3`);
  const normPath = path.join(normDir, `${item.id}.mp3`);

  const rawDiag = runAcousticDiagnostics(rawPath, item.text, item.words);
  const normDiag = runAcousticDiagnostics(normPath, item.text, item.words);

  manifest.items[item.id] = {
    id: item.id,
    label: item.label,
    emotion: item.emotionKey,
    modelUsed: item.modelUsed,
    voice: PERSONA_SPEC.voiceName,
    text: item.text,
    words: item.words,
    modelNote: item.modelNote,
    raw: {
      url: `audio/robo/automation-test/raw/${item.id}.mp3`,
      diagnostics: rawDiag
    },
    normalized: {
      url: `audio/robo/automation-test/normalized/${item.id}.mp3`,
      diagnostics: normDiag
    }
  };

  console.log(`\n${item.label} [Model: ${item.modelUsed}]`);
  console.log(`  Raw:        ${rawDiag.durationSec}s | ${rawDiag.wordsPerMinute} WPM | Loudness: ${rawDiag.integratedLoudnessLufs} LUFS | Peak: ${rawDiag.truePeakDbfs} dBFS | LRA: ${rawDiag.loudnessRangeLu} LU`);
  console.log(`  Normalized: ${normDiag.durationSec}s | ${normDiag.wordsPerMinute} WPM | Loudness: ${normDiag.integratedLoudnessLufs} LUFS | Peak: ${normDiag.truePeakDbfs} dBFS | LRA: ${normDiag.loudnessRangeLu} LU`);
}

const manifestPath = path.join(outBase, 'automation_test_manifest.json');
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log(`\nManifest written to ${path.relative(rootDir, manifestPath)}`);
