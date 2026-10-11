import * as THREE from 'three';
import { createClock3D } from './scene/clock3d.js';
import { createSky } from './scene/sky.js';
import {
  normMinutes, angleDelta, dragMinuteHand, dragHourHand, snap, formatDigital, sayTime, timeToAngles,
} from './logic/clock.js';
import { MOMENTS } from './logic/day.js';
import { LEVELS, makeQuestions, checkAnswer, starsFor, nextLevel } from './logic/levels.js';
import { loadAssets } from './assets.js';
import { easeOutBack, clamp01 } from './easing.js';
import * as audio from './audio.js';
import * as speech from './speech.js';
import * as ui from './ui.js';

const DEBUG = /[?&]debug\b/.test(location.search);
const STORE = 'horloge-magique.etoiles';

// ---------- Mémoire des étoiles ----------
function loadBest() {
  try {
    const a = JSON.parse(localStorage.getItem(STORE) || '[]');
    return LEVELS.map((_, i) => Math.max(0, Math.min(3, Number(a[i]) || 0)));
  } catch (e) { return LEVELS.map(() => 0); }
}
function saveBest(b) { try { localStorage.setItem(STORE, JSON.stringify(b)); } catch (e) { /* ignoré */ } }

// ---------- État ----------
const S = {
  screen: 'home', level: 0, qi: 0, questions: [], errors: 0, t: 360,
  busy: false, best: loadBest(), lastResult: null,
};

// ---------- Rendu three.js ----------
const canvas = document.getElementById('c');
const stage = document.getElementById('stage');
let renderer = null;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 50);
let clock3d = null, sky = null;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 0);
  clock3d = createClock3D(scene);
  sky = createSky(scene, document.getElementById('game'));
} catch (e) {
  console.error('WebGL indisponible', e);
}

function fitCamera() {
  if (!renderer) return;
  const w = stage.clientWidth, h = stage.clientHeight;
  if (w < 10 || h < 10) return;
  renderer.setSize(w, h, false);
  const aspect = w / h;
  camera.aspect = aspect;
  const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const R = clock3d.radius;
  const d = Math.max(R / tanV, R / (tanV * aspect));
  camera.position.set(0, 0.05, d);
  camera.lookAt(0, 0.05, 0);
  camera.updateProjectionMatrix();
  const halfH = (d + 3) * tanV;
  sky.resize(halfH * aspect, halfH, -3);
}
if (window.ResizeObserver) new ResizeObserver(fitCamera).observe(stage);
window.addEventListener('resize', fitCamera);

// ---------- Temps ----------
let tickKey = null;
function setT(t, silent) {
  S.t = normMinutes(t);
  if (clock3d) clock3d.setTime(S.t);
  if (sky) sky.update(S.t);
  if (!silent) {
    const key = Math.floor(S.t / 5);
    if (tickKey !== null && key !== tickKey) audio.tick();
    tickKey = key;
  } else tickKey = Math.floor(S.t / 5);
}

// ---------- Interaction ----------
let drag = null;   // { hand, prev, id }
let snapAnim = null; // { from, delta, start, dur }

