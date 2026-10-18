// Mise en page pure : main du joueur (1 rangée ou 2 rangées qui se chevauchent) et cadrage de la caméra.

// Rangée unique jusqu'à 5 cartes, sinon 2 rangées : la 2e recouvre le bas de la 1re, qui garde `top` px visibles
// (au moins minVisible, soit la cible tactile de 48 px).
export function handLayout({ n, boxW, boxH, gap = 4, maxW = 96, minW = 48, ratio = 1.5, lift = 8, minVisible = 48 }) {
  if (n <= 0) return { w: maxW, perRow: 1, rows: 0, top: 0, height: 0 };
  const rows = n <= 5 ? 1 : 2;
  const perRow = Math.ceil(n / rows);
  let w = Math.min(Math.floor(maxW), Math.floor((boxW - (perRow - 1) * gap) / perRow));
  const topOf = (cw) => (rows === 1 ? 0 : Math.min(cw * ratio, Math.max(minVisible, cw * ratio * 0.5)));
  const heightOf = (cw) => cw * ratio + (rows - 1) * topOf(cw) + lift;
  while (w > minW && heightOf(w) > boxH) w--;
  w = Math.max(minW, w);
  return { w, perRow, rows, top: topOf(w), height: heightOf(w) };
}

// Distance de la caméra pour voir une table de demi-largeur halfW et demi-profondeur halfD.
export function cameraDistance({ aspect, fovDeg = 38, elevDeg = 60, halfW, halfD, margin = 0.8 }) {
  const t = Math.tan((fovDeg * Math.PI) / 360);
  const elev = (elevDeg * Math.PI) / 180;
  const needH = halfW / (t * aspect);
  const needV = (halfD * Math.sin(elev) + margin) / t;
  return Math.max(needH, needV);
}
