export const SHAPES = {
  large: { w: 3, h: 0.8, d: 2 },
  cube: { w: 1.2, h: 1.2, d: 1.2 },
  plank: { w: 3, h: 0.4, d: 1.2 },
  cylinder: { r: 0.6, h: 1.2 },
  triangle: { w: 1.6, h: 1, d: 1.2 },
  arch: { w: 2.4, h: 1.2, d: 1.2 },
};

export function shapeHeight(name) {
  const s = SHAPES[name];
  if (!s) throw new Error('forme inconnue: ' + name);
  return s.h;
}

export const LEVELS = [
  {
    id: 1, icon: '🧱',
    instruction: 'Lâche le bloc au bon moment pour monter jusqu\'au drapeau !',
    shapes: ['large'], targetHeight: 3.1,
    crane: { amplitude: 1.0, period: 5 }, wind: null, platform: null, platformWidth: 6,
  },
  {
    id: 2, icon: '🔷',
    instruction: 'Des blocs de toutes les formes. Construis jusqu\'au drapeau !',
    shapes: ['large', 'cube', 'plank', 'cylinder', 'arch', 'triangle'], targetHeight: 4.6,
    crane: { amplitude: 1.5, period: 4.5 }, wind: null, platform: null, platformWidth: 5,
  },
  {
    id: 3, icon: '💨',
    instruction: 'Attention au vent ! Regarde la manche à air.',
    shapes: ['large', 'cube', 'plank', 'arch', 'triangle'], targetHeight: 4.6,
    crane: { amplitude: 1.5, period: 4 }, wind: { strength: 2, period: 6 }, platform: null, platformWidth: 5,
  },
  {
    id: 4, icon: '🎢',
    instruction: 'Le sol bouge doucement. Garde l\'équilibre !',
    shapes: ['large', 'cube', 'plank', 'arch', 'triangle'], targetHeight: 4.6,
    crane: { amplitude: 1.5, period: 4 }, wind: null, platform: { amplitude: 0.05, period: 6 }, platformWidth: 5,
  },
];

// Le triangle (toit pointu) n'est proposé que pour le dernier bloc.
// prev = forme du dernier bloc posé : pas de triangle sur une pointe de triangle.
export function nextShape(level, towerHeight, rng, prev = null) {
  const triH = shapeHeight('triangle');
  const last = towerHeight + triH >= level.targetHeight;
  const pool = level.shapes.filter((s) => s !== 'triangle');
  if (last && prev !== 'triangle' && level.shapes.includes('triangle')) return 'triangle';
  const list = pool.length ? pool : level.shapes.filter((s) => s !== 'triangle');
  return list[Math.floor(rng() * list.length) % list.length];
}

// Arche : 2 pieds + linteau (centrée sur l'origine du bloc).
export const ARCH_PARTS = [
  { x: -0.9, y: -0.2, w: 0.6, h: 0.8, d: 1.2 },
  { x: 0.9, y: -0.2, w: 0.6, h: 0.8, d: 1.2 },
  { x: 0, y: 0.4, w: 2.4, h: 0.4, d: 1.2 },
];

// Profil du triangle (XY), origine au centre de masse (1/3 de la hauteur).
export function triangleProfile() {
  const { w, h } = SHAPES.triangle;
  return [[-w / 2, -h / 3], [w / 2, -h / 3], [0, (2 * h) / 3]];
}

// Distance entre l'origine du bloc et son sommet (pour l'accrocher à la grue).
export function topOffset(name) {
  return name === 'triangle' ? (2 * SHAPES.triangle.h) / 3 : SHAPES[name].h / 2;
}
