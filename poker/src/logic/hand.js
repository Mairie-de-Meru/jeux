// Évaluation des mains de poker (pur).
import { rankName, SUIT_NAMES, parseCard } from './cards.js';

// « de Rois », « d'As »
const de = (r) => (r === 14 ? "d'As" : `de ${rankName(r, true)}`);

// Quinte dans une liste de cartes : { hi, cards } (roue A-2-3-4-5 : hi = 5) ou null.
function straightOf(list) {
  const seen = new Map();
  for (const c of [...list].sort((a, b) => b.r - a.r)) if (!seen.has(c.r)) seen.set(c.r, c);
  if (seen.has(14)) seen.set(1, seen.get(14));
  for (let hi = 14; hi >= 5; hi--) {
    let ok = true;
    for (let k = 0; k < 5; k++) if (!seen.has(hi - k)) { ok = false; break; }
    if (ok) return { hi, cards: [0, 1, 2, 3, 4].map((k) => seen.get(hi - k)) };
  }
  return null;
}

// cards : 1 à 7 cartes (5 à 7 pour les quintes et couleurs).
export function evaluate(cards) {
  const cs = [...cards].sort((a, b) => b.r - a.r);
  const byRank = new Map();
  const bySuit = {};
  for (const c of cs) {
    if (!byRank.has(c.r)) byRank.set(c.r, []);
    byRank.get(c.r).push(c);
    (bySuit[c.s] = bySuit[c.s] || []).push(c);
  }
  // groupes : plus nombreux d'abord, puis plus hauts
  const groups = [...byRank.entries()].map(([r, list]) => ({ r, list })).sort((a, b) => b.list.length - a.list.length || b.r - a.r);
  const flushSuit = Object.keys(bySuit).find((s) => bySuit[s].length >= 5);
  const flushCards = flushSuit ? bySuit[flushSuit] : null;
  const take = (used, n) => {
    const rest = cs.filter((c) => !used.includes(c));
    return rest.slice(0, n);
  };
  const out = (cat, ranks, best, name) => ({ cat, ranks: [cat, ...ranks], best, name });

  if (flushCards) {
    const sf = straightOf(flushCards);
    if (sf) return out(8, [sf.hi], sf.cards, sf.hi === 14 ? 'Quinte flush royale' : `Quinte flush, ${rankName(sf.hi)} haut`);
  }
  if (groups[0] && groups[0].list.length === 4) {
    const q = groups[0];
    const k = take(q.list, 1);
    return out(7, [q.r, ...k.map((c) => c.r)], [...q.list, ...k], `Carré ${de(q.r)}`);
  }
  if (groups[0] && groups[0].list.length >= 3 && groups[1] && groups[1].list.length >= 2) {
    const t = groups[0], p = groups[1];
    return out(6, [t.r, p.r], [...t.list, ...p.list.slice(0, 2)], `Full aux ${rankName(t.r, true)} par les ${rankName(p.r, true)}`);
  }
  if (flushCards) {
    const best = flushCards.slice(0, 5);
    return out(5, best.map((c) => c.r), best, `Couleur à ${SUIT_NAMES[flushSuit]}`);
  }
  const st = straightOf(cs);
  if (st) return out(4, [st.hi], st.cards, `Quinte, ${rankName(st.hi)} haut`);
  if (groups[0] && groups[0].list.length === 3) {
    const t = groups[0];
    const k = take(t.list, 2);
    return out(3, [t.r, ...k.map((c) => c.r)], [...t.list, ...k], `Brelan ${de(t.r)}`);
  }
  if (groups[0] && groups[0].list.length === 2 && groups[1] && groups[1].list.length === 2) {
    const a = groups[0], b = groups[1];
    const k = take([...a.list, ...b.list], 1);
    return out(2, [a.r, b.r, ...k.map((c) => c.r)], [...a.list, ...b.list, ...k], `Double paire ${rankName(a.r, true)} et ${rankName(b.r, true)}`);
  }
  if (groups[0] && groups[0].list.length === 2) {
    const p = groups[0];
    const k = take(p.list, 3);
    return out(1, [p.r, ...k.map((c) => c.r)], [...p.list, ...k], `Paire ${de(p.r)}`);
  }
  const best = cs.slice(0, 5);
  return out(0, best.map((c) => c.r), best, best.length ? `Carte haute ${rankName(best[0].r)}` : '');
}

export function compareHands(a, b) {
  const n = Math.max(a.ranks.length, b.ranks.length);
  for (let i = 0; i < n; i++) {
    const d = (a.ranks[i] || 0) - (b.ranks[i] || 0);
    if (d) return d;
  }
  return 0;
}

// Texte de l'aide « Ta main » (valable dès 2 cartes).
export function describe(hole, board = []) {
  const all = [...hole, ...board];
  if (!all.length) return '';
  return evaluate(all).name;
}

// Tableau des combinaisons, de la plus forte à la plus faible.
const ex = (s) => s.split(' ').map(parseCard);
export const CATEGORIES = [
  { cat: 8, name: 'Quinte flush', note: '5 cartes qui se suivent, même famille', example: ex('9H 8H 7H 6H 5H') },
  { cat: 7, name: 'Carré', note: '4 cartes identiques', example: ex('QS QH QD QC 4S') },
  { cat: 6, name: 'Full', note: 'Un brelan et une paire', example: ex('KS KH KD 7S 7H') },
  { cat: 5, name: 'Couleur', note: '5 cartes de la même famille', example: ex('AD JD 9D 6D 3D') },
  { cat: 4, name: 'Quinte', note: '5 cartes qui se suivent', example: ex('9S 8H 7D 6C 5S') },
  { cat: 3, name: 'Brelan', note: '3 cartes identiques', example: ex('7S 7H 7D KC 2S') },
  { cat: 2, name: 'Double paire', note: 'Deux paires', example: ex('JS JH 4D 4C 9S') },
  { cat: 1, name: 'Paire', note: '2 cartes identiques', example: ex('QS QH 9D 6C 3S') },
  { cat: 0, name: 'Carte haute', note: 'Rien : la plus haute carte', example: ex('AS JH 8D 5C 3S') },
];
