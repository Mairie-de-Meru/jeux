// Écrans DOM : affichage, listes (paliers, images, galerie), HUD.
import { LEVELS } from '../logic/levels.js';
import { isUnlocked, bestStarsForLevel } from '../logic/progress.js';
import { IMAGES, CATEGORIES, imageUrl, fallbackUrl, imageDef, prefetch } from '../assets.js';

export const SCREEN_NAMES = ['accueil', 'paliers', 'images', 'jeu', 'fin', 'galerie', 'vue'];
const CANVAS_SCREENS = ['jeu', 'fin', 'vue'];
export const $ = (sel) => document.querySelector(sel);

let current = 'accueil';
export const currentScreen = () => current;

export function show(name) {
  if (!SCREEN_NAMES.includes(name)) return false;
  current = name;
  for (const n of SCREEN_NAMES) $('#s-' + n).classList.toggle('active', n === name);
  document.body.classList.toggle('show-canvas', CANVAS_SCREENS.includes(name));
  return true;
}

const starText = (n) => '⭐'.repeat(n);

export function renderLevels(progress, onPick) {
  const box = $('#levels');
  box.innerHTML = '';
  LEVELS.forEach((l, i) => {
    const b = document.createElement('button');
    b.className = 'lvl';
    const open = isUnlocked(progress, i);
    const best = bestStarsForLevel(progress, i);
    b.innerHTML = `<span>${open ? l.pieces : '🔒'}</span><small>${open ? 'pièces' : l.pieces}</small><span class="st">${open && best ? starText(best) : '&nbsp;'}</span>`;
    b.disabled = !open;
    b.setAttribute('aria-label', `${l.pieces} pièces`);
    b.addEventListener('click', () => onPick(i));
    box.appendChild(b);
  });
  prefetch(IMAGES.filter((d) => d.cat === loadCat()).map((d) => d.id));
}

export function setRotationLabel(on) {
  const b = $('#rot-toggle');
  b.textContent = `↻ Tourner les pièces : ${on ? 'oui' : 'non'}`;
  b.setAttribute('aria-pressed', String(on));
}

const CAT_KEY = 'puzzle-magique-cat';
let category = null;
function loadCat() {
  if (category) return category;
  try { category = localStorage.getItem(CAT_KEY); } catch { /* ignoré */ }
  if (!CATEGORIES.some((c) => c.id === category)) category = CATEGORIES[0].id;
  return category;
}

// <img> paresseux sur le PNG, repli généré si le fichier manque.
function thumbImg(id) {
  const im = document.createElement('img');
  im.alt = '';
  im.loading = 'lazy';
  im.addEventListener('error', () => { im.src = fallbackUrl(id); }, { once: true });
  im.src = imageUrl(id);
  return im;
}

export function renderImages(level, progress, onPick) {
  const tabs = $('#cats'), box = $('#images');
  const cat = loadCat();
  tabs.innerHTML = '';
  for (const c of CATEGORIES) {
    const b = document.createElement('button');
    b.className = 'cat' + (c.id === cat ? ' on' : '');
    b.innerHTML = `<span class="ic">${c.emoji}</span><small>${c.label}</small>`;
    b.setAttribute('aria-pressed', String(c.id === cat));
    b.addEventListener('click', () => {
      category = c.id;
      try { localStorage.setItem(CAT_KEY, c.id); } catch { /* ignoré */ }
      renderImages(level, progress, onPick);
    });
    tabs.appendChild(b);
  }
  box.innerHTML = '';
  box.scrollTop = 0;
  IMAGES.forEach((d, i) => {
    if (d.cat !== cat) return;
    const b = document.createElement('button');
    b.className = 'thumb';
    const best = progress.best[`${level}:${d.id}`] || 0;
    b.appendChild(thumbImg(d.id));
    b.insertAdjacentHTML('beforeend', `<span>${d.label}</span>${best ? '<span class="badge">⭐</span>' : ''}`);
    b.addEventListener('click', () => onPick(i));
    box.appendChild(b);
  });
}

export function renderGallery(progress, onPick) {
  const box = $('#gallery');
  box.innerHTML = '';
  if (!progress.gallery.length) {
    const d = document.createElement('div');
    d.className = 'empty';
    d.textContent = 'Termine un puzzle pour remplir ta galerie !';
    box.appendChild(d);
    return;
  }
  for (const g of progress.gallery) {
    const def = imageDef(g.imageId);
    if (!def) continue;
    const b = document.createElement('button');
    b.className = 'thumb';
    b.appendChild(thumbImg(g.imageId));
    b.insertAdjacentHTML('beforeend', `<span>${def.label} · ${LEVELS[g.level].pieces}</span><span class="badge">${'⭐'.repeat(g.stars)}</span>`);
    b.addEventListener('click', () => onPick(g.level, g.imageId));
    box.appendChild(b);
  }
}

export function setCount(done, total) { $('#hud-count').textContent = `🧩 ${done} / ${total}`; }
export function setFinStars(n) { $('#fin-stars').textContent = starText(n); }
export function setMessage(text) {
  const m = $('#hud-msg');
  m.textContent = text || '';
  m.classList.toggle('hidden', !text);
}
