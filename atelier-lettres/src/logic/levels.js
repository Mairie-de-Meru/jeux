// Paliers des trois ateliers. Module pur.
const CAPS_ALL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const CAPS_STRAIGHT = ['I', 'L', 'T', 'E', 'F', 'H'];

export const ROUND_SIZE = 6;

export const TRACE_LEVELS = [
  { id: 1, style: 'caps', letters: CAPS_STRAIGHT, opts: { checkDirection: false, strictOrder: false, tolerance: 0.15 } },
  { id: 2, style: 'caps', letters: CAPS_ALL.filter((c) => !CAPS_STRAIGHT.includes(c)), opts: { checkDirection: true, tolerance: 0.12 } },
  { id: 3, style: 'script', letters: 'abcdefghijklmnopqrstuvwxyz'.split(''), opts: { checkDirection: true, tolerance: 0.12 } },
  // Option cursive (bouton dans l'atelier 1) : palier 4.
  { id: 4, style: 'cursive', letters: 'acdeilmnou'.split(''), opts: { checkDirection: true, tolerance: 0.13 } },
];

export function getTraceLevel(id) {
  return TRACE_LEVELS.find((l) => l.id === id) || null;
}

export function pickLetters(level, rng, n = ROUND_SIZE) {
  return rng.shuffle(level.letters).slice(0, n);
}

// Chaque manche = suite de sous-manches.
export const MATCH_LEVELS = [
  { id: 1, rounds: [{ type: 'pairs', count: 3, styles: ['caps', 'script'] }, { type: 'pairs', count: 3, styles: ['caps', 'script'] }] },
  { id: 2, rounds: [{ type: 'sort', count: 6 }, { type: 'pairs', count: 4, styles: ['script', 'cursive'] }] },
  { id: 3, rounds: [{ type: 'intrus' }, { type: 'intrus' }, { type: 'intrus' }, { type: 'intrus' }] },
];

export function getMatchLevel(id) {
  return MATCH_LEVELS.find((l) => l.id === id) || null;
}

export const SENTENCE_LEVELS = [
  { id: 1, words: 3, count: 3 },
  { id: 2, words: 4, count: 3 },
  { id: 3, words: 5, count: 3 },
];

export function getSentenceLevel(id) {
  return SENTENCE_LEVELS.find((l) => l.id === id) || null;
}
