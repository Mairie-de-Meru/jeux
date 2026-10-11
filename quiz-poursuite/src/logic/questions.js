import { CATEGORIES } from './categories.js';
import { shuffle } from './rng.js';

export function validateBank(bank, { niveaux = [1, 2, 3, 4, 5] } = {}) {
  const err = [];
  if (!Array.isArray(bank)) return ['la banque doit être un tableau'];
  const ids = new Set();
  const compte = {};
  const catIds = CATEGORIES.map((c) => c.id);
  for (const q of bank) {
    const id = q && q.id;
    if (!id || typeof id !== 'string') { err.push('id manquant'); continue; }
    if (ids.has(id)) err.push(`${id}: id en double`);
    ids.add(id);
    if (!catIds.includes(q.cat)) err.push(`${id}: catégorie inconnue`);
    if (![1, 2, 3, 4, 5].includes(q.niveau)) err.push(`${id}: niveau invalide`);
    if (!q.q || !String(q.q).trim()) err.push(`${id}: question vide`);
    if (!q.explication || !String(q.explication).trim()) err.push(`${id}: explication vide`);
    if (!Array.isArray(q.choix) || q.choix.length !== 3) err.push(`${id}: il faut 3 choix`);
    else {
      const textes = new Set();
      for (const c of q.choix) {
        if (!c || !c.t || !String(c.t).trim()) err.push(`${id}: texte de choix vide`);
        if (!c || !c.e || !String(c.e).trim()) err.push(`${id}: emoji de choix vide`);
        if (c && c.t) textes.add(String(c.t).trim().toLowerCase());
      }
      if (textes.size !== 3) err.push(`${id}: choix non distincts`);
    }
    if (![0, 1, 2].includes(q.bonne)) err.push(`${id}: bonne invalide`);
    const k = `${q.cat}|${q.niveau}`;
    compte[k] = (compte[k] || 0) + 1;
  }
  for (const c of catIds) {
    for (const n of niveaux) if ((compte[`${c}|${n}`] || 0) < 8) err.push(`${c} niveau ${n}: moins de 8 questions`);
  }
  return err;
}

export function shuffleChoices(question, rng) {
  const idx = shuffle([0, 1, 2], rng);
  return { choix: idx.map((i) => question.choix[i]), bonne: idx.indexOf(question.bonne) };
}

export function createDeck(bank, rng) {
  const piles = new Map();
  const last = new Map();
  function niveaux(mode) { return mode === 'mix' ? [1, 2] : [mode]; } // modes 2 à 5 : un seul niveau
  function draw(catId, mode) {
    const key = `${catId}|${mode}`;
    let pile = piles.get(key);
    if (!pile || pile.length === 0) {
      const pool = bank.filter((q) => q.cat === catId && niveaux(mode).includes(q.niveau));
      if (pool.length === 0) throw new Error(`aucune question pour ${key}`);
      pile = shuffle(pool, rng);
      if (pool.length > 1 && last.get(key) === pile[pile.length - 1].id) {
        pile.unshift(pile.pop());
      }
      piles.set(key, pile);
    }
    const q = pile.pop();
    last.set(key, q.id);
    return { ...q, ...shuffleChoices(q, rng) };
  }
  return { draw };
}
