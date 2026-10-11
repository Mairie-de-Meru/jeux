// Paliers : 2 poubelles, puis 3, puis 5.
export const LEVELS = [
  { bins: ['jaune', 'vert'], items: ['bouteille', 'canette', 'pot'], total: 6, baseSpeed: 0.6 },
  { bins: ['jaune', 'vert', 'marron'], items: ['bouteille', 'canette', 'pot', 'carton', 'trognon'], total: 8, baseSpeed: 0.7 },
  { bins: ['jaune', 'vert', 'bleu', 'marron', 'piles'], items: ['bouteille', 'canette', 'pot', 'carton', 'trognon', 'journal', 'pile'], total: 10, baseSpeed: 0.8 },
];
