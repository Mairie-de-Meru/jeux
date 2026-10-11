// Générateur pur de niveaux « surprise » (aucun Math.random : PRNG à graine).
import { run, countCards } from './engine.mjs';

const VEC = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };
const DIRS = ['N', 'E', 'S', 'W'];
const MAX_SIZE = 9;

const PARAMS = {
  1: { moves: [4, 7], turns: [1, 2] },
  2: { moves: [7, 11], turns: [2, 3] },
  3: { moves: [9, 14], turns: [2, 4] },
};
const HINTS = {
  1: 'Prends la clé 🔑 puis va au coffre !',
  2: 'Prends la clé 🔑 puis va au coffre !',
  3: 'La clé 🔑 est cachée : fais un détour !',
};

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const int = (rnd, lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));
const pick = (rnd, arr) => arr[Math.floor(rnd() * arr.length)];
const turnDir = (d, delta) => DIRS[(DIRS.indexOf(d) + delta + 4) % 4];

// Marche aléatoire : renvoie { cells, dirs, turns } ou null.
// dirs[i] = direction du déplacement cells[i] -> cells[i+1]; turns[i] = 'left'|'right'|null avant ce déplacement.
function walk(rnd, p) {
  const nTurns = int(rnd, p.turns[0], p.turns[1]);
  const lens = [];
  let total = 0;
  for (let i = 0; i <= nTurns; i++) { const l = int(rnd, 1, 4); lens.push(l); total += l; }
  if (total < p.moves[0] || total > p.moves[1]) return null;
  const startDir = pick(rnd, DIRS);
  const cells = [[0, 0]];
  const seen = new Set(['0,0']);
  const dirs = [];
  const turns = [];
  let dir = startDir;
  for (let s = 0; s < lens.length; s++) {
    let turn = null;
    if (s > 0) {
      const delta = rnd() < 0.5 ? -1 : 1;
      turn = delta < 0 ? 'left' : 'right';
      dir = turnDir(dir, delta);
    }
    for (let k = 0; k < lens[s]; k++) {
      const [x, y] = cells[cells.length - 1];
      const nx = x + VEC[dir][0];
      const ny = y + VEC[dir][1];
      if (seen.has(`${nx},${ny}`)) return null;
      // aucun voisin orthogonal déjà sur le chemin, sauf la case précédente
      for (const d of DIRS) {
        const ax = nx + VEC[d][0];
        const ay = ny + VEC[d][1];
        if (ax === x && ay === y) continue;
        if (seen.has(`${ax},${ay}`)) return null;
      }
      cells.push([nx, ny]);
      seen.add(`${nx},${ny}`);
      dirs.push(dir);
      turns.push(k === 0 ? turn : null);
    }
  }
  return { cells, dirs, turns, startDir };
}

function compress(actions) {
  const out = [];
  let i = 0;
  while (i < actions.length) {
    if (actions[i] !== 'forward') { out.push({ type: actions[i] }); i++; continue; }
    let j = i;
    while (j < actions.length && actions[j] === 'forward') j++;
    let n = j - i;
    while (n >= 3) {
      const k = Math.min(5, n);
      out.push({ type: 'repeat', times: k, body: [{ type: 'forward' }] });
      n -= k;
    }
    for (let q = 0; q < n; q++) out.push({ type: 'forward' });
    i = j;
  }
  return out;
}

