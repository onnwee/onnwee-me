import { drawDeadFace, drawFace, drawHoodedSkull, drawTombstone } from './face';
import { PIXELS, drawPixel, type PixelName } from './pixels';

/* Scroll sprites: things that belong to a section of the page and pass through the dither as you scroll,
   while the test pattern behind them stays still. Grays decide the color: light areas dither to white,
   midtones to the section color, dark areas to black. Images live in /public/sprites.

   Repetition comes in two kinds. Some of it is uniform: rows, grids, a wallpaper. Some of it is a stamp
   dragged like a brush: the same mark laid down again and again along a path, overlapping itself, pressed
   harder in the middle of the stroke. The uniform kinds are bent by a little maths (a travelling wave,
   two ripples interfering) so they never sit perfectly still or perfectly even.

   Each sprite names the section it belongs to and crosses the middle of the screen when that section's
   middle does, so adding or resizing a section never leaves a sprite stranded behind the film reels. */

type Placement = {
  /** The id of the section this sprite belongs to. */
  in: string;
  /** How far below (or, negative, above) the section's middle it sits, in screen heights. */
  offset?: number;
  /** 1 moves with the page; below 1 lags behind (feels further away); above 1 rushes past. */
  speed?: number;
  /** Size as a fraction of the screen's shorter side. */
  size: number;
};
/** `plate` puts black behind a line drawing, so the rings don't show through and muddy it. */
type ImageSprite = Placement & { kind: 'image'; src: string; x: number; rotate?: number; spin?: number; alpha?: number; plate?: boolean };
type RowSprite = Placement & { kind: 'row'; src: string; count: number; rotate?: number };
type MarqueeSprite = Placement & { kind: 'marquee'; src: string; drift: number; plate?: boolean };
type TextSprite = Placement & { kind: 'text'; text: string; alpha: number; drift?: number };
type CrowdSprite = Placement & { kind: 'crowd'; rows: number };
type CameraSprite = Placement & { kind: 'cameras'; count: number };
type TilesSprite = Placement & { kind: 'tiles'; rows: number; alpha: number; stamp?: Stamp };
type TunnelSprite = Placement & { kind: 'tunnel'; x: number; count: number };
type Stamp = 'face' | 'dead' | 'skull' | PixelName;
/** Brush strokes: `count` strokes of `length` stamps each, wandering along a noise field, spread over `spread` screen heights. */
type StrokesSprite = Placement & { kind: 'strokes'; stamp: Stamp; count: number; length: number; spread: number; alpha?: number;
  /** Distance between stamps, in stamp widths. Under 1 they overlap like beads; at 1 each stands clear. */
  gap?: number };
/** A sunflower head of faces (each one a golden angle on from the last), with a sweep that marks them. */
type BloomSprite = Placement & { kind: 'bloom'; x: number; count: number };
/** One image fanned along an arch, largest in the middle, the two halves mirrored. */
type ArchSprite = Placement & { kind: 'arch'; src: string; count: number };
/** Marks sprayed along a spiral: a few large, many small, turning slowly. */
type SwarmSprite = Placement & { kind: 'swarm'; x: number; count: number; stamps: Stamp[] };
/** Things falling: each column drops its own stamp at its own speed, over `spread` screen heights. */
type RainSprite = Placement & { kind: 'rain'; stamps: Stamp[]; count: number; spread: number };

/* A stable pseudo-random number per face, so the same faces die in the same order every time */
const hash = (a: number, b: number) => { const n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return n - Math.floor(n); };
type Sprite = ImageSprite | RowSprite | MarqueeSprite | TextSprite | CrowdSprite | CameraSprite | TilesSprite | TunnelSprite
  | StrokesSprite | BloomSprite | ArchSprite | SwarmSprite | RainSprite;

/* Smooth noise between 0 and 1: hashed corners of a grid, blended. Nearby points get nearby values,
   which is what makes a stroke wander instead of jitter. */
const ease = (t: number) => t * t * (3 - 2 * t);
function noise(x: number, y: number) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = ease(x - xi), yf = ease(y - yi);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
}
/* The Halton sequence: points that fill a space evenly without lining up, unlike a grid or plain random */
function halton(i: number, base: number) {
  let f = 1, r = 0;
  for (let n = i + 1; n > 0; n = Math.floor(n / base)) { f /= base; r += f * (n % base); }
  return r;
}
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

