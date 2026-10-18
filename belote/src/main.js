import { mulberry32 } from './logic/rng.js';
import { createMatch, startDeal, bid, playCard, nextDeal, legalCards, liveCount } from './logic/game.js';
import { botBid, botPlay, adviceBid, adviceCard, ADVICE_TEXT, bidAdviceText } from './logic/bots.js';
import { humanCount, needsPassScreen, seatsFromSettings } from './logic/turns.js';
import { SUIT_SYMBOLS, SUIT_NAMES } from './logic/cards.js';
import { rulesText } from './logic/speechtext.js';
import { createScene } from './render/scene.js';
import { $, toast, renderHand, renderBid, renderSeats, renderBilan, setChips, confetti } from './ui/ui.js';
import { speak, stopSpeech } from './ui/speech.js';
import { loadImage } from './ui/images.js';
import { sfx } from './ui/audio.js';

const settings = {
  palier: 1, difficulty: 'facile',
  seats: [{ type: 'human', name: 'Toi' }, { type: 'bot', name: 'Renard' }, { type: 'bot', name: 'Ours' }, { type: 'bot', name: 'Lapin' }],
};
let g = null, run = 0, busy = false, waiting = null, fast = false, ended = false;
let viewer = 0, passResolve = null, dealResolve = null, turnedKey = null, lastActor = 0;
let dispCounts = [0, 0, 0, 0];

const scene = createScene($('stage'), $('c'));
const sleep = (ms) => new Promise((r) => setTimeout(r, fast ? 0 : ms));
const dur = (ms) => (fast ? 0 : ms);
// Rythme des robots : multiplicateur des délais/animations des seuls robots (jamais des humains).
const BOT_PACE = 1.6;
const bp = (ms, p) => (g?.players[p]?.human ? ms : Math.round(ms * BOT_PACE));
// Une animation qui ne se termine pas (onglet masqué) ne bloque jamais la partie.
const guard = (p, ms) => Promise.race([p, sleep(ms + 600)]);

// ---------- vues ----------
const inAction = () => !!g && ['bid1', 'bid2', 'play'].includes(g.phase);
const solo = () => humanCount(g) < 2;
const myTurn = () => inAction() && g.current === viewer && !!g.players[viewer].human && !busy && !!waiting;
const handHidden = () => !!g && !solo() && !(inAction() && g.current === viewer && g.players[viewer].human);
const dot = (s) => `<span class="suit ${s === 'H' || s === 'D' ? 'red' : 'black'}">${SUIT_SYMBOLS[s]}</span>`;
const who = (p) => `${g.players[p].emoji} ${g.players[p].name}`;

function statusText() {
  if (!g) return 'Bienvenue !';
  if (g.phase === 'dealEnd' || g.phase === 'matchEnd') return 'Donne terminée';
  const cur = g.current;
  if (!g.players[cur].human) return `${who(cur)} ${g.phase === 'play' ? 'joue' : 'réfléchit'}…`;
  if (cur !== viewer || busy) return busy ? '' : `À ${g.players[cur].name}`;
  const toi = solo() ? 'À toi !' : `À toi, ${g.players[cur].name} !`;
  if (g.phase === 'bid1') return `${toi} Tu prends à ${SUIT_SYMBOLS[g.turned.suit]} ?`;
  if (g.phase === 'bid2') return `${toi} Une autre couleur d'atout, ou passe`;
  return g.trick.length ? `${toi} Joue une carte brillante` : `${toi} Tu commences`;
}

function syncTurned() {
  const want = g && (g.phase === 'bid1' || g.phase === 'bid2') ? g.turned : null;
  const key = want ? want.id + g.dealNo : null;
  if (key !== turnedKey) { scene.setTurned(want); turnedKey = key; }
}

