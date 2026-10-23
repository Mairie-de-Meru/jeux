// Défis, comparaison voxel (invariante par translation et rotation de 90°) et indices.
import { PIECES, footprint } from './pieces.js';
import { Board, SIZE, toVoxels, topAt } from './board.js';

// Lettre → couleur dans les plans de couche.
const LETTERS = { R: 'rouge', O: 'orange', J: 'jaune', V: 'vert', B: 'bleu', P: 'violet', S: 'rose', W: 'blanc' };
// Briques candidates, de la plus grande à la plus petite : [type, rot].
const SHAPES = [['b2x4', 0], ['b2x4', 1], ['b2x2', 0], ['b1x2', 0], ['b1x2', 1], ['b1x1', 0]];

/**
 * Découpe une couche (Map "x,z" → couleur) en briques posées sur le plateau b, à la hauteur y.
 * Chaque brique doit reposer sur au moins une case occupée de la couche du dessous (ou le sol).
 * Recherche avec retour arrière, grandes briques d'abord.
 */
function tileLayer(b, cells, y) {
  const order = [...cells.keys()].map((k) => k.split(',').map(Number)).sort((a, c) => a[1] - c[1] || a[0] - c[0]);
  const supported = (x, z) => y === 0 || topAt(b.pieces, x, z) === y;
  const used = new Set();
  const out = [];
  const solve = (i) => {
    while (i < order.length && used.has(order[i].join(','))) i++;
    if (i === order.length) return true;
    const [cx, cz] = order[i];
    const color = cells.get(`${cx},${cz}`);
    for (const [type, rot] of SHAPES) {
      const { w, d } = footprint(type, rot);
      for (let ax = cx - w + 1; ax <= cx; ax++) for (let az = cz - d + 1; az <= cz; az++) {
        const ks = [];
        let ok = true, sup = false;
        for (let x = ax; x < ax + w && ok; x++) for (let z = az; z < az + d && ok; z++) {
          const k = `${x},${z}`;
          if (cells.get(k) !== color || used.has(k)) ok = false;
          else { ks.push(k); if (supported(x, z)) sup = true; }
        }
        if (!ok || !sup) continue;
        ks.forEach((k) => used.add(k));
        out.push([type, color, ax, az, rot]);
        if (solve(i + 1)) return true;
        out.pop();
        ks.forEach((k) => used.delete(k));
      }
    }
    return false;
  };
  if (!solve(0)) throw new Error(`couche ${y / 3} impossible à découper`);
  return out;
}

function place(b, list, [type, color, x, z, rot = 0], y) {
  const r = b.place(type, color, x, z, rot);
  if (!r.ok) throw new Error(`modèle impossible : ${type} en ${x},${z} (${r.reason})`);
  if (y !== undefined && r.y !== y) throw new Error(`${type} en ${x},${z} tombe en y=${r.y} au lieu de ${y}`);
  list.push({ type, color, x, z, rot, y: r.y });
}

/**
 * Modèle décrit couche par couche (du bas vers le haut, une couche = une hauteur de brique).
 * Chaque couche est une liste de lignes (axe Z), une lettre par case (axe X), '.' = vide.
 * `extras` : pièces posées ensuite telles quelles ([type, couleur, x, z, rot]), ex. toits.
 */
function model(layers, extras = [], at = [3, 4]) {
  const b = new Board();
  const list = [];
  layers.forEach((rows, n) => {
    const cells = new Map();
    rows.forEach((row, z) => [...row].forEach((ch, x) => {
      if (ch !== '.') cells.set(`${x + at[0]},${z + at[1]}`, LETTERS[ch]);
    }));
    for (const spec of tileLayer(b, cells, n * 3)) place(b, list, spec, n * 3);
  });
  for (const [type, color, x, z, rot] of extras) place(b, list, [type, color, x + at[0], z + at[1], rot]);
  return list;
}

/** Modèle « en relief » vu de face : lignes du haut vers le bas, extrudées sur `depth` cases. */
function relief(rows, depth = 2) {
  return model(rows.slice().reverse().map((row) => Array(depth).fill(row)));
}

/**
 * Modèle donné pièce par pièce, dans l'ordre de construction : [type, couleur, x, z, rot].
 * y est calculé en rejouant les pièces sur un plateau (chaque pièce repose sur les précédentes).
 */
