// Sons synthétisés (Web Audio). Le contexte est débloqué au premier pointerdown.
let ctx = null;

export function unlock() {
  if (!ctx) {
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ctx = null; }
  }
  if (ctx && ctx.state === 'suspended') ctx.resume();
}

function tone(freq, start, dur, { type = 'sine', gain = 0.18, slideTo = 0 } = {}) {
  if (!ctx) return;
  const t0 = ctx.currentTime + start;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

const NOTES = [523.25, 587.33, 659.25, 698.46, 783.99, 880, 987.77, 1046.5];

export const sfx = {
  click() { tone(660, 0, 0.08, { type: 'triangle', gain: 0.12 }); },
  pop() { tone(300, 0, 0.12, { type: 'sine', gain: 0.25, slideTo: 760 }); },
  note(i) { tone(NOTES[Math.min(Math.max(i, 0), NOTES.length - 1)], 0, 0.22, { type: 'triangle', gain: 0.2 }); },
  success() {
    tone(523.25, 0, 0.14, { type: 'triangle' });
    tone(659.25, 0.1, 0.14, { type: 'triangle' });
    tone(783.99, 0.2, 0.28, { type: 'triangle' });
  },
  hint() { tone(392, 0, 0.18, { type: 'sine', gain: 0.15 }); tone(330, 0.16, 0.26, { type: 'sine', gain: 0.15 }); },
  fanfare() {
    [523.25, 523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, i * 0.14, i === 4 ? 0.6 : 0.16, { type: 'square', gain: 0.1 }));
    tone(1318.5, 0.75, 0.5, { type: 'triangle', gain: 0.12 });
  },
};