const SPRITES: Sprite[] = [
  /* Repetition: rows of the same face, turning into headstones the further you scroll */
  { kind: 'crowd', in: 'work', size: 0.075, rows: 4 },
  /* A frozen desktop: windows falling away down a tunnel */
  /* pointers dragged across it, the way a frozen desktop smears the cursor */
  { kind: 'strokes', stamp: 'hand', in: 'notes', offset: 0.1, size: 0.085, count: 4, length: 22, spread: 0.9, gap: 0.95 },
  { kind: 'tunnel', in: 'notes', x: 0.76, size: 0.8, count: 26, speed: 0.9 },
  { kind: 'text', text: 'アンニュイ', in: 'notes', offset: 0.42, size: 0.45, alpha: 0.25, drift: 24 },
  /* Identification: Bertillon's measuring chart and his own police card, 1912 (public domain / CC0) */
  /* Everyone on file: a sunflower of faces behind the card, and a sweep that crosses them off */
  { kind: 'bloom', in: 'file', x: 0.3, offset: 0.3, size: 0.5, count: 170 },
  { kind: 'image', src: '/sprites/bertillon-chart.webp', in: 'file', x: 0.86, offset: -0.2, size: 0.5, rotate: 5, alpha: 0.8 },
  { kind: 'image', src: '/sprites/bertillon-card.webp', in: 'file', x: 0.66, offset: 0.12, size: 0.8, rotate: -4, speed: 1.1 },
  /* Surveillance: Bentham's Panopticon turning slowly, and wall-mounted cameras that follow the pointer */
  /* a wall of eyes behind it, opening and closing in ripples */
  { kind: 'tiles', stamp: 'eye', in: 'tower', offset: -0.05, size: 0.17, rows: 3, alpha: 0.45 },
  { kind: 'image', src: '/sprites/panopticon.webp', in: 'tower', x: 0.72, size: 0.95, spin: 4, speed: 0.9 },
  { kind: 'cameras', in: 'tower', size: 0.22, count: 4 },
  /* Facelessness: one gas-masked soldier, 1918, cut out and repeated (US National Archives 111-SC-4051, public domain, edited) */
  /* a wall of televisions, and things falling out of the sky in front of them */
  { kind: 'tiles', stamp: 'tv', in: 'surf', offset: 0.42, size: 0.17, rows: 3, alpha: 0.55 },
  { kind: 'rain', stamps: ['bomb', 'bomb', 'bolt', 'bomb', 'cloud'], in: 'surf', offset: -0.1, size: 0.17, count: 8, spread: 1.1 },
  { kind: 'arch', src: '/sprites/gas-mask.webp', in: 'surf', size: 0.38, count: 7, speed: 1.2 },
  /* The dead: a wallpaper of hooded skulls that swells and shrinks in ripples, brush strokes of dead faces
     dragged across the page, Posada's skull heap sliding past, Vesalius's skeleton and the Catrina
     (all public domain) */
  { kind: 'tiles', in: 'dead', offset: -0.8, size: 0.1, rows: 5, alpha: 0.4 },
  { kind: 'marquee', src: '/sprites/calavera-electrica.webp', in: 'dead', offset: -0.42, size: 0.42, drift: 26, plate: true },
  { kind: 'image', src: '/sprites/vesalius.webp', in: 'dead', x: 0.26, offset: 0.34, size: 0.56, rotate: 2, plate: true },
  /* drawn below the skull heap, across the skeleton and under the Catrina */
  { kind: 'strokes', stamp: 'dead', in: 'dead', offset: 0.05, size: 0.1, count: 3, length: 60, spread: 0.55 },
  { kind: 'image', src: '/sprites/catrina.webp', in: 'dead', x: 0.66, offset: 0.64, size: 1.05, rotate: -2, plate: true },
  /* Everyone else, sprayed in a spiral around the one who was caught */
  { kind: 'swarm', in: 'contact', x: 0.7, offset: -0.05, size: 0.9, count: 56, speed: 0.85, stamps: ['dead', 'phone', 'heart', 'dead', 'face', 'phone'] },
  /* Juxtaposition: a playful portrait, caught by face recognition (photo by Björn Pierre, Unsplash, edited) */
  { kind: 'image', src: '/sprites/capture.webp', in: 'contact', x: 0.7, offset: -0.05, size: 0.78, rotate: -3, speed: 0.85 },
];

