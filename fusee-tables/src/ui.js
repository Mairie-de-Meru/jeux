// Overlay DOM : écrans, grille de points, réponses, confettis.
import { PLANETS } from './logic/progress.js';
import { CHOICE_TABLES } from './logic/tables.js';

const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function createUI(h) {
  const screens = { title: $('screen-title'), game: $('screen-game'), planet: $('screen-planet') };
  let hintTimers = [];
  let dotCount = 0;
  let padValue = '';
  let currentFact = null;

  function show(name) {
    for (const [k, el] of Object.entries(screens)) el.classList.toggle('hidden', k !== name);
  }

  // Titre
  document.querySelectorAll('.level').forEach((b) => {
    b.addEventListener('click', () => h.onStartLevel(Number(b.dataset.level)));
  });
  const parentsPanel = $('parents-panel');
  for (let t = 2; t <= 10; t++) {
    const b = document.createElement('button');
    b.textContent = t;
    b.addEventListener('click', () => {
      parentsPanel.classList.add('hidden');
      h.onParentTable(t);
    });
    $('table-pick').appendChild(b);
  }
  $('btn-parents').addEventListener('click', () => parentsPanel.classList.remove('hidden'));
  $('btn-parents-close').addEventListener('click', () => parentsPanel.classList.add('hidden'));
  $('btn-home').addEventListener('click', () => h.onHome());
  $('btn-home2').addEventListener('click', () => h.onHome());
  $('btn-again').addEventListener('click', () => h.onAgain());
  $('btn-speak').addEventListener('click', () => h.onSpeak());
  $('btn-dots-reset').addEventListener('click', resetDots);

  function showTitle(unlocked) {
    parentsPanel.classList.add('hidden');
    $('planets-row').replaceChildren(
      ...PLANETS.map((p, i) => {
        const d = document.createElement('span');
        d.className = 'pastille' + (p.ring ? ' ring' : '') + (i < unlocked ? '' : ' off');
        d.style.background = p.color;
        d.title = i < unlocked ? p.name : '?';
        return d;
      }),
    );
    show('title');
  }

  // Jeu
  function setStages(n, total) {
    $('portholes').replaceChildren(
      ...Array.from({ length: total }, (_, i) => {
        const d = document.createElement('span');
        d.className = 'porthole' + (i < n ? ' on' : '');
        return d;
      }),
    );
  }

  function clearHints() {
    hintTimers.forEach(clearTimeout);
    hintTimers = [];
    document.querySelectorAll('.dot.lit').forEach((d) => d.classList.remove('lit'));
    $('skip').innerHTML = '&nbsp;';
  }

  function updateCount() {
    $('count').textContent = dotCount;
  }
  function resetDots() {
    dotCount = 0;
    document.querySelectorAll('.dot.on').forEach((d) => d.classList.remove('on'));
    updateCount();
  }

  function buildDots(fact) {
    const wrap = $('dots');
    wrap.style.gridTemplateColumns = `repeat(${fact.b}, var(--dot, 24px))`;
    const dots = [];
    for (let r = 0; r < fact.a; r++) {
      for (let c = 0; c < fact.b; c++) {
        const d = document.createElement('button');
        d.className = 'dot';
        d.dataset.row = r;
        d.setAttribute('aria-label', 'point');
        d.addEventListener('click', () => {
          const on = d.classList.toggle('on');
          dotCount += on ? 1 : -1;
          updateCount();
          if (on) h.onDotCount(dotCount);
        });
        dots.push(d);
      }
    }
    wrap.replaceChildren(...dots);
    resetDots();
  }

  function showQuestion(fact, input, choices, stages, total) {
    currentFact = fact;
    padValue = '';
    clearHints();
    show('game');
    $('operation').textContent = `${fact.a} × ${fact.b} = ?`;
    setMessage('');
    setStages(stages, total);
    buildDots(fact);
    const box = $('answers');
    if (input === 'choices') {
      box.replaceChildren(
        ...choices.map((n) => {
          const b = document.createElement('button');
          b.className = 'choice';
          b.textContent = n;
          b.addEventListener('click', () => h.onAnswer(n));
          return b;
        }),
      );
    } else {
      const wrap = document.createElement('div');
      wrap.className = 'padwrap';
      const showEl = document.createElement('div');
      showEl.className = 'padshow';
      showEl.innerHTML = '&nbsp;';
      const pad = document.createElement('div');
      pad.className = 'pad';
      const refresh = () => (showEl.textContent = padValue || ' ');
      const key = (label, cls, fn) => {
        const b = document.createElement('button');
        b.className = 'key ' + cls;
        b.textContent = label;
        b.addEventListener('click', fn);
        pad.appendChild(b);
      };
      for (let i = 1; i <= 9; i++) {
        key(i, '', () => {
          if (padValue.length < 3) padValue += i;
          refresh();
        });
      }
      key('⌫', 'del', () => {
        padValue = padValue.slice(0, -1);
        refresh();
      });
      key(0, '', () => {
        if (padValue.length < 3 && padValue !== '0') padValue += '0';
        refresh();
      });
      key('✔', 'ok', () => {
        if (!padValue) return;
        const v = Number(padValue);
        padValue = '';
        refresh();
        h.onAnswer(v);
      });
      wrap.append(showEl, pad);
      box.replaceChildren(wrap);
    }
  }

  function setMessage(text, good = false) {
    const m = $('message');
    m.textContent = text || ' ';
    m.classList.toggle('good', good);
  }

  /** Indice : niveau 1 = grille illuminée ligne par ligne ; 2 = + comptage par bonds. */
  function showHint(level) {
    if (!currentFact) return;
    clearHints();
    const { a, b } = currentFact;
    const rows = Array.from({ length: a }, (_, r) => [...document.querySelectorAll(`.dot[data-row="${r}"]`)]);
    rows.forEach((row, r) => {
      hintTimers.push(setTimeout(() => {
        rows.forEach((x) => x.forEach((d) => d.classList.remove('lit')));
        row.forEach((d) => d.classList.add('lit'));
        h.onHintRow(r);
      }, 400 + r * 650));
    });
    if (level >= 2) {
      const steps = Array.from({ length: a }, (_, i) => b * (i + 1));
      $('skip').textContent = steps.join(', ');
    }
    hintTimers.push(setTimeout(() => rows.forEach((x) => x.forEach((d) => d.classList.remove('lit'))), 400 + a * 650 + 600));
  }

  async function countdown(onTick) {
    const el = $('countdown');
    for (const n of [3, 2, 1]) {
      el.classList.remove('hidden');
      el.style.animation = 'none';
      void el.offsetWidth;
      el.style.animation = '';
      el.textContent = n;
      onTick(n);
      await sleep(900);
    }
    el.textContent = '🚀';
    onTick(0);
    await sleep(500);
    el.classList.add('hidden');
  }

  function showPlanet(planet, stars) {
    $('planet-name').textContent = planet.name;
    $('planet-stars').textContent = stars > 0 ? '⭐'.repeat(stars) : '🌟';
    show('planet');
    confetti(160);
  }

  // Confettis (canvas 2D)
  const cv = $('confetti');
  const cx = cv.getContext('2d');
  let parts = [];
  let running = false;
  function sizeConfetti() {
    cv.width = window.innerWidth;
    cv.height = window.innerHeight;
  }
  sizeConfetti();
  window.addEventListener('resize', sizeConfetti);
  const COLORS = ['#ff4d6d', '#ffc928', '#3ddc84', '#4da6ff', '#b06cff', '#ff9f1c'];
  function confetti(n = 60) {
    const w = cv.width;
    for (let i = 0; i < n; i++) {
      parts.push({
        x: w * (0.2 + Math.random() * 0.6), y: -10 - Math.random() * 80,
        vx: (Math.random() - 0.5) * 6, vy: 2 + Math.random() * 5,
        s: 6 + Math.random() * 8, c: COLORS[i % COLORS.length], r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
        star: Math.random() < 0.3,
      });
    }
    if (!running) {
      running = true;
      requestAnimationFrame(tickConfetti);
    }
  }
  function tickConfetti() {
    cx.clearRect(0, 0, cv.width, cv.height);
    parts = parts.filter((p) => p.y < cv.height + 20);
    for (const p of parts) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.12;
      p.r += p.vr;
      cx.save();
      cx.translate(p.x, p.y);
      cx.rotate(p.r);
      cx.fillStyle = p.c;
      if (p.star) {
        cx.font = `${p.s * 2}px sans-serif`;
        cx.fillText('⭐', -p.s, p.s);
      } else {
        cx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
      }
      cx.restore();
    }
    if (parts.length) requestAnimationFrame(tickConfetti);
    else running = false;
  }

  return { showTitle, showQuestion, setMessage, showHint, setStages, countdown, showPlanet, confetti, clearHints, show };
}
