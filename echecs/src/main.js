// Orchestration : partie, robot (Worker), entrées, rythme, crochet de débogage window.__echecs.
import {
  newGame, play, undo, status, legalMoves, legalMovesFrom, toFEN, fromFEN, name as sqName, piecesEnPrise, inCheck,
} from './logic/chess.js';
import { chooseMove } from './logic/bot.js';
import { resolveSetup, isBotSeat, humanColors, viewColor, countHumans } from './logic/setup.js';
import { createScene } from './render/scene.js';
import { sfx } from './ui/audio.js';
import { speak, stopSpeech } from './ui/speech.js';
import { loadImage } from './ui/images.js';
import { $, toast, show, hide, setPlayers, renderHistory, initHome } from './ui/ui.js';

export const BOT_PACE = 1250; // rythme du robot (ms) : humains jamais ralentis
const NOMS = { P: 'pion', N: 'cavalier', B: 'fou', R: 'tour', Q: 'dame', K: 'roi' };
const POSS = { P: 'ton', N: 'ton', B: 'ton', R: 'ta', Q: 'ta', K: 'ton' };
const RULES = "Les blancs commencent. Touche une pièce, puis une case verte pour la déplacer, ou fais-la glisser. " +
  "Protège ton roi : s'il est attaqué, c'est un échec et il faut le sauver. Si le roi ne peut plus s'échapper, c'est échec et mat, et la partie est gagnée.";

const scene = createScene($('c'));
let setup = null, game = null, mode = 'home';
let fast = false, gen = 0, thinking = false, busy = false, promoOpen = false;
let sel = -1, lastMove = null, seed = 1;

// ---------- robot : Worker, repli sur le fil principal ----------
let worker = null, workerFailed = false, reqId = 0;
const pending = new Map();
function fallbackBot(args) {
  return new Promise((resolve) => setTimeout(() => resolve(chooseMove(args.fen, args.level, args.seed, { timeMs: args.timeMs })), 30));
}
function initWorker() {
  try {
    worker = new Worker(new URL('./logic/worker.js', import.meta.url), { type: 'module' });
    worker.onmessage = (e) => {
      const p = pending.get(e.data.id);
      if (!p) return;
      pending.delete(e.data.id);
      clearTimeout(p.timer);
      if (e.data.error) fallbackBot(p.args).then(p.resolve); else p.resolve(e.data.move);
    };
    worker.onerror = () => {
      workerFailed = true;
      for (const [id, p] of pending) { pending.delete(id); clearTimeout(p.timer); fallbackBot(p.args).then(p.resolve); }
    };
  } catch { workerFailed = true; }
}
function askBot(fen, level, sd, timeMs) {
  const args = { fen, level, seed: sd, timeMs };
  if (!worker && !workerFailed) initWorker();
  if (workerFailed || !worker) return fallbackBot(args);
  return new Promise((resolve) => {
    const id = ++reqId;
    const timer = setTimeout(() => { pending.delete(id); fallbackBot(args).then(resolve); }, timeMs + 6000);
    pending.set(id, { resolve, args, timer });
    worker.postMessage({ id, ...args });
  });
}

const sleep = (ms) => (fast || ms <= 0 ? Promise.resolve() : new Promise((r) => setTimeout(r, ms)));

// ---------- affichage ----------
function kingSq(color) { return game.pos.king[color]; }
function highlights() {
  const h = { last: lastMove ? [lastMove.from, lastMove.to] : [], legal: [], selected: sel, check: -1, danger: [] };
  if (inCheck(game.pos)) h.check = kingSq(game.pos.turn);
  if (sel >= 0) {
    const seen = new Set();
    for (const m of legalMovesFrom(game.pos, sel)) {
      if (seen.has(m.to)) continue;
      seen.add(m.to);
      h.legal.push({ sq: m.to, capture: !!m.captured });
    }
  }
  if (dangerSqs.length && sel < 0) h.danger = dangerSqs;
  return h;
}
let dangerSqs = [];
function refreshView() {
  scene.setHighlights(highlights());
  const st = status(game);
  setPlayers(setup, game.pos.turn, st.over);
  renderHistory(game.history.map((h) => h.san), fromFEN(game.startFen).fullmove, fromFEN(game.startFen).turn);
  updateButtons();
}
function updateButtons() {
  const humans = countHumans(setup || { seats: { w: { type: 'bot' }, b: { type: 'bot' } } });
  $('btn-undo').disabled = !(mode === 'play' && game && game.history.length && !thinking && !busy && humans > 0);
}
const isHumanTurn = () => mode === 'play' && game && !status(game).over && !isBotSeat(setup, game.pos.turn);
const canInteract = () => isHumanTurn() && !busy && !promoOpen && !thinking;

