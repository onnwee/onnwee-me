/* Builds the triptychs and the skull wallpaper in ../onnwee-assets/collage from the prepared greys.
   Three square panels side by side, each dithered in its own colour, the way the stage would.

     node scripts/collage.mjs [path to onnwee-assets] */
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dither } from './dither.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const assets = path.resolve(process.argv[2] ?? path.join(here, '../../onnwee-assets'));
const out = path.join(assets, 'collage');
fs.mkdirSync(out, { recursive: true });

const PANEL = 720, GAP = 24;
/* [file name, [source, colour, where to crop from] x 3] */
const TRIPTYCHS = [
  ['triptych-dead', [['sources/skull-photo.png', 'blood', 'centre'], ['sources/found/catrina.png', 'uv', 'centre'], ['avatar/hooded-skull.png', 'acid', 'centre']]],
  ['triptych-watched', [['sources/found/bertillon-card.png', 'hot', 'right'], ['sprites/capture.png', 'signal', 'top'], ['sources/found/panopticon.png', 'acid', 'bottom']]],
  ['triptych-faceless', [['sprites/gas-mask.png', 'acid', 'centre'], ['sources/found/vesalius.png', 'blood', 'top'], ['avatar/face-grey.png', 'uv', 'centre']]],
];

async function panel([file, spot, position]) {
  const square = await sharp(path.join(assets, file)).resize(PANEL, PANEL, { fit: 'cover', position })
    .flatten({ background: '#000' }).png().toBuffer();
  return (await dither(square, { spot, width: PANEL, cell: 4, bg: true })).toBuffer();
}

for (const [name, panels] of TRIPTYCHS) {
  const tiles = await Promise.all(panels.map(panel));
  await sharp({ create: { width: PANEL * 3 + GAP * 4, height: PANEL + GAP * 2, channels: 3, background: '#000' } })
    .composite(tiles.map((input, i) => ({ input, left: GAP + i * (PANEL + GAP), top: GAP })))
    .png({ compressionLevel: 9 }).toFile(path.join(out, `${name}.png`));
  /* each panel on its own too, for square posts and avatars */
  for (let i = 0; i < tiles.length; i++) await sharp(tiles[i]).toFile(path.join(out, `${name}-${i + 1}.png`));
  console.log(name);
}

/* Wallpaper: hooded skulls in a brick pattern. The tile repeats without a seam. */
const skull = await sharp(path.join(assets, 'avatar/hooded-skull.png')).resize(192, 192, { kernel: 'nearest' }).png().toBuffer();
const tile = await sharp({ create: { width: 480, height: 480, channels: 4, background: '#000' } })
  .composite([{ input: skull, left: 24, top: 24 }, { input: skull, left: 264, top: 264 }]).png().toBuffer();
for (const spot of ['uv', 'acid', 'signal', 'hot', 'blood']) {
  await (await dither(tile, { spot, width: 480, cell: 4, bg: true })).toFile(path.join(out, `skull-wallpaper-${spot}.png`));
}
console.log('skull-wallpaper');
