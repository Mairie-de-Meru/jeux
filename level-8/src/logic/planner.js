// Évaluation heuristique d'une main par rapport à un objectif (bots et aide).
import { isNum, isWild, isSkip, MAX_NUM, COLORS, findLayout } from './cards.js';

function setsScore(cnt, sets) {
  const c = cnt.slice();
  let matched = 0;
  let missing = 0;
  for (const s of sets) {
    let best = 1;
    for (let n = 1; n <= MAX_NUM; n++) if (c[n] > c[best]) best = n;
    const take = Math.min(s.size, c[best]);
    c[best] -= take;
    matched += take;
    missing += s.size - take;
  }
  return { matched, missing };
}

// Nombre approximatif de cartes de la main qui servent l'objectif (jokers inclus).
export function progress(hand, specs) {
  const J = hand.filter(isWild).length;
  const cnt = new Array(MAX_NUM + 1).fill(0);
  for (const c of hand) if (isNum(c)) cnt[c.n]++;
  const sets = specs.filter((s) => s.t === 'set').sort((a, b) => b.size - a.size);
  const other = specs.find((s) => s.t !== 'set');
  if (!other) {
    const r = setsScore(cnt, sets);
    return r.matched + Math.min(J, r.missing);
  }
  let best = 0;
  if (other.t === 'run') {
    for (let s = 1; s + other.size - 1 <= MAX_NUM; s++) {
      const c = cnt.slice();
      let m = 0;
      for (let n = s; n < s + other.size; n++) if (c[n] > 0) { c[n]--; m++; }
      const r = setsScore(c, sets);
      best = Math.max(best, m + r.matched + Math.min(J, other.size - m + r.missing));
    }
  } else {
    for (let col = 0; col < 4; col++) {
      const c = cnt.slice();
      const mine = hand.filter((x) => isNum(x) && x.c === col).sort((a, b) => cnt[a.n] - cnt[b.n]);
      const taken = mine.slice(0, other.size);
      for (const x of taken) c[x.n]--;
      const r = setsScore(c, sets);
      best = Math.max(best, taken.length + r.matched + Math.min(J, other.size - taken.length + r.missing));
    }
  }
  return best;
}

// Ids des cartes qui comptent pour l'objectif (à garder).
export function usefulIds(hand, specs) {
  const base = progress(hand, specs);
  const ids = new Set();
  for (const c of hand) {
    if (isSkip(c)) continue;
    if (isWild(c) || progress(hand.filter((x) => x !== c), specs) < base) ids.add(c.id);
  }
  return ids;
}

// Carte la moins utile (passe d'abord, jokers gardés).
export function bestDiscard(hand, specs, rng) {
  const skip = hand.find(isSkip);
  if (skip) return skip;
  let pool = hand.filter((c) => !isWild(c));
  if (!pool.length) pool = hand;
  let bestP = -1;
  let ties = [];
  for (const c of pool) {
    const p = progress(hand.filter((x) => x !== c), specs);
    if (p > bestP) { bestP = p; ties = [c]; } else if (p === bestP) ties.push(c);
  }
  // à égalité, jeter plutôt les plus gros nombres au hasard
  return ties[Math.floor(rng() * ties.length)];
}

// Choix glouton des cartes d'un groupe dans le pool (sans jokers). Renvoie un tableau de cartes.
function pickSet(pool, size) {
  const by = new Map();
  for (const c of pool) if (isNum(c)) by.set(c.n, [...(by.get(c.n) || []), c]);
  let best = [];
  for (let n = 1; n <= MAX_NUM; n++) { const l = by.get(n) || []; if (l.length > best.length) best = l; }
  return best.slice(0, size);
}
function runOptions(pool, size) {
  const opts = [];
  for (let s = 1; s + size - 1 <= MAX_NUM; s++) {
    const cards = [];
    for (let n = s; n < s + size; n++) { const c = pool.find((x) => isNum(x) && x.n === n); if (c) cards.push(c); }
    opts.push(cards);
  }
  return opts;
}
function colourOptions(pool, size) {
  return COLORS.map((_, col) => pool.filter((c) => isNum(c) && c.c === col).slice(0, size));
}

