import { Board } from './scene.js';
import { SOLUTIONS, isAccepted, definition, clean } from './mots.js';
import * as G from './logic/game.js';
import { loadStats, saveStats } from './storage.js';
import { sfx, speak, setMuted, isMuted } from './audio.js';

const $ = (id) => document.getElementById(id);
const rng = Math.random;
let stats = loadStats();
let mode = 'libre';
let state = null;
let cur = '';
let busy = false;
let endTimer = 0;
let lastLevel = 1;
let board = null;
let toastTimer = 0;

const ROWS = ['azertyuiop', 'qsdfghjklm', 'wxcvbn'];
const RULES = "Trouve le mot caché. La première lettre est donnée. Carré rouge : la bonne lettre au bon endroit. Rond jaune : la lettre est dans le mot, mais ailleurs. Bleu : la lettre n'est pas dans le mot.";

/* ---------- interface ---------- */
function tiles(word, cls = 'c') {
  return [...word].map((ch) => `<div class="ltile ${cls}">${ch.toUpperCase()}</div>`).join('');
}
function buildLogo() {
  $('logo').innerHTML = '<div class="ltile c">S</div><div class="ltile p"><span>O</span></div><div class="ltile a">T</div><div class="ltile c">U</div><div class="ltile p"><span>M</span></div>';
}
function buildKeyboard() {
  const kb = $('kb');
  kb.innerHTML = '';
  ROWS.forEach((row, i) => {
    const d = document.createElement('div');
    d.className = 'krow';
    for (const ch of row) {
      const b = document.createElement('button');
      b.className = 'key'; b.dataset.k = ch; b.textContent = ch.toUpperCase();
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); pressLetter(ch); });
      d.appendChild(b);
    }
    if (i === 2) {
      const del = document.createElement('button');
      del.className = 'key wide'; del.textContent = '⌫'; del.setAttribute('aria-label', 'Effacer');
      del.addEventListener('pointerdown', (e) => { e.preventDefault(); pressBack(); });
      d.appendChild(del);
    }
    kb.appendChild(d);
  });
  const a = document.createElement('div');
  a.className = 'arow';
  a.innerHTML = '<button id="btnHint" class="act">💡 Indice</button><button id="btnValid" class="act">✔ Valider</button>';
  kb.appendChild(a);
  $('btnValid').addEventListener('pointerdown', (e) => { e.preventDefault(); pressEnter(); });
  $('btnHint').addEventListener('pointerdown', (e) => { e.preventDefault(); openHint(); });
}
function paintKeys() {
  document.querySelectorAll('.key[data-k]').forEach((k) => {
    k.classList.remove('correct', 'present', 'absent');
    const s = state && state.keys[k.dataset.k];
    if (s) k.classList.add(s);
  });
}
function toast(msg, ms = 1800) {
  const t = $('toast');
  t.textContent = msg; t.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('on'), ms);
}
function updateScore() {
  $('starsN').textContent = `⭐ ${stats.stars}`;
  $('streakN').textContent = `🔥 ${stats.streak}`;
}
function renderHome() {
  updateScore();
  $('homeStats').innerHTML = `<span>⭐ ${stats.stars}</span><span>🔥 Série ${stats.streak}</span><span>🏆 Record ${stats.best}</span>`;
  const key = G.dateKey();
  $('paliers').innerHTML = '';
  for (const l of [1, 2, 3]) {
    const c = G.PALIERS[l];
    const done = mode === 'jour' && stats.daily[`${key}:${l}`];
    const b = document.createElement('button');
    b.className = 'pal'; b.dataset.l = l;
    b.innerHTML = `<span>Palier ${l}</span><small>${c.lens[0]}-${c.lens[c.lens.length - 1]} lettres · ${c.tries} essais${c.hint ? ' · 💡' : ''}${done ? ' · ✅ fait' : ''}</small>`;
    b.addEventListener('click', () => startGame(l, mode));
    $('paliers').appendChild(b);
  }
  document.querySelectorAll('.mode').forEach((m) => m.classList.toggle('on', m.dataset.mode === mode));
}
function showOnly(id) {
  for (const p of ['home', 'rules', 'hintDlg', 'end']) $(p).classList.toggle('hidden', p !== id);
}
function closePanels() { for (const p of ['home', 'rules', 'hintDlg', 'end']) $(p).classList.add('hidden'); }

