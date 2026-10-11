// Boucle de jeu, écrans DOM et hook de vérification.
import { createStage } from './scene.js';
import { createInput } from './input.js';
import { unlockAudio, sfx } from './audio.js';
import { speak, cancelSpeech } from './speech.js';
import { LEVELS, makeRound, evaluate, hintText, hintSpeech, instructionText, instructionSpeech, starsFor } from './levels.js';
import { formatEuros, spokenEuros, sum, minPieces } from './money.js';
import { mulberry32 } from './rng.js';
import { AVAILABLE_IMAGES } from './assets.js';
import { createProgress, addStars, completeLevel, isCompleted, serialize, deserialize } from './progress.js';

const $ = (id) => document.getElementById(id);
const STORAGE_KEY = 'marche-pieces-v1';
const params = new URLSearchParams(location.search);

function loadProgress() {
  try { return deserialize(localStorage.getItem(STORAGE_KEY)); } catch { return createProgress(); }
}
function saveProgress() {
  try { localStorage.setItem(STORAGE_KEY, serialize(progress)); } catch { /* ignoré */ }
}

let progress = loadProgress();
const stage = createStage($('c'));
stage.setPiggyStars(progress.piggyStars);

const state = {
  screen: 'title', levelId: 0, roundIndex: 0, round: null, rng: null,
  attempts: 0, runStars: 0, locked: false, lastResult: null, doneDots: [],
};
let seedBase = params.has('seed') ? Number(params.get('seed')) || 1 : null;
let nextTimer = null;
let bubbleTimer = null;

// --- Image de titre optionnelle (repli silencieux) ---
if (AVAILABLE_IMAGES.includes('title.png')) {
  const img = new Image();
  img.onload = () => { $('title').style.backgroundImage = `url(${img.src})`; };
  img.onerror = () => {};
  img.src = 'assets/img/title.png';
}

// --- Affichage ---
function show(screen) {
  state.screen = screen;
  $('title').hidden = screen !== 'title';
  $('hud').hidden = screen !== 'game';
  $('end').hidden = screen !== 'end';
}

function refreshPiggy(n = progress.piggyStars) {
  $('piggyCount').textContent = `🐷 ⭐ ${n}`;
  $('piggyTitle').textContent = `🐷 ⭐ ${progress.piggyStars}`;
}

function renderTitle() {
  const box = $('levels');
  box.textContent = '';
  for (const l of LEVELS) {
    const b = document.createElement('button');
    b.dataset.level = l.id;
    b.innerHTML = `<span class="ic">${l.icon}</span><span>${l.id}</span>${isCompleted(progress, l.id) ? '<span class="ok">✓</span>' : ''}`;
    b.setAttribute('aria-label', `Palier ${l.id} : ${l.title}`);
    b.addEventListener('click', () => { unlockAudio(); sfx.click(); startLevel(l.id); });
    box.appendChild(b);
  }
  refreshPiggy();
}

function renderDots() {
  const dots = $('dots');
  dots.textContent = '';
  for (let i = 0; i < 5; i++) {
    const s = document.createElement('span');
    if (i < state.roundIndex) s.className = 'done';
    else if (i === state.roundIndex) s.className = 'current';
    dots.appendChild(s);
  }
}

function currentTotal() { return sum(stage.placedValues()); }
function updateTotal() { $('total').textContent = formatEuros(currentTotal()); }

function showBubble(text) {
  const b = $('bubble');
  b.textContent = text;
  b.classList.add('show');
  clearTimeout(bubbleTimer);
  bubbleTimer = setTimeout(() => b.classList.remove('show'), 3000);
}
function hideBubble() { clearTimeout(bubbleTimer); $('bubble').classList.remove('show'); }

// --- Déroulement ---
function startLevel(levelId) {
  clearTimeout(nextTimer);
  state.levelId = levelId;
  state.roundIndex = 0;
  state.runStars = 0;
  state.rng = mulberry32(seedBase !== null ? seedBase + levelId * 1000 : (Math.random() * 2 ** 31) | 0);
  show('game');
  $('pay').textContent = levelId === 4 ? '✔ Rendre' : '✔ Payer';
  startRound();
}

function startRound() {
  const round = makeRound(state.levelId, state.roundIndex, state.rng);
  state.round = round;
  state.attempts = 0;
  state.locked = false;
  state.lastResult = null;
  hideBubble();
  stage.resetPlacedImmediately();
  stage.setTray(round.allowed);
  stage.setItem(round.item, round.price);
  stage.setCustomer(round.paid);
  $('instruction').textContent = instructionText(round);
  renderDots();
  updateTotal();
  speak(instructionSpeech(round));
}

function addCoin(value, from = null) {
  if (state.screen !== 'game' || state.locked) return false;
  hideBubble();
  const ok = stage.addPlaced(value, from);
  if (!ok) { sfx.hint(); showBubble('Le comptoir est plein !'); return false; }
  sfx.tink(value);
  updateTotal();
  speak(spokenEuros(currentTotal()));
  return true;
}

