/* Builds the photo sprites in public/sprites from the masters and found images in ../onnwee-assets/sources.
   Run: node scripts/build-sprites.mjs [path to the sources folder]

   Both masters are cutouts with transparent backgrounds, and the sprites keep that transparency,
   so the test pattern shows around them. Everything is grey: the dither on the site decides the
   colour (light areas go white, midtones the section colour, dark areas black). */
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const sources = path.resolve(process.argv[2] ?? path.join(here, '../../onnwee-assets/sources'));
const out = path.join(here, '../public/sprites');

/* Gas mask: the owner's cutout of the 1918 soldier with modern filter canisters. Trim the empty
   margin, then stretch the greys so the helmet lands in the midtones and the lenses go white. */
async function gasMask() {
  const trimmed = await sharp(path.join(sources, 'gas-mask.png')).trim({ threshold: 0 }).toBuffer();
  const file = path.join(out, 'gas-mask.webp');
  await sharp(trimmed)
    .extend({ top: 6, bottom: 6, left: 6, right: 6, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .greyscale()
    .normalise({ lower: 2, upper: 98 })
    .webp({ quality: 84, alphaQuality: 90 })
    .toFile(file);
  return file;
}

/* Capture: the owner's cutout of the portrait, caught by face recognition. The overlay is drawn on
   first, then a few bands are slipped sideways so the overlay tears along with the photo. */
const W = 720, H = 900;
const POINTS = {
  eyeL: [216, 324], eyeR: [508, 302], nose: [373, 410], mouthL: [320, 531], mouthR: [486, 504], chin: [396, 684],
};
const LINKS = [
  ['eyeL', 'eyeR'], ['eyeL', 'nose'], ['eyeR', 'nose'], ['nose', 'mouthL'], ['nose', 'mouthR'],
  ['mouthL', 'mouthR'], ['mouthL', 'chin'], ['mouthR', 'chin'],
];
/* [top, height, shift]: rows that slip sideways */
const BANDS = [[118, 26, 34], [286, 14, -22], [452, 20, -46], [612, 12, 28], [716, 10, -18]];

function overlay() {
  const box = { x: 56, y: 84, w: 608, h: 620 }, arm = 74;
  const corner = (cx, cy, dx, dy) => `M${cx + dx * arm},${cy} L${cx},${cy} L${cx},${cy + dy * arm}`;
  const brackets = [
    corner(box.x, box.y, 1, 1), corner(box.x + box.w, box.y, -1, 1),
    corner(box.x, box.y + box.h, 1, -1), corner(box.x + box.w, box.y + box.h, -1, -1),
  ].join(' ');
  const mesh = LINKS.map(([a, b]) => `M${POINTS[a]} L${POINTS[b]}`).join(' ');
  const nodes = Object.values(POINTS)
    .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9" fill="#fff" stroke="#000" stroke-width="4"/>`).join('');
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <g fill="none" stroke-linecap="square" stroke-linejoin="miter">
      <path d="${brackets}" stroke="#000" stroke-width="16"/>
      <path d="${brackets}" stroke="#fff" stroke-width="8"/>
      <path d="${mesh}" stroke="#000" stroke-width="9"/>
      <path d="${mesh}" stroke="#fff" stroke-width="4"/>
    </g>
    ${nodes}
    <rect x="40" y="736" width="430" height="152" fill="#000"/>
    <g font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-weight="700" fill="#fff">
      <text x="58" y="790" font-size="52" letter-spacing="1">ID: UNKNOWN</text>
      <text x="58" y="830" font-size="32" letter-spacing="1">MATCH 99.1%</text>
      <text x="58" y="870" font-size="32" letter-spacing="1">CONSENT: ASSUMED</text>
    </g>
  </svg>`);
}

async function capture() {
  const portrait = await sharp(path.join(sources, 'bjorn-pierre-OI_Nu0TQPAw-unsplash.png'), { limitInputPixels: false })
    .resize(W, H, { fit: 'cover' })
    .greyscale()
    .normalise({ lower: 1, upper: 99 })
    .linear(1.08, 0)
    .toColourspace('srgb')
    .ensureAlpha()
    .png()
    .toBuffer();
  const { data, info } = await sharp(portrait)
    .composite([{ input: overlay() }])
    .raw()
    .toBuffer({ resolveWithObject: true });

  const row = info.width * info.channels;
  for (const [top, height, shift] of BANDS) {
    for (let y = top; y < top + height; y++) {
      const line = Buffer.from(data.subarray(y * row, (y + 1) * row));
      data.fill(0, y * row, (y + 1) * row);
      const px = Math.abs(shift) * info.channels;
      if (shift > 0) line.copy(data, y * row + px, 0, row - px);
      else line.copy(data, y * row, px, row);
    }
  }
  const file = path.join(out, 'capture.webp');
  await sharp(data, { raw: info }).webp({ quality: 84, alphaQuality: 90 }).toFile(file);
  return file;
}

/* Found images (see ../onnwee-assets/sources/CREDITS.md), prepared as greys in sources/found.
   Engravings there are already inverted to white lines on black. For those, the grey becomes the
   transparency, so only the lines are drawn and the test pattern shows between them. */
const FOUND = [
  /* [name, width, line art, contrast: above 1 thins dense hatching so it doesn't dither to solid white] */
  ['bertillon-card', 720, false], ['bertillon-chart', 520, true], ['panopticon', 760, true],
  ['catrina', 760, true, 1.3], ['calavera-electrica', 1000, true, 2.2], ['vesalius', 420, true],
];
async function found([name, width, lines, contrast = 1]) {
  const file = path.join(out, `${name}.webp`);
  const grey = sharp(path.join(sources, 'found', `${name}.png`)).resize({ width }).greyscale();
  if (!lines) {
    /* a card: keep it solid, with a white edge like a print */
    await grey.extend({ top: 10, bottom: 10, left: 10, right: 10, background: '#fff' }).webp({ quality: 82 }).toFile(file);
    return file;
  }
  const { data, info } = await grey.raw().toBuffer({ resolveWithObject: true });
  const rgba = Buffer.alloc(info.width * info.height * 4, 255);
  for (let i = 0; i < info.width * info.height; i++) rgba[i * 4 + 3] = Math.min(255, Math.pow(data[i * info.channels] / 255, contrast) * 255 * 1.25);
  await sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } }).webp({ quality: 82, alphaQuality: 85 }).toFile(file);
  return file;
}

const built = [await gasMask(), await capture()];
for (const job of FOUND) built.push(await found(job));
for (const file of built) {
  const m = await sharp(file).metadata();
  console.log(`${path.relative(process.cwd(), file)}  ${m.width}x${m.height}`);
}
