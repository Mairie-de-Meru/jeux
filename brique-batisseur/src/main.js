// Brique Bâtisseur : orchestration (écrans, entrées, état). La logique est dans src/logic/.
import { PIECES } from './logic/pieces.js';
import { Board, anchorFor } from './logic/board.js';
import { CHALLENGES, challengeById, score, hintFor, transformPieces, centerTransform } from './logic/challenges.js';
import { loadFree, saveFree, loadProgress, saveStars } from './logic/storage.js';
import { Stage } from './render/stage.js';
import { unlock, sounds } from './ui/audio.js';
import { speak } from './ui/speech.js';
import { confetti } from './ui/confetti.js';
import { loadImage } from './ui/images.js';
import { buildPalette, buildColors, markSelection, buildCards } from './ui/builders.js';

const $ = (sel) => document.querySelector(sel);

const memory = new Map();
const store = (() => {
  try {
    const s = window.localStorage;
    s.getItem('brique-batisseur.test');
    return s;
  } catch {
    return { getItem: (k) => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, v) };
  }
})();

const SCRIPTS = {
  title: 'Construis ce que tu veux, ou relève un défi !',
  pick: 'Choisis un défi !',
  free: 'Choisis une brique et une couleur, puis touche la plaque.',
  challenge: 'Construis le même modèle que sur la fiche !',
};

const REASONS = {
  roof: 'Pas sur un toit !',
  high: "C'est trop haut !",
  out: 'Reste sur la plaque !',
};

const board = new Board();
const state = {
  screen: 'title',
  mode: null, // 'free' | 'challenge'
  challengeId: null,
  type: 'b2x2',
  color: 'rouge',
  rot: 0,
  eraser: false,
  progress: loadProgress(store),
  ghost: null, // { x, z, y, ok, reason }
  result: null,
};
const images = {}; // nom → chargée ou non
const pointer = { x: 0, y: 0, has: false };

const canvas = $('#gl');
const stage = new Stage(canvas);
stage.setPreviewElement($('#fiche-view'));

// ---- messages ---------------------------------------------------------------
let bubbleTimer = 0;
function say(text, ms = 2500) {
  const b = $('#bubble');
  b.textContent = text;
  b.classList.add('show');
  clearTimeout(bubbleTimer);
  bubbleTimer = setTimeout(() => b.classList.remove('show'), ms);
}

function currentScript() {
  if (state.screen === 'game') return SCRIPTS[state.mode];
  return SCRIPTS[state.screen] ?? SCRIPTS.title;
}

// ---- écrans -----------------------------------------------------------------
function showScreen(name) {
  closeActions();
  state.screen = name;
  for (const id of ['title', 'pick', 'game']) $('#screen-' + id).hidden = id !== name;
  document.body.classList.toggle('in-game', name === 'game');
  $('#result').hidden = true;
  if (name === 'pick') buildCards(CHALLENGES, state.progress, images, startChallenge);
}

function resetTool() {
  state.eraser = false;
  $('#btn-eraser').classList.remove('on');
  state.ghost = null;
  stage.setGhost(false);
}

function enterGame(mode) {
  state.mode = mode;
  resetTool();
  stage.hideHologram();
  showScreen('game');
  stage.resize();
  say(SCRIPTS[mode]);
}

function startFree() {
  board.load(loadFree(store));
  stage.sync(board.pieces, false);
  state.challengeId = null;
  $('#fiche').hidden = true;
  $('#btn-finish').hidden = true;
  stage.setPreview(null);
  enterGame('free');
}

function guidePieces(ch) {
  return transformPieces(ch.pieces, centerTransform(ch.pieces));
}

function startChallenge(id) {
  const ch = challengeById(id);
  if (!ch) return;
  board.load([]);
  stage.sync(board.pieces, false);
  state.challengeId = id;
  $('#fiche').hidden = false;
  $('#btn-finish').hidden = false;
  $('#fiche-title').textContent = ch.title;
  $('#fiche-pic').innerHTML = images[id] ? `<img src="assets/img/${id}.png" alt="">` : ch.emoji;
  enterGame('challenge');
  stage.setPreview(ch.pieces);
  stage.updatePreviewRect();
  if (ch.guide) stage.showHologram(guidePieces(ch));
}

