// Paliers du jeu : 4, 6, 9, 12, 16, 24 pièces. La rotation n'existe qu'au dernier.
export const LEVELS = [
  { pieces: 4, cols: 2, rows: 2, rotation: false },
  { pieces: 6, cols: 3, rows: 2, rotation: false },
  { pieces: 9, cols: 3, rows: 3, rotation: false },
  { pieces: 12, cols: 4, rows: 3, rotation: false },
  { pieces: 16, cols: 4, rows: 4, rotation: false },
  { pieces: 24, cols: 6, rows: 4, rotation: true },
];

export function gridFor(n) {
  const l = LEVELS.find((x) => x.pieces === n);
  return l ? { cols: l.cols, rows: l.rows } : null;
}
