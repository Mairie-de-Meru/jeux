import * as THREE from 'three';
import { faceCanvas, backCanvas, cardKey } from './cardart.js';
import { seatLayout, TA0, TB0, POT, DECK, BOARD, BOARD_S, BOARD_GAP } from '../logic/layout.js';

const CW = 0.9, CH = 1.35, CT = 0.025;
const cardGeo = new THREE.BoxGeometry(CW, CT, CH);
export const DECK_POS = new THREE.Vector3(DECK.x, 0.1, DECK.z);
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

// Jetons : géométrie et matériaux partagés
const chipGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.06, 20); // jetons décoratifs, petits
const CHIP_DEN = [[1000, 0xf2b21f], [500, 0x8e4fd1], [100, 0x2b2d42], [25, 0x2ba866], [10, 0x2d78d6], [5, 0xe8454d], [1, 0xf4f4f4]];
const chipMats = new Map();
const chipMat = (hex) => {
  if (!chipMats.has(hex)) chipMats.set(hex, new THREE.MeshStandardMaterial({ color: hex, roughness: 0.45 }));
  return chipMats.get(hex);
};
// Piles de jetons pour un montant (colonnes par valeur, 8 jetons maximum par colonne).
function chipStack(amount) {
  const g = new THREE.Group();
  let rest = amount, col = 0;
  const cols = [];
  for (const [v, hex] of CHIP_DEN) {
    const n = Math.floor(rest / v);
    if (n > 0) { cols.push([hex, Math.min(n, 8)]); rest -= n * v; }
    if (cols.length >= 4) break;
  }
  const off = ((cols.length - 1) * 0.48) / 2;
  for (const [hex, n] of cols) {
    for (let k = 0; k < n; k++) {
      const m = new THREE.Mesh(chipGeo, chipMat(hex));
      m.position.set(col * 0.48 - off, 0.035 + k * 0.064, 0);
      m.castShadow = true;
      g.add(m);
    }
    col++;
  }
  return g;
}

function dealerButton() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const x = cv.getContext('2d');
  x.fillStyle = '#fff'; x.fillRect(0, 0, 128, 128);
  x.fillStyle = '#e8454d'; x.beginPath(); x.arc(64, 64, 52, 0, Math.PI * 2); x.fill();
  x.fillStyle = '#fff'; x.font = '900 70px "Trebuchet MS", Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('D', 64, 70);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.09, 28), [new THREE.MeshStandardMaterial({ color: 0xffffff }), new THREE.MeshStandardMaterial({ map: tex(cv) }), new THREE.MeshStandardMaterial({ color: 0xffffff })]);
  m.castShadow = true;
  return m;
}

