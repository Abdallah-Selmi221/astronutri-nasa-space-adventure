import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createPNG(width, height, rgbaBuffer) {
  function crc32(buf) {
    let table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
      table[i] = c;
    }
    let crc = -1;
    for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
    return (crc ^ (-1)) >>> 0;
  }

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const combined = Buffer.concat([typeBuf, data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(combined), 0);
    return Buffer.concat([len, combined, crc]);
  }

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 6;
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdr = makeChunk('IHDR', ihdrData);

  const scanlines = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    const lineStart = y * (1 + width * 4);
    scanlines[lineStart] = 0;
    rgbaBuffer.copy(scanlines, lineStart + 1, y * width * 4, (y + 1) * width * 4);
  }

  const idat = makeChunk('IDAT', zlib.deflateSync(scanlines, { level: 9 }));
  const iend = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdr, idat, iend]);
}

// 1. Generate Clean Anti-Aliased Earth (256x256)
function generateEarth(size = 256) {
  const buf = Buffer.alloc(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.42;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const o = (y * size + x) * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Atmospheric outer glow (Fresnel rim)
      if (dist > r && dist <= r + 12) {
        const glowFactor = 1 - (dist - r) / 12;
        const alpha = Math.floor(glowFactor * 0.45 * 255);
        buf[o] = 56;
        buf[o + 1] = 189;
        buf[o + 2] = 248;
        buf[o + 3] = alpha;
        continue;
      }

      if (dist > r) {
        // Completely transparent outside
        buf[o + 3] = 0;
        continue;
      }

      // Smooth anti-aliased edge at r
      const edgeAlpha = dist > r - 1.5 ? Math.max(0, Math.min(1, (r - dist) / 1.5)) : 1.0;

      // Spherical 3D directional lighting
      const lx = dx / r;
      const ly = dy / r;
      const lz = Math.sqrt(Math.max(0, 1 - lx * lx - ly * ly));
      // Light from top-left (-0.5, -0.5, 0.7)
      const dot = Math.max(0, lx * (-0.45) + ly * (-0.45) + lz * 0.76);
      const shade = 0.25 + 0.75 * Math.pow(dot, 1.2);

      // Procedural continents noise simulation
      const nx = (lx + 0.15) * 2.8;
      const ny = (ly - 0.1) * 2.8;
      const continentVal = Math.sin(nx * 2.4 + Math.cos(ny * 2.2)) + Math.cos(ny * 2.5 - Math.sin(nx * 1.8));
      const isLand = continentVal > 0.18;

      let cr, cg, cb;
      if (isLand) {
        // Green / Olive landmass
        cr = Math.floor(34 * shade);
        cg = Math.floor(197 * shade);
        cb = Math.floor(94 * shade);
      } else {
        // Deep blue ocean
        cr = Math.floor(2 * shade + 10);
        cg = Math.floor(132 * shade + 30);
        cb = Math.floor(199 * shade + 50);
      }

      // Atmospheric cloud wisps
      const cloudVal = Math.sin(nx * 3.5 + ny * 2.1) * Math.cos(ny * 3.2 - nx * 1.5);
      if (cloudVal > 0.45) {
        const cloudOpacity = Math.min(0.75, (cloudVal - 0.45) * 2.0);
        cr = Math.floor(cr * (1 - cloudOpacity) + 255 * cloudOpacity);
        cg = Math.floor(cg * (1 - cloudOpacity) + 255 * cloudOpacity);
        cb = Math.floor(cb * (1 - cloudOpacity) + 255 * cloudOpacity);
      }

      // Limb brightening / Fresnel
      const fresnel = Math.pow(1 - lz, 2.5) * 0.45;
      cr = Math.min(255, Math.floor(cr + 56 * fresnel));
      cg = Math.min(255, Math.floor(cg + 189 * fresnel));
      cb = Math.min(255, Math.floor(cb + 248 * fresnel));

      buf[o] = cr;
      buf[o + 1] = cg;
      buf[o + 2] = cb;
      buf[o + 3] = Math.floor(edgeAlpha * 255);
    }
  }

  return createPNG(size, size, buf);
}

