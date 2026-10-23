// Calculs du zoom sur petit écran. Fonctions pures (aucune dépendance au rendu).

export const ZOOM_TARGET_PX = 40; // taille visée d'une case en mode zoom (px CSS)
export const ZOOM_USEFUL_BELOW = 34; // au-delà, le plateau entier est assez grand : pas de zoom
export const AUTO_ZOOM_BELOW = 30; // en dessous, zoom automatique quand l'enfant choisit une lettre

// Nombre de cases visibles en mode zoom pour qu'une case fasse au moins `target` px.
// fullPx : px par case en vue d'ensemble ; n : taille du plateau ; frame : largeur cadrée en vue d'ensemble (en cases).
export function focusSpan(fullPx, n, { target = ZOOM_TARGET_PX, min = 5, frame = n } = {}) {
  if (!(fullPx > 0)) return Math.min(n, 7);
  const span = Math.floor((fullPx * frame) / target);
  return Math.max(Math.min(min, n), Math.min(n, span));
}

export const zoomUseful = (fullPx) => fullPx > 0 && fullPx < ZOOM_USEFUL_BELOW;
export const autoZoomWanted = (fullPx) => fullPx > 0 && fullPx < AUTO_ZOOM_BELOW;

// Cases sur lesquelles centrer le zoom automatique : lettres en cours, sinon dernier mot posé,
// sinon l'étoile (premier coup), sinon les cases jouables les plus proches du centre.
export function zoomAnchor({ pending = [], lastCells = [], firstMove = false, center = 0, playable = [], k = 3 }) {
  if (pending.length) return pending.map((p) => [p.r, p.c]);
  if (lastCells.length) return lastCells.map(([r, c]) => [r, c]);
  if (firstMove) return [[center, center]];
  const d = ([r, c]) => (r - center) ** 2 + (c - center) ** 2;
  return [...playable].sort((a, b) => d(a) - d(b)).slice(0, k).map(([r, c]) => [r, c]);
}
