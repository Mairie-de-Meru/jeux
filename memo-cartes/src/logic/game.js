// Machine d'état de partie, pure et immuable.
export function createGame(deck, players = 1) {
  return {
    cards: deck.map((c) => ({
      index: c.index, pairKey: c.pairKey, nom: c.nom, emoji: c.emoji,
      state: 'hidden', owner: null,
    })),
    players: players === 2 ? 2 : 1,
    current: 0,
    scores: [0, 0],
    tries: 0,
    triesBy: [0, 0],
    pending: null,
    phase: 'playing',
  };
}

const ignored = (state) => ({ state, event: { type: 'ignored' } });

export function flip(state, index) {
  if (state.phase === 'won' || state.pending) return ignored(state);
  if (!Number.isInteger(index) || index < 0 || index >= state.cards.length) return ignored(state);
  if (state.cards[index].state !== 'hidden') return ignored(state);

  const cards = state.cards.map((c) => ({ ...c }));
  cards[index].state = 'shown';
  const other = cards.find((c) => c.state === 'shown' && c.index !== index);

  if (!other) {
    return { state: { ...state, cards, scores: state.scores.slice(), triesBy: state.triesBy.slice() }, event: { type: 'first', index } };
  }
  const tries = state.tries + 1;
  const triesBy = state.triesBy.slice();
  triesBy[state.current]++;
  const pair = [other.index, index];
  if (other.pairKey === cards[index].pairKey) {
    const player = state.current;
    cards[other.index].state = 'matched';
    cards[other.index].owner = player;
    cards[index].state = 'matched';
    cards[index].owner = player;
    const scores = state.scores.slice();
    scores[player]++;
    const won = cards.every((c) => c.state === 'matched');
    const next = { ...state, cards, scores, tries, triesBy, phase: won ? 'won' : 'playing' };
    const event = { type: 'match', indices: pair, pairKey: cards[index].pairKey, nom: cards[index].nom, player };
    if (won) event.won = true;
    return { state: next, event };
  }
  return {
    state: { ...state, cards, scores: state.scores.slice(), tries, triesBy, pending: pair },
    event: { type: 'mismatch', indices: pair },
  };
}

export function resolvePending(state) {
  if (!state.pending) return state;
  const cards = state.cards.map((c) => ({ ...c }));
  for (const i of state.pending) cards[i].state = 'hidden';
  return {
    ...state,
    cards,
    scores: state.scores.slice(),
    triesBy: state.triesBy.slice(),
    pending: null,
    current: state.players === 2 ? 1 - state.current : state.current,
  };
}

export const isWon = (state) => state.phase === 'won';

export function winner(state) {
  if (state.players !== 2 || state.phase !== 'won') return null;
  const [a, b] = state.scores;
  return a === b ? 'egalite' : a > b ? 0 : 1;
}
