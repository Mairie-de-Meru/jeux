// Progression (étoiles par enquête et palier). Module pur : le storage est injecté.
const CLE = 'detective-phrases-v1';
const ENQ = ['fautes', 'pronoms', 'temps', 'mystere'];

export function progressionVide() {
  const resultats = {};
  for (const e of ENQ) resultats[e] = { 1: 0, 2: 0, 3: 0 };
  return { version: 1, resultats };
}

export function chargerProgression(storage) {
  const prog = progressionVide();
  try {
    const brut = storage && storage.getItem(CLE);
    if (!brut) return prog;
    const lu = JSON.parse(brut);
    for (const e of ENQ) {
      for (const pal of [1, 2, 3]) {
        const n = lu && lu.resultats && lu.resultats[e] && lu.resultats[e][pal];
        if (Number.isInteger(n) && n >= 0 && n <= 3) prog.resultats[e][pal] = n;
      }
    }
  } catch {
    // stockage indisponible ou corrompu : on repart d'une progression vide (en mémoire)
  }
  return prog;
}

export function etoilesDe(prog, enquete, palier) {
  return (prog.resultats[enquete] && prog.resultats[enquete][palier]) || 0;
}

export function enregistrerResultat(prog, enquete, palier, etoiles) {
  const suivant = JSON.parse(JSON.stringify(prog));
  if (!suivant.resultats[enquete]) suivant.resultats[enquete] = { 1: 0, 2: 0, 3: 0 };
  suivant.resultats[enquete][palier] = Math.max(etoilesDe(prog, enquete, palier), etoiles);
  return suivant;
}

export function palierDebloque(prog, enquete, palier) {
  if (palier <= 1) return true;
  return etoilesDe(prog, enquete, palier - 1) >= 1;
}

export function sauverProgression(storage, prog) {
  try {
    storage.setItem(CLE, JSON.stringify(prog));
    return true;
  } catch {
    return false;
  }
}
