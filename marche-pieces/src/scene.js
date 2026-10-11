// Scène 3D : marché, comptoir, plateau de pièces, tirelire. Aucune règle de jeu ici.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { makeMoney, moneyWidth } from './money3d.js';
import { buildItem } from './items3d.js';
import { Tweens, easeOutBack, easeInOutQuad, easeOutQuad, applySquash, createConfetti, getStarGeometry } from './effects.js';
import { formatEuros } from './money.js';
import { AVAILABLE_IMAGES } from './assets.js';

export const MAX_PLACED = 12;
const COLS = 4;
const CELL_X = 2.6;
const CELL_Z = 1.7;
const GRID_X0 = -2.0;
const GRID_Z0 = -1.5;
const ITEM_POS = new THREE.Vector3(-5.2, 0, -1.4);
const LABEL_POS = new THREE.Vector3(-5.2, 0.9, 1.5);
const CUSTOMER_POS = new THREE.Vector3(0.6, 0, -3.3);
const PIGGY_POS = new THREE.Vector3(6.0, 0, -3.4);
const TARGET = new THREE.Vector3(0, 0, -1.8);

function loadImage(url, onLoad) {
  if (!AVAILABLE_IMAGES.includes(url.split('/').pop())) return;
  const img = new Image();
  img.onload = () => onLoad(img);
  img.onerror = () => { /* repli silencieux */ };
  img.src = url;
}

