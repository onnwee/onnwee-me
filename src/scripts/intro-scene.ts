import { drawFace, drawHoodedSkull, drawSkullPhoto, drawTombstone } from './face';

/* The intro's shots, drawn in grays into the stage's source canvas so the dither renders them like
   everything else. Each shot returns how the stage should treat it: cell size, glitch, spot color. */

export type Shot = { pix: number; glitch: number; spot: string; roll: number };

const load = (src: string) => { const im = new Image(); im.src = src; return im; };
const gas = load('/sprites/gas-mask.webp');
const capture = load('/sprites/capture.webp');
const ready = (im: HTMLImageElement) => im.complete && im.naturalWidth > 0;
const hash = (a: number, b: number) => { const n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return n - Math.floor(n); };
const SERIF = '"IM Fell English SC", Georgia, serif';

/* Cut points, in seconds */
const CUTS = [0, 0.45, 1.85, 2.45, 3.15, 3.75, 4.65, 5.6, 6.4, 7.7, 8.3];

let noiseCanvas: HTMLCanvasElement | null = null;
export function staticNoise(sx: CanvasRenderingContext2D, W: number, H: number) {
  if (!noiseCanvas) { noiseCanvas = document.createElement('canvas'); noiseCanvas.width = 160; noiseCanvas.height = 100; }
  const c = noiseCanvas.getContext('2d')!, img = c.createImageData(160, 100);
  for (let i = 0; i < img.data.length; i += 4) { const v = Math.random() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
  c.putImageData(img, 0, 0);
  sx.save(); sx.imageSmoothingEnabled = false; sx.drawImage(noiseCanvas, 0, 0, W, H); sx.restore();
}

/* Fits the whole image inside the frame, so the brackets and the ID plate of the capture stay in shot */
function contain(sx: CanvasRenderingContext2D, im: HTMLImageElement, W: number, H: number, zoom = 1) {
  if (!ready(im)) return;
  const s = Math.min(W / im.naturalWidth, H / im.naturalHeight) * zoom;
  const w = im.naturalWidth * s, h = im.naturalHeight * s;
  sx.drawImage(im, (W - w) / 2, (H - h) / 2, w, h);
}

function fitFont(sx: CanvasRenderingContext2D, text: string, size: number, family: string, maxW: number, weight = '400') {
  sx.font = `${weight} ${size}px ${family}`;
  const w = sx.measureText(text).width;
  if (w > maxW) { size *= maxW / w; sx.font = `${weight} ${size}px ${family}`; }
  return size;
}

/* Old film: flicker, a vignette, scratches and dust, different every frame */
export function filmDamage(sx: CanvasRenderingContext2D, W: number, H: number) {
  sx.fillStyle = `rgba(0,0,0,${Math.random() * 0.18})`; sx.fillRect(0, 0, W, H);
  const g = sx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.25, W / 2, H / 2, Math.max(W, H) * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.75)');
  sx.fillStyle = g; sx.fillRect(0, 0, W, H);
  for (let i = 0; i < 2; i++) if (Math.random() < 0.6) {
    sx.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.8)';
    sx.fillRect(Math.random() * W, 0, 1.4, H);
  }
  for (let i = 0; i < 6; i++) {
    sx.fillStyle = Math.random() < 0.5 ? '#fff' : '#000';
    sx.beginPath(); sx.arc(Math.random() * W, Math.random() * H, 0.5 + Math.random() * 2.5, 0, Math.PI * 2); sx.fill();
  }
}

function crtOn(sx: CanvasRenderingContext2D, W: number, H: number, p: number) {
  const m = Math.min(W, H);
  sx.fillStyle = '#000'; sx.fillRect(0, 0, W, H);
  sx.fillStyle = '#fff';
  if (p < 0.3) { sx.beginPath(); sx.arc(W / 2, H / 2, m * 0.03 * (p / 0.3), 0, Math.PI * 2); sx.fill(); }
  else if (p < 0.6) { const w = W * ((p - 0.3) / 0.3); sx.fillRect((W - w) / 2, H / 2 - 1.5, w, 3); }
  else { const h = H * ((p - 0.6) / 0.4) ** 2; sx.fillRect(0, (H - h) / 2, W, Math.max(3, h)); }
}