function refreshViews() {
  if (!g) return;
  $('sc0').textContent = g.scores[0]; $('sc1').textContent = g.scores[1];
  $('goal').textContent = `/ ${g.target}`;
  const ct = $('contract');
  if (g.trump) { ct.innerHTML = `${dot(g.trump)} <span>${g.players[g.taker].emoji}</span>`; ct.title = `Atout ${SUIT_NAMES[g.trump]}, ${g.players[g.taker].name} a pris`; ct.classList.remove('hidden'); }
  else ct.classList.add('hidden');
  dispCounts = g.players.map((p) => p.hand.length);
  scene.setCounts(dispCounts, viewer);
  const active = inAction() ? g.current : -1;
  scene.setLabels(g.players, { current: active, taker: g.taker ?? -1 });
  scene.setTrump(g.trump);
  syncTurned();

  const mine = myTurn();
  const playing = mine && g.phase === 'play';
  const legalIds = new Set(playing ? legalCards(g, viewer) : []);
  const advise = settings.palier === 1 && mine;
  let adv = null;
  if (advise && g.phase === 'play') adv = adviceCard(g, viewer, 1);
  renderHand($('hand'), handHidden() ? [] : g.players[viewer].hand, {
    trump: g.trump, legalIds, highlight: playing, adviceId: adv ? adv.id : null, onTap: onCardTap,
  });
  const advEl = $('advice');
  let advText = '';
  if (adv) advText = `Conseil : ${ADVICE_TEXT[adv.why]}`;
  const bidOn = mine && (g.phase === 'bid1' || g.phase === 'bid2');
  $('bid').classList.toggle('hidden', !bidOn);
  if (bidOn) {
    const a = advise ? adviceBid(g, viewer) : null;
    if (a) advText = `Conseil : ${bidAdviceText(g, a)}`;
    renderBid($('bid'), { round: g.phase === 'bid1' ? 1 : 2, turned: g.turned, advice: a, onChoice: doHumanBid });
  }
  advEl.textContent = advText; advEl.classList.toggle('hidden', !advText);
  const live = $('live');
  if (settings.palier === 1 && g.trump && inAction()) {
    const lc = liveCount(g); live.textContent = `Points ramassés : Nous ${lc[0]} · Eux ${lc[1]}`; live.classList.remove('hidden');
  } else live.classList.add('hidden');
  if (!busy) $('status').textContent = statusText();
}

const seatBubble = (seat, text, ms = 1500) => {
  if (fast) return;
  toast(`${who(seat)} : ${text}`, bp(ms, seat));
};

// ---------- animations d'événements ----------
async function applyEvents(events) {
  for (const e of events) {
    switch (e.t) {
      case 'deal':
        sfx.deal(); await sleep(250);
        break;
      case 'pass':
        sfx.pass(); seatBubble(e.seat, 'Je passe');
        await sleep(bp(300, e.seat));
        break;
      case 'take':
        sfx.take(); seatBubble(e.seat, `Je prends ${SUIT_SYMBOLS[e.suit]} !`, 1800);
        scene.setTrump(e.suit);
        turnedKey = null;
        await guard(scene.takeTurned(e.seat, dur(bp(450, e.seat))), bp(450, e.seat));
        toast(`${who(e.seat)} prend à ${SUIT_NAMES[e.suit]}`, bp(1800, e.seat));
        await sleep(bp(300, e.seat));
        break;
      case 'redeal':
        break;
      case 'play':
        lastActor = e.seat;
        sfx.play();
        dispCounts[e.seat]--; scene.setCounts(dispCounts, viewer);
        await guard(scene.playCard(e.seat, e.card, dur(bp(420, e.seat))), bp(420, e.seat));
        break;
      case 'belote':
        sfx.belote(); seatBubble(e.seat, 'Belote !', 1800); await sleep(bp(450, e.seat));
        break;
      case 'rebelote':
        sfx.belote(); seatBubble(e.seat, 'Rebelote !', 1800); await sleep(bp(450, e.seat));
        break;
      case 'trick':
        await sleep(bp(750, lastActor));
        sfx.trick();
        toast(`${who(e.winner)} gagne le pli${e.points ? ` (+${e.points})` : ''}`, bp(1200, e.winner));
        await guard(scene.collectTrick(e.winner, dur(bp(520, e.winner))), bp(520, e.winner));
        break;
      default:
    }
  }
  refreshViews();
}

// ---------- actions du joueur ----------
function release() { const w = waiting; waiting = null; if (w) w(); }

async function doHumanBid(choice) {
  if (!myTurn() || !(g.phase === 'bid1' || g.phase === 'bid2')) return false;
  busy = true; $('bid').classList.add('hidden'); $('advice').classList.add('hidden');
  await applyEvents(bid(g, viewer, choice));
  busy = false; release();
  return true;
}

async function doHumanPlay(card) {
  if (!myTurn() || g.phase !== 'play') return false;
  busy = true;
  document.querySelector(`.card[data-id="${card.id}"]`)?.classList.add('gone');
  $('advice').classList.add('hidden');
  await applyEvents(playCard(g, viewer, card.id));
  busy = false; release();
  return true;
}

