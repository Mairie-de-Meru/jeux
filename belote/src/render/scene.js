import * as THREE from 'three';
import { faceCanvas, backCanvas, cardKey, drawSuit, SUIT_COLOR } from './cardart.js';
import { TABLE, keyPoints, frameCamera } from '../logic/layout.js';

const CW = 0.9, CH = 1.35, CT = 0.025;
const cardGeo = new THREE.BoxGeometry(CW, CT, CH);
// places : 0 bas (toi), 1 droite, 2 haut, 3 gauche
// plan rapproché et cadrage serré : voir TABLE et frameCamera dans logic/layout.js
export const SEAT_POS = TABLE.seat;
const LABEL_POS = TABLE.label;
const SLOT_POS = TABLE.slot;
const TRICK_S = TABLE.trickScale, TURNED_S = TABLE.turnedScale, FAN_S = TABLE.fanScale;
const FRAME_POINTS = keyPoints();
const ELEV_DEG = 72;

const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const sideMat = new THREE.MeshStandardMaterial({ color: 0xfffdf6, roughness: 0.7 });

function tex(canvas) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
let backMat = null;
const faceMats = new Map();
const getBackMat = () => backMat || (backMat = new THREE.MeshStandardMaterial({ map: tex(backCanvas()), roughness: 0.6, alphaTest: 0.5 }));
function getFaceMat(card) {
  const k = cardKey(card);
  if (!faceMats.has(k)) faceMats.set(k, new THREE.MeshStandardMaterial({ map: tex(faceCanvas(card)), roughness: 0.6, alphaTest: 0.5 }));
  return faceMats.get(k);
}
// face visible dessus (card) ou dos (null)
function cardMesh(card) {
  const top = card ? getFaceMat(card) : getBackMat();
  const m = new THREE.Mesh(cardGeo, [sideMat, sideMat, top, getBackMat(), sideMat, sideMat]);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

function labelSprite() {
  const cv = document.createElement('canvas'); cv.width = 260; cv.height = 96;
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false }));
  s.scale.set(TABLE.labelSize[0], TABLE.labelSize[1], 1); s.renderOrder = 10;
  s.userData = { cv, t };
  return s;
}
function drawLabel(sprite, emoji, name, { active, taker, count }) {
  const { cv, t } = sprite.userData; const x = cv.getContext('2d');
  const W = 260;
  x.clearRect(0, 0, W, 96);
  x.fillStyle = active ? '#ffd23f' : 'rgba(255,255,255,0.92)';
  x.beginPath(); x.roundRect(3, 4, W - 6, 88, 44); x.fill();
  x.lineWidth = 5; x.strokeStyle = taker ? '#e07a00' : active ? '#e07a00' : 'rgba(40,40,80,0.35)'; x.stroke();
  x.fillStyle = '#2b2d42'; x.textBaseline = 'middle';
  x.font = '44px sans-serif'; x.textAlign = 'left'; x.fillText(emoji, 14, 50);
  // prénom aussi grand que possible dans la place restante (étoile du preneur à droite)
  const room = W - 66 - (taker || count != null ? 44 : 16);
  let fs = 44; const nm = name.slice(0, 9);
  do { x.font = `800 ${fs}px "Trebuchet MS", Arial, sans-serif`; } while (x.measureText(nm).width > room && --fs > 20);
  x.fillText(nm, 64, 50);
  if (taker) { x.textAlign = 'right'; x.font = '40px sans-serif'; x.fillStyle = '#e07a00'; x.fillText('★', W - 12, 50); }
  else if (count != null) { x.textAlign = 'right'; x.font = '900 36px "Trebuchet MS", Arial, sans-serif'; x.fillStyle = '#c0392b'; x.fillText(String(count), W - 14, 52); }
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

  // table ronde : tapis vert, bord en bois
  const felt = new THREE.Mesh(new THREE.CylinderGeometry(4.8, 4.8, 0.3, 64), new THREE.MeshStandardMaterial({ color: 0x1f9d6b, roughness: 0.95 }));
  felt.position.y = -0.16; felt.receiveShadow = true; scene.add(felt);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(4.8, 0.22, 16, 80), new THREE.MeshStandardMaterial({ color: 0x8a4b2a, roughness: 0.6 }));
  rim.rotation.x = Math.PI / 2; rim.position.y = -0.02; scene.add(rim);
  const inner = new THREE.Mesh(new THREE.TorusGeometry(2.5, 0.03, 8, 80), new THREE.MeshBasicMaterial({ color: 0x7ee0b0, transparent: true, opacity: 0.45 }));
  inner.rotation.x = Math.PI / 2; inner.position.y = 0.01; scene.add(inner);

  // pastille d'atout
  const trumpCv = document.createElement('canvas'); trumpCv.width = trumpCv.height = 128;
  const trumpTex = new THREE.CanvasTexture(trumpCv); trumpTex.colorSpace = THREE.SRGBColorSpace;
  const trumpDisc = new THREE.Mesh(new THREE.CircleGeometry(TABLE.trumpR, 40), new THREE.MeshBasicMaterial({ map: trumpTex, transparent: true }));
  trumpDisc.rotation.x = -Math.PI / 2; trumpDisc.position.set(TABLE.trump[0], 0.05, TABLE.trump[1]); trumpDisc.visible = false; scene.add(trumpDisc);
  function setTrump(suit) {
    trumpDisc.visible = !!suit;
    if (!suit) return;
    const x = trumpCv.getContext('2d'); x.clearRect(0, 0, 128, 128);
    x.fillStyle = '#fffdf6'; x.beginPath(); x.arc(64, 64, 60, 0, Math.PI * 2); x.fill();
    x.lineWidth = 8; x.strokeStyle = '#ffd23f'; x.stroke();
    drawSuit(x, suit, 64, 64, 34, SUIT_COLOR[suit]);
    trumpTex.needsUpdate = true;
  }

  // carte retournée
  let turnedMesh = null;
  function setTurned(card) {
    if (turnedMesh) { scene.remove(turnedMesh); turnedMesh = null; }
    if (!card) return;
    turnedMesh = cardMesh(card); turnedMesh.scale.setScalar(TURNED_S); turnedMesh.position.set(0, 0.08, 0); turnedMesh.rotation.y = 0.12;
    scene.add(turnedMesh);
  }

  // places
  let seats = [];
  function setupSeats(players) {
    seats.forEach((s) => scene.remove(s.group)); seats = [];
    SEAT_POS.forEach(([x, z], i) => {
      const group = new THREE.Group(); group.position.set(x, 0, z);
      group.rotation.y = Math.atan2(-x, -z); // le +z local regarde le centre
      const ring = new THREE.Mesh(new THREE.TorusGeometry(TABLE.ringR, 0.05, 8, 40), new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0 }));
      ring.rotation.x = Math.PI / 2; ring.position.y = 0.02; group.add(ring);
      const fan = new THREE.Group(); group.add(fan);
      scene.add(group);
      const label = labelSprite(); label.position.set(...LABEL_POS[i]); scene.add(label);
      seats.push({ group, fan, ring, label, pl: players[i], count: -1, hidden: false, active: false, taker: false, world: new THREE.Vector3(x, 0.3, z) });
    });
  }
  function setCounts(counts, hiddenSeat) {
    seats.forEach((s, i) => {
      const n = counts[i], hidden = i === hiddenSeat;
      if (s.count !== n || s.hidden !== hidden) {
        s.fan.clear();
        const shown = hidden ? 0 : Math.min(n, 8);
        for (let k = 0; k < shown; k++) {
          const m = cardMesh(null); m.scale.setScalar(FAN_S);
          const t = shown === 1 ? 0 : k / (shown - 1) - 0.5;
          const f = FAN_S / 0.6; // écart proportionnel à la taille des cartes
          m.position.set(t * Math.min(2.3, shown * 0.34) * f, 0.05 + k * 0.012, -Math.cos(t * 1.4) * 0.1 * f);
          m.rotation.y = -t * 0.9;
          s.fan.add(m);
        }
        s.count = n; s.hidden = hidden;
        s.dirty = true;
      }
    });
  }
  function setLabels(players, { current = -1, taker = -1 } = {}) {
    seats.forEach((s, i) => {
      s.pl = players[i];
      const active = i === current, isTaker = i === taker;
      if (s.dirty || s.active !== active || s.taker !== isTaker || !s.drawn) {
        drawLabel(s.label, s.pl.emoji, s.pl.name, { active, taker: isTaker, count: null });
        s.active = active; s.taker = isTaker; s.dirty = false; s.drawn = true;
      }
    });
  }
  const seatPos = (p) => seats[p] ? seats[p].world.clone() : new THREE.Vector3(...[SEAT_POS[p][0], 0.3, SEAT_POS[p][1]]);

  // animations
  const anims = [];
  const pops = [];
  // échelle : de s0 (échelle actuelle par défaut) à s1 ; shrink = arrivée à la moitié
  function animate({ m, from, to, duration = 420, spin = 0, arc = 1.1, shrink = false, remove = false, s0 = m.scale.x, s1 = shrink ? s0 * 0.5 : s0 }) {
    return new Promise((resolve) => {
      if (duration <= 0) { m.position.copy(to); m.scale.setScalar(s1); if (remove) scene.remove(m); resolve(); return; }
      anims.push({ m, from: from.clone(), to: to.clone(), duration, spin, arc, s0, s1, remove, t0: performance.now(), resolve });
    });
  }
  function fly({ from, to, card = null, duration = 420, spin = 0, arc = 1.1, s0 = 1, s1 = 1 }) {
    if (duration <= 0) return Promise.resolve();
    const m = cardMesh(card); m.scale.setScalar(s0); scene.add(m);
    return animate({ m, from, to, duration, spin, arc, remove: true, s0, s1 });
  }
  function updateAnims(now) {
    for (let i = anims.length - 1; i >= 0; i--) {
      const f = anims[i];
      const k = Math.min(1, (now - f.t0) / f.duration), e = ease(k);
      f.m.position.lerpVectors(f.from, f.to, e);
      f.m.position.y += Math.sin(k * Math.PI) * f.arc;
      f.m.rotation.x = Math.sin(k * Math.PI) * 0.35;
      if (f.spin) f.m.rotation.y = f.spin * e;
      if (f.s0 !== f.s1) f.m.scale.setScalar(f.s0 + (f.s1 - f.s0) * e);
      if (k >= 1) { if (f.remove) scene.remove(f.m); f.m.rotation.x = 0; anims.splice(i, 1); f.resolve(); }
    }
    for (let i = pops.length - 1; i >= 0; i--) {
      const p = pops[i], k = Math.min(1, (now - p.t0) / 260);
      const sq = 1 + 0.25 * Math.sin(k * Math.PI);
      const b = p.base;
      p.m.scale.set(b * sq, b * (1 - 0.5 * Math.sin(k * Math.PI)), b * sq);
      if (k >= 1) { p.m.scale.setScalar(b); pops.splice(i, 1); }
    }
  }

  // pli
  const trickMeshes = new Map();
  const slot = (seat, n = 0) => new THREE.Vector3(SLOT_POS[seat][0], 0.06 + n * 0.02, SLOT_POS[seat][1]);
  function placeTrick(seat, card, pop = true) {
    const old = trickMeshes.get(seat); if (old) scene.remove(old);
    const m = cardMesh(card); m.scale.setScalar(TRICK_S);
    m.position.copy(slot(seat, trickMeshes.size)); m.rotation.y = ((seat * 37) % 11 - 5) * 0.025;
    scene.add(m); trickMeshes.set(seat, m);
    if (pop) pops.push({ m, base: TRICK_S, t0: performance.now() });
    return m;
  }
  async function playCard(seat, card, duration = 420) {
    const to = slot(seat, trickMeshes.size);
    await fly({ from: seatPos(seat).setY(0.4), to: to.clone().setY(0.5), card, duration, spin: 0.2, arc: 1.0, s0: FAN_S * 1.4, s1: TRICK_S });
    placeTrick(seat, card, duration > 0);
  }
  function clearTrick() { trickMeshes.forEach((m) => scene.remove(m)); trickMeshes.clear(); }
  async function collectTrick(winner, duration = 520) {
    const target = seatPos(winner).setY(0.3);
    const list = [...trickMeshes.values()]; trickMeshes.clear();
    await Promise.all(list.map((m) => animate({ m, from: m.position, to: target, duration, arc: 0.6, shrink: true, remove: true })));
  }
  async function takeTurned(seat, duration = 450) {
    if (!turnedMesh) return;
    const m = turnedMesh; turnedMesh = null;
    await animate({ m, from: m.position, to: seatPos(seat).setY(0.3), duration, arc: 0.8, shrink: true, remove: true });
  }

  // cadrage selon le ratio
  function resize() {
    const w = Math.max(1, canvas.clientWidth), h = Math.max(1, canvas.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // marges en px : 6 autour, 30 en bas (compte des points du palier 1)
    const margin = { x: 12 / w, top: 12 / h, bottom: 60 / h };
    const f = frameCamera({ points: FRAME_POINTS, aspect: camera.aspect, fovDeg: camera.fov, elevDeg: ELEV_DEG, margin });
    camera.position.set(...f.position);
    camera.lookAt(...f.target);
    camera.updateProjectionMatrix();
  }

  let lastT = performance.now(), pulse = 0;
  function render(now = performance.now()) {
    const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now; pulse += dt;
    seats.forEach((s) => { s.ring.material.opacity = s.active ? 0.55 + Math.sin(pulse * 6) * 0.35 : 0; });
    updateAnims(now);
    renderer.render(scene, camera);
  }

  function screenOf(v) {
    const p = v.clone().project(camera); const r = canvas.getBoundingClientRect();
    return { x: r.left + ((p.x + 1) / 2) * r.width, y: r.top + ((1 - p.y) / 2) * r.height };
  }

  return {
    renderer, scene, camera, resize, render, fly, seatPos, setupSeats, setCounts, setLabels, setTurned, takeTurned, setTrump,
    playCard, placeTrick, clearTrick, collectTrick, screenOf,
    labelPos: (i) => new THREE.Vector3(...LABEL_POS[i]),
  };
}
