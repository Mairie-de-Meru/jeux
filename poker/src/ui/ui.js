import { faceURL, backURL } from '../render/cardart.js';
import { defaultSeatName, MAX_NAME } from '../logic/turns.js';
import { CATEGORIES } from '../logic/hand.js';
import { cardLabel } from '../logic/cards.js';

export const $ = (id) => document.getElementById(id);

let toastTimer = null;
export function toast(text, ms = 1500) {
  const el = $('toast');
  el.textContent = text; el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}

// Tes 2 cartes (DOM). cards vide => dos des cartes (main cachée).
export function renderHole(container, cards, { hidden = false, dim = false } = {}) {
  container.textContent = '';
  const list = hidden || !cards.length ? [null, null] : cards;
  for (const c of list) {
    const d = document.createElement('div');
    d.className = 'card' + (dim ? ' dim' : '');
    const img = document.createElement('img');
    img.alt = c ? cardLabel(c) : 'Carte cachée'; img.draggable = false;
    img.src = c ? faceURL(c) : backSrc();
    d.appendChild(img);
    container.appendChild(d);
  }
}
const backSrc = () => backURL();

export function setChips(groupId, onPick) {
  const g = $(groupId);
  g.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip'); if (!chip) return;
    g.querySelectorAll('.chip').forEach((c) => c.classList.toggle('sel', c === chip));
    onPick(chip.dataset.v);
  });
}

export function showRanking(list, title, emoji) {
  const medals = ['🥇', '🥈', '🥉', '🏅'];
  $('ranking').textContent = '';
  list.forEach((r, i) => {
    const li = document.createElement('li');
    if (r.human) li.classList.add('me');
    li.innerHTML = `<span class="medal">${medals[i] || '🏅'}</span><span>${r.emoji} ${r.name}</span><span class="left">${r.stack} jetons</span>`;
    $('ranking').appendChild(li);
  });
  $('end-emoji').textContent = emoji;
  $('end-title').textContent = title;
  $('end').classList.remove('hidden');
}

export function confetti(n = 70) {
  const box = $('confetti'); const cols = ['#e8454d', '#2d78d6', '#2ba866', '#f2b21f', '#ff8fd0'];
  for (let i = 0; i < n; i++) {
    const p = document.createElement('i');
    p.style.left = Math.random() * 100 + '%';
    p.style.background = cols[i % cols.length];
    p.style.animationDuration = 2 + Math.random() * 2.5 + 's';
    p.style.animationDelay = Math.random() * 0.8 + 's';
    box.appendChild(p);
    setTimeout(() => p.remove(), 5500);
  }
}

// Tableau des 9 combinaisons avec mini-cartes exemples.
export function renderCombos(container) {
  container.textContent = '';
  CATEGORIES.forEach((c, i) => {
    const li = document.createElement('li');
    const cards = document.createElement('div'); cards.className = 'mini-cards';
    for (const card of c.example) {
      const im = document.createElement('img'); im.src = faceURL(card); im.alt = cardLabel(card); im.draggable = false;
      cards.appendChild(im);
    }
    const txt = document.createElement('div'); txt.className = 'combo-txt';
    txt.innerHTML = `<b>${9 - i}. ${c.name}</b><small>${c.note}</small>`;
    li.append(cards, txt);
    container.appendChild(li);
  });
}

// Liste des places de l'accueil. seats : [{ type, name, custom }] (modifié en place), count : nombre de places affichées.
export function renderSeats(container, seats, count, onChange) {
  const types = () => seats.slice(0, count).map((x) => x.type);
  const refreshDefaults = () => {
    seats.slice(0, count).forEach((st, i) => { if (!st.custom) st.name = defaultSeatName(types(), i); });
    container.querySelectorAll('.seat input').forEach((inp, i) => { if (document.activeElement !== inp) inp.value = seats[i].name; });
  };
  container.textContent = '';
  seats.slice(0, count).forEach((st, i) => {
    const row = document.createElement('div'); row.className = 'seat';
    const inp = document.createElement('input');
    inp.type = 'text'; inp.maxLength = MAX_NAME; inp.value = st.name; inp.autocomplete = 'off';
    inp.setAttribute('aria-label', `Prénom de la place ${i + 1}`);
    inp.addEventListener('focus', () => inp.select());
    inp.addEventListener('input', () => { st.name = inp.value; st.custom = inp.value.trim() !== ''; onChange(); });
    const chips = document.createElement('div'); chips.className = 'chips';
    for (const [v, label] of [['human', '🧒 Humain'], ['bot', '🤖 Robot']]) {
      const b = document.createElement('button');
      b.className = 'chip' + (st.type === v ? ' sel' : ''); b.innerHTML = `<b>${label}</b>`;
      if (i === 0) b.disabled = true; // la place 1 est toujours humaine
      b.addEventListener('click', () => {
        if (i === 0 || st.type === v) return;
        st.type = v; st.custom = false;
        chips.querySelectorAll('.chip').forEach((c) => c.classList.toggle('sel', c === b));
        refreshDefaults(); onChange();
      });
      chips.appendChild(b);
    }
    row.append(inp, chips); container.appendChild(row);
  });
  refreshDefaults();
}
