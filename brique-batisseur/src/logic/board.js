// Plateau de construction : empilement, pose, retrait, annulation. Aucune dépendance au rendu.
import { PIECES, footprint } from './pieces.js';

export const SIZE = 16;
export const PLATE_SIZES = [16, 24, 32, 40, 48];
export const MAX_H = 36;

/** Taille de plaque suivante dans le cycle 16 → 24 → 32 → 40 → 48 → 16. */
export function nextPlateSize(size) {
  const i = PLATE_SIZES.indexOf(size);
  return PLATE_SIZES[(i + 1) % PLATE_SIZES.length];
}
const HISTORY_LIMIT = 100;

function covers(piece, x, z) {
  const { w, d } = footprint(piece.type, piece.rot);
  return x >= piece.x && x < piece.x + w && z >= piece.z && z < piece.z + d;
}

/** Pièce dont le sommet est le plus haut sur la case (x,z), ou null. */
export function topPieceAt(pieces, x, z) {
  let best = null;
  let bestTop = 0;
  for (const p of pieces) {
    if (!covers(p, x, z)) continue;
    const top = p.y + PIECES[p.type].h;
    if (top > bestTop) { bestTop = top; best = p; }
  }
  return best;
}

/** Hauteur du sommet de la pile sur une case (0 si vide). */
export function topAt(pieces, x, z) {
  const p = topPieceAt(pieces, x, z);
  return p ? p.y + PIECES[p.type].h : 0;
}

/** Peut-on poser `type` (rotation rot) avec son coin min en (x,z) ? → { ok, y, reason } */
export function placement(board, type, rot, x, z) {
  const size = board.size ?? SIZE;
  const { w, d } = footprint(type, rot);
  if (x < 0 || z < 0 || x + w > size || z + d > size) return { ok: false, y: 0, reason: 'out' };
  let y = 0;
  for (let i = x; i < x + w; i++) for (let j = z; j < z + d; j++) y = Math.max(y, topAt(board.pieces, i, j));
  for (let i = x; i < x + w; i++) {
    for (let j = z; j < z + d; j++) {
      const tp = topPieceAt(board.pieces, i, j);
      if (tp && tp.y + PIECES[tp.type].h === y && PIECES[tp.type].kind === 'roof') {
        return { ok: false, y, reason: 'roof' };
      }
    }
  }
  if (y + PIECES[type].h > MAX_H) return { ok: false, y, reason: 'high' };
  return { ok: true, y, reason: null };
}

/** Coin min de l'empreinte centrée au mieux sur la case pointée, recadrée dans la plaque. */
export function anchorFor(type, rot, cellX, cellZ, size = SIZE) {
  const { w, d } = footprint(type, rot);
  const x = Math.min(Math.max(cellX - Math.floor(w / 2), 0), size - w);
  const z = Math.min(Math.max(cellZ - Math.floor(d / 2), 0), size - d);
  return { x, z };
}

export function canRemove(board, uid) {
  const p = board.pieces.find((q) => q.uid === uid);
  if (!p) return false;
  const top = p.y + PIECES[p.type].h;
  const a = footprint(p.type, p.rot);
  return !board.pieces.some((q) => {
    if (q === p || q.y !== top) return false;
    const b = footprint(q.type, q.rot);
    return q.x < p.x + a.w && q.x + b.w > p.x && q.z < p.z + a.d && q.z + b.d > p.z;
  });
}

export class Board {
  constructor(size = SIZE) {
    this.size = size;
    this.pieces = [];
    this.history = [];
    this.nextUid = 1;
  }

  _push(entry) {
    this.history.push(entry);
    if (this.history.length > HISTORY_LIMIT) this.history.shift();
  }

  placement(type, rot, x, z) { return placement(this, type, rot, x, z); }
  canRemove(uid) { return canRemove(this, uid); }

  place(type, color, x, z, rot = 0) {
    const r = placement(this, type, rot, x, z);
    if (!r.ok) return { ok: false, reason: r.reason };
    const piece = { uid: this.nextUid++, type, color, x, z, rot, y: r.y };
    this.pieces.push(piece);
    this._push({ kind: 'place', piece });
    return { ok: true, piece, y: r.y };
  }

  remove(uid) {
    const index = this.pieces.findIndex((q) => q.uid === uid);
    if (index < 0) return { ok: false, reason: 'missing' };
    if (!canRemove(this, uid)) return { ok: false, reason: 'covered' };
    const [piece] = this.pieces.splice(index, 1);
    this._push({ kind: 'remove', piece, index });
    return { ok: true, piece };
  }

