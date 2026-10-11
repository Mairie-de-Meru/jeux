import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { lerp, easeInOutCubic } from './ease.js';

export const CAR_LEN = 3.6;
const VMAX = 4.2;       // voitures lentes
const LANE = { e: 0.9, w: -0.9 };
const SPAWN_DIST = 34;
const STOP_GAP = 3.0;   // le pare-chocs s'arrête à 3 m du centre du passage
const PALETTE = [0xff5a5f, 0xffc93c, 0x4cd964, 0x3db2ff, 0xb06cff, 0xff8fb8, 0xff9a3c];

// ---- modèle de voiture (géométries et matériaux partagés) ----
const G = {
  body: new RoundedBoxGeometry(CAR_LEN, 0.75, 1.7, 3, 0.3),
  cabin: new RoundedBoxGeometry(1.9, 0.62, 1.5, 3, 0.25),
  wheel: new THREE.CylinderGeometry(0.34, 0.34, 0.3, 14),
  light: new THREE.SphereGeometry(0.14, 8, 6),
};
const M = {
  glass: new THREE.MeshStandardMaterial({ color: 0xd8f0ff, roughness: 0.3 }),
  wheel: new THREE.MeshStandardMaterial({ color: 0x24262b, roughness: 0.9 }),
  light: new THREE.MeshBasicMaterial({ color: 0xfff3a0 }),
  rear: new THREE.MeshBasicMaterial({ color: 0xff3b30 }),
};
const bodyMats = new Map();
const bodyMat = (c) => {
  if (!bodyMats.has(c)) bodyMats.set(c, new THREE.MeshStandardMaterial({ color: c, roughness: 0.55 }));
  return bodyMats.get(c);
};

// Avant de la voiture = +x.
export function makeCarMesh(color) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(G.body, bodyMat(color)); body.position.y = 0.7; body.castShadow = true; body.receiveShadow = true;
  const cabin = new THREE.Mesh(G.cabin, M.glass); cabin.position.set(-0.25, 1.25, 0); cabin.castShadow = true;
  g.add(body, cabin);
  for (const sx of [-1.15, 1.15]) for (const sz of [-0.82, 0.82]) {
    const w = new THREE.Mesh(G.wheel, M.wheel); w.rotation.x = Math.PI / 2; w.position.set(sx, 0.34, sz); g.add(w);
  }
  for (const sz of [-0.55, 0.55]) {
    const l = new THREE.Mesh(G.light, M.light); l.position.set(1.8, 0.75, sz); g.add(l);
    const r = new THREE.Mesh(G.light, M.rear); r.position.set(-1.8, 0.75, sz); g.add(r);
  }
  return g;
}

