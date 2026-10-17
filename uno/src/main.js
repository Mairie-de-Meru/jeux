import { mulberry32 } from './logic/rng.js';
import { createGame, legalMoves, play, drawCard, keepCard, topCard, isWild, COLORS, COLOR_NAMES } from './logic/game.js';
import { botDecision } from './logic/bots.js';
import { createScene, HUMAN_POS, DISCARD_POS, DRAW_POS } from './render/scene.js';
import { COLOR_HEX } from './render/cardart.js';
import { $, toast, cardLabel, renderHand, setChips, showRanking, confetti } from './ui/ui.js';
import { speak, stopSpeech } from './ui/speech.js';
import { cardSpeech } from './logic/speechtext.js';
import { loadImage } from './ui/images.js';
import { sfx } from './ui/audio.js';

const settings = { palier: 1, bots: 1, difficulty: 'facile', sayCards: false };
let g = null, run = 0, busy = false, waiting = null, armedUno = false, fast = false;

const scene = createScene($('stage'), $('c'));
const sleep = (ms) => new Promise((r) => setTimeout(r, fast ? 0 : ms));
const dur = (ms) => (fast ? 0 : ms);
// Rythme des robots : multiplicateur des délais/animations des robots (pas de l'enfant, joueur 0).
const BOT_PACE = 1.6;
const bp = (ms, p) => (p !== 0 ? Math.round(ms * BOT_PACE) : ms);

const RULES = {
  base: 'Pose une carte de la même couleur ou du même nombre que la carte du milieu. Si tu ne peux pas, pioche une carte. Le premier qui n\'a plus de cartes gagne ! Quand il te reste une seule carte, appuie sur Uno.',
  2: ' Les cartes passe, sens inverse et plus deux changent le jeu.',
  3: ' Le joker te laisse choisir la couleur. Le joker plus quatre fait piocher quatre cartes au suivant.',
};
const rulesText = () => RULES.base + (settings.palier >= 2 ? RULES[2] : '') + (settings.palier >= 3 ? RULES[3] : '');

// ---------- vues ----------
const me = () => g.players[0];
const myTurn = () => !!g && g.phase === 'play' && g.current === 0 && !busy && !!waiting;
const highlightOn = () => settings.palier < 3;

function statusText() {
  if (!g) return 'Bienvenue !';
  if (g.phase === 'over') return 'Fini !';
  if (g.current !== 0) return `${g.players[g.current].emoji} ${g.players[g.current].name} joue…`;
  if (busy) return '';
  if (g.drawn !== null) return 'Joue la carte ou garde-la';
  return legalMoves(g, 0).length ? 'À toi ! Même couleur ou même nombre' : 'Aucune carte : pioche !';
}

function refreshViews() {
  if (!g) return;
  scene.setDrawCount(g.draw.length);
  g.players.slice(1).forEach((p, i) => scene.setBotCount(i, p.hand.length, g.phase === 'play' && g.current === i + 1));
  scene.setDir(g.dir);
  scene.setColor(g.topColor);
  $('colorbadge').style.background = COLOR_HEX[g.topColor] || '#888';
  const mine = myTurn();
  const legalIds = new Set(mine ? legalMoves(g, 0).map((c) => c.id) : []);
  renderHand($('hand'), me().hand, { legalIds, highlight: highlightOn() && mine, onTap: onCardTap });
  $('btn-draw').disabled = !(mine && g.drawn === null);
  $('draw-count').textContent = `(${g.draw.length})`;
  $('btn-keep').classList.toggle('hidden', !(mine && g.drawn !== null));
  $('btn-uno').classList.toggle('hidden', !(mine && me().hand.length === 2));
  $('btn-uno').classList.toggle('armed', armedUno);
  $('btn-uno').textContent = armedUno ? 'Uno ! ✓' : 'Uno !';
  if (!busy) $('status').textContent = statusText();
}

// ---------- animations d'événements ----------
async function fly(opts) {
  await Promise.race([scene.fly(opts), sleep((opts.duration || 420) + 500)]);
}

