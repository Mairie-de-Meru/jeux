// Formes 3D partagées, matériaux par couleur, textures optionnelles avec repli.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { COLORS } from './logic/shapes.mjs';

const SHARED = new Set();
export function shared(x) { SHARED.add(x); return x; }

export const GEO = {
  cube: shared(new RoundedBoxGeometry(1, 1, 1, 4, 0.12)),
  pave: shared(new RoundedBoxGeometry(1.5, 0.8, 0.8, 4, 0.1)),
  cylindre: shared(new THREE.CylinderGeometry(0.5, 0.5, 1, 32)),
  cone: shared(new THREE.ConeGeometry(0.5, 1, 32)),
  sphere: shared(new THREE.SphereGeometry(0.5, 32, 20)),
  pyramide: shared(new THREE.ConeGeometry(0.7071, 1, 4).rotateY(Math.PI / 4)),
  prisme: shared(new THREE.CylinderGeometry(0.6, 0.6, 1, 3)),
};
// Hauteur et rayon englobant (formes de taille ~1).
const HEIGHT = { cube: 1, pave: 0.8, cylindre: 1, cone: 1, sphere: 1, pyramide: 1, prisme: 1 };
const RADIUS = { cube: 0.75, pave: 0.9, cylindre: 0.6, cone: 0.6, sphere: 0.55, pyramide: 0.75, prisme: 0.65 };
export const shapeHeight = (id) => HEIGHT[id];
export const shapeRadius = (id) => RADIUS[id];

export const GREY = 0xc9ced6;
const matCache = new Map();
export function materialFor(hex) {
  let m = matCache.get(hex);
  if (!m) {
    m = shared(new THREE.MeshStandardMaterial({ color: hex, roughness: 0.45, metalness: 0 }));
    matCache.set(hex, m);
  }
  return m;
}
export const colorHex = (colorId) => COLORS[colorId].hex;

export function makeShape(shapeId, hex) {
  const mesh = new THREE.Mesh(GEO[shapeId], materialFor(hex));
  mesh.castShadow = true;
  mesh.userData.shape = shapeId;
  return mesh;
}

export function disposeTree(obj) {
  obj.traverse((o) => {
    if (o.geometry && !SHARED.has(o.geometry)) o.geometry.dispose();
    const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
    for (const m of mats) {
      if (SHARED.has(m)) continue;
      if (m.map && !SHARED.has(m.map)) m.map.dispose();
      m.dispose();
    }
  });
}

// Images présentes, listées dans assets/img/manifest.json (évite les 404 en console).
let manifeste = null;
function imagesPresentes() {
  manifeste ??= fetch('assets/img/manifest.json')
    .then((r) => (r.ok ? r.json() : []))
    .then((liste) => new Set(liste.map((f) => `assets/img/${f}`)))
    .catch(() => new Set());
  return manifeste;
}

// Charge une image sans bruit : résout null si absente.
export async function probeImage(url) {
  if (!(await imagesPresentes()).has(url)) return null;
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export async function loadTexture(url) {
  const img = await probeImage(url);
  if (!img) return null;
  const t = new THREE.Texture(img);
  t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return shared(t);
}

export const textures = { bois: null, tapis: null };
export function initTextures() {
  return Promise.all([
    loadTexture('assets/img/bois.jpg').then((t) => { textures.bois = t; }),
    loadTexture('assets/img/tapis.jpg').then((t) => { textures.tapis = t; }),
  ]);
}
