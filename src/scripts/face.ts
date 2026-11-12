/* The mark and the things it turns into. Everything is drawn in grays so the dither decides the color:
   light areas become white, midtones the section color, dark areas black. */

export function drawFace(sx: CanvasRenderingContext2D, bx: number, by: number, R: number, blink = 1) {
  const g = sx.createRadialGradient(bx - R * 0.4, by - R * 0.45, R * 0.05, bx, by, R);
  g.addColorStop(0, '#cfcfcf'); g.addColorStop(0.35, '#6a6a6a'); g.addColorStop(1, '#2a2a2a');
  sx.fillStyle = g; sx.beginPath(); sx.arc(bx, by, R, 0, Math.PI * 2); sx.fill();
  sx.lineCap = 'round';
  sx.strokeStyle = '#fff'; sx.lineWidth = R * 0.05; sx.beginPath(); sx.arc(bx - R * 0.06, by, R * 1.07, 0, Math.PI * 2); sx.stroke();
  sx.strokeStyle = '#000'; sx.lineWidth = R * 0.13; sx.beginPath(); sx.arc(bx, by, R, 0, Math.PI * 2); sx.stroke();
  sx.fillStyle = '#000';
  for (const [ex, ey] of [[-0.32, -0.2], [0.18, -0.24]]) {
    sx.beginPath(); sx.ellipse(bx + ex * R, by + ey * R, R * 0.1, R * 0.1 * blink, 0, 0, Math.PI * 2); sx.fill();
  }
  sx.lineWidth = R * 0.12;
  sx.beginPath(); sx.moveTo(bx - R * 0.78, by + R * 0.55); sx.lineTo(bx + R * 0.9, by + R * 0.12); sx.stroke();
}

/* A hooded skull in 24×24 pixel art */
const HOOD = [
  '........########........',
  '......##hhhhhhhh##......',
  '.....#Hhhhhhhhhhhh#.....',
  '....#HHhhhhhhhhhhhh#....',
  '...#HHhhhhhhhhhhhhhh#...',
  '...#Hhhh########hhhh#...',
  '..#Hhh##wwwwwwww##hhh#..',
  '..#Hh#wwwwwwwwwwww#hh#..',
  '..#Hh#wwwwwwwwwwgw#hh#..',
  '.#Hhh#wwkkkwwkkkww#hhh#.',
  '.#Hhh#wkkkkwwkkkkw#hhh#.',
  '.#Hhh#wkkkkwwkkkkg#hhh#.',
  '.#hhh#wwkkwwwwkkgg#hhh#.',
  '.#hhh#gwwwwkkwwwwg#hhh#.',
  '.#hhhh#wwwkwwkwwg#hhhh#.',
  '#hhhhh#gwwwwwwwwg#hhhhh#',
  '#hhhhh#wkwkwkwkwg#hhhhh#',
  '#hhhhhh#wkwkwkwk#hhhhhh#',
  '#hhhhhhh#gwwwwg#hhhhhhh#',
  '#hhhhhhhh######hhhhhhhh#',
  '#hhhhhhhhhhhhhhhhhhhhhh#',
  '#hhhhhhhhhhhhhhhhhhhhhh#',
  '#hhhhhhhhhhhhhhhhhhhhhh#',
  '########################',
];
const PALETTE: Record<string, string> = { '#': '#000', k: '#000', h: '#4a4a4a', H: '#7a7a7a', w: '#f0f0f0', g: '#9a9a9a' };
let hood: HTMLCanvasElement | null = null;
function hoodSprite() {
  if (hood) return hood;
  hood = document.createElement('canvas');
  hood.width = HOOD[0].length; hood.height = HOOD.length;
  const c = hood.getContext('2d')!;
  HOOD.forEach((row, y) => [...row].forEach((ch, x) => {
    if (PALETTE[ch]) { c.fillStyle = PALETTE[ch]; c.fillRect(x, y, 1, 1); }
  }));
  return hood;
}

/** Draws the hooded skull centred on (cx, cy), `w` wide. */
export function drawHoodedSkull(sx: CanvasRenderingContext2D, cx: number, cy: number, w: number) {
  const s = hoodSprite();
  const h = (w * s.height) / s.width;
  sx.save();
  sx.imageSmoothingEnabled = false;
  sx.drawImage(s, cx - w / 2, cy - h / 2, w, h);
  sx.restore();
}

/* A 17th-century carved skull, photographed front-on (The Met, 207770, public domain) */
const photo = new Image();
photo.src = '/sprites/skull-photo.webp';

