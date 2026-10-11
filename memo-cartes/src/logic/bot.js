// Robot de mémoire (pur) : mémoire partielle des cartes vues, choix sans jamais viser une carte visible.
export const BOT_SKILL = 0.3;
// probabilité que le robot, distrait, ignore sa mémoire et joue au hasard
export const BOT_DISTRACTION = 0.3;

export const createBotMemory = () => ({ seen: {} });

export function observe(memory, event, state, rng, skill = BOT_SKILL) {
  const seen = { ...memory.seen };
  if (event.type === 'match') {
    for (const i of event.indices) delete seen[i];
  } else if (event.type === 'first' || event.type === 'mismatch') {
    // sur une erreur, seule la 2e carte est nouvelle (la 1re a été vue à l'événement first)
    const indices = event.type === 'first' ? [event.index] : event.indices.slice(1);
    for (const i of indices) {
      if (rng() < skill) seen[i] = state.cards[i].pairKey;
    }
  }
  return { seen };
}

const hiddenIndices = (state) => state.cards.filter((c) => c.state === 'hidden').map((c) => c.index);
const pick = (list, rng) => list[Math.floor(rng() * list.length)];

export function chooseFirst(state, memory, rng, distraction = BOT_DISTRACTION) {
  const hidden = hiddenIndices(state);
  const byKey = {};
  for (const i of hidden) {
    const k = memory.seen[i];
    if (k !== undefined) (byKey[k] ||= []).push(i);
  }
  const pairs = Object.values(byKey).filter((l) => l.length >= 2);
  if (pairs.length && rng() >= distraction) return pick(pairs[0], rng);
  const unknown = hidden.filter((i) => memory.seen[i] === undefined);
  return pick(unknown.length ? unknown : hidden, rng);
}

export function chooseSecond(state, memory, firstIndex, rng, distraction = BOT_DISTRACTION) {
  const hidden = hiddenIndices(state).filter((i) => i !== firstIndex);
  const key = state.cards[firstIndex].pairKey;
  // la mémoire peut avoir retenu la 1re carte : on cherche une jumelle mémorisée
  const twin = hidden.find((i) => memory.seen[i] === key);
  if (twin !== undefined && rng() >= distraction) return twin;
  const unknown = hidden.filter((i) => memory.seen[i] === undefined);
  return pick(unknown.length ? unknown : hidden, rng);
}
