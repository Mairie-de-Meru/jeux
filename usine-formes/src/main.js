// Écrans (titre, choix, niveau, fin), boucle d'animation, progression, API de débogage.
import { createScene } from './scene.js';
import { createInput } from './input.js';
import { createUI } from './ui.js';
import { createConfetti, tweens } from './fx.js';
import { sfx, unlock } from './audio.js';
import { speech } from './speech.js';
import { initTextures, loadTexture } from './meshes.js';
import { starsFor, mergeBest } from './logic/score.mjs';
import { createSortLevel } from './levels/sortLevel.js';
import { createCountLevel } from './levels/countLevel.js';
import { createBuildLevel } from './levels/buildLevel.js';

const canvas = document.getElementById('stage');
const stage = createScene(canvas);
const input = createInput(canvas, stage.camera);
const ui = createUI(document.getElementById('ui'));
const confetti = createConfetti(stage.scene);
stage.resize();

const texturesReady = initTextures();
loadTexture('assets/img/fond.jpg').then((t) => { if (t) stage.setBackground(t); });
window.addEventListener('pointerdown', unlock);

const KEY = 'usine-formes-progress';
let progress = {};
try { progress = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { progress = {}; }
function saveProgress() { try { localStorage.setItem(KEY, JSON.stringify(progress)); } catch (e) { /* ignore */ } }

const TITLES = { 1: 'Formes', 2: 'Couleurs', 3: 'Compter', 4: 'Construire' };
let screen = 'title', levelId = null, level = null, lastInstruction = '', token = 0;

function say(text, kind = 'info') {
  ui.say(text);
  if (kind !== 'info') speech.say(text);
  if (kind === 'consigne') lastInstruction = text;
}

function leaveLevel() {
  token++;
  if (level) { level.dispose(); level = null; }
  tweens.clear();
  stage.clearRoot();
  input.setHandler(null);
  levelId = null;
}

function showTitle() {
  leaveLevel(); ui.clear(); screen = 'title';
  ui.showTitle({
    voiceOn: speech.enabled,
    onPlay: showLevels,
    onVoice: () => { speech.set(!speech.enabled); if (speech.enabled) speech.say('Bonjour !'); return speech.enabled; },
  });
}

function showLevels() {
  leaveLevel(); ui.clear(); screen = 'levels';
  ui.showLevels({ best: progress, onPick: startLevel, onBack: showTitle });
}

function finish(errors) {
  const stars = starsFor(errors);
  progress = mergeBest(progress, levelId, stars);
  saveProgress();
  const id = levelId;
  sfx.fanfare();
  confetti.burst({ x: 0, y: 2.5, z: 2 }, 150, { speed: 8, up: 6 });
  speech.say('Bravo ! Tu as gagné ' + stars + (stars > 1 ? ' étoiles !' : ' étoile !'));
  screen = 'end';
  ui.showEnd({
    stars, hasNext: id < 4,
    onReplay: () => startLevel(id),
    onNext: () => startLevel(id + 1),
    onHome: showLevels,
  });
}

async function startLevel(id) {
  leaveLevel(); ui.clear();
  const my = token;
  await texturesReady;
  if (my !== token) return;
  levelId = id; screen = 'level'; lastInstruction = '';
  const seed = (Math.random() * 1e9) >>> 0;
  const ctx = { stage, root: stage.root, input, ui, sfx, speech, confetti, say, finish };
  level = id <= 2 ? createSortLevel(ctx, id, seed) : id === 3 ? createCountLevel(ctx, seed) : createBuildLevel(ctx, seed);
  ui.showHud({
    title: TITLES[id], total: level.total,
    onHome: showLevels,
    onSpeak: () => speech.say(lastInstruction, { force: true }),
  });
  level.start();
}

let last = performance.now();
function loop(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  tweens.update(dt);
  confetti.update(dt);
  if (level) level.update(dt);
  stage.render();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

showTitle();

window.__usine = {
  screen: () => screen,
  goto(target) {
    if (target === 'title') showTitle();
    else if (target === 'levels') showLevels();
    else startLevel(Number(target));
  },
  state() {
    const base = { screen, level: levelId };
    return level ? { ...base, ...level.debug() } : base;
  },
};
