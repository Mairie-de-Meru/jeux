import { equivalent, compare } from './fractions.js';
import { pick, shuffle } from './rng.js';

export const NB_MANCHES = 4;

export const LEVELS = [
  { id: 1, name: 'Repérer', icon: '👀', type: 'identify', nbManches: NB_MANCHES, showFraction: 'none' },
  { id: 2, name: 'Découper', icon: '🔪', type: 'cut', nbManches: NB_MANCHES, showFraction: 'none' },
  { id: 3, name: 'Servir', icon: '🍽️', type: 'serve', nbManches: NB_MANCHES, showFraction: 'small' },
  { id: 4, name: 'Comparer', icon: '⚖️', type: 'compare', nbManches: NB_MANCHES, showFraction: 'big' },
  { id: 5, name: 'Équivalences', icon: '🟰', type: 'equivalence', nbManches: NB_MANCHES, showFraction: 'small' },
];

export const ANIMALS = ['bear', 'cat', 'rabbit', 'pig', 'fox'];
export const FOODS = ['pizza', 'cake'];
export const KNIFE_COUNTS = [2, 3, 4, 6, 8];

const F = (n, d) => ({ n, d });
const SERVE_POOL = [F(1, 2), F(1, 3), F(1, 4), F(2, 4), F(3, 4), F(2, 3)];
const EQUIV = [
  { cut: 4, n: 2, target: F(1, 2) },
  { cut: 6, n: 2, target: F(1, 3) },
  { cut: 6, n: 4, target: F(2, 3) },
  { cut: 8, n: 4, target: F(1, 2) },
  { cut: 8, n: 6, target: F(3, 4) },
];

export function getLevel(id) {
  return LEVELS.find((l) => l.id === id);
}

export function generateRound(levelId, roundIndex, rng) {
  const level = getLevel(levelId);
  if (!level) throw new RangeError(`niveau inconnu : ${levelId}`);
  const food = FOODS[roundIndex % 2];
  const animal = pick(rng, ANIMALS);
  const base = { levelId, roundIndex, type: level.type, food, animal };

  switch (level.type) {
    case 'identify': {
      const targets = [F(1, 2), F(1, 4), F(1, 3)];
      const target = roundIndex < 3 ? targets[roundIndex] : pick(rng, targets);
      const opts = roundIndex === 0 ? [F(1, 2), F(1, 6), F(1, 8)] : [F(1, 2), F(1, 3), F(1, 4)];
      const options = shuffle(rng, opts);
      const answer = options.findIndex((o) => equivalent(o, target));
      return { ...base, target, options, answer };
    }
    case 'cut': {
      const parts = roundIndex === 0 ? 2 : roundIndex === 1 ? 4 : roundIndex === 2 ? 3 : pick(rng, [6, 8]);
      return { ...base, parts, target: F(1, parts) };
    }
    case 'serve': {
      const target =
        roundIndex === 0 ? F(1, 2)
        : roundIndex === 1 ? pick(rng, [F(1, 3), F(1, 4)])
        : roundIndex === 2 ? pick(rng, [F(2, 4), F(3, 4)])
        : pick(rng, [F(2, 3), F(3, 4), F(2, 4)]);
      return { ...base, target, parts: target.d, served: target.n };
    }
    case 'compare': {
      const easy = [[F(1, 4), F(3, 4)], [F(1, 3), F(2, 3)], [F(1, 2), F(1, 4)]];
      let pair;
      if (roundIndex === 0) pair = pick(rng, easy);
      else {
        const all = [];
        for (let i = 0; i < SERVE_POOL.length; i++)
          for (let j = i + 1; j < SERVE_POOL.length; j++)
            if (compare(SERVE_POOL[i], SERVE_POOL[j]) !== 0) all.push([SERVE_POOL[i], SERVE_POOL[j]]);
        pair = pick(rng, all);
      }
      const fractions = shuffle(rng, pair);
      const answer = compare(fractions[0], fractions[1]) > 0 ? 0 : 1;
      const other = pick(rng, ANIMALS.filter((a) => a !== animal));
      return { ...base, fractions, answer, animals: [animal, other] };
    }
    case 'equivalence': {
      const e = roundIndex === 0 ? EQUIV[0] : pick(rng, EQUIV.slice(1));
      return { ...base, target: e.target, parts: e.cut, served: e.n, written: F(e.n, e.cut) };
    }
    default:
      throw new Error('type inconnu');
  }
}
