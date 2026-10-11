// Orchestration : écrans <-> jeu 3D, sauvegarde, crochet de débogage.
import { LEVELS } from './logic/levels.js';
import { buildPuzzle } from './logic/pieces.js';
import { scatter, fitView, inView, clampToView } from './logic/layout.js';
import { createGame, setPositions, trySnap, rotate, nextHint, needsHelp, placedCount, stars } from './logic/game.js';
import { defaultProgress, recordWin, serialize, deserialize } from './logic/progress.js';
import { mulberry32 } from './logic/rng.js';
import { IMAGES, loadTitle, whenReady, isLoaded, getTexture, imageAspect, getTitleUrl } from './assets.js';
import { createScene } from './render/scene.js';
import { createPieceGeometry, createPieceMesh, makeFaceMaterial, makeSideMaterials } from './render/pieceMesh.js';
import { createBoard } from './render/board.js';
import { createDrag, LIFT_Z } from './render/drag.js';
import { createFx } from './render/fx.js';
import { tween, updateTweens, clearTweens, animate, cancelTween, squash, easeOutBack, easeOutCubic, easeInOutQuad, lerp } from './render/easing.js';
import { sfx } from './ui/audio.js';
import { speak, stopSpeech } from './ui/speech.js';
import * as ui from './ui/screens.js';

const $ = ui.$;
const STORE_KEY = 'puzzle-magique-v1';

// ---------- sauvegarde ----------
function loadProgress() {
  try { return deserialize(localStorage.getItem(STORE_KEY)); } catch { return defaultProgress(); }
}
function saveProgress() {
  try { localStorage.setItem(STORE_KEY, serialize(progress)); } catch { /* stockage indisponible */ }
}
let progress = loadProgress();
let rotationOn = true;
let selectedLevel = 0;
let session = null;

const canvas = $('#c');
const sc = createScene(canvas);
const fx = createFx(sc.world);
let clock = 0;
const pointer = { x: 0, y: 0, sx: 0, sy: 0 };

// ---------- consignes ----------
function instruction(name) {
  switch (name) {
    case 'accueil': return 'Bienvenue dans Puzzle Magique ! Reconstitue les images en glissant les pièces.';
    case 'paliers': return 'Choisis le nombre de pièces. Commence par quatre !';
    case 'images': return 'Choisis une image.';
    case 'jeu': return session && session.game.rotation
      ? 'Glisse chaque pièce à sa place. Touche une pièce pour la tourner. La lampe t’aide !'
      : 'Glisse chaque pièce à sa place. La lampe t’aide !';
    case 'galerie': return 'Voici tes belles images.';
    default: return 'Bravo !';
  }
}

// ---------- session de jeu ----------
function disposeSession() {
  if (!session) return;
  clearTweens();
  fx.clear();
  for (const m of session.meshes) { sc.world.remove(m); m.geometry.dispose(); }
  sc.world.remove(session.board.group);
  session.board.dispose();
  session.faceMat.dispose();
  session.sideMats.forEach((m) => m.dispose());
  sc.setTilt(0, 0, 1);
  session = null;
}

function frameFor(view, shift) { sc.frame(view, shift); }

// Attend l'image réelle (8 s maximum) derrière un petit chargeur, puis lance fn.
function launch(id, fn) {
  if (isLoaded(id)) { fn(); return Promise.resolve(); }
  const el = document.getElementById('loader');
  el.classList.remove('hidden');
  return whenReady(id).then(() => { el.classList.add('hidden'); fn(); });
}