function removeCoin(index) {
  if (state.screen !== 'game' || state.locked) return false;
  hideBubble();
  if (!stage.removePlaced(index)) return false;
  sfx.remove();
  updateTotal();
  speak(spokenEuros(currentTotal()));
  return true;
}

function clearCounter() {
  if (state.screen !== 'game' || state.locked) return;
  hideBubble();
  if (stage.placedCount() === 0) return;
  stage.clearPlaced();
  sfx.remove();
  updateTotal();
  speak(spokenEuros(0));
}

function validate() {
  if (state.screen !== 'game' || state.locked) return null;
  const round = state.round;
  const result = evaluate(round, stage.placedValues());
  state.lastResult = result;
  if (result.code === 'empty') {
    sfx.hint();
    showBubble(hintText(round, result));
    speak(hintSpeech(round, result));
    return result;
  }
  state.attempts++;
  if (result.ok) {
    success();
  } else {
    sfx.hint();
    showBubble(`${hintText(round, result)} 💪`);
    speak(hintSpeech(round, result));
    if (state.attempts >= 3) stage.blink(minPieces(round.target, round.allowed));
  }
  return result;
}

function success() {
  state.locked = true;
  const stars = starsFor(state.attempts);
  state.runStars += stars;
  progress = addStars(progress, state.levelId, stars);
  saveProgress();
  sfx.success();
  stage.celebrate();
  showBubble('Bravo ! ' + '⭐'.repeat(stars));
  speak('Bravo !');
  const before = progress.piggyStars - stars;
  stage.flyStars(stars, (i) => {
    sfx.star();
    stage.setPiggyStars(before + i + 1);
    refreshPiggy(before + i + 1);
  });
  clearTimeout(nextTimer);
  nextTimer = setTimeout(() => {
    state.roundIndex++;
    if (state.roundIndex >= LEVELS[state.levelId - 1].rounds) endLevel();
    else startRound();
  }, 1800);
}

function endLevel() {
  progress = completeLevel(progress, state.levelId, state.runStars);
  saveProgress();
  refreshPiggy();
  $('endStars').textContent = `⭐ ${state.runStars} / ${LEVELS[state.levelId - 1].rounds * 3}`;
  $('btnNext').hidden = state.levelId >= LEVELS.length;
  show('end');
  sfx.success();
  speak('Bravo ! Tu as gagné ' + state.runStars + ' étoiles !');
}

function goHome() {
  clearTimeout(nextTimer);
  cancelSpeech();
  hideBubble();
  stage.resetPlacedImmediately();
  state.locked = false;
  renderTitle();
  show('title');
}

// --- Entrées ---
createInput($('c'), stage, {
  isLocked: () => state.screen !== 'game' || state.locked,
  onGesture: unlockAudio,
  onAdd: (value, from) => addCoin(value, from),
  onRemove: (index) => removeCoin(index),
  onMiss: () => sfx.remove(),
});
window.addEventListener('pointerdown', unlockAudio, { passive: true });

$('pay').addEventListener('click', () => { unlockAudio(); validate(); });
$('btnClear').addEventListener('click', () => { unlockAudio(); clearCounter(); });
$('btnSpeak').addEventListener('click', () => { unlockAudio(); sfx.click(); if (state.round) speak(instructionSpeech(state.round)); });
$('btnHome').addEventListener('click', () => { sfx.click(); goHome(); });
$('btnEndHome').addEventListener('click', () => { sfx.click(); goHome(); });
$('btnReplay').addEventListener('click', () => { sfx.click(); startLevel(state.levelId); });
$('btnNext').addEventListener('click', () => { sfx.click(); startLevel(Math.min(LEVELS.length, state.levelId + 1)); });

// --- Hook de vérification ---
window.__marche = {
  get state() {
    return {
      screen: state.screen, levelId: state.levelId, roundIndex: state.roundIndex, round: state.round,
      placed: stage.placedValues(), total: currentTotal(), attempts: state.attempts, runStars: state.runStars,
      piggyStars: progress.piggyStars, locked: state.locked, lastResult: state.lastResult,
      done: { ...progress.done },
    };
  },
  start: (levelId) => startLevel(levelId),
  addCoin: (value) => addCoin(value),
  removeCoin: (index) => removeCoin(index),
  clear: () => { stage.resetPlacedImmediately(); updateTotal(); },
  validate: () => validate(),
  solve() {
    if (!state.round) return null;
    stage.resetPlacedImmediately();
    const vals = minPieces(state.round.target, state.round.allowed) || [];
    for (const v of vals) addCoin(v);
    return vals;
  },
};

renderTitle();
const lvl = Number(params.get('niveau'));
if (lvl >= 1 && lvl <= LEVELS.length) startLevel(lvl);
else show('title');
