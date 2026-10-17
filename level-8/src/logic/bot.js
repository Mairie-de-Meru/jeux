// Planificateur des bots : choisit une action légale pour le joueur courant.
import { isWild, isSkip, isNum, findLayout, canAddToGroup, canSwapJoker } from './cards.js';
import { progress, bestDiscard } from './planner.js';
import { objectiveOf, takeableDiscards, topDiscard, skipTargets } from './game.js';

export function chooseAction(g) {
  const p = g.players[g.current];
  const rng = g.botRng;
  const specs = objectiveOf(g, p).groups;
  const easy = p.diff === 'facile';

  if (g.phase === 'draw') {
    // meilleure carte du dessus parmi toutes les défausses (la sienne comprise)
    let best = null;
    let bestGain = 0;
    for (const j of takeableDiscards(g)) {
      const top = topDiscard(g, j);
      let gain;
      if (p.laid) gain = g.groups.some((grp) => canAddToGroup(grp, top) || (g.jokerSwap && canSwapJoker(grp, top) >= 0)) ? 1 : 0;
      else gain = progress([...p.hand, top], specs) - progress(p.hand, specs);
      if (gain > bestGain) { bestGain = gain; best = j; }
    }
    if (best !== null && !(easy && rng() < 0.3)) return { type: 'takeDiscard', from: best };
    return { type: 'draw' };
  }

  if (!p.laid) {
    const layout = findLayout(p.hand, specs);
    if (layout && !(easy && rng() < 0.15)) return { type: 'lay', ids: layout.flat().map((c) => c.id) };
  } else if (!(easy && rng() < 0.3)) {
    if (g.jokerSwap && !(easy && rng() < 0.5)) {
      for (const c of p.hand.filter(isNum)) {
        const grp = g.groups.find((x) => canSwapJoker(x, c) >= 0);
        if (grp) return { type: 'swap', cardId: c.id, groupId: grp.id };
      }
    }
    const order = [...p.hand.filter(isNum), ...p.hand.filter(isWild)];
    for (const c of order) {
      const grp = g.groups.find((x) => canAddToGroup(x, c));
      if (grp) return { type: 'add', cardId: c.id, groupId: grp.id };
    }
  }

  // carte Passe : la poser devant un adversaire plutôt que la jeter (jamais sur quelqu'un qui en a déjà une)
  const skipCard = p.hand.find(isSkip);
  if (skipCard && p.hand.length > 1) {
    const targets = skipTargets(g);
    if (targets.length) {
      const target = easy
        ? targets[Math.floor(rng() * targets.length)]
        : targets.slice().sort((a, b) => g.players[b].level - g.players[a].level || g.players[a].hand.length - g.players[b].hand.length)[0];
      return { type: 'skip', cardId: skipCard.id, target };
    }
  }

  // défausse
  if (easy && rng() < 0.2) {
    const pool = p.hand.filter((c) => !isWild(c));
    const list = pool.length ? pool : p.hand;
    return { type: 'discard', cardId: list[Math.floor(rng() * list.length)].id };
  }
  if (p.laid) {
    const skip = p.hand.find(isSkip);
    if (skip) return { type: 'discard', cardId: skip.id };
    const stuck = p.hand.filter((c) => !g.groups.some((x) => canAddToGroup(x, c)));
    const list = (stuck.length ? stuck : p.hand).filter((c) => !isWild(c));
    const pick = (list.length ? list : p.hand).slice().sort((a, b) => (b.n || 0) - (a.n || 0))[0];
    return { type: 'discard', cardId: pick.id };
  }
  return { type: 'discard', cardId: bestDiscard(p.hand, specs, rng).id };
}