function updateOrientation(animate = true) {
  scene.setOrientation(setup.rotate ? game.pos.turn : viewColor(setup), animate);
}

// ---------- flux de partie ----------
function startGame(cfg, fen) {
  gen++;
  fast = false; thinking = false; busy = false; promoOpen = false; sel = -1; lastMove = null; dangerSqs = [];
  stopSpeech();
  seed = (Math.random() * 2147483647) | 0;
  setup = resolveSetup(cfg);
  game = newGame(fen);
  mode = 'play';
  hide('home'); hide('end'); hide('promo');
  scene.sync(game.pos.board);
  updateOrientation(false);
  refreshView();
  toast(`${setup.seats.w.name} (blancs) commence`, '', 2200);
  next();
}

function next() {
  if (mode !== 'play') return;
  const st = status(game);
  if (st.over) return endGame(st);
  const color = game.pos.turn;
  updateOrientation(true);
  if (isBotSeat(setup, color)) { botTurn(); return; }
  // tour d'un humain : conseils
  dangerSqs = [];
  if (st.check) { toast(color === viewColor(setup) || countHumans(setup) === 2 ? 'Échec ! Protège ton roi' : 'Échec !', 'alert', 2600); }
  if (setup.level === 1 && countHumans(setup) === 1) {
    const risk = piecesEnPrise(game.pos, color);
    if (risk.length) {
      dangerSqs = risk;
      const best = risk.map((s) => [s, game.pos.board[s][1]]).sort((a, b) => 'PNBRQ'.indexOf(b[1]) - 'PNBRQ'.indexOf(a[1]))[0];
      if (!st.check) toast(`Attention : ${POSS[best[1]]} ${NOMS[best[1]]} (${sqName(best[0])}) est en danger`, 'warn', 3600);
    }
  }
  scene.setHighlights(highlights());
}

async function botTurn() {
  if (thinking) return;
  const my = gen, color = game.pos.turn;
  thinking = true; updateButtons();
  const t0 = performance.now();
  let move = null;
  try { move = await askBot(toFEN(game.pos), setup.level, seed + game.history.length, fast ? 120 : 1500); } catch { move = null; }
  const wait = fast ? 0 : Math.max(0, BOT_PACE - (performance.now() - t0));
  if (wait) await sleep(wait);
  if (my !== gen) return;
  thinking = false;
  // le robot ne joue jamais pour une place humaine
  if (mode !== 'play' || game.pos.turn !== color || !isBotSeat(setup, color) || !move) { updateButtons(); return; }
  await doMove(move.from, move.to, move.promo);
}

async function doMove(from, to, promo, { viaDrag = false } = {}) {
  const my = gen;
  const res = play(game, { from, to, promo });
  if (!res.ok) return false;
  const bot = isBotSeat(setup, res.move.piece[0]);
  sel = -1; dangerSqs = []; lastMove = res.move; busy = true;
  updateButtons();
  const st0 = status(game);
  if (res.move.promo) sfx.promote(); else if (res.move.captured) sfx.capture(); else sfx.move();
  await scene.animateMove(res.move, { instant: fast || viaDrag });
  if (my !== gen) return true;
  scene.sync(game.pos.board);
  busy = false;
  refreshView();
  if (st0.check && !st0.over) { sfx.check(); toast('Échec !', 'alert', 1800); }
  else if (bot && !st0.over) toast(`${setup.seats[res.move.piece[0]].name} : ${res.san}`, '', 1800);
  next();
  return true;
}