async function applyEvents(events) {
  for (const e of events) {
    const name = g.players[e.p ?? 0]?.name;
    switch (e.t) {
      case 'play':
        $('status').textContent = e.p === 0 ? 'Bien joué !' : `${name} joue ${cardLabel(e.card, e.color)}`;
        if (e.p !== 0) toast(`${g.players[e.p].emoji} ${name} joue ${cardLabel(e.card, e.color)}`, bp(1800, e.p));
        sfx.play();
        if (settings.sayCards) speak(cardSpeech(e.card, e.color));
        await fly({ from: scene.seatPos(e.p), to: DISCARD_POS.clone().setY(0.2), card: e.card, duration: dur(bp(420, e.p)), spin: 0.4 });
        scene.setDiscard(e.card, e.color);
        break;
      case 'draw':
        for (let i = 0; i < e.n; i++) {
          sfx.draw();
          await fly({ from: DRAW_POS.clone().setY(0.3), to: scene.seatPos(e.p), duration: dur(bp(260, e.p)), arc: 0.8 });
        }
        if (e.penalty) toast('Oups, tu pioches 1 carte', 1800);
        else if (e.byCard) toast(`${g.players[e.p].emoji} ${e.p === 0 ? 'Tu pioches' : name + ' pioche'} ${e.n} carte${e.n > 1 ? 's' : ''}`, bp(1600, e.p));
        break;
      case 'skip':
        sfx.special();
        toast(e.p === 0 ? 'Tu passes ton tour' : `${name} passe son tour`, bp(1400, e.p));
        await sleep(bp(450, e.p));
        break;
      case 'reverse':
        sfx.special(); scene.setDir(e.dir); toast('Sens inverse !', bp(1400, e.p)); await sleep(bp(350, e.p));
        break;
      case 'uno':
        sfx.uno(); toast(`${e.p === 0 ? 'Toi' : name} : Uno !`, bp(1400, e.p)); if (e.p === 0) speak('Uno !');
        break;
      case 'unoForgot':
        sfx.oops(); toast(e.penalty ? 'Il fallait dire Uno ! Tu piocheras 1 carte.' : 'N\'oublie pas de dire Uno ! La prochaine fois.', 2200);
        await sleep(600);
        break;
      case 'reshuffle':
        toast('On mélange la défausse', 1400); await sleep(300);
        break;
      case 'pass':
        if (e.p !== 0) toast(`${name} ne peut pas jouer`, bp(1200, e.p));
        else toast('Pas jouable : tour suivant', 1300);
        await sleep(bp(300, e.p));
        break;
      default:
    }
  }
  refreshViews();
}

// ---------- actions du joueur ----------
function chooseColor() {
  return new Promise((resolve) => {
    const box = $('chooser'); box.classList.remove('hidden');
    const done = (c) => { box.classList.add('hidden'); box.onclick = null; resolve(c); };
    box.onclick = (ev) => {
      const b = ev.target.closest('.col-btn');
      if (b) done(b.dataset.c);
      else if (ev.target.closest('#chooser-cancel')) done(null);
    };
  });
}

function release() { const w = waiting; waiting = null; if (w) w(); }

async function doHumanPlay(card, color) {
  if (!myTurn()) return false;
  busy = true;
  document.querySelector(`.card[data-id="${card.id}"]`)?.classList.add('gone');
  const ev = play(g, card.id, { color, uno: armedUno });
  armedUno = false;
  await applyEvents(ev);
  busy = false;
  const w = waiting; waiting = null; if (w) w();
  return true;
}

async function doHumanDraw() {
  if (!myTurn() || g.drawn !== null) return false;
  if (legalMoves(g, 0).length) { toast('Tu peux jouer une carte !', 1500); sfx.oops(); return false; }
  busy = true;
  const ev = drawCard(g);
  await applyEvents(ev);
  busy = false;
  if (g.drawn !== null) { refreshViews(); toast('Tu peux la jouer ou la garder', 1800); }
  else release();
  return true;
}

async function doKeep() {
  if (!myTurn() || g.drawn === null) return false;
  busy = true;
  await applyEvents(keepCard(g));
  busy = false; release();
  return true;
}

async function onCardTap(card, el) {
  if (!myTurn()) return;
  if (!legalMoves(g, 0).some((c) => c.id === card.id)) {
    sfx.oops(); el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake');
    toast(g.drawn !== null ? 'Joue la carte piochée, ou garde-la' : 'Pas celle-là : même couleur ou même nombre', 1800);
    return;
  }
  let color;
  if (isWild(card)) {
    color = await chooseColor();
    if (!color) return;
  }
  await doHumanPlay(card, color);
}

// ---------- boucle de partie ----------
async function botTurn() {
  const p = g.current;
  busy = true;
  refreshViews();
  $('status').textContent = `${g.players[p].emoji} ${g.players[p].name} réfléchit…`;
  await sleep(bp(850, p));
  let d = botDecision(g);
  if (d.action === 'draw') {
    await applyEvents(drawCard(g));
    if (g.current === p && g.drawn !== null) {
      await sleep(bp(400, p));
      d = botDecision(g);
    } else d = null;
  }
  if (d && d.action === 'play') await applyEvents(play(g, d.cardId, { color: d.color }));
  else if (d && d.action === 'keep') await applyEvents(keepCard(g));
  busy = false;
}

async function loop(id) {
  while (g && id === run && g.phase === 'play') {
    if (g.current === 0) {
      await new Promise((res) => { waiting = res; refreshViews(); });
    } else {
      await botTurn();
    }
  }
  if (id === run && g && g.phase === 'over') await finish(id);
}

