// Robot pur : alpha-bêta + quiescence, matériel + tables de position. Toujours un coup légal.
import { fromFEN, pseudoMoves, legalMoves, makeMove, unmakeMove, inCheck } from './chess.js';
import { makeRng, shuffle } from './rng.js';

const VAL = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 0 };
const MATE = 100000;
const INF = 1e9;
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

// Tables vues du côté blanc, rang 8 en premier.
const PST = {
  P: [0,0,0,0,0,0,0,0, 50,50,50,50,50,50,50,50, 10,10,20,30,30,20,10,10, 5,5,10,25,25,10,5,5,
      0,0,0,20,20,0,0,0, 5,-5,-10,0,0,-10,-5,5, 5,10,10,-20,-20,10,10,5, 0,0,0,0,0,0,0,0],
  N: [-50,-40,-30,-30,-30,-30,-40,-50, -40,-20,0,0,0,0,-20,-40, -30,0,10,15,15,10,0,-30, -30,5,15,20,20,15,5,-30,
      -30,0,15,20,20,15,0,-30, -30,5,10,15,15,10,5,-30, -40,-20,0,5,5,0,-20,-40, -50,-40,-30,-30,-30,-30,-40,-50],
  B: [-20,-10,-10,-10,-10,-10,-10,-20, -10,0,0,0,0,0,0,-10, -10,0,5,10,10,5,0,-10, -10,5,5,10,10,5,5,-10,
      -10,0,10,10,10,10,0,-10, -10,10,10,10,10,10,10,-10, -10,5,0,0,0,0,5,-10, -20,-10,-10,-10,-10,-10,-10,-20],
  R: [0,0,0,0,0,0,0,0, 5,10,10,10,10,10,10,5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5,
      -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, 0,0,0,5,5,0,0,0],
  Q: [-20,-10,-10,-5,-5,-10,-10,-20, -10,0,0,0,0,0,0,-10, -10,0,5,5,5,5,0,-10, -5,0,5,5,5,5,0,-5,
      0,0,5,5,5,5,0,-5, -10,5,5,5,5,5,0,-10, -10,0,5,0,0,0,0,-10, -20,-10,-10,-5,-5,-10,-10,-20],
  K: [-30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30,
      -20,-30,-30,-40,-40,-30,-30,-20, -10,-20,-20,-20,-20,-20,-20,-10, 20,20,0,0,0,0,20,20, 20,30,10,0,0,10,30,20],
  E: [-50,-40,-30,-20,-20,-30,-40,-50, -30,-20,-10,0,0,-10,-20,-30, -30,-10,20,30,30,20,-10,-30, -30,-10,30,40,40,30,-10,-30,
      -30,-10,30,40,40,30,-10,-30, -30,-10,20,30,30,20,-10,-30, -30,-30,0,0,0,0,-30,-30, -50,-30,-30,-30,-30,-30,-30,-50],
};
const pstIdx = (color, i) => (color === 'w' ? (7 - (i >> 3)) * 8 + (i & 7) : (i >> 3) * 8 + (i & 7));

// Évaluation du point de vue du camp au trait.
export function evaluate(pos) {
  const b = pos.board;
  let score = 0, heavy = 0;
  for (let i = 0; i < 64; i++) {
    const p = b[i];
    if (!p) continue;
    const t = p[1];
    if (t === 'Q' || t === 'R') heavy++;
    if (t === 'K') continue;
    const v = VAL[t] + PST[t][pstIdx(p[0], i)];
    score += p[0] === 'w' ? v : -v;
  }
  const kt = heavy === 0 ? 'E' : 'K';
  score += PST[kt][pstIdx('w', pos.king.w)] - PST[kt][pstIdx('b', pos.king.b)];
  return pos.turn === 'w' ? score : -score;
}

function orderScore(m, killers, ply) {
  let s = 0;
  if (m.captured) s += 100000 + VAL[m.captured[1]] * 10 - VAL[m.piece[1]] / 10;
  if (m.promo) s += 50000 + VAL[m.promo];
  if (!m.captured && killers[ply]) {
    const k = killers[ply];
    if ((k[0] && k[0].from === m.from && k[0].to === m.to) || (k[1] && k[1].from === m.from && k[1].to === m.to)) s += 9000;
  }
  return s;
}
function sorted(moves, killers, ply) {
  const sc = moves.map((m) => [orderScore(m, killers, ply), m]);
  sc.sort((a, c) => c[0] - a[0]);
  return sc.map((x) => x[1]);
}