/** Draws the photographed skull inside the face's circle. */
export function drawSkullPhoto(sx: CanvasRenderingContext2D, cx: number, cy: number, R: number) {
  if (!photo.complete || !photo.naturalWidth) return;
  const h = R * 2.5, w = (h * photo.naturalWidth) / photo.naturalHeight;
  sx.save();
  sx.beginPath(); sx.arc(cx, cy, R * 1.12, 0, Math.PI * 2); sx.clip();
  sx.fillStyle = '#000'; sx.fillRect(cx - R * 1.2, cy - R * 1.2, R * 2.4, R * 2.4);
  sx.drawImage(photo, cx - w / 2, cy - h * 0.5, w, h);
  sx.restore();
}

/** The mark, dead: the avatar's round head and slanted mouth, with X eyes and teeth. Engraved in dark grays. */
export function drawDeadFace(sx: CanvasRenderingContext2D, x: number, y: number, r: number, tilt = 0) {
  sx.save();
  sx.translate(x, y);
  sx.rotate(tilt);
  sx.lineCap = 'round';
  sx.fillStyle = '#b8b8b8'; sx.strokeStyle = '#000'; sx.lineWidth = r * 0.16;
  sx.beginPath(); sx.arc(0, 0, r, 0, Math.PI * 2); sx.fill(); sx.stroke();
  /* X eyes where the avatar's dots are */
  sx.lineWidth = r * 0.17;
  for (const [ex, ey] of [[-0.36, -0.22], [0.24, -0.27]]) {
    const cx = ex * r, cy = ey * r, d = r * 0.17;
    sx.beginPath(); sx.moveTo(cx - d, cy - d); sx.lineTo(cx + d, cy + d); sx.moveTo(cx + d, cy - d); sx.lineTo(cx - d, cy + d); sx.stroke();
  }
  /* the avatar's slanted mouth, with teeth */
  const mx0 = -0.72 * r, my0 = 0.52 * r, mx1 = 0.82 * r, my1 = 0.14 * r;
  sx.lineWidth = r * 0.13;
  sx.beginPath(); sx.moveTo(mx0, my0); sx.lineTo(mx1, my1); sx.stroke();
  sx.lineWidth = r * 0.07;
  for (let i = 1; i <= 4; i++) {
    const f = i / 5, tx = mx0 + (mx1 - mx0) * f, ty = my0 + (my1 - my0) * f;
    sx.beginPath(); sx.moveTo(tx, ty - r * 0.14); sx.lineTo(tx, ty + r * 0.14); sx.stroke();
  }
  sx.restore();
}

/** A headstone standing where a face was: rounded slab with the dead mark carved in, on a strip of ground.
    `tilt` leans the stone; `skullTilt` turns the carving on the stone. */
export function drawTombstone(sx: CanvasRenderingContext2D, x: number, y: number, R: number, tilt = 0, skullTilt = 0) {
  const w = R * 1.5, h = R * 1.9, top = y + R - h;
  sx.fillStyle = '#555'; sx.fillRect(x - w * 0.8, y + R - R * 0.05, w * 1.6, R * 0.18);
  sx.save();
  sx.translate(x, y + R);
  sx.rotate(tilt);
  sx.translate(-x, -(y + R));
  const g = sx.createLinearGradient(x - w / 2, top, x + w / 2, y + R);
  g.addColorStop(0, '#d8d8d8'); g.addColorStop(0.5, '#8a8a8a'); g.addColorStop(1, '#3a3a3a');
  sx.fillStyle = g; sx.strokeStyle = '#000'; sx.lineWidth = R * 0.1;
  sx.beginPath();
  sx.moveTo(x - w / 2, y + R);
  sx.lineTo(x - w / 2, top + w / 2);
  sx.arc(x, top + w / 2, w / 2, Math.PI, 0);
  sx.lineTo(x + w / 2, y + R);
  sx.closePath(); sx.fill(); sx.stroke();
  drawDeadFace(sx, x, top + h * 0.4, w * 0.37, skullTilt);
  /* one worn line of epitaph under the carving */
  sx.strokeStyle = '#1a1a1a'; sx.lineWidth = R * 0.07; sx.lineCap = 'round';
  sx.beginPath(); sx.moveTo(x - w * 0.26, top + h * 0.78); sx.lineTo(x + w * 0.22, top + h * 0.78); sx.stroke();
  sx.restore();
}
