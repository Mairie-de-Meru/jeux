// Petits sons synthétisés (Web Audio) ; aucun fichier.
let ctx = null;
let muted = false;

function ac() {
  if (muted) return null;
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch (e) { return null; }
}

function tone(freq, t0, dur, { type = 'sine', gain = 0.12, slide = 0 } = {}) {
  const c = ac();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  const t = c.currentTime + t0;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export const setMuted = (m) => { muted = !!m; };
export const sounds = {
  tap: () => tone(520, 0, 0.07, { type: 'triangle', gain: 0.08 }),
  place: () => { tone(330, 0, 0.09, { type: 'triangle', gain: 0.14, slide: -80 }); },
  back: () => tone(420, 0, 0.1, { type: 'sine', gain: 0.07, slide: 120 }),
  good: (n = 3) => { for (let i = 0; i < n; i++) tone(523.25 * Math.pow(1.2599, i), i * 0.09, 0.2, { type: 'triangle', gain: 0.13 }); },
  big: () => { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.08, 0.3, { type: 'triangle', gain: 0.14 })); },
  oops: () => { tone(330, 0, 0.18, { type: 'sine', gain: 0.1 }); tone(262, 0.16, 0.25, { type: 'sine', gain: 0.1 }); },
  bot: () => tone(392, 0, 0.12, { type: 'square', gain: 0.05 }),
  shuffle: () => { for (let i = 0; i < 4; i++) tone(300 + i * 60, i * 0.04, 0.05, { type: 'triangle', gain: 0.06 }); },
  win: () => { [523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.3, { type: 'triangle', gain: 0.15 })); },
};