function build(specs) {
  const b = new Board();
  const list = [];
  for (const spec of specs) place(b, list, spec);
  return list;
}

// Série « facile » (niveau 0) : guidée brique par brique (steps), 4 à 15 pièces.
// Repères : x = gauche → droite, z = profondeur, b1x2 rot 0 = 1 case en x × 2 en z, b2x4 rot 1 = 4 en x × 2 en z.
const EASY = [
  {
    id: 'tour', title: 'La tour', emoji: '🗼',
    pieces: build([
      ['b2x2', 'rouge', 0, 0], ['b2x2', 'jaune', 0, 0], ['b2x2', 'bleu', 0, 0], ['b2x2', 'vert', 0, 0],
    ]),
  },
  {
    id: 'lettre-l', title: 'La lettre L', emoji: '🔤',
    pieces: build([
      ['b2x4', 'bleu', 0, 0, 1],
      ['b2x2', 'rouge', 0, 0], ['b2x2', 'jaune', 0, 0], ['b2x2', 'vert', 0, 0], ['b2x2', 'violet', 0, 0],
    ]),
  },
  {
    id: 'pont', title: 'Le pont', emoji: '🌉',
    pieces: build([
      ['b1x2', 'bleu', 0, 0], ['b1x2', 'bleu', 3, 0],
      ['b1x2', 'bleu', 0, 0], ['b1x2', 'bleu', 3, 0],
      ['b2x4', 'rouge', 0, 0, 1],
    ]),
  },
  {
    id: 'escalier', title: "L'escalier", emoji: '🪜',
    pieces: build([
      ['b2x2', 'orange', 0, 0], ['b2x2', 'orange', 2, 0], ['b2x2', 'orange', 4, 0],
      ['b2x2', 'jaune', 2, 0], ['b2x2', 'jaune', 4, 0],
      ['b2x2', 'vert', 4, 0],
    ]),
  },
  {
    id: 'arbre', title: "L'arbre", emoji: '🌳',
    pieces: build([
      ['b2x2', 'orange', 1, 0], ['b2x2', 'orange', 1, 0],
      ['b2x4', 'vert', 0, 0, 1], ['b2x4', 'vert', 0, 0, 1],
      ['b2x2', 'vert', 1, 0],
      ['b1x2', 'rouge', 1, 0],
    ]),
  },
  {
    id: 'petite-voiture', title: 'La petite voiture', emoji: '🚙',
    pieces: build([
      ['b1x2', 'bleu', 0, 0], ['b1x2', 'bleu', 5, 0],
      ['b2x4', 'rouge', 0, 0, 1], ['b2x2', 'rouge', 4, 0],
      ['b2x4', 'blanc', 1, 0, 1], ['b1x2', 'jaune', 5, 0],
      ['b2x4', 'rouge', 1, 0, 1],
    ]),
  },
  {
    id: 'petite-maison', title: 'La petite maison', emoji: '🏡',
    pieces: build([
      ['b2x4', 'jaune', 0, 0, 1],
      ['b1x2', 'jaune', 0, 0], ['b1x2', 'orange', 1, 0], ['b1x2', 'bleu', 2, 0], ['b1x2', 'jaune', 3, 0],
      ['b2x4', 'jaune', 0, 0, 1],
      ['r2x2', 'rouge', 0, 0, 3], ['r2x2', 'rouge', 2, 0, 1],
    ]),
  },
  {
    id: 'petite-fleur', title: 'La petite fleur', emoji: '🌼',
    pieces: build([
      ['b2x4', 'orange', 0, 0, 1],
      ['b2x2', 'vert', 1, 0], ['b2x2', 'vert', 1, 0],
      ['b2x4', 'rose', 0, 0, 1],
      ['b1x2', 'rose', 0, 0], ['b2x2', 'jaune', 1, 0], ['b1x2', 'rose', 3, 0],
      ['b2x4', 'rose', 0, 0, 1],
    ]),
  },
  {
    id: 'petit-bateau', title: 'Le petit bateau', emoji: '🚤',
    pieces: build([
      ['b2x4', 'rouge', 1, 0, 1],
      ['b2x2', 'rouge', 0, 0], ['b2x2', 'rouge', 2, 0], ['b2x2', 'rouge', 4, 0],
      ['b2x2', 'blanc', 1, 0], ['b1x2', 'orange', 3, 0],
      ['b1x2', 'blanc', 2, 0], ['b1x2', 'orange', 3, 0],
      ['b1x2', 'bleu', 3, 0],
    ]),
  },
  {
    id: 'petit-robot', title: 'Le petit robot', emoji: '🤖',
    pieces: build([
      ['b1x2', 'bleu', 0, 0], ['b1x2', 'bleu', 3, 0],
      ['b1x2', 'bleu', 0, 0], ['b1x2', 'bleu', 3, 0],
      ['b2x4', 'rouge', 0, 0, 1], ['b2x4', 'rouge', 0, 0, 1],
      ['b2x2', 'blanc', 1, 0],
      ['b1x1', 'jaune', 1, 0], ['b1x1', 'jaune', 2, 1],
    ]),
  },
].map((c) => ({ ...c, level: 0, guide: true, steps: true }));

