const MODES = ['echo', 'rythme'];

export const createProgression = () => ({ echo: [0, 0, 0], rythme: [0, 0, 0] });

export function enregistrer(prog, mode, palier, etoiles) {
  if (!MODES.includes(mode) || !(palier >= 1 && palier <= 3)) return prog;
  const e = Math.max(0, Math.min(3, Math.floor(etoiles) || 0));
  const ligne = prog[mode].map((v, i) => (i === palier - 1 ? Math.max(v, e) : v));
  return { ...prog, [mode]: ligne };
}

export function palierDebloque(prog, mode, palier) {
  if (palier <= 1) return true;
  return (prog[mode]?.[palier - 2] ?? 0) >= 1;
}

export const totalEtoiles = (prog) => MODES.reduce((s, m) => s + prog[m].reduce((a, b) => a + b, 0), 0);

export const serialiser = (prog) => JSON.stringify(prog);

export function deserialiser(texte) {
  const prog = createProgression();
  try {
    const o = JSON.parse(texte);
    if (!o || typeof o !== 'object') return prog;
    for (const m of MODES) {
      if (!Array.isArray(o[m])) continue;
      prog[m] = [0, 1, 2].map((i) => {
        const v = o[m][i];
        return Number.isInteger(v) ? Math.max(0, Math.min(3, v)) : 0;
      });
    }
  } catch {
    /* entrée invalide : progression vide */
  }
  return prog;
}
