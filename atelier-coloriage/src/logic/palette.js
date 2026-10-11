// Palette : 12 couleurs vives + blanc.
export function hexToRgba(hex) {
  let h = String(hex).replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255];
}

const BASE = [
  ['rouge', 'Rouge', '#ff3b30'],
  ['orange', 'Orange', '#ff9500'],
  ['jaune', 'Jaune', '#ffd60a'],
  ['citron', 'Vert clair', '#a6e22e'],
  ['vert', 'Vert', '#2ecc40'],
  ['turquoise', 'Turquoise', '#1ed6c8'],
  ['ciel', 'Bleu ciel', '#4fc3ff'],
  ['bleu', 'Bleu', '#2f5bff'],
  ['violet', 'Violet', '#9b4dff'],
  ['rose', 'Rose', '#ff5fb7'],
  ['marron', 'Marron', '#a0602d'],
  ['noir', 'Noir', '#222222'],
  ['blanc', 'Blanc', '#ffffff'],
];

export const PALETTE = BASE.map(([id, nom, hex]) => ({ id, nom, hex, rgba: hexToRgba(hex) }));