// Du plus simple au plus complexe (ordre = progression du mode Défi).
export const CHALLENGES = [
  ...EASY,
  {
    id: 'fleur', title: 'La fleur', emoji: '🌷', level: 1, guide: true,
    pieces: relief([
      '.SSSS.',
      'SSJJSS',
      '.SSSS.',
      '..VV..',
      'VVVV..',
      '..VVVV',
      '..VV..',
      'OOOOOO',
      '.OOOO.',
    ]),
  },
  {
    id: 'canard', title: 'Le canard', emoji: '🦆', level: 1, guide: true,
    pieces: relief([
      '....JJ..',
      '....JB..',
      '....JJOO',
      'J.JJJJJ.',
      'JJJJJJJ.',
      '.JJJJJ..',
    ]),
  },
  {
    id: 'sapin', title: 'Le sapin', emoji: '🎄', level: 1, guide: true,
    pieces: relief([
      '...JJ...',
      '...VV...',
      '..VBVV..',
      '.VVVVVV.',
      '..VVVV..',
      '.VVRVVV.',
      'VVVVVVVV',
      '...OO...',
      '...OO...',
    ]),
  },
  {
    id: 'bateau', title: 'Le voilier', emoji: '⛵', level: 2, guide: true,
    pieces: relief([
      '.....R....',
      '....WO....',
      '...WWO....',
      '..WWWOW...',
      '.WWWWOWW..',
      'WWWWWWWWWW',
      '.RRRRRRRR.',
      '..BBBBBB..',
    ]),
  },
  {
    id: 'phare', title: 'Le phare', emoji: '🗼', level: 2, guide: true,
    pieces: model([
      ['BBBB', 'BVVB', 'BVVB', 'BBBB'],
      ['....', '.OR.', '.RR.', '....'],
      ['....', '.WW.', '.WW.', '....'],
      ['....', '.RR.', '.RR.', '....'],
      ['....', '.BW.', '.WW.', '....'],
      ['....', '.RR.', '.RR.', '....'],
      ['RRRR', 'RRRR', 'RRRR', 'RRRR'],
      ['....', '.JJ.', '.JJ.', '....'],
      ['....', '.RR.', '.RR.', '....'],
      ['....', '..R.', '....', '....'],
    ]),
  },
  {
    id: 'voiture', title: 'La voiture', emoji: '🚗', level: 2, guide: true,
    pieces: model([
      ['.BB..BB.', '........', '........', '.BB..BB.'],
      ['RRRRRRRR', 'RRRRRRRR', 'RRRRRRRR', 'RRRRRRRR'],
      ['ORRRRRRJ', 'RRRRRRRR', 'RRRRRRRR', 'ORRRRRRJ'],
      ['..WWWW..', '..WWWW..', '..WWWW..', '..WWWW..'],
      ['..RRRR..', '..RRRR..', '..RRRR..', '..RRRR..'],
    ]),
  },
  {
    id: 'maison', title: 'La maison', emoji: '🏠', level: 2, guide: true,
    pieces: model([
      ['JJOOJJ', 'JJJJJJ', 'JJJJJJ', 'JJJJJJ'],
      ['BJOOJB', 'JJJJJJ', 'JJJJJJ', 'BJJJJB'],
      ['JJJJJJ', 'JJJJJJ', 'JJJJJJ', 'JJJJJJ'],
      ['......', '......', '.....R', '.....R'],
    ], [
      ['r2x2', 'rouge', 0, 0, 2], ['r2x2', 'rouge', 2, 0, 2], ['r2x2', 'rouge', 4, 0, 2],
      ['r2x2', 'rouge', 0, 2, 0], ['r2x2', 'rouge', 2, 2, 0], ['r1x2', 'rouge', 4, 2, 0],
      ['b1x2', 'rouge', 5, 2, 0],
    ]),
  },
  {
    id: 'robot', title: 'Le robot', emoji: '🤖', level: 3, guide: true,
    pieces: relief([
      '..J..J..',
      '..BBBB..',
      '..BWWB..',
      '..BBBB..',
      '.BRRRRB.',
      '.BRJJRB.',
      '.BRRRRB.',
      '.JRRRRJ.',
      '.BB..BB.',
      'BBB..BBB',
    ]),
  },
  {
    id: 'fusee', title: 'La fusée', emoji: '🚀', level: 3, guide: true,
    pieces: model([
      ['..RR..', '..OO..', 'ROJJOR', 'ROJJOR', '..OO..', '..RR..'],
      ['..RR..', '..WW..', 'RWWWWR', 'RWWWWR', '..WW..', '..RR..'],
      ['..RR..', '..WW..', 'RWWWWR', 'RWWWWR', '..WW..', '..RR..'],
      ['......', '..BB..', '.WWWW.', '.WWWW.', '..WW..', '......'],
      ['......', '..WW..', '.WWWW.', '.WWWW.', '..WW..', '......'],
      ['......', '..WW..', '.WWWW.', '.WWWW.', '..WW..', '......'],
      ['......', '..RR..', '.RRRR.', '.RRRR.', '..RR..', '......'],
      ['......', '......', '..RR..', '..RR..', '......', '......'],
      ['......', '......', '..J...', '......', '......', '......'],
    ]),
  },
  {
    id: 'chateau', title: 'Le château', emoji: '🏰', level: 3, guide: true,
    pieces: model([
      ['WWWW..WWWW', 'WWWW..WWWW', 'WW......WW', 'WW......WW', 'WWWWWWWWWW', 'WWWWWWWWWW'],
      ['WWWW..WWWW', 'WWWW..WWWW', 'WW......WW', 'WW......WW', 'WWWWWWWWWW', 'WWWWWWWWWW'],
      ['WBWWWWWWBW', 'WWWWWWWWWW', 'WW......WW', 'WW......WW', 'WWWWWWWWWW', 'WBWWWWWWBW'],
      ['WWWWWWWWWW', 'WWWWWWWWWW', 'WW......WW', 'WW......WW', 'WWWWWWWWWW', 'WWWWWWWWWW'],
      ['WW.W..W.WW', 'WW......WW', '..........', '..........', 'WW......WW', 'WW.W..W.WW'],
      ['WB......BW', 'WW......WW', '..........', '..........', 'WW......WW', 'WW......WW'],
    ], [
      ['r2x2', 'bleu', 0, 0, 2], ['r2x2', 'bleu', 8, 0, 2],
      ['r2x2', 'bleu', 0, 4, 0], ['r2x2', 'bleu', 8, 4, 0],
    ], [3, 5]),
  },
];

