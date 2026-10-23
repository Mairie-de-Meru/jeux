// Calculs purs de cadrage et de zoom de la caméra (sans three.js, testables sous Node).
// « zoom » = facteur multiplicatif sur la distance caméra : < 1 rapproche, > 1 éloigne.

export const ZOOM_MIN = 0.55;
export const ZOOM_MAX = 1.6;
export const DOUBLE_TAP_ZOOM = 1 / 1.8; // double-tap : rapproche ×1,8
export const MOVE_ZOOM = 0.85;          // pendant le déplacement d'un pion : léger zoom avant (≈ 15 %)

export const clampZoom = (z) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Number.isFinite(z) ? z : 1));

// Pincement : écart initial d0, écart courant d1 (doigts écartés → on rapproche).
export function pinchZoom(z0, d0, d1) {
  if (!(d0 > 0) || !(d1 > 0)) return clampZoom(z0);
  return clampZoom(z0 * (d0 / d1));
}

// Molette : deltaY > 0 (vers soi) éloigne, < 0 rapproche ; pas exponentiel, doux.
export function wheelZoom(z, deltaY, deltaMode = 0) {
  const px = deltaMode === 1 ? deltaY * 16 : deltaMode === 2 ? deltaY * 400 : deltaY;
  return clampZoom(z * Math.exp(Math.max(-200, Math.min(200, px)) * 0.0015));
}

// Double-tap : bascule entre zoom avant et retour à 1.
export const doubleTapZoom = (z) => (z < 0.85 ? 1 : DOUBLE_TAP_ZOOM);

// Facteur de zoom automatique selon l'état de déplacement.
export const autoZoom = (moving) => (moving ? MOVE_ZOOM : 1);

// Largeur de monde (unités) visible dans la zone libre en vue « Mon pion » :
// on vise `ppu` pixels CSS par unité (noms de cases lisibles sur téléphone), bornée
// pour que les grands écrans gardent l'ancien cadrage (maxW) et qu'on voie au moins
// la case du pion et ses voisines (minW).
export function followWorldWidth(freePx, { ppu = 54, minW = 6.6, maxW = 8.5 } = {}) {
  if (!(freePx > 0)) return maxW;
  return Math.min(maxW, Math.max(minW, freePx / ppu));
}

// Distance caméra pour qu'une largeur de monde `worldW` remplisse la zone libre.
// tanHalf = tan(fov/2), aspect = largeur/hauteur du canevas, fw = largeur de la zone libre en NDC (0..2).
export function distanceFor(worldW, tanHalf, aspect, fw, lo = 5, hi = 36) {
  const d = worldW / (tanHalf * aspect * Math.max(0.2, fw));
  return Math.min(hi, Math.max(lo, d));
}

// Décalage de cible (pan) borné au plateau : la cible reste dans ±lim.
export function clampPan(base, off, lim) {
  const c = (b, o) => Math.min(lim, Math.max(-lim, b + o)) - b;
  return { x: c(base.x, off.x), z: c(base.z, off.z) };
}
