import { mulberry32 } from './logic/rng.js';
import { newGame, legalMoves, applyMove, mustCapture, capturingPieces, pieceCount, findMove, VARIANTS } from './logic/rules.js';
import { chooseMove } from './logic/bot.js';
import { whoActs, humanCount, shouldFlip, undoTarget, finalTargets, ambiguity } from './logic/turns.js';
import { createScene } from './render/scene.js';
import { $, toast, hideToast, confetti, normalizeSeats, renderSeats, bindSeats } from './ui/ui.js';
import { speak, stopSpeech } from './ui/speech.js';
import { sfx } from './ui/audio.js';

// Rythme du robot : un coup n'apparaît jamais avant BOT_PACE secondes (calcul compris). Les humains ne sont jamais ralentis.
const BOT_PACE = 1.4;
const SIDE_NAME = { white: 'Blancs', black: 'Rouges' };
const RULES = 'On avance ses pions en diagonale, d\'une case. Quand on peut sauter par-dessus un pion de l\'autre camp, on doit le prendre, et on peut en prendre plusieurs d\'un seul coup. Un pion qui arrive tout au bout du damier devient une dame, qui est plus forte. Celui qui n\'a plus de pièce, ou qui ne peut plus bouger, a perdu.';

const settings = {
  variant: 'international', level: 1,
  seats: { white: { type: 'human', name: 'Toi', auto: true }, black: { type: 'bot', name: 'Robot', auto: true } },
};
let state = null, players = null, level = 1, hist = [];
let thinkMs = 0, busy = false, fast = false, animId = 0, botToken = 0, sel = null, home = true;

const scene = createScene($('stage'), $('c'));

// ---------- affichage ----------
function updateHud() {
  if (!state) return;
  const n = pieceCount(state);
  for (const side of ['white', 'black']) {
    const el = $('cnt-' + side);
    el.querySelector('.nm').textContent = players[side].name;
    el.querySelector('.n').textContent = n[side].men + n[side].kings;
    el.querySelector('.kg').textContent = n[side].kings ? '♛' + n[side].kings : '';
    el.classList.toggle('turn', state.turn === side && !state.result);
  }
  $('btn-undo').disabled = undoTarget(players, hist) < 0;
}
function lastSquares() { return state?.lastMove ? [state.lastMove.from, state.lastMove.to] : []; }
function marks(extra = {}) {
  scene.setMarks({ last: lastSquares(), ...extra });
}

// ---------- partie ----------
function seatsToPlayers() {
  const s = settings.seats;
  return { white: { human: s.white.type === 'human', name: s.white.name }, black: { human: s.black.type === 'human', name: s.black.name } };
}
function begin(st, pl, lv) {
  botToken++; animId++; busy = false; sel = null; hist = [];
  scene.cancelAnims();
  state = st; players = pl; level = lv;
  scene.setFlip(shouldFlip(players));
  scene.sync(state);
  $('home').classList.add('hidden'); $('end').classList.add('hidden'); home = false;
  hideToast();
  updateHud();
  next();
}
function startGame() { fast = false; begin(newGame(settings.variant), seatsToPlayers(), settings.level); }

function next() {
  if (!state || home) return;
  if (state.result) { marks(); return finish(); }
  if (whoActs(players, state.turn) === 'bot') { marks(); botTurn(); } else humanTurn();
}

function humanTurn() {
  sel = null;
  const must = level === 1 && mustCapture(state) ? capturingPieces(state) : [];
  marks({ must });
  if (must.length) toast('Tu dois prendre !');
}

