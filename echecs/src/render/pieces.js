// Géométries partagées des 6 pièces (LatheGeometry + primitives). Unité = une case.
// Silhouettes typées et hauteurs échelonnées : pion 0,8 < tour 1,15 < cavalier 1,35 < fou 1,5 < dame 1,7 < roi 1,95.
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
const SEG = 32;
const lathe = (pts) => new THREE.LatheGeometry(pts, SEG);
const box = (w, h, d, x, y, z) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
const ball = (r, x, y, z) => new THREE.SphereGeometry(r, 14, 10).translate(x, y, z);

// Socle commun : disque arrondi.
const baseProfile = (r = 0.38, h = 0.14) => [P(0, 0), P(r, 0), P(r + 0.02, 0.03), P(r + 0.02, h - 0.04), P(r - 0.04, h), P(r - 0.1, h + 0.04)];

// Chaque pièce = liste de parties { geo, accent?, head? } (accent : matériau contrasté ; head : tête du cavalier).
function pawn() {
  const pts = [...baseProfile(0.32), P(0.2, 0.2), P(0.11, 0.32), P(0.09, 0.42), P(0.19, 0.46), P(0.2, 0.5), P(0.1, 0.54),
    ...arc(0, 0.66, 0.16, -Math.PI / 2 + 0.75, Math.PI / 2, 8)];
  return [{ geo: lathe(pts) }];
}
function rook() {
  const pts = [...baseProfile(0.38), P(0.28, 0.22), P(0.25, 0.3), P(0.23, 0.78), P(0.34, 0.86), P(0.36, 0.98), P(0.21, 0.98), P(0.21, 0.92), P(0, 0.92)];
  const parts = [{ geo: lathe(pts) }];
  // 5 merlons carrés autour d'un sommet plat large
  for (let i = 0; i < 5; i++) {
    const a = (i * Math.PI * 2) / 5;
    const g = new THREE.BoxGeometry(0.17, 0.2, 0.13);
    g.rotateY(-a + Math.PI / 2);
    g.translate(Math.cos(a) * 0.285, 1.07, Math.sin(a) * 0.285);
    parts.push({ geo: g });
  }
  return parts;
}
function bishop() {
  const pts = [...baseProfile(0.36), P(0.22, 0.22), P(0.12, 0.4), P(0.1, 0.62), P(0.21, 0.67), P(0.21, 0.72), P(0.11, 0.76),
    // mitre en ogive pointue
    P(0.17, 0.84), P(0.21, 0.95), P(0.205, 1.05), P(0.17, 1.17), P(0.11, 1.28), P(0.04, 1.37), P(0, 1.39)];
  // entaille diagonale (disque fin contrasté qui coupe la mitre en biseau)
  const slit = new THREE.CylinderGeometry(0.205, 0.205, 0.045, 28);
  slit.rotateZ(0.6);
  slit.translate(0, 1.1, 0);
  return [{ geo: lathe(pts) }, { geo: slit, accent: true }, { geo: ball(0.065, 0, 1.44, 0) }];
}
function queen() {
  const pts = [...baseProfile(0.4), P(0.26, 0.24), P(0.15, 0.44), P(0.12, 0.74), P(0.23, 0.8), P(0.24, 0.86), P(0.14, 0.9), P(0.14, 1.12),
    P(0.3, 1.38), P(0.31, 1.42), P(0.16, 1.4), P(0, 1.4)];
  const parts = [{ geo: lathe(pts) }];
  // couronne : 8 pointes terminées par des boules (étoile vue de dessus), plus large que le roi
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI * 2) / 8;
    const c = new THREE.ConeGeometry(0.055, 0.24, 8);
    c.rotateZ(-0.35); // penchée vers l'extérieur
    c.translate(0.04, 0.12, 0);
    c.rotateY(-a);
    c.translate(Math.cos(a) * 0.27, 1.38, Math.sin(a) * 0.27);
    parts.push({ geo: c });
    parts.push({ geo: ball(0.05, Math.cos(a) * 0.37, 1.6, Math.sin(a) * 0.37) });
  }
  parts.push({ geo: ball(0.12, 0, 1.5, 0) });
  parts.push({ geo: ball(0.06, 0, 1.66, 0) });
  return parts;
}
function king() {
  const pts = [...baseProfile(0.4), P(0.26, 0.24), P(0.15, 0.46), P(0.13, 0.8), P(0.24, 0.86), P(0.25, 0.92), P(0.16, 0.96), P(0.16, 1.18),
    P(0.27, 1.38), P(0.25, 1.46), P(0, 1.48)];
  // grande croix épaisse : « † » de profil, « + » vu de dessus
  return [{ geo: lathe(pts) }, { geo: box(0.14, 0.5, 0.14, 0, 1.7, 0) }, { geo: box(0.4, 0.13, 0.14, 0, 1.76, 0) }, { geo: box(0.14, 0.13, 0.4, 0, 1.76, 0) }];
}
function knight() {
  const base = lathe([...baseProfile(0.38), P(0.28, 0.22), P(0.26, 0.28), P(0, 0.3)]);
  // Profil de tête de cheval (museau vers +x) : poitrail, museau, front, deux oreilles, nuque.
  const pts = [[-0.28, 0.26], [-0.32, 0.6], [-0.26, 0.9], [-0.16, 1.1], [-0.12, 1.32], [-0.05, 1.18], [0.0, 1.34], [0.06, 1.14],
    [0.22, 1.02], [0.42, 0.8], [0.44, 0.66], [0.34, 0.6], [0.16, 0.66], [0.08, 0.52], [0.24, 0.26]].map(([x, y]) => new THREE.Vector3(x, y, 0));
  const curve = new THREE.CatmullRomCurve3(pts, true, 'centripetal', 0.3);
  const shape = new THREE.Shape(curve.getPoints(80).map((v) => new THREE.Vector2(v.x, v.y)));
  const head = new THREE.ExtrudeGeometry(shape, { depth: 0.22, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 3, curveSegments: 6 });
  head.translate(0, 0.1, -0.11);
  // crinière : crête contrastée le long de la nuque
  const mane = new THREE.Shape();
  mane.moveTo(-0.3, 0.42); mane.lineTo(-0.36, 0.72); mane.lineTo(-0.28, 1.0); mane.lineTo(-0.17, 1.2);
  mane.lineTo(-0.1, 1.08); mane.lineTo(-0.2, 0.9); mane.lineTo(-0.25, 0.66); mane.lineTo(-0.22, 0.42);
  const maneGeo = new THREE.ExtrudeGeometry(mane, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 1 });
  maneGeo.translate(0, 0.1, -0.04);
  // yeux des deux côtés
  const eyes = [ball(0.04, 0.12, 1.05, 0.15), ball(0.04, 0.12, 1.05, -0.15)];
  return [{ geo: base }, { geo: head, head: true }, { geo: maneGeo, head: true, accent: true }, ...eyes.map((geo) => ({ geo, head: true, accent: true }))];
}

