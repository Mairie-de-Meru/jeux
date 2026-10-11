export const RYTHME_PALIERS = Object.freeze([
  { palier: 1, frappes: 3, bpm: 70, tolerance: 0.2 },
  { palier: 2, frappes: 5, bpm: 85, tolerance: 0.16 },
  { palier: 3, frappes: 7, bpm: 100, tolerance: 0.12 },
]);

export const periode = (bpm) => 60000 / bpm;

export function tempsDesBattements({ bpm, frappes, depart = 0, decompte = 2 }) {
  const p = periode(bpm);
  return Array.from({ length: frappes }, (_, i) => depart + (decompte + i) * p);
}

export function jugerFrappe(t, cible, bpm, tolerance) {
  const p = periode(bpm);
  const ecart = t - cible;
  const abs = Math.abs(ecart);
  if (abs > 0.5 * p) return { verdict: 'hors', ecart };
  if (abs <= tolerance * p) return { verdict: 'juste', ecart };
  return { verdict: ecart < 0 ? 'avance' : 'retard', ecart };
}

const config = (palier) => RYTHME_PALIERS.find((p) => p.palier === palier) ?? RYTHME_PALIERS[0];

export function createRythme({ palier, depart = 0 }) {
  const cfg = config(palier);
  return {
    palier: cfg.palier,
    bpm: cfg.bpm,
    tolerance: cfg.tolerance,
    frappes: cfg.frappes,
    cibles: tempsDesBattements({ bpm: cfg.bpm, frappes: cfg.frappes, depart }),
    index: 0,
    resultats: [],
    fini: false,
  };
}

export function frapper(etat, t) {
  if (etat.fini) return { etat, verdict: 'ignore' };
  const { verdict } = jugerFrappe(t, etat.cibles[etat.index], etat.bpm, etat.tolerance);
  if (verdict === 'hors') return { etat, verdict };
  const index = etat.index + 1;
  return {
    etat: { ...etat, index, resultats: [...etat.resultats, verdict], fini: index >= etat.frappes },
    verdict,
  };
}

export function manquees(etat, t) {
  if (etat.fini) return etat;
  const p = periode(etat.bpm);
  let index = etat.index;
  const resultats = [...etat.resultats];
  while (index < etat.frappes && t - etat.cibles[index] > 0.5 * p) {
    resultats.push('manque');
    index++;
  }
  if (index === etat.index) return etat;
  return { ...etat, index, resultats, fini: index >= etat.frappes };
}

export function etoilesRythme(resultats) {
  if (!resultats.length) return 1;
  const part = resultats.filter((r) => r === 'juste').length / resultats.length;
  if (part >= 0.8) return 3;
  if (part >= 0.5) return 2;
  return 1;
}
