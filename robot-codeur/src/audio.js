// Sons synthétisés (Web Audio). Aucun fichier nécessaire ; silencieux si l'API manque.
let ctx = null;

function ac() {
  if (ctx) return ctx;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  } catch {
    return null;
  }
  return ctx;
}

export function unlockAudio() {
  const c = ac();
  if (c && c.state === 'suspended') c.resume().catch(() => {});
}

function tone(freq, dur, { type = 'sine', gain = 0.15, at = 0, slide = null } = {}) {
  const c = ac();
  if (!c) return;
  try {
    const t0 = c.currentTime + at;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(c.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  } catch { /* ignore */ }
}

export const sfx = {
  click() { tone(660, 0.08, { type: 'triangle', gain: 0.14 }); },
  pop() { tone(500, 0.1, { type: 'sine', gain: 0.12, slide: 250 }); },
  step() { tone(220, 0.1, { type: 'square', gain: 0.07, slide: 160 }); },
  turn() { tone(380, 0.12, { type: 'triangle', gain: 0.1, slide: 520 }); },
  key() { tone(988, 0.1, { type: 'sine', gain: 0.15 }); tone(1318, 0.22, { type: 'sine', gain: 0.15, at: 0.08 }); },
  bonk() { tone(160, 0.22, { type: 'sine', gain: 0.22, slide: 70 }); },
  nope() { tone(240, 0.1, { type: 'triangle', gain: 0.14 }); tone(200, 0.12, { type: 'triangle', gain: 0.14, at: 0.1 }); },
  start() { tone(523, 0.1, { type: 'triangle', gain: 0.12 }); tone(784, 0.14, { type: 'triangle', gain: 0.12, at: 0.09 }); },
  win() {
    [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.3, { type: 'triangle', gain: 0.15, at: i * 0.11 }));
    tone(1568, 0.6, { type: 'sine', gain: 0.1, at: 0.6 });
  },
};
