// Sons synthétisés (Web Audio). Le contexte est créé au premier geste de l'utilisateur.
let ctx = null;
let actif = true;

export function setSon(v) { actif = !!v; }
export function sonActif() { return actif; }

function contexte() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}
export function debloquer() { contexte(); }

function note(freq, debut, duree, { type = 'sine', vol = 0.18, fin = null } = {}) {
  const c = contexte();
  if (!c || !actif) return;
  const t0 = c.currentTime + debut;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (fin) o.frequency.exponentialRampToValueAtTime(fin, t0 + duree);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duree);
  o.connect(g).connect(c.destination);
  o.start(t0);
  o.stop(t0 + duree + 0.05);
}

export const sons = {
  clic() { note(660, 0, 0.08, { type: 'triangle' }); },
  de() { for (let i = 0; i < 6; i++) note(180 + Math.random() * 160, i * 0.07, 0.06, { type: 'square', vol: 0.07 }); },
  pas() { note(420, 0, 0.09, { type: 'triangle', fin: 300, vol: 0.14 }); },
  sortie() { note(392, 0, 0.12); note(523, 0.1, 0.12); note(659, 0.2, 0.18); },
  prise() { note(500, 0, 0.3, { type: 'triangle', fin: 220, vol: 0.14 }); },
  arrivee() { note(523, 0, 0.12); note(659, 0.1, 0.12); note(784, 0.2, 0.12); note(1047, 0.3, 0.3); },
  victoire() { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => note(f, i * 0.13, 0.22, { type: 'triangle' })); },
  passe() { note(330, 0, 0.18, { type: 'sine', fin: 262, vol: 0.12 }); },
};