const images = new Map<string, HTMLImageElement>();
for (const s of SPRITES) {
  if ('src' in s && !images.has(s.src)) {
    const im = new Image(); im.src = s.src; images.set(s.src, im);
  }
}
const ready = (src: string) => { const im = images.get(src); return im?.complete && im.naturalWidth ? im : null; };

const homes = new Map<string, HTMLElement | null>();
const home = (id: string) => { if (!homes.has(id)) homes.set(id, document.getElementById(id)); return homes.get(id) ?? null; };

/* Cameras follow the pointer, easing so they turn like motors */
let px = innerWidth / 2, py = innerHeight * 0.8, aimX = px, aimY = py;
addEventListener('pointermove', (e) => { px = e.clientX; py = e.clientY; }, { passive: true });

type View = { k: number; vw: number; vh: number; t: number; font: string };

/* Stamps: each mark drawn once into its own small canvas, then pressed onto the stage as often as needed */
const STAMP_PX = 96;
const stamps = new Map<Stamp, HTMLCanvasElement>();
function stampOf(kind: Stamp) {
  let c = stamps.get(kind);
  if (c) return c;
  c = document.createElement('canvas'); c.width = c.height = STAMP_PX;
  const cx = c.getContext('2d')!, h = STAMP_PX / 2;
  if (kind === 'face') drawFace(cx, h, h, h * 0.82);
  else if (kind === 'dead') drawDeadFace(cx, h, h, h * 0.84);
  else if (kind === 'skull') drawHoodedSkull(cx, h, h, STAMP_PX);
  else if (kind in PIXELS) drawPixel(cx, kind, h, h, STAMP_PX);
  stamps.set(kind, c);
  return c;
}
function press(sx: CanvasRenderingContext2D, kind: Stamp, x: number, y: number, size: number, turn = 0) {
  if (size < 1.5) return;
  /* pixel sprites keep their hard edges however large they are stamped */
  sx.imageSmoothingEnabled = !(kind in PIXELS) && kind !== 'skull';
  if (!turn) { sx.drawImage(stampOf(kind), x - size / 2, y - size / 2, size, size); return; }
  sx.save(); sx.translate(x, y); sx.rotate(turn);
  sx.drawImage(stampOf(kind), -size / 2, -size / 2, size, size);
  sx.restore();
}

/* A wall-mounted security camera. Drawn for the left wall; the right wall mirrors it.
   (x, y) is the wall plate; `aim` is the pointer in the same (mirrored) space. */
function drawCamera(sx: CanvasRenderingContext2D, y: number, L: number, aimX: number, aimY: number, blink: boolean) {
  sx.lineCap = 'butt';
  /* wall plate and arm */
  sx.fillStyle = '#8a8a8a'; sx.strokeStyle = '#000'; sx.lineWidth = L * 0.04;
  sx.beginPath(); sx.rect(0, y - L * 0.32, L * 0.12, L * 0.64); sx.fill(); sx.stroke();
  const jx = L * 0.55, jy = y - L * 0.08;
  sx.strokeStyle = '#000'; sx.lineWidth = L * 0.14;
  sx.beginPath(); sx.moveTo(L * 0.1, y); sx.lineTo(jx, jy); sx.stroke();
  sx.strokeStyle = '#9a9a9a'; sx.lineWidth = L * 0.08;
  sx.beginPath(); sx.moveTo(L * 0.1, y); sx.lineTo(jx, jy); sx.stroke();
  /* the camera pivots on the joint, turning toward the pointer but never back into the wall */
  const ang = Math.max(-1.1, Math.min(1.25, Math.atan2(aimY - jy, aimX - jx)));
  sx.save();
  sx.translate(jx, jy);
  sx.rotate(ang);
  const g = sx.createLinearGradient(0, -L * 0.2, 0, L * 0.2);
  g.addColorStop(0, '#f2f2f2'); g.addColorStop(0.6, '#9a9a9a'); g.addColorStop(1, '#4a4a4a');
  sx.fillStyle = g; sx.strokeStyle = '#000'; sx.lineWidth = L * 0.04;
  sx.beginPath(); sx.rect(-L * 0.15, -L * 0.17, L * 1.05, L * 0.34); sx.fill(); sx.stroke();
  /* sun hood overhanging the lens */
  sx.fillStyle = '#000'; sx.fillRect(-L * 0.2, -L * 0.26, L * 1.22, L * 0.1);
  /* lens */
  sx.fillStyle = '#000'; sx.beginPath(); sx.ellipse(L * 0.92, 0, L * 0.06, L * 0.15, 0, 0, Math.PI * 2); sx.fill();
  sx.fillStyle = '#fff'; sx.beginPath(); sx.arc(L * 0.93, -L * 0.06, L * 0.03, 0, Math.PI * 2); sx.fill();
  /* recording light */
  if (blink) { sx.fillStyle = '#fff'; sx.beginPath(); sx.arc(L * 0.05, L * 0.06, L * 0.035, 0, Math.PI * 2); sx.fill(); }
  sx.restore();
}

