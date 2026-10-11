import { shuffle } from './rng.js';

export const CYCLES = {
  plante: ['graine', 'pousse', 'fleur', 'fruit'],
  papillon: ['oeuf', 'chenille', 'chrysalide', 'papillon'],
};

export function makeCycleRound(level, rng) {
  if (level <= 1) {
    const seq = CYCLES.plante;
    return { cycle: 'plante', slots: [seq[0], null, null, null], hand: shuffle(seq.slice(1), rng), level };
  }
  const seq = CYCLES.papillon;
  let hand = seq.slice();
  if (level >= 3) {
    const intrus = shuffle(CYCLES.plante, rng)[0];
    hand = [...hand, intrus];
  }
  return { cycle: 'papillon', slots: [null, null, null, null], hand: shuffle(hand, rng), level };
}

export function placeCard(round, cardId, slotIndex) {
  const seq = CYCLES[round.cycle];
  if (!round.hand.includes(cardId) || slotIndex < 0 || slotIndex >= seq.length || round.slots[slotIndex] !== null) {
    return { round, ok: false, hint: 'apres' };
  }
  const idx = seq.indexOf(cardId);
  if (idx === -1) return { round, ok: false, hint: 'intrus' };
  if (idx !== slotIndex) return { round, ok: false, hint: idx < slotIndex ? 'avant' : 'apres' };
  const slots = round.slots.slice();
  slots[slotIndex] = cardId;
  return { round: { ...round, slots, hand: round.hand.filter((c) => c !== cardId) }, ok: true, hint: null };
}

export function nextSlot(round) {
  return round.slots.indexOf(null);
}
export function isComplete(round) {
  return nextSlot(round) === -1;
}
