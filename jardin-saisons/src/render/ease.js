// Easing maison, sans dépendance.
export const clamp01 = (t) => Math.min(1, Math.max(0, t));
export const lerp = (a, b, t) => a + (b - a) * t;
export function easeOutCubic(t) { t = clamp01(t); return 1 - Math.pow(1 - t, 3); }
export function easeOutBack(t, s = 1.70158) {
  t = clamp01(t) - 1;
  return t * t * ((s + 1) * t + s) + 1;
}
// Squash & stretch : t de 0 à 1 → { sx, sy } (écrasé, étiré, rebond, repos à 1).
export function squash(t) {
  t = clamp01(t);
  const w = Math.sin(t * Math.PI * 3) * Math.pow(1 - t, 1.5) * 0.28;
  return { sx: 1 - w * 0.8, sy: 1 + w };
}
