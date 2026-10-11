const KEY = 'tour-equilibre-v1';
const fresh = () => ({ stars: [0, 0, 0, 0] });

export function loadProgress(storage) {
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return fresh();
    const p = JSON.parse(raw);
    if (!p || !Array.isArray(p.stars)) return fresh();
    const stars = [0, 1, 2, 3].map((i) => {
      const v = Number(p.stars[i]);
      return Number.isFinite(v) ? Math.min(3, Math.max(0, Math.floor(v))) : 0;
    });
    return { stars };
  } catch { return fresh(); }
}
export function saveProgress(storage, progress) {
  try { storage.setItem(KEY, JSON.stringify(progress)); return true; } catch { return false; }
}
export function recordWin(progress, levelIndex, stars) {
  const s = progress.stars.slice();
  s[levelIndex] = Math.max(s[levelIndex] || 0, stars);
  return { stars: s };
}
export function isUnlocked(progress, levelIndex) {
  return levelIndex === 0 || (progress.stars[levelIndex - 1] || 0) > 0;
}
