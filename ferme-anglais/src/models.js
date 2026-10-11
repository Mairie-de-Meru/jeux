// Modèles 3D procéduraux (animaux, fruits, objets), îlots et halo. Style « pâte à modeler ».
// Géométries et matériaux créés une seule fois (caches de module) et partagés par tous les modèles.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { getColor, getNoun, defaultColor } from './data.js';
import { imageUrl } from './assets.js';
import { glbChoice } from './glbpick.js';
import { instantiate } from './gltf.js';

export const ISLAND_TOP = 0.36;

const PI = Math.PI;

// ---------- caches partagés ----------
// Niveau de détail courant : 0 = plein (modèle seul), 1 = réduit (groupes nombreux, petits à l'écran).
// Le niveau fait partie de la clé de cache : chaque géométrie n'est créée qu'une fois par niveau.
let LOD = 0;
const q = (n, min = 3) => (LOD ? Math.max(min, Math.round(n * 0.7)) : n);
const geoCache = new Map();
function geo(key, make) {
  const k = LOD + key;
  let g = geoCache.get(k);
  if (!g) {
    g = make();
    geoCache.set(k, g);
  }
  return g;
}
// Résolution des sphères selon leur taille (les petits détails n'ont pas besoin de segments).
const sph = (r) =>
  geo('s' + r, () => {
    const [w, h] = r >= 0.3 ? [16, 10] : r >= 0.1 ? [12, 8] : r >= 0.04 ? [8, 6] : [6, 4];
    return new THREE.SphereGeometry(r, q(w, 6), q(h, 4));
  });
const rbox = (w, h, d, r) => geo(`b${w},${h},${d},${r}`, () => new RoundedBoxGeometry(w, h, d, 2, r));
const cyl = (rt, rb, h, seg = 10) => geo(`c${rt},${rb},${h},${seg}`, () => new THREE.CylinderGeometry(rt, rb, h, q(seg, 5)));
const cone = (r, h, seg = 8) => geo(`k${r},${h},${seg}`, () => new THREE.ConeGeometry(r, h, q(seg, 5)));
const tor = (r, t, arc) => geo(`t${r},${t},${arc}`, () => new THREE.TorusGeometry(r, t, q(6, 4), q(16, 8), arc));
// capsule d'axe Y : rayon r, partie droite len
const caps = (r, len) =>
  geo(`cp${r},${len}`, () => (r >= 0.2 ? new THREE.CapsuleGeometry(r, len, q(3, 2), q(12, 8)) : new THREE.CapsuleGeometry(r, len, 2, q(r >= 0.1 ? 10 : 6, 5))));
// sphère unité à faible résolution (instances)
const unitSph = () => geo('unit', () => new THREE.SphereGeometry(1, q(8, 6), q(6, 4)));

// Tube lisse le long d'une courbe Catmull-Rom (points [x,y,z]).
const tube = (key, pts, r, seg = 20, rad = 6) =>
  geo(key, () => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), q(Math.round(seg * 0.8), 6), r, q(Math.min(rad, 5), 4), false));

// Profil lissé (r, y) pour LatheGeometry : n points de contrôle échantillonnés (réduit en LOD 1).
const profCache = new Map();
const latheN = () => q(16, 8);
function profile(key, ctrl) {
  const n = latheN();
  const k = key + n;
  let p = profCache.get(k);
  if (!p) {
    p = new THREE.SplineCurve(ctrl.map((c) => new THREE.Vector2(c[0], c[1]))).getPoints(n).map((v) => new THREE.Vector2(Math.max(0, v.x), v.y));
    profCache.set(k, p);
  }
  return p;
}
const lathe = (key, ctrl, seg = 16) => geo('l' + key, () => new THREE.LatheGeometry(profile(key, ctrl), q(seg, 8)));
// Lathe d'une polyligne brute (seau).
const latheRaw = (key, pts, seg = 18) => geo('lr' + key, () => new THREE.LatheGeometry(pts.map((p) => new THREE.Vector2(p[0], p[1])), q(seg, 8)));

// Extrusion biseautée d'une forme 2D. post(g) peut tourner la géométrie ; centre par défaut.
function ext(key, build, depth, bevel, post = null, center = true) {
  return geo('e' + key, () => {
    const s = new THREE.Shape();
    build(s);
    const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 1, curveSegments: q(5, 3) });
    if (center) g.center();
    if (post) post(g);
    return g;
  });
}
// Feuille pointue posée à plat, pointe vers +x, base à l'origine.
const leafGeo = (L, W) =>
  ext(`leaf${L},${W}`, (s) => { s.moveTo(0, 0); s.quadraticCurveTo(L * 0.5, W * 1.4, L, 0); s.quadraticCurveTo(L * 0.5, -W * 1.4, 0, 0); }, 0.012, 0.008, (g) => g.rotateX(-PI / 2), false);
// Pétale arrondi posé à plat, base près de l'origine, vers +x.
const petalGeo = (L, W) =>
  ext(`petal${L},${W}`, (s) => {
    s.moveTo(0.04, 0);
    s.bezierCurveTo(0.06, -W, L * 0.85, -W, L, 0);
    s.bezierCurveTo(L * 0.85, W, 0.06, W, 0.04, 0);
  }, 0.03, 0.012, (g) => g.rotateX(-PI / 2), false);

const matCache = new Map();
function mat(hex) {
  let m = matCache.get(hex);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.82, metalness: 0 });
    matCache.set(hex, m);
  }
  return m;
}
const WHITE = 0xffffff;
const DARK = 0x222222;
const GREEN = 0x4caf50;

const texCache = new Map();
function texture(key) {
  const url = imageUrl(key);
  if (!url) return null;
  if (!texCache.has(key)) {
    const t = new THREE.TextureLoader().load(url);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    texCache.set(key, t);
  }
  return texCache.get(key);
}
export { texture as getTexture };

