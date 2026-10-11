// Reconnaissance d'un geste de coupe : assez long et qui touche la nourriture en au moins 2 points.
export function isCutGesture({ length, hitCount, total, minLength = 60 }) {
  void total;
  return length >= minLength && hitCount >= 2;
}

export function pathLength(points) {
  let len = 0;
  for (let i = 1; i < points.length; i++) {
    len += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  }
  return len;
}

// Points intermédiaires tous les `step` px : un glissé rapide n'émet que quelques pointermove.
export function resample(points, step = 12) {
  if (points.length < 2) return points.slice();
  const out = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / step));
    for (let k = 1; k <= n; k++) out.push({ x: a.x + ((b.x - a.x) * k) / n, y: a.y + ((b.y - a.y) * k) / n });
  }
  return out;
}
