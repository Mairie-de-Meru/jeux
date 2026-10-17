import { faceURL } from '../render/cardart.js';
import { fitCardWidth } from '../logic/layout.js';
import { COLOR_NAMES } from '../logic/game.js';

export const $ = (id) => document.getElementById(id);

let toastTimer = null;
export function toast(text, ms = 1500) {
  const el = $('toast');
  el.textContent = text; el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}

export function cardLabel(card, color) {
  switch (card.kind) {
    case 'num': return `le ${card.value} ${COLOR_NAMES[card.color]}`;
    case 'skip': return `« passe » ${COLOR_NAMES[card.color]}`;
    case 'rev': return `« sens inverse » ${COLOR_NAMES[card.color]}`;
    case 'draw2': return `+2 ${COLOR_NAMES[card.color]}`;
    case 'wild': return `un joker ${COLOR_NAMES[color]}`;
    default: return `un joker +4 ${COLOR_NAMES[color]}`;
  }
}

const sortKey = (c) => ({ R: 0, B: 1, G: 2, Y: 3 }[c.color] ?? 4) * 100 + (c.kind === 'num' ? c.value : 20 + ['skip', 'rev', 'draw2', 'wild', 'wild4'].indexOf(c.kind));

export function renderHand(container, hand, { legalIds, highlight, onTap }) {
  container.textContent = '';
  const sorted = [...hand].sort((a, b) => sortKey(a) - sortKey(b));
  for (const card of sorted) {
    const b = document.createElement('button');
    b.className = 'card';
    b.dataset.id = card.id;
    b.setAttribute('aria-label', cardLabel(card, null).replace(/ null$/, ''));
    if (highlight) b.classList.add(legalIds.has(card.id) ? 'playable' : 'dim');
    const img = document.createElement('img');
    img.src = faceURL(card); img.alt = ''; img.draggable = false;
    b.appendChild(img);
    b.addEventListener('click', () => onTap(card, b));
    container.appendChild(b);
  }
  fitHand(container);
  if (!container._ro && window.ResizeObserver) {
    container._ro = new ResizeObserver(() => fitHand(container));
    container._ro.observe(container);
  }
}

// Ajuste --card-w pour que la main tienne sans défilement (rétrécit avant de passer en 2e rangée).
export function fitHand(container) {
  const n = container.children.length;
  container.style.removeProperty('--card-w');
  if (!n) return;
  const cs = getComputedStyle(container);
  const px = (v) => parseFloat(v) || 0;
  const boxW = container.clientWidth - px(cs.paddingLeft) - px(cs.paddingRight);
  const boxH = container.clientHeight - px(cs.paddingTop) - px(cs.paddingBottom);
  const maxW = container.firstElementChild.offsetWidth;
  if (boxW <= 0 || boxH <= 0 || !maxW) return;
  const w = fitCardWidth({ n, boxW, boxH, gap: px(cs.columnGap) || 6, maxW, minW: 36 });
  if (w < maxW) container.style.setProperty('--card-w', w + 'px');
}

export function setChips(groupId, onPick) {
  const g = $(groupId);
  g.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip'); if (!chip) return;
    g.querySelectorAll('.chip').forEach((c) => c.classList.toggle('sel', c === chip));
    onPick(chip.dataset.v);
  });
}

export function showRanking(list, winnerHuman) {
  const medals = ['🥇', '🥈', '🥉', '🏅'];
  $('ranking').textContent = '';
  list.forEach((r, i) => {
    const li = document.createElement('li');
    if (r.human) li.classList.add('me');
    li.innerHTML = `<span class="medal">${medals[i] || '🏅'}</span><span>${r.emoji} ${r.name}</span><span class="left">${r.left === 0 ? 'Gagné !' : r.left + ' carte' + (r.left > 1 ? 's' : '')}</span>`;
    $('ranking').appendChild(li);
  });
  $('end-emoji').textContent = winnerHuman ? '🏆' : '🎉';
  $('end-title').textContent = winnerHuman ? 'Bravo, tu as gagné !' : `${list[0].name} a gagné !`;
  $('end').classList.remove('hidden');
}

export function confetti(n = 70) {
  const box = $('confetti'); const cols = ['#e8454d', '#2d78d6', '#2ba866', '#f2b21f', '#ff8fd0'];
  for (let i = 0; i < n; i++) {
    const p = document.createElement('i');
    p.style.left = Math.random() * 100 + '%';
    p.style.background = cols[i % cols.length];
    p.style.animationDuration = 2 + Math.random() * 2.5 + 's';
    p.style.animationDelay = Math.random() * 0.8 + 's';
    box.appendChild(p);
    setTimeout(() => p.remove(), 5500);
  }
}
