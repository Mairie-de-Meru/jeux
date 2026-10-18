// Moteur de belote (pur) : donne, enchères, plis, comptage. Contrat : .project/ARCHITECTURE.md
import { SUITS, buildDeck, cardPoints, cardOrder, trickWinner } from './cards.js';
import { mulberry32, shuffle } from './rng.js';

export const BOT_ANIMALS = [
  { name: 'Renard', emoji: '🦊' },
  { name: 'Ours', emoji: '🐻' },
  { name: 'Lapin', emoji: '🐰' },
  { name: 'Hibou', emoji: '🦉' },
];
export const HUMAN_EMOJIS = ['🧒', '👧', '👦', '🧑'];
export const DEAD_DEAL = 162;
export const teamOf = (seat) => seat % 2;
export const partnerOf = (seat) => (seat + 2) % 4;

export function createMatch({ seats, palier = 1, difficulty = 'facile', rng, dealer = 3 } = {}) {
  const list = seats || [{ type: 'human', name: 'Toi' }, ...BOT_ANIMALS.slice(0, 3).map((a) => ({ type: 'bot', name: a.name }))];
  if (list.length !== 4) throw new Error('4 places');
  let botIdx = 0;
  const players = list.map((s, i) => {
    const human = i === 0 || s.type === 'human';
    const animal = BOT_ANIMALS[botIdx % BOT_ANIMALS.length];
    if (!human) botIdx++;
    return {
      name: (s.name || (human ? (i === 0 ? 'Toi' : `Joueur ${i + 1}`) : animal.name)),
      emoji: human ? HUMAN_EMOJIS[i] : animal.emoji,
      human, hand: [],
    };
  });
  const m = {
    players, palier, difficulty, target: palier === 1 ? 501 : 1000, rng: rng || mulberry32(Date.now() >>> 0),
    scores: [0, 0], dealer, phase: 'bid1', current: 0, turned: null, trump: null, taker: null, stock: [],
    trick: [], tricks: [[], []], trickCount: [0, 0], lastTrick: null, belote: null,
    dealNo: 0, history: [], winner: null, seen: [], passes: 0, result: null,
  };
  startDeal(m);
  return m;
}

function resetDeal(m) {
  m.trump = null; m.taker = null; m.trick = []; m.tricks = [[], []]; m.trickCount = [0, 0];
  m.lastTrick = null; m.belote = null; m.seen = []; m.passes = 0; m.result = null;
}

export function startDeal(m) {
  resetDeal(m);
  m.dealNo++;
  const deck = shuffle(buildDeck(), m.rng);
  m.players.forEach((p) => { p.hand = []; });
  let k = 0;
  for (const n of [3, 2]) {
    for (let i = 1; i <= 4; i++) {
      const seat = (m.dealer + i) % 4;
      m.players[seat].hand.push(...deck.slice(k, k + n));
      k += n;
    }
  }
  m.turned = deck[k++];
  m.stock = deck.slice(k);
  m.phase = 'bid1';
  m.current = (m.dealer + 1) % 4;
  return [{ t: 'deal', dealer: m.dealer }];
}

function detectBelote(m) {
  m.belote = null;
  for (let s = 0; s < 4; s++) {
    const h = m.players[s].hand;
    if (h.some((c) => c.suit === m.trump && c.rank === 'K') && h.some((c) => c.suit === m.trump && c.rank === 'Q')) m.belote = { seat: s, played: 0 };
  }
}

export function bid(m, seat, choice) {
  if (m.phase !== 'bid1' && m.phase !== 'bid2') throw new Error('Pas de phase d\'enchères');
  if (seat !== m.current) throw new Error('Pas ton tour');
  const round = m.phase === 'bid1' ? 1 : 2;
  const events = [];
  if (choice && choice.take) {
    let suit = m.turned.suit;
    if (round === 2) {
      suit = choice.suit;
      if (!SUITS.includes(suit) || suit === m.turned.suit) throw new Error('Couleur interdite au second tour');
    }
    m.trump = suit; m.taker = seat;
    m.players[seat].hand.push(m.turned, ...m.stock.splice(0, 2));
    for (let i = 1; i <= 4; i++) {
      const s = (m.dealer + i) % 4;
      if (s !== seat) m.players[s].hand.push(...m.stock.splice(0, 3));
    }
    detectBelote(m);
    m.phase = 'play';
    m.current = (m.dealer + 1) % 4;
    m.trick = [];
    events.push({ t: 'take', seat, suit, round });
    return events;
  }
  events.push({ t: 'pass', seat, round });
  m.passes++;
  if (m.passes < 4) { m.current = (m.current + 1) % 4; return events; }
  m.passes = 0;
  if (round === 1) { m.phase = 'bid2'; m.current = (m.dealer + 1) % 4; }
  else {
    events.push({ t: 'redeal' });
    m.dealer = (m.dealer + 1) % 4;
    m.phase = 'redeal'; // le contrôleur rejoue startDeal(m)
  }
  return events;
}

const cardOf = (m, seat, id) => m.players[seat].hand.find((c) => c.id === id);

