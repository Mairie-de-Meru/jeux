// Pinceaux : données et petites fonctions pures.
export const BRUSHES = [
  { id: 'pinceau', nom: 'Pinceau', icone: '🖌️', size: 22, alpha: 1, kind: 'round' },
  { id: 'fin', nom: 'Fin', icone: '✏️', size: 6, alpha: 1, kind: 'round' },
  { id: 'gros', nom: 'Gros', icone: '🖍️', size: 34, alpha: 1, kind: 'round' },
  { id: 'feutre', nom: 'Feutre', icone: '🖊️', size: 28, alpha: 0.4, kind: 'marker' },
  { id: 'arcenciel', nom: 'Arc-en-ciel', icone: '🌈', size: 24, alpha: 1, kind: 'rainbow' },
  { id: 'paillettes', nom: 'Paillettes', icone: '✨', size: 16, alpha: 1, kind: 'sparkle' },
  { id: 'gomme', nom: 'Gomme', icone: '🧽', size: 44, alpha: 1, kind: 'erase' },
];

export function getBrush(id) {
  return BRUSHES.find((b) => b.id === id) || null;
}

/** Points intermédiaires de p0 (exclu) vers p1 (inclus si atteint), espacés de `spacing`. */
export function interpolate(p0, p1, spacing = 4) {
  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  const dist = Math.hypot(dx, dy);
  const out = [];
  if (!(spacing > 0) || dist < spacing) return out;
  const n = Math.floor(dist / spacing);
  for (let i = 1; i <= n; i++) {
    const t = (i * spacing) / dist;
    out.push({ x: p0.x + dx * t, y: p0.y + dy * t });
  }
  return out;
}

/** Teinte (0..360) selon la distance parcourue. */
export function rainbowHue(distance) {
  return ((distance * 0.6) % 360 + 360) % 360;
}

/** Générateur pseudo-aléatoire déterministe. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** n paillettes autour de (x,y) : [{x,y,size,hue}], rng() dans [0,1). */
export function sparkles(rng, x, y, radius, n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = rng() * Math.PI * 2;
    const d = Math.sqrt(rng()) * radius;
    out.push({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, size: 3 + rng() * 7, hue: Math.floor(rng() * 360) });
  }
  return out;
}
