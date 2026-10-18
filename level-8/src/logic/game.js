// Machine à états du jeu (module pur). Voir .project/ARCHITECTURE.md.
import { mulberry32, shuffle } from './rng.js';
import { makeDeck, isSkip, isWild, isNum, findLayout, buildGroup, canAddToGroup, addCardToGroup, canSwapJoker, swapJokerInGroup, resolveGroup } from './cards.js';
import { AVATARS, botAvatars } from './avatars.js';
import { PALIERS, objectiveAt, objectiveTotal } from './levels.js';

export const BOT_POOL = botAvatars(1);

export function createGame(opts = {}) {
  const { seed = 1, palier = 1, bots = 1, difficulty = 'facile', mode = 'full', shortRounds = 5, maxTurns = 400, maxRounds = 60, jokerSwap = false, avatar = 1 } = opts;
  const pal = PALIERS[palier];
  // places : [{type:'human'|'bot', name, avatar}] (2 à 4) ; sinon compat : un humain 'Toi' + `bots` robots
  let list;
  if (Array.isArray(opts.seats) && opts.seats.length >= 2) {
    list = opts.seats.slice(0, 4).map((x) => ({ type: x.type === 'bot' ? 'bot' : 'human', name: x.name, avatar: x.avatar }));
    if (!list.some((x) => x.type === 'human')) list[0].type = 'human';
  } else {
    const first = AVATARS.find((a) => a.id === avatar) || AVATARS[0];
    list = [{ type: 'human', name: 'Toi', avatar: first.id }];
    botAvatars(first.id).slice(0, Math.max(1, Math.min(3, bots))).forEach((a) => list.push({ type: 'bot', name: a.name, avatar: a.id }));
  }
  // avatars uniques : on garde ceux qui sont valides et libres, les autres prennent les premiers libres
  const used = new Set();
  list.forEach((x) => {
    if (AVATARS.some((a) => a.id === x.avatar) && !used.has(x.avatar)) used.add(x.avatar); else x.avatar = null;
  });
  list.forEach((x) => { if (x.avatar === null) { x.avatar = AVATARS.find((a) => !used.has(a.id)).id; used.add(x.avatar); } });
  const players = list.map((x, i) => {
    const av = AVATARS.find((a) => a.id === x.avatar);
    const name = (x.name && String(x.name).trim().slice(0, 10)) || (x.type === 'bot' ? av.name : `Joueur ${i + 1}`);
    return { id: i, name, emoji: av.emoji, avatar: av.id, isBot: x.type === 'bot', diff: difficulty, hand: [], discard: [], skip: null, laid: false, level: 0 };
  });
  const g = {
    seed, palier, pal, mode, jokerSwap, shortRounds, maxTurns, maxRounds,
    rng: mulberry32(seed), botRng: mulberry32((seed ^ 0x9e3779b9) | 0),
    players, drawPile: [], groups: [], nextGroupId: 1,
    dealer: players.length - 1, current: 0, phase: 'draw', status: 'playing',
    turns: 0, round: 1, events: [], roundResult: null, winners: null,
    levelCount: pal.objectiveIds.length,
  };
  // compat : g.discard = toutes les cartes défaussées (lecture seule)
  Object.defineProperty(g, 'discard', { get() { return g.players.flatMap((p) => p.discard); } });
  startRound(g);
  return g;
}

export const topDiscard = (g, i) => { const d = g.players[i].discard; return d.length ? d[d.length - 1] : null; };

export const objectiveOf = (g, p) => objectiveAt(g.palier, p.level);

export function startRound(g) {
  const deck = shuffle(makeDeck(), g.rng);
  g.players.forEach((p) => { p.hand = []; p.discard = []; p.skip = null; p.laid = false; });
  for (let i = 0; i < g.pal.hand; i++) g.players.forEach((p) => p.hand.push(deck.pop()));
  const buried = [];
  while (deck.length) {
    const c = deck.pop();
    if (isSkip(c)) { buried.push(c); continue; }
    g.players[g.dealer].discard.push(c);
    break;
  }
  g.drawPile = [...buried, ...deck];
  g.groups = [];
  g.current = (g.dealer + 1) % g.players.length;
  g.phase = 'draw';
  g.status = 'playing';
  g.turns = 0;
  g.roundResult = null;
  g.events.push({ t: 'deal' });
}

