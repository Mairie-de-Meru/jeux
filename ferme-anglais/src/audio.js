// Sons synthétisés Web Audio. Aucune exception si l'API manque.
let ctx = null;
let muted = false;

function ac() {
  if (ctx) return ctx;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) ctx = new AC();
  } catch (e) {
    ctx = null;
  }
  return ctx;
}

// À appeler dans un geste utilisateur (débloque l'audio sur tablette).
export function unlock() {
  const c = ac();
  if (c && c.state === 'suspended') c.resume().catch(() => {});
}

export function setMuted(m) {
  muted = !!m;
}

function tone(freq, dur, { type = 'sine', vol = 0.18, delay = 0, slideTo = null } = {}) {
  const c = ac();
  if (!c || muted) return;
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
  } catch (e) {
    /* ignoré */
  }
}

export const sounds = {
  click: () => tone(660, 0.08, { type: 'triangle', vol: 0.12 }),
  good: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, { type: 'triangle', delay: i * 0.09 })),
  hint: () => {
    tone(330, 0.2, { vol: 0.12 });
    tone(294, 0.3, { vol: 0.1, delay: 0.16 });
  },
  star: () => [1175, 1568, 2093].forEach((f, i) => tone(f, 0.18, { type: 'sine', vol: 0.12, delay: i * 0.07 })),
  pop: () => tone(300, 0.12, { type: 'sine', slideTo: 700, vol: 0.14 }),
  win: () => [523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, 0.28, { type: 'triangle', delay: i * 0.13 })),
};
