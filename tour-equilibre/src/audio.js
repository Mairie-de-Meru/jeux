// Sons synthétisés (Web Audio). Rien n'est créé avant le premier geste.
let ctx = null, master = null, noiseBuf = null, wind = null;

export function unlock() {
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
  } catch { ctx = null; }
}

function tone({ f1, f2 = f1, dur = 0.15, type = 'sine', vol = 0.3, delay = 0 }) {
  if (!ctx) return;
  const t0 = ctx.currentTime + delay;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f1, t0);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(master);
  o.start(t0); o.stop(t0 + dur + 0.02);
}

function noise() {
  if (!noiseBuf) {
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const s = ctx.createBufferSource();
  s.buffer = noiseBuf; s.loop = true;
  return s;
}

export function click() { tone({ f1: 660, f2: 880, dur: 0.08, type: 'triangle', vol: 0.25 }); }

export function whoosh() {
  if (!ctx) return;
  const t0 = ctx.currentTime;
  const s = noise(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  f.type = 'bandpass'; f.Q.value = 1.2;
  f.frequency.setValueAtTime(1500, t0);
  f.frequency.exponentialRampToValueAtTime(400, t0 + 0.25);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.18, t0 + 0.03);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.28);
  s.connect(f); f.connect(g); g.connect(master);
  s.start(t0); s.stop(t0 + 0.3);
}

// La hauteur monte avec la tour (height en mètres).
export function pop(height = 0) {
  const f = 220 * Math.pow(2, Math.min(height, 8) / 6);
  tone({ f1: f * 1.6, f2: f, dur: 0.13, type: 'sine', vol: 0.4 });
}

export function win() {
  [523, 659, 784, 1047, 1319].forEach((f, i) => tone({ f1: f, dur: 0.22, type: 'triangle', vol: 0.3, delay: i * 0.11 }));
}

export function fall() {
  if (!ctx) return;
  const t0 = ctx.currentTime, dur = 1.1;
  const o = ctx.createOscillator(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(520, t0);
  o.frequency.exponentialRampToValueAtTime(110, t0 + dur);
  lfo.frequency.value = 7; lg.gain.value = 25;
  lfo.connect(lg); lg.connect(o.frequency);
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1400;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.22, t0 + 0.05);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(f); f.connect(g); g.connect(master);
  o.start(t0); lfo.start(t0); o.stop(t0 + dur + 0.05); lfo.stop(t0 + dur + 0.05);
}

export function oops() {
  tone({ f1: 440, f2: 330, dur: 0.18, type: 'triangle', vol: 0.25 });
  tone({ f1: 330, f2: 247, dur: 0.25, type: 'triangle', vol: 0.25, delay: 0.16 });
}

export function startWind() {
  if (!ctx || wind) return;
  const s = noise(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  f.type = 'bandpass'; f.frequency.value = 500; f.Q.value = 0.6;
  g.gain.value = 0;
  s.connect(f); f.connect(g); g.connect(master);
  s.start();
  wind = { s, g, f };
}
// level dans [0,1]
export function setWind(level) {
  if (!ctx || !wind) return;
  const t = ctx.currentTime;
  wind.g.gain.setTargetAtTime(0.02 + level * 0.1, t, 0.2);
  wind.f.frequency.setTargetAtTime(350 + level * 400, t, 0.2);
}
export function stopWind() {
  if (!wind) return;
  try { wind.s.stop(); } catch { /* déjà arrêté */ }
  wind = null;
}
