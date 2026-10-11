// Orchestration : scène, manches, toucher (pointer events + raycast), crochet de débogage.
import * as THREE from 'three';
import { createStage } from './scene.js';
import { createIsland, fillIsland, createHalo } from './models.js';
import { preloadModels } from './gltf.js';
import { popIn, squash, wiggle, pulse, tick, clearAll } from './anim.js';
import { ANIMALS, FRUITS, OBJECTS } from './data.js';
import {
  ROUNDS_PER_LEVEL, makeRound, checkAnswer, createProgress, recordAnswer,
  isLevelDone, nextLevel, startLevel,
} from './logic.js';
import { wrongEn, listenLabel } from './phrases.js';
import { sayQueue, say, stop as stopSpeech } from './speech.js';
import { sounds, unlock } from './audio.js';
import { initUI } from './ui.js';

const DEBUG = new URLSearchParams(location.search).has('debug');
const ISLAND_SIZE = 6;
const LISTEN_SIZE = 3.4;
const TINTS = [0x7ccf5a, 0x8fd96a];

const stage = createStage(document.getElementById('stage'));

// Modèles GLB chargés dès le démarrage (l'écran d'accueil n'en a pas besoin) ; ne rejette jamais.
let modelsLoaded = false;
const modelsReady = preloadModels().then(() => { modelsLoaded = true; });
// Lance fn tout de suite si les modèles sont prêts (cas courant), sinon dès qu'ils le sont.
function whenReady(fn) {
  if (modelsLoaded) fn();
  else modelsReady.then(fn);
}
const raycaster = new THREE.Raycaster();

let mode = 'home'; // 'home' | 'play' | 'listen' | 'done'
let round = null;
let progress = createProgress();
let islands = [];
let locked = false;
let wrong = 0;
let firstTry = true;
let halo = null;
let epoch = 0;
let pending = null; // action différée en attente (vidée par le crochet de débogage)

function insets() {
  const top = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--top'), 10) || 96;
  const bottom = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--bottom'), 10) || 76;
  stage.setInsets(top, bottom);
}

// Action différée, ignorée si on a changé d'écran entre-temps.
function later(ms, fn) {
  const my = epoch;
  const run = () => {
    if (pending && pending.run === run) pending = null;
    if (my === epoch) fn();
  };
  pending = { run, timer: setTimeout(run, ms) };
}
function flushPending() {
  if (pending) {
    clearTimeout(pending.timer);
    const p = pending;
    pending = null;
    p.run();
  }
}
function resetScreen() {
  epoch++;
  document.body.classList.remove('listen');
  if (pending) clearTimeout(pending.timer);
  pending = null;
  clearAll();
  if (halo) halo.stop();
  halo = null;
  for (const isl of islands) stage.scene.remove(isl.group);
  islands = [];
  round = null;
  locked = false;
}

function mountIslands(specs, { size, colsFn }) {
  specs.forEach((target, i) => {
    const isl = createIsland(size, TINTS[i % 2]);
    stage.scene.add(isl.group);
    fillIsland(isl, target);
    isl.target = target;
    isl.items.forEach((it, k) => popIn(it, it.userData.baseScale, Math.min(0.1, 0.03 * i + 0.01 * k)));
    islands.push(isl);
  });
  stage.place(islands.map((i) => i.group), { size, colsFn });
}

// ---------- jeu ----------
function startGame(theme, level) {
  unlock();
  resetScreen();
  mode = 'play';
  progress = createProgress(theme, level);
  ui.hideHome();
  ui.hideDone();
  ui.showHud(true);
  insets();
  nextRound();
}

function nextRound() {
  resetScreen();
  mode = 'play';
  wrong = 0;
  firstTry = true;
  round = makeRound({ level: progress.level, theme: progress.theme, rng: Math.random });
  mountIslands(round.choices, { size: ISLAND_SIZE, colsFn: (n, a) => (n === 2 ? (a >= 1.15 ? 2 : 1) : 2) });
  ui.setPrompt(round.promptEn);
  ui.setPips(progress.roundsDone);
  ui.setFeedback('');
  ui.setDebug(DEBUG ? `${round.promptEn} -> #${round.answerIndex} (${round.answerEn})` : null);
  sayQueue([{ text: round.promptEn, lang: 'en' }]);
}

function showHint(index) {
  if (halo || !islands[index]) return;
  const ring = createHalo(ISLAND_SIZE);
  islands[index].group.add(ring);
  const p = pulse(ring, 1, 0.05, 6);
  halo = { stop() { p.cancel(); ring.removeFromParent(); ring.material.dispose(); } };
}

function pick(index) {
  if (locked || mode !== 'play' || !round) return;
  const res = checkAnswer(round, index);
  const isl = islands[index];
  if (res.correct) {
    locked = true;
    progress = recordAnswer(progress, { correct: true, firstTry });
    if (halo) halo.stop();
    halo = null;
    isl.items.forEach((it, k) => squash(it, it.userData.baseScale));
    sounds.good();
    setTimeout(sounds.star, 450);
    sayQueue([{ text: round.answerEn, lang: 'en' }]);
    ui.setFeedback(`${round.answerEn}  =  ${round.answerFr}`);
    ui.setPips(progress.roundsDone);
    ui.confetti(firstTry ? 60 : 30);
    later(isLevelDone(progress) ? 2200 : 2800, () => (isLevelDone(progress) ? finishLevel() : nextRound()));
  } else {
    firstTry = false;
    wrong++;
    progress = recordAnswer(progress, { correct: false, firstTry: false });
    isl.items.forEach((it) => wiggle(it));
    sounds.hint();
    sayQueue([{ text: wrongEn(round.choices[index], round.theme), lang: 'en' }, { text: round.promptEn, lang: 'en' }]);
    ui.setFeedback('Presque ! Essaie encore 🙂');
    if (wrong >= 2) showHint(res.hintIndex);
  }
}

