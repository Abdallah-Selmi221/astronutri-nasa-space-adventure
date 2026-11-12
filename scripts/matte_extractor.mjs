import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';

export function extractTransparentPNG(inputJpgPath, outputPngPath, width = 1024, height = 1024, threshold = 242, feather = 4, options = {}) {
  const {
    removeFloorShadow = false,
    floorShadowStartY = 700,
    shadowSatMax = 18,
    minShadowAvg = 160
  } = options;
  const tempRawInput = path.join('scratch', 'temp_in.raw');
  const tempRawOutput = path.join('scratch', 'temp_out.raw');

  // 1. Export raw RGBA with ffmpeg
  execSync(`ffmpeg -y -v error -i "${inputJpgPath}" -f rawvideo -pix_fmt rgba "${tempRawInput}"`);

  const buffer = fs.readFileSync(tempRawInput);
  const totalPixels = width * height;
  const visited = new Uint8Array(totalPixels);
  const isBg = new Uint8Array(totalPixels);

  // Helper index
  const idx = (x, y) => (y * width + x);
  const pxOffset = (x, y) => (y * width + x) * 4;

  const isBackgroundPixel = (x, y) => {
    const o = pxOffset(x, y);
    const r = buffer[o];
    const g = buffer[o + 1];
    const b = buffer[o + 2];
    const avg = (r + g + b) / 3;
    const sat = Math.max(r, g, b) - Math.min(r, g, b);

    // Standard pure background check
    if (r >= threshold && g >= threshold && b >= threshold) {
      return true;
    }

    // Floor shadow removal for floating assets & studio floor shadows
    if (removeFloorShadow && y >= floorShadowStartY) {
      if (sat <= shadowSatMax && avg >= minShadowAvg) {
        return true;
      }
    }

    return false;
  };

  // Queue for flood fill from borders
  const queueX = [];
  const queueY = [];

  // Seed with all border pixels
  for (let x = 0; x < width; x++) {
    if (isBackgroundPixel(x, 0)) { visited[idx(x, 0)] = 1; isBg[idx(x, 0)] = 1; queueX.push(x); queueY.push(0); }
    if (isBackgroundPixel(x, height - 1)) { visited[idx(x, height - 1)] = 1; isBg[idx(x, height - 1)] = 1; queueX.push(x); queueY.push(height - 1); }
  }
  for (let y = 0; y < height; y++) {
    if (isBackgroundPixel(0, y) && !visited[idx(0, y)]) { visited[idx(0, y)] = 1; isBg[idx(0, y)] = 1; queueX.push(0); queueY.push(y); }
    if (isBackgroundPixel(width - 1, y) && !visited[idx(width - 1, y)]) { visited[idx(width - 1, y)] = 1; isBg[idx(width - 1, y)] = 1; queueX.push(width - 1); queueY.push(y); }
  }

  // BFS Flood Fill
  let head = 0;
  const dx = [1, -1, 0, 0];
  const dy = [0, 0, 1, -1];

  while (head < queueX.length) {
    const cx = queueX[head];
    const cy = queueY[head];
    head++;

    for (let d = 0; d < 4; d++) {
      const nx = cx + dx[d];
      const ny = cy + dy[d];
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const nIndex = idx(nx, ny);
        if (!visited[nIndex]) {
          visited[nIndex] = 1;
          if (isBackgroundPixel(nx, ny)) {
            isBg[nIndex] = 1;
            queueX.push(nx);
            queueY.push(ny);
          }
        }
      }
    }
  }

  // Antialiasing / edge feathering:
  // For pixels marked as background: alpha = 0
  // For pixels adjacent to background that are bright: soften alpha
  const outBuffer = Buffer.from(buffer);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = idx(x, y);
      const o = pxOffset(x, y);
      if (isBg[i]) {
        outBuffer[o + 3] = 0; // Completely transparent
      } else {
        const r = buffer[o];
        const g = buffer[o + 1];
        const b = buffer[o + 2];
        const maxC = Math.max(r, g, b);
        const minC = Math.min(r, g, b);
        const sat = maxC - minC;
        const brightness = (r + g + b) / 3;

        // Check if pixel is a soft white/gray background halo
        let hasBgNeighbor = false;
        for (let d = 0; d < 4; d++) {
          const nx = x + dx[d];
          const ny = y + dy[d];
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            if (isBg[idx(nx, ny)]) {
              hasBgNeighbor = true;
              break;
            }
          }
        }

        if (hasBgNeighbor) {
          if (brightness > 215 && sat < 20) {
            // It's a faint shadow / white fringe near background
            const factor = Math.max(0, Math.min(1, (240 - brightness) / 25));
            outBuffer[o + 3] = Math.round(factor * 160);
            if (brightness > 235 || (removeFloorShadow && y >= floorShadowStartY && brightness > minShadowAvg && sat <= shadowSatMax)) {
              outBuffer[o + 3] = 0;
            }
          } else if (removeFloorShadow && y >= floorShadowStartY && brightness >= minShadowAvg && sat <= shadowSatMax) {
            // Floor shadow feathering directly adjacent to BFS-marked background
            outBuffer[o + 3] = 0;
          }
        }
      }
    }
  }

  fs.writeFileSync(tempRawOutput, outBuffer);

  // Convert raw RGBA to PNG with ffmpeg
  execSync(`ffmpeg -y -v error -f rawvideo -pix_fmt rgba -s ${width}x${height} -i "${tempRawOutput}" -vcodec png "${outputPngPath}"`);

  // Cleanup temp files
  try {
    fs.unlinkSync(tempRawInput);
    fs.unlinkSync(tempRawOutput);
  } catch {}

  console.log(`Successfully extracted transparent PNG to: ${outputPngPath} (${fs.statSync(outputPngPath).size} bytes)`);
}

// Test CLI run
if (process.argv[2] && process.argv[3]) {
  extractTransparentPNG(process.argv[2], process.argv[3]);
}
