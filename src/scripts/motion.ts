/* Whether the page should hold still: the system asks for reduced motion, or the visitor pressed
   "Motion off" in the corner. The choice is remembered in this browser. Changing it reloads the page,
   because everything that moves reads this once when it starts. */
const KEY = 'motion';
let stored = '';
try { stored = localStorage.getItem(KEY) ?? ''; } catch {}
const system = matchMedia('(prefers-reduced-motion: reduce)').matches;

export const reduceMotion = stored ? stored === 'off' : system;

const btn = document.getElementById('motion-toggle');
if (btn) {
  btn.textContent = reduceMotion ? 'Motion off' : 'Motion on';
  btn.setAttribute('aria-pressed', String(!reduceMotion));
  btn.addEventListener('click', () => {
    try { localStorage.setItem(KEY, reduceMotion ? 'on' : 'off'); } catch {}
    location.reload();
  });
}
