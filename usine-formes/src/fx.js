// Easing maison, gestionnaire de tweens, squash & stretch, confettis.
import * as THREE from 'three';

export const ease = {
  linear: (t) => t,
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  outBack: (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  outElastic: (t) => (t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / 3) + 1),
};

class Tweens {
  constructor() { this.list = []; }
  add({ dur = 0.3, delay = 0, ease: e = ease.outCubic, update, done }) {
    const tw = { t: -delay, dur, e, update, done, dead: false };
    this.list.push(tw);
    return tw;
  }
  cancel(tw) { if (tw) tw.dead = true; }
  update(dt) {
    const l = this.list;
    for (let i = 0; i < l.length; i++) {
      const tw = l[i];
      if (tw.dead) continue;
      tw.t += dt;
      if (tw.t < 0) continue;
      const k = Math.min(tw.t / tw.dur, 1);
      if (tw.update) tw.update(tw.e(k), k);
      if (k >= 1) { tw.dead = true; if (tw.done) tw.done(); }
    }
    let j = 0;
    for (let i = 0; i < l.length; i++) if (!l[i].dead) l[j++] = l[i];
    l.length = j;
  }
  clear() { this.list.length = 0; }
}
export const tweens = new Tweens();

export const wait = (delay, done) => tweens.add({ dur: 0.0001, delay, done });

// Squash & stretch décroissant sur l'échelle courante.
export function squash(obj, amount = 0.3, dur = 0.5) {
  const bx = obj.scale.x, by = obj.scale.y, bz = obj.scale.z;
  tweens.add({
    dur, ease: ease.linear,
    update: (_, k) => {
      const s = Math.sin(k * Math.PI * 3) * (1 - k) * amount;
      obj.scale.set(bx * (1 - s * 0.5), by * (1 + s), bz * (1 - s * 0.5));
    },
    done: () => obj.scale.set(bx, by, bz),
  });
}

export function popIn(obj, dur = 0.45, delay = 0) {
  const bx = obj.scale.x, by = obj.scale.y, bz = obj.scale.z;
  obj.scale.set(0.001, 0.001, 0.001);
  tweens.add({ dur, delay, ease: ease.outBack, update: (t) => obj.scale.set(bx * t, by * t, bz * t) });
}

export function shrinkOut(obj, dur = 0.25, done) {
  const bx = obj.scale.x, by = obj.scale.y, bz = obj.scale.z;
  tweens.add({ dur, update: (t) => { const s = Math.max(0.001, 1 - t); obj.scale.set(bx * s, by * s, bz * s); }, done });
}

// Dandinement (rotation z) qui restitue l'état initial.
export function wiggle(obj, amp = 0.25, dur = 0.5) {
  const r0 = obj.rotation.z;
  tweens.add({
    dur, ease: ease.linear,
    update: (_, k) => { obj.rotation.z = r0 + Math.sin(k * Math.PI * 6) * (1 - k) * amp; },
    done: () => { obj.rotation.z = r0; },
  });
}

// Petit saut sur place (y relatif).
export function hop(obj, h = 0.6, dur = 0.5, done) {
  const y0 = obj.position.y;
  tweens.add({
    dur, ease: ease.linear,
    update: (_, k) => { obj.position.y = y0 + Math.sin(k * Math.PI) * h; },
    done: () => { obj.position.y = y0; if (done) done(); },
  });
}

// Vol en arc de la position courante vers `target`.
export function flyTo(obj, target, dur = 0.55, arc = 2, done) {
  const sx = obj.position.x, sy = obj.position.y, sz = obj.position.z;
  tweens.add({
    dur, ease: ease.inOutQuad,
    update: (t) => {
      obj.position.set(sx + (target.x - sx) * t, sy + (target.y - sy) * t + Math.sin(t * Math.PI) * arc, sz + (target.z - sz) * t);
    },
    done: () => { obj.position.copy(target); if (done) done(); },
  });
}

// Confettis et étincelles : un seul nuage de points réutilisé.
const CONF_COLORS = [0xff5a5f, 0x3d8bff, 0xffc928, 0x3ccf6e, 0xff9a3c, 0xb06bff];
export function createConfetti(scene, max = 260) {
  const pos = new Float32Array(max * 3), col = new Float32Array(max * 3);
  const vel = new Float32Array(max * 3), life = new Float32Array(max);
  for (let i = 0; i < max; i++) pos[i * 3 + 1] = -100;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({ size: 0.22, vertexColors: true, depthTest: false, transparent: true });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  pts.renderOrder = 999;
  scene.add(pts);
  const c = new THREE.Color();
  let next = 0;
  return {
    burst(origin, n = 80, { speed = 6, up = 4, colors = CONF_COLORS, life: L = 1.6 } = {}) {
      for (let k = 0; k < n; k++) {
        const i = next; next = (next + 1) % max;
        pos[i * 3] = origin.x; pos[i * 3 + 1] = origin.y; pos[i * 3 + 2] = origin.z;
        const a = Math.random() * Math.PI * 2, s = speed * (0.3 + Math.random() * 0.7);
        vel[i * 3] = Math.cos(a) * s; vel[i * 3 + 1] = up * (0.4 + Math.random()); vel[i * 3 + 2] = Math.sin(a) * s * 0.6;
        c.setHex(colors[(Math.random() * colors.length) | 0]);
        col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
        life[i] = L * (0.6 + Math.random() * 0.4);
      }
    },
    sparkle(origin) { this.burst(origin, 22, { speed: 3, up: 2.5, colors: [0xffe14d, 0xffffff, 0xffc928], life: 0.8 }); },
    update(dt) {
      let any = false;
      for (let i = 0; i < max; i++) {
        if (life[i] <= 0) continue;
        any = true;
        life[i] -= dt;
        if (life[i] <= 0) { pos[i * 3 + 1] = -100; continue; }
        vel[i * 3 + 1] -= 9 * dt;
        pos[i * 3] += vel[i * 3] * dt; pos[i * 3 + 1] += vel[i * 3 + 1] * dt; pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
      }
      if (any) geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate = any;
    },
  };
}
