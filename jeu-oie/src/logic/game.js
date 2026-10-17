// Règles du jeu de l'oie (logique pure, sans DOM ni three).
import { makeBoard } from './board.js';
import { mulberry32 } from './rng.js';
import { PLAYERS } from './texts.js';

const sum = (a) => a.reduce((s, v) => s + v, 0);

export function createGame({ palier = 1, bots = 1, difficulty = 'facile', death = true, seed = 1 } = {}) {
  const board = makeBoard(palier, { death });
  const count = 1 + Math.max(1, Math.min(3, bots));
  const players = PLAYERS.slice(0, count).map((p, id) => ({
    id, name: p.name, emoji: p.emoji, color: p.color, bot: id > 0, pos: 0, skip: 0, rest: null,
  }));
  return {
    palier, board, n: board.n, players, turn: 0, over: false, winner: null,
    diceCount: palier === 3 ? 2 : 1, difficulty, rng: mulberry32(seed), turnCount: 0,
  };
}

export function rollDice(state) {
  return Array.from({ length: state.diceCount }, () => 1 + Math.floor(state.rng() * 6));
}

// « facile » : un adversaire très en tête relance une fois un très grand résultat.
export function botRollDice(state) {
  let d = rollDice(state);
  if (state.difficulty === 'facile') {
    const me = state.players[state.turn];
    const human = state.players[0];
    if (me.bot && me.pos - human.pos >= 8 && sum(d) >= state.diceCount * 6 - 1) d = rollDice(state);
  }
  return d;
}

// Cases visitées une par une ; après la dernière case on revient en arrière.
export function walkPath(n, from, steps) {
  const path = [];
  let cur = from, dir = 1;
  for (let i = 0; i < steps; i++) {
    if (dir === 1 && cur === n) dir = -1;
    cur += dir;
    path.push(cur);
  }
  return path;
}

export function firstLanding(state, pid, total) {
  const path = walkPath(state.n, state.players[pid].pos, total);
  return path.length ? path[path.length - 1] : state.players[pid].pos;
}

export function applyRoll(state, dice) {
  if (state.over) throw new Error('partie terminée');
  const p = state.players[state.turn];
  const total = sum(dice);
  const events = [{ t: 'roll', pid: p.id, dice: dice.slice(), total }];
  const { n, board } = state;
  let chain = 0;
  for (;;) {
    const from = p.pos;
    const path = walkPath(n, from, total);
    if (from + total > n) events.push({ t: 'bounce', pid: p.id });
    events.push({ t: 'walk', pid: p.id, from, path });
    p.pos = path.length ? path[path.length - 1] : from;
    if (p.pos === n) {
      events.push({ t: 'win', pid: p.id });
      state.over = true;
      state.winner = p.id;
      return events;
    }
    const c = board.cases[p.pos];
    if (c.type === 'oie') {
      // une seule oie par tour : la suivante est une case ordinaire (pas de bulle sans mouvement)
      if (chain++ > 0) break;
      events.push({ t: 'special', pid: p.id, at: p.pos, kind: 'oie' });
      continue;
    }
    if (c.type === 'pont' || c.type === 'labyrinthe' || c.type === 'mort') {
      events.push({ t: 'special', pid: p.id, at: p.pos, kind: c.type });
      events.push({ t: 'jump', pid: p.id, from: p.pos, to: c.target, kind: c.type });
      p.pos = c.target;
    } else if (c.type === 'auberge') {
      p.skip = 1; p.rest = 'auberge';
      events.push({ t: 'special', pid: p.id, at: p.pos, kind: 'auberge' });
      events.push({ t: 'rest', pid: p.id, kind: 'auberge', turns: 1 });
    } else if (c.type === 'puits' || c.type === 'prison') {
      for (const q of state.players) {
        if (q !== p && q.pos === p.pos && q.skip > 0 && (q.rest === 'puits' || q.rest === 'prison')) {
          q.skip = 0; q.rest = null;
          events.push({ t: 'release', pid: q.id, at: p.pos });
        }
      }
      p.skip = 2; p.rest = c.type;
      events.push({ t: 'special', pid: p.id, at: p.pos, kind: c.type });
      events.push({ t: 'rest', pid: p.id, kind: c.type, turns: 2 });
    }
    break;
  }
  // tour suivant, en sautant les pions au repos
  let guard = 0;
  do {
    state.turn = (state.turn + 1) % state.players.length;
    const q = state.players[state.turn];
    if (q.skip > 0) {
      q.skip--;
      if (q.skip === 0) q.rest = null;
      events.push({ t: 'turnSkipped', pid: q.id });
      continue;
    }
    break;
  } while (++guard < 50);
  state.turnCount++;
  events.push({ t: 'turn', pid: state.turn });
  return events;
}
