// Pictogramme de l'objectif du niveau : emplacements de cartes remplis par la main.
import { cardEl } from './cardview.js';
import { ghostCards } from '../logic/planner.js';

const SHORT = {
  set: (n) => `${n} cartes, même nombre`,
  run: () => 'nombres qui se suivent',
  colour: (n) => `${n} de la même couleur`,
};
const LONG = {
  set: (n) => `${n} cartes avec le même nombre (la couleur ne compte pas)`,
  run: (n) => `suite de ${n} : des nombres qui se suivent`,
  colour: (n) => `${n} cartes de la même couleur (le nombre ne compte pas)`,
};
const COL_NUMS = [2, 5, 8, 3, 11, 6, 9, 1];
// Carte d'exemple fantôme à l'emplacement i d'un groupe (setIdx : rang du groupe pour varier le nombre).
function example(spec, i, rep = 0) {
  if (spec.t === 'set') return { n: (spec.size === 4 ? [9, 3] : [5, 8])[rep % 2], c: i % 4 };
  if (spec.t === 'run') return { n: Math.min(3 + i, 12), c: (i + 1) % 4 };
  return { n: COL_NUMS[i % COL_NUMS.length], c: 0 };
}

// fill : résultat de objectiveFill ; big : version grande (fenêtre de début de manche)
export function goalEl(fill, { big = false } = {}) {
  const box = document.createElement('div');
  box.className = 'goalgroups' + (big ? ' big' : '');
  const seen = {};
  for (const f of fill) {
    const key = f.spec.t + f.spec.size;
    const rep = seen[key] || 0;
    seen[key] = rep + 1;
    const g = document.createElement('div');
    g.className = 'ggroup t-' + f.spec.t + (f.cards.length >= f.size ? ' full' : '');
    const lg = document.createElement('span');
    lg.className = 'glegend';
    lg.textContent = (big ? LONG : SHORT)[f.spec.t](f.size);
    const row = document.createElement('div');
    row.className = 'gslots';
    const gh = ghostCards(f.spec, f.cards);
    for (let i = 0; i < f.size; i++) {
      const c = f.cards[i];
      if (c) { const ce = cardEl(c, { tag: 'span', mini: true }); ce.classList.add('real'); row.appendChild(ce); }
      else {
        const ex = gh ? (gh[i - f.cards.length] || example(f.spec, i, rep)) : example(f.spec, i, rep);
        const e = cardEl({ id: -1 - i, k: 'n', n: ex.n, c: ex.c }, { tag: 'span', mini: true });
        e.classList.add('ghost');
        e.removeAttribute('aria-label');
        row.appendChild(e);
      }
    }
    g.append(lg, row);
    box.appendChild(g);
  }
  return box;
}
