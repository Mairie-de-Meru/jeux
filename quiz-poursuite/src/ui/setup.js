// Écran d'accueil : 1-4 joueurs (dont 0-3 robots), personnage et niveau par joueur, partie courte / complète.
import { CHARACTERS, BOT_NAMES } from '../render/character.js';
import { avatarSVG } from './avatar.js';

const LEVELS = [
  { mode: 1, e: '🐣', label: '5-6 ans' },
  { mode: 'mix', e: '🐥', label: 'Mélange' },
  { mode: 2, e: '🦊', label: '7-8 ans' },
  { mode: 3, e: '🦉', label: 'Adulte facile' },
  { mode: 4, e: '🧠', label: 'Adulte moyen' },
  { mode: 5, e: '🎓', label: 'Adulte expert' },
];

export function initSetup(root, onPlay) {
  const state = { n: 1, wedges: 6, avatars: [0, 1, 2, 3], levels: [0, 0, 0, 0], bots: 0 };
  const rowsEl = root.querySelector('#players-rows');
  const countEl = root.querySelector('#count-btns');
  const lenEl = root.querySelector('#len-btns');
  const botEl = root.querySelector('#bot-btns');

  function mkBtn(cls, text, onTap) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = cls;
    b.textContent = text;
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); onTap(); });
    return b;
  }

  const humans = () => state.n; // « Combien de joueurs » = humains ; les robots complètent jusqu'à 4.

  function render() {
    countEl.innerHTML = '';
    for (let n = 1; n <= 4; n++) {
      const b = mkBtn('opt' + (state.n === n ? ' sel' : ''), String(n), () => { state.n = n; state.bots = Math.min(state.bots, 4 - n); render(); });
      b.setAttribute('aria-label', `${n} joueur${n > 1 ? 's' : ''}`);
      countEl.appendChild(b);
    }
    botEl.innerHTML = '';
    for (let k = 0; k <= 3; k++) {
      const off = k > 4 - state.n;
      const b = mkBtn('opt' + (state.bots === k ? ' sel' : '') + (off ? ' off' : ''), k === 0 ? '0' : '🤖'.repeat(k), () => { if (!off) { state.bots = k; render(); } });
      b.disabled = off;
      b.setAttribute('aria-label', `${k} robot${k > 1 ? 's' : ''}`);
      botEl.appendChild(b);
    }
    lenEl.innerHTML = '';
    lenEl.appendChild(mkBtn('opt wide' + (state.wedges === 3 ? ' sel' : ''), 'Courte · 3 parts', () => { state.wedges = 3; render(); }));
    lenEl.appendChild(mkBtn('opt wide' + (state.wedges === 6 ? ' sel' : ''), 'Complète · 6 parts', () => { state.wedges = 6; render(); }));
    rowsEl.innerHTML = '';
    for (let i = 0; i < humans(); i++) {
      const row = document.createElement('div');
      row.className = 'prow';
      const av = mkBtn('avbtn', '', () => {
        let k = state.avatars[i];
        const used = state.avatars.slice(0, humans()).filter((_, j) => j !== i);
        do { k = (k + 1) % CHARACTERS.length; } while (used.includes(k));
        state.avatars[i] = k;
        render();
      });
      av.innerHTML = avatarSVG(CHARACTERS[state.avatars[i]].couleur, { size: 52 });
      av.setAttribute('aria-label', CHARACTERS[state.avatars[i]].nom);
      const lv = LEVELS[state.levels[i]];
      const lb = mkBtn('lvbtn', `${lv.e} ${lv.label}`, () => { state.levels[i] = (state.levels[i] + 1) % LEVELS.length; render(); });
      row.append(av, lb);
      rowsEl.appendChild(row);
    }
  }
  render();

  root.querySelector('#play-btn').addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const players = [];
    for (let i = 0; i < humans(); i++) {
      const c = CHARACTERS[state.avatars[i]];
      players.push({ nom: c.nom, couleur: c.couleur, mode: LEVELS[state.levels[i]].mode });
    }
    // Chaque robot prend un personnage libre : une couleur différente par bonhomme.
    const used = state.avatars.slice(0, humans());
    const free = CHARACTERS.map((_, j) => j).filter((j) => !used.includes(j));
    for (let k = 0; k < state.bots; k++) {
      players.push({ nom: BOT_NAMES[k], couleur: CHARACTERS[free[k]].couleur, bot: true, mode: LEVELS[state.levels[0]].mode });
    }
    onPlay({ players, wedgesToWin: state.wedges });
  });
}
