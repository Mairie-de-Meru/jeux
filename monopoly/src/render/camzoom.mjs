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

// ----- rotation de la vue (azimut) et inclinaison (élévation) -----
// Angles en radians. L'azimut utilisateur s'ajoute à celui de la vue ; l'élévation finale reste dans [EL_MIN, EL_MAX].
export const EL_MIN = (40 * Math.PI) / 180;
export const EL_MAX = (80 * Math.PI) / 180;
export const ROT_PX = 0.008;   // radians par pixel de glissé horizontal (clic droit)
export const TILT_PX = 0.005;  // radians par pixel de glissé vertical (clic droit)
export const TWIST_DEAD = 0.12; // zone morte de la rotation à deux doigts (évite de tourner en pinçant)
export const QUARTER = Math.PI / 2;

// Ramène un angle dans ]-π, π].
export function normAngle(a) {
  if (!Number.isFinite(a)) return 0;
  const t = Math.PI * 2;
  let r = ((a % t) + t) % t;
  if (r > Math.PI) r -= t;
  return r;
}

// Écart signé le plus court de `from` vers `to` (dans ]-π, π]) : sert à lisser sans faire le grand tour.
export const angleDiff = (to, from) => normAngle(to - from);

// Glissé horizontal au clic droit : vers la droite, le plateau tourne avec la souris (la caméra part dans l'autre sens).
export const dragRotation = (rot, dx) => normAngle(rot - (Number.isFinite(dx) ? dx : 0) * ROT_PX);

// Décalage d'inclinaison `tilt` borné pour que baseEl + tilt reste dans [EL_MIN, EL_MAX].
export function clampTilt(tilt, baseEl) {
  const t = Number.isFinite(tilt) ? tilt : 0;
  return Math.min(EL_MAX - baseEl, Math.max(EL_MIN - baseEl, t));
}
// Élévation finale d'une vue : élévation de base + inclinaison utilisateur, bornée.
export const userElevation = (baseEl, tilt) => baseEl + clampTilt(tilt, baseEl);

// Glissé vertical au clic droit : vers le bas, la vue devient plus plongeante.
export const dragTilt = (tilt, dy, baseEl) => clampTilt((Number.isFinite(tilt) ? tilt : 0) + (Number.isFinite(dy) ? dy : 0) * TILT_PX, baseEl);

// Rotation à deux doigts : a0 = angle initial entre les doigts, a1 = angle courant (repère écran, y vers le bas).
// Tourner les doigts dans le sens horaire fait tourner le plateau dans le même sens ; zone morte pour le simple pincement.
export function twistRotation(rot0, a0, a1, dead = TWIST_DEAD) {
  const d = angleDiff(a1, a0);
  if (Math.abs(d) <= dead) return normAngle(rot0);
  return normAngle(rot0 + d - Math.sign(d) * dead);
}

// Boutons ↺ ↻ : quart de tour aligné sur les côtés du plateau (dir = +1 ou -1).
export function quarterTurn(rot, dir) {
  const k = Math.round(normAngle(rot) / QUARTER) + (dir < 0 ? -1 : 1);
  return normAngle(k * QUARTER);
}
