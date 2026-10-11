// Palier 4 : assembler un objet à partir de pièces.
import { makeRng, shuffle } from './rng.mjs';
import { SHAPE_IDS, SHAPES } from './shapes.mjs';

export const RECIPES = {
  maison: { id: 'maison', nom: 'maison', feminin: true, pieces: ['cube', 'pyramide'] },
  glace: { id: 'glace', nom: 'glace', feminin: true, pieces: ['cone', 'sphere'] },
  fusee: { id: 'fusee', nom: 'fusée', feminin: true, pieces: ['cylindre', 'cone'] },
  bonhomme: { id: 'bonhomme', nom: 'bonhomme', feminin: false, pieces: ['sphere', 'sphere'] },
};

export function makeBuildRounds(seed) {
  const rng = makeRng(seed);
  const ids = ['maison', ...shuffle(rng, ['glace', 'fusee', 'bonhomme'])];
  return ids.map((id) => {
    const recipe = RECIPES[id];
    const intrus = shuffle(rng, SHAPE_IDS.filter((s) => !recipe.pieces.includes(s))).slice(0, 2);
    return { recipe: id, tray: shuffle(rng, [...recipe.pieces, ...intrus]) };
  });
}

export function createAssembly(recipeId) {
  const { pieces } = RECIPES[recipeId];
  const remplis = pieces.map(() => false);
  return {
    place(shapeId) {
      const slot = pieces.findIndex((p, i) => p === shapeId && !remplis[i]);
      if (slot === -1) return { ok: false, slot: null, complet: this.complet };
      remplis[slot] = true;
      return { ok: true, slot, complet: this.complet };
    },
    // Nombre de pièces déjà posées.
    get placed() { return remplis.filter(Boolean).length; },
    get complet() { return remplis.every(Boolean); },
  };
}

export function hintBuild(recipeId, shapeId) {
  const r = RECIPES[recipeId];
  const s = SHAPES[shapeId];
  const art = r.feminin ? 'La' : 'Le';
  if (r.pieces.includes(shapeId)) {
    return `${art} ${r.nom} a déjà sa pièce : ${s.feminin ? 'la' : 'le'} ${s.nom}. Cherche l'autre pièce !`;
  }
  return `${art} ${r.nom} n'a pas de ${s.nom}. Regarde le modèle !`;
}
