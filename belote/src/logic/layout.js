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

// ---------- Plan de table rapproché (téléphone) ----------
// Repère : x vers la droite, y vers le haut, z vers le joueur du bas. Cartes : 0.9 × 1.35 à l'échelle 1.
export const TABLE = {
  card: { w: 0.9, h: 1.35 },
  trickScale: 1.35, // cartes du pli
  turnedScale: 1.4, // carte retournée pendant les enchères
  fanScale: 0.45, // éventails de dos des autres places
  seat: [[0, 2.6], [2.75, 0], [0, -2.6], [-2.75, 0]], // 0 bas (toi), 1 droite, 2 haut, 3 gauche
  slot: [[0, 1.12], [1.42, 0.02], [0, -1.12], [-1.42, 0.02]], // cartes du pli devant chaque place
  label: [[0, 0.8, 2.98], [2.65, 0.8, -1.5], [0, 0.8, -3.32], [-2.65, 0.8, -1.5]],
  labelSize: [1.75, 0.65], // étiquette 260 × 96 px,
  trump: [1.7, 1.75], // pastille d'atout, coin bas droit du pli
  trumpR: 0.5,
  ringR: 0.62,
};

// Points qui doivent rester dans le cadre : pli, carte retournée, éventails, étiquettes, pastille.
export function keyPoints(T = TABLE) {
  const pts = [];
  const cw = (T.card.w * T.trickScale) / 2, ch = (T.card.h * T.trickScale) / 2;
  T.slot.forEach(([x, z]) => { for (const sx of [-1, 1]) for (const sz of [-1, 1]) pts.push([x + sx * cw, 0.06, z + sz * ch]); });
  const tw = (T.card.w * T.turnedScale) / 2, th = (T.card.h * T.turnedScale) / 2;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) pts.push([sx * tw, 0.07, sz * th]);
  const [lw, lh] = T.labelSize;
  T.label.forEach(([x, y, z]) => { for (const sx of [-1, 1]) for (const s of [-1, 1]) pts.push([x + sx * lw / 2, y + s * lh / 2, z + s * lh / 2]); });
  const fanR = 0.5 + T.card.h * T.fanScale / 2; // demi-profondeur d'un éventail vu de sa place
  T.seat.forEach(([x, z]) => { const n = Math.hypot(x, z) || 1; pts.push([x + (x / n) * fanR, 0.1, z + (z / n) * fanR]); });
  const [tx, tz] = T.trump; pts.push([tx + T.trumpR, 0.04, tz + T.trumpR], [tx - T.trumpR, 0.04, tz - T.trumpR]);
  return pts;
}

// Projection d'un point par une caméra placée à `pos`, visant `target` (axe vertical y), en coordonnées normalisées [-1, 1].
export function projectPoint(p, { pos, target, fovDeg, aspect }) {
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm = (a) => { const l = Math.hypot(...a) || 1; return a.map((v) => v / l); };
  const f = norm(sub(target, pos)), r = norm(cross(f, [0, 1, 0])), u = cross(r, f);
  const v = sub(p, pos), depth = dot(v, f), t = Math.tan((fovDeg * Math.PI) / 360);
  return { x: dot(v, r) / (depth * t * aspect), y: dot(v, u) / (depth * t), depth };
}

// Cadrage serré : caméra en élévation `elevDeg` dans le plan x = 0, à la plus petite distance qui garde tous
// les points dans le cadre (marges en coordonnées normalisées), visée recentrée verticalement sur la zone utile.
export function frameCamera({ points = keyPoints(), aspect, fovDeg = 38, elevDeg = 72, margin = {} }) {
  const m = { x: 0.04, top: 0.04, bottom: 0.04, ...margin };
  const elev = (elevDeg * Math.PI) / 180;
  const camAt = (d, tz) => ({ pos: [0, Math.sin(elev) * d, tz + Math.cos(elev) * d], target: [0, 0, tz], fovDeg, aspect });
  const fits = (d, tz) => points.every((p) => {
    const q = projectPoint(p, camAt(d, tz));
    return q.depth > 0 && Math.abs(q.x) <= 1 - m.x && q.y <= 1 - m.top && q.y >= -1 + m.bottom;
  });
  let tz = 0, d = 10;
  for (let pass = 0; pass < 4; pass++) {
    let lo = 1, hi = 80;
    for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (fits(mid, tz)) hi = mid; else lo = mid; }
    d = hi;
    // recentrer : décaler la visée pour équilibrer les marges haute et basse
    const ys = points.map((p) => projectPoint(p, camAt(d, tz)).y);
    const top = Math.max(...ys) + m.top, bot = Math.min(...ys) - m.bottom;
    const shift = (top + bot) / 2; // > 0 : la zone est trop haute à l'écran → viser plus loin (z plus petit)
    if (Math.abs(shift) < 1e-3) break;
    const t = Math.tan((fovDeg * Math.PI) / 360);
    tz -= shift * t * d / Math.sin(elev);
  }
  // sécurité : la distance finale garde tout dans le cadre
  while (!fits(d, tz)) d *= 1.01;
  const c = camAt(d, tz);
  return { distance: d, position: c.pos, target: c.target };
}
