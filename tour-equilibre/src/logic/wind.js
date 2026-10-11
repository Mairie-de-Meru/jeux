export function windForce(t, wind) {
  if (!wind) return 0;
  const f = wind.strength * (0.6 + 0.4 * Math.sin((2 * Math.PI * t) / wind.period));
  return Math.max(0, f);
}
const clamp01 = (v) => Math.min(1, Math.max(0, v));
export function windsockState(force, maxStrength) {
  const r = maxStrength > 0 ? clamp01(force / maxStrength) : 0;
  // angle 0 = pendante, 1 = horizontale ; inflate = gonflage
  return { angle: r, inflate: r };
}