function startGame(level, imageIdx, { viewer = false } = {}) {
  disposeSession();
  selectedLevel = level;
  const cfg = LEVELS[level];
  const imageId = IMAGES[((imageIdx % IMAGES.length) + IMAGES.length) % IMAGES.length].id;
  const seed = Math.floor(Math.random() * 1e9);
  const puzzle = buildPuzzle(cfg.cols, cfg.rows, seed);
  const game = createGame({ level, imageId, seed, rotation: rotationOn });
  const board = { cols: cfg.cols, rows: cfg.rows };
  ui.show(viewer ? 'vue' : 'jeu');
  sc.resize();
  sc.setCenter(cfg.cols / 2, cfg.rows / 2);
  const view = fitView(viewer ? 0 : cfg.pieces, board, sc.aspect());
  const rng = mulberry32(seed ^ 0x9e3779b9);
  if (viewer) {
    game.pieces.forEach((p) => { p.placed = true; });
    game.done = true;
  } else {
    setPositions(game, scatter(cfg.pieces, board, view, rng), rng);
  }
  const imgAspect = imageAspect(imageId);
  const tex = getTexture(imageId);
  const faceMat = makeFaceMaterial(tex);
  const sideMats = makeSideMaterials();
  const meshes = puzzle.pieces.map((p) => {
    const m = createPieceMesh(p, createPieceGeometry(p, { cols: cfg.cols, rows: cfg.rows, imgAspect }), faceMat, sideMats);
    const gp = game.pieces[p.id];
    m.position.set(gp.pos[0], gp.pos[1], 0);
    m.rotation.z = (gp.rot * Math.PI) / 2;
    m.userData.angle = m.rotation.z;
    sc.world.add(m);
    return m;
  });
  const bd = createBoard(puzzle, tex, imgAspect);
  sc.world.add(bd.group);
  session = {
    game, puzzle, meshes, board: bd, faceMat, sideMats, view, boardDim: board, imageIdx: IMAGES.findIndex((d) => d.id === imageId),
    hintId: null, hintUntil: 0, finished: false, viewer,
  };
  frameFor(view, 0);
  ui.setCount(placedCount(game), cfg.pieces);
  ui.setMessage('');
  if (viewer) { finishVisuals(true); } else { settleAll(); }
  return true;
}

function settleAll() {
  session.meshes.forEach((m, i) => { m.userData.restZ = 0; m.position.z = 0; });
}

function restZFor(id) {
  const m = session.meshes[id];
  let z = 0;
  session.meshes.forEach((o, k) => {
    if (k === id) return;
    if (Math.hypot(o.position.x - m.position.x, o.position.y - m.position.y) < 1.0) z = Math.max(z, o.userData.restZ + 0.26);
  });
  return Math.min(z, 1.2);
}

function getMeshes() {
  if (!session || session.finished) return [];
  return session.meshes.filter((m) => !session.game.pieces[m.userData.id].placed);
}

// ---------- interactions ----------
const drag = createDrag({
  canvas, camera: sc.camera, world: sc.world, getMeshes,
  onStart(id) {
    sfx.unlock();
    const m = session.meshes[id];
    cancelTween(m.userData.posTween);
    m.userData.restZ = 0;
    m.userData.zTween = animate(m.position, { z: LIFT_Z }, 0.12, easeOutCubic);
    animate(m.scale, { x: 1.06, y: 1.06, z: 1.06 }, 0.12);
    sfx.pick();
  },
  onMove(id, pos) {
    const m = session.meshes[id];
    m.position.x = pos.x; m.position.y = pos.y;
  },
  onEnd(id, pos, { tap }) {
    if (!session) return;
    const m = session.meshes[id];
    cancelTween(m.userData.zTween);
    animate(m.scale, { x: 1, y: 1, z: 1 }, 0.15);
    if (tap) {
      m.position.x = session.game.pieces[id].pos[0]; m.position.y = session.game.pieces[id].pos[1];
      if (session.game.rotation) { turnPiece(id); }
      else { m.userData.restZ = restZFor(id); animate(m.position, { z: m.userData.restZ }, 0.15); }
      return;
    }
    dropPiece(id, pos);
  },
});

function turnPiece(id) {
  const { game, meshes } = session;
  const m = meshes[id];
  rotate(game, id);
  m.userData.restZ = restZFor(id);
  cancelTween(m.userData.rotTween);
  m.userData.angle += Math.PI / 2;
  m.userData.rotTween = animate(m.rotation, { z: m.userData.angle }, 0.28, easeOutBack);
  animate(m.position, { z: m.userData.restZ }, 0.2);
}

