import { reduceMotion } from './motion';

/* The intro: about ten seconds of fast cuts on the first page of a visit, and again whenever someone
   presses "Replay intro". The stage draws the shots (see intro-scene.ts); this module keeps time,
   handles skipping and runs the HTML dialog cascade. Any click, tap, key or scroll ends it.
   Reduced motion never sees it. */

export const INTRO_LENGTH = 8.3; // in scene seconds, the timeline intro-scene.ts is cut to
/** Playback speed: 0.8 plays the whole intro at 80%, so it runs about 10.4 real seconds. */
const SPEED = 0.8;
const SKIP_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const;

const root = document.documentElement;
const overlay = document.getElementById('intro');
const box = overlay?.querySelector('.intro-dialogs') ?? null;
let start = performance.now();
let done = true;
let frozenAt = -1;
let endTimer = 0;

/** Seconds since the intro started, or -1 when it is not playing. */
export const introTime = () => (done ? -1 : frozenAt >= 0 ? frozenAt : ((performance.now() - start) / 1000) * SPEED);
export const introFinished = () => done;

function finish() {
  if (done) return;
  done = true;
  clearTimeout(endTimer);
  for (const e of SKIP_EVENTS) removeEventListener(e, finish);
  root.classList.remove('intro');
  box?.replaceChildren();
  try { sessionStorage.setItem('booted', '1'); } catch {}
  dispatchEvent(new Event('boot:done'));
}

const WARNINGS = ['Signal lost.', 'Somebody is watching.', 'Consent assumed.', 'Your face has been saved.', 'Do not adjust your set.'];

/* Shot 6: warning dialogs pile up in a cascade (one every 55 ms from 3.75 s), then vanish on the cut */
function syncDialogs() {
  if (done || !box) return;
  const it = introTime();
  const want = it >= 3.75 && it < 4.65 ? Math.min(16, Math.floor((it - 3.75) / 0.055) + 1) : 0;
  while (box.children.length > want) box.lastElementChild?.remove();
  while (box.children.length < want) {
    const i = box.children.length;
    const d = document.createElement('div');
    d.className = 'win intro-dialog';
    d.style.left = `calc(8% + ${i * 22}px)`;
    d.style.top = `calc(12% + ${i * 19}px)`;
    d.innerHTML = `<div class="titlebar"><span class="box"></span><span class="name">warning</span></div>
      <div class="win-body"><p>${WARNINGS[i % WARNINGS.length]}</p><div class="buttons"><span class="btn default">OK</span></div></div>`;
    box.append(d);
  }
  requestAnimationFrame(syncDialogs);
}

function begin() {
  done = false;
  frozenAt = -1;
  start = performance.now();
  document.fonts?.load('80px Creepster');
  document.fonts?.load('40px "IM Fell English SC"');
  endTimer = window.setTimeout(finish, (INTRO_LENGTH / SPEED) * 1000);
  for (const e of SKIP_EVENTS) addEventListener(e, finish, { passive: true });
  syncDialogs();
}

/** Plays the intro again from the start. */
export function playIntro() {
  if (reduceMotion || !overlay || !done) return;
  scrollTo({ top: 0, behavior: 'instant' });
  root.classList.add('intro');
  begin();
}

if (overlay && root.classList.contains('intro') && !reduceMotion) begin();
else { root.classList.remove('intro'); dispatchEvent(new Event('boot:done')); }

/* The replay button. It is wired on click, after its own pointerdown has passed,
   so pressing it does not immediately skip the intro it starts. */
document.getElementById('replay-intro')?.addEventListener('click', playIntro);

/* Development only: freeze the intro at a given second to inspect a shot */
if (import.meta.env.DEV) (window as unknown as { __introAt: (t: number) => void }).__introAt = (t) => { clearTimeout(endTimer); frozenAt = t; };
