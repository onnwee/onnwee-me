import { reduceMotion } from './motion';

/* Depth: as the page scrolls, the section heads and windows move a little faster than it, the pictures
   on the stage at their own speeds (see sprites.ts), and the test pattern not at all, so the page reads
   as layers. Every piece in front moves by the same rule, measured from the middle of the screen, so the
   gaps between them only ever grow and nothing in front slides into anything else. Past a screen
   height away they stop gaining, and nothing ever sits lower than it will at the very bottom of the
   page, so the moved pieces never make the page taller. */
const DEPTH = 0.12;
const items: { el: HTMLElement; mid: number; cap: number; ty: number }[] = [];
if (!reduceMotion && document.getElementById('hero')) {
  for (const sec of document.querySelectorAll<HTMLElement>('main > section[data-spot]:not(.hero):not(.reel)')) {
    for (const el of sec.querySelectorAll<HTMLElement>(':scope > .head, :scope > .slot, :scope > .stack > .slot, :scope > .more, :scope > .footnote')) {
      items.push({ el, mid: 0, cap: 0, ty: NaN });
    }
  }
}
let stale = true;
if (items.length) {
  new ResizeObserver(() => { stale = true; }).observe(document.body);
  addEventListener('resize', () => { stale = true; });
}
const shift = (d: number, h: number) => DEPTH * Math.max(-h, Math.min(h, d));

/* offsetTop ignores transforms, so moving the pieces never changes where they are measured from */
function measure() {
  const main = document.querySelector('main')!;
  let bottom = main.offsetHeight;
  for (let e: HTMLElement | null = main; e; e = e.offsetParent as HTMLElement | null) bottom += e.offsetTop;
  const last = Math.max(0, bottom - innerHeight) + innerHeight / 2; // the middle of the screen at the bottom of the page
  for (const it of items) {
    let y = 0;
    for (let e: HTMLElement | null = it.el; e; e = e.offsetParent as HTMLElement | null) y += e.offsetTop;
    it.mid = y + it.el.offsetHeight / 2;
    it.cap = shift(it.mid - last, innerHeight);
  }
  stale = false;
}

export function updateDepth() {
  if (!items.length) return;
  if (stale) measure();
  const c = scrollY + innerHeight / 2, h = innerHeight;
  for (const it of items) {
    const ty = Math.round(Math.min(it.cap, shift(it.mid - c, h)));
    if (ty !== it.ty) { it.ty = ty; it.el.style.transform = ty ? `translate3d(0, ${ty}px, 0)` : ''; }
  }
}
