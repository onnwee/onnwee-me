import { reduceMotion as reduce } from './motion';
import { updateTrails } from './trails';
import { introFinished, introTime } from './intro';
import { drawIntro, filmDamage, staticNoise } from './intro-scene';
import { drawSprites } from './sprites';
import { updateDepth } from './depth';
import { drawDeadFace, drawFace, drawHoodedSkull, drawSkullPhoto } from './face';
import { soundChannel, soundFrame } from './audio';
import { musicLevel } from './radio';

/* The stage: a source canvas (test pattern, face and name, the late-show reel, or the visitor's own
   footage) reduced by a WebGL shader to ink, paper and one spot color through an 8×8 Bayer matrix. */

const root = document.documentElement;
const css = getComputedStyle(root);
const rgb = (name: string): [number, number, number] => {
  let h = css.getPropertyValue(name).trim().replace('#', '');
  /* the production build shortens #ffffff to #fff */
  if (h.length === 3) h = [...h].map((c) => c + c).join('');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as [number, number, number];
};
const SPOTS: Record<string, [number, number, number]> = {
  uv: rgb('--uv'), acid: rgb('--acid'), signal: rgb('--signal'), hot: rgb('--hot'), blood: rgb('--blood'),
};

/* Each section's second color: used for edge fringes and corrupted bands */
const SECOND: Record<string, string> = { uv: 'acid', acid: 'hot', signal: 'hot', hot: 'signal', blood: 'signal' };

let glitch = 0;
export const kickGlitch = () => { if (!reduce) glitch = 1; };

const stage = document.getElementById('stage') as HTMLCanvasElement | null;
const gl = stage?.getContext('webgl2', { antialias: false, premultipliedAlpha: false, preserveDrawingBuffer: true }) ?? null;
const src = document.createElement('canvas');
const sx = src.getContext('2d')!;
let media: HTMLVideoElement | HTMLImageElement | null = null;
const scene = document.body.dataset.scene ?? '';

/* Hero name placeholder, if this page has one */
const markEl = document.querySelector<HTMLElement>('.mark-glyphs');
const faceFont = css.getPropertyValue('--face').trim();
let markSize = 0;
let sizeDirty = true;

function resize() {
  if (!stage) return;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  stage.width = Math.round(innerWidth * dpr);
  stage.height = Math.round(innerHeight * dpr);
  src.width = 720;
  src.height = Math.min(1400, Math.round((720 * innerHeight) / innerWidth));
  sizeDirty = true;
}

/* Face swaps: every 8–16 seconds the face fades into a skull (a photo or the hooded pixel one),
   holds, and fades back. Keyed to time, so reduced motion (time frozen at 0) never swaps. */
const SWAP_FADE = 0.45, SWAP_HOLD = 1.6;
let swapAt = 16, swapKind = 0, lastSwap = 0, swapNow = 0;
if (import.meta.env.DEV) (window as unknown as { __swap: (kind: number) => void }).__swap = (kind) => { swapAt = swapNow; swapKind = kind; };
function swapAmount(t: number) {
  swapNow = t;
  if (t > swapAt + SWAP_HOLD + SWAP_FADE * 2) { swapAt = t + 8 + Math.random() * 8; swapKind = Math.random() < 0.5 ? 0 : 1; }
  const d = t - swapAt;
  const a = d < 0 ? 0 : d < SWAP_FADE ? d / SWAP_FADE : d < SWAP_FADE + SWAP_HOLD ? 1 : Math.max(0, 1 - (d - SWAP_FADE - SWAP_HOLD) / SWAP_FADE);
  if ((lastSwap === 0 && a > 0) || (lastSwap === 1 && a < 1)) kickGlitch();
  lastSwap = a;
  return a;
}

