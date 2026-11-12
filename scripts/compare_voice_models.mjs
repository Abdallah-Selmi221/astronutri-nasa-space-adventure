import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const rootDir = process.cwd();
const envPath = path.join(rootDir, '.env');

let apiKey = process.env.GEMINI_API_KEY || '';
if (!apiKey && fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  const match = content.match(/^GEMINI_API_KEY=(.+)$/m);
  if (match) apiKey = match[1].trim();
}

const SAMPLES = [
  {
    id: 'sample_greeting',
    text: 'يا مرحب يا بطل! أنا روبو.. جاهز للمغامرة في الفضاء؟ يلا بينا!'
  },
  {
    id: 'sample_success',
    text: 'الله عليك يا كابتن! اختياراتك مناسبة وجاهزة للرحلة.. عاش يا بطل!'
  },
  {
    id: 'sample_warning',
    text: 'احترس! خبز البرجر بيتفتت، والفتات بيطير في الكابينة ويسد فلاتر الهواء!'
  }
];

const MODELS = [
  { id: 'flash-lite', modelName: 'gemini-3.8-flash-lite-tts' },
  { id: 'flash', modelName: 'gemini-3.8-flash-tts' }
];

function createWavHeader(pcmLength, sampleRate = 24000, numChannels = 1, bitsPerSample = 16) {
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const buffer = Buffer.alloc(44);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + pcmLength, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(pcmLength, 40);

  return buffer;
}

async function requestSynthesis(modelName, text) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text }] }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Puck' }
          }
        }
      }
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    return { success: false, status: response.status, error: errText };
  }

  const json = await response.json();
  const b64 = json?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!b64) {
    return { success: false, status: 200, error: 'Empty audio payload in response' };
  }

  return { success: true, pcmBuffer: Buffer.from(b64, 'base64') };
}

async function run() {
  console.log('================================================================');
  console.log('ASTRONUTRI — DUAL VOICE MODEL COMPARISON BENCHMARK');
  console.log('Models: gemini-3.8-flash-lite-tts vs gemini-3.8-flash-tts');
  console.log('Voice: Puck | Silence Trim: -48dB');
  console.log('================================================================\n');

  const comparisonReport = {};

  for (const { id: dirName, modelName } of MODELS) {
    const targetDir = path.join(rootDir, 'public', 'audio', 'robo', 'model-comparison', dirName);
    fs.mkdirSync(targetDir, { recursive: true });

    console.log(`\n----------------------------------------------------------------`);
    console.log(`Evaluating Model: ${modelName} -> ${targetDir}`);
    console.log(`----------------------------------------------------------------`);

    comparisonReport[dirName] = {
      modelName,
      targetDir,
      results: {}
    };

    for (const sample of SAMPLES) {
      console.log(`   Synthesizing: "${sample.id}"...`);
      const result = await requestSynthesis(modelName, sample.text);

      if (!result.success) {
        console.log(`   ✗ FAILED [HTTP ${result.status}]: ${result.error.slice(0, 160)}...`);
        comparisonReport[dirName].results[sample.id] = {
          success: false,
          httpStatus: result.status,
          error: result.error
        };
      } else {
        const rawDur = Math.round((result.pcmBuffer.length / (24000 * 2)) * 100) / 100;
        const wavPath = path.join(targetDir, `${sample.id}.wav`);
        const mp3Path = path.join(targetDir, `${sample.id}.mp3`);

        const wavHeader = createWavHeader(result.pcmBuffer.length, 24000, 1, 16);
        fs.writeFileSync(wavPath, Buffer.concat([wavHeader, result.pcmBuffer]));

        // Convert with -48dB silence trim
        execFileSync('ffmpeg', [
          '-y',
          '-i', wavPath,
          '-af', 'silenceremove=start_periods=1:start_duration=0.01:start_threshold=-48dB:stop_periods=1:stop_duration=0.45:stop_threshold=-48dB',
          '-codec:a', 'libmp3lame',
          '-b:a', '64k',
          '-ar', '24000',
          '-ac', '1',
          mp3Path
        ]);

        const stat = fs.statSync(mp3Path);
        const probeStr = execFileSync('ffprobe', [
          '-i', mp3Path,
          '-show_entries', 'format=duration',
          '-v', 'quiet',
          '-of', 'csv=p=0'
        ]).toString().trim();

        const trimmedDur = Math.round(parseFloat(probeStr) * 100) / 100;

        fs.unlinkSync(wavPath); // Clean temp wav

        console.log(`   ✓ Saved: ${sample.id}.mp3`);
        console.log(`     Raw: ${rawDur}s -> Trimmed (-48dB): ${trimmedDur}s (${stat.size} bytes)`);

        comparisonReport[dirName].results[sample.id] = {
          success: true,
          filePath: mp3Path,
          rawDurationSec: rawDur,
          trimmedDurationSec: trimmedDur,
          fileSizeBytes: stat.size,
          decodingVerified: true
        };
      }

      await new Promise(r => setTimeout(r, 600));
    }
  }

  // Save benchmark manifest
  const reportPath = path.join(rootDir, 'public', 'audio', 'robo', 'model-comparison', 'comparison_manifest.json');
  fs.writeFileSync(reportPath, JSON.stringify(comparisonReport, null, 2));
  console.log(`\n================================================================`);
  console.log(`Benchmark Complete! Manifest saved to: ${reportPath}`);
  console.log(`================================================================`);
}

run().catch(console.error);
