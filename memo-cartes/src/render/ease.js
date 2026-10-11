export const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
export const easeOutQuad = (t) => 1 - (1 - t) * (1 - t);
export const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export function easeOutBack(t) {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}
// Squash & stretch : facteur ~1 qui oscille et s'amortit (t dans [0,1]).
export const squash = (t, amp = 0.15) => 1 + amp * Math.sin(t * Math.PI * 2) * (1 - t);
