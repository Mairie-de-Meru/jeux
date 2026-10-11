import { CATEGORIES } from './logic/categories.js';
import { BOARD_SIZE, makeBoard } from './logic/board.js';
import { createGame } from './logic/game.js';
import { createScene } from './render/scene.js';
import { createBoard3D } from './render/board3d.js';
import { createDice3D } from './render/dice3d.js';
import { createPawns3D } from './render/pawns3d.js';
import { createPie3D } from './render/pie3d.js';
import { flags, tick, finishAll, wait } from './render/anim.js';
import { renderHud, showToast } from './ui/hud.js';
import { showQuestion, showFeedback, hideCard, highlightChoice } from './ui/card.js';
import { initSetup } from './ui/setup.js';
import { avatarSVG } from './ui/avatar.js';
import { botChooseDest, botAnswer } from './logic/bot.js';
import { mulberry32 } from './logic/rng.js';
import { burst } from './ui/confetti.js';
import * as audio from './audio.js';
import * as speech from './speech.js';
import * as THREE from 'three';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const urlSeed = params.has('seed') && Number.isFinite(Number(params.get('seed'))) ? Number(params.get('seed')) : null;

let bank = null;
let game = null;
let busy = false;
let lastConfig = null;
let botRng = Math.random;
let turnId = 0;
let botActing = false;
let autoBots = true;
let world = null; // { sc, board3d, dice, pawns, pie }

// ---------- Chargement des assets (repli silencieux) ----------
function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}
async function loadAssets() {
  const out = {};
  try {
    const r = await fetch('assets/manifest.json');
    if (!r.ok) return out;
    const m = await r.json();
    const entries = Object.entries((m && m.images) || {});
    const imgs = await Promise.all(entries.map(([, src]) => loadImage(src)));
    entries.forEach(([name], i) => { if (imgs[i]) out[name] = imgs[i]; });
  } catch (e) { /* repli : couleurs unies */ }
  return out;
}
const bankPromise = fetch('data/questions.json').then((r) => r.json()).then((b) => { bank = b; return b; });

// ---------- Aides ----------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function snapshot() {
  return game ? JSON.parse(JSON.stringify(game.state)) : null;
}
function updateHud() {
  const s = game.state;
  renderHud($('hud'), s.players, s.current);
}
function updatePie() {
  const p = game.state.players[game.state.current];
  world.pie.setParts(p.parts);
}
function setControls({ roll = false, dests = [] } = {}) {
  const c = $('controls');
  $('roll-btn').hidden = !roll;
  const box = $('dir-btns');
  box.innerHTML = '';
  dests.forEach((d) => {
    const s = game.state;
    const pos = s.players[s.current].pos;
    const cw = d === (pos + s.roll) % BOARD_SIZE;
    const cat = CATEGORIES[game.board[d].cat];
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'dir-btn';
    b.style.background = cat.couleur;
    b.textContent = `${cw ? '↻' : '↺'} ${cat.icone}`;
    b.setAttribute('aria-label', cw ? 'Avancer dans le sens des aiguilles' : 'Avancer dans l\'autre sens');
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); doChoose(d); });
    box.appendChild(b);
  });
  c.hidden = !(roll || dests.length);
}
async function idle() {
  for (let i = 0; i < 100 && busy; i++) { finishAll(); await sleep(0); }
}
function fastly(fn) {
  return async (...a) => {
    flags.fast = true;
    try { await idle(); return await fn(...a); } finally { flags.fast = false; }
  };
}

const isBotTurn = () => !!game && !!game.state.players[game.state.current].bot;
const locked = () => autoBots && isBotTurn() && !botActing;

