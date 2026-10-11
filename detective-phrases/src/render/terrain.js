// Terrain : relief sculpté (logic/relief.mjs), chemins vers les maisons, place pavée, mare,
// ciel panoramique et décor tiré du kit de sprites RunningHub. Repli : couleurs unies.
import * as THREE from 'three';
import { hauteur, distanceVillage } from '../logic/relief.mjs';
import { creerRng } from '../logic/rng.mjs';
import { MAISONS, creerBoiteAuxLettres } from './ville.js';
import { VILLAGE } from '../logic/village.mjs';

const TAILLE = 110;
const SEG = 120;
const MARE = { x: 0.5, z: -4.8, r: 1.1 };

const decale = (n) => ({ polygonOffset: true, polygonOffsetFactor: -n, polygonOffsetUnits: -n });
export const MAT = {
  herbe: new THREE.MeshStandardMaterial({ color: 0x8fe388, roughness: 0.95 }),
  chemin: new THREE.MeshStandardMaterial({ color: 0xf3d9a4, roughness: 0.9, ...decale(2) }),
  paves: new THREE.MeshStandardMaterial({ color: 0xc9d3e0, roughness: 0.85, ...decale(4) }),
  eau: new THREE.MeshStandardMaterial({ color: 0x7fd6ff, roughness: 0.15, metalness: 0.1, ...decale(4) }),
  ciel: new THREE.MeshBasicMaterial({ color: 0xbfe6ff, side: THREE.BackSide, fog: false, depthWrite: false }),
};

// Multiplie les UV d'une géométrie (les textures restent en répétition 1×1).
function echelleUV(geo, su, sv = su) {
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
  return geo;
}

function plat(geo, materiau, y) {
  const m = new THREE.Mesh(geo.rotateX(-Math.PI / 2), materiau);
  m.position.y = y;
  m.receiveShadow = true;
  return m;
}

// Point du repère local d'une maison (façade en z > 0) exprimé dans le monde.
const enMonde = (def, lx, lz) => new THREE.Vector3(
  def.pos[0] + lx * Math.cos(def.rot) + lz * Math.sin(def.rot), 0,
  def.pos[2] - lx * Math.sin(def.rot) + lz * Math.cos(def.rot),
);
export const devantPorte = (def, recul = 1.7) => enMonde(def, 0.55, recul);

// Segments des chemins (place → porte de chaque maison, et allée vers l'avant).
const SEGMENTS = [
  ...MAISONS.map((def) => [new THREE.Vector3(0, 0, 0), devantPorte(def)]),
  [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 7)],
];

function distanceSegment(p, a, b) {
  const ab = b.clone().sub(a);
  const t = Math.min(1, Math.max(0, p.clone().sub(a).dot(ab) / ab.lengthSq()));
  return p.distanceTo(a.clone().addScaledVector(ab, t));
}

export function creerTerrain() {
  const g = new THREE.Group();
  const geo = new THREE.PlaneGeometry(TAILLE, TAILLE, SEG, SEG).rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setY(i, hauteur(pos.getX(i), pos.getZ(i)));
  geo.computeVertexNormals();
  echelleUV(geo, TAILLE / 2.6);
  const sol = new THREE.Mesh(geo, MAT.herbe);
  sol.receiveShadow = true;
  g.add(sol);

  for (const [a, b] of SEGMENTS) {
    const L = a.distanceTo(b);
    const bande = plat(echelleUV(new THREE.PlaneGeometry(1.2, L), 1, L / 1.2), MAT.chemin, 0.01);
    bande.position.x = (a.x + b.x) / 2;
    bande.position.z = (a.z + b.z) / 2;
    bande.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
    g.add(bande);
    const bout = plat(echelleUV(new THREE.CircleGeometry(0.6, 20), 0.6), MAT.chemin, 0.01);
    bout.position.copy(b).setY(0.01);
    g.add(bout);
  }
  g.add(plat(echelleUV(new THREE.CircleGeometry(2.2, 48), 2.4), MAT.paves, 0.015));
  const mare = plat(echelleUV(new THREE.CircleGeometry(MARE.r, 40), 1.4), MAT.eau, 0.015);
  mare.position.set(MARE.x, 0.015, MARE.z);
  g.add(mare);
  return g;
}