/* One window of the tunnel: a blank dialog, title bar and all, in grays */
function drawWindow(sx: CanvasRenderingContext2D, w: number, h: number, shade: number) {
  const g = Math.round(235 - shade * 150);
  sx.fillStyle = `rgb(${g},${g},${g})`; sx.strokeStyle = '#000'; sx.lineWidth = Math.max(1, w * 0.012);
  sx.beginPath(); sx.rect(-w / 2, -h / 2, w, h); sx.fill(); sx.stroke();
  sx.fillStyle = '#000'; sx.fillRect(-w / 2, -h / 2 + h * 0.1, w, Math.max(1, h * 0.012));
  for (let i = 1; i <= 3; i++) sx.fillRect(-w / 2 + w * 0.12, -h / 2 + h * 0.025 * i, w * 0.76, Math.max(0.6, h * 0.006));
  sx.strokeRect(-w / 2 + w * 0.03, -h / 2 + h * 0.022, h * 0.055, h * 0.055);
  /* an OK button nobody can press */
  sx.strokeRect(w * 0.18, h * 0.26, w * 0.24, h * 0.13);
}

export function drawSprites(sx: CanvasRenderingContext2D, v: View) {
  const m = Math.min(v.vw, v.vh), k = v.k;
  aimX += (px - aimX) * 0.08; aimY += (py - aimY) * 0.08;

  for (const s of SPRITES) {
    const el = home(s.in);
    if (!el) continue;
    const box = el.getBoundingClientRect();
    const size = s.size * m;
    const cy = v.vh / 2 + (box.top + box.height / 2 - v.vh / 2) * (s.speed ?? 1) + (s.offset ?? 0) * v.vh;
    const reach = s.kind === 'crowd' ? size * s.rows * 2.5 : s.kind === 'tiles' ? size * s.rows
      : s.kind === 'strokes' || s.kind === 'rain' ? (s.spread / 2 + 0.6) * v.vh : s.kind === 'row' ? size * 2.2
      : s.kind === 'tunnel' || s.kind === 'bloom' || s.kind === 'swarm' ? size * 1.1 : size * 1.8;
    if (cy + reach < 0 || cy - reach > v.vh) continue;
    /* Fields of repeated marks belong to their section: full strength while it holds the screen, fading
       out as it leaves, so two neighbours never pile their patterns on top of each other. */
    const field = s.kind === 'tiles' || s.kind === 'bloom' || s.kind === 'rain' || s.kind === 'swarm';
    const fade = field ? Math.min(1, Math.max(0, 1 - (Math.abs(cy - v.vh / 2) - v.vh * 0.3) / (v.vh * 0.4))) : 1;
    if (fade <= 0) continue;

    if (s.kind === 'text') {
      sx.font = `700 ${size * k}px ${v.font}`;
      sx.textBaseline = 'middle';
      sx.fillStyle = `rgba(255,255,255,${s.alpha})`;
      const tw = sx.measureText(s.text + '　').width;
      for (let x = -((v.t * (s.drift ?? 0)) % tw); x < v.vw * k; x += tw) sx.fillText(s.text, x, cy * k);
      sx.textBaseline = 'alphabetic';
    } else if (s.kind === 'image') {
      const im = ready(s.src);
      if (!im) continue;
      const w = size * k, h = (w * im.naturalHeight) / im.naturalWidth;
      sx.save();
      sx.translate(s.x * v.vw * k, cy * k);
      sx.rotate((((s.rotate ?? 0) + (s.spin ?? 0) * v.t) * Math.PI) / 180);
      if (s.plate) { sx.fillStyle = '#000'; sx.fillRect(-w / 2, -h / 2, w, h); }
      sx.globalAlpha = s.alpha ?? 1;
      sx.drawImage(im, -w / 2, -h / 2, w, h);
      sx.restore();
    } else if (s.kind === 'row') {
      const im = ready(s.src);
      if (!im) continue;
      for (let i = s.count - 1; i >= 0; i--) {
        const f = i / (s.count - 1), scale = 1 - 0.68 * f;
        const w = size * scale * k, h = (w * im.naturalHeight) / im.naturalWidth;
        sx.save();
        sx.translate((0.16 + 0.78 * f) * v.vw * k, (cy - f * v.vh * 0.2) * k);
        sx.rotate(((s.rotate ?? 0) * Math.PI) / 180);
        sx.drawImage(im, -w / 2, -h / 2, w, h);
        sx.restore();
      }
    } else if (s.kind === 'marquee') {
      const im = ready(s.src);
      if (!im) continue;
      const h = size * k, w = (h * im.naturalWidth) / im.naturalHeight;
      if (s.plate) { sx.fillStyle = '#000'; sx.fillRect(0, cy * k - h / 2, v.vw * k, h); }
      for (let x = -((v.t * s.drift * k) % w); x < v.vw * k; x += w) sx.drawImage(im, x, cy * k - h / 2, w, h);
    } else if (s.kind === 'tiles') {
      /* a wallpaper of hooded skulls, every other row shifted half a step. Two ripples spread from two
         points and interfere: where they agree the skulls swell, where they cancel they shrink away. */
      const step = size * 1.45 * k, W = v.vw * k;
      const ax = W * 0.2, ay = (cy - size * 2) * k, bx = W * 0.85, by = (cy + size * 3) * k;
      sx.globalAlpha = s.alpha * fade;
      for (let r = 0; r < s.rows; r++) {
        const y = (cy + (r - (s.rows - 1) / 2) * size * 1.3) * k;
        if (y < -step || y > v.vh * k + step) continue;
        for (let x = (r % 2) * step * 0.5 - step * 0.25; x < W + step; x += step) {
          const d1 = Math.hypot(x - ax, y - ay) / step, d2 = Math.hypot(x - bx, y - by) / step;
          const swell = 0.5 + 0.25 * Math.cos(d1 * 1.1 - v.t * 1.3) + 0.25 * Math.cos(d2 * 0.8 - v.t * 0.9);
          press(sx, s.stamp ?? 'skull', x, y, size * k * (0.35 + 0.95 * swell));
        }
      }
      sx.globalAlpha = 1;
    } else if (s.kind === 'strokes') {
      /* Brush strokes. Each starts somewhere fixed and steps forward, turning with the noise field, laying
         a stamp every half-width so they overlap like beads. Pressure rises and falls along the stroke,
         and the strokes are drawn further the more of the section has scrolled into view. */
      const step = size * (s.gap ?? 0.46) * k, W = v.vw * k, unit = 1 / (m * k);
      const drawn = Math.min(1, Math.max(0, (v.vh * 1.15 - cy) / (v.vh * 0.8)));
      sx.globalAlpha = s.alpha ?? 1;
      for (let j = 0; j < s.count; j++) {
        const back = hash(j, 5) < 0.4; // some strokes run right to left
        let x = (back ? 1.05 - hash(j, 11) * 0.5 : hash(j, 11) * 0.6 - 0.05) * W;
        let ly = (halton(j, 3) - 0.5) * s.spread * v.vh * k; // relative to the sprite, so it scrolls with the page
        const steps = Math.floor(s.length * (0.6 + 0.4 * hash(j, 17)) * drawn);
        const mark: Stamp = s.stamp === 'dead' && hash(j, 29) < 0.22 ? 'face' : s.stamp;
        for (let i = 0; i < steps; i++) {
          const along = i / (s.length * (0.6 + 0.4 * hash(j, 17)));
          const turn = (noise(x * unit * 2.2 + j * 0.37, ly * unit * 2.2 + v.t * 0.04) - 0.5) * 3.4;
          const dir = back ? Math.PI - turn : turn;
          x += Math.cos(dir) * step; ly += Math.sin(dir) * step;
          const pressure = Math.pow(Math.sin(Math.PI * Math.min(1, along)), 0.55) * (0.7 + 0.55 * noise(i * 0.18, j * 7.3));
          press(sx, mark, x, cy * k + ly, size * k * pressure, turn * 0.35);
        }
      }
      sx.globalAlpha = 1;
    } else if (s.kind === 'bloom') {
      /* A sunflower: each face sits a golden angle round from the last and a little further out, which
         packs them evenly with no rows or columns. A sweep turns like a radar hand; the faces just behind
         it are crossed off, more of them the further the page has scrolled. */
      const cx0 = s.x * v.vw * k, cy0 = cy * k, R = size * k;
      const filed = Math.min(1, Math.max(0, (v.vh * 0.95 - cy) / (v.vh * 0.9)));
      const sweep = (v.t * 0.5) % (Math.PI * 2);
      sx.globalAlpha = fade;
      for (let i = s.count - 1; i >= 0; i--) {
        const a = i * GOLDEN_ANGLE + v.t * 0.03, r = R * Math.sqrt((i + 0.5) / s.count);
        const behind = (((sweep - a) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        const dead = behind < Math.PI * 2 * filed * (0.35 + 0.65 * hash(i, 3));
        const sz = R * 0.105 * (0.75 + 0.5 * Math.sqrt(i / s.count)) * (behind < 0.25 ? 1.35 : 1);
        press(sx, dead ? 'dead' : 'face', cx0 + Math.cos(a) * r, cy0 + Math.sin(a) * r, sz, dead ? (hash(i, 9) - 0.5) * 0.8 : 0);
      }
      sx.globalAlpha = 1;
    } else if (s.kind === 'arch') {
      /* One image stamped along an arch, small at the ends and large in the middle, the right half a mirror
         of the left. Drawn from the ends inward so the middle one stands in front. Each bobs a little,
         out of step with its neighbours. */
      const im = ready(s.src);
      if (!im) continue;
      const mid = (s.count - 1) / 2;
      const order = [...Array(s.count).keys()].sort((a, b) => Math.abs(b - mid) - Math.abs(a - mid));
      for (const i of order) {
        const u = i / (s.count - 1), bell = Math.pow(Math.sin(Math.PI * u), 1.6);
        const w = size * (0.3 + 0.7 * bell) * k, h = (w * im.naturalHeight) / im.naturalWidth;
        const x = (0.5 - Math.cos(Math.PI * u) * 0.47) * v.vw * k;
        const y = (cy - bell * v.vh * 0.16 + v.vh * 0.1 + Math.sin(v.t * 1.1 + i * 0.9) * size * 0.025) * k;
        sx.save();
        sx.translate(x, y);
        sx.rotate((u - 0.5) * 0.5);
        if (u > 0.5) sx.scale(-1, 1);
        sx.drawImage(im, -w / 2, -h / 2, w, h);
        sx.restore();
      }
    } else if (s.kind === 'rain') {
      /* Columns placed by a Halton sequence so they never line up. Each falls at its own speed and
         wraps round; the nearer ones are bigger and faster. Bolts don't tumble, bombs sway a little. */
      const band = s.spread * v.vh * k;
      sx.globalAlpha = fade;
      for (let i = 0; i < s.count; i++) {
        const near = 0.45 + 0.75 * hash(i, 21), kind = s.stamps[i % s.stamps.length];
        const fall = (hash(i, 31) + v.t * 0.05 * near * (kind === 'cloud' ? -0.3 : 1)) % 1;
        const y = cy * k + ((fall + 1) % 1 - 0.5) * band;
        const x = halton(i, 2) * v.vw * k + Math.sin(v.t * 0.8 + i) * size * 0.1 * k;
        press(sx, kind, x, y, size * k * near, kind === 'bomb' ? Math.sin(v.t * 1.2 + i * 2.1) * 0.18 : 0);
      }
      sx.globalAlpha = 1;
    } else if (s.kind === 'swarm') {
      /* A spray: marks placed along a widening spiral by a Halton sequence, pushed off the line by a
         second one. Sizes follow a power law, so there are a few big ones and a great many small. */
      const cx0 = s.x * v.vw * k, cy0 = cy * k, R = size * k;
      sx.globalAlpha = fade;
      for (let i = 0; i < s.count; i++) {
        const u = halton(i, 2), w = halton(i, 3);
        const a = u * Math.PI * 5 + v.t * 0.07 + Math.sin(v.t * 0.3 + i) * 0.04;
        const r = R * (0.34 + 0.7 * u) * (1 + (w - 0.5) * 0.5);
        const sz = Math.min(R * 0.16, (R * 0.02) / (0.12 + w * w));
        press(sx, s.stamps[Math.floor(hash(i, 13) * s.stamps.length)], cx0 + Math.cos(a) * r, cy0 + Math.sin(a) * r * 0.8, sz, (hash(i, 7) - 0.5) * 1.2);
      }
      sx.globalAlpha = 1;
    } else if (s.kind === 'tunnel') {
      /* nested windows, each smaller and further along a bend, slowly falling away */
      const W = size * 1.25 * k, H = size * 0.85 * k, fall = (v.t * 0.12) % (1 / s.count);
      for (let i = 0; i < s.count; i++) {
        const f = i / s.count + fall, scale = Math.pow(1 - f, 1.7);
        if (scale < 0.02) continue;
        sx.save();
        sx.translate((s.x - Math.sin(f * 2.6) * 0.3) * v.vw * k, (cy - f * f * size * 0.5) * k);
        sx.rotate(f * -0.9);
        drawWindow(sx, W * scale, H * scale, f);
        sx.restore();
      }
    } else if (s.kind === 'crowd') {
      /* 0 while the crowd rises into view, 1 by the time it reaches the top: that share are headstones */
      const dead = Math.min(1, Math.max(0, (v.vh * 1.05 - cy) / (v.vh * 0.95)));
      for (let r = 0; r < s.rows; r++) {
        const depth = (s.rows - 1 - r) / Math.max(1, s.rows - 1); // 1 = back row
        const R0 = size * (1 - 0.55 * depth) * k;
        const y0 = (cy - depth * size * s.rows * 1.5) * k;
        const step = R0 * 2.35, n = Math.ceil((v.vw * k) / step) + 1;
        const offset = (r % 2) * step * 0.5 - step * 0.25;
        for (let i = 0; i < n; i++) {
          const x = offset + i * step;
          /* a wave travels along each row, each row a beat behind the one in front, and no two heads
             are quite the same size */
          const y = y0 + Math.sin(i * 0.55 + r * 1.3 - v.t * 1.4) * R0 * 0.22;
          const R = R0 * (0.86 + 0.28 * noise(i * 0.4 + r * 3.1, r * 0.9 + v.t * 0.05));
          if (hash(r, i) < dead) {
            /* every stone and every carving leans a little, never straight: 3–8° and 6–17°, either way */
            const lean = (hash(i, r) < 0.5 ? -1 : 1) * (0.05 + hash(i + 7, r) * 0.09);
            const turn = (hash(r + 3, i) < 0.5 ? -1 : 1) * (0.1 + hash(r, i + 5) * 0.2);
            drawTombstone(sx, x, y, R, lean, turn);
          }
          else drawFace(sx, x, y, R);
        }
      }
    } else if (s.kind === 'cameras') {
      const L = size * k, W = v.vw * k, blink = Math.floor(v.t * 1.5) % 2 === 0;
      for (let i = 0; i < s.count; i++) {
        const right = i % 2 === 1;
        const y = (cy + (i - (s.count - 1) / 2) * size * 0.9) * k;
        sx.save();
        if (right) { sx.translate(W, 0); sx.scale(-1, 1); }
        drawCamera(sx, y, L, right ? W - aimX * k : aimX * k, aimY * k, blink);
        sx.restore();
      }
    }
  }
}