/* The still background: rings and the face. Only time moves it, and the radio's bass when it plays. */
function drawPattern(t: number, music: number) {
  const W = src.width, H = src.height, m = Math.min(W, H);
  sx.fillStyle = '#000'; sx.fillRect(0, 0, W, H);

  const cx = W * 0.72, cy = H * (0.42 + 0.08 * Math.sin(t * 0.4));
  const step = m * 0.07, n = 18;
  sx.lineWidth = step * 0.42 * (1 + music * 0.45);
  for (let i = 0; i < n; i++) {
    const r = Math.max(0, (i * step + t * step * 0.8) % (n * step));
    sx.strokeStyle = `rgba(255,255,255,${Math.min(1, 0.55 * (1 - r / (n * step)) * (1 + music * 0.5))})`;
    sx.beginPath(); sx.arc(cx, cy, r, 0, Math.PI * 2); sx.stroke();
  }

  /* The face, which now and then dissolves into a skull and back */
  const R = m * 0.25 * (1 + music * 0.06), bx = W * 0.74, by = H * 0.55 + Math.sin(t * 0.7) * m * 0.03;
  const blink = !reduce && t % 4.2 < 0.12 ? 0.15 : 1;
  const a = swapAmount(t);
  if (a < 1) { sx.globalAlpha = 1 - a; drawFace(sx, bx, by, R, blink); }
  if (a > 0) {
    sx.globalAlpha = a;
    if (swapKind === 0) drawSkullPhoto(sx, bx, by, R);
    else drawHoodedSkull(sx, bx, by, R * 2.6);
  }
  sx.globalAlpha = 1;
}

/* The 404 page: a dead channel's test card with the mark, dead, swaying over it */
const BARS = ['#e6e6e6', '#c4c4c4', '#a2a2a2', '#808080', '#5e5e5e', '#3c3c3c', '#1a1a1a'];
function drawNoSignal(t: number) {
  const W = src.width, H = src.height, m = Math.min(W, H), bw = W / BARS.length;
  BARS.forEach((c, i) => { sx.fillStyle = c; sx.fillRect(i * bw, 0, bw + 1, H * 0.7); });
  BARS.slice().reverse().forEach((c, i) => { sx.fillStyle = c; sx.fillRect(i * bw, H * 0.7, bw + 1, H * 0.08); });
  sx.fillStyle = '#000'; sx.fillRect(0, H * 0.78, W, H * 0.22);
  sx.fillStyle = 'rgba(255,255,255,0.18)'; sx.fillRect(0, ((t * 0.15) % 1) * H, W, H * 0.06);
  drawDeadFace(sx, W / 2, H * 0.32, m * 0.2, reduce ? 0.1 : Math.sin(t * 0.8) * 0.12);
  const bxW = Math.min(W * 0.7, m * 0.9), bxH = m * 0.16, bxY = H * 0.55;
  sx.fillStyle = '#000'; sx.fillRect((W - bxW) / 2, bxY, bxW, bxH);
  sx.strokeStyle = '#fff'; sx.lineWidth = m * 0.008; sx.strokeRect((W - bxW) / 2, bxY, bxW, bxH);
  sx.fillStyle = '#fff'; sx.textAlign = 'center'; sx.textBaseline = 'middle';
  sx.font = `400 ${bxH * 0.7}px "Jersey 10", monospace`;
  sx.fillText('NO SIGNAL', W / 2, bxY + bxH * 0.54);
  sx.textAlign = 'start'; sx.textBaseline = 'alphabetic';
  if (!reduce && Math.random() < 0.15) { sx.globalAlpha = 0.2; staticNoise(sx, W, H); sx.globalAlpha = 1; }
}

/* The name, drawn where the hero's placeholder text sits so it scrolls with the page */
/* The first letter of the name, a circled zero. Every so often it turns a quarter turn to the right, so the
   zero lies on its side like an eye; the eye gets a pupil, blinks twice, and the letter turns back.
   Keyed to time, so reduced motion (time frozen at 0) never sees it. */
