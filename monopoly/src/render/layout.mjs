// Géométrie du plateau. Départ (0) en bas à droite, sens inverse des aiguilles d'une montre.
export const CORNER = 2.6;
export const TILE_W = 1.8;
export const TILE_H = 2.6;
export const SIZE = 2 * CORNER + 9 * TILE_W; // 21.4
const H = SIZE / 2;

// Centre, rotation du groupe (la face « intérieure » du texte est à -z local) et dimensions.
export function spaceInfo(i) {
  const k = i % 10; const side = Math.floor(i / 10);
  if (k === 0) {
    const pos = [[H - CORNER / 2, H - CORNER / 2], [-(H - CORNER / 2), H - CORNER / 2], [-(H - CORNER / 2), -(H - CORNER / 2)], [H - CORNER / 2, -(H - CORNER / 2)]][side];
    return { x: pos[0], z: pos[1], rot: 0, w: CORNER, h: CORNER, corner: true };
  }
  const off = CORNER + (k - 0.5) * TILE_W; // distance depuis le coin de départ du côté
  if (side === 0) return { x: H - off, z: H - TILE_H / 2, rot: 0, w: TILE_W, h: TILE_H };
  if (side === 1) return { x: -(H - TILE_H / 2), z: H - off, rot: -Math.PI / 2, w: TILE_W, h: TILE_H };
  if (side === 2) return { x: -H + off, z: -(H - TILE_H / 2), rot: Math.PI, w: TILE_W, h: TILE_H };
  return { x: H - TILE_H / 2, z: -H + off, rot: Math.PI / 2, w: TILE_W, h: TILE_H };
}
export const SPACE_INFO = Array.from({ length: 40 }, (_, i) => spaceInfo(i));

// Position d'un pion sur une case (slot 0..3 pour éviter les chevauchements).
const SLOTS = [[-0.4, -0.35], [0.4, -0.35], [-0.4, 0.4], [0.4, 0.4]];
export function pawnPoint(i, slot, inJail = false) {
  const c = SPACE_INFO[i];
  if (i === 10) {
    // coin prison : cellule en haut à droite du coin, visiteurs en bas à gauche
    const s = SLOTS[slot];
    return inJail ? { x: c.x + 0.45 + s[0] * 0.5, z: c.z - 0.45 + s[1] * 0.5 } : { x: c.x - 0.55 + s[0] * 0.55, z: c.z + 0.6 + s[1] * 0.35 };
  }
  const s = SLOTS[slot];
  return { x: c.x + s[0] * (c.corner ? 1.1 : 1), z: c.z + s[1] * (c.corner ? 1.1 : 1) + (c.corner ? 0 : 0) };
}
