import * as THREE from 'three';
import {
  LEVELS, makeRng, generateRound, evaluate, hintText, isNewWay, starsFor, nextProgress,
} from './logic.js';
import { createScene } from './scene.js';
import { createBridge } from './bridge.js';
import { createCharacters, createConfetti } from './characters.js';
import { ui, onPress } from './ui.js';
import { updateTweens, delay } from './anim.js';
import * as audio from './audio.js';
import { titleImage } from './assets.js';

const MAX_SUM = 30;

const world = createScene(document.getElementById('c'));
const bridge = createBridge(world.scene);
const chars = createCharacters(world.scene);
const confetti = createConfetti(world.scene);

const state = {
  mode: 'add', target: 0, placed: [], level: 0, round: 0,
  hintsUsed: 0, totalStars: 0, ways: [], tray: [],
  busy: false, won: false, done: false, autoRead: false, instruction: '', seed: 1, roundId: 0,
};

// ---------- Manche ----------

function instructionFor() {
  if (state.mode === 'sub') return `Enlève des briques ! Il faut ${state.target}.`;
  if (state.mode === 'twoWays') return state.ways.length ? 'Trouve une autre façon !' : `Trouve 2 façons de faire ${state.target} !`;
  return `Fais un pont de ${state.target} !`;
}

function setInstruction() {
  state.instruction = instructionFor();
  ui.setInstruction(state.instruction);
}

function refreshTray() {
  ui.renderTray(state.tray, pressBrick);
}

function startRound() {
  const rng = makeRng(state.seed + state.level * 100 + state.round);
  const g = generateRound(state.level, state.round, rng);
  Object.assign(state, {
    mode: g.mode, target: g.target, placed: [], ways: [], hintsUsed: 0,
    tray: g.tray.slice(), busy: false, won: false, roundId: state.roundId + 1,
  });
  bridge.clear();
  confetti.clear();
  bridge.setTarget(g.target);
  world.setTarget(g.target);
  chars.reset(g.target);
  ui.hideStars();
  ui.hideBubble();
  ui.showNext(false);
  ui.showWays([]);
  ui.setGoal(g.target, g.mode);
  ui.setProgress(state.level, state.round, state.totalStars);
  setInstruction();
  refreshTray();
  g.prefilled.forEach((v, i) => {
    state.placed.push(v);
    bridge.add(v, { delay: i * 0.12 });
  });
  if (state.autoRead) audio.speak(state.instruction);
}

function startLevel(i) {
  audio.unlock();
  Object.assign(state, { level: i, round: 0, totalStars: 0, done: false, seed: (Date.now() & 0xffff) + 1 });
  ui.showTitle(false);
  ui.hideEnd();
  startRound();
}

// ---------- Actions ----------

function pressBrick(v) {
  if (state.busy || state.won || state.done || !state.tray.includes(v)) return;
  audio.unlock();
  if (state.placed.reduce((s, x) => s + x, 0) + v > MAX_SUM) { audio.soft(); ui.bubble('Trop long !', 1500); return; }
  ui.hideBubble();
  state.placed.push(v);
  bridge.add(v);
  setTimeout(() => audio.pop(v), 280);
}

function removeAt(i) {
  if (state.busy || state.won || state.done || i < 0 || i >= state.placed.length) return;
  const [v] = state.placed.splice(i, 1);
  bridge.remove(i);
  audio.remove();
  ui.hideBubble();
  if (state.mode === 'sub' && !state.tray.includes(v)) {
    state.tray.push(v);
    state.tray.sort((a, b) => a - b);
    refreshTray();
  }
}

function clear() {
  if (state.busy || state.won || state.done) return;
  audio.unlock();
  state.placed = [];
  bridge.clear();
  ui.hideBubble();
  audio.remove();
}

