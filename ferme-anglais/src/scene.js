// Renderer, caméra, lumières, décor de ferme, placement et cadrage des îlots.
import * as THREE from 'three';
import { getTexture } from './models.js';
import { imageUrl } from './assets.js';

const ELEVATION = THREE.MathUtils.degToRad(58);

function skyTexture() {
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 256;
  const ctx = c.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#6ec6ff');
  grad.addColorStop(0.6, '#bfeaff');
  grad.addColorStop(1, '#e6f7d0');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Matériaux et géométries du décor partagés (un par couleur / par dimension).
const decorMats = new Map();
const decorGeos = new Map();
function box(w, h, d, hex, cast = true) {
  let mt = decorMats.get(hex);
  if (!mt) decorMats.set(hex, (mt = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.8 })));
  const gk = `${w},${h},${d}`;
  let gm = decorGeos.get(gk);
  if (!gm) decorGeos.set(gk, (gm = new THREE.BoxGeometry(w, h, d)));
  const m = new THREE.Mesh(gm, mt);
  m.castShadow = cast;
  m.receiveShadow = true;
  return m;
}

function buildDecor() {
  const g = new THREE.Group();
  // Grange (fond), toit en prisme.
  const barn = new THREE.Group();
  const body = box(6, 4, 4, 0xd9534f);
  body.position.y = 2;
  barn.add(body);
  const roof = box(6.6, 0.4, 4.6, 0x8d3b36);
  roof.position.y = 4.2;
  barn.add(roof);
  const door = box(1.8, 2.6, 0.1, 0xf5e6c8);
  door.position.set(0, 1.3, 2.05);
  barn.add(door);
  barn.position.set(-11, 0, -16);
  g.add(barn);
  // Arbres.
  const trunkM = new THREE.MeshStandardMaterial({ color: 0x8d6e63 });
  const leafM = new THREE.MeshStandardMaterial({ color: 0x4caf50, roughness: 0.9 });
  const trunkG = new THREE.CylinderGeometry(0.3, 0.4, 2, 8); // unité, mise à l'échelle par arbre
  const crownG = new THREE.SphereGeometry(1.5, 12, 8);
  for (const [x, z, s] of [[12, -15, 1.2], [-19, -8, 1], [19, -4, 1.1], [3, -20, 1.4]]) {
    const t = new THREE.Group();
    const trunk = new THREE.Mesh(trunkG, trunkM);
    trunk.scale.setScalar(s);
    trunk.position.y = s;
    const crown = new THREE.Mesh(crownG, leafM);
    crown.scale.setScalar(s);
    crown.position.y = 3 * s;
    crown.castShadow = true;
    t.add(trunk, crown);
    t.position.set(x, 0, z);
    g.add(t);
  }
  // Clôture de fond.
  // Piquets : une seule InstancedMesh, sans ombre portée (loin des îlots).
  const xs = [];
  for (let x = -24; x <= 24; x += 1.6) xs.push(x);
  const posts = new THREE.InstancedMesh(new THREE.BoxGeometry(0.2, 1.1, 0.2), decorMats.get(0xf5e6c8) || new THREE.MeshStandardMaterial({ color: 0xf5e6c8, roughness: 0.8 }), xs.length);
  const d = new THREE.Object3D();
  xs.forEach((x, i) => {
    d.position.set(x, 0.55, -13);
    d.updateMatrix();
    posts.setMatrixAt(i, d.matrix);
  });
  posts.instanceMatrix.needsUpdate = true;
  posts.receiveShadow = true;
  g.add(posts);
  for (const y of [0.4, 0.8]) {
    const rail = box(48, 0.12, 0.1, 0xf5e6c8, false);
    rail.position.set(0, y, -13);
    g.add(rail);
  }
  return g;
}

