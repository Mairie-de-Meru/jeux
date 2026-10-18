// DOM : pastille de messages, écran de départ, historique, joueurs.
export const $ = (id) => document.getElementById(id);

let toastTimer = 0;
export function toast(text, kind = '', ms = 2400) {
  const t = $('toast');
  clearTimeout(toastTimer);
  if (!text) { t.classList.remove('show'); return; }
  t.textContent = text;
  t.className = 'show' + (kind ? ' ' + kind : '');
  if (ms > 0) toastTimer = setTimeout(() => t.classList.remove('show'), ms);
}

export const show = (id) => $(id).classList.remove('hidden');
export const hide = (id) => $(id).classList.add('hidden');

export function setPlayers(setup, turn, over) {
  for (const c of ['w', 'b']) {
    $('nm-' + c).textContent = setup.seats[c].name;
    $('pl-' + c).classList.toggle('turn', !over && turn === c);
  }
}

export function renderHistory(sans, startFullmove = 1, startTurn = 'w') {
  const ol = $('history');
  ol.innerHTML = '';
  // numérotation à partir de la position de départ
  let n = startFullmove, turn = startTurn;
  let li = null;
  sans.forEach((san, i) => {
    if (turn === 'w' || !li) {
      li = document.createElement('li');
      const num = document.createElement('span');
      num.className = 'n';
      num.textContent = turn === 'w' ? n + '.' : n + '…';
      li.appendChild(num);
      ol.appendChild(li);
    }
    const b = document.createElement('b');
    b.textContent = san;
    if (i === sans.length - 1) b.className = 'cur';
    li.appendChild(b);
    if (turn === 'b') { n++; li = null; }
    turn = turn === 'w' ? 'b' : 'w';
  });
  if (!sans.length) ol.textContent = 'Aucun coup';
  ol.scrollLeft = ol.scrollWidth;
  ol.scrollTop = ol.scrollHeight;
}

// Écran de départ : lit/écrit la configuration.
export function initHome({ onPlay, onResume, onRules }) {
  const seats = [...document.querySelectorAll('.seat')];
  const sel = (grp, v) => grp.querySelectorAll('.chip').forEach((c) => c.classList.toggle('sel', c.dataset.v === String(v)));
  const val = (grp) => (grp.querySelector('.chip.sel') || {}).dataset?.v;
  const optColor = $('opt-color'), optPalier = $('opt-palier'), rot = $('opt-rotate');

  function refresh() {
    const types = seats.map((s) => val(s.querySelector('.chips')));
    const bots = types.filter((t) => t === 'bot').length;
    $('grp-palier').classList.toggle('hidden', bots === 0);
    $('grp-rotate').classList.toggle('hidden', bots !== 0);
    if (bots !== 0) rot.setAttribute('aria-pressed', 'false');
  }
  seats.forEach((s, i) => {
    const chips = s.querySelector('.chips'), input = s.querySelector('.name');
    chips.addEventListener('click', (e) => {
      const b = e.target.closest('.chip'); if (!b) return;
      sel(chips, b.dataset.v);
      const cur = input.value.trim();
      if (b.dataset.v === 'bot' && (cur === 'Toi' || cur === 'Joueur 2' || !cur)) input.value = 'Robot';
      if (b.dataset.v === 'human' && (cur === 'Robot' || !cur)) input.value = i === 0 ? 'Toi' : 'Joueur 2';
      refresh();
    });
  });
  for (const g of [optColor, optPalier]) g.addEventListener('click', (e) => { const b = e.target.closest('.chip'); if (b) sel(g, b.dataset.v); });
  rot.addEventListener('click', () => rot.setAttribute('aria-pressed', rot.getAttribute('aria-pressed') === 'true' ? 'false' : 'true'));
  $('btn-play').addEventListener('click', () => onPlay(read()));
  $('btn-resume').addEventListener('click', onResume);
  $('btn-rules').addEventListener('click', onRules);
  $('btn-voice').addEventListener('click', onRules);

  function read() {
    const [a, b] = seats.map((s) => ({ type: val(s.querySelector('.chips')), name: s.querySelector('.name').value }));
    return { p1: a, p2: b, color: val(optColor), level: +val(optPalier), rotate: rot.getAttribute('aria-pressed') === 'true' };
  }
  refresh();
  return {
    read,
    setHero(img) {
      const h = $('hero');
      if (img) { h.src = img.src; h.classList.remove('hidden', 'fallback'); }
      else { h.removeAttribute('src'); h.classList.add('fallback'); h.classList.remove('hidden'); }
    },
    setResume(on) { $('btn-resume').classList.toggle('hidden', !on); },
  };
}