function countdown(sx: CanvasRenderingContext2D, W: number, H: number, local: number, dur: number) {
  const m = Math.min(W, H), step = dur / 3, k = Math.min(2, Math.floor(local / step)), f = (local - k * step) / step;
  const cx = W / 2, cy = H / 2, R = m * 0.42;
  sx.fillStyle = '#7a7a7a'; sx.fillRect(0, 0, W, H);
  sx.fillStyle = '#333';
  sx.beginPath(); sx.moveTo(cx, cy); sx.arc(cx, cy, Math.max(W, H), -Math.PI / 2, -Math.PI / 2 + f * Math.PI * 2); sx.closePath(); sx.fill();
  sx.strokeStyle = '#fff'; sx.lineWidth = m * 0.012;
  for (const r of [R, R * 0.82]) { sx.beginPath(); sx.arc(cx, cy, r, 0, Math.PI * 2); sx.stroke(); }
  sx.lineWidth = m * 0.008;
  sx.beginPath(); sx.moveTo(0, cy); sx.lineTo(W, cy); sx.moveTo(cx, 0); sx.lineTo(cx, H); sx.stroke();
  sx.font = `400 ${R * 1.3}px ${SERIF}`; sx.textAlign = 'center'; sx.textBaseline = 'middle';
  sx.lineWidth = m * 0.03; sx.strokeStyle = '#000'; sx.strokeText(String(3 - k), cx, cy + R * 0.05);
  sx.fillStyle = '#fff'; sx.fillText(String(3 - k), cx, cy + R * 0.05);
  if (f < 0.08) { sx.fillStyle = 'rgba(255,255,255,0.7)'; sx.fillRect(0, 0, W, H); }
  return f;
}

function intertitle(sx: CanvasRenderingContext2D, W: number, H: number) {
  const m = Math.min(W, H);
  sx.fillStyle = '#000'; sx.fillRect(0, 0, W, H);
  sx.strokeStyle = '#fff'; sx.lineWidth = m * 0.006;
  for (const inset of [m * 0.06, m * 0.085]) sx.strokeRect(inset, inset, W - inset * 2, H - inset * 2);
  sx.fillStyle = '#fff';
  for (const [x, y] of [[m * 0.06, m * 0.06], [W - m * 0.06, m * 0.06], [m * 0.06, H - m * 0.06], [W - m * 0.06, H - m * 0.06]]) {
    sx.beginPath(); sx.moveTo(x, y - m * 0.03); sx.lineTo(x + m * 0.03, y); sx.lineTo(x, y + m * 0.03); sx.lineTo(x - m * 0.03, y); sx.fill();
  }
  sx.textAlign = 'center'; sx.textBaseline = 'middle';
  const size = fitFont(sx, 'A TRANSMISSION', m * 0.12, SERIF, W * 0.78);
  sx.fillText('A TRANSMISSION', W / 2, H / 2 - size * 0.62);
  sx.font = `400 ${size}px ${SERIF}`;
  sx.fillText('FROM NO ONE', W / 2, H / 2 + size * 0.62);
}

function gasGrid(sx: CanvasRenderingContext2D, W: number, H: number, p: number) {
  sx.fillStyle = '#000'; sx.fillRect(0, 0, W, H);
  if (!ready(gas)) return;
  const cols = 2 + Math.floor(p * 6), cw = W / cols, ch = (cw * gas.naturalHeight) / gas.naturalWidth;
  const rows = Math.ceil(H / ch) + 1, oy = (H - rows * ch) / 2;
  const fr = Math.floor(rows / 2), fc = Math.floor(cols / 2);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    if (r === fr && c === fc) drawFace(sx, c * cw + cw / 2, oy + r * ch + ch / 2, Math.min(cw, ch) * 0.38);
    else sx.drawImage(gas, c * cw, oy + r * ch, cw, ch);
  }
}

