import * as THREE from 'three';
import { sliceAngles } from './logic/fractions.js';

const THETA0 = Math.PI / 2;
const TWO_PI = Math.PI * 2;
const Y_AXIS = new THREE.Vector3(0, 1, 0);

const LAYERS = {
  pizza: [
    { name: 'dough', color: 0xe9a13f, inset: 0, h: 0.24, y: 0 },
    { name: 'sauce', color: 0xd8412f, inset: 0.15, h: 0.05, y: 0.22 },
    { name: 'cheese', color: 0xffd966, inset: 0.25, h: 0.05, y: 0.26 },
  ],
  cake: [
    { name: 'sponge', color: 0xf2c777, inset: 0, h: 0.3, y: 0 },
    { name: 'cream', color: 0xfff0f5, inset: 0, h: 0.08, y: 0.3 },
    { name: 'sponge2', color: 0xf2c777, inset: 0, h: 0.3, y: 0.38 },
    { name: 'frosting', color: 0xff8fb8, inset: 0, h: 0.14, y: 0.68 },
  ],
};

export const TOPPINGS = {
  pizza: [
    { id: 'pepperoni', label: 'Pepperoni', color: '#d7263d' },
    { id: 'olive', label: 'Olive', color: '#2b2b2b' },
    { id: 'mushroom', label: 'Champignon', color: '#e8d5b5' },
    { id: 'pepper', label: 'Poivron', color: '#3fae49' },
  ],
  cake: [
    { id: 'strawberry', label: 'Fraise', color: '#ff3b5c' },
    { id: 'blueberry', label: 'Myrtille', color: '#4a4bd1' },
    { id: 'candy', label: 'Bonbon', color: '#ffb400' },
    { id: 'cherry', label: 'Cerise', color: '#b3002d' },
  ],
};

const geoCache = new Map();
const matCache = new Map();

function material(color, hl) {
  const key = `${color}|${hl}`;
  let m = matCache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness: 0.6 });
    if (hl) { m.emissive = new THREE.Color(0xffc21a); m.emissiveIntensity = 0.55; }
    matCache.set(key, m);
  }
  return m;
}

function sectorGeometry(radius, len, h) {
  const key = `${radius.toFixed(3)}|${len.toFixed(4)}|${h}`;
  let g = geoCache.get(key);
  if (g) return g;
  const shape = new THREE.Shape();
  if (len >= TWO_PI - 1e-6) shape.absarc(0, 0, radius, 0, TWO_PI, false);
  else {
    // lineTo explicite : absarc n'ajoute pas le rayon après un simple moveTo
    shape.moveTo(0, 0);
    shape.lineTo(radius, 0);
    shape.absarc(0, 0, radius, 0, len, false);
    shape.lineTo(0, 0);
  }
  const bt = Math.min(0.025, h * 0.35);
  g = new THREE.ExtrudeGeometry(shape, {
    depth: h - 2 * bt,
    bevelEnabled: true,
    bevelThickness: bt,
    bevelSize: bt,
    bevelOffset: -bt,
    bevelSegments: 2,
    curveSegments: Math.max(8, Math.round((40 * len) / TWO_PI) + 4),
  });
  g.translate(0, 0, bt);
  geoCache.set(key, g);
  return g;
}

// Garnitures : géométries/matériaux partagés
const tg = {};
function toppingMesh(type) {
  if (!tg.ready) {
    tg.pepperoni = [new THREE.CylinderGeometry(0.17, 0.17, 0.05, 16), new THREE.MeshStandardMaterial({ color: 0xd7263d, roughness: 0.5 })];
    tg.olive = [new THREE.TorusGeometry(0.09, 0.04, 8, 14), new THREE.MeshStandardMaterial({ color: 0x2b2b2b, roughness: 0.4 })];
    tg.mushroom = [new THREE.SphereGeometry(0.14, 12, 8), new THREE.MeshStandardMaterial({ color: 0xe8d5b5, roughness: 0.6 })];
    tg.pepper = [new THREE.TorusGeometry(0.12, 0.04, 6, 10, Math.PI), new THREE.MeshStandardMaterial({ color: 0x3fae49, roughness: 0.5 })];
    tg.strawberry = [new THREE.SphereGeometry(0.16, 12, 10), new THREE.MeshStandardMaterial({ color: 0xff3b5c, roughness: 0.4 })];
    tg.blueberry = [new THREE.SphereGeometry(0.1, 10, 8), new THREE.MeshStandardMaterial({ color: 0x4a4bd1, roughness: 0.4 })];
    tg.candy = [new THREE.BoxGeometry(0.2, 0.12, 0.12), new THREE.MeshStandardMaterial({ color: 0xffb400, roughness: 0.3 })];
    tg.cherry = [new THREE.SphereGeometry(0.13, 12, 10), new THREE.MeshStandardMaterial({ color: 0xb3002d, roughness: 0.25 })];
    tg.ready = true;
  }
  const [geo, mat] = tg[type];
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  if (type === 'olive') m.rotation.x = Math.PI / 2;
  if (type === 'mushroom') m.scale.set(1, 0.55, 1);
  if (type === 'pepper') m.rotation.set(0, Math.random() * 6, 0);
  if (type === 'strawberry') m.scale.set(1, 1.2, 1);
  if (type === 'candy') m.rotation.y = Math.random() * 3;
  m.userData.baseScale = m.scale.clone();
  return m;
}

