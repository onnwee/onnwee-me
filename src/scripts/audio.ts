import { introTime } from './intro';

/* Sound, off by default and generated in the browser (no audio files):
   a CRT hum and flyback whine, static that swells with the on-screen glitch, a burst of static on
   channel changes, and for the intro a projector motor and shutter clicks, countdown beeps, a thump
   on every cut, a low boom under the title and a falling whine as the set switches off.
   Browsers only start audio after a click or key press, so nothing plays before the viewer acts. */

const KEY = 'sound';
let enabled = false;
try { enabled = localStorage.getItem(KEY) === 'on'; } catch {}

let ctx: AudioContext | null = null;
let master: GainNode, staticGain: GainNode, motorGain: GainNode, noise: AudioBuffer;
let lastIt = -1;

/* Intro cue points, in scene seconds (see intro-scene.ts) */
const CUTS = [0.45, 1.85, 2.45, 3.15, 3.75, 4.65, 5.6, 6.4, 7.7];
const BEEPS = [0.45, 0.45 + 1.4 / 3, 0.45 + (2 * 1.4) / 3];
const CLICK_RATE = 18;

export function getContext() {
  if (!ctx) { ctx = new AudioContext(); build(ctx); }
  return ctx;
}

function build(c: AudioContext) {
  master = c.createGain();
  master.gain.value = enabled ? 0.7 : 0;
  master.connect(c.destination);
  noise = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

  /* mains hum and the faint flyback whine of an old set */
  for (const [f, g] of [[60, 0.03], [120, 0.014], [15700, 0.002]]) {
    const o = c.createOscillator(), gn = c.createGain();
    o.frequency.value = f; gn.gain.value = g;
    o.connect(gn).connect(master); o.start();
  }
  /* static bed, silent until the picture glitches */
  const n = c.createBufferSource(), bp = c.createBiquadFilter();
  n.buffer = noise; n.loop = true;
  bp.type = 'bandpass'; bp.frequency.value = 2800; bp.Q.value = 0.7;
  staticGain = c.createGain(); staticGain.gain.value = 0;
  n.connect(bp).connect(staticGain).connect(master); n.start();
  /* projector motor */
  const mo = c.createOscillator(), lp = c.createBiquadFilter();
  mo.type = 'sawtooth'; mo.frequency.value = 46;
  lp.type = 'lowpass'; lp.frequency.value = 260;
  motorGain = c.createGain(); motorGain.gain.value = 0;
  mo.connect(lp).connect(motorGain).connect(master); mo.start();
}

function burst(dur: number, gain: number, freq: number, q = 0.8, type: BiquadFilterType = 'bandpass') {
  const c = ctx!, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), t = c.currentTime;
  s.buffer = noise;
  f.type = type; f.frequency.value = freq; f.Q.value = q;
  g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(master);
  s.start(t, Math.random() * 1.5, dur);
}

function tone(from: number, to: number, dur: number, gain: number, type: OscillatorType = 'sine') {
  const c = ctx!, o = c.createOscillator(), g = c.createGain(), t = c.currentTime;
  o.type = type;
  o.frequency.setValueAtTime(from, t); o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master); o.start(t); o.stop(t + dur);
}

const crossed = (a: number, b: number, at: number) => a < at && b >= at;

/** Called by the stage every frame with the current glitch amount (0–1). */
export function soundFrame(glitch: number) {
  if (!ctx || !enabled || ctx.state !== 'running') return;
  const it = introTime(), now = ctx.currentTime;
  staticGain.gain.setTargetAtTime(it >= 0 ? 0.03 : Math.min(0.35, Math.max(0, glitch - 0.03) * 0.6), now, 0.05);
  motorGain.gain.setTargetAtTime(it >= 0.45 && it < 7.7 ? 0.05 : 0, now, 0.05);
  if (it < 0) { lastIt = -1; return; }
  const prev = lastIt < 0 ? -0.001 : lastIt;
  if (crossed(prev, it, 0)) tone(80, 40, 0.3, 0.4);
  for (const b of BEEPS) if (crossed(prev, it, b)) tone(1000, 1000, 0.07, 0.18);
  for (const c of CUTS) if (crossed(prev, it, c)) { burst(0.12, 0.35, 1800, 0.6); tone(70, 45, 0.15, 0.25); }
  if (crossed(prev, it, 6.4)) { tone(110, 32, 0.9, 0.5); burst(0.4, 0.4, 400, 0.5, 'lowpass'); }
  if (crossed(prev, it, 7.7)) tone(900, 60, 0.5, 0.15);
  if (it >= 0.45 && it < 7.7 && Math.floor(prev * CLICK_RATE) !== Math.floor(it * CLICK_RATE)) burst(0.012, 0.25, 4500, 1.2);
  lastIt = it;
}

/** A burst of static when the page changes channel. */
export function soundChannel() {
  if (ctx && enabled && ctx.state === 'running') burst(0.3, 0.3, 2500, 0.5);
}

/* The toggle */
const btn = document.getElementById('sound-toggle');
function render() {
  if (!btn) return;
  btn.textContent = enabled ? 'Sound on' : 'Sound off';
  btn.setAttribute('aria-pressed', String(enabled));
}
btn?.addEventListener('click', () => {
  enabled = !enabled;
  try { localStorage.setItem(KEY, enabled ? 'on' : 'off'); } catch {}
  const c = getContext();
  c.resume();
  master.gain.setTargetAtTime(enabled ? 0.7 : 0, c.currentTime, 0.05);
  render();
});
render();

/* If sound was left on last time, start it with the first click or key press */
if (enabled) {
  const wake = () => { getContext().resume(); };
  addEventListener('pointerdown', wake, { once: true });
  addEventListener('keydown', wake, { once: true });
}