export function restartRound(g) { startRound(g); }

export function nextRound(g) {
  if (g.status !== 'roundover') return { ok: false, reason: 'state' };
  g.round++;
  g.dealer = (g.dealer + 1) % g.players.length;
  startRound(g);
  return { ok: true };
}

export function setLevel(g, playerIdx, level) {
  g.players[playerIdx].level = Math.max(0, Math.min(g.levelCount - 1, level - 1));
  startRound(g);
}

const cur = (g) => g.players[g.current];
const guard = (g, phase) => (g.status !== 'playing' ? 'state' : g.phase !== phase ? 'phase' : null);

function reshuffleIfNeeded(g) {
  if (g.drawPile.length === 0) {
    // toutes les défausses, sauf la carte du dessus de chacune, refont la pioche
    const rest = [];
    g.players.forEach((p) => { if (p.discard.length > 1) rest.push(...p.discard.splice(0, p.discard.length - 1)); });
    if (rest.length) {
      g.drawPile = shuffle(rest, g.rng);
      g.events.push({ t: 'reshuffle' });
    }
  }
}

// Défausses où l'on peut prendre la carte du dessus (la sienne comprise, jamais une carte passe).
export function takeableDiscards(g) {
  return g.players.map((p, i) => i).filter((i) => { const t = topDiscard(g, i); return !!t && !isSkip(t); });
}

export function canTakeDiscard(g, from) {
  if (from === undefined) return takeableDiscards(g).length > 0;
  const t = g.players[from] ? topDiscard(g, from) : null;
  return !!t && !isSkip(t);
}

function advance(g) {
  g.turns++;
  if (g.turns >= g.maxTurns) { endRound(g, null); return; }
  let next = (g.current + 1) % g.players.length;
  // un joueur qui a une Passe devant lui la remet sous la pioche (face visible) et passe son tour
  while (g.players[next].skip) {
    g.drawPile.unshift(g.players[next].skip);
    g.players[next].skip = null;
    g.events.push({ t: 'skip', p: next });
    next = (next + 1) % g.players.length;
  }
  g.current = next;
  g.phase = 'draw';
  g.events.push({ t: 'turn', p: next });
}

export function drawFromPile(g) {
  const bad = guard(g, 'draw');
  if (bad) return { ok: false, reason: bad };
  reshuffleIfNeeded(g);
  if (!g.drawPile.length) {
    g.events.push({ t: 'stuck', p: g.current });
    advance(g);
    return { ok: true, stuck: true };
  }
  const card = g.drawPile.pop();
  cur(g).hand.push(card);
  g.phase = 'play';
  g.events.push({ t: 'draw', p: g.current, from: 'pile', cardId: card.id });
  return { ok: true, card };
}

export function takeDiscard(g, from = (g.current + g.players.length - 1) % g.players.length) {
  const bad = guard(g, 'draw');
  if (bad) return { ok: false, reason: bad };
  if (!canTakeDiscard(g, from)) return { ok: false, reason: 'nodiscard' };
  const card = g.players[from].discard.pop();
  cur(g).hand.push(card);
  g.phase = 'play';
  g.events.push({ t: 'draw', p: g.current, from: 'discard', fromPlayer: from, cardId: card.id, card });
  return { ok: true, card };
}