// part(parent, géométrie, matériau, { p, s, r, n }) ; n:1 = pas d'ombre portée (petits détails)
function part(parent, g, m, o = {}) {
  const mesh = new THREE.Mesh(g, m);
  if (o.p) mesh.position.set(...o.p);
  if (o.s) mesh.scale.set(...o.s);
  if (o.r) mesh.rotation.set(...o.r);
  mesh.castShadow = !o.n;
  parent.add(mesh);
  return mesh;
}
// Instances d'une même géométrie ; list = [[x, y, z, sx, sy?, sz?]].
const _d = new THREE.Object3D();
function instanced(parent, g, m, list) {
  const im = new THREE.InstancedMesh(g, m, list.length);
  list.forEach((a, i) => {
    _d.position.set(a[0], a[1], a[2]);
    _d.scale.set(a[3], a[4] ?? a[3], a[5] ?? a[3]);
    _d.updateMatrix();
    im.setMatrixAt(i, _d.matrix);
  });
  im.instanceMatrix.needsUpdate = true;
  im.castShadow = true;
  parent.add(im);
  return im;
}
// Oeil posé sur une tête sphérique (centre c, rayon R, direction dir) : blanc, pupille, reflet.
function eyeOn(g, c, R, dir, r, o = {}) {
  const d = new THREE.Vector3(...dir).normalize();
  const base = d.clone().multiplyScalar(R * 0.94).add(new THREE.Vector3(...c));
  part(g, sph(r), o.iris || mat(WHITE), { p: base.toArray(), n: 1 });
  const pp = base.clone().addScaledVector(d, r * 0.6);
  part(g, sph(r * 0.62), mat(DARK), { p: pp.toArray(), s: o.slit, n: 1 });
  const hp = base.clone().addScaledVector(d, r * 0.95);
  hp.y += r * 0.28;
  hp.x -= Math.sign(dir[0] || 1) * r * 0.1;
  part(g, sph(r * 0.22), mat(WHITE), { p: hp.toArray(), n: 1 });
}
const eyePair = (g, c, R, dx, dy, dz, r, o) => {
  for (const sx of [-1, 1]) eyeOn(g, c, R, [sx * dx, dy, dz], r, o);
};
// Patte en capsule : sommet à `top`, petit sabot.
function leg(g, hex, x, z, top, r, hoof = null) {
  const len = Math.max(0.01, top - 2 * r - 0.03);
  part(g, caps(r, len), mat(hex), { p: [x, 0.03 + (len + 2 * r) / 2, z] });
  if (hoof !== null) part(g, cyl(r * 1.08, r * 1.12, 0.07, 10), mat(hoof), { p: [x, 0.035, z], n: 1 });
}

