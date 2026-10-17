// Sac de lettres (fréquences françaises, 100 tuiles, sans jokers) et points simplifiés.
export const DISTRIBUTION = {
  A: 9, B: 2, C: 2, D: 3, E: 15, F: 2, G: 2, H: 2, I: 8, J: 1, K: 1, L: 5, M: 3,
  N: 6, O: 6, P: 2, Q: 1, R: 6, S: 6, T: 6, U: 6, V: 2, W: 1, X: 1, Y: 1, Z: 1,
};

export const POINTS = {};
for (const l of 'AEILNORSTU') POINTS[l] = 1;
for (const l of 'DGM') POINTS[l] = 2;
for (const l of 'BCP') POINTS[l] = 3;
for (const l of 'FHV') POINTS[l] = 4;
for (const l of 'JQ') POINTS[l] = 8;
for (const l of 'KWXYZ') POINTS[l] = 10;

export const pointsOf = (l) => POINTS[l] || 0;
export const isVowel = (l) => 'AEIOUY'.indexOf(l) >= 0;

export const BAG_SIZE = { 1: 60, 2: 80, 3: 100 };

export function fullBag() {
  const out = [];
  for (const [l, n] of Object.entries(DISTRIBUTION)) for (let i = 0; i < n; i++) out.push(l);
  return out;
}
