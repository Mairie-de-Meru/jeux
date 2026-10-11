// Vitesse adaptative du tapis roulant (unités/s).
export const SPEED = { min: 0.6, start: 1.0, max: 2.2 };
const FACTEURS = { correct: 1.08, erreur: 0.85, rate: 0.8 };

export function nextSpeed(speed, event) {
  const f = FACTEURS[event] ?? 1;
  return Math.min(SPEED.max, Math.max(SPEED.min, speed * f));
}
