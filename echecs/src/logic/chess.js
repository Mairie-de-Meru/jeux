// Moteur d'échecs pur (règles FIDE). Cases 0..63, a1 = 0, h8 = 63. Pièces 'wP'..'bK', vide = null.
import { sanOf } from './notation.js';

export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const FILES = 'abcdefgh';

export function sq(n) { return (n.charCodeAt(0) - 97) + 8 * (n.charCodeAt(1) - 49); }
export function name(s) { return FILES[s & 7] + ((s >> 3) + 1); }
export const opp = (c) => (c === 'w' ? 'b' : 'w');

// ---------- tables précalculées ----------
const KNIGHT = [], KING = [];
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]; // 0-3 tour, 4-7 fou
const RAYS = DIRS.map(() => []);
for (let s = 0; s < 64; s++) {
  const f = s & 7, r = s >> 3;
  KNIGHT[s] = []; KING[s] = [];
  for (const [df, dr] of [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]]) {
    const nf = f + df, nr = r + dr;
    if (nf >= 0 && nf < 8 && nr >= 0 && nr < 8) KNIGHT[s].push(nr * 8 + nf);
  }
  DIRS.forEach(([df, dr], i) => {
    const ray = [];
    let nf = f + df, nr = r + dr;
    while (nf >= 0 && nf < 8 && nr >= 0 && nr < 8) { ray.push(nr * 8 + nf); nf += df; nr += dr; }
    RAYS[i][s] = ray;
    if (ray.length) KING[s].push(ray[0]);
  });
}

// ---------- FEN ----------
export function fromFEN(fen) {
  const [pl, tn = 'w', ca = '-', ep = '-', hm = '0', fm = '1'] = String(fen).trim().split(/\s+/);
  const rows = pl.split('/');
  if (rows.length !== 8) throw new Error('FEN invalide');
  const board = new Array(64).fill(null);
  const king = { w: -1, b: -1 };
  for (let i = 0; i < 8; i++) {
    const rank = 7 - i;
    let f = 0;
    for (const ch of rows[i]) {
      if (ch >= '1' && ch <= '8') f += +ch;
      else {
        const col = ch === ch.toUpperCase() ? 'w' : 'b';
        const t = ch.toUpperCase();
        if (!'PNBRQK'.includes(t)) throw new Error('FEN invalide');
        board[rank * 8 + f] = col + t;
        if (t === 'K') king[col] = rank * 8 + f;
        f++;
      }
    }
    if (f !== 8) throw new Error('FEN invalide');
  }
  if (king.w < 0 || king.b < 0) throw new Error('FEN sans roi');
  return {
    board,
    turn: tn === 'b' ? 'b' : 'w',
    castling: { wK: ca.includes('K'), wQ: ca.includes('Q'), bK: ca.includes('k'), bQ: ca.includes('q') },
    ep: ep !== '-' && /^[a-h][36]$/.test(ep) ? sq(ep) : -1,
    halfmove: parseInt(hm, 10) || 0,
    fullmove: parseInt(fm, 10) || 1,
    king,
  };
}

export function toFEN(pos) {
  let out = [];
  for (let r = 7; r >= 0; r--) {
    let row = '', empty = 0;
    for (let f = 0; f < 8; f++) {
      const p = pos.board[r * 8 + f];
      if (!p) { empty++; continue; }
      if (empty) { row += empty; empty = 0; }
      row += p[0] === 'w' ? p[1] : p[1].toLowerCase();
    }
    if (empty) row += empty;
    out.push(row);
  }
  const c = pos.castling;
  const ca = (c.wK ? 'K' : '') + (c.wQ ? 'Q' : '') + (c.bK ? 'k' : '') + (c.bQ ? 'q' : '') || '-';
  return `${out.join('/')} ${pos.turn} ${ca} ${pos.ep >= 0 ? name(pos.ep) : '-'} ${pos.halfmove} ${pos.fullmove}`;
}

