// Worker module : le calcul du robot ne tourne jamais sur le fil principal.
import { chooseMove } from './bot.js';
import { legalMoves } from './rules.js';
import { mulberry32 } from './rng.js';

self.onmessage = (e) => {
  const { id, state, opts } = e.data;
  try {
    const moves = legalMoves(state);
    const move = chooseMove(state, { ...opts, rng: mulberry32(opts?.seed ?? 1) });
    const index = moves.findIndex((m) => m.from === move.from && m.path.join() === move.path.join() && m.captures.join() === move.captures.join());
    self.postMessage({ id, index });
  } catch (err) {
    self.postMessage({ id, error: String(err && err.message || err) });
  }
};
