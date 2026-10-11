// Modèles procéduraux simples pour les articles (origine au sol, hauteur ~1).
import * as THREE from 'three';

const matCache = new Map();
function M(color) {
  if (!matCache.has(color)) matCache.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.55 }));
  return matCache.get(color);
}
const geoCache = new Map();
function G(key, make) {
  if (!geoCache.has(key)) geoCache.set(key, make());
  return geoCache.get(key);
}
const sphere = (r = 1) => G('s' + r, () => new THREE.SphereGeometry(r, 20, 14));
const cyl = (rt, rb, h) => G(`c${rt},${rb},${h}`, () => new THREE.CylinderGeometry(rt, rb, h, 20));
const cone = (r, h) => G(`k${r},${h}`, () => new THREE.ConeGeometry(r, h, 20));

function mesh(geo, color, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) {
  const m = new THREE.Mesh(geo, M(color));
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  m.castShadow = true;
  return m;
}

function iceCream(scoop, extra) {
  const g = new THREE.Group();
  const c = mesh(cone(0.3, 0.7), 0xe0a050, 0, 0.35, 0);
  c.rotation.x = Math.PI;
  g.add(c);
  g.add(mesh(sphere(0.36), scoop, 0, 0.82, 0));
  if (extra) g.add(extra);
  return g;
}

const BUILDERS = {
  apple() {
    const g = new THREE.Group();
    g.add(mesh(sphere(0.5), 0xe8262c, 0, 0.5, 0, 1, 0.92, 1));
    g.add(mesh(cyl(0.04, 0.04, 0.25), 0x6b4423, 0, 1.05, 0));
    const leaf = mesh(sphere(0.12), 0x3dbb4a, 0.14, 1.1, 0, 1.6, 0.5, 0.8);
    g.add(leaf);
    return g;
  },
  banana() {
    const g = new THREE.Group();
    for (let i = 0; i < 6; i++) {
      const a = (i / 5 - 0.5) * 1.5;
      g.add(mesh(sphere(0.2), 0xffd93b, Math.sin(a) * 0.7, 0.3 + (1 - Math.cos(a)) * 0.0 + 0.25 * Math.cos(a), 0, 1.1, 1, 1));
    }
    g.add(mesh(sphere(0.1), 0x6b4423, -0.72, 0.52, 0));
    g.position.y = 0;
    return g;
  },
  pear() {
    const g = new THREE.Group();
    g.add(mesh(sphere(0.5), 0xb5d63d, 0, 0.45, 0, 1, 0.9, 1));
    g.add(mesh(sphere(0.32), 0xb5d63d, 0, 0.95, 0));
    g.add(mesh(cyl(0.04, 0.04, 0.22), 0x6b4423, 0, 1.3, 0));
    return g;
  },
  strawberry() {
    const g = new THREE.Group();
    const b = mesh(cone(0.46, 0.9), 0xf0324f, 0, 0.5, 0);
    b.rotation.x = Math.PI;
    g.add(b);
    g.add(mesh(sphere(0.46), 0xf0324f, 0, 0.9, 0, 1, 0.5, 1));
    g.add(mesh(sphere(0.3), 0x3dbb4a, 0, 1.12, 0, 1.2, 0.3, 1.2));
    for (let i = 0; i < 6; i++) {
      const a = i * 1.05;
      g.add(mesh(sphere(0.04), 0xffe9a0, Math.cos(a) * 0.34, 0.5 + (i % 3) * 0.17, Math.sin(a) * 0.34));
    }
    return g;
  },
  ball() {
    const g = new THREE.Group();
    g.add(mesh(sphere(0.55), 0x4da3ff, 0, 0.55, 0));
    const band = mesh(new THREE.TorusGeometry(0.55, 0.07, 10, 28), 0xffc233, 0, 0.55, 0);
    g.add(band);
    const band2 = mesh(G('torus2', () => new THREE.TorusGeometry(0.55, 0.07, 10, 28)), 0xff5a5f, 0, 0.55, 0);
    band2.rotation.y = Math.PI / 2;
    g.add(band2);
    return g;
  },
  top() {
    const g = new THREE.Group();
    const b = mesh(cone(0.5, 0.8), 0xc77dff, 0, 0.5, 0);
    b.rotation.x = Math.PI;
    g.add(b);
    g.add(mesh(cyl(0.5, 0.5, 0.18), 0xffc233, 0, 0.82, 0));
    g.add(mesh(cyl(0.07, 0.07, 0.4), 0xff5a5f, 0, 1.08, 0));
    return g;
  },
  car() {
    const g = new THREE.Group();
    g.add(mesh(G('carbody', () => new THREE.BoxGeometry(1.3, 0.35, 0.65)), 0xff5a5f, 0, 0.35, 0));
    g.add(mesh(G('carcab', () => new THREE.BoxGeometry(0.65, 0.3, 0.55)), 0xff8a8d, -0.05, 0.67, 0));
    for (const [x, z] of [[-0.42, 0.34], [0.42, 0.34], [-0.42, -0.34], [0.42, -0.34]]) {
      const w = mesh(cyl(0.17, 0.17, 0.12), 0x333344, x, 0.18, z);
      w.rotation.x = Math.PI / 2;
      g.add(w);
    }
    return g;
  },
  duck() {
    const g = new THREE.Group();
    g.add(mesh(sphere(0.5), 0xffd93b, 0, 0.45, 0, 1.15, 0.85, 0.9));
    g.add(mesh(sphere(0.3), 0xffd93b, 0.38, 0.95, 0));
    g.add(mesh(sphere(0.12), 0xff8a2b, 0.68, 0.9, 0, 1.5, 0.6, 1));
    g.add(mesh(sphere(0.05), 0x222222, 0.5, 1.05, 0.2));
    g.add(mesh(sphere(0.05), 0x222222, 0.5, 1.05, -0.2));
    return g;
  },
  iceVanilla: () => iceCream(0xfff1c2),
  iceStrawberry: () => iceCream(0xff8fb8),
  iceLemon: () => iceCream(0xf7ea4a),
  iceChoco() {
    const g = iceCream(0x6b3a1d);
    g.add(mesh(sphere(0.12), 0xff5a5f, 0, 1.2, 0));
    return g;
  },
};

export function buildItem(shape) {
  const f = BUILDERS[shape] || BUILDERS.ball;
  return f();
}

export { M as itemMaterial, sphere as itemSphere, cyl as itemCyl };
