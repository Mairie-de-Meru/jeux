// Paliers, questions, vérification (pur).
import { snap, sameOnDial, normMinutes } from './clock.js';
import { MOMENTS } from './day.js';

export const LEVELS = [
  { id: 'heures', name: 'Heures pleines', icon: '🕐', step: 60, mode: 'say', count: 5 },
  { id: 'demies', name: 'Demi-heures', icon: '🕧', step: 30, mode: 'say', count: 5 },
  { id: 'quarts', name: "Quarts d'heure", icon: '🕒', step: 15, mode: 'say', count: 5 },
  { id: 'digital', name: 'Horloge digitale', icon: '🔢', step: 15, mode: 'digital', count: 5 },
];

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function candidates(levelIndex) {
  const L = LEVELS[levelIndex];
  const out = [];
  for (let t = 6 * 60; t < 21 * 60; t += 15) {
    const m = t % 60;
    let ok;
    if (levelIndex === 0) ok = m === 0;
    else if (levelIndex === 1) ok = m === 30;
    else if (levelIndex === 2) ok = m === 15 || m === 45;
    else ok = true;
    if (ok) out.push(t);
  }
  return { list: out, L };
}

export function makeQuestions(levelIndex, rng = Math.random) {
  const { list, L } = candidates(levelIndex);
  const digital = L.mode === 'digital';
  const momentAt = (t) => (digital ? null : MOMENTS.find((m) => m.time === t) || null);
  const used = new Set();
  const picked = [];
  const take = (t) => {
    const key = normMinutes(t) % 720;
    if (used.has(key)) return false;
    used.add(key);
    picked.push(t);
    return true;
  };
  if (!digital) {
    const moments = shuffle(list.filter((t) => momentAt(t)), rng);
    if (moments.length) take(moments[0]);
  }
  for (const t of shuffle(list, rng)) {
    if (picked.length >= L.count) break;
    take(t);
  }
  return picked.map((target) => {
    const m = momentAt(target);
    return { target, momentId: m ? m.id : null, mode: L.mode, step: L.step };
  });
}

export function checkAnswer(question, t) {
  const s = snap(t, question.step);
  const target = normMinutes(question.target);
  const expectedMinuteNumber = (() => {
    const n = Math.round((target % 60) / 5);
    return n === 0 ? 12 : n;
  })();
  if (sameOnDial(s, target)) return { ok: true, hint: null, expectedMinuteNumber };
  const hint = Math.round(s % 60) !== Math.round(target % 60) ? 'minute' : 'hour';
  return { ok: false, hint, expectedMinuteNumber };
}

export function starsFor(errors) {
  if (errors <= 0) return 3;
  if (errors <= 2) return 2;
  return 1;
}

export function nextLevel(i) {
  return i + 1 < LEVELS.length ? i + 1 : null;
}
