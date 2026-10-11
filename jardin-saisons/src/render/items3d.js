import * as THREE from 'three';
import { mat } from './scene.js';
import { easeOutBack, squash, clamp01 } from './ease.js';

const S = new THREE.SphereGeometry(1, 18, 14);
const C = new THREE.CylinderGeometry(1, 1, 1, 16);
const CONE = new THREE.ConeGeometry(1, 1, 16);
const TORUS = new THREE.TorusGeometry(1, 0.28, 10, 24);
const HALF = new THREE.SphereGeometry(1, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2);

function add(g, geo, color, pos, scale, rot) {
  const m = new THREE.Mesh(geo, mat(color));
  m.position.set(...pos); m.scale.set(...scale); if (rot) m.rotation.set(...rot);
  m.castShadow = true; g.add(m); return m;
}

const BUILDERS = {
  'bonhomme-de-neige'(g) {
    add(g, S, '#ffffff', [0, 0.35, 0], [0.4, 0.35, 0.4]);
    add(g, S, '#ffffff', [0, 0.85, 0], [0.3, 0.28, 0.3]);
    add(g, S, '#ffffff', [0, 1.2, 0], [0.22, 0.22, 0.22]);
    add(g, CONE, '#ff8a2b', [0, 1.2, 0.24], [0.05, 0.22, 0.05], [Math.PI / 2, 0, 0]);
    add(g, S, '#222222', [-0.07, 1.26, 0.18], [0.03, 0.03, 0.03]);
    add(g, S, '#222222', [0.07, 1.26, 0.18], [0.03, 0.03, 0.03]);
    add(g, C, '#3b2a6b', [0, 1.4, 0], [0.2, 0.2, 0.2]);
    add(g, C, '#3b2a6b', [0, 1.38, 0], [0.3, 0.03, 0.3]);
  },
  luge(g) {
    add(g, new THREE.BoxGeometry(1, 0.1, 0.5), '#e8383d', [0, 0.25, 0], [1, 1, 1]);
    add(g, C, '#8a8f99', [0, 0.1, 0.2], [0.04, 1.1, 0.04], [0, 0, Math.PI / 2]);
    add(g, C, '#8a8f99', [0, 0.1, -0.2], [0.04, 1.1, 0.04], [0, 0, Math.PI / 2]);
    add(g, C, '#8a8f99', [-0.3, 0.17, 0.2], [0.03, 0.15, 0.03]);
    add(g, C, '#8a8f99', [0.3, 0.17, 0.2], [0.03, 0.15, 0.03]);
    add(g, C, '#8a8f99', [-0.3, 0.17, -0.2], [0.03, 0.15, 0.03]);
    add(g, C, '#8a8f99', [0.3, 0.17, -0.2], [0.03, 0.15, 0.03]);
  },
  echarpe(g) {
    add(g, C, '#8a5a34', [0, 0.55, 0], [0.07, 0.55, 0.07]);
    add(g, TORUS, '#e8383d', [0, 1.0, 0], [0.22, 0.22, 0.4], [Math.PI / 2, 0, 0]);
    add(g, new THREE.BoxGeometry(0.2, 0.55, 0.06), '#e8383d', [0.15, 0.7, 0.2], [1, 1, 1]);
    add(g, new THREE.BoxGeometry(0.2, 0.06, 0.07), '#ffd23f', [0.15, 0.5, 0.2], [1, 1, 1]);
  },
  tulipes(g) {
    [['#ff4f8a', -0.25], ['#ffd23f', 0], ['#ff7b2b', 0.25]].forEach(([c, x], i) => {
      add(g, C, '#3fae45', [x, 0.3 + i * 0.02, 0], [0.03, 0.3, 0.03]);
      add(g, S, c, [x, 0.65 + i * 0.04, 0], [0.12, 0.17, 0.12]);
      add(g, S, '#58c85a', [x + 0.1, 0.25, 0], [0.1, 0.04, 0.04], [0, 0, 0.5]);
    });
  },
  nid(g) {
    add(g, TORUS, '#a8743f', [0, 0.18, 0], [0.4, 0.4, 0.5], [Math.PI / 2, 0, 0]);
    add(g, S, '#a8743f', [0, 0.1, 0], [0.38, 0.1, 0.38]);
    [[-0.12, 0], [0.12, 0.05], [0, -0.1]].forEach(([x, z]) => add(g, S, '#e6f4ff', [x, 0.24, z], [0.1, 0.13, 0.1]));
  },
  parapluie(g) {
    add(g, C, '#444a66', [0, 0.55, 0], [0.025, 0.55, 0.025]);
    add(g, HALF, '#3d9bff', [0, 0.95, 0], [0.7, 0.45, 0.7]);
    add(g, S, '#444a66', [0, 1.42, 0], [0.04, 0.04, 0.04]);
    add(g, TORUS, '#444a66', [0, 0.05, 0.1], [0.08, 0.08, 0.08]);
  },
  parasol(g) {
    add(g, C, '#ffffff', [0, 0.8, 0], [0.04, 0.8, 0.04]);
    add(g, HALF, '#ff5d73', [0, 1.45, 0], [0.95, 0.5, 0.95]);
    add(g, HALF, '#ffffff', [0, 1.46, 0], [0.7, 0.52, 0.7]);
    add(g, S, '#ffd23f', [0, 1.98, 0], [0.05, 0.05, 0.05]);
  },
  glace(g) {
    add(g, CONE, '#e0a85a', [0, 0.45, 0], [0.22, 0.9, 0.22], [Math.PI, 0, 0]);
    add(g, S, '#ff8fb7', [0, 0.98, 0], [0.26, 0.26, 0.26]);
    add(g, S, '#fff3c9', [0, 1.28, 0], [0.22, 0.22, 0.22]);
    add(g, S, '#e8383d', [0, 1.5, 0], [0.05, 0.05, 0.05]);
  },
  'seau-pelle'(g) {
    const b = add(g, new THREE.CylinderGeometry(0.34, 0.24, 0.45, 18), '#e8383d', [-0.2, 0.23, 0], [1, 1, 1]);
    b.castShadow = true;
    add(g, TORUS, '#ffffff', [-0.2, 0.46, 0], [0.34, 0.34, 0.3], [Math.PI / 2, 0, 0]).scale.z = 0.3;
    add(g, C, '#ffd23f', [0.35, 0.4, 0], [0.04, 0.4, 0.04], [0, 0, -0.35]);
    add(g, new THREE.BoxGeometry(0.2, 0.04, 0.22), '#ffd23f', [0.5, 0.05, 0], [1, 1, 1], [0, 0, -0.1]);
  },
  citrouille(g) {
    add(g, S, '#ff8a1f', [0, 0.35, 0], [0.55, 0.4, 0.55]);
    add(g, S, '#ff9a3c', [-0.25, 0.35, 0], [0.32, 0.38, 0.5]);
    add(g, S, '#ff9a3c', [0.25, 0.35, 0], [0.32, 0.38, 0.5]);
    add(g, C, '#3f8a3a', [0, 0.78, 0], [0.06, 0.1, 0.06]);
  },
  champignons(g) {
    [[-0.2, 0, 1], [0.22, 0.1, 0.7]].forEach(([x, z, s]) => {
      add(g, C, '#fff1d6', [x, 0.2 * s, z], [0.09 * s, 0.2 * s, 0.09 * s]);
      add(g, HALF, '#e8383d', [x, 0.36 * s, z], [0.3 * s, 0.22 * s, 0.3 * s]);
      add(g, S, '#ffffff', [x + 0.08 * s, 0.5 * s, z], [0.04 * s, 0.03 * s, 0.04 * s]);
      add(g, S, '#ffffff', [x - 0.08 * s, 0.46 * s, z + 0.1 * s], [0.04 * s, 0.03 * s, 0.04 * s]);
    });
  },
  'tas-de-feuilles'(g) {
    const cols = ['#e8782a', '#d1452b', '#f2b134', '#a8531f'];
    for (let i = 0; i < 9; i++) {
      const a = i * 2.4, r = 0.1 + (i % 4) * 0.12;
      add(g, S, cols[i % 4], [Math.cos(a) * r, 0.1 + (i < 3 ? 0.14 : 0.04), Math.sin(a) * r], [0.22, 0.09, 0.2], [0, a, 0]);
    }
  },
};

