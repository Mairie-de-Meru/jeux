import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { makeCarMesh } from './cars.js';

// ---- Plan du quartier (coordonnées monde ; route le long de x, z in [-4, 4]) ----
export const X1 = 0;   // passage avec feu
export const X2 = 29;  // passage sans feu
export const LANE_E = 0.9;   // voies : est (+x) en z=+0.9, ouest (-x) en z=-0.9
export const LANE_W = -0.9;

export const PLAN = [
  { start: [-14, 6], goal: [10, -6.6], etapes: [
    { side: 1, wait: [X1, 4.8], across: [X1, -4.8], crossX: X1, width: 20 },
  ] },
  { start: [9, 6], goal: [38, -6.6], etapes: [
    { side: 1, wait: [23, 6], across: [X2, -4.8], crossX: X2, width: 22,
      spots: { entreVoitures: [17.5, 4.8], passage: [X2, 4.8] } },
  ] },
  { start: [-14, 6], goal: [38, 7.2], etapes: [
    { side: 1, wait: [X1, 4.8], across: [X1, -4.8], crossX: X1, width: 20 },
    { side: 1, wait: [3.6, -6], across: [10.2, -6], crossX: 6.9, width: 16, garage: true },
    { side: -1, wait: [23, -6], across: [X2, 4.8], crossX: X2, width: 22,
      spots: { entreVoitures: [17.5, -4.8], horsPassage: [24.5, -4.8], passage: [X2, -4.8] } },
  ] },
];

const matCache = new Map();
const mat = (color, opts = {}) => {
  const k = color + JSON.stringify(opts);
  if (!matCache.has(k)) matCache.set(k, new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0, ...opts }));
  return matCache.get(k);
};

function rbox(parent, w, h, d, color, x, y, z, r = 0.12) {
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001)), mat(color));
  m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true;
  parent.add(m);
  return m;
}
function plain(parent, w, h, d, color, x, y, z, shadow = false) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
  m.position.set(x, y, z);
  m.receiveShadow = true; m.castShadow = shadow;
  parent.add(m);
  return m;
}

const treeGeo = { trunk: new THREE.CylinderGeometry(0.18, 0.25, 1.2, 8), crown: new THREE.IcosahedronGeometry(1, 1) };
function tree(parent, x, z, s = 1, color = 0x3fae4a) {
  const g = new THREE.Group();
  const t = new THREE.Mesh(treeGeo.trunk, mat(0x8a5a35)); t.position.y = 0.6; t.castShadow = true;
  const c = new THREE.Mesh(treeGeo.crown, mat(color)); c.position.y = 2.1; c.scale.set(1.2, 1.1, 1.2); c.castShadow = true;
  g.add(t, c); g.position.set(x, 0, z); g.scale.setScalar(s);
  parent.add(g);
}

function signTexture(label, emoji, bg, img) {
  if (img) { const t = new THREE.Texture(img); t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true; return t; }
  const c = document.createElement('canvas'); c.width = 512; c.height = 192;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.beginPath(); g.roundRect(4, 4, 504, 184, 40); g.fill();
  g.strokeStyle = '#fff'; g.lineWidth = 10; g.stroke();
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = 'bold 84px system-ui, sans-serif'; g.fillText(`${emoji} ${label}`, 256, 100, 480);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function sign(parent, tex, x, y, z, yaw, w = 5, h = 1.9) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide }));
  m.position.set(x, y, z); m.rotation.y = yaw;
  parent.add(m);
  for (const dx of [-w / 2 + 0.4, w / 2 - 0.4]) plain(parent, 0.14, 1.4, 0.14, 0x6b717b, x + dx, y - h / 2 - 0.5, z);
}

