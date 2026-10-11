// Sons synthétisés (Web Audio). L'AudioContext démarre au premier pointerdown.
let ctx = null;
let muted = false;

export function unlockAudio() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
  } catch (e) { /* audio indisponible : le jeu reste jouable */ }
}
export function setMuted(m) { muted = m; }

function tone(freq, start, dur, { type = 'sine', gain = 0.18, slideTo = null } = {}) {
  if (!ctx || muted) return;
  const t0 = ctx.currentTime + start;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t0); o.stop(t0 + dur + 0.05);
}

export const sounds = {
  water() { for (let i = 0; i < 5; i++) tone(900 + Math.random() * 500, i * 0.07, 0.12, { slideTo: 400, gain: 0.12 }); },
  sun() { [523, 659, 784].forEach((f, i) => tone(f, i * 0.09, 0.35, { type: 'triangle', gain: 0.13 })); },
  pop() { tone(300, 0, 0.14, { slideTo: 800, gain: 0.22 }); },
  grow() { [392, 523, 659].forEach((f, i) => tone(f, i * 0.08, 0.2, { type: 'triangle' })); },
  win() { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, i * 0.13, 0.3, { type: 'triangle', gain: 0.16 })); },
  hint() { tone(330, 0, 0.25, { gain: 0.1 }); tone(294, 0.15, 0.3, { gain: 0.1 }); },
  tap() { tone(600, 0, 0.06, { gain: 0.1 }); },
};
