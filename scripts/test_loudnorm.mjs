import fs from 'node:fs';
import path from 'node:path';
import { execSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const testDir = path.join(rootDir, 'public', 'audio', 'robo', 'model-comparison', 'normalized-test');
fs.mkdirSync(testDir, { recursive: true });

const clips = [
  'sample_greeting.mp3',
  'sample_success.mp3',
  'sample_warning.mp3'
];

console.log('Testing EBU R128 normalization on audition clips...');

for (const clip of clips) {
  const inPath = path.join(rootDir, 'public', 'audio', 'robo', 'model-comparison', 'flash-lite', clip);
  const outPath = path.join(testDir, clip);

  // Apply ffmpeg loudnorm
  // Two-pass or integrated single-pass with EBU R128:
  execSync(`ffmpeg -y -i "${inPath}" -af "loudnorm=I=-16:TP=-1.5:LRA=7" -ar 24000 -c:a libmp3lame -b:a 64k "${outPath}"`, { stdio: 'ignore' });

  // Probe output
  const loudnormRes = spawnSync('ffmpeg', ['-i', outPath, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=7:print_format=json', '-f', 'null', '-'], { encoding: 'utf-8' });
  const stderrLoud = (loudnormRes.stderr || '') + (loudnormRes.stdout || '');
  const match = stderrLoud.match(/\{[\s\S]*"input_i"[\s\S]*\}/);
  if (match) {
    const data = JSON.parse(match[0]);
    console.log(`Normalized ${clip}:`);
    console.log(`  Integrated Loudness: ${data.input_i} LUFS (Target: -16.0)`);
    console.log(`  True Peak: ${data.input_tp} dBFS (Target max: -1.5)`);
    console.log(`  LRA: ${data.input_lra} LU`);
  }
}
