// Génération des pièces de puzzle (tenons / mortaises). Unités : cellule = 1 x 1.
import { mulberry32 } from './rng.js';

const JITTER = 0.08;

export function generateEdges(cols, rows, rng) {
  const edge = () => ({ s: rng() < 0.5 ? 1 : -1, j: (rng() * 2 - 1) * JITTER });
  const h = [];
  for (let r = 0; r < rows - 1; r++) {
    const row = [];
    for (let c = 0; c < cols; c++) row.push(edge());
    h.push(row);
  }
  const v = [];
  for (let r = 0; r < rows; r++) {
    const row = [];
    for (let c = 0; c < cols - 1; c++) row.push(edge());
    v.push(row);
  }
  return { h, v };
}

export function pieceSides(edges, c, r, cols, rows) {
  const top = r < rows - 1 ? edges.h[r][c] : null;
  const bottom = r > 0 ? edges.h[r - 1][c] : null;
  const right = c < cols - 1 ? edges.v[r][c] : null;
  const left = c > 0 ? edges.v[r][c - 1] : null;
  return {
    top: top ? top.s : 0,
    bottom: bottom ? -bottom.s : 0,
    right: right ? right.s : 0,
    left: left ? -left.s : 0,
    j: {
      top: top ? top.j : 0,
      bottom: bottom ? bottom.j : 0,
      right: right ? right.j : 0,
      left: left ? left.j : 0,
    },
  };
}

// Profil du tenon (demi-gauche puis demi-droite), relatif au centre du bord.
// Chaque courbe : [p0, c1, c2, p3] ; hauteur max 0.22, largeur de tête 0.30.
const CURVES = [
  [[-0.12, 0], [-0.05, 0], [-0.06, 0.04], [-0.06, 0.08]],
  [[-0.06, 0.08], [-0.06, 0.115], [-0.15, 0.11], [-0.15, 0.15]],
  [[-0.15, 0.15], [-0.15, 0.19], [-0.09, 0.22], [0, 0.22]],
  [[0, 0.22], [0.09, 0.22], [0.15, 0.19], [0.15, 0.15]],
  [[0.15, 0.15], [0.15, 0.11], [0.06, 0.115], [0.06, 0.08]],
  [[0.06, 0.08], [0.06, 0.04], [0.05, 0], [0.12, 0]],
];

// Bord canonique de (0,0) à (1,0). sign 0 = droit ; sinon déformation y = sign * profil.
export function edgePoints(sign, j = 0, segments = 12) {
  if (!sign) return [[0, 0], [1, 0]];
  const t0 = 0.5 + j;
  const pts = [[0, 0]];
  const P = (p) => [t0 + p[0], sign * p[1]];
  pts.push(P(CURVES[0][0]));
  for (const [p0, c1, c2, p3] of CURVES) {
    for (let i = 1; i <= segments; i++) {
      const t = i / segments, u = 1 - t;
      const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
      pts.push(P([
        a * p0[0] + b * c1[0] + c * c2[0] + d * p3[0],
        a * p0[1] + b * c1[1] + c * c2[1] + d * p3[1],
      ]));
    }
  }
  pts.push([1, 0]);
  return pts;
}

// Bord horizontal entre (c,r) et (c,r+1), en coordonnées plateau, sens +x.
function hEdge(edges, r, c, seg) {
  const e = edges.h[r][c];
  return edgePoints(e.s, e.j, seg).map(([t, y]) => [c + t, r + 1 + y]);
}
// Bord vertical entre (c,r) et (c+1,r), en coordonnées plateau, sens +y.
function vEdge(edges, r, c, seg) {
  const e = edges.v[r][c];
  return edgePoints(-e.s, e.j, seg).map(([t, y]) => [c + 1 - y, r + t]);
}

export function pieceOutline(edges, c, r, cols, rows, segments = 12) {
  const bottom = r === 0 ? [[c, r], [c + 1, r]] : hEdge(edges, r - 1, c, segments);
  const right = c === cols - 1 ? [[c + 1, r], [c + 1, r + 1]] : vEdge(edges, r, c, segments);
  const top = r === rows - 1 ? [[c + 1, r + 1], [c, r + 1]] : hEdge(edges, r, c, segments).reverse();
  const left = c === 0 ? [[c, r + 1], [c, r]] : vEdge(edges, r, c - 1, segments).reverse();
  const cx = c + 0.5, cy = r + 0.5;
  const out = [];
  for (const side of [bottom, right, top, left]) {
    for (let i = 0; i < side.length - 1; i++) out.push([side[i][0] - cx, side[i][1] - cy]);
  }
  return out;
}

export function buildPuzzle(cols, rows, seed) {
  const edges = generateEdges(cols, rows, mulberry32(seed));
  const pieces = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      pieces.push({
        id: r * cols + c, c, r,
        target: [c + 0.5, r + 0.5],
        outline: pieceOutline(edges, c, r, cols, rows),
      });
    }
  }
  return { cols, rows, edges, pieces };
}
