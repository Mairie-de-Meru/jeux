import * as THREE from 'three';

const FIT = 8.8;       // demi-étendue (unités monde) à garder visible
const ELEVATION = 60 * Math.PI / 180;

export function createScene(host, tableImage) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.style.touchAction = 'none';
  renderer.domElement.style.display = 'block';
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const bg = document.createElement('canvas');
  bg.width = 4; bg.height = 256;
  const g = bg.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#8fd3ff');
  grad.addColorStop(1, '#fff1c9');
  g.fillStyle = grad;
  g.fillRect(0, 0, 4, 256);
  const bgTex = new THREE.CanvasTexture(bg);
  bgTex.colorSpace = THREE.SRGBColorSpace;
  scene.background = bgTex;

  scene.add(new THREE.HemisphereLight(0xffffff, 0xcdb88a, 1.2));
  const sun = new THREE.DirectionalLight(0xffffff, 2.0);
  sun.position.set(5, 12, 7);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  const sc = sun.shadow.camera;
  sc.left = -11; sc.right = 11; sc.top = 11; sc.bottom = -11; sc.near = 1; sc.far = 40;
  sun.shadow.bias = -0.0005;
  sun.shadow.radius = 3;
  scene.add(sun);

  // Table (texture si disponible, sinon couleur unie)
  const tableMat = new THREE.MeshStandardMaterial({ color: tableImage ? 0xffffff : 0xf2d9a8, roughness: 0.9 });
  if (tableImage) {
    const tex = new THREE.Texture(tableImage);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    tableMat.map = tex;
  }
  const table = new THREE.Mesh(new THREE.CylinderGeometry(9.6, 9.6, 0.4, 64), tableMat);
  table.position.y = -0.2;
  table.receiveShadow = true;
  scene.add(table);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  function fit() {
    const t = Math.tan((camera.fov * Math.PI) / 360);
    const dist = FIT / Math.min(t * camera.aspect, t);
    camera.position.set(0, dist * Math.sin(ELEVATION), dist * Math.cos(ELEVATION));
    camera.lookAt(0, 0, 0);
  }
  function resize() {
    const w = Math.max(1, host.clientWidth), h = Math.max(1, host.clientHeight);
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    fit();
  }
  window.addEventListener('resize', resize);
  resize();

  const frameFns = [];
  let last = performance.now();
  renderer.setAnimationLoop((now) => {
    const dt = Math.min(100, now - last);
    last = now;
    for (const f of frameFns) f(dt, now / 1000);
    renderer.render(scene, camera);
  });

  return { renderer, scene, camera, resize, onFrame: (f) => frameFns.push(f) };
}