// ---------- animaux (face vers +z) ----------
const ANIMAL_BUILDERS = {
  cow(g) {
    const white = mat(0xfdfdfd);
    const black = mat(0x2b2b2b);
    const pink = mat(0xf6a5b8);
    for (const x of [-0.18, 0.18]) for (const z of [-0.3, 0.3]) leg(g, 0xfafafa, x, z, 0.5, 0.075, 0x3a3a3a);
    // corps
    part(g, caps(0.3, 0.45), white, { p: [0, 0.68, 0], r: [PI / 2, 0, 0], s: [1, 1, 0.93] });
    // taches : disques déformés posés sur le dos et les flancs (angle depuis le haut)
    for (const [th, z, k] of [[0.15, 0.12, 1.15], [-0.95, -0.15, 0.95], [1.05, 0.2, 0.85], [0.7, -0.28, 0.7], [-0.3, -0.3, 0.8]]) {
      part(g, sph(0.15), black, { p: [Math.sin(th) * 0.29, 0.68 + Math.cos(th) * 0.26, z], s: [k, 0.3 * k, 1.25 * k], r: [0, 0, -th], n: 1 });
    }
    // cou + tête
    part(g, sph(0.25), white, { p: [0, 0.82, 0.42], s: [1, 1, 1.05] });
    part(g, sph(0.23), white, { p: [0, 0.92, 0.6], s: [1, 0.95, 1.05] });
    part(g, sph(0.1), black, { p: [-0.13, 1.08, 0.6], s: [1, 0.35, 1.2], r: [0, 0, 0.5], n: 1 });
    part(g, sph(0.16), pink, { p: [0, 0.82, 0.8], s: [1.15, 0.8, 1] });
    for (const sx of [-1, 1]) part(g, sph(0.025), black, { p: [sx * 0.07, 0.84, 0.93], n: 1 });
    eyePair(g, [0, 0.92, 0.6], 0.23, 0.55, 0.3, 0.78, 0.055);
    for (const sx of [-1, 1]) {
      part(g, sph(0.1), black, { p: [sx * 0.27, 0.98, 0.55], s: [1.6, 0.45, 0.9], r: [0, 0, sx * 0.2] });
      part(g, cone(0.045, 0.17), mat(0xf5e6b8), { p: [sx * 0.14, 1.15, 0.56], r: [0, 0, -sx * 0.45], n: 1 });
    }
    // pis
    part(g, sph(0.13), pink, { p: [0, 0.4, -0.2], s: [1.1, 0.8, 1.1] });
    for (const sx of [-1, 1]) part(g, cyl(0.02, 0.025, 0.07, 6), pink, { p: [sx * 0.05, 0.33, -0.17], n: 1 });
    // queue
    part(g, tube('cowtail', [[0, 0.86, -0.5], [0, 0.82, -0.62], [0, 0.62, -0.68], [0, 0.42, -0.68]], 0.022, 14, 5), black, { n: 1 });
    part(g, sph(0.065), black, { p: [0, 0.38, -0.68], s: [1, 1.5, 1], n: 1 });
  },
  pig(g) {
    const pink = mat(0xf8a8c0);
    const deep = mat(0xf08aa6);
    for (const x of [-0.18, 0.18]) for (const z of [-0.22, 0.24]) leg(g, 0xf49ab4, x, z, 0.28, 0.085, 0xc9708a);
    part(g, sph(0.4), pink, { p: [0, 0.5, 0], s: [0.95, 0.9, 1.2] });
    part(g, sph(0.29), pink, { p: [0, 0.64, 0.42] });
    // groin
    part(g, cyl(0.13, 0.13, 0.1, 14), deep, { p: [0, 0.6, 0.7], r: [PI / 2, 0, 0] });
    for (const sx of [-1, 1]) part(g, sph(0.022), mat(0x7a2d45), { p: [sx * 0.05, 0.6, 0.755], s: [0.8, 1.4, 0.6], n: 1 });
    eyePair(g, [0, 0.64, 0.42], 0.29, 0.5, 0.35, 0.78, 0.05);
    // oreilles triangulaires, rabattues vers l'avant
    const ear = ext('pigear', (s) => { s.moveTo(-0.09, 0); s.lineTo(0.09, 0); s.lineTo(0, 0.19); s.lineTo(-0.09, 0); }, 0.025, 0.02);
    for (const sx of [-1, 1]) part(g, ear, deep, { p: [sx * 0.16, 0.9, 0.38], r: [0.55, sx * 0.2, -sx * 0.5] });
    // queue en tire-bouchon
    const pts = [];
    for (let a = 0; a <= 4 * PI; a += 0.5) pts.push([Math.cos(a) * 0.05, 0.62 + Math.sin(a) * 0.05, -0.5 - a * 0.025]);
    part(g, tube('pigtail', pts, 0.016, 32, 5), deep, { n: 1 });
  },
  sheep(g) {
    const wool = mat(0xfaf6ea);
    const dark = mat(0x3d3a3a);
    for (const x of [-0.17, 0.17]) for (const z of [-0.2, 0.2]) leg(g, 0x3d3a3a, x, z, 0.4, 0.05);
    part(g, sph(0.34), wool, { p: [0, 0.65, 0], s: [1, 0.9, 1.25] });
    // laine : grappe de sphères instanciées sur le dos, les flancs et l'arrière
    const puffs = [];
    const N = 24;
    for (let i = 0; i < N; i++) {
      const y = 0.95 - (i + 0.5) * (1.25 / N);
      const rr = Math.sqrt(1 - y * y);
      const a = i * 2.4;
      const dx = Math.cos(a) * rr;
      const dz = Math.sin(a) * rr;
      if (dz > 0.75 && y < 0.5) continue; // laisse la place de la tête
      puffs.push([dx * 0.37, 0.65 + y * 0.33, dz * 0.47, 0.17 + (i % 3) * 0.015, 0.16, 0.17]);
    }
    puffs.push([0, 1.0, 0.18, 0.2], [0, 0.9, -0.38, 0.17]);
    instanced(g, unitSph(), wool, puffs);
    // tête sombre, houppe, oreilles
    part(g, sph(0.19), dark, { p: [0, 0.8, 0.52], s: [0.9, 1.05, 1.1] });
    part(g, sph(0.12), wool, { p: [0, 0.99, 0.5] });
    part(g, sph(0.045), mat(0x5a4f4f), { p: [0, 0.74, 0.7], s: [1.3, 0.8, 0.9], n: 1 });
    eyePair(g, [0, 0.8, 0.52], 0.2, 0.55, 0.25, 0.8, 0.045);
    for (const sx of [-1, 1]) part(g, sph(0.08), dark, { p: [sx * 0.2, 0.82, 0.48], s: [1.6, 0.5, 0.9], r: [0, 0, sx * 0.3] });
  },
  duck(g) {
    const yellow = mat(0xffd93d);
    const orange = mat(0xff8f1f);
    part(g, sph(0.38), yellow, { p: [0, 0.45, 0], s: [1, 0.82, 1.25] });
    part(g, sph(0.22), yellow, { p: [0, 0.88, 0.3] });
    part(g, sph(0.3), yellow, { p: [0, 0.65, 0.22], s: [0.8, 1, 0.7] });
    // bec plat extrudé
    const bill = ext('bill', (s) => { s.moveTo(-0.1, 0); s.bezierCurveTo(-0.13, 0.12, -0.07, 0.21, 0, 0.21); s.bezierCurveTo(0.07, 0.21, 0.13, 0.12, 0.1, 0); s.lineTo(-0.1, 0); }, 0.035, 0.02, (b) => b.rotateX(PI / 2));
    part(g, bill, orange, { p: [0, 0.83, 0.55], r: [0.12, 0, 0] });
    for (const sx of [-1, 1]) part(g, sph(0.012), mat(0xb34d00), { p: [sx * 0.03, 0.865, 0.62], n: 1 });
    eyePair(g, [0, 0.88, 0.3], 0.22, 0.6, 0.35, 0.65, 0.045);
    for (const sx of [-1, 1]) {
      part(g, sph(0.2), mat(0xf5c518), { p: [sx * 0.35, 0.5, -0.04], s: [0.3, 0.75, 1.15], r: [0.15, 0, sx * 0.12] });
      part(g, sph(0.1), orange, { p: [sx * 0.13, 0.04, 0.16], s: [1.15, 0.22, 1.5], n: 1 });
    }
    // queue relevée
    part(g, cone(0.11, 0.26), yellow, { p: [0, 0.62, -0.5], r: [-0.95, 0, 0] });
  },
  horse(g) {
    const brown = mat(0xa9612f);
    const dark = mat(0x3b2412);
    for (const x of [-0.3, 0.3]) for (const z of [-0.34, 0.34]) leg(g, 0x96562a, x, z, 0.8, 0.1, 0x3b2412);
    part(g, caps(0.34, 0.5), brown, { p: [0, 0.98, 0], r: [PI / 2, 0, 0], s: [1.5, 1, 1] });
    // cou court et épais, grosse tête
    part(g, caps(0.19, 0.25), brown, { p: [0, 1.2, 0.5], r: [0.55, 0, 0] });
    part(g, caps(0.17, 0.2), brown, { p: [0, 1.46, 0.8], r: [1.0, 0, 0] });
    part(g, sph(0.15), mat(0xd9a074), { p: [0, 1.6, 1.0], s: [1, 0.9, 1] });
    eyePair(g, [0, 1.46, 0.8], 0.17, 1, 0.4, 0.25, 0.05);
    for (const sx of [-1, 1]) {
      part(g, cone(0.06, 0.18), brown, { p: [sx * 0.1, 1.68, 0.66], r: [-0.2, 0, -sx * 0.2] });
      part(g, sph(0.018), dark, { p: [sx * 0.05, 1.6, 1.12], n: 1 });
    }
    // crinière épaisse sur le dessus du cou, toupet
    part(g, caps(0.09, 0.4), dark, { p: [0, 1.3, 0.4], r: [0.55, 0, 0], s: [1.1, 1, 1.2] });
    part(g, sph(0.1), dark, { p: [0, 1.66, 0.76], s: [1, 0.7, 1.2] });
    // queue en touffe
    part(g, caps(0.1, 0.3), dark, { p: [0, 0.82, -0.62], r: [0.35, 0, 0] });
  },
  chicken(g) {
    const white = mat(0xfffaf0);
    const red = mat(0xe53935);
    const orange = mat(0xff9800);
    part(g, sph(0.34), white, { p: [0, 0.5, 0], s: [0.95, 1, 1.15] });
    part(g, sph(0.2), white, { p: [0, 0.55, 0.22], s: [1, 1.1, 0.8] });
    part(g, sph(0.17), white, { p: [0, 0.92, 0.3] });
    // bec : deux cônes
    part(g, cone(0.055, 0.15), orange, { p: [0, 0.9, 0.5], r: [PI / 2, 0, 0], n: 1 });
    // crête rouge extrudée
    const comb = ext('comb', (s) => {
      s.moveTo(-0.1, 0); s.quadraticCurveTo(-0.13, 0.12, -0.06, 0.1); s.quadraticCurveTo(-0.05, 0.21, 0, 0.14);
      s.quadraticCurveTo(0.06, 0.22, 0.07, 0.1); s.quadraticCurveTo(0.13, 0.1, 0.1, 0); s.lineTo(-0.1, 0);
    }, 0.03, 0.02, (b) => b.rotateY(PI / 2));
    part(g, comb, red, { p: [0, 1.1, 0.3] });
    // barbillons
    for (const sx of [-1, 1]) part(g, sph(0.035), red, { p: [sx * 0.03, 0.8, 0.46], s: [0.8, 1.5, 0.8], n: 1 });
    eyePair(g, [0, 0.92, 0.3], 0.17, 0.6, 0.3, 0.7, 0.035);
    for (const sx of [-1, 1]) {
      part(g, sph(0.2), mat(0xeee6d6), { p: [sx * 0.3, 0.52, -0.02], s: [0.3, 0.8, 1.15], r: [0.15, 0, sx * 0.15] });
      part(g, cyl(0.022, 0.022, 0.2, 6), orange, { p: [sx * 0.1, 0.1, 0.05], n: 1 });
      part(g, sph(0.06), orange, { p: [sx * 0.1, 0.03, 0.1], s: [1.3, 0.3, 1.8], n: 1 });
    }
    // plumes de queue en éventail
    for (const [x, rz] of [[-0.1, 0.25], [0, 0], [0.1, -0.25]]) {
      part(g, sph(0.12), mat(x === 0 ? 0xe8dcc0 : 0xf3ead2), { p: [x, 0.78, -0.4], s: [0.45, 1.5, 0.35], r: [-0.45, 0, rz] });
    }
  },
  dog(g) {
    const tan = mat(0xc99158);
    const brown = mat(0x7b4a24);
    for (const x of [-0.17, 0.17]) for (const z of [-0.24, 0.26]) leg(g, 0xb98348, x, z, 0.38, 0.085, 0xf1e2c8);
    part(g, caps(0.27, 0.36), tan, { p: [0, 0.55, 0], r: [PI / 2, 0, 0] });
    part(g, sph(0.15), brown, { p: [0.13, 0.78, -0.05], s: [1, 0.35, 1.3], r: [0, 0, -0.5], n: 1 });
    // grosse tête de chiot
    part(g, sph(0.31), tan, { p: [0, 0.92, 0.46] });
    part(g, sph(0.15), mat(0xe8c8a0), { p: [0, 0.83, 0.7], s: [1.1, 0.85, 1.2] });
    part(g, sph(0.06), mat(DARK), { p: [0, 0.89, 0.85], s: [1.2, 0.85, 1], n: 1 });
    part(g, sph(0.055), mat(0xf06292), { p: [0, 0.72, 0.78], s: [0.9, 0.3, 1.4], n: 1 });
    eyePair(g, [0, 0.92, 0.46], 0.31, 0.45, 0.4, 0.8, 0.06);
    const ear = ext('dogear', (s) => { s.moveTo(-0.06, 0); s.lineTo(0.06, 0); s.bezierCurveTo(0.13, -0.08, 0.11, -0.22, 0, -0.25); s.bezierCurveTo(-0.11, -0.22, -0.13, -0.08, -0.06, 0); }, 0.03, 0.02);
    for (const sx of [-1, 1]) part(g, ear, brown, { p: [sx * 0.3, 0.98, 0.42], r: [0.1, sx * 0.3, sx * 0.35], s: [1.4, 1.4, 1.4] });
    part(g, tor(0.24, 0.03, PI * 2), mat(0xe53935), { p: [0, 0.76, 0.3], r: [PI / 2 - 0.5, 0, 0], n: 1 });
    part(g, tube('dogtail', [[0, 0.7, -0.4], [0, 0.82, -0.52], [0, 0.99, -0.55], [0, 1.12, -0.5]], 0.05, 14, 6), tan);
  },
  cat(g) {
    const gray = mat(0x8d99a6);
    const stripe = mat(0x6d7885);
    for (const x of [-0.14, 0.14]) for (const z of [-0.16, 0.2]) leg(g, 0x7d8996, x, z, 0.32, 0.075, 0xf4f4f4);
    part(g, caps(0.25, 0.3), gray, { p: [0, 0.46, 0], r: [PI / 2, 0, 0] });
    part(g, sph(0.13), mat(0xf4f4f4), { p: [0, 0.42, 0.3], s: [1, 1, 0.7], n: 1 });
    for (const z of [-0.15, 0, 0.15]) part(g, sph(0.1), stripe, { p: [0, 0.69, z], s: [1.3, 0.3, 0.55], n: 1 });
    // grosse tête
    part(g, sph(0.3), gray, { p: [0, 0.86, 0.38], s: [1.12, 0.95, 1] });
    const ear = ext('catear', (s) => { s.moveTo(-0.1, 0); s.lineTo(0.1, 0); s.lineTo(0, 0.22); s.lineTo(-0.1, 0); }, 0.03, 0.02);
    const inner = ext('catinner', (s) => { s.moveTo(-0.055, 0); s.lineTo(0.055, 0); s.lineTo(0, 0.12); s.lineTo(-0.055, 0); }, 0.01, 0.008);
    for (const sx of [-1, 1]) {
      part(g, ear, gray, { p: [sx * 0.2, 1.1, 0.36], r: [-0.1, 0, -sx * 0.25], s: [1.2, 1.2, 1.2] });
      part(g, inner, mat(0xf4a9b8), { p: [sx * 0.2, 1.08, 0.41], r: [-0.1, 0, -sx * 0.25], s: [1.2, 1.2, 1.2], n: 1 });
    }
    eyePair(g, [0, 0.86, 0.38], 0.31, 0.5, 0.2, 0.85, 0.075, { iris: mat(0x7bd36b), slit: [0.35, 1, 0.6] });
    part(g, sph(0.035), mat(0xf06292), { p: [0, 0.81, 0.68], s: [1.3, 0.9, 0.8], n: 1 });
    for (const sx of [-1, 1]) for (const k of [-1, 0, 1]) {
      part(g, cyl(0.005, 0.004, 0.28, 3), mat(WHITE), { p: [sx * 0.25, 0.79 + k * 0.025, 0.6], r: [0, k * 0.15 * sx, PI / 2 + k * 0.12 * sx], n: 1 });
    }
    part(g, tube('cattail', [[0, 0.52, -0.36], [0, 0.47, -0.55], [0, 0.67, -0.68], [0.04, 0.97, -0.6], [0.0, 1.07, -0.5]], 0.055, 18, 6), gray);
    part(g, sph(0.057), stripe, { p: [0, 1.07, -0.5], n: 1 });
  },
};

