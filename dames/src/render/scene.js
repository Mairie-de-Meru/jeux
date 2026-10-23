// Damier 3D : cadre bois, cases, pions (LatheGeometry), dames couronnées, picking et animations maison.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { FRAME, cameraFor, nearestTarget } from '../logic/layout.js';

export const COLORS = { white: 0xf4ead2, black: 0xe23b3b };
const TOP = 0.06; // hauteur de la surface de jeu
const PIECE_H = 0.22;

// ---------- easing maison ----------
export const ease = {
  inOut: (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2),
  out: (k) => 1 - Math.pow(1 - k, 3),
  back: (k) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); },
};

// ---------- géométries et matériaux partagés ----------
const profile = [[0, 0], [0.34, 0], [0.385, 0.03], [0.4, 0.08], [0.4, 0.15], [0.385, 0.19], [0.34, 0.22], [0.29, 0.22], [0.26, 0.19], [0, 0.19]].map(([x, y]) => new THREE.Vector2(x, y));
const pieceGeo = new THREE.LatheGeometry(profile, 36);
const crownBase = new THREE.CylinderGeometry(0.14, 0.16, 0.1, 20);
const crownTip = new THREE.ConeGeometry(0.045, 0.14, 10);
const discGeo = new THREE.CircleGeometry(0.27, 28).rotateX(-Math.PI / 2);
const ringGeo = new THREE.RingGeometry(0.42, 0.52, 36).rotateX(-Math.PI / 2);
const kingRingGeo = new THREE.RingGeometry(0.29, 0.335, 36).rotateX(-Math.PI / 2); // anneau doré sur la face supérieure des dames
const quadGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
const cellGeo = new THREE.BoxGeometry(1, 0.06, 1);
const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.02, ...extra });
const pieceMat = { white: mat(COLORS.white, { roughness: 0.42 }), black: mat(COLORS.black, { roughness: 0.4 }) };
const goldMat = mat(0xf5c542, { roughness: 0.3, metalness: 0.55 });
const lightCell = mat(0xf3dfae, { roughness: 0.8 }), darkCell = mat(0x7b4a2e, { roughness: 0.75 });
const woodMat = mat(0xa8683a, { roughness: 0.6 });
const flat = (color, opacity) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
const markMat = { target: flat(0x2fd678, 0.92), mid: flat(0xffd23f, 0.95), sel: flat(0x35d0e6, 0.5), last: flat(0xffe14a, 0.38), ring: flat(0xffb800, 0.9) };

const crownGeos = (() => {
  const g = new THREE.Group();
  const base = new THREE.Mesh(crownBase, goldMat); base.position.y = 0.05; g.add(base);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const t = new THREE.Mesh(crownTip, goldMat);
    t.position.set(Math.cos(a) * 0.11, 0.17, Math.sin(a) * 0.11);
    g.add(t);
  }
  return g;
})();

function makePiece(color, king) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(pieceGeo, pieceMat[color]);
  body.castShadow = true; g.add(body);
  if (king) {
    const top = new THREE.Mesh(pieceGeo, pieceMat[color]);
    top.position.y = PIECE_H; top.castShadow = true; g.add(top);
    const ring = new THREE.Mesh(kingRingGeo, goldMat);
    ring.position.y = PIECE_H * 2 + 0.004; g.add(ring);
    const crown = crownGeos.clone();
    crown.position.y = PIECE_H * 2;
    crown.name = 'crown';
    crown.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    g.add(crown);
  }
  g.userData = { color, king };
  return g;
}

function ghostify(group) {
  group.traverse((o) => { if (o.isMesh && !o.material.userData.clone) { o.material = o.material.clone(); o.material.userData.clone = true; o.material.transparent = true; } });
}
function setOpacity(group, v) { group.traverse((o) => { if (o.isMesh && o.material.userData.clone) o.material.opacity = v; }); }
function disposeClones(group) { group.traverse((o) => { if (o.isMesh && o.material.userData.clone) o.material.dispose(); }); }