async function go() {
  const id = state.roundId;
  const stale = () => id !== state.roundId;
  if (state.busy || state.won || state.done) return;
  audio.unlock();
  if (!state.placed.length) { audio.soft(); ui.bubble('Pose des briques !', 2000); return; }
  const ev = evaluate(state.target, state.placed);

  if (ev.status === 'exact') {
    if (state.mode === 'twoWays' && !isNewWay(state.ways, state.placed)) {
      audio.soft();
      ui.bubble("C'est la même ! Essaie autrement.", 3500);
      return;
    }
    state.busy = true;
    audio.arpeggio();
    await bridge.wave();
    if (stale()) return;
    if (state.mode === 'twoWays' && state.ways.length === 0) {
      state.ways.push(state.placed.slice());
      ui.showWays(state.ways);
      confetti.burst(0, 40);
      ui.bubble('Bravo !', 1500);
      await delay(1.1);
      if (stale()) return;
      state.placed = [];
      bridge.clear();
      setInstruction();
      if (state.autoRead) audio.speak(state.instruction);
      state.busy = false;
      return;
    }
    if (state.mode === 'twoWays') {
      state.ways.push(state.placed.slice());
      ui.showWays(state.ways);
    }
    confetti.burst(0, 150);
    ui.bubble('Bravo !', 2000);
    const stars = starsFor(state.hintsUsed);
    state.totalStars += stars;
    await chars.celebrate();
    if (stale()) return;
    confetti.burst(0, 60);
    ui.showStars(stars);
    ui.setProgress(state.level, state.round + 1, state.totalStars);
    state.won = true;
    state.busy = false;
    ui.showNext(true);
    return;
  }

  state.busy = true;
  state.hintsUsed++;
  ui.bubble(hintText(ev, state.mode), 3800);
  audio.hint();
  if (ev.status === 'short') {
    bridge.showGhosts();
    await bridge.bendLast();
    if (stale()) return;
    await chars.blocked(-world.half + ev.sum - 0.8);
    if (stale()) return;
    await delay(0.4);
    if (stale()) return;
    await bridge.unbend();
    if (stale()) return;
  } else {
    bridge.setWarn(true);
    await chars.shakeHome();
    if (stale()) return;
    await delay(1.2);
    if (stale()) return;
    bridge.setWarn(false);
  }
  state.busy = false;
}

function next() {
  if (!state.won) return;
  const p = nextProgress({ level: state.level, round: state.round });
  if (p.done) {
    state.done = true;
    ui.showNext(false);
    ui.showEnd(state.totalStars);
    return;
  }
  state.level = p.level;
  state.round = p.round;
  startRound();
}

// ---------- Branchements ----------

ui.buildProgress();
ui.setTitleImage(titleImage());
onPress(ui.el.go, go);
onPress(ui.el.next, next);
onPress(ui.el.clear, clear);
onPress(ui.el.speak, () => { audio.unlock(); audio.speak(state.instruction); });
onPress(ui.el.auto, () => {
  audio.unlock();
  state.autoRead = !state.autoRead;
  ui.setAuto(state.autoRead);
  if (state.autoRead) audio.speak(state.instruction);
});
onPress(ui.el.play, () => startLevel(0));
onPress(ui.el.replay, () => startLevel(0));
ui.el.levels.forEach((b) => onPress(b, () => startLevel(Number(b.dataset.level))));

const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
world.renderer.domElement.addEventListener('pointerdown', (e) => {
  audio.unlock();
  ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, world.camera);
  removeAt(bridge.pick(raycaster));
});

window.__game = {
  state, pressBrick, go, clear, next, startLevel,
};

// Fond animé derrière l'écran titre
world.setTarget(10);
chars.reset(10);

let last = performance.now();
function step(now, maxDt) {
  const dt = Math.min(maxDt, (now - last) / 1000);
  last = now;
  const t = now / 1000;
  updateTweens(dt);
  world.update(t);
  bridge.update(t);
  chars.update(t);
  confetti.update(dt);
  world.render();
}
function frame(now) {
  step(now, 0.05);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
// Onglet masqué : requestAnimationFrame est suspendu ; on fait avancer les
// animations pour que la partie ne reste jamais bloquée (state.busy).
setInterval(() => {
  const now = performance.now();
  if (now - last > 250) step(now, 1);
}, 100);
