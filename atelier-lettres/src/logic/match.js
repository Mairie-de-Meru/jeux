// Atelier 2 : paires, tri, intrus. Module pur.
import { GLYPHS, STYLES } from './glyphs.js';

const ALPHA = 'abcdefghijklmnopqrstuvwxyz'.split('');
const CURSIVE_LETTERS = Object.keys(GLYPHS.cursive);

const lettersFor = (styles) => (styles.includes('cursive') ? CURSIVE_LETTERS : ALPHA);

export function makePairsRound(rng, { count = 3, styles = ['caps', 'script'] } = {}) {
  const letters = rng.shuffle(lettersFor(styles)).slice(0, count);
  const tiles = [];
  letters.forEach((letter, i) => {
    tiles.push({ id: `p${i}a`, letter, style: styles[0] });
    tiles.push({ id: `p${i}b`, letter, style: styles[1] });
  });
  return { type: 'pairs', tiles: rng.shuffle(tiles) };
}

export function checkPair(a, b) {
  return !!a && !!b && a.id !== b.id && a.letter === b.letter && a.style !== b.style;
}

export function makeSortRound(rng, { count = 6 } = {}) {
  const letters = rng.shuffle(ALPHA).slice(0, count);
  const tiles = letters.map((letter, i) => ({ id: `s${i}`, letter, style: i % 2 === 0 ? 'caps' : 'script' }));
  return { type: 'sort', tiles: rng.shuffle(tiles) };
}

export function checkSort(tile, bin) {
  if (bin !== 'maj' && bin !== 'min') return false;
  return (tile.style === 'caps') === (bin === 'maj');
}

export function makeIntrusRound(rng) {
  const [main, other] = rng.shuffle(CURSIVE_LETTERS);
  const styles = rng.shuffle(STYLES).concat([rng.pick(STYLES)]); // 4 styles, tous présents
  const tiles = styles.map((style, i) => ({ id: `i${i}`, letter: main, style }));
  const intruder = { id: 'i4', letter: other, style: rng.pick(STYLES) };
  tiles.push(intruder);
  return { type: 'intrus', tiles: rng.shuffle(tiles), answer: intruder.id };
}

export function checkIntrus(round, tileId) {
  return round.answer === tileId;
}
