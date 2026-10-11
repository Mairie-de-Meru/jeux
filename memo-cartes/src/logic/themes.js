// Thèmes : 8 items distincts chacun.
export const THEMES = {
  animaux: {
    id: 'animaux', nom: 'Animaux', couleur: '#ff8a3d',
    items: [
      { key: 'vache', nom: 'la vache', emoji: '🐮' },
      { key: 'cochon', nom: 'le cochon', emoji: '🐷' },
      { key: 'mouton', nom: 'le mouton', emoji: '🐑' },
      { key: 'poule', nom: 'la poule', emoji: '🐔' },
      { key: 'cheval', nom: 'le cheval', emoji: '🐴' },
      { key: 'canard', nom: 'le canard', emoji: '🦆' },
      { key: 'chevre', nom: 'la chèvre', emoji: '🐐' },
      { key: 'lapin', nom: 'le lapin', emoji: '🐰' },
    ],
  },
  fruits: {
    id: 'fruits', nom: 'Fruits', couleur: '#ff4d6d',
    items: [
      { key: 'pomme', nom: 'la pomme', emoji: '🍎' },
      { key: 'banane', nom: 'la banane', emoji: '🍌' },
      { key: 'fraise', nom: 'la fraise', emoji: '🍓' },
      { key: 'poire', nom: 'la poire', emoji: '🍐' },
      { key: 'cerise', nom: 'la cerise', emoji: '🍒' },
      { key: 'raisin', nom: 'le raisin', emoji: '🍇' },
      { key: 'orange', nom: 'l’orange', emoji: '🍊' },
      { key: 'ananas', nom: 'l’ananas', emoji: '🍍' },
    ],
  },
  vehicules: {
    id: 'vehicules', nom: 'Véhicules', couleur: '#3d9bff',
    items: [
      { key: 'voiture', nom: 'la voiture', emoji: '🚗' },
      { key: 'bus', nom: 'le bus', emoji: '🚌' },
      { key: 'tracteur', nom: 'le tracteur', emoji: '🚜' },
      { key: 'avion', nom: 'l’avion', emoji: '✈️' },
      { key: 'bateau', nom: 'le bateau', emoji: '⛵' },
      { key: 'train', nom: 'le train', emoji: '🚂' },
      { key: 'velo', nom: 'le vélo', emoji: '🚲' },
      { key: 'fusee', nom: 'la fusée', emoji: '🚀' },
    ],
  },
};
export const THEME_IDS = ['animaux', 'fruits', 'vehicules'];
