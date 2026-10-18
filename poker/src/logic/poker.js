// Moteur Texas Hold'em (pur) : jetons fictifs, 2 à 6 places.
import { shuffle } from './rng.js';
import { buildDeck } from './cards.js';
import { evaluate, compareHands } from './hand.js';
import { buildPots, splitPot } from './pots.js';

export const PALIERS = {
  1: { name: 'Découverte', help: true, hands: 10 },
  2: { name: 'Classique', help: true, hands: 15 },
  3: { name: 'Champion', help: false, hands: 20 },
};
export const HUMAN_EMOJIS = ['🧒', '👧', '👦', '🧑', '🧓', '👩'];
export const BOT_ANIMALS = [
  { emoji: '🦊', name: 'Renard' }, { emoji: '🐰', name: 'Lapine' }, { emoji: '🐻', name: 'Ours' },
  { emoji: '🐼', name: 'Panda' }, { emoji: '🐸', name: 'Grenouille' },
];
export const HANDS_PER_LEVEL = 8;
export const MIN_SEATS = 2, MAX_SEATS = 6;

export const live = (p) => !p.out && !p.folded;
export const canAct = (p) => !p.out && !p.folded && !p.allIn;
function nextIdx(g, from, pred) {
  const n = g.players.length;
  for (let k = 1; k <= n; k++) {
    const i = (from + k) % n;
    if (pred(g.players[i])) return i;
  }
  return -1;
}
export const potTotal = (g) => g.players.reduce((s, p) => s + p.totalBet, 0);

export function createGame({ seats, palier = 1, maxHands, stack = 500, rng = Math.random }) {
  if (!Array.isArray(seats) || seats.length < MIN_SEATS || seats.length > MAX_SEATS) throw new Error('2 à 6 places');
  if (!seats.some((s) => s.type === 'human')) throw new Error('Au moins un humain');
  let h = 0, b = 0;
  const players = seats.map((s) => {
    const human = s.type === 'human';
    const emoji = human ? HUMAN_EMOJIS[h++ % HUMAN_EMOJIS.length] : BOT_ANIMALS[b++ % BOT_ANIMALS.length].emoji;
    return { name: s.name, emoji, human, stack, hole: [], bet: 0, totalBet: 0, folded: false, allIn: false, out: false, acted: false };
  });
  const g = {
    players, deck: [], board: [], dealer: players.length - 1, sbIdx: -1, bbIdx: -1, blinds: { sb: 5, bb: 10 },
    street: 'preflop', current: 0, currentBet: 0, minRaise: 10, handNo: 0,
    maxHands: maxHands || PALIERS[palier].hands, phase: 'betting', lastResult: null, ranking: null, palier, rng,
    startStack: stack,
  };
  g.events = startHand(g);
  return g;
}

function putChips(p, amount) {
  const a = Math.max(0, Math.min(amount, p.stack));
  p.stack -= a; p.bet += a; p.totalBet += a;
  if (p.stack === 0) p.allIn = true;
  return a;
}

export function startHand(g) {
  const ev = [];
  const n = g.players.length;
  g.handNo++;
  const lvl = Math.floor((g.handNo - 1) / HANDS_PER_LEVEL);
  g.blinds = { sb: 5 * 2 ** lvl, bb: 10 * 2 ** lvl };
  for (const p of g.players) Object.assign(p, { hole: [], bet: 0, totalBet: 0, folded: false, allIn: false, acted: false });
  g.deck = shuffle(buildDeck(), g.rng);
  g.board = []; g.street = 'preflop'; g.lastResult = null; g.phase = 'betting';
  g.dealer = nextIdx(g, g.dealer, (p) => !p.out);
  const active = g.players.filter((p) => !p.out).length;
  const sb = active === 2 ? g.dealer : nextIdx(g, g.dealer, (p) => !p.out);
  const bb = nextIdx(g, sb, (p) => !p.out);
  g.sbIdx = sb; g.bbIdx = bb;
  ev.push({ t: 'newHand', handNo: g.handNo, dealer: g.dealer, blinds: { ...g.blinds } });
  ev.push({ t: 'blind', p: sb, kind: 'sb', amount: putChips(g.players[sb], g.blinds.sb) });
  ev.push({ t: 'blind', p: bb, kind: 'bb', amount: putChips(g.players[bb], g.blinds.bb) });
  for (let r = 0; r < 2; r++) for (let k = 0; k < n; k++) {
    const i = (sb + k) % n;
    if (!g.players[i].out) g.players[i].hole.push(g.deck.pop());
  }
  g.players.forEach((p, i) => { if (!p.out) ev.push({ t: 'deal', p: i, cards: [...p.hole] }); });
  g.currentBet = Math.max(...g.players.map((p) => p.bet));
  g.minRaise = g.blinds.bb;
  g.current = bb;
  settle(g, ev, bb);
  return ev;
}

export function legalActions(g) {
  const p = g.players[g.current];
  const toCall = Math.max(0, g.currentBet - p.bet);
  const maxTo = p.bet + p.stack;
  const others = g.players.some((o, i) => i !== g.current && canAct(o));
  let raise = null;
  if (!p.acted && maxTo > g.currentBet && others) raise = { min: Math.min(g.currentBet + g.minRaise, maxTo), max: maxTo };
  const allin = p.stack > 0 && (raise || p.stack <= toCall) ? p.stack : 0;
  return { fold: true, check: toCall === 0, call: toCall > 0 ? Math.min(toCall, p.stack) : 0, raise, allin };
}