// ---------- fruits ----------
const stemTube = (key, pts, r = 0.02) => tube(key, pts, r, 8, 5);
function leafAt(g, L, W, p, rot = [0, 0, 0]) {
  part(g, leafGeo(L, W), mat(GREEN), { p, r: rot, n: 1 });
}
const FRUIT_BUILDERS = {
  apple(g, hex) {
    const ctrl = [[0, 0.12], [0.13, 0.07], [0.27, 0.1], [0.36, 0.28], [0.36, 0.48], [0.27, 0.64], [0.12, 0.7], [0, 0.63]];
    part(g, lathe('apple', ctrl), mat(hex));
    part(g, stemTube('appleStem', [[0, 0.64, 0], [0.01, 0.74, 0], [0.04, 0.83, 0]]), mat(0x6d4c2a), { n: 1 });
    leafAt(g, 0.2, 0.06, [0.04, 0.8, 0], [0, 0.2, 0.25]);
  },
  banana(g, hex) {
    const pts = [];
    for (let i = 0; i <= 8; i++) {
      const t = -0.95 + (i / 8) * 1.9;
      pts.push([0.55 * Math.sin(t), 0.12 + 0.2 * (t / 0.95) ** 2, 0.4 * (Math.cos(t) - 0.6)]);
    }
    const geom = geo('banana', () => {
      const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
      const seg = 26;
      const rad = 6;
      const tg = new THREE.TubeGeometry(curve, seg, 0.105, rad, false);
      const pos = tg.attributes.position;
      for (let i = 0; i <= seg; i++) {
        const c = curve.getPointAt(i / seg);
        const k = 0.5 + 0.5 * Math.pow(Math.sin(PI * (0.04 + 0.92 * (i / seg))), 0.6);
        for (let j = 0; j <= rad; j++) {
          const idx = i * (rad + 1) + j;
          pos.setXYZ(idx, c.x + (pos.getX(idx) - c.x) * k, c.y + (pos.getY(idx) - c.y) * k, c.z + (pos.getZ(idx) - c.z) * k);
        }
      }
      tg.computeVertexNormals();
      return tg;
    });
    part(g, geom, mat(hex));
    const brown = mat(0x5d4037);
    part(g, sph(0.05), brown, { p: pts[8], n: 1 });
    part(g, cyl(0.032, 0.045, 0.1, 8), mat(0x6d5a2a), { p: [pts[0][0] - 0.03, pts[0][1] + 0.03, pts[0][2] - 0.02], r: [0.2, 0, 0.9], n: 1 });
    part(g, sph(0.045), brown, { p: [pts[0][0] - 0.07, pts[0][1] + 0.06, pts[0][2] - 0.02], n: 1 });
  },
  pear(g, hex) {
    const ctrl = [[0, 0.02], [0.17, 0.03], [0.3, 0.14], [0.34, 0.3], [0.27, 0.46], [0.17, 0.62], [0.12, 0.78], [0.08, 0.88], [0, 0.9]];
    part(g, lathe('pear', ctrl), mat(hex));
    part(g, stemTube('pearStem', [[0, 0.88, 0], [0.01, 0.97, 0], [0.05, 1.04, 0]]), mat(0x6d4c2a), { n: 1 });
    leafAt(g, 0.2, 0.06, [0.04, 0.96, 0], [0, -0.2, 0.3]);
  },
  strawberry(g, hex) {
    const ctrl = [[0, 0], [0.07, 0.015], [0.17, 0.1], [0.27, 0.25], [0.32, 0.42], [0.31, 0.56], [0.22, 0.66], [0, 0.69]];
    part(g, lathe('straw', ctrl), mat(hex));
    // akènes jaunes : instances posées sur le profil
    const pr = profile('straw', ctrl);
    const seeds = [];
    for (let row = 0; row < 7; row++) {
      const p = pr[Math.round(((3 + row * 2) / 22) * (pr.length - 1))];
      if (!p || p.y > 0.6) continue;
      const n = Math.max(3, Math.round((p.x * PI * 2) / 0.17));
      for (let i = 0; i < n; i++) {
        const a = (i + (row % 2) * 0.5) * ((PI * 2) / n);
        seeds.push([Math.cos(a) * p.x * 1.0, p.y, Math.sin(a) * p.x * 1.0, 0.026, 0.036, 0.026]);
      }
    }
    instanced(g, geo('seed', () => new THREE.SphereGeometry(1, 6, 4)), mat(0xffe082), seeds);
    // collerette de sépales extrudés + tige
    for (let i = 0; i < 6; i++) {
      const sep = new THREE.Group();
      sep.position.set(0, 0.67, 0);
      sep.rotation.y = (i / 6) * PI * 2;
      g.add(sep);
      part(sep, leafGeo(0.22, 0.05), mat(0x43a047), { r: [0, 0, -0.22], n: 1 });
    }
    part(g, cyl(0.02, 0.025, 0.1, 6), mat(0x43a047), { p: [0, 0.74, 0], n: 1 });
  },
  cherry(g, hex) {
    const ctrl = [[0, 0.01], [0.1, 0.02], [0.18, 0.12], [0.2, 0.25], [0.14, 0.36], [0.05, 0.395], [0, 0.36]];
    for (const sx of [-1, 1]) {
      part(g, lathe('cherry', ctrl), mat(hex), { p: [sx * 0.2, 0, 0] });
      part(g, stemTube(`cstem${sx}`, [[sx * 0.2, 0.37, 0], [sx * 0.17, 0.55, 0], [sx * 0.08, 0.74, 0], [0, 0.86, 0]], 0.016), mat(0x558b2f), { n: 1 });
      part(g, sph(0.012), mat(0xffffff), { p: [sx * 0.2 - 0.07, 0.28, 0.14], n: 1 });
    }
    leafAt(g, 0.22, 0.07, [0.0, 0.85, 0], [0, 0.1, 0.2]);
  },
  orange(g, hex) {
    part(g, sph(0.36), mat(hex), { p: [0, 0.33, 0], s: [1, 0.92, 1] });
    part(g, cyl(0.1, 0.07, 0.03, 10), mat(0x43a047), { p: [0, 0.65, 0], n: 1 });
    part(g, cyl(0.018, 0.022, 0.08, 6), mat(0x6d4c2a), { p: [0, 0.69, 0], n: 1 });
    leafAt(g, 0.22, 0.07, [0.02, 0.66, 0], [0, 0.5, 0.15]);
  },
  lemon(g, hex) {
    const ctrl = [[0, 0], [0.045, 0.015], [0.1, 0.06], [0.22, 0.17], [0.3, 0.32], [0.32, 0.45], [0.3, 0.58], [0.22, 0.73], [0.1, 0.84], [0.045, 0.885], [0, 0.9]];
    // citron couché, pointes aux deux bouts
    part(g, lathe('lemon', ctrl), mat(hex), { p: [0.45, 0.32, 0], r: [0, 0, PI / 2] });
    part(g, cyl(0.02, 0.025, 0.06, 6), mat(0x6d8c2a), { p: [-0.47, 0.32, 0], r: [0, 0, PI / 2], n: 1 });
    leafAt(g, 0.22, 0.07, [-0.05, 0.62, 0], [0, 0.4, 0.1]);
  },
};

