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
  play() { tone(520, 0, 0.12, 'triangle'); tone(780, 0.07, 0.14, 'triangle'); },
  draw() { tone(330, 0, 0.1, 'sine'); },
  oops() { tone(260, 0, 0.18, 'sine', 0.08); },
  uno() { tone(660, 0, 0.12, 'square', 0.07); tone(880, 0.1, 0.2, 'square', 0.07); },
  special() { tone(440, 0, 0.1, 'sawtooth', 0.06); tone(660, 0.08, 0.16, 'sawtooth', 0.06); },
  win() { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.13, 0.25, 'triangle', 0.14)); },
  lose() { [392, 349, 330].forEach((f, i) => tone(f, i * 0.16, 0.25, 'sine', 0.09)); },
};
