// Sons synthétisés (Web Audio). Le contexte est créé au premier geste.
let ctx = null;

function ac() {
  if (!ctx) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    try { ctx = new C(); } catch { return null; }
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, start, dur, { type = 'sine', gain = 0.16, to = null } = {}) {
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + start;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(c.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

export const sfx = {
  unlock() { ac(); },
  click() { tone(520, 0, 0.09, { type: 'triangle', gain: 0.12 }); },
  pick() { tone(380, 0, 0.1, { type: 'triangle', gain: 0.1, to: 560 }); },
  snap() { tone(660, 0, 0.14); tone(990, 0.08, 0.22); tone(1320, 0.16, 0.3, { gain: 0.1 }); },
  soft() { tone(300, 0, 0.18, { type: 'sine', gain: 0.09, to: 240 }); },
  hint() { [880, 1175, 1568].forEach((f, i) => tone(f, i * 0.08, 0.25, { gain: 0.08 })); },
  win() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.12, 0.45, { type: 'triangle', gain: 0.14 })); },
};