// ---------- attaques ----------
export function isAttacked(pos, s, by) {
  const b = pos.board, f = s & 7;
  if (by === 'w') {
    if (f > 0 && s >= 9 && b[s - 9] === 'wP') return true;
    if (f < 7 && s >= 7 && b[s - 7] === 'wP') return true;
  } else {
    if (f > 0 && s + 7 < 64 && b[s + 7] === 'bP') return true;
    if (f < 7 && s + 9 < 64 && b[s + 9] === 'bP') return true;
  }
  const kn = by + 'N';
  for (const t of KNIGHT[s]) if (b[t] === kn) return true;
  const kg = by + 'K';
  for (const t of KING[s]) if (b[t] === kg) return true;
  for (let d = 0; d < 8; d++) {
    const ray = RAYS[d][s];
    for (let i = 0; i < ray.length; i++) {
      const p = b[ray[i]];
      if (p) {
        if (p[0] === by) {
          const t = p[1];
          if (t === 'Q' || (d < 4 ? t === 'R' : t === 'B')) return true;
        }
        break;
      }
    }
  }
  return false;
}

export function inCheck(pos, color = pos.turn) {
  return isAttacked(pos, pos.king[color], opp(color));
}

// ---------- génération ----------
const PROMOS = ['Q', 'R', 'B', 'N'];

export function pseudoMoves(pos, capsOnly = false) {
  const b = pos.board, us = pos.turn, them = opp(us), out = [];
  const push = (from, to, piece, captured, flags, promo) => {
    const m = { from, to, piece, flags };
    if (captured) m.captured = captured;
    if (promo) m.promo = promo;
    out.push(m);
  };
  for (let s = 0; s < 64; s++) {
    const p = b[s];
    if (!p || p[0] !== us) continue;
    const t = p[1], f = s & 7;
    if (t === 'P') {
      const dir = us === 'w' ? 8 : -8, start = us === 'w' ? 1 : 6, last = us === 'w' ? 7 : 0;
      const one = s + dir;
      if (one >= 0 && one < 64 && !b[one]) {
        if ((one >> 3) === last) for (const q of PROMOS) push(s, one, p, null, 'p', q);
        else if (!capsOnly) {
          push(s, one, p, null, 'n');
          if ((s >> 3) === start && !b[one + dir]) push(s, one + dir, p, null, '2');
        }
      }
      for (const df of [-1, 1]) {
        const nf = f + df;
        if (nf < 0 || nf > 7 || one < 0 || one >= 64) continue;
        const to = one + df, cp = b[to];
        if (cp && cp[0] === them) {
          if ((to >> 3) === last) for (const q of PROMOS) push(s, to, p, cp, 'pc', q);
          else push(s, to, p, cp, 'c');
        } else if (!cp && to === pos.ep) {
          push(s, to, p, b[s + df], 'ep');
        }
      }
    } else if (t === 'N' || t === 'K') {
      const list = t === 'N' ? KNIGHT[s] : KING[s];
      for (const to of list) {
        const cp = b[to];
        if (!cp) { if (!capsOnly) push(s, to, p, null, 'n'); }
        else if (cp[0] === them) push(s, to, p, cp, 'c');
      }
    } else {
      const d0 = t === 'B' ? 4 : 0, d1 = t === 'R' ? 4 : 8;
      for (let d = d0; d < d1; d++) {
        const ray = RAYS[d][s];
        for (let i = 0; i < ray.length; i++) {
          const to = ray[i], cp = b[to];
          if (!cp) { if (!capsOnly) push(s, to, p, null, 'n'); }
          else { if (cp[0] === them) push(s, to, p, cp, 'c'); break; }
        }
      }
    }
  }
  if (!capsOnly) {
    const base = us === 'w' ? 0 : 56, kp = us + 'K', rp = us + 'R';
    const c = pos.castling;
    if (b[base + 4] === kp && (us === 'w' ? c.wK : c.bK) && b[base + 7] === rp && !b[base + 5] && !b[base + 6] &&
        !isAttacked(pos, base + 4, them) && !isAttacked(pos, base + 5, them) && !isAttacked(pos, base + 6, them)) {
      push(base + 4, base + 6, kp, null, 'k');
    }
    if (b[base + 4] === kp && (us === 'w' ? c.wQ : c.bQ) && b[base] === rp && !b[base + 1] && !b[base + 2] && !b[base + 3] &&
        !isAttacked(pos, base + 4, them) && !isAttacked(pos, base + 3, them) && !isAttacked(pos, base + 2, them)) {
      push(base + 4, base + 2, kp, null, 'q');
    }
  }
  return out;
}

