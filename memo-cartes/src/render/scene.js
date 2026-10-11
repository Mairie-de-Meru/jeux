import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const CELL = 1.18; // pas de la grille

export function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene(); // fond transparent : dégradé CSS derrière le canvas
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 400);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x9aa8ff, 1.0));
  const sun = new THREE.DirectionalLight(0xffffff, 1.5);
  sun.position.set(3, 9, 5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -5.5, right: 5.5, top: 5.5, bottom: -5.5, near: 1, far: 25 });
  sun.shadow.radius = 4;
  sun.shadow.bias = -0.0005;
  scene.add(sun);

  const table = new THREE.Mesh(
    new RoundedBoxGeometry(1, 0.3, 1, 4, 0.14),
    new THREE.MeshStandardMaterial({ color: 0x34c3a0, roughness: 0.9 }),
  );
  table.receiveShadow = true;
  table.position.y = -0.15;
  scene.add(table);

  const PITCH = (64 * Math.PI) / 180;
  const dir = new THREE.Vector3(0, Math.sin(PITCH), Math.cos(PITCH));
  let grid = { rows: 2, cols: 2 };

  function fitCamera(rows, cols) {
    grid = { rows, cols };
    const w = cols * CELL, h = rows * CELL;
    table.scale.set(w + 0.9, 1, h + 0.9);
    const hx = (w + 0.9) / 2, hz = (h + 0.9) / 2;
    const pts = [];
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      pts.push(new THREE.Vector3(sx * hx, 0, sz * hz));
      pts.push(new THREE.Vector3(sx * (w / 2), 0.8, sz * (h / 2)));
    }
    const v = new THREE.Vector3();
    const fits = (d) => {
      camera.position.copy(dir).multiplyScalar(d);
      camera.lookAt(0, 0, 0);
      camera.updateMatrixWorld(true);
      camera.updateProjectionMatrix();
      return pts.every((p) => {
        v.copy(p).project(camera);
        return Math.abs(v.x) <= 0.97 && v.y >= -0.95 && v.y <= 0.82; // marge haute pour le HUD
      });
    };
    let lo = 1, hi = 300;
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      if (fits(mid)) hi = mid; else lo = mid;
    }
    fits(hi);
  }

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    fitCamera(grid.rows, grid.cols);
  }

  return { renderer, scene, camera, fitCamera, resize, render: () => renderer.render(scene, camera) };
}
