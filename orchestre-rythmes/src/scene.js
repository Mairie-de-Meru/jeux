// Scène 3D : estrade de concert, 6 instruments en formes arrondies, rebonds squash & stretch.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { INSTRUMENTS } from './logic/instruments.js';

// ---------- easing maison ----------
const clamp01 = (x) => Math.max(0, Math.min(1, x));

// ---------- géométries partagées ----------
const G = {
  cyl: (rt, rb, h, seg = 28) => new THREE.CylinderGeometry(rt, rb, h, seg),
};
const geoCache = new Map();
function geo(key, make) {
  if (!geoCache.has(key)) geoCache.set(key, make());
  return geoCache.get(key);
}
const rbox = (w, h, d, r = 0.08) => geo(`rb${w},${h},${d},${r}`, () => new RoundedBoxGeometry(w, h, d, 4, r));
const cyl = (rt, rb, h, seg) => geo(`cy${rt},${rb},${h},${seg}`, () => G.cyl(rt, rb, h, seg));
const sph = (r) => geo(`sp${r}`, () => new THREE.SphereGeometry(r, 24, 16));
const tor = (r, t, rs, ts) => geo(`to${r},${t},${rs},${ts}`, () => new THREE.TorusGeometry(r, t, rs, ts));
const cone = (r, h) => geo(`co${r},${h}`, () => new THREE.ConeGeometry(r, h, 28, 1, true));

