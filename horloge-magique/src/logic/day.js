// Moments de la journée et ciel (pur).
export const MOMENTS = [
  { id: 'reveil', label: 'le réveil', de: 'du réveil', emoji: '⏰', time: 7 * 60, image: 'assets/img/reveil.png' },
  { id: 'petitdej', label: 'le petit-déjeuner', de: 'du petit-déjeuner', emoji: '🥣', time: 7 * 60 + 30, image: 'assets/img/petitdej.png' },
  { id: 'ecole', label: "l'école", de: "de l'école", emoji: '🎒', time: 8 * 60 + 30, image: 'assets/img/ecole.png' },
  { id: 'dejeuner', label: 'le déjeuner', de: 'du déjeuner', emoji: '🍝', time: 12 * 60, image: null },
  { id: 'gouter', label: 'le goûter', de: 'du goûter', emoji: '🍪', time: 16 * 60, image: 'assets/img/gouter.png' },
  { id: 'bain', label: 'le bain', de: 'du bain', emoji: '🛁', time: 18 * 60, image: 'assets/img/bain.png' },
  { id: 'dodo', label: 'le dodo', de: 'du dodo', emoji: '🌙', time: 20 * 60, image: 'assets/img/dodo.png' },
];

export function skyPeriod(t) {
  const h = (((t % 1440) + 1440) % 1440) / 60;
  if (h < 6 || h >= 21) return 'nuit';
  if (h < 11) return 'matin';
  if (h < 15) return 'midi';
  return 'soir';
}

// Points d'ancrage (heure, période) pour une interpolation douce.
const ANCHORS = [
  [1, 'nuit'], [7.5, 'matin'], [13, 'midi'], [18, 'soir'], [22, 'nuit'], [25, 'nuit'],
];

export function skyBlend(t) {
  let h = (((t % 1440) + 1440) % 1440) / 60;
  if (h < 1) h += 24;
  for (let i = 0; i < ANCHORS.length - 1; i++) {
    const [a, from] = ANCHORS[i];
    const [b, to] = ANCHORS[i + 1];
    if (h >= a && h < b) return { from, to, k: (h - a) / (b - a) };
  }
  return { from: 'nuit', to: 'nuit', k: 0 };
}
