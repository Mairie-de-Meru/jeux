import * as THREE from 'three';
import { createAvatars, EDGE, EDGE_COMPACT } from './avatars.js';
import { fitCamera } from '../logic/framing.js';
import { faceCanvas, backCanvas, cardKey, COLOR_HEX } from './cardart.js';

const CW = 0.9, CH = 1.35, CT = 0.025;
const cardGeo = new THREE.BoxGeometry(CW, CT, CH);
const SEATS = { 1: [[0, -3.4]], 2: [[-3.3, -0.7], [3.3, -0.7]], 3: [[-3.4, 0.1], [0, -3.4], [3.4, 0.1]] };
// petits écrans : places rapprochées (les éventails latéraux restent hors de la défausse grossie)
const SEATS_COMPACT = { 1: [[0, -3.0]], 2: [[-3.2, -0.7], [3.2, -0.7]], 3: [[-3.25, 0.1], [0, -3.0], [3.25, 0.1]] };
export const CENTER = 1.5;   // échelle des cartes du centre (pioche, défausse)
const FAN_S = 0.7;           // échelle des cartes de dos des robots
const FAN_R = { compact: 2.55, wide: 2.72 }; // rayon du centre de l'éventail : entre la pioche/défausse et l'avatar
const DISC_K = 1.22;         // échelle du disque de couleur (rayon 1.4 : ne touche pas la pioche)
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
  s.scale.set(1.75, 0.525, 1); s.renderOrder = 10;
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
  const feltMat = new THREE.MeshStandardMaterial({ color: 0x1f9d6b, roughness: 0.95 });
  const felt = new THREE.Mesh(new THREE.CylinderGeometry(4.8, 4.8, 0.3, 64), [new THREE.MeshStandardMaterial({ color: 0x1f9d6b, roughness: 0.95 }), feltMat, new THREE.MeshStandardMaterial({ color: 0x1f9d6b })]);
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
  colorDisc.scale.set(DISC_K, 1, DISC_K);
  colorDisc.position.set(DISCARD_POS.x, 0.0, DISCARD_POS.z); colorDisc.receiveShadow = true; scene.add(colorDisc);

  // pioche
  const drawPile = new THREE.Mesh(cardGeo, [sideMat, sideMat, getBackMat(), getBackMat(), sideMat, sideMat]);
  drawPile.castShadow = true; scene.add(drawPile);
  function setDrawCount(n) {
    const h = Math.max(0.02, Math.min(0.7, n * 0.007));
    drawPile.scale.set(CENTER, h / CT, CENTER); drawPile.position.set(DRAW_POS.x, h / 2 + 0.02, DRAW_POS.z);
    drawPile.visible = n > 0;
  }

  // défausse
  let discardMeshes = [];
  function setDiscard(card, color, immediate = false) {
    const m = cardMesh(card); m.scale.setScalar(CENTER);
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
  const avatars = createAvatars(scene);
  let seats = [];
  let compact = false;
  const seatTable = () => (compact ? SEATS_COMPACT : SEATS);
  function placeSeat(s, i, n) {
    const [x, z] = seatTable()[n][i];
    s.group.position.set(x, 0, z); s.group.rotation.y = Math.atan2(-x, -z); // le +z local regarde le centre
    s.world.set(x, 0.3, z);
    s.side = Math.abs(x) > Math.abs(z); // robot de gauche ou de droite
    const fr = compact ? FAN_R.compact : FAN_R.wide;
    if (s.side) { // robots de côté : colonne parallèle à l'axe z, un peu vers le bas de l'écran (sous la bulle)
      s.group.updateMatrixWorld(true);
      const p = s.group.worldToLocal(new THREE.Vector3(Math.sign(x) * fr, 0, z + (z < -0.3 ? 1.4 : 0.6))); // 2 robots (places hautes) : plus bas, sous le prénom
      s.fan.position.set(p.x, 0, p.z);
      s.fan.rotation.y = -Math.sign(x) * Math.PI / 2 - s.group.rotation.y;
    } else { s.fan.position.set(0, 0, Math.hypot(x, z) - fr); s.fan.rotation.y = 0; }
  }
  function setCompact(c) {
    if (c === compact) return;
    compact = c;
    seats.forEach((s, i) => placeSeat(s, i, seats.length));
    avatars.relayout(compact ? EDGE_COMPACT : EDGE);
  }
  function clearSeats() { seats.forEach((s) => scene.remove(s.group)); seats = []; }
  function setupSeats(players) {
    clearSeats();
    const bots = players.length - 1;
    for (let i = 0; i < bots; i++) {
      const pl = players[i + 1];
      const group = new THREE.Group();
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.06, 8, 40), new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0 }));
      ring.rotation.x = Math.PI / 2; ring.position.y = 0.02; group.add(ring);
      const fan = new THREE.Group(); group.add(fan);
      const label = labelSprite(); group.add(label);
      scene.add(group);
      const s = { group, fan, ring, label, pl, count: -1, active: false, world: new THREE.Vector3() };
      placeSeat(s, i, bots); seats.push(s);
    }
    avatars.setup(seats, players, compact ? EDGE_COMPACT : EDGE);
    resize();
  }
  function setBotCount(i, n, active) {
    const s = seats[i]; if (!s) return;
    if (s.count !== n) {
      s.fan.clear();
      const shown = Math.min(n, 12);
      for (let k = 0; k < shown; k++) {
        const m = cardMesh(null); m.scale.setScalar(FAN_S); m.userData.fan = true;
        const t = shown === 1 ? 0 : k / (shown - 1) - 0.5;
        if (s.side) { // robots de côté : cartes debout à l'écran (comme celles du haut), étalées le long du bord
          m.position.set(t * Math.min(2.6, shown * 0.4), 0.05 + k * 0.012, 0);
          m.rotation.y = Math.PI / 2 - t * 0.25;
        } else {
          m.position.set(t * Math.min(3.0, shown * 0.44), 0.05 + k * 0.012, -Math.cos(t * 1.4) * 0.14);
          m.rotation.y = -t * 0.9;
        }
        s.fan.add(m);
      }
    }
    avatars.setCount(i, n, active);
    if (s.count !== n || s.active !== active) drawLabel(s.label, s.pl.emoji, s.pl.name, n, active);
    s.count = n; s.active = active;
  }
  function seatPos(p) { return p === 0 ? HUMAN_POS.clone() : seats[p - 1].world.clone(); }

  // vols de cartes
  const flights = [];
  function fly({ from, to, card = null, duration = 420, spin = 0, arc = 1.2, land = false }) {
    return new Promise((resolve) => {
      if (duration <= 0) { resolve(); return; }
      const m = cardMesh(card); scene.add(m);
      m.userData.hex = card && card.color ? COLOR_HEX[card.color] : '#ffd23f';
      // taille : celle des cartes du centre au départ / à l'arrivée sur la pioche ou la défausse
      const near = (v) => Math.hypot(v.x - DISCARD_POS.x, v.z - DISCARD_POS.z) < 0.6 || Math.hypot(v.x - DRAW_POS.x, v.z - DRAW_POS.z) < 0.6;
      const s0 = near(from) ? CENTER : 1, s1 = land || near(to) ? CENTER : 1;
      m.scale.setScalar(s0);
      flights.push({ m, from: from.clone(), to: to.clone(), duration, spin, arc, land, s0, s1, t0: performance.now(), resolve });
    });
  }
  function updateFlights(now) {
    for (let i = flights.length - 1; i >= 0; i--) {
      const f = flights[i];
      const k = Math.min(1, (now - f.t0) / f.duration), e = ease(k);
      f.m.position.lerpVectors(f.from, f.to, e);
      f.m.position.y += Math.sin(k * Math.PI) * f.arc;
      f.m.rotation.y = f.spin * e;
      f.m.scale.setScalar(f.s0 + (f.s1 - f.s0) * e);
      f.m.rotation.x = Math.sin(k * Math.PI) * 0.4;
      if (k >= 1) {
        scene.remove(f.m); flights.splice(i, 1);
        if (f.land) { burst(f.to, f.m.userData.hex); landFx = { t0: now }; }
        f.resolve();
      }
    }
  }

  // particules (pool) et atterrissage en squash
  const pGeo = new THREE.SphereGeometry(0.06, 6, 6);
  const pool = Array.from({ length: 28 }, () => {
    const m = new THREE.Mesh(pGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true }));
    m.visible = false; scene.add(m); return { m, v: new THREE.Vector3(), life: 0 };
  });
  function burst(at, hex) {
    let n = 0;
    for (const p of pool) {
      if (p.life > 0 || n >= 14) continue;
      n++;
      const a = Math.random() * Math.PI * 2, sp = 1.2 + Math.random() * 1.6;
      p.v.set(Math.cos(a) * sp, 1.8 + Math.random() * 1.6, Math.sin(a) * sp);
      p.m.position.set(at.x, 0.25, at.z); p.m.material.color.set(Math.random() < 0.5 ? hex : '#ffffff');
      p.m.visible = true; p.life = 0.6;
    }
  }
  let landFx = null;
  let boost = 0;
  const boostDir = (ms) => { boost = ms / 1000; };
  const shock = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 64), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
  shock.rotation.x = -Math.PI / 2; shock.position.set(DISCARD_POS.x, 0.07, DISCARD_POS.z); shock.visible = false; scene.add(shock);
  let shockT0 = -1;
  function shockwave(hex) { shock.material.color.set(hex || '#ffffff'); shockT0 = performance.now(); shock.visible = true; }
  function updateFx(now, dt) {
    for (const p of pool) {
      if (p.life <= 0) continue;
      p.life -= dt; p.v.y -= 7 * dt; p.m.position.addScaledVector(p.v, dt);
      p.m.material.opacity = Math.max(0, p.life / 0.6); p.m.scale.setScalar(Math.max(0.2, p.life / 0.6));
      if (p.life <= 0) p.m.visible = false;
    }
    if (shockT0 >= 0) {
      const k = Math.min(1, (now - shockT0) / 800);
      shock.scale.setScalar(CENTER * (0.6 + 8 * ease(k))); shock.material.opacity = 0.85 * (1 - k);
      if (k >= 1) { shockT0 = -1; shock.visible = false; }
    }
    const top = discardMeshes[discardMeshes.length - 1];
    if (landFx && top) {
      const k = Math.min(1, (now - landFx.t0) / 260);
      const q = Math.sin(k * Math.PI) * (1 - k);
      top.scale.set(CENTER * (1 + 0.22 * q), CENTER * (1 + 3 * q), CENTER * (1 + 0.22 * q));
      if (k >= 1) { top.scale.setScalar(CENTER); landFx = null; }
    }
  }

  // point 3D sous un point de l'écran (plan horizontal à la hauteur y) ; null si hors portée
  function worldFromScreen(sx, sy, y = 1) {
    const r = canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((sx - r.left) / r.width) * 2 - 1, -((sy - r.top) / r.height) * 2 + 1);
    const ray = new THREE.Raycaster(); ray.setFromCamera(ndc, camera);
    const hit = ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -y), new THREE.Vector3());
    return hit && hit.distanceTo(camera.position) < 40 ? hit : null;
  }

  // table : texture du plateau (recadrage carré au centre de l'image)
  function setTable(img) {
    const t = new THREE.Texture(img);
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    const ratio = img.width / img.height;
    const z = 0.86; // zoom : le plateau de l'image remplit le disque
    t.repeat.set(z / ratio, z); t.offset.set((1 - z / ratio) / 2, (1 - z) / 2);
    t.needsUpdate = true;
    feltMat.map = t; feltMat.color.set(0xffffff); feltMat.needsUpdate = true;
  }

  // cadrage : la boîte utile (cartes du centre, éventails, avatars, bulles, prénoms) remplit la scène,
  // hors pastille de message et boutons posés sur la scène ; le rebord de la table peut être coupé
  const V = new THREE.Vector3();
  function framePoints() {
    const P = [];
    const hw = (CW / 2) * CENTER, hh = (CH / 2) * CENTER, R = 1.15 * DISC_K;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) P.push([DRAW_POS.x + sx * hw, 0.3, DRAW_POS.z + sz * hh]);
    P.push([DISCARD_POS.x + R, 0, DISCARD_POS.z], [DISCARD_POS.x - R, 0, DISCARD_POS.z], [DISCARD_POS.x, 0, DISCARD_POS.z - R], [DISCARD_POS.x, 0, DISCARD_POS.z + R]);
    // anneau de sens (toujours visible : il indique à qui le tour)
    for (let i = 0; i < 16; i++) P.push([Math.cos((i * Math.PI) / 8) * 2.9, 0.05, Math.sin((i * Math.PI) / 8) * 2.9]);
    if (!seats.length) { // pas encore de partie : cadre le bord de la table
      const r = compact ? EDGE_COMPACT : EDGE;
      for (let i = 0; i < 8; i++) P.push([Math.cos((i * Math.PI) / 4) * r, 0, Math.sin((i * Math.PI) / 4) * r]);
    }
    seats.forEach((s) => {
      s.group.updateMatrixWorld(true);
      s.fan.children.forEach((m) => { for (const x of [-CW / 2, CW / 2]) for (const z of [-CH / 2, CH / 2]) { V.set(x, 0, z); m.localToWorld(V); P.push([V.x, V.y, V.z]); } });
    });
    return P.concat(avatars.framePoints());
  }
  // marges (px) dans la zone utile (#stage) : pastille de message en haut, bouton « Piocher » posé sur la scène
  function stageMargins(sr) {
    const m = { top: 6, bottom: 6, left: 6, right: 6 };
    const toast = stage.querySelector('#toast');
    if (toast && getComputedStyle(toast).position !== 'fixed') m.top = Math.max(m.top, toast.offsetTop + Math.max(toast.offsetHeight, 30) + 6);
    const bar = document.getElementById('bar');
    if (bar) {
      const b = bar.getBoundingClientRect();
      if (b.width && b.top < sr.bottom && b.bottom > sr.top + sr.height / 2 && b.left < sr.right && b.right > sr.left) m.bottom = Math.max(m.bottom, sr.bottom - b.top + 6);
    }
    return m;
  }
  function resize() {
    // cadrage calculé dans la zone utile (#stage) ; le canevas part du même coin haut-gauche mais va jusqu'aux
    // bords bas et droit de la fenêtre, sous le panneau translucide (setViewOffset : même projection, image prolongée)
    const st = stage.getBoundingClientRect();
    const w = Math.max(1, Math.round(window.innerWidth - st.left)), h = Math.max(1, Math.round(window.innerHeight - st.top));
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    renderer.setSize(w, h, false);
    const sw = Math.max(1, stage.clientWidth), sh = Math.max(1, stage.clientHeight);
    camera.aspect = sw / sh;
    setCompact(sw < 820 || camera.aspect < 0.9);
    const elevDeg = camera.aspect < 0.9 ? 78 : 62;
    const r = fitCamera({ points: framePoints(), width: sw, height: sh, fovDeg: camera.fov, elevDeg, margins: stageMargins(st), alignY: 'center' });
    camera.setViewOffset(sw, sh, 0, 0, w, h);
    camera.position.set(...r.position);
    camera.lookAt(...r.target);
    camera.updateProjectionMatrix();
  }

  let lastT = performance.now();
  let pulse = 0;
  function render(now = performance.now()) {
    const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now; pulse += dt;
    boost = Math.max(0, boost - dt);
    dirRing.rotation.y -= dir * dt * (0.6 + 6 * Math.min(1, boost));
    if (popT0 >= 0) {
      const k = Math.min(1, (now - popT0) / 400);
      dirRing.scale.setScalar(1 + 0.25 * ease(k < 0.5 ? k * 2 : 2 - k * 2));
      if (k >= 1) { popT0 = -1; dirRing.scale.setScalar(1); }
    }
    seats.forEach((s) => { s.ring.material.opacity = s.active ? 0.55 + Math.sin(pulse * 6) * 0.35 : 0; });
    updateFlights(now);
    updateFx(now, dt);
    avatars.update(now);
    renderer.render(scene, camera);
  }

  function screenOf(v) {
    const p = v.clone().project(camera); const r = canvas.getBoundingClientRect();
    return { x: r.left + ((p.x + 1) / 2) * r.width, y: r.top + ((1 - p.y) / 2) * r.height };
  }

  return {
    renderer, scene, camera, resize, render, fly, worldFromScreen, boostDir, shockwave, centerPos: () => new THREE.Vector3(0, 0, 0), setTable, react: avatars.react, setAvatarImages: avatars.setImages, seatPos, setupSeats, setBotCount, setDiscard, clearDiscard, setColor, setDrawCount,
    setDir, screenOf, drawPos: DRAW_POS, discardPos: DISCARD_POS, centerScale: CENTER,
  };
}