const HEIGHT = { P: 0.82, N: 1.45, B: 1.5, R: 1.17, Q: 1.68, K: 1.95 };
export { HEIGHT };

const cache = {};
export function pieceParts(type) {
  if (!cache[type]) cache[type] = { P: pawn, R: rook, B: bishop, Q: queen, K: king, N: knight }[type]();
  return cache[type];
}

export const MATERIALS = {
  w: new THREE.MeshStandardMaterial({ color: 0xf8f8f4, roughness: 0.4, metalness: 0.04 }),
  b: new THREE.MeshStandardMaterial({ color: 0x24242a, roughness: 0.22, metalness: 0.2, emissive: 0x18181e }),
};
// Détails contrastés (fente du fou, crinière et yeux du cavalier).
const ACCENT = {
  w: new THREE.MeshStandardMaterial({ color: 0x3a3a44, roughness: 0.5 }),
  b: new THREE.MeshStandardMaterial({ color: 0xc9c9cf, roughness: 0.5 }),
};

const KNIGHT_YAW = 0.6; // le cavalier regarde vers l'adversaire, en 3/4 pour que son profil reste lisible

// opts.scale : taille relative (téléphone : un peu plus grand) ; opts.lean (rad) / opts.side : tête du cavalier
// basculée vers l'arrière par rapport à l'observateur (side = cos de l'azimut caméra, interpolé pendant la rotation).
export function createPiece(code, opts = {}) {
  const color = code[0], type = code[1];
  const g = new THREE.Group();
  let headGroup = null;
  for (const part of pieceParts(type)) {
    const m = new THREE.Mesh(part.geo, part.accent ? ACCENT[color] : MATERIALS[color]);
    m.castShadow = !part.accent;
    if (!part.head) { g.add(m); continue; }
    if (!headGroup) {
      headGroup = new THREE.Group();
      // blancs : museau vers +x tourné vers -z (adversaire) ; noirs : vers -x tourné vers +z
      headGroup.rotation.y = color === 'w' ? KNIGHT_YAW : Math.PI + KNIGHT_YAW;
    }
    headGroup.add(m);
  }
  if (headGroup) {
    if (opts.lean) {
      const side = opts.side ?? 1, PIV = 0.33;
      const pivot = new THREE.Group();
      pivot.position.set(0, PIV, side * Math.sin(opts.lean) * 0.48);
      pivot.rotation.x = -side * opts.lean;
      headGroup.position.y = -PIV;
      pivot.add(headGroup);
      pivot.userData.lean = opts.lean;
      g.userData.pivot = pivot;
      g.add(pivot);
    } else g.add(headGroup);
  }
  const k = opts.scale || 1;
  g.scale.set(k, k, k);
  g.userData.code = code;
  g.userData.k = k;
  return g;
}
