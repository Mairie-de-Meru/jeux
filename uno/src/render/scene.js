import * as THREE from 'three';
import { faceCanvas, backCanvas, cardKey, COLOR_HEX } from './cardart.js';

const CW = 0.9, CH = 1.35, CT = 0.025;
const cardGeo = new THREE.BoxGeometry(CW, CT, CH);
const SEATS = { 1: [[0, -3.3]], 2: [[-3.2, -0.7], [3.2, -0.7]], 3: [[-3.2, 0.1], [0, -3.3], [3.2, 0.1]] };
export const HUMAN_POS = new THREE.Vector3(0, 0.6, 4.4);
export const DISCARD_POS = new THREE.Vector3(1.1, 0, 0);
export const DRAW_POS = new THREE.Vector3(-1.1, 0, 0);

const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const sideMat = new THREE.MeshStandardMaterial({ color: 0xfffdf6, roughness: 0.7 });

function tex(canvas) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
let backMat = null;
const faceMats = new Map();
const getBackMat = () => backMat || (backMat = new THREE.MeshStandardMaterial({ map: tex(backCanvas()), roughness: 0.6 }));
function getFaceMat(card) {
  const k = cardKey(card);
  if (!faceMats.has(k)) faceMats.set(k, new THREE.MeshStandardMaterial({ map: tex(faceCanvas(card)), roughness: 0.6 }));
  return faceMats.get(k);
}
// face visible dessus ; dessous = dos
function cardMesh(card) {
  const top = card ? getFaceMat(card) : getBackMat();
  const m = new THREE.Mesh(cardGeo, [sideMat, sideMat, top, getBackMat(), sideMat, sideMat]);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

function labelSprite() {
  const cv = document.createElement('canvas'); cv.width = 320; cv.height = 96;
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false }));
  s.scale.set(1.95, 0.585, 1); s.renderOrder = 10;
  s.userData = { cv, t };
  return s;
}
function drawLabel(sprite, emoji, name, count, active) {
  const { cv, t } = sprite.userData; const x = cv.getContext('2d');
  x.clearRect(0, 0, 320, 96);
  x.fillStyle = active ? '#ffd23f' : 'rgba(255,255,255,0.92)';
  x.beginPath(); x.roundRect(4, 8, 312, 80, 40); x.fill();
  x.lineWidth = 5; x.strokeStyle = active ? '#e07a00' : 'rgba(40,40,80,0.35)'; x.stroke();
  x.fillStyle = '#2b2d42'; x.textBaseline = 'middle';
  x.font = '48px sans-serif'; x.textAlign = 'left'; x.fillText(emoji, 20, 50);
  x.font = '800 36px "Trebuchet MS", Arial, sans-serif'; x.fillText(name, 82, 50);
  x.textAlign = 'right'; x.font = '900 40px "Trebuchet MS", Arial, sans-serif';
  x.fillStyle = '#c0392b'; x.fillText(String(count), 296, 52);
  t.needsUpdate = true;
}

