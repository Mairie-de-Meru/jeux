// Règles du jeu : module pur (aucun accès DOM / three.js).
import { defaultDict } from './dict.js';
import { PALIERS, makePremium, centerOf } from './board.js';
import { fullBag, BAG_SIZE, pointsOf, isVowel } from './bag.js';
import { mulberry32, shuffle } from './rng.js';

export const RACK_SIZE = 7;
export const BINGO_BONUS = 20;
export const BOT_NAMES = [
  { name: 'Panda', avatar: '🐼' },
  { name: 'Renard', avatar: '🦊' },
  { name: 'Koala', avatar: '🐨' },
];

// Injecte la grande liste dans une partie en cours (objet ou Set avec .has).
export function setBigDict(state, big) { state.validDict = big || null; }

export function createGame({ palier = 1, bots = 1, difficulty = 'facile', seed = Date.now(), dict = defaultDict, bigDict = null, playerName = 'Toi', allBots = false } = {}) {
  const cfg = PALIERS[palier];
  if (!cfg) throw new Error('palier inconnu');
  const nb = Math.max(1, Math.min(3, bots));
  const rng = mulberry32(seed);
  const bag = shuffle(fullBag(), rng).slice(0, BAG_SIZE[palier]);
  const players = [{ id: 0, name: playerName, avatar: '🧒', bot: !!allBots, rack: [], score: 0 }];
  for (let i = 0; i < nb; i++) {
    players.push({ id: i + 1, name: BOT_NAMES[i].name, avatar: BOT_NAMES[i].avatar, bot: true, rack: [], score: 0 });
  }
  const state = {
    palier,
    size: cfg.size,
    center: centerOf(palier),
    maxWord: cfg.maxWord,
    premium: makePremium(palier),
    grid: Array.from({ length: cfg.size }, () => Array(cfg.size).fill(null)),
    bag,
    players,
    turn: 0,
    passes: 0,
    firstMove: true,
    over: false,
    difficulty,
    rng,
    dict, // liste enfant : robots, idées
    validDict: bigDict, // grande liste : validation des mots de l'enfant (null = liste enfant)
    history: [],
    lastMove: null,
  };
  for (const p of players) drawTiles(state, p, RACK_SIZE);
  return state;
}

// Pioche équilibrée : on garde au moins 2 voyelles et 2 consonnes au chevalet quand le sac le permet.
export function drawTiles(state, player, n) {
  const drawn = [];
  for (let k = 0; k < n && state.bag.length > 0; k++) {
    const vow = player.rack.filter(isVowel).length;
    const con = player.rack.length - vow;
    let want = null;
    if (vow < 2) want = true;
    else if (con < 2) want = false;
    let idx = -1;
    if (want !== null) {
      const cands = [];
      state.bag.forEach((l, i) => { if (isVowel(l) === want) cands.push(i); });
      if (cands.length) idx = cands[Math.floor(state.rng() * cands.length)];
    }
    if (idx < 0) idx = Math.floor(state.rng() * state.bag.length);
    const [l] = state.bag.splice(idx, 1);
    player.rack.push(l);
    drawn.push(l);
  }
  return drawn;
}

const err = (code, message, extra = {}) => ({ ok: false, code, message, ...extra });

