// Sons synthétisés (Web Audio). Toute erreur est silencieuse.
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
  } catch { /* silencieux */ }
}

export function setMuted(m) { muted = !!m; }

function tone(freq, dur, type = 'sine', vol = 0.15, delay = 0, slideTo = null) {
  try {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  } catch { /* silencieux */ }
}

export const sfx = {
  // « tink » de pièce : plus aigu pour les petites valeurs.
  tink(value = 100) {
    const f = value >= 500 ? 520 : 1900 - Math.min(value, 200) * 4;
    tone(f, 0.18, 'triangle', 0.16);
    tone(f * 1.5, 0.12, 'sine', 0.08, 0.02);
  },
  remove() { tone(520, 0.14, 'sine', 0.13, 0, 300); },
  click() { tone(700, 0.06, 'square', 0.05); },
  success() { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, 0.28, 'triangle', 0.16, i * 0.11)); },
  hint() { tone(330, 0.22, 'sine', 0.14); tone(262, 0.3, 'sine', 0.12, 0.16); },
  star() { tone(1318, 0.15, 'sine', 0.12); tone(1760, 0.2, 'sine', 0.09, 0.07); },
};
