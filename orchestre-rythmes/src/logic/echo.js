import { instrumentsPourPalier } from './instruments.js';

export const ECHO_PALIERS = Object.freeze([
  { palier: 1, longueurCible: 3, longueurDepart: 1, instruments: 4 },
  { palier: 2, longueurCible: 5, longueurDepart: 2, instruments: 5 },
  { palier: 3, longueurCible: 7, longueurDepart: 3, instruments: 6 },
]);

export function createEcho({ palier, rng }) {
  const cfg = ECHO_PALIERS.find((p) => p.palier === palier) ?? ECHO_PALIERS[0];
  const ids = instrumentsPourPalier(cfg.palier);
  const sequence = [];
  while (sequence.length < cfg.longueurCible) {
    const n = sequence.length;
    let id = ids[rng.int(ids.length)];
    if (n >= 2 && sequence[n - 1] === id && sequence[n - 2] === id) {
      const autres = ids.filter((x) => x !== id);
      id = autres[rng.int(autres.length)];
    }
    sequence.push(id);
  }
  return {
    palier: cfg.palier,
    longueurCible: cfg.longueurCible,
    sequence,
    longueur: cfg.longueurDepart,
    saisie: [],
    erreurs: 0,
    phase: 'ecoute',
  };
}

export const sequenceAJouer = (etat) => etat.sequence.slice(0, etat.longueur);

export function commencerSaisie(etat) {
  return { ...etat, phase: 'joue', saisie: [] };
}

export function jouer(etat, id) {
  if (etat.phase !== 'joue') return { etat, resultat: 'ignore' };
  const attendu = etat.sequence[etat.saisie.length];
  if (id !== attendu) {
    return {
      etat: { ...etat, erreurs: etat.erreurs + 1, saisie: [], phase: 'ecoute' },
      resultat: 'indice',
      attendu,
    };
  }
  const saisie = [...etat.saisie, id];
  if (saisie.length < etat.longueur) return { etat: { ...etat, saisie }, resultat: 'bon' };
  if (etat.longueur >= etat.longueurCible) {
    return { etat: { ...etat, saisie, phase: 'fini' }, resultat: 'gagne' };
  }
  return {
    etat: { ...etat, saisie: [], longueur: etat.longueur + 1, phase: 'ecoute' },
    resultat: 'manche',
  };
}

export function etoilesEcho(erreurs) {
  if (erreurs <= 0) return 3;
  if (erreurs <= 2) return 2;
  return 1;
}