// ---- actions ------------------------------------------------------------------
function onChange() {
  if (state.mode === 'free') saveFree(store, board.pieces);
  refreshGhost();
}

function refuse(reason, uid) {
  sounds.soft();
  if (reason === 'covered') {
    say("Enlève d'abord le dessus !");
    if (uid != null) stage.shake(uid);
  } else say(REASONS[reason] ?? 'Essaie ailleurs !');
}

function doPlace(type, color, x, z, rot) {
  const r = board.place(type, color, x, z, rot);
  if (r.ok) {
    stage.sync(board.pieces, true);
    sounds.place();
    onChange();
  } else refuse(r.reason);
  return r;
}

function doErase(uid) {
  const r = board.remove(uid);
  if (r.ok) {
    stage.sync(board.pieces, true);
    sounds.pop();
    onChange();
  } else refuse(r.reason, uid);
  return r;
}

function doRotatePiece(uid) {
  const r = board.rotate(uid);
  if (r.ok) {
    stage.sync(board.pieces, true);
    sounds.tick();
    onChange();
  } else refuse(r.reason, uid);
  return r;
}

// ---- bulle d'action sur une pièce posée (appui long) -------------------------------
const actions = $('#piece-actions');
let actionUid = null;

function openActions(uid) {
  actionUid = uid;
  actions.hidden = false;
  placeActions();
  stage.setGhost(false);
  sounds.tick();
  if (navigator.vibrate) navigator.vibrate(20);
}

function placeActions() {
  if (actionUid == null) return;
  const pt = stage.screenOf(actionUid);
  if (!pt) { closeActions(); return; }
  const w = actions.offsetWidth, h = actions.offsetHeight;
  const x = Math.min(Math.max(pt.x - w / 2, 8), window.innerWidth - w - 8);
  const y = Math.min(Math.max(pt.y - h - 18, 8), window.innerHeight - h - 8);
  actions.style.transform = `translate(${x}px, ${y}px)`;
}

function closeActions() {
  actionUid = null;
  actions.hidden = true;
}

function doUndo() {
  const r = board.undo();
  if (!r.ok) { say('Rien à annuler !'); sounds.soft(); return; }
  stage.sync(board.pieces, true);
  sounds.pop();
  onChange();
}

function doClear() {
  const r = board.clear();
  if (!r.ok) { say("C'est déjà vide !"); return; }
  stage.sync(board.pieces, true);
  sounds.pop();
  onChange();
}

function updateGhost(x, y) {
  if (state.eraser || state.screen !== 'game') { state.ghost = null; stage.setGhost(false); return; }
  const pk = stage.pick(x, y);
  if (!pk || !pk.onBoard) { state.ghost = null; stage.setGhost(false); return; }
  const a = anchorFor(state.type, state.rot, pk.cx, pk.cz, board.size);
  const pl = board.placement(state.type, state.rot, a.x, a.z);
  state.ghost = { x: a.x, z: a.z, y: pl.y, ok: pl.ok, reason: pl.reason };
  stage.setGhost(true, state.type, state.rot, a.x, a.z, pl.y, pl.ok, state.color);
}

function refreshGhost() {
  if (pointer.has) updateGhost(pointer.x, pointer.y);
}

function handleTap(x, y) {
  if (state.screen !== 'game' || !$('#result').hidden) return;
  if (actionUid != null) { closeActions(); return; }
  if (state.eraser) {
    const pk = stage.pick(x, y);
    if (pk && pk.uid != null) doErase(pk.uid);
    return;
  }
  updateGhost(x, y);
  const g = state.ghost;
  if (!g) return;
  if (g.ok) doPlace(state.type, state.color, g.x, g.z, state.rot);
  else refuse(g.reason);
}