const EYE_EVERY = 11, EYE_FIRST = 3, EYE_TURN = 0.45, EYE_OPEN = 2.1;
let eyeWas = false;
function drawFirstLetter(ch: string, x: number, y: number, fs: number, t: number) {
  const w = sx.measureText(ch).width, cx = x + w / 2;
  const d = t < EYE_FIRST ? -1 : (t - EYE_FIRST) % EYE_EVERY;
  const end = EYE_TURN * 2 + EYE_OPEN;
  const ease = (v: number) => v * v * (3 - 2 * v);
  const turn = d < 0 || d > end ? 0 : d < EYE_TURN ? ease(d / EYE_TURN) : d < EYE_TURN + EYE_OPEN ? 1 : 1 - ease((d - EYE_TURN - EYE_OPEN) / EYE_TURN);
  const eye = turn === 1;
  if (eye !== eyeWas) { kickGlitch(); eyeWas = eye; }
  /* two blinks while it is an eye: 0 open, 1 shut */
  const e = d - EYE_TURN;
  const shut = !eye ? 0 : Math.max(...[0.55, 1.05].map((at) => Math.max(0, 1 - Math.abs(e - at) / 0.11)));

  const layer = (dx: number, dy: number, paint: () => void) => {
    sx.save(); sx.translate(cx + dx, y + dy); sx.rotate((turn * Math.PI) / 2); paint(); sx.restore();
  };
  sx.textAlign = 'center';
  sx.lineWidth = fs * 0.09; sx.strokeStyle = '#000';
  layer(0, 0, () => sx.strokeText(ch, 0, 0));
  sx.fillStyle = '#7a7a7a'; layer(fs * 0.05, fs * 0.03, () => sx.fillText(ch, 0, 0));
  sx.fillStyle = '#fff'; layer(0, 0, () => sx.fillText(ch, 0, 0));
  sx.textAlign = 'start';

  if (eye) {
    /* the zero, now lying down, is redrawn as an eye so that it can close */
    const rx = fs * 0.25, ry = fs * 0.15 * (1 - shut);
    sx.fillStyle = '#000'; sx.beginPath(); sx.ellipse(cx, y, fs * 0.31, fs * 0.22, 0, 0, Math.PI * 2); sx.fill();
    sx.strokeStyle = '#fff'; sx.lineWidth = fs * 0.075; sx.lineCap = 'round';
    sx.beginPath(); sx.ellipse(cx, y, rx, Math.max(fs * 0.004, ry), 0, 0, Math.PI * 2); sx.stroke();
    if (shut < 0.6) { sx.fillStyle = '#fff'; sx.beginPath(); sx.arc(cx, y, fs * 0.06 * (1 - shut), 0, Math.PI * 2); sx.fill(); }
  }
  return w;
}

function drawName(t: number) {
  if (!markEl) return;
  if (sizeDirty) { markSize = parseFloat(getComputedStyle(markEl).fontSize); sizeDirty = false; }
  const rc = markEl.getBoundingClientRect();
  if (rc.bottom < 0 || rc.top > innerHeight) return;
  const k = src.width / innerWidth, fs = markSize * k;
  const thin = markEl.querySelector('.thin')?.textContent ?? '';
  const full = markEl.textContent ?? '';
  const whole = thin ? full.slice(0, -thin.length) : full;
  const first = [...whole][0] ?? '', txt = whole.slice(first.length);
  const y = (rc.top + rc.height / 2) * k;
  sx.font = `700 ${fs}px ${faceFont}`; sx.textBaseline = 'middle'; sx.lineJoin = 'round';
  const x = rc.left * k + drawFirstLetter(first, rc.left * k, y, fs, t);
  sx.lineWidth = fs * 0.09; sx.strokeStyle = '#000'; sx.strokeText(txt, x, y);
  sx.fillStyle = '#7a7a7a'; sx.fillText(txt, x + fs * 0.05, y + fs * 0.03);
  sx.fillStyle = '#fff'; sx.fillText(txt, x, y);
  /* The kanji in a light weight with a thinner outline */
  if (thin) {
    const tx = x + sx.measureText(txt).width;
    sx.font = `300 ${fs}px ${faceFont}`;
    sx.lineWidth = fs * 0.04; sx.strokeText(thin, tx, y);
    sx.fillStyle = '#7a7a7a'; sx.fillText(thin, tx + fs * 0.03, y + fs * 0.02);
    sx.fillStyle = '#fff'; sx.fillText(thin, tx, y);
  }
  sx.textBaseline = 'alphabetic';
}

