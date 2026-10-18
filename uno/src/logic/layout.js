// Plus grande largeur de carte (ratio 2/3) pour que n cartes tiennent dans la boîte sans défilement.
export function fitCardWidth({ n, boxW, boxH, gap = 6, maxW, minW = 36, rowMinW = 44, ratio = 1.5, lift = 6 }) {
  if (n <= 0) return maxW;
  // Rapetisser avant d'ajouter une rangée : plus petit nombre de rangées r dont la largeur reste >= rowMinW.
  for (let r = 1; r <= n; r++) {
    const k = Math.ceil(n / r);
    const w = Math.min(Math.floor(maxW), Math.floor((boxW + gap) / k - gap));
    if (w < rowMinW) continue;
    if (r * (w * ratio) + (r - 1) * gap + lift <= boxH) return w;
  }
  for (let w = Math.floor(maxW); w > minW; w--) {
    const perRow = Math.max(1, Math.floor((boxW + gap) / (w + gap)));
    const rows = Math.ceil(n / perRow);
    const h = rows * (w * ratio) + (rows - 1) * gap + lift;
    if (h <= boxH) return w;
  }
  return minW;
}

// Main en éventail (pur). Positions en pixels dans la boîte (coin haut-gauche de chaque carte avant rotation).
// Une rangée si les cartes gardent une partie visible >= minStrip, en rétrécissant jusqu'à rowMinW ;
// sinon deux arcs (arc arrière + arc avant) ; en dernier recours minW, recouvrement forcé.
const M = 10; // marge latérale (coins des cartes inclinées)
export function fanLayout({ n, boxW, boxH, maxW, minW = 36, rowMinW = 44, minStrip = 34, ratio = 1.5, lift = 14 }) {
  if (n <= 0) return { w: Math.floor(maxW), h: Math.floor(maxW) * ratio, rows: 0, items: [] };
  // boîte nulle ou minuscule (mise en page pas encore calculée) : minimum raisonnable, jamais 0 carte rendue
  boxW = Math.max(boxW || 0, 2 * minW);
  boxH = Math.max(boxH || 0, minW * ratio + lift + 2);
  const geom = (rows, w) => {
    const h = w * ratio, drop = h * 0.07, dy = h * 0.42;
    const kFront = Math.ceil(n / rows);
    const stepMax = w * 0.92;
    const stepOf = (k) => (k > 1 ? Math.min(stepMax, (boxW - 2 * M - w) / (k - 1)) : 0);
    const needH = h + drop + (rows - 1) * dy + lift + 10;
    const ok = (kFront <= 1 || stepOf(kFront) >= minStrip) && needH <= boxH && w <= boxW;
    return { w, h, drop, dy, stepOf, ok };
  };
  let rows = 1, g = null;
  for (let w = Math.floor(maxW); w >= rowMinW && !g; w--) { const c = geom(1, w); if (c.ok) g = c; }
  if (!g) {
    rows = 2;
    for (let w = Math.floor(maxW); w >= minW && !g; w--) { const c = geom(2, w); if (c.ok) g = c; }
    if (!g) g = geom(2, minW);
  }
  const items = new Array(n);
  const place = (from, count, rowFromFront) => {
    const step = g.stepOf(count);
    const x0 = (boxW - (g.w + step * (count - 1))) / 2;
    const maxA = Math.min(10, 1.5 * (count - 1));
    const baseTop = boxH - g.h - g.drop - 10 - rowFromFront * g.dy;
    for (let i = 0; i < count; i++) {
      const t = count > 1 ? (i / (count - 1) - 0.5) * 2 : 0;
      items[from + i] = { i: from + i, x: x0 + i * step, y: baseTop + t * t * g.drop, rot: t * maxA, z: (rowFromFront === 0 ? 100 : 0) + i, row: rowFromFront };
    }
  };
  if (rows === 1) place(0, n, 0);
  else { const back = Math.floor(n / 2); place(0, back, 1); place(back, n - back, 0); }
  return { w: g.w, h: g.h, rows, items };
}
