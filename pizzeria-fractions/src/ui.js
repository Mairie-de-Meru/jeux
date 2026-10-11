// Overlay HTML : écrans, HUD, bulles, boutons.
import { KNIFE_COUNTS } from './logic/levels.js';
import { TOPPINGS } from './food.js';
import { levelStars, isUnlocked, isLevelComplete } from './logic/progress.js';

const $ = (id) => document.getElementById(id);

export function fracHtml(n, d, size = 'small') {
  return `<span class="frac ${size}"><span class="num">${n}</span><span class="bar"></span><span class="den">${d}</span></span>`;
}

// Disque SVG en parts ; les `hi` premières parts sont colorées.
export function pieSvg(parts, hi = 0, kind = 'pizza') {
  const cx = 50, cy = 50, r = 44;
  const base = kind === 'cake' ? '#f6d9a0' : '#ffd45e';
  const hot = kind === 'cake' ? '#ff6fa5' : '#ff6a3c';
  let body = '';
  if (parts <= 1) {
    body = `<circle cx="50" cy="50" r="${r}" fill="${hi ? hot : base}"/>`;
  } else {
    for (let i = 0; i < parts; i++) {
      const a0 = (i / parts) * 2 * Math.PI - Math.PI / 2;
      const a1 = ((i + 1) / parts) * 2 * Math.PI - Math.PI / 2;
      const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0);
      const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
      const large = a1 - a0 > Math.PI ? 1 : 0;
      body += `<path d="M${cx} ${cy} L${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z" fill="${i < hi ? hot : base}" stroke="#fff" stroke-width="3" stroke-linejoin="round"/>`;
    }
  }
  return `<svg class="pie" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="48" fill="#d9822b"/>${body}</svg>`;
}

function knifeIcon(n) {
  let lines = '';
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 2 * Math.PI - Math.PI / 2;
    lines += `<line x1="20" y1="20" x2="${(20 + 17 * Math.cos(a)).toFixed(1)}" y2="${(20 + 17 * Math.sin(a)).toFixed(1)}" stroke="#d9822b" stroke-width="2.5" stroke-linecap="round"/>`;
  }
  return `<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="18" fill="#ffd45e" stroke="#d9822b" stroke-width="2"/>${lines}</svg>`;
}

