// Tours et places (pur) : qui agit à ce tour. Un robot ne joue jamais pour un humain.
export function whoActs(players, turn) {
  const p = players && players[turn];
  if (!p) return null;
  return p.human ? 'human' : 'bot';
}
export const humanCount = (players) => (players.white.human ? 1 : 0) + (players.black.human ? 1 : 0);
// Le damier est tourné quand le seul humain joue les Rouges.
export const shouldFlip = (players) => humanCount(players) === 1 && players.black.human;
// Annulation : index de l'état de l'historique à restaurer (dernier état où un humain devait jouer), ou -1.
export function undoTarget(players, hist) {
  const one = humanCount(players) === 2 ? hist.length - 1 : -1;
  if (one >= 0) return one;
  for (let i = hist.length - 1; i >= 0; i--) if (players[hist[i].turn].human) return i;
  return -1;
}

// Sélection d'un coup humain, pas à pas.
// cands : coups légaux partant de la case choisie.
export const finalTargets = (cands) => [...new Set(cands.map((m) => m.to))];
// Si plusieurs rafles finissent sur la même case : première étape où les chemins divergent.
export function ambiguity(cands) {
  if (cands.length < 2) return null;
  const max = Math.max(...cands.map((m) => m.path.length));
  for (let i = 0; i < max; i++) {
    const set = [...new Set(cands.map((m) => m.path[i]))];
    if (set.length > 1) return { index: i, squares: set };
  }
  return null;
}
