// Données des 3 paliers (pures).
const passage = { id: 'passage', genre: 'passage' };
const entre = { id: 'entreVoitures', genre: 'entreVoitures' };
const hors = { id: 'horsPassage', genre: 'horsPassage' };

export const LEVELS = [
  { id: 'ecole', nom: "L'école", but: 'ecole', etapes: [{ type: 'feu', choix: [passage] }] },
  { id: 'parc', nom: 'Le parc', but: 'parc', etapes: [{ type: 'sansFeu', choix: [entre, passage] }] },
  {
    id: 'boulangerie',
    nom: 'La boulangerie',
    but: 'boulangerie',
    etapes: [
      { type: 'feu', choix: [passage] },
      { type: 'garage' },
      { type: 'sansFeu', choix: [entre, hors, passage] },
    ],
  },
];

// Réglages de temps par palier (utilisés par main.js avec signals.js).
export const TIMING = [
  { cycle: { vertVoiture: 1, orange: 1, rougeVoiture: 8 } },
  { trafic: { periode: 12, passage: 4 } },
  {
    cycle: { vertVoiture: 5, orange: 2, rougeVoiture: 9 },
    trafic: { periode: 12, passage: 4 },
    garage: { debut: 2.5, duree: 4, periode: 14 },
  },
];
