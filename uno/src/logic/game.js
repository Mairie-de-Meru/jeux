// Règles du jeu de cartes (pur : pas de DOM, pas de three).
import { shuffle } from './rng.js';

export const COLORS = ['R', 'B', 'G', 'Y'];
export const COLOR_NAMES = { R: 'rouge', B: 'bleu', G: 'vert', Y: 'jaune' };
export const BOT_ANIMALS = [
  { name: 'Renard', emoji: '🦊' },
  { name: 'Panda', emoji: '🐼' },
  { name: 'Koala', emoji: '🐨' },
  { name: 'Hibou', emoji: '🦉' },
];
export const HAND_SIZE = 7;

// kind : 'num' | 'skip' | 'rev' | 'draw2' | 'wild' | 'wild4'
export function buildDeck(palier) {
  const cards = [];
  let id = 0;
  const add = (color, kind, value = null) => cards.push({ id: id++, color, kind, value });
  for (const c of COLORS) {
    add(c, 'num', 0);
    for (let v = 1; v <= 9; v++) { add(c, 'num', v); add(c, 'num', v); }
    if (palier >= 2) {
      for (const k of ['skip', 'rev', 'draw2']) { add(c, k); add(c, k); }
    }
  }
  if (palier >= 3) {
    for (let i = 0; i < 4; i++) { add(null, 'wild'); add(null, 'wild4'); }
  }
  return cards;
}

export function isWild(card) { return card.kind === 'wild' || card.kind === 'wild4'; }

export function isPlayable(card, top, topColor) {
  if (isWild(card)) return true;
  if (card.color === topColor) return true;
  if (card.kind !== 'num') return card.kind === top.kind;
  return top.kind === 'num' && top.value === card.value;
}

export function createGame({ palier = 1, bots = 1, difficulty = 'facile', rng, names } = {}) {
  if (!rng) throw new Error('rng requis');
  bots = Math.max(1, Math.min(3, bots));
  palier = Math.max(1, Math.min(3, palier));
  const animals = names || BOT_ANIMALS.slice(0, bots);
  const players = [{ name: 'Toi', emoji: '🧒', human: true, hand: [] }];
  for (let i = 0; i < bots; i++) {
    players.push({ name: animals[i].name, emoji: animals[i].emoji, human: false, hand: [] });
  }
  const draw = shuffle(buildDeck(palier), rng);
  const total = draw.length;
  for (let r = 0; r < HAND_SIZE; r++) for (const p of players) p.hand.push(draw.pop());
  // carte de départ : toujours un nombre
  let idx = draw.length - 1;
  while (draw[idx].kind !== 'num') idx--;
  const start = draw.splice(idx, 1)[0];
  return {
    palier, difficulty, rng, players, draw, discard: [start], total,
    current: 0, dir: 1, topColor: start.color, drawn: null,
    phase: 'play', winner: null, ranking: [], turns: 0,
  };
}

export function topCard(g) { return g.discard[g.discard.length - 1]; }

export function nextIndex(g, steps = 1) {
  const n = g.players.length;
  return (((g.current + g.dir * steps) % n) + n) % n;
}

export function legalMoves(g, p = g.current) {
  if (g.phase !== 'play') return [];
  const hand = g.players[p].hand;
  if (p === g.current && g.drawn !== null) return hand.filter((c) => c.id === g.drawn);
  const top = topCard(g);
  return hand.filter((c) => isPlayable(c, top, g.topColor));
}

// Pioche n cartes (remélange la défausse si besoin). Peut en rendre moins.
function takeCards(g, n, events) {
  const out = [];
  for (let i = 0; i < n; i++) {
    if (g.draw.length === 0 && g.discard.length > 1) {
      const top = g.discard.pop();
      g.draw = shuffle(g.discard, g.rng);
      g.discard = [top];
      events.push({ t: 'reshuffle' });
    }
    if (g.draw.length === 0) break;
    out.push(g.draw.pop());
  }
  return out;
}

function giveCards(g, p, n, events, extra = {}) {
  const cards = takeCards(g, n, events);
  g.players[p].hand.push(...cards);
  events.push({ t: 'draw', p, n: cards.length, cards, ...extra });
  return cards;
}

function finish(g, winner, events) {
  g.phase = 'over';
  g.winner = winner;
  g.ranking = g.players
    .map((pl, p) => ({ p, name: pl.name, emoji: pl.emoji, left: pl.hand.length, human: pl.human }))
    .sort((a, b) => a.left - b.left || (a.p === winner ? -1 : b.p === winner ? 1 : a.p - b.p));
  events.push({ t: 'win', p: winner });
}

export function play(g, cardId, opts = {}) {
  if (g.phase !== 'play') throw new Error('partie terminée');
  const p = g.current;
  const player = g.players[p];
  const card = player.hand.find((c) => c.id === cardId);
  if (!card) throw new Error('carte absente de la main');
  if (!legalMoves(g, p).some((c) => c.id === cardId)) throw new Error('coup illégal');
  if (isWild(card) && !COLORS.includes(opts.color)) throw new Error('couleur requise');
  const events = [];
  const before = player.hand.length;
  player.hand = player.hand.filter((c) => c.id !== cardId);
  g.discard.push(card);
  g.topColor = isWild(card) ? opts.color : card.color;
  g.drawn = null;
  g.turns++;
  events.push({ t: 'play', p, card, color: g.topColor });

  if (before === 2) {
    if (!player.human || opts.uno) events.push({ t: 'uno', p });
    else {
      const penalty = g.palier >= 3;
      events.push({ t: 'unoForgot', p, penalty });
      if (penalty) giveCards(g, p, 1, events, { penalty: true });
    }
  }
  if (player.hand.length === 0) { finish(g, p, events); return events; }

  const advance = (steps) => { g.current = nextIndex(g, steps); };
  switch (card.kind) {
    case 'rev':
      g.dir *= -1;
      events.push({ t: 'reverse', dir: g.dir });
      if (g.players.length === 2) { events.push({ t: 'skip', p: nextIndex(g, 1) }); advance(2); }
      else advance(1);
      break;
    case 'skip':
      events.push({ t: 'skip', p: nextIndex(g, 1) });
      advance(2);
      break;
    case 'draw2':
    case 'wild4': {
      const target = nextIndex(g, 1);
      giveCards(g, target, card.kind === 'draw2' ? 2 : 4, events, { penalty: false, byCard: true });
      events.push({ t: 'skip', p: target });
      advance(2);
      break;
    }
    default:
      advance(1);
  }
  return events;
}

// Le joueur courant pioche une carte. Si elle est jouable il peut la jouer (g.drawn), sinon le tour passe.
export function drawCard(g) {
  if (g.phase !== 'play') throw new Error('partie terminée');
  if (g.drawn !== null) throw new Error('déjà pioché');
  const p = g.current;
  const events = [];
  const cards = giveCards(g, p, 1, events);
  g.turns++;
  if (cards.length === 0) {
    events.push({ t: 'pass', p });
    g.current = nextIndex(g, 1);
  } else if (isPlayable(cards[0], topCard(g), g.topColor)) {
    g.drawn = cards[0].id;
  } else {
    events.push({ t: 'pass', p });
    g.current = nextIndex(g, 1);
  }
  return events;
}

// Garder la carte piochée sans la jouer.
export function keepCard(g) {
  if (g.drawn === null) throw new Error('rien à garder');
  const p = g.current;
  g.drawn = null;
  g.current = nextIndex(g, 1);
  return [{ t: 'pass', p }];
}