export function layDown(g, cardIds) {
  const bad = guard(g, 'play');
  if (bad) return { ok: false, reason: bad };
  const p = cur(g);
  if (p.laid) return { ok: false, reason: 'already' };
  const obj = objectiveOf(g, p);
  const need = objectiveTotal(obj);
  const cards = [...new Set(cardIds)].map((id) => p.hand.find((c) => c.id === id)).filter(Boolean);
  if (cards.length !== need) return { ok: false, reason: 'count', need, have: cards.length };
  const layout = findLayout(cards, obj.groups);
  if (!layout) return { ok: false, reason: 'invalid' };
  p.hand = p.hand.filter((c) => !cards.includes(c));
  const made = layout.map((cs, i) => {
    const grp = buildGroup(cs, obj.groups[i]);
    grp.id = g.nextGroupId++;
    grp.owner = g.current;
    g.groups.push(grp);
    return grp;
  });
  p.laid = true;
  g.events.push({ t: 'lay', p: g.current, groupIds: made.map((x) => x.id) });
  // règle officielle : poser l'objectif du dernier niveau gagne tout de suite
  if (p.level + 1 >= g.levelCount) endRound(g, null, g.current);
  return { ok: true, groups: made };
}

export function addTargets(g, card) {
  const p = cur(g);
  if (!p.laid) return [];
  return g.groups.filter((grp) => canAddToGroup(grp, card));
}

export function addToGroup(g, cardId, groupId) {
  const bad = guard(g, 'play');
  if (bad) return { ok: false, reason: bad };
  const p = cur(g);
  if (!p.laid) return { ok: false, reason: 'notlaid' };
  const card = p.hand.find((c) => c.id === cardId);
  const grp = g.groups.find((x) => x.id === groupId);
  if (!card || !grp) return { ok: false, reason: 'unknown' };
  if (!addCardToGroup(grp, card)) return { ok: false, reason: 'invalid' };
  p.hand = p.hand.filter((c) => c !== card);
  g.events.push({ t: 'add', p: g.current, cardId, groupId });
  if (p.hand.length === 0) endRound(g, g.current);
  return { ok: true };
}

// Reprise d'un joker posé : la vraie carte prend sa place, le joker revient en main.
export function swapJoker(g, cardId, groupId) {
  const bad = guard(g, 'play');
  if (bad) return { ok: false, reason: bad };
  if (!g.jokerSwap) return { ok: false, reason: 'disabled' };
  const p = cur(g);
  if (!p.laid) return { ok: false, reason: 'notlaid' };
  const card = p.hand.find((c) => c.id === cardId);
  const grp = g.groups.find((x) => x.id === groupId);
  if (!card || !grp) return { ok: false, reason: 'unknown' };
  if (!grp.items.some((it) => isWild(it.card))) return { ok: false, reason: 'nojoker' };
  const idx = canSwapJoker(grp, card);
  if (idx < 0) return { ok: false, reason: 'invalid' };
  const test = grp.items.map((it, i) => (i === idx ? card : it.card));
  if (!resolveGroup(test, { t: grp.meta.t, size: test.length })) return { ok: false, reason: 'invalid' };
  const joker = swapJokerInGroup(grp, card);
  p.hand = p.hand.filter((c) => c !== card);
  p.hand.push(joker);
  g.events.push({ t: 'swap', p: g.current, cardId, jokerId: joker.id, groupId, index: idx });
  return { ok: true, joker };
}

// Groupes où la carte peut remplacer un joker (option active, joueur ayant posé).
export function swapTargets(g, card) {
  if (!g.jokerSwap || !cur(g).laid) return [];
  return g.groups.filter((grp) => canSwapJoker(grp, card) >= 0);
}

export function discardCard(g, cardId) {
  const bad = guard(g, 'play');
  if (bad) return { ok: false, reason: bad };
  const p = cur(g);
  const card = p.hand.find((c) => c.id === cardId);
  if (!card) return { ok: false, reason: 'unknown' };
  p.hand = p.hand.filter((c) => c !== card);
  p.discard.push(card);
  g.events.push({ t: 'discard', p: g.current, card });
  if (p.hand.length === 0) { endRound(g, g.current); return { ok: true, out: true }; }
  advance(g);
  return { ok: true };
}

// Fin de manche. Celui qui vide sa main monte de 2 niveaux, les autres qui ont posé de 1 (plafonné au dernier niveau).
// instant : joueur qui vient de poser l'objectif du dernier niveau (victoire immédiate).
// Joueurs devant qui on peut poser une Passe : pas soi-même, pas quelqu'un qui en a déjà une.
export function skipTargets(g) {
  return g.players.map((p, i) => i).filter((i) => i !== g.current && !g.players[i].skip);
}