export function challengeById(id) {
  return CHALLENGES.find((c) => c.id === id);
}

// ---- transformations de modèles -------------------------------------------------

/** Quart de tour (x,z) → (z,-x), identique à la rotation Y de three.js pour +90°. */
function rotatePiece(p) {
  const { w } = footprint(p.type, p.rot);
  return { ...p, x: p.z, z: -p.x - w, rot: (p.rot + 1) % 4 };
}

function bounds(pieces) {
  let minX = Infinity, minZ = Infinity, minY = Infinity, maxX = -Infinity, maxZ = -Infinity;
  for (const p of pieces) {
    const { w, d } = footprint(p.type, p.rot);
    minX = Math.min(minX, p.x); minZ = Math.min(minZ, p.z); minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x + w - 1); maxZ = Math.max(maxZ, p.z + d - 1);
  }
  return { minX, minZ, minY, maxX, maxZ };
}

/** Applique { rot, dx, dz, dy } à une liste de pièces (rotation puis décalage). */
export function transformPieces(pieces, t) {
  let ps = pieces;
  for (let i = 0; i < t.rot; i++) ps = ps.map(rotatePiece);
  return ps.map((p) => ({ ...p, x: p.x + t.dx, z: p.z + t.dz, y: p.y + t.dy }));
}

