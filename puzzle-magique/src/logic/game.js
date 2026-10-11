// État de partie. Les fonctions modifient l'état reçu et le renvoient.
import { LEVELS } from './levels.js';

export const SNAP = 0.35;

export function createGame({ level, imageId, seed = 0, rotation = false }) {
  const cfg = LEVELS[level];
  const pieces = [];
  for (let r = 0; r < cfg.rows; r++) {
    for (let c = 0; c < cfg.cols; c++) {
      pieces.push({ id: r * cfg.cols + c, target: [c + 0.5, r + 0.5], pos: [c + 0.5, r + 0.5], rot: 0, placed: false });
    }
  }
  return {
    level, imageId, seed, cols: cfg.cols, rows: cfg.rows,
    rotation: !!(rotation && cfg.rotation),
    pieces, hintsUsed: 0, moves: 0, done: false, missCount: {},
  };
}

// Positions de départ ; avec rotation, chaque pièce démarre tournée (1 à 3 quarts de tour).
export function setPositions(state, positions, rng = Math.random) {
  state.pieces.forEach((p, i) => {
    p.pos = [positions[i].x, positions[i].y];
    p.rot = state.rotation ? 1 + Math.floor(rng() * 3) : 0;
    p.placed = false;
  });
  state.done = false;
  return state;
}

export function trySnap(state, id, pos, rot) {
  const p = state.pieces[id];
  if (!p || p.placed) return { snapped: false, state };
  state.moves++;
  const x = Array.isArray(pos) ? pos[0] : pos.x, y = Array.isArray(pos) ? pos[1] : pos.y;
  const rotOk = !state.rotation || (rot ?? p.rot) % 4 === 0;
  const near = Math.hypot(x - p.target[0], y - p.target[1]) <= SNAP;
  if (near && rotOk) {
    p.pos = [p.target[0], p.target[1]];
    p.rot = 0;
    p.placed = true;
    state.missCount[id] = 0;
    state.done = state.pieces.every((q) => q.placed);
    return { snapped: true, state };
  }
  p.pos = [x, y];
  if (rot !== undefined) p.rot = ((rot % 4) + 4) % 4;
  state.missCount[id] = (state.missCount[id] || 0) + 1;
  return { snapped: false, state };
}

export function rotate(state, id) {
  const p = state.pieces[id];
  if (!state.rotation || !p || p.placed) return state;
  p.rot = (p.rot + 1) % 4;
  return state;
}

export function nextHint(state) {
  const p = state.pieces.find((q) => !q.placed);
  if (!p) return null;
  state.hintsUsed++;
  return p.id;
}

// Pièce ratée au moins 3 fois : l'interface la fait briller (sans coût).
export function needsHelp(state) {
  for (const p of state.pieces) if (!p.placed && (state.missCount[p.id] || 0) >= 3) return p.id;
  return null;
}

export function placedCount(state) { return state.pieces.filter((p) => p.placed).length; }
export function isComplete(state) { return state.pieces.every((p) => p.placed); }
export function stars(state) { return state.hintsUsed === 0 ? 3 : state.hintsUsed <= 2 ? 2 : 1; }