function finishLevel() {
  mode = 'done';
  const stars = progress.stars[progress.level];
  if (halo) halo.stop();
  halo = null;
  ui.showDone({ stars, canNext: progress.level < 3 });
  ui.setFeedback('');
  sounds.win();
  ui.confetti(140, 0.5);
  sayQueue([{ text: 'Well done!', lang: 'en' }]);
}

// ---------- écoute libre ----------
const LISTEN_PAGES = [
  { icon: '🐮', specs: () => ANIMALS.map((a) => ({ noun: a.id, color: null, count: 1 })) },
  { icon: '🍎', specs: () => FRUITS.map((f) => ({ noun: f.id, color: null, count: 1 })) },
  { icon: '🎈', specs: () => OBJECTS.map((o, i) => ({ noun: o.id, color: ['blue', 'red', 'yellow', 'pink'][i % 4], count: 1 })) },
];
let listenPage = 0;

function showListenPage(n) {
  resetScreen();
  mode = 'listen';
  document.body.classList.add('listen');
  listenPage = (n + LISTEN_PAGES.length) % LISTEN_PAGES.length;
  mountIslands(LISTEN_PAGES[listenPage].specs(), { size: LISTEN_SIZE, colsFn: (cnt, a) => (a >= 1.2 ? 4 : 2) });
  ui.setPrompt('Touche un objet !');
  ui.setFeedback('');
  ui.setPager(LISTEN_PAGES.map((p) => p.icon), listenPage);
}

function startListen() {
  unlock();
  document.body.classList.add('listen');
  ui.hideHome();
  ui.hideDone();
  ui.showHud(true);
  ui.hidePips();
  insets();
  ui.setDebug(null);
  showListenPage(0);
  say('Touch anything!', 'en');
}

function listenTouch(index) {
  const isl = islands[index];
  if (!isl) return;
  const label = listenLabel(isl.target);
  isl.items.forEach((it) => squash(it, it.userData.baseScale, 0.4));
  sounds.pop();
  ui.setPrompt(label.en);
  ui.setFeedback(label.fr);
  sayQueue([{ text: label.en, lang: 'en' }]);
}

// ---------- navigation ----------
function goHome() {
  resetScreen();
  stopSpeech();
  mode = 'home';
  progress = createProgress();
  ui.showHome();
  ui.setDebug(null);
  insets();
  stage.place([], { size: ISLAND_SIZE, colsFn: () => 1 });
}

const ui = initUI({
  onClick: () => { unlock(); sounds.click(); },
  onPlay: (theme, level) => whenReady(() => startGame(theme, level)),
  onListen: () => whenReady(() => startListen()),
  onPage: (d) => { unlock(); sounds.click(); showListenPage(listenPage + d); },
  onRepeat: () => {
    unlock();
    if (mode === 'play' && round) say(round.promptEn, 'en');
  },
  onHome: () => { unlock(); goHome(); },
  onNext: () => {
    ui.hideDone();
    progress = startLevel(progress, nextLevel(progress));
    nextRound();
  },
  onReplay: () => {
    ui.hideDone();
    progress = startLevel(progress, progress.level);
    nextRound();
  },
});

// ---------- toucher ----------
const canvas = stage.canvas;
canvas.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  if (mode !== 'play' && mode !== 'listen') return;
  unlock();
  const r = canvas.getBoundingClientRect();
  const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
  raycaster.setFromCamera(ndc, stage.camera);
  const hits = raycaster.intersectObjects(islands.map((i) => i.hit), false);
  if (!hits.length) return;
  const index = islands.findIndex((i) => i.hit === hits[0].object);
  if (index < 0) return;
  if (mode === 'play') pick(index);
  else listenTouch(index);
});

// ---------- crochet de débogage ----------
window.__ferme = {
  start(theme = 'animals', level = 1) {
    startGame(theme, level);
    return round;
  },
  round: () => round,
  answer(correct = true) {
    flushPending();
    if (mode !== 'play' || !round) return null;
    const idx = correct ? round.answerIndex : round.choices.findIndex((_, i) => i !== round.answerIndex);
    pick(idx);
    if (correct && isLevelDone(progress)) flushPending();
    return { correct, progress };
  },
  listen() {
    startListen();
    return islands.length;
  },
  home: () => goHome(),
  // Promesse du préchargement GLB : attendre avant start()/listen() pour comparer avec les modèles chargés.
  ready: modelsReady,
  // Dernier rendu (shadow map comprise) et mémoire GPU, pour l'audit de performance.
  stats() {
    const { render, memory } = stage.renderer.info;
    return { triangles: render.triangles, calls: render.calls, geometries: memory.geometries, textures: memory.textures };
  },
  progress: () => ({ ...progress, mode }),
};

// ---------- boucle ----------
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  tick(dt);
  stage.render();
  requestAnimationFrame(frame);
}
goHome();
requestAnimationFrame(frame);
