// Aide à l'addition du palier 3.
export function sumChoices(total, rng) {
  const set = new Set([total]);
  const cands = [total - 2, total - 1, total + 1, total + 2].filter((v) => v >= 2 && v <= 12);
  for (let i = cands.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [cands[i], cands[j]] = [cands[j], cands[i]];
  }
  for (const c of cands) {
    if (set.size >= 3) break;
    set.add(c);
  }
  return [...set].sort((a, b) => a - b);
}

// 0 erreur : rien ; 1-2 erreurs : on aide en comptant ; 3 erreurs ou plus : on donne la réponse.
export function hintLevel(wrongCount) {
  if (wrongCount <= 0) return 'none';
  return wrongCount >= 3 ? 'reveal' : 'count';
}
