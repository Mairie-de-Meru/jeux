// Rendu three.js : plateau, pièces, surlignages, animations, caméra ajustée à l'aspect.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { createPiece, HEIGHT } from './pieces.js';

const TOP = 0.12; // hauteur de la surface des cases
const FRAME = 0.55;
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const easeOutBack = (t) => { const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const wx = (s) => (s & 7) - 3.5;
const wz = (s) => 3.5 - (s >> 3);

function woodTexture(labels = true) {
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

  // --- plateau ---
  const board = new THREE.Group();
  scene.add(board);
  const size = 8 + 2 * FRAME;
  const baseGeo = new RoundedBoxGeometry(size, 0.5, size, 3, 0.12);
  const wood = new THREE.MeshStandardMaterial({ map: woodTexture(false), roughness: 0.6 });
  const woodLabels = woodTexture(true);
  const base = new THREE.Mesh(baseGeo, wood);
  base.position.y = -0.25 + 0.0;
  base.receiveShadow = true;
  board.add(base);
  // plan texturé (cadre + coordonnées) posé sur le dessus du socle
  const frameTex = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshStandardMaterial({ map: woodLabels, roughness: 0.6 }));
  frameTex.rotation.x = -Math.PI / 2;
  frameTex.position.y = 0.002;
  board.add(frameTex);
  const sqGeo = new THREE.BoxGeometry(1, TOP, 1);
  const matL = new THREE.MeshStandardMaterial({ color: 0xe0cba0, roughness: 0.55 });
  const matD = new THREE.MeshStandardMaterial({ color: 0x3f7276, roughness: 0.55 });
  for (let s = 0; s < 64; s++) {
    const m = new THREE.Mesh(sqGeo, (((s & 7) + (s >> 3)) & 1) === 0 ? matD : matL);
    m.position.set(wx(s), TOP / 2, wz(s));
    m.receiveShadow = true;
    board.add(m);
  }

  // --- surlignages (créés à la demande, un par case) ---
  const hlGroup = new THREE.Group();
  scene.add(hlGroup);
  const planeGeo = new THREE.PlaneGeometry(0.98, 0.98).rotateX(-Math.PI / 2);
  const dotGeo = new THREE.CircleGeometry(0.17, 24).rotateX(-Math.PI / 2);
  const ringGeo = new THREE.RingGeometry(0.36, 0.46, 32).rotateX(-Math.PI / 2);
  const hlMat = (c, o) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, depthWrite: false });
  const MATS = {
    selected: hlMat(0xffd23f, 0.65), last: hlMat(0xf2e24a, 0.4), check: hlMat(0xe5253b, 0.75),
    danger: hlMat(0xff8a1f, 0.6), dot: hlMat(0x1e8f4e, 0.8), capture: hlMat(0x1e8f4e, 0.85),
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
  function sync(brd) {
    for (const g of meshes.values()) piecesGroup.remove(g);
    meshes.clear();
    for (let s = 0; s < 64; s++) {
      const p = brd[s];
      if (!p) continue;
      const g = createPiece(p);
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
      g.scale.set(1 - 0.08 * st + 0.14 * land, 1 + 0.12 * st - 0.2 * land, 1 - 0.08 * st + 0.14 * land);
    }).then(() => { g.scale.set(1, 1, 1); place(g, to); });
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
          cg.scale.set(e, e, e);
          cg.position.y = TOP + (1 - e) * 0.4;
        }).then(() => { cg.visible = false; }));
      }
    }
    await Promise.all(jobs);
    if (m.promo) {
      const old = g;
      const np = createPiece(m.piece[0] + m.promo);
      place(np, m.to);
      piecesGroup.remove(old); piecesGroup.add(np);
      meshes.set(m.to, np);
      await tween(300, (t) => { const e = Math.max(0.01, easeOutBack(t)); np.scale.set(e, e, e); });
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
  function pickSquare(cx, cy) {
    setRay(cx, cy);
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
      dragging.scale.set(1.08, 1.08, 1.08);
    }
  }
  function dragEnd() {
    if (!dragging) return;
    place(dragging, dragging.userData.sq);
    dragging.scale.set(1, 1, 1);
    dragging = null;
  }

  // --- caméra ---
  let ELEV = (56 * Math.PI) / 180;
  let az = 0, azTarget = 0, dist = 14;
  const corners = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (const y of [-0.3, 1.5]) corners.push(new THREE.Vector3((sx * size) / 2, y, (sz * size) / 2));
  const tmp = new THREE.Vector3();
  function placeCamera(d) {
    camera.position.set(Math.sin(az) * Math.cos(ELEV) * d, Math.sin(ELEV) * d, Math.cos(az) * Math.cos(ELEV) * d);
    camera.lookAt(0, 0.1, 0);
    camera.updateMatrixWorld(true);
  }
  function fit() {
    let d = dist;
    for (let i = 0; i < 4; i++) {
      placeCamera(d);
      let m = 0;
      for (const c of corners) { tmp.copy(c).project(camera); m = Math.max(m, Math.abs(tmp.x), Math.abs(tmp.y)); }
      d *= m / 0.97;
    }
    dist = d;
    placeCamera(d);
  }
  function resize() {
    const w = Math.max(1, canvas.clientWidth), h = Math.max(1, canvas.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    ELEV = ((w / h > 1.35 ? 72 : w / h < 0.7 ? 52 : 58) * Math.PI) / 180; // plus de plongée en paysage : plateau plus grand
    camera.updateProjectionMatrix();
    fit();
  }
  function setOrientation(color, animate = true) {
    azTarget = color === 'w' ? 0 : Math.PI;
    // chemin le plus court
    let diff = azTarget - az;
    diff = ((diff + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
    azTarget = az + diff;
    if (!animate) { az = azTarget; fit(); }
  }

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    runAnims(now);
    if (Math.abs(azTarget - az) > 0.0005) {
      az += (azTarget - az) * Math.min(1, dt * 3.2);
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