function finishChallenge() {
  if (state.mode !== 'challenge') return null;
  const ch = challengeById(state.challengeId);
  const res = score(board.pieces, ch.pieces, board.size);
  state.progress = saveStars(store, ch.id, res.stars);
  state.result = res;
  const stars = $('#res-stars');
  stars.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const s = document.createElement('span');
    s.className = 'star' + (i < res.stars ? ' on' : '');
    s.style.setProperty('--i', i);
    s.textContent = '★';
    stars.appendChild(s);
  }
  $('#res-hint').textContent = hintFor(res);
  const idx = CHALLENGES.findIndex((c) => c.id === ch.id);
  $('#res-next').hidden = idx >= CHALLENGES.length - 1;
  $('#res-next').dataset.next = CHALLENGES[idx + 1]?.id ?? '';
  $('#result').hidden = false;
  stage.setGhost(false);
  if (res.stars >= 1) { sounds.win(); confetti($('#confetti')); } else sounds.soft();
  return res;
}

function continueAfterResult() {
  $('#result').hidden = true;
  const res = state.result;
  const ch = challengeById(state.challengeId);
  if (!res || !ch) return;
  if (res.stars < 3) {
    stage.showHologram(transformPieces(ch.pieces, res.transform), 4);
    if (ch.guide) {
      const id = ch.id;
      setTimeout(() => {
        if (state.mode === 'challenge' && state.challengeId === id && stage.holoTimer <= 0) stage.showHologram(guidePieces(ch));
      }, 4300);
    }
  }
}

// ---- entrées ------------------------------------------------------------------
const active = new Set();
let down = null;
let holdTimer = 0;
const HOLD_MS = 450;

canvas.addEventListener('pointerdown', (e) => {
  active.add(e.pointerId);
  if (active.size > 1) { if (down) down.valid = false; return; }
  down = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), valid: true };
  clearTimeout(holdTimer);
  const d = down;
  holdTimer = setTimeout(() => {
    if (down !== d || !d.valid || state.screen !== 'game' || !$('#result').hidden) return;
    const pk = stage.pick(d.x, d.y);
    if (pk && pk.uid != null) { d.valid = false; openActions(pk.uid); }
  }, HOLD_MS);
  pointer.x = e.clientX; pointer.y = e.clientY; pointer.has = true;
  if (e.pointerType !== 'mouse') updateGhost(e.clientX, e.clientY);
});

canvas.addEventListener('pointermove', (e) => {
  if (down && e.pointerId === down.id && Math.hypot(e.clientX - down.x, e.clientY - down.y) >= 8) down.valid = false;
  if (e.pointerType === 'mouse') {
    pointer.x = e.clientX; pointer.y = e.clientY; pointer.has = true;
    updateGhost(e.clientX, e.clientY);
  }
});

function endPointer(e, cancelled) {
  active.delete(e.pointerId);
  if (!down || e.pointerId !== down.id) return;
  const d = down;
  down = null;
  clearTimeout(holdTimer);
  if (cancelled || !d.valid) return;
  if (performance.now() - d.t >= 500 || Math.hypot(e.clientX - d.x, e.clientY - d.y) >= 8) return;
  pointer.x = e.clientX; pointer.y = e.clientY; pointer.has = true;
  handleTap(e.clientX, e.clientY);
}
canvas.addEventListener('pointerup', (e) => endPointer(e, false));
canvas.addEventListener('pointercancel', (e) => endPointer(e, true));
canvas.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' && !state.eraser) stage.setGhost(false); });
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('pointerdown', unlock, { capture: true });
document.addEventListener('keydown', unlock, { capture: true });

function selectType(t) { state.type = t; markSelection(state.type, state.color); setEraser(false); sounds.tick(); refreshGhost(); }
function selectColor(c) { state.color = c; markSelection(state.type, state.color); setEraser(false); sounds.tick(); refreshGhost(); }
function setEraser(on) {
  state.eraser = on;
  $('#btn-eraser').classList.toggle('on', on);
  if (on) { stage.setGhost(false); state.ghost = null; } else refreshGhost();
}

buildPalette(selectType);
buildColors(selectColor);
markSelection(state.type, state.color);

