// Révision espacée simple. Module pur, deck immuable et sérialisable.
// Bornes : poids initial 1 ; raté -> x3 (max 9) ; réussi du premier coup -> /2 (min 0.5).

export const WEIGHT_MIN = 0.5;
export const WEIGHT_MAX = 9;

export function createDeck(facts) {
  const weights = {};
  for (const f of facts) weights[f.key] = 1;
  return { weights, facts: facts.slice() };
}

export function recordAnswer(deck, key, firstTryCorrect) {
  if (!(key in deck.weights)) return deck;
  const w = deck.weights[key];
  const next = firstTryCorrect ? Math.max(w / 2, WEIGHT_MIN) : Math.min(w * 3, WEIGHT_MAX);
  return { ...deck, weights: { ...deck.weights, [key]: next } };
}

/** Tirage pondéré ; ne renvoie jamais lastKey s'il y a plus d'un fait. */
export function pickNext(deck, rng = Math.random, lastKey = null) {
  let pool = deck.facts;
  if (pool.length > 1) pool = pool.filter((f) => f.key !== lastKey);
  let total = 0;
  for (const f of pool) total += deck.weights[f.key] ?? 1;
  let r = rng() * total;
  for (const f of pool) {
    r -= deck.weights[f.key] ?? 1;
    if (r < 0) return f;
  }
  return pool[pool.length - 1];
}
