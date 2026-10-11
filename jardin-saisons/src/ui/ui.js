import { SEASONS, SEASON_INFO, ITEMS } from '../logic/seasons.js';
import { CYCLES } from '../logic/cycles.js';
import { needsFor, STAGES } from '../logic/plant.js';
import { isUnlocked } from '../logic/progress.js';
import { T } from '../logic/texts.js';
import { cardFace } from '../assets.js';

const $ = (id) => document.getElementById(id);
const ACTS = [['plante', '🌱'], ['cycle', '🔄'], ['saison', '🍂']];

export function createUI(cb) {
  const body = document.body;
  let toastTimer = 0;

  // Accueil
  ACTS.forEach(([id, ic]) => {
    const b = document.createElement('button');
    b.className = 'big act'; b.innerHTML = `<span class="ic">${ic}</span><span>${T.activites[id]}</span>`;
    b.addEventListener('click', () => cb.onActivity(id));
    $('acts').appendChild(b);
  });
  // Roue des saisons
  SEASONS.forEach((s) => {
    const b = document.createElement('button');
    b.className = 'big'; b.dataset.season = s; b.textContent = SEASON_INFO[s].emoji; b.setAttribute('aria-label', SEASON_INFO[s].label);
    b.addEventListener('click', () => cb.onSeason(s));
    $('wheel').appendChild(b);
  });
  $('btnHome').addEventListener('click', () => cb.onHome());
  $('btnSpeak').addEventListener('click', () => cb.onSpeak());
  $('btnLevelsBack').addEventListener('click', () => cb.onHome());
  $('btnWater').addEventListener('click', () => cb.onPlantAction('water'));
  $('btnSun').addEventListener('click', () => cb.onPlantAction('sun'));
  $('btnAgain').addEventListener('click', () => cb.onAgain());
  $('btnEndLevels').addEventListener('click', () => cb.onEndContinue());

  function screen(name, activity) {
    body.dataset.screen = name;
    if (activity) body.dataset.activity = activity;
  }
  function setPrompt(t) { $('prompt').textContent = t; }
  function setSeasonActive(s, locked) {
    $('wheel').classList.toggle('locked', !!locked);
    [...$('wheel').children].forEach((b) => b.classList.toggle('on', b.dataset.season === s));
  }
  function toast(text, ms = 2600) {
    const t = $('toast'); t.textContent = text; t.classList.add('on');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('on'), ms);
  }
  function hideToast() { clearTimeout(toastTimer); $('toast').classList.remove('on'); }

  function renderLevels(activity, progress) {
    $('levelsTitle').textContent = T.activites[activity];
    const box = $('levelBtns'); box.innerHTML = '';
    for (let l = 1; l <= 3; l++) {
      const un = isUnlocked(progress, activity, l);
      const n = progress.stars[`${activity}-${l}`] || 0;
      const b = document.createElement('button');
      b.className = 'big lvl'; b.disabled = !un;
      b.innerHTML = `<span>${un ? l : '🔒'}</span><small>${'⭐'.repeat(n)}${'☆'.repeat(3 - n)}</small>`;
      b.setAttribute('aria-label', `Niveau ${l}`);
      b.addEventListener('click', () => cb.onLevel(activity, l));
      box.appendChild(b);
    }
  }

  // Activité 1
  function renderPlant(plant) {
    const need = needsFor(plant.stage, plant.level);
    const parts = [];
    for (let i = 0; i < need.water; i++) parts.push(`<span class="${plant.water > i ? '' : 'off'}">💧</span>`);
    for (let i = 0; i < need.sun; i++) parts.push(`<span class="${plant.sun > i ? '' : 'off'}">☀️</span>`);
    $('needs').innerHTML = plant.stage >= STAGES.length - 1 ? '🍎' : parts.join('');
  }
  function blink(which) {
    const b = which === 'water' ? $('btnWater') : which === 'sun' ? $('btnSun') : null;
    if (!b) return;
    b.classList.remove('blink'); void b.offsetWidth; b.classList.add('blink');
    setTimeout(() => b.classList.remove('blink'), 2600);
  }

  // Activité 2 : cases + cartes, glisser-déposer au pointeur ET tap-puis-tap
  let selected = null;
  let cycleRound = null;
  function renderCycle(round) {
    cycleRound = round;
    const slots = $('slots'), hand = $('hand');
    slots.innerHTML = ''; hand.innerHTML = '';
    round.slots.forEach((id, i) => {
      if (i > 0) { const a = document.createElement('span'); a.className = 'arrow'; a.textContent = '→'; slots.appendChild(a); }
      const s = document.createElement('button');
      s.className = 'slot' + (id ? ' filled' : ''); s.dataset.slot = i; s.setAttribute('aria-label', 'Case ' + (i + 1));
      if (id) s.appendChild(cardFace(id, null));
      else s.addEventListener('click', () => { if (selected) tryPlace(selected, i); });
      slots.appendChild(s);
    });
    round.hand.forEach((id) => {
      const c = document.createElement('div');
      c.className = 'card' + (selected === id ? ' sel' : ''); c.dataset.id = id;
      c.appendChild(cardFace(id, T.stades[id].replace(/^(la |le |l')/, '')));
      attachDrag(c, id);
      hand.appendChild(c);
    });
    if (selected && !round.hand.includes(selected)) selected = null;
  }
  function tryPlace(cardId, slotIdx) {
    const r = cb.onPlaceCard(cardId, slotIdx);
    selected = null;
    if (!r.ok) {
      const el = document.querySelector(`#hand .card[data-id="${cardId}"]`);
      if (el) { el.classList.remove('sel', 'drag-src'); el.classList.remove('bounce'); void el.offsetWidth; el.classList.add('bounce'); }
    }
  }
  function attachDrag(el, id) {
    let sx = 0, sy = 0, ghost = null, dragging = false, dx = 0, dy = 0, moved = false;
    el.addEventListener('pointerdown', (e) => {
      cb.onFirstPointer && cb.onFirstPointer();
      sx = e.clientX; sy = e.clientY; dragging = true; moved = false;
      const r = el.getBoundingClientRect(); dx = e.clientX - r.left; dy = e.clientY - r.top;
      el.setPointerCapture(e.pointerId);
    });
    el.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      if (!moved && Math.hypot(e.clientX - sx, e.clientY - sy) > 8) {
        moved = true;
        ghost = el.cloneNode(true); ghost.classList.add('ghost'); ghost.classList.remove('sel');
        const r = el.getBoundingClientRect(); ghost.style.width = r.width + 'px'; ghost.style.height = r.height + 'px';
        document.body.appendChild(ghost); el.classList.add('drag-src');
      }
      if (ghost) {
        ghost.style.left = e.clientX - dx + 'px'; ghost.style.top = e.clientY - dy + 'px';
        document.querySelectorAll('.slot.target').forEach((n) => n.classList.remove('target'));
        const s = slotAt(e.clientX, e.clientY); if (s) s.classList.add('target');
      }
    });
    const end = (e) => {
      if (!dragging) return; dragging = false;
      document.querySelectorAll('.slot.target').forEach((n) => n.classList.remove('target'));
      if (moved) {
        const s = slotAt(e.clientX, e.clientY);
        if (ghost) { ghost.remove(); ghost = null; }
        el.classList.remove('drag-src');
        if (s) tryPlace(id, Number(s.dataset.slot));
        return;
      }
      // simple tap : (dé)sélectionne la carte
      selected = selected === id ? null : id;
      cb.onTap && cb.onTap();
      renderCycle(cycleRound);
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', () => { dragging = false; if (ghost) { ghost.remove(); ghost = null; } el.classList.remove('drag-src'); });
  }
  function slotAt(x, y) {
    for (const n of document.elementsFromPoint(x, y)) { const s = n.closest && n.closest('.slot'); if (s) return s; }
    return null;
  }

  // Activité 3
  function renderDress(round) {
    const box = $('proposals'); box.innerHTML = '';
    round.proposals.forEach((id) => {
      const it = ITEMS.find((i) => i.id === id);
      const b = document.createElement('button');
      b.className = 'big prop' + (round.placed.includes(id) ? ' done' : ''); b.dataset.id = id;
      b.innerHTML = `<span class="em">${it.emoji}</span><span>${it.label}</span>`;
      b.addEventListener('click', () => cb.onChooseItem(id));
      box.appendChild(b);
    });
  }
  function shakeProp(id) {
    const el = document.querySelector(`#proposals .prop[data-id="${id}"]`);
    if (el) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }
  }

  function showEnd(stars, text) {
    $('endStars').innerHTML = [1, 2, 3].map((i) => `<span class="${i <= stars ? '' : 'off'}">⭐</span>`).join('');
    $('endText').textContent = text;
    screen('end');
  }
  void CYCLES;
  return { screen, setPrompt, setSeasonActive, toast, hideToast, renderLevels, renderPlant, blink, renderCycle, renderDress, shakeProp, showEnd };
}
