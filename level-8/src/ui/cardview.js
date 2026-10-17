// Cartes en HTML (main du joueur, groupes posés).
import { SHAPE } from '../render/cardtex.js';

export const COLOR_WORDS = ['rouge', 'bleu', 'jaune', 'vert'];

export function cardName(c) {
  if (c.k === 'j') return 'joker';
  if (c.k === 's') return 'passe';
  return `${c.n} ${COLOR_WORDS[c.c]}`;
}

// n : nombre représenté (pour un joker posé dans un groupe)
export function cardEl(card, { tag = 'button', mini = false, as = null } = {}) {
  const el = document.createElement(tag);
  if (tag === 'button') el.type = 'button';
  el.className = 'card ' + (card.k === 'n' ? 'c' + card.c : card.k === 'j' ? 'joker' : 'pass') + (mini ? ' mini' : '');
  el.dataset.id = card.id;
  el.setAttribute('aria-label', cardName(card));
  if (card.k === 'n') {
    const nine = card.n === 6 || card.n === 9 ? ' u' : '';
    el.innerHTML = `<span class="corner">${SHAPE[card.c]}</span><span class="mid${nine}">${card.n}</span><span class="pip">${SHAPE[card.c]}</span>`;
  } else if (card.k === 'j') {
    el.innerHTML = `<span class="mid star">★</span><span class="lbl">${as ? '= ' + as : 'JOKER'}</span>`;
  } else {
    el.innerHTML = '<span class="mid star">⏭</span><span class="lbl">PASSE</span>';
  }
  return el;
}
