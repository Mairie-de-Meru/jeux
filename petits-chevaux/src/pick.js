// Sélection tolérante : renvoie le point le plus proche du pointeur, à `max` px au plus (pur).
export function plusProche(points, px, py, max = 40) {
  let best = null, bd = max * max;
  for (const p of points) {
    const d = (p.x - px) * (p.x - px) + (p.y - py) * (p.y - py);
    if (d <= bd) { bd = d; best = p; }
  }
  return best;
}