// 2. Generate Clean Saturn with Unbroken Rings (320x220)
function generateSaturn(width = 320, height = 220) {
  const buf = Buffer.alloc(width * height * 4);
  const cx = width / 2;
  const cy = height / 2;
  const bodyRadius = 48;

  // Ring dimensions
  const ringA = 138; // semi-major
  const ringB = 38;  // semi-minor
  const innerA = 70;
  const innerB = 19;
  const cassiniA1 = 98;
  const cassiniA2 = 104;

  const tilt = -16 * (Math.PI / 180);
  const cosT = Math.cos(tilt);
  const sinT = Math.sin(tilt);

  // Helper for rotated ring coords
  function getRingCoords(x, y) {
    const rx = x - cx;
    const ry = y - cy;
    const px = rx * cosT + ry * sinT;
    const py = -rx * sinT + ry * cosT;
    return { px, py };
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 4;
      const dx = x - cx;
      const dy = y - cy;
      const bodyDist = Math.sqrt(dx * dx + dy * dy);

      const { px, py } = getRingCoords(x, y);
      const ringDistNorm = Math.sqrt((px * px) / (ringA * ringA) + (py * py) / (ringB * ringB));
      const ringA_Coord = Math.sqrt(px * px + (py * (ringA / ringB)) * (py * (ringA / ringB)));

      const isRing = ringA_Coord >= innerA && ringA_Coord <= ringA;
      const isCassini = ringA_Coord >= cassiniA1 && ringA_Coord <= cassiniA2;
      const isBackRing = py < 0;
      const isFrontRing = py >= 0;

      let pixelAlpha = 0;
      let r = 0, g = 0, b = 0;

      // 1. BACK RING (behind planet)
      if (isRing && !isCassini && isBackRing && bodyDist > bodyRadius) {
        const ringEdge = Math.min((ringA_Coord - innerA) / 3, (ringA - ringA_Coord) / 3);
        const ringAlpha = Math.max(0, Math.min(0.85, ringEdge));
        r = 251; g = 191; b = 36;
        pixelAlpha = ringAlpha;
      }

      // 2. PLANET BODY
      if (bodyDist <= bodyRadius) {
        const edgeAlpha = bodyDist > bodyRadius - 1.5 ? Math.max(0, Math.min(1, (bodyRadius - bodyDist) / 1.5)) : 1.0;
        const lx = dx / bodyRadius;
        const ly = dy / bodyRadius;
        const lz = Math.sqrt(Math.max(0, 1 - lx * lx - ly * ly));
        const dot = Math.max(0, lx * (-0.4) + ly * (-0.4) + lz * 0.82);
        const shade = 0.3 + 0.7 * dot;

        // Banded amber gas giant
        const band = Math.sin(ly * 12) * 0.15 + Math.cos(ly * 6) * 0.1;
        r = Math.floor((245 + band * 30) * shade);
        g = Math.floor((158 + band * 25) * shade);
        b = Math.floor((11 + band * 10) * shade);
        pixelAlpha = edgeAlpha;

        // Ring shadow across body
        if (py > -12 && py < 10) {
          const shadowFactor = 0.55;
          r = Math.floor(r * shadowFactor);
          g = Math.floor(g * shadowFactor);
          b = Math.floor(b * shadowFactor);
        }
      }

      // 3. FRONT RING (in front of planet)
      if (isRing && !isCassini && isFrontRing) {
        const ringEdge = Math.min((ringA_Coord - innerA) / 3, (ringA - ringA_Coord) / 3);
        const ringAlpha = Math.max(0, Math.min(0.92, ringEdge));

        // Blend over body if overlapping
        const rr = 254, gg = 224, bb = 71;
        if (pixelAlpha > 0) {
          r = Math.floor(r * (1 - ringAlpha) + rr * ringAlpha);
          g = Math.floor(g * (1 - ringAlpha) + gg * ringAlpha);
          b = Math.floor(b * (1 - ringAlpha) + bb * ringAlpha);
          pixelAlpha = Math.max(pixelAlpha, ringAlpha);
        } else {
          r = rr; g = gg; b = bb;
          pixelAlpha = ringAlpha;
        }
      }

      buf[o] = Math.max(0, Math.min(255, r));
      buf[o + 1] = Math.max(0, Math.min(255, g));
      buf[o + 2] = Math.max(0, Math.min(255, b));
      buf[o + 3] = Math.floor(Math.max(0, Math.min(1, pixelAlpha)) * 255);
    }
  }

  return createPNG(width, height, buf);
}

const earthPng = generateEarth(256);
const saturnPng = generateSaturn(320, 220);

// Target destinations
const destinations = [
  { file: 'public/assets/sprites/planet-earth.png', data: earthPng },
  { file: 'public/assets/sprites/space/planet-earth.png', data: earthPng },
  { file: 'public/assets/sprites/planet-saturn.png', data: saturnPng },
  { file: 'public/assets/sprites/space/planet-saturn.png', data: saturnPng },
];

for (const dest of destinations) {
  const dir = path.dirname(dest.file);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(dest.file, dest.data);
  console.log(`Saved clean planet asset: ${dest.file} (${dest.data.length} bytes)`);
}

console.log('All planets regenerated with pure mathematical anti-aliased transparency!');
