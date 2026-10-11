// Machine d'état d'une mission. Module pur ; chaque fonction renvoie un nouvel état.
import { LEVELS, factsFor, inputForTables, mulberry32 } from './tables.js';
import { createDeck, recordAnswer, pickNext } from './srs.js';

export const STAGES_TO_LAUNCH = 5;

function buildDeck(tables, previous) {
  const deck = createDeck(factsFor(tables));
  if (previous) {
    for (const key of Object.keys(deck.weights)) {
      if (key in previous.weights) deck.weights[key] = previous.weights[key];
    }
  }
  return deck;
}

export function createMission({ level = 1, tables, input, rng, deck } = {}) {
  const lvl = LEVELS.find((l) => l.id === level) ?? LEVELS[0];
  const t = tables && tables.length ? tables : lvl.tables;
  const random = rng ?? mulberry32(Date.now());
  const d = buildDeck(t, deck);
  return {
    level: lvl.id,
    tables: t,
    input: input ?? (tables ? inputForTables(t) : lvl.input),
    rng: random,
    deck: d,
    current: pickNext(d, random, null),
    stages: 0,
    mistakesOnCurrent: 0,
    stars: 0,
    phase: 'question',
  };
}

export function submitAnswer(state, value) {
  if (state.phase !== 'question') return { state, result: 'wrong', hintLevel: 0 };
  const fact = state.current;
  if (Number(value) !== fact.answer) {
    const mistakes = state.mistakesOnCurrent + 1;
    // pénalité une seule fois par fait (à la première erreur)
    const deck = state.mistakesOnCurrent === 0 ? recordAnswer(state.deck, fact.key, false) : state.deck;
    return {
      state: { ...state, deck, mistakesOnCurrent: mistakes },
      result: 'wrong',
      hintLevel: Math.min(mistakes, 2),
    };
  }
  const firstTry = state.mistakesOnCurrent === 0;
  const deck = firstTry ? recordAnswer(state.deck, fact.key, true) : state.deck;
  const stages = state.stages + 1;
  const stars = state.stars + (firstTry ? 1 : 0);
  const launch = stages >= STAGES_TO_LAUNCH;
  return {
    state: {
      ...state,
      deck,
      stages,
      stars,
      mistakesOnCurrent: 0,
      phase: launch ? 'launch' : 'question',
      current: launch ? null : pickNext(deck, state.rng, fact.key),
      lastKey: fact.key,
    },
    result: 'correct',
    hintLevel: 0,
  };
}

export function nextMission(state) {
  const current = pickNext(state.deck, state.rng, state.lastKey ?? null);
  return { ...state, stages: 0, stars: 0, mistakesOnCurrent: 0, phase: 'question', current };
}
