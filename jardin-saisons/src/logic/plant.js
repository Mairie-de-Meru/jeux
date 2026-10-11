export const STAGES = ['graine', 'germe', 'pousse', 'fleur', 'fruit'];

// Table des besoins par niveau puis par stade (stade courant 0..3 → passage au suivant).
const TABLE = {
  1: [[1, 0], [1, 0], [1, 0], [1, 0]],
  2: [[1, 1], [1, 1], [1, 1], [1, 1]],
  3: [[1, 1], [2, 1], [1, 2], [2, 2]],
};

export function needsFor(stageIndex, level) {
  const t = TABLE[level] || TABLE[1];
  const row = t[Math.min(Math.max(stageIndex, 0), t.length - 1)];
  return { water: row[0], sun: row[1] };
}

export function createPlant(level) {
  return { level, stage: 0, water: 0, sun: 0 };
}

export function applyAction(plant, action) {
  if (plant.stage >= STAGES.length - 1) return { plant, event: 'fini' };
  const need = needsFor(plant.stage, plant.level);
  const key = action === 'sun' ? 'sun' : 'water';
  if (plant[key] >= need[key]) {
    return { plant, event: key === 'water' ? 'trop-eau' : 'trop-soleil' };
  }
  const p = { ...plant, [key]: plant[key] + 1 };
  if (p.water >= need.water && p.sun >= need.sun) {
    const grown = { ...p, stage: p.stage + 1, water: 0, sun: 0 };
    return { plant: grown, event: grown.stage >= STAGES.length - 1 ? 'fini' : 'grew' };
  }
  return { plant: p, event: 'ok' };
}

export function missing(plant) {
  if (plant.stage >= STAGES.length - 1) return null;
  const need = needsFor(plant.stage, plant.level);
  if (plant.water < need.water) return 'water';
  if (plant.sun < need.sun) return 'sun';
  return null;
}
