// Galerie 3D : salle ronde, toiles accrochées, visite au glisser / flèches, zoom au toucher.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { wallLayout } from '../logic/gallery.js';

const ROOM_R = 6;
const FRAME_R = 5.85;
const WALL_H = 5;
const EYE = 1.7;

const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));

export function createGallery3D({ container, images = {}, onChange = () => {} }) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.className = 'gallery-canvas';
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 50);
  camera.rotation.order = 'YXZ';

  scene.add(new THREE.HemisphereLight(0xffffff, 0xffd9a8, 1.15));
  const sun = new THREE.DirectionalLight(0xffffff, 1.1);
  sun.position.set(2, 7, 3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -8; sun.shadow.camera.right = 8; sun.shadow.camera.top = 8; sun.shadow.camera.bottom = -8;
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 20;
  scene.add(sun);

  // --- salle
  const loader = new THREE.TextureLoader();
  function tex(url, repeatX, repeatY, mat) {
    if (!url) return;
    loader.load(url, (t) => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(repeatX, repeatY);
      t.colorSpace = THREE.SRGBColorSpace;
      mat.map = t; mat.color.set(0xffffff); mat.needsUpdate = true;
    }, undefined, () => { /* repli : couleur unie */ });
  }
  const floorMat = new THREE.MeshStandardMaterial({ color: 0xe9c48f, roughness: 0.9 });
  const floor = new THREE.Mesh(new THREE.CircleGeometry(ROOM_R + 0.3, 64), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  tex(images.sol, 3, 3, floorMat);

  const wallMat = new THREE.MeshStandardMaterial({ color: 0xffe3f0, roughness: 1, side: THREE.BackSide });
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(ROOM_R + 0.3, ROOM_R + 0.3, WALL_H, 64, 1, true), wallMat);
  wall.position.y = WALL_H / 2;
  wall.receiveShadow = true;
  scene.add(wall);
  tex(images.mur, 4, 1, wallMat);

  const plinth = new THREE.Mesh(
    new THREE.CylinderGeometry(ROOM_R + 0.3, ROOM_R + 0.3, 0.25, 64, 1, true),
    new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.BackSide }),
  );
  plinth.position.y = 0.125;
  scene.add(plinth);

  // --- cadres (géométries et matériaux partagés)
  const frameGeo = new RoundedBoxGeometry(2.5, 1.9, 0.14, 3, 0.05);
  const planeGeo = new THREE.PlaneGeometry(2.2, 1.65);
  const frameMat = new THREE.MeshStandardMaterial({ color: 0xb5763a, roughness: 0.55 });
  let frames = [];
  let layout = [];
  const textures = [];

  function clearFrames() {
    for (const f of frames) scene.remove(f.group);
    for (const t of textures) t.dispose();
    textures.length = 0;
    frames = [];
  }

  /** items : [{canvas?|dataUrl?}] (au plus 8). */
  function setArtworks(items) {
    clearFrames();
    layout = wallLayout(items.length, FRAME_R);
    items.forEach((item, i) => {
      const L = layout[i];
      const group = new THREE.Group();
      group.position.set(L.x, EYE, L.z);
      group.rotation.y = L.rotY;
      const frame = new THREE.Mesh(frameGeo, frameMat);
      frame.castShadow = true;
      group.add(frame);
      const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const plane = new THREE.Mesh(planeGeo, mat);
      plane.position.z = 0.075;
      plane.userData.index = i;
      group.add(plane);
      scene.add(group);
      frames.push({ group, plane });
      // ajuste le plan au ratio réel de l'image (anciens dessins 4:3, nouveaux 25:16), sans déformation
      const fitPlane = (w, h) => {
        const a = w / h;
        const pw = a >= 2.2 / 1.65 ? 2.2 : 1.65 * a;
        plane.scale.set(pw / 2.2, pw / a / 1.65, 1);
      };
      const setMap = (t) => { t.colorSpace = THREE.SRGBColorSpace; textures.push(t); mat.map = t; mat.needsUpdate = true; };
      if (item.canvas) { fitPlane(item.canvas.width, item.canvas.height); setMap(new THREE.CanvasTexture(item.canvas)); }
      else if (item.dataUrl) {
        const img = new Image();
        img.onload = () => { fitPlane(img.naturalWidth, img.naturalHeight); const t = new THREE.Texture(img); t.needsUpdate = true; setMap(t); };
        img.src = item.dataUrl;
      }
    });
    focus = -1;
    onChange(info());
  }

  // --- caméra : état animé
  const cam = { yaw: 0, px: 0, pz: 0, y: EYE, fov: 62 };
  let tween = null;
  let focus = -1; // index de la toile zoomée, -1 sinon
  let current = 0; // toile visée

  function applyCam() {
    camera.position.set(cam.px, cam.y, cam.pz);
    camera.rotation.set(0, cam.yaw, 0);
    if (Math.abs(camera.fov - cam.fov) > 0.01) { camera.fov = cam.fov; camera.updateProjectionMatrix(); }
  }
  function animateTo(target, ms = 650) {
    const from = { ...cam };
    const to = { ...cam, ...target };
    if (target.yaw !== undefined) to.yaw = from.yaw + wrapAngle(target.yaw - from.yaw);
    tween = { from, to, t0: performance.now(), ms };
  }
  function stepTween(now) {
    if (!tween) return;
    const k = Math.min(1, (now - tween.t0) / tween.ms);
    const e = easeInOutCubic(k);
    for (const key of Object.keys(cam)) cam[key] = tween.from[key] + (tween.to[key] - tween.from[key]) * e;
    if (k >= 1) tween = null;
  }

  function info() {
    return { count: frames.length, current, focus };
  }
  function lookAt(i, zoom) {
    if (!layout.length) return;
    i = (i + layout.length) % layout.length;
    current = i;
    const L = layout[i];
    if (zoom) {
      // distance pour que tout le cadre (2.5 x 1.9, marge 15 %) tienne selon fov et format d'écran
      const fov = 55;
      const t = Math.tan((fov * Math.PI) / 360);
      const need = Math.max((1.9 / 2) * 1.15 / t, (2.5 / 2) * 1.15 / (t * (camera.aspect || 1.5)));
      const d = FRAME_R - Math.min(need, FRAME_R + 4);
      animateTo({ yaw: L.rotY, px: Math.sin(L.angle) * d, pz: Math.cos(L.angle) * d, y: EYE, fov }, 600);
      focus = i;
    } else {
      animateTo({ yaw: L.rotY, px: 0, pz: 0, y: EYE, fov: 62 }, 600);
      focus = -1;
    }
    onChange(info());
  }

  // --- interactions : glisser = tourner, toucher = zoom
  const ray = new THREE.Raycaster();
  let drag = null;
  const dom = renderer.domElement;
  dom.style.touchAction = 'none';
  dom.addEventListener('pointerdown', (e) => {
    drag = { x: e.clientX, y: e.clientY, moved: 0, id: e.pointerId };
    try { dom.setPointerCapture(e.pointerId); } catch (err) { /* ignoré */ }
  });
  dom.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x;
    drag.moved += Math.abs(dx) + Math.abs(e.clientY - drag.y);
    drag.x = e.clientX; drag.y = e.clientY;
    if (drag.moved > 6 && focus < 0) { tween = null; cam.yaw += dx * 0.006; }
  });
  dom.addEventListener('pointerup', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const wasTap = drag.moved <= 6;
    drag = null;
    if (!wasTap) return;
    if (focus >= 0) { lookAt(focus, false); return; }
    const r = dom.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
    const hit = ray.intersectObjects(frames.map((f) => f.plane), false)[0];
    if (hit) lookAt(hit.object.userData.index, true);
  });
  dom.addEventListener('pointercancel', () => { drag = null; });

  // --- boucle (active seulement quand la galerie est affichée)
  let raf = 0;
  function loop(now) {
    raf = requestAnimationFrame(loop);
    stepTween(now);
    applyCam();
    renderer.render(scene, camera);
  }
  function resize() {
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    dom.style.width = '100%'; dom.style.height = '100%';
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(resize).observe(container);

  applyCam();
  return {
    setArtworks,
    start() { if (!raf) { resize(); raf = requestAnimationFrame(loop); } },
    stop() { if (raf) { cancelAnimationFrame(raf); raf = 0; } },
    resize,
    /** Entrée en douceur : on arrive de haut, grand angle, puis on se pose face à la toile la plus récente. */
    enter() {
      focus = -1; current = 0;
      const L = layout[0];
      const yaw = L ? L.rotY : 0;
      Object.assign(cam, { yaw: yaw - 1.2, px: 0, pz: 0, y: 3.4, fov: 85 });
      animateTo({ yaw, y: EYE, fov: 62 }, 1400);
    },
    turn(dir) { if (focus >= 0) lookAt(focus + dir, true); else lookAt(current + dir, false); },
    focus: (i) => lookAt(i, true),
    unfocus: () => lookAt(current, false),
    state: info,
  };
}
