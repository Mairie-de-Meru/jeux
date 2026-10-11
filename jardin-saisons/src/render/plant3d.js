import * as THREE from 'three';
import { mat, PLOT_POS } from './scene.js';
import { squash, easeOutBack, clamp01 } from './ease.js';

const sphere = new THREE.SphereGeometry(1, 16, 12);
const stemGeo = new THREE.CylinderGeometry(0.05, 0.07, 1, 8);
const leafGeo = new THREE.SphereGeometry(1, 12, 8);
const dropGeo = new THREE.SphereGeometry(0.09, 10, 8);
const rayGeo = new THREE.BoxGeometry(0.06, 0.9, 0.06);

function stem(h) {
  const m = new THREE.Mesh(stemGeo, mat('#3fae45'));
  m.scale.y = h; m.position.y = h / 2; m.castShadow = true;
  return m;
}
function leaf(x, y, rot, s) {
  const m = new THREE.Mesh(leafGeo, mat('#58c85a'));
  m.scale.set(0.34 * s, 0.07 * s, 0.16 * s);
  m.position.set(x, y, 0); m.rotation.z = rot; m.castShadow = true;
  return m;
}
function flowerHead(y) {
  const g = new THREE.Group(); g.position.y = y;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const p = new THREE.Mesh(sphere, mat('#ff6fa8'));
    p.scale.setScalar(0.17); p.position.set(Math.cos(a) * 0.22, 0, Math.sin(a) * 0.22); p.castShadow = true; g.add(p);
  }
  const c = new THREE.Mesh(sphere, mat('#ffd23f')); c.scale.setScalar(0.16); g.add(c);
  g.rotation.x = -0.5;
  return g;
}

function buildStages() {
  const stages = [];
  // 0 graine
  let g = new THREE.Group();
  let m = new THREE.Mesh(sphere, mat('#8a5a2b')); m.scale.set(0.22, 0.15, 0.17); m.position.y = 0.28; m.castShadow = true; g.add(m);
  stages.push(g);
  // 1 germe
  g = new THREE.Group(); g.add(stem(0.5)); g.add(leaf(0.16, 0.5, 0.5, 0.8), leaf(-0.16, 0.5, -0.5, 0.8));
  stages.push(g);
  // 2 pousse
  g = new THREE.Group(); g.add(stem(1.05));
  g.add(leaf(0.22, 0.45, 0.4, 1), leaf(-0.22, 0.6, -0.4, 1), leaf(0.24, 0.85, 0.5, 1.1), leaf(-0.24, 1.0, -0.5, 1.1));
  stages.push(g);
  // 3 fleur
  g = new THREE.Group(); g.add(stem(1.4));
  g.add(leaf(0.25, 0.5, 0.4, 1.1), leaf(-0.25, 0.7, -0.4, 1.1), leaf(0.22, 1.0, 0.5, 1));
  g.add(flowerHead(1.5));
  stages.push(g);
  // 4 fruit
  g = new THREE.Group(); g.add(stem(1.4));
  g.add(leaf(0.25, 0.5, 0.4, 1.1), leaf(-0.25, 0.7, -0.4, 1.1), leaf(0.22, 1.0, 0.5, 1));
  const top = new THREE.Mesh(sphere, mat('#e8383d')); top.scale.setScalar(0.34); top.position.set(0, 1.62, 0); top.castShadow = true; g.add(top);
  const cap = new THREE.Mesh(leafGeo, mat('#3fae45')); cap.scale.set(0.2, 0.05, 0.2); cap.position.set(0, 1.93, 0); g.add(cap);
  const small = new THREE.Mesh(sphere, mat('#e8383d')); small.scale.setScalar(0.22); small.position.set(0.4, 0.95, 0); small.castShadow = true; g.add(small);
  stages.push(g);
  return stages;
}

export function createPlant3d(garden) {
  const root = new THREE.Group();
  root.position.set(PLOT_POS.x, 0.22, PLOT_POS.z);
  garden.add(root);
  const stages = buildStages();
  stages.forEach((s) => { s.visible = false; root.add(s); });
  let stage = -1, anim = 1, t = 0;
  const fx = new THREE.Group(); root.add(fx);
  const effects = [];

  function setStage(i, animate = true) {
    if (stage >= 0) stages[stage].visible = false;
    stage = i;
    if (i < 0) return;
    stages[i].visible = true;
    anim = animate ? 0 : 1;
  }
  function hide() { if (stage >= 0) stages[stage].visible = false; stage = -1; }

  function dropWater() {
    for (let i = 0; i < 7; i++) {
      const d = new THREE.Mesh(dropGeo, mat('#4aa8ff', { transparent: true, opacity: 0.9 }));
      d.position.set((Math.random() - 0.5) * 0.7, 3 + i * 0.25, (Math.random() - 0.5) * 0.7);
      d.scale.set(1, 1.5, 1);
      fx.add(d);
      effects.push({ o: d, kind: 'drop', t: -i * 0.08, life: 0.7, y0: d.position.y });
    }
  }
  function shineSun() {
    const g = new THREE.Group(); g.position.y = 2.4;
    const core = new THREE.Mesh(sphere, new THREE.MeshBasicMaterial({ color: '#ffd23f', transparent: true, opacity: 0.95 }));
    core.scale.setScalar(0.35); g.add(core);
    for (let i = 0; i < 8; i++) {
      const r = new THREE.Mesh(rayGeo, new THREE.MeshBasicMaterial({ color: '#ffe27a', transparent: true, opacity: 0.8 }));
      const a = (i / 8) * Math.PI * 2;
      r.position.set(Math.cos(a) * 0.6, Math.sin(a) * 0.6, 0); r.rotation.z = a - Math.PI / 2; g.add(r);
    }
    fx.add(g);
    effects.push({ o: g, kind: 'sun', t: 0, life: 1.1 });
  }

  function update(dt) {
    t += dt;
    if (stage >= 0) {
      const s = stages[stage];
      if (anim < 1) {
        anim = Math.min(1, anim + dt / 0.9);
        const q = squash(anim), grow = easeOutBack(clamp01(anim * 1.6));
        s.scale.set(q.sx * grow, q.sy * grow, q.sx * grow);
      } else s.scale.set(1, 1, 1);
      s.rotation.z = Math.sin(t * 1.6) * 0.03 * (stage > 0 ? 1 : 0);
    }
    for (let i = effects.length - 1; i >= 0; i--) {
      const e = effects[i]; e.t += dt;
      if (e.t < 0) continue;
      const k = e.t / e.life;
      if (e.kind === 'drop') e.o.position.y = Math.max(0.2, e.y0 - k * (e.y0 - 0.2) * 1.2);
      else { e.o.rotation.z += dt * 1.5; const sc = 0.6 + Math.sin(k * Math.PI) * 0.7; e.o.scale.setScalar(sc); }
      if (k >= 1) {
        fx.remove(e.o);
        e.o.traverse((c) => { if (c.material && c.material.dispose && c.material.type === 'MeshBasicMaterial') c.material.dispose(); });
        effects.splice(i, 1);
      }
    }
  }
  return { root, setStage, hide, dropWater, shineSun, update, get stage() { return stage; } };
}
