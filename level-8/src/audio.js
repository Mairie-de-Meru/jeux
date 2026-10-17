// Petits sons synthétisés (Web Audio), créés au premier geste.
let ctx = null;
let muted = false;
function ac() {
  if (!ctx) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}
function tone(freq, t0, dur, type = 'sine', vol = 0.12) {
  const a = ac();
  if (!a || muted) return;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, a.currentTime + t0);
  g.gain.exponentialRampToValueAtTime(vol, a.currentTime + t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + t0 + dur);
  o.connect(g).connect(a.destination);
  o.start(a.currentTime + t0);
  o.stop(a.currentTime + t0 + dur + 0.05);
}
const seq = (notes, step = 0.1, type) => notes.forEach((f, i) => tone(f, i * step, 0.2, type));
export const sfx = {
  pick: () => tone(660, 0, 0.08, 'triangle'),
  draw: () => seq([440, 520], 0.06, 'triangle'),
  discard: () => seq([520, 392], 0.06, 'triangle'),
  lay: () => seq([523, 659, 784, 1046], 0.09),
  add: () => seq([660, 880], 0.07),
  swap: () => seq([523, 784, 659, 1046], 0.07),
  oops: () => seq([330, 392], 0.12, 'sine'),
  win: () => seq([523, 659, 784, 1046, 784, 1046, 1318], 0.12),
  turn: () => tone(880, 0, 0.1, 'sine', 0.08),
};
export const setMuted = (m) => { muted = m; };