// ---------- objets colorables ----------
const OBJECT_BUILDERS = {
  ball(g, hex) {
    // ballon à quartiers colorés, incliné pour montrer le pôle
    const alt = mat(hex === 0xf5f5f5 ? 0x1e88e5 : 0xffffff);
    const main = mat(hex);
    const tilt = new THREE.Group();
    tilt.position.y = 0.38;
    tilt.rotation.set(0.45, 0, 0.3);
    g.add(tilt);
    const gore = geo('gore', () => new THREE.SphereGeometry(0.38, 4, 10, 0, PI / 3));
    for (let i = 0; i < 6; i++) part(tilt, gore, i % 2 ? alt : main, { r: [0, (i * PI) / 3, 0] });
    for (const sy of [-1, 1]) part(tilt, sph(0.06), alt, { p: [0, sy * 0.375, 0], s: [1, 0.45, 1], n: 1 });
  },
  balloon(g, hex) {
    const m = mat(hex);
    const ctrl = [[0, 0], [0.05, 0.03], [0.12, 0.1], [0.26, 0.22], [0.36, 0.4], [0.37, 0.58], [0.3, 0.76], [0.16, 0.88], [0, 0.92]];
    part(g, lathe('balloon', ctrl), m, { p: [0, 0.55, 0], s: [0.95, 0.95, 0.95] });
    part(g, cyl(0.025, 0.065, 0.1, 10), m, { p: [0, 0.52, 0], n: 1 });
    part(g, sph(0.045), m, { p: [0, 0.465, 0], s: [1.2, 0.7, 1.2], n: 1 });
    part(g, tube('bstring', [[0, 0.46, 0], [0.06, 0.36, 0.03], [-0.05, 0.22, -0.03], [0.04, 0.1, 0.02], [0, 0.02, 0]], 0.01, 16, 4), mat(0x9e9e9e), { n: 1 });
    part(g, sph(0.08), mat(WHITE), { p: [-0.15, 1.15, 0.25], s: [0.55, 1.1, 0.35], r: [0, 0.3, 0.3], n: 1 });
  },
  bucket(g, hex) {
    const pts = [[0, 0], [0.22, 0], [0.25, 0.015], [0.28, 0.25], [0.34, 0.5], [0.355, 0.515], [0.34, 0.53], [0.305, 0.52], [0.295, 0.5], [0.24, 0.07], [0.0, 0.06]];
    part(g, latheRaw('bucket', pts), mat(hex));
    part(g, cyl(0.285, 0.26, 0.04, 20), mat(0xf0d28a), { p: [0, 0.4, 0], n: 1 });
    // bord renforcé
    part(g, tor(0.345, 0.025, PI * 2), mat(hex === 0xf5f5f5 ? 0xbdbdbd : 0xffffff), { p: [0, 0.52, 0], r: [PI / 2, 0, 0], n: 1 });
    // anse
    part(g, tube('bhandle', [[-0.34, 0.5, 0], [-0.31, 0.7, 0], [-0.17, 0.84, 0], [0, 0.88, 0], [0.17, 0.84, 0], [0.31, 0.7, 0], [0.34, 0.5, 0]], 0.022, 24, 6), mat(0x9e9e9e), { n: 1 });
  },
  flower(g, hex) {
    const green = mat(0x43a047);
    part(g, tube('fstem', [[0, 0, 0], [0.03, 0.25, -0.03], [0, 0.5, 0.03], [0, 0.78, 0.1]], 0.035, 16, 6), green);
    for (const sx of [-1, 1]) {
      part(g, leafGeo(0.3, 0.09), green, { p: [sx * 0.02, 0.18 + (sx > 0 ? 0.12 : 0), 0], r: [0, sx > 0 ? 0 : PI, sx * 0.5], n: 1 });
    }
    const head = new THREE.Group();
    head.position.set(0, 0.8, 0.1);
    head.rotation.x = 0.7;
    g.add(head);
    const pet = petalGeo(0.34, 0.1);
    const petIn = petalGeo(0.24, 0.08);
    const light = mat(hex === 0xfdd835 ? 0xffee77 : hex);
    for (let i = 0; i < 9; i++) {
      const w = new THREE.Group();
      w.rotation.y = (i / 9) * PI * 2;
      head.add(w);
      part(w, pet, mat(hex), { p: [0.05, 0, 0], r: [0, 0, 0.1] });
    }
    for (let i = 0; i < 9; i++) {
      const w = new THREE.Group();
      w.rotation.y = ((i + 0.5) / 9) * PI * 2;
      head.add(w);
      part(w, petIn, light, { p: [0.04, 0.035, 0], r: [0, 0, 0.18], n: 1 });
    }
    part(head, sph(0.12), mat(hex === 0xfdd835 ? 0x8d5524 : 0xfdd835), { p: [0, 0.05, 0], s: [1, 0.6, 1] });
  },
};

