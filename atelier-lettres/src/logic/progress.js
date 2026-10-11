// Étoiles et paliers débloqués. Sérialisable en JSON ; la persistance est hors de logic/.
export function starsFor(hints) {
  if (hints <= 0) return 3;
  return hints <= 2 ? 2 : 1;
}

export function createProgress(saved) {
  const p = { tracer: {}, paires: {}, phrase: {} };
  if (saved && typeof saved === 'object') {
    for (const a of Object.keys(p)) {
      const src = saved[a];
      if (src && typeof src === 'object') {
        for (const [k, v] of Object.entries(src)) {
          if (Number.isFinite(v) && v >= 0 && v <= 3) p[a][k] = v;
        }
      }
    }
  }
  return p;
}

export function recordRound(progress, atelier, level, stars) {
  if (!progress[atelier]) progress[atelier] = {};
  progress[atelier][level] = Math.max(progress[atelier][level] || 0, stars);
  return progress;
}

export function getStars(progress, atelier, level) {
  return (progress[atelier] && progress[atelier][level]) || 0;
}

export function isUnlocked(progress, atelier, level) {
  if (level <= 1) return true;
  return getStars(progress, atelier, level - 1) >= 1;
}
