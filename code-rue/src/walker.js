import * as THREE from 'three';
import { lerp, easeOutBack } from './ease.js';

// Personnage arrondi. L'avant du modèle est +z (yaw = atan2(dx, dz)).
const geo = {
  torso: new THREE.CapsuleGeometry(0.3, 0.42, 6, 14),
  head: new THREE.SphereGeometry(0.32, 20, 16),
  hair: new THREE.SphereGeometry(0.34, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.55),
  eye: new THREE.SphereGeometry(0.05, 8, 6),
  limb: new THREE.CapsuleGeometry(0.09, 0.26, 4, 8),
  pack: new THREE.CapsuleGeometry(0.2, 0.2, 4, 10),
};
const mats = {
  shirt: new THREE.MeshStandardMaterial({ color: 0xff8a3d, roughness: 0.6 }),
  skin: new THREE.MeshStandardMaterial({ color: 0xffd2a8, roughness: 0.6 }),
  hair: new THREE.MeshStandardMaterial({ color: 0x6b3f22, roughness: 0.7 }),
  eye: new THREE.MeshBasicMaterial({ color: 0x222222 }),
  pants: new THREE.MeshStandardMaterial({ color: 0x3d7bff, roughness: 0.7 }),
  pack: new THREE.MeshStandardMaterial({ color: 0xe8432e, roughness: 0.6 }),
};

export function createWalker() {
  const root = new THREE.Group();
  const inner = new THREE.Group();
  root.add(inner);

  const torso = new THREE.Mesh(geo.torso, mats.shirt); torso.position.y = 0.85; torso.castShadow = true;
  const pack = new THREE.Mesh(geo.pack, mats.pack); pack.position.set(0, 0.9, -0.3); pack.castShadow = true;
  const headG = new THREE.Group(); headG.position.y = 1.5;
  const head = new THREE.Mesh(geo.head, mats.skin); head.castShadow = true;
  const hair = new THREE.Mesh(geo.hair, mats.hair); hair.rotation.x = -0.35; hair.position.y = 0.03;
  headG.add(head, hair);
  for (const sx of [-0.12, 0.12]) { const e = new THREE.Mesh(geo.eye, mats.eye); e.position.set(sx, 0.02, 0.29); headG.add(e); }
  const legs = [-0.14, 0.14].map((x) => {
    const p = new THREE.Group(); p.position.set(x, 0.5, 0);
    const m = new THREE.Mesh(geo.limb, mats.pants); m.position.y = -0.2; m.castShadow = true; p.add(m);
    inner.add(p); return p;
  });
  const arms = [-0.4, 0.4].map((x) => {
    const p = new THREE.Group(); p.position.set(x, 1.1, 0);
    const m = new THREE.Mesh(geo.limb, mats.shirt); m.position.y = -0.18; p.add(m);
    inner.add(p); return p;
  });
  inner.add(torso, pack, headG);

  const st = {
    path: [], speed: 2.4, onDone: null, yaw: Math.PI, yawT: Math.PI, headT: 0, phase: 0,
    fx: null, moving: false, x: 0, z: 0,
  };

  function setPose(x, z, yaw = st.yaw) {
    st.x = x; st.z = z; st.yaw = st.yawT = yaw;
    root.position.set(x, 0, z); root.rotation.y = yaw;
  }

  function walk(path, speed, onDone) {
    st.path = path.map(([x, z]) => ({ x, z }));
    st.speed = speed; st.onDone = onDone ?? null; st.moving = st.path.length > 0;
    if (!st.moving && onDone) onDone();
  }

  const angDiff = (a, b) => ((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;

  function update(dt) {
    let walking = false;
    if (st.path.length) {
      const t = st.path[0];
      const dx = t.x - st.x, dz = t.z - st.z;
      const dist = Math.hypot(dx, dz);
      const stepLen = st.speed * dt;
      if (dist <= stepLen) {
        st.x = t.x; st.z = t.z; st.path.shift();
        if (!st.path.length) {
          st.moving = false;
          const cb = st.onDone; st.onDone = null;
          if (cb) cb();
        }
      } else {
        st.x += (dx / dist) * stepLen; st.z += (dz / dist) * stepLen;
        st.yawT = Math.atan2(dx, dz);
        walking = true;
      }
    }
    st.yaw += angDiff(st.yaw, st.yawT) * (1 - Math.exp(-12 * dt));
    root.position.set(st.x, 0, st.z);
    root.rotation.y = st.yaw;

    st.phase += (walking ? st.speed : 0) * dt * 3.4;
    const sw = walking ? Math.sin(st.phase) : 0;
    legs[0].rotation.x = sw * 0.7; legs[1].rotation.x = -sw * 0.7;
    arms[0].rotation.x = -sw * 0.6; arms[1].rotation.x = sw * 0.6;
    const bob = walking ? Math.abs(Math.sin(st.phase)) * 0.09 : 0;
    const sq = walking ? Math.sin(st.phase * 2) * 0.04 : Math.sin(performance.now() / 600) * 0.012;
    let sy = 1 + sq, sxz = 1 - sq * 0.8, oy = bob, tilt = 0;

    if (st.fx) {
      const f = st.fx; f.t += dt;
      const u = Math.min(1, f.t / f.dur);
      if (f.type === 'hop') {
        oy += Math.sin(Math.PI * u) * 0.7;
        const squash = u < 0.15 ? u / 0.15 : u > 0.85 ? (1 - u) / 0.15 : 0;
        sy *= 1 - 0.22 * squash; sxz *= 1 + 0.18 * squash;
      } else if (f.type === 'wiggle') {
        tilt = Math.sin(u * Math.PI * 6) * 0.18 * (1 - u);
      }
      if (u >= 1) st.fx = null;
    }
    inner.position.y = oy;
    inner.scale.set(sxz, sy, sxz);
    inner.rotation.z = tilt;
    headG.rotation.y = lerp(headG.rotation.y, st.headT, 1 - Math.exp(-14 * dt));
  }

  return {
    group: root,
    setPose, walk, update,
    get x() { return st.x; },
    get z() { return st.z; },
    get moving() { return st.moving; },
    get onRoad() { return Math.abs(st.z) < 4.0; },
    face(yaw) { st.yawT = yaw; },
    look(cote) { st.headT = cote === 'gauche' ? 1.1 : cote === 'droite' ? -1.1 : 0; },
    hop() { st.fx = { type: 'hop', t: 0, dur: 0.7 }; },
    wiggle() { st.fx = { type: 'wiggle', t: 0, dur: 0.6 }; },
    stop() { st.path = []; st.moving = false; st.onDone = null; },
    easeOutBack,
  };
}
