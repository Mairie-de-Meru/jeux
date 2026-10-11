import { createScene } from './render/scene.js';
import { createSeasonDecor } from './render/seasonDecor.js';
import { createPlant3d } from './render/plant3d.js';
import { createWeather } from './render/weather.js';
import { createItems } from './render/items3d.js';
import { createUI } from './ui/ui.js';
import { createConfetti } from './ui/confetti.js';
import { mulberry32 } from './logic/rng.js';
import { SEASONS, SEASON_INFO, makeDressRound, chooseItem } from './logic/seasons.js';
import { createPlant, applyAction, missing, STAGES } from './logic/plant.js';
import { makeCycleRound, placeCard, isComplete, CYCLES } from './logic/cycles.js';
import { createProgress, recordWin, starsFor } from './logic/progress.js';
import { T, sayCycle } from './logic/texts.js';
import { sounds, unlockAudio } from './audio.js';
import { speak, stopSpeech } from './speech.js';
import { preloadImages } from './assets.js';
import { installDebug } from './debug.js';

const STORE = 'jardin-saisons-v1';
function loadProgress() {
  const base = createProgress();
  try {
    const raw = JSON.parse(localStorage.getItem(STORE) || 'null');
    if (raw && raw.stars) for (const k of Object.keys(base.stars)) base.stars[k] = Number(raw.stars[k]) || 0;
  } catch (e) { /* stockage indisponible */ }
  return base;
}
function saveProgress(p) { try { localStorage.setItem(STORE, JSON.stringify(p)); } catch (e) { /* ignoré */ } }

// --- rendu
const canvas = document.getElementById('view');
const sc = createScene(canvas);
const decor = createSeasonDecor(sc.garden, sc.tree);
const plant3d = createPlant3d(sc.garden);
const weather = createWeather(sc.scene);
const items = createItems(sc.garden);
const confetti = createConfetti(document.getElementById('confetti'));
preloadImages();

// --- état
let progress = loadProgress();
const S = { screen: 'home', activity: null, level: 1, errors: 0, plant: null, cycle: null, dress: null, season: 'printemps', prompt: '', token: 0, done: false, pendingWin: null };
const rng = mulberry32((Date.now() & 0xffffff) >>> 0);
const later = (ms, fn) => { const t = S.token; setTimeout(() => { if (t === S.token) fn(); }, ms); };

function applySeason(s, instant = false) {
  S.season = s;
  sc.setSeason(s, instant); decor.setSeason(s, instant);
  weather.setWeather(SEASON_INFO[s].weather);
  ui.setSeasonActive(s, S.screen === 'play' && S.activity === 'saison');
}
function setPrompt(t) { S.prompt = t; ui.setPrompt(t); }

const ui = createUI({
  onActivity: (a) => { sounds.tap(); openLevels(a); },
  onLevel: (a, l) => startLevel(a, l),
  onHome: () => goHome(),
  onSeason: (s) => { sounds.pop(); applySeason(s); speak(SEASON_INFO[s].label); },
  onSpeak: () => speak(S.prompt),
  onPlantAction: (a) => plantAction(a),
  onPlaceCard: (id, i) => cyclePlace(id, i),
  onChooseItem: (id) => dressChoose(id),
  onAgain: () => startLevel(S.activity, S.level),
  onEndContinue: () => openLevels(S.activity),
  onTap: () => sounds.tap(),
});

function resetWorld() {
  S.token++; S.done = false; stopSpeech(); ui.hideToast();
  items.clear();
  plant3d.setStage(3, false);
}
function goHome() {
  resetWorld(); S.activity = null; S.screen = 'home'; ui.screen('home'); setPrompt('');
  applySeason(S.season, false);
}
function openLevels(activity) {
  resetWorld(); S.activity = activity; S.screen = 'levels';
  ui.renderLevels(activity, progress); ui.screen('levels'); applySeason(S.season);
}

function startLevel(activity, level) {
  resetWorld();
  S.activity = activity; S.level = level; S.errors = 0; S.screen = 'play';
  ui.screen('play', activity);
  if (activity === 'plante') {
    S.plant = createPlant(level);
    plant3d.setStage(0, true);
    ui.renderPlant(S.plant); applySeason(S.season);
    setPrompt(T.consigne.plante);
  } else if (activity === 'cycle') {
    S.cycle = makeCycleRound(level, rng);
    ui.renderCycle(S.cycle); applySeason(S.season);
    setPrompt(T.consigne.cycle);
  } else {
    const season = SEASONS[Math.floor(rng() * SEASONS.length)];
    S.dress = makeDressRound(season, level, rng);
    applySeason(season);
    ui.renderDress(S.dress);
    setPrompt(T.consigne.saison(season));
  }
  speak(S.prompt);
}

