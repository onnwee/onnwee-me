/* Exports the pixel sprites in src/scripts/pixels.ts as PNGs: grey (as the site draws them) and
   dithered in each site colour, 768 px, transparent, into ../onnwee-assets/sprites/pixel.
   It also checks that every sprite is a full 16×16 grid.

     node scripts/pixel-sprites.mjs [path to onnwee-assets] */
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PIXELS, PIXEL_PALETTE } from '../src/scripts/pixels.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(path.resolve(process.argv[2] ?? path.join(here, '../../onnwee-assets')), 'sprites/pixel');
fs.mkdirSync(out, { recursive: true });

const SPOTS = { uv: '#b026ff', acid: '#b8ff1f', signal: '#27c4ff', hot: '#ff3bd4', blood: '#e0142c' };
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

for (const [name, rows] of Object.entries(PIXELS)) {
  if (rows.length !== 16 || rows.some((r) => r.length !== 16)) throw new Error(`${name} is not 16×16: ${rows.map((r) => r.length)}`);
  const paint = (colour) => {
    const buf = Buffer.alloc(16 * 16 * 4);
    rows.forEach((row, y) => [...row].forEach((ch, x) => {
      const c = PIXEL_PALETTE[ch];
      if (!c) return;
      const [r, g, b] = colour(ch, hex(c));
      buf.set([r, g, b, 255], (y * 16 + x) * 4);
    }));
    return sharp(buf, { raw: { width: 16, height: 16, channels: 4 } }).resize(768, 768, { kernel: 'nearest' }).png({ compressionLevel: 9 });
  };
  await paint((_, rgb) => rgb).toFile(path.join(out, `${name}.png`));
  /* flat colours, as the dither would settle them: white stays, greys take the colour, black stays */
  for (const [spot, c] of Object.entries(SPOTS)) {
    await paint((ch) => (ch === 'w' ? [255, 255, 255] : ch === '#' ? [0, 0, 0] : hex(c))).toFile(path.join(out, `${name}-${spot}.png`));
  }
  console.log(name);
}
