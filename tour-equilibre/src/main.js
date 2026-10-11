import { LEVELS, topOffset } from './logic/levels.js';
import { craneX, craneHeight } from './logic/crane.js';
import { windForce } from './logic/wind.js';
import { towerHeight, hasFallen, isSettled } from './logic/tower.js';
import { createGame } from './logic/game.js';
import { loadProgress, saveProgress, recordWin, isUnlocked } from './logic/progress.js';
import { createScene } from './render/scene.js';
import { createBlockMesh } from './render/blocks.js';
import { createCrane, createWindsock, createCharacters, createConfetti } from './render/props.js';
import { createPhysics } from './physics.js';
import { createUI } from './ui.js';
import { speak } from './speech.js';
import * as audio from './audio.js';

const container = document.getElementById('stage');
const view = createScene(container);
const physics = createPhysics();
const crane = createCrane(view.scene);
const sock = createWindsock(view.scene);
const chars = createCharacters(view.scene);
const confetti = createConfetti(view.scene);

let storage = null;
try { storage = window.localStorage; } catch { storage = null; }
let progress = loadProgress(storage);

let mode = 'title';
let levelIdx = 0, level = null, game = null;
let held = null, pending = null;
let placed = [];
let clock = 0, hookY = 0, camLook = 1.8, curHeight = 0, curCraneX = 0;
let slowmoLeft = 0, fallenShown = false, winTimer = -1;
let debugScale = 1;
let wallT = 0;

const ease = {
  outBack: (x) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
};

const ui = createUI({
  icons: LEVELS.map((l) => l.icon),
  onStart: (i) => { audio.click(); startLevel(i); },
  onHome: () => { audio.click(); goHome(); },
  onSpeak: () => { audio.click(); if (level) speak(level.instruction); },
  onDrop: () => drop(),
  onRetry: () => { audio.click(); retry(); },
  onNext: () => { audio.click(); startLevel(Math.min(levelIdx + 1, LEVELS.length - 1)); },
});

function goHome() {
  mode = 'title';
  audio.stopWind();
  clearBlocks();
  container.style.visibility = 'hidden';
  ui.showTitle(progress, isUnlocked, LEVELS.length);
}

function clearBlocks() {
  for (const b of placed) view.scene.remove(b.mesh);
  placed = [];
  if (pending) { view.scene.remove(pending.mesh); pending = null; }
  if (held) { view.scene.remove(held.mesh); held = null; }
  physics.clearBlocks();
}

function startLevel(i) {
  clearBlocks();
  levelIdx = i;
  level = LEVELS[i];
  game = createGame(i, (Date.now() & 0xffffff) + i);
  physics.setLevel(level);
  view.setLevel(level);
  chars.setTarget(level.targetHeight);
  chars.setCheer(false);
  sock.group.visible = !!level.wind;
  mode = 'play';
  container.style.visibility = 'visible';
  clock = 0; curHeight = 0; hookY = craneHeight(0); camLook = 1.8;
  slowmoLeft = 0; fallenShown = false; winTimer = -1;
  ui.showGame(i, level);
  ui.setProgress(0, level.targetHeight);
  audio.stopWind();
  if (level.wind) audio.startWind();
  spawnHeld();
}

function spawnHeld() {
  const mesh = createBlockMesh(game.currentShape);
  mesh.scale.setScalar(0.01);
  view.scene.add(mesh);
  mesh.position.set(curCraneX, hookY - 0.25 - topOffset(game.currentShape), 0);
  held = { mesh, shape: game.currentShape, age: 0 };
}

function drop() {
  if (mode !== 'play' || !game || game.state !== 'aiming' || !held || ui.isModalOpen()) return;
  game.drop();
  const m = held.mesh;
  m.scale.setScalar(1);
  // Position calculée depuis la grue : le maillage peut ne pas encore être placé (tap rapide).
  m.position.set(curCraneX, hookY - 0.25 - topOffset(held.shape), 0);
  m.rotation.set(0, 0, 0);
  const body = physics.addBlock(held.shape, m.position.x, m.position.y);
  const rec = { mesh: m, body, shape: held.shape, touched: false, elapsed: 0, settle: 0, lastPop: -1 };
  body.addEventListener('collide', (e) => {
    rec.touched = true;
    const v = Math.abs(e.contact.getImpactVelocityAlongNormal());
    if (v > 1 && wallT - rec.lastPop > 0.25) {
      rec.lastPop = wallT;
      m.userData.sq = 0;
      audio.pop(Math.max(0, body.position.y));
    }
  });
  pending = rec;
  held = null;
  audio.whoosh();
}

function retry() {
  clearBlocks();
  game.retry();
  curHeight = 0; slowmoLeft = 0; fallenShown = false;
  ui.hideModal();
  ui.setProgress(0, level.targetHeight);
  spawnHeld();
}

function finishWin() {
  mode = 'play';
  game.state = 'won';
  const stars = game.stars();
  progress = recordWin(progress, levelIdx, stars);
  saveProgress(storage, progress);
  chars.setCheer(true);
  confetti.burst(0, level.targetHeight + 0.5);
  audio.stopWind();
  audio.win();
  winTimer = 1.3;
  ui.setProgress(level.targetHeight, level.targetHeight);
}

const syncMesh = (m, b) => { m.position.copy(b.position); m.quaternion.copy(b.quaternion); };

