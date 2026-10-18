// Cartes (pur) : { id:'AS', r:2..14, s:'S'|'H'|'D'|'C' }.
export const SUITS = ['S', 'H', 'D', 'C'];
export const SUIT_NAMES = { S: 'pique', H: 'cœur', D: 'carreau', C: 'trèfle' };
export const SUIT_SYMBOL = { S: '♠', H: '♥', D: '♦', C: '♣' };
const CH = { 10: 'T', 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };
const FROM_CH = { T: 10, J: 11, Q: 12, K: 13, A: 14 };

export const rankChar = (r) => CH[r] || String(r);
export const makeCard = (r, s) => ({ id: rankChar(r) + s, r, s });
// 'AS' -> carte
export function parseCard(id) {
  const r = FROM_CH[id[0]] || Number(id[0]);
  return makeCard(r, id[1]);
}

export function buildDeck() {
  const deck = [];
  for (const s of SUITS) for (let r = 2; r <= 14; r++) deck.push(makeCard(r, s));
  return deck;
}

const NAMES = { 11: 'Valet', 12: 'Dame', 13: 'Roi', 14: 'As' };
export function rankName(r, plural = false) {
  const n = NAMES[r] || String(r);
  return plural && r >= 11 && r <= 13 ? n + 's' : n;
}

export function cardLabel(c) {
  return `${rankName(c.r)} de ${SUIT_NAMES[c.s]}`;
}
