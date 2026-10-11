// Écrans : affichage/masquage, choix des dessins, message court.
import { drawLineArt } from './lineart.js';

export const SCREENS = ['accueil', 'choix', 'atelier', 'galerie'];

export function createScreens() {
  const els = Object.fromEntries(SCREENS.map((n) => [n, document.getElementById(`screen-${n}`)]));
  let current = 'accueil';
  const toastEl = document.getElementById('toast');
  let toastTimer = null;
  return {
    current: () => current,
    show(name) {
      if (!els[name]) return false;
      current = name;
      for (const n of SCREENS) els[n].classList.toggle('hidden', n !== name);
      return true;
    },
    toast(msg) {
      toastEl.textContent = msg;
      toastEl.classList.add('show');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2200);
    },
    /** Vignettes groupées par palier. Image absente -> vignette retirée (ou repli procédural). */
    buildChoix(container, pages, onPick) {
      container.textContent = '';
      for (const palier of [1, 2, 3]) {
        const row = document.createElement('div');
        row.className = 'palier';
        const h = document.createElement('h2');
        h.textContent = '⭐'.repeat(palier);
        h.setAttribute('aria-label', `Niveau ${palier}`);
        const list = document.createElement('div');
        list.className = 'vignettes';
        row.append(h, list);
        for (const page of pages.filter((p) => p.palier === palier)) {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'vignette';
          b.dataset.page = page.id;
          const cap = document.createElement('span');
          cap.textContent = page.titre;
          const useDraw = () => {
            const c = document.createElement('canvas');
            c.width = 256; c.height = 192;
            const x = c.getContext('2d');
            x.fillStyle = '#fff'; x.fillRect(0, 0, 256, 192);
            drawLineArt(x, 256, 192, page.draw);
            b.prepend(c);
          };
          if (page.image) {
            const img = new Image();
            img.alt = page.titre;
            img.onload = () => b.prepend(img);
            img.onerror = () => { if (page.draw) useDraw(); else b.remove(); };
            img.src = page.image;
          } else if (page.draw) {
            useDraw();
          }
          b.appendChild(cap);
          b.addEventListener('click', () => onPick(page.id));
          list.appendChild(b);
        }
        container.appendChild(row);
      }
    },
  };
}
