// Easing maison, gestionnaire d'animations, squash & stretch, confettis.
import * as THREE from 'three';

export const easeOutBack = (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
export const easeInOutQuad = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
export const easeOutQuad = (t) => 1 - (1 - t) * (1 - t);

// Gestionnaire d'animations : fn(p, dt) avec p dans [0,1] ; renvoyer false annule.
export class Tweens {
  constructor() { this.list = []; }
  add(dur, fn, onDone, delay = 0) { this.list.push({ t: -delay, dur, fn, onDone }); }
  update(dt) {
    for (const a of this.list) {
      a.t += dt;
      if (a.t < 0) continue;
      const p = Math.min(1, a.t / a.dur);
      if (a.fn(p) === false) { a.dead = true; continue; }
      if (p >= 1) { a.dead = true; if (a.onDone) a.onDone(); }
    }
    this.list = this.list.filter((a) => !a.dead);
  }
}

// Échelle « squash & stretch » : écrasé puis étiré puis retour à 1 (p dans [0,1]).
export function squashScale(p, amount = 0.3) {
  const w = Math.sin(p * Math.PI * 3) * (1 - p) * amount;
  return { y: 1 - w, xz: 1 + w * 0.6 };
}

export function applySquash(obj, base, p, amount) {
  const s = squashScale(p, amount);
  obj.scale.set(base * s.xz, base * s.y, base * s.xz);
}

// Confettis : un seul InstancedMesh réutilisé.
export function createConfetti(scene) {
  const N = 140;
  const geo = new THREE.BoxGeometry(0.16, 0.04, 0.1);
  const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const mesh = new THREE.InstancedMesh(geo, mat, N);
  mesh.frustumCulled = false;
  mesh.visible = false;
  scene.add(mesh);
  const colors = [0xff5a5f, 0xffc233, 0x3ddc84, 0x4da3ff, 0xc77dff, 0xff8fd0];
  const parts = Array.from({ length: N }, () => ({ p: new THREE.Vector3(), v: new THREE.Vector3(), r: new THREE.Euler(), vr: new THREE.Vector3(), life: 0 }));
  const col = new THREE.Color();
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const one = new THREE.Vector3(1, 1, 1);
  let active = 0;
  parts.forEach((_, i) => { mesh.setColorAt(i, col.setHex(colors[i % colors.length])); });
  return {
    burst(origin) {
      mesh.visible = true;
      active = 2.2;
      parts.forEach((q0) => {
        q0.p.copy(origin);
        q0.v.set((Math.random() - 0.5) * 9, 5 + Math.random() * 6, (Math.random() - 0.5) * 6);
        q0.vr.set(Math.random() * 10, Math.random() * 10, Math.random() * 10);
        q0.life = 1.6 + Math.random() * 0.6;
      });
    },
    update(dt) {
      if (active <= 0) return;
      active -= dt;
      parts.forEach((a, i) => {
        a.life -= dt;
        if (a.life > 0) {
          a.v.y -= 14 * dt;
          a.p.addScaledVector(a.v, dt);
          a.r.x += a.vr.x * dt; a.r.y += a.vr.y * dt; a.r.z += a.vr.z * dt;
          q.setFromEuler(a.r);
          m.compose(a.p, q, one);
        } else {
          m.makeScale(0, 0, 0);
        }
        mesh.setMatrixAt(i, m);
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (active <= 0) mesh.visible = false;
    },
  };
}

// Géométrie d'étoile partagée.
let starGeo = null;
export function getStarGeometry() {
  if (starGeo) return starGeo;
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 0.5 : 0.22;
    const a = Math.PI / 2 + (i * Math.PI) / 5;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    if (i === 0) s.moveTo(x, y); else s.lineTo(x, y);
  }
  s.closePath();
  starGeo = new THREE.ExtrudeGeometry(s, { depth: 0.14, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 2 });
  starGeo.center();
  return starGeo;
}