$('#btn-free').addEventListener('click', startFree);
$('#btn-challenge').addEventListener('click', () => { showScreen('pick'); say(SCRIPTS.pick); });
$('#pick-home').addEventListener('click', () => showScreen('title'));
$('#speak-title').addEventListener('click', () => speak(SCRIPTS.title));
$('#speak-pick').addEventListener('click', () => speak(SCRIPTS.pick));
$('#btn-speak').addEventListener('click', () => speak(currentScript()));
$('#btn-home').addEventListener('click', () => { stage.hideHologram(); showScreen(state.mode === 'challenge' ? 'pick' : 'title'); });
$('#btn-rotate').addEventListener('click', () => { state.rot = (state.rot + 1) % 4; sounds.tick(); refreshGhost(); });
$('#btn-eraser').addEventListener('click', () => { setEraser(!state.eraser); sounds.tick(); });
$('#btn-undo').addEventListener('click', doUndo);
$('#act-rotate').addEventListener('click', () => { if (actionUid != null) { doRotatePiece(actionUid); placeActions(); } });
$('#act-delete').addEventListener('click', () => { const uid = actionUid; if (uid == null) return; if (doErase(uid).ok) closeActions(); });
$('#act-close').addEventListener('click', () => { closeActions(); sounds.tick(); });
$('#btn-zoom-in').addEventListener('click', () => { stage.zoom(0.75); sounds.tick(); });
$('#btn-zoom-out').addEventListener('click', () => { stage.zoom(1.33); sounds.tick(); });
document.addEventListener('keydown', (e) => {
  if (state.screen !== 'game' || !$('#result').hidden) return;
  const k = e.key.toLowerCase();
  if (k === 'r') {
    if (actionUid != null) { doRotatePiece(actionUid); placeActions(); }
    else { state.rot = (state.rot + 1) % 4; sounds.tick(); refreshGhost(); }
  } else if (k === 'delete' || k === 'backspace') {
    if (actionUid != null) { if (doErase(actionUid).ok) closeActions(); return; }
    const pk = pointer.has ? stage.pick(pointer.x, pointer.y) : null;
    if (pk && pk.uid != null) doErase(pk.uid);
  } else if (k === 'escape') closeActions();
  else if (k === '+' || k === '=') stage.zoom(0.75);
  else if (k === '-') stage.zoom(1.33);
  else if ((e.metaKey || e.ctrlKey) && k === 'z') { e.preventDefault(); doUndo(); }
});
$('#btn-clear').addEventListener('click', doClear);
$('#btn-finish').addEventListener('click', finishChallenge);
$('#res-continue').addEventListener('click', continueAfterResult);
$('#res-next').addEventListener('click', (e) => { const id = e.currentTarget.dataset.next; if (id) startChallenge(id); });
$('#res-home').addEventListener('click', () => { stage.hideHologram(); showScreen('pick'); });

// ---- images optionnelles ----------------------------------------------------------
loadImage('assets/img/titre.png').then((ok) => {
  if (ok) $('#screen-title').style.backgroundImage = 'url(assets/img/titre.png)';
});
loadImage('assets/img/fond.png').then((ok) => {
  if (ok) $('#bg').style.backgroundImage = 'url(assets/img/fond.png)';
});
for (const c of CHALLENGES) {
  loadImage(`assets/img/${c.id}.png`).then((ok) => {
    images[c.id] = ok;
    if (ok && state.screen === 'pick') buildCards(CHALLENGES, state.progress, images, startChallenge);
  });
}

// ---- boucle -------------------------------------------------------------------------
let last = performance.now();
function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  if (state.screen === 'game') {
    stage.update(dt);
    if (actionUid != null) placeActions();
    stage.render();
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// ---- API de debug pour la vérification automatique ----------------------------------
window.__game = {
  state,
  board,
  stage,
  get screen() { return state.screen; },
  placeAt: (type, color, x, z, rot = 0) => doPlace(type, color, x, z, rot),
  startChallenge,
  finishChallenge,
  startFree,
  PIECES,
};
