// Sons synthétisés (Web Audio). Le contexte est créé au premier geste.
let ctx = null;
export function unlockAudio() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
  } catch (_) { ctx = null; }
}

function tone(freq, start, dur, { type = 'sine', vol = 0.18, slideTo = null } = {}) {
  if (!ctx) return;
  const t = ctx.currentTime + start;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}

export const sounds = {
  flip: () => tone(380, 0, 0.12, { type: 'triangle', slideTo: 700 }),
  ding: () => { tone(880, 0, 0.25); tone(1320, 0.1, 0.35); },
  mismatch: () => tone(330, 0, 0.3, { type: 'sine', vol: 0.12, slideTo: 220 }),
  victory: () => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, i * 0.14, 0.3, { type: 'triangle' })),
};
