import { defaultSeatName, MAX_NAME } from '../logic/turns.js';
import { COLOR_NAMES } from '../logic/game.js';

export const $ = (id) => document.getElementById(id);

let toastTimer = null;
export function toast(text, ms = 1500) {
  const el = $('toast');
  el.textContent = text; el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}

export function cardLabel(card, color) {
  switch (card.kind) {
    case 'num': return `le ${card.value} ${COLOR_NAMES[card.color]}`;
    case 'skip': return `« passe » ${COLOR_NAMES[card.color]}`;
    case 'rev': return `« sens inverse » ${COLOR_NAMES[card.color]}`;
    case 'draw2': return `+2 ${COLOR_NAMES[card.color]}`;
    case 'wild': return `un joker ${COLOR_NAMES[color]}`;
    default: return `un joker +4 ${COLOR_NAMES[color]}`;
  }
}

export const sortKey = (c) => ({ R: 0, B: 1, G: 2, Y: 3 }[c.color] ?? 4) * 100 + (c.kind === 'num' ? c.value : 20 + ['skip', 'rev', 'draw2', 'wild', 'wild4'].indexOf(c.kind));

export function setChips(groupId, onPick) {
  const g = $(groupId);
  g.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip'); if (!chip) return;
    g.querySelectorAll('.chip').forEach((c) => c.classList.toggle('sel', c === chip));
    onPick(chip.dataset.v);
  });
}

// Podium : colonnes 2-1-3(-4), marches qui montent, avatars (image ou emoji).
export function renderPodium(box, list, avatarOf) {
  box.textContent = '';
  const order = list.length >= 3 ? [1, 0, 2, 3] : [1, 0];
  const heights = [100, 72, 52, 38];
  order.forEach((idx) => {
    const r = list[idx]; if (!r) return;
    const col = document.createElement('div'); col.className = 'pod-col'; col.dataset.place = idx + 1;
    const src = avatarOf && avatarOf(r.emoji);
    const av = document.createElement('div'); av.className = 'pod-av';
    if (src) { const im = document.createElement('img'); im.src = src; im.alt = ''; av.appendChild(im); } else av.textContent = r.emoji;
    const nm = document.createElement('div'); nm.className = 'pod-name'; nm.textContent = r.name;
    const st = document.createElement('div'); st.className = 'pod-step'; st.textContent = ['🥇', '🥈', '🥉', '4'][idx];
    st.style.setProperty('--h', heights[idx] + 'px'); st.style.setProperty('--d', (3 - Math.min(idx, 3)) * 0.35 + 's');
    col.append(av, nm, st); box.appendChild(col);
  });
}

export function showRanking(list, winnerHuman, title, avatarOf) {
  renderPodium($('podium'), list, avatarOf);
  const medals = ['🥇', '🥈', '🥉', '🏅'];
  $('ranking').textContent = '';
  list.forEach((r, i) => {
    const li = document.createElement('li');
    if (r.human) li.classList.add('me');
    li.innerHTML = `<span class="medal">${medals[i] || '🏅'}</span><span>${r.emoji} ${r.name}</span><span class="left">${r.left === 0 ? 'Gagné !' : r.left + ' carte' + (r.left > 1 ? 's' : '')}</span>`;
    $('ranking').appendChild(li);
  });
  $('end-emoji').textContent = winnerHuman ? '🏆' : '🎉';
  $('end-title').textContent = title || (winnerHuman ? 'Bravo, tu as gagné !' : `${list[0].name} a gagné !`);
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