  /**
   * Tourne une pièce posée d'un quart de tour autour de son centre (pièce du dessus seulement).
   * Essaie les rotations suivantes si la première ne rentre pas. → { ok, piece, reason }
   */
  rotate(uid) {
    const piece = this.pieces.find((q) => q.uid === uid);
    if (!piece) return { ok: false, reason: 'missing' };
    if (!canRemove(this, uid)) return { ok: false, reason: 'covered' };
    const before = { x: piece.x, z: piece.z, rot: piece.rot, y: piece.y };
    const def = PIECES[piece.type];
    if (def.w === def.d && def.kind !== 'roof') return { ok: true, piece, same: true };
    const a = footprint(piece.type, piece.rot);
    const cx = piece.x + a.w / 2;
    const cz = piece.z + a.d / 2;
    const others = { size: this.size, pieces: this.pieces.filter((q) => q !== piece) };
    let reason = 'out';
    for (let k = 1; k < 4; k++) {
      const rot = (piece.rot + k) % 4;
      const b = footprint(piece.type, rot);
      const x = Math.min(Math.max(Math.round(cx - b.w / 2), 0), this.size - b.w);
      const z = Math.min(Math.max(Math.round(cz - b.d / 2), 0), this.size - b.d);
      if (rot % 2 === before.rot % 2 && x === before.x && z === before.z && PIECES[piece.type].kind !== 'roof') continue;
      const r = placement(others, piece.type, rot, x, z);
      if (r.ok) {
        Object.assign(piece, { x, z, rot, y: r.y });
        this._push({ kind: 'rotate', piece, before });
        return { ok: true, piece };
      }
      reason = r.reason;
    }
    return { ok: false, reason };
  }

  /** Où tomberait la pièce uid si on la déplaçait en (x,z) avec la rotation rot ? → { ok, y, reason } */
  moveCheck(uid, x, z, rot) {
    const piece = this.pieces.find((q) => q.uid === uid);
    if (!piece) return { ok: false, y: 0, reason: 'missing' };
    if (!canRemove(this, uid)) return { ok: false, y: piece.y, reason: 'covered' };
    const others = { size: this.size, pieces: this.pieces.filter((q) => q !== piece) };
    return placement(others, piece.type, rot ?? piece.rot, x, z);
  }

  /**
   * Déplace une pièce du dessus en (x,z) (rotation éventuelle), y recalculé.
   * Refuse sans rien changer si c'est impossible ; une entrée d'historique 'move'. → { ok, piece, reason }
   */
  move(uid, x, z, rot) {
    const piece = this.pieces.find((q) => q.uid === uid);
    if (!piece) return { ok: false, reason: 'missing' };
    const r = this.moveCheck(uid, x, z, rot);
    if (!r.ok) return { ok: false, reason: r.reason };
    const nrot = rot ?? piece.rot;
    if (x === piece.x && z === piece.z && nrot === piece.rot && r.y === piece.y) return { ok: true, piece, same: true };
    const before = { x: piece.x, z: piece.z, rot: piece.rot, y: piece.y };
    Object.assign(piece, { x, z, rot: nrot, y: r.y });
    this._push({ kind: 'move', piece, before });
    return { ok: true, piece };
  }

  /** Change la taille de la plaque. Refuse si une pièce dépasserait. → { ok, reason } */
  resize(size) {
    if (!Number.isInteger(size) || size < 1) return { ok: false, reason: 'size' };
    for (const p of this.pieces) {
      const { w, d } = footprint(p.type, p.rot);
      if (p.x + w > size || p.z + d > size) return { ok: false, reason: 'fit' };
    }
    this.size = size;
    return { ok: true };
  }

  clear() {
    if (!this.pieces.length) return { ok: false };
    const old = this.pieces;
    this.pieces = [];
    this._push({ kind: 'clear', pieces: old });
    return { ok: true };
  }

  /** Annule la dernière action. → { ok, kind } */
  undo() {
    const e = this.history.pop();
    if (!e) return { ok: false };
    if (e.kind === 'place') {
      const i = this.pieces.findIndex((q) => q.uid === e.piece.uid);
      if (i >= 0) this.pieces.splice(i, 1);
    } else if (e.kind === 'remove') {
      this.pieces.splice(Math.min(e.index, this.pieces.length), 0, e.piece);
    } else if (e.kind === 'rotate' || e.kind === 'move') {
      Object.assign(e.piece, e.before);
    } else if (e.kind === 'clear') {
      this.pieces = e.pieces;
    }
    return { ok: true, kind: e.kind };
  }

  /** Remplace le contenu (sans historique) ; attribue de nouveaux uid. */
  load(list) {
    this.pieces = list.map((p) => ({ uid: this.nextUid++, type: p.type, color: p.color, x: p.x, z: p.z, rot: p.rot, y: p.y }));
    this.history = [];
  }
}

export function place(board, type, color, x, z, rot = 0) { return board.place(type, color, x, z, rot); }
export function remove(board, uid) { return board.remove(uid); }
export function clear(board) { return board.clear(); }
export function undo(board) { return board.undo(); }

/** Map "x,y,z" → couleur, une entrée par case × plaque occupée. */
export function toVoxels(pieces) {
  const m = new Map();
  for (const p of pieces) {
    const { w, d } = footprint(p.type, p.rot);
    const h = PIECES[p.type].h;
    for (let i = 0; i < w; i++) for (let j = 0; j < d; j++) for (let k = 0; k < h; k++) {
      m.set(`${p.x + i},${p.y + k},${p.z + j}`, p.color);
    }
  }
  return m;
}
