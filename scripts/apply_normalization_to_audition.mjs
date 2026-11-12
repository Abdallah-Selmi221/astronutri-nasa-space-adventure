import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const targetDir = path.join(rootDir, 'public', 'audio', 'robo', 'model-comparison', 'flash-lite');
const rawDir = path.join(targetDir, 'raw');

fs.mkdirSync(rawDir, { recursive: true });

const clips = [
  'sample_greeting.mp3',
  'sample_success.mp3',
  'sample_warning.mp3'
];

console.log('--- BACKING UP RAW AUDITION SAMPLES AND APPLYING EBU R128 NORMALIZATION ---');

for (const clip of clips) {
  const currentPath = path.join(targetDir, clip);
  const rawPath = path.join(rawDir, clip);

  if (fs.existsSync(currentPath)) {
    // Copy to raw backup if not already backed up
    if (!fs.existsSync(rawPath)) {
      fs.copyFileSync(currentPath, rawPath);
      console.log(`Backed up raw file to ${path.relative(rootDir, rawPath)}`);
    }

    // Apply EBU R128 Loudness Normalization from raw backup
    const tempOut = path.join(targetDir, `temp_${clip}`);
    execSync(
      `ffmpeg -y -i "${rawPath}" -af "loudnorm=I=-16:TP=-1.5:LRA=7" -codec:a libmp3lame -b:a 64k -ar 24000 -ac 1 "${tempOut}"`,
      { stdio: 'ignore' }
    );

    fs.renameSync(tempOut, currentPath);
    console.log(`Normalized ${clip} with EBU R128 (-16 LUFS, -1.5 TP, 7 LRA)`);
  }
}

console.log('✅ Audition samples successfully normalized.');
