// Paliers 1 et 2 : tri par forme, puis par forme et couleur.
import { makeRng, pick, shuffle } from './rng.mjs';
import { SHAPES, COLORS, SHAPE_IDS, COLOR_IDS, label } from './shapes.mjs';

const FORMES_NIVEAU_1 = ['cube', 'sphere', 'cylindre', 'cone', 'pyramide'];

export function makeSortRound(level, seed) {
  const rng = makeRng(seed);
  let mode, bins, nbItems;
  if (level === 1) {
    mode = 'forme';
    bins = shuffle(rng, FORMES_NIVEAU_1).slice(0, 3).map((shape) => ({ shape, color: null }));
    nbItems = 8;
  } else {
    mode = 'forme+couleur';
    const formes = shuffle(rng, SHAPE_IDS).slice(0, 2);
    const couleurs = shuffle(rng, COLOR_IDS).slice(0, 2);
    bins = [];
    for (const shape of formes) for (const color of couleurs) bins.push({ shape, color });
    nbItems = 10;
  }
  // Chaque caisse reçoit 2 objets, le reste est tiré au hasard.
  const cibles = [];
  for (const b of bins) cibles.push(b, b);
  while (cibles.length < nbItems) cibles.push(pick(rng, bins));
  const items = shuffle(rng, cibles).map((b, i) => ({
    id: `item-${i}`,
    shape: b.shape,
    color: mode === 'forme' ? pick(rng, COLOR_IDS) : b.color,
  }));
  return { mode, bins: bins.map((b, i) => ({ id: `bin-${i}`, ...b })), items };
}

export function matches(item, bin, mode) {
  if (item.shape !== bin.shape) return false;
  return mode === 'forme' ? true : item.color === bin.color;
}

export function hintFor(item, bin, mode) {
  if (matches(item, bin, mode)) return 'Bravo !';
  const s = SHAPES[item.shape];
  const memeForme = item.shape === bin.shape;
  if (mode === 'forme') {
    const de = s.feminin ? `de la ${s.nom}` : /^[aeiouéèêh]/i.test(s.nom) ? `de l'${s.nom}` : `du ${s.nom}`;
    return `Presque ! C'est ${s.feminin ? 'une' : 'un'} ${s.nom}. Cherche la caisse ${de}.`;
  }
  const c = COLORS[item.color];
  if (memeForme) {
    return `Bonne forme ! Regarde la couleur : ${s.feminin ? 'elle est' : 'il est'} ${s.feminin ? c.nomF : c.nom}.`;
  }
  if (item.color === bin.color) {
    return `Bonne couleur ! Regarde la forme : c'est ${s.feminin ? 'une' : 'un'} ${s.nom}.`;
  }
  return `Presque ! C'est ${label(item.shape, item.color)}. Cherche sa caisse.`;
}