function hintFor(key) { return T.indice[key] || T.encouragement[0]; }
function giveHint(text) { sounds.hint(); ui.toast(text); speak(text); }

// --- activité 1
function plantAction(action) {
  if (S.screen !== 'play' || S.activity !== 'plante' || S.done) return;
  const r = applyAction(S.plant, action);
  S.plant = r.plant;
  if (r.event === 'trop-eau' || r.event === 'trop-soleil') {
    S.errors++;
    giveHint(hintFor(r.event));
    ui.blink(missing(S.plant));
    return;
  }
  if (action === 'water') { sounds.water(); plant3d.dropWater(); } else { sounds.sun(); plant3d.shineSun(); }
  ui.renderPlant(S.plant);
  if (r.event === 'ok') {
    const m = missing(S.plant);
    if (m) later(900, () => { ui.toast(hintFor(m === 'water' ? 'manque-eau' : 'manque-soleil'), 1800); ui.blink(m); });
    return;
  }
  // grew / fini
  later(750, () => { sounds.grow(); plant3d.setStage(S.plant.stage, true); });
  if (r.event === 'fini') {
    S.done = true;
    scheduleWin(1900, `${T.fini} ${sayCycle('plante')}`);
  }
}

// --- activité 2
function cyclePlace(cardId, slotIdx) {
  const r = placeCard(S.cycle, cardId, slotIdx);
  if (!r.ok) {
    S.errors++; giveHint(hintFor(r.hint));
    return r;
  }
  S.cycle = r.round; sounds.pop();
  ui.renderCycle(S.cycle);
  if (isComplete(S.cycle)) { S.done = true; scheduleWin(700, sayCycle(S.cycle.cycle)); }
  return r;
}

// --- activité 3
function dressChoose(id) {
  if (S.done) return;
  const r = chooseItem(S.dress, id);
  if (!r.ok) {
    if (r.hint === 'deja-pose') return;
    S.errors++; ui.shakeProp(id); giveHint(hintFor(r.hint));
    return;
  }
  const index = S.dress.placed.length;
  S.dress = r.round; sounds.pop(); items.add(id, index);
  ui.renderDress(S.dress);
  if (r.done) { S.done = true; scheduleWin(1400, T.habille); }
}

// --- fin
function scheduleWin(ms, text) { S.pendingWin = text; later(ms, () => win(text)); }
function win(text) {
  S.token++; S.pendingWin = null;
  const stars = starsFor(S.errors);
  progress = recordWin(progress, S.activity, S.level, S.errors);
  saveProgress(progress);
  S.screen = 'end';
  ui.showEnd(stars, text);
  sounds.win(); confetti.burst();
  speak(text);
}

// --- débogage
function solve() {
  if (S.screen !== 'play' || S.done) return false;
  if (S.activity === 'plante') {
    let guard = 0;
    while (S.plant.stage < STAGES.length - 1 && guard++ < 40) plantAction(missing(S.plant));
  } else if (S.activity === 'cycle') {
    const seq = CYCLES[S.cycle.cycle];
    seq.forEach((c, i) => { if (S.cycle.slots[i] === null) cyclePlace(c, i); });
  } else {
    const good = S.dress.proposals.filter((id) => chooseItem(S.dress, id).ok);
    good.forEach((id) => { if (!S.done) dressChoose(id); });
  }
  if (S.done && S.pendingWin) { plant3d.setStage(S.plant ? S.plant.stage : 3, false); win(S.pendingWin); }
  return true;
}
installDebug({
  state: () => ({ screen: S.screen, activity: S.activity, level: S.level, errors: S.errors, season: S.season, done: S.done,
    plant: S.plant, cycle: S.cycle, dress: S.dress, stars: progress.stars, weather: weather.kind }),
  goto: (a, l = 1) => { if (!a) goHome(); else startLevel(a, l); },
  solve,
  season: (s) => { if (SEASONS.includes(s)) applySeason(s); },
});

// --- audio au premier appui
window.addEventListener('pointerdown', () => unlockAudio(), { once: true });

// --- boucle
applySeason('printemps', true);
goHome();
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  sc.update(dt); decor.update(dt); weather.update(dt); plant3d.update(dt); items.update(dt);
  sc.render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
