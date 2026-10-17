// Choix des coups des robots (pur). Ne renvoie jamais qu'un coup de `moves` (= legalMoves).
import { PALIERS, caseCommune } from './regles.js';

// Un adversaire peut-il atteindre la case commune `cell` en 1..6 pas ?
function menace(state, j, cell) {
  if (cell === null) return false;
  for (let k = 0; k < state.joueurs.length; k++) {
    if (k === j) continue;
    for (const p of state.joueurs[k].chevaux) {
      const c = caseCommune(k, p);
      if (c === null) continue;
      const d = (cell - c + 56) % 56;
      if (d >= 1 && d <= 6) return true;
    }
  }
  return false;
}

export function scoreCoup(state, m) {
  const j = state.courant;
  const danger = PALIERS[state.palier].prises;
  const arrivee = caseCommune(j, m.vers);
  const depart = caseCommune(j, m.depuis);
  const enDanger = danger && menace(state, j, arrivee);
  const aLAbri = m.vers >= 56 || (danger && depart !== null && menace(state, j, depart) && !enDanger);
  let base = 0;
  if (m.prises.length) base = 100;
  else if (m.type === 'arrivee') base = 80;
  else if (m.type === 'sortie') base = 60;
  else if (aLAbri) base = 40;
  let score = base + m.vers / 10;
  if (enDanger && !m.prises.length) score -= 30;
  return score;
}

export function chooseMove(state, moves, difficulte, rng) {
  if (!moves.length) return null;
  if (difficulte !== 'normal' && rng() < 0.4) return moves[Math.floor(rng() * moves.length)];
  let best = moves[0], bs = -Infinity;
  for (const m of moves) {
    const sc = scoreCoup(state, m);
    if (sc > bs) { bs = sc; best = m; }
  }
  return best;
}
