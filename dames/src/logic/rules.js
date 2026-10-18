// Moteur de dames pur (aucun DOM, aucun three). Contrat : .project/ARCHITECTURE.md
export const VARIANTS = {
  international: { size: 10, rows: 4, flyingKings: true, menCaptureBack: true, maxCapture: true, first: 'white', kingDrawPlies: 50 },
  english: { size: 8, rows: 3, flyingKings: false, menCaptureBack: false, maxCapture: false, first: 'black', kingDrawPlies: 50 },
};
const DIRS = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const other = (c) => (c === 'white' ? 'black' : 'white');
const sgn = (v) => (v > 0 ? 1 : v < 0 ? -1 : 0);
const colorSign = (c) => (c === 'white' ? 1 : -1);

export function positionKey(state) {
  let s = state.turn === 'white' ? 'w' : 'b';
  for (const v of state.board) s += String.fromCharCode(100 + v);
  return s;
}

export function newGame(variant = 'international') {
  const V = VARIANTS[variant];
  if (!V) throw new Error('variante inconnue : ' + variant);
  const size = V.size;
  const board = new Array(size * size).fill(0);
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) {
    if ((r + c) % 2 !== 1) continue;
    if (r < V.rows) board[r * size + c] = -1;
    else if (r >= size - V.rows) board[r * size + c] = 1;
  }
  const state = { variant, size, board, turn: V.first, quiet: 0, seen: {}, lastMove: null, result: null, ply: 0 };
  state.seen[positionKey(state)] = 1;
  return state;
}

// Rafles possibles d'une pièce (la pièce est retirée de sa case pendant le calcul).
function captureMoves(V, size, board, sq) {
  const piece = board[sq];
  const col = sgn(piece), king = Math.abs(piece) === 2;
  const promoRow = col > 0 ? 0 : size - 1;
  const short = !king || !V.flyingKings;
  const flag = new Uint8Array(size * size);
  const path = [], caps = [], out = [];
  const inB = (r, c) => r >= 0 && r < size && c >= 0 && c < size;
  board[sq] = 0;
  const record = (promote) => {
    out.push({ from: sq, to: path[path.length - 1], path: path.slice(), captures: caps.slice(), promote });
  };
  const dfs = (r, c) => {
    let any = false;
    for (const [dr, dc] of DIRS) {
      if (short) {
        if (!king && !V.menCaptureBack && dr !== -col) continue;
        const r1 = r + dr, c1 = c + dc, r2 = r + 2 * dr, c2 = c + 2 * dc;
        if (!inB(r2, c2)) continue;
        const i1 = r1 * size + c1, i2 = r2 * size + c2;
        const m = board[i1];
        if (m === 0 || sgn(m) === col || flag[i1] || board[i2] !== 0) continue;
        any = true; flag[i1] = 1; path.push(i2); caps.push(i1);
        if (!V.flyingKings && !king && r2 === promoRow) record(true);
        else dfs(r2, c2);
        path.pop(); caps.pop(); flag[i1] = 0;
      } else {
        let rr = r + dr, cc = c + dc;
        while (inB(rr, cc) && board[rr * size + cc] === 0) { rr += dr; cc += dc; }
        if (!inB(rr, cc)) continue;
        const i1 = rr * size + cc, m = board[i1];
        if (sgn(m) === col || flag[i1]) continue;
        let r2 = rr + dr, c2 = cc + dc;
        while (inB(r2, c2) && board[r2 * size + c2] === 0) {
          any = true; flag[i1] = 1; path.push(r2 * size + c2); caps.push(i1);
          dfs(r2, c2);
          path.pop(); caps.pop(); flag[i1] = 0;
          r2 += dr; c2 += dc;
        }
      }
    }
    if (!any && path.length > 0) {
      const last = path[path.length - 1];
      record(!king && Math.floor(last / size) === promoRow);
    }
  };
  dfs(Math.floor(sq / size), sq % size);
  board[sq] = piece;
  return out;
}

