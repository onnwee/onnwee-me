import { getContext } from './audio';

/* A radio stream, unnamed on the page, with the current artist and title. Nothing is requested
   from the station until someone presses play, so a visit makes no third-party requests on its own.
   While it plays, the bass level is exposed so the background can move with the music. */

const STREAM = 'https://ice1.somafm.com/defcon-128-mp3';
const NOW_PLAYING = 'https://somafm.com/songs/defcon.json';
const POLL_MS = 20000;

const btn = document.getElementById('radio-toggle');
const label = document.getElementById('radio-now');
let el: HTMLAudioElement | null = null;
let analyser: AnalyserNode | null = null;
let bins = new Uint8Array(0);
let playing = false;
let timer = 0;
let level = 0;

/** Bass level of the music, 0–1, smoothed. 0 when the radio is off. */
export function musicLevel() {
  if (!playing || !analyser) { level *= 0.9; return level; }
  analyser.getByteFrequencyData(bins);
  let sum = 0;
  for (let i = 1; i < 7; i++) sum += bins[i];
  level += (sum / (6 * 255) - level) * 0.35;
  return level;
}

function say(text: string) {
  if (!label) return;
  label.textContent = text;
  label.title = text;
}

async function nowPlaying() {
  try {
    const res = await fetch(NOW_PLAYING, { cache: 'no-store' });
    const song = (await res.json())?.songs?.[0];
    if (playing && song) say(`${song.artist} — ${song.title}`);
  } catch { /* keep the last title on a network hiccup */ }
}

function render() {
  if (!btn) return;
  btn.textContent = playing ? 'Stop radio' : 'Play radio';
  btn.setAttribute('aria-pressed', String(playing));
}

function stop(message = 'Off air') {
  playing = false;
  clearInterval(timer);
  if (el) { el.pause(); el.removeAttribute('src'); el.load(); }
  say(message);
  render();
}

async function play() {
  const c = getContext();
  c.resume();
  if (!el) {
    el = new Audio();
    el.crossOrigin = 'anonymous';
    el.preload = 'none';
    const source = c.createMediaElementSource(el);
    analyser = c.createAnalyser();
    analyser.fftSize = 256;
    bins = new Uint8Array(analyser.frequencyBinCount);
    const gain = c.createGain();
    gain.gain.value = 0.8;
    source.connect(analyser);
    source.connect(gain).connect(c.destination);
    el.addEventListener('error', () => { if (playing) stop('Signal lost. Press play to try again.'); });
  }
  el.src = STREAM;
  playing = true;
  render();
  say('Tuning…');
  try { await el.play(); } catch { stop('The radio could not start. Press play to try again.'); return; }
  nowPlaying();
  timer = window.setInterval(nowPlaying, POLL_MS);
}

btn?.addEventListener('click', () => (playing ? stop() : play()));
render();
