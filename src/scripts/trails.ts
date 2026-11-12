import { reduceMotion } from './motion';

/* Window trails: each window leaves copies where it was a frame ago, two frames ago and so on,
   like a frozen OS that never redraws. */
/* Fewer copies on a small screen, where the windows fill the width and the trail is mostly hidden */
const GHOSTS = innerWidth < 700 ? 6 : 12;
const FRAMES_PER_GHOST = 1;
const sets: HTMLElement[][] = [];
const history: number[] = [];

if (!reduceMotion) {
  document.querySelectorAll<HTMLElement>('.slot').forEach((slot) => {
    const win = slot.querySelector<HTMLElement>('.win');
    /* pinned windows stay put while the page scrolls, so a trail behind them would be wrong */
    if (!win || slot.closest('[data-no-trail]')) return;
    const set: HTMLElement[] = [];
    for (let k = 1; k <= GHOSTS; k++) {
      const g = win.cloneNode(true) as HTMLElement;
      g.classList.add('ghost');
      g.setAttribute('aria-hidden', 'true');
      g.inert = true;
      g.removeAttribute('role');
      g.removeAttribute('aria-labelledby');
      g.querySelectorAll('[id]').forEach((e) => e.removeAttribute('id'));
      /* a ghost is only glimpsed: drop the parts that cost the most to copy */
      g.querySelectorAll('svg, .ghost').forEach((e) => e.remove());
      g.style.zIndex = String(-k);
      slot.insertBefore(g, win);
      set.push(g);
    }
    sets.push(set);
  });
}

const snap = (v: number) => Math.round(v / 2) * 2;

export function updateTrails() {
  if (!sets.length) return;
  history.unshift(scrollY);
  history.length = Math.min(history.length, GHOSTS * FRAMES_PER_GHOST + 1);
  const speed = Math.abs(history[0] - (history[1] ?? history[0]));

  for (const set of sets) {
    set.forEach((g, i) => {
      const k = i + 1;
      const past = history[Math.min(history.length - 1, k * FRAMES_PER_GHOST)];
      const dy = Math.max(-12 * k, Math.min(12 * k, history[0] - past));
      const jitter = speed > 2 ? (Math.random() - 0.5) * Math.min(8, speed * 0.2) : 0;
      const x = snap(dy * 0.3 + jitter);
      const y = snap(dy);
      const scale = dy === 0 ? 1 : 1 - k * 0.004;
      g.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    });
  }
}
