import * as THREE from 'three';

const sphereGeo = new THREE.SphereGeometry(1, 20, 14);
const coneGeo = new THREE.ConeGeometry(1, 1, 4);
const capsuleGeo = new THREE.CapsuleGeometry(0.5, 1, 6, 12);
const cylGeo = new THREE.CylinderGeometry(1, 1, 1, 16);
const mats = new Map();
const mat = (c) => {
  if (!mats.has(c)) mats.set(c, new THREE.MeshStandardMaterial({ color: c, roughness: 0.55 }));
  return mats.get(c);
};

function part(group, geo, color, pos, scale, rot) {
  const m = new THREE.Mesh(geo, mat(color));
  m.position.set(...pos);
  m.scale.set(...(Array.isArray(scale) ? scale : [scale, scale, scale]));
  if (rot) m.rotation.set(...rot);
  m.castShadow = true;
  group.add(m);
  return m;
}

const DEFS = {
  bear: { body: 0x9b6a43, light: 0xe0bb8d },
  cat: { body: 0xffa13c, light: 0xfff0d6 },
  rabbit: { body: 0xf6f2ee, light: 0xffc4d6 },
  pig: { body: 0xff9bb5, light: 0xff7a9c },
  fox: { body: 0xf2672b, light: 0xfff4e8 },
};

export function createAnimal(type = 'bear') {
  const d = DEFS[type] || DEFS.bear;
  const g = new THREE.Group();
  const inner = new THREE.Group();
  g.add(inner);
  const head = new THREE.Group();
  head.position.y = 2.0;
  inner.add(head);

  // corps
  part(inner, sphereGeo, d.body, [0, 0.95, 0], [0.9, 1.0, 0.8]);
  part(inner, sphereGeo, d.light, [0, 0.85, 0.45], [0.55, 0.65, 0.35]);
  // bras
  part(inner, sphereGeo, d.body, [-0.85, 1.0, 0.25], [0.28, 0.45, 0.28]);
  part(inner, sphereGeo, d.body, [0.85, 1.0, 0.25], [0.28, 0.45, 0.28]);
  // tête
  part(head, sphereGeo, d.body, [0, 0, 0], [0.75, 0.68, 0.68]);
  // yeux
  for (const s of [-1, 1]) {
    part(head, sphereGeo, 0x1d1d1d, [0.27 * s, 0.1, 0.58], 0.09);
    part(head, sphereGeo, 0xffffff, [0.29 * s, 0.14, 0.65], 0.035);
    part(head, sphereGeo, 0xff9aa8, [0.46 * s, -0.12, 0.5], [0.12, 0.08, 0.05]);
  }
  // museau + nez
  if (type !== 'pig') {
    part(head, sphereGeo, d.light, [0, -0.15, 0.55], [0.28, 0.2, 0.22]);
    part(head, sphereGeo, 0x2b1b12, [0, -0.07, 0.76], [0.09, 0.07, 0.07]);
  } else {
    part(head, cylGeo, d.light, [0, -0.1, 0.68], [0.22, 0.09, 0.22], [Math.PI / 2, 0, 0]);
    part(head, sphereGeo, 0x8a3a52, [-0.07, -0.1, 0.78], 0.035);
    part(head, sphereGeo, 0x8a3a52, [0.07, -0.1, 0.78], 0.035);
  }
  // oreilles
  for (const s of [-1, 1]) {
    if (type === 'bear') {
      part(head, sphereGeo, d.body, [0.5 * s, 0.55, 0], 0.24);
      part(head, sphereGeo, d.light, [0.5 * s, 0.55, 0.1], 0.14);
    } else if (type === 'rabbit') {
      part(head, capsuleGeo, d.body, [0.25 * s, 1.0, 0], [0.22, 0.55, 0.15], [0, 0, -0.12 * s]);
      part(head, capsuleGeo, d.light, [0.25 * s, 1.0, 0.07], [0.12, 0.42, 0.1], [0, 0, -0.12 * s]);
    } else if (type === 'pig') {
      part(head, coneGeo, d.body, [0.42 * s, 0.6, 0.05], [0.22, 0.34, 0.12], [0.3, 0, -0.5 * s]);
    } else {
      part(head, coneGeo, d.body, [0.4 * s, 0.68, 0], [0.3, 0.5, 0.2], [0, Math.PI / 4, -0.15 * s]);
      part(head, coneGeo, d.light, [0.4 * s, 0.64, 0.08], [0.18, 0.34, 0.12], [0, Math.PI / 4, -0.15 * s]);
    }
  }
  // détails
  if (type === 'cat') {
    part(inner, capsuleGeo, d.body, [0.9, 0.5, -0.5], [0.12, 0.5, 0.12], [0, 0, -1]);
  }
  if (type === 'fox') {
    part(inner, sphereGeo, d.body, [0.7, 0.55, -0.7], [0.3, 0.3, 0.55]);
    part(inner, sphereGeo, 0xffffff, [0.7, 0.55, -1.15], [0.2, 0.2, 0.2]);
  }
  if (type === 'rabbit') part(inner, sphereGeo, 0xffffff, [0, 0.6, -0.8], 0.25);

  g.userData = { type, head, inner, baseY: 0, phase: Math.random() * 6, jump: 0, wobble: 0 };
  return g;
}

export function cheer(a) { a.userData.jump = 1; }
export function wobble(a) { a.userData.wobble = 1; }

export function updateAnimal(a, t, dt) {
  const u = a.userData;
  u.head.rotation.z = Math.sin(t * 1.6 + u.phase) * 0.05;
  u.head.position.y = 2.0 + Math.sin(t * 2.2 + u.phase) * 0.03;
  let y = u.baseY;
  let sy = 1;
  if (u.jump > 0) {
    u.jump = Math.max(0, u.jump - dt / 1.1);
    const k = 1 - u.jump;
    y += Math.abs(Math.sin(k * Math.PI * 3)) * 0.7 * u.jump;
    sy = 1 + Math.sin(k * Math.PI * 6) * 0.06 * u.jump;
  }
  a.position.y = y;
  a.scale.y = sy;
  if (u.wobble > 0) {
    u.wobble = Math.max(0, u.wobble - dt / 0.6);
    a.rotation.z = Math.sin(t * 36) * 0.1 * u.wobble;
  } else a.rotation.z = 0;
}
