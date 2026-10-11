export const BOARD_SIZE = 18;

export function makeBoard() {
  const cases = [];
  for (let i = 0; i < BOARD_SIZE; i++) {
    if (i % 3 === 0) cases.push({ index: i, type: 'quartier', cat: i / 3 });
    else cases.push({ index: i, type: 'normal', cat: (Math.floor(i / 3) + (i % 3 === 1 ? 2 : 4)) % 6 });
  }
  return cases;
}

export function destinations(pos, roll, size = BOARD_SIZE) {
  const mod = (n) => ((n % size) + size) % size;
  const out = [];
  for (const d of [mod(pos + roll), mod(pos - roll)]) if (!out.includes(d)) out.push(d);
  return out;
}