function endGame(st) {
  mode = 'play';
  refreshView();
  const colorName = { w: 'blancs', b: 'noirs' };
  let title, sub, emoji;
  if (st.reason === 'mat') {
    const w = st.result === '1-0' ? 'w' : 'b';
    title = 'Échec et mat !';
    sub = `${setup.seats[w].name} (${colorName[w]}) gagne la partie.`;
    emoji = '🏆';
    const humanWon = !isBotSeat(setup, w);
    if (humanWon) sfx.win(); else sfx.lose();
  } else {
    emoji = '🤝'; sfx.draw();
    title = { pat: 'Pat : partie nulle', repetition: 'Nulle par répétition', '50coups': 'Nulle : règle des 50 coups', materiel: 'Nulle : matériel insuffisant' }[st.reason];
    sub = { pat: "Le roi n'a aucun coup mais n'est pas en échec.", repetition: 'La même position est apparue trois fois.',
      '50coups': 'Cinquante coups sans prise ni pion.', materiel: "Il n'y a plus assez de pièces pour mater." }[st.reason];
  }
  $('end-emoji').textContent = emoji; $('end-title').textContent = title; $('end-sub').textContent = sub;
  const my = gen;
  sleep(fast ? 0 : 900).then(() => { if (my === gen && status(game).over) show('end'); });
}

// ---------- entrées : toucher-toucher et glisser-déposer ----------
const canvas = $('c');
let down = null;
const isOwn = (s) => s >= 0 && game.pos.board[s] && game.pos.board[s][0] === game.pos.turn;

function select(s) {
  sel = s;
  if (s >= 0) sfx.select();
  scene.setHighlights(highlights());
}
async function attempt(from, to, viaDrag) {
  const ms = legalMovesFrom(game.pos, from).filter((m) => m.to === to);
  if (!ms.length) return false;
  if (ms[0].promo) {
    promoOpen = true; show('promo');
    const p = await new Promise((resolve) => { promoResolve = resolve; });
    promoOpen = false; hide('promo');
    if (!p) { scene.setHighlights(highlights()); return false; }
    return doMove(from, to, p, { viaDrag });
  }
  return doMove(from, to, undefined, { viaDrag });
}
let promoResolve = null;
document.querySelectorAll('.pbtn').forEach((b) => b.addEventListener('click', () => promoResolve && promoResolve(b.dataset.p)));
$('btn-promo-cancel').addEventListener('click', () => promoResolve && promoResolve(null));

canvas.addEventListener('pointerdown', (e) => {
  if (!canInteract()) return;
  const s = scene.pickSquare(e.clientX, e.clientY);
  if (s < 0) { select(-1); return; }
  canvas.setPointerCapture(e.pointerId);
  down = { s, x: e.clientX, y: e.clientY, drag: false, own: isOwn(s), wasSel: sel === s };
  if (sel >= 0 && !down.own && legalMovesFrom(game.pos, sel).some((m) => m.to === s)) {
    const from = sel; down = null; attempt(from, s, false); return;
  }
  if (down.own) { if (!down.wasSel) select(s); }
  else { if (sel >= 0) sfx.oops(); select(-1); down = null; }
});
canvas.addEventListener('pointermove', (e) => {
  if (!down || !down.own) return;
  if (!down.drag && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 10) {
    if (sel !== down.s) select(down.s);
    down.drag = scene.dragStart(down.s);
  }
  if (down.drag) scene.dragMove(e.clientX, e.clientY);
});
function release(e, cancel) {
  if (!down) return;
  const d = down; down = null;
  if (d.drag) {
    const to = cancel ? -1 : scene.pickSquare(e.clientX, e.clientY);
    scene.dragEnd();
    if (to >= 0 && to !== d.s && legalMovesFrom(game.pos, d.s).some((m) => m.to === to)) attempt(d.s, to, true);
    else if (to >= 0 && to !== d.s) { sfx.oops(); }
  } else if (d.own && d.wasSel) select(-1);
}
canvas.addEventListener('pointerup', (e) => release(e, false));
canvas.addEventListener('pointercancel', (e) => release(e, true));

