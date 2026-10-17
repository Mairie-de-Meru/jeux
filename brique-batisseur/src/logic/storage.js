// Sauvegarde locale (création libre, progression des défis). `storage` est injecté (getItem/setItem).
import { PIECES, COLOR_IDS, footprint } from './pieces.js';
import { Board, MAX_H, SIZE, PLATE_SIZES } from './board.js';

export const FREE_KEY = 'brique-batisseur.libre';
export const PROGRESS_KEY = 'brique-batisseur.progression';
const VERSION = 1;

export function serialize(pieces, size = SIZE) {
  return JSON.stringify({
    v: VERSION,
    size,
    pieces: pieces.map((p) => ({ type: p.type, color: p.color, x: p.x, z: p.z, rot: p.rot, y: p.y })),
  });
}

/** Taille de plaque d'une sauvegarde (16 si absente ou invalide). */
export function sizeOf(data) {
  return data && PLATE_SIZES.includes(data.size) ? data.size : SIZE;
}

/** Renvoie la liste de pièces validée, ou [] si le texte est invalide. Ne lève jamais. */
export function deserialize(text) {
  try {
    const data = JSON.parse(text);
    if (!data || data.v !== VERSION || !Array.isArray(data.pieces) || data.pieces.length > 500) return [];
    const board = new Board(sizeOf(data));
    const out = [];
    for (const p of data.pieces) {
      if (!p || typeof p !== 'object') return [];
      if (!Object.hasOwn(PIECES, p.type) || !COLOR_IDS.includes(p.color)) return [];
      for (const k of ['x', 'z', 'rot', 'y']) if (!Number.isInteger(p[k])) return [];
      if (p.rot < 0 || p.rot > 3 || p.y < 0 || p.y > MAX_H) return [];
      const { w, d } = footprint(p.type, p.rot);
      if (p.x < 0 || p.z < 0 || p.x + w > board.size || p.z + d > board.size) return [];
      const r = board.place(p.type, p.color, p.x, p.z, p.rot);
      if (!r.ok || r.y !== p.y) return [];
      out.push({ type: p.type, color: p.color, x: p.x, z: p.z, rot: p.rot, y: p.y });
    }
    return out;
  } catch {
    return [];
  }
}

export function saveFree(storage, pieces, size = SIZE) {
  try { storage.setItem(FREE_KEY, serialize(pieces, size)); return true; } catch { return false; }
}

/** Taille de plaque de la sauvegarde libre (16 par défaut). */
export function loadFreeSize(storage) {
  try {
    const t = storage.getItem(FREE_KEY);
    return t ? sizeOf(JSON.parse(t)) : SIZE;
  } catch { return SIZE; }
}

export function loadFree(storage) {
  try {
    const t = storage.getItem(FREE_KEY);
    return t ? deserialize(t) : [];
  } catch { return []; }
}

export function loadProgress(storage) {
  try {
    const raw = storage.getItem(PROGRESS_KEY);
    if (!raw) return {};
    const data = JSON.parse(raw);
    const out = {};
    if (data && typeof data === 'object') {
      for (const [id, s] of Object.entries(data)) if (Number.isInteger(s) && s >= 0 && s <= 3) out[id] = s;
    }
    return out;
  } catch { return {}; }
}

/** Enregistre les étoiles en gardant le maximum. → progression mise à jour. */
export function saveStars(storage, challengeId, stars) {
  const progress = loadProgress(storage);
  const s = Math.max(0, Math.min(3, Math.floor(stars) || 0));
  progress[challengeId] = Math.max(progress[challengeId] ?? 0, s);
  try { storage.setItem(PROGRESS_KEY, JSON.stringify(progress)); } catch { /* stockage indisponible */ }
  return progress;
}
