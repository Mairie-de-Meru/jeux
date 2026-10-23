// Cadrage caméra (pur, sans three.js) : caméra plongeante regardant vers -z, distance et visée
// choisies pour que tous les points tiennent dans l'écran moins des marges (px).
// Point : [x, y, z, bx, by] = position monde + décalage « panneau » (sprite) dans le plan de la caméra.
export function cameraAxes(elevDeg) {
  const e = (elevDeg * Math.PI) / 180, s = Math.sin(e), c = Math.cos(e);
  return { back: [0, s, c], right: [1, 0, 0], up: [0, c, -s] }; // back = de la visée vers la caméra
}

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

// coordonnées normalisées (-1..1) des points pour une caméra placée à target + back * d
export function projectAll(points, { target, d, elevDeg, fovDeg, aspect }) {
  const { back, right, up } = cameraAxes(elevDeg);
  const t = Math.tan((fovDeg * Math.PI) / 360);
  const pos = [target[0] + back[0] * d, target[1] + back[1] * d, target[2] + back[2] * d];
  return points.map(([x, y, z, bx = 0, by = 0]) => {
    const v = [x + right[0] * bx + up[0] * by - pos[0], y + right[1] * bx + up[1] * by - pos[1], z + right[2] * bx + up[2] * by - pos[2]];
    const depth = Math.max(1e-3, -dot(v, back));
    return [dot(v, right) / (depth * t * aspect), dot(v, up) / (depth * t)];
  });
}

function bbox(ndc) {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const [x, y] of ndc) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  return { x0, x1, y0, y1 };
}

// width/height : taille de l'écran (px) ; margins {top,bottom,left,right} en px.
// alignY 'top' : s'il reste de la place en hauteur, le contenu est collé en haut (la table déborde en bas).
export function fitCamera({ points, width, height, fovDeg, elevDeg, margins = {}, target = [0, 0, 0], alignY = 'center' }) {
  const aspect = width / height;
  const m = { top: 0, bottom: 0, left: 0, right: 0, ...margins };
  const lim = { x0: -1 + (2 * m.left) / width, x1: 1 - (2 * m.right) / width, y0: -1 + (2 * m.bottom) / height, y1: 1 - (2 * m.top) / height };
  const { right, up } = cameraAxes(elevDeg);
  const t = Math.tan((fovDeg * Math.PI) / 360);
  const tg = [...target];
  const fits = (d) => {
    const b = bbox(projectAll(points, { target: tg, d, elevDeg, fovDeg, aspect }));
    return b.x0 >= lim.x0 && b.x1 <= lim.x1 && b.y0 >= lim.y0 && b.y1 <= lim.y1;
  };
  let d = 60;
  for (let it = 0; it < 6; it++) {
    let lo = 1, hi = 200;
    for (let k = 0; k < 40; k++) { const mid = (lo + hi) / 2; if (fits(mid)) hi = mid; else lo = mid; }
    d = hi;
    // recentrer la boîte des points dans la zone utile (décalage de la visée dans le plan de la caméra)
    const b = bbox(projectAll(points, { target: tg, d, elevDeg, fovDeg, aspect }));
    const cx = (b.x0 + b.x1) / 2 - (lim.x0 + lim.x1) / 2, cy = (b.y0 + b.y1) / 2 - (lim.y0 + lim.y1) / 2;
    if (Math.abs(cx) < 1e-4 && Math.abs(cy) < 1e-4) break;
    const ax = cx * d * t * aspect, ay = cy * d * t;
    for (let i = 0; i < 3; i++) tg[i] += right[i] * ax + up[i] * ay;
  }
  let lo = 1, hi = 200;
  for (let k = 0; k < 40; k++) { const mid = (lo + hi) / 2; if (fits(mid)) hi = mid; else lo = mid; }
  d = hi;
  if (alignY === 'top') { // garder la distance, remonter le contenu autant que possible
    const b = bbox(projectAll(points, { target: tg, d, elevDeg, fovDeg, aspect }));
    const ay = (b.y1 - lim.y1) * d * t, base = [...tg];
    let f0 = 0, f1 = 1;
    for (let k = 0; k < 30; k++) {
      const f = (f0 + f1) / 2;
      for (let i = 0; i < 3; i++) tg[i] = base[i] + up[i] * ay * f;
      if (fits(d)) f0 = f; else f1 = f;
    }
    for (let i = 0; i < 3; i++) tg[i] = base[i] + up[i] * ay * f0;
  }
  const { back } = cameraAxes(elevDeg);
  return { d, target: tg, position: [tg[0] + back[0] * d, tg[1] + back[1] * d, tg[2] + back[2] * d] };
}
