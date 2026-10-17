// Petits sons synthétisés (Web Audio), démarrés au premier geste.
let ctx = null, master = null;
export function unlock() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.3;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
  } catch (e) { ctx = null; }
}
function tone(freq, start, d, type = 'sine', vol = 0.5, slideTo = null) {
  if (!ctx) return;
  const t0 = ctx.currentTime + start;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + d);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
  o.connect(g).connect(master);
  o.start(t0);
  o.stop(t0 + d + 0.05);
}
export const hop = (i = 0) => tone(420 + (i % 8) * 40, 0, 0.12, 'triangle', 0.4);
export const roll = () => { for (let i = 0; i < 6; i++) tone(180 + Math.random() * 120, i * 0.12, 0.07, 'square', 0.15); };
export const good = () => { tone(523, 0, 0.12, 'triangle'); tone(659, 0.09, 0.12, 'triangle'); tone(784, 0.18, 0.25, 'triangle'); };
export const oops = () => tone(330, 0, 0.25, 'sine', 0.35, 260);
export const special = () => { tone(660, 0, 0.12, 'sine'); tone(880, 0.1, 0.2, 'sine'); };
export const fanfare = () => { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, i * 0.14, 0.22, 'triangle', 0.5)); };
