// Renderer, caméra, lumières, cadrage. `pivot` (centré sur le plateau) sert à la parallaxe ;
// `world` contient tout en coordonnées plateau.
import * as THREE from 'three';

const FOV = 40;
const FRAME = 1.1;

export function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);
  const pivot = new THREE.Group();
  const world = new THREE.Group();
  pivot.add(world);
  scene.add(pivot);

  scene.add(new THREE.HemisphereLight(0xffffff, 0xfff0dc, 1.0));
  const sun = new THREE.DirectionalLight(0xffffff, 0.9);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  sun.shadow.radius = 4;
  scene.add(sun, sun.target);

  let center = { x: 1, y: 1 };

  function setCenter(cx, cy) {
    center = { x: cx, y: cy };
    pivot.position.set(cx, cy, 0);
    world.position.set(-cx, -cy, 0);
  }

  function resize() {
    const w = canvas.clientWidth || window.innerWidth, h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  // view : {width,height} en unités plateau ; shift : décalage vertical du contenu (fraction de la hauteur).
  function frame(view, shift = 0.04) {
    const t = Math.tan((FOV * Math.PI) / 360);
    const dist = Math.max((view.height * FRAME) / 2 / t, (view.width * FRAME) / 2 / (t * camera.aspect));
    const cy = center.y + shift * view.height * FRAME;
    camera.position.set(center.x, cy, dist);
    camera.lookAt(center.x, cy, 0);
    sun.position.set(center.x - dist * 0.25, center.y + dist * 0.45, dist * 0.9);
    sun.target.position.set(center.x, center.y, 0);
    const r = Math.max(view.width, view.height) * 0.75;
    const sc = sun.shadow.camera;
    sc.left = -r; sc.right = r; sc.top = r; sc.bottom = -r; sc.near = 1; sc.far = dist * 3;
    sc.updateProjectionMatrix();
  }

  function setTilt(rx, ry, s = 1) {
    pivot.rotation.set(rx, ry, 0);
    pivot.scale.setScalar(s);
  }

  return { renderer, scene, camera, pivot, world, setCenter, resize, frame, setTilt, aspect: () => camera.aspect, render: () => renderer.render(scene, camera) };
}
