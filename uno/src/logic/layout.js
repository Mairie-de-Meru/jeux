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
