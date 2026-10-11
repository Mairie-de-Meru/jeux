// blocks = [{ top, bottom, x }] ; plateforme centrée en x=0 (halfWidth optionnel).
export function towerHeight(blocks, platformTop, halfWidth = Infinity) {
  let max = -Infinity;
  for (const b of blocks) {
    if (Math.abs(b.x) > halfWidth) continue;
    if (b.bottom < platformTop - 0.3) continue; // hors plateforme (tombé)
    if (b.top > max) max = b.top;
  }
  return max === -Infinity ? 0 : Math.max(0, max - platformTop);
}
export function hasFallen(blocks, platformTop, tolerance = 0.3) {
  return blocks.some((b) => b.bottom < platformTop - tolerance);
}
export function isSettled(samples, eps) {
  return samples.every((v) => v < eps);
}
export function starsFor({ retries, misses }) {
  if (retries === 0 && misses === 0) return 3;
  if (retries + misses <= 2) return 2;
  return 1;
}
