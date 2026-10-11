// Données pures des 6 instruments.
const def = (id, nom, couleur, freq) => Object.freeze({ id, nom, couleur, freq });

export const INSTRUMENTS = Object.freeze([
  def('tambour', 'Tambour', '#e8483b', 110),
  def('xylophone', 'Xylophone', '#ffb703', 659.25),
  def('maracas', 'Maracas', '#2ec4b6', 5000),
  def('trompette', 'Trompette', '#fb8500', 392),
  def('piano', 'Piano', '#3a86ff', 523.25),
  def('triangle', 'Triangle', '#9b5de5', 1568),
]);

const NB_PAR_PALIER = { 1: 4, 2: 5, 3: 6 };

export function instrumentsPourPalier(palier) {
  const n = NB_PAR_PALIER[palier] ?? 4;
  return INSTRUMENTS.slice(0, n).map((i) => i.id);
}

export function getInstrument(id) {
  return INSTRUMENTS.find((i) => i.id === id);
}