// ---------- jouer / annuler ----------
const CASTLE_MASK = { 0: ['wQ'], 7: ['wK'], 4: ['wK', 'wQ'], 56: ['bQ'], 63: ['bK'], 60: ['bK', 'bQ'] };

export function makeMove(pos, m) {
  const b = pos.board, us = pos.turn;
  const u = { ep: pos.ep, halfmove: pos.halfmove, fullmove: pos.fullmove, castling: pos.castling, captured: null, capSq: m.to };
  if (m.flags === 'ep') {
    u.capSq = m.to + (us === 'w' ? -8 : 8);
    u.captured = b[u.capSq];
    b[u.capSq] = null;
  } else u.captured = b[m.to];
  b[m.from] = null;
  b[m.to] = m.promo ? us + m.promo : m.piece;
  if (m.piece[1] === 'K') pos.king[us] = m.to;
  if (m.flags === 'k') { b[m.to - 1] = b[m.to + 1]; b[m.to + 1] = null; }
  else if (m.flags === 'q') { b[m.to + 1] = b[m.to - 2]; b[m.to - 2] = null; }
  const mf = CASTLE_MASK[m.from], mt = CASTLE_MASK[m.to];
  if (mf || mt) {
    const c = { ...pos.castling };
    let changed = false;
    for (const k of (mf || [])) if (c[k]) { c[k] = false; changed = true; }
    for (const k of (mt || [])) if (c[k]) { c[k] = false; changed = true; }
    if (changed) pos.castling = c;
  }
  pos.ep = m.flags === '2' ? (m.from + m.to) >> 1 : -1;
  pos.halfmove = (m.piece[1] === 'P' || u.captured) ? 0 : pos.halfmove + 1;
  if (us === 'b') pos.fullmove++;
  pos.turn = opp(us);
  return u;
}

export function unmakeMove(pos, m, u) {
  const b = pos.board, us = opp(pos.turn);
  pos.turn = us;
  b[m.from] = m.piece;
  b[m.to] = null;
  if (m.flags === 'ep') b[u.capSq] = u.captured; else b[m.to] = u.captured;
  if (m.piece[1] === 'K') pos.king[us] = m.from;
  if (m.flags === 'k') { b[m.to + 1] = b[m.to - 1]; b[m.to - 1] = null; }
  else if (m.flags === 'q') { b[m.to - 2] = b[m.to + 1]; b[m.to + 1] = null; }
  pos.ep = u.ep; pos.halfmove = u.halfmove; pos.fullmove = u.fullmove; pos.castling = u.castling;
}

export function legalMoves(pos, capsOnly = false) {
  const us = pos.turn, out = [];
  for (const m of pseudoMoves(pos, capsOnly)) {
    const u = makeMove(pos, m);
    const ok = !isAttacked(pos, pos.king[us], pos.turn);
    unmakeMove(pos, m, u);
    if (ok) out.push(m);
  }
  return out;
}

export function legalMovesFrom(pos, s) {
  return legalMoves(pos).filter((m) => m.from === s);
}

export function perft(pos, depth) {
  if (depth === 0) return 1;
  const ms = legalMoves(pos);
  if (depth === 1) return ms.length;
  let n = 0;
  for (const m of ms) {
    const u = makeMove(pos, m);
    n += perft(pos, depth - 1);
    unmakeMove(pos, m, u);
  }
  return n;
}

// ---------- partie ----------
export function positionKey(pos) {
  let s = '';
  for (let i = 0; i < 64; i++) s += pos.board[i] ? pos.board[i] : '..';
  const c = pos.castling;
  let ep = -1;
  if (pos.ep >= 0 && legalMoves(pos).some((m) => m.flags === 'ep')) ep = pos.ep;
  return `${s}${pos.turn}${c.wK ? 1 : 0}${c.wQ ? 1 : 0}${c.bK ? 1 : 0}${c.bQ ? 1 : 0}${ep}`;
}

export function newGame(fen = START_FEN) {
  const pos = fromFEN(fen);
  const key = positionKey(pos);
  return { pos, history: [], keys: new Map([[key, 1]]), startKey: key, startFen: fen };
}

