// Génération des manches, vérification, progression. Module pur.
import { ANIMALS, FRUITS, OBJECTS, COLORS, getNoun, colorsFor } from './data.js';
import { nameEn, nameFr, promptFor } from './phrases.js';
import { pick, randInt, shuffle } from './rng.js';

export const LEVELS = {
  1: { choices: 2, combined: false, maxCount: 3 },
  2: { choices: 4, combined: false, maxCount: 6 },
  3: { choices: 4, combined: true, maxCount: 10 },
};
export const ROUNDS_PER_LEVEL = 5;

const key = (t) => `${t.noun}|${t.color || ''}|${t.count}`;
const target = (noun, color, count) => ({ noun, color, count });

function distinctSample(rng, items, n) {
  return shuffle(rng, items).slice(0, n);
}

function plainChoices(theme, L, rng) {
  switch (theme) {
    case 'colors': {
      // Un même objet décliné en plusieurs couleurs.
      const noun = pick(rng, OBJECTS).id;
      return distinctSample(rng, COLORS.map((c) => c.id), L.choices).map((c) => target(noun, c, 1));
    }
    case 'numbers': {
      const noun = pick(rng, [...ANIMALS, ...FRUITS]).id;
      const counts = Array.from({ length: L.maxCount }, (_, i) => i + 1);
      return distinctSample(rng, counts, L.choices).map((n) => target(noun, null, n));
    }
    case 'fruits':
      return distinctSample(rng, FRUITS, L.choices).map((f) => target(f.id, null, 1));
    case 'animals':
    default:
      return distinctSample(rng, ANIMALS, L.choices).map((a) => target(a.id, null, 1));
  }
}

// Une couleur ne doit jamais porter le même nom anglais que le nom (« orange oranges »).
const validColors = (nounId) => colorsFor(nounId).filter((c) => getNoun(nounId).en !== c);

function combinedPool(theme) {
  const base = theme === 'fruits' ? FRUITS : theme === 'colors' ? OBJECTS : [...FRUITS, ...OBJECTS];
  return base.filter((n) => validColors(n.id).length > 0);
}

function combinedChoices(theme, L, rng) {
  const pool = combinedPool(theme);
  const noun = pick(rng, pool);
  const color = pick(rng, validColors(noun.id));
  const count = randInt(rng, 2, L.maxCount);
  const main = target(noun.id, color, count);
  const cands = new Map();
  const add = (t) => {
    if (key(t) !== key(main)) cands.set(key(t), t);
  };
  for (let n = 2; n <= L.maxCount; n++) add(target(noun.id, color, n));
  for (const c of validColors(noun.id)) add(target(noun.id, c, count));
  for (const other of pool) {
    if (validColors(other.id).includes(color)) add(target(other.id, color, count));
  }
  const others = distinctSample(rng, [...cands.values()], L.choices - 1);
  return [main, ...others];
}

export function makeRound({ level, theme, rng = Math.random }) {
  const L = LEVELS[level];
  if (!L) throw new Error('Niveau inconnu : ' + level);
  const base = L.combined ? combinedChoices(theme, L, rng) : plainChoices(theme, L, rng);
  const correct = base[0];
  const choices = shuffle(rng, base);
  const answerIndex = choices.indexOf(correct);
  return {
    theme,
    level,
    target: correct,
    choices,
    answerIndex,
    promptEn: promptFor(correct, theme, L.combined),
    answerEn: nameEn(correct, theme),
    answerFr: nameFr(correct),
  };
}

export function checkAnswer(round, index) {
  const correct = index === round.answerIndex;
  return { correct, hintIndex: correct ? null : round.answerIndex };
}

export function createProgress(theme = 'animals', level = 1) {
  return { level, theme, roundsDone: 0, correctFirstTry: 0, errors: 0, stars: { 1: 0, 2: 0, 3: 0 } };
}

export function starsFor(correctFirstTry, rounds) {
  if (!rounds || rounds <= 0) return 1;
  const r = correctFirstTry / rounds;
  if (r >= 0.8) return 3;
  if (r >= 0.5) return 2;
  return 1;
}

export function recordAnswer(progress, { correct, firstTry }) {
  if (!correct) return { ...progress, errors: progress.errors + 1, stars: { ...progress.stars } };
  const roundsDone = progress.roundsDone + 1;
  const correctFirstTry = progress.correctFirstTry + (firstTry ? 1 : 0);
  const stars = { ...progress.stars };
  if (roundsDone >= ROUNDS_PER_LEVEL) stars[progress.level] = starsFor(correctFirstTry, roundsDone);
  return { ...progress, roundsDone, correctFirstTry, stars };
}

export function isLevelDone(progress) {
  return progress.roundsDone >= ROUNDS_PER_LEVEL;
}

export function nextLevel(progress) {
  return Math.min(3, progress.level + 1);
}

// Repart à zéro sur un niveau donné en gardant les étoiles déjà gagnées.
export function startLevel(progress, level) {
  return { ...progress, level, roundsDone: 0, correctFirstTry: 0, errors: 0, stars: { ...progress.stars } };
}

export { getNoun };
