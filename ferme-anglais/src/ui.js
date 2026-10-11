// Interface DOM : accueil, barre de jeu, étoiles, écran de fin, confettis.
import { THEMES, THEME_LABELS } from './data.js';
import { imageUrl } from './assets.js';
import { ROUNDS_PER_LEVEL } from './logic.js';

const $ = (id) => document.getElementById(id);

export function initUI(h) {
  let theme = 'animals';
  let level = 1;

  // Titre : image si présente, sinon texte.
  const titleUrl = imageUrl('titre');
  if (titleUrl) {
    const img = document.createElement('img');
    img.className = 'title';
    img.src = titleUrl;
    img.alt = 'Ferme des Sons Anglais';
    $('title-wrap').appendChild(img);
  } else {
    const t = document.createElement('h1');
    t.textContent = '🐮 Ferme des Sons 🐷';
    $('title-wrap').appendChild(t);
  }

  // Vignettes de thème (emoji en repli d'image).
  const themeBtns = {};
  for (const t of THEMES) {
    const b = document.createElement('button');
    b.className = 'theme';
    const url = imageUrl('theme_' + t);
    if (url) {
      const img = document.createElement('img');
      img.src = url;
      img.alt = '';
      b.appendChild(img);
    } else {
      const s = document.createElement('span');
      s.className = 'ico';
      s.textContent = THEME_LABELS[t].emoji;
      b.appendChild(s);
    }
    const l = document.createElement('span');
    l.textContent = THEME_LABELS[t].fr;
    b.appendChild(l);
    b.addEventListener('click', () => {
      theme = t;
      h.onClick && h.onClick();
      refresh();
    });
    $('themes').appendChild(b);
    themeBtns[t] = b;
  }

  // Niveaux 1 / 2 / 3 étoiles.
  const lvlBtns = {};
  for (const n of [1, 2, 3]) {
    const b = document.createElement('button');
    b.className = 'lvl';
    b.textContent = '★'.repeat(n);
    b.setAttribute('aria-label', 'Niveau ' + n);
    b.addEventListener('click', () => {
      level = n;
      h.onClick && h.onClick();
      refresh();
    });
    $('levels').appendChild(b);
    lvlBtns[n] = b;
  }

  function refresh() {
    for (const t of THEMES) themeBtns[t].classList.toggle('sel', t === theme);
    for (const n of [1, 2, 3]) lvlBtns[n].classList.toggle('sel', n === level);
  }
  refresh();

  $('btn-play').addEventListener('click', () => h.onPlay(theme, level));
  $('btn-listen').addEventListener('click', () => h.onListen());
  $('btn-repeat').addEventListener('click', () => h.onRepeat());
  $('btn-home').addEventListener('click', () => h.onHome());
  $('btn-done-home').addEventListener('click', () => h.onHome());
  $('btn-next').addEventListener('click', () => h.onNext());
  $('btn-prev').addEventListener('click', () => h.onPage(-1));
  $('btn-next-page').addEventListener('click', () => h.onPage(1));
  $('btn-replay').addEventListener('click', () => h.onReplay());

  // Confettis (canvas 2D).
  const cv = $('confetti');
  const cx = cv.getContext('2d');
  let parts = [];
  let running = false;
  function sizeCanvas() {
    const r = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.floor(innerWidth * r);
    cv.height = Math.floor(innerHeight * r);
  }
  sizeCanvas();
  window.addEventListener('resize', sizeCanvas);
  const COLORS = ['#e53935', '#1e88e5', '#fdd835', '#43a047', '#fb8c00', '#8e24aa', '#f48fb1'];
  function loop(prev) {
    const now = performance.now();
    const dt = Math.min(0.05, (now - prev) / 1000);
    cx.clearRect(0, 0, cv.width, cv.height);
    const r = cv.width / innerWidth;
    parts = parts.filter((p) => p.y < innerHeight + 20 && p.life > 0);
    for (const p of parts) {
      p.vy += 600 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      p.life -= dt;
      cx.save();
      cx.translate(p.x * r, p.y * r);
      cx.rotate(p.rot);
      cx.fillStyle = p.c;
      cx.fillRect((-p.s / 2) * r, (-p.s / 4) * r, p.s * r, (p.s / 2) * r);
      cx.restore();
    }
    if (parts.length) requestAnimationFrame(() => loop(now));
    else {
      running = false;
      cx.clearRect(0, 0, cv.width, cv.height);
    }
  }

  const ui = {
    getSelection: () => ({ theme, level }),
    showHome() {
      $('home').hidden = false;
      $('done').hidden = true;
      $('hud').hidden = true;
      $('footer').hidden = true;
    },
    hideHome() {
      $('home').hidden = true;
    },
    setPager(icons, current) {
      $('pager').hidden = !icons;
      if (icons) $('pager-label').textContent = icons.map((ic, i) => (i === current ? ic : '·')).join(' ');
    },
    showHud(on) {
      $('pager').hidden = true;
      $('hud').hidden = !on;
      $('footer').hidden = !on;
    },
    setPrompt(text) {
      $('prompt-text').textContent = text;
    },
    setFeedback(text) {
      $('feedback').textContent = text || '';
    },
    setPips(done, total = ROUNDS_PER_LEVEL) {
      $('pips').textContent = '⭐'.repeat(done) + '☆'.repeat(Math.max(0, total - done));
      $('pips').hidden = false;
    },
    hidePips() {
      $('pips').hidden = true;
    },
    showDone({ stars, canNext }) {
      $('done-stars').innerHTML = [1, 2, 3].map((i) => `<span class="${i <= stars ? 'star-on' : 'star-off'}">⭐</span>`).join('');
      $('btn-next').hidden = !canNext;
      $('done').hidden = false;
    },
    hideDone() {
      $('done').hidden = true;
    },
    setDebug(text) {
      const d = $('debug');
      d.hidden = !text;
      d.textContent = text || '';
    },
    confetti(n = 60, fromY = 0.35) {
      for (let i = 0; i < n; i++) {
        parts.push({
          x: innerWidth / 2 + (Math.random() - 0.5) * innerWidth * 0.5,
          y: innerHeight * fromY,
          vx: (Math.random() - 0.5) * 500,
          vy: -300 - Math.random() * 400,
          s: 8 + Math.random() * 10,
          rot: Math.random() * 6,
          vr: (Math.random() - 0.5) * 12,
          c: COLORS[i % COLORS.length],
          life: 2.5,
        });
      }
      if (!running) {
        running = true;
        requestAnimationFrame(() => loop(performance.now()));
      }
    },
    sizes() {
      return { top: $('hud').offsetHeight || 96, bottom: $('footer').offsetHeight || 76 };
    },
  };
  return ui;
}
