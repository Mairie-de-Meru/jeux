import { LEVELS, NB_MANCHES } from './levels.js';

// État : { v:1, levels: { [id]: [étoiles par manche, 0 = non faite] } }
export function createProgress() {
  return { v: 1, levels: {} };
}

export function recordRound(progress, levelId, roundIndex, stars) {
  const prev = progress.levels[levelId] || new Array(NB_MANCHES).fill(0);
  const arr = prev.slice();
  arr[roundIndex] = Math.max(arr[roundIndex] || 0, stars);
  return { ...progress, levels: { ...progress.levels, [levelId]: arr } };
}

export function levelStars(progress, levelId) {
  return (progress.levels[levelId] || []).reduce((a, b) => a + b, 0);
}

export function totalStars(progress) {
  return LEVELS.reduce((s, l) => s + levelStars(progress, l.id), 0);
}

export function isLevelComplete(progress, levelId) {
  const arr = progress.levels[levelId] || [];
  return arr.length >= NB_MANCHES && arr.slice(0, NB_MANCHES).every((s) => s > 0);
}

export function isUnlocked(progress, levelId) {
  return levelId <= 1 || isLevelComplete(progress, levelId - 1);
}

export function serialize(progress) {
  return JSON.stringify(progress);
}

export function deserialize(text) {
  try {
    const raw = JSON.parse(text);
    if (!raw || typeof raw !== 'object' || !raw.levels || typeof raw.levels !== 'object') return createProgress();
    const out = createProgress();
    for (const [id, arr] of Object.entries(raw.levels)) {
      if (!Array.isArray(arr)) continue;
      out.levels[id] = Array.from({ length: NB_MANCHES }, (_, i) => {
        const s = Number(arr[i]);
        return s >= 1 && s <= 3 ? Math.floor(s) : 0;
      });
    }
    return out;
  } catch {
    return createProgress();
  }
}
