import { mulberry32 } from './logic/rng.js';
import { createGame, legalActions, act, nextHand, isFinalHand, potTotal, PALIERS, live } from './logic/poker.js';
import { botDecision, strategyDecision } from './logic/bots.js';
import { describe } from './logic/hand.js';
import { humanCount, needsPassScreen, seatsFromSettings } from './logic/turns.js';
import { createScene } from './render/scene.js';
import { $, toast, renderHole, setChips, renderSeats, renderCombos, showRanking, confetti } from './ui/ui.js';
import { speak, stopSpeech } from './ui/speech.js';
import { loadImage } from './ui/images.js';
import { sfx } from './ui/audio.js';

const settings = {
  palier: 1, players: 3, hands: 0, say: false,
  seats: [{ type: 'human', name: 'Toi' }, { type: 'bot', name: 'Renard' }, { type: 'bot', name: 'Lapine' }, { type: 'bot', name: 'Ours' }, { type: 'bot', name: 'Panda' }, { type: 'bot', name: 'Grenouille' }],
};
let g = null, run = 0, busy = false, waiting = null, fast = false, animating = false;
let viewer = 0, passResolve = null, nextResolve = null, eyeOn = false, cardsVisible = true;
const view = { bets: [], pot: 0 }; // ce que la scène affiche (peut retarder sur l'état pendant les animations)

const scene = createScene($('stage'), $('c'));
const sleep = (ms) => new Promise((r) => setTimeout(r, fast ? 0 : ms));
const dur = (ms) => (fast ? 0 : ms);
// Rythme des robots : multiplicateur des délais/animations des robots (jamais celui des humains).
const BOT_PACE = 1.6;
const bp = (ms, p) => (g?.players[p]?.human ? ms : Math.round(ms * BOT_PACE));

const RULES = 'Tu as deux cartes à toi et cinq cartes au milieu de la table. Fais la plus belle combinaison de cinq cartes. À ton tour, tu peux te coucher, parler, suivre ou relancer. Celui qui a le meilleur jeu gagne les jetons du pot. Ce sont des jetons pour jouer, pour de faux.';

// ---------- vues ----------
const solo = () => !g || humanCount(g) < 2;
const me = () => (g && viewer >= 0 ? g.players[viewer] : null);
const myTurn = () => !!g && g.phase === 'betting' && g.current === viewer && viewer >= 0 && g.players[viewer].human && !busy && !!waiting;
const handHidden = () => !g || viewer < 0 || (!solo() && !(g.phase === 'betting' && g.current === viewer));
const helpAllowed = () => PALIERS[g.palier].help || eyeOn;
const infoLine = () => `Main ${g.handNo}/${g.maxHands} · Blindes ${g.blinds.sb}/${g.blinds.bb} · Pot ${potTotal(g)}`;

function statusText() {
  if (!g) return 'Bienvenue !';
  if (g.phase === 'handOver') return 'Fin de la main';
  if (g.phase === 'gameOver') return 'Fin de la partie';
  const cur = g.players[g.current];
  if (cur.human) {
    if (busy) return '';
    const L = legalActions(g);
    const toi = solo() ? 'À toi !' : `À toi, ${cur.name} !`;
    return L.call ? `${toi} Pour suivre : ${L.call} jetons` : `${toi} Tu peux parler ou miser`;
  }
  return `${cur.emoji} ${cur.name} réfléchit…`;
}

function seatProps(i) {
  const p = g.players[i];
  const res = g.phase === 'handOver' ? g.lastResult : null;
  const bet = view.bets[i] || 0;
  let state = '', tag = '';
  if (p.out) { state = 'out'; tag = 'éliminé'; }
  else if (p.folded) { state = 'fold'; tag = 'couché'; }
  else if (p.allIn) { state = 'allin'; tag = 'tapis'; }
  else if (bet > 0) tag = `mise ${bet}`;
  let cards = !cardsVisible || p.out || p.folded ? 'none' : 'back';
  if (res && res.shown[i]) { tag = res.shown[i].name; cards = 'face'; }
  if (res && res.wins.some((w) => w.p === i && !w.refund)) state = 'win';
  return {
    emoji: p.emoji, name: p.name, stack: p.stack, bet, tag, state, cards, faces: p.hole,
    active: !animating && g.phase === 'betting' && g.current === i, me: p.human && i === viewer,
  };
}
function syncSeats() { g.players.forEach((_, i) => scene.setSeat(i, seatProps(i))); }

