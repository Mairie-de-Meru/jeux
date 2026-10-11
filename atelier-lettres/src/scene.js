// Renderer, caméra, lumières, boucle, raycast pointeur. Fond dégradé = CSS derrière un canvas transparent.
import * as THREE from 'three';
import { updateTweens } from './fx.js';

export function createStage(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb9d4ff, 1.15));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(3, 6, 9);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 30 });
  sun.shadow.bias = -0.0005;
  scene.add(sun);

  const root = new THREE.Group();
  scene.add(root);

  let content = { w: 6, h: 5 };
  const updaters = new Set();
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();

  function fit() {
    const aspect = innerWidth / Math.max(1, innerHeight);
    camera.aspect = aspect;
    const t = Math.tan((camera.fov * Math.PI) / 360);
    // Paysage : on réserve la hauteur de l'en-tête (barre + points) en pixels, le contenu reste sous l'en-tête.
    const H = Math.max(1, innerHeight);
    const header = aspect >= 1 ? 140 : 0;
    const hFactor = header ? H / Math.max(1, H - header) : 1;
    const dist = Math.max((content.h / 2 / t) * hFactor, content.w / 2 / (t * aspect)) * 1.12;
    const shift = header ? dist * t * (header / H) : dist * t * 0.07; // le contenu descend sous la barre du haut
    camera.position.set(0, shift, dist);
    camera.lookAt(0, shift, 0);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
  }

  function resize() {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(innerWidth, innerHeight, false);
    fit();
    for (const fn of resizers) fn();
  }
  const resizers = new Set();
  addEventListener('resize', resize);

  const clock = new THREE.Clock();
  function loop() {
    const dt = Math.min(0.05, clock.getDelta());
    const t = clock.elapsedTime;
    updateTweens(dt);
    for (const fn of updaters) fn(dt, t);
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }

  const stage = {
    renderer, scene, camera, root, canvas,
    setContent(w, h) { content = { w, h }; fit(); },
    onFrame(fn) { updaters.add(fn); return () => updaters.delete(fn); },
    onResize(fn) { resizers.add(fn); return () => resizers.delete(fn); },
    start() { resize(); requestAnimationFrame(loop); },
    // Objets touchés sous le pointeur (coordonnées client d'un événement).
    pick(e, objects, recursive = true) {
      const r = canvas.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      camera.updateMatrixWorld();
      raycaster.setFromCamera(ndc, camera);
      return raycaster.intersectObjects(objects, recursive);
    },
    // Point du monde -> coordonnées client.
    project(v) {
      camera.updateMatrixWorld();
      const p = v.clone().project(camera);
      const r = canvas.getBoundingClientRect();
      return { x: r.left + (p.x * 0.5 + 0.5) * r.width, y: r.top + (-p.y * 0.5 + 0.5) * r.height };
    },
    clearRoot() {
      for (const child of root.children.slice()) {
        root.remove(child);
        child.traverse((o) => {
          if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose();
          const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
          for (const m of mats) {
            if (m.userData.shared) continue;
            if (m.map && !m.map.userData.shared) m.map.dispose();
            m.dispose();
          }
        });
      }
    },
  };
  return stage;
}
