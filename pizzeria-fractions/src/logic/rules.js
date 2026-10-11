export function checkIdentify(round, choiceIndex) {
  const ok = choiceIndex === round.answer;
  return { ok, hint: ok ? null : 'look' };
}

export function checkCut(round, parts) {
  const ok = parts === round.parts;
  return { ok, hint: ok ? null : 'count' };
}

// hint : 'knife' | 'tooFew' | 'tooMany' | null ; missing = nombre de parts à ajouter / retirer.
export function checkServe(round, parts, served) {
  if (parts !== round.parts) return { ok: false, hint: 'knife', missing: 0 };
  if (served < round.served) return { ok: false, hint: 'tooFew', missing: round.served - served };
  if (served > round.served) return { ok: false, hint: 'tooMany', missing: served - round.served };
  return { ok: true, hint: null, missing: 0 };
}

export function checkCompare(round, side) {
  const ok = side === round.answer;
  return { ok, hint: ok ? null : 'size' };
}

export function starsFor(errors) {
  return errors <= 0 ? 3 : errors === 1 ? 2 : 1;
}
