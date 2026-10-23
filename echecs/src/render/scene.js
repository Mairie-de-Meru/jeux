// Rendu three.js : plateau, pièces, surlignages, animations, caméra ajustée à l'aspect.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { createPiece, HEIGHT } from './pieces.js';
import { viewParams } from '../logic/layout.js';

const TOP = 0.12; // hauteur de la surface des cases
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const easeOutBack = (t) => { const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const wx = (s) => (s & 7) - 3.5;
const wz = (s) => 3.5 - (s >> 3);

function woodTexture(labels, FRAME) {
  const c = document.createElement('canvas');
  c.width = c.height = 1024;
  const g = c.getContext('2d');
  g.fillStyle = '#6b3f26';
  g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 90; i++) {
    g.strokeStyle = `rgba(${40 + (i * 7) % 40},${20 + (i * 3) % 20},10,${0.05 + ((i * 13) % 10) / 100})`;
    g.lineWidth = 1 + (i % 4);
    g.beginPath();
    const y = (i * 1024) / 90;
    g.moveTo(0, y);
    g.bezierCurveTo(300, y + 14, 700, y - 14, 1024, y + 4);
    g.stroke();
  }
  // coordonnées, lisibles des deux côtés
  const total = 8 + 2 * FRAME, px = 1024 / total;
  if (labels) {
  g.fillStyle = 'rgba(255,240,205,0.78)';
  g.font = `bold ${px * 0.3}px system-ui, sans-serif`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  for (let i = 0; i < 8; i++) {
    const p = (FRAME + i + 0.5) * px;
    const letter = 'abcdefgh'[i], digit = String(8 - i);
    const near = (FRAME / 2) * px, far = 1024 - near;
    g.fillText(letter, p, far);
    g.save(); g.translate(p, near); g.rotate(Math.PI); g.fillText(letter, 0, 0); g.restore();
    g.fillText(digit, near, p);
    g.save(); g.translate(far, p); g.rotate(Math.PI); g.fillText(digit, 0, 0); g.restore();
  }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// Coordonnées dans les cases (téléphone : cadre fin) : lettres en bas à droite de la rangée du bas,
// chiffres en haut à gauche de la colonne de gauche, vues depuis le camp `side` (+1 blancs, -1 noirs).
function squareLabels(side) {
  const c = document.createElement('canvas');
  c.width = c.height = 1024;
  const g = c.getContext('2d');
  const S = 128, pad = 9;
  g.font = 'bold 36px system-ui, sans-serif';
  for (let f = 0; f < 8; f++) for (let r = 0; r < 8; r++) {
    const sc = side > 0 ? f : 7 - f, sr = side > 0 ? 7 - r : r; // colonne / rangée à l'écran
    if (sr !== 7 && sc !== 0) continue;
    const x0 = f * S, y0 = (7 - r) * S;
    g.fillStyle = ((f + r) & 1) === 0 ? 'rgba(240,226,190,0.95)' : 'rgba(47,96,100,0.95)';
    const draw = (txt, ax, ay, alignX, alignY) => {
      g.save(); g.translate(ax, ay); if (side < 0) g.rotate(Math.PI);
      g.textAlign = alignX; g.textBaseline = alignY; g.fillText(txt, 0, 0); g.restore();
    };
    if (sr === 7) { // coin bas-droit à l'écran
      const ax = side > 0 ? x0 + S - pad : x0 + pad, ay = side > 0 ? y0 + S - pad : y0 + pad;
      draw('abcdefgh'[f], ax, ay, 'right', 'bottom');
    }
    if (sc === 0) { // coin haut-gauche à l'écran
      const ax = side > 0 ? x0 + pad : x0 + S - pad, ay = side > 0 ? y0 + pad : y0 + S - pad;
      draw(String(r + 1), ax, ay, 'left', 'top');
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.5, 100);

  scene.add(new THREE.HemisphereLight(0xfff4e0, 0x5a4a6a, 1.15));
  const sun = new THREE.DirectionalLight(0xffffff, 1.5);
  sun.position.set(5, 11, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 30 });
  sun.shadow.bias = -0.0008;
  scene.add(sun);

  // --- plateau (reconstruit si l'on passe de téléphone à bureau) ---
  let vp = viewParams(window.innerWidth, window.innerHeight, canvas.clientWidth || 1, canvas.clientHeight || 1);
  let size = 8 + 2 * vp.frame;
  let board = null, labelW = null, labelB = null;
  const sqGeo = new THREE.BoxGeometry(1, TOP, 1);
  const matL = new THREE.MeshStandardMaterial({ color: 0xe0cba0, roughness: 0.55 });
  const matD = new THREE.MeshStandardMaterial({ color: 0x3f7276, roughness: 0.55 });
  function buildBoard() {
    if (board) {
      scene.remove(board);
      board.traverse((o) => { if (o.material && o.material.map) o.material.map.dispose(); });
    }
    board = new THREE.Group();
    scene.add(board);
    size = 8 + 2 * vp.frame;
    const wood = new THREE.MeshStandardMaterial({ map: woodTexture(false, vp.frame), roughness: 0.6 });
    const base = new THREE.Mesh(new RoundedBoxGeometry(size, 0.5, size, 3, Math.min(0.12, vp.frame * 0.6)), wood);
    base.position.y = -0.25;
    base.receiveShadow = true;
    board.add(base);
    if (!vp.phone) {
      // plan texturé (cadre + coordonnées) posé sur le dessus du socle
      const frameTex = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshStandardMaterial({ map: woodTexture(true, vp.frame), roughness: 0.6 }));
      frameTex.rotation.x = -Math.PI / 2;
      frameTex.position.y = 0.002;
      board.add(frameTex);
    }
    for (let s = 0; s < 64; s++) {
      const m = new THREE.Mesh(sqGeo, (((s & 7) + (s >> 3)) & 1) === 0 ? matD : matL);
      m.position.set(wx(s), TOP / 2, wz(s));
      m.receiveShadow = true;
      board.add(m);
    }
    labelW = labelB = null;
    if (vp.phone) {
      const mk = (side) => {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(8, 8).rotateX(-Math.PI / 2),
          new THREE.MeshBasicMaterial({ map: squareLabels(side), transparent: true, depthWrite: false }));
        m.position.y = TOP + 0.002;
        m.renderOrder = 1;
        board.add(m);
        return m;
      };
      labelW = mk(1); labelB = mk(-1);
    }
  }
  buildBoard();

  // --- surlignages (créés à la demande, un par case) ---
  const hlGroup = new THREE.Group();
  scene.add(hlGroup);
  const planeGeo = new THREE.PlaneGeometry(0.98, 0.98).rotateX(-Math.PI / 2);
  const dotGeo = new THREE.CircleGeometry(0.2, 24).rotateX(-Math.PI / 2);
  const ringGeo = new THREE.RingGeometry(0.36, 0.48, 32).rotateX(-Math.PI / 2);
  const hlMat = (c, o) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, depthWrite: false });
  const MATS = {
    selected: hlMat(0xffd23f, 0.65), last: hlMat(0xf2e24a, 0.4), check: hlMat(0xe5253b, 0.75),
    danger: hlMat(0xff8a1f, 0.6), dot: hlMat(0x17a352, 0.88), capture: hlMat(0x17a352, 0.9),
  };
  const hlMeshes = [];
  function addHl(geo, mat, s, y) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(wx(s), TOP + y, wz(s));
    m.renderOrder = 2;
    hlGroup.add(m);
    hlMeshes.push(m);
  }
  let hl = { selected: -1, legal: [], last: [], check: -1, danger: [] };
  function drawHighlights() {
    for (const m of hlMeshes) hlGroup.remove(m);
    hlMeshes.length = 0;
    for (const s of hl.last) addHl(planeGeo, MATS.last, s, 0.004);
    for (const s of hl.danger) addHl(planeGeo, MATS.danger, s, 0.006);
    if (hl.check >= 0) addHl(planeGeo, MATS.check, hl.check, 0.008);
    if (hl.selected >= 0) addHl(planeGeo, MATS.selected, hl.selected, 0.01);
    for (const l of hl.legal) {
      if (l.capture) addHl(ringGeo, MATS.capture, l.sq, 0.014);
      else addHl(dotGeo, MATS.dot, l.sq, 0.014);
    }
  }

  // --- pièces ---
  const piecesGroup = new THREE.Group();
  scene.add(piecesGroup);
  const meshes = new Map(); // case -> Group
  function place(g, s) { g.position.set(wx(s), TOP, wz(s)); }
  let lastBoard = null;
  const pieceOpts = () => ({ scale: vp.pieceScale, lean: vp.knightLean, side: Math.cos(az) });
  function sync(brd) {
    lastBoard = brd.slice();
    for (const g of meshes.values()) piecesGroup.remove(g);
    meshes.clear();
    for (let s = 0; s < 64; s++) {
      const p = brd[s];
      if (!p) continue;
      const g = createPiece(p, pieceOpts());
      place(g, s);
      g.userData.sq = s;
      piecesGroup.add(g);
      meshes.set(s, g);
    }
  }

  // --- animations ---
  const anims = new Set();
  function tween(dur, fn) {
    return new Promise((resolve) => {
      anims.add({ t0: performance.now(), dur, fn, resolve });
    });
  }
  function runAnims(now) {
    for (const a of [...anims]) {
      const t = Math.min(1, (now - a.t0) / a.dur);
      a.fn(t);
      if (t >= 1) { anims.delete(a); a.resolve(); }
    }
  }
  function hop(g, from, to, dur, high) {
    const x0 = wx(from), z0 = wz(from), x1 = wx(to), z1 = wz(to);
    return tween(dur, (t) => {
      const e = easeInOut(t);
      g.position.x = x0 + (x1 - x0) * e;
      g.position.z = z0 + (z1 - z0) * e;
      g.position.y = TOP + Math.sin(Math.PI * e) * high;
      // étirement en vol, écrasement à l'arrivée
      const st = Math.sin(Math.PI * t);
      const land = t > 0.85 ? Math.sin(((t - 0.85) / 0.15) * Math.PI) : 0;
      const k = g.userData.k || 1;
      g.scale.set(k * (1 - 0.08 * st + 0.14 * land), k * (1 + 0.12 * st - 0.2 * land), k * (1 - 0.08 * st + 0.14 * land));
    }).then(() => { const k = g.userData.k || 1; g.scale.set(k, k, k); place(g, to); });
  }
  // Anime un coup (objet Move) ; la position finale est resynchronisée par l'appelant.
  async function animateMove(m, { instant = false } = {}) {
    if (instant) return;
    const g = meshes.get(m.from);
    if (!g) return;
    const jobs = [];
    const dist = Math.hypot(wx(m.to) - wx(m.from), wz(m.to) - wz(m.from));
    const isKnight = m.piece[1] === 'N';
    jobs.push(hop(g, m.from, m.to, 320 + 60 * Math.min(dist, 5), isKnight ? 1.1 : 0.45 + 0.05 * dist));
    if (m.flags === 'k' || m.flags === 'q') {
      const rf = m.flags === 'k' ? m.to + 1 : m.to - 2, rt = m.flags === 'k' ? m.to - 1 : m.to + 1;
      const rg = meshes.get(rf);
      if (rg) jobs.push(hop(rg, rf, rt, 420, 0.5));
    }
    if (m.captured) {
      const cs = m.flags === 'ep' ? m.to + (m.piece[0] === 'w' ? -8 : 8) : m.to;
      const cg = meshes.get(cs);
      if (cg && cg !== g) {
        const delay = 220;
        jobs.push(tween(delay + 260, (t) => {
          const k = Math.max(0, (t * (delay + 260) - delay) / 260);
          const e = 1 - easeInOut(k);
          const ks = cg.userData.k || 1;
          cg.scale.set(e * ks, e * ks, e * ks);
          cg.position.y = TOP + (1 - e) * 0.4;
        }).then(() => { cg.visible = false; }));
      }
    }
    await Promise.all(jobs);
    if (m.promo) {
      const old = g;
      const np = createPiece(m.piece[0] + m.promo, pieceOpts());
      place(np, m.to);
      piecesGroup.remove(old); piecesGroup.add(np);
      meshes.set(m.to, np);
      await tween(300, (t) => { const e = Math.max(0.01, easeOutBack(t)) * np.userData.k; np.scale.set(e, e, e); });
    }
  }

  // --- glisser-déposer ---
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -TOP);
  const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.9);
  const hit = new THREE.Vector3();
  let dragging = null;
  function setRay(cx, cy) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((cx - r.left) / r.width) * 2 - 1, -(((cy - r.top) / r.height) * 2 - 1));
    camera.updateMatrixWorld();
    ray.setFromCamera(ndc, camera);
  }
  function squareAt(x, z) {
    const f = Math.floor(x + 4), r = Math.floor(4 - z);
    return f >= 0 && f < 8 && r >= 0 && r < 8 ? r * 8 + f : -1;
  }
  const fingerPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -(TOP + 0.4));
  function pickSquare(cx, cy) {
    setRay(cx, cy);
    if (vp.phone) {
      // téléphone : la case sous le doigt (projection sur le plateau), arrondie à la case la plus proche
      if (!ray.ray.intersectPlane(fingerPlane, hit)) return -1;
      if (Math.abs(hit.x) > 4 + vp.frame + 0.35 || Math.abs(hit.z) > 4 + vp.frame + 0.35) return -1;
      const f = Math.min(7, Math.max(0, Math.floor(hit.x + 4))), r = Math.min(7, Math.max(0, Math.floor(4 - hit.z)));
      return r * 8 + f;
    }
    const hits = ray.intersectObjects(piecesGroup.children, true);
    for (const h of hits) {
      let o = h.object;
      while (o && o.userData.sq === undefined) o = o.parent;
      if (o && o.visible && o !== dragging) return o.userData.sq;
    }
    if (ray.ray.intersectPlane(plane, hit)) {
      const s = squareAt(hit.x, hit.z);
      if (s >= 0) return s;
      // tolérance : juste à côté du plateau -> case la plus proche si assez près
      const f = Math.min(7, Math.max(0, Math.floor(hit.x + 4))), r = Math.min(7, Math.max(0, Math.floor(4 - hit.z)));
      if (Math.abs(hit.x) < 4.5 && Math.abs(hit.z) < 4.5) return r * 8 + f;
    }
    return -1;
  }
  function dragStart(s) {
    const g = meshes.get(s);
    if (!g) return false;
    dragging = g;
    g.renderOrder = 5;
    return true;
  }
  function dragMove(cx, cy) {
    if (!dragging) return;
    setRay(cx, cy);
    if (ray.ray.intersectPlane(dragPlane, hit)) {
      dragging.position.set(hit.x, 0.9, hit.z);
      const k = 1.08 * (dragging.userData.k || 1);
      dragging.scale.set(k, k, k);
    }
  }
  function dragEnd() {
    if (!dragging) return;
    place(dragging, dragging.userData.sq);
    const k = dragging.userData.k || 1;
    dragging.scale.set(k, k, k);
    dragging = null;
  }

  // --- caméra ---
  let ELEV = (vp.elevDeg * Math.PI) / 180;
  let az = 0, azTarget = 0, dist = 14;
  const tmp = new THREE.Vector3();
  // Contraintes de cadrage : [point, limite en coordonnées normalisées]
  function constraints() {
    const out = [];
    if (vp.phone) {
      // les 8 colonnes / rangées remplissent `fill` du canvas ; cadre fin et têtes des pièces dans l'écran
      const e = 4 + vp.frame;
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        out.push([new THREE.Vector3(sx * 4, TOP, sz * 4), vp.fill]);
        out.push([new THREE.Vector3(sx * e, 0, sz * e), 0.995]);
        // têtes des pièces les plus hautes (roi + croix) entièrement visibles, y compris la rangée du fond
        out.push([new THREE.Vector3(sx * 3.75, TOP + 1.95 * vp.pieceScale, sz * 3.75), 0.975]);
      }
    } else {
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (const y of [-0.3, 1.5]) out.push([new THREE.Vector3((sx * size) / 2, y, (sz * size) / 2), 0.97]);
    }
    return out;
  }
  let cons = constraints();
  function placeCamera(d) {
    camera.position.set(Math.sin(az) * Math.cos(ELEV) * d, Math.sin(ELEV) * d, Math.cos(az) * Math.cos(ELEV) * d);
    camera.lookAt(0, vp.phone ? TOP : 0.1, 0);
    camera.updateMatrixWorld(true);
  }
  function fit() {
    let d = dist;
    for (let i = 0; i < 6; i++) {
      placeCamera(d);
      let m = 0;
      for (const [c, lim] of cons) { tmp.copy(c).project(camera); m = Math.max(m, Math.abs(tmp.x) / lim, Math.abs(tmp.y) / lim); }
      d *= m;
    }
    dist = d;
    placeCamera(d);
  }
  let side = 1;
  function applySide() {
    // côté de l'observateur : étiquettes des cases et inclinaison des cavaliers
    const ns = Math.cos(az) >= 0 ? 1 : -1;
    if (labelW) { labelW.visible = ns > 0; labelB.visible = ns < 0; }
    side = ns;
    // inclinaison des têtes de cavalier interpolée avec la caméra (droite à mi-rotation, sans saut)
    const c = Math.cos(az);
    for (const g of meshes.values()) {
      const pv = g.userData.pivot;
      if (!pv) continue;
      pv.rotation.x = -c * pv.userData.lean;
      pv.position.z = c * Math.sin(pv.userData.lean) * 0.48;
    }
  }
  function resize() {
    const w = Math.max(1, canvas.clientWidth), h = Math.max(1, canvas.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const nv = viewParams(window.innerWidth, window.innerHeight, w, h);
    const rebuild = nv.phone !== vp.phone;
    vp = nv;
    if (rebuild) { buildBoard(); if (lastBoard) sync(lastBoard); }
    ELEV = (vp.elevDeg * Math.PI) / 180;
    camera.fov = vp.fovDeg;
    camera.updateProjectionMatrix();
    cons = constraints();
    applySide();
    fit();
  }
  function setOrientation(color, animate = true) {
    azTarget = color === 'w' ? 0 : Math.PI;
    // chemin le plus court
    let diff = azTarget - az;
    diff = ((diff + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
    azTarget = az + diff;
    if (!animate) { az = azTarget; applySide(); fit(); }
  }

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    runAnims(now);
    if (Math.abs(azTarget - az) > 0.0005) {
      az += (azTarget - az) * Math.min(1, dt * 3.2);
      applySide();
      fit();
    }
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  return {
    sync, animateMove, resize, pickSquare, dragStart, dragMove, dragEnd, setOrientation,
    setHighlights(h) { hl = { selected: -1, legal: [], last: [], check: -1, danger: [], ...h }; drawHighlights(); },
    isDragging: () => !!dragging,
    screenPos(s) { // coordonnées client du centre d'une case (débogage / tests)
      const r = canvas.getBoundingClientRect();
      const v = new THREE.Vector3(wx(s), TOP + 0.3, wz(s)).project(camera);
      return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height };
    },
    pieceHeight: (t) => HEIGHT[t],
    renderer, camera,
  };
}
