// Brique Bâtisseur : orchestration (écrans, entrées, état). La logique est dans src/logic/.
import { PIECES, footprint, colorById } from './logic/pieces.js';
import { Board, anchorFor, nextPlateSize, SIZE } from './logic/board.js';
import { CHALLENGES, challengeById, score, hintFor, transformPieces, centerTransform } from './logic/challenges.js';
import { stepTargets, nextStepIndex, checkPlacement, stepLabel, stepHint } from './logic/steps.js';
import { loadFree, loadFreeSize, saveFree, loadProgress, saveStars } from './logic/storage.js';
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
  steps: 'Pose la brique qui brille !',
};

const REASONS = {
  roof: 'Pas sur un toit !',
  high: "C'est trop haut !",
  out: 'Reste sur la plaque !',
  fit: 'Trop de briques pour rétrécir !',
};

// Préférence « astuces du défi » (hologramme, brique suivante, badge d'étape, présélection).
const HINTS_KEY = 'brique-batisseur.astuces';
function loadHints() { try { return store.getItem(HINTS_KEY) !== '0'; } catch { return true; } }
function saveHints(on) { try { store.setItem(HINTS_KEY, on ? '1' : '0'); } catch { /* stockage indisponible */ } }

const board = new Board();
const state = {
  hints: loadHints(),
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
  targets: null, // mode pas à pas : pièces cibles sur la plaque, dans l'ordre
  stepIndex: -1,
  stepDone: false,
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
  if (state.screen === 'game' && stepsActive()) {
    const t = state.targets[state.stepIndex];
    return t ? stepLabel(t) : SCRIPTS.steps;
  }
  if (state.screen === 'game') return SCRIPTS[state.mode];
  return SCRIPTS[state.screen] ?? SCRIPTS.title;
}

// ---- écrans -----------------------------------------------------------------
function showScreen(name) {
  closeActions();
  cancelGesture();
  state.screen = name;
  for (const id of ['title', 'pick', 'game']) $('#screen-' + id).hidden = id !== name;
  document.body.classList.toggle('in-game', name === 'game');
  $('#result').hidden = true;
  if (name === 'pick') showCards();
}