// Lâcher d'une pièce (glisser réel ou crochet de débogage).
function dropPiece(id, pos) {
  const { game, meshes, puzzle } = session;
  const m = meshes[id];
  const gp = game.pieces[id];
  const res = trySnap(game, id, [pos.x, pos.y], gp.rot);
  if (res.snapped) {
    const [tx, ty] = gp.target;
    cancelTween(m.userData.zTween);
    m.userData.restZ = 0;
    m.userData.posTween = animate(m.position, { x: tx, y: ty, z: 0 }, 0.35, easeOutBack);
    cancelTween(m.userData.rotTween);
    m.userData.angle = Math.round(m.userData.angle / (Math.PI * 2)) * Math.PI * 2;
    m.userData.rotTween = animate(m.rotation, { z: m.userData.angle }, 0.3, easeOutCubic);
    squash(m, 0.12, 0.4);
    sfx.snap();
    fx.sparkle(tx, ty, 0.5);
    meshes.forEach((o, k) => { // pièces libres posées sur la case : on les remonte
      if (k !== id && !game.pieces[k].placed && Math.hypot(o.position.x - tx, o.position.y - ty) < 1.0 && o.userData.restZ < 0.26) {
        o.userData.restZ = 0.26;
        animate(o.position, { z: 0.26 }, 0.2);
      }
    });
    if (session.hintId === id) clearHint();
    ui.setCount(placedCount(game), game.pieces.length);
    if (game.done) setTimeout(() => { if (session && session.game === game) finish(); }, 650);
  } else {
    m.position.x = pos.x; m.position.y = pos.y;
    const v = session.view;
    if (!inView({ x: pos.x, y: pos.y }, session.boardDim, v)) {
      const c = clampToView({ x: pos.x, y: pos.y }, session.boardDim, v);
      m.position.x = c.x; m.position.y = c.y;
    }
    gp.pos = [m.position.x, m.position.y];
    m.userData.restZ = restZFor(id);
    m.userData.posTween = animate(m.position, { z: m.userData.restZ }, 0.2, easeOutCubic);
    sfx.soft();
    const help = needsHelp(game);
    if (help !== null && session.hintId === null) {
      game.missCount[help] = 0;
      showHintFor(help);
    }
  }
  return res.snapped;
}

function showHintFor(id) {
  session.hintId = id;
  session.hintUntil = clock + 6;
  session.board.showHint(session.puzzle.pieces[id]);
  sfx.hint();
}
function clearHint() {
  if (!session) return;
  if (session.hintId !== null) {
    const m = session.meshes[session.hintId];
    m.scale.set(1, 1, 1);
    if (!session.game.pieces[session.hintId].placed) animate(m.position, { z: m.userData.restZ }, 0.15);
  }
  session.hintId = null;
  session.board.hideHint();
}

function hint() {
  if (!session || session.finished || session.viewer) return false;
  const id = nextHint(session.game);
  if (id === null) return false;
  clearHint();
  showHintFor(id);
  return true;
}

function placeOne() {
  if (!session || session.finished) return false;
  const p = session.game.pieces.find((q) => !q.placed);
  if (!p) return false;
  const m = session.meshes[p.id];
  m.position.set(p.target[0] + 0.1, p.target[1] - 0.05, 0);
  while (session.game.rotation && p.rot !== 0) rotate(session.game, p.id);
  m.userData.angle = 0; m.rotation.z = 0;
  return dropPiece(p.id, { x: p.target[0] + 0.1, y: p.target[1] - 0.05 });
}

function solveAll() {
  if (!session || session.finished) return false;
  while (session.game.pieces.some((q) => !q.placed)) placeOne();
  return true;
}

