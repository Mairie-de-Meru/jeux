// Robots : choix de case et de réponse (pur, déterministe selon le rng fourni).
export const BOT_SKILL = { 1: 0.6, mix: 0.7, 2: 0.75, 3: 0.8, 4: 0.75, 5: 0.7 };

// Renvoie l'index dans state.dests.
export function botChooseDest(state, board) {
  const p = state.players[state.current];
  for (let k = 0; k < state.dests.length; k++) {
    const c = board[state.dests[k]];
    if (c.type === 'quartier' && !p.parts[c.cat]) return k;
  }
  for (let k = 0; k < state.dests.length; k++) {
    if (!p.parts[board[state.dests[k]].cat]) return k;
  }
  return 0;
}

// Renvoie l'index du choix du robot.
export function botAnswer(question, rng, mode) {
  const skill = BOT_SKILL[mode] ?? 0.6;
  if (rng() < skill) return question.bonne;
  const faux = [0, 1, 2].filter((i) => i !== question.bonne);
  return faux[Math.floor(rng() * faux.length)];
}
