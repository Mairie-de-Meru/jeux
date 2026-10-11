export function classifyPointer({ dx, dy, dt, x, width }) {
  if (Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(dy)) return dx < 0 ? 'next' : 'prev';
  if (dt < 300 && Math.abs(dx) < 10 && Math.abs(dy) < 10) return x >= width / 2 ? 'next' : 'prev';
  return null;
}