// Emplacements dans le jardin (devant et sur les côtés du carré de terre)
export const SLOTS = [[-1.6, 2.0], [3.0, 1.6], [-3.4, 0.7], [1.4, 2.5], [3.6, -0.3], [-0.6, 2.9]];

export function createItems(garden) {
  const root = new THREE.Group(); garden.add(root);
  const live = [];
  function add3(id, index = live.length) {
    const g = new THREE.Group();
    (BUILDERS[id] || BUILDERS.nid)(g);
    const [x, z] = SLOTS[index % SLOTS.length];
    g.position.set(x, 0, z);
    g.rotation.y = (index % 2 ? -0.3 : 0.3);
    g.scale.setScalar(0.001);
    root.add(g);
    live.push({ g, t: 0 });
  }
  function clear() { while (root.children.length) root.remove(root.children[0]); live.length = 0; }
  function update(dt) {
    for (const o of live) {
      if (o.t >= 1) continue;
      o.t = Math.min(1, o.t + dt / 0.8);
      const grow = Math.max(0.001, easeOutBack(clamp01(o.t * 1.5))), q = squash(o.t);
      o.g.scale.set(q.sx * grow * 1.15, q.sy * grow * 1.15, q.sx * grow * 1.15);
    }
  }
  return { add: add3, clear, update, ids: Object.keys(BUILDERS) };
}
