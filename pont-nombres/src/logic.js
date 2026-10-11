// Logique pure du jeu (aucun import three/DOM).

export const COLORS = {
  1: 0xf1ead8, // blanc cassé
  2: 0xe8493f, // rouge
  3: 0x8fdc6a, // vert clair
  4: 0xc25bd6, // violet/rose
  5: 0xffd93b, // jaune
  6: 0x1f8f4a, // vert foncé
  7: 0x3c3f4a, // anthracite doux
  8: 0x8a5a33, // marron
  9: 0x2f7bec, // bleu
  10: 0xff8a1f, // orange
};

export const LEVELS = [
  { id: 1, mode: 'add', max: 10 },
  { id: 2, mode: 'add', max: 20 },
  { id: 3, mode: 'sub', max: 20 },
  { id: 4, mode: 'twoWays', max: 10 },
];
export const ROUNDS_PER_LEVEL = 3;

// mulberry32
export function makeRng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ri = (rng, a, b) => a + Math.floor(rng() * (b - a + 1));
const range = (a, b) => Array.from({ length: Math.max(0, b - a + 1) }, (_, i) => a + i);

function shuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = ri(rng, 0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function genSub(rng) {
  const target = ri(rng, 5, 15);
  const excess = ri(rng, 1, 5);
  const mMin = Math.ceil(target / 10);
  const mMax = Math.min(4, target);
  const m = ri(rng, mMin, mMax);
  const parts = new Array(m).fill(1);
  let left = target - m;
  while (left > 0) {
    const i = ri(rng, 0, m - 1);
    if (parts[i] < 10) {
      parts[i]++;
      left--;
    }
  }
  const prefilled = shuffle([...parts, excess], rng);
  return { mode: 'sub', target, prefilled, tray: [] };
}

export function generateRound(levelIndex, roundIndex, rng) {
  const level = LEVELS[levelIndex];
  switch (level.mode) {
    case 'add': {
      if (level.max <= 10) {
        const target = levelIndex === 0 && roundIndex === 0 ? ri(rng, 2, 5) : ri(rng, 2, 10);
        return { mode: 'add', target, prefilled: [], tray: range(1, Math.min(target, 10)) };
      }
      const target = ri(rng, 11, 20);
      return { mode: 'add', target, prefilled: [], tray: range(1, 10) };
    }
    case 'sub':
      return genSub(rng);
    case 'twoWays': {
      const target = ri(rng, 4, 10);
      return { mode: 'twoWays', target, prefilled: [], tray: range(1, target - 1) };
    }
    default:
      throw new Error('palier inconnu');
  }
}

export function evaluate(target, bricks) {
  const sum = bricks.reduce((s, v) => s + v, 0);
  const status = sum < target ? 'short' : sum > target ? 'long' : 'exact';
  return { sum, status, diff: Math.abs(target - sum) };
}

export function hintText(ev, mode) {
  if (ev.status === 'short') return `Il manque ${ev.diff} !`;
  if (ev.status === 'long') return mode === 'sub' ? `Enlève ${ev.diff} !` : `${ev.diff} de trop !`;
  return 'Bravo !';
}

const sortedKey = (a) => a.slice().sort((x, y) => x - y).join(',');
export function sameWay(a, b) {
  return a.length === b.length && sortedKey(a) === sortedKey(b);
}
export function isNewWay(ways, bricks) {
  return !ways.some((w) => sameWay(w, bricks));
}

export function starsFor(hintsUsed) {
  return hintsUsed <= 0 ? 3 : hintsUsed === 1 ? 2 : 1;
}

export function nextProgress(progress) {
  const { level, round } = progress;
  if (round + 1 < ROUNDS_PER_LEVEL) return { level, round: round + 1, done: false };
  if (level + 1 < LEVELS.length) return { level: level + 1, round: 0, done: false };
  return { level, round, done: true };
}
