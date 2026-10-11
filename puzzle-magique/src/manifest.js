// Manifeste des puzzles (données pures). Les 8 premiers gardent leurs indices (compatibilité de start()).
export const CATEGORIES = [
  { id: 'animaux', label: 'Animaux', emoji: '🦁' },
  { id: 'vehicules', label: 'Véhicules', emoji: '🚗' },
  { id: 'monuments', label: 'Monuments', emoji: '🗼' },
  { id: 'paysages', label: 'Paysages', emoji: '🏔️' },
  { id: 'contes', label: 'Contes', emoji: '🏰' },
];

const d = (id, label, cat, emoji, c1, c2) => ({ id, label, cat, emoji, c1, c2, file: `./assets/img/${id}.png` });

export const IMAGES = [
  d('lion', 'Le lion', 'animaux', '🦁', '#ffd36b', '#ff9a3c'),
  d('panda', 'Le panda', 'animaux', '🐼', '#a8e6a1', '#4fb477'),
  d('train', 'Le train', 'vehicules', '🚂', '#9fd3ff', '#4d8fe8'),
  d('fusee', 'La fusée', 'vehicules', '🚀', '#3b2f7a', '#8d5cf6'),
  d('montagne', 'La montagne', 'paysages', '🏔️', '#bfe3ff', '#7fb6e8'),
  d('plage', 'La plage', 'paysages', '🏖️', '#8be0ff', '#ffe08a'),
  d('chateau', 'Le château', 'contes', '🏰', '#f7b6e0', '#b983ff'),
  d('dragon', 'Le dragon', 'contes', '🐉', '#ffb3a1', '#ef5d60'),
  d('tour-eiffel', 'La tour Eiffel', 'monuments', '🗼', '#ffd6e8', '#8fb8ff'),
  d('pyramides', 'Les pyramides', 'monuments', '🏜️', '#ffe9a8', '#e8a64d'),
  d('statue-liberte', 'La statue de la Liberté', 'monuments', '🗽', '#b8f0e0', '#4db6ac'),
  d('mont-saint-michel', 'Le Mont-Saint-Michel', 'monuments', '⛪', '#cfe3ff', '#8aa4d6'),
  d('big-ben', 'Big Ben', 'monuments', '🕰️', '#d8c8ff', '#7f6cd6'),
  d('voiture-course', 'La voiture de course', 'vehicules', '🏎️', '#ffb3b3', '#e63946'),
  d('voiture-ancienne', 'La vieille voiture', 'vehicules', '🚙', '#f3e0b5', '#b98b4d'),
  d('avion', "L'avion", 'vehicules', '✈️', '#aee3ff', '#3f8fe0'),
  d('elephant', "L'éléphant", 'animaux', '🐘', '#d9e4ee', '#8a9db3'),
  d('girafe', 'La girafe', 'animaux', '🦒', '#ffe38a', '#e8a33d'),
  d('dauphin', 'Le dauphin', 'animaux', '🐬', '#8fe0ff', '#2b8fd6'),
  d('foret-automne', "La forêt d'automne", 'paysages', '🍂', '#ffcf8a', '#d9622b'),
  d('banquise', 'La banquise', 'paysages', '🧊', '#e4f6ff', '#8fc9ee'),
];
export const TITLE_FILE = './assets/img/titre.png';
