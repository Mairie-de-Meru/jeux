import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const FOOD_Y = 0;

export function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);

  scene.add(new THREE.HemisphereLight(0xfff4e0, 0xc98a6b, 1.15));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(-4, 9, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -9;
  sun.shadow.camera.right = 9;
  sun.shadow.camera.top = 9;
  sun.shadow.camera.bottom = -9;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 30;
  sun.shadow.radius = 4;
  sun.shadow.bias = -0.0004;
  scene.add(sun);

  // Table (bois) et comptoir
  const tableMat = new THREE.MeshStandardMaterial({ color: 0xc98a4b, roughness: 0.75 });
  const table = new THREE.Mesh(new RoundedBoxGeometry(24, 0.6, 14, 4, 0.2), tableMat);
  table.position.set(0, -0.3, 3.6);
  table.receiveShadow = true;
  scene.add(table);

  const counterMat = new THREE.MeshStandardMaterial({ color: 0xe8553d, roughness: 0.55 });
  const counter = new THREE.Mesh(new RoundedBoxGeometry(24, 1.1, 1.3, 4, 0.2), counterMat);
  counter.position.set(0, 0.55, -1.7);
  counter.castShadow = true;
  counter.receiveShadow = true;
  scene.add(counter);
  const counterTop = new THREE.Mesh(
    new RoundedBoxGeometry(24.2, 0.18, 1.6, 3, 0.07),
    new THREE.MeshStandardMaterial({ color: 0xfff1d6, roughness: 0.5 }),
  );
  counterTop.position.set(0, 1.12, -1.7);
  counterTop.receiveShadow = true;
  scene.add(counterTop);

  // Tout ce qui change d'une manche à l'autre vit dans `board`.
  const board = new THREE.Group();
  scene.add(board);

  let aspect = 1.5;
  const lookAt = new THREE.Vector3(0, 0.6, 0.2);
  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    aspect = w / h;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    camera.aspect = aspect;
    // En portrait on recule pour garder la largeur utile visible.
    const kc = Math.min(2.4, Math.max(1, 8.6 / (7.7 * aspect)));
    camera.position.set(0, 7.4 * kc + 0.6, 7.2 * kc + 0.4);
    camera.lookAt(lookAt);
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  function setTableTexture(img) {
    const tex = new THREE.Texture(img);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 3);
    tex.needsUpdate = true;
    tableMat.map = tex;
    tableMat.color.set(0xffffff);
    tableMat.needsUpdate = true;
  }

  return {
    renderer, scene, camera, board, resize, setTableTexture,
    get aspect() { return aspect; },
    get portrait() { return aspect < 1; },
    render() { renderer.render(scene, camera); },
  };
}

export function createPlate(radius = 1.75) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35 });
  const dish = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 0.88, 0.12, 40), mat);
  dish.position.y = 0.06;
  dish.castShadow = true;
  dish.receiveShadow = true;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.97, 0.07, 10, 48), mat);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.12;
  rim.castShadow = true;
  const inner = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.78, radius * 0.78, 0.02, 36),
    new THREE.MeshStandardMaterial({ color: 0xe7eef7, roughness: 0.4 }),
  );
  inner.position.y = 0.125;
  inner.receiveShadow = true;
  g.add(dish, rim, inner);
  return g;
}
