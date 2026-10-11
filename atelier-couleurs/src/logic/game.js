// Module PUR : état de partie. Tout est immuable, aucune pénalité.
import { PIGMENTS, PIGMENT_IDS, mixToRgb, rgbToHex, deltaE } from './pigments.js';
import { LEVELS, targetRgb } from './levels.js';

export const SEUIL_TROUVE = 6;
export const MAX_GOUTTES = 12;

const vide = () => ({ rouge: 0, jaune: 0, bleu: 0, blanc: 0, noir: 0 });
const total = (c) => PIGMENT_IDS.reduce((a, id) => a + (c[id] || 0), 0);

export function createGame() {
  return { palier: 0, cibleIndex: 0, gouttes: vide(), palette: [], etoiles: {}, termine: false };
}

export function currentTarget(state) {
  if (state.termine) return null;
  return LEVELS[state.palier].cibles[state.cibleIndex];
}

export function gotoLevel(state, palier, cibleIndex = 0) {
  if (state.termine) return state; // `termine` ne redevient jamais faux (seul createGame repart de zéro)
  const p = Math.max(0, Math.min(LEVELS.length - 1, palier));
  const c = Math.max(0, Math.min(LEVELS[p].cibles.length - 1, cibleIndex));
  return { ...state, palier: p, cibleIndex: c, gouttes: vide(), termine: false };
}

export function isFull(state) {
  return total(state.gouttes) >= MAX_GOUTTES;
}

// Refusé (au-delà de MAX_GOUTTES) : renvoie le même objet d'état ; l'indice « vide » s'affiche alors.
export function addDrop(state, pigmentId) {
  if (state.termine || !PIGMENTS[pigmentId] || isFull(state)) return state;
  return { ...state, gouttes: { ...state.gouttes, [pigmentId]: state.gouttes[pigmentId] + 1 } };
}

export function emptyPot(state) {
  return { ...state, gouttes: vide() };
}

function hint(state, cible) {
  const g = state.gouttes;
  const rec = cible.recette;
  const n = total(g);
  if (PIGMENT_IDS.some((id) => g[id] > 0 && !rec[id])) return { type: 'vide' };
  const recIds = PIGMENT_IDS.filter((id) => rec[id]);
  const sum = recIds.reduce((a, id) => a + rec[id], 0);
  let k = 1;
  while (recIds.some((id) => k * rec[id] < g[id])) k++;
  if (k * sum > MAX_GOUTTES || n > MAX_GOUTTES) return { type: 'vide' };
  let best = null, bestManque = 0;
  for (const id of recIds) {
    const manque = k * rec[id] - g[id];
    if (manque > bestManque) { best = id; bestManque = manque; }
  }
  return best ? { type: 'ajoute', pigment: best } : { type: 'vide' };
}

export function evaluate(state) {
  const cible = currentTarget(state);
  const rgb = mixToRgb(state.gouttes);
  if (!cible) return { rgb, proximite: 0, trouve: false, indice: null };
  if (!rgb) return { rgb, proximite: 0, trouve: false, indice: hint(state, cible) };
  const d = deltaE(rgb, targetRgb(cible));
  const proximite = Math.max(0, Math.min(1, 1 - d / 50));
  const trouve = d <= SEUIL_TROUVE;
  return { rgb, proximite, trouve, indice: trouve ? null : hint(state, cible) };
}

export function validate(state) {
  const cible = currentTarget(state);
  if (!cible || !evaluate(state).trouve) return state;
  const hex = rgbToHex(targetRgb(cible));
  const palette = state.palette.some((p) => p.id === cible.id) ? state.palette : [...state.palette, { id: cible.id, nom: cible.nom, hex }];
  const mini = PIGMENT_IDS.reduce((a, id) => a + (cible.recette[id] || 0), 0);
  const n = total(state.gouttes);
  const etoile = n <= mini ? 3 : n <= 2 * mini ? 2 : 1;
  const etoiles = { ...state.etoiles, [cible.id]: Math.max(state.etoiles[cible.id] || 0, etoile) };
  let { palier, cibleIndex } = state;
  let termine = false;
  cibleIndex++;
  if (cibleIndex >= LEVELS[palier].cibles.length) {
    cibleIndex = 0;
    palier++;
    if (palier >= LEVELS.length) { palier = LEVELS.length - 1; termine = true; }
  }
  return { ...state, palier, cibleIndex, gouttes: vide(), palette, etoiles, termine };
}
