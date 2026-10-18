// Robots (pur) : jamais d'action illégale, jamais appelés pour un humain.
import { evaluate, compareHands } from './hand.js';
import { legalActions, potTotal } from './poker.js';

// Réglages par palier : 1 prudents, 2 relances de valeur, 3 bluff et position.
const STYLE = {
  1: { foldBelow: 0.38, raiseAt: 0.82, raiseFreq: 0.35, bluff: 0, semi: 0 },
  2: { foldBelow: 0.32, raiseAt: 0.66, raiseFreq: 0.6, bluff: 0, semi: 0 },
  3: { foldBelow: 0.3, raiseAt: 0.6, raiseFreq: 0.75, bluff: 0.1, semi: 0.4 },
};

// Force préflop 0..1 (paire, hautes cartes, assorties, connectées).
export function preflopStrength(hole) {
  const [a, b] = [...hole].sort((x, y) => y.r - x.r);
  if (a.r === b.r) return 0.5 + ((a.r - 2) / 12) * 0.5;
  const gap = a.r - b.r - 1;
  return Math.min(0.78, ((a.r - 2) / 12) * 0.45 + ((b.r - 2) / 12) * 0.2 + (a.s === b.s ? 0.06 : 0) + (gap === 0 ? 0.05 : gap === 1 ? 0.02 : 0));
}

const BASE = [0.12, 0.42, 0.68, 0.78, 0.85, 0.88, 0.93, 0.98, 1];

// Tirage couleur ou quinte avec nos cartes (avant la river).
export function drawPotential(hole, board) {
  if (board.length < 3 || board.length >= 5) return 0;
  const all = [...hole, ...board];
  let d = 0;
  for (const s of ['S', 'H', 'D', 'C']) {
    if (all.filter((c) => c.s === s).length === 4 && hole.some((c) => c.s === s)) d = Math.max(d, 0.15);
  }
  const rs = new Set(all.map((c) => c.r)); if (rs.has(14)) rs.add(1);
  const mine = new Set(hole.map((c) => c.r)); if (mine.has(14)) mine.add(1);
  for (let lo = 1; lo <= 10; lo++) {
    let n = 0, usesMine = false;
    for (let k = 0; k < 5; k++) if (rs.has(lo + k)) { n++; if (mine.has(lo + k)) usesMine = true; }
    if (n === 4 && usesMine) d = Math.max(d, 0.1);
  }
  return d;
}

export function handStrength(hole, board) {
  if (board.length < 3) return preflopStrength(hole);
  const mine = evaluate([...hole, ...board]);
  const bd = evaluate(board);
  if (mine.cat === bd.cat && compareHands(mine, bd) === 0) return 0.14; // la table joue seule
  let s = BASE[mine.cat];
  if (mine.cat === 1) s = 0.3 + ((mine.ranks[1] - 2) / 12) * 0.3;
  else if (mine.cat === 0) s = 0.06 + ((mine.ranks[1] - 2) / 12) * 0.12;
  return Math.min(1, s + drawPotential(hole, board));
}

// Position 0 (premier à parler) .. 1 (donneur, dernier à parler).
function position(g) {
  const act = g.players.map((p, i) => (p.out ? -1 : i)).filter((i) => i >= 0);
  const k = act.length;
  const order = act.map((i) => (i - g.dealer - 1 + g.players.length) % g.players.length).sort((a, b) => a - b);
  const me = (g.current - g.dealer - 1 + g.players.length) % g.players.length;
  return k <= 1 ? 1 : order.indexOf(me) / (k - 1);
}

export function botDecision(g, rng = Math.random) {
  if (g.phase !== 'betting') throw new Error('Pas de tour en cours');
  if (g.players[g.current].human) throw new Error('Un robot ne joue jamais pour un humain');
  return strategyDecision(g, rng);
}

// Même stratégie sans garde : sert au crochet de débogage (autoPlay) pour jouer à la place d'un humain.
export function strategyDecision(g, rng = Math.random) {
  const p = g.players[g.current];
  const L = legalActions(g);
  const st = STYLE[g.palier] || STYLE[1];
  const strength = handStrength(p.hole, g.board);
  const pot = potTotal(g);
  const toCall = L.call;
  const potOdds = toCall / (pot + toCall || 1);
  const pos = position(g);

  const raiseTo = (frac) => {
    if (!L.raise) return null;
    const want = g.currentBet + Math.max(g.minRaise, Math.round(pot * frac));
    return { type: 'raise', to: Math.max(L.raise.min, Math.min(L.raise.max, want)) };
  };
  const shove = () => (L.allin ? { type: 'allin' } : null);
  const passive = () => (L.check ? { type: 'check' } : toCall > 0 ? { type: 'call' } : { type: 'fold' });
  let action = null;

  if (L.check) {
    // Personne n'a misé : parler, ou miser avec une belle main.
    if (strength >= st.raiseAt && rng() < st.raiseFreq) action = raiseTo(0.4 + rng() * (g.palier === 3 ? 0.7 : 0.3));
    else if (st.bluff && strength < 0.45 && rng() < st.bluff + 0.12 * pos) action = raiseTo(0.5 + rng() * 0.5);
    else if (st.semi && drawPotential(p.hole, g.board) > 0 && rng() < st.semi) action = raiseTo(0.5);
    action = action || { type: 'check' };
  } else {
    const bigBet = toCall >= p.stack * 0.5;
    const need = Math.max(st.foldBelow, Math.min(0.9, potOdds * 1.25 + 0.12 + (bigBet ? 0.1 : 0)));
    if (strength >= Math.max(st.raiseAt, 0.8) && L.raise && rng() < st.raiseFreq) {
      action = strength > 0.93 && rng() < 0.3 ? shove() : raiseTo(0.6 + rng() * 0.6);
    } else if (st.bluff && strength < 0.4 && L.raise && !bigBet && rng() < st.bluff * (0.4 + pos)) {
      action = raiseTo(0.7 + rng() * 0.5);
    } else if (strength >= need || (g.palier === 1 && toCall <= g.blinds.bb && strength >= 0.3 && toCall < p.stack * 0.15)) {
      action = { type: 'call' };
    } else if (st.semi && drawPotential(p.hole, g.board) > 0 && potOdds < 0.3) {
      action = { type: 'call' };
    } else action = { type: 'fold' };
  }
  action = action || passive();
  // Garde-fou : toujours légal, jamais de fold si on peut parler.
  if (action.type === 'raise') {
    if (!L.raise) action = passive();
    else action.to = Math.max(L.raise.min, Math.min(L.raise.max, Math.round(action.to)));
  }
  if (action.type === 'allin' && !L.allin) action = passive();
  if (action.type === 'check' && !L.check) action = toCall > 0 ? { type: 'call' } : { type: 'fold' };
  if (action.type === 'call' && !L.call) action = L.check ? { type: 'check' } : { type: 'fold' };
  if (action.type === 'fold' && L.check) action = { type: 'check' };
  return action;
}
