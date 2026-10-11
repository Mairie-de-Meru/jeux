// Sons synthétisés (Web Audio). Le contexte est créé/repris au premier pointerdown.
let ctx = null;
let master = null;

export function initAudio() {
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
  } catch { /* audio indisponible : on continue sans son */ }
}

export function installAudioUnlock() {
  const once = () => initAudio();
  window.addEventListener('pointerdown', once, { passive: true });
}

function tone(freq, start, dur, { type = 'sine', gain = 0.5, slideTo = null } = {}) {
  if (!ctx) return;
  const t0 = ctx.currentTime + start;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(master);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

function noise(start, dur, { gain = 0.4, freq = 1800 } = {}) {
  if (!ctx) return;
  const t0 = ctx.currentTime + start;
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.value = gain;
  src.connect(f).connect(g).connect(master);
  src.start(t0);
}

export const sfx = {
  pop() { tone(420, 0, 0.12, { type: 'sine', slideTo: 760, gain: 0.5 }); },
  swish() { noise(0, 0.15, { gain: 0.35, freq: 3500 }); },
  chop() { noise(0, 0.14, { gain: 0.7, freq: 2200 }); tone(180, 0, 0.1, { type: 'triangle', slideTo: 90, gain: 0.5 }); },
  success() { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, i * 0.09, 0.28, { type: 'triangle', gain: 0.45 })); },
  soft() { tone(330, 0, 0.22, { type: 'sine', slideTo: 262, gain: 0.35 }); },
  fanfare() {
    const seq = [[523.25, 0], [523.25, 0.14], [523.25, 0.28], [698.46, 0.42], [587.33, 0.7], [698.46, 0.84], [880, 1.12]];
    seq.forEach(([f, t]) => tone(f, t, t > 1 ? 0.7 : 0.22, { type: 'square', gain: 0.22 }));
    [261.63, 349.23, 440].forEach((f) => tone(f, 1.12, 0.7, { type: 'triangle', gain: 0.3 }));
  },
};
