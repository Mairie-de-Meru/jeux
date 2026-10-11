// Paliers, génération des manches et évaluation. Module pur.
import { ITEMS } from './items.js';
import { randInt, pick } from './rng.js';
import { formatEuros, spokenEuros, minPieces, minPieceCount, sum } from './money.js';

export const LEVELS = [
  { id: 1, title: 'Prix ronds', icon: '🍎', rounds: 5, allowed: [100, 200, 500, 1000], mode: 'pay' },
  { id: 2, title: 'Peu de pièces', icon: '🧩', rounds: 5, allowed: [100, 200, 500, 1000], mode: 'fewest' },
  { id: 3, title: 'Centimes', icon: '🪙', rounds: 5, allowed: [1, 2, 5, 10, 20, 50, 100, 200, 500], mode: 'pay' },
  { id: 4, title: 'Marchand', icon: '🧑‍🍳', rounds: 5, allowed: [10, 20, 50, 100, 200, 500], mode: 'change' },
];

export function getLevel(levelId) {
  const l = LEVELS.find((x) => x.id === levelId);
  if (!l) throw new Error(`Palier inconnu : ${levelId}`);
  return l;
}

export function makeRound(levelId, roundIndex, rng) {
  const level = getLevel(levelId);
  const item = pick(rng, ITEMS);
  let price;
  let paid = null;
  if (levelId === 1) {
    price = 100 * (roundIndex === 0 ? randInt(rng, 1, 3) : randInt(rng, 1, 10));
  } else if (levelId === 2) {
    price = 0;
    for (let i = 0; i < 12; i++) {
      price = 100 * randInt(rng, 3, 20);
      if (minPieceCount(price, level.allowed) >= 2) break;
    }
  } else if (levelId === 3) {
    price = roundIndex < 3 ? 10 * randInt(rng, 1, 50) : randInt(rng, 10, 500);
  } else {
    price = 10 * randInt(rng, 5, 95);
    const cands = [200, 500, 1000].filter((v) => v > price);
    paid = cands[0];
    if (cands.length > 1 && rng() < 0.3) paid = cands[1];
  }
  const target = levelId === 4 ? paid - price : price;
  return {
    levelId,
    roundIndex,
    item,
    price,
    paid,
    target,
    allowed: level.allowed.slice(),
    mode: level.mode,
  };
}

export function evaluate(round, values) {
  if (!values || values.length === 0) return { ok: false, code: 'empty' };
  const total = sum(values);
  if (total < round.target) return { ok: false, code: 'tooLittle', missing: round.target - total };
  if (total > round.target) return { ok: false, code: 'tooMuch', extra: total - round.target };
  if (round.mode === 'fewest') {
    const best = minPieces(round.target, round.allowed);
    if (values.length > best.length) return { ok: false, code: 'tooManyPieces', best };
  }
  return { ok: true, code: 'ok' };
}

export function hintText(round, result) {
  switch (result.code) {
    case 'ok': return 'Bravo !';
    case 'empty': return round.mode === 'change' ? 'Pose la monnaie sur le comptoir.' : 'Pose des pièces sur le comptoir.';
    case 'tooLittle': return `Presque ! Il manque ${formatEuros(result.missing)}.`;
    case 'tooMuch': return `Oups, c'est trop. Enlève ${formatEuros(result.extra)}.`;
    case 'tooManyPieces': return "C'est juste ! Essaie avec moins de pièces.";
    default: return 'Essaie encore !';
  }
}

export function hintSpeech(round, result) {
  switch (result.code) {
    case 'tooLittle': return `Presque ! Il manque ${spokenEuros(result.missing)}.`;
    case 'tooMuch': return `Oups, c'est trop. Enlève ${spokenEuros(result.extra)}.`;
    default: return hintText(round, result);
  }
}

export function instructionText(round) {
  if (round.mode === 'change') return `Le client donne ${formatEuros(round.paid)}. Rends la monnaie !`;
  const base = `Paie ${round.item.def} : ${formatEuros(round.price)}.`;
  return round.mode === 'fewest' ? `${base} Peu de pièces !` : base;
}

export function instructionSpeech(round) {
  if (round.mode === 'change') {
    return `${round.item.def[0].toUpperCase()}${round.item.def.slice(1)} coûte ${spokenEuros(round.price)}. Le client donne ${spokenEuros(round.paid)}. Rends la monnaie !`;
  }
  const base = `Paie ${round.item.def} : ${spokenEuros(round.price)}.`;
  return round.mode === 'fewest' ? `${base} Avec peu de pièces !` : base;
}

export function starsFor(attempts) {
  if (attempts <= 1) return 3;
  if (attempts === 2) return 2;
  return 1;
}
