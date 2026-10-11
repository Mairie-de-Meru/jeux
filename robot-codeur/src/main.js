import { levels, getLevel } from './logic/levels.mjs';
import { generateLevel } from './logic/generator.mjs';
import { parseLevel, initialState, run, stars, hintFor } from './logic/engine.mjs';
import { emptyProgress, normalize, recordWin } from './logic/progress.mjs';
import { Stage } from './render/scene.js';
import { Editor } from './ui/editor.js';
import { showScreen, renderLevelGrid, confetti } from './ui/screens.js';
import { sfx, unlockAudio } from './audio.js';
import { speak, stopSpeech } from './speech.js';
import { whenImage } from './assets.js';

whenImage('icon.png', (url) => {
  const logo = document.querySelector('.logo');
  if (logo) { logo.src = url; logo.hidden = false; }
});

const $ = (id) => document.getElementById(id);
const ALL = new URLSearchParams(location.search).get('all') === '1';
const STORE_KEY = 'robot-codeur-progress-v1';

// ---------- progression (localStorage, jamais bloquant) ----------
function loadProgress() {
  try { return normalize(JSON.parse(localStorage.getItem(STORE_KEY))); } catch { return emptyProgress(); }
}
function saveProgress(p) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(p)); } catch { /* ignore */ }
}
let progress = loadProgress();

// ---------- objets principaux ----------
const stage = new Stage($('stage'));
const editor = new Editor({
  paletteEl: $('palette'),
  stripEl: $('strip'),
  counterEl: $('counter'),
  onChange: () => {},
  onReject: (reason) => {
    // limite atteinte alors que la boucle est disponible : on la suggère
    if (reason === 'max' && cur && cur.cards.includes('repeat')) {
      const msg = 'Trop de cartes ? Essaie la boucle 🔁 !';
      showHint(msg);
      speak(msg);
      editor.spotlight('repeat');
    }
  },
});
// premier niveau où la boucle apparaît : on la présente
const FIRST_REPEAT = levels.find((l) => l.cards.includes('repeat'))?.id;

let screen = 'title';
let cur = null;
let world = null;
let running = false;
let outcome = null;
let token = 0;
let finishRun = null;
let robotState = null;

function go(name) {
  screen = name;
  showScreen(name);
  stage.setVisible(name === 'game');
  if (name === 'levels') renderLevelGrid($('level-grid'), levels, progress, ALL, (id) => { sfx.click(); loadLevel(id); });
  if (name !== 'game') stopSpeech();
}

function showHint(text, retry = false) {
  $('hint-text').textContent = text;
  $('btn-retry').hidden = !retry;
  $('hint-bubble').hidden = false;
}
function hideHint() { $('hint-bubble').hidden = true; }

function updateButtons() {
  $('btn-run').disabled = running;
  $('btn-reset').textContent = running ? '⏹' : '↺';
  $('btn-reset').setAttribute('aria-label', running ? 'Arrêter' : 'Recommencer');
  $('btn-clear').disabled = running;
}

function resetRun() {
  token++;
  if (finishRun) { const f = finishRun; finishRun = null; f(); }
  running = false;
  outcome = null;
  stage.resetRobot();
  robotState = initialState(world);
  editor.setLocked(false);
  editor.clearMarks();
  hideHint();
  $('win').hidden = true;
  updateButtons();
}

function loadLevel(id) {
  const lvl = typeof id === 'object' && id ? id : getLevel(Number(id));
  if (!lvl) return;
  cur = lvl;
  world = parseLevel(lvl);
  go('game');
  stage.setLevel(world);
  editor.configure({ cards: lvl.cards, maxCards: lvl.maxCards });
  $('level-title').textContent = lvl.random ? lvl.title : `${lvl.id}. ${lvl.title}`;
  $('goal-text').textContent = lvl.hint;
  resetRun();
  if (lvl.id === FIRST_REPEAT) {
    showHint('Nouvelle carte 🔁 : elle répète les cartes mises dedans !');
    speak('Nouvelle carte : la boucle. Elle répète les cartes que tu mets dedans !');
    editor.spotlight('repeat');
  }
  requestAnimationFrame(() => stage.resize());
}

