// Scène three.js : plateau, caméra ajustée, pions, dés, bâtiments, sélection de case.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { SPACES } from '../logic/board.mjs';
import { SIZE, TILE_W, TILE_H, CORNER, SPACE_INFO, pawnPoint } from './layout.mjs';
import { tileCanvas, cornerCanvas, centerCanvas, deckBackCanvas } from './textures.mjs';
import { getImage, getFirst, refsReady } from './images.mjs';
import { createPawn, upgradePawn } from './pawns.mjs';
import { createFx } from './fx.mjs';
import { createDice } from './dice.mjs';
import { createBuildings } from './buildings.mjs';

const ease = {
  out: (t) => 1 - (1 - t) * (1 - t),
  inOut: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
};

export function createScene(canvas, container) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 1, 200);
  scene.add(new THREE.HemisphereLight('#ffffff', '#b9d9a8', 1.15));
  const sun = new THREE.DirectionalLight('#fff4dd', 1.6);
  sun.position.set(-8, 22, 12); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024); sun.shadow.radius = 4;
  Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 60 });
  scene.add(sun);

  // ----- animation -----
  let speed = 1; const anims = []; let lastDraw = 0;
  const tween = (ms, fn) => new Promise((resolve) => {
    if (speed > 1) { fn(1); resolve(); return; } // mode rapide : pas d'animation
    const a = { t0: performance.now(), dur: Math.max(1, ms), fn, resolve, done: false };
    const finish = () => { if (a.done) return; a.done = true; fn(1); resolve(); };
    a.finish = finish; anims.push(a);
    setTimeout(finish, ms / speed + 400); // filet si requestAnimationFrame est suspendu
  });
  function tick() {
    const now = performance.now();
    for (let i = anims.length - 1; i >= 0; i--) {
      const a = anims[i];
      if (a.done) { anims.splice(i, 1); continue; }
      const k = Math.min(1, ((now - a.t0) * speed) / a.dur);
      a.fn(k);
      if (k >= 1) { a.done = true; anims.splice(i, 1); a.resolve(); }
    }
    updateCamera(now);
    if (speed <= 1 || now - lastDraw > 300) { renderer.render(scene, camera); lastDraw = now; }
    requestAnimationFrame(tick);
  }

  // ----- plateau -----
  const board = new THREE.Group(); scene.add(board);
  const base = new THREE.Mesh(new RoundedBoxGeometry(SIZE + 0.9, 0.5, SIZE + 0.9, 3, 0.2), new THREE.MeshStandardMaterial({ color: '#c9e8bf', roughness: 0.7 }));
  base.position.y = -0.25; base.receiveShadow = true; board.add(base);
  const inner = SIZE - 2 * TILE_H;
  const centerCv = centerCanvas(); const centerTex = new THREE.CanvasTexture(centerCv); centerTex.colorSpace = THREE.SRGBColorSpace; centerTex.anisotropy = 4;
  getImage('mascotte').then((img) => { if (!img) return; const x = centerCv.getContext('2d'); const k = 190 / Math.max(img.width, img.height) * 1.25; x.drawImage(img, 290 - img.width * k / 2, 730 - img.height * k / 2, img.width * k, img.height * k); centerTex.needsUpdate = true; });
  const center = new THREE.Mesh(new THREE.PlaneGeometry(inner, inner), new THREE.MeshStandardMaterial({ map: centerTex, roughness: 0.8 }));
  center.rotation.x = -Math.PI / 2; center.position.y = 0.012; center.receiveShadow = true; board.add(center);

  const tileGroups = []; const tileTex = [];
  const tileBox = (w, h) => new RoundedBoxGeometry(w - 0.05, 0.16, h - 0.05, 2, 0.04);
  const geoTile = tileBox(TILE_W, TILE_H); const geoCorner = tileBox(CORNER, CORNER);
  for (const sp of SPACES) {
    const info = SPACE_INFO[sp.i];
    const g = new THREE.Group(); g.position.set(info.x, 0, info.z); g.rotation.y = info.rot;
    const box = new THREE.Mesh(info.corner ? geoCorner : geoTile, new THREE.MeshStandardMaterial({ color: '#f4f7fb', roughness: 0.6 }));
    box.position.y = 0.08; box.receiveShadow = true; g.add(box);
    const tex = new THREE.CanvasTexture(info.corner ? cornerCanvas(sp) : tileCanvas(sp)); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(info.w - 0.12, info.h - 0.12), new THREE.MeshBasicMaterial({ map: tex }));
    plane.rotation.x = -Math.PI / 2; plane.position.y = 0.166; g.add(plane);
    board.add(g); tileGroups.push(g); tileTex.push({ tex, sp, corner: info.corner });
  }
  // les images de référence arrivent après la création : on redessine les cases concernées
  refsReady.then(() => { for (const t of tileTex) { if (t.sp.kind === 'prop' || t.sp.kind === 'jail' || t.sp.kind === 'gotojail') continue; t.tex.image = t.corner ? cornerCanvas(t.sp) : tileCanvas(t.sp); t.tex.needsUpdate = true; } });
  // pioches face cachée
  const decks = {};
  for (const [kind, x, z] of [['surprise', -inner * 0.2, -inner * 0.2], ['tirelire', inner * 0.2, inner * 0.2]]) {
    const backCv = deckBackCanvas(kind); const tex = new THREE.CanvasTexture(backCv);
    getFirst(kind === 'surprise' ? ['dos-chance-ref', 'dosChance'] : ['dos-caisse-ref', 'dosCaisse']).then((img) => { if (!img) return; const x = backCv.getContext('2d'); const k = Math.min(backCv.width / img.width, backCv.height / img.height); x.drawImage(img, (backCv.width - img.width * k) / 2, (backCv.height - img.height * k) / 2, img.width * k, img.height * k); tex.needsUpdate = true; }); tex.colorSpace = THREE.SRGBColorSpace;
    const grp = new THREE.Group(); grp.position.set(x, 0, z);
    for (let k = 0; k < 6; k++) {
      const m = new THREE.Mesh(new RoundedBoxGeometry(2.7, 0.07, 1.9, 2, 0.03), [0, 1, 2, 3, 4, 5].map((f) => new THREE.MeshStandardMaterial(f === 2 && k === 5 ? { map: tex } : { color: kind === 'surprise' ? '#ff9a2e' : '#3b78e0' })));
      m.position.y = 0.06 + k * 0.075; m.castShadow = true; grp.add(m);
    }
    board.add(grp); decks[kind] = grp;
  }

  // ----- caméra : vue d'ensemble ou suivi du pion -----
  const cam = { mode: 'follow', follow: 0, cur: null, tx: 0, tz: 0 };
  const panelEl = document.getElementById('panel'); const topEl = document.getElementById('topbar');
  let free = { cx: 0, cy: 0, w: 2, h: 2, key: '' }; let overview = null; let lastFree = 0;
  const rad = THREE.MathUtils.degToRad;
  function computeFree() {
    const W = Math.max(1, container.clientWidth); const H = Math.max(1, container.clientHeight);
    const cr = container.getBoundingClientRect();
    const top = topEl ? Math.max(0, topEl.getBoundingClientRect().bottom - cr.top + 4) : 0;
    let pl = W; let pt = H;
    if (panelEl && panelEl.offsetParent) { const r = panelEl.getBoundingClientRect(); pl = r.left - cr.left - 6; pt = r.top - cr.top - 6; }
    const A = { x0: 0, x1: W, y0: top, y1: Math.min(H, pt) }; const B = { x0: 0, x1: Math.min(W, pl), y0: top, y1: H };
    const area = (r) => Math.max(0, r.x1 - r.x0) * Math.max(0, r.y1 - r.y0);
    const r = area(A) >= area(B) ? A : B;
    const f = { cx: ((r.x0 + r.x1) / 2 / W) * 2 - 1, cy: 1 - ((r.y0 + r.y1) / 2 / H) * 2, w: Math.max(0.2, (r.x1 - r.x0) / W * 2), h: Math.max(0.2, (r.y1 - r.y0) / H * 2), W, H };
    f.key = [f.cx, f.cy, f.w, f.h].map((v) => v.toFixed(2)).join();
    return f;
  }
  const fitCam = new THREE.PerspectiveCamera(38, 1, 1, 200);
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => new THREE.Vector3((a * (SIZE + 0.9)) / 2, 0, (b * (SIZE + 0.9)) / 2));
  const tmp = new THREE.Vector3();
  function computeOverview() {
    const el = rad(62); fitCam.aspect = free.W / free.H;
    const bbox = (dist) => {
      fitCam.position.set(0, Math.sin(el) * dist, Math.cos(el) * dist); fitCam.lookAt(0, 0, 0); fitCam.updateMatrixWorld(); fitCam.updateProjectionMatrix();
      let minx = 9; let maxx = -9; let miny = 9; let maxy = -9;
      for (const c of corners) { tmp.copy(c).project(fitCam); minx = Math.min(minx, tmp.x); maxx = Math.max(maxx, tmp.x); miny = Math.min(miny, tmp.y); maxy = Math.max(maxy, tmp.y); }
      return { minx, maxx, miny, maxy };
    };
    let lo = 8; let hi = 200;
    for (let k = 0; k < 24; k++) { const d = (lo + hi) / 2; const b = bbox(d); if ((b.maxx - b.minx) > free.w * 0.96 || (b.maxy - b.miny) > free.h * 0.96) lo = d; else hi = d; }
    const b = bbox(hi);
    return { tx: 0, tz: 0, dist: hi, el, ox: free.cx - (b.minx + b.maxx) / 2, oy: free.cy - (b.miny + b.maxy) / 2 };
  }
  function followGoal() {
    const aspect = free.W / free.H;
    const dist = Math.min(30, Math.max(7, 8.5 / (Math.tan(rad(19)) * aspect * free.w)));
    const p = pawns[cam.follow]; const pk = cam.peek && performance.now() < cam.peek.until ? cam.peek : null;
    if (pk) return { tx: pk.x, tz: pk.z, dist: Math.min(30, Math.max(7, 7 / (Math.tan(rad(19)) * aspect * free.w))), el: rad(58), ox: free.cx, oy: free.cy };
    if (free.H > free.W) { // portrait : vue plus plongeante, cible ramenée vers le centre pour que le plateau remplisse l'écran
      const pd = Math.min(36, Math.max(7, 10.5 / (Math.tan(rad(19)) * aspect * free.w)));
      return { tx: p ? p.position.x * 0.75 : 0, tz: p ? p.position.z * 0.5 : 0, dist: pd, el: rad(66), ox: free.cx, oy: free.cy + free.h * 0.14 };
    }
    return { tx: p ? p.position.x : 0, tz: p ? p.position.z : 0, dist, el: rad(54), ox: free.cx, oy: free.cy };
  }
  let lastCam = performance.now();
  function updateCamera(now) {
    const dt = Math.min(0.1, (now - lastCam) / 1000); lastCam = now;
    if (now - lastFree > 250) {
      lastFree = now; const f = computeFree();
      if (f.key !== free.key || !overview) { free = f; overview = computeOverview(); }
    }
    if (!overview) return;
    const g = cam.mode === 'vitrine' ? { tx: -0.5, tz: 1.5, dist: 40, el: rad(50), az: rad(-26), ox: 0, oy: 0.06 } : cam.mode === 'follow' ? followGoal() : { ...overview, az: 0 };
    if (g.az === undefined) g.az = 0;
    if (!cam.cur) cam.cur = { ...g };
    if (cam.cur.az === undefined) cam.cur.az = 0;
    const k = speed > 1 ? 1 : 1 - Math.exp(-dt * (cam.mode === 'follow' ? 5 : 3.5));
    const c = cam.cur; for (const key of ['tx', 'tz', 'dist', 'el', 'ox', 'oy', 'az']) c[key] += (g[key] - c[key]) * k;
    camera.position.set(c.tx + Math.sin(c.az) * Math.cos(c.el) * c.dist, Math.sin(c.el) * c.dist, c.tz + Math.cos(c.az) * Math.cos(c.el) * c.dist);
    camera.lookAt(c.tx, 0, c.tz); camera.updateMatrixWorld(); camera.updateProjectionMatrix();
    camera.projectionMatrix.elements[8] = -c.ox; camera.projectionMatrix.elements[9] = -c.oy;
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
  }
  function resize() {
    const w = Math.max(1, container.clientWidth); const h = Math.max(1, container.clientHeight);
    renderer.setSize(w, h, false); camera.aspect = w / h; free = computeFree(); overview = computeOverview(); lastFree = performance.now(); cam.cur = null;
  }

  // ----- effets -----
  const fx = createFx(scene, tween);
  const still = () => speed > 1;
  // point près du pion où poser dés et cartes (ramené vers le centre du plateau)
  function anchorPoint() {
    if (cam.mode === 'vitrine') return new THREE.Vector3(3.5, 0, 4.5);
    if (cam.mode !== 'follow' || !pawns[cam.follow]) return new THREE.Vector3(0, 0, 1.7);
    const p = pawns[cam.follow].position; const lim = SIZE / 2 - TILE_H - 0.9;
    return new THREE.Vector3(THREE.MathUtils.clamp(p.x * 0.75, -lim, lim), 0, THREE.MathUtils.clamp(p.z * 0.75, -lim, lim));
  }

  // ----- dés -----
  const dice = createDice(); scene.add(dice.group);
  async function rollDice(values) {
    const an = anchorPoint(); dice.group.position.set(an.x, 0, an.z);
    dice.group.visible = true;
    const spins = dice.dice.map(() => new THREE.Vector3(Math.random() * 6 + 4, Math.random() * 6 + 4, Math.random() * 6 + 4));
    const finals = values.map((v) => dice.quatFor(v, Math.random() * Math.PI * 2));
    const startQ = dice.dice.map((d) => d.quaternion.clone());
    const homes = dice.dice.map((d, k) => new THREE.Vector3(k ? 0.9 : -0.9, 0.5, 0));
    await tween(1000, (t) => {
      dice.dice.forEach((d, k) => {
        const e = ease.out(t);
        const h = Math.abs(Math.sin(t * Math.PI * 2.4)) * Math.pow(1 - t, 1.2) * 3.4; // lancer en arc puis rebonds
        d.position.set(homes[k].x - (1 - e) * (3.2 - k), 0.5 + h + (1 - e) * 2.2, homes[k].z - (1 - e) * 2.8);
        const sq = h < 0.15 && t < 1 ? 0.14 * (1 - t) : 0; // écrasement au contact
        d.scale.set(1 + sq, 1 - sq * 1.4, 1 + sq);
        if (t < 1) {
          const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(spins[k].x * t, spins[k].y * t, spins[k].z * t));
          d.quaternion.copy(startQ[k]).premultiply(q).slerp(finals[k], Math.max(0, (t - 0.72) / 0.28));
        } else { d.quaternion.copy(finals[k]); d.scale.setScalar(1); d.position.copy(homes[k]); }
      });
    });
  }

  // ----- pions -----
  let pawns = []; let pawnState = [];
  function setPlayers(players) {
    for (const p of pawns) scene.remove(p);
    pawns = players.map((pl) => { const m = createPawn(pl.pawn || 'car', pl.color); upgradePawn(m, pl.pawn || 'car'); scene.add(m); return m; });
    pawnState = players.map(() => ({ pos: 0, jail: false })); cam.follow = 0;
  }
  const slotOf = (pid) => pid % 4;
  function placePawn(pid, pos, jail, hidden) {
    const pt = pawnPoint(pos, slotOf(pid), jail);
    pawns[pid].position.set(pt.x, 0.165, pt.z); pawns[pid].visible = !hidden;
    pawnState[pid] = { pos, jail };
  }
  function placePawns(state) {
    state.players.forEach((p, i) => placePawn(i, p.pos, p.inJail, p.bankrupt));
  }
  async function hop(pid, to, jail, dur = 230) {
    const p = pawns[pid]; const from = p.position.clone(); const pt = pawnPoint(to, slotOf(pid), jail);
    const dx = pt.x - from.x; const dz = pt.z - from.z;
    if (Math.abs(dx) + Math.abs(dz) > 0.05) p.rotation.y = Math.atan2(-dz, dx);
    await tween(dur, (t) => {
      p.position.set(from.x + dx * t, 0.165 + Math.sin(t * Math.PI) * (dur > 400 ? 1.6 : 0.7), from.z + dz * t);
      const s = Math.sin(t * Math.PI);
      const squash = t > 0.82 ? Math.sin(((t - 0.82) / 0.18) * Math.PI) * 0.25 : 0;
      p.scale.set(0.9 * (1 - 0.12 * s + squash * 0.6), 0.9 * (1 + 0.2 * s - squash), 0.9 * (1 - 0.12 * s + squash * 0.6));
    });
    p.scale.setScalar(0.9);
    if (!still()) fx.puff(pt.x, pt.z);
  }
  // steps > 0 : avance case par case ; steps < 0 : recule ; teleport : un grand saut.
  async function movePawn(pid, from, to, steps, teleport, jailAfter, onStep) {
    pawns[pid].visible = true; cam.follow = pid;
    if (teleport || !steps) { await hop(pid, to, jailAfter, 520); pawnState[pid] = { pos: to, jail: jailAfter }; return; }
    const dir = steps > 0 ? 1 : -1; let pos = from;
    for (let k = 0; k < Math.abs(steps); k++) { pos = (pos + dir + 40) % 40; if (onStep) onStep(); await hop(pid, pos, false); }
    pawnState[pid] = { pos, jail: false };
  }

  const buildings = createBuildings(tileGroups, tween);

  // ----- effets exposés -----
  const pawnVec = (pid) => (pid != null && pawns[pid] ? pawns[pid].position.clone() : new THREE.Vector3(0, 0.3, 0));
  const fxApi = {
    money: (fromPid, toPid, amount) => (still() ? Promise.resolve() : fx.notes(pawnVec(fromPid), toPid == null ? new THREE.Vector3(0, 0, 0) : pawnVec(toPid), amount)),
    sparklesGo: () => (still() ? null : fx.sparkles(SPACE_INFO[0].x, SPACE_INFO[0].z)),
    confetti: (pid) => { if (still()) return null; const p = pawnVec(pid); return fx.confetti(p.x, p.z); },
    jailBars: (pid) => { if (still()) return Promise.resolve(); const pt = pawnPoint(10, slotOf(pid), true); return fx.bars(pt.x, pt.z); },
    card: (deck) => { if (still()) return Promise.resolve(); const d = decks[deck]; return fx.flyCard(new THREE.Vector3(d.position.x, 0.9, d.position.z), anchorPoint().add(new THREE.Vector3(0, 0.8, 0)), deck === 'surprise' ? '#ff9a2e' : '#3b78e0'); },
  };

  // ----- sélection tolérante d'une case -----
  const ray = new THREE.Raycaster(); const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0.16); const hit = new THREE.Vector3();
  function pickSpace(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    const nd = new THREE.Vector2(((clientX - r.left) / r.width) * 2 - 1, -(((clientY - r.top) / r.height) * 2 - 1));
    ray.setFromCamera(nd, camera);
    if (!ray.ray.intersectPlane(plane, hit)) return -1;
    let best = -1; let bd = 1e9;
    for (const info of SPACE_INFO) {
      const d = Math.hypot(hit.x - info.x, hit.z - info.z);
      if (d < bd) { bd = d; best = SPACES[SPACE_INFO.indexOf(info)].i; }
    }
    return Math.abs(hit.x) > SIZE / 2 + 1.5 || Math.abs(hit.z) > SIZE / 2 + 1.5 ? -1 : (bd < 3.0 ? best : -1);
  }
  // pastille lumineuse sous la case choisie
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.1, 32), new THREE.MeshBasicMaterial({ color: '#ffd23f', side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.visible = false; scene.add(ring);
  function flash(i) {
    const info = SPACE_INFO[i]; ring.position.set(info.x, 0.2, info.z); ring.visible = true;
    return tween(700, (t) => { ring.scale.setScalar(1 + t * 0.8); ring.material.opacity = 1 - t; ring.material.transparent = true; if (t >= 1) ring.visible = false; });
  }

  requestAnimationFrame(tick);
  return {
    renderer, camera, resize, tween, rollDice, setPlayers, placePawns, movePawn, pickSpace, flash,
    syncBoard: (state) => buildings.sync(state),
    fx: fxApi,
    setFollow(pid) { if (pid != null) cam.follow = pid; },
    setCamMode(m) { cam.mode = m; },
    camMode: () => cam.mode,
    peek(space, ms) { const i = SPACE_INFO[space]; if (i) cam.peek = { x: i.x, z: i.z, until: performance.now() + ms / (speed > 1 ? 60 : 1) }; },
    rollDice,
    bigPawns(k) { pawns.forEach((p) => p.scale.setScalar(0.9 * k)); },
    pawnScreen(pid) { const p = pawns[pid]; if (!p) return null; const v = p.position.clone().project(camera); const r = canvas.getBoundingClientRect(); return { x: Math.round((v.x + 1) / 2 * r.width), y: Math.round((1 - v.y) / 2 * r.height) }; },
    setFast(b) { speed = b ? 60 : 1; },
    setPace(k) { if (speed <= 1) speed = 1 / k; }, // ralentit les animations (k > 1) ; sans effet en mode rapide
    pawnState: () => pawnState,
  };
}