async function finish(id) {
  busy = true; refreshViews();
  await sleep(900);
  if (id !== run) return;
  const humanWon = g.winner === 0;
  showRanking(g.ranking, humanWon);
  if (humanWon) { sfx.win(); confetti(90); speak('Bravo, tu as gagné !'); }
  else { sfx.lose(); confetti(30); speak(`${g.players[g.winner].name} a gagné. Bien joué !`); }
}

function startGame(opts = {}) {
  Object.assign(settings, opts);
  run++; busy = false; waiting = null; armedUno = false;
  stopSpeech();
  const seed = opts.seed ?? ((Date.now() ^ (Math.random() * 1e9)) >>> 0);
  g = createGame({ palier: settings.palier, bots: settings.bots, difficulty: settings.difficulty, rng: mulberry32(seed) });
  $('home').classList.add('hidden'); $('end').classList.add('hidden'); $('chooser').classList.add('hidden');
  scene.setupSeats(g.players);
  scene.clearDiscard();
  scene.setDiscard(topCard(g), g.topColor);
  scene.resize();
  refreshViews();
  loop(run);
  return g;
}

// ---------- interface ----------
setChips('opt-palier', (v) => { settings.palier = +v; });
setChips('opt-bots', (v) => { settings.bots = +v; });
setChips('opt-diff', (v) => { settings.difficulty = v; });
setChips('opt-say', (v) => { settings.sayCards = v === '1'; if (!settings.sayCards) stopSpeech(); });
loadImage('titre').then((im) => { if (im) { $('hero').src = im.src; $('hero').classList.remove('hidden'); } });
$('btn-play').addEventListener('click', () => startGame());
$('btn-again').addEventListener('click', () => startGame());
$('btn-home').addEventListener('click', () => { run++; $('end').classList.add('hidden'); $('home').classList.remove('hidden'); });
$('btn-menu').addEventListener('click', () => { run++; busy = false; waiting = null; $('home').classList.remove('hidden'); });
$('btn-rules').addEventListener('click', () => speak(rulesText()));
$('btn-voice').addEventListener('click', () => speak(rulesText()));
$('btn-draw').addEventListener('click', () => doHumanDraw());
$('btn-keep').addEventListener('click', () => doKeep());
$('btn-uno').addEventListener('click', () => { armedUno = !armedUno; sfx.uno(); if (armedUno) speak('Uno !'); refreshViews(); });
$('c').addEventListener('pointerdown', (e) => {
  if (!g) return;
  const s = scene.screenOf(DRAW_POS);
  if (Math.hypot(e.clientX - s.x, e.clientY - s.y) < 60) doHumanDraw();
});

const ro = new ResizeObserver(() => scene.resize());
ro.observe($('stage'));
window.addEventListener('resize', () => scene.resize());
window.addEventListener('orientationchange', () => setTimeout(() => scene.resize(), 200));
scene.resize();

(function frame(now) { scene.render(now); requestAnimationFrame(frame); })(performance.now());

// ---------- crochet de débogage ----------
const until = async (fn) => { while (!fn()) await new Promise((r) => setTimeout(r, 10)); };
window.__uno = {
  get game() { return g; },
  settings,
  start: (o) => { startGame(o); return window.__uno.state(); },
  setFast: (b = true) => { fast = !!b; },
  isMyTurn: () => myTurn(),
  refresh: () => refreshViews(),
  legal: () => (g ? legalMoves(g, 0).map((c) => c.id) : []),
  hand: () => me().hand.map((c) => ({ id: c.id, color: c.color, kind: c.kind, value: c.value })),
  // joue une carte (id) ; color pour les jokers
  play: async (id, color) => { await until(() => myTurn() || g.phase !== 'play'); const c = me().hand.find((x) => x.id === id); return c ? doHumanPlay(c, color) : false; },
  playFirstLegal: async () => {
    await until(() => myTurn() || g.phase !== 'play');
    const c = legalMoves(g, 0)[0];
    if (!c) return doHumanDraw();
    return doHumanPlay(c, isWild(c) ? COLORS[0] : undefined);
  },
  draw: () => doHumanDraw(),
  keep: () => doKeep(),
  // le joueur suit la stratégie des robots jusqu'à la fin de la partie
  autoPlay: async () => {
    while (g.phase === 'play') {
      await until(() => myTurn() || g.phase !== 'play');
      if (g.phase !== 'play') break;
      const d = botDecision(g);
      if (d.action === 'play') await doHumanPlay(me().hand.find((c) => c.id === d.cardId), d.color);
      else if (d.action === 'draw') await doHumanDraw();
      else await doKeep();
    }
    return window.__uno.state();
  },
  state: () => g && ({
    palier: g.palier, current: g.current, dir: g.dir, topColor: g.topColor, top: topCard(g), phase: g.phase,
    winner: g.winner, hands: g.players.map((p) => p.hand.length), drawLeft: g.draw.length, ranking: g.ranking,
  }),
};
