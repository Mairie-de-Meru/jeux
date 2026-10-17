// Générateur pseudo-aléatoire mulberry32 : l'état est un petit objet JSON {s}.
export function newRng(seed = 1) {
  return { s: (seed >>> 0) || 1 };
}

export function rngNext(r) {
  r.s = (r.s + 0x6d2b79f5) >>> 0;
  let t = r.s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function rngInt(r, n) {
  return Math.floor(rngNext(r) * n);
}

export function shuffle(r, arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = rngInt(r, i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// mulberry32(seed) -> () => [0,1)
export function mulberry32(seed) {
  const r = newRng(seed);
  const f = () => rngNext(r);
  f.state = r;
  return f;
}