function showCards() {
  buildCards(CHALLENGES, state.progress, images, startChallenge, (c) => stage.thumbnail(c.id, c.pieces));
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

function applyPlateSize(n) {
  const r = board.resize(n);
  if (r.ok) { stage.setPlateSize(n); stage.hideHologram(); }
  $('#plate-size').textContent = board.size;
  return r;
}

/** Le modèle centré tient-il sur une plaque de cette taille ? */
function modelFits(pieces, size) {
  let maxW = 0, maxD = 0, minX = Infinity, minZ = Infinity;
  for (const p of pieces) {
    const f = footprint(p.type, p.rot);
    minX = Math.min(minX, p.x); minZ = Math.min(minZ, p.z);
    maxW = Math.max(maxW, p.x + f.w); maxD = Math.max(maxD, p.z + f.d);
  }
  return maxW - minX <= size && maxD - minZ <= size;
}

/** Hologramme guide d'un défi classique, seulement si les astuces sont visibles. */
function showGuide(ch) {
  if (ch?.guide && !ch.steps && state.hints) stage.showHologram(guidePieces(ch));
  else stage.hideHologram();
}

/** Bouton 💡 : visible en défi seulement, reflète l'état des astuces. */
function updateHintsButton() {
  const b = $('#btn-hints');
  b.hidden = state.mode !== 'challenge';
  b.classList.toggle('off', !state.hints);
  b.setAttribute('aria-pressed', String(state.hints));
}

function setHints(on) {
  state.hints = on;
  saveHints(on);
  updateHintsButton();
  if (state.mode !== 'challenge') return;
  const ch = challengeById(state.challengeId);
  showGuide(ch);
  state.stepIndex = -1; // réactivées : nouvelle présélection de la brique attendue
  refreshStep();
  refreshGhost();
  say(on ? 'Astuces visibles' : 'Astuces cachées');
}

function startFree() {
  board.load([]);
  applyPlateSize(loadFreeSize(store));
  board.load(loadFree(store));
  stage.sync(board.pieces, false);
  state.challengeId = null;
  state.targets = null;
  clearWrong();
  refreshStep();
  $('#fiche').hidden = true;
  $('#btn-finish').hidden = true;
  stage.setPreview(null);
  enterGame('free');
  updateHintsButton();
}

function guidePieces(ch) {
  return transformPieces(ch.pieces, centerTransform(ch.pieces, board.size));
}

function startChallenge(id) {
  const ch = challengeById(id);
  if (!ch) return;
  board.load([]);
  applyPlateSize(modelFits(ch.pieces, board.size) ? board.size : SIZE); // garde la taille choisie si le modèle tient
  stage.resetView();
  stage.sync(board.pieces, false);
  state.challengeId = id;
  clearWrong();
  state.targets = ch.steps ? stepTargets(ch.pieces, centerTransform(ch.pieces, board.size)) : null;
  state.stepIndex = -1;
  state.stepDone = false;
  $('#fiche').hidden = false;
  $('#btn-finish').hidden = !!ch.steps;
  $('#fiche-title').textContent = ch.title;
  $('#fiche-pic').innerHTML = images[id] ? `<img src="assets/img/${id}.png" alt="">` : ch.emoji;
  enterGame('challenge');
  stage.setPreview(ch.pieces);
  stage.updatePreviewRect();
  updateHintsButton();
  if (ch.steps) { refreshStep(); say(SCRIPTS.steps); }
  else showGuide(ch);
}

// ---- mode pas à pas -----------------------------------------------------------------
function stepsActive() { return state.mode === 'challenge' && !!state.targets; }

/** Recalcule l'étape courante : brique suivante pulsante, présélection, bulle d'étape, fin. */
function refreshStep() {
  const info = $('#step');
  if (!stepsActive()) { stage.clearStep(); info.hidden = true; return; }
  const total = state.targets.length;
  const i = nextStepIndex(state.targets, board.pieces);
  const changed = i !== state.stepIndex;
  state.stepIndex = i;
  if (i >= total) {
    stage.clearStep();
    info.hidden = true;
    if (!state.stepDone) {
      state.stepDone = true;
      const id = state.challengeId;
      setTimeout(() => {
        if (stepsActive() && state.challengeId === id && state.stepDone && $('#result').hidden) finishChallenge();
      }, 650);
    }
    return;
  }
  state.stepDone = false;
  const t = state.targets[i];
  if (!state.hints) { stage.clearStep(); info.hidden = true; return; } // astuces cachées : la validation continue
  stage.showStep(t);
  if (changed) {
    state.type = t.type;
    state.color = t.color;
    state.rot = t.rot;
    if (state.eraser) setEraser(false);
    markSelection(state.type, state.color);
    for (const el of document.querySelectorAll('.piece.sel, .swatch.sel')) el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
  info.hidden = false;
  $('#step-ico').className = 'ico ' + PIECES[t.type].kind;
  const fp = footprint(t.type, 0);
  $('#step-ico').style.cssText = `width:${fp.w * 10 + 4}px;height:${fp.d * 10 + 4}px;--c:${colorById(t.color)?.hex ?? '#fff'}`;
  $('#step-label').textContent = stepLabel(t);
  $('#step-count').textContent = `${i + 1}/${total}`;
}

// Pièce fausse en mode pas à pas : indice doux, puis elle s'en va toute seule après 1 s.
let wrong = null; // { uid, timer }
function clearWrong() { if (wrong) clearTimeout(wrong.timer); wrong = null; }
function wrongPiece(piece, check) {
  sounds.soft();
  say('Oups ! ' + stepHint(check.reason, state.targets[check.index]), 2200);
  clearWrong();
  const uid = piece.uid;
  wrong = { uid, timer: setTimeout(() => removeWrong(uid), 1000) };
}
function removeWrong(uid) {
  wrong = null;
  if (!board.pieces.some((p) => p.uid === uid)) return;
  const last = board.history.at(-1);
  if (last && last.kind === 'place' && last.piece.uid === uid) board.undo();
  else if (board.canRemove(uid)) board.remove(uid);
  else return;
  stage.sync(board.pieces, true);
  sounds.pop();
  onChange();
}

// ---- actions ------------------------------------------------------------------
function onChange() {
  if (state.mode === 'free') saveFree(store, board.pieces, board.size);
  refreshStep();
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
  if (wrong && board.pieces.some((p) => p.uid === wrong.uid)) {
    sounds.soft();
    say('Oups, essaie encore !');
    return { ok: false, reason: 'wait' };
  }
  const r = board.place(type, color, x, z, rot);
  if (r.ok) {
    stage.sync(board.pieces, true);
    if (stepsActive()) {
      const c = checkPlacement(state.targets, board.pieces, r.piece);
      if (c.ok) { sounds.place(); sounds.step(); } else wrongPiece(r.piece, c);
      r.step = c;
    } else sounds.place();
    onChange();
  } else refuse(r.reason);
  return r;
}

function doMove(uid, x, z, rot) {
  const r = board.move(uid, x, z, rot);
  if (r.ok) {
    if (!r.same) { stage.sync(board.pieces, true); sounds.place(); onChange(); }
  } else refuse(r.reason, uid);
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

function doPlateSize(n = nextPlateSize(board.size)) {
  closeActions();
  const r = applyPlateSize(n);
  if (!r.ok) { refuse(r.reason); return r; }
  if (state.mode === 'free') saveFree(store, board.pieces, board.size);
  else if (state.mode === 'challenge') {
    const ch = challengeById(state.challengeId);
    if (ch?.steps && !board.pieces.length) {
      state.targets = stepTargets(ch.pieces, centerTransform(ch.pieces, board.size)); // plaque vide : guide recentré
      state.stepIndex = -1;
      refreshStep();
    }
    showGuide(ch);
  }
  sounds.tick();
  say(`Terrain ${n} × ${n}`);
  refreshGhost();
  return r;
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

function hideGhost() { state.ghost = null; stage.setGhost(false); }

/** Coin de pose pour la case pointée ; en mode pas à pas, aimanté sur la brique qui brille si on la vise. */
function anchorAt(cx, cz) {
  const a = anchorFor(state.type, state.rot, cx, cz, board.size);
  const t = stepsActive() && state.hints ? state.targets[state.stepIndex] : null;
  if (!t || t.type !== state.type) return a;
  const ft = footprint(t.type, t.rot), fs = footprint(state.type, state.rot);
  if (ft.w !== fs.w || (PIECES[t.type].kind === 'roof' && t.rot !== state.rot)) return a;
  if (cx >= t.x - 1 && cx <= t.x + ft.w && cz >= t.z - 1 && cz <= t.z + ft.d) return { x: t.x, z: t.z };
  return a;
}

function updateGhost(x, y) {
  if (state.eraser || state.screen !== 'game') { hideGhost(); return; }
  const pk = stage.pick(x, y);
  if (!pk || !pk.onBoard) { hideGhost(); return; }
  const a = anchorAt(pk.cx, pk.cz);
  const pl = board.placement(state.type, state.rot, a.x, a.z);
  state.ghost = { x: a.x, z: a.z, y: pl.y, ok: pl.ok, reason: pl.reason };
  stage.setGhost(true, state.type, state.rot, a.x, a.z, pl.y, pl.ok, state.color);
}

function refreshGhost() {
  if (pointer.has) updateGhost(pointer.x, pointer.y);
}

/** Tap en (x,y) ; lift = décalage vertical du point de pose (fantôme au-dessus du doigt en tactile). */
function handleTap(x, y, lift = 0) {
  if (state.screen !== 'game' || !$('#result').hidden) return;
  if (actionUid != null) { closeActions(); return; }
  if (state.eraser) {
    const pk = stage.pick(x, y);
    if (pk && pk.uid != null) doErase(pk.uid);
    return;
  }
  updateGhost(x, y - lift);
  const g = state.ghost;
  if (!g) return;
  if (g.ok) doPlace(state.type, state.color, g.x, g.z, state.rot);
  else refuse(g.reason);
}

function finishChallenge() {
  if (state.mode !== 'challenge') return null;
  const ch = challengeById(state.challengeId);
  const res = score(board.pieces, ch.pieces, board.size);
  if (ch.steps) stage.clearStep();
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
  if (ch.steps) { refreshStep(); return; }
  if (res.stars < 3 && state.hints) {
    stage.showHologram(transformPieces(ch.pieces, res.transform), 4);
    if (ch.guide) {
      const id = ch.id;
      setTimeout(() => {
        if (state.mode === 'challenge' && state.challengeId === id && stage.holoTimer <= 0) showGuide(ch);
      }, 4300);
    }
  }
}

// ---- entrées ------------------------------------------------------------------
// 1 doigt sur une brique du dessus + glisser = déplacer ; appui long immobile = bulle d'actions ;
// 1 doigt ailleurs + glisser = orbite ; tap = pose (au relâcher) ; 2 doigts = zoom/pan, aucune pose.
const active = new Set(); // pointeurs posés sur le canevas
let gesture = null; // { id, x, y, lift, touch, uid, moved, held, dragging, piece, rot, target }
let multi = false; // plusieurs doigts : plus aucune pose tant qu'ils ne sont pas tous levés
let pal = null; // glisser depuis la palette : { id, type, x, y, lift, dragging }
let rightDown = null; // clic droit en cours : { x, y }
let holdTimer = 0;
const HOLD_MS = 450;
let holdMs = HOLD_MS; // réglable par le crochet de débogage (navigateur de test très lent)
const MOVE_PX = 8;
const TOUCH_LIFT = 70; // px CSS : pendant un glisser tactile, le fantôme passe au-dessus du doigt (0 à la souris ; tap = sous le doigt)
const liftOf = (e) => (e.pointerType === 'mouse' ? 0 : TOUCH_LIFT);
const playing = () => state.screen === 'game' && $('#result').hidden;

function restoreControls() {
  stage.controls.enabled = true;
  stage.controls.enableRotate = true;
}

function startDrag(d) {
  const p = board.pieces.find((q) => q.uid === d.uid);
  if (!p || !board.canRemove(p.uid)) return false;
  closeActions();
  Object.assign(d, { dragging: true, piece: p, rot: p.rot, target: null });
  stage.setFaded(p.uid, true, p.color);
  stage.controls.enabled = false;
  return true;
}

function updateDrag(d, x, y) {
  const p = d.piece;
  const pk = stage.pick(x, y - d.lift, p.uid);
  if (!pk || !pk.onBoard) { d.target = null; hideGhost(); return; }
  const a = anchorFor(p.type, d.rot, pk.cx, pk.cz, board.size);
  const r = board.moveCheck(p.uid, a.x, a.z, d.rot);
  d.target = { x: a.x, z: a.z, ok: r.ok, reason: r.reason };
  stage.setGhost(true, p.type, d.rot, a.x, a.z, r.y, r.ok, p.color);
}

/** Fin d'un glisser de brique : drop = déplacer si possible, sinon la brique reste où elle était. */
function endDrag(d, drop) {
  if (!d?.dragging) return;
  d.dragging = false;
  stage.setFaded(d.piece.uid, false, d.piece.color);
  hideGhost();
  restoreControls();
  if (!drop) return;
  const t = d.target;
  if (!t) { sounds.soft(); say('Pose-la sur la plaque !'); return; }
  if (!t.ok) { refuse(t.reason); return; }
  doMove(d.piece.uid, t.x, t.z, d.rot);
}

function cancelPalette() {
  if (pal?.dragging) hideGhost();
  pal = null;
}

/** Annule tout geste à un doigt en cours (glisser, pose, appui long). */
function cancelGesture() {
  clearTimeout(holdTimer);
  if (gesture?.dragging) endDrag(gesture, false);
  if (gesture?.touch) hideGhost();
  gesture = null;
  cancelPalette();
  restoreControls();
}

canvas.addEventListener('pointerdown', (e) => {
  if (e.button === 2 && e.pointerType === 'mouse') {
    // Clic droit : glisser = tourner le terrain (OrbitControls), clic court sur une brique = la retirer (au relâcher).
    closeActions();
    rightDown = { x: e.clientX, y: e.clientY };
    hideGhost();
    return;
  }
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  active.add(e.pointerId);
  if (active.size > 1 || pal) {
    // 2e doigt : on laisse OrbitControls zoomer / déplacer, sans rien poser.
    multi = true;
    cancelGesture();
    return;
  }
  multi = false;
  const lift = liftOf(e);
  const d = (gesture = { id: e.pointerId, x: e.clientX, y: e.clientY, lift, touch: e.pointerType !== 'mouse', uid: null, moved: false, held: false, dragging: false });
  if (playing() && !state.eraser) {
    const pk = stage.pick(e.clientX, e.clientY);
    if (pk && pk.uid != null && board.canRemove(pk.uid)) {
      d.uid = pk.uid;
      stage.controls.enableRotate = false; // glisser sur une brique = la déplacer, pas d'orbite
    }
  }
  clearTimeout(holdTimer);
  holdTimer = setTimeout(() => {
    if (gesture !== d || d.moved || !playing()) return;
    const pk = stage.pick(d.x, d.y);
    if (pk && pk.uid != null) { d.held = true; hideGhost(); openActions(pk.uid); }
  }, holdMs);
  if (d.touch) {
    pointer.has = false;
    if (playing()) updateGhost(e.clientX, e.clientY); // tap : pose sous le doigt
  }
}, { capture: true });

canvas.addEventListener('pointermove', (e) => {
  if (e.pointerType === 'mouse' && rightDown) return; // orbite au clic droit : pas de fantôme
  if (e.pointerType === 'mouse' && !gesture) {
    pointer.x = e.clientX; pointer.y = e.clientY; pointer.has = true;
    updateGhost(e.clientX, e.clientY);
    return;
  }
  const d = gesture;
  if (!d || e.pointerId !== d.id || multi) return;
  if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) >= MOVE_PX) {
    d.moved = true;
    clearTimeout(holdTimer);
    // Une brique du dessus suit le doigt, même si la bulle d'actions s'est ouverte entre-temps (enfant qui hésite).
    if (d.uid != null && playing()) { if (d.held) { closeActions(); d.held = false; } startDrag(d); }
    if (!d.dragging) hideGhost(); // orbite : pas de pose
  }
  if (d.dragging) updateDrag(d, e.clientX, e.clientY);
});

function endPointer(e, cancelled) {
  active.delete(e.pointerId);
  if (multi) {
    if (active.size === 0) { multi = false; restoreControls(); }
    return;
  }
  const d = gesture;
  if (!d || e.pointerId !== d.id) return;
  gesture = null;
  clearTimeout(holdTimer);
  if (d.dragging) { endDrag(d, !cancelled); return; }
  restoreControls();
  if (cancelled || d.moved || d.held) { if (d.touch) hideGhost(); return; }
  if (!d.touch) { pointer.x = e.clientX; pointer.y = e.clientY; pointer.has = true; }
  handleTap(e.clientX, e.clientY);
  if (d.touch) hideGhost();
}
canvas.addEventListener('pointerup', (e) => {
  if (e.pointerType === 'mouse' && e.button === 2) {
    const r = rightDown;
    rightDown = null;
    if (r && playing() && Math.hypot(e.clientX - r.x, e.clientY - r.y) < MOVE_PX) {
      const pk = stage.pick(e.clientX, e.clientY);
      if (pk && pk.uid != null) doErase(pk.uid);
    }
    return;
  }
  endPointer(e, false);
});
canvas.addEventListener('pointercancel', (e) => endPointer(e, true));
canvas.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' && !gesture) stage.setGhost(false); });
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('pointerdown', unlock, { capture: true });
document.addEventListener('keydown', unlock, { capture: true });

// Glisser une pièce de la palette vers la plaque (vers le haut ; un glisser horizontal fait défiler la palette).
const overUi = (x, y) => {
  const el = document.elementFromPoint(x, y);
  return !!el && el !== canvas && !!el.closest('#bottom, #tools, #zoom, #fiche, #piece-actions, #btn-finish');
};
$('#palette').addEventListener('pointerdown', (e) => {
  const btn = e.target.closest('.piece');
  if (!btn || !playing() || active.size || (e.pointerType === 'mouse' && e.button !== 0)) return;
  pal = { id: e.pointerId, type: btn.dataset.type, x: e.clientX, y: e.clientY, lift: liftOf(e), dragging: false };
});
document.addEventListener('pointermove', (e) => {
  if (!pal || e.pointerId !== pal.id) return;
  const dx = e.clientX - pal.x, dy = e.clientY - pal.y;
  if (!pal.dragging) {
    if (dy < -12 && Math.abs(dy) > Math.abs(dx)) {
      pal.dragging = true;
      closeActions();
      if (state.type !== pal.type || state.eraser) selectType(pal.type);
    } else if (Math.abs(dx) > 12) { pal = null; return; } else return;
  }
  if (overUi(e.clientX, e.clientY - pal.lift)) hideGhost();
  else updateGhost(e.clientX, e.clientY - pal.lift);
});
document.addEventListener('pointerup', (e) => {
  if (!pal || e.pointerId !== pal.id) return;
  const p = pal;
  pal = null;
  if (!p.dragging) return; // simple tap : le clic sélectionne la pièce
  updateGhost(e.clientX, e.clientY - p.lift);
  const g = state.ghost;
  hideGhost();
  if (!g || overUi(e.clientX, e.clientY) || overUi(e.clientX, e.clientY - p.lift)) { sounds.soft(); return; } // hors plaque : annulé
  if (g.ok) doPlace(state.type, state.color, g.x, g.z, state.rot);
  else refuse(g.reason);
});
document.addEventListener('pointercancel', (e) => { if (pal && e.pointerId === pal.id) cancelPalette(); });

/** Bouton / touche « tourner » : la brique en cours de glisser, sinon la pièce sélectionnée. */
function rotateTool() {
  const d = gesture;
  sounds.tick();
  if (d?.dragging) {
    d.rot = (d.rot + 1) % 4;
    const pt = d.lastPt ?? { x: d.x, y: d.y };
    updateDrag(d, pt.x, pt.y);
    return;
  }
  state.rot = (state.rot + 1) % 4;
  refreshGhost();
}
canvas.addEventListener('pointermove', (e) => { if (gesture?.dragging && e.pointerId === gesture.id) gesture.lastPt = { x: e.clientX, y: e.clientY }; });

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
$('#btn-rotate').addEventListener('click', rotateTool);
$('#btn-eraser').addEventListener('click', () => { setEraser(!state.eraser); sounds.tick(); });
$('#btn-undo').addEventListener('click', doUndo);
$('#act-rotate').addEventListener('click', () => { if (actionUid != null) { doRotatePiece(actionUid); placeActions(); } });
$('#act-delete').addEventListener('click', () => { const uid = actionUid; if (uid == null) return; if (doErase(uid).ok) closeActions(); });
$('#act-close').addEventListener('click', () => { closeActions(); sounds.tick(); });
$('#btn-plate').addEventListener('click', () => doPlateSize());
$('#btn-hints').addEventListener('click', () => { sounds.tick(); setHints(!state.hints); });
$('#fiche-head').addEventListener('click', () => {
  $('#fiche').classList.toggle('folded');
  stage.updatePreviewRect();
  sounds.tick();
});
$('#btn-zoom-in').addEventListener('click', () => { stage.zoom(0.75); sounds.tick(); });
$('#btn-zoom-out').addEventListener('click', () => { stage.zoom(1.33); sounds.tick(); });
document.addEventListener('keydown', (e) => {
  if (state.screen !== 'game' || !$('#result').hidden) return;
  const k = e.key.toLowerCase();
  if (k === 'r') {
    if (actionUid != null) { doRotatePiece(actionUid); placeActions(); }
    else rotateTool();
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
    if (ok && state.screen === 'pick') showCards();
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
  move: (uid, x, z, rot) => doMove(uid, x, z, rot),
  undo: doUndo,
  get step() {
    if (!stepsActive()) return null;
    return { index: state.stepIndex, total: state.targets.length, target: state.targets[state.stepIndex] ?? null, done: state.stepDone };
  },
  get gesture() {
    const d = gesture;
    return { active: active.size, multi, palette: pal ? { type: pal.type, dragging: pal.dragging } : null, pointer: d ? { uid: d.uid, moved: d.moved, held: d.held, dragging: d.dragging } : null };
  },
  screenOfCell: (x, z, y = 0) => stage.screenOfCell(x, z, y),
  TOUCH_LIFT,
  startChallenge,
  finishChallenge,
  startFree,
  setPlateSize: (n) => doPlateSize(n),
  setHints,
  get holdMs() { return holdMs; },
  set holdMs(v) { holdMs = v > 0 ? v : HOLD_MS; },
  PIECES,
};
