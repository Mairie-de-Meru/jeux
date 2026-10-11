// Sons synthétisés (Web Audio) : aucun fichier.
let ctx = null;
export const son = { muet: false };

function audio() {
  if (son.muet) return null;
  try {
    if (!ctx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      ctx = new C();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function note(freq, debut, duree, { type = 'triangle', vol = 0.16, vers } = {}) {
  const a = audio();
  if (!a) return;
  const t0 = a.currentTime + debut;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (vers) o.frequency.linearRampToValueAtTime(vers, t0 + duree);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duree);
  o.connect(g).connect(a.destination);
  o.start(t0);
  o.stop(t0 + duree + 0.05);
}

export const clic = () => note(620, 0, 0.07, { vol: 0.1 });
export const juste = () => { note(660, 0, 0.12); note(880, 0.1, 0.12); note(1175, 0.2, 0.22); };
export const faux = () => note(330, 0, 0.3, { type: 'sine', vol: 0.12, vers: 250 }); // doux, jamais agressif
export const fanfare = () => {
  [523, 659, 784, 1047].forEach((f, i) => note(f, i * 0.13, 0.22));
  note(1047, 0.55, 0.5, { vol: 0.18 });
  note(784, 0.55, 0.5, { vol: 0.12 });
};
