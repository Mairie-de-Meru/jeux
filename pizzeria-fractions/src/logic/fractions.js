// Fractions : toutes les fonctions prennent des objets { n, d }.
export function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
}

export function simplify(n, d) {
  const g = gcd(n, d) || 1;
  return { n: n / g, d: d / g };
}

export function equivalent(a, b) {
  return a.n * b.d === b.n * a.d;
}

export function compare(a, b) {
  const x = a.n * b.d;
  const y = b.n * a.d;
  return x < y ? -1 : x > y ? 1 : 0;
}

const NUMBERS = { 1: 'un', 2: 'deux', 3: 'trois', 4: 'quatre', 5: 'cinq', 6: 'six', 7: 'sept', 8: 'huit' };
const DENOMS = {
  2: ['demi', 'demis'],
  3: ['tiers', 'tiers'],
  4: ['quart', 'quarts'],
  6: ['sixième', 'sixièmes'],
  8: ['huitième', 'huitièmes'],
};

export function frenchName(n, d) {
  if (!DENOMS[d]) throw new RangeError(`dénominateur non géré : ${d}`);
  if (!NUMBERS[n]) throw new RangeError(`numérateur non géré : ${n}`);
  if (n === 1 && d === 2) return 'la moitié';
  return `${NUMBERS[n]} ${DENOMS[d][n > 1 ? 1 : 0]}`;
}

export function orderPhrase(n, d, food) {
  const of = food === 'cake' || food === 'gateau' ? "d'un gâteau" : "d'une pizza";
  return `${frenchName(n, d)} ${of}`;
}

// Secteurs en radians : tableau de { start, length } couvrant exactement 2π.
export function sliceAngles(parts, offset = 0) {
  const length = (2 * Math.PI) / parts;
  return Array.from({ length: parts }, (_, i) => ({ start: offset + i * length, length }));
}