export function createUI(h) {
  const ui = {};
  const el = {
    title: $('screen-title'), levels: $('screen-levels'), end: $('screen-end'), hud: $('hud'), bottom: $('bottom'),
    bubble: $('bubble'), hint: $('hint'), equation: $('equation'), reward: $('reward'), anchors: $('anchors'),
    knives: $('knives'), toppings: $('toppings'), serve: $('btn-serve'),
  };
  let hintTimer = 0, rewardTimer = 0;

  $('btn-play').addEventListener('click', () => h.onPlay());
  $('btn-levels-home').addEventListener('click', () => ui.showScreen('title'));
  $('btn-home').addEventListener('click', () => h.onHome());
  $('btn-speak').addEventListener('click', () => h.onSpeak());
  $('btn-next').addEventListener('click', () => h.onNext());
  $('btn-replay').addEventListener('click', () => h.onReplay());
  $('btn-end-levels').addEventListener('click', () => h.onHome());
  el.serve.addEventListener('click', () => h.onServe());

  el.knives.innerHTML = KNIFE_COUNTS.map((n) => `<button class="knife" data-n="${n}" aria-label="Couper en ${n}">${knifeIcon(n)}<b>${n}</b></button>`).join('');
  el.knives.addEventListener('click', (e) => {
    const b = e.target.closest('.knife');
    if (b) h.onKnife(Number(b.dataset.n));
  });
  el.toppings.addEventListener('click', (e) => {
    const b = e.target.closest('.tp');
    if (b) h.onTopping(Number(b.dataset.i));
  });

  ui.showScreen = (name) => {
    el.title.classList.toggle('hidden', name !== 'title');
    el.levels.classList.toggle('hidden', name !== 'levels');
    el.end.classList.toggle('hidden', name !== 'end');
    const play = name === 'play';
    el.hud.classList.toggle('hidden', !play);
    el.bottom.classList.toggle('hidden', !play);
    if (!play) ui.clearPlay();
  };

  ui.setTitleImages = (assets) => {
    if (assets.has('titre.png')) el.title.style.backgroundImage = `linear-gradient(rgba(255,233,204,.35), rgba(255,233,204,.35)), url(${assets.url('titre.png')})`;
    if (assets.has('icone.png')) {
      const logo = $('logo');
      logo.src = assets.url('icone.png');
      logo.classList.remove('hidden');
      const link = document.querySelector('link[rel="icon"]');
      if (link) link.href = assets.url('icone.png');
    }
    if (assets.has('fond.png')) $('bg').style.backgroundImage = `url(${assets.url('fond.png')})`;
  };

  ui.buildLevels = (levels, progress, onPick) => {
    const grid = $('level-grid');
    grid.innerHTML = '';
    for (const l of levels) {
      const ok = isUnlocked(progress, l.id);
      const s = levelStars(progress, l.id);
      const b = document.createElement('button');
      b.className = 'level-card' + (ok ? '' : ' locked');
      b.dataset.id = l.id;
      b.disabled = !ok;
      b.innerHTML = `<span class="ico">${ok ? l.icon : '🔒'}</span><span class="num">${l.id}</span><span>${l.name}</span><span class="st">${isLevelComplete(progress, l.id) ? '✅ ' : ''}⭐ ${s}/${l.nbManches * 3}</span>`;
      b.addEventListener('click', () => onPick(l.id));
      grid.appendChild(b);
    }
  };

  ui.setHud = ({ icon, name, round, rounds, stars, doneStars }) => {
    $('hud-level').textContent = `${icon} ${name}`;
    $('hud-dots').innerHTML = Array.from({ length: rounds }, (_, i) => `<i class="${i < doneStars.length ? 'done' : i === round ? 'cur' : ''}"></i>`).join('');
    $('hud-stars').textContent = `⭐ ${stars}`;
  };

  // opts : { pie:{parts,hi,kind}|null, text, frac:{n,d,size}|null, center:boolean }
  ui.setBubble = (opts) => {
    if (!opts) { el.bubble.classList.add('hidden'); return; }
    el.bubble.classList.remove('hidden');
    el.bubble.classList.toggle('center', !!opts.center);
    if (opts.center) { el.bubble.style.left = ''; el.bubble.style.top = ''; }
    el.bubble.style.animation = 'none';
    void el.bubble.offsetWidth;
    el.bubble.style.animation = '';
    el.bubble.innerHTML =
      (opts.pie ? pieSvg(opts.pie.parts, opts.pie.hi, opts.pie.kind) : '') +
      `<div class="txt">${opts.text}${opts.frac ? `<b>${fracHtml(opts.frac.n, opts.frac.d, opts.frac.size)}</b>` : ''}</div>`;
  };
  ui.placeBubble = (x, y) => {
    el.bubble.style.left = x + 'px';
    el.bubble.style.top = y + 'px';
  };
  ui.bubbleSize = () => ({ w: el.bubble.offsetWidth, h: el.bubble.offsetHeight });

  ui.setKnives = ({ visible, selected = null }) => {
    el.knives.classList.toggle('hidden', !visible);
    for (const b of el.knives.children) b.classList.toggle('sel', Number(b.dataset.n) === selected);
  };

  ui.setToppings = (kind, selected = -1) => {
    el.toppings.classList.toggle('hidden', !kind);
    if (!kind) return;
    if (el.toppings.dataset.kind !== kind) {
      el.toppings.dataset.kind = kind;
      el.toppings.innerHTML = TOPPINGS[kind]
        .map((t, i) => `<button class="tp" data-i="${i}" aria-label="${t.label}"><i style="background:${t.color}"></i></button>`)
        .join('');
    }
    for (const b of el.toppings.children) b.classList.toggle('sel', Number(b.dataset.i) === selected);
  };

  ui.setServe = (visible, enabled) => {
    el.serve.classList.toggle('hidden', !visible);
    el.serve.disabled = !enabled;
  };

  ui.showHint = (text, good = false, ms = 2600) => {
    clearTimeout(hintTimer);
    el.hint.textContent = text;
    el.hint.classList.toggle('good', good);
    el.hint.classList.remove('hidden');
    el.hint.style.animation = 'none';
    void el.hint.offsetWidth;
    el.hint.style.animation = '';
    hintTimer = setTimeout(() => el.hint.classList.add('hidden'), ms);
  };
  ui.hideHint = () => { clearTimeout(hintTimer); el.hint.classList.add('hidden'); };

  ui.showEquation = (html) => {
    el.equation.innerHTML = html;
    el.equation.classList.remove('hidden');
  };
  ui.hideEquation = () => el.equation.classList.add('hidden');

  ui.showReward = (stars, ms = 1600) => {
    clearTimeout(rewardTimer);
    el.reward.textContent = '⭐'.repeat(stars);
    el.reward.classList.remove('hidden');
    el.reward.style.animation = 'none';
    void el.reward.offsetWidth;
    el.reward.style.animation = '';
    rewardTimer = setTimeout(() => el.reward.classList.add('hidden'), ms);
  };

  ui.addAnchor = (html) => {
    const d = document.createElement('div');
    d.className = 'anchor';
    d.innerHTML = html;
    el.anchors.appendChild(d);
    return d;
  };
  ui.clearAnchors = () => { el.anchors.innerHTML = ''; };

  ui.clearPlay = () => {
    ui.setBubble(null);
    ui.hideHint();
    ui.hideEquation();
    el.reward.classList.add('hidden');
    ui.clearAnchors();
    ui.setServe(false, false);
    ui.setKnives({ visible: false });
    ui.setToppings(null);
  };

  ui.showEnd = ({ stars, max, hasNext }) => {
    ui.showScreen('end');
    const full = Math.round((stars / max) * 3);
    $('end-stars').textContent = '⭐'.repeat(Math.max(1, full));
    $('end-total').textContent = `${stars} / ${max} ⭐`;
    $('btn-next').classList.toggle('hidden', !hasNext);
  };

  return ui;
}
