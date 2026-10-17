// Cartes, groupes valides, recherche de combinaisons. Module pur.
// Carte : { id, k: 'n'|'j'|'s', n (1..12), c (0..3) }  n = nombre, j = joker, s = passe.
export const COLORS = ['rouge', 'bleu', 'jaune', 'vert'];
export const SHAPES = ['●', '■', '▲', '◆'];
export const MAX_NUM = 12;

export function makeDeck() {
  const d = [];
  let id = 0;
  for (let copy = 0; copy < 2; copy++) {
    for (let c = 0; c < 4; c++) {
      for (let n = 1; n <= MAX_NUM; n++) d.push({ id: id++, k: 'n', n, c });
    }
  }
  for (let i = 0; i < 8; i++) d.push({ id: id++, k: 'j' });
  for (let i = 0; i < 4; i++) d.push({ id: id++, k: 's' });
  return d;
}

export const isWild = (c) => c.k === 'j';
export const isNum = (c) => c.k === 'n';
export const isSkip = (c) => c.k === 's';

export function* combos(arr, k, start = 0, acc = []) {
  if (acc.length === k) { yield acc.slice(); return; }
  for (let i = start; i <= arr.length - (k - acc.length); i++) {
    acc.push(arr[i]);
    yield* combos(arr, k, i + 1, acc);
    acc.pop();
  }
}

// Vérifie qu'un tas de cartes forme exactement le groupe demandé. Renvoie les méta-données ou null.
// spec : { t: 'set'|'run'|'colour', size }
export function resolveGroup(cards, spec) {
  if (cards.length !== spec.size) return null;
  if (cards.some(isSkip)) return null;
  const nums = cards.filter(isNum);
  if (nums.length === 0) return null; // un groupe ne peut pas être fait que de jokers
  if (spec.t === 'set') {
    const n = nums[0].n;
    return nums.every((c) => c.n === n) ? { t: 'set', n } : null;
  }
  if (spec.t === 'colour') {
    const c = nums[0].c;
    return nums.every((x) => x.c === c) ? { t: 'colour', c } : null;
  }
  const ns = nums.map((c) => c.n);
  if (new Set(ns).size !== ns.length) return null;
  const lo = Math.min(...ns);
  const hi = Math.max(...ns);
  const len = cards.length;
  const start = Math.max(1, hi - len + 1);
  if (start > lo || start + len - 1 > MAX_NUM) return null;
  return { t: 'run', start, end: start + len - 1 };
}

// Construit un groupe posé : items = [{ card, n }] (n = nombre représenté).
export function buildGroup(cards, spec) {
  const meta = resolveGroup(cards, spec);
  if (!meta) return null;
  let items;
  if (meta.t === 'set') {
    items = cards.map((card) => ({ card, n: meta.n }));
  } else if (meta.t === 'run') {
    const wilds = cards.filter(isWild);
    items = [];
    for (let n = meta.start; n <= meta.end; n++) {
      const real = cards.find((c) => isNum(c) && c.n === n);
      items.push({ card: real || wilds.shift(), n });
    }
  } else {
    items = cards
      .slice()
      .sort((a, b) => (isNum(a) ? a.n : 99) - (isNum(b) ? b.n : 99))
      .map((card) => ({ card, n: isNum(card) ? card.n : null }));
  }
  return { spec, meta, items };
}

export function canAddToGroup(group, card) {
  if (isSkip(card)) return false;
  const m = group.meta;
  if (isWild(card)) return m.t !== 'run' || m.start > 1 || m.end < MAX_NUM;
  if (m.t === 'set') return card.n === m.n;
  if (m.t === 'colour') return card.c === m.c;
  return (card.n === m.end + 1 && m.end < MAX_NUM) || (card.n === m.start - 1 && m.start > 1);
}

export function addCardToGroup(group, card) {
  if (!canAddToGroup(group, card)) return false;
  const m = group.meta;
  if (m.t === 'set') group.items.push({ card, n: m.n });
  else if (m.t === 'colour') group.items.push({ card, n: isNum(card) ? card.n : null });
  else if (isWild(card)) {
    if (m.end < MAX_NUM) { m.end++; group.items.push({ card, n: m.end }); }
    else { m.start--; group.items.unshift({ card, n: m.start }); }
  } else if (card.n === m.end + 1) { m.end++; group.items.push({ card, n: card.n }); }
  else { m.start--; group.items.unshift({ card, n: card.n }); }
  return true;
}

// Reprise de joker : renvoie l'index (dans group.items) du joker que la vraie carte peut remplacer, ou -1.
// trio/carré : nombre du groupe ; suite : nombre exact représenté ; couleur : même couleur.
export function canSwapJoker(group, card) {
  if (!card || !isNum(card)) return -1;
  const m = group.meta;
  return group.items.findIndex((it) => {
    if (!isWild(it.card)) return false;
    if (m.t === 'set') return card.n === m.n;
    if (m.t === 'colour') return card.c === m.c;
    return card.n === it.n;
  });
}

// Remplace le joker par la carte dans le groupe. Renvoie le joker retiré, ou null.
export function swapJokerInGroup(group, card) {
  const i = canSwapJoker(group, card);
  if (i < 0) return null;
  const joker = group.items[i].card;
  group.items[i] = { card, n: card.n };
  return joker;
}

// Cherche une façon de former tous les groupes demandés avec les cartes du pool.
// Renvoie un tableau de tableaux de cartes (un par groupe) ou null.
export function findLayout(pool, specs) {
  const cards = pool
    .filter((c) => !isSkip(c))
    .sort((a, b) => (isWild(a) ? 1 : 0) - (isWild(b) ? 1 : 0) || (a.n || 0) - (b.n || 0) || (a.c || 0) - (b.c || 0));
  const total = specs.reduce((s, x) => s + x.size, 0);
  if (cards.length < total) return null;
  const rec = (rest, i) => {
    if (i === specs.length) return [];
    for (const combo of combos(rest, specs[i].size)) {
      if (!resolveGroup(combo, specs[i])) continue;
      const left = rest.filter((c) => !combo.includes(c));
      const r = rec(left, i + 1);
      if (r) return [combo, ...r];
    }
    return null;
  };
  return rec(cards, 0);
}

export function sortCards(cards, mode) {
  const rank = (c) => (isNum(c) ? 0 : isWild(c) ? 1 : 2);
  return cards.slice().sort((a, b) => {
    if (rank(a) !== rank(b)) return rank(a) - rank(b);
    if (!isNum(a)) return a.id - b.id;
    return mode === 'colour' ? a.c - b.c || a.n - b.n : a.n - b.n || a.c - b.c;
  });
}