function quiesce(pos, alpha, beta, S, qd) {
  S.nodes++;
  if ((S.nodes & 1023) === 0 && S.deadline && now() > S.deadline) S.stop = true;
  if (S.stop) return 0;
  const stand = evaluate(pos);
  if (qd <= 0) return stand;
  if (stand >= beta) return beta;
  if (stand > alpha) alpha = stand;
  const us = pos.turn;
  for (const m of sorted(pseudoMoves(pos, true), S.killers, 0)) {
    const u = makeMove(pos, m);
    if (inCheck(pos, us)) { unmakeMove(pos, m, u); continue; }
    const sc = -quiesce(pos, -beta, -alpha, S, qd - 1);
    unmakeMove(pos, m, u);
    if (S.stop) return 0;
    if (sc >= beta) return beta;
    if (sc > alpha) alpha = sc;
  }
  return alpha;
}

function negamax(pos, depth, alpha, beta, ply, S) {
  S.nodes++;
  if ((S.nodes & 1023) === 0 && S.deadline && now() > S.deadline) S.stop = true;
  if (S.stop) return 0;
  if (ply > 0 && pos.halfmove >= 100) return 0;
  const us = pos.turn;
  const chk = inCheck(pos, us);
  if (chk && ply < 10) depth++;
  if (depth <= 0) return S.qs ? quiesce(pos, alpha, beta, S, 5) : evaluate(pos);
  let legal = 0;
  for (const m of sorted(pseudoMoves(pos), S.killers, ply)) {
    const u = makeMove(pos, m);
    if (inCheck(pos, us)) { unmakeMove(pos, m, u); continue; }
    legal++;
    const sc = -negamax(pos, depth - 1, -beta, -alpha, ply + 1, S);
    unmakeMove(pos, m, u);
    if (S.stop) return 0;
    if (sc >= beta) {
      if (!m.captured) { const k = S.killers[ply] || (S.killers[ply] = [null, null]); k[1] = k[0]; k[0] = m; }
      return beta;
    }
    if (sc > alpha) alpha = sc;
  }
  if (legal === 0) return chk ? -MATE + ply : 0;
  return alpha;
}

function rootScore(pos, m, depth, S) {
  const u = makeMove(pos, m);
  const sc = -negamax(pos, depth - 1, -INF, INF, 1, S);
  unmakeMove(pos, m, u);
  return sc;
}

// Renvoie un coup légal (objet issu de legalMoves) ou null s'il n'y en a pas.
export function chooseMove(fen, level = 2, seed = 1, opts = {}) {
  const pos = fromFEN(fen);
  const rng = makeRng(seed);
  const moves = legalMoves(pos);
  if (!moves.length) return null;
  if (moves.length === 1) return moves[0];
  shuffle(rng, moves);
  const S = { nodes: 0, stop: false, deadline: 0, killers: [], qs: level >= 2 };

  if (level <= 1) {
    // Découverte : un coup de profondeur 1, parfois au hasard parmi les coups pas catastrophiques.
    const scored = moves.map((m) => {
      const u = makeMove(pos, m);
      let sc;
      if (!legalMoves(pos).length) sc = inCheck(pos) ? MATE : 0;
      else sc = -evaluate(pos);
      unmakeMove(pos, m, u);
      return { m, sc: sc + (rng() * 30 - 15) };
    });
    const best = Math.max(...scored.map((x) => x.sc));
    if (best >= MATE / 2) return scored.find((x) => x.sc === best).m;
    if (rng() < 0.3) {
      const ok = scored.filter((x) => x.sc >= best - 250);
      return ok[Math.floor(rng() * ok.length)].m;
    }
    return scored.find((x) => x.sc === best).m;
  }

  if (level === 2) {
    let best = moves[0], bs = -INF;
    for (const m of moves) {
      const sc = rootScore(pos, m, 3, S);
      if (sc > bs) { bs = sc; best = m; }
    }
    return best;
  }

  // Champion : approfondissement itératif avec budget de temps.
  const timeMs = opts.timeMs ?? 1500;
  const maxDepth = opts.maxDepth ?? 7;
  S.deadline = now() + timeMs;
  let best = moves[0];
  let ordered = moves;
  for (let d = 1; d <= maxDepth; d++) {
    let iterBest = null, bs = -INF;
    for (const m of ordered) {
      const sc = rootScore(pos, m, d, S);
      if (S.stop) break;
      if (sc > bs) { bs = sc; iterBest = m; }
    }
    if (S.stop) break;
    best = iterBest;
    ordered = [best, ...ordered.filter((m) => m !== best)];
    if (bs >= MATE - 100) break;
  }
  return best;
}
