// Sons synthétisés (Web Audio). Le contexte naît au premier geste de l'enfant.
let ctx = null;

function ac() {
  if (!ctx) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function note(freq, debut, duree, { type = 'sine', vol = 0.18, glisse = null } = {}) {
  const a = ac();
  if (!a) return;
  const t = a.currentTime + debut;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (glisse) o.frequency.exponentialRampToValueAtTime(glisse, t + duree);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + duree);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + duree + 0.05);
}

export const audio = {
  unlock() { ac(); },
  plic() { note(900, 0, 0.14, { glisse: 380, vol: 0.2 }); },
  bulle() { note(320, 0, 0.12, { glisse: 640, vol: 0.12 }); },
  clic() { note(520, 0, 0.06, { type: 'triangle', vol: 0.1 }); },
  succes() { [523, 659, 784, 1047].forEach((f, i) => note(f, i * 0.11, 0.3, { type: 'triangle', vol: 0.16 })); },
  indice() { note(660, 0, 0.25, { vol: 0.12 }); note(880, 0.14, 0.3, { vol: 0.12 }); },
  vider() { note(500, 0, 0.35, { glisse: 180, vol: 0.12 }); },
};