function ndc(e) {
  const r = canvas.getBoundingClientRect();
  return { x: ((e.clientX - r.left) / r.width) * 2 - 1, y: -(((e.clientY - r.top) / r.height) * 2 - 1) };
}
function pickHand(p) {
  const a = timeToAngles(S.t);
  const dm = Math.abs(angleDelta(p.angle, a.minute));
  const dh = Math.abs(angleDelta(p.angle, a.hour));
  if (p.r < 0.45 && dh < 0.8) return 'hour';
  if (dh + 0.2 < dm && p.r < 0.95) return 'hour';
  return 'minute';
}
canvas.addEventListener('pointerdown', (e) => {
  audio.unlock();
  if (S.screen !== 'game' || S.busy || !clock3d) return;
  const n = ndc(e);
  const p = clock3d.dialPoint(n.x, n.y, camera);
  if (!p) return;
  snapAnim = null;
  const hand = pickHand(p);
  drag = { hand, prev: p.angle, id: e.pointerId };
  try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignoré */ }
  clock3d.grab(hand);
  e.preventDefault();
});
window.addEventListener('pointermove', (e) => {
  moveTo(e);
});
function moveTo(e) {
  if (!drag || e.pointerId !== drag.id) return;
  const n = ndc(e);
  const p = clock3d.dialPoint(n.x, n.y, camera);
  if (!p || p.r < 0.06) return;
  const fn = drag.hand === 'minute' ? dragMinuteHand : dragHourHand;
  setT(fn(S.t, drag.prev, p.angle));
  drag.prev = p.angle;
  e.preventDefault();
}
function release(e) {
  if (!drag || (e && e.pointerId !== drag.id)) return;
  drag = null;
  clock3d.grab(null);
  startSnap();
}
window.addEventListener('pointerup', (e) => { moveTo(e); release(e); });
window.addEventListener('pointercancel', release);

function currentStep() {
  const q = S.questions[S.qi];
  return q ? q.step : 5;
}
function startSnap(then) {
  const target = snap(S.t, currentStep());
  let delta = target - S.t;
  if (delta > 720) delta -= 1440;
  if (delta < -720) delta += 1440;
  snapAnim = { from: S.t, delta, start: performance.now(), dur: 260, then };
}
function finishSnap() {
  audio.click();
  if (clock3d) clock3d.squash();
  speech.say(sayTime(S.t));
}

// ---------- Boucle ----------
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (snapAnim) {
    const k = clamp01((now - snapAnim.start) / snapAnim.dur);
    setT(snapAnim.from + snapAnim.delta * easeOutBack(k), true);
    if (k >= 1) {
      const a = snapAnim; snapAnim = null;
      setT(a.from + a.delta, true);
      finishSnap();
      if (a.then) a.then();
    }
  }
  if (S.screen === 'game' && renderer && clock3d) {
    clock3d.update(dt);
    renderer.render(scene, camera);
  }
  if (DEBUG) ui.debugText(JSON.stringify(api.state(), null, 1));
}

// ---------- Jeu ----------
function instructionFor(q) {
  if (q.mode === 'digital') return 'Mets les aiguilles comme ici.';
  const m = q.momentId ? MOMENTS.find((x) => x.id === q.momentId) : null;
  return m
    ? `Mets l'horloge à l'heure ${m.de} : ${sayTime(q.target)}`
    : `Mets l'horloge sur ${sayTime(q.target)}.`;
}

function startLevel(i) {
  speech.cancel();
  S.level = i;
  S.questions = makeQuestions(i, Math.random);
  S.qi = 0;
  S.errors = 0;
  S.busy = false;
  S.screen = 'game';
  ui.showScreen('game');
  ui.hideEnd();
  S.t = 360;
  showQuestion();
  fitCamera();
}

function showQuestion() {
  const q = S.questions[S.qi];
  S.busy = false;
  snapAnim = null;
  let t = snap(S.qi === 0 ? 360 : S.t, 60);
  if (checkAnswer(q, t).ok) t = normMinutes(t + 180);
  setT(t, true);
  const m = q.momentId ? MOMENTS.find((x) => x.id === q.momentId) : null;
  ui.setCard(q.mode === 'digital' ? null : m, '🕐');
  document.getElementById('card').classList.toggle('hidden', q.mode === 'digital');
  const txt = instructionFor(q);
  ui.setInstruction(txt);
  ui.setDigital(q.mode === 'digital' ? formatDigital(q.target) : null);
  ui.setProgress(S.qi, S.questions.length);
  speech.say(txt);
}

function doCheck() {
  const q = S.questions[S.qi];
  if (S.screen !== 'game' || !q || S.busy) return null;
  if (drag) return null;
  const res = checkAnswer(q, S.t);
  S.lastResult = res;
  S.busy = true;
  const finish = () => {
    if (res.ok) onSuccess();
    else onMiss(res);
  };
  if (snapAnim) { snapAnim.then = finish; }
  else {
    setT(snap(S.t, q.step), true);
    finish();
  }
  return res;
}

