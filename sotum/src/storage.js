import { emptyStats } from './logic/game.js';
const KEY = 'sotum:v1';
export function loadStats() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...emptyStats(), ...JSON.parse(raw) };
  } catch (e) { /* stockage indisponible */ }
  return emptyStats();
}
export function saveStats(stats) {
  try { localStorage.setItem(KEY, JSON.stringify(stats)); } catch (e) { /* ignoré */ }
}