// ---------- robot ----------
let worker = null, workerBad = false, thinkId = 0;
const pending = new Map();
function getWorker() {
  if (worker || workerBad) return worker;
  try {
    worker = new Worker(new URL('./logic/botWorker.js', import.meta.url), { type: 'module' });
    worker.onmessage = (e) => { const p = pending.get(e.data.id); if (p) { pending.delete(e.data.id); p(e.data); } };
    worker.onerror = () => { workerBad = true; worker = null; for (const [, p] of pending) p({ error: 'worker' }); pending.clear(); };
  } catch { workerBad = true; worker = null; }
  return worker;
}
function think(st, lv) {
  const budget = fast ? { timeMs: 30, maxNodes: 3000 } : {};
  const sync = () => {
    const m = chooseMove(st, { level: lv, rng: mulberry32(Math.floor(Math.random() * 1e9)), timeMs: 60, maxNodes: 3000 });
    return legalMoves(st).findIndex((x) => x.from === m.from && x.path.join() === m.path.join() && x.captures.join() === m.captures.join());
  };
  const w = getWorker();
  if (!w) return Promise.resolve(sync());
  return new Promise((resolve) => {
    const id = ++thinkId;
    const timer = setTimeout(() => { pending.delete(id); resolve(sync()); }, 6000);
    pending.set(id, (d) => { clearTimeout(timer); resolve(d.error || d.index < 0 ? sync() : d.index); });
    w.postMessage({ id, state: st, opts: { level: lv, seed: Math.floor(Math.random() * 1e9), ...budget } });
  });
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function botTurn() {
  if (whoActs(players, state.turn) !== 'bot') return; // jamais pour un humain
  const token = ++botToken, st = state, t0 = performance.now();
  toast(`${players[st.turn].name} réfléchit…`, 0);
  Promise.all([think(st, level).then((i) => { thinkMs = Math.round(performance.now() - t0); return i; }), sleep(fast ? 0 : BOT_PACE * 1000)]).then(([idx]) => {
    if (token !== botToken || st !== state || busy || home) return;
    if (whoActs(players, state.turn) !== 'bot') return;
    const m = legalMoves(st)[idx];
    hideToast();
    commit(m);
  });
}

// ---------- jouer un coup ----------
function commit(move) {
  const prev = state;
  hist.push(prev);
  state = applyMove(prev, move);
  sel = null;
  updateHud();
  if (fast) { scene.sync(state); marks(); return next(); }
  busy = true;
  const id = ++animId;
  scene.setMarks({});
  scene.animateMove(prev, move, {
    onStep: (i, cap) => (cap != null ? sfx.capture(i) : sfx.move()),
    onPromote: () => sfx.king(),
  }).then(() => {
    if (id !== animId) return;
    busy = false;
    scene.sync(state);
    next();
  });
}

// ---------- coup humain, pas à pas ----------
function moveEntry(sq) {
  const side = state.turn === 'white' ? 1 : -1;
  const v = state.board[sq];
  return v && Math.sign(v) === side;
}
function showSel() {
  const all = sel.all;
  if (sel.amb) marks({ selected: sel.from, mids: sel.amb.squares, targets: [sel.cands[0].to] });
  else marks({ selected: sel.from, targets: finalTargets(all) });
}
function resolve(cands) {
  const amb = ambiguity(cands);
  if (!amb) return playHuman(cands[0]);
  sel.cands = cands; sel.amb = amb;
  showSel();
  sfx.select();
  toast('Choisis le chemin');
}
function playHuman(m) { hideToast(); commit(m); }

scene.onPick((sq) => {
  if (!state || home || busy || state.result || whoActs(players, state.turn) !== 'human' || sq === null) { if (sq === null && sel) { sel = null; humanTurn(); } return; }
  const moves = legalMoves(state);
  if (sel && sel.amb) {
    if (sel.amb.squares.includes(sq)) return resolve(sel.cands.filter((m) => m.path[sel.amb.index] === sq));
    sel.amb = null; sel.cands = sel.all;
  }
  if (sel && finalTargets(sel.all).includes(sq)) return resolve(sel.all.filter((m) => m.to === sq));
  if (moveEntry(sq)) {
    if (sel && sel.from === sq) { sel = null; return humanTurn(); }
    const mine = moves.filter((m) => m.from === sq);
    if (!mine.length) {
      sfx.oops();
      toast(moves[0]?.captures.length ? 'Tu dois prendre avec une autre pièce !' : 'Cette pièce est bloquée');
      return;
    }
    sel = { from: sq, all: mine, cands: mine, amb: null };
    sfx.select(); hideToast();
    return showSel();
  }
  if (sel) { sel = null; humanTurn(); }
});

// ---------- annuler ----------
function undo() {
  if (!state || home) return;
  const i = undoTarget(players, hist);
  if (i < 0) { toast('Rien à annuler'); return; }
  botToken++; animId++; busy = false; scene.cancelAnims();
  state = hist[i]; hist = hist.slice(0, i);
  scene.sync(state);
  updateHud();
  sfx.undo(); toast('Coup annulé');
  next();
}

// ---------- fin de partie ----------
const REASONS = { noPieces: 'Il ne reste plus aucune pièce à l\'autre camp !', blocked: 'L\'autre camp ne peut plus bouger !', repetition: 'La même position trois fois : partie nulle.', kingMoves: 'Trop de coups de dames sans prise : partie nulle.' };
function finish() {
  const r = state.result;
  hideToast();
  const humans = humanCount(players);
  let emoji = '🎉', title, stars = 3, party = true;
  if (!r.winner) { emoji = '🤝'; title = 'Partie nulle !'; stars = 2; sfx.draw(); }
  else if (humans === 2) { title = `Bravo ${players[r.winner].name} !`; sfx.win(); }
  else if (humans === 0) { emoji = '🤖'; title = `Les ${SIDE_NAME[r.winner]} gagnent !`; stars = 2; sfx.draw(); party = false; }
  else if (players[r.winner].human) { title = 'Bravo, tu as gagné !'; sfx.win(); }
  else { emoji = '💪'; title = `${players[r.winner].name} a gagné !`; stars = 1; party = false; sfx.lose(); }
  $('end-emoji').textContent = emoji;
  $('end-title').textContent = title;
  $('end-reason').textContent = REASONS[r.reason] + (!party && r.winner ? ' On rejoue ?' : '');
  $('end-stars').textContent = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
  const show = () => { if (!state?.result || home) return; $('end').classList.remove('hidden'); if (party) confetti(); };
  fast ? show() : setTimeout(show, 900);
}

// ---------- accueil ----------
function pick(group, key, v) {
  document.querySelectorAll(`#${group} .chip`).forEach((b) => b.classList.toggle('sel', b.dataset.v === String(v)));
  settings[key] = key === 'level' ? +v : v;
}
bindSeats(settings.seats, () => {});
normalizeSeats(settings.seats); renderSeats(settings.seats);
$('opt-variant').addEventListener('click', (e) => { const b = e.target.closest('.chip'); if (b) pick('opt-variant', 'variant', b.dataset.v); });
$('opt-level').addEventListener('click', (e) => { const b = e.target.closest('.chip'); if (b) pick('opt-level', 'level', b.dataset.v); });
$('btn-swap').addEventListener('click', () => {
  const s = settings.seats; [s.white, s.black] = [s.black, s.white];
  normalizeSeats(s); renderSeats(s);
});
$('btn-play').addEventListener('click', () => { stopSpeech(); startGame(); });
$('btn-again').addEventListener('click', startGame);
function openHome() {
  botToken++; stopSpeech(); hideToast();
  home = true;
  $('end').classList.add('hidden');
  $('btn-resume').classList.toggle('hidden', !state || !!state.result);
  $('home').classList.remove('hidden');
}
$('btn-home').addEventListener('click', openHome);
$('btn-menu').addEventListener('click', openHome);
$('btn-resume').addEventListener('click', () => { $('home').classList.add('hidden'); home = false; next(); });
$('btn-undo').addEventListener('click', undo);
$('btn-rules').addEventListener('click', () => speak(RULES));
$('btn-voice').addEventListener('click', () => {
  if (!state) return speak(RULES);
  const who = state.result ? '' : ` C'est aux ${SIDE_NAME[state.turn]} de jouer.`;
  speak(RULES + who);
});

// ---------- crochet de débogage ----------
function summary() {
  return { variant: state.variant, size: state.size, board: state.board.slice(), turn: state.turn, quiet: state.quiet, ply: state.ply, result: state.result, lastMove: state.lastMove, players, level, busy, fast, home, thinkMs, sel: sel && { from: sel.from, amb: sel.amb }, frames: scene.frames(), counts: pieceCount(state), mustCapture: mustCapture(state) };
}
function settle() { if (busy) { animId++; scene.cancelAnims(); scene.sync(state); busy = false; } botToken++; }
window.__dames = {
  state: () => (state ? summary() : null),
  legal: () => (state ? legalMoves(state) : []),
  play(arg) {
    if (!state || state.result) return false;
    const m = typeof arg === 'number' ? legalMoves(state)[arg] : arg && findMove(state, arg);
    if (!m) return false;
    settle(); commit(m); return true;
  },
  newGame(o = {}) {
    const mk = (side, d) => ({ human: o.players?.[side]?.human ?? d, name: o.players?.[side]?.name ?? ((o.players?.[side]?.human ?? d) ? 'Toi' : side === 'black' ? 'Robot 2' : 'Robot') });
    const pl = { white: mk('white', true), black: mk('black', false) };
    if (o.players?.black?.human && o.players?.white == null) pl.white = { human: false, name: 'Robot' };
    begin(newGame(o.variant || 'international'), pl, o.level || 1);
    return summary();
  },
  fast(b = true) { fast = !!b; return fast; },
  autoPlay(n = 1000) {
    if (!state) return null;
    const rng = mulberry32(12345);
    settle();
    for (let i = 0; i < n && !state.result; i++) {
      const m = chooseMove(state, { level, rng, timeMs: 15, maxNodes: 1500 });
      hist.push(state); state = applyMove(state, m);
    }
    sel = null; scene.sync(state); updateHud(); next();
    return summary();
  },
  load(board, turn = 'white') {
    const st = newGame(board.length === 64 ? 'english' : 'international');
    st.board = board.slice(); st.turn = turn; st.seen = {};
    begin(st, players || seatsToPlayers(), level);
    return summary();
  },
  pickAt: (x, y) => scene.pickAt(x, y),
  screenOf: (sq) => scene.screenOf(sq),
};
