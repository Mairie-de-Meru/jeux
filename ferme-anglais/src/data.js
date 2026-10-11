// Vocabulaire en/fr. Module pur (aucun import three ni DOM).
const animal = (id, en, enPlural, fr, frPlural, gender) => ({ id, en, enPlural, fr, frPlural, gender, theme: 'animals', model: id });
const fruit = (id, en, enPlural, fr, frPlural, gender, colors) => ({ id, en, enPlural, fr, frPlural, gender, theme: 'fruits', model: id, colors });
const object = (id, en, enPlural, fr, frPlural, gender) => ({ id, en, enPlural, fr, frPlural, gender, theme: 'colors', model: id, colors: null });

export const ANIMALS = [
  animal('cow', 'cow', 'cows', 'vache', 'vaches', 'f'),
  animal('pig', 'pig', 'pigs', 'cochon', 'cochons', 'm'),
  animal('sheep', 'sheep', 'sheep', 'mouton', 'moutons', 'm'),
  animal('duck', 'duck', 'ducks', 'canard', 'canards', 'm'),
  animal('horse', 'horse', 'horses', 'cheval', 'chevaux', 'm'),
  animal('chicken', 'chicken', 'chickens', 'poule', 'poules', 'f'),
  animal('dog', 'dog', 'dogs', 'chien', 'chiens', 'm'),
  animal('cat', 'cat', 'cats', 'chat', 'chats', 'm'),
];

// colors : couleurs réalistes, la première est la couleur par défaut.
export const FRUITS = [
  fruit('apple', 'apple', 'apples', 'pomme', 'pommes', 'f', ['red', 'green', 'yellow']),
  fruit('banana', 'banana', 'bananas', 'banane', 'bananes', 'f', ['yellow']),
  fruit('pear', 'pear', 'pears', 'poire', 'poires', 'f', ['green', 'yellow']),
  fruit('strawberry', 'strawberry', 'strawberries', 'fraise', 'fraises', 'f', ['red']),
  fruit('cherry', 'cherry', 'cherries', 'cerise', 'cerises', 'f', ['red']),
  fruit('orange', 'orange', 'oranges', 'orange', 'oranges', 'f', ['orange']),
  fruit('lemon', 'lemon', 'lemons', 'citron', 'citrons', 'm', ['yellow']),
];

export const OBJECTS = [
  object('ball', 'ball', 'balls', 'balle', 'balles', 'f'),
  object('balloon', 'balloon', 'balloons', 'ballon', 'ballons', 'm'),
  object('bucket', 'bucket', 'buckets', 'seau', 'seaux', 'm'),
  object('flower', 'flower', 'flowers', 'fleur', 'fleurs', 'f'),
];

const col = (id, en, ms, fs, mp, fp, hex) => ({ id, en, fr: { ms, fs, mp, fp }, hex });
export const COLORS = [
  col('red', 'red', 'rouge', 'rouge', 'rouges', 'rouges', 0xe53935),
  col('blue', 'blue', 'bleu', 'bleue', 'bleus', 'bleues', 0x1e88e5),
  col('yellow', 'yellow', 'jaune', 'jaune', 'jaunes', 'jaunes', 0xfdd835),
  col('green', 'green', 'vert', 'verte', 'verts', 'vertes', 0x43a047),
  col('orange', 'orange', 'orange', 'orange', 'orange', 'orange', 0xfb8c00),
  col('purple', 'purple', 'violet', 'violette', 'violets', 'violettes', 0x8e24aa),
  col('pink', 'pink', 'rose', 'rose', 'roses', 'roses', 0xf48fb1),
  col('white', 'white', 'blanc', 'blanche', 'blancs', 'blanches', 0xf5f5f5),
];

const FR_NUM = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix'];
const EN_NUM = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
export const NUMBERS = Array.from({ length: 10 }, (_, i) => ({ n: i + 1, en: EN_NUM[i + 1], fr: FR_NUM[i + 1] }));

export const THEMES = ['animals', 'colors', 'numbers', 'fruits'];

export const THEME_LABELS = {
  animals: { fr: 'Animaux', emoji: '🐮' },
  colors: { fr: 'Couleurs', emoji: '🎨' },
  numbers: { fr: 'Nombres', emoji: '🔢' },
  fruits: { fr: 'Fruits', emoji: '🍎' },
};

const NOUN_MAP = new Map([...ANIMALS, ...FRUITS, ...OBJECTS].map((n) => [n.id, n]));
const COLOR_MAP = new Map(COLORS.map((c) => [c.id, c]));

export function getNoun(id) {
  const n = NOUN_MAP.get(id);
  if (!n) throw new Error('Nom inconnu : ' + id);
  return n;
}
export function getColor(id) {
  const c = COLOR_MAP.get(id);
  if (!c) throw new Error('Couleur inconnue : ' + id);
  return c;
}
export function getNumber(n) {
  return NUMBERS[n - 1];
}
// Couleurs autorisées pour un nom (objets : toutes).
export function colorsFor(nounId) {
  const n = getNoun(nounId);
  return n.colors ? n.colors.slice() : COLORS.map((c) => c.id);
}
// Couleur d'affichage par défaut d'un nom (null pour les animaux).
export function defaultColor(nounId) {
  const n = getNoun(nounId);
  if (n.theme === 'animals') return null;
  return n.colors ? n.colors[0] : null;
}