function onSuccess() {
  audio.success();
  ui.confetti(90);
  ui.setProgress(S.qi + 1, S.questions.length);
  speech.say('Bravo !');
  if (clock3d) clock3d.squash();
  setTimeout(() => {
    if (S.screen !== 'game') return;
    S.qi += 1;
    if (S.qi >= S.questions.length) endLevel();
    else showQuestion();
  }, 1600);
}

function onMiss(res) {
  S.errors += 1;
  audio.hint();
  let msg;
  if (res.hint === 'minute') {
    msg = `Presque ! La grande aiguille va sur le ${res.expectedMinuteNumber}.`;
    if (clock3d) clock3d.flashMark(res.expectedMinuteNumber);
  } else {
    msg = 'Presque ! Regarde bien la petite aiguille.';
    if (clock3d) clock3d.pulseHour();
  }
  ui.showBubble((res.hint === 'minute' ? '🤔 ' : '👀 ') + msg, 4500);
  ui.setInstruction(msg);
  setTimeout(() => speech.say(msg), 300);
  setTimeout(() => {
    S.busy = false;
    if (S.screen === 'game' && S.questions[S.qi]) ui.setInstruction(instructionFor(S.questions[S.qi]));
  }, 1800);
}

function endLevel() {
  const n = starsFor(S.errors);
  S.best[S.level] = Math.max(S.best[S.level] || 0, n);
  saveBest(S.best);
  audio.fanfare();
  ui.confetti(220);
  const nx = nextLevel(S.level);
  ui.showEnd({ title: n === 3 ? 'Parfait ! Bravo !' : 'Bravo ! Tu as gagné !', starCount: n, hasNext: nx !== null });
  speech.say(`Bravo ! Tu as ${n} ${n > 1 ? 'étoiles' : 'étoile'}.`);
  S.busy = true;
}

function goHome() {
  speech.cancel();
  S.screen = 'home';
  S.busy = false;
  ui.showScreen('home');
  ui.renderHome(LEVELS, S.best, startLevel);
}

// ---------- Boutons ----------
ui.bind('btnPlay', () => { audio.unlock(); startLevel(0); });
ui.bind('btnHome', goHome);
ui.bind('btnEndHome', goHome);
ui.bind('btnAgain', () => startLevel(S.level));
ui.bind('btnNext', () => { const nx = nextLevel(S.level); startLevel(nx === null ? 0 : nx); });
ui.bind('btnSpeak', () => {
  audio.unlock();
  const q = S.questions[S.qi];
  if (q) speech.say(instructionFor(q));
});
ui.bind('btnCheck', () => { audio.unlock(); doCheck(); });

// ---------- Crochet de débogage ----------
const api = {
  state() {
    const q = S.questions[S.qi] || null;
    return {
      screen: S.screen, level: S.level, qi: S.qi, errors: S.errors, busy: S.busy,
      t: Math.round(S.t * 100) / 100, digital: formatDigital(S.t), say: sayTime(S.t),
      question: q, best: S.best, last: S.lastResult,
    };
  },
  goLevel(i) { startLevel(i); return api.state(); },
  setTime(t) { setT(t, true); return api.state(); },
  check() { return doCheck(); },
  solve() {
    const q = S.questions[S.qi];
    if (!q || S.screen !== 'game') return null;
    S.busy = false;
    setT(q.target, true);
    return doCheck();
  },
};
window.__horloge = api;

// ---------- Démarrage ----------
speech.initSpeech();
ui.debugPanel(DEBUG);
setT(360, true);
ui.renderHome(LEVELS, S.best, startLevel);
loadAssets().then(() => ui.renderHome(LEVELS, S.best, startLevel));
requestAnimationFrame(frame);
