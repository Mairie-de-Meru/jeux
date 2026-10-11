// Dispersion des pièces autour du plateau. Coordonnées plateau, vue centrée sur le plateau.
import { shuffle } from './rng.js';

export const HUD_FRAC = 0.1;  // bande du HUD en haut, en fraction de la hauteur de vue
const MARGIN = 0.8;           // pièce entièrement visible
const CLEAR = 0.85;           // centre à >= 0.5 + 0.25 (tenon) + 0.1 du bord du plateau
const MAX_GROW = 2.4;         // agrandissement maximal de la vue

function bounds(board, view, hud = HUD_FRAC) {
  const cx = board.cols / 2, cy = board.rows / 2;
  return { x0: cx - view.width / 2 + MARGIN, x1: cx + view.width / 2 - MARGIN,
           y0: cy - view.height / 2 + MARGIN, y1: cy + view.height / 2 - MARGIN - hud * view.height };
}

function insideBoard(x, y, board) {
  return x > -CLEAR && x < board.cols + CLEAR && y > -CLEAR && y < board.rows + CLEAR;
}

function candidates(board, view, spacing, hud) {
  const b = bounds(board, view, hud);
  const out = [];
  if (b.x1 < b.x0 || b.y1 < b.y0) return out;
  const nx = Math.floor((b.x1 - b.x0) / spacing) + 1;
  const ny = Math.floor((b.y1 - b.y0) / spacing) + 1;
  const ox = (b.x1 - b.x0 - (nx - 1) * spacing) / 2, oy = (b.y1 - b.y0 - (ny - 1) * spacing) / 2;
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
    const x = b.x0 + ox + i * spacing, y = b.y0 + oy + j * spacing;
    if (!insideBoard(x, y, board)) out.push({ x, y });
  }
  return out;
}

export function scatter(n, board, view, rng, hud = HUD_FRAC) {
  let spacing = 1.1, c = candidates(board, view, spacing, hud);
  while (c.length < n && spacing > 0.6) { spacing *= 0.95; c = candidates(board, view, spacing, hud); }
  const picked = shuffle(c, rng).slice(0, n);
  // dernier recours : léger chevauchement entre pièces de la réserve, jamais sur le plateau
  const b = bounds(board, view, hud);
  for (let k = 0; picked.length < n; k++) {
    const base = c.length ? c[k % c.length] : null;
    if (base) { picked.push({ x: base.x, y: base.y }); continue; }
    picked.push({ x: b.x1, y: b.y1 });
  }
  return picked;
}

// Plus petite vue (rapport donné) qui accueille n pièces autour du plateau, HUD réservé en haut.
export function fitView(n, board, aspect, hud = HUD_FRAC) {
  const ext = 2 * (CLEAR + MARGIN) + 0.2;
  let h = Math.max((board.rows + ext) / (1 - hud), (board.cols + ext) / aspect);
  const h0 = h;
  for (let i = 0; i < 200 && h < h0 * MAX_GROW; i++) {
    const view = { width: h * aspect, height: h };
    if (candidates(board, view, 1.1, hud).length >= n) return view;
    h *= 1.03;
  }
  return { width: h * aspect, height: h };
}

export function clampToView(pos, board, view, hud = HUD_FRAC) {
  const b = bounds(board, view, hud);
  return { x: Math.min(b.x1, Math.max(b.x0, pos.x)), y: Math.min(b.y1, Math.max(b.y0, pos.y)) };
}

export function inView(pos, board, view, hud = HUD_FRAC) {
  const b = bounds(board, view, hud);
  return pos.x >= b.x0 - 1e-9 && pos.x <= b.x1 + 1e-9 && pos.y >= b.y0 - 1e-9 && pos.y <= b.y1 + 1e-9;
}
