// Étoiles et progression.
export function starsFor(errors) {
  if (errors <= 1) return 3;
  if (errors <= 3) return 2;
  return 1;
}

export function mergeBest(progress, levelId, stars) {
  const ancien = (progress && progress[levelId]) || 0;
  return { ...progress, [levelId]: Math.max(ancien, stars) };
}
