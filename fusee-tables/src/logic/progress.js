// Progression : planètes débloquées. Module pur ; le stockage se fait côté UI.

export const PLANETS = [
  { id: 'fraise', name: 'Planète Fraise', color: '#ff4d6d', ring: false },
  { id: 'citron', name: 'Lune Citron', color: '#ffe14d', ring: false },
  { id: 'menthe', name: 'Planète Menthe', color: '#4dffb8', ring: true },
  { id: 'bonbon', name: 'Planète Bonbon', color: '#ff7ad9', ring: true },
  { id: 'myrtille', name: 'Planète Myrtille', color: '#5b6dff', ring: false },
  { id: 'orange', name: 'Planète Orange', color: '#ff9f1c', ring: true },
  { id: 'kiwi', name: 'Planète Kiwi', color: '#8bd450', ring: false },
  { id: 'violette', name: 'Lune Violette', color: '#a569ff', ring: true },
];

export function createProgress() {
  return { unlocked: 0 };
}

export function unlockNext(progress) {
  if (progress.unlocked >= PLANETS.length) return progress;
  return { ...progress, unlocked: progress.unlocked + 1 };
}

export function serialize(progress) {
  return JSON.stringify(progress);
}

export function deserialize(text) {
  try {
    const obj = JSON.parse(text);
    const n = obj && Number.isInteger(obj.unlocked) ? obj.unlocked : 0;
    return { unlocked: Math.max(0, Math.min(n, PLANETS.length)) };
  } catch {
    return createProgress();
  }
}
