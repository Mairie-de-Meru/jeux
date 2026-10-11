// Galerie : liste de tableaux (plus récent d'abord) et disposition murale.
export function addArtwork(list, item, max = 8) {
  return [item, ...(Array.isArray(list) ? list : [])].slice(0, max);
}

/** Remplace l'élément de même id (ou ajoute) et le remonte en tête. */
export function replaceArtwork(list, item, max = 8) {
  const rest = (Array.isArray(list) ? list : []).filter((it) => !(it && item && it.id === item.id));
  return [item, ...rest].slice(0, max);
}

/** Positions des n cadres sur un mur circulaire (rayon `radius`), face au centre. */
export function wallLayout(n, radius) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const angle = (i / n) * Math.PI * 2;
    out.push({
      angle,
      x: Math.sin(angle) * radius,
      z: Math.cos(angle) * radius,
      rotY: angle + Math.PI, // la normale du cadre pointe vers le centre
    });
  }
  return out;
}
