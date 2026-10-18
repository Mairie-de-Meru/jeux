// Robots de belote (purs). Un robot ne joue que des coups légaux et ne remplace jamais un humain.
import { SUITS, buildDeck, cardOrder, cardPoints, trickWinner, SUIT_NAMES } from './cards.js';
import { legalCards, teamOf, partnerOf } from './game.js';

const BID_THRESHOLD = { facile: 29, normal: 34 };
const ROUND2_DROP = 3;

// Force de la main si `suit` était l'atout (valet 20, 9 14, as 11, autres atouts 5, + 6 par as hors atout).
function strength(cards, suit) {
  let s = 0, trumps = 0;
  for (const c of cards) {
    if (c.suit === suit) {
      trumps++;
      s += c.rank === 'J' ? 20 : c.rank === '9' ? 14 : c.rank === 'A' ? 11 : 5;
    } else if (c.rank === 'A') s += 6;
  }
  return s + Math.max(0, trumps - 2) * 4;
}

function bidScore(m, seat, suit) {
  const hand = m.players[seat].hand;
  return strength(m.phase === 'bid1' ? [...hand, m.turned] : hand, suit);
}

// Choix d'enchère sans le garde-fou « humain » (sert aussi au conseil du palier 1).
export function adviceBid(m, seat, { noise = false } = {}) {
  const jitter = noise && m.difficulty === 'facile' ? (m.rng() - 0.5) * 12 : 0;
  const base = BID_THRESHOLD[m.difficulty] ?? BID_THRESHOLD.normal;
  if (m.phase === 'bid1') {
    return bidScore(m, seat, m.turned.suit) + jitter >= base ? { take: true } : { take: false };
  }
  let best = null, bestScore = -1;
  for (const s of SUITS) {
    if (s === m.turned.suit) continue;
    const sc = bidScore(m, seat, s);
    if (sc > bestScore) { best = s; bestScore = sc; }
  }
  return bestScore + jitter >= base - ROUND2_DROP ? { take: true, suit: best } : { take: false };
}

export function botBid(m, seat) {
  if (m.players[seat].human) throw new Error('botBid appelé pour un humain');
  if (m.phase !== 'bid1' && m.phase !== 'bid2') throw new Error('Pas de phase d\'enchères');
  if (m.current !== seat) throw new Error('Pas ton tour');
  return adviceBid(m, seat, { noise: true });
}

const rankScore = (c, trump) => (c.suit === trump ? 100 : 0) + cardOrder(c, trump);

function unseenCards(m, seat) {
  const known = new Set([...m.seen, ...m.players[seat].hand, ...m.trick.map((p) => p.card)].map((c) => c.id));
  return buildDeck().filter((c) => !known.has(c.id));
}
// Carte maîtresse : plus aucune carte plus forte de sa couleur n'est dehors.
function isMaster(m, seat, card) {
  return !unseenCards(m, seat).some((c) => c.suit === card.suit && cardOrder(c, m.trump) > cardOrder(card, m.trump));
}

const minBy = (arr, f) => arr.reduce((a, b) => (f(b) < f(a) ? b : a));
const maxBy = (arr, f) => arr.reduce((a, b) => (f(b) > f(a) ? b : a));

// Meilleur coup légal et raison (clé courte) ; level = palier de jeu du robot.
export function adviceCard(m, seat, level = m.palier) {
  const ids = legalCards(m, seat);
  if (!ids.length) throw new Error('Aucun coup légal');
  const cards = ids.map((id) => m.players[seat].hand.find((c) => c.id === id));
  if (cards.length === 1) return { id: cards[0].id, why: 'only' };
  const trump = m.trump;
  const myTeamTakes = teamOf(seat) === teamOf(m.taker);

  if (m.trick.length === 0) {
    const plainAces = cards.filter((c) => c.suit !== trump && c.rank === 'A');
    if (level >= 3) {
      const masters = cards.filter((c) => isMaster(m, seat, c));
      const trumpMasters = masters.filter((c) => c.suit === trump);
      const plainMasters = masters.filter((c) => c.suit !== trump);
      if (myTeamTakes && trumpMasters.length) return { id: maxBy(trumpMasters, (c) => cardOrder(c, trump)).id, why: 'lead-trump' };
      if (plainMasters.length) return { id: maxBy(plainMasters, (c) => cardPoints(c, trump)).id, why: 'lead-master' };
      if (myTeamTakes) {
        const unseenTrumps = unseenCards(m, seat).filter((c) => c.suit === trump).length;
        const myTrumps = cards.filter((c) => c.suit === trump);
        if (unseenTrumps > 0 && myTrumps.length >= 2) return { id: maxBy(myTrumps, (c) => cardOrder(c, trump)).id, why: 'lead-trump' };
      }
    } else if (plainAces.length) return { id: plainAces[0].id, why: 'lead-ace' };
    if (myTeamTakes) {
      const strong = cards.filter((c) => c.suit === trump && (c.rank === 'J' || c.rank === '9'));
      if (strong.length) return { id: maxBy(strong, (c) => cardOrder(c, trump)).id, why: 'lead-trump' };
    }
    const plain = cards.filter((c) => c.suit !== trump);
    const pool = plain.length ? plain : cards;
    return { id: minBy(pool, (c) => cardPoints(c, trump) * 10 + cardOrder(c, trump)).id, why: 'lead-low' };
  }

  const winnerSeat = trickWinner(m.trick, trump);
  if (winnerSeat === partnerOf(seat)) {
    const winCard = m.trick.find((p) => p.seat === winnerSeat).card;
    if (level < 3 || m.trick.length === 3 || isMaster(m, seat, winCard)) {
      return { id: maxBy(cards, (c) => cardPoints(c, trump) * 10 - cardOrder(c, trump)).id, why: 'feed-partner' };
    }
  }
  const winners = cards.filter((c) => trickWinner([...m.trick, { seat, card: c }], trump) === seat);
  if (winners.length) return { id: minBy(winners, (c) => rankScore(c, trump)).id, why: 'win' };
  return { id: minBy(cards, (c) => cardPoints(c, trump) * 200 + rankScore(c, trump)).id, why: 'dump' };
}

export function botPlay(m, seat) {
  if (m.players[seat].human) throw new Error('botPlay appelé pour un humain');
  const ids = legalCards(m, seat);
  if (!ids.length) throw new Error('Pas ton tour');
  if (m.difficulty === 'facile' && ids.length > 1 && m.rng() < 0.15) return ids[Math.floor(m.rng() * ids.length)];
  return adviceCard(m, seat, m.palier).id;
}

export const ADVICE_TEXT = {
  only: 'Une seule carte possible.',
  'lead-ace': 'Commence par un as : il gagne souvent.',
  'lead-trump': 'Joue ton atout fort pour vider ceux des autres.',
  'lead-master': 'Cette carte est la plus forte qui reste.',
  'lead-low': 'Commence par une petite carte.',
  'feed-partner': 'Ton partenaire gagne : donne-lui des points !',
  win: 'Cette carte peut gagner le pli.',
  dump: 'Tu ne peux pas gagner : garde tes bonnes cartes.',
};
export const bidAdviceText = (m, advice) => (advice.take
  ? (m.phase === 'bid1' ? 'Tu as une belle main : tu peux prendre.' : `Tu peux prendre à ${SUIT_NAMES[advice.suit]}.`)
  : 'Ta main est faible : tu peux passer.');
