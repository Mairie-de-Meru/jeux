// Plateaux : taille, cases bonus par palier.
export const PALIERS = {
  1: { size: 9, maxWord: 4, hint: 'full', bonus: false, label: 'Petit plateau' },
  2: { size: 11, maxWord: 7, hint: 'text', bonus: true, label: 'Plateau moyen' },
  3: { size: 15, maxWord: 7, hint: 'none', bonus: true, label: 'Grand plateau' },
};

// L2/L3 = lettre x2/x3 ; W2/W3 = mot x2/x3
const BASES = {
  2: { W3: [[0, 5]], W2: [[1, 1], [2, 2], [5, 5]], L3: [[1, 4]], L2: [[0, 2], [4, 4], [3, 5]] },
  3: {
    W3: [[0, 0], [0, 7]],
    W2: [[1, 1], [2, 2], [3, 3], [4, 4], [7, 7]],
    L3: [[1, 5], [5, 5]],
    L2: [[0, 3], [2, 6], [3, 7], [6, 6]],
  },
};

function symetriques(n, r, c) {
  const m = n - 1;
  return [[r, c], [c, r], [m - r, c], [r, m - c], [m - r, m - c], [c, m - r], [m - c, r], [m - c, m - r]];
}

export function makePremium(palier) {
  const { size, bonus } = PALIERS[palier];
  const grid = Array.from({ length: size }, () => Array(size).fill(''));
  if (!bonus) return grid;
  for (const code of ['W3', 'W2', 'L3', 'L2']) {
    for (const [r, c] of BASES[palier][code]) {
      for (const [rr, cc] of symetriques(size, r, c)) if (!grid[rr][cc]) grid[rr][cc] = code;
    }
  }
  return grid;
}

export const centerOf = (palier) => (PALIERS[palier].size - 1) / 2;
