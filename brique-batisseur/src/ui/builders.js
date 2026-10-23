// Construction des éléments DOM : palette de pièces, pastilles de couleur, cartes de défi, étoiles.
import { PIECES, PIECE_IDS, COLORS } from '../logic/pieces.js';

const $ = (sel) => document.querySelector(sel);

function shortLabel(p) {
  if (p.kind === 'tile') return '▬ ' + p.label.replace('Tuile ', '');
  if (p.kind === 'roof') return '⌂ ' + p.label.replace('Toit ', '');
  return p.label;
}

export function buildPalette(onPick) {
  const box = $('#palette');
  box.innerHTML = '';
  for (const id of PIECE_IDS) {
    const p = PIECES[id];
    const b = document.createElement('button');
    b.className = 'piece';
    b.dataset.type = id;
    b.setAttribute('aria-label', p.label);
    b.innerHTML = `<span class="slot"><span class="ico ${p.kind}" style="width:${p.w * 12 + 4}px;height:${p.d * 12 + 4}px"></span></span><span>${shortLabel(p)}</span>`;
    b.addEventListener('click', () => onPick(id));
    box.appendChild(b);
  }
}

export function buildColors(onPick) {
  const box = $('#colors');
  box.innerHTML = '';
  for (const c of COLORS) {
    const b = document.createElement('button');
    b.className = 'swatch';
    b.dataset.color = c.id;
    b.style.background = c.hex;
    b.setAttribute('aria-label', c.label);
    b.addEventListener('click', () => onPick(c.id));
    box.appendChild(b);
  }
}

export function markSelection(type, colorId) {
  for (const b of document.querySelectorAll('.piece')) b.classList.toggle('sel', b.dataset.type === type);
  for (const b of document.querySelectorAll('.swatch')) b.classList.toggle('sel', b.dataset.color === colorId);
  const hex = COLORS.find((c) => c.id === colorId)?.hex;
  if (hex) $('#palette').style.setProperty('--c', hex);
}

export function starsHtml(n) {
  let s = '';
  for (let i = 0; i < 3; i++) s += i < n ? '★' : '<span class="off">★</span>';
  return s;
}

export function dotsHtml(level) {
  return '●'.repeat(level) + '○'.repeat(3 - level);
}

const GROUPS = [
  { name: 'Facile', test: (lv) => lv === 0 },
  { name: 'Moyen', test: (lv) => lv === 1 || lv === 2 },
  { name: 'Difficile', test: (lv) => lv >= 3 },
];

/**
 * Cartes de défi groupées par difficulté. thumbOf(c) → dataURL de la vignette 3D ou null
 * (repli : image dessinée si elle existe, sinon emoji).
 */
export function buildCards(challenges, progress, images, onPick, thumbOf = () => null) {
  const box = $('#cards');
  box.innerHTML = '';
  for (const g of GROUPS) {
    const list = challenges.filter((c) => g.test(c.level));
    if (!list.length) continue;
    const h = document.createElement('h3');
    h.className = 'group';
    h.textContent = g.name;
    box.appendChild(h);
    for (const c of list) {
      const b = document.createElement('button');
      b.className = 'card';
      b.dataset.id = c.id;
      const thumb = images[c.id] ? null : thumbOf(c);
      const pic = images[c.id] ? `<img src="assets/img/${c.id}.png" alt="">` : thumb ? `<img class="thumb" src="${thumb}" alt="">` : c.emoji;
      const badge = c.steps ? '<div class="dots">👣</div>' : `<div class="dots">${dotsHtml(c.level)}</div>`;
      b.innerHTML = `<div class="pic">${pic}</div><b>${c.title}</b><div class="stars">${starsHtml(progress[c.id] ?? 0)}</div>${badge}`;
      b.addEventListener('click', () => onPick(c.id));
      box.appendChild(b);
    }
  }
}
