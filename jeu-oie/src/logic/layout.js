// Positions des cases sur une spirale : la case n est au centre, la case 0 à l'extérieur.
export function spiralPositions(n) {
  const pts = new Array(n + 1);
  pts[n] = { x: 0, z: 0 };
  const step = 1.02;
  const b = 1.18 / (2 * Math.PI);
  let phi = 0;
  let r = 1.5;
  for (let j = 1; j <= n; j++) {
    pts[n - j] = { x: r * Math.cos(phi), z: r * Math.sin(phi) };
    phi += step / r;
    r = 1.5 + b * phi;
  }
  return pts;
}

export function boardRadius(pts) {
  let m = 0;
  for (const p of pts) m = Math.max(m, Math.hypot(p.x, p.z));
  return m;
}
