// Carte tirée, face visible.
import { h, showModal, hideModal } from './dom.mjs';
import { iconCanvas } from '../render/textures.mjs';
import { DECK_LABEL } from '../logic/cards.mjs';
import { getFirst } from '../render/images.mjs';
import { speak } from './speech.mjs';

export function showCard(card, { auto = false, fast = false, autoMs = 2600 } = {}) {
  if (fast) return Promise.resolve();
  return new Promise((resolve) => {
    let done = false;
    const close = () => { if (done) return; done = true; hideModal('card', true); resolve(); };
    const body = h('div', { class: 'pcard ' + card.deck },
      h('div', { class: 'tag', style: `color:${card.deck === 'surprise' ? '#d97706' : '#2563c7'}` }, DECK_LABEL[card.deck]),
      h('div', { class: 'cardimg' }, iconCanvas(card.deck === 'surprise' ? 'surprise' : 'tirelire', 72)),
      h('div', { class: 'txt' }, card.text),
      h('div', { class: 'row', style: 'display:flex;gap:8px;justify-content:center' },
        h('button', { onclick: () => speak(card.text), 'aria-label': 'Lire la carte' }, '🔊'),
        h('button', { class: 'primary', onclick: close }, 'OK')));
    showModal('card', body);
    getFirst(card.deck === 'surprise' ? ['dos-chance-ref', 'dosChance'] : ['dos-caisse-ref', 'dosCaisse']).then((img) => { const t = body.querySelector('.cardimg'); if (img && t) { const i = img.cloneNode(); i.alt = ''; i.style.cssText = 'max-height:18dvh;max-width:70%;border-radius:12px'; t.replaceChildren(i); } });
    if (auto) setTimeout(close, autoMs);
  });
}