export function createScene(stage, canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x9a7a5a, 1.25));
  const sun = new THREE.DirectionalLight(0xfff0d8, 2.1);
  sun.position.set(-4, 11, 7);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 30 });
  sun.shadow.bias = -0.0008;
  scene.add(sun);

  const board = new THREE.Group();
  scene.add(board);
  const staticGroup = new THREE.Group(), piecesGroup = new THREE.Group(), marksGroup = new THREE.Group();
  board.add(staticGroup, piecesGroup, marksGroup);

  let size = 10, flip = false, pickCb = null, frames = 0;
  const pieces = new Map(); // sq -> Group
  const lifts = new Map(); // Group -> hauteur cible
  let pulsers = [];
  let anims = [];
  let gen = 0; // incrémenté à chaque annulation : une animation périmée s'arrête

  const cellPos = (sq, y = TOP) => new THREE.Vector3((sq % size) - (size - 1) / 2, y, Math.floor(sq / size) - (size - 1) / 2);

  function buildBoard() {
    staticGroup.clear();
    const frame = new THREE.Mesh(new RoundedBoxGeometry(size + FRAME, 0.5, size + FRAME, 4, 0.2), woodMat);
    frame.position.y = -0.25 + 0.0;
    frame.receiveShadow = true;
    staticGroup.add(frame);
    for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) {
      const m = new THREE.Mesh(cellGeo, (r + c) % 2 === 1 ? darkCell : lightCell);
      m.position.set(c - (size - 1) / 2, TOP / 2, r - (size - 1) / 2);
      m.receiveShadow = true;
      staticGroup.add(m);
    }
    fit();
  }

  // ---------- cadrage caméra sur le ratio du conteneur ----------
  const tmp = new THREE.Vector3();
  function fit() {
    const w = Math.max(1, stage.clientWidth), h = Math.max(1, stage.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const half = (size + FRAME) / 2, inner = size / 2;
    const cam = cameraFor(w, h, window.innerWidth, window.innerHeight);
    const pts = [];
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { pts.push([sx * half, -0.5, sz * half], [sx * half, 0, sz * half], [sx * inner, 0.95, sz * inner]); }
    const elev = cam.elev * Math.PI / 180;
    const dir = new THREE.Vector3(0, Math.sin(elev), Math.cos(elev));
    const target = new THREE.Vector3(0, 0, 0);
    const fits = (d) => {
      camera.position.copy(target).addScaledVector(dir, d);
      camera.lookAt(target);
      camera.updateMatrixWorld(true);
      camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
      return pts.every((p) => { tmp.set(p[0], p[1], p[2]).project(camera); return Math.abs(tmp.x) <= cam.mx && Math.abs(tmp.y) <= cam.my; });
    };
    const dist = (tz) => {
      target.z = tz;
      let lo = 4, hi = 90;
      for (let i = 0; i < 22; i++) { const mid = (lo + hi) / 2; if (fits(mid)) hi = mid; else lo = mid; }
      fits(hi);
      let mn = 9, mx = -9;
      for (const p of pts) { tmp.set(p[0], p[1], p[2]).project(camera); mn = Math.min(mn, tmp.y); mx = Math.max(mx, tmp.y); }
      return hi + 15 * Math.abs(mn + mx); // distance minimale, puis damier centré verticalement
    };
    // décale le point visé pour centrer le damier : on minimise la distance nécessaire
    let a = -2.5, b = 2.5;
    for (let i = 0; i < 12; i++) { const m1 = a + (b - a) / 3, m2 = b - (b - a) / 3; if (dist(m1) < dist(m2)) b = m2; else a = m1; }
    const tz = (a + b) / 2; dist(tz); // laisse la caméra sur la dernière position valide
  }
  // recadrage au redimensionnement et à la rotation (regroupé sur une image)
  let fitQueued = false;
  const refit = () => { if (fitQueued) return; fitQueued = true; requestAnimationFrame(() => { fitQueued = false; fit(); }); };
  new ResizeObserver(refit).observe(stage);
  window.addEventListener('resize', refit);
  window.addEventListener('orientationchange', () => { refit(); setTimeout(refit, 250); });
  if (window.visualViewport) window.visualViewport.addEventListener('resize', refit);

  // ---------- pièces ----------
  function clearPieces() {
    for (const g of pieces.values()) disposeClones(g);
    piecesGroup.clear(); pieces.clear(); lifts.clear();
  }
  function sync(state) {
    if (state.size !== size) { size = state.size; buildBoard(); }
    cancelAnims();
    clearPieces();
    state.board.forEach((v, sq) => {
      if (!v) return;
      const g = makePiece(v > 0 ? 'white' : 'black', Math.abs(v) === 2);
      g.position.copy(cellPos(sq));
      g.userData.sq = sq;
      piecesGroup.add(g); pieces.set(sq, g);
    });
  }

  // ---------- marques ----------
  let pickTargets = [];
  function setMarks({ selected = null, targets = [], mids = [], must = [], last = [] } = {}) {
    marksGroup.clear(); pulsers = [];
    pickTargets = [...targets, ...mids];
    const put = (geo, m, sq, y) => { const o = new THREE.Mesh(geo, m); o.position.copy(cellPos(sq, y)); marksGroup.add(o); return o; };
    for (const sq of last) put(quadGeo, markMat.last, sq, TOP + 0.004);
    if (selected !== null) put(quadGeo, markMat.sel, selected, TOP + 0.006);
    for (const sq of targets) { const o = put(discGeo, markMat.target, sq, TOP + 0.01); o.scale.setScalar(1.3); pulsers.push({ o, base: 1.3, amp: 0.1, sp: 5 }); }
    for (const sq of mids) { const o = put(discGeo, markMat.mid, sq, TOP + 0.012); o.scale.setScalar(1.5); pulsers.push({ o, base: 1.5, amp: 0.14, sp: 6 }); }
    for (const sq of must) { const o = put(ringGeo, markMat.ring, sq, TOP + 0.014); pulsers.push({ o, base: 1, amp: 0.1, sp: 6 }); }
    for (const [sq, g] of pieces) lifts.set(g, sq === selected ? 0.28 : 0);
  }

  // ---------- animations ----------
  function tween(dur, fn) {
    return new Promise((resolve) => { anims.push({ t0: performance.now(), dur: Math.max(1, dur), fn, resolve }); });
  }
  function cancelAnims() { gen++; const a = anims; anims = []; a.forEach((x) => x.resolve()); }
  const wait = (ms) => tween(ms, () => {});

  function stepAnims(now) {
    const keep = [];
    for (const a of anims) {
      const k = Math.min(1, (now - a.t0) / a.dur);
      a.fn(k);
      if (k >= 1) a.resolve(); else keep.push(a);
    }
    anims = keep;
  }

  async function jump(g, from, to, hop, dur) {
    const a = cellPos(from), b = cellPos(to);
    await tween(dur, (k) => {
      const e = ease.inOut(k);
      g.position.x = a.x + (b.x - a.x) * e;
      g.position.z = a.z + (b.z - a.z) * e;
      g.position.y = TOP + Math.sin(Math.PI * k) * hop;
      const sy = 1 + 0.22 * Math.sin(Math.PI * k);
      g.scale.set(1 / Math.sqrt(sy), sy, 1 / Math.sqrt(sy));
    });
    g.position.copy(b);
    await tween(110, (k) => { const sy = 1 - 0.26 * Math.sin(Math.PI * k); g.scale.set(1 / Math.sqrt(sy), sy, 1 / Math.sqrt(sy)); });
    g.scale.set(1, 1, 1);
  }

  // Joue un coup sur la scène (qui montre l'état d'avant). hooks : { onStep(i, captured), onPromote() }
  async function animateMove(prev, move, hooks = {}) {
    const my = gen, alive = () => my === gen;
    const g = pieces.get(move.from);
    if (!g) { return; }
    lifts.set(g, 0);
    g.userData.busy = true;
    piecesGroup.add(g); // reste dessiné
    pieces.delete(move.from);
    const taken = [];
    let cur = move.from;
    for (let i = 0; i < move.path.length; i++) {
      const to = move.path[i];
      const dist = Math.hypot((to % size) - (cur % size), Math.floor(to / size) - Math.floor(cur / size));
      const cap = move.captures[i];
      const dur = cap !== undefined ? 330 + 40 * Math.min(dist, 6) : 300 + 30 * Math.min(dist, 6);
      await jump(g, cur, to, cap !== undefined ? 0.5 : 0.28, dur);
      if (!alive()) return;
      if (cap !== undefined) {
        const victim = pieces.get(cap);
        if (victim) { ghostify(victim); taken.push(victim); pieces.delete(cap); tween(260, (k) => setOpacity(victim, 1 - 0.65 * k)); }
        hooks.onStep && hooks.onStep(i, cap);
      } else hooks.onStep && hooks.onStep(i, null);
      cur = to;
    }
    pieces.set(cur, g);
    g.userData.busy = false;
    const fades = taken.map((v) => tween(280, (k) => { setOpacity(v, 0.35 * (1 - k)); v.scale.setScalar(1 - 0.35 * k); }));
    if (move.promote) {
      const king = makePiece(g.userData.color, true);
      king.position.copy(cellPos(cur)); king.userData.sq = cur;
      piecesGroup.remove(g); piecesGroup.add(king); pieces.set(cur, king);
      hooks.onPromote && hooks.onPromote();
      const crown = king.getObjectByName('crown');
      await tween(420, (k) => {
        const e = ease.back(k);
        king.scale.set(0.75 + 0.25 * e, 0.75 + 0.25 * e, 0.75 + 0.25 * e);
        if (crown) crown.position.y = PIECE_H * 2 + (1 - e) * 0.7;
      });
      if (!alive()) return;
      king.scale.set(1, 1, 1);
    }
    await Promise.all(fades);
    if (!alive()) return;
    taken.forEach((v) => { disposeClones(v); piecesGroup.remove(v); });
  }

  // ---------- picking ----------
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -TOP), hit = new THREE.Vector3();
  function pickAt(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -(((clientY - rect.top) / rect.height) * 2 - 1));
    ray.setFromCamera(ndc, camera);
    board.updateMatrixWorld(true);
    // plan du damier, en repère local (gère le damier tourné)
    plane.constant = -TOP;
    const onPlane = !!ray.ray.intersectPlane(plane, hit);
    if (onPlane) board.worldToLocal(hit);
    // toucher tolérant : un tap près d'une case cible surlignée la choisit
    if (onPlane && pickTargets.length) { const t = nearestTarget(hit.x, hit.z, pickTargets, size, 0.6); if (t !== null) return t; }
    const hits = ray.intersectObjects(piecesGroup.children, true);
    for (const h of hits) { let o = h.object; while (o && o.userData.sq === undefined) o = o.parent; if (o) return o.userData.sq; }
    if (!onPlane) return null;
    const c = Math.floor(hit.x + size / 2), r = Math.floor(hit.z + size / 2);
    if (c < 0 || c >= size || r < 0 || r >= size) return null;
    return r * size + c;
  }
  canvas.style.touchAction = 'none';
  canvas.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const sq = pickAt(e.clientX, e.clientY);
    if (pickCb) pickCb(sq);
  });
  // position écran d'une case (tests de navigateur : clic simulé)
  function screenOf(sq) {
    board.updateMatrixWorld(true);
    const v = cellPos(sq).applyMatrix4(board.matrixWorld).project(camera);
    const rect = canvas.getBoundingClientRect();
    return { x: rect.left + ((v.x + 1) / 2) * rect.width, y: rect.top + ((1 - v.y) / 2) * rect.height };
  }

  // ---------- boucle ----------
  let last = performance.now();
  function loop(now) {
    requestAnimationFrame(loop);
    frames++;
    last = now;
    stepAnims(performance.now());
    const t = now / 1000;
    for (const p of pulsers) p.o.scale.setScalar(p.base + p.amp * Math.sin(t * p.sp));
    for (const [g, target] of lifts) {
      if (g.userData.busy) continue;
      const cur = g.position.y - TOP;
      g.position.y = TOP + cur + (target - cur) * 0.3;
    }
    renderer.render(scene, camera);
  }
  requestAnimationFrame(loop);
  buildBoard();

  return {
    sync, setMarks, animateMove, cancelAnims, screenOf, fit, pickAt,
    setFlip(f) { flip = !!f; board.rotation.y = flip ? Math.PI : 0; },
    onPick(fn) { pickCb = fn; },
    frames: () => frames,
    isFlipped: () => flip,
  };
}
