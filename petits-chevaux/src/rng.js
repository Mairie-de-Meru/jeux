// Générateur pseudo-aléatoire seedé (mulberry32), pur.
export function createRng(seed = 1) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Dé à six faces : 1..6
export function rollDie(rng) {
  return 1 + Math.floor(rng() * 6);
}
