// Main du joueur en éventail (DOM). Les cartes sont réutilisées par id : le navigateur anime la fermeture de l'éventail.
import { faceURL } from '../render/cardart.js';
import { fanLayout } from '../logic/layout.js';
import { cardLabel, sortKey } from './ui.js';

let fast = false;
export function setHandFast(b) { fast = !!b; }

const LIFT = 14;
const naturalWidth = () => Math.max(48, Math.min(96, Math.round(0.17 * Math.min(window.innerWidth, window.innerHeight))));
const T = 'left .26s ease, top .26s ease, width .26s ease, height .26s ease, transform .26s ease, opacity .2s';

function place(el, it, w, h, playable) {
  el.style.left = it.x + 'px'; el.style.top = it.y + 'px';
  el.style.width = w + 'px'; el.style.height = h + 'px';
  el.style.zIndex = it.z;
  el._base = `rotate(${it.rot.toFixed(2)}deg)`;
  el.style.transform = el._base + (playable ? ` translateY(-${Math.round(LIFT * 0.7)}px)` : '');
}

export function renderFan(container, hand, { legalIds, highlight, onTap, drawFrom } = {}) {
  container._last = { hand, legalIds, highlight, onTap };
  const els = container._els || (container._els = new Map());
  const sorted = [...hand].sort((a, b) => sortKey(a) - sortKey(b));
  const keep = new Set(sorted.map((c) => c.id));
  for (const [id, el] of els) if (!keep.has(id)) { el.remove(); els.delete(id); }
  const boxW = container.clientWidth || window.innerWidth, boxH = container.clientHeight;
  if (!sorted.length) return;
  const L = fanLayout({ n: sorted.length, boxW, boxH, maxW: naturalWidth(), lift: LIFT });
  const cRect = drawFrom ? container.getBoundingClientRect() : null;
  sorted.forEach((card, idx) => {
    const it = L.items[idx];
    const playable = !!highlight && legalIds.has(card.id);
    let el = els.get(card.id);
    const isNew = !el;
    if (isNew) {
      el = document.createElement('button');
      el.className = 'card'; el.dataset.id = card.id;
      const img = document.createElement('img');
      img.src = faceURL(card); img.alt = ''; img.draggable = false;
      el.appendChild(img);
      el.addEventListener('click', () => { const l = container._last; if (l?.onTap) l.onTap(card, el); });
      els.set(card.id, el); container.appendChild(el);
      el.style.transition = 'none';
      place(el, it, L.w, L.h, playable);
      if (drawFrom && !fast) { // arrivée depuis la pioche
        const dx = drawFrom.x - cRect.left - (it.x + L.w / 2), dy = drawFrom.y - cRect.top - (it.y + L.h / 2);
        el.style.transform = `translate(${dx}px, ${dy}px) scale(.5) ${el._base}`; el.style.opacity = '0.2';
      } else if (!fast) { el.style.opacity = '0'; }
      void el.offsetWidth;
    }
    el.setAttribute('aria-label', cardLabel(card, null).replace(/ null$/, ''));
    el.classList.toggle('playable', playable);
    el.classList.toggle('dim', !!highlight && !playable);
    el.style.transition = fast ? 'none' : T;
    place(el, it, L.w, L.h, playable);
    el.style.opacity = highlight && !playable ? '0.62' : '1';
  });
  if (!container._ro && window.ResizeObserver) {
    container._ro = new ResizeObserver(() => { const l = container._last; if (l) renderFan(container, l.hand, l); });
    container._ro.observe(container);
  }
}

// La carte tapée grossit avant de partir (le vol 3D prend le relais).
export function launchCard(el) {
  if (!el) return;
  el.style.zIndex = 999;
  el.style.transition = fast ? 'none' : 'transform .12s ease-out';
  el.style.transform = `${el._base || ''} scale(1.3)`;
}
