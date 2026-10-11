import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { windsockState } from '../logic/wind.js';
import { GROUND_Y } from '../physics.js';

const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...extra });
function shadowed(m) { m.castShadow = true; m.receiveShadow = true; return m; }

export function createCrane(scene) {
  const g = new THREE.Group();
  scene.add(g);
  const yellow = std(0xffb020), dark = std(0x555566);
  const mast = shadowed(new THREE.Mesh(new RoundedBoxGeometry(0.5, 44, 0.5, 2, 0.1), yellow));
  mast.position.set(-7.2, GROUND_Y + 22, 0);
  const jib = shadowed(new THREE.Mesh(new RoundedBoxGeometry(10.6, 0.4, 0.5, 2, 0.1), yellow));
  jib.position.x = -1.95;
  const trolley = shadowed(new THREE.Mesh(new RoundedBoxGeometry(0.7, 0.35, 0.6, 2, 0.08), dark));
  const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1, 6), dark);
  const hook = shadowed(new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.04, 8, 14), dark));
  g.add(mast, jib, trolley, cable, hook);
  function update(x, hookY) {
    const jibY = hookY + 1.4;
    jib.position.y = jibY;
    trolley.position.set(x, jibY - 0.1, 0);
    const len = jibY - 0.1 - hookY;
    cable.scale.y = len;
    cable.position.set(x, hookY + len / 2, 0);
    hook.position.set(x, hookY - 0.1, 0);
  }
  return { group: g, update };
}

export function createWindsock(scene) {
  const g = new THREE.Group();
  g.position.set(3.7, 1.6, 0);
  scene.add(g);
  const pole = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.6 - GROUND_Y, 8), std(0xeeeeee)));
  pole.position.set(0, -(1.6 - GROUND_Y) / 2 + 0.0, 0);
  g.add(pole);
  const sock = new THREE.Group();
  const segs = 5;
  for (let i = 0; i < segs; i++) {
    const r0 = 0.34 - i * 0.05, r1 = 0.34 - (i + 1) * 0.05;
    const m = shadowed(new THREE.Mesh(
      new THREE.CylinderGeometry(r1, r0, 0.3, 14, 1, true),
      std(i % 2 ? 0xffffff : 0xff4d2e, { side: THREE.DoubleSide }),
    ));
    m.rotation.z = Math.PI / 2; // axe le long de +x
    m.position.x = 0.15 + i * 0.3;
    sock.add(m);
  }
  g.add(sock);
  sock.rotation.z = -Math.PI / 2;
  function update(force, maxStrength) {
    const { angle, inflate } = windsockState(force, maxStrength);
    sock.rotation.z = -(1 - angle) * (Math.PI / 2);
    const s = 0.55 + 0.45 * inflate;
    sock.scale.set(1, s, s);
  }
  return { group: g, update };
}

function makeCharacter(color) {
  const c = new THREE.Group();
  const body = shadowed(new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 0.4, 6, 14), std(color)));
  body.position.y = 0.46;
  c.add(body);
  const eyeMat = std(0xffffff), pupil = new THREE.MeshBasicMaterial({ color: 0x222222 });
  for (const sx of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), eyeMat);
    e.position.set(sx * 0.1, 0.62, 0.22);
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), pupil);
    p.position.set(sx * 0.1, 0.62, 0.285);
    c.add(e, p);
  }
  const arms = [];
  for (const sx of [-1, 1]) {
    const a = new THREE.Group();
    a.position.set(sx * 0.3, 0.5, 0);
    const m = shadowed(new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.22, 4, 8), std(color)));
    m.position.y = -0.17;
    a.add(m);
    a.userData.side = sx;
    c.add(a);
    arms.push(a);
  }
  c.userData.arms = arms;
  return c;
}

export function createCharacters(scene) {
  const g = new THREE.Group();
  scene.add(g);
  const cloudMat = std(0xffffff);
  const cloud = new THREE.Group();
  for (const [x, y, r] of [[-1.2, 0, 0.6], [-0.5, 0.1, 0.85], [0.4, 0.1, 0.9], [1.2, 0, 0.6], [0, -0.1, 0.8]]) {
    const s = shadowed(new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), cloudMat));
    s.position.set(x, y, 0);
    s.scale.z = 0.9;
    cloud.add(s);
  }
  cloud.position.y = -0.5;
  g.add(cloud);
  const chars = [0xff6bb5, 0x4dd0e1, 0xb388ff].map((col, i) => {
    const c = makeCharacter(col);
    c.position.set((i - 1) * 0.85, 0.42, 0.2);
    g.add(c);
    return c;
  });
  g.position.x = 5.4;
  let cheer = false, cheerT = 0;
  function setTarget(y) { g.position.y = y - 0.45; }
  function setCheer(v) { cheer = v; cheerT = 0; }
  function update(t, dt) {
    if (cheer) cheerT += dt;
    chars.forEach((c, i) => {
      const arms = c.userData.arms;
      if (cheer) {
        const k = Math.abs(Math.sin(cheerT * 7 + i * 1.3));
        c.position.y = 0.42 + k * 0.55;
        c.rotation.z = Math.sin(cheerT * 7 + i) * 0.08;
        arms.forEach((a) => { a.rotation.z = a.userData.side * (2.5 + Math.sin(cheerT * 18 + i) * 0.5); });
      } else {
        c.position.y = 0.42;
        c.rotation.z = Math.sin(t * 2.6 + i * 1.7) * 0.12;
        arms.forEach((a) => { a.rotation.z = a.userData.side * (0.25 + Math.sin(t * 2.6 + i) * 0.08); });
      }
    });
  }
  return { group: g, setTarget, setCheer, update };
}

export function createConfetti(scene) {
  const N = 150;
  const mesh = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(0.22, 0.12),
    new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }),
    N,
  );
  mesh.frustumCulled = false;
  mesh.visible = false;
  scene.add(mesh);
  const palette = [0xff4d6d, 0xffd23f, 0x3bceac, 0x4d9de0, 0xc77dff, 0xff9f1c].map((c) => new THREE.Color(c));
  const parts = Array.from({ length: N }, () => ({ p: new THREE.Vector3(), v: new THREE.Vector3(), r: new THREE.Euler(), s: new THREE.Vector3(), life: 0 }));
  const dummy = new THREE.Object3D();
  let active = 0;
  function burst(cx, cy) {
    parts.forEach((q, i) => {
      q.p.set(cx + (Math.random() - 0.5) * 3, cy + Math.random() * 1.5, 2 + Math.random());
      q.v.set((Math.random() - 0.5) * 7, 4 + Math.random() * 6, (Math.random() - 0.5) * 2);
      q.r.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
      q.s.set((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12);
      q.life = 3 + Math.random() * 1.5;
      mesh.setColorAt(i, palette[i % palette.length]);
    });
    mesh.instanceColor.needsUpdate = true;
    active = 4.5;
    mesh.visible = true;
  }
  function update(dt) {
    if (active <= 0) return;
    active -= dt;
    parts.forEach((q, i) => {
      q.life -= dt;
      q.v.y -= 9 * dt;
      q.v.multiplyScalar(1 - 0.6 * dt);
      q.p.addScaledVector(q.v, dt);
      q.r.x += q.s.x * dt; q.r.y += q.s.y * dt; q.r.z += q.s.z * dt;
      dummy.position.copy(q.p);
      dummy.rotation.copy(q.r);
      dummy.scale.setScalar(q.life > 0 ? 1 : 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (active <= 0) mesh.visible = false;
  }
  return { burst, update };
}
