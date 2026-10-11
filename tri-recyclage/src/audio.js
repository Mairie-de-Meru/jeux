// Sons synthétisés Web Audio, démarrés au premier geste.
let ctx = null;
let master = null;

export function unlock() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.35;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
  } catch (e) { ctx = null; }
}

function tone(freq, start, dur, type = 'sine', vol = 0.6, slideTo = null) {
  if (!ctx) return;
  const t0 = ctx.currentTime + start;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(master);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

export function good() {
  tone(523, 0, 0.14, 'triangle');
  tone(659, 0.09, 0.14, 'triangle');
  tone(784, 0.18, 0.28, 'triangle');
}
export function bad() {
  tone(330, 0, 0.18, 'sine', 0.5, 262);
  tone(262, 0.16, 0.25, 'sine', 0.4, 220);
}
export function pop() {
  tone(500, 0, 0.1, 'sine', 0.5, 900);
}
export function win() {
  [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.25, 'triangle'));
  tone(1047, 0.5, 0.6, 'sine', 0.4);
}
export function soft() {
  tone(300, 0, 0.18, 'sine', 0.25, 180);
}