// Vérifie un coup (placements = [{r,c,l}]) sans rien modifier.
export function evaluateMove(state, placements, { checkRack = true, rack = null } = {}) {
  const { grid, size, premium } = state;
  if (!placements || placements.length === 0) return err('empty', 'Pose au moins une lettre.');
  const newMap = new Map();
  for (const p of placements) {
    if (p.r < 0 || p.c < 0 || p.r >= size || p.c >= size) return err('bounds', 'Cette case est hors du plateau.');
    if (grid[p.r][p.c]) return err('occupied', 'Il y a déjà une lettre ici.');
    const k = p.r * size + p.c;
    if (newMap.has(k)) return err('occupied', 'Deux lettres sur la même case.');
    newMap.set(k, p.l);
  }
  if (checkRack) {
    const pool = [...(rack || state.players[state.turn].rack)];
    for (const p of placements) {
      const i = pool.indexOf(p.l);
      if (i < 0) return err('rack', "Cette lettre n'est pas sur ton chevalet.");
      pool.splice(i, 1);
    }
  }
  const sameRow = placements.every((p) => p.r === placements[0].r);
  const sameCol = placements.every((p) => p.c === placements[0].c);
  if (!sameRow && !sameCol) return err('line', 'Pose tes lettres sur une même ligne, en ligne droite.');
  const letterAt = (r, c) => {
    if (r < 0 || c < 0 || r >= size || c >= size) return null;
    return newMap.get(r * size + c) || grid[r][c];
  };
  if (placements.length > 1) {
    if (sameRow) {
      const cs = placements.map((p) => p.c);
      for (let c = Math.min(...cs); c <= Math.max(...cs); c++) if (!letterAt(placements[0].r, c)) return err('gap', 'Il y a un trou entre tes lettres.');
    } else {
      const rs = placements.map((p) => p.r);
      for (let r = Math.min(...rs); r <= Math.max(...rs); r++) if (!letterAt(r, placements[0].c)) return err('gap', 'Il y a un trou entre tes lettres.');
    }
  }
  const mid = state.center;
  if (state.firstMove) {
    if (!placements.some((p) => p.r === mid && p.c === mid)) return err('center', 'Le premier mot doit passer par l\'étoile ⭐.');
    if (placements.length < 2) return err('short', 'Il faut au moins 2 lettres pour faire un mot.');
  } else {
    const touch = placements.some((p) =>
      [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dr, dc]) => {
        const rr = p.r + dr, cc = p.c + dc;
        return rr >= 0 && cc >= 0 && rr < size && cc < size && grid[rr][cc];
      }));
    if (!touch) return err('connect', 'Ton mot doit toucher les autres mots.');
  }

  // Mots formés (principal + croisés)
  const words = [];
  const seen = new Set();
  for (const p of placements) {
    for (const dir of ['H', 'V']) {
      const dr = dir === 'V' ? 1 : 0, dc = dir === 'H' ? 1 : 0;
      let r = p.r, c = p.c;
      while (letterAt(r - dr, c - dc)) { r -= dr; c -= dc; }
      const key = dir + r + ',' + c;
      if (seen.has(key)) continue;
      seen.add(key);
      const cells = [];
      let rr = r, cc = c;
      while (letterAt(rr, cc)) { cells.push([rr, cc]); rr += dr; cc += dc; }
      if (cells.length < 2) continue;
      words.push({ dir, cells, word: cells.map(([a, b]) => letterAt(a, b)).join('') });
    }
  }
  if (words.length === 0) return err(state.firstMove ? 'short' : 'connect', 'Il faut former un mot d\'au moins 2 lettres.');
  const tooLong = words.find((w) => w.word.length > state.maxWord);
  if (tooLong) return err('toolong', `Sur ce plateau, les mots font ${state.maxWord} lettres au plus.`, { words: [tooLong.word] });
  const unknown = words.filter((w) => !(state.validDict || state.dict).has(w.word)).map((w) => w.word);
  if (unknown.length) return err('unknown', `« ${unknown[0]} » n'est pas dans mon dictionnaire.`, { words: unknown });

  let total = 0;
  for (const w of words) {
    let sum = 0, mult = 1;
    for (const [r, c] of w.cells) {
      const l = letterAt(r, c);
      let pts = pointsOf(l);
      if (newMap.has(r * size + c)) {
        const pr = premium[r][c];
        if (pr === 'L2') pts *= 2;
        else if (pr === 'L3') pts *= 3;
        else if (pr === 'W2') mult *= 2;
        else if (pr === 'W3') mult *= 3;
      }
      sum += pts;
    }
    w.score = sum * mult;
    total += w.score;
  }
  words.sort((a, b) => b.word.length - a.word.length);
  const bingo = placements.length === RACK_SIZE && state.palier > 1;
  if (bingo) total += BINGO_BONUS;
  return { ok: true, score: total, words, bingo, newCount: placements.length };
}

function endIfNeeded(state) {
  const cur = state.players[state.turn];
  if (state.bag.length === 0 && cur.rack.length === 0) state.over = true;
  if (state.passes >= state.players.length * 2) state.over = true;
  return state.over;
}

function advance(state) {
  if (!state.over) state.turn = (state.turn + 1) % state.players.length;
}

export function applyMove(state, placements) {
  if (state.over) return err('over', 'La partie est finie.');
  const res = evaluateMove(state, placements);
  if (!res.ok) return res;
  const player = state.players[state.turn];
  for (const p of placements) {
    player.rack.splice(player.rack.indexOf(p.l), 1);
    state.grid[p.r][p.c] = p.l;
  }
  player.score += res.score;
  const drawn = drawTiles(state, player, placements.length);
  state.passes = 0;
  state.firstMove = false;
  const entry = { player: state.turn, type: 'play', placements: placements.map((p) => ({ ...p })), score: res.score, words: res.words.map((w) => w.word) };
  state.history.push(entry);
  state.lastMove = entry;
  endIfNeeded(state);
  const who = state.turn;
  advance(state);
  return { ...res, drawn, over: state.over, player: who };
}

export function passTurn(state) {
  if (state.over) return err('over', 'La partie est finie.');
  const who = state.turn;
  state.passes++;
  state.history.push({ player: who, type: 'pass' });
  endIfNeeded(state);
  advance(state);
  return { ok: true, over: state.over, player: who };
}

// Échange les lettres aux indices donnés contre de nouvelles (compte comme un tour sans points).
export function exchangeTiles(state, indices) {
  if (state.over) return err('over', 'La partie est finie.');
  const player = state.players[state.turn];
  const idx = [...new Set(indices)].filter((i) => i >= 0 && i < player.rack.length);
  if (idx.length === 0) return err('empty', 'Choisis les lettres à échanger.');
  if (state.bag.length < idx.length) return err('bag', 'Il ne reste pas assez de lettres dans le sac.');
  const out = idx.sort((a, b) => b - a).map((i) => player.rack.splice(i, 1)[0]);
  drawTiles(state, player, out.length);
  state.bag.push(...out);
  shuffle(state.bag, state.rng);
  const who = state.turn;
  state.passes++;
  state.history.push({ player: who, type: 'exchange', count: out.length });
  endIfNeeded(state);
  advance(state);
  return { ok: true, count: out.length, over: state.over, player: who };
}

