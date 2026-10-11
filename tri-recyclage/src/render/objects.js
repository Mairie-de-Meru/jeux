import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// Géométries et matériaux partagés (créés une fois, jamais disposés à chaque objet).
const geoCache = new Map();
const matCache = new Map();

function geo(key, make) {
  if (!geoCache.has(key)) geoCache.set(key, make());
  return geoCache.get(key);
}
function mat(key, color, opts = {}) {
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.5, ...opts }));
  return matCache.get(key);
}
function lathe(key, pts) {
  return geo(key, () => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 24));
}
function mesh(g, m, x = 0, y = 0, z = 0) {
  const o = new THREE.Mesh(g, m);
  o.position.set(x, y, z);
  o.castShadow = true;
  return o;
}
const cyl = (k, rt, rb, h, seg = 20, open = false) => geo(k, () => new THREE.CylinderGeometry(rt, rb, h, seg, 1, open));
const rbox = (k, w, h, d, r = 0.05) => geo(k, () => new RoundedBoxGeometry(w, h, d, 3, r));
const sph = (k, r) => geo(k, () => new THREE.SphereGeometry(r, 20, 14));

const BUILDERS = {
  bouteille(g) {
    const body = lathe('bouteille', [[0, 0], [0.2, 0], [0.22, 0.05], [0.22, 0.5], [0.16, 0.62], [0.07, 0.72], [0.07, 0.8], [0, 0.8]]);
    g.add(mesh(body, mat('bouteille', 0x5aa9ec, { transparent: true, opacity: 0.88, side: THREE.DoubleSide, roughness: 0.15 })));
    g.add(mesh(cyl('bouteille-label', 0.225, 0.225, 0.22, 20, true), mat('bouteille-label', 0xffffff, { side: THREE.DoubleSide }), 0, 0.3, 0));
    g.add(mesh(cyl('bouteille-cap', 0.09, 0.09, 0.1), mat('bouteille-cap', 0x1f4fc4), 0, 0.85, 0));
  },
  canette(g) {
    g.add(mesh(cyl('canette', 0.2, 0.2, 0.5, 24), mat('canette', 0xd7dbe3, { metalness: 0.6, roughness: 0.3 }), 0, 0.25, 0));
    g.add(mesh(cyl('canette-band', 0.205, 0.205, 0.24, 24, true), mat('canette-band', 0xe94f37, { side: THREE.DoubleSide }), 0, 0.26, 0));
    g.add(mesh(cyl('canette-top', 0.16, 0.2, 0.05, 24), mat('canette-top', 0xb9bfcc, { metalness: 0.7, roughness: 0.25 }), 0, 0.525, 0));
    g.add(mesh(rbox('canette-tab', 0.1, 0.02, 0.06, 0.01), mat('canette-tab', 0x9aa1b0, { metalness: 0.7 }), 0, 0.56, 0));
  },
  carton(g) {
    g.add(mesh(rbox('carton', 0.8, 0.55, 0.6, 0.06), mat('carton', 0xc99a5b, { roughness: 0.9 }), 0, 0.275, 0));
    g.add(mesh(rbox('carton-tape', 0.14, 0.02, 0.62, 0.01), mat('carton-tape', 0xe9cf9f), 0, 0.555, 0));
    g.add(mesh(rbox('carton-tapef', 0.14, 0.57, 0.02, 0.01), mat('carton-tape', 0xe9cf9f), 0, 0.275, 0.3));
  },
  pot(g) {
    const body = lathe('pot', [[0, 0], [0.28, 0], [0.3, 0.05], [0.3, 0.5], [0.23, 0.58], [0.23, 0.64], [0, 0.64]]);
    g.add(mesh(body, mat('pot', 0x7fd9a0, { transparent: true, opacity: 0.5, side: THREE.DoubleSide, roughness: 0.08 })));
    g.add(mesh(cyl('pot-lid', 0.25, 0.25, 0.1), mat('pot-lid', 0xc9ced8, { metalness: 0.8, roughness: 0.25 }), 0, 0.69, 0));
  },
  trognon(g) {
    g.add(mesh(cyl('trognon-core', 0.14, 0.14, 0.5), mat('trognon-core', 0xf3e3b0), 0, 0.3, 0));
    const red = mat('trognon-red', 0xd9363e);
    const top = mesh(sph('trognon-s', 0.3), red, 0, 0.5, 0); top.scale.set(1, 0.55, 1); g.add(top);
    const bot = mesh(sph('trognon-s', 0.3), red, 0, 0.1, 0); bot.scale.set(1, 0.55, 1); g.add(bot);
    const seed = mat('trognon-seed', 0x4a2e1a);
    for (const s of [-1, 1]) { const sd = mesh(sph('trognon-seed', 0.035), seed, 0.1 * s, 0.3, 0.12); sd.scale.set(0.8, 1.4, 0.8); g.add(sd); }
    g.add(mesh(cyl('trognon-stem', 0.025, 0.03, 0.2), mat('trognon-stem', 0x6b4423), 0, 0.72, 0));
    const leaf = mesh(sph('trognon-leaf', 0.1), mat('trognon-leaf', 0x3bb273), 0.1, 0.74, 0); leaf.scale.set(1.5, 0.35, 0.8); leaf.rotation.z = 0.4; g.add(leaf);
  },
  journal(g) {
    g.add(mesh(rbox('journal', 0.85, 0.14, 0.62, 0.04), mat('journal', 0xf1ecdc, { roughness: 0.9 }), 0, 0.07, 0));
    g.add(mesh(rbox('journal-title', 0.6, 0.01, 0.12, 0.005), mat('journal-ink', 0x2b2d33), -0.08, 0.145, -0.18));
    g.add(mesh(rbox('journal-pic', 0.3, 0.01, 0.2, 0.005), mat('journal-pic', 0x9db7d5), -0.2, 0.145, 0.05));
    for (let i = 0; i < 3; i++) g.add(mesh(rbox('journal-line', 0.3, 0.01, 0.03, 0.005), mat('journal-ink', 0x2b2d33), 0.2, 0.145, -0.02 + i * 0.1));
    g.add(mesh(rbox('journal-fold', 0.02, 0.15, 0.62, 0.005), mat('journal-fold', 0xd8d1bb), 0, 0.075, 0));
  },
  pile(g) {
    g.add(mesh(cyl('pile', 0.14, 0.14, 0.5, 20), mat('pile', 0x2f3a3f, { roughness: 0.4 }), 0, 0.25, 0));
    g.add(mesh(cyl('pile-band', 0.145, 0.145, 0.2, 20, true), mat('pile-band', 0xffc93c, { side: THREE.DoubleSide }), 0, 0.28, 0));
    g.add(mesh(cyl('pile-cap', 0.06, 0.06, 0.07, 16), mat('pile-cap', 0xd7dbe3, { metalness: 0.7, roughness: 0.25 }), 0, 0.535, 0));
  },
};

const hitGeo = new THREE.BoxGeometry(1.2, 1.2, 1.2);
const hitMat = new THREE.MeshBasicMaterial({ visible: false });

// Renvoie un Group { userData.body } : body porte le squash/pop, la zone de contact est invisible.
export function createItemMesh(itemId, size = 1.6) {
  const build = BUILDERS[itemId];
  const outer = new THREE.Group();
  const body = new THREE.Group();
  const inner = new THREE.Group();
  if (build) build(inner);
  inner.scale.setScalar(size);
  body.add(inner);
  outer.add(body);
  const hit = new THREE.Mesh(hitGeo, hitMat);
  hit.position.y = 0.55;
  outer.add(hit);
  outer.userData.body = body;
  return outer;
}
