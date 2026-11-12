/* Builds a link-preview image for every blog post: public/og/<post>.png, 1200x630.
   The title over the rings and the face, dithered like the site, in a colour picked from the post's name.
   Run it after adding or retitling a post: pnpm og

   The lettering uses a font installed on this computer, so the images are made here and committed
   rather than made on the server at build time. */
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dither } from './dither.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const posts = path.join(here, '../src/content/notes');
const out = path.join(here, '../public/og');
fs.mkdirSync(out, { recursive: true });

const W = 1200, H = 630, SPOTS = ['uv', 'acid', 'signal', 'hot', 'blood'];
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* Break the title into lines of at most `max` characters */
function wrap(text, max) {
  const lines = [''];
  for (const word of text.split(/\s+/)) {
    const last = lines[lines.length - 1];
    if (last && (last + ' ' + word).length > max) lines.push(word);
    else lines[lines.length - 1] = last ? `${last} ${word}` : word;
  }
  return lines;
}

function card(title) {
  let size = 76, lines = wrap(title, 17);
  if (lines.length > 4) { size = 60; lines = wrap(title, 22); }
  const cx = 930, cy = 300, lh = size * 1.08, top = H / 2 - ((lines.length - 1) * lh) / 2 + 24;
  let rings = '';
  for (let i = 1; i < 14; i++) rings += `<circle cx="${cx}" cy="${cy}" r="${i * 62}" fill="none" stroke="#fff" stroke-opacity="${(0.55 * (1 - i / 14)).toFixed(2)}" stroke-width="24"/>`;
  const text = lines.map((l, i) => `<text x="72" y="${top + i * lh}" font-size="${size}">${esc(l)}</text>`).join('');
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs><radialGradient id="g" cx="0.3" cy="0.28" r="0.9"><stop offset="0" stop-color="#cfcfcf"/><stop offset="0.35" stop-color="#6a6a6a"/><stop offset="1" stop-color="#2a2a2a"/></radialGradient></defs>
    <rect width="${W}" height="${H}" fill="#000"/>
    ${rings}
    <circle cx="${cx}" cy="${cy + 40}" r="190" fill="url(#g)" stroke="#000" stroke-width="24"/>
    <circle cx="${cx - 61}" cy="${cy + 2}" r="19" fill="#000"/><circle cx="${cx + 34}" cy="${cy - 6}" r="19" fill="#000"/>
    <path d="M${cx - 148} ${cy + 144} L${cx + 171} ${cy + 63}" stroke="#000" stroke-width="23" stroke-linecap="round"/>
    <rect x="0" y="0" width="760" height="${H}" fill="#000" fill-opacity="0.72"/>
    <rect x="72" y="64" width="150" height="44" fill="#fff"/>
    <g font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-weight="700">
      <text x="86" y="97" font-size="30" fill="#000" letter-spacing="2">onnwee</text>
      <g fill="#fff">${text}</g>
    </g>
  </svg>`);
}

for (const file of fs.readdirSync(posts).filter((f) => f.endsWith('.md')).sort()) {
  const id = file.replace(/\.md$/, '');
  const title = /^title:\s*(.+)$/m.exec(fs.readFileSync(path.join(posts, file), 'utf8'))?.[1].replace(/^["']|["']$/g, '');
  if (!title) { console.warn(`no title in ${file}`); continue; }
  const spot = SPOTS[[...id].reduce((n, ch) => n + ch.charCodeAt(0), 0) % SPOTS.length];
  const grey = await sharp(card(title)).png().toBuffer();
  await (await dither(grey, { spot, width: W, cell: 4, bg: true })).toFile(path.join(out, `${id}.png`));
  console.log(`public/og/${id}.png  ${spot}`);
}
