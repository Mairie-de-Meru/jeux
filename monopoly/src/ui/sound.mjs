// Petits sons synthétisés (Web Audio).
let ctx = null; let muted = false;
function ac() {
  if (muted) return null;
  try { ctx ||= new (window.AudioContext || window.webkitAudioContext)(); if (ctx.state === 'suspended') ctx.resume(); } catch { return null; }
  return ctx;
}
function tone(freq, dur = 0.12, type = 'sine', vol = 0.12, delay = 0, slideTo) {
  const a = ac(); if (!a) return;
  const t = a.currentTime + delay; const o = a.createOscillator(); const g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t); if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur = 0.08, vol = 0.1, delay = 0) {
  const a = ac(); if (!a) return;
  const n = Math.floor(a.sampleRate * dur); const buf = a.createBuffer(1, n, a.sampleRate); const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = a.createBufferSource(); const g = a.createGain(); g.gain.value = vol; s.buffer = buf; s.connect(g).connect(a.destination); s.start(a.currentTime + delay);
}
const SFX = {
  click: () => tone(660, 0.07, 'triangle', 0.1),
  step: () => tone(420, 0.06, 'sine', 0.07, 0, 520),
  dice: () => { for (let i = 0; i < 6; i++) noise(0.05, 0.12, i * 0.1); },
  coin: () => { tone(988, 0.1, 'square', 0.07); tone(1318, 0.18, 'square', 0.07, 0.09); },
  pay: () => tone(330, 0.2, 'triangle', 0.1, 0, 220),
  buy: () => { tone(523, 0.1, 'triangle', 0.12); tone(659, 0.1, 'triangle', 0.12, 0.1); tone(784, 0.2, 'triangle', 0.12, 0.2); },
  card: () => { tone(700, 0.08, 'sine', 0.1); tone(900, 0.12, 'sine', 0.1, 0.08); },
  build: () => { tone(300, 0.08, 'square', 0.08); tone(450, 0.12, 'square', 0.08, 0.1); },
  jail: () => { tone(200, 0.3, 'sawtooth', 0.09, 0, 120); },
  oops: () => tone(300, 0.25, 'triangle', 0.1, 0, 200),
  win: () => { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, 'triangle', 0.13, i * 0.14)); },
};
export const sfx = (name) => { (SFX[name] || SFX.click)(); };
export const setMuted = (m) => { muted = m; };
export const isMuted = () => muted;
