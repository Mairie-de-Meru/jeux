// Sons synthétisés (Web Audio). Le contexte est créé au premier geste.
let ctx = null;
let master = null;

export function unlockAudio() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
  } catch {
    ctx = null;
  }
}

function tone(freq, dur, { type = 'sine', vol = 0.3, delay = 0, slideTo = null } = {}) {
  if (!ctx) return;
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

export const sounds = {
  good() {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, { type: 'triangle', delay: i * 0.08 }));
  },
  soft() {
    tone(330, 0.35, { type: 'sine', vol: 0.25, slideTo: 262 });
    tone(262, 0.4, { type: 'sine', vol: 0.2, delay: 0.15 });
  },
  tap(n = 0) {
    tone(440 + n * 40, 0.12, { type: 'sine', vol: 0.2 });
  },
  stage() {
    tone(200, 0.25, { type: 'square', vol: 0.15, slideTo: 90 });
    tone(120, 0.2, { type: 'sine', vol: 0.3, delay: 0.2 });
  },
  beep(final = false) {
    tone(final ? 1046 : 660, final ? 0.5 : 0.18, { type: 'square', vol: 0.18 });
  },
  liftoff(duration = 4) {
    if (!ctx) return;
    const len = Math.floor(ctx.sampleRate * duration);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(2200, ctx.currentTime + duration * 0.7);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.5, ctx.currentTime + 0.5);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    src.connect(filter).connect(g).connect(master);
    src.start();
  },
  fanfare() {
    [523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, { type: 'triangle', delay: i * 0.12 }));
  },
};
