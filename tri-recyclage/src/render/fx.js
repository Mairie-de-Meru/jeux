import * as THREE from 'three';

// Easing maison (pas de bibliothèque de tween).
export const ease = {
  linear: (t) => t,
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inQuad: (t) => t * t,
  inOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  outBack: (t) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  outBounce: (t) => {
    const n = 7.5625, d = 2.75;
    if (t < 1 / d) return n * t * t;
    if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
    if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
    return n * (t -= 2.625 / d) * t + 0.984375;
  },
};

// Gestionnaire de tweens : add(durée, fn(t 0..1), onDone, délai)
export class Tweens {
  constructor() { this.list = []; }
  add(dur, fn, done, delay = 0) {
    this.list.push({ dur: Math.max(dur, 1e-4), fn, done, delay, t: 0 });
  }
  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const tw = this.list[i];
      if (tw.delay > 0) { tw.delay -= dt; continue; }
      tw.t += dt;
      const k = Math.min(tw.t / tw.dur, 1);
      tw.fn(k);
      if (k >= 1) {
        this.list.splice(i, 1);
        if (tw.done) tw.done();
      }
    }
  }
  clear() { this.list.length = 0; }
}

// Squash & stretch : s>0 étire en hauteur, s<0 écrase (volume conservé).
export function squash(obj, s) {
  const y = 1 + s;
  const xz = 1 / Math.sqrt(Math.max(y, 0.2));
  obj.scale.set(xz, y, xz);
}

// Confettis : un seul InstancedMesh réutilisé.
export class Confetti {
  constructor(scene, max = 260) {
    this.max = max;
    const geo = new THREE.PlaneGeometry(0.16, 0.24);
    const mat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
    this.mesh = new THREE.InstancedMesh(geo, mat, max);
    this.mesh.frustumCulled = false;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.p = Array.from({ length: max }, () => ({ life: 0, pos: new THREE.Vector3(), vel: new THREE.Vector3(), rot: new THREE.Vector3(), spin: new THREE.Vector3() }));
    this.cursor = 0;
    this.dummy = new THREE.Object3D();
    this.color = new THREE.Color();
    const palette = ['#FFD23F', '#3BB273', '#3E8EDE', '#E94F37', '#FF8FC7', '#9B5DE5'];
    this.palette = palette;
    for (let i = 0; i < max; i++) {
      this.mesh.setColorAt(i, this.color.set(palette[i % palette.length]));
      this.dummy.scale.setScalar(0);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }
    scene.add(this.mesh);
  }
  burst(origin, n = 30, power = 4) {
    for (let k = 0; k < n; k++) {
      const p = this.p[this.cursor];
      this.cursor = (this.cursor + 1) % this.max;
      p.life = 1.6 + Math.random() * 0.8;
      p.pos.copy(origin);
      p.vel.set((Math.random() - 0.5) * power * 1.6, 2 + Math.random() * power, (Math.random() - 0.3) * power);
      p.rot.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
      p.spin.set((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12);
    }
  }
  update(dt) {
    let any = false;
    for (let i = 0; i < this.max; i++) {
      const p = this.p[i];
      if (p.life <= 0) continue;
      any = true;
      p.life -= dt;
      p.vel.y -= 7 * dt;
      p.vel.multiplyScalar(1 - 0.6 * dt);
      p.pos.addScaledVector(p.vel, dt);
      p.rot.addScaledVector(p.spin, dt);
      this.dummy.position.copy(p.pos);
      this.dummy.rotation.set(p.rot.x, p.rot.y, p.rot.z);
      this.dummy.scale.setScalar(p.life > 0.3 ? 1 : Math.max(p.life / 0.3, 0));
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }
    if (any) this.mesh.instanceMatrix.needsUpdate = true;
  }
}
