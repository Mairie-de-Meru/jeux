import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { SHAPES, ARCH_PARTS, triangleProfile } from '../logic/levels.js';
import { IMAGES } from '../assets.js';

export const COLORS = {
  large: 0xff5d5d, cube: 0x3d9cff, plank: 0xffd02b, cylinder: 0x2fcf5f, triangle: 0xff8a1f, arch: 0xc84dff,
};

let woodMap = null;
if (IMAGES.wood) woodMap = new THREE.TextureLoader().load(IMAGES.wood);

const geos = new Map();
const mats = new Map();

function rbox(w, h, d) {
  const key = `rb${w}x${h}x${d}`;
  if (!geos.has(key)) geos.set(key, new RoundedBoxGeometry(w, h, d, 3, Math.min(0.12, w / 3, h / 3, d / 3)));
  return geos.get(key);
}
function material(name) {
  if (!mats.has(name)) {
    mats.set(name, new THREE.MeshStandardMaterial({ color: COLORS[name], roughness: 0.55, metalness: 0.0, map: woodMap }));
  }
  return mats.get(name);
}
function triangleGeometry() {
  if (!geos.has('tri')) {
    const { d } = SHAPES.triangle;
    const shape = new THREE.Shape();
    triangleProfile().forEach(([x, y], i) => (i ? shape.lineTo(x, y) : shape.moveTo(x, y)));
    shape.closePath();
    const g = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false });
    g.translate(0, 0, -d / 2);
    geos.set('tri', g);
  }
  return geos.get('tri');
}
function cylinderGeometry() {
  if (!geos.has('cyl')) {
    const { r, h } = SHAPES.cylinder;
    geos.set('cyl', new THREE.CylinderGeometry(r, r, h, 28));
  }
  return geos.get('cyl');
}

export function createBlockMesh(name) {
  const s = SHAPES[name];
  const mat = material(name);
  let obj;
  if (name === 'cylinder') obj = new THREE.Mesh(cylinderGeometry(), mat);
  else if (name === 'triangle') obj = new THREE.Mesh(triangleGeometry(), mat);
  else if (name === 'arch') {
    obj = new THREE.Group();
    for (const p of ARCH_PARTS) {
      const m = new THREE.Mesh(rbox(p.w, p.h, p.d), mat);
      m.position.set(p.x, p.y, 0);
      obj.add(m);
    }
  } else obj = new THREE.Mesh(rbox(s.w, s.h, s.d), mat);
  obj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  obj.userData.shape = name;
  return obj;
}
