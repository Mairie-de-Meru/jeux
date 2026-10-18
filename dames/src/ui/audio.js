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
  select() { tone(620, 0, 0.06, 'triangle', 0.08); },
  move() { tone(330, 0, 0.07, 'triangle', 0.1); tone(250, 0.03, 0.08, 'sine', 0.08); },
  capture(i = 0) { tone(440 + i * 90, 0, 0.09, 'square', 0.05); tone(660 + i * 90, 0.06, 0.12, 'triangle', 0.1); },
  king() { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.07, 0.18, 'triangle', 0.1)); },
  oops() { tone(260, 0, 0.16, 'sine', 0.07); },
  undo() { tone(500, 0, 0.07, 'triangle', 0.08); tone(380, 0.07, 0.09, 'triangle', 0.08); },
  win() { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.13, 0.25, 'triangle', 0.14)); },
  draw() { [440, 440, 523].forEach((f, i) => tone(f, i * 0.14, 0.2, 'triangle', 0.1)); },
  lose() { [392, 349, 330].forEach((f, i) => tone(f, i * 0.16, 0.25, 'sine', 0.09)); },
};
