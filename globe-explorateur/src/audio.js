// Sons synthétisés (Web Audio) et lecture à voix haute (speechSynthesis fr-FR).
let ctx = null;
let voixAuto = true;

function ac() {
  if (!ctx) {
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; }
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function tone(freq, debut, duree, type = 'sine', vol = 0.18) {
  const c = ac(); if (!c) return;
  const t = c.currentTime + debut;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + duree);
  o.connect(g).connect(c.destination);
  o.start(t); o.stop(t + duree + 0.05);
}

export function debloquer() { ac(); }

export const sons = {
  tap() { tone(520, 0, 0.08, 'triangle', 0.1); },
  ok() { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.3, 'triangle', 0.2)); },
  oups() { tone(392, 0, 0.18, 'sine', 0.15); tone(330, 0.16, 0.28, 'sine', 0.15); }, // doux, jamais punitif
  etoile() { tone(1319, 0, 0.25, 'sine', 0.14); tone(1760, 0.1, 0.35, 'sine', 0.12); },
  pose() { tone(300, 0, 0.12, 'square', 0.06); tone(600, 0.08, 0.18, 'triangle', 0.12); },
  fanfare() { [523, 523, 523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.13, 0.28, 'square', 0.1)); },
};

export function voixActive() { return voixAuto; }
export function setVoixAuto(v) { voixAuto = !!v; if (!v) stopParole(); }

function voixFr() {
  const vs = window.speechSynthesis.getVoices();
  return vs.find((v) => v.lang === 'fr-FR') || vs.find((v) => v.lang && v.lang.startsWith('fr')) || null;
}

export function stopParole() {
  try { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); } catch { /* rien */ }
}

// force : lecture même si la voix automatique est coupée (bouton haut-parleur).
export function parle(texte, force = false) {
  if (!texte || (!voixAuto && !force)) return;
  try {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(texte);
    u.lang = 'fr-FR'; u.rate = 0.92; u.pitch = 1.1;
    const v = voixFr(); if (v) u.voice = v;
    window.speechSynthesis.speak(u);
  } catch { /* la voix est facultative */ }
}