/* ---------- plateau ---------- */
function known() { return G.knownLetters(state); }
function refresh(activate = false) {
  if (!state) return;
  const r = state.guesses.length;
  if (state.status !== 'playing' || r >= state.maxTries) return;
  const k = known();
  const shown = G.displayLetters(k, cur);
  for (let c = 0; c < state.len; c++) {
    const typedHere = c > 0 && c - 1 < cur.length;
    const d = { letter: shown[c] || '', first: c === 0, state: c === 0 || (k[c] !== null && (!typedHere || shown[c] === k[c])) ? 'correct' : 'empty' };
    board.set(r, c, d);
    if (activate && d.state === 'correct') board.pop(r, c);
  }
}
function startGame(level, md, forcedWord) {
  clearTimeout(endTimer);
  const cfg = G.PALIERS[level];
  const key = G.dateKey();
  let word = forcedWord;
  if (!word) {
    word = (md === 'jour' ? G.dailyPick(key, level, SOLUTIONS) : G.pickRandom(level, SOLUTIONS, rng, state && state.word)).word;
  }
  lastLevel = level; mode = md;
  state = G.newGame({ level, word, mode: md, dayKey: md === 'jour' ? key : null });
  cur = ''; busy = false;
  closePanels();
  $('hintline').classList.remove('on');
  $('btnHint').style.display = cfg.hint ? '' : 'none';
  $('info').textContent = `${md === 'jour' ? '📅 Mot du jour' : '🎲 Partie libre'} · ${word.length} lettres`;
  board.build(cfg.tries, word.length);
  paintKeys(); refresh(true); updateScore();
  if (md === 'jour' && stats.daily[`${key}:${level}`]) toast("Tu l'as déjà fait aujourd'hui, mais tu peux rejouer !", 3000);
}

/* ---------- saisie ---------- */
function canType() { return state && state.status === 'playing' && !busy && $('home').classList.contains('hidden') && $('end').classList.contains('hidden') && $('rules').classList.contains('hidden') && $('hintDlg').classList.contains('hidden'); }
function pressLetter(ch) {
  if (!canType()) return;
  const n = G.typeInto(known(), cur, ch);
  if (n === cur) return;
  cur = n; sfx.key(); refresh();
  board.pop(state.guesses.length, cur.length);
}
function pressBack() {
  if (!canType()) return;
  const n = G.backInto(known(), cur);
  if (n === cur) return;
  cur = n; sfx.del(); refresh();
}
function pressEnter() {
  if (!canType()) return;
  const r = state.guesses.length;
  const guess = G.composeGuess(known(), cur);
  const res = G.submit(state, guess, isAccepted);
  if (!res.ok) {
    board.shake(r); sfx.nope();
    toast(res.error === 'court' ? 'Il manque des lettres' : 'Je ne connais pas ce mot');
    return;
  }
  busy = true;
  board.reveal(r, guess, res.result, (c) => sfx.flip(c)).then(() => {
    paintKeys();
    if (res.status === 'playing') {
      cur = ''; busy = false; refresh(true);
    } else finish(r);
  });
}
function finish(row) {
  const won = state.status === 'won';
  const out = G.recordResult(stats, state);
  stats = out.stats; saveStats(stats); updateScore();
  if (won) { board.dance(row); sfx.win(); confetti(); } else sfx.end();
  const def = definition(state.word);
  endTimer = setTimeout(() => {
    $('endTitle').textContent = won ? '🎉 Bravo !' : '💪 Presque ! Tu y arrives bientôt';
    $('endWord').innerHTML = tiles(state.word, won ? 'c' : 'a');
    $('endDef').textContent = def;
    $('endStars').textContent = won ? (out.counted ? '⭐'.repeat(out.stars) : 'Déjà gagné aujourd\'hui !') : '🌱 Essaie encore, tu vas y arriver !';
    $('endAgain').textContent = state.mode === 'jour' ? '🎲 Partie libre' : '▶ Rejouer';
    showOnly('end');
    speak(`${won ? 'Bravo !' : 'Presque ! Tu y arrives bientôt.'} Le mot était ${state.word}. ${def}`);
  }, won ? 1500 : 900);
}
function confetti() {
  const box = $('confetti');
  const cols = ['#e63946', '#ffd23f', '#2f6fe0', '#22b573', '#ff7ab8', '#fff'];
  for (let i = 0; i < 40; i++) {
    const d = document.createElement('div');
    d.className = 'cf';
    d.style.left = `${Math.random() * 100}%`;
    d.style.background = cols[i % cols.length];
    d.style.animationDuration = `${1.6 + Math.random() * 1.6}s`;
    d.style.animationDelay = `${Math.random() * 0.4}s`;
    box.appendChild(d);
    setTimeout(() => d.remove(), 4000);
  }
}

