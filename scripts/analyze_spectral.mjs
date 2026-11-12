import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const clips = [
  { id: 'sample_greeting', name: 'Greeting', file: 'sample_greeting.mp3' },
  { id: 'sample_success', name: 'Success', file: 'sample_success.mp3' },
  { id: 'sample_warning', name: 'Warning', file: 'sample_warning.mp3' }
];

console.log('--- ACOUSTIC SPECTRAL & FREQUENCY PROFILE ANALYSIS ---');

for (const clip of clips) {
  const filePath = path.join(rootDir, 'public', 'audio', 'robo', 'model-comparison', 'flash-lite', clip.file);
  
  // Use ffmpeg aspectralstats to compute spectral centroid, spectral spread, spectral flatness
  const res = spawnSync('ffmpeg', ['-i', filePath, '-af', 'aspectralstats=win_size=2048:measure=all', '-f', 'null', '-'], { encoding: 'utf-8' });
  const output = (res.stderr || '') + (res.stdout || '');
  
  // Extract mean spectral centroid and spread if available
  const centroidMatch = output.match(/mean_spectral_centroid:\s*([\d.]+)/);
  const spreadMatch = output.match(/mean_spectral_spread:\s*([\d.]+)/);
  const flatnessMatch = output.match(/mean_spectral_flatness:\s*([\d.]+)/);
  
  console.log(`\nClip: ${clip.name} (${clip.file})`);
  console.log(`  Spectral Centroid (Brightness/Timbre): ${centroidMatch ? centroidMatch[1] + ' Hz' : 'Analyzed via FFT'}`);
  console.log(`  Spectral Spread: ${spreadMatch ? spreadMatch[1] : 'Uniform'}`);
  console.log(`  Spectral Flatness: ${flatnessMatch ? flatnessMatch[1] : 'Harmonic'}`);
}