// ---------- API ----------
// Un modèle d'environ 1,2 de large, posé sur y = 0, face vers +z.
// Facteur de normalisation (grande dimension horizontale ~1,25, hauteur <= 1,5), calculé une fois par type.
const fitCache = new Map();

// Fusionne toutes les pièces d'un modèle procédural en une géométrie par (matériau, ombre) :
// 30 à 40 meshes → 5 à 10 draw calls. Le résultat est mis en cache et partagé par toutes les instances.
const _m = new THREE.Matrix4();
function bakeParts(root) {
  root.updateMatrixWorld(true);
  const buckets = new Map();
  const push = (mesh, matrix) => {
    const k = `${mesh.material.uuid}|${mesh.castShadow ? 1 : 0}`;
    let b = buckets.get(k);
    if (!b) buckets.set(k, (b = { material: mesh.material, cast: mesh.castShadow, list: [] }));
    // Tous non indexés pour pouvoir fusionner (Extrude n'a pas d'index) ; la géométrie source reste intacte.
    const gm = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
    gm.applyMatrix4(matrix);
    b.list.push(gm);
  };
  root.traverse((o) => {
    if (o.isInstancedMesh) {
      for (let i = 0; i < o.count; i++) {
        o.getMatrixAt(i, _m);
        _m.premultiply(o.matrixWorld);
        push(o, _m);
      }
    } else if (o.isMesh) push(o, o.matrixWorld);
  });
  return [...buckets.values()].map((b) => {
    const geometry = mergeGeometries(b.list, false);
    if (!geometry) throw new Error('fusion de géométries impossible (attributs différents)');
    b.list.forEach((x) => x.dispose());
    return { geometry, material: b.material, cast: b.cast };
  });
}
const bakeCache = new Map();