// ---------- fin de partie ----------
function finishVisuals(instant) {
  session.finished = true;
  session.board.reveal(instant ? 0 : 0.8, (d, fn) => tween({ duration: d, update: fn }));
  const { cols, rows } = session.boardDim;
  const base = session.view;
  const finView = { width: cols + 1.6, height: rows + (session.viewer ? 1.6 : 3) };
  const asp = sc.aspect();
  if (finView.width / finView.height < asp) finView.width = finView.height * asp; else finView.height = finView.width / asp;
  session.finView = finView;
  if (instant) { frameFor(finView, session.viewer ? 0 : -0.1); return; }
  const from = { ...base };
  tween({ duration: 0.9, ease: easeInOutQuad, update: (e) => {
    frameFor({ width: lerp(from.width, finView.width, e), height: lerp(from.height, finView.height, e) }, lerp(0, -0.1, e));
  } });
}

function finish() {
  const g = session.game;
  const s = stars(g);
  progress = recordWin(progress, g.level, g.imageId, s);
  saveProgress();
  finishVisuals(false);
  clearHint();
  sfx.win();
  const { cols, rows } = session.boardDim;
  [[0.2, 0.2], [0.8, 0.25], [0.5, 0.8], [0.15, 0.75], [0.85, 0.8]].forEach(([fx_, fy_], i) => {
    setTimeout(() => session && fx.confetti(fx_ * cols, fy_ * rows, 0.8), i * 180);
  });
  ui.setFinStars(s);
  setTimeout(() => { if (session && session.game === g) { ui.show('fin'); } }, 900);
}

// ---------- boucle ----------
function tick(now) {
  const dt = Math.min(0.05, (now - (tick.last || now)) / 1000);
  tick.last = now;
  clock += dt;
  updateTweens(dt);
  fx.update(dt);
  if (session) {
    session.board.update(clock);
    if (session.hintId !== null) {
      const id = session.hintId, m = session.meshes[id];
      if (session.game.pieces[id].placed || clock > session.hintUntil) clearHint();
      else if (drag.isDragging() !== id) {
        const b = Math.abs(Math.sin(clock * 7));
        m.position.z = m.userData.restZ + b * 0.45;
        const w = (1 - b) * 0.05;
        m.scale.set(1 + w, 1 + w, 1 - w);
      }
    }
    if (session.finished) {
      pointer.sx += (pointer.x - pointer.sx) * 0.08;
      pointer.sy += (pointer.y - pointer.sy) * 0.08;
      const ry = pointer.sx * 0.28 + Math.sin(clock * 0.8) * 0.07;
      const rx = -pointer.sy * 0.2 + Math.sin(clock * 0.6 + 1) * 0.05;
      sc.setTilt(rx, ry, 1);
    }
  }
  sc.render();
}
window.addEventListener('pointermove', (e) => {
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
});

function onResize() {
  sc.resize();
  if (!session) return;
  if (session.finished) { frameFor(session.finView, session.viewer ? 0 : -0.1); return; }
  const n = session.game.pieces.length;
  const view = fitView(n, session.boardDim, sc.aspect());
  session.view = view;
  const loose = session.game.pieces.filter((p) => !p.placed);
  if (loose.some((p) => !inView({ x: session.meshes[p.id].position.x, y: session.meshes[p.id].position.y }, session.boardDim, view))) {
    const pos = scatter(loose.length, session.boardDim, view, mulberry32(session.game.seed));
    loose.forEach((p, i) => {
      p.pos = [pos[i].x, pos[i].y];
      const m = session.meshes[p.id];
      m.position.x = pos[i].x; m.position.y = pos[i].y; m.position.z = 0; m.userData.restZ = 0;
    });
  }
  frameFor(view, 0);
}
window.addEventListener('resize', onResize);

// ---------- navigation ----------
function go(name) {
  stopSpeech();
  if (name === 'paliers') ui.renderLevels(progress, (i) => { sfx.click(); selectedLevel = i; go('images'); });
  if (name === 'images') ui.renderImages(selectedLevel, progress, (i) => { sfx.click(); const lv = selectedLevel; launch(IMAGES[i].id, () => startGame(lv, i)); });
  if (name === 'galerie') ui.renderGallery(progress, (lv, id) => { sfx.click(); launch(id, () => startGame(lv, IMAGES.findIndex((d) => d.id === id), { viewer: true })); });
  if (name !== 'jeu' && name !== 'fin' && name !== 'vue' && session) disposeSession();
  ui.show(name);
  if (name === 'paliers') ui.setRotationLabel(rotationOn);
}

