// Géométries partagées des 6 pièces (LatheGeometry + petites primitives). Unité = une case.
import * as THREE from 'three';

const P = (x, y) => new THREE.Vector2(x, y);
function arc(cx, cy, r, a0, a1, n = 8, sx = 1) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    out.push(P(cx + Math.cos(a) * r * sx, cy + Math.sin(a) * r));
  }
  return out;
}
const SEG = 28;
const lathe = (pts) => new THREE.LatheGeometry(pts, SEG);

// Socle commun : disque arrondi.
const baseProfile = (r = 0.38, h = 0.14) => [P(0, 0), P(r, 0), P(r + 0.02, 0.03), P(r + 0.02, h - 0.04), P(r - 0.04, h), P(r - 0.1, h + 0.04)];

function pawn() {
  const pts = [...baseProfile(0.34), P(0.2, 0.22), P(0.12, 0.34), P(0.1, 0.46), P(0.2, 0.5), P(0.22, 0.54), P(0.12, 0.58), ...arc(0, 0.7, 0.17, -Math.PI / 2 + 0.7, Math.PI / 2, 8)];
  return [lathe(pts)];
}
function rook() {
  const pts = [...baseProfile(0.38), P(0.27, 0.22), P(0.24, 0.3), P(0.22, 0.7), P(0.32, 0.76), P(0.34, 0.9), P(0.26, 0.9), P(0.26, 0.84), P(0, 0.84)];
  const geos = [lathe(pts)];
  for (let i = 0; i < 4; i++) {
    const g = new THREE.BoxGeometry(0.14, 0.16, 0.14);
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    g.translate(Math.cos(a) * 0.25, 0.92, Math.sin(a) * 0.25);
    geos.push(g);
  }
  return geos;
}
function bishop() {
  const pts = [...baseProfile(0.36), P(0.22, 0.22), P(0.12, 0.38), P(0.1, 0.55), P(0.2, 0.6), P(0.2, 0.64), P(0.1, 0.68),
    ...arc(0, 0.9, 0.22, -Math.PI / 2 + 0.5, Math.PI / 2 - 0.35, 10, 0.85), P(0.05, 1.18), P(0, 1.2)];
  const tip = new THREE.SphereGeometry(0.07, 14, 10); tip.translate(0, 1.26, 0);
  return [lathe(pts), tip];
}
function queen() {
  const pts = [...baseProfile(0.4), P(0.25, 0.24), P(0.14, 0.42), P(0.12, 0.62), P(0.22, 0.7), P(0.23, 0.76), P(0.15, 0.8), P(0.14, 0.95),
    P(0.28, 1.12), P(0.3, 1.2), P(0.18, 1.18), P(0, 1.16)];
  const geos = [lathe(pts)];
  for (let i = 0; i < 6; i++) {
    const g = new THREE.SphereGeometry(0.07, 12, 8);
    const a = (i * Math.PI * 2) / 6;
    g.translate(Math.cos(a) * 0.25, 1.24, Math.sin(a) * 0.25);
    geos.push(g);
  }
  const top = new THREE.SphereGeometry(0.1, 14, 10); top.translate(0, 1.26, 0);
  geos.push(top);
  return geos;
}
function king() {
  const pts = [...baseProfile(0.4), P(0.25, 0.24), P(0.14, 0.44), P(0.12, 0.66), P(0.23, 0.74), P(0.24, 0.8), P(0.16, 0.84), P(0.15, 1.0),
    P(0.28, 1.2), P(0.26, 1.28), P(0, 1.28)];
  const v = new THREE.BoxGeometry(0.1, 0.34, 0.1); v.translate(0, 1.45, 0);
  const h = new THREE.BoxGeometry(0.28, 0.1, 0.1); h.translate(0, 1.5, 0);
  const h2 = new THREE.BoxGeometry(0.1, 0.1, 0.28); h2.translate(0, 1.5, 0); // croix en « + » : lisible aussi de dessus
  return [lathe(pts), v, h, h2];
}
function knight() {
  const base = lathe([...baseProfile(0.38), P(0.28, 0.22), P(0.26, 0.28), P(0, 0.3)]);
  // Profil de tête de cheval (regarde vers +x), puis extrusion arrondie.
  const pts = [[-0.27, 0.26], [-0.31, 0.55], [-0.24, 0.85], [-0.12, 1.08], [-0.05, 1.3], [0.04, 1.1], [0.2, 1.02], [0.38, 0.78],
    [0.4, 0.62], [0.3, 0.56], [0.14, 0.62], [0.08, 0.5], [0.26, 0.26]].map(([x, y]) => new THREE.Vector3(x, y, 0));
  const curve = new THREE.CatmullRomCurve3(pts, true, 'centripetal');
  const shape = new THREE.Shape(curve.getPoints(60).map((v) => new THREE.Vector2(v.x, v.y)));
  const head = new THREE.ExtrudeGeometry(shape, { depth: 0.2, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 3, curveSegments: 6 });
  head.translate(0, 0.1, -0.1);
  return { geos: [base], extra: [head] };
}

const HEIGHT = { P: 0.9, N: 1.35, B: 1.4, R: 1.05, Q: 1.45, K: 1.7 };
export { HEIGHT };

const cache = {};
export function pieceGeometries(type) {
  if (cache[type]) return cache[type];
  const r = { P: pawn, R: rook, B: bishop, Q: queen, K: king, N: knight }[type]();
  cache[type] = Array.isArray(r) ? { geos: r, extra: [] } : r;
  return cache[type];
}

export const MATERIALS = {
  w: new THREE.MeshStandardMaterial({ color: 0xf8f8f4, roughness: 0.4, metalness: 0.04 }),
  b: new THREE.MeshStandardMaterial({ color: 0x24242a, roughness: 0.22, metalness: 0.2, emissive: 0x18181e }),
};

// Crée une pièce (Group) ; le cavalier est vu de profil (blanc vers la droite, noir vers la gauche).
// opts.scale : taille relative (téléphone : un peu plus grand) ; opts.lean (rad) / opts.side : tête du cavalier
// basculée vers l'arrière pour que son profil reste lisible depuis une caméra quasi verticale.
export function createPiece(code, opts = {}) {
  const color = code[0], type = code[1];
  const { geos, extra } = pieceGeometries(type);
  const g = new THREE.Group();
  const mat = MATERIALS[color];
  for (const geo of geos) {
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = true;
    g.add(m);
  }
  for (const geo of extra) {
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = true;
    m.rotation.y = color === 'w' ? 0 : Math.PI; // profil lisible depuis la caméra
    if (opts.lean) {
      // la tête bascule « en arrière » par rapport à l'observateur (side = cos de l'azimut caméra : +1 vue blancs, -1 vue noirs, interpolé pendant la rotation)
      // et reste centrée sur sa case
      const side = opts.side || 1, PIV = 0.33;
      const pivot = new THREE.Group();
      pivot.position.set(0, PIV, side * Math.sin(opts.lean) * 0.48);
      pivot.rotation.x = -side * opts.lean;
      m.position.y = -PIV;
      pivot.add(m);
      pivot.userData.lean = opts.lean;
      g.userData.pivot = pivot;
      g.add(pivot);
    } else g.add(m);
  }
  const k = opts.scale || 1;
  g.scale.set(k, k, k);
  g.userData.code = code;
  g.userData.k = k;
  return g;
}