export function createModel(nounId, colorId = null, lod = 0) {
  const noun = getNoun(nounId);
  const g = new THREE.Group();
  const glb = glbChoice(nounId, colorId) ? instantiate(nounId) : null;
  if (glb) {
    g.add(glb);
  } else {
    const isAnimal = noun.theme === 'animals';
    const hex = isAnimal ? 0 : getColor(colorId || defaultColor(nounId) || 'red').hex;
    const key = `${nounId}|${hex}|${lod}`;
    let parts = bakeCache.get(key);
    if (!parts) {
      LOD = lod;
      try {
        const tmp = new THREE.Group();
        if (isAnimal) ANIMAL_BUILDERS[noun.model](tmp);
        else (noun.theme === 'fruits' ? FRUIT_BUILDERS : OBJECT_BUILDERS)[noun.model](tmp, hex);
        parts = bakeParts(tmp);
      } finally {
        LOD = 0;
      }
      bakeCache.set(key, parts);
    }
    for (const p of parts) {
      const m = new THREE.Mesh(p.geometry, p.material);
      m.castShadow = p.cast;
      g.add(m);
    }
  }
  // Facteur de normalisation par type et par origine (GLB / procédural) : les tailles naturelles diffèrent.
  const fk = nounId + (glb ? ':glb' : ':proc');
  let f = fitCache.get(fk);
  if (f === undefined) {
    const b = new THREE.Box3().setFromObject(g);
    const sz = b.getSize(new THREE.Vector3());
    f = Math.min(1.25 / Math.max(sz.x, sz.z, 0.01), 1.5 / Math.max(sz.y, 0.01));
    fitCache.set(fk, f);
  }
  g.scale.setScalar(f);
  g.userData.noun = nounId;
  return g;
}

