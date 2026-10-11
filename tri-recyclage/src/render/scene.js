import * as THREE from 'three';

const ELEV = (42 * Math.PI) / 180;
const TARGET = new THREE.Vector3(0, 1.3, 0.4);

// Points qui doivent rester visibles (tapis + poubelles + planète).
const KEY_POINTS = [
  [-6.8, 0.2, 1.0], [6.8, 0.2, 1.0], [-6.8, 1.0, -1.0], [6.8, 1.0, -1.0],
  [-5.6, 0, 4.4], [5.6, 0, 4.4], [-5.6, 1.9, 2.6], [5.6, 1.9, 2.6],
  [0, 4.95, -3.4], [-1.6, 3.4, -3.4], [1.6, 3.4, -3.4],
].map((a) => new THREE.Vector3(...a));

function gradientTexture() {
  const c = document.createElement('canvas');
  c.width = 4; c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#9fdcff');
  grad.addColorStop(0.6, '#d6f1ff');
  grad.addColorStop(1, '#fff1c4');
  g.fillStyle = grad;
  g.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = gradientTexture();

  const camera = new THREE.PerspectiveCamera(40, 1, 0.5, 200);

  scene.add(new THREE.HemisphereLight(0xffffff, 0xc9b79c, 1.5));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(-5, 11, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -9; sun.shadow.camera.right = 9;
  sun.shadow.camera.top = 9; sun.shadow.camera.bottom = -9;
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 30;
  sun.shadow.bias = -0.0005;
  scene.add(sun);

  // Sol doux
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(30, 48),
    new THREE.MeshStandardMaterial({ color: 0xbfe3a4, roughness: 1 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.01;
  floor.receiveShadow = true;
  scene.add(floor);

  const v = new THREE.Vector3();
  function fit() {
    const mx = Math.max(0.5, 1 - 40 / Math.max(canvas.clientWidth, 1)); // >= 20 px de marge de chaque côté
    const dir = new THREE.Vector3(0, Math.sin(ELEV), Math.cos(ELEV));
    let d = 120;
    for (let dist = 8; dist < 120; dist += 0.4) {
      camera.position.copy(TARGET).addScaledVector(dir, dist);
      camera.lookAt(TARGET);
      camera.updateMatrixWorld();
      camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
      const ok = KEY_POINTS.every((p) => {
        v.copy(p).applyMatrix4(camera.matrixWorldInverse).applyMatrix4(camera.projectionMatrix);
        return Math.abs(v.x) <= mx && v.y <= 0.78 && v.y >= -0.95;
      });
      if (ok) { d = dist; break; }
    }
    camera.position.copy(TARGET).addScaledVector(dir, d);
    camera.lookAt(TARGET);
    camera.updateMatrixWorld();
  }

  function resize() {
    const w = Math.max(canvas.clientWidth, 1);
    const h = Math.max(canvas.clientHeight, 1);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    fit();
  }
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 150));
  resize();

  return { renderer, scene, camera, resize };
}
