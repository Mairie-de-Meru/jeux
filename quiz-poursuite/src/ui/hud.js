import { CATEGORIES } from '../logic/categories.js';
import { avatarSVG } from './avatar.js';

const GREY = '#d8dde6';

function conic(parts) {
  const stops = parts.map((got, k) => `${got ? CATEGORIES[k].couleur : GREY} ${k * 60}deg ${(k + 1) * 60}deg`);
  return `conic-gradient(${stops.join(',')})`;
}

export function renderHud(el, players, current) {
  el.innerHTML = '';
  players.forEach((p, i) => {
    const chip = document.createElement('div');
    chip.className = 'chip' + (i === current ? ' active' : '');
    const av = document.createElement('span');
    av.className = 'av';
    av.innerHTML = avatarSVG(p.couleur, { bot: !!p.bot, size: 34 });
    const mini = document.createElement('span');
    mini.className = 'mini';
    mini.style.background = conic(p.parts);
    const stars = document.createElement('span');
    stars.className = 'stars';
    stars.textContent = `⭐ ${p.etoiles}`;
    chip.append(av, mini, stars);
    el.appendChild(chip);
  });
}

let toastTimer = null;
export function showToast(el, text, ms = 1800) {
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}
