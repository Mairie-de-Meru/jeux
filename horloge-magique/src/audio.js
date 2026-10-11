// Sons synthétisés (Web Audio). Tout est protégé : l'audio ne doit jamais casser le jeu.
let ctx = null;
let muted = false;

function ac() {
  try {
    if (!ctx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      ctx = new C();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch (e) {
    return null;
  }
}

export function unlock() { ac(); }
export function setMuted(m) { muted = !!m; }

function beep(freq, dur, { type = 'sine', vol = 0.15, delay = 0, slideTo = null } = {}) {
  if (muted) return;
  try {
    const c = ac();
    if (!c) return;
    const t0 = c.currentTime + delay;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(c.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  } catch (e) { /* ignoré */ }
}

export function tick() { beep(1400, 0.04, { type: 'square', vol: 0.05 }); }
export function click() { beep(520, 0.09, { type: 'triangle', vol: 0.18, slideTo: 330 }); }
export function success() {
  [523, 659, 784, 1047].forEach((f, i) => beep(f, 0.22, { type: 'triangle', vol: 0.18, delay: i * 0.1 }));
}
export function hint() {
  beep(392, 0.22, { type: 'sine', vol: 0.15 });
  beep(330, 0.3, { type: 'sine', vol: 0.12, delay: 0.18 });
}
export function fanfare() {
  [523, 659, 784, 659, 784, 1047].forEach((f, i) => beep(f, 0.25, { type: 'triangle', vol: 0.18, delay: i * 0.12 }));
}
