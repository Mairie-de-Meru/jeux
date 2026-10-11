// Catalogue des pièces et des couleurs. Unités : grille X/Z en cases, hauteur Y en « plaques ».
export const PIECES = {
  b1x1: { id: 'b1x1', kind: 'brick', w: 1, d: 1, h: 3, label: '1×1', studs: true },
  b1x2: { id: 'b1x2', kind: 'brick', w: 1, d: 2, h: 3, label: '1×2', studs: true },
  b2x2: { id: 'b2x2', kind: 'brick', w: 2, d: 2, h: 3, label: '2×2', studs: true },
  b2x4: { id: 'b2x4', kind: 'brick', w: 2, d: 4, h: 3, label: '2×4', studs: true },
  t1x2: { id: 't1x2', kind: 'tile', w: 1, d: 2, h: 1, label: 'Tuile 1×2', studs: false },
  t2x2: { id: 't2x2', kind: 'tile', w: 2, d: 2, h: 1, label: 'Tuile 2×2', studs: false },
  r1x2: { id: 'r1x2', kind: 'roof', w: 1, d: 2, h: 3, label: 'Toit 1×2', studs: false },
  r2x2: { id: 'r2x2', kind: 'roof', w: 2, d: 2, h: 3, label: 'Toit 2×2', studs: true },
};

export const PIECE_IDS = Object.keys(PIECES);

export const COLORS = [
  { id: 'rouge', label: 'Rouge', hex: '#e53935' },
  { id: 'orange', label: 'Orange', hex: '#fb8c00' },
  { id: 'jaune', label: 'Jaune', hex: '#fdd835' },
  { id: 'vert', label: 'Vert', hex: '#1e8e3e' },
  { id: 'bleu', label: 'Bleu', hex: '#1e88e5' },
  { id: 'violet', label: 'Violet', hex: '#8e24aa' },
  { id: 'rose', label: 'Rose', hex: '#f06292' },
  { id: 'blanc', label: 'Blanc', hex: '#fafafa' },
];

export const COLOR_IDS = COLORS.map((c) => c.id);

export function colorById(id) {
  return COLORS.find((c) => c.id === id);
}

/** Empreinte (cases X, Z) d'une pièce après `rot` quarts de tour. */
export function footprint(pieceId, rot = 0) {
  const p = PIECES[pieceId];
  if (!p) throw new Error('pièce inconnue : ' + pieceId);
  return (rot & 1) ? { w: p.d, d: p.w } : { w: p.w, d: p.d };
}
