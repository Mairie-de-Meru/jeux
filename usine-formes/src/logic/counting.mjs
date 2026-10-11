// Palier 3 : compter faces et sommets d'un solide.
import { makeRng, shuffle } from './rng.mjs';
import { SHAPES } from './shapes.mjs';

const POLYEDRES = ['cube', 'pave', 'pyramide', 'prisme'];

function manche(shape, quoi) {
  return { shape, quoi, reponse: SHAPES[shape][quoi] };
}

export function makeCountRounds(seed) {
  const rng = makeRng(seed);
  const sommets = shuffle(rng, POLYEDRES.map((s) => manche(s, 'sommets')));
  const faces = shuffle(rng, POLYEDRES.filter((s) => s !== 'cube').map((s) => manche(s, 'faces')));
  const reste = shuffle(rng, [sommets[2], sommets[3], ...faces]).slice(0, 2);
  const suite = shuffle(rng, [sommets[0], sommets[1], ...reste]);
  return [manche('cube', 'faces'), ...suite];
}

export function createCounter(total) {
  const vus = new Set();
  return {
    touch(id) {
      const nouveau = !vus.has(id);
      vus.add(id);
      return { nouveau, compte: vus.size };
    },
    get compte() { return vus.size; },
    total,
    get complet() { return vus.size >= total; },
  };
}

export function answerChoices(reponse, rng) {
  const candidats = [reponse - 2, reponse - 1, reponse + 1, reponse + 2].filter((n) => n >= 1);
  const autres = shuffle(rng, candidats).slice(0, 2);
  return [reponse, ...autres].sort((a, b) => a - b);
}

export function checkAnswer(round, n) {
  return round.reponse === n;
}