function drawCover(el: CanvasImageSource, w: number, h: number) {
  const W = src.width, H = src.height;
  if (!w || !h) return false;
  const s = Math.max(W / w, H / h), dw = w * s, dh = h * s;
  sx.drawImage(el, (W - dw) / 2, (H - dh) / 2, dw, dh);
  return true;
}

function drawMedia(t: number) {
  const ok = media instanceof HTMLVideoElement
    ? drawCover(media, media.videoWidth, media.videoHeight)
    : drawCover(media!, (media as HTMLImageElement).naturalWidth, (media as HTMLImageElement).naturalHeight);
  if (!ok) drawPattern(t, 0);
}

/* Film reels: a section with data-scrub holds a clip that scrolling scrubs through, forwards and
   backwards, while that section holds the middle of the screen. Clips load as they come near. */
type Reel = { el: HTMLElement; video: HTMLVideoElement; loaded: boolean };
const reels: Reel[] = [...document.querySelectorAll<HTMLElement>('[data-scrub]')].map((el) => {
  const video = document.createElement('video');
  video.muted = true; video.playsInline = true; video.preload = 'auto';
  /* some mobile browsers only paint a seeked frame after the video has played once */
  video.addEventListener('loadeddata', () => { video.play().then(() => video.pause()).catch(() => {}); }, { once: true });
  return { el, video, loaded: false };
});
/* The last film frame drawn, kept for the moments a seeking video has none */
const held = document.createElement('canvas');
const hx = held.getContext('2d')!;
let heldFor: HTMLVideoElement | null = null;
/** The reel whose section holds the middle of the screen, and how far through it we are (0–1). */
function activeReel() {
  const mid = innerHeight / 2;
  let found: { video: HTMLVideoElement; at: number } | null = null;
  for (const r of reels) {
    const b = r.el.getBoundingClientRect();
    if (!r.loaded && b.top < innerHeight * 3 && b.bottom > -innerHeight * 2) {
      r.loaded = true; r.video.src = r.el.dataset.scrub!; r.video.load();
    }
    if (b.top <= mid && b.bottom >= mid) found = { video: r.video, at: Math.min(1, Math.max(0, (mid - b.top) / b.height)) };
  }
  return found;
}

/* Footage loading: object URLs only, nothing leaves the browser */
const input = document.getElementById('footage') as HTMLInputElement | null;
const sourceMsg = document.getElementById('source-msg');
const resetBtn = document.getElementById('reset');
const defaultMsg = sourceMsg?.textContent ?? '';
function loadFile(f?: File | null) {
  if (!f || !sourceMsg || !resetBtn) return;
  const url = URL.createObjectURL(f);
  if (f.type.startsWith('video/')) {
    const v = document.createElement('video');
    v.muted = true; v.loop = true; v.playsInline = true; v.src = url;
    v.onerror = () => { sourceMsg.textContent = 'This browser could not play that file. Try an MP4 (H.264) or WebM video.'; };
    v.play().catch(() => {});
    media = v;
  } else if (f.type.startsWith('image/')) {
    const im = new Image(); im.src = url; media = im;
  } else {
    sourceMsg.textContent = 'That file is not a video or an image. Load an MP4, WebM, JPEG or PNG.';
    return;
  }
  sourceMsg.textContent = `Showing ${f.name}. It is not uploaded anywhere.`;
  resetBtn.hidden = false; kickGlitch();
}
if (input && sourceMsg && resetBtn) {
  document.getElementById('load')?.addEventListener('click', () => input.click());
  input.addEventListener('change', () => loadFile(input.files?.[0]));
  resetBtn.addEventListener('click', () => {
    if (media instanceof HTMLVideoElement) media.pause();
    media = null; sourceMsg.textContent = defaultMsg; resetBtn.hidden = true; kickGlitch();
  });
  addEventListener('dragover', (e) => e.preventDefault());
  addEventListener('drop', (e) => { e.preventDefault(); loadFile(e.dataTransfer?.files[0]); });
}

