import * as THREE from 'three';
import { lerp } from './ease.js';

// Renderer, lumières et caméra 3/4 qui suit le point d'intérêt.
export function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 16 / 9, 0.5, 300);

  scene.add(new THREE.HemisphereLight(0xdff1ff, 0x9bbf7a, 1.05));
  const sun = new THREE.DirectionalLight(0xfff1d6, 1.9);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  const sc = sun.shadow.camera;
  sc.left = -20; sc.right = 20; sc.top = 14; sc.bottom = -14; sc.near = 1; sc.far = 60;
  sun.shadow.bias = -0.0006;
  scene.add(sun, sun.target);

  // Réglage de la caméra : cx, cz = point regardé ; width = largeur de monde à garder visible ;
  // angle = 0 (caméra côté sud, +z) ou PI (côté nord) ; l'orbite est lissée.
  const rig = { cx: 0, cz: 0, width: 20, angle: 0, tx: 0, tz: 0, tw: 20, ta: 0, aspect: 16 / 9 };
  const ELEV = (52 * Math.PI) / 180;

  function place() {
    const tan = Math.tan((camera.fov * Math.PI) / 360);
    const d = Math.max(rig.width / (2 * tan * rig.aspect), 21);
    const back = Math.cos(ELEV) * d;
    const h = Math.sin(ELEV) * d;
    const bias = 0.07 * d; // décale le décor vers le haut (barre de boutons en bas)
    const sa = Math.sin(rig.angle), ca = Math.cos(rig.angle);
    const fx = rig.cx, fz = rig.cz + ca * bias;
    camera.position.set(fx + sa * back, h, fz + ca * back);
    camera.lookAt(fx, 0, fz);
    sun.position.set(rig.cx - 10, 24, rig.cz + 12);
    sun.target.position.set(rig.cx, 0, rig.cz);
  }

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    rig.aspect = w / Math.max(1, h);
    camera.aspect = rig.aspect;
    camera.updateProjectionMatrix();
    place();
  }
  window.addEventListener('resize', resize);
  resize();

  return {
    renderer, scene, camera, sun, rig,
    aim({ x = rig.tx, z = rig.tz, width = rig.tw, angle = rig.ta }) { rig.tx = x; rig.tz = z; rig.tw = width; rig.ta = angle; },
    snap() { rig.cx = rig.tx; rig.cz = rig.tz; rig.width = rig.tw; rig.angle = rig.ta; place(); },
    update(dt) {
      const k = 1 - Math.exp(-3.2 * dt);
      rig.cx = lerp(rig.cx, rig.tx, k);
      rig.cz = lerp(rig.cz, rig.tz, k);
      rig.width = lerp(rig.width, rig.tw, k);
      rig.angle = lerp(rig.angle, rig.ta, 1 - Math.exp(-2.2 * dt));
      place();
      renderer.render(scene, camera);
    },
    resize,
  };
}
