// Tampons : polygones [{x,y}].
export function starPoints(cx, cy, r, branches = 5, inner = 0.45) {
  const pts = [];
  for (let i = 0; i < branches * 2; i++) {
    const rad = i % 2 === 0 ? r : r * inner;
    const a = -Math.PI / 2 + (i * Math.PI) / branches;
    pts.push({ x: cx + Math.cos(a) * rad, y: cy + Math.sin(a) * rad });
  }
  return pts;
}

export function heartPoints(cx, cy, r, n = 40) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    const hx = 16 * Math.pow(Math.sin(t), 3);
    const hy = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    pts.push({ x: cx + (hx / 17) * r, y: cy - (hy / 17) * r });
  }
  return pts;
}