function whyIllegal() {
  const led = g.trick[0]?.card.suit;
  const hand = g.players[viewer].hand;
  if (led && hand.some((c) => c.suit === led)) return led === g.trump ? 'Joue un atout plus fort si tu peux' : `Il faut jouer ${SUIT_SYMBOLS[led]}`;
  if (hand.some((c) => c.suit === g.trump)) return 'Il faut couper avec un atout';
  return 'Pas celle-là';
}

async function onCardTap(card, el) {
  if (!myTurn()) return;
  if (g.phase !== 'play') { toast('Prends ou passe d\'abord', 1500); return; }
  if (!legalCards(g, viewer).includes(card.id)) {
    sfx.oops(); el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake');
    toast(whyIllegal(), 1800);
    return;
  }
  await doHumanPlay(card);
}

// ---------- boucle de partie ----------
async function botTurn(id) {
  const p = g.current;
  busy = true;
  refreshViews();
  $('status').textContent = statusText();
  await sleep(bp(850, p));
  if (id !== run) return;
  const events = (g.phase === 'play') ? playCard(g, p, botPlay(g, p)) : bid(g, p, botBid(g, p));
  await applyEvents(events);
  busy = false;
}

function showPass() {
  const pl = g.players[g.current];
  $('pass-emoji').textContent = pl.emoji;
  $('pass-text').textContent = `Passe l'appareil à ${pl.emoji} ${pl.name}`;
  $('pass').classList.remove('hidden');
  return new Promise((res) => { passResolve = res; });
}
function ready() {
  const r = passResolve; passResolve = null;
  $('pass').classList.add('hidden');
  if (r) r();
  return !!r;
}
function showBilan() {
  const result = g.result;
  renderBilan(g, result, { solo: solo(), matchOver: g.phase === 'matchEnd' });
  const good = result.takerTeam === 0 ? result.made : !result.made;
  if (good) sfx.win(); else sfx.lose();
  return new Promise((res) => { dealResolve = res; });
}
function next() {
  const r = dealResolve; dealResolve = null;
  $('deal').classList.add('hidden');
  if (r) r();
  return !!r;
}

async function loop(id) {
  while (g && id === run) {
    const ph = g.phase;
    if (ph === 'bid1' || ph === 'bid2' || ph === 'play') {
      if (g.players[g.current].human) {
        if (needsPassScreen(g, viewer)) {
          busy = false; refreshViews();
          await showPass();
          if (id !== run) return;
        }
        viewer = g.current;
        await new Promise((res) => { waiting = res; refreshViews(); });
      } else await botTurn(id);
    } else if (ph === 'redeal') {
      toast('Personne ne prend : on redonne !', 1600);
      await sleep(1000);
      if (id !== run) return;
      busy = true; await applyEvents(startDeal(g)); busy = false;
    } else if (ph === 'dealEnd' || ph === 'matchEnd') {
      busy = true; refreshViews();
      await sleep(700);
      if (id !== run) return;
      await showBilan();
      if (id !== run) return;
      if (ph === 'matchEnd') { finish(); return; }
      scene.clearTrick(); busy = true;
      await applyEvents(nextDeal(g)); busy = false;
    } else return;
  }
}

function finish() {
  ended = true; busy = false; refreshViews();
  const won = g.winner === 0;
  $('end-emoji').textContent = won ? '🏆' : '🎉';
  $('end-title').textContent = won ? 'Bravo, vous avez gagné !' : 'Eux ont gagné, bien joué !';
  $('end-sub').textContent = `Nous ${g.scores[0]} · Eux ${g.scores[1]}`;
  $('end').classList.remove('hidden');
  if (won) { sfx.win(); confetti(90); speak('Bravo, vous avez gagné !'); } else { sfx.lose(); confetti(30); }
}

function startGame(opts = {}) {
  const { seats, seed, ...rest } = opts;
  Object.assign(settings, rest);
  run++; busy = false; waiting = null; ended = false; viewer = 0; lastActor = 0; turnedKey = null;
  dealResolve = null; ready(); next();
  stopSpeech();
  const list = seats || settings.seats;
  const sd = seed ?? ((Date.now() ^ (Math.random() * 1e9)) >>> 0);
  g = createMatch({ palier: settings.palier, seats: seatsFromSettings(list), difficulty: settings.difficulty, rng: mulberry32(sd) });
  $('home').classList.add('hidden'); $('end').classList.add('hidden'); $('deal').classList.add('hidden');
  scene.setupSeats(g.players);
  scene.clearTrick(); scene.setTurned(null); scene.setTrump(null);
  scene.resize();
  refreshViews();
  loop(run);
  return g;
}

