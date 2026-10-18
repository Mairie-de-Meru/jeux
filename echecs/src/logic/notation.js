// Notation algébrique française : R (roi), D (dame), T (tour), F (fou), C (cavalier).
import { name, legalMoves, makeMove, unmakeMove, inCheck } from './chess.js';

export const LETTRES = { K: 'R', Q: 'D', R: 'T', B: 'F', N: 'C' };
const FILES = 'abcdefgh';

// `pos` est la position AVANT le coup `m` (issu de legalMoves).
export function sanOf(pos, m) {
  let s;
  if (m.flags === 'k') s = 'O-O';
  else if (m.flags === 'q') s = 'O-O-O';
  else {
    const t = m.piece[1];
    const cap = !!m.captured;
    if (t === 'P') {
      s = (cap ? FILES[m.from & 7] + 'x' : '') + name(m.to);
      if (m.promo) s += '=' + LETTRES[m.promo];
    } else {
      s = LETTRES[t];
      const others = legalMoves(pos).filter((x) => x.piece === m.piece && x.to === m.to && x.from !== m.from);
      if (others.length) {
        const sameFile = others.some((o) => (o.from & 7) === (m.from & 7));
        const sameRank = others.some((o) => (o.from >> 3) === (m.from >> 3));
        if (!sameFile) s += FILES[m.from & 7];
        else if (!sameRank) s += ((m.from >> 3) + 1);
        else s += name(m.from);
      }
      s += (cap ? 'x' : '') + name(m.to);
    }
  }
  const us = pos.turn;
  const u = makeMove(pos, m);
  if (inCheck(pos, pos.turn)) s += legalMoves(pos).length === 0 ? '#' : '+';
  unmakeMove(pos, m, u);
  if (m.flags === 'ep') s += ' e.p.';
  return s;
}
