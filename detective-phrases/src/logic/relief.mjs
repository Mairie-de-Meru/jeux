// Relief du terrain (pur) : village plat au centre, collines douces au-delà.
export const RAYON_PLAT = 15.5;
export const RAYON_COLLINES = 24;

const lisse = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// Distance « elliptique » au centre : le village est plus large que profond.
export const distanceVillage = (x, z) => Math.hypot(x / 1.25, z);

export function hauteur(x, z) {
  const d = distanceVillage(x, z);
  const bord = lisse(RAYON_PLAT, RAYON_COLLINES, d);
  if (bord === 0) return 0;
  const ondes = Math.sin(x * 0.35) * Math.cos(z * 0.3) * 0.5 + Math.sin(x * 0.13 + z * 0.21) * 1.2 + 1.8;
  return bord * (ondes * 1.3 + (d - RAYON_PLAT) * 0.05);
}
