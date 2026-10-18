// Petits sons synthétisés (Web Audio), aucun fichier.
let ctx = null;
function ac() {
  if (!ctx) { const A = window.AudioContext || window.webkitAudioContext; if (A) ctx = new A(); }
  if (ctx && ctx.state === 'suspended') ctx.resume();
  return ctx;
}
function tone(freq, t0, dur, type = 'sine', vol = 0.12) {
  const a = ac(); if (!a) return;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0, a.currentTime + t0);
  g.gain.linearRampToValueAtTime(vol, a.currentTime + t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + t0 + dur);
  o.connect(g).connect(a.destination); o.start(a.currentTime + t0); o.stop(a.currentTime + t0 + dur + 0.05);
}
function tock(freq, vol = 0.2) {
  const a = ac(); if (!a) return;
  const n = Math.floor(a.sampleRate * 0.05);
  const buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3);
  const s = a.createBufferSource(); s.buffer = buf;
  const f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 1.2;
  const g = a.createGain(); g.gain.value = vol;
  s.connect(f).connect(g).connect(a.destination); s.start();
}
export const sfx = {
  select() { tone(660, 0, 0.05, 'triangle', 0.06); },
  move() { tock(900); tone(180, 0, 0.08, 'sine', 0.1); },
  capture() { tock(600, 0.35); tone(140, 0, 0.14, 'square', 0.07); tone(220, 0.05, 0.1, 'triangle', 0.08); },
  check() { tone(740, 0, 0.12, 'square', 0.06); tone(988, 0.1, 0.18, 'square', 0.06); },
  promote() { [523, 659, 784].forEach((f, i) => tone(f, i * 0.07, 0.14, 'triangle', 0.1)); },
  oops() { tone(240, 0, 0.14, 'sine', 0.07); },
  win() { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.13, 0.25, 'triangle', 0.14)); },
  draw() { [440, 440, 392].forEach((f, i) => tone(f, i * 0.16, 0.22, 'sine', 0.09)); },
  lose() { [392, 349, 311].forEach((f, i) => tone(f, i * 0.16, 0.25, 'sine', 0.09)); },
};
