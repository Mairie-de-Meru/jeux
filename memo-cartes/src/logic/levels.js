const raw = [
  { rows: 2, cols: 2 },
  { rows: 2, cols: 3 },
  { rows: 3, cols: 4 },
  { rows: 4, cols: 4 },
];
export const LEVELS = raw.map((l) => ({ ...l, pairs: (l.rows * l.cols) / 2 }));