function manTexture(color, barre) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#16181c'; g.fillRect(0, 0, 128, 128);
  g.fillStyle = color; g.strokeStyle = color; g.lineCap = 'round'; g.lineWidth = 11;
  g.beginPath(); g.arc(64, 30, 14, 0, 7); g.fill();
  g.beginPath(); g.moveTo(64, 48); g.lineTo(64, 84); g.stroke();
  g.beginPath(); g.moveTo(64, 56); g.lineTo(42, 76); g.moveTo(64, 56); g.lineTo(86, 76); g.stroke();
  g.beginPath(); g.moveTo(64, 84); g.lineTo(46, 118); g.moveTo(64, 84); g.lineTo(82, 118); g.stroke();
  if (barre) { g.lineWidth = 6; g.beginPath(); g.moveTo(40, 76); g.lineTo(88, 76); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function buildCity(scene, assets) {
  const root = new THREE.Group();
  scene.add(root);

  // sol, route, trottoirs
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(260, 160), mat(0x86d27a));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.03; ground.receiveShadow = true;
  root.add(ground);
  plain(root, 220, 0.06, 8, 0x6b717b, 20, 0.0, 0);
  for (const s of [1, -1]) {
    plain(root, 220, 0.2, 4, 0xe3dccb, 20, 0.08, s * 6);
    plain(root, 220, 0.24, 0.25, 0xc9c1ad, 20, 0.1, s * 3.95);
  }
  for (let x = -60; x < 100; x += 3) plain(root, 1.4, 0.02, 0.14, 0xffffff, x, 0.04, 0);

  const zebra = (x) => {
    for (const dx of [-1.2, -0.4, 0.4, 1.2]) plain(root, 0.5, 0.02, 7.6, 0xffffff, x + dx, 0.05, 0);
  };
  zebra(X1); zebra(X2);

  // décor fixe : maisons aux extrémités, arbres
  const houseColors = [0xffb4a2, 0xa2d2ff, 0xffe29a, 0xcdb4db, 0xb5e48c];
  [-34, -27, -20, -13, 49, 56].forEach((x, i) => {
    for (const s of [-1, 1]) {
      const c = houseColors[(i + (s > 0 ? 2 : 0)) % houseColors.length];
      rbox(root, 5, 3.6 + (i % 2), 4.6, c, x, 1.9, s * 11.5);
      plain(root, 5.3, 0.5, 4.9, 0xd9534f, x, 4.0 + (i % 2), s * 11.5, true);
    }
  });
  [16, 22, 27, 33, 44].forEach((x, i) => tree(root, x, -11 - (i % 2) * 1.5, 0.9 + (i % 3) * 0.15));
  [4, 12, 20, 26, 46].forEach((x, i) => tree(root, x, 11 + (i % 2) * 1.5, 0.9 + (i % 3) * 0.15, 0x58c25a));

  // feux
  const feu = new THREE.Group(); root.add(feu);
  const lamps = { voiture: [], pieton: [] };
  const lampCols = { rouge: 0xff3b30, orange: 0xffb020, vert: 0x35e060 };
  const lampGeo = new THREE.SphereGeometry(0.2, 12, 10);
  const redTex = manTexture('#ff3b30', true);
  const greenTex = manTexture('#35e060', false);
  function pole(x, z, h, withCar) {
    plain(feu, 0.14, h, 0.14, 0x4d5560, x, h / 2, z, true);
    if (withCar) {
      const g = new THREE.Group();
      rbox(g, 0.5, 1.25, 0.32, 0x1c1f24, 0, 0, 0, 0.1);
      ['rouge', 'orange', 'vert'].forEach((k, i) => {
        const m = new THREE.Mesh(lampGeo, new THREE.MeshBasicMaterial({ color: lampCols[k] }));
        m.position.set(0, 0.4 - i * 0.4, 0); m.userData.k = k;
        g.add(m); lamps.voiture.push(m);
      });
      g.position.set(x, h + 0.2, z); g.rotation.y = 0.5 * Math.sign(z || 1);
      feu.add(g);
    }
    // bonhomme piéton : deux faces (recto/verso)
    const g = new THREE.Group();
    rbox(g, 0.62, 1.3, 0.1, 0x1c1f24, 0, 0, 0, 0.05);
    const red = new THREE.MeshBasicMaterial({ map: redTex });
    const green = new THREE.MeshBasicMaterial({ map: greenTex });
    for (const [yaw, dz] of [[0, 0.06], [Math.PI, -0.06]]) {
      const pr = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.46), red);
      const pg = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.46), green);
      pr.position.set(0, 0.32, dz); pg.position.set(0, -0.32, dz);
      pr.rotation.y = pg.rotation.y = yaw;
      g.add(pr, pg);
    }
    lamps.pieton.push({ red, green });
    g.position.set(x, 1.75, z + (z > 0 ? -0.2 : 0.2));
    feu.add(g);
  }
  const px = 2.3;
  pole(X1 + px, 4.5, 3.1, true);   // sud-est : feu voiture + bonhomme
  pole(X1 - px, 4.5, 2.4, false);  // sud-ouest : bonhomme
  pole(X1 - px, -4.5, 3.1, true);  // nord-ouest
  pole(X1 + px, -4.5, 2.4, false); // nord-est
  const setLights = (voiture, pieton) => {
    for (const l of lamps.voiture) l.material.color.setHex(lampCols[l.userData.k]).multiplyScalar(l.userData.k === voiture ? 1 : 0.14);
    for (const l of lamps.pieton) { l.red.color.setScalar(pieton === 'rouge' ? 1 : 0.15); l.green.color.setScalar(pieton === 'vert' ? 1 : 0.15); }
  };
  setLights('vert', 'rouge');

  // ---- éléments par palier ----
  const lvl = [new THREE.Group(), new THREE.Group(), new THREE.Group()];
  lvl.forEach((g) => root.add(g));

  // L0 : école (nord, x=10)
  {
    const g = lvl[0];
    rbox(g, 9, 4.6, 5, 0xffc861, 10, 2.3, -11.5);
    plain(g, 9.5, 0.5, 5.4, 0xe85d5d, 10, 4.85, -11.5, true);
    rbox(g, 1.8, 2.5, 0.3, 0x3d9bff, 10, 1.25, -8.9);
    for (const dx of [-3, -1.5, 1.5, 3]) rbox(g, 1, 1.1, 0.2, 0xbfe6ff, 10 + dx, 2.6, -8.92, 0.05);
    plain(g, 0.1, 2.6, 0.1, 0xdddddd, 14.2, 6.0, -9.2);
    plain(g, 0.9, 0.55, 0.05, 0xff5a5f, 14.65, 7.0, -9.2);
    sign(g, signTexture('École', '🏫', '#e8432e', assets?.images['enseigne-ecole.png']), 10, 7.4, -10.5, 0);
  }
  // L1 : parc (nord, x=38) + voitures garées au sud
  {
    const g = lvl[1];
    const patch = new THREE.Mesh(new THREE.PlaneGeometry(11, 7), mat(0x5fd068));
    patch.rotation.x = -Math.PI / 2; patch.position.set(38, 0.01, -11.5); patch.receiveShadow = true; g.add(patch);
    [[34, -12], [36.5, -13.5], [40, -12.5], [42, -10.5], [33.5, -10]].forEach(([x, z], i) => tree(g, x, z, 1.1 + (i % 2) * 0.2));
    rbox(g, 2, 0.12, 0.7, 0x8a5a35, 38, 0.55, -9.7); rbox(g, 2, 0.6, 0.12, 0x8a5a35, 38, 0.9, -9.95);
    for (const dx of [-0.8, 0.8]) plain(g, 0.1, 0.5, 0.1, 0x4d5560, 38 + dx, 0.3, -9.7);
    plain(g, 11, 0.6, 0.1, 0xffffff, 38, 0.3, -8.4);
    sign(g, signTexture('Parc', '🌳', '#2e9e4f', assets?.images['enseigne-parc.png']), 38, 5.6, -10.5, 0);
    [[13.5, 0xff5a5f], [21.5, 0x3db2ff]].forEach(([x, c]) => { const m = makeCarMesh(c); m.position.set(x, 0, 3.15); g.add(m); });
  }
  // L2 : garage (nord, x=7), boulangerie (sud, x=38), voitures garées au nord
  const garage = { door: null, car: null, doorY: 1.35 };
  {
    const g = lvl[2];
    rbox(g, 3, 4, 5.4, 0xb0b8c4, 4, 2, -11.3); rbox(g, 3, 4, 5.4, 0xb0b8c4, 10, 2, -11.3);
    rbox(g, 3, 1.3, 5.4, 0xb0b8c4, 7, 3.35, -11.3);
    plain(g, 9.4, 0.5, 5.8, 0x6a5acd, 7, 4.25, -11.3, true);
    plain(g, 3, 0.1, 5, 0x5b6068, 7, 0.1, -11.5);
    plain(g, 3.2, 2.7, 0.1, 0x20242b, 7, 1.35, -13.9);
    garage.door = rbox(g, 3, 2.7, 0.18, 0xf2a65a, 7, garage.doorY, -8.7, 0.05);
    const car = makeCarMesh(0xffc93c); car.position.set(7, 0.1, -11); car.rotation.y = Math.PI / 2; g.add(car);
    garage.car = car;
    sign(g, signTexture('Garage', '🚗', '#6a5acd', null), 7, 6.6, -10.5, 0, 3.6, 1.35);
    [[13.5, 0xff9a3c], [21.5, 0xb06cff]].forEach(([x, c]) => { const m = makeCarMesh(c); m.position.set(x, 0, -3.15); g.add(m); });
    // boulangerie (sud, x=38), façade vers la route (-z)
    rbox(g, 8, 4, 5, 0xff9ab0, 38, 2, 11.6);
    plain(g, 8.4, 0.5, 5.4, 0xd96a86, 38, 4.2, 11.6, true);
    rbox(g, 1.8, 2.5, 0.3, 0xa0522d, 38, 1.25, 9.05);
    for (const dx of [-2.6, 2.6]) rbox(g, 1.5, 1.4, 0.2, 0xfff1c9, 38 + dx, 1.9, 9.07, 0.05);
    for (let i = 0; i < 8; i++) rbox(g, 1, 0.12, 1.2, i % 2 ? 0xffffff : 0xe8432e, 34.5 + i, 3.1, 8.5, 0.04);
    sign(g, signTexture('Boulangerie', '🥖', '#d96a1e', assets?.images['enseigne-boulangerie.png']), 38, 7.4, 10.5, Math.PI, 5.6, 2.0);
  }

  // zones lumineuses à toucher
  const spotsGroup = new THREE.Group(); root.add(spotsGroup);
  const spots = { hits: [], items: [] };
  const ringGeo = new THREE.RingGeometry(0.75, 1.1, 32);
  const discGeo = new THREE.CircleGeometry(0.78, 32);
  const hitGeo = new THREE.CircleGeometry(1.7, 16);
  const hitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
  const setSpots = (list) => {
    spotsGroup.clear(); spots.hits.length = 0; spots.items.length = 0;
    for (const s of list) {
      const g = new THREE.Group(); g.position.set(s.x, 0.3, s.z);
      const disc = new THREE.Mesh(discGeo, new THREE.MeshBasicMaterial({ color: 0xffe14d, transparent: true, opacity: 0.6, side: THREE.DoubleSide }));
      const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }));
      const hit = new THREE.Mesh(hitGeo, hitMat);
      for (const m of [disc, ring, hit]) m.rotation.x = -Math.PI / 2;
      hit.userData.id = s.id;
      g.add(disc, ring, hit);
      spotsGroup.add(g);
      spots.hits.push(hit); spots.items.push({ id: s.id, g, disc });
    }
  };
  const updateSpots = (t, hintId) => {
    for (const it of spots.items) {
      const k = 1 + 0.08 * Math.sin(t * 4) + (hintId === it.id ? 0.18 * Math.sin(t * 8) : 0);
      it.g.scale.set(k, 1, k);
      it.disc.material.opacity = hintId === it.id ? 0.85 : 0.55;
    }
  };

  const setLevel = (n) => {
    lvl.forEach((g, i) => { g.visible = i === n; });
    feu.visible = n !== 1;
    setSpots([]);
  };
  setLevel(0);

  return { root, setLevel, setLights, garage, setSpots, updateSpots, spots };
}