export function legalCards(m, seat) {
  if (m.phase !== 'play' || m.current !== seat) return [];
  const hand = m.players[seat].hand;
  const all = hand.map((c) => c.id);
  if (m.trick.length === 0) return all;
  const trump = m.trump;
  const led = m.trick[0].card.suit;
  const trumpsInTrick = m.trick.filter((p) => p.card.suit === trump).map((p) => cardOrder(p.card, trump));
  const maxTrump = trumpsInTrick.length ? Math.max(...trumpsInTrick) : -1;
  const raise = (cards) => {
    const higher = cards.filter((c) => cardOrder(c, trump) > maxTrump);
    return (higher.length ? higher : cards).map((c) => c.id);
  };
  const ofLed = hand.filter((c) => c.suit === led);
  if (ofLed.length) return led === trump ? raise(ofLed) : ofLed.map((c) => c.id);
  if (trickWinner(m.trick, trump) === partnerOf(seat)) return all;
  const trumps = hand.filter((c) => c.suit === trump);
  if (trumps.length) return raise(trumps);
  return all;
}

export function playCard(m, seat, cardId) {
  if (m.phase !== 'play') throw new Error('Pas de phase de jeu');
  if (seat !== m.current) throw new Error('Pas ton tour');
  if (!legalCards(m, seat).includes(cardId)) throw new Error('Carte illégale');
  const hand = m.players[seat].hand;
  const card = cardOf(m, seat, cardId);
  hand.splice(hand.indexOf(card), 1);
  m.trick.push({ seat, card });
  m.seen.push(card);
  const events = [{ t: 'play', seat, card }];
  if (m.belote && m.belote.seat === seat && card.suit === m.trump && (card.rank === 'K' || card.rank === 'Q')) {
    m.belote.played++;
    events.push({ t: m.belote.played === 1 ? 'belote' : 'rebelote', seat });
  }
  if (m.trick.length < 4) { m.current = (m.current + 1) % 4; return events; }

  const winner = trickWinner(m.trick, m.trump);
  const cards = m.trick.map((p) => p.card);
  const points = cards.reduce((s, c) => s + cardPoints(c, m.trump), 0);
  const team = teamOf(winner);
  m.tricks[team].push(...cards);
  m.trickCount[team]++;
  m.lastTrick = { winner, cards: m.trick.slice(), points };
  m.trick = [];
  m.current = winner;
  events.push({ t: 'trick', winner, points, cards });
  if (m.trickCount[0] + m.trickCount[1] < 8) return events;

  const cp = [0, 1].map((t) => m.tricks[t].reduce((s, c) => s + cardPoints(c, m.trump), 0));
  const result = scoreDeal({
    cardPoints: cp, tricksWon: m.trickCount.slice(), lastTrickTeam: team,
    takerTeam: teamOf(m.taker), beloteTeam: m.belote ? teamOf(m.belote.seat) : null,
  });
  Object.assign(result, { cards: cp, lastTrickTeam: team, takerTeam: teamOf(m.taker), taker: m.taker, trump: m.trump, dealNo: m.dealNo, beloteTeam: m.belote ? teamOf(m.belote.seat) : null });
  m.result = result;
  m.history.push(result);
  m.scores[0] += result.final[0]; m.scores[1] += result.final[1];
  events.push({ t: 'dealEnd', result });
  const top = Math.max(...m.scores);
  if (top >= m.target && m.scores[0] !== m.scores[1]) {
    m.winner = m.scores[0] > m.scores[1] ? 0 : 1;
    m.phase = 'matchEnd';
    events.push({ t: 'matchEnd', winner: m.winner });
  } else m.phase = 'dealEnd';
  return events;
}

export function scoreDeal({ cardPoints: cp, tricksWon, lastTrickTeam, takerTeam, beloteTeam = null }) {
  const points = [cp[0], cp[1]];
  points[lastTrickTeam] += 10;
  const belote = [0, 0];
  if (beloteTeam === 0 || beloteTeam === 1) belote[beloteTeam] = 20;
  let capot = null;
  if (tricksWon[0] === 8) capot = 0; else if (tricksWon[1] === 8) capot = 1;
  if (capot !== null) { points[capot] = 252; points[1 - capot] = 0; }
  const def = 1 - takerTeam;
  const made = points[takerTeam] + belote[takerTeam] > points[def] + belote[def];
  const final = [0, 0];
  if (made) {
    final[takerTeam] = points[takerTeam] + belote[takerTeam];
    final[def] = points[def] + belote[def];
  } else {
    final[takerTeam] = belote[takerTeam];
    final[def] = (capot === def ? 252 : DEAD_DEAL) + belote[def];
  }
  return { points, belote, made, capot, final };
}

export function nextDeal(m) {
  if (m.phase !== 'dealEnd') throw new Error('La donne n\'est pas terminée');
  m.dealer = (m.dealer + 1) % 4;
  return startDeal(m);
}

// Points de cartes déjà ramassés par équipe dans la donne (sans dix de der).
export function liveCount(m) {
  return [0, 1].map((t) => m.tricks[t].reduce((s, c) => s + cardPoints(c, m.trump), 0));
}

// Test : place des mains fixées (ids ou cartes) et passe en phase de jeu.
export function dealFromHands(m, hands, { trump, taker = 0, leader } = {}) {
  const byId = new Map(buildDeck().map((c) => [c.id, c]));
  m.players.forEach((p, i) => { p.hand = hands[i].map((c) => (typeof c === 'string' ? byId.get(c) : c)); });
  resetDeal(m);
  m.trump = trump; m.taker = taker; m.turned = null; m.stock = [];
  detectBelote(m);
  m.phase = 'play';
  m.current = leader ?? (m.dealer + 1) % 4;
  return m;
}