// ---------- boutons ----------
function undoMove() {
  if (!(mode === 'play' && game.history.length && !thinking && !busy)) return;
  gen++; // annule d'éventuelles tâches en attente
  undo(game);
  if (isBotSeat(setup, game.pos.turn) && countHumans(setup) === 1 && game.history.length) undo(game);
  const h = game.history[game.history.length - 1];
  lastMove = h ? h.move : null;
  sel = -1; dangerSqs = []; hide('end'); toast('');
  scene.sync(game.pos.board);
  refreshView();
  next();
}
$('btn-undo').addEventListener('click', undoMove);
$('btn-new').addEventListener('click', () => { if (lastCfg) startGame(lastCfg); else showHome(); });
$('btn-moves').addEventListener('click', () => {
  const o = $('history').classList.toggle('open');
  $('btn-moves').setAttribute('aria-expanded', o);
  $('btn-moves').textContent = o ? 'Coups ▴' : 'Coups ▾';
});
function showHome() {
  home.setResume(mode === 'play' && !!game);
  show('home'); hide('end');
}
$('btn-menu').addEventListener('click', showHome);
$('btn-home').addEventListener('click', showHome);
$('btn-view').addEventListener('click', () => hide('end'));
$('btn-again').addEventListener('click', () => startGame(lastCfg));
let lastCfg = null;
const home = initHome({
  onPlay(cfg) { lastCfg = cfg; startGame(cfg); },
  onResume() { hide('home'); },
  onRules() { if (!speak(RULES)) toast(RULES, '', 6000); },
});
loadImage('titre').then((img) => home.setHero(img));

// ---------- taille ----------
new ResizeObserver(() => scene.resize()).observe($('stage'));
window.addEventListener('resize', () => scene.resize());
window.addEventListener('orientationchange', () => setTimeout(() => scene.resize(), 150));
scene.resize();

// état initial : plateau de départ visible derrière l'accueil
setup = resolveSetup({});
game = newGame();
scene.sync(game.pos.board);
setPlayers(setup, 'w', false);
renderHistory([]);
updateButtons();
mode = 'home';

// ---------- crochet de débogage ----------
function snapshot() {
  const st = game ? status(game) : {};
  return {
    mode, fen: toFEN(game.pos), turn: game.pos.turn, over: !!st.over, result: st.result, reason: st.reason, check: !!st.check,
    moves: game.history.map((h) => h.san), seats: setup && setup.seats, level: setup && setup.level, rotate: setup && setup.rotate,
    fast, thinking, busy, selected: sel,
  };
}
window.__echecs = {
  state: snapshot,
  fen: () => toFEN(game.pos),
  async play(from, to, promo) {
    const f = typeof from === 'string' ? sqIndex(from) : from, t = typeof to === 'string' ? sqIndex(to) : to;
    if (mode !== 'play') return false;
    gen++; thinking = false; busy = false;
    const ok = await doMove(f, t, promo);
    return ok;
  },
  load(fen) { startGame(lastCfg || {}, fen); return snapshot(); },
  start(cfg) { lastCfg = cfg || {}; startGame(lastCfg); return snapshot(); },
  setFast(b) { fast = !!b; return fast; },
  async botMove() {
    if (mode !== 'play' || status(game).over) return null;
    const m = chooseMove(toFEN(game.pos), setup.level, seed + game.history.length, { timeMs: fast ? 120 : 1500 });
    if (!m) return null;
    gen++; thinking = false; busy = false;
    const was = fast; fast = true;
    await doMove(m.from, m.to, m.promo);
    fast = was;
    return game.history[game.history.length - 1].san;
  },
  // Débogage : fait jouer n coups par le robot pour les deux camps, en mode rapide.
  async autoPlay(n = 1) {
    let played = 0;
    for (let i = 0; i < n && mode === 'play' && !status(game).over; i++) {
      if (await this.botMove()) played++;
    }
    return { played, ...snapshot() };
  },
  sqXY(n) { return scene.screenPos(sqIndex(n)); },
  level(n) { if (setup) setup.level = [1, 2, 3].includes(+n) ? +n : setup.level; return setup && setup.level; },
};
function sqIndex(n) { return (n.charCodeAt(0) - 97) + 8 * (n.charCodeAt(1) - 49); }
