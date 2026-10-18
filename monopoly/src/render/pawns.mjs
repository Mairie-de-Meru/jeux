// Pions originaux faits de primitives : voiture, chien, chat, bateau, avion, fusée.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export const PAWNS = [
  { id: 'car', emoji: '🚗', label: 'Voiture' },
  { id: 'dog', emoji: '🐶', label: 'Chien' },
  { id: 'cat', emoji: '🐱', label: 'Chat' },
  { id: 'boat', emoji: '⛵', label: 'Bateau' },
  { id: 'plane', emoji: '✈️', label: 'Avion' },
  { id: 'rocket', emoji: '🚀', label: 'Fusée' },
];

const geo = {
  box: (w, h, d, r = 0.06) => new RoundedBoxGeometry(w, h, d, 3, r),
  sph: (r) => new THREE.SphereGeometry(r, 20, 14),
  cyl: (rt, rb, h, s = 18) => new THREE.CylinderGeometry(rt, rb, h, s),
  cone: (r, h, s = 16) => new THREE.ConeGeometry(r, h, s),
  cap: (r, l) => new THREE.CapsuleGeometry(r, l, 6, 14),
};
const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.05, ...extra });

export function createPawn(type, color) {
  const g = new THREE.Group();
  const main = mat(color); const white = mat('#ffffff'); const dark = mat('#2b3a55'); const accent = mat('#ffd23f');
  const add = (geom, m, x = 0, y = 0, z = 0, rot) => {
    const o = new THREE.Mesh(geom, m); o.position.set(x, y, z); if (rot) o.rotation.set(...rot); o.castShadow = true; g.add(o); return o;
  };
  const base = add(geo.cyl(0.46, 0.5, 0.1), mat(new THREE.Color(color).multiplyScalar(0.7)), 0, 0.05, 0); base.userData.base = true;
  base.castShadow = false;
  switch (type) {
    case 'car':
      add(geo.box(0.95, 0.3, 0.52), main, 0, 0.3, 0);
      add(geo.box(0.5, 0.26, 0.46), white, -0.05, 0.56, 0);
      for (const [x, z] of [[-0.3, 0.27], [0.3, 0.27], [-0.3, -0.27], [0.3, -0.27]]) add(geo.cyl(0.13, 0.13, 0.1), dark, x, 0.2, z, [Math.PI / 2, 0, 0]);
      add(geo.sph(0.06), accent, 0.47, 0.32, 0.16); add(geo.sph(0.06), accent, 0.47, 0.32, -0.16);
      break;
    case 'dog':
      add(geo.cap(0.2, 0.4), main, 0, 0.48, 0, [0, 0, Math.PI / 2]);
      add(geo.sph(0.22), main, 0.42, 0.72, 0);
      add(geo.sph(0.1), white, 0.62, 0.68, 0); add(geo.sph(0.04), dark, 0.7, 0.7, 0);
      add(geo.box(0.1, 0.22, 0.12, 0.04), dark, 0.38, 0.78, 0.2, [0.3, 0, 0]); add(geo.box(0.1, 0.22, 0.12, 0.04), dark, 0.38, 0.78, -0.2, [-0.3, 0, 0]);
      for (const [x, z] of [[-0.25, 0.12], [0.2, 0.12], [-0.25, -0.12], [0.2, -0.12]]) add(geo.cyl(0.06, 0.06, 0.3), white, x, 0.25, z);
      add(geo.cyl(0.04, 0.05, 0.3), main, -0.42, 0.65, 0, [0, 0, 0.9]);
      break;
    case 'cat':
      add(geo.sph(0.3), main, -0.05, 0.4, 0); g.children[g.children.length - 1].scale.set(1.15, 1, 0.9);
      add(geo.sph(0.22), main, 0.28, 0.72, 0);
      add(geo.cone(0.08, 0.2, 4), main, 0.28, 0.98, 0.12); add(geo.cone(0.08, 0.2, 4), main, 0.28, 0.98, -0.12);
      add(geo.sph(0.03), dark, 0.47, 0.76, 0.08); add(geo.sph(0.03), dark, 0.47, 0.76, -0.08); add(geo.sph(0.03), mat('#f48fb1'), 0.5, 0.7, 0);
      add(new THREE.TorusGeometry(0.2, 0.05, 8, 18, Math.PI * 1.2), main, -0.38, 0.55, 0, [0, 0, 0.6]);
      break;
    case 'boat':
      add(geo.box(1.0, 0.24, 0.5, 0.1), main, 0, 0.22, 0); add(geo.cone(0.25, 0.3, 4), main, 0.55, 0.22, 0, [0, 0, -Math.PI / 2]);
      add(geo.cyl(0.03, 0.03, 0.9), dark, 0, 0.8, 0);
      { const sail = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.7, 3), white); sail.scale.set(1, 1, 0.1); sail.position.set(0.05, 0.85, 0); sail.rotation.y = Math.PI / 2; sail.rotation.z = 0; sail.castShadow = true; g.add(sail); }
      add(geo.sph(0.07), accent, 0, 1.28, 0);
      break;
    case 'plane':
      add(geo.cap(0.17, 0.6), white, 0, 0.55, 0, [0, 0, Math.PI / 2]);
      add(geo.box(0.34, 0.05, 1.1, 0.02), main, 0.05, 0.55, 0);
      add(geo.box(0.2, 0.05, 0.45, 0.02), main, -0.4, 0.58, 0); add(geo.box(0.2, 0.3, 0.05, 0.02), main, -0.42, 0.72, 0);
      add(geo.box(0.04, 0.38, 0.06, 0.01), dark, 0.55, 0.55, 0); add(geo.sph(0.1), accent, 0.5, 0.58, 0);
      add(geo.cyl(0.03, 0.03, 0.3), dark, 0, 0.3, 0);
      break;
    case 'rocket':
      add(geo.cyl(0.2, 0.2, 0.7), white, 0, 0.6, 0); add(geo.cone(0.2, 0.35), main, 0, 1.12, 0);
      add(geo.sph(0.09), mat('#8fd3f4'), 0.18, 0.7, 0);
      for (let k = 0; k < 3; k++) { const a = (k * 2 * Math.PI) / 3; add(geo.box(0.05, 0.3, 0.22, 0.02), main, Math.cos(a) * 0.22, 0.38, Math.sin(a) * 0.22, [0, -a, 0]); }
      add(geo.cone(0.1, 0.22), mat('#ff9a2e'), 0, 0.15, 0, [Math.PI, 0, 0]);
      break;
  }
  g.scale.setScalar(0.9);
  return g;
}

