// Interface DOM : gros boutons, étoiles, bulle d'indice, invite, points de progression, écrans.
import { speech } from './speech.js';
import { sfx } from './audio.js';

export const HINT_TEXT = {
  start: 'Commence au point vert !',
  direction: 'Suis la flèche !',
  off: 'Reste sur le chemin !',
  coverage: 'Encore un peu !',
  short: 'Encore un peu !',
  majuscule: 'Une majuscule au début !',
  point: 'Un point à la fin !',
};

const $ = (id) => document.getElementById(id);

export function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

export function btn(label, onClick, cls = '') {
  const b = el('button', `btn ${cls}`.trim(), label);
  b.addEventListener('click', () => { sfx.click(); onClick(); });
  return b;
}

export const starsText = (n) => '★'.repeat(n) + '☆'.repeat(3 - n);

let bubbleTimer = 0;

export const ui = {
  setPrompt(text, say = true) {
    $('prompt').textContent = text || '';
    if (text && say) speech.say(text);
  },
  setDots(total, done) {
    const d = $('dots');
    d.textContent = '';
    for (let i = 0; i < total; i++) d.append(el('div', `dot${i < done ? ' on' : ''}${i === done ? ' cur' : ''}`));
  },
  clearDots() { $('dots').textContent = ''; },
  setEmoji(e) { $('emoji').textContent = e || ''; },
  hint(text, say = true) {
    const b = $('bubble');
    b.textContent = text;
    b.classList.add('show');
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => b.classList.remove('show'), 2600);
    if (say) speech.say(text);
  },
  hideHint() { $('bubble').classList.remove('show'); },
  setBar(items) {
    const b = $('bar');
    b.textContent = '';
    for (const it of items || []) b.append(it);
  },
  showTop(on) { $('topbar').style.display = on ? 'flex' : 'none'; },
  screen(node) {
    const s = $('screen');
    s.textContent = '';
    if (!node) { s.classList.remove('show'); return; }
    s.append(node);
    s.classList.add('show');
  },
  screenOpen() { return $('screen').classList.contains('show'); },
  updateSpeak() { $('btn-speak').textContent = speech.enabled ? '🔊' : '🔇'; },
};
