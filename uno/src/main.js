import { mulberry32 } from './logic/rng.js';
import { createGame, legalMoves, play, drawCard, keepCard, topCard, isWild, COLORS, COLOR_NAMES } from './logic/game.js';
import { botDecision } from './logic/bots.js';
import { humanCount, needsPassScreen, seatsFromSettings } from './logic/turns.js';
import { createScene, HUMAN_POS, DISCARD_POS, DRAW_POS } from './render/scene.js';
import { COLOR_HEX } from './render/cardart.js';
import { $, toast, cardLabel, setChips, renderSeats, showRanking, confetti } from './ui/ui.js';
import { speak, stopSpeech } from './ui/speech.js';
import { cardSpeech } from './logic/speechtext.js';
import { loadImage } from './ui/images.js';
import { createFx } from './render/fx.js';
import { renderFan, launchCard, setHandFast } from './ui/hand.js';
import { sfx } from './ui/audio.js';

const settings = {
  palier: 1, players: 2, difficulty: 'facile', sayCards: false,
  seats: [{ type: 'human', name: 'Toi' }, { type: 'bot', name: 'Renard' }, { type: 'bot', name: 'Panda' }, { type: 'bot', name: 'Koala' }],
};
let g = null, run = 0, busy = false, waiting = null, armedUno = false, fast = false;
const avatarSrc = {};
let drawFromNext = null, flyFromScreen = null;
let viewer = 0, passResolve = null; // viewer : humain dont la main est affichée

const scene = createScene($('stage'), $('c'));
const fx = createFx({ root: $('fx'), scene, dur: (ms) => (fast ? 0 : ms), avatarOf: (p) => { const pl = g?.players[p]; if (!pl) return ''; const src = avatarSrc[pl.emoji]; return src ? `<img src="${src}" alt="">` : pl.emoji; } });
const POWER_KIND = { skip: 'skip', rev: 'reverse', draw2: 'draw2', wild: 'wild', wild4: 'draw4' };
const sleep = (ms) => new Promise((r) => setTimeout(r, fast ? 0 : ms));
const dur = (ms) => (fast ? 0 : ms);
// Rythme des robots : multiplicateur des délais/animations des robots (pas de l'enfant, joueur 0).
const BOT_PACE = 1.6;
const bp = (ms, p) => (g?.players[p]?.human ? ms : Math.round(ms * BOT_PACE));

const RULES = {
  base: 'Pose une carte de la même couleur ou du même nombre que la carte du milieu. Si tu ne peux pas, pioche une carte. Le premier qui n\'a plus de cartes gagne ! Quand il te reste une seule carte, appuie sur Uno.',
  2: ' Les cartes passe, sens inverse et plus deux changent le jeu.',
  3: ' Le joker te laisse choisir la couleur. Le joker plus quatre fait piocher quatre cartes au suivant.',
};
const rulesText = () => RULES.base + (settings.palier >= 2 ? RULES[2] : '') + (settings.palier >= 3 ? RULES[3] : '');

// ---------- vues ----------
const me = () => g.players[viewer];
const solo = () => humanCount(g) < 2;
const myTurn = () => !!g && g.phase === 'play' && g.current === viewer && !busy && !!waiting;
// avec plusieurs humains, la main n'est visible que pendant le tour de son propriétaire
const handHidden = () => !!g && !solo() && g.phase === 'play' && g.current !== viewer;
const highlightOn = () => settings.palier < 3;

function statusText() {
  if (!g) return 'Bienvenue !';
  if (g.phase === 'over') return 'Fini !';
  if (g.current !== viewer) return `${g.players[g.current].emoji} ${g.players[g.current].name} joue…`;
  if (busy) return '';
  if (g.drawn !== null) return 'Joue la carte ou garde-la';
  const toi = solo() ? 'À toi !' : `À toi, ${me().name} !`;
  return legalMoves(g, viewer).length ? `${toi} Même couleur ou même nombre` : (solo() ? 'Aucune carte : pioche !' : `${me().name}, aucune carte : pioche !`);
}