function ellipseTube(a, b, r, color) {
  const pts = [];
  for (let i = 0; i < 96; i++) { const t = (i / 96) * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(t) * a, 0, Math.sin(t) * b)); }
  const curve = new THREE.CatmullRomCurve3(pts, true);
  return new THREE.Mesh(new THREE.TubeGeometry(curve, 160, r, 12, true), new THREE.MeshStandardMaterial({ color, roughness: 0.6 }));
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
  Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 25 });
  scene.add(sun);

  // table ovale : demi-axes (a en x, b en z) adaptés au ratio de l'écran, reconstruite au resize
  const tableG = new THREE.Group(); scene.add(tableG);
  const felt = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.3, 72), new THREE.MeshStandardMaterial({ color: 0x1f9d6b, roughness: 0.95 }));
  felt.position.y = -0.16; felt.receiveShadow = true; tableG.add(felt);
  let rim = null, line = null, tableDims = '';
  function buildTable(a, b) {
    const key = a.toFixed(2) + 'x' + b.toFixed(2);
    if (key === tableDims) return;
    tableDims = key;
    felt.scale.set(a, 1, b);
    for (const m of [rim, line]) if (m) { tableG.remove(m); m.geometry.dispose(); m.material.dispose(); }
    rim = ellipseTube(a, b, 0.24, 0x8a4b2a); rim.position.y = -0.02; tableG.add(rim);
    line = ellipseTube(a - 0.75, b - 0.75, 0.03, 0x7ee0b0); line.position.y = 0.0; tableG.add(line);
  }
  buildTable(TA0, TB0);

  // emplacements du tableau + paquet
  const slotMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.14 });
  const slotPos = (i) => new THREE.Vector3((i - 2) * BOARD_GAP, 0.05, 0);
  for (let i = 0; i < 5; i++) {
    const s = new THREE.Mesh(cardGeo, slotMat); s.scale.set(BOARD_S, 0.4, BOARD_S);
    s.position.copy(slotPos(i)).setY(0.02); scene.add(s);
  }
  const deck = new THREE.Mesh(cardGeo, [sideMat, sideMat, getBackMat(), getBackMat(), sideMat, sideMat]);
  deck.scale.set(0.8, 8, 0.8); deck.position.copy(DECK_POS).setY(0.14); deck.castShadow = true; scene.add(deck);
  const POT_POS = new THREE.Vector3(POT.x, 0.02, POT.z);

  let board = [];
  function setBoard(cards) {
    board.forEach((m) => scene.remove(m)); board = [];
    cards.forEach((c, i) => {
      const m = cardMesh(c); m.scale.set(BOARD_S, 1, BOARD_S);
      m.position.copy(slotPos(i)); m.rotation.y = ((i * 37) % 7 - 3) * 0.012;
      scene.add(m); board.push(m);
    });
  }

  // pot
  let potGroup = null, potAmount = -1;
  function setPot(amount) {
    if (amount === potAmount) return;
    potAmount = amount;
    if (potGroup) scene.remove(potGroup);
    potGroup = chipStack(amount); potGroup.position.copy(POT_POS).add(new THREE.Vector3(0, 0, -0.12)); scene.add(potGroup);
    potLabel.textContent = amount > 0 ? '● ' + amount : '';
    potLabel.style.display = amount > 0 ? '' : 'none';
  }

  const dealerBtn = dealerButton(); dealerBtn.visible = false; scene.add(dealerBtn);

  // étiquettes DOM (texte net), projetées sur les places
  const labels = document.createElement('div'); labels.id = 'labels'; stage.appendChild(labels);
  const potLabel = document.createElement('div'); potLabel.className = 'pot-label'; potLabel.style.display = 'none'; labels.appendChild(potLabel);

  let seats = [], viewer = 0, layout = { portrait: false, a: TA0, b: TB0 };
  function layoutSeats() {
    const n = seats.length;
    const sx = Math.abs(screenOf(new THREE.Vector3(1, 0, 0)).x - screenOf(new THREE.Vector3(0, 0, 0)).x) || 30;
    const sz = Math.abs(screenOf(new THREE.Vector3(0, 0, 1)).y - screenOf(new THREE.Vector3(0, 0, 0)).y) || 30;
    const el0 = seats[0] && seats[0].el;
    const maxW = el0 ? parseFloat(getComputedStyle(el0).maxWidth) || el0.offsetWidth : 0; // pire cas : largeur maximale
    const H = el0 ? el0.offsetHeight : 0;
    const apply = (m) => {
      const lab = H ? { hx: maxW / 2 / sx + 0.1 + m, hz: H / 2 / sz + 0.15 + m, dz: 0.2 } : { hx: 0, hz: 0 };
      const L = seatLayout(n, layout.portrait, lab, { a: layout.a, b: layout.b });
      seats.forEach((s, i) => {
        const e = L.seats[(i - viewer + n) % n];
        s.pos = new THREE.Vector3(e.pos.x, 0, e.pos.z);
        s.bpos = new THREE.Vector3(e.bet.x, 0.02, e.bet.z);
        s.cpos = new THREE.Vector3(e.cards.x, 0.05, e.cards.z);
        s.dpos = new THREE.Vector3(e.dealer.x, 0.07, e.dealer.z);
        if (s.cs !== e.cards.s) { s.cs = e.cards.s; s.cardsKey = ''; }
        if (s.betGroup) s.betGroup.position.copy(s.bpos);
        if (s.cardsGroup) s.cardsGroup.position.copy(s.cpos);
      });
      placeLabels();
    };
    // marge croissante tant que l'étiquette (largeur maximale) recouvre des cartes à l'écran
    for (const m of [0, 0.15, 0.3, 0.5, 0.8, 1.1, 1.5]) {
      apply(m);
      if (!H || !labelsHitCards(maxW, H)) break;
    }
    placeLabels();
    placeDealer();
  }
  function labelsHitCards(w, h) {
    const V = new THREE.Vector3();
    for (const s of seats) {
      const cx = parseFloat(s.el.style.left), cy = parseFloat(s.el.style.top);
      const lr = { l: cx - w / 2, r: cx + w / 2, t: cy - h / 2, b: cy + h / 2 };
      for (const o of seats) {
        const k = o.cs || 0.8, xs = [], ys = [];
        for (const dx of [-1, 1]) for (const dz of [-1, 1]) {
          const q = screenOf(V.set(o.cpos.x + dx * (0.9 * k + 0.02), 0.05, o.cpos.z + dz * 0.675 * k));
          xs.push(q.x); ys.push(q.y);
        }
        if (Math.min(...xs) < lr.r && Math.max(...xs) > lr.l && Math.min(...ys) < lr.b && Math.max(...ys) > lr.t) return true;
      }
    }
    return false;
  }
  let dealerIdx = -1;
  function placeDealer() {
    const s = seats[dealerIdx];
    dealerBtn.visible = !!s;
    if (s) dealerBtn.position.copy(s.dpos);
  }
  function setDealer(i) { dealerIdx = i; placeDealer(); }

  function screenOf(v) {
    const p = v.clone().project(camera);
    return { x: ((p.x + 1) / 2) * stage.clientWidth, y: ((1 - p.y) / 2) * stage.clientHeight };
  }
  function placeLabels() {
    const pq = screenOf(POT_POS.clone().setY(0.25).add(new THREE.Vector3(0, 0, 0.22)));
    potLabel.style.left = pq.x + 'px'; potLabel.style.top = pq.y + 'px';
    for (const s of seats) {
      const q = screenOf(s.pos.clone().setY(0.4));
      const hw = s.el.offsetWidth / 2, hh = s.el.offsetHeight / 2;
      s.el.style.left = Math.min(Math.max(q.x, hw + 1), stage.clientWidth - hw - 1) + 'px';
      s.el.style.top = Math.min(Math.max(q.y, hh + 1), stage.clientHeight - hh - 1) + 'px';
    }
  }

  function clearSeats() {
    seats.forEach((s) => { s.el.remove(); if (s.betGroup) scene.remove(s.betGroup); if (s.cardsGroup) scene.remove(s.cardsGroup); });
    seats = [];
  }
  function setupSeats(players, v = 0) {
    clearSeats(); viewer = v; dealerIdx = -1;
    labels.classList.toggle('dense', players.length >= 5);
    players.forEach(() => {
      const el = document.createElement('div'); el.className = 'seat-label';
      el.innerHTML = '<div class="sl-name">🦊 Nom</div><div class="sl-stack">500</div><div class="sl-tag">tag</div>';
      labels.appendChild(el);
      seats.push({ el, key: '', bet: -1, cardsKey: '', betGroup: null, cardsGroup: null, pos: new THREE.Vector3(), bpos: new THREE.Vector3(), cpos: new THREE.Vector3() });
    });
    layoutSeats();
  }
  function setViewer(v) { if (v === viewer) return; viewer = v; layoutSeats(); }

  // s : { emoji, name, stack, bet, tag, state:'' | 'fold' | 'allin' | 'out' | 'win', active, me, cards:'none'|'back'|'face', faces }
  function setSeat(i, s) {
    const seat = seats[i]; if (!seat) return;
    const key = JSON.stringify([s.emoji, s.name, s.stack, s.bet, s.tag, s.state, s.active, s.me]);
    if (seat.key !== key) {
      seat.key = key;
      seat.el.className = `seat-label${s.active ? ' active' : ''}${s.me ? ' me' : ''}${s.state ? ' ' + s.state : ''}`;
      seat.el.children[0].textContent = `${s.emoji} ${s.name}`;
      seat.el.children[1].textContent = `${s.stack}`;
      seat.el.children[2].textContent = s.tag || '';
      seat.el.children[2].style.visibility = s.tag ? 'visible' : 'hidden';
    }
    if (seat.bet !== s.bet) {
      seat.bet = s.bet;
      if (seat.betGroup) scene.remove(seat.betGroup);
      seat.betGroup = s.bet > 0 ? chipStack(s.bet) : null;
      if (seat.betGroup) { seat.betGroup.position.copy(seat.bpos); scene.add(seat.betGroup); }
    }
    const ck = s.cards + (s.cards === 'face' ? (s.faces || []).map(cardKey).join() : '');
    if (seat.cardsKey !== ck) {
      seat.cardsKey = ck;
      if (seat.cardsGroup) scene.remove(seat.cardsGroup);
      seat.cardsGroup = null;
      if (s.cards !== 'none') {
        const grp = new THREE.Group();
        for (let k = 0; k < 2; k++) {
          const m = cardMesh(s.cards === 'face' && s.faces ? s.faces[k] : null);
          const cs = seat.cs || 0.8;
          m.scale.set(cs, 1, cs);
          m.position.set((k - 0.5) * (0.9 * cs + 0.04), k * 0.03, 0);
          grp.add(m);
        }
        grp.position.copy(seat.cpos); scene.add(grp); seat.cardsGroup = grp;
      }
    }
  }
  function clearTable() { setBoard([]); setPot(0); seats.forEach((s) => { s.key = ''; s.bet = -1; s.cardsKey = ''; if (s.betGroup) { scene.remove(s.betGroup); s.betGroup = null; } if (s.cardsGroup) { scene.remove(s.cardsGroup); s.cardsGroup = null; } }); }

  // vols (cartes ou jetons)
  const flights = [];
  function flyMesh(m, { from, to, duration = 420, spin = 0, arc = 1.2 }) {
    return new Promise((resolve) => {
      if (duration <= 0) { resolve(); return; }
      scene.add(m);
      flights.push({ m, from: from.clone(), to: to.clone(), duration, spin, arc, t0: performance.now(), resolve });
    });
  }
  const fly = ({ card = null, scale = 0.8, ...o }) => {
    if ((o.duration ?? 420) <= 0) return Promise.resolve();
    const m = cardMesh(card); m.scale.set(scale, 1, scale);
    return flyMesh(m, o);
  };
  const flyChips = ({ amount = 10, ...o }) => {
    if ((o.duration ?? 420) <= 0) return Promise.resolve();
    return flyMesh(chipStack(Math.min(amount, 60)), { arc: 0.9, ...o });
  };
  function updateFlights(now) {
    for (let i = flights.length - 1; i >= 0; i--) {
      const f = flights[i];
      const k = Math.min(1, (now - f.t0) / f.duration), e = ease(k);
      f.m.position.lerpVectors(f.from, f.to, e);
      f.m.position.y += Math.sin(k * Math.PI) * f.arc;
      f.m.rotation.y = f.spin * e;
      if (k >= 1) { scene.remove(f.m); flights.splice(i, 1); f.resolve(); }
    }
  }

  // cadrage : table verticale si l'écran est en hauteur ; ses demi-axes suivent le ratio pour remplir le canvas,
  // caméra plongeante et serrée (marges minimales) ; recalculé à chaque resize/rotation
  const ELEV = (72 * Math.PI) / 180, SIN = Math.sin(ELEV);
  const fitDist = (w, h, a, b) => {
    const t = Math.tan((camera.fov * Math.PI) / 360);
    const needH = (a + 0.4) / (t * (w / h));
    const needV = ((b + 0.4) * SIN + 0.15) / t;
    return Math.max(needH, needV);
  };
  function resize() {
    const w = Math.max(1, stage.clientWidth), h = Math.max(1, stage.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const portrait = h > w * 1.05;
    let a, b;
    if (portrait) { b = TA0; a = Math.min(Math.max((w / h) * (b + 0.4) * SIN - 0.4, TB0), 5.0); }
    else { a = TA0; b = Math.min(Math.max((h / w) * (a + 0.4) / SIN - 0.4, 4.2), 5.0); }
    a = Math.round(a * 20) / 20; b = Math.round(b * 20) / 20;
    // bande réservée en haut pour la pastille #toast : la table est cadrée dessous
    const top = Math.min(40, h * 0.1), r = top / h;
    const d = fitDist(w, h, a, b) / (1 - r);
    const shift = (r * d * Math.tan((camera.fov * Math.PI) / 360)) / SIN;
    if (portrait !== layout.portrait || layout.a !== a || layout.b !== b) {
      layout = { portrait, a, b };
      buildTable(a, b);
    }
    camera.position.set(0, SIN * d, Math.cos(ELEV) * d + 0.1 - shift);
    camera.lookAt(0, 0, 0.1 - shift);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    layoutSeats();
  }

  function render(now = performance.now()) {
    updateFlights(now);
    renderer.render(scene, camera);
  }

  return {
    renderer, scene, camera, resize, render, fly, flyChips, setupSeats, setViewer, setSeat, setBoard, setPot, setDealer, clearTable, screenOf,
    seatPos: (i) => seats[i].pos.clone().setY(0.3), betPos: (i) => seats[i].bpos.clone().setY(0.1), cardsPos: (i) => seats[i].cpos.clone(),
    cardScaleOf: (i) => seats[i].cs, slotPos, boardScale: BOARD_S, potPos: POT_POS, deckPos: DECK_POS.clone().setY(0.3), get layout() { return layout; },
  };
}
