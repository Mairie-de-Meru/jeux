import * as THREE from 'three';
import { tween, easeInOutSine, easeOutElastic, easeOutQuad, linear } from './anim.js';
import { hop } from './audio.js';

const bodyGeo = new THREE.CapsuleGeometry(0.32, 0.35, 6, 14);
const eyeGeo = new THREE.SphereGeometry(0.1, 12, 8);
const pupilGeo = new THREE.SphereGeometry(0.05, 10, 6);
const footGeo = new THREE.SphereGeometry(0.13, 10, 8);
const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
const pupilMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3 });

const COLORS = [0xff6b9a, 0x4cc9f0, 0xffb703];
const BASE_ROT = Math.PI / 4;

function makeCharacter(color) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  body.rotation.y = BASE_ROT;
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.5 });
  const torso = new THREE.Mesh(bodyGeo, mat);
  torso.position.y = 0.6;
  torso.castShadow = true;
  body.add(torso);
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.position.set(s * 0.14, 0.82, 0.27);
    const pupil = new THREE.Mesh(pupilGeo, pupilMat);
    pupil.position.set(s * 0.14, 0.82, 0.35);
    const foot = new THREE.Mesh(footGeo, mat);
    foot.position.set(s * 0.17, 0.1, 0.06);
    foot.scale.set(1, 0.7, 1.3);
    foot.castShadow = true;
    body.add(eye, pupil, foot);
  }
  root.add(body);
  return { root, body, busy: false, home: new THREE.Vector3() };
}

export function createCharacters(scene) {
  const list = COLORS.map((c) => makeCharacter(c));
  list.forEach((c) => scene.add(c.root));
  let half = 3;

  const homeFor = (i) => new THREE.Vector3(-half - 2.2 - i * 1.3, 0, [0.9, -0.9, 0.4][i]);
  const goalFor = (i) => new THREE.Vector3(half + 2.2 + i * 1.3, 0, [0.9, -0.9, 0.4][i]);

  function reset(n) {
    half = n / 2;
    list.forEach((c, i) => {
      c.home.copy(homeFor(i));
      c.root.position.copy(c.home);
      c.body.rotation.set(0, BASE_ROT, 0);
      c.body.scale.set(1, 1, 1);
      c.root.scale.set(0.01, 0.01, 0.01);
      tween(c.root.scale, { x: 1, y: 1, z: 1 }, 0.6, easeOutElastic, { delay: i * 0.12 });
    });
  }

  // Déplacement sautillant de c vers (x1, z1).
  function hopTo(c, x1, z1, dur, { startDelay = 0, spin = false, finalSpin = false } = {}) {
    const x0 = c.root.position.x, z0 = c.root.position.z;
    const hops = Math.max(2, Math.round(Math.abs(x1 - x0) / 1.1));
    let lastHop = -1;
    c.busy = true;
    const state = { p: 0 };
    return tween(state, { p: 1 }, dur, linear, {
      delay: startDelay,
      onUpdate: (p) => {
        const e = easeInOutSine(p);
        c.root.position.x = x0 + (x1 - x0) * e;
        c.root.position.z = z0 + (z1 - z0) * easeInOutSine(Math.min(1, p * 1.2));
        const ph = p * hops;
        const hopY = Math.abs(Math.sin(ph * Math.PI));
        c.root.position.y = hopY * (spin ? 0.5 : 0.3);
        const grounded = 1 - Math.min(1, hopY * 4);
        c.body.scale.set(1 + 0.14 * grounded, 1 - 0.16 * grounded + 0.08 * (1 - grounded), 1 + 0.14 * grounded);
        c.body.rotation.z = Math.sin(ph * Math.PI * 0.5) * (spin ? 0.25 : 0.1);
        const idx = Math.floor(ph);
        if (idx !== lastHop) { lastHop = idx; hop(); }
        if (finalSpin && p > 0.75) c.body.rotation.y = BASE_ROT + ((p - 0.75) / 0.25) * Math.PI * 4;
      },
    }).then(() => {
      c.root.position.y = 0;
      c.body.scale.set(1, 1, 1);
      c.body.rotation.set(0, BASE_ROT, 0);
      c.busy = false;
    });
  }

  async function shake(c) {
    c.busy = true;
    const o = c.body.rotation;
    for (const a of [0.7, -0.7, 0.5, -0.5, 0]) {
      await tween(o, { y: BASE_ROT + a }, 0.16, easeInOutSine);
    }
    o.y = BASE_ROT;
    c.busy = false;
  }

  async function celebrate() {
    const dur = 2.6 + half * 0.15;
    await Promise.all(list.map((c, i) => {
      const g = goalFor(i);
      return hopTo(c, g.x, g.z, dur, { startDelay: i * 0.35, spin: true, finalSpin: true });
    }));
    // petit saut final
    await Promise.all(list.map((c, i) => tween(c.root.position, { y: 0.6 }, 0.2, easeOutQuad, { delay: i * 0.1 })
      .then(() => tween(c.root.position, { y: 0 }, 0.25, easeInOutSine))));
  }

  // Le premier personnage avance jusqu'à x (limite du pont) puis secoue la tête et revient.
  async function blocked(xStop) {
    const c = list[0];
    const x = Math.max(xStop, -half - 0.6);
    await hopTo(c, x, 0, 1.0 + Math.abs(x - c.home.x) * 0.12);
    await shake(c);
    await hopTo(c, c.home.x, c.home.z, 0.9);
  }

  async function shakeHome() {
    const c = list[0];
    await hopTo(c, c.home.x + 1.0, c.home.z, 0.5);
    await shake(c);
    await hopTo(c, c.home.x, c.home.z, 0.5);
  }

  function update(t) {
    list.forEach((c, i) => {
      if (c.busy) return;
      const k = 1 + Math.sin(t * 2.4 + i * 1.7) * 0.02;
      c.body.scale.set(1 / k, k, 1 / k);
    });
  }

  return { list, reset, celebrate, blocked, shakeHome, update };
}