export function play(game, { from, to, promo } = {}) {
  const pos = game.pos;
  const ms = legalMoves(pos).filter((m) => m.from === from && m.to === to);
  if (!ms.length) return { ok: false };
  let m;
  if (ms[0].promo) {
    const want = promo ? String(promo).toUpperCase() : 'Q';
    m = ms.find((x) => x.promo === want);
    if (!m) return { ok: false };
  } else m = ms[0];
  const san = sanOf(pos, m);
  const fenBefore = toFEN(pos);
  const u = makeMove(pos, m);
  const key = positionKey(pos);
  game.keys.set(key, (game.keys.get(key) || 0) + 1);
  game.history.push({ move: m, san, fenBefore, key, u });
  return { ok: true, move: m, san };
}

export function undo(game) {
  const h = game.history.pop();
  if (!h) return null;
  const n = (game.keys.get(h.key) || 1) - 1;
  if (n <= 0) game.keys.delete(h.key); else game.keys.set(h.key, n);
  unmakeMove(game.pos, h.move, h.u);
  return h.move;
}

export function insufficientMaterial(pos) {
  const minors = [];
  for (let i = 0; i < 64; i++) {
    const p = pos.board[i];
    if (!p) continue;
    const t = p[1];
    if (t === 'P' || t === 'R' || t === 'Q') return false;
    if (t === 'N' || t === 'B') minors.push({ t, sqc: ((i & 7) + (i >> 3)) & 1 });
  }
  if (minors.length <= 1) return true;
  return minors.every((m) => m.t === 'B' && m.sqc === minors[0].sqc);
}

export function status(game) {
  const pos = game.pos;
  const check = inCheck(pos);
  const moves = legalMoves(pos);
  if (!moves.length) {
    if (check) return { over: true, result: pos.turn === 'w' ? '0-1' : '1-0', reason: 'mat', check };
    return { over: true, result: '1/2-1/2', reason: 'pat', check };
  }
  const key = game.history.length ? game.history[game.history.length - 1].key : game.startKey;
  if ((game.keys.get(key) || 0) >= 3) return { over: true, result: '1/2-1/2', reason: 'repetition', check };
  if (pos.halfmove >= 100) return { over: true, result: '1/2-1/2', reason: '50coups', check };
  if (insufficientMaterial(pos)) return { over: true, result: '1/2-1/2', reason: 'materiel', check };
  return { over: false, result: null, reason: null, check };
}

// ---------- conseil « pièce en danger » ----------
const VAL = { P: 1, N: 3, B: 3, R: 5, Q: 9, K: 100 };

function minAttacker(pos, s, by) {
  const b = pos.board, f = s & 7;
  let min = 1000;
  const take = (p) => { const v = VAL[p[1]]; if (v < min) min = v; };
  if (by === 'w') {
    if (f > 0 && s >= 9 && b[s - 9] === 'wP') take('wP');
    if (f < 7 && s >= 7 && b[s - 7] === 'wP') take('wP');
  } else {
    if (f > 0 && s + 7 < 64 && b[s + 7] === 'bP') take('bP');
    if (f < 7 && s + 9 < 64 && b[s + 9] === 'bP') take('bP');
  }
  for (const t of KNIGHT[s]) if (b[t] === by + 'N') take(b[t]);
  for (const t of KING[s]) if (b[t] === by + 'K') take(b[t]);
  for (let d = 0; d < 8; d++) {
    for (const t of RAYS[d][s]) {
      const p = b[t];
      if (p) {
        if (p[0] === by && (p[1] === 'Q' || (d < 4 ? p[1] === 'R' : p[1] === 'B'))) take(p);
        break;
      }
    }
  }
  return min;
}

export function piecesEnPrise(pos, color) {
  const them = opp(color), out = [];
  for (let s = 0; s < 64; s++) {
    const p = pos.board[s];
    if (!p || p[0] !== color || p[1] === 'K') continue;
    const a = minAttacker(pos, s, them);
    if (a === 1000) continue;
    if (!isAttacked(pos, s, color) || a < VAL[p[1]]) out.push(s);
  }
  return out;
}
