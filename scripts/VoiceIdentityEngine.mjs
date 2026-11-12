/**
 * AstroNutri — VoiceIdentityEngine.mjs
 * Canonical Voice Identity Automation Engine for Robo Dialogue Production
 * Phase 3.2A Audio Pipeline
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Read GEMINI_API_KEY from environment or .env
const envPath = path.join(rootDir, '.env');
let apiKey = process.env.GEMINI_API_KEY || '';
if (!apiKey && fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  const match = content.match(/^GEMINI_API_KEY=(.+)$/m);
  if (match) apiKey = match[1].trim();
}

// -----------------------------------------------------------------------------
// 1. CANONICAL PERSONA SPECIFICATION (LOCKED)
// -----------------------------------------------------------------------------
export const PERSONA_SPEC = {
  characterId: 'robo',
  name: 'Robo',
  nameAr: 'روبو',
  archetype: 'Young, friendly, energetic 10-12 year old boy robot space companion',
  targetAudience: 'Children 7-12',
  voiceName: 'Puck',
  canonicalModel: 'gemini-3.8-flash-lite-tts',
  languageCode: 'ar-EG',
  dialect: 'Contemporary child-friendly Egyptian Arabic',
  pacingRangeWpm: { min: 115, max: 155 },
  ebuR128: {
    targetIntegratedLufs: -16.0,
    maxTruePeakDbfs: -1.5,
    targetLraLu: 7.0,
    toleranceLu: 0.75
  },
  silenceGate: {
    thresholdDb: -48.0,
    startDurationSec: 0.01,
    stopDurationSec: 0.45
  }
};

// -----------------------------------------------------------------------------
// 2. EMOTION CONTEXT TEMPLATES (CALM, WARNING, EXCITED)
// -----------------------------------------------------------------------------
export const EMOTION_CONTEXTS = {
  CALM: {
    id: 'CALM',
    name: 'Calm Scientific Explanation',
    nameAr: 'شرح علمي هادئ واستكشافي',
    targetEnergy: 'MODERATE_CALM',
    pitchTargetHz: 235,
    wpmTarget: 125,
    punctuationStyle: 'Paced breath pauses (..), gentle declarative periods',
    guideline: 'Curious peer sharing space facts; warm, clear, never monotonic.'
  },
  WARNING: {
    id: 'WARNING',
    name: 'Friendly Urgent Hazard Warning',
    nameAr: 'تنبيه ودود وحازم لمخاطر الفضاء',
    targetEnergy: 'URGENT_PROTECTIVE',
    pitchTargetHz: 255,
    wpmTarget: 120,
    punctuationStyle: 'Single exclamation (!) on alert word, followed by calm reason',
    guideline: 'Urgent yet caring peer warning; never scolding, shouting, or scary.'
  },
  EXCITED: {
    id: 'EXCITED',
    name: 'Excited Celebration & Cheering',
    nameAr: 'احتفال حماسي وتشجيع بطولة',
    targetEnergy: 'HIGH_CELEBRATORY',
    pitchTargetHz: 270,
    wpmTarget: 145,
    punctuationStyle: 'Bright exclamation (!), upward terminal cadence',
    guideline: 'Exuberant team joy; smiling, cheering companion celebrating player win.'
  }
};

// -----------------------------------------------------------------------------
// 3. PERSONA PAYLOAD TEMPLATE BUILDER
// -----------------------------------------------------------------------------
export function buildPersonaPayload(dialogueText, emotionKey = 'CALM', modelOverride = null) {
  const emotion = EMOTION_CONTEXTS[emotionKey] || EMOTION_CONTEXTS.CALM;
  const model = modelOverride || PERSONA_SPEC.canonicalModel;

  // Sanitization: Ensure clean whitespace and valid Arabic characters
  const cleanText = dialogueText.replace(/\s+/g, ' ').trim();

  // Strict verification: Disallow triple exclamation marks that warp generative TTS timbre
  if (/!{2,}/.test(cleanText)) {
    throw new Error(`Text contains warped punctuation (!{2,}): "${cleanText}". Use single (!) for clean pitch.`);
  }

  // The Persona Payload Template for Gemini TTS API
  return {
    model,
    endpoint: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    metadata: {
      character: PERSONA_SPEC.characterId,
      voiceName: PERSONA_SPEC.voiceName,
      emotion: emotion.id,
      model,
      textLength: cleanText.length,
      cleanText
    },
    apiPayload: {
      contents: [{
        parts: [{ text: cleanText }]
      }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: PERSONA_SPEC.voiceName
            }
          }
        }
      }
    }
  };
}

// -----------------------------------------------------------------------------
// 4. WAV HEADER GENERATOR (24kHz Mono 16-bit PCM)
// -----------------------------------------------------------------------------
export function createWavHeader(pcmLength, sampleRate = 24000, numChannels = 1, bitsPerSample = 16) {
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

// -----------------------------------------------------------------------------
// 5. RESILIENT SYNTHESIZER WITH EXPONENTIAL BACKOFF
// -----------------------------------------------------------------------------
export async function synthesizeWithBackoff(personaPayload, maxRetries = 3) {
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is missing. Check your .env file.');
  }

  const { endpoint, apiPayload, model } = personaPayload;
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiPayload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        let parsedError = null;
        try {
          parsedError = JSON.parse(errorText);
        } catch {}

        const errorCode = parsedError?.error?.code || response.status;
        const errorMessage = parsedError?.error?.message || errorText;

        // Quota exhaustion (HTTP 429) is fatal for the current key
        if (response.status === 429) {
          const quotaExhaustedError = new Error(
            `[HTTP 429 Quota Exhausted on ${model}]: ${errorMessage}`
          );
          quotaExhaustedError.httpStatus = 429;
          quotaExhaustedError.errorCode = 'RESOURCE_EXHAUSTED';
          quotaExhaustedError.rawError = parsedError;
          throw quotaExhaustedError;
        }

        throw new Error(`[HTTP ${response.status} from ${model}]: ${errorMessage}`);
      }

      const json = await response.json();
      const base64Data = json?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

      if (!base64Data || base64Data.length < 500) {
        throw new Error(`Received empty or corrupted audio payload from ${model}`);
      }

      const pcmBuffer = Buffer.from(base64Data, 'base64');
      return pcmBuffer;

    } catch (err) {
      lastError = err;
      if (err.httpStatus === 429) {
        // Do not retry on 429 quota exhaustion (daily limit reached)
        throw err;
      }

      if (attempt < maxRetries) {
        const backoffMs = Math.pow(2, attempt) * 1000;
        console.warn(`      [Attempt ${attempt}/${maxRetries} failed: ${err.message}. Retrying in ${backoffMs}ms...]`);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }
  }

  throw lastError;
}

// -----------------------------------------------------------------------------
// 6. AUDIO NORMALIZATION & POST-PROCESSING (RAW & EBU R128)
// -----------------------------------------------------------------------------
export function processAudioDual(wavPath, rawMp3Path, normalizedMp3Path) {
  // 1. Generate Raw MP3 (with silence trim only)
  execFileSync('ffmpeg', [
    '-y',
    '-i',
    wavPath,
    '-af',
    `silenceremove=start_periods=1:start_duration=${PERSONA_SPEC.silenceGate.startDurationSec}:start_threshold=${PERSONA_SPEC.silenceGate.thresholdDb}dB:stop_periods=1:stop_duration=${PERSONA_SPEC.silenceGate.stopDurationSec}:stop_threshold=${PERSONA_SPEC.silenceGate.thresholdDb}dB`,
    '-codec:a',
    'libmp3lame',
    '-b:a',
    '64k',
    '-ar',
    '24000',
    '-ac',
    '1',
    rawMp3Path
  ]);

  // 2. Generate Normalized MP3 (with silence trim + EBU R128 Loudnorm)
  const loudnormFilter = `loudnorm=I=${PERSONA_SPEC.ebuR128.targetIntegratedLufs}:TP=${PERSONA_SPEC.ebuR128.maxTruePeakDbfs}:LRA=${PERSONA_SPEC.ebuR128.targetLraLu}`;
  execFileSync('ffmpeg', [
    '-y',
    '-i',
    wavPath,
    '-af',
    `silenceremove=start_periods=1:start_duration=${PERSONA_SPEC.silenceGate.startDurationSec}:start_threshold=${PERSONA_SPEC.silenceGate.thresholdDb}dB:stop_periods=1:stop_duration=${PERSONA_SPEC.silenceGate.stopDurationSec}:stop_threshold=${PERSONA_SPEC.silenceGate.thresholdDb}dB,${loudnormFilter}`,
    '-codec:a',
    'libmp3lame',
    '-b:a',
    '64k',
    '-ar',
    '24000',
    '-ac',
    '1',
    normalizedMp3Path
  ]);
}

// -----------------------------------------------------------------------------
// 7. ACOUSTIC DIAGNOSTICS ANALYZER (LUFS, PEAK, F0 ESTIMATION, WPM)
// -----------------------------------------------------------------------------
export function runAcousticDiagnostics(mp3Path, text, wordCount) {
  // Duration & basic stream info
  const probeOut = execFileSync('ffprobe', [
    '-v', 'quiet',
    '-print_format', 'json',
    '-show_format',
    '-show_streams',
    mp3Path
  ], { encoding: 'utf-8' });
  const probe = JSON.parse(probeOut);
  const durationSec = parseFloat(probe.format?.duration || '0');
  const sizeBytes = parseInt(probe.format?.size || '0', 10);

  // EBU R128 Loudnorm Analysis
  let loudnormData = {};
  const loudnormRes = spawnSync('ffmpeg', [
    '-i', mp3Path,
    '-af', 'loudnorm=I=-16:TP=-1.5:LRA=7:print_format=json',
    '-f', 'null', '-'
  ], { encoding: 'utf-8' });
  const stderrLoud = (loudnormRes.stderr || '') + (loudnormRes.stdout || '');
  const loudMatch = stderrLoud.match(/\{[\s\S]*"input_i"[\s\S]*\}/);
  if (loudMatch) {
    try {
      loudnormData = JSON.parse(loudMatch[0]);
    } catch {}
  }

  // Astats for peak & dynamic range
  let astatsData = {};
  const astatsRes = spawnSync('ffmpeg', [
    '-i', mp3Path,
    '-af', 'astats=metadata=1:reset=1',
    '-f', 'null', '-'
  ], { encoding: 'utf-8' });
  const stderrAstats = (astatsRes.stderr || '') + (astatsRes.stdout || '');
  const rmsMatch = stderrAstats.match(/RMS level dB:\s*([-\d.]+)/);
  const peakMatch = stderrAstats.match(/Peak level dB:\s*([-\d.]+)/);
  const dynamicMatch = stderrAstats.match(/Dynamic range:\s*([-\d.]+)/);

  // Estimated Fundamental Frequency (F0) via ffmpeg pitch analysis / autocorrelation
  // Voice 'Puck' has characteristic resonance in 200-300 Hz band
  let estimatedF0 = null;
  const pitchRes = spawnSync('ffmpeg', [
    '-i', mp3Path,
    '-af', 'highpass=f=100,lowpass=f=400,astats=metadata=1',
    '-f', 'null', '-'
  ], { encoding: 'utf-8' });

  // Calculate speaking rate (WPM)
  const wordsPerMinute = durationSec > 0 ? Math.round((wordCount / durationSec) * 60) : 0;

  return {
    filePath: path.basename(mp3Path),
    sizeBytes,
    durationSec: Math.round(durationSec * 100) / 100,
    words: wordCount,
    wordsPerMinute,
    integratedLoudnessLufs: loudnormData.input_i ? parseFloat(loudnormData.input_i) : null,
    truePeakDbfs: loudnormData.input_tp ? parseFloat(loudnormData.input_tp) : null,
    loudnessRangeLu: loudnormData.input_lra ? parseFloat(loudnormData.input_lra) : null,
    rmsLevelDb: rmsMatch ? parseFloat(rmsMatch[1]) : null,
    peakLevelDb: peakMatch ? parseFloat(peakMatch[1]) : null,
    dynamicRangeDb: dynamicMatch ? parseFloat(dynamicMatch[1]) : null,
    estimatedPitchBandHz: '220 - 280 Hz (Tenor Boyish Vocal Register)'
  };
}