// ---------- construction des instruments ----------
function fabrique(id, couleur) {
  const mats = [];
  const mat = (c, extra = {}) => {
    const m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, metalness: 0.05, emissive: 0x000000, ...extra });
    mats.push(m);
    return m;
  };
  const mesh = (g, m, x = 0, y = 0, z = 0) => {
    const o = new THREE.Mesh(g, m);
    o.position.set(x, y, z);
    o.castShadow = true;
    o.receiveShadow = true;
    return o;
  };
  const corps = new THREE.Group();
  const principal = mat(couleur);
  const creme = mat(0xfff3d6);
  const sombre = mat(0x3b2f4a);

  if (id === 'tambour') {
    corps.add(mesh(cyl(0.75, 0.75, 0.9, 36), principal, 0, 0.45, 0));
    corps.add(mesh(cyl(0.78, 0.78, 0.08, 36), creme, 0, 0.93, 0));
    const r1 = mesh(tor(0.77, 0.05, 8, 36), sombre, 0, 0.93, 0);
    r1.rotation.x = Math.PI / 2;
    corps.add(r1);
    const r2 = mesh(tor(0.76, 0.05, 8, 36), sombre, 0, 0.02, 0);
    r2.rotation.x = Math.PI / 2;
    corps.add(r2);
    for (const s of [-1, 1]) {
      const b = mesh(cyl(0.05, 0.05, 1.0, 10), creme, 0.1 * s, 1.0, 0.1);
      b.rotation.set(Math.PI / 2 - 0.15, 0, s * 0.5);
      corps.add(b);
      corps.add(mesh(sph(0.09), mat(0xffd166), 0.1 * s + s * 0.2, 1.0, 0.1 - 0.46));
    }
  } else if (id === 'xylophone') {
    for (const z of [-0.35, 0.35]) {
      const r = mesh(rbox(2.3, 0.12, 0.12, 0.04), principal, 0, 0.3, z);
      r.rotation.y = z * 0.0;
      corps.add(r);
    }
    for (const x of [-1.0, 1.0]) for (const z of [-0.35, 0.35]) corps.add(mesh(cyl(0.06, 0.06, 0.3, 10), sombre, x, 0.15, z));
    const couls = [0xe8483b, 0xff9f1c, 0xffd23f, 0x7bd389, 0x2ec4b6, 0x3a86ff, 0x9b5de5];
    for (let i = 0; i < 7; i++) {
      const prof = 1.0 - i * 0.09;
      corps.add(mesh(rbox(0.28, 0.1, prof, 0.04), mat(couls[i]), -0.96 + i * 0.32, 0.42, 0));
    }
    for (const s of [-1, 1]) {
      const b = mesh(cyl(0.025, 0.025, 0.7, 8), creme, s * 0.4, 0.6, 0.75);
      b.rotation.set(0.9, 0, s * 0.3);
      corps.add(b);
      corps.add(mesh(sph(0.08), principal, s * 0.4 + s * 0.1, 0.85, 0.5));
    }
  } else if (id === 'maracas') {
    for (const s of [-1, 1]) {
      const g = new THREE.Group();
      g.add(mesh(cyl(0.07, 0.1, 0.9, 12), creme, 0, 0.45, 0));
      const bal = mesh(sph(0.42), s > 0 ? principal : mat(0xff6b9d), 0, 1.15, 0);
      bal.scale.set(1, 1.2, 1);
      g.add(bal);
      g.add(mesh(tor(0.38, 0.04, 8, 24), creme, 0, 1.15, 0));
      g.position.x = s * 0.55;
      g.rotation.z = -s * 0.22;
      corps.add(g);
    }
  } else if (id === 'trompette') {
    corps.add(mesh(cyl(0.7, 0.8, 0.14, 28), sombre, 0, 0.07, 0));
    corps.add(mesh(cyl(0.06, 0.06, 0.7, 10), sombre, 0, 0.5, 0));
    const lat = new THREE.Group();
    lat.position.set(-0.25, 1.0, 0);
    const laiton = mat(couleur, { metalness: 0.45, roughness: 0.3 });
    const tube = mesh(cyl(0.07, 0.07, 1.7, 14), laiton, 0, 0, 0);
    tube.rotation.z = Math.PI / 2;
    lat.add(tube);
    const bell = mesh(cone(0.55, 0.9), laiton, 1.2, 0, 0);
    bell.rotation.z = -Math.PI / 2;
    bell.material.side = THREE.DoubleSide;
    lat.add(bell);
    lat.add(mesh(tor(0.34, 0.07, 10, 28), laiton, -0.45, -0.1, 0));
    for (const x of [-0.1, 0.2, 0.5]) {
      lat.add(mesh(cyl(0.06, 0.06, 0.4, 10), laiton, x, 0.25, 0));
      lat.add(mesh(sph(0.09), creme, x, 0.5, 0));
    }
    corps.add(lat);
  } else if (id === 'piano') {
    corps.add(mesh(rbox(2.1, 1.2, 0.8, 0.1), principal, 0, 0.6, -0.1));
    corps.add(mesh(rbox(2.2, 0.1, 0.9, 0.04), sombre, 0, 1.22, -0.1));
    corps.add(mesh(rbox(1.9, 0.1, 0.45, 0.03), creme, 0, 0.66, 0.45));
    for (let i = 0; i < 6; i++) corps.add(mesh(rbox(0.1, 0.07, 0.25, 0.02), sombre, -0.75 + i * 0.3 + (i > 2 ? 0.3 : 0), 0.74, 0.5));
    corps.add(mesh(rbox(1.4, 0.45, 0.06, 0.03), creme, 0, 0.98, 0.28));
    for (const x of [-0.95, 0.95]) corps.add(mesh(rbox(0.12, 0.62, 0.12, 0.03), sombre, x, 0.31, 0.5));
  } else if (id === 'triangle') {
    for (const x of [-0.9, 0.9]) corps.add(mesh(cyl(0.06, 0.08, 1.9, 12), sombre, x, 0.95, 0));
    const bar = mesh(cyl(0.05, 0.05, 1.9, 12), sombre, 0, 1.9, 0);
    bar.rotation.z = Math.PI / 2;
    corps.add(bar);
    corps.add(mesh(cyl(0.012, 0.012, 0.4, 6), creme, 0, 1.68, 0));
    const tri = mesh(tor(0.62, 0.05, 10, 3), mat(couleur, { metalness: 0.6, roughness: 0.25 }), 0, 1.0, 0);
    tri.rotation.z = Math.PI / 2;
    corps.add(tri);
    const b = mesh(cyl(0.04, 0.04, 0.9, 8), creme, 0.55, 0.55, 0.35);
    b.rotation.set(0.5, 0, -0.5);
    corps.add(b);
    for (const x of [-0.9, 0.9]) corps.add(mesh(cyl(0.3, 0.34, 0.1, 20), sombre, x, 0.05, 0));
  }

  // zone de toucher généreuse, invisible
  const boite = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 2.2, 12), new THREE.MeshBasicMaterial({ visible: false }));
  boite.position.y = 1.1;
  boite.userData.id = id;
  corps.add(boite);
  corps.traverse((o) => {
    o.userData.id = id;
  });

  const groupe = new THREE.Group();
  groupe.add(corps);
  groupe.userData.id = id;
  return { id, groupe, corps, mats, anim: null, echelle: 1 };
}