// Ciel : demi-cylindre derrière la ville (image en miroir pour éviter un raccord visible).
export function creerCiel() {
  const geo = new THREE.CylinderGeometry(80, 80, 58, 48, 1, true, Math.PI * 0.35, Math.PI * 1.3);
  const m = new THREE.Mesh(geo, MAT.ciel);
  m.position.y = 58 / 2 - 6;
  m.renderOrder = -1;
  return m;
}

// Kit de décor : grille 3×3, une case par objet ; hauteur en unités monde.
const DECOR = [
  ['fleurs', 0.55], ['buisson', 0.85], ['rochers', 0.55],
  ['barriere', 0.65], ['lampadaire', 1.9], ['boite', 1.0],
  ['citrouille', 0.5], ['banc', 0.7], ['herbes', 0.6],
];

// Découpe chaque case au plus près de son contenu opaque.
function decouperKit(img) {
  const cote = Math.floor(img.width / 3);
  const tmp = document.createElement('canvas');
  tmp.width = tmp.height = cote;
  const ctx = tmp.getContext('2d', { willReadFrequently: true });
  const res = {};
  DECOR.forEach(([nom], i) => {
    ctx.clearRect(0, 0, cote, cote);
    ctx.drawImage(img, (i % 3) * cote, Math.floor(i / 3) * cote, cote, cote, 0, 0, cote, cote);
    const d = ctx.getImageData(0, 0, cote, cote).data;
    let x0 = cote, y0 = cote, x1 = -1, y1 = -1;
    for (let y = 0; y < cote; y++) {
      for (let x = 0; x < cote; x++) {
        if (d[(y * cote + x) * 4 + 3] > 60) {
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
      }
    }
    if (x1 < 0) return;
    const c = document.createElement('canvas');
    c.width = x1 - x0 + 1;
    c.height = y1 - y0 + 1;
    c.getContext('2d').drawImage(tmp, x0, y0, c.width, c.height, 0, 0, c.width, c.height);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    res[nom] = new THREE.SpriteMaterial({ map: tex, alphaTest: 0.35 });
  });
  return res;
}

const HAUT = Object.fromEntries(DECOR);

// Les sprites ne portent pas d'ombre : on pose au sol leur silhouette assombrie, étirée à
// l'opposé du soleil (scene.js : soleil en (6, 11, 7)), pour les ancrer dans le terrain.
const SOLEIL = new THREE.Vector3(6, 11, 7);
const LONG_OMBRE = Math.hypot(SOLEIL.x, SOLEIL.z) / SOLEIL.y;
const ANGLE_OMBRE = Math.atan2(SOLEIL.x, SOLEIL.z);
const GEO_OMBRE = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0).rotateX(-Math.PI / 2);
const matsOmbre = new Map();
function matOmbre(m) {
  if (!matsOmbre.has(m)) {
    matsOmbre.set(m, new THREE.MeshBasicMaterial({
      color: 0x1f3a24, map: m.map, transparent: true, opacity: 0.3, depthWrite: false, ...decale(3),
    }));
  }
  return matsOmbre.get(m);
}

function sprite(mats, nom, x, z, s = 1) {
  const m = mats[nom];
  if (!m) return null;
  const g = new THREE.Group();
  const sp = new THREE.Sprite(m);
  const h = HAUT[nom] * s;
  const img = m.map.image;
  const l = h * img.width / img.height;
  sp.scale.set(l, h, 1);
  sp.center.set(0.5, 0.04);
  const ombre = new THREE.Mesh(GEO_OMBRE, matOmbre(m));
  ombre.scale.set(l, 1, h * LONG_OMBRE);
  ombre.rotation.y = ANGLE_OMBRE;
  ombre.position.y = 0.02;
  g.add(ombre, sp);
  g.position.set(x, hauteur(x, z), z);
  return g;
}