export function createStage(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);
  renderer.domElement.style.touchAction = 'none';
  renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());

  const scene = new THREE.Scene();
  scene.background = skyTexture();
  const decorUrl = imageUrl('decor');
  if (decorUrl) {
    new THREE.TextureLoader().load(decorUrl, (t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      scene.background = t;
    });
  }

  scene.add(new THREE.HemisphereLight(0xcfeaff, 0x86c76a, 1.5));
  const sun = new THREE.DirectionalLight(0xfff2cc, 2.4);
  sun.position.set(8, 16, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  const sc = sun.shadow.camera;
  sc.left = -16; sc.right = 16; sc.top = 16; sc.bottom = -16; sc.near = 1; sc.far = 60;
  sun.shadow.bias = -0.0006;
  scene.add(sun);

  const grassTex = getTexture('herbe');
  const groundMat = new THREE.MeshStandardMaterial({ color: grassTex ? 0xffffff : 0x8bd45e, roughness: 1 });
  if (grassTex) {
    grassTex.repeat.set(40, 40);
    groundMat.map = grassTex;
  }
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(240, 240), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  scene.add(buildDecor());

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 300);
  const target = new THREE.Vector3(0, 0.5, 0);
  let bounds = { w: 10, d: 10, h: 2.8 };
  let insets = { top: 90, bottom: 70 };
  let placement = null;

  function viewSize() {
    return { w: Math.max(1, container.clientWidth), h: Math.max(1, container.clientHeight) };
  }

  function fit() {
    const { w, h } = viewSize();
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.clearViewOffset();
    const vFrac = Math.max(0.3, (h - insets.top - insets.bottom) / h);
    const dir = new THREE.Vector3(0, Math.sin(ELEVATION), Math.cos(ELEVATION));
    const corners = [];
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (const y of [0, bounds.h]) {
      corners.push(new THREE.Vector3((sx * bounds.w) / 2, y, (sz * bounds.d) / 2));
    }
    let dist = 30;
    for (let i = 0; i < 6; i++) {
      camera.position.copy(target).addScaledVector(dir, dist);
      camera.lookAt(target);
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld(true);
      let m = 0;
      for (const c of corners) {
        const p = c.clone().project(camera);
        m = Math.max(m, Math.abs(p.x), Math.abs(p.y) / vFrac);
      }
      dist *= Math.max(0.2, m * 1.04);
    }
    camera.position.copy(target).addScaledVector(dir, dist);
    camera.lookAt(target);
    camera.updateMatrixWorld(true);
    // Décale l'image pour centrer la ferme entre la barre du haut et celle du bas.
    camera.setViewOffset(w, h, 0, -(insets.top - insets.bottom) / 2, w, h);
  }

  function doPlace() {
    if (!placement) return;
    const { groups, size, gap, colsFn } = placement;
    const { w, h } = viewSize();
    const aspect = w / Math.max(1, h - insets.top - insets.bottom);
    const n = groups.length;
    if (n === 0) {
      bounds = { w: 12, d: 10, h: 3 };
      fit();
      return;
    }
    const cols = colsFn(n, aspect);
    const rows = Math.ceil(n / cols);
    const step = size + gap;
    groups.forEach((gr, i) => {
      const r = Math.floor(i / cols);
      const inRow = Math.min(cols, n - r * cols);
      const c = i % cols;
      gr.position.set((c - (inRow - 1) / 2) * step, 0, (r - (rows - 1) / 2) * step);
    });
    bounds = { w: cols * step - gap + 0.6, d: rows * step - gap + 0.6, h: 2.8 };
    fit();
  }

  // Dispose les groupes sur une grille ; recalculé à chaque redimensionnement.
  function place(groups, { size, gap = 0.8, colsFn }) {
    placement = { groups, size, gap, colsFn };
    doPlace();
  }

  function setInsets(top, bottom) {
    insets = { top, bottom };
    doPlace();
  }

  window.addEventListener('resize', doPlace);
  window.addEventListener('orientationchange', () => setTimeout(doPlace, 150));

  return {
    renderer, scene, camera, place, setInsets, relayout: doPlace,
    render: () => renderer.render(scene, camera),
    get canvas() { return renderer.domElement; },
  };
}