// Joue une carte Passe de la main devant un adversaire (à la place de jeter). Dernière carte : fin de manche, sans effet.
export function playSkip(g, cardId, target) {
  const bad = guard(g, 'play');
  if (bad) return { ok: false, reason: bad };
  const p = cur(g);
  const card = p.hand.find((c) => c.id === cardId);
  if (!card || !isSkip(card)) return { ok: false, reason: 'unknown' };
  if (p.hand.length === 1) return discardCard(g, cardId);
  if (!skipTargets(g).includes(target)) return { ok: false, reason: 'target' };
  p.hand = p.hand.filter((c) => c !== card);
  g.players[target].skip = card;
  g.events.push({ t: 'skipplay', p: g.current, target, card });
  advance(g);
  return { ok: true };
}

export function endRound(g, out, instant = null) {
  const prevLevels = g.players.map((p) => p.level);
  const gains = g.players.map((p, i) => (i === out ? 2 : p.laid ? 1 : 0));
  const advanced = [];
  g.players.forEach((p, i) => {
    p.level = Math.min(g.levelCount, p.level + gains[i]);
    if (gains[i] > 0) advanced.push(i);
  });
  g.status = 'roundover';
  g.phase = 'none';
  g.roundResult = { out, prevLevels, advanced, gains, handCounts: g.players.map((p) => p.hand.length), instant };
  const finishers = g.players.map((p, i) => i).filter((i) => g.players[i].level >= g.levelCount);
  const leaders = () => {
    const m = Math.max(...g.players.map((p) => p.level));
    return g.players.map((p, i) => i).filter((i) => g.players[i].level === m);
  };
  if (instant !== null || finishers.length) {
    let w = instant !== null ? instant : finishers.includes(out) ? out : null;
    if (w === null) {
      w = finishers.slice().sort((a, b) => g.players[a].hand.length - g.players[b].hand.length || a - b)[0];
    }
    g.winners = [w];
    g.status = 'over';
  } else if ((g.mode === 'short' && g.round >= g.shortRounds) || g.round >= g.maxRounds) {
    g.winners = leaders();
    g.status = 'over';
  }
  g.events.push({ t: g.status === 'over' ? 'gameover' : 'roundover' });
}

export function applyAction(g, a) {
  switch (a.type) {
    case 'draw': return drawFromPile(g);
    case 'takeDiscard': return takeDiscard(g, a.from);
    case 'lay': return layDown(g, a.ids);
    case 'add': return addToGroup(g, a.cardId, a.groupId);
    case 'swap': return swapJoker(g, a.cardId, a.groupId);
    case 'skip': return playSkip(g, a.cardId, a.target);
    case 'discard': return discardCard(g, a.cardId);
    default: return { ok: false, reason: 'unknown' };
  }
}

// Débogage : remplace des cartes de la main par les cartes voulues ('J', 'P' ou {n,c}).
export function forceHand(g, playerIdx, wanted) {
  const p = g.players[playerIdx];
  const match = (c, w) => (w === 'J' ? isWild(c) : w === 'P' ? isSkip(c) : isNum(c) && c.n === w.n && c.c === w.c);
  const keep = [];
  const mine = p.hand.slice();
  const out = [];
  for (const w of wanted) {
    let i = mine.findIndex((c) => match(c, w) && !keep.includes(c));
    if (i >= 0) { keep.push(mine[i]); continue; }
    for (const pile of [g.drawPile, ...g.players.map((q) => q.discard)]) {
      i = pile.findIndex((c) => match(c, w));
      if (i >= 0) { keep.push(pile.splice(i, 1)[0]); break; }
    }
  }
  const rest = mine.filter((c) => !keep.includes(c));
  const need = p.hand.length - keep.length;
  p.hand = [...keep, ...rest.slice(0, Math.max(0, need))];
  g.drawPile.push(...rest.slice(Math.max(0, need)));
  void out;
  return p.hand;
}
