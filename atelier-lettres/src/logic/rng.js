// Générateur pseudo-aléatoire déterministe (mulberry32).
export function createRng(seed = 1) {
  let a = (seed >>> 0) || 1;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (n) => Math.floor(next() * n);
  const pick = (arr) => arr[int(arr.length)];
  const shuffle = (arr) => {
    const r = arr.slice();
    for (let i = r.length - 1; i > 0; i--) {
      const j = int(i + 1);
      [r[i], r[j]] = [r[j], r[i]];
    }
    return r;
  };
  return { next, int, pick, shuffle };
}
