import { COLORS, LEVELS, ROUNDS_PER_LEVEL } from './logic.js';

const $ = (id) => document.getElementById(id);
const hex = (n) => '#' + n.toString(16).padStart(6, '0');

// pointerdown + repli click (clavier / tests), sans double déclenchement.
export function onPress(el, fn) {
  let last = 0;
  el.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    last = performance.now();
    fn(e);
  });
  el.addEventListener('click', (e) => {
    if (performance.now() - last < 600) return;
    fn(e);
  });
}

let bubbleTimer = 0;

export const ui = {
  el: {
    tray: $('tray'), go: $('btn-go'), next: $('btn-next'), clear: $('btn-clear'),
    speak: $('btn-speak'), auto: $('btn-auto'), play: $('btn-play'), replay: $('btn-replay'),
    levels: document.querySelectorAll('.lvl'),
  },

  buildProgress() {
    $('pills').innerHTML = LEVELS.map((l) => `<div class="pill" data-i="${l.id - 1}">${l.id}</div>`).join('');
    $('rounds').innerHTML = Array.from({ length: ROUNDS_PER_LEVEL }, () => '<div class="rd"></div>').join('');
  },

  setProgress(level, round, total) {
    document.querySelectorAll('.pill').forEach((p, i) => {
      p.className = 'pill' + (i < level ? ' done' : i === level ? ' cur' : '');
    });
    document.querySelectorAll('.rd').forEach((d, i) => {
      d.className = 'rd' + (i < round ? ' done' : i === round ? ' cur' : '');
    });
    $('total-n').textContent = total;
  },

  setGoal(target, mode) {
    $('bignum').textContent = mode === 'sub' ? `= ${target}` : String(target);
    let html = '';
    for (let i = 0; i < target; i += 5) {
      html += '<div class="grp">' + '<i></i>'.repeat(Math.min(5, target - i)) + '</div>';
    }
    $('dots').innerHTML = html;
  },

  setInstruction(text) {
    $('instruction').textContent = text;
  },

  renderTray(values, onBrick) {
    const tray = $('tray');
    tray.innerHTML = '';
    for (const v of values) {
      const b = document.createElement('button');
      b.className = 'brick';
      b.style.width = `calc(64px + ${v - 1} * var(--u))`;
      b.style.background = hex(COLORS[v]);
      const c = COLORS[v];
      const lum = (0.299 * ((c >> 16) & 255) + 0.587 * ((c >> 8) & 255) + 0.114 * (c & 255)) / 255;
      b.style.color = lum > 0.55 ? '#2b2a4c' : '#fff';
      b.textContent = String(v);
      b.setAttribute('aria-label', `Brique ${v}`);
      onPress(b, () => onBrick(v));
      tray.appendChild(b);
    }
  },

  bubble(text, ms = 3200) {
    const b = $('bubble');
    b.textContent = text;
    b.classList.add('show');
    clearTimeout(bubbleTimer);
    if (ms) bubbleTimer = setTimeout(() => b.classList.remove('show'), ms);
  },

  hideBubble() {
    clearTimeout(bubbleTimer);
    $('bubble').classList.remove('show');
  },

  showStars(n) {
    $('result').innerHTML = [0, 1, 2].map((i) => `<span class="st ${i < n ? '' : 'off'}" style="animation-delay:${i * 0.18}s">⭐</span>`).join('');
  },
  hideStars() {
    $('result').innerHTML = '';
  },

  showNext(on) {
    this.el.next.hidden = !on;
    this.el.go.hidden = on;
    this.el.next.classList.toggle('pulse', on);
  },

  showWays(ways) {
    $('ways').innerHTML = ways.map((w, i) => `<div class="way"><b>${i + 1}</b>${w.map((v) => `<span class="mini" style="width:${v * 11}px;background:${hex(COLORS[v])}"></span>`).join('')}</div>`).join('');
  },

  setAuto(on) {
    this.el.auto.setAttribute('aria-pressed', String(on));
  },

  showTitle(on) {
    $('title').hidden = !on;
  },

  showEnd(stars) {
    $('end-stars').textContent = `⭐ ${stars}`;
    $('end').hidden = false;
  },
  hideEnd() {
    $('end').hidden = true;
  },

  setTitleImage(url) {
    if (url) $('title').style.backgroundImage = `url(${url})`;
  },
};
