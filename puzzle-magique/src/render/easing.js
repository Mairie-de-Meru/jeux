// Easing et mini-moteur de tweens maison (mis à jour par la boucle principale).
export const easeOutCubic = (k) => 1 - Math.pow(1 - k, 3);
export const easeInOutQuad = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
export const easeOutBack = (k) => {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2);
};
export const lerp = (a, b, k) => a + (b - a) * k;

let active = [];

export function tween({ duration, ease = easeOutCubic, update, done, delay = 0 }) {
  const t = { t: -delay, duration, ease, update, done, dead: false };
  active.push(t);
  return t;
}
export function cancelTween(t) { if (t) t.dead = true; }
export function clearTweens() { for (const t of active) t.dead = true; active = []; }

export function updateTweens(dt) {
  const list = active;
  for (const t of list) {
    if (t.dead) continue;
    t.t += dt;
    if (t.t < 0) continue;
    const k = Math.min(1, t.t / t.duration);
    t.update && t.update(t.ease(k), k);
    if (k >= 1) { t.dead = true; t.done && t.done(); }
  }
  active = active.filter((t) => !t.dead);
}

// Anime des propriétés numériques d'un objet vers des valeurs cibles.
export function animate(obj, props, duration, ease = easeOutCubic, done) {
  const from = {};
  for (const k of Object.keys(props)) from[k] = obj[k];
  return tween({
    duration, ease, done,
    update: (e) => { for (const k of Object.keys(props)) obj[k] = lerp(from[k], props[k], e); },
  });
}

// Squash & stretch : écrase puis étire, revient à l'échelle de base.
export function squash(obj, amount = 0.25, duration = 0.4, base = 1) {
  return tween({
    duration, ease: (k) => k,
    update: (k) => {
      const w = Math.sin(k * Math.PI * 2) * Math.pow(1 - k, 1.5) * amount;
      obj.scale.set(base * (1 + w), base * (1 + w), base * (1 - w * 1.2));
    },
    done: () => obj.scale.set(base, base, base),
  });
}
