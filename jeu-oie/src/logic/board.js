// Plateaux du jeu de l'oie : 30 cases (palier 1), 63 cases (paliers 2 et 3).
export function palierSize(palier) {
  return palier === 1 ? 30 : 63;
}

const OIES_30 = [5, 9, 14, 18, 23, 27];
const OIES_63 = [5, 9, 14, 18, 23, 27, 32, 36, 41, 45, 50, 54, 59];

export function makeBoard(palier, { death = true } = {}) {
  const n = palierSize(palier);
  const cases = Array.from({ length: n + 1 }, (_, i) => ({
    n: i,
    type: i === 0 ? 'depart' : i === n ? 'fin' : 'normal',
  }));
  const set = (i, type, target) => {
    cases[i] = target === undefined ? { n: i, type } : { n: i, type, target };
  };
  if (palier === 1) {
    OIES_30.forEach((i) => set(i, 'oie'));
    set(6, 'pont', 12);
    set(19, 'auberge');
  } else {
    OIES_63.forEach((i) => set(i, 'oie'));
    set(6, 'pont', 12);
    set(19, 'auberge');
    set(31, 'puits');
    set(42, 'labyrinthe', 37);
    set(52, 'prison');
    if (palier === 3 && death) set(58, 'mort', 1);
  }
  return { n, cases };
}