// Remplissage de l'objectif par la main : pour chaque groupe { spec, size, cards }, cards = cartes retenues
// (jokers compris, tant qu'il en reste), cards.length === size quand le groupe est complet.
export function objectiveFill(hand, specs) {
  const live = hand.filter((c) => !isSkip(c));
  const total = specs.reduce((s, x) => s + x.size, 0);
  const lay = live.length >= total ? findLayout(live, specs) : null;
  if (lay) return specs.map((spec, i) => ({ spec, size: spec.size, cards: lay[i] }));
  const nums = live.filter(isNum);
  const jokers = live.filter(isWild);
  const idx = specs.map((_, i) => i);
  const other = idx.find((i) => specs[i].t !== 'set');
  const chosen = specs.map(() => []);
  const fillSets = (pool, skipIdx) => {
    const out = {};
    let rest = pool.slice();
    const order = idx.filter((i) => i !== skipIdx).sort((a, b) => specs[b].size - specs[a].size);
    for (const i of order) { out[i] = pickSet(rest, specs[i].size); rest = rest.filter((c) => !out[i].includes(c)); }
    return out;
  };
  if (other === undefined) {
    const o = fillSets(nums, -1);
    idx.forEach((i) => { chosen[i] = o[i]; });
  } else {
    const spec = specs[other];
    const opts = spec.t === 'run' ? runOptions(nums, spec.size) : colourOptions(nums, spec.size);
    let best = null;
    for (const cards of opts) {
      const o = fillSets(nums.filter((c) => !cards.includes(c)), other);
      const score = cards.length + Object.values(o).reduce((s, l) => s + l.length, 0);
      if (!best || score > best.score) best = { score, cards, o };
    }
    chosen[other] = best ? best.cards : [];
    idx.forEach((i) => { if (i !== other && best) chosen[i] = best.o[i]; });
  }
  let J = jokers.slice();
  const res = specs.map((spec, i) => ({ spec, size: spec.size, cards: chosen[i].slice() }));
  for (const r of res) while (J.length && r.cards.length < r.size && r.cards.length > 0) r.cards.push(J.shift());
  for (const r of res) while (J.length && r.cards.length < r.size) r.cards.push(J.shift());
  return res;
}

// Cartes fantômes d'un groupe partiellement rempli, dérivées des vraies cartes (ou null s'il n'y en a aucune).
// Renvoie size - cards.length éléments { n, c }.
export function ghostCards(spec, cards) {
  const reals = cards.filter(isNum);
  const m = spec.size - cards.length;
  if (!reals.length || m <= 0) return reals.length ? [] : null;
  if (spec.t === 'set') return Array.from({ length: m }, (_, i) => ({ n: reals[0].n, c: i % 4 }));
  if (spec.t === 'colour') {
    const used = new Set(reals.map((c) => c.n));
    const pool = [2, 5, 8, 3, 11, 6, 9, 1, 4, 7, 10, 12].filter((n) => !used.has(n));
    return Array.from({ length: m }, (_, i) => ({ n: pool[i % pool.length], c: reals[0].c }));
  }
  const ns = reals.map((c) => c.n);
  const lo = Math.min(...ns);
  const hi = Math.max(...ns);
  let start = Math.min(lo, MAX_NUM - spec.size + 1);
  if (hi > start + spec.size - 1) start = hi - spec.size + 1;
  const have = new Set(ns);
  const gaps = [];
  for (let n = lo; n <= hi; n++) if (!have.has(n)) gaps.push(n);
  const up = [];
  for (let n = hi + 1; n <= Math.min(MAX_NUM, start + spec.size - 1); n++) up.push(n);
  const down = [];
  for (let n = lo - 1; n >= start; n--) down.push(n);
  const wilds = cards.length - reals.length;
  return [...gaps, ...up, ...down].slice(wilds, wilds + m).sort((a, b) => a - b).map((n, i) => ({ n, c: (i + 1) % 4 }));
}
