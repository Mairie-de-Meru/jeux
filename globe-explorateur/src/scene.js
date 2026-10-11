// Renderer, caméra, lumières, étoiles. Le fond dégradé est celui du CSS (canvas transparent).
import * as THREE from 'three';

export function createScene(stage, canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 60);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x5a78c8, 1.5));
  const sun = new THREE.DirectionalLight(0xfff4e0, 2.2);
  sun.position.set(3, 2.5, 4);
  scene.add(sun);

  // quelques étoiles douces derrière le globe
  const n = 260, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const r = 12 + Math.random() * 6, a = Math.random() * Math.PI * 2, b = Math.acos(2 * Math.random() - 1);
    pos[i * 3] = r * Math.sin(b) * Math.cos(a); pos[i * 3 + 1] = r * Math.cos(b); pos[i * 3 + 2] = -Math.abs(r * Math.sin(b) * Math.sin(a)) - 3;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const stars = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 0.09, transparent: true, opacity: 0.8 }));
  scene.add(stars);

  let baseDist = 4, zoom = 1;

  // Cadrage : le globe entier (rayon ≈ 1,06 avec le relief) tient dans la zone visible.
  function fit() {
    const w = Math.max(1, stage.clientWidth), h = Math.max(1, stage.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const halfV = (camera.fov * Math.PI) / 360;
    const halfH = Math.atan(Math.tan(halfV) * camera.aspect);
    const half = Math.min(halfV, halfH) * 0.93;
    baseDist = 1.12 / Math.sin(half);
    camera.position.set(0, 0, baseDist / zoom);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }
  fit();
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(fit).observe(stage);
  window.addEventListener('resize', fit);

  // zoom 1 = globe entier ; > 1 rapproche la caméra
  function setZoom(v) { zoom = v; camera.position.z = baseDist / zoom; }

  return { setZoom, renderer, scene, camera, fit, render: () => renderer.render(scene, camera), stars };
}
