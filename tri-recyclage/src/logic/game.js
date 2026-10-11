// État de partie. Fonctions pures : chaque appel renvoie un nouvel état (copie superficielle).
import { LEVELS } from './levels.js';
import { binOf, itemById } from './catalog.js';
import { mulberry32 } from './rng.js';

function buildQueue(level, rng) {
  const types = level.items;
  const ids = [];
  const pick = (allowed) => allowed[Math.floor(rng() * allowed.length) % allowed.length];
  // chaque type au moins une fois si possible, puis tirage libre
  const base = [];
  const pool = types.slice();
  while (base.length < level.total && pool.length) {
    base.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  }
  while (base.length < level.total) base.push(pick(types));
  // mélange Fisher-Yates
  for (let i = base.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [base[i], base[j]] = [base[j], base[i]];
  }
  // pas 3 identiques d'affilée : échange avec un élément qui ne recrée pas de série
  for (let pass = 0; pass < 4; pass++) {
    for (let i = 2; i < base.length; i++) {
      if (base[i] === base[i - 1] && base[i] === base[i - 2]) {
        for (let j = 0; j < base.length; j++) {
          if (base[j] === base[i]) continue;
          const t = base.slice();
          [t[i], t[j]] = [t[j], t[i]];
          if (!hasTriple(t)) { base.splice(0, base.length, ...t); break; }
        }
      }
    }
  }
  for (let i = 0; i < base.length; i++) ids.push(base[i]);
  return ids;
}

function hasTriple(a) {
  for (let i = 2; i < a.length; i++) if (a[i] === a[i - 1] && a[i] === a[i - 2]) return true;
  return false;
}

export function createGame(levelIndex, seed = 1, rng = mulberry32(seed)) {
  const level = LEVELS[levelIndex];
  if (!level) throw new Error('palier inconnu ' + levelIndex);
  const ids = buildQueue(level, rng);
  return {
    levelIndex,
    level,
    queue: ids.map((itemId, n) => ({ uid: n + 1, itemId })),
    onBelt: [],
    sorted: 0,
    total: level.total,
    errors: 0,
    attempts: 0,
    missed: 0,
    done: false,
    gauge: 0,
  };
}

export function spawnNext(state) {
  if (!state.queue.length) return { state, item: null };
  const [item, ...rest] = state.queue;
  return { state: { ...state, queue: rest, onBelt: [...state.onBelt, item] }, item };
}

export function sortItem(state, uid, binId) {
  const item = state.onBelt.find((i) => i.uid === uid);
  if (!item) return { state, correct: false, item: null, expectedBin: null, pourquoi: '' };
  const expectedBin = binOf(item.itemId);
  const pourquoi = itemById(item.itemId).pourquoi;
  const attempts = state.attempts + 1;
  if (binId === expectedBin) {
    const sorted = state.sorted + 1;
    const next = {
      ...state,
      onBelt: state.onBelt.filter((i) => i.uid !== uid),
      sorted,
      attempts,
    };
    next.gauge = gauge(next);
    next.done = isLevelDone(next);
    return { state: next, correct: true, item, expectedBin, pourquoi };
  }
  return { state: { ...state, errors: state.errors + 1, attempts }, correct: false, item, expectedBin, pourquoi };
}

export function missItem(state, uid) {
  const item = state.onBelt.find((i) => i.uid === uid);
  if (!item) return state;
  return {
    ...state,
    onBelt: state.onBelt.filter((i) => i.uid !== uid),
    queue: [...state.queue, item],
    missed: state.missed + 1,
  };
}

export function currentSpeed(state) {
  const base = state.level.baseSpeed;
  return Math.min(base * (1 + 0.12 * Math.floor(state.sorted / 3)), base * 1.5);
}

export function gauge(state) {
  return state.total ? state.sorted / state.total : 0;
}

export function isLevelDone(state) {
  return state.sorted === state.total;
}

export function starsFor(state) {
  if (state.errors <= 1) return 3;
  if (state.errors <= 3) return 2;
  return 1;
}
