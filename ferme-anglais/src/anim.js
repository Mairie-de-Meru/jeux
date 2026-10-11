// Animations maison : easing, tween, squash & stretch, wiggle. Aucune dépendance (travaille sur des objets avec scale/rotation/position).
export const ease = {
  linear: (t) => t,
  outQuad: (t) => 1 - (1 - t) * (1 - t),
  inOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  outBack: (t) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
};

const active = [];

// tween({ dur (s), delay (s), ease, update(t), done() }) -> handle { cancel() }
export function tween({ dur = 0.4, delay = 0, easing = ease.linear, update, done }) {
  const tw = { t: -delay, dur, easing, update, done, dead: false, cancel() { this.dead = true; } };
  active.push(tw);
  return tw;
}

export function tick(dt) {
  for (let i = active.length - 1; i >= 0; i--) {
    const tw = active[i];
    if (tw.dead) {
      active.splice(i, 1);
      continue;
    }
    tw.t += dt;
    if (tw.t < 0) continue;
    const k = Math.min(1, tw.t / tw.dur);
    if (tw.update) tw.update(tw.easing(k));
    if (k >= 1) {
      active.splice(i, 1);
      if (tw.done) tw.done();
    }
  }
}

export function clearAll() {
  active.length = 0;
}

// Apparition en rebond.
export function popIn(obj, base = 1, delay = 0) {
  obj.scale.setScalar(0.0001);
  return tween({
    dur: 0.3, delay, easing: ease.outBack,
    update: (k) => obj.scale.setScalar(Math.max(0.0001, base * k)),
    done: () => obj.scale.setScalar(base),
  });
}

// Squash & stretch avec petit saut (bonne réponse, écoute).
export function squash(obj, base = 1, jump = 0.5) {
  const y0 = obj.position.y;
  return tween({
    dur: 0.7,
    update: (k) => {
      const f = Math.sin(k * Math.PI * 3) * (1 - k);
      obj.scale.set(base * (1 - 0.22 * f), base * (1 + 0.4 * f), base * (1 - 0.22 * f));
      obj.position.y = y0 + Math.abs(Math.sin(k * Math.PI * 2)) * jump * (1 - k);
    },
    done: () => {
      obj.scale.setScalar(base);
      obj.position.y = y0;
    },
  });
}

// Petit balancement (mauvaise réponse : doux, jamais punitif).
export function wiggle(obj) {
  const r0 = obj.rotation.z;
  return tween({
    dur: 0.55,
    update: (k) => {
      obj.rotation.z = r0 + Math.sin(k * Math.PI * 6) * 0.22 * (1 - k);
    },
    done: () => {
      obj.rotation.z = r0;
    },
  });
}

// Pulsation en boucle (halo) ; retourne un handle avec cancel().
export function pulse(obj, base = 1, amp = 0.12, speed = 4) {
  const t0 = Date.now();
  const tw = tween({
    dur: 1e9,
    update: () => obj.scale.setScalar(base * (1 + Math.sin(((Date.now() - t0) / 1000) * speed) * amp)),
  });
  return {
    cancel() {
      tw.cancel();
      obj.scale.setScalar(base);
    },
  };
}
