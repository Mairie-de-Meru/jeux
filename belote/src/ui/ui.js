import { faceURL } from '../render/cardart.js';
import { defaultSeatName, MAX_NAME } from '../logic/turns.js';
import { handLayout } from '../logic/layout.js';
import { SUIT_NAMES, SUIT_SYMBOLS, SUITS, cardOrder } from '../logic/cards.js';
import { cardSpeech } from '../logic/speechtext.js';

export const $ = (id) => document.getElementById(id);

let toastTimer = null;
export function toast(text, ms = 1500) {
  const el = $('toast');
  el.textContent = text; el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}

// Bulle courte à côté d'une place (coordonnées écran).
export function bubble(pos, text, ms = 1500) {
  const b = document.createElement('div');
  b.className = 'bubble'; b.textContent = text;
  const box = $('bubbles').getBoundingClientRect();
  b.style.left = Math.min(Math.max(pos.x - box.left, 50), box.width - 50) + 'px';
  b.style.top = Math.min(Math.max(pos.y - box.top, 20), box.height - 20) + 'px';
  $('bubbles').appendChild(b);
  setTimeout(() => b.remove(), ms);
}

export const cardLabel = cardSpeech;
const SUIT_ORDER = ['S', 'H', 'C', 'D'];

// Main triée : atout d'abord (si connu), couleurs alternées, cartes fortes à gauche.
export function sortHand(hand, trump) {
  const suits = [...SUIT_ORDER].sort((a, b) => (b === trump) - (a === trump));
  return [...hand].sort((a, b) => (suits.indexOf(a.suit) - suits.indexOf(b.suit)) || (cardOrder(b, trump) - cardOrder(a, trump)));
}

export function renderHand(container, hand, { trump, legalIds, highlight, adviceId, onTap }) {
  container.textContent = '';
  const sorted = sortHand(hand, trump);
  container._count = sorted.length;
  const buttons = sorted.map((card) => {
    const b = document.createElement('button');
    b.className = 'card';
    b.dataset.id = card.id;
    b.setAttribute('aria-label', cardSpeech(card));
    if (highlight) b.classList.add(legalIds.has(card.id) ? 'playable' : 'dim');
    if (adviceId === card.id) b.classList.add('advised');
    const img = document.createElement('img');
    img.src = faceURL(card); img.alt = ''; img.draggable = false;
    b.appendChild(img);
    b.addEventListener('click', () => onTap(card, b));
    return b;
  });
  container._buttons = buttons;
  fitHand(container);
  if (!container._ro && window.ResizeObserver) {
    container._ro = new ResizeObserver(() => { const k = `${container.clientWidth}x${container.clientHeight}`; if (k !== container._k) { container._k = k; fitHand(container); } });
    container._ro.observe(container);
  }
}

// Répartit les cartes en 1 ou 2 rangées (la 2e recouvre la moitié basse de la 1re).
export function fitHand(container) {
  const buttons = container._buttons || [];
  const n = buttons.length;
  container.textContent = '';
  if (!n) return;
  const cs = getComputedStyle(container);
  const px = (v) => parseFloat(v) || 0;
  const boxW = container.clientWidth - px(cs.paddingLeft) - px(cs.paddingRight);
  const boxH = container.clientHeight - px(cs.paddingTop) - px(cs.paddingBottom);
  const maxW = Math.max(48, Math.min(96, Math.floor(window.innerHeight * 0.16)));
  const lay = handLayout({ n, boxW: Math.max(boxW, 120), boxH: Math.max(boxH, 60), gap: 4, maxW, minW: 48 });
  container.style.setProperty('--card-w', lay.w + 'px');
  container.style.setProperty('--row-top', lay.top + 'px');
  for (let r = 0; r < lay.rows; r++) {
    const row = document.createElement('div'); row.className = 'hrow';
    buttons.slice(r * lay.perRow, (r + 1) * lay.perRow).forEach((b) => row.appendChild(b));
    container.appendChild(row);
  }
}

// Panneau d'enchères. choice : { take, suit? }.
export function renderBid(container, { round, turned, advice, onChoice }) {
  container.textContent = '';
  const suits = round === 1 ? [turned.suit] : SUITS.filter((s) => s !== turned.suit);
  for (const s of suits) {
    const b = document.createElement('button');
    b.className = 'btn bid take' + (advice && advice.take && (round === 1 || advice.suit === s) ? ' advised' : '');
    b.dataset.suit = s;
    b.innerHTML = `Je prends <span class="suit ${s === 'H' || s === 'D' ? 'red' : 'black'}">${SUIT_SYMBOLS[s]}</span>`;
    b.setAttribute('aria-label', `Je prends à ${SUIT_NAMES[s]}`);
    b.addEventListener('click', () => onChoice({ take: true, suit: s }));
    container.appendChild(b);
  }
  const p = document.createElement('button');
  p.className = 'btn bid pass ghost' + (advice && !advice.take ? ' advised' : '');
  p.textContent = 'Je passe';
  p.addEventListener('click', () => onChoice({ take: false }));
  container.appendChild(p);
}