function refreshViews() {
  if (!g) return;
  scene.setDrawCount(g.draw.length);
  g.players.slice(1).forEach((p, i) => scene.setBotCount(i, p.hand.length, g.phase === 'play' && g.current === i + 1));
  scene.setDir(g.dir);
  scene.setColor(g.topColor);
  $('colorbadge').style.background = COLOR_HEX[g.topColor] || '#888';
  const mine = myTurn();
  const legalIds = new Set(mine ? legalMoves(g, viewer).map((c) => c.id) : []);
  renderFan($('hand'), handHidden() ? [] : me().hand, { legalIds, highlight: highlightOn() && mine, onTap: onCardTap, drawFrom: drawFromNext });
  drawFromNext = null;
  $('btn-draw').disabled = !(mine && g.drawn === null);
  $('draw-count').textContent = `(${g.draw.length})`;
  $('btn-keep').classList.toggle('hidden', !(mine && g.drawn !== null));
  $('btn-uno').classList.toggle('hidden', !(mine && me().hand.length === 2));
  $('btn-draw').classList.toggle('hidden', handHidden());
  $('btn-uno').classList.toggle('armed', armedUno);
  $('btn-uno').textContent = armedUno ? 'Uno ! ✓' : 'Uno !';
  if (!busy) $('status').textContent = statusText();
}

// ---------- animations d'événements ----------
async function fly(opts) {
  await Promise.race([scene.fly(opts), sleep((opts.duration || 420) + 500)]);
}

const soloMe = (p) => p === 0 && solo();