// Confettis : une seule InstancedMesh, une géométrie partagée.
export function createConfetti(scene) {
  const MAX = 160;
  const geo = new THREE.BoxGeometry(0.2, 0.04, 0.12);
  const mesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness: 0.6 }), MAX);
  mesh.frustumCulled = false;
  const dummy = new THREE.Object3D();
  const palette = [0xff5d73, 0xffd93b, 0x4cc9f0, 0x8fdc6a, 0xc25bd6, 0xff8a1f].map((c) => new THREE.Color(c));
  const parts = Array.from({ length: MAX }, () => ({ life: 0, p: new THREE.Vector3(), v: new THREE.Vector3(), r: new THREE.Vector3(), rv: new THREE.Vector3() }));
  parts.forEach((q, i) => {
    mesh.setColorAt(i, palette[i % palette.length]);
    dummy.scale.set(0, 0, 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  });
  scene.add(mesh);
  let cursor = 0;

  function burst(cx, count = 80) {
    for (let i = 0; i < count; i++) {
      const q = parts[cursor++ % MAX];
      q.life = 2.2 + Math.random() * 1.2;
      q.p.set(cx + (Math.random() - 0.5) * 6, 5 + Math.random() * 3, (Math.random() - 0.5) * 3);
      q.v.set((Math.random() - 0.5) * 2, -Math.random() * 2, (Math.random() - 0.5) * 1);
      q.r.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
      q.rv.set((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10);
    }
  }

  function update(dt) {
    let any = false;
    parts.forEach((q, i) => {
      if (q.life <= 0) return;
      any = true;
      q.life -= dt;
      q.v.y -= 3.5 * dt;
      q.v.y = Math.max(q.v.y, -3);
      q.p.addScaledVector(q.v, dt);
      q.r.addScaledVector(q.rv, dt);
      dummy.position.copy(q.p);
      dummy.rotation.set(q.r.x, q.r.y, q.r.z);
      const s = q.life > 0 && q.p.y > -0.4 ? 1 : 0;
      if (!s) q.life = 0;
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    if (any) mesh.instanceMatrix.needsUpdate = true;
  }

  function clear() {
    parts.forEach((q, i) => {
      q.life = 0;
      dummy.scale.set(0, 0, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }

  return { burst, update, clear };
}
