// Paramètres de vue purs (testables sous node) : téléphone = plongée quasi verticale, plateau qui remplit le canvas.
export const PHONE_MAX = 500; // px CSS : min(largeur, hauteur) de l'écran en dessous duquel on est « téléphone »

export function isPhone(vw, vh) { return Math.min(vw, vh) < PHONE_MAX; }

// vw, vh : fenêtre ; cw, ch : rectangle réellement disponible pour le canvas.
export function viewParams(vw, vh, cw, ch) {
  const aspect = cw / Math.max(1, ch);
  if (isPhone(vw, vh)) {
    return { phone: true, elevDeg: 78, fovDeg: 26, fill: 0.95, frame: 0.2, pieceScale: 1.12, knightLean: 0.75, aspect };
  }
  const elevDeg = aspect > 1.35 ? 72 : aspect < 0.7 ? 52 : 58;
  return { phone: false, elevDeg, fovDeg: 34, fill: 0.97, frame: 0.55, pieceScale: 1, knightLean: 0, aspect };
}
