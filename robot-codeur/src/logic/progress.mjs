// Progression (pure). La persistance localStorage est faite côté UI.
export function emptyProgress() {
  return { stars: {} };
}

export function normalize(raw) {
  const out = emptyProgress();
  if (raw && typeof raw === 'object' && raw.stars && typeof raw.stars === 'object') {
    for (const [k, v] of Object.entries(raw.stars)) {
      const n = Number(v);
      if (Number.isInteger(n) && n >= 1 && n <= 3) out.stars[k] = n;
    }
  }
  return out;
}

export function recordWin(progress, levelId, nStars) {
  const prev = progress.stars[levelId] ?? 0;
  return { stars: { ...progress.stars, [levelId]: Math.max(prev, nStars) } };
}

// Niveau 1 toujours ouvert ; niveau n ouvert si n-1 gagné. `all` ouvre tout.
export function isUnlocked(progress, levelId, all = false) {
  if (all || levelId <= 1) return true;
  return (progress.stars[levelId - 1] ?? 0) > 0;
}

export function unlockState(progress, total, all = false) {
  const res = [];
  for (let id = 1; id <= total; id++) {
    res.push({ id, unlocked: isUnlocked(progress, id, all), stars: progress.stars[id] ?? 0 });
  }
  return res;
}