function simpleMoves(V, size, board, sq, out) {
  const piece = board[sq];
  const col = sgn(piece), king = Math.abs(piece) === 2;
  const promoRow = col > 0 ? 0 : size - 1;
  const r0 = Math.floor(sq / size), c0 = sq % size;
  for (const [dr, dc] of DIRS) {
    if (!king && dr !== -col) continue;
    let r = r0 + dr, c = c0 + dc;
    while (r >= 0 && r < size && c >= 0 && c < size && board[r * size + c] === 0) {
      const to = r * size + c;
      out.push({ from: sq, to, path: [to], captures: [], promote: !king && r === promoRow });
      if (!(king && V.flyingKings)) break;
      r += dr; c += dc;
    }
  }
}

export function legalMoves(state) {
  if (state.result) return [];
  const V = VARIANTS[state.variant], { size, board } = state;
  const col = colorSign(state.turn);
  let caps = [];
  for (let sq = 0; sq < board.length; sq++) {
    if (sgn(board[sq]) === col) { const m = captureMoves(V, size, board, sq); if (m.length) caps = caps.concat(m); }
  }
  if (caps.length) {
    if (V.maxCapture) {
      const mx = Math.max(...caps.map((m) => m.captures.length));
      caps = caps.filter((m) => m.captures.length === mx);
    }
    return caps;
  }
  const out = [];
  for (let sq = 0; sq < board.length; sq++) if (sgn(board[sq]) === col) simpleMoves(V, size, board, sq, out);
  return out;
}

// Application brute (sans résultat ni répétitions) : pour la recherche du robot.
export function applyMoveFast(state, move) {
  const board = state.board.slice();
  const piece = board[move.from];
  board[move.from] = 0;
  for (const c of move.captures) board[c] = 0;
  const man = Math.abs(piece) === 1;
  board[move.to] = move.promote ? piece * 2 : piece;
  const quiet = man || move.captures.length ? 0 : state.quiet + 1;
  return { variant: state.variant, size: state.size, board, turn: other(state.turn), quiet, seen: state.seen, lastMove: move, result: null, ply: state.ply + 1 };
}

export function applyMove(state, move) {
  const V = VARIANTS[state.variant];
  const ns = applyMoveFast(state, move);
  ns.seen = { ...state.seen };
  const key = positionKey(ns);
  ns.seen[key] = (ns.seen[key] || 0) + 1;
  if (legalMoves(ns).length === 0) {
    const col = colorSign(ns.turn);
    const has = ns.board.some((v) => sgn(v) === col);
    ns.result = { winner: state.turn, reason: has ? 'blocked' : 'noPieces' };
  } else if (ns.seen[key] >= 3) ns.result = { winner: null, reason: 'repetition' };
  else if (ns.quiet >= V.kingDrawPlies) ns.result = { winner: null, reason: 'kingMoves' };
  return ns;
}

const samePath = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
export function findMove(state, move) {
  const list = legalMoves(state);
  const hit = list.filter((m) => m.from === move.from && samePath(m.path, move.path));
  if (!hit.length) return null;
  if (move.captures) { const exact = hit.find((m) => samePath(m.captures, move.captures)); if (exact) return exact; }
  return hit[0];
}
export const isLegal = (state, move) => !!findMove(state, move);

export function mustCapture(state) {
  const m = legalMoves(state);
  return m.length > 0 && m[0].captures.length > 0;
}
export function capturingPieces(state) {
  const m = legalMoves(state);
  if (!m.length || !m[0].captures.length) return [];
  return [...new Set(m.map((x) => x.from))];
}

export function pieceCount(state) {
  const r = { white: { men: 0, kings: 0 }, black: { men: 0, kings: 0 } };
  for (const v of state.board) {
    if (!v) continue;
    const side = r[v > 0 ? 'white' : 'black'];
    if (Math.abs(v) === 2) side.kings++; else side.men++;
  }
  return r;
}
