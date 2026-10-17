// Sons synthétisés (Web Audio) et lecture à voix haute (speechSynthesis fr-FR).
let ctx = null;
let muted = false;
export function setMuted(m) { muted = m; if (m && 'speechSynthesis' in window) speechSynthesis.cancel(); }
export function isMuted() { return muted; }

function ac() {
  if (!ctx) {
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, dur = 0.12, type = 'sine', vol = 0.12, delay = 0) {
  if (muted) return;
  const c = ac();
  if (!c) return;
  const t = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(c.destination);
  o.start(t); o.stop(t + dur + 0.02);
}

export const sfx = {
  key: () => tone(620, 0.06, 'triangle', 0.08),
  del: () => tone(420, 0.06, 'triangle', 0.07),
  flip: (i = 0) => tone(500 + i * 70, 0.09, 'sine', 0.09),
  nope: () => { tone(330, 0.12, 'sine', 0.07); tone(294, 0.16, 'sine', 0.06, 0.1); }, // doux, pas une alerte
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.12, i * 0.12)),
  end: () => [392, 440].forEach((f, i) => tone(f, 0.25, 'sine', 0.07, i * 0.15)), // neutre, ni triste ni sonnerie
  hint: () => tone(880, 0.15, 'sine', 0.09),
};

export function speak(text) {
  if (muted || !('speechSynthesis' in window)) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'fr-FR'; u.rate = 0.9; u.pitch = 1.05;
    speechSynthesis.speak(u);
  } catch (e) { /* ignoré */ }
}
