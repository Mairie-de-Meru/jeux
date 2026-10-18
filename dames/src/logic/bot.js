// Robot : évaluation + alpha-bêta (négamax) à approfondissement itératif, budgets de temps et de nœuds.
import { legalMoves, applyMoveFast } from './rules.js';

const WIN = 100000;
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
const LEVELS = {
  1: { depth: 1, timeMs: 100, maxNodes: Infinity, random: 0.35, quiesce: 0 },
  2: { depth: 4, timeMs: 300, maxNodes: Infinity, random: 0, quiesce: 4 },
  3: { depth: 8, timeMs: 900, maxNodes: Infinity, random: 0, quiesce: 6 },
};

// Valeur du plateau du point de vue de `color`.
export function evaluate(state, color) {
  const { size, board } = state;
  const mid = (size - 1) / 2;
  const me = color === 'white' ? 1 : -1;
  let score = 0;
  for (let sq = 0; sq < board.length; sq++) {
    const v = board[sq];
    if (!v) continue;
    const s = v > 0 ? 1 : -1;
    const r = Math.floor(sq / size), c = sq % size;
    const centre = 3 - Math.abs(c - mid) * 0.7 - Math.abs(r - mid) * 0.3;
    let val;
    if (Math.abs(v) === 2) val = 300 + centre * 2;
    else {
      const adv = s > 0 ? size - 1 - r : r;
      val = 100 + adv * 4 + centre * 2;
      if (adv === 0) val += 8; // rangée du fond gardée
    }
    score += s === me ? val : -val;
  }
  return score;
}

const ABORT = { abort: true };

function orderMoves(moves, hint) {
  return moves.slice().sort((a, b) => {
    const ha = hint ? hint.get(a) || 0 : 0, hb = hint ? hint.get(b) || 0 : 0;
    if (ha !== hb) return hb - ha;
    return b.captures.length - a.captures.length || (b.promote ? 1 : 0) - (a.promote ? 1 : 0);
  });
}

export function chooseMove(state, opts = {}) {
  const level = opts.level in LEVELS ? opts.level : 2;
  const L = LEVELS[level];
  const rng = opts.rng || Math.random;
  const timeMs = opts.timeMs ?? L.timeMs;
  const maxNodes = opts.maxNodes ?? L.maxNodes;
  const moves = legalMoves(state);
  if (moves.length === 0) throw new Error('aucun coup légal');
  if (moves.length === 1) return moves[0];
  if (L.random && rng() < L.random) return moves[Math.floor(rng() * moves.length)];

  const me = state.turn;
  const deadline = now() + timeMs;
  let nodes = 0, checking = false;
  const tick = () => {
    nodes++;
    if (!checking) return;
    if (nodes > maxNodes || ((nodes & 127) === 0 && now() > deadline)) throw ABORT;
  };
  const search = (st, depth, alpha, beta, ply, qd) => {
    tick();
    const ms = legalMoves(st);
    if (ms.length === 0) return -(WIN - ply);
    if (depth <= 0) {
      if (ms[0].captures.length === 0 || qd >= L.quiesce) return evaluate(st, st.turn);
      qd++;
    }
    let best = -Infinity;
    for (const m of orderMoves(ms)) {
      const v = -search(applyMoveFast(st, m), depth - 1, -beta, -alpha, ply + 1, qd);
      if (v > best) best = v;
      if (v > alpha) alpha = v;
      if (alpha >= beta) break;
    }
    return best;
  };

  // ordre initial aléatoire (départage des coups égaux), puis réordonné par le score précédent
  const shuffled = moves.slice();
  for (let i = shuffled.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }
  let ordered = orderMoves(shuffled);
  let best = ordered[0];
  for (let d = 1; d <= L.depth; d++) {
    checking = d > 1; // la profondeur 1 va toujours au bout
    const scores = new Map();
    let alpha = -Infinity, roundBest = null;
    try {
      for (const m of ordered) {
        const v = -search(applyMoveFast(state, m), d - 1, -Infinity, -alpha, 1, 0);
        scores.set(m, v);
        if (v > alpha || roundBest === null) { alpha = v; roundBest = m; }
        if (v >= WIN - 50) break;
      }
    } catch (e) {
      if (e !== ABORT) throw e;
      break;
    }
    best = roundBest;
    for (const m of ordered) if (!scores.has(m)) scores.set(m, -Infinity);
    ordered = orderMoves(ordered, scores);
    if (alpha >= WIN - 50) break;
  }
  return best;
}
