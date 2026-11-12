/* Records the site frame by frame with a paused clock, so every frame is drawn in full however slow
   the capture is. Needs the built site served on port 4391 (pnpm build, then pnpm preview --port 4391 --host 127.0.0.1)
   and Playwright, which is not a dependency of the site:

     PLAYWRIGHT=/path/to/node_modules/playwright-core node scripts/record.mjs <job> <out dir> [url]

   Jobs:
     intro           the intro, 1920x1080, 30 fps, as PNG frames
     intro-vertical  the same at 1080x1920
     stills          one 1920x1080 PNG of the background at each part of the page, content hidden
     shot <at> <name> [w h scale]   one still at <at>: a section such as '#dead', or a scroll progress
                                  from 0 to 1; 390 844 3 gives a phone screen
     scroll [seconds]         the background scrolled from top to bottom, content hidden, as PNG frames

   Turn the frames into video with ffmpeg; see the commands in onnwee-assets/README.txt. */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const pw = process.env.PLAYWRIGHT;
if (!pw) throw new Error('Set PLAYWRIGHT to a playwright-core folder');
const { chromium } = createRequire(import.meta.url)(pw);

const [job, outDir, ...rest] = process.argv.slice(2);
if (!job || !outDir) throw new Error('usage: record.mjs <job> <out dir> [url]');
fs.mkdirSync(outDir, { recursive: true });

const FPS = 30;
const INTRO_SECONDS = 8.3 / 0.8; // INTRO_LENGTH / SPEED in src/scripts/intro.ts
/* [file name, the section whose middle is scrolled to the middle of the screen, nudge in screen heights] */
const STILLS = [
  ['01-hero', '#hero', -1], ['02-crowd', '#work', 0], ['03-tunnel', '#notes', 0], ['04-on-file', '#file', 0],
  ['05-watchtower', '#tower', 0], ['06-gas-masks', '#surf', 0], ['07-roll-call', '#dead', 0], ['08-capture', '#contact', 1],
];

async function open(width, height, url, booted, scale = 1) {
  const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: scale });
  if (booted) await page.addInitScript(() => { try { sessionStorage.setItem('booted', '1'); } catch {} });
  /* keep hold of the page's film clips, so a recording can wait for each seek to land */
  await page.addInitScript(() => {
    window.__clips = [];
    const create = document.createElement.bind(document);
    document.createElement = (tag, options) => { const el = create(tag, options); if (tag === 'video') window.__clips.push(el); return el; };
  });
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.clock.pauseAt(new Date('2026-01-01T00:01:00Z'));
  return { browser, page };
}

async function intro(width, height, url) {
  const { browser, page } = await open(width, height, url, true);
  await page.addStyleTag({ content: '.intro-skip { display: none !important; }' });
  /* load the intro's fonts before the first frame, then start it from zero */
  await page.evaluate(() => Promise.all([document.fonts.load('80px Creepster'), document.fonts.load('40px "IM Fell English SC"')]));
  await page.evaluate(() => document.getElementById('replay-intro').click());
  const frames = Math.ceil(INTRO_SECONDS * FPS) + 8;
  for (let i = 0; i < frames; i++) {
    await page.clock.runFor(1000 / FPS);
    await page.screenshot({ path: path.join(outDir, `${String(i).padStart(4, '0')}.png`) });
  }
  await browser.close();
  console.log(`${frames} frames in ${outDir}`);
}

/* `where` is a section selector or a scroll progress from 0 to 1 */
async function still(page, where, file, nudge = 0) {
  await page.evaluate(([w, n]) => {
    const max = document.documentElement.scrollHeight - innerHeight;
    const el = isNaN(Number(w)) ? document.querySelector(w) : null;
    const r = el?.getBoundingClientRect();
    const top = r ? r.top + scrollY + r.height / 2 - innerHeight / 2 + n * innerHeight : Number(w) * max;
    scrollTo({ top: Math.min(max, Math.max(0, top)), behavior: 'instant' });
  }, [where, nudge]);
  /* let the channel-change static and the glitch die down */
  await page.clock.runFor(2500);
  await page.screenshot({ path: file });
  console.log(file);
}

const HIDE = 'main, .dock, .osd, .trail { visibility: hidden !important; }';

if (job === 'intro') await intro(1920, 1080, rest[0] ?? 'http://127.0.0.1:4391/');
else if (job === 'intro-vertical') await intro(1080, 1920, rest[0] ?? 'http://127.0.0.1:4391/');
else if (job === 'stills') {
  const { browser, page } = await open(1920, 1080, rest[0] ?? 'http://127.0.0.1:4391/', true);
  await page.addStyleTag({ content: HIDE });
  for (const [name, where, nudge] of STILLS) await still(page, where, path.join(outDir, `${name}.png`), nudge);
  await browser.close();
} else if (job === 'shot') {
  const [at, name, w = '1920', h = '1080', scale = '1', url = 'http://127.0.0.1:4391/'] = rest;
  const { browser, page } = await open(Number(w), Number(h), url, true, Number(scale));
  await page.addStyleTag({ content: HIDE });
  await still(page, at, path.join(outDir, `${name}.png`));
  await browser.close();
} else if (job === 'scroll') {
  const seconds = Number(rest[0] ?? 24);
  const { browser, page } = await open(1920, 1080, rest[1] ?? 'http://127.0.0.1:4391/', true);
  await page.addStyleTag({ content: HIDE });
  /* the film clips load as they come near, so pass over the page once to load them all */
  for (let i = 0; i <= 40; i++) {
    await page.evaluate((p) => scrollTo({ top: p * (document.documentElement.scrollHeight - innerHeight), behavior: 'instant' }), i / 40);
    await page.clock.runFor(100);
    await page.waitForTimeout(150);
  }
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  await page.clock.runFor(1500);
  const frames = Math.round(seconds * FPS);
  for (let i = 0; i < frames; i++) {
    /* ease in and out so the scroll starts and ends gently */
    const f = i / (frames - 1), e = f * f * (3 - 2 * f);
    await page.evaluate((p) => scrollTo({ top: p * (document.documentElement.scrollHeight - innerHeight), behavior: 'instant' }), e);
    /* one step to start the seek, a real wait for it to land, one step to draw it */
    await page.clock.runFor(1000 / FPS / 2);
    await page.waitForFunction(() => window.__clips.every((v) => !v.seeking), null, { timeout: 5000 }).catch(() => {});
    await page.clock.runFor(1000 / FPS / 2);
    await page.screenshot({ path: path.join(outDir, `${String(i).padStart(4, '0')}.png`) });
  }
  await browser.close();
  console.log(`${frames} frames in ${outDir}`);
} else throw new Error(`unknown job ${job}`);
