// Surcouche DOM : écrans, barre du haut, bulle, réponses, fin de niveau.
import { sfx } from './audio.js';
import { probeImage } from './meshes.js';

function h(tag, cls, text, attrs) {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (text != null) el.textContent = text;
  if (attrs) for (const k in attrs) el.setAttribute(k, attrs[k]);
  return el;
}
function button(label, cls, testid, onClick) {
  const b = h('button', 'btn ' + cls, label, { type: 'button', 'data-testid': testid });
  b.addEventListener('click', () => { sfx.click(); onClick(); });
  return b;
}
export const starsText = (n) => '⭐'.repeat(n) + '☆'.repeat(Math.max(0, 3 - n));

export function createUI(root) {
  let screenEl = null, hud = null, bubble = null, answers = null, dots = [];

  function removeScreen() { if (screenEl) { screenEl.remove(); screenEl = null; } }
  function setScreen(el) { removeScreen(); screenEl = el; root.appendChild(el); }

  function clearHud() {
    for (const el of [hud, bubble, answers]) if (el) el.remove();
    hud = bubble = answers = null; dots = [];
  }

  const api = {
    clear() { removeScreen(); clearHud(); },

    showTitle({ voiceOn, onPlay, onVoice }) {
      clearHud();
      const el = h('div', 'screen');
      probeImage('assets/img/titre.jpg').then((img) => {
        if (img) { el.classList.add('photo'); el.style.backgroundImage = `url(assets/img/titre.jpg)`; }
      });
      const logoBox = h('div');
      probeImage('assets/img/icone.png').then((img) => {
        if (img) { const i = h('img', 'logo'); i.src = 'assets/img/icone.png'; i.alt = ''; logoBox.appendChild(i); }
      });
      el.append(logoBox, h('h1', null, 'Usine à Formes'));
      el.appendChild(button('▶ Jouer', 'green big', 'play', onPlay));
      const v = button(voiceOn ? '🔊 Voix' : '🔇 Voix', 'light', 'speak', () => {
        const on = onVoice();
        v.textContent = on ? '🔊 Voix' : '🔇 Voix';
      });
      el.appendChild(v);
      setScreen(el);
    },

    showLevels({ best, onPick, onBack }) {
      clearHud();
      const el = h('div', 'screen');
      el.appendChild(h('h2', null, 'Choisis un jeu !'));
      const cards = h('div', 'cards');
      const defs = [[1, '🔷', 'Formes'], [2, '🎨', 'Couleurs'], [3, '🔢', 'Compter'], [4, '🏠', 'Construire']];
      for (const [id, ico, mot] of defs) {
        const c = h('button', 'card' + (id === 1 ? ' first' : ''), null, { type: 'button', 'data-testid': 'level-' + id });
        c.append(h('span', 'ico', ico), h('span', 'mot', mot), h('span', 'stars', starsText(best[id] || 0)));
        c.addEventListener('click', () => { sfx.click(); onPick(id); });
        cards.appendChild(c);
      }
      el.appendChild(cards);
      el.appendChild(button('🏠', 'light', 'home', onBack));
      setScreen(el);
    },

    showHud({ title, total, onHome, onSpeak }) {
      removeScreen(); clearHud();
      hud = h('div', 'hud');
      const dotsEl = h('div', 'dots');
      dots = [];
      for (let i = 0; i < total; i++) { const d = h('div', 'dot'); dots.push(d); dotsEl.appendChild(d); }
      hud.append(button('🏠', 'light', 'home', onHome), h('div', 'titre', title), dotsEl, button('🔊', 'orange', 'speak', onSpeak));
      bubble = h('div', 'bubble', '', { 'data-testid': 'bubble' });
      root.append(hud, bubble);
    },

    setProgress(n) { dots.forEach((d, i) => d.classList.toggle('on', i < n)); },

    say(text) {
      if (!bubble) return;
      bubble.textContent = text;
      bubble.classList.remove('pop');
      void bubble.offsetWidth;
      bubble.classList.add('pop');
    },

    showAnswers(choices, onPick) {
      if (answers) answers.remove();
      answers = h('div', 'answers');
      for (const n of choices) {
        const b = button(String(n), 'blue', 'answer-' + n, () => onPick(n, b));
        answers.appendChild(b);
      }
      root.appendChild(answers);
    },
    shake(btn) { btn.classList.remove('shake'); void btn.offsetWidth; btn.classList.add('shake'); },
    setAnswersEnabled(on) { if (answers) answers.querySelectorAll('button').forEach((b) => { b.disabled = !on; }); },
    hideAnswers() { if (answers) { answers.remove(); answers = null; } },

    showEnd({ stars, hasNext, onReplay, onNext, onHome }) {
      const el = h('div', 'screen end');
      el.append(h('h2', null, 'Bravo !'), h('div', 'stars-big', starsText(stars), { 'data-testid': 'stars' }));
      const row = h('div', 'row');
      row.appendChild(button('🔁', 'orange', 'replay', onReplay));
      if (hasNext) row.appendChild(button('➡️', 'green', 'next', onNext));
      row.appendChild(button('🏠', 'light', 'home', onHome));
      el.appendChild(row);
      clearHud();
      setScreen(el);
    },
  };
  return api;
}