async function applyEvents(events) {
  for (const e of events) {
    const name = g.players[e.p ?? 0]?.name;
    switch (e.t) {
      case 'play':
        $('status').textContent = soloMe(e.p) ? 'Bien joué !' : `${name} joue ${cardLabel(e.card, e.color)}`;
        if (!soloMe(e.p)) toast(`${g.players[e.p].emoji} ${name} joue ${cardLabel(e.card, e.color)}`, bp(1800, e.p));
        sfx.play();
        scene.react(e.p, 'joy', dur(700));
        if (settings.sayCards) speak(cardSpeech(e.card, e.color));
        {
          let from = scene.seatPos(e.p);
          if (e.p === viewer && flyFromScreen) { from = scene.worldFromScreen(flyFromScreen.x, flyFromScreen.y, 1.2) || from; }
          flyFromScreen = null;
          await fly({ from, to: DISCARD_POS.clone().setY(0.2), card: e.card, duration: dur(bp(480, e.p)), spin: Math.PI * 2 + 0.3, arc: 1.6, land: true });
        }
        scene.setDiscard(e.card, e.color);
        if (isWild(e.card) && !fast) scene.shockwave(COLOR_HEX[e.color]);
        if (POWER_KIND[e.card.kind]) await fx.power(POWER_KIND[e.card.kind], { p: e.p, color: e.color });
        break;
      case 'draw':
        scene.react(e.p, 'oops', dur(600));
        {
          const flights = [];
          for (let i = 0; i < e.n; i++) {
            sfx.draw();
            if (e.p === viewer && !handHidden()) { drawFromNext = scene.screenOf(DRAW_POS); await sleep(120); continue; }
            flights.push(fly({ from: DRAW_POS.clone().setY(0.3), to: scene.seatPos(e.p), duration: dur(bp(260, e.p)), arc: 0.8 }));
            await sleep(bp(120, e.p)); // cartes une à une
          }
          await Promise.all(flights);
        }
        if (e.penalty) toast(solo() ? 'Oups, tu pioches 1 carte' : `Oups ${name}, tu pioches 1 carte`, 1800);
        else if (e.byCard) toast(`${g.players[e.p].emoji} ${soloMe(e.p) ? 'Tu pioches' : name + ' pioche'} ${e.n} carte${e.n > 1 ? 's' : ''}`, bp(1600, e.p));
        break;
      case 'skip':
        sfx.special(); scene.react(e.p, 'oops', dur(700));
        toast(soloMe(e.p) ? 'Tu passes ton tour' : `${name} passe son tour`, bp(1400, e.p));
        await sleep(bp(450, e.p));
        break;
      case 'reverse':
        sfx.special(); scene.setDir(e.dir); toast('Sens inverse !', bp(1400, e.p)); scene.boostDir(dur(1000)); await sleep(bp(250, e.p));
        break;
      case 'uno':
        sfx.uno(); fx.uno(soloMe(e.p) ? 'Toi' : name); fx.unoText(e.p); toast(`${soloMe(e.p) ? 'Toi' : name} : Uno !`, bp(1400, e.p)); if (g.players[e.p].human) speak('Uno !');
        break;
      case 'unoForgot':
        sfx.oops(); fx.bubble(e.p, e.penalty ? 'Oups, il fallait dire Uno ! Tu piocheras 1 carte.' : 'Pense à dire Uno la prochaine fois !');
        await sleep(600);
        break;
      case 'reshuffle':
        toast('On mélange la défausse', 1400); await sleep(300);
        break;
      case 'pass':
        if (!g.players[e.p].human) toast(`${name} ne peut pas jouer`, bp(1200, e.p));
        else toast(soloMe(e.p) ? 'Pas jouable : tour suivant' : `${name} : pas jouable, tour suivant`, 1300);
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
  const el = document.querySelector(`.card[data-id="${card.id}"]`);
  if (el) {
    const r = el.getBoundingClientRect();
    flyFromScreen = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    launchCard(el);
    await sleep(120);
    el.classList.add('gone');
  }
  const ev = play(g, card.id, { color, uno: armedUno });
  armedUno = false;
  await applyEvents(ev);
  busy = false;
  const w = waiting; waiting = null; if (w) w();
  return true;
}

async function doHumanDraw() {
  if (!myTurn() || g.drawn !== null) return false;
  if (legalMoves(g, viewer).length) { toast('Tu peux jouer une carte !', 1500); sfx.oops(); return false; }
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
  if (!legalMoves(g, viewer).some((c) => c.id === card.id)) {
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
  scene.react(p, 'think', dur(bp(850, p)));
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

function showPass() {
  const pl = g.players[g.current];
  $('pass-emoji').textContent = pl.emoji;
  const text = `Passe l'appareil à ${pl.name}`;
  $('pass-text').textContent = text;
  $('pass').classList.remove('hidden');
  if (settings.sayCards) speak(text);
  return new Promise((res) => { passResolve = res; });
}
function ready() {
  const r = passResolve; passResolve = null;
  $('pass').classList.add('hidden');
  if (r) r();
  return !!r;
}

async function loop(id) {
  while (g && id === run && g.phase === 'play') {
    if (g.players[g.current].human) {
      if (needsPassScreen(g, viewer)) {
        refreshViews();
        await showPass();
        if (id !== run) return;
      }
      viewer = g.current; armedUno = false;
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
  const winner = g.players[g.winner];
  const humanWon = winner.human;
  scene.react(g.winner, 'win', dur(1800));
  showRanking(g.ranking, humanWon, humanWon && !solo() ? `Bravo ${winner.name} !` : undefined, (em) => avatarSrc[em]);
  if (humanWon) { sfx.win(); confetti(90); speak(solo() ? 'Bravo, tu as gagné !' : `Bravo ${winner.name} !`); }
  else { sfx.lose(); confetti(30); speak(`${g.players[g.winner].name} a gagné. Bien joué !`); }
}

function startGame(opts = {}) {
  const { seats, bots, seed: _s, ...rest } = opts;
  Object.assign(settings, rest);
  run++; busy = false; waiting = null; armedUno = false; viewer = 0; ready();
  stopSpeech();
  let list = settings.seats.slice(0, settings.players);
  if (seats) list = seats;
  else if (bots != null) list = [{ type: 'human' }, ...Array.from({ length: Math.max(1, bots) }, () => ({ type: 'bot' }))];
  const seed = opts.seed ?? ((Date.now() ^ (Math.random() * 1e9)) >>> 0);
  g = createGame({ palier: settings.palier, seats: seatsFromSettings(list), difficulty: settings.difficulty, rng: mulberry32(seed) });
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
setChips('opt-players', (v) => { settings.players = +v; renderSeats($('seat-list'), settings.seats, settings.players, () => {}); });
renderSeats($('seat-list'), settings.seats, settings.players, () => {});
$('btn-ready').addEventListener('click', () => ready());
setChips('opt-diff', (v) => { settings.difficulty = v; });
setChips('opt-say', (v) => { settings.sayCards = v === '1'; if (!settings.sayCards) stopSpeech(); });
loadImage('table').then((im) => { if (im) scene.setTable(im); });
['🦊:av-renard', '🐼:av-panda', '🐨:av-koala', '🦉:av-hibou'].forEach((kv) => {
  const [emoji, key] = kv.split(':');
  loadImage(key).then((im) => { if (im) { avatarSrc[emoji] = im.src; scene.setAvatarImages({ [emoji]: im }); } });
});
loadImage('titre').then((im) => { if (im) { $('hero').src = im.src; $('hero').classList.remove('hidden'); } });
$('btn-play').addEventListener('click', () => { fast = false; setHandFast(false); startGame(); });
$('btn-again').addEventListener('click', () => { fast = false; setHandFast(false); startGame(); });
$('btn-home').addEventListener('click', () => { run++; ready(); $('end').classList.add('hidden'); $('home').classList.remove('hidden'); });
$('btn-menu').addEventListener('click', () => { run++; ready(); busy = false; waiting = null; $('home').classList.remove('hidden'); });
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
  setFast: (b = true) => { fast = !!b; setHandFast(fast); },
  // déclenche un effet par script : skip {p}, reverse {dir}, draw2, draw4, wild {color}, uno {p}, podium
  fx: async (name, o = {}) => {
    const p = o.p ?? 1;
    if (name === 'skip') return fx.power('skip', { p, color: o.color || 'R' });
    if (name === 'reverse') { scene.setDir(o.dir ?? -1); scene.boostDir(1000); return fx.power('reverse', { p, color: o.color || 'B' }); }
    if (name === 'draw2') return fx.power('draw2', { p, color: o.color || 'Y' });
    if (name === 'draw4') return fx.power('draw4', { p, color: o.color || 'G' });
    if (name === 'wild') { scene.shockwave(COLOR_HEX[o.color || 'B']); return fx.power('wild', { p, color: o.color || 'B' }); }
    if (name === 'unotext') return fx.unoText(p);
    if (name === 'uno') return fx.uno(g?.players[p]?.name || 'Toi');
    if (name === 'chooser') { $('chooser').classList.remove('hidden'); return true; }
    if (name === 'bubble') return fx.bubble(p, o.text || 'Pense à dire Uno !');
    if (name === 'podium') {
      const list = g.players.map((pl, i) => ({ p: i, name: pl.name, emoji: pl.emoji, left: pl.hand.length, human: pl.human })).sort((a, b) => a.left - b.left);
      showRanking(list, list[0].human, undefined, (em) => avatarSrc[em]);
      return true;
    }
    return false;
  },
  isMyTurn: () => myTurn(),
  refresh: () => refreshViews(),
  legal: () => (g ? legalMoves(g, viewer).map((c) => c.id) : []),
  viewer: () => viewer,
  ready: () => ready(),
  hand: () => me().hand.map((c) => ({ id: c.id, color: c.color, kind: c.kind, value: c.value })),
  // joue une carte (id) ; color pour les jokers
  play: async (id, color) => { await until(() => myTurn() || g.phase !== 'play'); const c = me().hand.find((x) => x.id === id); return c ? doHumanPlay(c, color) : false; },
  playFirstLegal: async () => {
    await until(() => myTurn() || g.phase !== 'play');
    const c = legalMoves(g, viewer)[0];
    if (!c) return doHumanDraw();
    return doHumanPlay(c, isWild(c) ? COLORS[0] : undefined);
  },
  draw: () => doHumanDraw(),
  keep: () => doKeep(),
  // le joueur suit la stratégie des robots jusqu'à la fin de la partie
  autoPlay: async () => {
    while (g.phase === 'play') {
      await until(() => myTurn() || !!passResolve || g.phase !== 'play');
      if (passResolve) { ready(); continue; }
      if (g.phase !== 'play') break;
      const d = botDecision(g);
      if (d.action === 'play' && me().hand.length === 2) armedUno = true; // comme un enfant attentif
      if (d.action === 'play') await doHumanPlay(me().hand.find((c) => c.id === d.cardId), d.color);
      else if (d.action === 'draw') await doHumanDraw();
      else await doKeep();
    }
    return window.__uno.state();
  },
  state: () => g && ({
    palier: g.palier, current: g.current, dir: g.dir, topColor: g.topColor, top: topCard(g), phase: g.phase,
    winner: g.winner, viewer, pass: !!passResolve, hands: g.players.map((p) => p.hand.length), drawLeft: g.draw.length, ranking: g.ranking,
  }),
};