// Placement de count éléments dans un carré de côté `size`.
export function layoutItems(count, size) {
  const inner = size - 1.0;
  const cols = count === 1 ? 1 : Math.ceil(Math.sqrt(count * 1.1));
  const rows = Math.ceil(count / cols);
  const cell = inner / Math.max(cols, rows);
  const scale = Math.min(2.0, cell / 1.3);
  const out = [];
  for (let r = 0; r < rows; r++) {
    const inRow = Math.min(cols, count - r * cols);
    for (let c = 0; c < inRow; c++) {
      out.push({
        x: (c - (inRow - 1) / 2) * cell,
        z: (r - (rows - 1) / 2) * cell,
        scale,
      });
    }
  }
  return out;
}

const texMats = new Map();
function texMat(key, map, roughness) {
  if (!texMats.has(key)) texMats.set(key, new THREE.MeshStandardMaterial({ map, roughness }));
  return texMats.get(key);
}

// Îlot : planche de bois + pelouse + volume de toucher invisible et généreux.
export function createIsland(size, tint = 0x7ccf5a) {
  const group = new THREE.Group();
  const wood = texture('bois');
  const grass = texture('herbe');
  // Matériaux d'îlot partagés (jamais disposés avec un îlot : ils servent aux suivants).
  const baseMat = wood ? texMat('wood', wood, 0.8) : mat(0xc98a4b);
  const topMat = grass ? texMat('grass', grass, 0.9) : mat(tint);
  const base = new THREE.Mesh(rbox(size, 0.3, size, 0.12), baseMat);
  base.position.y = 0.15;
  base.receiveShadow = true;
  group.add(base);
  const top = new THREE.Mesh(rbox(size - 0.4, 0.12, size - 0.4, 0.05), topMat);
  top.position.y = 0.3;
  top.receiveShadow = true;
  group.add(top);
  const hit = new THREE.Mesh(geo(`h${size}`, () => new THREE.BoxGeometry(size + 0.4, 3, size + 0.4)), mat(0xffffff));
  hit.position.y = 1.5;
  hit.visible = false;
  group.add(hit);
  const content = new THREE.Group();
  group.add(content);
  return { group, hit, content, size, items: [] };
}

// Facteur de taille des petits modèles pour rester lisibles dans les groupes.
const MODEL_SCALE = { apple: 0.78, orange: 0.78, strawberry: 0.78, pear: 0.85, lemon: 0.85, cherry: 0.9, banana: 1.1 };

// Remplit un îlot avec count modèles ; retourne la liste des éléments animables.
export function fillIsland(island, target) {
  island.content.clear();
  island.items = [];
  const spots = layoutItems(target.count, island.size);
  spots.forEach((s, i) => {
    const wrap = new THREE.Group();
    wrap.position.set(s.x, ISLAND_TOP, s.z);
    wrap.rotation.y = ((i % 3) - 1) * 0.25;
    wrap.add(createModel(target.noun, target.color, target.count >= 5 ? 1 : 0));
    const sc = s.scale * (MODEL_SCALE[target.noun] || 1);
    wrap.userData.baseScale = sc;
    wrap.scale.setScalar(sc);
    island.content.add(wrap);
    island.items.push(wrap);
  });
  return island.items;
}

// Anneau lumineux autour d'un îlot (indice après deux erreurs).
export function createHalo(size) {
  // Seul objet GPU propre à un îlot : son matériau (le halo est retiré puis ce matériau est libéré, cf. main.js).
  const m = new THREE.MeshBasicMaterial({ color: 0xffeb3b, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(geo(`halo${size}`, () => new THREE.RingGeometry((size / 2 + 0.1) * Math.SQRT2, (size / 2 + 0.4) * Math.SQRT2, 4, 1, Math.PI / 4, Math.PI * 2)), m);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.04;
  return ring;
}