export function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);

  // lumières
  scene.add(new THREE.HemisphereLight(0xfff4e0, 0x7a6aa8, 1.1));
  const soleil = new THREE.DirectionalLight(0xffffff, 1.6);
  soleil.position.set(4, 9, 7);
  soleil.castShadow = true;
  soleil.shadow.mapSize.set(1024, 1024);
  const sc = soleil.shadow.camera;
  sc.left = -9; sc.right = 9; sc.top = 7; sc.bottom = -6; sc.near = 1; sc.far = 30;
  soleil.shadow.radius = 4;
  scene.add(soleil);

  // estrade et décor
  const decor = new THREE.Group();
  scene.add(decor);
  const estrade = new THREE.Mesh(
    new RoundedBoxGeometry(18, 0.5, 8, 4, 0.2),
    new THREE.MeshStandardMaterial({ color: 0xd9a066, roughness: 0.7 }),
  );
  estrade.position.set(0, -0.25, 0);
  estrade.receiveShadow = true;
  decor.add(estrade);
  const tapis = new THREE.Mesh(
    new RoundedBoxGeometry(14, 0.06, 5.4, 3, 0.03),
    new THREE.MeshStandardMaterial({ color: 0xc1443c, roughness: 0.9 }),
  );
  tapis.position.set(0, 0.02, 0.2);
  tapis.receiveShadow = true;
  decor.add(tapis);
  const rideauMat = new THREE.MeshStandardMaterial({ color: 0x9d2a4a, roughness: 0.85 });
  for (const s of [-1, 1]) {
    const r = new THREE.Mesh(new RoundedBoxGeometry(2.6, 9, 1, 3, 0.3), rideauMat);
    r.position.set(s * 8, 4.5, -3);
    decor.add(r);
    for (let k = -1; k <= 1; k++) {
      const pli = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 8.6, 10), rideauMat);
      pli.position.set(s * 8 + k * 0.8, 4.5, -2.4);
      decor.add(pli);
    }
  }
  const lambrequin = new THREE.Mesh(new RoundedBoxGeometry(20, 1.2, 1, 3, 0.35), new THREE.MeshStandardMaterial({ color: 0xf2b134, roughness: 0.6 }));
  lambrequin.position.set(0, 8.6, -3);
  decor.add(lambrequin);
  const fondMur = new THREE.Mesh(new THREE.PlaneGeometry(40, 20), new THREE.MeshStandardMaterial({ color: 0xffe1a8, roughness: 1 }));
  fondMur.position.set(0, 6, -4.5);
  fondMur.receiveShadow = true;
  decor.add(fondMur);

  // instruments
  const entrees = INSTRUMENTS.map((i) => fabrique(i.id, new THREE.Color(i.couleur)));
  const parId = Object.fromEntries(entrees.map((e) => [e.id, e]));
  const racine = new THREE.Group();
  scene.add(racine);
  let visibles = [];
  let options = {};
  let hauteurVue = 2.4;

  // balle du mode Rythme
  const balle = new THREE.Mesh(sph(0.3), new THREE.MeshStandardMaterial({ color: 0xff4d8d, emissive: 0xff4d8d, emissiveIntensity: 0.35, roughness: 0.35 }));
  balle.castShadow = true;
  balle.visible = false;
  scene.add(balle);

  function disposition(n, aspect) {
    const pos = [];
    const portrait = aspect < 0.9 && n > 3;
    const E = 2.7;
    if (portrait) {
      const rangees = Math.ceil(n / 2);
      for (let i = 0; i < n; i++) {
        const r = Math.floor(i / 2);
        const dansRangee = r === rangees - 1 && n % 2 === 1 ? 1 : 2;
        const c = i % 2;
        pos.push({ x: (c - (dansRangee - 1) / 2) * E, z: (r - (rangees - 1) / 2) * 2.6 });
      }
      return { pos, portrait };
    }
    for (let i = 0; i < n; i++) {
      const x = (i - (n - 1) / 2) * E;
      pos.push({ x, z: 0.05 * x * x - 0.2 });
    }
    return { pos, portrait };
  }

  function placer() {
    const aspect = camera.aspect;
    const d = options.solo ? { pos: [{ x: 0, z: 0 }], portrait: false } : disposition(visibles.length, aspect);
    visibles.forEach((e, i) => {
      e.groupe.position.set(0 + d.pos[i].x, 0, d.pos[i].z);
      e.groupe.rotation.y = d.portrait ? 0 : -d.pos[i].x * 0.05;
      e.echelle = options.solo ? 1.4 : 1;
      e.groupe.scale.setScalar(e.echelle);
    });
    return d;
  }

  // Cadre la caméra : distance minimale pour que tous les points de la scène tiennent à l'écran, puis centrage vertical.
  function cadrer() {
    const { pos, portrait } = placer();
    const k = options.solo ? 1.4 : 1;
    const haut = options.balle ? 5.2 : 2.5 * k;
    const pts = [];
    for (const p of pos) {
      for (const dx of [-1.2 * k, 1.2 * k]) for (const dz of [-1.1 * k, 1.1 * k]) for (const y of [0, haut]) pts.push(new THREE.Vector3(p.x + dx, y, p.z + dz));
    }
    if (!pts.length) return;
    const tilt = THREE.MathUtils.degToRad(portrait ? 42 : 22);
    const dir = new THREE.Vector3(0, Math.sin(tilt), Math.cos(tilt));
    const centre = new THREE.Vector3();
    pts.forEach((v) => centre.add(v));
    centre.multiplyScalar(1 / pts.length);
    const MARGE = 0.9;
    const tient = (d, cible) => {
      camera.position.copy(cible).addScaledVector(dir, d);
      camera.lookAt(cible);
      camera.updateMatrixWorld(true);
      camera.updateProjectionMatrix();
      let mx = 0, my = 0;
      for (const v of pts) {
        const q = v.clone().project(camera);
        mx = Math.max(mx, Math.abs(q.x));
        my = Math.max(my, Math.abs(q.y));
      }
      return Math.max(mx, my) <= MARGE;
    };
    let cible = centre.clone();
    let lo = 2, hi = 90;
    for (let it = 0; it < 24; it++) {
      const mid = (lo + hi) / 2;
      if (tient(mid, cible)) hi = mid;
      else lo = mid;
    }
    // recentrage vertical sur l'écran
    tient(hi, cible);
    let miny = 1, maxy = -1;
    for (const v of pts) {
      const q = v.clone().project(camera);
      miny = Math.min(miny, q.y);
      maxy = Math.max(maxy, q.y);
    }
    const decal = (maxy + miny) / 2;
    const haut2 = hi * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
    cible = cible.addScaledVector(up, decal * haut2);
    lo = 2; hi = 90;
    for (let it = 0; it < 24; it++) {
      const mid = (lo + hi) / 2;
      if (tient(mid, cible)) hi = mid;
      else lo = mid;
    }
    tient(hi, cible);
  }

  function resize() {
    const w = Math.max(1, canvas.clientWidth || window.innerWidth);
    const h = Math.max(1, canvas.clientHeight || window.innerHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    cadrer();
  }

  /** Affiche seulement les instruments `ids`. opts.solo : tambour seul, agrandi ; opts.balle : hauteur de vue étendue. */
  function afficher(ids, opts = {}) {
    options = opts;
    for (const e of visibles) racine.remove(e.groupe);
    visibles = ids.map((id) => parId[id]).filter(Boolean);
    for (const e of visibles) {
      e.anim = null;
      racine.add(e.groupe);
    }
    hauteurVue = opts.balle ? 5.2 : 2.6;
    balle.visible = false;
    cadrer();
    appliquer(0);
  }

  function rebondir(id) {
    const e = parId[id];
    if (e) e.anim = { type: 'rebond', t0: performance.now() };
  }
  function clignoter(id) {
    const e = parId[id];
    if (e) e.anim = { type: 'clignote', t0: performance.now() };
  }

  function appliquer(now) {
    for (const e of entrees) {
      let sx = 1, sy = 1, y = 0, lueur = 0;
      const a = e.anim;
      if (a) {
        if (a.type === 'rebond') {
          const u = (now - a.t0) / 450;
          if (u >= 1) e.anim = null;
          else {
            const amp = (1 - u) * (1 - u) * Math.cos(u * Math.PI * 3);
            sy = 1 - 0.28 * amp * (u < 0.15 ? 1 : 0.8);
            sx = 1 + 0.18 * amp;
            y = 0.35 * Math.sin(clamp01(u * 1.6) * Math.PI) * (1 - u);
            lueur = 0.55 * (1 - u);
          }
        } else {
          const u = (now - a.t0) / 1100;
          if (u >= 1) e.anim = null;
          else {
            lueur = 0.55 * (0.5 + 0.5 * Math.sin(u * Math.PI * 6 - Math.PI / 2)) * (1 - u * 0.4);
            const p = 0.5 + 0.5 * Math.sin(u * Math.PI * 6 - Math.PI / 2);
            sy = 1 + 0.08 * p;
            sx = 1 - 0.04 * p;
          }
        }
      }
      e.corps.scale.set(sx, sy, sx);
      e.corps.position.y = y;
      for (const m of e.mats) {
        m.emissive.setRGB(1, 1, 1);
        m.emissiveIntensity = lueur;
      }
    }
  }

  /** Position de la balle : p dans [0,1) = fraction du battement écoulée depuis le dernier temps. null = cachée. */
  function posBalle(p) {
    if (p == null || !visibles.length) {
      balle.visible = false;
      return;
    }
    balle.visible = true;
    const dessus = 0.93 * 1.4 + 0.3;
    const h = 2.6 * 4 * p * (1 - p);
    const ecrase = p < 0.07 ? 1 - p / 0.07 : p > 0.93 ? (p - 0.93) / 0.07 : 0;
    balle.position.set(0, dessus + h - 0.1 * ecrase, 0.2);
    balle.scale.set(1 + 0.25 * ecrase, 1 - 0.3 * ecrase, 1 + 0.25 * ecrase);
  }

  // picking
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let cbPick = null;
  canvas.addEventListener('pointerdown', (ev) => {
    if (!cbPick) return;
    const r = canvas.getBoundingClientRect();
    ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(visibles.map((e) => e.groupe), true);
    const hit = hits.find((h) => h.object.userData.id);
    cbPick(hit ? hit.object.userData.id : null, ev);
  });

  function update(now) {
    appliquer(now);
  }
  function render() {
    renderer.render(scene, camera);
  }

  window.addEventListener('resize', resize);
  resize();

  return {
    afficher,
    rebondir,
    clignoter,
    balle: posBalle,
    onPick(cb) {
      cbPick = cb;
    },
    update,
    render,
    resize,
    ids: () => visibles.map((e) => e.id),
  };
}
