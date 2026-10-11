import { mulberry32 } from './rng.js';
import { makeBoard, destinations } from './board.js';
import { CATEGORIES } from './categories.js';
import { createDeck } from './questions.js';

export function createGame({ players, wedgesToWin = 6, seed = 1, bank }) {
  if (!Array.isArray(players) || players.length < 1 || players.length > 4) throw new Error('1 à 4 joueurs');
  const nbBots = players.filter((p) => p.bot).length;
  if (nbBots > 3) throw new Error('0 à 3 robots');
  if (nbBots >= players.length) throw new Error('au moins 1 joueur humain');
  for (const p of players) if (![1, 2, 3, 4, 5, 'mix'].includes(p.mode)) throw new Error('mode invalide');
  const rng = mulberry32(seed);
  const deck = createDeck(bank, rng);
  const board = makeBoard();
  const state = {
    phase: 'roll',
    current: 0,
    players: players.map((p) => ({ ...p, pos: 0, parts: [false, false, false, false, false, false], etoiles: 0 })),
    roll: null,
    dests: [],
    question: null,
    lastResult: null,
    winner: null,
  };
  const need = (phase, action) => {
    if (state.phase !== phase) throw new Error(`${action}() impossible en phase "${state.phase}" (attendu : "${phase}")`);
  };
  const nbParts = (p) => p.parts.filter(Boolean).length;

  return {
    state,
    board,
    roll(value) {
      need('roll', 'roll');
      if (value === undefined || value === null) value = 1 + Math.floor(rng() * 6);
      if (!Number.isInteger(value) || value < 1 || value > 6) throw new Error('valeur de dé invalide');
      state.roll = value;
      state.dests = destinations(state.players[state.current].pos, value);
      state.phase = 'choose';
      return value;
    },
    move(dest) {
      need('choose', 'move');
      if (!state.dests.includes(dest)) throw new Error('case non atteignable');
      const p = state.players[state.current];
      p.pos = dest;
      state.question = deck.draw(CATEGORIES[board[dest].cat].id, p.mode);
      state.phase = 'question';
      return state.question;
    },
    answer(i) {
      need('question', 'answer');
      if (![0, 1, 2].includes(i)) throw new Error('réponse invalide');
      const p = state.players[state.current];
      const q = state.question;
      const correct = i === q.bonne;
      let partGagnee = null;
      const caseType = board[p.pos].type === 'quartier' ? 'quartier' : 'normal';
      if (correct) {
        p.etoiles += 1;
        const c = board[p.pos];
        if (c.type === 'quartier' && !p.parts[c.cat]) {
          p.parts[c.cat] = true;
          partGagnee = c.cat;
        }
      }
      state.lastResult = { correct, bonne: q.bonne, explication: q.explication, partGagnee, caseType };
      if (nbParts(p) >= wedgesToWin) {
        state.winner = state.current;
        state.phase = 'over';
      } else state.phase = 'feedback';
      return state.lastResult;
    },
    next() {
      need('feedback', 'next');
      state.current = (state.current + 1) % state.players.length;
      state.roll = null;
      state.dests = [];
      state.question = null;
      state.phase = 'roll';
    },
  };
}