function build(seed, difficulty) {
  const rnd = mulberry32(seed);
  const p = PARAMS[difficulty];
  let w = null;
  for (let t = 0; t < 200 && !w; t++) {
    w = walk(rnd, p);
    if (w) {
      const xs = w.cells.map((c) => c[0]);
      const ys = w.cells.map((c) => c[1]);
      const sw = Math.max(...xs) - Math.min(...xs) + 3;
      const sh = Math.max(...ys) - Math.min(...ys) + 3;
      if (sw > MAX_SIZE || sh > MAX_SIZE) w = null;
    }
  }
  if (!w) return null;
  const { cells, dirs, turns, startDir } = w;
  const n = dirs.length;
  const kinds = cells.map(() => '#');
  kinds[0] = 'S';
  kinds[n] = 'T';

  // ponts
  const nb = int(rnd, 0, 2) + (difficulty === 1 ? 1 : 0);
  for (let b = 0; b < nb; b++) {
    const i = int(rnd, 1, n - 1);
    if (kinds[i] === '#') kinds[i] = '=';
  }
  // clé (toujours) : sur le chemin, ou (3) au bout d'une courte branche en cul-de-sac
  let keyAt = -1; // index de la case du chemin après laquelle on fait le détour
  let keyCell = null; // case de la branche
  let keySide = 0;
  if (difficulty === 3) {
    const onPath = new Set(cells.map((c) => `${c[0]},${c[1]}`));
    const cand = [];
    for (let j = 1; j < n; j++) {
      if (turns[j] !== null || dirs[j] !== dirs[j - 1]) continue;
      for (const sd of [-1, 1]) {
        const bd = turnDir(dirs[j], sd);
        const bx = cells[j][0] + VEC[bd][0];
        const by = cells[j][1] + VEC[bd][1];
        if (onPath.has(`${bx},${by}`)) continue;
        const clear = DIRS.every((d) => {
          const ax = bx + VEC[d][0];
          const ay = by + VEC[d][1];
          return (ax === cells[j][0] && ay === cells[j][1]) || !onPath.has(`${ax},${ay}`);
        });
        if (clear) cand.push({ j, sd, bx, by });
      }
    }
    if (cand.length) {
      const c = pick(rnd, cand);
      keyAt = c.j; keySide = c.sd; keyCell = [c.bx, c.by];
    }
  }
  if (!keyCell) {
    const cand = [];
    for (let i = 1; i < n; i++) if (kinds[i] === '#' || kinds[i] === '=') cand.push(i);
    kinds[pick(rnd, cand)] = 'K';
  }

  // actions à plat
  const actions = [];
  for (let i = 0; i < n; i++) {
    if (turns[i]) actions.push(turns[i]);
    actions.push('forward');
    if (keyCell && i + 1 === keyAt) {
      const t = keySide < 0 ? 'left' : 'right';
      actions.push(t, 'forward', t, t, 'forward', t);
    }
  }

  const cards = ['forward', 'left', 'right'];
  const hasRepeat = difficulty >= 2;
  if (hasRepeat) cards.push('repeat');
  const solution = hasRepeat ? compress(actions) : actions.map((type) => ({ type }));

  // grille
  const all = keyCell ? [...cells, keyCell] : cells;
  const minX = Math.min(...all.map((c) => c[0]));
  const minY = Math.min(...all.map((c) => c[1]));
  const W = Math.max(...all.map((c) => c[0])) - minX + 3;
  const H = Math.max(...all.map((c) => c[1])) - minY + 3;
  if (W > MAX_SIZE || H > MAX_SIZE) return null;
  const grid = Array.from({ length: H }, () => Array(W).fill('.'));
  cells.forEach((c, i) => { grid[c[1] - minY + 1][c[0] - minX + 1] = kinds[i]; });
  if (keyCell) grid[keyCell[1] - minY + 1][keyCell[0] - minX + 1] = 'K';

  const level = {
    id: 'surprise',
    random: true,
    seed,
    difficulty,
    title: 'Surprise 🎲',
    hint: HINTS[difficulty],
    map: grid.map((r) => r.join('')),
    dir: startDir,
    cards,
    solution,
  };
  if (hasRepeat) level.maxCards = countCards(solution) + 2;
  return level;
}

function fallback(seed, difficulty) {
  const level = {
    id: 'surprise',
    random: true,
    seed,
    difficulty,
    title: 'Surprise 🎲',
    hint: HINTS[difficulty],
    map: ['.....', '.SKT.', '.....'],
    dir: 'E',
    cards: ['forward', 'left', 'right'],
    solution: [{ type: 'forward' }, { type: 'forward' }],
  };
  return level;
}

export function generateLevel(seed, difficulty = 1) {
  const d = [1, 2, 3].includes(difficulty) ? difficulty : 1;
  const s0 = seed >>> 0;
  for (let i = 0; i < 50; i++) {
    const s = (s0 + Math.imul(i, 0x9e3779b1)) >>> 0;
    const lvl = build(s, d);
    if (lvl && run(lvl, lvl.solution).outcome === 'win') {
      lvl.seed = s0;
      return lvl;
    }
  }
  return fallback(s0, d);
}