export function createScene(stage, canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x6a5acd, 1.1));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(3, 9, 5); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 1, far: 25 });
  scene.add(sun);

  // table
  const felt = new THREE.Mesh(new THREE.CylinderGeometry(4.8, 4.8, 0.3, 64), new THREE.MeshStandardMaterial({ color: 0x1f9d6b, roughness: 0.95 }));
  felt.position.y = -0.16; felt.receiveShadow = true; scene.add(felt);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(4.8, 0.2, 16, 80), new THREE.MeshStandardMaterial({ color: 0x8a4b2a, roughness: 0.6 }));
  rim.rotation.x = Math.PI / 2; rim.position.y = -0.02; scene.add(rim);
  const inner = new THREE.Mesh(new THREE.TorusGeometry(2.7, 0.03, 8, 80), new THREE.MeshBasicMaterial({ color: 0x7ee0b0, transparent: true, opacity: 0.5 }));
  inner.rotation.x = Math.PI / 2; inner.position.y = 0.01; scene.add(inner);

  // anneau de sens : petits chevrons qui tournent
  const dirRing = new THREE.Group();
  const cones = [];
  const chevGeo = new THREE.ConeGeometry(0.16, 0.34, 3);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const c = new THREE.Mesh(chevGeo, new THREE.MeshBasicMaterial({ color: 0xfff2a8, transparent: true, opacity: 0.85 }));
    c.rotation.x = Math.PI / 2; // pointe vers +z local
    cones.push(c);
    const holder = new THREE.Group();
    holder.position.set(Math.cos(a) * 2.7, 0.05, Math.sin(a) * 2.7);
    holder.rotation.y = -a; // +z local = tangente
    holder.add(c); dirRing.add(holder);
  }
  scene.add(dirRing);
  let dir = 1;
  let popT0 = -1;
  function setDir(d) {
    if (d !== dir) popT0 = performance.now();
    dir = d;
    cones.forEach((c) => { c.rotation.x = d > 0 ? Math.PI / 2 : -Math.PI / 2; });
  }

  // couleur courante (disque sous la défausse)
  const colorDisc = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 0.03, 40), new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.5, emissive: 0x000000 }));
  colorDisc.position.set(DISCARD_POS.x, 0.0, DISCARD_POS.z); colorDisc.receiveShadow = true; scene.add(colorDisc);

  // pioche
  const drawPile = new THREE.Mesh(cardGeo, [sideMat, sideMat, getBackMat(), getBackMat(), sideMat, sideMat]);
  drawPile.castShadow = true; scene.add(drawPile);
  function setDrawCount(n) {
    const h = Math.max(0.02, Math.min(0.7, n * 0.007));
    drawPile.scale.y = h / CT; drawPile.position.set(DRAW_POS.x, h / 2 + 0.02, DRAW_POS.z);
    drawPile.visible = n > 0;
  }

  // défausse
  let discardMeshes = [];
  function setDiscard(card, color, immediate = false) {
    const m = cardMesh(card);
    m.rotation.y = (Math.random() - 0.5) * 0.7;
    m.position.set(DISCARD_POS.x + (Math.random() - 0.5) * 0.12, 0.05 + discardMeshes.length * 0.03, DISCARD_POS.z + (Math.random() - 0.5) * 0.12);
    scene.add(m); discardMeshes.push(m);
    while (discardMeshes.length > 6) scene.remove(discardMeshes.shift());
    discardMeshes.forEach((d, i) => { d.position.y = 0.05 + i * 0.03; });
    setColor(color);
  }
  function setColor(color) {
    const hex = color ? COLOR_HEX[color] : '#888888';
    colorDisc.material.color.set(hex); colorDisc.material.emissive.set(hex); colorDisc.material.emissiveIntensity = 0.35;
  }
  function clearDiscard() { discardMeshes.forEach((m) => scene.remove(m)); discardMeshes = []; }

  // sièges des robots
  let seats = [];
  function clearSeats() { seats.forEach((s) => scene.remove(s.group)); seats = []; }
  function setupSeats(players) {
    clearSeats();
    const bots = players.length - 1;
    SEATS[bots].forEach(([x, z], i) => {
      const pl = players[i + 1];
      const group = new THREE.Group(); group.position.set(x, 0, z);
      group.rotation.y = Math.atan2(-x, -z); // le +z local regarde le centre
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.06, 8, 40), new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0 }));
      ring.rotation.x = Math.PI / 2; ring.position.y = 0.02; group.add(ring);
      const fan = new THREE.Group(); group.add(fan);
      const label = labelSprite(); label.position.set(0, 0.9, -1.15); group.add(label);
      scene.add(group);
      seats.push({ group, fan, ring, label, pl, count: -1, active: false, world: new THREE.Vector3(x, 0.3, z) });
    });
  }
  function setBotCount(i, n, active) {
    const s = seats[i]; if (!s) return;
    if (s.count !== n) {
      s.fan.clear();
      const shown = Math.min(n, 12);
      for (let k = 0; k < shown; k++) {
        const m = cardMesh(null); m.scale.setScalar(0.62);
        const t = shown === 1 ? 0 : k / (shown - 1) - 0.5;
        m.position.set(t * Math.min(2.2, shown * 0.32), 0.05 + k * 0.012, -Math.cos(t * 1.4) * 0.1);
        m.rotation.y = -t * 0.9;
        s.fan.add(m);
      }
    }
    if (s.count !== n || s.active !== active) drawLabel(s.label, s.pl.emoji, s.pl.name, n, active);
    s.count = n; s.active = active;
  }
  function seatPos(p) { return p === 0 ? HUMAN_POS.clone() : seats[p - 1].world.clone(); }

  // vols de cartes
  const flights = [];
  function fly({ from, to, card = null, duration = 420, spin = 0, arc = 1.2 }) {
    return new Promise((resolve) => {
      if (duration <= 0) { resolve(); return; }
      const m = cardMesh(card); scene.add(m);
      flights.push({ m, from: from.clone(), to: to.clone(), duration, spin, arc, t0: performance.now(), resolve });
    });
  }
  function updateFlights(now) {
    for (let i = flights.length - 1; i >= 0; i--) {
      const f = flights[i];
      const k = Math.min(1, (now - f.t0) / f.duration), e = ease(k);
      f.m.position.lerpVectors(f.from, f.to, e);
      f.m.position.y += Math.sin(k * Math.PI) * f.arc;
      f.m.rotation.y = f.spin * e;
      f.m.rotation.x = Math.sin(k * Math.PI) * 0.4;
      if (k >= 1) { scene.remove(f.m); flights.splice(i, 1); f.resolve(); }
    }
  }

  // cadrage selon le ratio
  function resize() {
    const w = Math.max(1, stage.clientWidth), h = Math.max(1, stage.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const elev = 62 * Math.PI / 180;
    const t = Math.tan((camera.fov * Math.PI) / 360);
    const needH = 5.3 / (t * camera.aspect) ;
    const needV = (5.3 * Math.sin(elev) + 1.0) / t;
    const d = Math.max(needH, needV);
    camera.position.set(0, Math.sin(elev) * d, Math.cos(elev) * d + 0.4);
    camera.lookAt(0, 0, 0.4);
    camera.updateProjectionMatrix();
  }

  let lastT = performance.now();
  let pulse = 0;
  function render(now = performance.now()) {
    const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now; pulse += dt;
    dirRing.rotation.y -= dir * dt * 0.6;
    if (popT0 >= 0) {
      const k = Math.min(1, (now - popT0) / 400);
      dirRing.scale.setScalar(1 + 0.25 * ease(k < 0.5 ? k * 2 : 2 - k * 2));
      if (k >= 1) { popT0 = -1; dirRing.scale.setScalar(1); }
    }
    seats.forEach((s) => { s.ring.material.opacity = s.active ? 0.55 + Math.sin(pulse * 6) * 0.35 : 0; });
    updateFlights(now);
    renderer.render(scene, camera);
  }

  function screenOf(v) {
    const p = v.clone().project(camera); const r = canvas.getBoundingClientRect();
    return { x: r.left + ((p.x + 1) / 2) * r.width, y: r.top + ((1 - p.y) / 2) * r.height };
  }

  return {
    renderer, scene, camera, resize, render, fly, seatPos, setupSeats, setBotCount, setDiscard, clearDiscard, setColor, setDrawCount,
    setDir, screenOf, drawPos: DRAW_POS, discardPos: DISCARD_POS,
  };
}
