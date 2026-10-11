import { LEVELS, nextShape } from './levels.js';
import { makeRng } from './rng.js';
import { starsFor } from './tower.js';

// Marge de victoire : les blocs s'enfoncent un peu au contact, 4,59 compte pour 4,6.
export const WIN_TOLERANCE = 0.1;

export function createGame(levelIndex, seed = 1) {
  const level = LEVELS[levelIndex];
  const rng = makeRng(seed);
  const g = {
    level, state: 'aiming', retries: 0, misses: 0, placed: 0, height: 0,
    currentShape: null, lastShape: null,
    drop() { if (g.state === 'aiming') g.state = 'dropping'; },
    landed(height) {
      if (g.state !== 'dropping') return;
      g.height = height; g.placed++; g.lastShape = g.currentShape;
      if (height >= level.targetHeight - WIN_TOLERANCE) g.state = 'won';
      else { g.state = 'aiming'; g.currentShape = nextShape(level, height, rng, g.lastShape); }
    },
    missed() {
      if (g.state !== 'dropping') return;
      g.misses++; g.state = 'aiming';
      g.currentShape = nextShape(level, g.height, rng, g.lastShape);
    },
    fell() { if (g.state !== 'won') g.state = 'fallen'; },
    retry() {
      if (g.state !== 'fallen') return;
      g.retries++; g.placed = 0; g.height = 0; g.lastShape = null; g.state = 'aiming';
      g.currentShape = nextShape(level, 0, rng);
    },
    stars() { return starsFor({ retries: g.retries, misses: g.misses }); },
  };
  g.currentShape = nextShape(level, 0, rng);
  return g;
}