// ---------- interface ----------
setChips('opt-palier', (v) => { settings.palier = +v; });
setChips('opt-diff', (v) => { settings.difficulty = v; });
renderSeats($('seat-list'), settings.seats, () => {});
$('btn-ready').addEventListener('click', () => ready());
$('btn-next').addEventListener('click', () => next());
loadImage('titre').then((im) => { if (im) { $('hero').src = im.src; $('hero').classList.remove('hidden'); } });
$('btn-play').addEventListener('click', () => { fast = false; startGame(); });
$('btn-again').addEventListener('click', () => { fast = false; startGame(); });
$('btn-home').addEventListener('click', () => { run++; ready(); $('end').classList.add('hidden'); $('home').classList.remove('hidden'); });
$('btn-menu').addEventListener('click', () => { run++; ready(); busy = false; waiting = null; $('deal').classList.add('hidden'); $('home').classList.remove('hidden'); });
$('btn-rules').addEventListener('click', () => speak(rulesText(settings.palier)));
$('btn-voice').addEventListener('click', () => speak(rulesText(g ? g.palier : settings.palier)));

const ro = new ResizeObserver(() => scene.resize());
ro.observe($('stage'));
window.addEventListener('resize', () => scene.resize());
window.addEventListener('orientationchange', () => setTimeout(() => scene.resize(), 200));
scene.resize();

(function frame(now) { scene.render(now); requestAnimationFrame(frame); })(performance.now());

// ---------- crochet de débogage ----------
const until = async (fn, ms = 60000) => {
  const t0 = performance.now();
  while (!fn()) { if (performance.now() - t0 > ms) return false; await new Promise((r) => setTimeout(r, 10)); }
  return true;
};
const state = () => g && ({
  palier: g.palier, phase: g.phase, current: g.current, viewer, dealer: g.dealer, dealNo: g.dealNo, trump: g.trump, taker: g.taker,
  turned: g.turned ? g.turned.id : null, scores: g.scores.slice(), target: g.target, trick: g.trick.map((p) => ({ seat: p.seat, card: p.card.id })),
  trickCount: g.trickCount.slice(), hands: g.players.map((p) => p.hand.length), winner: g.winner, result: g.result,
  pass: !!passResolve, bilan: !!dealResolve, ended, myTurn: myTurn(), history: g.history.length,
});
// Joue pour l'humain courant avec la stratégie des robots (conseil).
async function humanStep() {
  if (g.phase === 'bid1' || g.phase === 'bid2') return doHumanBid(adviceBid(g, viewer));
  return doHumanPlay(g.players[viewer].hand.find((c) => c.id === adviceCard(g, viewer, g.palier).id));
}
window.__belote = {
  get game() { return g; },
  settings,
  start: (o) => { startGame(o); return state(); },
  state,
  bid: async (take, suit) => { await until(() => myTurn() || !inAction()); return doHumanBid({ take: !!take, suit }); },
  play: async (cardId) => { await until(() => myTurn() || !inAction()); const c = g.players[viewer].hand.find((x) => x.id === cardId); return c ? doHumanPlay(c) : false; },
  legal: () => (g ? legalCards(g, viewer) : []),
  hand: () => (g ? g.players[viewer].hand.map((c) => c.id) : []),
  ready: () => ready(),
  next: () => next(),
  viewer: () => viewer,
  setFast: (b = true) => { fast = !!b; },
  // joue pour chaque humain, presse « Je suis prêt » et « Donne suivante », jusqu'à la fin de partie
  autoPlay: async () => {
    const id = run;
    while (g && id === run && !ended) {
      await until(() => myTurn() || !!passResolve || !!dealResolve || ended || id !== run);
      if (passResolve) { ready(); continue; }
      if (dealResolve) { next(); continue; }
      if (myTurn()) await humanStep();
    }
    return state();
  },
  // saute au bilan de la donne en cours (humains joués par le conseil, mode rapide)
  endDeal: async () => {
    const id = run; fast = true;
    const stop = () => !!dealResolve || ended || id !== run;
    while (!stop()) {
      await until(() => myTurn() || !!passResolve || stop());
      if (passResolve) { ready(); continue; }
      if (myTurn()) await humanStep();
    }
    return state();
  },
};