// ---- circulation ----
export function createTraffic(scene) {
  const group = new THREE.Group();
  scene.add(group);
  let cars = [];
  let cfg = { mode: 'off', X: 0 };
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  let colorIdx = 0;
  let timers = { e: 0, w: 0 };
  let lastN = 0;

  function spawn(dirKey) {
    const dir = dirKey === 'e' ? 1 : -1;
    const x = cfg.X - dir * SPAWN_DIST;
    if (cars.some((c) => c.dir === dir && Math.abs(c.x - x) < 8)) return false;
    const mesh = makeCarMesh(PALETTE[colorIdx++ % PALETTE.length]);
    mesh.rotation.y = dir === 1 ? 0 : Math.PI;
    mesh.position.set(x, 0.05, LANE[dirKey]);
    group.add(mesh);
    cars.push({ mesh, dir, x, v: VMAX, z: LANE[dirKey] });
    return true;
  }
  const lead = SPAWN_DIST / VMAX;
  const nOf = (t, c) => Math.floor((t + lead - c.passage / 2) / c.periode);

  function configure(c, t = 0, stopFn = () => false) {
    if (c.mode === 'off') { cfg = { ...cfg, mode: 'off' }; return; } // les voitures déjà sur la route finissent leur chemin
    cfg = { mode: 'off', X: 0, ...c };
    for (const car of cars) group.remove(car.mesh);
    cars = [];
    timers = { e: 0.5, w: 2.5 };
    lastN = nOf(t - 18, cfg.trafic ?? { passage: 4, periode: 12 });
    for (let tt = t - 18; tt < t; tt += 0.1) update(0.1, tt, stopFn(tt));
  }

  // stop : true si les voitures doivent s'arrêter avant le passage (feu non vert ou piéton engagé)
  function update(dt, t, stop) {
    if (cfg.mode === 'light') {
      for (const k of ['e', 'w']) {
        timers[k] -= dt;
        if (timers[k] <= 0 && spawn(k)) timers[k] = 3.2 + rnd() * 3;
      }
    } else if (cfg.mode === 'schedule') {
      const n = nOf(t, cfg.trafic);
      while (lastN < n) { lastN++; spawn(((lastN % 2) + 2) % 2 === 0 ? 'e' : 'w'); }
    }
    for (const dir of [1, -1]) {
      const lane = cars.filter((c) => c.dir === dir).sort((a, b) => dir * (b.x - a.x));
      let leader = null;
      for (const c of lane) {
        let vt = VMAX;
        if (cfg.mode !== 'off' && stop) {
          const d = dir * (cfg.X - c.x) - STOP_GAP - CAR_LEN / 2; // distance restante avant la ligne
          if (d > -0.3) {
            const canStop = d >= (c.v * c.v) / 12 - 0.05;
            if (canStop) vt = Math.min(vt, Math.sqrt(2 * 2.4 * Math.max(d, 0)));
          }
        }
        if (leader) {
          const gap = dir * (leader.x - c.x) - CAR_LEN;
          vt = Math.min(vt, Math.sqrt(2 * 2.4 * Math.max(gap - 1.2, 0)));
        }
        const dv = vt - c.v;
        c.v += dv < 0 ? Math.max(dv, -6 * dt) : Math.min(dv, 2.2 * dt);
        if (c.v < 0.02) c.v = 0;
        c.x += dir * c.v * dt;
        leader = c;
      }
    }
    for (let i = cars.length - 1; i >= 0; i--) {
      const c = cars[i];
      c.mesh.position.x = c.x;
      if (Math.abs(c.x - cfg.X) > SPAWN_DIST + 12) { group.remove(c.mesh); cars.splice(i, 1); }
    }
  }

  return {
    group, configure, update,
    anyNear: (X, r) => cars.some((c) => Math.abs(c.x - X) < r),
    clearZone(X, r) {
      cars = cars.filter((c) => { if (Math.abs(c.x - X) < r) { group.remove(c.mesh); return false; } return true; });
    },
    count: () => cars.length,
    speeds: () => cars.map((c) => ({ x: c.x, v: c.v, dir: c.dir })),
  };
}

// ---- voiture du garage : g = horloge du garage (s) ; cfg = {debut, duree, periode} ----
export function updateGarage(garage, g, cfg, active) {
  const { door, car, doorY } = garage;
  car.visible = active;
  if (!active) { door.position.y = doorY; return; }
  const local = ((g % cfg.periode) + cfg.periode) % cfg.periode;
  const { debut, duree, periode } = cfg;
  const open = local < periode - 1.2
    ? Math.min(1, Math.max(0, (local - (debut - 1.2)) / 1.0))
    : 1 - Math.min(1, (local - (periode - 1.2)) / 1.0);
  door.position.y = doorY + open * 2.5;
  if (local < debut) {
    car.position.set(7, 0.1, -11); car.rotation.y = Math.PI / 2;
  } else if (local < debut + duree) {
    const s = easeInOutCubic((local - debut) / duree);
    car.position.set(7, 0.1, lerp(-11, -3.2, s)); car.rotation.y = Math.PI / 2;
  } else {
    const p = local - debut - duree;
    const turn = Math.min(1, p / 0.8);
    car.rotation.y = lerp(Math.PI / 2, Math.PI, easeInOutCubic(turn));
    car.position.set(7 - Math.max(0, p - 0.8) * 4, 0.1, -3.2);
  }
}
