// Module PUR : scène à peindre.
export const ZONES = [
  { id: 'ciel', nom: 'Ciel' },
  { id: 'soleil', nom: 'Soleil' },
  { id: 'herbe', nom: 'Herbe' },
  { id: 'maison', nom: 'Maison' },
  { id: 'toit', nom: 'Toit' },
  { id: 'porte', nom: 'Porte' },
  { id: 'feuillage', nom: 'Arbre' },
  { id: 'tronc', nom: 'Tronc' },
  { id: 'fleur', nom: 'Fleur' },
];

export function createPainting() {
  const couleurs = {};
  for (const z of ZONES) couleurs[z.id] = null;
  return { couleurs };
}

export function paintZone(p, zoneId, hex) {
  if (!(zoneId in p.couleurs)) return p;
  return { couleurs: { ...p.couleurs, [zoneId]: hex } };
}

export function isComplete(p) {
  return ZONES.every((z) => p.couleurs[z.id]);
}

export function progress(p) {
  return ZONES.filter((z) => p.couleurs[z.id]).length / ZONES.length;
}