export function setChips(groupId, onPick) {
  const g = $(groupId);
  g.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip'); if (!chip) return;
    g.querySelectorAll('.chip').forEach((c) => c.classList.toggle('sel', c === chip));
    onPick(chip.dataset.v);
  });
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

const ROLE = ['Toi', 'Adversaire', 'Partenaire', 'Adversaire'];
// Liste des 4 places de l'accueil. seats : [{ type, name, custom }] (modifié en place).
export function renderSeats(container, seats, onChange) {
  const types = () => seats.map((x) => x.type);
  const refreshDefaults = () => {
    seats.forEach((st, i) => { if (!st.custom) st.name = defaultSeatName(types(), i); });
    container.querySelectorAll('.seat input').forEach((inp, i) => { if (document.activeElement !== inp) inp.value = seats[i].name; });
  };
  container.textContent = '';
  seats.forEach((st, i) => {
    const row = document.createElement('div'); row.className = 'seat';
    const role = document.createElement('span'); role.className = 'role'; role.textContent = ROLE[i];
    const inp = document.createElement('input');
    inp.type = 'text'; inp.maxLength = MAX_NAME; inp.value = st.name; inp.autocomplete = 'off';
    inp.setAttribute('aria-label', `Prénom de la place ${i + 1} (${ROLE[i]})`);
    inp.addEventListener('focus', () => inp.select());
    inp.addEventListener('input', () => { st.name = inp.value; st.custom = inp.value.trim() !== ''; onChange(); });
    const chips = document.createElement('div'); chips.className = 'chips';
    for (const [v, label] of [['human', 'Humain'], ['bot', 'Robot']]) {
      const b = document.createElement('button');
      b.className = 'chip' + (st.type === v ? ' sel' : ''); b.innerHTML = `<b>${label}</b>`;
      if (i === 0) b.disabled = true; // la place 0 est toujours humaine
      b.addEventListener('click', () => {
        if (i === 0 || st.type === v) return;
        st.type = v; st.custom = false;
        chips.querySelectorAll('.chip').forEach((c) => c.classList.toggle('sel', c === b));
        refreshDefaults(); onChange();
      });
      chips.appendChild(b);
    }
    row.append(role, inp, chips); container.appendChild(row);
  });
  refreshDefaults();
}

// Bilan de donne : tableau Nous / Eux, ton encourageant.
export function renderBilan(m, result, { solo, matchOver }) {
  const names = ['Nous', 'Eux'];
  const t = result.takerTeam, taker = m.players[result.taker];
  const pre = result.trump ? SUIT_SYMBOLS[result.trump] : '';
  let title, tone;
  if (result.capot === 0) { title = 'Capot ! 🎉'; tone = 'Vous avez gagné tous les plis, bravo !'; }
  else if (result.capot === 1) { title = 'Capot pour Eux'; tone = 'Ils ont tout gagné cette fois. On se rattrape !'; }
  else if (result.made && t === 0) { title = 'Contrat réussi ! 🎉'; tone = 'Bien joué, équipe !'; }
  else if (!result.made && t === 0) { title = 'Dedans… pas grave !'; tone = 'Ça arrive : à la prochaine donne !'; }
  else if (result.made) { title = 'Eux réussissent'; tone = 'Bien joué à eux. À nous !'; }
  else { title = 'Eux sont dedans ! 👏'; tone = 'Nous marquons toute la donne.'; }
  $('deal-title').textContent = title;
  $('deal-tone').textContent = `${taker.emoji} ${taker.name} avait pris à ${pre}. ${tone}`;
  const lastDix = result.capot === null ? result.lastTrickTeam : null;
  const cardsRow = result.capot === null ? result.cards : result.points;
  const rows = [
    ['Cartes', cardsRow[0], cardsRow[1]],
    ['Dix de der', lastDix === 0 ? 10 : 0, lastDix === 1 ? 10 : 0],
    ['Belote', result.belote[0], result.belote[1]],
  ];
  if (result.capot !== null) rows[0][0] = 'Capot';
  rows.push(['Contrat', t === 0 ? (result.made ? '✓ réussi' : '✗ dedans') : '', t === 1 ? (result.made ? '✓ réussi' : '✗ dedans') : '']);
  rows.push(['Donne', result.final[0], result.final[1]], ['Partie', m.scores[0], m.scores[1]]);
  const tb = $('deal-table'); tb.textContent = '';
  const head = document.createElement('tr'); head.innerHTML = `<th></th><th>${names[0]}</th><th>${names[1]}</th>`; tb.appendChild(head);
  rows.forEach((r, i) => {
    const tr = document.createElement('tr'); if (i >= rows.length - 2) tr.className = 'sum';
    tr.innerHTML = `<td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td>`; tb.appendChild(tr);
  });
  $('btn-next').textContent = matchOver ? 'Voir le résultat' : 'Donne suivante ▶';
  $('deal').classList.remove('hidden');
}
