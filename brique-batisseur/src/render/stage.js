// Scène three.js : plaque, pièces, fantôme, hologramme, aperçu du modèle (2e viewport), caméra.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { PIECES, colorById, footprint } from '../logic/pieces.js';
import { SIZE } from '../logic/board.js';
import { PLATE, STUD_H, pieceGeometry, studGeometry } from './geometry.js';
import { solidMaterial, holoMaterial, ghostMaterial, fadedMaterial, stepMaterial } from './materials.js';
import { easeInCubic, clamp01 } from './ease.js';

const HALF_PI = Math.PI / 2;
const DROP_FALL = 0.26;
const DROP_TOTAL = 0.6;

function placeMesh(mesh, p) {
  const fp = footprint(p.type, p.rot);
  mesh.position.set(p.x + fp.w / 2, p.y * PLATE, p.z + fp.d / 2);
  mesh.rotation.y = p.rot * HALF_PI;
}

const poseKey = (p) => `${p.x},${p.z},${p.y},${p.rot}`;

export class Stage {
  constructor(canvas) {
    this.canvas = canvas;
    this.size = SIZE;
    const r = (this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }));
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.setClearColor(0x000000, 0);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 220);
    const h = this.size / 2;
    this.camera.position.set(h + 11, 20, h + 17);
    const c = (this.controls = new OrbitControls(this.camera, canvas));
    c.target.set(h, 0.8, h);
    c.enableDamping = true;
    c.dampingFactor = 0.12;
    c.minPolarAngle = 0.12;
    c.maxPolarAngle = HALF_PI - 0.12;
    c.minDistance = 5;
    c.maxDistance = this.size * 2.9;
    c.screenSpacePanning = false;
    c.mouseButtons.RIGHT = THREE.MOUSE.ROTATE; // glisser au clic droit = tourner le terrain (clic court = retirer, géré par main.js)
    c.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }; // 1 doigt = orbite, 2 doigts = zoom + déplacement
    c.rotateSpeed = 0.8;
    c.update();

    this._buildLights();
    this.baseGroup = new THREE.Group();
    this.scene.add(this.baseGroup);
    this._buildBase();

    this.group = new THREE.Group(); // pièces posées
    this.scene.add(this.group);
    this.meshes = new Map(); // uid → mesh
    this.pickList = [this.plate];
    this.anims = [];

    this.ghost = new THREE.Mesh(pieceGeometry('b2x2'), ghostMaterial);
    this.ghost.visible = false;
    this.ghost.renderOrder = 3;
    this.ghostType = 'b2x2';
    this.scene.add(this.ghost);

    this.holo = new THREE.Group();
    this.scene.add(this.holo);
    this.holoTimer = 0;

    this.step = new THREE.Mesh(pieceGeometry('b2x2'), stepMaterial);
    this.step.visible = false;
    this.step.renderOrder = 4;
    this.stepType = 'b2x2';
    this.stepTime = 0;
    this.scene.add(this.step);
    this.thumbs = new Map(); // id → dataURL

    this._buildPreview();
    this.previewEl = null;
    this.previewRect = { x: 0, y: 0, w: 0, h: 0 };

    this.raycaster = new THREE.Raycaster();
    this._ndc = new THREE.Vector2();
    this._n = new THREE.Vector3();
    this._pick = { cx: -1, cz: -1, uid: null, onBoard: false };

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  _buildLights() {
    const hemi = new THREE.HemisphereLight(0xffffff, 0xcfd8ff, 1.0);
    this.scene.add(hemi);
    const sun = (this.sun = new THREE.DirectionalLight(0xfff4e0, 2.0));
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 5;
    this._fitSun();
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.02;
    this.scene.add(sun, sun.target);
  }

  _fitSun() {
    const h = this.size / 2;
    const sun = this.sun;
    sun.position.set(h + 5, 24, h + 3);
    sun.target.position.set(h, 0, h);
    const sc = sun.shadow.camera;
    const e = this.size * 0.95;
    sc.left = -e; sc.right = e; sc.top = e; sc.bottom = -e;
    sc.far = 40 + this.size * 1.5;
    sc.updateProjectionMatrix();
  }

  /** Reconstruit la plaque à la taille n et recentre caméra, cible et ombres. */
  setPlateSize(n) {
    if (n === this.size) return;
    this.size = n;
    this._disposeBase();
    this._buildBase();
    this._fitSun();
    this.controls.maxDistance = n * 2.9;
    this.resetView();
    this.pickList = [this.plate, ...this.meshes.values()];
  }

  /** Remet la caméra au cadrage de départ pour la taille de plaque courante. */
  resetView() {
    const c = this.controls;
    const n = this.size, h = n / 2;
    c.target.set(h, 0.8, h);
    this.camera.position.set(h + 11 * n / 16, 20 * n / 16, h + 17 * n / 16);
    this.zoomTo = null;
    c.update();
  }

  _disposeBase() {
    for (const o of [...this.baseGroup.children]) {
      this.baseGroup.remove(o);
      if (o.geometry && o.geometry !== studGeometry()) o.geometry.dispose();
      if (o.isInstancedMesh) o.dispose();
      if (o.material && o.material !== this._plateMat) o.material.dispose();
    }
    if (this._plateMat) { this._plateMat.dispose(); this._plateMat = null; }
  }

  _buildBase() {
    const s = this.size;
    const table = new THREE.Mesh(
      new THREE.CylinderGeometry(s * 2, s * 2, 0.5, 64),
      new THREE.MeshStandardMaterial({ color: '#e0a868', roughness: 0.85 }),
    );
    table.position.set(s / 2, -0.4 - 0.25, s / 2);
    table.receiveShadow = true;
    this.baseGroup.add(table);

    const green = (this._plateMat = new THREE.MeshStandardMaterial({ color: '#9ad9a8', roughness: 0.55 }));
    const plate = (this.plate = new THREE.Mesh(new RoundedBoxGeometry(s, 0.4, s, 3, 0.12), green));
    plate.position.set(s / 2, -0.2, s / 2);
    plate.receiveShadow = true;
    plate.castShadow = true;
    this.baseGroup.add(plate);

    const studs = new THREE.InstancedMesh(studGeometry(), green, s * s);
    const m = new THREE.Matrix4();
    let i = 0;
    for (let x = 0; x < s; x++) for (let z = 0; z < s; z++) {
      m.makeTranslation(x + 0.5, STUD_H / 2, z + 0.5);
      studs.setMatrixAt(i++, m);
    }
    studs.receiveShadow = true;
    this.baseGroup.add(studs);
  }

  _buildPreview() {
    this.previewScene = new THREE.Scene();
    this.previewScene.add(new THREE.HemisphereLight(0xffffff, 0xcfd8ff, 1.2));
    const d = new THREE.DirectionalLight(0xffffff, 1.8);
    d.position.set(5, 10, 6);
    this.previewScene.add(d);
    this.previewCam = new THREE.PerspectiveCamera(35, 1, 0.1, 80);
    this.previewPivot = new THREE.Group();
    this.previewScene.add(this.previewPivot);
    this.previewActive = false;
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.width = w;
    this.height = h;
    this.renderer.setSize(w, h, false);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    const aspect = w / h;
    this.camera.aspect = aspect;
    const base = THREE.MathUtils.degToRad(40);
    this.camera.fov = THREE.MathUtils.radToDeg(aspect < 1.1 ? 2 * Math.atan(Math.tan(base / 2) * 1.1 / aspect) : base);
    this.camera.updateProjectionMatrix();
    this.updatePreviewRect();
  }

  // ---- pièces posées ---------------------------------------------------------
  _addMesh(p, animate) {
    const mesh = new THREE.Mesh(pieceGeometry(p.type), solidMaterial(p.color));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.uid = p.uid;
    mesh.userData.pose = poseKey(p);
    placeMesh(mesh, p);
    this.group.add(mesh);
    this.meshes.set(p.uid, mesh);
    this.pickList.push(mesh);
    if (animate) {
      mesh.userData.baseY = mesh.position.y;
      this.anims.push({ kind: 'drop', mesh, t: 0 });
      this._applyDrop(mesh, 0);
    }
  }

  _dropPick(mesh) {
    const i = this.pickList.indexOf(mesh);
    if (i >= 0) this.pickList.splice(i, 1);
  }

  /** Aligne les meshes sur la liste de pièces (ajouts avec chute, retraits avec rétrécissement). */
  sync(pieces, animate = true) {
    const live = new Set();
    for (const p of pieces) {
      live.add(p.uid);
      const old = this.meshes.get(p.uid);
      if (old && old.userData.pose !== poseKey(p)) {
        // pièce tournée : on remplace son mesh (petite chute = retour visuel)
        this.anims = this.anims.filter((a) => a.mesh !== old);
        this.group.remove(old);
        this._dropPick(old);
        this.meshes.delete(p.uid);
      }
      if (!this.meshes.has(p.uid)) this._addMesh(p, animate);
    }
    for (const [uid, mesh] of this.meshes) {
      if (live.has(uid)) continue;
      this.meshes.delete(uid);
      this._dropPick(mesh);
      if (animate) this.anims.push({ kind: 'shrink', mesh, t: 0 });
      else this.group.remove(mesh);
    }
  }

  shake(uid) {
    const mesh = this.meshes.get(uid);
    if (!mesh) return;
    if (this.anims.some((a) => a.mesh === mesh && a.kind === 'shake')) return;
    this.anims.push({ kind: 'shake', mesh, t: 0, bx: mesh.position.x });
  }

  _applyDrop(mesh, t) {
    const base = mesh.userData.baseY;
    if (t < DROP_FALL) {
      const q = t / DROP_FALL;
      mesh.position.y = base + 1.5 * (1 - q * q);
      mesh.scale.set(1 - 0.06 * q, 1 + 0.12 * q, 1 - 0.06 * q);
    } else {
      const q = clamp01((t - DROP_FALL) / (DROP_TOTAL - DROP_FALL));
      const a = (1 - q) * Math.cos(q * Math.PI * 1.5);
      mesh.position.y = base;
      mesh.scale.set(1 + 0.12 * a, 1 - 0.26 * a, 1 + 0.12 * a);
    }
  }

  _updateAnims(dt) {
    for (let i = this.anims.length - 1; i >= 0; i--) {
      const a = this.anims[i];
      a.t += dt;
      const m = a.mesh;
      if (a.kind === 'drop') {
        if (a.t >= DROP_TOTAL) {
          m.position.y = m.userData.baseY;
          m.scale.set(1, 1, 1);
          this.anims.splice(i, 1);
        } else this._applyDrop(m, a.t);
      } else if (a.kind === 'shrink') {
        const q = clamp01(a.t / 0.25);
        const s = Math.max(0.001, 1 - easeInCubic(q));
        m.scale.set(s, s, s);
        if (q >= 1) { this.group.remove(m); this.anims.splice(i, 1); }
      } else if (a.kind === 'shake') {
        const q = clamp01(a.t / 0.4);
        m.position.x = a.bx + Math.sin(a.t * 60) * 0.07 * (1 - q);
        if (q >= 1) { m.position.x = a.bx; this.anims.splice(i, 1); }
      }
    }
  }

  // ---- fantôme ---------------------------------------------------------------
  setGhost(visible, type, rot, x, z, y, ok, colorId) {
    const g = this.ghost;
    if (!visible) { g.visible = false; return; }
    if (type !== this.ghostType) { g.geometry = pieceGeometry(type); this.ghostType = type; }
    placeMesh(g, { type, rot, x, z, y });
    if (ok) {
      ghostMaterial.color.set(colorById(colorId)?.hex ?? '#ffffff');
      ghostMaterial.opacity = 0.5;
    } else {
      ghostMaterial.color.set('#ffb3ad');
      ghostMaterial.opacity = 0.55;
    }
    g.visible = true;
  }

  // ---- brique suivante (mode pas à pas) ----------------------------------------
  /** Affiche la brique à poser, pulsante, à sa place exacte. */
  showStep(p) {
    const m = this.step;
    if (p.type !== this.stepType) { m.geometry = pieceGeometry(p.type); this.stepType = p.type; }
    placeMesh(m, p);
    m.userData.baseY = m.position.y;
    const hex = colorById(p.color)?.hex ?? '#ffffff';
    stepMaterial.color.set(hex);
    stepMaterial.emissive.set(hex);
    this.stepTime = 0;
    m.visible = true;
  }

  clearStep() { this.step.visible = false; }

  /** Pièce posée semi-transparente (pendant qu'on la déplace) ou normale. */
  setFaded(uid, on, colorId) {
    const mesh = this.meshes.get(uid);
    if (mesh) mesh.material = on ? fadedMaterial(colorId) : solidMaterial(colorId);
  }

  // ---- hologramme ------------------------------------------------------------
  /** Affiche les pièces en translucide. seconds > 0 : disparaît tout seul. */
  showHologram(pieces, seconds = 0) {
    this.hideHologram();
    for (const p of pieces) {
      const mesh = new THREE.Mesh(pieceGeometry(p.type), holoMaterial(p.color));
      placeMesh(mesh, p);
      mesh.scale.setScalar(1.01);
      mesh.renderOrder = 2;
      this.holo.add(mesh);
    }
    this.holoTimer = seconds;
  }

  hideHologram() {
    this.holo.clear();
    this.holoTimer = 0;
  }

  // ---- aperçu du modèle (fiche) ---------------------------------------------
  setPreview(pieces) {
    this.previewPivot.clear();
    this.previewPivot.rotation.y = 0.6;
    this.previewActive = !!pieces;
    if (!pieces || !pieces.length) { this.previewActive = false; return; }
    let minX = 99, minZ = 99, maxX = -99, maxZ = -99, maxY = 0;
    for (const p of pieces) {
      const fp = footprint(p.type, p.rot);
      minX = Math.min(minX, p.x); minZ = Math.min(minZ, p.z);
      maxX = Math.max(maxX, p.x + fp.w); maxZ = Math.max(maxZ, p.z + fp.d);
      maxY = Math.max(maxY, (p.y + PIECES[p.type].h) * PLATE);
    }
    const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2;
    for (const p of pieces) {
      const mesh = new THREE.Mesh(pieceGeometry(p.type), solidMaterial(p.color));
      placeMesh(mesh, p);
      mesh.position.x -= cx;
      mesh.position.z -= cz;
      this.previewPivot.add(mesh);
    }
    const r = Math.max(maxX - minX, maxZ - minZ, maxY) * 0.5 + 0.8;
    const dist = r * 3.4;
    this.previewCam.position.set(dist * 0.55, maxY / 2 + dist * 0.5, dist * 0.8);
    this.previewCam.lookAt(0, maxY / 2, 0);
  }

  setPreviewElement(el) {
    this.previewEl = el;
    this.updatePreviewRect();
  }

  updatePreviewRect() {
    if (!this.previewEl) return;
    const b = this.previewEl.getBoundingClientRect();
    this.previewRect.x = b.left;
    this.previewRect.y = this.height - b.bottom;
    this.previewRect.w = b.width;
    this.previewRect.h = b.height;
  }

  // ---- sélection par rayon -----------------------------------------------------
  /** → { cx, cz, uid, onBoard } (objet réutilisé) ou null si rien n'est touché. */
  pick(clientX, clientY, excludeUid = null) {
    const rect = this.canvas.getBoundingClientRect();
    this._ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(this._ndc, this.camera);
    const list = excludeUid == null ? this.pickList : this.pickList.filter((o) => o.userData.uid !== excludeUid);
    const hits = this.raycaster.intersectObjects(list, false);
    if (!hits.length) return null;
    const h = hits[0];
    const n = this._n.copy(h.face.normal).transformDirection(h.object.matrixWorld);
    const px = h.point.x + n.x * 0.01;
    const pz = h.point.z + n.z * 0.01;
    const cx = Math.floor(px), cz = Math.floor(pz);
    const pk = this._pick;
    pk.cx = cx;
    pk.cz = cz;
    pk.uid = h.object === this.plate ? null : h.object.userData.uid;
    pk.onBoard = cx >= 0 && cz >= 0 && cx < this.size && cz < this.size;
    return pk;
  }

  /** Rapproche (f < 1) ou éloigne (f > 1) la caméra, en douceur. */
  zoom(f) {
    const c = this.controls;
    const d = this.camera.position.distanceTo(c.target);
    this.zoomTo = Math.min(Math.max((this.zoomTo ?? d) * f, c.minDistance), c.maxDistance);
  }

  /** Point écran (px CSS) du haut d'une pièce posée, ou null. */
  screenOf(uid) {
    const mesh = this.meshes.get(uid);
    if (!mesh) return null;
    const box = new THREE.Box3().setFromObject(mesh);
    const v = new THREE.Vector3((box.min.x + box.max.x) / 2, box.max.y, (box.min.z + box.max.z) / 2).project(this.camera);
    const r = this.canvas.getBoundingClientRect();
    return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height };
  }

  /** Point écran (px CSS) du centre du dessus de la case (x,z) à la hauteur y (en plaques). */
  screenOfCell(x, z, y = 0) {
    const v = new THREE.Vector3(x + 0.5, y * PLATE, z + 0.5).project(this.camera);
    const r = this.canvas.getBoundingClientRect();
    return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height };
  }

  // ---- vignettes des cartes ----------------------------------------------------
  /** Image (dataURL, 2× pour 170×150 CSS) du modèle, rendue hors écran et mise en cache par id. */
  thumbnail(id, pieces, w = 170, h = 150) {
    if (this.thumbs.has(id)) return this.thumbs.get(id);
    let url = null;
    try {
      if (!this._thumb) {
        const canvas = document.createElement('canvas');
        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
        renderer.setPixelRatio(2);
        renderer.setSize(w, h, false);
        renderer.setClearColor(0x000000, 0);
        const scene = new THREE.Scene();
        scene.add(new THREE.HemisphereLight(0xffffff, 0xcfd8ff, 1.2));
        const d = new THREE.DirectionalLight(0xffffff, 1.8);
        d.position.set(5, 10, 6);
        scene.add(d);
        const group = new THREE.Group();
        scene.add(group);
        this._thumb = { renderer, scene, group, camera: new THREE.PerspectiveCamera(35, w / h, 0.1, 120) };
      }
      const { renderer, scene, group, camera } = this._thumb;
      group.clear();
      let minX = 99, minZ = 99, maxX = -99, maxZ = -99, maxY = 0;
      for (const p of pieces) {
        const fp = footprint(p.type, p.rot);
        minX = Math.min(minX, p.x); minZ = Math.min(minZ, p.z);
        maxX = Math.max(maxX, p.x + fp.w); maxZ = Math.max(maxZ, p.z + fp.d);
        maxY = Math.max(maxY, (p.y + PIECES[p.type].h) * PLATE);
      }
      const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2;
      for (const p of pieces) {
        const mesh = new THREE.Mesh(pieceGeometry(p.type), solidMaterial(p.color));
        placeMesh(mesh, p);
        mesh.position.x -= cx;
        mesh.position.z -= cz;
        group.add(mesh);
      }
      group.rotation.y = 0.5;
      const r = Math.max(maxX - minX, maxZ - minZ, maxY) * 0.5 + 0.6;
      const dist = r * 3.1;
      camera.position.set(dist * 0.45, maxY / 2 + dist * 0.45, dist * 0.85);
      camera.lookAt(0, maxY / 2, 0);
      renderer.render(scene, camera);
      url = renderer.domElement.toDataURL('image/png');
      group.clear();
    } catch { url = null; }
    this.thumbs.set(id, url);
    return url;
  }

  // ---- boucle ---------------------------------------------------------------
  update(dt) {
    if (this.zoomTo != null) {
      const c = this.controls;
      const off = this.camera.position.clone().sub(c.target);
      const d = off.length();
      const nd = d + (this.zoomTo - d) * Math.min(1, dt * 10);
      this.camera.position.copy(c.target).add(off.setLength(nd));
      if (Math.abs(nd - this.zoomTo) < 0.05) this.zoomTo = null;
    }
    this.controls.update();
    const t = this.controls.target;
    t.x = Math.min(Math.max(t.x, 0), this.size);
    t.z = Math.min(Math.max(t.z, 0), this.size);
    t.y = Math.min(Math.max(t.y, 0), 6);
    this._updateAnims(dt);
    if (this.holoTimer > 0) {
      this.holoTimer -= dt;
      if (this.holoTimer <= 0) this.hideHologram();
    }
    if (this.previewActive) this.previewPivot.rotation.y += dt * 0.6;
    if (this.step.visible) {
      this.stepTime += dt;
      const k = 0.5 + 0.5 * Math.sin(this.stepTime * 5);
      stepMaterial.opacity = 0.35 + 0.35 * k;
      stepMaterial.emissiveIntensity = 0.2 + 0.4 * k;
      const s = 1.02 + 0.04 * k;
      this.step.scale.set(s, 1 + 0.02 * k, s);
      this.step.position.y = this.step.userData.baseY + 0.12 * k;
    }
  }

  render() {
    const r = this.renderer;
    r.setScissorTest(false);
    r.setViewport(0, 0, this.width, this.height);
    r.render(this.scene, this.camera);
    const pr = this.previewRect;
    if (this.previewActive && pr.w > 4 && pr.h > 4) {
      r.autoClear = false;
      r.setScissorTest(true);
      r.setViewport(pr.x, pr.y, pr.w, pr.h);
      r.setScissor(pr.x, pr.y, pr.w, pr.h);
      r.setClearColor(0xfff3d6, 1);
      r.clear();
      this.previewCam.aspect = pr.w / pr.h;
      this.previewCam.updateProjectionMatrix();
      r.render(this.previewScene, this.previewCam);
      r.setScissorTest(false);
      r.setClearColor(0x000000, 0);
      r.setViewport(0, 0, this.width, this.height);
      r.autoClear = true;
    }
  }
}
