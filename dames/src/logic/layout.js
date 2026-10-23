// Cadrage et toucher : fonctions pures (aucun DOM, aucun three), testées sous node.

// Largeur du cadre bois autour des cases (en cases, les deux bords cumulés).
export const FRAME = 0.8;

// Téléphone : le plus petit côté de la fenêtre fait moins de 500 px.
export const isPhone = (vw, vh) => Math.min(vw, vh) < 500;

// Paramètres de caméra selon la taille de la scène (w, h) et de la fenêtre (vw, vh).
// Téléphone : plongée quasi verticale et marges minimes pour que le damier remplisse l'écran.
export function cameraFor(w, h, vw = w, vh = h) {
  if (isPhone(vw, vh)) return { elev: w / h < 1 ? 80 : 78, mx: 0.99, my: 0.99 };
  return { elev: w / h < 1 ? 62 : 56, mx: 0.97, my: 0.96 };
}

// Toucher tolérant : (x, z) est le point touché en repère local du damier (centre = 0, une case = 1).
// Renvoie la case cible la plus proche si elle est à moins de maxDist cases de son centre, sinon null.
export function nearestTarget(x, z, targets, size, maxDist = 0.6) {
  let best = null, bd = Infinity;
  for (const sq of targets) {
    const cx = (sq % size) - (size - 1) / 2, cz = Math.floor(sq / size) - (size - 1) / 2;
    const d = Math.hypot(x - cx, z - cz);
    if (d < bd) { bd = d; best = sq; }
  }
  return bd <= maxDist ? best : null;
}
