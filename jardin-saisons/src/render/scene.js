import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { SEASON_INFO } from '../logic/seasons.js';
import { lerp } from './ease.js';

const mats = new Map();
export function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!mats.has(key)) mats.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0, ...opts }));
  return mats.get(key);
}

export const PLOT_POS = new THREE.Vector3(0.6, 0, 0.6);
export const TREE_POS = new THREE.Vector3(-3.1, 0, -1.4);
const GROUND_COLORS = { printemps: '#7fd35a', ete: '#5fc24a', automne: '#b8c24a', hiver: '#e9f1f8' };
const FOLIAGE_COLORS = { printemps: '#8fdc6a', ete: '#3fae45', automne: '#e8782a', hiver: '#4f8f4a' };

export function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);

  // Ciel dégradé (texture canvas)
  const skyCanvas = document.createElement('canvas');
  skyCanvas.width = 2; skyCanvas.height = 128;
  const skyCtx = skyCanvas.getContext('2d');
  const skyTex = new THREE.CanvasTexture(skyCanvas);
  skyTex.colorSpace = THREE.SRGBColorSpace;
  scene.background = skyTex;
  const skyCur = [new THREE.Color(), new THREE.Color()];
  const skyTgt = [new THREE.Color(), new THREE.Color()];
  function paintSky() {
    const g = skyCtx.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0, '#' + skyCur[0].getHexString());
    g.addColorStop(1, '#' + skyCur[1].getHexString());
    skyCtx.fillStyle = g; skyCtx.fillRect(0, 0, 2, 128);
    skyTex.needsUpdate = true;
  }

  // Lumières
  const hemi = new THREE.HemisphereLight(0xdff3ff, 0x8a7a55, 1.1);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 2.1);
  sun.position.set(5, 9, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  const sc = sun.shadow.camera;
  sc.left = -8; sc.right = 8; sc.top = 8; sc.bottom = -8; sc.near = 1; sc.far = 30;
  sun.shadow.radius = 4;
  scene.add(sun);

  // Sol arrondi
  const garden = new THREE.Group();
  scene.add(garden);
  const groundMat = new THREE.MeshStandardMaterial({ color: GROUND_COLORS.printemps, roughness: 0.9 });
  const ground = new THREE.Mesh(new RoundedBoxGeometry(11, 0.8, 7.6, 4, 0.35), groundMat);
  ground.position.y = -0.4; ground.receiveShadow = true;
  garden.add(ground);
  const rim = new THREE.Mesh(new RoundedBoxGeometry(11.3, 0.7, 7.9, 4, 0.35), mat('#9a6a3c'));
  rim.position.y = -0.75; rim.receiveShadow = true;
  garden.add(rim);

  // Carré de terre (au centre, devant)
  const soil = new THREE.Mesh(new RoundedBoxGeometry(2.6, 0.3, 2.6, 4, 0.12), mat('#7b4a2a'));
  soil.position.set(PLOT_POS.x, 0.1, PLOT_POS.z);
  soil.castShadow = true; soil.receiveShadow = true;
  garden.add(soil);
  const edge = new THREE.Mesh(new RoundedBoxGeometry(2.9, 0.22, 2.9, 4, 0.1), mat('#c98a4b'));
  edge.position.set(PLOT_POS.x, 0.03, PLOT_POS.z);
  edge.receiveShadow = true;
  garden.add(edge);

  // Petit arbre
  const tree = new THREE.Group();
  tree.position.copy(TREE_POS);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, 1.8, 12), mat('#8a5a34'));
  trunk.position.y = 0.9; trunk.castShadow = true;
  tree.add(trunk);
  const foliageMat = new THREE.MeshStandardMaterial({ color: FOLIAGE_COLORS.printemps, roughness: 0.8 });
  const crown = new THREE.Group();
  const blob = new THREE.SphereGeometry(1, 20, 16);
  [[0, 2.6, 0, 1.25], [-0.85, 2.2, 0.2, 0.85], [0.85, 2.25, -0.1, 0.9], [0.1, 3.2, 0.1, 0.8]].forEach(([x, y, z, s]) => {
    const m = new THREE.Mesh(blob, foliageMat); m.position.set(x, y, z); m.scale.setScalar(s); m.castShadow = true; crown.add(m);
  });
  tree.add(crown);
  // branches nues (visibles surtout en hiver)
  const branches = new THREE.Group();
  const bgeo = new THREE.CylinderGeometry(0.06, 0.1, 1.3, 8);
  [[-0.55, 2.1, 0, 0.9], [0.55, 2.2, 0, -0.9], [0, 2.9, 0, 0.1], [0.2, 2.4, 0.4, 0.5]].forEach(([x, y, z, r]) => {
    const b = new THREE.Mesh(bgeo, mat('#8a5a34')); b.position.set(x, y, z); b.rotation.z = r; b.castShadow = true; branches.add(b);
  });
  tree.add(branches);
  garden.add(tree);

  // Transitions de saison
  let season = 'printemps';
  const groundTgt = new THREE.Color(GROUND_COLORS.printemps);
  const foliageTgt = new THREE.Color(FOLIAGE_COLORS.printemps);
  let crownScaleTgt = 1, crownScale = 1;
  function setSeason(s, instant = false) {
    season = s;
    const info = SEASON_INFO[s];
    groundTgt.set(GROUND_COLORS[s]);
    foliageTgt.set(FOLIAGE_COLORS[s]);
    skyTgt[0].set(info.sky[0]); skyTgt[1].set(info.sky[1]);
    crownScaleTgt = s === 'hiver' ? 0.001 : 1;
    sun.intensity = s === 'hiver' ? 1.6 : s === 'ete' ? 2.4 : 2.0;
    if (instant) {
      groundMat.color.copy(groundTgt); foliageMat.color.copy(foliageTgt);
      skyCur[0].copy(skyTgt[0]); skyCur[1].copy(skyTgt[1]);
      crownScale = crownScaleTgt; paintSky();
    }
  }
  setSeason('printemps', true);

  function update(dt) {
    const k = 1 - Math.exp(-dt * 3);
    groundMat.color.lerp(groundTgt, k);
    foliageMat.color.lerp(foliageTgt, k);
    crownScale = lerp(crownScale, crownScaleTgt, 1 - Math.exp(-dt * 4));
    crown.scale.setScalar(Math.max(crownScale, 0.001));
    crown.visible = crownScale > 0.02;
    branches.visible = season === 'hiver' || crownScale < 0.9;
    const dc = (a, b) => Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b);
    const d = dc(skyCur[0], skyTgt[0]) + dc(skyCur[1], skyTgt[1]);
    if (d > 0.003) { skyCur[0].lerp(skyTgt[0], k); skyCur[1].lerp(skyTgt[1], k); paintSky(); }
  }

  // Cadrage : tout le jardin visible en 16:9 comme en portrait
  function fit() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    const aspect = w / h;
    camera.aspect = aspect;
    const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const needW = 12.6, needH = 9.8;
    const d = Math.max(needW / (2 * t * aspect), needH / (2 * t)) * 1.0;
    const dir = new THREE.Vector3(0, 0.62, 1).normalize();
    // cible légèrement vers le bas : le jardin remonte, de la place pour les boutons du bas
    const target = new THREE.Vector3(0, 0.5, 0.9);
    camera.position.copy(target).addScaledVector(dir, d);
    camera.lookAt(target);
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', fit);
  window.addEventListener('orientationchange', fit);
  fit();

  return {
    THREE, renderer, scene, camera, garden, tree, crown, setSeason, update, fit,
    get season() { return season; },
    render() { renderer.render(scene, camera); },
  };
}