function loadSurprise(diff) {
  const seed = (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0;
  loadLevel(generateLevel(seed, Number(diff) || 1));
}

async function execute() {
  if (running || !cur) return;
  unlockAudio();
  resetRun();
  const program = editor.getProgram();
  if (!program.length) {
    showHint(hintFor('empty'));
    editor.reject('empty');
    return;
  }
  const res = run(cur, program);
  const my = ++token;
  running = true;
  outcome = null;
  editor.setLocked(true);
  updateButtons();
  sfx.start();

  let prev = initialState(world);
  for (const s of res.steps) {
    if (my !== token) return;
    editor.highlight(s.path);
    await stage.perform(s, prev);
    if (my !== token) return;
    if (s.ok) { prev = s.state; robotState = s.state; }
    await stage.anim.wait(0.05);
    if (my !== token) return;
  }

  if (res.outcome === 'win') {
    editor.highlight(null);
    await stage.win();
    if (my !== token) return;
    const n = stars(cur, program);
    if (!cur.random) {
      progress = recordWin(progress, cur.id, n);
      saveProgress(progress);
    }
    showWin(n);
  } else if (res.outcome === 'error') {
    const bad = res.steps[res.errorStep];
    editor.flash(bad.path);
    showHint(hintFor('error', bad.error), true);
  } else {
    editor.highlight(null);
    sfx.bonk();
    await stage.shrug();
    if (my !== token) return;
    showHint(hintFor(res.outcome), true);
  }
  running = false;
  outcome = res.outcome;
  if (res.outcome !== 'win') editor.setLocked(false);
  updateButtons();
}

function play() {
  return new Promise((resolve) => {
    execute().then(() => { finishRun = null; resolve(); });
    finishRun = resolve;
  });
}

function showWin(n) {
  const box = $('win-stars');
  box.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const sp = document.createElement('span');
    sp.textContent = '⭐';
    if (i >= n) sp.classList.add('off');
    sp.style.animationDelay = `${0.2 + i * 0.25}s`;
    box.appendChild(sp);
  }
  $('btn-next').hidden = cur.random ? false : cur.id >= levels.length;
  $('win').hidden = false;
  confetti($('confetti'));
}

// ---------- boutons ----------
document.addEventListener('pointerdown', unlockAudio, { once: true });
$('btn-play').addEventListener('click', () => { sfx.click(); go('levels'); });
$('btn-levels-home').addEventListener('click', () => { sfx.click(); go('title'); });
$('btn-home').addEventListener('click', () => { sfx.click(); resetRun(); go('levels'); });
$('btn-win-menu').addEventListener('click', () => { sfx.click(); resetRun(); go('levels'); });
$('btn-run').addEventListener('click', () => { play(); });
$('btn-reset').addEventListener('click', () => { sfx.click(); resetRun(); });
$('btn-retry').addEventListener('click', () => { sfx.click(); resetRun(); });
$('btn-clear').addEventListener('click', () => { if (running) return; sfx.pop(); resetRun(); editor.clear(); });
$('btn-voice').addEventListener('click', () => { if (cur) speak(cur.hint); });
$('btn-view').addEventListener('click', () => {
  sfx.click();
  const fps = stage.toggleView() === 'fps';
  $('btn-view').textContent = fps ? '🗺️' : '👀';
  $('btn-view').setAttribute('aria-label', fps ? 'Vue d\'ensemble' : 'Vue du robot');
});
$('btn-replay').addEventListener('click', () => { sfx.click(); resetRun(); });
$('btn-next').addEventListener('click', () => { sfx.click(); if (cur.random) loadSurprise(cur.difficulty); else loadLevel(cur.id + 1); });
for (const d of [1, 2, 3]) $(`btn-surprise-${d}`).addEventListener('click', () => { sfx.click(); loadSurprise(d); });

// ---------- hook de test ----------
window.__robot = {
  levels,
  stage,
  view: (v) => stage.setView(v),
  loadLevel: (n) => loadLevel(n),
  surprise: (d) => loadSurprise(d),
  setProgram: (p) => { if (!running) editor.setProgram(p); },
  play,
  speed: (m) => { stage.anim.speed = Number(m) || 1; },
  getState: () => ({
    screen,
    level: cur ? cur.id : null,
    running,
    outcome,
    robot: robotState ? { x: robotState.x, y: robotState.y, dir: robotState.dir } : null,
  }),
};

go('title');
