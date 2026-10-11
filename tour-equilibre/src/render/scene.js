import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { IMAGES } from '../assets.js';
import { GROUND_Y, PLATFORM_DEPTH } from '../physics.js';

const FOV = 40;
const VIEW_H = 11;     // hauteur visible visée (mètres)
const NEED_HALF_W = 6.6; // demi-largeur à toujours voir

export function createScene(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);
  renderer.domElement.style.touchAction = 'none';

  if (IMAGES.sky) document.body.style.backgroundImage = `url(${IMAGES.sky})`;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.5, 200);

  scene.add(new THREE.HemisphereLight(0xcfe9ff, 0x7bbf5a, 1.1));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(6, 16, 10);
  sun.target.position.set(0, 2, 0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  const sc = sun.shadow.camera;
  sc.left = -14; sc.right = 14; sc.top = 14; sc.bottom = -10; sc.near = 1; sc.far = 50;
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.02;
  scene.add(sun, sun.target);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(120, 40),
    new THREE.MeshStandardMaterial({ color: 0x5fd35f, roughness: 0.9 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = GROUND_Y;
  ground.receiveShadow = true;
  scene.add(ground);

  const platform = new THREE.Group();
  platform.position.y = -0.5;
  scene.add(platform);
  let platformMesh = null;
  const platformMat = new THREE.MeshStandardMaterial({ color: 0xffb347, roughness: 0.6 });

  const finish = new THREE.Group();
  scene.add(finish);
  let flag = null;

  function clear(g) {
    while (g.children.length) {
      const c = g.children.pop();
      if (c.geometry) c.geometry.dispose();
    }
  }

  function setLevel(level) {
    clear(platform);
    platformMesh = new THREE.Mesh(new RoundedBoxGeometry(level.platformWidth, 1, PLATFORM_DEPTH, 4, 0.18), platformMat);
    platformMesh.castShadow = true;
    platformMesh.receiveShadow = true;
    platform.add(platformMesh);
    platform.rotation.set(0, 0, 0);

    clear(finish);
    const y = level.targetHeight;
    const band = new THREE.Mesh(
      new THREE.PlaneGeometry(9.2, 0.2),
      new THREE.MeshBasicMaterial({ color: 0xffe14d, transparent: true, opacity: 0.55, depthWrite: false }),
    );
    band.position.set(0.3, y, 0);
    band.renderOrder = 2;
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, y + 1.3 - GROUND_Y, 10),
      new THREE.MeshStandardMaterial({ color: 0xf5f5f5 }),
    );
    pole.position.set(-4.3, (y + 1.3 + GROUND_Y) / 2, -1.5);
    pole.castShadow = true;
    const fs = new THREE.Shape();
    fs.moveTo(0, 0); fs.lineTo(1.1, 0.3); fs.lineTo(0, 0.6); fs.closePath();
    flag = new THREE.Mesh(new THREE.ShapeGeometry(fs), new THREE.MeshStandardMaterial({ color: 0xff3b3b, side: THREE.DoubleSide }));
    flag.position.set(-4.27, y + 0.7, -1.5);
    finish.add(band, pole, flag);
  }

  let aspect = 1;
  function resize() {
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    aspect = w / h;
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  const tanHalf = Math.tan((FOV * Math.PI) / 360);
  function update(t, lookY) {
    // recule en mode portrait étroit pour garder la tour et les personnages visibles
    const dist = Math.max(VIEW_H / 2 / tanHalf, NEED_HALF_W / (tanHalf * aspect));
    camera.position.set(0, lookY + 0.8, dist);
    camera.lookAt(0, lookY, 0);
    if (flag) flag.rotation.y = Math.sin(t * 3) * 0.3;
  }

  return {
    renderer, scene, camera, platform, setLevel, resize, update,
    render: () => renderer.render(scene, camera),
  };
}
