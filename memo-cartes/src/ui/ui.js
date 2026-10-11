import { THEMES, THEME_IDS } from '../logic/themes.js';
import { LEVELS } from '../logic/levels.js';

const $ = (id) => document.getElementById(id);
const PLAYER_CSS = ['#ff5d73', '#3d9bff'];

function btn(cls, html, onTap) {
  const b = document.createElement('button');
  b.className = cls;
  b.innerHTML = html;
  b.addEventListener('pointerup', (e) => { e.preventDefault(); onTap(); });
  return b;
}

export function createUI({ onStart, onHome, onSpeak, onAgain, onNext, titleUrl }) {
  const sel = { theme: 'animaux', level: 0, players: 1 };
  const layers = { menu: $('menu'), hud: $('hud'), end: $('end') };
  const show = (...names) => Object.entries(layers).forEach(([k, el]) => el.classList.toggle('on', names.includes(k)));

  const refresh = (container, pred) => [...container.children].forEach((b, i) => b.classList.toggle('sel', pred(i)));

  const themesEl = $('themes');
  THEME_IDS.forEach((id) => {
    themesEl.append(btn('big theme', `<span class="em">${THEMES[id].items[0].emoji}${THEMES[id].items[3].emoji}</span>${THEMES[id].nom}`, () => {
      sel.theme = id; refresh(themesEl, (i) => THEME_IDS[i] === id);
    }));
  });
  refresh(themesEl, (i) => THEME_IDS[i] === sel.theme);

  const levelsEl = $('levels');
  LEVELS.forEach((lv, li) => {
    const prev = `<span class="prev" style="grid-template-columns:repeat(${lv.cols},14px)">${'<i></i>'.repeat(lv.rows * lv.cols)}</span>`;
    levelsEl.append(btn('big lvl', `${li + 1}${prev}`, () => { sel.level = li; refresh(levelsEl, (i) => i === li); }));
  });
  refresh(levelsEl, (i) => i === sel.level);

  const playersEl = $('players');
  const MODES = [[1, '🧒'], [2, '🧒🧒'], ['bot', '🧒🤖']];
  MODES.forEach(([n, label], k) => {
    playersEl.append(btn('big pl', label, () => { sel.players = n; refresh(playersEl, (i) => i === k); }));
  });
  refresh(playersEl, (i) => i === 0);

  $('go').addEventListener('pointerup', (e) => { e.preventDefault(); onStart(sel.theme, sel.level, sel.players); });
  $('home').addEventListener('pointerup', (e) => { e.preventDefault(); onHome(); });
  $('speak').addEventListener('pointerup', (e) => { e.preventDefault(); onSpeak(); });
  $('again').addEventListener('pointerup', (e) => { e.preventDefault(); onAgain(); });
  $('next').addEventListener('pointerup', (e) => { e.preventDefault(); onNext(); });

  if (titleUrl) {
    const img = new Image();
    img.onload = () => { layers.menu.style.backgroundImage = `url(${titleUrl})`; };
    img.src = titleUrl; // erreur ignorée : le menu garde le dégradé
  }

  function updateHud({ tries, scores, current, players, mode, won }) {
    $('tries').textContent = `Essais : ${tries}`;
    const box = $('scores');
    box.innerHTML = '';
    if (players === 2) {
      [0, 1].forEach((p) => {
        const d = document.createElement('div');
        d.className = 'score' + (p === current ? ' cur' : '');
        d.style.background = PLAYER_CSS[p];
        d.textContent = mode === 'bot' ? `${p === 0 ? '🧒' : '🤖'} ${scores[p]}` : `${p + 1} : ${scores[p]}`;
        box.append(d);
      });
      if (mode === 'bot' && current === 1 && !won) {
        const th = document.createElement('div');
        th.className = 'pill';
        th.style.fontSize = '18px';
        th.textContent = '🤖 réfléchit…';
        box.append(th);
      }
    }
  }

  function showEnd({ stars, tries, players, winner, scores, hasNext, mode }) {
    $('stars').innerHTML = [1, 2, 3].map((n) => `<span class="${n <= stars ? '' : 'off'}">⭐</span>`).join('');
    $('endTries').textContent = `Essais : ${tries}`;
    const w = $('winner');
    if (players === 2) {
      if (mode === 'bot') {
        w.textContent = winner === 0 ? 'Bravo, tu as gagné ! 🏆' : winner === 1 ? 'Bien joué ! Revanche ? 💪' : 'Égalité ! Bien joué ! 🤝';
        w.style.color = winner === 0 ? PLAYER_CSS[0] : '';
      } else {
      w.textContent = winner === 'egalite' ? 'Égalité ! 🤝' : `Joueur ${winner + 1} gagne ! 🏆`;
      w.style.color = winner === 'egalite' ? '' : PLAYER_CSS[winner];
      }
      w.style.display = '';
    } else w.style.display = 'none';
    $('next').style.display = hasNext ? '' : 'none';
    layers.end.classList.add('on');
  }

  return {
    showMenu: () => show('menu'),
    showHud: () => show('hud'),
    hideEnd: () => layers.end.classList.remove('on'),
    updateHud, showEnd,
  };
}