export const dirOf = (mid) => new THREE.Vector3(Math.cos(mid), 0, -Math.sin(mid));

export function createFood(kind, radius = 1.45) {
  const group = new THREE.Group();
  const food = { kind, radius, group, parts: 1, slices: [], offset: 0 };

  function buildSlice(i, a) {
    const sg = new THREE.Group();
    sg.rotation.y = a.start;
    sg.userData = { index: i, start: a.start, len: a.length, mid: a.start + a.length / 2, inPlate: false, toppings: [], meshes: [], food };
    for (const L of LAYERS[kind]) {
      const mesh = new THREE.Mesh(sectorGeometry(radius - L.inset, a.length, L.h), material(L.color, false));
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.y = L.y;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = { slice: sg, mat: mesh.material, matHL: material(L.color, true) };
      sg.add(mesh);
      sg.userData.meshes.push(mesh);
    }
    return sg;
  }

  food.homePos = (sg) => dirOf(sg.userData.mid).multiplyScalar(food.offset);

  food.setParts = (n, offset = 0) => {
    // récupérer les garnitures (position dans le repère de la nourriture)
    const carried = [];
    for (const old of food.slices) {
      for (const t of old.userData.toppings) {
        carried.push({ type: t.type, mesh: t.mesh, p: t.mesh.position.clone().applyAxisAngle(Y_AXIS, old.userData.start) });
      }
      old.parent?.remove(old);
    }
    food.parts = n;
    food.offset = offset;
    food.slices = sliceAngles(n, THETA0).map((a, i) => buildSlice(i, a));
    for (const sg of food.slices) {
      sg.position.copy(food.homePos(sg));
      group.add(sg);
    }
    for (const c of carried) {
      const ang = Math.atan2(-c.p.z, c.p.x);
      const rel = (((ang - THETA0) % TWO_PI) + TWO_PI) % TWO_PI;
      const idx = Math.min(n - 1, Math.floor(rel / (TWO_PI / n)));
      const sg = food.slices[idx];
      c.mesh.position.copy(c.p.applyAxisAngle(Y_AXIS, -sg.userData.start));
      sg.add(c.mesh);
      sg.userData.toppings.push({ type: c.type, mesh: c.mesh });
    }
  };

  food.applyOffset = (o) => {
    food.offset = o;
    for (const sg of food.slices) if (!sg.userData.inPlate) sg.position.copy(food.homePos(sg));
  };

  // Lignes de coupe pointillées (n rayons) ; setGuides(null) les retire.
  let guides = null;
  food.setGuides = (n) => {
    if (guides) {
      guides.parent?.remove(guides);
      guides.children.forEach((l) => l.geometry.dispose());
      guides = null;
    }
    if (!n || n < 2) return;
    const y = kind === 'pizza' ? 0.33 : 0.84;
    guides = new THREE.Group();
    const mat = new THREE.LineDashedMaterial({ color: 0xffffff, dashSize: 0.14, gapSize: 0.1 });
    for (const a of sliceAngles(n, THETA0)) {
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, y, 0),
        new THREE.Vector3(Math.cos(a.start) * radius, y, -Math.sin(a.start) * radius),
      ]);
      const line = new THREE.Line(geo, mat);
      line.computeLineDistances();
      guides.add(line);
    }
    group.add(guides);
  };

  food.meshes = () => food.slices.flatMap((s) => s.userData.meshes);

  food.addTopping = (sg, type, localPoint) => {
    const m = toppingMesh(type);
    m.position.copy(localPoint);
    m.position.y += 0.03;
    sg.add(m);
    sg.userData.toppings.push({ type, mesh: m });
    return m;
  };

  food.setHighlight = (sg, on) => {
    for (const m of sg.userData.meshes) m.material = on ? m.userData.matHL : m.userData.mat;
  };

  food.setParts(1);
  return food;
}

// Portion servie (n parts sur d) posée à plat, sans écartement : pour l'assiette du niveau « Comparer ».
export function createServing(kind, n, d, radius) {
  const food = createFood(kind, radius);
  food.setParts(d, 0);
  food.slices.slice(n).forEach((s) => s.parent?.remove(s));
  food.slices = food.slices.slice(0, n);
  return food;
}
