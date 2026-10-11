// 15 niveaux. Carte : . eau, # sol, = pont, R rocher, S départ, T trésor, K clé (sur sol, ramassée en passant ; une par niveau, le coffre ne s'ouvre qu'avec elle).
const f = { type: 'forward' };
const L = { type: 'left' };
const R = { type: 'right' };
const rep = (times, ...body) => ({ type: 'repeat', times, body });

export const levels = [
  {
    id: 1, title: 'Premiers pas', hint: 'Prends la clé 🔑, puis va jusqu’au coffre.',
    map: ['.....', '.SKT.', '.....'], dir: 'E',
    cards: ['forward'],
    solution: [f, f],
  },
  {
    id: 2, title: 'Un virage', hint: 'Avance, tourne, et avance encore.',
    map: ['.....', '.S#K.', '...#.', '...T.'], dir: 'E',
    cards: ['forward', 'left', 'right'],
    solution: [f, f, R, f, f],
  },
  {
    id: 3, title: 'Deux virages', hint: 'Il y a deux virages sur le chemin.',
    map: ['......', '.S#=..', '...K..', '...#=T', '......'], dir: 'E',
    cards: ['forward', 'left', 'right'],
    solution: [f, f, R, f, f, L, f, f],
  },
  {
    id: 4, title: 'Zigzag', hint: 'Avance, tourne, avance : comme un escalier.',
    map: ['........', '.....R..', '.S##....', '...#K#..', '..R..#T.', '........'], dir: 'E',
    cards: ['forward', 'left', 'right'],
    solution: [f, f, R, f, L, f, f, R, f, L, f],
  },
  {
    id: 5, title: 'Demi-tour', hint: 'Le chemin fait un grand U.',
    map: ['......', '.S#=#.', '..R.#.', '.T#K#.', '......'], dir: 'E',
    cards: ['forward', 'left', 'right'],
    solution: [f, f, f, R, f, f, R, f, f, f],
  },
  {
    id: 6, title: 'Répète !', hint: 'Utilise la carte répéter pour aller plus vite.',
    map: ['.........', '.........', 'S###K###T', '.........'], dir: 'E',
    cards: ['forward', 'repeat'], maxCards: 4,
    solution: [rep(4, f, f)],
  },
  {
    id: 7, title: 'Boucle et virage', hint: 'Répète, tourne, répète encore.',
    map: ['.......', '.S#==#.', '.....K.', '.....=.', '.....#.', '.....T.', '.......'], dir: 'E',
    cards: ['forward', 'left', 'right', 'repeat'], maxCards: 6,
    solution: [rep(4, f), R, rep(4, f)],
  },
  {
    id: 8, title: 'L’escalier', hint: 'Monte l’escalier : répète le motif !',
    map: ['S#....', '.##...', '..##..', '...K#.', '....T.', '......'], dir: 'E',
    cards: ['forward', 'left', 'right', 'repeat'], maxCards: 6,
    solution: [rep(4, f, R, f, L)],
  },
  {
    id: 9, title: 'Clé au tournant', hint: 'La clé 🔑 est juste avant le virage.',
    map: ['......', '.S#K#.', '....#.', '....T.', '......'], dir: 'E',
    cards: ['forward', 'left', 'right'],
    solution: [f, f, f, R, f, f],
  },
  {
    id: 10, title: 'La clé cachée', hint: 'La clé est au bout d’un petit chemin. Fais demi-tour !',
    map: ['.......', '...K...', '.S###T.', '.......'], dir: 'E',
    cards: ['forward', 'left', 'right'],
    solution: [f, f, L, f, L, L, f, L, f, f],
  },
  {
    id: 11, title: 'Clé et boucle', hint: 'Prends la clé, puis reviens avec une boucle.',
    map: ['.......', '.S#=#K.', '.T####.', '.......'], dir: 'E',
    cards: ['forward', 'left', 'right', 'repeat'], maxCards: 8,
    solution: [rep(4, f), R, f, R, rep(4, f)],
  },
  {
    id: 12, title: 'Le carré', hint: 'Fais le tour du carré : répète avancer et tourner.',
    map: ['......', '.S###.', '....#.', '....#.', '.T##K.', '......'], dir: 'E',
    cards: ['forward', 'left', 'right', 'repeat'], maxCards: 6,
    solution: [rep(3, f, f, f, R)],
  },
  {
    id: 13, title: 'Escalier et clé', hint: 'Monte l’escalier, prends la clé, continue tout droit.',
    map: ['.........', '.S#......', '..##.....', '...K#....', '....###T.', '.........'], dir: 'E',
    cards: ['forward', 'left', 'right', 'repeat'], maxCards: 8,
    solution: [rep(3, f, R, f, L), rep(3, f)],
  },
  {
    id: 14, title: 'Le détour', hint: 'La clé est de côté : détour, demi-tour, puis le coffre.',
    map: ['.........', '....K....', '.S#=#=#T.', '.........'], dir: 'E',
    cards: ['forward', 'left', 'right', 'repeat'], maxCards: 10,
    solution: [rep(3, f), L, f, L, L, f, L, rep(3, f)],
  },
  {
    id: 15, title: 'La grande aventure', hint: 'Un long parcours : la boucle est ton amie !',
    map: ['.......', '.S####.', '.....#.', '.....#.', '.T####.', '...K...', '.......'], dir: 'E',
    cards: ['forward', 'left', 'right', 'repeat'], maxCards: 16,
    solution: [rep(4, f), R, rep(3, f), R, f, f, L, f, L, L, f, L, f, f],
  },
];

export const getLevel = (id) => levels.find((l) => l.id === id);