export function createStage(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
  const tweens = new Tweens();
  const confetti = createConfetti(scene);

  // Lumières
  scene.add(new THREE.HemisphereLight(0xdff2ff, 0xf2d8a8, 1.15));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(6, 13, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 1, far: 45 });
  sun.shadow.bias = -0.0005;
  scene.add(sun);

  const shared = {};
  const stdMat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...extra });
  const rbox = (w, h, d, r = 0.08) => new RoundedBoxGeometry(w, h, d, 3, r);
  const add = (parent, geo, mat, x, y, z, shadow = true) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = shadow;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  };

  // Sol
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 50), stdMat(0xf3d9a4));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.5;
  floor.receiveShadow = true;
  scene.add(floor);

  // Comptoir en bois (+ plateau devant)
  const woodMat = stdMat(0xc98a4b, { roughness: 0.8 });
  const counter = add(scene, rbox(14.2, 0.5, 7.2, 0.12), woodMat, 0, -0.25, -1.2, false);
  counter.receiveShadow = true;
  const trayBoard = add(scene, rbox(14.2, 0.5, 3.8, 0.12), stdMat(0xe0a25f, { roughness: 0.8 }), 0, -0.25, 5.0, false);
  trayBoard.receiveShadow = true;
  const trayMat = trayBoard.material;
  add(scene, rbox(14.2, 0.22, 0.2, 0.06), stdMat(0xa8672f), 0, 0.05, 6.8, false); // rebord
  // Zone de pose (liseré clair)
  const zone = new THREE.Mesh(
    new THREE.PlaneGeometry(9.6, 5.6).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0xfff1c9, roughness: 0.9, transparent: true, opacity: 0.55 }),
  );
  zone.position.set(GRID_X0 + (COLS - 1) * CELL_X / 2, 0.004, 0.2);
  zone.receiveShadow = true;
  scene.add(zone);
  loadImage('assets/img/wood.png', (img) => {
    const tex = new THREE.Texture(img);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(3, 2);
    tex.needsUpdate = true;
    woodMat.map = tex; woodMat.color.set(0xffffff); woodMat.needsUpdate = true;
    trayMat.map = tex; trayMat.color.set(0xffffff); trayMat.needsUpdate = true;
  });

  // Étals
  function stripedAwning(x, z, c1, c2, w = 5.2) {
    const g = new THREE.Group();
    const n = 8, sw = w / n;
    const geo = rbox(sw, 0.16, 2.3, 0.05);
    const m1 = stdMat(c1), m2 = stdMat(0xffffff);
    for (let i = 0; i < n; i++) {
      const s = add(g, geo, i % 2 ? m2 : m1, -w / 2 + sw * (i + 0.5), 0, 0);
      s.rotation.x = 0.32;
    }
    g.position.set(x, 3.6, z + 0.2);
    scene.add(g);
    void c2;
  }
  function stall(x, color, kind) {
    const z = -6.4;
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    scene.add(g);
    add(g, rbox(5.2, 1.3, 1.7, 0.12), stdMat(color), 0, 0.15, 0);
    for (const px of [-2.5, 2.5]) add(g, rbox(0.18, 3.6, 0.18, 0.05), stdMat(0xa8672f), px, 1.7, -0.7);
    add(g, rbox(5.2, 3.2, 0.12, 0.05), stdMat(0xfff4dc), 0, 1.9, -0.9);
    stripedAwning(x, z, color);
    const sph = new THREE.SphereGeometry(0.32, 14, 10);
    const colors = kind === 'fruits' ? [0xe8262c, 0xffd93b, 0x7fd13b] : kind === 'jouets' ? [0x4da3ff, 0xff5a5f, 0xc77dff] : [0xfff1c2, 0xff8fb8, 0x6b3a1d];
    if (kind === 'glaces') {
      const bin = add(g, new THREE.CylinderGeometry(1.9, 1.7, 0.35, 28), stdMat(0xdfeaf5), 0, 0.95, 0.1);
      void bin;
      for (let i = 0; i < 5; i++) add(g, sph, stdMat(colors[i % 3]), -1.2 + i * 0.6, 1.3, 0.1 + (i % 2) * 0.25);
    } else {
      for (let i = 0; i < 3; i++) {
        add(g, rbox(1.4, 0.45, 1.0, 0.08), stdMat(0xb87333), -1.6 + i * 1.6, 0.98, 0.25);
        for (let k = 0; k < 4; k++) {
          const m = add(g, sph, stdMat(colors[(i + k) % 3]), -1.6 + i * 1.6 + (k % 2 ? 0.28 : -0.28), 1.4, 0.25 + (k > 1 ? 0.22 : -0.2));
          if (kind === 'jouets' && k === 3) m.scale.set(1, 1.3, 1);
        }
      }
    }
  }
  stall(-7, 0xe8473f, 'fruits');
  stall(0, 0x4da3ff, 'jouets');
  stall(7, 0xff8fb8, 'glaces');

  // Étiquette de prix (sprite)
  const labelCanvas = document.createElement('canvas');
  labelCanvas.width = 512; labelCanvas.height = 256;
  const labelTex = new THREE.CanvasTexture(labelCanvas);
  labelTex.colorSpace = THREE.SRGBColorSpace;
  const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTex, transparent: true }));
  label.scale.set(3.2, 1.6, 1);
  label.position.copy(LABEL_POS);
  scene.add(label);
  function drawLabel(priceCents) {
    const g = labelCanvas.getContext('2d');
    g.clearRect(0, 0, 512, 256);
    g.fillStyle = '#fff8e0';
    g.strokeStyle = '#e8473f';
    g.lineWidth = 16;
    g.beginPath();
    if (g.roundRect) g.roundRect(20, 30, 472, 196, 44); else g.rect(20, 30, 472, 196);
    g.fill(); g.stroke();
    g.fillStyle = '#2b2b3a';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = 'bold 120px ui-rounded, "Arial Rounded MT Bold", system-ui, sans-serif';
    g.fillText(formatEuros(priceCents), 256, 134);
    labelTex.needsUpdate = true;
  }

  // Tirelire cochon
  const piggy = new THREE.Group();
  {
    const pink = stdMat(0xff9ec4, { roughness: 0.5 });
    const dark = stdMat(0xe0709f);
    const body = add(piggy, new THREE.SphereGeometry(0.9, 24, 18), pink, 0, 0.95, 0);
    body.scale.set(1.2, 1, 1);
    const snout = add(piggy, new THREE.CylinderGeometry(0.32, 0.32, 0.3, 20), dark, 1.15, 1.0, 0);
    snout.rotation.z = Math.PI / 2;
    add(piggy, new THREE.SphereGeometry(0.05, 8, 8), stdMat(0x7a2848), 1.32, 1.07, 0.1);
    add(piggy, new THREE.SphereGeometry(0.05, 8, 8), stdMat(0x7a2848), 1.32, 1.07, -0.1);
    for (const s of [-1, 1]) {
      const ear = add(piggy, new THREE.ConeGeometry(0.22, 0.4, 12), dark, 0.65, 1.8, s * 0.4);
      ear.rotation.x = s * 0.4;
      add(piggy, new THREE.SphereGeometry(0.07, 8, 8), stdMat(0x222222), 0.95, 1.4, s * 0.38);
      for (const lx of [-0.55, 0.55]) add(piggy, new THREE.CylinderGeometry(0.17, 0.17, 0.4, 12), dark, lx, 0.2, s * 0.45);
    }
    add(piggy, new THREE.BoxGeometry(0.7, 0.07, 0.14), stdMat(0x7a2848), -0.1, 1.9, 0, false);
    const tail = add(piggy, new THREE.TorusGeometry(0.16, 0.05, 8, 14), dark, -1.1, 1.1, 0);
    tail.rotation.y = Math.PI / 2;
  }
  piggy.position.copy(PIGGY_POS);
  piggy.rotation.y = -0.8;
  piggy.userData.base = 0.8;
  piggy.scale.setScalar(0.8);
  scene.add(piggy);
  function setPiggyStars(total) {
    piggy.userData.base = 0.8 * (1 + Math.min(0.6, total * 0.012));
    piggy.scale.setScalar(piggy.userData.base);
  }
  function piggyBump() {
    tweens.add(0.5, (p) => { applySquash(piggy, piggy.userData.base, p, 0.22); }, () => piggy.scale.setScalar(piggy.userData.base));
  }

  // --- Article, client, plateau, pièces posées ---
  let itemGroup = null;
  let customerGroup = null;
  let trayGroups = [];
  const trayPos = new Map();
  const placed = []; // { value, mesh }
  let ghost = null;

  function popIn(obj, base, delay = 0) {
    obj.scale.setScalar(0.001);
    tweens.add(0.5, (p) => { obj.scale.setScalar(base * Math.max(0.001, easeOutBack(p))); }, null, delay);
  }

  function setItem(item, priceCents) {
    if (itemGroup) scene.remove(itemGroup);
    itemGroup = buildItem(item.shape);
    itemGroup.position.copy(ITEM_POS);
    itemGroup.rotation.y = -0.4;
    scene.add(itemGroup);
    popIn(itemGroup, 2.7);
    drawLabel(priceCents);
    label.visible = true;
  }

  function setCustomer(value) {
    if (customerGroup) { scene.remove(customerGroup); customerGroup = null; }
    if (!value) return;
    customerGroup = makeMoney(value);
    customerGroup.position.copy(CUSTOMER_POS);
    customerGroup.rotation.y = 0.2;
    scene.add(customerGroup);
    popIn(customerGroup, 1);
  }

  function slotPos(i) {
    const c = i % COLS, r = Math.floor(i / COLS);
    return new THREE.Vector3(GRID_X0 + c * CELL_X, 0.01, GRID_Z0 + r * CELL_Z);
  }

  const hitGeos = new Map();
  function setTray(allowed) {
    for (const g of trayGroups) scene.remove(g);
    trayGroups = [];
    trayPos.clear();
    // Répartition en rangées (largeur max 11.6).
    const gap = 0.4, maxW = 13.2;
    const rows = [[]];
    let w = 0;
    for (const v of allowed) {
      const mw = moneyWidth(v);
      if (w + mw + gap > maxW && rows[rows.length - 1].length) { rows.push([]); w = 0; }
      rows[rows.length - 1].push(v);
      w += mw + gap;
    }
    const zs = rows.length === 1 ? [5.0] : [4.1, 5.95];
    rows.forEach((row, ri) => {
      const total = row.reduce((s, v) => s + moneyWidth(v) + gap, -gap);
      let x = -total / 2;
      row.forEach((v) => {
        const mw = moneyWidth(v);
        const g = makeMoney(v);
        g.position.set(x + mw / 2, 0.01, zs[ri]);
        g.userData.where = 'tray';
        if (!hitGeos.has(v)) hitGeos.set(v, new THREE.BoxGeometry(Math.max(mw, 0.9) + 0.3, 0.8, (v >= 500 ? 1.7 : Math.max(mw, 0.9)) + 0.3));
        const hit = new THREE.Mesh(hitGeos.get(v), new THREE.MeshBasicMaterial({ visible: false }));
        hit.position.y = 0.3;
        g.add(hit);
        scene.add(g);
        trayGroups.push(g);
        trayPos.set(v, g.position.clone());
        popIn(g, 1, ri * 0.1 + row.indexOf(v) * 0.05);
        x += mw + gap;
      });
    });
  }

  function flyTo(mesh, to, dur = 0.45, arc = 1.6, onLand = null) {
    const tok = (mesh.userData.tok = (mesh.userData.tok || 0) + 1);
    const from = mesh.position.clone();
    tweens.add(dur, (p) => {
      if (mesh.userData.tok !== tok) return false;
      const e = easeInOutQuad(p);
      mesh.position.lerpVectors(from, to, e);
      mesh.position.y = from.y + (to.y - from.y) * e + Math.sin(p * Math.PI) * arc;
    }, () => {
      if (mesh.userData.tok !== tok) return;
      mesh.position.copy(to);
      tweens.add(0.35, (p) => { applySquash(mesh, 1, p, 0.35); }, () => mesh.scale.setScalar(1));
      if (onLand) onLand();
    });
  }

  function addPlaced(value, from = null) {
    if (placed.length >= MAX_PLACED) return false;
    const mesh = makeMoney(value);
    mesh.userData.where = 'placed';
    const start = from ? new THREE.Vector3(from.x, from.y, from.z) : (trayPos.get(value) || new THREE.Vector3(0, 0, 5)).clone();
    mesh.position.copy(start);
    mesh.rotation.y = (Math.random() - 0.5) * 0.5;
    scene.add(mesh);
    const idx = placed.length;
    placed.push({ value, mesh });
    flyTo(mesh, slotPos(idx), 0.45, 1.8);
    return true;
  }

  function reflow() {
    placed.forEach((e, i) => flyTo(e.mesh, slotPos(i), 0.3, 0.3));
  }

  function removePlaced(index) {
    if (index < 0 || index >= placed.length) return false;
    const [e] = placed.splice(index, 1);
    e.mesh.userData.where = 'gone';
    const dest = (trayPos.get(e.value) || new THREE.Vector3(0, 0, 5)).clone();
    flyTo(e.mesh, dest, 0.4, 1.4, () => scene.remove(e.mesh));
    // Sécurité si l'animation est supplantée.
    tweens.add(0.9, () => {}, () => scene.remove(e.mesh));
    reflow();
    return true;
  }

  function clearPlaced() {
    while (placed.length) removePlaced(placed.length - 1);
  }

  function resetPlacedImmediately() {
    for (const e of placed) { e.mesh.userData.tok = -1; scene.remove(e.mesh); }
    placed.length = 0;
  }

  function blink(values, seconds = 4) {
    const set = new Set(values);
    for (const g of trayGroups) {
      if (!set.has(g.userData.value)) continue;
      const tok = (g.userData.blink = (g.userData.blink || 0) + 1);
      tweens.add(seconds, (p) => {
        if (g.userData.blink !== tok) return false;
        const k = Math.abs(Math.sin(p * seconds * 4));
        g.scale.setScalar(1 + 0.25 * k);
        g.position.y = 0.01 + 0.35 * k;
      }, () => { g.scale.setScalar(1); g.position.y = 0.01; });
    }
  }

  function makeGhost(value) {
    removeGhost();
    ghost = makeMoney(value);
    ghost.scale.setScalar(1.15);
    scene.add(ghost);
    return ghost;
  }
  function removeGhost() {
    if (ghost) scene.remove(ghost);
    ghost = null;
  }

  // --- Interaction ---
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  function setNdc(cx, cy) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
  }
  function pick(cx, cy) {
    setNdc(cx, cy);
    const hits = raycaster.intersectObjects([...trayGroups, ...placed.map((e) => e.mesh)], true);
    for (const h of hits) {
      let o = h.object;
      while (o && !o.userData.where) o = o.parent;
      if (!o) continue;
      if (o.userData.where === 'tray') return { where: 'tray', value: o.userData.value };
      if (o.userData.where === 'placed') {
        const index = placed.findIndex((e) => e.mesh === o);
        if (index >= 0) return { where: 'placed', value: o.userData.value, index };
      }
    }
    return null;
  }
  const tmp = new THREE.Vector3();
  function planePoint(cx, cy, y = 0) {
    setNdc(cx, cy);
    plane.constant = -y;
    const p = raycaster.ray.intersectPlane(plane, tmp);
    return p ? p.clone() : null;
  }
  function isOverCounter(p) {
    return !!p && p.x > -3.6 && p.x < 7.0 && p.z < 3.0 && p.z > -3.3;
  }

  // --- Récompenses ---
  function celebrate() {
    confetti.burst(new THREE.Vector3(0, 3, 0));
  }
  function flyStars(n, onEach) {
    const target = PIGGY_POS.clone().setY(2.0);
    const start = new THREE.Vector3(ITEM_POS.x + 1.5, 3.4, ITEM_POS.z);
    const mat = new THREE.MeshStandardMaterial({ color: 0xffd23f, emissive: 0xffa800, emissiveIntensity: 0.6, roughness: 0.4 });
    for (let i = 0; i < n; i++) {
      const s = new THREE.Mesh(getStarGeometry(), mat);
      s.scale.setScalar(0.001);
      s.position.copy(start);
      scene.add(s);
      const ctrl = start.clone().lerp(target, 0.5).setY(6.5);
      tweens.add(1.0, (p) => {
        const e = easeOutQuad(p);
        const a = start.clone().lerp(ctrl, e), b = ctrl.clone().lerp(target, e);
        s.position.copy(a.lerp(b, e));
        s.rotation.y = p * 9;
        s.scale.setScalar(Math.min(1, p * 5) * 0.9 * (1 - p * 0.5));
      }, () => { scene.remove(s); piggyBump(); if (onEach) onEach(i); }, i * 0.22);
    }
  }

  // --- Taille / caméra ---
  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const tanHalf = Math.tan((camera.fov * Math.PI) / 360);
    const d = Math.max(25, 8.8 / (tanHalf * camera.aspect));
    const dir = new THREE.Vector3(0, 0.68, 0.73).normalize();
    camera.position.copy(TARGET).addScaledVector(dir, d);
    camera.lookAt(TARGET);
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  // Boucle
  let last = performance.now();
  let time = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    time += dt;
    tweens.update(dt);
    confetti.update(dt);
    if (itemGroup) itemGroup.position.y = Math.sin(time * 2) * 0.03;
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  return {
    renderer, scene, camera, tweens,
    setItem, setCustomer, setTray, setPiggyStars, piggyBump,
    addPlaced, removePlaced, clearPlaced, resetPlacedImmediately, blink,
    makeGhost, removeGhost, pick, planePoint, isOverCounter,
    celebrate, flyStars,
    placedValues: () => placed.map((e) => e.value),
    placedCount: () => placed.length,
    trayPos: (v) => (trayPos.get(v) || new THREE.Vector3(0, 0, 5)).clone(),
    hideLabel: () => { label.visible = false; },
    shared,
  };
}
