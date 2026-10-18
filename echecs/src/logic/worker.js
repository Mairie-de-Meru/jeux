// Web Worker module : calcule le coup du robot hors du fil principal.
import { chooseMove } from './bot.js';

self.onmessage = (e) => {
  const { id, fen, level, seed, timeMs } = e.data;
  try {
    self.postMessage({ id, move: chooseMove(fen, level, seed, { timeMs }) });
  } catch (err) {
    self.postMessage({ id, error: String(err && err.message ? err.message : err) });
  }
};
