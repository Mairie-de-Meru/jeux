export const ACTIVITIES = ['plante', 'cycle', 'saison'];

export function createProgress() {
  const stars = {};
  for (const a of ACTIVITIES) for (let l = 1; l <= 3; l++) stars[`${a}-${l}`] = 0;
  return { stars };
}

export function starsFor(errors) {
  if (errors <= 0) return 3;
  if (errors <= 2) return 2;
  return 1;
}

export function recordWin(progress, activity, level, errors) {
  const key = `${activity}-${level}`;
  const s = starsFor(errors);
  return { ...progress, stars: { ...progress.stars, [key]: Math.max(progress.stars[key] || 0, s) } };
}

export function isUnlocked(progress, activity, level) {
  if (level <= 1) return true;
  return (progress.stars[`${activity}-${level - 1}`] || 0) >= 1;
}
