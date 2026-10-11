const STEPS = 16;
const LAG = 0.8; // retard angulaire du bord libre à mi-course (rad, < 1)

// Feuille articulée sur la reliure (x = 0). L'angle de la feuille à l'abscisse
// curviligne s vaut π·progress, diminué d'un retard croissant vers le bord libre.
// `v` est transmis tel quel dans `y`.
export function curlPoint(u, v, progress, width) {
  const base = Math.PI * progress;
  const lag = LAG * Math.sin(base);
  let x = 0;
  let z = 0;
  const ds = u / STEPS;
  for (let k = 0; k < STEPS; k++) {
    const angle = base - lag * (k + 0.5) * ds;
    x += Math.cos(angle) * ds * width;
    z += Math.sin(angle) * ds * width;
  }
  return { x, y: v, z: Math.max(0, z) };
}