function resultText() {
  const r = g.lastResult; if (!r) return '';
  const lines = [];
  const real = r.wins.filter((w) => !w.refund);
  const byP = new Map();
  for (const w of real) { const e = byP.get(w.p) || { amount: 0, hand: w.hand }; e.amount += w.amount; byP.set(w.p, e); }
  for (const [p, e] of byP) {
    const pl = g.players[p];
    const you = solo() && pl.human;
    lines.push(`${pl.emoji} ${you ? 'Tu gagnes' : pl.name + ' gagne'} ${e.amount} jetons${e.hand ? ' avec ' + e.hand : ''}`);
  }
  if (solo()) {
    const mineWin = byP.has(g.players.findIndex((p) => p.human));
    if (!mineWin) lines.push('Pas de chance, tu feras mieux à la prochaine main ! 💪');
    else lines.push('Bravo ! 🎉');
  }
  return lines.join('\n');
}

function updateButtons() {
  const over = g.phase === 'handOver';
  ['btn-fold', 'btn-call', 'btn-raise', 'btn-allin'].forEach((id) => $(id).classList.toggle('hidden', over));
  $('btn-next').classList.toggle('hidden', !over);
  if (over) { $('btn-next').textContent = isFinalHand(g) ? '🏆 Voir le classement' : 'Main suivante ▶'; return; }
  const mine = myTurn();
  const L = mine ? legalActions(g) : null;
  $('btn-fold').disabled = !mine;
  $('btn-call').disabled = !mine;
  $('btn-call').textContent = L && L.call ? `✅ Suivre ${L.call}` : '✅ Parler';
  $('btn-raise').classList.toggle('hidden', !!L && !(L.raise && L.raise.min < L.raise.max));
  $('btn-raise').disabled = !mine;
  $('btn-allin').classList.toggle('hidden', !!L && !L.allin);
  $('btn-allin').disabled = !mine;
  $('btn-allin').textContent = L && L.allin ? `🔥 Tapis ${L.allin}` : '🔥 Tapis';
}

function refreshViews() {
  if (!g) return;
  view.bets = g.players.map((p) => p.bet);
  view.pot = g.phase === 'handOver' ? 0 : g.players.reduce((s, p) => s + p.totalBet - p.bet, 0);
  scene.setBoard(g.board); scene.setPot(view.pot); scene.setDealer(g.dealer);
  if (viewer >= 0) scene.setViewer(viewer);
  syncSeats();
  const mine = me();
  const hidden = handHidden();
  renderHole($('hand'), mine ? mine.hole : [], { hidden, dim: !!mine && (mine.folded || mine.out) });
  // aide « Ta main »
  const helpEl = $('help');
  if (!hidden && mine && mine.hole.length && !mine.folded && !mine.out && g.phase === 'betting' && helpAllowed()) {
    const lead = solo() ? 'Ta main' : `${mine.name}`;
    helpEl.innerHTML = '';
    helpEl.textContent = `${lead} : ${describe(mine.hole, g.board)}`;
  } else helpEl.textContent = hidden || !mine ? '' : (mine.folded ? 'Tu es couché' : '');
  $('btn-eye').classList.toggle('hidden', PALIERS[g.palier].help);
  const over = g.phase === 'handOver';
  $('result').classList.toggle('hidden', !over);
  $('help').classList.toggle('hidden', over);
  if (over) $('result').textContent = resultText();
  $('st-info').textContent = infoLine();
  if (!busy) $('st-main').textContent = statusText();
  updateButtons();
}

// ---------- animations d'événements ----------
const flyP = (p) => Promise.race([p.promise, sleep(p.ms + 500)]);
const flyCardP = (o) => flyP({ promise: scene.fly(o), ms: o.duration || 420 });
const flyChipsP = (o) => flyP({ promise: scene.flyChips(o), ms: o.duration || 420 });