// ---------- Déroulé du jeu ----------
function beginTurn() {
  const s = game.state;
  const p = s.players[s.current];
  updateHud();
  updatePie();
  world.board3d.setReachable([]);
  world.board3d.resetPulse();
  world.pawns.setMood(s.current);
  const bot = autoBots && p.bot;
  setControls({ roll: !bot });
  showToast($('toast'), bot ? `${p.nom} 🤖 joue…` : `À toi, ${p.nom} !`);
  if (!bot) speech.speak(`À toi, ${p.nom} !`);
  else botTurn();
}

// Tour automatique d'un robot : lancer, choix de case, réponse, retour.
async function botTurn() {
  const id = ++turnId;
  const alive = () => id === turnId && game && isBotTurn();
  botActing = true;
  try {
    await sleep(800); if (!alive()) return;
    await doRoll(); if (!alive()) return;
    await sleep(800); if (!alive()) return;
    const k = botChooseDest(game.state, game.board);
    await doChoose(game.state.dests[k]); if (!alive()) return;
    const q = game.state.question;
    const mode = game.state.players[game.state.current].mode;
    const a = botAnswer(q, botRng, mode);
    await sleep(1500); if (!alive()) return;
    highlightChoice(a);
    await sleep(600); if (!alive()) return;
    await doAnswer(a); if (!alive()) return;
    await sleep(2000); if (!alive()) return;
    await doNext();
  } finally { if (id === turnId) botActing = false; }
}

async function doRoll(value) {
  if (!game || busy || game.state.phase !== 'roll' || locked()) return;
  busy = true;
  try {
    setControls({});
    const v = game.roll(value);
    audio.play('dice');
    await world.dice.roll(v);
    world.board3d.setReachable(game.state.dests);
    setControls({ dests: game.state.dests });
  } finally { busy = false; }
}

async function doChoose(dest) {
  if (!game || busy || game.state.phase !== 'choose' || locked()) return;
  if (!game.state.dests.includes(dest)) return;
  busy = true;
  try {
    const s = game.state;
    const idx = s.current;
    const from = s.players[idx].pos;
    const steps = s.roll;
    const dir = dest === (from + steps) % BOARD_SIZE ? 1 : -1;
    const catIdx = game.board[dest].cat;
    setControls({});
    world.board3d.setReachable([]);
    world.board3d.resetPulse();
    game.move(dest);
    await world.pawns.move(idx, dest, steps, dir, () => audio.play('step'));
    showQuestion(game.state.question, catIdx, doAnswer, { bot: autoBots && isBotTurn() });
  } finally { busy = false; }
}

async function doAnswer(i) {
  if (!game || busy || game.state.phase !== 'question' || locked()) return;
  busy = true;
  try {
    const s = game.state;
    const q = s.question;
    const res = game.answer(i);
    updateHud();
    audio.play(res.correct ? 'good' : 'retry');
    if (res.correct) burst(70);
    showFeedback(q, i, res, doNext);
    if (res.partGagnee !== null) {
      const card = $('card');
      card.classList.add('ghost');
      const parts = s.players[s.current].parts.slice();
      parts[res.partGagnee] = false;
      world.pie.setParts(parts);
      await wait(300);
      await world.pie.pop(res.partGagnee);
      audio.play('wedge');
      burst(90);
      await wait(500);
      card.classList.remove('ghost');
    }
  } finally { busy = false; }
}

async function doNext() {
  if (!game || busy) return;
  if (locked()) return;
  const phase = game.state.phase;
  if (phase === 'over') { showVictory(); return; }
  if (phase !== 'feedback') return;
  hideCard();
  game.next();
  beginTurn();
}

function showVictory() {
  hideCard();
  setControls({});
  const s = game.state;
  const w = s.players[s.winner];
  $('win-av').innerHTML = avatarSVG(w.couleur, { bot: !!w.bot, size: 110 });
  world.pawns.setMood(s.current, s.winner);
  $('win-text').textContent = `${w.nom} a gagné !`;
  $('win').hidden = false;
  audio.play('win');
  burst(160);
  setTimeout(() => burst(120), 600);
  speech.speak(`Bravo ${w.nom} ! Tu as gagné !`);
}

