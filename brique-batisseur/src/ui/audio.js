// Sons synthétisés (Web Audio). Le contexte est créé / repris au premier geste.
let ctx = null;

export function unlock() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
  } catch { /* audio indisponible */ }
}

function tone(freq, start, dur, { type = 'sine', vol = 0.18, slideTo = null } = {}) {
  if (!ctx || ctx.state !== 'running') return;
  const t0 = ctx.currentTime + start;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export const sounds = {
  /** « clic » de brique qui s'emboîte */
  place() {
    tone(520, 0, 0.07, { type: 'square', vol: 0.08, slideTo: 300 });
    tone(880, 0.02, 0.09, { type: 'triangle', vol: 0.12 });
  },
  /** « pop » de la gomme */
  pop() { tone(700, 0, 0.12, { vol: 0.2, slideTo: 180 }); },
  /** erreur douce, jamais agressive */
  soft() {
    tone(330, 0, 0.16, { type: 'triangle', vol: 0.12 });
    tone(262, 0.12, 0.22, { type: 'triangle', vol: 0.1 });
  },
  tick() { tone(600, 0, 0.05, { type: 'triangle', vol: 0.09 }); },
  /** arpège de victoire */
  win() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, i * 0.13, 0.32, { type: 'triangle', vol: 0.16 }));
  },
};