function crowd(sx: CanvasRenderingContext2D, W: number, H: number, p: number) {
  const m = Math.min(W, H);
  sx.fillStyle = '#000'; sx.fillRect(0, 0, W, H);
  const dead = Math.min(1, Math.max(0, p * 1.25 - 0.1)), rows = 4;
  for (let r = 0; r < rows; r++) {
    const depth = (rows - 1 - r) / (rows - 1);
    const R = m * 0.11 * (1 - 0.55 * depth), y = H * 0.78 - depth * m * 0.55;
    const step = R * 2.35, n = Math.ceil(W / step) + 1, off = (r % 2) * step * 0.5 - step * 0.25;
    for (let i = 0; i < n; i++) {
      const x = off + i * step;
      if (hash(r, i) < dead) {
        const lean = (hash(i, r) < 0.5 ? -1 : 1) * (0.05 + hash(i + 7, r) * 0.09);
        const turn = (hash(r + 3, i) < 0.5 ? -1 : 1) * (0.1 + hash(r, i + 5) * 0.2);
        drawTombstone(sx, x, y, R, lean, turn);
      } else drawFace(sx, x, y, R);
    }
  }
}

function stutter(sx: CanvasRenderingContext2D, W: number, H: number, local: number) {
  const m = Math.min(W, H);
  sx.fillStyle = '#000'; sx.fillRect(0, 0, W, H);
  const beat = Math.floor(local / 0.09), pick = Math.floor(hash(beat, 3) * 3);
  const R = m * 0.34, x = W / 2 + (hash(beat, 1) - 0.5) * m * 0.05, y = H / 2 + (hash(beat, 2) - 0.5) * m * 0.05;
  if (pick === 0) drawFace(sx, x, y, R);
  else if (pick === 1) drawSkullPhoto(sx, x, y, R);
  else drawHoodedSkull(sx, x, y, R * 2.6);
}

function titleCard(sx: CanvasRenderingContext2D, W: number, H: number, local: number, faceFont: string) {
  const m = Math.min(W, H), cx = W / 2, cy = H / 2;
  sx.fillStyle = '#000'; sx.fillRect(0, 0, W, H);
  sx.strokeStyle = '#2c2c2c'; sx.lineWidth = m * 0.03;
  for (let r = m * 0.2; r < Math.max(W, H); r += m * 0.11) { sx.beginPath(); sx.arc(cx, cy, r, 0, Math.PI * 2); sx.stroke(); }
  sx.textAlign = 'center'; sx.textBaseline = 'middle';
  sx.fillStyle = '#fff';
  fitFont(sx, 'a transmission by', m * 0.075, SERIF, W * 0.8);
  sx.fillText('a transmission by', cx, cy - m * 0.31);
  /* the name slams in */
  const slam = 1 + Math.max(0, 1 - local / 0.18) * 0.6;
  const fs = fitFont(sx, '⓪ηηωεε倦怠', m * 0.15 * slam, faceFont, W * 0.9 * slam, '700');
  sx.lineJoin = 'round'; sx.lineWidth = fs * 0.09; sx.strokeStyle = '#000';
  sx.strokeText('⓪ηηωεε倦怠', cx, cy - m * 0.1);
  sx.fillStyle = '#7a7a7a'; sx.fillText('⓪ηηωεε倦怠', cx + fs * 0.05, cy - m * 0.1 + fs * 0.03);
  sx.fillStyle = '#fff'; sx.fillText('⓪ηηωεε倦怠', cx, cy - m * 0.1);
  /* then the horror-poster title, flickering on */
  if (local > 0.35 && (local > 0.6 || Math.random() < 0.6)) {
    const es = fitFont(sx, 'ENNUI', m * 0.3, 'Creepster, Impact, sans-serif', W * 0.85);
    sx.lineWidth = es * 0.06; sx.strokeStyle = '#000'; sx.strokeText('ENNUI', cx, cy + m * 0.22);
    sx.fillStyle = '#8a8a8a'; sx.fillText('ENNUI', cx, cy + m * 0.22);
  }
  sx.textAlign = 'start'; sx.textBaseline = 'alphabetic';
}