/** Transformation qui centre le modèle sur la plaque. */
export function centerTransform(pieces, size = SIZE) {
  const b = bounds(pieces);
  const tw = b.maxX - b.minX + 1;
  const td = b.maxZ - b.minZ + 1;
  return {
    rot: 0,
    dx: Math.floor((size - tw) / 2) - b.minX,
    dz: Math.floor((size - td) / 2) - b.minZ,
    dy: -b.minY,
  };
}

// ---- score ----------------------------------------------------------------------

const key = (x, y, z) => ((x + 100) * 256 + (z + 100)) * 64 + y;

function voxelList(pieces) {
  const out = [];
  for (const p of pieces) {
    const { w, d } = footprint(p.type, p.rot);
    const h = PIECES[p.type].h;
    for (let i = 0; i < w; i++) for (let j = 0; j < d; j++) for (let k = 0; k < h; k++) {
      out.push([p.x + i, p.y + k, p.z + j, p.color]);
    }
  }
  return out;
}

export function starsFor(score) {
  return score >= 0.95 ? 3 : score >= 0.7 ? 2 : score >= 0.4 ? 1 : 0;
}

/**
 * Compare la création au modèle. Translation (X/Z, bas aligné en Y) et rotations de 90° libres.
 * → { score, stars, missing, extra, wrongColor, transform }
 */
export function score(creationPieces, target, size = SIZE) {
  const targetCount = voxelList(target).length;
  if (!creationPieces.length) {
    return { score: 0, stars: 0, missing: targetCount, extra: 0, wrongColor: 0, transform: centerTransform(target, size) };
  }
  const cb = bounds(creationPieces);
  const cVox = voxelList(creationPieces.map((p) => ({ ...p, y: p.y - cb.minY })));
  const cMap = new Map();
  for (const [x, y, z, c] of cVox) cMap.set(key(x, y, z), c);
  const C = cVox.length;

  let best = null;
  for (let r = 0; r < 4; r++) {
    let tp = target;
    for (let i = 0; i < r; i++) tp = tp.map(rotatePiece);
    const tb = bounds(tp);
    const tVox = voxelList(tp.map((p) => ({ ...p, x: p.x - tb.minX, z: p.z - tb.minZ, y: p.y - tb.minY })));
    const tw = tb.maxX - tb.minX + 1;
    const td = tb.maxZ - tb.minZ + 1;
    const T = tVox.length;
    for (let ox = cb.minX - tw + 1; ox <= cb.maxX; ox++) {
      for (let oz = cb.minZ - td + 1; oz <= cb.maxZ; oz++) {
        let exact = 0, wrong = 0;
        for (const [x, y, z, c] of tVox) {
          const cc = cMap.get(key(x + ox, y, z + oz));
          if (cc === undefined) continue;
          if (cc === c) exact++; else wrong++;
        }
        const inter = exact + wrong;
        const union = T + C - inter;
        const s = (exact + 0.5 * wrong) / union;
        if (!best || s > best.score) {
          best = {
            score: s, missing: T - inter, extra: C - inter, wrongColor: wrong,
            transform: { rot: r, dx: ox - tb.minX, dz: oz - tb.minZ, dy: cb.minY - tb.minY },
          };
        }
      }
    }
  }
  return { ...best, stars: starsFor(best.score) };
}

export function hintFor(result) {
  if (result.stars >= 3) return 'Bravo ! Tu es un champion !';
  if (result.score === 0 && result.extra === 0 && result.wrongColor === 0) return 'Pose des briques pour commencer !';
  if (result.wrongColor > 0 && result.wrongColor >= result.missing && result.wrongColor >= result.extra) return 'Vérifie les couleurs !';
  if (result.missing > 0 && result.missing >= result.extra) return 'Presque ! Il manque des briques.';
  if (result.extra > 0) return 'Presque ! Il y a une brique en trop.';
  return 'Presque ! Regarde bien la fiche.';
}

export { toVoxels };