function dealStreet(g, ev) {
  g.deck.pop(); // carte brûlée
  const n = g.street === 'preflop' ? 3 : 1;
  const cards = [];
  for (let i = 0; i < n; i++) cards.push(g.deck.pop());
  g.board.push(...cards);
  g.street = g.street === 'preflop' ? 'flop' : g.street === 'flop' ? 'turn' : 'river';
  ev.push({ t: 'street', street: g.street, cards, board: [...g.board] });
}

// Après une action : qui parle ensuite ? tour terminé ? rue suivante, runout, abattage.
function settle(g, ev, from) {
  let runoutSent = false;
  for (;;) {
    if (g.players.filter(live).length === 1) { finishHand(g, ev, false); return; }
    const lone = g.players.filter(canAct).length <= 1;
    const need = (p) => canAct(p) && (lone ? p.bet < g.currentBet : !p.acted || p.bet < g.currentBet);
    const nxt = nextIdx(g, from, need);
    if (nxt !== -1) { g.current = nxt; return; }
    if (g.street === 'river') { finishHand(g, ev, true); return; }
    if (lone && !runoutSent) { ev.push({ t: 'runout' }); runoutSent = true; }
    for (const p of g.players) { p.bet = 0; p.acted = false; }
    g.currentBet = 0; g.minRaise = g.blinds.bb;
    dealStreet(g, ev);
    from = g.dealer;
  }
}

function finishHand(g, ev, showdown) {
  const n = g.players.length;
  const gains = {};
  const pots = [];
  const wins = [];
  const shown = {};
  if (!showdown) {
    const w = g.players.findIndex(live);
    const amount = potTotal(g);
    g.players[w].stack += amount;
    gains[w] = amount;
    pots.push({ amount, winners: [w], hand: '', refund: false });
    ev.push({ t: 'win', p: w, amount, hand: '' });
    wins.push({ p: w, amount, hand: '', refund: false });
  } else {
    g.players.forEach((p, i) => { if (live(p)) shown[i] = evaluate([...p.hole, ...g.board]); });
    ev.push({ t: 'showdown', shown });
    for (const pot of buildPots(g.players)) {
      let winners, hand = '', refund = false;
      if (pot.eligible.length === 1) { winners = [pot.eligible[0]]; refund = true; }
      else {
        let best = null; winners = [];
        for (const i of pot.eligible) {
          const c = best ? compareHands(shown[i], best) : 1;
          if (c > 0) { best = shown[i]; winners = [i]; } else if (c === 0) winners.push(i);
        }
        hand = best.name;
      }
      pots.push({ amount: pot.amount, winners, hand, refund });
      for (const s of splitPot(pot.amount, winners, g.dealer, n)) {
        g.players[s.p].stack += s.amount;
        gains[s.p] = (gains[s.p] || 0) + s.amount;
        ev.push({ t: 'win', p: s.p, amount: s.amount, hand, refund });
        wins.push({ p: s.p, amount: s.amount, hand, refund });
      }
    }
  }
  for (const p of g.players) { p.bet = 0; p.totalBet = 0; }
  g.players.forEach((p, i) => { if (!p.out && p.stack === 0) { p.out = true; ev.push({ t: 'out', p: i }); } });
  g.lastResult = { pots, shown, gains, wins, showdown };
  g.phase = 'handOver';
}

export function act(g, a) {
  if (g.phase !== 'betting') throw new Error('Pas de tour en cours');
  const idx = g.current;
  const p = g.players[idx];
  const L = legalActions(g);
  const ev = [];
  const goRaise = (to) => {
    const amount = putChips(p, to - p.bet);
    const inc = to - g.currentBet;
    if (inc >= g.minRaise) {
      g.minRaise = inc;
      for (const o of g.players) if (canAct(o)) o.acted = false; // relance complète : les enchères sont rouvertes
    }
    g.currentBet = to;
    p.acted = true;
    ev.push({ t: p.allIn ? 'allin' : 'raise', kind: 'raise', p: idx, amount, to });
  };
  switch (a && a.type) {
    case 'fold':
      p.folded = true; p.acted = true; ev.push({ t: 'fold', p: idx }); break;
    case 'check':
      if (!L.check) throw new Error('Parler impossible : il faut suivre');
      p.acted = true; ev.push({ t: 'check', p: idx }); break;
    case 'call': {
      if (!L.call) throw new Error('Rien à suivre');
      const amount = putChips(p, L.call);
      p.acted = true;
      ev.push({ t: p.allIn ? 'allin' : 'call', kind: 'call', p: idx, amount, to: p.bet });
      break;
    }
    case 'raise': {
      const to = a.to;
      if (!L.raise || !Number.isInteger(to) || to < L.raise.min || to > L.raise.max) throw new Error('Relance illégale');
      goRaise(to); break;
    }
    case 'allin': {
      if (!L.allin) throw new Error('Tapis impossible');
      const to = p.bet + p.stack;
      if (to > g.currentBet) goRaise(to);
      else {
        const amount = putChips(p, p.stack); p.acted = true;
        ev.push({ t: 'allin', kind: 'call', p: idx, amount, to: p.bet });
      }
      break;
    }
    default: throw new Error('Action inconnue');
  }
  settle(g, ev, idx);
  return ev;
}

export function isFinalHand(g) {
  const withChips = g.players.filter((p) => !p.out && p.stack > 0);
  return g.handNo >= g.maxHands || withChips.length <= 1 || !withChips.some((p) => p.human);
}

export function nextHand(g) {
  if (g.phase !== 'handOver') throw new Error('La main n\'est pas terminée');
  if (isFinalHand(g)) {
    g.phase = 'gameOver';
    g.ranking = g.players.map((p, i) => i).sort((a, b) => g.players[b].stack - g.players[a].stack || a - b);
    return [{ t: 'gameOver', ranking: [...g.ranking] }];
  }
  return startHand(g);
}
