// Manifeste d'images : seules ces images sont demandées. Repli emoji si absente.
const IDS = ['graine', 'pousse', 'fleur', 'fruit', 'oeuf', 'chenille', 'chrysalide', 'papillon'];
// Images réellement présentes dans assets/img (vide tant que la génération RunningHub est en attente).
const DISPONIBLES = [];
export const IMAGES = Object.fromEntries(DISPONIBLES.map((id) => [id, `./assets/img/carte-${id}.png`]));
export const FALLBACK = {
  graine: { emoji: '🌰', color: '#d9b38c' },
  pousse: { emoji: '🌱', color: '#b8e8a0' },
  fleur: { emoji: '🌸', color: '#ffc4dc' },
  fruit: { emoji: '🍎', color: '#ffb3a8' },
  oeuf: { emoji: '🥚', color: '#fff0c2' },
  chenille: { emoji: '🐛', color: '#c9ee9a' },
  chrysalide: { emoji: '🫘', color: '#d8c8ee' },
  papillon: { emoji: '🦋', color: '#bfe0ff' },
};

const state = new Map(); // id -> 'ok' | 'ko' | 'loading'
function probe(id) {
  if (state.has(id)) return;
  state.set(id, 'loading');
  const im = new Image();
  im.onload = () => state.set(id, 'ok');
  im.onerror = () => state.set(id, 'ko');
  im.src = IMAGES[id];
}
export function preloadImages() { Object.keys(IMAGES).forEach(probe); }

// Élément « face de carte » : image si disponible, sinon emoji sur fond coloré.
export function cardFace(id, label) {
  const el = document.createElement('div');
  el.className = 'face';
  const fb = FALLBACK[id] || { emoji: '❔', color: '#eee' };
  const showFallback = () => {
    el.innerHTML = '';
    el.style.background = fb.color;
    const e = document.createElement('span'); e.className = 'em'; e.textContent = fb.emoji; el.appendChild(e);
  };
  if (state.get(id) === 'ko' || !IMAGES[id]) showFallback();
  else {
    const img = document.createElement('img');
    img.alt = ''; img.draggable = false; img.src = IMAGES[id];
    img.onerror = () => { state.set(id, 'ko'); showFallback(); };
    el.appendChild(img);
  }
  if (label) { const l = document.createElement('span'); l.className = 'lab'; l.textContent = label; el.appendChild(l); }
  return el;
}
