/**
 * AstroNutri — generate_identity_test_samples.mjs
 * Generates 3 new samples using VoiceIdentityEngine.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PERSONA_SPEC,
  EMOTION_CONTEXTS,
  buildPersonaPayload,
  createWavHeader,
  synthesizeWithBackoff,
  processAudioDual,
  runAcousticDiagnostics
} from './VoiceIdentityEngine.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const testItems = [
  {
    id: 'sample_calm_science',
    emotionKey: 'CALM',
    label: 'A. Calm Scientific Explanation (شرح علمي هادئ)',
    text: 'التورتيلا اختيار مناسب للفضاء لأنها بتقلل الفتات مقارنة بالخبز العادي!',
    words: 10
  },
  {
    id: 'sample_friendly_warning',
    emotionKey: 'WARNING',
    label: 'B. Friendly Warning (تنبيه ودود وحازم)',
    text: 'احترس! خبز البرجر بيتفتت، والفتات بيطير في الكابينة ويسد فلاتر الهواء!',
    words: 11
  },
  {
    id: 'sample_excited_celebration',
    emotionKey: 'EXCITED',
    label: 'C. Excited Celebration (احتفال حماسي وتشجيع)',
    text: 'الله عليك يا كابتن! اختياراتك مناسبة وجاهزة للرحلة.. عاش يا بطل!',
    words: 11
  }
];

const outBase = path.join(rootDir, 'public', 'audio', 'robo', 'automation-test');
const rawDir = path.join(outBase, 'raw');
const normDir = path.join(outBase, 'normalized');
fs.mkdirSync(rawDir, { recursive: true });
fs.mkdirSync(normDir, { recursive: true });

async function main() {
  console.log('================================================================');
  console.log('ASTRONUTRI — GENERATE 3 NEW AUTOMATION ENGINE TEST SAMPLES');
  console.log('================================================================\n');

  const manifest = {
    generatedAt: new Date().toISOString(),
    personaSpec: PERSONA_SPEC,
    items: {}
  };

  for (const item of testItems) {
    console.log(`Generating: ${item.label}`);
    console.log(`  Text: "${item.text}"`);

    let activeModel = PERSONA_SPEC.canonicalModel;
    let pcmBuffer = null;
    let modelUsed = activeModel;
    let quotaExhaustedNote = null;

    // 1. Try canonical model first
    try {
      const payloadCanonical = buildPersonaPayload(item.text, item.emotionKey, activeModel);
      pcmBuffer = await synthesizeWithBackoff(payloadCanonical);
    } catch (err) {
      if (err.httpStatus === 429) {
        console.warn(`  ⚠️ Canonical model (${activeModel}) hit 10 RPD Free Tier limit.`);
        quotaExhaustedNote = {
          canonicalModel: activeModel,
          httpStatus: 429,
          errorMessage: err.message
        };

        // Try gemini-3.1-flash-tts-preview with Puck voice with full disclosure
        const fallbackModel = 'gemini-3.1-flash-tts-preview';
        console.log(`  -> Synthesizing via active preview sibling: ${fallbackModel} (Voice: Puck)...`);
        const payloadFallback = buildPersonaPayload(item.text, item.emotionKey, fallbackModel);
        pcmBuffer = await synthesizeWithBackoff(payloadFallback);
        modelUsed = fallbackModel;
      } else {
        throw err;
      }
    }

    if (!pcmBuffer) {
      throw new Error(`Failed to synthesize audio for ${item.id}`);
    }

    // 2. Write Temporary WAV file
    const wavPath = path.join(outBase, `${item.id}.wav`);
    const wavHeader = createWavHeader(pcmBuffer.length, 24000, 1, 16);
    fs.writeFileSync(wavPath, Buffer.concat([wavHeader, pcmBuffer]));

    // 3. Process Dual Output (Raw & EBU R128 Normalized)
    const rawMp3Path = path.join(rawDir, `${item.id}.mp3`);
    const normMp3Path = path.join(normDir, `${item.id}.mp3`);

    processAudioDual(wavPath, rawMp3Path, normMp3Path);

    // Delete temp wav
    fs.unlinkSync(wavPath);

    // 4. Acoustic Diagnostics
    const rawDiag = runAcousticDiagnostics(rawMp3Path, item.text, item.words);
    const normDiag = runAcousticDiagnostics(normMp3Path, item.text, item.words);

    console.log(`  Raw:        Duration: ${rawDiag.durationSec}s | Speed: ${rawDiag.wordsPerMinute} WPM | Loudness: ${rawDiag.integratedLoudnessLufs} LUFS | Peak: ${rawDiag.truePeakDbfs} dBFS`);
    console.log(`  Normalized: Duration: ${normDiag.durationSec}s | Speed: ${normDiag.wordsPerMinute} WPM | Loudness: ${normDiag.integratedLoudnessLufs} LUFS | Peak: ${normDiag.truePeakDbfs} dBFS`);

    manifest.items[item.id] = {
      id: item.id,
      label: item.label,
      emotion: item.emotionKey,
      modelUsed,
      voice: PERSONA_SPEC.voiceName,
      text: item.text,
      words: item.words,
      quotaExhaustedNote,
      raw: {
        file: `audio/robo/automation-test/raw/${item.id}.mp3`,
        diagnostics: rawDiag
      },
      normalized: {
        file: `audio/robo/automation-test/normalized/${item.id}.mp3`,
        diagnostics: normDiag
      }
    };

    console.log('----------------------------------------------------------------');
  }

  const manifestPath = path.join(outBase, 'automation_test_manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`\n✅ All 3 Automation Engine test samples generated & diagnostics saved:`);
  console.log(`   ${path.relative(rootDir, manifestPath)}`);
}

main().catch((err) => {
  console.error(`❌ FATAL ERROR: ${err.message}`);
  process.exit(1);
});
