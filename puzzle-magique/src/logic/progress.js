// Progression et galerie, sérialisables en JSON (le stockage est dans main.js).
import { LEVELS } from './levels.js';

export function defaultProgress() { return { unlocked: 1, best: {}, gallery: [] }; }

export function isUnlocked(p, level) { return level < p.unlocked; }

export function recordWin(p, level, imageId, stars) {
  const next = {
    unlocked: Math.max(p.unlocked, Math.min(level + 2, LEVELS.length)),
    best: { ...p.best },
    gallery: p.gallery.map((g) => ({ ...g })),
  };
  const key = `${level}:${imageId}`;
  next.best[key] = Math.max(next.best[key] || 0, stars);
  const g = next.gallery.find((x) => x.level === level && x.imageId === imageId);
  if (g) g.stars = Math.max(g.stars, stars);
  else next.gallery.push({ level, imageId, stars });
  return next;
}

export function bestStarsForLevel(p, level) {
  let m = 0;
  for (const k of Object.keys(p.best)) if (k.startsWith(level + ':')) m = Math.max(m, p.best[k]);
  return m;
}

export function serialize(p) { return JSON.stringify(p); }

export function deserialize(str) {
  const def = defaultProgress();
  let o;
  try { o = typeof str === 'string' ? JSON.parse(str) : str; } catch { return def; }
  if (!o || typeof o !== 'object') return def;
  const unlocked = Number.isFinite(o.unlocked) ? Math.min(LEVELS.length, Math.max(1, Math.floor(o.unlocked))) : 1;
  const best = {};
  if (o.best && typeof o.best === 'object') {
    for (const [k, v] of Object.entries(o.best)) if (Number.isFinite(v) && v >= 1 && v <= 3) best[k] = Math.floor(v);
  }
  const gallery = [];
  if (Array.isArray(o.gallery)) {
    for (const g of o.gallery) {
      if (!g || typeof g.imageId !== 'string' || !Number.isInteger(g.level) || g.level < 0 || g.level >= LEVELS.length) continue;
      if (gallery.some((x) => x.level === g.level && x.imageId === g.imageId)) continue;
      gallery.push({ level: g.level, imageId: g.imageId, stars: Math.min(3, Math.max(1, Math.floor(g.stars) || 1)) });
    }
  }
  return { unlocked, best, gallery };
}
