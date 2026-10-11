// Orchestration : écrans, état de la mission, stockage local.
import { createScene } from './scene.js';
import { createUI } from './ui.js';
import { unlockAudio, sounds } from './audio.js';
import { say } from './speech.js';
import { makeChoices, mulberry32 } from './logic/tables.js';
import { createMission, submitAnswer, nextMission, STAGES_TO_LAUNCH } from './logic/game.js';
import { PLANETS, createProgress, unlockNext, serialize, deserialize } from './logic/progress.js';

const STORE_KEY = 'fusee-tables-progress';
const ENCOURAGE = ['Presque ! Compte les points', 'Essaie encore, tu y es presque !', 'Regarde bien les points !'];
const PRAISE = ['Bravo !', 'Super !', 'Génial !', 'Bien joué !'];

function loadProgress() {
  try {
    return deserialize(localStorage.getItem(STORE_KEY));
  } catch {
    return createProgress();
  }
}
function saveProgress(p) {
  try {
    localStorage.setItem(STORE_KEY, serialize(p));
  } catch {
    /* stockage indisponible */
  }
}

let progress = loadProgress();
let state = null;
let busy = false;
let choices = [];
let lastSetup = null; // { level, tables? } pour « Encore ! »
const rng = mulberry32((Date.now() & 0xffffffff) >>> 0);

const scene = createScene(document.getElementById('scene'));
window.addEventListener('resize', () => scene.resize());

const speakText = () => (state && state.current ? `${state.current.a} fois ${state.current.b} ?` : '');

const ui = createUI({
  onStartLevel: (level) => startMission({ level }),
  onParentTable: (t) => startMission({ level: 1, tables: [t] }),
  onAnswer: (n) => handleAnswer(n),
  onHome: goHome,
  onAgain: () => {
    unlockAudio();
    startMission(lastSetup ?? { level: 1 }, state?.deck);
  },
  onSpeak: () => say(speakText()),
  onDotCount: (n) => {
    sounds.tap(n);
    say(String(n));
  },
  onHintRow: (r) => sounds.tap(r),
});

function renderQuestion() {
  choices = state.input === 'choices' ? makeChoices(state.current, rng) : [];
  ui.showQuestion(state.current, state.input, choices, state.stages, STAGES_TO_LAUNCH);
  say(speakText());
}

function startMission(setup, deck) {
  unlockAudio();
  lastSetup = setup;
  state = createMission({ ...setup, rng, deck: deck ?? state?.deck });
  busy = false;
  scene.reset();
  renderQuestion();
}

function goHome() {
  busy = false;
  state = null;
  scene.reset();
  ui.clearHints();
  ui.showTitle(progress.unlocked);
}

const pick = (list) => list[Math.floor(rng() * list.length)];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function handleAnswer(value) {
  if (busy || !state || state.phase !== 'question') return;
  unlockAudio();
  const res = submitAnswer(state, value);
  state = res.state;
  if (res.result === 'wrong') {
    sounds.soft();
    ui.setMessage(pick(ENCOURAGE));
    ui.showHint(res.hintLevel);
    return;
  }
  busy = true;
  sounds.good();
  sounds.stage();
  ui.confetti(50);
  ui.setMessage(pick(PRAISE), true);
  ui.setStages(state.stages, STAGES_TO_LAUNCH);
  scene.setStages(state.stages, true);
  const mission = state;
  await sleep(1100);
  if (state !== mission) return; // retour au titre ou nouvelle mission pendant l'attente
  if (state.phase === 'launch') {
    await runLaunch();
  } else {
    busy = false;
    renderQuestion();
  }
}

async function runLaunch() {
  // toutes débloquées : on rejoue une planète au hasard
  const planet = progress.unlocked < PLANETS.length ? PLANETS[progress.unlocked] : pick(PLANETS);
  const mission = state;
  const stars = state.stars;
  ui.show('none');
  await ui.countdown((n) => {
    sounds.beep(n === 0);
    if (n > 0) say(String(n));
  });
  if (state !== mission) return;
  sounds.liftoff(5);
  const done = scene.launch(planet);
  await done;
  if (state !== mission) return; // mission abandonnée pendant le vol
  progress = unlockNext(progress);
  saveProgress(progress);
  sounds.fanfare();
  ui.showPlanet(planet, stars);
  state = nextMission(state);
  busy = false;
}

// Aide aux tests automatisés
window.__fusee = {
  get state() {
    return state;
  },
  getAnswer: () => (state && state.current ? state.current.answer : null),
  answer: (n) => handleAnswer(n),
};

ui.showTitle(progress.unlocked);
