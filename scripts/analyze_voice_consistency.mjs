import fs from 'node:fs';
import path from 'node:path';
import { execSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const clips = [
  {
    id: 'sample_greeting',
    name: 'Greeting (ترحيب)',
    path: path.join(rootDir, 'public', 'audio', 'robo', 'model-comparison', 'flash-lite', 'sample_greeting.mp3'),
    text: 'يا مرحب يا بطل! أنا روبو.. جاهز للمغامرة في الفضاء؟ يلا بينا!',
    words: 11
  },
  {
    id: 'sample_success',
    name: 'Success (احتفال ونجاح)',
    path: path.join(rootDir, 'public', 'audio', 'robo', 'model-comparison', 'flash-lite', 'sample_success.mp3'),
    text: 'الله عليك يا كابتن! اختياراتك مناسبة وجاهزة للرحلة.. عاش يا بطل!',
    words: 11
  },
  {
    id: 'sample_warning',
    name: 'Warning (تحذير وتنبيه)',
    path: path.join(rootDir, 'public', 'audio', 'robo', 'model-comparison', 'flash-lite', 'sample_warning.mp3'),
    text: 'احترس! خبز البرجر بيتفتت، والفتات بيطير في الكابينة ويسد فلاتر الهواء!',
    words: 11
  }
];

console.log('================================================================');
console.log('ASTRONUTRI — ROBO VOICE IDENTITY & CONSISTENCY ANALYSIS');
console.log('================================================================\n');

const results = [];

for (const clip of clips) {
  if (!fs.existsSync(clip.path)) {
    console.error(`Clip not found: ${clip.path}`);
    continue;
  }

  // 1. ffprobe format & duration
  const probe = JSON.parse(execSync(`ffprobe -v quiet -print_format json -show_format -show_streams "${clip.path}"`, { encoding: 'utf-8' }));
  const duration = parseFloat(probe.format.duration);
  const sampleRate = parseInt(probe.streams[0].sample_rate, 10);
  const channels = probe.streams[0].channels;

  // 2. ffmpeg loudnorm analysis
  let loudnormJson = null;
  const loudnormRes = spawnSync('ffmpeg', ['-i', clip.path, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=7:print_format=json', '-f', 'null', '-'], { encoding: 'utf-8' });
  const stderrLoud = (loudnormRes.stderr || '') + (loudnormRes.stdout || '');
  const match = stderrLoud.match(/\{[\s\S]*"input_i"[\s\S]*\}/);
  if (match) {
    try {
      loudnormJson = JSON.parse(match[0]);
    } catch {}
  }

  // 3. astats analysis for RMS and peak levels
  let astats = {};
  const astatsRes = spawnSync('ffmpeg', ['-i', clip.path, '-af', 'astats=metadata=1:reset=1', '-f', 'null', '-'], { encoding: 'utf-8' });
  const stderrAstats = (astatsRes.stderr || '') + (astatsRes.stdout || '');
  const rmsMatch = stderrAstats.match(/RMS level dB:\s*([-\d.]+)/);
  const peakMatch = stderrAstats.match(/Peak level dB:\s*([-\d.]+)/);
  astats = {
    rmsLevelDb: rmsMatch ? parseFloat(rmsMatch[1]) : null,
    peakLevelDb: peakMatch ? parseFloat(peakMatch[1]) : null
  };

  const wpm = (clip.words / duration) * 60;

  results.push({
    id: clip.id,
    name: clip.name,
    durationSec: duration,
    sampleRateHz: sampleRate,
    channels: channels,
    words: clip.words,
    wordsPerMinute: Math.round(wpm),
    integratedLoudnessLufs: loudnormJson ? parseFloat(loudnormJson.input_i) : null,
    truePeakDbfs: loudnormJson ? parseFloat(loudnormJson.input_tp) : null,
    loudnessRangeLu: loudnormJson ? parseFloat(loudnormJson.input_lra) : null,
    thresholdDb: loudnormJson ? parseFloat(loudnormJson.input_thresh) : null,
    rmsLevelDb: astats.rmsLevelDb,
    peakLevelDb: astats.peakLevelDb
  });
}

console.table(results.map(r => ({
  Clip: r.id,
  Duration: `${r.durationSec.toFixed(2)}s`,
  Words: r.words,
  Speed: `${r.wordsPerMinute} WPM`,
  'Loudness (LUFS)': r.integratedLoudnessLufs,
  'True Peak (dBFS)': r.truePeakDbfs,
  'RMS (dB)': r.rmsLevelDb,
  'LRA (LU)': r.loudnessRangeLu
})));

fs.writeFileSync(path.join(rootDir, 'public', 'audio', 'robo', 'model-comparison', 'voice_metrics.json'), JSON.stringify(results, null, 2));
console.log('\nMetrics saved to public/audio/robo/model-comparison/voice_metrics.json');