async function sweepBets() {
  const moves = view.bets.map((b, i) => (b > 0 ? [b, i] : null)).filter(Boolean);
  if (!moves.length) return;
  sfx.chip();
  await Promise.all(moves.map(([b, i]) => flyChipsP({ amount: b, from: scene.betPos(i), to: scene.potPos.clone().setY(0.2), duration: dur(420) })));
  view.pot += moves.reduce((s, [b]) => s + b, 0);
  view.bets = view.bets.map(() => 0);
  scene.setPot(view.pot);
  syncSeats();
}

const BOARD_TOAST = { flop: 'Les 3 cartes du milieu', turn: 'Une 4e carte', river: 'La dernière carte' };

async function applyEvents(events) {
  animating = true;
  let dealt = false;
  for (const e of events) {
    const pl = e.p != null ? g.players[e.p] : null;
    const you = !!pl && pl.human && solo();
    const nm = pl ? (you ? 'Tu' : pl.name) : '';
    const say = (txt, ms = 1500) => { toast(`${pl.emoji} ${txt}`, bp(ms, e.p)); if (settings.say && !you) speak(txt); };
    switch (e.t) {
      case 'newHand':
        view.bets = g.players.map(() => 0); view.pot = 0; cardsVisible = false;
        scene.clearTable(); scene.setDealer(e.dealer); syncSeats();
        $('st-info').textContent = `Main ${e.handNo}/${g.maxHands} · Blindes ${e.blinds.sb}/${e.blinds.bb}`;
        toast(`Main ${e.handNo}/${g.maxHands} · blindes ${e.blinds.sb}/${e.blinds.bb}`, 1800);
        await sleep(350);
        break;
      case 'blind':
        view.bets[e.p] = e.amount; sfx.chip();
        await flyChipsP({ amount: e.amount, from: scene.seatPos(e.p), to: scene.betPos(e.p), duration: dur(300) });
        syncSeats();
        break;
      case 'deal':
        if (dealt) break;
        dealt = true;
        {
          const order = g.players.map((p, i) => i).filter((i) => !g.players[i].out);
          const flights = [];
          let k = 0;
          for (let r = 0; r < 2; r++) for (const i of order) {
            const delay = k++ * 70;
            flights.push(sleep(delay).then(() => { sfx.card(); return flyCardP({ from: scene.deckPos, to: scene.seatPos(i), duration: dur(260), arc: 0.8, spin: 0.4 }); }));
          }
          await Promise.all(flights);
          cardsVisible = true; syncSeats();
          await sleep(200);
        }
        break;
      case 'fold':
        sfx.fold(); say(`${nm} ${you ? 'te couches' : 'se couche'}`);
        await sleep(bp(500, e.p));
        break;
      case 'check':
        sfx.check(); say(`${nm} parle${you ? 's' : ''}`);
        await sleep(bp(400, e.p));
        break;
      case 'call':
      case 'allin':
      case 'raise': {
        view.bets[e.p] = e.to;
        if (e.t === 'allin') { sfx.allin(); say(you ? 'Tu es à tapis ! 🔥' : `${nm} est à tapis ! 🔥`, 2000); }
        else if (e.t === 'raise') { sfx.raise(); say(`${nm} relance${you ? 's' : ''} à ${e.to}`); }
        else { sfx.chip(); say(`${nm} suit${you ? 's' : ''} ${e.amount}`); }
        await flyChipsP({ amount: e.amount, from: scene.seatPos(e.p), to: scene.betPos(e.p), duration: dur(bp(320, e.p)) });
        syncSeats();
        await sleep(bp(350, e.p));
        break;
      }
      case 'runout':
        await sweepBets();
        toast('Tapis ! On retourne toutes les cartes', 2000);
        await sleep(900);
        break;
      case 'street': {
        await sweepBets();
        toast(BOARD_TOAST[e.street], 1400);
        const first = e.board.length - e.cards.length;
        for (let k = 0; k < e.cards.length; k++) {
          sfx.card();
          await flyCardP({ card: null, from: scene.deckPos, to: scene.slotPos(first + k).setY(0.3), duration: dur(300), arc: 0.9 });
          scene.setBoard(e.board.slice(0, first + k + 1));
        }
        await sleep(e.street === 'flop' ? 350 : 250);
        break;
      }
      case 'showdown':
        await sweepBets();
        sfx.show(); syncSeats();
        toast('On montre les cartes !', 1800);
        await sleep(1500);
        break;
      case 'win':
        await sweepBets();
        sfx.chip();
        await flyChipsP({ amount: e.amount, from: scene.potPos.clone().setY(0.3), to: scene.seatPos(e.p), duration: dur(500) });
        view.pot = Math.max(0, view.pot - e.amount); scene.setPot(view.pot);
        syncSeats();
        break;
      case 'out':
        toast(pl.human ? `${pl.emoji} ${pl.name}, plus de jetons. Bravo d'avoir joué !` : `${pl.emoji} ${pl.name} n'a plus de jetons`, 2200);
        break;
      default:
    }
  }
  animating = false;
  refreshViews();
}

