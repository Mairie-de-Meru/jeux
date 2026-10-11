// Progression : étape -> palier -> diplôme (pur, immuable). Indices 0-based.
import { LEVELS } from './levels.js';
import { createCrossing, step } from './crossing.js';

export function starsFor(erreurs) {
  return erreurs <= 0 ? 3 : erreurs <= 2 ? 2 : 1;
}

export function createGame(levels = LEVELS, sauvegarde) {
  const saved = sauvegarde?.etoiles;
  const etoiles = levels.map((_, i) => {
    const v = Array.isArray(saved) ? Number(saved[i]) : 0;
    return Number.isFinite(v) ? Math.max(0, Math.min(3, Math.floor(v))) : 0;
  });
  return {
    levels,
    niveau: 0,
    etape: 0,
    crossing: createCrossing(levels[0].etapes[0]),
    erreursNiveau: 0,
    etoiles,
    termine: false,
  };
}

export function goLevel(game, n) {
  const niveau = Math.max(0, Math.min(game.levels.length - 1, n));
  return {
    ...game,
    niveau,
    etape: 0,
    crossing: createCrossing(game.levels[niveau].etapes[0]),
    erreursNiveau: 0,
    termine: false,
  };
}

export function unlocked(game, n) {
  return n === 0 || (game.etoiles[n - 1] ?? 0) >= 1;
}

export function act(game, action, monde) {
  if (game.termine) return { game, resultat: { ok: true }, evenement: null };
  const { state, resultat } = step(game.crossing, action, monde);
  let g = { ...game, crossing: state };
  if (!resultat.ok) return { game: { ...g, erreursNiveau: game.erreursNiveau + 1 }, resultat, evenement: null };
  if (state.phase !== 'fini') return { game: g, resultat, evenement: null };

  const niveau = game.levels[game.niveau];
  if (game.etape + 1 < niveau.etapes.length) {
    g = { ...g, etape: game.etape + 1, crossing: createCrossing(niveau.etapes[game.etape + 1]) };
    return { game: g, resultat, evenement: 'etapeFinie' };
  }
  const etoiles = game.etoiles.slice();
  etoiles[game.niveau] = Math.max(etoiles[game.niveau], starsFor(game.erreursNiveau));
  if (game.niveau + 1 < game.levels.length) {
    const next = game.niveau + 1;
    g = {
      ...g, etoiles, niveau: next, etape: 0, erreursNiveau: 0,
      crossing: createCrossing(game.levels[next].etapes[0]),
    };
    return { game: g, resultat, evenement: 'niveauFini' };
  }
  return { game: { ...g, etoiles, termine: true }, resultat, evenement: 'diplome' };
}