document.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => { sfx.click(); go(b.dataset.go); }));
document.querySelectorAll('[data-speak]').forEach((b) => b.addEventListener('click', () => { sfx.click(); speak(instruction(ui.currentScreen())); }));
$('#rot-toggle').addEventListener('click', () => { sfx.click(); rotationOn = !rotationOn; ui.setRotationLabel(rotationOn); });
$('#btn-quit').addEventListener('click', () => { sfx.click(); go('images'); });
$('#btn-hint').addEventListener('click', () => { sfx.click(); hint(); });
$('#btn-gallery').addEventListener('click', () => { sfx.click(); go('galerie'); });
$('#btn-again').addEventListener('click', () => { sfx.click(); startGame(selectedLevel, session ? session.imageIdx + 1 : 0); });
$('#btn-vue-back').addEventListener('click', () => { sfx.click(); go('galerie'); });

// ---------- crochet de débogage ----------
window.__puzzle = {
  state() {
    const g = session && session.game;
    return {
      screen: ui.currentScreen(),
      level: g ? g.level : null, imageId: g ? g.imageId : null,
      total: g ? g.pieces.length : 0, placed: g ? placedCount(g) : 0,
      done: g ? g.done : false, finished: session ? session.finished : false,
      hintsUsed: g ? g.hintsUsed : 0, moves: g ? g.moves : 0, stars: g && g.done ? stars(g) : null,
      rotation: g ? g.rotation : rotationOn, viewer: session ? session.viewer : false,
      progress: JSON.parse(serialize(progress)),
    };
  },
  // Synchrone si l'image est déjà chargée ; sinon renvoie une Promise (attend l'image, 8 s maximum).
  start(level = 0, imageIdx = 0) { const id = IMAGES[((imageIdx % IMAGES.length) + IMAGES.length) % IMAGES.length].id; return isLoaded(id) ? startGame(level, imageIdx) : launch(id, () => startGame(level, imageIdx)); },
  // Position écran (px CSS) du centre de chaque pièce libre et de sa case cible (débogage / tests tactiles).
  screenPoints() {
    if (!session) return [];
    const r = canvas.getBoundingClientRect();
    const px = (x, y) => {
      const v = session.meshes[0].position.clone().set(x, y, 0);
      sc.world.localToWorld(v); v.project(sc.camera);
      return { x: Math.round(r.left + ((v.x + 1) / 2) * r.width), y: Math.round(r.top + ((1 - v.y) / 2) * r.height) };
    };
    return session.game.pieces.map((p, id) => {
      const m = session.meshes[id];
      return { id, placed: p.placed, ...px(m.position.x, m.position.y), target: px(p.target[0], p.target[1]) };
    });
  },
  placeOne,
  solveAll,
  hint,
  screen(name) {
    if (name === 'jeu' && !session) return startGame(selectedLevel, 0);
    if ((name === 'fin') && !(session && session.finished && !session.viewer)) {
      startGame(selectedLevel, 0); solveAll(); ui.show('fin'); return true;
    }
    if (name === 'vue' && !(session && session.viewer)) {
      const g0 = progress.gallery[0];
      return g0 ? startGame(g0.level, IMAGES.findIndex((d) => d.id === g0.imageId), { viewer: true }) : startGame(selectedLevel, 0, { viewer: true });
    }
    go(name);
    return ui.currentScreen() === name;
  },
};

// ---------- démarrage ----------
(async function init() {
  await loadTitle();
  const t = getTitleUrl();
  if (t) $('#s-accueil').style.backgroundImage = `url("${t}")`;
  sc.resize();
  sc.renderer.setAnimationLoop(tick);
  ui.show('accueil');
})();
