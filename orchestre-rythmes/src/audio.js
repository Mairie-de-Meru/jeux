// Synthèse Web Audio : un timbre par instrument, aucun fichier audio.
import { getInstrument } from './logic/instruments.js';

let ctx = null;
let master = null;
let bruit = null;

export function initAudio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.8;
    master.connect(ctx.destination);
    const len = ctx.sampleRate;
    bruit = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = bruit.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export const maintenant = () => (ctx ? ctx.currentTime : 0);

function env(g, t, attaque, pic, duree) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(pic, t + attaque);
  g.gain.exponentialRampToValueAtTime(0.0001, t + duree);
}

function osc(type, freq, t, duree, pic, attaque = 0.005, dest = master) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  env(g, t, attaque, pic, duree);
  o.connect(g).connect(dest);
  o.start(t);
  o.stop(t + duree + 0.05);
  return o;
}

function souffle(t, duree, pic, filtreType, filtreFreq, attaque = 0.003) {
  const s = ctx.createBufferSource();
  s.buffer = bruit;
  const f = ctx.createBiquadFilter();
  f.type = filtreType;
  f.frequency.value = filtreFreq;
  const g = ctx.createGain();
  env(g, t, attaque, pic, duree);
  s.connect(f).connect(g).connect(master);
  s.start(t);
  s.stop(t + duree + 0.05);
}

const TIMBRES = {
  tambour(t, f) {
    const o = osc('sine', f * 1.6, t, 0.35, 0.9);
    o.frequency.exponentialRampToValueAtTime(f * 0.6, t + 0.25);
    souffle(t, 0.12, 0.35, 'lowpass', 1500);
  },
  xylophone(t, f) {
    osc('sine', f, t, 0.35, 0.5, 0.002);
    osc('sine', f * 3, t, 0.12, 0.25, 0.002);
    osc('sine', f * 6, t, 0.06, 0.1, 0.002);
  },
  maracas(t) {
    souffle(t, 0.1, 0.5, 'highpass', 5000);
    souffle(t + 0.07, 0.09, 0.4, 'highpass', 6000);
  },
  trompette(t, f) {
    const fl = ctx.createBiquadFilter();
    fl.type = 'lowpass';
    fl.frequency.setValueAtTime(600, t);
    fl.frequency.linearRampToValueAtTime(2800, t + 0.08);
    fl.frequency.linearRampToValueAtTime(1500, t + 0.45);
    fl.connect(master);
    osc('sawtooth', f, t, 0.5, 0.35, 0.04, fl);
    osc('sawtooth', f * 1.005, t, 0.5, 0.25, 0.04, fl);
  },
  piano(t, f) {
    osc('triangle', f, t, 0.9, 0.55, 0.004);
    osc('sine', f * 2, t, 0.35, 0.22, 0.004);
  },
  triangle(t, f) {
    osc('sine', f, t, 1.4, 0.4, 0.002);
    osc('sine', f * 2.76, t, 0.7, 0.15, 0.002);
  },
};

/** Joue l'instrument `id` à l'instant `quand` (secondes du contexte, défaut : maintenant). */
export function jouerInstrument(id, quand) {
  if (!initAudio()) return;
  const inst = getInstrument(id);
  const fn = TIMBRES[id];
  if (!inst || !fn) return;
  fn(Math.max(quand ?? 0, ctx.currentTime), inst.freq);
}

/** Petit jingle joyeux. */
export function sonBravo(quand) {
  if (!initAudio()) return;
  const t = Math.max(quand ?? 0, ctx.currentTime);
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => osc('triangle', f, t + i * 0.1, 0.3, 0.35, 0.01));
}

/** Son doux « essaie encore ». */
export function sonIndice(quand) {
  if (!initAudio()) return;
  const t = Math.max(quand ?? 0, ctx.currentTime);
  osc('sine', 392, t, 0.25, 0.25, 0.02);
  osc('sine', 330, t + 0.18, 0.35, 0.25, 0.02);
}

/** Clic de métronome ; fort sur le premier temps. */
export function clic(quand, fort = false) {
  if (!initAudio()) return;
  const t = Math.max(quand ?? 0, ctx.currentTime);
  osc('square', fort ? 1500 : 1000, t, 0.04, 0.12, 0.001);
}
