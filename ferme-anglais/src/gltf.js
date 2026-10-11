// Chargement des modèles GLB (Kenney, CC0) : manifeste explicite, aucune requête hors manifeste.
// Chaque échec est toléré (console.warn) : createModel retombe alors sur le modèle procédural.
// Paramètre d'URL ?proc : désactive les GLB partout (comparaison).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { MODEL_MANIFEST } from './glbpick.js';

export const FORCE_PROC = typeof location !== 'undefined' && new URLSearchParams(location.search).has('proc');

const templates = new Map(); // id → { root, skinned }
const sharedByDir = new Map(); // dossier → matériau partagé (une seule colormap par kit)
let loading = null;

const _box = new THREE.Box3();
const _c = new THREE.Vector3();

function prepare(id, entry, gltf) {
  const scene = gltf.scene;
  let skinned = false;
  scene.traverse((o) => {
    if (o.isSkinnedMesh) skinned = true;
    if (!o.isMesh) return;
    o.castShadow = true;
    // Un seul matériau (et une seule texture) par kit : les GLB d'un même kit partagent la colormap.
    const m = o.material;
    if (m.map && m.map.colorSpace !== THREE.SRGBColorSpace) {
      m.map.colorSpace = THREE.SRGBColorSpace;
      m.needsUpdate = true;
    }
    // dir null (kit Quaternius / Poly by Google) : matériaux d'origine conservés, partagés par les clones du gabarit.
    if (!entry.dir) {
      // Les GLB Quaternius ont metalness 0,4 sans environnement : rendu terne et gris. Matière mate, éclaircie si demandé.
      if (!m.userData.tuned) {
        m.userData.tuned = true;
        m.metalness = 0;
        m.roughness = 0.85;
        if (entry.bright) m.color.setScalar(entry.bright);
        m.needsUpdate = true;
      }
      return;
    }
    const shared = sharedByDir.get(entry.dir);
    if (!shared) sharedByDir.set(entry.dir, m);
    else if (shared !== m) {
      if (m.map && m.map !== shared.map) m.map.dispose();
      m.dispose();
      o.material = shared;
    }
  });
  // Modèles animés : pose « Idle » (première image) appliquée une fois, sans jouer l'animation.
  if (skinned && gltf.animations.length) {
    const idle = gltf.animations.find((a) => /idle$/i.test(a.name)) || gltf.animations[0];
    const mixer = new THREE.AnimationMixer(scene);
    mixer.clipAction(idle).play();
    mixer.update(0);
    mixer.stopAllAction();
  }
  // Pose au sol (min y = 0), centré en x/z ; les modèles (Cube Pets, Quaternius, canard) regardent déjà vers +z.
  scene.updateMatrixWorld(true);
  _box.setFromObject(scene);
  _box.getCenter(_c);
  scene.position.set(-_c.x, -_box.min.y, -_c.z);
  const root = new THREE.Group();
  root.add(scene);
  templates.set(id, { root, skinned });
}

async function loadAll() {
  const loader = new GLTFLoader();
  await Promise.all(
    Object.entries(MODEL_MANIFEST).map(async ([id, entry]) => {
      try {
        prepare(id, entry, await loader.loadAsync(entry.url));
      } catch (err) {
        console.warn(`[gltf] modèle ${id} indisponible, repli procédural`, err);
      }
    }),
  );
  return templates;
}

// Lance le chargement (une seule fois). Ne rejette jamais.
export function preloadModels() {
  if (!loading) loading = FORCE_PROC ? Promise.resolve(templates) : loadAll().catch((e) => { console.warn('[gltf]', e); return templates; });
  return loading;
}

export function hasModel(id) {
  return templates.has(id);
}

// Nouvelle instance (géométries et matériaux partagés avec le gabarit) ou null si absent.
export function instantiate(id) {
  const t = templates.get(id);
  if (!t) return null;
  return t.skinned ? cloneSkinned(t.root) : t.root.clone(true);
}
