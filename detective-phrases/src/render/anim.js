// Petites fonctions d'easing et gestionnaire d'animations (sans dépendance).
export const easeOutQuad = (t) => 1 - (1 - t) * (1 - t);
export const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOutBack = (t) => {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

// Gestionnaire : chaque animation reçoit sa progression 0..1.
export function creerAnims() {
  const liste = [];
  return {
    ajouter(duree, fn, fin) {
      liste.push({ t: 0, duree, fn, fin });
    },
    maj(dt) {
      for (let i = liste.length - 1; i >= 0; i--) {
        const a = liste[i];
        a.t += dt;
        const p = Math.min(1, a.t / a.duree);
        a.fn(p);
        if (p >= 1) {
          liste.splice(i, 1);
          if (a.fin) a.fin();
        }
      }
    },
  };
}

// Squash & stretch : renvoie [sx, sy, sz] pour une progression p (écrase, étire, revient).
export function squash(p, force = 0.25) {
  const s = Math.sin(p * Math.PI * 2) * Math.exp(-2.2 * p) * force;
  return [1 + s, 1 - s * 1.2, 1 + s];
}
