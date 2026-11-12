/* Dithers a still image the way the site's stage does: ink, one spot colour and paper through an
   8x8 Bayer matrix. For making stickers, previews and social images without opening a browser.

     node scripts/dither.mjs <in> <out.png> [--spot uv|acid|signal|hot|blood] [--width 1200]
                                            [--cell 3] [--invert] [--bg]

   --width   width of the output in pixels
   --cell    size of one dither cell in output pixels
   --invert  swap light and dark first (for engravings printed black on white)
   --bg      fill transparent areas with ink instead of keeping them transparent */
import sharp from 'sharp';

const SPOTS = { uv: '#b026ff', acid: '#b8ff1f', signal: '#27c4ff', hot: '#ff3bd4', blood: '#e0142c' };
const BAYER = [
  [0, 32, 8, 40, 2, 34, 10, 42], [48, 16, 56, 24, 50, 18, 58, 26], [12, 44, 4, 36, 14, 46, 6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22], [3, 35, 11, 43, 1, 33, 9, 41], [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47, 7, 39, 13, 45, 5, 37], [63, 31, 55, 23, 61, 29, 53, 21],
];
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

export async function dither(input, { spot = 'uv', width = 1200, cell = 3, invert = false, bg = false } = {}) {
  const cols = Math.round(width / cell);
  /* greys and transparency are read separately: sharp drops the alpha channel from a greyscale raw buffer */
  const small = await sharp(input, { limitInputPixels: false }).resize({ width: cols }).ensureAlpha().png().toBuffer();
  let im = sharp(small).flatten({ background: '#000' }).greyscale();
  if (invert) im = im.negate();
  const { data, info } = await im.raw().toBuffer({ resolveWithObject: true });
  const alpha = await sharp(small).extractChannel('alpha').raw().toBuffer();
  const colours = [[0, 0, 0], hex(SPOTS[spot] ?? spot), [255, 255, 255]];
  const out = Buffer.alloc(info.width * info.height * 4);
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    const i = (y * info.width + x) * info.channels, o = (y * info.width + x) * 4;
    const a = alpha[y * info.width + x];
    if (a < 128) { if (bg) out[o + 3] = 255; continue; }
    /* the same curve as the shader: smoothstep(.04, .96), then three levels */
    const t = Math.min(1, Math.max(0, (data[i] / 255 - 0.04) / 0.92)), l = t * t * (3 - 2 * t);
    const lv = Math.min(2, Math.max(0, Math.floor(l * 2 + (BAYER[y & 7][x & 7] / 64) * 0.98 + 0.01)));
    out[o] = colours[lv][0]; out[o + 1] = colours[lv][1]; out[o + 2] = colours[lv][2]; out[o + 3] = 255;
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
    .resize({ width: info.width * cell, kernel: 'nearest' }).png({ compressionLevel: 9 });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2), opt = {};
  const files = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--invert') opt.invert = true;
    else if (args[i] === '--bg') opt.bg = true;
    else if (args[i].startsWith('--')) { const v = args[++i]; opt[args[i - 1].slice(2)] = isNaN(Number(v)) ? v : Number(v); }
    else files.push(args[i]);
  }
  if (files.length !== 2) throw new Error('usage: dither.mjs <in> <out.png> [--spot name] [--width px] [--cell px] [--invert] [--bg]');
  await (await dither(files[0], opt)).toFile(files[1]);
  console.log(files[1]);
}
