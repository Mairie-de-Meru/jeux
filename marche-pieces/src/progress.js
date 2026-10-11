// Progression : tirelire et paliers terminés. Pur et sérialisable.
export function createProgress() {
  return { piggyStars: 0, best: {}, done: {} };
}

export function addStars(progress, levelId, stars) {
  return { ...progress, piggyStars: progress.piggyStars + stars, best: { ...progress.best }, done: { ...progress.done } };
}

// Fin d'un palier : `runStars` = étoiles gagnées sur la partie.
export function completeLevel(progress, levelId, runStars) {
  const prev = progress.best[levelId] || 0;
  return {
    ...progress,
    best: { ...progress.best, [levelId]: Math.max(prev, runStars) },
    done: { ...progress.done, [levelId]: true },
  };
}

export function isCompleted(progress, levelId) {
  return !!progress.done[levelId];
}

export function serialize(progress) {
  return JSON.stringify(progress);
}

export function deserialize(text) {
  try {
    const o = JSON.parse(text);
    if (!o || typeof o !== 'object') return createProgress();
    const piggyStars = Number.isFinite(o.piggyStars) && o.piggyStars >= 0 ? Math.floor(o.piggyStars) : 0;
    const best = {};
    const done = {};
    for (const id of [1, 2, 3, 4]) {
      if (o.best && Number.isFinite(o.best[id]) && o.best[id] >= 0) best[id] = Math.floor(o.best[id]);
      if (o.done && o.done[id] === true) done[id] = true;
    }
    return { piggyStars, best, done };
  } catch {
    return createProgress();
  }
}
