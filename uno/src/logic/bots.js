// Décision des robots : coups toujours légaux (via legalMoves).
import { COLORS, legalMoves, isWild } from './game.js';
import { pick } from './rng.js';

export function colorCounts(hand) {
  const counts = { R: 0, B: 0, G: 0, Y: 0 };
  for (const c of hand) if (c.color) counts[c.color]++;
  return counts;
}

// La couleur la plus présente dans la main (hors carte jouée), au hasard si égalité ou main sans couleur.
export function chooseColor(hand, rng) {
  const counts = colorCounts(hand);
  const max = Math.max(...COLORS.map((c) => counts[c]));
  if (max === 0) return pick(COLORS, rng);
  return pick(COLORS.filter((c) => counts[c] === max), rng);
}

// Retourne { action: 'play', cardId, color? } | { action: 'draw' } | { action: 'keep' }
export function botDecision(g, rng = g.rng) {
  const p = g.current;
  const hand = g.players[p].hand;
  const legal = legalMoves(g, p);
  if (legal.length === 0) return { action: g.drawn !== null ? 'keep' : 'draw' };

  let card;
  if (g.difficulty === 'normal') {
    const others = g.players.filter((_, i) => i !== p);
    const minOther = Math.min(...others.map((o) => o.hand.length));
    const leader = minOther <= 2 || minOther < hand.length;
    const plain = legal.filter((c) => !isWild(c));
    const attacks = plain.filter((c) => c.kind !== 'num');
    if (leader && attacks.length) card = pick(attacks, rng);
    else if (leader && plain.length === 0 && minOther <= 2) card = pick(legal, rng);
    else if (plain.length) {
      const counts = colorCounts(hand);
      const best = Math.max(...plain.map((c) => counts[c.color]));
      card = pick(plain.filter((c) => counts[c.color] === best), rng);
    } else card = pick(legal, rng);
  } else {
    card = pick(legal, rng);
  }
  const move = { action: 'play', cardId: card.id };
  if (isWild(card)) move.color = chooseColor(hand.filter((c) => c.id !== card.id), rng);
  return move;
}
