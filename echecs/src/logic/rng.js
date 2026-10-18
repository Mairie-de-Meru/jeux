// RNG semé (mulberry32) : reproductible pour les tests et le robot.
export function makeRng(seed = 1) {
  let a = (seed >>> 0) || 1;
  const rng = function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return rng;
}
export function randInt(rng, n) { return Math.floor(rng() * n); }
export function shuffle(rng, arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randInt(rng, i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