/* ---------- indice ---------- */
function openHint() {
  if (!canType()) return;
  if (!G.hintAvailable(state)) { toast('Plus d\'indice pour ce mot'); return; }
  showOnly('hintDlg');
  $('home').classList.add('hidden');
}
function applyHint(kind) {
  closePanels();
  const res = G.useHint(state, kind, rng);
  if (!res.ok) { toast('Plus d\'indice possible'); return; }
  sfx.hint();
  if (res.kind === 'definition') {
    const d = definition(state.word);
    $('hintline').textContent = `💡 ${d}`; $('hintline').classList.add('on');
    speak(d);
  } else {
    toast(`💡 Une lettre est révélée !`);
    refresh(true);
  }
}

/* ---------- événements ---------- */
function bind() {
  $('btnHome').addEventListener('click', () => { renderHome(); showOnly('home'); });
  $('btnRules').addEventListener('click', () => $('rules').classList.remove('hidden'));
  $('homeRules').addEventListener('click', () => $('rules').classList.remove('hidden'));
  $('rulesClose').addEventListener('click', () => $('rules').classList.add('hidden'));
  $('rulesSpeak').addEventListener('click', () => {
    const was = isMuted(); setMuted(false); speak(RULES); setMuted(was);
  });
  $('btnSound').addEventListener('click', () => {
    setMuted(!isMuted());
    $('btnSound').textContent = isMuted() ? '🔇' : '🔊';
  });
  document.querySelectorAll('.mode').forEach((m) => m.addEventListener('click', () => { mode = m.dataset.mode; renderHome(); }));
  $('hintLetter').addEventListener('click', () => applyHint('lettre'));
  $('hintDef').addEventListener('click', () => applyHint('definition'));
  $('hintCancel').addEventListener('click', closePanels);
  $('endAgain').addEventListener('click', () => startGame(lastLevel, 'libre'));
  $('endMenu').addEventListener('click', () => { renderHome(); showOnly('home'); });
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'Enter') { e.preventDefault(); pressEnter(); }
    else if (e.key === 'Backspace') { e.preventDefault(); pressBack(); }
    else if (e.key.length === 1) {
      const ch = clean(e.key);
      if (/^[a-z]$/.test(ch)) pressLetter(ch);
    }
  });
  let rt = 0;
  const onResize = () => { cancelAnimationFrame(rt); rt = requestAnimationFrame(() => board.resize()); };
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', () => setTimeout(onResize, 250));
  if (window.ResizeObserver) new ResizeObserver(onResize).observe($('stage'));
}

/* ---------- démarrage ---------- */
buildLogo(); buildKeyboard();
board = new Board($('gl'));
bind(); renderHome();

// Crochet de débogage
const typeWord = (w) => { for (const ch of w) pressLetter(ch); };
window.__sotum = {
  ready: true,
  get state() { return state; },
  get current() { return G.composeGuess(known(), cur); },
  get typed() { return cur; },
  get busy() { return busy; },
  get stats() { return stats; },
  start: (level = 1, md = 'libre', word) => startGame(level, md, word),
  type: typeWord,
  back: pressBack,
  enter: pressEnter,
  // joue un essai complet : prend le MOT ENTIER, ne tape que les cases libres
  play(word) {
    if (!canType()) return false;
    cur = ''; refresh();
    typeWord(word.slice(1));
    pressEnter(); return true;
  },
  solution: () => state && state.word,
  solutions: SOLUTIONS,
  evaluate: G.evaluate,
  board,
};