function squash(m, dt) {
  if (m.userData.sq === undefined) return;
  m.userData.sq += dt;
  const t = m.userData.sq;
  if (t > 0.8) { m.scale.set(1, 1, 1); m.userData.sq = undefined; return; }
  const k = Math.exp(-6 * t) * Math.cos(18 * t);
  m.scale.set(1 + 0.09 * k, 1 - 0.18 * k, 1 + 0.09 * k);
}

function aabbs(extra) {
  const list = placed.map((b) => physics.aabbOf(b.body));
  if (extra) list.push(physics.aabbOf(extra.body));
  return list;
}

function onFell() {
  game.fell();
  if (pending) { placed.push(pending); pending = null; }
  slowmoLeft = 2;
  audio.stopWind();
  audio.fall();
}

function update(dt) {
  const dts = dt * debugScale;
  clock += dts;
  wallT += dt;
  const phys = game.state === 'fallen' ? (slowmoLeft > 0 ? 0.3 : 0.15) : 1;

  // Grue et bloc tenu
  curCraneX = craneX(clock, level.crane);
  hookY += (craneHeight(curHeight) - hookY) * Math.min(1, dts * 3);
  if (held) {
    held.age += dts;
    const m = held.mesh;
    m.position.set(curCraneX, hookY - 0.25 - topOffset(held.shape), 0);
    m.rotation.set(0, 0, 0);
    if (held.age < 0.35) m.scale.setScalar(Math.max(0.01, ease.outBack(held.age / 0.35)));
    else m.scale.setScalar(1);
  }
  crane.update(curCraneX, hookY);

  // Physique
  const eff = dts * phys;
  physics.step(eff, Math.min(40, Math.max(3, Math.ceil(eff * 120) + 1)));
  const pb = physics.platformBody;
  view.platform.position.copy(pb.position);
  view.platform.quaternion.copy(pb.quaternion);
  if (pending) syncMesh(pending.mesh, pending.body);
  for (const b of placed) syncMesh(b.mesh, b.body);
  if (pending) squash(pending.mesh, dt);
  for (const b of placed) squash(b.mesh, dt);

  // Hauteur de la tour (blocs posés)
  if (game.state !== 'fallen') {
    curHeight = towerHeight(aabbs(), 0);
    ui.setProgress(curHeight, level.targetHeight);
  }

  // Logique de jeu
  if (game.state === 'dropping' || game.state === 'aiming') {
    if (placed.length && hasFallen(aabbs(), 0)) onFell();
  }
  if (game.state === 'dropping' && pending) {
    const p = pending;
    const box = physics.aabbOf(p.body);
    p.elapsed += dts;
    if (box.bottom < -0.3) {
      // le bloc lâché a raté la tour
      view.scene.remove(p.mesh);
      physics.removeBody(p.body);
      pending = null;
      game.missed();
      audio.oops();
      ui.toast('Oups ! On réessaie 💪');
      spawnHeld();
    } else {
      const speeds = [physics.speedOf(p.body), ...placed.map((b) => physics.speedOf(b.body))];
      if (p.touched && isSettled(speeds, 0.08)) p.settle += dts; else p.settle = 0;
      if (p.settle >= 0.4 || p.elapsed >= 4) {
        placed.push(p);
        pending = null;
        const h = towerHeight(aabbs(), 0);
        curHeight = h;
        game.landed(h);
        ui.setProgress(h, level.targetHeight);
        if (game.state === 'won') finishWin();
        else spawnHeld();
      }
    }
  }

  // Chute de la tour : ralenti puis fenêtre
  if (game.state === 'fallen') {
    if (slowmoLeft > 0) slowmoLeft -= dt;
    else if (!fallenShown) { fallenShown = true; ui.showFallen(); }
  }
  if (winTimer > 0) {
    winTimer -= dt;
    if (winTimer <= 0) ui.showWin(game.stars(), levelIdx < LEVELS.length - 1);
  }

  // Décors animés
  const f = windForce(physics.time, level.wind);
  if (level.wind) {
    sock.update(f, level.wind.strength);
    if (game.state !== 'won' && game.state !== 'fallen') audio.setWind(f / level.wind.strength);
  }
  chars.update(wallT, dt);
  confetti.update(dt);
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(1 / 20, Math.max(0, (now - last) / 1000));
  last = now;
  if (mode === 'play' && game) {
    update(dt);
    camLook += ((1.8 + 0.55 * curHeight) - camLook) * Math.min(1, dt * 2);
    view.update(wallT, camLook);
    view.render();
  }
  requestAnimationFrame(frame);
}

// Entrées
view.renderer.domElement.addEventListener('pointerdown', (e) => { e.preventDefault(); drop(); });
window.addEventListener('keydown', (e) => { if (e.code === 'Space') { e.preventDefault(); drop(); } });
window.addEventListener('keyup', (e) => { if (e.code === 'Space') e.preventDefault(); });
window.addEventListener('contextmenu', (e) => e.preventDefault());
const unlockOnce = () => audio.unlock();
window.addEventListener('pointerdown', unlockOnce, true);
window.addEventListener('keydown', unlockOnce, true);

if (new URLSearchParams(location.search).has('debug')) {
  window.__game = {
    startLevel: (i) => startLevel(i),
    drop: () => drop(),
    get state() { return game ? game.state : null; },
    get height() { return curHeight; },
    get craneX() { return curCraneX; },
    setTimeScale: (s) => { debugScale = s; },
    win: () => { if (game && game.state !== 'won') finishWin(); },
    get blocks() { return [...placed, ...(pending ? [pending] : [])].map((b) => ({ shape: b.shape, y: b.body.position.y, v: physics.speedOf(b.body) })); },
  };
}

goHome();
requestAnimationFrame(frame);
