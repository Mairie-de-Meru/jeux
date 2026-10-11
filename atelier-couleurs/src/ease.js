// Fonctions d'easing maison (pas de lib de tween).
export const clamp01 = (t) => Math.min(1, Math.max(0, t));
export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
export const easeInOutQuad = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
export const easeOutBack = (t) => {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
export const easeInQuad = (t) => t * t;
// Squash & stretch : oscillation amortie autour de 1.
export const wobble = (t, amp = 0.35) => 1 + amp * Math.sin(t * Math.PI * 4) * Math.pow(1 - clamp01(t), 2);

// Petit gestionnaire d'animations : chaque tâche reçoit (dt, tempsÉcoulé) et renvoie true quand elle est finie.
export function createAnimator() {
  const tasks = [];
  return {
    add(fn) { tasks.push({ fn, t: 0 }); },
    update(dt) {
      for (let i = tasks.length - 1; i >= 0; i--) {
        const k = tasks[i];
        k.t += dt;
        if (k.fn(dt, k.t)) tasks.splice(i, 1);
      }
    },
    // Anime de 0 à 1 sur `duree` secondes.
    tween(duree, onUpdate, onEnd) {
      this.add((dt, t) => {
        const p = clamp01(t / duree);
        onUpdate(p);
        if (p >= 1) { if (onEnd) onEnd(); return true; }
        return false;
      });
    },
  };
}
