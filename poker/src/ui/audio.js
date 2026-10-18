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
  g.gain.linearRampToValueAtTime(vol, a.currentTime + t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + t0 + dur);
  o.connect(g).connect(a.destination); o.start(a.currentTime + t0); o.stop(a.currentTime + t0 + dur + 0.05);
}
export const sfx = {
  chip() { tone(900, 0, 0.05, 'square', 0.04); tone(1200, 0.05, 0.06, 'square', 0.04); },
  card() { tone(300, 0, 0.07, 'triangle', 0.08); },
  fold() { tone(300, 0, 0.12, 'sine', 0.08); tone(240, 0.08, 0.14, 'sine', 0.07); },
  check() { tone(500, 0, 0.06, 'triangle', 0.08); tone(500, 0.1, 0.06, 'triangle', 0.08); },
  raise() { tone(440, 0, 0.1, 'sawtooth', 0.06); tone(660, 0.08, 0.16, 'sawtooth', 0.06); },
  allin() { [330, 440, 554, 740].forEach((f, i) => tone(f, i * 0.08, 0.16, 'sawtooth', 0.06)); },
  show() { tone(520, 0, 0.12, 'triangle'); tone(780, 0.07, 0.14, 'triangle'); },
  oops() { tone(260, 0, 0.18, 'sine', 0.08); },
  win() { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.13, 0.25, 'triangle', 0.14)); },
  lose() { [392, 349, 330].forEach((f, i) => tone(f, i * 0.16, 0.25, 'sine', 0.09)); },
};
