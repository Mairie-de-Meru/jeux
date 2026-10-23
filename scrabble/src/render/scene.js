// Rendu three.js : plateau, tuiles, caméra ajustée, picking tolérant, animations.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { boardTexture, tileTexture, woodTexture, backgroundTexture } from './textures.js';
import { focusSpan, zoomUseful } from '../logic/zoom.js';

const TILE_H = 0.3;
const FRAME_M = 0.22; // marge de cadre en bois montrée autour des cases en vue d'ensemble
const PENDING_LIFT = 0.1;
const ease = {
  outCubic: (k) => 1 - Math.pow(1 - k, 3),
  inOutQuad: (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2),
};

export class BoardView {
  constructor(canvasEl, container) {
    this.canvas = canvasEl;
    this.container = container;
    this.renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene = new THREE.Scene();
    this.scene.background = backgroundTexture();
    this.camera = new THREE.PerspectiveCamera(32, 1, 0.1, 200);
    this.elev = (74 * Math.PI) / 180;

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x8a6a4a, 1.15));
    const sun = new THREE.DirectionalLight(0xffffff, 1.5);
    sun.position.set(-6, 14, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    const sc = sun.shadow.camera;
    sc.left = -12; sc.right = 12; sc.top = 12; sc.bottom = -12; sc.near = 1; sc.far = 40;
    sun.shadow.bias = -0.0004;
    this.scene.add(sun);

    const wood = woodTexture();
    this.table = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ map: wood, roughness: 0.9 }));
    this.table.rotation.x = -Math.PI / 2;
    this.table.position.y = -0.52;
    this.table.receiveShadow = true;
    this.scene.add(this.table);

    this.boardGroup = new THREE.Group();
    this.tilesGroup = new THREE.Group();
    this.ghostGroup = new THREE.Group();
    this.targetGroup = new THREE.Group();
    this.scene.add(this.boardGroup, this.targetGroup, this.tilesGroup, this.ghostGroup);
    // cases jouables : un seul carré partagé (géométrie + matériaux), pulsation dans loop()
    this.cellGeo = new THREE.PlaneGeometry(0.9, 0.9);
    const mk = (fill, edge, w) => {
      const cv = document.createElement('canvas');
      cv.width = cv.height = 64;
      const x = cv.getContext('2d');
      x.fillStyle = fill; x.fillRect(0, 0, 64, 64);
      x.strokeStyle = edge; x.lineWidth = w; x.strokeRect(w / 2, w / 2, 64 - w, 64 - w);
      const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
      return new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    };
    this.targetMat = mk('rgba(255,230,40,0.85)', 'rgba(255,170,0,1)', 9);
    this.centerMat = mk('rgba(255,170,0,0.7)', 'rgba(255,120,0,1)', 8);
    this.markerMat = mk('rgba(255,140,0,0.35)', 'rgba(255,100,0,1)', 14);
    this.marker = new THREE.Mesh(this.cellGeo, this.markerMat);
    this.marker.rotation.x = -Math.PI / 2;
    this.marker.visible = false;
    this.targetGroup.add(this.marker);

    this.tileGeo = new RoundedBoxGeometry(0.92, TILE_H, 0.92, 3, 0.07);
    this.topGeo = new THREE.PlaneGeometry(0.84, 0.84);
    this.bodyMat = new THREE.MeshStandardMaterial({ color: 0xe2b66c, roughness: 0.55 });
    this.topMats = new Map();
    this.tiles = new Map();
    this.anims = [];
    this.size = 9;
    this.focus = false;
    this.rect = null;
    this.target = new THREE.Vector3();
    this.fullPx = 0; // px par case en vue d'ensemble (mesuré à chaque recadrage)
    this.onResize = null; // rappel après recadrage (interface du zoom)

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(container);
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 200));
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  topMat(letter, variant) {
    const k = letter + '|' + variant;
    let m = this.topMats.get(k);
    if (!m) {
      m = new THREE.MeshStandardMaterial({ map: tileTexture(letter, variant), roughness: 0.6, transparent: variant === 'ghost' });
      this.topMats.set(k, m);
    }
    return m;
  }

  setupBoard(size, premium) {
    this.size = size;
    this.clearTiles();
    this.clearGhosts();
    this.setTargets([]);
    this.setMarker(null);
    for (const ch of [...this.boardGroup.children]) {
      this.boardGroup.remove(ch);
      if (ch.geometry) ch.geometry.dispose();
      if (ch.material) { if (ch.material.map) ch.material.map.dispose(); ch.material.dispose(); }
    }
    const frame = new THREE.Mesh(
      new RoundedBoxGeometry(size + 0.9, 0.5, size + 0.9, 3, 0.18),
      new THREE.MeshStandardMaterial({ color: 0x8a5426, roughness: 0.7 }),
    );
    frame.position.y = -0.25;
    frame.receiveShadow = true;
    this.boardGroup.add(frame);
    const surf = new THREE.Mesh(
      new THREE.PlaneGeometry(size, size),
      new THREE.MeshStandardMaterial({ map: boardTexture(size, premium, (size - 1) / 2), roughness: 0.85 }),
    );
    surf.rotation.x = -Math.PI / 2;
    surf.position.y = 0.002;
    surf.receiveShadow = true;
    this.boardGroup.add(surf);
    this.focus = false;
    this.focusPan = null;
    this.measureFull();
    this.fit();
  }

  // --- coordonnées ---
  cellPos(r, c, y = 0) {
    const o = (this.size - 1) / 2;
    return new THREE.Vector3(c - o, y, r - o);
  }

  // --- tuiles ---
  makeTile(letter, variant) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(this.tileGeo, this.bodyMat);
    body.position.y = TILE_H / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    const top = new THREE.Mesh(this.topGeo, this.topMat(letter, variant));
    top.rotation.x = -Math.PI / 2;
    top.position.y = TILE_H + 0.003;
    g.add(body, top);
    g.userData = { letter, variant, top };
    return g;
  }

  addTile(r, c, letter, variant = 'normal', { drop = false } = {}) {
    const g = this.makeTile(letter, variant);
    g.position.copy(this.cellPos(r, c, variant === 'pending' ? PENDING_LIFT : 0));
    this.tilesGroup.add(g);
    this.tiles.set(r + ',' + c, g);
    if (drop) this.dropIn(g);
    return g;
  }

  setVariant(r, c, variant) {
    const g = this.tiles.get(r + ',' + c);
    if (!g) return;
    g.userData.variant = variant;
    g.position.y = variant === 'pending' ? PENDING_LIFT : 0;
    g.userData.top.material = this.topMat(g.userData.letter, variant);
  }

  removeTile(r, c) {
    const g = this.tiles.get(r + ',' + c);
    if (!g) return;
    this.tilesGroup.remove(g);
    this.tiles.delete(r + ',' + c);
  }

  clearTiles() {
    for (const g of this.tiles.values()) this.tilesGroup.remove(g);
    this.tiles.clear();
  }

  hasTile(r, c) { return this.tiles.has(r + ',' + c); }

  setGhosts(list) {
    this.clearGhosts();
    for (const { r, c, l } of list) {
      const m = new THREE.Mesh(this.topGeo, this.topMat(l, 'ghost'));
      m.rotation.x = -Math.PI / 2;
      m.position.copy(this.cellPos(r, c, TILE_H + 0.02));
      m.userData.ghost = true;
      this.ghostGroup.add(m);
    }
  }
  setTargets(cells, strong = null) {
    for (const m of [...this.targetGroup.children]) if (m !== this.marker) this.targetGroup.remove(m);
    for (const [r, c] of cells || []) {
      const m = new THREE.Mesh(this.cellGeo, strong && strong[0] === r && strong[1] === c ? this.centerMat : this.targetMat);
      m.rotation.x = -Math.PI / 2;
      m.position.copy(this.cellPos(r, c, 0.045));
      this.targetGroup.add(m);
    }
  }

  // Marqueur fort sur la case visée (survol souris ou glisser) ; null pour le masquer.
  setMarker(cell) {
    this.marker.visible = !!cell;
    if (cell) this.marker.position.copy(this.cellPos(cell.r, cell.c, 0.06));
  }

  clearGhosts() { for (const ch of [...this.ghostGroup.children]) this.ghostGroup.remove(ch); }

  // --- animations ---
  animate(dur, update, done) {
    return new Promise((res) => {
      this.anims.push({ t0: performance.now(), dur, update, done: () => { if (done) done(); res(); } });
    });
  }

  dropIn(g) {
    const y0 = g.position.y;
    g.scale.set(1.12, 1, 1.12);
    return this.animate(380, (k) => {
      const e = ease.outCubic(k);
      g.position.y = y0 + 1.4 * (1 - e);
      const sq = k > 0.7 ? Math.sin(((k - 0.7) / 0.3) * Math.PI) * 0.22 : 0;
      g.scale.set(1.12 - 0.12 * e + sq * 0.5, 1 - sq, 1.12 - 0.12 * e + sq * 0.5);
    }, () => { g.position.y = y0; g.scale.set(1, 1, 1); });
  }

  pop(g) {
    return this.animate(420, (k) => {
      const s = 1 + 0.18 * Math.sin(k * Math.PI);
      g.scale.set(s, 1 + 0.35 * Math.sin(k * Math.PI), s);
    }, () => g.scale.set(1, 1, 1));
  }

  // Une tuile de robot vole depuis le bord haut du plateau jusqu'à sa case.
  async flyTile(r, c, letter, variant, from, dur = 520) {
    const g = this.makeTile(letter, variant);
    const to = this.cellPos(r, c);
    const start = from ? from.clone() : this.cellPos(-3, (this.size - 1) / 2, 3.5);
    g.position.copy(start);
    this.tilesGroup.add(g);
    this.tiles.set(r + ',' + c, g);
    await this.animate(dur, (k) => {
      const e = ease.inOutQuad(k);
      g.position.lerpVectors(start, to, e);
      g.position.y += Math.sin(k * Math.PI) * 1.6;
      g.rotation.y = (1 - e) * 0.9;
    }, () => { g.position.copy(to); g.rotation.y = 0; });
    this.pop(g);
    return g;
  }

  loop(now) {
    requestAnimationFrame(this.loop);
    if (this.anims.length) {
      const keep = [];
      for (const a of this.anims) {
        const k = Math.min(1, (now - a.t0) / a.dur);
        a.update(k);
        if (k >= 1) a.done(); else keep.push(a);
      }
      this.anims = keep;
    }
    const pulse = 0.5 + 0.5 * Math.sin(now / 260);
    const e = ease.inOutQuad(pulse);
    this.targetMat.opacity = 0.55 + 0.45 * e;
    this.centerMat.opacity = 0.75 + 0.25 * e;
    const sc = 0.9 + 0.1 * e;
    for (const m of this.targetGroup.children) if (m !== this.marker) m.scale.set(sc, sc, 1);
    for (const m of this.ghostGroup.children) m.position.y = TILE_H + 0.03 + pulse * 0.12;
    this.renderer.render(this.scene, this.camera);
  }

  // --- caméra ---
  resize() {
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    // petit écran : caméra plus plongeante (cases plus grandes, moins de fuite) ; 74° sur grand écran
    const k = Math.max(0, Math.min(1, (Math.min(w, h) - 380) / 320));
    this.elev = ((82 - 8 * k) * Math.PI) / 180;
    this.measureFull();
    if (this.focus && !this.zoomUseful()) this.focus = false;
    this.fit();
    if (this.onResize) this.onResize();
  }

  // Mesure les px par case du plateau entier, sans changer le cadrage courant.
  measureFull() {
    if (!this.camera) return;
    const f = this.focus;
    this.focus = false;
    this.fit();
    this.fullPx = this.cellPx();
    this.focus = f;
  }

  zoomUseful() { return zoomUseful(this.fullPx); }

  // Zoom centré sur une case (double-tap, pincement).
  zoomAt(r, c) {
    if (!this.zoomUseful()) return;
    this.focus = true;
    this.focusCells = [[r, c]];
    this.focusPan = null;
    this.fit();
  }

  setFocus(on, cells) {
    this.focus = !!on && this.zoomUseful();
    this.focusCells = cells || [];
    this.focusPan = null; // un nouveau cadrage automatique annule le déplacement manuel
    this.fit();
  }

  // Centre (en cases, repère plateau) de la fenêtre zoomée : lettres en cours, sinon centre.
  focusCenter() {
    const o = (this.size - 1) / 2;
    if (this.focusPan) return this.focusPan;
    const cells = this.focusCells || [];
    if (!cells.length) return { x: 0, z: 0 };
    let r0 = Infinity, r1 = -Infinity, c0 = Infinity, c1 = -Infinity;
    for (const [r, c] of cells) { r0 = Math.min(r0, r); r1 = Math.max(r1, r); c0 = Math.min(c0, c); c1 = Math.max(c1, c); }
    return { x: (c0 + c1) / 2 - o, z: (r0 + r1) / 2 - o };
  }

  // Déplace la fenêtre zoomée de dr lignes / dc colonnes (flèches).
  panFocus(dr, dc) {
    if (!this.focus) return;
    const c = this.focusCenter();
    this.focusPan = { x: c.x + dc, z: c.z + dr };
    this.fit();
  }

  // Nombre de cases visibles en zoom : cases d'environ 40 px CSS, entre 5 et la taille du plateau.
  focusSpan() { return focusSpan(this.fullPx, this.size, { frame: this.size + 2 * FRAME_M }); }

  currentRect() {
    const n = this.size;
    const m = n / 2 + FRAME_M;
    if (!this.focus) return { x0: -m, x1: m, z0: -m, z1: m };
    const span = this.focusSpan();
    const lim = Math.max(0, n / 2 + 0.3 - span / 2);
    const ctr = this.focusCenter();
    const cx = Math.max(-lim, Math.min(lim, ctr.x));
    const cz = Math.max(-lim, Math.min(lim, ctr.z));
    if (this.focusPan) this.focusPan = { x: cx, z: cz };
    return { x0: cx - span / 2, x1: cx + span / 2, z0: cz - span / 2, z1: cz + span / 2 };
  }

  // Taille d'une case en pixels écran (projection de deux coins opposés au centre de la vue).
  cellPx() {
    const rect = this.canvas.getBoundingClientRect();
    const ctr = this.focus ? this.focusCenter() : { x: 0, z: 0 };
    const o = (this.size - 1) / 2;
    const r = Math.round(ctr.z + o), c = Math.round(ctr.x + o);
    const pt = (dr, dc) => {
      const v = this.cellPos(r + dr, c + dc, TILE_H * 0.5).project(this.camera);
      return { x: ((v.x + 1) / 2) * rect.width, y: ((1 - v.y) / 2) * rect.height };
    };
    const a = pt(0, 0), bx = pt(0, 1), bz = pt(1, 0);
    return Math.min(Math.hypot(bx.x - a.x, bx.y - a.y), Math.hypot(bz.x - a.x, bz.y - a.y));
  }

  fit() {
    if (!this.camera) return;
    const rect = this.currentRect();
    const cam = this.camera;
    const dir = new THREE.Vector3(0, Math.sin(this.elev), Math.cos(this.elev));
    const target = new THREE.Vector3((rect.x0 + rect.x1) / 2, 0, (rect.z0 + rect.z1) / 2);
    const corners = [];
    for (const x of [rect.x0, rect.x1]) for (const z of [rect.z0, rect.z1]) for (const y of [0, 0.4]) corners.push(new THREE.Vector3(x, y, z));
    const metrics = (d) => {
      cam.position.copy(target).addScaledVector(dir, d);
      cam.lookAt(target);
      cam.updateMatrixWorld(true);
      let mx = 0, y0 = Infinity, y1 = -Infinity;
      for (const p of corners) {
        const v = p.clone().project(cam);
        mx = Math.max(mx, Math.abs(v.x));
        y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y);
      }
      return { mx, y0, y1 };
    };
    let dist = 10;
    for (let it = 0; it < 4; it++) {
      let lo = 2, hi = 120;
      for (let i = 0; i < 24; i++) {
        const mid = (lo + hi) / 2;
        const m = metrics(mid);
        if (m.mx <= 0.97 && m.y0 >= -0.97 && m.y1 <= 0.97) hi = mid; else lo = mid;
      }
      dist = hi;
      const m = metrics(dist);
      const dy = (m.y0 + m.y1) / 2;
      target.z -= (dy * dist * Math.tan((cam.fov * Math.PI) / 360)) / Math.sin(this.elev);
    }
    metrics(dist);
    this.target.copy(target);
  }

  // --- picking ---
  worldFromPointer(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -(((clientY - rect.top) / rect.height) * 2 - 1));
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -TILE_H * 0.5);
    const hit = new THREE.Vector3();
    return ray.ray.intersectPlane(plane, hit) ? hit : null;
  }

  cellScreen(r, c) {
    const rect = this.canvas.getBoundingClientRect();
    const v = this.cellPos(r, c, TILE_H * 0.5).project(this.camera);
    return { x: rect.left + ((v.x + 1) / 2) * rect.width, y: rect.top + ((1 - v.y) / 2) * rect.height };
  }

  // Case sous le pointeur ; si elle n'est pas libre, la case libre la plus proche à moins de `tol` px.
  pickCell(clientX, clientY, isFree, tol = 40) {
    const w = this.worldFromPointer(clientX, clientY);
    if (!w) return null;
    const o = (this.size - 1) / 2;
    const r0 = Math.round(w.z + o), c0 = Math.round(w.x + o);
    const n = this.size;
    if (r0 >= 0 && c0 >= 0 && r0 < n && c0 < n && isFree(r0, c0)) return { r: r0, c: c0 };
    let best = null, bd = tol;
    for (let r = Math.max(0, r0 - 3); r <= Math.min(n - 1, r0 + 3); r++) {
      for (let c = Math.max(0, c0 - 3); c <= Math.min(n - 1, c0 + 3); c++) {
        if (!isFree(r, c)) continue;
        const p = this.cellScreen(r, c);
        const d = Math.hypot(p.x - clientX, p.y - clientY);
        if (d < bd) { bd = d; best = { r, c }; }
      }
    }
    return best;
  }

  // Case exacte (pour reprendre une tuile posée) avec la même tolérance.
  pickExact(clientX, clientY, predicate, tol = 28) {
    return this.pickCell(clientX, clientY, predicate, tol);
  }
}