// ---------- Recherche de coups (robots et bouton Idée) ----------

export function findMoves(state, rack, { maxLen = state.maxWord } = {}) {
  const { size, grid, dict } = state;
  const counts = new Array(26).fill(0);
  for (const l of rack) counts[l.charCodeAt(0) - 65]++;
  const moves = [];
  const mid = state.center;
  for (const dir of [0, 1]) {
    for (let line = 0; line < size; line++) {
      if (state.firstMove && line !== mid) continue;
      const cells = new Array(size);
      const adj = new Array(size);
      for (let i = 0; i < size; i++) {
        const r = dir === 0 ? line : i, c = dir === 0 ? i : line;
        cells[i] = grid[r][c];
        // voisins perpendiculaires occupés
        const a = dir === 0 ? (r > 0 && grid[r - 1][c]) || (r < size - 1 && grid[r + 1][c])
          : (c > 0 && grid[r][c - 1]) || (c < size - 1 && grid[r][c + 1]);
        adj[i] = !!a;
      }
      for (let start = 0; start < size; start++) {
        if (start > 0 && cells[start - 1]) continue;
        for (let len = 2; len <= maxLen && start + len <= size; len++) {
          const end = start + len - 1;
          if (end + 1 < size && cells[end + 1]) continue;
          let nNew = 0, connected = false, hasMid = false;
          for (let i = start; i <= end; i++) {
            if (cells[i]) connected = true;
            else { nNew++; if (adj[i]) connected = true; if (i === mid) hasMid = true; }
          }
          if (nNew === 0 || nNew > rack.length) continue;
          if (state.firstMove) { if (!hasMid) continue; } else if (!connected) continue;
          const list = dict.byLen[len];
          if (!list) continue;
          for (const w of list) {
            const left = counts.slice();
            let ok = true;
            for (let i = 0; i < len; i++) {
              const ch = w[i];
              const have = cells[start + i];
              if (have) { if (have !== ch) { ok = false; break; } }
              else if (--left[ch.charCodeAt(0) - 65] < 0) { ok = false; break; }
            }
            if (!ok) continue;
            const placements = [];
            for (let i = 0; i < len; i++) {
              if (!cells[start + i]) {
                placements.push(dir === 0 ? { r: line, c: start + i, l: w[i] } : { r: start + i, c: line, l: w[i] });
              }
            }
            const res = evaluateMove(state, placements, { checkRack: false });
            if (res.ok) moves.push({ placements, score: res.score, word: res.words[0].word, words: res.words.map((x) => x.word), len: res.words[0].word.length, dir: dir === 0 ? 'H' : 'V', start: res.words[0].cells[0], mainWord: w });
          }
        }
      }
    }
  }
  return moves;
}

// Choix d'un robot : renvoie { type:'play', move } | { type:'exchange', indices } | { type:'pass' }.
export function chooseBotMove(state) {
  const player = state.players[state.turn];
  const moves = findMoves(state, player.rack);
  const rng = state.rng;
  if (moves.length === 0) {
    const k = Math.min(state.bag.length, 4, player.rack.length);
    if (k >= 1) {
      const order = shuffle(player.rack.map((_, i) => i), rng).slice(0, k);
      return { type: 'exchange', indices: order };
    }
    return { type: 'pass' };
  }
  if (state.difficulty === 'normal') {
    const best = Math.max(...moves.map((m) => m.score));
    const top = moves.filter((m) => m.score === best);
    return { type: 'play', move: top[Math.floor(rng() * top.length)] };
  }
  // facile : un mot court, parfois sans réfléchir au score
  let pool = moves.filter((m) => m.len <= 3);
  if (pool.length === 0) pool = moves.filter((m) => m.len <= 4);
  if (pool.length === 0) pool = moves;
  if (rng() < 0.25) {
    const best = Math.max(...pool.map((m) => m.score));
    pool = pool.filter((m) => m.score === best);
  }
  return { type: 'play', move: pool[Math.floor(rng() * pool.length)] };
}

// Idée pour l'enfant : un mot de 3-4 lettres si possible, bien noté.
export function suggestMove(state, rack = state.players[state.turn].rack) {
  const moves = findMoves(state, rack, { maxLen: Math.min(state.maxWord, 5) });
  if (!moves.length) return null;
  moves.sort((a, b) => (Math.min(b.len, 4) - Math.min(a.len, 4)) || (b.score - a.score));
  return moves[0];
}

export function ranking(state) {
  const sorted = [...state.players].sort((a, b) => b.score - a.score);
  const best = sorted[0].score;
  return { sorted, winners: sorted.filter((p) => p.score === best) };
}