async function startGame(config) {
  await bankPromise;
  if (!world) throw new Error('rendu indisponible');
  lastConfig = config;
  const seed = config.seed ?? urlSeed ?? Math.floor(Math.random() * 1e9);
  turnId++;
  botActing = false;
  botRng = mulberry32(seed + 7);
  game = createGame({ players: config.players, wedgesToWin: config.wedgesToWin ?? 6, seed, bank });
  window.__quiz.game = game;
  busy = false;
  hideCard();
  $('setup').hidden = true;
  $('win').hidden = true;
  world.pawns.setup(game.state.players);
  beginTurn();
  return snapshot();
}

// ---------- Démarrage ----------
async function boot() {
  const images = await loadAssets();
  if (images.titre) $('setup').style.backgroundImage = `url(${images.titre.src})`;
  if (images.icone) {
    $('logo').src = images.icone.src;
    $('logo').hidden = false;
    $('favicon').href = images.icone.src;
  }
  try {
    const sc = createScene($('stage'), images.table || null);
    const board = makeBoard();
    const board3d = createBoard3D(sc.scene, board);
    const dice = createDice3D(sc.scene);
    const pawns = createPawns3D(sc.scene, board);
    const pie = createPie3D(sc.scene);
    world = { sc, board3d, dice, pawns, pie };
    sc.onFrame((dt, time) => {
      tick(dt);
      board3d.update(time);
      pawns.update(time);
      dice.idle(time, !!game && game.state.phase === 'roll' && !busy);
    });
    setupPicking(sc);
  } catch (e) {
    console.error('Rendu 3D indisponible', e);
  }
  initSetup($('setup'), (cfg) => startGame(cfg));
}


function setupPicking(sc) {
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  sc.renderer.domElement.addEventListener('pointerdown', (e) => {
    if (!game || busy) return;
    const r = sc.renderer.domElement.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, sc.camera);
    const phase = game.state.phase;
    if (phase === 'roll') {
      if (ray.intersectObject(world.dice.mesh, false).length) doRoll();
    } else if (phase === 'choose') {
      const hits = ray.intersectObjects(world.board3d.pickables, false);
      for (const h of hits) {
        const i = h.object.userData.index;
        if (game.state.dests.includes(i)) { doChoose(i); break; }
      }
    }
  });
}

// ---------- Boutons globaux ----------
document.addEventListener('pointerdown', () => audio.unlock(), true);
$('roll-btn').addEventListener('pointerdown', (e) => { e.preventDefault(); doRoll(); });
$('sound-btn').addEventListener('pointerdown', (e) => {
  e.preventDefault();
  const on = !audio.isEnabled();
  audio.setEnabled(on);
  speech.setEnabled(on);
  $('sound-btn').textContent = on ? '🔊' : '🔇';
  $('sound-btn').classList.toggle('off', !on);
});
$('again-btn').addEventListener('pointerdown', (e) => {
  e.preventDefault();
  $('win').hidden = true;
  $('setup').hidden = false;
  hideCard();
  speech.cancel();
});

// ---------- Crochet de débogage ----------
window.__quiz = {
  game: null,
  get autoBots() { return autoBots; },
  set autoBots(v) { autoBots = !!v; },
  state: snapshot,
  start: fastly(startGame),
  roll: fastly(async (n) => { await doRoll(n); return snapshot(); }),
  choose: fastly(async (k) => {
    const d = game.state.dests;
    const dest = k >= 0 && k < d.length ? d[k] : k;
    await doChoose(dest);
    return snapshot();
  }),
  answer: fastly(async (a) => {
    const q = game.state.question;
    const i = a === 'bonne' ? q.bonne : a === 'fausse' ? (q.bonne + 1) % 3 : a;
    await doAnswer(i);
    return snapshot();
  }),
  next: fastly(async () => { await doNext(); return snapshot(); }),
};

boot();