// ---------- actions du joueur ----------
function release() { const w = waiting; waiting = null; if (w) w(); }

async function doAct(a) {
  if (!myTurn()) return false;
  let ev;
  try { ev = act(g, a); } catch (err) { toast('Cette action n\'est pas possible', 1500); sfx.oops(); return false; }
  hideRaise();
  busy = true;
  await applyEvents(ev);
  busy = false;
  if (!solo()) viewer = -1; // plusieurs humains : la main redevient cachée, écran de passage au prochain tour
  release();
  return true;
}

// ---------- relance ----------
let raiseTo = 0, raiseL = null;
function hideRaise() { $('raisebox').classList.add('hidden'); }
function updateRaise() {
  raiseTo = Math.max(raiseL.raise.min, Math.min(raiseL.raise.max, Math.round(raiseTo)));
  $('raise-amt').textContent = raiseTo;
  $('raise-ok').textContent = raiseTo >= raiseL.raise.max ? '🔥 Tapis' : '✓ Relancer';
}
function openRaise() {
  if (!myTurn()) return;
  raiseL = legalActions(g);
  if (!raiseL.raise) return;
  raiseTo = raiseL.raise.min;
  $('raisebox').classList.remove('hidden');
  updateRaise();
}
function presetRaise(kind) {
  const pot = potTotal(g), call = raiseL.call, base = g.currentBet;
  raiseTo = kind === 'min' ? raiseL.raise.min : kind === 'half' ? base + Math.round((pot + call) / 2) : base + pot + call;
  updateRaise();
}

// ---------- boucle de partie ----------
async function botTurn(id) {
  const p = g.current;
  if (!solo()) viewer = -1;
  busy = true;
  refreshViews();
  $('st-main').textContent = `${g.players[p].emoji} ${g.players[p].name} réfléchit…`;
  await sleep(bp(850, p));
  if (id !== run) return;
  await applyEvents(act(g, botDecision(g, g.rng)));
  busy = false;
}

function showPass() {
  const pl = g.players[g.current];
  $('pass-emoji').textContent = pl.emoji;
  const text = `Passe l'appareil à ${pl.emoji} ${pl.name}`;
  $('pass-text').textContent = text;
  $('pass').classList.remove('hidden');
  if (settings.say) speak(`Passe l'appareil à ${pl.name}`);
  return new Promise((res) => { passResolve = res; });
}
function ready() {
  const r = passResolve; passResolve = null;
  $('pass').classList.add('hidden');
  if (r) r();
  return !!r;
}
function next() {
  const r = nextResolve; nextResolve = null;
  if (r) r();
  return !!r;
}

async function handOverStep(id) {
  busy = false; refreshViews();
  const txt = resultText().replace(/\n/g, '. ').replace(/[💪🎉]/g, '');
  const mineWon = g.lastResult.wins.some((w) => !w.refund && g.players[w.p].human);
  if (mineWon) sfx.win(); else sfx.show();
  if (settings.say) speak(txt);
  const humansIn = g.players.some((p) => p.human && live(p));
  await new Promise((res) => {
    nextResolve = res;
    if (fast) res();
    else if (!humansIn) setTimeout(res, 5500); // robots seuls : enchaînement automatique
  });
  nextResolve = null;
}