// Places fixes dans le village, puis touffes semées (graine fixe) sur les collines.
export function creerDecor(img) {
  const mats = decouperKit(img);
  const g = new THREE.Group();
  const places = [
    ['lampadaire', -2.5, 1.9], ['lampadaire', 2.5, 1.9], ['lampadaire', 1.9, -2.4],
    ['banc', -1.7, -2.6], ['rochers', -0.85, -5.5], ['rochers', 1.8, -5.3, 0.8],
    ['citrouille', -6.1, 0.5], ['citrouille', 6.0, 2.1, 1.2],
    ['barriere', -6.6, 6.2], ['barriere', -5.4, 6.45], ['barriere', 5.4, 6.45], ['barriere', 6.6, 6.2],
  ];
  MAISONS.forEach((def) => {
    const b = enMonde(def, 1.55, 1.45);
    const f = enMonde(def, -0.7, 1.45);
    const boite = creerBoiteAuxLettres();
    boite.position.copy(b);
    boite.rotation.y = def.rot;
    g.add(boite);
    places.push(['fleurs', f.x, f.z]);
  });
  for (const [nom, x, z, s] of places) {
    const sp = sprite(mats, nom, x, z, s);
    if (sp) g.add(sp);
  }
  const rng = creerRng(7);
  const libre = (p) => MAISONS.every((d) => Math.hypot(p.x - d.pos[0], p.z - d.pos[2]) > 2.8)
    && Math.hypot(p.x, p.z) > 2.8
    && VILLAGE.every((b) => Math.hypot(p.x - b.x, p.z - b.z) > b.r + 0.4)
    && Math.hypot(p.x - MARE.x, p.z - MARE.z) > MARE.r + 0.5
    && SEGMENTS.every(([a, b]) => distanceSegment(p, a, b) > 1.0);
  let poses = 0;
  for (let essai = 0; essai < 900 && poses < 130; essai++) {
    const a = rng() * Math.PI * 2, r = 4 + rng() * 32;
    const p = new THREE.Vector3(Math.sin(a) * r * 1.25, 0, Math.cos(a) * r);
    if (!libre(p) || distanceVillage(p.x, p.z) > 38) continue;
    const nom = rng() < 0.55 ? 'herbes' : rng() < 0.6 ? 'fleurs' : rng() < 0.6 ? 'buisson' : 'rochers';
    const sp = sprite(mats, nom, p.x, p.z, 0.8 + rng() * 0.6);
    if (sp) { g.add(sp); poses++; }
  }
  return g;
}

// Charge le kit (textures de matériaux, ciel, décor). Chaque image manquante garde son repli.
export async function chargerKit(scene, urlImage, appliquerTextures) {
  const charge = new THREE.TextureLoader();
  const tex = (nom) => {
    const url = urlImage(nom);
    if (!url) return Promise.resolve(null);
    return charge.loadAsync(url).then((t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = 4;
      return t;
    }).catch(() => null);
  };
  const noms = ['herbe', 'chemin', 'paves', 'eau', 'mur', 'tuiles', 'bois', 'ecorce', 'feuillage'];
  const liste = await Promise.all(noms.map((n) => tex(`tex-${n}.jpg`)));
  const textures = Object.fromEntries(noms.map((n, i) => [n, liste[i]]));
  for (const n of ['herbe', 'chemin', 'paves', 'eau']) {
    if (!textures[n]) continue;
    MAT[n].map = textures[n];
    MAT[n].color.set(0xffffff);
    MAT[n].needsUpdate = true;
  }
  appliquerTextures(textures);
  const ciel = await tex('ciel.jpg');
  if (ciel) {
    ciel.wrapS = THREE.MirroredRepeatWrapping;
    ciel.repeat.x = 2;
    MAT.ciel.map = ciel;
    MAT.ciel.color.set(0xffffff);
    MAT.ciel.needsUpdate = true;
  }
  const url = urlImage('decor.png');
  if (url) {
    const img = await new Promise((ok) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => ok(null);
      i.src = url;
    });
    if (img) scene.add(creerDecor(img));
  }
  return textures;
}
