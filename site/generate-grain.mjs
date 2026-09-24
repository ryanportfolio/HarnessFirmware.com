// Writes assets/grain.png: a 256x256 tile of grayscale noise for the film-grain layers.
// Each pixel averages two uniform samples (triangular distribution), centred on mid-gray and
// scaled to a standard deviation near 58 levels, so grain reads fine rather than harsh.
// Deterministic (seeded PRNG), no dependencies beyond node:zlib. Run: node site/generate-grain.mjs
import {deflateSync, crc32} from 'node:zlib';
import {writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const size = 256;
let seed = 0x4a17c3d5;
// mulberry32
const random = () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// Each scanline: filter byte 0, then one 8-bit gray sample per pixel.
const raw = Buffer.alloc(size * (size + 1));
for (let y = 0; y < size; y++) {
  const row = y * (size + 1);
  for (let x = 0; x < size; x++) {
    const value = Math.round(128 + ((random() + random()) / 2 - 0.5) * 286);
    raw[row + 1 + x] = Math.max(0, Math.min(255, value));
  }
}

const chunk = (type, data) => {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
};
const header = Buffer.alloc(13);
header.writeUInt32BE(size, 0);
header.writeUInt32BE(size, 4);
header[8] = 8; // bit depth
header[9] = 0; // grayscale
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', header),
  chunk('IDAT', deflateSync(raw, {level: 9})),
  chunk('IEND', Buffer.alloc(0))
]);
const target = fileURLToPath(new URL('assets/grain.png', import.meta.url));
writeFileSync(target, png);
console.log(`Wrote ${target} (${png.length} bytes)`);
