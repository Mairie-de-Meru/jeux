// Mini moteur d'animation maison : easings + tweens basés sur le temps, annulables.
export const ease = {
  linear: (t) => t,
  inOut: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  out: (t) => 1 - (1 - t) * (1 - t),
  in: (t) => t * t,
  outBack: (t) => { const c1 = 1.70158; const c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  outElastic: (t) => (t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -9 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1),
};

export const lerp = (a, b, t) => a + (b - a) * t;

export class Animator {
  constructor() {
    this.tweens = new Set();
    this.speed = 1;
  }

  // Lance un tween de `duration` secondes (divisé par speed) ; fn reçoit t dans [0,1].
  run(duration, fn) {
    return new Promise((resolve) => {
      this.tweens.add({ elapsed: 0, duration: Math.max(0.0001, duration), fn, resolve });
    });
  }

  wait(duration) { return this.run(duration, () => {}); }

  update(dt) {
    for (const tw of [...this.tweens]) {
      tw.elapsed += dt * this.speed;
      const t = Math.min(1, tw.elapsed / tw.duration);
      tw.fn(t);
      if (t >= 1) {
        this.tweens.delete(tw);
        tw.resolve();
      }
    }
  }

  // Annule toutes les animations en cours. Les promesses restent volontairement en attente :
  // le code qui les attendait s'arrête net (il ne peut pas relancer d'animation après une remise à zéro).
  cancelAll() {
    this.tweens.clear();
  }
}