/* TV channels: each section is a numbered channel. Changing section flashes static and shows the
   channel number in the corner, like an old set's on-screen display. */
const osd = document.getElementById('osd');
let osdTimer = 0;
function showChannel(section: HTMLElement) {
  if (!osd || !section.dataset.ch) return;
  osd.querySelector('.osd-ch')!.textContent = `CH ${section.dataset.ch}`;
  osd.querySelector('.osd-name')!.textContent = section.dataset.name ?? '';
  osd.classList.add('on');
  clearTimeout(osdTimer);
  osdTimer = window.setTimeout(() => osd.classList.remove('on'), 1800);
}

/* Cursor: under a mouse, the signal clears into finer cells, brightens a little, and ripples */
const mouse = { x: 0, y: 0, amt: 0, target: 0 };
if (!reduce) {
  addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    mouse.x = e.clientX; mouse.y = e.clientY; mouse.target = 1;
  }, { passive: true });
  document.documentElement.addEventListener('mouseleave', () => { mouse.target = 0; });
}

function start(gl: WebGL2RenderingContext, stage: HTMLCanvasElement) {
  root.classList.add('gl');
  addEventListener('resize', resize);
  resize();

  const shader = (type: number, source: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, source); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s));
    return s;
  };
  const prog = gl.createProgram()!;
  gl.attachShader(prog, shader(gl.VERTEX_SHADER, `#version 300 es
    in vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }`));
  gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, `#version 300 es
    precision highp float;
    uniform sampler2D uSrc; uniform vec2 uRes; uniform float uPix, uGlitch, uTime, uNoise, uAberr, uRoll;
    uniform vec3 uInk, uPaper, uSpot, uSpot2;
    uniform vec2 uMouse; uniform float uMouseR, uMouseAmt;
    out vec4 o;
    float b2(vec2 a){ a = floor(a); return fract(dot(a, vec2(.5, a.y * .75))); }
    float b4(vec2 a){ return b2(.5 * a) * .25 + b2(a); }
    float b8(vec2 a){ return b4(.5 * a) * .25 + b2(a); }
    float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float lum(vec2 uv){ return smoothstep(.04, .96, dot(texture(uSrc, fract(uv)).rgb, vec3(.299, .587, .114))); }
    void main(){
      float tick = floor(uTime * 24.);
      vec2 fc = gl_FragCoord.xy;
      /* the cursor lens: 1 inside, fading to 0 at its rim */
      float md = distance(fc, uMouse);
      float lens = (1. - smoothstep(uMouseR * .7, uMouseR, md)) * uMouseAmt;
      /* Horizontal bands, six cells tall; a glitching band tears, coarsens, inverts or changes color */
      float band = floor(fc.y / (uPix * 6.));
      bool hit = h(vec2(band, tick)) < uGlitch * .6;
      float pix = (hit && h(vec2(band, tick + 7.7)) < .45) ? uPix * 3. : uPix;
      if (lens > .5) pix = max(1., floor(uPix * .5));
      vec2 cell = floor(fc / pix);
      vec2 uv = (cell + .5) * pix / uRes;
      uv.y += uRoll;
      if (hit) uv.x += (h(vec2(band, tick + 3.1)) - .5) * .4 * uGlitch;
      vec2 dir = (fc - uMouse) / max(md, 1.);
      uv += dir / uRes * sin(md * .09 - uTime * 7.) * uMouseR * .06 * lens;

      float l = lum(uv);
      l = mix(l, min(1., l * 1.25 + .06), lens * .7);
      float thr = b8(cell) * .98 + .01 + (h(cell + tick) - .5) * uNoise;
      float lv = clamp(floor(l * 2. + thr), 0., 2.);

      vec3 ink = uInk, paper = uPaper, spot = uSpot;
      if (hit && h(vec2(band, tick + 5.3)) < .35) spot = uSpot2;
      if (hit && h(vec2(band, tick + 9.1)) < .25) { ink = uPaper; paper = uInk; }
      vec3 c = lv < .5 ? ink : (lv < 1.5 ? spot : paper);

      /* Chromatic fringe: a dark cell beside a brighter one picks up the second color */
      if (lv < .5 && lum(uv + vec2(uAberr, 0.)) - l > .3) c = uSpot2;
      o = vec4(c, 1.);
    }`));
  gl.linkProgram(prog); gl.useProgram(prog);

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

  const U = (n: string) => gl.getUniformLocation(prog, n);
  const u = {
    res: U('uRes'), pix: U('uPix'), glitch: U('uGlitch'), time: U('uTime'), spot: U('uSpot'), spot2: U('uSpot2'),
    noise: U('uNoise'), aberr: U('uAberr'), roll: U('uRoll'), mouse: U('uMouse'), mouseR: U('uMouseR'), mouseAmt: U('uMouseAmt'),
  };
  gl.uniform3fv(U('uInk'), rgb('--ink'));
  gl.uniform3fv(U('uPaper'), rgb('--paper'));

  const sections = [...document.querySelectorAll<HTMLElement>('section[data-spot]')];
  const cellsLabel = document.getElementById('cells');
  let current: HTMLElement | null = null;
  let currentSpot = sections[0]?.dataset.spot ?? 'uv';
  let revealAt = introFinished() ? performance.now() : Infinity;
  let channelStatic = 0;
  addEventListener('boot:done', () => {
    revealAt = performance.now();
    current = null; /* show the channel again once the picture comes back */
  });

  const t0 = performance.now();
  let lastT = t0, vel = 0, lastY = scrollY;
  /* Random bursts of interference, at most one every 3 seconds */
  let nextBurst = t0 + 3500, roll = 0;

  function frame(now: number) {
    requestAnimationFrame(frame);
    if (document.hidden) return;
    const dt = Math.min(0.05, Math.max(0, (now - lastT) / 1000)); lastT = now;
    const t = reduce ? 0 : Math.max(0, (now - t0) / 1000);
    const maxScroll = Math.max(1, root.scrollHeight - innerHeight);
    const p = Math.min(1, Math.max(0, scrollY / maxScroll));
    mouse.amt += (mouse.target - mouse.amt) * Math.min(1, dt * 8);

    /* While the intro runs, it owns the stage */
    const it = introTime();
    if (it >= 0) {
      const shot = drawIntro(sx, src.width, src.height, it, faceFont);
      soundFrame(shot.glitch);
      present(shot.pix, shot.glitch, shot.roll, shot.spot, t, 0);
      return;
    }

    /* Which section, and so which channel, holds the middle of the screen */
    let active = sections[0] ?? null;
    for (const s of sections) if (s.getBoundingClientRect().top < innerHeight * 0.55) active = s;
    /* the last section is short, so on a tall screen it never reaches the middle: give it the end of the page */
    if (scrollY >= maxScroll - 2 && sections.length) active = sections[sections.length - 1];
    if (active && active !== current) {
      const first = current === null;
      current = active;
      currentSpot = active.dataset.spot ?? currentSpot;
      root.style.setProperty('--spot', `var(--${currentSpot})`);
      showChannel(active);
      if (!first) { kickGlitch(); soundChannel(); if (!reduce) channelStatic = 1; }
    }

    /* Scroll velocity drives trails and a little signal tearing; the radio's bass adds a pulse */
    const dy = scrollY - lastY; lastY = scrollY;
    vel += (dy - vel) * 0.07;
    const music = reduce ? 0 : musicLevel();
    if (!reduce) {
      if (now > nextBurst) {
        glitch = Math.max(glitch, 0.35 + Math.random() * 0.35);
        if (Math.random() < 0.2) roll = (Math.random() - 0.5) * 0.2;
        nextBurst = now + 3000 + Math.random() * 4000;
      }
      roll *= Math.pow(0.002, dt);
      glitch = Math.max(glitch * Math.pow(0.02, dt), Math.min(0.6, Math.abs(vel) / 70), 0.03, (music - 0.78) * 0.6);
    }

    /* Cell size: resolves after the intro, degrades toward the end of the page */
    let pix = 3 + 1.5 * p * p;
    if (!reduce && revealAt !== Infinity) pix += 22 * Math.max(0, 1 - (now - revealAt) / 900);
    const cell = Math.max(2, Math.round(pix));
    if (cellsLabel) cellsLabel.textContent = `cell ${cell}px`;

    const playing = activeReel(), reel = playing?.video;
    if (scene === 'nosignal') {
      drawNoSignal(t);
    } else if (playing && reel && reel.duration && (reel.readyState >= 2 || heldFor === reel)) {
      const target = playing.at * (reel.duration - 0.05);
      if (!reel.seeking && Math.abs(reel.currentTime - target) > 0.04) reel.currentTime = target;
      sx.fillStyle = '#000'; sx.fillRect(0, 0, src.width, src.height);
      if (reel.readyState >= 2) {
        drawCover(reel, reel.videoWidth, reel.videoHeight);
        if (held.width !== src.width || held.height !== src.height) { held.width = src.width; held.height = src.height; }
        hx.drawImage(src, 0, 0); heldFor = reel;
      } else {
        /* mid-seek the video has no frame to give: hold the last one instead of dropping to the test pattern */
        sx.drawImage(held, 0, 0);
      }
      if (!reduce) filmDamage(sx, src.width, src.height);
    } else {
      if (media) drawMedia(t); else drawPattern(t, music);
      drawSprites(sx, { k: src.width / innerWidth, vw: innerWidth, vh: innerHeight, t, font: faceFont });
      drawName(t);
    }
    if (channelStatic > 0) {
      sx.globalAlpha = channelStatic * 0.9; staticNoise(sx, src.width, src.height); sx.globalAlpha = 1;
      channelStatic = Math.max(0, channelStatic - dt / 0.35);
    }
    soundFrame(glitch);
    present(cell, glitch, roll, currentSpot, t, mouse.amt);
    /* last, so moving the windows and their trails never forces the measurements above to be redone */
    if (!reduce) { updateDepth(); updateTrails(); }
  }

  function present(cell: number, glitchAmount: number, rollAmount: number, spotName: string, t: number, lens: number) {
    const dpr = stage.width / innerWidth;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
    gl.viewport(0, 0, stage.width, stage.height);
    gl.uniform2f(u.res, stage.width, stage.height);
    gl.uniform1f(u.pix, cell * dpr);
    const g = reduce ? 0 : glitchAmount;
    gl.uniform1f(u.glitch, g);
    gl.uniform1f(u.time, t);
    gl.uniform1f(u.noise, reduce ? 0 : 0.04 + g * 0.2);
    gl.uniform1f(u.aberr, (0.006 + g * 0.02) * (stage.width > stage.height ? 1 : stage.height / stage.width));
    gl.uniform1f(u.roll, reduce ? 0 : rollAmount);
    gl.uniform3fv(u.spot, SPOTS[spotName] ?? SPOTS.uv);
    gl.uniform3fv(u.spot2, SPOTS[SECOND[spotName] ?? 'acid']);
    gl.uniform2f(u.mouse, mouse.x * dpr, (innerHeight - mouse.y) * dpr);
    gl.uniform1f(u.mouseR, 110 * dpr);
    gl.uniform1f(u.mouseAmt, lens);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  requestAnimationFrame(frame);
}

if (gl && stage) start(gl, stage);
else if (stage) stage.hidden = true;