function crtOff(sx: CanvasRenderingContext2D, W: number, H: number, p: number) {
  if (p < 0.6) {
    const bh = (H / 2) * (p / 0.6) ** 2;
    sx.fillStyle = '#000'; sx.fillRect(0, 0, W, bh); sx.fillRect(0, H - bh, W, bh);
    if (p > 0.5) { sx.fillStyle = '#fff'; sx.fillRect(0, H / 2 - 1.5, W, 3); }
  } else {
    sx.fillStyle = '#000'; sx.fillRect(0, 0, W, H);
    const w = W * Math.max(0, 1 - (p - 0.6) / 0.3);
    sx.fillStyle = '#fff';
    if (w > 4) sx.fillRect((W - w) / 2, H / 2 - 1.5, w, 3);
    else if (p < 0.97) { sx.beginPath(); sx.arc(W / 2, H / 2, 3, 0, Math.PI * 2); sx.fill(); }
  }
}

export function drawIntro(sx: CanvasRenderingContext2D, W: number, H: number, it: number, faceFont: string): Shot {
  let i = 0;
  while (i < CUTS.length - 2 && it >= CUTS[i + 1]) i++;
  const local = it - CUTS[i], dur = CUTS[i + 1] - CUTS[i], p = Math.min(1, local / dur), m = Math.min(W, H);
  const old = i >= 1 && i <= 8;

  sx.save();
  /* gate weave: the whole frame jitters like film in a worn projector */
  if (old) sx.translate((Math.random() - 0.5) * m * 0.008, (Math.random() - 0.5) * m * 0.008);
  let shot: Shot = { pix: 3, glitch: 0.05, spot: 'uv', roll: 0 };
  switch (i) {
    case 0: crtOn(sx, W, H, p); shot = { pix: 3, glitch: 0, spot: 'uv', roll: 0 }; break;
    case 1: { const f = countdown(sx, W, H, local, dur); shot = { pix: 3, glitch: f < 0.1 ? 0.5 : 0.05, spot: 'uv', roll: 0 }; break; }
    case 2: intertitle(sx, W, H); shot = { pix: 2, glitch: 0.04, spot: 'uv', roll: 0 }; break;
    case 3: gasGrid(sx, W, H, p); shot = { pix: 3, glitch: local % 0.117 < 0.03 ? 0.55 : 0.12, spot: 'acid', roll: 0 }; break;
    case 4: {
      const flash = (local > 0.2 && local < 0.27) || (local > 0.4 && local < 0.45);
      sx.fillStyle = '#000'; sx.fillRect(0, 0, W, H);
      if (flash) drawSkullPhoto(sx, W / 2, H / 2, m * 0.45); else contain(sx, capture, W, H, 1.04 + local * 0.15);
      shot = { pix: 3, glitch: flash ? 0.7 : 0.08, spot: 'hot', roll: 0 }; break;
    }
    case 5: {
      staticNoise(sx, W, H);
      sx.fillStyle = 'rgba(0,0,0,0.35)'; sx.fillRect(0, 0, W, H);
      sx.fillStyle = 'rgba(255,255,255,0.25)'; sx.fillRect(0, ((local * 1.8) % 1) * H, W, H * 0.08);
      shot = { pix: 3, glitch: 0.25, spot: 'signal', roll: 0 }; break;
    }
    case 6: crowd(sx, W, H, p); shot = { pix: 3, glitch: 0.06, spot: 'uv', roll: 0 }; break;
    case 7: stutter(sx, W, H, local); shot = { pix: 3, glitch: 0.5, spot: 'blood', roll: hash(Math.floor(local / 0.09), 9) < 0.2 ? 0.08 : 0 }; break;
    case 8: titleCard(sx, W, H, local, faceFont); shot = { pix: 3, glitch: local < 0.2 ? 0.7 : 0.05, spot: 'blood', roll: 0 }; break;
    default: titleCard(sx, W, H, 2, faceFont); crtOff(sx, W, H, p); shot = { pix: 3, glitch: 0.1, spot: 'blood', roll: 0 };
  }
  sx.restore();
  if (old) filmDamage(sx, W, H);
  return shot;
}
