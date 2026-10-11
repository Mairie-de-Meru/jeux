// Animations maison : easing + petit gestionnaire de tweens (pas de dépendance).
export const flags = { fast: false };

export const ease = {
  linear: (t) => t,
  outQuad: (t) => 1 - (1 - t) * (1 - t),
  inOut: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  outBack: (t) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
};

const list = [];

// Lance une animation de `ms` millisecondes ; fn(t) reçoit t easing appliqué (0 -> 1).
export function tween(ms, fn, easing = ease.inOut) {
  return new Promise((resolve) => {
    if (flags.fast || ms <= 0) { fn(1); resolve(); return; }
    list.push({ t: 0, ms, fn, easing, resolve });
  });
}

export function wait(ms) {
  return tween(ms, () => {}, ease.linear);
}

export function tick(dtMs) {
  for (let i = list.length - 1; i >= 0; i--) {
    const a = list[i];
    a.t = Math.min(a.ms, a.t + dtMs);
    const k = a.t / a.ms;
    a.fn(a.easing(k));
    if (a.t >= a.ms) { list.splice(i, 1); a.resolve(); }
  }
}

// Termine immédiatement toutes les animations en cours.
export function finishAll() {
  while (list.length) {
    const a = list.shift();
    a.fn(1);
    a.resolve();
  }
}
