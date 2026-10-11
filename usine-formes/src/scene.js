// Renderer, caméra, lumières, fond dégradé.
import * as THREE from 'three';
import { disposeTree } from './meshes.js';

export function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);

  const hemi = new THREE.HemisphereLight(0xffffff, 0xb8c8e8, 1.1);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 1.7);
  sun.position.set(5, 11, 7);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  const sc = sun.shadow.camera;
  sc.left = -12; sc.right = 12; sc.top = 12; sc.bottom = -12; sc.near = 1; sc.far = 40;
  sun.shadow.radius = 5;
  sun.shadow.bias = -0.0004;
  scene.add(sun);

  const root = new THREE.Group();
  scene.add(root);

  function gradientTexture() {
    const c = document.createElement('canvas');
    c.width = 4; c.height = 256;
    const g = c.getContext('2d');
    const grad = g.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#6fc3ff');
    grad.addColorStop(0.6, '#bfeaff');
    grad.addColorStop(1, '#ffe9a8');
    g.fillStyle = grad; g.fillRect(0, 0, 4, 256);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  scene.background = gradientTexture();

  let view = { pos: new THREE.Vector3(0, 8, 8), target: new THREE.Vector3(), minAspect: 1.6 };
  const tmp = new THREE.Vector3();

  function applyView() {
    const f = Math.max(1, view.minAspect / camera.aspect);
    tmp.copy(view.pos).sub(view.target).multiplyScalar(f).add(view.target);
    camera.position.copy(tmp);
    camera.lookAt(view.target);
    camera.updateMatrixWorld();
  }

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    applyView();
  }
  window.addEventListener('resize', resize);

  return {
    renderer, scene, camera, root,
    setView(pos, target, fov = 40, minAspect = 1.6) {
      view = { pos: new THREE.Vector3(...pos), target: new THREE.Vector3(...target), minAspect };
      camera.fov = fov;
      camera.updateProjectionMatrix();
      applyView();
    },
    setBackground(tex) { scene.background = tex; },
    clearRoot() {
      for (const c of [...root.children]) { root.remove(c); disposeTree(c); }
    },
    resize,
    render() { renderer.render(scene, camera); },
  };
}
