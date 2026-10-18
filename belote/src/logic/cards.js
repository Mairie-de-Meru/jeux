// Cartes de la belote (pur, aucun import DOM/three).
export const SUITS = ['S', 'H', 'D', 'C'];
export const RANKS = ['7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
export const SUIT_NAMES = { S: 'pique', H: 'cœur', D: 'carreau', C: 'trèfle' };
export const SUIT_SYMBOLS = { S: '♠', H: '♥', D: '♦', C: '♣' };
export const RANK_NAMES = { 7: '7', 8: '8', 9: '9', 10: '10', J: 'valet', Q: 'dame', K: 'roi', A: 'as' };

const TRUMP_POINTS = { J: 20, 9: 14, A: 11, 10: 10, K: 4, Q: 3, 8: 0, 7: 0 };
const PLAIN_POINTS = { A: 11, 10: 10, K: 4, Q: 3, J: 2, 9: 0, 8: 0, 7: 0 };
const TRUMP_ORDER = ['7', '8', 'Q', 'K', '10', 'A', '9', 'J'];
const PLAIN_ORDER = ['7', '8', '9', 'J', 'Q', 'K', '10', 'A'];

export const makeCard = (rank, suit) => ({ id: rank + suit, suit, rank });

export function buildDeck() {
  const deck = [];
  for (const s of SUITS) for (const r of RANKS) deck.push(makeCard(r, s));
  return deck;
}

export function cardPoints(card, trump) {
  return (card.suit === trump ? TRUMP_POINTS : PLAIN_POINTS)[card.rank];
}

// Rang de force dans la couleur (plus grand = plus fort).
export function cardOrder(card, trump) {
  return (card.suit === trump ? TRUMP_ORDER : PLAIN_ORDER).indexOf(card.rank);
}

// trick = [{ seat, card }] dans l'ordre joué ; renvoie la place gagnante.
export function trickWinner(trick, trump) {
  const led = trick[0].card.suit;
  let best = trick[0];
  for (const p of trick.slice(1)) {
    const a = p.card, b = best.card;
    if (a.suit === b.suit) { if (cardOrder(a, trump) > cardOrder(b, trump)) best = p; }
    else if (a.suit === trump) best = p;
    else if (b.suit !== trump && a.suit === led && b.suit !== led) best = p;
  }
  return best.seat;
}
