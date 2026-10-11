// Sons synthétisés (Web Audio). Le contexte est créé / relancé au premier geste.
let ctx = null;
let enabled = true;

function getCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { ctx = new AC(); } catch (e) { return null; }
  }
  return ctx;
}

export function unlock() {
  const c = getCtx();
  if (c && c.state === 'suspended') c.resume().catch(() => {});
}
export function setEnabled(v) { enabled = !!v; }
export function isEnabled() { return enabled; }

function tone(freq, dur, { type = 'sine', vol = 0.18, delay = 0, slideTo = null } = {}) {
  const c = getCtx();
  if (!c || !enabled) return;
  try {
    const t0 = c.currentTime + delay;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(c.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  } catch (e) { /* silence */ }
}

const NOTE = { do: 523.25, re: 587.33, mi: 659.25, fa: 698.46, sol: 783.99, la: 880, si: 987.77, do2: 1046.5 };

export const sounds = {
  dice() { for (let i = 0; i < 7; i++) tone(180 + Math.random() * 200, 0.07, { type: 'square', vol: 0.08, delay: i * 0.1 }); },
  step() { tone(420, 0.1, { type: 'triangle', vol: 0.15, slideTo: 640 }); },
  good() { [NOTE.do, NOTE.mi, NOTE.sol, NOTE.do2].forEach((f, i) => tone(f, 0.18, { type: 'triangle', delay: i * 0.09 })); },
  retry() { tone(392, 0.2, { type: 'sine', vol: 0.15 }); tone(330, 0.28, { type: 'sine', vol: 0.15, delay: 0.18 }); },
  wedge() { [NOTE.do, NOTE.mi, NOTE.sol, NOTE.do2, NOTE.mi * 2].forEach((f, i) => tone(f, 0.25, { type: 'triangle', delay: i * 0.1 })); },
  win() {
    [NOTE.do, NOTE.mi, NOTE.sol, NOTE.do2, NOTE.sol, NOTE.do2, NOTE.mi * 2, NOTE.sol * 2].forEach((f, i) => tone(f, 0.3, { type: 'triangle', delay: i * 0.14 }));
  },
  tap() { tone(600, 0.06, { type: 'sine', vol: 0.1 }); },
};

export function play(name) {
  try { if (sounds[name]) sounds[name](); } catch (e) { /* silence */ }
}