// Modèles CC0 optionnels (Kenney) : remplacent la primitive quand le fichier est chargé, sinon on garde la primitive.
const MODELS = { car: { url: './assets/models/voiture.glb', scale: 1.05, rotY: Math.PI / 2, y: 0.1 } };
const modelCache = {};
function loadModel(type) {
  const d = MODELS[type]; if (!d) return Promise.resolve(null);
  return (modelCache[type] ||= new Promise((res) => new GLTFLoader().load(d.url, (g) => res(g.scene), undefined, () => res(null))));
}
// Teinte la carrosserie du modèle GLB (texels saturés de la palette) à la couleur du joueur ; gris, noir et blanc (roues, vitres) restent intacts.
function tintedMaterial(src, color) {
  const m = src.clone(); const tint = new THREE.Color(color);
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTint = { value: tint };
    sh.fragmentShader = 'uniform vec3 uTint;\n' + sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
      { vec3 c = diffuseColor.rgb; float mx = max(max(c.r, c.g), c.b); float mn = min(min(c.r, c.g), c.b);
        float k = smoothstep(0.25, 0.45, (mx - mn) / max(mx, 0.001));
        float l = dot(c, vec3(0.299, 0.587, 0.114)); float tl = max(dot(uTint, vec3(0.299, 0.587, 0.114)), 0.001);
        diffuseColor.rgb = mix(c, clamp(uTint * (l / tl), 0.0, 1.0), k); }`);
  };
  m.customProgramCacheKey = () => 'pawn-tint';
  return m;
}
// Remplace les primitives par le modèle GLB (si présent) ; renvoie une promesse (vrai si remplacé).
export function upgradePawn(group, type, color) {
  return loadModel(type).then((src) => {
    if (!src) return false;
    const d = MODELS[type]; const m = src.clone(true); m.scale.setScalar(d.scale); m.rotation.y = d.rotY; m.position.y = d.y;
    const tints = new Map();
    m.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true; o.userData.sharedGeo = true;
      if (color) { if (!tints.has(o.material)) tints.set(o.material, tintedMaterial(o.material, color)); o.material = tints.get(o.material); }
    });
    for (const c of [...group.children]) if (c.userData.base !== true) { group.remove(c); c.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } }); }
    group.add(m);
    return true;
  }).catch(() => false);
}