async function loop(id) {
  while (g && id === run) {
    if (g.phase === 'betting') {
      if (g.players[g.current].human) {
        if (needsPassScreen(g, viewer)) {
          refreshViews();
          await showPass();
          if (id !== run) return;
        }
        viewer = g.current;
        await new Promise((res) => { waiting = res; refreshViews(); });
      } else await botTurn(id);
    } else if (g.phase === 'handOver') {
      await handOverStep(id);
      if (id !== run) return;
      busy = true;
      const humanFirst = g.players.findIndex((p) => p.human && !p.out);
      if (solo() && humanFirst >= 0) viewer = humanFirst;
      await applyEvents(nextHand(g));
      busy = false;
    } else break;
  }
  if (id === run && g && g.phase === 'gameOver') await finish(id);
}

async function finish(id) {
  busy = true; refreshViews();
  await sleep(700);
  if (id !== run) return;
  const list = g.ranking.map((i) => g.players[i]);
  const winner = list[0];
  let title, emoji = '🎉';
  if (winner.human) {
    emoji = '🏆'; title = solo() ? 'Bravo, tu as gagné !' : `Bravo ${winner.name} !`;
    sfx.win(); confetti(90);
  } else { title = `${winner.emoji} ${winner.name} gagne la partie. Bien joué !`; sfx.lose(); confetti(35); }
  showRanking(list, title, emoji);
  if (settings.say) speak(title.replace(/[^\p{L}\p{N}\s,.!']/gu, ''));
}

function startGame(opts = {}) {
  const { seats, seed, palier, maxHands } = opts;
  if (palier) settings.palier = palier;
  run++; busy = false; waiting = null; animating = false; eyeOn = false; cardsVisible = true;
  next(); ready(); stopSpeech(); hideRaise();
  const list = seats || settings.seats.slice(0, settings.players);
  const sd = seed ?? ((Date.now() ^ (Math.random() * 1e9)) >>> 0);
  const mh = maxHands ?? (settings.hands || undefined);
  g = createGame({ seats: seatsFromSettings(list), palier: settings.palier, maxHands: mh, rng: mulberry32(sd) });
  viewer = g.players.findIndex((p) => p.human);
  ['home', 'end', 'combos'].forEach((id) => $(id).classList.add('hidden'));
  scene.setupSeats(g.players, viewer);
  scene.clearTable();
  scene.resize();
  const id = run;
  busy = true;
  refreshViews();
  (async () => {
    await applyEvents(g.events);
    if (id !== run) return;
    busy = false;
    loop(id);
  })();
  return g;
}

// ---------- interface ----------
setChips('opt-palier', (v) => { settings.palier = +v; });
setChips('opt-players', (v) => { settings.players = +v; renderSeats($('seat-list'), settings.seats, settings.players, () => {}); });
setChips('opt-hands', (v) => { settings.hands = +v; });
setChips('opt-say', (v) => { settings.say = v === '1'; if (!settings.say) stopSpeech(); });
renderSeats($('seat-list'), settings.seats, settings.players, () => {});
renderCombos($('combo-list'));
$('btn-ready').addEventListener('click', () => ready());
loadImage('titre').then((im) => { if (im) { $('hero').src = im.src; $('hero').classList.remove('hidden'); } });
$('btn-play').addEventListener('click', () => { fast = false; startGame(); });
$('btn-again').addEventListener('click', () => { fast = false; startGame(); });
$('btn-home').addEventListener('click', () => { run++; ready(); next(); $('end').classList.add('hidden'); $('home').classList.remove('hidden'); });
$('btn-menu').addEventListener('click', () => { run++; ready(); next(); busy = false; waiting = null; hideRaise(); $('home').classList.remove('hidden'); });
$('btn-rules').addEventListener('click', () => speak(RULES));
$('btn-voice').addEventListener('click', () => {
  if (!g) return speak(RULES);
  const mine = me();
  const help = !handHidden() && mine && mine.hole.length && helpAllowed() ? ` Ta main : ${describe(mine.hole, g.board)}.` : '';
  speak(`${RULES} ${statusText().replace('jetons', 'jetons')}. Il y a ${potTotal(g)} jetons dans le pot.${help}`);
});
$('btn-combos').addEventListener('click', () => $('combos').classList.remove('hidden'));
$('btn-combos-close').addEventListener('click', () => $('combos').classList.add('hidden'));
$('btn-eye').addEventListener('click', () => { eyeOn = !eyeOn; refreshViews(); });
$('btn-fold').addEventListener('click', () => doAct({ type: 'fold' }));
$('btn-call').addEventListener('click', () => doAct(legalActions(g).check ? { type: 'check' } : { type: 'call' }));
$('btn-raise').addEventListener('click', () => openRaise());
$('btn-allin').addEventListener('click', () => doAct({ type: 'allin' }));
$('btn-next').addEventListener('click', () => next());
$('raise-minus').addEventListener('click', () => { raiseTo -= g.blinds.bb; updateRaise(); });
$('raise-plus').addEventListener('click', () => { raiseTo += g.blinds.bb; updateRaise(); });
$('raisebox').querySelector('.raise-presets').addEventListener('click', (e) => { const b = e.target.closest('[data-p]'); if (b) presetRaise(b.dataset.p); });
$('raise-ok').addEventListener('click', () => doAct({ type: 'raise', to: raiseTo }));
$('raise-cancel').addEventListener('click', hideRaise);

const ro = new ResizeObserver(() => scene.resize());
ro.observe($('stage'));
window.addEventListener('resize', () => scene.resize());
window.addEventListener('orientationchange', () => setTimeout(() => scene.resize(), 200));
scene.resize();
(function frame(now) { scene.render(now); requestAnimationFrame(frame); })(performance.now());

// ---------- crochet de débogage ----------
const until = async (fn) => { while (!fn()) await new Promise((r) => setTimeout(r, 10)); };
const pub = () => g && ({
  phase: g.phase, handNo: g.handNo, maxHands: g.maxHands, street: g.street, current: g.current, dealer: g.dealer, blinds: g.blinds,
  board: g.board.map((c) => c.id), pot: potTotal(g), currentBet: g.currentBet, minRaise: g.minRaise,
  stacks: g.players.map((p) => p.stack), bets: g.players.map((p) => p.bet), folded: g.players.map((p) => p.folded), out: g.players.map((p) => p.out),
  allIn: g.players.map((p) => p.allIn), humans: g.players.map((p) => p.human), viewer, pass: !!passResolve, canNext: !!nextResolve, myTurn: myTurn(),
  hole: me() ? me().hole.map((c) => c.id) : [], ranking: g.ranking,
  result: g.lastResult && { pots: g.lastResult.pots, wins: g.lastResult.wins, showdown: g.lastResult.showdown },
});
window.__poker = {
  get game() { return g; },
  scene,
  settings,
  state: pub,
  start: (o) => { startGame(o); return pub(); },
  legal: () => (g && g.phase === 'betting' ? legalActions(g) : null),
  act: async (a) => { await until(() => myTurn() || !g || g.phase !== 'betting'); return g && g.phase === 'betting' ? doAct(a) : false; },
  next: () => next(),
  ready: () => ready(),
  viewer: () => viewer,
  setFast: (b = true) => { fast = !!b; },
  // chaque humain joue avec la stratégie des robots, appuie « Je suis prêt » et « Main suivante », jusqu'à la fin
  autoPlay: async () => {
    while (g && g.phase !== 'gameOver') {
      await until(() => !g || g.phase === 'gameOver' || !!passResolve || !!nextResolve || myTurn());
      if (!g || g.phase === 'gameOver') break;
      if (passResolve) { ready(); continue; }
      if (nextResolve) { next(); await new Promise((r) => setTimeout(r, 0)); continue; }
      if (myTurn()) await doAct(strategyDecision(g, g.rng));
    }
    return pub();
  },
};
